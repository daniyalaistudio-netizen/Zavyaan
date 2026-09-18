// ==========================================================
// ZAVYAAN APP INITIALIZATION & GLOBAL EVENT HANDLERS
// Brand: ZAVYAAN | Tagline: "Discover More. Live Better."
// ==========================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize State
  State.init();

  // 2. Initialize Router
  Router.init();

  // 3. Bind Global Header Controls
  const cartBtn = document.getElementById('header-cart-btn');
  const cartClose = document.getElementById('cart-drawer-close');
  const cartOverlay = document.getElementById('cart-drawer-overlay');

  if (cartBtn) cartBtn.addEventListener('click', () => UI.toggleCartDrawer(true));
  if (cartClose) cartClose.addEventListener('click', () => UI.toggleCartDrawer(false));
  if (cartOverlay) cartOverlay.addEventListener('click', () => UI.toggleCartDrawer(false));

  // Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileClose = document.getElementById('mobile-drawer-close');
  const mobileOverlay = document.getElementById('mobile-drawer-overlay');
  const mobileDrawer = document.getElementById('mobile-drawer');

  if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
      if (mobileOverlay) mobileOverlay.classList.add('active');
      if (mobileDrawer) mobileDrawer.classList.add('active');
    });
  }

  const closeMobile = () => {
    if (mobileOverlay) mobileOverlay.classList.remove('active');
    if (mobileDrawer) mobileDrawer.classList.remove('active');
  };

  if (mobileClose) mobileClose.addEventListener('click', closeMobile);
  if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobile);

  // Search Submission
  const searchForm = document.getElementById('header-search-form');
  const searchInput = document.getElementById('header-search-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (q) {
        location.hash = `#shop?q=${encodeURIComponent(q)}`;
      }
    });
  }

  // Product Modal Close
  const prodModalClose = document.getElementById('product-modal-close');
  const prodModal = document.getElementById('product-modal');
  if (prodModalClose && prodModal) {
    prodModalClose.addEventListener('click', () => prodModal.classList.remove('active'));
    prodModal.addEventListener('click', (e) => {
      if (e.target === prodModal) prodModal.classList.remove('active');
    });
  }

  // Setup Scroll Animation Observer
  window.initScrollObserver();
});

// Scroll Reveal Intersection Observer
window.initScrollObserver = function() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  document.querySelectorAll('.reveal-on-scroll:not(.is-revealed)').forEach(el => {
    observer.observe(el);
  });
};
