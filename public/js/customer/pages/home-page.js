// ==========================================================
// ZAVYAAN CUSTOMER PAGES — HOMEPAGE
// ==========================================================
// Section order is fixed by the storefront brief:
//   1. Hero banner            — first thing under the site header
//   2. Collections            — the only thing directly beneath the banner
//   3. Promotional banners    — sale / collection / offer (admin-managed)
//   4. Featured Highlights    — the single owner-curated product section
//                              (components/featured-highlights.js)
//   5. Trust guarantees
//   6. Zavyaan Insiders       — email subscription
//
// There are no other product grids on this page. Categories are browsed
// from the navigation, Shop All and the footer. Sections 2–4 can be shown or
// hidden from Admin → Storefront without touching this file.
// ==========================================================

const HomePage = {
  async render(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 80px 0;">
        <div style="font-size: 1.1rem; color: var(--color-gold-muted);">Loading Zavyaan Experience...</div>
      </div>
    `;

    try {
      const [categories, settings] = await Promise.all([
        CategoryService.getCategories(),
        SettingsService.getSettings()
      ]);
      const homepage = settings.homepage || {};

      const featured = homepage.show_featured !== false
        ? await FeaturedHighlights.load(homepage.featured_limit || 8)
        : [];

      // Update Navigation
      HeaderComponent.renderNavigation(categories);

      container.innerHTML = `
        ${this.renderHero()}
        ${homepage.show_collections !== false ? this.renderCollections(settings.collections || [], homepage) : ''}
        ${homepage.show_promo_banners !== false ? PromoBanners.render(settings.promo_banners || []) : ''}
        ${homepage.show_featured !== false ? FeaturedHighlights.render(featured, homepage) : ''}
        ${this.renderTrust()}
        ${this.renderInsiders()}
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, "HomePage.render(document.getElementById('app-main'))");
    }
  },

  // 1. HERO BANNER — image only, no copy. Links to Shop All.
  renderHero() {
    return `
      <section class="hero-banner">
        <div class="container">
          <a href="#shop" class="hero-banner-link" aria-label="Shop all Zavyaan products">
            <img src="assets/images/zavyaan_hero_banner_1787668655303.jpg" alt="Zavyaan — Discover More. Live Better." class="hero-banner-img" fetchpriority="high">
          </a>
        </div>
      </section>
    `;
  },

  // 2. COLLECTIONS — the only content directly beneath the banner
  renderCollections(collections, homepage = {}) {
    const limit = Math.max(1, Number(homepage.collections_limit) || 3);
    const live = collections.filter(c => c && c.enabled !== false).slice(0, limit);

    return `
      <section class="section-padding collections-section" id="collections" style="background-color: var(--color-surface);">
        <div class="container">
          <div class="section-header">
            <div>
              <div class="section-tagline">Curated Collections</div>
              <h2 class="section-title">Shop by Collection</h2>
            </div>
            <a href="#shop" class="btn btn-sm btn-secondary">Shop All &rarr;</a>
          </div>

          ${live.length > 0 ? `
            <div class="collection-grid ${live.length <= 4 ? 'collection-count-' + live.length : ''}">
              ${live.map(c => `
                <a href="#collection/${Utils.escapeHtml(c.slug)}" class="collection-card">
                  <div class="collection-card-media">
                    <img src="${Utils.escapeHtml(c.image_url || 'assets/images/zavyaan_hero_banner_1787668655303.jpg')}" alt="${Utils.escapeHtml(c.title)}" loading="lazy">
                  </div>
                  <div class="collection-card-body">
                    ${c.subtitle ? `<span class="collection-card-subtitle">${Utils.escapeHtml(c.subtitle)}</span>` : ''}
                    <span class="collection-card-title">${Utils.escapeHtml(c.title)}</span>
                    <span class="collection-card-link">Explore &rarr;</span>
                  </div>
                </a>
              `).join('')}
            </div>
          ` : StateComponents.renderEmptyState(
            'Collections coming soon',
            'The store owner has not published any collections yet.',
            `<a href="#shop" class="btn btn-primary">Shop All Products</a>`
          )}
        </div>
      </section>
    `;
  },

  // 5. TRUST GUARANTEES
  renderTrust() {
    return `
      <section class="section-padding" style="background-color: var(--color-surface);">
        <div class="container">
          <div class="section-header" style="justify-content: center; text-align: center;">
            <div>
              <div class="section-tagline">The Zavyaan Standard</div>
              <h2 class="section-title">Why Pakistani Customers Trust Zavyaan</h2>
            </div>
          </div>

          <div class="trust-features-grid">
            <div class="trust-card">
              <div class="trust-icon-box">💵</div>
              <div>
                <h4 class="trust-title">Nationwide Cash on Delivery</h4>
                <p class="trust-text">Pay comfortably in cash upon parcel arrival at your doorstep anywhere in Pakistan.</p>
              </div>
            </div>

            <div class="trust-card">
              <div class="trust-icon-box">⚡</div>
              <div>
                <h4 class="trust-title">Express 2-4 Days Shipping</h4>
                <p class="trust-text">Fast reliable delivery with top Pakistani courier partners with active SMS tracking.</p>
              </div>
            </div>

            <div class="trust-card">
              <div class="trust-icon-box">🔄</div>
              <div>
                <h4 class="trust-title">7-Day Easy Exchange</h4>
                <p class="trust-text">Simple, no-hassle return and exchange process for your complete peace of mind.</p>
              </div>
            </div>

            <div class="trust-card">
              <div class="trust-icon-box">💬</div>
              <div>
                <h4 class="trust-title">Dedicated WhatsApp Support</h4>
                <p class="trust-text">Live assistance for size inquiries, order status, and instant customer service.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `;
  },

  // 6. ZAVYAAN INSIDERS — email subscription (no discount promise)
  renderInsiders() {
    return `
      <section class="section-padding insiders-section" style="background-color: var(--color-rich-black); color: var(--color-pure-white); text-align: center; border-top: 1px solid rgba(198,161,91,0.2);">
        <div class="container" style="max-width: 640px;">
          <span class="badge badge-sale" style="margin-bottom: 16px;">Zavyaan Insiders</span>
          <h2 style="font-size: 2.2rem; color: var(--color-pure-white); margin-bottom: 10px;">Join the Zavyaan Insiders</h2>
          <p style="color: #BDBDBD; font-size: 0.92rem; margin-bottom: 24px; line-height: 1.6;">
            Early access to new collections, sale drops and member-only promotions — straight to your inbox.
          </p>
          <form class="insiders-form" onsubmit="event.preventDefault(); CustomerState.showToast('Welcome to the Zavyaan Insiders!'); this.reset();">
            <label for="insiders-email" class="sr-only">Email address</label>
            <input type="email" id="insiders-email" placeholder="Enter your email address" required autocomplete="email">
            <button type="submit" class="btn btn-gold">Subscribe</button>
          </form>
        </div>
      </section>
    `;
  }
};

window.HomePage = HomePage;
