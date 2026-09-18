// ==========================================================
// ZAVYAAN CUSTOMER COMPONENTS — UI STATES
// Skeletons, Empty States & Error Banners
// ==========================================================

const StateComponents = {
  // Skeleton Grid Loader
  renderProductGridSkeleton(count = 8) {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
      skeletons += `
        <div class="product-card" style="pointer-events: none;">
          <div class="product-thumb skeleton" style="padding-top: 105%;"></div>
          <div class="product-info" style="gap: 8px;">
            <div class="skeleton" style="height: 12px; width: 40%;"></div>
            <div class="skeleton" style="height: 16px; width: 85%;"></div>
            <div class="skeleton" style="height: 16px; width: 60%;"></div>
            <div class="skeleton" style="height: 36px; width: 100%; margin-top: 8px;"></div>
          </div>
        </div>
      `;
    }
    return `<div class="product-grid">${skeletons}</div>`;
  },

  // Reusable Empty State
  renderEmptyState(title = 'No items found', description = 'Try adjusting your filters or search keywords.', actionHtml = '') {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🛍️</div>
        <h3 class="empty-state-title">${title}</h3>
        <p class="empty-state-desc">${description}</p>
        ${actionHtml}
      </div>
    `;
  },

  // Reusable Error State
  renderErrorState(message = 'Unable to load content right now. Please try again.', retryCallbackStr = '') {
    return `
      <div class="error-state">
        <p style="margin-bottom: 12px;"><strong>Connection Notice:</strong> ${message}</p>
        ${retryCallbackStr ? `<button class="btn btn-sm btn-primary" onclick="${retryCallbackStr}">Retry</button>` : ''}
      </div>
    `;
  }
};

window.StateComponents = StateComponents;
