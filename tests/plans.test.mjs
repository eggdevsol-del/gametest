// Free vs Plus on the server: what a Free family can add (starter island, Snail bond, unit 1 lessons, standard money
// rules), that nothing already theirs is taken away, resting kids, "Preview the free plan", upgrade moments and the
// welcome fortnight.
// node tests/plans.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
async function server(port, env) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-tiers-'));
  const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(port), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '', ...env } });
  let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
  return { srv, log: () => log };
}
function client(port) {
  let cookie = '';
  return async (method, url, body) => {
    const r = await fetch(`http://localhost:${port}` + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
}
const item = (t, extra) => ({ id: 'i' + Math.random().toString(36).slice(2), t, x: 0.3, z: 0.2, r: 0, ...extra });
const kidDoc = name => ({ name, age: 9, jars: { spend: 0, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0 } });

const A = await server(8792, {}), B = await server(8791, { PAYWALL: 'on' });
try {
  const P = client(8792), K = client(8792);
  await P('POST', '/api/auth/signup', { email: 'tiers@test.localhost', password: 'correct-horse-9', name: 'P', consent: true });
  for (const [id, n] of [['k1', 'Ari'], ['k2', 'Bo'], ['k3', 'Cy']]) await P('PUT', `/api/docs/kids/${id}`, kidDoc(n));
  const { code } = await P('POST', '/api/devices/code', {}); await K('POST', '/api/devices/pair', { code, name: 'iPad' });
  const kid = async id => (await K('GET', '/api/sync')).kids[id];
  const plan = () => P('GET', '/api/plan');

  // Before launch every family has Plus, so anything can be added.
  ok((await plan()).plan === 'plus' && (await plan()).preview === false, 'before launch a family has Plus');
  let I = (await kid('k1')).island;
  ok((await K('PATCH', '/api/docs/kids/k1', { island: { ...I, xpSpent: 700, items: [item('kangaroo', { xp: 700 })] } })).status === 200, 'Plus: a kangaroo from the full shop');
  ok((await P('PATCH', '/api/docs/kids/k1', { holdings: { rocket: { units: 2, cost: 400 } } })).status === 200, 'Plus: Rocket Startups units');
  ok((await P('PATCH', '/api/docs/family/settings', { taxRate: 15, interestWeekly: 3 })).status === 200, 'Plus: own interest and tax rates');

  // "Preview the free plan" makes the server behave exactly as Free.
  await P('PATCH', '/api/docs/family/settings', { planPreview: 'free' });
  const pf = await plan(); ok(pf.plan === 'free' && pf.preview === true && pf.limits.shop === 'starter', 'the preview switch makes the plan Free', pf);
  I = (await kid('k1')).island;
  // Starter shop: yes. The rest: no, from a kid's iPad or a grown-up's phone.
  ok((await K('PATCH', '/api/docs/kids/k1', { island: { ...I, xpSpent: I.xpSpent + 400, items: [...I.items, item('kiwi', { xp: 400 })] } })).status === 200, 'Free: a kiwi from the starter shop');
  I = (await kid('k1')).island;
  const kanga = await K('PATCH', '/api/docs/kids/k1', { island: { ...I, xpSpent: I.xpSpent + 700, items: [...I.items, item('kangaroo', { xp: 700 })] } });
  ok(kanga.status === 402 && kanga.code === 'plan_limit' && /Plus/.test(kanga.error), 'Free: a second kangaroo comes with Plus', kanga);
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, items: [...I.items, item('ferris', { xp: 5000 })] } })).code === 'plan_limit', 'Free: a grown-up’s phone can’t add Plus things either');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, items: [...I.items, item('dragon', { won: 1 })] } })).status === 200, 'Free: prizes are never Plus-only');
  I = (await kid('k1')).island;
  const moved = I.items.map(i => (i.t === 'kangaroo' ? { ...i, x: -0.2 } : i));
  ok((await K('PATCH', '/api/docs/kids/k1', { island: { ...I, items: moved } })).status === 200, 'Free: the kangaroo bought on Plus stays, and can be moved');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, land: { plot: { xp: 800 } } } })).status === 200, 'Free: the vege plot island');
  I = (await kid('k1')).island;
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, land: { ...I.land, beach: { xp: 1500 } } } })).code === 'plan_limit', 'Free: the beach island comes with Plus');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, size: 1, sizes: { 1: { xp: 1200 } } } })).status === 200, 'Free: island size 1');
  I = (await kid('k1')).island;
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, size: 2, sizes: { ...I.sizes, 2: { xp: 2500 } } } })).code === 'plan_limit', 'Free: size 2 comes with Plus');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, owned: { 'wall:sky': { xp: 200 } } } })).status === 200, 'Free: a starter makeover colour');
  I = (await kid('k1')).island;
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, owned: { ...I.owned, 'wall:coral': { xp: 250 } } } })).code === 'plan_limit', 'Free: other colours come with Plus');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, tools: { mower: { xp: 600 } } } })).status === 200, 'Free: the mower for island jobs');
  I = (await kid('k1')).island;
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, tools: { ...I.tools, rod: { xp: 500 } } } })).code === 'plan_limit', 'Free: the fishing rod comes with Plus');

  // Market: the Snail bond, and selling anything already owned.
  ok((await P('PATCH', '/api/docs/kids/k1', { holdings: { rocket: { units: 2, cost: 400 }, snail: { units: 1, cost: 100 } } })).status === 200, 'Free: Snail Savings Bond units');
  ok((await P('PATCH', '/api/docs/kids/k1', { holdings: { rocket: { units: 3, cost: 600 }, snail: { units: 1, cost: 100 } } })).code === 'plan_limit', 'Free: more Rocket Startups comes with Plus');
  ok((await P('PATCH', '/api/docs/kids/k1', { holdings: { rocket: { units: 0.5, cost: 100 }, snail: { units: 1, cost: 100 } } })).status === 200, 'Free: Rocket units bought on Plus can be sold');

  // Lessons: unit 1 of each subject; a lesson pack opens the rest of its subject.
  ok((await K('PATCH', '/api/docs/growth/k1', { done: { 'money.sprouts.1.1': { best: 1, at: Date.now() } } })).status === 200, 'Free: a unit 1 lesson');
  ok((await K('PATCH', '/api/docs/growth/k1', { done: { 'money.sprouts.2.1': { best: 1, at: Date.now() } } })).code === 'plan_limit', 'Free: unit 2 comes with Plus');
  ok((await P('PATCH', '/api/docs/growth/k1', { done: { 'character.sprouts.3.2': { best: 1 } } })).code === 'plan_limit', 'Free: not from a grown-up’s phone either');

  // Money rules: the standard rates or off. A tuned rate already there doesn't block other settings.
  ok((await P('PATCH', '/api/docs/family/settings', { remindAt: 17 })).status === 200, 'Free: other settings save while an old tuned rate is still there');
  ok((await P('PATCH', '/api/docs/family/settings', { taxRate: 20 })).code === 'plan_limit', 'Free: choosing a tax rate comes with Plus');
  ok((await P('PATCH', '/api/docs/family/settings', { taxRate: 10, interestWeekly: 0 })).status === 200, 'Free: standard tax, interest off');
  ok((await P('PATCH', '/api/docs/family/settings', { interestWeekly: 2.5 })).code === 'plan_limit', 'Free: choosing an interest rate comes with Plus');

  // Kids over the limit: a grown-up rests one; a resting kid's iPad can't change anything; waking needs room.
  ok((await K('PATCH', '/api/docs/kids/k3', { resting: true })).code === 'not_allowed', 'a kid can’t put themselves to rest (or wake)');
  ok((await P('PATCH', '/api/docs/kids/k3', { resting: true })).status === 200, 'a grown-up rests Cy');
  const cyI = (await kid('k3')).island;
  ok((await K('PATCH', '/api/docs/kids/k3', { island: { ...cyI, xpSpent: 400, items: [item('kiwi', { xp: 400 })] } })).code === 'resting', 'a resting kid’s iPad can’t buy');
  ok((await K('PATCH', '/api/docs/growth/k3', { done: { 'money.sprouts.1.1': { best: 1 } } })).code === 'resting', 'or do lessons');
  ok((await K('PUT', '/api/docs/jobs/j1', { kidId: 'k3', title: 'Bed', status: 'pending', date: '2026-11-03' })).code === 'resting', 'or send a chore');
  ok((await K('PATCH', '/api/docs/kids/k3', { giftSeen: Date.now() })).status === 200, 'it can still mark a gift as seen');
  ok((await P('PATCH', '/api/docs/kids/k3', { resting: false })).code === 'plan_limit', 'waking Cy needs room in the plan');
  await P('PATCH', '/api/docs/kids/k2', { resting: true });
  ok((await P('PATCH', '/api/docs/kids/k3', { resting: false })).status === 200, 'with Bo resting, Cy can wake');
  ok((await P('PUT', '/api/docs/kids/k4', kidDoc('Di'))).code === 'plan_limit', 'Free: a third active kid can’t be added');

  // Upgrade moments are recorded for grown-ups only.
  ok((await P('POST', '/api/plan/moment', { moment: 'unit1', kidId: 'k1', action: 'shown' })).ok, 'a moment is recorded');
  ok((await P('POST', '/api/plan/moment', { moment: 'unit1', kidId: 'k1', action: 'plans' })).ok, 'and what the grown-up did');
  ok(typeof (await plan()).moments.unit1 === 'number', 'the plan says when each moment was last shown');
  ok((await P('POST', '/api/plan/moment', { moment: 'buy-now', action: 'shown' })).code === 'bad_moment', 'made-up moments are refused');
  ok((await K('POST', '/api/plan/moment', { moment: 'unit1', action: 'shown' })).status === 403, 'a kid’s iPad can’t record moments');

  // Switching the preview off brings Plus back.
  await P('PATCH', '/api/docs/family/settings', { planPreview: null });
  ok((await plan()).plan === 'plus', 'preview off: Plus again');
  I = (await kid('k1')).island;
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, land: { ...I.land, beach: { xp: 1500 } } } })).status === 200, 'Plus: the beach island');
  ok((await P('PATCH', '/api/docs/kids/k2', { resting: false })).status === 200, 'Plus: everyone can be awake');
  ok((await P('PATCH', '/api/docs/family/settings', { taxRate: 25 })).status === 200, 'Plus: own rates again');

  // With the paywall on, a new family has Plus for its welcome fortnight.
  const Q = client(8791);
  await Q('POST', '/api/auth/signup', { email: 'welcome@test.localhost', password: 'correct-horse-9', name: 'W', consent: true });
  const w = await Q('GET', '/api/plan'), days = (new Date(w.until) - Date.now()) / 864e5;
  ok(w.plan === 'plus' && w.welcome === true && days > 13.9 && days <= 14, 'paywall on: a new family has Plus for 14 days', w);
  ok(w.paywall === true && !('beta' in w), 'and there’s no beta flag', Object.keys(w));
  for (const id of ['k1', 'k2', 'k3']) await Q('PUT', `/api/docs/kids/${id}`, kidDoc(id));
  ok((await Q('GET', '/api/sync')).kids.k3, 'the welcome fortnight has room for every kid');
} finally { A.srv.kill(); B.srv.kill(); await new Promise(r => setTimeout(r, 400)); }
console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log((A.log() + B.log()).split('\n').filter(l => /Error|error/i.test(l)).slice(0, 10).join('\n'));
process.exit(failN ? 1 : 0);
