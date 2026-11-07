import fs from 'fs';
import path from 'path';
import db, { initDatabase } from '../config/db.js';
import logger from '../utils/logger.js';

// Table topological order for safe restoration without FK violations
export const TABLE_TOPOLOGY = [
  'users',
  'connected_integrations',
  'user_settings',
  'projects',
  'project_repositories',
  'docker_builds',
  'docker_images',
  'pipeline_configurations',
  'activity_records',
  'integration_verification_events',
  'platform_connection_metadata',
  'pipeline_executions',
  'pipeline_events',
  'pipeline_stage_events',
  'github_webhook_events',
  'notifications',
];

/**
 * Creates a JSON snapshot backup of all relational tables in PostgreSQL
 */
export const backupDatabase = async (customPath = null) => {
  await initDatabase();
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = customPath || path.join(backupDir, `pipelineone-backup-${timestamp}.json`);

  const dump = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    tables: {},
  };

  for (const table of TABLE_TOPOLOGY) {
    try {
      const res = await db.query(`SELECT * FROM ${table}`);
      dump.tables[table] = res.rows;
      logger.info(`Backed up table ${table}: ${res.rows.length} rows`);
    } catch (err) {
      logger.warn(`Could not backup table ${table} (may not exist yet): ${err.message}`);
      dump.tables[table] = [];
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(dump, null, 2), 'utf8');
  logger.info(`Database backup completed successfully -> ${filePath}`);
  return { filePath, tableCount: Object.keys(dump.tables).length };
};

/**
 * Restores all relational tables from a snapshot JSON file
 */
export const restoreDatabase = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file not found at: ${filePath}`);
  }

  await initDatabase();
  const raw = fs.readFileSync(filePath, 'utf8');
  const dump = JSON.parse(raw);

  logger.info(`Starting database restore from snapshot (${dump.createdAt})...`);

  // Reverse table topology for safe truncation
  const reverseOrder = [...TABLE_TOPOLOGY].reverse();
  for (const table of reverseOrder) {
    try {
      await db.query(`TRUNCATE TABLE ${table} CASCADE`);
      logger.info(`Truncated table ${table}`);
    } catch (err) {
      // Table might not exist or ignore
    }
  }

  // Insert in topological forward order
  for (const table of TABLE_TOPOLOGY) {
    const rows = dump.tables[table] || [];
    if (rows.length === 0) continue;

    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = Object.values(row);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');

      const query = `INSERT INTO ${table} (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      await db.query(query, vals);
    }
    logger.info(`Restored ${rows.length} rows to table ${table}`);
  }

  logger.info('Database restored successfully.');
  return { success: true };
};

// CLI invocation handling
if (process.argv[1] && process.argv[1].endsWith('backupRestore.js')) {
  const mode = process.argv[2] || 'backup';
  const targetFile = process.argv[3];

  if (mode === 'backup') {
    backupDatabase(targetFile)
      .then((res) => {
        console.log('Backup finished:', res);
        process.exit(0);
      })
      .catch((err) => {
        console.error('Backup failed:', err);
        process.exit(1);
      });
  } else if (mode === 'restore') {
    if (!targetFile) {
      console.error('Usage: node backupRestore.js restore <path_to_backup_file.json>');
      process.exit(1);
    }
    restoreDatabase(targetFile)
      .then(() => {
        console.log('Restore finished successfully.');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Restore failed:', err);
        process.exit(1);
      });
  } else {
    console.log('Usage: node backupRestore.js [backup|restore] [path]');
    process.exit(0);
  }
}

export default {
  TABLE_TOPOLOGY,
  backupDatabase,
  restoreDatabase,
};
