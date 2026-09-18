const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const StoreSettings = require('../utils/store-settings');

// ZAVYAAN_DATA_DIR lets tests point the local store at a temp folder.
const DATA_DIR = process.env.ZAVYAAN_DATA_DIR || path.join(__dirname, '..', 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let pgPool = null;
const usePostgres = Boolean(process.env.DATABASE_URL);

if (usePostgres) {
  // Hosted databases (Neon, Render, Supabase) require TLS; a local Docker/dev
  // Postgres usually has none. Enable TLS unless the host is local or the URL
  // explicitly says sslmode=disable.
  const url = process.env.DATABASE_URL;
  const isLocalDb = /@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
  const sslDisabled = /sslmode=disable/i.test(url);
  pgPool = new Pool({
    connectionString: url,
    ssl: (isLocalDb || sslDisabled) ? false : { rejectUnauthorized: false }
  });
  console.log('[DB] Connecting to PostgreSQL database...');
} else {
  console.log('[DB] Operating in local persistent store mode (File-backed / Embedded).');
}

// In-Memory / File Persistent Store Implementation
class LocalStore {
  constructor() {
    this.data = {
      categories: [],
      subcategories: [],
      products: [],
      product_images: [],
      product_variants: [],
      orders: [],
      order_items: [],
      order_timeline: [],
      admin_users: [],
      settings: null,
      // Accounts & ledger (Phase H)
      vendors: [],
      purchases: [],
      vendor_payments: [],
      expenses: [],
      admin_sessions: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
        this.data = { ...this.data, ...JSON.parse(raw) };
      }
    } catch (err) {
      console.error('[DB LocalStore] Error loading local file:', err);
    }
  }

  save() {
    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[DB LocalStore] Error saving store:', err);
    }
  }
}

const localStore = new LocalStore();

// DB API Interface
const db = {
  isPostgres: () => usePostgres,

  // Create every table on a fresh PostgreSQL database. schema.sql is all
  // CREATE TABLE IF NOT EXISTS, so it is safe to run on every start; the lazy
  // ensure*() helpers cover columns/tables added after a database was created.
  async applySchema() {
    if (!usePostgres) return;
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pgPool.query(sql);
    await this.ensureSettingsTable();
    await this.ensureLedgerSchema();
    console.log('[DB] PostgreSQL schema verified.');
  },
  
  // Category Queries
  async getCategories(includeInactive = false) {
    if (usePostgres) {
      const query = includeInactive 
        ? 'SELECT * FROM categories ORDER BY display_order ASC, name ASC'
        : 'SELECT * FROM categories WHERE is_active = true ORDER BY display_order ASC, name ASC';
      const res = await pgPool.query(query);
      return res.rows;
    } else {
      let list = [...localStore.data.categories];
      if (!includeInactive) {
        list = list.filter(c => c.is_active);
      }
      return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  },

  async getCategoryById(id) {
    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM categories WHERE id = $1', [id]);
      return res.rows[0] || null;
    } else {
      return localStore.data.categories.find(c => c.id === id) || null;
    }
  },

  async getCategoryBySlug(slug) {
    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM categories WHERE slug = $1', [slug]);
      return res.rows[0] || null;
    } else {
      return localStore.data.categories.find(c => c.slug === slug) || null;
    }
  },

  async saveCategory(category) {
    const now = new Date().toISOString();
    if (usePostgres) {
      const query = `
        INSERT INTO categories (id, name, slug, description, image_url, icon, display_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          icon = EXCLUDED.icon,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      const values = [
        category.id, category.name, category.slug, category.description || '',
        category.image_url || '', category.icon || 'tag', category.display_order || 0,
        category.is_active !== undefined ? category.is_active : true,
        category.created_at || now, now
      ];
      const res = await pgPool.query(query, values);
      return res.rows[0];
    } else {
      const idx = localStore.data.categories.findIndex(c => c.id === category.id);
      const catObj = {
        ...category,
        description: category.description || '',
        image_url: category.image_url || '',
        icon: category.icon || 'tag',
        display_order: Number(category.display_order) || 0,
        is_active: category.is_active !== undefined ? Boolean(category.is_active) : true,
        updated_at: now,
        created_at: category.created_at || now
      };
      if (idx >= 0) {
        localStore.data.categories[idx] = catObj;
      } else {
        localStore.data.categories.push(catObj);
      }
      localStore.save();
      return catObj;
    }
  },

  async deleteCategory(id) {
    if (usePostgres) {
      await pgPool.query('DELETE FROM categories WHERE id = $1', [id]);
      return true;
    } else {
      localStore.data.categories = localStore.data.categories.filter(c => c.id !== id);
      localStore.data.subcategories = localStore.data.subcategories.filter(s => s.category_id !== id);
      localStore.save();
      return true;
    }
  },

  // Subcategory Queries
  async getSubcategories(categoryId = null, includeInactive = false) {
    if (usePostgres) {
      let query = 'SELECT * FROM subcategories';
      const params = [];
      const conditions = [];

      if (categoryId) {
        params.push(categoryId);
        conditions.push(`category_id = $${params.length}`);
      }
      if (!includeInactive) {
        conditions.push('is_active = true');
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY display_order ASC, name ASC';
      const res = await pgPool.query(query, params);
      return res.rows;
    } else {
      let list = [...localStore.data.subcategories];
      if (categoryId) {
        list = list.filter(s => s.category_id === categoryId);
      }
      if (!includeInactive) {
        list = list.filter(s => s.is_active);
      }
      return list.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }
  },

  async saveSubcategory(subcat) {
    const now = new Date().toISOString();
    if (usePostgres) {
      const query = `
        INSERT INTO subcategories (id, category_id, name, slug, description, image_url, display_order, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          image_url = EXCLUDED.image_url,
          display_order = EXCLUDED.display_order,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
        RETURNING *;
      `;
      const values = [
        subcat.id, subcat.category_id, subcat.name, subcat.slug, subcat.description || '',
        subcat.image_url || '', subcat.display_order || 0,
        subcat.is_active !== undefined ? subcat.is_active : true,
        subcat.created_at || now, now
      ];
      const res = await pgPool.query(query, values);
      return res.rows[0];
    } else {
      const idx = localStore.data.subcategories.findIndex(s => s.id === subcat.id);
      const subObj = {
        ...subcat,
        description: subcat.description || '',
        image_url: subcat.image_url || '',
        display_order: Number(subcat.display_order) || 0,
        is_active: subcat.is_active !== undefined ? Boolean(subcat.is_active) : true,
        updated_at: now,
        created_at: subcat.created_at || now
      };
      if (idx >= 0) {
        localStore.data.subcategories[idx] = subObj;
      } else {
        localStore.data.subcategories.push(subObj);
      }
      localStore.save();
      return subObj;
    }
  },

  async deleteSubcategory(id) {
    if (usePostgres) {
      await pgPool.query('DELETE FROM subcategories WHERE id = $1', [id]);
      return true;
    } else {
      localStore.data.subcategories = localStore.data.subcategories.filter(s => s.id !== id);
      localStore.save();
      return true;
    }
  },

  // Products Queries
  async getProducts(filters = {}) {
    const {
      categoryId,
      subcategoryId,
      search,
      minPrice,
      maxPrice,
      isFeatured,
      isBestseller,
      isTrending,
      isActive = true,
      includeInactive = false,
      sortBy = 'newest', // newest, price_low, price_high, name_asc
      limit = 50,
      offset = 0
    } = filters;

    if (usePostgres) {
      let query = 'SELECT p.*, c.name as category_name, c.slug as category_slug, s.name as subcategory_name FROM products p JOIN categories c ON p.category_id = c.id LEFT JOIN subcategories s ON p.subcategory_id = s.id';
      const conditions = [];
      const params = [];

      if (!includeInactive) {
        conditions.push('p.is_active = true');
        conditions.push('c.is_active = true');
      }
      if (categoryId) {
        params.push(categoryId);
        conditions.push(`(p.category_id = $${params.length} OR c.slug = $${params.length})`);
      }
      if (subcategoryId) {
        params.push(subcategoryId);
        conditions.push(`(p.subcategory_id = $${params.length} OR s.slug = $${params.length})`);
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(LOWER(p.title) LIKE $${params.length} OR LOWER(p.description) LIKE $${params.length})`);
      }
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        params.push(Number(minPrice));
        conditions.push(`COALESCE(p.sale_price, p.regular_price) >= $${params.length}`);
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        params.push(Number(maxPrice));
        conditions.push(`COALESCE(p.sale_price, p.regular_price) <= $${params.length}`);
      }
      if (isFeatured) {
        conditions.push('p.is_featured = true');
      }
      if (isBestseller) {
        conditions.push('p.is_bestseller = true');
      }
      if (isTrending) {
        conditions.push('p.is_trending = true');
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      switch (sortBy) {
        case 'price_low':
          query += ' ORDER BY COALESCE(p.sale_price, p.regular_price) ASC';
          break;
        case 'price_high':
          query += ' ORDER BY COALESCE(p.sale_price, p.regular_price) DESC';
          break;
        case 'name_asc':
          query += ' ORDER BY p.title ASC';
          break;
        case 'newest':
        default:
          query += ' ORDER BY p.created_at DESC';
      }

      params.push(Number(limit));
      query += ` LIMIT $${params.length}`;
      params.push(Number(offset));
      query += ` OFFSET $${params.length}`;

      const res = await pgPool.query(query, params);
      const products = res.rows;

      // Populate images and variants
      for (const p of products) {
        const imgRes = await pgPool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order ASC', [p.id]);
        p.images = imgRes.rows;
        const varRes = await pgPool.query('SELECT * FROM product_variants WHERE product_id = $1', [p.id]);
        p.variants = varRes.rows;
      }
      return products;
    } else {
      let list = [...localStore.data.products];
      const categoriesMap = Object.fromEntries(localStore.data.categories.map(c => [c.id, c]));
      const subcategoriesMap = Object.fromEntries(localStore.data.subcategories.map(s => [s.id, s]));

      if (!includeInactive) {
        list = list.filter(p => p.is_active && (!categoriesMap[p.category_id] || categoriesMap[p.category_id].is_active));
      }
      if (categoryId) {
        list = list.filter(p => p.category_id === categoryId || (categoriesMap[p.category_id] && categoriesMap[p.category_id].slug === categoryId));
      }
      if (subcategoryId) {
        list = list.filter(p => p.subcategory_id === subcategoryId || (subcategoriesMap[p.subcategory_id] && subcategoriesMap[p.subcategory_id].slug === subcategoryId));
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(p => p.title.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s)));
      }
      if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
        list = list.filter(p => (p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.regular_price) >= Number(minPrice));
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
        list = list.filter(p => (p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.regular_price) <= Number(maxPrice));
      }
      if (isFeatured) {
        list = list.filter(p => p.is_featured);
      }
      if (isBestseller) {
        list = list.filter(p => p.is_bestseller);
      }
      if (isTrending) {
        list = list.filter(p => p.is_trending);
      }

      switch (sortBy) {
        case 'price_low':
          list.sort((a, b) => (a.sale_price || a.regular_price) - (b.sale_price || b.regular_price));
          break;
        case 'price_high':
          list.sort((a, b) => (b.sale_price || b.regular_price) - (a.sale_price || a.regular_price));
          break;
        case 'name_asc':
          list.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'newest':
        default:
          list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      }

      const paginated = list.slice(Number(offset), Number(offset) + Number(limit));

      return paginated.map(p => {
        const cat = categoriesMap[p.category_id];
        const sub = subcategoriesMap[p.subcategory_id];
        const images = (localStore.data.product_images || []).filter(img => img.product_id === p.id).sort((a, b) => a.display_order - b.display_order);
        const variants = (localStore.data.product_variants || []).filter(v => v.product_id === p.id);
        return {
          ...p,
          category_name: cat ? cat.name : '',
          category_slug: cat ? cat.slug : '',
          subcategory_name: sub ? sub.name : '',
          images: images.length > 0 ? images : (p.images || []),
          variants: variants.length > 0 ? variants : (p.variants || [])
        };
      });
    }
  },

  async getProductByIdOrSlug(idOrSlug) {
    if (usePostgres) {
      const res = await pgPool.query(
        `SELECT p.*, c.name as category_name, c.slug as category_slug, s.name as subcategory_name 
         FROM products p 
         JOIN categories c ON p.category_id = c.id 
         LEFT JOIN subcategories s ON p.subcategory_id = s.id 
         WHERE p.id = $1 OR p.slug = $1`,
        [idOrSlug]
      );
      if (res.rows.length === 0) return null;
      const product = res.rows[0];
      const imgRes = await pgPool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order ASC', [product.id]);
      product.images = imgRes.rows;
      const varRes = await pgPool.query('SELECT * FROM product_variants WHERE product_id = $1', [product.id]);
      product.variants = varRes.rows;
      return product;
    } else {
      const p = localStore.data.products.find(prod => prod.id === idOrSlug || prod.slug === idOrSlug);
      if (!p) return null;
      const cat = localStore.data.categories.find(c => c.id === p.category_id);
      const sub = localStore.data.subcategories.find(s => s.id === p.subcategory_id);
      const images = (localStore.data.product_images || []).filter(img => img.product_id === p.id).sort((a, b) => a.display_order - b.display_order);
      const variants = (localStore.data.product_variants || []).filter(v => v.product_id === p.id);
      return {
        ...p,
        category_name: cat ? cat.name : '',
        category_slug: cat ? cat.slug : '',
        subcategory_name: sub ? sub.name : '',
        images: images.length > 0 ? images : (p.images || []),
        variants: variants.length > 0 ? variants : (p.variants || [])
      };
    }
  },

  async saveProduct(product) {
    const now = new Date().toISOString();
    const { images = [], variants = [] } = product;

    if (usePostgres) {
      const query = `
        INSERT INTO products (id, title, slug, description, category_id, subcategory_id, regular_price, sale_price, cost_price, is_featured, is_bestseller, is_trending, is_active, stock_quantity, sku, tags, created_at, updated_at, cost_base, cost_shipping, cost_extra)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          description = EXCLUDED.description,
          category_id = EXCLUDED.category_id,
          subcategory_id = EXCLUDED.subcategory_id,
          regular_price = EXCLUDED.regular_price,
          sale_price = EXCLUDED.sale_price,
          cost_price = EXCLUDED.cost_price,
          is_featured = EXCLUDED.is_featured,
          is_bestseller = EXCLUDED.is_bestseller,
          is_trending = EXCLUDED.is_trending,
          is_active = EXCLUDED.is_active,
          stock_quantity = EXCLUDED.stock_quantity,
          sku = EXCLUDED.sku,
          tags = EXCLUDED.tags,
          updated_at = EXCLUDED.updated_at,
          cost_base = EXCLUDED.cost_base,
          cost_shipping = EXCLUDED.cost_shipping,
          cost_extra = EXCLUDED.cost_extra
        RETURNING *;
      `;
      const values = [
        product.id, product.title, product.slug, product.description,
        product.category_id, product.subcategory_id || null,
        Number(product.regular_price), product.sale_price ? Number(product.sale_price) : null,
        product.cost_price ? Number(product.cost_price) : null,
        Boolean(product.is_featured), Boolean(product.is_bestseller), Boolean(product.is_trending),
        product.is_active !== undefined ? Boolean(product.is_active) : true,
        Number(product.stock_quantity) || 0, product.sku || '',
        product.tags || [], product.created_at || now, now,
        Number(product.cost_base) || 0, Number(product.cost_shipping) || 0, Number(product.cost_extra) || 0
      ];
      await this.ensureLedgerSchema();
      const res = await pgPool.query(query, values);
      const savedProd = res.rows[0];

      // Update images
      if (images && images.length > 0) {
        await pgPool.query('DELETE FROM product_images WHERE product_id = $1', [product.id]);
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          await pgPool.query(
            'INSERT INTO product_images (id, product_id, image_url, alt_text, display_order, is_primary) VALUES ($1, $2, $3, $4, $5, $6)',
            [img.id || `${product.id}-img-${i}`, product.id, img.image_url || img, img.alt_text || product.title, i, i === 0]
          );
        }
      }

      // Update variants
      if (variants && variants.length > 0) {
        await pgPool.query('DELETE FROM product_variants WHERE product_id = $1', [product.id]);
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          await pgPool.query(
            'INSERT INTO product_variants (id, product_id, variant_type, name, value, price_adjustment, stock_quantity, sku) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [v.id || `${product.id}-var-${i}`, product.id, v.variant_type || 'Option', v.name, v.value, Number(v.price_adjustment) || 0, Number(v.stock_quantity) || 10, v.sku || '']
          );
        }
      }

      return this.getProductByIdOrSlug(product.id);
    } else {
      const idx = localStore.data.products.findIndex(p => p.id === product.id);
      const prodObj = {
        ...product,
        regular_price: Number(product.regular_price),
        sale_price: product.sale_price ? Number(product.sale_price) : null,
        cost_price: product.cost_price ? Number(product.cost_price) : null,
        cost_base: Number(product.cost_base) || 0,
        cost_shipping: Number(product.cost_shipping) || 0,
        cost_extra: Number(product.cost_extra) || 0,
        is_featured: Boolean(product.is_featured),
        is_bestseller: Boolean(product.is_bestseller),
        is_trending: Boolean(product.is_trending),
        is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
        stock_quantity: Number(product.stock_quantity) || 0,
        sku: product.sku || '',
        tags: product.tags || [],
        updated_at: now,
        created_at: product.created_at || now
      };

      if (idx >= 0) {
        localStore.data.products[idx] = prodObj;
      } else {
        localStore.data.products.push(prodObj);
      }

      // Save images
      localStore.data.product_images = (localStore.data.product_images || []).filter(img => img.product_id !== product.id);
      if (images && images.length > 0) {
        images.forEach((img, i) => {
          localStore.data.product_images.push({
            id: img.id || `${product.id}-img-${i}`,
            product_id: product.id,
            image_url: typeof img === 'string' ? img : img.image_url,
            alt_text: img.alt_text || product.title,
            display_order: i,
            is_primary: i === 0,
            created_at: now
          });
        });
      }

      // Save variants
      localStore.data.product_variants = (localStore.data.product_variants || []).filter(v => v.product_id !== product.id);
      if (variants && variants.length > 0) {
        variants.forEach((v, i) => {
          localStore.data.product_variants.push({
            id: v.id || `${product.id}-var-${i}`,
            product_id: product.id,
            variant_type: v.variant_type || 'Option',
            name: v.name,
            value: v.value,
            price_adjustment: Number(v.price_adjustment) || 0,
            stock_quantity: Number(v.stock_quantity) || 10,
            sku: v.sku || '',
            created_at: now
          });
        });
      }

      localStore.save();
      return this.getProductByIdOrSlug(product.id);
    }
  },

  async deleteProduct(id) {
    if (usePostgres) {
      await pgPool.query('DELETE FROM products WHERE id = $1', [id]);
      return true;
    } else {
      localStore.data.products = localStore.data.products.filter(p => p.id !== id);
      localStore.data.product_images = (localStore.data.product_images || []).filter(img => img.product_id !== id);
      localStore.data.product_variants = (localStore.data.product_variants || []).filter(v => v.product_id !== id);
      localStore.save();
      return true;
    }
  },

  // Reduce stock after an order is placed. Decrements the variant when one was
  // chosen, and always decrements the parent product's own stock counter.
  async decrementStock(productId, variantId, qty) {
    const amount = Math.max(0, Math.floor(Number(qty) || 0));
    if (!productId || amount === 0) return;

    if (usePostgres) {
      await pgPool.query(
        'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - $1), updated_at = $2 WHERE id = $3',
        [amount, new Date().toISOString(), productId]
      );
      if (variantId) {
        await pgPool.query(
          'UPDATE product_variants SET stock_quantity = GREATEST(0, stock_quantity - $1) WHERE id = $2',
          [amount, variantId]
        );
      }
      return;
    }

    const product = localStore.data.products.find(p => p.id === productId);
    if (product) {
      product.stock_quantity = Math.max(0, (Number(product.stock_quantity) || 0) - amount);
      product.updated_at = new Date().toISOString();
    }
    if (variantId) {
      const variant = (localStore.data.product_variants || []).find(v => v.id === variantId);
      if (variant) {
        variant.stock_quantity = Math.max(0, (Number(variant.stock_quantity) || 0) - amount);
      }
    }
    localStore.save();
  },

  // Orders Queries
  async createOrder(orderData, items = []) {
    const now = new Date().toISOString();
    const randNum = String(Math.floor(100000 + Math.random() * 900000));
    const orderNumber = orderData.order_number || ('ZV-' + new Date().getFullYear() + '-' + randNum);
    const orderId = orderData.id || `ord-${randNum}-${Date.now()}`;

    const fullOrder = {
      ...orderData,
      id: orderId,
      order_number: orderNumber,
      payment_method: orderData.payment_method || 'COD',
      order_status: 'Pending',
      created_at: now,
      updated_at: now
    };

    if (usePostgres) {
      const query = `
        INSERT INTO orders (id, order_number, customer_name, customer_email, customer_phone, customer_whatsapp, province, city, address, postal_code, order_notes, payment_method, subtotal, delivery_fee, discount, total_amount, order_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *;
      `;
      const values = [
        fullOrder.id, fullOrder.order_number, fullOrder.customer_name, fullOrder.customer_email || '',
        fullOrder.customer_phone, fullOrder.customer_whatsapp || fullOrder.customer_phone,
        fullOrder.province, fullOrder.city, fullOrder.address, fullOrder.postal_code || '',
        fullOrder.order_notes || '', fullOrder.payment_method, Number(fullOrder.subtotal),
        Number(fullOrder.delivery_fee) || 0, Number(fullOrder.discount) || 0,
        Number(fullOrder.total_amount), fullOrder.order_status, now, now
      ];
      const res = await pgPool.query(query, values);
      const savedOrder = res.rows[0];

      // Save order items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pgPool.query(
          'INSERT INTO order_items (id, order_id, product_id, product_title, variant_info, price, quantity, total_price, cost_price, product_image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
          [
            item.id || `item-${savedOrder.id}-${i}`,
            savedOrder.id,
            item.product_id || null,
            item.product_title,
            JSON.stringify(item.variant_info || {}),
            Number(item.price),
            Number(item.quantity) || 1,
            Number(item.total_price || (item.price * item.quantity)),
            Number(item.cost_price) || 0,
            item.product_image || ''
          ]
        );
      }

      // Add initial timeline item
      await pgPool.query(
        'INSERT INTO order_timeline (id, order_id, status, note, created_at) VALUES ($1, $2, $3, $4, $5)',
        [`tl-${savedOrder.id}-1`, savedOrder.id, 'Pending', 'Order placed successfully by customer.', now]
      );

      return this.getOrderByIdOrNumber(savedOrder.order_number);
    } else {
      localStore.data.orders.push(fullOrder);

      // Save items
      items.forEach((item, i) => {
        localStore.data.order_items.push({
          id: item.id || `item-${fullOrder.id}-${i}`,
          order_id: fullOrder.id,
          product_id: item.product_id || null,
          product_title: item.product_title,
          variant_info: item.variant_info || {},
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          total_price: Number(item.total_price || (item.price * item.quantity)),
          cost_price: Number(item.cost_price) || 0,
          product_image: item.product_image || '',
          created_at: now
        });
      });

      // Save initial timeline
      localStore.data.order_timeline.push({
        id: `tl-${fullOrder.id}-1`,
        order_id: fullOrder.id,
        status: 'Pending',
        note: 'Order placed successfully by customer.',
        created_at: now
      });

      localStore.save();
      return this.getOrderByIdOrNumber(fullOrder.order_number);
    }
  },

  async getOrderByIdOrNumber(idOrNumber) {
    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM orders WHERE id = $1 OR order_number = $1', [idOrNumber]);
      if (res.rows.length === 0) return null;
      const order = res.rows[0];
      const itemsRes = await pgPool.query('SELECT * FROM order_items WHERE order_id = $1', [order.id]);
      order.items = itemsRes.rows;
      const tlRes = await pgPool.query('SELECT * FROM order_timeline WHERE order_id = $1 ORDER BY created_at ASC', [order.id]);
      order.timeline = tlRes.rows;
      return order;
    } else {
      const order = localStore.data.orders.find(o => o.id === idOrNumber || o.order_number === idOrNumber);
      if (!order) return null;
      const items = (localStore.data.order_items || []).filter(item => item.order_id === order.id);
      const timeline = (localStore.data.order_timeline || []).filter(tl => tl.order_id === order.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return {
        ...order,
        items,
        timeline
      };
    }
  },

  async getOrders(filters = {}) {
    const { status, search, limit = 50, offset = 0 } = filters;
    if (usePostgres) {
      let query = 'SELECT * FROM orders';
      const params = [];
      const conditions = [];

      if (status && status !== 'all') {
        params.push(status);
        conditions.push(`order_status = $${params.length}`);
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        conditions.push(`(LOWER(order_number) LIKE $${params.length} OR LOWER(customer_name) LIKE $${params.length} OR customer_phone LIKE $${params.length} OR LOWER(city) LIKE $${params.length})`);
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC';
      params.push(Number(limit));
      query += ` LIMIT $${params.length}`;
      params.push(Number(offset));
      query += ` OFFSET $${params.length}`;

      const res = await pgPool.query(query, params);
      const orders = res.rows;
      for (const ord of orders) {
        const itemsRes = await pgPool.query('SELECT * FROM order_items WHERE order_id = $1', [ord.id]);
        ord.items = itemsRes.rows;
      }
      return orders;
    } else {
      let list = [...localStore.data.orders];
      if (status && status !== 'all') {
        list = list.filter(o => o.order_status.toLowerCase() === status.toLowerCase());
      }
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(o => 
          o.order_number.toLowerCase().includes(s) ||
          o.customer_name.toLowerCase().includes(s) ||
          (o.customer_phone && o.customer_phone.includes(s)) ||
          (o.city && o.city.toLowerCase().includes(s))
        );
      }
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      const paginated = list.slice(Number(offset), Number(offset) + Number(limit));
      return paginated.map(ord => ({
        ...ord,
        items: (localStore.data.order_items || []).filter(item => item.order_id === ord.id)
      }));
    }
  },

  async updateOrderStatus(id, newStatus, note = '') {
    const now = new Date().toISOString();
    if (usePostgres) {
      await pgPool.query('UPDATE orders SET order_status = $1, updated_at = $2 WHERE id = $3', [newStatus, now, id]);
      await pgPool.query(
        'INSERT INTO order_timeline (id, order_id, status, note, created_at) VALUES ($1, $2, $3, $4, $5)',
        [`tl-${id}-${Date.now()}`, id, newStatus, note || `Status updated to ${newStatus}`, now]
      );
      return this.getOrderByIdOrNumber(id);
    } else {
      const order = localStore.data.orders.find(o => o.id === id || o.order_number === id);
      if (!order) return null;
      order.order_status = newStatus;
      order.updated_at = now;
      localStore.data.order_timeline.push({
        id: `tl-${order.id}-${Date.now()}`,
        order_id: order.id,
        status: newStatus,
        note: note || `Status updated to ${newStatus}`,
        created_at: now
      });
      localStore.save();
      return this.getOrderByIdOrNumber(order.id);
    }
  },

  // Admin Stats
  // ==========================================================
  // Accounts & Ledger — vendors, purchases, vendor payments, expenses
  // Generic row storage. Local store: arrays on localStore.data. Postgres:
  // one table per collection (created lazily by ensureLedgerSchema).
  // ==========================================================
  LEDGER_TABLES: {
    vendors: ['id', 'name', 'contact_person', 'phone', 'whatsapp', 'email', 'city', 'address', 'notes', 'is_active', 'created_at', 'updated_at'],
    purchases: ['id', 'vendor_id', 'product_id', 'product_title', 'quantity', 'unit_cost', 'shipping_cost', 'extra_cost', 'extra_cost_note', 'vendor_amount', 'total_cost', 'landed_unit_cost', 'purchase_date', 'reference', 'notes', 'created_at'],
    vendor_payments: ['id', 'vendor_id', 'amount', 'method', 'reference', 'payment_date', 'notes', 'created_at'],
    expenses: ['id', 'category', 'description', 'amount', 'expense_date', 'vendor_id', 'reference', 'notes', 'created_at'],
    admin_sessions: ['id', 'username', 'last_seen', 'user_agent', 'ip', 'created_at'],
    admin_users: ['id', 'username', 'password_hash', 'email', 'role', 'display_name', 'is_active', 'last_login_at', 'created_at', 'updated_at'],
    uploaded_images: ['id', 'mime', 'bytes', 'size', 'created_at']
  },

  async ensureLedgerSchema() {
    if (!usePostgres || this._ledgerSchemaReady) return;
    await pgPool.query(`CREATE TABLE IF NOT EXISTS vendors (
      id VARCHAR(64) PRIMARY KEY, name VARCHAR(150) NOT NULL, contact_person VARCHAR(150), phone VARCHAR(50),
      whatsapp VARCHAR(50), email VARCHAR(150), city VARCHAR(100), address TEXT, notes TEXT,
      is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS purchases (
      id VARCHAR(64) PRIMARY KEY, vendor_id VARCHAR(64), product_id VARCHAR(64), product_title VARCHAR(255),
      quantity INT NOT NULL DEFAULT 1, unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0, shipping_cost NUMERIC(12,2) DEFAULT 0,
      extra_cost NUMERIC(12,2) DEFAULT 0, extra_cost_note VARCHAR(255), vendor_amount NUMERIC(12,2) DEFAULT 0,
      total_cost NUMERIC(12,2) DEFAULT 0, landed_unit_cost NUMERIC(12,2) DEFAULT 0, purchase_date DATE,
      reference VARCHAR(100), notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS vendor_payments (
      id VARCHAR(64) PRIMARY KEY, vendor_id VARCHAR(64) NOT NULL, amount NUMERIC(12,2) NOT NULL, method VARCHAR(50),
      reference VARCHAR(100), payment_date DATE, notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    // admin_users exists from schema.sql; columns added since
    await pgPool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120)');
    await pgPool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
    await pgPool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ');
    await pgPool.query('ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP');
    await pgPool.query(`CREATE TABLE IF NOT EXISTS admin_sessions (
      id VARCHAR(64) PRIMARY KEY, username VARCHAR(100), last_seen TIMESTAMPTZ, user_agent VARCHAR(255), ip VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS uploaded_images (
      id VARCHAR(160) PRIMARY KEY, mime VARCHAR(40), bytes BYTEA NOT NULL, size INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    await pgPool.query(`CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(64) PRIMARY KEY, category VARCHAR(60) NOT NULL, description VARCHAR(255), amount NUMERIC(12,2) NOT NULL,
      expense_date DATE, vendor_id VARCHAR(64), reference VARCHAR(100), notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)`);
    // Landed-cost breakdown on products (schema.sql has these for new DBs)
    await pgPool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_base NUMERIC(12,2) DEFAULT 0');
    await pgPool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_shipping NUMERIC(12,2) DEFAULT 0');
    await pgPool.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_extra NUMERIC(12,2) DEFAULT 0');
    this._ledgerSchemaReady = true;
  },

  async listRows(table, filter = {}) {
    const cols = this.LEDGER_TABLES[table];
    if (!cols) throw new Error(`Unknown ledger table: ${table}`);
    if (usePostgres) {
      await this.ensureLedgerSchema();
      const keys = Object.keys(filter).filter(k => cols.includes(k) && filter[k] !== undefined && filter[k] !== null && filter[k] !== '');
      const where = keys.length ? ' WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ') : '';
      const res = await pgPool.query(`SELECT * FROM ${table}${where} ORDER BY created_at DESC`, keys.map(k => filter[k]));
      return res.rows;
    }
    let list = [...(localStore.data[table] || [])];
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null && v !== '') list = list.filter(r => r[k] === v);
    }
    return list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  },

  async getRow(table, id) {
    if (usePostgres) {
      await this.ensureLedgerSchema();
      const res = await pgPool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return res.rows[0] || null;
    }
    return (localStore.data[table] || []).find(r => r.id === id) || null;
  },

  async saveRow(table, row) {
    const cols = this.LEDGER_TABLES[table];
    if (!cols) throw new Error(`Unknown ledger table: ${table}`);
    const now = new Date().toISOString();
    const clean = {};
    for (const c of cols) if (row[c] !== undefined) clean[c] = row[c];
    clean.created_at = row.created_at || now;
    if (cols.includes('updated_at')) clean.updated_at = now;

    if (usePostgres) {
      await this.ensureLedgerSchema();
      const keys = Object.keys(clean);
      const updates = keys.filter(k => k !== 'id' && k !== 'created_at').map(k => `${k} = EXCLUDED.${k}`);
      const res = await pgPool.query(
        `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(', ')})
         ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')} RETURNING *`,
        keys.map(k => clean[k])
      );
      return res.rows[0];
    }
    if (!localStore.data[table]) localStore.data[table] = [];
    const idx = localStore.data[table].findIndex(r => r.id === clean.id);
    if (idx >= 0) localStore.data[table][idx] = { ...localStore.data[table][idx], ...clean };
    else localStore.data[table].push(clean);
    localStore.save();
    return idx >= 0 ? localStore.data[table][idx] : clean;
  },

  async deleteRow(table, id) {
    if (!this.LEDGER_TABLES[table]) throw new Error(`Unknown ledger table: ${table}`);
    if (usePostgres) {
      await this.ensureLedgerSchema();
      await pgPool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return true;
    }
    localStore.data[table] = (localStore.data[table] || []).filter(r => r.id !== id);
    localStore.save();
    return true;
  },

  // Stock received from a purchase. Also re-costs the product: the landed
  // cost of stock on hand becomes a weighted average of what was already there
  // and what just arrived, so cost_price (used for profit on every order line)
  // tracks what the goods actually cost.
  async receiveStock(productId, qty, landedUnitCost) {
    const amount = Math.max(0, Math.floor(Number(qty) || 0));
    if (!productId || amount === 0) return null;
    const product = await this.getProductByIdOrSlug(productId);
    if (!product) return null;

    const onHand = Math.max(0, Number(product.stock_quantity) || 0);
    const oldCost = Number(product.cost_price) || 0;
    const incoming = Number(landedUnitCost) || 0;
    const newCost = onHand + amount > 0
      ? Math.round(((onHand * oldCost) + (amount * incoming)) / (onHand + amount) * 100) / 100
      : incoming;
    const newStock = onHand + amount;

    if (usePostgres) {
      await pgPool.query(
        'UPDATE products SET stock_quantity = $1, cost_price = $2, updated_at = $3 WHERE id = $4',
        [newStock, newCost, new Date().toISOString(), product.id]
      );
    } else {
      const p = localStore.data.products.find(x => x.id === product.id);
      if (p) {
        p.stock_quantity = newStock;
        p.cost_price = newCost;
        p.updated_at = new Date().toISOString();
        localStore.save();
      }
    }
    return { stock_quantity: newStock, cost_price: newCost };
  },

  // Direct stock set from the admin (manual count / correction)
  async setStock(productId, qty) {
    const amount = Math.max(0, Math.floor(Number(qty) || 0));
    if (usePostgres) {
      await pgPool.query('UPDATE products SET stock_quantity = $1, updated_at = $2 WHERE id = $3', [amount, new Date().toISOString(), productId]);
    } else {
      const p = localStore.data.products.find(x => x.id === productId);
      if (!p) return null;
      p.stock_quantity = amount;
      p.updated_at = new Date().toISOString();
      localStore.save();
    }
    return this.getProductByIdOrSlug(productId);
  },

  // Everything the analytics endpoint needs in one call
  async getAllOrdersWithItems() {
    if (usePostgres) {
      const res = await pgPool.query('SELECT * FROM orders ORDER BY created_at DESC');
      const orders = res.rows;
      const items = await pgPool.query('SELECT * FROM order_items');
      const byOrder = {};
      for (const it of items.rows) (byOrder[it.order_id] = byOrder[it.order_id] || []).push(it);
      return orders.map(o => ({ ...o, items: byOrder[o.id] || [] }));
    }
    const items = localStore.data.order_items || [];
    return [...localStore.data.orders]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .map(o => ({ ...o, items: items.filter(i => i.order_id === o.id) }));
  },

  // Store Settings (payment methods, homepage banners, collections)
  // One JSON document. Postgres keeps it in store_settings under key 'store';
  // the local store keeps it at data.settings. Defaults are merged on read so
  // consumers always get the full shape (see utils/store-settings.js).
  async getSettings() {
    if (usePostgres) {
      await this.ensureSettingsTable();
      const res = await pgPool.query("SELECT value FROM store_settings WHERE key = 'store'");
      return StoreSettings.withDefaults(res.rows[0] ? res.rows[0].value : null);
    } else {
      return StoreSettings.withDefaults(localStore.data.settings);
    }
  },

  async saveSettings(patch) {
    const current = await this.getSettings();
    patch = patch || {};

    // Payment methods merge per code over the current state, so a partial
    // update ("disable COD") never resets the other methods. Banners and
    // collections are ordered lists the admin edits as a whole, so they replace.
    if (Array.isArray(patch.payment_methods)) {
      const merged = current.payment_methods.map(m => ({ ...m }));
      for (const incoming of patch.payment_methods) {
        if (!incoming || typeof incoming.code !== 'string') continue;
        const code = incoming.code.trim().toUpperCase();
        const idx = merged.findIndex(m => m.code === code);
        if (idx >= 0) merged[idx] = { ...merged[idx], ...incoming, code };
        else merged.push({ ...incoming, code });
      }
      patch = { ...patch, payment_methods: merged };
    }
    if (patch.homepage && typeof patch.homepage === 'object') {
      patch = { ...patch, homepage: { ...current.homepage, ...patch.homepage } };
    }
    if (patch.store && typeof patch.store === 'object') {
      patch = { ...patch, store: { ...current.store, ...patch.store } };
    }

    const next = StoreSettings.sanitize({ ...current, ...patch });
    const now = new Date().toISOString();
    if (usePostgres) {
      await this.ensureSettingsTable();
      await pgPool.query(
        `INSERT INTO store_settings (key, value, updated_at) VALUES ('store', $1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [JSON.stringify(next), now]
      );
    } else {
      localStore.data.settings = next;
      localStore.save();
    }
    return next;
  },

  // schema.sql uses CREATE TABLE IF NOT EXISTS, so an existing database will
  // not have this table; create it lazily rather than failing the request.
  async ensureSettingsTable() {
    if (!usePostgres || this._settingsTableReady) return;
    await pgPool.query(`CREATE TABLE IF NOT EXISTS store_settings (
      key VARCHAR(64) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`);
    this._settingsTableReady = true;
  },

  async getAdminStats() {
    let orders = [];
    let products = [];
    if (usePostgres) {
      const ordRes = await pgPool.query('SELECT * FROM orders');
      orders = ordRes.rows;
      const prodRes = await pgPool.query('SELECT * FROM products');
      products = prodRes.rows;
    } else {
      orders = localStore.data.orders || [];
      products = localStore.data.products || [];
    }

    const totalSales = orders
      .filter(o => o.order_status !== 'Cancelled' && o.order_status !== 'Returned')
      .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

    const counts = {
      total: orders.length,
      pending: orders.filter(o => o.order_status === 'Pending').length,
      confirmed: orders.filter(o => o.order_status === 'Confirmed').length,
      processing: orders.filter(o => o.order_status === 'Processing').length,
      shipped: orders.filter(o => o.order_status === 'Shipped').length,
      delivered: orders.filter(o => o.order_status === 'Delivered').length,
      cancelled: orders.filter(o => o.order_status === 'Cancelled').length,
      returned: orders.filter(o => o.order_status === 'Returned').length
    };

    const lowStock = products.filter(p => Number(p.stock_quantity) <= 5);

    return {
      totalSales,
      ordersCount: counts,
      totalProducts: products.length,
      lowStockProducts: lowStock.length,
      recentOrders: orders.slice(0, 8)
    };
  }
};

module.exports = db;
