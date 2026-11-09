/* Chorecast homes (a prototype): visiting the village, Hoshi Street (built by village-build.js).
   The kid walks out through their garden gate and arrives through the village's own gate. They tap the ground to
   walk there and tap a place (a shop, a stall, a bench, the fountain, the vending machines, the gate home) for what
   they can do there. Villagers (the same characters, walk and foot placement as the kid's) go about their day:
   to the shops' windows, the stalls, the fountain, the park, a sit on a bench; two keep the vegetable and flower
   stalls. Nobody walks into anything or anybody: routes go round everything (a grid of the walkable ground,
   A* then pulled tight), and each slows or waits for whoever's in its way.
   The view is the homes': isometric, follows the kid, drag to look around, pinch or scroll to zoom, turn a quarter
   at a time. A shop that would hide the kid is cut down to its footprint.
   Drawn through the home's renderer and pipeline (IH.village.open(stage)); the home stops drawing while it's open.
   Shops inside, stalls and selling, and siblings come next (phases B to D). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.look || !IH.villageBuild) return;
  const LK = IH.look, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), $ = (s, r) => r.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ease = p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const G = 0.25, BODY = 0.4; // the walking grid (12.5 cm), how much room a body needs round it
  const AVATARS = ['🐰', '🐱', '🐶', '🐼', '🐨', '🦉', '🐵', '🐯', '🐧', '🦁', '🐸', '🦊'], HUES = ['#ff9fb7', '#7cc8e8', '#ffd35a', '#9be38f', '#b59cff', '#ffb36b', '#e86f6f', '#5fbf8a'];
  const HELLO = ['Hi! 👋', 'Hello!', 'Nice day!', 'Off shopping?', 'Love the café ☕', 'The cherry trees! 🌸', 'See you!', 'Hiya 😊'];
  let V = null;

  // ---------- where bodies can be: the island's rectangles drawn into a grid, the pond (with its bridge) as water
  function makeGrid(B) {
    const nx = Math.ceil((B.bounds.x1 - B.bounds.x0) / G), nz = Math.ceil((B.bounds.z1 - B.bounds.z0) / G), bad = new Uint8Array(nx * nz);
    const rect = (x0, z0, x1, z1) => { for (let i = Math.max(0, Math.floor((x0 - BODY) / G)); i <= Math.min(nx - 1, Math.floor((x1 + BODY) / G)); i++) for (let j = Math.max(0, Math.floor((z0 - BODY) / G)); j <= Math.min(nz - 1, Math.floor((z1 + BODY) / G)); j++) bad[i * nz + j] = 1; };
    for (const [x0, z0, x1, z1] of B.solids) rect(x0, z0, x1, z1);
    const P = B.pond || { x: -99, z: -99, rx: 0, rz: 0 }, onBridge = (x, z) => B.bridges.some(b => x > b.x0 && x < b.x1 && z > b.z0 + 0.15 && z < b.z1 - 0.15);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = (i + 0.5) * G, z = (j + 0.5) * G;
      if (x < 0.9 || z < 0.9 || x > B.bounds.x1 - 0.9 || z > B.bounds.z1 - 0.9) { bad[i * nz + j] = 1; continue; } // (the island's edge)
      const ex = (x - P.x) / (P.rx + 0.6 + BODY), ez = (z - P.z) / (P.rz + 0.6 + BODY);
      if (ex * ex + ez * ez < 1 && !onBridge(x, z)) bad[i * nz + j] = 1;
      if (B.walk && !B.walk(x, z)) bad[i * nz + j] = 1;
    }
    const at = (x, z) => { const i = Math.floor(x / G), j = Math.floor(z / G); return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : i * nz + j; };
    const free = (x, z) => { const c = at(x, z); return c >= 0 && !bad[c]; };
    return { nx, nz, bad, at, free, ground: (x, z) => { if (B.height) return B.height(x, z); for (const b of B.bridges) if (x > b.x0 && x < b.x1 && z > b.z0 - 0.2 && z < b.z1 + 0.2) { const u = (x - b.x0) / (b.x1 - b.x0); return Math.sin(clamp(u, 0, 1) * Math.PI) * b.arc + 0.2; } return 0; } };
  }
  // the nearest free point (a tap on a wall or in the pond: the nearest place to stand)
  function nearestFree(g, x, z, max = 40) {
    if (g.free(x, z)) return [x, z];
    for (let r = 1; r <= max; r++) { let best = null, bd = 1e9; for (let a = 0; a < r * 8; a++) { const t = a / (r * 8) * Math.PI * 2, px = x + Math.cos(t) * r * G, pz = z + Math.sin(t) * r * G; if (g.free(px, pz)) { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = [px, pz]; } } } if (best) return best; }
    return null;
  }
  const sees = (g, a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / (G * 0.5)); for (let i = 1; i < n; i++) { const u = i / n; if (!g.free(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u)) return false; } return true; };
  // A* over the grid (eight ways, no cutting corners), then pulled tight into straight runs
  function route(g, from, to, avoid) {
    if (avoid && avoid.length) { // round the people standing in the way: their spots blocked for this one route, then cleared again
      const was = [];
      for (const [x, z] of avoid) for (let i = Math.floor((x - 0.85) / G); i <= Math.floor((x + 0.85) / G); i++) for (let j = Math.floor((z - 0.85) / G); j <= Math.floor((z + 0.85) / G); j++) {
        if (i < 0 || j < 0 || i >= g.nx || j >= g.nz || Math.hypot((i + 0.5) * G - x, (j + 0.5) * G - z) > 0.85) continue; const c = i * g.nz + j; if (!g.bad[c]) { g.bad[c] = 1; was.push(c); }
      }
      const r = route(g, from, to); for (const c of was) g.bad[c] = 0; return r;
    }
    const A = nearestFree(g, from[0], from[1]), B = nearestFree(g, to[0], to[1]); if (!A || !B) return null;
    if (sees(g, A, B)) return [B];
    const s = g.at(A[0], A[1]), e = g.at(B[0], B[1]), N = g.nx * g.nz, nz = g.nz, ei = Math.floor(e / nz), ej = e % nz;
    const cost = new Float32Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N), heap = [[0, s]]; cost[s] = 0;
    const push = (f, c) => { heap.push([f, c]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    const H = c => { const dx = Math.abs(Math.floor(c / nz) - ei), dz = Math.abs(c % nz - ej); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    let found = false, n = 0;
    while (heap.length && n++ < N * 4) {
      const [, c] = pop(); if (done[c]) continue; done[c] = 1; if (c === e) { found = true; break; }
      const ci = Math.floor(c / nz), cj = c % nz;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= g.nx || nj >= nz) continue;
        const nc = ni * nz + nj; if (g.bad[nc]) continue; if (di && dj && (g.bad[ci * nz + nj] || g.bad[ni * nz + cj])) continue;
        const nd = cost[c] + (di && dj ? Math.SQRT2 : 1); if (nd < cost[nc]) { cost[nc] = nd; prev[nc] = c; push(nd + H(nc), nc); }
      }
    }
    if (!found) return null;
    const pts = []; for (let c = e; c !== -1 && c !== s; c = prev[c]) pts.push([(Math.floor(c / nz) + 0.5) * G, (c % nz + 0.5) * G]);
    pts.reverse(); pts[pts.length - 1] = B;
    const out = []; let a = A; // pulled tight: from each point, as far along as it can see
    for (let i = 0; i < pts.length;) { let k = pts.length - 1; while (k > i && !sees(g, a, pts[k])) k--; out.push(pts[k]); a = pts[k]; i = k + 1; }
    return out;
  }

  // ---------- the scene
  function scene(B) {
    const sc = new T.Scene(), sun = new T.DirectionalLight(0xffffff, 1);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.018; sun.shadow.radius = 1;
    sc.add(sun, sun.target);
    const lamps = []; for (let i = 0; i < 4; i++) { const p = new T.PointLight(0xffc77a, 0, 5.2, 2); sc.add(p); lamps.push(p); } // (the same lights as a home, so its shaders are the same)
    const cam = new T.OrthographicCamera(-10, 10, 10, -10, 1, 1400);
    sc.add(B.root);
    return { sc, sun, cam };
  }

  // ---------- people: the kid and the villagers
  function person(avatar, hue, x, z, yaw = 0) {
    const inst = IH.chars.make(avatar, hue); V.S.sc.add(inst.group);
    const p = { inst, pos: new T.Vector3(x, 0, z), yaw, path: [], st: 'stand', sp: 1.25, ph: Math.random() * 6, wait: 0, until: 0, task: null };
    inst.group.position.copy(p.pos); inst.group.rotation.y = yaw; return p;
  }
  function go(p, to, then) { const r = route(V.grid, [p.pos.x, p.pos.z], to); p.path = r || []; p.then = then || null; p.stuck = 0; p.seat = null; if (!r && then) then(false); return !!r; }
  const turn = (p, want, dt, rate = 8) => { p.yaw += clamp(Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw)), -rate * dt, rate * dt); };
  // one step along the way: slower, then waiting, when someone's just ahead; round them after a while
  // round whoever's in the way: a new way that keeps clear of everyone standing near, else a step to the side
  function reroute(p, fx, fz) {
    p.stuck = 0; const last = p.path[p.path.length - 1], others = V.people.filter(o => o !== p && Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z) < 6 && Math.hypot(o.pos.x - last[0], o.pos.z - last[1]) > 0.9).map(o => [o.pos.x, o.pos.z]);
    const r = route(V.grid, [p.pos.x, p.pos.z], last, others);
    if (r && r.length) p.path = r;
    else { const side = [p.pos.x - fz * 0.9, p.pos.z + fx * 0.9], other = [p.pos.x + fz * 0.9, p.pos.z - fx * 0.9], sp = V.grid.free(...side) ? side : V.grid.free(...other) ? other : null; if (sp) { const f = p.then; p.path = [sp]; p.then = () => { go(p, last, f); }; } }
  }
  function walk(p, dt, t) {
    if (!p.path.length) return 0;
    const q = p.path[0], dx = q[0] - p.pos.x, dz = q[1] - p.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.06) { p.path.shift(); if (!p.path.length) { p.st = 'stand'; const f = p.then; p.then = null; if (f) f(true); } return 0; }
    const fx = dx / d, fz = dz / d;
    const block = V.people.find(o => o !== p && !o.seat && (() => { const rx = o.pos.x - p.pos.x, rz = o.pos.z - p.pos.z, along = rx * fx + rz * fz; return along > 0.1 && along < 1.0 && Math.abs(rx * fz - rz * fx) < 0.62; })());
    turn(p, Math.atan2(dx, dz), dt);
    const facing = Math.cos(Math.atan2(dx, dz) - p.yaw); // (turns before it walks off: no moonwalking)
    if (block) {
      p.stuck += dt; p.st = 'stand';
      if (p.stuck > (p === V.kid ? 0.5 : 1.2)) reroute(p, fx, fz);
      return 0;
    }
    if (facing < 0.3) { p.st = 'stand'; return 0; }
    const s = Math.min(d, p.sp * dt * clamp(facing, 0.3, 1)), nx = p.pos.x + fx * s, nz = p.pos.z + fz * s;
    // never into anybody: a step that would bring it closer than two bodies' width to someone isn't taken (it waits, as for someone ahead)
    if (V.people.some(o => o !== p && Math.hypot(o.pos.x - nx, o.pos.z - nz) < 0.74 && Math.hypot(o.pos.x - nx, o.pos.z - nz) < Math.hypot(o.pos.x - p.pos.x, o.pos.z - p.pos.z))) { p.stuck += dt; p.st = 'stand'; if (p.stuck > (p === V.kid ? 0.5 : 1.2)) reroute(p, fx, fz); return 0; }
    p.stuck = 0; p.pos.x = nx; p.pos.z = nz; p.st = 'walk'; return s;
  }
  function draw(p, t, moved) {
    p.inst.walkD = (p.inst.walkD || 0) + moved;
    const gy = V.grid.ground(p.pos.x, p.pos.z); p.pos.y += (gy + (p.seat ? p.seat.y : 0) - p.pos.y) * 0.5; // (up over the bridge; up onto a bench seat)
    p.inst.group.position.copy(p.pos); p.inst.group.rotation.y = p.yaw;
    const wade = !p.pose && p.st === 'stand' && V.B.wet && V.B.wet(p.pos.x, p.pos.z) > 0.45 ? 'splash' : null; // (in the sea up to the waist: a swim, feet on the bed)
    try { IH.chars.pose(p.inst, p.pose || wade || p.st, t, p.ph); } catch (e) { /* (still loading) */ }
  }

  // villagers: off somewhere, a while there, then somewhere else
  function errand(n, t) {
    const S = V.B.spots.filter(s => s.kind !== 'home' && s.kind !== 'board' && s.kind !== 'exit' && s.kind !== 'counter' && s.kind !== 'travel' && !s.noNpc); if (!S.length) return void (n.until = t + 5);
    const s = S[Math.floor(Math.random() * S.length)];
    if (s.kind === 'bench' || s.kind === 'seat' || s.kind === 'log') { const taken = V.people.some(o => o !== n && o.seatAt === s); if (taken) return void (n.until = t + 1); }
    const taken = (x, z) => V.people.some(o => o !== n && (Math.hypot(o.pos.x - x, o.pos.z - z) < 1.4 || (o.path.length && Math.hypot(o.path[o.path.length - 1][0] - x, o.path[o.path.length - 1][1] - z) < 1.4)));
    let to = null;
    for (let k = 0; k < 12 && !to; k++) {
      const a = Math.random() * Math.PI * 2, c = s.kind === 'fountain' ? [V.B.spots.find(q => q.id === 'fountain').hit[0] + Math.cos(a) * 5.4, V.B.spots.find(q => q.id === 'fountain').hit[1] + Math.sin(a) * 5.4] // (round the rim)
        : s.kind === 'park' || s.kind === 'pond' ? [s.at[0] + (Math.random() - 0.5) * 5, s.at[1] + (Math.random() - 0.5) * 4] : [s.at[0] + (Math.random() - 0.5) * 2.4, s.at[1] + Math.random() * 1.2];
      if (V.grid.free(c[0], c[1]) && !taken(c[0], c[1])) to = c;
    }
    if (!to) return void (n.until = t + 1);
    if (s.kind === 'bench' || s.kind === 'seat' || s.kind === 'log') n.seatAt = s; if (s.swimTo && Math.random() < 0.6) to = [s.swimTo[0] + (Math.random() - 0.5) * 6, s.swimTo[1] + Math.random() * 2];
    go(n, to, ok => {
      if (!ok) { n.seatAt = null; n.until = t + 1; return; }
      const now = V.t;
      if ((s.kind === 'bench' || s.kind === 'log') && n.seatAt === s) { sit(n, s); n.until = now + 10 + Math.random() * 12; return; }
      if (s.npcPose) { n.seatAt = null; n.lookYaw = s.yaw != null ? s.yaw : null; n.pose = s.npcPose; n.until = now + 6 + Math.random() * 10; return; }
      if (s.kind === 'seat' && n.seatAt === s) { sit(n, s); n.until = now + 8 + Math.random() * 8; return; }
      n.seatAt = null; n.lookYaw = s.kind === 'fountain' ? Math.atan2(s.hit[0] - n.pos.x, s.hit[1] - n.pos.z) : s.yaw != null ? s.yaw : null; n.pose = /^(shop|stall|vend|item|food|treat)$/.test(s.kind) ? 'look' : null; n.until = now + 3 + Math.random() * 6;
    });
  }
  function sit(p, s) { p.seat = { y: 0.12, yaw: s.yaw }; p.pos.x = s.seat[0]; p.pos.z = s.seat[1]; p.yaw = s.yaw; p.pose = 'sitchair'; }
  function stand(p) { if (!p.seat) return; const s = p.seatAt || null; p.seat = null; p.pose = null; p.seatAt = null; if (s) { p.pos.x = s.at[0]; p.pos.z = s.at[1]; } }
  function villagersTick(t, dt) {
    for (const n of V.npc) {
      let moved = 0;
      if (n.keeper) { n.st = 'stand'; turn(n, n.keeper.yaw, dt, 3); if (Math.random() < dt * 0.05) n.wave = t + 1.5; n.pose = t < (n.wave || 0) ? 'happy' : null; }
      else if (n.path.length) { n.pose = null; moved = walk(n, dt, t); }
      else if (t > n.until) { stand(n); n.lookYaw = null; errand(n, t); }
      else if (n.lookYaw != null) turn(n, n.lookYaw, dt, 4);
      if (n.hi && t < n.hi.until) { n.pose = 'happy'; turn(n, Math.atan2(V.kid.pos.x - n.pos.x, V.kid.pos.z - n.pos.z), dt, 6); } else if (n.hi) { n.hi = null; if (!n.seat && !n.keeper) n.pose = null; }
      draw(n, t, moved);
    }
  }

  // ---------- the kid: tap to walk, tap a place for what to do there
  function kidTick(t, dt) {
    const k = V.kid; let moved = 0;
    if (V.ride) { try { IH.chars.pose(k.inst, k.pose || 'sitchair', t, k.ph); } catch (e) { /* (still loading) */ } return; }
    if (k.path.length) { if (k.seat) stand(k); k.pose = null; moved = walk(k, dt, t); V.follow = true; }
    else if (k.face != null) turn(k, k.face, dt, 6);
    draw(k, t, moved);
    if (V.mark) { V.mark.visible = k.path.length > 0; V.mark.rotation.y += dt * 2; }
  }
  function walkTo(x, z, then, face) {
    const k = V.kid; k.face = face == null ? null : face; k.pose = null;
    if (!go(k, [x, z], ok => { if (ok && face != null) k.face = face; if (then) then(ok); })) { toast('Can’t get there from here.'); return false; }
    const end = k.path[k.path.length - 1]; if (V.mark) V.mark.position.set(end[0], V.grid.ground(end[0], end[1]) + 0.04, end[1]);
    return true;
  }
  const KEEPER_SAYS = { furniture: ['Welcome! Everything’s on display.', 'The second-hand corner’s at the back.'], grocer: ['Fresh in this morning!', 'The apples are lovely today 🍎'], cafe: ['Welcome to the café! ☕', 'The taiyaki are warm 🐟'], pets: ['Say hi to the pets! 🐾', 'Every pet needs a bed and a bowl.'] };
  function hello() { const L = KEEPER_SAYS[V.B.id] || ['Hello!']; say(V.keeper, L[Math.floor(Math.random() * L.length)]); V.keeper.hi = { until: V.t + 2 }; }
  function xp() { const el = $('.vg-xpn', V.ui); if (el && V.stage.shop) el.textContent = Math.round(V.stage.shop.wallet().left).toLocaleString('en-NZ'); }
  const ACTS = {
    shop: s => [{ e: '🚪', label: 'Go in', run: () => walkTo(s.at[0], s.at[1], ok => ok && enter(s.id), s.yaw) },
      { e: '👀', label: 'Look in the window', run: () => walkTo(s.at[0] + (s.id === 'grocer' ? 0 : 3), s.at[1] + 0.2, ok => { if (ok) { V.kid.pose = 'look'; setTimeout(() => { if (V) V.kid.pose = null; }, 3500); } }, Math.PI) }],
    stall: s => sibAt(s) ? sibStallActs(s, sibAt(s)) : s.keeper ? [{ e: '🧺', label: 'Have a look', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) { V.kid.pose = 'look'; toast('Fresh today! Buying from stalls comes soon.'); setTimeout(() => { if (V) V.kid.pose = null; }, 3000); } }, s.yaw) }]
      : V.stall && V.stall.s === s ? [{ e: '📦', label: 'Pack up my stall', run: () => walkTo(s.at[0], s.at[1], ok => ok && stallClose(), s.yaw) }] : V.stall ? [{ e: '🏷️', label: 'You have a stall open already', run: () => toast('Pack up your other stall first.') }]
      : [{ e: '🏷️', label: 'Set up my stall here', run: () => walkTo(s.at[0], s.at[1], ok => ok && stallPick(s), s.yaw) }],
    bench: s => [{ e: '🪑', label: 'Sit down', run: () => { if (V.people.some(o => o !== V.kid && o.seatAt === s)) return toast('Someone’s sitting there.'); V.kid.seatAt = s; walkTo(s.at[0], s.at[1], ok => { if (ok && V.kid.seatAt === s) sit(V.kid, s); }); } }],
    fountain: s => [{ e: '✨', label: 'Make a wish', run: () => walkTo(s.at[0], s.at[1], ok => { V.kid.face = Math.atan2(s.hit[0] - V.kid.pos.x, s.hit[1] - V.kid.pos.z); if (ok) { V.kid.pose = 'happy'; float(V.kid, '✨'); sound('tune'); setTimeout(() => { if (V) V.kid.pose = null; }, 1800); } }, Math.PI) }],
    vend: s => [{ e: '🥤', label: 'Get a cold drink', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) { sound('pop'); toast('Clunk! A cold drink 🥤'); float(V.kid, '🥤'); } }, s.yaw) }],
    board: s => [{ e: '📌', label: 'Read the notices', run: () => walkTo(s.at[0], s.at[1], ok => ok && toast('Market day every day! · Lost: one blue sock · Café: try the strawberry milk 🍓'), Math.PI) }],
    pond: s => [{ e: '🌉', label: 'Cross the bridge', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) { V.kid.pose = 'look'; setTimeout(() => { if (V) V.kid.pose = null; }, 2500); } }, Math.PI / 2) }],
    play: s => [{ e: s.id === 'swings' ? '🎠' : s.id === 'sand' ? '🏖️' : '🛝', label: s.id === 'swings' ? 'Have a swing' : s.id === 'sand' ? 'Build a sandcastle' : 'Go down the slide', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) { V.kid.pose = 'happy'; float(V.kid, s.id === 'sand' ? '🏰' : '😄'); sound('tune'); setTimeout(() => { if (V) V.kid.pose = null; }, 2600); } }, s.yaw) }],
    park: () => [],
    shed: s => V.mow ? [{ e: '🛑', label: 'Stop mowing', run: () => mowEnd(false) }] : [{ e: '🚜', label: 'Mow the park lawn · ✨ up to 120', run: () => walkTo(s.at[0], s.at[1], ok => ok && mowStart(), s.yaw) }],
    mess: s => [{ e: '🧹', label: 'Sweep it up', run: () => sweep(s) }],
    // inside a shop
    exit: () => [{ e: '🚪', label: 'Go back outside', run: () => walkTo(V.B.arrive[0], V.B.arrive[1] + 0.6, ok => ok && exit(), 0) }],
    item: s => [{ e: '🛍️', label: s.offer ? 'Have a look (used)' : 'Have a look', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) V.stage.shop.ask(s.t, s.offer); }, s.yaw) }],
    food: s => [{ e: '🧺', label: `Buy ${s.name} · ✨ ${V.foods[s.id].xp}`, run: () => walkTo(s.at[0], s.at[1], ok => { if (ok && V.stage.shop.buyFood(s.id)) { float(V.kid, V.foods[s.id].emoji); toast(`${V.foods[s.id].name}: into your ${V.foods[s.id].where} at home. You have ${V.stage.shop.food()[s.id]}.`); xp(); } }, s.yaw) }],
    treat: s => [{ e: s.treat.e, label: `Order ${s.name} · ✨ ${s.treat.xp}`, run: () => walkTo(s.at[0], s.at[1], ok => { if (ok && V.stage.shop.treat(s.treat.name, s.treat.xp, s.treat.gives)) { xp(); say(V.keeper, 'Coming right up! ' + s.treat.e); V.kid.treat = s.treat; toast(`${s.treat.name}! Find a table to enjoy it.`); } }, s.yaw) }],
    seat: s => [{ e: '🪑', label: V.kid && V.kid.treat ? `Sit and eat the ${V.kid.treat.name.toLowerCase()}` : 'Sit down', run: () => { if (V.people.some(o => o !== V.kid && o.seatAt === s)) return toast('Someone’s sitting there.'); V.kid.seatAt = s; walkTo(s.at[0], s.at[1], ok => { if (ok && V.kid.seatAt === s) { sit(V.kid, s); const tr = V.kid.treat; if (tr) { V.kid.treat = null; V.kid.pose = 'sitchair.eat'; float(V.kid, tr.e); setTimeout(() => { if (V && V.kid.seat) { V.kid.pose = 'sitchair'; float(V.kid, '😋'); toast('Yum! Food and fun are up.'); } }, 6000); } } }); } }],
    counter: () => [...(V.stage.shop ? [{ e: '💼', label: `Work a shift · ✨ up to ${(V.stage.shop.jobs().find(j => j.id === V.B.id) || {}).pay}`, run: () => walkTo(V.B.spots.find(q => q.kind === 'counter').at[0], V.B.spots.find(q => q.kind === 'counter').at[1], ok => ok && shift(V.B.id), Math.PI) }] : []), ...(V.B.id === 'furniture' || V.B.id === 'pets' ? [{ e: '🏷️', label: 'Sell to the shop', run: () => walkTo(V.B.spots.find(q => q.kind === 'counter').at[0], V.B.spots.find(q => q.kind === 'counter').at[1], ok => { if (ok) { say(V.keeper, 'What have you got?'); V.stage.shop.counter(V.B.id === 'pets' ? 'pets' : 'home'); } }, Math.PI) }, { e: '👋', label: 'Say hello', run: () => hello() }] : [...(V.B.id === 'grocer' ? [{ e: '🧺', label: 'Sell your produce', run: () => walkTo(V.B.spots.find(q => q.kind === 'counter').at[0], V.B.spots.find(q => q.kind === 'counter').at[1], ok => { if (ok) { say(V.keeper, 'Fresh from the farm? Lovely!'); V.stage.shop.counter('produce'); } }, Math.PI) }] : []), { e: '👋', label: 'Say hello', run: () => hello() }])],
    sib: s => [{ e: '👋', label: 'Wave', run: () => act(0) }, { e: '🙌', label: 'High five', run: () => { const p = s.S.p; if (!p) return; const a = Math.atan2(V.kid.pos.x - p.pos.x, V.kid.pos.z - p.pos.z); walkTo(p.pos.x + Math.sin(a) * 0.9, p.pos.z + Math.cos(a) * 0.9, ok => ok && act(2)); } },
      { e: '🔁', label: 'Trade', run: () => { if (V.game) return toast('Finish what you’re doing first.'); NET().send({ t: 'ask', to: s.S.id }, true); toast(`Asking ${s.S.info.name}…`); } }],
    home: s => [{ e: '🏠', label: 'Go home', run: () => walkTo(s.at[0], s.at[1], ok => ok && leave(), 0) }]
  };

  // ---------- into a shop and back out (village-shops.js builds each room the first time it's visited)
  function fade(then) { const f = $('.vg-fade', V.ui); f.classList.add('on'); sound('move'); setTimeout(() => { if (!V) return; then(); requestAnimationFrame(() => { if (V) f.classList.remove('on'); }); }, 480); }
  function placeOut() {
    if (V.game) gameEnd(V.game.score * V.game.per, 'Shift over!'); if (V.mow) mowEnd(false); V.S.sc.remove(V.B.root); for (const n of V.npc) V.S.sc.remove(n.inst.group); for (const b of V.says) if (b.el) b.el.remove(); V.says = []; hideActs(); if (V.stage.closeSheet) V.stage.closeSheet(); }
  function placeIn(B, npcs) {
    V.B = B; V.S.sc.add(B.root); V.grid = makeGrid(B); V.hits = []; B.root.traverse(o => { if (o.userData.spot) V.hits.push(o); });
    for (const l of B.lits) l.visible = V.phase !== 'day';
    V.npc = npcs; for (const n of npcs) V.S.sc.add(n.inst.group); V.people = [V.kid, ...npcs];
    const nm = $('.vg-name', V.ui); if (nm) nm.textContent = B === V.street ? (B.title || 'Hoshi Street') : B.name; const sm = $('.vg-sub', V.ui); if (sm) sm.textContent = B === V.street ? (B.sub || 'Village · tap for home') : 'Hoshi Street · tap to go out';
  }
  const placeKid = (x, z, yaw) => {
    const k = V.kid; k.path = []; k.then = null; k.seat = null; k.seatAt = null; k.pose = null; k.face = null; k.pos.set(x, 0, z); k.yaw = yaw; CAM.target.set(x, 1, z);
    // anyone standing just there steps away first (never in each other)
    for (const n of V.npc) if (!n.keeper && Math.hypot(n.pos.x - x, n.pos.z - z) < 1.2) { const q = nearestFree(V.grid, x + (n.pos.x >= x ? 2 : -2), z - 1.5); if (q) { n.pos.set(q[0], 0, q[1]); n.path = []; n.then = null; stand(n); n.until = 0; } }
  };
  function enter(id) {
    if (V.busy || !IH.villageShops) return; V.busy = true;
    fade(() => {
      placeOut();
      let B = V.shops[id];
      if (!B) {
        const sh = V.stage.shop, ctx = { defs: sh.defs, BY: IH.items.BY, used: sh.used, food: IH.kitchen ? IH.kitchen.FOOD : {}, make: IH.items.make, day: Math.floor(Date.now() / 864e5) };
        B = V.shops[id] = IH.villageShops.build(id, ctx);
        const K = B.keeper, keeper = person(K.avatar, K.hue, K.at[0], K.at[1], K.yaw); keeper.keeper = { yaw: K.yaw }; V.S.sc.remove(keeper.inst.group);
        B.npc = [keeper];
        for (let j = 0; j < 2; j++) { let at = null; for (let q = 0; q < 40 && !at; q++) { const x = 2 + Math.random() * 16, z = 5 + Math.random() * 7; if (makeGrid(B).free(x, z)) at = [x, z]; } if (!at) continue; const n = person(AVATARS[(id.length * 3 + j * 5) % AVATARS.length], HUES[(j + id.length) % HUES.length], at[0], at[1], Math.random() * 6); n.sp = 0.9 + Math.random() * 0.3; n.until = 1 + Math.random() * 3; V.S.sc.remove(n.inst.group); B.npc.push(n); }
        // the pets in the pen (the pet shop): sitting and standing about, each its own way
        B.petsIn = []; for (const pp of B.pens || []) { try { const inst = IH.pets.make(pp.d.pet); inst.group.position.set(pp.x, 0.06, pp.z); inst.group.rotation.y = Math.random() * 6; B.root.add(inst.group); B.petsIn.push({ inst, st: 'sit', next: 0, ph: Math.random() * 6 }); } catch (e) { /* (a pet that can't be made here) */ } }
      }
      V.keeper = B.npc[0]; placeIn(B, B.npc);
      placeKid(B.arrive[0], B.arrive[1], Math.PI); CAM.target.set(B.centre[0], 1, B.centre[1] + 1); setZoom(1.6); V.follow = false; xp();
      V.busy = false; setTimeout(() => { if (V && V.B === B) hello(); }, 500);
    });
  }
  function exit() {
    if (V.busy || V.B === V.street) return; V.busy = true; const id = V.B.id;
    fade(() => {
      placeOut(); placeIn(V.street, V.streetNpc); const s = V.street.spots.find(q => q.kind === 'shop' && q.id === id);
      placeKid(s.at[0], s.at[1] + 0.6, 0); setZoom(1.6); V.follow = true; V.busy = false;
    });
  }
  function petsTick(t) { for (const p of (V.B.petsIn || [])) { if (t > p.next) { p.st = ['sit', 'stand', 'sit', 'look'][Math.floor(Math.random() * 4)]; p.next = t + 3 + Math.random() * 5; } try { IH.pets.pose(p.inst, p.st, t, p.ph); } catch (e) { /* (still loading) */ } } }

  // ---------- the village's lawns: the home's own grass (IH.lawnKit), growing long over a few days; mowing the park
  // is a job (Employment), done with the kid's own lawnmower: row after row across the park, paid for how much is cut
  function makeLawn(B) {
    const K = IH.lawnKit; if (!K || !B.lawns || !B.lawns.length) return null;
    const inR = (x0, z0, x1, z1, r) => x0 >= r[0] - 1e-6 && z0 >= r[1] - 1e-6 && x1 <= r[2] + 1e-6 && z1 <= r[3] + 1e-6, hit = (x0, z0, x1, z1, r) => x0 < r[2] && x1 > r[0] && z0 < r[3] && z1 > r[1], P = B.pond, cells = [];
    for (let i = 0; i < B.bounds.x1; i++) for (let j = 0; j < B.bounds.z1; j++) {
      if (!B.lawns.some(r => inR(i, j, i + 1, j + 1, r)) || B.paths.some(r => hit(i, j, i + 1, j + 1, r)) || B.solids.some(r => hit(i + 0.2, j + 0.2, i + 0.8, j + 0.8, r))) continue;
      if (P) { const ex = (i + 0.5 - P.x) / (P.rx + 1.0), ez = (j + 0.5 - P.z) / (P.rz + 1.0); if (ex * ex + ez * ez < 1) continue; }
      cells.push({ x: i, z: j });
    }
    const L = K.build({ cells, x0: B.bounds.x0, z0: B.bounds.z0, W: B.bounds.x1 - B.bounds.x0, D: B.bounds.z1 - B.bounds.z0, seed: 4242, phase: V.phase, per: e => e ? 30 : 4, ground: false });
    L.position.y = 0.07; B.root.add(L);
    K.grow(L, B.growth != null ? B.growth : V.stage.shop ? V.stage.shop.parkGrowth() : 0.6);
    return L;
  }
  const PARK = [54.4, 28.4, 80.6, 59.6];
  function parkShare() { // how much of the park's lawn is cut
    const M = V.lawn && V.lawn.userData.map; if (!M) return 0; const res = M.mw / (V.street.bounds.x1 - V.street.bounds.x0); let n = 0, c = 0;
    for (let pz = Math.floor(PARK[1] * res); pz < Math.min(M.mh, PARK[3] * res); pz++) for (let px = Math.floor(PARK[0] * res); px < Math.min(M.mw, PARK[2] * res); px++) { const o = (pz * M.mw + px) * 4; if (M.data[o + 2]) { n++; if (M.data[o]) c++; } }
    return n ? c / n : 0;
  }
  function mowStart() {
    const sh = V.stage.shop, g = sh.parkGrowth();
    if (!sh.owns('mower')) return toast('You need your own lawnmower for this job. The Shop on your phone has them.');
    if (g < 0.5) return toast('The park was mowed not long ago. Check Employment for when it’s long again.');
    const k = V.kid, rows = []; let dir = 1;
    for (let z = PARK[1] + 0.5; z <= PARK[3] - 0.4; z += 1.5, dir = -dir) rows.push(dir > 0 ? [[PARK[0] + 0.3, z], [PARK[2] - 0.3, z]] : [[PARK[2] - 0.3, z], [PARK[0] + 0.3, z]]);
    const mw = IH.items.make(IH.items.BY.mower, {}); mw.group.traverse(m => { if (m.isMesh) m.castShadow = true; }); V.S.sc.add(mw.group);
    V.mow = { rows, i: 0, leg: 0, mower: mw.group, pay: 120 }; k.sp = 3.0; sound('on');
    toast('Mow row by row. Tap anywhere to stop: you’re paid for what you’ve cut.'); mowNext();
  }
  function mowNext() {
    const M = V.mow; if (!M) return; if (M.i >= M.rows.length) return mowEnd(true);
    const pt = M.rows[M.i][M.leg];
    go(V.kid, pt, () => { if (V.mow !== M) return; if (M.leg === 0) M.leg = 1; else { M.leg = 0; M.i++; } mowNext(); });
  }
  function mowTick() {
    const M = V.mow; if (!M) return; const k = V.kid, f = [Math.sin(k.yaw), Math.cos(k.yaw)], x = k.pos.x + f[0] * 1.0, z = k.pos.z + f[1] * 1.0;
    M.mower.position.set(x, k.pos.y, z); M.mower.rotation.y = k.yaw;
    if (k.st === 'walk' && V.lawn) { IH.lawnKit.cutAt(V.lawn, x, z, 0.92); if (Math.random() < 0.5) fx('leaves', x - f[1] * 0.5, k.pos.y + 0.3, z + f[0] * 0.5, 1, [-f[1] * 1.5, 0.6, f[0] * 1.5]); } // (clippings out of the side chute)
  }
  function mowEnd(all) {
    const M = V.mow; if (!M) return; V.mow = null; V.S.sc.remove(M.mower); V.kid.sp = 1.25; sound('off');
    const share = parkShare(), done = all || share > 0.85, pay = done ? M.pay : Math.round(M.pay * share / 10) * 10;
    if (pay >= 10) { V.stage.shop.earn(pay, 'park'); V.stage.shop.mowed(done ? 1 : share); xp(); float(V.kid, '✨'); toast(done ? `The park looks great! ✨ ${pay} XP for the job.` : `You mowed ${Math.round(share * 100)}% of the park: ✨ ${pay} XP.`); if (done) IH.lawnKit.grow(V.lawn, 0); }
    else toast('Mowing stopped. Mow more of the park to get paid.');
  }

  // ---------- shifts at the shops: a little game each (Employment lists them; two a day at each shop)
  function gamePanel(html) { const el = $('.vg-game', V.ui); el.innerHTML = html; el.hidden = false; return el; }
  function gameEnd(pay, words) {
    const G = V.game; if (!G) return; V.game = null; if (G.stop) G.stop();
    const xpv = Math.min(G.max, Math.round(pay)); if (xpv > 0) { V.stage.shop.earn(xpv, G.id); xp(); }
    gamePanel(`<div class="vg-gh"><b>${words}</b><span>✨ ${xpv} XP</span></div><div class="vg-gq">Paid into your XP from jobs.</div>`); sound('tune');
    setTimeout(() => { if (V && !V.game) $('.vg-game', V.ui).hidden = true; }, 2600);
  }
  function gameTick() {
    const G = V.game; if (!G) return; const left = Math.max(0, Math.ceil(G.end - V.t)), el = $('.vg-time', V.ui); if (el) el.textContent = `⏱ ${left}s`;
    if (left <= 0) gameEnd(G.score * G.per, 'Shift over!');
  }
  function shift(id) {
    if (V.game || V.mow) return; const job = V.stage.shop.jobs().find(j => j.id === id); if (!job || !job.ok) return toast(job ? job.why : 'No work here today.');
    if (!V.stage.shop.shift(id)) return; say(V.keeper, 'Thanks for helping out!'); ({ cafe: serveGame, furniture: buildGame, pets: cleanGame, grocer: stackGame })[id](job);
  }
  const shake = btn => { btn.classList.remove('no'); void btn.offsetWidth; btn.classList.add('no'); sound('no'); };
  // the café: customers come up to the counter and order; give each what they asked for
  function serveGame(job) {
    const TR = IH.villageShops.TREATS, G = V.game = { id: 'cafe', score: 0, per: 10, max: job.pay, end: V.t + 60, n: 0, cust: null };
    // behind the counter for the shift, beside the shopkeeper (and back out in front after)
    const ct0 = V.B.spots.find(q => q.kind === 'counter'), k = V.kid; k.path = []; k.pos.set(ct0.at[0] - 4.2, 0, 1.45); k.yaw = 0; k.face = 0;
    const draw = q => gamePanel(`<div class="vg-gh"><b>☕ Serving</b><span class="vg-time"></span><span>${G.score} served</span></div><div class="vg-gq">${q}</div><div class="vg-gb">${TR.map((t, i) => `<button data-v="gsel" data-i="${i}"><span class="e">${t.e}</span>${esc(t.name)}</button>`).join('')}</div>`);
    const next = () => {
      if (!V || V.game !== G) return; if (G.n >= 6) return gameEnd(G.score * G.per, 'All served! Great shift.');
      const pool = V.npc.filter(n => !n.keeper), c = pool[G.n % Math.max(1, pool.length)]; G.n++; G.want = Math.floor(Math.random() * TR.length); G.cust = c;
      const ask = () => { G.ready = true; draw(`Order: <b>${TR[G.want].e} ${esc(TR[G.want].name)}</b>`); };
      if (!c) return ask();
      stand(c); c.until = 1e9; c.sp0 = c.sp0 || c.sp; c.sp = 1.8; G.ready = false; draw('A customer’s coming in…');
      if (Math.hypot(c.pos.x - V.B.arrive[0], c.pos.z - V.B.arrive[1]) > 4 && !V.people.some(o => o !== c && Math.hypot(o.pos.x - V.B.arrive[0], o.pos.z - V.B.arrive[1]) < 1)) { c.pos.set(V.B.arrive[0], 0, V.B.arrive[1] + 0.6); c.yaw = Math.PI; } // (in through the door)
      const ct = V.B.spots.find(q => q.kind === 'counter');
      go(c, [ct.at[0] - 3 + Math.random() * 2, 4.6], () => { if (V.game !== G) return; c.lookYaw = Math.PI; say(c, `${TR[G.want].e} please!`); ask(); });
    };
    G.pick = (i, btn) => { if (!G.ready) return; if (i !== G.want) return shake(btn); G.score++; sound('pop'); if (G.cust) { say(G.cust, 'Thank you! 😊'); G.cust.until = V.t + 1; G.cust.lookYaw = null; } next(); };
    G.stop = () => { for (const n of V.npc) { if (!n.keeper && n.until > 1e8) n.until = 0; if (n.sp0) { n.sp = n.sp0; n.sp0 = null; } } if (V.B.id === 'cafe') { V.kid.pos.set(ct0.at[0] - 4.2, 0, ct0.at[1] + 0.4); V.kid.face = Math.PI; } };
    next();
  }
  // the furniture shop's workshop: put things together from their pieces, from the ground up
  const BUILDS = [['🪑 Chair', ['🦵 Legs', '🟫 Seat', '🪵 Backrest']], ['🛏️ Bed', ['🟫 Frame', '🪵 Slats', '⬜ Mattress', '🛌 Duvet', '☁️ Pillow']], ['💡 Floor lamp', ['⚫ Base', '📏 Pole', '🔆 Bulb', '🎩 Shade']],
    ['📚 Bookcase', ['⬛ Plinth', '📏 Sides', '🪵 Shelves', '🟫 Top', '📚 Books']], ['🍽️ Table', ['🦵 Legs', '🟫 Tabletop', '🌼 Vase']], ['🛋️ Sofa', ['🦵 Feet', '🟫 Base', '🧽 Cushions', '🪵 Back', '🧸 Throw pillow']]];
  function buildGame(job) {
    const G = V.game = { id: 'furniture', score: 0, per: 20, max: job.pay, end: V.t + 75 }, order = BUILDS.slice().sort(() => Math.random() - 0.5).slice(0, 3); let b = 0, step = 0;
    const draw = () => {
      const [name, parts] = order[b], shuffled = G.shuf || (G.shuf = parts.map((p, i) => i).sort(() => Math.random() - 0.5));
      gamePanel(`<div class="vg-gh"><b>🔨 Build: ${esc(name)}</b><span class="vg-time"></span><span>${G.score} built</span></div><div class="vg-gq">Put it together from the ground up.</div><div class="vg-slots">${parts.map((p, i) => `<i class="${i < step ? 'on' : ''}">${i < step ? esc(p) : i + 1}</i>`).join('')}</div><div class="vg-gb">${shuffled.map(i => `<button data-v="gsel" data-i="${i}" ${i < step ? 'disabled' : ''}>${esc(parts[i])}</button>`).join('')}</div>`);
    };
    G.pick = (i, btn) => {
      if (i !== step) return shake(btn); step++; sound('place');
      if (step >= order[b][1].length) { G.score++; float(V.kid, order[b][0].split(' ')[0]); b++; step = 0; G.shuf = null; if (b >= order.length) return gameEnd(G.score * G.per, 'All built! Lovely work.'); }
      draw();
    };
    draw();
  }
  // the pet shop: fur and spilled kibble on the floor; tap each to sweep it up
  function cleanGame(job) {
    const G = V.game = { id: 'pets', score: 0, per: 6, max: job.pay, end: V.t + 80, mess: [] };
    for (let i = 0; i < 10; i++) {
      let at = null; for (let q = 0; q < 60 && !at; q++) { const x = 1.5 + Math.random() * 17, z = 4.5 + Math.random() * 8.5; if (V.grid.free(x, z) && !G.mess.some(m => Math.hypot(m.x - x, m.z - z) < 1.2)) at = [x, z]; } if (!at) continue;
      const k = new IH.kit.Kit(), fur = i % 2;
      if (fur) for (let j = 0; j < 4; j++) k.ball(0.14, (j % 2 - 0.5) * 0.18, 0.06, (Math.floor(j / 2) - 0.5) * 0.16, ['#f6b06a', '#d9d2c6', '#8a6a50'][i % 3], { n: 7, s: [1, 0.5, 1] });
      else for (let j = 0; j < 7; j++) k.ball(0.06, Math.cos(j) * 0.25, 0.04, Math.sin(j * 1.7) * 0.22, '#a5784b', { n: 5 });
      const g = k.build({ shadow: false }); g.position.set(at[0], 0.04, at[1]); V.B.root.add(g);
      const hitM = new T.Mesh(new T.BoxGeometry(1.2, 0.8, 1.2), new T.MeshBasicMaterial()); hitM.visible = false; hitM.position.set(at[0], 0.4, at[1]); hitM.userData.spot = { kind: 'mess', id: 'm' + i, name: 'a mess', at, hitM }; V.B.root.add(hitM); V.hits.push(hitM);
      G.mess.push({ x: at[0], z: at[1], g, hitM });
    }
    G.total = G.mess.length;
    G.draw = () => gamePanel(`<div class="vg-gh"><b>🧹 Tidy the pet shop</b><span class="vg-time"></span><span>${G.score} / ${G.total}</span></div><div class="vg-gq">Tap the fur and spilled kibble to sweep them up.</div>`);
    G.stop = () => { for (const m of G.mess) { V.B.root.remove(m.g); V.B.root.remove(m.hitM); const i = V.hits.indexOf(m.hitM); if (i >= 0) V.hits.splice(i, 1); } G.mess = []; };
    G.draw();
  }
  function sweep(s) {
    const G = V.game; if (!G || G.id !== 'pets') return;
    walkTo(s.at[0] + 0.7, s.at[1] + 0.3, ok => {
      if (!ok || V.game !== G) return; V.kid.pose = 'sweep'; if (V.kid.inst) V.kid.inst.holding = 'broom'; V.emit.push({ kind: 'dust', at: 'front', dist: 0.7, y: 0.1, rate: 12, from: V.t + 0.2, until: V.t + 1.1 }); // (swept with a broom, dust flying)
      setTimeout(() => {
        if (!V || V.game !== G) return; V.kid.pose = null; if (V.kid.inst && V.kid.inst.holding === 'broom') V.kid.inst.holding = null; const i = G.mess.findIndex(m => m.hitM === s.hitM); if (i < 0) return;
        const m = G.mess.splice(i, 1)[0]; V.B.root.remove(m.g); V.B.root.remove(m.hitM); const h = V.hits.indexOf(m.hitM); if (h >= 0) V.hits.splice(h, 1);
        G.score++; sound('pop'); float(V.kid, '✨'); if (!G.mess.length) gameEnd(G.score * G.per, 'Spotless! Great job.'); else G.draw();
      }, 1300);
    }, Math.atan2(-0.7, -0.3));
  }
  // the grocer: put each thing away, fridge or pantry
  function stackGame(job) {
    const F = V.foods, ids = Object.keys(F).sort(() => Math.random() - 0.5).slice(0, 10), G = V.game = { id: 'grocer', score: 0, per: 6, max: job.pay, end: V.t + 45 }; let i = 0;
    const draw = () => { const f = F[ids[i]]; gamePanel(`<div class="vg-gh"><b>📦 Stack the shelves</b><span class="vg-time"></span><span>${i + 1} / ${ids.length}</span></div><div class="vg-gq">Where do the <b>${f.emoji} ${esc(f.name.toLowerCase())}</b> go?</div><div class="vg-gb"><button data-v="gsel" data-i="0"><span class="e">🧊</span>Fridge</button><button data-v="gsel" data-i="1"><span class="e">🥫</span>Pantry</button></div>`); };
    G.pick = (k, btn) => { const right = (k === 0) === (F[ids[i]].where === 'fridge'); if (right) { G.score++; sound('pop'); } else shake(btn); i++; if (i >= ids.length) return gameEnd(G.score * G.per, `${G.score} of ${ids.length} put away right!`); setTimeout(draw, right ? 0 : 350); };
    draw();
  }

  // ---------- your market stall (phase C): set out things from Mine on a free pitch; villagers walking by stop, look,
  // and buy (a little more than the Market pays, never more than new) while you're near enough to mind it. Pack up
  // any time; anything unsold goes back to Mine (and does anyway when you leave the village).
  function stallPick(s) {
    const sh = V.stage.shop, list = sh.mine(); V.picked = V.picked && V.picked.s === s ? V.picked : { s, sel: [] };
    const sel = V.picked.sel, on = it => sel.some(q => q.t === it.t && q.n === it.n);
    gamePanel(`<div class="vg-gh"><b>🏷️ Your stall</b><span>${sel.length} / 4</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">${list.length ? 'Pick up to four things from Mine to sell. Villagers pay a little more than the Market does.' : 'Mine is empty. Put things away at home first, then sell them here.'}</div>
      <div class="vg-gb vg-mine">${list.slice(0, 24).map((it, i) => `<button data-v="spick" data-i="${i}" class="${on(it) ? 'on' : ''}" ${!on(it) && sel.length >= 4 ? 'disabled' : ''}><img alt="" src="${sh.thumb(it.t)}" width="32" height="32">${esc(it.name)}${it.used ? ' (used)' : ''} · ✨${it.price}${on(it) ? ' ✓' : ''}</button>`).join('')}</div>
      ${sel.length ? '<div class="vg-gb vg-go"><button data-v="sopen"><span class="e">🧺</span>Open my stall</button></div>' : ''}`);
    V.mineList = list;
  }
  function stallOpen() {
    const P = V.picked; if (!P || !P.sel.length) return; const s = P.s, sh = V.stage.shop, recs = [];
    // (taken highest index first within each kind of thing, so the others' indexes stay right)
    for (const it of P.sel.slice().sort((a, b) => a.t === b.t ? b.n - a.n : 0)) { const r = sh.take(it.t, it.n); if (r) recs.push(r); }
    V.picked = null; $('.vg-game', V.ui).hidden = true; if (!recs.length) return;
    V.stall = { s, recs, ...stallModel(s, V.stage.kid.name || 'My', recs), next: V.t + 6, told: false };
    say(V.kid, 'Stall’s open! 🏷️'); toast('Your stall is open. Stay close by to mind it, and villagers (and your brothers and sisters) will come and buy.'); sound('place');
  }
  // a stall's sign and its things on the table (yours, or a brother's or sister's)
  function stallModel(s, who, recs) {
    const T0 = s.table, g = new T.Group(), models = []; g.position.set(T0.x, 0, T0.z); g.rotation.y = T0.face; V.street.root.add(g);
    { const nm = who + '’s stall', tex = IH.kit.painted('vstall:' + nm, 512, 160, (cx, w, h) => { cx.fillStyle = '#fff6e0'; cx.fillRect(0, 0, w, h); cx.strokeStyle = '#ff7aa2'; cx.lineWidth = 10; cx.strokeRect(5, 5, w - 10, h - 10); cx.fillStyle = '#a0446a'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `900 ${h * 0.4}px "Nunito", system-ui, sans-serif`; cx.fillText(nm, w / 2, h * 0.42, w * 0.86); cx.font = `800 ${h * 0.2}px "Nunito", system-ui, sans-serif`; cx.fillText('everything ✨ XP', w / 2, h * 0.76); });
      const sg = new T.Mesh(new T.PlaneGeometry(2.6, 0.82), LK.animeMat({ map: tex })); sg.position.set(0, 0.85, 1.07); g.add(sg); }
    recs.forEach((r, i) => { const d = IH.items.BY[r.t]; try { const m = IH.items.make(d, { fin: r.fin, w: 2, h: 2.1, wy: 1.45 }).group, sc = Math.min(0.55, 1.1 / Math.max(...d.fp)); m.scale.setScalar(sc); m.position.set(-1.45 + i * 0.97 - d.fp[0] * sc / 2, 1.72, 0.1 - d.fp[1] * sc / 2); g.add(m); models.push(m); } catch (e) { models.push(null); } });
    return { g, models };
  }
  function stallTick() {
    const S = V.stall; if (!S || V.B !== V.street) return; const k = V.kid, near = Math.hypot(k.pos.x - S.s.at[0], k.pos.z - S.s.at[1]) < 8;
    if (!near) { if (!S.told && V.t > S.next) { S.told = true; toast('Your stall needs minding: go back to it to sell.'); } return; }
    S.told = false; if (S.buyer && V.t > S.giveUp && S.buyer.path.length) { const b = S.buyer; S.buyer = null; b.path = []; b.then = null; b.until = 0; S.next = V.t + 3; } // (couldn't get there: someone else comes)
    if (S.buyer || V.t < S.next || !S.recs.length) return;
    const pool = V.npc.filter(n => !n.keeper && !n.seat && !n.hi), n = pool[Math.floor(Math.random() * pool.length)]; if (!n) return;
    // somewhere along the stall's front with room (never where the kid or anyone else is standing)
    const T0 = S.s.table, c = Math.cos(T0.face), sn = Math.sin(T0.face), spots = [-1.5, -0.5, 0.5, 1.5].map(u => [T0.x + u * c + 2.4 * sn, T0.z - u * sn + 2.4 * c]).filter(p => V.grid.free(p[0], p[1]) && V.people.every(o => o === n || Math.hypot(o.pos.x - p[0], o.pos.z - p[1]) > 1.1));
    if (!spots.length) { S.next = V.t + 3; return; }
    const spot = spots[Math.floor(Math.random() * spots.length)];
    S.buyer = n; n.until = 1e9; S.giveUp = V.t + 15;
    go(n, spot, ok => {
      if (!V || V.stall !== S) { n.until = 0; return; } if (!ok) { S.buyer = null; n.until = 0; S.next = V.t + 4; return; }
      n.lookYaw = S.s.yaw; n.pose = 'look';
      setTimeout(() => {
        if (!V || V.stall !== S || !S.recs.length) { n.until = 0; n.pose = null; if (V && V.stall === S) S.buyer = null; return; }
        if (Math.random() < 0.75) {
          const i = Math.floor(Math.random() * S.recs.length), r = S.recs.splice(i, 1)[0], m = S.models.splice(i, 1)[0]; if (m) S.g.remove(m);
          V.stage.shop.sold(r); xp(); say(n, 'I’ll take it! 😊'); float(n, '✨'); sound('buy'); toast(`Sold the ${IH.items.BY[r.t].name.toLowerCase()} for ✨ ${r.price} XP!`);
          if (!S.recs.length) setTimeout(() => { if (V && V.stall === S) { stallClose(true); toast('Sold out! Your stall’s packed away.'); } }, 1500);
        } else say(n, 'Just looking, thanks!');
        n.pose = null; n.until = V.t + 1; S.buyer = null; S.next = V.t + 10 + Math.random() * 14;
      }, 2200);
    });
  }
  function stallClose(quiet) {
    const S = V.stall; if (!S) return; V.stall = null; for (const r of S.recs) V.stage.shop.give(r); V.street.root.remove(S.g);
    if (S.buyer) { S.buyer.until = 0; S.buyer.pose = null; }
    if (!quiet && S.recs.length) toast(`Packed up. ${S.recs.length === 1 ? 'One thing went' : S.recs.length + ' things went'} back to Mine.`);
  }

  // ---------- the view
  const CAM = { yaw: Math.PI / 4, pitch: 0.56, zoom: 1, target: new T.Vector3(), fitV: 26, turn: null, view: 0 };
  const ZMIN = 0.55, ZMAX = 4.5;
  function aim() {
    const cam = V.S.cam, t = CAM.target, y = CAM.yaw, p = CAM.pitch, [w, h] = V.stage.dims();
    cam.position.set(t.x + Math.sin(y) * Math.cos(p) * 120, t.y + Math.sin(p) * 120, t.z + Math.cos(y) * Math.cos(p) * 120); cam.lookAt(t);
    const v = CAM.fitV, a = w / h; cam.left = -v * a / 2; cam.right = v * a / 2; cam.top = v / 2; cam.bottom = -v / 2; cam.zoom = CAM.zoom; cam.updateProjectionMatrix();
  }
  // the sun as at home (from the front, a little left, no higher than 29°), turned with the view, its shadows round what's in view
  function light() {
    const P = LK.PHASES[V.phase], s = V.S.sun, rot = CAM.yaw - Math.PI / 4, L0 = Math.hypot(...P.sun), el = Math.min(Math.asin(P.sun[1] / L0), 0.5), y = L0 * Math.sin(el), hz = L0 * Math.cos(el), x = -0.25 * hz, z = 0.97 * hz;
    const dx = x * Math.cos(rot) + z * Math.sin(rot), dz = -x * Math.sin(rot) + z * Math.cos(rot), c = CAM.target, rad = clamp(CAM.fitV / CAM.zoom * 0.95, 14, 40);
    s.target.position.set(c.x, 0, c.z); s.position.set(c.x + dx * 40, y * 40, c.z + dz * 40); s.target.updateMatrixWorld();
    Object.assign(s.shadow.camera, { left: -rad, right: rad, top: rad, bottom: -rad, near: 1, far: 160 }); s.shadow.camera.updateProjectionMatrix();
    V.stage.pipe.u.uSun.value.set(...P.sunAt);
  }
  function setZoom(z) { CAM.zoom = clamp(z, ZMIN, ZMAX); const el = $('.ih-zoomv', V.ui); if (el) el.style.setProperty('--z', ((CAM.zoom - ZMIN) / (ZMAX - ZMIN)).toFixed(3)); }
  function turnView(d) { if (CAM.turn) return; CAM.view = (CAM.view + d + 4) % 4; CAM.turn = { a: CAM.yaw, b: CAM.yaw + d * Math.PI / 2, t0: V.t }; sound('turn'); }
  // a shop that would hide the kid is cut down to its footprint (the view through to the street, as the homes' walls)
  const RAY = new T.Ray();
  function cutaway() {
    const k = V.kid.pos, dir = new T.Vector3(Math.sin(CAM.yaw) * Math.cos(CAM.pitch), Math.sin(CAM.pitch), Math.cos(CAM.yaw) * Math.cos(CAM.pitch));
    for (const b of V.B.buildings) { let hide = false; for (const h of [0.4, 1.4, 2.4]) { RAY.set(new T.Vector3(k.x, h, k.z), dir); if (RAY.intersectsBox(b.box)) { hide = true; break; } } b.full.visible = !hide; b.stub.visible = hide; }
  }

  // ---------- each frame
  function frame(now) {
    V.raf = 0; if (!V || V.closing === 2) return; V.raf = requestAnimationFrame(frame);
    const tt = now / 1000, dt = V.lastT == null ? 0 : clamp(tt - V.lastT, 0, 0.1); V.lastT = tt; V.t = tt;
    const b = V.beat.beat(now);
    if (b !== null) {
      const bt = b, sdt = V.sceneT == null ? 0 : clamp(bt - V.sceneT, 0, 0.25); V.sceneT = bt;
      kidTick(bt, sdt); villagersTick(bt, sdt); sibsTick(bt, sdt); islandTick(bt, sdt); petsTick(bt); mowTick(); gameTick(); stallTick(); cutaway(); if ((V.xpT = (V.xpT || 0) + sdt) > 1) { V.xpT = 0; xp(); }
    }
    if (CAM.turn) { const p = clamp((tt - CAM.turn.t0) / 0.6, 0, 1); CAM.yaw = CAM.turn.a + (CAM.turn.b - CAM.turn.a) * ease(p); if (p >= 1) CAM.turn = null; }
    if (V.intro) { const p = clamp((tt - V.intro.t0) / 1.6, 0, 1); CAM.zoom = V.intro.a + (V.intro.b - V.intro.a) * ease(p); if (p >= 1) { V.intro = null; setZoom(CAM.zoom); } }
    if (V.follow) { const k = V.kid.pos; CAM.target.x += (k.x - CAM.target.x) * Math.min(1, dt * 3); CAM.target.z += (k.z - CAM.target.z) * Math.min(1, dt * 3); CAM.target.y += (1 + k.y - CAM.target.y) * Math.min(1, dt * 3); }
    LK.WATER_U.uT.value = tt; V.stage.pipe.u.uT.value = tt; if (V.lawn && V.B === V.street) IH.lawnKit.tick(V.lawn, tt, CAM.zoom);
    light(); aim();
    V.stage.pipe.render(V.S.sc, V.S.cam);
    bubbles(); tags();
  }

  // ---------- taps and gestures
  const ptrs = new Map(); let gest = null;
  const ndc = new T.Vector2(), ray = new T.Raycaster();
  function rayAt(x, y) { const r = V.stage.cv.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, V.S.cam); return ray; }
  function screenOf(v) { const p = v.clone().project(V.S.cam), r = V.stage.cv.getBoundingClientRect(); return [(p.x + 1) / 2 * r.width, (1 - p.y) / 2 * r.height]; }
  function down(e) { try { V.stage.cv.setPointerCapture(e.pointerId); } catch (err) { /* (a made-up pointer) */ } sound(); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }); if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; gest = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), z0: CAM.zoom, moved: 99 }; } else gest = { moved: 0 }; }
  function move(e) {
    const p = ptrs.get(e.pointerId); if (!p || !gest) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; gest.moved += Math.abs(dx) + Math.abs(dy);
    if (gest.pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; setZoom(gest.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gest.d0); return; }
    if (gest.moved > 6) { // drag: look around (the view stops following the kid until they walk again)
      V.follow = false; const [, h] = V.stage.dims(), s = CAM.fitV / CAM.zoom / h, r = new T.Vector3(Math.cos(CAM.yaw), 0, -Math.sin(CAM.yaw)), f = new T.Vector3(-Math.sin(CAM.yaw), 0, -Math.cos(CAM.yaw));
      CAM.target.addScaledVector(r, -dx * s).addScaledVector(f, dy * s / Math.sin(CAM.pitch)); CAM.target.x = clamp(CAM.target.x, 0, V.B.bounds.x1); CAM.target.z = clamp(CAM.target.z, 0, V.B.bounds.z1);
    }
  }
  function up(e) { const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!gest || ptrs.size) return; const g = gest; gest = null; if (g.pinch || g.moved > 10 || !p) return; tap(p.x0, p.y0); }
  function wheel(e) { e.preventDefault(); setZoom(CAM.zoom * Math.exp(-e.deltaY * 0.0015)); }
  function tap(x, y) {
    hideActs(); if (V.leaving) return;
    if (V.plan && FARM) { const p = new T.Vector3(); if (rayAt(x, y).ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) FARM.tap(p.x, p.z); return; }
    // a villager (on screen, near the tap), or a place: of everything the tap's ray goes through, the one whose
    // middle is nearest the finger (things side by side on a counter); whichever's nearer the finger wins
    const r = V.stage.cv.getBoundingClientRect(); let who = null, wd = 46;
    for (const n of V.npc) { const [sx, sy] = screenOf(n.pos.clone().setY(n.pos.y + 1.1)), d = Math.hypot(sx + r.left - x, sy + r.top - y); if (d < wd) { wd = d; who = n; } }
    for (const S of (V.sibs ? V.sibs.values() : [])) if (S.p) { const [sx, sy] = screenOf(S.p.pos.clone().setY(S.p.pos.y + 1.1)), d = Math.hypot(sx + r.left - x, sy + r.top - y); if (d < wd + 8) return showActs({ kind: 'sib', name: S.info.name + ' ' + S.info.avatar, S }, x, y); }
    const hits = rayAt(x, y).intersectObjects(V.hits, false); let s = null, sd = 1e9;
    for (const h of hits) { const o = h.object, [sx, sy] = screenOf(o.position), d = Math.hypot(sx + r.left - x, sy + r.top - y); if (d < sd && ACTS[o.userData.spot.kind] && ACTS[o.userData.spot.kind](o.userData.spot).length) { sd = d; s = o.userData.spot; } }
    if (who && (!s || wd < sd)) {
      if (who === V.keeper && V.B !== V.street) { const c = V.B.spots.find(q => q.kind === 'counter'); return showActs(c, x, y); }
      { who.hi = { until: V.t + 2.2 }; say(who, who.keeper ? (who.keeper.what === 'veg' ? 'Fresh veggies! 🥕' : 'Pretty flowers! 🌷') : HELLO[Math.floor(Math.random() * HELLO.length)]); const k = V.kid; if (!k.path.length && !k.seat) k.face = Math.atan2(who.pos.x - k.pos.x, who.pos.z - k.pos.z); sound('pat'); return; }
    }
    if (s && s.kind === 'mess') return sweep(s);
    if (s) return showActs(s, x, y);
    if (V.mow) { mowEnd(false); return; } // (tapping away from the shed while mowing: stop, and be paid for what's cut)
    // the ground
    const p = new T.Vector3(); if (!rayAt(x, y).ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) return;
    if (p.x < 0 || p.z < 0 || p.x > V.B.bounds.x1 || p.z > V.B.bounds.z1) return;
    walkTo(p.x, p.z);
  }
  function showActs(s, x, y) {
    const el = $('.ih-acts', V.ui), r = V.ui.getBoundingClientRect(), list = ACTS[s.kind](s); V.acts = list;
    const sa = s.kind === 'stall' && sibAt(s), nm = sa ? `${sa.info.name}’s stall` : s.name;
    el.innerHTML = `<b>${esc(nm[0].toUpperCase() + nm.slice(1))}</b><small>What should ${esc(V.stage.kid.name || 'you')} do?</small>${list.map((a, i) => `<button data-v="act" data-i="${i}"><span>${a.e}</span>${esc(a.label)}</button>`).join('')}`;
    el.hidden = false; const w = el.offsetWidth, h = el.offsetHeight;
    el.style.left = clamp(x - r.left - w / 2, 8, r.width - w - 8) + 'px'; el.style.top = clamp(y - r.top - h - 16, 60, r.height - h - 90) + 'px'; sound('pop');
  }
  function hideActs() { const el = V && $('.ih-acts', V.ui); if (el) el.hidden = true; }

  // ---------- words over heads
  function say(p, s) { V.says.push({ p, s, until: V.t + 2.4, el: null }); }
  function float(p, s) { const [x, y] = screenOf(p.pos.clone().setY(p.pos.y + 2.5)), f = document.createElement('div'); f.className = 'ih-float'; f.textContent = s; f.style.left = x + 'px'; f.style.top = y + 'px'; V.ui.appendChild(f); setTimeout(() => f.remove(), 1200); }
  function bubbles() {
    for (let i = V.says.length - 1; i >= 0; i--) {
      const b = V.says[i];
      if (V.t > b.until) { if (b.el) b.el.remove(); V.says.splice(i, 1); continue; }
      if (!b.el) { b.el = document.createElement('div'); b.el.className = 'vg-say'; b.el.textContent = b.s; V.ui.appendChild(b.el); }
      const [x, y] = screenOf(b.p.pos.clone().setY(b.p.pos.y + 2.6)); b.el.style.left = x + 'px'; b.el.style.top = y + 'px';
    }
  }
  let toastT = 0;
  function toast(s) { const el = V && $('.ih-toast', V.ui); if (!el) return; el.textContent = s; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3200); }
  const sound = k => { if (V && V.stage.sound) V.stage.sound(k); };

  // ---------- open and close
  function open(stage) {
    if (V) return false;
    const where = stage.where || 'village', sh0 = stage.shop, B = where === 'village' ? IH.villageBuild.build() : IH.islandsBuild && IH.islandsBuild.build(where, !sh0 ? null : where === 'farm' ? sh0.farm() : sh0.isl ? sh0.isl(where) : null); if (!B) return false;
    const S = scene(B);
    V = { fx: [], emit: [], where, stage, B, street: B, shops: {}, foods: IH.kitchen ? IH.kitchen.FOOD : {}, S, grid: makeGrid(B), people: [], npc: [], says: [], t: 0, lastT: null, sceneT: null, beat: LK.Beat(), phase: stage.phase || 'day', follow: true, raf: 0 };
    V.beat.mode = stage.frames || 'ones';
    V.hits = []; B.root.traverse(o => { if (o.userData.spot) V.hits.push(o); });
    for (const l of B.lits) l.visible = V.phase !== 'day';
    // the kid comes in through the village's gate
    V.kid = person(stage.kid.avatar || '🦊', stage.kid.hue, B.arrive[0], B.arrive[1] + (where === 'village' ? 1.4 : -1.2), where === 'village' ? Math.PI : 0); V.people.push(V.kid);
    V.kid.inst.group.traverse(m => { if (m.isMesh) m.castShadow = true; });
    go(V.kid, B.arrive);
    // villagers, and the two stall-keepers
    const used = new Set([stage.kid.avatar]);
    const pick = i => { let a = AVATARS[(i * 5 + 2) % AVATARS.length]; for (let k = 0; used.has(a) && k < AVATARS.length; k++) a = AVATARS[(i * 5 + 2 + k + 1) % AVATARS.length]; used.add(a); if (used.size >= AVATARS.length) used.clear(); return a; };
    let i = 0;
    for (const s of B.spots.filter(q => q.keeper)) { const n = person(pick(i), HUES[i % HUES.length], s.keeper[0], s.keeper[1], s.yaw + Math.PI); n.keeper = { yaw: s.yaw + Math.PI, what: /veg/.test(s.name) ? 'veg' : 'flowers' }; V.npc.push(n); V.people.push(n); i++; }
    for (let j = 0; j < (B.npc != null ? B.npc : 9); j++, i++) {
      const bb = B.bounds; let at = null; for (let k = 0; k < 40 && !at; k++) { const x = where === 'village' ? 6 + Math.random() * 72 : bb.x0 + 3 + Math.random() * (bb.x1 - bb.x0 - 6), z = where === 'village' ? 16 + Math.random() * 42 : bb.z0 + 3 + Math.random() * (bb.z1 - bb.z0 - 6); if (V.grid.free(x, z) && V.people.every(o => Math.hypot(o.pos.x - x, o.pos.z - z) > 2)) at = [x, z]; }
      if (!at) continue; const n = person(pick(i), HUES[i % HUES.length], at[0], at[1], Math.random() * 6.28); n.sp = 1.0 + Math.random() * 0.35; n.until = Math.random() * 3; V.npc.push(n); V.people.push(n);
    }
    V.streetNpc = V.npc; V.lawn = makeLawn(B); V.spin = []; B.root.traverse(o => { if (o.userData.spin) V.spin.push(o); });
    // where the kid's going: a little ring on the ground
    { const k = new IH.kit.Kit(); k.torus(0.42, 0.05, 0, 0, 0, '#ffffff', { rx: Math.PI / 2 }); k.torus(0.22, 0.04, 0, 0, 0, '#ffd35a', { rx: Math.PI / 2 }); V.mark = k.build({ shadow: false }); V.mark.traverse(m => { m.userData.bg = true; }); V.mark.visible = false; S.sc.add(V.mark); }
    // the controls (the home's look)
    const ic = stage.ic || (() => '');
    V.ui = document.createElement('div'); V.ui.className = 'vg';
    V.ui.innerHTML = `
      <div class="ih-top"><button class="ih-pill ih-homebtn" data-v="home">${ic('home')}<span><b class="vg-name">${esc(B.title || 'Hoshi Street')}</b><small class="vg-sub">${esc(B.sub || 'Village · tap for home')}</small></span></button><button class="ih-btn vg-ph" data-v="phone" aria-label="Phone">📱</button><button class="ih-pill vg-fam" data-v="fam" aria-label="Family">👪<b class="vg-famn"></b></button><div class="ih-sp"></div>${stage.shop ? `<div class="ih-pill ih-xp vg-xp" aria-label="XP to spend">${ic('sparkle')}<b class="vg-xpn">0</b><small>XP</small></div>` : ''}</div>
      <div class="ih-side">
        <button class="ih-btn" data-v="zin" aria-label="Zoom in">${ic('plus')}</button><div class="ih-zoomv" aria-hidden="true"><i></i></div>
        <button class="ih-btn" data-v="zout" aria-label="Zoom out">${ic('minus')}</button><span class="ih-gap"></span>
        <button class="ih-btn" data-v="turnL" aria-label="Turn the view left">${ic('left')}</button><button class="ih-btn" data-v="turnR" aria-label="Turn the view right">${ic('right')}</button>
      </div>
      <button class="vg-chat" data-v="chat" aria-label="Say something">💬</button><div class="vg-emo" hidden></div>
      <div class="ih-acts" role="menu" hidden></div><div class="vg-game" hidden></div><div class="ih-toast" role="status" aria-live="polite"></div><div class="vg-fade on"></div>`;
    V.ui.addEventListener('click', e => {
      const b = e.target.closest('[data-v]'); if (!b) return; e.preventDefault(); const a = b.dataset.v;
      if (a === 'home') return homeAsk();
      if (a === 'chat') { const el = $('.vg-emo', V.ui); el.hidden = !el.hidden; if (!el.hidden) emoPanel(); sound('pop'); return; }
      if (a === 'emo') { $('.vg-emo', V.ui).hidden = true; return b.dataset.k === 'act' ? act(+b.dataset.i) : speak(b.dataset.k, +b.dataset.i); }
      if (a === 'fam') return famPanel();
      if (a === 'phone') { if (V.stage.phone) V.stage.phone('home'); return; }
      if (a === 'reel') return reel();
      if (a === 'isl' && ISL && ISL.click) return ISL.click(b.dataset.k, b);
      if (a === 'farm' && FARM) return FARM.click(b.dataset.k, b);
      if (a === 'fbuy') return farmBuy(b.dataset.k);
      if (a === 'fcode') { const inp = $('.vg-fcode', V.ui); const c = NET().setCode(inp ? inp.value : ''); toast(c ? 'Family code saved on this device.' : 'Family code cleared.'); return setTimeout(famPanel, 400); }
      if (/^tr/.test(a)) return tradeUi(a, b);
      if (a === 'zin') return setZoom(CAM.zoom * 1.3); if (a === 'zout') return setZoom(CAM.zoom / 1.3);
      if (a === 'turnL') return turnView(-1); if (a === 'turnR') return turnView(1);
      if (a === 'gsel') { if (V.game && V.game.pick) V.game.pick(+b.dataset.i, b); return; }
      if (a === 'spick') { const it = V.mineList && V.mineList[+b.dataset.i], P = V.picked; if (!it || !P) return; const i = P.sel.findIndex(q => q.t === it.t && q.n === it.n); if (i >= 0) P.sel.splice(i, 1); else if (P.sel.length < 4) P.sel.push(it); sound('tap'); return stallPick(P.s); }
      if (a === 'sopen') return stallOpen();
      if (a === 'gclose') { $('.vg-game', V.ui).hidden = true; V.picked = null; if (V.fishing) fishEnd(false, 'You packed up your rod.'); if (V.trade) { NET().send({ t: 'no', id: V.trade.id }, true); V.trade = null; } return; }
      if (a === 'act') { const f = V.acts && V.acts[+b.dataset.i]; hideActs(); if (f) { sound('tap'); f.run(); } }
    });
    stage.root.appendChild(V.ui); netStart(); if (ISL && ISL.prep) ISL.prep(); if (FARM && FARM.prep) FARM.prep();
    const cv = stage.cv; cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('wheel', wheel, { passive: false });
    addEventListener('keydown', key);
    LK.PAL.uHouse.value.set(0, 0, 0, 0); LK.CUT_U.uCutOn.value = 0;
    CAM.yaw = Math.PI / 4; CAM.view = 0; CAM.target.set(B.arrive[0], 1, B.arrive[1]); V.intro = { a: 0.75, b: 1.7, t0: performance.now() / 1000 }; CAM.zoom = 0.75;
    requestAnimationFrame(() => { const f = $('.vg-fade', V.ui); if (f) f.classList.remove('on'); });
    V.welcome = setTimeout(() => toast(where === 'village' ? 'Welcome to Hoshi Street! Tap anywhere to walk, or tap a place.' : `Welcome to the ${B.title.toLowerCase()}! ${B.welcome || (B.kind === 'utility' ? 'Make things here to cook with or sell in the village.' : 'Tap a place to see what there is to do.')}`), 900);
    if (stage.keep) { const K0 = stage.keep; CAM.target.copy(K0.target); CAM.zoom = K0.zoom; CAM.yaw = K0.yaw; CAM.view = K0.view; V.intro = null; V.follow = false; V.kid.path = []; V.kid.pos.set(K0.kid[0], 0, K0.kid[1]); V.kid.yaw = K0.kid[2]; setZoom(K0.zoom); $('.vg-fade', V.ui).classList.remove('on'); clearTimeout(V.welcome); } // (rebuilt in place: no arrival)
    V.raf = requestAnimationFrame(frame);
    return true;
  }
  function key(e) {
    if (!V || /INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) return;
    if (e.key === 'ArrowLeft') turnView(-1); else if (e.key === 'ArrowRight') turnView(1); else if (e.key === '+' || e.key === '=') setZoom(CAM.zoom * 1.3); else if (e.key === '-') setZoom(CAM.zoom / 1.3);
    else if (e.key === 'Escape') hideActs();
  }
  // back home: to the gate (if not there already), through it, and the home again
  function homeAsk() { const s = V.B.spots.find(q => q.kind === 'home') || V.B.spots.find(q => q.kind === 'exit') || V.B.spots.find(q => q.kind === 'travel'); showActs(s, innerWidth / 2, 160); }
  function leave() {
    if (!V || V.leaving) return; V.leaving = true; sound('move');
    const f = $('.vg-fade', V.ui); if (f) f.classList.add('on');
    setTimeout(() => close(), 650);
  }
  function close(on) {
    if (!V) return; netStop(); if (V.stall) stallClose(true); if (V.game) gameEnd(V.game.score * V.game.per, 'Shift over!'); if (V.mow) mowEnd(false); const v = V; V.closing = 2; if (v.raf) cancelAnimationFrame(v.raf);
    const cv = v.stage.cv; cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); cv.removeEventListener('wheel', wheel);
    removeEventListener('keydown', key); ptrs.clear(); gest = null;
    v.S.sc.traverse(m => { if (m.isMesh && m.userData.main) m.geometry.dispose(); }); // (only the merged models: the kit's own pieces are shared with the home)
    v.ui.remove(); V = null;
    if (on) { open(Object.assign({}, v.stage, { where: on })); return; }
    if (v.stage.onHome) v.stage.onHome();
  }
  function reload() { if (!V) return; const keep = { target: CAM.target.clone(), zoom: CAM.zoom, yaw: CAM.yaw, view: CAM.view, kid: [V.kid.pos.x, V.kid.pos.z, V.kid.yaw] }, v = V; v.stage.keep = keep; close(v.where); if (V) V.stage.keep = null; }
  // straight on to somewhere else (the phone's Travel app): a fade, and the next place
  function goto(where) { if (!V || V.leaving) return; if (where === V.where) return; V.leaving = true; sound('move'); const f = $('.vg-fade', V.ui); if (f) f.classList.add('on'); setTimeout(() => close(where), 650); }
  // ---------- the islands (islands-build.js): what there is to do, the animals, the sea's life
  const DAY = 864e5, today = () => Math.floor(Date.now() / DAY);
  const MAKES = { hen: { n: 1, every: 1, what: 'egg' }, goat: { n: 1, every: 1, what: 'milk' }, cow: { n: 2, every: 1, what: 'milk' }, alpaca: { n: 2, every: 2, what: 'wool' } };
  const FARM_SHOP = [['hen', '🐔', 'Hen', 250, 8, 'Lays an egg a day.'], ['goat', '🐐', 'Goat', 450, 3, 'A bottle of milk a day.'], ['cow', '🐄', 'Cow', 650, 3, 'Two bottles of milk a day.'], ['alpaca', '🦙', 'Alpaca', 700, 3, 'Two bags of wool every two days.']];
  const FRESH_FISH = [['trout', 'Rainbow trout', '🐟'], ['eel', 'Longfin eel', '🐍'], ['whitebait', 'Whitebait', '🐠'], ['koura', 'Kōura (crayfish)', '🦞']];
  const SEA_FISH = [['snapper', 'Snapper', '🐟'], ['kahawai', 'Kahawai', '🐟'], ['bluecod', 'Blue cod', '🐟'], ['flounder', 'Flounder', '🐡'], ['kingfish', 'Kingfish', '🐟']];
  const POOL_FINDS = [['starfish', 'a starfish', '⭐'], ['crab', 'a little crab', '🦀'], ['hermit', 'a hermit crab', '🐚'], ['anemone', 'a sea anemone', '🌺'], ['snail', 'a sea snail', '🐌'], ['cockabully', 'a cockabully', '🐟'], ['shell', 'a pretty shell', '🐚'], ['octopus', 'a tiny octopus', '🐙']];
  function farmReady(kind) {
    const f = V.stage.shop.farm(), m = MAKES[kind], count = (f.animals || {})[kind] || 0; if (!count) return 0;
    const last = f.got[kind] || 0, batches = last ? Math.min(3, Math.floor((Date.now() - last) / (m.every * DAY))) : 1;
    return batches * m.n * count;
  }
  const fedOk = () => (V.stage.shop.farm().fed || 0) >= today() - 1;
  // a little job at a spot: walk there, the pose for a while, then what it gives
  // a job at a spot, done properly: walk there and face it, the tool in hand (o.tool), the pose for the job, its
  // effect while it's done (o.fx: dust pouring feed, drops from the can, wool off the shears...), then what it gives
  function chore(s, pose, secs, done, face, o = {}) {
    walkTo(s.at[0], s.at[1], ok => {
      if (!ok) return; const k = V.kid; k.pose = pose; V.busyJob = true; if (o.tool && k.inst) k.inst.holding = o.tool;
      if (o.fx) V.emit.push({ kind: o.fx, at: o.at || 'front', dist: o.dist, y: o.y, rate: o.rate || 14, from: V.t + (o.delay != null ? o.delay : 0.35), until: V.t + secs - 0.2 });
      setTimeout(() => { if (!V) return; V.busyJob = false; if (k.pose === pose) k.pose = null; if (o.tool && k.inst && k.inst.holding === o.tool) k.inst.holding = null; done(); }, secs * 1000);
    }, face != null ? face : s.yaw);
  }
  // ---------- little effects: puffs and bits that fly, fall, float and fade (no ink; drawn over the scene)
  // kind: [colour, size, rise speed, gravity, life, spread, grow, shape]
  const FXK = { dust: ['#d9c49a', 0.14, 0.6, -0.2, 1.1, 0.5, 2.2], drops: ['#8fd8ff', 0.045, 0.4, 7, 0.7, 0.25, 0], milk: ['#ffffff', 0.04, 0.2, 7, 0.6, 0.12, 0],
    wool: ['#f6efe0', 0.09, 0.8, 0.9, 1.6, 0.6, 0.4], hay: ['#e8c45a', 0.06, 1.6, 4, 1.0, 0.6, 0, [2.2, 0.35, 0.35]], straw: ['#e8d08a', 0.05, 1.2, 4, 0.9, 0.5, 0, [2.2, 0.35, 0.35]],
    soil: ['#7a5a3a', 0.05, 2.0, 7, 0.8, 0.6, 0], sand: ['#e8cf92', 0.045, 2.2, 8, 0.7, 0.6, 0], splash: ['#e8f8ff', 0.06, 3.0, 9, 0.8, 0.9, 0],
    sparkle: ['#fff3a0', 0.05, 0.9, -0.3, 1.0, 0.7, 0], steam: ['#ffffff', 0.18, 0.7, -0.4, 1.8, 0.4, 2.0], smoke: ['#c9c4cc', 0.16, 0.6, -0.3, 1.8, 0.35, 2.4], leaves: ['#5fae4a', 0.07, 0.6, 2.2, 1.4, 0.8, 0, [1.4, 0.3, 1]] };
  const FXG = new T.SphereGeometry(1, 7, 5), FXM = {};
  function fx(kind, x, y, z, n = 6, dir = null) {
    const K = FXK[kind]; if (!K || !V) return; const mat = FXM[kind] || (FXM[kind] = new T.MeshBasicMaterial({ color: K[0], transparent: true, depthWrite: false }));
    for (let i = 0; i < n; i++) {
      if (V.fx.length > 220) { const o = V.fx.shift(); V.S.sc.remove(o.m); }
      const m = new T.Mesh(FXG, mat.clone()); m.layers.set(1); m.userData.bg = true; m.renderOrder = 4; m.position.set(x + (Math.random() - 0.5) * 0.2, y, z + (Math.random() - 0.5) * 0.2);
      const sp = K[5], a = Math.random() * Math.PI * 2, r = Math.random() * sp, base = K[1] * (0.7 + Math.random() * 0.6); if (K[7]) m.scale.set(base * K[7][0], base * K[7][1], base * K[7][2]); else m.scale.setScalar(base); m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      const v = new T.Vector3(Math.cos(a) * r + (dir ? dir[0] : 0), K[2] * (0.6 + Math.random() * 0.8) + (dir ? dir[1] : 0), Math.sin(a) * r + (dir ? dir[2] : 0));
      V.S.sc.add(m); V.fx.push({ m, v, age: 0, life: K[4] * (0.7 + Math.random() * 0.6), K, base });
    }
  }
  const FXV = new T.Vector3();
  function fxTick(dt) {
    if (!V.fx) return;
    // the emitters: each job's effect while it's being done, at the front of the kid, at the hand, or at a place
    for (let i = V.emit.length - 1; i >= 0; i--) {
      const E = V.emit[i], k = V.kid; if (V.t > E.until) { V.emit.splice(i, 1); continue; } if (V.t < E.from) continue;
      E.acc = (E.acc || 0) + dt * E.rate; const n = Math.floor(E.acc); if (!n) continue; E.acc -= n;
      let x, y, z; const f = [Math.sin(k.yaw), Math.cos(k.yaw)];
      if (E.at === 'hand' && k.inst && k.inst.B && k.inst.B['hand.R']) { k.inst.B['hand.R'].getWorldPosition(FXV); x = FXV.x + f[0] * 0.35; y = FXV.y - 0.1; z = FXV.z + f[1] * 0.35; }
      else if (Array.isArray(E.at)) [x, y, z] = E.at; else { const d = E.dist != null ? E.dist : 0.8; x = k.pos.x + f[0] * d; z = k.pos.z + f[1] * d; y = k.pos.y + (E.y != null ? E.y : 0.4); }
      fx(E.kind, x, y, z, n);
    }
    for (let i = V.fx.length - 1; i >= 0; i--) {
      const P = V.fx[i], K = P.K; P.age += dt; const u = P.age / P.life; if (u >= 1) { V.S.sc.remove(P.m); P.m.material.dispose(); V.fx.splice(i, 1); continue; }
      P.v.y -= K[3] * dt; P.m.position.addScaledVector(P.v, dt); const gy = V.grid.ground(P.m.position.x, P.m.position.z); if (P.m.position.y < gy + 0.02 && K[3] > 0) { P.m.position.y = gy + 0.02; P.v.set(P.v.x * 0.3, 0, P.v.z * 0.3); }
      if (K[6]) P.m.scale.setScalar(P.base * (1 + u * K[6])); P.m.rotation.x += dt * 3; P.m.material.opacity = (1 - u) * (K[0] === '#ffffff' || K[6] ? 0.7 : 1);
    }
  }
  function collect(s, kinds, pose, label) {
    const sh = V.stage.shop; if (!fedOk()) return toast('The animals are hungry. Feed them at the trough first.');
    const n = kinds.reduce((a, k) => a + farmReady(k), 0), what = MAKES[kinds[0]].what;
    if (!n) return toast(`Nothing ready yet. ${label} again tomorrow.`);
    chore(s, pose, 2.5, () => { const f = sh.farm(); for (const k of kinds) if (farmReady(k)) f.got[k] = Date.now(); if (what === 'wool') sh.addGoods('wool', n); else sh.addFood(what, n); sh.farmSave(); float(V.kid, { egg: '🥚', milk: '🥛', wool: '🧶' }[what]); sound('buy');
      toast(what === 'wool' ? `${n} bag${n === 1 ? '' : 's'} of wool! It’s on your goods shelf at home: sell it at the grocer.` : `${n} ${what === 'egg' ? (n === 1 ? 'egg' : 'eggs') : (n === 1 ? 'bottle of milk' : 'bottles of milk')} into your fridge at home!`); });
  }
  function farmShop() {
    const sh = V.stage.shop, f = sh.farm();
    gamePanel(`<div class="vg-gh"><b>🐮 Farm shop</b><span>✨ ${Math.round(sh.wallet().left).toLocaleString()}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">More animals for your farm. They live here and make things every day.</div>
      <div class="vg-gb vg-mine">${FARM_SHOP.map(([k, e, name, xp, cap, about]) => { const n = (f.animals || {})[k] || 0; return `<button data-v="fbuy" data-k="${k}" ${n >= cap ? 'disabled' : ''}><span class="e">${e}</span>${name} · ✨ ${xp}<small>&nbsp;${n} / ${cap} · ${about}</small></button>`; }).join('')}</div>`);
  }
  function farmBuy(kind) {
    const sh = V.stage.shop, f = sh.farm(), it = FARM_SHOP.find(q => q[0] === kind); if (!it) return; const n = (f.animals || {})[kind] || 0; if (n >= it[4]) return;
    if (!sh.pay(it[3], 'a ' + it[2].toLowerCase())) return;
    f.animals[kind] = n + 1; if (!f.got[kind]) f.got[kind] = Date.now(); sh.farmSave();
    const a = IH.islandsBuild.MAKE[kind](), pen = V.B.pens[kind]; a.pen = pen; a.group.position.set((pen[0] + pen[2]) / 2, 0, pen[1] + 1); V.B.root.add(a.group); V.B.animals.push(a);
    toast(`Welcome to the farm, ${it[2].toLowerCase()}! ${it[1]}`); xp(); farmShop();
  }
  // fishing off the ledge: cast, wait for a bite, reel it in in time
  function fishStart(s) {
    const sh = V.stage.shop; if (!sh.daily('fish', 3)) return toast('No more bites today. Three casts a day.');
    walkTo(s.at[0], s.at[1], ok => {
      if (!ok) return; V.kid.face = s.yaw; V.kid.pose = 'water'; V.rodOn = true; sound('pop');
      const F = V.fishing = { t0: V.t, bite: V.t + 2 + Math.random() * 3.5, phase: 'wait', water: s.water || 'sea' };
      gamePanel(`<div class="vg-gh"><b>🎣 Fishing</b><span>${sh.dailyLeft('fish', 3)} casts left today</span></div><div class="vg-gq vg-fq">Waiting for a bite… 🌊</div><div class="vg-gb vg-go"><button data-v="reel"><span class="e">🎣</span>Reel in!</button></div>`);
      void F;
    });
  }
  function fishTick() {
    const F = V.fishing; if (!F) return; const q = $('.vg-fq', V.ui);
    if (F.phase === 'wait' && V.t > F.bite) { F.phase = 'bite'; F.until = V.t + 1.6; if (q) q.textContent = '❗ A bite! Reel it in, quick!'; sound('tune'); }
    else if (F.phase === 'bite' && V.t > F.until) fishEnd(false, 'It got away! 🐟💨');
  }
  function reel() {
    const F = V.fishing; if (!F) return;
    if (F.phase !== 'bite') return fishEnd(false, 'Too soon! The fish swam off.');
    const L = F.water === 'fresh' ? FRESH_FISH : SEA_FISH, [k, name, e] = L[Math.floor(Math.random() * L.length)], sh = V.stage.shop, b = sh.book('fish', k);
    sh.addFood('fish'); if (b.isNew) sh.xp(10); xp(); float(V.kid, e); sound('buy'); { const k = V.kid, f0 = [Math.sin(k.yaw), Math.cos(k.yaw)]; fx('splash', k.pos.x + f0[0] * 3, Math.max(0, V.grid.ground(k.pos.x + f0[0] * 3, k.pos.z + f0[1] * 3)) + 0.05, k.pos.z + f0[1] * 3, 20); }
    fishEnd(true, `You caught a ${name.toLowerCase()}! ${e} It’s in your fridge at home.${b.isNew ? ` New in your fish book (${b.count} / 9): ✨ +10 XP.` : ''}`);
  }
  function fishEnd(ok, words) { V.fishing = null; V.rodOn = false; if (V.kid.pose === 'water') V.kid.pose = null; $('.vg-game', V.ui).hidden = true; toast(words); if (!ok) sound('pat'); }
  function rodTick() {
    if (!V.rodOn) { if (V.rod) V.rod.visible = false; return; }
    if (!V.rod) { const k = new IH.kit.Kit(); k.cyl(0.03, 3.2, 0, 0, 0, '#5a3a24', { n: 5 }); k.cyl(0.05, 0.5, 0, 0, 0, '#2a2630', { n: 6 }); k.cyl(0.006, 2.4, 0, 0.8, 1.6, '#ffffff', { n: 3, rx: 2.4 }); V.rod = k.build({ shadow: false }); V.S.sc.add(V.rod); }
    const k = V.kid, hand = k.inst.B && k.inst.B['hand.R'], p = hand ? hand.getWorldPosition(new T.Vector3()) : k.pos.clone().setY(k.pos.y + 0.9);
    V.rod.visible = true; V.rod.position.copy(p); V.rod.rotation.set(0, k.yaw, 0); V.rod.rotateX(1.0 + Math.sin(V.t * (V.fishing && V.fishing.phase === 'bite' ? 18 : 1.5)) * 0.04);
  }
  const ISLAND_ACTS = {
    travel: s => [{ e: '🏠', label: 'Go home', run: () => walkTo(s.at[0], s.at[1], ok => ok && leave(), s.yaw) }, { e: '📱', label: 'Travel somewhere else', run: () => V.stage.phone && V.stage.phone('travel') }],
    kiosk: s => [{ e: '🍦', label: 'An ice cream · ✨ 15', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok && V.stage.shop.treat('Ice cream', 15, { food: 12, fun: 16 })) { float(V.kid, '🍦'); xp(); toast('Hokey pokey ice cream! 🍦'); } }, s.yaw) },
      { e: '🥤', label: 'A cold drink · ✨ 10', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok && V.stage.shop.treat('Cold drink', 10, { food: 6, energy: 8 })) { float(V.kid, '🥤'); xp(); } }, s.yaw) },
      ...(V.stage.shop.hasTool('rod') ? [] : [{ e: '🎣', label: 'A fishing rod · ✨ 500', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok && V.stage.shop.pay(500, 'a fishing rod')) { V.stage.shop.giveTool('rod'); xp(); toast('A fishing rod! Cast a line off the rocky point. 🎣'); } }, s.yaw) }])],
    towel: s => [{ e: '🏖️', label: 'Lie in the sun', run: () => walkTo(s.at[0], s.at[1], ok => { if (ok) { V.kid.pose = 'sit'; V.stage.shop.relax({ energy: 10, fun: 6 }); float(V.kid, '😎'); } }, s.yaw) }],
    log: s => [{ e: '🪑', label: 'Sit down', run: () => { if (V.people.some(o => o !== V.kid && o.seatAt === s)) return toast('Someone’s sitting there.'); V.kid.seatAt = s; walkTo(s.at[0], s.at[1], ok => { if (ok && V.kid.seatAt === s) sit(V.kid, s); }); } }],
    castle: s => [{ e: '🏰', label: V.castle ? 'Add to the sandcastle' : 'Build a sandcastle', run: () => chore(s, 'toys', 4, () => { castle(s); V.stage.shop.relax({ fun: 15 }); float(V.kid, '🏰'); sound('tune'); }, null, { fx: 'sand', y: 0.2, dist: 0.7 }) }],
    swim: s => [{ e: '🏊', label: 'Go for a swim', run: () => walkTo(s.swimTo[0], s.swimTo[1], ok => { if (ok) { V.stage.shop.relax({ fun: 14, clean: 10 }); float(V.kid, '💦'); sound('tune'); const k = V.kid; fx('splash', k.pos.x, k.pos.y + 0.6, k.pos.z, 18); V.emit.push({ kind: 'splash', at: 'front', dist: 0.3, y: 0.7, rate: 6, from: V.t, until: V.t + 6 }); } }) }],
    rockpool: s => [{ e: '🔎', label: 'Look in the rock pool', run: () => { if (!V.stage.shop.daily('pool', 8)) return toast('The rock pools are quiet now. Come back tomorrow.'); chore(s, 'scan', 3, () => { const [k, name, e] = POOL_FINDS[Math.floor(Math.random() * POOL_FINDS.length)], b = V.stage.shop.book('beach', k); if (b.isNew) V.stage.shop.xp(10); xp(); float(V.kid, e); sound('pop'); toast(`You found ${name}! ${e}${b.isNew ? ` New in your beach book (${b.count} / ${POOL_FINDS.length}): ✨ +10 XP.` : ''}`); }, null, { fx: 'splash', dist: 1.6, y: 0.1, rate: 5 }); } }],
    fish: s => V.stage.shop.hasTool('rod') ? [{ e: '🎣', label: `Cast a line · ${V.stage.shop.dailyLeft('fish', 3)} left today`, run: () => fishStart(s) }] : [{ e: '🎣', label: 'You need a fishing rod (Surf & Scoops)', run: () => toast('Surf & Scoops, up by the boardwalk, sells fishing rods.') }],
    barn: () => [{ e: '🐮', label: 'The farm shop', run: () => farmShop() }],
    trough: s => [{ e: '🌾', label: fedOk() && (V.stage.shop.farm().fed || 0) === today() ? 'Fed today ✓' : 'Feed the animals', run: () => { const f = V.stage.shop.farm(); if (f.fed === today()) return toast('They’re full. Feed them again tomorrow.'); chore(s, 'feed', 2.5, () => { f.fed = today(); V.stage.shop.farmSave(); V.stage.shop.relax({ fun: 5 }); for (const a of V.B.animals) float({ pos: a.group.position }, '❤️'); sound('tune'); toast('The animals are fed! Now they’ll make eggs, milk and wool.'); }); } }],
    coop: s => [{ e: '🥚', label: `Collect eggs · ${fedOk() ? farmReady('hen') + ' ready' : 'feed them first'}`, run: () => collect(s, ['hen'], 'fetch', 'Collect') }],
    milk: s => [{ e: '🥛', label: `Milk the goats and cows · ${fedOk() ? farmReady('goat') + farmReady('cow') + ' ready' : 'feed them first'}`, run: () => collect(s, ['goat', 'cow'], 'wash', 'Milk them') }],
    shear: s => [{ e: '🧶', label: `Shear the alpacas · ${fedOk() ? farmReady('alpaca') + ' ready' : 'feed them first'}`, run: () => collect(s, ['alpaca'], 'sweep', 'Shear them') }]
  };
  Object.assign(ACTS, ISLAND_ACTS);
  // more islands' doings (village-islands.js), with what they need from here
  const CTX = { get V() { return V; }, walkTo, chore, toast, float, say, sound, xp, gamePanel, ride, sit, stand, fishStart, fx, DAY, today };
  const ISL = IH.villageIslands ? IH.villageIslands(CTX) : null, FARM = IH.villageFarm ? IH.villageFarm(CTX) : null;
  if (ISL) Object.assign(ACTS, ISL.acts); if (FARM) Object.assign(ACTS, FARM.acts);
  // a sandcastle that grows each time it's added to
  function castle(s) {
    const lvl = (V.castle ? V.castle.lvl : 0) + 1; if (V.castle) V.B.root.remove(V.castle.g);
    const k = new IH.kit.Kit(), y = V.grid.ground(s.hit[0], s.hit[1]), c = '#e8cf92';
    k.cyl(0.9, 0.35, 0, 0, 0, c, { n: 12 }); if (lvl > 1) k.cyl(0.6, 0.4, 0, 0.35, 0, c, { n: 10 }); if (lvl > 2) for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) { k.cyl(0.22, 0.7, x, 0, z, c, { n: 8 }); k.cone(0.22, 0.25, x, 0.7, z, c, { n: 8 }); }
    if (lvl > 3) { k.cyl(0.3, 0.6, 0, 0.75, 0, c, { n: 8 }); k.cyl(0.02, 0.6, 0, 1.35, 0, '#8a6038', { n: 3 }); k.box(0.3, 0.18, 0.02, 0.15, 1.75, 0, '#ff7aa2'); }
    const g = k.build(); g.position.set(s.hit[0], y, s.hit[1]); V.B.root.add(g); V.castle = { g, lvl: Math.min(lvl, 4) };
  }
  // the animals, each its own way: hens peck and dart, cows amble and graze, goats skip, alpacas trot; crabs
  // scuttle sideways and hide, gulls walk and fly off, the seal dozes, fish circle the shallows, a dolphin leaps
  function animalsTick(t, dt) {
    const k = V.kid;
    for (const a of V.B.animals || []) {
      const g = a.group, P = g.position, dk = Math.hypot(k.pos.x - P.x, k.pos.z - P.z);
      if (a.tick) { a.tick(t, dt, k.pos, V.grid.ground); continue; } // (an animal with its own ways: birds, swans, horses…)
      if (a.fixed) { if (a.head) a.head.rotation.x = -0.25 * Math.max(0, Math.sin(t * 0.4 + 1)) ** 4; continue; }
      if (a.kind === 'fish') { const r = 2.2, w = t * 0.5 + a.home[0]; P.set(a.home[0] + Math.cos(w) * r, -0.6 + Math.sin(t * 1.3) * 0.08, a.home[1] + Math.sin(w) * r * 0.7); g.rotation.y = -w; continue; }
      if (a.kind === 'dolphin') { const cyc = 11, u = ((t + 3) % cyc) / 2.2; if (u < 1) { const x = a.home[0] - 6 + ((Math.floor((t + 3) / cyc) % 3) * 6), y = -1.0 + Math.sin(u * Math.PI) * 2.4; P.set(x + u * 6, y, a.home[1]); g.rotation.set(0, Math.PI / 2, 0); g.rotateX(-Math.cos(u * Math.PI) * 0.9); g.visible = y > -0.45; } else g.visible = false; continue; }
      a.st = a.st || { mode: 'idle', until: 0, to: null, cool: 0 }; const S = a.st;
      const speed = { hen: 1.5, rooster: 1.4, duck: 1.1, goose: 1.1, turkey: 1.0, goat: 1.0, cow: 0.55, highland: 0.5, merino: 0.8, kunekune: 0.8, alpaca: 0.9, llama: 0.9, donkey: 0.8, horse: 1.1, pony: 1.0, crab: 1.4, gull: 0.6, weka: 1.2 }[a.kind] || 0.8;
      const shy = a.kind === 'crab' || a.kind === 'gull', night = V.phase === 'night';
      const inPen = (x, z) => (a.pen ? [clamp(x, a.pen[0], a.pen[2]), clamp(z, a.pen[1], a.pen[3])] : [x, z]);
      // a fright: near the kid, the shy ones get away
      if (shy && ((a.kind === 'crab' && dk < 1.8) || (a.kind === 'gull' && dk < 2.4 && S.mode !== 'fly'))) {
        if (a.kind === 'gull') { const ang = Math.random() * 6.28, to = [clamp(a.home[0] + Math.cos(ang) * 8, 6, V.B.bounds.x1 - 6), clamp(a.home[1] + Math.sin(ang) * 3, 15, 22)]; S.mode = 'fly'; S.from = [P.x, P.z]; S.to = to; S.t0 = t; S.until = t + 2.2; }
        else { S.mode = 'hide'; S.until = t + 4; }
      }
      if (S.mode === 'fly') { const u = clamp((t - S.t0) / 2.2, 0, 1); P.x = S.from[0] + (S.to[0] - S.from[0]) * u; P.z = S.from[1] + (S.to[1] - S.from[1]) * u; P.y = V.grid.ground(P.x, P.z) + Math.sin(u * Math.PI) * 3; g.rotation.y = Math.atan2(S.to[0] - S.from[0], S.to[1] - S.from[1]); for (const [i, w] of (a.wings || []).entries()) w.rotation.z = (i ? -1 : 1) * Math.sin(t * 18) * 0.8; if (a.d3) IH.animals3d.move(a, t, 'walk', 0, null); if (u >= 1) { S.mode = 'idle'; S.until = t + 3; a.home = S.to; for (const w of a.wings || []) w.rotation.z = 0; } continue; }
      if (S.mode === 'hide') { P.y += ((t < S.until ? V.grid.ground(P.x, P.z) - 0.35 : V.grid.ground(P.x, P.z)) - P.y) * Math.min(1, dt * 5); if (t > S.until && dk > 2) S.mode = 'idle'; continue; }
      // asleep (all night, and a nap now and then): wakes in the morning, or when the kid comes right up
      if (S.mode === 'sleep') { if ((!night && t > S.until) || (dk < 1.6 && Math.random() < dt * 0.6)) { S.mode = 'idle'; S.until = t + 1; } }
      else if (night && !/^(watch|approach|linger)$/.test(S.mode) && Math.random() < dt * 0.3) { S.mode = 'sleep'; S.curl = Math.random() < 0.4; S.until = t + 60; }
      // curious: the head turns to watch the kid coming (a long way off), then it walks over, stays a moment, and wanders off
      if (!shy && !night && S.mode !== 'sleep' && t > S.cool && dk < 14 && !/^(watch|approach|linger)$/.test(S.mode)) { S.mode = 'watch'; S.until = t + 1.2 + Math.random() * 1.6; }
      if (S.mode === 'watch' && t > S.until) { S.mode = 'approach'; S.until = t + 7; }
      if (S.mode === 'watch' && dk > 17) S.mode = 'idle';
      if (S.mode === 'approach') { const ax = P.x - k.pos.x, az = P.z - k.pos.z, L = Math.hypot(ax, az) || 1, r0 = a.d3 === 'rig' ? 2.2 : 1.4; S.to = inPen(k.pos.x + ax / L * r0, k.pos.z + az / L * r0); if (Math.hypot(S.to[0] - P.x, S.to[1] - P.z) < 0.3 || t > S.until) { S.mode = 'linger'; S.until = t + 2 + Math.random() * 2.5; } }
      if (S.mode === 'linger' && t > S.until) { S.mode = 'idle'; S.until = 0; S.cool = t + 25 + Math.random() * 25; }
      if (t > S.until && /^(idle|graze)$/.test(S.mode)) {
        const r = Math.random();
        if (r < 0.05) { S.mode = 'sleep'; S.curl = Math.random() < 0.4; S.until = t + 15 + Math.random() * 20; } // (a nap)
        else if (r < (a.kind === 'cow' || a.kind === 'highland' ? 0.35 : 0.5)) { // somewhere else in its pen, or near home
          let to = null; for (let q = 0; q < 8 && !to; q++) { const c = a.pen ? [a.pen[0] + Math.random() * (a.pen[2] - a.pen[0]), a.pen[1] + Math.random() * (a.pen[3] - a.pen[1])] : [a.home[0] + (Math.random() - 0.5) * 6, a.home[1] + (Math.random() - 0.5) * (a.kind === 'crab' ? 1 : 4)]; if (!V.B.solids.some(b => c[0] > b[0] - 0.8 && c[0] < b[2] + 0.8 && c[1] > b[1] - 0.8 && c[1] < b[3] + 0.8) && (!V.B.walk || a.pen || V.B.walk(c[0], c[1]))) to = c; }
          if (to) { S.mode = 'walk'; S.to = to; S.until = t + 12; }
        } else { S.mode = 'graze'; S.until = t + 2 + Math.random() * 5; }
      }
      let moving = false, dist = 0; const sp = S.mode === 'approach' ? speed * 1.15 : speed;
      if ((S.mode === 'walk' || S.mode === 'approach') && S.to) {
        const dx = S.to[0] - P.x, dz = S.to[1] - P.z, d = Math.hypot(dx, dz);
        if (S.mode === 'walk' && (d < 0.15 || t > S.until)) { S.mode = 'graze'; S.until = t + 1.5 + Math.random() * 4; }
        else if (d > 0.12) {
          const want = a.kind === 'crab' ? Math.atan2(dx, dz) - Math.PI / 2 : Math.atan2(dx, dz); g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * 4);
          const facing = a.kind === 'crab' ? 1 : Math.cos(want - g.rotation.y); if (facing > 0.5) { dist = Math.min(d, sp * dt); P.x += dx / d * dist; P.z += dz / d * dist; moving = true; }
        }
      }
      // watching and lingering: turns to face the kid (the rigged ones turn their heads first, the body follows slowly)
      const looking = /^(watch|approach|linger)$/.test(S.mode);
      if (looking && !moving) { const want = Math.atan2(k.pos.x - P.x, k.pos.z - P.z), rate = a.d3 === 'rig' ? 0.9 : 2.5; g.rotation.y += Math.atan2(Math.sin(want - g.rotation.y), Math.cos(want - g.rotation.y)) * Math.min(1, dt * rate); }
      P.y = V.grid.ground(P.x, P.z); // (feet on the ground: no hops)
      // legs swing when walking; heads down to graze and peck (the Kit-built stand-ins)
      const sw = moving ? Math.sin(t * sp * 9) * 0.5 : 0;
      (a.legs || []).forEach((l, i) => { l.rotation.x = (i % 2 ? 1 : -1) * (i > 1 ? -1 : 1) * sw; });
      if (a.d3 && IH.animals3d) IH.animals3d.move(a, t, moving ? 'walk' : S.mode === 'sleep' ? (S.curl ? 'sleep.curl' : 'sleep') : S.mode === 'graze' ? 'graze' : 'stand', dist, looking ? new T.Vector3(k.pos.x, k.pos.y + 1.5, k.pos.z) : null);
      if (a.head) a.head.rotation.x = S.mode === 'sleep' ? 0.9 : S.mode === 'graze' ? (a.kind === 'hen' ? 0.6 + Math.max(0, Math.sin(t * 7)) * 0.5 : 0.75) : moving ? Math.sin(t * 6) * 0.05 : -0.05;
    }
  }
  // a ride: the kid sits on (or in) something that goes round a path, then gets off where they got on
  function ride(r) {
    const k = V.kid; if (V.ride) return; k.path = []; k.seat = null; k.pose = r.pose || 'sitchair';
    V.ride = Object.assign({ t0: V.t, from: [k.pos.x, k.pos.z], yaw0: k.yaw }, r); if (r.model) r.model.visible = true; sound('tune');
  }
  const SIT = { hip: 0.29, back: -0.24 }; // (measured on the kid in the sitting pose: hips above the feet, back behind the hips)
  function rideTick(t, dt) {
    const R = V.ride; if (!R) return; const k = V.kid, u = (V.t - R.t0) / R.dur;
    if (u >= 1) { V.ride = null; k.pose = null; k.pos.set(R.from[0], 0, R.from[1]); k.yaw = R.yaw0; if (R.end) R.end(); return; }
    const p = R.at(u), q = R.at(Math.min(1, u + 0.01)); k.pos.set(p[0], 0, p[2]); k.yaw = Math.atan2(q[0] - p[0], q[2] - p[2]) || k.yaw;
    k.inst.group.position.set(p[0], p[1] + (R.lift || 0), p[2]); k.inst.group.rotation.y = k.yaw;
    if (R.seat && R.model) { // sat in a seat: hips on the cushion, the back against the backrest (SIT: where the hips are in the sitting pose)
      const S0 = R.seat, yw = R.model.rotation.y, c = Math.cos(yw), sn = Math.sin(yw), lz = S0.back + 0.08 + SIT.back, lx = S0.x;
      k.inst.group.position.set(p[0] + lx * c + lz * sn, p[1] + S0.y - SIT.hip + (R.bob ? Math.sin(t * 8) * R.bob : 0), p[2] - lx * sn + lz * c); k.inst.group.rotation.y = yw; }
    if (R.model) { R.model.position.set(p[0], p[1], p[2]); R.model.rotation.y = k.yaw + (R.modelYaw || 0); if (R.bob) R.model.position.y += Math.sin(t * 8) * R.bob; }
    if (R.a3 && IH.animals3d) { const lp = R.lastP || p; IH.animals3d.move(R.a3, t, 'walk', Math.hypot(p[0] - lp[0], p[2] - lp[2]), null); R.lastP = p; }
  }
  // Heavy gates: whoever walks up pushes the gate open away from them; it swings slowly (a lot of timber on its
  // hinges), holds open while they're close, then swings back shut, overshoots a little, settles, and the latch
  // clunks. A spring with a heavy leaf and light damping; it bumps off its stops if flung too far.
  function gatesTick(dt) {
    for (const G of V.B.gates || []) {
      let near = null, nd = 1e9; for (const p of V.people) { const d = Math.hypot(p.pos.x - G.mid[0], p.pos.z - G.mid[1]); if (d < nd) { nd = d; near = p; } }
      const leafMid = a => [G.hx + Math.cos(G.base + a) * G.len / 2, G.hz - Math.sin(G.base + a) * G.len / 2];
      if (near && nd < 2.4 && !G.dir) { const o = leafMid(1.5), c = leafMid(-1.5); G.dir = Math.hypot(o[0] - near.pos.x, o[1] - near.pos.z) > Math.hypot(c[0] - near.pos.x, c[1] - near.pos.z) ? 1 : -1; if (Math.abs(G.a) < 0.05) sound('pat'); }
      const tgt = G.dir && near && nd < 3.4 ? G.dir * 1.5 : 0;
      const I = 3.0, K = 9, C = 2.6, n = 4, h = Math.min(dt, 0.1) / n;
      for (let i = 0; i < n; i++) { G.v += ((K * (tgt - G.a) - C * G.v) / I) * h; G.a += G.v * h; if (Math.abs(G.a) > 1.75) { G.a = Math.sign(G.a) * 1.75; G.v *= -0.25; } }
      if (!tgt && G.dir && Math.abs(G.a) < 0.015 && Math.abs(G.v) < 0.05) { G.a = 0; G.v = 0; G.dir = 0; sound('tap'); } // (shut: the latch drops)
      G.g.rotation.y = G.base + G.a;
    }
  }
  function islandTick(t, dt) {
    for (const o of V.spin || []) o.rotation.z += dt * o.userData.spin;
    if (V.B.animals && V.B === V.street) animalsTick(t, dt);
    if (V.B.tick && V.B === V.street) V.B.tick(t, dt, V.kid.pos);
    fishTick(); rodTick(); rideTick(t, dt); fxTick(dt); gatesTick(dt);
  }

  // ---------- brothers and sisters, live (village-net.js): each where they really are, their name over them
  const NET = () => IH.villageNet;
  const myPlace = () => (V.B === V.street ? (V.where === 'village' ? 'street' : V.where) : V.B.id);
  const pitches = () => V.street.spots.filter(q => q.kind === 'stall' && !q.keeper);
  const PLACE = { street: 'on Hoshi Street', home: 'at home', beach: 'at the beach cove', farm: 'on the farm', lake: 'at the lake', grove: 'in the forest grove', waterfall: 'at the waterfall', lookout: 'at the mountain lookout', sky: 'on the sky islet', plot: 'in the veggie plot', orchard: 'in the orchard', stable: 'at the stable yard', furniture: 'in the furniture shop', grocer: 'at the grocer', cafe: 'at the café', pets: 'in the pet shop' };
  function netStart() {
    const net = NET(); V.sibs = new Map(); if (!net) return;
    const k = V.stage.kid || {};
    V.netOff = [
      net.on('emote', ({ p, k: kind, i, to }) => { const S = V && V.sibs.get(p.id); if (S && S.p) heard(S, kind, i, to); }),
      net.on('moved', ({ p, was }) => { if (V && p.s && p.s.pl !== 'home' && (!was || was === 'home')) toast(`${p.name} ${p.avatar} is in the village!`); }),
      net.on('leave', p => { if (V) { dropSib(p.id); if (V.trade && V.trade.other === p.id) { V.trade = null; $('.vg-game', V.ui).hidden = true; } } }),
      net.on('tr', d => V && trade(d)),
      net.on('busy', () => V && toast('They’re busy trading. Try again in a bit.')),
      net.on('buy', d => V && sibBuy(d)),
      net.on('sold', d => V && sibSold(d)),
      net.on('peers', () => V && famCount()), net.on('state', () => V && famCount())
    ];
    net.start({ name: k.name, avatar: k.avatar, hue: k.hue }, 'street'); famCount();
  }
  function netStop() {
    const net = NET(); if (!net) return; for (const f of V.netOff || []) f(); V.netOff = null;
    if (V.trade) net.send({ t: 'no', id: V.trade.id }, true);
    net.pose({ pl: 'home' });
    for (const id of [...V.sibs.keys()]) dropSib(id);
    for (const el of V.ui.querySelectorAll('.vg-tag')) el.remove();
  }
  function dropSib(id) {
    const S = V.sibs.get(id); if (!S) return;
    if (S.p) { V.S.sc.remove(S.p.inst.group); V.people = V.people.filter(o => o !== S.p); }
    if (S.stall) V.street.root.remove(S.stall.g); if (S.tag) S.tag.remove(); V.sibs.delete(id);
  }
  function sibsTick(t, dt) {
    const net = NET(); if (!net || !V.sibs) return;
    const pl = myPlace(), k = V.kid, f2 = v => Math.round(v * 100) / 100;
    net.pose({ pl, x: f2(k.pos.x), z: f2(k.pos.z), y: f2(k.pos.y), yaw: f2(k.yaw), st: k.st, pose: k.pose || null,
      stall: V.stall ? { pitch: pitches().indexOf(V.stall.s), items: V.stall.recs.map(r => ({ t: r.t, fin: r.fin, used: r.used, cond: r.cond, price: r.price })) } : null });
    const seen = new Set();
    for (const P of net.peers) {
      seen.add(P.id); let S = V.sibs.get(P.id); if (!S) V.sibs.set(P.id, S = { id: P.id, info: P, p: null, stall: null, sig: '' });
      S.info = P; const s = P.s, here = !!s && s.pl === pl;
      if (here && !S.p) {
        S.p = person(P.avatar, P.hue, s.x, s.z, s.yaw); S.p.sib = S; S.p.inst.group.traverse(m => { if (m.isMesh) m.castShadow = true; });
        V.people.push(S.p);
      } else if (!here && S.p) { V.S.sc.remove(S.p.inst.group); V.people = V.people.filter(o => o !== S.p); S.p = null; }
      if (S.p) {
        const p = S.p, dx = s.x - p.pos.x, dz = s.z - p.pos.z, d = Math.hypot(dx, dz); let moved = 0;
        if (d > 4) { p.pos.x = s.x; p.pos.z = s.z; } else { const a = Math.min(1, dt * 7); p.pos.x += dx * a; p.pos.z += dz * a; moved = d * a; }
        p.yaw += Math.atan2(Math.sin(s.yaw - p.yaw), Math.cos(s.yaw - p.yaw)) * Math.min(1, dt * 9);
        p.st = s.st === 'walk' || d > 0.12 ? 'walk' : 'stand'; p.pose = p.st === 'walk' ? null : s.pose; p.seat = s.pose === 'sitchair' ? { y: 0.12 } : null;
        draw(p, t, moved);
      }
      sibStall(S, pl === 'street' && s && s.stall ? s.stall : null);
    }
    for (const id of [...V.sibs.keys()]) if (!seen.has(id)) dropSib(id);
  }
  function sibStall(S, st) {
    const sig = st ? JSON.stringify(st) : ''; if (S.sig === sig) return; S.sig = sig;
    if (S.stall) { V.street.root.remove(S.stall.g); S.stall = null; }
    const s = st && pitches()[st.pitch]; if (!s || (V.stall && V.stall.s === s)) return;
    S.stall = { s, items: st.items, ...stallModel(s, S.info.name, st.items) };
  }
  const sibAt = s => V.sibs && [...V.sibs.values()].find(S => S.stall && S.stall.s === s);
  function sibStallActs(s, S) {
    // somewhere along the stall's front with room (never where its keeper, or anyone, is standing), nearest first
    const T0 = s.table, c = Math.cos(T0.face), sn = Math.sin(T0.face), k = V.kid;
    const spots = [-1.5, -0.5, 0.5, 1.5].map(u => [T0.x + u * c + 2.4 * sn, T0.z - u * sn + 2.4 * c]).filter(p => V.grid.free(p[0], p[1]) && V.people.every(o => o === k || Math.hypot(o.pos.x - p[0], o.pos.z - p[1]) > 1.1)).sort((a, b) => Math.hypot(a[0] - k.pos.x, a[1] - k.pos.z) - Math.hypot(b[0] - k.pos.x, b[1] - k.pos.z));
    return S.stall.items.map((r, i) => ({ e: '🛍️', label: `Buy ${S.info.name}’s ${(IH.items.BY[r.t] || { name: r.t }).name.toLowerCase()}${r.used ? ' (used)' : ''} · ✨ ${r.price}`,
      run: () => { const f = spots[0]; if (!f) return toast('It’s busy at the stall. Try again in a moment.'); walkTo(f[0], f[1], ok => ok && sibAsk(S, i, r), T0.face + Math.PI); } }));
  }
  // buying from a sibling's stall: their device says yes (and takes the XP) or that it's gone
  function sibAsk(S, i, r) {
    if (V.stage.shop.wallet().left < r.price) return toast(`You need ✨ ${r.price} XP for that.`);
    const rid = Math.random().toString(36).slice(2, 10); V.buying = { rid, S, until: V.t + 8 };
    NET().send({ t: 'buy', to: S.id, i, it: r.t, rid }, true); toast(`Asking ${S.info.name}…`);
    setTimeout(() => { if (V && V.buying && V.buying.rid === rid) { V.buying = null; toast(`${S.info.name} didn’t answer. Try again?`); } }, 8000);
  }
  function sibBuy(d) {
    const St = V.stall, r = St && St.recs[d.i], who = (NET().peer(d.from) || { name: 'Someone' }).name;
    if (!r || r.t !== d.t) return NET().send({ t: 'sold', to: d.from, rid: d.rid, rec: null }, true);
    St.recs.splice(d.i, 1); const m = St.models.splice(d.i, 1)[0]; if (m) St.g.remove(m);
    V.stage.shop.sold(r); xp(); float(V.kid, '✨'); sound('buy'); toast(`${who} bought your ${IH.items.BY[r.t].name.toLowerCase()} for ✨ ${r.price} XP!`);
    NET().send({ t: 'sold', to: d.from, rid: d.rid, rec: { t: r.t, fin: r.fin, used: r.used, cond: r.cond, price: r.price } }, true);
    if (!St.recs.length) setTimeout(() => { if (V && V.stall === St) { stallClose(true); toast('Sold out! Your stall’s packed away.'); } }, 1500);
  }
  function sibSold(d) {
    const B = V.buying; if (!B || B.rid !== d.rid) return; V.buying = null;
    if (!d.rec || !IH.items.BY[d.rec.t]) return toast('Oh! That’s just gone.');
    const sh = V.stage.shop; sh.xp(-d.rec.price); sh.tradeIn(d.rec); xp();
    say(B.S.p || V.kid, 'Thanks! 😊'); float(V.kid, '🛍️'); sound('buy'); toast(`The ${IH.items.BY[d.rec.t].name.toLowerCase()} is yours! It’s in Mine.`);
  }

  // names over brothers and sisters
  function tags() {
    if (!V.sibs) return;
    for (const S of V.sibs.values()) {
      if (!S.p) { if (S.tag) S.tag.hidden = true; continue; }
      if (!S.tag) { S.tag = document.createElement('div'); S.tag.className = 'vg-tag'; V.ui.appendChild(S.tag); }
      S.tag.hidden = false; S.tag.textContent = S.info.name; const [x, y] = screenOf(S.p.pos.clone().setY(S.p.pos.y + 2.1)); S.tag.style.left = x + 'px'; S.tag.style.top = y + 'px';
    }
  }
  function famCount() { const el = $('.vg-famn', V.ui), net = NET(); if (!el || !net) return; const n = net.peers.length; el.textContent = net.live ? (n ? ' ' + n : '') : ''; $('.vg-fam', V.ui).classList.toggle('on', !!net.live && n > 0); }
  function famPanel() {
    const net = NET(); if (!net) return; const L = net.peers;
    const why = net.live ? '' : net.why === 'nofamily' || !net.code() ? 'To play with your brothers and sisters, a grown-up sets the same family code on each of your devices.' : net.why === 'full' ? 'The family’s village is full right now.' : 'Can’t reach your family right now. It’ll keep trying.';
    gamePanel(`<div class="vg-gh"><b>👪 Family</b><span>${net.live ? 'Online' : 'Offline'}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div>
      <div class="vg-gq">${net.live ? (L.length ? L.map(p => `${esc(p.avatar)} <b>${esc(p.name)}</b> is ${PLACE[p.s && p.s.pl] || 'about'}`).join('<br>') : 'Nobody else from your family is here yet.') : esc(why)}</div>
      <details class="vg-grown"><summary>For grown-ups: family code</summary><p>Signed in to Chorecast on this device? Your family joins together on its own. Otherwise set the same code (6 or more letters or numbers) on each child’s device. Only devices with the code meet.</p>
      <div class="vg-gb"><input class="vg-fcode" maxlength="24" autocomplete="off" spellcheck="false" value="${esc(net.code())}" aria-label="Family code"><button data-v="fcode">Save</button></div></details>`);
  }

  // emoji, set phrases and actions (nothing typed)
  function emoPanel() {
    const N = NET(); if (!N) return;
    $('.vg-emo', V.ui).innerHTML = `<div class="vg-emo-row">${N.EMOJI.map((e, i) => `<button data-v="emo" data-k="emo" data-i="${i}">${e}</button>`).join('')}</div>
      <div class="vg-emo-ph">${N.PHRASES.map((p, i) => `<button data-v="emo" data-k="say" data-i="${i}">${esc(p)}</button>`).join('')}</div>
      <div class="vg-emo-ph">${N.ACTIONS.map(([e, l], i) => `<button data-v="emo" data-k="act" data-i="${i}">${e} ${esc(l)}</button>`).join('')}</div>`;
  }
  function speak(kind, i) { const N = NET(); const s = kind === 'emo' ? N.EMOJI[i] : N.PHRASES[i]; if (!s) return; say(V.kid, s); sound('pop'); N.send({ t: 'e', k: kind, i }); }
  function act(i) {
    const N = NET(), k = V.kid; if (!N || k.path.length) return; if (k.seat) stand(k);
    let to = null;
    if (i === 2) { let bd = 1.9; for (const S of V.sibs.values()) if (S.p) { const d = Math.hypot(S.p.pos.x - k.pos.x, S.p.pos.z - k.pos.z); if (d < bd) { bd = d; to = S; } } if (!to) return toast('Stand right next to someone for a high five.'); k.face = Math.atan2(to.p.pos.x - k.pos.x, to.p.pos.z - k.pos.z); }
    k.pose = i === 1 ? 'bounce' : 'happy'; say(k, N.ACTIONS[i][0]); sound(i === 2 ? 'buy' : 'tune'); if (i === 2) float(k, '🙌');
    setTimeout(() => { if (V && V.kid === k && /^(happy|bounce)$/.test(k.pose || '')) k.pose = null; }, i === 1 ? 3000 : 1800);
    N.send({ t: 'e', k: 'act', i, to: to ? to.id : null });
  }
  function heard(S, kind, i, to) {
    const N = NET(); say(S.p, kind === 'emo' ? N.EMOJI[i] : kind === 'say' ? N.PHRASES[i] : N.ACTIONS[i][0]);
    if (kind === 'act' && i === 2 && to === N.me) { const k = V.kid; if (!k.path.length) { k.face = Math.atan2(S.p.pos.x - k.pos.x, S.p.pos.z - k.pos.z); k.pose = 'happy'; setTimeout(() => { if (V && k.pose === 'happy') k.pose = null; }, 1500); } float(k, '🙌'); sound('buy'); }
  }

  // trading with a brother or sister: both put things from Mine and/or XP in, both agree, each device does its own side
  function trade(d) {
    const N = NET(), me = N.me, other = d.a === me ? d.b : d.a, who = N.peer(other) || { name: 'them', avatar: '' };
    if (d.st === 'off') { if (V.trade && V.trade.id === d.id) { V.trade = null; $('.vg-game', V.ui).hidden = true; toast('The trade’s off.'); } return; }
    if (d.st === 'done') { tradeDone(d, me, other, who); return; }
    if (V.game && (!V.trade || V.trade.id !== d.id)) return N.send({ t: 'no', id: d.id }, true);
    const T0 = V.trade && V.trade.id === d.id ? V.trade : (V.trade = { id: d.id, other, mine: { items: [], xp: 0 } });
    T0.d = d; T0.who = who; sound('pop'); tradeDraw();
  }
  function tradeDraw() {
    const T0 = V.trade; if (!T0) return; const d = T0.d, me = NET().me, who = T0.who, sh = V.stage.shop;
    if (d.st === 'ask') return gamePanel(d.b === me
      ? `<div class="vg-gh"><b>🔁 ${esc(who.name)} wants to trade!</b><button class="vg-x" data-v="gclose" aria-label="No thanks">✕</button></div><div class="vg-gb vg-go"><button data-v="tryes"><span class="e">🤝</span>Let’s trade</button><button data-v="gclose">No thanks</button></div>`
      : `<div class="vg-gh"><b>🔁 Asking ${esc(who.name)}…</b><button class="vg-x" data-v="gclose" aria-label="Cancel">✕</button></div><div class="vg-gq">Waiting for them to say yes.</div>`);
    const theirs = d.give[T0.other] || { items: [], xp: 0 }, okMe = d.ok[me], okThem = d.ok[T0.other], list = sh.mine(), M = T0.mine;
    const chip = r => `<img alt="" src="${sh.thumb(r.t)}" width="28" height="28">${esc((IH.items.BY[r.t] || { name: r.t }).name)}${r.used ? ' (used)' : ''}`;
    const inMine = it => M.items.some(q => q.t === it.t && q.n === it.n);
    T0.list = list; const was = $('.vg-trpick', V.ui), pickOpen = was ? was.open : false;
    gamePanel(`<div class="vg-gh"><b>🔁 Trading with ${esc(who.name)}</b><button class="vg-x" data-v="gclose" aria-label="Call it off">✕</button></div>
      <div class="vg-tr"><div><h4>You give</h4><div class="vg-gb vg-mine">${M.items.map((r, i) => `<button data-v="trdel" data-i="${i}" class="on">${chip(r)} ✕</button>`).join('') || '<small>Nothing yet</small>'}</div>
        <div class="vg-trxp">✨ <b>${M.xp}</b> XP <button data-v="trxp" data-n="10">+10</button><button data-v="trxp" data-n="50">+50</button><button data-v="trxp" data-n="0">0</button></div></div>
      <div><h4>${esc(who.name)} gives ${okThem ? '✅' : ''}</h4><div class="vg-gb vg-mine">${theirs.items.map(r => `<button disabled class="on">${chip(r)}</button>`).join('') || '<small>Nothing yet</small>'}</div><div class="vg-trxp">✨ <b>${theirs.xp}</b> XP</div></div></div>
      <details class="vg-trpick"${pickOpen ? ' open' : ''}><summary>Add from Mine (${M.items.length} / 6)</summary><div class="vg-gb vg-mine">${list.slice(0, 30).map((it, i) => inMine(it) ? '' : `<button data-v="tradd" data-i="${i}" ${M.items.length >= 6 ? 'disabled' : ''}>${chip(it)}</button>`).join('') || '<small>Mine is empty.</small>'}</div></details>
      <div class="vg-gb vg-go"><button data-v="trok" ${okMe ? 'disabled' : ''}><span class="e">🤝</span>${okMe ? `Agreed. Waiting for ${esc(who.name)}…` : 'Agree'}</button></div>`);
  }
  function tradeUi(a, b) {
    const T0 = V.trade, N = NET(); if (!T0) return; const M = T0.mine, sh = V.stage.shop;
    const push = () => { N.send({ t: 'give', id: T0.id, items: M.items.map(r => ({ t: r.t, fin: r.fin, used: r.used, cond: r.cond, price: r.price })), xp: M.xp }, true); sound('tap'); };
    if (a === 'tryes') return N.send({ t: 'yes', id: T0.id }, true);
    if (a === 'trok') { sound('pop'); return N.send({ t: 'ok', id: T0.id }, true); }
    if (a === 'tradd') { const it = T0.list && T0.list[+b.dataset.i]; if (it && M.items.length < 6) { M.items.push(it); push(); } return; }
    if (a === 'trdel') { M.items.splice(+b.dataset.i, 1); return push(); }
    if (a === 'trxp') { const n = +b.dataset.n, left = sh.wallet().left; M.xp = n ? Math.min(left, M.xp + n) : 0; if (n && M.xp === left) toast('That’s all your XP.'); return push(); }
  }
  function tradeDone(d, me, other, who) {
    const sh = V.stage.shop, mine = d.give[me] || { items: [], xp: 0 }, theirs = d.give[other] || { items: [], xp: 0 };
    // mine out (each matched afresh in Mine: what it is, its finish, used or not), theirs in, the XP both ways
    for (const r of mine.items) { const L = sh.mine(), it = L.find(q => q.t === r.t && !!q.used === !!r.used && JSON.stringify(q.fin || null) === JSON.stringify(r.fin || null)) || L.find(q => q.t === r.t); if (it) sh.tradeOut(it.t, it.n); }
    for (const r of theirs.items) if (IH.items.BY[r.t]) sh.tradeIn(r);
    sh.xp(theirs.xp - mine.xp); xp();
    V.trade = null; $('.vg-game', V.ui).hidden = true; float(V.kid, '🤝'); sound('buy');
    toast(`Traded with ${who.name}! ${theirs.items.length ? 'What you got is in Mine.' : ''}`);
  }

  // test hooks
  IH.village = { open, close: () => close(), leave, goto, reload, where: () => V && V.where, toast: s => toast(s), enter: id => V && enter(id), exit: () => V && exit(), get debug() { return V && { V, CAM, route: (a, b) => route(V.grid, a, b), walkTo, tap, screenOf: p => screenOf(new T.Vector3(p[0], p[1] || 0, p[2])), spots: V.B.spots, kid: V.kid, npc: V.npc, sibs: V.sibs, setZoom, turnView, farm: FARM, draw() { light(); aim(); V.stage.pipe.render(V.S.sc, V.S.cam); bubbles(); }, act(id, i) { const s = V.B.spots.find(q => q.id === id), L = s && ACTS[s.kind] ? ACTS[s.kind](s) : []; if (i != null && L[i]) L[i].run(); return L.map(x => x.label); }, tick(n = 20, dt = 0.05) { if (V) { light(); aim(); V.S.cam.updateMatrixWorld(); } for (let i = 0; i < n && V; i++) { V.t += dt; V.sceneT = (V.sceneT || 0) + dt; kidTick(V.sceneT, dt); villagersTick(V.sceneT, dt); islandTick(V.sceneT, dt); } } }; } };
})();
