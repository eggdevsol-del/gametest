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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));

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
    // somewhere clear for something r wide (radius), away from the edge and everything else
    function spot(r, near, tries = 400) {
      claim(); P.grid(); const b = o.bounds;
      for (let i = 0; i < tries; i++) {
        const x = near ? near.x + (Math.random() - 0.5) * near.d * 2 : b.x0 + Math.random() * (b.x1 - b.x0), z = near ? near.z + (Math.random() - 0.5) * near.d * 2 : b.z0 + Math.random() * (b.z1 - b.z0);
        if (o.floorAt(x, z) > -4 && P.clearance(x, z, 'kid') > r) return { x, z };
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

    // ---- seats (items.js USE kind 'sit'): where the hips go and where to stand in front
    const rotY = (yaw, x, z) => [x * Math.cos(yaw) + z * Math.sin(yaw), -x * Math.sin(yaw) + z * Math.cos(yaw)];
    function seatAt(it, i, kid) {
      const u = it.use, c = it.group.position, lx = (u.seats || [0])[i], [fx, fz] = rotY(it.yaw, lx, it.def.fp[1] / 2 + 0.5), [sx, sz] = rotY(it.yaw, lx, kid ? -0.2 : 0.05);
      return { front: { x: c.x + fx, z: c.z + fz }, seat: new T.Vector3(c.x + sx, c.y + u.h - (kid ? 0.41 : 0), c.z + sz) };
    }
    const taken = it => bodies.filter(q => q.A.use && q.A.use.it === it).map(q => q.A.use.i).concat(bodies.filter(q => q.A.task && q.A.task.it === it).map(q => q.A.task.i));
    function chooseSeat(b) {
      const kid = !!b.pk.kid, seats = items.filter(it => it.use && it.use.kind === 'sit' && (kid ? it.use.kid : it.use.pet));
      for (const it of seats.sort(() => Math.random() - 0.5)) { const used = taken(it), free = (it.use.seats || [0]).map((s, i) => i).filter(i => !used.includes(i)); if (!free.length) continue; const i = free[Math.floor(Math.random() * free.length)]; if (go(b, seatAt(it, i, kid).front, { sit: true, it, i })) return true; }
      return false;
    }
    function sitDown(b, it, i, t) {
      const A = b.A, inst = b.inst, kid = !!b.pk.kid, u = it.use, s = seatAt(it, i, kid), [d0, d1] = u.dur || [15, 30];
      A.slide = { from: A.pos.clone(), to: s.seat.clone(), yaw0: A.yaw, yaw1: it.yaw, t0: t, dur: 0.7 };
      A.pos.copy(s.seat); A.yaw = it.yaw; A.path = []; A.task = null;
      if (!kid) { const y = P.support(s.seat.x, s.seat.y + 0.9, s.seat.z); if (y > -1e8) A.pos.y = y; A.slide.to.y = A.pos.y; }
      const moves = kid ? u.kidMoves : u.petMoves;
      A.use = { it, i, pose: kid ? u.kid : u.pet, moves: moves || null, nextMove: t + 5 + Math.random() * 4, until: t + d0 + Math.random() * (d1 - d0), front: s.front };
      inst.fit = { z: 0, y: 0, recline: 0 }; inst.fitMode = kid && u.kid === 'sitchair' ? 'seat' : null;
    }
    function standUp(b, t) {
      const A = b.A, U = A.use; A.use = null; b.inst.fitMode = null;
      const to = new T.Vector3(U.front.x, Math.max(0, o.floorAt(U.front.x, U.front.z)), U.front.z);
      A.slide = { from: A.pos.clone(), to, yaw0: A.yaw, yaw1: A.yaw, t0: t, dur: 0.6, up: true }; A.pos.copy(to); A.until = t + 1 + Math.random() * 2; A.st = 'stand';
    }

    // ---- one beat for one body
    function step(b, t, dt) {
      const A = b.A, inst = b.inst, g = inst.group, P_ = P, R = b.R, kid = !!b.pk.kid;
      inst.cam = o.cam;
      if (kid) inst.bodies = bodies.filter(q => q !== b).flatMap(q => { const p = q.A.pos, f = [Math.sin(q.A.yaw), Math.cos(q.A.yaw)]; return q.pk.kid ? [{ x: p.x, y: p.y + 1.0, z: p.z, r: 0.4 }] : [{ x: p.x, y: p.y + 0.32, z: p.z, r: 0.3 }, { x: p.x + f[0] * 0.3, y: p.y + 0.5, z: p.z + f[1] * 0.3, r: 0.2 }]; });
      if (!A.placed && P_.grid()) { A.placed = true; const sp = P_.nearestClear(A.pos.x, A.pos.z, b.cls); if (sp) A.pos.set(sp.x, Math.max(0, o.floorAt(sp.x, sp.z)), sp.z); } // never starts inside something
      // sliding into a seat or off it, turning round as it goes
      if (A.slide) {
        const S = A.slide, p = clamp((t - S.t0) / S.dur, 0, 1), e = ease(p); g.position.lerpVectors(S.from, S.to, e); g.rotation.set(0, S.yaw0 + wrapA(S.yaw1 - S.yaw0) * e, 0);
        pose(b, A.use ? A.use.pose : 'stand', t); if (p >= 1) A.slide = null; return;
      }
      if (A.use) { // sitting: the move's branches in turn, then up again
        const U = A.use;
        if (t > U.until) { standUp(b, t); return; }
        if (U.moves && t > U.nextMove) { const m = U.moves.filter(q => q !== U.pose); U.pose = m[Math.floor(Math.random() * m.length)] || U.pose; U.nextMove = t + 5 + Math.random() * 5; }
        g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); pose(b, U.pose, t); return;
      }
      if (A.st === 'walk' && A.path.length) {
        const turnR = b.pk.turnR, speed = b.pk.speed;
        while (A.path.length > 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.28) A.path.shift(); // (passed close by: on to the next)
        let rest = 0, ax = A.pos.x, az = A.pos.z; for (const q of A.path) { rest += Math.hypot(q.x - ax, q.z - az); ax = q.x; az = q.z; }
        const look = dist => { let px = A.pos.x, pz = A.pos.z, left = dist; for (const q of A.path) { const L = Math.hypot(q.x - px, q.z - pz); if (L >= left) return { x: px + (q.x - px) / L * left, z: pz + (q.z - pz) / L * left }; left -= L; px = q.x; pz = q.z; } return { x: px, z: pz }; };
        const wp = A.path[0], final = A.path.length === 1 && rest < 0.45;
        // heads for a point half a tile along the route, pulled in until there's a clear straight line to it
        let aim = wp; if (!final) for (const L of [0.5, 0.35, 0.22]) { const q = look(L); if (P_.sees(A.pos, q, b.cls)) { aim = q; break; } }
        const want = Math.atan2(aim.x - A.pos.x, aim.z - A.pos.z), off = wrapA(want - A.yaw), aoff = Math.abs(off);
        const room = P_.clearance(A.pos.x, A.pos.z, b.cls), cramped = room < R + 0.12;
        const v = speed * (final ? Math.max(0.35, Math.min(1, rest / 0.45)) : 1) * (aoff > 1.2 || (aoff > 0.9 && cramped) ? 0 : Math.pow(Math.cos(aoff), 1.5));
        const wmax = Math.min(5.5, Math.max(2.6, v / turnR)); A.yaw = wrapA(A.yaw + clamp(off, -wmax * dt, wmax * dt));
        const sp = v * dt; let nx, nz;
        if (final) { const d = Math.hypot(wp.x - A.pos.x, wp.z - A.pos.z); if (d <= sp || d < 0.01) { nx = wp.x; nz = wp.z; A.path.shift(); } else { nx = A.pos.x + (wp.x - A.pos.x) * sp / d; nz = A.pos.z + (wp.z - A.pos.z) * sp / d; } }
        else { nx = A.pos.x + Math.sin(A.yaw) * sp; nz = A.pos.z + Math.cos(A.yaw) * sp; }
        for (const q of others(b)) { const ox = nx - q.x, oz = nz - q.z, od = Math.hypot(ox, oz), m = q.r + R; if (od < m && od > 1e-4) { const k = (m - od) * 0.5; nx += ox / od * k; nz += oz / od * k; } } // bodies push apart
        const c0 = P_.clearance(A.pos.x, A.pos.z, b.cls), ok = (x, z) => { const c = P_.clearance(x, z, b.cls); return c >= R * 0.97 || c >= c0 - 0.002; }; // (squeezed in: any move no tighter is fine, so it's never stuck)
        if (!ok(nx, nz)) { if (ok(nx, A.pos.z)) nz = A.pos.z; else if (ok(A.pos.x, nz)) nx = A.pos.x; else { nx = A.pos.x; nz = A.pos.z; } } // slides along what it brushes
        if (Math.hypot(nx - A.pos.x, nz - A.pos.z) < sp * 0.3) A.stuck += dt; else A.stuck = 0;
        const gy = Math.max(0, o.floorAt(nx, nz));
        inst.walkD = (inst.walkD || 0) + Math.hypot(nx - A.pos.x, nz - A.pos.z); // ground covered: the feet step in time with it
        A.pos.x = nx; A.pos.z = nz; A.pos.y += (gy - A.pos.y) * Math.min(1, dt * 12);
        inst.room = P_.clearance(A.pos.x, A.pos.z, b.cls);
        g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0);
        inst.focus = kid ? new T.Vector3(A.pos.x + Math.sin(A.yaw) * 3, A.pos.y + 1.4, A.pos.z + Math.cos(A.yaw) * 3) : null;
        pose(b, 'walk', t);
        if (A.stuck > 0.5 && A.task && A.path.length === 1 && Math.hypot(A.path[0].x - A.pos.x, A.path[0].z - A.pos.z) < 0.4) A.path = []; // close enough
        if (A.stuck > 1.2 && A.path.length) { const end = A.path[A.path.length - 1], np = P_.route(A.pos, end, b.cls); A.stuck = 0; A.path = np || []; } // blocked: finds another way
        if (!A.path.length) {
          const tk = A.task; A.task = null;
          if (tk && tk.sit) return sitDown(b, tk.it, tk.i, t);
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
        if (!moved && kid && r < 0.4) moved = chooseSeat(b);
        if (!moved && r < 0.85) moved = wander(b);
        if (!moved) { A.st = b.pk.idle[Math.floor(Math.random() * b.pk.idle.length)]; A.until = t + 3 + Math.random() * 4; }
      }
      if (A.wantYaw != null) { const d = wrapA(A.wantYaw - A.yaw); A.yaw += clamp(d, -3 * dt, 3 * dt); if (Math.abs(d) < 0.02) A.wantYaw = null; }
      g.position.copy(A.pos); g.rotation.set(0, A.yaw, 0); inst.focus = null;
      pose(b, A.st === 'walk' ? 'stand' : A.st, t);
    }

    function tick(t, dt) { claim(); if (!P.grid()) return; dt = Math.min(dt, 0.05); for (const b of bodies) step(b, t, dt); }
    function end() { if (group.parent) group.parent.remove(group); bodies.length = 0; items.length = 0; if (P.env === env) { P.env = null; P.forget(); } IH.groundAt = null; }
    const W = { group, add, put, spot, tick, end, bodies, items, go, chooseSeat }; IH.walk.last = W; // (the latest world, for checking from the console)
    return W;
  }
  IH.walk = { world };
})();
