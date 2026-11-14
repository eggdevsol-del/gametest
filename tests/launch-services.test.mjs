// Phase 0 tests, part 2: email links, app tokens, plans and App Store purchases (paywall on, test certificates),
// error tracking, push registration, and backup/restore.
// node tests/launch-services.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createSign, X509Certificate } from 'node:crypto';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Throwaway App Store certificates made for these tests only: the server trusts them just when APPSTORE_TEST_ROOT says so.
const CA = path.join(REPO, 'tests/fixtures/appstore-test-ca');
const { PGlite } = await import('@electric-sql/pglite');
const { verifyAppleJws } = await import(path.join(REPO, 'server/appstore.js'));
const { backup } = await import(path.join(REPO, 'scripts/backup.mjs'));
const { restore } = await import(path.join(REPO, 'scripts/restore.mjs'));

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (process.env.TRACE) console.log(c ? "ok  " : "FAIL", msg); if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };
const PORT = 8797, BASE = 'http://localhost:' + PORT, BUNDLE = 'app.chorecast.test';
const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-p0b-')), mail = path.join(dir, 'mail'); mkdirSync(mail);
const pem = f => readFileSync(path.join(CA, f), 'utf8'), der = f => new X509Certificate(pem(f)).raw.toString('base64');

// A JWS signed like Apple's, by our test chain (or a broken one)
function jws(payload, { chain = ['leaf.pem', 'mid.pem', 'root.pem'], key = 'leaf.key', tamper = false } = {}) {
  const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64u({ alg: 'ES256', x5c: chain.map(der) }), body = b64u(payload);
  const sig = createSign('sha256').update(`${head}.${body}`).sign({ key: pem(key), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${head}.${tamper ? b64u({ ...payload, productId: 'chorecast.family.yearly' }) : body}.${sig}`;
}
const root = new X509Certificate(pem('root.pem'));
const tx = (familyId, extra = {}) => ({ bundleId: BUNDLE, productId: 'chorecast.plus.yearly', originalTransactionId: '1000' + Math.floor(Math.random() * 1e6), transactionId: 't' + Date.now(), purchaseDate: Date.now(), originalPurchaseDate: Date.now(), expiresDate: Date.now() + 365 * 864e5, appAccountToken: familyId, environment: 'Sandbox', offerType: 1, signedDate: Date.now(), ...extra });

// ---- the JWS checker on its own
{
  const t = tx('fam');
  ok(verifyAppleJws(jws(t), { root }).productId === 'chorecast.plus.yearly', 'a good chain and signature pass');
  const bad = (what, opts) => { try { verifyAppleJws(jws(t, opts), { root }); ok(false, what); } catch (e) { ok(true, what); } };
  bad('a changed payload fails', { tamper: true });
  bad('a chain to another root fails', { chain: ['leaf.pem', 'mid.pem', 'evil.pem'] });
  bad('a leaf without Apple’s marker fails', { chain: ['mid.pem', 'mid.pem', 'root.pem'], key: 'mid.key' });
  try { verifyAppleJws(jws(t)); ok(false, 'our test chain is refused against Apple’s real root'); } catch (e) { ok(/not signed by Apple/.test(e.message), 'our test chain is refused against Apple’s real root', e.message); }
}

// Mum's family may test-buy (SANDBOX_ACCOUNTS), so the purchases below are Sandbox ones; Gran's family may not.
const env = { PGLITE_DIR: path.join(dir, 'db'), DATABASE_URL: '', PAYWALL: 'on', WELCOME_DAYS: '0', APPSTORE_TEST_ROOT: path.join(CA, 'root.pem'), APP_BUNDLE_ID: BUNDLE, SANDBOX_ACCOUNTS: ' MUM@test.localhost , review@test.localhost', MAIL_LOG_DIR: mail, APP_ORIGINS: 'chorecast://app', ADMIN_TOKEN: 'admin-test-token-123', APP_URL: 'https://chorecast.test' };
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, ...env } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));

function client(base = {}) {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const r = await fetch(BASE + url, { method, headers: { ...base, ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    return { status: r.status, headers: r.headers, ...(await r.json().catch(() => ({}))) };
  };
}
const mails = () => readdirSync(mail).sort().map(f => JSON.parse(readFileSync(path.join(mail, f), 'utf8')));
const linkIn = (m, k) => (m.text.match(new RegExp(`https://chorecast\\.test/chorecast/\\?${k}=([\\w-]+)`)) || [])[1];

try {
  // ---- P0-07 email
  const P = client();
  const su = await P('POST', '/api/auth/signup', { email: 'mum@test.localhost', password: 'correct-horse-9', name: 'Mum', consent: true });
  ok(su.status === 200 && su.user.emailVerified === false, 'new grown-up starts unconfirmed', su.user);
  await new Promise(r => setTimeout(r, 300));
  let m = mails().find(x => x.tag === 'verify' && x.to === 'mum@test.localhost');
  ok(m && linkIn(m, 'verify'), 'a confirm link is emailed at sign-up, using APP_URL', m);
  ok((await P('POST', '/api/auth/verify', { token: 'nope-nope-nope-nope-nope' })).code === 'bad_token', 'a made-up link fails');
  ok((await P('POST', '/api/auth/verify', { token: linkIn(m, 'verify') })).status === 200, 'the confirm link works');
  ok((await P('POST', '/api/auth/verify', { token: linkIn(m, 'verify') })).code === 'bad_token', 'and only once');
  ok((await P('GET', '/api/auth/me')).user.emailVerified === true, 'the email shows as confirmed');

  const before = mails().length;
  ok((await P('POST', '/api/auth/reset/send', { email: 'nobody@test.localhost' })).ok === true, 'reset for an unknown email answers the same');
  ok(mails().length === before, 'but sends nothing');
  ok((await P('POST', '/api/auth/reset/send', { email: 'MUM@test.localhost' }, { host: 'evil.example' })).ok, 'reset link requested');
  m = mails().filter(x => x.tag === 'reset').pop();
  ok(m && /https:\/\/chorecast\.test\//.test(m.text) && !/evil/.test(m.text), 'reset link ignores the Host header', m && m.text);
  const tok = linkIn(m, 'reset');
  ok((await P('POST', '/api/auth/reset', { token: tok, password: 'short' })).code === 'weak_password', 'reset needs a real password');
  ok((await P('POST', '/api/auth/reset', { token: tok, password: 'new-horse-battery-1' })).ok, 'reset with the emailed link');
  ok((await P('GET', '/api/auth/me')).status === 401, 'every device is signed out after a reset');
  ok((await P('POST', '/api/auth/reset', { token: tok, password: 'another-pass-123' })).code === 'bad_token', 'the reset link works once');
  ok((await P('POST', '/api/auth/login', { email: 'mum@test.localhost', password: 'new-horse-battery-1' })).status === 200, 'sign in with the new password');
  const fam = (await P('GET', '/api/auth/me')).family.id;

  // ---- P0-11 app tokens, stream tickets, CORS
  const App = client({ 'x-chorecast-client': 'app', origin: 'chorecast://app' });
  const li = await App('POST', '/api/auth/login', { email: 'mum@test.localhost', password: 'new-horse-battery-1' });
  ok(li.token && li.token.length > 30 && !li.headers.get('set-cookie'), 'the app gets a token, not a cookie', li);
  ok(li.headers.get('access-control-allow-origin') === 'chorecast://app', 'the app’s origin is allowed');
  const B = client({ authorization: 'Bearer ' + li.token });
  ok((await B('GET', '/api/auth/me')).family.id === fam, 'the token signs the app in');
  ok((await client({ authorization: 'Bearer not-a-real-token-at-all-xx' })('GET', '/api/auth/me')).status === 401, 'a wrong token doesn’t');
  const pre = await fetch(BASE + '/api/auth/me', { method: 'OPTIONS', headers: { origin: 'chorecast://app', 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' } });
  ok(pre.status === 204 && /authorization/.test(pre.headers.get('access-control-allow-headers')), 'CORS preflight for the app');
  const other = await fetch(BASE + '/api/auth/me', { headers: { origin: 'https://evil.example' } });
  ok(!other.headers.get('access-control-allow-origin'), 'other sites get no CORS');
  const { ticket } = await B('POST', '/api/stream/ticket', {});
  const ac = new AbortController(), st = await fetch(BASE + '/api/stream?ticket=' + ticket, { signal: ac.signal });
  ok(st.status === 200 && /event-stream/.test(st.headers.get('content-type')), 'a stream ticket opens the live stream'); ac.abort();
  ok((await fetch(BASE + '/api/stream?ticket=' + ticket)).status === 401, 'a ticket works once');

  // ---- P0-19/20 plans: free limits, purchase, notifications
  let plan = await B('GET', '/api/plan');
  ok(plan.plan === 'free' && plan.paywall === true && plan.appAccountToken === fam, 'a new family is on Free when the paywall is on', plan);
  for (const id of ['k1', 'k2']) ok((await B('PUT', '/api/docs/kids/' + id, { name: id, jars: {}, ledger: [] })).status === 200, 'free plan: kid ' + id);
  ok((await B('PUT', '/api/docs/kids/ex', { name: 'Example', example: true, jars: {}, ledger: [] })).status === 200, 'example kids don’t count');
  const third = await B('PUT', '/api/docs/kids/k3', { name: 'k3', jars: {}, ledger: [] });
  ok(third.status === 402 && third.code === 'plan_limit', 'a third kid needs Plus', third);
  const inv = await B('POST', '/api/family/invite', {});
  const Dad = client();
  ok((await Dad('POST', '/api/auth/signup', { email: 'dad@test.localhost', password: 'correct-horse-9', consent: true, invite: inv.code })).code === 'plan_limit', 'a second grown-up needs Plus');

  const t1 = tx(fam);
  ok((await B('POST', '/api/purchases/apple', { transaction: jws(t1, { tamper: true }) })).code === 'bad_receipt', 'a forged receipt is refused');
  ok((await B('POST', '/api/purchases/apple', { transaction: jws({ ...t1, bundleId: 'com.other' }) })).code === 'wrong_app', 'another app’s receipt is refused');
  ok((await B('POST', '/api/purchases/apple', { transaction: jws({ ...t1, appAccountToken: '00000000-0000-0000-0000-000000000000' }) })).code === 'other_family', 'another family’s receipt is refused');
  const buy = await B('POST', '/api/purchases/apple', { transaction: jws(t1) });
  ok(buy.status === 200 && buy.plan === 'plus' && buy.trial === true, 'a real purchase turns Plus on, with the trial', buy);
  ok((await B('PUT', '/api/docs/kids/k3', { name: 'k3', jars: {}, ledger: [] })).status === 200, 'now a third kid fits');
  ok((await Dad('POST', '/api/auth/signup', { email: 'dad@test.localhost', password: 'correct-horse-9', consent: true, invite: inv.code })).status === 200, 'and a second grown-up');

  const note = (type, t, extra = {}) => ({ signedPayload: jws({ notificationType: type, notificationUUID: 'n-' + Math.random(), signedDate: Date.now(), data: { bundleId: BUNDLE, environment: 'Sandbox', signedTransactionInfo: jws(t), signedRenewalInfo: jws({ autoRenewStatus: 0, signedDate: Date.now() }) }, ...extra }) });
  ok((await fetch(BASE + '/api/appstore/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signedPayload: jws({ notificationType: 'REFUND' }, { tamper: true }) }) })).status === 400, 'a forged notification is refused');
  const older = { ...t1, expiresDate: Date.now() - 864e5, offerType: undefined };
  await fetch(BASE + '/api/appstore/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(note('DID_CHANGE_RENEWAL_STATUS', older)) });
  plan = await B('GET', '/api/plan');
  ok(plan.plan === 'plus' && plan.renews === false, 'a late, older notice can’t end it early; auto-renew off is noted', plan);
  const refund = { ...t1, revocationDate: Date.now() };
  const nr = await fetch(BASE + '/api/appstore/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(note('REFUND', refund)) });
  ok(nr.status === 200, 'a refund notice is taken');
  ok((await B('GET', '/api/plan')).plan === 'free', 'a refund turns Plus off');
  const t2 = tx(fam, { productId: 'chorecast.lifetime.founding', expiresDate: undefined, offerType: undefined });
  const life = await fetch(BASE + '/api/appstore/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(note('ONE_TIME_CHARGE', t2)) });
  plan = await B('GET', '/api/plan');
  ok(life.status === 200 && plan.plan === 'plus' && plan.lifetime && plan.foundingLeft === 999, 'a founding lifetime bought on another device arrives by notification', plan);

  // ---- R3 test purchases (TestFlight, sandbox) only count for families on SANDBOX_ACCOUNTS
  const G = client();
  ok((await G('POST', '/api/auth/signup', { email: 'gran@test.localhost', password: 'correct-horse-9', name: 'Gran', consent: true })).status === 200, 'a family not on the test list signs up');
  const gfam = (await G('GET', '/api/auth/me')).family.id, gt = tx(gfam);
  const tb = await G('POST', '/api/purchases/apple', { transaction: jws(gt) });
  ok(tb.status === 409 && tb.code === 'test_purchase', 'their TestFlight purchase is refused', tb);
  ok((await G('POST', '/api/purchases/apple', { transactions: [jws({ ...gt, environment: undefined })] })).code === 'test_purchase', 'so is one with no environment');
  await fetch(BASE + '/api/appstore/notifications', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(note('SUBSCRIBED', gt)) });
  ok((await G('GET', '/api/plan')).plan === 'free', 'a sandbox notification doesn’t turn Plus on either');
  const gp = tx(gfam, { productId: 'chorecast.pack.money', transactionId: 'tp' + Date.now(), expiresDate: undefined, offerType: undefined });
  ok((await G('POST', '/api/shop/buy', { transaction: jws(gp) })).code === 'test_purchase', 'nor a sandbox lesson pack from the shop');
  ok(!(await G('GET', '/api/plan')).packs.includes('money'), 'the pack stays locked');
  const rb = await G('POST', '/api/purchases/apple', { transaction: jws({ ...gt, originalTransactionId: '2000' + Math.floor(Math.random() * 1e6), environment: 'Production' }) });
  ok(rb.status === 200 && rb.plan === 'plus', 'a real App Store purchase still works for them', rb);
  ok((await G('POST', '/api/shop/buy', { transaction: jws({ ...gp, environment: 'Production' }) })).status === 200 && (await G('GET', '/api/plan')).packs.includes('money'), 'and a real pack');

  // ---- P0-06 errors and health
  ok((await P('POST', '/api/errors', { message: 'TypeError: x is undefined at 12:34', stack: 'at viewKid', where: 'kid' })).ok, 'the app can report a crash');
  await P('POST', '/api/errors', { message: 'TypeError: x is undefined at 56:78', where: 'kid' });
  const errs = await client({ authorization: 'Bearer admin-test-token-123' })('GET', '/api/admin/errors');
  ok(errs.errors && errs.errors.length === 1 && errs.errors[0].count === 2, 'the same crash is grouped and counted', errs.errors);
  ok((await P('GET', '/api/admin/errors')).status === 404, 'error list needs the admin token');
  const h = await P('GET', '/api/health');
  ok(h.ok && h.paywall === true && h.mail === false, 'health checks the database and says what’s on', h);

  // ---- P0-14 push registration
  ok((await B('PUT', '/api/push', { token: 'abc' })).code === 'bad_token', 'push needs a real token');
  ok((await B('PUT', '/api/push', { token: 'ab'.repeat(32), environment: 'sandbox', tz: 'Pacific/Auckland' })).ok, 'the app registers for push');
  ok((await B('DELETE', '/api/push')).ok, 'and can stop');
} finally {
  srv.kill(); await new Promise(r => setTimeout(r, 500));
}

// ---- P0-06 backup and a tested restore
{
  const src = new PGlite(env.PGLITE_DIR); await src.waitReady;
  const db = { kind: 'pglite', query: (t, p) => src.query(t, p), exec: t => src.exec(t), tx: fn => src.transaction(t => fn({ q: (x, p) => t.query(x, p), exec: x => t.exec(x) })), close: () => src.close() };
  await db.query(`insert into photos (id, family_id, mime, bytes, size, kind) select 'ph1', id, 'image/jpeg', '\\xdeadbeef'::bytea, 4, 'proof' from families limit 1`);
  const file = path.join(dir, 'backup.jsonl.gz');
  const counts = await backup(db, file);
  const sum = async d => { const out = {}; for (const t of Object.keys(counts)) out[t] = (await d.query(`select count(*)::int as n from ${t}`)).rows[0].n; return out; };
  const want = await sum(db);
  await src.close();
  const dst = new PGlite(path.join(dir, 'restored')); await dst.waitReady;
  const db2 = { kind: 'pglite', query: (t, p) => dst.query(t, p), exec: t => dst.exec(t), tx: fn => dst.transaction(t => fn({ q: (x, p) => t.query(x, p), exec: x => t.exec(x) })), close: () => dst.close() };
  await restore(db2, file);
  const have = await sum(db2);
  delete want.schema_migrations; delete have.schema_migrations;
  ok(JSON.stringify(want) === JSON.stringify(have), 'restore brings back every row', { want, have });
  ok(Buffer.from((await db2.query(`select bytes from photos where id = 'ph1'`)).rows[0].bytes).toString('hex') === 'deadbeef', 'photos come back byte for byte');
  const kidsBefore = want.kids; ok(kidsBefore >= 4, 'there was real data to restore', kidsBefore);
  await db2.query(`insert into events (family_id, type) select id, 'after.restore' from families limit 1`);
  ok(true, 'new events can be added after a restore (id counter moved on)');
  try { await restore(db2, file); ok(false, 'restore refuses a database that has families'); } catch (e) { ok(/already has families/.test(e.message), 'restore refuses a database that has families', e.message); }
  await dst.close();
}

console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /Error|error|fail/i.test(l)).slice(0, 12).join('\n'));
process.exit(failN ? 1 : 0);
