import { initDatabase } from '../config/db.js';
import logger from '../utils/logger.js';

const runMigrations = async () => {
  logger.info('Running database migrations manually...');
  const result = await initDatabase();
  if (result.success) {
    logger.info('Database migrations applied successfully.');
    process.exit(0);
  } else {
    logger.warn(`Migration completed in mode: ${result.mode}`);
    process.exit(0);
  }
};

runMigrations();
