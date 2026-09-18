// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — STORE SETTINGS
// Payment methods, homepage promo banners and collections as configured
// by the store owner in the admin panel (GET /api/settings).
// ==========================================================

const SettingsService = {
  _cache: null,
  _inflight: null,

  // Storefront settings: only enabled methods/banners/collections come back.
  async getSettings(force = false) {
    if (this._cache && !force) return this._cache;
    if (this._inflight && !force) return this._inflight;

    this._inflight = (window.ApiClient || window.API).request('/settings')
      .then(res => {
        this._cache = res.settings || this.fallback();
        return this._cache;
      })
      .catch(() => {
        this._cache = this.fallback();
        return this._cache;
      })
      .finally(() => { this._inflight = null; });

    return this._inflight;
  },

  // Drop the cache after the admin saves so the storefront reflects it on the
  // next page render without a reload.
  invalidate() {
    this._cache = null;
  },

  async getPaymentMethods() {
    const s = await this.getSettings();
    return (s.payment_methods || []).filter(m => m.enabled !== false);
  },

  async getPromoBanners() {
    const s = await this.getSettings();
    return (s.promo_banners || []).filter(b => b.enabled !== false);
  },

  async getCollections() {
    const s = await this.getSettings();
    return (s.collections || []).filter(c => c.enabled !== false);
  },

  // Human label for a stored payment code (order confirmation, tracking,
  // account history). Falls back to a readable version of the code itself.
  paymentLabel(code) {
    const known = { COD: 'Cash on Delivery (COD)', ADVANCE: 'Advance Payment', EASYPAISA: 'Easypaisa', JAZZCASH: 'JazzCash', BANK_TRANSFER: 'Bank Transfer' };
    const fromSettings = this._cache && (this._cache.payment_methods || []).find(m => m.code === code);
    if (fromSettings) return fromSettings.label;
    if (known[code]) return known[code];
    return String(code || 'Cash on Delivery').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  },

  // Used only when the API is unreachable so the storefront still renders.
  fallback() {
    return {
      payment_methods: [
        { code: 'COD', label: 'Cash on Delivery (COD)', description: 'Pay in cash when your parcel arrives.', instructions: '', discount: 0, enabled: true }
      ],
      promo_banners: [],
      collections: [],
      homepage: { show_collections: true, collections_limit: 8, show_promo_banners: true, show_featured: true, featured_title: 'Featured Highlights', featured_tagline: 'Handpicked by Zavyaan', featured_limit: 8 }
    };
  }
};

window.SettingsService = SettingsService;
