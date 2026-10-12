const AdminUser = require('../models/AdminUser');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Creates a SUPER_ADMIN, or promotes/reactivates an existing account with the
 * same email. The password is only (re)set when one is given.
 * Returns { action: 'created' | 'updated', user }.
 */
async function upsertSuperAdmin({ email, password, name }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) throw new Error(`"${email || ''}" is not a valid email address`);
  if (password !== undefined && password !== null && password !== '' && String(password).length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  let user = await AdminUser.findOne({ email: cleanEmail });
  if (user) {
    user.role = 'SUPER_ADMIN';
    user.isActive = true;
    if (name) user.name = name;
    if (password) await user.setPassword(String(password));
    await user.save();
    return { action: 'updated', user };
  }

  if (!password) throw new Error('A password is required to create a new admin');
  user = new AdminUser({ name: name || 'Super Admin', email: cleanEmail, role: 'SUPER_ADMIN', isActive: true });
  await user.setPassword(String(password));
  await user.save();
  return { action: 'created', user };
}

/**
 * On server start: if there is no active Super Admin yet and
 * SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD are set, create one.
 * Never changes an existing account, so it is safe to leave the vars set.
 */
async function seedSuperAdminFromEnv() {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) return null;

  const existing = await AdminUser.countDocuments({ role: 'SUPER_ADMIN', isActive: true });
  if (existing > 0) return null;

  const { action, user } = await upsertSuperAdmin({
    email,
    password,
    name: process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin',
  });
  console.log(`[seed] ${action === 'created' ? 'Created' : 'Activated'} Super Admin ${user.email} from SEED_SUPER_ADMIN_* env vars`);
  return { action, user };
}

module.exports = { upsertSuperAdmin, seedSuperAdminFromEnv };
