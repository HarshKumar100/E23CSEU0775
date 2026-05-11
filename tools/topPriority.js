const http = require('http');
const fs = require('fs');

// Config
const NOTIF_URL = 'http://4.224.186.213/evaluation-service/notifications';
const TOP_N = 10;

function fetchNotifications(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    opts.headers = headers;
    http.get(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function typeWeight(type) {
  // placement > result > event
  if (!type) return 0;
  const t = type.toLowerCase();
  if (t === 'placement') return 3;
  if (t === 'result') return 2;
  if (t === 'event') return 1;
  return 0;
}

function scoreNotification(n) {
  const weight = typeWeight(n.type || n.notification_type || n.notificationType);
  const ts = new Date(n.timestamp || n.time || n.createdAt || Date.now()).getTime();
  const ageSeconds = (Date.now() - ts) / 1000;
  // Higher weight and more recent -> higher score
  return weight * 1e9 - ageSeconds;
}

function topN(notifs, n) {
  const unread = notifs.filter(x => x.isRead === false || x.isRead === 'false' || x.isRead === undefined);
  unread.forEach(x => x._score = scoreNotification(x));
  unread.sort((a,b) => b._score - a._score);
  return unread.slice(0, n);
}

function makeSVG(lines) {
  const width = 900;
  const lineHeight = 28;
  const height = Math.max(200, lines.length * lineHeight + 40);
  const escaped = lines.map(l => l.replace(/&/g, '&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'));
  const text = escaped.map((l,i) => `<tspan x="20" dy="${i===0? '1em' : '1.2em'}">${l}</tspan>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n  <rect width="100%" height="100%" fill="#fff"/>\n  <text x="20" y="30" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#111">\n    ${text}\n  </text>\n</svg>`;
}

async function run() {
  console.log('Fetching notifications from', NOTIF_URL);
  // Allow optional headers via environment
  const headers = {};
  if (process.env.X_STUDENT_ID) headers['x-student-id'] = process.env.X_STUDENT_ID;
  if (process.env.AUTH_TOKEN) headers['Authorization'] = `Bearer ${process.env.AUTH_TOKEN}`;
  if (process.env.AUTH_HEADER_NAME && process.env.AUTH_HEADER_VALUE) headers[process.env.AUTH_HEADER_NAME] = process.env.AUTH_HEADER_VALUE;
  if (Object.keys(headers).length) console.log('Using headers:', headers);
  try {
    const res = await fetchNotifications(NOTIF_URL, headers);
    // support both { data: { notifications: [...] } } and direct array
    let notifs = [];
    if (Array.isArray(res)) notifs = res;
    else if (res && res.data && Array.isArray(res.data.notifications)) notifs = res.data.notifications;
    else if (res && res.notifications && Array.isArray(res.notifications)) notifs = res.notifications;
    else {
      const msg = 'Unexpected API response shape — saved response to SVG.';
      console.error(msg);
      const dump = JSON.stringify(res, null, 2).slice(0, 1000);
      const lines = ['Priority script: API response error', '------------------------------------', dump];
      const svg = makeSVG(lines);
      fs.writeFileSync('priority_top10.svg', svg, 'utf8');
      console.log('Wrote priority_top10.svg (contains API response)');
      return process.exit(0);
    }

    const top = topN(notifs, TOP_N);
    const lines = [];
    lines.push('Top ' + TOP_N + ' Priority Unread Notifications');
    lines.push('-------------------------------------');
    top.forEach((t, i) => {
      const date = new Date(t.timestamp || t.time || t.createdAt).toISOString();
      const type = t.type || t.notification_type || t.notificationType || 'Unknown';
      const msg = (t.message || t.title || t.body || '').replace(/\s+/g, ' ').trim();
      lines.push(`${i+1}. [${type}] ${msg} — ${date}`);
    });

    console.log(lines.join('\n'));
    const svg = makeSVG(lines);
    fs.writeFileSync('priority_top10.svg', svg, 'utf8');
    console.log('Wrote priority_top10.svg');
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
