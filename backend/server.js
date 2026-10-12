const env = require('./src/config/env');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const { seedSuperAdminFromEnv } = require('./src/services/adminSeedService');

async function start() {
  await connectDB();
  await seedSuperAdminFromEnv().catch((err) => console.error(`[seed] Could not seed Super Admin: ${err.message}`));
  const server = app.listen(env.port, () => {
    console.log(`[server] API listening on port ${env.port} (${env.nodeEnv})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
  });
}

start().catch((err) => {
  console.error(`[server] Failed to start: ${err.message}`);
  process.exit(1);
});
