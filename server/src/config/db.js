import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import env from './env.js';
import logger from '../utils/logger.js';

const { Pool } = pg;

let pgPool = null;
let isPostgresConnected = false;
let connectionError = null;

// Embedded fallback store for environments where PostgreSQL is temporarily stopped or unconfigured
const fallbackStore = {
  users: new Map(),
  connected_integrations: new Map(),
  projects: new Map(),
  project_repositories: new Map(),
  user_settings: new Map(),
  activity_records: new Map(),
};

/**
 * Initialize PostgreSQL Pool
 */
const initPgPool = () => {
  const poolConfig = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.PGHOST,
        port: env.PGPORT,
        user: env.PGUSER,
        password: env.PGPASSWORD,
        database: env.PGDATABASE,
      };

  poolConfig.connectionTimeoutMillis = 3000;
  poolConfig.idleTimeoutMillis = 10000;

  return new Pool(poolConfig);
};

/**
 * Initialize Database and run migrations
 */
export const initDatabase = async () => {
  try {
    pgPool = initPgPool();
    const client = await pgPool.connect();
    
    // Test query
    await client.query('SELECT 1');
    isPostgresConnected = true;
    connectionError = null;
    logger.info('Connected to PostgreSQL successfully');

    // Run schema migrations
    const schemaPath = path.resolve(process.cwd(), 'src/database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      logger.info('PostgreSQL schema migrations applied successfully');
    }
    client.release();
    return { success: true, mode: 'postgresql' };
  } catch (err) {
    isPostgresConnected = false;
    connectionError = err.message;
    logger.warn(`PostgreSQL connection failed (${err.message}). Using embedded resilient store for local execution.`);
    return { success: false, mode: 'embedded_fallback', error: err.message };
  }
};

/**
 * Universal Query Executor
 * Automatically routes to PostgreSQL when available, or to embedded engine if PostgreSQL is offline.
 */
export const query = async (text, params = []) => {
  if (isPostgresConnected && pgPool) {
    try {
      const res = await pgPool.query(text, params);
      return res;
    } catch (err) {
      logger.error('PostgreSQL query execution error:', { error: err.message, query: text });
      throw err;
    }
  }

  // Resilient Embedded Storage Handler
  return executeFallbackQuery(text, params);
};

/**
 * Resilient SQL query parser and executor for the embedded store
 */
const executeFallbackQuery = async (text, params) => {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const lower = normalized.toLowerCase();

  // 1. SELECT queries
  if (lower.startsWith('select')) {
    if (lower.includes('from users')) {
      let users = Array.from(fallbackStore.users.values()).map(u => ({ ...u }));
      if (lower.includes('where id = $1')) {
        users = users.filter((u) => u.id === params[0]);
      } else if (lower.includes('where email = $1')) {
        users = users.filter((u) => u.email.toLowerCase() === (params[0] || '').toLowerCase());
      }
      return { rows: users, rowCount: users.length };
    }

    if (lower.includes('from connected_integrations')) {
      let items = Array.from(fallbackStore.connected_integrations.values());
      if (lower.includes('where user_id = $1 and provider = $2')) {
        items = items.filter((i) => i.user_id === params[0] && i.provider === params[1]);
      } else if (lower.includes('where user_id = $1')) {
        items = items.filter((i) => i.user_id === params[0]);
      }
      return { rows: items, rowCount: items.length };
    }

    if (lower.includes('from projects')) {
      let items = Array.from(fallbackStore.projects.values());
      if (lower.includes('where id = $1 and user_id = $2')) {
        items = items.filter((p) => p.id === params[0] && p.user_id === params[1]);
      } else if (lower.includes('where id = $1')) {
        items = items.filter((p) => p.id === params[0]);
      } else if (lower.includes('where user_id = $1')) {
        items = items.filter((p) => p.user_id === params[0]);
      }
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { rows: items, rowCount: items.length };
    }

    if (lower.includes('from project_repositories')) {
      let items = Array.from(fallbackStore.project_repositories.values());
      if (lower.includes('where project_id = $1')) {
        items = items.filter((r) => r.project_id === params[0]);
      }
      return { rows: items, rowCount: items.length };
    }

    if (lower.includes('from user_settings')) {
      let items = Array.from(fallbackStore.user_settings.values());
      if (lower.includes('where user_id = $1')) {
        items = items.filter((s) => s.user_id === params[0]);
      }
      return { rows: items, rowCount: items.length };
    }

    if (lower.includes('from activity_records')) {
      let items = Array.from(fallbackStore.activity_records.values());
      if (lower.includes('where user_id = $1')) {
        items = items.filter((a) => a.user_id === params[0]);
      }
      items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const limitMatch = lower.match(/limit\s+(\d+)/);
      if (limitMatch) {
        items = items.slice(0, parseInt(limitMatch[1], 10));
      }
      return { rows: items, rowCount: items.length };
    }

    return { rows: [{ '1': 1 }], rowCount: 1 };
  }

  // 2. INSERT queries
  if (lower.startsWith('insert into users')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const user = {
      id,
      email: params[0],
      password_hash: params[1],
      name: params[2],
      avatar_url: params[3] || null,
      created_at: now,
      updated_at: now,
    };
    fallbackStore.users.set(id, user);
    return { rows: [{ ...user }], rowCount: 1 };
  }

  if (lower.startsWith('insert into connected_integrations')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item = {
      id,
      user_id: params[0],
      provider: params[1],
      provider_user_id: params[2],
      provider_username: params[3],
      access_token_enc: params[4],
      refresh_token_enc: params[5],
      scopes: params[6] || [],
      metadata: params[7] || {},
      connected_at: now,
      updated_at: now,
    };
    // Upsert behavior
    for (const [key, existing] of fallbackStore.connected_integrations.entries()) {
      if (existing.user_id === item.user_id && existing.provider === item.provider) {
        fallbackStore.connected_integrations.delete(key);
      }
    }
    fallbackStore.connected_integrations.set(id, item);
    return { rows: [item], rowCount: 1 };
  }

  if (lower.startsWith('insert into projects')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const project = {
      id,
      user_id: params[0],
      name: params[1],
      slug: params[2],
      description: params[3] || '',
      source_type: params[4],
      project_type: params[5],
      framework: params[6] || null,
      build_command: params[7] || null,
      output_directory: params[8] || 'dist',
      storage_path: params[9] || null,
      status: params[10] || 'ready',
      metadata: params[11] || {},
      created_at: now,
      updated_at: now,
    };
    fallbackStore.projects.set(id, project);
    return { rows: [project], rowCount: 1 };
  }

  if (lower.startsWith('insert into project_repositories')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const repo = {
      id,
      project_id: params[0],
      repo_id: params[1],
      owner: params[2],
      name: params[3],
      full_name: params[4],
      default_branch: params[5] || 'main',
      selected_branch: params[6] || 'main',
      clone_url: params[7] || null,
      is_private: params[8] || false,
      last_commit_sha: params[9] || null,
      last_commit_message: params[10] || null,
      created_at: now,
      updated_at: now,
    };
    fallbackStore.project_repositories.set(id, repo);
    return { rows: [repo], rowCount: 1 };
  }

  if (lower.startsWith('insert into user_settings')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const settings = {
      id,
      user_id: params[0],
      theme: params[1] || 'dark',
      notifications_enabled: params[2] !== undefined ? params[2] : true,
      auto_deploy_enabled: params[3] !== undefined ? params[3] : false,
      created_at: now,
      updated_at: now,
    };
    fallbackStore.user_settings.set(id, settings);
    return { rows: [settings], rowCount: 1 };
  }

  if (lower.startsWith('insert into activity_records')) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record = {
      id,
      user_id: params[0],
      project_id: params[1] || null,
      event_type: params[2],
      description: params[3],
      metadata: params[4] || {},
      created_at: now,
    };
    fallbackStore.activity_records.set(id, record);
    return { rows: [record], rowCount: 1 };
  }

  // 3. DELETE queries
  if (lower.startsWith('delete from connected_integrations')) {
    let deleted = 0;
    for (const [id, item] of fallbackStore.connected_integrations.entries()) {
      if (item.user_id === params[0] && item.provider === params[1]) {
        fallbackStore.connected_integrations.delete(id);
        deleted++;
      }
    }
    return { rowCount: deleted };
  }

  if (lower.startsWith('delete from projects')) {
    let deleted = 0;
    for (const [id, item] of fallbackStore.projects.entries()) {
      if (item.id === params[0] && item.user_id === params[1]) {
        fallbackStore.projects.delete(id);
        // Also cascade delete repo
        for (const [rId, repo] of fallbackStore.project_repositories.entries()) {
          if (repo.project_id === id) fallbackStore.project_repositories.delete(rId);
        }
        deleted++;
      }
    }
    return { rowCount: deleted };
  }

  // 4. UPDATE queries
  if (lower.startsWith('update user_settings')) {
    let updated = null;
    for (const [id, s] of fallbackStore.user_settings.entries()) {
      if (s.user_id === params[3]) {
        s.theme = params[0] !== undefined ? params[0] : s.theme;
        s.notifications_enabled = params[1] !== undefined ? params[1] : s.notifications_enabled;
        s.auto_deploy_enabled = params[2] !== undefined ? params[2] : s.auto_deploy_enabled;
        s.updated_at = new Date().toISOString();
        updated = s;
      }
    }
    return { rows: updated ? [updated] : [], rowCount: updated ? 1 : 0 };
  }

  return { rows: [], rowCount: 0 };
};

/**
 * Get database connectivity status
 */
export const getDatabaseStatus = () => {
  return {
    engine: 'postgresql',
    status: isPostgresConnected ? 'connected' : 'fallback_mode',
    isPostgresConnected,
    mode: isPostgresConnected ? 'postgresql' : 'embedded_resilient_store',
    error: connectionError,
  };
};

export default {
  initDatabase,
  query,
  getDatabaseStatus,
};
