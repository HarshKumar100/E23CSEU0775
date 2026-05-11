require('dotenv').config();

const http = require('http');
const cors = require('cors');
const express = require('express');
const { logger } = require('@campus-notify/logging-middleware');
const { appConfig, isOriginAllowed } = require('./src/config/appConfig');
const { connectDb } = require('./src/config/db');
const { setupSocket } = require('./src/config/socket');
const { requestLogger } = require('./src/middleware/httpLogger');
const { errorHandler } = require('./src/middleware/errorHandler');
const notificationRoutes = require('./src/routes/notifications');

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);

    logger.warn('Blocked CORS origin', { origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

const io = setupSocket(server, appConfig.allowedOrigins);
app.set('io', io);

app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

server.on('error', (err) => {
  logger.error('HTTP server failed', {
    code: err.code,
    error: err.message,
    port: appConfig.port,
  });

  if (err.code === 'EADDRINUSE') {
    logger.error('Port is already in use; stop the existing server before starting a new one', {
      port: appConfig.port,
    });
  }

  setTimeout(() => process.exit(1), 100);
});

function startHttpServer() {
  server.listen(appConfig.port, () => {
    logger.info('Server started', {
      port: appConfig.port,
      allowedOrigins: appConfig.allowedOrigins,
    });
  });
}

connectDb()
  .then(startHttpServer)
  .catch((err) => {
    logger.error('Server startup failed', { error: err.message });
    startHttpServer();
    logger.warn('Server started without database connection', { port: appConfig.port });
  });
