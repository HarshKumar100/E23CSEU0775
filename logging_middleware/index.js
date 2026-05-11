const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const winston = require('winston');
require('winston-daily-rotate-file');

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

const serviceName = 'notification-platform';
const logDir = path.join(process.cwd(), 'logs');

fs.mkdirSync(logDir, { recursive: true });

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  winston.format.printf((entry) => JSON.stringify({
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    service: serviceName,
    meta: entry.metadata || {},
  }))
);

const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((entry) => {
    const meta = entry.metadata && Object.keys(entry.metadata).length
      ? ` ${JSON.stringify(entry.metadata)}`
      : '';
    return `${entry.timestamp} ${entry.level}: ${entry.message}${meta}`;
  })
);

const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '20m',
  maxFiles: '14d',
  format: jsonFormat,
});

fileTransport.on('error', (err) => {
  // File logging should never be the reason the API goes down on a lab machine.
  process.stderr.write(`notification logger file transport failed: ${err.message}\n`);
});

const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'debug',
  defaultMeta: { service: serviceName },
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    fileTransport,
  ],
});

const httpLogger = morgan('combined', {
  stream: {
    write: (message) => logger.http('Incoming request', { request: message.trim() }),
  },
});

module.exports = {
  logger,
  httpLogger,
};
