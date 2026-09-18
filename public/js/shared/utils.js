// ==========================================================
// ZAVYAAN SHARED — DOM & SANITIZATION UTILITIES
// ==========================================================

const Utils = {
  // Sanitize and escape HTML entities to prevent XSS
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  },

  // Generate safe slug from text
  slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  },

  // Safe JSON Parse with fallback
  safeJsonParse(jsonString, fallback = null) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  },

  // Smooth scroll to element or top
  scrollTo(selectorOrNumber = 0) {
    if (typeof selectorOrNumber === 'number') {
      window.scrollTo({ top: selectorOrNumber, behavior: 'smooth' });
    } else {
      const el = document.querySelector(selectorOrNumber);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
};

window.Utils = Utils;
