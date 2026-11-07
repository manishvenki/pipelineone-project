import notificationService from '../services/notificationService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(req.user.id, {
      limit,
      offset,
      unreadOnly,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to get notifications', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
};

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    return res.json({ success: true, unreadCount });
  } catch (err) {
    logger.error('Failed to get unread count', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve unread notification count' });
  }
};

/**
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req, res) => {
  try {
    const updated = await notificationService.markNotificationAsRead(req.user.id, req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json({ success: true, notification: updated });
  } catch (err) {
    logger.error('Failed to mark notification as read', { error: err.message });
    return res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.json({ success: true, ...result });
  } catch (err) {
    logger.error('Failed to mark all notifications as read', { error: err.message });
    return res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

