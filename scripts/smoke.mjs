// Smoke test: starts the server on a throwaway embedded database and walks one family through the main flows, the way
// the app calls the API: sign up, set the PIN, add a kid, pair the kid's iPad, send a job, approve and pay it, buy in
// the Market, and delete the account. Run before every release:  npm run smoke
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { priceAt, tickAt } from '../server/market.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8000 + Math.floor(Math.random() * 900), BASE = `http://localhost:${PORT}`, dir = mkdtempSync(path.join(os.tmpdir(), 'chorecast-smoke-'));
let passed = 0, failed = 0;
const check = (cond, what, detail) => { if (cond) { passed++; console.log('  ok  ', what); } else { failed++; console.log('  FAIL', what, detail === undefined ? '' : JSON.stringify(detail).slice(0, 300)); } };

const srv = spawn(process.execPath, [path.join(root, 'server/index.js'), '--port', String(PORT), '--static', path.join(root, 'public')], { env: { ...process.env, PGLITE_DIR: path.join(dir, 'db'), DATABASE_URL: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 200 && !log.includes('Chorecast server on'); i++) await new Promise(r => setTimeout(r, 100));

function device() {
  let cookie = '';
  return async (method, url, body) => {
    const r = await fetch(BASE + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? `cc_session=${m[1]}` : ''; }
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
}
const entry = e => ({ id: 'e' + Math.random().toString(36).slice(2), at: Date.now(), ...e });

try {
  check(log.includes('Chorecast server on'), 'server starts', log.slice(-300));
  const page = await fetch(BASE + '/chorecast/');
  check(page.status === 200 && (page.headers.get('content-security-policy') || '').includes('sha256-'), 'app page loads with its security policy');

  const grownUp = device(), ipad = device();
  const me = await grownUp('POST', '/api/auth/signup', { email: 'smoke@test.localhost', password: 'smoke-test-password', name: 'Sam', consent: true });
  check(me.status === 200 && me.recovery, 'sign up a family', me);
  check((await grownUp('PUT', '/api/pin', { pin: '2468' })).status === 200, 'set the grown-up PIN');
  check((await grownUp('PUT', '/api/docs/family/settings', { taxRate: 10, interestWeekly: 2, pinSet: true })).status === 200, 'save money rules');
  const kid = { name: 'Ari', age: 9, avatar: '🦊', hue: 'sky', order: 0, createdAt: Date.now(), jars: { spend: 0, save: 0, invest: 0, give: 0 }, holdings: {}, ledger: [], earned: 0, taxPaid: 0 };
  check((await grownUp('PUT', '/api/docs/kids/ari', kid)).status === 200, 'add a kid');

  const { code } = await grownUp('POST', '/api/devices/code', {});
  check((await ipad('POST', '/api/devices/pair', { code, name: 'Ari’s iPad' })).role === 'kid', 'pair the kid’s iPad');

  const job = { kidId: 'ari', key: 'bed', title: 'Make your bed', status: 'pending', at: Date.now(), date: new Date().toISOString().slice(0, 10), stars: 3 };
  check((await ipad('PUT', '/api/docs/jobs/j1', job)).status === 200, 'kid sends a job for approval');
  check((await ipad('PATCH', '/api/docs/jobs/j1', { status: 'approved', reviewedAt: Date.now() })).status === 403, 'kid can’t approve their own job');

  const net = 900, parts = { spend: 400, save: 300, invest: 200, give: 0 };
  check((await grownUp('PATCH', '/api/docs/jobs/j1', { status: 'approved', reviewedAt: Date.now(), paid: { gross: 1000, tax: 100, net } })).status === 200, 'grown-up approves the job');
  const paid = await grownUp('PATCH', '/api/docs/kids/ari', { jars: parts, earned: 1000, taxPaid: 100, ledger: [entry({ kind: 'pay', amt: net, memo: 'Make your bed', gross: 1000, tax: 100, parts })] });
  check(paid.status === 200 && paid.data.jars.save === 300, 'grown-up pays it into the jars', paid);

  const sync = await ipad('GET', '/api/sync');
  const k = sync.kids && sync.kids.ari;
  check(k && k.jars.invest === 200 && sync.jobs.j1.status === 'approved', 'kid’s iPad sees the pay');
  const units = +(200 / priceAt('forest', tickAt(Date.now()))).toFixed(6);
  const buy = await ipad('PATCH', '/api/docs/kids/ari', { jars: { ...k.jars, invest: 0 }, holdings: { forest: { units, cost: 200 } }, ledger: [entry({ kind: 'buy', amt: -200, memo: 'Bought Whole Forest Fund' }), ...k.ledger] });
  check(buy.status === 200, 'kid buys in the Market', buy);
  check((await ipad('PATCH', '/api/docs/kids/ari', { jars: { ...k.jars, spend: 99999 } })).status >= 400, 'kid can’t make money up');

  const plan = await grownUp('GET', '/api/plan');
  check(plan.status === 200 && plan.limits && plan.limits.kids > 0, 'plan answers', plan);
  check((await grownUp('POST', '/api/events', { events: [{ type: 'smoke.test', kidId: 'ari', payload: {} }] })).saved === 1, 'event log takes events');

  const gone = await grownUp('POST', '/api/account/delete', { password: 'smoke-test-password', scope: 'family' });
  check(gone.deleted === 'family', 'delete the family account', gone);
  check((await ipad('GET', '/api/sync')).status === 401, 'kid’s iPad is signed out');
} finally {
  srv.kill();
  await new Promise(r => setTimeout(r, 300));
  rmSync(dir, { recursive: true, force: true });
}
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
