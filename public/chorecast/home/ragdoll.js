/* Chorecast homes (a prototype): soft toys as ragdolls.
   A teddy is six soft parts (body, head, two arms, two legs) joined by springy links (Verlet, like the duvet in
   cloth.js). It falls and flops, rolls and settles on the floor, a table or a bed, and stays where it ends up. A pet
   can take hold of any part with its mouth or pin it under its paws (pin), drag it, shake it so the rest flails, or
   throw it (push). Two pets holding different parts pull against each other (a tug of war). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit, shade } = IH.kit;

  // The teddy's parts sitting up (its rest pose), in the item's own space (it faces +z), with their sizes.
  const DARK = '#5b4a5e';
  const PARTS = {
    body: { at: [0, 0.22, 0], r: 0.2 },
    head: { at: [0, 0.55, 0.02], r: 0.16 },
    armL: { at: [0.21, 0.3, 0.06], r: 0.07, from: 'body' },
    armR: { at: [-0.21, 0.3, 0.06], r: 0.07, from: 'body' },
    legL: { at: [0.12, 0.07, 0.15], r: 0.08, from: 'body' },
    legR: { at: [-0.12, 0.07, 0.15], r: 0.08, from: 'body' }
  };
  const NAMES = Object.keys(PARTS);
  // springy links: [a, b, stiffness]. The braces keep it bear-shaped as it flops.
  const LINKS = [['body', 'head', 1], ['body', 'armL', 1], ['body', 'armR', 1], ['body', 'legL', 1], ['body', 'legR', 1],
    ['head', 'armL', 0.25], ['head', 'armR', 0.25], ['armL', 'armR', 0.2], ['legL', 'legR', 0.3], ['head', 'legL', 0.15], ['head', 'legR', 0.15]];

  // Each part's own little model, drawn about its centre: the body and head face +z with +y up; a limb runs along +y
  // from where it joins the body.
  function partModel(name, c = '#d39a64') {
    const k = new Kit(), c2 = '#f3d1a8', d = shade(c, -0.15);
    if (name === 'body') { k.ball(0.22, 0, 0, 0, c, { s: [1, 1.05, 0.9], n: 16 }); k.ball(0.12, 0, -0.02, 0.15, c2, { s: [1, 1.1, 0.5], n: 12 }); k.box(0.006, 0.3, 0.006, 0, -0.12, 0.205, d, { r: 0.002 }); k.torus(0.1, 0.025, 0, 0.18, 0.02, '#e86f6f', { rx: Math.PI / 2 }); k.ball(0.04, 0.06, 0.17, 0.12, '#e86f6f', { s: [1.5, 1, 0.6], n: 8 }); k.ball(0.04, -0.06, 0.17, 0.12, '#e86f6f', { s: [1.5, 1, 0.6], n: 8 }); }
    if (name === 'head') {
      k.ball(0.17, 0, 0, 0, c, { n: 16 }); k.ball(0.075, 0, -0.05, 0.14, c2, { s: [1.1, 0.85, 1], n: 12 }); k.ball(0.028, 0, -0.02, 0.215, DARK, { s: [1.3, 0.9, 1], n: 8 });
      for (const x of [-0.065, 0.065]) { k.ball(0.026, x, 0.05, 0.13, DARK, { n: 8 }); k.ball(0.008, x + 0.008, 0.06, 0.152, '#ffffff', { n: 6 }); }
      for (const x of [-0.13, 0.13]) { k.ball(0.07, x, 0.14, -0.02, c, { s: [1, 1, 0.6], n: 12 }); k.ball(0.04, x, 0.14, 0.005, c2, { s: [1, 1, 0.4], n: 10 }); }
    }
    if (name === 'armL' || name === 'armR') k.ball(0.08, 0, 0.04, 0, c, { s: [0.9, 1.4, 0.9], n: 12 });
    if (name === 'legL' || name === 'legR') { k.ball(0.09, 0, 0.04, 0, c, { s: [1, 1.3, 1], n: 12 }); k.ball(0.055, 0, 0.12, 0.03, c2, { s: [1, 0.35, 1], n: 10 }); }
    return k.build();
  }

  const V = () => new T.Vector3(), M = new T.Matrix4(), Q = new T.Quaternion(), QI = new T.Quaternion(), A = V(), B = V(), C = V(), UP = new T.Vector3(0, 1, 0);
  const G = 19.6; // gravity, in tiles a second a second (a tile is about half a metre)

  class Doll {
    // group: the item's group (the parts are drawn inside it); at: where it sits (world), yaw: which way it faces;
    // saved: particle positions from last time (it stays where it was left)
    constructor(group, at, yaw, saved) {
      this.group = group; this.p = {}; this.o = {}; this.r = {}; this.mesh = {}; this.pins = {}; this.rest = {}; this.still = 0; this.asleep = true;
      const cs = Math.cos(yaw), sn = Math.sin(yaw);
      for (const n of NAMES) {
        const [x, y, z] = PARTS[n].at, w = saved && saved[n] ? new T.Vector3(...saved[n]) : new T.Vector3(at.x + x * cs + z * sn, at.y + y, at.z - x * sn + z * cs);
        this.p[n] = w; this.o[n] = w.clone(); this.r[n] = PARTS[n].r;
        const m = partModel(n); group.add(m); this.mesh[n] = m;
      }
      this.len = LINKS.map(([a, b]) => { const pa = PARTS[a].at, pb = PARTS[b].at; return Math.hypot(pa[0] - pb[0], pa[1] - pb[1], pa[2] - pb[2]); });
      this.yaw = yaw; this.draw();
    }
    // hold a part at a world point (each beat while held); null lets go
    pin(part, at, who) { if (at) { this.pins[part] = { at: at.clone(), who }; this.asleep = false; } else delete this.pins[part]; }
    let(who) { for (const k of Object.keys(this.pins)) if (!who || this.pins[k].who === who) delete this.pins[k]; }
    heldBy() { return [...new Set(Object.values(this.pins).map(p => p.who))]; }
    // a shove: velocity added to one part (or all), in tiles a second
    push(part, vx, vy, vz, dt = 1 / 30) { for (const n of part ? [part] : NAMES) { this.o[n].x -= vx * dt; this.o[n].y -= vy * dt; this.o[n].z -= vz * dt; } this.asleep = false; this.still = 0; }
    centre(out = V()) { return out.copy(this.p.body); }
    nearest(at) { let best = 'body', bd = 1e9; for (const n of NAMES) { const d = this.p[n].distanceTo(at); if (d < bd) { bd = d; best = n; } } return best; }
    // ground: (x, y, z) -> the height of whatever is under that point (floor, rug, table top, bed)
    // walls: (from, to) -> false when a wall is between them (a part never goes through one)
    step(dt, ground, bounds, walls) {
      const before = walls ? Object.fromEntries(NAMES.map(n => [n, { x: this.p[n].x, z: this.p[n].z }])) : null;
      if (this.asleep && !Object.keys(this.pins).length) return;
      dt = Math.min(dt, 1 / 30); const steps = 2, h = dt / steps;
      for (let s = 0; s < steps; s++) {
        for (const n of NAMES) {
          const p = this.p[n], o = this.o[n], vx = (p.x - o.x) * 0.985, vy = (p.y - o.y) * 0.985, vz = (p.z - o.z) * 0.985;
          o.copy(p); p.x += vx; p.y += vy - G * h * h; p.z += vz;
        }
        for (let it = 0; it < 6; it++) {
          LINKS.forEach(([a, b, k], i) => {
            const pa = this.p[a], pb = this.p[b], dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, d = Math.hypot(dx, dy, dz) || 1e-6, diff = (d - this.len[i]) / d * 0.5 * k;
            const wa = this.pins[a] ? 0 : 1, wb = this.pins[b] ? 0 : 1, sw = wa + wb || 1;
            pa.x += dx * diff * 2 * wa / sw; pa.y += dy * diff * 2 * wa / sw; pa.z += dz * diff * 2 * wa / sw;
            pb.x -= dx * diff * 2 * wb / sw; pb.y -= dy * diff * 2 * wb / sw; pb.z -= dz * diff * 2 * wb / sw;
          });
          for (const n of Object.keys(this.pins)) { const t = this.pins[n].at; this.p[n].copy(t); }
          for (const n of NAMES) {
            const p = this.p[n], o = this.o[n], r = this.r[n];
            if (bounds) { p.x = Math.max(bounds.x0 + r, Math.min(bounds.x1 - r, p.x)); p.z = Math.max(bounds.z0 + r, Math.min(bounds.z1 - r, p.z)); }
            if (bounds && bounds.round) { const R0 = bounds.round, m = R0.r - r, d = Math.hypot(p.x - R0.cx, p.z - R0.cz); if (d > m) { p.x = R0.cx + (p.x - R0.cx) * m / d; p.z = R0.cz + (p.z - R0.cz) * m / d; } } // (a round island)
            const g = ground(p.x, p.y, p.z);
            if (p.y < g + r) { p.y = g + r; o.x += (p.x - o.x) * 0.35; o.z += (p.z - o.z) * 0.35; if (o.y < p.y) o.y = p.y - (o.y - p.y) * 0.25; } // on the ground: friction, a soft little bounce
          }
        }
      }
      if (walls) for (const n of NAMES) { const p = this.p[n]; if (!walls(before[n], p)) { p.x = before[n].x; p.z = before[n].z; this.o[n].x = p.x; this.o[n].z = p.z; } } // through a wall: no
      // settle: asleep once it's lain still for a moment (it then costs nothing)
      let mv = 0; for (const n of NAMES) mv = Math.max(mv, this.p[n].distanceTo(this.o[n]));
      this.still = mv < 0.0015 && !Object.keys(this.pins).length ? this.still + dt : 0; if (this.still > 0.8) this.asleep = true;
      this.draw();
    }
    // the parts' models follow the particles: body and head turned by where the head, arms and legs are; each limb
    // pointing away from the body
    draw() {
      const g = this.group; g.updateMatrixWorld(true); const gi = g.getWorldQuaternion(QI).invert();
      const up = A.copy(this.p.head).sub(this.p.body).normalize(), side = B.copy(this.p.armL).sub(this.p.armR); side.addScaledVector(up, -side.dot(up)); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize();
      const fwd = C.crossVectors(side, up).normalize();
      M.makeBasis(side, up, fwd); Q.setFromRotationMatrix(M);
      for (const n of ['body', 'head']) { const m = this.mesh[n]; m.position.copy(g.worldToLocal(this.p[n].clone())); m.quaternion.copy(gi).multiply(Q); }
      for (const n of ['armL', 'armR', 'legL', 'legR']) {
        const m = this.mesh[n], dir = this.p[n].clone().sub(this.p.body).normalize();
        m.position.copy(g.worldToLocal(this.p[n].clone())); m.quaternion.copy(gi).multiply(new T.Quaternion().setFromUnitVectors(UP, dir)).multiply(new T.Quaternion().setFromAxisAngle(UP, 0));
      }
    }
    save() { const o = {}; for (const n of NAMES) o[n] = this.p[n].toArray().map(v => +v.toFixed(3)); return o; }
    dispose() { for (const n of NAMES) { const m = this.mesh[n]; this.group.remove(m); m.traverse(x => { if (x.isMesh) x.geometry.dispose(); }); } }
  }

  IH.ragdoll = { Doll, PARTS, NAMES, TOYS: new Set(['teddy']) };
})();
