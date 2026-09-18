// ==========================================================
// ZAVYAAN CUSTOMER PAGES — CART PAGE
// Standalone cart view synchronized with reactive CartService
// ==========================================================

const CartPage = {
  render(container) {
    const items = CartService.getItems();
    const count = CartService.getCount(items);
    const subtotal = CartService.getSubtotal(items);
    const deliveryFee = CartService.getDeliveryFee(subtotal);
    const total = subtotal + deliveryFee;
    const remaining = CartService.getAmountForFreeShipping(subtotal);

    if (items.length === 0) {
      container.innerHTML = `
        <div class="container section-padding">
          ${StateComponents.renderEmptyState(
            'Your Shopping Cart is Empty',
            'You have not added any items yet. Discover our curated Pakistani collections with Cash on Delivery nationwide.',
            `<a href="#shop" class="btn btn-primary btn-lg">Explore Catalog &rarr;</a>`
          )}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="container section-padding">
        <div style="margin-bottom: 28px;">
          <div class="section-tagline">Review Your Order</div>
          <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 6px;">Shopping Cart (${count} items)</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
            ${remaining > 0 ? `Add <strong>${Formatters.formatPKR(remaining)}</strong> more to unlock <strong>FREE Nationwide Delivery</strong>!` : '🎉 <strong>FREE Delivery</strong> Unlocked across Pakistan!'}
          </p>
        </div>

        <div class="cart-page-grid">
          <!-- ITEMS LIST -->
          <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: var(--space-xl);">
            ${items.map(item => `
              <div class="cart-item">
                <img src="${item.image}" alt="${Utils.escapeHtml(item.title)}" class="cart-item-img" style="width: 88px; height: 96px;">
                <div class="cart-item-info">
                  <h3 class="cart-item-title" style="font-size: 1.05rem;">${Utils.escapeHtml(item.title)}</h3>
                  ${item.selected_variant ? `<div class="cart-item-variant">${Utils.escapeHtml(item.selected_variant.variant_type || 'Option')}: ${Utils.escapeHtml(item.selected_variant.name)}</div>` : ''}
                  <div class="cart-item-price" style="font-size: 1rem; margin-top: 4px;">${Formatters.formatPKR(item.price)}</div>
                  
                  <div class="cart-item-bottom" style="margin-top: 14px;">
                    <div class="qty-control">
                      <button class="qty-btn" onclick="CartService.updateQuantity('${item.id}', '${item.variantKey}', -1); CartPage.render(document.getElementById('app-main'));">-</button>
                      <input type="text" class="qty-input" value="${item.quantity}" readonly>
                      <button class="qty-btn" onclick="CartService.updateQuantity('${item.id}', '${item.variantKey}', 1); CartPage.render(document.getElementById('app-main'));">+</button>
                    </div>
                    <button class="cart-remove-btn" onclick="CartService.removeItem('${item.id}', '${item.variantKey}'); CartPage.render(document.getElementById('app-main'));">
                      Remove Item
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--color-border-light);">
              <a href="#shop" class="btn btn-secondary">&larr; Continue Shopping</a>
              <button class="btn btn-sm btn-secondary" onclick="CartService.clearCart(); CartPage.render(document.getElementById('app-main'));">Clear Cart</button>
            </div>
          </div>

          <!-- SUMMARY CARD -->
          <div class="checkout-summary-box">
            <h3 style="font-size: 1.25rem; margin-bottom: 20px; color: var(--color-rich-black);">Order Summary</h3>

            <div class="checkout-totals-group">
              <div class="checkout-row">
                <span>Items Subtotal:</span>
                <strong>${Formatters.formatPKR(subtotal)}</strong>
              </div>
              <div class="checkout-row">
                <span>Estimated Delivery:</span>
                <strong style="color: ${deliveryFee === 0 ? 'var(--color-status-success)' : 'inherit'};">
                  ${deliveryFee === 0 ? 'FREE DELIVERY' : Formatters.formatPKR(deliveryFee)}
                </strong>
              </div>
              <div class="checkout-row total-row">
                <span>Estimated Total:</span>
                <span>${Formatters.formatPKR(total)}</span>
              </div>
            </div>

            <div style="margin-top: 24px;">
              <a href="#checkout" class="btn btn-primary btn-lg btn-block">
                Proceed to Checkout &rarr;
              </a>
            </div>

            <div style="margin-top: 20px; font-size: 0.78rem; color: var(--color-text-secondary); line-height: 1.5; display: flex; flex-direction: column; gap: 6px;">
              <div>🇵🇰 <strong>100% Cash on Delivery Nationwide</strong></div>
              <div>⚡ 2-4 business days express courier transit</div>
              <div>🔄 7-day hassle-free return and exchange guarantee</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.CartPage = CartPage;
