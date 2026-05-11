const axios = require('axios');
const { logger } = require('@campus-notify/logging-middleware');
const { appConfig } = require('../config/appConfig');

const TYPE_WEIGHT = {
  Placement: 300,
  Result: 200,
  Event: 100,
};

function calcRecencyBonus(timestamp) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) return 100;
  if (ageHours < 24) return 50;
  if (ageHours < 168) return 20;
  return 0;
}

function scoreNotification(notif) {
  const type = notif.type || notif.Type;
  const timestamp = notif.timestamp || notif.Timestamp;
  const weight = TYPE_WEIGHT[type] || 0;
  const recency = calcRecencyBonus(timestamp);
  return weight + recency;
}

function attachScore(notif) {
  const plainNotif = typeof notif.toObject === 'function' ? notif.toObject() : notif;
  return {
    ...plainNotif,
    score: scoreNotification(plainNotif),
  };
}

async function getTopNNotifications(n = 10) {
  if (!appConfig.externalNotificationApiUrl) {
    const err = new Error('EXTERNAL_NOTIF_API_URL is missing');
    logger.error('Priority inbox external API missing', { error: err.message });
    throw err;
  }

  logger.info('Fetching notifications for priority inbox', { topN: n });

  try {
    const { data } = await axios.get(appConfig.externalNotificationApiUrl);
    const notifications = data.notifications || [];

    logger.info('Fetched notifications from external API', { count: notifications.length });

    const scored = notifications.map((notif) => ({
      ...notif,
      score: scoreNotification(notif),
    }));

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, n);
    logger.info('Priority inbox computed', { topN: n, returned: top.length });

    return top;
  } catch (err) {
    logger.error('Failed to fetch or score notifications', { error: err.message });
    throw err;
  }
}

module.exports = {
  TYPE_WEIGHT,
  attachScore,
  calcRecencyBonus,
  getTopNNotifications,
  scoreNotification,
};
