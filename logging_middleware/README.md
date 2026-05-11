# Campus Notification Logging Middleware

Reusable Winston logger for the campus notification platform. It writes developer-friendly colorized logs to the console and structured JSON logs to rotating daily files in `logs/app-%DATE%.log`.

## Install

From the backend folder, reference this local package:

```bash
npm install ../logging_middleware
```

## Usage

```js
const { logger, httpLogger } = require('../logging_middleware');

logger.info('Server started', { port: 5000 });
logger.error('DB connection failed', { error: err.message });
logger.warn('Slow query detected', { duration_ms: 1340, query: '...' });
logger.http('Incoming request', { method: 'GET', url: '/api/notifications' });

app.use(httpLogger);
```

Each file log entry is JSON with:

```json
{
  "timestamp": "2026-05-11T06:00:00.000Z",
  "level": "info",
  "message": "Server started",
  "service": "notification-platform",
  "meta": { "port": 5000 }
}
```
