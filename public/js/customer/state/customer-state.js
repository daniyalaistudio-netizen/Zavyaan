// ==========================================================
// ZAVYAAN CUSTOMER STATE MANAGEMENT
// Central reactive state hub for cart, customer session, filters, and toasts
// ==========================================================

const CustomerState = {
  categories: [],
  activeCategory: null,
  activeSubcategory: null,
  cart: [],
  filters: {
    category: null,
    subcategory: null,
    search: '',
    minPrice: null,
    maxPrice: null,
    sort: 'newest'
  },
  customer: null,
  isAuthenticated: false,

  init() {
    this.cart = CartService.getItems();
    this.customer = AuthService.getCurrentUser();
    this.isAuthenticated = AuthService.isAuthenticated();

    // Listen for cart changes
    window.addEventListener('cart-updated', (e) => {
      this.cart = e.detail;
      this.updateCartBadge();
    });

    // Listen for auth changes
    window.addEventListener('customer-auth-changed', (e) => {
      this.customer = e.detail;
      this.isAuthenticated = Boolean(e.detail);
      this.updateAccountBadge();
    });

    this.updateCartBadge();
    this.updateAccountBadge();
  },

  // Update Cart Badge in Header
  updateCartBadge() {
    const badge = document.getElementById('header-cart-badge');
    if (badge) {
      badge.textContent = CartService.getCount(this.cart);
    }
  },

  // Update Account Label in Header
  updateAccountBadge() {
    const accBtn = document.getElementById('header-account-btn');
    if (accBtn) {
      const label = accBtn.querySelector('.account-name-label');
      if (label) {
        label.textContent = this.isAuthenticated && this.customer ? this.customer.name.split(' ')[0] : 'Account';
      }
    }
  },

  // Toast Notification System
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

window.CustomerState = CustomerState;

// Backward compatibility bridge for existing code / admin.js
if (typeof window.State === 'undefined' || !window.State.showToast) {
  window.State = {
    ...CustomerState,
    getCartSubtotal: () => CartService.getSubtotal(),
    getCartCount: () => CartService.getCount(),
    getDeliveryFee: (st) => CartService.getDeliveryFee(st),
    clearCart: () => CartService.clearCart(),
    showToast: (m, t) => CustomerState.showToast(m, t)
  };
}
