// ==========================================================
// ZAVYAAN — PUBLIC DEMO GUARD
// ==========================================================
// The project has no authentication layer yet (Phase D/E). Until it does, any
// POST/PUT/DELETE on products, categories or order status is open to whoever can
// reach the server. That is survivable on localhost and unacceptable on a public
// URL.
//
// Set PUBLIC_DEMO=true when exposing the site through a tunnel. Shoppers can
// still browse and place orders; catalogue and order-management writes are
// refused. This is a stopgap, NOT the authentication the blueprint requires.
// ==========================================================

// Write routes that must never be open to the public.
const PROTECTED = [
  { method: /^(POST|PUT|PATCH|DELETE)$/, path: /^\/api\/products/ },
  { method: /^(POST|PUT|PATCH|DELETE)$/, path: /^\/api\/categories/ },
  { method: /^(POST|PUT|PATCH|DELETE)$/, path: /^\/api\/settings/ },
  { method: /^(POST|PUT|PATCH|DELETE)$/, path: /^\/api\/ledger/ },
  { method: /^(POST|PUT|PATCH|DELETE)$/, path: /^\/api\/uploads/ },
  // Order placement is allowed; changing an existing order's status is not.
  { method: /^(PATCH|PUT|DELETE)$/, path: /^\/api\/orders\/[^/]+/ }
];

// A request is "local" when it comes straight from this machine with no proxy
// headers. Tunnels (cloudflared, ngrok) connect from localhost too, but they
// always add X-Forwarded-For / CF-Connecting-IP, so their traffic counts as
// remote. Local admin keeps working while the public link is read-only.
function isLocalRequest(req) {
  const ip = String(req.ip || req.socket.remoteAddress || '');
  const loopback = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.headers['x-real-ip'];
  return loopback && !forwarded;
}

function publicDemoGuard(req, res, next) {
  if (String(process.env.PUBLIC_DEMO).toLowerCase() !== 'true') {
    return next();
  }
  if (isLocalRequest(req)) {
    return next();
  }

  const blocked = PROTECTED.some(rule =>
    rule.method.test(req.method) && rule.path.test(req.path)
  );

  if (blocked) {
    console.warn(`[PublicDemo] Blocked ${req.method} ${req.path} from ${req.ip}`);
    return res.status(403).json({
      success: false,
      message: 'This is a shared preview link — catalogue, settings and account changes are disabled here. Shopping and ordering work normally.'
    });
  }

  return next();
}

module.exports = publicDemoGuard;
