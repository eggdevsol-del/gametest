// Tests for the Phase 0 launch work against a real Chorecast server on a throwaway database.
// node tests/launch-basics.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PGlite } = await import('@electric-sql/pglite');
const HK = await import(path.join(REPO, 'server/housekeeping.js'));

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const DAY = 864e5, PORT = 8798, BASE = 'http://localhost:' + PORT;
const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-p0-'));

const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '', ...(globalThis.EXTRA_ENV || {}) } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
ok(/Chorecast server on/.test(log), 'server starts', log);

function client(extraHeaders = {}) {
  let cookie = '';
  const C = async (method, url, body, headers = {}) => {
    const r = await fetch(BASE + url, { method, headers: { ...extraHeaders, ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    return { status: r.status, headers: r.headers, ...(await r.json().catch(() => ({}))) };
  };
  return C;
}
const signup = (C, email, extra = {}) => C('POST', '/api/auth/signup', { email, password: 'correct-horse-9', name: email.split('@')[0], consent: true, ...extra });

try {
  // ---- P0-02, P0-03, P0-10: headers, compression, bundled files
  {
    const r = await fetch(BASE + '/chorecast/', { headers: { 'accept-encoding': 'br', 'x-forwarded-proto': 'https' } });
    const csp = r.headers.get('content-security-policy') || '';
    const html = readFileSync(path.join(REPO, 'public/chorecast/index.html'), 'utf8');
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
    ok(inline.length === 1 && inline.every(h => csp.includes(h)), 'CSP allows the page script by its hash', csp.slice(0, 120));
    ok(/frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && !/unsafe-eval/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp), 'CSP blocks framing, plugins and inline scripts', csp);
    ok(r.headers.get('strict-transport-security') === 'max-age=31536000; includeSubDomains', 'HSTS over HTTPS', r.headers.get('strict-transport-security'));
    ok(r.headers.get('x-frame-options') === 'DENY' && r.headers.get('x-content-type-options') === 'nosniff', 'frame and sniff headers');
    ok(r.headers.get('content-encoding') === 'br', 'page is brotli-compressed', r.headers.get('content-encoding'));
    const body = await r.text(); ok(body === html, 'compressed page arrives intact');
    ok(!/https:\/\/(fonts\.g|cdnjs)/.test(html), 'page loads nothing from Google or Cloudflare');
    const g = await fetch(BASE + '/chorecast/growth.js', { headers: { 'accept-encoding': 'gzip' } });
    ok(g.headers.get('content-encoding') === 'gzip' && Number(g.headers.get('content-length')) < Buffer.byteLength(readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8')) * 0.4, 'growth.js gzipped to under 40%', g.headers.get('content-length'));
    const plain = await fetch(BASE + '/chorecast/growth.js', { headers: { 'accept-encoding': 'identity' } });
    ok(!plain.headers.get('content-encoding'), 'no compression when not asked');
    const http = await fetch(BASE + '/chorecast/');
    ok(!http.headers.get('strict-transport-security'), 'no HSTS over plain HTTP (local dev)');
    for (const f of ['vendor/three-r128.min.js', 'fonts/nunito-latin.woff2', 'fonts/nunito-latin-ext.woff2', 'privacy.html', 'terms.html']) {
      const x = await fetch(BASE + '/chorecast/' + f); ok(x.status === 200, f + ' served', x.status);
    }
    const t = await fetch(BASE + '/chorecast/vendor/three-r128.min.js', { headers: { 'accept-encoding': 'br' } });
    ok(t.headers.get('content-type').startsWith('text/javascript') && t.headers.get('content-encoding') === 'br', 'three.js served as compressed script');
    const pv = await fetch(BASE + '/chorecast/privacy.html');
    ok(/script-src 'self'/.test(pv.headers.get('content-security-policy') || ''), 'policy page gets a CSP too');
    const nm = await fetch(BASE + '/chorecast/', { headers: { 'if-modified-since': r.headers.get('last-modified') } });
    ok(nm.status === 304 && nm.headers.get('content-security-policy'), '304 still carries headers');
  }

  // ---- P0-25: consent at sign-up
  const P = client();
  {
    const no = await P('POST', '/api/auth/signup', { email: 'a@test.localhost', password: 'correct-horse-9', name: 'A' });
    ok(no.status === 400 && no.code === 'no_consent', 'sign-up needs the guardian box', no);
    const yes = await signup(P, 'a@test.localhost', { familyName: 'Tester family' });
    ok(yes.status === 200 && yes.recovery, 'sign-up with consent works', yes);
  }

  // ---- P0-05: events in batches, capped per request and per device
  {
    const kid = 'kid-1';
    await P('PUT', '/api/docs/kids/' + kid, { name: 'Ari', age: 9, jars: {}, ledger: [] });
    const evs = Array.from({ length: 150 }, (_, i) => ({ type: i === 0 ? 'growth.attempt' : 'ui.tap', kidId: kid, at: Date.now(), payload: i === 0 ? { kind: 'lesson', id: 'L1', correct: 2, total: 3, answers: [{ q: 'q1', ok: true, a: 1 }, { q: 'q2', ok: false, a: 'x' }] } : { n: i } }));
    const r = await P('POST', '/api/events', { events: evs });
    ok(r.status === 200 && r.saved === 100, 'at most 100 events a request', r);
    let last; for (let i = 0; i < 90; i++) last = await P('POST', '/api/events', { events: [{ type: 'ui.tap' }] });
    ok(last.status === 429 && last.code === 'slow_down', '90 requests per device per 15 minutes', last);
    const big = await P('GET', '/api/sync', undefined, { 'accept-encoding': 'gzip' });
    ok(big.status === 200, 'sync still works');
  }

  // ---- P0-08: deleting an account
  {
    const inv = await P('POST', '/api/family/invite', {});
    const Q = client(), K = client();
    ok((await signup(Q, 'b@test.localhost', { invite: inv.code })).status === 200, 'second grown-up joins');
    const { code } = await P('POST', '/api/devices/code', {});
    ok((await K('POST', '/api/devices/pair', { code, name: 'iPad' })).role === 'kid', 'kid iPad pairs');
    ok((await K('POST', '/api/account/delete', { password: 'x' })).code === 'parent_only', 'a kid iPad can’t delete the account');
    ok((await Q('POST', '/api/account/delete', { password: 'wrong-pass', scope: 'me' })).code === 'bad_password', 'needs the password');
    const me = await Q('POST', '/api/account/delete', { password: 'correct-horse-9', scope: 'me' });
    ok(me.status === 200 && me.deleted === 'me', 'second grown-up deletes just their sign-in', me);
    ok((await Q('GET', '/api/auth/me')).status === 401, 'their session is gone');
    ok((await Q('POST', '/api/auth/login', { email: 'b@test.localhost', password: 'correct-horse-9' })).code === 'bad_login', 'their login is gone');
    const left = await P('GET', '/api/auth/me');
    ok(left.status === 200 && left.members.length === 1, 'family carries on with one grown-up', left.members);
    const fam = await P('POST', '/api/account/delete', { password: 'correct-horse-9', scope: 'me' });
    ok(fam.deleted === 'family', 'the last grown-up takes the family with them', fam);
    ok((await K('GET', '/api/sync')).status === 401, 'the kid iPad is signed out');
  }
} finally {
  srv.kill(); await new Promise(r => setTimeout(r, 500));
}

// ---- after the server: nothing of the deleted family is left; consent was recorded before
{
  const db = new PGlite(dir); await db.waitReady;
  const tables = (await db.query(`select table_name from information_schema.columns where column_name = 'family_id' and table_schema = 'public'`)).rows.map(r => r.table_name);
  const left = [];
  for (const t of tables) { const n = (await db.query(`select count(*)::int as n from ${t}`)).rows[0].n; if (n) left.push(t + ':' + n); }
  ok(!left.length, 'no rows left in any family table', left);
  ok(!(await db.query('select 1 from users')).rows.length, 'no grown-ups left');
  ok((await db.query(`select 1 from schema_migrations where name = '010_consents.sql'`)).rows.length === 1, 'consents migration ran');

  // ---- P0-04: photo clean-up, run directly against the database
  const now = Date.now();
  await db.query(`insert into families (id, name) values ('f1', 'Photo family')`);
  await db.query(`insert into family_settings (family_id, data) values ('f1', '{"photoDays": 30}'::jsonb)`);
  const photo = (id, kind, ageDays) => db.query(`insert into photos (id, family_id, mime, bytes, size, kind, created_at) values ($1, 'f1', 'image/jpeg', '\\x00'::bytea, 1, $2, now() - $3 * interval '1 day')`, [id, kind, ageDays]);
  for (const [id, kind, age] of [['old', 'proof', 40], ['s1', 'step', 40], ['recent', 'proof', 40], ['pend', 'proof', 90], ['orph', 'proof', 9], ['fresh', 'proof', 1], ['g1', 'guide', 50], ['g2', 'guide', 50]]) await photo(id, kind, age);
  const job = (id, d) => db.query(`insert into jobs (family_id, id, data) values ('f1', $1, $2::jsonb)`, [id, JSON.stringify(d)]);
  await job('j1', { status: 'approved', reviewedAt: now - 31 * DAY, photo: 's:old', stepPhotos: ['s:s1', null] });
  await job('j2', { status: 'approved', reviewedAt: now - 10 * DAY, photo: 's:recent' });
  await job('j3', { status: 'pending', photo: 's:pend' });
  await db.query(`insert into chore_guides (family_id, id, data) values ('f1', 'dishes', $1::jsonb)`, [JSON.stringify({ steps: [{ photo: 's:g1' }] })]);
  const cleared = [];
  const gone = await HK.cleanFamilyPhotos(db, 'f1', async (f, j) => { cleared.push(j); }, now);
  const leftIds = (await db.query(`select id from photos order by id`)).rows.map(r => r.id);
  ok(JSON.stringify(cleared) === '["j1"]', 'only the job reviewed more than 30 days ago is cleared', cleared);
  ok(JSON.stringify(leftIds) === JSON.stringify(['fresh', 'g1', 'pend', 'recent']), 'expired, orphaned and unused guide photos are gone', leftIds);
  ok(gone === 4, 'counts what it removed', gone);
  ok(HK.photoDaysOf({ photoDays: 7 }) === 60 && HK.photoDaysOf({ photoDays: 365 }) === 365, 'only the offered photo periods count');

  await db.query(`insert into events (family_id, type, created_at) values ('f1', 'old', now() - interval '400 days'), ('f1', 'new', now())`);
  await db.query(`insert into doc_changes (family_id, collection, doc_id, op, created_at) values ('f1', 'jobs', 'j1', 'set', now() - interval '100 days')`);
  const out = await HK.runHousekeeping(db, async () => {});
  ok(out && out.events === 1 && out.changes === 1, 'old events and change log rows go', out);
  ok((await HK.runHousekeeping(db, async () => {})) === null, 'runs once a day');
  ok((await db.query(`select type from events`)).rows.map(r => r.type).join() === 'new', 'recent events stay');
  await db.close();
}

console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /Error|error|fail/i.test(l)).slice(0, 12).join('\n'));
process.exit(failN ? 1 : 0);
