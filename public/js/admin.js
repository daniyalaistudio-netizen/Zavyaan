// ==========================================================
// ZAVYAAN ADMIN PANEL CONTROLLER
// Brand: ZAVYAAN | Tagline: "Discover More. Live Better."
// ==========================================================

const Admin = {
  currentTab: 'dashboard',
  cachedCategories: [],
  cachedProducts: [],
  cachedOrders: [],

  async init() {
    await this.loadStats();
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-menu-item a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`.admin-menu-item a[data-tab="${tabName}"]`);
    if (link) link.classList.add('active');

    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    if (tabName === 'dashboard') this.renderDashboard();
    else if (tabName === 'products') this.renderProducts();
    else if (tabName === 'categories') this.renderCategories();
    else if (tabName === 'orders') this.renderOrders();
    else if (tabName === 'storefront') this.renderStorefront();
    else if (tabName === 'vendors') this.renderVendors();
    else if (tabName === 'expenses') this.renderExpenses();
    else if (tabName === 'accounts') this.renderAccounts();
    else if (tabName === 'users') this.renderUsers();

    // Live order feed only runs while the dashboard is open
    if (tabName !== 'dashboard') this.stopLivePolling();
  },

  // Shared on/off switch (gold when on). `onchange` receives this.checked.
  toggleSwitch(checked, onchange, labelOn = 'Enabled', labelOff = 'Disabled', size = '') {
    return `
      <label class="admin-toggle ${checked ? 'on' : ''} ${size}" onclick="event.stopPropagation()">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="${onchange}">
        <span class="admin-toggle-track"><span class="admin-toggle-thumb"></span></span>
        <span class="admin-toggle-label" data-pair="${labelOn}|${labelOff}">${checked ? labelOn : labelOff}</span>
      </label>`;
  },

  // Called by the API client on any 401: stop polling and show the login form.
  onSessionLost(message) {
    this.stopLivePolling();
    if (location.hash.indexOf('#admin') === 0 && window.AppRouter) {
      const tab = this.currentTab || 'dashboard';
      AppRouter.renderAdminLogin(document.getElementById('app-main'), tab, message || 'Please sign in again.');
    }
  },

  // Storefront navigation must reflect category changes immediately.
  refreshStorefrontNav() {
    return API.getCategories(false)
      .then(res => HeaderComponent.renderNavigation(res.categories || []))
      .catch(() => {});
  },

  // 1. Dashboard View — live analytics
  // Polls /api/admin/analytics every 30s while open so new orders appear
  // without a reload. Charts are single-series (muted gold) with values at
  // the tips and a table view, so nothing depends on colour alone.
  livePollTimer: null,
  lastOrdersTotal: null,
  dashboardDays: 14,

  async renderDashboard() {
    const content = document.getElementById('admin-tab-content');
    if (!content.querySelector('#dash-root')) {
      content.innerHTML = `<div class="admin-loading">Loading analytics...</div>`;
    }
    try {
      const a = await API.getAnalytics(this.dashboardDays);
      const k = a.kpis;
      const f = a.finance;
      const fmtP = (v) => UI.formatPrice(Number(v) || 0);
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const shortDay = (d) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });

      // New order arrived since last poll → toast so the owner notices
      if (this.lastOrdersTotal !== null && k.orders_total > this.lastOrdersTotal) {
        const n = k.orders_total - this.lastOrdersTotal;
        State.showToast(`🔔 ${n} new order${n === 1 ? '' : 's'} just came in!`);
      }
      this.lastOrdersTotal = k.orders_total;

      const byDay = a.by_day.map(d => ({ label: shortDay(d.date), short: String(new Date(d.date).getUTCDate()).padStart(2, '0'), value: d.orders, hint: fmtP(d.revenue) }));
      const byCategory = a.by_category.map(c => ({ label: c.name, value: c.units, hint: `${c.orders} order${c.orders === 1 ? '' : 's'} · ${fmtP(c.revenue)}` }));
      const byProduct = a.by_product.slice(0, 8).map(p => ({ label: p.title, value: p.units, hint: `${fmtP(p.revenue)} revenue${p.profit !== null && p.profit !== undefined ? ' · ' + fmtP(p.profit) + ' profit' : ''}` }));
      const byStatus = a.by_status.filter(x => x.count > 0).map(x => ({ label: x.status, value: x.count }));

      content.innerHTML = `
        <div id="dash-root">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Store Overview</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">
              <span class="live-dot" title="Auto-refreshes every 30 seconds"></span> Live · updated ${new Date(a.generated_at).toLocaleTimeString('en-PK')}
            </p>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <select class="form-control" style="width: auto; padding: 6px 10px; font-size: 0.8rem;" onchange="Admin.dashboardDays = Number(this.value); Admin.renderDashboard();">
              ${[7, 14, 30, 60, 90].map(d => `<option value="${d}" ${this.dashboardDays === d ? 'selected' : ''}>Last ${d} days</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-primary" onclick="Admin.renderDashboard()">↻ Refresh</button>
          </div>
        </div>

        <!-- Orders -->
        <div class="stats-kpi-grid">
          ${this.kpi('Orders today', k.orders_today, '🛒', fmtP(k.revenue_today) + ' today')}
          ${this.kpi('Awaiting confirmation', k.pending, '⏳', 'call / WhatsApp to confirm', k.pending > 0 ? 'kpi-warn' : '')}
          ${this.kpi('In progress', k.in_progress, '🚚', 'confirmed → out for delivery')}
          ${this.kpi('Delivered', k.delivered, '✅', `${k.exceptions} cancelled / returned`)}
          ${this.kpi('Avg. order value', fmtP(k.average_order_value), '🧾', `${k.orders_total} orders total`)}
        </div>

        <!-- Money (owner only — staff accounts don't receive finance data) -->
        ${f ? `
        <div class="stats-kpi-grid">
          ${this.kpi('Revenue', fmtP(f.revenue), '💰', 'all completed & in-progress sales')}
          ${this.kpi('Cost of goods', fmtP(f.cogs), '📦', `${f.gross_margin_pct}% gross margin`)}
          ${this.kpi('Expenses', fmtP(f.expenses), '📉')}
          ${this.kpi('Net profit', fmtP(f.net_profit), f.net_profit >= 0 ? '📈' : '⚠️', `${f.net_margin_pct}% of revenue`, f.net_profit >= 0 ? 'kpi-good' : 'kpi-warn')}
          ${this.kpi('Owed to vendors', fmtP(a.vendor_totals.pending_balance), '🏭', `${a.vendor_totals.items_sourced} items sourced`, a.vendor_totals.pending_balance > 0 ? 'kpi-warn' : '')}
        </div>` : ''}

        <!-- Stock -->
        <div class="stats-kpi-grid">
          ${this.kpi('Products live', `${k.products_live} / ${k.products_total}`, '🛍️')}
          ${this.kpi('Units in stock', k.stock_units.toLocaleString('en-PK'), '📦', k.stock_value_at_cost !== null && k.stock_value_at_cost !== undefined ? fmtP(k.stock_value_at_cost) + ' at landed cost' : '')}
          ${this.kpi('Low stock (≤ 5)', k.low_stock, '↓', k.low_stock > 0 ? 'reorder soon' : 'all healthy', k.low_stock > 0 ? 'kpi-warn' : '')}
        </div>

        <div class="admin-two-col">
          <section class="admin-card">
            <div class="admin-card-head"><h3>Orders per day</h3><span class="card-sub">last ${a.window_days} days · hover for revenue</span></div>
            ${a.by_day.some(d => d.orders > 0) ? AdminCharts.columns(byDay, { id: 'chart-days', labelHead: 'Day', valueHead: 'Orders' }) : '<div class="empty-cell">No orders in this period yet.</div>'}
          </section>
          <section class="admin-card">
            <div class="admin-card-head"><h3>Orders by status</h3><span class="card-sub">all time</span></div>
            ${byStatus.length ? AdminCharts.hbars(byStatus, { id: 'chart-status', labelHead: 'Status', valueHead: 'Orders' }) : '<div class="empty-cell">No orders yet.</div>'}
          </section>
        </div>

        <div class="admin-two-col">
          <section class="admin-card">
            <div class="admin-card-head"><h3>Units ordered by category</h3><span class="card-sub">excludes cancelled / returned</span></div>
            ${byCategory.length ? AdminCharts.hbars(byCategory, { id: 'chart-cat', labelHead: 'Category', valueHead: 'Units' }) : '<div class="empty-cell">No sales yet.</div>'}
          </section>
          <section class="admin-card">
            <div class="admin-card-head"><h3>Top products by units</h3><span class="card-sub">hover for revenue${f ? ' & profit' : ''}</span></div>
            ${byProduct.length ? AdminCharts.hbars(byProduct, { id: 'chart-prod', labelHead: 'Product', valueHead: 'Units' }) : '<div class="empty-cell">No sales yet.</div>'}
          </section>
        </div>

        <div class="admin-two-col admin-two-col-wide">
          <section class="admin-card">
            <div class="admin-card-head">
              <h3>Incoming orders</h3>
              <a href="javascript:void(0)" onclick="Admin.switchTab('orders')" class="btn btn-sm btn-secondary">Manage all</a>
            </div>
            <div class="table-responsive">
              <table class="admin-table">
                <thead><tr><th>Order #</th><th>Customer</th><th>Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th>When</th><th></th></tr></thead>
                <tbody>
                  ${a.incoming.length ? a.incoming.map(o => `
                    <tr>
                      <td><strong>${esc(o.order_number)}</strong></td>
                      <td>${esc(o.customer_name)}<br><small style="color: var(--color-text-secondary);">${esc(o.city)}</small></td>
                      <td class="items-cell" title="${esc(o.items.join(', '))}">${o.items_count} item${o.items_count === 1 ? '' : 's'}<br><small style="color: var(--color-text-secondary);">${esc(o.items.slice(0, 2).join(', '))}${o.items.length > 2 ? '…' : ''}</small></td>
                      <td class="num"><strong>${fmtP(o.total_amount)}</strong></td>
                      <td>${esc(SettingsService.paymentLabel(o.payment_method))}</td>
                      <td><span class="status-pill status-${OrderStatus.slug(o.order_status)}">${esc(o.order_status)}</span></td>
                      <td>${this.timeAgo(o.created_at)}</td>
                      <td><button class="btn btn-sm btn-secondary" onclick="Admin.viewOrderDetails('${o.id}')">Manage</button></td>
                    </tr>
                  `).join('') : `<tr><td colspan="8" class="empty-cell">No orders received yet. New orders appear here automatically.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
          <section class="admin-card">
            <div class="admin-card-head"><h3>Low stock</h3><a href="javascript:void(0)" onclick="Admin.switchTab('products')" class="btn btn-sm btn-secondary">Products</a></div>
            ${a.low_stock.length ? `
              <ul class="low-stock-list">
                ${a.low_stock.map(p => `<li><span>${esc(p.title)}</span><strong>${p.stock_quantity} left</strong><button class="btn btn-sm btn-secondary" onclick="Admin.openPurchaseModal('${p.id}')">Stock in</button></li>`).join('')}
              </ul>` : '<div class="empty-cell">Every product has more than 5 units in stock.</div>'}
          </section>
        </div>
        </div>
      `;

      this.startLivePolling();
    } catch (e) {
      content.innerHTML = `<div class="admin-error">Error loading dashboard: ${Utils.escapeHtml(e.message)}</div>`;
    }
  },

  startLivePolling() {
    this.stopLivePolling();
    this.livePollTimer = setInterval(() => {
      if (this.currentTab !== 'dashboard' || !document.getElementById('dash-root') || location.hash.indexOf('#admin') !== 0) {
        this.stopLivePolling();
        return;
      }
      // Do not re-render over an open modal
      const modal = document.getElementById('admin-modal');
      if (modal && modal.classList.contains('active')) return;
      this.renderDashboard();
    }, 30000);
  },

  stopLivePolling() {
    if (this.livePollTimer) { clearInterval(this.livePollTimer); this.livePollTimer = null; }
  },

  timeAgo(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hr${h === 1 ? '' : 's'} ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? 'yesterday' : `${d} days ago`;
  },

  // 2. Categories Manager View
  async renderCategories() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">Loading categories...</div>`;

    try {
      const { categories } = await API.getCategories(true);
      this.cachedCategories = categories;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Category Management</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">Create, edit, activate, or deactivate store categories dynamically.</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-sm btn-secondary" onclick="Admin.openNewSubcategoryModal()">+ Add Subcategory</button>
            <button class="btn btn-sm btn-primary" onclick="Admin.openNewCategoryModal()">+ Add Category</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 20px;">
          ${categories.map(cat => `
            <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 20px; box-shadow: var(--shadow-sm);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 40px; height: 40px; border-radius: var(--radius-xs); background: var(--color-ivory); border: 1px solid var(--color-border-light); display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                    📁
                  </div>
                  <div>
                    <h4 style="font-size: 1rem; color: var(--color-primary-black);">${cat.name}</h4>
                    <span style="font-size: 0.75rem; color: var(--color-text-secondary);">Slug: /category/${cat.slug}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  ${this.toggleSwitch(cat.is_active, `Admin.toggleCategoryActive('${cat.id}', this.checked)`, 'Live on store', 'Hidden')}
                  <button class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 4px 10px;" title="Permanently delete this category and its subcategories" onclick="Admin.deleteCategory('${cat.id}')">🗑 Delete</button>
                </div>
              </div>

              <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 14px;">${cat.description || 'No description set.'}</p>

              <div style="border-top: 1px solid var(--color-border-light); padding-top: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-primary-black); text-transform: uppercase;">Subcategories (${(cat.subcategories || []).length})</span>
                  <a href="javascript:void(0)" onclick="Admin.openNewSubcategoryModal('${cat.id}')" style="font-size: 0.78rem; color: var(--color-gold-muted); font-weight: 600;">+ Add</a>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${(cat.subcategories && cat.subcategories.length > 0) ? cat.subcategories.map(sub => `
                    <span style="background: var(--color-ivory); border: 1px solid ${sub.is_active === false ? 'var(--color-border-medium)' : 'var(--color-gold-border)'}; padding: 4px 8px; border-radius: var(--radius-xs); font-size: 0.78rem; display: inline-flex; align-items: center; gap: 6px; ${sub.is_active === false ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
                      ${sub.name}
                      <input type="checkbox" title="${sub.is_active === false ? 'Show on store' : 'Hide from store'}" ${sub.is_active === false ? '' : 'checked'} style="width: 14px; height: 14px; accent-color: var(--color-gold-primary); cursor: pointer;" onchange="Admin.toggleSubcategoryActive('${sub.id}', '${cat.id}', this.checked)">
                      <button title="Delete" style="background: none; border: none; cursor: pointer; color: var(--color-status-error); font-size: 0.8rem;" onclick="Admin.deleteSubcategory('${sub.id}')">×</button>
                    </span>
                  `).join('') : '<span style="font-size: 0.78rem; color: var(--color-text-muted); font-style: italic;">No subcategories</span>'}
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="color: var(--color-status-error); padding: 30px;">Error loading categories: ${e.message}</div>`;
    }
  },

  async toggleCategoryActive(id, newStatus) {
    try {
      await API.updateCategory(id, { is_active: newStatus });
      State.showToast(`Category updated.`);
      await this.renderCategories();
      await this.refreshStorefrontNav();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async deleteCategory(id) {
    if (!confirm('Delete this category permanently? Its subcategories are removed too, and its products will no longer show on the store. If you just want to hide it, use the Live/Hidden button instead.')) return;
    try {
      await API.deleteCategory(id);
      State.showToast('Category deleted.');
      await this.renderCategories();
      await this.refreshStorefrontNav();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async toggleSubcategoryActive(id, categoryId, newStatus) {
    try {
      const cat = this.cachedCategories.find(c => c.id === categoryId);
      const sub = cat && (cat.subcategories || []).find(x => x.id === id);
      if (!sub) throw new Error('Subcategory not found in cache');
      await API.request(`/categories/subcategories/${id}`, { method: 'PUT', body: JSON.stringify({ ...sub, is_active: newStatus }) });
      State.showToast(`Subcategory ${newStatus ? 'shown on' : 'hidden from'} store.`);
      await this.renderCategories();
      await this.refreshStorefrontNav();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async deleteSubcategory(id) {
    if (!confirm('Are you sure you want to delete this subcategory?')) return;
    try {
      await API.deleteSubcategory(id);
      State.showToast('Subcategory deleted.');
      await this.renderCategories();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  openNewCategoryModal() {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
      <h3 style="font-size: 1.25rem; margin-bottom: 20px; color: var(--color-primary-black);">Create New Category</h3>
      <form id="new-cat-form" onsubmit="Admin.handleCreateCategory(event)">
        <div class="form-group">
          <label class="form-label">Category Name <span class="req">*</span></label>
          <input type="text" id="cat-name-input" class="form-control" placeholder="e.g. Footwear & Accessories" required>
        </div>
        <div class="form-group">
          <label class="form-label">Custom Slug (optional)</label>
          <input type="text" id="cat-slug-input" class="form-control" placeholder="e.g. footwear-accessories">
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="cat-desc-input" class="form-control" rows="2" placeholder="Category highlights"></textarea>
        </div>
        <div class="form-group" style="display: flex; gap: 10px; align-items: center; margin-top: 14px;">
          <input type="checkbox" id="cat-active-input" checked style="width: 16px; height: 16px; accent-color: var(--color-primary-black);">
          <label for="cat-active-input" style="font-size: 0.85rem; font-weight: 600; cursor: pointer;">Activate immediately on store</label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Category</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  },

  async handleCreateCategory(e) {
    e.preventDefault();
    const name = document.getElementById('cat-name-input').value;
    const slug = document.getElementById('cat-slug-input').value;
    const description = document.getElementById('cat-desc-input').value;
    const is_active = document.getElementById('cat-active-input').checked;

    try {
      await API.createCategory({ name, slug, description, is_active });
      State.showToast(`Category "${name}" created.`);
      document.getElementById('admin-modal').classList.remove('active');
      await this.renderCategories();
      await this.refreshStorefrontNav();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  openNewSubcategoryModal(preselectedCatId = null) {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `
      <h3 style="font-size: 1.25rem; margin-bottom: 20px; color: var(--color-primary-black);">Create Subcategory</h3>
      <form id="new-sub-form" onsubmit="Admin.handleCreateSubcategory(event)">
        <div class="form-group">
          <label class="form-label">Parent Category <span class="req">*</span></label>
          <select id="sub-parent-cat" class="form-control" required>
            ${this.cachedCategories.map(c => `
              <option value="${c.id}" ${c.id === preselectedCatId ? 'selected' : ''}>${c.name}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Subcategory Name <span class="req">*</span></label>
          <input type="text" id="sub-name-input" class="form-control" placeholder="e.g. Leather Wallets" required>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Subcategory</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  },

  async handleCreateSubcategory(e) {
    e.preventDefault();
    const category_id = document.getElementById('sub-parent-cat').value;
    const name = document.getElementById('sub-name-input').value;

    try {
      await API.createSubcategory({ category_id, name, is_active: true });
      State.showToast(`Subcategory "${name}" created.`);
      document.getElementById('admin-modal').classList.remove('active');
      await this.renderCategories();
      await this.refreshStorefrontNav();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  // 3. Products Manager View
  async renderProducts() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">Loading products...</div>`;

    try {
      const { products } = await API.getProducts({ all: true, limit: 100 });
      this.cachedProducts = products;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Product Management</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">Manage catalog inventory, prices, variants, and imagery.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="Admin.openImageLibrary()">🖼 Image Library</button>
            <button class="btn btn-secondary" onclick="Admin.openBulkUploadModal()">⬆ Bulk Upload (CSV)</button>
            <button class="btn btn-primary" onclick="Admin.openNewProductModal()">+ Add New Product</button>
          </div>
        </div>

        <div class="bulk-bar" id="prod-bulk-bar" hidden>
          <span id="prod-bulk-count">0 selected</span>
          <button class="btn btn-sm btn-gold" onclick="Admin.bulkProducts('is_active', true)">Enable on store</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.bulkProducts('is_active', false)">Disable</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.bulkProducts('is_featured', true)">★ Feature</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.bulkProducts('is_featured', false)">Unfeature</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.clearProductSelection()">Clear</button>
        </div>

        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th style="width: 32px;"><input type="checkbox" title="Select all" style="width: 15px; height: 15px; accent-color: var(--color-gold-primary);" onchange="Admin.selectAllProducts(this.checked)"></th>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th title="Landed cost per unit: vendor price + delivery + extra">Cost / Margin</th>
                <th>Stock</th>
                <th title="Shown in the homepage Featured Highlights section">Featured</th>
                <th>Best Seller</th>
                <th>Visibility</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr class="${p.is_active ? '' : 'row-disabled'}">
                  <td><input type="checkbox" class="prod-select" value="${p.id}" style="width: 15px; height: 15px; accent-color: var(--color-gold-primary);" onchange="Admin.updateProductSelection()"></td>
                  <td class="wrap-cell" style="max-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <img src="${(p.images && p.images[0]) ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].image_url) : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" style="width: 40px; height: 40px; border-radius: var(--radius-xs); object-fit: cover; flex-shrink: 0;">
                      <div>
                        <strong style="font-size: 0.84rem; line-height: 1.3; display: block;">${p.title}</strong>
                        <div style="font-size: 0.72rem; color: var(--color-text-secondary);">SKU: ${p.sku || 'N/A'}</div>
                      </div>
                    </div>
                  </td>
                  <td style="font-size: 0.82rem;">${p.category_name || 'N/A'}<br><small style="color: var(--color-text-secondary);">${p.subcategory_name || ''}</small></td>
                  <td>
                    ${p.sale_price ? `<strong style="color: var(--color-gold-muted);">${UI.formatPrice(p.sale_price)}</strong><br><small style="text-decoration: line-through; color: var(--color-text-muted);">${UI.formatPrice(p.regular_price)}</small>` : `<strong>${UI.formatPrice(p.regular_price)}</strong>`}
                  </td>
                  <td>
                    ${Number(p.cost_price) > 0 ? (() => {
                      const sell = Number(p.sale_price) > 0 ? Number(p.sale_price) : Number(p.regular_price);
                      const margin = sell - Number(p.cost_price);
                      const pct = sell > 0 ? Math.round((margin / sell) * 100) : 0;
                      return `${UI.formatPrice(p.cost_price)}<br><small style="color: ${margin >= 0 ? 'var(--color-gold-muted)' : 'var(--color-status-error)'}; font-weight: 700;">${margin >= 0 ? '+' : ''}${UI.formatPrice(margin)} (${pct}%)</small>`;
                    })() : `<a href="javascript:void(0)" onclick="Admin.openEditProductModal('${p.id}')" style="font-size: 0.78rem; color: var(--color-gold-muted); font-weight: 600;">Set cost →</a>`}
                  </td>
                  <td>
                    <div class="stock-control ${p.stock_quantity <= 5 ? 'low' : ''}">
                      <button title="Remove one" onclick="Admin.adjustStock('${p.id}', -1)">−</button>
                      <input type="number" min="0" value="${p.stock_quantity}" title="Type a quantity and press Enter" onkeydown="if(event.key==='Enter'){Admin.setStockValue('${p.id}', this.value)}" onblur="if(Number(this.value)!==${Number(p.stock_quantity)}){Admin.setStockValue('${p.id}', this.value)}">
                      <button title="Add one" onclick="Admin.adjustStock('${p.id}', 1)">+</button>
                    </div>
                    <a href="javascript:void(0)" onclick="Admin.openPurchaseModal('${p.id}')" style="display: block; margin-top: 4px; font-size: 0.72rem; color: var(--color-gold-muted); font-weight: 600;">+ Stock in</a>
                  </td>
                  <td>
                    <button class="btn btn-sm ${p.is_featured ? 'btn-gold' : 'btn-secondary'}" style="font-size: 0.72rem; padding: 3px 8px;" title="${p.is_featured ? 'Remove from Featured Highlights' : 'Add to Featured Highlights'}" onclick="Admin.toggleProductFlag('${p.id}', 'is_featured', ${!p.is_featured})">
                      ${p.is_featured ? '★ Featured' : '☆ Feature'}
                    </button>
                  </td>
                  <td>
                    <button class="btn btn-sm ${p.is_bestseller ? 'btn-primary' : 'btn-secondary'}" style="font-size: 0.72rem; padding: 3px 8px;" onclick="Admin.toggleProductFlag('${p.id}', 'is_bestseller', ${!p.is_bestseller})">
                      ${p.is_bestseller ? 'Best Seller' : 'Mark'}
                    </button>
                  </td>
                  <td>${this.toggleSwitch(p.is_active, `Admin.toggleProductActive('${p.id}', this.checked)`, 'Live', 'Hidden', 'sm')}</td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-secondary" style="font-size: 0.72rem; padding: 3px 10px;" onclick="Admin.openEditProductModal('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-secondary" style="font-size: 0.72rem; padding: 3px 10px;" title="Permanently delete this product" onclick="Admin.deleteProduct('${p.id}')">🗑</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="color: var(--color-status-error); padding: 30px;">Error loading products: ${e.message}</div>`;
    }
  },

  selectAllProducts(checked) {
    document.querySelectorAll('.prod-select').forEach(cb => { cb.checked = checked; });
    this.updateProductSelection();
  },

  clearProductSelection() { this.selectAllProducts(false); },

  updateProductSelection() {
    const ids = [...document.querySelectorAll('.prod-select:checked')].map(cb => cb.value);
    const bar = document.getElementById('prod-bulk-bar');
    const count = document.getElementById('prod-bulk-count');
    if (bar) bar.hidden = ids.length === 0;
    if (count) count.textContent = `${ids.length} selected`;
    return ids;
  },

  // Apply one flag to every selected product (enable/disable, feature/unfeature)
  async bulkProducts(flag, value) {
    const ids = this.updateProductSelection();
    if (ids.length === 0) return;
    const verb = flag === 'is_active' ? (value ? 'enable' : 'disable') : (value ? 'feature' : 'unfeature');
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${ids.length} product${ids.length === 1 ? '' : 's'}?`)) return;
    let ok = 0, failed = 0;
    for (const id of ids) {
      try { await API.updateProduct(id, { [flag]: value }); ok++; } catch (e) { failed++; }
    }
    State.showToast(`${ok} product${ok === 1 ? '' : 's'} ${verb}d${failed ? `, ${failed} failed` : ''}.`);
    await this.renderProducts();
  },

  async toggleProductActive(id, newStatus) {
    try {
      await API.updateProduct(id, { is_active: newStatus });
      State.showToast(newStatus ? 'Product is now live on the store.' : 'Product hidden from the store.');
      await this.renderProducts();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  // is_featured drives the homepage Featured Highlights section;
  // is_bestseller drives the "Best Seller" badge on product cards.
  async toggleProductFlag(id, flag, value) {
    try {
      await API.updateProduct(id, { [flag]: value });
      State.showToast(flag === 'is_featured'
        ? (value ? 'Added to Featured Highlights.' : 'Removed from Featured Highlights.')
        : 'Product updated.');
      await this.renderProducts();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async adjustStock(id, delta) {
    try {
      const res = await API.setStock(id, { delta });
      const row = document.querySelector(`.stock-control input[onkeydown*="'${id}'"]`);
      if (row) row.value = res.product.stock_quantity;
      const ctl = row && row.closest('.stock-control');
      if (ctl) ctl.classList.toggle('low', res.product.stock_quantity <= 5);
      const cached = this.cachedProducts.find(p => p.id === id);
      if (cached) cached.stock_quantity = res.product.stock_quantity;
    } catch (e) { alert('Error: ' + e.message); }
  },

  async setStockValue(id, value) {
    const qty = Math.max(0, Math.floor(Number(value) || 0));
    try {
      const res = await API.setStock(id, { stock_quantity: qty });
      State.showToast(`Stock set to ${res.product.stock_quantity}.`);
      const cached = this.cachedProducts.find(p => p.id === id);
      if (cached) cached.stock_quantity = res.product.stock_quantity;
      await this.renderProducts();
    } catch (e) { alert('Error: ' + e.message); }
  },

  // Full product editor with the landed-cost calculator.
  // Landed cost = vendor price + delivery + extra (marketing / buffer).
  async openEditProductModal(id) {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;
    if (this.cachedCategories.length === 0) {
      const res = await API.getCategories(true);
      this.cachedCategories = res.categories;
    }
    let p = this.cachedProducts.find(x => x.id === id);
    if (!p) { const r = await API.request(`/products/${id}?all=true`); p = r.product; }
    if (!p) return alert('Product not found');
    const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
    const img = (p.images && p.images[0]) ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].image_url) : '';
    const subs = (this.cachedCategories.find(c => c.id === p.category_id) || {}).subcategories || [];

    modalBody.innerHTML = `
      <h3 class="modal-title">Edit Product</h3>
      <form id="edit-prod-form" onsubmit="Admin.handleUpdateProduct(event, '${p.id}')">
        <div class="form-group">
          <label class="form-label">Product Title <span class="req">*</span></label>
          <input type="text" id="ep-title" class="form-control" value="${esc(p.title)}" required>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Category <span class="req">*</span></label>
            <select id="ep-cat" class="form-control" required>
              ${this.cachedCategories.map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subcategory</label>
            <select id="ep-sub" class="form-control">
              <option value="">— none —</option>
              ${subs.map(sc => `<option value="${sc.id}" ${sc.id === p.subcategory_id ? 'selected' : ''}>${esc(sc.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Regular Price (PKR) <span class="req">*</span></label>
            <input type="number" id="ep-reg" class="form-control" value="${esc(p.regular_price)}" required min="0" oninput="Admin.recalcProductCost()">
          </div>
          <div class="form-group">
            <label class="form-label">Sale Price (PKR)</label>
            <input type="number" id="ep-sale" class="form-control" value="${esc(p.sale_price || '')}" min="0" oninput="Admin.recalcProductCost()">
          </div>
        </div>

        <fieldset class="cost-fieldset">
          <legend>Product cost calculation (per unit)</legend>
          <div class="form-row-3">
            <div class="form-group">
              <label class="form-label">Vendor purchase price</label>
              <input type="number" id="ep-cost-base" class="form-control" value="${esc(p.cost_base || '')}" min="0" step="0.01" placeholder="1500" oninput="Admin.recalcProductCost()">
            </div>
            <div class="form-group">
              <label class="form-label">+ Delivery / shipping</label>
              <input type="number" id="ep-cost-ship" class="form-control" value="${esc(p.cost_shipping || '')}" min="0" step="0.01" placeholder="50" oninput="Admin.recalcProductCost()">
            </div>
            <div class="form-group">
              <label class="form-label">+ Marketing / buffer</label>
              <input type="number" id="ep-cost-extra" class="form-control" value="${esc(p.cost_extra || '')}" min="0" step="0.01" placeholder="200" oninput="Admin.recalcProductCost()">
            </div>
          </div>
          <div class="cost-calc">
            <div><span>Landed cost</span><strong id="ep-calc-landed">Rs. 0</strong><small>base + delivery + extra</small></div>
            <div><span>Selling price</span><strong id="ep-calc-sell">Rs. 0</strong><small>sale price if set</small></div>
            <div class="cost-calc-main"><span>Profit per unit</span><strong id="ep-calc-margin">Rs. 0</strong><small id="ep-calc-pct"></small></div>
          </div>
          <p class="cost-note">Current landed cost on record: <strong>${p.cost_price ? UI.formatPrice(p.cost_price) : 'not set'}</strong>${p.cost_price ? ' (weighted average of purchases and manual entries)' : ''}. Saving this breakdown replaces it. Recording a purchase under Vendors updates it automatically.</p>
        </fieldset>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Stock Quantity</label>
            <input type="number" id="ep-stock" class="form-control" value="${esc(p.stock_quantity)}" min="0">
          </div>
          <div class="form-group">
            <label class="form-label">SKU</label>
            <input type="text" id="ep-sku" class="form-control" value="${esc(p.sku || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="ep-desc" class="form-control" rows="3">${esc(p.description || '')}</textarea>
        </div>
        ${this.imageField('ep-img', img)}
        <div class="form-group" style="display: flex; gap: 22px; flex-wrap: wrap; margin-top: 14px;">
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="ep-featured" ${p.is_featured ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> ★ Featured Highlight</label>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="ep-bestseller" ${p.is_bestseller ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Best Seller badge</label>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="ep-trending" ${p.is_trending ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Trending</label>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;"><input type="checkbox" id="ep-active" ${p.is_active ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Live on store</label>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Product</button>
        </div>
      </form>
    `;
    modal.classList.add('active');
    this.recalcProductCost();
  },

  recalcProductCost() {
    const g = (id) => Number((document.getElementById(id) || {}).value) || 0;
    const landed = g('ep-cost-base') + g('ep-cost-ship') + g('ep-cost-extra');
    const sell = g('ep-sale') > 0 ? g('ep-sale') : g('ep-reg');
    const margin = sell - landed;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('ep-calc-landed', UI.formatPrice(landed));
    set('ep-calc-sell', UI.formatPrice(sell));
    set('ep-calc-margin', (margin < 0 ? '− ' : '') + UI.formatPrice(Math.abs(margin)));
    set('ep-calc-pct', sell > 0 && landed > 0 ? `${Math.round((margin / sell) * 100)}% margin` : 'enter costs to see margin');
    const m = document.getElementById('ep-calc-margin');
    if (m) m.style.color = margin < 0 ? 'var(--color-status-error)' : '';
  },

  async handleUpdateProduct(e, id) {
    e.preventDefault();
    const v = (i) => document.getElementById(i).value;
    const imgUrl = v('ep-img').trim();
    const payload = {
      title: v('ep-title').trim(),
      category_id: v('ep-cat'),
      subcategory_id: v('ep-sub') || null,
      regular_price: Number(v('ep-reg')),
      sale_price: v('ep-sale') ? Number(v('ep-sale')) : null,
      cost_base: Number(v('ep-cost-base')) || 0,
      cost_shipping: Number(v('ep-cost-ship')) || 0,
      cost_extra: Number(v('ep-cost-extra')) || 0,
      stock_quantity: Number(v('ep-stock')) || 0,
      sku: v('ep-sku').trim(),
      description: v('ep-desc'),
      is_featured: document.getElementById('ep-featured').checked,
      is_bestseller: document.getElementById('ep-bestseller').checked,
      is_trending: document.getElementById('ep-trending').checked,
      is_active: document.getElementById('ep-active').checked
    };
    if (imgUrl) payload.images = [{ image_url: imgUrl, alt_text: payload.title }];
    try {
      await API.updateProduct(id, payload);
      State.showToast(`"${payload.title}" saved.`);
      document.getElementById('admin-modal').classList.remove('active');
      if (this.currentTab === 'accounts') await this.renderAccounts(); else await this.renderProducts();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async deleteProduct(id) {
    if (!confirm('Delete this product permanently? If you just want to hide it from the store, use the Live/Hidden button instead.')) return;
    try {
      await API.deleteProduct(id);
      State.showToast('Product deleted.');
      await this.renderProducts();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async openNewProductModal() {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;

    if (this.cachedCategories.length === 0) {
      const res = await API.getCategories(true);
      this.cachedCategories = res.categories;
    }

    modalBody.innerHTML = `
      <h3 style="font-size: 1.25rem; margin-bottom: 20px; color: var(--color-primary-black);">Add Product</h3>
      <form id="new-prod-form" onsubmit="Admin.handleSaveProduct(event)">
        <div class="form-group">
          <label class="form-label">Product Title <span class="req">*</span></label>
          <input type="text" id="prod-title-input" class="form-control" placeholder="e.g. Traditional Embroidered Silk Shawl" required>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Category <span class="req">*</span></label>
            <select id="prod-cat-select" class="form-control" required>
              <option value="">-- Choose Category --</option>
              ${this.cachedCategories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Regular Price (PKR) <span class="req">*</span></label>
            <input type="number" id="prod-reg-price" class="form-control" placeholder="3999" required>
          </div>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Sale Price (PKR)</label>
            <input type="number" id="prod-sale-price" class="form-control" placeholder="2899">
          </div>
          <div class="form-group">
            <label class="form-label">Stock Quantity</label>
            <input type="number" id="prod-stock" class="form-control" value="25">
          </div>
        </div>
        <fieldset class="cost-fieldset">
          <legend>Product cost (per unit, optional — you can also record a vendor purchase later)</legend>
          <div class="form-row-3">
            <div class="form-group"><label class="form-label">Vendor purchase price</label><input type="number" id="prod-cost-base" class="form-control" min="0" step="0.01" placeholder="1500"></div>
            <div class="form-group"><label class="form-label">+ Delivery / shipping</label><input type="number" id="prod-cost-ship" class="form-control" min="0" step="0.01" placeholder="50"></div>
            <div class="form-group"><label class="form-label">+ Marketing / buffer</label><input type="number" id="prod-cost-extra" class="form-control" min="0" step="0.01" placeholder="200"></div>
          </div>
        </fieldset>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea id="prod-desc" class="form-control" rows="3" placeholder="Product details, material, and specifications"></textarea>
        </div>
        ${this.imageField('prod-img')}
        <div class="form-group" style="display: flex; gap: 22px; flex-wrap: wrap; margin-top: 14px;">
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" id="prod-featured-input" style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> ★ Featured Highlight
          </label>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" id="prod-bestseller-input" style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Best Seller badge
          </label>
          <label style="display: flex; gap: 8px; align-items: center; font-size: 0.85rem; font-weight: 600; cursor: pointer;">
            <input type="checkbox" id="prod-active-input" checked style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"> Live on store
          </label>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Product</button>
        </div>
      </form>
    `;

    modal.classList.add('active');
  },

  async handleSaveProduct(e) {
    e.preventDefault();
    const title = document.getElementById('prod-title-input').value;
    const category_id = document.getElementById('prod-cat-select').value;
    const regular_price = Number(document.getElementById('prod-reg-price').value);
    const sale_price = document.getElementById('prod-sale-price').value ? Number(document.getElementById('prod-sale-price').value) : null;
    const stock_quantity = Number(document.getElementById('prod-stock').value) || 0;
    const description = document.getElementById('prod-desc').value;
    const imgUrl = document.getElementById('prod-img').value || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

    try {
      await API.createProduct({
        title,
        category_id,
        regular_price,
        sale_price,
        stock_quantity,
        description,
        cost_base: Number(document.getElementById('prod-cost-base').value) || 0,
        cost_shipping: Number(document.getElementById('prod-cost-ship').value) || 0,
        cost_extra: Number(document.getElementById('prod-cost-extra').value) || 0,
        is_featured: document.getElementById('prod-featured-input').checked,
        is_bestseller: document.getElementById('prod-bestseller-input').checked,
        is_active: document.getElementById('prod-active-input').checked,
        images: [{ image_url: imgUrl, alt_text: title }]
      });
      State.showToast(`Product "${title}" added.`);
      document.getElementById('admin-modal').classList.remove('active');
      await this.renderProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  },

  // 4. Orders Manager View
  async renderOrders() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">Loading orders...</div>`;

    try {
      const { orders } = await API.getOrders({ limit: 100 });
      this.cachedOrders = orders;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Order Management</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">Process orders, shipping addresses, payment methods and status history. Tick orders to print their address sheets.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <select id="orders-status-filter" class="form-control" style="width: auto; padding: 6px 10px; font-size: 0.8rem;" onchange="Admin.filterOrdersTable()">
              <option value="">All statuses</option>
              ${OrderStatus.all().map(st => `<option value="${st}">${st}</option>`).join('')}
            </select>
            <input type="search" id="orders-search" class="form-control" style="width: 220px; padding: 6px 10px; font-size: 0.8rem;" placeholder="Search name, phone, order #, city" oninput="Admin.filterOrdersTable()">
            <button class="btn btn-sm btn-secondary" title="See what the address sheet looks like, with sample data" onclick="Admin.printAddressSheets('sample')">👁 Preview address sheet</button>
          </div>
        </div>

        <div class="bulk-bar" id="orders-bulk-bar" hidden>
          <span id="orders-bulk-count">0 selected</span>
          <button class="btn btn-sm btn-gold" onclick="Admin.printAddressSheets()">🖨 Download address sheet</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.selectAllOrders(false)">Clear</button>
        </div>

        <div class="table-responsive">
          <table class="admin-table" id="orders-table">
            <thead>
              <tr>
                <th style="width: 32px;"><input type="checkbox" title="Select all" style="width: 15px; height: 15px; accent-color: var(--color-gold-primary);" onchange="Admin.selectAllOrders(this.checked)"></th>
                <th>Order #</th>
                <th>Customer</th>
                <th>Phone / WhatsApp</th>
                <th>Location</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Placed On</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="admin-orders-tbody">
              ${orders.map(ord => `
                <tr data-order="${ord.id}" data-status="${Utils.escapeHtml(ord.order_status)}" data-search="${Utils.escapeHtml([ord.order_number, ord.customer_name, ord.customer_phone, ord.customer_whatsapp, ord.city].join(' ').toLowerCase())}">
                  <td><input type="checkbox" class="order-select" value="${ord.id}" style="width: 15px; height: 15px; accent-color: var(--color-gold-primary);" onchange="Admin.updateOrderSelection()"></td>
                  <td><strong>${ord.order_number}</strong></td>
                  <td>${ord.customer_name}</td>
                  <td>
                    ${ord.customer_phone}<br>
                    <a href="https://wa.me/${(ord.customer_whatsapp || ord.customer_phone).replace(/[^0-9]/g, '')}" target="_blank" style="color: var(--color-gold-muted); font-size: 0.78rem; font-weight: 600;">📱 WhatsApp</a>
                  </td>
                  <td>${ord.city}, ${ord.province}</td>
                  <td><strong>${UI.formatPrice(ord.total_amount)}</strong></td>
                  <td style="font-size: 0.8rem;">${Utils.escapeHtml(SettingsService.paymentLabel(ord.payment_method))}</td>
                  <td>
                    <select class="status-pill status-${OrderStatus.slug(ord.order_status)}" onchange="Admin.quickUpdateStatus('${ord.id}', this.value)" style="border: 1px solid var(--color-border-light); font-weight: 700; cursor: pointer; background: var(--color-pure-white);">
                      ${OrderStatus.all().map(st => `
                        <option value="${st}" ${st === ord.order_status ? 'selected' : ''}>${st}</option>
                      `).join('')}
                    </select>
                  </td>
                  <td>${new Date(ord.created_at).toLocaleDateString('en-PK')}</td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-secondary" onclick="Admin.viewOrderDetails('${ord.id}')">View</button>
                    <button class="btn btn-sm btn-secondary" title="Address sheet for this order" onclick="Admin.printAddressSheets(['${ord.id}'])">🖨</button>
                  </td>
                </tr>
              `).join('')}
              ${orders.length === 0 ? `<tr><td colspan="10" class="empty-cell">No orders yet. New orders appear here as customers check out.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      `;
    } catch (e) {
      content.innerHTML = `<div style="color: var(--color-status-error); padding: 30px;">Error loading orders: ${e.message}</div>`;
    }
  },

  filterOrdersTable() {
    const status = (document.getElementById('orders-status-filter') || {}).value || '';
    const q = ((document.getElementById('orders-search') || {}).value || '').trim().toLowerCase();
    document.querySelectorAll('#orders-table tbody tr[data-order]').forEach(tr => {
      const okStatus = !status || tr.dataset.status === status;
      const okSearch = !q || tr.dataset.search.includes(q);
      tr.hidden = !(okStatus && okSearch);
    });
  },

  selectAllOrders(checked) {
    document.querySelectorAll('#orders-table tr[data-order]:not([hidden]) .order-select').forEach(cb => { cb.checked = checked; });
    if (!checked) document.querySelectorAll('.order-select').forEach(cb => { cb.checked = false; });
    this.updateOrderSelection();
  },

  updateOrderSelection() {
    const ids = [...document.querySelectorAll('.order-select:checked')].map(cb => cb.value);
    const bar = document.getElementById('orders-bulk-bar');
    const count = document.getElementById('orders-bulk-count');
    if (bar) bar.hidden = ids.length === 0;
    if (count) count.textContent = `${ids.length} selected`;
    return ids;
  },

  // Address sheet: one branded slip per order, opened in a print view so it
  // can be printed or saved as PDF. Store details come from Storefront settings.
  async printAddressSheets(ids = null) {
    const sample = ids === 'sample';
    const selected = sample ? ['sample'] : (ids || this.updateOrderSelection());
    if (selected.length === 0) { alert('Tick at least one order first.'); return; }
    const sampleOrder = {
      id: 'sample', order_number: 'ZV-2026-000123', created_at: new Date().toISOString(),
      customer_name: 'Muhammad Raees', customer_phone: '0314 6337267', customer_whatsapp: '0314 6337267',
      address: 'House 12, Street 4, R.O MEPCO Division', city: 'Mian Channu', province: 'Punjab', postal_code: '',
      order_notes: 'Call before delivery', payment_method: 'COD', total_amount: 9897,
      items: [{ quantity: 1, product_title: 'Royal Emerald Embroidered Luxury Lawn Kurti', variant_info: { name: 'Medium' } }, { quantity: 2, product_title: 'Nordic Minimalist Mushroom Warm Glow Bedside Lamp' }]
    };
    const win = window.open('', '_blank');
    if (!win) { alert('Your browser blocked the print window. Allow pop-ups for this site and try again.'); return; }
    win.document.write('<title>Preparing address sheets…</title><p style="font-family: sans-serif; padding: 40px;">Preparing address sheets…</p>');
    try {
      const [{ settings }, ...orders] = await Promise.all([API.getSettings(true), ...selected.map(id => id === 'sample' ? Promise.resolve(sampleOrder) : API.getOrder(id).then(r => r.order))]);
      const store = settings.store || {};
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const money = (v) => 'Rs. ' + (Number(v) || 0).toLocaleString('en-PK');
      const contact = [store.website, store.phone || store.whatsapp, store.email].filter(Boolean).map(esc).join(' &nbsp;|&nbsp; ');
      const logo = location.origin + '/assets/brand/zavyaan-logo-black.png';

      const slips = orders.filter(Boolean).map(o => {
        const items = (o.items || []).map(i => `${i.quantity} × ${esc(i.product_title)}${i.variant_info && i.variant_info.name ? ' (' + esc(i.variant_info.name) + ')' : ''}`);
        const collect = o.payment_method === 'COD' ? `<div class="collect">COLLECT ON DELIVERY: <strong>${money(o.total_amount)}</strong></div>` : `<div class="collect paid">PAID IN ADVANCE (${esc(SettingsService.paymentLabel(o.payment_method))}) — collect <strong>Rs. 0</strong></div>`;
        return `
          <section class="slip">
            <header>
              <div class="brand">
                <div class="brand-name">${esc(store.name || 'Zavyaan')}</div>
                ${store.tagline ? `<div class="brand-tag">${esc(store.tagline)}</div>` : ''}
              </div>
              <img src="${logo}" alt="" class="logo">
            </header>
            <div class="order-row"><span>Order No</span><strong class="order-no">${esc(o.order_number)}</strong><span class="date">${new Date(o.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            <table class="fields">
              <tr><th>Name</th><td class="big">${esc(o.customer_name)}</td></tr>
              <tr><th>Address</th><td class="big">${esc(o.address)}<br>${esc(o.city)}, ${esc(o.province)}${o.postal_code ? ' – ' + esc(o.postal_code) : ''}, Pakistan</td></tr>
              <tr><th>Phone</th><td class="big">${esc(o.customer_phone)}${o.customer_whatsapp && o.customer_whatsapp !== o.customer_phone ? ` &nbsp;·&nbsp; WhatsApp ${esc(o.customer_whatsapp)}` : ''}</td></tr>
              ${o.order_notes ? `<tr><th>Notes</th><td>${esc(o.order_notes)}</td></tr>` : ''}
              ${store.slip_show_items !== false && items.length ? `<tr><th>Items</th><td>${items.join('<br>')}</td></tr>` : ''}
            </table>
            ${store.slip_show_amount !== false ? collect : ''}
            <footer>
              <div class="thanks">${esc(store.slip_note || 'Thank you for your purchase!')}</div>
              ${contact ? `<div class="contact">${contact}</div>` : ''}
            </footer>
          </section>`;
      }).join('');

      win.document.open();
      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Address sheets — ${orders.length} order${orders.length === 1 ? '' : 's'}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: #0B0B0B; background: #EFEDE8; }
          .toolbar { position: sticky; top: 0; background: #0B0B0B; color: #fff; padding: 10px 18px; display: flex; gap: 12px; align-items: center; font-size: 14px; }
          .toolbar button { background: #C6A15B; border: 0; color: #0B0B0B; font-weight: 700; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          .toolbar span { opacity: .8; }
          .sheet { padding: 18px; display: grid; grid-template-columns: 1fr; gap: 18px; max-width: 820px; margin: 0 auto; }
          .slip { background: #fff; border: 1px solid #0B0B0B; border-radius: 6px; padding: 22px 26px; page-break-inside: avoid; break-inside: avoid; }
          header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #C6A15B; padding-bottom: 10px; margin-bottom: 12px; }
          .brand-name { font-size: 26px; font-weight: 800; letter-spacing: 3px; }
          .brand-tag { font-size: 11px; color: #A88445; letter-spacing: 2px; text-transform: uppercase; }
          .logo { height: 54px; }
          .order-row { display: flex; align-items: baseline; gap: 12px; font-size: 14px; margin-bottom: 10px; }
          .order-no { font-size: 22px; letter-spacing: 1px; }
          .date { margin-left: auto; color: #6B6B6B; }
          .fields { width: 100%; border-collapse: collapse; }
          .fields th { text-align: left; width: 90px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6B6B6B; padding: 7px 0; vertical-align: top; }
          .fields td { padding: 7px 0; font-size: 15px; line-height: 1.45; }
          .fields td.big { font-size: 19px; font-weight: 700; }
          .collect { margin-top: 12px; border: 2px solid #0B0B0B; padding: 10px 14px; font-size: 15px; letter-spacing: .5px; background: #F7F4EE; }
          .collect strong { font-size: 20px; }
          .collect.paid { border-style: dashed; }
          footer { margin-top: 14px; text-align: center; border-top: 1px solid #E5E1D8; padding-top: 10px; }
          .thanks { font-style: italic; font-weight: 700; font-size: 16px; }
          .contact { font-size: 12px; color: #6B6B6B; margin-top: 4px; }
          @media print { body { background: #fff; } .toolbar { display: none; } .sheet { padding: 0; gap: 0; max-width: none; } .slip { border-radius: 0; margin: 0 0 8mm; } @page { margin: 12mm; } }
        </style></head><body>
        <div class="toolbar"><button onclick="window.print()">🖨 Print / Save as PDF</button><span>${sample ? 'SAMPLE — this is how each order\'s sheet will look. Store name, contact line and note come from Storefront & Payments → Store Details.' : `${orders.length} address sheet${orders.length === 1 ? '' : 's'} · use your browser's "Save as PDF" as the printer to download`}</span></div>
        <div class="sheet">${slips}</div>
        ${sample ? '' : `<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));<\/script>`}
      </body></html>`);
      win.document.close();
    } catch (e) {
      win.document.body.innerHTML = `<p style="font-family: sans-serif; padding: 40px; color: #0B0B0B;">Could not prepare address sheets: ${Utils.escapeHtml(e.message)}</p>`;
    }
  },

  async quickUpdateStatus(id, newStatus) {
    try {
      await API.updateOrderStatus(id, newStatus, `Status updated by Admin to ${newStatus}`);
      State.showToast(`Order status updated to ${newStatus}`);
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async viewOrderDetails(id) {
    const modal = document.getElementById('admin-modal');
    const modalBody = document.getElementById('admin-modal-body');
    if (!modal || !modalBody) return;

    modalBody.innerHTML = `<div style="padding: 30px; text-align: center; color: var(--color-text-secondary);">Loading order...</div>`;
    modal.classList.add('active');

    try {
      const { order } = await API.getOrder(id);

      modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--color-border-light); padding-bottom: 16px;">
          <div>
            <h3 style="font-size: 1.3rem; color: var(--color-primary-black);">Order Details: ${order.order_number}</h3>
            <span style="font-size: 0.8rem; color: var(--color-text-secondary);">Placed on: ${new Date(order.created_at).toLocaleString('en-PK')}</span>
          </div>
          <span class="status-pill status-${OrderStatus.slug(order.order_status)}">${order.order_status}</span>
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 20px; margin-bottom: 20px;">
          <div style="background: var(--color-ivory); padding: 16px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-light);">
            <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--color-primary-black);">Customer & Shipping</h4>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Name:</strong> ${order.customer_name}</p>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Phone:</strong> ${order.customer_phone}</p>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>WhatsApp:</strong> ${order.customer_whatsapp || order.customer_phone}</p>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Location:</strong> ${order.city}, ${order.province}</p>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Address:</strong> ${order.address}</p>
          </div>

          <div style="background: var(--color-ivory); padding: 16px; border-radius: var(--radius-xs); border: 1px solid var(--color-border-light);">
            <h4 style="font-size: 0.9rem; margin-bottom: 8px; color: var(--color-primary-black);">Payment Summary</h4>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Method:</strong> ${SettingsService.paymentLabel(order.payment_method)}</p>
            ${Number(order.discount) > 0 ? `<p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Discount:</strong> - ${UI.formatPrice(order.discount)}</p>` : ''}
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Subtotal:</strong> ${UI.formatPrice(order.subtotal)}</p>
            <p style="font-size: 0.85rem; margin-bottom: 4px;"><strong>Delivery Fee:</strong> ${Number(order.delivery_fee) === 0 ? 'FREE' : UI.formatPrice(order.delivery_fee)}</p>
            <p style="font-size: 1.1rem; font-weight: 800; color: var(--color-primary-black); margin-top: 10px; border-top: 1px solid var(--color-border-light); padding-top: 6px;">
              Total: ${UI.formatPrice(order.total_amount)}
            </p>
          </div>
        </div>

        <h4 style="font-size: 0.95rem; margin-bottom: 10px; color: var(--color-primary-black);">Ordered Items</h4>
        <div style="border: 1px solid var(--color-border-light); border-radius: var(--radius-xs); overflow: hidden; margin-bottom: 24px;">
          ${(order.items || []).map(item => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid var(--color-border-light);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${item.product_image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'}" style="width: 38px; height: 38px; border-radius: var(--radius-xs); object-fit: cover;">
                <div>
                  <div style="font-weight: 600; font-size: 0.85rem;">${item.product_title}</div>
                  <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Qty: ${item.quantity} × ${UI.formatPrice(item.price)}</div>
                </div>
              </div>
              <strong style="color: var(--color-primary-black); font-size: 0.9rem;">${UI.formatPrice(item.total_price)}</strong>
            </div>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-gold" onclick="Admin.printAddressSheets(['${order.id}'])">🖨 Address sheet</button>
          <button class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Close</button>
        </div>
      `;
    } catch (e) {
      modalBody.innerHTML = `<div style="color: var(--color-status-error); padding: 30px;">Error: ${e.message}</div>`;
    }
  },

  // Admin Users (owner only)
  cachedUsers: [],
  async renderUsers() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div class="admin-loading">Loading users...</div>`;
    try {
      const { users } = await API.getAdminUsers();
      this.cachedUsers = users;
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const me = window.AdminUser || {};
      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Admin Users</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">Everyone who can sign in to this panel. <strong>Owner</strong> = everything incl. accounts &amp; users · <strong>Staff</strong> = products, orders, storefront (no finance).</p>
          </div>
          <button class="btn btn-primary" onclick="Admin.openUserModal()">+ Add Admin User</button>
        </div>
        <div class="table-responsive">
          <table class="admin-table">
            <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Access</th><th>Last sign-in</th><th>Actions</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr class="${u.is_active ? '' : 'row-disabled'}">
                  <td><strong>${esc(u.display_name)}</strong>${u.id === me.id ? ' <span class="badge badge-featured">you</span>' : ''}${u.email ? `<br><small style="color: var(--color-text-secondary);">${esc(u.email)}</small>` : ''}</td>
                  <td><code>${esc(u.username)}</code></td>
                  <td><span class="badge ${u.role === 'owner' ? 'badge-bestseller' : 'badge-stock'}">${esc(u.role)}</span></td>
                  <td>${u.id === me.id ? '<span style="font-size: 0.78rem; color: var(--color-text-secondary);">active</span>' : this.toggleSwitch(u.is_active, `Admin.toggleUserActive('${u.id}', this.checked)`, 'Active', 'Disabled', 'sm')}</td>
                  <td style="font-size: 0.82rem;">${u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-PK') : '<span style="color: var(--color-text-muted);">never</span>'}</td>
                  <td style="white-space: nowrap;">
                    <button class="btn btn-sm btn-secondary" onclick="Admin.openUserModal('${u.id}')">Edit</button>
                    ${u.id === me.id ? '' : `<button class="btn btn-sm btn-secondary" onclick="Admin.deleteUser('${u.id}')">🗑</button>`}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      content.innerHTML = `<div class="admin-error">${Utils.escapeHtml(e.message)}</div>`;
    }
  },

  openUserModal(id = null) {
    const u = id ? this.cachedUsers.find(x => x.id === id) : null;
    const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
    const modal = document.getElementById('admin-modal'); const body = document.getElementById('admin-modal-body');
    body.innerHTML = `
      <h3 class="modal-title">${u ? 'Edit Admin User' : 'Add Admin User'}</h3>
      <p class="modal-sub">${u ? 'Leave the password empty to keep the current one. Setting a new password signs that person out everywhere.' : 'They sign in at /#admin with this username and password and can change the password themselves afterwards.'}</p>
      <form onsubmit="Admin.handleSaveUser(event, ${u ? `'${u.id}'` : 'null'})">
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Full name</label><input id="au-name" class="form-control" value="${esc(u && u.display_name)}" placeholder="e.g. Anus Shareef"></div>
          <div class="form-group"><label class="form-label">Username <span class="req">*</span></label><input id="au-username" class="form-control" value="${esc(u && u.username)}" placeholder="e.g. anus" ${u ? 'disabled' : 'required'} pattern="[a-z0-9._-]{3,}" title="lowercase letters, numbers, . _ -"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Email</label><input id="au-email" type="email" class="form-control" value="${esc(u && u.email)}"></div>
          <div class="form-group"><label class="form-label">Role</label>
            <select id="au-role" class="form-control">
              <option value="staff" ${u && u.role === 'staff' ? 'selected' : ''}>Staff — products, orders, storefront</option>
              <option value="owner" ${u && u.role === 'owner' ? 'selected' : ''}>Owner — everything incl. accounts &amp; users</option>
            </select></div>
        </div>
        <div class="form-group"><label class="form-label">${u ? 'New password (optional)' : 'Password'} ${u ? '' : '<span class="req">*</span>'}</label><input id="au-password" type="password" class="form-control" ${u ? '' : 'required'} minlength="8" autocomplete="new-password" placeholder="at least 8 characters, letters and numbers"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">${u ? 'Save Changes' : 'Create User'}</button>
        </div>
      </form>`;
    modal.classList.add('active');
  },

  async handleSaveUser(e, id) {
    e.preventDefault();
    const v = (i) => document.getElementById(i).value;
    const payload = { display_name: v('au-name').trim(), email: v('au-email').trim(), role: v('au-role') };
    if (v('au-password')) payload.password = v('au-password');
    try {
      if (id) await API.updateAdminUser(id, payload);
      else await API.createAdminUser({ ...payload, username: v('au-username').trim().toLowerCase() });
      State.showToast(id ? 'User updated.' : 'User created — they can sign in now.');
      document.getElementById('admin-modal').classList.remove('active');
      await this.renderUsers();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async toggleUserActive(id, active) {
    try { await API.updateAdminUser(id, { is_active: active }); State.showToast(active ? 'User enabled.' : 'User disabled and signed out.'); }
    catch (err) { alert('Error: ' + err.message); }
    await this.renderUsers();
  },

  async deleteUser(id) {
    const u = this.cachedUsers.find(x => x.id === id);
    if (!confirm(`Delete admin user "${u ? u.username : id}"? They will no longer be able to sign in.`)) return;
    try { await API.deleteAdminUser(id); State.showToast('User deleted.'); await this.renderUsers(); }
    catch (err) { alert('Error: ' + err.message); }
  },

  openChangePasswordModal() {
    const modal = document.getElementById('admin-modal'); const body = document.getElementById('admin-modal-body');
    const me = window.AdminUser || {};
    body.innerHTML = `
      <h3 class="modal-title">Change My Password</h3>
      <p class="modal-sub">Signed in as <strong>${Utils.escapeHtml(me.username || '')}</strong> (${Utils.escapeHtml(me.role || '')}).</p>
      <form onsubmit="Admin.handleChangePassword(event)">
        <div class="form-group"><label class="form-label">Current password</label><input id="cp-current" type="password" class="form-control" required autocomplete="current-password"></div>
        <div class="form-group"><label class="form-label">New password</label><input id="cp-new" type="password" class="form-control" required minlength="8" autocomplete="new-password" placeholder="at least 8 characters, letters and numbers"></div>
        <div class="form-group"><label class="form-label">Repeat new password</label><input id="cp-new2" type="password" class="form-control" required autocomplete="new-password"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Change Password</button>
        </div>
      </form>`;
    modal.classList.add('active');
  },

  async handleChangePassword(e) {
    e.preventDefault();
    const n = document.getElementById('cp-new').value;
    if (n !== document.getElementById('cp-new2').value) { alert('The new passwords do not match.'); return; }
    try {
      await API.changeOwnPassword(document.getElementById('cp-current').value, n);
      State.showToast('Password changed.');
      document.getElementById('admin-modal').classList.remove('active');
    } catch (err) { alert('Error: ' + err.message); }
  },

  // 5. Storefront Settings View — payment methods, homepage banners, collections
  // Everything here is saved through PUT /api/settings and read live by the
  // checkout (payment methods) and homepage (banners, collections, sections).
  cachedSettings: null,

  async renderStorefront() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">Loading storefront settings...</div>`;

    try {
      const [{ settings }, catRes] = await Promise.all([API.getSettings(true), API.getCategories(true)]);
      this.cachedSettings = settings;
      this.cachedCategories = catRes.categories || [];
      const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
      const card = (title, subtitle, body) => `
        <section style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 22px 24px; box-shadow: var(--shadow-sm); margin-bottom: 24px;">
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 1.1rem; color: var(--color-primary-black);">${title}</h3>
            <p style="color: var(--color-text-secondary); font-size: 0.82rem;">${subtitle}</p>
          </div>
          ${body}
        </section>`;
      const toggle = (checked, onchange, labelOn = 'Enabled', labelOff = 'Disabled') => this.toggleSwitch(checked, onchange, labelOn, labelOff);

      const enabledCount = settings.payment_methods.filter(m => m.enabled).length;

      content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">Storefront Settings</h2>
            <p style="color: var(--color-text-secondary); font-size: 0.85rem;">Control what customers see and how they can pay — changes go live immediately.</p>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="Admin.renderStorefront()">↻ Reload</button>
        </div>

        ${card('Store Details', 'Printed on address sheets / packing slips (Orders → tick orders → Download address sheet).', `
          <div class="form-row-3">
            <div class="form-group"><label class="form-label">Store name</label><input type="text" class="form-control" value="${esc(settings.store.name)}" onchange="Admin.updateStore('name', this.value)"></div>
            <div class="form-group"><label class="form-label">Tagline</label><input type="text" class="form-control" value="${esc(settings.store.tagline)}" onchange="Admin.updateStore('tagline', this.value)"></div>
            <div class="form-group"><label class="form-label">Website</label><input type="text" class="form-control" value="${esc(settings.store.website)}" placeholder="www.zavyaan.pk" onchange="Admin.updateStore('website', this.value)"></div>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-control" value="${esc(settings.store.phone)}" placeholder="+92 300 1234567" onchange="Admin.updateStore('phone', this.value)"></div>
            <div class="form-group"><label class="form-label">WhatsApp</label><input type="text" class="form-control" value="${esc(settings.store.whatsapp)}" onchange="Admin.updateStore('whatsapp', this.value)"></div>
            <div class="form-group"><label class="form-label">Email</label><input type="text" class="form-control" value="${esc(settings.store.email)}" placeholder="info@zavyaan.pk" onchange="Admin.updateStore('email', this.value)"></div>
          </div>
          <div class="form-row-2">
            <div class="form-group"><label class="form-label">Note on the sheet</label><input type="text" class="form-control" value="${esc(settings.store.slip_note)}" onchange="Admin.updateStore('slip_note', this.value)"></div>
            <div style="display: flex; gap: 18px; align-items: end; padding-bottom: 16px; flex-wrap: wrap;">
              ${toggle(settings.store.slip_show_items, "Admin.updateStore('slip_show_items', this.checked)", 'Items listed', 'Items hidden')}
              ${toggle(settings.store.slip_show_amount, "Admin.updateStore('slip_show_amount', this.checked)", 'COD amount shown', 'Amount hidden')}
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end;">
            <button class="btn btn-primary" onclick="Admin.saveSettings('store', 'Store details saved.')">Save Store Details</button>
          </div>
        `)}

        ${card('Payment Methods', 'Switch a method on to offer it at checkout. Disabled methods are hidden from customers and refused by the server. Online methods are manual transfers — add your account details in the instructions before enabling.', `
          ${enabledCount === 0 ? `<div class="payment-unavailable" style="margin-bottom: 14px;"><strong>Warning:</strong> no payment method is enabled. Customers cannot check out.</div>` : ''}
          <div class="table-responsive">
            <table class="admin-table admin-settings-table">
              <thead><tr><th style="width: 130px;">Status</th><th>Method</th><th style="width: 120px;">Discount (Rs.)</th><th>Instructions shown at checkout</th></tr></thead>
              <tbody>
                ${settings.payment_methods.map((m, i) => `
                  <tr class="${m.enabled ? '' : 'row-disabled'}">
                    <td>${toggle(m.enabled, `Admin.updatePaymentMethod(${i}, 'enabled', this.checked)`)}</td>
                    <td>
                      <input type="text" class="form-control" value="${esc(m.label)}" onchange="Admin.updatePaymentMethod(${i}, 'label', this.value)" style="font-weight: 700; margin-bottom: 6px;">
                      <input type="text" class="form-control" value="${esc(m.description)}" placeholder="Short description" onchange="Admin.updatePaymentMethod(${i}, 'description', this.value)" style="font-size: 0.8rem;">
                      <div style="font-size: 0.72rem; color: var(--color-text-muted); margin-top: 4px;">Code: ${esc(m.code)}</div>
                    </td>
                    <td><input type="number" min="0" class="form-control" value="${esc(m.discount)}" onchange="Admin.updatePaymentMethod(${i}, 'discount', this.value)"></td>
                    <td><textarea class="form-control" rows="3" placeholder="e.g. Easypaisa 0300-1234567 (Zavyaan). Send screenshot on WhatsApp." onchange="Admin.updatePaymentMethod(${i}, 'instructions', this.value)">${esc(m.instructions)}</textarea></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
            <button class="btn btn-primary" onclick="Admin.saveSettings('payment_methods', 'Payment methods saved.')">Save Payment Methods</button>
          </div>
        `)}

        ${card('Homepage Sections', 'Show or hide the homepage blocks and set the Featured Highlights heading. Products appear in Featured Highlights only when you mark them ★ Featured in Products.', `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: end;">
            <div>${toggle(settings.homepage.show_collections, "Admin.updateHomepage('show_collections', this.checked)", 'Collections shown', 'Collections hidden')}</div>
            <div>${toggle(settings.homepage.show_promo_banners, "Admin.updateHomepage('show_promo_banners', this.checked)", 'Promo banners shown', 'Promo banners hidden')}</div>
            <div>${toggle(settings.homepage.show_featured, "Admin.updateHomepage('show_featured', this.checked)", 'Featured Highlights shown', 'Featured Highlights hidden')}</div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Featured section title</label>
              <input type="text" class="form-control" value="${esc(settings.homepage.featured_title)}" onchange="Admin.updateHomepage('featured_title', this.value)">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Featured tagline</label>
              <input type="text" class="form-control" value="${esc(settings.homepage.featured_tagline)}" onchange="Admin.updateHomepage('featured_tagline', this.value)">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Max collections on homepage</label>
              <input type="number" min="1" max="12" class="form-control" value="${esc(settings.homepage.collections_limit)}" onchange="Admin.updateHomepage('collections_limit', this.value)">
            </div>
            <div class="form-group" style="margin: 0;">
              <label class="form-label">Max featured items</label>
              <input type="number" min="1" max="24" class="form-control" value="${esc(settings.homepage.featured_limit)}" onchange="Admin.updateHomepage('featured_limit', this.value)">
            </div>
          </div>
          <div style="display: flex; justify-content: flex-end; margin-top: 14px;">
            <button class="btn btn-primary" onclick="Admin.saveSettings('homepage', 'Homepage sections saved.')">Save Homepage Sections</button>
          </div>
        `)}

        ${card('Promotional Banners', 'Sale, collection and offer banners shown on the homepage. Themes stay inside the gold / white / black palette.', `
          <div style="display: grid; gap: 14px;">
            ${settings.promo_banners.map((b, i) => `
              <div class="admin-banner-row ${b.enabled ? '' : 'row-disabled'}">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
                  <div style="display: flex; gap: 12px; align-items: center;">
                    ${toggle(b.enabled, `Admin.updateBanner(${i}, 'enabled', this.checked)`, 'Live', 'Hidden')}
                    <select class="form-control" style="width: auto;" onchange="Admin.updateBanner(${i}, 'kind', this.value)">
                      ${['sale', 'collection', 'offer'].map(k => `<option value="${k}" ${b.kind === k ? 'selected' : ''}>${k.charAt(0).toUpperCase() + k.slice(1)} banner</option>`).join('')}
                    </select>
                    <select class="form-control" style="width: auto;" onchange="Admin.updateBanner(${i}, 'theme', this.value)">
                      ${[['dark', 'Black / Gold'], ['ivory', 'Ivory / Black'], ['gold', 'Gold / Black']].map(([v, l]) => `<option value="${v}" ${b.theme === v ? 'selected' : ''}>${l}</option>`).join('')}
                    </select>
                  </div>
                  <button class="btn btn-sm btn-secondary" onclick="Admin.removeBanner(${i})">Remove</button>
                </div>
                <div class="form-row-2">
                  <input type="text" class="form-control" placeholder="Small tag (e.g. Limited Time Sale)" value="${esc(b.tag)}" onchange="Admin.updateBanner(${i}, 'tag', this.value)">
                  <input type="text" class="form-control" placeholder="Heading (e.g. Up to 50% OFF)" value="${esc(b.heading)}" onchange="Admin.updateBanner(${i}, 'heading', this.value)" style="font-weight: 700;">
                </div>
                <input type="text" class="form-control" placeholder="Description" value="${esc(b.description)}" onchange="Admin.updateBanner(${i}, 'description', this.value)" style="margin-top: 10px;">
                <div class="form-row-2" style="margin-top: 10px;">
                  <input type="text" class="form-control" placeholder="Button text" value="${esc(b.cta_text)}" onchange="Admin.updateBanner(${i}, 'cta_text', this.value)">
                  <input type="text" class="form-control" placeholder="Button link (e.g. #category/deals-offers)" value="${esc(b.cta_link)}" onchange="Admin.updateBanner(${i}, 'cta_link', this.value)">
                </div>
              </div>
            `).join('')}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 14px; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="Admin.addBanner()" ${settings.promo_banners.length >= 6 ? 'disabled' : ''}>+ Add Banner</button>
            <button class="btn btn-primary" onclick="Admin.saveSettings('promo_banners', 'Promotional banners saved.')">Save Banners</button>
          </div>
        `)}

        ${card('Collections', `Curated collections shown directly beneath the homepage banner, in this order. Toggle each one on or off, add up to 12, and set how many the homepage shows. Currently <strong>${settings.collections.filter(c => c.enabled).length}</strong> enabled, homepage shows up to <strong>${settings.homepage.collections_limit}</strong>.`, `
          <div style="display: grid; gap: 14px;">
            ${settings.collections.map((c, i) => {
              const f = c.filter || {};
              const source = f.category ? 'category' : f.trending ? 'trending' : f.featured ? 'featured' : f.bestseller ? 'bestseller' : 'newest';
              return `
              <div class="admin-banner-row ${c.enabled ? '' : 'row-disabled'}">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px;">
                  <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                    <span style="font-weight: 800; color: var(--color-gold-muted); min-width: 22px;">#${i + 1}</span>
                    ${toggle(c.enabled, `Admin.updateCollection(${i}, 'enabled', this.checked)`, 'Live on homepage', 'Hidden')}
                    <span style="font-size: 0.72rem; color: var(--color-text-muted);">#collection/${esc(c.slug)}</span>
                  </div>
                  <div style="display: flex; gap: 6px;">
                    <button class="btn btn-sm btn-secondary" title="Move up" onclick="Admin.moveCollection(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
                    <button class="btn btn-sm btn-secondary" title="Move down" onclick="Admin.moveCollection(${i}, 1)" ${i === settings.collections.length - 1 ? 'disabled' : ''}>↓</button>
                    <button class="btn btn-sm btn-secondary" onclick="Admin.removeCollection(${i})">Remove</button>
                  </div>
                </div>
                <div class="form-row-2">
                  <input type="text" class="form-control" placeholder="Title (e.g. Eid Edit)" value="${esc(c.title)}" onchange="Admin.updateCollection(${i}, 'title', this.value)" style="font-weight: 700;">
                  <input type="text" class="form-control" placeholder="Subtitle (e.g. Festive Picks)" value="${esc(c.subtitle)}" onchange="Admin.updateCollection(${i}, 'subtitle', this.value)">
                </div>
                <input type="text" class="form-control" placeholder="Image URL (shown on the collection card)" value="${esc(c.image_url)}" onchange="Admin.updateCollection(${i}, 'image_url', this.value)" style="margin-top: 10px;">
                <input type="text" class="form-control" placeholder="Description (shown on the collection page)" value="${esc(c.description)}" onchange="Admin.updateCollection(${i}, 'description', this.value)" style="margin-top: 10px;">
                <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 10px;">
                  <label style="font-size: 0.8rem; font-weight: 700;">Shows:</label>
                  <select class="form-control" style="width: auto;" onchange="Admin.setCollectionSource(${i}, this.value)">
                    <option value="newest" ${source === 'newest' ? 'selected' : ''}>Newest products</option>
                    <option value="trending" ${source === 'trending' ? 'selected' : ''}>Trending products</option>
                    <option value="featured" ${source === 'featured' ? 'selected' : ''}>★ Featured products</option>
                    <option value="bestseller" ${source === 'bestseller' ? 'selected' : ''}>Best Sellers</option>
                    <option value="category" ${source === 'category' ? 'selected' : ''}>Products from a category</option>
                  </select>
                  ${source === 'category' ? `
                    <select class="form-control" style="width: auto;" onchange="Admin.setCollectionSource(${i}, 'category', this.value)">
                      ${this.cachedCategories.map(cat => `<option value="${esc(cat.slug)}" ${f.category === cat.slug || f.category === cat.id ? 'selected' : ''}>${esc(cat.name)}</option>`).join('')}
                    </select>
                  ` : ''}
                </div>
              </div>`;
            }).join('')}
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 14px; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="Admin.addCollection()" ${settings.collections.length >= 12 ? 'disabled' : ''}>+ Add Collection</button>
            <button class="btn btn-primary" onclick="Admin.saveSettings('collections', 'Collections saved.')">Save Collections</button>
          </div>
        `)}
      `;
    } catch (e) {
      content.innerHTML = `<div style="color: var(--color-status-error); padding: 30px;">Error loading storefront settings: ${e.message}</div>`;
    }
  },

  updatePaymentMethod(index, field, value) {
    const m = this.cachedSettings && this.cachedSettings.payment_methods[index];
    if (!m) return;
    m[field] = field === 'discount' ? Math.max(0, Number(value) || 0) : value;
    if (field === 'enabled') this.refreshToggleLabel(event, value);
  },

  updateStore(field, value) {
    if (!this.cachedSettings) return;
    this.cachedSettings.store[field] = value;
    if (typeof value === 'boolean') this.refreshToggleLabel(event, value);
  },

  updateHomepage(field, value) {
    if (!this.cachedSettings) return;
    this.cachedSettings.homepage[field] = value;
    if (typeof value === 'boolean') this.refreshToggleLabel(event, value);
  },

  updateBanner(index, field, value) {
    const b = this.cachedSettings && this.cachedSettings.promo_banners[index];
    if (!b) return;
    b[field] = value;
    if (field === 'enabled') this.refreshToggleLabel(event, value);
  },

  addBanner() {
    if (!this.cachedSettings) return;
    this.cachedSettings.promo_banners.push({
      id: 'banner-' + Date.now(), kind: 'offer', tag: '', heading: '', description: '',
      cta_text: 'Shop Now', cta_link: '#shop', theme: 'dark', enabled: false
    });
    this.rerenderStorefrontFromCache();
  },

  removeBanner(index) {
    if (!this.cachedSettings) return;
    if (!confirm('Remove this banner? Click "Save Banners" afterwards to apply.')) return;
    this.cachedSettings.promo_banners.splice(index, 1);
    this.rerenderStorefrontFromCache();
  },

  updateCollection(index, field, value) {
    const c = this.cachedSettings && this.cachedSettings.collections[index];
    if (!c) return;
    c[field] = value;
    // Auto-generated collections take their URL slug from the title until saved
    if (field === 'title' && /^collection-\d+/.test(c.slug)) {
      const base = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || c.slug;
      let slug = base;
      while (this.cachedSettings.collections.some((o, j) => j !== index && o.slug === slug)) slug = base + '-' + Math.floor(Math.random() * 90 + 10);
      c.slug = slug;
    }
    if (field === 'enabled') this.refreshToggleLabel(event, value);
  },

  addCollection() {
    if (!this.cachedSettings) return;
    const n = this.cachedSettings.collections.length + 1;
    let slug = 'collection-' + n;
    while (this.cachedSettings.collections.some(c => c.slug === slug)) slug += '-' + Math.floor(Math.random() * 90 + 10);
    this.cachedSettings.collections.push({
      slug, title: 'New Collection ' + n, subtitle: '', description: '', image_url: '',
      filter: { sort: 'newest' }, enabled: false
    });
    this.rerenderStorefrontFromCache();
  },

  removeCollection(index) {
    if (!this.cachedSettings) return;
    if (!confirm('Remove this collection? Click "Save Collections" afterwards to apply.')) return;
    this.cachedSettings.collections.splice(index, 1);
    this.rerenderStorefrontFromCache();
  },

  moveCollection(index, dir) {
    const list = this.cachedSettings && this.cachedSettings.collections;
    if (!list) return;
    const j = index + dir;
    if (j < 0 || j >= list.length) return;
    [list[index], list[j]] = [list[j], list[index]];
    this.rerenderStorefrontFromCache();
  },

  // Translate the "Shows:" dropdown into the /api/products filter the storefront uses
  setCollectionSource(index, source, categorySlug) {
    const c = this.cachedSettings && this.cachedSettings.collections[index];
    if (!c) return;
    if (source === 'category') {
      const slug = categorySlug || (this.cachedCategories[0] && this.cachedCategories[0].slug) || '';
      c.filter = { category: slug };
    } else if (source === 'trending') c.filter = { trending: true };
    else if (source === 'featured') c.filter = { featured: true };
    else if (source === 'bestseller') c.filter = { bestseller: true };
    else c.filter = { sort: 'newest' };
    if (!categorySlug) this.rerenderStorefrontFromCache();
  },

  // Re-render the tab from the unsaved in-memory copy (used after add/remove)
  rerenderStorefrontFromCache() {
    const pending = this.cachedSettings;
    const origGet = API.getSettings;
    API.getSettings = async () => ({ success: true, settings: pending });
    this.renderStorefront().finally(() => { API.getSettings = origGet; });
  },

  refreshToggleLabel(evt, on) {
    const label = evt && evt.target && evt.target.closest('.admin-toggle');
    if (!label) return;
    label.classList.toggle('on', Boolean(on));
    const text = label.querySelector('.admin-toggle-label');
    if (text) {
      const pair = (text.dataset.pair || '').split('|');
      text.textContent = on ? (pair[0] || 'Enabled') : (pair[1] || 'Disabled');
    }
  },

  async saveSettings(section, successMessage) {
    if (!this.cachedSettings) return;
    try {
      const res = await API.updateSettings({ [section]: this.cachedSettings[section] });
      if (res && res.settings) this.cachedSettings = res.settings;
      if (window.SettingsService) SettingsService.invalidate();
      State.showToast(successMessage || 'Settings saved.');
      if (res && res.warning) alert(res.warning);
      await this.renderStorefront();
    } catch (e) {
      alert('Error saving settings: ' + e.message);
    }
  }
};

window.Admin = Admin;
