# Zavyaan — Storefront Customisation, 16 September 2026

Part 1 of the frontend customisation brief: homepage layout, gold/white/black palette,
category & product visibility control, and admin-controlled payment methods.
Written for whoever picks this project up next. Follows `CHANGELOG-2026-09-15.md`.

---

## 1. Homepage restructured

**`public/js/customer/pages/home-page.js`** — rewritten. Section order is now fixed:

1. Hero banner (first thing under the site header)
2. **Collections** — the only content directly beneath the banner
3. Promotional banners (sale / collection / offer)
4. **Featured Highlights** — the single owner-curated product section
5. Trust guarantees
6. Zavyaan Insiders email subscription

Removed from the homepage: the "All Store Categories" grid, the "Best Sellers" product grid
and the old two-banner block. There are no product grids on the page other than
Featured Highlights. Categories are still reachable from the navigation, the footer and a
new tile strip at the top of **Shop All** (`shop-page.js`).

Two new components, each in its own file:

- **`components/featured-highlights.js`** — renders exclusively products the owner has
  marked ★ Featured in Admin → Products (`product.is_featured`). Nothing is inferred; if
  nothing is featured the section says so.
- **`components/promo-banners.js`** — sale / collection / offer banners from store
  settings, in three palette-safe themes (`dark`, `ivory`, `gold`).

**Insiders block:** the heading "Receive Rs. 500 OFF Your Next Order" is gone. The block
keeps the "Zavyaan Insiders" badge, one email field and a Subscribe button
(`.insiders-form`). The footer itself never contained the Rs. 500 text.

**Footer categories** (`index.html` + `components/footer.js`) are now rendered from the
live category list instead of a hardcoded `<ul>`, so a disabled category disappears there
too.

## 2. Palette: gold, white and black only

**`css/variables.css`** — the status tokens were the only source of red/green/blue in the
design system, so they were redefined rather than replaced at every call site:

| Token | Before | After |
|---|---|---|
| `--color-status-success` | green `#2E7D32` | muted gold `#A88445` |
| `--color-status-warning` | amber `#B78103` | gold `#C6A15B` |
| `--color-status-error` | red `#C62828` | rich black `#0B0B0B` on soft neutral |
| `--color-status-info` | blue-grey `#37474F` | charcoal `#1C1C1C` |

Also added `--color-primary-black` and `--color-ivory`, which `admin.js` referenced but
which were never defined (they were silently falling back to inherited colours).

Hardcoded colours fixed: `.badge-sale` (red → gold text on black with gold border, used for
"-30% OFF" tags), `.nav-link.deal-link` (red "Deals & Offers" → gold), `.price-discount`
(red → gold chip), `.badge-cod` and `.advance-discount-badge` (green → gold/black),
`.checkout-row.discount-row`, `.error-state` border, and every `.status-*` order pill in
`order.css` (previously blue/purple/green/red). A grep for any hex or rgba outside the
palette across `public/css` and the customer/admin JS now returns nothing.

## 3. Category and product visibility

Toggling already existed for categories and products, but the single-item endpoints leaked:

- `GET /api/categories/:idOrSlug` returned disabled categories → now 404 unless `?all=true`.
- `GET /api/products/:idOrSlug` returned disabled products, and active products inside a
  disabled category → now 404 unless `?all=true`. (The list endpoint already filtered.)

Admin (`admin.js`) additions: **●/◯ show/hide toggle on every subcategory** (only delete
existed), clearer "Live on store / Hidden" buttons for categories and products,
**★ Featured** and **Best Seller** toggles on the product table, and the same three flags
as checkboxes on Add Product. The nav refresh after category changes was calling the dead
`UI.renderNavigation`; it now calls `HeaderComponent.renderNavigation`.

`CategoryService.getCategory()` returns `null` on 404 (was throwing, which rendered the
error state instead of the "Category Not Found" state). `customer-app.js` now renders the
navigation at bootstrap — previously it was only rendered by the homepage, so landing
directly on `#shop` gave an empty nav bar.

## 4. Payment methods, admin-controlled

### Data

**`server/utils/store-settings.js`** — new. Defaults and validation for one settings
document:

```
payment_methods[]  { code, label, description, instructions, discount, enabled }
promo_banners[]    { id, kind, tag, heading, description, cta_text, cta_link, theme, enabled }
collections[]      { slug, title, subtitle, description, image_url, filter, enabled }
homepage           { show_collections, show_promo_banners, show_featured,
                     featured_title, featured_tagline, featured_limit }
```

Default methods: **COD** (on), **Advance Payment** (on, Rs. 100 off), **Easypaisa**,
**JazzCash**, **Bank Transfer** (all off, Rs. 100 off). The online methods are manual
transfers with proof over WhatsApp — the admin adds account details in `instructions`
before enabling. No gateway is integrated (blueprint section 21: no fake integrations).

**`server/db/db.js`** — `getSettings()`, `saveSettings(patch)`. Local store: `data.settings`.
PostgreSQL: new `store_settings (key, value JSONB)` table, created lazily on first use
because `schema.sql` is `CREATE TABLE IF NOT EXISTS` and existing databases would not pick
it up. `saveSettings` merges payment methods **per code** and `homepage` **per field** over
the current state, so a partial patch never resets the other methods; banners and
collections are ordered lists and replace wholesale.

**`server/routes/settings.js`** — `GET /api/settings` (public; disabled items filtered out
unless `?all=true`) and `PUT /api/settings` (admin; only the four known keys accepted).
Writes are covered by `middleware/public-demo.js`.

### Enforcement

**`server/routes/orders.js`** — `POST /api/orders` looks the requested `payment_method` up
in settings and refuses anything unknown or disabled with a message listing what *is*
enabled. The discount is the method's configured amount (capped at the order value), no
longer a hardcoded `ADVANCE ? 100 : 0`. `orders.payment_method` stores the method code.

Verified against the running server: Easypaisa refused while disabled; enabled with a
Rs. 150 discount → order accepted at 2999 − 150 = 2849 with `payment_method: EASYPAISA`;
COD disabled → COD order refused; unknown settings key → 400.

### Storefront

- **`services/settingsService.js`** — new; caches `/api/settings`, exposes
  `getPaymentMethods()`, `getPromoBanners()`, `getCollections()` and `paymentLabel(code)`.
- **`checkout-page.js`** — renders one card per *enabled* method with its description,
  discount badge and (when selected) instructions; the submit button and summary discount
  row follow the selected method. If nothing is enabled the form shows an "unavailable"
  notice and the button is disabled. `render()` is now async (router updated).
- Order confirmation, account order history and the admin order modal show the method
  label via `SettingsService.paymentLabel()` instead of assuming COD/Advance.
- Buttons that hardcoded "(COD)" — cart drawer, cart page, product card, Buy Now — now
  say "Add to Cart" / "Proceed to Checkout" / "Buy Now", since the method is chosen at
  checkout.

### Admin

New **Storefront & Payments** tab (`Admin.renderStorefront`, deep-linkable as
`#admin/storefront`): toggles and inline editing for every payment method, homepage
section visibility and the Featured heading, promotional banners (add/remove, kind, theme,
copy, link) and collections (show/hide, title, subtitle, image). Each card has its own
Save button; saving invalidates the storefront settings cache. Saving with no enabled
payment method succeeds but returns a warning that the admin sees.

## 5. Collections are now data

`collectionService.js` previously defined five collections in client code. They now come
from `settings.collections` (same five by default, with images), so the admin can hide,
retitle or re-image them without a deploy. A collection is still a saved product filter;
there is no `collections` table or product↔collection mapping yet (blueprint rule 14
remains open — see the previous changelog's deferred list).

## Verified

- Zero console errors on: home, shop, category, collection (live and hidden), product,
  checkout, track, admin dashboard / storefront / categories / products.
- Disabling Fashion: category vanishes from `/api/categories`, `/api/categories/fashion`
  → 404, its products vanish from lists, `/api/products/prod-emerald-kurti` → 404, admin
  `?all=true` still loads it. Disabling a product and un-featuring a product behave the
  same way. Everything restored afterwards.
- Screenshots at 1280px of home, shop, checkout and the admin tabs reviewed by eye.
- `server/data/store.json` restored to its pre-session state (0 orders; the test order and
  its stock movement were rolled back). Settings live only in the DB once first saved;
  until then defaults apply.

## Notes / not done

- The announcement bar and several marketing strings still say "Cash on Delivery"; they
  are static copy and do not react if the owner disables COD.
- Collections and banners are limited to 12 and 6 respectively (`store-settings.js`).
- Collection `filter` is displayed read-only in the admin; editing it is a JSON field and
  was left out of the UI deliberately.
- PostgreSQL path of `getSettings`/`saveSettings` was written against the schema but only
  the local JSON store was exercised in this session.
- Dead files `js/router.js`, `js/app.js`, `js/state.js`, `js/ui.js` remain untouched.
