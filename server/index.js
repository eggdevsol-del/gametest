// Chorecast server: serves the built site, parent email sign-in, paired kid devices, live sync of the family's
// data through Postgres, job photos, the in-app event log and the Character Growth content feed.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash, X509Certificate } from 'node:crypto';
import zlib from 'node:zlib';
import { openDb, migrate } from './db.js';
import { hashPassword, verifyPassword, newToken, sha256, wordCode, digitCode, recoveryCode, parseCookies, sessionCookie, limited, hitCount, validEmail } from './auth.js';
import { checkKidWrite, checkPlanWrite, same } from './guard.js';
import { hash as fnv } from './market.js';
import { runHousekeeping } from './housekeeping.js';
import { sendMail, mailReady } from './mail.js';
import { makeErrors } from './errors.js';
import { verifyAppleJws } from './appstore.js';
import { PAYWALL, PRODUCTS, PLANS, FOUNDING_SEATS, WELCOME_DAYS, planOf, clubPrize } from './plans.js';
import { notify, notifyDevice } from './push.js';
import { offsiteConfig, runOffsiteBackup } from './offsite.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Options: PORT and STATIC_DIR environment variables, or --port 8787 --static public on the command line.
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = path.resolve(arg('static') || process.env.STATIC_DIR || path.join(here, '..', 'public'));
const PORT = Number(arg('port') || process.env.PORT || 8787);
// Links in emails always use this address, never the request's Host header (which anyone can set).
const APP_URL = (process.env.APP_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : `http://localhost:${PORT}`)).replace(/\/$/, '');
// Origins of the native app's bundled pages (comma-separated), allowed to call the API with a sign-in token instead of
// a cookie. The iOS app (Capacitor) serves its pages from capacitor://localhost. No cookies cross origins, so this lets
// nothing in that a plain HTTP client couldn't already do.
const APP_ORIGINS = (process.env.APP_ORIGINS || 'capacitor://localhost').split(',').map(o => o.trim()).filter(Boolean);
// The iOS app's bundle id: App Store purchases for any other app are refused. APPSTORE_TEST_ROOT (a PEM file) swaps
// Apple's root certificate for a test one, for local tests only; it is never set on Railway.
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'app.chorecast.ios';
const appleOpts = process.env.APPSTORE_TEST_ROOT ? { root: new X509Certificate(await readFile(process.env.APPSTORE_TEST_ROOT)) } : {};
const SESSION_DAYS = 180;
// The date of the terms and privacy policy a grown-up agrees to at sign-up (public/chorecast/terms.html, privacy.html).
const TERMS_VERSION = '2026-11-02';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
// The content feed is shared by every family, so only these grown-ups (comma-separated emails) may review it.
const CONTENT_EDITORS = (process.env.CONTENT_EDITORS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const db = await openDb();
await migrate(db);
console.log(`database ready (${db.kind}), serving ${ROOT}`);
const errors = makeErrors(db);
process.on('unhandledRejection', e => { console.error('unhandled rejection', e); errors.record('server', 'unhandled rejection', e); });

/* ---------- helpers ---------- */
class HttpError extends Error { constructor(status, message, code) { super(message); this.status = status; this.code = code || 'error'; } }
const fail = (status, message, code) => { throw new HttpError(status, message, code); };
const asObj = v => (typeof v === 'string' ? JSON.parse(v) : v) || {};
// Same rules as the app's deepMerge: nested objects merge, arrays and plain values replace.
function deepMerge(base, patch) {
  const out = { ...(base || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}
// Brotli or gzip, whichever the browser takes (null for neither).
const encodingFor = req => { const a = String(req.headers['accept-encoding'] || ''); return /\bbr\b/.test(a) ? 'br' : /\bgzip\b/.test(a) ? 'gzip' : null; };
const compress = (buf, enc, quality) => (enc === 'br'
  ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: quality, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } })
  : zlib.gzipSync(buf, { level: quality > 6 ? 9 : 6 }));
function send(res, status, body, headers = {}) {
  let data = Buffer.from(body === undefined ? '' : JSON.stringify(body));
  const head = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers };
  // Big answers (the family's sync, the content feed) go compressed; quick settings keep it cheap per request.
  const enc = data.length > 2048 && res.req ? encodingFor(res.req) : null;
  if (enc) { data = compress(data, enc, 5); head['content-encoding'] = enc; head.vary = [res.getHeader('vary'), 'accept-encoding'].filter(Boolean).join(', '); }
  res.writeHead(status, { ...head, 'content-length': data.length });
  res.end(data);
}
async function readBody(req, limit) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > limit) fail(413, 'That upload is too big.', 'too_big'); chunks.push(c); }
  return Buffer.concat(chunks);
}
async function readJson(req, limit = 4 * 1024 * 1024) {
  if (!/application\/json/.test(req.headers['content-type'] || '')) fail(415, 'Expected JSON.', 'bad_type');
  const buf = await readBody(req, limit);
  try { return buf.length ? JSON.parse(buf.toString('utf8')) : {}; } catch (e) { fail(400, 'That request could not be read.', 'bad_json'); }
}
const isSecure = req => (req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
const clientIp = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
// On every response: no sniffing, no framing by other sites, and HTTPS only from the first visit over HTTPS.
function securityHeaders(req, res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'same-origin');
  if (isSecure(req)) res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
}

/* ---------- sessions ----------
   The website signs in with a cookie. The native app keeps the same kind of token in the Keychain and sends it as
   "Authorization: Bearer"; its event stream, which can't send headers, uses a one-minute ticket instead. */
const touched = new Map();
const streamTickets = new Map();
const bearerOf = req => { const m = /^Bearer ([\w-]{20,})$/.exec(req.headers.authorization || ''); return m ? m[1] : null; };
async function sessionOf(req, url) {
  let h = null;
  const tok = bearerOf(req) || parseCookies(req.headers.cookie).cc_session;
  if (tok) h = sha256(tok);
  else if (url && url.pathname === '/api/stream' && url.searchParams.get('ticket')) {
    const t = streamTickets.get(url.searchParams.get('ticket')); streamTickets.delete(url.searchParams.get('ticket'));
    if (t && t.expires > Date.now()) h = t.hash;
  }
  if (!h) return null;
  const r = await db.query(`select s.token_hash, s.family_id, s.device_id, s.user_id, s.role, s.elevated_until, s.expires_at, d.revoked_at, d.name as device_name
    from sessions s join devices d on d.id = s.device_id where s.token_hash = $1`, [h]);
  const s = r.rows[0];
  if (!s || s.revoked_at || new Date(s.expires_at) < new Date()) return null;
  if (Date.now() - (touched.get(h) || 0) > 5 * 60 * 1000) {
    touched.set(h, Date.now());
    db.query('update sessions set last_used_at = now() where token_hash = $1', [h]).catch(() => {});
    db.query('update devices set last_seen_at = now() where id = $1', [s.device_id]).catch(() => {});
  }
  return { ...s, elevated: s.role === 'parent' || (s.elevated_until && new Date(s.elevated_until) > new Date()) };
}
// Returns { token } for the native app (it asks with x-chorecast-client: app), or nothing for a browser (cookie only).
async function startSession(res, req, { familyId, deviceId, userId, role }) {
  const tok = newToken();
  await db.query(`insert into sessions (token_hash, family_id, device_id, user_id, role, expires_at) values ($1, $2, $3, $4, $5, now() + interval '${SESSION_DAYS} days')`, [sha256(tok), familyId, deviceId, userId || null, role]);
  if (req.headers['x-chorecast-client'] === 'app') return { token: tok };
  res.setHeader('set-cookie', sessionCookie(tok, isSecure(req), SESSION_DAYS * 86400));
  return {};
}
const needSession = s => s || fail(401, 'Please sign in.', 'signed_out');
const needParent = s => (needSession(s).role === 'parent' ? s : fail(403, 'Only a signed-in grown-up can do that.', 'parent_only'));
const isEditor = async s => {
  if (!s || s.role !== 'parent' || !s.user_id || !CONTENT_EDITORS.length) return false;
  const u = (await db.query('select email from users where id = $1', [s.user_id])).rows[0];
  return !!u && CONTENT_EDITORS.includes(u.email.toLowerCase());
};
const needEditor = async s => ((await isEditor(needSession(s))) ? s : fail(403, 'Only a content editor can do that.', 'editor_only'));
const needElevated = s => (needSession(s).elevated ? s : fail(403, 'A grown-up needs to unlock this first.', 'locked'));

async function me(s) {
  const fam = (await db.query('select id, name from families where id = $1', [s.family_id])).rows[0];
  const u = s.user_id ? (await db.query('select id, email, name, email_verified_at from users where id = $1', [s.user_id])).rows[0] : null;
  const user = u ? { id: u.id, email: u.email, name: u.name, emailVerified: !!u.email_verified_at } : null;
  const members = (await db.query('select u.name, u.email, m.role from family_members m join users u on u.id = m.user_id where m.family_id = $1 order by m.joined_at', [s.family_id])).rows;
  return { user, family: fam, mail: mailReady, role: s.role, elevated: !!s.elevated, contentEditor: await isEditor(s), device: { id: s.device_id, name: s.device_name }, members };
}

async function logEvent(s, type, payload = {}, kidId = null) {
  await db.query('insert into events (family_id, user_id, device_id, kid_id, type, payload) values ($1, $2, $3, $4, $5, $6::jsonb)',
    [s.family_id, s.user_id || null, s.device_id || null, kidId, type, JSON.stringify(payload)]).catch(e => console.warn('event log failed', e.message));
}

/* ---------- live sync ---------- */
// Each browser holds one event stream; a write is pushed to every other open device in the same family.
const streams = new Map();
function broadcast(familyId, msg, exceptClient) {
  const set = streams.get(familyId); if (!set) return;
  const line = `event: change\ndata: ${JSON.stringify(msg)}\n\n`;
  for (const c of set) if (c.clientId !== exceptClient) c.res.write(line);
}
function closeDeviceStreams(deviceId) {
  for (const set of streams.values()) for (const c of set) if (c.deviceId === deviceId) { c.res.write('event: signedout\ndata: {}\n\n'); c.res.end(); }
}
setInterval(() => { for (const set of streams.values()) for (const c of set) c.res.write(': keep-alive\n\n'); }, 25000).unref();

const COLS = {
  family: { table: 'family_settings', single: true },
  kids: { table: 'kids' },
  jobs: { table: 'jobs', extra: d => ({ kid_id: d.kidId ?? null, status: d.status ?? null, day: d.date ?? null }) },
  habits: { table: 'habits', extra: d => ({ kid_id: d.kidId ?? null }) },
  growth: { table: 'growth_progress' },
  guides: { table: 'chore_guides', extra: d => ({ photo_mode: d.photoMode === 'each' || d.photoMode === 'end' ? d.photoMode : null, step_count: Array.isArray(d.steps) ? d.steps.length : null }) },
};

// Kid devices can do everything a kid does in the app; settings, approvals, pay and deletes need a parent
// account or a kid device a grown-up has unlocked with the PIN.
function checkWrite(s, col, body, prev) {
  if (s.elevated) return;
  if (col === 'family' || col === 'guides') fail(403, 'A grown-up needs to unlock this first.', 'locked');
  if (col === 'kids' && !prev) fail(403, 'Only a grown-up can add a kid.', 'locked');
  if (col === 'jobs') {
    if (body.status && body.status !== 'pending' && body.status !== (prev && prev.status)) fail(403, 'Only a grown-up can approve jobs.', 'locked');
    if ('paid' in body || 'reviewedAt' in body || 'xpAward' in body) fail(403, 'Only a grown-up can approve jobs.', 'locked');
  }
}

// Server photo ids in a chore guide. Photos a guide stops using (a retake, a re-recording, a deleted guide) are removed.
const guidePhotoIds = d => [...((d && d.steps) || []).map(x => x && x.photo), d && d.finish].filter(r => typeof r === 'string' && r.startsWith('s:')).map(r => r.slice(2));
const dropGuidePhotos = (t, familyId, ids) => (ids.length ? t.q(`delete from photos where family_id = $1 and kind = 'guide' and id = any($2)`, [familyId, ids]) : null);

// Fields only the server sets: whether a grown-up PIN or a kid's passcode is set (the codes live in family_pins).
// Writes from devices keep whatever is already there; pinHash is from older versions of the app and is dropped.
const SERVER_OWNED = { family: ['pinSet'], kids: ['pin'] };
function keepServerOwned(col, prev, data) {
  if (col === 'family') delete data.pinHash;
  // XP bought in the shop and the Island Club are only ever set by a purchase.
  if (col === 'kids' && data.island && typeof data.island === 'object') { const pi = (prev && prev.island) || {}; for (const k of ['paidXp', 'club']) { if (pi[k] != null) data.island[k] = pi[k]; else delete data.island[k]; } }
  for (const k of SERVER_OWNED[col] || []) { if (prev && prev[k]) data[k] = true; else delete data[k]; }
}

// `system` is the server's own write (the PIN routes setting pinSet or a kid's pin): no device rules apply.
async function writeDoc(s, col, id, body, merge, clientId, system = false) {
  const C = COLS[col]; if (!C) fail(404, 'Unknown collection.', 'bad_path');
  let before = null;
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Expected an object.', 'bad_body');
  // What the family's plan has, and the free plan's kid limit, found before the transaction (the embedded database has
  // one connection).
  const plan = !system && (col === 'kids' || col === 'growth' || col === 'family') ? await planOf(db, s.family_id) : null;
  if (plan && col === 'kids' && !body.example && plan.limits.kids < 99 && !(await db.query('select 1 from kids where family_id = $1 and id = $2', [s.family_id, id])).rows.length) await needRoom(s.family_id, 'kids');
  const out = await db.tx(async t => {
    const cur = C.single
      ? (await t.q('select data, version from family_settings where family_id = $1 for update', [s.family_id])).rows[0]
      : (await t.q(`select data, version from ${C.table} where family_id = $1 and id = $2 for update`, [s.family_id, id])).rows[0];
    const prev = cur ? asObj(cur.data) : null;
    if (!system) checkWrite(s, col, body, prev);
    const data = merge ? deepMerge(prev || {}, body) : { ...body };
    if (!system) keepServerOwned(col, prev, data);
    if (plan) {
      const bad = checkPlanWrite(col, prev, data, plan); if (bad) fail(402, bad.message, bad.code);
      // Waking a resting kid needs room in the plan.
      if (col === 'kids' && prev && prev.resting && !data.resting) {
        const n = (await t.q(`select count(*)::int as n from kids where family_id = $1 and id <> $2 and coalesce(data->>'example', '') <> 'true' and coalesce(data->>'resting', '') <> 'true'`, [s.family_id, id])).rows[0].n;
        if (n >= plan.limits.kids) fail(402, `The ${plan.limits.name} plan has room for ${plan.limits.kids} kids at a time. Rest another kid first, or see Plus.`, 'plan_limit');
      }
    }
    // A resting kid (over the Free plan's kid limit) can't do anything from a kid's iPad: their money, statement and
    // island stay just as they are until a grown-up wakes them.
    if (!system && !s.elevated && (col === 'kids' || col === 'growth' || col === 'jobs' || col === 'habits')) {
      const kidId = col === 'kids' || col === 'growth' ? id : data.kidId;
      const kd = col === 'kids' ? prev : kidId ? asObj(((await t.q('select data from kids where family_id = $1 and id = $2', [s.family_id, kidId])).rows[0] || {}).data) : null;
      if (kd && kd.resting && (col !== 'kids' || Object.keys({ ...prev, ...data }).some(k => k !== 'id' && k !== 'giftSeen' && !same(prev[k], data[k])))) fail(403, 'Chores and lessons are paused for now.', 'resting');
    }
    if (!system && !s.elevated && col === 'kids' && prev) {
      const set = (await t.q('select data from family_settings where family_id = $1', [s.family_id])).rows[0];
      const bad = checkKidWrite(prev, data, set ? asObj(set.data) : {});
      if (bad) fail(bad.code === 'stale' ? 409 : 403, bad.message, bad.code);
    }
    if (!C.single) data.id = id;
    if (col === 'guides' && prev) { const keep = new Set(guidePhotoIds(data)); await dropGuidePhotos(t, s.family_id, guidePhotoIds(prev).filter(x => !keep.has(x))); }
    const version = (cur ? Number(cur.version) : 0) + 1, who = s.user_id || s.device_id;
    if (C.single) {
      await t.q(`insert into family_settings (family_id, data, version, updated_at, updated_by) values ($1, $2::jsonb, $3, now(), $4)
        on conflict (family_id) do update set data = excluded.data, version = excluded.version, updated_at = now(), updated_by = excluded.updated_by`, [s.family_id, JSON.stringify(data), version, who]);
    } else {
      const extra = C.extra ? C.extra(data) : {}, ek = Object.keys(extra);
      const cols = ['family_id', 'id', 'data', 'version', 'updated_by', ...ek];
      const vals = [s.family_id, id, JSON.stringify(data), version, who, ...ek.map(k => extra[k])];
      const ph = cols.map((c, i) => (c === 'data' ? `$${i + 1}::jsonb` : `$${i + 1}`));
      await t.q(`insert into ${C.table} (${cols.join(', ')}, updated_at) values (${ph.join(', ')}, now())
        on conflict (family_id, id) do update set ${cols.slice(2).map(c => `${c} = excluded.${c}`).join(', ')}, updated_at = now()`, vals);
    }
    await t.q('insert into doc_changes (family_id, collection, doc_id, op, device_id, user_id) values ($1, $2, $3, $4, $5, $6)', [s.family_id, col, id, merge ? 'merge' : 'set', s.device_id, s.user_id || null]);
    before = prev;
    return { data, version };
  });
  broadcast(s.family_id, { col, id, data: out.data, version: out.version }, clientId);
  if (col === 'jobs') pushForJob(s.family_id, before, out.data).catch(e => console.error('push failed', e.message));
  return out;
}

// A job sent for approval tells the grown-ups' phones; an approval or a redo tells the kids' iPads.
async function pushForJob(familyId, prev, d) {
  const was = prev && prev.status, now = d.status; if (was === now || !d.kidId) return;
  const kid = (await db.query('select data from kids where family_id = $1 and id = $2', [familyId, d.kidId])).rows[0], name = kid ? asObj(kid.data).name || 'A kid' : 'A kid';
  const title = String(d.title || 'a job').slice(0, 60);
  if (now === 'pending') await notify(db, familyId, 'parent', { title: `${name} finished a job`, body: `${title} is ready for you to check.`, thread: 'review' });
  else if (was === 'pending' && now === 'approved') await notify(db, familyId, 'kid', { title: `Nice work, ${name}!`, body: `${title} was approved${d.paid && d.paid.net ? ` and paid` : ''}.`, thread: 'kid-' + d.kidId });
  else if (was === 'pending' && now === 'redo') await notify(db, familyId, 'kid', { title: `${name}, one more go`, body: `${title} needs another try. Have a look at the note.`, thread: 'kid-' + d.kidId });
}

// The hour and the day (YYYY-MM-DD, as the app's own day keys) in an iPad's time zone, or null for a zone that can't be read.
function localNow(tz) {
  try { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Pacific/Auckland', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map(x => [x.type, x.value])); return { hour: +parts.hour, day: `${parts.year}-${parts.month}-${parts.day}` }; } catch (e) { return null; }
}
// Kids' chore reminder: at the family's chosen hour (settings.remindAt), in each iPad's own time zone, once a day.
async function sendReminders() {
  const rows = (await db.query(`select p.device_id, p.family_id, p.tz, p.reminded_on, f.data->>'remindAt' as at from push_devices p
    join devices d on d.id = p.device_id join family_settings f on f.family_id = p.family_id
    where d.kind = 'kid' and d.revoked_at is null and f.data->>'remindAt' is not null`)).rows;
  for (const r of rows) {
    const now = localNow(r.tz); if (!now || now.hour !== Number(r.at) || r.reminded_on === now.day) continue;
    await db.query('update push_devices set reminded_on = $2 where device_id = $1', [r.device_id, now.day]);
    await notify(db, r.family_id, 'kid', { title: 'Chorecast', body: 'Today’s chores are ready. Tap to see your forecast.', thread: 'reminder' });
  }
}
// Kids' lesson reminder: at the family's lesson hour (settings.lessonAt: 4 pm unless a grown-up changes it, null when
// turned off), in each iPad's own time zone, at most once a day, naming the kids who haven't earned learning XP today.
// The app shows "Lesson time!" on their Today screen from the same hour.
async function sendLessonReminders() {
  const rows = (await db.query(`select p.device_id, p.family_id, p.tz, p.lesson_reminded_on, case when f.data ? 'lessonAt' then f.data->>'lessonAt' else '16' end as at
    from push_devices p join devices d on d.id = p.device_id left join family_settings f on f.family_id = p.family_id
    where d.kind = 'kid' and d.revoked_at is null`)).rows;
  let sent = 0;
  for (const r of rows) {
    if (r.at == null) continue;
    const now = localNow(r.tz); if (!now || now.hour !== Number(r.at) || r.lesson_reminded_on === now.day) continue;
    await db.query('update push_devices set lesson_reminded_on = $2 where device_id = $1', [r.device_id, now.day]);
    const kids = (await db.query(`select k.data->>'name' as name, g.data->'day' as day from kids k
      left join growth_progress g on g.family_id = k.family_id and g.id = k.id
      where k.family_id = $1 and coalesce(k.data->>'resting', 'false') <> 'true' and coalesce(k.data->>'example', 'false') <> 'true'
      order by coalesce((k.data->>'order')::numeric, 0)`, [r.family_id])).rows;
    const due = kids.filter(k => !(k.day && k.day.d === now.day && Number(k.day.xp) > 0)).map(k => k.name || 'Kids');
    if (!due.length) continue;
    const who = due.length === 1 ? due[0] : `${due.slice(0, -1).join(', ')} and ${due.at(-1)}`;
    // 50 XP is a new lesson's most (40 for passing, 10 for every answer right), as XP in chorecast-growth/01-core.js
    sent += await notifyDevice(db, r.device_id, { title: 'Lesson time!', body: `${who}, a new lesson pays up to 50 XP. Open Grow to start.`, thread: 'lesson' });
  }
  return sent;
}
setInterval(() => Promise.all([sendReminders(), sendLessonReminders()]).catch(e => console.error('reminders failed', e.message)), 10 * 60 * 1000).unref();

async function deleteDoc(s, col, id, clientId) {
  const C = COLS[col]; if (!C || C.single) fail(404, 'Unknown collection.', 'bad_path');
  needElevated(s);
  await db.tx(async t => {
    if (col === 'guides') {
      // A deleted guide takes its how-to photos with it (kids' own photos stay with their jobs).
      const g = (await t.q('select data from chore_guides where family_id = $1 and id = $2', [s.family_id, id])).rows[0];
      if (g) await dropGuidePhotos(t, s.family_id, guidePhotoIds(asObj(g.data)));
    }
    await t.q(`delete from ${C.table} where family_id = $1 and id = $2`, [s.family_id, id]);
    await t.q('insert into doc_changes (family_id, collection, doc_id, op, device_id, user_id) values ($1, $2, $3, $4, $5, $6)', [s.family_id, col, id, 'delete', s.device_id, s.user_id || null]);
  });
  broadcast(s.family_id, { col, id, data: null }, clientId);
}

async function snapshot(familyId) {
  const rows = async (sql) => Object.fromEntries((await db.query(sql, [familyId])).rows.map(r => [r.id, { ...asObj(r.data), id: r.id }]));
  const set = (await db.query('select data from family_settings where family_id = $1', [familyId])).rows[0];
  const settings = set ? asObj(set.data) : null, kids = await rows('select id, data from kids where family_id = $1');
  // Belt and braces: no PIN or passcode hash ever goes to a device (migration 008 moved them to family_pins).
  if (settings) delete settings.pinHash;
  for (const k of Object.values(kids)) if (k.pin) k.pin = true;
  return {
    settings,
    kids,
    jobs: await rows('select id, data from jobs where family_id = $1 order by created_at desc limit 800'),
    habits: await rows('select id, data from habits where family_id = $1'),
    growth: await rows('select id, data from growth_progress where family_id = $1'),
    guides: await rows('select id, data from chore_guides where family_id = $1'),
  };
}

/* ---------- daily clean-up ---------- */
// The server's own writes (no device): used by the clean-up to take expired photos off jobs.
const serverSession = familyId => ({ family_id: familyId, device_id: null, user_id: null, role: 'parent', elevated: true });
const clearJobPhotos = (familyId, jobId) => writeDoc(serverSession(familyId), 'jobs', jobId, { photo: null, stepPhotos: null, photoGone: Date.now() }, true, null, true);
async function housekeeping() {
  try { const out = await runHousekeeping(db, clearJobPhotos); if (out) console.log('housekeeping', JSON.stringify(out)); } catch (e) { console.error('housekeeping failed', e); }
  try { await offsiteBackup(); } catch (e) { console.error('off-site backup failed', e.message); }
  try { await welcomeEnding(); } catch (e) { console.error('welcome reminders failed', e.message); }
}
// The daily encrypted off-site backup (server/offsite.js), when a bucket is set up. A failed one is tried again in
// about an hour, and recorded in the error log so it doesn't fail quietly.
const OFFSITE = (() => { try { return offsiteConfig(); } catch (e) { console.error('off-site backups are off:', e.message); return null; } })();
async function offsiteBackup(force = false) {
  if (!OFFSITE) return null;
  const due = (await db.query(`insert into housekeeping (job, last_run) values ('offsite', now()) on conflict (job) do update set last_run = now()
    where $1 or housekeeping.last_run < now() - interval '23 hours' returning job`, [force])).rows.length;
  if (!due) return null;
  try {
    const out = await runOffsiteBackup(db, OFFSITE);
    await db.query(`update housekeeping set detail = $1::jsonb where job = 'offsite'`, [JSON.stringify({ ...out, ok: true })]);
    console.log('off-site backup', JSON.stringify(out)); return out;
  } catch (e) {
    await db.query(`update housekeeping set last_run = now() - interval '22 hours', detail = $1::jsonb where job = 'offsite'`, [JSON.stringify({ ok: false, error: e.message })]);
    errors.record('server', 'off-site backup', e); throw e;
  }
}

// Four days before a family's welcome fortnight ends (and they haven't bought a plan), the grown-ups' phones hear about
// it once, so the end is never a surprise.
async function welcomeEnding() {
  if (!PAYWALL) return;
  const rows = (await db.query(`select e.family_id from entitlements e where e.source = 'welcome' and e.revoked_at is null
    and e.expires_at > now() and e.expires_at < now() + interval '4 days'
    and not exists (select 1 from entitlements p where p.family_id = e.family_id and p.source <> 'welcome' and p.plan in ('plus', 'family') and p.revoked_at is null and (p.expires_at is null or p.expires_at > now()))
    and not exists (select 1 from plan_moments m where m.family_id = e.family_id and m.moment = 'welcome' and m.action = 'shown')`)).rows;
  for (const r of rows) {
    await db.query(`insert into plan_moments (family_id, moment, action) values ($1, 'welcome', 'shown')`, [r.family_id]);
    await notify(db, r.family_id, 'parent', { title: 'Your Plus fortnight ends soon', body: 'Have a look at what your family has used, and choose what comes next. Nothing your kids have is taken away.', thread: 'plan' });
  }
}
setTimeout(housekeeping, 60 * 1000).unref();
setInterval(housekeeping, 60 * 60 * 1000).unref();

/* ---------- routes ---------- */
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

// Railway's health check and the uptime monitor: fails when the database doesn't answer.
route('GET', '/api/health', async () => {
  try { await db.query('select 1'); } catch (e) { fail(503, 'The database isn’t answering.', 'db_down'); }
  return { ok: true, db: db.kind, mail: mailReady, paywall: PAYWALL };
});

const isAdmin = req => !!ADMIN_TOKEN && req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
// Run the off-site backup now (to check a new bucket works), or see how the last one went.
route('POST', '/api/admin/backup', async ({ req }) => {
  if (!isAdmin(req)) fail(404, 'Not found.', 'not_found');
  if (!OFFSITE) fail(409, 'Off-site backups aren’t set up: set BACKUP_BUCKET and the other BACKUP_ settings.', 'not_set_up');
  return { ok: true, ...(await offsiteBackup(true)) };
});
route('GET', '/api/admin/backup', async ({ req }) => {
  if (!isAdmin(req)) fail(404, 'Not found.', 'not_found');
  const r = (await db.query(`select last_run, detail from housekeeping where job = 'offsite'`)).rows[0];
  return { setUp: !!OFFSITE, lastRun: r ? r.last_run : null, last: r ? r.detail : null };
});
route('GET', '/api/admin/errors', async ({ req }) => { if (!isAdmin(req)) fail(404, 'Not found.', 'not_found'); return { errors: await errors.recent(100) }; });

// The app reports its own crashes (signed in or not), at most 30 a quarter-hour from one address.
route('POST', '/api/errors', async ({ req, s }) => {
  if (limited('apperr:' + clientIp(req), 30)) return { ok: false };
  const b = await readJson(req, 16 * 1024);
  await errors.record('app', String(b.where || ''), { message: String(b.message || 'unknown'), stack: String(b.stack || '') }, s ? s.family_id : null);
  return { ok: true };
});

route('POST', '/api/auth/signup', async ({ req, res }) => {
  const b = await readJson(req), email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || ''), name = String(b.name || '').trim().slice(0, 60);
  if (limited('signup:' + clientIp(req), 8)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  if (!validEmail(email)) fail(400, 'That email address doesn’t look right.', 'bad_email');
  if (pw.length < 8) fail(400, 'Use at least 8 characters for the password.', 'weak_password');
  if (b.consent !== true) fail(400, 'Tick the box to say you’re a parent or guardian and agree to the terms.', 'no_consent');
  if ((await db.query('select 1 from users where lower(email) = $1', [email])).rows.length) fail(409, 'There’s already an account with that email. Sign in instead.', 'exists');
  let invite = null;
  if (b.invite) {
    invite = (await db.query(`select * from invites where code = $1 and kind = 'parent' and used_at is null and expires_at > now()`, [String(b.invite).trim().toUpperCase()])).rows[0];
    if (!invite) fail(400, 'That invite code has expired or was already used.', 'bad_invite');
    await needRoom(invite.family_id, 'grownups');
  }
  const userId = randomUUID(), familyId = invite ? invite.family_id : randomUUID(), deviceId = randomUUID(), rec = recoveryCode();
  await db.tx(async t => {
    await t.q('insert into users (id, email, name, password_hash, recovery_hash, last_login_at) values ($1, $2, $3, $4, $5, now())', [userId, email, name, await hashPassword(pw), sha256(rec.replace(/-/g, ''))]);
    if (!invite) await t.q('insert into families (id, name, created_by) values ($1, $2, $3)', [familyId, String(b.familyName || '').trim().slice(0, 60) || (name ? `${name}'s family` : 'Our family'), userId]);
    else await t.q('update invites set used_at = now(), used_by = $2 where code = $1', [invite.code, userId]);
    // Every new family starts with Plus for its welcome fortnight, without paying.
    if (!invite && WELCOME_DAYS > 0) await t.q(`insert into entitlements (id, family_id, source, product_id, plan, expires_at) values ($1, $2, 'welcome', 'welcome', 'plus', now() + make_interval(days => $3::int))`, ['welcome:' + familyId, familyId, WELCOME_DAYS]);
    await t.q(`insert into family_members (family_id, user_id, role) values ($1, $2, 'parent')`, [familyId, userId]);
    await t.q(`insert into devices (id, family_id, user_id, kind, name, user_agent) values ($1, $2, $3, 'parent', $4, $5)`, [deviceId, familyId, userId, String(b.deviceName || 'Grown-up device').slice(0, 60), String(req.headers['user-agent'] || '').slice(0, 300)]);
    await t.q(`insert into consents (user_id, family_id, kind, version) values ($1, $2, 'guardian_terms', $3)`, [userId, familyId, TERMS_VERSION]);
  });
  const tok = await startSession(res, req, { familyId, deviceId, userId, role: 'parent' });
  const s = { family_id: familyId, device_id: deviceId, user_id: userId, role: 'parent', elevated: true, device_name: b.deviceName || 'Grown-up device' };
  await logEvent(s, invite ? 'auth.joined_family' : 'auth.signup', { email });
  if (!invite && WELCOME_DAYS > 0) await logEvent(s, 'plan.welcome', { days: WELCOME_DAYS });
  sendVerify(userId, email).catch(e => console.error('verify email failed', e.message));
  return { ...(await me(s)), recovery: rec, ...tok };
});

route('POST', '/api/auth/login', async ({ req, res }) => {
  const b = await readJson(req), email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || '');
  if (limited('login:' + clientIp(req), 20) || limited('login:' + email, 10)) fail(429, 'Too many tries. Wait 15 minutes, then try again.', 'slow_down');
  const u = (await db.query('select * from users where lower(email) = $1', [email])).rows[0];
  if (!u || !(await verifyPassword(pw, u.password_hash))) fail(401, 'That email and password don’t match.', 'bad_login');
  const m = (await db.query('select family_id from family_members where user_id = $1 order by joined_at limit 1', [u.id])).rows[0];
  if (!m) fail(403, 'This account isn’t part of a family yet.', 'no_family');
  const deviceId = randomUUID();
  await db.query(`insert into devices (id, family_id, user_id, kind, name, user_agent) values ($1, $2, $3, 'parent', $4, $5)`, [deviceId, m.family_id, u.id, String(b.deviceName || 'Grown-up device').slice(0, 60), String(req.headers['user-agent'] || '').slice(0, 300)]);
  await db.query('update users set last_login_at = now() where id = $1', [u.id]);
  const tok = await startSession(res, req, { familyId: m.family_id, deviceId, userId: u.id, role: 'parent' });
  const s = { family_id: m.family_id, device_id: deviceId, user_id: u.id, role: 'parent', elevated: true, device_name: b.deviceName || 'Grown-up device' };
  await logEvent(s, 'auth.login', {});
  return { ...(await me(s)), ...tok };
});

/* ---------- email: address checks and password reset ---------- */
async function emailToken(userId, kind, email, minutes) {
  const tok = newToken();
  await db.query(`insert into email_tokens (token_hash, user_id, kind, email, expires_at) values ($1, $2, $3, $4, now() + $5 * interval '1 minute')`, [sha256(tok), userId, kind, email, minutes]);
  return tok;
}
async function sendVerify(userId, email) {
  const tok = await emailToken(userId, 'verify', email, 3 * 24 * 60);
  return sendMail({ to: email, tag: 'verify', subject: 'Confirm your email for Chorecast',
    text: `Hi,\n\nTap this link to confirm this is your email address for Chorecast:\n\n${APP_URL}/chorecast/?verify=${tok}\n\nIt lasts 3 days. If you didn't make a Chorecast account, you can ignore this email.\n\nChorecast` });
}
// Finds an unused, unexpired token of this kind and marks it used. Returns its row or null.
async function useEmailToken(tok, kind) {
  const r = await db.query(`update email_tokens set used_at = now() where token_hash = $1 and kind = $2 and used_at is null and expires_at > now() returning user_id, email`, [sha256(String(tok || '')), kind]);
  return r.rows[0] || null;
}

route('POST', '/api/auth/verify/send', async ({ s }) => {
  needParent(s);
  if (limited('verify:' + s.user_id, 3, 60 * 60 * 1000)) fail(429, 'We’ve sent a few already. Check your junk folder, or try again in an hour.', 'slow_down');
  const u = (await db.query('select email, email_verified_at from users where id = $1', [s.user_id])).rows[0];
  if (u.email_verified_at) return { ok: true, verified: true };
  await sendVerify(s.user_id, u.email);
  return { ok: true, sent: true, mail: mailReady };
});

route('POST', '/api/auth/verify', async ({ req }) => {
  const b = await readJson(req);
  if (limited('verifytok:' + clientIp(req), 20)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  const t = await useEmailToken(b.token, 'verify');
  if (!t) fail(400, 'That link has expired or was already used. Send a new one from Grown-ups, then Family.', 'bad_token');
  await db.query('update users set email_verified_at = now() where id = $1 and lower(email) = lower($2)', [t.user_id, t.email]);
  return { ok: true };
});

// Always answers the same way, so it can't be used to find out who has an account.
route('POST', '/api/auth/reset/send', async ({ req }) => {
  const b = await readJson(req), email = String(b.email || '').trim().toLowerCase();
  if (limited('resetmail:' + clientIp(req), 5) || limited('resetmail:' + email, 3, 60 * 60 * 1000)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  if (!validEmail(email)) fail(400, 'That email address doesn’t look right.', 'bad_email');
  const u = (await db.query('select id, email from users where lower(email) = $1', [email])).rows[0];
  if (u) {
    const tok = await emailToken(u.id, 'reset', u.email, 60);
    await sendMail({ to: u.email, tag: 'reset', subject: 'Reset your Chorecast password',
      text: `Hi,\n\nSomeone asked to reset the password for this Chorecast account. To choose a new password, tap this link:\n\n${APP_URL}/chorecast/?reset=${tok}\n\nIt lasts an hour and works once. If it wasn't you, ignore this email and your password stays the same.\n\nChorecast` });
  }
  return { ok: true };
});

// A new password with the emailed link (token) or the recovery code from sign-up. Either way every device signs out.
route('POST', '/api/auth/reset', async ({ req }) => {
  const b = await readJson(req), pw = String(b.password || '');
  if (limited('reset:' + clientIp(req), 8)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  if (pw.length < 8) fail(400, 'Use at least 8 characters for the password.', 'weak_password');
  let userId;
  if (b.token) {
    const t = await useEmailToken(b.token, 'reset');
    if (!t) fail(400, 'That link has expired or was already used. Ask for a new one.', 'bad_token');
    userId = t.user_id;
    await db.query('update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1 and lower(email) = lower($2)', [t.user_id, t.email]);
  } else {
    const email = String(b.email || '').trim().toLowerCase(), code = String(b.recovery || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const u = (await db.query('select id, recovery_hash from users where lower(email) = $1', [email])).rows[0];
    if (!u || !u.recovery_hash || u.recovery_hash !== sha256(code)) fail(400, 'That email and recovery code don’t match.', 'bad_recovery');
    userId = u.id;
  }
  await db.query('update users set password_hash = $2 where id = $1', [userId, await hashPassword(pw)]);
  await db.query(`update email_tokens set used_at = now() where user_id = $1 and kind = 'reset' and used_at is null`, [userId]);
  await db.query('delete from sessions where user_id = $1', [userId]);
  return { ok: true };
});

route('POST', '/api/auth/logout', async ({ req, res, s }) => {
  if (s) { await db.query('delete from sessions where token_hash = $1', [s.token_hash]); await logEvent(s, 'auth.logout'); }
  res.setHeader('set-cookie', sessionCookie('', isSecure(req), 0));
  return { ok: true };
});

route('GET', '/api/auth/me', async ({ s }) => me(needSession(s)));

/* ---------- grown-up PIN and kids' passcodes ----------
   The codes live only in family_pins as salted scrypt hashes; devices send the digits. kidId '' (or none) is the
   grown-up PIN. Hashes from older versions of the app ('legacy$' + SHA-256 of 'chorecast|' and the digits, or 'h' + an
   FNV hash where the browser had no crypto) are checked the old way once, then upgraded. */
const PIN_RE = /^\d{4}$/;
const pinText = (kidId, pin) => 'chorecast|' + (kidId ? `kid|${kidId}|${pin}` : pin);
async function pinMatches(familyId, kidId, pin) {
  const row = (await db.query('select hash from family_pins where family_id = $1 and kid_id = $2', [familyId, kidId])).rows[0];
  if (!row) return null;
  if (!row.hash.startsWith('legacy$')) return verifyPassword(pin, row.hash);
  const old = row.hash.slice(7), txt = pinText(kidId, pin);
  if (old !== (old.startsWith('h') ? 'h' + fnv(txt).toString(16) : sha256(txt))) return false;
  await db.query('update family_pins set hash = $3 where family_id = $1 and kid_id = $2', [familyId, kidId, await hashPassword(pin)]);
  return true;
}
// 8 wrong codes from one device, or 20 across the family, in 15 minutes and it waits.
async function checkPin(s, kidId, pin) {
  if (hitCount('pinfail:' + s.device_id) >= 8 || hitCount('pinfail:' + s.family_id) >= 20) fail(429, 'Too many wrong tries. Wait 15 minutes, then try again.', 'slow_down');
  const ok = PIN_RE.test(String(pin || '')) ? await pinMatches(s.family_id, kidId, String(pin)) : false;
  if (ok === false) { limited('pinfail:' + s.device_id, 99); limited('pinfail:' + s.family_id, 99); await logEvent(s, kidId ? 'auth.kid_pin_wrong' : 'auth.pin_wrong', {}, kidId || null); }
  return ok;
}
const kidIdOf = b => (b.kidId ? String(b.kidId).slice(0, 80) : '');
async function needKid(s, kidId) { if (!(await db.query('select 1 from kids where family_id = $1 and id = $2', [s.family_id, kidId])).rows.length) fail(404, 'Kid not found.', 'not_found'); }

// Checks the grown-up PIN or a kid's passcode. The right grown-up PIN also unlocks grown-up changes on a kid's iPad for
// 30 minutes.
route('POST', '/api/pin/check', async ({ req, s }) => {
  needSession(s); const b = await readJson(req), kidId = kidIdOf(b);
  const ok = await checkPin(s, kidId, b.pin);
  if (ok === null) fail(404, kidId ? 'There’s no passcode on this account.' : 'There’s no grown-up PIN yet.', 'no_pin');
  if (!ok) fail(403, kidId ? 'That’s not it. Try again.' : 'Wrong PIN. Try again.', 'bad_pin');
  if (!kidId) {
    if (s.role === 'kid') await db.query(`update sessions set elevated_until = now() + interval '30 minutes' where token_hash = $1`, [s.token_hash]);
    await logEvent(s, 'auth.unlocked');
  }
  return { ok: true };
});

// Sets the grown-up PIN (a grown-up's phone, or a kid's iPad already unlocked with the PIN) or a kid's passcode (the
// first one, a new one with the old one, or any one from an unlocked grown-up).
route('PUT', '/api/pin', async ({ req, s }) => {
  needSession(s); const b = await readJson(req), kidId = kidIdOf(b), pin = String(b.pin || '');
  if (!PIN_RE.test(pin)) fail(400, 'Use 4 digits.', 'bad_pin');
  if (!kidId) { if (!s.elevated) fail(403, 'Set the grown-up PIN on a grown-up’s phone first.', 'locked'); }
  else {
    await needKid(s, kidId);
    if (!s.elevated) {
      const ok = b.old == null ? null : await checkPin(s, kidId, b.old);
      if (ok === false || (ok === null && (await db.query('select 1 from family_pins where family_id = $1 and kid_id = $2', [s.family_id, kidId])).rows.length)) fail(403, 'Type your old passcode first.', 'bad_old');
    }
  }
  await db.query(`insert into family_pins (family_id, kid_id, hash, set_by) values ($1, $2, $3, $4)
    on conflict (family_id, kid_id) do update set hash = excluded.hash, set_by = excluded.set_by, set_at = now()`, [s.family_id, kidId, await hashPassword(pin), s.user_id || s.device_id]);
  await writeDoc(s, kidId ? 'kids' : 'family', kidId || 'settings', kidId ? { pin: true } : { pinSet: true }, true, null, true);
  await logEvent(s, kidId ? 'auth.kid_pin_set' : 'auth.pin_set', {}, kidId || null);
  return { ok: true };
});

// Turns a kid's passcode off: an unlocked grown-up, or the kid with their passcode. The grown-up PIN can only change.
route('POST', '/api/pin/clear', async ({ req, s }) => {
  needSession(s); const b = await readJson(req), kidId = kidIdOf(b);
  if (!kidId) fail(400, 'The grown-up PIN can be changed but not turned off.', 'bad_request');
  await needKid(s, kidId);
  if (!s.elevated && !(await checkPin(s, kidId, b.old))) fail(403, 'Type your passcode first.', 'bad_old');
  await db.query('delete from family_pins where family_id = $1 and kid_id = $2', [s.family_id, kidId]);
  await writeDoc(s, 'kids', kidId, { pin: null }, true, null, true);
  await logEvent(s, 'auth.kid_pin_off', {}, kidId);
  return { ok: true };
});

route('POST', '/api/auth/lock', async ({ s }) => {
  needSession(s); await db.query('update sessions set elevated_until = null where token_hash = $1', [s.token_hash]);
  return { ok: true };
});

route('PATCH', '/api/family', async ({ req, s }) => {
  needParent(s); const b = await readJson(req), name = String(b.name || '').trim().slice(0, 60);
  if (name) await db.query('update families set name = $2 where id = $1', [s.family_id, name]);
  return me(s);
});

// Deletes a grown-up's account (scope 'me') or the whole family (scope 'family'), after the password. The last
// grown-up always takes the family with them. A family's kids, jobs, photos, lesson answers, events and devices go with
// it (their tables cascade from families); the change log doesn't, so it's cleared here. Grown-ups who belonged only
// to this family lose their sign-in too.
route('POST', '/api/account/delete', async ({ req, res, s }) => {
  needParent(s); const b = await readJson(req);
  if (limited('delete:' + s.user_id, 5)) fail(429, 'Too many tries. Wait 15 minutes, then try again.', 'slow_down');
  const u = (await db.query('select password_hash from users where id = $1', [s.user_id])).rows[0];
  if (!u || !(await verifyPassword(String(b.password || ''), u.password_hash))) fail(403, 'That password isn’t right.', 'bad_password');
  const others = (await db.query('select user_id from family_members where family_id = $1 and user_id <> $2', [s.family_id, s.user_id])).rows.length;
  const whole = b.scope === 'family' || !others;
  if (whole) {
    const devices = (await db.query('select id from devices where family_id = $1', [s.family_id])).rows.map(r => r.id);
    await db.tx(async t => {
      const only = (await t.q(`select m.user_id from family_members m where m.family_id = $1
        and not exists (select 1 from family_members o where o.user_id = m.user_id and o.family_id <> $1)`, [s.family_id])).rows.map(r => r.user_id);
      await t.q('delete from doc_changes where family_id = $1', [s.family_id]);
      await t.q('delete from families where id = $1', [s.family_id]);
      if (only.length) await t.q('delete from users where id = any($1)', [only]);
    });
    for (const d of devices) closeDeviceStreams(d);
    console.log('family deleted');
  } else {
    const devices = (await db.query('select id from devices where user_id = $1', [s.user_id])).rows.map(r => r.id);
    await db.tx(async t => {
      await t.q('update devices set revoked_at = now() where user_id = $1', [s.user_id]);
      await t.q('update events set user_id = null where user_id = $1', [s.user_id]);
      await t.q('update doc_changes set user_id = null where user_id = $1', [s.user_id]);
      await t.q('delete from users where id = $1', [s.user_id]);
    });
    for (const d of devices) closeDeviceStreams(d);
    await logEvent({ ...s, user_id: null, device_id: null }, 'auth.account_deleted', {});
  }
  res.setHeader('set-cookie', sessionCookie('', isSecure(req), 0));
  return { ok: true, deleted: whole ? 'family' : 'me' };
});

route('POST', '/api/family/invite', async ({ s }) => {
  needParent(s); const code = wordCode(8);
  await db.query(`insert into invites (code, family_id, kind, created_by, expires_at) values ($1, $2, 'parent', $3, now() + interval '7 days')`, [code, s.family_id, s.user_id]);
  await logEvent(s, 'family.invite_created');
  return { code, expiresInDays: 7 };
});

route('POST', '/api/devices/code', async ({ s }) => {
  needParent(s); let code;
  for (let i = 0; i < 5; i++) { code = digitCode(6); if (!(await db.query('select 1 from invites where code = $1', [code])).rows.length) break; }
  await db.query(`insert into invites (code, family_id, kind, created_by, expires_at) values ($1, $2, 'device', $3, now() + interval '15 minutes')`, [code, s.family_id, s.user_id]);
  await logEvent(s, 'device.code_created');
  return { code, expiresInMinutes: 15 };
});

route('POST', '/api/devices/pair', async ({ req, res }) => {
  const b = await readJson(req), code = String(b.code || '').replace(/\D/g, '');
  if (limited('pair:' + clientIp(req), 10)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  const inv = (await db.query(`select * from invites where code = $1 and kind = 'device' and used_at is null and expires_at > now()`, [code])).rows[0];
  if (!inv) fail(400, 'That code didn’t work. Codes last 15 minutes, so ask a grown-up for a new one.', 'bad_code');
  const deviceId = randomUUID(), name = String(b.name || 'Kids’ iPad').trim().slice(0, 60) || 'Kids’ iPad';
  await db.query(`insert into devices (id, family_id, kind, name, user_agent) values ($1, $2, 'kid', $3, $4)`, [deviceId, inv.family_id, name, String(req.headers['user-agent'] || '').slice(0, 300)]);
  await db.query('update invites set used_at = now(), used_by = $2 where code = $1', [code, deviceId]);
  const tok = await startSession(res, req, { familyId: inv.family_id, deviceId, role: 'kid' });
  const s = { family_id: inv.family_id, device_id: deviceId, role: 'kid', elevated: false, device_name: name };
  await logEvent(s, 'device.paired', { name });
  return { ...(await me(s)), ...tok };
});

route('GET', '/api/devices', async ({ s }) => {
  needParent(s);
  const rows = (await db.query(`select d.id, d.kind, d.name, d.created_at, d.last_seen_at, u.name as owner from devices d left join users u on u.id = d.user_id
    where d.family_id = $1 and d.revoked_at is null order by d.last_seen_at desc`, [s.family_id])).rows;
  return { devices: rows.map(r => ({ ...r, current: r.id === s.device_id })) };
});

route('DELETE', '/api/devices/:id', async ({ s, p }) => {
  needParent(s);
  const r = await db.query('update devices set revoked_at = now() where id = $1 and family_id = $2 returning id', [p.id, s.family_id]);
  if (!r.rows.length) fail(404, 'Device not found.', 'not_found');
  await db.query('delete from sessions where device_id = $1', [p.id]);
  closeDeviceStreams(p.id);
  await logEvent(s, 'device.removed', { device: p.id });
  return { ok: true };
});

route('GET', '/api/sync', async ({ s }) => snapshot(needSession(s).family_id));

route('POST', '/api/stream/ticket', async ({ s }) => {
  needSession(s); const ticket = newToken();
  for (const [k, t] of streamTickets) if (t.expires < Date.now()) streamTickets.delete(k);
  streamTickets.set(ticket, { hash: s.token_hash, expires: Date.now() + 60 * 1000 });
  return { ticket };
});

route('GET', '/api/stream', async ({ req, res, s, url }) => {
  needSession(s);
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write('retry: 3000\n\n');
  const c = { res, clientId: url.searchParams.get('client') || '', deviceId: s.device_id };
  if (!streams.has(s.family_id)) streams.set(s.family_id, new Set());
  streams.get(s.family_id).add(c);
  req.on('close', () => { const set = streams.get(s.family_id); if (set) { set.delete(c); if (!set.size) streams.delete(s.family_id); } });
  return undefined; // stays open
});

route('PUT', '/api/docs/:col/:id', async ({ req, s, p }) => { needSession(s); return writeDoc(s, p.col, decodeURIComponent(p.id), await readJson(req), false, req.headers['x-client-id']); });
route('PATCH', '/api/docs/:col/:id', async ({ req, s, p }) => { needSession(s); return writeDoc(s, p.col, decodeURIComponent(p.id), await readJson(req), true, req.headers['x-client-id']); });
route('DELETE', '/api/docs/:col/:id', async ({ req, s, p }) => { needSession(s); await deleteDoc(s, p.col, decodeURIComponent(p.id), req.headers['x-client-id']); return { ok: true }; });

// Moves a device's existing local data into a new, empty family account.
route('POST', '/api/import', async ({ req, s }) => {
  needParent(s); const b = await readJson(req, 20 * 1024 * 1024);
  const has = (await db.query('select count(*)::int as n from kids where family_id = $1', [s.family_id])).rows[0].n;
  if (has && !b.force) fail(409, 'This family already has kids saved.', 'not_empty');
  if (b.settings) await writeDoc(s, 'family', 'settings', b.settings, true);
  for (const col of ['kids', 'jobs', 'habits', 'growth', 'guides']) for (const [id, d] of Object.entries(b[col] || {})) await writeDoc(s, col, id, d, true);
  // The device's PIN and passcodes come along as old-style hashes, checked and upgraded when next typed.
  const pins = [['', b.settings && b.settings.pinHash], ...Object.entries(b.kids || {}).map(([id, k]) => [id, k && k.pin])].filter(([, h]) => typeof h === 'string' && h);
  for (const [kidId, h] of pins) {
    await db.query(`insert into family_pins (family_id, kid_id, hash) values ($1, $2, $3) on conflict do nothing`, [s.family_id, kidId, 'legacy$' + h]);
    await writeDoc(s, kidId ? 'kids' : 'family', kidId || 'settings', kidId ? { pin: true } : { pinSet: true }, true, null, true);
  }
  await logEvent(s, 'family.imported', { kids: Object.keys(b.kids || {}).length, jobs: Object.keys(b.jobs || {}).length });
  return { ok: true };
});

/* ---------- plans and purchases ----------
   Grown-ups buy in the iOS app with StoreKit 2; the app sends the signed transaction here, and Apple's server
   notifications keep it current (renewals, expiry, refunds). With PAYWALL unset every family has everything. */
async function needRoom(familyId, what) {
  const p = await planOf(db, familyId);
  if (what === 'kids') {
    const n = (await db.query(`select count(*)::int as n from kids where family_id = $1 and coalesce(data->>'example', '') <> 'true'`, [familyId])).rows[0].n;
    if (n >= p.limits.kids) fail(402, `The ${p.limits.name} plan has room for ${p.limits.kids} kids. Plus has room for everyone.`, 'plan_limit');
  } else {
    const n = (await db.query('select count(*)::int as n from family_members where family_id = $1', [familyId])).rows[0].n;
    if (n >= p.limits.grownups) fail(402, `This family’s plan has room for ${p.limits.grownups} grown-up${p.limits.grownups === 1 ? '' : 's'}. A grown-up already in it can change the plan.`, 'plan_limit');
  }
}
const foundingLeft = async () => Math.max(0, FOUNDING_SEATS - (await db.query('select count(*)::int as n from entitlements where founding and revoked_at is null')).rows[0].n);

// One App Store transaction (a purchase, a restore or a notification) into the family's entitlements. Rows only move
// forward in time, so a late, older notification can't shorten a renewal that already arrived.
async function saveAppleTransaction(tx, familyId, renewal = null) {
  if (tx.bundleId !== BUNDLE_ID) fail(400, 'That purchase is for a different app.', 'wrong_app');
  const p = PRODUCTS[tx.productId]; if (!p) fail(400, 'That isn’t a Chorecast product.', 'unknown_product');
  if (p.kid) return; // XP bundles and the Island Club are granted to their kid by /api/shop/buy
  const id = 'apple:' + tx.originalTransactionId;
  const cur = (await db.query('select family_id from entitlements where id = $1', [id])).rows[0];
  if (cur && cur.family_id !== familyId) fail(409, 'That purchase belongs to another Chorecast family.', 'other_family');
  const ms = v => (v ? new Date(Number(v)) : null);
  await db.query(`insert into entitlements (id, family_id, source, product_id, plan, lifetime, founding, starts_at, expires_at, revoked_at, auto_renew, in_trial, environment, updated_at, last_payload)
    values ($1, $2, 'app_store', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13::jsonb)
    on conflict (id) do update set product_id = excluded.product_id, plan = excluded.plan, lifetime = excluded.lifetime, founding = excluded.founding,
      expires_at = case when entitlements.expires_at is null or excluded.expires_at is null then excluded.expires_at else greatest(entitlements.expires_at, excluded.expires_at) end,
      revoked_at = coalesce(excluded.revoked_at, entitlements.revoked_at), auto_renew = coalesce(excluded.auto_renew, entitlements.auto_renew),
      in_trial = excluded.in_trial, environment = excluded.environment, updated_at = now(), last_payload = excluded.last_payload`,
    [id, familyId, tx.productId, p.pack ? 'pack:' + p.pack : p.plan, !!p.lifetime, !!p.founding, ms(tx.originalPurchaseDate || tx.purchaseDate) || new Date(), ms(tx.expiresDate), ms(tx.revocationDate),
      renewal ? renewal.autoRenewStatus === 1 : null, tx.offerType === 1, tx.environment || null, JSON.stringify(tx)]);
}

route('GET', '/api/plan', async ({ s }) => {
  needSession(s);
  const moments = Object.fromEntries((await db.query(`select moment, max(shown_at) as at from plan_moments where family_id = $1 group by moment`, [s.family_id])).rows.map(r => [r.moment, new Date(r.at).getTime()]));
  return { ...(await planOf(db, s.family_id)), paywall: PAYWALL, plans: PLANS, products: Object.keys(PRODUCTS), foundingLeft: await foundingLeft(), appAccountToken: s.family_id, moments };
});

// Upgrade moments: a card in Grown-ups when Plus would help (a kid finished unit 1, a wish for a Plus thing, the
// starter island filled, the welcome fortnight ending). Each is recorded when shown and again when acted on, so the app
// can space them out (at most one a day, each at most once a fortnight) and we can see which ones help families.
const MOMENTS = new Set(['unit1', 'wish', 'starter', 'welcome', 'ended', 'recap']);
const MOMENT_ACTIONS = new Set(['shown', 'plans', 'pack', 'dismiss', 'gift', 'job']);
route('POST', '/api/plan/moment', async ({ req, s }) => {
  needElevated(s); const b = await readJson(req);
  const moment = String(b.moment || ''), action = String(b.action || 'shown');
  if (!MOMENTS.has(moment) || !MOMENT_ACTIONS.has(action)) fail(400, 'Unknown moment.', 'bad_moment');
  const kidId = b.kidId ? String(b.kidId).slice(0, 80) : null;
  await db.query('insert into plan_moments (family_id, kid_id, moment, action) values ($1, $2, $3, $4)', [s.family_id, kidId, moment, action]);
  await logEvent(s, 'plan.moment', { moment, action }, kidId);
  return { ok: true };
});

// A purchase or restore from the iOS app: one signed transaction, or a list of them.
route('POST', '/api/purchases/apple', async ({ req, s }) => {
  needElevated(s); const b = await readJson(req);
  const list = (Array.isArray(b.transactions) ? b.transactions : [b.transaction]).filter(Boolean).slice(0, 50);
  for (const jws of list) {
    let tx; try { tx = verifyAppleJws(jws, appleOpts); } catch (e) { fail(400, 'That purchase couldn’t be checked with Apple.', 'bad_receipt'); }
    if (tx.appAccountToken && tx.appAccountToken.toLowerCase() !== String(s.family_id).toLowerCase()) fail(409, 'That purchase belongs to another Chorecast family.', 'other_family');
    await saveAppleTransaction(tx, s.family_id);
  }
  await logEvent(s, 'plan.purchase', { count: list.length });
  return { ok: true, saved: list.length, ...(await planOf(db, s.family_id)) };
});

// App Store Server Notifications V2. Set this URL in App Store Connect for both production and sandbox.
route('POST', '/api/appstore/notifications', async ({ req }) => {
  const b = await readJson(req, 256 * 1024);
  let n, tx = null, renewal = null;
  try {
    n = verifyAppleJws(b.signedPayload, appleOpts); const d = n.data || {};
    if (d.signedTransactionInfo) tx = verifyAppleJws(d.signedTransactionInfo, appleOpts);
    if (d.signedRenewalInfo) renewal = verifyAppleJws(d.signedRenewalInfo, appleOpts);
  } catch (e) { fail(400, 'Bad signature.', 'bad_signature'); }
  const stored = { ...n, data: n.data ? { ...n.data, signedTransactionInfo: undefined, signedRenewalInfo: undefined } : undefined, tx, renewal };
  const fresh = await db.query(`insert into app_store_notifications (uuid, type, subtype, original_transaction_id, payload) values ($1, $2, $3, $4, $5::jsonb) on conflict (uuid) do nothing returning uuid`,
    [String(n.notificationUUID || randomUUID()), String(n.notificationType || '?'), n.subtype || null, tx ? String(tx.originalTransactionId) : null, JSON.stringify(stored)]);
  if (!fresh.rows.length || !tx || !PRODUCTS[tx.productId] || tx.bundleId !== BUNDLE_ID) return { ok: true };
  // Whose it is: the family already holding it, or the family id the app set as appAccountToken when buying.
  let familyId = ((await db.query('select family_id from entitlements where id = $1', ['apple:' + tx.originalTransactionId])).rows[0] || {}).family_id;
  if (!familyId && tx.appAccountToken) familyId = ((await db.query('select id from families where lower(id) = lower($1)', [tx.appAccountToken])).rows[0] || {}).id;
  if (!familyId && PRODUCTS[tx.productId].kid) familyId = ((await db.query('select family_id from purchases where original_id = $1 limit 1', ['apple:' + tx.originalTransactionId])).rows[0] || {}).family_id;
  if (!familyId) return { ok: true };
  if (PRODUCTS[tx.productId].kid) { await shopNotice(String(n.notificationType || ''), tx, familyId); return { ok: true }; }
  await saveAppleTransaction(tx, familyId, renewal);
  await db.query('update app_store_notifications set family_id = $2 where uuid = $1', [String(n.notificationUUID), familyId]);
  const life = { SUBSCRIBED: 'plan.buy', DID_RENEW: 'plan.renew', EXPIRED: 'plan.lapse', REFUND: 'plan.refund', DID_CHANGE_RENEWAL_STATUS: n.subtype === 'AUTO_RENEW_DISABLED' ? 'plan.cancel' : n.subtype === 'AUTO_RENEW_ENABLED' ? 'plan.resume' : null }[n.notificationType];
  if (life) await db.query('insert into events (family_id, type, payload) values ($1, $2, $3::jsonb)', [familyId, life, JSON.stringify({ product: tx.productId, subtype: n.subtype || null })]);
  return { ok: true };
});

/* ---------- the family shop ----------
   Grown-ups (behind the PIN; nothing is sold to kids) buy XP bundles and the Island Club for one kid, and lesson packs
   for the whole family. In the iOS app StoreKit's signed transaction comes here and is checked with Apple; with
   STORE_TEST=on (local and test servers) a test purchase is granted without payment. Each purchase is granted once.
   The family's weekly limit on bought XP per kid (settings.buyCap) is checked before a test purchase; the app checks
   it before taking payment. The Island Club renews and refunds arrive as App Store notifications (shopNotice). */
const STORE_TEST = process.env.STORE_TEST === 'on';
const weekXp = async (familyId, kidId) => (await db.query(`select coalesce(sum(xp), 0)::int as n from purchases where family_id = $1 and kid_id = $2 and refunded_at is null and created_at > now() - interval '7 days'`, [familyId, kidId])).rows[0].n;
route('GET', '/api/shop', async ({ s }) => {
  needSession(s); const p = await planOf(db, s.family_id);
  const bought = (await db.query('select id, kid_id, product_id, xp, source, created_at from purchases where family_id = $1 and refunded_at is null order by created_at desc limit 60', [s.family_id])).rows;
  const week = Object.fromEntries((await db.query(`select kid_id, sum(xp)::int as n from purchases where family_id = $1 and kid_id is not null and refunded_at is null and created_at > now() - interval '7 days' group by kid_id`, [s.family_id])).rows.map(r => [r.kid_id, r.n]));
  return { test: STORE_TEST, plan: p.plan, packs: p.packs, bought, week, clubPrize: clubPrize() };
});
route('POST', '/api/shop/buy', async ({ req, s }) => {
  needElevated(s); const b = await readJson(req);
  let productId = String(b.productId || ''), id, original = null, source = 'test', env = 'test';
  if (b.transaction) {
    let tx; try { tx = verifyAppleJws(b.transaction, appleOpts); } catch (e) { fail(400, 'That purchase couldn’t be checked with Apple.', 'bad_receipt'); }
    if (tx.bundleId !== BUNDLE_ID) fail(400, 'That purchase is for a different app.', 'wrong_app');
    productId = tx.productId; id = 'apple:' + tx.transactionId; original = 'apple:' + tx.originalTransactionId; source = 'app_store'; env = tx.environment || null;
  } else if (!STORE_TEST) fail(403, 'Buying opens in the Chorecast app on iPhone or iPad.', 'app_only');
  else id = original = 'test:' + randomUUID();
  const p = PRODUCTS[productId]; if (!p || !(p.kid || p.pack)) fail(400, 'That isn’t in the shop.', 'unknown_product');
  const kidId = p.kid ? String(b.kidId || '') : null;
  if (p.kid && !(await db.query('select 1 from kids where family_id = $1 and id = $2', [s.family_id, kidId])).rows.length) fail(400, 'Pick which kid it’s for.', 'no_kid');
  if (p.xp && source === 'test') {
    const set = asObj(((await db.query('select data from family_settings where family_id = $1', [s.family_id])).rows[0] || {}).data), cap = set.buyCap == null ? 5000 : Number(set.buyCap) || 0; // 5,000 XP a week per kid unless a grown-up changes it
    if (cap && (await weekXp(s.family_id, kidId)) + p.xp > cap) fail(409, `That’s more than the ${cap.toLocaleString('en-NZ')} XP a week you set for each kid.`, 'over_cap');
  }
  const fresh = await db.query('insert into purchases (id, original_id, family_id, kid_id, product_id, xp, source, environment) values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing returning id', [id, original, s.family_id, kidId, productId, p.xp || 0, source, env]);
  if (!fresh.rows.length) return { ok: true, again: true, ...(await planOf(db, s.family_id)) };
  if (p.xp) await giveXp(s.family_id, kidId, p.xp, p.club ? 'Island Club: this month’s XP' : `XP from a grown-up: ${p.xp.toLocaleString('en-NZ')} XP`, p.club, b.wish ? String(b.wish).slice(0, 40) : null);
  if (p.pack) await db.query(`insert into entitlements (id, family_id, source, product_id, plan, lifetime, environment) values ($1, $2, $3, $4, $5, true, $6) on conflict (id) do nothing`,
    ['shop:' + id, s.family_id, source === 'test' ? 'grant' : 'app_store', productId, 'pack:' + p.pack, env]);
  await logEvent(s, 'shop.buy', { product: productId, kid: kidId, xp: p.xp || 0, test: source === 'test' });
  return { ok: true, ...(await planOf(db, s.family_id)) };
});
// XP from a purchase: added to the kid's island (island.paidXp, which only purchases change) and shown on their
// statement. A gift for a wish (`wish`, the item) takes it off their wish list. An Island Club month also brings the
// month's members-only prize, the golden name sign, and membership until a month from now.
async function giveXp(familyId, kidId, xp, memo, club, wish = null) {
  const k = asObj((await db.query('select data from kids where family_id = $1 and id = $2', [familyId, kidId])).rows[0].data), isl = k.island || {};
  const ledger = [{ id: randomUUID().slice(0, 12), at: Date.now(), kind: 'xp', amt: 0, xp, memo, gift: club ? 'club' : 'xp' }, ...(k.ledger || [])].slice(0, 240);
  const island = { paidXp: (isl.paidXp || 0) + xp };
  if (club) {
    const prize = clubPrize(); island.club = { since: (isl.club && isl.club.since) || Date.now(), until: Date.now() + 31 * 864e5, prize };
    island.won = { ...(isl.won || {}), [prize]: ((isl.won || {})[prize] || 0) + 1 }; island.owned = { ...(isl.owned || {}), 'sign:gold': (isl.owned || {})['sign:gold'] || 'won' };
  }
  const patch = { island, ledger };
  if (wish) {
    await db.query('update shop_wishes set granted_at = now() where family_id = $1 and kid_id = $2 and item = $3 and granted_at is null', [familyId, kidId, wish]);
    patch.wishes = (Array.isArray(k.wishes) ? k.wishes : []).filter(w => w && w.t !== wish); if (k.wish && k.wish.t === wish) patch.wish = null;
  }
  await writeDoc(serverSession(familyId), 'kids', kidId, patch, true, null, true);
}
// An App Store notification about something bought for a kid: each Island Club renewal grants that month, and a
// refunded XP bundle takes its XP back (as far as the kid has it).
async function shopNotice(type, tx, familyId) {
  const p = PRODUCTS[tx.productId], first = (await db.query('select kid_id from purchases where original_id = $1 order by created_at limit 1', ['apple:' + tx.originalTransactionId])).rows[0];
  if (!first || !first.kid_id) return;
  if (type === 'DID_RENEW' && p.club) {
    const fresh = await db.query('insert into purchases (id, original_id, family_id, kid_id, product_id, xp, source, environment) values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing returning id', ['apple:' + tx.transactionId, 'apple:' + tx.originalTransactionId, familyId, first.kid_id, tx.productId, p.xp, 'app_store', tx.environment || null]);
    if (fresh.rows.length) await giveXp(familyId, first.kid_id, p.xp, 'Island Club: this month’s XP', true);
  }
  if (type === 'REFUND') {
    const r = (await db.query('update purchases set refunded_at = now() where id = $1 and refunded_at is null returning xp', ['apple:' + tx.transactionId])).rows[0]; if (!r || !r.xp) return;
    const k = asObj((await db.query('select data from kids where family_id = $1 and id = $2', [familyId, first.kid_id])).rows[0].data), isl = k.island || {}, back = Math.min(r.xp, isl.paidXp || 0);
    await writeDoc(serverSession(familyId), 'kids', first.kid_id, { island: { paidXp: (isl.paidXp || 0) - back }, ledger: [{ id: randomUUID().slice(0, 12), at: Date.now(), kind: 'xp', amt: 0, xp: -back, memo: 'Refunded XP bundle' }, ...(k.ledger || [])].slice(0, 240) }, true, null, true);
  }
}

// The iOS app's push address for this device (and its time zone, for reminders). DELETE stops pushes to it.
route('PUT', '/api/push', async ({ req, s }) => {
  needSession(s); const b = await readJson(req), token = String(b.token || '');
  if (!/^[0-9a-f]{64,200}$/i.test(token)) fail(400, 'That isn’t a push token.', 'bad_token');
  const env = b.environment === 'sandbox' ? 'sandbox' : 'production', tz = typeof b.tz === 'string' ? b.tz.slice(0, 60) : null;
  await db.query(`insert into push_devices (device_id, family_id, token, environment, tz) values ($1, $2, $3, $4, $5)
    on conflict (device_id) do update set token = excluded.token, environment = excluded.environment, tz = excluded.tz, updated_at = now(), failed_at = null`, [s.device_id, s.family_id, token, env, tz]);
  return { ok: true };
});
route('DELETE', '/api/push', async ({ s }) => { needSession(s); await db.query('delete from push_devices where device_id = $1', [s.device_id]); return { ok: true }; });

route('POST', '/api/photos', async ({ req, s, url }) => {
  needSession(s);
  const mime = String(req.headers['content-type'] || ''), kind = url.searchParams.get('kind') || 'proof';
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) fail(415, 'Photos must be JPEG, PNG or WebP.', 'bad_type');
  if (!['proof', 'step', 'guide'].includes(kind)) fail(400, 'Unknown photo kind.', 'bad_kind');
  if (kind === 'guide' && !s.elevated) fail(403, 'A grown-up needs to unlock this first.', 'locked');
  const buf = await readBody(req, 8 * 1024 * 1024), id = randomUUID();
  await db.query('insert into photos (id, family_id, mime, bytes, size, created_by, kind) values ($1, $2, $3, $4, $5, $6, $7)', [id, s.family_id, mime, buf, buf.length, s.device_id, kind]);
  return { id };
});

/* ---------- Language courses: review cards and recordings ----------
   A kid's cards are made when they pass a lesson (checked against their growth doc), and a card moves one box per
   answer, only when it's due. Days are the device's own (within a day of the server's), so a card due tomorrow in
   Aotearoa is due on the kid's tomorrow. Recordings are for languages with no device voice; only content editors
   make them, and anyone can play them. */
const LANG_IDS = ['mi', 'es', 'zh', 'ja'], LBOX = [1, 3, 7, 16, 35, 90], CARD_RE = /^[^:]{1,160}:[rp]$/u;
const dayOf = t => { const now = Date.now(), d = /^\d{4}-\d{2}-\d{2}$/.test(t || '') ? Date.parse(t + 'T00:00:00Z') : NaN; return Math.abs(d - now) < 2 * 864e5 ? t : new Date(now).toISOString().slice(0, 10); };
const plusDays = (day, n) => new Date(Date.parse(day + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
async function langKid(s, kidId, lang) {
  needSession(s);
  if (!LANG_IDS.includes(lang)) fail(400, 'Unknown language.', 'bad_lang');
  if (!(await db.query('select 1 from kids where family_id = $1 and id = $2', [s.family_id, String(kidId || '')])).rows.length) fail(404, 'Kid not found.', 'not_found');
  return String(kidId);
}
route('GET', '/api/lang/cards', async ({ s, url }) => {
  const lang = url.searchParams.get('lang'), kid = await langKid(s, url.searchParams.get('kid'), lang), today = dayOf(url.searchParams.get('today'));
  const since = new Date(Math.max(Date.now() - 36 * 3600e3, +url.searchParams.get('since') || Date.now() - 24 * 3600e3));
  const rows = (await db.query(`select card, lesson_id, box, to_char(due, 'YYYY-MM-DD') as due, right_n, wrong_n, to_char(last_on, 'YYYY-MM-DD') as last_on from lang_cards where family_id = $1 and kid_id = $2 and lang = $3`, [s.family_id, kid, lang])).rows;
  const st = (await db.query(`select count(*) filter (where created_at > now() - interval '7 days')::int as wn, count(*) filter (where created_at > now() - interval '7 days' and correct)::int as wr,
      count(*) filter (where gap_days >= 28)::int as mn, count(*) filter (where gap_days >= 28 and correct)::int as mr, count(*) filter (where created_at >= $4)::int as dn
    from lang_reviews where family_id = $1 and kid_id = $2 and lang = $3 and created_at > now() - interval '120 days'`, [s.family_id, kid, lang, since])).rows[0];
  return { cards: rows.map(r => ({ card: r.card, lesson: r.lesson_id, box: r.box, due: r.due, right: r.right_n, wrong: r.wrong_n, last: r.last_on })), stats: { day: today, n: st.dn, week: { n: st.wn, right: st.wr }, month: { n: st.mn, right: st.mr } } };
});
route('POST', '/api/lang/learn', async ({ req, s }) => {
  const b = await readJson(req, 64 * 1024), lang = String(b.lang || ''), kid = await langKid(s, b.kid, lang), today = dayOf(b.today);
  const cards = (Array.isArray(b.cards) ? b.cards : []).slice(0, 60).filter(c => c && CARD_RE.test(String(c.card)) && String(c.card).endsWith(':r') && /^[a-z]{2}\.s\d+\.\d+\.\d+$/.test(String(c.lesson)) && String(c.lesson).startsWith(lang + '.'));
  const done = asObj(((await db.query('select data from growth_progress where family_id = $1 and id = $2', [s.family_id, kid])).rows[0] || {}).data).done || {};
  const ok = cards.filter(c => (done[c.lesson] || {}).best >= 0.8);
  if (cards.length && !ok.length) fail(409, 'That lesson isn’t passed yet.', 'not_passed');
  for (const c of ok) {
    const box = done[c.lesson].placed && +c.box === 3 ? 3 : 1;
    await db.query('insert into lang_cards (family_id, kid_id, lang, card, lesson_id, box, due) values ($1, $2, $3, $4, $5, $6, $7) on conflict do nothing', [s.family_id, kid, lang, c.card, c.lesson, box, plusDays(today, LBOX[box - 1])]);
  }
  return { ok: true, added: ok.length };
});
route('POST', '/api/lang/answers', async ({ req, s }) => {
  const b = await readJson(req, 64 * 1024), lang = String(b.lang || ''), kid = await langKid(s, b.kid, lang), today = dayOf(b.today);
  const list = (Array.isArray(b.answers) ? b.answers : []).slice(0, 80).filter(a => a && CARD_RE.test(String(a.card)));
  let moved = 0;
  await db.tx(async t => {
    const key = [s.family_id, kid, lang];
    for (const a of list) {
      const c = (await t.q(`select box, to_char(due, 'YYYY-MM-DD') as due, to_char(coalesce(last_on, created_at::date), 'YYYY-MM-DD') as seen, lesson_id from lang_cards where family_id = $1 and kid_id = $2 and lang = $3 and card = $4 for update`, [...key, a.card])).rows[0];
      if (!c) continue;
      const ok = !!a.ok, gap = Math.round((Date.parse(today) - Date.parse(c.seen)) / 864e5), ms = Number.isFinite(+a.ms) ? Math.min(600000, Math.max(0, Math.round(+a.ms))) : null;
      await t.q('insert into lang_reviews (family_id, kid_id, lang, card, correct, box_before, gap_days, ms) values ($1, $2, $3, $4, $5, $6, $7, $8)', [...key, a.card, ok, c.box, gap, ms]);
      if (c.due > today) { await t.q('update lang_cards set right_n = right_n + $5, wrong_n = wrong_n + $6, last_on = $7 where family_id = $1 and kid_id = $2 and lang = $3 and card = $4', [...key, a.card, ok ? 1 : 0, ok ? 0 : 1, today]); continue; }
      const box = ok ? Math.min(LBOX.length, c.box + 1) : 1; moved++;
      await t.q('update lang_cards set box = $5, due = $6, right_n = right_n + $7, wrong_n = wrong_n + $8, last_on = $9 where family_id = $1 and kid_id = $2 and lang = $3 and card = $4', [...key, a.card, box, plusDays(today, LBOX[box - 1]), ok ? 1 : 0, ok ? 0 : 1, today]);
      // Recognising it well (box 3) opens the harder card: say, type or build it
      if (a.card.endsWith(':r') && box >= 3) await t.q('insert into lang_cards (family_id, kid_id, lang, card, lesson_id, box, due) values ($1, $2, $3, $4, $5, 1, $6) on conflict do nothing', [...key, a.card.replace(/:r$/, ':p'), c.lesson_id, plusDays(today, 1)]);
    }
  });
  return { ok: true, moved };
});
const lineOf = raw => { let k; try { k = decodeURIComponent(raw); } catch (e) { fail(400, 'Bad line.', 'bad_line'); } k = k.normalize('NFC').replace(/\s+/g, ' ').trim(); if (!k || k.length > 400) fail(400, 'Bad line.', 'bad_line'); return k; };
route('GET', '/api/lang/audio-index/:lang', async ({ p }) => {
  if (!LANG_IDS.includes(p.lang)) fail(404, 'Unknown language.', 'bad_lang');
  const rows = (await db.query('select line_key, extract(epoch from updated_at)::bigint as v from lang_audio where lang = $1 and approved', [p.lang])).rows;
  return { lines: Object.fromEntries(rows.map(r => [r.line_key, String(r.v)])) };
});
route('GET', '/api/lang/audio/:lang/:key', async ({ res, p }) => {
  if (!LANG_IDS.includes(p.lang)) fail(404, 'Unknown language.', 'bad_lang');
  const r = (await db.query('select mime, bytes from lang_audio where lang = $1 and line_key = $2 and approved', [p.lang, lineOf(p.key)])).rows[0];
  if (!r) fail(404, 'No recording yet.', 'not_found');
  const bytes = Buffer.from(r.bytes);
  // The URL carries the recording's version (?v=), so a re-recording gets a new address
  res.writeHead(200, { 'content-type': r.mime, 'content-length': bytes.length, 'cache-control': 'public, max-age=31536000, immutable' });
  res.end(bytes);
  return undefined;
});
route('POST', '/api/lang/audio/:lang/:key', async ({ req, s, p }) => {
  await needEditor(s);
  if (!LANG_IDS.includes(p.lang)) fail(404, 'Unknown language.', 'bad_lang');
  const key = lineOf(p.key), mime = String(req.headers['content-type'] || '').split(';')[0].trim();
  if (!/^audio\/(mp4|x-m4a|aac|mpeg|webm|ogg|wav)$/.test(mime)) fail(415, 'Recordings must be audio.', 'bad_type');
  const buf = await readBody(req, 2 * 1024 * 1024); if (!buf.length) fail(400, 'That recording is empty.', 'empty');
  await db.query(`insert into lang_audio (lang, line_key, mime, bytes, size, recorded_by, approved, updated_at) values ($1, $2, $3, $4, $5, $6, true, now())
    on conflict (lang, line_key) do update set mime = excluded.mime, bytes = excluded.bytes, size = excluded.size, recorded_by = excluded.recorded_by, approved = true, updated_at = now()`, [p.lang, key, mime, buf, buf.length, s.user_id]);
  await logEvent(s, 'lang.audio', { lang: p.lang, size: buf.length });
  return { ok: true };
});

route('GET', '/api/photos/:id', async ({ res, s, p }) => {
  needSession(s);
  const r = (await db.query('select mime, bytes from photos where id = $1 and family_id = $2', [p.id, s.family_id])).rows[0];
  if (!r) fail(404, 'Photo not found.', 'not_found');
  const bytes = Buffer.from(r.bytes);
  res.writeHead(200, { 'content-type': r.mime, 'content-length': bytes.length, 'cache-control': 'private, max-age=31536000, immutable' });
  res.end(bytes);
  return undefined;
});

// The app reports what happens (job sent, pay approved, item bought, lesson finished…). Lesson results also
// fill growth_attempts and growth_answers for the grown-ups' reports.
// Builds one multi-row insert: `rows` are arrays of values in `cols` order; `casts` maps a column to its ::type.
function insertMany(t, table, cols, rows, casts = {}) {
  if (!rows.length) return null;
  const ph = rows.map((r, i) => `(${cols.map((c, j) => `$${i * cols.length + j + 1}${casts[c] ? '::' + casts[c] : ''}`).join(', ')})`).join(', ');
  return t.q(`insert into ${table} (${cols.join(', ')}) values ${ph}`, rows.flat());
}

// At most 100 events a request and 90 requests per device every 15 minutes (the app sends a batch every few
// seconds while in use). Events go in with one insert per table, in one transaction.
route('POST', '/api/events', async ({ req, s }) => {
  needSession(s);
  if (limited('events:' + s.device_id, 90)) fail(429, 'Too many events from this device.', 'slow_down');
  const b = await readJson(req, 512 * 1024), list = Array.isArray(b.events) ? b.events.slice(0, 100) : [];
  const evRows = [], attempts = [], answers = [];
  const kept = list.map(e => ({ type: String((e && e.type) || '').slice(0, 80), at: Number.isFinite(e && e.at) ? new Date(e.at) : null, kid: e && e.kidId ? String(e.kidId).slice(0, 80) : null, pl: e && e.payload && typeof e.payload === 'object' ? e.payload : {} })).filter(e => e.type);
  for (const { type, at, kid, pl } of kept) {
    evRows.push([s.family_id, s.user_id || null, s.device_id, kid, type, JSON.stringify(pl), at]);
    if (type === 'growth.attempt' && kid) {
      attempts.push([s.family_id, kid, ['lesson', 'challenge', 'review', 'moment', 'case', 'echo', 'story', 'lpart', 'lreview', 'lstory', 'lplace'].includes(pl.kind) ? pl.kind : 'lesson', String(pl.id || '?'), pl.tree || null, pl.band || null, pl.unit || null, pl.correct | 0, pl.total | 0, pl.xp | 0, pl.ms | 0]);
      for (const a of (Array.isArray(pl.answers) ? pl.answers.slice(0, 40) : [])) answers.push([s.family_id, kid, String(pl.id || '?'), String((a && a.q) || '?'), (a && a.skill) || null, !!(a && a.ok), JSON.stringify(a ? a.a ?? null : null)]);
    }
  }
  await db.tx(async t => {
    await insertMany(t, 'events', ['family_id', 'user_id', 'device_id', 'kid_id', 'type', 'payload', 'client_at'], evRows, { payload: 'jsonb' });
    await insertMany(t, 'growth_attempts', ['family_id', 'kid_id', 'kind', 'item_id', 'tree', 'band', 'unit', 'correct', 'total', 'xp', 'duration_ms'], attempts);
    await insertMany(t, 'growth_answers', ['family_id', 'kid_id', 'item_id', 'question_id', 'skill', 'correct', 'answer'], answers, { answer: 'jsonb' });
  });
  for (const { type, at, kid, pl } of kept) {
    const when = at || new Date(), txt = (v, n = 80) => (v == null ? null : String(v).slice(0, n)), int = v => (Number.isFinite(+v) ? Math.round(+v) : null);
    if (type === 'growth.prize' && kid) {
      await db.query('insert into island_prizes (family_id, kid_id, prize_id, name, kind, big, prize_no, lessons_at, gap, pace, next_gap, won_at, lesson_id) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [s.family_id, kid, txt(pl.id) || '?', txt(pl.name), ['look', 'item', 'chest'].includes(pl.kind) ? pl.kind : null, !!pl.big, int(pl.n), int(pl.lessons), int(pl.gap), int(pl.pace), int(pl.next), when, txt(pl.lesson)]);
    }
    if (type === 'chore.sent' && kid) {
      await db.query('insert into chore_sends (family_id, kid_id, chore_key, title, tier, freq, sent_by, sent_at) values ($1, $2, $3, $4, $5, $6, $7, $8)',
        [s.family_id, kid, txt(pl.key) || '?', txt(pl.title), ['must', 'team', 'gig'].includes(pl.tier) ? pl.tier : null, txt(pl.freq, 20), s.user_id || null, when]);
    }
    if (type === 'onboard.step') {
      await db.query('insert into first_steps (family_id, kid_id, step, detail, done_at) values ($1, $2, $3, $4::jsonb, $5)', [s.family_id, kid, txt(pl.step, 40) || '?', JSON.stringify(pl), when]);
    }
    if (type === 'island.buy' && kid) {
      await db.query('insert into island_purchases (family_id, kid_id, item, name, category, paid_with, price, bought_at) values ($1, $2, $3, $4, $5, $6, $7, $8)',
        [s.family_id, kid, txt(pl.item) || '?', txt(pl.name), txt(pl.cat, 40), pl.pay === 'xp' || pl.pay === 'cash' ? pl.pay : null, int(pl.price), when]);
    }
    if (type === 'farm.sell' && kid) {
      await db.query('insert into farm_sales (family_id, kid_id, product, qty, price, xp, sold_at) values ($1, $2, $3, $4, $5, $6, $7)',
        [s.family_id, kid, txt(pl.k, 20) || '?', int(pl.n) || 0, int(pl.price), int(pl.xp) || 0, when]);
    }
    if (type === 'shop.wish' && kid) {
      await db.query('insert into shop_wishes (family_id, kid_id, item, xp_needed, wished_at) values ($1, $2, $3, $4, $5)', [s.family_id, kid, txt(pl.item, 40) || '?', int(pl.need) || 0, when]);
    }
    if (type === 'island.play' && kid) {
      await db.query('insert into island_play (family_id, kid_id, activity, successes, xp, played_at) values ($1, $2, $3, $4, $5, $6)',
        [s.family_id, kid, txt(pl.act, 20) || '?', int(pl.n) || 0, int(pl.xp) || 0, when]);
    }
    if (type === 'island.feed' && kid) {
      await db.query('insert into farm_feedings (family_id, kid_id, animals, scoops, were_hungry, scoops_left, xp, fed_at) values ($1, $2, $3, $4, $5, $6, $7, $8)',
        [s.family_id, kid, int(pl.animals) || 0, int(pl.scoops) || 0, !!pl.hungry, int(pl.left), int(pl.xp), when]);
    }
  }
  return { ok: true, saved: kept.length };
});

// Content feed: approved items reach every family's app; drafts wait for a content editor (CONTENT_EDITORS).
route('GET', '/api/content/feed', async ({ s }) => {
  needSession(s);
  const rows = (await db.query(`select id, kind, tree, band, unit, tags, data, season_from, season_to, expires_at from content_items
    where status = 'approved' and (starts_at is null or starts_at <= now()) and (expires_at is null or expires_at > now()) order by created_at`)).rows;
  return { items: rows.map(r => ({ ...r, data: asObj(r.data) })) };
});
route('GET', '/api/content/queue', async ({ s }) => {
  await needEditor(s);
  const rows = (await db.query(`select id, kind, tree, band, data, created_at from content_items where status = 'draft' order by created_at`)).rows;
  return { items: rows.map(r => ({ ...r, data: asObj(r.data) })) };
});
route('POST', '/api/content', async ({ req, s }) => {
  const admin = isAdmin(req);
  if (!admin) await needEditor(s);
  const b = await readJson(req, 4 * 1024 * 1024), items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
  for (const it of items) {
    if (!['moment', 'lesson', 'case'].includes(it.kind) || !it.data) continue; // the weekly market story is generated in the app
    await db.query(`insert into content_items (id, kind, tree, band, unit, tags, data, season_from, season_to, starts_at, expires_at, status, sources, created_by)
      values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, 'draft', $12::jsonb, $13) on conflict (id) do nothing`,
      [String(it.id || randomUUID()), it.kind, it.tree || null, it.band || null, it.unit || null, Array.isArray(it.tags) ? it.tags.map(String) : [], JSON.stringify(it.data), it.seasonFrom || null, it.seasonTo || null, it.startsAt || null, it.expiresAt || null, JSON.stringify(it.sources || []), admin ? 'scheduled-task' : s.user_id]);
  }
  return { ok: true, queued: items.length };
});
route('PATCH', '/api/content/:id', async ({ req, s, p }) => {
  await needEditor(s); const b = await readJson(req);
  if (!['approved', 'withdrawn', 'draft'].includes(b.status)) fail(400, 'Unknown status.', 'bad_status');
  await db.query('update content_items set status = $2, reviewed_by = $3, reviewed_at = now() where id = $1', [p.id, b.status, s.user_id]);
  await logEvent(s, 'content.reviewed', { id: p.id, status: b.status });
  return { ok: true };
});

/* ---------- static site ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  let file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  let st = await stat(file).catch(() => null);
  if (st && st.isDirectory()) { file = path.join(file, 'index.html'); st = await stat(file).catch(() => null); }
  if (!st) { file = rel.startsWith('/chorecast/') && !path.extname(rel) ? path.join(ROOT, 'chorecast', 'index.html') : path.join(ROOT, 'index.html'); st = await stat(file).catch(() => null); }
  if (!st) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
  // Files keep their names across deploys (the page, growth.js, lesson packs), so browsers revalidate every time and
  // get a cheap 304 when nothing changed.
  const ext = path.extname(file), modified = st.mtime.toUTCString(), type = MIME[ext] || 'application/octet-stream';
  const head = { 'content-type': type, 'cache-control': 'no-cache', 'last-modified': modified };
  const isApp = file.startsWith(path.join(ROOT, 'chorecast') + path.sep);
  if (isApp && ext === '.html') head['content-security-policy'] = await cspFor(file, st.mtimeMs);
  const zippable = /^(text\/|application\/(json|manifest\+json)|image\/svg)/.test(type) && st.size > 1024;
  if (zippable) head.vary = 'accept-encoding';
  if (req.headers['if-modified-since'] === modified) { res.writeHead(304, head); return res.end(); }
  const enc = zippable ? encodingFor(req) : null;
  const body = enc ? await zipped(file, st.mtimeMs, enc) : await readFile(file);
  if (enc) head['content-encoding'] = enc;
  res.writeHead(200, { ...head, 'content-length': body.length });
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

// Text files are compressed once per deploy and kept in memory (the page, growth.js, three.js and the lesson packs).
const zipCache = new Map();
async function zipped(file, mtime, enc) {
  const key = file + '|' + enc, hit = zipCache.get(key);
  if (hit && hit.mtime === mtime) return hit.buf;
  const buf = compress(await readFile(file), enc, 9);
  zipCache.set(key, { mtime, buf });
  return buf;
}

// Chorecast's content security policy. Its own inline scripts are allowed by their SHA-256, so an injected <script>,
// an onclick or a script from another site never runs. Inline styles stay allowed: the app builds style="" attributes.
const cspCache = new Map();
async function cspFor(file, mtime) {
  const hit = cspCache.get(file);
  if (hit && hit.mtime === mtime) return hit.csp;
  const html = await readFile(file, 'utf8'), hashes = [];
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) hashes.push(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  const csp = [`default-src 'self'`, `script-src 'self' ${hashes.join(' ')}`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `media-src 'self' blob:`,
    `font-src 'self'`, `connect-src 'self'`, `worker-src 'self'`, `manifest-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`].join('; ');
  cspCache.set(file, { mtime, csp });
  return csp;
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  securityHeaders(req, res);
  try {
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && APP_ORIGINS.includes(origin)) {
        res.setHeader('access-control-allow-origin', origin); res.setHeader('vary', 'origin');
        if (req.method === 'OPTIONS') {
          res.writeHead(204, { 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE', 'access-control-allow-headers': 'authorization, content-type, x-client-id, x-chorecast-client', 'access-control-max-age': '86400' });
          return res.end();
        }
      }
      const r = routes.find(x => x.method === req.method && x.re.test(url.pathname));
      if (!r) fail(404, 'Not found.', 'not_found');
      const s = await sessionOf(req, url);
      const out = await r.fn({ req, res, s, p: url.pathname.match(r.re).groups || {}, url });
      if (out !== undefined && !res.headersSent) send(res, 200, out);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    await serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!(e instanceof HttpError)) { console.error(req.method, url.pathname, e); errors.record('server', `${req.method} ${url.pathname.replace(/[\w-]{16,}/g, ':id')}`, e); }
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Something went wrong on the server.', code: e.code || 'server_error' });
    else res.end();
  }
}).listen(PORT, () => console.log(`Chorecast server on http://localhost:${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { await db.close().catch(() => {}); process.exit(0); });
