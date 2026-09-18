// ==========================================================
// ZAVYAAN CUSTOMER PAGES — CHECKOUT EXPERIENCE
// Guest & logged-in checkout, COD & Advance Payment (Rs. 100 off), Pakistani regional dropdowns
// ==========================================================

const CheckoutPage = {
  selectedPaymentMethod: 'COD', // code of one of the admin-enabled methods
  paymentMethods: [],           // enabled methods from store settings

  async render(container) {
    const items = CartService.getItems();
    if (items.length === 0) {
      container.innerHTML = `
        <div class="container section-padding">
          ${StateComponents.renderEmptyState(
            'Your Cart is Empty',
            'Please add products to your cart before proceeding to checkout.',
            `<a href="#shop" class="btn btn-primary">Browse Catalog</a>`
          )}
        </div>
      `;
      return;
    }

    const customer = AuthService.getCurrentUser();
    const savedAddresses = customer ? CustomerService.getSavedAddresses() : [];
    const defaultAddr = savedAddresses.find(a => a.is_default) || (savedAddresses.length > 0 ? savedAddresses[0] : null);

    // Payment methods come from Admin → Storefront. Only enabled ones are
    // offered; the server refuses anything else, so this list is the truth.
    this.paymentMethods = await SettingsService.getPaymentMethods();
    if (!this.paymentMethods.some(m => m.code === this.selectedPaymentMethod)) {
      this.selectedPaymentMethod = this.paymentMethods.length > 0 ? this.paymentMethods[0].code : null;
    }
    const activeMethod = this.paymentMethods.find(m => m.code === this.selectedPaymentMethod) || null;

    const subtotal = CartService.getSubtotal(items);
    const deliveryFee = CartService.getDeliveryFee(subtotal);
    const methodDiscount = activeMethod ? Math.min(subtotal + deliveryFee, Number(activeMethod.discount) || 0) : 0;
    const finalTotal = Math.max(0, subtotal + deliveryFee - methodDiscount);

    container.innerHTML = `
      <div class="container section-padding">
        <div style="margin-bottom: 28px;">
          <div class="section-tagline">Secure Order Processing</div>
          <h1 style="font-size: 2.2rem; color: var(--color-rich-black); margin-bottom: 6px;">Checkout</h1>
          <p style="color: var(--color-text-secondary); font-size: 0.9rem;">
            Express delivery across all provinces and cities of Pakistan.
          </p>
        </div>

        <div class="checkout-grid">
          <!-- FORM SECTION -->
          <div class="checkout-card">
            <!-- 1. Customer & Shipping Info -->
            <h2 class="checkout-section-title">
              <span class="checkout-step-num">1</span>
              Delivery & Contact Details
            </h2>

            ${customer ? `
              <div style="background: var(--color-warm-ivory); padding: 12px 16px; border-radius: var(--radius-xs); margin-bottom: 20px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Logged in as <strong>${Utils.escapeHtml(customer.name)}</strong> (${Utils.escapeHtml(customer.email || customer.phone)})</span>
                <a href="#account" style="color: var(--color-gold-muted); font-weight: 600;">Account &rarr;</a>
              </div>
            ` : `
              <div style="background: var(--color-warm-ivory); padding: 12px 16px; border-radius: var(--radius-xs); margin-bottom: 20px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
                <span>Checking out as <strong>Guest</strong>. (No account needed)</span>
                <a href="#account/login" style="color: var(--color-gold-muted); font-weight: 600;">Login / Register &rarr;</a>
              </div>
            `}

            <form id="customer-checkout-form" onsubmit="CheckoutPage.handleSubmit(event)">
              <div class="form-group">
                <label class="form-label">Full Name <span class="req">*</span></label>
                <input type="text" id="chk-name" class="form-control" placeholder="e.g. Muhammad Ali" value="${defaultAddr ? Utils.escapeHtml(defaultAddr.recipient) : (customer ? Utils.escapeHtml(customer.name) : '')}" required>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Calling Mobile Number <span class="req">*</span></label>
                  <input type="tel" id="chk-phone" class="form-control" placeholder="0300 1234567" value="${defaultAddr ? Utils.escapeHtml(defaultAddr.phone) : (customer && customer.phone ? Utils.escapeHtml(customer.phone) : '')}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">WhatsApp Number (For Order Tracking)</label>
                  <input type="tel" id="chk-whatsapp" class="form-control" placeholder="0300 1234567" value="${customer && customer.whatsapp ? Utils.escapeHtml(customer.whatsapp) : ''}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address (For Order Receipt)</label>
                <input type="email" id="chk-email" class="form-control" placeholder="ali@example.com" value="${customer && customer.email ? Utils.escapeHtml(customer.email) : ''}">
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Province / Region <span class="req">*</span></label>
                  <select id="chk-province" class="form-control" required>
                    <option value="">-- Select Province --</option>
                    <option value="Punjab" ${defaultAddr && defaultAddr.province === 'Punjab' ? 'selected' : ''}>Punjab</option>
                    <option value="Sindh" ${defaultAddr && defaultAddr.province === 'Sindh' ? 'selected' : ''}>Sindh</option>
                    <option value="Khyber Pakhtunkhwa" ${defaultAddr && defaultAddr.province === 'Khyber Pakhtunkhwa' ? 'selected' : ''}>Khyber Pakhtunkhwa (KPK)</option>
                    <option value="Balochistan" ${defaultAddr && defaultAddr.province === 'Balochistan' ? 'selected' : ''}>Balochistan</option>
                    <option value="Islamabad Capital Territory" ${defaultAddr && defaultAddr.province === 'Islamabad Capital Territory' ? 'selected' : ''}>Islamabad Capital Territory</option>
                    <option value="Azad Jammu & Kashmir" ${defaultAddr && defaultAddr.province === 'Azad Jammu & Kashmir' ? 'selected' : ''}>Azad Jammu & Kashmir (AJK)</option>
                    <option value="Gilgit-Baltistan" ${defaultAddr && defaultAddr.province === 'Gilgit-Baltistan' ? 'selected' : ''}>Gilgit-Baltistan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">City <span class="req">*</span></label>
                  <input type="text" id="chk-city" class="form-control" placeholder="e.g. Lahore / Karachi / Islamabad" value="${defaultAddr ? Utils.escapeHtml(defaultAddr.city) : ''}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Complete Street Delivery Address <span class="req">*</span></label>
                <textarea id="chk-address" class="form-control" rows="3" placeholder="House/Flat #, Street #, Block/Phase, Sector/Colony" required>${defaultAddr ? Utils.escapeHtml(defaultAddr.address) : ''}</textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Special Delivery Instructions / Courier Notes (Optional)</label>
                <input type="text" id="chk-notes" class="form-control" placeholder="e.g. Call before delivery or deliver after 2 PM">
              </div>

              <!-- 2. PAYMENT METHODS (STEP B11) -->
              <div style="margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--color-border-light);">
                <h2 class="checkout-section-title">
                  <span class="checkout-step-num">2</span>
                  Select Payment Method
                </h2>

                ${this.renderPaymentMethods()}
              </div>

              <!-- Submit Button -->
              <div style="margin-top: 36px;">
                <button type="submit" id="btn-place-order" class="btn btn-primary btn-lg btn-block" style="font-size: 1.05rem;" ${activeMethod ? '' : 'disabled'}>
                  ${activeMethod
                    ? (methodDiscount > 0
                        ? `Confirm Order with ${Utils.escapeHtml(activeMethod.label)} (Save Rs. ${methodDiscount}) &rarr;`
                        : `Confirm ${Utils.escapeHtml(activeMethod.label)} Order &rarr;`)
                    : 'Checkout Unavailable'}
                </button>
              </div>
            </form>
          </div>

          <!-- SUMMARY SECTION -->
          <div class="checkout-summary-box">
            <h3 style="font-size: 1.25rem; margin-bottom: 16px; color: var(--color-rich-black);">
              Order Summary (${CartService.getCount(items)} items)
            </h3>

            <div style="max-height: 280px; overflow-y: auto; margin-bottom: 16px;">
              ${items.map(it => `
                <div class="checkout-item-preview">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${it.image}" alt="${Utils.escapeHtml(it.title)}" style="width: 44px; height: 48px; border-radius: var(--radius-xs); object-fit: cover;">
                    <div>
                      <div style="font-size: 0.85rem; font-weight: 600;">${Utils.escapeHtml(it.title)}</div>
                      ${it.selected_variant ? `<div style="font-size: 0.72rem; color: var(--color-text-secondary);">${Utils.escapeHtml(it.selected_variant.variant_type || 'Opt')}: ${Utils.escapeHtml(it.selected_variant.name)}</div>` : ''}
                      <div style="font-size: 0.75rem; color: var(--color-text-secondary);">Qty: ${it.quantity}</div>
                    </div>
                  </div>
                  <strong>${Formatters.formatPKR(it.price * it.quantity)}</strong>
                </div>
              `).join('')}
            </div>

            <div class="checkout-totals-group">
              <div class="checkout-row">
                <span>Items Subtotal:</span>
                <strong>${Formatters.formatPKR(subtotal)}</strong>
              </div>
              <div class="checkout-row">
                <span>Nationwide Delivery:</span>
                <strong style="color: ${deliveryFee === 0 ? 'var(--color-status-success)' : 'inherit'};">
                  ${deliveryFee === 0 ? 'FREE DELIVERY' : Formatters.formatPKR(deliveryFee)}
                </strong>
              </div>

              ${methodDiscount > 0 ? `
                <div class="checkout-row discount-row">
                  <span>${Utils.escapeHtml(activeMethod.label)} Discount:</span>
                  <strong>- Rs. ${methodDiscount}</strong>
                </div>
              ` : ''}

              <div class="checkout-row total-row">
                <span>Final Payable Amount:</span>
                <span id="chk-display-total">${Formatters.formatPKR(finalTotal)}</span>
              </div>
            </div>

            <div style="margin-top: 24px; font-size: 0.78rem; color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>100% Encrypted & Safe Order Processing</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  // One card per enabled method. Icons: cash for COD, bolt for anything paid
  // in advance. Instructions (account details etc.) expand for the selected one.
  renderPaymentMethods() {
    if (this.paymentMethods.length === 0) {
      return `
        <div class="payment-unavailable">
          <strong>Checkout is temporarily unavailable.</strong><br>
          No payment method is currently enabled for this store. Please contact us on WhatsApp and we will help you place your order.
        </div>
      `;
    }

    return `
      <div class="payment-methods-grid">
        ${this.paymentMethods.map((m, i) => {
          const selected = m.code === this.selectedPaymentMethod;
          const discount = Number(m.discount) || 0;
          const icon = m.code === 'COD' ? '💵' : '⚡';
          return `
            <div class="payment-option-card ${selected ? 'selected' : ''}" onclick="CheckoutPage.setPaymentMethod('${Utils.escapeHtml(m.code)}')" role="radio" aria-checked="${selected}">
              <input type="radio" name="payment_method" value="${Utils.escapeHtml(m.code)}" class="payment-option-radio" ${selected ? 'checked' : ''} tabindex="-1">
              <div class="payment-option-body">
                <div class="payment-option-title">
                  <span>${icon} ${Utils.escapeHtml(m.label)}</span>
                  ${i === 0 ? '<span class="badge badge-cod">Default</span>' : ''}
                  ${discount > 0 ? `<span class="advance-discount-badge">Save Rs. ${discount} OFF</span>` : ''}
                </div>
                ${m.description ? `<p class="payment-option-desc">${Utils.escapeHtml(m.description)}</p>` : ''}
                ${(selected && m.instructions) ? `<div class="payment-instructions">${Utils.escapeHtml(m.instructions)}</div>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  setPaymentMethod(method) {
    if (!this.paymentMethods.some(m => m.code === method)) return;
    this.selectedPaymentMethod = method;
    this.render(document.getElementById('app-main'));
  },

  async handleSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-place-order');
    if (btn) {
      btn.disabled = true;
      btn.innerText = 'Authorizing & Submitting Order...';
    }

    try {
      if (!this.selectedPaymentMethod) {
        alert('No payment method is available right now. Please contact support.');
        if (btn) { btn.disabled = false; btn.innerText = 'Checkout Unavailable'; }
        return;
      }
      const name = document.getElementById('chk-name').value.trim();
      const phone = document.getElementById('chk-phone').value.trim();
      const whatsapp = document.getElementById('chk-whatsapp').value.trim();
      const email = document.getElementById('chk-email').value.trim();
      const province = document.getElementById('chk-province').value;
      const city = document.getElementById('chk-city').value.trim();
      const address = document.getElementById('chk-address').value.trim();
      const notes = document.getElementById('chk-notes').value.trim();

      if (!Validators.validatePakistaniPhone(phone)) {
        alert('Please enter a valid Pakistani mobile number (e.g. 0300 1234567).');
        if (btn) { btn.disabled = false; btn.innerText = 'Confirm Order'; }
        return;
      }

      const orderPayload = {
        customer_name: name,
        customer_phone: phone,
        customer_whatsapp: whatsapp || phone,
        customer_email: email,
        province,
        city,
        address,
        order_notes: notes,
        payment_method: this.selectedPaymentMethod, // code of an enabled method; server re-validates
        items: CartService.getItems()
      };

      const res = await OrderService.placeOrder(orderPayload);
      if (res.success && res.order) {
        CartService.clearCart();
        // Remember the phone for this browser session so the confirmation page can
        // verify the order without asking the customer to retype it.
        try {
          sessionStorage.setItem(`zavyaan_order_phone_${res.order.order_number}`, phone);
        } catch (err) { /* private mode - customer re-enters phone on the track page */ }
        location.hash = `#order-success/${res.order.order_number}`;
      } else {
        alert(res.message || 'Unable to place order. Please check all details.');
        if (btn) { btn.disabled = false; btn.innerText = 'Confirm Order'; }
      }
    } catch (err) {
      alert('Order error: ' + err.message);
      if (btn) { btn.disabled = false; btn.innerText = 'Confirm Order'; }
    }
  }
};

window.CheckoutPage = CheckoutPage;
