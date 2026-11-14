// The family shop on the server: grown-ups buy XP for one kid and lesson packs for the family; kids can't buy or
// change bought XP; wishes are logged and granted; a server without STORE_TEST only takes App Store purchases.
// node tests/family-shop.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };
async function server(port, env) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cc-store-'));
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
async function family(port) {
  const P = client(port), K = client(port);
  await P('POST', '/api/auth/signup', { email: `shop${port}@test.localhost`, password: 'correct-horse-9', name: 'P', consent: true });
  await P('PUT', '/api/docs/kids/k1', { name: 'Ari', age: 9, jars: { spend: 0, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0 } });
  await P('PUT', '/api/docs/kids/k2', { name: 'Bo', age: 7, jars: { spend: 0, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0 } });
  const { code } = await P('POST', '/api/devices/code', {}); await K('POST', '/api/devices/pair', { code, name: 'iPad' });
  return { P, K };
}
const A = await server(8794, { STORE_TEST: 'on' }), B = await server(8793, {});
try {
  const { P, K } = await family(8794), kid = async id => (await K('GET', '/api/sync')).kids[id];
  // A kid wishes for something they can't afford yet
  ok((await K('PATCH', '/api/docs/kids/k1', { wishes: [{ t: 'kiwi', name: 'Kiwi', xp: 400, at: Date.now() }, { t: 'kangaroo', name: 'Kangaroo and joey', xp: 700, at: Date.now(), plus: true }] })).status === 200, 'a kid can keep a wish list');
  ok((await K('POST', '/api/events', { events: [{ type: 'shop.wish', kidId: 'k1', payload: { item: 'kiwi', need: 300 } }] })).saved === 1, 'wishes are logged');
  const shop = await P('GET', '/api/shop'); ok(shop.test === true && Array.isArray(shop.bought), 'the shop says it’s in test mode', shop);
  // XP bundles are for one kid
  const b1 = await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.1200', kidId: 'k1', wish: 'kiwi' }); ok(b1.ok, 'a grown-up buys 1,200 XP for Ari’s wish', b1);
  let a = await kid('k1'), b = await kid('k2');
  ok(a.island.paidXp === 1200 && !(b.island || {}).paidXp, 'the XP is Ari’s only', [a.island, b.island]);
  ok(a.ledger[0].kind === 'xp' && a.ledger[0].xp === 1200 && /grown-up/.test(a.ledger[0].memo), 'it’s on Ari’s statement', a.ledger[0]);
  ok(a.wishes.length === 1 && a.wishes[0].t === 'kangaroo', 'the wish it was for comes off the list, the others stay', a.wishes);
  // Kids can't buy, or give themselves bought XP
  ok((await K('POST', '/api/shop/buy', { productId: 'chorecast.xp.7500', kidId: 'k1' })).status === 403, 'a kid’s iPad can’t buy');
  await K('PATCH', '/api/docs/kids/k1', { island: { ...a.island, paidXp: 999999 } }); a = await kid('k1');
  ok(a.island.paidXp === 1200, 'a kid’s iPad can’t change bought XP', a.island.paidXp);
  await P('PATCH', '/api/docs/kids/k1', { island: { ...a.island, paidXp: 5 } }); a = await kid('k1');
  ok(a.island.paidXp === 1200, 'only a purchase changes bought XP', a.island.paidXp);
  // The Island Club: a month's XP and membership
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.club.monthly', kidId: 'k2' })).ok, 'join the Island Club for Bo');
  b = await kid('k2'); ok(b.island.paidXp === 1000 && b.island.club && b.island.club.until > Date.now(), 'Bo gets this month’s XP and membership', b.island);
  const prize = (await P('GET', '/api/shop')).clubPrize;
  ok(typeof prize === 'string' && b.island.club.prize === prize && b.island.won[prize] === 1, 'Bo wins this month’s members’ prize', [prize, b.island.club, b.island.won]);
  ok(b.island.owned['sign:gold'] === 'won', 'and the golden name sign', b.island.owned);
  ok(b.ledger[0].gift === 'club' && a.ledger[0].gift === 'xp', 'gifts are marked so the kid gets a celebration', [b.ledger[0], a.ledger[0]]);
  ok((await K('PATCH', '/api/docs/kids/k2', { island: { ...b.island, club: { since: 0, until: 9e15, prize } } })).status !== 500, 'a kid write with a made-up membership doesn’t crash');
  b = await kid('k2'); ok(b.island.club.until < 9e15, 'a kid’s iPad can’t extend the Club', b.island.club);
  // A weekly limit per kid, set by a grown-up
  await P('PATCH', '/api/docs/family/settings', { buyCap: 2000 });
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.1200', kidId: 'k1' })).code === 'over_cap', 'the weekly limit stops a second 1,200 for Ari');
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.500', kidId: 'k1' })).ok, 'a smaller bundle still fits');
  ok((await P('GET', '/api/shop')).week.k1 === 1700, 'the shop knows what each kid had this week');
  await P('PATCH', '/api/docs/family/settings', { buyCap: 0 });
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.pack.money' })).packs.includes('money'), 'the live Money Sense pack');
  // Lesson packs are the family's
  const pk = await P('POST', '/api/shop/buy', { productId: 'chorecast.pack.maths' }); ok(pk.ok && pk.packs.includes('maths'), 'a lesson pack opens for the family', pk.packs);
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.packs.all' })).code === 'unknown_product', 'there’s no every-pack bundle');
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.500' })).code === 'no_kid', 'XP needs a kid');
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.plus.yearly' })).code === 'unknown_product', 'plans aren’t bought here');
  ok((await P('POST', '/api/shop/buy', { productId: 'free.xp' })).code === 'unknown_product', 'made-up products are refused');
  ok((await P('GET', '/api/shop')).bought.length === 5, 'the shop lists everything bought');
  // 5,000 XP a week per kid unless a grown-up changes it: Bo has had 1,000 from the Club
  await P('PATCH', '/api/docs/family/settings', { buyCap: null });
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.7500', kidId: 'k2' })).code === 'over_cap', 'the standard weekly limit is 5,000 XP');
  ok((await P('POST', '/api/shop/buy', { productId: 'chorecast.xp.3000', kidId: 'k2' })).ok, 'within the standard limit is fine');
  // A server without STORE_TEST only takes App Store purchases
  const L = await family(8793);
  ok((await L.P('POST', '/api/shop/buy', { productId: 'chorecast.xp.500', kidId: 'k1' })).code === 'app_only', 'live: buying needs the app');
  ok((await L.P('POST', '/api/shop/buy', { transaction: 'not-a-jws' })).code === 'bad_receipt', 'live: a bad App Store receipt is refused');
} finally { A.srv.kill(); B.srv.kill(); await new Promise(r => setTimeout(r, 400)); }
console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(A.log().split('\n').filter(l => /Error|error/i.test(l)).slice(0, 10).join('\n'));
process.exit(failN ? 1 : 0);
