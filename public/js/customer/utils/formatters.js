// ==========================================================
// ZAVYAAN CUSTOMER UTILS — FORMATTERS
// ==========================================================

const Formatters = {
  // Format PKR Currency e.g. "Rs. 2,450"
  formatPKR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rs. 0';
    return 'Rs. ' + Math.round(Number(amount)).toLocaleString('en-PK');
  },

  // Calculate discount percentage between regular and sale price
  getDiscountPercent(regularPrice, salePrice) {
    const reg = Number(regularPrice);
    const sale = Number(salePrice);
    if (!sale || sale >= reg || reg <= 0) return 0;
    return Math.round(((reg - sale) / reg) * 100);
  },

  // Format Pakistani Date String
  formatDate(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  },

  // Format Order Tracking Number ZV-2026-XXXXXX
  formatOrderNumber(num) {
    if (!num) return '';
    return num.trim().toUpperCase();
  },

  // Truncate text with ellipsis
  truncate(str, maxLen = 80) {
    if (!str || str.length <= maxLen) return str;
    return str.substring(0, maxLen).trim() + '...';
  }
};

window.Formatters = Formatters;
