// Password hashing with Node's built-in scrypt (no dependency).
// Stored form: scrypt$<N>$<salt hex>$<hash hex>
const crypto = require('crypto');
const N = 16384, KEYLEN = 64;

function hash(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(password), salt, KEYLEN, { N });
  return `scrypt$${N}$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verify(password, stored) {
  try {
    const [algo, n, saltHex, keyHex] = String(stored || '').split('$');
    if (algo !== 'scrypt') return false;
    const key = crypto.scryptSync(String(password), Buffer.from(saltHex, 'hex'), KEYLEN, { N: Number(n) });
    const expected = Buffer.from(keyHex, 'hex');
    return key.length === expected.length && crypto.timingSafeEqual(key, expected);
  } catch (e) { return false; }
}

function validate(password) {
  const p = String(password || '');
  if (p.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'Password must contain letters and numbers.';
  return null;
}

module.exports = { hash, verify, validate };
