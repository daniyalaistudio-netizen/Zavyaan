// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — HEADER & NAVIGATION
// Responsive desktop mega-menu and mobile navigation drawer
// ==========================================================

const HeaderComponent = {
  // Render Desktop Mega-Menu and Mobile Nav Drawer
  renderNavigation(categories) {
    const navList = document.getElementById('desktop-nav-list');
    const mobileList = document.getElementById('mobile-nav-list');
    if (!navList || !mobileList) return;

    // Desktop base links
    let navHtml = `
      <li class="nav-item">
        <a href="#home" class="nav-link">Home</a>
      </li>
      <li class="nav-item">
        <a href="#shop" class="nav-link">Shop All</a>
      </li>
    `;

    // Mobile base links
    let mobileHtml = `
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#home">Home</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#shop">Shop All Products</a></div>
      </div>
    `;

    const activeCats = categories.filter(c => c.is_active !== false);

    activeCats.forEach(cat => {
      const isDeal = cat.slug.includes('deal');
      const activeSubs = (cat.subcategories || []).filter(s => s.is_active !== false);

      // Desktop Mega Menu item
      navHtml += `
        <li class="nav-item">
          <a href="#category/${cat.slug}" class="nav-link ${isDeal ? 'deal-link' : ''}">
            ${Utils.escapeHtml(cat.name)}
            ${activeSubs.length > 0 ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>` : ''}
          </a>
          ${activeSubs.length > 0 ? `
            <div class="mega-menu">
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--color-rich-black);">${Utils.escapeHtml(cat.name)} Collections</h4>
                <div class="mega-subcats">
                  ${activeSubs.map(sub => `
                    <div class="mega-subcat-item">
                      <a href="#category/${cat.slug}?sub=${sub.slug}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        ${Utils.escapeHtml(sub.name)}
                      </a>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="mega-banner">
                <div>
                  <span class="badge badge-featured">Zavyaan Curated</span>
                  <h4 class="mega-banner-title" style="margin-top: 8px;">${Utils.escapeHtml(cat.name)}</h4>
                  <p class="mega-banner-desc">${Utils.escapeHtml(cat.description || 'Explore curated selections with Cash on Delivery nationwide.')}</p>
                </div>
                <a href="#category/${cat.slug}" class="btn btn-sm btn-primary">Explore Category</a>
              </div>
            </div>
          ` : ''}
        </li>
      `;

      // Mobile Menu Accordion Item
      mobileHtml += `
        <div class="mobile-nav-item">
          <div class="mobile-nav-header" onclick="this.nextElementSibling.classList.toggle('active')">
            <a href="#category/${cat.slug}">${Utils.escapeHtml(cat.name)}</a>
            ${activeSubs.length > 0 ? `<span style="font-weight: 700; color: var(--color-gold-muted);">+</span>` : ''}
          </div>
          ${activeSubs.length > 0 ? `
            <div class="mobile-sub-list">
              ${activeSubs.map(sub => `
                <div class="mobile-sub-item">
                  <a href="#category/${cat.slug}?sub=${sub.slug}">• ${Utils.escapeHtml(sub.name)}</a>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });

    // Mobile Static Links
    mobileHtml += `
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#account">My Account</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#track">Track Order</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#about">About Zavyaan</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#contact">WhatsApp & Support</a></div>
      </div>
    `;

    navList.innerHTML = navHtml;
    mobileList.innerHTML = mobileHtml;
  },

  // Setup Event Listeners for Header controls
  bindEvents() {
    // Search Form Submission
    const searchForm = document.getElementById('header-search-form');
    const searchInput = document.getElementById('header-search-input');
    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          location.hash = `#shop?q=${encodeURIComponent(query)}`;
        }
      });
    }

    // Cart Button Trigger
    const cartBtn = document.getElementById('header-cart-btn');
    if (cartBtn) {
      cartBtn.addEventListener('click', () => CartDrawer.open());
    }

    // Cart Drawer Close
    const cartClose = document.getElementById('cart-drawer-close');
    const cartOverlay = document.getElementById('cart-drawer-overlay');
    if (cartClose) cartClose.addEventListener('click', () => CartDrawer.close());
    if (cartOverlay) cartOverlay.addEventListener('click', () => CartDrawer.close());

    // Mobile Drawer Toggle
    const mobileToggle = document.getElementById('mobile-menu-toggle');
    const mobileClose = document.getElementById('mobile-drawer-close');
    const mobileOverlay = document.getElementById('mobile-drawer-overlay');
    const mobileDrawer = document.getElementById('mobile-drawer');

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => {
        if (mobileOverlay) mobileOverlay.classList.add('active');
        if (mobileDrawer) mobileDrawer.classList.add('active');
      });
    }

    const closeMobile = () => {
      if (mobileOverlay) mobileOverlay.classList.remove('active');
      if (mobileDrawer) mobileDrawer.classList.remove('active');
    };

    if (mobileClose) mobileClose.addEventListener('click', closeMobile);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobile);
  }
};

window.HeaderComponent = HeaderComponent;
