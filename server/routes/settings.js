const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET storefront settings.
// Public: the checkout needs the enabled payment methods and the homepage
// needs banners/collections. Disabled methods and banners are filtered out
// unless ?all=true (admin panel), so the storefront never has to re-check.
router.get('/', async (req, res) => {
  try {
    const settings = await db.getSettings();
    const includeDisabled = req.query.all === 'true' || req.query.admin === 'true';

    if (!includeDisabled) {
      settings.payment_methods = settings.payment_methods.filter(m => m.enabled);
      settings.promo_banners = settings.promo_banners.filter(b => b.enabled);
      settings.collections = settings.collections.filter(c => c.enabled);
    }

    res.json({ success: true, settings });
  } catch (err) {
    console.error('[API Settings] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE storefront settings (Admin). Accepts a partial object; keys not
// supplied are left as they are. Values are sanitised in db.saveSettings().
router.put('/', async (req, res) => {
  try {
    const patch = req.body || {};
    const allowed = ['payment_methods', 'promo_banners', 'collections', 'homepage', 'store'];
    const unknown = Object.keys(patch).filter(k => !allowed.includes(k));
    if (unknown.length > 0) {
      return res.status(400).json({ success: false, message: `Unknown settings: ${unknown.join(', ')}` });
    }

    const saved = await db.saveSettings(patch);

    if (!saved.payment_methods.some(m => m.enabled)) {
      // Persisted anyway (the admin may be mid-edit), but make it loud.
      return res.json({
        success: true,
        settings: saved,
        warning: 'No payment method is enabled. Customers cannot check out until at least one is switched on.'
      });
    }

    res.json({ success: true, settings: saved });
  } catch (err) {
    console.error('[API Settings Update] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
