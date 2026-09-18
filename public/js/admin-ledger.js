// ==========================================================
// ZAVYAAN ADMIN — ACCOUNTS & LEDGER
// ==========================================================
// Vendors & Purchases, Expenses, and the Accounts view (profit & loss +
// per-vendor ledger). Extends the Admin controller in admin.js.
//
// Cost model shown to the owner everywhere:
//   Vendor amount   = qty × unit price + delivery      (what the vendor is owed)
//   Total lot cost  = vendor amount + extra (marketing / buffer)
//   Landed per unit = total lot cost ÷ qty            → product cost (weighted avg)
// ==========================================================

const fmt = (v) => UI.formatPrice(Number(v) || 0);
const esc = (v) => Utils.escapeHtml(String(v === undefined || v === null ? '' : v));
const dateStr = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
// Local calendar date as YYYY-MM-DD (never toISOString — that is UTC and is a
// day behind in Pakistan until 05:00).
const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => localISO();
const closeModal = () => document.getElementById('admin-modal').classList.remove('active');

function openModal(html) {
  const modal = document.getElementById('admin-modal');
  const body = document.getElementById('admin-modal-body');
  if (!modal || !body) return;
  body.innerHTML = html;
  modal.classList.add('active');
}

function sectionHeader(title, subtitle, actionsHtml = '') {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 style="font-size: 1.5rem; color: var(--color-primary-black);">${title}</h2>
        <p style="color: var(--color-text-secondary); font-size: 0.85rem;">${subtitle}</p>
      </div>
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">${actionsHtml}</div>
    </div>`;
}

function card(title, body, extra = '') {
  return `
    <section class="admin-card">
      <div class="admin-card-head">
        <h3>${title}</h3>
        <div>${extra}</div>
      </div>
      ${body}
    </section>`;
}

const balancePill = (v) => {
  const n = Number(v) || 0;
  if (n > 0) return `<span class="status-pill status-pending" title="Amount still owed to this vendor">Owes ${fmt(n)}</span>`;
  if (n < 0) return `<span class="status-pill status-confirmed" title="Paid more than purchased">Advance ${fmt(-n)}</span>`;
  return `<span class="status-pill status-delivered">Settled</span>`;
};

Object.assign(Admin, {
  cachedVendors: [],
  cachedExpenseCategories: ['Marketing', 'Packaging', 'Delivery', 'Salaries', 'Rent & Utilities', 'Software & Tools', 'Returns & Refunds', 'Other'],

  // ============================================================
  // VENDORS & PURCHASES
  // ============================================================
  async renderVendors() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div class="admin-loading">Loading vendors & purchases...</div>`;
    try {
      const [{ vendors }, { purchases }, { payments }, summary, prodRes] = await Promise.all([
        API.getVendors(), API.getPurchases(), API.getVendorPayments(), API.getLedgerSummary(), API.getProducts({ all: true, limit: 500 })
      ]);
      this.cachedVendors = vendors;
      this.cachedProducts = prodRes.products || [];
      const ledgerByVendor = Object.fromEntries(summary.vendor_ledger.map(l => [l.vendor.id, l]));
      const vendorName = (id) => { const v = vendors.find(x => x.id === id); return v ? v.name : '—'; };
      const t = summary.totals;

      content.innerHTML = `
        ${sectionHeader('Vendors & Purchases', 'Who you buy from, what you bought, what it really cost, and what you still owe.', `
          <button class="btn btn-sm btn-secondary" onclick="Admin.openPaymentModal()">+ Record Payment</button>
          <button class="btn btn-sm btn-secondary" onclick="Admin.openPurchaseModal()">+ Record Purchase</button>
          <button class="btn btn-sm btn-primary" onclick="Admin.openVendorModal()">+ Add Vendor</button>
        `)}

        <div class="stats-kpi-grid">
          ${this.kpi('Vendors', t.vendors, '🏭')}
          ${this.kpi('Items sourced', t.items_sourced.toLocaleString('en-PK'), '📦', `${t.purchases} purchase${t.purchases === 1 ? '' : 's'}`)}
          ${this.kpi('Total purchased', fmt(t.total_purchased), '🧾', 'owed to vendors (incl. delivery)')}
          ${this.kpi('Total paid', fmt(t.total_paid), '💸')}
          ${this.kpi('Pending balance', fmt(t.pending_balance), '⏳', t.pending_balance > 0 ? 'still to pay' : 'all settled', t.pending_balance > 0 ? 'kpi-warn' : '')}
        </div>

        ${card('Vendor Ledger', `
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Vendor</th><th>Contact</th><th class="num">Items sourced</th><th class="num">Products</th><th class="num">Total purchased</th><th class="num">Paid</th><th class="num">Pending</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                ${vendors.length === 0 ? `<tr><td colspan="9" class="empty-cell">No vendors yet. Add the supplier you buy stock from, then record a purchase.</td></tr>` : vendors.map(v => {
                  const l = ledgerByVendor[v.id] || { items_sourced: 0, products_count: 0, total_purchased: 0, total_paid: 0, pending_balance: 0 };
                  return `
                  <tr class="${v.is_active === false ? 'row-disabled' : ''}">
                    <td><strong>${esc(v.name)}</strong>${v.city ? `<br><small style="color: var(--color-text-secondary);">${esc(v.city)}</small>` : ''}</td>
                    <td>${esc(v.contact_person || '')}${v.phone ? `<br><a href="https://wa.me/${esc(String(v.whatsapp || v.phone).replace(/[^0-9]/g, ''))}" target="_blank" style="color: var(--color-gold-muted); font-size: 0.78rem; font-weight: 600;">📱 ${esc(v.phone)}</a>` : ''}</td>
                    <td class="num">${l.items_sourced.toLocaleString('en-PK')}</td>
                    <td class="num">${l.products_count}</td>
                    <td class="num">${fmt(l.total_purchased)}</td>
                    <td class="num">${fmt(l.total_paid)}</td>
                    <td class="num"><strong>${fmt(l.pending_balance)}</strong></td>
                    <td>${balancePill(l.pending_balance)}</td>
                    <td style="white-space: nowrap;">
                      <button class="btn btn-sm btn-secondary" onclick="Admin.openVendorStatement('${v.id}')">Statement</button>
                      <button class="btn btn-sm btn-secondary" onclick="Admin.openPaymentModal('${v.id}')">Pay</button>
                      <button class="btn btn-sm btn-secondary" onclick="Admin.openVendorModal('${v.id}')">Edit</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `)}

        ${card('Purchases (stock in)', `
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Date</th><th>Vendor</th><th>Product</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Delivery</th><th class="num">Extra (marketing / buffer)</th><th class="num">Vendor amount</th><th class="num">Landed / unit</th><th></th></tr></thead>
              <tbody>
                ${purchases.length === 0 ? `<tr><td colspan="10" class="empty-cell">No purchases recorded. A purchase adds stock to the product and sets its landed cost.</td></tr>` : purchases.map(p => `
                  <tr>
                    <td>${dateStr(p.purchase_date)}${p.reference ? `<br><small style="color: var(--color-text-secondary);">${esc(p.reference)}</small>` : ''}</td>
                    <td>${esc(vendorName(p.vendor_id))}</td>
                    <td class="wrap-cell">${esc(p.product_title)}</td>
                    <td class="num">${p.quantity}</td>
                    <td class="num">${fmt(p.unit_cost)}</td>
                    <td class="num">${fmt(p.shipping_cost)}</td>
                    <td class="num">${fmt(p.extra_cost)}${p.extra_cost_note ? `<br><small style="color: var(--color-text-secondary);">${esc(p.extra_cost_note)}</small>` : ''}</td>
                    <td class="num"><strong>${fmt(p.vendor_amount)}</strong></td>
                    <td class="num">${fmt(p.landed_unit_cost)}</td>
                    <td><button class="btn btn-sm btn-secondary" title="Remove record (stock is not reversed)" onclick="Admin.deletePurchase('${p.id}')">🗑</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `, `<span style="font-size: 0.78rem; color: var(--color-text-secondary);">Vendor amount = qty × unit + delivery · Landed = (vendor amount + extra) ÷ qty</span>`)}

        ${card('Vendor Payments', `
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Date</th><th>Vendor</th><th>Method</th><th>Reference</th><th class="num">Amount</th><th></th></tr></thead>
              <tbody>
                ${payments.length === 0 ? `<tr><td colspan="6" class="empty-cell">No payments recorded yet.</td></tr>` : payments.map(p => `
                  <tr>
                    <td>${dateStr(p.payment_date)}</td>
                    <td>${esc(vendorName(p.vendor_id))}</td>
                    <td>${esc(p.method || 'Cash')}</td>
                    <td>${esc(p.reference || '—')}${p.notes ? `<br><small style="color: var(--color-text-secondary);">${esc(p.notes)}</small>` : ''}</td>
                    <td class="num"><strong>${fmt(p.amount)}</strong></td>
                    <td><button class="btn btn-sm btn-secondary" onclick="Admin.deleteVendorPayment('${p.id}')">🗑</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `)}
      `;
    } catch (e) {
      content.innerHTML = `<div class="admin-error">Error loading vendors: ${esc(e.message)}</div>`;
    }
  },

  kpi(label, value, icon, hint = '', cls = '') {
    return `
      <div class="kpi-card ${cls}">
        <div>
          <div class="kpi-label">${label}</div>
          <div class="kpi-val">${value}</div>
          ${hint ? `<div class="kpi-hint">${hint}</div>` : ''}
        </div>
        <div class="kpi-icon">${icon}</div>
      </div>`;
  },

  openVendorModal(id = null) {
    const v = id ? this.cachedVendors.find(x => x.id === id) : null;
    openModal(`
      <h3 class="modal-title">${v ? 'Edit Vendor' : 'Add Vendor'}</h3>
      <form onsubmit="Admin.handleSaveVendor(event, ${v ? `'${v.id}'` : 'null'})">
        <div class="form-group"><label class="form-label">Vendor / supplier name <span class="req">*</span></label><input id="ven-name" class="form-control" required value="${esc(v && v.name)}" placeholder="e.g. Karachi Lights Traders"></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Contact person</label><input id="ven-contact" class="form-control" value="${esc(v && v.contact_person)}"></div>
          <div class="form-group"><label class="form-label">Phone / WhatsApp</label><input id="ven-phone" class="form-control" value="${esc(v && v.phone)}" placeholder="0300 1234567"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">City</label><input id="ven-city" class="form-control" value="${esc(v && v.city)}"></div>
          <div class="form-group"><label class="form-label">Email</label><input id="ven-email" class="form-control" type="email" value="${esc(v && v.email)}"></div>
        </div>
        <div class="form-group"><label class="form-label">Address</label><input id="ven-address" class="form-control" value="${esc(v && v.address)}"></div>
        <div class="form-group"><label class="form-label">Notes</label><textarea id="ven-notes" class="form-control" rows="2">${esc(v && v.notes)}</textarea></div>
        ${v ? `<div class="form-group" style="display: flex; gap: 10px; align-items: center;"><input type="checkbox" id="ven-active" ${v.is_active !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--color-gold-primary);"><label for="ven-active" style="font-size: 0.85rem; font-weight: 600; cursor: pointer;">Active vendor (appears in purchase form)</label></div>` : ''}
        <div class="modal-actions">
          ${v ? `<button type="button" class="btn btn-secondary" style="margin-right: auto;" onclick="Admin.deleteVendor('${v.id}')">Delete</button>` : ''}
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">${v ? 'Save Changes' : 'Add Vendor'}</button>
        </div>
      </form>
    `);
  },

  async handleSaveVendor(e, id) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('ven-name').value.trim(),
      contact_person: document.getElementById('ven-contact').value.trim(),
      phone: document.getElementById('ven-phone').value.trim(),
      city: document.getElementById('ven-city').value.trim(),
      email: document.getElementById('ven-email').value.trim(),
      address: document.getElementById('ven-address').value.trim(),
      notes: document.getElementById('ven-notes').value.trim()
    };
    const activeEl = document.getElementById('ven-active');
    if (activeEl) payload.is_active = activeEl.checked;
    try {
      if (id) await API.updateVendor(id, payload); else await API.createVendor(payload);
      State.showToast(id ? 'Vendor updated.' : `Vendor "${payload.name}" added.`);
      closeModal();
      await this.renderVendors();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async deleteVendor(id) {
    if (!confirm('Delete this vendor? Only possible if it has no purchases.')) return;
    try {
      await API.deleteVendor(id);
      State.showToast('Vendor deleted.');
      closeModal();
      await this.renderVendors();
    } catch (err) { alert(err.message); }
  },

  // ---- Purchase (stock in) with live landed-cost calculator ----
  async openPurchaseModal(preProductId = null) {
    if (this.cachedVendors.length === 0) { const r = await API.getVendors(); this.cachedVendors = r.vendors; }
    if (!this.cachedProducts || this.cachedProducts.length === 0) { const r = await API.getProducts({ all: true, limit: 500 }); this.cachedProducts = r.products; }
    const activeVendors = this.cachedVendors.filter(v => v.is_active !== false);
    if (activeVendors.length === 0) { alert('Add a vendor first — every purchase is recorded against a vendor.'); this.openVendorModal(); return; }

    openModal(`
      <h3 class="modal-title">Record Purchase (Stock In)</h3>
      <p class="modal-sub">Adds the quantity to the product's stock and updates its landed cost. Delivery is added to what you owe the vendor; marketing / buffer is your own cost and is added to the landed price only.</p>
      <form onsubmit="Admin.handleSavePurchase(event)">
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Vendor <span class="req">*</span></label>
            <select id="pur-vendor" class="form-control" required>${activeVendors.map(v => `<option value="${v.id}">${esc(v.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Product <span class="req">*</span></label>
            <select id="pur-product" class="form-control" required>${this.cachedProducts.map(p => `<option value="${p.id}" ${p.id === preProductId ? 'selected' : ''}>${esc(p.title)} (stock ${p.stock_quantity})</option>`).join('')}</select></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Quantity received <span class="req">*</span></label><input id="pur-qty" type="number" min="1" class="form-control" value="10" required oninput="Admin.recalcPurchase()"></div>
          <div class="form-group"><label class="form-label">Vendor price per unit (Rs.) <span class="req">*</span></label><input id="pur-unit" type="number" min="0" step="0.01" class="form-control" placeholder="1500" required oninput="Admin.recalcPurchase()"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Delivery / shipping for this lot (Rs.)</label><input id="pur-ship" type="number" min="0" step="0.01" class="form-control" value="0" oninput="Admin.recalcPurchase()"></div>
          <div class="form-group"><label class="form-label">Extra: marketing / buffer for this lot (Rs.)</label><input id="pur-extra" type="number" min="0" step="0.01" class="form-control" value="0" placeholder="e.g. 200" oninput="Admin.recalcPurchase()"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Extra cost note</label><input id="pur-extra-note" class="form-control" placeholder="e.g. Marketing buffer"></div>
          <div class="form-group"><label class="form-label">Purchase date</label><input id="pur-date" type="date" class="form-control" value="${todayISO()}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Invoice / reference</label><input id="pur-ref" class="form-control" placeholder="INV-0042"></div>
          <div class="form-group"><label class="form-label">Notes</label><input id="pur-notes" class="form-control"></div>
        </div>

        <div class="cost-calc" id="pur-calc">
          <div><span>Vendor amount</span><strong id="calc-vendor">Rs. 0</strong><small>qty × unit + delivery</small></div>
          <div><span>Total lot cost</span><strong id="calc-total">Rs. 0</strong><small>+ extra</small></div>
          <div class="cost-calc-main"><span>Landed cost per unit</span><strong id="calc-landed">Rs. 0</strong><small>total ÷ qty</small></div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Record Purchase & Add Stock</button>
        </div>
      </form>
    `);
    this.recalcPurchase();
  },

  recalcPurchase() {
    const qty = Math.max(0, Math.floor(Number(document.getElementById('pur-qty').value) || 0));
    const unit = Number(document.getElementById('pur-unit').value) || 0;
    const ship = Number(document.getElementById('pur-ship').value) || 0;
    const extra = Number(document.getElementById('pur-extra').value) || 0;
    const vendorAmt = qty * unit + ship;
    const total = vendorAmt + extra;
    document.getElementById('calc-vendor').textContent = fmt(vendorAmt);
    document.getElementById('calc-total').textContent = fmt(total);
    document.getElementById('calc-landed').textContent = qty > 0 ? fmt(total / qty) : '—';
  },

  async handleSavePurchase(e) {
    e.preventDefault();
    const payload = {
      vendor_id: document.getElementById('pur-vendor').value,
      product_id: document.getElementById('pur-product').value,
      quantity: Number(document.getElementById('pur-qty').value),
      unit_cost: Number(document.getElementById('pur-unit').value),
      shipping_cost: Number(document.getElementById('pur-ship').value) || 0,
      extra_cost: Number(document.getElementById('pur-extra').value) || 0,
      extra_cost_note: document.getElementById('pur-extra-note').value.trim(),
      purchase_date: document.getElementById('pur-date').value,
      reference: document.getElementById('pur-ref').value.trim(),
      notes: document.getElementById('pur-notes').value.trim()
    };
    try {
      const res = await API.createPurchase(payload);
      State.showToast(`Purchase recorded. Stock now ${res.stock ? res.stock.stock_quantity : '—'}, landed cost ${res.stock ? fmt(res.stock.cost_price) : '—'}.`);
      closeModal();
      if (this.currentTab === 'products') await this.renderProducts(); else await this.renderVendors();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async deletePurchase(id) {
    if (!confirm('Remove this purchase record? The stock it added is NOT reversed — adjust the product stock manually if needed.')) return;
    try { await API.deletePurchase(id); State.showToast('Purchase record removed.'); await this.renderVendors(); }
    catch (err) { alert(err.message); }
  },

  // ---- Vendor payment ----
  async openPaymentModal(preVendorId = null) {
    if (this.cachedVendors.length === 0) { const r = await API.getVendors(); this.cachedVendors = r.vendors; }
    if (this.cachedVendors.length === 0) { alert('Add a vendor first.'); return; }
    openModal(`
      <h3 class="modal-title">Record Vendor Payment</h3>
      <form onsubmit="Admin.handleSavePayment(event)">
        <div class="form-group"><label class="form-label">Vendor <span class="req">*</span></label>
          <select id="pay-vendor" class="form-control" required>${this.cachedVendors.map(v => `<option value="${v.id}" ${v.id === preVendorId ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Amount paid (Rs.) <span class="req">*</span></label><input id="pay-amount" type="number" min="1" step="0.01" class="form-control" required></div>
          <div class="form-group"><label class="form-label">Method</label>
            <select id="pay-method" class="form-control">${['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Cheque', 'Other'].map(m => `<option>${m}</option>`).join('')}</select></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Date</label><input id="pay-date" type="date" class="form-control" value="${todayISO()}"></div>
          <div class="form-group"><label class="form-label">Reference / transaction ID</label><input id="pay-ref" class="form-control"></div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><input id="pay-notes" class="form-control"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Record Payment</button>
        </div>
      </form>
    `);
  },

  async handleSavePayment(e) {
    e.preventDefault();
    try {
      await API.createVendorPayment({
        vendor_id: document.getElementById('pay-vendor').value,
        amount: Number(document.getElementById('pay-amount').value),
        method: document.getElementById('pay-method').value,
        payment_date: document.getElementById('pay-date').value,
        reference: document.getElementById('pay-ref').value.trim(),
        notes: document.getElementById('pay-notes').value.trim()
      });
      State.showToast('Payment recorded.');
      closeModal();
      await this.renderVendors();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async deleteVendorPayment(id) {
    if (!confirm('Remove this payment record?')) return;
    try { await API.deleteVendorPayment(id); State.showToast('Payment removed.'); await this.renderVendors(); }
    catch (err) { alert(err.message); }
  },

  async openVendorStatement(id) {
    openModal(`<div class="admin-loading">Loading statement...</div>`);
    try {
      const { vendor, entries, balance } = await API.getVendorStatement(id);
      openModal(`
        <h3 class="modal-title">Statement — ${esc(vendor.name)}</h3>
        <p class="modal-sub">Purchases increase what you owe; payments reduce it. Running balance on the right.</p>
        <div class="table-responsive" style="max-height: 55vh; overflow-y: auto;">
          <table class="admin-table">
            <thead><tr><th>Date</th><th>Entry</th><th>Ref</th><th class="num">Purchased</th><th class="num">Paid</th><th class="num">Balance</th></tr></thead>
            <tbody>
              ${entries.length === 0 ? `<tr><td colspan="6" class="empty-cell">No entries yet.</td></tr>` : entries.map(e => `
                <tr>
                  <td>${dateStr(e.date)}</td>
                  <td>${e.type === 'purchase' ? '🧾' : '💸'} ${esc(e.description)}</td>
                  <td>${esc(e.ref || '—')}</td>
                  <td class="num">${e.debit ? fmt(e.debit) : ''}</td>
                  <td class="num">${e.credit ? fmt(e.credit) : ''}</td>
                  <td class="num"><strong>${fmt(e.balance)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
          <div>Closing balance: ${balancePill(balance)}</div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary" onclick="Admin.openPaymentModal('${vendor.id}')">Record Payment</button>
            <button class="btn btn-primary" onclick="document.getElementById('admin-modal').classList.remove('active')">Close</button>
          </div>
        </div>
      `);
    } catch (err) { openModal(`<div class="admin-error">${esc(err.message)}</div>`); }
  },

  // ============================================================
  // EXPENSES
  // ============================================================
  // Filter state persists while the tab is open: preset | from | to | category
  expenseFilter: { preset: 'all', from: '', to: '', category: '' },
  cachedExpenses: [],

  setExpenseFilter(field, value) {
    this.expenseFilter[field] = value;
    if (field === 'preset') {
      const d = new Date(); const iso = localISO;
      const start = new Date(d);
      if (value === 'today') { this.expenseFilter.from = iso(start); this.expenseFilter.to = iso(start); }
      else if (value === 'yesterday') { start.setDate(start.getDate() - 1); this.expenseFilter.from = iso(start); this.expenseFilter.to = iso(start); }
      else if (value === 'week') { start.setDate(start.getDate() - 6); this.expenseFilter.from = iso(start); this.expenseFilter.to = iso(d); }
      else if (value === 'month') { this.expenseFilter.from = iso(new Date(d.getFullYear(), d.getMonth(), 1)); this.expenseFilter.to = iso(d); }
      else if (value === 'all') { this.expenseFilter.from = ''; this.expenseFilter.to = ''; }
    } else if (field === 'from' || field === 'to') {
      this.expenseFilter.preset = 'custom';
    }
    this.renderExpenses(true);
  },

  async renderExpenses(useCache = false) {
    const content = document.getElementById('admin-tab-content');
    if (!useCache) content.innerHTML = `<div class="admin-loading">Loading expenses...</div>`;
    try {
      if (!useCache || this.cachedExpenses.length === 0) {
        const res = await API.getExpenses();
        this.cachedExpenses = res.expenses;
        this.cachedExpenseCategories = res.categories || this.cachedExpenseCategories;
      }
      const all = this.cachedExpenses;
      const f = this.expenseFilter;
      const day = (e) => e.expense_date ? String(e.expense_date).slice(0, 10) : localISO(new Date(e.created_at || 0));
      const expenses = all.filter(e => (!f.from || day(e) >= f.from) && (!f.to || day(e) <= f.to) && (!f.category || e.category === f.category));
      const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const grand = all.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const todayKey = localISO();
      const today = all.filter(e => day(e) === todayKey).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const byCat = this.cachedExpenseCategories.map(c => ({ category: c, amount: expenses.filter(e => e.category === c).reduce((s, e) => s + (Number(e.amount) || 0), 0) })).filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount);
      const rangeLabel = f.preset === 'all' ? 'All time' : f.preset === 'today' ? 'Today' : f.preset === 'yesterday' ? 'Yesterday' : f.preset === 'week' ? 'Last 7 days' : f.preset === 'month' ? 'This month' : `${f.from || '…'} → ${f.to || '…'}`;
      const presetBtn = (v, label) => `<button class="btn btn-sm ${f.preset === v ? 'btn-gold' : 'btn-secondary'}" onclick="Admin.setExpenseFilter('preset', '${v}')">${label}</button>`;

      content.innerHTML = `
        ${sectionHeader('Expenses', 'Operating costs that are not tied to a specific purchase: marketing, packaging, delivery, salaries, rent, tools.', `
          <button class="btn btn-sm btn-primary" onclick="Admin.openExpenseModal()">+ Add Expense</button>
        `)}

        <div class="filter-bar">
          <div class="filter-presets">
            ${presetBtn('today', 'Today')}${presetBtn('yesterday', 'Yesterday')}${presetBtn('week', '7 days')}${presetBtn('month', 'This month')}${presetBtn('all', 'All time')}
          </div>
          <div class="filter-range">
            <label>From <input type="date" class="form-control" value="${esc(f.from)}" onchange="Admin.setExpenseFilter('from', this.value)"></label>
            <label>To <input type="date" class="form-control" value="${esc(f.to)}" onchange="Admin.setExpenseFilter('to', this.value)"></label>
            <select class="form-control" onchange="Admin.setExpenseFilter('category', this.value)">
              <option value="">All categories</option>
              ${this.cachedExpenseCategories.map(c => `<option ${f.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="stats-kpi-grid">
          ${this.kpi(rangeLabel + (f.category ? ' · ' + f.category : ''), fmt(total), '📉', `${expenses.length} entr${expenses.length === 1 ? 'y' : 'ies'} in this view`, 'kpi-good')}
          ${this.kpi('Today', fmt(today), '📅')}
          ${this.kpi('All time', fmt(grand), '🧾', `${all.length} entr${all.length === 1 ? 'y' : 'ies'}`)}
          ${this.kpi('Largest in view', byCat[0] ? byCat[0].category : '—', '🏷️', byCat[0] ? fmt(byCat[0].amount) : '')}
        </div>

        <div class="admin-two-col">
          ${card('Expenses by category — ' + rangeLabel, byCat.length ? AdminCharts.hbars(byCat.map(x => ({ label: x.category, value: x.amount })), { format: fmt, id: 'chart-exp-cat' }) : `<div class="empty-cell">No expenses in this period.</div>`)}
          ${card('How expenses affect profit', `
            <p style="font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.6;">
              <strong>Net profit = Revenue − Cost of goods − Expenses.</strong><br>
              Cost of goods comes from each product's landed cost (vendor price + delivery + extra) at the time of the order. Everything you enter here is subtracted on top of that. Marketing spend that belongs to one specific stock lot is better recorded as the <em>extra cost</em> on that purchase, so it raises that product's landed cost instead.
            </p>
            <a href="javascript:void(0)" onclick="Admin.switchTab('accounts')" class="btn btn-sm btn-secondary" style="margin-top: 8px;">Open Profit & Loss &rarr;</a>
          `)}
        </div>

        ${card(`Expenses — ${rangeLabel}`, `
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Reference</th><th class="num">Amount</th><th></th></tr></thead>
              <tbody>
                ${expenses.length === 0 ? `<tr><td colspan="6" class="empty-cell">${all.length ? 'No expenses in this period.' : 'No expenses recorded yet.'}</td></tr>` : expenses.map(e => `
                  <tr>
                    <td>${dateStr(e.expense_date)}</td>
                    <td><span class="badge badge-stock">${esc(e.category)}</span></td>
                    <td>${esc(e.description || '—')}${e.notes ? `<br><small style="color: var(--color-text-secondary);">${esc(e.notes)}</small>` : ''}</td>
                    <td>${esc(e.reference || '—')}</td>
                    <td class="num"><strong>${fmt(e.amount)}</strong></td>
                    <td><button class="btn btn-sm btn-secondary" onclick="Admin.deleteExpense('${e.id}')">🗑</button></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `)}
      `;
    } catch (e) {
      content.innerHTML = `<div class="admin-error">Error loading expenses: ${esc(e.message)}</div>`;
    }
  },

  openExpenseModal() {
    openModal(`
      <h3 class="modal-title">Add Expense</h3>
      <form onsubmit="Admin.handleSaveExpense(event)">
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Category <span class="req">*</span></label>
            <select id="exp-cat" class="form-control">${this.cachedExpenseCategories.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Amount (Rs.) <span class="req">*</span></label><input id="exp-amount" type="number" min="1" step="0.01" class="form-control" required placeholder="200"></div>
        </div>
        <div class="form-group"><label class="form-label">Description</label><input id="exp-desc" class="form-control" placeholder="e.g. Facebook ads — Eid campaign"></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Date</label><input id="exp-date" type="date" class="form-control" value="${todayISO()}"></div>
          <div class="form-group"><label class="form-label">Reference</label><input id="exp-ref" class="form-control"></div>
        </div>
        <div class="form-group"><label class="form-label">Notes</label><input id="exp-notes" class="form-control"></div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-modal').classList.remove('active')">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Expense</button>
        </div>
      </form>
    `);
  },

  async handleSaveExpense(e) {
    e.preventDefault();
    try {
      await API.createExpense({
        category: document.getElementById('exp-cat').value,
        amount: Number(document.getElementById('exp-amount').value),
        description: document.getElementById('exp-desc').value.trim(),
        expense_date: document.getElementById('exp-date').value,
        reference: document.getElementById('exp-ref').value.trim(),
        notes: document.getElementById('exp-notes').value.trim()
      });
      State.showToast('Expense added.');
      closeModal();
      this.cachedExpenses = [];
      await this.renderExpenses();
    } catch (err) { alert('Error: ' + err.message); }
  },

  async deleteExpense(id) {
    if (!confirm('Remove this expense?')) return;
    try { await API.deleteExpense(id); State.showToast('Expense removed.'); this.cachedExpenses = []; await this.renderExpenses(); }
    catch (err) { alert(err.message); }
  },

  // ============================================================
  // ACCOUNTS — Profit & Loss + vendor balances + product margins
  // ============================================================
  async renderAccounts() {
    const content = document.getElementById('admin-tab-content');
    content.innerHTML = `<div class="admin-loading">Calculating accounts...</div>`;
    try {
      const [summary, analytics] = await Promise.all([API.getLedgerSummary(), API.getAnalytics(30)]);
      const p = summary.pnl;
      const t = summary.totals;
      const profitCls = p.net_profit >= 0 ? 'kpi-good' : 'kpi-warn';

      // Margin table: what each live product earns per unit at current prices/costs
      const products = (this.cachedProducts && this.cachedProducts.length) ? this.cachedProducts : (await API.getProducts({ all: true, limit: 500 })).products;
      this.cachedProducts = products;
      const margins = products.map(pr => {
        const sell = (pr.sale_price !== null && pr.sale_price !== undefined && Number(pr.sale_price) > 0) ? Number(pr.sale_price) : Number(pr.regular_price);
        const cost = Number(pr.cost_price) || 0;
        const sold = analytics.by_product.find(x => x.product_id === pr.id);
        return { id: pr.id, title: pr.title, sell, cost, margin: sell - cost, margin_pct: sell > 0 ? ((sell - cost) / sell) * 100 : 0, stock: Number(pr.stock_quantity) || 0, units_sold: sold ? sold.units : 0, profit_made: sold ? sold.profit : 0 };
      }).sort((a, b) => b.profit_made - a.profit_made || b.margin - a.margin);

      content.innerHTML = `
        ${sectionHeader('Accounts & Profit', 'Real money in, real money out. Cancelled, returned and refunded orders are excluded from sales.', `
          <button class="btn btn-sm btn-secondary" onclick="Admin.renderAccounts()">↻ Refresh</button>
        `)}

        <div class="stats-kpi-grid">
          ${this.kpi('Revenue', fmt(p.revenue), '💰', `${p.orders_counted} order${p.orders_counted === 1 ? '' : 's'} · ${p.units_sold} units`)}
          ${this.kpi('Cost of goods', fmt(p.cogs), '📦', 'landed cost of what was sold')}
          ${this.kpi('Gross profit', fmt(p.gross_profit), '📈', `${p.gross_margin_pct}% margin`)}
          ${this.kpi('Expenses', fmt(p.expenses), '📉')}
          ${this.kpi('Net profit', fmt(p.net_profit), p.net_profit >= 0 ? '✅' : '⚠️', `${p.net_margin_pct}% of revenue`, profitCls)}
        </div>

        <div class="admin-two-col">
          ${card('Profit & Loss statement', `
            <table class="pnl-table">
              <tr><td>Sales revenue (incl. delivery collected)</td><td class="num">${fmt(p.revenue)}</td></tr>
              <tr class="pnl-sub"><td>of which delivery fees collected</td><td class="num">${fmt(p.delivery_collected)}</td></tr>
              <tr class="pnl-sub"><td>discounts given (already deducted)</td><td class="num">− ${fmt(p.discounts_given)}</td></tr>
              <tr><td>Cost of goods sold</td><td class="num">− ${fmt(p.cogs)}</td></tr>
              <tr class="pnl-total"><td>Gross profit</td><td class="num">${fmt(p.gross_profit)}</td></tr>
              ${p.expenses_by_category.map(x => `<tr class="pnl-sub"><td>${esc(x.category)}</td><td class="num">− ${fmt(x.amount)}</td></tr>`).join('')}
              <tr><td>Total expenses</td><td class="num">− ${fmt(p.expenses)}</td></tr>
              <tr class="pnl-total pnl-net"><td>Net profit</td><td class="num">${fmt(p.net_profit)}</td></tr>
            </table>
          `)}
          ${card('Vendor balances', `
            <table class="pnl-table">
              <tr><td>Total purchased from vendors</td><td class="num">${fmt(t.total_purchased)}</td></tr>
              <tr class="pnl-sub"><td>extra costs added to stock (marketing / buffer)</td><td class="num">${fmt(t.total_extra_costs)}</td></tr>
              <tr><td>Total paid to vendors</td><td class="num">− ${fmt(t.total_paid)}</td></tr>
              <tr class="pnl-total ${t.pending_balance > 0 ? 'pnl-warn' : ''}"><td>Pending balance owed</td><td class="num">${fmt(t.pending_balance)}</td></tr>
              <tr><td>Stock investment to date (all lots, landed)</td><td class="num">${fmt(t.stock_investment)}</td></tr>
              <tr><td>Current stock value at landed cost</td><td class="num">${fmt(analytics.kpis.stock_value_at_cost)}</td></tr>
            </table>
            <div style="margin-top: 14px; display: flex; gap: 8px; flex-wrap: wrap;">
              ${summary.vendor_ledger.filter(l => l.pending_balance > 0).slice(0, 6).map(l => `<button class="btn btn-sm btn-secondary" onclick="Admin.switchTab('vendors')">${esc(l.vendor.name)}: ${fmt(l.pending_balance)}</button>`).join('') || '<span style="font-size: 0.85rem; color: var(--color-text-secondary);">No outstanding vendor balances.</span>'}
            </div>
          `)}
        </div>

        ${card('Product margins', `
          <div class="table-responsive">
            <table class="admin-table">
              <thead><tr><th>Product</th><th class="num">Selling price</th><th class="num">Landed cost</th><th class="num">Margin / unit</th><th class="num">Margin %</th><th class="num">In stock</th><th class="num">Units sold</th><th class="num">Profit made</th></tr></thead>
              <tbody>
                ${margins.map(m => `
                  <tr>
                    <td class="wrap-cell" style="max-width: 300px;"><a href="javascript:void(0)" onclick="Admin.openEditProductModal('${m.id}')" style="color: var(--color-primary-black); font-weight: 600;">${esc(m.title)}</a></td>
                    <td class="num">${fmt(m.sell)}</td>
                    <td class="num">${m.cost > 0 ? fmt(m.cost) : '<span style="color: var(--color-text-muted);">not set</span>'}</td>
                    <td class="num"><strong>${fmt(m.margin)}</strong></td>
                    <td class="num">${m.cost > 0 ? m.margin_pct.toFixed(1) + '%' : '—'}</td>
                    <td class="num">${m.stock}</td>
                    <td class="num">${m.units_sold}</td>
                    <td class="num"><strong>${fmt(m.profit_made)}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `, `<span style="font-size: 0.78rem; color: var(--color-text-secondary);">Click a product to edit its cost breakdown</span>`)}
      `;
    } catch (e) {
      content.innerHTML = `<div class="admin-error">Error loading accounts: ${esc(e.message)}</div>`;
    }
  }
});

// ==========================================================
// Minimal chart helpers — plain HTML, single series, muted gold marks.
// Values labelled at the bar tip; text in text tokens; a table view toggle.
// ==========================================================
const AdminCharts = {
  hbars(rows, opts = {}) {
    const format = opts.format || ((v) => v.toLocaleString('en-PK'));
    const max = Math.max(...rows.map(r => Number(r.value) || 0), 0);
    const id = opts.id || ('chart-' + Math.random().toString(36).slice(2, 8));
    return `
      <div class="chart" id="${id}">
        <div class="chart-toolbar"><button class="chart-toggle" onclick="AdminCharts.toggle('${id}')">Table view</button></div>
        <div class="chart-view chart-bars">
          ${rows.map(r => {
            const v = Number(r.value) || 0;
            const w = max > 0 ? Math.max(1, (v / max) * 100) : 0;
            return `
              <div class="hbar-row" title="${esc(r.label)}: ${esc(format(v))}${r.hint ? ' · ' + esc(r.hint) : ''}">
                <div class="hbar-label">${esc(r.label)}</div>
                <div class="hbar-track"><div class="hbar-fill" style="width: ${w}%;"></div></div>
                <div class="hbar-value">${esc(format(v))}</div>
              </div>`;
          }).join('')}
        </div>
        <table class="chart-table admin-table" hidden>
          <thead><tr><th>${esc(opts.labelHead || 'Item')}</th><th class="num">${esc(opts.valueHead || 'Value')}</th>${rows.some(r => r.hint) ? '<th></th>' : ''}</tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${esc(format(Number(r.value) || 0))}</td>${rows.some(x => x.hint) ? `<td>${esc(r.hint || '')}</td>` : ''}</tr>`).join('')}</tbody>
        </table>
      </div>`;
  },

  // Columns over time (orders per day). Labels only on non-zero peaks to avoid clutter.
  columns(rows, opts = {}) {
    const format = opts.format || ((v) => v.toLocaleString('en-PK'));
    const max = Math.max(...rows.map(r => Number(r.value) || 0), 0);
    const id = opts.id || ('chart-' + Math.random().toString(36).slice(2, 8));
    const labelEvery = rows.length > 16 ? Math.ceil(rows.length / 8) : (rows.length > 8 ? 2 : 1);
    return `
      <div class="chart" id="${id}">
        <div class="chart-toolbar"><button class="chart-toggle" onclick="AdminCharts.toggle('${id}')">Table view</button></div>
        <div class="chart-view chart-columns" style="--cols: ${rows.length};">
          ${rows.map((r, i) => {
            const v = Number(r.value) || 0;
            const h = max > 0 ? (v / max) * 100 : 0;
            const isMax = v === max && v > 0;
            return `
              <div class="col-slot" title="${esc(r.label)}: ${esc(format(v))}${r.hint ? ' · ' + esc(r.hint) : ''}">
                <div class="col-value">${isMax ? esc(format(v)) : ''}</div>
                <div class="col-track"><div class="col-fill" style="height: ${h}%;"></div></div>
                <div class="col-label">${i % labelEvery === 0 ? esc(r.short || r.label) : ''}</div>
              </div>`;
          }).join('')}
        </div>
        <table class="chart-table admin-table" hidden>
          <thead><tr><th>${esc(opts.labelHead || 'Day')}</th><th class="num">${esc(opts.valueHead || 'Value')}</th>${rows.some(r => r.hint) ? '<th></th>' : ''}</tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(r.label)}</td><td class="num">${esc(format(Number(r.value) || 0))}</td>${rows.some(x => x.hint) ? `<td>${esc(r.hint || '')}</td>` : ''}</tr>`).join('')}</tbody>
        </table>
      </div>`;
  },

  toggle(id) {
    const root = document.getElementById(id);
    if (!root) return;
    const view = root.querySelector('.chart-view');
    const table = root.querySelector('.chart-table');
    const btn = root.querySelector('.chart-toggle');
    const showingTable = !table.hidden;
    table.hidden = showingTable;
    view.hidden = !showingTable;
    btn.textContent = showingTable ? 'Table view' : 'Chart view';
  }
};

window.AdminCharts = AdminCharts;
