// ==========================================================
// ZAVYAAN CUSTOMER APP BOOTSTRAPPER
// Brand: ZAVYAAN | Tagline: "Discover More. Live Better."
// ==========================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize State
  CustomerState.init();

  // 2. Initialize Header controls & Cart Drawer
  HeaderComponent.bindEvents();
  CartDrawer.init();
  FooterComponent.init();

  // 3. Modal close on backdrop click or ESC key
  const prodModal = document.getElementById('product-modal');
  const prodModalClose = document.getElementById('product-modal-close');
  if (prodModalClose) {
    prodModalClose.addEventListener('click', () => QuickViewModal.close());
  }
  if (prodModal) {
    prodModal.addEventListener('click', (e) => {
      if (e.target === prodModal) QuickViewModal.close();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      QuickViewModal.close();
      CartDrawer.close();
    }
  });

  // 4. Navigation must exist on every entry route, not just the homepage
  CategoryService.getCategories()
    .then(cats => HeaderComponent.renderNavigation(cats))
    .catch(() => {});

  // 5. Initialize Router
  AppRouter.init();
});
