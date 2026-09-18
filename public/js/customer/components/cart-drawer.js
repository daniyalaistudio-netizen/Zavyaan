// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — CART DRAWER
// Slide-over cart drawer with free shipping progress bar
// ==========================================================

const CartDrawer = {
  init() {
    window.addEventListener('cart-updated', () => {
      this.render();
    });
  },

  open() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (drawer && overlay) {
      drawer.classList.add('active');
      overlay.classList.add('active');
      this.render();
    }
  },

  close() {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-drawer-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  },

  render() {
    const items = CartService.getItems();
    const count = CartService.getCount(items);
    const subtotal = CartService.getSubtotal(items);
    const remaining = CartService.getAmountForFreeShipping(subtotal);

    // Header count
    const countEl = document.getElementById('cart-header-count');
    if (countEl) countEl.textContent = `(${count})`;

    // Shipping Progress Bar
    const shippingBar = document.getElementById('cart-shipping-bar');
    if (shippingBar) {
      const percentage = Math.min(100, Math.round((subtotal / CartService.shippingThreshold) * 100));
      shippingBar.innerHTML = `
        <div class="shipping-progress-text">
          <span>${remaining > 0 ? `Add <strong>${Formatters.formatPKR(remaining)}</strong> more for <strong>FREE Delivery</strong>!` : '🎉 <strong>FREE Delivery</strong> Unlocked Across Pakistan!'}</span>
          <span>${percentage}%</span>
        </div>
        <div class="shipping-progress-track">
          <div class="shipping-progress-fill" style="width: ${percentage}%;"></div>
        </div>
      `;
    }

    // Body items
    const body = document.getElementById('cart-drawer-body');
    if (body) {
      if (items.length === 0) {
        body.innerHTML = `
          <div class="empty-state" style="border: none; padding: 40px 10px;">
            <div class="empty-state-icon">🛒</div>
            <h3 style="font-size: 1.15rem; margin-bottom: 6px;">Your cart is empty</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); margin-bottom: 16px;">
              Explore curated Pakistani fashion, jewellery, toys, and tech essentials.
            </p>
            <button class="btn btn-sm btn-primary" onclick="CartDrawer.close(); location.hash='#shop';">
              Start Shopping
            </button>
          </div>
        `;
      } else {
        body.innerHTML = items.map(item => `
          <div class="cart-item">
            <img src="${item.image}" alt="${Utils.escapeHtml(item.title)}" class="cart-item-img">
            <div class="cart-item-info">
              <h4 class="cart-item-title">${Utils.escapeHtml(item.title)}</h4>
              ${item.selected_variant ? `<div class="cart-item-variant">${Utils.escapeHtml(item.selected_variant.variant_type || 'Opt')}: ${Utils.escapeHtml(item.selected_variant.name)}</div>` : ''}
              <div class="cart-item-price">${Formatters.formatPKR(item.price)}</div>
              
              <div class="cart-item-bottom">
                <div class="qty-control" style="transform: scale(0.85); transform-origin: left center;">
                  <button class="qty-btn" onclick="CartService.updateQuantity('${item.id}', '${item.variantKey}', -1)">-</button>
                  <input type="text" class="qty-input" value="${item.quantity}" readonly>
                  <button class="qty-btn" onclick="CartService.updateQuantity('${item.id}', '${item.variantKey}', 1)">+</button>
                </div>
                <button class="cart-remove-btn" onclick="CartService.removeItem('${item.id}', '${item.variantKey}')">Remove</button>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Subtotal
    const subtotalEl = document.getElementById('cart-drawer-subtotal');
    if (subtotalEl) {
      subtotalEl.textContent = Formatters.formatPKR(subtotal);
    }
  }
};

window.CartDrawer = CartDrawer;
