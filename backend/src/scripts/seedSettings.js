// Ensures the GLOBAL_SETTINGS document exists with defaults. Safe to run repeatedly.
const env = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Settings = require('../models/Settings');

connectDB(env.mongoUri)
  .then(() => Settings.getSingleton())
  .then((s) => console.log(`Settings ready: "${s.agencyName}", fee KES ${s.applicationFee}, prefix ${s.applicationNumberPrefix}`))
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB().catch(() => {}));
