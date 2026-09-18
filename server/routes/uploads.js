// ==========================================================
// ZAVYAAN — IMAGE UPLOADS
// ==========================================================
// Product images uploaded from the admin. Files arrive as base64 data URLs
// in JSON (no multipart dependency), are checked by magic bytes — not by the
// extension the browser claims — and are written to public/uploads/products/.
// The file keeps its (sanitised) original name so a CSV bulk import can refer
// to an image by filename. Re-uploading the same name replaces the file.
//
// Limits: JPEG / PNG / WebP / GIF, 5 MB per file, 40 files per request.
// ==========================================================

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db/db');
const { requireAdmin } = require('../middleware/admin-auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'public', 'uploads', 'products');
const PUBLIC_PREFIX = 'uploads/products/';
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 40;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- storage backend ----
// Local mode: files on disk under public/uploads/products (served statically).
// PostgreSQL mode: rows in uploaded_images, served by GET /uploads/products/:name
// (server.js) — hosts like Render wipe the disk on every deploy; the database persists.
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

const storage = {
  usingDb: () => db.isPostgres(),
  async list() {
    if (this.usingDb()) {
      const rows = await db.listRows('uploaded_images');
      return rows.map(r => ({ name: r.id, url: PUBLIC_PREFIX + r.id, bytes: Number(r.size) || 0, modified_at: r.created_at }));
    }
    return fs.readdirSync(UPLOAD_DIR)
      .filter(f => /\.(jpg|png|webp|gif)$/i.test(f))
      .map(f => {
        const st = fs.statSync(path.join(UPLOAD_DIR, f));
        return { name: f, url: PUBLIC_PREFIX + f, bytes: st.size, modified_at: st.mtime.toISOString() };
      })
      .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
  },
  async exists(name) {
    if (this.usingDb()) return Boolean(await db.getRow('uploaded_images', name));
    return fs.existsSync(path.join(UPLOAD_DIR, name));
  },
  async put(name, buf, ext) {
    if (this.usingDb()) {
      await db.saveRow('uploaded_images', { id: name, mime: MIME[ext], bytes: buf, size: buf.length });
      return;
    }
    const target = path.join(UPLOAD_DIR, name);
    if (!target.startsWith(UPLOAD_DIR)) throw new Error('Invalid filename.');
    fs.writeFileSync(target, buf);
  },
  async get(name) {
    if (this.usingDb()) return db.getRow('uploaded_images', name);
    const target = path.join(UPLOAD_DIR, name);
    if (!target.startsWith(UPLOAD_DIR) || !fs.existsSync(target)) return null;
    return { id: name, mime: MIME[(name.match(/\.([a-z0-9]+)$/i) || [])[1]] || 'application/octet-stream', bytes: fs.readFileSync(target) };
  },
  async remove(name) {
    if (this.usingDb()) return db.deleteRow('uploaded_images', name);
    const target = path.join(UPLOAD_DIR, name);
    if (target.startsWith(UPLOAD_DIR) && fs.existsSync(target)) fs.unlinkSync(target);
  }
};

function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return 'png';
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.length >= 6 && ['GIF87a', 'GIF89a'].includes(buf.slice(0, 6).toString('ascii'))) return 'gif';
  return null;
}

// "My Photo (1).JPG" -> "my-photo-1.jpg". Keeps the name recognisable so the
// CSV column can reference it; strips anything that is not safe in a URL/path.
function safeName(original, ext) {
  const base = String(original || 'image').replace(/\.[^.]+$/, '');
  const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80) || 'image';
  return `${slug}.${ext}`;
}

async function saveOne(file) {
  const dataUrl = String(file.data || '');
  const m = dataUrl.match(/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+)?;base64,(.+)$/i);
  if (!m) return { ok: false, name: file.filename, error: 'Not a base64 image.' };
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0) return { ok: false, name: file.filename, error: 'Empty file.' };
  if (buf.length > MAX_BYTES) return { ok: false, name: file.filename, error: `Too large (${(buf.length / 1048576).toFixed(1)} MB). Limit is 5 MB.` };
  const ext = sniff(buf);
  if (!ext) return { ok: false, name: file.filename, error: 'Only JPEG, PNG, WebP or GIF images are accepted.' };

  const name = safeName(file.filename, ext);
  const replaced = await storage.exists(name);
  await storage.put(name, buf, ext);
  return { ok: true, name, original: file.filename, url: PUBLIC_PREFIX + name, bytes: buf.length, replaced };
}

// POST /api/uploads/image     { filename, data }
// POST /api/uploads/images    { files: [{ filename, data }, ...] }
router.post('/image', requireAdmin, async (req, res) => {
  try {
    const result = await saveOne(req.body || {});
    if (!result.ok) return res.status(400).json({ success: false, message: result.error });
    res.status(201).json({ success: true, file: result });
  } catch (err) {
    console.error('[API Uploads] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/images', requireAdmin, async (req, res) => {
  try {
    const files = Array.isArray(req.body && req.body.files) ? req.body.files : [];
    if (files.length === 0) return res.status(400).json({ success: false, message: 'No files supplied.' });
    if (files.length > MAX_FILES) return res.status(400).json({ success: false, message: `At most ${MAX_FILES} files per upload.` });
    const results = [];
    for (const f of files) results.push(await saveOne(f));
    res.status(201).json({
      success: true,
      uploaded: results.filter(r => r.ok),
      failed: results.filter(r => !r.ok),
      total: results.length
    });
  } catch (err) {
    console.error('[API Uploads] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/uploads/images — the library (admin)
router.get('/images', requireAdmin, async (req, res) => {
  try {
    res.json({ success: true, files: await storage.list() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/images/:name', requireAdmin, async (req, res) => {
  try {
    const name = path.basename(String(req.params.name)).toLowerCase();
    if (!(await storage.exists(name))) return res.status(404).json({ success: false, message: 'File not found' });
    await storage.remove(name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve one image (public). Locally express.static answers first; on
// PostgreSQL the bytes come from the database. Mounted in server.js.
async function serveImage(req, res) {
  try {
    const name = path.basename(String(req.params.name)).toLowerCase();
    const row = await storage.get(name);
    if (!row) return res.status(404).end();
    res.set('Content-Type', row.mime || 'application/octet-stream');
    res.set('Cache-Control', 'public, max-age=604800');
    res.send(Buffer.isBuffer(row.bytes) ? row.bytes : Buffer.from(row.bytes));
  } catch (err) {
    res.status(500).end();
  }
}

// Resolve a CSV image reference: full URL / site path → as-is; bare filename →
// matching upload if it exists. Returns null when nothing matches.
async function resolveImageRef(ref) {
  const v = String(ref || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || v.startsWith('/') || v.startsWith('assets/') || v.startsWith('uploads/')) return v;
  const wanted = path.basename(v).toLowerCase();
  const files = (await storage.list()).map(f => f.name);
  const exact = files.find(f => f.toLowerCase() === wanted);
  if (exact) return PUBLIC_PREFIX + exact;
  // The upload sanitised the name ("My Photo.JPG" -> "my-photo.jpg"); try that too.
  const ext = (wanted.match(/\.([a-z0-9]+)$/) || [])[1] || 'jpg';
  const guess = safeName(wanted, ext === 'jpeg' ? 'jpg' : ext);
  const bySlug = files.find(f => f.toLowerCase() === guess);
  return bySlug ? PUBLIC_PREFIX + bySlug : null;
}

// ---------- SKU matching ----------
// A picture named after a product's SKU belongs to that product:
//   ZVN-FSH-001.jpg      -> main image of SKU ZVN-FSH-001
//   ZVN-FSH-001-2.jpg    -> second image (any "-N" / "_N" / " (N)" suffix; sorted by N)
// SKU and filename are both normalised (lower-case, non-alphanumerics -> "-"), so
// "zvn_fsh_001 (2).JPG" still matches. Exact base match beats a suffixed match
// when two SKUs could both fit.
const normKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function listUploadBases() {
  return (await storage.list()).map(f => ({ name: f.name, url: f.url, base: normKey(f.name.replace(/\.[^.]+$/, '')) }));
}

// Returns [{ url, order }] for one SKU, main image first.
async function findUploadsForSku(sku, uploads = null) {
  if (!uploads) uploads = await listUploadBases();
  const key = normKey(sku);
  if (!key) return [];
  const hits = [];
  for (const u of uploads) {
    if (u.base === key) hits.push({ url: u.url, name: u.name, order: 0 });
    else {
      const m = u.base.match(new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d{1,3})$'));
      if (m) hits.push({ url: u.url, name: u.name, order: Number(m[1]) });
    }
  }
  return hits.sort((a, b) => a.order - b.order);
}

// POST /api/uploads/attach-by-sku  { replace: false }
// Walks every product with a SKU and attaches matching uploads. Existing images
// are kept (new ones appended) unless replace is true.
router.post('/attach-by-sku', requireAdmin, async (req, res) => {
  try {
    const replace = Boolean(req.body && req.body.replace);
    const products = await db.getProducts({ includeInactive: true, limit: 100000 });
    const uploads = await listUploadBases();
    const usedFiles = new Set();
    const attached = [];
    let imagesAdded = 0;

    for (const p of products) {
      if (!p.sku) continue;
      const hits = await findUploadsForSku(p.sku, uploads);
      if (hits.length === 0) continue;
      hits.forEach(h => usedFiles.add(h.name));
      const current = replace ? [] : (p.images || []).map(i => ({ image_url: typeof i === 'string' ? i : i.image_url, alt_text: (i && i.alt_text) || p.title }));
      const have = new Set(current.map(i => i.image_url));
      const fresh = hits.filter(h => !have.has(h.url)).map(h => ({ image_url: h.url, alt_text: p.title }));
      if (fresh.length === 0 && !replace) continue;
      const images = replace ? hits.map(h => ({ image_url: h.url, alt_text: p.title })) : [...current, ...fresh];
      await db.saveProduct({ ...p, images, variants: p.variants || [] });
      imagesAdded += replace ? images.length : fresh.length;
      attached.push({ product_id: p.id, title: p.title, sku: p.sku, images: images.length, added: replace ? images.length : fresh.length });
    }

    const skuSet = new Set(products.map(p => normKey(p.sku)).filter(Boolean));
    const unmatched = uploads
      .filter(u => !usedFiles.has(u.name))
      .map(u => ({ name: u.name, url: u.url, looks_like_sku: [...skuSet].some(k => u.base === k || u.base.startsWith(k + '-')) }))
      .filter(u => !u.looks_like_sku);

    res.json({
      success: true,
      products_updated: attached.length,
      images_added: imagesAdded,
      attached,
      unmatched_files: unmatched.map(u => u.name),
      products_without_images: products.filter(p => !(p.images && p.images.length)).map(p => ({ id: p.id, title: p.title, sku: p.sku || '' }))
    });
  } catch (err) {
    console.error('[API Uploads attach-by-sku] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = { router, resolveImageRef, findUploadsForSku, serveImage };
