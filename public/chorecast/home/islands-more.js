/* Chorecast homes (a prototype): the other eight extra islands, each its own floating island and ecosystem, built
   from islands-build.js's pieces (the same ground, sides, signposts, rigs) and run by village.js; what there is to do
   on each is in village-islands.js.
   Utility (making things): the Veggie plot (beds to plant, water and harvest), the Orchard terrace (apple, lemon and
   feijoa trees on three terraces, beehives), the Stable yard (horses to groom and ride, sheep, a pig, a donkey).
   Vacation: the Lake (a jetty, kayaks, swans, ducks, a platypus), the Forest grove (native bush over a stream, a
   swing bridge, a bird hide, a tuatara, a glow-worm cave), the Waterfall cliff (a plunge pool, a rainbow, a creek
   off the island's edge), the Mountain lookout (a geyser, hot pools, a rainbow spring, an overlook), the Floating sky
   islet (clouds, a rainbow, a hot-air balloon, a kite, a bell). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit || !IH.look || !IH.islandsBuild) return;
  const { Kit } = IH.kit, LK = IH.look, IB = IH.islandsBuild, K = IB.kit, MAKE = IB.MAKE;
  const { rng, bx, sm, terrain, sides, skirt, board, signpost, rock, quad, part } = K;

  // ---------- shared bits
  function base(W, D, R, ground = '#7fbf5c', soil = '#9a7a52') { const k = new Kit(); bx(k, W, 0.42, D, W / 2, -0.42, D / 2, soil, { r: 0.18, seg: 2 }); sides(k, W, D, R, '#8a7452'); bx(k, W - 0.4, 0.04, D - 0.4, W / 2, 0, D / 2, ground, { r: 0.02 }); return k; }
  function hits(root, spots, h) { for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, (h ? h(x, z) : 0) + 2, z); m.userData.spot = s; root.add(m); } }
  const post = (k, spots, solid, x, z, id, h = () => 0) => { signpost(k, x, z, id); solid(x - 0.3, z - 0.3, x + 0.3, z + 0.3); spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [x + 1.4, z + 1.2], yaw: Math.PI, hit: [x, z, 0, 2.4] }); void h; };
  function solids() { const L = []; return [L, (x0, z0, x1, z1) => L.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)])]; }
  function fence(k, solid, pts, col = '#e9e2d4', gap) {
    for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]; if (gap === i) continue; const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2.2)), ry = -Math.atan2(z1 - z0, x1 - x0);
      for (let j = 0; j <= n; j++) bx(k, 0.2, 1.4, 0.2, x0 + (x1 - x0) * j / n, 0, z0 + (z1 - z0) * j / n, col); for (const y of [0.5, 1.1]) k.box(L, 0.13, 0.08, (x0 + x1) / 2, y, (z0 + z1) / 2, col, { ry }); solid(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2); }
  }
  function shed(k, x, z, ry, wall, roof, w = 4, d = 3, h = 2.6) { k.at(x, 0, z, ry, kk => { bx(kk, w, h, d, 0, 0, 0, wall, { r: 0.05 }); kk.cone(Math.hypot(w, d) * 0.62, 1.1, 0, h, 0, roof, { n: 4, ry: Math.PI / 4, s: [w / d, 1, 1] }); bx(kk, 1.2, 1.9, 0.1, 0, 0, d / 2 + 0.02, '#5a4632'); }); }
  function tree(k, x, z, R, s = 1, y = 0, leaf = ['#4f9a3c', '#5fae4a']) { k.cyl(0.32 * s, 2.2 * s, x, y, z, '#6b4a33', { n: 7 }); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.ball(1.25 * s, x + Math.cos(a) * 1.1 * s, y + (3.0 + R() * 0.6) * s, z + Math.sin(a) * 0.9 * s, leaf[i % 2], { n: 9 }); } k.ball(1.3 * s, x, y + 3.9 * s, z, leaf[0], { n: 9 }); }
  function fern(k, x, z, R, s = 1, y = 0) { k.cyl(0.18 * s, 2.6 * s, x, y, z, '#4a3a2c', { n: 6 }); for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + R() * 0.3; k.box(0.5 * s, 0.04, 2.0 * s, x + Math.sin(a) * 0.9 * s, y + 2.5 * s, z + Math.cos(a) * 0.9 * s, i % 2 ? '#3f8a3c' : '#4e9e48', { ry: a, rx: 0.45 }); } }
  function nikau(k, x, z, R, s = 1, y = 0) { k.cyl(0.16 * s, 4.4 * s, x, y, z, '#8a8a6a', { n: 7 }); k.cyl(0.24 * s, 0.9 * s, x, y + 4.0 * s, z, '#7aa04a', { n: 7 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.box(0.5 * s, 0.04, 2.2 * s, x + Math.sin(a) * 1.0 * s, y + 5.0 * s, z + Math.cos(a) * 1.0 * s, '#4e9e48', { ry: a, rx: -0.3 }); } }
  function kauri(k, x, z, R, s = 1, y = 0) { k.cyl(0.55 * s, 6.5 * s, x, y, z, '#9a8f86', { n: 9 }); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + R(); k.ball(1.4 * s, x + Math.cos(a) * 1.4 * s, y + (6.8 + R()) * s, z + Math.sin(a) * 1.4 * s, i % 2 ? '#3b6e35' : '#46803c', { s: [1.3, 0.7, 1.3], n: 9 }); } }
  function reeds(k, x, z, R, n = 8, y = 0) { for (let i = 0; i < n; i++) { const px = x + (R() - 0.5) * 1.6, pz = z + (R() - 0.5) * 1.6; k.cyl(0.03, 1.2 + R() * 0.8, px, y, pz, '#6f9a42', { n: 3, rx: (R() - 0.5) * 0.3 }); if (i % 3 === 0) k.cyl(0.07, 0.35, px, y + 1.3, pz, '#6b4a33', { n: 5 }); } }
  const puffMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  function puffs(root, n, x, y, z, spread = 0.6) { const g = new T.Group(), L = []; for (let i = 0; i < n; i++) { const m = new T.Mesh(new T.SphereGeometry(0.5, 10, 8), puffMat.clone()); m.layers.set(1); m.userData.bg = true; m.userData.ph = i / n; g.add(m); L.push(m); } g.position.set(x, y, z); root.add(g); return { g, L, spread }; }
  function tickPuffs(P, t, rise = 3, speed = 0.35) { for (const m of P.L) { const u = (t * speed + m.userData.ph) % 1; m.position.set(Math.sin(m.userData.ph * 40 + t * 0.3) * P.spread * (0.5 + u), u * rise, Math.cos(m.userData.ph * 30) * P.spread * (0.5 + u)); m.scale.setScalar(0.6 + u * 1.4); m.material.opacity = 0.55 * (1 - u); } }
  // a bird that flits from perch to perch, wings beating in flight, a hop and a look when perched
  const A3 = kind => (IH.animals3d && IH.animals3d.has(kind) ? IH.animals3d.make(kind) : null);
  function bird(col, belly, wing, perches, R, s = 1, kind) {
    const a3 = A3(kind); if (a3) return bird3(a3, perches, R);
    const g = new T.Group(), k = new Kit(); k.ball(0.18 * s, 0, 0.2 * s, 0, col, { s: [0.8, 0.85, 1.3], n: 9 }); k.ball(0.12 * s, 0, 0.34 * s, 0.14 * s, col, { n: 8 }); k.ball(0.1 * s, 0, 0.15 * s, 0.06 * s, belly, { s: [0.7, 0.8, 1], n: 7 }); k.cone(0.03 * s, 0.1 * s, 0, 0.33 * s, 0.27 * s, '#2a2630', { rx: Math.PI / 2, n: 4 }); k.box(0.14 * s, 0.02, 0.3 * s, 0, 0.22 * s, -0.28 * s, col, { rx: 0.3 }); for (const sx of [-1, 1]) k.ball(0.022 * s, sx * 0.06 * s, 0.37 * s, 0.22 * s, '#111111', { n: 5 });
    g.add(k.build()); const wings = []; for (const sx of [-1, 1]) { const w = part(g, sx * 0.12 * s, 0.24 * s, 0), wk = new Kit(); wk.box(0.34 * s, 0.025, 0.2 * s, sx * 0.17 * s, 0, 0, wing, { r: 0.01 }); w.add(wk.build()); wings.push(w); }
    let at = Math.floor(R() * perches.length), st = { mode: 'perch', until: 0, from: null, to: null, t0: 0 }; g.position.set(...perches[at]);
    return { group: g, kind: 'bird', tick(t, dt, kid) {
      const P = g.position;
      if (st.mode === 'perch') { g.rotation.y += Math.sin(t * 2 + at) * dt * 0.8; for (const w of wings) w.rotation.z = 0; if (t > st.until || Math.hypot(kid.x - P.x, kid.z - P.z) < 1.6) { let n = at; while (n === at) n = Math.floor(Math.random() * perches.length); st = { mode: 'fly', from: P.toArray(), to: perches[n], t0: t, dur: 1.2 + Math.hypot(perches[n][0] - P.x, perches[n][2] - P.z) * 0.12 }; at = n; } }
      else { const u = Math.min(1, (t - st.t0) / st.dur), f = st.from, e = st.to; P.set(f[0] + (e[0] - f[0]) * u, f[1] + (e[1] - f[1]) * u + Math.sin(u * Math.PI) * 1.5, f[2] + (e[2] - f[2]) * u); g.rotation.y = Math.atan2(e[0] - f[0], e[2] - f[2]); wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 26) * 0.9; }); if (u >= 1) st = { mode: 'perch', until: t + 2 + Math.random() * 6 }; }
    } };
  }
  // the same, a 3D bird (its model from Morphic): flits perch to perch, a hop in the air, a bob and a look when perched
  function bird3(a3, perches, R) {
    const g = a3.group; let at = Math.floor(R() * perches.length), st = { mode: 'perch', until: 0 }; g.position.set(...perches[at]);
    return { group: g, kind: 'bird', tick(t, dt, kid) {
      const P = g.position;
      if (st.mode === 'perch') { IH.animals3d.move(a3, t, false, Math.sin(t * 0.7 + at) > 0.6); g.rotation.y += Math.sin(t * 2 + at) * dt * 0.8; if (t > st.until || Math.hypot(kid.x - P.x, kid.z - P.z) < 1.6) { let n = at; while (n === at) n = Math.floor(Math.random() * perches.length); st = { mode: 'fly', from: P.toArray(), to: perches[n], t0: t, dur: 1.2 + Math.hypot(perches[n][0] - P.x, perches[n][2] - P.z) * 0.12 }; at = n; } }
      else { const u = Math.min(1, (t - st.t0) / st.dur), f = st.from, e = st.to; P.set(f[0] + (e[0] - f[0]) * u, f[1] + (e[1] - f[1]) * u + Math.sin(u * Math.PI) * 1.5, f[2] + (e[2] - f[2]) * u); g.rotation.y = Math.atan2(e[0] - f[0], e[2] - f[2]); IH.animals3d.move(a3, t * 2, true, false, 2); if (u >= 1) st = { mode: 'perch', until: t + 2 + Math.random() * 6 }; }
    } };
  }
  // something that glides round a loop on the water (swans, ducks), a little bob
  function glider(make, cx, cz, rx, rz, speed, y = 0.02, ph = 0) { const a = make(); return { group: a.group, kind: 'glide', tick(t) { const w = t * speed + ph; a.group.position.set(cx + Math.cos(w) * rx, y + Math.sin(t * 2 + ph) * 0.02, cz + Math.sin(w) * rz); a.group.rotation.y = Math.atan2(-Math.sin(w) * rx, Math.cos(w) * rz) * (speed > 0 ? 1 : -1); if (a.neck) a.neck.rotation.x = Math.sin(t * 0.7 + ph) * 0.15; } }; }
  function swan() { const g = new T.Group(), k = new Kit(); k.ball(0.6, 0, 0.3, 0, '#ffffff', { s: [0.8, 0.6, 1.3], n: 12 }); k.cone(0.3, 0.5, 0, 0.45, -0.75, '#ffffff', { rx: -2.2, n: 6 }); g.add(k.build()); const neck = part(g, 0, 0.45, 0.55), nk = new Kit(); nk.cyl(0.09, 0.9, 0, 0, 0, '#ffffff', { n: 7, rx: 0.15 }); nk.ball(0.16, 0, 0.95, 0.12, '#ffffff', { s: [0.8, 0.9, 1.3], n: 9 }); nk.cone(0.07, 0.24, 0, 0.92, 0.36, '#ff8a3d', { rx: Math.PI / 2, n: 5 }); nk.ball(0.05, 0, 0.94, 0.27, '#1f1a22', { n: 5 }); neck.add(nk.build()); return { group: g, neck }; }
  function duck() { const g = new T.Group(), k = new Kit(); k.ball(0.28, 0, 0.18, 0, '#8a6a4a', { s: [0.8, 0.6, 1.3], n: 10 }); k.ball(0.15, 0, 0.42, 0.28, '#2f7a4a', { n: 8 }); k.cone(0.06, 0.16, 0, 0.4, 0.46, '#ffb43a', { rx: Math.PI / 2, n: 5, s: [1.3, 0.5, 1] }); k.ball(0.03, 0.08, 0.47, 0.36, '#111111', { n: 5 }); k.ball(0.03, -0.08, 0.47, 0.36, '#111111', { n: 5 }); g.add(k.build()); return { group: g }; }
  function horse(col = '#8a5a3a', mane = '#3a2a22', s = 1.3, kind = 'horse') { const a = quad({ kind, s, legH: 0.9, c: col, neck: 0.6, len: 1.15, snoutC: col, legC: col, hoof: '#2a2630', tailC: mane }); const mk = new Kit(); for (let i = 0; i < 6; i++) mk.box(0.08 * s, 0.22 * s, 0.14 * s, 0, (0.15 - i * 0.12) * s, (-0.15 - i * 0.02) * s, mane, { r: 0.02 }); a.head.add(mk.build()); return a; }
  const MORE = {
    horse: () => horse(['#8a5a3a', '#c9a173', '#3a2e2a', '#f1ece2'][Math.floor(Math.random() * 4)]),
    pony: () => horse('#d9b48a', '#f4ecdc', 0.95, 'pony'),
    donkey: () => quad({ kind: 'donkey', s: 1.0, legH: 0.7, c: '#9a948c', headC: '#9a948c', snoutC: '#e8e2d8', earC: '#7a746c', len: 1.0 }),
    merino: () => quad({ kind: 'merino', s: 0.8, legH: 0.45, c: '#f4ecdc', wool: true, headC: '#f1ece2', legC: '#2a2630', len: 0.95 }),
    kunekune: () => quad({ kind: 'kunekune', s: 0.75, legH: 0.3, c: '#c98a5a', patches: [[0.25, 0.1, 0.1, 0.3], [-0.2, 0.2, -0.3, 0.25]], patchC: '#3a2a22', snoutC: '#f2b9a8', len: 1.0 })
  };
  Object.assign(MAKE, MORE);

  /* ---------- Veggie plot: six raised beds (planted, watered, harvested), a seed shed, a glasshouse, a water tank */
  function plot(st) {
    const W = 40, D = 32, R = rng(707), k = base(W, D, R), [sol, solid] = solids(), spots = [], root = new T.Group();
    for (const [x0, z0, x1, z1] of [[18, 0.4, 22, 31.6], [4, 16.2, 36, 17.8]]) bx(k, x1 - x0, 0.05, z1 - z0, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, '#cbbf9f', { r: 0.02 }); // gravel paths
    const beds = []; let n = 0;
    for (const z of [11, 22.5]) for (const x of [8, 14.5, 26, 32.5]) { if (n >= 6 && x > 20) break; bx(k, 4.8, 0.7, 3.4, x, 0, z, '#9c6b45', { r: 0.05 }); bx(k, 4.4, 0.06, 3.0, x, 0.68, z, '#5a3f2c'); solid(x - 2.4, z - 1.7, x + 2.4, z + 1.7); const g = new T.Group(); g.position.set(x, 0.72, z); root.add(g); beds.push({ x, z, g }); spots.push({ kind: 'bed', id: 'bed' + n, i: n, name: 'garden bed ' + (n + 1), at: [x, z + (z < 16 ? 2.6 : -2.6)], yaw: z < 16 ? Math.PI : 0, hit: [x, z, 0, 4] }); n++; }
    beds.length = Math.min(beds.length, 8);
    shed(k, 34, 4.4, 0, '#7a9a6a', '#a5523f'); board(k, 'seeds', 'SEEDS & TOOLS', 'carrots · tomatoes · lettuce · pumpkins · strawberries', '#fff6e0', '#4a7a3a', 3.6, 0.9, 34, 2.9, 5.95); solid(32, 2.9, 36, 5.9);
    spots.push({ kind: 'seedshed', id: 'seedshed', name: 'the seed shed', at: [34, 7.4], yaw: Math.PI, hit: [34, 4.4, 0, 4] });
    k.at(5.5, 0, 4.5, 0, kk => { bx(kk, 6, 0.3, 4, 0, 0, 0, '#d9d2c6'); kk.glassBox(5.6, 2.6, 3.6, 0, 0.3, 0, { tint: '#e6f6ff' }); for (const sd of [-1, 1]) kk.glassBox(5.8, 0.06, 2.2, 0, 2.9 + 0.45, sd * 0.95, { tint: '#e6f6ff', rx: sd * 0.45 }); for (let i = 0; i < 5; i++) kk.ball(0.35, -2 + i, 0.75, 0, i % 2 ? '#e8463e' : '#5fae4a', { n: 7 }); }); solid(2.5, 2.5, 8.5, 6.5);
    k.cyl(1.1, 2.2, 26, 0, 3.6, '#8f9aa8', { n: 14 }); k.cyl(1.15, 0.2, 26, 2.2, 3.6, '#7a8592', { n: 14 }); solid(24.8, 2.4, 27.2, 4.8);
    spots.push({ kind: 'tank', id: 'tank', name: 'the water tank', at: [26, 5.6], yaw: Math.PI, hit: [26, 3.6, 0, 2.6] });
    k.at(36, 0, 26, -0.4, kk => { kk.cyl(0.06, 2.4, 0, 0, 0, '#8a6038', { n: 4 }); kk.box(2, 0.1, 0.1, 0, 1.8, 0, '#8a6038'); kk.ball(0.35, 0, 2.6, 0, '#f2dca3', { n: 8 }); kk.cone(0.6, 0.5, 0, 2.85, 0, '#c9402c', { n: 8 }); kk.box(0.9, 1.0, 0.4, 0, 1.1, 0, '#4a7aa8', { r: 0.05 }); }); solid(35.4, 25.4, 36.6, 26.6);
    bx(k, 2.2, 1.0, 1.6, 4, 0, 27, '#6b4a33', { r: 0.05 }); for (let i = 0; i < 6; i++) k.ball(0.3, 3.2 + (i % 3) * 0.8, 1.05, 26.6 + Math.floor(i / 3) * 0.8, '#5a4a32', { n: 6 }); solid(2.9, 26.2, 5.1, 27.8);
    for (let i = 0; i < 22; i++) { const x = 1 + R() * 38, z = 29 + R() * 2.5; k.ball(0.3, x, 0.2, z, ['#ff8fb1', '#ffd34f', '#b59cff', '#ffffff'][i % 4], { n: 6 }); }
    post(k, spots, solid, 16.6, 1.6, 'plot');
    root.add(k.build()); hits(root, spots);
    // what's growing in a bed: crop, stage 0 (seeds) to 3 (ready)
    const drawBed = (i, crop, stage) => {
      const b = beds[i]; if (!b) return; while (b.g.children.length) b.g.remove(b.g.children[0]); if (!crop) return;
      const kk = new Kit(), s = [0.3, 0.55, 0.8, 1][stage] || 0.3;
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { const x = -1.6 + c * 1.07, z = -0.7 + r * 1.4;
        if (stage === 0) { kk.ball(0.18, x, 0, z, '#6b4a33', { s: [1, 0.4, 1], n: 6 }); continue; }
        if (crop === 'carrot') { for (let l = 0; l < 4; l++) kk.cone(0.05, 0.55 * s, x + (l - 1.5) * 0.06, 0, z, '#5fae4a', { n: 3, rz: (l - 1.5) * 0.3 }); if (stage === 3) kk.cone(0.09, 0.12, x, 0.02, z, '#ff8a3d', { n: 6 }); }
        else if (crop === 'tomato') { kk.cyl(0.02, 1.4 * s, x + 0.12, 0, z, '#c9a173', { n: 3 }); kk.ball(0.3 * s, x, 0.6 * s, z, '#4e9e48', { n: 8 }); if (stage === 3) for (let f = 0; f < 3; f++) kk.ball(0.1, x + (f - 1) * 0.15, 0.5 + f * 0.12, z + 0.2, '#e8463e', { n: 6 }); }
        else if (crop === 'lettuce') kk.ball(0.32 * s, x, 0.12 * s, z, stage === 3 ? '#9be38f' : '#7cd36a', { s: [1, 0.7, 1], n: 9 });
        else if (crop === 'pumpkin') { kk.ball(0.22 * s, x, 0.1, z, '#4e9e48', { s: [1.4, 0.4, 1.4], n: 7 }); if (stage === 3 && c % 2 === 0) kk.ball(0.3, x + 0.2, 0.22, z, '#f39a3b', { s: [1.2, 0.85, 1.2], n: 9 }); }
        else if (crop === 'strawberry') { kk.ball(0.22 * s, x, 0.1, z, '#5fae4a', { s: [1.2, 0.5, 1.2], n: 7 }); if (stage === 3) for (let f = 0; f < 3; f++) kk.ball(0.06, x + (f - 1) * 0.14, 0.08, z + 0.2, '#e8352e', { n: 5 }); }
      }
      b.g.add(kk.build());
    };
    return { id: 'plot', title: 'Veggie plot', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [20, 3.4], lawns: [[1, 1, 17.6, 15.8], [22.4, 7, 39, 15.8], [1, 18.2, 39, 31]], paths: [[18, 0.4, 22, 31.6], [4, 16.2, 36, 17.8]], animals: [], npc: 0, centre: [20, 16], growth: 0.4, beds, drawBed, state: st };
  }

  /* ---------- Orchard terrace: three terraces up a sunny slope, stone walls, a ramp; apples, lemons, feijoas;
     beehives on the top terrace */
  function orchard(st) {
    const W = 44, D = 36, R = rng(1203), [sol, solid] = solids(), spots = [], root = new T.Group(), trees = [];
    const RAMP = [38, 42];
    const lvl = z => (z > 24 ? 0 : z > 13 ? 1.4 : 2.8);
    const h = (x, z) => { const inRamp = x > RAMP[0] && x < RAMP[1]; if (inRamp && z > 10 && z < 27) return Math.max(0, Math.min(2.8, (27 - z) / 14 * 2.8)); return lvl(z) + (Math.sin(x * 0.8) * Math.sin(z * 0.9)) * 0.03; };
    const col = (x, z, y) => (x > RAMP[0] && x < RAMP[1] && z > 10 && z < 27 ? '#cbbf9f' : Math.abs(z - 24) < 0.25 || Math.abs(z - 13) < 0.25 ? '#a9a297' : y > 2 ? '#86c766' : y > 1 ? '#7fbf5c' : '#78b956');
    const k = new Kit(); sides(k, W, D, R, '#8a7452'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, () => '#a9a297'));
    // stone retaining walls (where each terrace steps up), with the ramp through them
    for (const [z, y] of [[24, 1.4], [13, 2.8]]) for (let x = 0.5; x < W - 0.5; x += 1.2) { if (x > RAMP[0] - 0.4 && x < RAMP[1] + 0.2) continue; bx(k, 1.18, y - lvl(z + 1) + 0.1, 0.5, x + 0.6, lvl(z + 1), z, R() < 0.5 ? '#b9b2a5' : '#a9a297', { r: 0.06 }); }
    // the trees: apples on the bottom terrace, lemons in the middle, feijoas on top; each with its fruit (village-islands.js shows it when it's ripe)
    const KINDS = [['apple', '#e8463e', 29.5], ['lemon', '#ffd84a', 18.5], ['feijoa', '#7aa04a', 7]];
    for (const [kind, fc, z] of KINDS) for (let i = 0; i < 4; i++) {
      const x = 6 + i * 8.5, y = lvl(z); tree(k, x, z, R, 0.85, y, kind === 'lemon' ? ['#3f8a3c', '#4e9e48'] : kind === 'feijoa' ? ['#5a8a5a', '#6a9a6a'] : ['#4f9a3c', '#5fae4a']); solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
      const fk = new Kit(); for (let f = 0; f < 10; f++) { const a = f / 10 * Math.PI * 2 + R(), r = 1.1 + R() * 0.8; fk.ball(0.18, Math.cos(a) * r, 2.4 + R() * 1.3, Math.sin(a) * r * 0.85, fc, { n: 7, s: kind === 'feijoa' ? [0.8, 1.1, 0.8] : [1, 1, 1] }); }
      const fruit = fk.build(); fruit.position.set(x, y, z); root.add(fruit); trees.push({ kind, x, z, fruit, i: trees.length });
      spots.push({ kind: 'fruittree', id: kind + i, i: trees.length - 1, fruit: kind, name: `the ${kind} tree`, at: [x, z + 1.9], yaw: Math.PI, hit: [x, z, 0, 3] });
    }
    for (let i = 0; i < 2; i++) { const x = 36 + i * 3, z = 3.4; k.at(x, 2.8, z, 0, kk => { bx(kk, 1.4, 0.3, 1.4, 0, 0, 0, '#8a6038'); for (let j = 0; j < 3; j++) bx(kk, 1.3, 0.45, 1.3, 0, 0.3 + j * 0.47, 0, j % 2 ? '#ffd35a' : '#f2c14a', { r: 0.04 }); bx(kk, 1.5, 0.15, 1.5, 0, 1.75, 0, '#c9a173'); }); solid(x - 0.8, z - 0.8, x + 0.8, z + 0.8); }
    spots.push({ kind: 'hives', id: 'hives', name: 'the beehives', at: [37.5, 5.6], yaw: Math.PI, hit: [37.5, 3.4, 0, 5] });
    k.at(5, 2.8, 3.8, 0, kk => { bx(kk, 4, 2.2, 3, 0, 0, 0, '#c9b28a', { r: 0.05 }); kk.cone(3.0, 1.0, 0, 2.2, 0, '#7a6a5a', { n: 4, ry: Math.PI / 4, s: [1.2, 1, 0.85] }); for (let i = 0; i < 4; i++) bx(kk, 0.7, 0.5, 0.5, -1.2 + i * 0.8, 0, 1.8, '#c9a173'); }); solid(2.6, 2.1, 7.4, 5.5);
    spots.push({ kind: 'press', id: 'press', name: 'the packing shed', at: [5, 7], yaw: Math.PI, hit: [5, 3.8, 0, 4] });
    // the creatures: bees by the hives, a fantail in the trees
    const bees = []; for (let i = 0; i < 8; i++) { const b3 = A3('bee'), m = b3 ? b3.group : new T.Mesh(new T.SphereGeometry(0.07, 6, 5), new T.MeshBasicMaterial({ color: 0xffc83a })); m.userData.ph = i; root.add(m); bees.push(m); }
    const fant = bird('#6a5a4a', '#e8c9a0', '#5a4a3a', trees.map(t => [t.x, lvl(t.z) + 3.9, t.z]), R, 0.9, 'fantail');
    post(k, spots, solid, 18, 31.8, 'orchard');
    root.add(k.build()); hits(root, spots, h);
    const walk = (x, z) => { const inRamp = x > RAMP[0] && x < RAMP[1]; return inRamp || (Math.abs(z - 24) > 0.7 && Math.abs(z - 13) > 0.7); };
    const tick = t => { bees.forEach(b => { const p = b.userData.ph; b.position.set(37.5 + Math.sin(t * 2.3 + p * 1.7) * 2.2, 4.8 + Math.sin(t * 3.1 + p) * 0.6, 3.4 + Math.cos(t * 1.9 + p * 2.1) * 1.8); b.rotation.y = t * 2.3 + p * 1.7; }); };
    return { id: 'orchard', title: 'Orchard terrace', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [20, 33.4], lawns: [], paths: [], height: h, walk, animals: [fant], npc: 0, centre: [22, 18], trees, tick, state: st };
  }

  /* ---------- Stable yard: a long stable with stalls, a sand arena for riding, a paddock for the donkey, sheep and
     pig, a hay barn, a tack room (the stable's shop) */
  function stable(st) {
    const W = 48, D = 40, R = rng(1811), k = base(W, D, R), [sol, solid] = solids(), spots = [], root = new T.Group(), animals = [];
    bx(k, 4, 0.05, D - 1, 24, 0.02, D / 2, '#b89668', { r: 0.02 }); // the track
    k.at(12, 0, 5, 0, kk => { bx(kk, 18, 3.2, 6, 0, 0, 0, '#a8673f', { r: 0.05 }); for (const s of [-1, 1]) bx(kk, 9.6, 0.25, 7, s * 4.5, 3.6, 0, '#5a4a4a', { rz: s * -0.3 }); for (let i = 0; i < 5; i++) { bx(kk, 2.6, 1.4, 0.15, -6.4 + i * 3.2, 0, 3.05, '#7a4a2a'); bx(kk, 0.15, 3.2, 0.2, -8 + i * 3.2, 0, 3.08, '#f4ecdc'); } });
    board(k, 'stable', 'STABLES & TACK', 'horses · ponies · tack', '#fff6e0', '#7a4a2a', 4, 0.9, 12, 3.6, 8.15); solid(3, 2, 21, 8.2);
    spots.push({ kind: 'tack', id: 'tack', name: 'the tack room', at: [18, 9.6], yaw: Math.PI, hit: [18, 8.2, 0, 3] });
    spots.push({ kind: 'groom', id: 'groom', name: 'the grooming post', at: [8, 9.8], yaw: Math.PI, hit: [8, 8.2, 0, 3] });
    k.at(36, 0, 5, 0, kk => { bx(kk, 8, 0.2, 5, 0, 0, 0, '#9a8a6a'); for (const [x, z] of [[-3.8, -2.3], [3.8, -2.3], [-3.8, 2.3], [3.8, 2.3]]) kk.cyl(0.15, 4, x, 0, z, '#6b4a33', { n: 5 }); kk.box(8.6, 0.25, 5.6, 0, 4, 0, '#7a6a5a'); for (let i = 0; i < 8; i++) kk.box(1.8, 0.9, 1.2, -2.8 + (i % 4) * 1.9, 0.2 + Math.floor(i / 4) * 0.9, -0.5, '#e8c45a', { r: 0.08 }); }); solid(31.6, 2.3, 40.4, 7.7);
    spots.push({ kind: 'hay', id: 'hay', name: 'the hay barn', at: [36, 9.2], yaw: Math.PI, hit: [36, 5, 0, 5] });
    // the arena: a sand oval, its rail, a gate; horses ride round it
    const A = { x: 35, z: 26, rx: 9, rz: 7 };
    k.cyl(1, 0.06, A.x, 0, A.z, '#e3cf98', { s: [A.rx + 0.6, 1, A.rz + 0.6], n: 36 });
    const rp = a => [A.x + Math.cos(a) * (A.rx + 0.8), A.z + Math.sin(a) * (A.rz + 0.8)];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, b = (i + 1) / 28 * Math.PI * 2, [x, z] = rp(a), [x2, z2] = rp(b); if (Math.abs(a - Math.PI) < 0.18) continue; bx(k, 0.18, 1.3, 0.18, x, 0, z, '#ffffff'); if (Math.abs(b - Math.PI) < 0.18) continue; for (const y of [0.5, 1.0]) k.box(Math.hypot(x2 - x, z2 - z) + 0.05, 0.12, 0.06, (x + x2) / 2, y, (z + z2) / 2, '#ffffff', { ry: -Math.atan2(z2 - z, x2 - x) }); }
    spots.push({ kind: 'arena', id: 'arena', name: 'the riding arena', at: [A.x - A.rx - 2.2, A.z], yaw: Math.PI / 2, hit: [A.x - A.rx - 1, A.z, 0, 3], loop: A });
    // the paddock (donkey, sheep, pig), its trough
    const P = [3, 14, 19, 36]; fence(k, solid, [[P[0], P[1]], [P[2], P[1]], [P[2], P[3]], [P[0], P[3]], [P[0], P[1]]], '#e9e2d4', 1);
    k.at(10, 0, 15.6, 0, kk => bx(kk, 3, 0.7, 0.9, 0, 0, 0, '#8f9aa8', { r: 0.05 })); k.waterBox(2.7, 0.08, 0.6, 10, 0.55, 15.6, { tint: '#6fc0d8' }); solid(8.4, 15, 11.6, 16.2);
    spots.push({ kind: 'strough', id: 'trough', name: 'the water trough', at: [10, 12.6], yaw: 0, hit: [10, 15.6, 0, 3] });
    spots.push({ kind: 'sshear', id: 'shear', name: 'the woolshed corner', at: [20.6, 22], yaw: -Math.PI / 2, hit: [19, 22, 0, 3] });
    spots.push({ kind: 'truffle', id: 'truffle', name: 'the pig’s rooting patch', at: [20.6, 31], yaw: -Math.PI / 2, hit: [19, 31, 0, 3] });
    tree(k, 44, 36, R, 1.1); solid(43.4, 35.4, 44.6, 36.6); tree(k, 6, 38, R, 0.9); solid(5.4, 37.4, 6.6, 38.6);
    post(k, spots, solid, 22.4, 1.6, 'stable');
    const own = (st && st.animals) || { horse: 1, merino: 1 };
    for (const kind of ['horse', 'pony', 'donkey', 'merino', 'kunekune']) for (let i = 0; i < (own[kind] || 0); i++) {
      const a = MAKE[kind](), pen = kind === 'horse' || kind === 'pony' ? [A.x - A.rx + 1.5, A.z - A.rz + 1.5, A.x + A.rx - 1.5, A.z + A.rz - 1.5] : [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1];
      a.pen = pen; a.group.position.set(pen[0] + R() * (pen[2] - pen[0]), 0, pen[1] + R() * (pen[3] - pen[1])); animals.push(a);
    }
    root.add(k.build()); hits(root, spots); for (const a of animals) root.add(a.group);
    const walk = (x, z) => !(x > P[0] + 0.3 && x < P[2] - 0.3 && z > P[1] + 0.3 && z < P[3] - 0.3) && ((x - A.x) / (A.rx + 1.2)) ** 2 + ((z - A.z) / (A.rz + 1.2)) ** 2 > 1;
    return { id: 'stable', title: 'Stable yard', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [24, 3.4], lawns: [[1, 9, 22, 39], [26, 9, 47, 18.4], [26, 33.6, 47, 39]], paths: [[22, 0.4, 26, 39.6]], walk, animals, pens: { horse: [A.x - A.rx + 1.5, A.z - A.rz + 1.5, A.x + A.rx - 1.5, A.z + A.rz - 1.5], pony: [A.x - A.rx + 1.5, A.z - A.rz + 1.5, A.x + A.rx - 1.5, A.z + A.rz - 1.5], donkey: [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1], merino: [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1], kunekune: [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1] }, arena: A, npc: 0, centre: [24, 20], growth: 0.5, state: st };
  }

  /* ---------- the Lake: a big freshwater lake in a grassy bowl, a jetty, a boatshed with kayaks, reeds, willows,
     swans and ducks on the water, a platypus that dives */
  function lake() {
    const W = 56, D = 48, R = rng(4411), [sol, solid] = solids(), spots = [], root = new T.Group(), animals = [];
    const L = { x: 28, z: 27, rx: 19, rz: 13 };
    const ld = (x, z) => { const a = Math.atan2(z - L.z, x - L.x); return Math.hypot((x - L.x) / L.rx, (z - L.z) / L.rz) / (1 + 0.08 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a)); };
    const JET = [26.8, 29.2, 8, 22];
    const h = (x, z) => { if (x > JET[0] && x < JET[1] && z > JET[2] && z < JET[3]) return 0.45; const d = ld(x, z); return d < 1 ? -Math.min(3, (1 - d) * 7) * sm(0, 0.5, 1 - d) - 0.05 * sm(0.85, 1, d) : 0.12 + Math.sin(x * 0.5) * Math.sin(z * 0.4) * 0.12 + (d - 1) * 0.4; };
    const col = (x, z, y) => (x > JET[0] && x < JET[1] && z > JET[2] && z < JET[3] ? '#b7834f' : y < -0.05 ? (y > -0.6 ? '#a9a070' : '#6f7f4f') : ld(x, z) < 1.06 ? '#c9b48a' : Math.sin(x * 0.7) * Math.cos(z * 0.6) > 0.4 ? '#8fcf68' : '#7cc35a');
    const k = new Kit(); sides(k, W, D, R, '#8a7452'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, y => (y > 0 ? '#9a7a52' : '#8f8a99')));
    root.add(LK.seaSheet(L.x - L.rx - 2, L.z - L.rz - 2, L.x + L.rx + 2, L.z + L.rz + 2, 0, (x, z) => (x > JET[0] && x < JET[1] && z > JET[2] && z < JET[3] ? Math.min(-0.5, h(x, z + 6)) : h(x, z)), { n: 1.2, wave: { a: 0.03, k: 1.5, w: 1 }, foam: 0.2, deepAt: 2.6, shallow: '#9fe0c8', deep: '#2a7a8a', mud: '#a9a070' }));
    // the jetty: planks on posts out over the water, a bench at its end
    for (let z = JET[2]; z < JET[3]; z += 0.5) bx(k, JET[1] - JET[0], 0.1, 0.45, (JET[0] + JET[1]) / 2, 0.35, z + 0.25, '#b7834f', { r: 0.02 });
    for (let z = JET[2] + 1; z < JET[3]; z += 2.4) for (const x of [JET[0] + 0.1, JET[1] - 0.1]) k.cyl(0.12, 3, x, -2.6, z, '#6b4a33', { n: 6 });
    spots.push({ kind: 'fish', id: 'jetty', name: 'the end of the jetty', at: [28, 21], yaw: 0, hit: [28, 21.5, 0, 2.4], water: 'fresh', noNpc: true });
    // the boatshed and its kayaks (a paddle round the lake)
    k.at(40, 0, 6.5, -0.2, kk => { bx(kk, 6, 2.8, 4, 0, 0, 0, '#c94a4a', { r: 0.05 }); for (const sd of [-1, 1]) bx(kk, 6.4, 0.2, 2.5, 0, 3.15, sd * 1.05, '#f4ecdc', { rx: sd * 0.5 }); bx(kk, 2.6, 2.2, 0.1, 0, 0, 2.02, '#5a4632'); for (let i = 0; i < 3; i++) kk.ball(0.35, -2.4 + i * 0.25, 0.4 + i * 0.5, 2.6, ['#ffd35a', '#ff7aa2', '#7cc8e8'][i], { s: [1, 0.5, 4.5], n: 8 }); });
    solid(36.6, 4, 43.4, 9); board(k, 'boats', 'KAYAKS', 'paddle round the lake', '#fff6e0', '#c94a4a', 3.2, 0.8, 40, 3.2, 8.55);
    spots.push({ kind: 'kayak', id: 'kayak', name: 'the boatshed', at: [39.4, 10.4], yaw: Math.PI, hit: [40, 6.5, 0, 4], loop: L });
    // reeds round the edge, willows, a picnic table, a rope swing
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + R() * 0.3; if (Math.abs(a - Math.PI * 1.5) < 0.35) continue; reeds(k, L.x + Math.cos(a) * L.rx * 1.0, L.z + Math.sin(a) * L.rz * 1.0, R, 7, -0.1); }
    for (const [x, z] of [[5, 8], [51, 12], [6, 42], [50, 43]]) { tree(k, x, z, R, 1.1, 0, ['#7aa04a', '#8ab45a']); solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6); }
    k.at(14, 0.2, 6, 0.2, kk => { bx(kk, 3, 0.15, 1.4, 0, 1.0, 0, '#b7834f'); for (const s of [-1, 1]) { bx(kk, 3, 0.1, 0.4, 0, 0.6, s * 1.1, '#b7834f'); for (const x of [-1.2, 1.2]) bx(kk, 0.12, 1.0, 0.12, x, 0, s * 0.5, '#8a6038'); } }); solid(12.4, 4.8, 15.6, 7.2);
    spots.push({ kind: 'log', id: 'picnic', name: 'the picnic table', seat: [14, 7.4], at: [14, 8.4], yaw: Math.PI, hit: [14, 6, 0, 3] });
    k.cyl(0.45, 3.4, 8, 0, 25, '#6b4a33', { n: 7 }); k.cyl(0.2, 3.5, 9.6, 3.0, 25, '#6b4a33', { n: 6, rz: -1.2 }); for (let i = 0; i < 5; i++) k.ball(1.4, 7 + i * 1.1, 5.2 + (i % 2) * 0.4, 24.4 + (i % 3) * 0.6, '#4f9a3c', { n: 9 }); k.cyl(0.02, 2.4, 11.2, 1.2, 25, '#c9a173', { n: 3 }); bx(k, 0.5, 0.08, 0.2, 11.2, 1.15, 25, '#8a6038'); solid(7.5, 24.5, 8.5, 25.5);
    spots.push({ kind: 'swim', id: 'swing', name: 'the rope swing', at: [10.5, 23.5], yaw: Math.PI / 2, hit: [10, 25, 0, 3], npcPose: 'splash', swimTo: [13.5, 27] });
    post(k, spots, solid, 22.4, 2.4, 'lake');
    // the water's creatures
    for (let i = 0; i < 2; i++) animals.push(glider(() => A3('swan') || swan(), L.x + 2, L.z + 2, 9 + i * 3, 5 + i * 2, 0.12 * (i ? -1 : 1), -0.05, i * 3));
    for (let i = 0; i < 3; i++) animals.push(glider(() => A3('duck') || duck(), L.x - 7 + i * 1.2, L.z - 2, 3, 2, 0.35, -0.05, i * 0.6));
    { const p3 = A3('platypus'), g = p3 ? p3.group : new T.Group(); if (!p3) { const kk = new Kit(); kk.ball(0.35, 0, 0, 0, '#7a5a3a', { s: [0.9, 0.55, 1.5], n: 10 }); kk.box(0.4, 0.06, 0.4, 0, 0, 0.62, '#2a2630', { r: 0.05 }); kk.box(0.45, 0.04, 0.3, 0, 0, -0.62, '#6a4a2a'); g.add(kk.build()); }
      animals.push({ group: g, kind: 'platypus', tick(t) { const u = (t * 0.08) % 1, a = u * Math.PI * 2; g.position.set(L.x - 6 + Math.cos(a) * 4, -0.6 + Math.max(0, Math.sin(t * 0.5)) * 0.58, L.z + 4 + Math.sin(a) * 3); g.rotation.y = -a; } }); }
    root.add(k.build()); hits(root, spots, h); for (const a of animals) root.add(a.group);
    const walk = (x, z) => (x > JET[0] - 0.05 && x < JET[1] + 0.05 && z > JET[2] && z < JET[3]) || h(x, z) > -0.75;
    return { id: 'lake', title: 'Lake', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [24, 3.6], lawns: [], paths: [], height: h, walk, animals, npc: 4, wet: (x, z) => Math.max(0, -h(x, z)), centre: [28, 22], lake: L };
  }

  /* ---------- Forest grove: native bush, a stream across the island, a swing bridge, a walking track, a bird hide,
     a tuatara on its log, a glow-worm cave in the bank */
  function grove() {
    const W = 48, D = 44, R = rng(2026), [sol, solid] = solids(), spots = [], root = new T.Group(), animals = [];
    const sz = x => 17 + Math.sin(x * 0.18) * 2.2, BR = [20, 23];
    const h = (x, z) => { const d = Math.abs(z - sz(x)); if (x > BR[0] && x < BR[1] && d < 3.4) return 0.35 + Math.sin((z - sz(x) + 3.4) / 6.8 * Math.PI) * -0.15; return d < 2.2 ? -1.0 * (1 - sm(0.8, 2.2, d)) : 0.1 + sm(2.2, 4, d) * 0.4 + (Math.sin(x * 0.5) * Math.cos(z * 0.4)) * 0.12; };
    const col = (x, z, y) => (x > BR[0] && x < BR[1] && Math.abs(z - sz(x)) < 3.4 ? '#b7834f' : y < -0.2 ? '#8a8270' : y < 0.2 ? '#7a6a4a' : Math.sin(x * 1.1) * Math.sin(z * 0.9) > 0.2 ? '#4f7a3a' : '#5a8a42');
    const k = new Kit(); sides(k, W, D, R, '#6b5a42'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, () => '#6b5a42'));
    root.add(LK.seaSheet(0.2, sz(0) - 4, W - 0.2, sz(W) + 4 + 3, -0.25, (x, z) => (x > BR[0] && x < BR[1] ? -1 : h(x, z)), { n: 1.6, foam: 0.25, deepAt: 0.8, shallow: '#a6e0d2', deep: '#3a8a8a', mud: '#7a6a4a', flow: [1.2, 0] }));
    // the swing bridge: planks hung on ropes between two pairs of posts
    for (let i = 0; i < 14; i++) { const u = i / 13, z = sz(21.5) - 3.4 + u * 6.8; bx(k, BR[1] - BR[0], 0.08, 0.4, 21.5, h(21.5, z) - 0.05, z, '#b7834f', { r: 0.02 }); }
    for (const s of [BR[0] + 0.1, BR[1] - 0.1]) { for (const e of [-3.6, 3.6]) k.cyl(0.12, 2.0, s, 0.2, sz(21.5) + e, '#6b4a33', { n: 5 }); for (let i = 0; i < 12; i++) { const z0 = sz(21.5) - 3.6 + i * 0.6, y0 = 1.9 - Math.sin(i / 11 * Math.PI) * 0.5; k.cyl(0.03, 0.62, s, y0, z0, '#c9a173', { n: 3, rx: Math.PI / 2 }); } }
    // the bush: kauri, tree ferns, nīkau; thick round the edges, the track left clear
    const clear = (x, z) => Math.abs(z - sz(x)) < 3 || (x > 16 && x < 26) || (z > 34 && x > 30) || (x < 10 && z < 8) || (z < 6 && x > 18 && x < 30);
    for (let i = 0; i < 70; i++) { const x = 1.5 + R() * 45, z = 1.5 + R() * 41; if (clear(x, z)) continue; const y = h(x, z), r = R(); if (r < 0.25) kauri(k, x, z, R, 0.8 + R() * 0.3, y); else if (r < 0.65) fern(k, x, z, R, 0.8 + R() * 0.5, y); else nikau(k, x, z, R, 0.7 + R() * 0.3, y); solid(x - 0.45, z - 0.45, x + 0.45, z + 0.45); }
    for (let i = 0; i < 60; i++) { const x = R() * W, z = R() * D; if (clear(x, z)) continue; k.ball(0.45 + R() * 0.4, x, h(x, z) + 0.2, z, R() < 0.5 ? '#3f6e35' : '#4e7e40', { n: 7, s: [1, 0.6, 1] }); }
    // the bird hide, the tuatara's log, the glow-worm cave
    k.at(36, h(36, 38), 38, Math.PI, kk => { bx(kk, 5, 2.6, 3, 0, 0, 0, '#6b5a42', { r: 0.05 }); bx(kk, 5.4, 0.2, 3.4, 0, 2.6, 0, '#4a3a2c'); bx(kk, 3.6, 0.5, 0.1, 0, 1.4, 1.52, '#1f1a16'); });
    solid(33.4, 36.4, 38.6, 39.6); spots.push({ kind: 'hide', id: 'hide', name: 'the bird hide', at: [36, 35.2], yaw: 0, hit: [36, 38, 0, 4] });
    k.cyl(0.5, 3.2, 12, h(12, 30) + 0.4, 30, '#7a5a3a', { n: 8, rz: Math.PI / 2, ry: 0.4 }); solid(10.4, 29.2, 13.6, 30.8);
    const tu = new Kit(); tu.ball(0.18, 0, 0.1, 0, '#6a6a4a', { s: [0.8, 0.5, 2.2], n: 8 }); tu.ball(0.12, 0, 0.12, 0.42, '#6a6a4a', { n: 7 }); tu.cone(0.08, 0.5, 0, 0.1, -0.5, '#6a6a4a', { rx: -Math.PI / 2, n: 5 }); for (let i = 0; i < 5; i++) tu.cone(0.03, 0.08, 0, 0.22, 0.3 - i * 0.12, '#e8e2a0', { n: 3 }); const t3 = A3('tuatara'), tuG = t3 ? t3.group : tu.build(); tuG.position.set(12, h(12, 30) + (t3 ? 0.78 : 0.88), 30); tuG.rotation.y = 0.4; root.add(tuG);
    { const w = A3('weka'); if (w) { w.pen = [26, 26, 44, 33]; w.group.position.set(30, 0, 28); animals.push(w); } }
    spots.push({ kind: 'tuatara', id: 'tuatara', name: 'the tuatara’s log', at: [12, 32.2], yaw: Math.PI, hit: [12, 30, 0, 3] });
    k.at(5, h(5, 4), 4, 0.6, kk => { kk.ball(3.2, 0, 1.2, 0, '#5a5048', { s: [1.4, 1, 1], n: 10 }); kk.ball(1.3, 0, 0.9, 2.6, '#14121a', { s: [1.1, 1.2, 0.4], n: 10 }); for (let i = 0; i < 4; i++) fern(kk, -2 + i * 1.3, 2.6, R, 0.5, 2.6); });
    for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.SphereGeometry(0.05, 5, 4), new T.MeshBasicMaterial({ color: 0x7ff5ff })); m.position.set(5 + Math.sin(0.6) * 2.6 + (R() - 0.5) * 1.6, h(5, 4) + 0.6 + R() * 1.4, 4 + Math.cos(0.6) * 2.6 + (R() - 0.5) * 0.4); m.layers.set(1); root.add(m); }
    solid(1.5, 0.8, 8.5, 7); spots.push({ kind: 'cave', id: 'cave', name: 'the glow-worm cave', at: [7.6, 8.4], yaw: -2.4, hit: [6.4, 6.2, 0, 3] });
    spots.push({ kind: 'stream', id: 'stream', name: 'the stream', at: [30, sz(30) - 2.6], yaw: 0, hit: [30, sz(30), 0, 4], npcPose: 'look' });
    post(k, spots, solid, 22.6, 2.2, 'grove');
    // birds: tūī, pīwakawaka, kererū hopping between the treetops
    const perches = []; root.traverse(() => {}); for (let i = 0; i < 12; i++) { const x = 4 + R() * 40, z = 4 + R() * 36; if (!clear(x, z)) perches.push([x, h(x, z) + 4.2 + R() * 1.5, z]); }
    if (perches.length > 2) { animals.push(bird('#1f2a3a', '#2a3a4a', '#1a2430', perches, R, 1.1, 'tui'), bird('#5a4a3a', '#e8c9a0', '#4a3a2a', perches, R, 0.8, 'fantail'), bird('#3f7a4a', '#ffffff', '#2f6a3a', perches, R, 1.5, 'kereru')); }
    root.add(k.build()); hits(root, spots, h); for (const a of animals) root.add(a.group);
    const walk = (x, z) => { const d = Math.abs(z - sz(x)); return (x > BR[0] && x < BR[1]) || d > 2.4; };
    return { id: 'grove', title: 'Forest grove', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [21.5, 3.6], lawns: [], paths: [], height: h, walk, animals, npc: 3, centre: [24, 20] };
  }

  /* ---------- Waterfall cliff: a tall cliff at the back, a waterfall into a plunge pool, a rainbow in its spray, a
     creek that runs off the island's front edge in a second fall, ferns and rocks */
  function waterfall() {
    const W = 48, D = 44, R = rng(3331), [sol, solid] = solids(), spots = [], root = new T.Group();
    const CL = 13, POOL = { x: 24, z: 21, r: 6.5 }, cr = x => 24 + Math.sin(x * 0.4) * 0.6;
    const h = (x, z) => {
      const cliff = sm(CL + 1.5, CL - 0.5, z) * (7.5 + Math.sin(x * 0.7) * 0.4), pd = Math.hypot(x - POOL.x, (z - POOL.z) * 1.15) / POOL.r;
      let y = cliff + 0.15 + Math.sin(x * 0.6) * Math.cos(z * 0.5) * 0.12;
      if (pd < 1.15) y = Math.min(y, -1.8 * (1 - sm(0.5, 1.15, pd)) + 0.1 * sm(0.9, 1.15, pd));
      const cd = Math.abs(x - cr(z)); if (z > POOL.z && cd < 2.2) y = Math.min(y, -0.45 * (1 - sm(0.8, 2.2, cd)));
      return y;
    };
    const col = (x, z, y) => (y > 3 ? (Math.sin(x * 1.3 + y) > 0.3 ? '#8a8596' : '#9a95a5') : y > 1.5 ? '#7d788a' : y < -0.1 ? '#8a8270' : Math.sin(x * 0.8) * Math.cos(z * 0.7) > 0.3 ? '#5fae4a' : '#6fbf55');
    const k = new Kit(); sides(k, W, D, R, '#8a7452'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, y => (y > 1 ? '#8f8a99' : '#9a7a52')));
    root.add(LK.seaSheet(POOL.x - POOL.r - 1.5, POOL.z - POOL.r - 1, POOL.x + POOL.r + 1.5, POOL.z + POOL.r + 1, -0.15, h, { n: 2, foam: 0.3, deepAt: 1.4, shallow: '#a6f0e0', deep: '#2a8aa0', mud: '#8a8270', flow: [0, 0.3] }));
    root.add(LK.seaSheet(cr(D) - 2.5, POOL.z + 4, cr(D) + 2.5, D - 0.05, -0.15, h, { n: 2, foam: 0.2, deepAt: 0.4, shallow: '#a6f0e0', deep: '#3a9ab0', mud: '#8a8270', flow: [0, -1.8] }));
    // the falls: from the cliff top into the pool; and the creek off the island's edge into the sky
    const fall = (w, hgt, x, y, z, ry = 0) => { const m = new T.Mesh(new T.PlaneGeometry(w, hgt), LK.fallMat({ rep: hgt * 0.8 })); m.position.set(x, y, z); m.rotation.y = ry; m.layers.set(1); m.renderOrder = 3; m.userData.bg = true; root.add(m); return m; };
    fall(3.6, 8.6, POOL.x, 3.4, CL + 2.3); fall(3.6, 8.6, POOL.x, 3.4, CL + 2.1, Math.PI);
    root.add(LK.seaSheet(POOL.x - 2, 0.3, POOL.x + 2, CL + 2.2, 7.7, () => 7.4, { n: 1, foam: 0.1, deepAt: 0.3, shallow: '#a6f0e0', deep: '#3a9ab0', flow: [0, 1.8] }));
    const edge = fall(3.4, 7, cr(D), -3.6, D + 0.15); edge.rotation.y = Math.PI;
    const spray = puffs(root, 10, POOL.x, -0.1, CL + 2.8, 1.2);
    // the rainbow in the spray
    const rk = new Kit(); ['#ff5a5a', '#ffa53a', '#ffe14a', '#6fd36a', '#5aa8ff', '#9a6aff'].forEach((c, i) => rk.torus(4.2 - i * 0.16, 0.08, 0, 0, 0, c, { arc: Math.PI })); const rb = rk.build({ shadow: false }); rb.position.set(POOL.x, 0.2, CL + 3.4); rb.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; m.material.opacity = 0.55; m.layers.set(1); m.userData.bg = true; } }); root.add(rb);
    // ferns and rocks round the pool, a picnic rug, the path behind the falls, a lookout by the edge
    for (let i = 0; i < 18; i++) { const a = R() * Math.PI * 2, r = POOL.r + 1.2 + R() * 3, x = POOL.x + Math.cos(a) * r, z = POOL.z + Math.sin(a) * r * 0.85; if (z < CL + 1 || Math.abs(x - cr(z)) < 3) continue; if (i % 2) fern(k, x, z, R, 0.6 + R() * 0.3, h(x, z)); else rock(k, x, h(x, z), z, 0.5 + R() * 0.5, R); solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4); }
    for (let i = 0; i < 26; i++) { const x = R() * W, z = 1 + R() * (CL - 2); fern(k, x, z, R, 0.7 + R() * 0.4, h(x, z)); }
    k.at(36, h(36, 30) + 0.02, 30, 0.3, kk => { bx(kk, 3, 0.03, 2.4, 0, 0, 0, '#e85a5a'); for (let i = 0; i < 4; i++) bx(kk, 3, 0.032, 0.25, 0, 0, -0.9 + i * 0.6, '#ffffff'); kk.box(0.8, 0.5, 0.5, 0.6, 0, 0.4, '#c9a173', { r: 0.06 }); });
    spots.push({ kind: 'towel', id: 'rug', name: 'the picnic rug', at: [36, 30.3], yaw: Math.PI, hit: [36, 30, 0, 3], npcPose: 'sit' });
    spots.push({ kind: 'swim', id: 'pool', name: 'the plunge pool', at: [POOL.x + 6.6, POOL.z + 2], yaw: -Math.PI / 2, hit: [POOL.x, POOL.z + 1, 0, 6], npcPose: 'splash', swimTo: [POOL.x + 2.6, POOL.z + 1.6] });
    spots.push({ kind: 'behind', id: 'behind', name: 'the ledge behind the falls', at: [POOL.x + 3.6, CL + 1.6], yaw: Math.PI, hit: [POOL.x, CL + 1.2, 0, 3], noNpc: true });
    spots.push({ kind: 'rainbow', id: 'rainbow', name: 'the rainbow', at: [POOL.x - 7, POOL.z + 5], yaw: 0.8, hit: [POOL.x - 4, CL + 3.4, 0, 3], npcPose: 'look' });
    bx(k, 4, 0.2, 3, cr(D) + 6, h(cr(D) + 6, D - 3) + 0.05, D - 3, '#b7834f'); for (const [dx, dz] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) k.cyl(0.06, 1.1, cr(D) + 6 + dx, h(cr(D) + 6, D - 3), D - 3 + dz, '#8a6038', { n: 4 });
    spots.push({ kind: 'edge', id: 'edge', name: 'the edge lookout', at: [cr(D) + 6, D - 3.4], yaw: 0, hit: [cr(D) + 6, D - 3, 0, 3], npcPose: 'look' });
    post(k, spots, solid, 8, 30, 'waterfall');
    root.add(k.build()); hits(root, spots, h);
    const walk = (x, z) => { const y = h(x, z); if (z < CL + 1.2 && !(Math.abs(x - POOL.x - 3.6) < 1 && z > CL + 0.6)) return false; return y > -0.8 && y < 1.2; };
    const tick = t => { tickPuffs(spray, t, 2.6, 0.5); rb.children.forEach(m => { if (m.material) m.material.opacity = 0.4 + Math.sin(t * 0.6) * 0.15; }); };
    return { id: 'waterfall', title: 'Waterfall cliff', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [9.4, 31.2], lawns: [], paths: [], height: h, walk, animals: [], npc: 4, wet: (x, z) => Math.max(0, -h(x, z) - 0.15), centre: [24, 26], tick };
  }

  /* ---------- Mountain lookout: a snowy peak at the back, a geyser basin in front: a geyser that erupts, a rainbow
     hot spring, hot pools to soak in, steaming vents, sinter terraces, boardwalks, an overlook with a telescope */
  function lookout() {
    const W = 52, D = 44, R = rng(5555), [sol, solid] = solids(), spots = [], root = new T.Group();
    const SPR = { x: 14, z: 28, r: 4.2 }, POOLS = [[35, 27, 3], [40.5, 31.5, 2.4]], GEY = [25, 34];
    const h = (x, z) => {
      const m = Math.max(0, 12 - Math.hypot((x - 26) * 0.75, (z + 2) * 1.0) * 0.9) + Math.max(0, 6 - Math.hypot((x - 8) * 0.8, z * 1.1) * 0.8) + Math.max(0, 7 - Math.hypot((x - 45) * 0.8, (z - 1) * 1.1) * 0.8);
      let y = m + 0.1 + Math.sin(x * 0.5) * Math.cos(z * 0.6) * 0.1;
      const sd = Math.hypot(x - SPR.x, z - SPR.z) / SPR.r; if (sd < 1.1) y = Math.min(y, -0.9 * (1 - sm(0.3, 1.1, sd)) + 0.05);
      for (const [px, pz, pr] of POOLS) { const d = Math.hypot(x - px, z - pz) / pr; if (d < 1.15) y = Math.min(y, -0.6 * (1 - sm(0.6, 1.15, d)) + 0.25); }
      const gd = Math.hypot(x - GEY[0], z - GEY[1]); if (gd < 2) y = Math.max(y, 0.7 * (1 - gd / 2) + 0.1);
      return y;
    };
    const col = (x, z, y) => { const sd = Math.hypot(x - SPR.x, z - SPR.z) / SPR.r; if (sd < 1.35) return sd < 0.35 ? '#2a7ab0' : sd < 0.6 ? '#3aa0a0' : sd < 0.8 ? '#8ad06a' : sd < 1.0 ? '#f2c14a' : '#e8853a'; if (y > 7.5) return '#ffffff'; if (y > 3) return Math.sin(x * 1.2 + z) > 0.2 ? '#7d788a' : '#8a8596'; if (y > 1.2) return '#6a8a5a'; if (POOLS.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr * 1.5) || Math.hypot(x - GEY[0], z - GEY[1]) < 3) return '#efe6d2'; return Math.sin(x * 0.9) * Math.cos(z * 0.8) > 0.3 ? '#9ab06a' : '#a6b878'; };
    const k = new Kit(); sides(k, W, D, R, '#8a7452'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, y => (y > 2 ? '#8f8a99' : '#9a7a52')));
    root.add(LK.seaSheet(SPR.x - SPR.r - 0.6, SPR.z - SPR.r - 0.6, SPR.x + SPR.r + 0.6, SPR.z + SPR.r + 0.6, 0.02, h, { n: 4, foam: 0.12, deepAt: 0.9, shallow: '#bff2ff', deep: '#1a6ab8', mud: '#f2c14a' }));
    for (const [px, pz, pr] of POOLS) root.add(LK.seaSheet(px - pr - 0.5, pz - pr - 0.5, px + pr + 0.5, pz + pr + 0.5, 0.2, h, { n: 4, foam: 0.1, deepAt: 0.6, shallow: '#a6f0f0', deep: '#3ab0c0', mud: '#efe6d2' }));
    // sinter terraces below the pools, steaming vents, the geyser's cone
    for (let i = 0; i < 5; i++) k.cyl(1.6 - i * 0.1, 0.12, 44 + i * 0.8, 0.05 - i * 0.02, 36 + i * 1.2, '#f4ead8', { n: 14, s: [1.4, 1, 0.8] });
    k.cone(1.4, 0.8, GEY[0], h(GEY[0], GEY[1]) - 0.3, GEY[1], '#e8dcc4', { n: 12 }); solid(GEY[0] - 2.2, GEY[1] - 2.2, GEY[0] + 2.2, GEY[1] + 2.2);
    const vents = [[20, 24], [30, 38], [9, 36], [46, 24]].map(([x, z]) => { k.cyl(0.35, 0.2, x, h(x, z) - 0.05, z, '#cfc6b0', { n: 8 }); return puffs(root, 6, x, h(x, z) + 0.1, z, 0.3); });
    const poolSteam = POOLS.map(([x, z]) => puffs(root, 5, x, 0.3, z, 1.0)), sprSteam = puffs(root, 6, SPR.x, 0.1, SPR.z, 1.6);
    const gey = puffs(root, 16, GEY[0], h(GEY[0], GEY[1]) + 0.4, GEY[1], 0.25), col2 = new T.Group(); root.add(col2);
    const colBalls = []; for (let i = 0; i < 12; i++) { const m = new T.Mesh(new T.SphereGeometry(0.45, 10, 8), new T.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.8, depthWrite: false })); m.layers.set(1); m.userData.bg = true; col2.add(m); colBalls.push(m); }
    col2.position.set(GEY[0], h(GEY[0], GEY[1]) + 0.4, GEY[1]);
    // boardwalks round the basin
    for (const [x0, z0, x1, z1] of [[6, 22, 46, 22], [24, 22, 24, 30], [8, 22, 8, 40], [8, 40, 48, 40], [46, 22, 46, 40]]) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(L / 0.6); for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, z = z0 + (z1 - z0) * i / n; bx(k, x0 === x1 ? 2 : 0.55, 0.1, x0 === x1 ? 0.55 : 2, x, Math.max(0.15, h(x, z)) + 0.1, z, '#b7834f', { r: 0.02 }); } }
    spots.push({ kind: 'geyser', id: 'geyser', name: 'the geyser', at: [GEY[0] - 3.4, GEY[1] + 0.6], yaw: Math.PI / 2, hit: [GEY[0], GEY[1], 0, 3], npcPose: 'look' });
    spots.push({ kind: 'spring', id: 'spring', name: 'the rainbow spring', at: [SPR.x + 5, SPR.z - 3.6], yaw: -Math.PI * 0.7, hit: [SPR.x, SPR.z, 0, 6], npcPose: 'look' });
    POOLS.forEach(([px, pz, pr], i) => spots.push({ kind: 'soak', id: 'pool' + i, name: 'a hot pool', at: [px - pr - 1.2, pz], yaw: Math.PI / 2, hit: [px, pz, 0, pr * 1.6], npcPose: 'splash', swimTo: [px - pr * 0.3, pz] }));
    // the overlook: a platform out on the front edge, a telescope, a sign
    k.at(30, 0.3, 42, 0, kk => { bx(kk, 7, 0.2, 3.2, 0, 0, 0, '#b7834f'); for (let x = -3.4; x <= 3.4; x += 0.85) bx(kk, 0.1, 1.1, 0.1, x, 0.2, 1.5, '#8a6038'); kk.box(7, 0.1, 0.1, 0, 1.25, 1.5, '#8a6038'); kk.cyl(0.08, 1.2, 1.5, 0.2, 0.4, '#3d4048', { n: 6 }); kk.cyl(0.14, 0.9, 1.5, 1.35, 0.6, '#c9a14a', { n: 10, rx: 1.2 }); });
    spots.push({ kind: 'telescope', id: 'telescope', name: 'the telescope', at: [31.5, 41.6], yaw: 0, hit: [31.5, 42.4, 0, 2.6], npcPose: 'look' });
    for (let i = 0; i < 16; i++) { const x = R() * W, z = 3 + R() * 12, y = h(x, z); if (y < 1 || y > 6) continue; k.cone(0.9, 2.6, x, y, z, '#2f5a3a', { n: 7 }); k.cone(0.7, 2, x, y + 1.5, z, '#3a6a44', { n: 7 }); }
    post(k, spots, solid, 4, 24, 'lookout');
    root.add(k.build()); hits(root, spots, h);
    const walk = (x, z) => { const y = h(x, z); if (y > 1.4) return false; if (Math.hypot(x - SPR.x, z - SPR.z) < SPR.r * 1.05) return false; return y > -0.8; };
    let erupt = 0; const tick = (t, dt) => {
      for (const v of vents) tickPuffs(v, t, 2.4, 0.3); for (const p of poolSteam) tickPuffs(p, t, 1.6, 0.2); tickPuffs(sprSteam, t, 2.2, 0.15);
      const c = t % 20, on = c > 14 && c < 19; erupt += ((on ? 1 : 0) - erupt) * Math.min(1, dt * 2.5);
      colBalls.forEach((m, i) => { const u = (t * 1.6 + i / colBalls.length) % 1; m.position.set(Math.sin(i * 7 + t * 3) * 0.3 * u, u * 9 * erupt, Math.cos(i * 5 + t * 3) * 0.3 * u); m.scale.setScalar((0.5 + u * 1.2) * erupt + 0.001); m.material.opacity = 0.8 * (1 - u * 0.7); });
      tickPuffs(gey, t, 1.5 + erupt * 9, 0.4);
    };
    return { id: 'lookout', title: 'Mountain lookout', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [5.6, 25.4], lawns: [], paths: [], height: h, walk, animals: [], npc: 4, wet: (x, z) => Math.max(0, 0.2 - h(x, z)) * (POOLS.some(([px, pz, pr]) => Math.hypot(x - px, z - pz) < pr * 1.1) ? 1 : 0), centre: [26, 30], tick };
  }

  /* ---------- Floating sky islet: a small grassy island high in the clouds, a rainbow arch, a hot-air balloon to
     go up in, a kite to fly, cloud cushions to lie on, a bell to ring, little rocks floating round it */
  function sky() {
    const W = 30, D = 24, R = rng(8080), [sol, solid] = solids(), spots = [], root = new T.Group(), animals = [];
    const h = (x, z) => 0.2 + Math.max(0, 1 - Math.hypot((x - 15) / 14, (z - 12) / 11)) * 0.9 + Math.sin(x * 0.6) * Math.cos(z * 0.5) * 0.06;
    const col = (x, z) => (Math.sin(x * 0.9) * Math.cos(z * 0.7) > 0.4 ? '#9be38f' : '#86d27a');
    const k = new Kit(); sides(k, W, D, R, '#b7d0e8'); root.add(terrain(W, D, h, col, 2)); root.add(skirt(W, D, h, () => '#9a7a52'));
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, r = 1 + R() * 0.3; k.ball(1.4 + R(), 15 + Math.cos(a) * 15.5 * r, -0.4 + R() * 0.5, 12 + Math.sin(a) * 12.5 * r, '#ffffff', { n: 9, s: [1.4, 0.7, 1.2] }); }
    for (let i = 0; i < 6; i++) { const a = R() * Math.PI * 2; k.cone(0.9 + R(), 1.6, 15 + Math.cos(a) * 22, -3 - R() * 4, 12 + Math.sin(a) * 18, '#8a8596', { rx: Math.PI, n: 6 }); k.ball(1.1, 15 + Math.cos(a) * 22, -1.6 - R() * 4 + 1.1, 12 + Math.sin(a) * 18, '#86d27a', { s: [1, 0.3, 1], n: 8 }); }
    const rk = new Kit(); ['#ff5a5a', '#ffa53a', '#ffe14a', '#6fd36a', '#5aa8ff', '#9a6aff'].forEach((c, i) => rk.torus(7 - i * 0.3, 0.16, 0, 0, 0, c, { arc: Math.PI })); const rb = rk.build({ shadow: false }); rb.position.set(15, 0.3, 3); root.add(rb);
    // the balloon (tethered; up and back down)
    const bal = new Kit(); bal.ball(2.2, 0, 5.4, 0, '#ff7aa2', { s: [1, 1.15, 1], n: 16 }); for (let i = 0; i < 8; i++) bal.box(0.12, 4.6, 0.05, Math.cos(i / 8 * Math.PI * 2) * 2.15, 3.4, Math.sin(i / 8 * Math.PI * 2) * 2.15, '#ffffff', { ry: -i / 8 * Math.PI * 2 }); bal.cone(1.0, 1.2, 0, 2.6, 0, '#ff7aa2', { rx: Math.PI, n: 12 }); for (const [a, b] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) bal.cyl(0.02, 1.4, a, 1.2, b, '#6b4a33', { n: 3 }); bal.box(1.4, 0.9, 1.4, 0, 0.3, 0, '#b7834f', { r: 0.08 });
    const balloon = bal.build(); balloon.position.set(23, h(23, 9), 9); root.add(balloon); solid(22, 8, 24, 10);
    spots.push({ kind: 'balloon', id: 'balloon', name: 'the hot-air balloon', at: [23, 11.4], yaw: Math.PI, hit: [23, 9, 0, 3], noNpc: true, balloon });
    spots.push({ kind: 'kite', id: 'kite', name: 'the windy hilltop', at: [10, 14], yaw: Math.PI, hit: [10, 14, 0, 3], npcPose: 'happy' });
    for (const [x, z] of [[18, 17], [21, 18.4]]) { k.ball(1.0, x, h(x, z) + 0.3, z, '#ffffff', { s: [1.4, 0.55, 1.1], n: 10 }); solid(x - 1.2, z - 0.8, x + 1.2, z + 0.8); spots.push({ kind: 'towel', id: 'cloud' + x, name: 'a cloud cushion', at: [x, z + 1.2], yaw: Math.PI, hit: [x, z, 0, 2.4], npcPose: 'sit' }); }
    k.at(7, h(7, 6), 6, 0.3, kk => { for (const s of [-1, 1]) bx(kk, 0.15, 2.6, 0.15, s * 0.8, 0, 0, '#8a6038'); bx(kk, 2, 0.2, 0.25, 0, 2.5, 0, '#8a6038'); kk.lathe([[0.01, 0], [0.4, 0.05], [0.38, 0.4], [0.2, 0.75], [0.01, 0.8]], 0, 1.6, 0, '#d9b04a', { n: 14 }); });
    solid(6, 5.6, 8, 6.4); spots.push({ kind: 'bell', id: 'bell', name: 'the wishing bell', at: [7.4, 7.8], yaw: Math.PI, hit: [7, 6, 0, 2.6], npcPose: 'look' });
    k.at(26, h(26, 18), 18, -0.6, kk => { kk.cyl(0.08, 1.3, 0, 0, 0, '#3d4048', { n: 6 }); kk.cyl(0.14, 0.9, 0, 1.4, 0.2, '#c9a14a', { n: 10, rx: 1.0 }); }); solid(25.6, 17.6, 26.4, 18.4);
    spots.push({ kind: 'stars', id: 'stars', name: 'the star telescope', at: [25.4, 19.6], yaw: 0, hit: [26, 18, 0, 2.4], npcPose: 'look' });
    for (let i = 0; i < 18; i++) { const x = 2 + R() * 26, z = 2 + R() * 20; k.ball(0.14, x, h(x, z) + 0.1, z, ['#ff8fb1', '#ffd34f', '#b59cff', '#ffffff'][i % 4], { n: 6 }); }
    post(k, spots, solid, 13.2, 2.6, 'sky');
    // a pair of birds wheeling round, the kite (shown while it's flown)
    for (let i = 0; i < 2; i++) { const b = bird('#ffffff', '#f4f4f4', '#dfe6ee', [[0, 0, 0]], R, 1.4, 'gull'); b.tick = t => { const a = t * 0.35 + i * Math.PI; b.group.position.set(15 + Math.cos(a) * 18, 6 + Math.sin(t * 0.7 + i) * 1.5, 12 + Math.sin(a) * 14); b.group.rotation.y = -a; }; animals.push(b); }
    const kk = new Kit(); kk.box(1.2, 1.2, 0.04, 0, 0, 0, '#ffd35a', { rz: Math.PI / 4 }); kk.box(0.06, 1.7, 0.05, 0, 0, 0.03, '#e85a5a'); for (let i = 0; i < 5; i++) kk.box(0.2, 0.08, 0.02, 0, -1 - i * 0.35, 0, ['#e85a5a', '#7cc8e8', '#9be38f'][i % 3]); const kite = kk.build({ shadow: false }); kite.visible = false; root.add(kite);
    root.add(k.build()); hits(root, spots, h); for (const a of animals) root.add(a.group);
    const tick = t => { rb.position.y = 0.3 + Math.sin(t * 0.4) * 0.1; if (!kite.userData.on) balloon.position.y = h(23, 9) + Math.sin(t * 0.8) * 0.12; if (kite.visible) { kite.position.y = kite.userData.y + Math.sin(t * 1.3) * 0.6; kite.rotation.z = Math.sin(t * 1.7) * 0.3; } };
    return { id: 'sky', title: 'Floating sky islet', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids: sol, pond: null, bridges: [], spots, buildings: [], arrive: [14.6, 4.4], lawns: [], paths: [], height: h, animals, npc: 2, centre: [15, 12], tick, kite, balloon };
  }

  for (const [id, fn] of Object.entries({ plot, orchard, stable, lake, grove, waterfall, lookout, sky })) IB.add(id, fn);
})();
