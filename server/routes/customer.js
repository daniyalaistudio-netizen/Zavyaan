// ==========================================================
// ZAVYAAN CUSTOMER API ROUTES
// Customer authentication (multi-device), profile, addresses & orders
// ==========================================================

const express = require('express');
const router = express.Router();
const db = require('../db/db');

// In-memory / persistent mock store for customer records during Phase B
const customerStore = {
  customers: [],
  addresses: []
};

// 1. Customer Registration
router.post('/auth/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: 'Name and either Email or Phone are required.'
      });
    }

    const customerId = 'cust-' + Date.now();
    const newCustomer = {
      id: customerId,
      name,
      email: email || '',
      phone: phone || '',
      whatsapp: phone || '',
      created_at: new Date().toISOString()
    };

    customerStore.customers.push({ ...newCustomer, password: password || '' });

    // Multi-device token: Each login/device gets its own valid session token
    const token = 'cust_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Zavyaan.',
      user: newCustomer,
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Customer Login (Supports multi-device simultaneous sessions)
router.post('/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or Mobile Number is required.' });
    }

    // Find in memory or create guest session
    let existing = customerStore.customers.find(c => 
      (c.email && c.email.toLowerCase() === identifier.toLowerCase()) || 
      (c.phone && c.phone.replace(/\D/g, '') === identifier.replace(/\D/g, ''))
    );

    if (!existing) {
      // Auto-provision demo customer record if testing
      existing = {
        id: 'cust-' + Date.now(),
        name: identifier.includes('@') ? identifier.split('@')[0] : 'Customer ' + identifier.slice(-4),
        email: identifier.includes('@') ? identifier : '',
        phone: !identifier.includes('@') ? identifier : '03001234567',
        whatsapp: !identifier.includes('@') ? identifier : '03001234567',
        created_at: new Date().toISOString()
      };
      customerStore.customers.push(existing);
    }

    // Generate session token (No single-device restriction for customers!)
    const token = 'cust_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        phone: existing.phone,
        whatsapp: existing.whatsapp
      },
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Forgot Password
router.post('/auth/forgot-password', (req, res) => {
  res.json({
    success: true,
    message: 'If an account exists with this email or mobile number, reset instructions have been sent.'
  });
});

// 4. Customer Orders History
router.get('/orders', async (req, res) => {
  try {
    const { email, phone } = req.query;
    const allOrders = await db.getOrders({ limit: 50 });
    
    if (email || phone) {
      const filtered = allOrders.filter(o => 
        (email && o.customer_email && o.customer_email.toLowerCase() === email.toLowerCase()) ||
        (phone && o.customer_phone && o.customer_phone.replace(/\D/g, '') === phone.replace(/\D/g, ''))
      );
      return res.json({ success: true, count: filtered.length, orders: filtered });
    }

    // Default return recent store orders for customer history view
    res.json({ success: true, count: allOrders.length, orders: allOrders.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
