# Zavyaan — Master Project Blueprint & Implementation Plan

**Purpose:** Single source of truth for the Zavyaan e-commerce project.

**Brand:** Zavyaan  
**Working tagline:** Discover More. Live Better.  
**Technology foundation:** Node.js + Express + PostgreSQL + HTML/CSS/JavaScript  
**Deployment target:** Render  
**Current planning status:** Phase A finalized; Phase B (B1–B9) implementation plan prepared.

---

## 1. Project Vision

Zavyaan is a professional e-commerce store being developed as a serious, scalable online business. The long-term goal is to build business income that can eventually replace or substantially reduce dependence on employment income.

The project must be production-minded rather than a quick prototype or temporary “jugaad”. A future developer or team should be able to understand, operate, maintain, and extend the system without depending on the original developer.

### Core principles

- Modular and maintainable architecture
- Secure by design
- Backend-authoritative business logic
- Scalable database structure
- Clean separation of concerns
- Easy future handover
- Easy future modification
- Controlled implementation phases
- Testing after major phases
- Reuse useful existing code where appropriate
- Do not unnecessarily replace the current technology stack
- Do not overbuild features before they are needed

---

# 2. Brand & Design System

## 2.1 Brand

**Name:** Zavyaan  
**Working tagline:** “Discover More. Live Better.”

## 2.2 Finalized palette

| Token | Hex |
|---|---|
| Rich Black | `#0B0B0B` |
| White | `#FFFFFF` |
| Premium Gold | `#C6A15B` |
| Champagne Gold | `#D4B77A` |
| Muted Gold | `#A88445` |
| Warm Ivory | `#F7F4EE` |
| Soft Neutral | `#EFEDE8` |
| Charcoal | `#1C1C1C` |
| Secondary Text | `#6B6B6B` |
| Light Border | `#E5E1D8` |

Gold should be restrained. Black and white remain dominant.

## 2.3 Typography

Use a maximum of two font families:

1. Elegant modern heading font
2. Clean readable sans-serif for body/UI

## 2.4 Visual language

Zavyaan should feel:

- Premium
- Modern
- Clean
- Elegant
- Trustworthy
- Commercial
- Fast

Avoid excessive gold, random gradients, excessive shadows, cheap-looking badges, overcrowding, heavy decorative borders, and unnecessary animation.

---

# 3. Product Image System

All product imagery should follow one consistent visual system:

- Consistent aspect ratios
- Consistent card image dimensions
- Consistent internal padding
- Consistent cropping
- Clean neutral backgrounds
- Product remains the visual focus
- Optimized file sizes
- Responsive image sizing
- Lazy loading where appropriate

Avoid random colorful backgrounds and inconsistent image treatments.

---

# 4. Categories

Finalized main categories:

1. Fashion
2. Jewellery
3. Kids & Toys
4. Beauty & Personal Care
5. Home & Living
6. Electronics & Accessories
7. Bags & Accessories
8. Deals & Offers

Subcategories must be dynamic and manageable from Admin rather than permanently hard-coded into the frontend.

---

# 5. Categories vs Collections

Categories and collections are separate concepts.

### Categories

Used for product classification and navigation.

### Collections

Used for marketing, merchandising, and curated discovery.

Examples:

- New Arrivals
- Trending
- Summer Collection
- Jewellery Collection
- Premium Picks

A product can belong to multiple collections.

---

# 6. Master Roadmap

The project is organized into 13 major implementation phases.

## Phase 1 — Master Architecture

Define and implement the overall frontend/backend/database/API/auth/security/deployment architecture.

## Phase 2 — Customer Website

Build/refactor homepage, navigation, shop, categories, collections, product pages, cart, checkout, and customer account UI.

## Phase 3 — Database

Build the complete production database including customers, addresses, collections, sessions, payments, shipping, inventory, vendors, purchases, expenses, finance, permissions, and activity logs.

## Phase 4 — Backend/API

Build modular backend business logic, authentication, authorization, validation, orders, inventory, payments, finance, vendor logic, and logging.

## Phase 5 — Admin Panel

Rebuild the existing rough admin UI according to the finalized Zavyaan admin requirements.

## Phase 6 — Product Management

Complete product creation, editing, variants, images, pricing, stock, collections, CSV import/export, bulk actions, archive, and SEO.

## Phase 7 — Cart / Checkout / Orders

Complete guest/customer carts, checkout, COD, advance payment, order lifecycle, tracking, cancellation, returns, and refunds.

## Phase 8 — Inventory / Vendors / Finance

Complete stock, stock history, purchases, vendors, payables, expenses, revenue, cost, and profit reporting.

## Phase 9 — Customer Accounts

Complete customer authentication, multi-device sessions, profiles, addresses, orders, password changes, and password reset.

## Phase 10 — Homepage / Advanced Animation

Implement the final cinematic homepage and scroll-based storytelling.

## Phase 11 — SEO / Performance / Security

Production hardening, SEO, schema, sitemap, image optimization, security, caching, rate limiting, monitoring, and backup strategy.

## Phase 12 — Testing / QA

Full functional, integration, responsive, browser, security, performance, and business-logic testing.

## Phase 13 — Deployment / Documentation / Handover

GitHub, Render, production PostgreSQL, environment variables, backups, documentation, admin guide, and developer handover.

---

# 7. Phase A — Existing Project Audit

The existing `Zavyaan.zip` project was inspected before architectural decisions were finalized.

## 7.1 Existing structure

```text
Zavyaan/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── public/
│   ├── assets/images/
│   ├── css/style.css
│   ├── index.html
│   └── js/
│       ├── admin.js
│       ├── api.js
│       ├── app.js
│       ├── router.js
│       ├── state.js
│       └── ui.js
├── render.yaml
├── run_store.bat
├── serve.ps1
└── server/
    ├── db/
    │   ├── db.js
    │   ├── schema.sql
    │   └── seed.js
    ├── routes/
    │   ├── admin.js
    │   ├── categories.js
    │   ├── orders.js
    │   └── products.js
    └── server.js
```

## 7.2 Current technology

- Node.js 18+
- Express
- PostgreSQL
- `pg`
- CORS
- dotenv
- Plain HTML/CSS/JavaScript frontend
- Hash-based SPA routing
- Render configuration

## 7.3 Existing server behavior

Current server includes:

- Express server
- Static `public` serving
- JSON/urlencoded request handling
- API routes for categories, products, orders, and admin
- Health endpoint
- PostgreSQL support when `DATABASE_URL` exists
- Local JSON persistence fallback for development
- SPA fallback

## 7.4 Existing database foundation

Current schema contains:

- categories
- subcategories
- products
- product_images
- product_variants
- orders
- order_items
- order_timeline
- admin_users

It does **not** yet contain the full production model.

## 7.5 Existing authentication problem

The current admin authentication is only a prototype. It compares credentials against environment values and returns a fake token-like value rather than implementing the required secure session architecture.

There is no production customer authentication system yet.

## 7.6 Existing frontend

Current frontend uses plain JavaScript modules and a hash router. Existing code contains customer UI, cart state, API calls, product/category pages, and basic admin UI.

Client-side cart/price/delivery calculations exist, but final business calculations must be moved to backend authority.

## 7.7 Render configuration

The current Render configuration is a starting point only. The free PostgreSQL configuration must not be treated as a permanent production database. Production deployment requires an appropriate production plan, backups, recovery strategy, and secure environment configuration.

---

# 8. Phase A — KEEP / MODIFY / REBUILD / ADD

| Area | Decision |
|---|---|
| Node.js | KEEP |
| Express | KEEP |
| PostgreSQL | KEEP |
| Basic product/category foundation | KEEP + MODIFY |
| Basic order foundation | MODIFY |
| Customer frontend | MODIFY |
| Current admin UI | REBUILD |
| Database schema | MAJOR MODIFY/EXPAND |
| Authentication | REBUILD |
| Business logic layer | REBUILD/UPGRADE |
| Security architecture | REBUILD/UPGRADE |
| Inventory | ADD |
| Vendors | ADD |
| Purchases | ADD |
| Expenses | ADD |
| Finance | ADD |
| Customers | ADD |
| Collections | ADD |
| Payments | ADD |
| Shipping | ADD |
| Permissions | ADD |
| Activity logs | ADD |
| Testing | ADD |
| Documentation | ADD |

**Important:** The current admin UI is only a rough structure. It must not constrain the final admin design.

---

# 9. Master Architecture

Target architecture:

```text
ZAVYAAN
 ├── Customer Website
 └── Admin Panel
          ↓
       REST API
          ↓
Backend / Business Logic / Auth / Services
          ↓
      PostgreSQL
```

The frontend must never connect directly to PostgreSQL.

Business-critical logic belongs in backend services/business modules.

---

# 10. Target Project Structure

```text
Zavyaan/
├── public/
│   ├── assets/
│   ├── css/
│   └── js/
│       ├── customer/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── services/
│       │   ├── state/
│       │   └── customer-app.js
│       └── shared/
│           ├── api.js
│           ├── router.js
│           ├── ui.js
│           └── utils.js
├── server/
│   ├── config/
│   ├── middleware/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── db.js
│   ├── modules/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── categories/
│   │   ├── collections/
│   │   ├── cart/
│   │   ├── orders/
│   │   ├── payments/
│   │   ├── shipping/
│   │   ├── inventory/
│   │   ├── vendors/
│   │   ├── purchases/
│   │   ├── expenses/
│   │   ├── finance/
│   │   ├── marketing/
│   │   └── admin/
│   ├── services/
│   ├── utils/
│   └── server.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── deployment/
│   └── admin-guide/
├── .env.example
├── render.yaml
├── package.json
└── README.md
```

This is a target direction, not a command to blindly create all folders at once. Migration should be controlled.

---

# 11. Database Blueprint

## 11.1 Customers

Store customer identity and account information, including:

- Customer ID
- Name
- Email
- Phone
- Secure password hash
- Status
- Created date
- Last login

Passwords are never stored in plaintext.

## 11.2 Customer Addresses

Store reusable customer addresses:

- Customer ID
- Name
- Phone
- Address
- City
- Area
- Postal code where applicable
- Default address flag

Guest checkout details must also be preserved as order snapshots.

## 11.3 Products

Products should support:

- ID
- SKU
- Name
- Brand
- Description
- Category
- Subcategory
- Collections
- Vendor/cost information
- Selling price
- Sale price
- Stock
- Low-stock threshold
- Status
- Images
- SEO fields
- Timestamps

## 11.4 Categories / Subcategories

Dynamic, admin-managed classification system.

## 11.5 Collections

Separate marketing/merchandising entity with many-to-many product relationships.

## 11.6 Product Images

Store image references, product relationship, order, and main-image status as needed. Actual file storage should use an appropriate production storage strategy.

## 11.7 Variants

Flexible variant architecture. A product may have no variants or many variants.

Possible variant data:

- SKU
- Attributes
- Stock
- Price override where needed

Do not assume every product has color and size.

## 11.8 Inventory

Track:

- Current stock
- Stock movements
- Stock in/out
- Adjustments
- Adjustment reason
- Date/time
- Responsible admin

## 11.9 Orders

Orders must preserve historical data:

- Internal order ID
- Human-readable order number
- Customer ID when applicable
- Customer/guest snapshot
- Items
- Quantities
- Unit price at purchase
- Product cost snapshot
- Discount
- Delivery charge
- Total
- Payment reference
- Shipping reference
- Status
- Timestamps

Changing a current product price must never alter an old order.

## 11.10 Payments

Separate payment entity:

- Order
- Method
- Amount
- Status
- Transaction/reference ID
- Date

Architecture must be future-ready for payment gateways.

## 11.11 Shipping

Support:

- Courier
- Tracking number
- Delivery charge
- Shipping status
- Tracking data
- Delivery date

## 11.12 Vendors

Support:

- Vendor identity
- Contact person
- Phone/WhatsApp
- Address
- Products
- Purchases
- Paid amount
- Payable amount
- Payment history

## 11.13 Purchases

Track:

- Vendor
- Product
- Quantity
- Unit cost
- Total cost
- Paid amount
- Payable amount
- Date

## 11.14 Expenses

Fields/concepts:

- Amount
- Category
- Description
- Date
- Added by

Example categories:

- Ads
- Packaging
- Courier
- Website/software
- Domain
- Office
- Other

## 11.15 Finance

Finance must distinguish:

- Revenue
- Product/vendor cost
- Delivery cost
- Other business expenses
- Gross profit where relevant
- Net profit
- Vendor payable

## 11.16 Admin users

Support:

- Admin ID
- Name
- Username/email
- Secure password hash
- Role
- Permissions
- Status
- Last activity

## 11.17 Sessions

Customer and admin sessions are separate systems.

## 11.18 Activity logs

Track:

- Who performed an action
- What happened
- When it happened

Never log passwords or secrets.

## 11.19 Future-ready entities

Leave clean extension points for:

- Coupons
- Reviews
- Notifications
- Payment gateways
- Courier integrations
- Marketing integrations

---

# 12. Database Migration Strategy

Production schema should evolve through versioned migrations rather than one uncontrolled schema file.

Example:

```text
database/
├── migrations/
│   ├── 001_initial_schema
│   ├── 002_customers
│   ├── 003_auth_sessions
│   ├── 004_collections
│   ├── 005_inventory
│   ├── 006_vendors
│   ├── 007_purchases
│   ├── 008_payments_shipping
│   └── ...
└── seeds/
```

Every schema change should be reproducible and documented.

---

# 13. Backend / API Blueprint

Suggested domain modules:

```text
/api/auth
/api/products
/api/categories
/api/collections
/api/cart
/api/orders
/api/payments
/api/shipping
/api/customers
/api/inventory
/api/vendors
/api/purchases
/api/expenses
/api/finance
/api/admin
/api/marketing
```

Where appropriate, separate:

```text
routes
controllers
services
repositories/data access
validation
```

The exact file structure may evolve, but responsibilities must remain separated.

---

# 14. Order Business Flow

```text
Cart
 ↓
Checkout
 ↓
Backend Validation
 ↓
Current Prices
 ↓
Stock Validation
 ↓
Discount / Coupon
 ↓
Delivery Calculation
 ↓
Order Creation
 ↓
Price + Cost Snapshot
 ↓
Payment Record
 ↓
Inventory Movement
 ↓
Finance Record
 ↓
Confirmation
```

The final order process should use appropriate transactional behavior to avoid inconsistent stock, order, payment, and finance records.

---

# 15. Inventory / Vendor / Finance Flow

```text
Vendor Purchase
 ↓
Stock Increase
 ↓
Purchase Record
 ↓
Vendor Payable

Customer Order
 ↓
Stock Decrease
 ↓
Revenue
 ↓
Product Cost
 ↓
Delivery Cost
 ↓
Other Expense
 ↓
Net Profit
```

Example:

- Sale = Rs.2,000
- Vendor cost = Rs.1,200
- Delivery = Rs.200
- Other cost = Rs.50
- Net profit = Rs.550

The browser must not be the authority for this calculation.

---

# 16. Vendor Payable Logic

Example:

Purchase = Rs.50,000  
Paid = Rs.30,000  
Remaining payable = Rs.20,000

After paying Rs.10,000:

Remaining payable = Rs.10,000

Payment history must be preserved rather than simply overwriting totals.

---

# 17. Customer Authentication

## Registration

Potential fields:

- Name
- Email
- Phone
- Password
- Confirm password

Password must be securely hashed.

## Multiple devices

A customer can remain logged in on:

- Mobile
- Laptop
- Tablet
- Multiple simultaneous devices

There is **no one-device restriction for customers**.

## Account

Customer account includes:

- Profile
- Password
- Addresses
- Orders
- Order details
- Logout

## Password reset

```text
Forgot Password
 ↓
Secure verification/reset mechanism
 ↓
New Password
```

Reset tokens must be secure and time-limited.

---

# 18. Admin Authentication

Admin authentication is completely separate from customer authentication.

Required rules:

- Owner has full access
- Partner has configurable permissions
- One active session/device per admin account
- A new admin login invalidates the previous session for that account
- 5-minute inactivity timeout
- Server-side authorization is mandatory

Customer authentication must not inherit these admin restrictions.

---

# 19. Admin Panel Blueprint

The existing admin UI is a rough prototype and will be **rebuilt from zero according to finalized requirements** when the admin phase begins.

## Dashboard

Show:

- Sales
- Orders
- Products sold
- Revenue
- Profit
- Expenses
- Vendor payable
- Low-stock products

Date filters:

- Today
- This week
- This month
- Last month
- Custom range

Useful visual sections:

- Sales over time
- Category sales
- Order status
- Top products
- Profit
- Expenses

## Products

- All products
- Add product
- Edit product
- Archive product
- CSV import
- CSV export
- Categories
- Subcategories
- Collections
- Images
- Variants
- Stock
- Pricing
- Search
- Filters
- Sorting
- Bulk actions

## Orders

- All orders
- Status management
- Customer/guest details
- Order details
- Tracking
- Cancellation
- Returns
- Refunds

## Customers

- Customer list
- Customer details
- Order history
- Guest order context where appropriate

## Inventory

- Current stock
- Low stock
- Adjustments
- Stock history

## Vendors

- Vendor management
- Products
- Purchases
- Paid
- Payable
- Payment history

## Finance

- Sales
- Profit
- Expenses
- Vendor payments
- Reports

## Marketing

- Homepage banners
- Collections
- Sale banners
- Coupons
- Featured products
- Promotional sections

## Users & permissions

Owner: full access.

Partner: selected permissions, likely including Products/Orders/Inventory, while Finance/Expenses/Vendor Payments/Admin Settings may be restricted. Exact permission matrix remains **TBD until admin implementation is finalized**.

## Activity log

Show who changed what and when.

## Settings

- Store
- Delivery
- Payment
- Tax if needed
- SEO
- Homepage
- System

---

# 20. Product Management Blueprint

## Add Product

### Basic

- Name
- SKU
- Brand
- Short description
- Full description

### Classification

- Category
- Subcategory
- Collections

### Pricing

- Vendor cost
- Selling price
- Sale price
- Discount

### Inventory

- Stock
- Low-stock threshold
- Stock status

### Images

- Main image
- Additional images
- Ordering
- Remove
- Replace

### Variants

Flexible variant model with per-variant SKU/stock and optional pricing override.

### Status

- Draft
- Published
- Out of Stock
- Archived

### SEO

- SEO title
- Meta description
- Slug
- Keywords where useful
- Social metadata where useful

## CSV import

Required workflow:

```text
Upload
 ↓
Preview
 ↓
Validate
 ↓
Show errors
 ↓
Confirm import
```

Example:

```text
143 rows found
138 valid
5 errors
```

Possible errors:

- Missing category
- Invalid price
- Duplicate SKU
- Missing product name
- Invalid stock

CSV export should also be supported.

Products should normally be archived rather than hard-deleted.

---

# 21. Cart / Checkout / Orders

## Cart

Support both guest and logged-in carts.

Display:

- Image
- Name
- Variant
- Quantity
- Price
- Discount
- Subtotal

Summary:

- Subtotal
- Discount
- Delivery
- Total

## Checkout

Account creation is not compulsory.

Guest checkout fields should include:

- Name
- Phone
- Email
- Full address
- City
- Area
- Postal code where useful
- Additional delivery details

Logged-in customers should have saved information auto-filled but editable.

## Payment methods

Current intended methods:

1. Cash on Delivery (COD)
2. Advance payment

Advance payment receives a **Rs.100 discount**.

Architecture should be future-ready for:

- JazzCash
- Easypaisa
- Card payments
- Other gateways

Do not create fake payment gateway integrations.

## Order statuses

Normal lifecycle:

```text
Pending
 → Confirmed
 → Processing
 → Packed
 → Shipped
 → Out for Delivery
 → Delivered
```

Alternative states:

- Cancelled
- Returned
- Refunded

**Implemented 2026-09-15.** The canonical list lives in `server/utils/order-status.js`
and `public/js/shared/order-status.js`; these two must be kept in step. Frontend CSS
classes use a slug (`.status-out-for-delivery`) because status names contain spaces.

## Order number

Human-readable examples:

```text
ZV-2026-001024
```

Internal database IDs should not unnecessarily be exposed.

## Guest tracking

Guest tracking must not expose an order merely because someone guessed an order number. Use a secure token or appropriate verification mechanism.

**Finalized 2026-09-15:** the verification mechanism is the phone number used at
checkout, supplied alongside the order number. Comparison is digits-only so formatting
variations still match, and a wrong phone returns the same response as a missing order
so the endpoint cannot be used to enumerate order numbers. If a token-based link is
introduced later (for example in SMS notifications), it should supplement this rather
than replace it.

## COD anti-fraud

Future-ready architecture should support:

- Phone verification
- Suspicious-order flagging
- Duplicate/repeated order detection

## Cancellation

Cancellation rules should be configurable. The intended direction is that cancellation is easier before shipment and restricted after shipment.

## Returns/refunds

The data model and order state machine should allow future return/refund workflows without a major redesign.

---

# 22. Homepage Blueprint

The homepage should be curated rather than overloaded with random product grids.

Recommended structure:

```text
Large Cinematic Hero
 ↓
Collections Showcase
 ↓
Promotional / Sale Section
 ↓
Featured Product / Collection
 ↓
Additional Curated Content
 ↓
Final Brand CTA
```

Final CTA concept:

**Discover More. Live Better.**

## Cinematic direction

The visual behavior is inspired by the feeling of premium product sites such as Beats, but must be an original Zavyaan implementation.

Desired rhythm:

```text
Text enters
 ↓
Visual/banner moves into focus
 ↓
Section settles
 ↓
Next section reveals
```

Advanced cinematic scrolling is intentionally deferred to Phase 10.

## Admin control

Eventually Admin should be able to manage:

- Hero banner
- Hero text
- CTA
- Collection sections
- Section order
- Show/hide sections
- Sale banners
- Featured products
- Collection imagery

Routine homepage merchandising should not require code changes.

---

# 23. Animation Rules

Use restrained, purposeful motion:

- Fade-in
- Slide-up
- Staggered cards
- Image zoom
- Button transitions
- Mega-menu transitions
- Section reveal
- Loading skeletons

Avoid:

- Animating everything
- Excessive bouncing
- Slow transitions
- Delaying content unnecessarily
- Heavy mobile animation

Support `prefers-reduced-motion`.

---

# 24. SEO Blueprint

Support on relevant pages:

- SEO title
- Meta description
- Clean slug
- Canonical URL
- Heading hierarchy
- Image alt text
- Social metadata

Technical SEO:

- Sitemap
- Robots.txt
- Canonicals
- Structured data/schema
- 404 handling
- Redirect handling

Product pages should support appropriate Product structured data.

---

# 25. Performance Blueprint

Use:

- Optimized images
- Responsive image sizes
- Lazy loading
- Explicit dimensions where useful
- Efficient API requests
- Caching where appropriate
- Debounced search
- Skeleton loading
- Lazy loading/code splitting where useful

The goal is not merely a Lighthouse score. The goal is a fast, smooth real-world experience.

---

# 26. Security Blueprint

Required areas:

- Secure password hashing
- Secure sessions/cookies
- Protected routes
- Server-side authorization
- Input validation
- Rate limiting
- Correct CORS configuration
- CSRF protection where applicable
- Environment secrets
- Secure error handling
- Database access controls
- No secrets in source code
- No passwords in logs
- No sensitive data in frontend bundles

---

# 27. Phase B — Customer Website Implementation

Phase B is customer-facing implementation only.

Do **not** use Phase B to rebuild the admin panel or implement full vendor/finance/inventory/payment-gateway/courier systems.

Do not intentionally expand Phase B into:

- Full admin rebuild
- Full vendor system
- Full finance system
- Full inventory management
- Real payment gateway integration
- Courier integration
- Advanced reviews
- Advanced notifications
- Final cinematic animation system
- Production deployment

Clean integration points may be created when needed.

---

# 28. B1 — Customer Frontend Architecture

Create a clean modular customer frontend.

Target concepts:

```text
customer/
├── pages/
├── components/
├── services/
├── state/
├── utils/
└── customer-app.js
```

Separate:

- Pages
- Reusable UI components
- API/service logic
- State
- Utilities

Do not scatter API calls throughout UI files.

---

# 29. B2 — Header & Navigation

Desktop:

- Zavyaan logo
- Home
- Shop
- Categories
- Deals
- Search
- Account
- Cart

Use a professional mega menu where appropriate.

Mobile:

- Logo
- Hamburger
- Search
- Cart
- Mobile navigation drawer

Navigation must remain clean and fast.

---

# 30. B3 — Shop & Category System

Shop page requirements:

- All products
- Search
- Category filter
- Subcategory filter
- Price range
- Newest
- Price low → high
- Price high → low
- Popular
- Discount
- Pagination/load more
- Product count
- Loading state
- Empty state
- Error state

Category pages should use reusable dynamic templates rather than duplicated pages.

Expected category concepts:

```text
/category/fashion
/category/jewellery
/category/kids-toys
/category/beauty-personal-care
/category/home-living
/category/electronics-accessories
/category/bags-accessories
/category/deals
```

Actual routing should follow the architecture adopted during implementation.

---

# 31. B4 — Product Detail Page

Required:

- Product title
- Product gallery
- Main image
- Additional images
- Gallery navigation
- Zoom/lightbox where appropriate
- Brand
- Rating/review placeholder where needed
- Original price
- Sale price
- Discount
- Stock status
- Quantity
- Variants
- Colors
- Sizes
- SKU
- Add to Cart
- Buy Now
- Description
- Key Features
- Delivery information
- Return information
- Related products

Products with no variants must work naturally.

---

# 32. B5 — Cart

Support:

- Guest cart
- Logged-in customer cart

Display:

- Product image
- Product name
- Variant
- Quantity
- Unit price
- Discount
- Subtotal
- Remove

Summary:

- Subtotal
- Discount
- Delivery
- Total

Guest cart must work without registration.

Backend remains authoritative for final totals.

---

# 33. B6 — Checkout

Guest checkout:

- Name
- Phone
- Email
- Address
- City
- Area
- Postal code where useful
- Additional delivery details

Logged-in checkout:

- Saved information auto-fill
- Editable details
- Saved addresses

Payment UI:

- COD
- Advance payment
- Rs.100 advance-payment discount

Do not fake payment gateway behavior.

Create clean integration points for future gateways.

---

# 34. B7 — Customer Account

Pages/flows:

- Login
- Register
- Forgot Password
- Reset Password
- Profile
- Change Password
- Saved Addresses
- Orders
- Order Details
- Logout

Customer can remain signed in across multiple devices.

Do not implement the admin one-device rule here.

---

# 35. B8 — Responsive & UX Polish

Support:

- Desktop
- Laptop
- Tablet
- Mobile

Ensure:

- No horizontal overflow
- Touch-friendly controls
- Correct image sizing
- Responsive forms
- Mobile-friendly filters
- Responsive product grids
- Responsive checkout
- Correct loading/error/empty states

Accessibility:

- Semantic HTML
- Keyboard navigation
- Focus states
- Proper labels
- Alt text
- Reduced motion

---

# 36. B9 — Visual System & Customer Experience

Apply the Zavyaan design system consistently:

- Black
- White
- Restrained gold
- Warm neutrals
- Consistent typography
- Consistent spacing
- Reusable buttons
- Reusable cards
- Reusable forms
- Reusable badges
- Reusable price displays

The customer experience should feel premium without becoming heavy or slow.

---

# 37. Phase B Supporting Requirements

## Centralized API/service layer

Use centralized services for concepts such as:

- Products
- Categories
- Collections
- Cart
- Orders
- Authentication
- Customer data

Exact naming can follow the implementation.

## State management

Manage only necessary shared state, including:

- Current customer
- Authentication state
- Cart
- Search
- Filters
- Current product
- Checkout state

Avoid unnecessary global state.

## Search

Search should support relevant product fields and use debouncing to prevent excessive API requests.

## Loading/error/empty states

Reusable states should cover:

- Product loading
- API errors
- No search results
- Empty cart
- No orders
- No addresses

Never expose server stack traces to customers.

---

# 38. Phase B Scope Discipline

If a required backend capability is not yet available:

1. Identify the missing API.
2. Reuse existing functionality if appropriate.
3. Create a clean integration point.
4. Document the dependency.
5. Do not pretend the backend is production-complete.

Frontend calculations are display helpers only.

Backend validates final:

- Price
- Stock
- Discount
- Delivery
- Total
- Payment
- Order

---

# 39. Phase B Verification Checklist

## Functional

- Homepage works
- Navigation works
- Shop works
- Search works
- Filters work
- Sorting works
- Categories work
- Collections work
- Product pages work
- Variants work
- Cart works
- Guest cart works
- Checkout UI works
- Customer account integration points work

## Technical

- No console errors
- No broken routes
- No unnecessary API requests
- No exposed secrets
- No unnecessary dependencies
- Existing useful functionality is not unnecessarily broken
- Admin is not unintentionally damaged

## Responsive

Test desktop, tablet, and mobile.

## Documentation

Document:

- What changed
- Architecture
- APIs used
- APIs still required
- Deferred work
- Known issues

---

# 40. Later Phase Details

## Phase C — Database

Build the full production database in controlled migrations:

1. Customers
2. Addresses
3. Auth sessions
4. Collections
5. Product enhancements
6. Orders
7. Payments
8. Shipping
9. Inventory
10. Vendors
11. Purchases
12. Expenses
13. Finance
14. Admin sessions
15. Permissions
16. Activity logs
17. Coupons/future-ready tables

## Phase D — Backend/API

Implement business-domain modules and enforce:

- Authentication
- Authorization
- Validation
- Stock rules
- Price rules
- Order creation
- Payment rules
- Vendor payable logic
- Finance calculations
- Activity logging

## Phase E — Admin Rebuild

Rebuild the rough current admin UI according to the finalized requirements. Do not preserve a poor structure simply because it already exists.

## Phase F — Product Management

Complete variants, images, pricing, inventory, collections, CSV import/export, bulk actions, SEO, validation, and archive workflows.

## Phase G — Cart / Checkout / Orders

Complete guest/customer carts, checkout, COD, advance payment, Rs.100 discount, payments, shipping, order lifecycle, tracking, cancellation, returns, refunds, and COD fraud controls.

## Phase H — Inventory / Vendors / Finance

Complete stock, stock history, purchases, vendor payments, payables, expenses, revenue, costs, profit, and reporting.

## Phase I — Customer Accounts

Finalize secure authentication, multiple simultaneous devices, sessions, profile, addresses, orders, password changes, password reset, and logout.

## Phase J — Advanced Homepage

Implement cinematic storytelling, scroll-based transitions, collection visual movement, promotional storytelling, responsive behavior, reduced-motion fallback, and performance optimization.

## Phase K — SEO / Performance / Security

Final production hardening including SEO, schema, sitemap, canonical URLs, optimized media, caching, rate limiting, secure sessions, input validation, monitoring, backups, and recovery.

## Phase L — Testing

Full QA across customer, admin, database, API, orders, inventory, finance, authentication, permissions, security, responsiveness, browsers, and performance.

## Phase M — Deployment / Handover

Finalize GitHub source, Render configuration, production PostgreSQL, environment variables, migrations, backups, recovery, monitoring, documentation, and admin/developer handover.

---

# 41. Master Business Rules

1. Customer accounts are optional.
2. Guest checkout must work.
3. Customers may use multiple devices simultaneously.
4. Customer and admin authentication are separate.
5. Admin accounts allow one active device/session per account.
6. Admin inactivity timeout is 5 minutes.
7. Owner has full admin access.
8. Partner permissions are configurable.
9. Customer passwords are securely hashed.
10. Passwords are never stored in plaintext.
11. Advance payment receives Rs.100 discount.
12. Backend is authoritative for final price, stock, discount, delivery, total, payment and order validation.
13. Historical order prices/costs remain unchanged.
14. Products may belong to multiple collections.
15. Subcategories are dynamic.
16. Products should normally be archived rather than permanently deleted.
17. Guest order tracking must be secure.
18. Vendor payables maintain payment history.
19. Revenue and profit are distinct concepts.
20. Future payment/courier integrations must be possible without a major architecture rewrite.

---

# 42. Testing Philosophy

Use:

```text
Build
 ↓
Test
 ↓
Fix
 ↓
Retest
 ↓
Approve
```

Test critical business rules explicitly:

- Stock reduction
- Insufficient stock
- Duplicate orders
- Price changes
- Discounts
- Delivery charges
- Vendor cost
- Profit
- Cancellation
- Returns
- Refunds
- Permissions
- Session handling

Bug priority:

- Critical
- High
- Medium
- Low

---

# 43. Deployment

Target:

```text
GitHub
 ↓
Render
 ↓
Production Application
 ↓
Production PostgreSQL
```

Production must use appropriate resources, backups, secure environment variables, database migrations, and recovery procedures.

Do not treat the current free Render database as a permanent production solution.

---

# 44. Documentation Requirements

Maintain documentation for:

## Architecture

- Overall architecture
- Module responsibilities
- Data flow

## Setup

- Local development
- Dependencies
- Environment variables

## Database

- Entities
- Relationships
- Migrations

## Backend

- API routes
- Authentication
- Business logic

## Frontend

- Pages
- Components
- Services
- Design system

## Admin

- Features
- Permissions
- Workflows

## Deployment

- GitHub
- Render
- Database
- Environment configuration

## Maintenance

- Backups
- Restore
- Logs
- Troubleshooting

---

# 45. Handover Package

A future developer/team should receive:

- Source code
- GitHub repository
- Database documentation
- Migration documentation
- Deployment documentation
- `.env.example`
- API documentation
- Admin guide
- Architecture documentation
- Backup/recovery procedure
- Known issues
- Maintenance instructions

Secrets must never be committed or documented as plaintext.

---

# 46. Current Project Status

## Implemented 2026-09-15

See `docs/CHANGELOG-2026-09-15.md` for detail and verification.

- Order creation fixed (was failing outright on an undefined variable).
- Backend made authoritative for price, variant, stock, discount, delivery and total
  (Rule 12 / section 38). Client-supplied prices and discounts are now ignored.
- Stock validated at checkout and decremented on order.
- Cost snapshotted onto order lines (Rule 13).
- Guest tracking secured behind phone verification (Rule 17 / section 21).
- Full order status lifecycle implemented, including Packed, Out for Delivery, Refunded.
- Brand logo, favicons and social metadata applied; responsive header verified.

## Planning finalized

- Project vision
- Brand identity
- Color system
- Categories
- Collections concept
- Customer website requirements
- Database blueprint
- Backend/API blueprint
- Admin requirements
- Product management requirements
- Cart/checkout/order requirements
- Inventory/vendor/finance requirements
- Customer authentication requirements
- Homepage direction
- SEO/performance/security requirements
- Testing requirements
- Deployment/documentation requirements
- Phase A audit
- Phase A architecture
- Phase B plan
- B1–B9 scope

## Not yet fully production implemented

Still true as of 2026-09-15. Of these, the most pressing are that **admin endpoints are
unauthenticated** (`/api/admin/stats` is public) and that **collections exist only as
client-side definitions**, so Rule 14 is not yet met.

- Complete production database architecture
- Full backend modular architecture
- Production authentication
- Rebuilt admin panel
- Full inventory/vendor/finance systems
- Real payment gateway integrations
- Courier integrations
- Final cinematic homepage
- Final SEO/security hardening
- Full QA
- Production deployment
- Final handover documentation

---

# 47. Immediate Implementation Sequence

```text
Phase A — Master Architecture
        ↓
Phase B — Customer Website
        ↓
Phase C — Database
        ↓
Phase D — Backend/API
        ↓
Phase E — Admin Rebuild
        ↓
Phase F — Product Management
        ↓
Phase G — Cart/Checkout/Orders
        ↓
Phase H — Inventory/Vendors/Finance
        ↓
Phase I — Customer Accounts
        ↓
Phase J — Advanced Homepage
        ↓
Phase K — SEO/Performance/Security
        ↓
Phase L — Testing
        ↓
Phase M — Deployment/Handover
```

---

# 48. Source-of-Truth Rule

This document is the master project reference.

Whenever a project requirement is intentionally changed or newly finalized, update this document.

Before making major architectural decisions, a future developer or AI agent should read this document and check the relevant phase and business rules.

Do not silently contradict a finalized requirement. If a technical decision conflicts with an existing rule, explicitly identify the conflict and obtain approval before changing the rule.

---

# 49. Items Still TBD

The following should be finalized during the relevant implementation phase rather than invented prematurely:

- Exact frontend framework/build tooling, if one is ever introduced
- Exact font families
- Exact partner permission matrix
- Exact delivery/courier provider
- Exact payment gateway providers and integration method
- Exact tax rules if applicable
- Exact return/refund policy wording
- Exact cancellation window
- Exact product review system
- Exact notification providers
- Exact image/file storage provider
- Exact production Render plan
- Exact monitoring/analytics provider

These TBD items must remain compatible with the master architecture.

---

# 50. Final Definition of Done

Zavyaan should only be considered production-ready when:

- Customer shopping flow is complete
- Guest checkout works
- Customer authentication is secure
- Admin authentication is secure
- Admin permissions work server-side
- Products/variants/images/pricing work correctly
- Inventory is reliable
- Orders are reliable
- Payment records are reliable
- Shipping/tracking is reliable
- Vendor purchases/payables work
- Finance/profit calculations are backend-authoritative
- Homepage is polished and editable
- SEO is implemented
- Security is hardened
- Responsive behavior is verified
- Critical business logic is tested
- Production database has backups/recovery
- Deployment is documented
- Admin operations are documented
- Developer handover is complete

**Zavyaan is a real system, not just a storefront. The architecture, business logic, data integrity, security, maintainability, and handover quality are as important as the visual design.**
