// Tests for H1–H3 against a real Chorecast server on a throwaway database seeded with old-style PIN hashes.
// node tests/pins-and-guard.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PGlite } = await import('@electric-sql/pglite');
const { hashPassword } = await import(path.join(REPO, 'server/auth.js'));
const M = await import(path.join(REPO, 'server/market.js'));

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
const sha = s => createHash('sha256').update(s).digest('hex');
const DAY = 864e5, utcDay = ms => new Date(ms).toISOString().slice(0, 10);

// ---- 1. The server's Market prices are the app's, to the last digit
{
  // The app's own script, taken from the page (its biggest inline script).
  const page = readFileSync(path.join(REPO, 'public/chorecast/index.html'), 'utf8'), src = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).sort((a, b) => b.length - a.length)[0];
  const line = start => { const i = src.indexOf(start); if (i < 0) throw new Error('missing ' + start); return src.slice(i, src.indexOf('\n', i)); };
  const fundsI = src.indexOf('const FUNDS = ['), funds = src.slice(fundsI, src.indexOf('];', fundsI) + 2);
  const mI = src.indexOf('const EPOCH = Date.UTC'), mEnd = src.indexOf('\n', src.indexOf('function price(id'));
  const code = [line('const clamp = '), line('function hash(str)'), line('function mulberry(a)'), funds, src.slice(mI, mEnd), 'buildMarket(); globalThis.out = { price, last: Market.last };'].join('\n');
  const ctx = { Math, Float64Array, Date }; vm.createContext(ctx); vm.runInContext(code, ctx);
  const { price, last } = ctx.out; let worst = 0;
  for (const id of ['snail', 'forest', 'scoops', 'rocket']) for (const t of [1, 2, 7, 100, 999, Math.floor(last / 2), last - 1, last]) worst = Math.max(worst, Math.abs(price(id, t) - M.priceAt(id, t)));
  ok(worst === 0, 'market prices match the app exactly', worst);
  ok(M.tickAt(Date.now()) === last, 'tick matches the app', [M.tickAt(Date.now()), last]);
}

// ---- 2. A database made by the current live version: old-style hashes in synced data
const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-pins-'));
{
  const db = new PGlite(dir); await db.waitReady;
  await db.exec('create table if not exists schema_migrations (version integer primary key, name text not null, applied_at timestamptz not null default now())');
  const mig = path.join(REPO, 'server/migrations');
  for (const f of readdirSync(mig).filter(f => /^00[1-7]_/.test(f)).sort()) { await db.exec(readFileSync(path.join(mig, f), 'utf8')); await db.query('insert into schema_migrations (version, name) values ($1, $2)', [parseInt(f, 10), f]); }
  await db.query(`insert into users (id, email, name, password_hash) values ('u1', 'grownup@test.localhost', 'Test', $1)`, [await hashPassword('correct-horse-9')]);
  await db.query(`insert into families (id, name, created_by) values ('f1', 'Test family', 'u1')`);
  await db.query(`insert into family_members (family_id, user_id, role) values ('f1', 'u1', 'parent')`);
  await db.query(`insert into family_settings (family_id, data) values ('f1', $1::jsonb)`, [JSON.stringify({ interestWeekly: 2, taxRate: 10, pinHash: sha('chorecast|2580') })]);
  const now = Date.now();
  const k1 = { name: 'Ari', age: 8, avatar: '🦊', hue: 'sky', order: 0, createdAt: now - 30 * DAY, jars: { spend: 1000, save: 5000, invest: 2000, give: 0 }, holdings: {}, split: { spend: 50, save: 30, invest: 10, give: 10 },
    interestAt: utcDay(now - 3 * DAY), interestEarned: 0, ledger: [{ id: 'L0', at: now - 5 * DAY, kind: 'pay', amt: 8000, memo: 'Setup', gross: 8000, tax: 0, parts: { spend: 1000, save: 5000, invest: 2000, give: 0 } }],
    island: { items: [{ id: 'i1', t: 'swing', x: 0.1, z: 0.2, r: 1, cash: 400 }, { id: 'i0', t: 'bench', x: 0.3, z: 0.1, r: 0, xp: 120 }], xpSpent: 220 }, earned: 8000, taxPaid: 0, pin: sha('chorecast|kid|k1|1357') };
  await db.query(`insert into kids (family_id, id, data) values ('f1', 'k1', $1::jsonb), ('f1', 'k2', $2::jsonb)`, [JSON.stringify(k1), JSON.stringify({ name: 'Bo', age: 10, jars: { spend: 50 }, ledger: [] })]);
  await db.close();
}

// ---- 3. Start the new server on it (migration 008 runs at start)
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', '8799', '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 100 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
ok(/migration applied: 008_pins.sql/.test(log), 'migration 008 ran', log);

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const r = await fetch('http://localhost:8799' + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    return { status: r.status, ...(await r.json().catch(() => ({}))) };
  };
}
const led = (k, e) => [{ id: 'e' + Math.random().toString(36).slice(2), at: Date.now(), ...e }, ...(k.ledger || [])].slice(0, 240);

try {
  const P = client(), K = client(), K2 = client();
  ok((await P('POST', '/api/auth/login', { email: 'grownup@test.localhost', password: 'correct-horse-9' })).status === 200, 'grown-up signs in');
  const pair = async C => { const { code } = await P('POST', '/api/devices/code', {}); return C('POST', '/api/devices/pair', { code, name: 'Kids iPad' }); };
  ok((await pair(K)).role === 'kid', 'kid iPad pairs');

  // H1/H2: nothing a device receives can unlock grown-ups
  let sync = await K('GET', '/api/sync'), txt = JSON.stringify(sync);
  ok(!txt.includes('pinHash') && !txt.includes(sha('chorecast|2580')) && !txt.includes(sha('chorecast|kid|k1|1357')), 'no PIN or passcode hash reaches a device');
  ok(sync.settings.pinSet === true && sync.kids.k1.pin === true && !sync.kids.k2.pin, 'only "is set" flags sync', [sync.settings.pinSet, sync.kids.k1.pin]);
  ok((await K('POST', '/api/auth/elevate', { pinHash: sha('chorecast|2580') })).status === 404, 'the old hash-as-proof route is gone');
  ok((await K('PATCH', '/api/docs/family/settings', { taxRate: 0 })).status === 403, 'kid iPad can’t change settings');
  ok((await K('POST', '/api/pin/check', { pin: '1111' })).code === 'bad_pin', 'wrong PIN refused');
  ok((await K('POST', '/api/pin/check', { pin: sha('chorecast|2580') })).code === 'bad_pin', 'the hash itself is refused');
  ok((await K('POST', '/api/pin/check', { pin: '2580' })).ok === true, 'right PIN (old-style hash) accepted');
  ok((await K('PATCH', '/api/docs/family/settings', { taxRate: 12 })).status === 200, 'unlocked kid iPad can change settings');
  ok((await K('PATCH', '/api/docs/family/settings', { pinHash: 'x', pinSet: false })).status === 200 && (await P('GET', '/api/sync')).settings.pinSet === true, 'devices can’t write pinHash or pinSet');
  await K('POST', '/api/auth/lock', {});
  ok((await K('PATCH', '/api/docs/family/settings', { taxRate: 0 })).status === 403, 'locked again after Lock');
  ok((await K('PUT', '/api/pin', { pin: '9999' })).code === 'locked', 'kid iPad can’t set the grown-up PIN');
  ok((await K('POST', '/api/pin/check', { pin: '2580' })).ok === true, 'right PIN (now scrypt) still accepted');
  await K('POST', '/api/auth/lock', {});

  // Kid passcodes
  ok((await K('POST', '/api/pin/check', { kidId: 'k1', pin: '1357' })).ok === true, 'kid passcode (old-style hash) accepted');
  ok((await K('POST', '/api/pin/check', { kidId: 'k1', pin: '0000' })).code === 'bad_pin', 'wrong kid passcode refused');
  ok((await K('PUT', '/api/pin', { kidId: 'k1', pin: '2468' })).code === 'bad_old', 'changing a passcode needs the old one');
  ok((await K('PUT', '/api/pin', { kidId: 'k1', pin: '2468', old: '0000' })).code === 'bad_old', 'a wrong old passcode is refused');
  ok((await K('PUT', '/api/pin', { kidId: 'k1', pin: '2468', old: '1357' })).ok === true, 'change with the old passcode');
  ok((await K('POST', '/api/pin/check', { kidId: 'k1', pin: '2468' })).ok === true, 'new passcode works');
  ok((await K('PATCH', '/api/docs/kids/k1', { pin: null })).status === 200 && (await P('GET', '/api/sync')).kids.k1.pin === true, 'a doc write can’t remove a passcode');
  ok((await K('POST', '/api/pin/clear', { kidId: 'k1' })).code === 'bad_old', 'turning off needs the passcode');
  ok((await K('POST', '/api/pin/clear', { kidId: 'k1', old: '2468' })).ok === true && !(await P('GET', '/api/sync')).kids.k1.pin, 'turned off with the passcode');
  ok((await K('PUT', '/api/pin', { kidId: 'k2', pin: '1111' })).ok === true, 'a kid can add a first passcode');
  ok((await P('POST', '/api/pin/clear', { kidId: 'k2' })).ok === true, 'a grown-up can turn one off without it');

  // H3: a kid iPad's writes to money
  const k = async () => (await K('GET', '/api/sync')).kids.k1;
  const W = body => K('PATCH', '/api/docs/kids/k1', body);
  let s = await k();
  ok((await W({ jars: { ...s.jars, spend: 999999 } })).status === 403, 'can’t inflate a jar');
  ok((await W({ jars: { ...s.jars, spend: s.jars.spend + 500 }, ledger: led(s, { kind: 'pay', amt: 500, memo: 'Pay' }) })).status === 403, 'can’t add pay');
  ok((await W({ jars: { ...s.jars, spend: s.jars.spend + 500 }, ledger: led(s, { kind: 'interest', amt: 500, memo: 'x' }), interestAt: s.interestAt })).status !== 200, 'can’t add interest without a new day');
  ok((await W({ ledger: [] })).status === 409, 'can’t wipe the statement');
  ok((await W({ ledger: s.ledger.map(e => ({ ...e, amt: e.amt * 10 })) })).status === 409, 'can’t rewrite the statement');
  ok((await W({ name: 'Boss' })).status === 403 && (await W({ earned: 1e6 })).status === 403, 'can’t change name or pay totals');
  ok((await W({ jars: { ...s.jars, spend: -50, save: s.jars.save + 1050 }, ledger: led(s, { kind: 'move', amt: 1050 }) })).status === 403, 'a jar can’t go negative');

  let r = await W({ jars: { ...s.jars, spend: s.jars.spend - 100, save: s.jars.save + 100 }, ledger: led(s, { kind: 'move', amt: 100, memo: 'Spend → Vault' }) });
  ok(r.status === 200, 'move between jars works', r);
  ok((await W({ jars: { ...s.jars, spend: s.jars.spend - 100, save: s.jars.save + 100 }, ledger: led(s, { kind: 'move', amt: 100 }) })).status === 409, 'a write from before that move is stale');

  // Interest
  s = await k();
  const today = utcDay(Date.now()), days = Math.round((Date.parse(today) - Date.parse(s.interestAt)) / DAY), gain = Math.round(s.jars.save * (Math.pow(1.02, days / 7) - 1));
  ok((await W({ interestAt: today, jars: { ...s.jars, save: s.jars.save + gain * 10 }, ledger: led(s, { kind: 'interest', amt: gain * 10 }), interestEarned: gain * 10 })).status === 403, 'too much interest refused', gain);
  ok((await W({ interestAt: utcDay(Date.now() + 5 * DAY), jars: { ...s.jars, save: s.jars.save + gain }, ledger: led(s, { kind: 'interest', amt: gain }) })).status === 403, 'interest dated in the future refused');
  r = await W({ interestAt: today, jars: { ...s.jars, save: s.jars.save + gain }, ledger: led(s, { kind: 'interest', amt: gain, memo: 'Vault interest' }), interestEarned: (s.interestEarned || 0) + gain });
  ok(r.status === 200, 'normal interest works', r);
  s = await k();
  ok((await W({ interestAt: today, jars: { ...s.jars, save: s.jars.save + gain }, ledger: led(s, { kind: 'interest', amt: gain }) })).status !== 200, 'interest twice in a day refused');

  // Market
  s = await k();
  const p = M.priceAt('forest', M.tickAt(Date.now())), units = +(500 / p).toFixed(6);
  ok((await W({ jars: { ...s.jars, invest: s.jars.invest - 500 }, holdings: { forest: { units: units * 10, cost: 500 } }, ledger: led(s, { kind: 'buy', amt: -500 }) })).status === 403, 'buying units for less refused');
  ok((await W({ holdings: { forest: { units: 5, cost: 0 } } })).status === 403, 'units from nowhere refused');
  r = await W({ jars: { ...s.jars, invest: s.jars.invest - 500 }, holdings: { forest: { units, cost: 500 } }, ledger: led(s, { kind: 'buy', amt: -500, memo: 'Bought Whole Forest Fund' }) });
  ok(r.status === 200, 'a real buy works', r);
  s = await k(); const val = Math.floor(s.holdings.forest.units * p);
  ok((await W({ jars: { ...s.jars, invest: s.jars.invest + val * 3 }, holdings: { forest: { units: 0, cost: 0 } }, ledger: led(s, { kind: 'sell', amt: val * 3 }) })).status === 403, 'selling for more than it’s worth refused');
  ok((await W({ jars: { ...s.jars, invest: s.jars.invest + val }, holdings: { forest: { units: 0, cost: 0 } }, ledger: led(s, { kind: 'sell', amt: val }), }).then(x => x)).status === 200, 'a real sell works');
  s = await k();
  ok((await W({ jars: { ...s.jars, invest: s.jars.invest + 50 }, ledger: [{ id: 'old', at: Date.now() - 3 * DAY, kind: 'sell', amt: 50 }, ...s.ledger] })).status !== 200, 'a sell dated days ago refused');

  // Island shop
  s = await k(); const isl = s.island;
  ok((await W({ island: { ...isl, items: isl.items.map(i => (i.id === 'i1' ? { ...i, cash: 40000 } : i)) } })).status === 403, 'can’t change what an item cost');
  ok((await W({ island: { ...isl, items: [...isl.items, { id: 'i9', t: 'kiwi', x: 0, z: 0, r: 0, cash: 900 }] } })).status === 403, 'a cash item has to be paid for');
  ok((await W({ island: { ...isl, xpSpent: 0 } })).status === 403, 'XP spent can’t just drop');
  r = await W({ jars: { ...s.jars, spend: s.jars.spend - 300 }, ledger: led(s, { kind: 'spend', amt: -300, memo: 'Island shop: Kiwi' }), island: { ...isl, items: [...isl.items, { id: 'i2', t: 'kiwi', x: 0.5, z: 0.5, r: 0, cash: 300 }] } });
  ok(r.status === 200, 'buying an island item works', r);
  s = await k();
  r = await W({ island: { ...s.island, items: s.island.items.map(i => (i.id === 'i2' ? { ...i, x: 0.6, r: 0.79 } : i)) } });
  ok(r.status === 200, 'moving and turning an item works', r);
  s = await k();
  ok((await W({ jars: { ...s.jars, spend: s.jars.spend + 1000 }, ledger: led(s, { kind: 'sell', amt: 1000 }), island: { ...s.island, items: s.island.items.filter(i => i.id !== 'i2') } })).status === 403, 'selling an item for more than half refused');
  r = await W({ jars: { ...s.jars, spend: s.jars.spend + 150 }, ledger: led(s, { kind: 'sell', amt: 150, memo: 'Sold island kiwi' }), island: { ...s.island, items: s.island.items.filter(i => i.id !== 'i2') } });
  ok(r.status === 200, 'selling an item back for half works', r);
  s = await k();
  r = await W({ island: { ...s.island, xpSpent: s.island.xpSpent - 60, items: s.island.items.filter(i => i.id !== 'i0') }, ledger: led(s, { kind: 'xp', amt: 0, xp: 60 }) });
  ok(r.status === 200, 'selling an XP item back works', r);
  s = await k();
  r = await W({ island: { ...s.island, xpSpent: s.island.xpSpent + 120, items: [...s.island.items, { id: 'i3', t: 'ball', x: 0, z: 0.4, r: 0, xp: 120 }] }, ledger: led(s, { kind: 'xp', amt: 0, xp: -120 }) });
  ok(r.status === 200, 'buying with XP works', r);
  ok((await W({ split: { spend: 40, save: 40, invest: 10, give: 10 }, goal: { name: 'Bike', icon: '🚲', target: 20000 }, seenPayAt: Date.now() })).status === 200, 'budget, goal and other kid things still save');

  // Grown-ups aren't checked; an unlocked kid iPad isn't either
  s = await k();
  ok((await P('PATCH', '/api/docs/kids/k1', { jars: { ...s.jars, spend: s.jars.spend + 700 }, ledger: led(s, { kind: 'bonus', amt: 700, memo: 'Bonus' }) })).status === 200, 'a grown-up can pay a bonus');
  await K('POST', '/api/pin/check', { pin: '2580' }); s = await k();
  ok((await W({ jars: { ...s.jars, spend: s.jars.spend + 100 }, ledger: led(s, { kind: 'pay', amt: 100, memo: 'Dishes' }), earned: (s.earned || 0) + 100 })).status === 200, 'an unlocked kid iPad can pay');
  await K('POST', '/api/auth/lock', {});

  // Too many wrong PINs from one iPad
  await pair(K2); let last;
  for (let i = 0; i < 9; i++) last = await K2('POST', '/api/pin/check', { pin: '0000' });
  ok(last.code === 'slow_down', 'wrong PINs slow down', last);
  ok((await K2('POST', '/api/pin/check', { pin: '2580' })).code === 'slow_down', 'even the right PIN waits after that');
} finally {
  srv.kill(); await new Promise(r => setTimeout(r, 400));
}
{
  const db = new PGlite(dir); await db.waitReady;
  const rows = (await db.query('select kid_id, hash from family_pins order by kid_id')).rows;
  ok(rows.length && rows.every(x => x.hash.startsWith('scrypt$')), 'stored codes are scrypt now', rows.map(x => x.kid_id + ':' + x.hash.slice(0, 7)));
  await db.close();
}
console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /Error|error/.test(l)).slice(0, 10).join('\n'));
process.exit(failN ? 1 : 0);
