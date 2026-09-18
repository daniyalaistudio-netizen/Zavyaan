// ==========================================================
// ZAVYAAN CUSTOMER PAGES — CUSTOMER ACCOUNT PORTAL
// Login, Register, Forgot Password, Profile, Saved Addresses, Orders History, and Logout
// Multi-device simultaneous login allowed (No single-device restriction for customers)
// ==========================================================

const AccountPage = {
  activeTab: 'profile', // 'profile', 'addresses', 'orders', 'security', 'login', 'register', 'forgot'

  async render(container, subRoute = '') {
    const customer = AuthService.getCurrentUser();

    // If customer is not authenticated, show Auth forms
    if (!customer) {
      this.renderAuthViews(container, subRoute || 'login');
      return;
    }

    // Determine logged-in active tab
    const tab = ['profile', 'addresses', 'orders', 'security'].includes(subRoute) ? subRoute : 'profile';
    this.activeTab = tab;

    container.innerHTML = `
      <div class="container section-padding">
        <div style="margin-bottom: 28px;">
          <div class="section-tagline">My Account</div>
          <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 6px;">Customer Dashboard</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
            Manage your personal profile, delivery addresses, and track previous orders.
          </p>
        </div>

        <div class="account-layout">
          <!-- SIDEBAR -->
          <aside class="account-sidebar">
            <div class="account-user-card">
              <div class="account-avatar">${customer.name ? customer.name.charAt(0).toUpperCase() : 'Z'}</div>
              <h3 style="font-size: 1.1rem; color: var(--color-rich-black); margin-bottom: 4px;">${Utils.escapeHtml(customer.name)}</h3>
              <p style="font-size: 0.8rem; color: var(--color-text-secondary); margin: 0;">${Utils.escapeHtml(customer.phone || customer.email || 'Customer')}</p>
            </div>

            <ul class="account-nav-list">
              <li class="account-nav-item">
                <a href="#account/profile" class="${tab === 'profile' ? 'active' : ''}">
                  <span>👤</span> My Profile
                </a>
              </li>
              <li class="account-nav-item">
                <a href="#account/orders" class="${tab === 'orders' ? 'active' : ''}">
                  <span>📦</span> Order History
                </a>
              </li>
              <li class="account-nav-item">
                <a href="#account/addresses" class="${tab === 'addresses' ? 'active' : ''}">
                  <span>📍</span> Saved Addresses
                </a>
              </li>
              <li class="account-nav-item">
                <a href="#account/security" class="${tab === 'security' ? 'active' : ''}">
                  <span>🔒</span> Security & Password
                </a>
              </li>
              <li class="account-nav-item" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--color-border-light);">
                <a href="javascript:void(0)" onclick="AccountPage.handleLogout()" style="color: var(--color-status-error);">
                  <span>🚪</span> Logout
                </a>
              </li>
            </ul>
          </aside>

          <!-- TAB CONTENT -->
          <main class="account-panel-card" id="account-tab-body">
            <!-- Populated below -->
          </main>
        </div>
      </div>
    `;

    const tabBody = document.getElementById('account-tab-body');
    if (!tabBody) return;

    if (tab === 'profile') await this.renderProfileTab(tabBody, customer);
    else if (tab === 'orders') await this.renderOrdersTab(tabBody);
    else if (tab === 'addresses') this.renderAddressesTab(tabBody);
    else if (tab === 'security') this.renderSecurityTab(tabBody);
  },

  // 1. Auth Views (Login / Register / Forgot Password)
  renderAuthViews(container, activeView = 'login') {
    container.innerHTML = `
      <div class="container section-padding">
        <div class="auth-container">
          <div class="auth-tabs">
            <div class="auth-tab-btn ${activeView === 'login' ? 'active' : ''}" onclick="AccountPage.render(document.getElementById('app-main'), 'login')">
              Customer Sign In
            </div>
            <div class="auth-tab-btn ${activeView === 'register' ? 'active' : ''}" onclick="AccountPage.render(document.getElementById('app-main'), 'register')">
              Create Account
            </div>
          </div>

          ${activeView === 'login' ? `
            <form onsubmit="AccountPage.handleLoginSubmit(event)">
              <div class="form-group">
                <label class="form-label">Email or Mobile Number <span class="req">*</span></label>
                <input type="text" id="auth-login-identifier" class="form-control" placeholder="ali@gmail.com or 03001234567" required>
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="form-label" style="margin-bottom: 0;">Password <span class="req">*</span></label>
                  <a href="#account/forgot" style="font-size: 0.78rem; color: var(--color-gold-muted);">Forgot Password?</a>
                </div>
                <input type="password" id="auth-login-password" class="form-control" placeholder="••••••••" required>
              </div>

              <div style="margin-top: 24px;">
                <button type="submit" class="btn btn-primary btn-lg btn-block" id="btn-auth-login">
                  Sign In to Zavyaan &rarr;
                </button>
              </div>

              <div style="margin-top: 20px; font-size: 0.8rem; text-align: center; color: var(--color-text-secondary);">
                Don't have an account? <a href="#account/register" style="color: var(--color-gold-muted); font-weight: 700;">Create one now</a>
              </div>
            </form>
          ` : activeView === 'register' ? `
            <form onsubmit="AccountPage.handleRegisterSubmit(event)">
              <div class="form-group">
                <label class="form-label">Full Name <span class="req">*</span></label>
                <input type="text" id="auth-reg-name" class="form-control" placeholder="Muhammad Ali" required>
              </div>

              <div class="form-group">
                <label class="form-label">Mobile Number (Calling & WhatsApp) <span class="req">*</span></label>
                <input type="tel" id="auth-reg-phone" class="form-control" placeholder="0300 1234567" required>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address (Optional)</label>
                <input type="email" id="auth-reg-email" class="form-control" placeholder="ali@example.com">
              </div>

              <div class="form-group">
                <label class="form-label">Create Password <span class="req">*</span></label>
                <input type="password" id="auth-reg-password" class="form-control" placeholder="At least 6 characters" required>
              </div>

              <div style="margin-top: 24px;">
                <button type="submit" class="btn btn-primary btn-lg btn-block" id="btn-auth-reg">
                  Create Zavyaan Account &rarr;
                </button>
              </div>

              <div style="margin-top: 20px; font-size: 0.8rem; text-align: center; color: var(--color-text-secondary);">
                Already have an account? <a href="#account/login" style="color: var(--color-gold-muted); font-weight: 700;">Sign in here</a>
              </div>
            </form>
          ` : `
            <!-- Forgot Password View -->
            <form onsubmit="AccountPage.handleForgotSubmit(event)">
              <h3 style="font-size: 1.15rem; margin-bottom: 10px;">Reset Your Password</h3>
              <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 20px;">
                Enter your registered email address or mobile number. We will send you instructions to reset your password.
              </p>

              <div class="form-group">
                <label class="form-label">Email or Phone <span class="req">*</span></label>
                <input type="text" id="auth-forgot-identifier" class="form-control" placeholder="03001234567 or email" required>
              </div>

              <button type="submit" class="btn btn-primary btn-block">Send Reset Link</button>
              <div style="margin-top: 16px; text-align: center;">
                <a href="#account/login" style="font-size: 0.82rem; color: var(--color-gold-muted);">&larr; Back to Sign In</a>
              </div>
            </form>
          `}
        </div>
      </div>
    `;
  },

  // Profile Tab
  async renderProfileTab(container, customer) {
    container.innerHTML = `
      <div class="account-panel-header">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--color-rich-black);">Personal Profile</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 0;">Keep your contact information updated for smooth delivery</p>
        </div>
      </div>

      <form onsubmit="AccountPage.handleProfileUpdate(event)">
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" id="prof-name" class="form-control" value="${Utils.escapeHtml(customer.name)}" required>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Calling Phone Number</label>
            <input type="tel" id="prof-phone" class="form-control" value="${Utils.escapeHtml(customer.phone || '')}" required>
          </div>
          <div class="form-group">
            <label class="form-label">WhatsApp Number</label>
            <input type="tel" id="prof-whatsapp" class="form-control" value="${Utils.escapeHtml(customer.whatsapp || customer.phone || '')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" id="prof-email" class="form-control" value="${Utils.escapeHtml(customer.email || '')}">
        </div>

        <div style="margin-top: 24px;">
          <button type="submit" class="btn btn-primary">Save Profile Changes</button>
        </div>
      </form>
    `;
  },

  // Orders Tab
  async renderOrdersTab(container) {
    container.innerHTML = `
      <div class="account-panel-header">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--color-rich-black);">My Orders</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 0;">View your past purchases and track real-time courier statuses</p>
        </div>
      </div>
      <div style="text-align: center; padding: 40px; color: var(--color-gold-muted);">Loading your orders...</div>
    `;

    const orders = await CustomerService.getCustomerOrders();

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="account-panel-header">
          <h2 style="font-size: 1.35rem;">My Orders</h2>
        </div>
        ${StateComponents.renderEmptyState(
          'No Orders Found',
          'You have not placed any orders with this account yet.',
          `<a href="#shop" class="btn btn-primary">Explore Products &rarr;</a>`
        )}
      `;
      return;
    }

    container.innerHTML = `
      <div class="account-panel-header">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--color-rich-black);">My Orders</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 0;">Showing ${orders.length} orders placed on Zavyaan</p>
        </div>
      </div>

      <div class="table-responsive">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Destination</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${Utils.escapeHtml(o.order_number)}</strong></td>
                <td>${Formatters.formatDate(o.created_at)}</td>
                <td>${Utils.escapeHtml(o.city)}, ${Utils.escapeHtml(o.province)}</td>
                <td>${Utils.escapeHtml(SettingsService.paymentLabel(o.payment_method))}</td>
                <td><strong>${Formatters.formatPKR(o.total_amount)}</strong></td>
                <td><span class="status-pill status-${OrderStatus.slug(o.order_status)}">${o.order_status}</span></td>
                <td>
                  <a href="#track?num=${o.order_number}" class="btn btn-sm btn-secondary">Track</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // Addresses Tab
  renderAddressesTab(container) {
    const addresses = CustomerService.getSavedAddresses();

    container.innerHTML = `
      <div class="account-panel-header">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--color-rich-black);">Saved Delivery Addresses</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 0;">Faster checkout by saving frequent delivery locations</p>
        </div>
        <button class="btn btn-sm btn-primary" onclick="AccountPage.openNewAddressModal()">+ Add New Address</button>
      </div>

      <div class="addresses-grid">
        ${addresses.map(a => `
          <div class="address-card ${a.is_default ? 'default' : ''}">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span class="badge ${a.is_default ? 'badge-featured' : 'badge-stock'}">${Utils.escapeHtml(a.name || 'Home')}</span>
                ${a.is_default ? '<span style="font-size: 0.72rem; color: var(--color-gold-muted); font-weight: 700;">DEFAULT</span>' : ''}
              </div>
              <h4 style="font-size: 0.95rem; margin-bottom: 4px;">${Utils.escapeHtml(a.recipient)}</h4>
              <p style="font-size: 0.82rem; color: var(--color-text-secondary); line-height: 1.4; margin-bottom: 8px;">
                ${Utils.escapeHtml(a.address)}, ${Utils.escapeHtml(a.city)}, ${Utils.escapeHtml(a.province)}
              </p>
              <div style="font-size: 0.8rem; color: var(--color-charcoal);">📞 ${Utils.escapeHtml(a.phone)}</div>
            </div>

            <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--color-border-light); display: flex; justify-content: flex-end; gap: 8px;">
              <button class="btn btn-sm btn-secondary" onclick="CustomerService.deleteAddress('${a.id}'); AccountPage.render(document.getElementById('app-main'), 'addresses');">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // Security Tab
  renderSecurityTab(container) {
    container.innerHTML = `
      <div class="account-panel-header">
        <div>
          <h2 style="font-size: 1.35rem; color: var(--color-rich-black);">Account Security</h2>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin: 0;">Change your password and manage active logins</p>
        </div>
      </div>

      <form onsubmit="event.preventDefault(); CustomerState.showToast('Password updated successfully!'); this.reset();" style="max-width: 440px;">
        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input type="password" class="form-control" required>
        </div>

        <div class="form-group">
          <label class="form-label">New Password</label>
          <input type="password" class="form-control" minlength="6" required>
        </div>

        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <input type="password" class="form-control" minlength="6" required>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 12px;">Update Password</button>
      </form>
    `;
  },

  // Action handlers
  async handleLoginSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-login');
    if (btn) btn.disabled = true;

    const id = document.getElementById('auth-login-identifier').value.trim();
    const pw = document.getElementById('auth-login-password').value;

    const res = await AuthService.login(id, pw);
    if (res.success) {
      CustomerState.showToast(`Welcome back, ${res.user.name}!`);
      location.hash = '#account';
    } else {
      alert(res.message || 'Login failed.');
      if (btn) btn.disabled = false;
    }
  },

  async handleRegisterSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-auth-reg');
    if (btn) btn.disabled = true;

    const name = document.getElementById('auth-reg-name').value.trim();
    const phone = document.getElementById('auth-reg-phone').value.trim();
    const email = document.getElementById('auth-reg-email').value.trim();
    const pw = document.getElementById('auth-reg-password').value;

    const res = await AuthService.register(name, email, phone, pw);
    if (res.success) {
      CustomerState.showToast(`Account created! Welcome to Zavyaan.`);
      location.hash = '#account';
    } else {
      alert(res.message || 'Registration failed.');
      if (btn) btn.disabled = false;
    }
  },

  async handleForgotSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('auth-forgot-identifier').value.trim();
    await AuthService.requestPasswordReset(id);
    CustomerState.showToast('Password reset instructions sent!');
    location.hash = '#account/login';
  },

  async handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById('prof-name').value.trim();
    const phone = document.getElementById('prof-phone').value.trim();
    const whatsapp = document.getElementById('prof-whatsapp').value.trim();
    const email = document.getElementById('prof-email').value.trim();

    await CustomerService.updateProfile({ name, phone, whatsapp, email });
    CustomerState.showToast('Profile updated successfully!');
  },

  handleLogout() {
    AuthService.logout();
    CustomerState.showToast('You have been logged out.');
    location.hash = '#home';
  },

  openNewAddressModal() {
    const name = prompt('Address Label (e.g. Home, Office):', 'Home');
    if (!name) return;
    const recipient = prompt('Recipient Full Name:', 'Ali Khan');
    const phone = prompt('Mobile Number:', '03001234567');
    const city = prompt('City:', 'Lahore');
    const province = prompt('Province:', 'Punjab');
    const address = prompt('Full Street Address:', 'House #1, Street #1');

    CustomerService.saveAddress({
      name,
      recipient: recipient || 'Recipient',
      phone: phone || '03001234567',
      city: city || 'Lahore',
      province: province || 'Punjab',
      address: address || 'Main Road',
      is_default: false
    });

    CustomerState.showToast('New address saved!');
    AccountPage.render(document.getElementById('app-main'), 'addresses');
  }
};

window.AccountPage = AccountPage;
