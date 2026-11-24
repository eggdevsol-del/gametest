/* Chorecast homes (a prototype): the blocks round a home, built clean (low-poly, cel-shaded like the homes, no ink
   lines), after the Morphic pictures of real Tokyo streets and real Japanese countryside (scenery-src/*.png are the
   guides). Life-size: one unit is a floor tile, about 50 cm. Each block is TILE units square and built once, then
   copied round the home (the copies share their geometry).
   - city1: four two-storey houses on a block: hipped tiled roofs, aluminium windows, balconies with futons and
     washing, block walls and gates, a carport with a kei car, bikes, a power pole with its transformer, a red
     vending machine, a corner mirror, a green rubbish net.
   - city2: a five-storey apartment block ('mansion') with outside stairs and bike parking, a three-storey corner
     shop with a blue awning, fruit crates and a drinks fridge, a narrow house with a pitched roof, a cherry tree.
   - farm: four flooded paddies with rows of young rice, ridges, a concrete channel, a gravel lane, a farmhouse
     (dark timber, white plaster, a heavy tiled roof), a shed, a persimmon tree, a vegetable patch, an orange kei truck.
   - hill: a wooded hill of cedars with broadleaf trees round its edge, a dirt path, a stream over stones, rows of
     tea bushes and two small paddies at its foot.
   IH.blocks.make(name) gives { group, lit } (lit: the windows and lamps that glow after dark). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit, shade } = IH.kit;
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const pick = (R, a) => a[Math.floor(R() * a.length) % a.length];
  const SIZE = { city1: 48, city2: 48, farm: 110, hill: 110 };

  // square-edged pieces (cheap: these are drawn many times over); o.r rounds a little where it shows
  const bx = (k, w, h, d, x, y, z, c, o = {}) => k.box(w, h, d, x, y, z, c, Object.assign({ r: 0 }, o));
  const ASPH = '#6e6f78', LINE = '#f2f2ee', CONC = '#c4c1bb', CAP = '#b0ada6', GLASS = '#5d7895', ALU = '#c9ccd2';

  // ---------- city pieces
  // a hipped roof over w x d: four sloped faces meeting at a short ridge, eaves out past the walls, tile rows
  function hipRoof(k, w, d, y, col, R) {
    const ow = w + 1.4, od = d + 1.4, h = Math.min(ow, od) * 0.32;
    k.cone(Math.hypot(ow, od) / 2, h, 0, y, 0, col, { n: 4, ry: Math.PI / 4, s: [ow / Math.hypot(ow, od) * Math.SQRT2, 1, od / Math.hypot(ow, od) * Math.SQRT2], r: 0 });
    for (let i = 1; i < 6; i++) { const t = i / 6; bx(k, ow * (1 - t), 0.06, 0.08, 0, y + h * t + 0.02, od / 2 * (1 - t) + 0.02, shade(col, -0.12)); bx(k, ow * (1 - t), 0.06, 0.08, 0, y + h * t + 0.02, -od / 2 * (1 - t) - 0.02, shade(col, -0.12)); } // rows of tiles
    bx(k, ow, 0.25, 0.25, 0, y - 0.25, od / 2, '#e8e2d8'); bx(k, ow, 0.25, 0.25, 0, y - 0.25, -od / 2, '#e8e2d8'); bx(k, 0.25, 0.25, od, ow / 2, y - 0.25, 0, '#e8e2d8'); bx(k, 0.25, 0.25, od, -ow / 2, y - 0.25, 0, '#e8e2d8'); // fascia
    bx(k, ow, 0.18, 0.18, 0, y - 0.45, od / 2 + 0.1, '#9aa0a8'); // gutter
  }
  // a window: aluminium frame, glass, sometimes a grille (downstairs) or a rain-shutter box; lit after dark
  function win(k, lit, x, y, z, w, h, R, face = 1, grille = false) {
    bx(k, w + 0.3, h + 0.3, 0.2, x, y - 0.15, z, ALU); bx(k, w, h, 0.22, x, y, z + 0.02 * face, GLASS); bx(k, 0.12, h, 0.24, x, y, z + 0.03 * face, ALU);
    if (grille) for (let i = 1; i < 5; i++) bx(k, 0.08, h, 0.3, x - w / 2 + i * w / 5, y, z + 0.12 * face, '#8a8f98');
    else if (R() < 0.35) bx(k, w + 0.6, 0.5, 0.5, x, y + h + 0.1, z + 0.15 * face, '#b9bcc4'); // shutter box
    if (R() < 0.5) bx(lit, w - 0.1, h - 0.1, 0.05, x, y + 0.05, z + 0.14 * face, pick(R, ['#ffd89a', '#ffe7b8', '#fff2d6']), { emit: 1 });
  }
  // a two-storey house, in its own space (front +z), w x d (about 14 x 12: 7 m x 6 m)
  function house2(k, lit, w, d, R) {
    const wall = pick(R, ['#f3eee4', '#e8e2d6', '#efe6d4', '#e4e0da', '#ece4d6']), roof = pick(R, ['#55606f', '#4a5566', '#5d6470', '#4f5a68']), h1 = 6, h2 = 5.6;
    bx(k, w + 0.2, 0.8, d + 0.2, 0, 0, 0, '#b7b3ab'); // foundation
    bx(k, w, h1 + h2, d, 0, 0.8, 0, wall, { r: 0.05 });
    bx(k, w + 0.6, 0.25, d + 0.6, 0, 0.8 + h1, 0, shade(wall, -0.1)); // the hood between the floors
    hipRoof(k, w, d, 0.8 + h1 + h2, roof, R);
    // front: door with a little porch roof and light, windows each floor, the balcony upstairs
    bx(k, 2.2, 4.2, 0.25, -w * 0.3, 0.8, d / 2, '#7a5a42'); bx(k, 3.2, 0.2, 1.4, -w * 0.3, 5.4, d / 2 + 0.7, roof); bx(k, 0.25, 0.25, 0.1, -w * 0.3 + 1.5, 4.6, d / 2 + 0.1, '#fff1c8'); bx(lit, 0.25, 0.25, 0.1, -w * 0.3 + 1.5, 4.6, d / 2 + 0.15, '#fff1c8', { emit: 1 });
    win(k, lit, w * 0.18, 2.6, d / 2, 3.2, 2.4, R, 1, R() < 0.4); win(k, lit, w * 0.38, 3.2, d / 2, 1.2, 1.2, R, 1, true);
    win(k, lit, -w * 0.25, 0.8 + h1 + 0.4, d / 2, 3.6, 3.6, R); win(k, lit, w * 0.25, 0.8 + h1 + 1.6, d / 2, 2.4, 1.8, R);
    const by = 0.8 + h1; bx(k, w * 0.55, 0.3, 2.2, -w * 0.18, by - 0.1, d / 2 + 1.1, '#cfcac2'); // balcony slab
    const rail = R() < 0.5 ? '#8a6a52' : '#9aa0aa'; for (let i = 0; i <= 10; i++) bx(k, 0.12, 2.2, 0.12, -w * 0.18 - w * 0.275 + i * w * 0.055, by + 0.2, d / 2 + 2.15, rail); bx(k, w * 0.56, 0.18, 0.18, -w * 0.18, by + 2.4, d / 2 + 2.15, rail);
    if (R() < 0.7) bx(k, 2.6, 1.6, 0.2, -w * 0.18 - 1.6, by + 1.2, d / 2 + 2.3, pick(R, ['#ffffff', '#ffd7e2', '#cfe6ff', '#fff1b8']), { r: 0.1 }); // a futon over the rail
    if (R() < 0.6) { bx(k, w * 0.5, 0.08, 0.08, -w * 0.18, by + 3.3, d / 2 + 1.4, '#c9ccd2'); for (let i = 0; i < 5; i++) bx(k, 0.7, 1.1, 0.06, -w * 0.35 + i * 1.1, by + 2.2, d / 2 + 1.4, pick(R, ['#ffffff', '#7cc8e8', '#ff9fb7', '#ffd35a', '#9be38f'])); } // washing on the pole
    // sides: windows, an air-con unit and its pipe, the meter box, a drainpipe
    for (const sx of [-1, 1]) { k.at(sx * w / 2, 0, 0, sx * Math.PI / 2, kk => { win(kk, lit, -d * 0.2, 2.8, 0, 1.6, 1.6, R, 1, true); win(kk, lit, d * 0.2, 0.8 + h1 + 1.2, 0, 2.4, 2.4, R); }); }
    bx(k, 1.6, 1.1, 0.7, w * 0.36, 0.8, d / 2 + 0.35, '#e8e8ea'); k.cyl(0.33, 0.06, w * 0.36, 1.35, d / 2 + 0.72, '#b9bcc4', { rx: Math.PI / 2, n: 10 }); bx(k, 0.15, 3.4, 0.15, w * 0.36 + 0.9, 1.5, d / 2 + 0.1, '#e8e8ea');
    bx(k, 0.7, 1.0, 0.3, w / 2 - 0.5, 2.4, d / 2 + 0.15, '#d8dbe0'); bx(k, 0.22, h1 + h2 + 0.8, 0.22, w / 2 - 0.1, 0, -d / 2 - 0.1, '#9aa0a8');
  }
  // a kei car (a small boxy hatch) or a kei truck (cab and open tray)
  function kei(k, col, truck) {
    for (const [wx, wz] of [[-1.3, 1.9], [1.3, 1.9], [-1.3, -1.9], [1.3, -1.9]]) k.cyl(0.65, 0.5, wx, 0.65, wz, '#2d2a3a', { rz: Math.PI / 2, n: 12 });
    bx(k, 2.9, 1.3, 6.4, 0, 0.6, 0, col, { r: 0.2 });
    if (truck) { bx(k, 2.8, 1.6, 2.2, 0, 1.9, 2.0, col, { r: 0.25 }); bx(k, 2.6, 0.9, 0.08, 0, 2.3, 3.12, GLASS); for (const sx of [-1, 1]) bx(k, 0.1, 0.7, 3.6, sx * 1.4, 1.9, -1.2, shade(col, -0.1)); }
    else { bx(k, 2.8, 1.9, 4.6, 0, 1.9, -0.4, col, { r: 0.35 }); bx(k, 2.6, 1.1, 0.08, 0, 2.4, 1.9, GLASS); for (const sx of [-1, 1]) bx(k, 0.08, 1.0, 3.8, sx * 1.42, 2.4, -0.4, GLASS); }
    bx(k, 2.4, 0.3, 0.1, 0, 1.0, 3.22, '#f2f2f2');
  }
  function bicycle(k, x, z, ry, col) { k.at(x, 0, z, ry, kk => { for (const dz of [-1, 1]) kk.torus(0.65, 0.07, 0, 0.7, dz, '#2d2a3a', { ry: Math.PI / 2 }); bx(kk, 0.12, 0.12, 2, 0, 1.1, 0, col, { rx: 0.2 }); bx(kk, 0.12, 1.1, 0.12, 0, 0.7, -0.3, col); bx(kk, 0.4, 0.12, 0.6, 0, 1.8, -0.4, '#2d2a3a'); bx(kk, 1.1, 0.1, 0.1, 0, 2.0, 0.9, '#9aa0aa'); bx(kk, 0.7, 0.45, 0.55, 0, 1.75, 1.2, '#9aa0aa'); }); }
  function powerPole(k, lit, x, z, wood) {
    const c = wood ? '#8a6a4a' : '#c2bfb9';
    k.cyl(0.28, 20, x, 0, z, c, { rt: 0.22, n: 8 }); for (const yy of [3, 3.4]) bx(k, 0.6, 0.15, 0.6, x, yy, z, '#f2d34a'); // the yellow-and-black guard band
    bx(k, 4.2, 0.25, 0.25, x, 18.4, z, c); for (const dx of [-1.8, 0, 1.8]) k.cyl(0.1, 0.4, x + dx, 18.65, z, '#e8e8ea', { n: 6 });
    if (!wood) { k.cyl(0.7, 2, x + 0.8, 14, z, '#9da3ab', { n: 10 }); bx(k, 0.15, 0.15, 1.2, x, 11, z + 0.6, '#8a8f96'); }
    bx(k, 0.12, 0.12, 1.8, x, 12.2, z + 0.9, '#8a8f96'); bx(k, 0.7, 0.25, 0.45, x, 12, z + 1.8, '#d8dde4'); bx(lit, 0.6, 0.06, 0.35, x, 11.95, z + 1.8, '#fff3d0', { emit: 1 });
  }
  function wires(k, a, b) { for (const dx of [-1.8, 0, 1.8]) { const x0 = a[0] + dx, x1 = b[0] + dx, z0 = a[1], z1 = b[1], L = Math.hypot(x1 - x0, z1 - z0); bx(k, 0.07, 0.07, L, (x0 + x1) / 2, 18.7, (z0 + z1) / 2, '#3d3f46', { ry: Math.atan2(x1 - x0, z1 - z0) }); } }
  function vendingMachine(k, lit, x, z, ry, R) {
    const c = pick(R, ['#d94848', '#e8edf2', '#3b7fd6']); k.at(x, 0, z, ry, kk => {
      bx(kk, 2.0, 3.7, 1.5, 0, 0, 0, c, { r: 0.08 }); bx(kk, 1.7, 1.7, 0.08, 0, 1.8, 0.76, '#eaf6ff');
      for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) kk.cyl(0.09, 0.32, -0.65 + i * 0.21, 2.0 + j * 0.5, 0.8, pick(R, ['#ff7a7a', '#7ac8ff', '#ffd36a', '#8fe08f', '#ffffff', '#c39cff']), { n: 6 });
      bx(kk, 1.1, 0.35, 0.1, 0, 0.6, 0.76, '#3a3d44');
    }); lit.at(x, 0, z, ry, ll => bx(ll, 1.6, 1.6, 0.04, 0, 1.85, 0.82, '#f2fbff', { emit: 1 }));
  }
  const blockWall = (k, x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); k.at((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0), kk => { bx(kk, 0.35, 2.6, L, 0, 0, 0, CONC); bx(kk, 0.45, 0.15, L, 0, 2.6, 0, CAP); for (let t = -L / 2 + 0.8; t < L / 2; t += 0.8) bx(kk, 0.37, 2.6, 0.04, 0, 0, t, shade(CONC, -0.06)); }); };
  function pot(k, x, z, R) { k.cyl(0.4, 0.8, x, 0, z, pick(R, ['#c08a5a', '#8a8f98', '#e8e2d8']), { rt: 0.5, n: 8 }); k.ball(0.75, x, 1.3, z, pick(R, ['#5fae55', '#4f9a4a', '#6fbf5a']), { n: 8 }); }
  function lane(k, x0, z0, x1, z1, w) { // an asphalt lane between two points (axis-aligned), its edge lines and a manhole
    const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(x1 - x0, z1 - z0);
    k.at((x0 + x1) / 2, 0, (z0 + z1) / 2, ry, kk => { bx(kk, w, 0.06, L, 0, -0.05, 0, ASPH); for (const s of [-1, 1]) bx(kk, 0.25, 0.02, L, s * (w / 2 - 0.5), 0.01, 0, LINE); kk.cyl(0.9, 0.03, 0, 0.0, L * 0.2, '#5a5b63', { n: 14 }); });
  }

  // ---------- the blocks
  function city1(k, lit, R) {
    const S = SIZE.city1, h = S / 2, L = 8; // lanes along two sides (south and east), 4 m wide
    bx(k, S, 0.1, S, 0, -0.12, 0, '#bdb8b0'); lane(k, -h, h - L / 2, h, h - L / 2, L); lane(k, h - L / 2, -h, h - L / 2, h - L, L);
    const lots = [[-h + 10.5, -h + 10], [-h + 10.5 + 18.5, -h + 10], [-h + 10.5, -h + 28], [-h + 10.5 + 18.5, -h + 28]];
    lots.forEach(([x, z], i) => {
      const w = 13 + R() * 2, d = 11 + R() * 2, face = z > 0 ? 0 : Math.PI;
      k.at(x, 0, z, face, kk => lit.at(x, 0, z, face, ll => house2(kk, ll, w, d, R)));
      // its block wall round the lot, a gate gap at the front, pots by the door
      const fz = z + (z > 0 ? 1 : -1) * (d / 2 + 2.6), sx = 8.6, bz = z - (z > 0 ? 1 : -1) * (d / 2 + 1.2);
      blockWall(k, x - sx, fz, x - 2.5, fz); blockWall(k, x + 1.5, fz, x + sx, fz); blockWall(k, x - sx, bz, x - sx, fz); if (i % 2 === 0) blockWall(k, x + sx, bz, x + sx, fz);
      for (const gx of [-2.5, 1.5]) bx(k, 0.7, 3.2, 0.7, x + gx, 0, fz, '#a9a49b'); // gate posts
      pot(k, x - 3.4, fz - (z > 0 ? 1 : -1) * 1.2, R); pot(k, x - 4.6, fz - (z > 0 ? 1 : -1) * 1.2, R);
      if (i === 3) { k.at(x + 4.2, 0, fz - 3.6, 0, kk => kei(kk, '#f4f6f8', false)); for (const cz of [-3, 3]) bx(k, 0.25, 4.4, 0.25, x + 6.4, 0, fz - 3.6 + cz, '#8a8f96'); bx(k, 4.6, 0.2, 8, x + 4.2, 4.4, fz - 3.6, '#a9b2bd', { r: 0.05 }); } // the carport and its kei car
      if (i === 2) { bicycle(k, x + 5, fz + 1.2, Math.PI / 2, pick(R, ['#e8edf2', '#ff8fae', '#6fb8e8'])); bicycle(k, x + 6.4, fz + 1.2, Math.PI / 2 + 0.1, pick(R, ['#9be38f', '#ffd35a'])); }
    });
    const poles = [[-h + 6, h - L - 0.6], [h - 22, h - L - 0.6]]; poles.forEach(([x, z]) => powerPole(k, lit, x, z, false)); wires(k, poles[0], poles[1]); wires(k, [h - L - 0.6, -h + 6], [h - L - 0.6, h - 22]); powerPole(k, lit, h - L - 0.6, -h + 6, false);
    vendingMachine(k, lit, h - L - 1.6, h - L - 4, -Math.PI / 2, R);
    k.cyl(0.12, 6, h - L - 0.8, 0, h - L - 0.8, '#f2a33a', { n: 6 }); k.cyl(0.9, 0.2, h - L - 0.8, 6, h - L - 0.3, '#f2a33a', { rx: Math.PI / 2, n: 16 }); k.cyl(0.8, 0.22, h - L - 0.8, 6, h - L - 0.25, '#d8ecf8', { rx: Math.PI / 2, n: 16 }); // the corner mirror
    bx(k, 2.6, 0.9, 1.4, -h + 22, 0, h - L - 1.2, '#4f9a4a'); for (let i = 0; i < 8; i++) bx(k, 0.05, 0.92, 1.42, -h + 20.9 + i * 0.32, 0, h - L - 1.2, '#3f8a3a'); // the rubbish net
  }
  function city2(k, lit, R) {
    const S = SIZE.city2, h = S / 2, L = 8;
    bx(k, S, 0.1, S, 0, -0.12, 0, '#bdb8b0'); lane(k, -h, h - L / 2, h, h - L / 2, L); lane(k, -h + L / 2, -h, -h + L / 2, h - L, L);
    // the mansion: five floors of flats, balconies across the front, outside stairs up its side, bikes under it
    const mx = 2, mz = -6, mw = 30, md = 16, fl = 6, wall = pick(R, ['#e6dccb', '#ece3d3', '#ddd5c7']);
    bx(k, mw, fl * 5 + 0.5, md, mx, 0, mz, wall, { r: 0.05 }); bx(k, mw + 0.6, 0.6, md + 0.6, mx, fl * 5 + 0.5, mz, shade(wall, -0.12)); bx(k, 4, 3, 4, mx + 9, fl * 5 + 1.1, mz - 2, '#d8d0c2'); // roof edge, the water-tank housing
    for (let f = 0; f < 5; f++) {
      const y = f * fl + 0.5; bx(k, mw + 0.2, 0.35, 2.4, mx, y + fl - 0.4, mz + md / 2 + 1.2, '#d9d2c4'); bx(k, mw + 0.2, 1.6, 0.2, mx, y + fl - 0.05 - 0.4 + 0.35, mz + md / 2 + 2.3, shade(wall, -0.05)); // balcony slabs and their solid fronts
      for (let u = 0; u < 4; u++) { const ux = mx - mw / 2 + 3.75 + u * 7.5; win(k, lit, ux - 1, y + 0.6, mz + md / 2, 3.6, 4.2, R); bx(k, 0.2, fl - 0.4, 2.4, ux + 3.6, y, mz + md / 2 + 1.2, '#ece6da'); if (R() < 0.5) bx(k, 2.2, 1.2, 0.15, ux + 1, y + fl + 0.6, mz + md / 2 + 2.45, pick(R, ['#ffffff', '#cfe6ff', '#ffd7e2']), { r: 0.06 }); }
    }
    k.at(mx - mw / 2 - 2.6, 0, mz, 0, kk => { for (let f = 0; f < 5; f++) { const y = f * fl; bx(kk, 5, 0.3, 4.6, 0, y + fl - 0.3, 0, '#cfc8bb'); kk.box(1.6, 0.2, 6.6, 1.2, y + fl / 2 - 0.4, 0, '#b9b2a6', { r: 0, rx: -0.75 }); bx(kk, 5, 1.6, 0.15, 0, y + fl, 2.3, shade(wall, -0.06)); bx(kk, 0.15, 1.6, 4.6, -2.5, y + fl, 0, shade(wall, -0.06)); } }); // the outside stairs
    for (let i = 0; i < 6; i++) bicycle(k, mx - 10 + i * 1.6, mz + md / 2 + 4.2, 0, pick(R, ['#e8edf2', '#ff8fae', '#6fb8e8', '#9be38f', '#ffd35a'])); bx(k, 11, 0.2, 3.4, mx - 6, 4.2, mz + md / 2 + 4.2, '#a9b2bd'); // bike parking under its roof
    // the corner shop: three floors, a blue awning, fruit and veg in crates, a drinks fridge glowing, vending machines
    const sx = h - 9, sz = h - L - 8, sw = 13, sd = 12;
    bx(k, sw, 16, sd, sx, 0, sz, '#efe6d6', { r: 0.05 }); bx(k, sw + 0.4, 0.5, sd + 0.4, sx, 16, sz, '#d8ccb8'); bx(k, 2.4, 1.6, 2.4, sx - 2, 16.5, sz - 2, '#e8e8ea');
    for (let f = 1; f < 3; f++) for (const wx of [-3, 3]) win(k, lit, sx + wx, f * 5.5 + 1, sz + sd / 2, 3, 2.6, R);
    bx(k, sw - 1, 4.4, 0.2, sx, 0.2, sz + sd / 2 + 0.02, '#cfe3ee'); bx(lit, sw - 1.2, 4.2, 0.05, sx, 0.3, sz + sd / 2 + 0.15, '#fff2d6', { emit: 1 }); // the shop window, lit
    k.box(sw + 1, 0.2, 3.4, sx, 5.2, sz + sd / 2 + 1.6, '#4a7fb8', { r: 0, rx: 0.32 }); for (let i = 0; i < 7; i++) bx(k, (sw + 1) / 7 - 0.05, 0.6, 0.1, sx - (sw + 1) / 2 + (i + 0.5) * (sw + 1) / 7, 4.2, sz + sd / 2 + 3.2, i % 2 ? '#ffffff' : '#4a7fb8'); // the striped awning
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const cx2 = sx - 4.5 + i * 2.2, cz2 = sz + sd / 2 + 1.2 + j * 1.3; bx(k, 2, 0.9, 1.2, cx2, j * 0.9, cz2, '#c99a5c'); for (let f = 0; f < 6; f++) k.ball(0.26, cx2 - 0.65 + (f % 3) * 0.65, j * 0.9 + 1.0, cz2 - 0.3 + Math.floor(f / 3) * 0.6, pick(R, ['#e86f6f', '#ffb36b', '#9be38f', '#ffd35a', '#c39cff']), { n: 6 }); } // fruit and veg crates
    bx(k, 2.2, 4, 1.4, sx + 4.6, 0, sz + sd / 2 + 1.0, '#e8edf2'); bx(lit, 1.9, 3.4, 0.05, sx + 4.6, 0.3, sz + sd / 2 + 1.72, '#eaf6ff', { emit: 1 }); // the drinks fridge
    vendingMachine(k, lit, sx - sw / 2 - 1.4, sz + sd / 2 - 1.4, 0, R); vendingMachine(k, lit, -h + 13, h - L - 1.6, 0, R);
    // a narrow house with a pitched roof, beside the shop
    const nx = h - 9, nz = -h + 9; bx(k, 9, 11, 12, nx, 0, nz, '#e9e3d8', { r: 0.05 }); k.at(nx, 11, nz, 0, kk => { kk.box(10.4, 0.25, 7.2, 0, 2.4, -3.2, '#5d6470', { r: 0, rx: 0.6 }); kk.box(10.4, 0.25, 7.2, 0, 2.4, 3.2, '#5d6470', { r: 0, rx: -0.6 }); });
    win(k, lit, nx - 2, 2.4, nz + 6, 2.4, 2, R, 1, true); win(k, lit, nx + 1.5, 7.2, nz + 6, 3, 2.4, R); bx(k, 1.8, 3.8, 0.2, nx + 2.6, 0, nz + 6, '#6f5242'); pot(k, nx - 3, nz + 7.2, R);
    // a cherry tree in the corner, power poles and their wires
    k.cyl(0.45, 4.5, -h + 13, 0, h - L - 6, '#6b4a33', { rt: 0.32, n: 8 }); for (const [dx, dy, dz, r] of [[0, 6.2, 0, 2.8], [-1.8, 5.4, 0.8, 2], [1.7, 5.6, -0.6, 2.1], [0.4, 7.6, 0.6, 1.8]]) k.ball(r, -h + 13 + dx, dy, h - L - 6 + dz, pick(R, ['#ffb7cf', '#ffc6d8', '#ffa9c6']), { n: 10 });
    const poles = [[-h + 2, h - L - 0.6], [h - 20, h - L - 0.6]]; poles.forEach(([x, z]) => powerPole(k, lit, x, z, false)); wires(k, poles[0], poles[1]);
  }
  function paddyField(k, x0, z0, w, d, R) {
    bx(k, w, 0.04, d, x0 + w / 2, -0.06, z0 + d / 2, '#6f6048'); bx(k, w - 0.2, 0.06, d - 0.2, x0 + w / 2, -0.02, z0 + d / 2, '#86c4de');
    for (let n = 0; n < 3; n++) bx(k, 2 + R() * 3, 0.01, 0.2, x0 + 2 + R() * (w - 6), 0.05, z0 + 1 + R() * (d - 2), '#d6f0fa'); // sky glints
    for (let i = 1.2; i < w - 0.8; i += 1.3) for (let j = 1.0; j < d - 0.6; j += 1.0) k.cone(0.12, 0.75, x0 + i, 0, z0 + j, pick(R, ['#6fbf4f', '#7fcc5a', '#5fae45']), { n: 3, r: 0 }); // rows of young rice
    for (const [w2, d2, x2, z2] of [[w, 0.8, x0 + w / 2, z0], [w, 0.8, x0 + w / 2, z0 + d], [0.8, d, x0, z0 + d / 2], [0.8, d, x0 + w, z0 + d / 2]]) bx(k, w2, 0.5, d2, x2, -0.06, z2, '#8cbf5c', { r: 0.2 }); // grassy ridges
  }
  function farm(k, lit, R) {
    const S = SIZE.farm, h = S / 2;
    bx(k, S, 0.1, S, 0, -0.12, 0, '#8cbf5c');
    bx(k, S, 0.05, 6, 0, -0.07, 4, '#cdbb92'); // the gravel lane across the middle
    bx(k, S, 0.9, 2.4, 0, -0.9, 9, '#b7b3aa'); bx(k, S, 0.1, 1.6, 0, -0.35, 9, '#86c4de'); // the concrete channel
    paddyField(k, -h + 2, 12, 46, 38, R); paddyField(k, -h + 50, 12, 50, 38, R); paddyField(k, -h + 2, -h + 4, 50, 44, R);
    // the farmhouse yard: the house, the shed, the persimmon, the veg patch, the truck
    const fx = h - 26, fz = -h + 26;
    bx(k, 46, 0.06, 46, fx, -0.06, fz, '#d8cfb8');
    k.at(fx, 0, fz, 0, kk => {
      bx(kk, 26, 1.2, 15, 0, 0, 0, '#9a8f7e'); bx(kk, 24, 7.5, 13, 0, 1.2, 0, '#f2ece0');
      for (let i = 0; i <= 8; i++) bx(kk, 0.45, 7.5, 0.3, -12 + i * 3, 1.2, 6.55, '#4f3a2a'); bx(kk, 24.2, 0.45, 0.3, 0, 4.6, 6.55, '#4f3a2a'); bx(kk, 24.2, 0.45, 0.3, 0, 8.3, 6.55, '#4f3a2a'); // dark timber frame on white plaster
      bx(kk, 26, 0.5, 3.4, 0, 1.0, 8.2, '#8a6a4a'); for (let i = 0; i < 8; i++) bx(kk, 2.6, 4.6, 0.12, -10.5 + i * 3, 1.5, 6.75, '#e8dcc0'); // the veranda and its sliding doors
      kk.cone(19, 6.5, 0, 8.6, 0, '#5a5f6a', { n: 4, ry: Math.PI / 4, s: [1.15, 1, 0.75], r: 0 }); bx(kk, 30, 0.5, 19.5, 0, 8.4, 0, '#4f545e'); bx(kk, 8, 1.4, 1.2, 0, 14.2, 0, '#4a4f58'); // a heavy tiled hipped roof, its ridge
    });
    lit.at(fx, 0, fz, 0, ll => { for (let i = 0; i < 8; i++) if (R() < 0.6) bx(ll, 2.4, 4.4, 0.05, -10.5 + i * 3, 1.6, 6.85, '#ffe2a8', { emit: 1 }); });
    k.at(fx - 18, 0, fz - 8, 0, kk => { bx(kk, 9, 6, 7, 0, 0, 0, '#8a6a4a'); kk.box(10, 0.2, 8, 0, 6.6, 0, '#9aa0aa', { r: 0, rz: 0.15 }); for (let i = 0; i < 9; i++) bx(kk, 0.08, 6, 7.02, -4.4 + i * 1.1, 0, 0, '#7a5a3a'); }); // the shed
    k.cyl(0.6, 6, fx + 16, 0, fz - 8, '#6b4a33', { rt: 0.4, n: 8 }); for (const [dx, dy, dz, r] of [[0, 8, 0, 4], [-2.5, 7, 1.2, 3], [2.4, 7.4, -1, 3.2]]) k.ball(r, fx + 16 + dx, dy, fz - 8 + dz, '#4f9a4a', { n: 10 }); for (let i = 0; i < 14; i++) k.ball(0.32, fx + 16 + (R() - 0.5) * 7, 6 + R() * 4, fz - 8 + (R() - 0.5) * 6, '#f08a2a', { n: 6 }); // the persimmon tree
    for (let r = 0; r < 6; r++) { bx(k, 12, 0.5, 0.9, fx + 12, 0, fz + 12 + r * 1.6, '#8a6a4a', { r: 0.2 }); for (let i = 0; i < 9; i++) k.ball(0.45, fx + 6.5 + i * 1.35, 0.7, fz + 12 + r * 1.6, pick(R, ['#5fae45', '#7fcc5a', '#4f9a3c']), { n: 6 }); } // the veg patch
    k.at(fx - 14, 0, fz + 15, Math.PI / 2, kk => kei(kk, '#f2803a', true)); // the orange kei truck
    const poles = [[-h + 6, 1], [-h + 40, 1], [-h + 74, 1], [h - 2, 1]]; poles.forEach(([x, z]) => powerPole(k, lit, x, z, true)); for (let i = 1; i < poles.length; i++) wires(k, poles[i - 1], poles[i]);
    for (let i = 0; i < 5; i++) { const x = fx - 22 + i * 9, z = fz - 20; k.cyl(0.5, 5, x, 0, z, '#6b4a33', { n: 6 }); k.ball(4, x, 7, z, pick(R, ['#4f9a4a', '#5fae55', '#3f8a44']), { n: 10 }); } // trees behind the house
  }
  function cedar(k, x, z, s, R) { k.cyl(0.35 * s, 3 * s, x, 0, z, '#6b4a33', { n: 6 }); for (let i = 0; i < 4; i++) k.cone((2.2 - i * 0.42) * s, 3.6 * s, x, (2.2 + i * 2.2) * s, z, shade('#2f6b45', R() * 0.08 - i * 0.03), { n: 7, r: 0 }); }
  function hill(k, lit, R) {
    const S = SIZE.hill, h = S / 2;
    bx(k, S, 0.1, S, 0, -0.12, 0, '#8cbf5c');
    k.ball(52, -8, -30, -12, '#5d9a52', { s: [1.05, 0.7, 0.95], n: 22 }); // the hill
    const heightAt = (x, z) => { const dx = (x + 8) / 54.6, dz = (z + 12) / 49.4, q = 1 - dx * dx - dz * dz; return q > 0 ? Math.sqrt(q) * 36.4 - 30 : -1; };
    for (let i = 0; i < 70; i++) { const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 36, x = -8 + Math.cos(a) * r, z = -14 + Math.sin(a) * r * 0.9, y = heightAt(x, z); if (y < 0.2) continue; k.at(0, y - 0.6, 0, 0, kk => cedar(kk, x, z, 1.5 + R() * 0.9, R)); } // cedars up the hill
    for (let i = 0; i < 22; i++) { const a = R() * Math.PI * 2, r = 36 + R() * 10, x = -8 + Math.cos(a) * r, z = -12 + Math.sin(a) * r * 0.9, y = Math.max(0, heightAt(x, z)); if (Math.abs(x) > h - 4 || Math.abs(z) > h - 4) continue; k.cyl(0.5, 4, x, y, z, '#6b4a33', { n: 6 }); k.ball(3.6 + R() * 1.5, x, y + 6, z, pick(R, ['#6fbf5a', '#7fcc6a', '#5fae55']), { n: 10 }); } // broadleaf trees round its edge
    for (let i = 0; i < 18; i++) { const t = i / 17, x = 30 - t * 34 + Math.sin(t * 6) * 6, z = h - 6 - t * 44, y = Math.max(0, heightAt(x, z)); bx(k, 3.2, 0.12, 3.6, x, y + 0.02, z, '#c9a97a', { ry: Math.sin(t * 6) * 0.5 }); } // the dirt path
    for (let i = 0; i < 16; i++) { const t = i / 15, x = 40 - t * 18 + Math.cos(t * 5) * 4, z = h - 4 - t * 40, y = Math.max(0, heightAt(x, z)); k.waterBox(2.6, 0.14, 3.4, x, y - 0.02, z, {}); for (let s = 0; s < 3; s++) k.ball(0.5 + R() * 0.4, x + (R() - 0.5) * 3.4, y + 0.1, z + (R() - 0.5) * 3, pick(R, ['#8f8a80', '#7a8a6a', '#a09a8e']), { s: [1.2, 0.6, 1], n: 6 }); } // the stream over its stones
    for (let r = 0; r < 7; r++) for (let i = 0; i < 12; i++) k.ball(1.1, -h + 8 + i * 2.1, 0.5, h - 30 + r * 2.6, pick(R, ['#3f8a4a', '#4a9a52']), { s: [1, 0.7, 1.2], n: 7 }); // rows of tea bushes
    paddyField(k, -h + 4, h - 12, 22, 9, R); paddyField(k, -h + 28, h - 12, 18, 9, R);
  }
  const MAKERS = { city1, city2, farm, hill };
  const CACHE = new Map();
  function make(name) {
    if (!CACHE.has(name)) { const k = new Kit(), lit = new Kit(), R = rng(name.length * 977 + name.charCodeAt(0)); MAKERS[name](k, lit, R); const g = k.build({ shadow: false }), l = lit.build({ shadow: false }); l.traverse(o => { if (o.userData && o.userData.glowMat) o.userData.glowMat.uniforms.uGlow.value = 1.4; }); CACHE.set(name, { g, l }); }
    const c = CACHE.get(name), group = c.g.clone(), lit = c.l.clone();
    for (const o of [group, lit]) o.traverse(m => { if (m.isMesh) { m.userData.bg = true; m.receiveShadow = true; } });
    return { group, lit };
  }
  IH.blocks = { make, SIZE };
})();
