// ==========================================================
// ZAVYAAN SHARED — ORDER STATUS DEFINITIONS
// Single source of truth for the order lifecycle on the frontend.
// Mirrors server/utils/order-status.js — keep both in step.
// Blueprint section 21 (Order statuses).
// ==========================================================

const OrderStatus = {
  // The normal forward lifecycle, in order. Used to draw tracking timelines.
  FLOW: [
    'Pending',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped',
    'Out for Delivery',
    'Delivered'
  ],

  // States an order can end in outside the normal flow.
  EXCEPTIONS: ['Cancelled', 'Returned', 'Refunded'],

  all() {
    return [...this.FLOW, ...this.EXCEPTIONS];
  },

  isException(status) {
    return this.EXCEPTIONS.includes(status);
  },

  // CSS-safe token, since statuses like "Out for Delivery" contain spaces.
  slug(status) {
    return String(status || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

window.OrderStatus = OrderStatus;
