/* Chorecast packages: the walk engine. The homes game's way of moving bodies about (app.js petStep, go, useItem),
   on its own so any island can use it, with phys.js underneath. It doesn't care what shape the ground is: the
   island says where there's ground (floorAt, -5 where there's none) and what's solid (things), and phys.js builds
   the walking maps from that. A round island is simply ground inside a circle.
     · routes: A* over the walking map, then straightened to the farthest point it can see
     · steering: each body walks forward the way it faces and turns only as tightly as its turning circle lets it,
       aiming a little way along its route (corners become curves); it slows into bends and turns on the spot when
       a bend is too sharp or there's no room to swing round. The last stretch goes straight onto the spot.
     · contact: bodies push apart; anything a body brushes it slides along, never into; blocked for a moment, it
       finds another way
     · sitting: it walks to the front of a seat, turns and sits back into it (phys.js fits the hips, back and legs
       to whatever the seat is), stays a while, then stands up and steps off
     · standing about: idle moves, wandering, the kid choosing a seat, a pet keeping near the kid
   world(o) o: { parent (where the bodies and things go), floorAt(x, z), things() (the island's own solid
   objects), bounds { x0, z0, x1, z1 }, cam } → { add(body package, x, z), put(item, x, z, yaw), spot(r), tick } */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || IH.walk) return;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

  // ---- One beat of walking along a route (A.path), shared by every game that moves bodies: the classic islands
  // (world() below) and the homes game (app.js petStep). A: { pos (Vector3), yaw, path, stuck, free, task }.
  // o: { P (phys.js), cls, R (body radius), speed, turnR, dt, others [{ x, z, r }], straight (no corner cutting),
  //   ground(x, z) (the floor; phys.js's by default) }. Moves A along and returns the ground covered.
  //   · heads for a point half a tile along the route, pulled in until there's a clear straight line to it
  //   · walks forward the way it faces, turning only as tightly as its turning circle lets it; slows into bends and
  //     turns on the spot when a bend is too sharp or there's no room to swing round; the last stretch goes straight
  //   · bodies push apart; it slides along whatever it brushes, never into it; stepping off a seat it keeps to the top
  //     and never goes through a wall; blocked for a moment, it finds another way
  function stride(A, o) {
    const P = o.P, cls = o.cls, R = o.R, dt = o.dt;
    while (A.path.length > 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.28) A.path.shift(); // (passed close by: on to the next)
    let rest = 0, ax = A.pos.x, az = A.pos.z; for (const q of A.path) { rest += Math.hypot(q.x - ax, q.z - az); ax = q.x; az = q.z; }
    const look = dist => { let px = A.pos.x, pz = A.pos.z, left = dist; for (const q of A.path) { const L = Math.hypot(q.x - px, q.z - pz); if (L >= left) return { x: px + (q.x - px) / L * left, z: pz + (q.z - pz) / L * left }; left -= L; px = q.x; pz = q.z; } return { x: px, z: pz }; };
    const wp = A.path[0], final = A.path.length === 1 && rest < 0.45;
    let aim = wp; if (!final && !o.straight) for (const L of [0.5, 0.35, 0.22]) { const q = look(L); if (P.sees(A.pos, q, cls) && P.wallFree(A.pos, q)) { aim = q; break; } }
    const want = Math.atan2(aim.x - A.pos.x, aim.z - A.pos.z), off = wrapA(want - A.yaw), aoff = Math.abs(off);
    const cramped = P.clearance(A.pos.x, A.pos.z, cls) < R + 0.12;
    const v = o.speed * (final ? Math.max(0.35, Math.min(1, rest / 0.45)) : 1) * (aoff > 1.2 || (aoff > 0.9 && cramped) ? 0 : Math.pow(Math.cos(aoff), 1.5));
    const wmax = Math.min(5.5, Math.max(2.6, v / o.turnR)); A.yaw = wrapA(A.yaw + clamp(off, -wmax * dt, wmax * dt));
    const sp = v * dt; let nx, nz;
    if (final) { const d = Math.hypot(wp.x - A.pos.x, wp.z - A.pos.z); if (d <= sp || d < 0.01) { nx = wp.x; nz = wp.z; A.path.shift(); } else { nx = A.pos.x + (wp.x - A.pos.x) * sp / d; nz = A.pos.z + (wp.z - A.pos.z) * sp / d; } }
    else { nx = A.pos.x + Math.sin(A.yaw) * sp; nz = A.pos.z + Math.cos(A.yaw) * sp; }
    for (const q of o.others || []) { const ox = nx - q.x, oz = nz - q.z, od = Math.hypot(ox, oz), m = q.r + R; if (od < m && od > 1e-4) { const k = (m - od) * 0.5; nx += ox / od * k; nz += oz / od * k; } }
    if (A.free && !P.wallFree(A.pos, { x: nx, z: nz })) { nx = A.pos.x; nz = A.pos.z; A.path = []; } // even stepping off a seat, never through a wall
    if (!A.free) {
      // (squeezed in: any move that's no tighter is fine; and already inside something and held there a moment, in a
      // pocket where every way out looks tighter, it follows its route out rather than stand there for good)
      const c0 = P.clearance(A.pos.x, A.pos.z, cls); if (c0 >= R * 0.97) A.trapped = false; else if ((A.stuck || 0) > 0.6) A.trapped = true;
      const trapped = !!A.trapped, ok = (x, z) => { const c = P.clearance(x, z, cls); return trapped || c >= R * 0.97 || c >= c0 - 0.002; };
      if (!ok(nx, nz)) { if (ok(nx, A.pos.z)) nz = A.pos.z; else if (ok(A.pos.x, nz)) nx = A.pos.x; else { nx = A.pos.x; nz = A.pos.z; } }
      if (Math.hypot(nx - A.pos.x, nz - A.pos.z) < sp * 0.3) A.stuck = (A.stuck || 0) + dt; else A.stuck = 0;
    }
    const fl = o.ground || P.floorAt, gy = A.free ? Math.max(fl(nx, nz), P.support(nx, A.pos.y + 0.3, nz)) : fl(nx, nz);
    const d = Math.hypot(nx - A.pos.x, nz - A.pos.z);
    A.pos.x = nx; A.pos.z = nz; A.pos.y = gy > A.pos.y ? gy : A.pos.y + (gy - A.pos.y) * Math.min(1, dt * 10);
    if (A.stuck > 0.5 && A.task && A.path.length === 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.4) A.path = []; // close enough (someone's in the exact spot)
    if (A.stuck > 1.2 && A.path.length && !A.free) { const end = A.path[A.path.length - 1], np = P.route(A.pos, end, cls); A.stuck = 0; A.path = np || []; } // blocked: finds another way
    return d;
  }

  // ---- Using a thing (items.js USE), shared by every game: where the body goes on it, the slide into place, the
  // moves while it's there, and where it steps off. it: { group (its position), yaw (its turn, radians), def
  // ({ fp, use }) }. The homes game passes its placed things, the classic islands the packages' things.
  const ease3 = p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const rotY = (yaw, x, z) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
  const SEATED = ['sit', 'lie', 'nest', 'on'];
  // a bed's own map: from the world into the bed, where the kid lies (head on the pillow) and each side of it
  function bedZone(it) {
    const c = it.group.position, ry = it.yaw || 0, [w, d] = it.def.fp, KZ = [-d / 2 + 1.05, -d / 2 + 2.55];
    return { w, d, toL: (x, z) => [(x - c.x) * Math.cos(ry) - (z - c.z) * Math.sin(ry), (x - c.x) * Math.sin(ry) + (z - c.z) * Math.cos(ry)], onKid: (x, z) => Math.abs(x) < 0.62 && z > KZ[0] && z < KZ[1], side: x => (x < 0 ? -1 : 1) * (w / 2 - 0.32) };
  }
  // Where a body goes to use it, from where it stands (from): { x, y, z, yaw, seat, floorY, fitMode }.
  // o: { kid, taken (seat numbers in use), seat (a seat chosen already), stay (a front thing used from where it
  //   stands), kidThere (a kid's already lying on the bed: a pet keeps to a side) }
  //   · a seat: the nearest free place along it, the hips over the middle (phys.js then settles them in)
  //   · a bed: the kid in the middle, head on the pillow; a pet where it was let go, clear of the kid
  //   · a pet bed: in it; on top: in the middle; anything else: standing in front, facing it
  function placeOn(it, from, o = {}) {
    const u = it.def.use, ry = it.yaw || 0, c = it.group.position, depth = it.def.fp[1], kid = !!o.kid, P = IH.phys, front = !SEATED.includes(u.kind);
    let lx = 0, lz = 0, yaw = ry, y = c.y + (u.h || 0), seat = 0, floorY = null;
    if (u.kind === 'sit') {
      const seats = u.seats || [0], taken = o.taken || []; let sd = 1e9;
      seats.forEach((sx, i) => { if (taken.includes(i)) return; const [wx, wz] = rotY(ry, sx, 0), dd = Math.hypot(c.x + wx - from.x, c.z + wz - from.z); if (dd < sd) { sd = dd; seat = i; } });
      if (o.seat != null) seat = o.seat; lx = seats[seat]; lz = kid ? -0.2 : 0.05; if (kid) y -= 0.41;
    } else if (u.kind === 'lie') {
      const B = bedZone(it);
      if (kid) { lx = 0; lz = -depth / 2 + 2.4; y -= 0.14; floorY = c.y + u.h - 0.02; } // (half a tile down from the headboard; the body is kept on the mattress)
      else { [lx, lz] = B.toL(from.x, from.z); lx = clamp(lx, -B.w / 2 + 0.32, B.w / 2 - 0.32); lz = clamp(lz, -depth / 2 + 0.4, depth / 2 - 0.4); if (o.kidThere && B.onKid(lx, lz)) lx = B.side(lx); }
    } else if (u.kind === 'nest') [lx, lz] = u.at || [0, 0];
    else if (front) { lz = depth / 2 + (u.gap || 0.6); yaw = ry + (u.face === 'away' ? 0 : Math.PI); y = c.y; }
    const [wx, wz] = rotY(ry, lx, lz); let x = c.x + wx, z = c.z + wz;
    if (front && o.stay) { yaw = Math.atan2(c.x - from.x, c.z - from.z) + (u.face === 'away' ? Math.PI : 0); x = from.x; z = from.z; y = P ? P.floorAt(x, z) : from.y; } // stays where it walked to, facing the thing
    if (!kid && P && (u.kind === 'sit' || u.kind === 'nest')) { const sy = P.support(x, y + 0.6, z); if (sy > -1e8) y = sy; } // a pet sits on the cushion itself
    return { x, y, z, yaw, seat, floorY, fitMode: kid && u.kind === 'sit' && u.kid === 'sitchair' ? 'seat' : front ? 'clear' : null };
  }
  // Where to stand to use it (walked to first): in front of the seat it'll take, beside a bed or pet bed, or the
  // spot in front of a front thing
  function approach(it, kid, seat = 0) {
    const u = it.def.use, c = it.group.position, ry = it.yaw || 0, [w, d] = it.def.fp;
    const [x, z] = u.kind === 'sit' ? rotY(ry, (u.seats || [0])[seat], d / 2 + 0.5) : u.kind === 'lie' ? rotY(ry, w / 2 + 0.45, 0) : u.kind === 'nest' || u.kind === 'on' ? rotY(ry, 0, d / 2 + 0.4) : rotY(ry, 0, d / 2 + (u.gap || 0.6));
    return { x: c.x + x, z: c.z + z };
  }
  // the next move while it's there: the move's branches in turn, never the same twice running (queue: ones to play first)
  function nextMove(U, t) {
    if (U.moves && t > U.nextMove) { const m = U.moves.filter(q => q !== U.pose); U.pose = U.queue && U.queue.length ? U.queue.shift() : m[Math.floor(Math.random() * m.length)] || U.pose; U.nextMove = t + 5 + Math.random() * 5; }
    return U.pose;
  }
  // sliding onto it (from where it stood to A.pos), turning round as it goes; false once it's there
  function slideBeat(g, A, t) {
    const S = A.slide; if (!S) return false;
    const p = clamp((t - S.t0) / S.dur, 0, 1), e = ease3(p); g.position.lerpVectors(S.from, A.pos, e); g.rotation.set(0, S.yaw0 + wrapA(A.yaw - S.yaw0) * e, 0);
    if (p >= 1) A.slide = null; return true;
  }
  // Where to step off: a seat off its front edge; a bed or anything else off a side or the end, the nearest with
  // room; never across a wall. Then wherever's clear nearby. (null: nowhere)
  // (avoid: other bodies [{ x, z, r }]: never a spot someone's already standing or lying on)
  function getOff(it, A, cls, avoid = []) {
    const P = IH.phys, u = it && it.def.use, R = P.BODY[cls].r, near = q => avoid.some(b => Math.hypot(b.x - q.x, b.z - q.z) < b.r + R); let sp = null;
    if (u && SEATED.includes(u.kind)) {
      const c = it.group.position, ry = it.yaw || 0, [w, d] = it.def.fp, me = { x: A.pos.x, z: A.pos.z }, dx = A.pos.x - c.x, dz = A.pos.z - c.z, lx = dx * Math.cos(ry) - dz * Math.sin(ry);
      const cand = u.kind === 'sit' ? [[lx, d / 2 + 0.5]] : [[-(w / 2 + 0.45), 0], [w / 2 + 0.45, 0], [lx, d / 2 + 0.5], [lx, -(d / 2 + 0.5)]]; let bd = 1e9;
      for (const [x, z] of cand) { const [fx, fz] = rotY(ry, x, z), q = P.nearestClear(c.x + fx, c.z + fz, cls); if (!q || near(q) || !P.wallFree(me, q) || Math.hypot(q.x - c.x - fx, q.z - c.z - fz) > 0.8) continue; const dd = Math.hypot(q.x - me.x, q.z - me.z); if (dd < bd) { bd = dd; sp = q; } }
    }
    if (!sp) { const q = P.nearestClear(A.pos.x, A.pos.z, cls); if (q && P.wallFree(A.pos, q)) sp = q; }
    // (someone's there: a clear spot round them, as near as there is)
    if (sp && near(sp)) { let best = null, bd = 1e9; for (let a = 0; a < 16; a++) for (const d of [0.6, 0.9, 1.2]) { const x = sp.x + Math.sin(a * 0.3927) * d, z = sp.z + Math.cos(a * 0.3927) * d, q = { x, z }; if (P.clearance(x, z, cls) < R || near(q) || !P.wallFree(A.pos, q)) continue; const dd = Math.hypot(x - A.pos.x, z - A.pos.z); if (dd < bd) { bd = dd; best = q; } } sp = best || sp; }
    return sp;
  }

  function world(o) {
    const P = IH.phys, group = new T.Group(), wraps = new Map(), items = [], bodies = [];
    // body sizes besides the kid and a pet: a cow or a horse, and a hen or a crab
    if (!P.BODY.big) Object.assign(P.BODY, { big: { lo: 0.15, hi: 2.6, r: 0.55 }, tiny: { lo: 0.05, hi: 0.6, r: 0.16 } });
    o.parent.add(group);
    const wrap = obj => { let w = wraps.get(obj); if (!w) { w = { group: obj }; wraps.set(obj, w); } return w; };
    const env = { things: () => [...o.things().map(wrap), ...items], floorAt: o.floorAt, wallAt: () => 0, bounds: () => o.bounds };
    // (phys.js serves one world at a time: this one takes it whenever it moves its bodies)
    const claim = () => { if (P.env !== env) { P.env = env; P.forget(); } IH.groundAt = (x, z) => { const y = o.floorAt(x, z); return y < -4 ? 0 : y; }; };
    claim();

    // ---- things put down: an item package's thing, standing on the ground, turned to yaw
    function put(it, x, z, yaw = 0) {
      claim(); it.group.position.set(x, o.floorAt(x, z), z); it.group.rotation.y = yaw; it.yaw = yaw; it.id = 'w' + items.length;
      group.add(it.group); it.group.updateMatrixWorld(true); items.push(it); P.forget(); return it;
    }
    // The island's walking map can come in pieces (things the kid put down close together can wall off a corner):
    // the biggest piece is the island proper, and bodies start there and things go there, so everyone can reach
    // everything. (worked out again whenever the map is)
    let regOf = null, regMain = -1, regLab = null;
    function region(x, z) {
      const Wg = P.grid(); if (!Wg) return -1;
      if (regOf !== Wg) {
        const D = Wg.dist.kid, r = P.BODY.kid.r, nz = Wg.nz, N = Wg.nx * nz, lab = new Int32Array(N).fill(-1), size = [];
        for (let c = 0; c < N; c++) {
          if (lab[c] >= 0 || D[c] < r) continue; const id = size.length, st = [c]; let n = 0; lab[c] = id;
          while (st.length) { const q = st.pop(); n++; const i = Math.floor(q / nz), j = q % nz; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const ni = i + di, nj = j + dj; if ((!di && !dj) || ni < 0 || nj < 0 || ni >= Wg.nx || nj >= nz) continue; const nc = ni * nz + nj; if (lab[nc] < 0 && D[nc] >= r) { lab[nc] = id; st.push(nc); } } }
          size.push(n);
        }
        regOf = Wg; regLab = lab; regMain = size.length ? size.indexOf(Math.max(...size)) : -1;
      }
      const i = Math.round((x - Wg.x0) / 0.1), j = Math.round((z - Wg.z0) / 0.1); return i < 0 || j < 0 || i >= Wg.nx || j >= Wg.nz ? -1 : regLab[i * Wg.nz + j];
    }
    const inMain = (x, z) => region(x, z) === regMain;
    // somewhere clear for something r wide (radius), away from the edge and everything else, on the island proper
    function spot(r, near, tries = 400) {
      claim(); P.grid(); const b = o.bounds;
      for (let i = 0; i < tries; i++) {
        const x = near ? near.x + (Math.random() - 0.5) * near.d * 2 : b.x0 + Math.random() * (b.x1 - b.x0), z = near ? near.z + (Math.random() - 0.5) * near.d * 2 : b.z0 + Math.random() * (b.z1 - b.z0);
        if (o.floorAt(x, z) > -4 && P.clearance(x, z, 'kid') > r && inMain(x, z)) return { x, z };
      }
      return null;
    }

    // ---- bodies: a body package's character, with the walk engine's state for it
    function add(pk, x, z, opts = {}) {
      claim(); const inst = pk.make(opts), A = { pos: new T.Vector3(x, Math.max(0, o.floorAt(x, z)), z), yaw: opts.yaw || 0, path: [], st: 'stand', until: 0, ph: Math.random() * 6, stuck: 0 };
      inst.group.position.copy(A.pos); group.add(inst.group);
      inst.group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      const b = { pk, inst, A, cls: pk.cls, R: P.BODY[pk.cls].r }; bodies.push(b); return b;
    }
    const others = b => bodies.filter(q => q !== b).map(q => ({ x: q.A.pos.x, z: q.A.pos.z, r: q.R }));
    const pose = (b, st, t) => { try { b.pk.pose(b.inst, st, t, b.A.ph); } catch (e) { /* a model still loading */ } };

    // walks to a point (task: what to do on arrival)
    function go(b, to, task) {
      const path = P.route(b.A.pos, to, b.cls); if (!path || !path.length) return false;
      Object.assign(b.A, { path, st: 'walk', task: task || null, stuck: 0 }); return true;
    }
    // somewhere to wander to: a clear point a few steps away
    function wander(b) {
      for (let i = 0; i < 12; i++) { const a = Math.random() * Math.PI * 2, d = 1.5 + Math.random() * 3.5, x = b.A.pos.x + Math.sin(a) * d, z = b.A.pos.z + Math.cos(a) * d; if (o.floorAt(x, z) > -4 && P.clearance(x, z, b.cls) > b.R + 0.15 && go(b, { x, z })) return true; }
      return false;
    }

    // ---- using things (items.js USE, placed with the shared placeOn above): seats, pet beds, a telescope…
    const usable = (it, kid) => { const u = it.use; return u && (kid ? u.kid && u.kind !== 'lie' : u.pet && u.pets !== false); };
    const taken = it => bodies.filter(q => q.A.use && q.A.use.it === it).map(q => q.A.use.seat).concat(bodies.filter(q => q.A.task && q.A.task.it === it).map(q => q.A.task.seat));
    function chooseUse(b) {
      const kid = !!b.pk.kid;
      for (const it of items.filter(i => usable(i, kid)).sort(() => Math.random() - 0.5)) {
        const used = taken(it), n = it.use.kind === 'sit' ? (it.use.seats || [0]).length : 1, free = [...Array(n).keys()].filter(i => !used.includes(i)); if (!free.length) continue;
        const seat = free[Math.floor(Math.random() * free.length)]; if (go(b, approach(it, kid, seat), { use: true, it, seat })) return true;
      }
      return false;
    }
    function useIt(b, it, seat, t) {
      const A = b.A, inst = b.inst, kid = !!b.pk.kid, u = it.use, at = placeOn(it, A.pos, { kid, seat, taken: taken(it).filter(i => i !== seat) }), [d0, d1] = u.dur || [15, 30];
      A.slide = { from: A.pos.clone(), yaw0: A.yaw, t0: t, dur: 0.7 }; A.pos.set(at.x, at.y, at.z); A.yaw = at.yaw; A.path = []; A.task = null; A.stuck = 0;
      A.use = { it, seat: at.seat, pose: kid ? u.kid : u.pet, moves: (kid ? u.kidMoves : u.petMoves) || null, nextMove: t + 5 + Math.random() * 4, until: t + d0 + Math.random() * (d1 - d0) };
      if (at.floorY != null) inst.floorY = at.floorY;
      inst.fit = { z: 0, y: 0, recline: 0 }; inst.fitMode = at.fitMode;
    }
    function getUp(b, t) {
      const A = b.A, it = A.use.it; A.use = null; A.slide = null; b.inst.fitMode = null; b.inst.floorY = null;
      const sp = getOff(it, A, b.cls, others(b)); A.until = t + 1 + Math.random() * 2; A.stuck = 0; A.trapped = false;
      if (sp) { A.path = [sp]; A.st = 'walk'; A.free = true; } else A.st = 'stand'; // steps down off it
    }

    // ---- one beat for one body
    function step(b, t, dt) {
      const A = b.A, inst = b.inst, g = inst.group, P_ = P, R = b.R, kid = !!b.pk.kid;
      inst.cam = o.cam;
      if (kid) inst.bodies = bodies.filter(q => q !== b).flatMap(q => { const p = q.A.pos, f = [Math.sin(q.A.yaw), Math.cos(q.A.yaw)]; return q.pk.kid ? [{ x: p.x, y: p.y + 1.0, z: p.z, r: 0.4 }] : [{ x: p.x, y: p.y + 0.32, z: p.z, r: 0.3 }, { x: p.x + f[0] * 0.3, y: p.y + 0.5, z: p.z + f[1] * 0.3, r: 0.2 }]; });
      if (!A.placed && P_.grid()) { A.placed = true; const sp = P_.nearestClear(A.pos.x, A.pos.z, b.cls); if (sp) A.pos.set(sp.x, Math.max(0, o.floorAt(sp.x, sp.z)), sp.z); } // never starts inside something
      // sliding into a seat or off it, turning round as it goes
      if (A.happy > t && !A.use && !A.slide) { g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); pose(b, 'happy', t); return; } // tapped: a wave, a wag
      if (A.use) { // using something: onto it, the move's branches in turn, then up and off again
        if (t > A.use.until && !A.slide) { getUp(b, t); return; }
        if (!slideBeat(g, A, t)) { g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); }
        pose(b, nextMove(A.use, t), t); return;
      }
      if (A.st === 'walk' && A.path.length) {
        inst.walkD = (inst.walkD || 0) + stride(A, { P: P_, cls: b.cls, R, speed: b.pk.speed, turnR: b.pk.turnR, dt, others: others(b), ground: (x, z) => Math.max(0, o.floorAt(x, z)) }); // ground covered: the feet step in time with it
        inst.room = P_.clearance(A.pos.x, A.pos.z, b.cls);
        g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0);
        inst.focus = kid ? new T.Vector3(A.pos.x + Math.sin(A.yaw) * 3, A.pos.y + 1.4, A.pos.z + Math.cos(A.yaw) * 3) : null;
        pose(b, 'walk', t);
        if (!A.path.length) {
          const tk = A.task; A.task = null;
          A.free = false;
          if (tk && tk.use) return useIt(b, tk.it, tk.seat, t);
          A.st = b.pk.idle[Math.floor(Math.random() * b.pk.idle.length)]; A.until = t + 3 + Math.random() * (A.st === 'sleep' ? 9 : 4);
          if (A.st === 'look') A.wantYaw = A.yaw + (Math.random() - 0.5) * 2;
        }
        return;
      }
      // standing about
      if (A.st === 'walk') A.st = 'stand';
      inst.fitMode = kid ? 'clear' : null; if (kid) inst.fit = inst.fit || { z: 0, y: 0, recline: 0 }; // arms and all kept out of things
      if (t > A.until) {
        const r = Math.random(); let moved = false;
        if (b.pk.follows) { const lead = bodies.find(q => q.pk.cls === b.pk.follows); if (lead && Math.hypot(lead.A.pos.x - A.pos.x, lead.A.pos.z - A.pos.z) > 2.2 && r < 0.7) { const a = Math.random() * 6.283, sp = { x: lead.A.pos.x + Math.sin(a) * 1.1, z: lead.A.pos.z + Math.cos(a) * 1.1 }; moved = go(b, sp); } }
        if (!moved && (kid || b.pk.pet) && r < (kid ? 0.4 : 0.25)) moved = chooseUse(b); // (farm and bush animals don't sit on benches) // the kid sits or looks through the telescope; a pet curls up in its bed or hops on the bench
        if (!moved && r < 0.85) moved = wander(b);
        if (!moved) { A.st = b.pk.idle[Math.floor(Math.random() * b.pk.idle.length)]; A.until = t + 3 + Math.random() * 4; }
      }
      if (A.wantYaw != null) { const d = wrapA(A.wantYaw - A.yaw); A.yaw += clamp(d, -3 * dt, 3 * dt); if (Math.abs(d) < 0.02) A.wantYaw = null; }
      g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); inst.focus = null;
      pose(b, A.st === 'walk' ? 'stand' : A.st, t);
    }

    function tick(t, dt) { claim(); if (!P.grid()) return; dt = Math.min(dt, 0.05); for (const b of bodies) step(b, t, dt); }
    function end() { if (group.parent) group.parent.remove(group); bodies.length = 0; items.length = 0; if (P.env === env) { P.env = null; P.forget(); } IH.groundAt = null; }
    // tapped: stops, turns toward whoever's looking and waves (the kid) or wags (a pet), a moment
    function hello(b, t) { if (b.A.use) return; const c = o.cam && o.cam.position; if (c) b.A.yaw = Math.atan2(c.x - b.A.pos.x, c.z - b.A.pos.z); b.A.happy = t + 1.6; b.A.path = []; b.A.st = 'stand'; b.A.until = t + 2; }
    // what a ray (screen tap) hits: { body } or { item }, the nearest
    function pick(ray) {
      const hits = ray.intersectObject(group, true); for (const h of hits) { let o2 = h.object; while (o2 && o2 !== group) { const b = bodies.find(q => q.inst.group === o2); if (b) return { body: b }; const it = items.find(q => q.group === o2); if (it) return { item: it }; o2 = o2.parent; } }
      return null;
    }
    // a thing turned to a new yaw, or taken away; a body taken away (sold)
    function turn(it, yaw) { claim(); it.group.rotation.y = yaw; it.yaw = yaw; it.group.updateMatrixWorld(true); it.field = null; P.forget(); }
    function remove(x) {
      claim(); const i = items.indexOf(x); if (i >= 0) { items.splice(i, 1); group.remove(x.group); for (const b of bodies) if (b.A.use && b.A.use.it === x) { b.A.use = null; b.A.slide = null; b.inst.fitMode = null; b.A.st = 'stand'; } P.forget(); return; }
      const j = bodies.indexOf(x); if (j >= 0) { bodies.splice(j, 1); group.remove(x.inst.group); }
    }
    const W = { group, add, put, spot, tick, end, bodies, items, go, chooseUse, hello, pick, turn, remove }; IH.walk.last = W; // (the latest world, for checking from the console)
    return W;
  }
  IH.walk = { world, stride, placeOn, approach, nextMove, slideBeat, getOff, bedZone };
})();
