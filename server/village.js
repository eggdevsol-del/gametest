/* The village, live: brothers and sisters in the same family see each other on Hoshi Street (homes prototype).
   Each device holds one event stream (GET /api/village/join) and sends small messages (POST /api/village/send):
   where it is and what it's doing a few times a second, an emoji or one of the set phrases (by number: nothing is
   typed), trades, and buying from a sibling's market stall. A room is only ever one family: the signed-in family,
   or (for the prototype, before sign-in reaches it) a family code a grown-up sets on each device. Nothing here is
   kept but the trade log; who's in the village lives in memory and goes when they leave. */
import { randomBytes } from 'node:crypto';

const EMOJI = 8, PHRASES = 8, ACTIONS = 3; // (the lists themselves are in the page: home/village-net.js)
const rooms = new Map(); // room -> Map(id -> client)
const byKey = new Map(); // secret key -> client
const AVATARS = ['🐰', '🐱', '🐶', '🐼', '🐨', '🦉', '🐵', '🐯', '🐧', '🦁', '🐸', '🦊'];
const clean = (s, n) => [...String(s || '')].filter(ch => ch.charCodeAt(0) >= 32 && !'<>&"\'`'.includes(ch)).join('').trim().slice(0, n);
const num = (v, a, b, d = 0) => (Number.isFinite(+v) ? Math.max(a, Math.min(b, +v)) : d);

function write(c, ev, data) { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch (e) { /* (gone) */ } }
function toRoom(room, ev, data, except) { const R = rooms.get(room); if (R) for (const c of R.values()) if (c !== except) write(c, ev, data); }
const pub = c => ({ id: c.id, name: c.name, avatar: c.avatar, hue: c.hue, s: c.s });

// a thing from Mine as a trade or stall sends it: what it is, its finish, used or not, the price
function item(x) {
  if (!x || typeof x !== 'object') return null;
  const t = clean(x.t, 40); if (!/^[\w.-]+$/.test(t)) return null;
  let fin = null; try { if (x.fin && typeof x.fin === 'object') { const j = JSON.stringify(x.fin); if (j.length <= 300) fin = JSON.parse(j); } } catch (e) { fin = null; }
  return { t, fin, used: !!x.used, cond: x.cond == null ? null : num(x.cond, 0, 1, null), price: Math.round(num(x.price, 0, 100000)) };
}
const items = (L, max) => (Array.isArray(L) ? L.slice(0, max).map(item).filter(Boolean) : []);
function state(s) {
  if (!s || typeof s !== 'object') return null;
  const out = { pl: clean(s.pl, 20), x: num(s.x, -50, 200), z: num(s.z, -50, 200), y: num(s.y, -5, 10), yaw: num(s.yaw, -100, 100), st: clean(s.st, 16), pose: clean(s.pose, 16) || null };
  if (s.stall && typeof s.stall === 'object') out.stall = { pitch: Math.round(num(s.stall.pitch, 0, 40)), items: items(s.stall.items, 4) };
  return out;
}

export function villageRoutes({ route, fail, db }) {
  // Joining: the stream stays open; the first thing on it is who you are (and your key for sending) and who's here.
  route('GET', '/api/village/join', async ({ req, res, s, url }) => {
    const q = url.searchParams, code = clean(q.get('code'), 24).toLowerCase();
    let room = null, familyId = null;
    if (s) { room = 'f:' + s.family_id; familyId = s.family_id; }
    else if (/^[a-z0-9-]{6,24}$/.test(code)) room = 'c:' + code;
    else { fail(403, 'Ask a grown-up to set a family code.', 'no_family'); }
    const c = { id: randomBytes(6).toString('hex'), key: randomBytes(18).toString('hex'), room, familyId, res,
      name: clean(q.get('name'), 16) || 'Me', avatar: AVATARS.includes(q.get('avatar')) ? q.get('avatar') : '🦊',
      hue: /^#[0-9a-f]{6}$/i.test(q.get('hue') || '') ? q.get('hue') : '#7cc8e8', s: null, n: 0, win: 0 };
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 3000\n\n');
    if (!rooms.has(room)) rooms.set(room, new Map());
    const R = rooms.get(room);
    if (R.size >= 12) { write(c, 'full', {}); return res.end(); } // (a big family, and a few devices each)
    write(c, 'hi', { id: c.id, key: c.key, peers: [...R.values()].map(pub) });
    R.set(c.id, c); byKey.set(c.key, c); toRoom(room, 'join', pub(c), c);
    req.on('close', () => {
      byKey.delete(c.key); R.delete(c.id); if (!R.size) rooms.delete(room);
      for (const tr of trades.values()) if (tr.a === c || tr.b === c) endTrade(tr, 'off');
      toRoom(room, 'leave', { id: c.id });
    });
    return undefined;
  });

  /* ---------- trades: two siblings, each puts things from Mine and/or XP in; both agree; each device does its side */
  const trades = new Map();
  const trOf = c => { for (const tr of trades.values()) if (tr.a === c || tr.b === c) return tr; return null; };
  const view = tr => ({ id: tr.id, st: tr.st, a: tr.a.id, b: tr.b.id, give: { [tr.a.id]: tr.give.a, [tr.b.id]: tr.give.b }, ok: { [tr.a.id]: tr.ok.a, [tr.b.id]: tr.ok.b } });
  const tell = tr => { write(tr.a, 'tr', view(tr)); write(tr.b, 'tr', view(tr)); };
  function endTrade(tr, st) { tr.st = st; tell(tr); trades.delete(tr.id); }

  async function handle(c, m) {
    const R = rooms.get(c.room), peer = id => (R && typeof id === 'string' ? R.get(id) : null);
    if (m.t === 'p') { c.s = state(m.s); return toRoom(c.room, 'p', { id: c.id, s: c.s }, c); }
    if (m.t === 'e') { const k = m.k, i = Math.round(num(m.i, -1, 99, -1)), max = k === 'emo' ? EMOJI : k === 'say' ? PHRASES : k === 'act' ? ACTIONS : 0; if (i < 0 || i >= max) return; return toRoom(c.room, 'e', { id: c.id, k, i, to: peer(m.to) ? m.to : null }, c); }
    if (m.t === 'ask') { const o = peer(m.to); if (!o || o === c) return; if (trOf(c) || trOf(o)) return write(c, 'busy', { id: o.id }); const tr = { id: randomBytes(6).toString('hex'), a: c, b: o, st: 'ask', give: { a: { items: [], xp: 0 }, b: { items: [], xp: 0 } }, ok: { a: false, b: false } }; trades.set(tr.id, tr); return tell(tr); }
    const tr = m.id && trades.get(m.id), side = tr && (tr.a === c ? 'a' : tr.b === c ? 'b' : null);
    if (/^(yes|no|give|ok)$/.test(m.t)) {
      if (!tr || !side) return;
      if (m.t === 'no') return endTrade(tr, 'off');
      if (m.t === 'yes') { if (tr.st === 'ask' && side === 'b') { tr.st = 'open'; tell(tr); } return; }
      if (tr.st !== 'open') return;
      if (m.t === 'give') { tr.give[side] = { items: items(m.items, 6), xp: Math.round(num(m.xp, 0, 1000000)) }; tr.ok.a = tr.ok.b = false; return tell(tr); } // (a change un-agrees it)
      if (m.t === 'ok') {
        tr.ok[side] = true; if (!(tr.ok.a && tr.ok.b)) return tell(tr);
        await db.query(`insert into village_trades (family_id, room, kind, a_name, b_name, a_gave, b_gave) values ($1, $2, 'trade', $3, $4, $5::jsonb, $6::jsonb)`,
          [c.familyId, c.familyId ? null : c.room.slice(2), tr.a.name, tr.b.name, JSON.stringify(tr.give.a), JSON.stringify(tr.give.b)]).catch(e => console.warn('village trade log failed', e.message));
        return endTrade(tr, 'done');
      }
    }
    // buying from a sibling's stall: asked of the seller's device, which says sold (and what) or gone
    if (m.t === 'buy') { const o = peer(m.to); if (!o || o === c) return; return write(o, 'buy', { from: c.id, i: Math.round(num(m.i, 0, 3)), t: clean(m.it, 40), rid: clean(m.rid, 16) }); }
    if (m.t === 'sold') {
      const o = peer(m.to); if (!o) return; const it = item(m.rec);
      if (it) await db.query(`insert into village_trades (family_id, room, kind, a_name, b_name, a_gave, b_gave) values ($1, $2, 'stall', $3, $4, $5::jsonb, $6::jsonb)`,
        [c.familyId, c.familyId ? null : c.room.slice(2), c.name, o.name, JSON.stringify({ items: [it], xp: 0 }), JSON.stringify({ items: [], xp: it.price })]).catch(e => console.warn('village sale log failed', e.message));
      return write(o, 'sold', { from: c.id, rid: clean(m.rid, 16), rec: it });
    }
  }

  // Sending: by key, not the session (it comes several times a second), a few messages at once, never too many.
  return async function send(req, res) {
    const chunks = []; let size = 0;
    for await (const ch of req) { size += ch.length; if (size > 16 * 1024) { res.writeHead(413); return res.end(); } chunks.push(ch); }
    let b = null; try { b = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { b = null; }
    const c = b && typeof b.key === 'string' && byKey.get(b.key);
    if (!c) { res.writeHead(410, { 'content-type': 'application/json' }); return res.end('{"error":"Not in the village."}'); }
    const now = Date.now(); if (now - c.win > 1000) { c.win = now; c.n = 0; }
    for (const m of (Array.isArray(b.m) ? b.m : []).slice(0, 12)) { if (++c.n > 40) break; if (m && typeof m === 'object') await handle(c, m); }
    res.writeHead(204); res.end();
  };
}
// (keeps the streams open through proxies)
setInterval(() => { for (const R of rooms.values()) for (const c of R.values()) { try { c.res.write(': keep-alive\n\n'); } catch (e) { /* (gone) */ } } }, 25000).unref();
