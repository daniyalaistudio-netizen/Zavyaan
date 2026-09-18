// ==========================================================
// ZAVYAAN CUSTOMER PAGES — SHOP CATALOG
// Dynamic categories, subcategories, price filters, sorting, and search
// ==========================================================

const ShopPage = {
  async render(container, urlParams = new URLSearchParams()) {
    container.innerHTML = `
      <div class="container section-padding">
        ${StateComponents.renderProductGridSkeleton(6)}
      </div>
    `;

    try {
      const selectedCat = urlParams.get('category') || null;
      const selectedSub = urlParams.get('sub') || null;
      const searchQuery = urlParams.get('q') || '';
      const sort = urlParams.get('sort') || 'newest';
      const minPrice = urlParams.get('min') || null;
      const maxPrice = urlParams.get('max') || null;

      const [categories, { products, count }] = await Promise.all([
        CategoryService.getCategories(),
        ProductService.getProducts({
          category: selectedCat,
          subcategory: selectedSub,
          search: searchQuery,
          minPrice: minPrice,
          maxPrice: maxPrice,
          sort: sort,
          limit: 50
        })
      ]);

      // Active category object if filtered
      const activeCatObj = categories.find(c => c.slug === selectedCat || c.id === selectedCat);
      const activeSubs = (activeCatObj && activeCatObj.subcategories) ? activeCatObj.subcategories : [];

      container.innerHTML = `
        <div class="container section-padding">
          <div style="margin-bottom: 28px;">
            <div class="section-tagline">Store Catalog</div>
            <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 6px;">
              ${searchQuery ? `Search Results for "${Utils.escapeHtml(searchQuery)}"` : (activeCatObj ? Utils.escapeHtml(activeCatObj.name) : 'All Products')}
            </h1>
            <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
              Showing <strong>${products.length}</strong> of <strong>${count}</strong> curated items available for nationwide Cash on Delivery
            </p>
          </div>

          <!-- MAIN CATEGORIES — every category the admin has enabled -->
          ${(!searchQuery && categories.length > 0) ? `
            <div class="shop-categories-strip">
              <div class="section-tagline" style="margin-bottom: 12px;">Browse by Category</div>
              <div class="category-grid">
                <a href="#shop" class="category-card ${!selectedCat ? 'active' : ''}">
                  <div class="category-card-img category-card-all">All</div>
                  <span class="category-card-title">Shop All</span>
                </a>
                ${categories.map(cat => `
                  <a href="#shop?category=${Utils.escapeHtml(cat.slug)}" class="category-card ${selectedCat === cat.slug ? 'active' : ''}">
                    <img src="${Utils.escapeHtml(cat.image_url || 'assets/images/product_fashion_kurti_1787668675195.jpg')}" class="category-card-img" alt="${Utils.escapeHtml(cat.name)}" loading="lazy">
                    <span class="category-card-title">${Utils.escapeHtml(cat.name)}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <div class="shop-layout">
            <!-- SIDEBAR FILTERS -->
            <aside class="filter-sidebar">
              <div class="filter-header">
                <h3 style="font-size: 1rem; font-weight: 700;">Filter Products</h3>
                <a href="#shop" style="font-size: 0.8rem; color: var(--color-gold-muted); font-weight: 600;">Reset Filters</a>
              </div>

              <!-- Category Filter -->
              <div class="filter-group">
                <div class="filter-group-title">Categories</div>
                <ul class="filter-list">
                  <li class="filter-item">
                    <label>
                      <input type="radio" name="shop-cat" value="" ${!selectedCat ? 'checked' : ''} onchange="ShopPage.updateFilter('category', '')">
                      <span>All Categories</span>
                    </label>
                  </li>
                  ${categories.map(c => `
                    <li class="filter-item">
                      <label>
                        <input type="radio" name="shop-cat" value="${c.slug}" ${selectedCat === c.slug ? 'checked' : ''} onchange="ShopPage.updateFilter('category', '${c.slug}')">
                        <span>${Utils.escapeHtml(c.name)}</span>
                      </label>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <!-- Subcategory Filter if category is selected -->
              ${activeSubs.length > 0 ? `
                <div class="filter-group">
                  <div class="filter-group-title">${Utils.escapeHtml(activeCatObj.name)} Subcategories</div>
                  <ul class="filter-list">
                    <li class="filter-item">
                      <label>
                        <input type="radio" name="shop-subcat" value="" ${!selectedSub ? 'checked' : ''} onchange="ShopPage.updateFilter('sub', '')">
                        <span>All ${Utils.escapeHtml(activeCatObj.name)}</span>
                      </label>
                    </li>
                    ${activeSubs.map(s => `
                      <li class="filter-item">
                        <label>
                          <input type="radio" name="shop-subcat" value="${s.slug}" ${selectedSub === s.slug ? 'checked' : ''} onchange="ShopPage.updateFilter('sub', '${s.slug}')">
                          <span>${Utils.escapeHtml(s.name)}</span>
                        </label>
                      </li>
                    `).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Price Filter -->
              <div class="filter-group">
                <div class="filter-group-title">Price Range (PKR)</div>
                <div class="price-range-inputs">
                  <input type="number" id="shop-filter-min" class="price-input" placeholder="Min" value="${minPrice || ''}">
                  <span>-</span>
                  <input type="number" id="shop-filter-max" class="price-input" placeholder="Max" value="${maxPrice || ''}">
                </div>
                <button class="btn btn-sm btn-secondary btn-block" style="margin-top: 10px;" onclick="ShopPage.applyPrice()">
                  Apply Price
                </button>
              </div>

              <!-- Trust Notice -->
              <div style="background: var(--color-warm-ivory); padding: 14px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-light); margin-top: 20px;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--color-rich-black); margin-bottom: 4px;">🇵🇰 100% Cash on Delivery</div>
                <p style="font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.4; margin: 0;">Pay with cash upon delivery anywhere in Pakistan.</p>
              </div>
            </aside>

            <!-- MAIN PRODUCT CATALOG CONTENT -->
            <main class="shop-main-content">
              <!-- Toolbar -->
              <div class="shop-toolbar">
                <div style="font-size: 0.88rem; color: var(--color-text-secondary);">
                  Showing <strong>${products.length}</strong> items
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <label for="shop-sort" style="font-size: 0.85rem; font-weight: 600;">Sort By:</label>
                  <select id="shop-sort" class="shop-sort-select" onchange="ShopPage.updateFilter('sort', this.value)">
                    <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest Arrivals</option>
                    <option value="price_low" ${sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price_high" ${sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
                    <option value="bestseller" ${sort === 'bestseller' ? 'selected' : ''}>Best Sellers</option>
                  </select>
                </div>
              </div>

              <!-- Grid -->
              ${products.length > 0 ? `
                <div class="product-grid">
                  ${products.map(p => ProductCard.render(p)).join('')}
                </div>
              ` : StateComponents.renderEmptyState(
                'No products match your criteria',
                'Try clearing your price range or selecting another category.',
                `<a href="#shop" class="btn btn-primary">Reset All Filters</a>`
              )}
            </main>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, "ShopPage.render(document.getElementById('app-main'))");
    }
  },

  updateFilter(key, val) {
    const [base, query] = location.hash.split('?');
    const params = new URLSearchParams(query || '');
    if (val) {
      params.set(key, val);
    } else {
      params.delete(key);
    }
    // If switching category, reset subcategory
    if (key === 'category') {
      params.delete('sub');
    }
    location.hash = `${base}?${params.toString()}`;
  },

  applyPrice() {
    const min = document.getElementById('shop-filter-min').value.trim();
    const max = document.getElementById('shop-filter-max').value.trim();
    const [base, query] = location.hash.split('?');
    const params = new URLSearchParams(query || '');
    if (min) params.set('min', min); else params.delete('min');
    if (max) params.set('max', max); else params.delete('max');
    location.hash = `${base}?${params.toString()}`;
  }
};

window.ShopPage = ShopPage;
