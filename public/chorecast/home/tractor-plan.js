/* Tractor route planner (the farm autopilot's brain). A Hybrid A* search: it tries short arcs forward and back
   at five wheel angles from each pose, the same bicycle model the tractor drives by (turning round its back axle,
   never on the spot), and keeps the ones where the tractor and whatever it's towing stay clear of fences, posts
   and the island edge. So it finds its own way round, swings wide at corners, and when there's no room to turn
   it looks around for open ground nearby and does a three-point turn (back up, lock over, go). The towed thing
   swings on its hitch the real way, and the search won't fold it into a jackknife.
   A distance map (how far each spot is from anything solid) makes the clearance checks quick, and a flood of
   the open ground from the goal (ignoring turning) tells the search which way is really nearer, round fences.
   The search runs a slice at a time (step) so the game keeps drawing while it thinks. */
(function () {
  'use strict';
  const IH = (window.IsoHome = window.IsoHome || {});
  const WB = 0.62 + 1.45, REAR = 0.62, HITCH = 1.75, RES = 0.25, TAU = Math.PI * 2, NH = 72;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

  // the distance map: metres from each cell to the nearest solid cell (or the edge), by a two-pass chamfer sweep
  // F: { x0, z0, land(x, z) } when the ground isn't one rectangle from 0, 0 (the farm with its added blocks)
  function grid(solids, W, D, skip, edge = 0.6, F = null) {
    const ox = F ? F.x0 : 0, oz = F ? F.z0 : 0, NX = Math.ceil(W / RES), NZ = Math.ceil(D / RES), d = new Float32Array(NX * NZ).fill(1e9);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = ox + (i + 0.5) * RES, z = oz + (j + 0.5) * RES;
      if (x < ox + edge || z < oz + edge || x > ox + W - edge || z > oz + D - edge || (F && F.land && !F.land(x, z, edge))) d[j * NX + i] = 0;
    }
    solids.forEach((r, k) => { if (k === skip) return; for (let j = Math.max(0, Math.floor((r[1] - oz) / RES)); j <= Math.min(NZ - 1, Math.floor((r[3] - oz) / RES)); j++) for (let i = Math.max(0, Math.floor((r[0] - ox) / RES)); i <= Math.min(NX - 1, Math.floor((r[2] - ox) / RES)); i++) { const x = ox + (i + 0.5) * RES, z = oz + (j + 0.5) * RES; if (x > r[0] && x < r[2] && z > r[1] && z < r[3]) d[j * NX + i] = 0; } });
    const s2 = RES * Math.SQRT2;
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; let v = d[k]; if (!v) continue; if (i) v = Math.min(v, d[k - 1] + RES); if (j) { v = Math.min(v, d[k - NX] + RES); if (i) v = Math.min(v, d[k - NX - 1] + s2); if (i < NX - 1) v = Math.min(v, d[k - NX + 1] + s2); } d[k] = v; }
    for (let j = NZ - 1; j >= 0; j--) for (let i = NX - 1; i >= 0; i--) { const k = j * NX + i; let v = d[k]; if (!v) continue; if (i < NX - 1) v = Math.min(v, d[k + 1] + RES); if (j < NZ - 1) { v = Math.min(v, d[k + NX] + RES); if (i < NX - 1) v = Math.min(v, d[k + NX + 1] + s2); if (i) v = Math.min(v, d[k + NX - 1] + s2); } d[k] = v; }
    return { NX, NZ, d, W, D, ox, oz, at(x, z) { const i = Math.floor((x - ox) / RES), j = Math.floor((z - oz) / RES); if (i < 0 || j < 0 || i >= NX || j >= NZ) return 0; return Math.max(0, d[j * NX + i] - RES * 0.5); } };
  }

  // clearance: points over the tractor (5 across, 7 along) and the towed thing (3 by 3) all at least m from anything
  const TX = [-1.2, -0.6, 0, 0.6, 1.2], TZ = [-1.45, -0.86, -0.27, 0.32, 0.92, 1.51, 2.1], IX = [-1.05, 0, 1.05], IZ = [-1.1, 0, 1.1];
  function clear(G, x, z, yaw, m, imp) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    if (G.at(x + 0.32 * s, z + 0.32 * c) < 2.2 + m) for (const lz of TZ) for (const lx of TX) if (G.at(x + lx * c + lz * s, z - lx * s + lz * c) < m) return false;
    if (imp) { const ic = Math.cos(imp.yaw), is = Math.sin(imp.yaw); if (G.at(imp.x, imp.z) < 1.55 + m) for (const lz of IZ) for (const lx of IX) if (G.at(imp.x + lx * ic + lz * is, imp.z - lx * is + lz * ic) < m) return false; }
    return true;
  }
  // where the towed thing sits, given the tractor and its own heading
  const impAt = (x, z, yaw, iyaw, len) => { const hx = x - Math.sin(yaw) * HITCH, hz = z - Math.cos(yaw) * HITCH; return { x: hx - Math.sin(iyaw) * len, z: hz - Math.cos(iyaw) * len, yaw: iyaw }; };

  // the flood from the goal over open ground (cells half a metre, ones the tractor's width fits through)
  function flood(G, gx, gz) {
    const C = 0.5, NX = Math.ceil(G.W / C), NZ = Math.ceil(G.D / C), h = new Float32Array(NX * NZ).fill(Infinity), ok = k => G.at(G.ox + ((k % NX) + 0.5) * C, G.oz + (Math.floor(k / NX) + 0.5) * C) >= 1.25;
    const q = [], s0 = Math.floor((gz - G.oz) / C) * NX + Math.floor((gx - G.ox) / C); h[s0] = 0; q.push(s0);
    // (a bucketed Dijkstra is overkill here: a plain queue with re-relaxing gives the same answer on this little grid)
    for (let qi = 0; qi < q.length; qi++) {
      const k = q[qi], i = k % NX, j = Math.floor(k / NX), v = h[k];
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= NX || jj >= NZ) continue;
        const kk = jj * NX + ii, nv = v + (di && dj ? C * Math.SQRT2 : C); if (nv >= h[kk] || !ok(kk)) continue; h[kk] = nv; q.push(kk);
      }
    }
    return (x, z) => { const i = Math.floor((x - G.ox) / C), j = Math.floor((z - G.oz) / C); const v = i < 0 || j < 0 || i >= NX || j >= NZ ? Infinity : h[j * NX + i]; return v === Infinity ? Math.hypot(x - gx, z - gz) * 1.4 : Math.max(v, Math.hypot(x - gx, z - gz)); };
  }

  // a little binary heap on f
  function Heap() { const a = []; return { get size() { return a.length; }, push(n) { a.push(n); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }, pop() { const top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } }; }

  /* The way the characters on the home island find theirs (phys.route): A* over the open ground, eight ways, only
     where the body fits (here the tractor's half-width and a little room), keeping a little off things where it
     can, then pulled tight into as few straight runs as fit. */
  function route(G, a, b, r) {
    const C = 0.5, NX = Math.ceil(G.W / C), NZ = Math.ceil(G.D / C), at = k => G.at(G.ox + ((k % NX) + 0.5) * C, G.oz + (Math.floor(k / NX) + 0.5) * C);
    const sees = (p, q) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.ceil(d / 0.2); for (let i = 1; i <= n; i++) { const u = i / n; if (G.at(p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u) < r) return false; } return true; };
    if (sees(a, b)) return [a, b];
    const s0 = Math.floor((a[1] - G.oz) / C) * NX + Math.floor((a[0] - G.ox) / C), g = Math.floor((b[1] - G.oz) / C) * NX + Math.floor((b[0] - G.ox) / C), gi = g % NX, gj = Math.floor(g / NX);
    const cost = new Float32Array(NX * NZ).fill(1e9), from = new Int32Array(NX * NZ).fill(-1), open = Heap(); cost[s0] = 0; open.push({ f: 0, k: s0, g: 0 });
    const H = k => { const di = Math.abs(k % NX - gi), dj = Math.abs(Math.floor(k / NX) - gj); return (Math.max(di, dj) + 0.414 * Math.min(di, dj)) * C; };
    let found = false, n = 0;
    while (open.size && n++ < G.NX * G.NZ) { // (room for the biggest farm: a few times every half-metre cell)
      const { k, g: gk } = open.pop(); if (gk > cost[k] + 1e-3) { n--; continue; } if (k === g) { found = true; break; } // (an old, longer way to a cell already reached shorter: not counted)
      const ci = k % NX, cj = Math.floor(k / NX);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= NX || nj >= NZ) continue;
        const nk = nj * NX + ni, cl = at(nk); if (cl < r && nk !== g) continue;
        const c2 = cost[k] + (di && dj ? C * 1.414 : C) + (cl < r + 0.8 ? 0.35 : 0); // (keeps a little off things where it can)
        if (c2 < cost[nk]) { cost[nk] = c2; from[nk] = k; open.push({ f: c2 + H(nk), k: nk, g: c2 }); }
      }
    }
    if (!found) return null;
    const pts = []; for (let k = g; k !== -1; k = from[k]) pts.unshift([G.ox + ((k % NX) + 0.5) * C, G.oz + (Math.floor(k / NX) + 0.5) * C]);
    pts[0] = a; pts[pts.length - 1] = b;
    const out = [a]; let i = 0; while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !sees(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
    return out;
  }
  /* Then drive it, the way the tractor really drives (the same pure pursuit as the farm's, the wheel turning at a
     hand's speed): corners come out as proper turning arcs. If the whole drive stays clear (towed thing too) and
     arrives lined up, that's the way; if not, there's no room to turn there, and the manoeuvre search takes over. */
  function drive(G, start, line, goal, len, m) {
    const dense = []; for (let i = 0; i < line.length - 1; i++) { const [x0, z0] = line[i], [x1, z1] = line[i + 1], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.25)); for (let q = 0; q < n; q++) dense.push([x0 + (x1 - x0) * q / n, z0 + (z1 - z0) * q / n]); }
    dense.push(line[line.length - 1]);
    let x = start.x, z = start.z, yaw = start.yaw, iy = len ? start.iyaw : yaw, st = 0, k = 0, s = 0; const out = [{ x, z, yaw, dir: 1 }], ds = 0.1, maxS = dense.length * 0.25 * 1.6 + 12;
    const T = dense[dense.length - 1];
    while (s < maxS) {
      const rx = x - Math.sin(yaw) * REAR, rz = z - Math.cos(yaw) * REAR;
      let bd = Infinity, best = k; for (let i = k; i < Math.min(dense.length, k + 30); i++) { const d = Math.hypot(dense[i][0] - rx, dense[i][1] - rz); if (d < bd) { bd = d; best = i; } } k = best;
      if (Math.hypot(x - goal.x, z - goal.z) <= (goal.tol || 0.6) && Math.abs(wrap(yaw - goal.yaw)) <= (goal.ytol || 0.2) && (!len || Math.abs(wrap(yaw - iy)) <= (goal.htol || 9))) { out.push({ x, z, yaw, dir: 1 }); return out; }
      if (k >= dense.length - 2 && Math.hypot(T[0] - x, T[1] - z) < 0.5) return null;
      let j = k; while (j < dense.length - 1 && Math.hypot(dense[j][0] - rx, dense[j][1] - rz) < 2.1) j++;
      let [tx, tz] = dense[j]; if (j === dense.length - 1) { const L0 = Math.hypot(tx - rx, tz - rz), pre = dense[dense.length - 2], dx = T[0] - pre[0], dz = T[1] - pre[1], L1 = Math.hypot(dx, dz) || 1; if (L0 < 2.1) { tx += dx / L1 * (2.1 - L0); tz += dz / L1 * (2.1 - L0); } }
      const al = wrap(Math.atan2(tx - rx, tz - rz) - yaw), want = Math.max(-0.62, Math.min(0.62, Math.atan((2 * WB * Math.sin(al)) / 2.1)));
      st += Math.max(-0.5 * ds, Math.min(0.5 * ds, want - st));
      const y2 = yaw + (ds / WB) * Math.tan(st), my = (yaw + y2) / 2, nx = rx + Math.sin(my) * ds, nz = rz + Math.cos(my) * ds;
      x = nx + Math.sin(y2) * REAR; z = nz + Math.cos(y2) * REAR; yaw = y2; s += ds;
      if (len) { iy += (ds / len) * Math.sin(yaw - iy); if (Math.abs(wrap(yaw - iy)) > 1.25) return null; }
      if (Math.round(s / ds) % 3 === 0) { if (!clear(G, x, z, yaw, m, len ? impAt(x, z, yaw, iy, len) : null)) return null; out.push({ x, z, yaw, dir: 1 }); }
    }
    return null;
  }

  /* The shortest forward way from one back-axle pose to another at a given turning circle (Dubins: a turn, a
     straight or a turn, a turn), all six kinds, shortest first. Poses here in the usual maths frame: [x, z, angle]. */
  const md = a => ((a % TAU) + TAU) % TAU;
  function dubins(q0, q1, R) {
    const dx = q1[0] - q0[0], dy = q1[1] - q0[1], d = Math.hypot(dx, dy) / R, th = Math.atan2(dy, dx), a = md(q0[2] - th), b = md(q1[2] - th);
    const sa = Math.sin(a), sb = Math.sin(b), ca = Math.cos(a), cb = Math.cos(b), cab = Math.cos(a - b), out = [];
    let p2 = 2 + d * d - 2 * cab + 2 * d * (sa - sb); if (p2 >= 0) { const tmp = Math.atan2(cb - ca, d + sa - sb); out.push(['LSL', md(-a + tmp), Math.sqrt(p2), md(b - tmp)]); }
    p2 = 2 + d * d - 2 * cab + 2 * d * (sb - sa); if (p2 >= 0) { const tmp = Math.atan2(ca - cb, d - sa + sb); out.push(['RSR', md(a - tmp), Math.sqrt(p2), md(-b + tmp)]); }
    p2 = -2 + d * d + 2 * cab + 2 * d * (sa + sb); if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(-ca - cb, d + sa + sb) - Math.atan2(-2, p); out.push(['LSR', md(-a + tmp), p, md(-b + tmp)]); }
    p2 = d * d - 2 + 2 * cab - 2 * d * (sa + sb); if (p2 >= 0) { const p = Math.sqrt(p2), tmp = Math.atan2(ca + cb, d - sa - sb) - Math.atan2(2, p); out.push(['RSL', md(a - tmp), p, md(b - tmp)]); }
    let tmp = (6 - d * d + 2 * cab + 2 * d * (sa - sb)) / 8; if (Math.abs(tmp) <= 1) { const p = md(TAU - Math.acos(tmp)), t = md(a - Math.atan2(ca - cb, d - sa + sb) + p / 2); out.push(['RLR', t, p, md(a - b - t + p)]); }
    tmp = (6 - d * d + 2 * cab + 2 * d * (sb - sa)) / 8; if (Math.abs(tmp) <= 1) { const p = md(TAU - Math.acos(tmp)), t = md(-a + Math.atan2(-ca + cb, d + sa - sb) + p / 2); out.push(['LRL', t, p, md(b - a - t + p)]); }
    return out.map(w => ({ w: w[0], L: [w[1] * R, w[2] * R, w[3] * R], len: (w[1] + w[2] + w[3]) * R })).sort((u, v) => u.len - v.len);
  }
  // try to finish with one of those curves, checked for room (and the towed thing swung along it); the poses, or null
  function shot(G, n, goal, len, m, R) {
    const fr = q => [q.x - Math.sin(q.yaw) * REAR, q.z - Math.cos(q.yaw) * REAR, Math.PI / 2 - q.yaw];
    for (const c of dubins(fr(n), fr(goal), R).slice(0, 3)) {
      if (c.len > 40) break;
      let [X, Z, A] = fr(n), iy = n.iyaw, yaw = n.yaw, ok = true, acc = 0; const out = [], ds = 0.1;
      for (let k = 0; k < 3 && ok; k++) {
        const turn = c.w[k] === 'L' ? 1 : c.w[k] === 'R' ? -1 : 0, nn = Math.round(c.L[k] / ds), dd = nn ? c.L[k] / nn : 0;
        for (let i = 0; i < nn; i++) {
          const da = turn * dd / R; X += Math.cos(A + da / 2) * dd; Z += Math.sin(A + da / 2) * dd; A += da; const y2 = Math.PI / 2 - A;
          if (len) { iy += (dd / len) * Math.sin(y2 - iy); if (Math.abs(wrap(y2 - iy)) > 1.25) { ok = false; break; } }
          yaw = y2; acc += dd; if (acc >= 0.3) { acc = 0; const x = X + Math.sin(yaw) * REAR, z = Z + Math.cos(yaw) * REAR; if (!clear(G, x, z, yaw, m, len ? impAt(x, z, yaw, iy, len) : null)) { ok = false; break; } out.push({ x, z, yaw, dir: 1 }); }
        }
      }
      if (!ok) continue;
      if (len && Math.abs(wrap(yaw - iy)) > (goal.htol || 9)) continue;
      out.push({ x: goal.x, z: goal.z, yaw: goal.yaw, dir: 1 }); return out;
    }
    return null;
  }

  const STEERS = [-0.55, -0.28, 0, 0.28, 0.55], STEP = 0.9, SUB = 3;
  /* plan(G, start {x,z,yaw, iyaw, len}, goal {x,z,yaw, tol, ytol, htol}, opts {m, back}) → a search; call
     search.step(n) until it says done; search.path is then a list of poses {x,z,yaw,dir} a step apart, or null. */
  function plan(G, start, goal, o = {}) {
    const m = o.m == null ? 0.45 : o.m, len = start.len || 0, back = o.back == null ? 2.2 : o.back, H = flood(G, goal.x, goal.z);
    const tol = goal.tol || 0.6, ytol = goal.ytol || 0.2, htol = goal.htol || 9;
    const NX = Math.ceil(G.W / 0.5), NZ = Math.ceil(G.D / 0.5), seen = new Map(), open = Heap();
    const key = (n) => (((((Math.round(wrap(n.yaw) / TAU * NH) + NH) % NH) * 2 + (n.dir > 0 ? 1 : 0)) * NZ + Math.floor((n.z - G.oz) / 0.5)) * NX + Math.floor((n.x - G.ox) / 0.5));
    // (how far, round fences, plus the turning the circle makes it do: face the goal, then come round to its heading)
    const RS = WB / Math.tan(0.5), RT = WB / Math.tan(0.55), h = n => { const d = H(n.x, n.z), e = Math.hypot(goal.x - n.x, goal.z - n.z), dy = Math.abs(wrap(goal.yaw - n.yaw)); if (e < 2.5) return 1.6 * Math.max(d, RT * dy); const b = Math.atan2(goal.x - n.x, goal.z - n.z), t1 = Math.abs(wrap(b - n.yaw)), t2 = Math.abs(wrap(goal.yaw - b)); return 1.6 * (d + 0.6 * RT * (Math.min(t1, Math.PI - t1 + 0.6) + t2)); };
    // (starting tight against something, even touching it: the first few metres need only be no closer than it is now)
    let m0 = Math.min(m, 0.02); for (const mm of [0.02, 0.01, 0]) { m0 = mm; if (clear(G, start.x, start.z, start.yaw, mm, len ? impAt(start.x, start.z, start.yaw, start.iyaw, len) : null)) break; }
    const s0 = { x: start.x, z: start.z, yaw: start.yaw, iyaw: len ? start.iyaw : 0, dir: 1, st: 0, g: 0, p: null }; s0.f = h(s0); open.push(s0);
    const S = { done: false, path: null, n: 0, how: '', step(budget = 1500) {
      if (!S.tried) {
        // first the characters' way: the route, lined up for the last bit along the goal's heading, then driven
        S.tried = true; const r = 1.25 + m * 0.5;
        for (const lead of [4.5, 3, 0]) {
          const px = goal.x - Math.sin(goal.yaw) * lead, pz = goal.z - Math.cos(goal.yaw) * lead; if (lead && G.at(px, pz) < r) continue;
          const line = route(G, [start.x - Math.sin(start.yaw) * REAR, start.z - Math.cos(start.yaw) * REAR], [px - Math.sin(goal.yaw) * REAR, pz - Math.cos(goal.yaw) * REAR], r); if (!line) continue;
          if (lead) line.push([goal.x - Math.sin(goal.yaw) * (REAR - 1.5), goal.z - Math.cos(goal.yaw) * (REAR - 1.5)]);
          const p = drive(G, { x: start.x, z: start.z, yaw: start.yaw, iyaw: start.iyaw }, line, goal, len, m); if (p) { S.path = p; S.done = true; S.how = 'route'; S.line = line; return S; }
        }
        S.how = 'manoeuvre';
      }
      while (budget-- > 0) {
        if (!open.size || S.n > (o.max || 60000)) { S.done = true; return S; }
        const a = open.pop(), k = key(a); if (seen.has(k) && seen.get(k) <= a.g) continue; seen.set(k, a.g); S.n++;
        if ((S.n === 1 || S.n % 4 === 0) && (!goal.dir || goal.dir > 0) && Math.hypot(a.x - goal.x, a.z - goal.z) < 26) {
          const tail = shot(G, a, goal, len, m, RS);
          if (tail) { const out = []; for (let n = a; n; n = n.p) out.push({ x: n.x, z: n.z, yaw: n.yaw, dir: n.dir }); out.reverse(); if (out.length > 1) out[0].dir = out[1].dir; else out[0].dir = 1; S.path = out.concat(tail); S.done = true; return S; }
        }
        if (Math.hypot(a.x - goal.x, a.z - goal.z) <= tol && Math.abs(wrap(a.yaw - goal.yaw)) <= ytol && (!len || Math.abs(wrap(a.yaw - a.iyaw)) <= htol) && (!goal.dir || a.dir === goal.dir || !a.p)) {
          const out = []; for (let n = a; n; n = n.p) out.push({ x: n.x, z: n.z, yaw: n.yaw, dir: n.dir }); out.reverse(); if (out.length > 1) out[0].dir = out[1].dir; S.path = out; S.done = true; return S;
        }
        for (const dir of [1, -1]) for (const st of STEERS) {
          let x = a.x, z = a.z, yaw = a.yaw, iy = a.iyaw, ok = true; const ds = (STEP / SUB) * dir;
          for (let q = 0; q < SUB && ok; q++) {
            const y2 = yaw + (ds / WB) * Math.tan(st), my = (yaw + y2) / 2, rx = x - Math.sin(yaw) * REAR + Math.sin(my) * ds, rz = z - Math.cos(yaw) * REAR + Math.cos(my) * ds;
            x = rx + Math.sin(y2) * REAR; z = rz + Math.cos(y2) * REAR; yaw = y2;
            if (len) { iy += (ds / len) * Math.sin(yaw - iy); if (Math.abs(wrap(yaw - iy)) > 1.25) ok = false; }
            if (ok && !clear(G, x, z, yaw, (a.d || 0) < 5 ? m0 : m, len ? impAt(x, z, yaw, iy, len) : null)) ok = false; // (the first few metres may squeeze close: it may be starting tight against something)
          }
          if (!ok) continue;
          const g = a.g + STEP * (dir < 0 ? back * (len ? 1.6 : 1) : 1) + (a.p && dir !== a.dir ? 3.5 : 0) + 0.5 * Math.abs(st - a.st) + 0.12 * Math.abs(st);
          const n = { x, z, yaw, iyaw: iy, dir, st, g, d: (a.d || 0) + STEP, p: a }; const kk = key(n); if (seen.has(kk) && seen.get(kk) <= g) continue; n.f = g + h(n); open.push(n);
        }
      }
      return S;
    } };
    return S;
  }
  // is a pose (with the towed thing straight behind) clear?
  const fits = (G, x, z, yaw, len, m = 0.45) => clear(G, x, z, yaw, m, len ? impAt(x, z, yaw, yaw, len) : null);
  IH.tractorPlan = { grid, plan, route, fits, impAt, clear, WB, REAR, HITCH };
})();
