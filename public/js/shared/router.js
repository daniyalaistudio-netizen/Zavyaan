// ==========================================================
// ZAVYAAN SHARED — ROUTER & VIEW CONTROLLER
// Client-side hash router linking customer pages and preserving admin portal
// ==========================================================

const AppRouter = {
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  async handleRoute() {
    const rawHash = location.hash || '#home';
    const [pathPart, queryPart] = rawHash.split('?');
    const path = pathPart.replace(/^#\/?/, '') || 'home';
    const urlParams = new URLSearchParams(queryPart || '');

    // Reset scroll smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Close drawers and modals on page navigation
    if (window.CartDrawer) CartDrawer.close();
    if (window.QuickViewModal) QuickViewModal.close();

    const mobileDrawer = document.getElementById('mobile-drawer');
    const mobileOverlay = document.getElementById('mobile-drawer-overlay');
    if (mobileDrawer) mobileDrawer.classList.remove('active');
    if (mobileOverlay) mobileOverlay.classList.remove('active');

    const appRoot = document.getElementById('app-main');
    if (!appRoot) return;

    // The admin is a full-screen app: no storefront header, menu or footer.
    document.body.classList.toggle('admin-mode', path === 'admin' || path.startsWith('admin/'));

    // Route matching
    if (path === 'home') {
      await HomePage.render(appRoot);
    } else if (path === 'shop') {
      await ShopPage.render(appRoot, urlParams);
    } else if (path.startsWith('category/')) {
      const slug = path.replace('category/', '');
      await CategoryPage.render(appRoot, slug, urlParams);
    } else if (path.startsWith('collection/')) {
      const slug = path.replace('collection/', '');
      await CollectionPage.render(appRoot, slug, urlParams);
    } else if (path.startsWith('product/')) {
      const productId = path.replace('product/', '');
      await ProductPage.render(appRoot, productId);
    } else if (path === 'cart') {
      CartPage.render(appRoot);
    } else if (path === 'checkout') {
      await CheckoutPage.render(appRoot);
    } else if (path.startsWith('order-success/')) {
      const orderNum = path.replace('order-success/', '');
      await OrderConfirmationPage.render(appRoot, orderNum);
    } else if (path === 'track') {
      const trackNum = urlParams.get('num') || '';
      // Prefill the phone when this browser placed the order, so the "Track Order"
      // button on the confirmation page still works in one click.
      let trackPhone = '';
      try {
        trackPhone = sessionStorage.getItem(`zavyaan_order_phone_${trackNum}`) || '';
      } catch (err) { /* storage unavailable */ }
      await OrderTrackingPage.render(appRoot, trackNum, trackPhone);
    } else if (path === 'account' || path.startsWith('account/')) {
      const subRoute = path.startsWith('account/') ? path.replace('account/', '') : '';
      await AccountPage.render(appRoot, subRoute);
    } else if (path === 'about') {
      ContentPages.renderAbout(appRoot);
    } else if (path === 'contact') {
      ContentPages.renderContact(appRoot);
    } else if (path === 'faq') {
      ContentPages.renderFaq(appRoot);
    } else if (['shipping-policy', 'returns-policy', 'privacy-policy', 'terms'].includes(path)) {
      ContentPages.renderPolicy(appRoot, path);
    } else if (path === 'admin' || path.startsWith('admin/')) {
      // PRESERVED ADMIN VIEW — #admin/<tab> deep-links a tab (e.g. #admin/storefront)
      const tab = path.startsWith('admin/') ? path.replace('admin/', '') : 'dashboard';
      await this.renderAdminView(appRoot, tab);
    } else {
      await HomePage.render(appRoot);
    }
  },

  // Admin Portal Entry Point — login gate first
  async renderAdminView(container, initialTab = 'dashboard') {
    if (!API.getToken()) {
      this.renderAdminLogin(container, initialTab);
      return;
    }
    try {
      await API.adminMe();
    } catch (e) {
      this.renderAdminLogin(container, initialTab, e.message);
      return;
    }
    this.renderAdminShell(container, initialTab);
  },

  renderAdminLogin(container, nextTab = 'dashboard', notice = '') {
    container.innerHTML = `
      <div class="admin-login-wrap">
        <form class="admin-login-card" onsubmit="AppRouter.handleAdminLogin(event, '${nextTab}')">
          <img src="assets/brand/zavyaan-mark-black.png" alt="" width="72" style="width: 72px; height: auto; margin-bottom: 8px;">
          <h1>Admin Sign In</h1>
          <p class="admin-login-sub">Zavyaan Store Management</p>
          ${notice ? `<div class="admin-login-notice">${Utils.escapeHtml(notice)}</div>` : ''}
          <div class="form-group">
            <label class="form-label" for="admin-login-user">Username</label>
            <input id="admin-login-user" class="form-control" autocomplete="username" required autofocus>
          </div>
          <div class="form-group">
            <label class="form-label" for="admin-login-pass">Password</label>
            <input id="admin-login-pass" type="password" class="form-control" autocomplete="current-password" required>
          </div>
          <div id="admin-login-error" class="admin-login-error" hidden></div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="admin-login-btn">Sign In</button>
          <a href="#home" class="admin-login-back">&larr; Back to store</a>
        </form>
      </div>`;
  },

  async handleAdminLogin(e, nextTab) {
    e.preventDefault();
    const btn = document.getElementById('admin-login-btn');
    const err = document.getElementById('admin-login-error');
    btn.disabled = true; btn.textContent = 'Signing in…'; err.hidden = true;
    try {
      const res = await API.adminLogin(document.getElementById('admin-login-user').value.trim(), document.getElementById('admin-login-pass').value);
      API.setToken(res.token);
      if (res.replaced_session) State.showToast('Signed in — your other device has been signed out.');
      this.renderAdminShell(document.getElementById('app-main'), nextTab);
    } catch (ex) {
      err.textContent = ex.message; err.hidden = false;
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  },

  async adminLogout() {
    if (window.Admin) Admin.stopLivePolling();
    await API.adminLogout();
    location.hash = '#admin';
    this.renderAdminLogin(document.getElementById('app-main'));
  },

  renderAdminShell(container, initialTab = 'dashboard') {
    container.innerHTML = `
      <div class="admin-layout">
        <aside class="admin-sidebar">
          <div style="padding: 0 24px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 12px;">
            <img src="assets/brand/zavyaan-mark-white.png" alt="" width="44" height="30" style="width: 44px; height: auto;">
            <div>
              <div style="font-weight: 800; font-size: 1.15rem; color: #ffffff; letter-spacing: 2px;">ZAVYAAN</div>
              <div style="font-size: 0.68rem; color: var(--color-gold-primary); text-transform: uppercase; letter-spacing: 0.1em;">Store Management</div>
            </div>
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
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="storefront" onclick="Admin.switchTab('storefront')">
                <span>⚙️</span> Storefront &amp; Payments
              </a>
            </li>
            <li class="admin-menu-section">Accounts</li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="vendors" onclick="Admin.switchTab('vendors')">
                <span>🏭</span> Vendors &amp; Purchases
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="expenses" onclick="Admin.switchTab('expenses')">
                <span>📉</span> Expenses
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" data-tab="accounts" onclick="Admin.switchTab('accounts')">
                <span>📈</span> Profit &amp; Ledger
              </a>
            </li>
            <li class="admin-menu-item" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
              <a href="#home" target="_blank" rel="noopener" title="Opens the shop in a new tab">
                <span>🌐</span> View Store ↗
              </a>
            </li>
            <li class="admin-menu-item">
              <a href="javascript:void(0)" onclick="AppRouter.adminLogout()">
                <span>🔒</span> Sign Out
              </a>
            </li>
          </ul>
        </aside>

        <main class="admin-main" id="admin-tab-content">
          <!-- Populated by Admin.switchTab() -->
        </main>
      </div>

      <div id="admin-modal" class="modal-overlay">
        <div class="modal-container" style="max-width: 640px; padding: 32px;" id="admin-modal-body"></div>
      </div>
    `;

    if (window.Admin && typeof window.Admin.switchTab === 'function') {
      const known = ['dashboard', 'categories', 'products', 'orders', 'storefront', 'vendors', 'expenses', 'accounts'];
      window.Admin.switchTab(known.includes(initialTab) ? initialTab : 'dashboard');
    }
  }
};

window.AppRouter = AppRouter;
// Bridge with existing Router
window.Router = AppRouter;
