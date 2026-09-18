require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db/db');
const { seedDatabase } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Behind Render / Cloudflare the client IP arrives in X-Forwarded-For
app.set('trust proxy', 1);

// Static Assets
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
// Uploaded product images (database-backed on PostgreSQL; static above wins locally)
app.get('/uploads/products/:name', (req, res) => require('./routes/uploads').serveImage(req, res));

// Optional extra lock: PUBLIC_DEMO=true refuses management writes from
// non-local clients even with a valid session (for public demos).
app.use(require('./middleware/public-demo'));

// Admin authentication. Public: browsing, checkout, order tracking, storefront
// settings. Everything that changes the store or reads management data needs
// a valid admin session (Authorization: Bearer <token>).
const auth = require('./middleware/admin-auth');
const adminWrite = (req, res, next) => (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? auth.requireAdmin(req, res, next) : next());

// API Routes
app.use('/api/categories', auth.requireAdminForAll, adminWrite, require('./routes/categories'));
app.use('/api/products', auth.requireAdminForAll, adminWrite, require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));            // inside: POST + track public, rest admin
app.use('/api/customer', require('./routes/customer'));
app.use('/api/settings', auth.requireAdminForAll, adminWrite, require('./routes/settings'));
app.use('/api/ledger', auth.requireAdmin, require('./routes/ledger').router);
app.use('/api/uploads', require('./routes/uploads').router);   // inside: management routes admin
app.use('/api/admin/analytics', auth.requireAdmin, require('./routes/analytics'));
app.use('/api/admin', require('./routes/admin'));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    brand: 'Zavyaan',
    mode: db.isPostgres() ? 'PostgreSQL' : 'Local File Persistence',
    timestamp: new Date().toISOString()
  });
});

// Auto-seed if database is empty on startup
async function initStore() {
  try {
    await db.applySchema();
    const cats = await db.getCategories(true);
    if (!cats || cats.length === 0) {
      console.log('[App] Empty database detected. Auto-seeding initial categories and sample products...');
      await seedDatabase();
    } else {
      console.log(`[App] Database active with ${cats.length} categories.`);
    }
  } catch (err) {
    console.error('[App] Init error:', err);
  }
}

// Fallback to SPA index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Verify the schema and seed BEFORE accepting traffic, so the first request
// (or a health check) never sees an empty database.
initStore().then(() => app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`  ZAVYAAN E-COMMERCE SERVER IS RUNNING`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Database: ${db.isPostgres() ? 'PostgreSQL' : 'Embedded JSON'}`);
  console.log(`======================================================\n`);
}));
