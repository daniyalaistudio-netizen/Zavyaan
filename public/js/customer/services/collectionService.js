// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — COLLECTION SERVICE
// Marketing collections distinct from product taxonomy categories.
// Definitions live in store settings (admin-editable); each collection is a
// saved /api/products query, so a product can appear in several.
// ==========================================================

const CollectionService = {
  // All collections the owner has enabled, in display order
  async getCollections() {
    return SettingsService.getCollections();
  },

  // Collection metadata by slug (disabled collections resolve to null so the
  // page can show "not found" rather than a stale marketing page)
  async getCollectionMeta(slug) {
    const all = await this.getCollections();
    return all.find(c => c.slug === slug) || null;
  },

  // Products for a collection
  async getCollectionProducts(slug, limit = 40) {
    const meta = await this.getCollectionMeta(slug);
    if (!meta) return { products: [], count: 0 };
    return ProductService.getProducts({ ...(meta.filter || {}), limit });
  }
};

window.CollectionService = CollectionService;
