// ==========================================================
// ZAVYAAN STATE MANAGEMENT
// ==========================================================

const State = {
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
    sort: 'newest',
    onlyInStock: false
  },
  admin: {
    isAuthenticated: false,
    token: null,
    user: null
  },

  // Initialize from LocalStorage
  init() {
    try {
      const savedCart = localStorage.getItem('zavyaan_cart');
      if (savedCart) {
        this.cart = JSON.parse(savedCart);
      }
      const savedAdmin = localStorage.getItem('zavyaan_admin');
      if (savedAdmin) {
        this.admin = JSON.parse(savedAdmin);
      }
    } catch (e) {
      console.error('[State] Storage init error:', e);
    }
  },

  // Cart Methods
  saveCart() {
    try {
      localStorage.setItem('zavyaan_cart', JSON.stringify(this.cart));
    } catch (e) {
      console.error('[State] Cart save error:', e);
    }
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: this.cart }));
  },

  addToCart(product, quantity = 1, selectedVariant = null) {
    const variantKey = selectedVariant ? `${selectedVariant.variant_type}:${selectedVariant.name}` : 'default';
    const existingIndex = this.cart.findIndex(
      item => item.id === product.id && item.variantKey === variantKey
    );

    const price = product.sale_price !== null && product.sale_price !== undefined
      ? Number(product.sale_price)
      : Number(product.regular_price);
    
    const priceAdjustment = selectedVariant ? Number(selectedVariant.price_adjustment || 0) : 0;
    const finalUnitPrice = price + priceAdjustment;

    const primaryImage = product.images && product.images.length > 0
      ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].image_url)
      : (product.image_url || '');

    if (existingIndex >= 0) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        title: product.title,
        price: finalUnitPrice,
        regular_price: Number(product.regular_price),
        image: primaryImage,
        quantity: quantity,
        variantKey: variantKey,
        selected_variant: selectedVariant,
        category_name: product.category_name || ''
      });
    }

    this.saveCart();
    this.showToast(`Added "${product.title}" to cart!`);
  },

  updateCartQty(id, variantKey, delta) {
    const item = this.cart.find(i => i.id === id && i.variantKey === variantKey);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        this.removeFromCart(id, variantKey);
        return;
      }
      this.saveCart();
    }
  },

  removeFromCart(id, variantKey) {
    this.cart = this.cart.filter(i => !(i.id === id && i.variantKey === variantKey));
    this.saveCart();
    this.showToast('Item removed from cart');
  },

  clearCart() {
    this.cart = [];
    this.saveCart();
  },

  getCartSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getDeliveryFee(subtotal) {
    // Free delivery above Rs. 2,500 across Pakistan
    return subtotal >= 2500 || subtotal === 0 ? 0 : 200;
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
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

State.init();
window.State = State;
