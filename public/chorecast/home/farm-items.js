/* Farm fittings and equipment, in detail (farm.js itemModel asks here first; the tractor keeps its own model).
   Every model is built in its own footprint (ITEMS[t].fp, width along x, depth along z), standing on y = 0,
   the front facing +z (the side the kid walks up to). Cel-shaded like the rest: flat colours, a light trim,
   a darker shade for the parts in shadow. */
(() => {
  const IH = window.IsoHome = window.IsoHome || {};
  const PI = Math.PI;
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const B = (k, w, h, d, x, y, z, c, o = {}) => k.box(w, h, d, x, y, z, c, Object.assign({ r: 0.02 }, o));
  // a vertical gable triangle, its base on y at the given z, width w along x, rise h, thickness t (toward -z)
  const gable = (k, w, h, t, x, y, z, c, ry = 0) => k.at(x, y, z, ry, kk => kk.at(0, 0, 0, 0, k3 => k3.shape([[-w / 2, 0], [w / 2, 0], [0, h]], t, 0, 0, 0, c), -PI / 2));
  // a pitched roof along x: two panels meeting at a ridge (y at the ridge), each `half` deep, pitch a
  function roof(k, len, half, a, y, c, ridge, lines) {
    for (const s of [-1, 1]) k.at(0, y, 0, 0, kk => {
      kk.box(len, 0.1, half, 0, -0.05, s * half / 2, c, { r: 0.02 });
      if (lines) for (let j = 1; j <= lines; j++) kk.box(len + 0.02, 0.03, 0.05, 0, 0.05, s * (j * half / (lines + 1)), ridge);
    }, s * a);
    k.cyl(0.07, len + 0.06, 0, y - 0.03 - (len + 0.06) / 2, 0, ridge, { n: 8, rz: PI / 2 });
  }
  const STEEL = '#a9b3bf', STEEL_D = '#7f8a97', STEEL_L = '#cdd5de', WOOD = '#b7834f', WOOD_D = '#8a6038', WOOD_L = '#d4a873', DARK = '#2a2630', HAY = '#e8c45a', HAY_D = '#cfa944', WHITE = '#f6f1e6';
  const M = {};

  // galvanised trough on skids: rolled rim, pressed ribs, the float-valve box and its pipe
  M.trough = k => {
    for (const x of [-1.15, 1.15]) B(k, 0.14, 0.12, 1.05, x, 0, 0, STEEL_D);
    k.box(2.9, 0.62, 0.92, 0, 0.1, 0, STEEL, { r: 0.1 });
    for (const z of [-0.47, 0.47]) { k.box(3.0, 0.07, 0.09, 0, 0.7, z, STEEL_L, { r: 0.035 }); for (let i = 0; i < 6; i++) B(k, 0.05, 0.46, 0.03, -1.2 + i * 0.48, 0.18, z, STEEL_D); }
    for (const x of [-1.47, 1.47]) k.box(0.09, 0.07, 1.0, x, 0.7, 0, STEEL_L, { r: 0.035 });
    k.waterBox(2.55, 0.1, 0.8, -0.15, 0.58, 0, { tint: '#6fc0d8' });
    B(k, 0.42, 0.16, 0.86, 1.22, 0.7, 0, STEEL_D); B(k, 0.36, 0.04, 0.8, 1.22, 0.86, 0, STEEL_L);
    k.cyl(0.05, 0.75, 1.62, 0, -0.32, '#5d6670', { n: 8 }); k.cyl(0.05, 0.26, 1.62, 0.72 - 0.13, -0.32 + 0.13, '#5d6670', { n: 8, rx: PI / 2 }); k.ball(0.07, 1.62, 0.75, -0.32, '#5d6670', { n: 8 });
  };

  // a hay rack feeder under its little roof: posts, a slatted rack over a wooden tray, hay poking through
  M.feeder = k => {
    for (const [a, b] of [[-0.86, -0.86], [0.86, -0.86], [-0.86, 0.86], [0.86, 0.86]]) B(k, 0.14, 2.05, 0.14, a, 0, b, '#6b4a33');
    B(k, 1.84, 0.38, 1.84, 0, 0.22, 0, WOOD); B(k, 1.6, 0.06, 1.6, 0, 0.56, 0, HAY_D);
    for (let i = 0; i < 4; i++) B(k, 1.86, 0.03, 1.86, 0, 0.26 + i * 0.09, 0, WOOD_D, { s: [1, 1, 1] });
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const u = -0.66 + i * 0.22; B(k, 0.045, 0.95, 0.045, u, 0.6, s * 0.78, '#8a6038', { rx: s * 0.18 }); B(k, 0.045, 0.95, 0.045, s * 0.78, 0.6, u, '#8a6038', { rz: -s * 0.18 }); }
    for (const s of [-1, 1]) { B(k, 1.9, 0.07, 0.07, 0, 1.52, s * 0.9, WOOD_D); B(k, 0.07, 0.07, 1.9, s * 0.9, 1.52, 0, WOOD_D); }
    k.ball(0.78, 0, 1.15, 0, HAY, { s: [1, 0.55, 1], n: 12 }); const R = rng(7);
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; k.cone(0.07, 0.4, Math.sin(a) * 0.74, 0.9 + R() * 0.4, Math.cos(a) * 0.74, i % 2 ? HAY : HAY_D, { n: 4, rx: Math.cos(a) * 1.2, rz: -Math.sin(a) * 1.2 }); }
    roof(k, 2.2, 1.2, 0.55, 2.55, '#8a6a52', '#6b4f3c', 3); for (const s of [-1, 1]) gable(k, 1.75, 0.5, 0.06, s * 0.95, 2.04, 0, '#9c6b45', PI / 2 * s);
  };

  // a hen house on legs: weatherboards, white corner trims, a shingled gable roof, a pop-hole and its ramp,
  // a window, the nest box on the side with its lid, a perch peg
  M.coop = k => {
    for (const a of [-1.35, 1.35]) for (const b of [-0.85, 0.85]) B(k, 0.13, 0.58, 0.13, a, 0, b, WOOD_D);
    B(k, 3.0, 0.1, 1.95, 0, 0.5, 0, WOOD_D);
    B(k, 2.9, 1.5, 1.85, 0, 0.58, 0, '#f2e1b8');
    for (let i = 0; i < 6; i++) { B(k, 2.94, 0.035, 1.89, 0, 0.62 + i * 0.25, 0, '#e2cba0'); }
    for (const a of [-1.45, 1.45]) for (const b of [-0.92, 0.92]) B(k, 0.1, 1.52, 0.1, a, 0.57, b, WHITE);
    for (const s of [-1, 1]) gable(k, 1.85, 0.72, 0.06, s * 1.44, 2.08, 0, '#f2e1b8', PI / 2 * s);
    roof(k, 3.5, 1.3, 0.56, 2.82, '#5a7aa8', '#46638c', 4);
    B(k, 0.62, 0.72, 0.06, -0.65, 0.66, 0.94, '#3d2a24'); for (const [w, h, x, y] of [[0.74, 0.07, -0.65, 1.38], [0.07, 0.78, -1.0, 0.62], [0.07, 0.78, -0.3, 0.62]]) B(k, w, h, 0.07, x, y, 0.96, WHITE);
    k.at(-0.65, 0.3, 1.5, 0, kk => { B(kk, 0.5, 0.05, 1.3, 0, -0.03, 0, WOOD_L); for (let i = 0; i < 5; i++) B(kk, 0.5, 0.04, 0.05, 0, 0.02, -0.5 + i * 0.25, WOOD_D); }, 0.5);
    k.glassBox(0.55, 0.42, 0.04, 0.6, 1.22, 0.94, { tint: '#d8eef8' }); for (const [w, h, x, y] of [[0.65, 0.06, 0.6, 1.18], [0.65, 0.06, 0.6, 1.64], [0.06, 0.5, 0.29, 1.18], [0.06, 0.5, 0.91, 1.18], [0.04, 0.42, 0.6, 1.22], [0.55, 0.04, 0.6, 1.41]]) B(k, w, h, 0.07, x, y, 0.97, WHITE);
    B(k, 0.55, 0.7, 1.3, 1.72, 0.78, -0.1, '#f2e1b8'); for (let i = 0; i < 3; i++) k.ball(0.07, 1.68 + (i % 2) * 0.1, 1.17, -0.5 + i * 0.32, '#fff3e0', { s: [0.85, 1.15, 0.85], n: 8 }); k.box(0.5, 0.05, 1.24, 1.72, 1.08, -0.1, '#e8c45a', { r: 0.02 }); k.cyl(0.04, 0.06, 2.0, 1.14 - 0.03, -0.1, '#3d4048', { n: 6, rz: PI / 2 });
    for (let i = 0; i < 3; i++) B(k, 0.57, 0.03, 1.32, 1.72, 0.84 + i * 0.22, -0.1, '#e2cba0');
    k.cyl(0.03, 0.3, -1.55, 1.0 - 0.15, 0.6, WOOD_D, { n: 6, rz: PI / 2 });
  };

  // the duck pond (its water is drawn by farm.js): a stony rim, reeds and bulrushes, lily pads with a flower,
  // tufts of grass, a flat stepping stone
  M.pond = k => {
    k.cyl(1, 0.14, 0, 0, 0, '#8f8a99', { s: [2.1, 1, 1.6], n: 28 });
    const R = rng(31), N = 26;
    for (let i = 0; i < N; i++) { const a = i / N * PI * 2 + R() * 0.1, r = 0.16 + R() * 0.12, sh = ['#9a96a3', '#8a8694', '#b0acb8', '#7f7b88'][i % 4]; k.ball(r, Math.cos(a) * 2.0, r * 0.35, Math.sin(a) * 1.5, sh, { s: [1.2, 0.6, 1], n: 8 }); }
    for (let i = 0; i < 10; i++) { const a = R() * PI * 2; k.cone(0.12, 0.3 + R() * 0.2, Math.cos(a) * 2.15, 0, Math.sin(a) * 1.65, i % 2 ? '#6fbf52' : '#58a240', { n: 4 }); }
    for (const [x, z, r] of [[-0.9, 0.35, 0.3], [-0.25, -0.4, 0.26], [0.45, 0.45, 0.32], [0.95, -0.2, 0.22]]) { k.cyl(r, 0.03, x, 0.13, z, '#5fae4a', { n: 10 }); k.box(r * 0.9, 0.035, 0.05, x + r * 0.4, 0.13, z, '#4a9638', { ry: 0.6, r: 0 }); }
    for (const [x, z] of [[-0.25, -0.4], [0.45, 0.45]]) { for (let i = 0; i < 5; i++) k.cone(0.06, 0.14, x + Math.cos(i * 1.26) * 0.05, 0.16, z + Math.sin(i * 1.26) * 0.05, i % 2 ? '#ffd1e0' : '#ffffff', { n: 4, rx: Math.sin(i * 1.26) * 0.6, rz: -Math.cos(i * 1.26) * 0.6 }); k.ball(0.04, x, 0.22, z, '#ffd35a', { n: 6 }); }
    for (const [cx, cz] of [[1.5, -0.95], [-1.65, -0.7]]) for (let i = 0; i < 7; i++) { const x = cx + (R() - 0.5) * 0.5, z = cz + (R() - 0.5) * 0.35, h = 0.9 + R() * 0.6, lean = (R() - 0.5) * 0.2; k.cyl(0.025, h, x, 0, z, i % 2 ? '#6f9a42' : '#7fae4c', { n: 4, rz: lean }); if (i % 2) k.cyl(0.055, 0.22, x - Math.sin(lean) * h, h - 0.3, z, '#7a4f2e', { n: 6, rz: lean }); else k.cone(0.06, 0.6, x + 0.05, 0, z + 0.05, '#86b85a', { n: 3, rx: 0.15 }); }
    k.cyl(0.32, 0.08, 1.75, 0.02, 0.85, '#b0acb8', { n: 9, s: [1.2, 1, 0.9] });
  };

  // a pig ark: a corrugated steel arch, plank ends, the dark doorway with straw spilling out, a muddy wallow
  M.sty = k => {
    // a pig ark (phase G): a half-round of corrugated iron on timber skids (galvanised panels with their ridges,
    // a bolted seam over the top), a boarded back, a boarded front round an arched pop-hole, a draught board over
    // the hole, straw in the doorway and a muddy wallow beside it
    const Rr = 1.2, L = 2.3, N = 18;
    for (let i = 0; i < N; i++) { const a = (i + 0.5) / N * PI, w = PI * Rr / N + 0.02; k.at(Math.cos(a) * Rr, Math.sin(a) * Rr, 0, 0, kk => { kk.box(0.05, w, L, 0, -w / 2, 0, i % 2 ? '#a9b0ba' : '#b8bec7', { r: 0 }); kk.box(0.07, 0.03, L + 0.02, 0.0, w / 2 - 0.02, 0, '#939aa5', { r: 0 }); }, 0, a); }
    for (const z of [-L / 2 + 0.05, 0, L / 2 - 0.05]) k.torus(Rr + 0.03, 0.025, 0, 0, z, '#7f8a97', { arc: PI });
    for (let i = 0; i < 5; i++) k.ball(0.025, 0, Rr + 0.05, -L / 2 + 0.2 + i * 0.47, '#5d6670', { n: 5 });
    for (const e of [-1, 1]) { B(k, 0.18, 0.14, L + 0.5, e * (Rr - 0.06), 0, 0, WOOD_D, { r: 0.02 }); k.box(0.12, 0.12, 0.08, e * (Rr - 0.06), 0.04, L / 2 + 0.28, WOOD_D, { r: 0.02, rx: 0.5 }); }
    const ends = (z, door) => { for (let i = -5; i <= 5; i++) { const x = i * 0.22, top = Rr * Math.sqrt(Math.max(0, 1 - (Math.abs(x) + 0.11) ** 2 / (Rr * Rr))) - 0.02; if (door && Math.abs(x) < 0.45) { const lintel = 0.95; B(k, 0.2, Math.max(0, top - lintel), 0.06, x, lintel, z, i % 2 ? WOOD : WOOD_L, { r: 0.01 }); continue; } B(k, 0.2, top, 0.06, x, 0, z, i % 2 ? WOOD : WOOD_L, { r: 0.01 }); } B(k, 2.2, 0.08, 0.07, 0, 0.55, z + Math.sign(z) * 0.03, WOOD_D, { r: 0.01 }); };
    ends(-L / 2 + 0.03, false); ends(L / 2 - 0.03, true);
    k.shape([[-0.45, 0], [0.45, 0], [0.45, 0.7], [0.3, 0.88], [0, 0.95], [-0.3, 0.88], [-0.45, 0.7]].map(([a, b]) => [a, -b]), 0.02, 0, 0, L / 2 - 0.02, '#1f1a18', { rx: PI / 2 });
    B(k, 1.0, 0.24, 0.06, 0, 0.9, L / 2 + 0.05, WOOD_D, { r: 0.01 }); // (the draught board)
    const R = rng(13); for (let i = 0; i < 14; i++) k.box(0.3, 0.02, 0.05, (R() - 0.5) * 1.1, 0.01, L / 2 - 0.2 + R() * 0.6, i % 2 ? HAY : HAY_D, { ry: R() * 3, r: 0 });
    k.cyl(0.65, 0.02, 0.95, 0, 1.15, '#6b5038', { n: 16, s: [1, 1, 0.55] }); k.cyl(0.38, 0.025, 1.0, 0, 1.15, '#7a5c42', { n: 12, s: [1, 1, 0.6] }); k.waterBox(0.3, 0.02, 0.18, 1.05, 0.02, 1.12, { tint: '#8a7a5a' });
  };

  // a field shelter: a timber frame, a boarded back and half sides, a sloping corrugated roof with a gutter,
  // straw on the floor, a hay net
  M.shelter = k => {
    for (const [a, b, h] of [[-1.9, -1.35, 2.2], [0, -1.35, 2.2], [1.9, -1.35, 2.2], [-1.9, 1.35, 2.6], [1.9, 1.35, 2.6]]) B(k, 0.16, h, 0.16, a, 0, b, '#6b4a33');
    for (let i = 0; i < 20; i++) B(k, 0.18, 2.15, 0.08, -1.81 + i * 0.19, 0, -1.4, i % 2 ? '#9c6b45' : '#a8774f');
    for (const s of [-1, 1]) { for (let i = 0; i < 7; i++) B(k, 0.08, 1.4 + i * 0.05, 0.38, s * 1.95, 0, -1.2 + i * 0.38, i % 2 ? '#9c6b45' : '#a8774f'); B(k, 0.12, 0.1, 2.8, s * 1.95, 1.65, 0, '#6b4a33', { rx: -0.14 }); }
    B(k, 4.0, 0.14, 0.14, 0, 2.18, -1.35, '#6b4a33'); B(k, 4.0, 0.14, 0.14, 0, 2.58, 1.35, '#6b4a33');
    k.at(0, 2.42, 0, 0, kk => { kk.box(4.35, 0.08, 3.3, 0, 0, 0, '#a8673f', { r: 0.02 }); for (let i = 0; i < 15; i++) kk.cyl(0.045, 3.3, -2.1 + i * 0.3, 0.06 - 1.65, 0, '#94592f', { n: 6, rx: PI / 2 }); }, -0.14);
    k.cyl(0.08, 4.3, 0, 1.98 - 2.15, -1.62, '#7f8a97', { n: 8, rz: PI / 2 }); k.cyl(0.05, 2.0, 2.1, 0, -1.62, '#7f8a97', { n: 6 });
    const R = rng(21); for (let i = 0; i < 12; i++) k.ball(0.25 + R() * 0.15, (R() - 0.5) * 3.2, 0.02, (R() - 0.5) * 2.2, i % 2 ? HAY : HAY_D, { s: [1.5, 0.22, 1.2], n: 7 });
    k.ball(0.38, 1.1, 1.3, -1.1, HAY, { n: 10, s: [1, 1.2, 0.8] }); for (let i = 0; i < 4; i++) k.torus(0.36, 0.015, 1.1, 1.3, -1.1, '#3d6a3a', { ry: i * PI / 4 }); k.cyl(0.015, 0.75, 1.1, 1.65, -1.25, '#3d6a3a', { n: 4, rx: 0.3 });
  };

  // a milking stand: a raised deck with its ramp, the head bail and the feed bowl, a stool, the bucket and a churn
  M.milkstand = k => {
    for (const a of [-1.1, 1.1]) for (const b of [-0.55, 0.55]) B(k, 0.12, 0.5, 0.12, a, 0, b, WOOD_D);
    B(k, 2.5, 0.1, 1.3, 0, 0.5, 0, WOOD); for (let i = 0; i < 5; i++) B(k, 0.025, 0.105, 1.3, -1.0 + i * 0.5, 0.5, 0, WOOD_D);
    k.at(-1.6, 0.27, 0, 0, kk => { B(kk, 0.8, 0.06, 1.0, 0, -0.03, 0, WOOD_L); for (let i = 0; i < 4; i++) B(kk, 0.04, 0.04, 1.0, -0.3 + i * 0.2, 0.02, 0, WOOD_D); }, 0, -0.55);
    for (const s of [-1, 1]) B(k, 0.12, 1.25, 0.12, 1.15, 0.6, s * 0.5, WOOD_D);
    B(k, 0.14, 0.12, 1.2, 1.15, 1.8, 0, WOOD_D); B(k, 0.14, 0.1, 1.2, 1.15, 1.05, 0, WOOD_D);
    for (const z of [-0.12, 0.12]) B(k, 0.08, 0.75, 0.06, 1.15, 1.05, z, '#6b4a33');
    B(k, 0.42, 0.42, 0.65, 1.42, 0.6, 0, WOOD_D); k.lathe([[0.01, 0], [0.18, 0.02], [0.22, 0.16], [0.2, 0.16]], 1.42, 1.02, 0, '#c9ccd2', { n: 14 }); k.ball(0.15, 1.42, 1.1, 0, '#d8b45a', { s: [1, 0.3, 1], n: 8 });
    k.cyl(0.2, 0.05, -0.1, 0, 1.05, WOOD_L, { n: 12 }); for (let i = 0; i < 3; i++) k.cyl(0.03, 0.42, -0.1 + Math.cos(i * 2.1) * 0.13, 0, 1.05 + Math.sin(i * 2.1) * 0.13, WOOD_D, { n: 5 }); k.cyl(0.2, 0.06, -0.1, 0.42, 1.05, WOOD_L, { n: 12 });
    k.lathe([[0.01, 0], [0.17, 0], [0.21, 0.34], [0.2, 0.34]], 0.45, 0, 1.1, '#c9ccd2', { n: 14 }); k.torus(0.2, 0.012, 0.45, 0.48, 1.1, '#8a8f98', { rx: 0 }); k.ball(0.19, 0.45, 0.3, 1.1, '#fffaf0', { s: [1, 0.1, 1], n: 10 });
    k.lathe([[0.01, 0], [0.27, 0], [0.28, 0.08], [0.27, 0.62], [0.17, 0.76], [0.13, 0.8], [0.13, 0.92], [0.16, 0.94], [0.16, 0.98], [0.01, 1.0]], -0.95, 0, 0.95, '#c9ccd2', { n: 16 }); for (const s of [-1, 1]) k.box(0.05, 0.16, 0.05, -0.95 + s * 0.2, 0.72, 0.95, '#8a8f98', { rz: s * 0.6 });
  };

  // the shearing board: a boarded floor and back wall, an overhead gantry with the shearing machine and its
  // drop tube, the handpiece hooked up, a fleece on the board, a wool sack in its frame, a broom
  M.shearstand = k => {
    B(k, 3.0, 0.22, 2.4, 0, 0, 0, '#b7834f'); for (let i = 0; i < 11; i++) B(k, 0.02, 0.225, 2.4, -1.4 + i * 0.28, 0, 0, '#9c6b45');
    for (let i = 0; i < 12; i++) B(k, 0.24, 1.55, 0.1, -1.37 + i * 0.25, 0.22, -1.15, i % 2 ? '#9c6b45' : '#a8774f'); B(k, 3.05, 0.1, 0.14, 0, 1.75, -1.15, '#6b4a33');
    for (const x of [-1.2, 1.2]) B(k, 0.12, 2.2, 0.12, x, 0.22, -1.0, '#6b4a33'); B(k, 2.6, 0.12, 0.12, 0, 2.38, -1.0, '#6b4a33');
    B(k, 0.12, 0.1, 0.9, 0.6, 2.32, -0.6, '#6b4a33'); B(k, 0.5, 0.32, 0.36, 0.6, 2.0, -0.2, '#3d4048', { r: 0.06 }); k.cyl(0.12, 0.06, 0.6, 2.32, -0.2, '#d8433a', { n: 10 });
    k.cyl(0.035, 0.9, 0.6, 1.12, -0.2, '#3d4048', { n: 6 }); k.ball(0.06, 0.6, 1.12, -0.2, '#3d4048', { n: 6 }); k.cyl(0.03, 0.6, 0.6, 0.55, -0.2, '#8a8f98', { n: 6, rx: 0.25 }); B(k, 0.12, 0.08, 0.3, 0.6, 0.48, -0.0, '#c9ccd2', { r: 0.03 }); B(k, 0.14, 0.03, 0.08, 0.6, 0.47, 0.17, '#8a8f98');
    const R = rng(9); for (let i = 0; i < 9; i++) k.ball(0.22 + R() * 0.1, -0.7 + (i % 3) * 0.32 + R() * 0.08, 0.28, 0.25 + Math.floor(i / 3) * 0.3, i % 2 ? '#f4ecdc' : '#ebe0cb', { n: 8, s: [1, 0.55, 1] });
    for (const [x, z] of [[-1.45, 0.75], [-0.75, 0.75], [-1.45, 1.15], [-0.75, 1.15]]) B(k, 0.06, 1.1, 0.06, x, 0.22, z, '#6b4a33'); k.box(0.66, 0.85, 0.4, -1.1, 0.4, 0.95, '#e4dccb', { r: 0.12 }); k.ball(0.32, -1.1, 1.25, 0.95, '#f4ecdc', { n: 9, s: [1, 0.6, 0.65] });
    k.cyl(0.025, 1.4, 1.35, 0.22, 0.95, WOOD_L, { n: 5, rx: -0.25 }); k.box(0.36, 0.2, 0.1, 1.35, 0.22, 0.6, '#c9a03a', { rx: -0.25, r: 0.02 });
  };

  // a beehive: a stand, the bottom board and its landing, two brood boxes and a honey super (hand-holds),
  // the lid with its metal top, the entrance, a few bees about
  M.beehive = k => {
    for (const a of [-0.55, 0.55]) for (const b of [-0.55, 0.55]) B(k, 0.1, 0.32, 0.1, a, 0, b, WOOD_D);
    B(k, 1.3, 0.08, 1.3, 0, 0.32, 0, WOOD_D); B(k, 1.2, 0.03, 0.32, 0, 0.36, 0.78, WOOD_D, { rx: 0.25 });
    for (const [j, h, c] of [[0, 0.46, '#f2c14a'], [1, 0.46, '#ffd35a'], [2, 0.3, '#f2c14a']]) { const y = 0.4 + (j ? (j === 1 ? 0.47 : 0.94) : 0); B(k, 1.2, h, 1.2, 0, y, 0, c, { r: 0.03 }); for (const s of [-1, 1]) { B(k, 0.3, 0.06, 0.04, 0, y + h * 0.62, s * 0.6, '#c99a2a'); B(k, 0.04, 0.06, 0.3, s * 0.6, y + h * 0.62, 0, '#c99a2a'); } B(k, 1.22, 0.015, 1.22, 0, y + h - 0.01, 0, '#d9a838'); }
    B(k, 1.36, 0.16, 1.36, 0, 1.25, 0, WOOD_L); B(k, 1.4, 0.04, 1.4, 0, 1.41, 0, STEEL_L);
    B(k, 0.5, 0.05, 0.04, 0, 0.41, 0.61, '#2a1f1a');
    const R = rng(3); for (let i = 0; i < 6; i++) { const x = (R() - 0.5) * 1.2, y = 0.6 + R() * 1.1, z = 0.8 + R() * 0.5; k.ball(0.045, x, y, z, '#2a2420', { n: 6, s: [1, 0.8, 1.4] }); k.ball(0.04, x, y, z + 0.03, '#ffd35a', { n: 6 }); k.ball(0.035, x + 0.04, y + 0.04, z, '#eaf6ff', { n: 5, s: [1, 0.3, 1] }); }
  };

  // a corrugated round water tank on its pad: ribs, a conical lid with its hatch, the inlet pipe and a tap
  M.tank = k => {
    k.cyl(1.2, 0.12, 0, 0, 0, '#b6aea0', { n: 20 });
    k.cyl(1.08, 2.1, 0, 0.12, 0, STEEL, { n: 22 }); for (let i = 0; i < 13; i++) k.torus(1.085, 0.03, 0, 0.25 + i * 0.15, 0, i % 2 ? STEEL_D : '#95a0ad', { rx: PI / 2 });
    k.torus(1.09, 0.05, 0, 2.22, 0, STEEL_L, { rx: PI / 2 }); k.cone(1.12, 0.38, 0, 2.22, 0, STEEL_L, { n: 22 }); B(k, 0.36, 0.08, 0.36, 0.35, 2.36, 0.2, STEEL_D, { rz: -0.3 });
    k.cyl(0.06, 0.8, -0.6, 2.25, -0.7, '#5d6670', { n: 6 }); k.cyl(0.06, 0.5, -0.6, 3.0 - 0.25, -0.95, '#5d6670', { n: 6, rx: PI / 2 });
    k.cyl(0.05, 0.25, 0, 0.32 - 0.125, 1.2, '#3d4048', { n: 6, rx: PI / 2 }); k.box(0.12, 0.12, 0.08, 0, 0.3, 1.33, '#3d4048', { r: 0.03 }); k.cyl(0.025, 0.12, 0, 0.18, 1.33, '#3d4048', { n: 5 }); k.cyl(0.05, 0.03, 0, 0.44, 1.33, '#d8433a', { n: 8 });
    B(k, 0.12, 0.01, 0.6, 0.0, 0.0, 1.55, '#7fb8d8');
  };

  // three round bales of hay: net wrap bands, the rolled spiral on their ends, a few loose wisps
  function bale(k, x, z, ry, y = 0) {
    k.at(x, y, z, ry, kk => {
      kk.cyl(0.6, 1.1, 0, 0.6 - 0.55, 0, HAY, { n: 16, rz: PI / 2 });
      for (const u of [-0.35, 0, 0.35]) kk.cyl(0.605, 0.05, u, 0.6 - 0.025, 0, '#f2e6c0', { n: 16, rz: PI / 2 });
      for (const s of [-1, 1]) { kk.cyl(0.54, 0.02, s * 0.555, 0.6 - 0.01, 0, HAY_D, { n: 16, rz: PI / 2 }); for (const r of [0.15, 0.3, 0.44]) kk.torus(r, 0.018, s * 0.57, 0.6, 0, '#c9a03a', { ry: PI / 2 }); }
    });
  }
  M.hay = k => { bale(k, -0.7, 0, 0.3); bale(k, 0.8, 0.2, 1.2); bale(k, 0.05, 0.1, 0.75, 1.0); const R = rng(5); for (let i = 0; i < 6; i++) k.box(0.3, 0.02, 0.04, (R() - 0.5) * 2.4, 0.01, 0.7 + R() * 0.25, HAY_D, { ry: R() * 3, r: 0 }); };

  // a wheelbarrow: a tapered tray with its rolled lip, the frame and handles with grips, the legs, the wheel
  // (tyre, hub, axle) at the front
  M.barrow = k => {
    k.lathe([[0.01, 0], [0.3, 0], [0.42, 0.36], [0.45, 0.37], [0.45, 0.39]], 0, 0.36, 0, '#3f86b0', { n: 4, ry: PI / 4, s: [1.15, 1, 0.85] }); k.ball(0.32, 0, 0.62, 0, '#7a5c42', { s: [1.2, 0.3, 0.9], n: 10 });
    for (const s of [-0.28, 0.28]) { k.box(0.05, 0.05, 1.3, s, 0.42, -0.15, '#6b4a33', { rx: -0.08, r: 0.02 }); k.cyl(0.04, 0.16, s, 0.52, -0.82, DARK, { n: 6, rx: PI / 2 - 0.08 }); B(k, 0.04, 0.38, 0.04, s, 0, -0.32, '#5d6670', { rx: 0.1 }); }
    k.cyl(0.2, 0.09, 0, 0.2 - 0.045, 0.55, DARK, { n: 14, rz: PI / 2 }); k.cyl(0.09, 0.1, 0, 0.2 - 0.05, 0.55, '#c9ccd2', { n: 10, rz: PI / 2 }); k.cyl(0.02, 0.6, 0, 0.2 - 0.3, 0.55, '#5d6670', { n: 5, rz: PI / 2 });
    for (const s of [-0.22, 0.22]) k.box(0.03, 0.03, 0.5, s, 0.32, 0.38, '#5d6670', { rx: 0.35, r: 0 });
  };

  // two milk churns: shouldered steel cans with their necks, lids, handles, a ring band and a dent of shine
  M.churns = k => {
    for (const [a, b, h] of [[-0.4, 0, 1], [0.42, 0.1, 0.92]]) {
      k.lathe([[0.01, 0], [0.3, 0], [0.31, 0.05], [0.3, 0.6 * h], [0.27, 0.68 * h], [0.17, 0.82 * h], [0.15, 0.95 * h], [0.18, 0.97 * h], [0.18, 1.0 * h], [0.01, 1.0 * h]], a, 0, b, '#c9ccd2', { n: 18 });
      k.torus(0.305, 0.02, a, 0.2, b, '#a9adb5', { rx: PI / 2 }); k.torus(0.3, 0.02, a, 0.55 * h, b, '#a9adb5', { rx: PI / 2 });
      k.lathe([[0.01, 0], [0.19, 0], [0.19, 0.06], [0.14, 0.1], [0.04, 0.12], [0.01, 0.13]], a, h * 1.0, b, '#b0b4bc', { n: 14 });
      for (const s of [-1, 1]) k.torus(0.08, 0.018, a + s * 0.2, 0.78 * h, b, '#8a8f98', { ry: PI / 2, rz: s * 0.5 });
      k.box(0.04, 0.3 * h, 0.02, a + 0.12, 0.25, b + 0.29, '#eef1f5', { r: 0.01 });
    }
  };

  // a quad bike, front +z: the frame, moulded body with front and back racks, the seat, the bars with grips and
  // mirrors, headlights, fat knobbly tyres under their mudguards, the exhaust
  M.quad = k => {
    const G = '#3a8a4a', GD = '#2c6e3a';
    B(k, 0.5, 0.18, 1.7, 0, 0.42, 0, '#3d4048');
    k.box(1.0, 0.36, 0.7, 0, 0.62, 0.62, G, { r: 0.12 }); k.box(1.0, 0.32, 0.72, 0, 0.6, -0.6, G, { r: 0.12 }); k.box(0.62, 0.4, 0.62, 0, 0.55, 0.02, GD, { r: 0.1 });
    for (const z of [0.62, -0.6]) { for (const x of [-0.42, 0.42]) B(k, 0.04, 0.18, 0.04, x, 0.95, z, '#3d4048'); B(k, 0.9, 0.04, 0.04, 0, 1.12, z - 0.3, '#3d4048'); B(k, 0.9, 0.04, 0.04, 0, 1.12, z + 0.3, '#3d4048'); B(k, 0.04, 0.04, 0.64, -0.43, 1.12, z, '#3d4048'); B(k, 0.04, 0.04, 0.64, 0.43, 1.12, z, '#3d4048'); for (let i = 0; i < 3; i++) B(k, 0.86, 0.03, 0.03, 0, 1.12, z - 0.2 + i * 0.2, '#3d4048'); }
    k.box(0.44, 0.16, 0.8, 0, 0.95, -0.1, DARK, { r: 0.07 }); B(k, 0.46, 0.02, 0.82, 0, 1.05, -0.1, '#3d3a44');
    k.cyl(0.04, 0.55, 0, 0.75, 0.45, '#3d4048', { n: 6, rx: -0.35 }); k.box(0.2, 0.12, 0.16, 0, 1.25, 0.35, DARK, { r: 0.04 });
    k.cyl(0.03, 0.9, 0, 1.33 - 0.45, 0.32, '#3d4048', { n: 6, rz: PI / 2 }); for (const s of [-1, 1]) { k.cyl(0.045, 0.16, s * 0.42, 1.33 - 0.08, 0.32, DARK, { n: 6, rz: PI / 2 }); k.cyl(0.012, 0.22, s * 0.3, 1.34, 0.3, '#3d4048', { n: 4 }); k.box(0.12, 0.08, 0.02, s * 0.3, 1.58, 0.3, '#c9ccd2', { r: 0.02 }); }
    for (const s of [-1, 1]) { k.ball(0.07, s * 0.28, 0.72, 0.98, '#fff3c0', { n: 8, s: [1, 0.8, 0.5] }); }
    for (const s of [-1, 1]) for (const b of [-0.68, 0.68]) {
      k.cyl(0.32, 0.3, s * 0.6, 0.32 - 0.15, b, DARK, { n: 16, rz: PI / 2 }); k.cyl(0.15, 0.32, s * 0.6, 0.32 - 0.16, b, '#c9ccd2', { n: 10, rz: PI / 2 });
      for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; k.box(0.32, 0.06, 0.08, s * 0.6, 0.32 + Math.sin(a) * 0.31 - 0.03, b + Math.cos(a) * 0.31, '#1f1c24', { rx: PI / 2 - a, r: 0.01 }); }
      k.box(0.38, 0.06, 0.6, s * 0.62, 0.7, b, G, { r: 0.03, rx: b > 0 ? -0.12 : 0.12 });
    }
    k.cyl(0.05, 0.5, 0.22, 0.48 - 0.25, -0.85, '#8a8f98', { n: 8, rx: PI / 2 }); k.cyl(0.055, 0.04, 0.22, 0.48 - 0.02, -1.1, DARK, { n: 8, rx: PI / 2 });
  };

  // the nest box's lid, on its hinge along the hen house's wall (farm.js hangs it there and the egg series lifts it)
  M.coopLid = k => { k.box(0.68, 0.07, 1.42, 0.32, -0.15, 0, '#5a7aa8', { rz: -0.35, r: 0.02 }); for (let i = 0; i < 4; i++) k.box(0.69, 0.02, 0.04, 0.32, -0.08, -0.6 + i * 0.4, '#46638c', { rz: -0.35 }); k.box(0.06, 0.05, 0.3, 0.64, -0.29, 0, '#3d4048', { r: 0.02 }); };
  IH.farmItems = M;
})();
