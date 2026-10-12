// One-step setup: default settings + the Super Admin from SEED_SUPER_ADMIN_* (or --email/--password).
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Settings = require('../models/Settings');
const { upsertSuperAdmin } = require('../services/adminSeedService');

const arg = (name) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : process.env[`npm_config_${name}`];
};

async function main() {
  await connectDB(env.mongoUri);
  const settings = await Settings.getSingleton();
  console.log(`✔ Settings ready: "${settings.agencyName}", fee KES ${settings.applicationFee}`);

  const email = arg('email') || process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = arg('password') || process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('ℹ No admin seeded: set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in backend/.env, or run npm run create-admin');
    return;
  }
  const { action, user } = await upsertSuperAdmin({ email, password, name: arg('name') || process.env.SEED_SUPER_ADMIN_NAME });
  console.log(`✔ Super Admin ${user.email} ${action === 'created' ? 'created' : 'updated (password reset)'}`);
}

main()
  .catch((err) => {
    console.error(`✖ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
