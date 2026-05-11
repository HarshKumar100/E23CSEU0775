const mongoose = require('mongoose');
const { logger } = require('@campus-notify/logging-middleware');

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Event', 'Result', 'Placement'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    studentId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ studentId: 1, isRead: 1, timestamp: -1 });
notificationSchema.index({ notificationId: 1, studentId: 1 }, { unique: true });
notificationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

notificationSchema.post('save', function logSavedNotification(doc) {
  logger.info('Notification document saved', {
    notificationId: doc.notificationId,
    studentId: doc.studentId,
  });
});

notificationSchema.post('findOneAndUpdate', function logUpdatedNotification(doc) {
  if (!doc) return;
  logger.info('Notification document updated', {
    notificationId: doc.notificationId,
    studentId: doc.studentId,
  });
});

module.exports = mongoose.model('Notification', notificationSchema);
