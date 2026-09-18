// ==========================================================
// ZAVYAAN CUSTOMER SERVICES — ORDER SERVICE
// Order creation (COD / Advance Payment) and tracking lookup
// ==========================================================

const OrderService = {
  // Place customer order (Cash on Delivery or Advance Payment)
  async placeOrder(orderPayload) {
    const res = await (window.ApiClient || window.API).request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
    return res;
  },

  // Track order. The phone used at checkout is required as verification so that
  // an order number on its own never exposes an order (Master Business Rule 17).
  async trackOrder(orderNumber, phone = '') {
    const cleanNum = encodeURIComponent(orderNumber.trim().toUpperCase());
    const cleanPhone = encodeURIComponent(String(phone || '').trim());
    const res = await (window.ApiClient || window.API).request(
      `/orders/track/${cleanNum}?phone=${cleanPhone}`
    );
    return res.order || null;
  }
};

window.OrderService = OrderService;
