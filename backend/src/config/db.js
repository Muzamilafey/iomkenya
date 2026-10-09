const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDB(uri = env.mongoUri) {
  await mongoose.connect(uri);
  console.log('[db] Connected to MongoDB');
}

async function disconnectDB() {
  await mongoose.connection.close();
  console.log('[db] Disconnected from MongoDB');
}

module.exports = { connectDB, disconnectDB };
