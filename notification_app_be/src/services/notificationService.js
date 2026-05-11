const axios = require('axios');
const mongoose = require('mongoose');
const { logger } = require('@campus-notify/logging-middleware');
const Notification = require('../models/Notification');
const { attachScore } = require('./priorityInbox');
const { emitToStudent } = require('../config/socket');
const { appConfig } = require('../config/appConfig');

const VALID_TYPES = new Set(['Event', 'Result', 'Placement']);

function normalizeExternalNotification(raw, studentId) {
  const notificationId = String(raw.notificationId || raw.id || raw.ID || raw.NotificationId || raw._id);
  const type = raw.type || raw.Type || raw.notificationType || raw.NotificationType;
  const message = raw.message || raw.Message || raw.title || 'Campus notification update';
  const timestamp = raw.timestamp || raw.Timestamp || raw.createdAt || new Date().toISOString();

  return {
    notificationId,
    type: VALID_TYPES.has(type) ? type : 'Event',
    message,
    timestamp: new Date(timestamp),
    studentId,
  };
}

function publicShape(doc) {
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: String(plain._id),
    notificationId: plain.notificationId,
    type: plain.type,
    message: plain.message,
    timestamp: plain.timestamp,
    isRead: plain.isRead,
    score: plain.score,
  };
}

function getStudentId(req) {
  return req.header('x-student-id') || appConfig.defaultStudentId;
}

async function fetchExternalNotifications() {
  if (!appConfig.externalNotificationApiUrl) {
    const err = new Error('EXTERNAL_NOTIF_API_URL is missing');
    logger.error('External notification API missing', { error: err.message });
    throw err;
  }

  logger.info('Calling external notification API', { url: appConfig.externalNotificationApiUrl });
  const response = await axios.get(appConfig.externalNotificationApiUrl);
  const notifications = response.data.notifications || [];
  logger.info('External notification API returned', { count: notifications.length });
  return notifications;
}

async function syncExternalNotifications(studentId, io) {
  const externalNotifications = await fetchExternalNotifications();
  let inserted = 0;
  let updated = 0;

  for (const rawNotif of externalNotifications) {
    const normalized = normalizeExternalNotification(rawNotif, studentId);
    if (!normalized.notificationId || !normalized.timestamp) {
      logger.warn('Skipping malformed external notification', { rawNotif });
      continue;
    }

    logger.info('Checking notification dedup state', {
      notificationId: normalized.notificationId,
      studentId,
    });

    const existing = await Notification.findOne({
      notificationId: normalized.notificationId,
      studentId,
    }).lean();

    if (existing) {
      logger.info('Updating notification from external API', {
        notificationId: normalized.notificationId,
        studentId,
      });

      await Notification.findOneAndUpdate(
        { notificationId: normalized.notificationId, studentId },
        { $set: { ...normalized, isRead: existing.isRead } },
        { new: true }
      );
      updated += 1;
      continue;
    }

    logger.info('Inserting notification from external API', {
      notificationId: normalized.notificationId,
      studentId,
    });

    const created = await Notification.create(normalized);
    inserted += 1;
    emitToStudent(io, studentId, 'notification:new', publicShape(created));
  }

  logger.info('External notifications sync completed', { studentId, inserted, updated });
  return { inserted, updated };
}

async function fetchAndSync({ studentId, page = 1, limit = 20, notificationType, io }) {
  await syncExternalNotifications(studentId, io).catch((err) => {
    logger.error('External sync failed; falling back to stored notifications', {
      studentId,
      error: err.message,
    });
  });

  const cleanPage = Math.max(Number(page) || 1, 1);
  const cleanLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const query = { studentId };

  if (notificationType) query.type = notificationType;

  logger.info('Querying paginated notifications', {
    query,
    page: cleanPage,
    limit: cleanLimit,
  });

  const [studentNotifications, total] = await Promise.all([
    Notification.find(query)
      .sort({ timestamp: -1 })
      .skip((cleanPage - 1) * cleanLimit)
      .limit(cleanLimit)
      .select('notificationId type message timestamp isRead')
      .lean(),
    Notification.countDocuments(query),
  ]);

  logger.info('Paginated notifications loaded', { total, returned: studentNotifications.length });

  return {
    notifications: studentNotifications.map(publicShape),
    pagination: {
      page: cleanPage,
      limit: cleanLimit,
      total,
      totalPages: Math.ceil(total / cleanLimit),
    },
  };
}

async function fetchOne(studentId, id) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { studentId, $or: [{ _id: id }, { notificationId: id }] }
    : { studentId, notificationId: id };

  logger.info('Querying single notification', { studentId, id });
  const notification = await Notification.findOne(query)
    .select('notificationId type message timestamp isRead')
    .lean();

  return notification ? publicShape(notification) : null;
}

async function markAsRead(studentId, id, io) {
  const query = mongoose.Types.ObjectId.isValid(id)
    ? { studentId, $or: [{ _id: id }, { notificationId: id }] }
    : { studentId, notificationId: id };

  logger.info('Marking notification as read', { studentId, id });
  const notification = await Notification.findOneAndUpdate(
    query,
    { $set: { isRead: true } },
    { new: true }
  ).select('notificationId type message timestamp isRead');

  if (notification) {
    emitToStudent(io, studentId, 'notification:read', { id, notificationId: notification.notificationId });
  }

  return notification ? publicShape(notification) : null;
}

async function markAllAsRead(studentId, io) {
  logger.info('Marking all notifications as read', { studentId });
  const result = await Notification.updateMany(
    { studentId, isRead: false },
    { $set: { isRead: true } }
  );

  emitToStudent(io, studentId, 'notification:readAll', { modifiedCount: result.modifiedCount });
  logger.info('Marked all notifications as read', { studentId, modifiedCount: result.modifiedCount });
  return { modifiedCount: result.modifiedCount };
}

async function fetchUnreadCount(studentId) {
  logger.info('Counting unread notifications', { studentId });
  const count = await Notification.countDocuments({ studentId, isRead: false });
  logger.info('Unread count loaded', { studentId, count });
  return { count };
}

async function fetchPriorityInbox({ studentId, n = 10, notificationType, io }) {
  await syncExternalNotifications(studentId, io).catch((err) => {
    logger.error('Priority inbox sync failed; using stored data', {
      studentId,
      error: err.message,
    });
  });

  const topN = Math.min(Math.max(Number(n) || 10, 1), 50);
  const query = { studentId, isRead: false };
  if (notificationType) query.type = notificationType;

  logger.info('Querying unread notifications for priority inbox', { query, topN });
  const unread = await Notification.find(query)
    .sort({ timestamp: -1 })
    .limit(500)
    .select('notificationId type message timestamp isRead')
    .lean();

  // TODO: swap this for a Redis-backed min-heap if the unread candidate set gets large.
  const priorityInbox = unread
    .map(attachScore)
    .sort((a, b) => b.score - a.score || new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, topN)
    .map(publicShape);

  logger.info('Priority inbox loaded from database', {
    studentId,
    returned: priorityInbox.length,
  });

  return { notifications: priorityInbox };
}

module.exports = {
  VALID_TYPES,
  fetchAndSync,
  fetchOne,
  fetchPriorityInbox,
  fetchUnreadCount,
  getStudentId,
  markAllAsRead,
  markAsRead,
  syncExternalNotifications,
};
