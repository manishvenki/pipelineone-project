import db from '../config/db.js';
import { hashPassword, comparePassword, signToken } from '../utils/security.js';
import { logActivity } from './activityService.js';
import logger from '../utils/logger.js';

/**
 * Register a new user
 */
export const registerUser = async ({ email, password, name }) => {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingRes = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingRes.rows.length > 0) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(password);

  // Insert user
  const insertUserSql = `
    INSERT INTO users (email, password_hash, name, avatar_url)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, name, avatar_url, created_at
  `;
  const userRes = await db.query(insertUserSql, [normalizedEmail, hashedPassword, name.trim(), null]);
  const user = userRes.rows[0];

  // Create default user settings
  await db.query(
    `INSERT INTO user_settings (user_id, theme, notifications_enabled, auto_deploy_enabled)
     VALUES ($1, $2, $3, $4)`,
    [user.id, 'dark', true, false]
  );

  // Log activity
  await logActivity(user.id, 'USER_REGISTERED', `User registered account with email ${user.email}`);

  const token = signToken({ id: user.id, email: user.email });

  return { user, token };
};

/**
 * Authenticate user login
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.toLowerCase().trim();

  const userRes = await db.query(
    'SELECT id, email, password_hash, name, avatar_url, created_at FROM users WHERE email = $1',
    [normalizedEmail]
  );

  if (userRes.rows.length === 0) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const user = userRes.rows[0];
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Sanitize user object
  delete user.password_hash;

  // Log activity
  await logActivity(user.id, 'USER_LOGIN', `User signed into Pipeline One`);

  const token = signToken({ id: user.id, email: user.email });

  return { user, token };
};

/**
 * Get user by ID including settings and integration statuses
 */
export const getUserById = async (userId) => {
  const userRes = await db.query(
    'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (userRes.rows.length === 0) {
    return null;
  }

  const user = userRes.rows[0];

  // Fetch settings
  const settingsRes = await db.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  user.settings = settingsRes.rows[0] || {
    theme: 'dark',
    notifications_enabled: true,
    auto_deploy_enabled: false,
  };

  // Fetch connected integrations (mask tokens for security)
  const integrationsRes = await db.query(
    'SELECT provider, provider_username, connected_at FROM connected_integrations WHERE user_id = $1',
    [userId]
  );

  user.integrations = {
    github: { connected: false },
    dockerhub: { connected: false },
    jenkins: { connected: false },
    vercel: { connected: false },
  };

  for (const row of integrationsRes.rows) {
    if (user.integrations[row.provider]) {
      user.integrations[row.provider] = {
        connected: true,
        username: row.provider_username,
        connectedAt: row.connected_at,
      };
    }
  }

  return user;
};

/**
 * Update user settings
 */
export const updateUserSettings = async (userId, newSettings) => {
  const current = await db.query('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
  const s = current.rows[0] || {};

  const theme = newSettings.theme !== undefined ? newSettings.theme : s.theme || 'dark';
  const notifications = newSettings.notifications_enabled !== undefined ? newSettings.notifications_enabled : s.notifications_enabled ?? true;
  const autoDeploy = newSettings.auto_deploy_enabled !== undefined ? newSettings.auto_deploy_enabled : s.auto_deploy_enabled ?? false;

  const updateSql = `
    UPDATE user_settings
    SET theme = $1, notifications_enabled = $2, auto_deploy_enabled = $3, updated_at = NOW()
    WHERE user_id = $4
    RETURNING *
  `;
  const result = await db.query(updateSql, [theme, notifications, autoDeploy, userId]);
  await logActivity(userId, 'SETTINGS_UPDATED', 'User settings updated');
  return result.rows[0];
};

export default {
  registerUser,
  loginUser,
  getUserById,
  updateUserSettings,
};
