// Chorecast server: serves the built site, parent email sign-in, paired kid devices, live sync of the family's
// data through Postgres, job photos, the in-app event log and the Character Growth content feed.
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { openDb, migrate } from './db.js';
import { hashPassword, verifyPassword, newToken, sha256, wordCode, digitCode, recoveryCode, parseCookies, sessionCookie, limited, hitCount, validEmail } from './auth.js';
import { checkKidWrite } from './guard.js';
import { hash as fnv } from './market.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Options: PORT and STATIC_DIR environment variables, or --port 8787 --static public on the command line.
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = path.resolve(arg('static') || process.env.STATIC_DIR || [path.join(here, '..', 'dist'), path.join(here, '..', 'public')].find(d => existsSync(d)));
const PORT = Number(arg('port') || process.env.PORT || 8787);
const SESSION_DAYS = 180;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
// The content feed is shared by every family, so only these grown-ups (comma-separated emails) may review it.
const CONTENT_EDITORS = (process.env.CONTENT_EDITORS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const db = await openDb();
await migrate(db);
console.log(`database ready (${db.kind}), serving ${ROOT}`);

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
function send(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
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

/* ---------- sessions ---------- */
const touched = new Map();
async function sessionOf(req) {
  const tok = parseCookies(req.headers.cookie).cc_session; if (!tok) return null;
  const h = sha256(tok);
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
async function startSession(res, req, { familyId, deviceId, userId, role }) {
  const tok = newToken();
  await db.query(`insert into sessions (token_hash, family_id, device_id, user_id, role, expires_at) values ($1, $2, $3, $4, $5, now() + interval '${SESSION_DAYS} days')`, [sha256(tok), familyId, deviceId, userId || null, role]);
  res.setHeader('set-cookie', sessionCookie(tok, isSecure(req), SESSION_DAYS * 86400));
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
  const user = s.user_id ? (await db.query('select id, email, name from users where id = $1', [s.user_id])).rows[0] : null;
  const members = (await db.query('select u.name, u.email, m.role from family_members m join users u on u.id = m.user_id where m.family_id = $1 order by m.joined_at', [s.family_id])).rows;
  return { user, family: fam, role: s.role, elevated: !!s.elevated, contentEditor: await isEditor(s), device: { id: s.device_id, name: s.device_name }, members };
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
    if ('paid' in body || 'reviewedAt' in body) fail(403, 'Only a grown-up can approve jobs.', 'locked');
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
  for (const k of SERVER_OWNED[col] || []) { if (prev && prev[k]) data[k] = true; else delete data[k]; }
}

// `system` is the server's own write (the PIN routes setting pinSet or a kid's pin): no device rules apply.
async function writeDoc(s, col, id, body, merge, clientId, system = false) {
  const C = COLS[col]; if (!C) fail(404, 'Unknown collection.', 'bad_path');
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Expected an object.', 'bad_body');
  const out = await db.tx(async t => {
    const cur = C.single
      ? (await t.q('select data, version from family_settings where family_id = $1 for update', [s.family_id])).rows[0]
      : (await t.q(`select data, version from ${C.table} where family_id = $1 and id = $2 for update`, [s.family_id, id])).rows[0];
    const prev = cur ? asObj(cur.data) : null;
    if (!system) checkWrite(s, col, body, prev);
    const data = merge ? deepMerge(prev || {}, body) : { ...body };
    if (!system) keepServerOwned(col, prev, data);
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
    return { data, version };
  });
  broadcast(s.family_id, { col, id, data: out.data, version: out.version }, clientId);
  return out;
}

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

/* ---------- routes ---------- */
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp('^' + pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), fn });

route('GET', '/api/health', async () => ({ ok: true, db: db.kind }));

route('POST', '/api/auth/signup', async ({ req, res }) => {
  const b = await readJson(req), email = String(b.email || '').trim().toLowerCase(), pw = String(b.password || ''), name = String(b.name || '').trim().slice(0, 60);
  if (limited('signup:' + clientIp(req), 8)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  if (!validEmail(email)) fail(400, 'That email address doesn’t look right.', 'bad_email');
  if (pw.length < 8) fail(400, 'Use at least 8 characters for the password.', 'weak_password');
  if ((await db.query('select 1 from users where lower(email) = $1', [email])).rows.length) fail(409, 'There’s already an account with that email. Sign in instead.', 'exists');
  let invite = null;
  if (b.invite) {
    invite = (await db.query(`select * from invites where code = $1 and kind = 'parent' and used_at is null and expires_at > now()`, [String(b.invite).trim().toUpperCase()])).rows[0];
    if (!invite) fail(400, 'That invite code has expired or was already used.', 'bad_invite');
  }
  const userId = randomUUID(), familyId = invite ? invite.family_id : randomUUID(), deviceId = randomUUID(), rec = recoveryCode();
  await db.tx(async t => {
    await t.q('insert into users (id, email, name, password_hash, recovery_hash, last_login_at) values ($1, $2, $3, $4, $5, now())', [userId, email, name, await hashPassword(pw), sha256(rec.replace(/-/g, ''))]);
    if (!invite) await t.q('insert into families (id, name, created_by) values ($1, $2, $3)', [familyId, String(b.familyName || '').trim().slice(0, 60) || (name ? `${name}'s family` : 'Our family'), userId]);
    else await t.q('update invites set used_at = now(), used_by = $2 where code = $1', [invite.code, userId]);
    await t.q(`insert into family_members (family_id, user_id, role) values ($1, $2, 'parent')`, [familyId, userId]);
    await t.q(`insert into devices (id, family_id, user_id, kind, name, user_agent) values ($1, $2, $3, 'parent', $4, $5)`, [deviceId, familyId, userId, String(b.deviceName || 'Grown-up device').slice(0, 60), String(req.headers['user-agent'] || '').slice(0, 300)]);
  });
  await startSession(res, req, { familyId, deviceId, userId, role: 'parent' });
  const s = { family_id: familyId, device_id: deviceId, user_id: userId, role: 'parent', elevated: true, device_name: b.deviceName || 'Grown-up device' };
  await logEvent(s, invite ? 'auth.joined_family' : 'auth.signup', { email });
  return { ...(await me(s)), recovery: rec };
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
  await startSession(res, req, { familyId: m.family_id, deviceId, userId: u.id, role: 'parent' });
  const s = { family_id: m.family_id, device_id: deviceId, user_id: u.id, role: 'parent', elevated: true, device_name: b.deviceName || 'Grown-up device' };
  await logEvent(s, 'auth.login', {});
  return me(s);
});

route('POST', '/api/auth/reset', async ({ req }) => {
  const b = await readJson(req), email = String(b.email || '').trim().toLowerCase(), code = String(b.recovery || '').toUpperCase().replace(/[^A-Z0-9]/g, ''), pw = String(b.password || '');
  if (limited('reset:' + clientIp(req), 8)) fail(429, 'Too many tries. Wait a few minutes.', 'slow_down');
  if (pw.length < 8) fail(400, 'Use at least 8 characters for the password.', 'weak_password');
  const u = (await db.query('select id, recovery_hash from users where lower(email) = $1', [email])).rows[0];
  if (!u || !u.recovery_hash || u.recovery_hash !== sha256(code)) fail(400, 'That email and recovery code don’t match.', 'bad_recovery');
  await db.query('update users set password_hash = $2 where id = $1', [u.id, await hashPassword(pw)]);
  await db.query('delete from sessions where user_id = $1', [u.id]);
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
  await startSession(res, req, { familyId: inv.family_id, deviceId, role: 'kid' });
  const s = { family_id: inv.family_id, device_id: deviceId, role: 'kid', elevated: false, device_name: name };
  await logEvent(s, 'device.paired', { name });
  return me(s);
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
route('POST', '/api/events', async ({ req, s }) => {
  needSession(s); const b = await readJson(req, 1024 * 1024), list = Array.isArray(b.events) ? b.events.slice(0, 200) : [];
  for (const e of list) {
    const type = String(e.type || '').slice(0, 80); if (!type) continue;
    const at = Number.isFinite(e.at) ? new Date(e.at) : null, kid = e.kidId ? String(e.kidId).slice(0, 80) : null, pl = e.payload && typeof e.payload === 'object' ? e.payload : {};
    await db.query('insert into events (family_id, user_id, device_id, kid_id, type, payload, client_at) values ($1, $2, $3, $4, $5, $6::jsonb, $7)', [s.family_id, s.user_id || null, s.device_id, kid, type, JSON.stringify(pl), at]);
    if (type === 'growth.attempt' && kid) {
      await db.query(`insert into growth_attempts (family_id, kid_id, kind, item_id, tree, band, unit, correct, total, xp, duration_ms) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [s.family_id, kid, ['lesson', 'challenge', 'review', 'moment', 'case', 'echo', 'story'].includes(pl.kind) ? pl.kind : 'lesson', String(pl.id || '?'), pl.tree || null, pl.band || null, pl.unit || null, pl.correct | 0, pl.total | 0, pl.xp | 0, pl.ms | 0]);
      for (const a of (Array.isArray(pl.answers) ? pl.answers.slice(0, 40) : [])) {
        await db.query('insert into growth_answers (family_id, kid_id, item_id, question_id, skill, correct, answer) values ($1, $2, $3, $4, $5, $6, $7::jsonb)', [s.family_id, kid, String(pl.id || '?'), String(a.q || '?'), a.skill || null, !!a.ok, JSON.stringify(a.a ?? null)]);
      }
    }
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
    if (type === 'island.feed' && kid) {
      await db.query('insert into farm_feedings (family_id, kid_id, animals, scoops, were_hungry, scoops_left, xp, fed_at) values ($1, $2, $3, $4, $5, $6, $7, $8)',
        [s.family_id, kid, int(pl.animals) || 0, int(pl.scoops) || 0, !!pl.hungry, int(pl.left), int(pl.xp), when]);
    }
  }
  return { ok: true, saved: list.length };
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
  const admin = ADMIN_TOKEN && req.headers.authorization === `Bearer ${ADMIN_TOKEN}`;
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
  // Vite's hashed /assets/ files never change. Everything else (Chorecast's growth.js, lesson packs) keeps its name
  // across deploys, so browsers revalidate it every time and get a cheap 304 when nothing changed.
  const ext = path.extname(file), hashed = rel.startsWith('/assets/'), modified = st.mtime.toUTCString();
  const head = { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache', 'last-modified': modified, 'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin' };
  if (!hashed && req.headers['if-modified-since'] === modified) { res.writeHead(304, head); return res.end(); }
  res.writeHead(200, head);
  if (req.method === 'HEAD') return res.end();
  res.end(await readFile(file));
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      const r = routes.find(x => x.method === req.method && x.re.test(url.pathname));
      if (!r) fail(404, 'Not found.', 'not_found');
      const s = await sessionOf(req);
      const out = await r.fn({ req, res, s, p: url.pathname.match(r.re).groups || {}, url });
      if (out !== undefined && !res.headersSent) send(res, 200, out);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    await serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(req.method, url.pathname, e);
    if (!res.headersSent) send(res, e.status || 500, { error: e instanceof HttpError ? e.message : 'Something went wrong on the server.', code: e.code || 'server_error' });
    else res.end();
  }
}).listen(PORT, () => console.log(`Chorecast server on http://localhost:${PORT}`));

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, async () => { await db.close().catch(() => {}); process.exit(0); });
