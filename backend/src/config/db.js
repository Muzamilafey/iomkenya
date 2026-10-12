const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

// Hide credentials when printing the connection string.
const redact = (uri) => String(uri).replace(/\/\/([^@/]+)@/, '//***@');

async function connectDB(uri = env.mongoUri) {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    const hint =
      `Could not connect to MongoDB at ${redact(uri)}.\n` +
      '  • Is MongoDB running? (local: start the "MongoDB" service / `mongod`)\n' +
      '  • Is MONGODB_URI in backend/.env correct? (Atlas: check user/password and Network Access IP allow-list)';
    const wrapped = new Error(`${hint}\n  Original error: ${err.message}`);
    wrapped.cause = err;
    throw wrapped;
  }
  console.log('[db] Connected to MongoDB');
}

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  console.log('[db] Disconnected from MongoDB');
}

module.exports = { connectDB, disconnectDB };
