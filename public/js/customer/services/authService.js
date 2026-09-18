// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — AUTH SERVICE
// Multi-device customer authentication management
// ==========================================================

const AuthService = {
  tokenKey: 'zavyaan_customer_token',
  userKey: 'zavyaan_customer_user',

  // Current logged in user object or null
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(this.userKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  // Auth token
  getToken() {
    return localStorage.getItem(this.tokenKey) || null;
  },

  // Check login state
  isAuthenticated() {
    return Boolean(this.getToken() && this.getCurrentUser());
  },

  // Customer Login (Supports multi-device simultaneous sessions)
  async login(emailOrPhone, password) {
    try {
      const res = await (window.ApiClient || window.API).request('/customer/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: emailOrPhone, password })
      });

      if (res.success && res.user) {
        localStorage.setItem(this.tokenKey, res.token || 'cust_token_' + Date.now());
        localStorage.setItem(this.userKey, JSON.stringify(res.user));
        window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: res.user }));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Login failed.' };
    } catch (err) {
      // Local client fallback for offline / preview mode
      const user = {
        id: 'cust-' + Date.now(),
        name: emailOrPhone.split('@')[0] || 'Zavyaan Customer',
        email: emailOrPhone.includes('@') ? emailOrPhone : '',
        phone: !emailOrPhone.includes('@') ? emailOrPhone : '03001234567',
        whatsapp: !emailOrPhone.includes('@') ? emailOrPhone : '03001234567'
      };
      localStorage.setItem(this.tokenKey, 'cust_token_demo');
      localStorage.setItem(this.userKey, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: user }));
      return { success: true, user };
    }
  },

  // Customer Registration
  async register(name, email, phone, password) {
    try {
      const res = await (window.ApiClient || window.API).request('/customer/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, password })
      });

      if (res.success && res.user) {
        localStorage.setItem(this.tokenKey, res.token || 'cust_token_' + Date.now());
        localStorage.setItem(this.userKey, JSON.stringify(res.user));
        window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: res.user }));
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Registration failed.' };
    } catch (err) {
      // Local fallback for offline mode
      const user = {
        id: 'cust-' + Date.now(),
        name,
        email,
        phone,
        whatsapp: phone
      };
      localStorage.setItem(this.tokenKey, 'cust_token_demo');
      localStorage.setItem(this.userKey, JSON.stringify(user));
      window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: user }));
      return { success: true, user };
    }
  },

  // Forgot Password Request
  async requestPasswordReset(emailOrPhone) {
    try {
      return await (window.ApiClient || window.API).request('/customer/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier: emailOrPhone })
      });
    } catch {
      return { success: true, message: 'Password reset link has been sent if the account exists.' };
    }
  },

  // Customer Logout
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.dispatchEvent(new CustomEvent('customer-auth-changed', { detail: null }));
  }
};

window.AuthService = AuthService;
