// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — CART SERVICE
// Guest and logged-in cart logic with Pakistani delivery threshold (Rs. 2,500)
// ==========================================================

const CartService = {
  storageKey: 'zavyaan_cart',
  shippingThreshold: 2500,
  standardShippingFee: 200,

  // Load items from local storage
  getItems() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Save items and notify subscribers
  saveItems(items) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (e) {
      console.error('[CartService] Error saving cart:', e);
    }
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: items }));
  },

  // Add product to cart with optional variant
  addItem(product, quantity = 1, selectedVariant = null) {
    const items = this.getItems();
    const variantKey = selectedVariant ? `${selectedVariant.variant_type || 'Opt'}:${selectedVariant.name}` : 'default';
    const existingIndex = items.findIndex(i => i.id === product.id && i.variantKey === variantKey);

    const basePrice = product.sale_price !== null && product.sale_price !== undefined
      ? Number(product.sale_price)
      : Number(product.regular_price);
    
    const priceAdjustment = selectedVariant ? Number(selectedVariant.price_adjustment || 0) : 0;
    const finalUnitPrice = basePrice + priceAdjustment;

    const primaryImage = (product.images && product.images.length > 0)
      ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].image_url)
      : (product.image_url || 'assets/images/product_fashion_kurti_1787668675195.jpg');

    if (existingIndex >= 0) {
      items[existingIndex].quantity += quantity;
    } else {
      items.push({
        id: product.id,
        title: product.title,
        price: finalUnitPrice,
        regular_price: Number(product.regular_price),
        image: primaryImage,
        quantity: quantity,
        variantKey: variantKey,
        selected_variant: selectedVariant,
        category_name: product.category_name || 'Zavyaan'
      });
    }

    this.saveItems(items);
    if (window.CustomerState) {
      window.CustomerState.showToast(`Added "${product.title}" to cart!`);
    }
    return items;
  },

  // Update item quantity
  updateQuantity(id, variantKey, delta) {
    const items = this.getItems();
    const item = items.find(i => i.id === id && i.variantKey === variantKey);
    if (item) {
      item.quantity += delta;
      if (item.quantity <= 0) {
        return this.removeItem(id, variantKey);
      }
      this.saveItems(items);
    }
    return items;
  },

  // Remove item
  removeItem(id, variantKey) {
    const items = this.getItems().filter(i => !(i.id === id && i.variantKey === variantKey));
    this.saveItems(items);
    if (window.CustomerState) {
      window.CustomerState.showToast('Item removed from cart');
    }
    return items;
  },

  // Clear cart
  clearCart() {
    this.saveItems([]);
  },

  // Subtotal
  getSubtotal(items = null) {
    const cart = items || this.getItems();
    return cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  },

  // Total count of items
  getCount(items = null) {
    const cart = items || this.getItems();
    return cart.reduce((sum, item) => sum + Number(item.quantity), 0);
  },

  // Estimated delivery fee (Backend remains authoritative)
  getDeliveryFee(subtotal) {
    if (subtotal === 0) return 0;
    return subtotal >= this.shippingThreshold ? 0 : this.standardShippingFee;
  },

  // Amount remaining for free shipping
  getAmountForFreeShipping(subtotal) {
    if (subtotal >= this.shippingThreshold) return 0;
    return this.shippingThreshold - subtotal;
  }
};

window.CartService = CartService;
