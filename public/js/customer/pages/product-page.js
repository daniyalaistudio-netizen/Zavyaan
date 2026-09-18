// ==========================================================
// ZAVYAAN CUSTOMER PAGES — PRODUCT DETAIL PAGE (PDP)
// Full standalone product page with gallery, variants, specs, and related items
// ==========================================================

const ProductPage = {
  currentProduct: null,
  selectedVariant: null,
  quantity: 1,

  async render(container, productId) {
    container.innerHTML = `
      <div class="container section-padding">
        <div style="text-align: center; padding: 60px; color: var(--color-gold-muted);">Loading product details...</div>
      </div>
    `;

    try {
      const { product, relatedProducts } = await ProductService.getProduct(productId);
      if (!product) {
        container.innerHTML = StateComponents.renderEmptyState(
          'Product Not Found',
          'This product is either out of stock or no longer available.',
          `<a href="#shop" class="btn btn-primary">Continue Shopping</a>`
        );
        return;
      }

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

      container.innerHTML = `
        <div class="container section-padding">
          <!-- BREADCRUMBS -->
          <nav style="font-size: 0.82rem; color: var(--color-text-secondary); margin-bottom: 24px; display: flex; gap: 8px; align-items: center;">
            <a href="#home">Home</a> &gt;
            <a href="#shop">Shop</a> &gt;
            <a href="#category/${product.category_id || 'fashion'}">${Utils.escapeHtml(product.category_name || 'Category')}</a> &gt;
            <span style="color: var(--color-rich-black); font-weight: 600;">${Utils.escapeHtml(Formatters.truncate(product.title, 40))}</span>
          </nav>

          <!-- PDP MAIN GRID -->
          <div class="pdp-grid" style="background: var(--color-pure-white); border: 1px solid var(--color-border-light); border-radius: var(--radius-sm);">
            <!-- GALLERY -->
            <div class="pdp-gallery">
              <div class="pdp-main-image">
                <img id="pdp-page-img" src="${images[0]}" alt="${Utils.escapeHtml(product.title)}">
              </div>
              ${images.length > 1 ? `
                <div class="pdp-thumbs-row">
                  ${images.map((img, i) => `
                    <div class="pdp-thumb ${i === 0 ? 'active' : ''}" onclick="ProductPage.switchImage(this, '${img}')">
                      <img src="${img}" alt="Thumbnail">
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- DETAILS -->
            <div class="pdp-details">
              <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center; flex-wrap: wrap;">
                <span class="badge badge-featured">${Utils.escapeHtml(product.category_name || 'Zavyaan')}</span>
                <span class="badge badge-cod">Cash on Delivery</span>
                <span class="badge badge-stock">${product.stock_quantity > 0 ? 'In Stock (Ready to Dispatch)' : 'Low Stock'}</span>
              </div>

              <h1 class="pdp-title">${Utils.escapeHtml(product.title)}</h1>

              <!-- Reviews Placeholder Architecture -->
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px; font-size: 0.85rem;">
                <div style="color: var(--color-gold-primary);">★★★★★</div>
                <span style="color: var(--color-text-secondary);">(4.9 / 5.0 • 120+ Customer Reviews)</span>
              </div>

              <div class="pdp-price-box">
                <span class="pdp-current-price" id="pdp-price-val">
                  ${Formatters.formatPKR((sale || regular) + (this.selectedVariant ? Number(this.selectedVariant.price_adjustment || 0) : 0))}
                </span>
                ${sale ? `<span class="price-regular" style="font-size: 1.15rem;">${Formatters.formatPKR(regular)}</span>` : ''}
                ${discount > 0 ? `<span class="badge badge-sale">Save ${discount}%</span>` : ''}
              </div>

              <p style="font-size: 0.92rem; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 20px;">
                ${Utils.escapeHtml(product.description)}
              </p>

              <!-- Flexible Variants -->
              ${variants.length > 0 ? `
                <div style="margin-bottom: 20px;">
                  <div class="variant-group-title">Select ${variants[0].variant_type || 'Option'}:</div>
                  <div class="variant-options-list">
                    ${variants.map((v, i) => `
                      <div class="variant-chip ${i === 0 ? 'selected' : ''}" onclick="ProductPage.selectVariant(this, ${JSON.stringify(v).replace(/"/g, '&quot;')})">
                        ${Utils.escapeHtml(v.name)} ${v.price_adjustment > 0 ? `(+${Formatters.formatPKR(v.price_adjustment)})` : ''}
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Quantity Selector -->
              <div style="margin-bottom: 24px;">
                <div class="variant-group-title">Quantity:</div>
                <div class="qty-control">
                  <button class="qty-btn" onclick="ProductPage.changeQty(-1)" aria-label="Decrease quantity">-</button>
                  <input type="text" id="pdp-qty-input" class="qty-input" value="1" readonly>
                  <button class="qty-btn" onclick="ProductPage.changeQty(1)" aria-label="Increase quantity">+</button>
                </div>
              </div>

              <!-- CTAs -->
              <div class="pdp-cta-row">
                <button class="btn btn-primary btn-lg" onclick="ProductPage.addToCart(false)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                  Add to Cart
                </button>
                <button class="btn btn-gold btn-lg" onclick="ProductPage.addToCart(true)">
                  Buy Now
                </button>
              </div>

              <!-- Trust Pills -->
              <div class="pdp-trust-pills">
                <div class="pdp-trust-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                  <span>2-4 Days Fast Delivery Across Pakistan</span>
                </div>
                <div class="pdp-trust-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  <span>7-Day Easy Exchange / Return</span>
                </div>
                <div class="pdp-trust-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  <span>100% Quality Inspected</span>
                </div>
                <div class="pdp-trust-pill">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <span>Dedicated WhatsApp Support</span>
                </div>
              </div>
            </div>
          </div>

          <!-- PDP COLLAPSIBLE TABS (DESCRIPTION, DELIVERY, EXCHANGE) -->
          <div class="pdp-tabs">
            <div class="pdp-tab-nav">
              <button class="pdp-tab-btn active" onclick="ProductPage.switchTab(this, 'tab-features')">Product Details & Features</button>
              <button class="pdp-tab-btn" onclick="ProductPage.switchTab(this, 'tab-shipping')">Nationwide Shipping & COD</button>
              <button class="pdp-tab-btn" onclick="ProductPage.switchTab(this, 'tab-returns')">7-Day Easy Return Policy</button>
            </div>

            <div id="tab-features" class="pdp-tab-content">
              <p>${Utils.escapeHtml(product.description)}</p>
              <ul style="list-style: disc; padding-left: 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
                <li>Premium grade materials inspected for longevity and comfort</li>
                <li>True-to-size Pakistani sizing guidelines</li>
                <li>Exclusive design crafted specifically for the Zavyaan collection</li>
                <li>SKU identifier: <code>${product.sku || 'ZVN-PK-2026'}</code></li>
              </ul>
            </div>

            <div id="tab-shipping" class="pdp-tab-content" style="display: none;">
              <p>We deliver nationwide across Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Islamabad ICT, Gilgit-Baltistan, and Azad Jammu & Kashmir.</p>
              <ul style="list-style: disc; padding-left: 20px; margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
                <li><strong>Delivery Speed:</strong> 2 to 4 business days for major cities (Lahore, Karachi, Islamabad, Faisalabad, Rawalpindi).</li>
                <li><strong>Cash on Delivery (COD):</strong> Pay cash when your parcel arrives.</li>
                <li><strong>Free Shipping Rule:</strong> Orders above Rs. 2,500 automatically receive 100% FREE delivery nationwide!</li>
              </ul>
            </div>

            <div id="tab-returns" class="pdp-tab-content" style="display: none;">
              <p>Shop with complete peace of mind under the Zavyaan 7-Day Return Guarantee.</p>
              <p>If you encounter any size mismatch, defect, or damage, message our WhatsApp support within 7 days of delivery for an instant replacement or exchange.</p>
            </div>
          </div>

          <!-- RELATED PRODUCTS -->
          ${relatedProducts.length > 0 ? `
            <div style="margin-top: 60px;">
              <div class="section-header">
                <div>
                  <div class="section-tagline">You May Also Like</div>
                  <h2 class="section-title">Related Curated Picks</h2>
                </div>
              </div>
              <div class="product-grid">
                ${relatedProducts.map(p => ProductCard.render(p)).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `;
    } catch (err) {
      container.innerHTML = StateComponents.renderErrorState(err.message, `ProductPage.render(document.getElementById('app-main'), '${productId}')`);
    }
  },

  switchImage(el, src) {
    const mainImg = document.getElementById('pdp-page-img');
    if (mainImg) mainImg.src = src;
    document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },

  selectVariant(el, variant) {
    this.selectedVariant = variant;
    document.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');

    const regular = Number(this.currentProduct.regular_price);
    const sale = this.currentProduct.sale_price ? Number(this.currentProduct.sale_price) : null;
    const base = sale || regular;
    const finalPrice = base + Number(variant.price_adjustment || 0);

    const priceEl = document.getElementById('pdp-price-val');
    if (priceEl) priceEl.textContent = Formatters.formatPKR(finalPrice);
  },

  changeQty(delta) {
    this.quantity = Math.max(1, this.quantity + delta);
    const input = document.getElementById('pdp-qty-input');
    if (input) input.value = this.quantity;
  },

  addToCart(buyNow = false) {
    if (!this.currentProduct) return;
    CartService.addItem(this.currentProduct, this.quantity, this.selectedVariant);

    if (buyNow) {
      location.hash = '#checkout';
    } else {
      CartDrawer.open();
    }
  },

  switchTab(btn, tabId) {
    document.querySelectorAll('.pdp-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pdp-tab-content').forEach(c => c.style.display = 'none');
    btn.classList.add('active');
    const target = document.getElementById(tabId);
    if (target) target.style.display = 'block';
  }
};

window.ProductPage = ProductPage;
