// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — PRODUCT CARD
// Premium standardized product card component
// ==========================================================

const ProductCard = {
  render(product) {
    if (!product) return '';

    const regular = Number(product.regular_price || 0);
    const sale = (product.sale_price !== null && product.sale_price !== undefined) ? Number(product.sale_price) : null;
    const currentPrice = sale || regular;
    const discount = Formatters.getDiscountPercent(regular, sale);

    // Primary image resolution
    const primaryImg = (product.images && product.images.length > 0)
      ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].image_url)
      : (product.image_url || 'assets/images/product_fashion_kurti_1787668675195.jpg');

    // Badges
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
      <article class="product-card" data-id="${product.id}">
        <div class="product-thumb">
          <img src="${primaryImg}" alt="${Utils.escapeHtml(product.title)}" loading="lazy">
          <div class="product-badges">${badgeHtml}</div>
          <div class="product-actions-hover">
            <button class="btn btn-sm btn-primary btn-block" onclick="QuickViewModal.open('${product.id}')" aria-label="Quick view ${Utils.escapeHtml(product.title)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Quick View
            </button>
          </div>
        </div>

        <div class="product-info">
          <span class="product-category-tag">${Utils.escapeHtml(product.category_name || 'Zavyaan')}</span>
          <h3 class="product-title" title="${Utils.escapeHtml(product.title)}">
            <a href="#product/${product.id}">${Utils.escapeHtml(product.title)}</a>
          </h3>

          <div class="product-price-row">
            <span class="price-current">${Formatters.formatPKR(currentPrice)}</span>
            ${sale ? `<span class="price-regular">${Formatters.formatPKR(regular)}</span>` : ''}
            ${discount > 0 ? `<span class="price-discount">${discount}% OFF</span>` : ''}
          </div>

          <button class="product-card-btn" onclick="ProductCard.quickAdd('${product.id}')" aria-label="Add ${Utils.escapeHtml(product.title)} to cart">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            Add to Cart
          </button>
        </div>
      </article>
    `;
  },

  // Instant Add to Cart directly from card
  async quickAdd(productId) {
    try {
      const { product } = await ProductService.getProduct(productId);
      if (!product) return;

      // If product has variants, open Quick View modal so customer can select options
      if (product.variants && product.variants.length > 0) {
        QuickViewModal.open(productId);
        return;
      }

      CartService.addItem(product, 1, null);
    } catch (e) {
      console.error('[ProductCard] Quick add error:', e);
    }
  }
};

window.ProductCard = ProductCard;
