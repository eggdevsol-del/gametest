// Apple push notifications over HTTP/2, signed with the team's APNs key (a .p8 file's text in APNS_KEY, with
// APNS_KEY_ID, APNS_TEAM_ID and APNS_TOPIC, the app's bundle id). Without them nothing is sent. A token Apple says is
// gone (410, or 400 BadDeviceToken) is deleted, so it isn't tried again.
import http2 from 'node:http2';
import { createSign } from 'node:crypto';

const KEY = (process.env.APNS_KEY || '').replace(/\\n/g, '\n'), KEY_ID = process.env.APNS_KEY_ID || '', TEAM = process.env.APNS_TEAM_ID || '';
const TOPIC = process.env.APNS_TOPIC || process.env.APP_BUNDLE_ID || '';
export const pushReady = !!(KEY && KEY_ID && TEAM && TOPIC);

let jwt = null, jwtAt = 0;
const b64u = b => Buffer.from(b).toString('base64url');
function token() {
  if (jwt && Date.now() - jwtAt < 45 * 60 * 1000) return jwt;
  const head = b64u(JSON.stringify({ alg: 'ES256', kid: KEY_ID })), body = b64u(JSON.stringify({ iss: TEAM, iat: Math.floor(Date.now() / 1000) }));
  const sig = createSign('sha256').update(`${head}.${body}`).sign({ key: KEY, dsaEncoding: 'ieee-p1363' });
  jwt = `${head}.${body}.${b64u(sig)}`; jwtAt = Date.now();
  return jwt;
}

const sessions = {};
function session(env) {
  const host = env === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  if (!sessions[env] || sessions[env].closed || sessions[env].destroyed) {
    sessions[env] = http2.connect(host);
    sessions[env].on('error', () => { sessions[env] = null; });
    sessions[env].unref();
  }
  return sessions[env];
}

function sendOne(row, payload) {
  return new Promise(resolve => {
    let req;
    try {
      req = session(row.environment).request({ ':method': 'POST', ':path': `/3/device/${row.token}`, authorization: `bearer ${token()}`, 'apns-topic': TOPIC, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' });
    } catch (e) { return resolve({ status: 0, reason: e.message }); }
    let status = 0, data = '';
    req.on('response', h => { status = h[':status']; });
    req.on('data', d => { data += d; });
    req.on('end', () => resolve({ status, reason: (() => { try { return JSON.parse(data).reason; } catch (e) { return ''; } })() }));
    req.on('error', e => resolve({ status: 0, reason: e.message }));
    req.setTimeout(10000, () => { req.close(); resolve({ status: 0, reason: 'timeout' }); });
    req.end(JSON.stringify(payload));
  });
}

// Sends one alert to the family's devices of one kind ('parent' or 'kid'). Returns how many went.
export async function notify(db, familyId, kind, { title, body, thread }) {
  if (!pushReady) return 0;
  const rows = (await db.query(`select p.device_id, p.token, p.environment from push_devices p join devices d on d.id = p.device_id
    where p.family_id = $1 and d.kind = $2 and d.revoked_at is null`, [familyId, kind])).rows;
  return sendAll(db, rows, { title, body, thread });
}

// Sends one alert to a single device. Returns 1 if it went.
export async function notifyDevice(db, deviceId, { title, body, thread }) {
  if (!pushReady) return 0;
  const rows = (await db.query(`select p.device_id, p.token, p.environment from push_devices p join devices d on d.id = p.device_id
    where p.device_id = $1 and d.revoked_at is null`, [deviceId])).rows;
  return sendAll(db, rows, { title, body, thread });
}

async function sendAll(db, rows, { title, body, thread }) {
  let sent = 0;
  for (const r of rows) {
    const out = await sendOne(r, { aps: { alert: { title, body }, sound: 'default', 'thread-id': thread || 'chorecast' } });
    if (out.status === 200) sent++;
    else if (out.status === 410 || out.reason === 'BadDeviceToken' || out.reason === 'Unregistered') await db.query('delete from push_devices where device_id = $1', [r.device_id]);
    else await db.query('update push_devices set failed_at = now() where device_id = $1', [r.device_id]);
  }
  return sent;
}
