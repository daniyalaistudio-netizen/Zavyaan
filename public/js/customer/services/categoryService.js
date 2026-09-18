// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — CATEGORY SERVICE
// ==========================================================

const CategoryService = {
  // Fetch active categories and subcategories
  async getCategories() {
    const res = await (window.ApiClient || window.API).request('/categories');
    return res.categories || [];
  },

  // Fetch single category by slug or id
  // Returns null for unknown or admin-disabled categories (API answers 404)
  async getCategory(slugOrId) {
    try {
      const res = await (window.ApiClient || window.API).request(`/categories/${encodeURIComponent(slugOrId)}`);
      return res.category || null;
    } catch (err) {
      if (/not found/i.test(err.message)) return null;
      throw err;
    }
  }
};

window.CategoryService = CategoryService;
