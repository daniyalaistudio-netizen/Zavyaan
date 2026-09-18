// ==========================================================
// ZAVYAAN CUSTOMER PAGES — ORDER CONFIRMATION
// Success confirmation, order number display, WhatsApp link, and tracking CTA
// ==========================================================

const OrderConfirmationPage = {
  async render(container, orderNumber) {
    container.innerHTML = `
      <div class="container section-padding">
        <div style="text-align: center; padding: 60px; color: var(--color-gold-muted);">Verifying order details...</div>
      </div>
    `;

    try {
      let storedPhone = '';
      try {
        storedPhone = sessionStorage.getItem(`zavyaan_order_phone_${orderNumber}`) || '';
      } catch (err) { /* storage unavailable */ }

      const order = await OrderService.trackOrder(orderNumber, storedPhone);
      if (!order) {
        container.innerHTML = StateComponents.renderEmptyState(
          'Order Record Not Found',
          `We could not find an order matching "${Utils.escapeHtml(orderNumber)}".`,
          `<a href="#home" class="btn btn-primary">Return to Store</a>`
        );
        return;
      }

      // Pre-filled WhatsApp message for customer confirmation
      const waMsg = encodeURIComponent(`Hi Zavyaan! I have placed order #${order.order_number} for ${Formatters.formatPKR(order.total_amount)}. Please confirm dispatch.`);
      const waUrl = `https://wa.me/923001234567?text=${waMsg}`;

      container.innerHTML = `
        <div class="container section-padding">
          <div class="order-success-card">
            <div class="order-success-icon">✓</div>
            <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 8px;">Order Confirmed!</h1>
            <p style="color: var(--color-text-secondary); font-size: 0.95rem;">
              Thank you for shopping with Zavyaan. Your order has been registered and is being prepared for dispatch.
            </p>

            <div class="order-number-banner">
              Tracking Number: <strong>${Utils.escapeHtml(order.order_number)}</strong>
            </div>

            <!-- Order Details Box -->
            <div style="background: var(--color-warm-ivory); border-radius: var(--radius-xs); border: 1px solid var(--color-border-light); padding: 24px; text-align: left; margin-bottom: 24px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 0.9rem;">
                <div><strong>Customer Name:</strong> ${Utils.escapeHtml(order.customer_name)}</div>
                <div><strong>Destination:</strong> ${Utils.escapeHtml(order.city)}, ${Utils.escapeHtml(order.province)}</div>
                <div><strong>Payment Method:</strong> ${order.payment_method === 'COD' ? '💵 ' : '⚡ '}${Utils.escapeHtml(SettingsService.paymentLabel(order.payment_method))}</div>
                <div><strong>Total Amount:</strong> <strong style="color: var(--color-rich-black); font-size: 1.05rem;">${Formatters.formatPKR(order.total_amount)}</strong></div>
                <div><strong>Order Status:</strong> <span class="status-pill status-${OrderStatus.slug(order.order_status)}">${order.order_status}</span></div>
                <div><strong>Date:</strong> ${Formatters.formatDate(order.created_at)}</div>
              </div>
            </div>

            <!-- CTAs -->
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <a href="#track?num=${order.order_number}" class="btn btn-primary btn-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                Track Live Dispatch
              </a>

              <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-gold btn-lg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                WhatsApp Confirmation
              </a>

              <a href="#shop" class="btn btn-secondary btn-lg">
                Continue Shopping
              </a>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, `OrderConfirmationPage.render(document.getElementById('app-main'), '${orderNumber}')`);
    }
  }
};

window.OrderConfirmationPage = OrderConfirmationPage;
