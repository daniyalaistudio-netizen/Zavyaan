// ==========================================================
// ZAVYAAN CUSTOMER UTILS — VALIDATORS
// ==========================================================

const Validators = {
  // Validate Pakistani Mobile Numbers (0300-1234567, 03001234567, +923001234567)
  validatePakistaniPhone(phone) {
    if (!phone) return false;
    const clean = phone.replace(/[\s\-]/g, '');
    const regex = /^((\+92)|(0092)|(03))\d{9}$/;
    return regex.test(clean);
  },

  // Validate Email
  validateEmail(email) {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
  },

  // Required Field Check
  validateRequired(val) {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return true;
  },

  // Minimum Length
  validateMinLength(val, len) {
    if (!val) return false;
    return String(val).trim().length >= len;
  }
};

window.Validators = Validators;
