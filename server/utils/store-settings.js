// ==========================================================
// ZAVYAAN — STORE SETTINGS DEFAULTS
// ==========================================================
// Admin-editable storefront configuration: payment methods, homepage
// promotional banners and marketing collections. Persisted through
// db.getSettings() / db.saveSettings(); these are the values a fresh
// store starts with and the shape every consumer can rely on.
//
// Payment methods are ordered; `enabled` controls whether the method is
// offered at checkout and accepted by POST /api/orders. `discount` is the
// flat PKR amount taken off the order total when the method is chosen.
// Online methods (Easypaisa, JazzCash, bank transfer) are manual transfers
// with proof sent over WhatsApp — there is no gateway integration, so they
// ship disabled ("unlinked") until the owner adds account details and
// switches them on. Blueprint section 21: no fake gateway integrations.
// ==========================================================

const DEFAULT_PAYMENT_METHODS = [
  {
    code: 'COD',
    label: 'Cash on Delivery (COD)',
    description: 'Pay comfortably in cash directly to the courier rider upon parcel arrival at your doorstep.',
    instructions: '',
    discount: 0,
    enabled: true,
    locked: false
  },
  {
    code: 'ADVANCE',
    label: 'Advance Payment',
    description: 'Pay in advance via bank transfer and get a discount on your total order amount.',
    instructions: 'Bank transfer details are shared on the order confirmation page. Send your payment proof on WhatsApp to confirm dispatch.',
    discount: 100,
    enabled: true,
    locked: false
  },
  {
    code: 'EASYPAISA',
    label: 'Easypaisa',
    description: 'Transfer to our Easypaisa account and share the receipt on WhatsApp.',
    instructions: 'Easypaisa account details will be shared after you place your order.',
    discount: 100,
    enabled: false,
    locked: false
  },
  {
    code: 'JAZZCASH',
    label: 'JazzCash',
    description: 'Transfer to our JazzCash account and share the receipt on WhatsApp.',
    instructions: 'JazzCash account details will be shared after you place your order.',
    discount: 100,
    enabled: false,
    locked: false
  },
  {
    code: 'BANK_TRANSFER',
    label: 'Bank Transfer (Raast / IBFT)',
    description: 'Direct transfer to our bank account from any Pakistani bank.',
    instructions: 'Bank account details will be shared after you place your order.',
    discount: 100,
    enabled: false,
    locked: false
  }
];

const DEFAULT_PROMO_BANNERS = [
  {
    id: 'banner-sale',
    kind: 'sale',
    tag: 'Limited Time Sale',
    heading: 'Up to 50% OFF Deals & Offers',
    description: 'Hand-picked markdowns across fashion, jewellery, gadgets and home living. While stock lasts.',
    cta_text: 'Shop the Sale',
    cta_link: '#category/deals-offers',
    theme: 'dark',
    enabled: true
  },
  {
    id: 'banner-collection',
    kind: 'collection',
    tag: 'Featured Collection',
    heading: 'Artisanal Jewellery Collection',
    description: '22K gold-plated Kundan sets, bridal earrings and statement rings crafted for festive seasons.',
    cta_text: 'Explore the Collection',
    cta_link: '#collection/jewellery',
    theme: 'ivory',
    enabled: true
  },
  {
    id: 'banner-offer',
    kind: 'offer',
    tag: 'Checkout Offer',
    heading: 'Rs. 100 OFF with Advance Payment',
    description: 'Pay in advance and save Rs. 100 on any order. Free delivery nationwide on orders over Rs. 2,500.',
    cta_text: 'Start Shopping',
    cta_link: '#shop',
    theme: 'gold',
    enabled: true
  }
];

// Marketing collections (blueprint section 5). `filter` maps onto the
// /api/products query so a collection is a saved product query, not a
// duplicate category.
// One collection per store category, in navigation order. Each shows that
// category's products; the admin can rename, re-image, reorder, hide or add
// more from Admin → Storefront & Payments.
const DEFAULT_COLLECTIONS = [
  {
    slug: 'fashion',
    title: 'Fashion',
    subtitle: 'Apparel & Accessories',
    description: 'Trendy & premium Pakistani apparel, footwear and modern accessories.',
    image_url: 'assets/images/product_fashion_kurti_1787668675195.jpg',
    filter: { category: 'fashion' },
    enabled: true
  },
  {
    slug: 'jewellery',
    title: 'Jewellery',
    subtitle: 'Bridal & Festive',
    description: 'Exquisite bridal sets, Kundan necklaces, gold-plated rings, earrings & watches.',
    image_url: 'assets/images/product_jewellery_set_1787668697922.jpg',
    filter: { category: 'jewellery' },
    enabled: true
  },
  {
    slug: 'kids-toys',
    title: 'Kids & Toys',
    subtitle: 'Play & Learn',
    description: 'Educational STEM toys, baby care, remote control cars & playful adventures.',
    image_url: 'assets/images/product_kids_robot_1787668748049.jpg',
    filter: { category: 'kids-toys' },
    enabled: true
  },
  {
    slug: 'beauty-personal-care',
    title: 'Beauty & Personal Care',
    subtitle: 'Skincare & Fragrance',
    description: 'Organic skincare serums, hair care, cosmetics and luxury fragrances.',
    image_url: 'assets/images/product_beauty_serum_1787668795039.jpg',
    filter: { category: 'beauty-personal-care' },
    enabled: true
  },
  {
    slug: 'home-living',
    title: 'Home & Living',
    subtitle: 'Decor & Lighting',
    description: 'Aesthetic room decor, warm ambient lighting, kitchenware & organizers.',
    image_url: 'assets/images/product_home_lamp_1787668839199.jpg',
    filter: { category: 'home-living' },
    enabled: true
  },
  {
    slug: 'electronics-accessories',
    title: 'Electronics & Accessories',
    subtitle: 'Smart Gadgets',
    description: 'Smart watches, wireless ANC earbuds, high-speed fast chargers & gadgets.',
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
    filter: { category: 'electronics-accessories' },
    enabled: true
  },
  {
    slug: 'bags-accessories',
    title: 'Bags & Accessories',
    subtitle: 'Handbags & Travel',
    description: 'Designer vegan leather handbags, backpacks, wallets and travel gear.',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
    filter: { category: 'bags-accessories' },
    enabled: true
  },
  {
    slug: 'deals-offers',
    title: 'Deals & Offers',
    subtitle: 'Limited Time',
    description: 'Hand-picked markdowns across every category. While stock lasts.',
    image_url: 'assets/images/zavyaan_hero_banner_1787668655303.jpg',
    filter: { category: 'deals-offers' },
    enabled: true
  }
];

// Printed on address sheets / packing slips and available to the storefront.
const DEFAULT_STORE = {
  name: 'Zavyaan',
  tagline: 'Discover More. Live Better.',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  slip_note: 'Thank you for your purchase!',
  slip_show_items: true,
  slip_show_amount: true
};

const DEFAULT_SETTINGS = {
  store: DEFAULT_STORE,
  payment_methods: DEFAULT_PAYMENT_METHODS,
  promo_banners: DEFAULT_PROMO_BANNERS,
  collections: DEFAULT_COLLECTIONS,
  homepage: {
    show_collections: true,
    collections_limit: 8,
    show_promo_banners: true,
    show_featured: true,
    featured_title: 'Featured Highlights',
    featured_tagline: 'Handpicked by Zavyaan',
    featured_limit: 8
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// Merge a stored/partial settings object over the defaults so callers never
// see a missing key, even after new settings are added in a later release.
function withDefaults(stored) {
  const base = clone(DEFAULT_SETTINGS);
  if (!stored || typeof stored !== 'object') return base;

  const out = { ...base, ...stored };
  out.homepage = { ...base.homepage, ...(stored.homepage || {}) };
  out.store = { ...base.store, ...(stored.store || {}) };

  // Arrays replace wholesale, but every payment method must exist so the
  // checkout and order validation can always find COD/ADVANCE by code.
  if (Array.isArray(stored.payment_methods)) {
    const incoming = stored.payment_methods
      .filter(m => m && typeof m.code === 'string' && m.code.trim())
      .map(m => ({ ...m, code: m.code.trim().toUpperCase() }));
    const byCode = Object.fromEntries(incoming.map(m => [m.code, m]));
    out.payment_methods = base.payment_methods.map(def => ({ ...def, ...(byCode[def.code] || {}) }));
    // Preserve any custom methods the admin added that are not in the defaults.
    incoming
      .filter(m => !base.payment_methods.some(d => d.code === m.code))
      .forEach(m => out.payment_methods.push({ ...base.payment_methods[1], ...m }));
  }
  if (!Array.isArray(stored.promo_banners)) out.promo_banners = base.promo_banners;
  if (!Array.isArray(stored.collections)) out.collections = base.collections;

  return out;
}

// A collection filter maps 1:1 onto /api/products query params; keep only the
// keys the storefront understands so arbitrary objects cannot be stored.
function sanitizeCollectionFilter(f) {
  if (!f || typeof f !== 'object') return { sort: 'newest' };
  const out = {};
  if (typeof f.category === 'string' && f.category.trim()) out.category = f.category.trim().slice(0, 64);
  if (typeof f.subcategory === 'string' && f.subcategory.trim()) out.subcategory = f.subcategory.trim().slice(0, 64);
  if (f.trending) out.trending = true;
  if (f.featured) out.featured = true;
  if (f.bestseller) out.bestseller = true;
  if (typeof f.sort === 'string' && ['newest', 'price_low', 'price_high', 'name_asc'].includes(f.sort)) out.sort = f.sort;
  return Object.keys(out).length ? out : { sort: 'newest' };
}

// Normalise an incoming admin payload so bad types cannot reach the store.
function sanitize(input) {
  const s = withDefaults(input);

  s.payment_methods = s.payment_methods
    .filter(m => m && typeof m.code === 'string' && m.code.trim())
    .map(m => ({
      code: String(m.code).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32),
      label: String(m.label || m.code).slice(0, 80),
      description: String(m.description || '').slice(0, 300),
      instructions: String(m.instructions || '').slice(0, 600),
      discount: Math.max(0, Math.floor(Number(m.discount) || 0)),
      enabled: Boolean(m.enabled),
      locked: Boolean(m.locked)
    }));

  s.promo_banners = s.promo_banners
    .filter(b => b && typeof b === 'object')
    .slice(0, 6)
    .map((b, i) => ({
      id: String(b.id || `banner-${i + 1}`).slice(0, 48),
      kind: ['sale', 'collection', 'offer'].includes(b.kind) ? b.kind : 'offer',
      tag: String(b.tag || '').slice(0, 60),
      heading: String(b.heading || '').slice(0, 120),
      description: String(b.description || '').slice(0, 300),
      cta_text: String(b.cta_text || 'Shop Now').slice(0, 40),
      cta_link: String(b.cta_link || '#shop').slice(0, 200),
      theme: ['dark', 'ivory', 'gold'].includes(b.theme) ? b.theme : 'dark',
      enabled: Boolean(b.enabled)
    }));

  s.collections = s.collections
    .filter(c => c && typeof c.slug === 'string' && c.slug.trim())
    .slice(0, 12)
    .map(c => ({
      slug: String(c.slug).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 64),
      title: String(c.title || c.slug).slice(0, 80),
      subtitle: String(c.subtitle || '').slice(0, 80),
      description: String(c.description || '').slice(0, 300),
      image_url: String(c.image_url || '').slice(0, 500),
      filter: sanitizeCollectionFilter(c.filter),
      enabled: Boolean(c.enabled)
    }));

  const st = s.store || {};
  s.store = {
    name: String(st.name || 'Zavyaan').slice(0, 80),
    tagline: String(st.tagline || '').slice(0, 120),
    phone: String(st.phone || '').slice(0, 40),
    whatsapp: String(st.whatsapp || '').slice(0, 40),
    email: String(st.email || '').slice(0, 120),
    website: String(st.website || '').slice(0, 120),
    address: String(st.address || '').slice(0, 300),
    slip_note: String(st.slip_note || '').slice(0, 160),
    slip_show_items: st.slip_show_items !== false,
    slip_show_amount: st.slip_show_amount !== false
  };

  s.homepage = {
    show_collections: Boolean(s.homepage.show_collections),
    collections_limit: Math.min(12, Math.max(1, Math.floor(Number(s.homepage.collections_limit) || 3))),
    show_promo_banners: Boolean(s.homepage.show_promo_banners),
    show_featured: Boolean(s.homepage.show_featured),
    featured_title: String(s.homepage.featured_title || 'Featured Highlights').slice(0, 80),
    featured_tagline: String(s.homepage.featured_tagline || '').slice(0, 80),
    featured_limit: Math.min(24, Math.max(1, Math.floor(Number(s.homepage.featured_limit) || 8)))
  };

  return s;
}

module.exports = { DEFAULT_SETTINGS, withDefaults, sanitize, clone };
