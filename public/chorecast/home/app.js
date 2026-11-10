/* Chorecast homes (a prototype), part 6 of 6: the home screen.
   Opens full screen over the app (or on its own in home.html). The kid's home floats in the sky in an isometric view;
   drag to look around, pinch, scroll or tap + and − to zoom in and right out, and turn the view a quarter at a time.
   Decorate opens the tray: tap a thing to buy it with XP (or take it from Mine), drag it where you like, turn it, put
   it back, and tap a placed thing to move it again. Small things stand on tables and shelves, pictures hang on the far
   walls, rugs go under furniture and garden things go outside. Homes opens the list of homes, small to big: bigger
   ones unlock as kids earn more XP, then cost XP to buy.
   Saved on this device only for now (localStorage, one record per kid), and it never spends the kid's real XP. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.look || !IH.homes || !IH.items) return;
  const WARM = new T.Color('#ff9548'), warm = c => new T.Color(c || '#ffc77a').lerp(WARM, 0.8);
  const LK = IH.look, { HOMES, build: buildHome, FY, H, HI, wallPoint, wallYaw, key } = IH.homes, { BY, DEFS, CATS, make, SWATCHES, FINISHES } = IH.items;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const nf = n => Math.round(n).toLocaleString('en-NZ');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const HB = Object.fromEntries(HOMES.map(h => [h.id, h]));

  const ICON = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    left: '<path d="M4 12a8 8 0 1 0 2.3-5.6"/><path d="M4 4v4h4"/>', right: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>',
    home: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4z"/><path d="M4 8l8 4 8-4M12 12v8"/>', turn: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    brush: '<path d="M14 4l6 6-8 8H6v-6z"/><path d="M11 7l6 6"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

  // ---------- saved state
  // What the studio comes with: a bed, a desk and a few cosy things, so the first look isn't an empty room.
  const STARTER = [
    ['bed', 0, 0, 0], ['nightstand', 2, 0, 0], ['desklamp', 2, 0, 0], ['rug_round', 3, 2, 0], ['desk', 5, 0, 0], ['deskchair', 6, 2, 2],
    ['monstera', 4, 0, 0], ['bookcase', 0, 5, 1], ['floorlamp', 7, 3, 0], ['teddy', 1, 4, 0], ['cat', 4, 4, 0],
    ['painting', 'n', 5.5], ['clock', 'w', 5.5]
  ];
  function fresh() {
    const owned = {}; for (const [t] of STARTER) owned[t] = (owned[t] || 0) + 1;
    // (the starter things are set out the first time the studio opens, by arrange(): each where it fits, facing into
    // the room, with room in front to use it)
    return { v: 1, spent: 0, demo: 0, cur: 'studio', own: { studio: 1 }, owned, homes: { studio: { items: [], starter: 1 } }, look: { frames: 'ones', fr24: 1, phase: 'day', ink: 1, plain: 0 } };
  }
  const store = {
    key: id => `cc:home:${id}`,
    load(id) { try { const s = JSON.parse(localStorage.getItem(this.key(id)) || 'null'); if (s && s.v === 1) return s; } catch (e) { /* private browsing */ } return fresh(); },
    save(id, s) { try { localStorage.setItem(this.key(id), JSON.stringify(s)); } catch (e) { /* this visit only */ } }
  };

  // ---------- one open home at a time
  let O = null; // { opts, st, kid, root, ... }
  let R = null, pipe = null, thumbPipe = null;
  const THUMBS = {}, HOME_THUMBS = {};

  function renderer() {
    if (R) return R;
    R = new T.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    R.shadowMap.enabled = true; R.shadowMap.type = T.PCFShadowMap; R.shadowMap.autoUpdate = false;
    R.outputEncoding = T.LinearEncoding; R.toneMapping = T.NoToneMapping; R.autoClear = false;
    R.domElement.className = 'ih-cv';
    pipe = new LK.Pipeline(R);
    return R;
  }

  // ---------- wallet
  function wallet() {
    const x = (O.opts.xp && O.opts.xp()) || { earned: 6000, left: 4500 };
    const st = O.st; return { earned: x.earned + (st.demo || 0), left: Math.max(0, x.left + (st.demo || 0) + (st.jobPay || 0) - (st.spent || 0)) };
  }
  // ---------- money: the wallet (chores, lessons, jobs, selling your things) and the farm account (what the farm sells,
  // what it buys), both in XP. Every move goes on the ledger with its slip, the Chorecast pay slip (slip.js).
  const dayNo = () => Math.floor(Date.now() / 864e5);
  const farmAcct = () => (O.st.farmAcct = O.st.farmAcct || { bal: 0, invested: 0, wageDay: -1 });
  const slipOf = (head, kind, lines, sum, note) => ({ head, kind, who: O.kid.name, lines, sum, note });
  function led(acct, amt, memo, slip) {
    const L = (O.st.ledger = O.st.ledger || []); L.unshift({ id: Math.random().toString(36).slice(2, 9), at: Date.now(), acct, amt: Math.round(amt), memo, slip: slip || null }); if (L.length > 200) L.length = 200;
  }
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // out of the wallet (a purchase) and into it (a sale, a job's pay)
  function wSpend(xp, memo, head, lines) { O.st.spent = (O.st.spent || 0) + xp; led('wallet', -xp, memo, slipOf(head || 'CHORECAST', 'Receipt', lines || [[cap(memo), xp]], [['Total paid', xp, 'big'], ['Wallet after', wallet().left, 'muted']])); }
  function wGain(xp, memo, head, lines) { O.st.spent = (O.st.spent || 0) - xp; led('wallet', xp, memo, slipOf(head || 'CHORECAST', 'Receipt', lines || [[cap(memo), xp]], [['Total received', xp, 'big'], ['Wallet after', wallet().left, 'muted']])); }
  // into the farm account: what the farm (and the sea) sells
  function farmIn(xp, memo, lines) { const a = farmAcct(); a.bal += xp; led('farm', xp, memo, slipOf('CHORECAST FARM', 'Sale receipt', lines || [[cap(memo), xp]], [['Into the farm account', xp, 'big'], ['Farm account after', a.bal, 'muted']])); if (O.E) O.E.sale(xp); }
  // from the wallet into the farm (not taxed; the farm owes it back to you)
  function invest(xp, auto) {
    const a = farmAcct(); xp = Math.floor(xp); if (xp <= 0 || wallet().left < xp) return null;
    O.st.spent = (O.st.spent || 0) + xp; a.bal += xp; a.invested = (a.invested || 0) + xp;
    const s = slipOf('CHORECAST FARM', 'Investment', [[auto ? 'Topped up for a farm purchase' : 'Put into your farm', xp]], [['Out of your wallet', -xp, 'muted'], ['Into the farm account', xp, 'big'], ['Farm account after', a.bal, 'muted']], 'Money you put into your farm. The farm owes it back to you.');
    led('wallet', -xp, 'Invested in your farm', s); led('farm', xp, 'Invested from your wallet', s); return s;
  }
  // a farm purchase: out of the farm account; if that's short, the rest comes in from the wallet first
  function farmPay(xp, what) {
    if (O.E && !O.E.canBuy(what)) return false;
    const a = farmAcct(), short = Math.max(0, xp - a.bal), w = wallet().left;
    if (short && w < short) { toast(`You need ✨ ${nf(xp)} XP for ${what || 'that'}. Your farm account has ✨ ${nf(a.bal)} and your wallet ✨ ${nf(w)}.`); return false; }
    if (short) invest(short, true);
    a.bal -= xp; led('farm', -xp, `Bought ${what || 'farm things'}`, slipOf('CHORECAST FARM', 'Receipt', [[cap(what || 'farm things'), xp]], [['Paid from the farm account', xp, 'big'], ['Farm account after', a.bal, 'muted']]));
    if (O.E) O.E.cost(xp, what); save(); sound('buy'); ui(true); if (short) toast(`The farm account was short, so ✨ ${nf(short)} came in from your wallet.`); return true;
  }
  // pay yourself: once a day, a wage from the farm into the wallet, on a pay slip like chore pay
  function payYourself(xp) {
    const a = farmAcct(); xp = Math.floor(xp); if (a.wageDay === dayNo()) { toast('You’ve paid yourself today. Again tomorrow.'); return null; } if (xp <= 0 || xp > a.bal) return null;
    a.bal -= xp; a.wageDay = dayNo(); O.st.spent = (O.st.spent || 0) - xp;
    const s = slipOf('CHORECAST FARM PAYROLL', 'Pay slip', [['Daily wage from your farm', xp]], [['Gross pay', xp], ['Net pay', xp, 'big'], ['Farm account after', a.bal, 'muted']], 'Your wage, from the farm’s money into your own. Once a day.');
    led('farm', -xp, 'Paid yourself a wage', s); led('wallet', xp, 'Wage from your farm', s); save(); sound('buy'); ui(true); return s;
  }
  const placedCount = t => { let n = 0; for (const h of Object.values(O.st.homes)) for (const it of h.items) if (it.t === t) n++; return n; };
  const spare = t => (O.st.owned[t] || 0) - placedCount(t);
  // the spare things in Mine, one entry each: { fin, used, cond } (older saves have none: plain and new)
  const boxOf = t => { const b = (O.st.box = O.st.box || {}); b[t] = b[t] || []; while (b[t].length > Math.max(0, spare(t))) b[t].pop(); while (b[t].length < Math.max(0, spare(t))) b[t].push({}); return b[t]; };
  const toBox = rec => { const b = (O.st.box = O.st.box || {}); (b[rec.t] = b[rec.t] || []).unshift({ fin: rec.fin, used: rec.used, cond: rec.cond }); };
  const items = () => (O.st.homes[O.st.cur] = O.st.homes[O.st.cur] || { items: [] }).items;
  const save = () => { O.st.name = HB[O.st.cur].name; store.save(O.kid.id, O.st); };

  // ---------- footprints and fitting
  const fp = (def, r) => { const [w, d] = def.fp; return r % 2 ? [d, w] : [w, d]; };
  function cellsOf(def, x, z, r) { const [w, d] = fp(def, r), out = []; for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) out.push([x + i, z + j]); return out; }
  // Who is standing where, without one item (the one being moved).
  function occ(except) {
    const floor = new Map(), rug = new Map(), top = new Map(), surf = new Map(), home = O.home;
    const list = items().filter(it => it.id !== except);
    for (const it of list) {
      const d = BY[it.t]; if (!d || d.kind === 'wall' || d.kind === 'pet' || d.kind === 'small') continue;
      for (const [x, z] of cellsOf(d, it.x, it.z, it.r)) {
        const k = key(x, z), c = home.cells.get(k); if (!c) continue;
        if (d.kind === 'rug') rug.set(k, it.id); else { floor.set(k, it.id); if (d.surf) surf.set(k, { y: c.y + d.surf, id: it.id }); }
      }
    }
    for (const it of list) {
      const d = BY[it.t]; if (!d || d.kind !== 'small') continue; const k = key(it.x, it.z);
      if (surf.has(k)) top.set(k, it.id); else floor.set(k, it.id);
    }
    return { floor, rug, top, surf };
  }
  function crossesWall(cells) {
    const S = new Set(cells.map(([x, z]) => key(x, z)));
    for (const [x, z] of cells) { if (S.has(key(x + 1, z)) && O.home.edges.has('v' + key(x + 1, z))) return true; if (S.has(key(x, z + 1)) && O.home.edges.has('h' + key(x, z + 1))) return true; }
    return false;
  }
  function fits(def, rec, except) {
    if (def.kind === 'wall') return fitsWall(def, rec, except);
    const cells = cellsOf(def, rec.x, rec.z, rec.r || 0), o = occ(except), home = O.home;
    let zone = null;
    for (const [x, z] of cells) {
      const c = home.cells.get(key(x, z)); if (!c || c.fixed) return { ok: false, why: 'edge' };
      if (zone && c.zone !== zone) return { ok: false, why: 'wall' }; zone = c.zone;
    }
    if (def.where === 'in' && zone !== 'in') return { ok: false, why: 'in' };
    if (def.where === 'out' && zone !== 'out') return { ok: false, why: 'out' };
    if (crossesWall(cells)) return { ok: false, why: 'wall' };
    if (def.kind === 'pet') { const k = key(rec.x, rec.z); return o.floor.has(k) ? { ok: false, why: 'full' } : { ok: true }; }
    if (def.kind === 'rug') { for (const [x, z] of cells) if (o.rug.has(key(x, z))) return { ok: false, why: 'full' }; return { ok: true }; }
    if (def.kind === 'small') {
      const k = key(rec.x, rec.z); if (o.surf.has(k)) return o.top.has(k) ? { ok: false, why: 'full' } : { ok: true, on: o.surf.get(k) };
      return o.floor.has(k) ? { ok: false, why: 'full' } : { ok: true };
    }
    for (const [x, z] of cells) { const k = key(x, z); if (o.floor.has(k)) return { ok: false, why: 'full' }; }
    // something small on top would be left floating: it can't go under or over a top
    for (const it of items()) { if (it.id === except) continue; const d = BY[it.t]; if (d && d.kind === 'small' && cells.some(([x, z]) => x === it.x && z === it.z) && !def.surf) return { ok: false, why: 'full' }; }
    return { ok: true };
  }
  // Walls: the outside walls (n s e w) and both faces of each inside wall (i3+, i3-). Things hang a bit lower on the
  // inside walls (they're not as tall). Windows only go in outside walls; curtains and blinds go over a window.
  const winOf = rec => rec && rec.on ? items().find(it => it.id === rec.on) : null;
  const sideOf = rec => { const d = BY[rec.t]; return d && d.cover ? (winOf(rec) || {}).side : rec.side; };
  const wyOf = (def, sd) => { const S = O.home.sides[sd]; return S && !S.outer ? clamp(Math.min(def.wy, HI - def.h - 0.15), 0.3, def.wy) : def.wy; };
  function fitsWall(def, rec, except) {
    if (def.cover) {
      const w = winOf(rec); if (!w) return { ok: false, why: 'nowin' };
      if (items().some(it => it.id !== except && it.id !== rec.id && BY[it.t] && BY[it.t].cover && it.on === rec.on)) return { ok: false, why: 'covered' };
      return { ok: true };
    }
    const S = O.home.sides[rec.side]; if (!S || S.front) return { ok: false, why: 'cut' };
    if (def.opening && !S.outer) return { ok: false, why: 'outside' };
    const w = def.fp[0], u0 = rec.u, u1 = rec.u + w, y0 = FY + wyOf(def, rec.side), y1 = y0 + def.h, gap = def.opening ? 0.3 : 0.05;
    if (u0 < 0.15 || u1 > S.len - 0.15) return { ok: false, why: 'edge' };
    if (y1 > S.geo.top - 0.05) return { ok: false, why: 'tall' };
    for (const o of S.open) { if (o.rid && (o.rid === except || o.rid === rec.id) || (o.rid && !items().some(it => it.id === o.rid))) continue; if (o.u1 > u0 - gap && o.u0 < u1 + gap && o.y1 > y0 - (def.opening ? 0.3 : 0) && o.y0 < y1) return { ok: false, why: def.opening && o.kind === 'door' ? 'door' : 'window' }; }
    for (const j of S.junc) if (j > u0 - (def.opening ? 0.2 : -0.05) && j < u1 + (def.opening ? 0.2 : -0.05) && y0 < FY + HI + 0.1) return { ok: false, why: 'wall' };
    for (const it of items()) {
      if (it.id === except || it.id === rec.id || it.side !== rec.side) continue; const d = BY[it.t]; if (!d || d.kind !== 'wall' || d.cover) continue;
      const a = it.u, b = it.u + d.fp[0], ya = FY + wyOf(d, it.side), yb = ya + d.h;
      if (b > u0 + 0.02 && a < u1 - 0.02 && yb > y0 && ya < y1) return { ok: false, why: d.opening ? 'window' : 'full' };
    }
    return { ok: true };
  }
  // A curtain or blind is drawn for its window: copy the window's size onto it (and rebuild it when that changes).
  function fitCover(rec) {
    const w = winOf(rec), wd = w && BY[w.t]; if (!wd) return false;
    const ch = rec.w !== wd.fp[0] || rec.h !== wd.h || rec.wy !== wd.wy; rec.w = wd.fp[0]; rec.h = wd.h; rec.wy = wd.wy; return ch;
  }
  // Where an item stands in the world.
  function placeOf(def, rec, except) {
    if (def.kind === 'wall' && def.cover) { const w = winOf(rec), wd = w && BY[w.t]; if (!wd || !O.home.sides[w.side]) return { x: 0, y: -60, z: 0, ry: 0 }; const [x, z] = wallPoint(O.home, w.side, w.u + wd.fp[0] / 2, 0.06); return { x, y: FY + wd.wy, z, ry: wallYaw(O.home, w.side) }; }
    if (def.kind === 'wall') { if (!O.home.sides[rec.side]) return { x: 0, y: -60, z: 0, ry: 0 }; const [x, z] = wallPoint(O.home, rec.side, rec.u + def.fp[0] / 2, 0.06); return { x, y: FY + wyOf(def, rec.side), z, ry: wallYaw(O.home, rec.side) }; }
    const [w, d] = fp(def, rec.r || 0), c = O.home.cells.get(key(rec.x, rec.z));
    let y = c ? c.y : 0;
    if (def.kind === 'small') { const s = occ(except != null ? except : rec.id).surf.get(key(rec.x, rec.z)); if (s) y = s.y; }
    if (def.kind === 'rug') y += 0.004;
    const out = { x: rec.x + w / 2, y, z: rec.z + d / 2, ry: (rec.r || 0) * Math.PI / 2 };
    // Under a window: something tall enough to reach the sill stands out from the wall just enough to clear it
    // (the inside sill sticks about 28 cm into the room), instead of going through it.
    if (def.kind === 'floor' && O.home && O.home.def && c && c.zone === 'in') {
      const hd = O.home.def, top = y + IH.items.heightOf(def), SILL = 0.29;
      for (const [sd, touch, a, b, nx, nz] of [['n', rec.z === 0, rec.x, rec.x + w, 0, 1], ['s', rec.z + d === hd.d, rec.x, rec.x + w, 0, -1], ['w', rec.x === 0, rec.z, rec.z + d, 1, 0], ['e', rec.x + w === hd.w, rec.z, rec.z + d, -1, 0]]) {
        const S = O.home.sides[sd]; if (!touch || !S) continue;
        if (S.open.some(o => o.kind === 'window' && o.u1 > a + 0.05 && o.u0 < b - 0.05 && top > o.y0 - 0.18)) { out.x += nx * SILL; out.z += nz * SILL; }
      }
    }
    // Never into a wall: walls have thickness past the line between cells (the house's outside walls and its
    // foundation stand out into the garden; the walls between rooms stand half into each room), so a thing standing
    // against one moves just clear of it, on each side it touches.
    if (def.kind === 'floor' && O.home && O.home.walls && c) {
      const hd = O.home.def, W = O.home.walls, TE = IH.homes.TE, outer = c.zone === 'out', x0 = rec.x, x1 = rec.x + w, z0 = rec.z, z1 = rec.z + d;
      const inHouseZ = z => z >= 0 && z < hd.d, inHouseX = x => x >= 0 && x < hd.w;
      const depth = (line, isOuterLine) => isOuterLine ? (outer ? TE + 0.14 : 0) : 0.13; // outside wall (from the garden) or a wall between rooms
      let px = 0, pz = 0;
      for (let z = z0; z < z1; z++) {
        if (W.has('v' + key(x0, z))) px = Math.max(px, depth(x0, (x0 === 0 || x0 === hd.w) && inHouseZ(z)));
        if (W.has('v' + key(x1, z))) px = Math.min(px, -depth(x1, (x1 === 0 || x1 === hd.w) && inHouseZ(z)));
      }
      for (let x = x0; x < x1; x++) {
        if (W.has('h' + key(x, z0))) pz = Math.max(pz, depth(z0, (z0 === 0 || z0 === hd.d) && inHouseX(x)));
        if (W.has('h' + key(x, z1))) pz = Math.min(pz, -depth(z1, (z1 === 0 || z1 === hd.d) && inHouseX(x)));
      }
      // a garden thing at the house's corner also clears the corner post
      if (outer && !px && !pz) {
        const cx = x0 >= hd.w ? hd.w : x1 <= 0 ? 0 : null, cz = z0 >= hd.d ? hd.d : z1 <= 0 ? 0 : null;
        if (cx != null && cz != null && (x0 === cx || x1 === cx) && (z0 === cz || z1 === cz)) { px = (x0 === cx ? 1 : -1) * (TE + 0.14); }
      }
      out.x += px; out.z += pz;
    }
    return out;
  }

  // ---------- the scene
  function makeScene() {
    const scene = new T.Scene();
    const sun = new T.DirectionalLight(0xffffff, 1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.018; sun.shadow.radius = 1; // (sharp enough for a picket fence's shadow)
    scene.add(sun, sun.target);
    const lamps = []; for (let i = 0; i < 4; i++) { const p = new T.PointLight(0xffc77a, 0, 5.2, 2); scene.add(p); lamps.push(p); }
    const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 1400); // (far enough for the city and the mountains round the home)
    const itemsG = new T.Group(); scene.add(itemsG);
    const marks = new T.Group(); scene.add(marks);
    return { scene, sun, lamps, cam, itemsG, marks };
  }

  const CAM = { yaw: Math.PI / 4, pitch: 0.56, zoom: 1, target: new T.Vector3(), fitV: 20, turn: null, intro: null, view: 0 };
  const ZMIN = 0.8, ZMAX = 9; // (from the whole island, right in to a character's face)
  function fit() {
    const b = O.home.viewBounds || O.home.bounds, cam = O.S.cam, a = O.w / O.h, pts = []; // (an island home: its street ring too)
    for (const x of [b.x0, b.x1]) for (const z of [b.z0, b.z1]) for (const y of [-2.5, H + 1]) pts.push(new T.Vector3(x, y, z));
    aim(1); cam.updateMatrixWorld();
    let mx = 0, my = 0; for (const p of pts) { p.applyMatrix4(cam.matrixWorldInverse); mx = Math.max(mx, Math.abs(p.x)); my = Math.max(my, Math.abs(p.y)); }
    CAM.fitV = Math.max(my * 2, mx * 2 / a) * 1.02 + (O.w < 600 ? 3 : 1.5);
  }
  function aim(zoomOverride) {
    const cam = O.S.cam, t = CAM.target, y = CAM.yaw, p = CAM.pitch;
    cam.position.set(t.x + Math.sin(y) * Math.cos(p) * 90, t.y + Math.sin(p) * 90, t.z + Math.cos(y) * Math.cos(p) * 90); cam.lookAt(t);
    const v = CAM.fitV, a = O.w / O.h; cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v / 2; cam.bottom = -v / 2;
    cam.zoom = zoomOverride || CAM.zoom; cam.updateProjectionMatrix();
  }
  function lightFor(phase) {
    const P = LK.PHASES[phase], s = O.S.sun, rot = O.st.look.sun === 'island' ? 0 : CAM.yaw - Math.PI / 4, L0 = Math.hypot(...P.sun), el = Math.min(Math.asin(P.sun[1] / L0), 0.5), y = L0 * Math.sin(el), hz = L0 * Math.cos(el), x = -0.25 * hz, z = 0.97 * hz; // (the sun from the front, a little to the left, and no higher than 29°: shadows fall back across the ground, long enough that a fence's lies on the lawn behind it, not hidden along itself) // the sun turns with the view, or stays put over the island
    const dx = x * Math.cos(rot) + z * Math.sin(rot), dz = -x * Math.sin(rot) + z * Math.cos(rot), b = O.home.viewBounds || O.home.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, rad = Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2 + 2;
    s.target.position.set(cx, 0, cz); s.position.set(cx + dx * 40, y * 40, cz + dz * 40); s.target.updateMatrixWorld();
    if (O.home && O.home.setSun) { const L = Math.hypot(dx, y, dz) || 1; const k0 = O.home.sunKey; O.home.setSun(O.st.look.sun === 'island' ? [dx / L, y / L, dz / L] : null); if (O.home.sunKey !== k0) tintBeams(phase); }
    if (pipe && O.S.cam) { // the sun painted in the sky: where the real sun is, when it's fixed over the island
      if (O.st.look.sun === 'island') { const cam = O.S.cam; cam.updateMatrixWorld(); const L = Math.hypot(dx, y, dz) || 1, sp = new T.Vector3(cx + dx / L * 60, y / L * 60, cz + dz / L * 60).project(cam); pipe.u.uSun.value.set(clamp((sp.x + 1) / 2, 0.08, 0.92), clamp((sp.y + 1) / 2, 0.62, 0.93)); }
      else pipe.u.uSun.value.set(...P.sunAt);
    } // sunbeams along the real sunlight when the sun is fixed
    Object.assign(s.shadow.camera, { left: -rad, right: rad, top: rad, bottom: -rad, near: 1, far: 120 }); s.shadow.camera.updateProjectionMatrix();
  }

  // ---------- items in the scene
  const insts = new Map();
  function addInst(rec) {
    const def = BY[rec.t]; if (!def) return null;
    if (def.cover) fitCover(rec);
    const inst = make(def, rec); inst.rec = rec; inst.def = def; inst.glows = [];
    inst.group.traverse(m => { if (m.isMesh && m.material && m.material.userData.anime && m.material !== LK.BASE && m.material !== LK.BASE2 && !inst.glows.includes(m.material)) inst.glows.push(m.material); });
    inst.group.userData.recId = rec.id;
    if (def.opening || def.cover) inst.group.traverse(m => { if (m.isMesh) m.userData.bg = true; }); // windows, curtains and blinds belong to the house: scenery, no ink
    if (def.act === 'tv' && inst.subs.screen) { const m = inst.subs.screen.userData.mesh; m.material = new T.MeshBasicMaterial({ color: 0x1d2333 }); inst.screen = m.material; }
    if (def.act === 'lamp' && def.light) { const h = new T.Mesh(new T.PlaneGeometry(1, 1), LK.haloMat('#' + warm(def.glowCol || '#ffd88a').getHexString())); h.layers.set(1); h.renderOrder = 4; h.scale.setScalar(def.kind === 'small' ? 1.1 : 1.8); h.position.set(...def.light); inst.group.add(h); inst.halo = h; }
    if (def.pet) inst.petAi = { st: 'stand', until: 0, path: [], pos: null, yaw: 0, ph: Math.random() * 6, happy: 0 };
    O.S.itemsG.add(inst.group); insts.set(rec.id, inst); posInst(inst);
    if (IH.ragdoll && IH.ragdoll.TOYS.has(def.t) && !def.pet) makeDoll(inst);
    return inst;
  }
  // ---------- soft toys as ragdolls (ragdoll.js): the teddy's parts flop about, and pets carry, shake, toss, pounce on
  // and wrestle it. It stays wherever it ends up (rec.doll, kept while the teddy hasn't been moved).
  const dollAt = inst => { const p = inst.group.position; return [p.x, p.y, p.z].map(v => v.toFixed(2)).join(','); };
  function makeDoll(inst) {
    if (inst.doll) { inst.doll.dispose(); inst.doll = null; }
    inst.group.children.forEach(c => { c.visible = false; }); // (the still model; the doll's parts draw it now)
    const rec = inst.rec, here = dollAt(inst), saved = rec.dollAt === here ? rec.doll : null;
    inst.doll = new IH.ragdoll.Doll(inst.group, inst.group.position.clone(), inst.group.rotation.y, saved); inst.doll.at = here; inst.busy = true; // (it's no obstacle: pets push it about)
    if (IH.phys) IH.phys.forget(inst);
  }
  const dollGround = (x, y, z) => { const P = IH.phys; if (!P) return 0; const s = P.support(x, y - 0.4, z); return s > -100 ? s : P.floorAt(x, z); }; // (only what's at or below it: never lifted up onto the bed beside it)
  function dollTick(inst, dt) {
    const D = inst.doll; if (!D) return;
    if (inst.group.position && dollAt(inst) !== D.at && !D.heldBy().length) { makeDoll(inst); return; } // moved in Decorate: sits up in its new spot
    for (const w of D.heldBy()) if (w.toyCarry !== inst && !(w.petAi && w.petAi.doing && w.petAi.doing.o.play === inst)) D.let(w); // nobody holds it once they've stopped playing with it (called away, picked up, patted)
    const was = D.asleep; D.step(dt, dollGround, O.home.bounds, IH.phys && ((a, b) => IH.phys.wallFree(a, b)));
    if (D.asleep && !was) { inst.rec.doll = D.save(); inst.rec.dollAt = D.at; save(); }
  }
  // a pet's mouth: just in front of its face, a touch below the middle
  function mouthOf(p) {
    const h = p.B && p.B.head; if (!h) return p.petAi.pos.clone().add(new T.Vector3(0, 0.4, 0));
    const f = IH.rig3d.faceOf(p, h).clone().applyQuaternion(h.getWorldQuaternion(new T.Quaternion()));
    const cap = p.cols && IH.rig3d.capsules(p, p.cols).find(k => k.bone === 'head'), r = cap ? cap.r : 0.1;
    return h.getWorldPosition(new T.Vector3()).addScaledVector(f, r * 1.25).add(new T.Vector3(0, -r * 0.35, 0));
  }
  // How each kind of pet plays with a soft toy, move by move: [move, seconds]
  const PLAY = {
    dog: [['grab', 0.5], ['shake', 2.2], ['carry', 0], ['shake', 1.4], ['toss', 0.7], ['bow', 1.6], ['pounce', 1.1], ['grab', 0.5], ['shake', 1.8], ['toss', 0.7]],
    cat: [['crouch', 1.8], ['pounce', 1.1], ['wrestle', 3.6], ['bat', 1.8], ['crouch', 1.4], ['pounce', 1.1], ['bat', 1.6], ['wrestle', 3]],
    bunny: [['nudge', 1.3], ['nudge', 1.3], ['flick', 0.8], ['nudge', 1.5]]
  };
  const MOUTH = new Set(['grab', 'shake', 'carry', 'tug', 'flick']);
  // one beat of play. Returns false when playtime is over (the usual finish takes it from there).
  function playStep(inst, D, t, dt) {
    const A = inst.petAi, toy = D.o.play, doll = toy && toy.doll, g = inst.group;
    if (!doll || !insts.has(toy.rec.id) || t > D.until) { if (doll) doll.let(inst); inst.playing = false; inst.playFocus = undefined; return false; }
    inst.playing = true;
    const P = D.pl || (D.pl = { i: -1, move: null, t0: t, until: 0, part: null }), kind = inst.pet in PLAY ? inst.pet : 'dog', list = PLAY[kind];
    const T0 = doll.centre(), fwd = () => new T.Vector3(Math.sin(A.yaw), 0, Math.cos(A.yaw)), cls = clsOf(inst);
    const start = (m, dur) => { P.move = m; P.t0 = t; P.until = t + dur; P.did = 0; };
    // somebody else has hold of it: grab another part and pull (a tug of war)
    const rival = doll.heldBy().find(w => w !== inst);
    if (rival && P.move !== 'tug' && P.move !== 'bow') { doll.let(inst); start('tug', 3.5 + Math.random() * 2); P.part = ['legL', 'legR', 'armL', 'armR', 'head'].find(n => !doll.pins[n]) || 'legL'; }
    if (t > P.until) {
      if (P.move === 'tug' && rival && Math.random() < 0.5) { doll.let(inst); P.part = null; start('bow', 1.4); } // lets the other one win this round
      else { P.i = (P.i + 1) % list.length; const [m, d] = list[P.i]; start(m, d || 6); }
      if (P.move === 'grab' || P.move === 'flick') { doll.let(inst); P.part = doll.nearest(mouthOf(inst)); } // one hold at a time
      if (P.move === 'carry') { if (!P.part) { doll.let(inst); P.part = doll.nearest(mouthOf(inst)); } const a = Math.random() * Math.PI * 2, q = IH.phys && IH.phys.nearestClear(A.pos.x + Math.cos(a) * 2.2, A.pos.z + Math.sin(a) * 2.2, cls); P.goal = q ? new T.Vector3(q.x, A.pos.y, q.z) : null; P.until = t + 6; }
      if (P.move === 'toss' && P.part) { const f = fwd(); doll.let(inst); P.part = null; doll.push(null, f.x * 2.2, 3.6, f.z * 2.2); }
      if (P.move === 'bow' && P.part) { doll.let(inst); P.part = null; }
      if (!MOUTH.has(P.move) && P.move !== 'shake') { if (P.part) doll.let(inst); P.part = null; }
    }
    const u = t - P.t0, m = P.move, f = fwd(); inst.playMove = m;
    // where to be: mouth to the toy for mouth moves, a pounce away when stalking or bowing, close for the rest
    const want = { grab: 0.32, shake: 0.32, flick: 0.3, nudge: 0.32, bat: 0.45, wrestle: 0.15, crouch: 0.75, bow: 0.8, pounce: 0.75, tug: 0.55, carry: 0, toss: 0.35 }[m] || 0.4;
    const to = new T.Vector3(T0.x - A.pos.x, 0, T0.z - A.pos.z), dist = to.length(); let walking = false;
    const stepTo = (x, z, sp) => { const d = Math.hypot(x - A.pos.x, z - A.pos.z); if (d < 0.02) return; const k = Math.min(1, sp * dt / d), nx = A.pos.x + (x - A.pos.x) * k, nz = A.pos.z + (z - A.pos.z) * k, q = safeMove(inst, nx, nz); if (q.x !== A.pos.x || q.z !== A.pos.z) { inst.walkD = (inst.walkD || 0) + Math.hypot(q.x - A.pos.x, q.z - A.pos.z); A.pos.x = q.x; A.pos.z = q.z; walking = true; } };
    if (m === 'carry' && P.goal) { stepTo(P.goal.x, P.goal.z, 1.1); turnTo(A, Math.atan2(P.goal.x - A.pos.x, P.goal.z - A.pos.z), dt, 6); if (Math.hypot(P.goal.x - A.pos.x, P.goal.z - A.pos.z) < 0.15) P.until = t; }
    else if (m === 'tug') { turnTo(A, Math.atan2(to.x, to.z), dt, 4); if (dist < 0.75) stepTo(A.pos.x - to.x / (dist || 1) * 0.3, A.pos.z - to.z / (dist || 1) * 0.3, 0.25); } // pulls backward
    else if (m === 'pounce') { const k = u % 1.1; turnTo(A, Math.atan2(to.x, to.z), dt, 8); if (k > 0.35 && k < 0.75 && dist > 0.2) stepTo(T0.x, T0.z, 2.6); if (k > 0.75 && !P.did) { P.did = 1; doll.push('body', 0, -2.5, 0); doll.push(null, f.x * 0.8, 0.6, f.z * 0.8); } }
    else { turnTo(A, Math.atan2(to.x, to.z), dt, 6); if (Math.abs(dist - want) > 0.12 && m !== 'shake') stepTo(T0.x - to.x / (dist || 1) * want, T0.z - to.z / (dist || 1) * want, m === 'crouch' ? 0.35 : 1.1); }
    // hands (paws and mouth) on the toy
    if ((MOUTH.has(m) || m === 'shake') && P.part && !(m === 'flick' && u > 0.3)) doll.pin(P.part, mouthOf(inst), inst);
    if (m === 'flick' && u > 0.3 && !P.did) { P.did = 1; doll.let(inst); P.part = null; doll.push(null, f.x * 1.6, 3.0, f.z * 1.6); }
    if (m === 'wrestle' && inst.B && inst.B.chest) { const c = inst.B.chest.getWorldPosition(new T.Vector3()).addScaledVector(f, 0.18); c.y = Math.max(c.y - 0.05, dollGround(c.x, c.y, c.z) + 0.2); doll.pin('body', c, inst); if (Math.floor(u * 7) !== P.did) { P.did = Math.floor(u * 7); const n = Math.random() < 0.5 ? 'legL' : 'legR'; doll.push(n, (Math.random() - 0.5) * 2, 0.8, (Math.random() - 0.5) * 2); } }
    if (m === 'bat' && Math.floor(u * 7 / Math.PI / 2 + 0.25) !== P.did) { P.did = Math.floor(u * 7 / Math.PI / 2 + 0.25); const s2 = new T.Vector3(f.z, 0, -f.x).multiplyScalar(Math.random() < 0.5 ? 1.6 : -1.6); doll.push(doll.nearest(mouthOf(inst)), s2.x + f.x * 0.6, 0.9, s2.z + f.z * 0.6); }
    if (m === 'nudge' && Math.sin(u * 2.4) > 0.95 && !P.did) { P.did = 1; doll.push('body', f.x * 1.2, 0.5, f.z * 1.2); } else if (m === 'nudge' && Math.sin(u * 2.4) < 0) P.did = 0;
    if (m !== 'wrestle' && doll.pins.body && doll.pins.body.who === inst && !MOUTH.has(m)) doll.pin('body', null);
    inst.playFocus = m === 'shake' || m === 'wrestle' || m === 'tug' ? null : T0.clone();
    poseOf(inst, walking && m !== 'pounce' && m !== 'tug' && m !== 'crouch' ? 'walk' : 'play.' + (m === 'grab' || m === 'carry' ? 'nudge' : m === 'toss' ? 'shake' : m === 'flick' ? 'nudge' : m), t, A.ph);
    g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0);
    return true;
  }
  function posInst(inst, lift = 0) {
    if (IH.phys) IH.phys.forget(inst);
    const p = placeOf(inst.def, inst.rec); inst.group.position.set(p.x, p.y + lift, p.z); inst.group.rotation.set(0, p.ry, 0);
    if (inst.petAi) { inst.petAi.pos = new T.Vector3(p.x, p.y, p.z); inst.petAi.yaw = p.ry; inst.petAi.path = []; inst.petAi.st = 'stand'; inst.petAi.until = 0; }
  }
  function dropInst(id) {
    const inst = insts.get(id); if (!inst) return; O.S.itemsG.remove(inst.group); insts.delete(id);
    inst.group.traverse(m => { if (m.isMesh) { m.geometry.dispose && !m.geometry.userData?.keep && m.geometry.dispose(); if (m.material !== LK.BASE && m.material !== LK.BASE2) m.material.dispose(); } });
  }
  const refreshAll = () => { for (const inst of insts.values()) if ((!O.held || inst !== O.held.inst) && inst.rec.id !== KID) posInst(inst); };
  // The kid's own character: not a thing they own, it just lives in whichever home they're in.
  const KID = '__kid';
  function addKid() {
    if (!IH.chars) return;
    const k = O.kid, inst = IH.chars.make(k.avatar || '🦊', k.hue), def = { t: KID, name: k.name || 'You', kind: 'pet', pet: 'kid', fp: [1, 1], where: 'any' };
    const rec = { id: KID, t: KID, ...(freeSpot(def) || { x: 0, z: 0 }), r: 0 };
    Object.assign(inst, { rec, def, glows: [], petAi: { st: 'stand', until: 0, path: [], pos: null, yaw: 0, ph: 1.3, happy: 0 } });
    inst.group.userData.recId = KID; O.S.itemsG.add(inst.group); insts.set(KID, inst); posInst(inst);
  }
  const poseOf = (inst, ...a) => (inst.pet === 'kid' ? IH.chars : IH.pets).pose(inst, ...a);

  // Every home has a kitchen and a bathroom, and each comes with its basics the first time the home is opened
  // (a bench, a fridge and a step stool; a bath, a basin and a toilet), stood against the walls. Free, and the kid's
  // to keep, move or upgrade.
  const FIXTURES = { Kitchen: ['kitchen', 'fridge', 'stool'], Bathroom: ['toilet', 'basin', ['bath', 'shower']] }; // (a list: the first that fits with room to use it; a small bathroom gets a shower)
  function furnish() {
    const st = O.st, id = st.cur, H = st.homes[id] || (st.homes[id] = { items: [] });
    if (H.starter) { delete H.starter; const L = STARTER.map(([t, a, b, r]) => typeof a === 'string' ? { t, side: a, u: b } : { t, x: a, z: b, r }); for (const w of L) if (BY[w.t] && BY[w.t].kind === 'small') { const host = L.find(h => h !== w && BY[h.t] && BY[h.t].surf && h.x === w.x && h.z === w.z); if (host) w.on = host.t; } arrange(L); save(); }
    st.fitted = st.fitted || {}; if (st.fitted[id]) return;
    const def = HB[id];
    for (const room of def.rooms) {
      const want = FIXTURES[room.name]; if (!want) continue;
      const inRoom = t => items().some(it => (it.t === t || (BY[it.t] && BY[it.t].up === t)) && it.x >= room.x && it.x < room.x + room.w && it.z >= room.z && it.z < room.z + room.d);
      // each in turn, against a wall first; if they don't all fit with room to use them, other orders are tried (the
      // bath first, then the basin...) and the one that fits the most is kept
      const need = want.filter(w => !(Array.isArray(w) ? w : [w]).some(inRoom)), perms = a => a.length < 2 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p]));
      let best = [];
      const undo = got => { const L = items(); for (const r of got) { const k = L.indexOf(r); if (k >= 0) L.splice(k, 1); } };
      for (const order of perms(need)) { // (each order from the same start: tried, measured, taken back out)
        const got = [];
        for (const w of order) for (const t of Array.isArray(w) ? w : [w]) { const g = arrange([{ t, room, wall: true }]); if (g.length) { got.push(g[0]); break; } }
        if (got.length > best.length) best = got.slice();
        undo(got); if (best.length === need.length) break;
      }
      for (const r of best) items().push(r);
      for (const r of best || []) st.owned[r.t] = (st.owned[r.t] || 0) + 1;
    }
    st.fitted[id] = 1; save();
  }
  // Setting things out (the starter furniture, each home's kitchen and bathroom basics): each goes where it was meant
  // to, or the nearest spot in the same room where all of this is true:
  //  - it fits on the floor, and its model touches nothing else (no clipping, measured from the models themselves);
  //  - the side it's used from faces into the room, with the floor in front of it clear and kept clear (nothing else
  //    is put there later: the character can always get to it and use it); a bed needs one long side clear;
  //  - it isn't in the way of the front door.
  // Returns the records it placed (they're added to the home).
  const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // which way the front of something faces, by its turn (r)
  function useStrips(def, rec) {
    const U = def.use || (/^(toilet|pantry|wardrobe|dresser)$/.test(def.t) ? { kind: 'front', gap: 0.5 } : null); if (!U || /^(deskchair|chair)$/.test(def.t)) return null; // (a desk chair is tucked in at the desk; a toilet, the pantry and the like are used from the front too)
    const [w, d] = fp(def, rec.r || 0), strip = (r, depth) => { const [dx, dz] = DIRS[((r % 4) + 4) % 4], out = []; for (let k = 0; k < depth; k++) { if (dz > 0) for (let i = 0; i < w; i++) out.push([rec.x + i, rec.z + d + k]); if (dz < 0) for (let i = 0; i < w; i++) out.push([rec.x + i, rec.z - 1 - k]); if (dx > 0) for (let j = 0; j < d; j++) out.push([rec.x + w + k, rec.z + j]); if (dx < 0) for (let j = 0; j < d; j++) out.push([rec.x - 1 - k, rec.z + j]); } return out; };
    const r = rec.r || 0;
    // a bed: any spot along either long side but the head end (a bedside table goes there); a bath, a shower, a
    // trampoline: any spot along its front to step in from. Each spot on its own is enough.
    if (U.kind === 'lie') { const [hx, hz] = DIRS[(r + 2) % 4], head = c => c[0] * hx + c[1] * hz, side = [...strip(r + 1, 1), ...strip(r + 3, 1)], top = Math.max(...side.map(head)); return side.filter(c => head(c) < top).map(c => [c]); }
    if (U.kind === 'on') return [0, 1, 2, 3].flatMap(k => strip(r + k, 1)).map(c => [c]); // (stepped into from any side)
    return [strip(r, U.kind === 'front' ? Math.max(1, Math.ceil((U.gap || 0.6) + 0.2)) : 1)];
  }
  const roomAt = (x, z) => (HB[O.st.cur].rooms || []).find(R => x >= R.x && x < R.x + R.w && z >= R.z && z < R.z + R.d) || null;
  function solidBox(inst) { inst.group.updateMatrixWorld(true); const b = new T.Box3(); inst.group.traverse(m => { if (m.isMesh && m !== inst.halo && m.visible && !(m.layers.mask === 2)) b.expandByObject(m); }); return b; } // (the thing itself: not its glow)
  function arrange(list) {
    const placed = [], P = O.home, reserved = new Set(), boxes = [];
    const boxOf = rec => { const tmp = Object.assign({}, rec, { id: '__fit' + uid() }), inst = addInst(tmp); if (!inst) return null; const b = solidBox(inst); dropInst(tmp.id); return b.isEmpty() ? null : b.expandByScalar(-0.04); };
    // the way in from the front door, and what's already there (its model, and the floor in front of it) are kept clear
    const dr = HB[O.st.cur].door; if (dr) { const z0 = dr.side === 's' ? HB[O.st.cur].d - 1 : 0; for (const dx of [0, 1]) for (const k of [0, 1]) reserved.add(key(dr.at + dx, dr.side === 's' ? z0 - k : z0 + k)); }
    const solid = d => d && d.kind !== 'wall' && d.kind !== 'small' && d.kind !== 'rug' && d.kind !== 'pet';
    for (const it of items()) { const d = BY[it.t]; if (!solid(d)) continue; const i = insts.get(it.id), b = i ? solidBox(i).expandByScalar(-0.04) : boxOf(it); if (b) boxes.push(b); const S = useStrips(d, it); if (S && S[0]) for (const [x, z] of S[0]) reserved.add(key(x, z)); }
    for (const want of list) {
      const d = BY[want.t]; if (!d) continue;
      if (!solid(d)) {
        const rec = Object.assign({ id: uid() }, want); delete rec.room; delete rec.wall; if (d.kind === 'pet') rec.r = rec.r || 0;
        if (want.on) { const host = placed.find(h => h.t === want.on); if (host) { rec.x = host.x; rec.z = host.z; } delete rec.on; } // (a lamp onto the bedside table it was meant for, wherever that ended up)
        if (fits(d, rec).ok) { items().push(rec); placed.push(rec); } continue;
      }
      const room = want.room || roomAt(want.x || 0, want.z || 0), R = room || { x: -99, z: -99, w: 999, d: 999 };
      const spots = [];
      for (const c of P.cells.values()) { if (c.zone !== 'in' && d.where === 'in') continue; if (c.x < R.x || c.x >= R.x + R.w || c.z < R.z || c.z >= R.z + R.d) continue; const edge = Math.min(c.x - R.x, c.z - R.z, R.x + R.w - 1 - c.x, R.z + R.d - 1 - c.z); spots.push([c.x, c.z, want.wall ? edge * 10 + Math.hypot(c.x - R.x, c.z - R.z) * 0.01 : Math.hypot(c.x - (want.x || 0), c.z - (want.z || 0))]); }
      spots.sort((a, b) => a[2] - b[2]);
      let got = null;
      for (const [x, z] of spots) {
        for (const r of [want.r || 0, 0, 1, 2, 3].filter((v, i, a) => a.indexOf(v) === i)) {
          const rec = { id: uid(), t: want.t, x, z, r };
          if (!fits(d, rec).ok) continue;
          const cells = cellsOf(d, x, z, r); if (cells.some(([cx, cz]) => reserved.has(key(cx, cz)) || (room && !roomAt(cx, cz)) || roomAt(cx, cz) !== room)) continue;
          const S = useStrips(d, rec); let strip = null;
          if (S) { const o = occ(); for (const s of S) { const ok = s.length && s.every(([cx, cz]) => { const c = P.cells.get(key(cx, cz)); return c && !c.fixed && c.zone === P.cells.get(key(x, z)).zone && roomAt(cx, cz) === room && !o.floor.has(key(cx, cz)); }) && !crossesWall([...cells, ...s]); if (ok) { strip = s; break; } } if (!strip) continue; }
          const b = boxOf(rec); if (b && boxes.some(o => o.intersectsBox(b))) continue;
          got = rec; items().push(rec); placed.push(rec); if (b) boxes.push(b); for (const [cx, cz] of cells) reserved.add(key(cx, cz)); if (strip) for (const [cx, cz] of strip) reserved.add(key(cx, cz)); break;
        }
        if (got) break;
      }
    }
    return placed;
  }
  // ---------- the lawn: drawn anime tufts (dark blade, light tips, an ink outline) that grow long over three days,
  // the same as the lawn in the Chorecast app, and get cut where the mower goes.
  const GROW_DAYS = 3, CUT = 0.25;
  const lawnRec = () => { const h = hrec(); if (h.mowAt == null) { h.mowAt = Date.now() - 1.2 * 864e5; save(); } return h; };
  const lawnGrowth = () => clamp((Date.now() - lawnRec().mowAt) / 864e5 / GROW_DAYS, 0, 1.5);
  const hasLawn = () => !!(O.home.grass && O.home.grass.length);
  // ---------- the lawn: the Chorecast app's island grass. Dense curved blades lit as one soft surface, deep green at the
  // root to sunlit yellow-green tips, waves of wind rolling across; long when it needs mowing, cut short behind the
  // mower. The same blade, wind and colours as the app (index.html grassField), sized for a home's tiles.
  const LAWN_C = { day: { base: '#2a6b2a', tip: '#c4e86a', sun: '#fff2c4', ground: '#3f8f35' }, dusk: { base: '#2e5f2a', tip: '#d8d06a', sun: '#ffd8a0', ground: '#3d7a32' }, night: { base: '#0f2a24', tip: '#3d6b5a', sun: '#223355', ground: '#14301f' } };
  const BLADE_H = 0.42;
  const appBlade = () => { // the app's blade (a tapering strip in five segments), three to a tuft, each turned its own way
    const segs = 4, w = 0.055, h = BLADE_H, pos = [], idx = [], top = [], R = IH.kit.rng(3);
    for (let b = 0; b < 3; b++) {
      const a = b * 2.1 + R() * 0.6, ca = Math.cos(a), sa = Math.sin(a), ox = (R() - 0.5) * 0.09, oz = (R() - 0.5) * 0.09, hs = 0.8 + R() * 0.35, base = pos.length / 3;
      for (let i = 0; i <= segs; i++) { const t = i / segs, hw = w * 0.5 * (1 - Math.pow(t, 1.4) * 0.95); for (const sx of [-hw, hw]) { pos.push(ox + sx * ca, t * h * hs, oz - sx * sa); top.push(h * hs); } }
      for (let i = 0; i < segs; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('aTop', new T.Float32BufferAttribute(top, 1)); geo.setIndex(idx); geo.computeBoundingSphere(); return geo;
  };
  const LAWN_V = `#include <common>
    #include <shadowmap_pars_vertex>
    uniform float uTime, uGrow, uCut, uWind, uLong; attribute float aCut, aTop, aHide; varying float vH, vUnder; varying vec3 vTint; // aHide: the height of whatever's above this blade (it never grows into it)
    void main() {
      vec3 p = position; float t = p.y / aTop; // (0 at the root, 1 at the tip of this blade)
      vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      // Every blade is always full length; it never stretches. Mown, it sinks into the ground where the mower went so
      // every top sits at the one cut height, level; as the days pass it rises back up out of the ground, each toward
      // its own natural length, so the tops only grow uneven as the grass grows.
      float gr = mix(uGrow, uCut, aCut), sy = length(instanceMatrix[1].xyz);
      float full = aTop * sy * uLong, cutH = uCut * ${BLADE_H.toFixed(3)};
      float k = clamp((gr - uCut) / (uLong - uCut), 0.0, 1.0), showTop = min(mix(cutH, full, k), aHide - 0.03); // (under a bench seat or a table: no higher than its underside)
      float y = t * full + (showTop - full); // this point's height: the blade lowered so its tip is at showTop
      p.y = 0.0;
      float vis = (y) / max(showTop, 0.001); // how far up the part above ground (0 at the ground, 1 at the tip)
      float wave = sin(dot(ip, vec2(0.5, 0.29)) - uTime * (1.6 + uWind * 0.6)) * 0.5 + 0.5;
      float gust = 0.55 + 0.45 * sin(uTime * 0.6 + ip.x * 0.14);
      float bend = (0.3 + wave * gust) * t * t * gr * uWind;
      vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0); wp.y += y;
      wp.xz += vec2(0.85, 0.5) * bend * 0.12 * step(0.0, y); wp.y -= bend * bend * 0.04;
      vH = clamp(vis, 0.0, 1.0); vUnder = y; // shaded root to tip over what shows
      #ifdef USE_INSTANCING_COLOR
        vTint = instanceColor;
      #else
        vTint = vec3(1.0);
      #endif
      gl_Position = projectionMatrix * viewMatrix * wp;
      vec4 worldPosition = wp; vec3 transformedNormal = normalMatrix * vec3(0.0, 1.0, 0.0);
      #include <shadowmap_vertex>
    }`;
  const LAWN_F = `#include <common>
    #include <packing>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    uniform vec3 uBase, uTip, uSun; varying float vH, vUnder; varying vec3 vTint;
    void main() {
      if (vUnder < 0.0) discard; // the part of a blade that's down in the ground is never seen (not even through the island's side)
      float h = smoothstep(0.0, 1.0, vH);
      vec3 col = mix(uBase, uTip, h) * vTint;
      col *= 0.7 + 0.3 * vH;
      col += uSun * pow(vH, 4.0) * 0.22;
      float sh = 1.0;
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        sh = getShadow(directionalShadowMap[0], directionalLightShadows[0].shadowMapSize, directionalLightShadows[0].shadowBias, directionalLightShadows[0].shadowRadius, vDirectionalShadowCoord[0]);
      #endif
      col = mix(col * vec3(0.42, 0.5, 0.72), col, smoothstep(0.68, 0.8, sh)); // (in the shade of the fence, the house, a tree: cooler and darker)
      gl_FragColor = vec4(col, 1.0);
    }`;
  function lawnColours(U, phase) { const c = LAWN_C[phase] || LAWN_C.day; U.uBase.value.set(c.base); U.uTip.value.set(c.tip); U.uSun.value.set(c.sun); U.uGround.value.set(c.ground); }
  function makeLawn() {
    if (!O.home.grass || !O.home.grass.length) return null;
    const home = O.home, cells = [], P = home.def.plot, df = home.def;
    for (const c of home.cells.values()) if (c.zone === 'out' && !c.deck && !(home.path && home.path.has(key(c.x, c.z)))) cells.push(c);
    return buildLawn({ cells, x0: -P.l, z0: -P.t, W: df.w + P.l + P.r, D: df.d + P.t + P.b, seed: df.w * 17 + df.d, phase: O.st.look.phase, per: e => e ? 200 : 14, ground: true });
  }
  // A lawn from its cells (whole tiles of grass) inside the rectangle x0, z0, W x D: the home's garden, or the
  // village's lawns (village.js, through IH.lawnKit). per(edge): blades a tile, at an edge or not.
  function buildLawn(spec) {
    const R = IH.kit.rng(spec.seed), cells = spec.cells;
    const U = { ...T.UniformsUtils.clone(T.UniformsLib.lights), uDbg: { value: 0 }, uTime: { value: 0 }, uGrow: { value: CUT }, uCut: { value: CUT }, uWind: { value: 1 }, uLong: { value: CUT + 1.5 * 0.9 }, uBase: { value: new T.Color() }, uTip: { value: new T.Color() }, uSun: { value: new T.Color() }, uGround: { value: new T.Color() } };
    lawnColours(U, spec.phase);
    // Real blades only where their shape shows: thick along the lawn's edges (the island's rim, paths, the house) and
    // a light scatter over the rest for tufts and movement. The body of the lawn is the shells (below).
    const lawnSet = new Set(cells.map(c => key(c.x, c.z))), edge = c => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !lawnSet.has(key(c.x + a, c.z + b)));
    const per = c => spec.per(edge(c)), n = cells.reduce((a, c) => a + per(c), 0), mesh = new T.InstancedMesh(appBlade(), new T.ShaderMaterial({ uniforms: U, vertexShader: LAWN_V, fragmentShader: LAWN_F, side: T.DoubleSide, lights: true }), n); mesh.receiveShadow = true;
    const d = new T.Object3D(), col = new T.Color(), spots = [], byCell = new Map(), cut = new Float32Array(n);
    let i = 0;
    for (const c of cells) for (let k = 0, m = per(c); k < m; k++) {
      const x = c.x + R(), z = c.z + R();
      d.position.set(x, 0.004, z); d.rotation.set((R() - 0.5) * 0.3, R() * 6.28, (R() - 0.5) * 0.3); d.scale.set(0.8 + R() * 0.5, 0.65 + R() * 0.7, 1); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix);
      const v = 0.82 + R() * 0.3; col.setRGB(v * (0.96 + R() * 0.08), v, v * (0.9 + R() * 0.1)); mesh.setColorAt(i, col);
      spots.push([x, z]); const kk = key(c.x, c.z); if (!byCell.has(kk)) byCell.set(kk, []); byCell.get(kk).push(i); i++;
    }
    mesh.geometry.setAttribute('aCut', new T.InstancedBufferAttribute(cut, 1)); mesh.geometry.setAttribute('aHide', new T.InstancedBufferAttribute(new Float32Array(n).fill(9), 1));
    mesh.frustumCulled = false; mesh.layers.set(1); mesh.userData = { spots, byCell, cut };
    // the lawn under the blades, the app's lawn green
    const { x0, z0, W, D } = spec, gg = new T.PlaneGeometry(W - 0.06, D - 0.06); gg.rotateX(-Math.PI / 2); gg.translate(x0 + W / 2, 0.003, z0 + D / 2);
    // (the grass's own mid-green with a fine grain, so any gap between blades still reads as grass)
    const ground = new T.Mesh(gg, new T.ShaderMaterial({ uniforms: U, vertexShader: 'varying vec2 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: 'uniform vec3 uBase, uTip; varying vec2 vW; float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); } void main() { float n = h(floor(vW * 24.0)) * 0.6 + h(floor(vW * 9.0)) * 0.4; gl_FragColor = vec4(mix(uBase, uTip, 0.28 + n * 0.22) * 0.85, 1.0); }' }));
    ground.userData.bg = true;
    if (spec.ground) mesh.add(ground); mesh.userData.parts = [mesh]; mesh.userData.U = U;
    mesh.add(makeShells(spec, cells, U)); mesh.userData.map = U.uMap.value.userData;
    return mesh;
  }
  // Shell grass: the body of the lawn as 24 stacked layers (one draw), each deciding pixel by pixel where blades
  // are. A blade is a tapering column through the layers up to its height, swaying with the same wind, shaded root to
  // tip like the app's blades. Its cost is the lawn's area on screen, not the number of blades, so it can be very
  // dense. The layers sit closer together when the grass is short, so a fresh-cut lawn is just as full.
  // A lawn map (8 points a tile) says where there's lawn (b), where it's mown (r) and where something stands on it (g).
  const SHELLS = 24, MAP_RES = 8;
  function makeShells(spec, cells, U) {
    const { x0, z0, W, D } = spec, mw = W * MAP_RES, mh = D * MAP_RES, data = new Uint8Array(mw * mh * 4);
    for (let i = 1; i < data.length; i += 4) data[i] = 255; // (g: how high grass can grow here, 255 = as high as it likes)
    for (const c of cells) for (let i = 0; i < MAP_RES; i++) for (let j = 0; j < MAP_RES; j++) { const px = (c.x - x0) * MAP_RES + i, pz = (c.z - z0) * MAP_RES + j; if (px >= 0 && pz >= 0 && px < mw && pz < mh) data[(pz * mw + px) * 4 + 2] = 255; }
    const tex = new T.DataTexture(data, mw, mh, T.RGBAFormat); tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.needsUpdate = true;
    tex.userData = { data, tex, x0, z0, mw, mh };
    Object.assign(U, { uMap: { value: tex }, uMapO: { value: new T.Vector4(x0, z0, W, D) }, uTop: { value: 0.2 }, uDens: { value: 30 } });
    const pos = [], lay = [], idx = [];
    for (let l = 0; l < SHELLS; l++) { const b = pos.length / 3; pos.push(x0, 0, z0, x0 + W, 0, z0, x0, 0, z0 + D, x0 + W, 0, z0 + D); lay.push(l / (SHELLS - 1), l / (SHELLS - 1), l / (SHELLS - 1), l / (SHELLS - 1)); idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aL', new T.Float32BufferAttribute(lay, 1)); g.setIndex(idx);
    const m = new T.Mesh(g, new T.ShaderMaterial({ uniforms: U, lights: true,
      vertexShader: `#include <common>
    #include <shadowmap_pars_vertex>
    uniform float uTop; attribute float aL; varying vec3 vW; varying float vL; void main() { vec3 p = position; p.y = 0.006 + aL * uTop; vL = aL; vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; vec4 worldPosition = w; vec3 transformedNormal = normalMatrix * vec3(0.0, 1.0, 0.0);
      #include <shadowmap_vertex>
       }`,
      fragmentShader: `#include <common>
    #include <packing>
    #include <bsdfs>
    #include <lights_pars_begin>
    #include <shadowmap_pars_fragment>
    uniform float uDbg; uniform sampler2D uMap; uniform vec4 uMapO; uniform float uTop, uCut, uGrow, uLong, uTime, uWind, uDens; uniform vec3 uBase, uTip, uSun; varying vec3 vW; varying float vL;
        float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          vec4 mp = texture2D(uMap, (vW.xz - uMapO.xy) / uMapO.zw); if (mp.b < 0.5) discard; // not lawn
          float cap = mp.g > 0.99 ? 99.0 : mp.g * 1.2 - 0.03; // the underside of anything above (grass never grows into it)
          float h = vW.y - 0.006, k = clamp((uGrow - uCut) / (uLong - uCut), 0.0, 1.0), kk = mp.r > 0.5 ? 0.0 : k;
          // the wind leans the blades over, more toward their tips (as the real blades)
          float wave = sin(dot(vW.xz, vec2(0.5, 0.29)) - uTime * (1.6 + uWind * 0.6)) * 0.5 + 0.5, gust = 0.55 + 0.45 * sin(uTime * 0.6 + vW.x * 0.14);
          float f = h / max(uTop, 0.001); vec2 q = vW.xz - vec2(0.85, 0.5) * (0.3 + wave * gust) * uWind * f * f * uTop * 0.3;
          // two sets of blades on grids turned off the view's axes and offset from each other, each blade scattered in
          // its cell, so there's no pattern to see
          float cutH = uCut * ${BLADE_H.toFixed(3)}, top = 0.0, r1 = 0.0, hit = 0.0;
          for (int s = 0; s < 2; s++) {
            float a = s == 0 ? 0.47 : -0.83; vec2 qq = mat2(cos(a), -sin(a), sin(a), cos(a)) * q * uDens + (s == 0 ? vec2(0.0) : vec2(0.37, 0.71));
            vec2 cell = floor(qq), fr = fract(qq) - 0.5; float a1 = hsh(cell + float(s) * 91.3), a2 = hsh(cell + 17.3 + float(s) * 7.1), a3 = hsh(cell + 31.7 + float(s) * 3.3);
            float tp = mix(cutH, (0.62 + a3 * 0.5) * uLong * ${BLADE_H.toFixed(3)}, kk); // level when cut; each to its own height as it grows
            float tt = clamp(h / tp, 0.0, 1.0);
            if (h <= tp && length(fr - (vec2(a1, a2) - 0.5) * 0.55) <= 0.4 * (1.0 - tt * 0.88) && tp > top) { top = tp; r1 = a1; hit = 1.0; }
          }
          if (vL > 0.0 && (hit < 0.5 || h > cap)) discard;
          if (vL == 0.0) top = max(top, cutH);
          float t = clamp(h / top, 0.0, 1.0);
          vec3 col = mix(uBase, uTip, smoothstep(0.0, 1.0, t)) * (0.82 + r1 * 0.3);
          col *= 0.7 + 0.3 * t; col += uSun * pow(t, 4.0) * 0.22;
          if (vL == 0.0) col = mix(uBase, uTip, 0.2) * 0.8; // the bottom layer: the dark deep down between the blades
          float sh = 1.0;
      #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
        sh = getShadow(directionalShadowMap[0], directionalLightShadows[0].shadowMapSize, directionalLightShadows[0].shadowBias, directionalLightShadows[0].shadowRadius, vDirectionalShadowCoord[0]);
      #endif
      col = mix(col * vec3(0.42, 0.5, 0.72), col, smoothstep(0.68, 0.8, sh)); // (in the shade of the fence, the house, a tree: cooler and darker)
      gl_FragColor = vec4(col, 1.0); if (uDbg > 0.5) gl_FragColor = vec4(vec3(sh), 1.0);
        }` }));
    m.frustumCulled = false; m.receiveShadow = true; m.layers.set(1); m.userData.bg = true; return m;
  }
  // stamp the lawn map: channel (0 mown, 1 covered) over a circle or box
  function lawnMap(ch, x, z, rx, rz, v, box, L = O.lawn) {
    const M = L && L.userData.map; if (!M) return;
    const { data, x0, z0, mw, mh } = M;
    for (let px = Math.max(0, Math.floor((x - rx - x0) * MAP_RES)); px <= Math.min(mw - 1, Math.ceil((x + rx - x0) * MAP_RES)); px++) for (let pz = Math.max(0, Math.floor((z - rz - z0) * MAP_RES)); pz <= Math.min(mh - 1, Math.ceil((z + rz - z0) * MAP_RES)); pz++) {
      const wx = x0 + (px + 0.5) / MAP_RES, wz = z0 + (pz + 0.5) / MAP_RES; if (box ? Math.abs(wx - x) > rx || Math.abs(wz - z) > rz : Math.hypot(wx - x, wz - z) > rx) continue;
      data[(pz * mw + px) * 4 + ch] = v;
    }
    M.tex.needsUpdate = true;
  }
  // Grass under things, never through them: each spot of lawn may grow only up to the underside of whatever is
  // above it (nothing for a veggie bed or the kennel standing on the ground; up to the seat under a bench). Read from
  // the collision map (phys.js), which has measured every item. Worked out when the home opens, whenever something is
  // put down, moved or put away, and after mowing (the mower's been moving about).
  function capAt(x, z) {
    const P = IH.phys; if (!P || !P.grid()) return 9; const sp = P.spans(x, z), fl = sp[0][1]; let cap = 9;
    for (let k = 1; k < sp.length; k++) { const [b, t] = sp[k]; if (t > fl + 0.01) cap = Math.min(cap, Math.max(0, b - fl)); }
    return cap;
  }
  function lawnHide() {
    const L = O.lawn; if (!L || !IH.phys) return; const { spots } = L.userData, hide = L.geometry.attributes.aHide;
    for (let n = 0; n < spots.length; n++) hide.array[n] = capAt(spots[n][0], spots[n][1]);
    hide.needsUpdate = true;
    const M = L.userData.map; if (!M) return;
    for (let pz = 0; pz < M.mh; pz++) for (let px = 0; px < M.mw; px++) { const o = (pz * M.mw + px) * 4; if (!M.data[o + 2]) continue; const c = capAt(M.x0 + (px + 0.5) / MAP_RES, M.z0 + (pz + 0.5) / MAP_RES); M.data[o + 1] = c >= 1.18 ? 255 : Math.max(0, Math.round((c + 0.03) / 1.2 * 254)); }
    M.tex.needsUpdate = true;
  }
  // the mower's blades: everything within r of (x, z) is cut short (grass, stalks and flowers)
  // Trim round the edges: every bit of lawn the mower's deck can't reach without going off the island, into the house
  // or over something (anywhere within the mower's lead of an edge) is cut.
  function edgeTrim() {
    const L = O.lawn; if (!L) return; const set = lawnCells(), near = (x, z) => { for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) for (const r of [0.4, 0.8, LEAD + 0.4]) if (!set.has(key(Math.floor(x + dx * r), Math.floor(z + dz * r)))) return true; return !mowerFits(x, z, 0) && !mowerFits(x, z, Math.PI / 2); };
    for (const m of L.userData.parts) { const { spots, cut } = m.userData; spots.forEach(([x, z], i) => { if (!cut[i] && near(x, z)) cut[i] = 1; }); m.geometry.attributes.aCut.needsUpdate = true; }
    const M = L.userData.map; if (M) { for (let pz = 0; pz < M.mh; pz++) for (let px = 0; px < M.mw; px++) { const o = (pz * M.mw + px) * 4; if (M.data[o + 2] && !M.data[o] && near(M.x0 + (px + 0.5) / MAP_RES, M.z0 + (pz + 0.5) / MAP_RES)) M.data[o] = 255; } M.tex.needsUpdate = true; }
  }
  // where a mower's deck fits: every corner on the garden (not the house, its deck or off the island), clear of the walls
  function mowerFits(x, z, yaw) {
    const hd = O.home.def, TE = IH.homes.TE + 0.18, B = O.home.bounds, ca = Math.cos(yaw), sa = Math.sin(yaw);
    for (const [u, v] of [[-0.5, -0.45], [0.5, -0.45], [-0.5, 0.45], [0.5, 0.45], [0, 0]]) {
      const px = x + u * ca + v * sa, pz = z - u * sa + v * ca;
      if (px < B.x0 + 0.08 || px > B.x1 - 0.08 || pz < B.z0 + 0.08 || pz > B.z1 - 0.08) return false; // off the island
      if (px > -TE && px < hd.w + TE && pz > -TE && pz < hd.d + TE) return false; // the house (and its foundation)
      const c = O.home.cells.get(key(Math.floor(px), Math.floor(pz))); if (!c || c.zone !== 'out' || c.deck) return false;
      if (IH.phys) { const S = IH.phys.spans(px, pz), fl = S[0][1]; for (let k = 1; k < S.length; k++) if (S[k][0] < fl + 0.45 && S[k][1] > fl + 0.02) return false; } // something standing there
    }
    return true;
  }
  // the nearest spot to (x, z) where the deck is inside the island and clear of the house (never left behind, never in a wall)
  function clampMower(x, z, yaw) {
    const hd = O.home.def, TE = IH.homes.TE + 0.18, B = O.home.bounds, ca = Math.abs(Math.cos(yaw)), sa = Math.abs(Math.sin(yaw)), ex = 0.5 * ca + 0.45 * sa, ez = 0.5 * sa + 0.45 * ca;
    x = clamp(x, B.x0 + 0.08 + ex, B.x1 - 0.08 - ex); z = clamp(z, B.z0 + 0.08 + ez, B.z1 - 0.08 - ez);
    const hx0 = -TE - ex, hx1 = hd.w + TE + ex, hz0 = -TE - ez, hz1 = hd.d + TE + ez;
    if (x > hx0 && x < hx1 && z > hz0 && z < hz1) { const o = [[x - hx0, hx0, 'x'], [hx1 - x, hx1, 'x'], [z - hz0, hz0, 'z'], [hz1 - z, hz1, 'z']].sort((a, b) => a[0] - b[0])[0]; if (o[2] === 'x') x = o[1]; else z = o[1]; }
    return [x, z];
  }
  // The mower's deck cuts a strip as wide as it is (CUT_W), square across the way it's pushed.
  const CUT_W = 0.92, ROW = 0.84, LEAD = 1.1;
  function cutStrip(x, z, yaw, L = O.lawn) {
    if (!L) return; const hw = CUT_W / 2, hl = 0.32, ca = Math.cos(yaw), sa = Math.sin(yaw), inside = (px, pz) => { const dx = px - x, dz = pz - z, along = dx * sa + dz * ca, across = dx * ca - dz * sa; return Math.abs(along) <= hl && Math.abs(across) <= hw; };
    const M = L.userData.map, R0 = hw + hl;
    if (M) { for (let px = Math.max(0, Math.floor((x - R0 - M.x0) * MAP_RES)); px <= Math.min(M.mw - 1, Math.ceil((x + R0 - M.x0) * MAP_RES)); px++) for (let pz = Math.max(0, Math.floor((z - R0 - M.z0) * MAP_RES)); pz <= Math.min(M.mh - 1, Math.ceil((z + R0 - M.z0) * MAP_RES)); pz++) if (inside(M.x0 + (px + 0.5) / MAP_RES, M.z0 + (pz + 0.5) / MAP_RES)) M.data[(pz * M.mw + px) * 4] = 255; M.tex.needsUpdate = true; }
    for (const m of L.userData.parts) { const { spots, byCell, cut } = m.userData; let ch = false; for (let i = Math.floor(x - R0); i <= Math.floor(x + R0); i++) for (let j = Math.floor(z - R0); j <= Math.floor(z + R0); j++) for (const n of byCell.get(key(i, j)) || []) if (!cut[n] && inside(spots[n][0], spots[n][1])) { cut[n] = 1; ch = true; } if (ch) m.geometry.attributes.aCut.needsUpdate = true; }
  }
  function cutAt(x, z, r = 0.42, L = O.lawn) {
    if (!L) return; lawnMap(0, x, z, r, r, 255, false, L);
    for (const m of L.userData.parts) {
      const { spots, byCell, cut } = m.userData; let ch = false;
      for (let i = Math.floor(x - r); i <= Math.floor(x + r); i++) for (let j = Math.floor(z - r); j <= Math.floor(z + r); j++) for (const n of byCell.get(key(i, j)) || []) if (!cut[n] && Math.hypot(spots[n][0] - x, spots[n][1] - z) < r) { cut[n] = 1; ch = true; }
      if (ch) m.geometry.attributes.aCut.needsUpdate = true;
    }
  }
  function lawnDone() { const h = lawnRec(); h.mowAt = Date.now(); save(); setTimeout(lawnHide, 300); if (O.lawn && O.lawn.userData.map) { const M = O.lawn.userData.map; for (let i = 0; i < M.data.length; i += 4) M.data[i] = 0; M.tex.needsUpdate = true; } if (O.lawn) { for (const m of O.lawn.userData.parts) { m.userData.cut.fill(0); m.geometry.attributes.aCut.needsUpdate = true; } O.lawn.userData.U.uGrow.value = CUT; } O.mowing = null; }
  // Mowing in straight rows parallel to the house's walls: along the front and the back, and up and down each side,
  // a little under the deck's width apart so each stripe overlaps the last. A row only goes where the whole deck fits
  // (on the lawn, inside the island, clear of the house and anything standing in the garden) with the fox behind it,
  // also on the lawn; what's left at the rim and round things is trimmed at the end (edgeTrim). Rows alternate way.
  const lawnCells = () => { const out = new Set(); for (const c of O.home.cells.values()) if (c.zone === 'out' && !c.deck) out.add(key(c.x, c.z)); return out; };
  function kidOK(x, z) { const B = O.home.bounds, c = O.home.cells.get(key(Math.floor(x), Math.floor(z))), P = IH.phys; return x > B.x0 + 0.25 && x < B.x1 - 0.25 && z > B.z0 + 0.25 && z < B.z1 - 0.25 && !!c && c.zone === 'out' && (!P || P.clearance(x, z, 'kid') >= P.BODY.kid.r * 0.95); }
  // the sides of the garden: [rows run along 'x' or 'z', across from..to, along from..to]
  function lawnSides() {
    const B = O.home.bounds, d = O.home.def;
    return [['x', d.d, B.z1, B.x0, B.x1], ['z', d.w, B.x1, 0, d.d], ['x', B.z0, 0, B.x0, B.x1], ['z', B.x0, 0, 0, d.d]]; // front, east, back, west: round the house
  }
  const at = (ax, c, u) => ax === 'x' ? [u, c] : [c, u];
  const yawOf = (ax, dir) => ax === 'x' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
  // the stretches of one row the mower can be pushed along going dir (+1/-1): mower positions [from, to]
  function rowRunsOf(ax, c, a, b, dir) {
    const runs = []; let s0 = null, last = null, y = yawOf(ax, dir);
    for (let u = a; u <= b + 1e-6; u += 0.1) {
      const [mx, mz] = at(ax, c, u), [kx, kz] = at(ax, c, u - dir * LEAD), ok = mowerFits(mx, mz, y) && kidOK(kx, kz);
      if (ok) { if (s0 == null) s0 = u; last = u; } else if (s0 != null) { runs.push([s0, last]); s0 = null; }
    }
    if (s0 != null) runs.push([s0, last]);
    return runs.filter(([p, q]) => q - p >= 0.4);
  }
  // every row's line on one side: evenly spaced across everywhere the deck fits
  function sideRows([ax, c0, c1, a, b]) {
    const fitsAt = c => { let n = 0, k = 0; for (let u = a; u <= b; u += 0.25) { const [x, z] = at(ax, c, u); n++; if (mowerFits(x, z, yawOf(ax, 1))) k++; } return k >= n * 0.5; }; // (along most of it: not just past the house's corner)
    let lo = null, hi = null; for (let c = c0; c <= c1; c += 0.05) if (fitsAt(c)) { if (lo == null) lo = c; hi = c; }
    if (lo == null) return [];
    const n = Math.max(1, Math.ceil((hi - lo) / ROW) + 1), out = []; for (let i = 0; i < n; i++) out.push(n === 1 ? (lo + hi) / 2 : lo + (hi - lo) * i / (n - 1));
    return out;
  }
  // rows -> the fox's walk: from row to row, nearest end first, each the other way from the last
  function walkRows(rows, from) {
    const pts = []; let here = from ? [from.x, from.z] : null;
    for (const side of rows) {
      if (!side.lines.length) continue;
      const [ax, , , a, b] = side.side, L = side.lines.slice(), d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (here && d2(here, at(ax, L[L.length - 1], (a + b) / 2)) < d2(here, at(ax, L[0], (a + b) / 2))) L.reverse();
      let dir = here && d2(here, at(ax, L[0], b)) < d2(here, at(ax, L[0], a)) ? -1 : 1;
      for (const c of L) {
        let runs = rowRunsOf(ax, c, a, b, dir).filter(r => !side.need || side.need(ax, c, r));
        if (dir < 0) runs = runs.reverse();
        for (const [p, q] of runs) { const m0 = dir > 0 ? p : q, m1 = dir > 0 ? q : p; const k0 = at(ax, c, m0 - dir * LEAD), k1 = at(ax, c, m1 - dir * LEAD); pts.push(new T.Vector3(k0[0], 0, k0[1]), new T.Vector3(k1[0], 0, k1[1])); here = k1; }
        if (runs.length) dir = -dir;
      }
    }
    return pts;
  }
  function lawnRoute(from, need) { return walkRows(lawnSides().map(sd => ({ side: sd, lines: sideRows(sd), need })), from); }
  const rowStep = q => ({ type: 'step', target: { pos: q }, pose: 'stand', dur: 0.01, reach: 0.22, noPause: true, straight: true, mowRow: true });
  // Toys on the lawn: the mowing stops, the mower's left standing, the toy's carried indoors and put down, then back
  // to the mower's handle and on with the row it was doing.
  function toysOnLawn() { return [...insts.values()].filter(o => o.doll && !o.doll.heldBy().some(w => w.toyCarry === o) && (c => c && c.zone === 'out')(O.home.cells.get(key(Math.floor(o.doll.p.body.x), Math.floor(o.doll.p.body.z))))); }
  function indoorSpot() { const d = O.home.def, P = IH.phys; for (const [x, z] of [[d.door.at + 0.5, d.d - 1.3], [d.door.at + 1.5, d.d - 1.3], [d.door.at - 0.5, d.d - 1.8], [d.w / 2, d.d / 2]]) { const q = P && P.nearestClear(x, z, 'pet'); const c = q && O.home.cells.get(key(Math.floor(q.x), Math.floor(q.z))); if (c && c.zone !== 'out') return new T.Vector3(q.x, 0, q.z); } return null; }
  // back to a mower left standing: behind its handle, else whichever side it can get to
  function backTo(inst, MW) {
    const mp = MW.group.position.clone(), my = MW.group.rotation.y, behind = new T.Vector3(mp.x - Math.sin(my) * LEAD, 0, mp.z - Math.cos(my) * LEAD);
    const grab = () => { inst.parked = null; MW.busy = true; inst.carrying = MW; if (IH.phys) IH.phys.forget(MW); inst.toyJob = false; };
    return { type: 'step', at: behind, target: { pos: mp }, reach: 0.2, pose: 'fetch', dur: 0.6, noPause: true, end: grab, orElse: { type: 'step', target: MW, how: 'reach', pose: 'fetch', dur: 0.6, noPause: true, end: grab } };
  }
  function toyAway(inst, toy, t) {
    const A = inst.petAi, MW = inst.carrying, spot = indoorSpot(); if (!MW || !spot) return;
    inst.toyJob = true; const resume = A.task && A.task.type === 'step' ? A.task : null; A.path = []; A.task = null; A.st = 'stand';
    const park = { type: 'step', here: true, pose: 'place', dur: 0.6, noPause: true, think: '🧸', end: () => { inst.carrying = null; inst.parked = MW; MW.busy = false; if (IH.phys) IH.phys.forget(MW); } };
    const fetch = { type: 'step', target: { pos: toy.doll.p.body }, reach: 0.5, pose: 'fetch', dur: 0.8, end: t2 => { toy.doll.let(); inst.toyCarry = toy; for (const o of insts.values()) if (o.petAi && o.petAi.doing && o.petAi.doing.o.play === toy) o.petAi.doing.until = 0; toy.restUntil = t2 + 90; } }; // (the pets let go of it, and leave it be for a while)
    const put = { type: 'step', target: { pos: spot }, reach: 0.55, pose: 'place', dur: 0.8, end: () => { const tc = inst.toyCarry; inst.toyCarry = null; if (!tc) return; tc.doll.let(inst); tc.rec.x = Math.floor(spot.x); tc.rec.z = Math.floor(spot.z); posInst(tc); save(); } };
    const back = backTo(inst, MW);
    A.plan = [fetch, put, back, ...(resume ? [resume] : []), ...A.plan];
    if (!go(inst, park, t)) nextStep(inst, t);
  }
  // Mowing: fetch the mower, push it up and down every row, put it back. who: the home's own character, or a visitor.
  function mowPlan(inst, MW, onDone) {
    const steps = [{ type: 'step', target: MW, pose: 'fetch', dur: 1.2, think: '🌱', end: () => { MW.busy = true; inst.carrying = MW; if (IH.phys) IH.phys.forget(MW); O.mowing = inst; } }];
    for (const p of lawnRoute(MW.group.position)) steps.push(rowStep(p));
    // The whole lawn gets done: before the mower goes away, any patch still long (a row it couldn't get along) is gone
    // back for, nearest first, round after round, till none is left. Only then is the job finished and it gets on
    // with its day. (A patch it can't get to at all, boxed in by furniture, is let go after a few rounds.)
    let rounds = 0;
    const putAway = { type: 'step', target: MW, how: 'home', pose: 'place', dur: 1.2, end: () => { stoolHome(inst); lawnDone(); if (onDone) onDone(); } };
    let fetches = 0, trimmed = false;
    const check = { type: 'step', here: true, pose: 'stand', dur: 0.01, noPause: true, end: () => {
      const A0 = inst.petAi;
      if (inst.carrying !== MW) { if (++fetches <= 3) A0.plan = [steps[0], ...steps.slice(1, -2), check, ...A0.plan]; else A0.plan = []; return; } // not got the mower (couldn't reach it): go and get it, or give up without pretending the lawn's done
      const L = O.lawn, B = L && L.userData.parts[0]; if (!B) return;
      if (!trimmed) { trimmed = true; edgeTrim(); } // the edges the deck can't reach (the island's rim, the house, things in the way): trimmed
      const left = []; B.userData.cut.forEach((c, i) => { if (!c) left.push(i); });
      if (!left.length) return;
      if (++rounds > 6) { for (const i of left) cutAt(B.userData.spots[i][0], B.userData.spots[i][1], 0.05); return; } // can't be reached: let go
      // what's left: the same row lines again, only the stretches that still have long grass along them
      const sp = left.map(i => B.userData.spots[i]);
      const need = (ax, c, [p, q]) => sp.some(([x, z]) => { const u = ax === 'x' ? x : z, v = ax === 'x' ? z : x; return Math.abs(v - c) <= CUT_W / 2 && u >= p - 0.35 && u <= q + 0.35; });
      const pts = lawnRoute(inst.petAi.pos, need);
      if (!pts.length) { for (const i of left) cutAt(B.userData.spots[i][0], B.userData.spots[i][1], 0.05); return; } // nowhere the mower can get to them: let go
      inst.petAi.plan = [...pts.map(rowStep), check, ...inst.petAi.plan];
    } };
    steps.push(check, putAway);
    return steps;
  }
  const up_ = i => { const A = i.petAi; if (i.toyCarry) { if (i.toyCarry.doll) i.toyCarry.doll.let(i); i.toyCarry = null; } i.toyJob = false; if (i.parked) { const m = i.parked; i.parked = null; m.busy = false; posInst(m); if (IH.phys) IH.phys.forget(m); if (O.mowing === i) O.mowing = null; } if (i.carrying) { stoolHome(i); if (O.mowing === i) O.mowing = null; } A.doing = null; A.task = null; A.plan = []; A.until = 0; if (A.use) leaveUse(i); else if (!A.free) A.path = []; };
  const mowerOut = () => [...insts.values()].find(x => x.def.t === 'mower' && !x.busy && x.rec.id !== '__vmower');

  // ---------- jobs between brothers and sisters (Employment on the phone). A kid without a mower can put the job up
  // and pay for it with their XP: a brother or sister who has a mower takes it, comes over and mows, and gets the XP.
  // Or a lawn service does it straight away for a set price. Kept on this device, like the homes themselves.
  const JOBS = { key: 'cc:home:jobs', all() { try { return JSON.parse(localStorage.getItem(this.key) || '[]'); } catch (e) { return []; } }, save(l) { try { localStorage.setItem(this.key, JSON.stringify(l.slice(-60))); } catch (e) { /* this visit only */ } } };
  const PAYS = [60, 100, 150], SERVICE = 200;
  const family = () => (O.opts.family ? O.opts.family() : O.opts.demo ? [{ id: 'demo-mika', name: 'Mika', avatar: '🐼', hue: '#ff9fae', mower: true }] : []).filter(k => k.id !== O.kid.id);
  const myJob = () => JOBS.all().find(j => j.from === O.kid.id && j.home === O.st.cur && j.kind === 'mow' && j.state !== 'done');
  function postJob(pay, service) {
    const w = wallet(); if (w.left < pay || myJob()) return;
    wSpend(pay, service ? 'a lawn mowing service' : 'a mowing job for a brother or sister', 'CHORECAST JOBS'); save(); const l = JOBS.all();
    l.push({ id: uid(), kind: 'mow', from: O.kid.id, fromName: O.kid.name || 'Your sibling', home: O.st.cur, pay, at: Date.now(), state: service ? 'taken' : 'open', by: service ? 'service' : null, byName: service ? 'Lawn helper' : null, byAvatar: service ? '🐶' : null });
    JOBS.save(l); sound('buy'); if (O.opts.track) O.opts.track('home.jobPost', { kind: 'mow', pay, service: !!service });
    toast(service ? 'The lawn helper is on the way.' : 'Your job is up. A brother or sister with a mower can take it.');
  }
  function cancelJob() { const l = JOBS.all(), j = l.find(x => x.from === O.kid.id && x.home === O.st.cur && x.state === 'open'); if (!j) return; j.state = 'done'; j.cancelled = 1; wGain(j.pay, 'mowing job taken down: pay back', 'CHORECAST JOBS'); save(); JOBS.save(l); toast(`Job taken down. ✨ ${j.pay} XP back.`); }
  function takeJob(id) {
    const l = JOBS.all(), j = l.find(x => x.id === id); if (!j || j.state !== 'open') return;
    if (!(O.st.owned.mower > 0)) { toast('You need a lawnmower for this job. There’s one in the Shop under Garden.'); sound('no'); return; }
    j.state = 'taken'; j.by = O.kid.id; j.byName = O.kid.name || 'Your sibling'; j.byAvatar = O.kid.avatar || '🐼'; JOBS.save(l); sound('buy');
    if (O.opts.track) O.opts.track('home.jobTake', { kind: j.kind, pay: j.pay, from: j.from });
    toast(`You’ve got the job. Next time ${j.fromName}’s home is open, you’ll be over to mow.`);
  }
  // The worker turns up: walks in from the gate with their own mower, mows, puts it back by the gate and goes home.
  function visitor(job) {
    if (!IH.chars || insts.has('__visit')) return;
    const sib = family().find(k => k.id === job.by) || {}, av = job.byAvatar || sib.avatar || '🐼';
    const d = O.home.def, gx = d.door.at + 1, gz = d.d + d.plot.b - 0.7;
    const inst = IH.chars.make(av, sib.hue || '#ff9fae'), def = { t: '__visit', name: job.byName, kind: 'pet', pet: 'kid', fp: [1, 1], where: 'any' };
    Object.assign(inst, { rec: { id: '__visit', t: '__visit', x: Math.floor(gx), z: Math.floor(gz), r: 2 }, def, glows: [], visitor: { job, step: 0 }, petAi: { st: 'stand', until: 0, path: [], pos: null, yaw: Math.PI, ph: 2.1, happy: 0 } });
    inst.group.userData.recId = '__visit'; O.S.itemsG.add(inst.group); insts.set('__visit', inst); posInst(inst);
    const mrec = { id: '__vmower', t: 'mower', x: Math.floor(gx) + 1, z: Math.floor(gz), r: 2 }; const mw = addInst(mrec); inst.visitor.mower = mw;
    bubble(inst, '👋'); toast(`${job.byName} is here to mow the lawn.`);
  }
  function visitorThink(inst, t) {
    const V = inst.visitor, A = inst.petAi;
    if (V.step === 0) { V.step = 1; const mp = mowPlan(inst, V.mower, () => { V.step = 2; jobDone(V.job); }); A.plan = mp.slice(1); if (!go(inst, mp[0], t)) nextStep(inst, t); return true; }
    if (V.step === 2) { V.step = 3; V.until = Date.now() + 25000; const d = O.home.def; A.plan = [{ type: 'step', target: { pos: new T.Vector3(d.door.at + 1, 0, d.d + d.plot.b - 1.2) }, pose: 'happy', dur: 1.2, reach: 0.6, end: () => { V.step = 4; } }]; bubble(inst, '👋'); return nextStep(inst, t); }
    if (V.step >= 3) { if (V.step === 4 || !A.plan.length) { dropInst('__vmower'); dropInst('__visit'); } return true; }
    return true;
  }
  function jobDone(job) {
    const l = JOBS.all(), j = l.find(x => x.id === job.id); if (j) { j.state = 'done'; j.doneAt = Date.now(); JOBS.save(l); }
    if (job.by && job.by !== 'service') { const ws = store.load(job.by); ws.jobPay = (ws.jobPay || 0) + job.pay; ws.jobsDone = (ws.jobsDone || 0) + 1; store.save(job.by, ws); }
    if (O.opts.track) O.opts.track('home.jobDone', { kind: job.kind, pay: job.pay, by: job.by });
    toast(`${job.byName} mowed the lawn. Looking sharp!`);
  }
  // every few seconds: grow the grass, tell the kid when it's long and they've no mower, bring the worker in
  function lawnTick(t) {
    if (!O.lawn || t < (O.lawnT || 0)) return; O.lawnT = t + 2;
    const g = lawnGrowth(); if (!O.mowing) O.lawn.userData.U.uGrow.value = CUT + g * 0.9; // (as in the app: short when mown, long after a few days)
    { const U = O.lawn.userData.U, k = clamp((U.uGrow.value - CUT) / (U.uLong.value - CUT), 0, 1); U.uTop.value = CUT * BLADE_H + k * (1.12 * U.uLong.value * BLADE_H - CUT * BLADE_H); } // (the shells span just the grass's height)
    const job = myJob();
    if (O.opts.demo && job && job.state === 'open' && Date.now() - job.at > 15000) { const l = JOBS.all(), j = l.find(x => x.id === job.id), m = family()[0]; if (j && m) { j.state = 'taken'; j.by = m.id; j.byName = m.name; j.byAvatar = m.avatar; JOBS.save(l); } }
    const vis = insts.get('__visit'); if (vis && vis.visitor.step >= 3 && (vis.visitor.step === 4 || Date.now() > vis.visitor.until)) { dropInst('__vmower'); dropInst('__visit'); } // off home through the gate
    const taken = myJob(); if (taken && taken.state === 'taken' && !insts.has('__visit') && !O.mowing) visitor(taken);
    if (g >= 1 && !O.mowing && ![...insts.values()].some(x => x.def.t === 'mower' && x.rec.id !== '__vmower') && !job && !O.toldLawn) { O.toldLawn = true; const k = insts.get(KID); if (k) bubble(k, '🌱'); toast(O.st.owned.mower > 0 ? 'The grass is getting long. Put your lawnmower out in the garden to mow it.' : 'The grass is getting long. Get a lawnmower from the Shop, or hire someone on your phone under Employment.'); }
  }

  // Safeguards against going into things. safeMove: a step from where a walker is to (x, z) that never crosses a wall
  // and never goes deeper into furniture (it slides along, or stays). guard: run after every beat, puts anyone who
  // somehow crossed a wall back where they were, and anyone standing inside something out to the nearest clear spot.
  function safeMove(inst, x, z) {
    const P = IH.phys, A = inst.petAi; if (!P || !P.grid()) return { x, z };
    const cls = clsOf(inst), R = P.BODY[cls].r, c0 = P.clearance(A.pos.x, A.pos.z, cls), ok = (qx, qz) => P.wallFree(A.pos, { x: qx, z: qz }) && (P.clearance(qx, qz, cls) >= R * 0.97 || P.clearance(qx, qz, cls) > c0 + 0.004);
    if (ok(x, z)) return { x, z }; if (ok(x, A.pos.z)) return { x, z: A.pos.z }; if (ok(A.pos.x, z)) return { x: A.pos.x, z }; return { x: A.pos.x, z: A.pos.z };
  }
  function guard(inst) {
    const P = IH.phys, A = inst.petAi; if (!A) return; if (!P || !A.pos || !P.grid() || A.carried || A.use || A.free) { A.safe = null; return; } // (not watching: it forgets, so it never compares with a spot from before)
    const onFloor = Math.abs(A.pos.y - P.floorAt(A.pos.x, A.pos.z)) < 0.12; if (!onFloor) { A.safe = null; return; } // (up on a bed, a seat or a table: that's its own business)
    if (A.safe && Math.hypot(A.safe.x - A.pos.x, A.safe.z - A.pos.z) < 0.6 && !P.wallFree(A.safe, A.pos)) { A.pos.x = A.safe.x; A.pos.z = A.safe.z; inst.group.position.copy(A.pos); return; } // a step through a wall: back it comes (its route stays; it goes round)
    const cls = clsOf(inst), R = P.BODY[cls].r;
    if (P.clearance(A.pos.x, A.pos.z, cls) < R * 0.45) { const q = P.nearestClear(A.pos.x, A.pos.z, cls); if (q && P.wallFree(A.pos, q)) { A.pos.x = q.x; A.pos.z = q.z; inst.group.position.copy(A.pos); } } // inside something: out to the nearest room
    A.safe = { x: A.pos.x, z: A.pos.z };
  }

  // A target on the ground under a character or pet that's been lifted up: where it'll land when let go (the
  // floor, or the top of whatever it's held over), pulsing gently.
  function dropTarget(t) {
    const c = [...insts.values()].find(o => o.petAi && o.petAi.carried && o.petAi.pos);
    if (!O.dropT) {
      const g = new T.Group(), mat = c0 => new T.MeshBasicMaterial({ color: c0, transparent: true, opacity: 0.9, depthWrite: false, fog: false, toneMapped: false });
      const ring = new T.Mesh(new T.RingGeometry(0.3, 0.38, 40), mat('#ffffff')), ring2 = new T.Mesh(new T.RingGeometry(0.38, 0.42, 40), mat('#ff8fae')), dot = new T.Mesh(new T.CircleGeometry(0.07, 20), mat('#ff8fae'));
      for (const m of [ring, ring2, dot]) { m.rotation.x = -Math.PI / 2; m.layers.set(1); m.renderOrder = 6; g.add(m); }
      for (let i = 0; i < 4; i++) { const tick = new T.Mesh(new T.PlaneGeometry(0.05, 0.14), mat('#ffffff')); tick.rotation.x = -Math.PI / 2; tick.rotation.z = i * Math.PI / 2; tick.position.set(Math.sin(i * Math.PI / 2) * 0.2, 0.001, Math.cos(i * Math.PI / 2) * 0.2); tick.layers.set(1); tick.renderOrder = 6; g.add(tick); }
      g.visible = false; O.S.scene.add(g); O.dropT = g;
    }
    const g = O.dropT; if (!c) { g.visible = false; return; }
    const A = c.petAi, o = A.carryOcc || occ(c.rec.id), y = groundAt(A.pos.x, A.pos.z, o);
    g.visible = true; g.position.set(A.pos.x, y + 0.03, A.pos.z); g.rotation.y = t * 0.8; g.scale.setScalar((c.pet === 'kid' ? 1 : 0.75) * (1 + Math.sin(t * 5) * 0.06));
  }

  // ---------- renovating
  // The home as this kid has done it up: each room's floor and wall covering, the front door, and the windows
  // where they've hung them (window items; the first time a home opens, its built-in windows and curtains become
  // window and curtain items the kid owns, so they can be moved, swapped or taken out).
  const hrec = (st = O.st, id = st.cur) => (st.homes[id] = st.homes[id] || { items: [] });
  // where a home is: inner-city Tokyo or the Japanese countryside (each home has its own; settings.js)
  const settingOf = (st, id) => { const ok = v => IH.settings && IH.settings.KINDS.some(([k]) => k === v), saved = st.look && st.look.setting && st.look.setting[id]; return ok(saved) ? saved : (IH.settings && IH.settings.DEFAULT[id]) || null; }; // (a saved choice that's no longer offered falls back to the home's own)
  function homeCfg(st = O.st, id = st.cur) {
    const base = HB[id], h = hrec(st, id), rn = h.reno || {};
    const rooms = base.rooms.map((r, i) => {
      const x = (rn.rooms && rn.rooms[i]) || {}, o = { ...r };
      if (x.floor && BY[x.floor.t]) { const d = BY[x.floor.t]; o.floor = d.look; o.floorCol = x.floor.c; if (d.look === 'carpet') o.carpet = x.floor.c; if (x.floor.f) o.floorPat = (FINISHES.find(f => f.id === x.floor.f) || {}).pat; }
      if (x.wall && BY[x.wall.t]) { o.wall = x.wall.c; o.wallPat = BY[x.wall.t].pat; }
      return o;
    });
    const cfg = { ...base, rooms, setting: settingOf(st, id) };
    if (h.winv) cfg.openings = h.items.filter(it => BY[it.t] && BY[it.t].opening && it.side).map(it => { const d = BY[it.t]; const cv = h.items.find(x => x.on === it.id && BY[x.t] && BY[x.t].cover); return { side: it.side, u0: it.u + 0.05, u1: it.u + d.fp[0] - 0.05, y0: FY + d.wy, y1: FY + d.wy + d.h, kind: 'window', item: true, rid: it.id, cover: cv ? BY[cv.t].coverStyle : null }; }); // (what hangs on it shapes the sunlight)
    if (rn.door && BY[rn.door.t]) cfg.doorStyle = { t: BY[rn.door.t].look, c: rn.door.c, pat: rn.door.f === 'wood' ? 1 : 0 };
    return cfg;
  }
  function windowsToItems() {
    const st = O.st, h = hrec(); if (h.winv) return; const def = HB[st.cur];
    for (const w of IH.homes.autoWindows(def)) {
      const t = w.w >= 3 ? 'win_wide' : 'win_classic', id = uid();
      h.items.push({ id, t, side: w.side, u: w.u }); st.owned[t] = (st.owned[t] || 0) + 1;
      h.items.push({ id: uid(), t: 'cur_gathered', on: id, fin: { c: def.curtain || '#e88aa8' } }); st.owned.cur_gathered = (st.owned.cur_gathered || 0) + 1;
    }
    h.winv = 1; save();
  }
  // Inside walls with something hung on them stand up (from the side it's on), so it shows.
  function wallsUp() { const s = new Set(); for (const it of items()) if (it.side && it.side[0] === 'i' && BY[it.t] && BY[it.t].kind === 'wall') s.add(it.side); if (O.held && O.held.rec.side && O.held.rec.side[0] === 'i') s.add(O.held.rec.side); O.home.innerUp = s; }
  // After a window moves, or a floor, wall or door changes: build the house again around everything in it.
  function rebuildHouse() {
    const old = O.home, dr = old.door; O.S.scene.remove(old.root); old.root.traverse(m => { if (m.isMesh && !m.userData.special) m.geometry.dispose(); });
    O.home = buildHome(homeCfg()); O.S.scene.add(O.home.root); if (dr && O.home.door) { O.home.door.a = dr.a; O.home.door.v = dr.v; }
    wallsUp(); O.home.setYaw(CAM.yaw); setPhase(O.st.look.phase); refreshAll(); force = true;
  }
  // ---------- the neighbours' flats either side and behind (a flat's home only): each built just like this home
  // (its walls, floors and trim the same, so the walls between meet as one), cut away on every side to look into, with
  // its own things in it, and a label over it so it's clear it's the neighbours', not this home.
  const NEIGH = [['bed', 0, 0, 0], ['nightstand', 3, 0, 0], ['desklamp', 3, 0, 0], ['rug_round', 3, 2, 0], ['desk', 5, 0, 0], ['deskchair', 6, 2, 2], ['monstera', 4, 2, 0], ['bookcase', 0, 5, 1], ['floorlamp', 7, 3, 0], ['teddy', 1, 4, 0], ['kitchen', 8, 0, 0], ['fridge', 8, 2, 0], ['stool', 11, 0, 0], ['toilet', 8, 4, 0], ['shower', 9, 4, 0], ['basin', 8, 6, 1]];
  function neighbourLabel() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.beginPath(); x.roundRect ? x.roundRect(8, 16, 496, 96, 48) : x.rect(8, 16, 496, 96); x.fill();
    x.fillStyle = '#5b4a5e'; x.font = '700 50px Nunito, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🏠 Neighbour’s place', 256, 66);
    const t = new T.CanvasTexture(c), sp = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(6.4, 1.6, 1); sp.renderOrder = 20; sp.layers.set(1); return sp;
  }
  function buildNeighbours() {
    for (const n of O.neigh || []) { O.S.scene.remove(n.root); n.root.traverse(m => { if (m.isMesh && m.geometry) m.geometry.dispose(); }); } O.neigh = [];
    const S = O.home.setting; if (!S || !S.neighbours || !S.neighbours.length) return;
    const base = HB[O.st.cur];
    S.neighbours.forEach((u, i) => {
      const nh = buildHome({ ...base, setting: 'none' }); nh.cutAll();
      nh.root.position.set(u.x, 0, u.z); nh.root.rotation.y = u.ry;
      const Rn = (s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; })(7 + i * 97), col = () => SWATCHES[Math.floor(Rn() * SWATCHES.length)];
      for (const [t, x, z, r] of NEIGH) {
        const d = BY[t]; if (!d || (Rn() < 0.12 && !/^(bed|kitchen|fridge|toilet|basin|shower)$/.test(t))) continue; // (each flat a little different)
        const rec = { id: 'nb' + i + t, t, x, z, r, fin: d.pet || d.opening ? undefined : { c: col(), f: 'plain' } };
        let inst; try { inst = make(d, rec); } catch (e) { continue; }
        const p = placeOf(d, rec, '__none'), host = d.kind === 'small' && NEIGH.find(h => h[0] !== t && h[1] === x && h[2] === z && BY[h[0]] && BY[h[0]].surf);
        const c0 = O.home.cells.get(key(x, z)), y = host ? (c0 ? c0.y : FY) + BY[host[0]].surf : p.y;
        inst.group.position.set(p.x, y, p.z); inst.group.rotation.y = p.ry; inst.group.traverse(m => { if (m.isMesh) m.userData.bg = true; });
        nh.root.add(inst.group);
      }
      const lab = neighbourLabel(); lab.position.set(base.w / 2, 6.2, base.d / 2); nh.root.add(lab);
      O.S.scene.add(nh.root); O.neigh.push(nh);
    });
  }
  function loadHome() {
    for (const id of [...insts.keys()]) dropInst(id);
    if (O.home) { O.S.scene.remove(O.home.root); O.home.root.traverse(m => { if (m.isMesh) { m.geometry.dispose(); } }); }
    if (O.life) for (const x of [...O.life.dust, ...O.life.bowls, ...O.life.plates, ...O.life.towels]) O.S.scene.remove(x.mesh); O.life = null;
    windowsToItems();
    O.home = buildHome(homeCfg()); O.S.scene.add(O.home.root);
    buildNeighbours();
    const d = O.home.def; CAM.target.set(d.w / 2, FY + 1, d.d / 2 + 0.5); LK.PAL.uHouse.value.set(-0.4, -0.4, d.w + 0.4, d.d + 0.4);
    // anything set down where there's no longer any ground (a garden thing, now the home's a flat with a balcony) goes back to Mine
    { const L = items(), gone = L.filter(it => it.x != null && BY[it.t] && BY[it.t].kind !== 'wall' && !cellsOf(BY[it.t], it.x, it.z, it.r || 0).every(([x, z]) => O.home.cells.has(key(x, z))));
      for (const it of gone) { L.splice(L.indexOf(it), 1); if (BY[it.t].kind !== 'pet') toBox(it); }
      if (gone.length) { save(); setTimeout(() => toast(`${gone.length === 1 ? 'One thing' : gone.length + ' things'} from outside went back to Mine (there's no garden here).`), 1800); } }
    furnish();
    for (const rec of items()) addInst(rec);
    wallsUp();
    if (O.lawn) { O.S.scene.remove(O.lawn); O.lawn.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); } O.lawn = makeLawn(); if (O.lawn) O.S.scene.add(O.lawn); O.toldLawn = false; O.mowing = null; O.lawnT = 0;
    addKid();
    // bodies against furniture (phys.js): every placed thing but rugs, the floor of each cell and the walls
    if (IH.phys) IH.phys.env = {
      bounds: () => O.home.bounds,
      things: () => [...insts.values()].filter(o => !o.petAi && o.def.kind !== 'rug' && !o.busy && (!O.held || o !== O.held.inst)),
      floorAt: (x, z) => { const c = O.home.cells.get(key(Math.floor(x), Math.floor(z))); return c ? c.y : -5; },
      wallAt: (x, z) => {
        const X = Math.round(x), Z = Math.round(z);
        if (Math.abs(x - X) < 0.12 && O.home.walls.has('v' + key(X, Math.floor(z)))) return FY + H;
        if (Math.abs(z - Z) < 0.12 && O.home.walls.has('h' + key(Math.floor(x), Z))) return FY + H;
        return 0;
      }
    };
    lawnHide(); // (now the collision map is there to measure from)
    fit(); lightFor(O.st.look.phase); setPhase(O.st.look.phase, true);
  }

  // ---------- look (prototype controls)
  // sunbeams warm at sunset
  function tintBeams(ph) { for (const sd of Object.values(O.home.sides)) if (sd.beams) sd.beams.traverse(m => { if (m.material && m.material.uniforms && m.material.uniforms.uC) m.material.uniforms.uC.value.set(ph === 'dusk' ? '#ffb070' : '#fff4d8'); }); }
  function setPhase(ph) {
    const P = LK.setPhase(ph); pipe.phase(P);
    LK.BEAM_U.uK.value = ph === 'night' ? 0 : ph === 'dusk' ? 1.25 : 1;
    tintBeams(ph); if (O.lawn) lawnColours(O.lawn.userData.U, ph);
    if (O.home && O.home.setting) { O.home.setting.lit.visible = ph !== 'day'; O.home.setting.phase(ph); } // the neighbours' windows and the street lamps, after dark; the painted blocks dimmer at night
    lightFor(ph);
  }
  function applyLook() {
    const L = O.st.look; LK.PAL.uPlain.value = L.plain ? 1 : 0; pipe.ink = !!L.ink && !L.plain; pipe.film = L.film !== 0; beat.mode = L.frames; setPhase(L.phase);
  }

  // ---------- the beat (frame stepping) and what moves on it
  const beat = LK.Beat();
  let raf = 0, lastT = null, force = false, sceneT = null;
  function loop(now) {
    raf = 0; if (!O || O.paused || O.away) return; raf = requestAnimationFrame(loop); // (away in the village: the home doesn't draw)
    // Effects, menus, the camera and the thing being dragged run every display frame; the scene itself (pets,
    // placed things and their moving parts) only moves on the anime beat (12 a second on twos).
    const tt = now / 1000, dt = lastT == null ? 0 : clamp(tt - lastT, 0, 0.25); lastT = tt;
    const b = beat.beat(now); let sb = null;
    if (b !== null || force) { const bt = b === null ? tt : b; sb = { t: bt, dt: sceneT == null ? 0 : clamp(bt - sceneT, 0, 0.25) }; sceneT = bt; }
    force = false;
    const p0 = performance.now(); step(tt, dt, sb); const pa = performance.now(); aim(); (O.prof3 = O.prof3 || {}).aim = (O.prof3.aim || 0) + (performance.now() - pa - (O.prof3.aim || 0)) * 0.1; const p1 = performance.now(); pipe.render(O.S.scene, O.S.cam); const p2 = performance.now();
    const PR = O.prof || (O.prof = { step: 0, render: 0 }); PR.step += (p1 - p0 - PR.step) * 0.1; PR.render += (p2 - p1 - PR.render) * 0.1; // (a running average, for checking speed)
    O.frames = (O.frames || 0) + 1;
  }
  const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  // The neighbour in the flat below (a flat's home only): potters about their room, now and then steps out onto
  // their balcony to look at the view or water the plants, and waves up if this home's character is out on theirs.
  function neighbour(t, dt) {
    const B = O.home && O.home.setting && O.home.setting.below;
    if (!B || !IH.chars) { if (O.nb) { O.S.scene.remove(O.nb.inst.group); O.nb = null; } return; }
    if (!O.nb || O.nb.home !== O.home) {
      if (O.nb) O.S.scene.remove(O.nb.inst.group);
      const inst = IH.chars.make('🐰', '#9be38f'); inst.group.traverse(m => { if (m.isMesh) m.castShadow = false; });
      O.S.scene.add(inst.group); const r = B.room;
      O.nb = { inst, home: O.home, pos: new T.Vector3((r[0] + r[2]) / 2, B.y, (r[1] + r[3]) / 2), yaw: 0, path: [], until: t + 3, st: 'stand', out: false };
    }
    const N = O.nb, rnd = (a, b) => a + Math.random() * (b - a), inRoom = () => new T.Vector3(rnd(B.room[0], B.room[2]), B.y, rnd(B.room[1], B.room[3])), onBalc = () => new T.Vector3(rnd(B.balc[0], B.balc[2]), B.balcY != null ? B.balcY : B.y, rnd(B.balc[1], B.balc[3])), door = (dz) => new T.Vector3(B.door[0], dz > 0 && B.balcY != null ? B.balcY : B.y, B.door[1] + dz);
    if (!N.path.length && t > N.until) { // what next: wander the room, or out onto the balcony a while (and back in)
      if (!N.out && Math.random() < 0.35) { N.path = [door(-0.8), door(0.9), onBalc()]; N.out = true; }
      else if (N.out) { N.path = [door(0.9), door(-0.8), inRoom()]; N.out = false; }
      else N.path = [inRoom()];
    }
    const k = insts.get(KID), kidOut = k && k.petAi && k.petAi.pos && k.petAi.pos.z > O.home.def.d + 0.3;
    if (N.path.length) {
      const p = N.path[0], dx = p.x - N.pos.x, dz = p.z - N.pos.z, d = Math.hypot(dx, dz), sp = 1.5 * dt;
      N.pos.y += (p.y - N.pos.y) * Math.min(1, dt * 10); // (the step down onto the balcony)
      if (d < 0.05) { N.path.shift(); if (!N.path.length) { N.until = t + rnd(N.out ? 6 : 4, N.out ? 14 : 12); N.st = N.out && kidOut ? 'happy' : 'stand'; } }
      else { N.pos.x += dx / d * Math.min(sp, d); N.pos.z += dz / d * Math.min(sp, d); const want = Math.atan2(dx, dz); N.yaw += Math.atan2(Math.sin(want - N.yaw), Math.cos(want - N.yaw)) * Math.min(1, dt * 8); N.st = 'walk'; }
    } else if (N.out) { N.st = kidOut ? 'happy' : 'look'; const want = kidOut ? Math.atan2(k.petAi.pos.x - N.pos.x, k.petAi.pos.z - N.pos.z) : 0; N.yaw += Math.atan2(Math.sin(want - N.yaw), Math.cos(want - N.yaw)) * Math.min(1, dt * 4); }
    N.inst.group.position.copy(N.pos); N.inst.group.rotation.y = N.yaw;
    try { IH.chars.pose(N.inst, N.st, t, 1.3); } catch (e) { /* (a pose this character hasn't got) */ }
  }
  // ---------- villagers on the street round an island home: the same characters, walk and foot placement as the
  // home's own character, going about their day. Two lanes round the island (the inner one walked clockwise, the outer
  // one the other way, so nobody meets head on); now and then one goes over to a shop door or a vending machine, has a
  // look, and comes back to its lane. Nobody walks into anybody: each slows behind whoever's ahead in its lane, and
  // waits for a gap before crossing one.
  const NPC_AVATARS = ['🐰', '🐱', '🐶', '🐼', '🐨', '🦉', '🐵', '🐯', '🐧', '🦁', '🐸'], NPC_HUES = ['#ff9fb7', '#7cc8e8', '#ffd35a', '#9be38f', '#b59cff', '#ffb36b', '#e86f6f', '#5fbf8a'];
  function villagers(t, dt) {
    const S = O.home && O.home.setting, RG = S && S.ring;
    if (!RG || !IH.chars) { if (O.npc) { for (const n of O.npc) O.S.scene.remove(n.inst.group); O.npc = null; } return; }
    if (!O.npc || O.npc.home !== O.home) {
      if (O.npc) for (const n of O.npc) O.S.scene.remove(n.inst.group);
      O.npc = []; O.npc.home = O.home;
      for (let i = 0; i < 7; i++) {
        const inst = IH.chars.make(NPC_AVATARS[(i * 5 + 3) % NPC_AVATARS.length], NPC_HUES[i % NPC_HUES.length]); O.S.scene.add(inst.group);
        const lane = i % 2, n = { inst, lane, dir: lane ? -1 : 1, s: (i / 7) * 4, sp: 1.15 + (i % 3) * 0.15, pos: new T.Vector3(), yaw: 0, st: 'walk', until: 0, errand: null, ph: i * 1.7 };
        O.npc.push(n);
      }
    }
    // a lane: the rectangle round the garden at its distance out; s runs 0..4 round its four sides
    const off = l => l ? 3.4 : 1.6, laneAt = (l, s) => { const x0 = RG.x0 - off(l), x1 = RG.x1 + off(l), z0 = RG.z0 - off(l), z1 = RG.z1 + off(l), k = ((s % 4) + 4) % 4, side = Math.floor(k), f = k - side;
      return side === 0 ? [x0 + (x1 - x0) * f, z0] : side === 1 ? [x1, z0 + (z1 - z0) * f] : side === 2 ? [x1 - (x1 - x0) * f, z1] : [x0, z1 - (z1 - z0) * f]; };
    const sideLen = (l, side) => side % 2 === 0 ? RG.x1 - RG.x0 + 2 * off(l) : RG.z1 - RG.z0 + 2 * off(l);
    const nearest = (l, x, z) => { let best = 0, bd = 1e9; for (let s = 0; s < 4; s += 0.02) { const [px, pz] = laneAt(l, s), d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = s; } } return best; };
    const turn = (n, want) => { n.yaw += Math.atan2(Math.sin(want - n.yaw), Math.cos(want - n.yaw)) * Math.min(1, dt * 7); };
    for (const n of O.npc) {
      const others = O.npc.filter(m => m !== n);
      let moved = 0;
      if (n.errand) { // off to a door and back
        const E = n.errand, tg = E.back ? E.ret : E.at, dx = tg[0] - n.pos.x, dz = tg[1] - n.pos.z, d = Math.hypot(dx, dz);
        if (E.wait) { n.st = 'look'; turn(n, E.yaw); if (t > E.wait) { E.wait = 0; E.back = true; } }
        else if (d < 0.08) { if (!E.back) { E.wait = t + 3 + Math.random() * 4; } else { n.errand = null; n.s = nearest(n.lane, n.pos.x, n.pos.z); } }
        else {
          const blocked = others.some(m => Math.hypot(m.pos.x - n.pos.x - dx / d * 0.7, m.pos.z - n.pos.z - dz / d * 0.7) < 0.75); // (someone in the way: wait for the gap)
          if (blocked) n.st = 'stand'; else { const sp = Math.min(d, n.sp * 0.9 * dt); n.pos.x += dx / d * sp; n.pos.z += dz / d * sp; moved = sp; turn(n, Math.atan2(dx, dz)); n.st = 'walk'; }
        }
      } else {
        // along the lane, slowing behind whoever's just ahead in it
        const side = Math.floor(((n.s % 4) + 4) % 4), L = sideLen(n.lane, side), [px, pz] = laneAt(n.lane, n.s), [ax, az] = laneAt(n.lane, n.s + n.dir * 0.5 / L);
        const fx = ax - px, fz = az - pz, fl = Math.hypot(fx, fz) || 1;
        const ahead = others.some(m => { const rx = m.pos.x - n.pos.x, rz = m.pos.z - n.pos.z, along = (rx * fx + rz * fz) / fl; return along > 0 && along < 1.1 && Math.abs(rx * fz - rz * fx) / fl < 0.55; });
        const sp = ahead ? 0 : n.sp * dt;
        if (sp) { n.s += n.dir * sp / L; moved = sp; }
        const [qx, qz] = laneAt(n.lane, n.s); if (!n.placed) { n.pos.set(qx, 0, qz); n.placed = true; } else { moved = Math.hypot(qx - n.pos.x, qz - n.pos.z); n.pos.x = qx; n.pos.z = qz; }
        turn(n, Math.atan2(fx, fz)); n.st = moved > 1e-4 ? 'walk' : 'stand';
        // now and then: over to a door just along from here (on the side being walked), if one's close
        if (t > (n.until || 0) && S.stops && S.stops.length) {
          n.until = t + 4 + Math.random() * 6;
          const near = S.stops.filter(q => Math.hypot(q.x - n.pos.x, q.z - n.pos.z) < 7);
          if (near.length && Math.random() < 0.4) { const q = near[Math.floor(Math.random() * near.length)]; n.errand = { at: [q.x + (Math.random() - 0.5) * 2, q.z + (Math.random() - 0.5) * 0.6], ret: [n.pos.x, n.pos.z], yaw: q.yaw }; }
        }
      }
      n.inst.walkD = (n.inst.walkD || 0) + moved; // (the feet step in time with the ground covered, as the home's character's do)
      n.inst.group.position.copy(n.pos); n.inst.group.rotation.y = n.yaw;
      try { IH.chars.pose(n.inst, n.st, t, n.ph); } catch (e) { /* (still loading) */ }
    }
  }
  // ---------- people walking past along the pavement in front of the island: they fade in at one end, walk past the
  // home (the same characters, walk and foot placement as the home's own character), and fade out at the other end.
  // Walking left to right on the near side of the pavement, right to left on the far side; a little slower behind
  // anyone ahead, and nobody starts out until there's room.
  function fadeTo(inst, a) {
    inst.group.traverse(m => {
      if (!m.isMesh || !m.material) return;
      if (!m.userData.fadeMat) { const c = m.material.clone(); if (m.material.uniforms) { c.uniforms = Object.assign({}, m.material.uniforms, { uOpacity: { value: 1 } }); } c.transparent = true; m.material = c; m.userData.fadeMat = true; }
      if (m.material.uniforms && m.material.uniforms.uOpacity) m.material.uniforms.uOpacity.value = a; else m.material.opacity = a;
      m.userData.bg = a < 0.99; // (no ink line round someone half there)
    });
  }
  function passersBy(t, dt) {
    const S = O.home && O.home.setting, SW = S && S.sidewalk;
    if (!SW || !IH.chars) { if (O.walk) { for (const n of O.walk) O.S.scene.remove(n.inst.group); O.walk = null; } return; }
    if (!O.walk || O.walk.home !== O.home) { if (O.walk) for (const n of O.walk) O.S.scene.remove(n.inst.group); O.walk = []; O.walk.home = O.home; O.walk.next = t + 1; }
    const W = O.walk, laneZ = d => d > 0 ? SW.z0 + 2.0 : SW.z0 + 4.0, FADE = 1.6, a = SW.x0 + 0.4, b = SW.x1 - 0.4;
    // someone new, now and then, at whichever end has room
    if (t > W.next && W.length < 6) {
      const d = Math.random() < 0.5 ? 1 : -1, x = d > 0 ? a : b, z = laneZ(d);
      if (!W.some(n => n.dir === d && Math.abs(n.pos.x - x) < 1.8)) {
        const inst = IH.chars.make(NPC_AVATARS[Math.floor(Math.random() * NPC_AVATARS.length)], NPC_HUES[Math.floor(Math.random() * NPC_HUES.length)]);
        O.S.scene.add(inst.group); const n = { inst, dir: d, pos: new T.Vector3(x, 0, z + (Math.random() - 0.5) * 0.4), sp: 1.0 + Math.random() * 0.5, ph: Math.random() * 6, yaw: d > 0 ? Math.PI / 2 : -Math.PI / 2 };
        fadeTo(inst, 0); W.push(n);
      }
      W.next = t + 2.5 + Math.random() * 5;
    }
    for (let i = W.length - 1; i >= 0; i--) {
      const n = W[i], ahead = W.some(m => m !== n && m.dir === n.dir && (m.pos.x - n.pos.x) * n.dir > 0 && (m.pos.x - n.pos.x) * n.dir < 1.2);
      const sp = (ahead ? 0.25 : 1) * n.sp * dt; n.pos.x += n.dir * sp; n.inst.walkD = (n.inst.walkD || 0) + sp;
      const fromStart = (n.pos.x - (n.dir > 0 ? a : b)) * n.dir, toEnd = ((n.dir > 0 ? b : a) - n.pos.x) * n.dir, al = Math.max(0, Math.min(1, fromStart / FADE, toEnd / FADE));
      fadeTo(n.inst, al);
      n.inst.group.position.copy(n.pos); n.inst.group.rotation.y = n.yaw;
      try { IH.chars.pose(n.inst, 'walk', t, n.ph); } catch (e) { /* (still loading) */ }
      if (toEnd <= 0) { O.S.scene.remove(n.inst.group); W.splice(i, 1); } // (gone, past the end)
    }
  }
  function step(t, dt, sb) {
    neighbour(t, dt); villagers(t, dt); passersBy(t, dt); if (O.home && O.home.gate) O.home.gate.tick(dt);
    // turning the view a quarter, and the fly-in when the home opens
    if (CAM.turn) { const p = clamp((t - CAM.turn.t0) / 0.6, 0, 1); CAM.yaw = CAM.turn.a + (CAM.turn.b - CAM.turn.a) * ease(p); lightFor(O.st.look.phase); if (p >= 1) { CAM.turn = null; fit(); } }
    if (CAM.intro) { const p = clamp((t - CAM.intro.t0) / 1.3, 0, 1); CAM.zoom = CAM.intro.a + (CAM.intro.b - CAM.intro.a) * ease(p); CAM.yaw = Math.PI / 4 + CAM.view * Math.PI / 2 - 0.5 * (1 - ease(p)); if (p >= 1) CAM.intro = null; if (CAM.intro) lightFor(O.st.look.phase); }
    const z0 = performance.now(); wallsUp(); O.home.setYaw(CAM.yaw); const z1 = performance.now();
    for (const inst of insts.values()) if (inst.def.kind === 'wall') { const S = O.home.sides[sideOf(inst.rec)]; inst.group.visible = (!!S && !S.front) || !!(O.held && O.held.inst === inst); }
    LK.WATER_U.uT.value = t; pipe.u.uT.value = t;
    if (O.home.setting) { O.home.setting.view(CAM.yaw, CAM.pitch); O.home.setting.tick(t); } // (the neighbours on the camera's side cut away; the train going by)
    const z2 = performance.now(); if (O.lawn) { const U = O.lawn.userData.U; U.uTime.value = t; if (U.uDens) U.uDens.value = clamp(22 * CAM.zoom, 22, 60); lawnTick(t); } // (finer blades as you zoom in)
    if (IH.yami) for (const inst of insts.values()) if (inst.sprite) IH.yami.face(inst, O.S.cam, CAM.yaw, LK.PAL.uLit.value);
    const z3 = performance.now(); const P = LK.PHASES[O.st.look.phase], dark = P.lamps;
    // lamps: glow, halos and up to four real lights. Lamp light is always warm (a lamp's own colour leaned well
    // toward amber) and soft, so a room at night glows rather than shines.

    const on = [];
    for (const inst of insts.values()) {
      const lamp = inst.def.act === 'lamp', lit = lamp ? inst.rec.on !== false : true;
      for (const m of inst.glows) m.uniforms.uGlow.value = lamp ? (lit ? (inst.def.t === 'fairy' ? (0.55 + 0.45 * ((Math.floor(t * 12) + inst.rec.id.charCodeAt(0)) % 3 === 0)) : 0.3) + dark * 0.6 : 0) : 0.4 + dark * 0.5;
      if (inst.halo) { inst.halo.visible = lit && dark > 0 && inst.group.visible; inst.halo.quaternion.copy(O.S.cam.quaternion); inst.halo.material.uniforms.uOn.value = 1; }
      if (lamp && lit && inst.def.light && inst.group.visible) on.push(inst);
    }
    LK.HALO_U.uK.value = dark;
    on.sort((a, b) => a.group.position.distanceTo(CAM.target) - b.group.position.distanceTo(CAM.target));
    O.S.lamps.forEach((l, i) => { const inst = on[i]; if (inst && dark > 0) { const v = new T.Vector3(...inst.def.light); inst.group.localToWorld(v); l.position.copy(v); l.intensity = 0.5 * dark; l.color.copy(warm(inst.def.glowCol)); const c = O.home.cells.get(key(Math.floor(v.x), Math.floor(v.z))); LK.PAL.uLampIn.value[i] = inst.def.kind === 'wall' || (c && c.zone === 'in') ? 1 : 0; } else l.intensity = 0; });
    // little moving parts
    const now = new Date();
    const q0 = performance.now(); (O.prof3 = O.prof3 || {}); for (const [k, v] of [['walls', z1 - z0], ['lawn', z3 - z2], ['lamps', q0 - z3], ['top', z0 - (O.stepT0 || z0)]]) O.prof3[k] = (O.prof3[k] || 0) + (v - (O.prof3[k] || 0)) * 0.1; if (sb) lifeTick(sb.t, sb.dt); const PF = O.prof2 || (O.prof2 = {}); const tick = (k, v) => { PF[k] = (PF[k] || 0) + (v - (PF[k] || 0)) * 0.1; }; tick('life', performance.now() - q0);
    if (sb && O.home.door) swingDoor(O.home.door, sb.dt);
    if (sb) for (const inst of insts.values()) {
      if (O.held && inst === O.held.inst && !inst.petAi) continue;
      const t = sb.t, dt = sb.dt;
      const s = inst.subs;
      if (s.hour) { s.hour.rotation.z = -((now.getHours() % 12) + now.getMinutes() / 60) / 12 * Math.PI * 2; s.min.rotation.z = -(now.getMinutes() + now.getSeconds() / 60) / 60 * Math.PI * 2; s.hour.children[0].position.y = 0.08; s.min.children[0].position.y = 0.12; }
      if (s.fish) { s.fish.children.forEach(() => {}); s.fish.position.x = Math.sin(t * 0.7 + 1) * (inst.def.t === 'fishbowl' ? 0.08 : 0.25); s.fish.rotation.y = Math.cos(t * 0.7 + 1) > 0 ? 0 : Math.PI; s.fish.position.y = (inst.def.t === 'fishbowl' ? 0.3 : 1.35) + Math.sin(t * 1.3) * 0.04; }
      if (s.blobs) { s.blobs.position.y = 0.4 + (Math.sin(t * 0.8) * 0.5 + 0.5) * 0.35; s.blobs.children[0].children[0] && (s.blobs.rotation.y = t * 0.3); }
      if (inst.screen) { if (inst.rec.on) { const C = ['#8fd0ff', '#ffe07a', '#ff9fb7', '#9be38f', '#c3a2ff']; inst.screen.color.set(C[Math.floor(t * 12 / 6) % C.length]); } else inst.screen.color.set('#1d2333'); }
      if (s.duvet && IH.cloth) duvet(inst, s.duvet, dt);
      if (s.door0) swingDoors(inst, dt);
      if (s.water && /^bath/.test(inst.def.t)) { const w = inst.wl || (inst.wl = { k: 0 }); w.k += ((inst.fill || 0) - w.k) * Math.min(1, dt * 0.25); s.water.visible = w.k > 0.03; s.water.position.y = 0.18 + 0.44 * w.k; } // fills slowly, drains slowly
      // a stool being carried: held in front at waist height
      // something carried: a stool held out in front by its sides; a mower pushed along the ground by its handle bar
      // (its grip just ahead of the shoulders, at arm's length), cutting as it goes. The hands reach for the grips.
      if (inst.carrying && inst.petAi) {
        const A = inst.petAi, st = inst.carrying, mw = st.def.t === 'mower', f = [Math.sin(A.yaw), Math.cos(A.yaw)], ch = inst.B && inst.B.chest ? inst.B.chest.getWorldPosition(new T.Vector3()) : A.pos;
        if (mw) { // pushed at arm's length, its deck always inside the island and clear of the house; if that brings it in
          // closer than arm's length (the fox walking at the house or the rim), the fox steps back: it never walks into the mower
          // straight ahead if it fits there, else angled round (steered, like at a corner), else pulled in
          let mx, mz, my = A.yaw;
          // (swung round at arm's length as it turns, the way it was last time first, so it never flips side to side)
          const was = st.relA || 0, das = [0]; for (let k = 1; k <= 11; k++) das.push(k * 0.25, -k * 0.25); das.sort((p, q) => (p === 0 ? -1 : q === 0 ? 1 : Math.abs(p - was) - Math.abs(q - was)));
          for (const da of das) { const y = A.yaw + da, x = ch.x + Math.sin(y) * LEAD, z = ch.z + Math.cos(y) * LEAD, [cx, cz] = clampMower(x, z, y); if (Math.abs(cx - x) + Math.abs(cz - z) < 1e-3) { mx = x; mz = z; my = y; st.relA = da; break; } }
          if (mx == null) [mx, mz] = clampMower(ch.x + f[0] * LEAD, ch.z + f[1] * LEAD, A.yaw);
          st.group.position.set(mx, A.pos.y, mz); st.group.rotation.y = my;
          const along = Math.hypot(mx - ch.x, mz - ch.z);
          if (along < LEAD - 0.08) { inst.pushN = (inst.pushN || 0) + 1; const q = safeMove(inst, A.pos.x - f[0] * (LEAD - along), A.pos.z - f[1] * (LEAD - along)); A.pos.x = q.x; A.pos.z = q.z; inst.group.position.x = q.x; inst.group.position.z = q.z; }
          if (O.mowing === inst && !inst.toyJob && t > (inst.toyLook || 0)) { inst.toyLook = t + 0.5; const toy = toysOnLawn()[0]; if (toy) toyAway(inst, toy, t); } // a toy on the lawn: moved before going on
        } else { st.group.position.set(ch.x + f[0] * 0.42, A.pos.y + 0.28, ch.z + f[1] * 0.42); st.group.rotation.y = A.yaw; }
        st.group.updateMatrixWorld(true);
        if (mw && A.st === 'walk') cutStrip(st.group.position.x, st.group.position.z, st.group.rotation.y);
      }
      if (inst.toyCarry && inst.toyCarry.doll && inst.B) { const hR = inst.B['hand.R'], hL = inst.B['hand.L'], h = hR && hL ? hR.getWorldPosition(new T.Vector3()).add(hL.getWorldPosition(new T.Vector3())).multiplyScalar(0.5) : inst.petAi.pos.clone().add(new T.Vector3(0, 0.8, 0)); inst.toyCarry.doll.pin('body', h, inst); }
      if (inst.doll) dollTick(inst, dt);
      if (inst.petAi) { const q1 = performance.now(); petStep(inst, t, dt); const q2 = performance.now(); guard(inst); tick('pet:' + inst.def.t + ':' + inst.rec.id.slice(0, 3), q2 - q1); tick('guard:' + inst.rec.id.slice(0, 3), performance.now() - q2); }
    }
    // the thing being moved bobs gently
    const e0 = performance.now(); if (O.held) posHeld(0.12 + Math.sin(t * 6) * 0.05);
    dropTarget(t); O.prof3.end = (O.prof3.end || 0) + (performance.now() - e0 - (O.prof3.end || 0)) * 0.1;
    // tray thumbnails are drawn a few at a time between beats
    if (O.thumbQ && O.thumbQ.length) thumbsSome();
  }

  // The front door is moved only by what walks into it. Each beat, any body (the character, a pet) that overlaps
  // the panel pushes it round its hinge just far enough to clear it, whichever side it comes from, so a cat nudging
  // the end swings it wide and a push near the hinge barely moves it; the push carries on as swing (momentum).
  // A door closer pulls it back shut; it swings past a little, back, and settles. Never through a body.
  function swingDoor(D, dt) {
    if (!dt) return;
    const n = Math.max(1, Math.ceil(dt / (1 / 60))), h = dt / n, bodies = [];
    for (const o of insts.values()) { const p = o.petAi && !o.petAi.carried && o.petAi.pos; if (p) bodies.push([p.x, p.z, IH.phys ? IH.phys.BODY[o.pet === 'kid' ? 'kid' : 'pet'].r * 0.85 : 0.3]); }
    for (let i = 0; i < n; i++) {
      let push = 0;
      for (const [px, pz, r] of bodies) {
        const phi = D.base + D.sign * (D.a + push), dx = Math.cos(phi), dz = -Math.sin(phi), rx = px - D.hinge[0], rz = pz - D.hinge[1];
        const along = Math.max(0, Math.min(D.w, rx * dx + rz * dz)), cx = rx - dx * along, cz = rz - dz * along, d = Math.hypot(cx, cz), over = r + D.t - d;
        if (over <= 0 || along < 0.05) continue;
        // which way the panel's free end has to turn to get out of this body's way, and how far (less near the hinge)
        const side = cx * -Math.sin(phi) + cz * -Math.cos(phi) > 0 ? -1 : 1, turn = over / Math.max(0.25, along) * side;
        push += turn * D.sign;
      }
      if (push) { D.a += push; D.v = D.v * 0.5 + push / h * 0.5; } // pushed: moves with the body, and keeps going
      D.v += (-9 * D.a - 2.2 * D.v) * h; D.a += D.v * h; // the closer
      if (Math.abs(D.a) > 1.75) { D.a = Math.sign(D.a) * 1.75; D.v = -D.v * 0.25; } // the door stop
      if (Math.abs(D.a) < 0.004 && Math.abs(D.v) < 0.02) { D.a = 0; D.v = 0; }
    }
    D.group.rotation.y = D.base + D.sign * D.a;
    D.group.visible = !O.home.sides[D.side].front; // (cut away with its wall when that side faces the camera)
  }
  // ---------- pets wander
  function walkable(x, z, o) { const c = O.home.cells.get(key(x, z)); return c && !c.fixed && !o.floor.has(key(x, z)); }

  // The character turns to look at the nearest thing they own.
  function faceThing(inst) {
    const A = inst.petAi; let best = null, bd = 9;
    for (const o of insts.values()) { if (o === inst || o.petAi || o.def.kind === 'rug' || o.def.kind === 'wall') continue; const d = o.group.position.distanceTo(A.pos); if (d < bd) { bd = d; best = o; } }
    if (best) A.yaw = Math.atan2(best.group.position.x - A.pos.x, best.group.position.z - A.pos.z); else A.st = 'stand';
  }
  // The bed's duvet is cloth (cloth.js). With nobody in bed its top edge rests by the pillow. When the character
  // lies down it's turned down to their feet; their covers moves pull it up over them to the chin, or down to the
  // waist, and it drapes over the body (spheres along the bones). The edge follows their hands (cover, 0 to 1).
  // The pillow gives under the head: every point of it inside the head's shape is pressed down below it (and
  // springs back slowly when the head lifts). The mattress, not the pillow, sets how high the character lies.
  function pillowDent(pg, bodies, dt) {
    const m = pg.userData.mesh; if (!m) return; const P = m.geometry.attributes.position, rest = m.userData.rest || (m.userData.rest = P.array.slice());
    const o = pg.position, k = Math.min(1, dt * 10), heads = bodies.slice(0, 4); // head, neck and chest shapes come first
    for (let i = 0; i < P.count; i++) {
      const x = rest[i * 3], y0 = rest[i * 3 + 1], z = rest[i * 3 + 2]; let y = y0;
      if (y0 > -0.02) for (const b of heads) {
        const ax = b.x - o.x, ay = b.y - o.y, az = b.z - o.z, bx = b.b.x - o.x, by = b.b.y - o.y, bz = b.b.z - o.z, dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz || 1e-6;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L)), cx = ax + dx * t, cy = ay + (by - ay) * t, cz = az + dz * t, h2 = (x - cx) ** 2 + (z - cz) ** 2, r = b.r * 1.05;
        if (h2 < r * r) y = Math.max(0.02, Math.min(y, cy - Math.sqrt(r * r - h2)));
      }
      P.array[i * 3 + 1] += (y - P.array[i * 3 + 1]) * (y < P.array[i * 3 + 1] ? k : k * 0.3);
    }
    P.needsUpdate = true; m.geometry.computeVertexNormals();
  }
  function duvet(bed, part, dt) {
    if (!bed.cloth) { bed.cloth = IH.cloth.make(); bed.cloth.mesh.userData.noHit = true; bed.group.add(bed.cloth.mesh); part.visible = false; if (IH.phys) IH.phys.forget(bed); }
    const who = [...insts.values()].find(o => o.pet === 'kid' && o.petAi && o.petAi.use && o.petAi.use.id === bed.rec.id && o.B && o.cols);
    let hold = { z: IH.cloth.REST, y: IH.cloth.TOP + 0.05 }, bodies = [];
    // slept in and not made yet: the duvet stays pushed down the bed, until the bed is made (pulled back up)
    if (!who && O.life && O.life.messy.has(bed.rec.id)) hold.z = 0.55 + (IH.cloth.REST - 0.55) * clamp(bed.making || 0, 0, 1);
    if (who) {
      bed.group.updateMatrixWorld(true); who.group.updateMatrixWorld(true);
      // the character's body shape, measured from its own model (rig3d.colliders), in the bed's space
      bodies = IH.rig3d.capsules(who, who.cols, bed.group).map(k => ({ x: k.a.x, y: k.a.y, z: k.a.z, b: { x: k.b.x, y: k.b.y, z: k.b.z }, r: k.r }));
      const at = n => bed.group.worldToLocal(who.B[n].getWorldPosition(new T.Vector3()));
      const head = at('head'), hips = at('hips'), feet = at('foot.L'), c = who.cover || 0;
      const zs = [feet.z + 0.35, hips.z, head.z + 0.3], z = c < 0.5 ? zs[0] + (zs[1] - zs[0]) * c * 2 : zs[1] + (zs[2] - zs[1]) * (c - 0.5) * 2;
      const top = Math.max(...bodies.map(k => Math.max(k.y, k.b.y) + k.r)); // the highest point of the body
      const ch = bodies.find((k, i) => who.cols[i] && who.cols[i].bone === 'chest'); // the hands hold it just over the chest, so it lies on the body, no peaks
      hold = { z, y: c > 0 ? Math.max(IH.cloth.TOP + 0.04, Math.min(top, (ch ? Math.max(ch.y, ch.b.y) + ch.r : at('chest').y + 0.25) + 0.05)) : IH.cloth.TOP + 0.04 };
      if (c > 0) hold.hands = ['hand.L', 'hand.R'].filter(n => who.B[n]).map(n => clamp(at(n).x, -1.05, 1.05));
      const B = bed.cloth; B.hy = B.hy == null ? hold.y : B.hy + (hold.y - B.hy) * 0.15; hold.y = Math.round(B.hy * 20) / 20; // steady, not breathing with the chest
    }
    // nobody in it and the duvet's settled: it stays as it is (no simulating a still duvet every beat)
    const C = bed.cloth, key = who ? null : hold.z.toFixed(3) + ',' + hold.y.toFixed(3);
    if (key && C.restKey === key && C.restN > 12) return;
    if (C.restKey !== key) { C.restKey = key; C.restN = 0; }
    IH.cloth.step(bed.cloth, dt, hold, bodies);
    C.restN = C.motion && C.motion[0] < 0.003 ? (C.restN || 0) + 1 : 0;
    if (bed.subs.pillow) pillowDent(bed.subs.pillow, bodies, dt); // the pillow stays put; the head presses into it
  }
  // What a character or pet is looking at right now (its head turns to it, rig3d.look): the thing it's using or
  // doing a chore at, the pet it's patting, the book in its hand, where it's walking to; sitting about, the TV if
  // it's on in front of it, or whoever's nearby, or just straight ahead. Nothing while asleep.
  const LOOK_H = { tv: 1.55, kitchen: 1.35, stove: 1.35, fridge: 1.7, easel: 1.75, piano: 1.45, toychest: 0.6, bookcase: 1.6, guitar: 0.5 };
  function focusOf(inst) {
    const A = inst.petAi, kid = inst.pet === 'kid', me = A.pos; if (A.carried || !me) return null;
    if (inst.playFocus !== undefined) return inst.playFocus; // playing: eyes on the toy (or none while thrashing it about)
    const up = (p, dy) => new T.Vector3(p.x, p.y + dy, p.z), headOf = o => up(o.group.position, o.pet === 'kid' ? 1.75 : 0.45), eye = kid ? 1.6 : 0.4;
    const fwd = new T.Vector3(Math.sin(A.yaw), 0, Math.cos(A.yaw));
    const inFront = p => { const d = new T.Vector3(p.x - me.x, 0, p.z - me.z); const L = d.length(); return L > 0.3 && d.dot(fwd) / L > -0.1 ? L : 0; };
    const around = () => {
      let best = null, bd = 6;
      for (const o of insts.values()) {
        if (o === inst) continue;
        if (o.def.act === 'tv' && o.rec.on) { const L = inFront(o.group.position); if (L && L < 9) return up(o.group.position, LOOK_H.tv); }
        if (o.petAi && o.petAi.pos && !o.petAi.carried) { const L = inFront(o.petAi.pos); if (L && L < bd) { bd = L; best = headOf(o); } }
      }
      return best || new T.Vector3(me.x + fwd.x * 3, me.y + eye + (kid ? 0.1 : 0), me.z + fwd.z * 3);
    };
    if (A.use) {
      const it = insts.get(A.use.id), p = A.use.pose || ''; if (!it) return null;
      if (/^(sleep|liebed)/.test(p) || p === 'gaze' || p === 'bounce' || p === 'splash') return null;
      if (/^read/.test(p) && inst.B && inst.B['hand.R'] && (p !== 'read.browse' || inst.prop === 'book')) return inst.B['hand.R'].getWorldPosition(new T.Vector3()); // the book in hand, the finger on the spines
      const k = it.def.use.kind; if (k === 'sit' || k === 'lie' || k === 'nest' || k === 'on') return kid ? around() : glance(inst);
      return up(it.group.position, LOOK_H[it.def.t] != null ? LOOK_H[it.def.t] : 1.0);
    }
    if (A.doing) {
      const o = A.doing.o; if (/^(sleep|eat)/.test(A.doing.pose)) return null;
      if (o.type === 'perch') return A.doing.phase === 'eye' ? up(o.it.group.position, o.it.def.surf || 1) : glance(inst); // eyes the top before the jump
      if (o.type === 'chore') { const tg = o.target; return tg.pos ? tg.pos.clone() : tg.petAi ? headOf(tg) : up(tg.group.position, { water: 0.9, makebed: 1.1 }[o.chore] || 1.3); }
      if (o.near) return headOf(o.near);
      return o.face ? o.face.clone() : around();
    }
    if (A.st === 'walk' && A.path.length) {
      // heading somewhere: looks at it when it's close, otherwise along the way
      const T0 = A.task, tg = T0 && (T0.it ? T0.it.group.position : T0.target ? (T0.target.pos || (T0.target.petAi ? T0.target.petAi.pos : T0.target.group.position)) : T0.near ? T0.near.petAi.pos : T0.at);
      if (tg && Math.hypot(tg.x - me.x, tg.z - me.z) < 3) return up(tg, kid ? (T0.it ? 1.0 : 0.6) : 0.3);
      const n = A.path[0], ahead = Math.hypot(n.x - me.x, n.z - me.z) < 0.6 && A.path[1] ? A.path[1] : n;
      return new T.Vector3(ahead.x, (IH.phys ? IH.phys.floorAt(ahead.x, ahead.z) : me.y) + eye, ahead.z);
    }
    if (A.st === 'sleep') return null;
    return kid ? around() : glance(inst);
  }
  // A pet's eyes wander: a look at the character, at another pet, a toy, its bowl, somewhere ahead, held a moment
  // and then something else, like a real animal watching its home.
  function glance(inst) {
    const A = inst.petAi, t = lastT || 0, me = A.pos;
    if (A.gl && t < A.gl.until && A.gl.p) return A.gl.p;
    const c = [], add = (p, w) => { if (p && Math.hypot(p.x - me.x, p.z - me.z) < 7) c.push([p, w]); };
    for (const o of insts.values()) {
      if (o === inst) continue;
      if (o.petAi && o.petAi.pos) add(new T.Vector3(o.petAi.pos.x, o.group.position.y + (o.pet === 'kid' ? 1.75 : 0.45), o.petAi.pos.z), o.pet === 'kid' ? 4 : 1.5);
      else if (['teddy', 'robot', 'globe', 'toychest'].includes(o.def.t)) add(new T.Vector3(o.group.position.x, o.group.position.y + 0.4, o.group.position.z), 0.8);
      else if (o.def.use && /^(bed|sofa|armchair|catbed)$/.test(o.def.t)) add(new T.Vector3(o.group.position.x, o.group.position.y + 1, o.group.position.z), 0.4);
    }
    for (const b of (O.life ? O.life.bowls : [])) if (b.pet === inst) add(b.pos, 3);
    const f = [Math.sin(A.yaw), Math.cos(A.yaw)]; add(new T.Vector3(me.x + f[0] * 2.5 + (Math.random() - 0.5) * 2, me.y + 0.3, me.z + f[1] * 2.5 + (Math.random() - 0.5) * 2), 1.2);
    let r = Math.random() * c.reduce((s2, x) => s2 + x[1], 0), p = c.length ? c[0][0] : null; for (const [q, w] of c) { r -= w; if (r <= 0) { p = q; break; } }
    A.gl = { p, until: t + 1.2 + Math.random() * 2.6 }; return p;
  }
  // Where a character's hands go this beat: onto the grips of what it carries, or onto the handle, tap, knob or
  // edge of what it's working at (an item's grips if it has them, else the nearest point of the thing).
  const REACH = new Set(['fetch', 'switch', 'place', 'scan', 'water', 'dishes', 'stir', 'chop', 'feed', 'taps', 'wash', 'reach']);
  function gripOf(inst, it, side = 'R') {
    const g = it.def.grips && (it.def.grips[side] || it.def.grips.R); it.group.updateMatrixWorld(true);
    if (g) return it.group.localToWorld(new T.Vector3(...g));
    const sh = inst.B && inst.B['uparm.' + side] ? inst.B['uparm.' + side].getWorldPosition(new T.Vector3()) : null; if (!sh) return null;
    const box = new T.Box3().setFromObject(it.group); if (box.isEmpty()) return null;
    const p = box.clampPoint(sh, new T.Vector3()); return p.lerp(sh, 0.04);
  }
  // Things held to be used (the guitar): lifted off where they rest into the character's hands, held there while it's
  // used, the hands on them (grips; the strumming hand moving), and put back after. Never left floating.
  function holdTick(inst, t, dt, out) {
    const A = inst.petAi, it = A.use && insts.get(A.use.id), H = it && it.def.use && it.def.use.hold && it.subs && it.subs[it.def.use.hold.sub] ? it : null;
    if (H && inst.holdIt !== H) { if (inst.holdIt) holdRest(inst); inst.holdIt = H; inst.holdK = 0; }
    const S = inst.holdIt; if (!S) return; const h = S.def.use.hold, part = S.subs[h.sub];
    if (!part.userData.rest) part.userData.rest = { p: part.position.clone(), q: part.quaternion.clone(), s: part.scale.clone() };
    inst.holdK = clamp((inst.holdK || 0) + (H === S ? dt : -dt) / 0.5, 0, 1); const k = ease(inst.holdK), R = part.userData.rest;
    if (k <= 0 && H !== S) { holdRest(inst); return; }
    // where it is in the hands, in the world: its body at h.body (character space), its length leaning across the chest
    const qy = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), A.yaw), ql = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), h.lean), qw = qy.clone().multiply(ql);
    const upW = new T.Vector3(0, 1, 0).applyQuaternion(qw), ch = inst.B.chest ? inst.B.chest.getWorldPosition(new T.Vector3()) : inst.group.position.clone().add(new T.Vector3(0, 0.75, 0));
    const cc = inst.cols && IH.rig3d.capsules(inst, inst.cols.filter(c => c.bone === 'chest' || c.bone === 'hips')), front = cc && cc.length ? Math.max(...cc.map(k => k.r)) : 0.25; // (how far the tummy comes forward)
    const bodyW = new T.Vector3(h.body[0], h.body[1], front + h.body[2]).applyQuaternion(qy).add(ch), origin = bodyW.addScaledVector(upW, -h.up * part.parent.getWorldScale(new T.Vector3()).x * R.s.x); // against the chest and tummy (its own size: it never shrinks or grows in the hands)
    const par = part.parent; par.updateMatrixWorld(true); const pi = par.matrixWorld.clone().invert(), pq = par.getWorldQuaternion(new T.Quaternion()).invert();
    const lp = origin.applyMatrix4(pi), lq = pq.multiply(qw);
    part.position.lerpVectors(R.p, lp, k); part.quaternion.copy(R.q).slerp(lq, k); part.scale.copy(R.s); part.updateMatrixWorld(true);
    if (S.def.t === 'guitar' && inst.pet === 'kid') guitarMusic(k > 0.6 && H === S && !O.paused);
    if (k > 0.6 && h.grips) for (const sd of ['L', 'R']) { const g = h.grips[sd]; if (!g) continue; const v = new T.Vector3(...g); if (h.strum === sd) v.y += Math.sin(t * 10) * 0.07; out[sd] = part.localToWorld(v); }
  }
  function holdRest(inst) { const S = inst.holdIt; if (S && S.def.t === 'guitar') guitarMusic(false); inst.holdIt = null; inst.holdK = 0; if (!S || !S.subs) return; const part = S.subs[S.def.use.hold.sub], R = part && part.userData.rest; if (R) { part.position.copy(R.p); part.quaternion.copy(R.q); part.scale.copy(R.s); } }
  function reachFor(inst, t = 0, dt = 0) {
    if (inst.pet !== 'kid' || !inst.B) return; const A = inst.petAi, out = {};
    holdTick(inst, t, dt, out);
    // using something with the hands (the piano's keys, the bench, the stove, the basin, the easel): each hand on it,
    // moving the way that work moves (along the keys, chopping, stirring, rubbing, brushing)
    let it = A.use ? insts.get(A.use.id) : A.doing && A.doing.o && A.doing.o.useOf;
    if (!it && A.doing && /^(chop|stir|cook|wash|play|paint)$/.test(A.doing.pose)) { let bd = 1.3; for (const o of insts.values()) { if (!(o.def.use && o.def.use.hands) || !o.group) continue; const d = Math.hypot(o.group.position.x - A.pos.x, o.group.position.z - A.pos.z) - Math.max(...o.def.fp) / 2; if (d < bd) { bd = d; it = o; } } } // (a meal's chopping and stirring: at the bench or stove it's standing at)
    const H = it && it.def.use && it.def.use.hands;
    if (H && !inst.holdIt && it.group) {
      it.group.updateMatrixWorld(true); const hw = Math.max(0, it.def.fp[0] / 2 - 0.35), along = clamp(it.group.worldToLocal(A.pos.clone()).x, -hw, hw); // (along a long bench: where it's standing)
      for (const sd of ['L', 'R']) {
        const g = H[sd]; if (!g) continue; const v = new T.Vector3(g[0] + along, g[1], g[2]), ph = t * 7 + (sd === 'L' ? 1.7 : 0);
        if (H.move === 'keys') v.x += Math.sin(ph * 0.6) * 0.12; else if (H.move === 'chop' && sd === 'R') v.y += Math.abs(Math.sin(ph * 1.2)) * 0.08; else if (H.move === 'stir' && sd === 'R') { v.x += Math.cos(ph) * 0.07; v.z += Math.sin(ph) * 0.07; } else if (H.move === 'rub') v.x += Math.sin(ph * 1.4) * 0.04 * (sd === 'L' ? 1 : -1); else if (H.move === 'paint') { v.x += Math.cos(ph * 0.5) * 0.15; v.y += Math.sin(ph) * 0.08; }
        out[sd] = it.group.localToWorld(v);
      }
    }
    if (inst.carrying) { for (const s of ['R', 'L']) { const g = inst.carrying.def.grips && inst.carrying.def.grips[s]; if (g) out[s] = inst.carrying.group.localToWorld(new T.Vector3(...g)); } }
    else if (!out.R && A.doing && REACH.has(A.doing.pose)) { const o = A.doing.o, it = o.target && o.target.group && !o.target.petAi ? o.target : o.it && o.it.group ? o.it : null; if (it) out.R = gripOf(inst, it); }
    inst.reach = out;
  }
  function petStep(inst, t, dt) {
    const A = inst.petAi, g = inst.group;
    if (inst.pet === 'kid') inst.bodies = [...insts.values()].filter(o => o !== inst && o.petAi && o.petAi.pos && !o.petAi.carried).flatMap(o => { const q = o.petAi.pos, f = [Math.sin(o.petAi.yaw), Math.cos(o.petAi.yaw)]; return o.pet === 'kid' ? [{ x: q.x, y: q.y + 1.0, z: q.z, r: 0.4 }] : [{ x: q.x, y: q.y + 0.32, z: q.z, r: 0.3 }, { x: q.x + f[0] * 0.3, y: q.y + 0.5, z: q.z + f[1] * 0.3, r: 0.2 }]; }); // other bodies, as balls
    inst.cam = O.S.cam; // (for things that face the camera)
    reachFor(inst, t, dt);
    const fc = focusOf(inst); inst.focus = fc && isFinite(fc.x) && isFinite(fc.y) && isFinite(fc.z) ? fc : null;
    if (!(A.doing && A.doing.o.play)) { inst.playing = false; inst.playFocus = undefined; }
    if (A.carried) { poseOf(inst, inst.pet === 'kid' ? 'happy' : 'look', t, A.ph); return; }
    if (A.use) {
      const U0 = A.use; // used on its own (not put there): gets up once what it came for is full
      if (U0.lampsAt && t > U0.lampsAt) { U0.lampsAt = 0; const bp = A.pos; for (const l of lampsOn(bp)) if (l.group.position.distanceTo(bp) <= 2.6) { l.rec.on = false; sound('off'); } save(); } // reaches over and switches the bedside lamp off
      const sleepOn = U0.night && dayPart() === 'night'; // asleep for the night: up in the morning
      if (!insts.has(U0.id) || (t > U0.until && !sleepOn) || (U0.auto && !sleepOn && t > U0.since + 60 && /^(bed|bunk)$/.test(U0.t) && inst.needs && inst.needs.energy >= 97)) { leaveUse(inst); A.until = t + 0.5; }
      else {
        // the move's branches, one after another (never the same twice running): roll over, starfish, covers up…
        const U = A.use; if (U.moves && t > U.nextMove) { const o = U.moves.filter(m => m !== U.pose); U.pose = U.queue && U.queue.length ? U.queue.shift() : o[Math.floor(Math.random() * o.length)]; U.nextMove = t + 5 + Math.random() * 5; }
        poseOf(inst, U.pose, t, A.ph);
        g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); useFx(inst, t);
        if (A.slide) { // sitting down onto it, turning round as it does
          const p = clamp((t - A.slide.t0) / A.slide.dur, 0, 1), e = ease(p); g.position.lerpVectors(A.slide.from, A.pos, e);
          let dy = A.yaw - A.slide.yaw0; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); g.rotation.set(0, A.slide.yaw0 + dy * e, 0); if (p >= 1) A.slide = null;
        }
        return;
      }
    } // the kid waves, a pet looks about
    if (O.freeze && inst.pet === (O.freeze.who || 'cat')) { A.yaw = O.freeze.yaw; inst.group.rotation.set(0, A.yaw, 0); poseOf(inst, O.freeze.st, t, A.ph); return; }
    if (O.editing) { poseOf(inst, 'stand', t, A.ph); return; }
    if (A.happy > t) { poseOf(inst, 'happy', t, A.ph); return; }
    // doing something at a spot (a chore, eating, keeping someone company)
    if (A.doing) {
      if (t > A.doing.until) { if (A.doing.o.play) { const d = A.doing.o.play.doll; if (d) d.let(inst); inst.playing = false; inst.playFocus = undefined; } finish(inst, t); }
      else if (A.doing.o.play && playStep(inst, A.doing, t, dt)) { /* playing with a soft toy */ }
      else { const D = A.doing; if (D.o.chore === 'makebed') D.o.target.making = (t - D.t0) / (D.until - D.t0); if (A.wantYaw != null) turnTo(A, A.wantYaw, dt, inst.pet === 'kid' ? 7 : 3.2); poseOf(inst, D.pose, t, A.ph); g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); drawSlide(g, A, t); return; }
    }
    const P = IH.phys, cls = clsOf(inst), R = P ? P.BODY[cls].r : 0.3;
    if (P && !A.placed && P.grid()) { A.placed = true; const sp = P.nearestClear(A.pos.x, A.pos.z, cls); if (sp) A.pos.set(sp.x, P.floorAt(sp.x, sp.z), sp.z); } // first look: never starts inside something
    if (A.st === 'walk' && A.path.length && P) {
      // walking: turns smoothly toward the next point of its route and goes at any angle, slowing for sharp turns;
      // it keeps out of everyone's way and slides along anything it brushes (never into it)
      // Steering like a real animal: it walks forward the way it faces and turns only as tightly as its turning circle
      // lets it, aiming at a point a little way along the route (so corners become curves). It slows into a bend; a big
      // about-face is a tight U-turn while walking, or (no room for that) a shuffle round on the spot. The last stretch
      // goes straight to the spot so it arrives exactly.
      const speed = inst.pet === 'bunny' ? 1.0 : inst.pet === 'kid' ? 1.2 : 1.3, turnR = inst.pet === 'kid' ? 0.22 : inst.pet === 'bunny' ? 0.24 : 0.32;
      while (A.path.length > 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.28) A.path.shift(); // (passed close by: on to the next)
      let rest = 0, ax = A.pos.x, az = A.pos.z; for (const q of A.path) { rest += Math.hypot(q.x - ax, q.z - az); ax = q.x; az = q.z; }
      const look = (dist) => { let px = A.pos.x, pz = A.pos.z, left = dist; for (const q of A.path) { const L = Math.hypot(q.x - px, q.z - pz); if (L >= left) return { x: px + (q.x - px) / L * left, z: pz + (q.z - pz) / L * left }; left -= L; px = q.x; pz = q.z; } return { x: px, z: pz }; };
      const wp = A.path[0], final = A.path.length === 1 && rest < 0.45;
      // the point it heads for: half a tile along the route, pulled in closer until there's a clear straight line to
      // it (so it never cuts a corner into a door frame or a table), at worst the route's next point
      let aim = wp; if (!final && !(A.task && A.task.straight)) for (const L of [0.5, 0.35, 0.22]) { const q = look(L); if (P.sees(A.pos, q, cls) && P.wallFree(A.pos, q)) { aim = q; break; } }
      const adx = aim.x - A.pos.x, adz = aim.z - A.pos.z;
      const want = Math.atan2(adx, adz), off = Math.atan2(Math.sin(want - A.yaw), Math.cos(want - A.yaw)), aoff = Math.abs(off);
      const room = P.clearance(A.pos.x, A.pos.z, cls), cramped = room < R + 0.12;
      // slows into a bend; past about 70 degrees (or no room to swing round) it turns where it stands, feet stepping, so it
      // can never circle round a point inside its turning circle
      let v = speed * (final ? Math.max(0.35, Math.min(1, rest / 0.45)) : 1) * (aoff > 1.2 || (aoff > 0.9 && cramped) ? 0 : Math.pow(Math.cos(aoff), 1.5));
      const wmax = Math.min(5.5, Math.max(2.6, v / turnR)), dyaw = Math.max(-wmax * dt, Math.min(wmax * dt, off)); A.yaw = Math.atan2(Math.sin(A.yaw + dyaw), Math.cos(A.yaw + dyaw));
      let sp = v * dt, nx, nz;
      if (final) { const d = Math.hypot(wp.x - A.pos.x, wp.z - A.pos.z); if (d <= sp || d < 0.01) { nx = wp.x; nz = wp.z; A.path.shift(); } else { const k = sp / d; nx = A.pos.x + (wp.x - A.pos.x) * k; nz = A.pos.z + (wp.z - A.pos.z) * k; } } // the last bit: straight onto the spot
      else { nx = A.pos.x + Math.sin(A.yaw) * sp; nz = A.pos.z + Math.cos(A.yaw) * sp; } // forward, the way it's facing
      for (const o of others(inst)) { const ox = nx - o.x, oz = nz - o.z, od = Math.hypot(ox, oz), m = o.r + R; if (od < m && od > 1e-4) { const k = (m - od) * 0.5; nx += ox / od * k; nz += oz / od * k; } }
      if (A.free && !P.wallFree(A.pos, { x: nx, z: nz })) { nx = A.pos.x; nz = A.pos.z; A.path = []; } // even stepping off a seat, never through a wall
      if (!A.free) {
        const c0 = P.clearance(A.pos.x, A.pos.z, cls), ok = (x, z) => { const c = P.clearance(x, z, cls); return c >= R * 0.97 || c >= c0 - 0.002; }; // (squeezed in somewhere: any move that's no tighter is allowed, so it's never stuck)
        if (!ok(nx, nz)) { if (ok(nx, A.pos.z)) nz = A.pos.z; else if (ok(A.pos.x, nz)) nx = A.pos.x; else { nx = A.pos.x; nz = A.pos.z; } }
        if (Math.hypot(nx - A.pos.x, nz - A.pos.z) < sp * 0.3) A.stuck = (A.stuck || 0) + dt; else A.stuck = 0;
      }
      // on the floor; getting off a bed or seat it walks across the top and steps down at the edge (never through it)
      const gy = A.free ? Math.max(P.floorAt(nx, nz), P.support(nx, A.pos.y + 0.3, nz)) : P.floorAt(nx, nz);
      inst.walkD = (inst.walkD || 0) + Math.hypot(nx - A.pos.x, nz - A.pos.z); // ground covered: the feet step in time with it
      A.pos.x = nx; A.pos.z = nz; A.pos.y = gy > A.pos.y ? gy : A.pos.y + (gy - A.pos.y) * Math.min(1, dt * 10);
      inst.room = P.clearance(A.pos.x, A.pos.z, cls); // in a tight spot the arms swing less (kid3d)
      g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); // (placed first: the feet are planted against where the body is now)
      poseOf(inst, 'walk', t, A.ph);
      if (A.stuck > 0.5 && A.task && A.path.length === 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.4) A.path = []; // close enough (someone's in the exact spot)
      if (A.stuck > 1.2 && A.path.length) { const end = A.path[A.path.length - 1], np = P.route(A.pos, end, cls); A.stuck = 0; if (np) A.path = np; else A.path = []; } // blocked (someone in the way): finds another way
      if (!A.path.length) {
        A.free = false;
        if (A.afterMeal) { A.afterMeal = false; afterMeal(inst, t); }
        else if (A.afterBath) { A.afterBath = false; afterBath(inst, t); }
        else if (A.task) arrive(inst, A.task, t);
        else if (A.plan && A.plan.length) { A.st = 'stand'; A.until = t; } // (off a seat, with something to do next: straight on to it)
        else { A.st = inst.pet === 'kid' ? ['stand', 'look', 'look'][Math.floor(Math.random() * 3)] : ['stand', 'sit', 'sit', 'sleep'][Math.floor(Math.random() * 4)]; if (A.st === 'look') faceThing(inst); A.until = t + 3 + Math.random() * (A.st === 'sleep' ? 9 : 4); }
      }
    } else {
      if (A.st === 'walk') A.st = 'stand';
      setFit(inst, 'clear'); // standing about: arms and all kept out of things
      if (A.plan && A.plan.length && t > A.until) nextStep(inst, t);
      else if (t > A.until && think(inst, t)) { /* off to do something */ } else if (t > A.until && !wander(inst, t)) { A.until = t + 3; A.st = inst.pet === 'kid' ? 'look' : 'sit'; }
      if (A.wantYaw != null && !A.doing) turnTo(A, A.wantYaw, dt);
      poseOf(inst, A.st === 'walk' ? 'stand' : A.st, t, A.ph);
    }
    g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); drawSlide(g, A, t);
  }

  // ---------- holding, placing and moving
  function marks(def, rec, ok) {
    const M = O.S.marks; while (M.children.length) { const c = M.children.pop(); c.geometry.dispose(); }
    if (!rec) return;
    const mat = ok ? O.markOk : O.markNo;
    if (def.kind === 'wall') {
      const w = def.cover ? winOf(rec) : rec, wd = def.cover ? w && BY[w.t] : def; if (!w || !O.home.sides[w.side]) return;
      const [x, z] = wallPoint(O.home, w.side, w.u + wd.fp[0] / 2, 0.09), m = new T.Mesh(new T.PlaneGeometry(wd.fp[0], wd.h), mat);
      m.position.set(x, FY + wyOf(wd, w.side) + wd.h / 2, z); m.rotation.y = wallYaw(O.home, w.side); m.layers.set(1); m.renderOrder = 5; M.add(m); return;
    }
    const o = def.kind === 'small' ? occ(O.held && O.held.rec.id).surf.get(key(rec.x, rec.z)) : null;
    for (const [x, z] of cellsOf(def, rec.x, rec.z, rec.r || 0)) {
      const c = O.home.cells.get(key(x, z)), m = new T.Mesh(new T.PlaneGeometry(0.9, 0.9), mat); m.rotation.x = -Math.PI / 2;
      m.position.set(x + 0.5, (o ? o.y : c ? c.y : 0) + 0.03, z + 0.5); m.layers.set(1); m.renderOrder = 5; M.add(m);
    }
  }
  function posHeld(lift) {
    const h = O.held; if (!h) return; if (IH.phys) IH.phys.forget(h.inst); const p = placeOf(h.def, h.rec, h.rec.id); h.inst.group.position.set(p.x, p.y + (h.def.kind === 'wall' ? 0 : lift), p.z); h.inst.group.rotation.set(0, p.ry, 0);
    if (h.def.kind === 'wall') { const S = O.home.sides[sideOf(h.rec)]; if (S) h.inst.group.position.addScaledVector(new T.Vector3(S.geo.n[0], 0, S.geo.n[1]), lift * 0.6); }
    if (h.inst.petAi) { h.inst.petAi.pos = new T.Vector3(p.x, p.y, p.z); }
  }
  function check() { const h = O.held; if (!h) return; const f = fits(h.def, h.rec, h.rec.id); h.ok = f.ok; h.why = f.why; marks(h.def, h.rec, f.ok); ui(); }
  // A free spot near the middle of the view, for a new thing.
  function freeSpot(def) {
    const base = { r: 0 };
    if (def.kind === 'wall' && def.cover) { for (const it of items()) { const d = BY[it.t]; if (d && d.opening && !O.home.sides[it.side].front && fitsWall(def, { on: it.id }).ok) return { on: it.id }; } return null; }
    if (def.kind === 'wall') {
      for (const sd of Object.keys(O.home.sides)) { const S = O.home.sides[sd]; if (S.front || (def.opening && !S.outer)) continue; for (let u = 0.5; u + def.fp[0] < S.len; u += 0.5) { const rec = { side: sd, u }; if (fitsWall(def, rec).ok) return rec; } }
      return null;
    }
    const cx = Math.floor(CAM.target.x), cz = Math.floor(CAM.target.z);
    for (let r = 0; r < 26; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      for (const rot of [0, 1]) { const rec = { ...base, x: cx + dx, z: cz + dz, r: rot }; if (fits(def, rec).ok) return rec; }
    }
    return null;
  }
  function hold(rec, isNew) {
    const def = BY[rec.t]; let inst = insts.get(rec.id);
    if (!inst) { if (isNew) items().push(rec); inst = addInst(rec); }
    O.held = { rec, def, inst, isNew, orig: { ...rec }, ok: true };
    sound('lift'); check(); refreshAll(); ui();
  }
  function placeHeld() {
    const h = O.held; if (!h) return;
    if (!h.ok) { toast(WHY[h.why] || 'That doesn’t fit there.'); sound('no'); return; }
    O.held = null; marks(); posInst(h.inst); refreshAll(); lawnHide(); save(); sound('place'); ui();
    if (h.def.opening || h.def.cover) rebuildHouse();
    if (O.opts.track) O.opts.track('home.place', { t: h.rec.t, home: O.st.cur });
  }
  function putAway() {
    const h = O.held; if (!h) return; O.held = null; marks();
    const list = items(), i = list.findIndex(it => it.id === h.rec.id); if (i >= 0) list.splice(i, 1);
    dropInst(h.rec.id); toBox(h.rec);
    if (h.def.cover) rebuildHouse();
    if (h.def.opening) { const c = list.findIndex(it => it.on === h.rec.id); if (c >= 0) { const cr = list.splice(c, 1)[0]; dropInst(cr.id); toBox(cr); } rebuildHouse(); }
    refreshAll(); lawnHide(); save(); sound('away'); toast(`${BY[h.rec.t].name} is in Mine.`); ui();
  }
  function cancelHeld() {
    const h = O.held; if (!h) return;
    if (h.isNew) return putAway();
    Object.assign(h.rec, h.orig); if (h.def.cover && fitCover(h.rec)) { dropInst(h.rec.id); addInst(h.rec); } O.held = null; marks(); if (insts.get(h.rec.id)) posInst(insts.get(h.rec.id)); refreshAll(); ui();
  }
  function turnHeld() { const h = O.held; if (!h || h.def.kind === 'wall') return; h.rec.r = ((h.rec.r || 0) + 1) % 4; sound('turn'); check(); }
  const WHY = { edge: 'Keep it on the floor of your home or garden.', wall: 'There’s a wall in the way.', in: 'This one goes inside.', out: 'This one goes in the garden.', full: 'Something’s already there.', window: 'That’s where a window is.', cut: 'Turn the view so the wall faces you.', outside: 'Windows go in the outside walls.', door: 'That’s where the door is.', tall: 'It’s too tall for that wall.', nowin: 'Drop it on a window.', covered: 'That window has one already.' };

  // Pointer to world: a spot on the floor (or a table top, or a far wall) under the finger.
  const ray = new T.Raycaster(), ndc = new T.Vector2(), PL = new T.Plane(new T.Vector3(0, 1, 0), 0), HIT = new T.Vector3();
  function rayAt(px, py) { const r = O.cv.getBoundingClientRect(); ndc.set((px - r.left) / r.width * 2 - 1, -((py - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, O.S.cam); return ray; }
  function floorHit(px, py, def) {
    const rr = rayAt(px, py);
    if (def && def.kind === 'small') {
      // table tops first
      const o = occ(O.held && O.held.rec.id); let best = null;
      for (const [k, s] of o.surf) { PL.constant = -s.y; if (!rr.ray.intersectPlane(PL, HIT)) continue; const [x, z] = k.split(',').map(Number); if (HIT.x >= x && HIT.x < x + 1 && HIT.z >= z && HIT.z < z + 1 && (!best || s.y > best.y)) best = { x, z, y: s.y }; }
      if (best) return { x: best.x + 0.5, z: best.z + 0.5 };
    }
    PL.constant = -FY; if (!rr.ray.intersectPlane(PL, HIT)) return null;
    const c = O.home.cells.get(key(Math.floor(HIT.x), Math.floor(HIT.z)));
    if (!c || c.zone === 'out') { PL.constant = -(c && c.deck ? 0.3 : 0); rr.ray.intersectPlane(PL, HIT); }
    return { x: HIT.x, z: HIT.z };
  }
  function wallHit(px, py, outerOnly) {
    const rr = rayAt(px, py); let best = null;
    for (const [sd, side] of Object.entries(O.home.sides)) {
      if (side.front || (outerOnly && !side.outer)) continue;
      const g = side.geo, n = new T.Vector3(g.n[0], 0, g.n[1]); if (rr.ray.direction.dot(n) >= 0) continue;
      const pt = new T.Vector3(g.org[0], 0, g.org[1]), pl = new T.Plane().setFromNormalAndCoplanarPoint(n, pt);
      if (!rr.ray.intersectPlane(pl, HIT)) continue;
      const u = (HIT.x - pt.x) * g.ax[0] + (HIT.z - pt.z) * g.ax[1], dist = rr.ray.origin.distanceTo(HIT);
      if (u < 0 || u > side.len || HIT.y < FY || HIT.y > g.top + 0.3) continue;
      if (!best || dist < best.dist) best = { side: sd, u, y: HIT.y, dist };
    }
    return best;
  }
  function moveHeldTo(px, py) {
    const h = O.held; if (!h) return;
    if (h.def.kind === 'wall' && h.def.cover) { // onto whichever window is under the finger
      const w = wallHit(px, py, true); if (!w) return; const win = items().find(it => BY[it.t] && BY[it.t].opening && it.side === w.side && w.u > it.u - 0.4 && w.u < it.u + BY[it.t].fp[0] + 0.4);
      if (!win || win.id === h.rec.on) return; h.rec.on = win.id; if (fitCover(h.rec)) { dropInst(h.rec.id); h.inst = addInst(h.rec); } posHeld(0.3); check(); return;
    }
    if (h.def.kind === 'wall') { const w = wallHit(px, py, !!h.def.opening); if (!w) return; h.rec.side = w.side; h.rec.u = Math.round((w.u - h.def.fp[0] / 2) * 2) / 2; check(); return; }
    const p = floorHit(px, py, h.def); if (!p) return; const [w, d] = fp(h.def, h.rec.r || 0);
    const nx = Math.round(p.x - w / 2), nz = Math.round(p.z - d / 2); if (nx === h.rec.x && nz === h.rec.z) return;
    h.rec.x = nx; h.rec.z = nz; check();
  }
  function pickAt(px, py) {
    const body = bodyAt(px, py); if (body) return body;
    const rr = rayAt(px, py), hits = rr.intersectObjects(O.S.itemsG.children, true);
    for (const hit of hits) { let o = hit.object; while (o && o.userData.recId == null) o = o.parent; const it = o && o.visible && insts.get(o.userData.recId); if (it && !it.petAi) return it; } // (characters and pets: only by touching their body, below)
    return null;
  }
  // The character or pet a touch is really on: the ray against its body as it's posed right now (sitting, lying,
  // mid-step), bone by bone; drawn ones by their own shapes. Nothing when the touch is just near one.
  const RP = new T.Vector3();
  function bodyAt(px, py) {
    const rc = rayAt(px, py), ray = rc.ray; let best = null, bt = 1e9;
    for (const o of insts.values()) {
      if (!o.petAi || !o.group.visible) continue;
      if (o.cols && o.B) {
        o.group.updateMatrixWorld(true);
        for (const k of IH.rig3d.capsules(o, o.cols)) for (let i = 0; i <= 6; i++) {
          RP.copy(k.a).lerp(k.b, i / 6); if (ray.distanceSqToPoint(RP) > k.r * k.r) continue;
          const d = RP.sub(ray.origin).dot(ray.direction); if (d < bt) { bt = d; best = o; }
        }
      } else { const h = rc.intersectObject(o.group, true)[0]; if (h && h.distance < bt) { bt = h.distance; best = o; } }
    }
    return best;
  }

  // ---------- touch and mouse
  const ptrs = new Map(); let gesture = null;
  function onDown(e) {
    if (!O || O.away) return; try { O.cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
    sound();
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: CAM.zoom, moved: 99 }; return; }
    let kind = 'pan';
    if (O.held) {
      const g = O.held.inst.group.position.clone().project(O.S.cam), r = O.cv.getBoundingClientRect(), sx = (g.x + 1) / 2 * r.width + r.left, sy = (1 - g.y) / 2 * r.height + r.top;
      const near = Math.hypot(e.clientX - sx, e.clientY - sy) < Math.max(70, 26 * Math.max(...O.held.def.fp) * CAM.zoom * O.h / CAM.fitV / 2);
      const hitIt = pickAt(e.clientX, e.clientY) === O.held.inst;
      if (near || hitIt) kind = 'drag';
    }
    let carry = null;
    if (kind === 'pan') {
      const it = bodyAt(e.clientX, e.clientY); // only a touch on the body itself picks one up
      if (it && !(O.editing && it.rec.id !== KID)) { carry = it; kind = 'carry'; it.petAi.pos.copy(it.group.position); }
    }
    gesture = { kind, moved: 0, id: e.pointerId, carry };
  }
  function onMove(e) {
    if (O && O.away) return; const p = ptrs.get(e.pointerId); if (!p || !gesture) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; gesture.moved += Math.abs(dx) + Math.abs(dy);
    if (gesture.kind === 'pinch' && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (gesture.d0) setZoom(gesture.z0 * d / gesture.d0); return; }
    if (gesture.kind === 'drag') { moveHeldTo(e.clientX, e.clientY - 18); return; }
    if (gesture.kind === 'carry') { if (gesture.moved > 6) carryTo(gesture.carry, e.clientX, e.clientY); return; }
    if (gesture.kind === 'pan' && gesture.moved > 6) pan(dx, dy);
  }
  function onUp(e) {
    const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!gesture) return;
    const g = gesture; if (ptrs.size === 0) gesture = null; else return;
    if (g.kind === 'carry' && g.carry.petAi.carried) { putDown(g.carry); return; }
    if (g.kind === 'pinch' || g.moved > 10 || !p) return;
    tap(p.x0, p.y0);
  }
  // ---- collision: the one test for walking and carrying. A step from cell a to cell b is blocked by a wall between
  // them (the outside walls only open at the door), by furniture standing in b (usable seats and beds excepted, so
  // things can be put on them), by trees, and by the edge of the plot.
  function blockedCell(x, z, o) {
    const c = O.home.cells.get(key(x, z)); if (!c || c.fixed) return true;
    const id = o.floor.get(key(x, z)); if (!id) return false;
    const it = insts.get(id); if (o.carry) return !it || topOf(it) > CARRY_MAX;
    return !(it && it.def.use);
  }
  // How high the top of a piece of furniture is above its floor: the mattress or seat for things with actions,
  // the table top for surfaces, otherwise the top of the model (worked out once and kept).
  const CARRY_MAX = 1.3, CARRY_GAP = 0.7;
  function topOf(it) {
    if (it.topH != null) return it.topH;
    const u = it.def.use; if (u && u.h != null && ['sit', 'lie', 'nest', 'on'].includes(u.kind)) return (it.topH = u.h);
    if (it.def.surf) return (it.topH = it.def.surf);
    const b = new T.Box3().setFromObject(it.group); return (it.topH = Math.max(0, b.max.y - it.group.position.y));
  }
  // the floor or furniture top under a point
  function groundAt(x, z, o) {
    const k = key(Math.floor(x), Math.floor(z)), c = O.home.cells.get(k), y = c ? c.y : 0, id = o.floor.get(k), it = id && insts.get(id);
    return it ? y + topOf(it) : y;
  }
  const BODY = [[0, 0], [0.22, 0.22], [-0.22, 0.22], [0.22, -0.22], [-0.22, -0.22]];
  function wallBetween(ax, az, bx, bz) {
    if (bx === ax + 1 && bz === az) return O.home.walls.has('v' + key(bx, bz));
    if (bx === ax - 1 && bz === az) return O.home.walls.has('v' + key(ax, az));
    if (bz === az + 1 && bx === ax) return O.home.walls.has('h' + key(bx, bz));
    if (bz === az - 1 && bx === ax) return O.home.walls.has('h' + key(ax, az));
    return false;
  }
  function canStep(ax, az, bx, bz, o) {
    if (ax === bx && az === bz) return true;
    if (blockedCell(bx, bz, o)) return false;
    if (ax !== bx && az !== bz) return canStep(ax, az, bx, az, o) && canStep(bx, az, bx, bz, o) || canStep(ax, az, ax, bz, o) && canStep(ax, bz, bx, bz, o);
    return !wallBetween(ax, az, bx, bz);
  }
  // Carrying a character or pet: it lifts and follows the finger (every frame, smooth), but it moves there in small
  // steps and slides along anything in the way, so it never passes through a wall or a piece of furniture.
  function carryTo(inst, x, y) {
    inst.floorY = null; inst.fitMode = null;
    const A = inst.petAi, p = floorHit(x, y + 30); if (!p) return; A.task = null; A.doing = null; A.slide = null; A.plan = []; inst.holding = null; if (inst.handMesh) inHand(inst, null); if (inst.carrying) stoolHome(inst); if (inst.onStool) { inst.carrying = inst.onStool; inst.onStool = null; stoolHome(inst); }
    if (A.use) { const w = insts.get(A.use.id); if (w && A.use.on) w.rec.on = false; }
    const b = O.home.bounds, o = A.carryOcc || (A.carryOcc = Object.assign(occ(inst.rec.id), { carry: true })); A.carried = true; A.path = []; A.st = 'stand'; A.use = null;
    moveCarried(inst, clamp(p.x, b.x0 + 0.3, b.x1 - 0.3), clamp(p.z, b.z0 + 0.3, b.z1 - 0.3), o);
  }
  function moveCarried(inst, gx, gz, o) {
    const A = inst.petAi;
    let cx = A.pos.x, cz = A.pos.z;
    // short hops (never more than 0.08 of a tile), so a step can never skip over a wall
    for (let i = 0; i < 120; i++) {
      const rx = gx - cx, rz = gz - cz, rd = Math.hypot(rx, rz); if (rd < 1e-3) break;
      const k = Math.min(1, 0.08 / rd), sx = rx * k, sz = rz * k;
      // the whole body must fit: every corner of it steps from its own cell, so it can't graze a wardrobe edge
      const ok = (nx, nz) => BODY.every(([ox, oz]) => canStep(Math.floor(cx + ox), Math.floor(cz + oz), Math.floor(nx + ox), Math.floor(nz + oz), o));
      if (ok(cx + sx, cz + sz)) { cx += sx; cz += sz; } else if (ok(cx + sx, cz)) cx += sx; else if (ok(cx, cz + sz)) cz += sz; else break;
    }
    A.pos.x = cx; A.pos.z = cz;
    // held the same height above whatever is underneath (floor, bed, table, sofa)
    A.pos.y = Math.max(...BODY.map(([ox, oz]) => groundAt(cx + ox, cz + oz, o))) + CARRY_GAP;
    inst.group.position.copy(A.pos);
  }
  // Letting go: on or right next to something usable (a seat, a bed, a pet bed, the piano) it uses it; otherwise
  // it lands on the floor where you let go, or the nearest free spot, and stays a moment.
  function putDown(inst) {
    const A = inst.petAi; A.carried = false; A.carryOcc = null; sound('place');
    if (useNear(inst)) return;
    const o = occ(inst.rec.id), x0 = Math.floor(A.pos.x), z0 = Math.floor(A.pos.z), oid = o.floor.get(key(x0, z0)), on = oid && insts.get(oid);
    if (on && topOf(on) <= CARRY_MAX) { // let go over a table or the toy box: stands on top of it
      A.pos.y = groundAt(A.pos.x, A.pos.z, o); inst.group.position.copy(A.pos); A.st = 'stand'; A.until = (lastT || 0) + 4 + Math.random() * 3; return;
    }
    // on the floor where let go, moved just enough to have room (never inside anything)
    const P = IH.phys, sp = P && P.nearestClear(A.pos.x, A.pos.z, clsOf(inst));
    if (sp) A.pos.set(sp.x, P.floorAt(sp.x, sp.z), sp.z);
    else { const spot = nearestFree(x0, z0, o) || [Math.floor(inst.rec.x || 0), Math.floor(inst.rec.z || 0)], c = O.home.cells.get(key(spot[0], spot[1])); A.pos.set(r0(A.pos.x, spot[0]), c ? c.y : 0, r0(A.pos.z, spot[1])); }
    inst.group.position.copy(A.pos);
    A.st = 'stand'; A.until = (lastT || 0) + 2.5 + Math.random() * 2;
    if (inst.rec.id !== KID) { inst.rec.x = Math.floor(A.pos.x); inst.rec.z = Math.floor(A.pos.z); save(); }
  }
  // Finds a thing with actions under or within reach of where it was let go, and starts using it (see USE in items.js).
  function useNear(inst) {
    const A = inst.petAi, kid = inst.pet === 'kid', inUse = id => [...insts.values()].filter(o => o.petAi && o !== inst && o.petAi.use && o.petAi.use.id === id);
    let best = null, bd = 1.0;
    for (const it of insts.values()) {
      const u = it.def.use; if (!u || it === inst || it.petAi) continue;
      if (kid ? !u.kid : (u.pets === false || !u.pet)) continue;
      const [w, d] = fp(it.def, it.rec.r || 0), dx = Math.max(it.rec.x - A.pos.x, 0, A.pos.x - (it.rec.x + w)), dz = Math.max(it.rec.z - A.pos.z, 0, A.pos.z - (it.rec.z + d)), dist = Math.hypot(dx, dz);
      const free = u.kind === 'lie' ? !inUse(it.rec.id).some(o => (o.pet === 'kid') === kid) : inUse(it.rec.id).length < (u.seats || [0]).length;
      if (dist < bd && free) { bd = dist; best = it; }
    }
    return best ? useItem(inst, best) : false;
  }
  // Can this character or pet use this thing now (is there a free seat, a free side of the bed)?
  function canUse(inst, it) {
    const u = it.def.use, kid = inst.pet === 'kid'; if (!u || it.petAi) return false;
    if (kid ? !u.kid : (u.pets === false || !u.pet)) return false;
    const others = [...insts.values()].filter(o => o.petAi && o !== inst && o.petAi.use && o.petAi.use.id === it.rec.id);
    return u.kind === 'lie' ? !others.some(o => (o.pet === 'kid') === kid) : others.length < (u.seats || [0]).length;
  }
  // Starts using a thing: sits, lies, stands or plays at it (the spot and way round come from its USE entry).
  function useItem(inst, best, how = {}) {
    const A = inst.petAi, kid = inst.pet === 'kid', inUse = id => [...insts.values()].filter(o => o.petAi && o !== inst && o.petAi.use && o.petAi.use.id === id);
    const u = best.def.use, ry = (best.rec.r || 0) * Math.PI / 2, c = best.group.position, rot = (x, z) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
    const depth = best.def.fp[1];
    let lx = 0, lz = 0, yaw = ry, y = c.y + (u.h || 0), seat = 0;
    if (u.kind === 'sit') {
      const seats = u.seats || [0], taken = inUse(best.rec.id).map(o => o.petAi.use.seat); let sd = 1e9;
      seats.forEach((sx, i) => { if (taken.includes(i)) return; const [wx, wz] = rot(sx, 0), dd = Math.hypot(c.x + wx - A.pos.x, c.z + wz - A.pos.z); if (dd < sd) { sd = dd; seat = i; } });
      lx = seats[seat]; lz = kid ? -0.2 : 0.05; if (kid) y -= 0.41; // hips over the middle of the seat (they sit forward of the feet spot); phys.js settles them
    } else if (u.kind === 'lie') {
      // the character always lies in the middle of the bed, head on the pillow; a pet lies where it was let go,
      // anywhere the character isn't (moved to the nearer side if it would be on them)
      const w = best.def.fp[0], toL = (x, z) => [(x - c.x) * Math.cos(ry) - (z - c.z) * Math.sin(ry), (x - c.x) * Math.sin(ry) + (z - c.z) * Math.cos(ry)];
      const KZ = [-depth / 2 + 1.05, -depth / 2 + 2.55], onKid = (x, z) => Math.abs(x) < 0.62 && z > KZ[0] && z < KZ[1], side = x => (x < 0 ? -1 : 1) * (w / 2 - 0.32);
      if (kid) {
        lx = 0; lz = -depth / 2 + 2.4; y -= 0.14; // half a tile (about 25 cm) down from the headboard
        inst.floorY = c.y + u.h - 0.02; // the mattress: the body is kept on it, never in it
        const pet = inUse(best.rec.id)[0]; // a pet already in the middle shuffles over
        if (pet) { const P = pet.petAi.pos, [px, pz] = toL(P.x, P.z); if (onKid(px, pz)) { const [qx, qz] = rot(side(px), pz); P.set(c.x + qx, P.y, c.z + qz); pet.group.position.copy(P); } }
      } else {
        [lx, lz] = toL(A.pos.x, A.pos.z); lx = clamp(lx, -w / 2 + 0.32, w / 2 - 0.32); lz = clamp(lz, -depth / 2 + 0.4, depth / 2 - 0.4);
        if (inUse(best.rec.id).length && onKid(lx, lz)) lx = side(lx);
      }
    }
    else if (u.kind === 'nest') { [lx, lz] = u.at || [0, 0]; }
    else if (u.kind === 'on') { /* on top, in the middle */ }
    else { lz = depth / 2 + (u.gap || 0.6); yaw = ry + (u.face === 'away' ? 0 : Math.PI); y = c.y; }
    const [wx, wz] = rot(lx, lz);
    if (u.kind === 'front' && how.stay) { yaw = Math.atan2(c.x - A.pos.x, c.z - A.pos.z) + (u.face === 'away' ? Math.PI : 0); A.pos.y = IH.phys ? IH.phys.floorAt(A.pos.x, A.pos.z) : y; } // stays where it walked to, facing the thing
    else A.pos.set(c.x + wx, y, c.z + wz);
    A.yaw = yaw; A.path = [];
    const [d0, d1] = u.dur || [15, 30];
    A.task = null; A.doing = null;
    A.use = { id: best.rec.id, t: best.def.t, since: lastT || 0, gives: (IH.life && IH.life.GIVES[best.def.t] || {})[kid ? 'kid' : 'pet'] || null, pose: kid ? u.kid : u.pet, moves: (kid ? u.kidMoves : u.petMoves) || null, nextMove: (lastT || 0) + 5 + Math.random() * 4, seat, fx: u.fx, on: u.on, until: (lastT || 0) + d0 + Math.random() * (d1 - d0), nextFx: 0 };
    // getting into bed: lie down, then straight away pull the duvet up over themselves
    if (kid && u.kind === 'lie' && A.use.moves && A.use.moves.includes('liebed.covers')) { A.use.queue = ['liebed.covers']; A.use.nextMove = (lastT || 0) + 0.9; }
    if (u.on) { best.rec.on = true; }
    // the body fits itself to the thing (phys.js): sits into a seat against its back, or stands clear of it
    inst.fit = { z: 0, y: 0, recline: 0 }; inst.fitMode = kid && u.kind === 'sit' && u.kid === 'sitchair' ? 'seat' : u.kind === 'front' ? 'clear' : null;
    if (!kid && IH.phys && (u.kind === 'sit' || u.kind === 'nest')) { const s = IH.phys.support(A.pos.x, A.pos.y + 0.6, A.pos.z); if (s > -1e8) A.pos.y = s; } // a pet sits on the cushion itself
    if (!how.stay) { inst.group.position.copy(A.pos); inst.group.rotation.set(0, yaw, 0); }
    if (u.fx === 'notes') sound('tune');
    return true;
  }
  // A little effect over a character while it uses something.
  const FX = { notes: ['♪', '♫'], zzz: ['💤'], sparkle: ['✨'], bubbles: ['🫧'] };
  function useFx(inst, t) {
    const U = inst.petAi.use; if (!U.fx || t < U.nextFx) return; U.nextFx = t + (U.fx === 'zzz' ? 2.4 : 0.8);
    const v = inst.group.position.clone().add(new T.Vector3(0, inst.pet === 'kid' ? 2.1 : 0.9, 0)).project(O.S.cam), r = O.cv.getBoundingClientRect(), f = FX[U.fx];
    float((v.x + 1) / 2 * r.width + r.left + (Math.random() - 0.5) * 36, (1 - v.y) / 2 * r.height + r.top, f[Math.floor(Math.random() * f.length)]);
  }
  // The nearest free floor reachable from a cell without going through a wall (a walk outward, doorways only).
  function nearestFree(x0, z0, o) {
    if (walkable(x0, z0, o)) return [x0, z0];
    const seen = new Set([key(x0, z0)]), q = [[x0, z0]];
    while (q.length && seen.size < 300) {
      const [x, z] = q.shift();
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        const k = key(nx, nz); if (seen.has(k) || !O.home.cells.has(k) || wallBetween(x, z, nx, nz)) continue; seen.add(k);
        if (walkable(nx, nz, o)) return [nx, nz]; q.push([nx, nz]);
      }
    }
    return null;
  }
  // Getting up: steps off onto the nearest free floor.
  function leaveUse(inst) {
    inst.floorY = null; inst.fitMode = null;
    const A = inst.petAi, was = A.use && insts.get(A.use.id); if (was && A.use.on) was.rec.on = false;
    if (was && inst.pet === 'kid') { const w = was.def.t; if (w === 'bed' || w === 'bunk') lifeState().messy.add(was.rec.id); if (w === 'kitchen' || w === 'stove') lifeState().dirty.add(was.rec.id); } // a chore for later
    const u = was && was.def.use, P = IH.phys, cls = clsOf(inst);
    if (A.use && A.use.watch) { const tv = insts.get(A.use.watch); if (tv) tv.rec.on = false; }
    const ate = A.use && A.use.eat, bathed = A.use && A.use.bath;
    A.use = null; A.slide = null; A.task = null; A.doing = null;
    if (!P) return;
    // off a seat, a bed or a pet bed: steps down onto the floor in front (or beside), with room for the body
    let sp = null;
    if (was && u && ['sit', 'lie', 'nest', 'on'].includes(u.kind)) {
      // a seat: off the front edge; a bed or anything else: off a side or the end, the nearest with room; never
      // across a wall (a bed against the wall is got out of on the open side)
      const [, rot] = rotOf(was), c = was.group.position, [w, d] = was.def.fp, me = { x: A.pos.x, z: A.pos.z };
      const lx = (() => { const ry = (was.rec.r || 0) * Math.PI / 2, dx = A.pos.x - c.x, dz = A.pos.z - c.z; return dx * Math.cos(ry) - dz * Math.sin(ry); })();
      const cand = u.kind === 'sit' ? [[lx, d / 2 + 0.5]] : [[-(w / 2 + 0.45), 0], [w / 2 + 0.45, 0], [lx, d / 2 + 0.5], [lx, -(d / 2 + 0.5)]];
      let bd = 1e9;
      for (const [x, z] of cand) { const [fx, fz] = rot(x, z), q = P.nearestClear(c.x + fx, c.z + fz, cls); if (!q || !P.wallFree(me, q) || Math.hypot(q.x - c.x - fx, q.z - c.z - fz) > 0.8) continue; const dd = Math.hypot(q.x - me.x, q.z - me.z); if (dd < bd) { bd = dd; sp = q; } }
    }
    if (!sp) { const q = P.nearestClear(A.pos.x, A.pos.z, cls); if (q && P.wallFree(A.pos, q)) sp = q; } if (!sp) return;
    A.path = [sp]; A.st = 'walk'; A.free = true; A.wantYaw = null; A.until = (lastT || 0) + 1.5;
    if (ate) A.afterMeal = true; // the plate, once it's up
    if (bathed) A.afterBath = true; // the plug, the towel
  }
  // ---------- life: needs, wants, leisure and chores (life.js does the thinking; this walks them there and back)
  const L = () => IH.life, kindOf = inst => inst.pet === 'kid' ? 'kid' : 'pet';
  const PLANTS = new Set(['monstera', 'cactus', 'fern', 'bonsai', 'vase', 'lemontree', 'vegbed', 'fruittree']);
  const lifeState = () => O.life || (O.life = { dust: [], bowls: [], plates: [], towels: [], thirst: {}, messy: new Set(), dirty: new Set(), nextDust: 0 });
  const nameOf = inst => !inst || !inst.def ? '' : inst.pet === 'kid' ? (O.kid.name || 'You') : String(inst.def.name || 'Pet').split(' ')[0];
  // a thought or a little sign over someone's head
  function bubble(inst, s) {
    // a thought now and then, never a stream: one every 1.5 s at most, and not the same one twice within 4 s
    const now = performance.now(), B = inst.bub || (inst.bub = { at: 0, last: '', lastAt: 0 }); if (now - B.at < 1500 || (s === B.last && now - B.lastAt < 4000)) return; B.at = now; B.last = s; B.lastAt = now;
    const v = inst.group.position.clone().add(new T.Vector3(0, inst.pet === 'kid' ? 2.5 : inst.petAi ? 1.1 : 1.4, 0)).project(O.S.cam), r = O.cv.getBoundingClientRect();
    float((v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top, s);
  }
  const blob = fn => { const k = new IH.kit.Kit(); fn(k); return k.build(); };
  // On each beat: needs run down and fill up with what each is doing (company counts: being near each other),
  // plants get thirsty and dust settles now and then.
  function lifeTick(t, dt) {
    if (!IH.life || !dt) return; const S = lifeState(), night = O.st.look.phase === 'night', kid = insts.get(KID);
    for (const inst of insts.values()) {
      const A = inst.petAi; if (!A || !A.pos) continue; const k = kindOf(inst); inst.needs = inst.needs || L().make(k);
      let g = A.use ? A.use.gives : A.doing ? A.doing.gives : A.st === 'sleep' ? { energy: 1.2 } : A.st === 'sit' ? { energy: 0.3 } : null;
      const near = [...insts.values()].some(o => o !== inst && o.petAi && o.petAi.pos && (inst === kid || o === kid) && o.petAi.pos.distanceTo(A.pos) < 1.8);
      if (near) g = Object.assign({ friends: inst === kid ? 0.5 : 0.8 }, g);
      L().tick(inst.needs, k, dt, g, night);
    }
    for (const it of insts.values()) if (PLANTS.has(it.def.t)) S.thirst[it.rec.id] = Math.min(100, (S.thirst[it.rec.id] != null ? S.thirst[it.rec.id] : Math.random() * 50) + dt * 0.05);
    if (t > S.nextDust) { if (S.nextDust && S.dust.length < 4) addDust(); S.nextDust = t + 240 + Math.random() * 240; }
  }
  function addDust() {
    const o = occ(null), free = [...O.home.cells.values()].filter(c => c.zone === 'in' && !c.fixed && !o.floor.has(key(c.x, c.z))); if (!free.length) return;
    const c = free[Math.floor(Math.random() * free.length)], pos = new T.Vector3(c.x + 0.25 + Math.random() * 0.5, c.y + 0.02, c.z + 0.25 + Math.random() * 0.5);
    const mesh = blob(k => { k.ball(0.13, 0, 0, 0, '#b9ad9e', { s: [1, 0.22, 1], n: 8 }); k.ball(0.08, 0.15, 0, 0.08, '#cabfb1', { s: [1, 0.3, 1], n: 8 }); k.ball(0.06, -0.12, 0, 0.11, '#a89c8d', { s: [1, 0.3, 1], n: 6 }); });
    mesh.position.copy(pos); O.S.scene.add(mesh); lifeState().dust.push({ pos, mesh });
  }
  function addBowl(kid, pet) {
    // put down near the character, in the most open spot nearby (room for the pet to stand and eat, not by the bed)
    const a = kid.petAi.pos, b = pet.petAi.pos, P = IH.phys, f = [Math.sin(kid.petAi.yaw), Math.cos(kid.petAi.yaw)];
    let q = { x: a.x + f[0] * 0.55, z: a.z + f[1] * 0.55 };
    if (P) { const c = P.nearestClear(q.x, q.z, 'pet', 0.65); if (c && P.wallFree(a, c) && Math.hypot(c.x - a.x, c.z - a.z) < 2.5) q = c; else { const c2 = P.nearestClear((a.x + b.x) / 2, (a.z + b.z) / 2, 'pet', 0.45); if (c2 && P.wallFree(a, c2)) q = c2; } }
    const pos = new T.Vector3(q.x, P ? P.floorAt(q.x, q.z) + 0.01 : b.y + 0.01, q.z);
    const mesh = blob(k => { k.cyl(0.24, 0.13, 0, 0, 0, '#ff8fae', { rt: 0.28, n: 16 }); k.cyl(0.22, 0.02, 0, 0.1, 0, '#a8693f', { n: 14 }); for (let i = 0; i < 5; i++) k.ball(0.045, Math.cos(i * 1.3) * 0.11, 0.13, Math.sin(i * 1.3) * 0.11, '#c98a52', { n: 6 }); });
    mesh.position.copy(pos); O.S.scene.add(mesh); lifeState().bowls.push({ pet, pos, mesh }); pet.petAi.until = 0;
  }
  const unscene = (list, x) => { const i = list.indexOf(x); if (i >= 0) list.splice(i, 1); if (x && x.mesh) O.S.scene.remove(x.mesh); };
  // a free seat that faces the TV (to watch it from), the nearest one
  function seatFacing(inst, tv) {
    let best = null, bd = 9;
    for (const it of insts.values()) {
      const u = it.def.use; if (!u || u.kind !== 'sit' || u.kid !== 'sitchair' || !canUse(inst, it)) continue;
      const [ry] = rotOf(it), c = it.group.position, dx = tv.group.position.x - c.x, dz = tv.group.position.z - c.z, d = Math.hypot(dx, dz);
      if (d > 1.5 && d < bd && (Math.sin(ry) * dx + Math.cos(ry) * dz) / d > 0.55) { bd = d; best = it; }
    }
    return best;
  }
  // The part of the day, from the clock on the device (the prototype's Night look counts as night, Sunset as evening)
  function dayPart() {
    const ph = O.st.look.phase; if (ph === 'night') return 'night'; if (ph === 'dusk') return 'evening';
    const h = new Date().getHours(); return h < 6 ? 'night' : h < 9 ? 'morning' : h < 12 ? 'day' : h < 14 ? 'midday' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  }
  // the cupboard tools live in (a wardrobe, drawers, the kitchen, a bookcase), the nearest
  function cupboard(inst) { let best = null, bd = 1e9; for (const it of insts.values()) if (['wardrobe', 'drawers', 'kitchen', 'nightstand'].includes(it.def.t)) { const d = it.group.position.distanceTo(inst.petAi.pos); if (d < bd) { bd = d; best = it; } } return best; }
  // lamps left on (not the star night-light, not the garden lamp), nearest first from a point
  const lampsOn = from => [...insts.values()].filter(it => it.def.act === 'lamp' && it.rec.on !== false && !['nightlight', 'lamppost'].includes(it.def.t) && (it.def.where !== 'out')).sort((a, b) => a.group.position.distanceTo(from) - b.group.position.distanceTo(from));
  // Weighs everything it could do now and sets off for the best (false: nothing worth doing, so it just wanders).
  function think(inst, t) {
    if (inst.visitor) return visitorThink(inst, t);
    if (!IH.life) return false;
    const A = inst.petAi, k = kindOf(inst), N = inst.needs || (inst.needs = L().make(k)), S = lifeState(), opts = [];
    const dist = p => Math.hypot(p.x - A.pos.x, p.z - A.pos.z), kid = insts.get(KID), pets = [...insts.values()].filter(o => o.petAi && o.pet !== 'kid');
    for (const it of insts.values()) {
      const G = L().GIVES[it.def.t], gv = G && G[k]; if (!gv || !canUse(inst, it)) continue;
      const d = it.def.use.dur || [15, 30];
      if (k === 'kid' && it.def.t === 'tv') { const seat = seatFacing(inst, it); if (seat) { opts.push({ type: 'use', it: seat, watch: it, gives: gv, dur: 270, dist: dist(seat.group.position), same: A.last === seat.rec.id, think: G.think, when: 'tv' }); continue; } }
      const D2 = L().DUR[it.def.t] || d;
      opts.push({ type: 'use', it, gives: gv, dur: (D2[0] + D2[1]) / 2, dist: dist(it.group.position), same: A.last === it.rec.id, think: G.think, when: it.def.t });
    }
    if (k === 'kid') {
      const C = L().CHORES, chore = (c, target, urgent) => opts.push({ type: 'chore', chore: c, target, when: c, amount: C[c].friends ? { friends: C[c].friends } : { tidy: C[c].tidy }, urgent, dist: dist(target.pos || (target.petAi ? target.petAi.pos : target.group.position)), think: C[c].think, same: A.lastChore === c && c === 'pat' });
      for (const id of S.messy) { const b = insts.get(id); if (b && !insts.get(KID).petAi.use) chore('makebed', b, 0.35); }
      for (const it of insts.values()) if (PLANTS.has(it.def.t) && it.def.kind !== 'wall' && (S.thirst[it.rec.id] || 0) > 60) chore('water', it, (S.thirst[it.rec.id] - 60) / 40);
      for (const p of pets) {
        if (p.petAi.carried) continue;
        if (p.needs && p.needs.food < 30 && !S.bowls.some(b => b.pet === p)) chore('feed', p, 0.4 + (30 - p.needs.food) / 30);
        if (!(p.petAi.use && /^sleep/.test(p.petAi.use.pose)) && p.petAi.st !== 'sleep') chore('pat', p, 0);
      }
      for (const d of S.dust) chore('sweep', { pos: d.pos, dust: d }, 0.12 * S.dust.length);
      for (const id of S.dirty) { const it = insts.get(id); if (it) chore('dishes', it, 0.4); }
      for (const pl of S.plates) chore('plate', { pos: pl.pos, plate: pl }, 0.3);
      for (const tw of S.towels) chore('towel', { pos: tw.pos, towel: tw }, 0.3);
      const MW = mowerOut(), lg = hasLawn() ? lawnGrowth() : 0; if (MW && lg >= 1 && !O.mowing && !myJob()) chore('mow', MW, 0.4 + (lg - 1));
      opts.push({ type: 'do', pose: 'look', here: true, gives: { fun: 0.05 }, dur: 20, dist: 0 });
    } else {
      // A pet does pet things only, in its own animal's way (life.js PETS): eats what was put down for it, begs
      // when hungry, keeps the character company, curls up to sleep (a pet bed, the bed or sofa if it climbs, or
      // just where it is), plays with toys, explores and sniffs about, climbs up on furniture, scratches an itch.
      const sp = L().PETS[inst.pet] || L().PETS.cat, wt = (o, w) => { if (w > 0) { o.w = w; opts.push(o); } };
      for (let i = opts.length - 1; i >= 0; i--) { const u = opts[i].it.def.use; if (!sp.climb && (u.kind === 'sit' || u.kind === 'lie')) opts.splice(i, 1); else opts[i].w = u.kind === 'nest' || u.kind === 'lie' || u.kind === 'sit' ? sp.sleep : sp.toy; } // pet beds; up on the bed or sofa only for climbers
      const bowl = S.bowls.find(b => b.pet === inst);
      if (bowl) opts.push({ type: 'do', pose: 'eat', at: bowl.pos, face: bowl.pos, gives: { food: 2.5 }, dur: 30, urgent: 0.8, dist: dist(bowl.pos), think: '😋', bowl });
      if (kid && !kid.petAi.carried) {
        if (N.food < 30 && !bowl) opts.push({ type: 'do', pose: 'look', near: kid, gives: null, dur: 20, urgent: (30 - N.food) / 30, dist: dist(kid.petAi.pos), think: '🍽️' }); // comes to beg
        opts.push({ type: 'do', pose: 'sit', near: kid, gives: { friends: 0.6 }, dur: 60, dist: dist(kid.petAi.pos), think: '💛', same: A.lastDo === 'near' });
      }
      wt({ type: 'do', pose: inst.pet === 'cat' ? 'sleep.curl' : 'sleep', here: true, gives: { energy: 0.4 }, dur: 120, dist: 0, think: '💤' }, sp.sleep);
      for (const toy of [...insts.values()].filter(o => ['teddy', 'robot', 'globe'].includes(o.def.t))) {
        if (toy.doll && !(toy.restUntil > t)) { const c = toy.doll.centre(), busy = toy.doll.heldBy().length; wt({ type: 'do', pose: 'play.nudge', at: c, face: c, gives: { fun: 1.1 }, dur: 30 + Math.random() * 25, dist: dist(c), think: busy ? '💪' : '🧸', same: A.lastDo === 'toy', tag: 'toy', play: toy }, sp.toy * (busy ? 1.8 : 1.3)); continue; } // a soft toy to really play with (and join in if someone else has it)
        wt({ type: 'do', pose: 'look.paw', at: toy.group.position, face: toy.group.position, gives: { fun: 0.6 }, dur: 40, dist: dist(toy.group.position), think: '🧶', same: A.lastDo === 'toy', tag: 'toy' }, sp.toy);
      }
      // exploring: off to somewhere it hasn't sniffed lately
      if (IH.phys) { const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 4, q = IH.phys.nearestClear(A.pos.x + Math.sin(a) * d, A.pos.z + Math.cos(a) * d, 'pet'); if (q) wt({ type: 'do', pose: 'look.sniff', at: new T.Vector3(q.x, A.pos.y, q.z), reach: 0.01, gives: { fun: 0.25 }, dur: 10, dist: d, think: '👃', tag: 'explore', same: A.lastDo === 'explore' }, sp.explore); }
      wt({ type: 'do', pose: 'sit.scratch', here: true, gives: { fun: 0.1 }, dur: 6, dist: 0, tag: 'scratch', same: A.lastDo === 'scratch', urgent: 0.05 }, sp.scratch);
      // climbing up on furniture: a table top, the desk, drawers, the bedside table
      if (sp.climb) for (const it of insts.values()) if (it.def.surf && it.def.kind === 'floor' && it.def.surf < 2) wt({ type: 'perch', it, gives: { energy: 0.25, fun: 0.25 }, dur: 90, dist: dist(it.group.position), think: '⤴️', same: A.lastDo === 'perch' }, sp.climb);
    }
    const part = dayPart();
    for (const o of opts) o.score = L().score(N, o) * (o.when ? L().when(o.when, part) : 1) * (o.w != null ? o.w : 1);
    const pick = L().choose(opts);
    if (!pick) return false;
    // Some things are a few steps: a chore with a tool fetches it from the cupboard first and puts it back after;
    // going to bed at night switches the lamps off on the way (the bedside one last, from the bed).
    if (k === 'kid' && pick.type === 'chore' && pick.chore === 'mow') { const mp = mowPlan(inst, pick.target); A.plan = mp.slice(1); if (go(inst, mp[0], t)) return true; A.plan = []; return false; }
    if (k === 'kid' && pick.type === 'use' && /^bath2?$/.test(pick.it.def.t)) { const bp = bathPlan(inst, pick.it); A.plan = bp.slice(1); if (go(inst, bp[0], t)) return true; A.plan = []; }
    if (k === 'kid' && pick.type === 'use' && /^(kitchen|kitchen2|stove|fridge|fridge2|pantry)$/.test(pick.it.def.t)) { const mp = mealPlan(inst); if (mp) { A.plan = mp.slice(1); if (go(inst, mp[0], t)) return true; A.plan = []; } }
    const plan = [pick];
    const C = pick.type === 'chore' && L().CHORES[pick.chore];
    if (C && C.tool && inst.holding !== C.tool) { const cb = cupboard(inst); if (cb) { plan.unshift({ type: 'step', target: cb, pose: 'fetch', dur: 3, end: 'take', tool: C.tool }); plan.push({ type: 'step', target: cb, pose: 'fetch', dur: 2.5, end: 'put' }); } else pick.tool = C.tool; }
    if (k === 'kid' && pick.type === 'use' && /^(bed|bunk)$/.test(pick.it.def.t) && (part === 'night' || part === 'evening')) {
      const bedP = pick.it.group.position, lamps = lampsOn(A.pos).filter(l => l.group.position.distanceTo(bedP) > 2.6);
      plan.unshift(...lamps.map(l => ({ type: 'step', target: l, pose: 'switch', dur: 1.6, end: 'lamp' })));
      if (lampsOn(bedP).some(l => l.group.position.distanceTo(bedP) <= 2.6)) pick.lampsAfter = true;
    }
    A.plan = plan.slice(1);
    if (go(inst, plan[0], t)) return true;
    A.plan = []; A.until = t + 1.5 + Math.random(); return false; // couldn't get there: a moment before thinking again (not every frame)
  }
  // ---- moving about (phys.js has the grid; these pick where to go and walk there)
  const clsOf = inst => inst.pet === 'kid' ? 'kid' : 'pet';
  const others = inst => [...insts.values()].filter(o => o !== inst && o.petAi && o.petAi.pos && !o.petAi.carried).map(o => ({ x: o.petAi.pos.x, z: o.petAi.pos.z, r: IH.phys.BODY[clsOf(o)].r }));
  const rotOf = it => { const ry = (it.rec.r || 0) * Math.PI / 2; return [ry, (x, z) => [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]]; };
  const spotNear = (inst, x, z) => IH.phys.nearestClear(x, z, clsOf(inst));
  // Where to walk to for an option: in front of the thing it's used from, beside the bed, at a seat's front edge,
  // or close enough to reach a plant, a pet or the dust, with room for the body and clear of everyone else.
  function targetFor(inst, o) {
    const P = IH.phys, cls = clsOf(inst), A = inst.petAi, av = others(inst);
    const item = o.type === 'use' || o.type === 'perch' ? o.it : (o.type === 'chore' || o.type === 'step') && o.target.def && !o.target.petAi ? o.target : null;
    if (item) {
      const u = item.def.use, c = item.group.position, [ry, rot] = rotOf(item), [w, d] = item.def.fp;
      if (o.how === 'home') { const p = placeOf(item.def, item.rec); return P.standSpot(p.x, p.z, 0.75, cls, A.pos, null, av); } // (the stool's own place)
      const kind = o.chore ? ({ makebed: 'lie', dishes: 'front' })[o.chore] || 'reach' : o.end === 'lamp' || o.type === 'perch' || o.how === 'reach' ? 'reach' : o.type === 'step' ? 'front' : u ? u.kind : 'reach';
      if (kind === 'front') { const [fx, fz] = rot(0, d / 2 + ((u && u.gap) || 0.6)); return P.standSpot(c.x + fx, c.z + fz, 0, cls, A.pos, null, av) || spotNear(inst, c.x + fx, c.z + fz); }
      if (kind === 'sit') { const seats = u.seats || [0], sx = seats[Math.floor(Math.random() * seats.length)], [fx, fz] = rot(sx, d / 2 + 0.45); return P.standSpot(c.x + fx, c.z + fz, 0, cls, A.pos, null, av); }
      if (kind === 'lie') return P.standSpot(c.x, c.z, Math.min(w, d) / 2 + 0.35, cls, A.pos, null, av);
      return P.standSpot(c.x, c.z, Math.max(w, d) * 0.3 + 0.4, cls, A.pos, ry, av); // a plant, a pet bed, the trampoline
    }
    const tp = o.at || (o.near ? o.near.petAi.pos : o.target && (o.target.pos || o.target.petAi.pos)); if (!tp) return null;
    const reach = o.reach != null ? o.reach : o.bowl ? 0.42 : o.near ? 0.8 : o.chore === 'sweep' ? 0.5 : o.chore === 'pat' || o.chore === 'feed' ? 0.75 : 0.6;
    return P.standSpot(tp.x, tp.z, reach, cls, A.pos, null, av);
  }
  // How the character's body keeps out of things when not walking (phys.js): 'clear' (standing: stands back just
  // enough), 'seat', or none. Leaving 'clear', whatever step back it took becomes where it really stands, so
  // nothing slides back when it moves off.
  function setFit(inst, mode) {
    if (inst.pet !== 'kid' || inst.fitMode === mode) return;
    const A = inst.petAi; if (inst.fitMode === 'clear' && inst.fit && inst.fit.z) { A.pos.x += Math.sin(A.yaw) * inst.fit.z; A.pos.z += Math.cos(A.yaw) * inst.fit.z; }
    inst.fit = { z: 0, y: 0, recline: 0 }; inst.fitMode = mode;
  }
  // ---------- the step stool for anything high. The character is small: a bench, the stove, the basin or the piano
  // is above where its hands can work, so it gets the stool, sets it in front, climbs up, does it standing on the
  // stool, climbs down and puts the stool back (or carries it on, when the next thing is high too).
  const WORK_H = { stove: 1.8, basin: 1.45, piano: 1.34, easel: 1.45 }; // (where the hands go, above the floor; else the top, surf)
  const workH = it => WORK_H[it.def.t] != null ? WORK_H[it.def.t] : it.def.surf != null && it.def.surf < 3 ? it.def.surf : null;
  const itemOfTask = o => o.type === 'use' ? o.it : (o.type === 'chore' || o.type === 'step' || o.type === 'do') && o.target && o.target.def && !o.target.petAi && !o.here ? o.target : null;
  function tooHigh(inst, it) {
    const h = it && workH(it); if (h == null || it.def.t === 'stool' || (it.def.use && it.def.use.kind && it.def.use.kind !== 'front')) return false;
    const A = inst.petAi, chest = inst.B && inst.B.chest ? inst.B.chest.getWorldPosition(new T.Vector3()).y - A.pos.y : 0.7;
    return it.group.position.y + h > (IH.phys ? IH.phys.floorAt(A.pos.x, A.pos.z) : A.pos.y) + chest + 0.4; // more than a forearm above the chest
  }
  const needsStool = (inst, o) => inst.pet === 'kid' && !inst.onStool && !o.stooled && o.how !== 'home' && tooHigh(inst, itemOfTask(o));
  function stoolNear(inst) {
    if (inst.carrying && inst.carrying.def.t === 'stool') return inst.carrying;
    return [...insts.values()].filter(o => o.def.t === 'stool' && !o.busy).sort((a, b) => a.group.position.distanceTo(inst.petAi.pos) - b.group.position.distanceTo(inst.petAi.pos))[0] || null;
  }
  function onStoolSteps(inst, o, ST) {
    const it = itemOfTask(o), U = it.def.use, G = L() && L().GIVES[it.def.t], Dr = (L() && L().DUR[it.def.t]) || (U && U.dur) || [10, 16];
    const main = o.type === 'use' ? { type: 'do', here: true, stooled: true, useOf: it, pose: (U && U.kid) || 'reach', face: it.group.position, dur: Dr[0] + Math.random() * (Dr[1] - Dr[0]), gives: G && G.kid, think: o.think } : Object.assign({}, o, { here: true, stooled: true, face: it.group.position });
    const pre = [];
    if (inst.carrying !== ST) pre.push({ type: 'step', target: ST, how: 'reach', pose: 'fetch', dur: 1.2, stooled: true, end: () => carryStool(inst, ST) });
    pre.push({ type: 'step', target: it, how: 'front', pose: 'place', dur: 0.7, stooled: true, end: () => setStool(inst) }, { type: 'step', here: true, pose: 'stand', dur: 0.6, stooled: true, start: t2 => climb(inst, true, t2) });
    const post = [{ type: 'step', here: true, pose: 'stand', dur: 0.6, stooled: true, start: t2 => climb(inst, false, t2) }, { type: 'step', target: ST, how: 'home', pose: 'place', dur: 0.9, stooled: true, stoolHome: true, end: () => stoolHome(inst) }];
    return [...pre, main, ...post];
  }
  function noStool(inst, always) {
    bubble(inst, '🪜'); if (O.toldStool && !always) return; O.toldStool = true;
    toast(O.st.owned.stool > 0 ? 'That’s too high to reach. Put your step stool out in the home (it’s in your storage).' : 'That’s too high to reach. Get a step stool from the Shop under Kitchen.');
  }
  function go(inst, o, t) {
    const A = inst.petAi;
    if (o.skipIf && o.skipIf()) return false;
    if (o.stoolHome && inst.carrying && (A.plan || []).slice(0, 4).some(n => needsStool(inst, n))) return false; // something else high next: it keeps the stool
    if (needsStool(inst, o)) {
      const ST = stoolNear(inst);
      if (ST) { const S = onStoolSteps(inst, o, ST); A.plan = [...S.slice(1), ...(A.plan || [])]; return go(inst, S[0], t); }
      noStool(inst); A.until = t + 2; return false; // can't reach it without one: it doesn't (it says so)
    }
    if (o.type === 'eat') { const seat = seatFor(inst); if (!seat) { o.type = 'do'; o.pose = 'snack'; o.here = true; o.dur = 60; o.gives = { food: 1.4 }; return arrive(inst, o, t); } return go(inst, { type: 'use', it: seat, eat: o.recipe, think: o.think }, t); }
    if (o.here) return arrive(inst, o, t);
    if (!IH.phys) return false;
    const tg = targetFor(inst, o); if (!tg) return false;
    const near = Math.hypot(tg.x - A.pos.x, tg.z - A.pos.z) < 0.1, path = near ? [] : IH.phys.route(A.pos, tg, clsOf(inst)); if (!path) return false;
    if (!path.length) { A.task = o; o.spot = tg; return arrive(inst, o, t); } // already there
    setFit(inst, null); A.wantYaw = null;
    A.task = o; o.spot = tg; A.path = path; A.st = 'walk'; A.free = false; A.stuck = 0; if (o.think && !o.tries) bubble(inst, o.think);
    // a pet being visited stays put for it
    if (o.type === 'chore' && o.target.petAi && !o.target.petAi.use && !o.target.petAi.task) { const p = o.target.petAi; p.path = []; p.st = 'sit'; p.until = Math.max(p.until, t + 8); }
    return true;
  }
  // wandering: somewhere nearby with room, any way
  function wander(inst, t) {
    const A = inst.petAi, P = IH.phys; if (!P) return false;
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * 3.5, sp = P.nearestClear(A.pos.x + Math.sin(a) * d, A.pos.z + Math.cos(a) * d, clsOf(inst)); if (!sp) continue;
      const path = P.route(A.pos, sp, clsOf(inst)); if (path) { setFit(inst, null); A.wantYaw = null; A.path = path; A.st = 'walk'; A.free = false; A.stuck = 0; return true; }
    }
    return false;
  }
  // a move from one spot to another drawn over a short time (a hop up or down arcs over)
  function drawSlide(g, A, t) {
    if (!A.slide) return; const p = clamp((t - A.slide.t0) / A.slide.dur, 0, 1), e = ease(p);
    g.position.lerpVectors(A.slide.from, A.pos, e); if (A.slide.arc) g.position.y += Math.sin(Math.PI * p) * A.slide.arc; if (p >= 1) A.slide = null;
  }
  // turning to face something, smoothly (never a snap)
  const turnTo = (A, yaw, dt, rate = 7) => { let dy = yaw - A.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); A.yaw += clamp(dy, -rate * dt, rate * dt); };
  // Got there: start using the thing (a short slide from the floor onto the seat or into bed), or do the move at
  // the spot, facing what it's for.
  function arrive(inst, o, t) {
    const A = inst.petAi; A.task = null; A.path = [];
    if (o.type === 'use') {
      if (!insts.has(o.it.rec.id) || !canUse(inst, o.it)) { A.until = t + 1; return false; }
      const from = A.pos.clone(), yaw0 = A.yaw; if (!useItem(inst, o.it, { stay: true })) return false;
      A.use.auto = true; A.last = o.it.rec.id;
      { const D2 = L() && L().DUR[o.it.def.t]; if (D2) A.use.until = t + D2[0] + Math.random() * (D2[1] - D2[0]); }
      if (o.lampsAfter) A.use.lampsAt = t + 4; // the bedside lamp, from bed
      if (/^(bed|bunk)$/.test(o.it.def.t) && dayPart() === 'night') A.use.night = true; /* sleeps till morning */
      A.slide = { from, yaw0, t0: t, dur: from.distanceTo(A.pos) > 0.05 ? 0.5 : 0.3 };
      if (o.bath) { A.lastBath = o.it.rec.id; A.use.bath = true; } // (out again: the rest of the routine)
      if (o.eat) { A.use.eat = o.eat; A.use.pose = 'sitchair.eat'; A.use.moves = null; A.use.gives = { food: 1.3 }; A.use.until = t + 60 + Math.random() * 50; } // eating the meal
      if (o.wantPose) { A.use.pose = o.wantPose; A.use.nextMove = t + 25 + Math.random() * 10; } // the kid picked this move
      if (o.watch && insts.has(o.watch.rec.id)) { const tv = L().DUR.tv; A.use.watch = o.watch.rec.id; o.watch.rec.on = true; A.use.gives = o.gives; A.use.until = t + tv[0] + Math.random() * (tv[1] - tv[0]); } // watching TV from a seat (a whole show)
      return true;
    }
    // a pet that moved off while it was coming: goes again (twice at most)
    const live = o.type === 'chore' && o.target.petAi ? o.target.petAi.pos : o.near ? o.near.petAi.pos : null;
    if (live && o.spot && Math.hypot(live.x - A.pos.x, live.z - A.pos.z) > 1.3 && (o.tries || 0) < 2) { o.tries = (o.tries || 0) + 1; if (go(inst, o, t)) return true; }
    if (o.bowl && !lifeState().bowls.includes(o.bowl)) { A.until = t + 1; return false; }
    if (o.type === 'perch') { // sizes up the jump first: looks at the top, a moment, then up
      const c = o.it.group.position; A.wantYaw = Math.atan2(c.x - A.pos.x, c.z - A.pos.z); A.doing = { o, pose: 'look', until: t + 0.9 + Math.random() * 0.6, phase: 'eye', t0: t }; A.lastDo = 'perch'; A.st = 'stand'; return true;
    }
    if (o.tool) inst.holding = o.tool; // (no cupboard: it just has it)
    if (o.start) o.start(t);
    const tg = o.type === 'chore' || o.type === 'step' ? (o.target ? (o.target.pos || (o.target.petAi ? o.target.petAi.pos : o.target.group.position)) : null) : o.face || (o.near && o.near.petAi.pos);
    A.wantYaw = tg ? Math.atan2(tg.x - A.pos.x, tg.z - A.pos.z) : null; // turns to it (no sliding: it already stands where it can reach)
    const C = o.type === 'chore' && L().CHORES[o.chore];
    A.doing = { o, pose: C ? C.pose : o.pose, until: t + (C ? C.dur : o.dur) * (o.type === 'step' ? 1 : 0.85 + Math.random() * 0.3), gives: o.type === 'chore' || o.type === 'step' ? null : o.gives, t0: t };
    if (o.type === 'chore') A.lastChore = o.chore; else A.lastDo = o.near ? 'near' : o.tag || o.pose;
    setFit(inst, inst.onStool ? null : 'clear'); // (on the stool it stays put on it)
    if (o.chore === 'pat' || o.chore === 'feed') { const p = o.target.petAi; if (!p.use && !p.carried) { p.task = null; p.doing = null; p.path = []; p.st = 'sit'; p.until = t + (C.dur + 1); p.wantYaw = Math.atan2(A.pos.x - p.pos.x, A.pos.z - p.pos.z); } }
    A.st = 'stand'; return true;
  }
  // the next step of what it's doing (false: nothing left, or it can't be done, so the rest is dropped)
  function nextStep(inst, t) {
    const A = inst.petAi;
    let back = 0; while (A.plan && A.plan.length) { let o = A.plan.shift(); if (o.mowRow && inst.parked && !inst.carrying && !back++) { A.plan.unshift(o); o = backTo(inst, inst.parked); } // (never mows a row without the mower: back to it first)
      if (go(inst, o, t) || (o.orElse && go(inst, o.orElse, t))) return true; } // (orElse: another way of doing that step, if it can't be done the first way)
    A.plan = []; if (inst.holding) inst.holding = null; // couldn't put it back: it's tidied away anyway
    return false;
  }
  // Somewhere on top of a thing a pet can lie: flat (every point under its body at the same height, nothing standing
  // there, no curve or edge) and roomy enough for it, curled up or sitting. null: nowhere is.
  function flatTop(P, c, w, d, fl, half) {
    let best = null;
    for (let k = 0; k < 40; k++) {
      const x = c.x + (Math.random() - 0.5) * w * 0.8, z = c.z + (Math.random() - 0.5) * d * 0.8, yaw = Math.random() * Math.PI * 2, top = P.support(x, fl + 2.4, z); if (!(top > fl + 0.2)) continue;
      const ca = Math.cos(yaw), sa = Math.sin(yaw); let ok = true;
      for (const u of [-half, -half / 2, 0, half / 2, half]) for (const v of [-0.15, 0, 0.15]) { const px = x + u * sa + v * ca, pz = z + u * ca - v * sa; if (Math.abs(P.support(px, fl + 2.4, pz) - top) > 0.025) { ok = false; break; } }
      if (ok) { const r = Math.hypot(x - c.x, z - c.z); if (!best || r < best.r) best = { x, z, top, yaw, r }; } // (the middle-most of the flat spots)
    }
    return best;
  }
  function finish(inst, t) {
    const A = inst.petAi, D = A.doing; A.doing = null; A.st = 'stand'; A.until = D && D.o && D.o.noPause ? t : t + 0.8 + Math.random() * 1.5; // (pushing a mower, no stopping between rows)
    const o = D.o, S = lifeState();
    if (o.bowl) { unscene(S.bowls, o.bowl); return; }
    if (o.type === 'perch' && IH.phys && insts.has(o.it.rec.id)) {
      const P = IH.phys, c = o.it.group.position, [w, d] = fp(o.it.def, o.it.rec.r || 0), fl = P.floorAt(A.pos.x, A.pos.z);
      if (D.phase === 'eye') { // the jump up: an arc onto the top, landing somewhere on it
        const spot = flatTop(P, c, w, d, fl, inst.pet === 'dog' ? 0.32 : 0.27);
        if (!spot) { A.doing = null; A.st = 'stand'; A.until = t + 1; return; } // nowhere flat enough up there to lie on: it doesn't go up
        const { x, z, top } = spot; A.yaw = spot.yaw;
        if (top > fl + 0.2) { A.slide = { from: A.pos.clone(), t0: t, dur: 0.45, arc: 0.45 }; A.pos.set(x, top, z); A.doing = { o, pose: Math.random() < 0.5 ? 'sit' : 'sleep.curl', until: t + o.dur * (0.7 + Math.random() * 0.6), phase: 'up', gives: o.gives, t0: t }; return; }
      } else if (D.phase === 'up') { // and down again, to the floor beside it
        const q = P.standSpot(c.x, c.z, Math.max(w, d) * 0.3 + 0.4, 'pet', A.pos, null, others(inst)) || P.nearestClear(A.pos.x, A.pos.z, 'pet');
        if (q) { A.slide = { from: A.pos.clone(), t0: t, dur: 0.45, arc: 0.25 }; A.pos.set(q.x, P.floorAt(q.x, q.z), q.z); }
      }
      return;
    }
    if (o.type === 'step') {
      if (typeof o.end === 'function') o.end(t);
      if (o.end === 'take') inst.holding = o.tool;
      if (o.end === 'put') inst.holding = null;
      if (o.end === 'lamp') { o.target.rec.on = false; save(); sound('off'); }
      if (A.plan && A.plan.length) nextStep(inst, t);
      return;
    }
    if (o.type !== 'chore') return;
    const C = L().CHORES[o.chore], N = inst.needs;
    if (C.tidy) N.tidy = Math.min(100, N.tidy + C.tidy);
    if (C.friends) N.friends = Math.min(100, N.friends + C.friends);
    if (o.chore === 'makebed') { S.messy.delete(o.target.rec.id); o.target.making = 0; }
    if (o.chore === 'water') { S.thirst[o.target.rec.id] = 0; bubble(o.target, '💧'); }
    if (o.chore === 'sweep') unscene(S.dust, o.target.dust);
    if (o.chore === 'dishes') S.dirty.delete(o.target.rec.id);
    if (o.chore === 'towel') { unscene(S.towels, o.target.towel); const rail = [...insts.values()].find(x => x.def.t === 'towels'); if (rail) { inHand(inst, towelMesh()); A.plan = [{ type: 'step', how: 'reach', target: rail, pose: 'place', dur: 2, end: () => inHand(inst, null) }, ...(A.plan || [])]; } }
    if (o.chore === 'plate') { unscene(S.plates, o.target.plate); const B = [...insts.values()].find(x => /^kitchen/.test(x.def.t)); if (B) { inHand(inst, IH.kitchen.plate(null, true)); A.plan = [{ type: 'step', how: 'front', target: B, pose: 'place', dur: 1.6, end: () => { inHand(inst, null); S.dirty.add(B.rec.id); } }, ...(A.plan || [])]; } }
    if (o.chore === 'feed' && insts.has(o.target.rec.id)) addBowl(inst, o.target);
    if (o.chore === 'pat' && o.target.needs) { o.target.needs.friends = Math.min(100, o.target.needs.friends + 35); o.target.petAi.happy = t + 1.6; bubble(o.target, '💛'); }
    if (C.say) toast(`${nameOf(inst)} ${C.say.includes('{pet}') ? C.say.replace('{pet}', nameOf(o.target)) : C.say} ✨`);
    sound('pop');
    if (o.tool && inst.holding === o.tool) inst.holding = null; // no cupboard: put down when done
    if (A.plan && A.plan.length) nextStep(inst, t);
  }
  // tapping a character or pet shows how it's feeling
  let needsT = 0;
  function needsCard(inst) {
    const el = $('.ih-needs', O.root); if (!el || !IH.life || !inst.needs) return;
    el.innerHTML = `<b>${esc(nameOf(inst))}</b>` + Object.keys(L().NEEDS[kindOf(inst)]).map(k => `<div class="ih-need"><span>${L().LABEL[k][1]} ${L().LABEL[k][0]}</span><i><em style="width:${Math.round(inst.needs[k])}%"></em></i></div>`).join('');
    el.classList.add('on'); clearTimeout(needsT); needsT = setTimeout(() => el.classList.remove('on'), 4500);
  }
  // ---------- cooking a meal, step by step (kitchen.js has the food and recipes)
  // The kid's habits from their real chore record (the app passes them in; 0 to 1): how likely the character is
  // to clear its plate to the sink, hang up its towel, tidy up after itself. Kind: a tidy kid has a tidy character.
  const habit = k => { const h = O.opts.habits && O.opts.habits(); return h && h[k] != null ? h[k] : 0.6; };
  const food = () => { const st = O.st; if (!st.food) { st.food = { ...(IH.kitchen ? IH.kitchen.STARTER : {}) }; save(); } return st.food; };
  // doors on cupboards and fridges: opened by a step, swung on their hinges each beat
  function openDoors(it, on) { if (!it || !it.subs) return; it.open = it.open || new Set(); for (const n of Object.keys(it.subs)) if (/^door/.test(n)) { if (on) it.open.add(n); else it.open.delete(n); } }
  function swingDoors(it, dt) { for (const n of Object.keys(it.subs)) if (/^door/.test(n)) { const g = it.subs[n], want = it.open && it.open.has(n) ? -1.7 : 0; g.rotation.y += (want - g.rotation.y) * Math.min(1, dt * 7); } }
  // something in the right hand (an ingredient, a plate), or nothing
  function inHand(inst, mesh) {
    if (inst.handMesh) { inst.handMesh.parent && inst.handMesh.parent.remove(inst.handMesh); inst.handMesh = null; }
    const hand = inst.B && inst.B['hand.R']; if (!mesh || !hand) return;
    inst.group.updateMatrixWorld(true); const s = hand.getWorldScale(new T.Vector3()).x; mesh.scale.setScalar(1 / s); mesh.position.set(0, 0.12 / s, 0.05 / s); hand.add(mesh); inst.handMesh = mesh;
  }
  // a spot on top of the bench (or any surface), along its length, n of total
  function onTop(it, n, total) { const [, rot] = rotOf(it), c = it.group.position, w = it.def.fp[0], [x, z] = rot(-w / 2 + 0.45 + (w - 0.9) * (total > 1 ? n / (total - 1) : 0.5), -0.1); return new T.Vector3(c.x + x, c.y + (it.def.surf || 1.6) + 0.02, c.z + z); }
  // the step stool: picked up and carried in front, set down where the character will stand, climbed, put back
  function carryStool(inst, st) { st.busy = true; inst.carrying = st; IH.phys && IH.phys.forget(st); }
  function setStool(inst) { const st = inst.carrying; if (!st) return; inst.carrying = null; st.group.position.set(inst.petAi.pos.x, IH.phys ? IH.phys.floorAt(inst.petAi.pos.x, inst.petAi.pos.z) : inst.petAi.pos.y, inst.petAi.pos.z); st.group.rotation.y = inst.petAi.yaw; inst.onStool = st; }
  function climb(inst, up, t) {
    const A = inst.petAi, st = inst.onStool; if (!st) return;
    const from = A.pos.clone();
    if (up) A.pos.y = st.group.position.y + (st.def.surf || 0.72);
    else { const f = [Math.sin(A.yaw), Math.cos(A.yaw)], P = IH.phys, q = P && P.nearestClear(A.pos.x - f[0] * 0.6, A.pos.z - f[1] * 0.6, 'kid'); A.pos.set(q ? q.x : A.pos.x - f[0] * 0.6, P ? P.floorAt(A.pos.x, A.pos.z) : st.group.position.y, q ? q.z : A.pos.z - f[1] * 0.6); inst.carrying = st; inst.onStool = null; }
    A.slide = { from, t0: t, dur: 0.5, arc: up ? 0.25 : 0.15 };
  }
  function stoolHome(inst) { const st = inst.carrying; if (!st) return; inst.carrying = null; st.busy = false; posInst(st); }
  // Builds the whole meal as steps. Returns the steps, or null when there's no fridge or bench (a quick snack then).
  function mealPlan(inst) {
    const K = IH.kitchen; if (!K) return null;
    // the nearest of each it can actually walk to (furniture in a doorway can cut a room off)
    const reach = it => { const q = targetFor(inst, { type: 'step', target: it, how: it.def.t === 'stool' ? 'reach' : 'front' }); return !!(q && IH.phys && IH.phys.route(inst.petAi.pos, q, 'kid')); };
    const all = [...insts.values()], near = (pred) => all.filter(pred).sort((a, b) => a.group.position.distanceTo(inst.petAi.pos) - b.group.position.distanceTo(inst.petAi.pos)).find(reach);
    const F = near(o => o.def.cold), B = near(o => /^kitchen/.test(o.def.t)), P = near(o => o.def.t === 'pantry'), S = near(o => o.def.t === 'stove'), ST = near(o => o.def.t === 'stool');
    if (!F || !B) return null;
    const r = K.pick(food(), dayPart(), O.st.recipe); if (!r) return null;
    const high = it => tooHigh(inst, it); // above where its hands can work: needs the stool
    if (!ST && high(B)) { noStool(inst, true); return false; } // (no stool: a quick snack instead of cooking at a bench it can't reach)
    const steps = [], step = o => steps.push(Object.assign({ type: 'step', how: 'front' }, o)), bench = [];
    // 1. the fridge: open it, have a good look
    step({ target: F, pose: 'scan', dur: 3.5, think: r.emoji, start: () => openDoors(F, true) });
    // 2. each ingredient out, one at a time, onto the bench
    r.needs.forEach((n, i) => {
      const from = K.FOOD[n].where === 'pantry' && P ? P : F, last = i === r.needs.length - 1;
      step({ target: from, pose: 'fetch', dur: 1.8, start: () => openDoors(from, true), end: () => { const f = food(); f[n] = Math.max(0, (f[n] || 0) - 1); save(); inHand(inst, K.model(n)); if (last || (r.needs[i + 1] && (K.FOOD[r.needs[i + 1]].where === 'pantry' && P ? P : F) !== from)) openDoors(from, false); } });
      step({ target: B, pose: 'place', dur: 1.4, end: () => { inHand(inst, null); const m = K.model(n); m.position.copy(onTop(B, i, r.needs.length)); O.S.scene.add(m); bench.push(m); } });
    });
    // 3. up on the stool to work at the bench (it's above the character's eyes)
    const up = it => { if (!ST || !high(it)) return; step({ target: ST, how: 'reach', pose: 'fetch', dur: 1.5, stooled: true, skipIf: () => inst.carrying === ST, end: () => carryStool(inst, ST) }); step({ target: it, pose: 'place', dur: 0.8, stooled: true, end: () => setStool(inst) }); step({ here: true, pose: 'stand', dur: 0.6, start: t2 => climb(inst, true, t2) }); };
    const down = () => { if (!ST) return; step({ here: true, pose: 'stand', dur: 0.6, start: t2 => climb(inst, false, t2) }); };
    up(B);
    if (!(ST && high(B))) step({ target: B, pose: 'stand', dur: 0.4 }); // (no stool: stands at the bench)
    r.needs.forEach((n, i) => step({ here: true, pose: 'chop', dur: r.prep, end: () => { const m = bench[i]; if (m) { m.scale.set(1.15, 0.45, 1.15); } } }));
    // 4. cooked on the stove (on the stool again if it's high), or put together on the bench
    let meal = null;
    if (r.at === 'stove' && S) {
      down(); if (ST && high(B)) step({ here: true, pose: 'fetch', dur: 1.2, end: () => { inst.carrying = ST; inst.onStool = null; } });
      step({ here: true, pose: 'fetch', dur: 1.4, end: () => { for (const m of bench.splice(0)) O.S.scene.remove(m); inHand(inst, IH.kitchen.pan()); } }); // everything into the pan
      if (ST && high(S)) { step({ target: S, pose: 'place', dur: 0.8, stooled: true, end: () => setStool(inst) }); step({ here: true, pose: 'stand', dur: 0.6, start: t2 => climb(inst, true, t2) }); } else step({ target: S, pose: 'stand', dur: 0.4 });
      step({ here: true, pose: 'stir', dur: r.cook, start: () => { inHand(inst, null); meal = IH.kitchen.pan(); const sp = onTop(S, 0, 1); meal.position.copy(sp); O.S.scene.add(meal); }, end: () => { if (meal) O.S.scene.remove(meal); inHand(inst, K.plate(r)); } });
      down();
    } else {
      step({ here: true, pose: 'chop', dur: 8, end: () => { for (const m of bench.splice(0)) O.S.scene.remove(m); inHand(inst, K.plate(r)); } });
      down();
    }
    // 5. the stool back where it lives
    if (ST) { step({ here: true, pose: 'fetch', dur: 1, end: () => { if (inst.onStool) { inst.carrying = inst.onStool; inst.onStool = null; } } }); step({ target: ST, how: 'home', pose: 'place', dur: 1, end: () => stoolHome(inst) }); }
    // 6. sit down somewhere to eat (a chair at the table, the sofa, any seat), then the plate goes where this kid
    // would put it
    steps.push({ type: 'eat', recipe: r, think: '😋' });
    if (O.opts.track) O.opts.track('home.meal', { recipe: r.id });
    return steps;
  }
  // ---------- a bath, step by step: taps on and the bath fills, a hand in to feel it, in (covered), a good soak,
  // the plug out and it drains, out and dried with a towel, and the towel hung on the rail (or left on the floor,
  // as that kid would: their real towel habit), which then is a chore
  const towelMesh = () => blob(k => k.box(0.5, 0.06, 0.32, 0, 0, 0, '#7cc8a4', { r: 0.03 }));
  function bathPlan(inst, B) {
    const steps = [], step = o => steps.push(Object.assign({ type: 'step', how: 'reach' }, o));
    step({ target: B, pose: 'fetch', dur: 3, think: '🛁', start: () => { B.fill = 1; sound('tune'); } }); // taps on
    step({ here: true, pose: 'scan', dur: 14 }); // watching it fill
    step({ here: true, pose: 'place', dur: 2 }); // a hand in: just right
    steps.push({ type: 'use', it: B, think: '🫧', bath: true });
    return steps;
  }
  function afterBath(inst, t) {
    const A = inst.petAi, B = A.lastBath && insts.get(A.lastBath), rail = [...insts.values()].find(o => o.def.t === 'towels');
    const steps = [];
    if (B) steps.push({ type: 'step', how: 'reach', target: B, pose: 'fetch', dur: 2.5, end: () => { B.fill = 0; } }); // the plug out
    steps.push({ type: 'step', here: true, pose: 'dry', dur: 14, start: () => inHand(inst, towelMesh()) }); // drying off
    if (rail && Math.random() < habit('towel')) steps.push({ type: 'step', how: 'reach', target: rail, pose: 'place', dur: 2, end: () => inHand(inst, null) });
    else steps.push({ type: 'step', here: true, pose: 'place', dur: 1.2, end: () => { inHand(inst, null); const m = towelMesh(), f = [Math.sin(A.yaw), Math.cos(A.yaw)]; m.position.set(A.pos.x + f[0] * 0.5, IH.phys ? IH.phys.floorAt(A.pos.x, A.pos.z) + 0.03 : A.pos.y, A.pos.z + f[1] * 0.5); O.S.scene.add(m); lifeState().towels.push({ pos: m.position.clone(), mesh: m }); } });
    A.plan = steps; nextStep(inst, t);
  }
  // a free seat to eat at, the nearest
  function seatFor(inst) { let best = null, bd = 1e9; for (const it of insts.values()) { const u = it.def.use; if (!u || u.kind !== 'sit' || u.kid !== 'sitchair' || !canUse(inst, it)) continue; const d = it.group.position.distanceTo(inst.petAi.pos); if (d < bd) { bd = d; best = it; } } return best; }
  // after eating: a kid who clears their plate has a character who takes it to the sink; otherwise it's left by the
  // seat (and becomes a chore for later)
  function afterMeal(inst, t) {
    const A = inst.petAi, B = [...insts.values()].find(o => /^kitchen/.test(o.def.t)), K = IH.kitchen;
    if (B && Math.random() < habit('dishes')) { A.plan = [{ type: 'step', how: 'front', target: B, pose: 'place', dur: 1.6, think: '🍽️', end: () => { inHand(inst, null); lifeState().dirty.add(B.rec.id); } }]; nextStep(inst, t); return; }
    inHand(inst, null); const P = IH.phys, f = [Math.sin(A.yaw), Math.cos(A.yaw)], x = A.pos.x + f[0] * 0.6, z = A.pos.z + f[1] * 0.6, top = P ? Math.max(P.floorAt(x, z), P.support(x, A.pos.y + 1.6, z)) : A.pos.y;
    const m = K.plate(null, true); m.position.set(x, top + 0.01, z); O.S.scene.add(m); lifeState().plates.push({ pos: m.position.clone(), mesh: m });
  }
  // keeps a dropped point inside its cell (so it lands where you let go, not snapped to the middle)
  const r0 = (v, cell) => clamp(v, cell + 0.15, cell + 0.85);
  function pan(dx, dy) {
    const wpp = (CAM.fitV / CAM.zoom) / O.h, y = CAM.yaw, b = O.home.bounds, t = CAM.target;
    t.x -= Math.cos(y) * dx * wpp; t.z += Math.sin(y) * dx * wpp;
    t.x -= Math.sin(y) * dy * wpp / Math.sin(CAM.pitch); t.z -= Math.cos(y) * dy * wpp / Math.sin(CAM.pitch);
    t.x = clamp(t.x, b.x0, b.x1); t.z = clamp(t.z, b.z0, b.z1);
  }
  function setZoom(z) { CAM.intro = null; CAM.zoom = clamp(z, ZMIN, ZMAX); ui(true); }
  function tap(x, y) {
    if (O.acts) { actsClose(); return; } // (a tap anywhere else closes the menu)
    if (O.held) { const it = pickAt(x, y); if (it && it !== O.held.inst) return; moveHeldTo(x, y); return; }
    const it = pickAt(x, y);
    if (O.editing) { if (it && it.rec.id !== KID) hold(it.rec, false); return; }
    if (!it && gateAt(x, y)) return gateMenu(x, y);
    if (!it) return;
    const d = it.def;
    if (d.pet) { it.petAi.happy = (lastT || 0) + 1.6; float(x, y, d.pet === 'kid' ? '👋' : '❤️'); sound('pat'); needsCard(it); if (d.pet !== 'kid') actsMenu(it, x, y); return; }
    if (actsMenu(it, x, y)) return;
    if (d.act === 'lamp') { it.rec.on = it.rec.on === false; save(); sound(it.rec.on === false ? 'off' : 'on'); return; }
    if (d.act === 'tv') { it.rec.on = !it.rec.on; save(); sound('on'); return; }
    if (d.act === 'music') { float(x, y, '♪'); setTimeout(() => float(x + 14, y - 10, '♫'), 160); sound('tune'); return; }
    if (d.act === 'clock') { const n = new Date(); toast(`It’s ${n.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}.`); return; }
    if (d.act === 'fish') { float(x, y, '🫧'); sound('pop'); return; }
    sound('pop'); float(x, y, '✨');
  }
  // ---------- tap a thing: what your character can do with it
  // The moves an item has (items.js USE: kid and kidMoves), plus the cooking, washing, chores and switching that go
  // with it. Picking one stops whatever the character's doing and sends it to do that.
  const MOVE = {
    sitchair: ['🪑', 'Sit down'], 'sitchair.relax': ['😌', 'Relax'], 'sitchair.read': ['📖', 'Read a book'], 'sitchair.phone': ['📱', 'Check my phone'], 'sitchair.hug': ['🧸', 'Hug a cushion'], 'sitchair.snooze': ['😴', 'Have a doze'],
    'sitchair.stretch': ['🙆', 'Stretch'], 'sitchair.swing': ['🦶', 'Swing my legs'], 'sitchair.lean': ['🛋️', 'Lean back'],
    liebed: ['🛏️', 'Lie down'], 'liebed.covers': ['😴', 'Get under the covers'], 'liebed.roll': ['🔄', 'Roll about'], 'liebed.starfish': ['⭐', 'Starfish'], 'liebed.half': ['💭', 'Daydream'],
    watch: ['📺', 'Watch TV'], read: ['📚', 'Read'], 'read.browse': ['🔎', 'Browse the books'], 'read.scan': ['👀', 'Look for a book'],
    bath: ['🛁', 'Have a bath'], shower: ['🚿', 'Have a shower'], wash: ['🧼', 'Wash my hands'], 'wash.teeth': ['🪥', 'Brush my teeth'], 'wash.face': ['💦', 'Wash my face'],
    play: ['🎹', 'Play a tune'], strum: ['🎸', 'Play guitar'], paint: ['🎨', 'Paint'], gaze: ['🔭', 'Look at the stars'], toys: ['🧸', 'Play with toys'], bounce: ['🤸', 'Bounce'], splash: ['💦', 'Splash about'], rock: ['🐴', 'Rock'], snack: ['🍎', 'Have a snack']
  };
  function actsFor(it) {
    const d = it.def, u = d.use, k = insts.get(KID), S = lifeState(), out = [], C = L() && L().CHORES; if (!k) return out;
    const add = (e, label, run) => out.push({ e, label, run });
    const use = pose => () => send({ type: 'use', it, gives: (L() && L().GIVES[d.t] || {}).kid, think: (MOVE[pose] || ['✨'])[0], wantPose: pose });
    if (d.pet && d.pet !== 'kid') {
      add('💛', `Pat ${nameOf(it)}`, () => send({ type: 'chore', chore: 'pat', target: it, think: '💛' }));
      if (C && !S.bowls.some(b => b.pet === it)) add('🥣', `Feed ${nameOf(it)}`, () => send({ type: 'chore', chore: 'feed', target: it, think: '🥣' }));
      if (it.doll === undefined) { const toy = [...insts.values()].find(o => o.doll); if (toy) add('🧸', 'Play with the teddy together', () => { send({ type: 'do', pose: 'toys', at: toy.doll.centre(), face: toy.doll.centre(), gives: { fun: 1 }, dur: 25, think: '🧸' }); }); }
      return out;
    }
    // cooking and washing: the whole routine
    if (/^(kitchen|kitchen2|stove|fridge|fridge2|pantry)$/.test(d.t) && IH.kitchen) add('🍳', 'Cook a meal', () => { const mp = mealPlan(k); if (mp) sendPlan(mp); else if (mp !== false) toast('There’s nothing to cook with. Get some food from Groceries on the phone.'); });
    if (/^bath2?$/.test(d.t)) add('🛁', 'Have a bath', () => sendPlan(bathPlan(k, it)));
    // its moves
    if (u && u.kid && u.pets !== 'kidonly') for (const m of (u.kidMoves || [u.kid]).slice(0, 6)) { if (/^bath/.test(m) && /^bath2?$/.test(d.t)) continue; const L0 = MOVE[m]; if (L0) add(L0[0], L0[1], d.t === 'tv' ? () => { const seat = seatFacing(k, it); send(seat ? { type: 'use', it: seat, watch: it, gives: (L().GIVES.tv || {}).kid, think: '📺', dur: 270 } : { type: 'use', it, think: '📺' }); } : use(m)); }
    // chores that go with it, when they need doing
    if (S.messy && S.messy.has(it.rec.id)) add('🛏️', 'Make the bed', () => send({ type: 'chore', chore: 'makebed', target: it, think: '🛏️' }));
    if (PLANTS.has(d.t) && d.kind !== 'wall') add('💧', 'Water it', () => send({ type: 'chore', chore: 'water', target: it, think: '💧' }));
    if (S.dirty && S.dirty.has(it.rec.id)) add('🧽', 'Wash up', () => send({ type: 'chore', chore: 'dishes', target: it, think: '🧽' }));
    if (d.t === 'mower') add('🌱', 'Mow the lawn', () => sendPlan(mowPlan(k, it)));
    if (d.act === 'lamp') add(it.rec.on === false ? '💡' : '🌙', it.rec.on === false ? 'Turn it on' : 'Turn it off', () => send({ type: 'step', target: it, pose: 'switch', dur: 1.6, end: () => { it.rec.on = it.rec.on === false; save(); sound(it.rec.on === false ? 'off' : 'on'); } }));
    if (d.act === 'tv') add(it.rec.on ? '⏻' : '📺', it.rec.on ? 'Turn the TV off' : 'Turn the TV on', () => send({ type: 'step', target: it, pose: 'switch', dur: 1.4, end: () => { it.rec.on = !it.rec.on; save(); sound('on'); } }));
    if (it.doll) add('🤗', 'Give the teddy a cuddle', () => send({ type: 'do', pose: 'toys', at: it.doll.centre(), face: it.doll.centre(), gives: { fun: 1, friends: 0.4 }, dur: 20, think: '🧸' }));
    return out;
  }
  function send(o) { const k = insts.get(KID); if (!k) return; up_(k); k.petAi.carried = false; const t = lastT || 0; if (k.petAi.free && k.petAi.path.length) { k.petAi.plan = [o]; return; } /* getting off a seat first: then off it goes */ if (!go(k, o, t)) { if (o.type === 'use' || o.type === 'do' || o.here) { if (!arrive(k, { ...o, here: true }, t)) toast('Can’t get there right now.'); } else toast('Can’t get there right now.'); } }
  function sendPlan(steps) { const k = insts.get(KID); if (!k || !steps || !steps.length) return; up_(k); const t = lastT || 0; if (k.petAi.free && k.petAi.path.length) { k.petAi.plan = steps.slice(); return; } k.petAi.plan = steps.slice(1); if (!go(k, steps[0], t)) nextStep(k, t); }
  // ---------- the garden gate onto the footpath: the way out to the village (still being built)
  function gateAt(x, y) { const G = O.home && O.home.gate; return !!(G && rayAt(x, y).intersectObject(G.group, true).length); }
  function gateMenu(x, y) {
    const G = O.home.gate, who = O.kid.name || 'You';
    O.acts = [{ e: '🏘️', label: 'Go to the village', run: goVillage }, { e: '🚪', label: G.open ? 'Close the gate' : 'Open the gate', run: () => { G.set(G.open ? 0 : 1); sound(G.open ? 'on' : 'off'); } }];
    const el = $('.ih-acts', O.root), r = O.root.getBoundingClientRect();
    el.innerHTML = `<b>Garden gate</b><small>What should ${esc(who)} do?</small>${O.acts.map((a, i) => `<button data-a="kidDo" data-i="${i}"><span>${a.e}</span>${esc(a.label)}</button>`).join('')}`;
    el.hidden = false; const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = clamp(x - r.left - w / 2, 8, r.width - w - 8) + 'px'; el.style.top = clamp(y - r.top - h - 16, 60, r.height - h - 90) + 'px'; sound('pop');
  }
  // to the village: out to the gate, open it, and (till the village is built) say so and shut it again
  function sibNote(p) {
    const old = $('.ih-sib', O.root); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'ih-sib'; el.setAttribute('role', 'status');
    const isl = IH.islandsBuild && IH.islandsBuild.LIST.find(i => i.id === p.s.pl), where = isl ? (islandsOwned()[isl.id] ? `at the ${isl.name.toLowerCase()} ${isl.emoji}` : null) : 'in the village 👋'; if (!where) return;
    el.innerHTML = `<span>${esc(p.avatar)} <b>${esc(p.name)}</b> is ${where}</span><button type="button">Go</button>`;
    el.querySelector('button').addEventListener('click', () => { el.remove(); travelTo(isl ? isl.id : 'village'); });
    O.root.appendChild(el); sound('pop'); setTimeout(() => el.remove(), 12000);
  }
  // the phone's Travel app: home, the village (through the gate, from home), an island (straight there)
  const islandsOwned = () => O.st.islands || {};
  function travelTo(where) {
    if (where === 'home') { if (O.away && IH.village) IH.village.leave(); return; }
    if (O.away) { if (IH.village) IH.village.goto(where); return; }
    if (where === 'village') return goVillage();
    if (!islandsOwned()[where]) return;
    const G = O.home.gate; if (G) { G.set(1); setTimeout(() => travel(where), 300); } else travel(where);
  }
  // what farms and the sea give: into the fridge (eggs, milk, fish) or the goods shelf (wool); prices as Chorecast's
  const PRODUCE = { egg: { name: 'Eggs', one: 'an egg', e: '🥚', price: 14 }, milk: { name: 'Milk', one: 'a bottle of milk', e: '🥛', price: 18 }, wool: { name: 'Wool', one: 'a bag of wool', e: '🧶', price: 45, goods: true }, fish: { name: 'Fish', one: 'a fish', e: '🐟', price: 30 },
    carrot: { name: 'Carrots', one: 'a carrot', e: '🥕', price: 12 }, tomato: { name: 'Tomatoes', one: 'a tomato', e: '🍅', price: 12 }, lettuce: { name: 'Lettuce', one: 'a lettuce', e: '🥬', price: 14 }, apple: { name: 'Apples', one: 'an apple', e: '🍎', price: 18 }, honey: { name: 'Honey', one: 'a jar of honey', e: '🍯', price: 45 },
    pumpkin: { name: 'Pumpkins', one: 'a pumpkin', e: '🎃', price: 35, goods: true }, strawberry: { name: 'Strawberries', one: 'a punnet of strawberries', e: '🍓', price: 10, goods: true }, lemon: { name: 'Lemons', one: 'a lemon', e: '🍋', price: 16, goods: true }, feijoa: { name: 'Feijoas', one: 'a feijoa', e: '🍐', price: 20, goods: true },
    truffle: { name: 'Truffles', one: 'a truffle', e: '🍄', price: 40, goods: true }, jam: { name: 'Jam', one: 'a jar of jam', e: '🫙', price: 85, goods: true } };
  const goods = () => (O.st.goods = O.st.goods || {});
  function farmState() { const f = (O.st.farm = O.st.farm || { animals: { hen: 3, goat: 1 }, got: {}, fed: 0 }); f.got = f.got || {}; return f; }
  function produceSheet() {
    const f = food(), g = goods(), L = Object.entries(PRODUCE).filter(([id, P]) => (P.goods ? g[id] : f[id]) > 0);
    sheet(`<div class="ih-sh-h"><h3>Sell your produce</h3><button class="ih-btn" data-a="sheetX" aria-label="Close">${ic('close')}</button></div><p class="ih-ph-sub">From your farm and the sea. The grocer pays a fair price for each.</p>
      <div class="ih-ph-list">${L.length ? L.map(([id, P]) => `<div class="ih-ph-row"><span class="ih-ph-e">${P.e}</span><span><b>${P.name}</b><small>You have ${P.goods ? g[id] : f[id]}${P.goods ? '' : ' (in your fridge)'}</small></span><button class="ih-b1 ih-sm" data-a="pSell" data-k="${id}">✨ ${O.E ? O.E.price(P.price) : P.price}</button></div>`).join('') : '<p class="ih-ph-sub">Nothing to sell yet. Collect eggs, milk and wool on your farm, or catch fish at the beach.</p>'}</div>`);
  }
  function goVillage() {
    const G = O.home.gate; if (!G) return;
    sendPlan([{ type: 'step', target: { pos: new T.Vector3(G.at.x, 0, G.at.z - 1.0) }, reach: 0.3, pose: 'stand', dur: 1.2, think: '🏘️', start: () => G.set(1),
      end: () => setTimeout(travel, 500) }]);
  }
  // The home's grass, for the village's lawns too: the same blades, shells, wind, growth and mowing
  IH.lawnKit = {
    build: spec => buildLawn(spec), colours: (L, ph) => lawnColours(L.userData.U, ph), CUT, CUT_W, ROW, LEAD,
    grow(L, g) { const U = L.userData.U; U.uGrow.value = CUT + g * 0.9; const k = clamp((U.uGrow.value - CUT) / (U.uLong.value - CUT), 0, 1); U.uTop.value = CUT * BLADE_H + k * (1.12 * U.uLong.value * BLADE_H - CUT * BLADE_H); },
    tick(L, t, zoom) { const U = L.userData.U; U.uTime.value = t; if (U.uDens) U.uDens.value = clamp(22 * zoom, 22, 60); },
    cutStrip: (L, x, z, yaw) => cutStrip(x, z, yaw, L), cutAt: (L, x, z, r) => cutAt(x, z, r, L),
    reset(L) { const M = L.userData.map; if (M) { for (let i = 0; i < M.data.length; i += 4) M.data[i] = 0; M.tex.needsUpdate = true; } for (const m of L.userData.parts) { m.userData.cut.fill(0); m.geometry.attributes.aCut.needsUpdate = true; } },
    // how much of it is cut (0..1), from the lawn map
    cutShare(L) { const M = L.userData.map; if (!M) return 0; let n = 0, c = 0; for (let i = 0; i < M.data.length; i += 4) if (M.data[i + 2]) { n++; if (M.data[i]) c++; } return n ? c / n : 0; }
  };
  // ---------- jobs in the village (Hoshi Street): mowing the park when its grass is long (with your own lawnmower),
  // and shifts at the shops, each a little game. Two shifts a day at each shop; paid into the XP from jobs.
  const VJOBS = [
    { id: 'park', e: '🚜', name: 'Mow the park lawn', pay: 120, note: 'Bring your lawnmower. Paid for how much you mow.' },
    { id: 'cafe', e: '☕', name: 'Serve at the café', pay: 60, note: 'Give each customer what they ordered.' },
    { id: 'furniture', e: '🔨', name: 'Build furniture', pay: 60, note: 'Put things together from their pieces, from the ground up.' },
    { id: 'pets', e: '🧹', name: 'Tidy the pet shop', pay: 60, note: 'Sweep up the fur and spilled kibble.' },
    { id: 'grocer', e: '📦', name: 'Stack the grocer’s shelves', pay: 60, note: 'Fridge or pantry? Put each thing away.' }
  ];
  const stallPrice = (d, used) => Math.min(d.xp, Math.max(10, Math.round(sellValue(d, used) * 1.2 / 10) * 10));
  const stallOff = rec => { const L = O.st.stall || [], i = L.findIndex(r => r === rec || (r.t === rec.t && JSON.stringify(r.fin || null) === JSON.stringify(rec.fin || null) && !!r.used === !!rec.used)); if (i >= 0) L.splice(i, 1); };
  const SHIFTS = 2, villageLawn = () => { try { return JSON.parse(localStorage.getItem('cc:village:lawn') || 'null') || { mowAt: Date.now() - 2 * 864e5 }; } catch (e) { return { mowAt: Date.now() - 2 * 864e5 }; } };
  const parkGrowth = () => clamp((Date.now() - villageLawn().mowAt) / 864e5 / GROW_DAYS, 0, 1.5);
  function shiftsLeft(id) { const day = Math.floor(Date.now() / 864e5), v = O.st.vjobs && O.st.vjobs.day === day ? O.st.vjobs : { day, n: {} }; return SHIFTS - (v.n[id] || 0); }
  function vjobState(j) {
    if (j.id === 'park') { const g = parkGrowth(), mower = (O.st.owned.mower || 0) > 0; return { ok: g >= 0.5 && mower, why: g < 0.5 ? 'The park was mowed not long ago.' : !mower ? 'You need a lawnmower (the Shop has them).' : g >= 1 ? 'The grass is long!' : 'The grass is getting long.' }; }
    const n = shiftsLeft(j.id); return { ok: n > 0, why: n > 0 ? `${n} shift${n > 1 ? 's' : ''} left today` : 'Done for today. Back tomorrow!' };
  }
  function villageJobsHtml() { return `<h4 class="ih-ph-h4">Hoshi Street (the village)</h4><div class="ih-ph-list">${VJOBS.map(j => { const s2 = vjobState(j); return `<div class="ih-ph-row"><span class="ih-ph-e">${j.e}</span><span><b>${esc(j.name)} · ✨ up to ${j.pay}</b><small>${esc(s2.why)}</small></span>${s2.ok ? '<button class="ih-b1 ih-ph-btn" data-a="vjGo">Go</button>' : ''}</div>`; }).join('')}</div>`; }
  // The village's shops buy and sell by the home's own rules (prices, Mine, the used market, groceries): the sheets
  // are the home's own, shown over the village.
  const SHOP = {
    wallet: () => wallet(), used: () => usedStock(), food: () => food(), defs: () => DEFS,
    ask(t, offerId) { const d = BY[t]; if (!d) return; if (offerId) { const o = usedStock().find(x => x.id === offerId); if (o) buyAsk(d, o); else toast('Someone just bought that one.'); return; } O.pick = null; buyAsk(d); },
    buyFood(id) { const x = IH.kitchen && IH.kitchen.FOOD[id], w = wallet(); if (!x) return false; if (w.left < x.xp) { toast(`You need ✨ ${x.xp} XP for that.`); return false; } wSpend(x.xp, x.name ? x.name.toLowerCase() : id, 'HOSHI STREET GROCER'); const f = food(); f[id] = (f[id] || 0) + 1; save(); sound('buy'); ui(true); if (O.opts.track) O.opts.track('village.food', { id, xp: x.xp }); return true; },
    // a treat at the café: XP, and what it gives the character (food, fun; friends too with a brother or sister)
    treat(name, xp, gives) { const w = wallet(); if (w.left < xp) { toast(`You need ✨ ${xp} XP for that.`); return false; } wSpend(xp, name, 'HOSHI STREET CAFÉ'); const k = insts.get(KID); if (k && k.needs && gives) for (const n in gives) if (k.needs[n] != null) k.needs[n] = Math.min(100, k.needs[n] + gives[n]); save(); sound('buy'); ui(true); if (O.opts.track) O.opts.track('village.treat', { name, xp }); return true; },
    counter: kind => (kind === 'produce' ? produceSheet() : counterSheet(kind)),
    // the islands (islands-build.js, village.js): the farm, the fridge and the goods shelf, tools, collections, needs
    farm: () => farmState(), farmSave: () => save(), isl: id => ((O.st.isl = O.st.isl || {})[id] = O.st.isl[id] || {}),
    addFood(id, n = 1) { const f = food(); f[id] = (f[id] || 0) + n; save(); },
    addGoods(id, n = 1) { const g = goods(); g[id] = (g[id] || 0) + n; save(); }, goods: () => goods(), useFood(id, n = 1) { const f = food(); if ((f[id] || 0) < n) return false; f[id] -= n; save(); return true; }, useGoods(id, n = 1) { const g = goods(); if ((g[id] || 0) < n) return false; g[id] -= n; save(); return true; }, earn2: xp => { O.st.jobPay = (O.st.jobPay || 0) + xp; save(); ui(true); }, phase: () => O.st.look.phase,
    pay(xp, what) { const w = wallet(); if (w.left < xp) { toast(`You need ✨ ${xp} XP for ${what || 'that'}.`); return false; } wSpend(xp, what || 'a purchase'); save(); sound('buy'); ui(true); return true; },
    // the farm's own purchases (animals, feed, fences, seed): out of the farm account, topped up from the wallet if short
    farmPay: (xp, what) => farmPay(xp, what), farmAcct: () => farmAcct(), farmCharge(xp, what) { if (O.E) { O.E.charge(xp, what); ui(true); } }, farmIn(xp, memo) { farmIn(xp, memo); save(); ui(true); },
    hasTool: t => !!(O.st.tools || {})[t], giveTool(t) { (O.st.tools = O.st.tools || {})[t] = Date.now(); save(); },
    book(kind, key) { const b = ((O.st.books = O.st.books || {})[kind] = O.st.books[kind] || {}); const isNew = !b[key]; b[key] = (b[key] || 0) + 1; save(); return { isNew, count: Object.keys(b).length }; },
    daily(key, max) { const day = Math.floor(Date.now() / 864e5), d = (O.st.daily = O.st.daily && O.st.daily.day === day ? O.st.daily : { day, n: {} }); if ((d.n[key] || 0) >= max) return false; d.n[key] = (d.n[key] || 0) + 1; save(); return true; },
    dailyLeft(key, max) { const day = Math.floor(Date.now() / 864e5), d = O.st.daily && O.st.daily.day === day ? O.st.daily : { n: {} }; return max - (d.n[key] || 0); },
    relax(gives) { const k = insts.get(KID); if (k && k.needs && gives) for (const n in gives) if (k.needs[n] != null) k.needs[n] = Math.min(100, k.needs[n] + gives[n]); save(); },
    owned: () => islandsOwned(),
    owns: t => (O.st.owned[t] || 0) > 0, jobs: () => VJOBS.map(j => ({ ...j, ...vjobState(j) })), parkGrowth: () => parkGrowth(),
    shift(id) { if (shiftsLeft(id) <= 0) return false; const day = Math.floor(Date.now() / 864e5); if (!O.st.vjobs || O.st.vjobs.day !== day) O.st.vjobs = { day, n: {} }; O.st.vjobs.n[id] = (O.st.vjobs.n[id] || 0) + 1; save(); return true; },
    earn(xp, id) { xp = Math.round(xp); if (xp <= 0) return; O.st.jobPay = (O.st.jobPay || 0) + xp; { const j = VJOBS.find(q => q.id === id); led('wallet', xp, `Pay for a shift: ${j ? j.name.toLowerCase() : 'village job'}`, slipOf('CHORECAST JOBS', 'Pay slip', [[j ? j.name : 'Village job', xp]], [['Gross pay', xp], ['Net pay', xp, 'big']])); } save(); ui(true); sound('buy'); if (O.opts.track) O.opts.track('village.job', { id, xp }); },
    // your market stall (village.js): things out of Mine onto the stall, back again if they don't sell; sold at a
    // little more than the Market pays (in person), never more than new
    mine() { return DEFS.filter(d => d.xp && spare(d.t) > 0 && !d.apply && !d.pet).flatMap(d => boxOf(d.t).map((u, n) => ({ t: d.t, name: d.name, n, used: u.used, cond: u.cond, fin: u.fin, price: stallPrice(d, u.used), thumb: THUMBS[d.t] || '' }))); },
    thumb(t) { if (!THUMBS[t]) { O.thumbQ = [t]; thumbsSome(); } return THUMBS[t] || ''; },
    take(t, n) { const d = BY[t]; if (!d || spare(t) <= 0) return null; const u = boxOf(t).splice(n || 0, 1)[0] || {}; O.st.owned[t] -= 1; const rec = { t, fin: u.fin, used: u.used, cond: u.cond, price: stallPrice(d, u.used) }; (O.st.stall = O.st.stall || []).push(rec); save(); return rec; },
    // trading with a brother or sister (village.js): out of Mine for good, into Mine, and XP either way
    tradeOut(t, n) { const d = BY[t]; if (!d || spare(t) <= 0) return null; const u = boxOf(t).splice(n || 0, 1)[0] || {}; O.st.owned[t] -= 1; save(); ui(true); if (O.opts.track) O.opts.track('village.traded', { t, out: true }); return { t, fin: u.fin, used: u.used, cond: u.cond }; },
    tradeIn(rec) { if (!BY[rec.t]) return false; O.st.owned[rec.t] = (O.st.owned[rec.t] || 0) + 1; toBox(rec); save(); ui(true); return true; },
    xp(delta, memo) { delta = Math.round(delta) || 0; if (!delta) return; if (delta > 0) wGain(delta, memo || 'a trade with a brother or sister', 'CHORECAST TRADE'); else wSpend(-delta, memo || 'a trade with a brother or sister', 'CHORECAST TRADE'); save(); ui(true); },
    give(rec) { stallOff(rec); O.st.owned[rec.t] = (O.st.owned[rec.t] || 0) + 1; toBox(rec); save(); },
    sold(rec) { stallOff(rec); wGain(rec.price, `sold at your stall: ${(BY[rec.t] || {}).name || 'a thing'}`, 'HOSHI STREET MARKET'); save(); ui(true); if (O.opts.track) O.opts.track('village.stallSold', { t: rec.t, xp: rec.price }); },
    mowed(share = 1) { const g = parkGrowth() * (1 - Math.min(1, share)); try { localStorage.setItem('cc:village:lawn', JSON.stringify({ mowAt: Date.now() - g * GROW_DAYS * 864e5 })); } catch (e) { /* this visit only */ } }
  };
  // selling to a shop at its counter: the things in Mine it takes (the furniture shop: things for the home; the pet
  // shop: things for pets), at the Market's prices
  function counterSheet(kind) {
    const ok = d => d.xp && spare(d.t) > 0 && !d.apply && !d.pet && (kind === 'pets' ? d.cat === 'pets' : d.cat !== 'pets');
    const L = DEFS.filter(ok); for (const d of L) if (!THUMBS[d.t]) { O.thumbQ = [d.t]; thumbsSome(); }
    const rows = L.map(d => boxOf(d.t).map((u, n) => `<div class="ih-ph-row"><img alt="" data-thumb="${d.t}" src="${THUMBS[d.t] || ''}"><span><b>${esc(d.name)}</b><small>${u.fin && u.fin.c ? `<i class="ih-dot" style="--c:${u.fin.c}"></i>` : ''}${u.used ? `Used · ${esc(u.cond || 'Good')}` : 'Bought new'}</small></span><button class="ih-b1 ih-ph-btn" data-a="vSell" data-k="${kind}" data-t="${d.t}" data-n="${n}">✨ ${sellValue(d, u.used)}</button></div>`).join('')).join('');
    sheet(`<div class="ih-sh-h"><h3>Sell to the shop</h3><button class="ih-btn" data-a="sheetX" aria-label="Close">${ic('close')}</button></div><p class="ih-ph-sub">${kind === 'pets' ? 'Pet things in Mine you’re not using.' : 'Things in Mine you’re not using.'} New things sell for more than used ones. You have ✨ ${nf(wallet().left)} XP.</p><div class="ih-ph-list">${rows || `<p class="ih-ph-sub">Nothing in Mine this shop buys. Put things away at home first.</p>`}</div>`, 'small');
  }
  // Off to the village (village.js): the home stops (its drawing, its taps) and the village draws through the same
  // canvas and pipeline. Back home: in through the gate, which swings shut behind.
  function travel(where = 'village') {
    const G = O && O.home && O.home.gate; if (!G) return;
    if (!IH.village) { toast('The village is still being built.'); G.set(0); return; }
    const env = IH.phys ? IH.phys.env : null, k = insts.get(KID);
    O.away = true; guitarMusic(false); $('.ih-acts', O.root).hidden = true; O.root.classList.add('ih-away'); if (IH.phys) IH.phys.env = null; // (the village has its own ground; nothing measures against the home's)
    if (k) k.group.visible = false;
    const ok = IH.village.open({ where, phone: app => phone(app), R, pipe, root: O.root, cv: O.cv, dims: () => [O.w, O.h], kid: O.kid, phase: O.st.look.phase, frames: O.st.look.frames, sound, ic, shop: SHOP, closeSheet, onHome: () => {
      if (!O) return; O.away = false; O.root.classList.remove('ih-away');
      if (IH.phys) { IH.phys.env = env; IH.phys.forget(); }
      const d = O.home.def; LK.PAL.uHouse.value.set(-0.4, -0.4, d.w + 0.4, d.d + 0.4); applyLook(); lightFor(O.st.look.phase);
      if (k) { const A = k.petAi; k.group.visible = true; A.path = []; A.task = null; A.plan = []; A.doing = null; A.st = 'stand'; A.pos.x = G.at.x; A.pos.z = G.at.z - 0.9; A.yaw = Math.PI; k.group.position.x = A.pos.x; k.group.position.z = A.pos.z; k.group.rotation.y = A.yaw; }
      G.set(1); setTimeout(() => { if (O && O.home && O.home.gate === G) G.set(0); }, 1400);
      CAM.target.set(d.w / 2, FY + 1, d.d / 2 + 0.5); fit(); lastT = null; sceneT = null; force = true; if (!raf) raf = requestAnimationFrame(loop); toast('Home again!');
    } });
    if (!ok) { O.away = false; O.root.classList.remove('ih-away'); if (IH.phys) IH.phys.env = env; if (k) k.group.visible = true; G.set(0); }
  }
  function actsMenu(it, x, y) {
    const acts = actsFor(it); if (!acts.length) return false;
    O.acts = acts; const el = $('.ih-acts', O.root), r = O.root.getBoundingClientRect(), who = O.kid.name || 'You';
    el.innerHTML = `<b>${esc(it.def.pet ? nameOf(it) : it.def.name)}</b><small>What should ${esc(who)} do?</small>${acts.map((a, i) => `<button data-a="kidDo" data-i="${i}"><span>${a.e}</span>${esc(a.label)}</button>`).join('')}`;
    el.hidden = false; const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = clamp(x - r.left - w / 2, 8, r.width - w - 8) + 'px'; el.style.top = clamp(y - r.top - h - 16, 60, r.height - h - 90) + 'px';
    sound('pop'); return true;
  }
  const actsClose = () => { const el = O && $('.ih-acts', O.root); if (el) { el.hidden = true; el.innerHTML = ''; } O.acts = null; };
  function turnView(dir) {
    if (CAM.turn) return; CAM.intro = null; CAM.view = (CAM.view + dir + 4) % 4;
    const a = CAM.yaw, b = a + dir * Math.PI / 2; CAM.turn = { a, b, t0: lastT || 0 }; sound('turn');
    if (O.held && O.held.def.kind === 'wall') setTimeout(check, 700);
  }

  // ---------- little sounds (made on the fly, no files)
  let AC = null;
  function sound(kind) {
    try {
      if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return; AC = new C(); }
      if (AC.state === 'suspended') AC.resume(); if (!kind) return;
      const notes = { lift: [660], place: [523, 784], away: [440, 330], no: [220, 196], turn: [392], pat: [880, 988], on: [740], off: [494], pop: [698], buy: [523, 659, 784, 1046], tune: [523, 587, 659, 784, 880, 784], move: [392, 523, 659], tap: [165] }[kind] || [600];
      notes.forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + i * (kind === 'tune' ? 0.16 : 0.08); o.type = kind === 'no' ? 'square' : 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(kind === 'no' ? 0.03 : 0.08, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 0.25); });
    } catch (e) { /* no sound on this device */ }
  }
  // Guitar music while the guitar's played: plucked strings (Karplus-Strong: a burst of noise fed back through a
  // short delay, the way a real string rings and fades), strumming a gentle G, Em, C, D, a bar each, down and up
  // strokes (down: every string low to high; up: the top few, high to low, softer). Fades in and out.
  const GTR = { on: false, next: 0, n: 0, timer: 0, bufs: {}, out: null };
  const CHORDS = [[98, 123.47, 146.83, 196, 246.94, 392], [82.41, 123.47, 164.81, 196, 246.94, 329.63], [130.81, 164.81, 196, 261.63, 329.63], [146.83, 220, 293.66, 369.99]];
  const STRUM = [1, 0, 1, -1, 0, -1, 1, -1]; // eighths: 1 down, -1 up, 0 rest
  function pluck(f) {
    if (GTR.bufs[f]) return GTR.bufs[f];
    const sr = AC.sampleRate, len = Math.floor(sr * 2.2), b = AC.createBuffer(1, len, sr), y = b.getChannelData(0), N = Math.max(2, Math.round(sr / f));
    for (let i = 0; i < N; i++) y[i] = (Math.random() * 2 - 1) * 0.5 + (i ? y[i - 1] * 0.5 : 0) * 0.5; // a soft pick: the burst a little smoothed
    for (let i = N; i < len; i++) y[i] = 0.4985 * (y[i - N] + y[i - N + 1 < i ? i - N + 1 : i - N]); // the string ringing down
    return (GTR.bufs[f] = b);
  }
  function guitarMusic(on) {
    try {
      if (on === GTR.on) return; GTR.on = on;
      if (!AC) sound(); if (!AC) return;
      if (on) {
        GTR.out = AC.createGain(); GTR.out.gain.setValueAtTime(0.0001, AC.currentTime); GTR.out.gain.exponentialRampToValueAtTime(0.22, AC.currentTime + 0.6); GTR.out.connect(AC.destination);
        GTR.next = AC.currentTime + 0.1; GTR.n = 0;
        const beat = 60 / 96 / 2, tick = () => {
          if (!GTR.on) return;
          while (GTR.next < AC.currentTime + 0.4) {
            const dir = STRUM[GTR.n % 8], ch = CHORDS[Math.floor(GTR.n / 8) % 4];
            if (dir) { const strs = dir > 0 ? ch : ch.slice(-4).reverse(); strs.forEach((f, i) => { const src = AC.createBufferSource(), g = AC.createGain(); src.buffer = pluck(f); g.gain.value = (dir > 0 ? 0.9 : 0.55) * (0.85 + Math.random() * 0.3); src.connect(g); g.connect(GTR.out); src.start(GTR.next + i * (dir > 0 ? 0.014 : 0.01)); src.stop(GTR.next + 2.2); }); }
            GTR.next += beat * (GTR.n % 2 ? 0.94 : 1.06); GTR.n++; // (a little swing)
          }
          GTR.timer = setTimeout(tick, 120);
        };
        tick();
      } else { clearTimeout(GTR.timer); const o = GTR.out; GTR.out = null; if (o) { o.gain.setValueAtTime(o.gain.value, AC.currentTime); o.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.8); setTimeout(() => o.disconnect(), 1200); } }
    } catch (e) { /* no sound on this device */ }
  }
  function float(x, y, s) { const f = document.createElement('div'); f.className = 'ih-float'; f.textContent = s; f.style.left = x + 'px'; f.style.top = y + 'px'; O.root.appendChild(f); setTimeout(() => f.remove(), 1200); }
  let toastT = 0;
  function toast(s) { if (O.away && IH.village && IH.village.toast) return IH.village.toast(s); const el = $('.ih-toast', O.root); el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }

  // ---------- pictures for the tray and the homes list, drawn with the same anime look
  function thumbRig() {
    if (thumbPipe) return thumbPipe;
    const p = new LK.Pipeline(R); p.bg = false; p.setSize(150, 150, 1); p.u.uPx.value = 1.2; p.u.uGlowK.value = 0;
    const sc = new T.Scene(), dl = new T.DirectionalLight(0xffffff, 1); dl.position.set(-4, 10, 6); sc.add(dl);
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200), rt = new T.WebGLRenderTarget(150, 150), cv = document.createElement('canvas'); cv.width = cv.height = 150;
    thumbPipe = { p, sc, cam, rt, cv, ctx: cv.getContext('2d'), buf: new Uint8Array(150 * 150 * 4) };
    return thumbPipe;
  }
  function snap(obj, w, h, pitch = 0.5, pad = 1.12) {
    const tp = thumbRig(), { p, sc, cam } = tp;
    if (tp.rt.width !== w || tp.rt.height !== h) { tp.rt.setSize(w, h); p.setSize(w, h, 1); tp.cv.width = w; tp.cv.height = h; tp.buf = new Uint8Array(w * h * 4); }
    sc.add(obj); obj.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(obj), c = box.getCenter(new T.Vector3()), yaw = Math.PI / 4;
    cam.position.set(c.x + Math.sin(yaw) * Math.cos(pitch) * 60, c.y + Math.sin(pitch) * 60, c.z + Math.cos(yaw) * Math.cos(pitch) * 60); cam.lookAt(c); cam.updateMatrixWorld();
    let mx = 0.01, my = 0.01; for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) { const v = new T.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse); mx = Math.max(mx, Math.abs(v.x - 0)); my = Math.max(my, Math.abs(v.y)); }
    const a = w / h, half = Math.max(my, mx / a) * pad; cam.left = -half * a; cam.right = half * a; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
    const ph = LK.PHASES.day, saved = { lit: LK.PAL.uLit.value.clone(), shade: LK.PAL.uShade.value.clone(), plain: LK.PAL.uPlain.value };
    LK.setPhase('day'); LK.PAL.uPlain.value = 0; p.phase(ph); p.u.uGlowK.value = 0;
    p.render(sc, cam, tp.rt); R.readRenderTargetPixels(tp.rt, 0, 0, w, h, tp.buf);
    LK.setPhase(O.st.look.phase); LK.PAL.uPlain.value = saved.plain;
    sc.remove(obj);
    const img = tp.ctx.createImageData(w, h); for (let y = 0; y < h; y++) img.data.set(tp.buf.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    tp.ctx.putImageData(img, 0, 0); return tp.cv.toDataURL('image/png');
  }
  function thumbsSome() {
    const t0 = performance.now();
    while (O.thumbQ.length && performance.now() - t0 < 30) {
      const t = O.thumbQ.shift(); if (THUMBS[t]) continue;
      if (t === 'cat' && IH.yami && !IH.yami.ready) { O.thumbQ.push(t); break; }
      try { const inst = make(BY[t], { w: 2, h: 2.1, wy: 1.45 }); if (inst.pet) poseOf(inst, 'sit', 0, 0); THUMBS[t] = snap(inst.group, 150, 150); inst.group.traverse(m => { if (m.isMesh && m.material !== LK.BASE && m.material !== LK.BASE2) m.material.dispose(); }); } catch (e) { THUMBS[t] = ''; console.error(e); }
      const img = O.root.querySelector(`[data-thumb="${t}"]`); if (img && THUMBS[t]) img.src = THUMBS[t];
    }
  }
  function homeThumb(id) {
    if (HOME_THUMBS[id]) return HOME_THUMBS[id];
    const h = buildHome(HB[id]); h.setYaw(Math.PI / 4);
    // the home kid lives in shows their things
    const g = new T.Group(); g.add(h.root);
    HOME_THUMBS[id] = snap(g, 320, 220, 0.56, 1.0);
    h.root.traverse(m => { if (m.isMesh) m.geometry.dispose(); });
    return HOME_THUMBS[id];
  }

  // ---------- screens
  function ui(light) {
    if (!O) return; const r = O.root, st = O.st, w = wallet(), H0 = HB[st.cur];
    $('.ih-homename', r).textContent = H0.name; $('.ih-xpn', r).textContent = nf(w.left);
    $('.ih-zoomv', r).style.setProperty('--z', ((CAM.zoom - ZMIN) / (ZMAX - ZMIN)).toFixed(3));
    if (light) return;
    r.classList.toggle('editing', !!O.editing); r.classList.toggle('holding', !!O.held);
    // the hold bar
    const hb = $('.ih-hold', r);
    if (O.held) {
      const h = O.held; hb.hidden = false;
      hb.innerHTML = `<div class="ih-hold-n"><b>${esc(h.def.name)}</b><small class="${h.ok ? 'ok' : 'no'}">${h.ok ? (h.def.kind === 'wall' ? 'Drag it along the wall' : 'Drag it where you like') : esc(WHY[h.why] || 'That doesn’t fit there')}</small></div>
        ${h.def.kind !== 'wall' && h.def.fp[0] + h.def.fp[1] > 2 || (h.def.kind !== 'wall' && h.def.kind !== 'pet') ? `<button class="ih-hb" data-a="turnItem">${ic('turn')}<span>Turn</span></button>` : ''}
        <button class="ih-hb" data-a="putAway">${ic('box')}<span>Put away</span></button>
        <button class="ih-hb ih-go ${h.ok ? '' : 'off'}" data-a="place">${ic('check')}<span>Place</span></button>`;
    } else hb.hidden = true;
    // the tray
    const tray = $('.ih-tray', r);
    if (O.editing && !O.held) { tray.hidden = false; drawTray(); } else tray.hidden = true;
    $('.ih-deco', r).innerHTML = O.editing ? `${ic('check')}<span>Done</span>` : `${ic('brush')}<span>Decorate</span>`;
  }
  function drawTray() {
    const r = O.root, cat = O.cat || 'mine', w = wallet();
    let list = cat === 'mine' ? DEFS.filter(d => spare(d.t) > 0) : DEFS.filter(d => d.cat === cat);
    const tabs = CATS.map(([k, n]) => `<button class="ih-tab ${k === cat ? 'on' : ''}" data-a="cat" data-c="${k}">${n}${k === 'mine' ? ` <i>${DEFS.reduce((a, d) => a + Math.max(0, spare(d.t)), 0)}</i>` : ''}</button>`).join('');
    const cards = list.map(d => {
      const n = spare(d.t), locked = (d.earn || 0) > w.earned && !n;
      const tag = n > 0 ? `<span class="ih-own">×${n}</span>` : locked ? `<span class="ih-lock">${ic('lock')} ${nf(d.earn)} XP</span>` : `<span class="ih-price">✨ ${nf(d.xp)}</span>`;
      return `<button class="ih-card ${locked ? 'locked' : ''}" data-a="item" data-t="${d.t}"><img alt="" data-thumb="${d.t}" ${THUMBS[d.t] ? `src="${THUMBS[d.t]}"` : ''}><b>${esc(d.name)}</b>${tag}</button>`;
    }).join('') || `<p class="ih-empty">${cat === 'mine' ? 'Everything you own is out in your home. Buy something new from the other tabs, or tap a thing in your home and put it away.' : 'Nothing here yet.'}</p>`;
    $('.ih-tray', r).innerHTML = `<div class="ih-tabs">${tabs}</div><div class="ih-cards">${cards}</div>`;
    O.thumbQ = list.map(d => d.t).filter(t => !THUMBS[t]);
  }
  function sheet(html, cls = '') { const s = $('.ih-sheet', O.root); s.className = 'ih-sheet ' + cls; s.innerHTML = `<div class="ih-sheet-in" role="dialog">${html}</div>`; s.hidden = false; }
  const closeSheet = () => { const s = $('.ih-sheet', O.root); s.hidden = true; s.innerHTML = ''; };
  // ---------- the phone: the kid's character's own smartphone, where the home's shopping happens. Apps: Shop (things
  // for the home), Homes, Groceries (food for the fridge and pantry), Recipes (what to cook next) and Market (sell
  // things you're not using back for XP). Everything is in XP, never money.
  // islands that are land on the farm now (farm-land.js), not places to travel to
  const LAND_NOW = { plot: 1, orchard: 1 };
  const APPS = [['bank', '🏦', 'Banking'], ['farm', '🚜', 'Farm'], ['shop', '🛋️', 'Shop'], ['homes', '🏠', 'Homes'], ['groceries', '🛒', 'Groceries'], ['recipes', '🍳', 'Recipes'], ['market', '🏷️', 'Market'], ['jobs', '💼', 'Employment'], ['travel', '🧭', 'Travel to']];
  const sellValue = (d, used) => Math.max(10, Math.round(d.xp * (used ? 0.3 : 0.5) / 10) * 10);
  // the Market app pays sellers half what they'd get in person (a village shop, your stall)
  const phoneSell = (d, used) => Math.max(5, Math.round(sellValue(d, used) / 2 / 5) * 5);
  // Second-hand: a fresh handful of used things every day (other families selling up), cheaper than new by how
  // well loved they are. Each comes in the colour and finish its last owner picked.
  const CONDS = [['Like new', 0.7], ['Good', 0.55], ['Well loved', 0.4]];
  function usedStock() {
    const day = Math.floor(Date.now() / 864e5), seed = [...String(O.kid.id)].reduce((a, c) => a * 31 + c.charCodeAt(0), day) >>> 0, R = IH.kit.rng(seed);
    const pool = DEFS.filter(d => d.xp && !d.pet && d.kind !== 'pet'), out = [], took = new Set((O.st.usedBought && O.st.usedBought.day === day && O.st.usedBought.ids) || []);
    for (let i = 0; i < 14 && pool.length; i++) {
      const d = pool.splice(Math.floor(R() * pool.length), 1)[0], [cond, k] = CONDS[Math.floor(R() * 3)], fins = finishesFor(d);
      const fin = choosy(d) ? { c: R() < 0.8 ? SWATCHES[Math.floor(R() * SWATCHES.length)] : null, f: fins.length ? fins[Math.floor(R() * fins.length)].id : 'plain' } : {};
      const id = day + ':' + d.t; if (!took.has(id)) out.push({ id, day, t: d.t, cond, fin, xp: Math.max(10, Math.round(d.xp * k / 10) * 10) });
    }
    return out;
  }
  // the Banking app: both accounts, pay yourself (once a day) and invest, and every move with its slip
  function bankHtml() {
    const a = farmAcct(), w = wallet().left, tab = O.bkTab || 'acct', L = O.st.ledger || [];
    const nb = O.E ? O.E.dueCount() : 0;
    const tabs = `<div class="ih-seg ih-ph-tabs"><button class="${tab === 'acct' ? 'on' : ''}" data-a="bkTab" data-v="acct">Accounts</button><button class="${tab === 'bills' ? 'on' : ''}" data-a="bkTab" data-v="bills">Bills${nb ? ` <i class="ih-bk-n">${nb}</i>` : ''}</button><button class="${tab === 'tx' ? 'on' : ''}" data-a="bkTab" data-v="tx">Transactions</button></div>`;
    if (tab === 'bills') return `${tabs}${O.E ? O.E.billsHtml() : ''}`;
    const when = at => new Date(at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
    if (tab === 'tx') return `${tabs}<div class="ih-ph-list">${L.length ? L.map(e => `<button class="ih-ph-row ih-bk-tx" data-a="slipOpen" data-id="${e.id}"><span class="ih-ph-e">${e.acct === 'farm' ? '🚜' : '👛'}</span><span><b>${esc(cap(e.memo))}</b><small>${when(e.at)} · ${e.acct === 'farm' ? 'Farm account' : 'Wallet'}</small></span><span class="ih-bk-amt ${e.amt < 0 ? 'out' : 'in'}">${e.amt < 0 ? '−' : '+'}✨ ${nf(Math.abs(e.amt))}</span></button>`).join('') : '<p class="ih-ph-sub">Nothing yet. Sell something from your farm, or buy something, and it shows here with its slip.</p>'}</div>`;
    const paid = a.wageDay === dayNo(), pays = [50, 100, 250].filter(n => n < a.bal), invs = [50, 100, 250, 500].filter(n => n <= w);
    return `${tabs}<div class="ih-bk-cards"><div class="ih-bk-card"><small>👛 Wallet</small><b>✨ ${nf(w)}</b><span>Chores, lessons, jobs and selling your things</span></div><div class="ih-bk-card farm"><small>🚜 Farm account</small><b>✨ ${nf(a.bal)}</b><span>${a.invested ? `You’ve put in ✨ ${nf(a.invested)} from your wallet` : 'What your farm sells and buys'}</span></div></div>
      <h4 class="ih-ph-h4">Pay yourself</h4><p class="ih-ph-sub">A wage from your farm into your wallet, once a day, on a pay slip.</p>
      ${paid ? '<p class="ih-ph-sub"><b>Paid today.</b> Again tomorrow.</p>' : a.bal > 0 ? `<div class="ih-bk-amts">${pays.map(n => `<button class="ih-b1 ih-sm" data-a="bkPay" data-n="${n}">✨ ${n}</button>`).join('')}<button class="ih-b1 ih-sm" data-a="bkPay" data-n="${Math.floor(a.bal)}">All ✨ ${nf(a.bal)}</button></div>` : '<p class="ih-ph-sub">Your farm account is empty. Sell eggs, milk or wool at the grocer to fill it.</p>'}
      <h4 class="ih-ph-h4">Invest in your farm</h4><p class="ih-ph-sub">Put XP from your wallet into the farm account, to buy animals, feed or fences. The farm owes it back to you.</p>
      ${invs.length ? `<div class="ih-bk-amts">${invs.map(n => `<button class="ih-b2 ih-sm" data-a="bkInv" data-n="${n}">✨ ${n}</button>`).join('')}</div>` : '<p class="ih-ph-sub">Your wallet is empty. Chores and lessons fill it.</p>'}
      <button class="ih-bk-grown" data-a="app" data-app="grownups">For grown-ups ›</button>`;
  }
  function phone(app = 'home') {
    const w = wallet(), K = IH.kitchen, f = food(), back = `<button class="ih-ph-back" data-a="phone">‹ Back</button>`;
    let body = '';
    const appBtn = ([k, e, n]) => `<button class="ih-ph-app" data-a="app" data-app="${k}"><span>${e}</span>${n}</button>`;
    if (app === 'home') body = `<div class="ih-ph-apps">${APPS.map(appBtn).join('')}</div>`;
    if (app === 'bank') body = `${back}<h3>🏦 Banking</h3>${bankHtml()}`;
    if (app === 'farm') body = `${back}<h3>🚜 Farm</h3>${O.E ? O.E.farmHtml() : ''}`;
    if (app === 'grownups') body = `<button class="ih-ph-back" data-a="app" data-app="bank">‹ Banking</button><h3>For grown-ups</h3>${O.E ? O.E.grownHtml() : ''}`;
    if (app === 'slip') { const e = (O.st.ledger || []).find(x => x.id === O.slipId); body = `<button class="ih-ph-back" data-a="app" data-app="bank">‹ Banking</button>${e && e.slip ? IH.slip(e.slip, e.at) : '<p class="ih-ph-sub">That slip has gone.</p>'}`; }
    if (app === 'groceries' && K) body = `${back}<h3>Groceries</h3><p class="ih-ph-sub">Food for your fridge and pantry. Your character cooks with it.</p><div class="ih-ph-list">${Object.entries(K.FOOD).map(([id, x]) => `<div class="ih-ph-row"><span class="ih-ph-e">${x.emoji}</span><span><b>${esc(x.name)}</b><small>${f[id] ? `${f[id]} in the ${x.where}` : `None in the ${x.where}`}</small></span><button class="ih-b1 ih-ph-btn" data-a="gbuy" data-f="${id}" ${w.left < x.xp ? 'disabled' : ''}>✨ ${x.xp}</button></div>`).join('')}</div>`;
    if (app === 'recipes' && K) body = `${back}<h3>Recipes</h3><p class="ih-ph-sub">Pick what your character makes next. It needs everything on the list.</p><div class="ih-ph-list">${K.RECIPES.map(r => { const ok = K.has(f, r), next = O.st.recipe === r.id; return `<div class="ih-ph-row"><span class="ih-ph-e">${r.emoji}</span><span><b>${esc(r.name)}</b><small>${r.needs.map(n => `${(f[n] || 0) > 0 ? '✓' : '·'} ${esc(K.FOOD[n].name)}`).join('  ')}</small></span><button class="${next ? 'ih-b2' : 'ih-b1'} ih-ph-btn" data-a="recipe" data-r="${r.id}">${next ? 'Next up' : ok ? 'Make next' : 'Pick'}</button></div>`; }).join('')}</div>`;
    if (app === 'market') {
      const tab = O.mkTab || 'used', tabs = `<div class="ih-seg ih-ph-tabs"><button class="${tab === 'used' ? 'on' : ''}" data-a="mkTab" data-v="used">Buy used</button><button class="${tab === 'sell' ? 'on' : ''}" data-a="mkTab" data-v="sell">Sell</button></div>`;
      let list = '';
      if (tab === 'used') list = usedStock().map(o => { const d = BY[o.t]; return `<div class="ih-ph-row"><img alt="" data-thumb="${d.t}" src="${THUMBS[d.t] || ''}"><span><b>${esc(d.name)}</b><small>${o.fin.c ? `<i class="ih-dot" style="--c:${o.fin.c}"></i>` : ''}${esc(o.cond)} · new ✨ ${nf(d.xp)}</small></span><button class="ih-b1 ih-ph-btn" data-a="usedAsk" data-o="${o.id}" ${w.left < o.xp ? 'disabled' : ''}>✨ ${nf(o.xp)}</button></div>`; }).join('') || '<p class="ih-ph-sub">All sold for today. New things come in tomorrow.</p>';
      else list = DEFS.filter(d => d.xp && spare(d.t) > 0).map(d => boxOf(d.t).map((u, n) => `<div class="ih-ph-row"><img alt="" data-thumb="${d.t}" src="${THUMBS[d.t] || ''}"><span><b>${esc(d.name)}</b><small>${u.fin && u.fin.c ? `<i class="ih-dot" style="--c:${u.fin.c}"></i>` : ''}${u.used ? `Used · ${esc(u.cond || 'Good')}` : 'Bought new'}</small></span><button class="ih-b1 ih-ph-btn" data-a="sell" data-t="${d.t}" data-n="${n}">Sell ✨ ${phoneSell(d, u.used)}</button></div>`).join('')).join('') || '<p class="ih-ph-sub">Nothing spare right now. Put something away from your home and it’ll show here.</p>';
      body = `${back}<h3>Market</h3><p class="ih-ph-sub">${tab === 'used' ? 'Second-hand things from other homes, cheaper than new.' : 'Things in Mine you’re not using. Selling here pays half what a village shop or your market stall pays in person.'}</p>${tabs}<div class="ih-ph-list">${list}</div>`;
      O.thumbQ = DEFS.map(d => d.t).filter(t => !THUMBS[t]).slice(0, 40);
    }
    if (app === 'jobs') {
      const tab = O.jbTab || 'hire', tabs = `<div class="ih-seg ih-ph-tabs"><button class="${tab === 'hire' ? 'on' : ''}" data-a="jbTab" data-v="hire">Hire help</button><button class="${tab === 'work' ? 'on' : ''}" data-a="jbTab" data-v="work">Find work</button></div>`;
      let inner = '';
      if (tab === 'hire') {
        const g = hasLawn() ? lawnGrowth() : 0, j = myJob(), state = !hasLawn() ? 'This home has no lawn.' : g >= 1 ? 'The grass is getting long.' : g > 0.5 ? 'The grass is growing.' : 'Freshly mowed.';
        inner = `<div class="ih-ph-row"><span class="ih-ph-e">🌱</span><span><b>Your lawn</b><small>${state}</small></span></div>`;
        if (j) inner += `<div class="ih-ph-row"><span class="ih-ph-e">🚜</span><span><b>Mow the lawn · ✨ ${j.pay}</b><small>${j.state === 'open' ? 'Waiting for someone to take it' : `${esc(j.byName)} is coming to mow`}</small></span>${j.state === 'open' ? '<button class="ih-b2 ih-ph-btn" data-a="jbCancel">Take down</button>' : ''}</div>`;
        else if (hasLawn()) inner += `<p class="ih-ph-sub">Put up a job for a brother or sister with a mower. You pay them with your XP when it’s done.</p><div class="ih-ph-list">${PAYS.map(p => `<div class="ih-ph-row"><span class="ih-ph-e">🚜</span><span><b>Mow my lawn</b><small>Pay ✨ ${p} XP</small></span><button class="ih-b1 ih-ph-btn" data-a="jbPost" data-p="${p}" ${w.left < p ? 'disabled' : ''}>Post</button></div>`).join('')}<div class="ih-ph-row"><span class="ih-ph-e">🧑‍🌾</span><span><b>Lawn service</b><small>Comes straight away</small></span><button class="ih-b1 ih-ph-btn" data-a="jbService" ${w.left < SERVICE ? 'disabled' : ''}>✨ ${SERVICE}</button></div></div>`;
      } else {
        const fam = family().map(k => k.id), open = JOBS.all().filter(j => j.state === 'open' && j.from !== O.kid.id && (!fam.length || fam.includes(j.from))), mine = JOBS.all().filter(j => j.by === O.kid.id && j.state === 'taken');
        inner = `<p class="ih-ph-sub">Jobs from your brothers and sisters. You need a lawnmower to mow.${O.st.jobPay ? ` You’ve earned ✨ ${nf(O.st.jobPay)} XP from jobs.` : ''}</p><div class="ih-ph-list">${mine.map(j => `<div class="ih-ph-row"><span class="ih-ph-e">✅</span><span><b>Mow ${esc(j.fromName)}’s lawn · ✨ ${j.pay}</b><small>You’ll go over next time their home is open</small></span></div>`).join('')}${open.map(j => `<div class="ih-ph-row"><span class="ih-ph-e">🚜</span><span><b>Mow ${esc(j.fromName)}’s lawn</b><small>Pays ✨ ${j.pay} XP</small></span><button class="ih-b1 ih-ph-btn" data-a="jbTake" data-j="${j.id}">Take it</button></div>`).join('') || (mine.length ? '' : '<p class="ih-ph-sub">No jobs right now.</p>')}</div>`;
        inner += villageJobsHtml();
      }
      body = `${back}<h3>Employment</h3>${tabs}${inner}`;
    }
    if (app === 'travel') {
      const L = IH.islandsBuild ? IH.islandsBuild.LIST.filter(i => !LAND_NOW[i.id]) : [], own = islandsOwned(), here = O.away ? (IH.village && IH.village.where()) : 'home';
      const row = (id, e, name, sub, btn) => `<div class="ih-ph-row${here === id ? ' ih-here' : ''}"><span class="ih-ph-e">${e}</span><span><b>${esc(name)}</b><small>${sub}</small></span>${btn}</div>`;
      const go = id => here === id ? '<small class="ih-ph-tag">You’re here</small>' : `<button class="ih-b1 ih-sm" data-a="goTo" data-w="${id}">Go</button>`;
      body = `${back}<h3>Travel to</h3><p class="ih-ph-sub">Your home, the village and your islands. Vacation islands are for playing; on utility islands you make things to cook or sell.</p><div class="ih-ph-list">
        ${row('home', '🏠', O.home && O.home.def ? O.home.def.name : 'Home', 'Your home', go('home'))}${row('village', '🏮', 'Hoshi Street', 'The village: shops, café, market', go('village'))}
        ${L.map(i => { const has = own[i.id], kind = i.kind === 'vacation' ? '🌴 Vacation' : '🛠️ Utility', needs = i.needs && !own[i.needs];
          return row(i.id, i.emoji, i.name, `${kind} · ${esc(i.about)}`, has ? go(i.id) : !i.built ? '<small class="ih-ph-tag">Coming soon</small>' : needs ? `<small class="ih-ph-tag">Needs the ${esc((L.find(q => q.id === i.needs) || {}).name || i.needs)}</small>` : `<button class="ih-b2 ih-sm" data-a="isBuy" data-w="${i.id}" ${w.left < i.xp ? 'disabled' : ''}>✨ ${nf(i.xp)}</button>`); }).join('')}</div>`;
    }
    sheet(`<div class="ih-phone"><div class="ih-ph-top"><span>${new Date().toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}</span><span>✨ ${nf(w.left)} XP</span></div><div class="ih-ph-screen">${body}</div><button class="ih-ph-home" data-a="${app === 'home' ? 'sheetX' : 'phone'}" aria-label="${app === 'home' ? 'Close the phone' : 'Home screen'}"></button></div>`, 'phone');
    O.phoneApp = app;
  }
  // Which colours and finishes a thing comes in: pets and windows as they are; floors, walls and doors in any colour
  // (their look is the pattern); everything else in any colour and finish.
  const choosy = d => !d.pet && !d.opening;
  const finishesFor = d => d.apply === 'floor' || d.apply === 'wall' ? [] : d.apply === 'door' ? FINISHES.filter(f => ['plain', 'wood'].includes(f.id)) : d.cover ? FINISHES.filter(f => ['plain', 'weave', 'velvet', 'stripes', 'dots', 'flowers', 'knit'].includes(f.id)) : FINISHES;
  const preview = (d, fin) => { try { const inst = make(d, { fin, w: 2, h: 2.1, wy: 1.45 }); const src = snap(inst.group, 150, 150); inst.group.traverse(m => { if (m.isMesh && m.material !== LK.BASE && m.material !== LK.BASE2 && !m.userData.special) m.material.dispose(); }); return src; } catch (e) { return THUMBS[d.t] || ''; } };
  function buyAsk(d, offer) {
    const w = wallet(), price = offer ? offer.xp : d.xp, short = w.left < price;
    const pick = O.pick = O.pick && O.pick.t === d.t && !offer ? O.pick : { t: d.t, c: offer ? offer.fin.c : null, f: offer ? offer.fin.f : 'plain' };
    const fin = { c: pick.c, f: pick.f }, fins = finishesFor(d);
    const sw = choosy(d) && !offer ? `<div class="ih-sw">${[null, ...SWATCHES].map(c => `<button class="${pick.c === c ? 'on' : ''}" data-a="pickC" data-c="${c || ''}" style="--c:${c || 'transparent'}" aria-label="${c ? 'Colour ' + c : 'As it comes'}">${c ? '' : '✦'}</button>`).join('')}</div>` : '';
    const fs = choosy(d) && !offer && fins.length ? `<div class="ih-fin">${fins.map(f => `<button class="${pick.f === f.id ? 'on' : ''}" data-a="pickF" data-f="${f.id}">${esc(f.name)}</button>`).join('')}</div>` : '';
    const where = d.apply === 'floor' || d.apply === 'wall' ? `<p class="ih-ask-s2">Pick the room for it next.</p>` : d.apply === 'door' ? `<p class="ih-ask-s2">It goes in your front door.</p>` : '';
    sheet(`<div class="ih-ask"><img alt="" src="${choosy(d) ? preview(d, fin) : THUMBS[d.t] || ''}"><h3>${esc(d.name)}${offer ? ` <span class="ih-used">Used · ${esc(offer.cond)}</span>` : ''}</h3>${d.blurb ? `<p>${esc(d.blurb)}</p>` : ''}
      ${sw}${fs}${where}
      <p class="ih-ask-p">✨ <b>${nf(price)}</b> XP${offer ? ` <s>${nf(d.xp)}</s>` : ''}</p>${short ? `<p class="ih-ask-s">You have ${nf(w.left)} XP. Finish a mission or a lesson to earn more.</p>` : ''}
      <div class="ih-row"><button class="ih-b2" data-a="${offer ? 'app' : 'sheetX'}" data-app="market">Not now</button><button class="ih-b1" data-a="buy" data-t="${d.t}" ${offer ? `data-o="${offer.id}"` : ''} ${short ? 'disabled' : ''}>Buy it</button></div></div>`, 'small');
    O.askOffer = offer || null;
  }
  // A floor or wall covering for one room of this home, or a new front door.
  function roomAsk(d, fin, used) {
    O.pendingReno = { t: d.t, fin, used };
    const rooms = HB[O.st.cur].rooms;
    sheet(`<div class="ih-sh-h"><h3>${esc(d.name)}: which room?</h3><button class="ih-btn" data-a="sheetX" aria-label="Close">${ic('close')}</button></div><div class="ih-ph-list">${rooms.map((r, i) => `<button class="ih-ph-row ih-room" data-a="renoRoom" data-i="${i}"><span><b>${esc(r.name)}</b><small>${r.w} × ${r.d} tiles</small></span></button>`).join('')}</div>`, 'small');
  }
  function applyReno(i) {
    const P = O.pendingReno; if (!P) return; const d = BY[P.t], h = hrec(), rn = (h.reno = h.reno || {}); O.pendingReno = null;
    const val = { t: P.t, c: (P.fin && P.fin.c) || d.col, f: P.fin && P.fin.f, used: P.used ? 1 : 0 };
    if (d.apply === 'door') rn.door = val; else { rn.rooms = rn.rooms || []; rn.rooms[i] = rn.rooms[i] || {}; rn.rooms[i][d.apply] = val; }
    closeSheet(); rebuildHouse(); save(); ui(); sound('place'); toast(d.apply === 'door' ? 'Your new front door is in.' : `${HB[O.st.cur].rooms[i].name} is done. Looking good!`);
    if (O.opts.track) O.opts.track('home.reno', { t: P.t, room: d.apply === 'door' ? 'door' : HB[O.st.cur].rooms[i].name, used: !!P.used });
  }
  function buy(t, offerId) {
    const d = BY[t], w = wallet(), offer = offerId ? usedStock().find(o => o.id === offerId) : null, price = offer ? offer.xp : d && d.xp; if (!d || w.left < price) return;
    const fin = offer ? offer.fin : O.pick && O.pick.t === t && (O.pick.c || (O.pick.f && O.pick.f !== 'plain')) ? { c: O.pick.c, f: O.pick.f } : null;
    wSpend(price, `${d.name}${offer ? ' (used)' : ''}`, offer ? 'CHORECAST MARKET' : 'CHORECAST SHOP'); sound('buy'); closeSheet(); ui(true);
    if (offer) { const ub = (O.st.usedBought = O.st.usedBought && O.st.usedBought.day === offer.day ? O.st.usedBought : { day: offer.day, ids: [] }); ub.ids.push(offer.id); }
    if (O.opts.track) O.opts.track(offer ? 'home.buyUsed' : 'home.buy', { t, xp: price, fin });
    if (d.apply) { save(); return d.apply === 'door' ? (O.pendingReno = { t, fin, used: !!offer }, applyReno(0)) : roomAsk(d, fin, !!offer); }
    O.st.owned[t] = (O.st.owned[t] || 0) + 1; const b = boxOf(t); b.pop(); b.unshift({ fin, used: offer ? 1 : 0, cond: offer && offer.cond }); save();
    if (O.away) { toast(`${d.name} is yours! It’s in Mine, ready to set out at home.`); if (O.opts.track) O.opts.track('village.buy', { t, xp: price, used: !!offer }); return; } // (bought in a village shop: it goes home with you)
    if (offer) { toast(`${d.name} is yours. It's in Mine.`); return phone('market'); }
    // an upgrade takes the place of what it upgrades (that one goes to Mine)
    const old = d.up && items().find(it => it.t === d.up && fits(d, { ...it, t }, it.id).ok);
    if (old) { dropInst(old.id); old.t = t; addInst(old); save(); toast(`${d.name} is in. Your old one is in Mine.`); return; }
    startNew(d);
  }
  function startNew(d) {
    const spot = freeSpot(d); if (!spot) { toast(d.cover ? 'Hang a window first, then drop this on it.' : d.opening ? 'Turn the view so an outside wall with room faces you.' : 'There’s no room for that here. Put something away, or try another room.'); O.cat = 'mine'; ui(); return; }
    const b = boxOf(d.t), one = b.shift() || {}, rec = { id: uid(), t: d.t, ...spot }; if (one.fin) rec.fin = one.fin; if (one.used) { rec.used = 1; rec.cond = one.cond; }
    hold(rec, true);
  }
  function homesSheet() {
    const w = wallet(), st = O.st;
    const cards = HOMES.map(h => {
      const own = !!st.own[h.id], here = st.cur === h.id, locked = !own && h.earn > w.earned;
      const btn = here ? `<span class="ih-here">${ic('home')} You live here</span>` : own ? `<button class="ih-b1" data-a="moveAsk" data-h="${h.id}">Move in</button>` : locked ? `<span class="ih-lock">${ic('lock')} Unlocks when you’ve earned ${nf(h.earn)} XP</span>` : `<button class="ih-b1" data-a="homeBuyAsk" data-h="${h.id}">✨ ${nf(h.xp)} XP</button>`;
      return `<div class="ih-hcard ${here ? 'here' : ''} ${locked ? 'locked' : ''}"><div class="ih-himg"><img alt="" data-hthumb="${h.id}"></div><div class="ih-htx"><b>${esc(h.name)}</b><small>${esc(h.size)} · ${esc(h.rooms_)}</small><p>${esc(h.about)}</p>${btn}</div></div>`;
    }).join('');
    sheet(`<div class="ih-sh-h"><h3>Homes</h3><button class="ih-btn" data-a="sheetX" aria-label="Close">${ic('close')}</button></div><p class="ih-sub">From a snug studio to a manor on a hill. Bigger homes unlock as you earn XP.</p><div class="ih-hlist">${cards}</div>`, 'big');
    // draw the pictures one at a time so the list opens straight away
    const ids = HOMES.map(h => h.id); const next = () => { const id = ids.shift(); if (!id || !O || $('.ih-sheet', O.root).hidden) return; const img = O.root.querySelector(`[data-hthumb="${id}"]`); if (img) img.src = homeThumb(id); setTimeout(next, 30); }; setTimeout(next, 60);
  }
  function homeBuyAsk(id) {
    const h = HB[id], w = wallet(), short = w.left < h.xp;
    sheet(`<div class="ih-ask"><img alt="" class="wide" src="${HOME_THUMBS[id] || ''}"><h3>${esc(h.name)}</h3><p>${esc(h.about)}</p><p class="ih-ask-p">✨ <b>${nf(h.xp)}</b> XP</p>${short ? `<p class="ih-ask-s">You have ${nf(w.left)} XP. Keep going, you’ll get there.</p>` : ''}
      <div class="ih-row"><button class="ih-b2" data-a="homes">Back</button><button class="ih-b1" data-a="homeBuy" data-h="${id}" ${short ? 'disabled' : ''}>Buy it</button></div></div>`, 'small');
  }
  function homeBuy(id) {
    const h = HB[id], w = wallet(); if (w.left < h.xp) return;
    wSpend(h.xp, h.name ? `a new home: ${h.name}` : 'a new home', 'CHORECAST HOMES'); O.st.own[id] = 1; save(); sound('buy'); if (O.opts.track) O.opts.track('home.buyHome', { home: id, xp: h.xp });
    moveAsk(id, true);
  }
  function moveAsk(id, justBought) {
    const n = items().filter(it => !BY[it.t].pet || true).length, h = HB[id];
    sheet(`<div class="ih-ask"><img alt="" class="wide" src="${HOME_THUMBS[id] || ''}"><h3>${justBought ? `The ${esc(h.name)} is yours!` : `Move to the ${esc(h.name)}?`}</h3>
      ${n ? `<p>Bring your things with you? They’ll be in Mine, ready to put out in your new home.</p><div class="ih-row"><button class="ih-b2" data-a="move" data-h="${id}" data-bring="0">Leave them here</button><button class="ih-b1" data-a="move" data-h="${id}" data-bring="1">Bring my things</button></div>`
        : `<div class="ih-row"><button class="ih-b2" data-a="sheetX">Not now</button><button class="ih-b1" data-a="move" data-h="${id}" data-bring="0">Move in</button></div>`}</div>`, 'small');
  }
  function move(id, bring) {
    closeSheet(); if (O.held) cancelHeld();
    if (bring) O.st.homes[O.st.cur].items = [];
    O.st.cur = id; O.st.homes[id] = O.st.homes[id] || { items: [] }; save(); sound('move');
    CAM.view = 0; CAM.yaw = Math.PI / 4; loadHome(); CAM.intro = { a: 0.7, b: 1, t0: lastT || 0 };
    if (O.opts.track) O.opts.track('home.move', { home: id, bring: !!bring });
    if (bring || !items().length) { O.editing = true; O.cat = 'mine'; }
    ui(); toast(`Welcome to your ${HB[id].name}!`);
  }
  function lookSheet() {
    const L = O.st.look; L.sun = L.sun || 'view'; const seg = (k, opts) => `<div class="ih-seg">${opts.map(([v, n]) => `<button class="${String(L[k]) === String(v) ? 'on' : ''}" data-a="look" data-k="${k}" data-v="${v}">${n}</button>`).join('')}</div>`;
    sheet(`<div class="ih-sh-h"><h3>Prototype look</h3><button class="ih-btn" data-a="sheetX" aria-label="Close">${ic('close')}</button></div>
      <p class="ih-sub">For trying the anime look. Kids wouldn’t see this panel.</p>
      <label>Frames</label>${seg('frames', [['ones', '24 fps'], ['twos', 'On twos · 12'], ['threes', 'On threes · 8'], ['smooth', 'Smooth']])}
      <p class="ih-note">Anime is shot at 24 frames a second and mostly drawn on twos: each picture is held for two frames, so 12 new pictures a second. The pets and the things placed in the home move on those beats; the camera, effects, menus and anything you drag stay smooth at full frame rate.</p>
      <label>Time of day</label>${seg('phase', [['day', 'Day'], ['dusk', 'Sunset'], ['night', 'Night']])}
      ${HB[O.st.cur].apartment ? '' : `<label>Where this home is</label>`}<div class="ih-seg" ${HB[O.st.cur].apartment ? 'hidden' : ''}>${(IH.settings ? IH.settings.KINDS : []).map(([v, n]) => `<button class="${settingOf(O.st, O.st.cur) === v ? 'on' : ''}" data-a="where" data-v="${v}">${n}</button>`).join('')}</div>
      <label>Sun</label>${seg('sun', [['view', 'Follows view'], ['island', 'Fixed to home']])}
      <p class="ih-note">Fixed to home keeps the sun in one place over the home, so shadows and sunny sides stay put as you turn the view.</p>
      <label>Shading</label>${seg('plain', [[0, 'Anime'], [1, 'Plain 3D']])}
      <label>Film look</label>${seg('film', [[1, 'On'], [0, 'Off']])}
      <p class="ih-note">Haze into the distance, sunlight blooming in with soft beams, cool shadows and warm lights, a little film grain: the atmosphere of an anime film's backgrounds.</p>
      <label>Ink lines</label>${seg('ink', [[1, 'On'], [0, 'Off']])}
      ${O.opts.demo ? `<label>Demo</label><div class="ih-row"><button class="ih-b2" data-a="demoXp">Add 5,000 XP</button><button class="ih-b2" data-a="reset">Start again</button></div>` : ''}`, 'small look');
  }

  function act(a, el) {
    const st = O.st;
    if (a === 'close') return close();
    if (a === 'zin') return setZoom(CAM.zoom * 1.3);
    if (a === 'zout') return setZoom(CAM.zoom / 1.3);
    if (a === 'turnL') return turnView(-1);
    if (a === 'turnR') return turnView(1);
    if (a === 'decorate') { actsClose(); if (O.held) placeHeld(); if (O.held) return; O.editing = !O.editing; if (O.editing && !O.cat) O.cat = DEFS.some(d => spare(d.t) > 0) ? 'mine' : 'furn'; sound(O.editing ? 'lift' : 'place'); return ui(); }
    if (a === 'cat') { O.cat = el.dataset.c; return ui(); }
    if (/^(ec|ls)[A-Z]/.test(a) && O.E) { const r = O.E.act(a, el); if (r === 'bank' || r === 'grownups' || r === 'farm') return phone(r); if (r) return; }
    if (a === 'phone') { sound('pop'); return phone('home'); }
    if (a === 'goTo') { closeSheet(); return travelTo(el.dataset.w); }
    if (a === 'isBuy') { const i = IH.islandsBuild && IH.islandsBuild.LIST.find(q => q.id === el.dataset.w); if (!i || !i.built || islandsOwned()[i.id]) return; if (wallet().left < i.xp) return toast(`You need ✨ ${nf(i.xp)} XP for the ${i.name.toLowerCase()}.`); wSpend(i.xp, `the ${i.name}`, 'CHORECAST ISLANDS'); (st.islands = st.islands || {})[i.id] = Date.now(); save(); sound('buy'); ui(true); if (O.opts.track) O.opts.track('island.bought', { id: i.id, xp: i.xp }); toast(`The ${i.name.toLowerCase()} is yours! ${i.emoji}`); return phone('travel'); }
    if (a === 'pSell') { const id = el.dataset.k, P = PRODUCE[id]; if (!P) return; const f = food(), g = goods(); if (P.goods ? !(g[id] > 0) : !(f[id] > 0)) return; if (P.goods) g[id] -= 1; else f[id] -= 1; const pr = O.E ? O.E.price(P.price) : P.price; farmIn(pr, `sold ${P.one} at the grocer`, [[cap(P.one), pr]]); save(); sound('buy'); ui(true); toast(`Sold ${P.one}: ✨ ${pr} into your farm account.`); return produceSheet(); }
    if (a === 'app') { const ap = el.dataset.app; O.pick = null; if (ap === 'shop') { closeSheet(); if (!O.editing) act('decorate'); return; } if (ap === 'homes') { closeSheet(); return homesSheet(); } return phone(ap); }
    if (a === 'gbuy') { const id = el.dataset.f, x = IH.kitchen && IH.kitchen.FOOD[id], w = wallet(); if (!x || w.left < x.xp) return; wSpend(x.xp, x.name ? x.name.toLowerCase() : id, 'GROCERIES APP'); const f = food(); f[id] = (f[id] || 0) + 1; save(); sound('buy'); if (O.opts.track) O.opts.track('home.food', { food: id, xp: x.xp }); return phone('groceries'); }
    if (a === 'recipe') { st.recipe = st.recipe === el.dataset.r ? null : el.dataset.r; save(); sound('pop'); return phone('recipes'); }
    if (a === 'sell') { const d = BY[el.dataset.t]; if (!d || spare(d.t) <= 0) return; const b = boxOf(d.t), u = b.splice(+el.dataset.n || 0, 1)[0] || {}, v = phoneSell(d, u.used); st.owned[d.t] -= 1; wGain(v, `sold on the Market app: ${d.name}`, 'MARKET APP', [[d.name + (u.used ? ' (used)' : ''), sellValue(d, u.used)], ['Market app: 50% less than in person', v - sellValue(d, u.used)]]); save(); sound('buy'); toast(`Sold. ✨ ${v} XP back. In person, at a village shop or your stall, you’d get more.`); if (O.opts.track) O.opts.track('home.sell', { t: d.t, xp: v, used: !!u.used }); return phone('market'); }
    if (a === 'vSell') { const d = BY[el.dataset.t]; if (!d || spare(d.t) <= 0) return; const b = boxOf(d.t), u = b.splice(+el.dataset.n || 0, 1)[0] || {}, v = sellValue(d, u.used); st.owned[d.t] -= 1; wGain(v, `sold in person: ${d.name}`, 'HOSHI STREET SHOPS'); save(); sound('buy'); toast(`Sold! ✨ ${v} XP for the ${d.name.toLowerCase()}.`); if (O.opts.track) O.opts.track('village.sell', { t: d.t, xp: v, used: !!u.used }); return counterSheet(el.dataset.k); }
    if (a === 'kidDo') { const x = O.acts && O.acts[+el.dataset.i]; actsClose(); if (x) { x.run(); sound('place'); } return; }
    if (a === 'mkTab') { O.mkTab = el.dataset.v; return phone('market'); }
    if (a === 'bkTab') { O.bkTab = el.dataset.v; return phone('bank'); }
    if (a === 'slipOpen') { O.slipId = el.dataset.id; sound('pop'); return phone('slip'); }
    if (a === 'bkPay') { const s2 = payYourself(+el.dataset.n); if (!s2) return phone('bank'); O.slipId = (O.st.ledger || [])[0].id; toast(`Paid yourself ✨ ${nf(+el.dataset.n)}.`); return phone('slip'); }
    if (a === 'bkInv') { const s2 = invest(+el.dataset.n); if (!s2) return phone('bank'); save(); sound('buy'); ui(true); O.slipId = (O.st.ledger || [])[0].id; toast(`✨ ${nf(+el.dataset.n)} invested in your farm.`); return phone('slip'); }
    if (a === 'jbTab') { O.jbTab = el.dataset.v; return phone('jobs'); }
    if (a === 'jbPost') { postJob(+el.dataset.p, false); ui(true); return phone('jobs'); }
    if (a === 'jbService') { postJob(SERVICE, true); ui(true); return phone('jobs'); }
    if (a === 'jbCancel') { cancelJob(); ui(true); return phone('jobs'); }
    if (a === 'vjGo') { closeSheet(); return goVillage(); }
    if (a === 'jbTake') { takeJob(el.dataset.j); return phone('jobs'); }
    if (a === 'usedAsk') { const o = usedStock().find(x => x.id === el.dataset.o); if (o) buyAsk(BY[o.t], o); return; }
    if (a === 'pickC') { O.pick.c = el.dataset.c || null; return buyAsk(BY[O.pick.t]); }
    if (a === 'pickF') { O.pick.f = el.dataset.f; return buyAsk(BY[O.pick.t]); }
    if (a === 'renoRoom') return applyReno(+el.dataset.i);
    if (a === 'item') {
      const d = BY[el.dataset.t], w = wallet();
      if (spare(d.t) > 0 && !d.apply) return startNew(d);
      if ((d.earn || 0) > w.earned) { toast(`${d.name} unlocks when you’ve earned ${nf(d.earn)} XP.`); sound('no'); return; }
      return buyAsk(d);
    }
    if (a === 'buy') return buy(el.dataset.t, el.dataset.o);
    if (a === 'place') return placeHeld();
    if (a === 'putAway') return putAway();
    if (a === 'turnItem') return turnHeld();
    if (a === 'homes') return homesSheet();
    if (a === 'homeBuyAsk') return homeBuyAsk(el.dataset.h);
    if (a === 'homeBuy') return homeBuy(el.dataset.h);
    if (a === 'moveAsk') return moveAsk(el.dataset.h);
    if (a === 'move') return move(el.dataset.h, el.dataset.bring === '1');
    if (a === 'sheetX') return closeSheet();
    if (a === 'lookOpen') return lookSheet();
    if (a === 'where') { st.look.setting = st.look.setting || {}; st.look.setting[st.cur] = el.dataset.v; save(); loadHome(); applyLook(); force = true; return lookSheet(); }
    if (a === 'look') { const k = el.dataset.k, v = el.dataset.v; st.look[k] = k === 'ink' || k === 'plain' || k === 'film' ? +v : v; save(); applyLook(); lightFor(st.look.phase); if (O.home) O.S.sun.shadow.needsUpdate = true; force = true; return lookSheet(); }
    if (a === 'demoXp') { st.demo = (st.demo || 0) + 5000; save(); ui(); toast('+5,000 XP for trying things out.'); return; }
    if (a === 'reset') { O.st = fresh(); O.st.look = st.look; save(); closeSheet(); O.editing = false; O.held = null; CAM.view = 0; CAM.yaw = Math.PI / 4; loadHome(); applyLook(); ui(); return; }
  }

  function skeleton(opts) {
    const root = document.createElement('div'); root.id = 'iso-home'; root.className = 'ih';
    root.innerHTML = `
      <div class="ih-top">
        ${opts.onClose ? `<button class="ih-btn" data-a="close" aria-label="Back">${ic('close')}</button>` : ''}
        <button class="ih-pill ih-homebtn" data-a="homes">${ic('home')}<span><b class="ih-homename"></b><small>Homes</small></span></button>
        <div class="ih-sp"></div>
        <div class="ih-pill ih-xp" aria-label="XP to spend">${ic('sparkle')}<b class="ih-xpn">0</b><small>XP</small></div>
        <button class="ih-btn" data-a="phone" aria-label="Phone">${ic('phone')}</button>
        <button class="ih-btn" data-a="lookOpen" aria-label="Prototype look">${ic('eye')}</button>
      </div>
      <div class="ih-side">
        <button class="ih-btn" data-a="zin" aria-label="Zoom in">${ic('plus')}</button>
        <div class="ih-zoomv" aria-hidden="true"><i></i></div>
        <button class="ih-btn" data-a="zout" aria-label="Zoom out">${ic('minus')}</button>
        <span class="ih-gap"></span>
        <button class="ih-btn" data-a="turnL" aria-label="Turn the view left">${ic('left')}</button>
        <button class="ih-btn" data-a="turnR" aria-label="Turn the view right">${ic('right')}</button>
      </div>
      <div class="ih-bottom"><button class="ih-deco" data-a="decorate"></button></div>
      <div class="ih-hold" hidden></div>
      <div class="ih-tray" hidden></div>
      <div class="ih-sheet" hidden></div>
      <div class="ih-acts" role="menu" hidden></div>
      <div class="ih-toast" role="status" aria-live="polite"></div><div class="ih-needs" aria-live="polite"></div>`;
    root.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || !root.contains(b) || b.disabled) return; e.preventDefault(); act(b.dataset.a, b); });
    root.querySelector('.ih-sheet').addEventListener('click', e => { if (e.target.classList.contains('ih-sheet')) closeSheet(); });
    return root;
  }

  function size() {
    if (!O) return;
    let r;
    if (O.mount === document.body) {
      // pinned to what's actually on screen, even when the page under it is zoomed or scrolled sideways
      const v = window.visualViewport; r = v ? { width: v.width, height: v.height } : { width: innerWidth, height: innerHeight };
      Object.assign(O.root.style, v ? { left: v.offsetLeft + 'px', top: v.offsetTop + 'px', width: v.width + 'px', height: v.height + 'px', right: 'auto', bottom: 'auto' } : {});
    } else r = O.mount.getBoundingClientRect();
    O.w = Math.max(1, r.width); O.h = Math.max(1, r.height); const dpr = Math.min(devicePixelRatio || 1, 2);
    R.setPixelRatio(dpr); R.setSize(O.w, O.h, false); O.cv.style.width = O.w + 'px'; O.cv.style.height = O.h + 'px'; pipe.setSize(O.w, O.h, dpr);
    if (O.home) fit(); force = true;
  }

  function open(opts = {}) {
    if (!T) return false; if (O) close(true);
    try { renderer(); } catch (e) { return false; }
    const kid = opts.kid || { id: 'demo', name: 'Ari' }, st = store.load(kid.id);
    if (st.look && !st.look.fr24) { st.look.fr24 = 1; if (st.look.frames === 'twos') st.look.frames = 'ones'; } // (24 frames a second is the default now, 2026-11-10)
    O = { opts, kid, st, S: makeScene(), mount: opts.mount || document.body, editing: false, held: null, cat: null };
    O.markOk = new T.MeshBasicMaterial({ color: 0x7be08c, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    O.markNo = new T.MeshBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    O.root = skeleton(opts); O.cv = R.domElement; O.root.prepend(O.cv); O.mount.appendChild(O.root);
    if (opts.mount && opts.mount !== document.body) O.root.classList.add('inline');
    O.cv.addEventListener('pointerdown', onDown); O.cv.addEventListener('pointermove', onMove); O.cv.addEventListener('pointerup', onUp); O.cv.addEventListener('pointercancel', onUp);
    O.cv.addEventListener('wheel', O.wheel = e => { if (O.away) return; e.preventDefault(); setZoom(CAM.zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    addEventListener('resize', size); addEventListener('keydown', key_); if (window.visualViewport) { visualViewport.addEventListener('resize', size); visualViewport.addEventListener('scroll', size); }
    document.addEventListener('visibilitychange', vis);
    CAM.view = 0; CAM.yaw = Math.PI / 4; CAM.zoom = 1;
    // brothers and sisters (village-net.js): when one goes to the village, a note here with a Go button
    if (IH.villageNet) { const N = IH.villageNet; N.start({ name: kid.name, avatar: kid.avatar, hue: kid.hue }, 'home'); N.pose({ pl: 'home' }); O.netOff = N.on('moved', ({ p, was }) => { if (O && !O.away && p.s && p.s.pl !== 'home' && (!was || was === 'home')) sibNote(p); }); }
    if (O.st.stall && O.st.stall.length) { for (const r of O.st.stall) { O.st.owned[r.t] = (O.st.owned[r.t] || 0) + 1; toBox(r); } O.st.stall = []; save(); } // (left on a stall: back in Mine)
    size(); loadHome(); applyLook(); CAM.intro = { a: 0.62, b: 1, t0: 0 }; lastT = null; beat.reset();
    ui(); force = true; if (!raf) raf = requestAnimationFrame(loop);
    document.body.classList.add('ih-open');
    // the Veggie plot and the Orchard terrace are blocks of land on the farm now (farm-land.js): an owner gets theirs
    // free, with what was growing on it (the beds and trees keep their numbers, so nothing's lost)
    if (IH.farmLand) { const own = O.st.islands || {}, f = (O.st.farm = O.st.farm || {}), land = (f.land = f.land || []); let moved = 0;
      for (const [isl, type] of [['plot', 'field'], ['orchard', 'orchard']]) if (own[isl] && !land.some(b => b.from === isl)) { const slot = ['e', 's', 'w', 'n'].find(q => !land.some(b => b.slot === q)); if (!slot) continue; land.push({ id: Math.random().toString(36).slice(2, 9), slot, type, edge: 'hedge', base: 0, from: isl, free: true, at: Date.now() }); moved++; }
      if (moved) { save(); setTimeout(() => toast(moved === 2 ? 'Your veggie plot and orchard are blocks of land on your farm now, with everything still growing.' : `Your ${own.plot && land.some(b => b.from === 'plot') ? 'veggie plot' : 'orchard'} is a block of land on your farm now, with everything still growing.`), 4000); } }
    // the farm's running costs (economy.js): a played day counted, bills, the Monday statement, reports, lessons
    if (IH.economy) {
      O.E = IH.economy({ st: () => O.st, kid: () => O.kid, food: () => food(), goods: () => goods(), acct: farmAcct, led, slipOf, save, toast, sheet, closeSheet, ui, sound, wGain, nf, esc, sheetOpen: () => !$('.ih-sheet', O.root).hidden });
      O.econT = setInterval(() => { if (O && O.E && !O.paused) O.E.tick(); }, 60000); setTimeout(() => { if (O && O.E) O.E.tick(); }, 2500);
    }
    return true;
  }
  function key_(e) {
    if (!O || O.away) return; if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'Escape') { if (!$('.ih-sheet', O.root).hidden) closeSheet(); else if (O.held) cancelHeld(); else if (O.editing) { O.editing = false; ui(); } else if (O.opts.onClose) close(); }
    else if (e.key === 'r' || e.key === 'R') { if (O.held) turnHeld(); }
    else if (e.key === 'ArrowLeft') turnView(-1); else if (e.key === 'ArrowRight') turnView(1);
    else if (e.key === '+' || e.key === '=') setZoom(CAM.zoom * 1.3); else if (e.key === '-') setZoom(CAM.zoom / 1.3);
  }
  function vis() { if (!O) return; O.paused = document.hidden; if (O.paused) guitarMusic(false); if (!O.paused && !O.away && !raf) { force = true; raf = requestAnimationFrame(loop); } }
  function close(quiet) {
    if (O && O.netOff) { O.netOff(); O.netOff = null; if (IH.villageNet) IH.villageNet.stop(); }
    guitarMusic(false); if (O && O.away && IH.village) { const o = O; O = null; IH.village.close(); O = o; }
    if (!O) return; const o = O; clearInterval(o.econT);
    if (o.held) cancelHeld(); save();
    removeEventListener('resize', size); removeEventListener('keydown', key_); if (window.visualViewport) { visualViewport.removeEventListener('resize', size); visualViewport.removeEventListener('scroll', size); } document.removeEventListener('visibilitychange', vis);
    for (const id of [...insts.keys()]) dropInst(id);
    o.home.root.traverse(m => { if (m.isMesh) m.geometry.dispose(); });
    o.root.remove(); O = null; if (raf) cancelAnimationFrame(raf); raf = 0;
    document.body.classList.remove('ih-open');
    if (!quiet && o.opts.onClose) o.opts.onClose();
  }

  IH.open = open; IH.close = close;
  Object.defineProperty(IH, 'isOpen', { get: () => !!O });
  // Test hook: the state, what's where, and a few levers.
  IH.debug = () => O && {
    econ: O.E,
    st: O.st, home: O.st.cur, items: items().map(it => ({ ...it })), held: O.held && { t: O.held.rec.t, ok: O.held.ok, rec: { ...O.held.rec } }, editing: O.editing,
    cam: { yaw: CAM.yaw, zoom: CAM.zoom, view: CAM.view, fitV: CAM.fitV }, frames: O.frames, beat: beat.mode, wallet: wallet(),
    screenOf(id) { const i = insts.get(id); if (!i) return null; const v = i.group.position.clone().project(O.S.cam), r = O.cv.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top]; },
    cellScreen(x, z, y) { const c = O.home.cells.get(key(x, z)), v = new T.Vector3(x + 0.5, y != null ? y : c ? c.y : 0, z + 0.5).project(O.S.cam), r = O.cv.getBoundingClientRect(); return [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top]; },
    fits: (t, rec) => fits(BY[t], rec, rec.id), act, setZoom, turnView,
    async charShot(ava, st = 'walk', yaw = Math.PI, n = 20) { const c = IH.chars.make(ava, '#7cc8e8'); for (let i = 0; i < 60 && !c.B; i++) await new Promise(r => setTimeout(r, 100)); const g = new T.Group(); g.add(c.group); c.group.rotation.y = yaw; for (let i = 0; i < n; i++) { c.walkD = (c.walkD || 0) + 0.08; IH.chars.pose(c, st, i / 12, 0); } return snap(g, 420, 420, 0.25, 1.05); },
    shadowInfo() { const s = O.S.sun, c = s.shadow.camera; let cast = 0, all = 0; const list = []; O.home.root.traverse(m => { if (m.isMesh) { all++; if (m.castShadow) cast++; m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox; list.push([m.castShadow ? 1 : 0, m.layers.mask, m.visible ? 1 : 0, m.geometry.attributes.position.count, b.min.toArray().map(v => +v.toFixed(1)).join(' ') + ' / ' + b.max.toArray().map(v => +v.toFixed(1)).join(' '), m.material.type, !!m.customDepthMaterial]); } }); return { list, cast, all, sun: s.position.toArray().map(v => +v.toFixed(1)), tgt: s.target.position.toArray(), cam: [c.left, c.right, c.top, c.bottom, c.near, c.far], bounds: O.home.bounds, auto: R.shadowMap.autoUpdate, en: R.shadowMap.enabled }; },
    sunAt(x, y, z) { const s = O.S.sun; s.position.set(s.target.position.x + x, y, s.target.position.z + z); s.updateMatrixWorld(); return s.position.toArray(); },
    travel: () => travel(), goVillage: () => goVillage(), save: () => save(),
    lawnDbg(v) { O.lawn.traverse(m => { if (m.material && m.material.uniforms && m.material.uniforms.uDbg) m.material.uniforms.uDbg.value = v; }); return !!O.lawn; },
    gate() { const G = O.home.gate; if (!G) return null; const v = G.at.clone().setY(0.6).project(O.S.cam), r = O.cv.getBoundingClientRect(); return { at: G.at.toArray(), open: G.open, rot: G.group.children.map(h => +h.rotation.y.toFixed(2)), screen: [(v.x + 1) / 2 * r.width + r.left, (1 - v.y) / 2 * r.height + r.top] }; },
    canStep: (a, b, c, d) => canStep(a, b, c, d, occ(KID)), moveCarried: (id, x, z) => { const i = insts.get(id); moveCarried(i, x, z, occ(id)); return i.petAi.pos.toArray(); }, wallKeys: () => [...O.home.walls].filter(k => k.startsWith('v0,')),
    // test hook: where a character or pet is and what it's doing
    where(id) { const i = insts.get(id); return i && i.petAi && { pos: i.petAi.pos.toArray().map(v => +v.toFixed(2)), use: i.petAi.use && i.petAi.use.pose, on: i.petAi.use && i.petAi.use.id, bones: i.B && Object.fromEntries(['hips', 'chest', 'head', 'foot.L', 'hand.R', 'hand.L'].filter(n => i.B[n]).map(n => [n, i.B[n].getWorldPosition(new T.Vector3()).toArray().map(v => +v.toFixed(2))])) }; },
    // test hook: hold every pet in one state, facing one way (null lets them go)
    // test hook: switch a character's current move to one of its branches and hold it
    clothMotion() { return [...insts.values()].filter(i => i.cloth).map(i => i.cloth.motion); },
    body(id) { const i = insts.get(id); return i && i.cols && { floorY: i.floorY, lift: i.cur.__lift, by: i.body.position.y, caps: IH.rig3d.capsules(i, i.cols).map((k, n) => [i.cols[n].bone, +k.r.toFixed(3), +Math.min(k.a.y, k.b.y).toFixed(2), k.a.toArray().map(v => +v.toFixed(2)), k.b.toArray().map(v => +v.toFixed(2))]) }; },
    branch(id, pose) { const i = insts.get(id), U = i && i.petAi && i.petAi.use; if (!U) return false; U.pose = pose; U.nextMove = 1e9; U.until = 1e9; return true; },
    // test hooks: put a thing down (this visit only), and sit a character or pet on or at a thing
    place(t, x, z, r = 0) { const rec = { id: uid(), t, x, z, r }; const i = addInst(rec); force = true; return i && rec.id; },
    useIt(id, recId) { const i = insts.get(id), it = insts.get(recId); if (!i || !it) return false; const A = i.petAi; A.carried = false; A.use = null; A.pos.copy(it.group.position); return useNear(i); },
    life() { const S = O.life; return { dust: S && S.dust.length, bowls: S && S.bowls.length, messy: S && [...S.messy], dirty: S && [...S.dirty], who: [...insts.values()].filter(i => i.petAi).map(i => ({ id: i.rec.id, needs: i.needs && Object.fromEntries(Object.entries(i.needs).map(([k, v]) => [k, Math.round(v)])), use: i.petAi.use && i.petAi.use.pose, doing: i.petAi.doing && i.petAi.doing.pose, task: i.petAi.task && (i.petAi.task.chore || i.petAi.task.type + ':' + (i.petAi.task.it ? i.petAi.task.it.def.t : i.petAi.task.pose)), st: i.petAi.st })) }; },
    up(id) { const i = insts.get(id); if (!i) return false; if (i.petAi.use) leaveUse(i); i.petAi.doing = null; i.petAi.until = 0; return true; },

    hold(id, tool) { const i = insts.get(id); if (!i) return null; i.holding = tool; const b = i.tools && i.tools[tool]; if (!b) return null; i.group.updateMatrixWorld(true); const box = new T.Box3().setFromObject(b), hand = i.B['hand.R'].getWorldPosition(new T.Vector3()); return { handY: +hand.y.toFixed(2), lowY: +box.min.y.toFixed(2), highY: +box.max.y.toFixed(2), floor: +i.petAi.pos.y.toFixed(2) }; },
    bodyAt(x, y) { const i = bodyAt(x, y); return i ? i.rec.id : null; },
    meal() { const i = insts.get(KID); return { food: { ...food() }, plan: (i.petAi.plan || []).length, doing: i.petAi.doing && i.petAi.doing.pose, onStool: !!i.onStool, carrying: !!i.carrying, hand: !!i.handMesh, plates: O.life && O.life.plates.length, recipe: O.st.recipe || null }; },
    ik(id) { const i = insts.get(id); if (i) i.debugReach = true; return i && { ik: i.ikErr, st: i.st, ankleH: i.ankleH, reach: i.reachErr, w: i.reachW }; },
    dust() { addDust(); return O.life.dust.length; },
    door() { const D = O.home.door; return D && { a: +D.a.toFixed(2), v: +D.v.toFixed(2), visible: D.group.visible }; },
    useAt(id) { const it = insts.get(id); if (!it) return false; sendPlan([{ type: 'use', it, think: '🍳' }]); return true; },
    hide(id, on = true) { const i = insts.get(id); if (i) i.group.visible = !on; return !!i; },
    whyNot(t, x, z, r) { const d = BY[t], rec = { id: 'x', t, x, z, r }; const f = fits(d, rec); const tmp = Object.assign({}, rec, { id: '__w' }), inst = addInst(tmp); const b = inst && solidBox(inst); dropInst('__w'); const hits = items().filter(it => insts.get(it.id) && BY[it.t].kind !== 'wall' && b && solidBox(insts.get(it.id)).expandByScalar(-0.04).intersectsBox(b)).map(it => it.t); return { fits: f, hits, box: b && [b.min.toArray().map(v => +v.toFixed(2)), b.max.toArray().map(v => +v.toFixed(2))], strips: useStrips(d, rec) }; },
    // test hook: every pair of things whose models touch, and anything whose front (where it's used from) is blocked
    layoutCheck() {
      const solid = d => d && d.kind !== 'wall' && d.kind !== 'small' && d.kind !== 'rug' && d.kind !== 'pet', list = items().filter(it => solid(BY[it.t]) && insts.get(it.id));
      const box = it => solidBox(insts.get(it.id)).expandByScalar(-0.04);
      const touch = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if (box(list[i]).intersectsBox(box(list[j]))) touch.push(list[i].t + '/' + list[j].t);
      const o = occ(), blocked = [];
      for (const it of list) { const S = useStrips(BY[it.t], it); if (!S) continue; if (!S.some(s => s.every(([x, z]) => { const c = O.home.cells.get(key(x, z)); return c && !o.floor.has(key(x, z)); }))) blocked.push(it.t); }
      return { n: list.length, touch, blocked, layout: items().map(it => it.t + (it.x != null ? '@' + it.x + ',' + it.z + 'r' + it.r : '@' + it.side)) };
    },
    setting() { return O.home && O.home.setting; },
    plan(id) { const i = insts.get(id); return i && { holding: i.holding || null, plan: (i.petAi.plan || []).map(o => o.end || o.chore || o.type), doing: i.petAi.doing && i.petAi.doing.pose, task: i.petAi.task && (i.petAi.task.end || i.petAi.task.chore || i.petAi.task.type) }; },
    needs(id, v) { const i = insts.get(id); if (i) Object.assign(i.needs, v); return i && i.needs; },
    // test hook: what a character is looking at, and how far off its face points (degrees)
    gaze(id) { const i = insts.get(id); if (!i || !i.B || !i.faceLocal || !i.focus) return i && { focus: null }; const h = i.B.head, q = h.getWorldQuaternion(new T.Quaternion()), p = h.getWorldPosition(new T.Vector3()), f = i.faceLocal.clone().applyQuaternion(q), d = i.focus.clone().sub(p).normalize(); return { focus: i.focus.toArray().map(v => +v.toFixed(2)), off: +(Math.acos(Math.max(-1, Math.min(1, f.dot(d)))) * 180 / Math.PI).toFixed(1) }; },
    // test hook: how deep any part of a character (not the tail, not the soles on the floor) is in something
    clip(id) { const i = insts.get(id); if (!i || !i.cols || !IH.phys) return null; let worst = 0, part = ''; for (const k of IH.rig3d.capsules(i, i.cols)) { if (/^tail/.test(k.bone)) continue; for (const u of [0, 0.5, 1]) { const x = k.a.x + (k.b.x - k.a.x) * u, y = k.a.y + (k.b.y - k.a.y) * u, z = k.a.z + (k.b.z - k.a.z) * u, d = IH.phys.pen(x, y, z, k.r * 0.85, true); if (d > worst) { worst = d; part = k.bone; } } } return { pen: +worst.toFixed(3), part, st: i.petAi.st, use: i.petAi.use && i.petAi.use.pose, doing: i.petAi.doing && i.petAi.doing.pose, pos: i.petAi.pos.toArray().map(v => +v.toFixed(2)) }; },
    fit(id) { const i = insts.get(id); return i && { mode: i.fitMode, z: i.fit && +i.fit.z.toFixed(3), y: i.fit && +i.fit.y.toFixed(3), recline: i.fit && +(i.fit.recline || 0).toFixed(2), legs: i.fit && i.fit.legs }; },
    // test hook: a sleeping pet's head: how far the nose tips from level (degrees), how upright the head is (1 up, 0 on its side), and its height off the floor
    headRest(id) { const i = insts.get(id); if (!i || !i.B || !i.B.head || !i.faceLocal) return null; const q = i.B.head.getWorldQuaternion(new T.Quaternion()), f = i.faceLocal.clone().applyQuaternion(q), u = i.upLocal.clone().applyQuaternion(q); return { st: i.st, nose: +(Math.asin(f.y) * 180 / Math.PI).toFixed(1), upright: +u.y.toFixed(2), y: +(i.B.head.getWorldPosition(new T.Vector3()).y - i.group.position.y).toFixed(3), chin: i.cols ? +(Math.min(...IH.rig3d.capsules(i, i.cols).filter(k => k.bone === 'head').map(k => Math.min(k.a.y, k.b.y) - k.r)) - i.group.position.y).toFixed(3) : null }; },
    // test hooks: the lawn (growth 0 to 1.5; set how many days since it was mowed), and the jobs list
    lawn(days) { if (days != null) { lawnRec().mowAt = Date.now() - days * 864e5; O.lawnT = 0; O.toldLawn = false; lawnHide(); } const L = O.lawn; return { growth: +lawnGrowth().toFixed(2), tufts: L ? L.count : 0, cut: L ? L.userData.cut.reduce((a, b) => a + b, 0) : 0, mowing: !!O.mowing, visitor: insts.has('__visit'), u: L && { grow: +L.userData.U.uGrow.value.toFixed(3), cut: L.userData.U.uCut.value, long: L.userData.U.uLong.value } }; },
    jobs: () => JOBS.all(),
    heldItem() { const k = insts.get(KID), S = k && k.holdIt; if (!S) return { k: k && k.holdK, use: k && k.petAi.use && k.petAi.use.id }; const part = S.subs[S.def.use.hold.sub], w = v => v.toArray().map(x => +x.toFixed(2)), bb = new T.Box3().setFromObject(part); return { music: GTR.on, ac: AC && AC.state, strums: GTR.n, k: +k.holdK.toFixed(2), pose: k.petAi.use && k.petAi.use.pose, box: [w(bb.min), w(bb.max)], hR: w(k.B['hand.R'].getWorldPosition(new T.Vector3())), hL: w(k.B['hand.L'].getWorldPosition(new T.Vector3())), gR: k.reach.R && w(k.reach.R), gL: k.reach.L && w(k.reach.L), kid: w(k.petAi.pos), yaw: +k.petAi.yaw.toFixed(2) }; },
    tail(on) { const k = insts.get(KID); if (!k) return null; k.debugTail = true; return { gap: k.tailGap, off: k.tailOff, st: k.st, use: k.petAi.use && k.petAi.use.pose }; },
    prof() { return O.prof && { parts: Object.fromEntries(Object.entries({ ...(O.prof2 || {}), ...(O.prof3 || {}) }).map(([k, v]) => [k, +v.toFixed(1)])), step: +O.prof.step.toFixed(1), render: +O.prof.render.toFixed(1) }; },
    menu(id) { const i = insts.get(id); return i ? actsFor(i).map(a => a.label) : null; },
    choose(id, label) { const i = insts.get(id), a = i && actsFor(i).find(x => x.label === label); if (!a) return false; a.run(); return true; },
    nav(id) { const i = insts.get(id), A = i && i.petAi; return A && { st: A.st, yaw: +A.yaw.toFixed(2), pos: A.pos.toArray().map(v => +v.toFixed(2)), path: (A.path || []).map(q => [+q.x.toFixed(2), +q.z.toFixed(2)]), stuck: A.stuck, free: A.free, room: IH.phys && +IH.phys.clearance(A.pos.x, A.pos.z, clsOf(i)).toFixed(2) }; },
    bones(id) { const i = insts.get(id); return i && i.B && Object.fromEntries(Object.entries(i.B).filter(([n]) => /^(spine|chest|neck|head|hips|tail1|tail4)$/.test(n)).map(([n, b]) => [n, b.getWorldPosition(new T.Vector3()).toArray().map(v => +v.toFixed(3))])); },
    look(id) { const i = insts.get(id); if (!i) return false; const p = i.petAi ? i.petAi.pos : i.group.position; CAM.target.set(p.x, p.y + 0.6, p.z); force = true; return true; },
    garden() { const B = O.home.bounds, rows = []; for (let z = Math.floor(B.z0); z < Math.ceil(B.z1); z++) { let r = ''; for (let x = Math.floor(B.x0); x < Math.ceil(B.x1); x++) { const c = O.home.cells.get(key(x, z)); r += !c ? ' ' : c.zone !== 'out' ? 'H' : c.deck ? 'd' : '.'; } rows.push(z + ':' + r); } return { B, w: O.home.def.w, d: O.home.def.d, rows }; },
    rows() { return lawnSides().map(sd => { const L = sideRows(sd); return { sd, L: L.map(c => +c.toFixed(2)), runs: L.map(c => rowRunsOf(sd[0], c, sd[3], sd[4], 1)) }; }); },
    perchTops() { const P = IH.phys, out = {}; for (const it of insts.values()) if (it.def.surf && it.def.kind === 'floor' && it.def.surf < 2) { const c = it.group.position, [w, d] = fp(it.def, it.rec.r || 0), f = flatTop(P, c, w, d, P.floorAt(c.x, c.z), 0.27); out[it.def.t + ':' + it.rec.id] = f && [+f.x.toFixed(2), +f.top.toFixed(2), +f.z.toFixed(2)]; } return out; },
    mowSpot() { const m = [...insts.values()].find(i => i.rec && i.rec.t === 'mower'); if (!m) return null; const g = m.group.position; return { x: +g.x.toFixed(2), z: +g.z.toFixed(2), yaw: +m.group.rotation.y.toFixed(2), fits: (c => Math.abs(c[0] - g.x) + Math.abs(c[1] - g.z) < 0.01)(clampMower(g.x, g.z, m.group.rotation.y)), held: !!O.mowing, kid: insts.get(KID).petAi.pos.toArray().map(v => +v.toFixed(2)), task: (insts.get(KID).petAi.task || {}).type, tgt: (o => o && o.spot && [+o.spot.x.toFixed(2), +o.spot.z.toFixed(2)])(insts.get(KID).petAi.task), path: (insts.get(KID).petAi.path || []).length, plan: (insts.get(KID).petAi.plan || []).length, kyaw: +insts.get(KID).petAi.yaw.toFixed(2), st: insts.get(KID).petAi.st, push: insts.get(KID).pushN || 0, toyJob: !!insts.get(KID).toyJob, carryingToy: !!insts.get(KID).toyCarry }; },
    mow() { const k = insts.get(KID), MW = mowerOut(); if (!k || !MW) return false; up_(k); const mp = mowPlan(k, MW); k.petAi.plan = mp.slice(1); return go(k, mp[0], lastT || 0); },
    // test hooks: start a pet playing with a soft toy now, and where the toy's parts are
    play(petId, toyId) { const p = insts.get(petId), toy = insts.get(toyId || [...insts.values()].find(o => o.doll)?.rec.id); if (!p || !toy || !toy.doll) return false; const A = p.petAi; A.task = null; A.plan = []; A.path = []; if (A.use) leaveUse(p); const c = toy.doll.centre(); return arrive(p, { type: 'do', pose: 'play.nudge', at: c, face: c, gives: { fun: 1 }, dur: 60, tag: 'toy', play: toy, here: true }, lastT || 0); },
    toyTo(x, z) { const toy = [...insts.values()].find(o => o.doll); if (!toy) return null; const D = toy.doll, c = D.centre(); for (const n of Object.keys(D.p)) { D.p[n].x += x - c.x; D.p[n].z += z - c.z; D.p[n].y += 0.3; D.o[n].copy(D.p[n]); } D.asleep = false; return toy.rec.id; },
    toy(id) { const toy = id ? insts.get(id) : [...insts.values()].find(o => o.doll); const D = toy && toy.doll; return D && { at: D.centre().toArray().map(v => +v.toFixed(2)), asleep: D.asleep, held: D.heldBy().map(w => w.rec.id), pins: Object.keys(D.pins), moves: [...insts.values()].filter(o => o.playing).map(o => [o.rec.id, o.playMove]) }; },
    // test hooks: the wall faces (key, turned away, length, outside wall), and hanging a thing on one
    walls() { return Object.entries(O.home.sides).map(([k, S]) => [k, S.front, S.len, !!S.outer]); },
    hang(id, side, u) { const rec = items().find(it => it.id === id), d = rec && BY[rec.t]; if (!d) return null; const old = { side: rec.side, u: rec.u }; rec.side = side; rec.u = u; const f = fits(d, rec, rec.id); if (!f.ok) { Object.assign(rec, old); return f; } posInst(insts.get(id)); save(); if (d.opening) rebuildHouse(); return f; },
    freeze(st, yaw = 0, who) { O.freeze = st ? { st, yaw, who } : null; },
    // test hook: stand an extra character at a spot, facing the camera
    spawn(avatar, x, z, st = 'stand') { const c = IH.chars.make(avatar, '#ff8fae'); IH.chars.pose(c, st, 0.2, 0); c.group.position.set(x + 0.5, (O.home.cells.get(key(x, z)) || { y: 0 }).y, z + 0.5); c.group.rotation.y = Math.PI / 4; O.S.itemsG.add(c.group); force = true; }
  };
  // A picture of a kid's home with their things in it (for the Today card), drawn while no home is open.
  IH.shot = (kidId, w = 720, h = 460, kid = {}) => {
    if (O) return '';
    try { renderer(); } catch (e) { return ''; }
    const st = store.load(kidId); if (!HB[st.cur]) st.cur = 'studio';
    const home = buildHome(homeCfg(st)), g = new T.Group(); home.setYaw(Math.PI / 4); g.add(home.root);
    O = { st, home, opts: {}, kid: { id: kidId, ...kid } };
    const made = [];
    try {
      for (const rec of items()) { const def = BY[rec.t]; if (!def || (def.kind === 'wall' && (!home.sides[sideOf(rec)] || home.sides[sideOf(rec)].front))) continue; if (def.cover) fitCover(rec); const inst = make(def, rec); if (inst.pet) poseOf(inst, 'sit', 0, 0); const p = placeOf(def, rec); inst.group.position.set(p.x, p.y, p.z); inst.group.rotation.y = p.ry; g.add(inst.group); made.push(inst); }
      if (IH.chars && O.kid.avatar) { const c = IH.chars.make(O.kid.avatar, O.kid.hue), def = { kind: 'pet', fp: [1, 1], where: 'any' }, sp = freeSpot(def); if (sp) { IH.chars.pose(c, 'happy', 0.1, 0); const p = placeOf(def, sp); c.group.position.set(p.x, p.y, p.z); c.group.rotation.y = 0.5; g.add(c.group); } }
      return snap(g, w, h, 0.56, 0.98);
    } catch (e) { console.error(e); return ''; }
    finally {
      O = null;
      g.traverse(m => { if (m.isMesh) { m.geometry.dispose(); if (m.material !== LK.BASE && m.material !== LK.BASE2) m.material.dispose(); } });
    }
  };
  IH.thumb = t => { if (!O || !BY[t]) return ''; O.thumbQ = [t]; thumbsSome(); return THUMBS[t] || ''; };
})();
