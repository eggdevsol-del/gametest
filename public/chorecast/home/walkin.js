/* Walk-in buildings (build rule, 2026-11-11): anything with an interior in real life has one in game. A building
   is four walls, each built twice (full height, and a waist-high stub with the same doorways), a roof, an optional
   loft, and what's inside. Outside it looks whole. When the player's own character walks in, the two walls facing
   the camera drop to their stubs and the roof (and the loft over your head) fades to see-through, exactly like the
   home; walk out and they come back. Walls are thin solids with the doorways left open, so walking goes in through
   the door and round what's inside.

   build(def):
     x, z, ry          where it stands (ry a quarter turn: 0, ±PI/2 or PI); local +z is its front
     w, d, h           footprint and wall height; rise: the gable's height over the walls
     clad              'board' (weatherboards) or 'iron' (corrugated); col: { wall, lining, trim, roof, rib, floor }
     doors             [{ side: 'f'|'b'|'l'|'r', at (along the side, from its middle), w, h, slide: 'l'|'r' }]
     windows           [{ side, at, w, h, y }]
     loft              { z0, z1, y } a hay loft over part of the floor, with a ladder at its front edge
     fit(k, api)       what's inside, in local metres: k is the building's own kit (static things); api.solid(x0,
                       z0, x1, z1) a solid; api.part(name, x, y, z, ry, build) a separate group (things that move or
                       come and go: lids, a bucket on its hook); api.spot(s) a place to tap (at/hit in local metres,
                       yaw local); api.over(build) things up on the loft (they fade with it)
   Returns { group, solids (world rects), spots (world), parts, inside(x, z), tick(kx, kz, camYaw, dt), toW(x, z),
   yawW(a), lamp } */
(() => {
  const IH = window.IsoHome = window.IsoHome || {}, T = window.THREE, PI = Math.PI;
  const SIDE = { f: [0, 1], b: [0, -1], l: [-1, 0], r: [1, 0] };
  const T0 = 0.16, STUB = 1.0;

  function build(def) {
    const K = IH.kit.Kit, LK = IH.look, w = def.w, d = def.d, H = def.h, rise = def.rise || 0, col = def.col, ry = def.ry || 0;
    const c = Math.round(Math.cos(ry)), s = Math.round(Math.sin(ry));
    const toW = (lx, lz) => [def.x + lx * c + lz * s, def.z - lx * s + lz * c];
    const yawW = a => a + ry;
    const group = new T.Group(); group.position.set(def.x, 0, def.z); group.rotation.y = ry;
    const solids = [], spots = [], parts = {};
    const solidL = (x0, z0, x1, z1) => { const a = toW(x0, z0), b = toW(x1, z1); solids.push([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]); };

    // ---- the walls: each side's openings, then its full and its stub version
    const opens = sd => [...(def.doors || []).filter(o => o.side === sd).map(o => ({ a0: o.at - o.w / 2, a1: o.at + o.w / 2, y0: 0, y1: o.h, door: o })), ...(def.windows || []).filter(o => o.side === sd).map(o => ({ a0: o.at - o.w / 2, a1: o.at + o.w / 2, y0: o.y, y1: o.y + o.h, win: o }))].sort((p, q) => p.a0 - q.a0);
    // a box on a side: u along it (from its middle), y up, depth into the wall from its outer face (0 = the face)
    function onSide(k, sd, u0, u1, y0, y1, dep0, dep1, color, o = {}) {
      const len = u1 - u0, um = (u0 + u1) / 2, th = dep1 - dep0, mid = (dep0 + dep1) / 2;
      if (len <= 0.001 || y1 - y0 <= 0.001) return;
      if (sd === 'f') k.box(len, y1 - y0, th, um, y0, d / 2 - mid, color, o);
      if (sd === 'b') k.box(len, y1 - y0, th, um, y0, -d / 2 + mid, color, o);
      if (sd === 'r') k.box(th, y1 - y0, len, w / 2 - mid, y0, um, color, o);
      if (sd === 'l') k.box(th, y1 - y0, len, -w / 2 + mid, y0, um, color, o);
    }
    const lenOf = sd => (sd === 'f' || sd === 'b' ? w : d - 2 * T0);
    function slab(k, sd, u0, u1, y0, y1) {
      onSide(k, sd, u0, u1, y0, y1, 0, T0, col.wall, { r: 0.01 });
      onSide(k, sd, u0, u1, y0, y1, T0, T0 + 0.02, col.lining, { r: 0.005 }); // (the inside face: plain lining boards)
      if (def.clad === 'iron') { for (let u = Math.ceil(u0 / 0.2) * 0.2; u < u1 - 0.05; u += 0.2) onSide(k, sd, u - 0.03, u + 0.03, y0, y1, -0.035, 0, col.lip || col.wall, { r: 0.015 }); }
      else for (let y = Math.ceil(y0 / 0.26) * 0.26; y < y1 - 0.05; y += 0.26) onSide(k, sd, u0, u1, y - 0.035, y, -0.03, 0, col.lip || col.wall, { r: 0.01 }); // (each weatherboard's lower lip)
    }
    function wall(sd, top) {
      const k = new K(), L = lenOf(sd), O = opens(sd);
      let u = -L / 2;
      for (const o of O) {
        slab(k, sd, u, o.a0, 0, top);
        if (o.y0 > 0) slab(k, sd, o.a0, o.a1, 0, Math.min(top, o.y0));
        if (o.y1 < top) slab(k, sd, o.a0, o.a1, o.y1, top);
        // the frame round the opening (cut to the stub's height on the low wall)
        const fy1 = Math.min(top, o.y1 + 0.08);
        if (o.y0 < top) { onSide(k, sd, o.a0 - 0.1, o.a0, o.y0, fy1, -0.05, T0 + 0.04, col.trim); onSide(k, sd, o.a1, o.a1 + 0.1, o.y0, fy1, -0.05, T0 + 0.04, col.trim); }
        if (o.y1 + 0.08 <= top) onSide(k, sd, o.a0 - 0.1, o.a1 + 0.1, o.y1, o.y1 + 0.1, -0.06, T0 + 0.04, col.trim);
        if (o.win && o.y0 < top) { onSide(k, sd, o.a0 - 0.14, o.a1 + 0.14, o.y0 - 0.07, o.y0, -0.12, T0 + 0.06, col.trim); }
        if (o.win && o.y1 <= top) { // the glass, its bars, and a sill
          const gk = k; if (sd === 'f' || sd === 'b') gk.glassBox(o.a1 - o.a0, o.y1 - o.y0, 0.03, (o.a0 + o.a1) / 2, o.y0, sd === 'f' ? d / 2 - T0 / 2 : -d / 2 + T0 / 2, { tint: '#d8eef8' }); else gk.glassBox(0.03, o.y1 - o.y0, o.a1 - o.a0, sd === 'r' ? w / 2 - T0 / 2 : -w / 2 + T0 / 2, o.y0, (o.a0 + o.a1) / 2, { tint: '#d8eef8' });
          onSide(k, sd, (o.a0 + o.a1) / 2 - 0.025, (o.a0 + o.a1) / 2 + 0.025, o.y0, o.y1, T0 / 2 - 0.03, T0 / 2 + 0.03, col.trim); onSide(k, sd, o.a0, o.a1, (o.y0 + o.y1) / 2 - 0.025, (o.y0 + o.y1) / 2 + 0.025, T0 / 2 - 0.03, T0 / 2 + 0.03, col.trim);
        }
        u = o.a1;
      }
      slab(k, sd, u, L / 2, 0, top);
      // corner boards (on the front and back walls, at both ends), a sole plate along the bottom
      if (sd === 'f' || sd === 'b') for (const e of [-1, 1]) onSide(k, sd, e * w / 2 - (e > 0 ? 0.14 : 0) + (e < 0 ? -0.02 : 0), e * w / 2 + (e < 0 ? 0.14 : 0) + (e > 0 ? 0.02 : 0), 0, top, -0.05, T0 + 0.02, col.trim);
      onSide(k, sd, -L / 2, L / 2, 0, 0.14, -0.05, 0, col.trim);
      // the gable over the front and back walls (full walls only)
      if (top === H && rise && (sd === 'f' || sd === 'b')) {
        const z = sd === 'f' ? d / 2 : -d / 2;
        k.at(0, H, z, sd === 'f' ? 0 : PI, kk => kk.at(0, 0, 0, 0, k3 => k3.shape([[-w / 2, 0], [w / 2, 0], [0, rise]], T0, 0, 0, 0, col.wall), -PI / 2));
        for (let y = 0.26; y < rise - 0.1; y += 0.26) { const hw = (w / 2) * (1 - y / rise); k.box(hw * 2, 0.035, 0.03, 0, H + y - 0.035, z + (sd === 'f' ? 0.015 : -0.015), col.lip || col.wall, { r: 0.01 }); }
        if (def.gable) def.gable(k, sd, z);
      }
      if (def.wallDeco) def.wallDeco(k, sd, top);
      return k.build();
    }
    const sides = {};
    for (const sd of ['f', 'b', 'l', 'r']) { const full = wall(sd, H), stub = wall(sd, STUB); stub.visible = false; group.add(full, stub); sides[sd] = { full, stub, n: SIDE[sd] }; }

    // ---- the floor (a concrete slab with a worn path down the middle)
    { const k = new K(); k.box(w - 0.04, 0.06, d - 0.04, 0, 0, 0, col.floor || '#b9b2a6', { r: 0.02 }); k.box(Math.min(3, w * 0.35), 0.005, d - 0.4, 0, 0.06, 0, col.floor2 || '#aaa294', { r: 0.002 }); group.add(k.build({ shadow: false })); }

    // ---- the roof (and its trusses): drawn with its own material so it can fade
    const fadeMat = LK.animeMat({ pat: true, side: T.DoubleSide }), fading = [];
    { const k = new K(), ov = 0.35, a = Math.atan2(rise, w / 2), len = Math.hypot(w / 2 + ov, (w / 2 + ov) * Math.tan(a)), D = d + 0.5;
      for (const e of [-1, 1]) {
        const cx = e * (w / 2 + ov) / 2, cy = H + rise - ((w / 2 + ov) * Math.tan(a)) / 2, rz = -e * a, nx = Math.sin(rz) * -1, ny = Math.cos(rz);
        k.box(len, 0.1, D, cx, cy - 0.05, 0, col.roof, { rz, r: 0.02 });
        for (let z = -D / 2 + 0.12; z < D / 2; z += 0.22) k.box(len, 0.035, 0.05, cx + nx * 0.06, cy + ny * 0.06 - 0.017, z, col.rib || col.roof, { rz, r: 0.012 });
        k.box(len, 0.16, 0.06, cx, cy - 0.08, D / 2, col.trim, { rz }); k.box(len, 0.16, 0.06, cx, cy - 0.08, -D / 2, col.trim, { rz }); // (barge boards)
        k.box(0.08, 0.1, D, e * (w / 2 + ov) - e * 0.04, H - ov * Math.tan(a) - 0.12, 0, '#8a8f98', { r: 0.03 }); // (a gutter)
      }
      k.box(0.34, 0.08, D + 0.04, 0, H + rise + 0.02, 0, col.rib || col.roof, { r: 0.03 }); // (the ridge cap)
      // the trusses under it: a tie beam, two rafters, a king post, every 1.8 m
      for (let z = -d / 2 + 0.9; z < d / 2 - 0.4; z += 1.8) {
        k.box(w - 0.3, 0.16, 0.1, 0, H - 0.2, z, '#9a7a52', { r: 0.02 }); k.box(0.1, rise, 0.1, 0, H - 0.05, z, '#9a7a52', { r: 0.02 });
        for (const e of [-1, 1]) k.box(Math.hypot(w / 2, rise) - 0.2, 0.14, 0.1, e * w / 4, H + rise / 2 - 0.25, z, '#9a7a52', { rz: -e * a, r: 0.02 });
      }
      const g = k.build({ mat: fadeMat }); group.add(g); fading.push(g);
    }

    // ---- what's inside, and the loft
    const inK = new K(), overK = new K();
    const api = {
      solid: solidL,
      part(name, x, y, z, ry2, fn) { const k = new K(); fn(k); const g = k.build(); const p = new T.Group(); p.position.set(x, y, z); p.rotation.y = ry2 || 0; p.add(g); group.add(p); parts[name] = p; return p; },
      spot(o) { const at = toW(o.at[0], o.at[1]), hit = o.hit ? toW(o.hit[0], o.hit[1]) : at; spots.push(Object.assign({}, o, { at, yaw: o.yaw != null ? yawW(o.yaw) : null, hit: [hit[0], hit[1], 0, o.hit ? o.hit[3] : 1.4], local: o.at })); },
      over: fn => fn(overK), H, w, d, rise
    };
    if (def.loft) {
      const L = def.loft, iw = w - 2 * T0;
      overK.box(iw, 0.14, L.z1 - L.z0, 0, L.y, (L.z0 + L.z1) / 2, '#b7834f', { r: 0.01 });
      for (let x = -iw / 2 + 0.3; x < iw / 2; x += 0.6) overK.box(0.02, 0.005, L.z1 - L.z0, x, L.y + 0.14, (L.z0 + L.z1) / 2, '#8a6038');
      for (let x = -iw / 2 + 0.2; x < iw / 2; x += 0.9) overK.box(0.1, 0.18, L.z1 - L.z0, x, L.y - 0.18, (L.z0 + L.z1) / 2, '#8a6038', { r: 0.02 });
      overK.box(iw, 0.08, 0.08, 0, L.y + 0.95, L.z1 - 0.06, '#8a6038'); for (let x = -iw / 2 + 0.1; x < iw / 2; x += 1.1) overK.box(0.08, 0.95, 0.08, x, L.y + 0.14, L.z1 - 0.06, '#8a6038');
      for (const x of [-iw / 2 + 0.1, iw / 2 - 0.1]) { const zz = L.z1 - 0.1; inK.box(0.16, L.y, 0.16, x, 0, zz, '#8a6038', { r: 0.02 }); solidL(x - 0.1, zz - 0.1, x + 0.1, zz + 0.1); } // (posts by the walls hold the loft's front edge)
      // the ladder up to it
      const lx = L.ladder != null ? L.ladder : 0; for (const e of [-0.24, 0.24]) inK.box(0.06, L.y + 0.9, 0.08, lx + e, 0, L.z1 + 0.35, '#c9a173', { rx: -0.2, r: 0.02 }); for (let y = 0.3; y < L.y + 0.8; y += 0.3) inK.box(0.5, 0.05, 0.06, lx, y, L.z1 + 0.35 - y * Math.tan(0.2) + 0.02, '#b08a5a', { r: 0.02 });
      solidL(lx - 0.35, L.z1 + 0.05, lx + 0.35, L.z1 + 0.65);
    }
    if (def.fit) def.fit(inK, api);
    group.add(inK.build());
    if (def.loft || overK.parts.length) { const g = overK.build({ mat: fadeMat }); group.add(g); fading.push(g); }

    // ---- a lamp for after dark (lit with the evening, like the village's lamps)
    const lamp = new T.PointLight('#ffd9a0', 0, 9, 1.6); lamp.position.set(0, H - 0.4, 0); group.add(lamp);
    { const k = new K(); for (const z of [-d / 4, d / 4]) { k.cyl(0.015, 0.6, 0, H - 0.6, z, '#3d4048', { n: 4 }); k.cone(0.26, 0.18, 0, H - 0.78, z, '#3d4048', { n: 12 }); k.ball(0.09, 0, H - 0.8, z, '#fff3c8', { n: 8, emit: 0.9 }); } group.add(k.build()); }

    // ---- the walls as solids (the doorways open)
    const iT = 0.04;
    for (const sd of ['f', 'b', 'l', 'r']) {
      const L = lenOf(sd), O = opens(sd).filter(o => o.door); let u = -L / 2;
      const rect = (u0, u1) => { if (u1 - u0 < 0.01) return; if (sd === 'f') solidL(u0, d / 2 - T0 - iT, u1, d / 2); if (sd === 'b') solidL(u0, -d / 2, u1, -d / 2 + T0 + iT); if (sd === 'r') solidL(w / 2 - T0 - iT, u0, w / 2, u1); if (sd === 'l') solidL(-w / 2, u0, -w / 2 + T0 + iT, u1); };
      for (const o of O) { rect(u, o.a0); u = o.a1; }
      rect(u, L / 2);
    }

    group.traverse(m => { if (m.isMesh && m.parent && fading.includes(m.parent)) m.userData.bg = true; });
    const inside = (x, z) => { const dx = x - def.x, dz = z - def.z, lx = dx * c - dz * s, lz = dx * s + dz * c; return Math.abs(lx) < w / 2 - 0.05 && Math.abs(lz) < d / 2 - 0.05; };
    let u = 0;
    function tick(kx, kz, camYaw, dt) {
      const inn = inside(kx, kz), was = u; u = Math.max(0, Math.min(1, u + (inn ? 1 : -1) * Math.min(dt, 0.1) * 5));
      const cx = Math.sin(camYaw), cz = Math.cos(camYaw);
      for (const sd of Object.keys(sides)) { const n = sides[sd].n, nx = n[0] * c + n[1] * s, nz = -n[0] * s + n[1] * c, near = nx * cx + nz * cz > 0.1, down = inn && near; sides[sd].full.visible = !down; sides[sd].stub.visible = down; }
      if (u !== was || tick.first !== true) {
        tick.first = true; const o = 1 - u * 0.86; fadeMat.uniforms.uOpacity.value = o; fadeMat.transparent = o < 0.99; fadeMat.depthWrite = o >= 0.99; fadeMat.needsUpdate = true;
        for (const g of fading) g.traverse(m => { if (!m.isMesh) return; m.layers.set(o < 0.99 ? 1 : 0); m.renderOrder = o < 0.99 ? 3 : 0; m.castShadow = o > 0.5; });
      }
    }
    return { group, solids, spots, parts, sides, inside, tick, toW, yawW, lamp, def, get open() { return u; } };
  }
  IH.walkin = { build };
})();
