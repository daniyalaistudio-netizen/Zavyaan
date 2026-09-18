// ==========================================================
// ZAVYAAN — ADMIN AUTHENTICATION (multi-user)
// ==========================================================
// Admin accounts live in admin_users (scrypt-hashed passwords). Roles:
//   owner — everything, including accounts/ledger and managing users
//   staff — catalogue, orders, storefront; no finance, no user management
// The first owner is created from ADMIN_USERNAME / ADMIN_PASSWORD when the
// table is empty. After that the table is the only source of truth.
//
// Sessions: signed token (HMAC-SHA256) as `Authorization: Bearer <token>`.
//   • one active session PER USER — logging in elsewhere signs that user's
//     other device out
//   • expire after ADMIN_SESSION_HOURS (12) and ADMIN_IDLE_MINUTES (30) idle
//   • 5 failed logins from one IP → 15 minute lock
// ==========================================================

const crypto = require('crypto');
const db = require('../db/db');
const password = require('../utils/password');

const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS) || 12;
const IDLE_MINUTES = Number(process.env.ADMIN_IDLE_MINUTES) || 30;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const ROLES = ['owner', 'staff'];

function secret() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update('zavyaan-session:' + (process.env.ADMIN_PASSWORD || 'zavyaan2026')).digest('hex');
}
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');
function safeEqual(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function issueToken(username, sid) {
  const body = b64u(JSON.stringify({ u: username, sid, iat: Date.now(), exp: Date.now() + SESSION_HOURS * 3600 * 1000 }));
  return `${body}.${sign(body)}`;
}
function parseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return (!payload.sid || !payload.exp || Date.now() > payload.exp) ? null : payload;
  } catch (e) { return null; }
}

// ---- users ----
const publicUser = (u) => ({ id: u.id, username: u.username, display_name: u.display_name || u.username, email: u.email || '', role: u.role || 'staff', is_active: u.is_active !== false, last_login_at: u.last_login_at || null, created_at: u.created_at });

async function findUser(username) {
  const users = await db.listRows('admin_users');
  const key = String(username || '').trim().toLowerCase();
  return users.find(u => String(u.username).toLowerCase() === key) || null;
}

// Create the first owner from the environment when no users exist yet.
async function ensureBootstrapOwner() {
  const users = await db.listRows('admin_users');
  if (users.length > 0) return;
  const username = process.env.ADMIN_USERNAME || 'admin';
  const pass = process.env.ADMIN_PASSWORD || 'zavyaan2026';
  await db.saveRow('admin_users', {
    id: 'usr-' + crypto.randomBytes(6).toString('hex'), username, password_hash: password.hash(pass),
    email: '', role: 'owner', display_name: 'Store Owner', is_active: true
  });
  console.log(`[AdminAuth] Created the first owner account "${username}" from ADMIN_USERNAME/ADMIN_PASSWORD.`);
}

// ---- sessions (one per user) ----
async function userSession(username) {
  const rows = await db.listRows('admin_sessions', { username });
  return rows[0] || null;
}
async function replaceSession(username, row) {
  const rows = await db.listRows('admin_sessions', { username });
  for (const r of rows) await db.deleteRow('admin_sessions', r.id);
  return db.saveRow('admin_sessions', row);
}

// ---- brute-force lock ----
const fails = new Map();
const clientIp = (req) => String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
function lockedUntil(ip) { const f = fails.get(ip); return f && f.count >= MAX_FAILS && f.until > Date.now() ? f.until : 0; }
function recordFail(ip) { const f = fails.get(ip) || { count: 0, until: 0 }; f.count += 1; if (f.count >= MAX_FAILS) f.until = Date.now() + LOCK_MINUTES * 60000; fails.set(ip, f); }

async function login(req, res) {
  try {
    await ensureBootstrapOwner();
    const { username, password: pass } = req.body || {};
    const ip = clientIp(req);
    const until = lockedUntil(ip);
    if (until) return res.status(429).json({ success: false, message: `Too many failed attempts. Try again in ${Math.ceil((until - Date.now()) / 60000)} minute(s).` });

    const user = await findUser(username);
    if (!user || !password.verify(pass, user.password_hash)) {
      recordFail(ip);
      return res.status(401).json({ success: false, message: 'Invalid username or password.' });
    }
    if (user.is_active === false) return res.status(403).json({ success: false, message: 'This account has been disabled. Ask the store owner.' });
    fails.delete(ip);

    const sid = crypto.randomBytes(16).toString('hex');
    const previous = await userSession(user.username);
    await replaceSession(user.username, { id: sid, username: user.username, last_seen: new Date().toISOString(), user_agent: String(req.headers['user-agent'] || '').slice(0, 200), ip });
    await db.saveRow('admin_users', { ...user, last_login_at: new Date().toISOString() });
    res.json({ success: true, token: issueToken(user.username, sid), user: publicUser(user), expires_in_hours: SESSION_HOURS, idle_minutes: IDLE_MINUTES, replaced_session: Boolean(previous) });
  } catch (err) {
    console.error('[AdminAuth login] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

async function logout(req, res) {
  const payload = parseToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  if (payload) { const s = await userSession(payload.u); if (s && s.id === payload.sid) await db.deleteRow('admin_sessions', s.id); }
  res.json({ success: true });
}

async function requireAdmin(req, res, next) {
  try {
    const payload = parseToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!payload) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in to the admin panel.' });
    const session = await userSession(payload.u);
    if (!session || session.id !== payload.sid) return res.status(401).json({ success: false, code: 'SESSION_REPLACED', message: 'You were signed out because this account logged in on another device.' });
    const idleMs = Date.now() - new Date(session.last_seen || 0).getTime();
    if (idleMs > IDLE_MINUTES * 60000) { await db.deleteRow('admin_sessions', session.id); return res.status(401).json({ success: false, code: 'SESSION_IDLE', message: `Signed out after ${IDLE_MINUTES} minutes of inactivity.` }); }
    const user = await findUser(payload.u);
    if (!user || user.is_active === false) return res.status(401).json({ success: false, code: 'USER_DISABLED', message: 'This account is disabled.' });
    if (idleMs > 60000) await db.saveRow('admin_sessions', { ...session, last_seen: new Date().toISOString() });
    req.admin = { ...publicUser(user), sid: payload.sid };
    next();
  } catch (err) {
    console.error('[AdminAuth] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

const requireRole = (...roles) => (req, res, next) => requireAdmin(req, res, () => {
  if (!roles.includes(req.admin.role)) return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Only the store owner can do this.' });
  next();
});

function requireAdminForAll(req, res, next) {
  if (req.query.all === 'true' || req.query.admin === 'true') return requireAdmin(req, res, next);
  next();
}

async function me(req, res) { res.json({ success: true, user: req.admin }); }

// ---- user management (owner) + own password ----
async function listUsers(req, res) {
  const users = await db.listRows('admin_users');
  res.json({ success: true, users: users.map(publicUser).sort((a, b) => a.username.localeCompare(b.username)) });
}

async function createUser(req, res) {
  try {
    const username = String(req.body.username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!username || username.length < 3) return res.status(400).json({ success: false, message: 'Username: at least 3 characters (letters, numbers, . _ -).' });
    if (await findUser(username)) return res.status(409).json({ success: false, message: 'That username is already taken.' });
    const bad = password.validate(req.body.password); if (bad) return res.status(400).json({ success: false, message: bad });
    const role = ROLES.includes(req.body.role) ? req.body.role : 'staff';
    const user = await db.saveRow('admin_users', {
      id: 'usr-' + crypto.randomBytes(6).toString('hex'), username, password_hash: password.hash(req.body.password),
      email: String(req.body.email || '').slice(0, 150), role, display_name: String(req.body.display_name || username).slice(0, 120), is_active: true
    });
    res.status(201).json({ success: true, user: publicUser(user) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
}

async function updateUser(req, res) {
  try {
    const user = await db.getRow('admin_users', req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const patch = {};
    if (req.body.display_name !== undefined) patch.display_name = String(req.body.display_name).slice(0, 120);
    if (req.body.email !== undefined) patch.email = String(req.body.email).slice(0, 150);
    if (req.body.role !== undefined && ROLES.includes(req.body.role)) patch.role = req.body.role;
    if (req.body.is_active !== undefined) patch.is_active = Boolean(req.body.is_active);
    if (req.body.password) { const bad = password.validate(req.body.password); if (bad) return res.status(400).json({ success: false, message: bad }); patch.password_hash = password.hash(req.body.password); }

    // Never lock the store out: keep at least one active owner.
    const users = await db.listRows('admin_users');
    const otherActiveOwners = users.filter(u => u.id !== user.id && u.role === 'owner' && u.is_active !== false).length;
    const wouldDemote = (patch.role && patch.role !== 'owner') || patch.is_active === false;
    if (user.role === 'owner' && wouldDemote && otherActiveOwners === 0) return res.status(400).json({ success: false, message: 'This is the only active owner. Make someone else an owner first.' });
    if (user.id === req.admin.id && (patch.is_active === false || (patch.role && patch.role !== 'owner'))) return res.status(400).json({ success: false, message: 'You cannot disable or demote your own account.' });

    const saved = await db.saveRow('admin_users', { ...user, ...patch });
    if (patch.password_hash || patch.is_active === false) { const s = await userSession(user.username); if (s) await db.deleteRow('admin_sessions', s.id); }
    res.json({ success: true, user: publicUser(saved) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
}

async function deleteUser(req, res) {
  try {
    const user = await db.getRow('admin_users', req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.id === req.admin.id) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    const users = await db.listRows('admin_users');
    if (user.role === 'owner' && users.filter(u => u.id !== user.id && u.role === 'owner' && u.is_active !== false).length === 0) return res.status(400).json({ success: false, message: 'This is the only active owner and cannot be deleted.' });
    const s = await userSession(user.username); if (s) await db.deleteRow('admin_sessions', s.id);
    await db.deleteRow('admin_users', user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
}

async function changeOwnPassword(req, res) {
  try {
    const user = await db.getRow('admin_users', req.admin.id);
    if (!user || !password.verify(req.body.current_password, user.password_hash)) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    const bad = password.validate(req.body.new_password); if (bad) return res.status(400).json({ success: false, message: bad });
    await db.saveRow('admin_users', { ...user, password_hash: password.hash(req.body.new_password) });
    res.json({ success: true, message: 'Password changed.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
}

module.exports = { login, logout, me, requireAdmin, requireRole, requireAdminForAll, ensureBootstrapOwner, listUsers, createUser, updateUser, deleteUser, changeOwnPassword, ROLES };
