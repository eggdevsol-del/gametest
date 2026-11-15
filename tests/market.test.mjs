// Market town (2026-11-15): the land is in the shop at its price, a kid's market things (bag, friends, stall) are kept
// small and honest by the guard, migration 024 makes market_days, and a kid's day at the market adds up there for the
// grown-ups. The live part (brothers and sisters) is the village channel's, checked in the browser.
// node tests/market.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { checkKidWrite } from '../server/guard.js';
import { LAND } from '../server/catalog.js';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); } };

// ---- the land and the guard (no server needed)
const land = LAND.get('market');
ok(land && land.xp === 4000 && land.cash === 3200, 'Market town is land in the shop at 4,000 XP or $32', land);
const base = { name: 'Ari', jars: { spend: 0, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0, playXp: 0 } };
const kid = island => ({ ...base, island: { ...base.island, ...island } });
const w = (p, n) => checkKidWrite(kid(p), kid(n), {});
ok(w({}, { land: { market: { xp: 4000 } }, xpSpent: 4000 }) === null, 'buying Market town with XP is fine');
ok(w({}, { land: { market: { xp: 100 } }, xpSpent: 100 }) !== null, 'but not for less than its price');
ok(w({}, { market: { bag: { cupcake: 1 }, friends: {}, stall: ['egg'] }, xpSpent: 10 }) === null, 'a cupcake in the bag and eggs on the stall');
ok(w({}, { market: { bag: { cupcake: 50 } } }) !== null, 'no more than 9 of a thing in the bag');
ok(w({ market: { friends: { mia: 1 } } }, { market: { friends: { mia: 2 } } }) === null, 'a friend gains a heart');
ok(w({ market: { friends: { mia: 1 } } }, { market: { friends: { mia: 4 } } }) !== null, 'but only one at a time');
ok(w({}, { market: { friends: { mia: 6 } } }) !== null, 'and never more than 5');
ok(w({}, { market: { stall: ['egg', 'milk', 'honey', 'jam', 'wool'] } }) !== null, 'a stall holds four kinds of things');
ok(w({}, { market: { bag: Object.fromEntries([...Array(30)].map((_, i) => ['w' + i, 1])) } }) !== null, 'a bag of 30 kinds is too many');

// ---- the server: migration 024 and a kid's day at the market
const PORT = 18795, BASE = 'http://localhost:' + PORT, dir = mkdtempSync(path.join(os.tmpdir(), 'cc-market-'));
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 600 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
ok(/Chorecast server on/.test(log), 'server starts', log.slice(-600));
ok(/migration applied: 024_market_days\.sql/.test(log), 'migration 024 makes market_days', log.slice(-600));

let cookie = '';
const C = async (method, url, body) => {
  const r = await fetch(BASE + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
  for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
try {
  ok((await C('POST', '/api/market/day', { kidId: 'k1', served: 1 })).status === 401, 'signed out, nothing is logged');
  ok((await C('POST', '/api/auth/signup', { email: 'market@test.localhost', password: 'correct-horse-9', name: 'Market', consent: true })).status === 200, 'a grown-up signs up');
  ok((await C('PUT', '/api/docs/kids/k1', { ...base, createdAt: Date.now(), order: 0, avatar: '🦊', hue: '#4DABF7' })).status === 200, 'a kid is added');
  ok((await C('POST', '/api/market/day', { kidId: 'nobody', served: 1 })).status === 404, 'only for a kid in the family');
  ok((await C('POST', '/api/market/day', { kidId: 'k1', served: 2, xp: 4 })).status === 200, 'two customers served, 4 XP');
  ok((await C('POST', '/api/market/day', { kidId: 'k1', sold: 1, quests: 1, xp: 18 })).status === 200, 'an egg sold and a request done');
  ok((await C('POST', '/api/market/day', { kidId: 'k1', served: 9999, xp: 99999 })).status === 200, 'a silly post is capped');
  const d = await C('GET', '/api/market/days?kid=k1'), row = (d.days || [])[0] || {};
  ok(d.days && d.days.length === 1, 'one row for the day', d);
  ok(row.served === 22 && row.sold === 1 && row.quests === 1 && row.xp === 422, 'the day adds up (and the silly post only added its cap)', row);
} catch (e) { failN++; console.log('FAIL: threw', e); }
srv.kill();
console.log(`${passN} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
