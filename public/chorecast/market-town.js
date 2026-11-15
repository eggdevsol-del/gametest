/* Market town (2026-11-15): the biggest island, a market square the kid walks with a joystick (and a run button),
   with townsfolk going about their shopping, keepers at the stalls and shops, jobs at the counters, little requests,
   the kid's own stall, and brothers and sisters there live on their own devices (the family's village channel:
   server/village.js, home/village-net.js).
   island.js draws the square (marketLand: stalls, shops, fountain…); this file brings it to life inside the island
   studio, through hooks the studio passes in (C). Everything it shows in the bottom panel is the panel's own markup:
   the activity bar, the round tabs and the cards with stacked buttons.
   What it keeps is the kid's kid.island.market: { bag: { ware: n }, friends: { townsperson: hearts }, quest, stall: [
   produce kinds on offer] }. XP comes only through the island's daily limits: jobs and requests through the
   activity limit (Play), stall sales through the farm's (Farm), the server checking both. */
window.MarketTown = function (C) {
  'use strict';
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  const esc = C.esc;
  // ---- what's for sale, and who's about
  const WARES = {
    fruit: [['apple', 'Crisp apple', '🍎', 5], ['oranges', 'Bag of oranges', '🍊', 8], ['carrots', 'Bunch of carrots', '🥕', 6], ['berries', 'Punnet of berries', '🍓', 10]],
    flowers: [['posy', 'Daisy posy', '🌼', 8], ['sunflower', 'Sunflower', '🌻', 10], ['tulips', 'Tulips', '🌷', 12], ['bouquet', 'Big bouquet', '💐', 20]],
    bakery: [['bread', 'Fresh loaf', '🍞', 6], ['croissant', 'Croissant', '🥐', 8], ['cupcake', 'Cupcake', '🧁', 10], ['pie', 'Apple pie', '🥧', 14]],
    crafts: [['yoyo', 'Yo-yo', '🪀', 15], ['paints', 'Paint set', '🎨', 20], ['kite', 'Kite', '🪁', 25], ['teddy', 'Teddy bear', '🧸', 30]],
    cafe: [['cookie', 'Cookie', '🍪', 5], ['juice', 'Orange juice', '🧃', 6], ['cocoa', 'Hot chocolate', '☕', 8], ['sundae', 'Ice-cream sundae', '🍨', 12]]
  };
  const WARE = {}; for (const [at, L] of Object.entries(WARES)) for (const [id, name, icon, xp] of L) WARE[id] = { id, name, icon, xp, at };
  const FOLK = [['Mia', '🐰', '#ff8fb1'], ['Leo', '🦁', '#ffa94d'], ['Ana', '🐨', '#74c0fc'], ['Sam', '🐶', '#8ce99a'], ['Ivy', '🐱', '#e599f7'], ['Tom', '🐼', '#ffd43b'], ['Zoe', '🦉', '#63e6be'], ['Max', '🐵', '#ff8787']];
  const HELLO = ['Lovely day for the market!', 'Have you tried the croissants? So good.', 'I’m after something for my garden.', 'The fountain’s my favourite spot.', 'Busy today, isn’t it?', 'I always save up before market day.', 'Those flowers smell amazing.', 'I’m just looking today.'];
  const JOBS = [{ id: 'cafe', name: 'Serve drinks', icon: '☕', at: 'cafe' }, { id: 'bakery', name: 'Sell bread', icon: '🥐', at: 'bakery' }, { id: 'fruit', name: 'Weigh fruit', icon: '🍎', at: 'fruit' }];
  const SHIFT = 6, PER = 2, TEAM = 1.25, NEAR = 2.8; // customers a shift, XP each, the team bonus, how close is "at" a place (world units)
  const M = { on: false, W: null, isl: null, mk: null, kidB: null, joy: { x: 0, y: 0 }, run: false, folk: [], keepers: {}, sibs: new Map(), place: null, shift: null, says: [], auto: false, nextShop: 0, lastPose: 0, ui: null, net: null };

  // ---- the kid's market things
  const mk = () => ({ bag: {}, friends: {}, quest: null, stall: [], ...(((C.kid() || {}).island || {}).market || {}) });
  function saveMk(m, extra = {}) { const k = C.kid(); C.updDoc('kids', k.id, { island: { ...(k.island || {}), ...extra.island, market: m }, ...(extra.ledger ? { ledger: extra.ledger } : {}) }); }
  const bagN = () => Object.values(mk().bag).reduce((a, b) => a + b, 0);

  // ---- where everything is: the island's stalls and shops, in world units (the studio draws the island K times big)
  const W2 = p => ({ x: p[0] * C.K, z: p[1] * C.K });
  // this kid's own pitch (brothers and sisters each have their own, in family order); the other pitches are theirs
  const pitchNo = () => (Math.max(0, (C.kid() || {}).order || 0)) % 3;
  const places = () => (M.mk ? [...M.mk.stalls.filter(s => !s.mine || s.pitch === pitchNo()), ...M.mk.shops] : []);
  const placeOf = id => places().find(p => p.id === id);
  const kidPos = () => (M.kidB ? M.kidB.A.pos : null);
  const near = (p, d = NEAR) => { const k = kidPos(); if (!k || !p) return false; const c = W2(p.counter); return Math.hypot(k.x - c.x, k.z - c.z) < d; };

  // ---- starting and stopping (the studio's walk world is ready on the market island)
  function start(W, island, kidPk) {
    stop(); const u = island.userData; if (!u.play || !u.play.market) return;
    M.on = true; M.W = W; M.isl = island; M.mk = u.play.market; M.kidB = W.bodies.find(b => b.isKid); M.kidPk = kidPk;
    if (M.kidB) M.kidB.pk = Object.assign({}, kidPk, { speed: 2.2 }); // (sent somewhere, the kid goes at a brisk pace: it's a big square)
    const folkPk = Object.assign({}, kidPk, { kid: false, follows: null, idle: ['stand', 'look', 'look'], speed: 1.15 });
    // keepers: one at each stall but the kid's, and at each shop's counter; they stand facing their customers
    // (keepers at the stalls and shops; the pitches are the kids')
    for (const p of places()) { if (p.mine) continue; const q = W2(p.keeper), f = FOLK[(p.id.length * 3) % FOLK.length], b = W.add(folkPk, q.x, q.z, { avatar: f[1], hue: f[2], yaw: p.yaw }); b.keeper = p.id; b.A.yaw = p.yaw; b.A.placed = true; M.keepers[p.id] = b; }
    // townsfolk: about the square, going from stall to stall
    FOLK.forEach(([name, avatar, hue], i) => { const s = W.spot(0.6) || { x: 0, z: 0 }, b = W.add(folkPk, s.x, s.z, { avatar, hue, yaw: Math.random() * 6 }); b.folk = { id: name.toLowerCase(), name, avatar, next: 2 + Math.random() * 8 }; M.folk.push(b); });
    buildUI(); net(true); C.view({ rad: 1.75, phi: 0.92 });
    C.say(`Welcome to Market town! ${matchMedia('(pointer: coarse)').matches ? 'Use the stick to walk, hold 🏃 to run.' : 'Use the stick (or the arrow keys) to walk, hold 🏃 or Shift to run.'}`);
  }
  function stop() {
    if (!M.on) return; net(false); endShift(true);
    if (M.ui) { M.ui.root.remove(); M.ui = null; } removeEventListener('keydown', key, true); removeEventListener('keyup', key, true);
    Object.assign(M, { on: false, W: null, isl: null, mk: null, kidB: null, folk: [], keepers: {}, place: null, says: [], auto: false }); M.sibs.clear();
  }

  // ---- the stick and the run button (only here): small and see-through, above the bottom panel
  const KEYS = {};
  function key(e) { if (!M.on || /input|textarea/i.test((e.target || {}).tagName || '')) return; const k = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r', Shift: 'run' }[e.key]; if (!k) return; KEYS[k] = e.type === 'keydown'; e.preventDefault(); e.stopImmediatePropagation(); } // (the arrow keys walk here, rather than travelling)
  function buildUI() {
    const root = document.createElement('div'); root.className = 'mt-ui';
    root.innerHTML = '<div class="mt-joy" aria-label="Walk"><i></i></div><button class="mt-run" aria-label="Run (hold)">🏃</button><div class="mt-says"></div>';
    document.getElementById('studio').appendChild(root);
    const joy = root.querySelector('.mt-joy'), knob = joy.querySelector('i'), run = root.querySelector('.mt-run');
    const move = e => { const r = joy.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R), L = Math.hypot(dx, dy) || 1, k = L > R * 0.8 ? R * 0.8 / L : 1; M.joy.x = dx * k / (R * 0.8); M.joy.y = -dy * k / (R * 0.8); knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; };
    const done = () => { M.joy.x = M.joy.y = 0; knob.style.transform = ''; joy.classList.remove('on'); };
    joy.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); joy.setPointerCapture(e.pointerId); joy.classList.add('on'); M.auto = false; move(e); });
    joy.addEventListener('pointermove', e => { if (joy.classList.contains('on')) { e.stopPropagation(); move(e); } });
    joy.addEventListener('pointerup', done); joy.addEventListener('pointercancel', done);
    const runOn = v => e => { e.stopPropagation(); e.preventDefault(); M.run = v; run.classList.toggle('on', v); if (v) try { run.setPointerCapture(e.pointerId); } catch (er) { /* */ } };
    run.addEventListener('pointerdown', runOn(true)); run.addEventListener('pointerup', runOn(false)); run.addEventListener('pointercancel', runOn(false));
    addEventListener('keydown', key, true); addEventListener('keyup', key, true);
    M.ui = { root, says: root.querySelector('.mt-says') }; place();
  }
  // the stick and the button sit just above the bottom panel, whatever its height
  function place() { if (!M.ui) return; const sh = document.querySelector('#studio .shop'), top = sh ? sh.getBoundingClientRect().top : innerHeight * 0.67; M.ui.root.style.setProperty('--mt-b', `${Math.max(16, innerHeight - top + 12)}px`); }

  // ---- each frame: the kid (stick, run, or walking somewhere it was sent), keepers, townsfolk, siblings, bubbles
  const V = T ? new T.Vector3() : null;
  function tick(t, dt) {
    if (!M.on || !M.W || !M.kidB) return;
    const P = IH.phys, b = M.kidB, A = b.A, g = b.inst.group, kx = (KEYS.r ? 1 : 0) - (KEYS.l ? 1 : 0), ky = (KEYS.u ? 1 : 0) - (KEYS.d ? 1 : 0);
    let jx = M.joy.x || kx, jy = M.joy.y || ky; const mag = Math.min(1, Math.hypot(jx, jy)), running = M.run || KEYS.run;
    if (mag > 0.12 && !M.shift) {
      M.auto = false; A.path = [];
      const th = C.theta(), fx = -Math.cos(th), fz = -Math.sin(th), rx = Math.sin(th), rz = -Math.cos(th);
      let dx = fx * jy + rx * jx, dz = fz * jy + rz * jx; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const sp = (running ? 3.6 : 1.8) * mag * dt, ok = (x, z) => C.floorAt(x, z) > -4 && P.clearance(x, z, 'kid') >= b.R * 0.9;
      const from = A.pos.clone(); let nx = A.pos.x + dx * sp, nz = A.pos.z + dz * sp;
      if (!ok(nx, nz)) { if (ok(nx, A.pos.z)) nz = A.pos.z; else if (ok(A.pos.x, nz)) nx = A.pos.x; else { nx = A.pos.x; nz = A.pos.z; } }
      A.pos.set(nx, Math.max(0, C.floorAt(nx, nz)), nz);
      const want = Math.atan2(dx, dz), d = Math.atan2(Math.sin(want - A.yaw), Math.cos(want - A.yaw)); A.yaw += d * Math.min(1, dt * 12);
      b.inst.walkD = (b.inst.walkD || 0) + from.distanceTo(A.pos) * (running ? 0.85 : 1); b.inst.room = P.clearance(A.pos.x, A.pos.z, 'kid');
      g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); pose(b, 'walk', t);
    } else if (!M.auto && !M.shift) { g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); pose(b, A.happy > t ? 'happy' : 'stand', t); }
    if (M.auto && !A.path.length) { M.auto = false; const p = M.autoTo; M.autoTo = null; if (p && p.then) p.then(); }
    for (const k of Object.values(M.keepers)) { k.inst.group.position.copy(k.A.pos); k.inst.group.rotation.set(0, k.A.yaw, 0); pose(k, k.A.happy > t ? 'happy' : 'stand', t); }
    folkTick(t); sibTick(t, dt); shiftTick(t); stallTick(t);
    const here = places().find(p => near(p)) || null; if ((here && here.id) !== (M.place && M.place.id)) { M.place = here; if (!M.shift) { if (here) C.S0.cat = here.mine ? 'mmine' : 'mplace'; else if (C.S0.cat === 'mplace') C.S0.cat = 'mmap'; C.ui(); } }
    netPose(t); bubbles();
  }
  // the bodies the walk engine leaves alone (the studio passes this to it): the kid, unless sent somewhere; keepers; siblings
  const skip = b => (b.isKid && !M.auto) || !!b.keeper || !!b.sib;
  const pose = (b, st, t) => { try { b.pk.pose(b.inst, st, t, b.A.ph); } catch (e) { /* (a model still loading) */ } };
  // the camera keeps the kid in view: the studio turns this into where it looks
  function follow() { const p = kidPos(); return p ? { x: p.x / C.K, y: p.y / C.K + 0.12, z: p.z / C.K } : null; }
  // sends the kid walking to a place's counter (then: what to do there)
  function walkTo(p, then, spot) {
    if (!M.kidB) return; const c = W2(spot || p.counter);
    if (near(p, 1.0) && !spot) { if (then) then(); return; }
    if (M.W.go(M.kidB, c)) { M.auto = true; M.autoTo = { then }; } else if (then) then();
  }

  // ---- townsfolk: off to a stall, the fountain or a bench every so often; tap one to say hi
  function folkTick(t) {
    for (const b of M.folk) {
      const f = b.folk; if (f.busy || b.A.path.length || t < f.next) continue;
      const r = Math.random(), opts = [...places().filter(p => !p.mine), ...(M.mk.benches || []).map(x => ({ counter: x }))], p = opts[Math.floor(r * opts.length)];
      if (p) { const c = W2(p.counter), a = Math.random() * 6.28; M.W.go(b, { x: c.x + Math.cos(a) * 0.8, z: c.z + Math.sin(a) * 0.8 }); }
      f.next = t + 6 + Math.random() * 10; b.A.until = f.next;
    }
  }
  function talk(b) {
    const f = b.folk, m = mk(), hearts = m.friends[f.id] || 0, q = m.quest;
    b.A.happy = C.now() + 1.6; faceTo(b, kidPos());
    let line = hearts >= 3 ? `${C.kid().name}! Always lovely to see you ❤️` : HELLO[(f.id.length + Math.floor(C.now() / 7)) % HELLO.length]; // (good friends are pleased to see them)
    if (!q && Math.random() < 0.55) { const keys = Object.keys(WARE).filter(w => WARE[w].at !== 'cafe'), want = keys[Math.floor(Math.random() * keys.length)]; m.quest = { who: f.id, name: f.name, want, at: Date.now() }; saveMk(m); line = `Could you bring me ${aWare(want)}? I’ll make it worth your while!`; }
    else if (q && q.who === f.id) line = m.bag[q.want] ? `Is that ${aWare(q.want)} for me? Yes please!` : `Still hoping for ${aWare(q.want)}…`;
    say(b, line); C.S0.cat = 'mpeople'; M.focus = f.id; C.say(`${f.avatar} ${f.name}: “${line}”`);
  }
  const aWare = id => { const w = WARE[id]; return w ? `${/^[aeiou]/i.test(w.name) ? 'an' : 'a'} ${w.name.toLowerCase()} ${w.icon}` : 'something'; };
  function faceTo(b, p) { if (!p) return; b.A.wantYaw = Math.atan2(p.x - b.A.pos.x, p.z - b.A.pos.z); b.A.yaw = b.A.wantYaw; }

  // ---- talk bubbles over heads (and floating XP)
  function say(b, text, secs = 3) { M.says = M.says.filter(s => s.b !== b); M.says.push({ b, text, until: C.now() + secs }); }
  function bubbles() {
    if (!M.ui) return; const now = C.now(); M.says = M.says.filter(s => s.until > now);
    const cam = C.cam(), html = [];
    for (const s of M.says) { const p = s.b.A.pos; V.set(p.x, p.y + 2.7, p.z).project(cam); if (V.z > 1) continue; html.push(`<div class="mt-say" style="left:${((V.x + 1) / 2 * innerWidth).toFixed(0)}px;top:${((1 - V.y) / 2 * innerHeight).toFixed(0)}px">${esc(s.text)}</div>`); }
    const h = html.join(''); if (h !== M.ui.lastSay) { M.ui.says.innerHTML = h; M.ui.lastSay = h; }
  }
  function float(b, text) { const cam = C.cam(), p = b.A.pos; V.set(p.x, p.y + 2.2, p.z).project(cam); C.float(text, (V.x + 1) / 2 * innerWidth, (1 - V.y) / 2 * innerHeight); }

  // ---- jobs: serving at a counter. Customers come up one at a time and ask for something; pick the right thing.
  function startShift(job) {
    const p = placeOf(job.at); if (!p || M.shift) return;
    if (!C.Play.on()) return C.say('A grown-up has switched island activities off.');
    walkTo(p, () => {
      const k = W2(p.keeper), fw = [Math.sin(p.yaw), Math.cos(p.yaw)], side = [Math.cos(p.yaw), -Math.sin(p.yaw)];
      M.kidB.A.pos.set(k.x + side[0] * 1.0 + fw[0] * 0.2, M.kidB.A.pos.y, k.z + side[1] * 1.0 + fw[1] * 0.2); M.kidB.A.yaw = p.yaw; M.kidB.A.path = [];
      M.shift = { job, p, n: 0, xp: 0, cust: null, ask: null, wait: C.now() + 1 }; C.S0.cat = 'mjobs'; C.Sound.whoosh(); C.ui();
    }, null);
  }
  function shiftTick(t) {
    const s = M.shift; if (!s) return; const kb = M.kidB; kb.inst.group.position.copy(kb.A.pos); kb.inst.group.rotation.set(0, kb.A.yaw, 0);
    pose(kb, s.busy > C.now() ? 'place' : kb.A.happy > t ? 'happy' : 'stand', t);
    if (s.cust && lost(s.cust)) { free(s.cust); s.cust = null; s.ask = null; }
    if (s.cust || C.now() < s.wait) { if (s.cust && s.cust.folk.arrived == null && there(s.cust, s.p.counter)) { s.cust.folk.arrived = C.now(); faceTo(s.cust, kb.A.pos); s.ask = pickAsk(s.job.at); say(s.cust, `${WARE[s.ask].icon} please!`, 30); C.ui(); } return; }
    if (s.n >= SHIFT) return endShift();
    const c = nearest(s.p.counter); if (!c) return;
    hold(c); s.cust = c; const q = W2(s.p.counter); M.W.go(c, { x: q.x, z: q.z });
  }
  // a townsperson sent to a counter is there once they've got within a step of it (the last bit can be too close to
  // the stall to walk), and stops
  function there(b, at) { const q = W2(at), d = Math.hypot(b.A.pos.x - q.x, b.A.pos.z - q.z); if (b.A.path.length && d > 0.9) return false; b.A.path = []; b.A.st = 'stand'; return true; }
  // the free townsperson nearest a spot (a counter), so a customer isn't long coming
  function nearest(at) { const q = W2(at); let best = null, bd = 1e9; for (const b of M.folk) { if (b.folk.busy) continue; const d = Math.hypot(b.A.pos.x - q.x, b.A.pos.z - q.z); if (d < bd) { bd = d; best = b; } } return best; }
  // a townsperson on an errand for the kid (a customer): the walk engine still walks them, but they don't wander off
  function hold(c) { c.folk.busy = true; c.folk.arrived = null; c.folk.since = C.now(); c.A.until = 1e12; }
  const lost = c => c.folk.arrived == null && C.now() - c.folk.since > 20; // (can't get through: someone else comes instead)
  function free(c) { if (!c.folk) return; c.folk.busy = false; c.folk.arrived = null; c.folk.next = 0; c.A.until = 0; }
  const pickAsk = at => { const L = WARES[at]; return L[Math.floor(Math.random() * L.length)][0]; };
  function serve(id) {
    const s = M.shift; if (!s || !s.cust || !s.ask || s.busy > C.now()) return; const kb = M.kidB, k = C.kid();
    if (id === s.ask) {
      s.busy = C.now() + 0.8; setTimeout(() => { if (M.shift === s) C.ui(); }, 850); // (the kid hands it over, then the buttons come back)
      const team = [...M.sibs.values()].some(x => x.s && x.s.st === 'job:' + s.job.at), xp = Math.min(Math.round(PER * (team ? TEAM : 1) + (team ? 0.5 : 0)), C.Play.room(k));
      if (xp > 0) { C.Play.pay(k, xp); s.xp += xp; } s.n++; kb.A.happy = C.now() + 1; s.cust.A.happy = C.now() + 1.2; say(s.cust, 'Thank you! 😊', 2); float(s.cust, xp > 0 ? `+${xp} XP${team ? ' 🤝' : ''}` : '👍'); C.Sound.cash();
      dayLog({ served: 1, xp });
    } else { const c = s.cust, ask = s.ask; say(c, `Hmm, I asked for ${WARE[ask].icon}`, 2); setTimeout(() => { if (M.shift === s && s.cust === c && s.ask === ask) say(c, `${WARE[ask].icon} please!`, 30); }, 2000); C.Sound.error(); return C.ui(); }
    const c = s.cust; s.cust = null; s.ask = null; s.wait = C.now() + 1.2; setTimeout(() => free(c), 600); C.ui();
  }
  function endShift(quiet) {
    const s = M.shift; if (!s) return; M.shift = null; if (s.cust) free(s.cust);
    if (!quiet) { C.say(`Shift done: ${s.n} customer${s.n === 1 ? '' : 's'} served${s.xp ? `, +${s.xp} XP` : ''}.${C.Play.room(C.kid()) ? '' : ' That’s today’s activity XP.'}`); C.Sound.fanfare(); C.track('market.shift', { job: s.job.id, n: s.n, xp: s.xp }); C.ui(); }
  }

  // ---- the kid's own stall: stocked from the farm pantry; open while the kid stands behind it; townsfolk buy
  const mine = () => M.mk && M.mk.stalls.find(s => s.mine && s.pitch === pitchNo());
  const atStall = () => { const p = mine(); if (!p || !M.kidB) return false; const k = W2(p.keeper), q = kidPos(); return Math.hypot(q.x - k.x, q.z - k.z) < 1.3; };
  const offer = () => { const k = C.kid(), have = C.Farm.counts(C.Farm.pantry(k).keep), room = C.Farm.room(k); return mk().stall.filter(x => have[x] > 0 && C.Farm.price(x) <= room); }; // (what's there, and not past the day's farm limit)
  function stallTick(t) {
    if (!atStall() || !offer().length || M.shift) { M.stallNext = null; return; }
    if (!M.stallNext) M.stallNext = t + 3;
    if (M.stallCust && lost(M.stallCust)) { free(M.stallCust); M.stallCust = null; }
    if (t < M.stallNext || M.stallCust) { if (M.stallCust && M.stallCust.folk.arrived == null && there(M.stallCust, mine().counter)) { const c = M.stallCust; c.folk.arrived = C.now(); faceTo(c, kidPos()); setTimeout(() => stallDecide(c), 1200); } return; }
    const c = nearest(mine().counter); if (!c) return;
    hold(c); M.stallCust = c; const q = W2(mine().counter); M.W.go(c, q);
  }
  function stallDecide(c) {
    M.stallCust = null; M.stallNext = C.now() + 5 + Math.random() * 6;
    const k = C.kid(), list = offer(), kind = list[Math.floor(Math.random() * list.length)], pr = C.Farm.price(kind), base = (C.PRODUCE[kind] || {}).price || pr, hearts = (mk().friends || {})[c.folk.id] || 0;
    const room = C.Farm.room(k);
    if (!kind || !wouldBuy(pr, base, hearts, C.Farm.saturday()) || room < pr) { say(c, room < pr ? 'Your stall’s earned its limit for today!' : 'Just looking, thanks!', 2.4); }
    else if (sell(kind, pr)) { say(c, `I’ll take one! ${(C.PRODUCE[kind] || {}).icon || ''}`, 2.4); float(c, `+${pr} XP`); c.A.happy = C.now() + 1.2; dayLog({ sold: 1, xp: pr }); C.ui(); }
    setTimeout(() => free(c), 1500);
  }
  // Will a townsperson buy at today's price? (price: today's stand price; base: the usual price; hearts: how much
  // they like the kid, 0–5; sat: Saturday, market day)
  function wouldBuy(price, base, hearts, sat) {
    const dear = price / Math.max(1, base); // 0.8 (a bargain) to 1.5 (dear)
    const p = 0.55 + (1 - dear) * 0.6 + hearts * 0.06 + (sat ? 0.1 : 0);
    return Math.random() < Math.max(0.15, Math.min(0.92, p));
  }
  // one of the kid's produce sold (to a townsperson, or a sibling): out of the pantry, paid as a farm sale
  function sell(kind, pr) {
    const k = C.kid(), I = { items: [], xpSpent: 0, ...(k.island || {}) }, { keep } = C.Farm.pantry(k); let done = false;
    I.pantry = keep.filter(u => (u.k === kind && !done ? ((done = true), false) : true)); if (!done) return false;
    C.Farm.pay(I, pr); C.Farm.logDay(I, pr, 0, kind, 1); C.updDoc('kids', k.id, { island: I }); C.Sound.cash(); C.track('market.sell', { k: kind, price: pr }); return true;
  }

  // ---- buying at a stall or shop: into the kid's market bag (for themselves, or to give to someone)
  function buyWare(id) {
    const w = WARE[id], k = C.kid(); if (!w) return;
    if (C.xpOf(k).left < w.xp) return C.say('Not enough XP yet. Finish a mission or a lesson to earn more.');
    const m = mk(); if ((m.bag[id] || 0) >= 9) return C.say('Your bag’s got plenty of those!');
    m.bag = { ...m.bag, [id]: (m.bag[id] || 0) + 1 };
    saveMk(m, { island: { xpSpent: ((k.island || {}).xpSpent || 0) + w.xp }, ledger: C.pushLedger(k, { kind: 'xp', amt: 0, xp: -w.xp, memo: `Market town: ${w.name}` }) });
    const kp = M.keepers[w.at]; if (kp) { kp.A.happy = C.now() + 1.2; say(kp, 'Enjoy! 😊', 2); }
    C.Sound.cash(); C.track('market.buy', { ware: id, xp: w.xp }); C.say(`${w.icon} ${w.name}: in your bag!`);
  }
  // giving something from the bag to a townsperson: a heart, and if it's what they asked for, a reward
  function give(fid, id) {
    const m = mk(), w = WARE[id], b = M.folk.find(x => x.folk.id === fid); if (!w || !(m.bag[id] > 0) || !b) return;
    m.bag = { ...m.bag, [id]: m.bag[id] - 1 }; // (left at 0, not deleted: saves merge into what's kept, so a deleted key would stay)
    m.friends = { ...m.friends, [fid]: Math.min(5, (m.friends[fid] || 0) + 1) };
    let xp = 0; if (m.quest && m.quest.who === fid && m.quest.want === id) { xp = Math.min(w.xp + 6, C.Play.room(C.kid())); m.quest = null; }
    saveMk(m); if (xp) { C.Play.pay(C.kid(), xp); dayLog({ quests: 1, xp }); } C.say(`${b.folk.avatar} ${b.folk.name}: “${xp ? 'Just what I wanted! Thank you!' : 'For me? That’s so kind!'}” ❤️${xp ? ` +${xp} XP` : ''}`);
    b.A.happy = C.now() + 1.6; faceTo(b, kidPos()); say(b, xp ? `Just what I wanted! Thank you! ${w.icon}` : `For me? That’s so kind! ${w.icon}`, 2.6); float(b, xp ? `+${xp} XP ❤️` : '❤️'); C.Sound.cash(); C.track('market.give', { to: fid, ware: id, xp });
    C.ui();
  }

  // ---- brothers and sisters, live (the family's village channel; on the market island only)
  function net(on) {
    const N = IH.villageNet; if (!N) { if (on) C.load('home/village-net.js').then(() => { if (M.on) net(true); }); return; }
    if (!on) { if (M.net) { M.net.forEach(off => off()); M.net = null; } N.pose({ pl: 'away' }); N.stop(); for (const s of M.sibs.values()) if (M.W) M.W.remove(s.b); M.sibs.clear(); return; }
    const k = C.kid(); N.start({ name: k.name, avatar: k.avatar || '🦊', hue: k.hue || '#7cc8e8' }, 'market');
    M.net = [N.on('peers', syncSibs), N.on('pose', syncSibs), N.on('emote', ({ p, k: kk, i }) => { const s = M.sibs.get(p.id); if (!s) return; const txt = kk === 'emo' ? N.EMOJI[i] : kk === 'say' ? N.PHRASES[i] : (N.ACTIONS[i] || [])[0]; say(s.b, txt, 2.6); s.b.A.happy = C.now() + 1.2; }),
      N.on('buy', onBuy), N.on('sold', onSold), N.on('state', () => C.ui())];
  }
  function syncSibs() {
    const N = IH.villageNet; if (!M.on || !M.W || !N) return;
    const here = N.peers.filter(p => p.s && p.s.pl === 'market');
    for (const [id, s] of M.sibs) if (!here.some(p => p.id === id)) { M.W.remove(s.b); M.sibs.delete(id); }
    for (const p of here) {
      let s = M.sibs.get(p.id);
      if (!s) { const b = M.W.add(M.kidPk, p.s.x, p.s.z, { avatar: p.avatar, hue: p.hue, yaw: p.s.yaw }); b.sib = p.id; b.A.placed = true; s = { b, p }; M.sibs.set(p.id, s); say(b, `${p.name} is here! 👋`, 2.5); C.ui(); }
      s.p = p; s.s = p.s; s.to = { x: p.s.x, z: p.s.z, yaw: p.s.yaw };
    }
  }
  function sibTick(t, dt) {
    for (const s of M.sibs.values()) {
      const b = s.b, A = b.A, to = s.to; if (!to) continue;
      const d = Math.hypot(to.x - A.pos.x, to.z - A.pos.z), k = Math.min(1, dt * 8);
      if (d > 6) A.pos.set(to.x, Math.max(0, C.floorAt(to.x, to.z)), to.z); else { A.pos.x += (to.x - A.pos.x) * k; A.pos.z += (to.z - A.pos.z) * k; A.pos.y = Math.max(0, C.floorAt(A.pos.x, A.pos.z)); }
      A.yaw += Math.atan2(Math.sin(to.yaw - A.yaw), Math.cos(to.yaw - A.yaw)) * k; b.inst.walkD = (b.inst.walkD || 0) + d * k;
      b.inst.group.position.copy(A.pos); b.inst.group.rotation.set(0, A.yaw, 0); pose(b, A.happy > t ? 'happy' : d * k > 0.004 ? 'walk' : (s.s && s.s.pose) || 'stand', t);
    }
  }
  // where this kid is, what they're doing and what's on their stall, for the others (at most six times a second)
  function netPose(t) {
    const N = IH.villageNet; if (!N || !N.live || !M.kidB) return; const A = M.kidB.A;
    const s = { pl: 'market', x: +A.pos.x.toFixed(2), z: +A.pos.z.toFixed(2), y: +A.pos.y.toFixed(2), yaw: +A.yaw.toFixed(2), st: M.shift ? 'job:' + M.shift.job.at : atStall() ? 'stall' : '', pose: M.shift ? 'place' : null };
    if (atStall() && offer().length) s.stall = { pitch: 0, items: offer().slice(0, 4).map(kind => ({ t: kind, price: C.Farm.price(kind) })) };
    N.pose(s);
  }
  function emote(id, kind, i) { const N = IH.villageNet; if (!N || !N.live) return; N.send({ t: 'e', k: kind, i, to: id }); say(M.kidB, kind === 'emo' ? N.EMOJI[i] : kind === 'say' ? N.PHRASES[i] : N.ACTIONS[i][0], 2.6); M.kidB.A.happy = C.now() + 1.2; }
  // buying from a sibling's stall: ask their device; it sells (pantry, farm pay) and says sold; then this one pays
  function sibBuy(id, i) {
    const N = IH.villageNet, s = M.sibs.get(id), it = s && s.s && s.s.stall && s.s.stall.items[i], k = C.kid(); if (!N || !it) return;
    if (C.xpOf(k).left < it.price) return C.say('Not enough XP for that yet.');
    const { keep } = C.Farm.pantry(k); if (keep.length >= C.Farm.pantryMax(k)) return C.say('Your pantry’s full.');
    M.pending = { rid: Math.random().toString(36).slice(2, 10), id, t: it.t, price: it.price }; N.send({ t: 'buy', to: id, i, it: it.t, rid: M.pending.rid }, true); C.say(`Asking ${s.p.name}…`);
  }
  function onBuy(d) {
    const N = IH.villageNet, k = C.kid(), have = C.Farm.counts(C.Farm.pantry(k).keep), pr = C.Farm.price(d.t);
    if (!atStall() || !mk().stall.includes(d.t) || !have[d.t] || C.Farm.room(k) < pr || !sell(d.t, pr)) return N.send({ t: 'sold', to: d.from, rid: d.rid, rec: null }, true);
    N.send({ t: 'sold', to: d.from, rid: d.rid, rec: { t: d.t, price: pr } }, true); dayLog({ sold: 1, xp: pr });
    const s = M.sibs.get(d.from); if (s) { say(s.b, 'Thanks! 😄', 2); float(M.kidB, `+${pr} XP`); } C.ui();
  }
  function onSold(d) {
    const p = M.pending; if (!p || d.rid !== p.rid) return; M.pending = null;
    if (!d.rec) return C.say('They can’t sell that right now: it’s sold out, or their stall’s done for today.');
    const k = C.kid(), I = { items: [], xpSpent: 0, ...(k.island || {}) }, { keep } = C.Farm.pantry(k);
    I.xpSpent = (I.xpSpent || 0) + d.rec.price; I.pantry = [...keep, { k: d.rec.t, at: Date.now() }];
    C.updDoc('kids', k.id, { island: I, ledger: C.pushLedger(k, { kind: 'xp', amt: 0, xp: -d.rec.price, memo: `Market town: ${(C.PRODUCE[d.rec.t] || {}).name || d.rec.t} from a sibling's stall` }) });
    C.Sound.cash(); C.say(`Bought ${(C.PRODUCE[d.rec.t] || {}).name || d.rec.t} for ${d.rec.price} XP. It’s in your pantry.`); C.track('market.sibbuy', { k: d.rec.t, price: d.rec.price });
  }

  // ---- the day's market line for the grown-ups' statement (migration 024)
  let dayQ = null;
  function dayLog(d) { dayQ = dayQ || { served: 0, sold: 0, quests: 0, xp: 0 }; for (const k in d) dayQ[k] += d[k] || 0; clearTimeout(dayLog.t); dayLog.t = setTimeout(flushDay, 2500); }
  function flushDay() { const q = dayQ; dayQ = null; const k = C.kid(); if (!q || !k) return; fetch('/api/market/day', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kidId: k.id, ...q }) }).catch(() => { /* (offline: it's only the summary) */ }); }

  // ---- the bottom panel: tabs, the activity bar, and cards
  function tabs() {
    const p = M.place && !M.place.mine ? M.place : null; return [...(p ? [['mplace', `${p.icon} ${p.name}`]] : []), ['mmap', 'Places'], ['mjobs', 'Jobs'], ['mpeople', 'People'], ['mbag', `Bag${bagN() ? ` · ${bagN()}` : ''}`], ['mmine', 'My stall']];
  }
  function actBar(k) {
    const s = M.shift, left = C.Play.room(k);
    const info = s ? `${s.ask ? `Wants ${WARE[s.ask].icon} · ` : ''}${s.n} of ${SHIFT} customers · +${s.xp} XP` : !C.Play.on() ? 'Switched off by a grown-up' : `${PER} XP a customer · ${left === Infinity ? 'no daily limit' : left ? `${left} XP left today` : 'no more XP today'}`;
    return `<div class="st-act"><span class="st-act-ic" aria-hidden="true">${s ? s.job.icon : '🧺'}</span><div class="st-act-t"><b>${s ? s.job.name : 'Market jobs'}</b><small>${info}</small></div><button class="st-btn ${s ? '' : 'primary'}" data-act="st" data-n="${s ? 'mtStop' : 'mtJobs'}" ${!s && !C.Play.on() ? 'disabled' : ''}>${s ? 'Stop' : 'Find a job'}</button></div>`;
  }
  const card = (icon, name, sub, btns, extra = '') => `<div class="shop-item mt-card"><span class="mt-ic" aria-hidden="true">${icon}</span><b>${esc(name)}</b>${sub ? `<small>${sub}</small>` : ''}${extra}<div class="shop-buy">${btns}</div></div>`;
  const btn = (label, n, data = {}, off = false, cls = '') => `<button ${cls ? `class="${cls}"` : ''} data-act="st" data-n="${n}" ${Object.entries(data).map(([k, v]) => `data-${k}="${esc(String(v))}"`).join(' ')} ${off ? 'disabled' : ''}>${label}</button>`;
  function row(cat, k) {
    const xp = C.xpOf(k).left, m = mk(), out = [];
    if (M.shift && cat === 'mjobs') {
      const s = M.shift; if (!s.ask) return `<div class="shop-row">${card(s.job.icon, s.cust ? 'A customer’s coming…' : 'Waiting for a customer', 'Watch their bubble: they’ll say what they’d like.', btn('Stop', 'mtStop'))}</div>`;
      return `<div class="shop-row">${WARES[s.job.at].map(([id, name, icon]) => card(icon, name, '', btn(`Give ${icon}`, 'mtServe', { w: id }, s.busy > C.now()))).join('')}</div>`;
    }
    if (cat === 'mmap' || (cat === 'mplace' && !M.place)) return `<div class="shop-row">${places().map(q => card(q.icon, q.name, q.mine ? 'Sell your farm produce' : q.id === 'bank' ? 'Your jars' : q.id === 'store' ? 'Tools and feed' : q.id === 'cafe' ? 'Drinks and treats' : 'Stall', btn(near(q) ? 'You’re here' : 'Walk there', 'mtGo', { p: q.id }, near(q)))).join('')}</div>`;
    if (cat === 'mplace') {
      const p = M.place;
      if (!p) return `<div class="shop-row">${places().map(q => card(q.icon, q.name, q.mine ? 'Sell your farm produce' : q.id === 'bank' ? 'Your jars' : q.id === 'store' ? 'Tools and feed' : 'Stall', btn('Walk there', 'mtGo', { p: q.id }))).join('')}</div>`;
      if (p.mine) return mineRow(k);
      if (p.id === 'bank') { const j = k.jars || {}; return `<div class="shop-row">${[['🛍️', 'Spend', j.spend], ['🔒', 'Vault', j.save], ['📈', 'Invest', j.invest], ['💝', 'Give', j.give]].map(([i, n, v]) => card(i, n, C.fmt(v || 0), btn('See in Money', 'mtMoney'))).join('')}${card('💡', 'Banker’s tip', 'Money left in the Vault earns interest every week. The longer it stays, the more it grows.', btn('Thanks!', 'mtTip'))}</div>`; }
      if (p.id === 'store') { const list = C.SHOP.filter(d => (d.cat === 'tools' || d.feed) && !(((k.island || {}).tools || {})[d.t])).slice(0, 12); return `<div class="shop-row">${list.map(d => card(C.thumb(d.t) ? `<img src="${C.thumb(d.t)}" alt="" width="40" height="40">` : '🧰', d.name, '', btn(`${C.ic('sparkle')} ${d.xp} XP`, 'mtStore', { t: d.t }, xp < d.xp))).join('') || card('🛍️', 'All stocked up', 'You’ve got every tool already.', btn('OK', 'mtTip'))}</div>`; }
      const L = WARES[p.id] || []; return `<div class="shop-row">${L.map(([id, name, icon, cost]) => card(icon, name, m.bag[id] ? `${m.bag[id]} in your bag` : '', btn(`${C.ic('sparkle')} ${cost} XP`, 'mtBuy', { w: id }, xp < cost))).join('')}</div>`;
    }
    if (cat === 'mjobs') return `<div class="shop-row">${JOBS.map(j => { const p = placeOf(j.at); return card(j.icon, j.name, `At the ${p ? p.name.toLowerCase() : j.at} · ${PER} XP a customer`, btn(near(p) ? 'Start' : 'Go & start', 'mtShift', { j: j.id }, !C.Play.on())); }).join('')}</div>`;
    if (cat === 'mpeople') {
      const N = IH.villageNet, kp = kidPos(), dist = b => (kp ? Math.hypot(b.A.pos.x - kp.x, b.A.pos.z - kp.z) : 0);
      for (const s of M.sibs.values()) { const st = s.s && s.s.stall; out.push(card(s.p.avatar, s.p.name, st ? 'Their stall’s open' : s.s && s.s.st && s.s.st.startsWith('job:') ? 'Working a shift: join for a team bonus 🤝' : 'Here now', [btn('👋 Wave', 'mtEmo', { id: s.p.id, k: 'act', i: 0 }), btn(`💬 “${N.PHRASES[(M.phr || 0) % N.PHRASES.length]}”`, 'mtSay', { id: s.p.id }), ...(st ? st.items.slice(0, 1).map((it, i) => btn(`${(C.PRODUCE[it.t] || {}).icon || '🛒'} ${it.price} XP`, 'mtSib', { id: s.p.id, i }, xp < it.price)) : [])].join(''))); }
      const folk = [...M.folk].sort((a, b) => (b.folk.id === M.focus) - (a.folk.id === M.focus) || dist(a) - dist(b)).slice(0, 6);
      for (const b of folk) {
        const f = b.folk, h = m.friends[f.id] || 0, q = m.quest && m.quest.who === f.id ? m.quest : null, gift = Object.keys(m.bag).find(id => m.bag[id] > 0 && (!q || id === q.want)) || null;
        out.push(card(f.avatar, f.name, `${'❤️'.repeat(h)}${'🤍'.repeat(5 - h)}${q ? ` · wants ${WARE[q.want].icon}` : ''}`, [btn('💬 Talk', 'mtTalk', { f: f.id }), gift ? btn(`Give ${WARE[gift].icon}`, 'mtGive', { f: f.id, w: gift }) : ''].join('')));
      }
      if (!M.sibs.size) out.unshift(card('👨‍👩‍👧', 'Brothers and sisters', N && N.live ? 'None here right now. When one comes to Market town on their own device, they’ll show up here.' : 'Connecting…', btn('OK', 'mtTip')));
      return `<div class="shop-row">${out.join('')}</div>`;
    }
    if (cat === 'mbag') {
      const ids = Object.keys(m.bag).filter(id => m.bag[id] > 0);
      if (!ids.length) return `<div class="shop-row">${card('👜', 'Your bag is empty', 'Buy treats, flowers and toys at the stalls, then give them to townsfolk. Someone might be wishing for one!', btn('See the stalls', 'mtPlaces'))}</div>`;
      return `<div class="shop-row">${ids.map(id => card(WARE[id].icon, WARE[id].name, `×${m.bag[id]}${m.quest && m.quest.want === id ? ` · ${esc(m.quest.name)} wants this!` : ''}`, btn('Give to someone', 'mtPeople'))).join('')}</div>`;
    }
    if (cat === 'mmine') return mineRow(k);
    return '';
  }
  function mineRow(k) {
    const m = mk(), { keep } = C.Farm.pantry(k), have = C.Farm.counts(keep), kinds = Object.keys(have), there = atStall();
    if (!kinds.length) return `<div class="shop-row">${card('⭐', 'Your stall', 'Your pantry’s empty. Collect eggs, milk, honey and more at your farm, then sell them here.', btn('Walk to my stall', 'mtGo', { p: 'mine' }))}</div>`;
    const head = card('⭐', there ? (offer().length ? 'Your stall is open' : !C.Farm.room(k) ? 'Sold all you can today' : 'Pick what to sell') : 'Your stall', there ? `${C.Farm.saturday() ? 'Market day: prices are up! ' : ''}Townsfolk stop by while you stand behind it. ${C.Farm.room(k)} XP of sales left today.` : 'Stand behind your stall to open it.', there ? btn('OK', 'mtTip') : btn('Walk to my stall', 'mtGo', { p: 'mine' }));
    return `<div class="shop-row">${head}${kinds.map(kind => { const P = C.PRODUCE[kind] || {}, on = m.stall.includes(kind); return card(P.icon || '🧺', P.name || kind, `${have[kind]} in the pantry · ${C.Farm.price(kind)} XP each`, btn(on ? 'On the stall ✓' : 'Put it out', 'mtStock', { k: kind }, !on && m.stall.length >= 4)); }).join('')}</div>`;
  }
  function act(n, a) {
    const d = (a && a.dataset) || {};
    if (n === 'mtJobs') { C.S0.cat = 'mjobs'; return C.ui(); }
    if (n === 'mtPlaces') { C.S0.cat = 'mmap'; return C.ui(); }
    if (n === 'mtPeople') { C.S0.cat = 'mpeople'; return C.ui(); }
    if (n === 'mtStop') { endShift(); return C.ui(); }
    if (n === 'mtGo') { const p = d.p === 'mine' ? mine() : placeOf(d.p); if (p) { walkTo(p, () => { C.S0.cat = p.mine ? 'mmine' : 'mplace'; C.ui(); }, p.mine ? p.keeper : null); C.say(`Off to ${p.mine ? 'your stall' : 'the ' + p.name.toLowerCase()}!`); } return; }
    if (n === 'mtBuy') { buyWare(d.w); return C.ui(); }
    if (n === 'mtStore') { const def = C.SHOP.find(x => x.t === d.t); if (def) C.buy(def, 'xp'); return; }
    if (n === 'mtShift') { const j = JOBS.find(x => x.id === d.j); if (j) startShift(j); return; }
    if (n === 'mtServe') return serve(d.w);
    if (n === 'mtTalk') { const b = M.folk.find(x => x.folk.id === d.f); if (b) talk(b); return; }
    if (n === 'mtGive') return give(d.f, d.w);
    if (n === 'mtStock') { const m = mk(), kind = d.k; m.stall = m.stall.includes(kind) ? m.stall.filter(x => x !== kind) : [...m.stall, kind].slice(0, 4); saveMk(m); C.Sound.pop(); return C.ui(); }
    if (n === 'mtEmo') return emote(d.id, d.k, +d.i);
    if (n === 'mtSay') { const N = IH.villageNet; emote(d.id, 'say', (M.phr || 0) % N.PHRASES.length); M.phr = (M.phr || 0) + 1; return C.ui(); }
    if (n === 'mtSib') return sibBuy(d.id, +d.i);
    if (n === 'mtMoney') return C.money();
    if (n === 'mtTip') return;
  }
  // a tap in the 3D: a townsperson or a sibling, else somewhere on the square to walk to
  function tap(ray) {
    if (!M.on) return false;
    const hit = (L, f) => { for (const b of L) { const p = b.A.pos, s = new T.Sphere(new T.Vector3(p.x, p.y + 1.1, p.z), 1.1); if (ray.intersectsSphere(s)) return f(b) || true; } return false; };
    if (hit(M.folk.filter(b => !b.folk.busy), talk)) return true;
    if (hit([...M.sibs.values()].map(s => s.b), b => { C.S0.cat = 'mpeople'; C.ui(); })) return true;
    if (hit(Object.values(M.keepers), b => { const p = placeOf(b.keeper); if (p) walkTo(p, () => { C.S0.cat = 'mplace'; C.ui(); }); say(b, 'Hello! Come and have a look 😊', 2); })) return true;
    if (M.shift) return true;
    const pl = new T.Plane(new T.Vector3(0, 1, 0), -(kidPos() ? kidPos().y : 0)), q = new T.Vector3(); if (!ray.ray.intersectPlane(pl, q)) return false;
    if (C.floorAt(q.x, q.z) < -4) return false; if (M.W.go(M.kidB, { x: q.x, z: q.z })) { M.auto = true; M.autoTo = null; } return true;
  }

  return { get debug() { return { M, atStall, offer }; }, get on() { return M.on; }, start, stop, tick, skip, follow, tabs, row, actBar, act, tap, place, get shift() { return !!M.shift; } };
};
