const { httpLogger, logger } = require('@campus-notify/logging-middleware');
const { appConfig } = require('../config/appConfig');

function requestLogger(req, res, next) {
  logger.info('Route request received', {
    method: req.method,
    url: req.originalUrl,
    studentId: req.header('x-student-id') || appConfig.defaultStudentId,
  });
  return httpLogger(req, res, next);
}

module.exports = { requestLogger };
