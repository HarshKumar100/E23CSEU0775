const { logger } = require('@campus-notify/logging-middleware');
const notifService = require('../services/notificationService');
const { ok, fail } = require('../utils/apiResponse');

function validateType(notificationType) {
  return !notificationType || notifService.VALID_TYPES.has(notificationType);
}

async function listNotifications(req, res, next) {
  const studentId = notifService.getStudentId(req);
  const { page = 1, limit = 20, notification_type } = req.query;

  logger.info('listNotifications called', { studentId, page, limit, notification_type });

  if (!validateType(notification_type)) {
    logger.warn('Invalid notification type requested', { notification_type });
    return res.status(400).json(fail('Invalid notification type'));
  }

  try {
    const result = await notifService.fetchAndSync({
      studentId,
      page,
      limit,
      notificationType: notification_type,
      io: req.app.get('io'),
    });
    return res.json(ok(result));
  } catch (err) {
    logger.error('listNotifications failed', { error: err.message });
    next(err);
  }
}

async function getNotification(req, res, next) {
  const studentId = notifService.getStudentId(req);
  logger.info('getNotification called', { studentId, id: req.params.id });

  try {
    const notification = await notifService.fetchOne(studentId, req.params.id);
    if (!notification) {
      logger.warn('Notification not found', { studentId, id: req.params.id });
      return res.status(404).json(fail('Notification not found'));
    }
    return res.json(ok({ notification }));
  } catch (err) {
    logger.error('getNotification failed', { error: err.message });
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  const studentId = notifService.getStudentId(req);
  logger.info('markNotificationRead called', { studentId, id: req.params.id });

  try {
    const notification = await notifService.markAsRead(studentId, req.params.id, req.app.get('io'));
    if (!notification) {
      logger.warn('Cannot mark missing notification as read', { studentId, id: req.params.id });
      return res.status(404).json(fail('Notification not found'));
    }
    return res.json(ok({ notification }));
  } catch (err) {
    logger.error('markNotificationRead failed', { error: err.message });
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  const studentId = notifService.getStudentId(req);
  logger.info('markAllNotificationsRead called', { studentId });

  try {
    const result = await notifService.markAllAsRead(studentId, req.app.get('io'));
    return res.json(ok(result));
  } catch (err) {
    logger.error('markAllNotificationsRead failed', { error: err.message });
    next(err);
  }
}

async function unreadCount(req, res, next) {
  const studentId = notifService.getStudentId(req);
  logger.info('unreadCount called', { studentId });

  try {
    const result = await notifService.fetchUnreadCount(studentId);
    return res.json(ok(result));
  } catch (err) {
    logger.error('unreadCount failed', { error: err.message });
    next(err);
  }
}

async function priorityInbox(req, res, next) {
  const studentId = notifService.getStudentId(req);
  const { n = 10, notification_type } = req.query;

  logger.info('priorityInbox called', { studentId, n, notification_type });

  if (!validateType(notification_type)) {
    logger.warn('Invalid priority inbox filter requested', { notification_type });
    return res.status(400).json(fail('Invalid notification type'));
  }

  try {
    const result = await notifService.fetchPriorityInbox({
      studentId,
      n,
      notificationType: notification_type,
      io: req.app.get('io'),
    });
    return res.json(ok(result));
  } catch (err) {
    logger.error('priorityInbox failed', { error: err.message });
    next(err);
  }
}

module.exports = {
  getNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  priorityInbox,
  unreadCount,
};
