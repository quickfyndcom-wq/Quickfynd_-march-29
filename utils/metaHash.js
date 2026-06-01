// utils/metaHash.js
const crypto = require('crypto');

function normalizeAndHashEmail(email) {
  if (!email) return null;
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

function normalizeAndHashPhone(phone, countryCode = '91') {
  if (!phone) return null;
  // Remove all non-digits, add country code if missing
  let normalized = phone.replace(/\D/g, '');
  if (!normalized.startsWith(countryCode)) {
    normalized = countryCode + normalized;
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function normalizeAndHash(str) {
  if (!str) return null;
  return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
}

function normalizeAndHashDOB(dob) {
  // Accepts YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.
  if (!dob) return null;
  let ymd = dob.replace(/\D/g, '');
  if (ymd.length === 8) return crypto.createHash('sha256').update(ymd).digest('hex');
  return null;
}

module.exports = {
  normalizeAndHashEmail,
  normalizeAndHashPhone,
  normalizeAndHash,
  normalizeAndHashDOB
};
