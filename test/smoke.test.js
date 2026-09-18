// ==========================================================
// ZAVYAAN — END-TO-END SMOKE TESTS
// ==========================================================
// Boots the real server on a spare port and drives it over HTTP: seeding,
// storefront reads, admin auth, settings, visibility, orders, ledger,
// analytics, image uploads and bulk import.
//
//   npm test                      → against the local JSON store (fast, no DB)
//   DATABASE_URL=postgres://… npm test → against PostgreSQL (what CI does)
//
// Uses node:test (Node 18+), no extra dependencies.
// ==========================================================

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const PORT = Number(process.env.TEST_PORT) || 5711;
const B = `http://localhost:${PORT}/api`;
const PASSWORD = 'ci-test-password';
let server;
let token = '';
let tmpData;

const req = async (url, opts = {}) => {
  const res = await fetch(B + url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) }
  });
  let body = {};
  try { body = await res.json(); } catch (e) { /* non-JSON */ }
  return { ...body, status: res.status, http: res.status };
};
const post = (u, b) => req(u, { method: 'POST', body: JSON.stringify(b) });
const put = (u, b) => req(u, { method: 'PUT', body: JSON.stringify(b) });

before(async () => {
  // Local mode writes to server/data/store.json — point it at a temp copy so
  // tests never touch the developer's data.
  tmpData = fs.mkdtempSync(path.join(os.tmpdir(), 'zavyaan-test-'));
  const env = { ...process.env, PORT: String(PORT), ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: PASSWORD, PUBLIC_DEMO: 'false', ZAVYAAN_DATA_DIR: tmpData };
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'server.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', d => { log += d; });
  server.stderr.on('data', d => { log += d; });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try { const r = await fetch(B + '/health'); if (r.ok) return; } catch (e) { /* not up yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server did not start:\n' + log);
});

after(() => {
  if (server) server.kill();
  if (tmpData) fs.rmSync(tmpData, { recursive: true, force: true });
});

test('health + seeded catalogue', async () => {
  const h = await req('/health');
  assert.equal(h.http, 200);
  assert.equal(h.brand, 'Zavyaan');
  const p = await req('/products');
  assert.equal(p.count, 8, 'eight sample products seeded');
  const c = await req('/categories');
  assert.equal(c.categories.length, 8);
  const s = await req('/settings');
  assert.equal(s.settings.payment_methods.length, 2, 'COD + Advance enabled by default');
  assert.equal(s.settings.collections.length, 8);
});

test('admin routes are locked without a session', async () => {
  for (const u of ['/orders', '/admin/analytics', '/ledger/summary', '/products?all=true', '/uploads/images']) {
    assert.equal((await req(u)).status, 401, u);
  }
  assert.equal((await put('/settings', { homepage: {} })).status, 401);
  assert.equal((await put('/products/prod-nordic-lamp', { is_active: false })).status, 401);
});

test('login: wrong password refused, right password issues token', async () => {
  const bad = await post('/admin/auth/login', { username: 'admin', password: 'nope' });
  assert.equal(bad.status, 401);
  const ok = await post('/admin/auth/login', { username: 'admin', password: PASSWORD });
  assert.equal(ok.status, 200);
  assert.ok(ok.token);
  token = ok.token;
  assert.equal((await req('/admin/auth/me')).user.username, 'admin');
});

test('settings: payment method toggle is enforced at checkout', async () => {
  const refused = await post('/orders', order('EASYPAISA'));
  assert.equal(refused.status, 400, 'Easypaisa is disabled by default');
  const saved = await put('/settings', { payment_methods: [{ code: 'EASYPAISA', enabled: true, discount: 150 }] });
  assert.equal(saved.settings.payment_methods.find(m => m.code === 'EASYPAISA').enabled, true);
  const ok = await post('/orders', order('EASYPAISA'));
  assert.equal(ok.status, 201);
  assert.equal(ok.order.payment_method, 'EASYPAISA');
  assert.equal(Number(ok.order.discount), 150);
  global.__orderNumber = ok.order.order_number;
  global.__orderId = ok.order.id;
});

test('visibility: hidden category and product vanish from the storefront', async () => {
  await put('/categories/cat-fashion', { is_active: false });
  assert.equal((await req('/categories')).categories.length, 7);
  assert.equal((await req('/categories/fashion')).status, 404);
  assert.equal((await req('/products/prod-emerald-kurti')).status, 404, 'product in hidden category');
  await put('/categories/cat-fashion', { is_active: true });
  await put('/products/prod-stem-robot', { is_active: false });
  assert.equal((await req('/products/prod-stem-robot')).status, 404);
  assert.equal((await req('/products/prod-stem-robot?all=true')).status, 200, 'admin still sees it');
  await put('/products/prod-stem-robot', { is_active: true });
});

test('orders: guest tracking needs the phone; admin can update status', async () => {
  const n = global.__orderNumber;
  assert.equal((await req(`/orders/track/${n}`)).status, 400, 'phone required');
  assert.equal((await req(`/orders/track/${n}?phone=0000000000`)).status, 404, 'wrong phone');
  assert.equal((await req(`/orders/track/${n}?phone=03001234567`)).success, true);
  const upd = await req(`/orders/${global.__orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Delivered', note: 'test' }) });
  assert.equal(upd.success, true);
});

test('product cost breakdown → landed cost', async () => {
  const r = await put('/products/prod-nordic-lamp', { cost_base: 1000, cost_shipping: 50, cost_extra: 150 });
  assert.equal(Number(r.product.cost_price), 1200);
});

test('ledger: purchase adds stock and re-costs; payments and expenses feed the summary', async () => {
  const before = (await req('/products/prod-nordic-lamp?all=true')).product;
  const v = await post('/ledger/vendors', { name: 'Test Vendor' });
  assert.equal(v.status, 201);
  const p = await post('/ledger/purchases', { vendor_id: v.vendor.id, product_id: 'prod-nordic-lamp', quantity: 10, unit_cost: 1500, shipping_cost: 500, extra_cost: 200 });
  assert.equal(Number(p.purchase.vendor_amount), 15500);
  assert.equal(Number(p.purchase.landed_unit_cost), 1570);
  assert.equal(p.stock.stock_quantity, Number(before.stock_quantity) + 10);
  assert.equal((await post('/ledger/purchases', { vendor_id: v.vendor.id, product_id: 'prod-nordic-lamp', quantity: 0, unit_cost: 1 })).status, 400);
  assert.equal((await post('/ledger/payments', { vendor_id: v.vendor.id, amount: 9000 })).status, 201);
  assert.equal((await post('/ledger/expenses', { category: 'Marketing', amount: 3000 })).status, 201);
  const s = await req('/ledger/summary');
  const led = s.vendor_ledger.find(l => l.vendor.id === v.vendor.id);
  assert.equal(led.items_sourced, 10);
  assert.equal(led.pending_balance, 6500);
  assert.equal(s.pnl.expenses, 3000);
  assert.ok(s.pnl.revenue > 0);
  assert.equal((await req(`/ledger/vendors/${v.vendor.id}`, { method: 'DELETE' })).status, 409, 'vendor with purchases cannot be deleted');
});

test('analytics endpoint aggregates the order', async () => {
  const a = await req('/admin/analytics?days=7');
  assert.equal(a.kpis.orders_total, 1);
  assert.equal(a.by_day.length, 7);
  assert.ok(a.by_category.length >= 1);
  assert.equal(a.by_day.reduce((s, d) => s + d.orders, 0), 1, 'today\'s order is bucketed');
});

test('images: upload, serve, SKU auto-attach, reject non-image', async () => {
  const jpg = fs.readFileSync(path.join(__dirname, '..', 'public', 'assets', 'images', 'product_home_lamp_1787668839199.jpg'));
  const data = 'data:image/jpeg;base64,' + jpg.toString('base64');
  const up = await post('/uploads/images', { files: [
    { filename: 'ZVN-HOM-005.jpg', data },
    { filename: 'not-an-image.jpg', data: 'data:image/jpeg;base64,' + Buffer.from('<html>').toString('base64') }
  ] });
  assert.equal(up.uploaded.length, 1);
  assert.equal(up.failed.length, 1);
  const raw = await fetch(`http://localhost:${PORT}/uploads/products/zvn-hom-005.jpg`);
  assert.equal(raw.status, 200);
  assert.equal(raw.headers.get('content-type'), 'image/jpeg');
  const att = await post('/uploads/attach-by-sku', {});
  assert.equal(att.images_added, 1);
  assert.equal((await req('/uploads/images/zvn-hom-005.jpg', { method: 'DELETE' })).success, true);
});

test('bulk import: create, update by SKU, and reject bad rows independently', async () => {
  const r = await post('/products/bulk', { rows: [
    { title: 'Bulk Test Lamp', category: 'Home & Living', regular_price: '3,500', sale_price: 2999, cost_base: 1200, cost_shipping: 100, cost_extra: 200, stock_quantity: 15, sku: 'BULK-001' },
    { title: 'Nordic Minimalist Mushroom Warm Glow Bedside Lamp', category: 'home-living', regular_price: 4200, sku: 'ZVN-HOM-005', stock_quantity: 77 },
    { title: 'Ghost', category: 'No Such Category', regular_price: 100 },
    { title: 'No Price', category: 'Fashion', regular_price: 'abc' }
  ] });
  assert.deepEqual(r.summary, { total: 4, created: 1, updated: 1, failed: 2 });
  const created = await req(`/products/${r.results[0].id}?all=true`);
  assert.equal(Number(created.product.cost_price), 1500);
  assert.equal((await req('/products/prod-nordic-lamp?all=true')).product.stock_quantity, 77);
  assert.equal((await req(`/products/${r.results[0].id}`, { method: 'DELETE' })).success, true);
});

test('multiple admins: owner creates staff; staff cannot reach finance', async () => {
  const created = await post('/admin/users', { username: 'staff1', display_name: 'Staff One', password: 'Staff12345', role: 'staff' });
  assert.equal(created.status, 201);
  assert.equal((await post('/admin/users', { username: 'staff1', password: 'Staff12345' })).status, 409, 'duplicate username');
  const ownerToken = token;
  const staff = await post('/admin/auth/login', { username: 'staff1', password: 'Staff12345' });
  assert.equal(staff.user.role, 'staff');
  token = staff.token;
  assert.equal((await req('/orders')).status, 200, 'staff sees orders');
  assert.equal((await req('/ledger/summary')).status, 403, 'staff blocked from ledger');
  assert.equal((await req('/admin/users')).status, 403, 'staff blocked from user management');
  assert.equal((await req('/admin/analytics')).finance, null, 'no finance for staff');
  token = ownerToken;
  assert.equal((await req('/orders')).status, 200, 'owner session unaffected by staff login');
  assert.equal((await req(`/admin/users/${created.user.id}`, { method: 'DELETE' })).success, true);
});

test('a second login signs the first device out', async () => {
  const again = await post('/admin/auth/login', { username: 'admin', password: PASSWORD });
  assert.equal(again.replaced_session, true);
  const old = await req('/orders');
  assert.equal(old.status, 401);
  token = again.token;
  assert.equal((await req('/orders')).status, 200);
});

function order(method) {
  return {
    customer_name: 'CI Test', customer_phone: '03001234567', province: 'Punjab', city: 'Lahore', address: '1 Test Street',
    payment_method: method, items: [{ product_id: 'prod-nordic-lamp', quantity: 2 }]
  };
}
