// ==========================================================
// ZAVYAAN CLIENT-SIDE ROUTER & VIEW CONTROLLER
// Brand: ZAVYAAN | Tagline: "Discover More. Live Better."
// ==========================================================

const Router = {
  routes: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  async handleRoute() {
    const rawHash = location.hash || '#home';
    const [pathPart, queryPart] = rawHash.split('?');
    const path = pathPart.replace(/^#\/?/, '') || 'home';
    const urlParams = new URLSearchParams(queryPart || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close any open drawers/modals
    UI.toggleCartDrawer(false);
    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileOverlay = document.getElementById('mobile-drawer-overlay');
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');

    const appRoot = document.getElementById('app-main');
    if (!appRoot) return;

    if (path === 'home') {
      await this.renderHomeView(appRoot);
    } else if (path === 'shop') {
      await this.renderShopView(appRoot, urlParams);
    } else if (path.startsWith('category/')) {
      const slug = path.replace('category/', '');
      await this.renderCategoryView(appRoot, slug, urlParams);
    } else if (path === 'checkout') {
      this.renderCheckoutView(appRoot);
    } else if (path.startsWith('order-success/')) {
      const orderNum = path.replace('order-success/', '');
      await this.renderOrderSuccessView(appRoot, orderNum);
    } else if (path === 'track') {
      this.renderTrackOrderView(appRoot, urlParams.get('num'));
    } else if (path === 'admin') {
      this.renderAdminView(appRoot);
    } else if (path === 'about') {
      this.renderAboutView(appRoot);
    } else if (path === 'contact') {
      this.renderContactView(appRoot);
    } else if (path === 'faq') {
      this.renderFaqView(appRoot);
    } else if (['shipping-policy', 'returns-policy', 'privacy-policy', 'terms'].includes(path)) {
      this.renderPolicyView(appRoot, path);
    } else {
      await this.renderHomeView(appRoot);
    }

    // Trigger animation observer
    if (window.initScrollObserver) {
      setTimeout(() => window.initScrollObserver(), 50);
    }
  },

  // 1. HOME VIEW (FINAL BRAND IDENTITY)
  async renderHomeView(container) {
    container.innerHTML = `<div style="text-align: center; padding: 60px 0;"><div style="font-size: 1.1rem; color: var(--color-gold-muted);">Loading Zavyaan Experience...</div></div>`;

    try {
      const [catsRes, featRes, bestRes] = await Promise.all([
        API.getCategories(false),
        API.getProducts({ featured: true, limit: 8 }),
        API.getProducts({ bestseller: true, limit: 8 })
      ]);

      const categories = catsRes.categories || [];
      const featuredProducts = featRes.products || [];
      const bestSellers = bestRes.products || [];

      // Update global categories & nav
      State.categories = categories;
      UI.renderNavigation(categories);

      container.innerHTML = `
        <!-- HERO SECTION -->
        <section class="hero-section">
          <div class="container">
            <div class="hero-grid">
              <div class="hero-content">
                <div class="hero-pill">
                  <span>✨ Official Zavyaan Store</span>
                </div>
                <h1 class="hero-title">
                  Discover More. <span>Live Better.</span>
                </h1>
                <p class="hero-desc">
                  Pakistan's premier multi-category online destination for curated fashion, artisanal jewellery, STEM toys, organic skincare, and modern smart living with nationwide Cash on Delivery.
                </p>
                <div class="hero-cta-group">
                  <a href="#shop" class="btn btn-gold btn-lg">Explore Catalog</a>
                  <a href="#category/deals-offers" class="btn btn-secondary btn-lg">🔥 Exclusive Deals</a>
                </div>
                <div class="hero-features-list">
                  <div class="hero-feature-item">
                    <div class="hero-feature-icon">🚚</div>
                    <span>Fast Express Delivery</span>
                  </div>
                  <div class="hero-feature-item">
                    <div class="hero-feature-icon">💵</div>
                    <span>100% Cash on Delivery</span>
                  </div>
                  <div class="hero-feature-item">
                    <div class="hero-feature-icon">🛡️</div>
                    <span>7-Day Easy Exchange</span>
                  </div>
                </div>
              </div>

              <div class="hero-media-wrapper">
                <div class="hero-image-card">
                  <img src="assets/images/zavyaan_hero_banner_1787668655303.jpg" alt="Zavyaan Brand Presentation">
                  <div class="hero-floating-badge">
                    <div style="font-size: 1.5rem;">🇵🇰</div>
                    <div>
                      <div style="font-weight: 700; font-size: 0.92rem; letter-spacing: 0.5px;">Curated For Pakistan</div>
                      <div style="font-size: 0.75rem; color: #BDBDBD;">Quality Inspected & Guaranteed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- SHOP BY CATEGORY -->
        <section class="section-padding" style="background: var(--color-surface);">
          <div class="container">
            <div class="section-header">
              <div>
                <div class="section-tagline">Curated Catalog</div>
                <h2 class="section-title">Shop by Category</h2>
              </div>
              <a href="#shop" class="btn btn-sm btn-secondary">View All Collections &rarr;</a>
            </div>

            <div class="category-grid">
              ${categories.map(cat => `
                <div class="category-card reveal-on-scroll" onclick="location.hash='#category/${cat.slug}'">
                  <img src="${cat.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}" class="category-card-img" alt="${cat.name}">
                  <span class="category-card-title">${cat.name}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </section>

        <!-- FEATURED PRODUCTS -->
        <section class="section-padding" style="background: var(--color-ivory);">
          <div class="container">
            <div class="section-header">
              <div>
                <div class="section-tagline">Handpicked Selection</div>
                <h2 class="section-title">Featured Highlights</h2>
              </div>
              <a href="#shop" class="btn btn-sm btn-secondary">Shop All &rarr;</a>
            </div>

            <div class="product-grid">
              ${featuredProducts.map(p => UI.renderProductCard(p)).join('')}
            </div>
          </div>
        </section>

        <!-- EDITORIAL PROMOTIONAL BANNERS -->
        <section class="section-padding" style="background: var(--color-surface);">
          <div class="container">
            <div class="promo-banners-grid">
              <div class="promo-banner-card promo-bg-dark reveal-on-scroll">
                <span class="promo-tag">Traditional & Festive</span>
                <h3 class="promo-heading">Festive Lawn & Bridal Jewellery</h3>
                <p class="promo-desc">Micro 22K gold-plated Kundan sets & intricate Pakistani embroideries.</p>
                <div><a href="#category/jewellery" class="btn btn-sm btn-gold">Explore Jewellery &rarr;</a></div>
              </div>

              <div class="promo-banner-card promo-bg-ivory reveal-on-scroll">
                <span class="promo-tag">Next-Gen Essentials</span>
                <h3 class="promo-heading">Smart Wearables & Tech Gadgets</h3>
                <p class="promo-desc">Vibrant AMOLED smartwatches and active noise-cancelling earbuds.</p>
                <div><a href="#category/electronics-accessories" class="btn btn-sm btn-primary">Discover Tech &rarr;</a></div>
              </div>
            </div>
          </div>
        </section>

        <!-- BEST SELLERS -->
        <section class="section-padding" style="background: var(--color-ivory);">
          <div class="container">
            <div class="section-header">
              <div>
                <div class="section-tagline">Customer Favorites</div>
                <h2 class="section-title">Best Sellers Across Pakistan</h2>
              </div>
              <a href="#shop" class="btn btn-sm btn-secondary">View More &rarr;</a>
            </div>

            <div class="product-grid">
              ${bestSellers.map(p => UI.renderProductCard(p)).join('')}
            </div>
          </div>
        </section>

        <!-- WHY CHOOSE ZAVYAAN TRUST PILLARS -->
        <section class="section-padding" style="background: var(--color-surface);">
          <div class="container">
            <div class="section-header" style="text-align: center; flex-direction: column; align-items: center; margin-bottom: 44px;">
              <div class="section-tagline">Trust & Excellence</div>
              <h2 class="section-title">Why Shop With Zavyaan?</h2>
              <p class="section-subtitle">Dedicated to bringing authentic quality, nationwide access, and worry-free shopping to Pakistani households.</p>
            </div>

            <div class="trust-features-grid">
              <div class="trust-card reveal-on-scroll">
                <div class="trust-icon-box">💵</div>
                <div>
                  <h4 class="trust-title">Nationwide Cash on Delivery</h4>
                  <p class="trust-text">Pay comfortably in cash upon parcel arrival at your doorstep anywhere in Pakistan.</p>
                </div>
              </div>

              <div class="trust-card reveal-on-scroll">
                <div class="trust-icon-box">⚡</div>
                <div>
                  <h4 class="trust-title">Express 2-4 Days Shipping</h4>
                  <p class="trust-text">Fast reliable delivery with top Pakistani courier partners with active tracking.</p>
                </div>
              </div>

              <div class="trust-card reveal-on-scroll">
                <div class="trust-icon-box">🔄</div>
                <div>
                  <h4 class="trust-title">7-Day Easy Exchange</h4>
                  <p class="trust-text">Simple, no-hassle return and exchange process for your complete peace of mind.</p>
                </div>
              </div>

              <div class="trust-card reveal-on-scroll">
                <div class="trust-icon-box">💬</div>
                <div>
                  <h4 class="trust-title">Dedicated WhatsApp Support</h4>
                  <p class="trust-text">Live assistance for size inquiries, order status, and instant customer service.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- VIP NEWSLETTER -->
        <section class="section-padding" style="background: var(--color-primary-black); color: var(--color-pure-white); text-align: center; border-top: 1px solid rgba(198,161,91,0.2);">
          <div class="container" style="max-width: 640px;">
            <span class="badge badge-sale" style="margin-bottom: 16px;">Zavyaan Insider</span>
            <h2 style="font-size: 2.2rem; color: var(--color-pure-white); margin-bottom: 10px;">Receive Rs. 500 OFF Your Next Order</h2>
            <p style="color: #BDBDBD; font-size: 0.92rem; margin-bottom: 24px; line-height: 1.6;">
              Join our VIP circle for early access to curated collections, flash sale drops, and member-only promotions.
            </p>
            <form onsubmit="event.preventDefault(); State.showToast('Welcome to Zavyaan VIP circle!'); this.reset();" style="display: flex; gap: 8px; max-width: 480px; margin: 0 auto; flex-wrap: wrap;">
              <input type="email" placeholder="Enter your email address" required style="flex: 1; min-width: 240px; padding: 12px 18px; border-radius: var(--radius-xs); border: 1px solid rgba(198,161,91,0.3); font-size: 0.9rem; background: var(--color-charcoal); color: #fff;">
              <button type="submit" class="btn btn-gold" style="padding: 12px 24px;">Subscribe</button>
            </form>
          </div>
        </section>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--color-status-error);">Error loading home page: ${e.message}</div>`;
    }
  },

  // 2. SHOP / CATALOG VIEW
  async renderShopView(container, urlParams) {
    container.innerHTML = `<div style="text-align: center; padding: 60px 0;">Loading catalog...</div>`;

    try {
      const selectedCat = urlParams.get('category') || null;
      const selectedSub = urlParams.get('sub') || null;
      const searchQuery = urlParams.get('q') || '';
      const sort = urlParams.get('sort') || 'newest';

      const [catsRes, prodsRes] = await Promise.all([
        API.getCategories(false),
        API.getProducts({
          category: selectedCat,
          subcategory: selectedSub,
          search: searchQuery,
          sort: sort,
          limit: 50
        })
      ]);

      const categories = catsRes.categories || [];
      const products = prodsRes.products || [];

      container.innerHTML = `
        <div class="container section-padding">
          <div style="margin-bottom: 28px;">
            <div class="section-tagline">Store Catalog</div>
            <h1 style="font-size: 2.2rem; color: var(--color-primary-black); margin-bottom: 6px;">
              ${searchQuery ? `Search Results for "${searchQuery}"` : 'All Products'}
            </h1>
            <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
              Showing ${products.length} products available for nationwide Cash on Delivery
            </p>
          </div>

          <div class="shop-layout">
            <!-- SIDEBAR FILTERS -->
            <aside class="filter-sidebar">
              <div class="filter-header">
                <h3 style="font-size: 1rem; font-weight: 700;">Filter Products</h3>
                <a href="#shop" style="font-size: 0.8rem; color: var(--color-gold-muted); font-weight: 600;">Reset</a>
              </div>

              <!-- Category Filter -->
              <div class="filter-group">
                <div class="filter-group-title">Categories</div>
                <ul class="filter-list">
                  <li class="filter-item">
                    <label>
                      <input type="radio" name="shop-cat" value="" ${!selectedCat ? 'checked' : ''} onchange="location.hash='#shop'">
                      <span>All Categories</span>
                    </label>
                  </li>
                  ${categories.map(c => `
                    <li class="filter-item">
                      <label>
                        <input type="radio" name="shop-cat" value="${c.slug}" ${selectedCat === c.slug ? 'checked' : ''} onchange="location.hash='#category/${c.slug}'">
                        <span>${c.name}</span>
                      </label>
                    </li>
                  `).join('')}
                </ul>
              </div>

              <!-- Price Filter -->
              <div class="filter-group">
                <div class="filter-group-title">Price Range (PKR)</div>
                <div class="price-range-inputs">
                  <input type="number" id="filter-min-price" class="price-input" placeholder="Min" value="${urlParams.get('min') || ''}">
                  <span>-</span>
                  <input type="number" id="filter-max-price" class="price-input" placeholder="Max" value="${urlParams.get('max') || ''}">
                </div>
                <button class="btn btn-sm btn-secondary btn-block" style="margin-top: 10px;" onclick="Router.applyPriceFilter()">Apply Filter</button>
              </div>

              <!-- Cash on Delivery Guarantee -->
              <div style="background: var(--color-ivory); padding: 14px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-light); margin-top: 20px;">
                <div style="font-weight: 700; font-size: 0.82rem; color: var(--color-primary-black); margin-bottom: 4px;">🇵🇰 100% Cash on Delivery</div>
                <p style="font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.4;">Pay with cash upon delivery at your doorstep.</p>
              </div>
            </aside>

            <!-- MAIN PRODUCT GRID -->
            <main class="shop-main-content">
              <div class="shop-toolbar">
                <div style="font-size: 0.88rem; color: var(--color-text-secondary);">
                  <strong>${products.length}</strong> items available
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <label for="shop-sort" style="font-size: 0.85rem; font-weight: 600;">Sort By:</label>
                  <select id="shop-sort" class="shop-sort-select" onchange="Router.handleSortChange(this.value)">
                    <option value="newest" ${sort === 'newest' ? 'selected' : ''}>Newest Arrivals</option>
                    <option value="price_low" ${sort === 'price_low' ? 'selected' : ''}>Price: Low to High</option>
                    <option value="price_high" ${sort === 'price_high' ? 'selected' : ''}>Price: High to Low</option>
                    <option value="name_asc" ${sort === 'name_asc' ? 'selected' : ''}>Product Name</option>
                  </select>
                </div>
              </div>

              ${products.length > 0 ? `
                <div class="product-grid">
                  ${products.map(p => UI.renderProductCard(p)).join('')}
                </div>
              ` : `
                <div style="text-align: center; padding: 70px 20px; background: var(--color-pure-white); border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
                  <div style="font-size: 2.5rem; margin-bottom: 12px;">🛍️</div>
                  <h3 style="font-size: 1.25rem; margin-bottom: 8px;">No products found</h3>
                  <p style="color: var(--color-text-secondary); font-size: 0.88rem; margin-bottom: 20px;">Try adjusting your filters or search keywords.</p>
                  <a href="#shop" class="btn btn-primary">Reset Filters</a>
                </div>
              `}
            </main>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--color-status-error);">Error loading shop: ${e.message}</div>`;
    }
  },

  handleSortChange(sortVal) {
    const current = location.hash;
    const [base, query] = current.split('?');
    const params = new URLSearchParams(query || '');
    params.set('sort', sortVal);
    location.hash = `${base}?${params.toString()}`;
  },

  applyPriceFilter() {
    const min = document.getElementById('filter-min-price').value;
    const max = document.getElementById('filter-max-price').value;
    const current = location.hash;
    const [base, query] = current.split('?');
    const params = new URLSearchParams(query || '');
    if (min) params.set('min', min); else params.delete('min');
    if (max) params.set('max', max); else params.delete('max');
    location.hash = `${base}?${params.toString()}`;
  },

  // 3. CATEGORY VIEW
  async renderCategoryView(container, slug, urlParams) {
    container.innerHTML = `<div style="text-align: center; padding: 60px 0;">Loading category...</div>`;

    try {
      const selectedSub = urlParams.get('sub') || null;
      const [catRes, prodsRes] = await Promise.all([
        API.getCategory(slug),
        API.getProducts({
          category: slug,
          subcategory: selectedSub,
          limit: 50
        })
      ]);

      const cat = catRes.category;
      const products = prodsRes.products || [];
      const subcategories = (cat.subcategories || []).filter(s => s.is_active);

      container.innerHTML = `
        <div class="container section-padding">
          <!-- CATEGORY HEADER BANNER -->
          <div style="background: var(--color-primary-black); border-radius: var(--radius-sm); padding: 40px; color: var(--color-pure-white); margin-bottom: 36px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border: 1px solid rgba(198,161,91,0.25);">
            <div>
              <div class="badge badge-sale" style="margin-bottom: 12px;">Category Showcase</div>
              <h1 style="font-size: 2.3rem; color: var(--color-pure-white); margin-bottom: 8px;">${cat.name}</h1>
              <p style="color: #BDBDBD; font-size: 0.92rem; max-width: 540px; line-height: 1.6;">${cat.description || 'Explore curated selections with Cash on Delivery nationwide.'}</p>
            </div>
            ${cat.image_url ? `<img src="${cat.image_url}" alt="${cat.name}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-gold-primary);">` : ''}
          </div>

          <!-- SUBCATEGORY PILLS -->
          ${subcategories.length > 0 ? `
            <div style="margin-bottom: 28px;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-primary-black); margin-bottom: 10px;">Subcategories:</div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="#category/${cat.slug}" class="variant-chip ${!selectedSub ? 'selected' : ''}">All ${cat.name}</a>
                ${subcategories.map(s => `
                  <a href="#category/${cat.slug}?sub=${s.slug}" class="variant-chip ${selectedSub === s.slug ? 'selected' : ''}">
                    ${s.name}
                  </a>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- PRODUCTS GRID -->
          <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
            <div style="color: var(--color-text-secondary); font-size: 0.88rem;">
              Showing <strong>${products.length}</strong> items in ${cat.name}
            </div>
          </div>

          ${products.length > 0 ? `
            <div class="product-grid">
              ${products.map(p => UI.renderProductCard(p)).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 60px 20px; background: var(--color-pure-white); border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
              <div style="font-size: 2.5rem; margin-bottom: 10px;">📦</div>
              <h3 style="font-size: 1.2rem; margin-bottom: 6px;">New products arriving soon</h3>
              <p style="color: var(--color-text-secondary); font-size: 0.88rem; margin-bottom: 20px;">Explore our other curated categories in the meantime.</p>
              <a href="#shop" class="btn btn-primary">Browse Catalog</a>
            </div>
          `}
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--color-status-error);">Error loading category: ${e.message}</div>`;
    }
  },

  // 4. CHECKOUT VIEW (PAKISTANI CASH ON DELIVERY)
  renderCheckoutView(container) {
    const items = State.cart;
    if (items.length === 0) {
      container.innerHTML = `
        <div class="container section-padding" style="text-align: center;">
          <div style="font-size: 3rem; margin-bottom: 12px;">🛒</div>
          <h2 style="font-size: 1.6rem; color: var(--color-primary-black); margin-bottom: 8px;">Your Shopping Cart is Empty</h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 24px;">Explore our collections and add items before proceeding to checkout.</p>
          <a href="#shop" class="btn btn-primary">Start Shopping</a>
        </div>
      `;
      return;
    }

    const subtotal = State.getCartSubtotal();
    const deliveryFee = State.getDeliveryFee(subtotal);
    const total = subtotal + deliveryFee;

    container.innerHTML = `
      <div class="container section-padding">
        <div style="margin-bottom: 28px;">
          <div class="section-tagline">Secure Checkout</div>
          <h1 style="font-size: 2.2rem; color: var(--color-primary-black); margin-bottom: 6px;">Cash on Delivery Checkout</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
            Fast nationwide dispatch across Punjab, Sindh, KPK, Balochistan, and Islamabad ICT.
          </p>
        </div>

        <div class="checkout-grid">
          <!-- FORM -->
          <div class="checkout-card">
            <h3 style="font-size: 1.25rem; margin-bottom: 20px; color: var(--color-primary-black);">1. Delivery & Contact Details</h3>
            <form id="checkout-form" onsubmit="Router.handlePlaceOrder(event)">
              <div class="form-group">
                <label class="form-label">Full Name <span class="req">*</span></label>
                <input type="text" id="chk-name" class="form-control" placeholder="e.g. Muhammad Ali" required>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Mobile Number (Calling) <span class="req">*</span></label>
                  <input type="tel" id="chk-phone" class="form-control" placeholder="0300 1234567" required>
                </div>
                <div class="form-group">
                  <label class="form-label">WhatsApp Number (For Tracking Updates)</label>
                  <input type="tel" id="chk-whatsapp" class="form-control" placeholder="0300 1234567">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address (Optional)</label>
                <input type="email" id="chk-email" class="form-control" placeholder="ali@example.com">
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Province <span class="req">*</span></label>
                  <select id="chk-province" class="form-control" required>
                    <option value="">-- Select Province --</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Sindh">Sindh</option>
                    <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPK)</option>
                    <option value="Balochistan">Balochistan</option>
                    <option value="Islamabad Capital Territory">Islamabad Capital Territory</option>
                    <option value="Azad Jammu & Kashmir">Azad Jammu & Kashmir (AJK)</option>
                    <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">City <span class="req">*</span></label>
                  <input type="text" id="chk-city" class="form-control" placeholder="e.g. Lahore / Karachi" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Complete Street Address <span class="req">*</span></label>
                <textarea id="chk-address" class="form-control" rows="3" placeholder="House/Apartment #, Street, Area/Sector, City" required></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Order Notes / Delivery Instructions (Optional)</label>
                <input type="text" id="chk-notes" class="form-control" placeholder="e.g. Call before delivery">
              </div>

              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border-light);">
                <h3 style="font-size: 1.15rem; margin-bottom: 12px; color: var(--color-primary-black);">2. Payment Method</h3>
                <div class="cod-badge-box">
                  <div style="font-size: 1.6rem;">💵</div>
                  <div>
                    <strong style="color: var(--color-primary-black); font-size: 0.95rem;">Cash on Delivery (COD)</strong>
                    <div style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 2px;">Pay directly in cash to courier upon parcel delivery. No advance deposit required.</div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 32px;">
                <button type="submit" id="btn-submit-order" class="btn btn-primary btn-lg btn-block" style="font-size: 1.05rem;">
                  Confirm Cash on Delivery Order &rarr;
                </button>
              </div>
            </form>
          </div>

          <!-- SUMMARY -->
          <div class="checkout-card" style="background: var(--color-ivory);">
            <h3 style="font-size: 1.15rem; margin-bottom: 16px; color: var(--color-primary-black);">Order Summary (${State.getCartCount()} items)</h3>
            
            <div style="max-height: 280px; overflow-y: auto; margin-bottom: 20px;">
              ${items.map(item => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--color-border-light);">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${item.image}" style="width: 44px; height: 44px; border-radius: var(--radius-xs); object-fit: cover;">
                    <div>
                      <div style="font-size: 0.85rem; font-weight: 600;">${item.title}</div>
                      ${item.selected_variant ? `<div style="font-size: 0.75rem; color: var(--color-text-secondary);">${item.selected_variant.variant_type}: ${item.selected_variant.name}</div>` : ''}
                      <div style="font-size: 0.78rem; color: var(--color-text-secondary);">Qty: ${item.quantity}</div>
                    </div>
                  </div>
                  <strong>${UI.formatPrice(item.price * item.quantity)}</strong>
                </div>
              `).join('')}
            </div>

            <div style="display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px solid var(--color-border-light);">
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>Subtotal:</span>
                <strong>${UI.formatPrice(subtotal)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                <span>Delivery Charges:</span>
                <strong style="color: ${deliveryFee === 0 ? 'var(--color-status-success)' : 'inherit'};">
                  ${deliveryFee === 0 ? 'FREE DELIVERY' : UI.formatPrice(deliveryFee)}
                </strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 800; color: var(--color-primary-black); margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border-light);">
                <span>Total Amount:</span>
                <span>${UI.formatPrice(total)}</span>
              </div>
            </div>

            <div style="margin-top: 20px; font-size: 0.78rem; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>100% Encrypted & Safe Order Processing</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async handlePlaceOrder(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-order');
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Processing Order...';
    }

    try {
      const orderPayload = {
        customer_name: document.getElementById('chk-name').value,
        customer_phone: document.getElementById('chk-phone').value,
        customer_whatsapp: document.getElementById('chk-whatsapp').value,
        customer_email: document.getElementById('chk-email').value,
        province: document.getElementById('chk-province').value,
        city: document.getElementById('chk-city').value,
        address: document.getElementById('chk-address').value,
        order_notes: document.getElementById('chk-notes').value,
        items: State.cart
      };

      const res = await API.placeOrder(orderPayload);
      if (res.success && res.order) {
        State.clearCart();
        location.hash = `#order-success/${res.order.order_number}`;
      } else {
        alert(res.message || 'Failed to place order. Please try again.');
      }
    } catch (err) {
      alert('Error placing order: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = 'Confirm Cash on Delivery Order →';
      }
    }
  },

  // 5. ORDER SUCCESS CONFIRMATION VIEW
  async renderOrderSuccessView(container, orderNumber) {
    container.innerHTML = `<div style="text-align: center; padding: 60px 0;">Loading order confirmation...</div>`;

    try {
      const res = await API.trackOrder(orderNumber);
      const order = res.order;

      container.innerHTML = `
        <div class="container section-padding">
          <div class="order-success-card">
            <div class="order-success-icon">✓</div>
            <h1 style="font-size: 2rem; color: var(--color-primary-black); margin-bottom: 8px;">Order Confirmed!</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.95rem;">
              Thank you for shopping with Zavyaan. We will dispatch your order shortly.
            </p>

            <div class="order-number-banner">
              Tracking Number: <strong>${order.order_number}</strong>
            </div>

            <div style="background: var(--color-ivory); border-radius: var(--radius-xs); border: 1px solid var(--color-border-light); padding: 20px; text-align: left; margin-bottom: 24px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.88rem;">
                <div><strong>Customer:</strong> ${order.customer_name}</div>
                <div><strong>Destination:</strong> ${order.city}, ${order.province}</div>
                <div><strong>Payment:</strong> Cash on Delivery</div>
                <div><strong>Total:</strong> <strong style="color: var(--color-primary-black);">${UI.formatPrice(order.total_amount)}</strong></div>
              </div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <a href="#track?num=${order.order_number}" class="btn btn-primary">Track Dispatch Timeline</a>
              <a href="#shop" class="btn btn-secondary">Continue Shopping</a>
            </div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--color-status-error);">Order not found.</div>`;
    }
  },

  // 6. ORDER TRACKING VIEW
  async renderTrackOrderView(container, presetNumber = '') {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div style="text-align: center; margin-bottom: 36px;">
          <div class="section-tagline">Order Tracking</div>
          <h1 style="font-size: 2.2rem; color: var(--color-primary-black); margin-bottom: 8px;">Track Your Zavyaan Order</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.92rem;">
            Enter your Order Number (e.g. <code>ZVN-2026-XXXX</code>) to view the live dispatch timeline.
          </p>
        </div>

        <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 32px; box-shadow: var(--shadow-sm); margin-bottom: 30px;">
          <form onsubmit="Router.handleTrackLookup(event)" style="display: flex; gap: 10px; flex-wrap: wrap;">
            <input type="text" id="track-input-num" class="form-control" style="flex: 1; min-width: 220px;" placeholder="e.g. ZVN-2026-1234" value="${presetNumber || ''}" required>
            <button type="submit" class="btn btn-primary">Track Order</button>
          </form>
        </div>

        <div id="track-result-box"></div>
      </div>
    `;

    if (presetNumber) {
      this.executeTrackLookup(presetNumber);
    }
  },

  async handleTrackLookup(e) {
    e.preventDefault();
    const num = document.getElementById('track-input-num').value.trim();
    if (num) {
      await this.executeTrackLookup(num);
    }
  },

  async executeTrackLookup(orderNumber) {
    const resultBox = document.getElementById('track-result-box');
    if (!resultBox) return;

    resultBox.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-text-secondary);">Fetching order timeline...</div>`;

    try {
      const res = await API.trackOrder(orderNumber);
      const order = res.order;

      const steps = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];
      const currentIdx = steps.indexOf(order.order_status);

      resultBox.innerHTML = `
        <div class="tracking-timeline-box">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-light); padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <h3 style="font-size: 1.25rem; color: var(--color-primary-black);">Order #${order.order_number}</h3>
              <span style="font-size: 0.82rem; color: var(--color-text-secondary);">Destination: ${order.city}, ${order.province}</span>
            </div>
            <span class="status-pill status-${order.order_status}">${order.order_status}</span>
          </div>

          <!-- VISUAL PROGRESS TIMELINE -->
          <div class="timeline-steps">
            ${steps.map((st, idx) => {
              const isCompleted = currentIdx >= idx;
              const isCurrent = currentIdx === idx;
              return `
                <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                  <div class="step-node">${isCompleted ? '✓' : idx + 1}</div>
                  <span class="step-label">${st}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- TIMELINE LOG -->
          <div style="background: var(--color-ivory); border-radius: var(--radius-xs); padding: 18px; margin-top: 24px; border: 1px solid var(--color-border-light);">
            <h4 style="font-size: 0.9rem; margin-bottom: 12px; color: var(--color-primary-black);">Activity History</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(order.timeline || []).map(t => `
                <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
                  <span><strong>${t.status}:</strong> ${t.note || 'Status updated'}</span>
                  <span style="color: var(--color-text-secondary);">${new Date(t.created_at).toLocaleString('en-PK')}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = `
        <div style="background: var(--color-status-error-bg); border: 1px solid rgba(198, 40, 40, 0.2); color: var(--color-status-error); padding: 20px; border-radius: var(--radius-xs); text-align: center; font-size: 0.9rem;">
          ${err.message || 'Order not found. Please double-check your tracking ID.'}
        </div>
      `;
    }
  },

  // 7. ADMIN VIEW
  renderAdminView(container) {
    container.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div style="padding: 0 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            <div style="font-weight: 800; font-size: 1.2rem; color: #ffffff; letter-spacing: 2px;">ZAVYAAN</div>
            <div style="font-size: 0.7rem; color: var(--color-gold-primary); text-transform: uppercase;">Store Management</div>
          </div>
          <ul class="admin-menu" style="margin-top: 16px;">
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="dashboard" class="active" onclick="Admin.switchTab('dashboard')">
                <span>📊</span> Dashboard
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="categories" onclick="Admin.switchTab('categories')">
                <span>📁</span> Categories
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="products" onclick="Admin.switchTab('products')">
                <span>🛍️</span> Products
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="orders" onclick="Admin.switchTab('orders')">
                <span>📦</span> Orders
              </a>
            </li>
            <li class="admin-menu-item" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
              <a href="#home">
                <span>🌐</span> Public Store
              </a>
            </li>
          </ul>
        </aside>

        <main class="admin-main" id="admin-tab-content">
          <!-- Dynamically populated by Admin.switchTab() -->
        </main>
      </div>

      <!-- Admin Modal Container -->
      <div id="admin-modal" class="modal-overlay">
        <div class="modal-container" style="max-width: 640px; padding: 32px;" id="admin-modal-body">
        </div>
      </div>
    `;

    Admin.switchTab('dashboard');
  },

  // 8. STATIC PAGES (ABOUT, CONTACT, FAQ, POLICIES)
  renderAboutView(container) {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 860px;">
        <div class="section-tagline">About Us</div>
        <h1 style="font-size: 2.6rem; color: var(--color-primary-black); margin-bottom: 12px;">Discover More. Live Better.</h1>
        <p style="font-size: 1.05rem; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 28px;">
          <strong>Zavyaan</strong> is an online multi-category destination built for Pakistan, offering thoughtfully curated collections across festive fashion, artisanal jewellery, STEM toys, organic skincare, home decor, and smart electronics with nationwide Cash on Delivery.
        </p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 36px 0;">
          <div style="background: var(--color-pure-white); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
            <h3 style="color: var(--color-primary-black); margin-bottom: 8px; font-size: 1.15rem;">Our Mission</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">To build Pakistan's most trusted online shopping brand through quality inspection, transparent pricing in PKR, and customer-first support.</p>
          </div>
          <div style="background: var(--color-pure-white); padding: 24px; border-radius: var(--radius-sm); border: 1px solid var(--color-border-light);">
            <h3 style="color: var(--color-gold-muted); margin-bottom: 8px; font-size: 1.15rem;">The Zavyaan Promise</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">100% Cash on Delivery nationwide, 7-day hassle-free exchange, and dedicated WhatsApp care.</p>
          </div>
        </div>
      </div>
    `;
  },

  renderContactView(container) {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 760px;">
        <div class="section-tagline">Customer Care</div>
        <h1 style="font-size: 2.4rem; color: var(--color-primary-black); margin-bottom: 8px;">Contact Zavyaan Support</h1>
        <p style="color: var(--color-text-secondary); margin-bottom: 30px;">Have questions regarding an order, size details, or bulk inquiries? We're here to help.</p>

        <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 32px;">
          <form onsubmit="event.preventDefault(); State.showToast('Message received! Our team will reach out via WhatsApp/Email shortly.'); this.reset();">
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input type="text" class="form-control" placeholder="Your name" required>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">WhatsApp Number <span class="req">*</span></label>
                <input type="tel" class="form-control" placeholder="0300 1234567" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" class="form-control" placeholder="yourname@gmail.com">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Inquiry Details <span class="req">*</span></label>
              <textarea class="form-control" rows="4" placeholder="How can we assist you today?" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary btn-lg">Send Message</button>
          </form>
        </div>
      </div>
    `;
  },

  renderFaqView(container) {
    const faqs = [
      { q: 'How does Cash on Delivery (COD) work?', a: 'You place your order online without advance payment. When the courier delivers your parcel, you inspect the package and pay cash directly to the rider.' },
      { q: 'What is the delivery time across Pakistan?', a: 'Major cities (Lahore, Karachi, Islamabad, Rawalpindi, Faisalabad) receive deliveries within 2 to 3 business days. Other cities take 3 to 5 business days.' },
      { q: 'What are the delivery charges?', a: 'Delivery is 100% FREE on all orders over Rs. 2,500! Orders below Rs. 2,500 carry a flat delivery fee of Rs. 200 nationwide.' },
      { q: 'How do I exchange or return an item?', a: 'We provide a 7-day hassle-free return and exchange policy. Simply message our WhatsApp support with your Order Number to initiate an exchange.' }
    ];

    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div class="section-tagline">Help & FAQs</div>
        <h1 style="font-size: 2.4rem; color: var(--color-primary-black); margin-bottom: 12px;">Frequently Asked Questions</h1>
        <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 24px;">
          ${faqs.map(f => `
            <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-xs); padding: 20px;">
              <h4 style="font-size: 1rem; color: var(--color-primary-black); margin-bottom: 8px;">Q: ${f.q}</h4>
              <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.6;">${f.a}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderPolicyView(container, type) {
    const policies = {
      'shipping-policy': {
        title: 'Shipping & Delivery Policy',
        content: 'Zavyaan delivers across Pakistan using premier courier services. Orders are processed within 24 hours of confirmation. Delivery takes 2-4 business days. Free shipping is automatically applied to all orders above Rs. 2,500.'
      },
      'returns-policy': {
        title: 'Return & Exchange Policy',
        content: 'Your satisfaction is our priority. If you receive a damaged item or incorrect size, contact us within 7 days of delivery with original tags intact. We will arrange a swift replacement or refund.'
      },
      'privacy-policy': {
        title: 'Privacy Policy',
        content: 'Zavyaan is committed to customer privacy. Contact details and shipping addresses are collected solely to process and deliver your orders safely.'
      },
      'terms': {
        title: 'Terms & Conditions',
        content: 'By placing an order on Zavyaan, you agree to receive order tracking updates via SMS/WhatsApp and make full payment upon Cash on Delivery arrival.'
      }
    };

    const pol = policies[type] || policies['shipping-policy'];

    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div class="section-tagline">Policy</div>
        <h1 style="font-size: 2.3rem; color: var(--color-primary-black); margin-bottom: 16px;">${pol.title}</h1>
        <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-xs); padding: 32px; line-height: 1.8; color: var(--color-text-main); font-size: 0.92rem;">
          <p>${pol.content}</p>
        </div>
      </div>
    `;
  }
};

window.Router = Router;
