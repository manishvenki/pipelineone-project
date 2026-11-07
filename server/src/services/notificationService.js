import db from '../config/db.js';
import logger from '../utils/logger.js';

export const NOTIFICATION_TYPES = {
  PIPELINE_STARTED: 'pipeline_started',
  BUILD_SUCCESS: 'build_success',
  BUILD_FAILED: 'build_failed',
  DOCKER_PUBLISHED: 'docker_published',
  DOCKER_FAILED: 'docker_failed',
  VERCEL_READY: 'vercel_ready',
  DEPLOYMENT_FAILED: 'deployment_failed',
  PIPELINE_CANCELLED: 'pipeline_cancelled',
  SYSTEM: 'system',
};

/**
 * Create a new user notification
 */
export const createNotification = async (userId, { executionId = null, type, title, message, metadata = {} }) => {
  try {
    const res = await db.query(
      `INSERT INTO notifications (user_id, execution_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, executionId, type, title, message, JSON.stringify(metadata)]
    );
    return res.rows[0];
  } catch (err) {
    logger.error('Failed to create notification', { error: err.message, userId, type });
    return null;
  }
};

/**
 * Get user notifications with pagination and unread filter
 */
export const getUserNotifications = async (userId, { limit = 20, offset = 0, unreadOnly = false } = {}) => {
  let queryText = `SELECT * FROM notifications WHERE user_id = $1`;
  const params = [userId];

  if (unreadOnly) {
    queryText += ` AND is_read = false`;
  }

  queryText += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const [itemsRes, countRes] = await Promise.all([
    db.query(queryText, params),
    db.query(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_read = false) as unread
       FROM notifications WHERE user_id = $1`,
      [userId]
    ),
  ]);

  const total = parseInt(countRes.rows[0]?.total || '0', 10);
  const unreadCount = parseInt(countRes.rows[0]?.unread || '0', 10);

  return {
    notifications: itemsRes.rows,
    total,
    unreadCount,
    limit,
    offset,
  };
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (userId, notificationId) => {
  const res = await db.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return res.rows[0] || null;
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
  const res = await db.query(
    `UPDATE notifications
     SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );
  return { updatedCount: res.rowCount };
};

/**
 * Get unread notifications count
 */
export const getUnreadCount = async (userId) => {
  const res = await db.query(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return parseInt(res.rows[0]?.count || '0', 10);
};

export default {
  NOTIFICATION_TYPES,
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead,
  getUnreadCount,
};

