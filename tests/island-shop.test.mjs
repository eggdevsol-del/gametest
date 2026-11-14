// The island shop on the server: a kid's iPad can only buy at the catalogue's prices, prizes are free only when won,
// land grows one size at a time, farm earnings stop at the family's limit, collections pay once.
// node tests/island-shop.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const PORT = 8796, BASE = 'http://localhost:' + PORT, dir = mkdtempSync(path.join(os.tmpdir(), 'cc-shop-'));
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
function client() {
  let cookie = '';
  return async (method, url, body) => {
    const r = await fetch(BASE + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
}
const today = new Date().toISOString().slice(0, 10);
try {
  const P = client(), K = client();
  await P('POST', '/api/auth/signup', { email: 'shop@test.localhost', password: 'correct-horse-9', name: 'P', consent: true });
  await P('PUT', '/api/docs/family/settings', { taxRate: 10, interestWeekly: 2 });
  await P('PUT', '/api/docs/kids/k1', { name: 'Ari', age: 9, jars: { spend: 5000, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0 } });
  const { code } = await P('POST', '/api/devices/code', {}); await K('POST', '/api/devices/pair', { code, name: 'iPad' });
  const kid = async () => (await K('GET', '/api/sync')).kids.k1;
  const W = async isl => K('PATCH', '/api/docs/kids/k1', { island: isl });
  let k = await kid(), I = k.island;
  const item = (t, extra) => ({ id: 'i' + Math.random().toString(36).slice(2), t, x: 0.3, z: 0.2, r: 0, ...extra });

  ok((await W({ ...I, xpSpent: 300, items: [item('bunny', { xp: 300 })] })).status === 200, 'buy a bunny at its price');
  k = await kid(); I = k.island;
  ok((await W({ ...I, xpSpent: I.xpSpent + 100, items: [...I.items, item('kangaroo', { xp: 100 })] })).code === 'not_allowed', 'a kangaroo for less is refused');
  ok((await W({ ...I, items: [...I.items, item('made-up-thing', { xp: 0 })] })).code === 'not_allowed', 'unknown things are refused');
  ok((await W({ ...I, items: [...I.items, item('dragon', { won: 1 })] })).status === 200, 'a won prize is free');
  k = await kid(); I = k.island;
  ok((await W({ ...I, items: [...I.items, item('kangaroo', { won: 1 })] })).code === 'not_allowed', 'only prizes are free');
  ok((await W({ ...I, xpSpent: I.xpSpent + 1, items: [...I.items, item('phoenix', { xp: 1 })] })).code === 'not_allowed', 'prizes can’t be bought');

  ok((await W({ ...I, xpSpent: I.xpSpent + 2500, size: 2, sizes: { 2: { xp: 2500 } } })).code === 'not_allowed', 'can’t skip a size');
  ok((await W({ ...I, xpSpent: I.xpSpent + 100, size: 1, sizes: { 1: { xp: 100 } } })).code === 'not_allowed', 'a bigger island costs its price');
  ok((await W({ ...I, xpSpent: I.xpSpent + 1200, size: 1, sizes: { 1: { xp: 1200 } } })).status === 200, 'grow the island one size');
  k = await kid(); I = k.island;
  ok((await W({ ...I, xpSpent: I.xpSpent + 10, land: { beach: { xp: 10 } } })).code === 'not_allowed', 'land costs its price');
  ok((await W({ ...I, xpSpent: I.xpSpent + 1500, land: { beach: { xp: 1500 } } })).status === 200, 'buy the beach');
  k = await kid(); I = k.island;
  ok((await W({ ...I, tools: { spade: true } })).code === 'not_allowed', 'a tool has to be paid for');
  ok((await W({ ...I, xpSpent: I.xpSpent + 400, tools: { spade: { xp: 400 } } })).status === 200, 'buy the tree spade');
  k = await kid(); I = k.island;
  ok((await W({ ...I, owned: { 'fence:picket': 'won' } })).code === 'not_allowed', 'a shop look isn’t free');
  ok((await W({ ...I, owned: { 'rock:crystal': 'won' } })).status === 200, 'a prize look can be won');
  k = await kid(); I = k.island;
  ok((await W({ ...I, treeType: { 0: 'kauri' } })).code === 'not_allowed', 'tree types have to be bought first');
  ok((await W({ ...I, xpSpent: I.xpSpent + 400, owned: { ...I.owned, 'tree:kauri': { xp: 400 } }, treeType: { 0: 'kauri' } })).status === 200, 'buy kauri and give it to a tree');
  k = await kid(); I = k.island;
  // Spend-jar money still has to match the statement
  ok((await K('PATCH', '/api/docs/kids/k1', { island: { ...I, items: [...I.items, item('kiwi', { cash: 300 })] } })).code === 'not_allowed', 'cash buys need a statement entry');

  // Farm: at most the daily limit (150 unless changed), and only going up
  ok((await W({ ...I, farmXp: 100, farmDay: { d: today, xp: 100 } })).status === 200, 'farm sale within the limit');
  k = await kid(); I = k.island;
  ok((await W({ ...I, farmXp: 200, farmDay: { d: today, xp: 200 } })).code === 'not_allowed', 'farm earnings stop at 150 a day');
  ok((await W({ ...I, farmXp: 160, farmDay: { d: today, xp: 100 } })).code === 'not_allowed', 'farm total has to match the day');
  await P('PATCH', '/api/docs/family/settings', { farmCap: 400 });
  ok((await W({ ...I, farmXp: 300, farmDay: { d: today, xp: 300 } })).status === 200, 'a bigger limit from a grown-up allows more');
  await P('PATCH', '/api/docs/family/settings', { farmOn: false });
  k = await kid(); I = k.island;
  ok((await W({ ...I, farmXp: 310, farmDay: { d: today, xp: 310 } })).code === 'not_allowed', 'no farm earnings when the farm is off');

  // Island activities: up to 60 XP a day unless changed, and only when they're on
  await P('PATCH', '/api/docs/family/settings', { farmOn: true });
  k = await kid(); I = k.island;
  ok((await W({ ...I, playXp: 40, playDay: { d: today, xp: 40 } })).status === 200, 'activity XP within the limit');
  k = await kid(); I = k.island;
  ok((await W({ ...I, playXp: 70, playDay: { d: today, xp: 70 } })).code === 'not_allowed', 'activity XP stops at 60 a day');
  ok((await W({ ...I, playXp: 50, playDay: { d: today, xp: 45 } })).code === 'not_allowed', 'activity total has to match the day');
  await P('PATCH', '/api/docs/family/settings', { playOn: false });
  ok((await W({ ...I, playXp: 45, playDay: { d: today, xp: 45 } })).code === 'not_allowed', 'no activity XP when switched off');
  await P('PATCH', '/api/docs/family/settings', { playOn: true });
  k = await kid(); I = k.island;

  // Collections pay 250 once
  ok((await W({ ...I, sets: { nzbirds: Date.now() }, bonusXp: 500 })).code === 'not_allowed', 'a collection pays 250, not 500');
  ok((await W({ ...I, sets: { nzbirds: Date.now() }, bonusXp: 250 })).status === 200, 'claim a collection');
  ok((await W({ ...I, sets: { madeup: Date.now() }, bonusXp: 250 })).code === 'not_allowed', 'only real collections');

  // Unlocking the whole shop is a grown-up's switch
  k = await kid(); I = k.island;
  ok((await W({ ...I, unlockAll: true })).code === 'not_allowed', 'a kid can’t unlock the whole shop');
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...I, unlockAll: true } })).status === 200, 'a grown-up can unlock it');
  k = await kid(); I = k.island;
  ok(I.unlockAll === true && (await W({ ...I, items: [...I.items, item('phoenix', { won: 1 })] })).status === 200, 'unlocked: a kid places any prize');
  k = await kid(); I = k.island;
  ok((await W({ ...I, unlockAll: false })).code === 'not_allowed', 'a kid can’t switch it off either');

  // A grown-up's phone isn't checked
  ok((await P('PATCH', '/api/docs/kids/k1', { island: { ...(await kid()).island, items: [item('ferris', { xp: 1 })] } })).status === 200, 'grown-ups can change anything');
  const sale = await K('POST', '/api/events', { events: [{ type: 'farm.sell', kidId: 'k1', payload: { k: 'egg', n: 3, price: 14, xp: 42 } }] });
  ok(sale.saved === 1, 'farm sales are logged');
  const play = await K('POST', '/api/events', { events: [{ type: 'island.play', kidId: 'k1', payload: { act: 'lake', n: 4, xp: 11 } }] });
  ok(play.saved === 1, 'play sessions are logged');
} finally { srv.kill(); await new Promise(r => setTimeout(r, 400)); }
console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /Error|error/i.test(l)).slice(0, 10).join('\n'));
process.exit(failN ? 1 : 0);
