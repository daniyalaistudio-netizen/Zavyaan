// ==========================================================
// ZAVYAAN CUSTOMER PAGES — COLLECTION PAGE
// Curated marketing collections (Trending, New Arrivals, Summer, etc.)
// ==========================================================

const CollectionPage = {
  async render(container, slug, urlParams = new URLSearchParams()) {
    container.innerHTML = `
      <div class="container section-padding">
        ${StateComponents.renderProductGridSkeleton(6)}
      </div>
    `;

    try {
      const meta = await CollectionService.getCollectionMeta(slug);
      if (!meta) {
        container.innerHTML = `
          <div class="container section-padding">
            ${StateComponents.renderEmptyState(
              'Collection Not Available',
              'This collection is not currently live. Explore our full catalog instead.',
              `<a href="#shop" class="btn btn-primary">Shop All Products</a>`
            )}
          </div>
        `;
        return;
      }
      const { products } = await CollectionService.getCollectionProducts(slug, 50);

      container.innerHTML = `
        <div class="container section-padding">
          <!-- COLLECTION HERO BANNER -->
          <div style="background: linear-gradient(135deg, var(--color-rich-black) 0%, var(--color-charcoal) 100%); border-radius: var(--radius-sm); padding: 44px; color: var(--color-pure-white); margin-bottom: 36px; border: 1px solid rgba(198,161,91,0.3);">
            <span class="badge badge-sale" style="margin-bottom: 12px;">Curated Collection</span>
            <h1 style="font-size: 2.5rem; color: var(--color-pure-white); margin-bottom: 10px;">${Utils.escapeHtml(meta.title)}</h1>
            <p style="color: #BDBDBD; font-size: 0.95rem; max-width: 600px; line-height: 1.6;">${Utils.escapeHtml(meta.description)}</p>
          </div>

          <!-- TOOLBAR -->
          <div class="shop-toolbar">
            <div style="font-size: 0.88rem; color: var(--color-text-secondary);">
              Showing <strong>${products.length}</strong> handpicked products
            </div>
            <div>
              <a href="#shop" class="btn btn-sm btn-secondary">Explore All Catalog &rarr;</a>
            </div>
          </div>

          <!-- PRODUCT GRID -->
          ${products.length > 0 ? `
            <div class="product-grid">
              ${products.map(p => ProductCard.render(p)).join('')}
            </div>
          ` : StateComponents.renderEmptyState(
            'Collection Inventory Updating',
            'Fresh items are being inspected and added to this collection shortly.',
            `<a href="#shop" class="btn btn-primary">Browse Other Products</a>`
          )}
        </div>
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, `CollectionPage.render(document.getElementById('app-main'), '${slug}')`);
    }
  }
};

window.CollectionPage = CollectionPage;
