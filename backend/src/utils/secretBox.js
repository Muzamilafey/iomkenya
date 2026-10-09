const crypto = require('crypto');
const env = require('../config/env');

// AES-256-GCM for secrets stored in the database (e.g. SMTP password).
// The key is derived from JWT_SECRET, so rotating JWT_SECRET means
// re-entering stored secrets in Admin → Settings.
const key = () => crypto.createHash('sha256').update(`${env.jwt.secret}:settings-secrets:v1`).digest();

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join(':');
}

/** Returns the plaintext, or null if the value can't be decrypted. */
function decrypt(payload) {
  try {
    const [v, iv, tag, data] = String(payload || '').split(':');
    if (v !== 'v1') return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

module.exports = { encrypt, decrypt };
