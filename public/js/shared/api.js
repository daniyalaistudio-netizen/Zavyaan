// ==========================================================
// ZAVYAAN SHARED — CENTRALIZED REST API CLIENT
// Connects to Express/Node backend (/api).
// Falls back to local persistent storage for instant offline / static preview.
// ==========================================================

const ApiClient = {
  baseUrl: '/api',

  // Retrieve stored auth token (Admin or Customer)
  getAuthHeader() {
    let token = '';
    try { token = localStorage.getItem('zavyaan_admin_token') || ''; } catch (e) { /* storage unavailable */ }
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers
    };

    try {
      const res = await fetch(url, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP error ${res.status}`);
      }
      return data;
    } catch (err) {
      // If server is unreachable or offline, delegate to local fallback client if available
      if (typeof window.localClientFallback === 'function') {
        return window.localClientFallback(endpoint, options);
      }
      console.warn(`[API] Server request failed: ${err.message}. Using local storage fallback.`);
      return this.fallbackRequest(endpoint, options);
    }
  },

  // Fallback for offline execution or static file browsing
  fallbackRequest(endpoint, options) {
    if (typeof window.API !== 'undefined' && typeof window.API.fallbackRequest === 'function' && window.API !== this) {
      return window.API.fallbackRequest(endpoint, options);
    }

    // Default safe fallback responses
    if (endpoint.startsWith('/categories')) {
      const cats = JSON.parse(localStorage.getItem('zavyaan_local_categories') || '[]');
      return { success: true, categories: cats };
    }
    if (endpoint.startsWith('/products')) {
      const prods = JSON.parse(localStorage.getItem('zavyaan_local_products') || '[]');
      return { success: true, products: prods, count: prods.length };
    }
    if (endpoint.startsWith('/orders') && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const orderNum = 'ZV-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        ...body,
        id: 'ord-' + Date.now(),
        order_number: orderNum,
        order_status: 'Pending',
        created_at: new Date().toISOString(),
        timeline: [{ status: 'Pending', note: 'Order placed with Cash on Delivery', created_at: new Date().toISOString() }]
      };
      const orders = JSON.parse(localStorage.getItem('zavyaan_local_orders') || '[]');
      orders.unshift(newOrder);
      localStorage.setItem('zavyaan_local_orders', JSON.stringify(orders));
      return { success: true, order: newOrder };
    }
    return { success: true };
  }
};

window.ApiClient = ApiClient;
// Keep window.API referenced for backward compatibility with existing admin.js
if (typeof window.API === 'undefined') {
  window.API = ApiClient;
}
