// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — QUICK VIEW MODAL
// Lightbox & variant selection modal
// ==========================================================

const QuickViewModal = {
  currentProduct: null,
  selectedVariant: null,
  quantity: 1,

  async open(productId) {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('product-modal-content');
    if (!modal || !content) return;

    modal.classList.add('active');
    content.innerHTML = `<div style="padding: 60px; text-align: center; color: var(--color-text-secondary);">Loading product details...</div>`;

    try {
      const { product } = await ProductService.getProduct(productId);
      if (!product) throw new Error('Product not found');

      this.currentProduct = product;
      this.quantity = 1;
      this.selectedVariant = (product.variants && product.variants.length > 0) ? product.variants[0] : null;

      const regular = Number(product.regular_price);
      const sale = product.sale_price ? Number(product.sale_price) : null;
      const discount = Formatters.getDiscountPercent(regular, sale);
      const images = (product.images && product.images.length > 0)
        ? product.images.map(img => typeof img === 'string' ? img : img.image_url)
        : [product.image_url || 'assets/images/product_fashion_kurti_1787668675195.jpg'];

      const variants = product.variants || [];

      content.innerHTML = `
        <div class="pdp-grid">
          <div class="pdp-gallery">
            <div class="pdp-main-image">
              <img id="modal-active-img" src="${images[0]}" alt="${Utils.escapeHtml(product.title)}">
            </div>
            ${images.length > 1 ? `
              <div class="pdp-thumbs-row">
                ${images.map((img, i) => `
                  <div class="pdp-thumb ${i === 0 ? 'active' : ''}" onclick="QuickViewModal.switchImage(this, '${img}')">
                    <img src="${img}" alt="Thumbnail">
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>

          <div class="pdp-details">
            <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
              <span class="badge badge-featured">${Utils.escapeHtml(product.category_name || 'Zavyaan')}</span>
              <span class="badge badge-cod">Cash on Delivery</span>
            </div>

            <h2 class="pdp-title">${Utils.escapeHtml(product.title)}</h2>

            <div class="pdp-price-box">
              <span class="pdp-current-price" id="modal-display-price">
                ${Formatters.formatPKR((sale || regular) + (this.selectedVariant ? Number(this.selectedVariant.price_adjustment || 0) : 0))}
              </span>
              ${sale ? `<span class="price-regular" style="font-size: 1.05rem;">${Formatters.formatPKR(regular)}</span>` : ''}
              ${discount > 0 ? `<span class="badge badge-sale">Save ${discount}%</span>` : ''}
            </div>

            <p style="font-size: 0.88rem; color: var(--color-text-secondary); margin-bottom: 16px; line-height: 1.6;">
              ${Utils.escapeHtml(product.description)}
            </p>

            ${variants.length > 0 ? `
              <div style="margin-bottom: 16px;">
                <div class="variant-group-title">Select ${variants[0].variant_type || 'Option'}:</div>
                <div class="variant-options-list">
                  ${variants.map((v, i) => `
                    <div class="variant-chip ${i === 0 ? 'selected' : ''}" onclick="QuickViewModal.selectVariant(this, ${JSON.stringify(v).replace(/"/g, '&quot;')})">
                      ${Utils.escapeHtml(v.name)} ${v.price_adjustment > 0 ? `(+${Formatters.formatPKR(v.price_adjustment)})` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div style="margin-bottom: 20px;">
              <div class="variant-group-title">Quantity:</div>
              <div class="qty-control">
                <button class="qty-btn" onclick="QuickViewModal.changeQty(-1)" aria-label="Decrease quantity">-</button>
                <input type="text" id="modal-qty-input" class="qty-input" value="1" readonly>
                <button class="qty-btn" onclick="QuickViewModal.changeQty(1)" aria-label="Increase quantity">+</button>
              </div>
            </div>

            <div class="pdp-cta-row">
              <button class="btn btn-primary btn-lg" onclick="QuickViewModal.addToCart(false)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                Add to Cart
              </button>
              <button class="btn btn-gold btn-lg" onclick="QuickViewModal.addToCart(true)">
                Buy Now
              </button>
            </div>

            <div class="pdp-trust-pills">
              <div class="pdp-trust-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                <span>2-4 Days Fast Delivery</span>
              </div>
              <div class="pdp-trust-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                <span>7-Day Easy Exchange</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      content.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--color-status-error);">Error loading product: ${err.message}</div>`;
    }
  },

  switchImage(el, src) {
    const mainImg = document.getElementById('modal-active-img');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },

  selectVariant(el, variant) {
    this.selectedVariant = variant;
    document.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');

    // Update display price
    const regular = Number(this.currentProduct.regular_price);
    const sale = this.currentProduct.sale_price ? Number(this.currentProduct.sale_price) : null;
    const base = sale || regular;
    const finalPrice = base + Number(variant.price_adjustment || 0);

    const priceEl = document.getElementById('modal-display-price');
    if (priceEl) priceEl.textContent = Formatters.formatPKR(finalPrice);
  },

  changeQty(delta) {
    this.quantity = Math.max(1, this.quantity + delta);
    const input = document.getElementById('modal-qty-input');
    if (input) input.value = this.quantity;
  },

  addToCart(buyNow = false) {
    if (!this.currentProduct) return;
    CartService.addItem(this.currentProduct, this.quantity, this.selectedVariant);
    this.close();

    if (buyNow) {
      location.hash = '#checkout';
    } else {
      CartDrawer.open();
    }
  },

  close() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.remove('active');
  }
};

window.QuickViewModal = QuickViewModal;
