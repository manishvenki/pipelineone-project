import db from '../config/db.js';
import logger from '../utils/logger.js';

export const logActivity = async (userId, eventType, description, metadata = {}, projectId = null) => {
  try {
    const text = `
      INSERT INTO activity_records (user_id, project_id, event_type, description, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const params = [userId, projectId, eventType, description, JSON.stringify(metadata)];
    const result = await db.query(text, params);
    return result.rows[0];
  } catch (err) {
    logger.error('Failed to log activity record:', { error: err.message, eventType, userId });
    return null;
  }
};

export const getUserActivity = async (userId, limit = 20) => {
  try {
    const text = `
      SELECT * FROM activity_records
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await db.query(text, [userId, limit]);
    return result.rows;
  } catch (err) {
    logger.error('Failed to fetch user activity:', { error: err.message, userId });
    return [];
  }
};

export default {
  logActivity,
  getUserActivity,
};

