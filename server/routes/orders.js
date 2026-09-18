const express = require('express');
const router = express.Router();
const db = require('../db/db');
const OrderStatus = require('../utils/order-status');
const { requireAdmin } = require('../middleware/admin-auth');

// Place new order (COD / Advance Payment)
// Backend is authoritative for price, stock, discount, delivery and total.
// Blueprint: Master Business Rule 12 + Phase B Scope Discipline (section 38).
router.post('/', async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      customer_whatsapp,
      province,
      city,
      address,
      postal_code,
      order_notes,
      items
    } = req.body;

    if (!customer_name || !customer_phone || !province || !city || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, Phone, Province, City, and Delivery Address are required.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your shopping cart is empty.'
      });
    }

    // Re-price every line against the database. Client-supplied prices are ignored.
    let subtotal = 0;
    const orderItems = [];
    const stockMovements = [];

    for (const it of items) {
      const productRef = it.product_id || it.id;
      const qty = Math.floor(Number(it.quantity) || 1);

      if (!productRef) {
        return res.status(400).json({ success: false, message: 'One of your cart items is missing a product reference.' });
      }
      if (qty < 1) {
        return res.status(400).json({ success: false, message: 'Item quantity must be at least 1.' });
      }

      const product = await db.getProductByIdOrSlug(productRef);
      if (!product || product.is_active === false) {
        return res.status(400).json({
          success: false,
          message: `"${it.title || it.product_title || 'An item'}" is no longer available. Please remove it from your cart.`
        });
      }

      // Resolve the variant server-side when one was selected.
      const selected = it.selected_variant || it.variant || null;
      let variant = null;
      if (selected && (selected.id || selected.name)) {
        variant = (product.variants || []).find(v =>
          (selected.id && v.id === selected.id) ||
          (selected.name && v.name === selected.name && (!selected.variant_type || v.variant_type === selected.variant_type))
        );
        if (!variant) {
          return res.status(400).json({
            success: false,
            message: `The selected option for "${product.title}" is no longer available.`
          });
        }
      }

      // Stock check against the authoritative record (variant stock when applicable).
      const availableStock = variant
        ? Number(variant.stock_quantity)
        : Number(product.stock_quantity);

      if (Number.isFinite(availableStock) && availableStock < qty) {
        return res.status(409).json({
          success: false,
          message: availableStock <= 0
            ? `"${product.title}" is out of stock.`
            : `Only ${availableStock} unit(s) of "${product.title}" are currently in stock.`
        });
      }

      // Authoritative unit price: current sale price when set, otherwise regular price.
      const basePrice = (product.sale_price !== null && product.sale_price !== undefined && Number(product.sale_price) > 0)
        ? Number(product.sale_price)
        : Number(product.regular_price);
      const priceAdjustment = variant ? Number(variant.price_adjustment) || 0 : 0;
      const price = Math.max(0, basePrice + priceAdjustment);
      const itemTotal = price * qty;
      subtotal += itemTotal;

      const primaryImage = (product.images && product.images[0] && product.images[0].image_url) || '';

      orderItems.push({
        product_id: product.id,
        product_title: product.title,
        variant_info: variant
          ? { id: variant.id, variant_type: variant.variant_type, name: variant.name, value: variant.value }
          : {},
        price,
        quantity: qty,
        total_price: itemTotal,
        // Snapshot cost at order time so historical profit stays correct (Rule 13).
        cost_price: Number(product.cost_price) || 0,
        product_image: primaryImage
      });

      stockMovements.push({ productId: product.id, variantId: variant ? variant.id : null, qty });
    }

    // Delivery and discount are computed server-side; client values are not trusted.
    const delivery_fee = subtotal >= 2500 ? 0 : 200;

    // Payment method must be one the admin currently has enabled; the discount
    // is whatever that method is configured to give (Rs. 100 for advance
    // payment by default). Disabled or unknown methods are refused.
    const settings = await db.getSettings();
    const requestedMethod = String(req.body.payment_method || 'COD').trim().toUpperCase();
    const method = settings.payment_methods.find(m => m.code === requestedMethod);
    if (!method || !method.enabled) {
      const enabled = settings.payment_methods.filter(m => m.enabled).map(m => m.label);
      return res.status(400).json({
        success: false,
        message: enabled.length > 0
          ? `That payment method is not available. Please choose one of: ${enabled.join(', ')}.`
          : 'Checkout is temporarily unavailable — no payment method is currently enabled. Please contact support.'
      });
    }
    const payment_method = method.code;
    const discount = Math.min(subtotal + delivery_fee, Math.max(0, Number(method.discount) || 0));
    const total_amount = Math.max(0, subtotal + delivery_fee - discount);

    const orderData = {
      customer_name,
      customer_email: customer_email || '',
      customer_phone,
      customer_whatsapp: customer_whatsapp || customer_phone,
      province,
      city,
      address,
      postal_code: postal_code || '',
      order_notes: order_notes || '',
      payment_method,
      subtotal,
      delivery_fee,
      discount,
      total_amount
    };

    const savedOrder = await db.createOrder(orderData, orderItems);

    // Reserve stock now that the order exists.
    for (const mv of stockMovements) {
      await db.decrementStock(mv.productId, mv.variantId, mv.qty);
    }

    res.status(201).json({
      success: true,
      message: discount > 0
        ? `Order placed successfully with ${method.label} (Rs. ${discount} discount applied)!`
        : `Order placed successfully with ${method.label}!`,
      order: savedOrder
    });
  } catch (err) {
    console.error('[API Orders Place] Error:', err);
    res.status(500).json({ success: false, message: 'We could not place your order. Please try again.' });
  }
});

// Track order by Order Number
// Guest tracking requires the order number AND the phone number used to order.
// An order number alone must never reveal an order (Master Business Rule 17).
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const suppliedPhone = String(req.query.phone || '').replace(/\D/g, '');

    // Identical response whether the order is missing or the phone is wrong, so
    // the endpoint cannot be used to discover which order numbers exist.
    const denied = {
      success: false,
      message: 'No order found matching that order number and phone number. Please check your confirmation SMS and try again.'
    };

    if (!suppliedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Please enter the phone number used when placing the order.'
      });
    }

    const order = await db.getOrderByIdOrNumber(orderNumber.trim().toUpperCase());

    if (!order) {
      return res.status(404).json(denied);
    }

    // Compare digits only, so formatting differences (spaces, +92, dashes) still match.
    const onFile = [order.customer_phone, order.customer_whatsapp]
      .map(v => String(v || '').replace(/\D/g, ''))
      .filter(Boolean);

    const phoneMatches = onFile.some(p =>
      p === suppliedPhone || p.slice(-10) === suppliedPhone.slice(-10)
    );

    if (!phoneMatches) {
      return res.status(404).json(denied);
    }

    // Return sanitized public tracking info
    res.json({
      success: true,
      order: {
        order_number: order.order_number,
        order_status: order.order_status,
        customer_name: order.customer_name,
        city: order.city,
        province: order.province,
        total_amount: order.total_amount,
        payment_method: order.payment_method,
        created_at: order.created_at,
        timeline: order.timeline || [],
        items_count: (order.items || []).length,
        items: (order.items || []).map(i => ({
          product_title: i.product_title,
          quantity: i.quantity,
          variant_info: i.variant_info,
          product_image: i.product_image
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all orders (Admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;
    const orders = await db.getOrders({ status, search, limit, offset });
    res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single order details (Admin)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.getOrderByIdOrNumber(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE order status (Admin)
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = OrderStatus.ALL;
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updated = await db.updateOrderStatus(id, status, note);
    res.json({ success: true, message: `Order status updated to ${status}`, order: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
