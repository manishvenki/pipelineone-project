import fs from 'fs';
import path from 'path';
import db, { initDatabase } from '../config/db.js';
import logger from '../utils/logger.js';

const runMigrations = async () => {
  logger.info('Running database migrations manually...');
  const result = await initDatabase();
  if (result.success && result.mode === 'postgresql') {
    const migrationPath = path.resolve(process.cwd(), 'src/database/phase2_migration.sql');
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await db.query(sql);
      logger.info('Phase 2 PostgreSQL migrations applied successfully.');
    }
    process.exit(0);
  } else {
    logger.warn(`Migration completed in mode: ${result.mode}`);
    process.exit(0);
  }
};

runMigrations();

