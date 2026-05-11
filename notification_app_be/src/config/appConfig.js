const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePort(value) {
  const parsedPort = Number(value || 5000);
  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 5000;
}

function buildAllowedOrigins() {
  const configuredOrigins = parseCsv(process.env.CLIENT_ORIGIN);
  // Including 3001 keeps local demos working when an old Vite dev server is still open.
  return [...new Set([...configuredOrigins, ...DEFAULT_ALLOWED_ORIGINS])];
}

const appConfig = {
  allowedOrigins: buildAllowedOrigins(),
  defaultStudentId: process.env.DEFAULT_STUDENT_ID || '1042',
  externalNotificationApiUrl: process.env.EXTERNAL_NOTIF_API_URL,
  mongoUri: process.env.MONGODB_URI,
  port: parsePort(process.env.PORT),
};

function isOriginAllowed(origin) {
  // Non-browser clients such as curl usually do not send Origin.
  return !origin || appConfig.allowedOrigins.includes(origin);
}

module.exports = {
  appConfig,
  isOriginAllowed,
};
