// ==========================================================
// ZAVYAAN CUSTOMER PAGES — CATEGORY PAGE
// Reusable category template with subcategory pills and dynamic product catalog
// ==========================================================

const CategoryPage = {
  async render(container, slug, urlParams = new URLSearchParams()) {
    container.innerHTML = `
      <div class="container section-padding">
        ${StateComponents.renderProductGridSkeleton(6)}
      </div>
    `;

    try {
      const selectedSub = urlParams.get('sub') || null;
      const sort = urlParams.get('sort') || 'newest';

      const [cat, { products }] = await Promise.all([
        CategoryService.getCategory(slug),
        ProductService.getProducts({
          category: slug,
          subcategory: selectedSub,
          sort: sort,
          limit: 50
        })
      ]);

      if (!cat) {
        container.innerHTML = StateComponents.renderEmptyState(
          'Category Not Found',
          'The category you are looking for does not exist or has been retired.',
          `<a href="#shop" class="btn btn-primary">Browse All Categories</a>`
        );
        return;
      }

      const activeSubs = (cat.subcategories || []).filter(s => s.is_active !== false);

      container.innerHTML = `
        <div class="container section-padding">
          <!-- CATEGORY HEADER BANNER -->
          <div style="background-color: var(--color-rich-black); border-radius: var(--radius-sm); padding: 40px; color: var(--color-pure-white); margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border: 1px solid rgba(198,161,91,0.25);">
            <div>
              <span class="badge badge-sale" style="margin-bottom: 12px;">Category Showcase</span>
              <h1 style="font-size: 2.4rem; color: var(--color-pure-white); margin-bottom: 8px;">${Utils.escapeHtml(cat.name)}</h1>
              <p style="color: #BDBDBD; font-size: 0.92rem; max-width: 540px; line-height: 1.6;">${Utils.escapeHtml(cat.description || 'Explore curated selections with Cash on Delivery nationwide.')}</p>
            </div>
            ${cat.image_url ? `<img src="${cat.image_url}" alt="${Utils.escapeHtml(cat.name)}" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-gold-primary);">` : ''}
          </div>

          <!-- SUBCATEGORY PILLS -->
          ${activeSubs.length > 0 ? `
            <div class="subcat-pills-row">
              <a href="#category/${cat.slug}" class="subcat-pill ${!selectedSub ? 'active' : ''}">
                All ${Utils.escapeHtml(cat.name)}
              </a>
              ${activeSubs.map(s => `
                <a href="#category/${cat.slug}?sub=${s.slug}" class="subcat-pill ${selectedSub === s.slug ? 'active' : ''}">
                  ${Utils.escapeHtml(s.name)}
                </a>
              `).join('')}
            </div>
          ` : ''}

          <!-- TOOLBAR -->
          <div class="shop-toolbar">
            <div style="font-size: 0.88rem; color: var(--color-text-secondary);">
              Showing <strong>${products.length}</strong> items in ${Utils.escapeHtml(cat.name)}
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <label for="cat-sort" style="font-size: 0.85rem; font-weight: 600;">Sort By:</label>
              <select id="cat-sort" class="shop-sort-select" onchange="CategoryPage.handleSortChange('${cat.slug}', this.value)">
                <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest Arrivals</option>
                <option value="price_low" ${sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
                <option value="price_high" ${sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
                <option value="bestseller" ${sort === 'bestseller' ? 'selected' : ''}>Best Sellers</option>
              </select>
            </div>
          </div>

          <!-- PRODUCT GRID -->
          ${products.length > 0 ? `
            <div class="product-grid">
              ${products.map(p => ProductCard.render(p)).join('')}
            </div>
          ` : StateComponents.renderEmptyState(
            `No products found in this selection`,
            'New inventory is added regularly with nationwide Cash on Delivery.',
            `<a href="#shop" class="btn btn-primary">Browse Other Products</a>`
          )}
        </div>
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, `CategoryPage.render(document.getElementById('app-main'), '${slug}')`);
    }
  },

  handleSortChange(slug, sortVal) {
    const [base, query] = location.hash.split('?');
    const params = new URLSearchParams(query || '');
    params.set('sort', sortVal);
    location.hash = `${base}?${params.toString()}`;
  }
};

window.CategoryPage = CategoryPage;
