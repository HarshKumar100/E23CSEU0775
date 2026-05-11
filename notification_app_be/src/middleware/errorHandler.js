const { logger } = require('@campus-notify/logging-middleware');
const { fail } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  logger.error('Unhandled route error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  res.status(statusCode).json(fail(statusCode === 500 ? 'Internal server error' : err.message));
}

module.exports = { errorHandler };
