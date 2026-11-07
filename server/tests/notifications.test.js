import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import db, { initDatabase } from '../src/config/db.js';
import notificationService from '../src/services/notificationService.js';

let testUserId;

test.before(async () => {
  await initDatabase();

  testUserId = crypto.randomUUID();
  await db.query(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)`,
    [testUserId, `notif.${Date.now()}@pipelineone.test`, 'hash', 'Notification Tester']
  );
});

test('Notifications Service - Creates and retrieves notifications with unread counts', async () => {
  // Create 2 notifications
  const notif1 = await notificationService.createNotification(testUserId, {
    type: notificationService.NOTIFICATION_TYPES.PIPELINE_STARTED,
    title: 'Pipeline Started',
    message: 'Pipeline execution started for main branch.',
  });

  const notif2 = await notificationService.createNotification(testUserId, {
    type: notificationService.NOTIFICATION_TYPES.VERCEL_READY,
    title: 'Deployment Live',
    message: 'Site is live at https://app.vercel.app',
  });

  assert.ok(notif1?.id);
  assert.ok(notif2?.id);

  // Retrieve
  const list = await notificationService.getUserNotifications(testUserId);
  assert.ok(list.total >= 2);
  assert.ok(list.unreadCount >= 2);

  const unreadOnly = await notificationService.getUserNotifications(testUserId, { unreadOnly: true });
  assert.ok(unreadOnly.notifications.length >= 2);
});

test('Notifications Service - Marks individual and all notifications as read', async () => {
  const notif = await notificationService.createNotification(testUserId, {
    type: notificationService.NOTIFICATION_TYPES.BUILD_SUCCESS,
    title: 'Build OK',
    message: 'Build finished.',
  });

  // Mark single as read
  const updated = await notificationService.markNotificationAsRead(testUserId, notif.id);
  assert.ok(updated);
  assert.equal(updated.is_read, true);

  // Mark all as read
  const markAllResult = await notificationService.markAllAsRead(testUserId);
  assert.ok(typeof markAllResult.updatedCount === 'number');

  const finalUnread = await notificationService.getUnreadCount(testUserId);
  assert.equal(finalUnread, 0);
});
