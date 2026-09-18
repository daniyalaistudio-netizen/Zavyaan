// ==========================================================
// ZAVYAAN — ADMIN ANALYTICS
// One call that feeds the admin dashboard: order volumes (by day, status,
// category, product), incoming-order feed, stock alerts and the financial
// summary from the ledger. Exception statuses (Cancelled/Returned/Refunded)
// are excluded from revenue/units but still counted in the status breakdown.
// ==========================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const OrderStatus = require('../utils/order-status');
const { buildSummary } = require('./ledger');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v) => Math.round(num(v) * 100) / 100;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

router.get('/', async (req, res) => {
  try {
    const days = Math.min(90, Math.max(7, Math.floor(num(req.query.days)) || 14));
    const [orders, products, categories, summary] = await Promise.all([
      db.getAllOrdersWithItems(),
      db.getProducts({ includeInactive: true, limit: 1000 }),
      db.getCategories(true),
      buildSummary()
    ]);

    const productById = Object.fromEntries(products.map(p => [p.id, p]));
    const categoryById = Object.fromEntries(categories.map(c => [c.id, c]));
    const sales = orders.filter(o => !OrderStatus.isException(o.order_status));

    // Orders per day for the window (zero-filled so the chart has every day)
    // Keys are UTC dates (dayKey uses toISOString), so build the window in UTC
    // too — mixing local midnight with UTC keys drops today's orders.
    const now = new Date();
    const startUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1));
    const byDay = {};
    for (let i = 0; i < days; i++) {
      const k = dayKey(new Date(startUtc + i * 86400000));
      byDay[k] = { date: k, orders: 0, revenue: 0 };
    }
    for (const o of sales) {
      const k = dayKey(o.created_at);
      if (byDay[k]) { byDay[k].orders += 1; byDay[k].revenue = money(byDay[k].revenue + num(o.total_amount)); }
    }

    // Status breakdown (every order, including exceptions)
    const byStatus = OrderStatus.ALL.map(st => ({ status: st, count: orders.filter(o => o.order_status === st).length }));

    // Volumes by product and by category, from order lines of counted sales
    const prodAgg = {};
    const catAgg = {};
    for (const o of sales) {
      for (const it of (o.items || [])) {
        const p = productById[it.product_id];
        const pa = prodAgg[it.product_id] || (prodAgg[it.product_id] = { product_id: it.product_id, title: it.product_title || (p && p.title) || 'Unknown product', units: 0, orders: 0, revenue: 0, cost: 0 });
        pa.units += num(it.quantity);
        pa.orders += 1;
        pa.revenue = money(pa.revenue + num(it.total_price));
        pa.cost = money(pa.cost + num(it.cost_price) * num(it.quantity));

        const catId = p ? p.category_id : null;
        const cat = catId ? categoryById[catId] : null;
        const ck = catId || 'uncategorised';
        const ca = catAgg[ck] || (catAgg[ck] = { category_id: ck, name: cat ? cat.name : 'Uncategorised', units: 0, orders: new Set(), revenue: 0 });
        ca.units += num(it.quantity);
        ca.orders.add(o.id);
        ca.revenue = money(ca.revenue + num(it.total_price));
      }
    }
    const byProduct = Object.values(prodAgg).map(p => ({ ...p, profit: money(p.revenue - p.cost) })).sort((a, b) => b.units - a.units)
      .map(p => (isOwner ? p : { ...p, cost: null, profit: null }));
    const byCategory = Object.values(catAgg).map(c => ({ ...c, orders: c.orders.size })).sort((a, b) => b.units - a.units);

    // Incoming: newest orders first, most recent 10, with what they contain
    const incoming = orders.slice(0, 10).map(o => ({
      id: o.id, order_number: o.order_number, customer_name: o.customer_name, city: o.city,
      total_amount: num(o.total_amount), payment_method: o.payment_method, order_status: o.order_status,
      created_at: o.created_at, items_count: (o.items || []).reduce((s, i) => s + num(i.quantity), 0),
      items: (o.items || []).map(i => `${i.quantity} × ${i.product_title}`)
    }));

    const todayKey = dayKey(new Date());
    const lowStock = products.filter(p => num(p.stock_quantity) <= 5).map(p => ({ id: p.id, title: p.title, stock_quantity: num(p.stock_quantity), is_active: p.is_active }));

    // Staff see operations, not money: finance and vendor balances are owner-only.
    const isOwner = req.admin && req.admin.role === 'owner';
    res.json({
      success: true,
      role: req.admin ? req.admin.role : 'staff',
      generated_at: new Date().toISOString(),
      window_days: days,
      kpis: {
        orders_total: orders.length,
        orders_today: sales.filter(o => dayKey(o.created_at) === todayKey).length,
        revenue_today: money(sales.filter(o => dayKey(o.created_at) === todayKey).reduce((s, o) => s + num(o.total_amount), 0)),
        pending: orders.filter(o => o.order_status === 'Pending').length,
        in_progress: orders.filter(o => ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery'].includes(o.order_status)).length,
        delivered: orders.filter(o => o.order_status === 'Delivered').length,
        exceptions: orders.filter(o => OrderStatus.isException(o.order_status)).length,
        average_order_value: sales.length ? money(summary.pnl.revenue / sales.length) : 0,
        revenue_today_visible: true,
        products_total: products.length,
        products_live: products.filter(p => p.is_active).length,
        low_stock: lowStock.length,
        stock_units: products.reduce((s, p) => s + num(p.stock_quantity), 0),
        stock_value_at_cost: isOwner ? money(products.reduce((s, p) => s + num(p.stock_quantity) * num(p.cost_price), 0)) : null
      },
      by_day: Object.values(byDay),
      by_status: byStatus,
      by_product: byProduct,
      by_category: byCategory,
      incoming,
      low_stock: lowStock,
      finance: isOwner ? summary.pnl : null,
      vendor_totals: isOwner ? summary.totals : null
    });
  } catch (err) {
    console.error('[API Analytics] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
