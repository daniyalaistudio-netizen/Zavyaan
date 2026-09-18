// ==========================================================
// ZAVYAAN — ACCOUNTS & LEDGER API
// ==========================================================
// Vendors, purchases (stock in + landed cost), vendor payments, expenses,
// and the derived views: per-vendor ledger and profit & loss.
//
// Money rules (blueprint sections 15–16):
//   purchase.vendor_amount   = quantity × unit_cost + shipping_cost   (owed to vendor)
//   purchase.total_cost      = vendor_amount + extra_cost             (true cost of the lot)
//   purchase.landed_unit_cost= total_cost / quantity                  (feeds product.cost_price)
//   vendor.pending           = Σ vendor_amount − Σ payments
//   COGS                     = Σ order_items.cost_price × quantity   (snapshotted at order time)
//   gross profit             = revenue − COGS;  net profit = gross − expenses
// Cancelled / Returned / Refunded orders are excluded from revenue and COGS.
// ==========================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');
const OrderStatus = require('../utils/order-status');

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const money = (v) => Math.round(num(v) * 100) / 100;
const newId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
// Server-local calendar date; the admin normally sends the date explicitly.
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const countsAsSale = (o) => !OrderStatus.isException(o.order_status);

const EXPENSE_CATEGORIES = ['Marketing', 'Packaging', 'Delivery', 'Salaries', 'Rent & Utilities', 'Software & Tools', 'Returns & Refunds', 'Other'];

// ---------- Vendors ----------
router.get('/vendors', async (req, res) => {
  try {
    const vendors = await db.listRows('vendors');
    res.json({ success: true, vendors });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/vendors', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Vendor name is required.' });
    const vendor = await db.saveRow('vendors', {
      id: req.body.id || newId('ven'),
      name: String(name).trim().slice(0, 150),
      contact_person: String(req.body.contact_person || '').slice(0, 150),
      phone: String(req.body.phone || '').slice(0, 50),
      whatsapp: String(req.body.whatsapp || req.body.phone || '').slice(0, 50),
      email: String(req.body.email || '').slice(0, 150),
      city: String(req.body.city || '').slice(0, 100),
      address: String(req.body.address || ''),
      notes: String(req.body.notes || ''),
      is_active: req.body.is_active !== undefined ? Boolean(req.body.is_active) : true
    });
    res.status(201).json({ success: true, vendor });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.put('/vendors/:id', async (req, res) => {
  try {
    const existing = await db.getRow('vendors', req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const vendor = await db.saveRow('vendors', { ...existing, ...req.body, id: existing.id, created_at: existing.created_at });
    res.json({ success: true, vendor });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/vendors/:id', async (req, res) => {
  try {
    const purchases = await db.listRows('purchases', { vendor_id: req.params.id });
    if (purchases.length > 0) {
      return res.status(409).json({ success: false, message: `This vendor has ${purchases.length} purchase record(s). Mark it inactive instead of deleting so the ledger history stays intact.` });
    }
    await db.deleteRow('vendors', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ---------- Purchases (stock in) ----------
router.get('/purchases', async (req, res) => {
  try {
    const filter = {};
    if (req.query.vendor_id) filter.vendor_id = req.query.vendor_id;
    if (req.query.product_id) filter.product_id = req.query.product_id;
    const purchases = await db.listRows('purchases', filter);
    res.json({ success: true, purchases });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/purchases', async (req, res) => {
  try {
    const { vendor_id, product_id } = req.body;
    const quantity = Math.floor(num(req.body.quantity));
    const unit_cost = money(req.body.unit_cost);
    const shipping_cost = money(req.body.shipping_cost);
    const extra_cost = money(req.body.extra_cost);

    if (!vendor_id) return res.status(400).json({ success: false, message: 'Select a vendor.' });
    if (!product_id) return res.status(400).json({ success: false, message: 'Select a product.' });
    if (quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    if (unit_cost < 0 || shipping_cost < 0 || extra_cost < 0) return res.status(400).json({ success: false, message: 'Costs cannot be negative.' });

    const vendor = await db.getRow('vendors', vendor_id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });
    const product = await db.getProductByIdOrSlug(product_id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    const vendor_amount = money(quantity * unit_cost + shipping_cost);
    const total_cost = money(vendor_amount + extra_cost);
    const landed_unit_cost = money(total_cost / quantity);

    const purchase = await db.saveRow('purchases', {
      id: newId('pur'),
      vendor_id,
      product_id: product.id,
      product_title: product.title,
      quantity,
      unit_cost,
      shipping_cost,
      extra_cost,
      extra_cost_note: String(req.body.extra_cost_note || '').slice(0, 255),
      vendor_amount,
      total_cost,
      landed_unit_cost,
      purchase_date: req.body.purchase_date || today(),
      reference: String(req.body.reference || '').slice(0, 100),
      notes: String(req.body.notes || '')
    });

    // Stock arrives and the product is re-costed (weighted average).
    const stock = req.body.receive_stock === false ? null : await db.receiveStock(product.id, quantity, landed_unit_cost);

    res.status(201).json({ success: true, purchase, stock });
  } catch (err) {
    console.error('[API Ledger Purchase] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Deleting a purchase does NOT reverse stock — the goods were still received.
// Correct stock manually on the product if the purchase was entered by mistake.
router.delete('/purchases/:id', async (req, res) => {
  try {
    await db.deleteRow('purchases', req.params.id);
    res.json({ success: true, message: 'Purchase record removed. Product stock was not changed.' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ---------- Vendor payments ----------
router.get('/payments', async (req, res) => {
  try {
    const filter = {};
    if (req.query.vendor_id) filter.vendor_id = req.query.vendor_id;
    const payments = await db.listRows('vendor_payments', filter);
    res.json({ success: true, payments });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/payments', async (req, res) => {
  try {
    const amount = money(req.body.amount);
    if (!req.body.vendor_id) return res.status(400).json({ success: false, message: 'Select a vendor.' });
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
    const vendor = await db.getRow('vendors', req.body.vendor_id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

    const payment = await db.saveRow('vendor_payments', {
      id: newId('pay'),
      vendor_id: vendor.id,
      amount,
      method: String(req.body.method || 'Cash').slice(0, 50),
      reference: String(req.body.reference || '').slice(0, 100),
      payment_date: req.body.payment_date || today(),
      notes: String(req.body.notes || '')
    });
    res.status(201).json({ success: true, payment });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    await db.deleteRow('vendor_payments', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ---------- Expenses ----------
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await db.listRows('expenses');
    res.json({ success: true, expenses, categories: EXPENSE_CATEGORIES });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.post('/expenses', async (req, res) => {
  try {
    const amount = money(req.body.amount);
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Expense amount must be greater than zero.' });
    const category = EXPENSE_CATEGORIES.includes(req.body.category) ? req.body.category : 'Other';
    const expense = await db.saveRow('expenses', {
      id: newId('exp'),
      category,
      description: String(req.body.description || '').slice(0, 255),
      amount,
      expense_date: req.body.expense_date || today(),
      vendor_id: req.body.vendor_id || null,
      reference: String(req.body.reference || '').slice(0, 100),
      notes: String(req.body.notes || '')
    });
    res.status(201).json({ success: true, expense });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.delete('/expenses/:id', async (req, res) => {
  try {
    await db.deleteRow('expenses', req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ---------- Derived: vendor ledger + P&L ----------
async function buildSummary() {
  const [vendors, purchases, payments, expenses, orders] = await Promise.all([
    db.listRows('vendors'), db.listRows('purchases'), db.listRows('vendor_payments'), db.listRows('expenses'), db.getAllOrdersWithItems()
  ]);

  const ledger = vendors.map(v => {
    const vp = purchases.filter(p => p.vendor_id === v.id);
    const vpay = payments.filter(p => p.vendor_id === v.id);
    const items_sourced = vp.reduce((s, p) => s + num(p.quantity), 0);
    const total_purchased = money(vp.reduce((s, p) => s + num(p.vendor_amount), 0));
    const total_paid = money(vpay.reduce((s, p) => s + num(p.amount), 0));
    const products = [...new Set(vp.map(p => p.product_id))].length;
    const last = vp[0] ? vp[0].purchase_date : null;
    return {
      vendor: v,
      purchases_count: vp.length,
      products_count: products,
      items_sourced,
      total_purchased,
      total_paid,
      pending_balance: money(total_purchased - total_paid),
      last_purchase_date: last
    };
  }).sort((a, b) => b.pending_balance - a.pending_balance);

  const sales = orders.filter(countsAsSale);
  const revenue = money(sales.reduce((s, o) => s + num(o.total_amount), 0));
  const delivery_collected = money(sales.reduce((s, o) => s + num(o.delivery_fee), 0));
  const discounts_given = money(sales.reduce((s, o) => s + num(o.discount), 0));
  const cogs = money(sales.reduce((s, o) => s + (o.items || []).reduce((t, i) => t + num(i.cost_price) * num(i.quantity), 0), 0));
  const units_sold = sales.reduce((s, o) => s + (o.items || []).reduce((t, i) => t + num(i.quantity), 0), 0);
  const total_expenses = money(expenses.reduce((s, e) => s + num(e.amount), 0));
  const gross_profit = money(revenue - cogs);
  const net_profit = money(gross_profit - total_expenses);

  const expenses_by_category = EXPENSE_CATEGORIES
    .map(c => ({ category: c, amount: money(expenses.filter(e => e.category === c).reduce((s, e) => s + num(e.amount), 0)) }))
    .filter(x => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const totals = {
    vendors: vendors.length,
    purchases: purchases.length,
    items_sourced: purchases.reduce((s, p) => s + num(p.quantity), 0),
    total_purchased: money(purchases.reduce((s, p) => s + num(p.vendor_amount), 0)),
    total_extra_costs: money(purchases.reduce((s, p) => s + num(p.extra_cost), 0)),
    total_paid: money(payments.reduce((s, p) => s + num(p.amount), 0)),
    stock_investment: money(purchases.reduce((s, p) => s + num(p.total_cost), 0))
  };
  totals.pending_balance = money(totals.total_purchased - totals.total_paid);

  return {
    vendor_ledger: ledger,
    totals,
    pnl: {
      orders_counted: sales.length,
      units_sold,
      revenue,
      delivery_collected,
      discounts_given,
      cogs,
      gross_profit,
      gross_margin_pct: revenue > 0 ? Math.round((gross_profit / revenue) * 1000) / 10 : 0,
      expenses: total_expenses,
      expenses_by_category,
      net_profit,
      net_margin_pct: revenue > 0 ? Math.round((net_profit / revenue) * 1000) / 10 : 0
    }
  };
}

router.get('/summary', async (req, res) => {
  try {
    res.json({ success: true, ...(await buildSummary()) });
  } catch (err) {
    console.error('[API Ledger Summary] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Full statement for one vendor: purchases and payments interleaved by date
router.get('/vendors/:id/statement', async (req, res) => {
  try {
    const vendor = await db.getRow('vendors', req.params.id);
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    const [purchases, payments] = await Promise.all([
      db.listRows('purchases', { vendor_id: vendor.id }),
      db.listRows('vendor_payments', { vendor_id: vendor.id })
    ]);
    const entries = [
      ...purchases.map(p => ({ type: 'purchase', date: p.purchase_date || p.created_at, created_at: p.created_at, description: `${p.quantity} × ${p.product_title}`, debit: num(p.vendor_amount), credit: 0, ref: p.reference, id: p.id })),
      ...payments.map(p => ({ type: 'payment', date: p.payment_date || p.created_at, created_at: p.created_at, description: `Payment (${p.method || 'Cash'})`, debit: 0, credit: num(p.amount), ref: p.reference, id: p.id }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date) || new Date(a.created_at) - new Date(b.created_at));
    let balance = 0;
    for (const e of entries) { balance = money(balance + e.debit - e.credit); e.balance = balance; }
    res.json({ success: true, vendor, entries, balance });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = { router, buildSummary, EXPENSE_CATEGORIES };
