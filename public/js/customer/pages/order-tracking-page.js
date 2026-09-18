// ==========================================================
// ZAVYAAN CUSTOMER PAGES — ORDER TRACKING
// Visual 5-stage dispatch timeline and activity history lookup
// ==========================================================

const OrderTrackingPage = {
  async render(container, presetNumber = '', presetPhone = '') {
    container.innerHTML = `
      <div class="container section-padding" style="max-width: 800px;">
        <div style="text-align: center; margin-bottom: 36px;">
          <div class="section-tagline">Nationwide Courier Tracking</div>
          <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 8px;">Track Your Zavyaan Order</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.92rem;">
            Enter your Order Number (e.g. <code>ZV-2026-102450</code>) and the phone number you
            ordered with to view the live courier dispatch progress.
          </p>
        </div>

        <div style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm); padding: 32px; box-shadow: var(--shadow-sm); margin-bottom: 30px;">
          <form onsubmit="OrderTrackingPage.handleLookup(event)" style="display: grid; gap: 14px;">
            <div>
              <label class="form-label" for="track-order-input">Order Number</label>
              <input type="text" id="track-order-input" class="form-control" placeholder="e.g. ZV-2026-123456" value="${Utils.escapeHtml(presetNumber)}" required>
            </div>
            <div>
              <label class="form-label" for="track-phone-input">Phone Number Used at Checkout</label>
              <input type="tel" id="track-phone-input" class="form-control" placeholder="e.g. 0300 1234567" value="${Utils.escapeHtml(presetPhone)}" required>
              <div style="font-size: 0.76rem; color: var(--color-text-secondary); margin-top: 6px;">
                We ask for this so nobody else can look up your order details.
              </div>
            </div>
            <button type="submit" class="btn btn-primary" id="btn-track-submit">Track Order &rarr;</button>
          </form>
        </div>

        <div id="tracking-result-container"></div>
      </div>
    `;

    if (presetNumber && presetPhone) {
      await this.executeLookup(presetNumber, presetPhone);
    }
  },

  async handleLookup(e) {
    e.preventDefault();
    const input = document.getElementById('track-order-input');
    const phoneInput = document.getElementById('track-phone-input');
    if (!input || !phoneInput) return;
    const num = input.value.trim();
    const phone = phoneInput.value.trim();
    if (num && phone) {
      await this.executeLookup(num, phone);
    }
  },

  async executeLookup(orderNumber, phone = '') {
    const resultBox = document.getElementById('tracking-result-container');
    if (!resultBox) return;

    resultBox.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--color-gold-muted);">Querying live courier tracking...</div>`;

    try {
      const order = await OrderService.trackOrder(orderNumber, phone);
      if (!order) {
        resultBox.innerHTML = `
          <div class="error-state">
            No order found matching that order number and phone number. Please double-check your receipt or SMS confirmation.
          </div>
        `;
        return;
      }

      const steps = OrderStatus.FLOW;
      const currentIdx = steps.indexOf(order.order_status);

      resultBox.innerHTML = `
        <div class="tracking-timeline-box">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border-light); padding-bottom: 16px; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
            <div>
              <h3 style="font-size: 1.35rem; color: var(--color-rich-black);">Order #${Utils.escapeHtml(order.order_number)}</h3>
              <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">
                Recipient: <strong>${Utils.escapeHtml(order.customer_name)}</strong> • ${Utils.escapeHtml(order.city)}, ${Utils.escapeHtml(order.province)}
              </div>
            </div>
            <span class="status-pill status-${OrderStatus.slug(order.order_status)}">${order.order_status}</span>
          </div>

          <!-- DISPATCH PROGRESS -->
          ${OrderStatus.isException(order.order_status) ? `
            <div class="tracking-exception-notice status-${OrderStatus.slug(order.order_status)}">
              This order was <strong>${Utils.escapeHtml(order.order_status.toLowerCase())}</strong>
              and is no longer moving through dispatch. See the log below for details.
            </div>
          ` : `
            <div class="timeline-steps">
              ${steps.map((st, idx) => {
                const isCompleted = currentIdx >= idx;
                const isCurrent = currentIdx === idx;
                return `
                  <div class="timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="step-node">${isCompleted ? '✓' : idx + 1}</div>
                    <span class="step-label">${st}</span>
                  </div>
                `;
              }).join('')}
            </div>
          `}

          <!-- TIMELINE ACTIVITY LOG -->
          <div style="background: var(--color-warm-ivory); border-radius: var(--radius-xs); padding: 20px; margin-top: 28px; border: 1px solid var(--color-border-light);">
            <h4 style="font-size: 0.95rem; margin-bottom: 12px; color: var(--color-rich-black);">Dispatch Log & Updates</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${(order.timeline && order.timeline.length > 0) ? order.timeline.map(t => `
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; border-bottom: 1px dashed var(--color-border-medium); padding-bottom: 6px;">
                  <span><strong>${Utils.escapeHtml(t.status)}:</strong> ${Utils.escapeHtml(t.note || 'Status updated')}</span>
                  <span style="color: var(--color-text-secondary);">${Formatters.formatDate(t.created_at)}</span>
                </div>
              `).join('') : `
                <div style="font-size: 0.85rem; color: var(--color-text-secondary);">Parcel is currently being prepared at Zavyaan fulfillment center.</div>
              `}
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      resultBox.innerHTML = `
        <div class="error-state">
          Tracking error: ${Utils.escapeHtml(err.message)}
        </div>
      `;
    }
  }
};

window.OrderTrackingPage = OrderTrackingPage;
