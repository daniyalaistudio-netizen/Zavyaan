// ==========================================================
// ZAVYAAN UI COMPONENTS & VIEW RENDERERS
// ==========================================================

const UI = {
  // Format PKR Currency
  formatPrice(num) {
    if (num === null || num === undefined) return 'Rs. 0';
    return 'Rs. ' + Math.round(Number(num)).toLocaleString('en-PK');
  },

  // Calculate discount percentage
  getDiscountPercent(regular, sale) {
    if (!sale || sale >= regular) return 0;
    return Math.round(((regular - sale) / regular) * 100);
  },

  // Render Mega Menu & Mobile Navigation
  renderNavigation(categories) {
    const navList = document.getElementById('desktop-nav-list');
    const mobileList = document.getElementById('mobile-nav-list');
    if (!navList || !mobileList) return;

    // Home link
    let navHtml = `
      <li class="nav-item">
        <a href="#home" class="nav-link ${location.hash === '#home' || location.hash === '' ? 'active' : ''}">Home</a>
      </li>
      <li class="nav-item">
        <a href="#shop" class="nav-link ${location.hash === '#shop' ? 'active' : ''}">Shop All</a>
      </li>
    `;

    let mobileHtml = `
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#home">Home</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#shop">Shop All Products</a></div>
      </div>
    `;

    const activeCats = categories.filter(c => c.is_active);

    activeCats.forEach(cat => {
      const isDeal = cat.slug.includes('deal');
      const activeSubs = (cat.subcategories || []).filter(s => s.is_active);

      // Desktop Mega Menu Item
      navHtml += `
        <li class="nav-item">
          <a href="#category/${cat.slug}" class="nav-link ${isDeal ? 'deal-link' : ''}">
            ${cat.name}
            ${activeSubs.length > 0 ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>` : ''}
          </a>
          ${activeSubs.length > 0 ? `
            <div class="mega-menu">
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 12px; color: var(--color-primary-black);">${cat.name} Collections</h4>
                <div class="mega-subcats">
                  ${activeSubs.map(sub => `
                    <div class="mega-subcat-item">
                      <a href="#category/${cat.slug}?sub=${sub.slug}">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        ${sub.name}
                      </a>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="mega-banner">
                <div>
                  <span class="badge badge-featured">Zavyaan Curated</span>
                  <h4 class="mega-banner-title" style="margin-top: 8px;">${cat.name}</h4>
                  <p class="mega-banner-desc">${cat.description || 'Explore curated selections with Cash on Delivery nationwide.'}</p>
                </div>
                <a href="#category/${cat.slug}" class="btn btn-sm btn-primary">Explore Category</a>
              </div>
            </div>
          ` : ''}
        </li>
      `;

      // Mobile Menu Accordion Item
      mobileHtml += `
        <div class="mobile-nav-item">
          <div class="mobile-nav-header" onclick="this.nextElementSibling.classList.toggle('active')">
            <a href="#category/${cat.slug}">${cat.name}</a>
            ${activeSubs.length > 0 ? `<span style="font-weight: 700; color: var(--color-gold-muted);">+</span>` : ''}
          </div>
          ${activeSubs.length > 0 ? `
            <div class="mobile-sub-list">
              ${activeSubs.map(sub => `
                <div class="mobile-sub-item">
                  <a href="#category/${cat.slug}?sub=${sub.slug}">• ${sub.name}</a>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });

    // Static page links on mobile
    mobileHtml += `
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#track">Track Your Order</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#about">About Zavyaan</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#contact">Support</a></div>
      </div>
      <div class="mobile-nav-item">
        <div class="mobile-nav-header"><a href="#admin" style="color: var(--color-gold-primary); font-weight: 700;">Admin Portal</a></div>
      </div>
    `;

    navList.innerHTML = navHtml;
    mobileList.innerHTML = mobileHtml;
  },

  // Standardized Product Card Component
  renderProductCard(product) {
    const regular = Number(product.regular_price);
    const sale = product.sale_price ? Number(product.sale_price) : null;
    const discount = this.getDiscountPercent(regular, sale);
    const primaryImg = product.images && product.images.length > 0
      ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].image_url)
      : (product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600');

    let badgeHtml = '';
    if (discount > 0) {
      badgeHtml += `<span class="badge badge-sale">-${discount}% OFF</span>`;
    }
    if (product.is_bestseller) {
      badgeHtml += `<span class="badge badge-bestseller">Best Seller</span>`;
    } else if (product.is_featured) {
      badgeHtml += `<span class="badge badge-featured">Featured</span>`;
    }

    return `
      <div class="product-card reveal-on-scroll" data-product-id="${product.id}">
        <div class="product-thumb">
          <img src="${primaryImg}" alt="${product.title}" loading="lazy">
          <div class="product-badges">${badgeHtml}</div>
          <div class="product-actions-hover">
            <button class="btn btn-sm btn-primary btn-block" onclick="UI.openProductModal('${product.id}')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              Quick View
            </button>
          </div>
        </div>
        <div class="product-info">
          <span class="product-category-tag">${product.category_name || 'Zavyaan'}</span>
          <h3 class="product-title" title="${product.title}">
            <a href="javascript:void(0)" onclick="UI.openProductModal('${product.id}')">${product.title}</a>
          </h3>
          <div class="product-price-row">
            <span class="price-current">${this.formatPrice(sale || regular)}</span>
            ${sale ? `<span class="price-regular">${this.formatPrice(regular)}</span>` : ''}
            ${discount > 0 ? `<span class="price-discount">${discount}% OFF</span>` : ''}
          </div>
          <button class="product-card-btn" onclick="UI.quickAddToCart('${product.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            Add to Cart (COD)
          </button>
        </div>
      </div>
    `;
  },

  // Open Product Modal (Quick View & Variant Selector)
  async openProductModal(productId) {
    try {
      const modalOverlay = document.getElementById('product-modal');
      const modalContent = document.getElementById('product-modal-content');
      if (!modalOverlay || !modalContent) return;

      modalContent.innerHTML = `<div style="padding: 48px; text-align: center; color: var(--color-text-secondary);">Loading product details...</div>`;
      modalOverlay.classList.add('active');

      const data = await API.getProduct(productId);
      const prod = data.product;

      const regular = Number(prod.regular_price);
      const sale = prod.sale_price ? Number(prod.sale_price) : null;
      const discount = this.getDiscountPercent(regular, sale);
      const images = (prod.images && prod.images.length > 0) 
        ? prod.images.map(img => typeof img === 'string' ? img : img.image_url)
        : [prod.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'];

      const variants = prod.variants || [];
      const hasVariants = variants.length > 0;

      modalContent.innerHTML = `
        <div class="pdp-grid">
          <div class="pdp-gallery">
            <div class="pdp-main-image">
              <img id="pdp-active-img" src="${images[0]}" alt="${prod.title}">
            </div>
            ${images.length > 1 ? `
              <div class="pdp-thumbs-row">
                ${images.map((img, idx) => `
                  <div class="pdp-thumb ${idx === 0 ? 'active' : ''}" onclick="UI.switchPdpImage(this, '${img}')">
                    <img src="${img}" alt="Thumbnail">
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="pdp-details">
            <div style="display: flex; gap: 8px; margin-bottom: 8px; align-items: center;">
              <span class="badge badge-featured">${prod.category_name || 'Zavyaan'}</span>
              <span class="badge badge-cod">Cash on Delivery</span>
            </div>
            <h1 class="pdp-title">${prod.title}</h1>
            
            <div class="pdp-price-box">
              <span class="pdp-current-price" id="pdp-display-price">${this.formatPrice(sale || regular)}</span>
              ${sale ? `<span class="price-regular" style="font-size: 1.05rem;">${this.formatPrice(regular)}</span>` : ''}
              ${discount > 0 ? `<span class="badge badge-sale">Save ${discount}%</span>` : ''}
            </div>

            <p style="font-size: 0.9rem; color: var(--color-text-secondary); margin-bottom: 20px; line-height: 1.6;">
              ${prod.description}
            </p>

            ${hasVariants ? `
              <div class="pdp-variants-section" style="margin-bottom: 18px;">
                <div class="variant-group-title">Select ${variants[0].variant_type || 'Option'}:</div>
                <div class="variant-options-list" id="pdp-variants-list">
                  ${variants.map((v, i) => `
                    <div class="variant-chip ${i === 0 ? 'selected' : ''}" 
                         data-idx="${i}" 
                         onclick="UI.selectVariantChip(this, ${JSON.stringify(v).replace(/"/g, '&quot;')})">
                      ${v.name} ${v.price_adjustment > 0 ? `(+${this.formatPrice(v.price_adjustment)})` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div style="margin-bottom: 22px;">
              <div class="variant-group-title">Quantity:</div>
              <div class="qty-control">
                <button class="qty-btn" onclick="UI.changeModalQty(-1)">-</button>
                <input type="text" id="modal-qty-input" class="qty-input" value="1" readonly>
                <button class="qty-btn" onclick="UI.changeModalQty(1)">+</button>
              </div>
            </div>

            <div class="pdp-cta-row">
              <button class="btn btn-primary btn-lg" onclick="UI.addModalItemToCart('${prod.id}', false)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                Add to Cart
              </button>
              <button class="btn btn-gold btn-lg" onclick="UI.addModalItemToCart('${prod.id}', true)">
                Buy Now (COD)
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
              <div class="pdp-trust-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <span>100% Quality Inspected</span>
              </div>
              <div class="pdp-trust-pill">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-primary)" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span>WhatsApp Customer Care</span>
              </div>
            </div>
          </div>
        </div>
      `;

      window.activeModalProduct = prod;
      window.activeModalVariant = variants.length > 0 ? variants[0] : null;
    } catch (err) {
      console.error('Modal error:', err);
    }
  },

  switchPdpImage(el, src) {
    document.getElementById('pdp-active-img').src = src;
    document.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  },

  selectVariantChip(el, variant) {
    document.querySelectorAll('.variant-chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    window.activeModalVariant = variant;

    if (window.activeModalProduct) {
      const regular = Number(window.activeModalProduct.regular_price);
      const sale = window.activeModalProduct.sale_price ? Number(window.activeModalProduct.sale_price) : null;
      const base = sale || regular;
      const adj = Number(variant.price_adjustment) || 0;
      document.getElementById('pdp-display-price').innerText = this.formatPrice(base + adj);
    }
  },

  changeModalQty(delta) {
    const input = document.getElementById('modal-qty-input');
    if (input) {
      let val = parseInt(input.value, 10) || 1;
      val = Math.max(1, val + delta);
      input.value = val;
    }
  },

  addModalItemToCart(productId, isBuyNow = false) {
    if (!window.activeModalProduct) return;
    const qty = parseInt(document.getElementById('modal-qty-input').value, 10) || 1;
    State.addToCart(window.activeModalProduct, qty, window.activeModalVariant);
    document.getElementById('product-modal').classList.remove('active');

    if (isBuyNow) {
      location.hash = '#checkout';
    } else {
      this.toggleCartDrawer(true);
    }
  },

  async quickAddToCart(productId) {
    try {
      const data = await API.getProduct(productId);
      const prod = data.product;
      const defaultVariant = (prod.variants && prod.variants.length > 0) ? prod.variants[0] : null;
      State.addToCart(prod, 1, defaultVariant);
      this.toggleCartDrawer(true);
    } catch (e) {
      console.error(e);
    }
  },

  // Toggle Cart Drawer
  toggleCartDrawer(open) {
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (!overlay || !drawer) return;

    if (open) {
      this.renderCartDrawer();
      overlay.classList.add('active');
      drawer.classList.add('active');
    } else {
      overlay.classList.remove('active');
      drawer.classList.remove('active');
    }
  },

  // Render Cart Drawer
  renderCartDrawer() {
    const body = document.getElementById('cart-drawer-body');
    const subtotalEl = document.getElementById('cart-drawer-subtotal');
    const headerCount = document.getElementById('cart-header-count');
    const badge = document.getElementById('header-cart-badge');
    if (!body || !subtotalEl) return;

    const count = State.getCartCount();
    const subtotal = State.getCartSubtotal();
    const freeDeliveryThreshold = 2500;
    const diff = freeDeliveryThreshold - subtotal;

    if (badge) badge.innerText = count;
    if (headerCount) headerCount.innerText = `(${count} items)`;

    // Free delivery progress text
    const shippingBar = document.getElementById('cart-shipping-bar');
    if (shippingBar) {
      if (subtotal >= freeDeliveryThreshold) {
        shippingBar.innerHTML = `✨ <strong>Qualified for FREE Delivery</strong> across Pakistan!`;
      } else {
        shippingBar.innerHTML = `Add <strong>${this.formatPrice(diff)}</strong> more to unlock <strong>FREE Shipping</strong>!`;
      }
    }

    if (State.cart.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: var(--color-text-secondary);">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold-muted)" stroke-width="1.5" style="margin: 0 auto 16px;">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <h4 style="font-size: 1.05rem; color: var(--color-primary-black); margin-bottom: 6px;">Your cart is empty</h4>
          <p style="font-size: 0.85rem; margin-bottom: 20px;">Discover curated collections and find your favorite items.</p>
          <button class="btn btn-primary" onclick="UI.toggleCartDrawer(false); location.hash='#shop';">Start Shopping</button>
        </div>
      `;
      subtotalEl.innerText = this.formatPrice(0);
      return;
    }

    body.innerHTML = State.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-thumb">
          <img src="${item.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'}" alt="${item.title}">
        </div>
        <div>
          <div class="cart-item-title">${item.title}</div>
          ${item.selected_variant ? `<div class="cart-item-variant">${item.selected_variant.variant_type}: <strong>${item.selected_variant.name}</strong></div>` : ''}
          <div class="cart-item-price">${this.formatPrice(item.price)}</div>
          <div style="margin-top: 8px;" class="qty-control">
            <button class="qty-btn" style="width: 26px; height: 26px;" onclick="State.updateCartQty('${item.id}', '${item.variantKey}', -1); UI.renderCartDrawer();">-</button>
            <span style="padding: 0 8px; font-size: 0.82rem; font-weight: 700;">${item.quantity}</span>
            <button class="qty-btn" style="width: 26px; height: 26px;" onclick="State.updateCartQty('${item.id}', '${item.variantKey}', 1); UI.renderCartDrawer();">+</button>
          </div>
        </div>
        <div>
          <button style="background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px;" onclick="State.removeFromCart('${item.id}', '${item.variantKey}'); UI.renderCartDrawer();">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');

    subtotalEl.innerText = this.formatPrice(subtotal);
  }
};

window.UI = UI;
