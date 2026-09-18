// ==========================================================
// ZAVYAAN SHARED — UI HELPERS & BRIDGES
// ==========================================================

const SharedUI = {
  formatPrice(num) {
    if (window.Formatters) return Formatters.formatPKR(num);
    if (num === null || num === undefined) return 'Rs. 0';
    return 'Rs. ' + Math.round(Number(num)).toLocaleString('en-PK');
  },

  getDiscountPercent(regular, sale) {
    if (window.Formatters) return Formatters.getDiscountPercent(regular, sale);
    if (!sale || sale >= regular) return 0;
    return Math.round(((regular - sale) / regular) * 100);
  },

  showToast(message, type = 'info') {
    if (window.CustomerState) {
      CustomerState.showToast(message, type);
    }
  }
};

window.SharedUI = SharedUI;
if (typeof window.UI === 'undefined') {
  window.UI = SharedUI;
} else {
  window.UI.formatPrice = SharedUI.formatPrice;
  window.UI.getDiscountPercent = SharedUI.getDiscountPercent;
}
