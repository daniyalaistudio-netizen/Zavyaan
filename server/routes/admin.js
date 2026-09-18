const express = require('express');
const router = express.Router();
const db = require('../db/db');
const auth = require('../middleware/admin-auth');

// Admin login → session token (see middleware/admin-auth.js)
router.post('/auth/login', auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', auth.requireAdmin, auth.me);

// GET Admin Dashboard Statistics
router.get('/stats', auth.requireAdmin, async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    res.json({ success: true, stats });
  } catch (err) {
    console.error('[API Admin Stats] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
