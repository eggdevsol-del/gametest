/* Chorecast homes (a prototype): bodies against the home.
   One collision grid for the whole home (10 cm points). Each point holds the solid layers above it, bottom to top:
   the floor, a wall, the plot's edge and every placed thing, each thing measured from its own model (rays straight
   down find every top surface, rays straight up every underside, so a desk is its top with room for legs under it,
   a bookcase is each shelf, a sofa its seat and its tall back). The grid is redrawn whenever something is placed,
   moved or put away. From it, for each kind of body (the character, a pet), a walking map: where it would bump into
   something between its feet and the top of its head, and how far every point is from the nearest such thing.
   Bodies then never go into anything:
     · walking: routes go any way, diagonals and curves too, keeping the body's width clear of everything
     · sitting: the hips rest on what is really under them, the back slides to the backrest, each leg hangs or
       rests where gravity puts it without going into anything (any seat, any shape, nothing set up per item)
     · standing at things or doing a chore, the whole body (arms too) keeps out of them
   The tail is left out: it may brush through things. Characters and pets keep apart as moving bodies (app.js). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const S = 0.08, G = 0.1, L = 4, RC = new T.Raycaster(), DOWN = new T.Vector3(0, -1, 0), UP = new T.Vector3(0, 1, 0), O3 = new T.Vector3();
  // env, set by the home: { things() → item instances, floorAt(x, z) (-5 off the plot), wallAt(x, z) → height or 0,
  //   bounds() → { x0, z0, x1, z1 } }
  let env = null, W = null;
  // bodies: the height they take up above the floor and how wide they are (their radius, walking)
  const BODY = { kid: { lo: 0.12, hi: 2.15, r: 0.32 }, pet: { lo: 0.1, hi: 0.8, r: 0.22 } };

  // ---- the layers of one thing (world space, measured once and again when it's moved)
  function hitsAll(meshes, from, dir) { RC.set(from, dir); return RC.intersectObjects(meshes, false).map(h => h.point.y); }
  function field(inst) {
    if (inst.field) return inst.field;
    const g = inst.group; g.updateMatrixWorld(true);
    const meshes = []; g.traverseVisible(m => { if (m.isMesh && !m.userData.noHit) meshes.push(m); });
    const bb = new T.Box3(); for (const m of meshes) { m.geometry.boundingBox || m.geometry.computeBoundingBox(); bb.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld)); }
    if (bb.isEmpty()) return (inst.field = { nx: 0 });
    const nx = Math.ceil((bb.max.x - bb.min.x) / S) + 1, nz = Math.ceil((bb.max.z - bb.min.z) / S) + 1;
    const n = new Uint8Array(nx * nz), sp = new Float32Array(nx * nz * L * 2);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = bb.min.x + i * S, z = bb.min.z + j * S;
      const tops = hitsAll(meshes, O3.set(x, bb.max.y + 1, z), DOWN); if (!tops.length) continue;
      const bots = hitsAll(meshes, O3.set(x, bb.min.y - 1, z), UP);
      // each top surface with the nearest underside below it is one solid layer (none below: solid to the floor)
      const lay = [];
      for (const t of tops) { if (lay.some(([, tt]) => Math.abs(tt - t) < 0.01)) continue; let b = -1e9; for (const u of bots) if (u < t - 0.005 && u > b) b = u; lay.push([b, t]); }
      lay.sort((a, b2) => a[0] - b2[0]);
      const mg = []; for (const s of lay) { const l = mg[mg.length - 1]; if (l && s[0] <= l[1] + 0.01) l[1] = Math.max(l[1], s[1]); else mg.push([s[0], s[1]]); }
      while (mg.length > L) { const a = mg.shift(); mg[0][0] = a[0]; } // too many: the lowest join up
      const c = i * nz + j; n[c] = mg.length; mg.forEach(([b, t], k) => { sp[(c * L + k) * 2] = b; sp[(c * L + k) * 2 + 1] = t; });
    }
    return (inst.field = { x0: bb.min.x, z0: bb.min.z, nx, nz, n, sp });
  }
  function forget(inst) { if (inst) inst.field = null; W = null; }

  // ---- the home's grid: every point's layers, then the walking maps
  function addSpan(c, b, t) {
    const k = W.n[c]; if (k >= L) { const i = (c * L + L - 1) * 2; W.sp[i] = Math.min(W.sp[i], b); W.sp[i + 1] = Math.max(W.sp[i + 1], t); return; }
    W.sp[(c * L + k) * 2] = b; W.sp[(c * L + k) * 2 + 1] = t; W.n[c] = k + 1;
  }
  function grid() {
    if (W || !env) return W;
    const b = env.bounds(), x0 = b.x0 - 0.5, z0 = b.z0 - 0.5, nx = Math.ceil((b.x1 - b.x0 + 1) / G) + 1, nz = Math.ceil((b.z1 - b.z0 + 1) / G) + 1, N = nx * nz;
    W = { x0, z0, nx, nz, n: new Uint8Array(N), sp: new Float32Array(N * L * 2), floor: new Float32Array(N), map: {}, dist: {} };
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = x0 + i * G, z = z0 + j * G, c = i * nz + j, f = env.floorAt(x, z); W.floor[c] = f;
      if (f < -4) { addSpan(c, -1e9, 1e9); continue; } // off the plot
      const w = env.wallAt(x, z); if (w) addSpan(c, -1e9, w);
    }
    for (const it of env.things()) {
      const f = field(it); if (!f.nx) continue;
      const i0 = Math.max(0, Math.floor((f.x0 - x0) / G)), i1 = Math.min(nx - 1, Math.ceil((f.x0 + (f.nx - 1) * S - x0) / G));
      const j0 = Math.max(0, Math.floor((f.z0 - z0) / G)), j1 = Math.min(nz - 1, Math.ceil((f.z0 + (f.nz - 1) * S - z0) / G));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const fi = Math.round((x0 + i * G - f.x0) / S), fj = Math.round((z0 + j * G - f.z0) / S); if (fi < 0 || fj < 0 || fi >= f.nx || fj >= f.nz) continue;
        const fc = fi * f.nz + fj; for (let k = 0; k < f.n[fc]; k++) addSpan(i * nz + j, f.sp[(fc * L + k) * 2], f.sp[(fc * L + k) * 2 + 1]);
      }
    }
    // walking maps: blocked where anything is between the feet and the top of the head; then how far each point
    // is from the nearest blocked one (two passes, 3-4 chamfer)
    for (const cls in BODY) {
      const { lo, hi } = BODY[cls], m = new Uint8Array(N), d = new Float32Array(N);
      for (let c = 0; c < N; c++) { const f = W.floor[c]; let bl = f < -4; for (let k = 0; k < W.n[c] && !bl; k++) { const s0 = W.sp[(c * L + k) * 2], s1 = W.sp[(c * L + k) * 2 + 1]; if (s1 > f + lo && s0 < f + hi) bl = true; } m[c] = bl ? 1 : 0; d[c] = bl ? 0 : 1e6; }
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const c = i * nz + j; if (!d[c]) continue; let v = d[c]; if (i) { v = Math.min(v, d[c - nz] + 3); if (j) v = Math.min(v, d[c - nz - 1] + 4); if (j < nz - 1) v = Math.min(v, d[c - nz + 1] + 4); } if (j) v = Math.min(v, d[c - 1] + 3); d[c] = v; }
      for (let i = nx - 1; i >= 0; i--) for (let j = nz - 1; j >= 0; j--) { const c = i * nz + j; if (!d[c]) continue; let v = d[c]; if (i < nx - 1) { v = Math.min(v, d[c + nz] + 3); if (j < nz - 1) v = Math.min(v, d[c + nz + 1] + 4); if (j) v = Math.min(v, d[c + nz - 1] + 4); } if (j < nz - 1) v = Math.min(v, d[c + 1] + 3); d[c] = v; }
      for (let c = 0; c < N; c++) d[c] = d[c] * G / 3 - G / 2; // to metres, measured to the blocked point's edge
      W.map[cls] = m; W.dist[cls] = d;
    }
    return W;
  }
  const col = (x, z) => { const i = Math.round((x - W.x0) / G), j = Math.round((z - W.z0) / G); return i < 0 || j < 0 || i >= W.nx || j >= W.nz ? -1 : i * W.nz + j; };

  // The solid layers at a point: [[bottom, top], …], the floor first.
  const SP = [];
  function spans(x, z) {
    SP.length = 0; if (!grid()) return SP;
    const c = col(x, z); if (c < 0) { SP.push([-1e9, 1e9]); return SP; }
    SP.push([-1e9, W.floor[c]]); for (let k = 0; k < W.n[c]; k++) SP.push([W.sp[(c * L + k) * 2], W.sp[(c * L + k) * 2 + 1]]);
    return SP;
  }
  // how deep a ball (centre x y z, radius r) is in something; 0 when clear (noFloor: the floor doesn't count, for
  // feet standing on it)
  function pen(x, y, z, r, noFloor) {
    let d = 0; const s = spans(x, z);
    for (let i = noFloor ? 1 : 0; i < s.length; i++) { const [b, t] = s[i]; if (y - r < t && y + r > b) d = Math.max(d, Math.min(t - (y - r), (y + r) - b)); }
    return d;
  }
  // the same, also counting other bodies (balls { x, y, z, r }: a pet, another character)
  function penAll(x, y, z, r, bodies) { let d = pen(x, y, z, r, true); if (bodies) for (const b of bodies) d = Math.max(d, b.r + r - Math.hypot(b.x - x, b.y - y, b.z - z)); return d; }
  const inside = (x, y, z) => spans(x, z).some(([b, t]) => y > b && y < t);
  // the highest top under a point at height y (what it would rest on)
  function support(x, y, z) { let s = -1e9; for (const [b, t] of spans(x, z)) if (b < y && t > s && t < y + 0.45) s = t; return s; }
  const floorAt = (x, z) => { if (!grid()) return 0; const c = col(x, z); return c < 0 ? 0 : W.floor[c]; };

  // samples along a capsule: centres and radius
  function balls(k, n) { const out = []; for (let i = 0; i < n; i++) { const u = n === 1 ? 0.5 : i / (n - 1); out.push([k.a.x + (k.b.x - k.a.x) * u, k.a.y + (k.b.y - k.a.y) * u, k.a.z + (k.b.z - k.a.z) * u, k.r]); } return out; }
  // how far a point can move along (dx, dz) before it meets something (negative: it's in something, and how far
  // the other way it has to go to be clear), up to `max`
  function room(x, y, z, dx, dz, max) {
    if (inside(x, y, z)) { for (let d = 0.02; d <= max; d += 0.02) if (!inside(x - dx * d, y, z - dz * d)) return -d; return -max; }
    for (let d = 0.02; d <= max; d += 0.02) if (inside(x + dx * d, y, z + dz * d)) return d - 0.02;
    return max;
  }

  // no wall between two points (the floor plan's walls only; furniture doesn't count)
  function wallFree(a, b) { if (!env) return true; const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.05); for (let i = 0; i <= n; i++) { const u = i / n; if (env.wallAt(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u) || env.floorAt(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u) < -4) return false; } return true; }
  // ---- walking
  // how much room a body has round a point (metres to the nearest thing it would bump into)
  function clearance(x, z, cls) { if (!grid()) return 9; const c = col(x, z); return c < 0 ? 0 : W.dist[cls][c]; }
  // which way is away from things (toward more room)
  function away(x, z, cls) { const e = G; const gx = clearance(x + e, z, cls) - clearance(x - e, z, cls), gz = clearance(x, z + e, cls) - clearance(x, z - e, cls), l = Math.hypot(gx, gz) || 1; return [gx / l, gz / l]; }
  // the nearest point with room for the body
  function nearestClear(x, z, cls, r = BODY[cls].r) {
    if (clearance(x, z, cls) >= r) return { x, z };
    for (let R = 1; R < 60; R++) {
      let best = null, bd = 1e9;
      for (let a = 0; a < Math.max(8, R * 6); a++) { const t = a / Math.max(8, R * 6) * Math.PI * 2, px = x + Math.cos(t) * R * G, pz = z + Math.sin(t) * R * G; if (clearance(px, pz, cls) >= r) { const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = { x: px, z: pz }; } } }
      if (best) return best;
    }
    return null;
  }
  // a straight line between two points with room all the way
  function sees(a, b, cls, r) { const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / (G * 0.5)); for (let i = 1; i <= n; i++) { const u = i / n; if (clearance(a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, cls) < r) return false; } return true; }
  // A route from a to b for this kind of body: A* over the grid's points (eight ways), then pulled tight into as
  // few straight runs as fit, so the walk goes at any angle. Returns the points to walk through (not a), or null.
  function route(a, b, cls, r = BODY[cls].r) {
    if (!grid()) return null;
    const A0 = nearestClear(a.x, a.z, cls, r), B0 = nearestClear(b.x, b.z, cls, r); if (!A0 || !B0) return null;
    if (sees(A0, B0, cls, r)) return [B0];
    const D = W.dist[cls], s = col(A0.x, A0.z), g = col(B0.x, B0.z), nz = W.nz, gi = Math.floor(g / nz), gj = g % nz;
    const cost = new Float32Array(W.nx * nz).fill(1e9), from = new Int32Array(W.nx * nz).fill(-1), heap = [[0, s]]; cost[s] = 0;
    const H = c => { const di = Math.abs(Math.floor(c / nz) - gi), dj = Math.abs(c % nz - gj); return (Math.max(di, dj) + 0.414 * Math.min(di, dj)); };
    const push = e => { heap.push(e); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, rr = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
    let found = false, steps = 0;
    while (heap.length && steps++ < 40000) {
      const [, c] = pop(); if (c === g) { found = true; break; }
      const ci = Math.floor(c / nz), cj = c % nz;
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W.nx || nj >= nz) continue;
        const nc = ni * nz + nj; if (D[nc] < r) continue;
        const nc2 = cost[c] + (di && dj ? 1.414 : 1) + (D[nc] < r + 0.15 ? 0.6 : 0); // keeps a little off things where it can
        if (nc2 < cost[nc]) { cost[nc] = nc2; from[nc] = c; push([nc2 + H(nc), nc]); }
      }
    }
    if (!found) return null;
    const pts = []; for (let c = g; c !== -1; c = from[c]) pts.unshift({ x: W.x0 + Math.floor(c / nz) * G, z: W.z0 + (c % nz) * G });
    pts[pts.length - 1] = B0;
    const out = []; let at = A0, i = 0;
    while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !sees(at, pts[j], cls, r)) j--; out.push(pts[j]); at = pts[j]; i = j; }
    if (!out.length || out[out.length - 1] !== B0) out.push(B0);
    return out;
  }
  // Where to stand to do something at a point: about `reach` from it, with room for the body, as near as it can be
  // to the side it's done from (pref, an angle) and to where the body is now.
  // avoid: other bodies to keep clear of, [{ x, z, r }].
  // len: how far the body reaches back behind that spot (a cat's length), which needs room too
  function standSpot(tx, tz, reach, cls, from, pref, avoid, r = BODY[cls].r, len = cls === 'pet' ? 0.4 : 0) {
    let best = null, bc = 1e9;
    for (const d of [reach, reach + 0.12, reach + 0.25, reach + 0.4, reach + 0.6]) for (let a = 0; a < 32; a++) {
      const t = a / 32 * Math.PI * 2, x = tx + Math.sin(t) * d, z = tz + Math.cos(t) * d; if (clearance(x, z, cls) < r) continue;
      if (avoid && avoid.some(o => Math.hypot(o.x - x, o.z - z) < o.r + r)) continue;
      if (!wallFree({ x: tx, z: tz }, { x, z })) continue;
      if (len && d > 0.05 && clearance(x + (x - tx) / d * len, z + (z - tz) / d * len, cls) < r * 0.8) continue; // room for the back half too // on the same side of any wall as the thing (not reaching through it)
      let c = (d - reach) * 3 + (from ? Math.hypot(x - from.x, z - from.z) * 0.15 : 0);
      if (pref != null) { let da = t - pref; da = Math.atan2(Math.sin(da), Math.cos(da)); c += Math.abs(da) * 1.5; }
      if (c < bc) { bc = c; best = { x, z }; }
    }
    return best;
  }

  // ---- sitting: called each beat after the pose is set. Returns the body nudge {z (forward, local), y, recline}
  // and a resting place for each leg. fit holds what was worked out last beat (it eases toward the new answer).
  const LEGS = ['L', 'R'], SINK = 0.05;
  function seat(inst, caps, fwd, fit, dt) {
    const by = n => caps.filter(k => k.bone === n), back = [-fwd.x, -fwd.z];
    // 1. the hips rest on what's really under them (the seat bones and the tops of the thighs)
    let lift = -1e9;
    const under = [...by('hips').flatMap(k => balls(k, 3)), ...LEGS.flatMap(s => by('thigh.' + s)).map(k => [k.a.x, k.a.y, k.a.z, k.r])];
    // the shapes are a little fuller than the fur, and a cushion gives under weight: the body settles into it a bit
    for (const [x, y, z, r0] of under) { const r = r0 * 0.8, s = support(x, y - r, z); if (s > -1e8) lift = Math.max(lift, s - SINK - (y - r)); }
    if (lift < -1e8) lift = 0;
    // up at once, but down only a little at a time: with nothing under the hips yet (a small seat, the body still in
    // front of it) it slides back onto the seat before it can drop
    lift = Math.max(-0.06, Math.min(0.5, lift));
    // 2. then the back against the backrest: the smallest gap behind any part of the back (hips, chest, neck, head),
    // measured where the body will be after that lift
    let gap = 1e9, gh = 1e9, gc = 1e9;
    for (const n of ['hips', 'chest', 'neck']) for (const k of by(n)) for (const [x, y, z, r] of balls(k, 3)) {
      const g = room(x + back[0] * r, y + lift, z + back[1] * r, back[0], back[1], 0.7);
      gap = Math.min(gap, g); if (n === 'hips') gh = Math.min(gh, g); if (n === 'chest') gc = Math.min(gc, g);
    }
    const dz = gap > 0.68 ? 0 : gap - 0.01; // no backrest within reach (a bench, a beanbag's low side): stays put
    const k = lift > 0.08 || dz < -0.08 ? 1 : Math.min(1, dt * 9); // out of the seat at once, settles gently
    fit.z = Math.max(-0.8, Math.min(0.35, (fit.z || 0) + (-dz) * k)); // body-local forward is the character's facing
    fit.y = (fit.y || 0) + lift * k;
    // 3. lean back along a reclined backrest (the chest stands further off it than the hips)
    // (never so far that the head goes into the backrest: then it sits up a little)
    const hd = by('head').reduce((m, k2) => Math.max(m, pen(k2.a.x, k2.a.y + lift, k2.a.z, k2.r * 0.8, true)), 0);
    const rw = hd > 0.02 ? Math.max(0, (fit.recline || 0) - 0.12) : gh < 0.6 && gc < 0.7 ? Math.max(0, Math.min(0.5, (fit.recline || 0) + (gc - gh) * 1.2)) : 0;
    fit.recline = (fit.recline || 0) + (rw - (fit.recline || 0)) * Math.min(1, dt * 3);
    // 4. the legs
    fit.legs = fit.legs || {};
    for (const s of LEGS) { const L = leg(inst, caps, s, fwd, fit.legs[s], [back[0] * dz, lift, back[1] * dz]); if (L) fit.legs[s] = L; }
    return fit;
  }
  // One leg as a limp two-part pendulum (thigh, shin, foot on the end) in the plane it faces: of every hip and knee
  // angle it can reach, the one where it hangs lowest without going into anything, with a little pull back toward
  // a natural sit so it doesn't fold oddly. Angles are the rig's own (thigh: - lifts it forward; shin: + bends back).
  const P = new T.Vector3();
  function leg(inst, caps, s, fwd, prev, shift) {
    const B = inst.B, th = B['thigh.' + s], sh = B['shin.' + s], ft = B['foot.' + s]; if (!th || !sh || !ft) return null;
    const w = b => b.getWorldPosition(new T.Vector3()).add(P.set(shift[0], shift[1], shift[2]));
    const hip = w(th), knee = w(sh), ank = w(ft), cap = n => caps.find(k => k.bone === n) || { r: 0.08 };
    const fb = cap('foot.' + s), toe = fb.a ? new T.Vector3((fb.a.x + fb.b.x) / 2 + shift[0], (fb.a.y + fb.b.y) / 2 + shift[1], (fb.a.z + fb.b.z) / 2 + shift[2]) : ank.clone();
    const ang = v => Math.atan2(v.x * fwd.x + v.z * fwd.z, -v.y); // from straight down toward the front
    const Lt = hip.distanceTo(knee), Ls = knee.distanceTo(ank), c = inst.cur;
    const c1 = (c['thigh.' + s] || [0])[0], c2 = (c['shin.' + s] || [0])[0];
    const o1 = ang(knee.clone().sub(hip)) + c1, o2 = ang(ank.clone().sub(knee)) + c1 + c2; // the rig's angles to real ones
    const tv = toe.clone().sub(ank), tf = tv.x * fwd.x + tv.z * fwd.z, ty = tv.y, a2now = ang(ank.clone().sub(knee));
    const rt = cap('thigh.' + s).r, rs = cap('shin.' + s).r, rf = fb.r;
    let best = null, bc = 1e9;
    for (let t1 = -2.1; t1 <= -0.4; t1 += 0.07) for (let t2 = -0.1; t2 <= 1.65; t2 += 0.07) { // (a knee bends no further than a natural sit: legs hang over the edge or lie out forward, never tucked under)
      const A1 = o1 - t1, A2 = o2 - t1 - t2;
      const kx = Math.sin(A1) * Lt, ky = -Math.cos(A1) * Lt, ax = kx + Math.sin(A2) * Ls, ay = ky - Math.cos(A2) * Ls;
      const da = A2 - a2now, cs = Math.cos(da), sn = Math.sin(da), fx = ax + tf * cs + ty * sn, fy = ay - tf * sn + ty * cs; // the foot turns with the shin
      const at = (f, y) => [hip.x + fwd.x * f, hip.y + y, hip.z + fwd.z * f];
      let p = 0;
      for (const [f, y, r] of [[kx * 0.66, ky * 0.66, rt], [kx, ky, rt * 0.9], [(kx + ax) / 2, (ky + ay) / 2, rs], [ax, ay, rs], [fx, fy, rf]]) { const [x, yy, z] = at(f, y); p += Math.max(0, pen(x, yy, z, r * 0.75) - 0.02); }
      const cost = p * 60 + (2 * ky * 0.5 + (ky + ay) / 2 + 0.5 * fy) + 0.1 * ((t1 + 1.5) ** 2 + (t2 - 1.4) ** 2) + (prev ? 0.15 * (Math.abs(t1 - prev[0]) + Math.abs(t2 - prev[1])) : 0);
      if (cost < bc) { bc = cost; best = [t1, t2]; }
    }
    return best;
  }

  // ---- standing at something or doing a chore: how far back the body must stand so that no part of it (but the
  // tail and the soles on the floor) is in anything. Worked out fresh each beat from the pose, not added up, so it
  // holds still while the pose does and never drifts.
  function clear(caps, fwd, fit, dt, bodies) {
    const off = fit.z || 0, pts = [];
    for (const k of caps) { if (/^tail/.test(k.bone)) continue; for (const [x, y, z, r] of balls(k, 3)) pts.push([x - fwd.x * off, y, z - fwd.z * off, r * 0.85]); }
    let want = 0;
    for (let d = 0; d >= -0.9; d -= 0.03) { want = d; if (pts.every(([x, y, z, r]) => penAll(x + fwd.x * d, y, z + fwd.z * d, r, bodies) <= 0.01)) break; }
    fit.z = want < off ? want : off + (want - off) * Math.min(1, dt * 8); // out of anything at once; back in gently
    return fit;
  }

  IH.phys = { BODY, wallFree, penAll, field, forget, grid, spans, pen, support, floorAt, clearance, away, nearestClear, sees, route, standSpot, seat, clear, set env(e) { env = e; }, get env() { return env; } };
})();
