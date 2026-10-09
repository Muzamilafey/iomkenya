/**
 * Creates (or promotes) a SUPER_ADMIN.
 * Usage: npm run create-admin -- --email=a@b.com --password=Secret123 --name="Jane Admin"
 * Falls back to SEED_SUPER_ADMIN_* env vars.
 */
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const AdminUser = require('../models/AdminUser');

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

async function main() {
  const email = (arg('email') || process.env.SEED_SUPER_ADMIN_EMAIL || '').toLowerCase().trim();
  const password = arg('password') || process.env.SEED_SUPER_ADMIN_PASSWORD;
  const name = arg('name') || process.env.SEED_SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error('Provide a valid --email');

  await connectDB(env.mongoUri);
  let user = await AdminUser.findOne({ email });
  if (user) {
    user.role = 'SUPER_ADMIN';
    user.isActive = true;
    if (arg('name')) user.name = name;
    if (password) {
      if (password.length < 8) throw new Error('Password must be at least 8 characters');
      await user.setPassword(password);
    }
    await user.save();
    console.log(`Promoted existing account ${email} to SUPER_ADMIN${password ? ' and reset password' : ''}.`);
  } else {
    if (!password || password.length < 8) throw new Error('Provide --password (min 8 characters)');
    user = new AdminUser({ name, email, role: 'SUPER_ADMIN', isActive: true });
    await user.setPassword(password);
    await user.save();
    console.log(`Created SUPER_ADMIN ${email}.`);
  }
}

main()
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
