// What the iOS app (ios/, Capacitor) needs from the server: its pages come from capacitor://localhost, so the API must
// answer that origin; signing in hands the app a token instead of a cookie; the token works as "Authorization: Bearer";
// the event stream opens with a one-minute ticket; family photos load with the token. Also checks native.js stays
// silent on the website.
// node tests/native-app.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

const PORT = 8781, BASE = `http://localhost:${PORT}`, APP = 'capacitor://localhost';
const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-native-'));
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '', APP_ORIGINS: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));

// As the app calls: from its own origin, asking for a token.
const app = async (method, url, { body, token, raw, origin = APP } = {}) => {
  const r = await fetch(BASE + url, { method, headers: { origin, 'x-chorecast-client': 'app', ...(token ? { authorization: 'Bearer ' + token } : {}), ...(raw ? { 'content-type': 'image/png' } : body ? { 'content-type': 'application/json' } : {}) }, body: raw || (body ? JSON.stringify(body) : undefined) });
  return { status: r.status, allow: r.headers.get('access-control-allow-origin'), cookie: r.headers.get('set-cookie'), type: r.headers.get('content-type'), r, ...(/json/.test(r.headers.get('content-type') || '') ? await r.json() : {}) };
};
try {
  // CORS for the app's origin, even with APP_ORIGINS unset
  const pre = await fetch(BASE + '/api/auth/me', { method: 'OPTIONS', headers: { origin: APP, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
  ok(pre.status === 204 && pre.headers.get('access-control-allow-origin') === APP && /authorization/.test(pre.headers.get('access-control-allow-headers') || ''), 'the API answers the app’s origin', [pre.status, pre.headers.get('access-control-allow-origin')]);
  const other = await fetch(BASE + '/api/auth/me', { method: 'OPTIONS', headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' } });
  ok(!other.headers.get('access-control-allow-origin'), 'other websites are not let in');

  // Signing up and in from the app: a token, never a cookie
  const su = await app('POST', '/api/auth/signup', { body: { email: 'app@test.localhost', password: 'correct-horse-9', name: 'App', consent: true, deviceName: 'iPad' } });
  ok(su.status === 200 && typeof su.token === 'string' && su.token.length >= 20 && !su.cookie, 'signing up in the app returns a token and no cookie', { status: su.status, cookie: su.cookie });
  ok(su.allow === APP, 'and the app may read the answer');
  const T = su.token;
  const me = await app('GET', '/api/auth/me', { token: T });
  ok(me.status === 200 && me.user && me.user.email === 'app@test.localhost' && !me.token, 'the token signs the app in, and isn’t sent back again', me.status);
  ok((await app('GET', '/api/auth/me', { token: 'x'.repeat(43) })).status === 401, 'a made-up token is refused');
  const li = await app('POST', '/api/auth/login', { body: { email: 'app@test.localhost', password: 'correct-horse-9' } });
  ok(typeof li.token === 'string' && li.token !== T && !li.cookie, 'signing in again gives this device its own token');

  // A kid's iPad paired in the app
  const code = (await app('POST', '/api/devices/code', { token: T, body: {} })).code;
  const kid = await app('POST', '/api/devices/pair', { body: { code, name: 'Kids’ iPad' } });
  ok(typeof kid.token === 'string' && kid.role === 'kid' && !kid.cookie, 'pairing a kid’s iPad in the app returns a token', kid.status);

  // The live stream: a ticket, used once
  const t1 = (await app('POST', '/api/stream/ticket', { token: T, body: {} })).ticket;
  ok(typeof t1 === 'string' && t1.length >= 20, 'the app gets a stream ticket');
  const ac = new AbortController(), es = await fetch(`${BASE}/api/stream?ticket=${t1}&client=test`, { headers: { origin: APP }, signal: ac.signal });
  ok(es.status === 200 && /event-stream/.test(es.headers.get('content-type') || '') && es.headers.get('access-control-allow-origin') === APP, 'the ticket opens the stream for the app', es.status);
  ac.abort();
  const again = await fetch(`${BASE}/api/stream?ticket=${t1}&client=test`, { headers: { origin: APP } });
  ok(again.status === 401, 'the same ticket doesn’t work twice', again.status);
  ok((await app('POST', '/api/stream/ticket', { body: {} })).status === 401, 'no ticket without signing in');

  // Photos: uploaded and loaded with the token
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  const ph = await app('POST', '/api/photos?kind=proof', { token: T, raw: png });
  ok(ph.status === 200 && ph.id, 'a photo uploads from the app', ph.status);
  const got = await app('GET', '/api/photos/' + ph.id, { token: T });
  ok(got.status === 200 && got.allow === APP && Buffer.from(await got.r.arrayBuffer()).equals(png), 'and loads back with the token');
  ok((await app('GET', '/api/photos/' + ph.id)).status === 401, 'but not without it');

  // Signing out ends the token
  await app('POST', '/api/auth/logout', { token: T, body: {} });
  ok((await app('GET', '/api/auth/me', { token: T })).status === 401, 'signing out ends the app’s token');
} finally { srv.kill(); await new Promise(r => setTimeout(r, 300)); }

// native.js: nothing on the website; inside the app it makes window.ChorecastApp from the ChorecastNative plugin.
const src = readFileSync(path.join(REPO, 'public/chorecast/native.js'), 'utf8');
const web = { window: {} }; web.window.window = web.window; vm.runInNewContext(src, web.window);
ok(!web.window.ChorecastApp, 'native.js does nothing on the website');
const seen = [], inApp = { Capacitor: { isNativePlatform: () => true, nativePromise: (p, m, o) => { seen.push([p, m, o]); return Promise.resolve(m === 'buy' ? { jws: 'a.b.c', transactionId: '7' } : m === 'restore' ? { transactions: ['x.y.z'] } : {}); } } };
inApp.window = inApp; vm.runInNewContext(src, inApp);
const CA = inApp.ChorecastApp;
ok(CA && CA.native && ['session', 'setToken', 'products', 'buy', 'finish', 'restore', 'pushToken', 'share', 'print'].every(k => typeof CA[k] === 'function'), 'inside the app it offers everything the web app uses');
const bought = await CA.buy('chorecast.plus.yearly', 'fam-1');
ok(bought.jws === 'a.b.c' && bought.transactionId === '7' && seen.at(-1)[0] === 'ChorecastNative' && seen.at(-1)[2].appAccountToken === 'fam-1', 'buying passes the family id and returns the signed purchase', seen.at(-1));
ok((await CA.restore())[0] === 'x.y.z' && (await CA.pushToken()) === null, 'restore lists purchases; no push address reads as null');
await CA.print(); ok(seen.at(-1)[1] === 'printPage', 'print uses the plugin’s printPage');

console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /rror/.test(l)).slice(0, 8).join('\n'));
process.exit(failN ? 1 : 0);
