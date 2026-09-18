// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — PRODUCT SERVICE
// ==========================================================

const ProductService = {
  // Fetch products with search, category, subcategory, price, sorting & pagination
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.subcategory) query.append('subcategory', params.subcategory);
    if (params.search) query.append('search', params.search);
    if (params.minPrice) query.append('min_price', params.minPrice);
    if (params.maxPrice) query.append('max_price', params.maxPrice);
    if (params.featured) query.append('featured', 'true');
    if (params.bestseller) query.append('bestseller', 'true');
    if (params.trending) query.append('trending', 'true');
    if (params.sort) query.append('sort', params.sort);
    if (params.limit) query.append('limit', params.limit);
    if (params.offset) query.append('offset', params.offset);

    const res = await (window.ApiClient || window.API).request(`/products?${query.toString()}`);
    return {
      products: res.products || [],
      count: res.count || (res.products ? res.products.length : 0)
    };
  },

  // Fetch single product by ID or Slug
  async getProduct(idOrSlug) {
    const res = await (window.ApiClient || window.API).request(`/products/${encodeURIComponent(idOrSlug)}`);
    return {
      product: res.product || null,
      relatedProducts: res.relatedProducts || []
    };
  },

  // Featured highlights for homepage
  async getFeaturedProducts(limit = 8) {
    return this.getProducts({ featured: true, limit });
  },

  // Best sellers for homepage
  async getBestSellers(limit = 8) {
    return this.getProducts({ bestseller: true, limit });
  }
};

window.ProductService = ProductService;
