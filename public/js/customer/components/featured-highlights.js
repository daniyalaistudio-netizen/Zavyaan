// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — FEATURED HIGHLIGHTS
// ==========================================================
// The ONE place on the storefront that renders owner-curated products.
// It shows exclusively the items the store owner has marked "Featured" in
// Admin → Products (product.is_featured). Nothing is inferred from sales,
// recency or stock; if the owner has not featured anything, the section
// says so instead of filling itself with other products.
// ==========================================================

const FeaturedHighlights = {
  // Fetch the owner's featured picks. Limit comes from store settings.
  async load(limit = 8) {
    const { products } = await ProductService.getFeaturedProducts(limit);
    return products;
  },

  // Full homepage section (header + grid). `homepage` is settings.homepage.
  render(products, homepage = {}) {
    const title = homepage.featured_title || 'Featured Highlights';
    const tagline = homepage.featured_tagline || 'Handpicked by Zavyaan';

    return `
      <section class="section-padding featured-highlights" id="featured-highlights" style="background-color: var(--color-warm-ivory);">
        <div class="container">
          <div class="section-header">
            <div>
              <div class="section-tagline">${Utils.escapeHtml(tagline)}</div>
              <h2 class="section-title">${Utils.escapeHtml(title)}</h2>
            </div>
            <a href="#shop" class="btn btn-sm btn-secondary">Shop All &rarr;</a>
          </div>

          ${products.length > 0 ? `
            <div class="product-grid">
              ${products.map(p => ProductCard.render(p)).join('')}
            </div>
          ` : StateComponents.renderEmptyState(
            'No featured items yet',
            'The store owner has not highlighted any products. Mark products as "Featured" in the admin panel to show them here.',
            `<a href="#shop" class="btn btn-primary">Browse the Catalog</a>`
          )}
        </div>
      </section>
    `;
  }
};

window.FeaturedHighlights = FeaturedHighlights;
