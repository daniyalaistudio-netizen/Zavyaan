const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET all categories
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' || req.query.admin === 'true';
    const categories = await db.getCategories(includeInactive);
    
    // Also attach subcategories
    for (const cat of categories) {
      cat.subcategories = await db.getSubcategories(cat.id, includeInactive);
    }

    res.json({ success: true, categories });
  } catch (err) {
    console.error('[API Categories] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single category by id or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let cat = await db.getCategoryById(idOrSlug);
    if (!cat) {
      cat = await db.getCategoryBySlug(idOrSlug);
    }
    // A category the admin has disabled is invisible on the storefront; only
    // the admin panel (?all=true) may still load it.
    const includeInactive = req.query.all === 'true' || req.query.admin === 'true';
    if (!cat || (!includeInactive && cat.is_active === false)) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    cat.subcategories = await db.getSubcategories(cat.id, includeInactive);
    res.json({ success: true, category: cat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE category (Admin)
router.post('/', async (req, res) => {
  try {
    const { name, slug, description, image_url, icon, display_order, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = req.body.id || 'cat-' + catSlug;

    const newCat = await db.saveCategory({
      id,
      name,
      slug: catSlug,
      description: description || '',
      image_url: image_url || '',
      icon: icon || 'tag',
      display_order: Number(display_order) || 0,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    });

    res.status(201).json({ success: true, category: newCat });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE category (Admin)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.getCategoryById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const updated = await db.saveCategory({
      ...existing,
      ...req.body,
      id
    });

    res.json({ success: true, category: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE category (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteCategory(id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SUBCATEGORY ENDPOINTS

// GET all subcategories
router.get('/subcategories/all', async (req, res) => {
  try {
    const { category_id, all } = req.query;
    const subcats = await db.getSubcategories(category_id || null, all === 'true');
    res.json({ success: true, subcategories: subcats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE subcategory
router.post('/subcategories', async (req, res) => {
  try {
    const { category_id, name, slug, description, image_url, display_order, is_active } = req.body;
    if (!category_id || !name) {
      return res.status(400).json({ success: false, message: 'Category ID and Subcategory name are required' });
    }
    const subSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = req.body.id || 'sub-' + subSlug + '-' + Math.floor(Math.random() * 1000);

    const newSub = await db.saveSubcategory({
      id,
      category_id,
      name,
      slug: subSlug,
      description: description || '',
      image_url: image_url || '',
      display_order: Number(display_order) || 0,
      is_active: is_active !== undefined ? Boolean(is_active) : true
    });

    res.status(201).json({ success: true, subcategory: newSub });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE subcategory
router.put('/subcategories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await db.saveSubcategory({
      ...req.body,
      id
    });
    res.json({ success: true, subcategory: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE subcategory
router.delete('/subcategories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteSubcategory(id);
    res.json({ success: true, message: 'Subcategory deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
