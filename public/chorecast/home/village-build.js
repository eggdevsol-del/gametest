/* Chorecast homes (a prototype): the village, Hoshi Street. A floating island like the homes, built the same way
   (Kit models, cel-shaded, ink lines), at the homes' scale (one unit is a floor tile, about 50 cm).
   A modern Tokyo shopping neighbourhood:
   - Hoshi Street, a shōtengai: four shops in a row (Home & Furniture, the Grocer, the Café, the Pet Shop) and a
     corner block of flats, with lanterns strung over the street, banners on the lamp posts and a gateway at each end
   - the market square: a fountain, stall pitches round it (two with stall-keepers, the rest free), a clock post
   - the corner by the gate from home: vending machines, a bike rack, a notice board, a signpost home
   - a back lane with power poles and their wires, a parked kei car, planters
   - the pocket park: lawn, a pond with a little bridge, cherry trees, benches, lamps
   IH.villageBuild.build() gives { root, lit, bounds, solids, pond, bridges, spots, buildings, arrive }:
     solids: rectangles [x0, z0, x1, z1] nobody walks into; pond: an ellipse (water) with bridges over it
     spots: things to tap and places villagers go ({ kind, id, name, at: [x, z], yaw, hit })
     buildings: { full, stub, box } (village.js swaps a building for its stub when it would hide the character) */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit, shade, painted } = IH.kit;
  const W = 84, D = 64; // the island
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const bx = (k, w, h, d, x, y, z, c, o = {}) => k.box(w, h, d, x, y, z, c, Object.assign({ r: 0 }, o));
  const GLASS = '#5d7895', ALU = '#c9ccd2', PAVE = '#ddd6ca', PAVE2 = '#cfc7b9', ASPH = '#6e6f78';

  // ---------- signs: painted boards (text and a picture), lit after dark like a real lightbox
  function signTex(key, text, sub, bg, fg, w = 1024, h = 256, icon = '') {
    return painted('vsign:' + key, w, h, (c, W2, H2) => {
      c.fillStyle = bg; c.fillRect(0, 0, W2, H2);
      c.strokeStyle = shade(bg, -0.25); c.lineWidth = H2 * 0.06; c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W2 - c.lineWidth, H2 - c.lineWidth);
      c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      const big = H2 * (sub ? 0.46 : 0.58); c.font = `900 ${big}px "Nunito", "Arial Rounded MT Bold", system-ui, sans-serif`;
      const tx = icon ? W2 / 2 + H2 * 0.32 : W2 / 2;
      c.fillText(text, tx, sub ? H2 * 0.4 : H2 * 0.53, W2 * 0.8);
      if (sub) { c.font = `800 ${H2 * 0.2}px "Nunito", system-ui, sans-serif`; c.globalAlpha = 0.85; c.fillText(sub, tx, H2 * 0.78, W2 * 0.8); c.globalAlpha = 1; }
      if (icon) { c.font = `${H2 * 0.6}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; const tw = Math.min(W2 * 0.8, c.measureText ? c.measureText(text).width : 0); c.fillText(icon, W2 / 2 - Math.max(tw, W2 * 0.3) / 2 - H2 * 0.1, H2 * 0.54); }
    });
  }
  function sign(k, key, text, sub, bg, fg, sw, sh, x, y, z, ry = 0, icon = '') {
    const tex = signTex(key, text, sub, bg, fg, 1024, Math.round(1024 * sh / sw), icon);
    k.painted(new T.PlaneGeometry(sw, sh), tex, x, y, z, { ry });
  }
  // a hanging vertical sign (kanban) standing out from a wall
  function kanban(k, key, text, bg, fg, x, y, z) {
    const tex = painted('vkan:' + key, 160, 512, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${w * 0.62}px "Nunito", system-ui, sans-serif`; [...text].forEach((ch, i, a) => c.fillText(ch, w / 2, h * (i + 0.5) / a.length)); });
    bx(k, 0.3, 4.2, 1.5, x, y, z + 0.9, shade(bg, -0.2));
    k.painted(new T.PlaneGeometry(1.4, 4), tex, x + 0.16, y + 2.1, z + 0.9, { ry: Math.PI / 2 });
    k.painted(new T.PlaneGeometry(1.4, 4), tex, x - 0.16, y + 2.1, z + 0.9, { ry: -Math.PI / 2 });
    bx(k, 0.15, 0.15, 1.2, x, y + 4.2, z + 0.6, '#5a5e66');
  }

  // ---------- bits used all over
  function tree(k, x, z, R, cherry = true, s = 1.5) {
    const c1 = cherry ? '#ffb7cf' : '#5fbf5a', c2 = cherry ? '#ff9cbd' : '#4fae4f', c3 = cherry ? '#ffd2e1' : '#74cd66';
    k.cyl(0.3 * s, 1.8 * s, x, 0, z, '#7b4f30', { rt: 0.2 * s, n: 8 });
    k.cyl(0.12 * s, 1.0 * s, x - 0.35 * s, 1.3 * s, z, '#7b4f30', { rz: 0.7, n: 6 }); k.cyl(0.12 * s, 1.0 * s, x + 0.35 * s, 1.35 * s, z + 0.1, '#7b4f30', { rz: -0.7, n: 6 });
    k.ball(1.1 * s, x, 2.7 * s, z, c1, { n: 12 }); k.ball(0.85 * s, x - 0.85 * s, 2.3 * s, z + 0.3 * s, c2, { n: 10 }); k.ball(0.85 * s, x + 0.8 * s, 2.4 * s, z - 0.1 * s, c3, { n: 10 }); k.ball(0.75 * s, x + 0.1 * s, 3.35 * s, z + 0.25 * s, c3, { n: 10 });
    if (cherry) for (let i = 0; i < 10; i++) { const a = R() * 6.28, r = (0.8 + R() * 1.6) * s; k.ball(0.07, x + Math.cos(a) * r, 0.03, z + Math.sin(a) * r, '#ffc4d8', { s: [1, 0.3, 1], n: 5 }); }
  }
  function lamp(k, lit, x, z, banner) {
    k.cyl(0.12, 7.5, x, 0, z, '#4a4e57', { n: 8 }); k.cyl(0.22, 0.4, x, 0, z, '#3d4048', { n: 8 });
    bx(k, 0.9, 0.18, 0.18, x, 7.4, z, '#4a4e57'); k.cyl(0.32, 0.5, x + 0.4, 7.0, z, '#3d4048', { rt: 0.12, n: 10 });
    k.cyl(0.22, 0.12, x + 0.4, 6.9, z, '#fff3cf', { n: 10, emit: 0.4 }); lit.ball(0.5, x + 0.4, 6.7, z, '#ffe2a0', { n: 8, emit: 1, s: [1, 0.4, 1] });
    if (banner) { bx(k, 0.08, 0.08, 1.3, x, 6.2, z + 0.65, '#4a4e57'); bx(k, 0.06, 2.6, 1.2, x, 3.6, z + 0.7, banner, { r: 0.02 }); bx(k, 0.07, 0.5, 1.2, x, 3.6, z + 0.7, shade(banner, -0.2)); }
  }
  function bench(k, x, z, ry) {
    k.at(x, 0, z, ry, kk => {
      for (const s of [-1.1, 1.1]) { bx(kk, 0.16, 0.9, 1.0, s, 0, 0, '#4a4e57'); bx(kk, 0.16, 1.0, 0.16, s, 0.9, -0.45, '#4a4e57'); }
      for (let i = 0; i < 3; i++) bx(kk, 2.8, 0.1, 0.28, 0, 0.9, -0.33 + i * 0.32, '#b7834f', { r: 0.03 });
      for (let i = 0; i < 2; i++) bx(kk, 2.8, 0.26, 0.08, 0, 1.25 + i * 0.36, -0.5, '#b7834f', { r: 0.03 });
    });
  }
  function vending(k, lit, x, z, ry, col) {
    k.at(x, 0, z, ry, kk => {
      bx(kk, 2.0, 3.8, 1.5, 0, 0, 0, col, { r: 0.06 });
      bx(kk, 1.7, 1.9, 0.08, 0, 1.6, 0.75, '#e9f2f8'); // the window of drinks
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) kk.cyl(0.09, 0.42, -0.7 + c * 0.28, 1.72 + r * 0.6, 0.8, ['#e85a5a', '#3a7bd5', '#f2c14e', '#5fbf8a', '#ffffff', '#f39a4b'][(c + r * 2) % 6], { n: 6 });
      for (let c = 0; c < 6; c++) bx(kk, 0.16, 0.08, 0.08, -0.7 + c * 0.28, 1.45, 0.8, '#ff5a5a');
      bx(kk, 1.5, 0.5, 0.1, 0, 0.35, 0.75, '#2f3238'); bx(kk, 0.3, 0.5, 0.1, 0.65, 1.0, 0.76, '#c9ccd2');
      bx(lit, 1.6, 1.8, 0.04, 0, 1.65, 0.82, '#f4fbff', { emit: 0.8 });
    });
  }
  function bike(k, x, z, ry, col) {
    k.at(x, 0, z, ry, kk => {
      for (const s of [-0.75, 0.75]) kk.torus(0.48, 0.06, 0, 0.5, s, '#2f3238', { ry: Math.PI / 2 });
      kk.cyl(0.05, 1.5, 0, 0.5, 0, col, { rx: Math.PI / 2, n: 6 }); kk.cyl(0.05, 0.9, 0, 0.5, -0.3, col, { rx: 0.5, n: 6 }); kk.cyl(0.05, 0.9, 0, 0.6, 0.55, col, { rx: -0.3, n: 6 });
      bx(kk, 0.25, 0.08, 0.45, 0, 1.25, -0.35, '#2f3238', { r: 0.03 }); bx(kk, 0.9, 0.06, 0.06, 0, 1.35, 0.7, '#9aa0aa'); bx(kk, 0.6, 0.35, 0.45, 0, 1.05, 0.95, '#9aa0aa'); // seat, bars, front basket
    });
  }
  function car(k, x, z, ry) { // a little white kei car
    k.at(x, 0, z, ry, kk => {
      bx(kk, 2.9, 1.2, 6.4, 0, 0.45, 0, '#f4f4f2', { r: 0.25 }); bx(kk, 2.7, 1.6, 4.3, 0, 1.55, -0.5, '#f4f4f2', { r: 0.3 });
      bx(kk, 2.75, 1.0, 3.6, 0, 1.85, -0.5, '#4f6a86', { r: 0.1 }); bx(kk, 2.4, 0.9, 0.1, 0, 1.9, 1.7, '#4f6a86');
      for (const sx of [-1.35, 1.35]) for (const sz of [-2.1, 2.1]) kk.cyl(0.55, 0.4, sx, 0.55, sz, '#2f3238', { rz: Math.PI / 2, n: 12 });
      bx(kk, 0.5, 0.3, 0.1, -0.9, 0.9, 3.21, '#fff6d8'); bx(kk, 0.5, 0.3, 0.1, 0.9, 0.9, 3.21, '#fff6d8'); bx(kk, 1.0, 0.35, 0.08, 0, 0.6, 3.22, '#ffd35a'); // lamps, the yellow plate
    });
  }
  function lantern(k, lit, x, y, z, col = '#e85a5a') { k.cyl(0.2, 0.08, x, y + 0.55, z, '#2f2a33', { n: 8 }); k.ball(0.38, x, y + 0.3, z, col, { s: [1, 1.25, 1], n: 10 }); k.cyl(0.2, 0.08, x, y - 0.12, z, '#2f2a33', { n: 8 }); lit.ball(0.4, x, y + 0.3, z, col === '#ffffff' ? '#fff3d6' : '#ff9a6a', { s: [1, 1.25, 1], n: 8, emit: 1 }); }

  // ---------- the shops: two storeys (3 m each) facing the street (+z), the shop on the ground floor with a window
  // you can see into (lit inside), a sign over it, flats upstairs
  function shopBody(k, lit, x0, x1, c, R) {
    const w = x1 - x0, cx = (x0 + x1) / 2, zf = 14, H1 = 6.2, H2 = 5.8;
    bx(k, w, H1, 5, cx, 0, 4.5, c.wall); // the back of the ground floor
    bx(k, w, H2, 12, cx, H1, 8, c.wall); // upstairs, the full depth
    bx(k, w + 0.3, 0.9, 12.3, cx, H1 + H2, 8, shade(c.wall, -0.12)); // the parapet
    bx(k, 0.6, H1, 7, x0 + 0.3, 0, 10.5, shade(c.wall, -0.05)); bx(k, 0.6, H1, 7, x1 - 0.3, 0, 10.5, shade(c.wall, -0.05)); // the ends of the shopfront
    bx(k, w - 1.2, 0.2, 7, cx, 0.02, 10.5, c.floor || '#e9dcc4'); bx(k, w - 1.2, H1 - 0.2, 0.2, cx, 0, 7.1, c.inside || '#fbf1de'); // the shop floor and its back wall
    bx(k, w - 1.2, 0.3, 7, cx, H1 - 0.3, 10.5, '#f3ede2'); // the ceiling
    lit.box(w - 1.6, 0.06, 0.6, cx, H1 - 0.4, 11, '#fff2d0', { emit: 1, r: 0 }); // the shop lights
    // upstairs: windows, a balcony rail, air-con units
    for (let x = x0 + 2.4; x < x1 - 1.6; x += 4.2) {
      bx(k, 3.0, 2.7, 0.2, x + 0.6, H1 + 1.3, zf, ALU); bx(k, 2.7, 2.4, 0.22, x + 0.6, H1 + 1.45, zf + 0.02, GLASS); bx(k, 0.1, 2.4, 0.24, x + 0.6, H1 + 1.45, zf + 0.03, ALU);
      if (R() < 0.55) bx(lit, 2.5, 2.2, 0.05, x + 0.6, H1 + 1.55, zf + 0.15, ['#ffd89a', '#ffe7b8', '#fff2d6'][(R() * 3) | 0], { emit: 1 });
      if (R() < 0.5) { bx(k, 1.4, 1.0, 0.6, x + 0.6, H1 + 0.15, zf + 0.35, '#e8e8ea'); }
    }
    bx(k, w, 0.25, 0.6, cx, H1, zf + 0.3, shade(c.wall, -0.15)); // the hood over the shopfront
  }
  function shopWindow(k, x0, x1, H = 4.6) { const w = x1 - x0, cx = (x0 + x1) / 2; bx(k, w, 0.2, 0.3, cx, 0.6, 13.9, ALU); bx(k, w, 0.2, 0.3, cx, 0.6 + H, 13.9, ALU); for (const x of [x0, x1]) bx(k, 0.2, H + 0.2, 0.3, x, 0.6, 13.9, ALU); k.glassBox(w - 0.2, H, 0.08, cx, 0.7, 13.9, { tint: '#dceaf2' }); bx(k, w, 0.6, 0.4, cx, 0, 13.9, '#8f949c'); }
  function shopDoor(k, x, col) { bx(k, 2.6, 4.8, 0.3, x, 0, 13.9, col); k.glassBox(2.0, 4.2, 0.08, x, 0.3, 13.95, { tint: '#dceaf2' }); bx(k, 0.1, 1.0, 0.12, x + 0.75, 2.0, 14.08, '#c9ccd2'); bx(k, 2.0, 0.4, 0.06, x, 3.7, 14.06, '#ffffff'); }

  function furniture(k, lit, R) { // Home & Furniture, x 3..23
    const x0 = 3, x1 = 23, c = { wall: '#ece4d6', inside: '#fbf3e6', floor: '#d8b98e' };
    shopBody(k, lit, x0, x1, c, R);
    shopWindow(k, x0 + 0.6, 11.4); shopWindow(k, 14.6, x1 - 0.6); shopDoor(k, 13, '#6b5444');
    // in the windows: a sofa with cushions, a floor lamp, a side table and a plant; shelves with vases; a bed
    bx(k, 5.2, 1.0, 2.0, 6.6, 0.2, 11.6, '#7cc8e8', { r: 0.25 }); bx(k, 5.2, 1.4, 0.6, 6.6, 1.0, 10.9, '#6bb6d6', { r: 0.25 }); for (const s of [-1, 1]) bx(k, 0.6, 1.4, 2.0, 6.6 + s * 2.6, 0.2, 11.6, '#6bb6d6', { r: 0.25 });
    k.ball(0.4, 5.2, 1.6, 11.4, '#ffd35a', { s: [1, 1, 0.5], n: 8 }); k.ball(0.4, 8.0, 1.6, 11.4, '#ff9fb7', { s: [1, 1, 0.5], n: 8 });
    k.cyl(0.05, 3.6, 10.3, 0.2, 11.2, '#3d4048', { n: 6 }); k.cyl(0.45, 0.7, 10.3, 3.7, 11.2, '#fff1d8', { rt: 0.3, n: 10, emit: 0.6 });
    k.cyl(0.6, 0.12, 2.6 + 1.6, 1.0, 12.8, '#c79a68', { n: 12 }); k.cyl(0.08, 0.8, 4.2, 0.2, 12.8, '#c79a68', { n: 6 });
    k.cyl(0.35, 0.6, 1.0 + 15, 0.2, 12.6, '#e8e2d8', { n: 10 }); for (let i = 0; i < 5; i++) k.ball(0.45, 16 + Math.cos(i) * 0.3, 1.3 + i * 0.25, 12.6 + Math.sin(i) * 0.3, '#5fbf5a', { n: 8 });
    bx(k, 4.4, 1.0, 3.0, 19.6, 0.2, 11.4, '#f4f0ea', { r: 0.2 }); bx(k, 4.4, 1.8, 0.3, 19.6, 0.2, 9.9, '#b7834f', { r: 0.1 }); bx(k, 4.0, 0.3, 1.0, 19.6, 1.2, 10.6, '#ffffff', { r: 0.12 }); bx(k, 4.2, 0.2, 1.6, 19.6, 1.2, 12.0, '#ffb36b', { r: 0.08 });
    for (let i = 0; i < 3; i++) { bx(k, 3.6, 0.15, 0.9, 13, 1.6 + i * 1.3, 7.7, '#c79a68'); for (let j = 0; j < 3; j++) k.cyl(0.18, 0.5, 11.9 + j * 1.1, 1.75 + i * 1.3, 7.7, ['#7cc8e8', '#ffd35a', '#ff9fb7'][(i + j) % 3], { n: 8 }); }
    sign(k, 'furn', 'HOME & FURNITURE', 'Things for every room', '#3f6fb5', '#ffffff', 13, 1.6, 13, H(6.2) + 0.95, 14.62, 0, '🛋️');
    kanban(k, 'furn', 'HOME', '#ffffff', '#3f6fb5', x1 - 1.0, 6.8, 14);
  }
  const H = y => y; // (readability: heights in units)
  function grocer(k, lit, R) { // the Grocer, x 25..39: an open front, its fruit and veg out on tiered stands
    const x0 = 25, x1 = 39, c = { wall: '#f3eee4', inside: '#f6f1e6', floor: '#cfc8bd' };
    shopBody(k, lit, x0, x1, c, R);
    // the striped awning
    for (let i = 0; i < 14; i++) bx(k, 1.0, 0.12, 3.0, x0 + 0.5 + i, 4.7, 15.3, i % 2 ? '#ffffff' : '#4fae6a', { rx: 0.35 });
    for (let i = 0; i < 14; i++) bx(k, 1.0, 0.5, 0.1, x0 + 0.5 + i, 4.0, 16.7, i % 2 ? '#ffffff' : '#4fae6a');
    // tiered crates of fruit and veg, out front and inside
    const FRUIT = ['#e85a5a', '#f39a4b', '#ffd35a', '#7fcf5a', '#b04a7a', '#5fae4a', '#ff8fa8'];
    for (const [cx, cz, n] of [[28, 14.8, 3], [36, 14.8, 3], [32, 9.5, 2]]) for (let t = 0; t < n; t++) {
      bx(k, 4.0, 0.9 + t * 0.9, 1.0, cx, 0, cz + 1.4 - t * 1.0, '#a5784b'); // the stand's step
      for (let i = 0; i < 4; i++) { const col = FRUIT[(i + t * 3 + Math.floor(cx)) % FRUIT.length]; bx(k, 0.9, 0.35, 0.85, cx - 1.5 + i, 0.9 + t * 0.9, cz + 1.4 - t * 1.0, '#8a6038'); for (let j = 0; j < 4; j++) k.ball(0.17, cx - 1.7 + i + (j % 2) * 0.35, 1.35 + t * 0.9, cz + 1.25 - t * 1.0 + Math.floor(j / 2) * 0.3, col, { n: 7 }); bx(k, 0.5, 0.3, 0.04, cx - 1.5 + i, 1.0 + t * 0.9, cz + 1.88 - t * 1.0, '#ffffff'); }
    }
    for (let i = 0; i < 3; i++) bx(k, 12, 0.15, 1.0, 32, 1.4 + i * 1.3, 7.7, '#c9ccd2'); for (let i = 0; i < 24; i++) bx(k, 0.4, 0.6, 0.4, 26.5 + (i % 8) * 1.4, 1.55 + Math.floor(i / 8) * 1.3, 7.8, FRUIT[i % FRUIT.length]);
    sign(k, 'groc', 'GROCER', 'Fresh every day', '#2f8a4f', '#ffffff', 10, 1.6, 32, 6.2 + 0.95, 14.62, 0, '🍎');
    kanban(k, 'groc', 'FRESH', '#ffd35a', '#2f6a3f', x0 + 0.9, 6.8, 14);
  }
  function cafe(k, lit, R) { // the Café, x 41..55: dark timber front, a terrace with tables and a parasol
    const x0 = 41, x1 = 55, c = { wall: '#e8dccb', inside: '#f5e3c8', floor: '#9a6a45' };
    shopBody(k, lit, x0, x1, c, R);
    bx(k, x1 - x0, 6.2, 0.4, (x0 + x1) / 2, 0, 13.6, '#6b4a33'); // the timber frame (the window and door cut into it below)
    shopWindow(k, 42, 47.5, 4.2); shopDoor(k, 49.2, '#4a3426'); shopWindow(k, 51, 54.3, 4.2);
    bx(k, 4.4, 1.8, 1.6, 45, 0.2, 9.4, '#7a5a42', { r: 0.1 }); bx(k, 4.6, 0.15, 1.8, 45, 2.0, 9.4, '#e8dccb'); bx(k, 0.8, 1.0, 0.7, 44, 2.15, 9.4, '#c9ccd2', { r: 0.1 }); // the counter, the coffee machine
    for (const x of [43, 46, 52]) { k.cyl(0.04, 1.6, x, 4.4, 11, '#2f2a33', { n: 4 }); k.cyl(0.45, 0.5, x, 3.95, 11, '#2f2a33', { rt: 0.08, n: 10 }); lit.ball(0.25, x, 3.9, 11, '#ffd89a', { n: 8, emit: 1 }); }
    bx(k, 14, 0.35, 2.4, 48, 5.6, 15.2, '#6b4a33', { rx: 0.25 }); // the awning, timber
    // the terrace: two little round tables, chairs, a parasol; a menu board
    for (const [tx, tz] of [[43.5, 18.2], [52.5, 18.2]]) {
      k.cyl(0.9, 0.1, tx, 1.5, tz, '#ffffff', { n: 14 }); k.cyl(0.08, 1.5, tx, 0, tz, '#2f2a33', { n: 6 }); k.cyl(0.5, 0.06, tx, 0, tz, '#2f2a33', { n: 10 });
      for (const s of [-1, 1]) { const cx = tx + s * 1.45; bx(k, 0.9, 0.12, 0.9, cx, 0.95, tz, '#2f8a7a', { r: 0.05 }); for (const a of [-0.35, 0.35]) for (const b of [-0.35, 0.35]) bx(k, 0.08, 0.95, 0.08, cx + a, 0, tz + b, '#2f2a33'); bx(k, 0.12, 1.0, 0.9, cx + s * 0.42, 1.05, tz, '#2f8a7a', { r: 0.05 }); }
      k.cup && 0; k.cyl(0.14, 0.2, tx + 0.2, 1.6, tz, '#ffffff', { n: 8 });
    }
    k.cyl(0.07, 4.0, 48, 0, 18.2, '#e8e2d8', { n: 6 }); k.cone(2.3, 0.9, 48, 3.7, 18.2, '#ff9fae', { n: 8 }); k.cone(2.32, 0.16, 48, 3.66, 18.2, '#ffffff', { n: 8 });
    k.at(55.6, 0, 16.4, -0.5, kk => { bx(kk, 1.3, 2.4, 0.1, 0, 0, 0.3, '#2f2a33', { rx: 0.2 }); bx(kk, 1.3, 2.4, 0.1, 0, 0, -0.3, '#2f2a33', { rx: -0.2 }); });
    sign(k, 'cafe', 'CAFÉ', 'Treats & drinks', '#4a3426', '#ffe7b8', 8, 1.6, 48, 6.2 + 0.95, 14.62, 0, '☕');
    kanban(k, 'cafe', 'CAFÉ', '#ffe7b8', '#4a3426', x1 - 0.9, 6.8, 14);
  }
  function petshop(k, lit, R) { // the Pet Shop, x 57..73: pale blue, a round window, a cat tower and a fish tank inside
    const x0 = 57, x1 = 73, c = { wall: '#d8ecf4', inside: '#fff8ea', floor: '#e9dcc4' };
    shopBody(k, lit, x0, x1, c, R);
    shopWindow(k, 57.6, 63.8); shopDoor(k, 65.4, '#3f86b0'); shopWindow(k, 67.2, 72.4);
    // a cat tower, beds, bowls, a fish tank, toys on a shelf
    k.cyl(0.25, 4.2, 60, 0.2, 11.5, '#d9c3a0', { n: 8 }); for (const [y, s] of [[1.5, 1.6], [2.9, 1.3], [4.1, 1.1]]) bx(k, s, 0.2, s, 60 + (y > 2 ? 0.4 : -0.3), y, 11.5, '#c79aa0', { r: 0.08 }); k.ball(0.45, 60.4, 4.6, 11.5, '#f6b06a', { n: 8 });
    k.cyl(0.8, 0.4, 62.3, 0.2, 12.4, '#7cc8e8', { n: 12 }); k.cyl(0.6, 0.2, 62.3, 0.45, 12.4, '#ffffff', { n: 12 });
    bx(k, 3.4, 1.6, 1.2, 69.8, 0.2, 10.4, '#3d4048'); k.waterBox(3.2, 1.8, 1.0, 69.8, 1.8, 10.4); k.ball(0.15, 69.2, 2.6, 10.4, '#f39a4b', { s: [1.4, 1, 0.6], n: 6 }); k.ball(0.15, 70.4, 2.3, 10.4, '#ffd35a', { s: [1.4, 1, 0.6], n: 6 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.ball(0.25, 68.4 + j * 0.9, 4.0 + i * 0.01, 9.0 + i * 0.01, ['#ff9fb7', '#ffd35a', '#7cc8e8', '#9be38f'][j], { n: 8 });
    bx(k, 4.0, 0.15, 0.9, 70, 3.7, 9.0, '#c79a68');
    sign(k, 'pets', 'PET SHOP', 'Beds, bowls & friends', '#3f86b0', '#ffffff', 11, 1.6, 65, 6.2 + 0.95, 14.62, 0, '🐾');
    kanban(k, 'pets', 'PETS', '#ffffff', '#3f86b0', x0 + 0.9, 6.8, 14);
  }
  function flats(k, lit, R) { // the corner block of flats, x 75..83: three storeys, an outside stair, letterboxes
    const x0 = 75, x1 = 83, cx = (x0 + x1) / 2;
    bx(k, x1 - x0, 17, 12, cx, 0, 8, '#efe6d4'); bx(k, x1 - x0 + 0.3, 0.8, 12.3, cx, 17, 8, '#d9cfbe');
    for (let f = 0; f < 3; f++) {
      const y = f * 5.6; bx(k, x1 - x0, 0.3, 1.8, cx, y + 5.3, 14.9, '#cfc8bd'); for (let x = x0 + 0.3; x < x1; x += 0.6) bx(k, 0.08, 1.9, 0.08, x, y + 5.6, 15.7, '#9aa0aa'); bx(k, x1 - x0, 0.15, 0.15, cx, y + 7.5, 15.7, '#9aa0aa');
      bx(k, 1.8, 3.8, 0.2, x0 + 2, y + 0.6 + (f ? 5.6 - 5.6 : 0), 14.05, '#7a8a9a'); // doors
      bx(k, 3.0, 2.4, 0.2, x1 - 2.6, y + 2.2, 14.05, ALU); bx(k, 2.7, 2.1, 0.22, x1 - 2.6, y + 2.35, 14.07, GLASS); if (R() < 0.6) bx(lit, 2.5, 1.9, 0.05, x1 - 2.6, y + 2.45, 14.2, '#ffe7b8', { emit: 1 });
    }
    for (let i = 0; i < 6; i++) bx(k, 0.4, 0.3, 0.3, x0 + 4.2 + (i % 3) * 0.45, 1.6 + Math.floor(i / 3) * 0.35, 14.2, '#c9ccd2'); // letterboxes
  }

  // ---------- the edges and corners: no bare paving anywhere, grass round the outside
  // - by the gate home: a lawn either side of the path in, a playground (a slide, swings, a sandpit), trees, flowers
  // - south of the lane: a grass verge with a clipped hedge along the island's edge, small trees and a bus stop
  // - between the square and the lane: a verge with street trees and hedges, gaps to walk through
  // - the west side: a planted bed with trees and a bench, a ring of lawn round the corner tree
  // Grass tufts all over every lawn, so it reads as grass, not green paint.
  const LAWNS = [], PATHS = []; // (where the real grass grows: village.js lays the home's lawn over these)
  function lawn(k, x0, z0, x1, z1, R, tufts = false) {
    LAWNS.push([x0, z0, x1, z1]);
    bx(k, x1 - x0, 0.07, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#86c766', { r: 0.02 });
    bx(k, x1 - x0 + 0.16, 0.05, z1 - z0 + 0.16, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#b7ad9b', { r: 0.02 }); // (the kerb round it)
    if (tufts) for (let i = 0, n = Math.round((x1 - x0) * (z1 - z0) * 0.9); i < n; i++) { const x = x0 + 0.2 + R() * (x1 - x0 - 0.4), z = z0 + 0.2 + R() * (z1 - z0 - 0.4); for (let j = 0; j < 3; j++) k.cone(0.06, 0.32 + R() * 0.18, x + (j - 1) * 0.08, 0.06, z + (R() - 0.5) * 0.08, ['#6fb54e', '#7cc35a', '#5fa844'][j], { n: 3, rz: (j - 1) * 0.35 }); }
  }
  function hedge(k, x0, z0, x1, z1, solid) {
    const w = x1 - x0, d = z1 - z0; bx(k, w, 1.1, d, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, '#4f9a3f', { r: 0.3, seg: 2 });
    for (let a = 0; a < Math.max(w, d); a += 0.9) k.ball(0.42, w > d ? x0 + 0.45 + a : (x0 + x1) / 2, 1.1, w > d ? (z0 + z1) / 2 : z0 + 0.45 + a, '#5aa847', { n: 7, s: [1, 0.6, 1] });
    solid(x0, z0, x1, z1);
  }
  function flowers(k, x0, z0, x1, z1, R) { for (let x = x0 + 0.3; x < x1 - 0.2; x += 0.55) for (let z = z0 + 0.3; z < z1 - 0.2; z += 0.55) { k.cyl(0.02, 0.32, x, 0.06, z, '#4f9a3c', { n: 4 }); k.ball(0.12, x, 0.42, z, ['#ff8fb1', '#ffd34f', '#ffffff', '#b59cff', '#ff9b6a'][(R() * 5) | 0], { n: 6 }); } }
  function slide(k, x, z, ry) { k.at(x, 0, z, ry, kk => {
    for (const a of [-0.6, 0.6]) for (const b of [-0.6, 0.6]) kk.cyl(0.08, 2.6, a, 0, b, '#e85a5a', { n: 6 });
    bx(kk, 1.4, 0.15, 1.4, 0, 2.4, 0, '#ffd35a'); for (const a of [-0.6, 0.6]) bx(kk, 0.08, 0.8, 1.3, a, 2.55, 0, '#e85a5a');
    for (let i = 0; i < 5; i++) bx(kk, 1.1, 0.08, 0.1, 0, 0.45 + i * 0.45, -0.75 - i * 0.05, '#3f86b0'); for (const a of [-0.58, 0.58]) bx(kk, 0.08, 2.6, 0.08, a, 0, -0.85, '#3f86b0', { rx: -0.12 });
    bx(kk, 1.0, 0.12, 3.6, 0, 1.25, 2.2, '#7cc8e8', { rx: 0.62 }); for (const a of [-0.5, 0.5]) bx(kk, 0.08, 0.3, 3.6, a, 1.35, 2.2, '#3f86b0', { rx: 0.62 });
  }); }
  function swings(k, x, z, ry) { k.at(x, 0, z, ry, kk => {
    for (const a of [-1.9, 1.9]) { bx(kk, 0.14, 3.6, 0.14, a, 0, -0.9, '#3f86b0', { rx: 0.25 }); bx(kk, 0.14, 3.6, 0.14, a, 0, 0.9, '#3f86b0', { rx: -0.25 }); }
    bx(kk, 4.0, 0.16, 0.16, 0, 3.45, 0, '#3f86b0');
    for (const a of [-0.9, 0.9]) { for (const b of [-0.3, 0.3]) bx(kk, 0.03, 2.5, 0.03, a + b, 0.95, 0, '#9aa0aa'); bx(kk, 0.8, 0.1, 0.4, a, 0.85, 0, a < 0 ? '#ffd35a' : '#ff9fb7', { r: 0.04 }); }
  }); }
  function sandpit(k, x, z, R) { bx(k, 3.2, 0.4, 3.2, x, 0, z, '#c79a68', { r: 0.06 }); bx(k, 2.8, 0.42, 2.8, x, 0, z, '#f2dca3', { r: 0.04 }); k.cone(0.4, 0.3, x - 0.6, 0.4, z + 0.4, '#ead19a', { n: 8 }); k.cyl(0.25, 0.3, x + 0.7, 0.42, z - 0.5, '#e85a5a', { rt: 0.32, n: 10 }); bx(k, 0.1, 0.5, 0.25, x + 0.4, 0.42, z - 0.2, '#ffd35a', { rz: 0.6 }); }
  function busStop(k, lit, x, z) { k.at(x, 0, z, Math.PI, kk => {
    for (const a of [-1.8, 1.8]) bx(kk, 0.12, 3.6, 0.12, a, 0, -0.5, '#9aa0aa'); bx(kk, 4.0, 0.15, 1.6, 0, 3.6, 0, '#3d4048', { r: 0.04 });
    kk.glassBox(3.6, 2.4, 0.05, 0, 1.0, -0.55, { tint: '#dceaf2' });
    for (let i = 0; i < 2; i++) bx(kk, 3.2, 0.1, 0.28, 0, 0.9, -0.15 + i * 0.3, '#b7834f', { r: 0.03 }); for (const a of [-1.4, 1.4]) bx(kk, 0.1, 0.9, 0.6, a, 0, 0, '#4a4e57');
    kk.cyl(0.07, 3.6, 2.4, 0, 0.4, '#9aa0aa', { n: 6 }); kk.cyl(0.45, 0.08, 2.4, 3.3, 0.4, '#3f86b0', { rx: Math.PI / 2, n: 16 });
  }); lit.box(3.4, 0.05, 0.4, x, 3.5, z, '#fff2d0', { emit: 1, r: 0 }); }
  function outskirts(k, lit, R, solid, spots) {
    // by the gate home (x 0-16, z 45-62): lawns each side of the path in, the playground, trees and a flower bed
    lawn(k, 0.6, 45.6, 7.4, 62.0, R); lawn(k, 10.6, 45.6, 16.0, 62.0, R);
    bx(k, 3.0, 0.08, 16.4, 9, 0, 53.8, '#e3cfa8'); // (the path in, from the gate up to the corner)
    slide(k, 3.6, 49.0, Math.PI / 2); solid(2.5, 47.8, 7.2, 50.2);
    swings(k, 3.8, 55.6, Math.PI / 2); solid(2.6, 53.4, 5.0, 57.8);
    sandpit(k, 13.4, 49.2, R); solid(11.7, 47.5, 15.1, 50.9);
    tree(k, 1.8, 60.2, R, true, 1.3); solid(1.3, 59.7, 2.3, 60.7); tree(k, 14.6, 55.2, R, false, 1.3); solid(14.1, 54.7, 15.1, 55.7);
    flowers(k, 11.2, 56.6, 13.6, 58.0, R); solid(11.0, 56.4, 13.8, 58.2);
    spots.push({ kind: 'play', id: 'slide', name: 'the slide', at: [6.0, 51.0], yaw: -Math.PI / 2, hit: [3.6, 49.0, 0, 4] },
      { kind: 'play', id: 'swings', name: 'the swings', at: [6.4, 55.6], yaw: -Math.PI / 2, hit: [3.8, 55.6, 0, 4.4] },
      { kind: 'play', id: 'sand', name: 'the sandpit', at: [13.4, 51.6], yaw: Math.PI, hit: [13.4, 49.2, 0, 3.4] });
    // south of the lane (x 16-52, z 58.6-63.4): a verge, a hedge along the edge, small trees, the bus stop
    lawn(k, 16.0, 58.6, 52.0, 63.4, R);
    hedge(k, 16.4, 62.2, 25.6, 63.2, solid); hedge(k, 32.4, 62.2, 51.6, 63.2, solid);
    busStop(k, lit, 29, 60.6); solid(26.8, 60.4, 31.4, 62.0); spots.push({ kind: 'bench', id: 'bus', name: 'the bus stop', at: [29, 59.6], seat: [29, 60.5], yaw: Math.PI, hit: [29, 60.6, 0, 3.6] });
    for (const x of [20, 39, 47]) { tree(k, x, 60.4, R, x !== 39, 1.2); solid(x - 0.5, 59.9, x + 0.5, 60.9); }
    flowers(k, 34, 59.4, 37.6, 60.8, R); solid(33.8, 59.2, 37.8, 61.0);
    // between the square and the lane (z 46.6-48.2): a verge with street trees and low hedges, gaps to walk through
    for (const [a, b] of [[16.4, 29.0], [37.0, 51.6]]) { lawn(k, a, 46.6, b, 48.2, R); hedge(k, a + 0.3, 47.0, a + (b - a) * 0.38, 47.8, solid); hedge(k, b - (b - a) * 0.38, 47.0, b - 0.3, 47.8, solid); const m = (a + b) / 2; tree(k, m, 47.4, R, false, 1.1); solid(m - 0.5, 46.9, m + 0.5, 47.9); }
    // the west side: a planted bed with trees and a bench, a ring of lawn round the corner tree, grass along the edge
    lawn(k, 7.0, 33.8, 15.6, 41.4, R); hedge(k, 7.2, 34.0, 7.9, 41.2, solid);
    tree(k, 11.0, 36.0, R, true, 1.3); solid(10.5, 35.5, 11.5, 36.5); tree(k, 14.2, 39.6, R, false, 1.1); solid(13.7, 39.1, 14.7, 40.1); flowers(k, 12.4, 34.4, 15.2, 35.6, R); solid(12.2, 34.2, 15.4, 35.8);
    bench(k, 10.2, 40.6, 0); solid(8.7, 40.0, 11.7, 41.2); spots.push({ kind: 'bench', id: 'wb', name: 'a bench', at: [10.2, 41.9], seat: [10.2, 40.65], yaw: 0, hit: [10.2, 40.6, 0, 3] });
    k.cyl(2.2, 0.07, 12.5, 0, 30, '#86c766', { n: 24 }); k.cyl(2.3, 0.05, 12.5, 0, 30, '#b7ad9b', { n: 24 });
    lawn(k, 0.4, 24.4, 1.6, 27.2, R); lawn(k, 0.4, 34.2, 1.6, 37.0, R); lawn(k, 0.4, 43.4, 1.6, 45.6, R); // (the edge between the machines and the bikes)
    // the square: round planters with a tree and flowers, and a ring of seats round each (the square's not bare)
    for (const [x, z, ch] of [[24, 31.5, 1], [42, 31.5, 0], [24, 40.5, 0], [42, 40.5, 1]]) {
      k.cyl(1.5, 0.75, x, 0, z, '#cfc8bd', { n: 20 }); k.cyl(1.32, 0.78, x, 0, z, '#7a5a3a', { n: 20 }); tree(k, x, z, R, !!ch, 0.95);
      for (let i = 0; i < 10; i++) { const a2 = i / 10 * Math.PI * 2; k.ball(0.16, x + Math.cos(a2) * 1.05, 0.86, z + Math.sin(a2) * 1.05, ['#ff8fb1', '#ffd34f', '#ffffff', '#b59cff', '#ff9b6a'][i % 5], { n: 6 }); }
      solid(x - 1.5, z - 1.5, x + 1.5, z + 1.5);
    }
    // the east edge and the corner by the flats: grass to the rim
    lawn(k, 83.0, 24.4, 83.8, 63.6, R, false); lawn(k, 73.2, 24.4, 83.0, 25.6, R);
  }

  // ---------- the island
  function build() {
    LAWNS.length = 0; PATHS.length = 0;
    const R = rng(4242), k = new Kit(), lit = new Kit(), solids = [], spots = [], bridges = [];
    const solid = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    const root = new T.Group();
    // ground: the island's paving, the street's coloured bands, the square's pattern, the lane, the park's lawn
    bx(k, W, 0.42, D, W / 2, -0.42, D / 2, PAVE, { r: 0.18, seg: 2 });
    for (let x = 1; x < W; x += 2) bx(k, 0.06, 0.005, 9.6, x, 0, 19, PAVE2); // the street's paving joints
    for (const z of [15.2, 22.8]) bx(k, W - 1, 0.01, 0.6, W / 2, 0, z, '#c9a87a'); // brick bands
    for (let x = 2; x < W - 1; x += 3) bx(k, 1.4, 0.012, 1.4, x + 0.7, 0, 19, (x / 3) % 2 ? '#e8c9a0' : '#d4b48a'); // the centre's pattern
    // the market square: rings of paving round the fountain
    for (let r = 13; r > 2; r -= 2.5) k.cyl(r, 0.012 + (13 - r) * 0.0005, 33, 0, 36, r % 5 < 2.5 ? '#e6dccb' : '#d6cab5', { n: 40 });
    // the lane at the front: asphalt, white lines, a crossing
    bx(k, W - 18, 0.02, 6, (16 + W) / 2 - 1, 0, 55, ASPH); for (const z of [52.4, 57.6]) bx(k, W - 19, 0.025, 0.15, (16 + W) / 2 - 1, 0, z, '#f2f2ee');
    // (the park's lawn and path over the lane's east end)
    bx(k, 31, 0.07, 36, 67.5, 0, 44, '#86c766', { r: 0.02 }); LAWNS.push([52, 26, 83, 62]);
    for (const [x0, z0, x1, z1] of [[52, 26, 83, 28], [52, 26, 54, 62], [52, 60, 83, 62], [81, 26, 83, 62], [54, 37, 61, 39]]) PATHS.push([x0, z0, x1, z1]), bx(k, x1 - x0, 0.08, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#e3cfa8'); // the park's paths
    // the island's sides and the rocks under it (as the homes)
    bx(k, W + 0.12, 0.16, D + 0.12, W / 2, -0.5, D / 2, '#b7ad9b', { r: 0.08 });
    bx(k, W - 0.1, 1.15, D - 0.1, W / 2, -1.62, D / 2, '#9a6a45', { r: 0.2, seg: 2 }); bx(k, W - 0.5, 0.9, D - 0.5, W / 2, -2.5, D / 2, '#8f8a99', { r: 0.3, seg: 2 }); bx(k, W - 2.2, 0.8, D - 2.2, W / 2, -3.2, D / 2, '#6f6a7d', { r: 0.35, seg: 2 });
    for (let i = 0; i < 70; i++) { const side = i % 4, t = R(), y = -0.85 - R() * 1.5, s = 0.25 + R() * 0.35; const [x, z] = side === 0 ? [t * W, D - 0.02] : side === 1 ? [W - 0.02, t * D] : side === 2 ? [t * W, 0.02] : [0.02, t * D]; k.ball(s, x, y, z, y < -1.6 ? '#8f8a99' : '#7d5236', { s: [1.2, 0.8, 1], n: 7 }); }
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; k.cone(1.6 + R() * 1.2, 2.4 + R() * 1.5, W / 2 + Math.cos(a) * 26, -4.6 - R() * 0.4, D / 2 + Math.sin(a) * 18, '#6f6a7d', { rx: Math.PI, n: 7 }); }
    k.cone(17, 6, W / 2, -8.5, D / 2, '#6f6a7d', { rx: Math.PI, n: 9 });

    // ---------- Hoshi Street: the shops (each its own model, so it can be cut away), the lamps, lanterns, gateways
    const buildings = [];
    const building = (fn, x0, x1, z1 = 14.6, stubCol = '#e8e2d6') => {
      const bk = new Kit(), bl = new Kit(); fn(bk, bl, R); const full = new T.Group(); full.add(bk.build(), bl.build()); full.children[1].userData.lit = true;
      const sk = new Kit(); sk.box(x1 - x0, 1.0, z1 - 1.5, (x0 + x1) / 2, 0, (1.5 + z1) / 2, stubCol, { r: 0.05 }); const stub = sk.build(); stub.visible = false;
      root.add(full, stub); buildings.push({ full, stub, box: new T.Box3(new T.Vector3(x0, 0, 0), new T.Vector3(x1, 18, z1 + 1)) }); solid(x0, 0, x1, 14.2);
    };
    building(furniture, 3, 23, 14.6, '#ece4d6'); building(grocer, 25, 39, 14.6, '#f3eee4'); building(cafe, 41, 55, 14.6, '#e8dccb'); building(petshop, 57, 73, 14.6, '#d8ecf4'); building(flats, 75, 83, 16, '#efe6d4');
    solid(0, 0, 3, 14.2); solid(23, 0, 25, 14.2); solid(39, 0, 41, 14.2); solid(55, 0, 57, 14.2); solid(73, 0, 75, 14.2); // the alleys between (narrow, no way through)
    for (const [a, b] of [[23, 25], [39, 41], [55, 57], [73, 75]]) { bx(k, b - a, 1.8, 0.2, (a + b) / 2, 0, 13.4, '#a9a297'); bx(k, 1.2, 1.1, 0.8, (a + b) / 2, 0, 12.6, '#5a8a5a', { r: 0.1 }); }
    solid(26, 14.2, 30, 16.6); solid(34, 14.2, 38, 16.6); // the grocer's stands
    solid(41.6, 17.0, 45.4, 19.4); solid(50.6, 17.0, 54.4, 19.4); solid(55, 15.6, 56.4, 17.2); // the café's tables, its board
    spots.push({ kind: 'shop', id: 'furniture', name: 'Home & Furniture', at: [13, 15.4], yaw: Math.PI, hit: [11.4, 14.6, 0, 2.4] },
      { kind: 'shop', id: 'grocer', name: 'Grocer', at: [32, 16.4], yaw: Math.PI, hit: [32, 14.6, 0, 6] },
      { kind: 'shop', id: 'cafe', name: 'Café', at: [49.2, 15.6], yaw: Math.PI, hit: [49.2, 14.6, 0, 2.4] },
      { kind: 'shop', id: 'pets', name: 'Pet Shop', at: [65.4, 15.4], yaw: Math.PI, hit: [65.4, 14.6, 0, 2.4] });
    // lamps with banners along both sides, and lanterns strung across the street between them
    const BAN = ['#e85a5a', '#3f86b0', '#ffb33a', '#2f8a4f'];
    for (let x = 7, i = 0; x < W - 4; x += 12, i++) {
      lamp(k, lit, x, 14.9, BAN[i % 4]); lamp(k, lit, x, 23.4, BAN[(i + 2) % 4]); solid(x - 0.4, 14.5, x + 0.4, 15.3); solid(x - 0.4, 23.0, x + 0.4, 23.8);
      if (x + 12 < W - 4) for (const z of [15.6, 22.7]) { bx(k, 12, 0.04, 0.04, x + 6, 8.6 - (z > 20 ? 0 : 0), z, '#2f2a33'); for (let j = 1; j < 6; j++) lantern(k, lit, x + j * 2, 7.6 - Math.sin(j / 6 * Math.PI) * 0.5, z, j % 2 ? '#e85a5a' : '#ffffff'); }
    }
    // a gateway over each end of the street: two posts, a beam, the street's name
    for (const gx of [1.4, W - 1.4]) {
      for (const gz of [14.8, 23.4]) { bx(k, 0.7, 11, 0.7, gx, 0, gz, '#c94a4a'); bx(k, 1.1, 0.5, 1.1, gx, 0, gz, '#8a8f98'); solid(gx - 0.5, gz - 0.5, gx + 0.5, gz + 0.5); }
      bx(k, 0.9, 1.0, 10.2, gx, 11, 19.1, '#c94a4a'); bx(k, 1.0, 0.4, 10.8, gx, 12, 19.1, '#2f2a33');
      sign(k, 'gate' + gx, 'HOSHI STREET', '★ shops · café · market ★', '#fff6e0', '#c94a4a', 8.6, 1.9, gx + (gx < W / 2 ? 0.48 : -0.48), 9.3, 19.1, gx < W / 2 ? Math.PI / 2 : -Math.PI / 2);
      sign(k, 'gateb' + gx, 'HOSHI STREET', '★ shops · café · market ★', '#fff6e0', '#c94a4a', 8.6, 1.9, gx + (gx < W / 2 ? -0.48 : 0.48), 9.3, 19.1, gx < W / 2 ? -Math.PI / 2 : Math.PI / 2);
    }

    // ---------- the market square: the fountain, a clock post, the stall pitches round it
    k.cyl(4.2, 0.9, 33, 0, 36, '#cfc8bd', { n: 28 }); k.cyl(3.8, 0.2, 33, 0.9, 36, '#bfb8ac', { n: 28 }); k.waterBox(6.6, 0.6, 6.6, 33, 0.35, 36);
    k.cyl(0.9, 1.6, 33, 0.9, 36, '#d9d2c6', { n: 14 }); k.cyl(1.8, 0.3, 33, 2.5, 36, '#cfc8bd', { n: 18 }); k.waterBall(0.7, 33, 3.2, 36); k.cyl(0.25, 1.4, 33, 2.8, 36, '#d9d2c6', { n: 10 });
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.waterBall(0.22, 33 + Math.cos(a) * 1.6, 2.4, 36 + Math.sin(a) * 1.6); }
    solid(28.6, 31.6, 37.4, 40.4);
    spots.push({ kind: 'fountain', id: 'fountain', name: 'the fountain', at: [33, 41.2], yaw: Math.PI, hit: [33, 36, 0, 8.4] });
    // the clock post
    k.cyl(0.2, 8, 24, 0, 36, '#3d4048', { n: 8 }); bx(k, 1.6, 1.6, 1.6, 24, 8, 36, '#3d4048', { r: 0.2 }); for (const [dx, dz, ry] of [[0, 0.82, 0], [0, -0.82, Math.PI], [0.82, 0, Math.PI / 2], [-0.82, 0, -Math.PI / 2]]) { k.cyl(0.65, 0.05, 24 + dx, 8.8, 36 + dz, '#fffaf0', { rx: Math.PI / 2, ry, n: 16 }); }
    solid(23.6, 35.6, 24.4, 36.4);
    // stall pitches: a table, a striped awning on four poles; two have keepers and things for sale, the rest are free
    const stall = (x, z, face, i, wares) => {
      k.at(x, 0, z, face, kk => {
        bx(kk, 4, 1.6, 1.6, 0, 0, 0.2, '#c79a68', { r: 0.05 }); bx(kk, 4.2, 0.12, 1.8, 0, 1.6, 0.2, '#e8d2b0');
        for (const a of [-2, 2]) for (const b of [-1.2, 1.4]) kk.cyl(0.07, 4.2, a, 0, b, '#e8e2d8', { n: 6 });
        for (let j = 0; j < 8; j++) bx(kk, 0.55, 0.1, 3.0, -1.925 + j * 0.55, 4.0, 0.1, j % 2 ? '#ffffff' : ['#e85a5a', '#3f86b0', '#ffb33a', '#2f8a4f'][i % 4], { rx: -0.18 });
        if (wares === 'veg') for (let j = 0; j < 12; j++) kk.ball(0.2, -1.6 + (j % 6) * 0.62, 1.95, -0.1 + Math.floor(j / 6) * 0.5, ['#e85a5a', '#7fcf5a', '#f39a4b', '#ffd35a'][j % 4], { n: 7 });
        if (wares === 'flowers') for (let j = 0; j < 6; j++) { kk.cyl(0.25, 0.5, -1.6 + j * 0.64, 1.72, 0.3, '#5a8a5a', { n: 8 }); for (let f = 0; f < 4; f++) kk.ball(0.14, -1.6 + j * 0.64 + (f % 2 - 0.5) * 0.18, 2.35 + Math.floor(f / 2) * 0.12, 0.3 + (f - 1.5) * 0.08, ['#ff8fb1', '#ffd34f', '#ffffff', '#b59cff', '#ff9b6a'][(j + f) % 5], { n: 6 }); }
        if (!wares) { const tex = signTex('free', 'FREE PITCH', 'for your stall soon', '#ffffff', '#5a4a7a', 512, 160); kk.painted(new T.PlaneGeometry(2.4, 0.75), tex, 0, 0.85, 1.02, {}); }
      });
      const c = Math.cos(face), s = Math.sin(face), corner = (u, v) => [x + u * c + v * s, z - u * s + v * c], a = corner(-2.1, -0.7), b = corner(2.1, 1.1); solid(a[0], a[1], b[0], b[1]);
      const front = corner(0, 2.6); spots.push({ kind: 'stall', table: { x, z, face }, id: 'stall' + i, name: wares ? (wares === 'veg' ? 'the vegetable stall' : 'the flower stall') : 'a free pitch', at: front, yaw: face + Math.PI, keeper: wares ? corner(0, -1.3) : null, hit: [x, z, 0, 4.4] });
    };
    stall(21, 28.5, 0, 0, 'veg'); stall(27, 28.5, 0, 1); stall(39, 28.5, 0, 2); stall(45, 28.5, 0, 3, 'flowers');
    stall(21, 43.5, Math.PI, 4); stall(27, 43.5, Math.PI, 5); stall(39, 43.5, Math.PI, 6); stall(45, 43.5, Math.PI, 7);
    // benches round the square
    for (const [x, z, ry] of [[18.5, 36, Math.PI / 2], [47.5, 36, -Math.PI / 2]]) { bench(k, x, z, ry); solid(x - 0.6, z - 1.5, x + 0.6, z + 1.5); spots.push({ kind: 'bench', id: 'b' + x, name: 'a bench', at: [x + Math.sin(ry) * 0.7, z + Math.cos(ry) * 0.7], seat: [x + Math.sin(ry) * 0.05, z + Math.cos(ry) * 0.05], yaw: ry, hit: [x, z, 0, 3] }); }

    // ---------- the corner by the gate from home: vending machines, bikes, a notice board, the signpost home
    vending(k, lit, 3.2, 28.5, Math.PI / 2, '#e8473f'); vending(k, lit, 3.2, 30.7, Math.PI / 2, '#3a7bd5'); vending(k, lit, 3.2, 32.9, Math.PI / 2, '#f4f4f2'); solid(2, 27.4, 4.2, 34);
    spots.push({ kind: 'vend', id: 'vend', name: 'the vending machines', at: [5.6, 30.7], yaw: -Math.PI / 2, hit: [3.2, 30.7, 0, 6.6] });
    for (let i = 0; i < 4; i++) bike(k, 3.2, 38 + i * 1.4, Math.PI / 2 + 0.15, ['#e85a5a', '#7cc8e8', '#ffd35a', '#9be38f'][i]); bx(k, 0.1, 0.8, 6, 2.4, 0, 40.1, '#9aa0aa'); solid(1.6, 37.2, 4.6, 43.2);
    k.at(10, 0, 44, 0, kk => { for (const s of [-1.6, 1.6]) bx(kk, 0.2, 4.4, 0.2, s, 0, 0, '#6b4a33'); bx(kk, 3.6, 2.6, 0.25, 0, 1.6, 0, '#8a6038', { r: 0.05 }); bx(kk, 3.3, 2.3, 0.1, 0, 1.75, 0.13, '#e9dcc4'); for (let i = 0; i < 5; i++) bx(kk, 0.8, 0.9, 0.04, -1.1 + (i % 3) * 1.1, 2.0 + Math.floor(i / 3) * 1.05, 0.2, ['#ffffff', '#ffd7e2', '#cfe6ff', '#fff1b8', '#d9f5d0'][i]); bx(kk, 3.9, 0.3, 0.6, 0, 4.4, 0, '#6b4a33'); });
    solid(8.2, 43.6, 11.8, 44.4); spots.push({ kind: 'board', id: 'board', name: 'the notice board', at: [10, 45.6], yaw: Math.PI, hit: [10, 44, 0, 4] });
    const tr = rng(77); tree(k, 12.5, 30, tr); solid(11.9, 29.4, 13.1, 30.6);
    // the gate from home, its picket fence to each side and the signpost
    for (let x = 1; x < 16; x += 0.42) { if (x > 7.6 && x < 10.4) continue; bx(k, 0.11, 1.05, 0.08, x, 0, 62.6, '#ffffff', { r: 0.03 }); k.cone(0.08, 0.12, x, 1.05, 62.6, '#ffffff', { n: 4, ry: Math.PI / 4 }); }
    for (const y of [0.3, 0.75]) { bx(k, 6.6, 0.09, 0.06, 4.3, y, 62.53, '#ffffff'); bx(k, 5.6, 0.09, 0.06, 13.2, y, 62.53, '#ffffff'); }
    for (const x of [7.8, 10.2]) { bx(k, 0.2, 1.35, 0.2, x, 0, 62.6, '#ffffff', { r: 0.04 }); k.ball(0.1, x, 1.5, 62.6, '#e8e2d6', { n: 10 }); }
    solid(0.5, 62.2, 16.2, 63.2);
    k.cyl(0.1, 3.6, 12, 0, 59.4, '#8a6038', { n: 6 }); k.at(12, 2.9, 59.4, 0.4, kk => { bx(kk, 2.6, 0.7, 0.12, 0.9, 0, 0, '#fff6e0', { r: 0.06 }); }); k.at(12, 2.1, 59.4, -0.9, kk => { bx(kk, 2.6, 0.7, 0.12, 0.9, 0, 0, '#ffe0e8', { r: 0.06 }); });
    { const t1 = signTex('post1', '🏠 Home', '', '#fff6e0', '#5a4a7a', 512, 140), t2 = signTex('post2', 'Shops ★', '', '#ffe0e8', '#5a4a7a', 512, 140); k.painted(new T.PlaneGeometry(2.4, 0.62), t1, 12 + Math.cos(0.4) * 0.9, 3.25, 59.4 - Math.sin(0.4) * 0.9 + 0.07, { ry: 0.4 }); k.painted(new T.PlaneGeometry(2.4, 0.62), t2, 12 + Math.cos(-0.9) * 0.9, 2.45, 59.4 - Math.sin(-0.9) * 0.9 + 0.07, { ry: -0.9 }); }
    solid(11.7, 59.1, 12.3, 59.7);
    const gate = { at: [9, 62.6] }; spots.push({ kind: 'home', id: 'home', name: 'the gate home', at: [9, 61.0], yaw: 0, hit: [9, 62.6, 0, 2.8] });

    // ---------- the lane: power poles and their wires, a parked kei car, planters
    for (let x = 18; x < 52; x += 11) { k.cyl(0.24, 13, x, 0, 50.2, '#9a958c', { rt: 0.18, n: 8 }); bx(k, 2.4, 0.2, 0.2, x, 11.8, 50.2, '#7a7670'); bx(k, 1.6, 0.2, 0.2, x, 10.6, 50.2, '#7a7670'); k.cyl(0.5, 1.4, x + 0.6, 8.6, 50.2, '#9aa0aa', { n: 10 }); solid(x - 0.4, 49.8, x + 0.4, 50.6);
      if (x + 11 < 52) for (const [dy, dz] of [[11.95, -1], [11.95, 1], [10.75, -0.6], [10.75, 0.6]]) { const p0 = [x, dy, 50.2 + dz * 0.5], p1 = [x + 11, dy, 50.2 + dz * 0.5]; for (let i = 0; i < 8; i++) { const u0 = i / 8, u1 = (i + 1) / 8, sag = u => -Math.sin(u * Math.PI) * 0.6; const ax = p0[0] + (p1[0] - p0[0]) * u0, ay = dy + sag(u0), bx2 = p0[0] + (p1[0] - p0[0]) * u1, by = dy + sag(u1); const len = Math.hypot(bx2 - ax, by - ay); bx(k, len, 0.04, 0.04, (ax + bx2) / 2, (ay + by) / 2 - 0.02, p0[2], '#2f2a33', { rz: Math.atan2(by - ay, bx2 - ax) }); } } }
    car(k, 26, 55.2, Math.PI / 2); solid(22.6, 53.6, 29.4, 56.8);
    for (const x of [36, 42]) { bx(k, 2.6, 1.0, 1.0, x, 0, 49.2, '#a9a297', { r: 0.06 }); for (let i = 0; i < 4; i++) k.ball(0.4, x - 0.9 + i * 0.6, 1.2, 49.2, ['#5fae4a', '#78c25a'][i % 2], { n: 7 }); k.ball(0.15, x - 0.6, 1.6, 49.4, '#ff8fb1', { n: 6 }); k.ball(0.15, x + 0.4, 1.6, 49.0, '#ffd34f', { n: 6 }); solid(x - 1.3, 48.7, x + 1.3, 49.7); }

    // ---------- the pocket park: the pond and its bridge, cherry trees, benches, lamps, flower beds
    const pond = { x: 68, z: 45, rx: 7.5, rz: 5.2 };
    k.cyl(1, 0.3, pond.x, -0.25, pond.z, '#8f8a99', { s: [pond.rx + 0.6, 1, pond.rz + 0.6], n: 30 });
    k.special(new T.CylinderGeometry(1, 1, 0.2, 48), 'water', k._m(pond.x, -0.02, pond.z, { s: [pond.rx + 0.3, 1, pond.rz + 0.3] }), { tint: '#6fc0d8' }); // (round, as the stones round it)
    for (let i = 0; i < 5; i++) k.cyl(0.55, 0.05, pond.x - 4 + i * 1.9, 0.08, pond.z + (i % 2 ? 2.4 : -2.6), '#5fae4a', { n: 10 }); // lily pads
    k.ball(0.2, pond.x - 2, 0.15, pond.z + 2.5, '#ffb7cf', { n: 7 });
    // the bridge: an arched timber bridge across the pond, east to west
    for (let i = 0; i < 18; i++) { const u = i / 17, x = pond.x - pond.rx - 1 + u * (pond.rx * 2 + 2), y = Math.sin(u * Math.PI) * 0.9; bx(k, 1.0, 0.2, 2.6, x, y, pond.z, '#b7834f', { r: 0.03 }); if (i % 3 === 0) for (const s of [-1.2, 1.2]) bx(k, 0.15, 1.1, 0.15, x, y, pond.z + s, '#8a6038'); }
    for (const s of [-1.2, 1.2]) for (let i = 0; i < 6; i++) { const u0 = i / 6, u1 = (i + 1) / 6, xa = pond.x - pond.rx - 1 + u0 * (pond.rx * 2 + 2), xb = pond.x - pond.rx - 1 + u1 * (pond.rx * 2 + 2), ya = Math.sin(u0 * Math.PI) * 0.9 + 1.1, yb = Math.sin(u1 * Math.PI) * 0.9 + 1.1; bx(k, Math.hypot(xb - xa, yb - ya), 0.14, 0.14, (xa + xb) / 2, (ya + yb) / 2 - 0.07, pond.z + s, '#a5784b', { rz: Math.atan2(yb - ya, xb - xa) }); }
    bridges.push({ x0: pond.x - pond.rx - 1.4, x1: pond.x + pond.rx + 1.4, z0: pond.z - 1.0, z1: pond.z + 1.0, arc: 0.9 });
    spots.push({ kind: 'pond', id: 'bridge', name: 'the bridge', at: [pond.x, pond.z], yaw: Math.PI, hit: [pond.x, pond.z, 0, 3] });
    const pk = rng(31);
    for (const [x, z] of [[57, 31], [79, 31], [57, 57.5], [79.5, 58], [75.5, 35], [60, 52]]) { tree(k, x, z, pk, true, 1.7); solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6); }
    tree(k, 80, 44, pk, false, 1.6); solid(79.4, 43.4, 80.6, 44.6);
    for (const [x, z, ry] of [[66, 29.4, 0], [70, 59.8, Math.PI], [55.6, 45, Math.PI / 2]]) { bench(k, x, z, ry); solid(x - (ry % Math.PI ? 0.6 : 1.5), z - (ry % Math.PI ? 1.5 : 0.6), x + (ry % Math.PI ? 0.6 : 1.5), z + (ry % Math.PI ? 1.5 : 0.6)); spots.push({ kind: 'bench', id: 'pb' + x, name: 'a bench', at: [x + Math.sin(ry) * 0.7, z + Math.cos(ry) * 0.7], seat: [x + Math.sin(ry) * 0.05, z + Math.cos(ry) * 0.05], yaw: ry, hit: [x, z, 0, 3] }); }
    for (const [x, z] of [[54.6, 33], [81.6, 51], [62, 61], [54.6, 58]]) { lamp(k, lit, x, z); solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4); }
    for (const [x, z] of [[71, 31.2], [61, 57.6]]) { bx(k, 4.4, 0.35, 1.6, x, 0, z, '#9a958c', { r: 0.1 }); for (let i = 0; i < 12; i++) k.ball(0.18, x - 1.8 + (i % 6) * 0.72, 0.55, z - 0.35 + Math.floor(i / 6) * 0.7, ['#ff8fb1', '#ffd34f', '#ffffff', '#b59cff', '#ff9b6a'][i % 5], { n: 6 }); solid(x - 2.2, z - 0.8, x + 2.2, z + 0.8); }
    // the park keeper's shed: tools, the sign for the mowing job
    k.at(79.6, 0, 33.2, -Math.PI / 2, kk => { bx(kk, 3.2, 2.6, 2.4, 0, 0, 0, '#7a9a6a', { r: 0.05 }); kk.cone(2.5, 1.0, 0, 2.6, 0, '#a5523f', { n: 4, ry: Math.PI / 4, s: [1.3, 1, 1] }); bx(kk, 1.2, 2.0, 0.1, 0, 0, 1.22, '#5a4632'); bx(kk, 0.1, 1.4, 0.1, 1.0, 0, 1.4, '#8a6038', { rz: 0.2 }); bx(kk, 0.5, 0.1, 0.1, 1.1, 1.4, 1.4, '#9aa0aa'); });
    solid(78.2, 31.4, 81.0, 35.0);
    spots.push({ kind: 'shed', id: 'shed', name: 'the park keeper’s shed', at: [77.6, 33.2], yaw: Math.PI / 2, hit: [79.6, 33.2, 0, 3.4] });
    spots.push({ kind: 'park', id: 'lawn1', name: 'the park', at: [62, 34] }, { kind: 'park', id: 'lawn2', name: 'the park', at: [76, 52] }, { kind: 'park', id: 'lawn3', name: 'the park', at: [58, 40] });
    // more lamps round the square and the lane
    for (const [x, z] of [[17, 26.5], [49, 26.5], [17, 46], [49, 46]]) { lamp(k, lit, x, z, BAN[(x + z) % 4 | 0]); solid(x - 0.4, z - 0.4, x + 0.4, z + 0.4); }

    outskirts(k, lit, R, solid, spots);
    const main = k.build(), glow = lit.build(); glow.visible = false; glow.userData.lit = true;
    root.add(main, glow);
    // the things to tap: invisible boxes over each spot (shop fronts, stalls, benches, the machines, the gate)
    for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4.5, w * (s.kind === 'shop' ? 0.5 : 1)), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 2.25, z); m.userData.spot = s; root.add(m); }
    root.traverse(m => { if (m.isMesh) m.userData.village = true; });
    const lits = []; root.traverse(o => { if (o.userData.lit) lits.push(o); });
    return { root, lits, bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids, pond, bridges, spots, buildings, gate, arrive: [9, 60.4], lawns: LAWNS.slice(), paths: PATHS.slice() };
  }
  IH.villageBuild = { build, W, D };
})();
