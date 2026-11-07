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
    const phase3MigrationPath = path.resolve(process.cwd(), 'src/database/phase3_migration.sql');
    if (fs.existsSync(phase3MigrationPath)) {
      const sql3 = fs.readFileSync(phase3MigrationPath, 'utf8');
      await db.query(sql3);
      logger.info('Phase 3 PostgreSQL migrations applied successfully.');
    }
    const phase4MigrationPath = path.resolve(process.cwd(), 'src/database/phase4_migration.sql');
    if (fs.existsSync(phase4MigrationPath)) {
      const sql4 = fs.readFileSync(phase4MigrationPath, 'utf8');
      await db.query(sql4);
      logger.info('Phase 4 PostgreSQL migrations applied successfully.');
    }
    process.exit(0);
  } else {
    logger.warn(`Migration completed in mode: ${result.mode}`);
    process.exit(0);
  }
};

runMigrations();

