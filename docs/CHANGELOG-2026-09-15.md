# Zavyaan — Implementation Record, 15 September 2026

Work done to bring the running project into line with `Zavyaan_Project_Blueprint.md`.
Written for whoever picks this project up next.

Scope: correctness and blueprint conformance of what already exists. This was **not**
an attempt to build the unbuilt phases (C–M). Deferred work is listed at the bottom.

---

## 1. Critical: order creation was broken

**`server/db/db.js` — `createOrder()`**

The function assigned `id: orderId`, but `orderId` was never declared. Every checkout
attempt threw `ReferenceError: orderId is not defined` and returned HTTP 500, in both
the PostgreSQL and local-store paths. **No order could be placed at all.**

Fixed by generating the id alongside the order number:

```js
const orderId = orderData.id || `ord-${randNum}-${Date.now()}`;
```

---

## 2. Critical: the backend trusted client-supplied money

**`server/routes/orders.js` — `POST /api/orders`**

The route built the order from values in the request body:

```js
const price = Number(it.price) || 0;                          // client's price
const discount = (Number(req.body.discount) || 0) + advanceDiscount;  // client's discount
```

Anyone could post an order with `price: 1` and `discount: 999999` and receive it at that
price. There was also no stock check of any kind, and stock was never reduced when an
order was placed.

This contradicted **Master Business Rule 12** and **section 38** ("Backend validates
final: Price, Stock, Discount, Delivery, Total, Payment, Order").

The route now:

- looks every line item up in the database by `product_id` and rejects unknown or
  inactive products;
- resolves the selected variant server-side and rejects one that no longer exists;
- computes the unit price itself as `(sale_price ?? regular_price) + variant.price_adjustment`
  — the client's `price` field is ignored entirely;
- checks stock (variant stock when a variant is chosen, otherwise product stock) and
  returns HTTP 409 with a readable message when there isn't enough;
- ignores `req.body.discount` completely; the only discount is the Rs. 100 advance-payment
  discount, applied server-side (Rule 11);
- computes delivery (free at/above Rs. 2,500, else Rs. 200) and the total server-side;
- snapshots `cost_price` onto each order line so historical profit stays correct (Rule 13);
- decrements stock through the new `db.decrementStock()` once the order is written.

Verified: a request with `price: 1, discount: 999999` for a Rs. 3,299 item now records
subtotal 3299, discount 0, total 3299.

### Related additions

- `server/db/db.js` — new `decrementStock(productId, variantId, qty)`, covering both
  PostgreSQL and the local store, clamped at zero.
- `server/db/schema.sql` — `order_items.cost_price NUMERIC(10,2) NOT NULL DEFAULT 0`.
  **Migration note:** `schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so an existing
  PostgreSQL database will not pick this column up. Before deploying against one, run:

  ```sql
  ALTER TABLE order_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) NOT NULL DEFAULT 0;
  ```

  Without it, order inserts will fail against that database.

---

## 3. Security: guest order tracking leaked orders

**`server/routes/orders.js` — `GET /api/orders/track/:orderNumber`**

The endpoint returned the customer's name, city, province, order total and full item
list to anyone who supplied a valid order number. Order numbers are sequential-looking
(`ZV-2026-123456`), so they are guessable. This contradicted **section 21 (Guest tracking)**
and **Master Business Rule 17**.

Tracking now requires the phone number used at checkout, as the "appropriate verification
mechanism" the blueprint calls for:

- comparison is digits-only, so `+92 301 2345678`, `0301-2345678` and `03012345678` all
  match, and the last 10 digits are accepted to tolerate country-code differences;
- a wrong phone and a non-existent order return the **same** response, so the endpoint
  cannot be used to discover which order numbers exist;
- both `customer_phone` and `customer_whatsapp` are accepted.

Frontend changes so this stays a one-click experience where it should be:

- `order-tracking-page.js` — added a labelled phone field with a short explanation.
- `checkout-page.js` — stores the phone in `sessionStorage` under
  `zavyaan_order_phone_<orderNumber>` after a successful order.
- `order-confirmation-page.js` and `shared/router.js` — read that value, so the
  confirmation screen and its "Track Order" button work without retyping. Falls back
  to the manual form in private browsing.

---

## 4. Order status lifecycle completed

Section 21 specifies `Pending → Confirmed → Processing → Packed → Shipped →
Out for Delivery → Delivered`, plus Cancelled / Returned / Refunded. The code had a
seven-value list missing **Packed**, **Out for Delivery** and **Refunded**, duplicated
across five files.

Introduced one definition on each side, intended to be kept in step:

- `server/utils/order-status.js` — `FLOW`, `EXCEPTIONS`, `ALL`, `isValid()`, `isException()`
- `public/js/shared/order-status.js` — same, plus `slug()`

Consumers updated: `server/routes/orders.js` (validation), `admin.js` (status dropdown),
`order-tracking-page.js` (timeline), and the status pills on the account, tracking and
confirmation pages.

Two details worth knowing:

- **Status CSS classes are now slugs.** `"Out for Delivery"` contains spaces and cannot
  be a class name, so `.status-Pending` became `.status-pending`,
  `.status-out-for-delivery`, and so on, via `OrderStatus.slug()`. Classes for Packed,
  Out for Delivery, Returned and Refunded were added to `css/pages/order.css`.
- **Cancelled / Returned / Refunded orders no longer render the progress timeline.**
  Previously they showed every step as incomplete, which read as "nothing has happened".
  They now show a short notice instead, with the dispatch log below it.

---

## 5. Brand identity applied

The site used the text "ZAVYAAN" and a 💎 emoji favicon. The supplied logo files were
3264×3264 PNGs at 100–300 KB each — too large to serve directly, against section 3's
"optimized file sizes".

Generated trimmed, padded, resized assets into `public/assets/brand/` (8–53 KB each):

| File | Use |
|---|---|
| `zavyaan-logo-{black,white,gold}.png` | full stacked lockup, 420px wide |
| `zavyaan-mark-{black,white,gold}.png` | monogram only, 256px wide |
| `favicon-32.png`, `apple-touch-icon.png`, `/favicon.ico` | browser icons |
| `zavyaan-og.jpg` | 1200×630 social card, gold lockup on rich black |

Originals remain untouched in `Zavyaan Images/`.

**Header lockup is horizontal, not the supplied stacked one.** The supplied lockup
stacks the monogram above the wordmark; at the 74px header height its wordmark rendered
about 11px tall and was unreadable. The header instead pairs the monogram with the
typeset wordmark and gold tagline. The stacked lockup files are kept for contexts with
vertical room.

Also added: Open Graph and Twitter card metadata, and `theme-color` (section 24).

### Responsive behaviour

At ≤480px the search field, wordmark and cart actions could not share the row, and the
wordmark was being visibly clipped. Below that width the header shows the monogram
alone; the drawer and footer keep the full lockup. Verified at 360, 390, 768 and 1280px
— no clipping, no horizontal overflow.

---

## Verified

Against the running local server (embedded JSON store):

- Checkout succeeds; an order is created, persisted and returned.
- Price tampering (`price: 1`) is overridden with the database price.
- Discount injection (`discount: 999999`) is ignored.
- Over-ordering (9,999 of a 29-stock item) returns HTTP 409.
- Unknown product ids are rejected.
- Stock decrements correctly (60 → 58 for a quantity of 2).
- `cost_price` is snapshotted on the order line (price 1899, cost 850).
- Advance payment applies exactly Rs. 100 (3299 → 3199).
- Tracking with the order number alone is refused; with a wrong phone is refused;
  with the correct phone in any format succeeds.
- All seven forward statuses are accepted and recorded to the timeline in order; an
  invalid status is rejected.
- No browser console errors on home, shop, track, cart, category and collection pages.

Test orders created during this work were removed afterwards and the consumed stock was
restored, so the store is back to its seeded state (0 orders, 8 products).

---

## Not done — deferred by phase

Everything below is unchanged and still open. None of it was in scope here.

| Area | Blueprint phase | State |
|---|---|---|
| Collections as real data | C / D | `collectionService.js` still defines five collections **client-side** and derives their contents from product filters. There is no collections table, no API, and no way for a product to belong to several collections. Rule 14 is not yet met. |
| Customer accounts | I | `authService.js` / `customerService.js` exist as integration points. There is no customer table, hashing, or session handling; multi-device sign-in (Rule 3) is unimplemented. |
| Admin authentication | E | Still compares against env values and returns a base64 pseudo-token. No real session, no one-device rule (Rule 5), no 5-minute timeout (Rule 6), no server-side permissions. **`/api/admin/stats` requires no authentication at all.** |
| Admin panel rebuild | E | Blueprint marks the current UI REBUILD. Untouched. |
| Inventory / vendors / purchases / expenses / finance | H | Not started. `decrementStock()` is a direct decrement, not a stock-movement ledger. |
| Payments / shipping records | D / G | No tables. Advance payment is a flag on the order, with no payment record. |
| Cancellation / returns / refunds | G | `Refunded` is now a valid status, but no workflow, window or restocking logic exists. |
| Cinematic homepage, admin-editable sections | J | Homepage is static in code; merchandising still requires code changes. |
| SEO beyond metadata | K | No canonical URLs, sitemap, or structured data. |
| Tests | L | No test suite exists. All verification above was manual. |

### Known issues

- **Order creation is not transactional.** `createOrder()` writes the order and then
  stock is decremented in a separate step. A crash in between leaves stock unreduced.
  Section 14 asks for transactional behaviour; doing it properly belongs with the
  Phase C/D database work.
- **Stock is not restored when an order is cancelled or returned.** Status changes do
  not touch stock.
- **No rate limiting on tracking.** Phone verification stops casual enumeration, but
  nothing throttles automated guessing.
- **`public/js/app.js`, `js/router.js`, `js/state.js` are dead files** — not referenced
  by `index.html`, superseded by `js/shared/` and `js/customer/`. `js/router.js` still
  contains an outdated five-step status list. Left in place rather than deleted.
- The two status definition files must be edited together; nothing enforces that.
