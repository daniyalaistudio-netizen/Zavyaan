const express = require('express');
const router = express.Router();
const db = require('../db/db');

// GET products with rich filters
router.get('/', async (req, res) => {
  try {
    const {
      category,
      subcategory,
      search,
      min_price,
      max_price,
      featured,
      bestseller,
      trending,
      sort,
      limit = 40,
      offset = 0,
      all = 'false'
    } = req.query;

    const filters = {
      categoryId: category || null,
      subcategoryId: subcategory || null,
      search: search || null,
      minPrice: min_price || null,
      maxPrice: max_price || null,
      isFeatured: featured === 'true',
      isBestseller: bestseller === 'true',
      isTrending: trending === 'true',
      includeInactive: all === 'true',
      sortBy: sort || 'newest',
      limit: Number(limit),
      offset: Number(offset)
    };

    const products = await db.getProducts(filters);
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('[API Products] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// BULK IMPORT (Admin). Body: { rows: [...], update_existing: true, create_categories: false }
// Each row is one product from the CSV template. Matching for updates is by SKU
// first, then by slug derived from the title. Categories are matched by slug,
// name or id (case-insensitive); unknown ones are created only when
// create_categories is true, otherwise the row is rejected so a typo cannot
// silently invent a category. Rows are processed independently — one bad row
// does not stop the others — and the response lists every outcome.
router.post('/bulk', async (req, res) => {
  try {
    const rows = Array.isArray(req.body && req.body.rows) ? req.body.rows : [];
    const updateExisting = req.body.update_existing !== false;
    const createCategories = Boolean(req.body.create_categories);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'No rows to import.' });
    if (rows.length > 500) return res.status(400).json({ success: false, message: 'At most 500 rows per import. Split the file.' });

    const { resolveImageRef, findUploadsForSku } = require('./uploads');
    const slugify = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const num = (v) => { const n = Number(String(v === undefined || v === null ? '' : v).replace(/[,\s]/g, '').replace(/^rs\.?/i, '')); return Number.isFinite(n) ? n : null; };
    const bool = (v, dflt) => {
      if (v === undefined || v === null || String(v).trim() === '') return dflt;
      return ['1', 'true', 'yes', 'y', 'on', 'live', 'active'].includes(String(v).trim().toLowerCase());
    };
    const get = (row, ...keys) => { for (const k of keys) { const hit = Object.keys(row).find(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') === k); if (hit !== undefined && row[hit] !== undefined && row[hit] !== null && String(row[hit]).trim() !== '') return String(row[hit]).trim(); } return ''; };

    let categories = await db.getCategories(true);
    let subcategories = await db.getSubcategories(null, true);
    const existing = await db.getProducts({ includeInactive: true, limit: 100000 });
    const bySku = Object.fromEntries(existing.filter(p => p.sku).map(p => [String(p.sku).toLowerCase(), p]));
    const bySlug = Object.fromEntries(existing.map(p => [p.slug, p]));

    const findCategory = (ref) => {
      const r = String(ref).trim().toLowerCase();
      return categories.find(c => c.id.toLowerCase() === r || c.slug.toLowerCase() === r || c.name.toLowerCase() === r) || null;
    };

    const results = [];
    let created = 0, updated = 0, failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || {};
      const line = i + 2; // header is line 1
      const title = get(row, 'title', 'product', 'name', 'product_title');
      const catRef = get(row, 'category', 'category_slug', 'category_name');
      const regular = num(get(row, 'regular_price', 'price', 'regularprice'));
      try {
        if (!title) throw new Error('Title is required.');
        if (!catRef) throw new Error('Category is required.');
        if (regular === null || regular < 0) throw new Error('Regular price must be a number.');

        let category = findCategory(catRef);
        if (!category) {
          if (!createCategories) throw new Error(`Category "${catRef}" does not exist. Use an existing name or tick "create missing categories".`);
          category = await db.saveCategory({ id: 'cat-' + slugify(catRef), name: catRef, slug: slugify(catRef), description: '', is_active: true, display_order: categories.length + 1 });
          categories.push(category);
        }

        let subcategory = null;
        const subRef = get(row, 'subcategory', 'sub_category', 'subcategory_name');
        if (subRef) {
          const r = subRef.toLowerCase();
          subcategory = subcategories.find(sc => sc.category_id === category.id && (sc.slug.toLowerCase() === r || sc.name.toLowerCase() === r || sc.id.toLowerCase() === r)) || null;
          if (!subcategory) {
            subcategory = await db.saveSubcategory({ id: 'sub-' + slugify(subRef) + '-' + Math.floor(Math.random() * 1000), category_id: category.id, name: subRef, slug: slugify(subRef), description: '', is_active: true, display_order: 0 });
            subcategories.push(subcategory);
          }
        }

        const sku = get(row, 'sku');
        const slug = slugify(get(row, 'slug') || title);
        const match = (sku && bySku[sku.toLowerCase()]) || bySlug[slug] || null;
        if (match && !updateExisting) throw new Error(`Already exists as "${match.title}" (matched by ${sku && bySku[sku.toLowerCase()] ? 'SKU' : 'title'}); updates are switched off.`);

        const imageRefs = get(row, 'image_url', 'image', 'images', 'image_urls', 'picture', 'photo').split(/[|;]/).map(v => v.trim()).filter(Boolean);
        const images = [];
        const missingImages = [];
        for (const ref of imageRefs) {
          const url = await resolveImageRef(ref);
          if (url) images.push({ image_url: url, alt_text: title }); else missingImages.push(ref);
        }
        // No image column? Pictures uploaded under the SKU name (ZVN-001.jpg, ZVN-001-2.jpg) attach automatically.
        if (images.length === 0 && sku) {
          for (const h of await findUploadsForSku(sku)) images.push({ image_url: h.url, alt_text: title });
        }

        const sale = num(get(row, 'sale_price', 'saleprice', 'discount_price'));
        const costBase = num(get(row, 'cost_base', 'vendor_price', 'purchase_price', 'cost'));
        const costShip = num(get(row, 'cost_shipping', 'delivery_cost', 'shipping_cost'));
        const costExtra = num(get(row, 'cost_extra', 'marketing_cost', 'buffer'));
        const stock = num(get(row, 'stock_quantity', 'stock', 'quantity', 'qty'));
        const tags = get(row, 'tags').split(/[|;,]/).map(t => t.trim()).filter(Boolean);

        const payload = {
          ...(match || {}),
          id: match ? match.id : 'prod-' + slug + '-' + Math.floor(Math.random() * 1000),
          title,
          slug: match ? match.slug : slug,
          description: get(row, 'description') || (match ? match.description : ''),
          category_id: category.id,
          subcategory_id: subcategory ? subcategory.id : (match ? match.subcategory_id : null),
          regular_price: regular,
          sale_price: sale !== null && sale > 0 ? sale : (get(row, 'sale_price', 'saleprice') === '' && match ? match.sale_price : null),
          cost_base: costBase !== null ? costBase : (match ? match.cost_base : 0),
          cost_shipping: costShip !== null ? costShip : (match ? match.cost_shipping : 0),
          cost_extra: costExtra !== null ? costExtra : (match ? match.cost_extra : 0),
          stock_quantity: stock !== null ? stock : (match ? match.stock_quantity : 0),
          sku: sku || (match ? match.sku : 'ZVN-' + Math.floor(1000 + Math.random() * 9000)),
          tags: tags.length ? tags : (match ? match.tags : []),
          is_featured: bool(get(row, 'is_featured', 'featured'), match ? match.is_featured : false),
          is_bestseller: bool(get(row, 'is_bestseller', 'bestseller', 'best_seller'), match ? match.is_bestseller : false),
          is_trending: bool(get(row, 'is_trending', 'trending'), match ? match.is_trending : false),
          is_active: bool(get(row, 'is_active', 'active', 'live', 'visible'), match ? match.is_active : true),
          images: images.length ? images : (match ? (match.images || []) : []),
          variants: match ? (match.variants || []) : []
        };
        const cb = Number(payload.cost_base) || 0, cs = Number(payload.cost_shipping) || 0, ce = Number(payload.cost_extra) || 0;
        if (costBase !== null || costShip !== null || costExtra !== null || !match) payload.cost_price = (cb + cs + ce) || (match ? match.cost_price : null);

        const saved = await db.saveProduct(payload);
        if (match) updated++; else created++;
        if (!match) { bySlug[saved.slug] = saved; if (saved.sku) bySku[String(saved.sku).toLowerCase()] = saved; }
        results.push({ line, title, status: match ? 'updated' : 'created', id: saved.id, warnings: missingImages.length ? [`Image not found, skipped: ${missingImages.join(', ')}`] : [] });
      } catch (err) {
        failed++;
        results.push({ line, title: title || '(no title)', status: 'failed', error: err.message });
      }
    }

    res.json({ success: true, summary: { total: rows.length, created, updated, failed }, results });
  } catch (err) {
    console.error('[API Products Bulk] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single product by id or slug
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const product = await db.getProductByIdOrSlug(idOrSlug);

    // Disabled products, and products whose category is disabled, are hidden
    // from shoppers; the admin panel passes ?all=true to keep editing them.
    const includeInactive = req.query.all === 'true' || req.query.admin === 'true';
    let hidden = false;
    if (product && !includeInactive) {
      if (product.is_active === false) hidden = true;
      else {
        const cat = await db.getCategoryById(product.category_id);
        if (cat && cat.is_active === false) hidden = true;
      }
    }

    if (!product || hidden) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get related products in same category
    const related = await db.getProducts({
      categoryId: product.category_id,
      limit: 4
    });

    const filteredRelated = related.filter(p => p.id !== product.id).slice(0, 4);

    res.json({
      success: true,
      product,
      relatedProducts: filteredRelated
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CREATE product (Admin)
router.post('/', async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      category_id,
      subcategory_id,
      regular_price,
      sale_price,
      cost_price,
      is_featured,
      is_bestseller,
      is_trending,
      is_active,
      stock_quantity,
      sku,
      tags,
      images,
      variants
    } = req.body;

    if (!title || !category_id || regular_price === undefined) {
      return res.status(400).json({ success: false, message: 'Title, Category, and Regular Price are required' });
    }

    const prodSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = req.body.id || 'prod-' + prodSlug + '-' + Math.floor(Math.random() * 1000);

    const saved = await db.saveProduct({
      id,
      title,
      slug: prodSlug,
      description: description || '',
      category_id,
      subcategory_id: subcategory_id || null,
      regular_price: Number(regular_price),
      sale_price: sale_price ? Number(sale_price) : null,
      cost_base: Number(req.body.cost_base) || 0,
      cost_shipping: Number(req.body.cost_shipping) || 0,
      cost_extra: Number(req.body.cost_extra) || 0,
      cost_price: cost_price ? Number(cost_price)
        : ((Number(req.body.cost_base) || 0) + (Number(req.body.cost_shipping) || 0) + (Number(req.body.cost_extra) || 0)) || null,
      is_featured: Boolean(is_featured),
      is_bestseller: Boolean(is_bestseller),
      is_trending: Boolean(is_trending),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      stock_quantity: Number(stock_quantity) || 0,
      sku: sku || 'ZVN-' + Math.floor(1000 + Math.random() * 9000),
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      images: images || [],
      variants: variants || []
    });

    res.status(201).json({ success: true, product: saved });
  } catch (err) {
    console.error('[API Products Create] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// UPDATE product (Admin)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.getProductByIdOrSlug(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const merged = { ...existing, ...req.body, id };
    // Landed cost = base + shipping + extra when the breakdown is edited and no
    // explicit cost_price is supplied. Purchases overwrite cost_price with the
    // weighted average of actual receipts.
    const touchesBreakdown = ['cost_base', 'cost_shipping', 'cost_extra'].some(k => req.body[k] !== undefined);
    if (touchesBreakdown && req.body.cost_price === undefined) {
      merged.cost_price = Math.round(((Number(merged.cost_base) || 0) + (Number(merged.cost_shipping) || 0) + (Number(merged.cost_extra) || 0)) * 100) / 100;
    }
    const saved = await db.saveProduct(merged);

    res.json({ success: true, product: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SET stock quantity (Admin quick edit). Body: { stock_quantity } or { delta }.
router.patch('/:id/stock', async (req, res) => {
  try {
    const existing = await db.getProductByIdOrSlug(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
    let qty;
    if (req.body.delta !== undefined) qty = Number(existing.stock_quantity || 0) + Math.floor(Number(req.body.delta) || 0);
    else qty = Math.floor(Number(req.body.stock_quantity));
    if (!Number.isFinite(qty)) return res.status(400).json({ success: false, message: 'Provide stock_quantity or delta.' });
    const product = await db.setStock(existing.id, Math.max(0, qty));
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE product (Admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteProduct(id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
