import api from './api';

export const getNotifications = async (limit = 20, offset = 0) => {
  const res = await api.get('/api/notifications', { params: { limit, offset } });
  return res.data;
};

export const getUnreadCount = async () => {
  const res = await api.get('/api/notifications/unread-count');
  return res.data;
};

export const markAsRead = async (notificationId) => {
  const res = await api.patch(`/api/notifications/${notificationId}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await api.patch('/api/notifications/read-all');
  return res.data;
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
