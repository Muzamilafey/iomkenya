/**
 * Creates (or promotes) a SUPER_ADMIN and/or resets their password.
 *
 *   npm run create-admin -- --email=a@b.com --password=Secret123 --name="Jane Admin"
 *   npm run create-admin                      (prompts for anything missing)
 *
 * Also works when the `--` separator is dropped (Windows PowerShell), and falls
 * back to the SEED_SUPER_ADMIN_* variables in backend/.env.
 */
const readline = require('readline');
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const { upsertSuperAdmin } = require('../services/adminSeedService');

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  // Without `--`, npm turns --email=… into npm_config_email.
  return process.env[`npm_config_${name}`] || undefined;
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else if (!/\r|\n/.test(s)) rl.output.write('*');
        else rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  let email = arg('email') || process.env.SEED_SUPER_ADMIN_EMAIL;
  let password = arg('password') || process.env.SEED_SUPER_ADMIN_PASSWORD;
  const name = arg('name') || process.env.SEED_SUPER_ADMIN_NAME;

  const interactive = process.stdin.isTTY;
  if (!email && interactive) email = await ask('Admin email: ');
  if (!email) {
    throw new Error(
      'No email given. Use: npm run create-admin -- --email=you@example.com --password=YourPass123\n' +
        '  or set SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD in backend/.env'
    );
  }

  await connectDB(env.mongoUri);

  if (!password && interactive) {
    password = await ask('Password (min 8 characters, leave blank to keep the current one): ', { hidden: true });
  }

  const { action, user } = await upsertSuperAdmin({ email, password, name });
  if (action === 'created') {
    console.log(`\n✔ Created Super Admin ${user.email}`);
  } else {
    console.log(`\n✔ ${user.email} is now an active Super Admin${password ? ' and the password was reset' : ''}`);
  }
  console.log(`  Log in at ${env.clientUrl.split(',')[0].trim().replace(/\/$/, '')}/admin/login`);
}

main()
  .catch((err) => {
    console.error(`\n✖ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
