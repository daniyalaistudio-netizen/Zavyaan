// ==========================================================
// ZAVYAAN SERVER — ORDER STATUS DEFINITIONS
// Single source of truth for the order lifecycle on the backend.
// Mirrors public/js/shared/order-status.js — keep both in step.
// Blueprint section 21 (Order statuses).
// ==========================================================

// The normal forward lifecycle, in order.
const FLOW = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered'
];

// States an order can end in outside the normal flow.
const EXCEPTIONS = ['Cancelled', 'Returned', 'Refunded'];

const ALL = [...FLOW, ...EXCEPTIONS];

function isValid(status) {
  return ALL.includes(status);
}

function isException(status) {
  return EXCEPTIONS.includes(status);
}

module.exports = { FLOW, EXCEPTIONS, ALL, isValid, isException };
