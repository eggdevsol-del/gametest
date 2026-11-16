/* Chorecast homes (a prototype): a duvet with simple cloth physics.
   A grid of points joined by springs (Verlet, a few relaxation passes), pulled down by gravity, resting on the
   mattress and pillow, hanging over the edges, and draping over whoever is in bed (spheres along their body).
   The top edge is held, like a hand holding it: it rests at the pillow end, slides down to the feet when someone
   climbs in, and is pulled up over them to the chin or pushed down to the waist. Drawn with the anime shader. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const W = 2.3, LEN = 3.05, TOP = 1.13, REST = -0.75;
  // Grid lines: even through the middle, three times as close along every outer edge (so the edges curl and
  // round smoothly over the mattress and the body) — the middle keeps its spacing.
  function axis(len, cells, band) {
    const d = len / cells, out = [0], fine = band * 3, mid = cells - 2 * band;
    for (let i = 0; i < fine; i++) out.push(out[out.length - 1] + d / 3);
    for (let i = 0; i < mid; i++) out.push(out[out.length - 1] + d);
    for (let i = 0; i < fine; i++) out.push(out[out.length - 1] + d / 3);
    return out;
  }
  const X = axis(W, 30, 3).map(v => v - W / 2), Z = axis(LEN, 48, 3), NX = X.length, NZ = Z.length;
  const colAt = x => { let b = 0; for (let i = 1; i < NX; i++) if (Math.abs(X[i] - x) < Math.abs(X[b] - x)) b = i; return b; };
  const BLUE = new T.Color('#8ec9f2'), WHITE = new T.Color('#ffffff');

  function make(col) {
    const n = NX * NZ, p = new Float32Array(n * 3), q = new Float32Array(n * 3);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = (j * NX + i) * 3, x = X[i], z = REST + Z[j];
      p[k] = q[k] = x; p[k + 1] = q[k + 1] = z < 1.95 ? TOP + 0.05 : TOP - (z - 1.95); p[k + 2] = q[k + 2] = Math.min(z, 1.98);
    }
    // springs: along, across and the two diagonals (keeps it from shearing flat)
    const S = [], add = (a, b, k = 0.5) => S.push(a, b, k, Math.hypot(X[a % NX] - X[b % NX], Z[Math.floor(a / NX)] - Z[Math.floor(b / NX)]));
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * NX + i;
      if (i < NX - 1) add(a, a + 1); if (j < NZ - 1) add(a, a + NX);
      if (i < NX - 1 && j < NZ - 1) { add(a, a + NX + 1); add(a + 1, a + NX); }
      if (i < NX - 2) add(a, a + 2, 0.08); if (j < NZ - 2) add(a, a + 2 * NX, 0.08); // bend: soft, so it folds like cloth, not card
    }
    const geo = new T.BufferGeometry(), idx = [];
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i; idx.push(a, a + NX, a + 1, a + 1, a + NX, a + NX + 1); }
    const cl = new Float32Array(n * 3), ext = new Float32Array(n * 2), c0 = new T.Color(col || BLUE);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i, c = Z[j] < 0.2 ? WHITE : c0; cl.set([c.r, c.g, c.b], k * 3); ext[k * 2] = Z[j] < 0.2 ? 0.31 : 0.67; }
    geo.setIndex(idx); geo.setAttribute('position', new T.BufferAttribute(p.slice(), 3)); geo.setAttribute('color', new T.BufferAttribute(cl, 3)); geo.setAttribute('aExt', new T.BufferAttribute(ext, 2));
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, IH.look.BASE2); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.main = true;
    const C = { mesh, p, q, S, hold: { z: REST, y: TOP + 0.05 }, held: { z: REST, y: TOP + 0.05 } };
    for (let i = 0; i < 90; i++) sub(C, 1 / 120, []);
    return C;
  }

  // keeps a point out of the bed, the pillow and the bodies; returns true when it rests on something (friction)
  // a box round all the bodies, so cloth far from anyone skips the body tests
  const MW = 0.925, MF = 1.92, HANG = 0.2; // the mattress's half width and foot end; how far the duvet hangs over each edge
  let BB = null, PZ = -1.45; // PZ: where the pillow is (it moves to meet the head)
  function bounds(bodies) {
    if (!bodies.length) { BB = null; return; } BB = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (const b of bodies) for (const q of [b, b.b || b]) { BB[0] = Math.min(BB[0], q.x - b.r); BB[1] = Math.min(BB[1], q.y - b.r); BB[2] = Math.min(BB[2], q.z - b.r); BB[3] = Math.max(BB[3], q.x + b.r); BB[4] = Math.max(BB[4], q.y + b.r); BB[5] = Math.max(BB[5], q.z + b.r); }
  }
  function collide(p, k, bodies) {
    let x = p[k], y = p[k + 1], z = p[k + 2], touch = false;
    const near = BB && p[k] > BB[0] - 0.05 && p[k] < BB[3] + 0.05 && p[k + 1] > BB[1] - 0.05 && p[k + 1] < BB[4] + 0.05 && p[k + 2] > BB[2] - 0.05 && p[k + 2] < BB[5] + 0.05;
    if (near) for (const b of bodies) { // capsules along the bones; only from above: cloth under someone stays under them
      let cx = b.x, cy = b.y, cz = b.z;
      if (b.b) { const dx = b.b.x - b.x, dy = b.b.y - b.y, dz = b.b.z - b.z, L2 = dx * dx + dy * dy + dz * dz || 1e-6, tt = Math.max(0, Math.min(1, ((x - b.x) * dx + (y - b.y) * dy + (z - b.z) * dz) / L2)); cx += dx * tt; cy += dy * tt; cz += dz * tt; }
      const r = b.r + 0.02, ex = x - cx, ey = y - cy, ez = z - cz, d = Math.hypot(ex, ey, ez);
      if (d < r && ey > -r * 0.2) { const s = r / (d || 1e-4); x = cx + ex * s; y = cy + ey * s; z = cz + ez * s; if (!touch) touch = 2; }
    }
    if (Math.abs(x) < MW && z > -1.95 && z < MF && y < TOP) { // out of the mattress the shortest way (top, side or foot)
      const up = TOP - y, side = MW - Math.abs(x), foot = MF - z;
      if (up <= side && up <= foot) { y = TOP; touch = true; } else if (side <= foot) x = x < 0 ? -MW : MW; else z = MF;
    }
    if (Math.abs(x) < 0.62 && z > PZ - 0.33 && z < PZ + 0.33 && y < 1.4 && y > 1.0) { y = 1.4; touch = true; }
    if (y < 0.02) { y = 0.02; touch = true; }
    // never past the bed's own footprint, so it can't reach into a wall beside or behind the bed
    // (eased back rather than cut off, so the edge rounds over instead of folding at a hard line)
    if (x < -1.0) x = -1.0; if (x > 1.0) x = 1.0; // the same on both sides, the wall side too
    if (z < -1.97) z += (-1.97 - z) * 0.6; if (z > 2.04) z += (2.04 - z) * 0.6;
    p[k] = x; p[k + 1] = y; p[k + 2] = z; return touch;
  }

  // The duvet never passes through itself: points that come closer than its thickness (and aren't next to each
  // other in the weave) are pushed apart. A spatial hash keeps it quick.
  const THICK = 0.032, CELL = 0.04;
  const TS = 8192, HM = TS - 1, hk = (x, y, z) => ((x * 73856093) ^ (y * 19349663) ^ (z * 83492791)) & HM;
  function selfCollide(C) {
    const p = C.p, q = C.q, n = p.length / 3;
    const head = C.hHead || (C.hHead = new Int32Array(TS)), next = C.hNext || (C.hNext = new Int32Array(n));
    const cx = C.cx || (C.cx = new Int32Array(n)), cy = C.cy || (C.cy = new Int32Array(n)), cz = C.cz || (C.cz = new Int32Array(n));
    head.fill(-1);
    for (let i = 0; i < n; i++) { cx[i] = Math.floor(p[i * 3] / CELL); cy[i] = Math.floor(p[i * 3 + 1] / CELL); cz[i] = Math.floor(p[i * 3 + 2] / CELL); const h = hk(cx[i], cy[i], cz[i]); next[i] = head[h]; head[h] = i; }
    const T2 = THICK * THICK;
    for (let i = 0; i < n; i++) {
      const ii = i % NX, ij = (i / NX) | 0, a = i * 3; let hits = 0; // (a few contacts a point is plenty: a duvet bunched up in a pile can't make this slow)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const X0 = cx[i] + dx, Y0 = cy[i] + dy, Z0 = cz[i] + dz;
        for (let j = head[hk(X0, Y0, Z0)]; j !== -1; j = next[j]) {
          if (j <= i || cx[j] !== X0 || cy[j] !== Y0 || cz[j] !== Z0) continue;
          const ji = j % NX, jj = (j / NX) | 0; if (ji - ii <= 4 && ii - ji <= 4 && jj - ij <= 4 && ij - jj <= 4) continue; // neighbours in the weave
          const c = j * 3, ex = p[c] - p[a], ey = p[c + 1] - p[a + 1], ez = p[c + 2] - p[a + 2], d2 = ex * ex + ey * ey + ez * ez;
          if (d2 >= T2 || d2 < 1e-12) continue; if (++hits > 8) break; const d = Math.sqrt(d2), f = (THICK - d) / d * 0.25;
          p[a] -= ex * f; p[a + 1] -= ey * f; p[a + 2] -= ez * f; p[c] += ex * f; p[c + 1] += ey * f; p[c + 2] += ez * f;
          q[a] -= ex * f; q[a + 1] -= ey * f; q[a + 2] -= ez * f; q[c] += ex * f; q[c + 1] += ey * f; q[c + 2] += ez * f; // moved apart without a kick
        }
      }
    }
  }
  function sub(C, h, bodies) {
    const { p, q, S } = C, n = p.length / 3, g = -22 * h * h; // heavy, like a thick duvet
    // the held edge moves toward where the hand wants it, at hand speed
    const H = C.held; H.z += Math.max(-h * 2.4, Math.min(h * 2.4, C.hold.z - H.z)); H.y += (C.hold.y - H.y) * Math.min(1, h * 10);
    for (let k = 0; k < n * 3; k += 3) {
      let vx = (p[k] - q[k]) * 0.94, vy = (p[k + 1] - q[k + 1]) * 0.94, vz = (p[k + 2] - q[k + 2]) * 0.94;
      if (vx * vx + vy * vy + vz * vz < 4e-7) { vx = vy = vz = 0; } // resting cloth stays still
      q[k] = p[k]; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2]; p[k] += vx; p[k + 1] += vy + g; p[k + 2] += vz;
    }
    for (let it = 0; it < 4; it++) {
      for (let s = 0; s < S.length; s += 4) {
        const a = S[s] * 3, b = S[s + 1] * 3, L = S[s + 3], K = S[s + 2], ex = p[b] - p[a], ey = p[b + 1] - p[a + 1], ez = p[b + 2] - p[a + 2], d = Math.hypot(ex, ey, ez) || 1e-5;
        const f = (d - L) / d * K; p[a] += ex * f; p[a + 1] += ey * f; p[a + 2] += ez * f; p[b] -= ex * f; p[b + 1] -= ey * f; p[b + 2] -= ez * f;
      }
      if (C.hands && C.hands.length) { // held in two hands: only the bits in each hand are held, the rest drapes over the body
        for (const h of C.hands) for (let i = 0; i < NX; i++) { // a fistful: the grip fades out either side of the hand, no single pulled point
          const d = Math.abs(X[i] - X[h.col]); if (d > 0.22) continue; const w = 0.5 * (1 - d / 0.22) ** 2, k = i * 3;
          p[k] += (h.x + (X[i] - X[h.col]) * 0.6 - p[k]) * w; p[k + 1] += (H.y - p[k + 1]) * w; p[k + 2] += (H.z - p[k + 2]) * w;
        }
      } else for (let i = 0; i < NX; i++) { const k = i * 3; p[k] += (X[i] - p[k]) * 0.5; p[k + 1] += (H.y - p[k + 1]) * 0.35; p[k + 2] += (H.z - p[k + 2]) * 0.5; } // the folded edge, held neat
      // the foot end is held where it hangs over the end of the bed (as far down as the sides hang), so the duvet
      // can't slide off; the sides hang free and even
      for (let i = 0; i < NX; i++) { if (Math.abs(X[i]) > MW) continue; const k = ((NZ - 1) * NX + i) * 3, xi = X[i]; p[k] += (xi - p[k]) * 0.4; /* the corners hang free, so they fold round, not pinch */ p[k + 1] += (TOP - HANG - p[k + 1]) * 0.4; p[k + 2] += (MF + 0.03 - p[k + 2]) * 0.4; }
      if (it === 3 && C.doSelf) selfCollide(C);
      for (let k = 0; k < n * 3; k += 3) { if (it !== 1 && it !== 3) break; const c = collide(p, k, bodies); if (it === 3 && c === true) { q[k] = p[k]; q[k + 1] = p[k + 1]; q[k + 2] = p[k + 2]; } } // on the mattress it stops; over the body it slides down
    }
  }

  // One beat: hold = { z, y } where the top edge should be (bed space); bodies = spheres { x, y, z, r } in bed space.
  function step(C, dt, hold, bodies) {
    if (hold) {
      C.hold = hold;
      // each hand grips one column and keeps it (no hopping between columns as the hand drifts); the grip itself
      // follows the hand smoothly
      if (hold.hands) { C.grip = hold.hands.map((x, i) => { const g = C.grip && C.grip[i]; const col = g && Math.abs(X[g.col] - x) < 0.12 ? g.col : colAt(x); return { col, x: !g ? x : Math.abs(x - g.x) < 0.03 ? g.x : g.x + (x - g.x) * 0.06 }; }); /* small hand drift is ignored */ C.hands = C.grip; } else { C.hands = null; C.grip = null; }
    }
    const before = (C.eased || C.p).slice(); // the motion check measures what is drawn
    PZ = C.pz != null ? C.pz : -1.45; bounds(bodies); const m = Math.min(10, Math.ceil(Math.min(dt, 0.15) * 120)); for (let i = 0; i < m; i++) { C.doSelf = !IH.cloth.noSelf; sub(C, 1 / 120, bodies); } // self-contact on every step, so stacked layers rest on each other
    // drawn smoothed: two passes of averaging with neighbours, so no crease, corner or edge shows a sharp angle
    const g = C.mesh.geometry, R = g.attributes.position.array, tmp = C.tmp || (C.tmp = new Float32Array(R.length));
    // the drawn cloth eases toward the simulated one, so a tiny to-and-fro in the physics never shows as a twitch
    const E = C.eased || (C.eased = C.p.slice()); for (let k = 0; k < E.length; k++) { const d = C.p[k] - E[k]; E[k] += Math.abs(d) > 0.06 ? d : d * 0.35; } R.set(E);
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const a = (j * NX + i) * 3; let sx = 0, sy = 0, sz = 0, c = 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue; const b = (jj * NX + ii) * 3; sx += R[b]; sy += R[b + 1]; sz += R[b + 2]; c++; }
        tmp[a] = R[a] * 0.4 + sx / c * 0.6; tmp[a + 1] = Math.max(R[a + 1], R[a + 1] * 0.4 + sy / c * 0.6); tmp[a + 2] = R[a + 2] * 0.4 + sz / c * 0.6; // never smoothed downward into the body
      }
      R.set(tmp);
    }
    let mv = 0, at = 0; for (let k = 0; k < before.length; k++) { const d = Math.abs((C.eased || C.p)[k] - before[k]); if (d > mv) { mv = d; at = k; } } C.motion = [mv, Math.floor(at / 3) % NX, Math.floor(at / 3 / NX), at % 3];
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  }

  IH.cloth = { make, step, REST, TOP };
})();
