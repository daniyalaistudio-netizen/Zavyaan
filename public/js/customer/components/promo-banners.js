// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — PROMOTIONAL BANNERS
// Sale, collection and offer banners configured in Admin → Storefront.
// Three themes, all within the gold / white / black palette:
//   dark  — rich black with gold accents
//   ivory — warm ivory with black type
//   gold  — gold field with black type
// ==========================================================

const PromoBanners = {
  renderCard(b) {
    const theme = ['dark', 'ivory', 'gold'].includes(b.theme) ? b.theme : 'dark';
    const btnClass = theme === 'dark' ? 'btn-gold' : 'btn-primary';
    const kindLabel = { sale: 'Sale', collection: 'Collection', offer: 'Offer' }[b.kind] || 'Offer';

    return `
      <article class="promo-banner-card promo-bg-${theme}" data-kind="${Utils.escapeHtml(b.kind || 'offer')}">
        <div>
          <div class="promo-kind-row">
            <span class="badge badge-sale">${kindLabel}</span>
            ${b.tag ? `<span class="promo-tag">${Utils.escapeHtml(b.tag)}</span>` : ''}
          </div>
          <h3 class="promo-heading">${Utils.escapeHtml(b.heading || '')}</h3>
          ${b.description ? `<p class="promo-desc">${Utils.escapeHtml(b.description)}</p>` : ''}
        </div>
        <div>
          <a href="${Utils.escapeHtml(b.cta_link || '#shop')}" class="btn btn-sm ${btnClass}">${Utils.escapeHtml(b.cta_text || 'Shop Now')} &rarr;</a>
        </div>
      </article>
    `;
  },

  // Section wrapper. Returns '' when nothing is enabled so the homepage
  // simply skips it.
  render(banners = []) {
    const live = banners.filter(b => b && b.enabled !== false && b.heading);
    if (live.length === 0) return '';

    return `
      <section class="section-padding promo-section" style="background-color: var(--color-surface);">
        <div class="container">
          <div class="promo-banners-grid promo-count-${Math.min(live.length, 3)}">
            ${live.map(b => this.renderCard(b)).join('')}
          </div>
        </div>
      </section>
    `;
  }
};

window.PromoBanners = PromoBanners;
