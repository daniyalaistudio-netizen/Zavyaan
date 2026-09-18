# Zavyaan — Admin Panel & Accounts Ledger (Part 2), 16 September 2026

Part 2 of the customisation brief: admin flexibility, a vendor / purchase / expense
ledger with landed-cost calculation, and a live analytics dashboard. Follows
`CHANGELOG-2026-09-16.md` (Part 1). Written for whoever picks this project up next.

---

## 1. Data model (blueprint Phase H, sections 15–16)

Four new collections, stored as arrays in the local JSON store and as tables in
PostgreSQL. `db.ensureLedgerSchema()` creates the tables and adds the product cost
columns lazily, because `schema.sql` is `CREATE TABLE IF NOT EXISTS` and an existing
database would otherwise never get them. `schema.sql` lists them for fresh databases.

| Collection | Purpose | Key fields |
|---|---|---|
| `vendors` | who stock is bought from | name, contact, phone/WhatsApp, city, `is_active` |
| `purchases` | one stock lot received | vendor, product, `quantity`, `unit_cost`, `shipping_cost`, `extra_cost` (+note), derived `vendor_amount`, `total_cost`, `landed_unit_cost` |
| `vendor_payments` | money paid to a vendor | vendor, amount, method, date, reference |
| `expenses` | operating costs not tied to a lot | category (8 fixed), amount, date, description |

Products gained `cost_base`, `cost_shipping`, `cost_extra` — the manual per-unit
breakdown. `cost_price` remains the single "landed cost" used for profit.

### Cost formulas (implemented in `server/routes/ledger.js`, mirrored live in the admin forms)

```
vendor_amount     = quantity × unit_cost + shipping_cost     what the vendor is owed
total_cost        = vendor_amount + extra_cost               true cost of the lot
landed_unit_cost  = total_cost ÷ quantity                    per-unit landed cost
```

Marketing / buffer (`extra_cost`, e.g. the "add Rs. 200" case in the brief) is the
owner's own cost: it raises the landed price but is **not** added to the vendor balance.

**Recording a purchase adds the quantity to product stock and re-costs the product**
as a weighted average — `db.receiveStock()`:

```
new cost_price = (on_hand × old_cost + qty × landed_unit_cost) ÷ (on_hand + qty)
```

Verified: lamp at 28 units / Rs. 1,400, receive 10 at landed 1,570 → 38 units at
Rs. 1,444.74.

Editing the manual breakdown on a product (`PUT /api/products/:id` with any of the
three cost fields and no explicit `cost_price`) sets `cost_price = base + shipping + extra`.

```
vendor pending  = Σ vendor_amount − Σ payments
COGS            = Σ order_items.cost_price × quantity   (snapshotted at order time, Part 1 of 15 Sep)
gross profit    = revenue − COGS
net profit      = gross profit − Σ expenses
```

Cancelled / Returned / Refunded orders are excluded from revenue, COGS and units.

## 2. API

`server/routes/ledger.js` (mounted at `/api/ledger`, writes guarded by `public-demo.js`):

- `GET/POST /vendors`, `PUT/DELETE /vendors/:id` — delete is refused (409) once a vendor
  has purchases; deactivate instead so history survives.
- `GET /vendors/:id/statement` — purchases and payments interleaved by date with a
  running balance.
- `GET/POST/DELETE /purchases` — POST validates vendor, product, qty ≥ 1, non-negative
  costs; computes the derived fields; receives stock. **Deleting a purchase does not
  reverse stock** (the goods were still received) — the response says so.
- `GET/POST/DELETE /payments`, `GET/POST/DELETE /expenses`.
- `GET /summary` — per-vendor ledger (items sourced, products, purchased, paid, pending,
  last purchase), store totals, and the P&L object.

`server/routes/analytics.js` (`GET /api/admin/analytics?days=14`) — orders per day
(zero-filled, **UTC-bucketed** — an earlier local-midnight/UTC mix dropped today's
orders), by status, by category (units, orders, revenue), by product (units, revenue,
profit), the 10 newest orders with their lines, low-stock list, KPI block, and the
finance summary.

`PATCH /api/products/:id/stock` — `{ stock_quantity }` or `{ delta }` for quick edits.

`public/js/api.js` — `request()` previously treated *any* non-2xx as "server unreachable"
and returned fake success from the browser fallback, which would have hidden every
validation error above. It now surfaces the server's message and only falls back when
`fetch` itself fails.

## 3. Admin panel

New file **`public/js/admin-ledger.js`** extends `Admin` (loaded after `admin.js`).
Three new tabs under an "Accounts" heading in the sidebar, all deep-linkable
(`#admin/vendors`, `#admin/expenses`, `#admin/accounts`):

- **Vendors & Purchases** — KPI row (vendors, items sourced, purchased, paid, pending),
  vendor ledger table with Statement / Pay / Edit, purchases table showing every cost
  component and the landed unit cost, payments table. Modals: Add/Edit Vendor, Record
  Purchase (with a live calculator: vendor amount → total lot cost → landed per unit),
  Record Payment, Statement.
- **Expenses** — KPI row, expenses-by-category chart, full list, Add Expense.
- **Profit & Ledger** — KPI row, P&L statement, vendor balances (incl. stock investment
  and current stock value at landed cost), and a per-product margin table (selling price,
  landed cost, margin/unit, margin %, stock, units sold, profit made).

**Dashboard** (`admin.js`) rebuilt on the analytics endpoint: three KPI rows (orders,
money, stock), orders-per-day columns, orders by status, units by category, top products,
incoming-orders feed and low-stock list. It **polls every 30 s while open** and toasts
"N new orders just came in" when the count rises; polling stops when another tab or
route is selected, and a poll is skipped while a modal is open.

**Products** — the table now shows price, landed cost with margin (or a "Set cost →"
link), a **− / [qty] / + stock control** (type a number and press Enter to set it
exactly), a "+ Stock in" shortcut to the purchase modal pre-selecting that product, and a
new **Edit** button. The Edit modal covers every field plus the cost calculator (vendor
price + delivery + marketing/buffer → landed cost, selling price, profit per unit, margin
%). The Add Product modal gained the same three cost fields.

**Visibility toggles** were already in place from Part 1 (products, categories,
subcategories); they are unchanged and remain the "Live / Hidden" buttons.

### Charts

Built to the dataviz guidance, adapted to the brand's monochrome palette. The palette
validator was run: a two-series gold + black categorical palette **fails** its
lightness/chroma checks (the brand is intentionally not multi-hue), so every chart is
**single-series**: marks in muted gold `#A88445` (passes 3:1 on white; primary gold
`#C6A15B` did not), values in text tokens at the bar tips, hairline tracks, 4px rounded
data-ends square at the baseline, ≤24px thick, a hover tooltip, and a **Table view**
toggle on every chart. Two measures that would have shared a chart (revenue vs cost)
are shown as separate tiles / tables instead. Plain HTML/CSS — no chart library.

## 4. Verified

Against the running local server (JSON store), then rolled back:

- Vendor → purchase 10 × Rs. 1,500 + Rs. 500 delivery + Rs. 200 marketing:
  vendor amount 15,500, total 15,700, landed 1,570; stock 28 → 38; cost 1,400 → 1,444.74.
- Payment 9,000 → pending 6,500; statement shows running balance 15,500 → 6,500.
- Expense 3,000 → P&L expenses 3,000; net = gross − 3,000.
- Two orders (COD 7,797; Advance 6,399 marked Delivered): revenue 14,196, COGS 6,839.48,
  gross 7,356.52 (51.8 %), net 4,356.52; category volumes Home & Living 2, Jewellery 1,
  Beauty 1; orders-per-day shows 2 on today's date.
- Deleting a vendor with purchases → 409; quantity 0 → 400; stock `delta: -3` → 38 → 35;
  product breakdown 2000 + 150 + 200 → cost_price 2,350.
- Zero console errors on dashboard, vendors, expenses, accounts, products; Edit Product and
  Record Purchase modals opened and recalculated in a headless browser.
- Test orders, ledger rows and product changes removed; store back to 0 orders with the
  Part 1 settings (8 collections) intact.

## 5. Not done / notes

- **Still no admin login.** Everything above is reachable by anyone who types `#admin`.
  This is now the most important gap.
- Deleting a purchase does not reverse stock or re-cost the product (deliberate; see API).
- Vendor payments are not linked to specific purchases (a running balance, not
  invoice-level allocation).
- Expenses have no edit — delete and re-add.
- No CSV/PDF export of the ledger yet.
- Orders' `items_count` on the old `/api/admin/stats` endpoint is still wrong ("0 items");
  the dashboard no longer uses that endpoint.
- PostgreSQL paths for the ledger were written but only the JSON store was exercised.

---

## Addendum — Bulk product upload & image uploads (same day)

### Image uploads — `server/routes/uploads.js` (`/api/uploads`)
- Files arrive as base64 data URLs in JSON (no multipart dependency; body limit is
  already 10 MB). Type is verified by **magic bytes**, not the claimed MIME/extension;
  JPEG / PNG / WebP / GIF, 5 MB each, 40 per request.
- Saved to `public/uploads/products/<sanitised-original-name>` — "My Photo (1).JPG"
  becomes `my-photo-1.jpg`. Names are preserved on purpose so a CSV can reference an
  image by filename. Re-uploading the same name replaces the file.
- `POST /image`, `POST /images`, `GET /images` (library listing), `DELETE /images/:name`.
  Writes are covered by `public-demo.js`. `resolveImageRef()` is exported for the bulk
  importer: full URL / site path → as-is; bare filename → matching upload or `null`.
- `public/uploads/` is served statically like the rest of `public/`. It is **not** in
  `.gitignore` — decide whether uploaded product photos belong in the repo before
  committing; on Render the filesystem is ephemeral, so uploads there need object storage
  (S3/R2) in a later phase.

### Bulk import — `POST /api/products/bulk` in `server/routes/products.js`
- Body `{ rows, update_existing = true, create_categories = false }`, ≤ 500 rows.
- Header names are normalised (`Regular Price`, `regular_price`, `price` all work).
  Money strings like `"3,500"` or `"Rs. 3500"` parse. Booleans accept yes/no/true/false/1/0.
- Matching for updates: **SKU first**, then slug from title. Categories match by slug,
  name or id (case-insensitive); unknown categories are rejected unless
  `create_categories` is set, so a typo can't invent one. Subcategories are created
  under the category when missing.
- Multiple images separated by `|` or `;`. Unresolvable image references are reported
  as a warning on the row, not a failure.
- Cost: `cost_price = cost_base + cost_shipping + cost_extra` when any of the three is
  supplied (or on a new product).
- Rows are independent; the response lists `created / updated / failed` per line
  (line numbers match the spreadsheet, header = line 1).

### Admin — `public/js/admin-import.js`
Products tab gains **🖼 Image Library** and **⬆ Bulk Upload (CSV)** buttons.
- Bulk modal: download template (with an example row), export current products as CSV
  (round-trips through the importer for mass edits), choose file → client-side RFC 4180
  parse → preview with column checks → import → per-row results.
- Image Library modal: drag & drop or choose files, upload summary (uploaded / rejected
  with reasons), tile grid with Copy URL / delete.
- Add & Edit Product forms: the image URL box now has **⬆ Upload from computer** and a
  thumbnail preview (`Admin.imageField()` / `Admin.uploadIntoField()`).

### CSS fix worth knowing
Every `transition: all` in the stylesheets was replaced with explicit property lists.
`all` includes inherited `visibility`, so elements inside the modal (which animates
`visibility`) faded in late — and rendered invisible in frozen-time headless screenshots.

### Verified
Fake JPEG rejected; friendly filename resolved from CSV; `"3,500"` parsed; costs summed
1200 + 100 + 200 = 1500; update by SKU changed stock and kept images; unknown category
and non-numeric price failed with clear messages while the other rows imported. Test
product, stock change and upload removed afterwards.

---

## Addendum — Admin login, database-stored images, deployment prep (18 Sep 2026)

### Admin authentication — `server/middleware/admin-auth.js`
- `POST /api/admin/auth/login` → HMAC-signed session token (`Authorization: Bearer …`);
  `/logout`, `/me`. Credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD`; signing key
  `SESSION_SECRET` (else derived from the password so restarts keep sessions valid).
- **One active session** (persisted in `admin_sessions`; a new login signs the other device
  out with `SESSION_REPLACED`), **12 h expiry**, **30 min idle timeout**
  (`ADMIN_IDLE_MINUTES`), **5 failed logins → 15 min IP lock**.
- Protected: every POST/PUT/PATCH/DELETE on categories, products, settings; all of
  `/api/ledger`, `/api/admin/*`, `/api/uploads` management; order list/detail/status;
  any `?all=true` read. Public: browsing, checkout, tracking, storefront settings.
- Frontend: `AppRouter.renderAdminView` gates on a token → sign-in card; `API.request`
  attaches the token and, on 401, clears it and shows the sign-in form with the reason.
  Sign Out in the sidebar. `PUBLIC_DEMO` remains as an optional extra lock.

### Images in the database on PostgreSQL — `server/routes/uploads.js`
`storage` abstraction: files on disk locally; `uploaded_images (id, mime, bytes BYTEA)` on
PostgreSQL, served by `GET /uploads/products/:name` (7-day cache header). Library,
SKU matching and CSV resolution all go through it, so Render's ephemeral disk no longer
matters. Neon's free 0.5 GB holds roughly 2,000 photos at 250 KB; move to R2/S3 beyond that.

### Fixes found while testing on a real PostgreSQL (Docker, postgres:16)
- `schema.sql` was never executed — a fresh database crashed on the first query. Now
  `db.applySchema()` runs it (plus the lazy ensure helpers) at startup.
- TLS was only enabled when `NODE_ENV=production`; Neon needs it always. Now on unless the
  host is local or the URL says `sslmode=disable`.
- 26-step end-to-end run on PostgreSQL passed: seed, settings, visibility, cost breakdown,
  order + tracking + status, vendor/purchase/payment/expense, summary, analytics, DB image
  upload/serve/attach/delete, bulk import, auth gating. Zero storefront console errors.

### Deployment files
`render.yaml` (web service only; `DATABASE_URL` and `ADMIN_PASSWORD` prompted,
`SESSION_SECRET` generated; health check `/api/health`), `.env.example`, `.gitignore`
(local store and local uploads excluded), README deployment section.

### Multiple admin users (18 Sep, later)
`admin_users` now holds real accounts (scrypt-hashed, `server/utils/password.js`). Roles
`owner` / `staff`; `requireRole('owner')` guards `/api/ledger` and `/api/admin/users`;
analytics returns `finance: null` and no costs/profit for staff. First owner bootstrapped
from the env vars when the table is empty (`ensureBootstrapOwner`, also at startup).
Sessions are now per user. Owner-only Users tab (add / edit / role / enable-disable /
reset password / delete, with "last active owner" protection); everyone gets Change My
Password. CI suite: +1 test (13).
