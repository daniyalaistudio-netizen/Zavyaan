// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — FOOTER
// Brand statement, category links, customer support & trust guarantees
// ==========================================================

const FooterComponent = {
  init() {
    // Current year auto-update
    const yearEls = document.querySelectorAll('.footer-year');
    yearEls.forEach(el => el.textContent = new Date().getFullYear());

    this.renderCategoryLinks();
  },

  // Footer category links mirror the admin-enabled categories, so hiding a
  // category in the admin panel removes it here as well as from the nav.
  async renderCategoryLinks() {
    const list = document.getElementById('footer-category-links');
    if (!list) return;
    try {
      const categories = await CategoryService.getCategories();
      list.innerHTML = `
        <li><a href="#shop">Shop All</a></li>
        ${categories.filter(c => c.is_active !== false).map(c => `
          <li><a href="#category/${Utils.escapeHtml(c.slug)}">${Utils.escapeHtml(c.name)}</a></li>
        `).join('')}
      `;
    } catch (err) {
      // Leave the static "Shop All" link in place
    }
  }
};

window.FooterComponent = FooterComponent;
