// ==========================================================
// ZAVYAAN — ADMIN AUTHENTICATION
// ==========================================================
// Password login → signed session token (HMAC-SHA256) carried as
// `Authorization: Bearer <token>`. Rules (blueprint section 18):
//   • one active admin session at a time — a new login signs the old device out
//   • sessions expire after ADMIN_SESSION_HOURS (default 12) and after
//     ADMIN_IDLE_MINUTES (default 30) without a request
//   • 5 failed logins from one IP → 15 minute lock
// Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD. The signing secret is
// SESSION_SECRET when set; otherwise it is derived from the password so a
// restart does not log everyone out. There is no password storage here yet —
// see "Not done" in docs/CHANGELOG for the multi-user admin table.
// ==========================================================

const crypto = require('crypto');
const db = require('../db/db');

const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS) || 12;
const IDLE_MINUTES = Number(process.env.ADMIN_IDLE_MINUTES) || 30;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

function adminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'zavyaan2026'
  };
}

function secret() {
  return process.env.SESSION_SECRET || crypto.createHash('sha256').update('zavyaan-session:' + adminCredentials().password).digest('hex');
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sign = (body) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

function safeEqual(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function issueToken(username, sid) {
  const payload = { u: username, sid, iat: Date.now(), exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
  const body = b64u(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function parseToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sign(body), sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.sid || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

// ---- single active session, persisted so it survives restarts ----
async function getSession() {
  const rows = await db.listRows('admin_sessions');
  return rows[0] || null;
}

async function setSession(row) {
  const existing = await db.listRows('admin_sessions');
  for (const r of existing) await db.deleteRow('admin_sessions', r.id);
  return db.saveRow('admin_sessions', row);
}

// ---- brute-force lock (in memory; per process) ----
const fails = new Map();
function clientIp(req) {
  return String(req.headers['cf-connecting-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || req.ip || '').trim();
}
function lockedUntil(ip) {
  const f = fails.get(ip);
  return f && f.count >= MAX_FAILS && f.until > Date.now() ? f.until : 0;
}
function recordFail(ip) {
  const f = fails.get(ip) || { count: 0, until: 0 };
  f.count += 1;
  if (f.count >= MAX_FAILS) f.until = Date.now() + LOCK_MINUTES * 60 * 1000;
  fails.set(ip, f);
}

async function login(req, res) {
  const { username, password } = req.body || {};
  const ip = clientIp(req);
  const until = lockedUntil(ip);
  if (until) {
    return res.status(429).json({ success: false, message: `Too many failed attempts. Try again in ${Math.ceil((until - Date.now()) / 60000)} minute(s).` });
  }
  const creds = adminCredentials();
  if (!username || !password || !safeEqual(username, creds.username) || !safeEqual(password, creds.password)) {
    recordFail(ip);
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }
  fails.delete(ip);

  const sid = crypto.randomBytes(16).toString('hex');
  const previous = await getSession();
  await setSession({ id: sid, username: creds.username, last_seen: new Date().toISOString(), user_agent: String(req.headers['user-agent'] || '').slice(0, 200), ip });
  res.json({
    success: true,
    token: issueToken(creds.username, sid),
    user: { username: creds.username, role: 'admin' },
    expires_in_hours: SESSION_HOURS,
    idle_minutes: IDLE_MINUTES,
    replaced_session: Boolean(previous)
  });
}

async function logout(req, res) {
  const payload = parseToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
  const current = await getSession();
  if (payload && current && current.id === payload.sid) await db.deleteRow('admin_sessions', current.id);
  res.json({ success: true });
}

// Middleware: valid token, matching the one active session, not idle-expired.
async function requireAdmin(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const payload = parseToken(token);
    if (!payload) return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Please log in to the admin panel.' });

    const session = await getSession();
    if (!session || session.id !== payload.sid) {
      return res.status(401).json({ success: false, code: 'SESSION_REPLACED', message: 'You were signed out because the admin logged in on another device.' });
    }
    const idleMs = Date.now() - new Date(session.last_seen || 0).getTime();
    if (idleMs > IDLE_MINUTES * 60 * 1000) {
      await db.deleteRow('admin_sessions', session.id);
      return res.status(401).json({ success: false, code: 'SESSION_IDLE', message: `Signed out after ${IDLE_MINUTES} minutes of inactivity.` });
    }
    // Touch at most once a minute to avoid a write on every poll
    if (idleMs > 60 * 1000) await db.saveRow('admin_sessions', { ...session, last_seen: new Date().toISOString() });

    req.admin = { username: payload.u, sid: payload.sid };
    next();
  } catch (err) {
    console.error('[AdminAuth] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Only when the request asks for admin-only data (?all=true / ?admin=true)
function requireAdminForAll(req, res, next) {
  if (req.query.all === 'true' || req.query.admin === 'true') return requireAdmin(req, res, next);
  next();
}

async function me(req, res) {
  res.json({ success: true, user: { username: req.admin.username, role: 'admin' } });
}

module.exports = { login, logout, me, requireAdmin, requireAdminForAll };
