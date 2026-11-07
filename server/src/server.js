import app from './app.js';
import env from './config/env.js';
import { initDatabase } from './config/db.js';
import { initMongo } from './config/mongo.js';
import logger from './utils/logger.js';

const startServer = async () => {
  try {
    logger.info('==========================================');
    logger.info('   Starting Pipeline One DevOps Engine    ');
    logger.info('==========================================');

    // 1. Initialize Relational Database (PostgreSQL / Resilient store)
    await initDatabase();

    // 2. Initialize Secondary Document Store (MongoDB Atlas if configured)
    await initMongo();

    // 3. Start listening
    const server = app.listen(env.PORT, () => {
      logger.info(`Server successfully listening on port ${env.PORT} (${env.NODE_ENV})`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
    });

    // Graceful Shutdown
    const handleShutdown = (signal) => {
      logger.info(`Received ${signal}. Gracefully terminating server...`);
      server.close(() => {
        logger.info('HTTP server closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (err) {
    logger.error('Fatal server startup failure:', { error: err.message, stack: err.stack });
    process.exit(1);
  }
};

startServer();
