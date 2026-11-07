import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

let isMongoConnected = false;
let mongoError = null;

export const initMongo = async () => {
  if (!env.MONGODB_URI) {
    logger.info('MongoDB Atlas URI not configured. Secondary document store disabled.');
    return { configured: false, status: 'not_configured' };
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000,
    });

    isMongoConnected = true;
    mongoError = null;
    logger.info('Connected to MongoDB Atlas successfully.');
    return { configured: true, status: 'connected' };
  } catch (err) {
    isMongoConnected = false;
    mongoError = err.message;
    logger.warn(`MongoDB Atlas connection failed: ${err.message}`);
    return { configured: true, status: 'connection_failed', error: err.message };
  }
};

export const getMongoStatus = () => {
  const state = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    configured: Boolean(env.MONGODB_URI),
    status: env.MONGODB_URI ? stateMap[state] || 'disconnected' : 'not_configured',
    isConnected: state === 1,
    error: mongoError,
  };
};

export default {
  initMongo,
  getMongoStatus,
};

