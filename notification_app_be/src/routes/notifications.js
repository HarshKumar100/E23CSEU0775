const express = require('express');
const { logger } = require('@campus-notify/logging-middleware');
const controller = require('../controllers/notificationController');

const router = express.Router();

router.use((req, res, next) => {
  logger.info('Notification route entered', {
    method: req.method,
    path: req.path,
  });
  next();
});

router.get('/', controller.listNotifications);
router.get('/unread-count', controller.unreadCount);
router.get('/priority', controller.priorityInbox);
router.patch('/read-all', controller.markAllNotificationsRead);
router.get('/:id', controller.getNotification);
router.patch('/:id/read', controller.markNotificationRead);

module.exports = router;
