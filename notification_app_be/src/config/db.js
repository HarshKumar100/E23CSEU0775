const mongoose = require('mongoose');
const { logger } = require('@campus-notify/logging-middleware');
const { appConfig } = require('./appConfig');

async function connectDb() {
  if (!appConfig.mongoUri) {
    const err = new Error('MONGODB_URI is missing');
    logger.error('MongoDB configuration missing', { error: err.message });
    throw err;
  }

  logger.info('Connecting to MongoDB');

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection disconnected');
  });

  return mongoose.connect(appConfig.mongoUri, {
    serverSelectionTimeoutMS: 7000,
  });
}

module.exports = { connectDb };
