const { Server } = require('socket.io');
const { logger } = require('@campus-notify/logging-middleware');
const { appConfig } = require('./appConfig');

function setupSocket(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });

  io.on('connection', (socket) => {
    logger.info('Socket client connected', { socketId: socket.id });

    socket.on('student:join', ({ studentId }) => {
      const room = `student:${studentId || appConfig.defaultStudentId}`;
      socket.join(room);
      logger.info('Socket joined student room', { socketId: socket.id, room });
    });

    socket.on('disconnect', (reason) => {
      logger.info('Socket client disconnected', { socketId: socket.id, reason });
    });
  });

  return io;
}

function emitToStudent(io, studentId, eventName, payload) {
  if (!io) {
    logger.warn('Socket emit skipped because io is unavailable', { eventName, studentId });
    return;
  }

  const room = `student:${studentId}`;
  logger.info('Emitting socket event', { room, eventName });
  io.to(room).emit(eventName, payload);
}

module.exports = { setupSocket, emitToStudent };
