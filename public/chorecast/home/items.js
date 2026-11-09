/* Chorecast homes (a prototype), part 4 of 5: the things kids put in their homes.
   Every item is built facing +z (towards the camera at first) with its footprint centred on the origin and its
   bottom at y 0. One unit is one floor tile (about 50 cm): a bed is 2 × 4 tiles, a chair 1 × 1.
   kind: floor (stands on the floor), rug (lies under furniture), small (on a table, shelf or the floor),
   wall (hangs on a full-height wall), pet (lives in the home and wanders about).
   where: in (inside only), out (garden only) or any. surf: height of a top that small things can stand on.
   xp is the price; earn is the XP a kid must have earned in total before it unlocks. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const { Kit, shade, rng, painted } = IH.kit;
  const W = '#ffffff', WOOD = '#d9a46e', WOOD2 = '#b9824f', DARK = '#5b4a5e';

  const legs = (k, w, d, h, col, inset = 0.12, r = 0.07) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl(r, h, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), col, { rt: r * 0.85, n: 8 }); };
  const books = (k, x0, x1, y, z, depth, seed) => { const R = rng(seed); let x = x0; const C = ['#e86f6f', '#6fa8e8', '#f2c14e', '#7cc8a4', '#b59cff', '#ff9fb7', '#f4f1e8']; while (x < x1 - 0.1) { const w = 0.1 + R() * 0.1, h = 0.45 + R() * 0.3; if (x + w > x1) break; k.box(w, h, depth, x + w / 2, y, z, C[(R() * C.length) | 0], { r: 0.015, rz: R() < 0.1 ? 0.15 : 0 }); x += w + 0.015; } };
  const pot = (k, r, h, col, y = 0) => { k.lathe([[0.001, 0], [r * 0.8, 0], [r, h * 0.92], [r * 1.08, h * 0.95], [r * 1.08, h], [r * 0.9, h], [0.001, h * 0.92]], 0, y, 0, col, { n: 18 }); k.cyl(r * 0.88, 0.04, 0, y + h * 0.86, 0, '#6b4a33', { n: 14 }); };
  const leaf = (k, x, y, z, ry, rx, len, col, wid = 0.32) => k.at(x, y, z, ry, kk => kk.ball(0.5, 0, 0, len * 0.5, col, { s: [wid, 0.06, len], n: 10 }), rx);

  // Details that make furniture read as real: tapered legs with brass feet, turned legs, piping along cushion edges,
  // buttons on backs, knobs and inset drawer fronts.
  const tleg = (k, x, z, h, col = WOOD2, r = 0.065) => { k.cyl(r * 0.55, h, x, 0, z, col, { rt: r, n: 10 }); k.cyl(r * 0.6, 0.05, x, 0, z, '#c9a24a', { n: 10 }); };
  const turned = (k, x, z, h, col = WOOD2) => k.lathe([[0.001, 0], [0.05, 0], [0.045, h * 0.12], [0.065, h * 0.2], [0.04, h * 0.3], [0.04, h * 0.7], [0.06, h * 0.8], [0.05, h * 0.92], [0.06, h], [0.001, h]], x, 0, z, col, { n: 10 });
  const knob = (k, x, y, z, col = '#c9a24a') => { k.cyl(0.025, 0.05, x, y, z, col, { rx: Math.PI / 2, n: 8 }); k.ball(0.05, x, y, z + 0.06, col, { n: 10 }); };
  const drawerFront = (k, w, h, x, y, z, col, knobs = 2) => { k.box(w, h, 0.05, x, y, z, col, { r: 0.03 }); k.box(w - 0.12, h - 0.12, 0.03, x, y + 0.06, z + 0.03, shade(col, 0.06), { r: 0.02 }); for (let i = 0; i < knobs; i++) knob(k, x + (knobs === 1 ? 0 : (i ? 1 : -1) * w * 0.28), y + h / 2, z + 0.03); };

  // ---------- Painted pictures (canvas textures) for things that are pictures, not shapes: the world on a globe, a
  // painting on canvas, the numbers on a clock face. Drawn flat and bold like an anime background.
  const blobPath = (g, pts, X, Y) => { g.beginPath(); pts.forEach(([a, b], i) => { const x = X(a), y = Y(b); if (!i) g.moveTo(x, y); else { const [pa, pb] = pts[i - 1]; g.quadraticCurveTo(X(pa), Y(pb), (X(pa) + x) / 2, (Y(pb) + y) / 2); } }); g.closePath(); };
  // continents as rough lon/lat outlines (a hand-drawn school globe, not a survey map)
  const LANDS = [
    [[-168, 65], [-140, 70], [-100, 72], [-80, 66], [-62, 58], [-55, 48], [-70, 42], [-80, 31], [-81, 25], [-90, 29], [-97, 18], [-87, 15], [-82, 9], [-92, 15], [-105, 21], [-117, 32], [-124, 40], [-125, 49], [-135, 58], [-150, 60], [-165, 60]],
    [[-50, 60], [-40, 66], [-20, 72], [-22, 80], [-40, 83], [-60, 82], [-72, 77], [-55, 68]],
    [[-78, 8], [-60, 10], [-50, 2], [-35, -6], [-39, -15], [-48, -26], [-57, -34], [-65, -42], [-68, -54], [-74, -50], [-72, -35], [-71, -18], [-80, -6]],
    [[-10, 36], [-9, 43], [-2, 44], [-4, 48], [3, 51], [8, 54], [5, 58], [12, 64], [20, 70], [32, 70], [42, 66], [45, 52], [42, 44], [36, 41], [28, 41], [24, 38], [18, 40], [12, 44], [8, 44], [3, 42]],
    [[-17, 15], [-16, 24], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 24], [43, 12], [51, 11], [42, -2], [40, -15], [35, -24], [27, -33], [19, -35], [14, -24], [12, -12], [9, -1], [7, 4], [-4, 5], [-12, 8]],
    [[42, 44], [45, 52], [42, 66], [60, 70], [80, 74], [105, 78], [140, 73], [170, 68], [178, 64], [160, 58], [155, 51], [141, 46], [130, 42], [122, 38], [121, 30], [120, 22], [108, 18], [106, 10], [100, 2], [98, 12], [92, 21], [88, 21], [80, 10], [77, 8], [72, 20], [66, 25], [57, 25], [50, 30], [48, 28], [52, 17], [44, 12], [38, 22], [34, 30], [36, 37]],
    [[114, -22], [122, -17], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [151, -33], [146, -39], [140, -37], [135, -34], [125, -33], [116, -35], [114, -28]],
    [[172.5, -34.5], [175, -37], [178, -38], [175, -41.5], [172, -41], [173, -39]], [[172, -41], [174, -42], [171, -46], [167, -46.5], [168, -44.5]],
    [[95, 5], [105, -6], [116, -8], [118, 2], [110, 2], [100, 6]], [[130, 31], [135, 34], [141, 38], [142, 44], [139, 40], [134, 35]], [[-8, 50], [-3, 51], [1, 53], [-2, 58], [-6, 56]], [[44, -13], [50, -16], [48, -25], [44, -24]]
  ];
  const atlas = () => painted('atlas', 1024, 512, (g, W, H) => {
    const X = l => (l + 180) / 360 * W, Y = b => (90 - b) / 180 * H;
    g.fillStyle = '#4f9be0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; for (let l = -150; l <= 180; l += 30) { g.beginPath(); g.moveTo(X(l), 0); g.lineTo(X(l), H); g.stroke(); } for (let b = -60; b <= 60; b += 30) { g.beginPath(); g.moveTo(0, Y(b)); g.lineTo(W, Y(b)); g.stroke(); }
    const C = ['#8fd36a', '#f2d27a', '#7cc556', '#ffb36b', '#9be38f', '#f6c8a0', '#c8e07a', '#7cc556', '#7cc556', '#9be38f', '#ffd27a', '#8fd36a', '#f6c8a0'];
    LANDS.forEach((p, i) => { blobPath(g, p, X, Y); g.fillStyle = C[i % C.length]; g.fill(); g.lineWidth = 3; g.strokeStyle = '#3d6a3a'; g.stroke(); });
    g.fillStyle = '#ffffff'; g.fillRect(0, Y(-70), W, H - Y(-70)); g.fillRect(0, 0, W, Y(82)); // the ice
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(0, Y(0)); g.lineTo(W, Y(0)); g.stroke();
  });
  const meadow = () => painted('meadow', 512, 384, (g, W, H) => {
    const sky = g.createLinearGradient(0, 0, 0, H * 0.6); sky.addColorStop(0, '#7cc8ff'); sky.addColorStop(1, '#d8f0ff'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(W * 0.78, H * 0.2, 34, 0, 7); g.fill(); g.fillStyle = 'rgba(255,240,170,0.35)'; g.beginPath(); g.arc(W * 0.78, H * 0.2, 54, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; for (const [x, y, s] of [[0.2, 0.18, 1], [0.42, 0.12, 0.7], [0.6, 0.3, 0.8]]) for (const [dx, dy, r] of [[0, 0, 26], [24, -10, 22], [48, 0, 24], [22, 8, 22]]) { g.beginPath(); g.arc(W * x + dx * s, H * y + dy * s, r * s, 0, 7); g.fill(); }
    g.fillStyle = '#a7b8d6'; g.beginPath(); g.moveTo(0, H * 0.6); g.lineTo(W * 0.25, H * 0.32); g.lineTo(W * 0.45, H * 0.58); g.lineTo(W * 0.65, H * 0.36); g.lineTo(W, H * 0.6); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(W * 0.21, H * 0.37); g.lineTo(W * 0.25, H * 0.32); g.lineTo(W * 0.29, H * 0.37); g.fill(); g.beginPath(); g.moveTo(W * 0.61, H * 0.41); g.lineTo(W * 0.65, H * 0.36); g.lineTo(W * 0.69, H * 0.41); g.fill();
    g.fillStyle = '#6dbb52'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.62); g.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.6, H * 0.64); g.quadraticCurveTo(W * 0.85, H * 0.56, W, H * 0.62); g.lineTo(W, H); g.fill();
    g.fillStyle = '#5aa846'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.8); g.quadraticCurveTo(W * 0.5, H * 0.66, W, H * 0.82); g.lineTo(W, H); g.fill();
    g.fillStyle = '#fff6e8'; g.fillRect(W * 0.62, H * 0.56, 52, 36); g.fillStyle = '#e86f6f'; g.beginPath(); g.moveTo(W * 0.62 - 8, H * 0.56); g.lineTo(W * 0.62 + 26, H * 0.56 - 26); g.lineTo(W * 0.62 + 60, H * 0.56); g.fill(); g.fillStyle = '#7cc8ff'; g.fillRect(W * 0.62 + 8, H * 0.56 + 10, 12, 12); g.fillStyle = '#c98f5a'; g.fillRect(W * 0.62 + 30, H * 0.56 + 14, 12, 22);
    g.fillStyle = '#7b4f30'; g.fillRect(W * 0.16, H * 0.6, 10, 40); g.fillStyle = '#4fae4f'; g.beginPath(); g.arc(W * 0.16 + 5, H * 0.56, 30, 0, 7); g.fill();
    const F = ['#ff8fb1', '#ffd34f', '#ffffff', '#c3a2ff']; for (let i = 0; i < 26; i++) { g.fillStyle = F[i % 4]; g.beginPath(); g.arc((i * 97 % 500) + 6, H * 0.84 + (i * 37 % 50), 5, 0, 7); g.fill(); }
    g.strokeStyle = '#3d4a3a'; g.lineWidth = 2; g.strokeRect(1, 1, W - 2, H - 2);
  });
  const clockFace = () => painted('clockface', 256, 256, (g, W) => {
    g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(W / 2, W / 2, W / 2, 0, 7); g.fill();
    g.fillStyle = '#5b4a5e'; g.font = '900 30px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(String(i), W / 2 + Math.sin(a) * W * 0.36, W / 2 - Math.cos(a) * W * 0.36); }
    for (let i = 0; i < 60; i++) { if (i % 5 === 0) continue; const a = i / 60 * Math.PI * 2; g.fillRect(W / 2 + Math.sin(a) * W * 0.46 - 1, W / 2 - Math.cos(a) * W * 0.46 - 1, 3, 3); }
  });

  const D = [];
  const add = (t, name, cat, xp, fp, kind, b, o = {}) => D.push(Object.assign({ t, name, cat, xp, fp, kind, b, where: 'any' }, o));

  // ---------- Furniture
  add('bed', 'Cosy bed', 'furn', 400, [2, 4], 'floor', (k, sub) => {
    k.box(2, 0.55, 4, 0, 0.15, 0, WOOD, { r: 0.08 }); legs(k, 2, 4, 0.2, WOOD2, 0.15, 0.08);
    k.box(1.85, 0.4, 3.8, 0, 0.7, 0.02, W, { r: 0.12, seg: 2 });
    // the duvet is its own part, pinned at the foot end, so it can be pulled up over whoever is in bed
    sub('duvet', kk => { kk.box(1.96, 0.3, 2.7, 0, 0, -1.35, '#8ec9f2', { r: 0.14, seg: 2 }); kk.box(1.98, 0.08, 0.5, 0, 0.23, -2.4, '#ffffff', { r: 0.04 }); }, 0, 0.95, 1.95);
    sub('pillow', kk => kk.box(1.2, 0.3, 0.6, 0, 0, 0, '#fff6e8', { r: 0.14, seg: 6 }), 0, 1.0, -1.45); // soft: the head sinks into it
    k.box(2.05, 1.7, 0.18, 0, 0, -1.95, WOOD2, { r: 0.08, seg: 2 }); k.ball(0.95, 0, 1.55, -1.95, WOOD2, { s: [1.05, 0.38, 0.09], n: 20 });
  }, { blurb: 'Soft pillows and a blue duvet.' });
  add('bunk', 'Bunk beds', 'furn', 950, [2, 4], 'floor', k => {
    const F = '#f4efe6', Fd = shade(F, -0.08);
    for (const sx of [-0.92, 0.92]) for (const sz of [-1.9, 1.9]) { k.box(0.16, 3.7, 0.16, sx, 0, sz, F, { r: 0.05 }); k.ball(0.1, sx, 3.74, sz, Fd, { n: 10 }); k.box(0.18, 0.08, 0.18, sx, 0, sz, Fd, { r: 0.03 }); } // posts with round finials and feet
    for (const y of [0.3, 2.2]) {
      k.box(2, 0.28, 3.9, 0, y, 0, F, { r: 0.06 }); k.box(2.02, 0.04, 3.92, 0, y + 0.12, 0, Fd, { r: 0.02 }); // side rails with a groove
      k.box(1.8, 0.3, 3.7, 0, y + 0.28, 0, W, { r: 0.1 }); k.box(1.82, 0.03, 3.72, 0, y + 0.42, 0, '#e8eef6', { r: 0.02 }); // mattress with its piping
      const q = y > 1 ? '#ffb4c7' : '#9fd8a8'; k.box(1.86, 0.2, 2.4, 0, y + 0.5, 0.65, q, { r: 0.1 }); k.box(1.9, 0.1, 0.5, 0, y + 0.62, -0.4, shade(q, 0.3), { r: 0.05 }); // duvet with its sheet folded back over it
      for (let i = 0; i < 3; i++) k.box(1.88, 0.012, 0.03, 0, y + 0.7, 0.2 + i * 0.6, shade(q, -0.12), { r: 0.005 }); // quilting lines
      k.box(1.0, 0.24, 0.55, 0, y + 0.55, -1.45, '#fff6e8', { r: 0.11 }); k.box(0.5, 0.18, 0.4, 0.4, y + 0.58, -1.3, y > 1 ? '#b59cff' : '#ffe07a', { r: 0.09, ry: 0.3 }); // pillow and a little cushion
    }
    k.box(2, 0.5, 0.12, 0, 3.0, 1.9, F, { r: 0.04 }); k.box(0.12, 0.5, 3.9, -0.92, 3.0, 0, F, { r: 0.04 }); k.box(2, 0.5, 0.12, 0, 3.0, -1.9, F, { r: 0.04 }); // guard rails round the top bunk
    for (const z of [-1.2, -0.4, 0.4, 1.2]) k.box(0.06, 0.4, 0.06, -0.92, 3.0, z, Fd, { r: 0.02 }); // spindles in the side rail
    k.box(2, 0.7, 0.1, 0, 0.6, -1.95, F, { r: 0.04 }); k.box(1.6, 0.4, 0.04, 0, 0.75, -1.9, shade(F, 0.04), { r: 0.03 }); k.box(2, 0.7, 0.1, 0, 2.5, -1.95, F, { r: 0.04 }); k.box(1.6, 0.4, 0.04, 0, 2.65, -1.9, shade(F, 0.04), { r: 0.03 }); // panelled headboards
    for (let y = 0.55; y < 3.0; y += 0.5) { k.box(0.55, 0.08, 0.08, 0.6, y, 1.98, '#ffcf5a', { r: 0.03 }); k.box(0.45, 0.02, 0.1, 0.6, y + 0.08, 1.98, '#f2b43a', { r: 0.01 }); } // ladder rungs with grip strips
    for (const x of [0.35, 0.85]) { k.box(0.08, 3.2, 0.1, x, 0.3, 1.98, '#ffcf5a', { r: 0.03 }); k.ball(0.06, x, 3.54, 1.98, '#f2b43a', { n: 8 }); }
    k.box(0.5, 0.08, 0.2, -0.6, 2.95, 1.92, '#d9a46e', { r: 0.02 }); k.ball(0.06, -0.55, 3.08, 1.92, '#ffe07a', { n: 8, emit: 0.6 }); // a little reading-light shelf on the top bunk
  }, { earn: 2000, blurb: 'Two beds, one on top of the other, with a ladder.' });
  add('sofa', 'Comfy sofa', 'furn', 600, [4, 2], 'floor', k => {
    const c = '#f08f7b', l = shade(c, 0.1), d = shade(c, -0.14), pip = shade(c, -0.26);
    k.box(3.7, 0.5, 1.7, 0, 0.22, 0.02, c, { r: 0.12, seg: 3 }); k.box(3.74, 0.07, 1.74, 0, 0.22, 0.02, d, { r: 0.03 }); // the frame and a skirt line
    for (const x of [-1.62, 1.62]) for (const z of [-0.62, 0.68]) tleg(k, x, z, 0.24);
    for (const x of [-0.9, 0.9]) { k.box(1.78, 0.3, 1.25, x, 0.7, 0.22, l, { r: 0.13, seg: 3 }); k.box(1.66, 0.04, 0.04, x, 0.84, 0.84, pip, { r: 0.02 }); k.box(1.66, 0.04, 0.04, x, 0.72, 0.84, pip, { r: 0.02 }); } // seat cushions, piped
    k.box(3.6, 1.05, 0.38, 0, 0.66, -0.66, c, { r: 0.16, seg: 3 });
    for (const x of [-0.9, 0.9]) { k.box(1.72, 0.85, 0.36, x, 0.98, -0.42, l, { r: 0.16, seg: 3, rx: -0.12 }); for (const bx of [-0.45, 0, 0.45]) for (const by of [1.28, 1.56]) k.ball(0.035, x + bx, by, -0.22 - (by - 1.28) * 0.12, pip, { n: 6 }); } // back cushions, buttoned
    for (const sd of [-1, 1]) { k.box(0.4, 0.6, 1.7, sd * 1.66, 0.5, 0.02, c, { r: 0.14, seg: 3 }); k.cyl(0.24, 1.72, sd * 1.66, 0.24, 0.02, c, { rx: Math.PI / 2, n: 18 }); k.cyl(0.2, 0.05, sd * 1.66, 1.07, 0.88, pip, { rx: Math.PI / 2, n: 16 }); } // rolled arms
    k.box(0.7, 0.62, 0.22, -1.15, 1.02, -0.3, '#ffe08a', { r: 0.13, seg: 3, rx: -0.3, rz: -0.1 }); k.box(0.66, 0.58, 0.22, 1.18, 1.02, -0.3, '#8fd0e8', { r: 0.13, seg: 3, rx: -0.3, rz: 0.14 }); // scatter cushions
    k.box(0.55, 0.05, 0.9, 1.66, 1.32, 0.2, '#fff2d8', { r: 0.03 }); k.box(0.06, 0.55, 0.9, 1.92, 0.8, 0.2, '#fff2d8', { r: 0.03 }); for (const z of [-0.1, 0.2, 0.5]) k.box(0.07, 0.56, 0.06, 1.93, 0.8, z, '#ff9f7b', { r: 0.02 }); // a throw over the arm
  }, { blurb: 'Room for the whole family, plus cushions.' });
  add('armchair', 'Armchair', 'furn', 350, [2, 2], 'floor', k => {
    const c = '#7cc8a4', l = shade(c, 0.1), d = shade(c, -0.14), pip = shade(c, -0.28);
    k.box(1.6, 0.5, 1.5, 0, 0.22, 0.02, c, { r: 0.12, seg: 3 }); k.box(1.64, 0.07, 1.54, 0, 0.22, 0.02, d, { r: 0.03 });
    for (const x of [-0.68, 0.68]) for (const z of [-0.55, 0.6]) tleg(k, x, z, 0.24);
    k.box(1.12, 0.3, 1.15, 0, 0.7, 0.18, l, { r: 0.13, seg: 3 }); k.box(1.0, 0.04, 0.04, 0, 0.84, 0.76, pip, { r: 0.02 }); k.box(1.0, 0.04, 0.04, 0, 0.72, 0.76, pip, { r: 0.02 });
    k.box(1.55, 1.15, 0.38, 0, 0.6, -0.58, c, { r: 0.17, seg: 3 }); k.cyl(0.2, 1.5, 0, 0.97, -0.6, c, { rz: Math.PI / 2, n: 16 }); // the back, a rolled top
    k.box(1.08, 0.8, 0.3, 0, 0.95, -0.36, l, { r: 0.15, seg: 3, rx: -0.12 }); for (const bx of [-0.3, 0, 0.3]) for (const by of [1.22, 1.48]) k.ball(0.032, bx, by, -0.19 - (by - 1.22) * 0.12, pip, { n: 6 });
    for (const sd of [-1, 1]) { k.box(0.32, 0.56, 1.5, sd * 0.66, 0.5, 0.02, c, { r: 0.13, seg: 3 }); k.cyl(0.2, 1.52, sd * 0.66, 0.31, 0.02, c, { rx: Math.PI / 2, n: 16 }); k.cyl(0.165, 0.05, sd * 0.66, 1.04, 0.77, pip, { rx: Math.PI / 2, n: 14 }); }
    k.box(0.6, 0.52, 0.2, 0.12, 1.0, -0.2, '#ffd2dc', { r: 0.12, seg: 3, rx: -0.3, rz: 0.12 });
  });
  add('beanbag', 'Beanbag', 'furn', 250, [2, 2], 'floor', k => {
    const c = '#b59cff', d = shade(c, -0.18);
    k.ball(0.86, 0, 0.5, 0.05, c, { s: [1, 0.62, 1], n: 24 }); k.ball(0.64, 0, 0.92, -0.34, shade(c, 0.07), { s: [1, 0.72, 0.72], n: 20 }); // the base and the slumped top
    k.torus(0.8, 0.025, 0, 0.42, 0.05, d, { rx: Math.PI / 2, s: [1, 1, 1] }); // a seam round the middle
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.box(0.03, 0.62, 0.03, Math.cos(a) * 0.55, 0.42, 0.05 + Math.sin(a) * 0.55, d, { r: 0.012, rz: Math.cos(a) * 0.5, rx: -Math.sin(a) * 0.5 }); } // panel seams
    k.ball(0.5, 0, 0.55, 0.42, shade(c, 0.05), { s: [1.15, 0.35, 0.8], n: 16 }); // the dip where you sit
    k.box(0.24, 0.12, 0.06, 0, 1.0, -0.78, d, { r: 0.03 }); // a carry handle on the back
  });
  add('table', 'Dining table', 'furn', 450, [3, 2], 'floor', k => {
    k.box(2.92, 0.1, 1.92, 0, 1.42, 0, WOOD, { r: 0.05 }); k.box(2.86, 0.08, 1.86, 0, 1.36, 0, shade(WOOD, -0.08), { r: 0.04 }); // top with a softened edge
    for (const [w, d, x, z] of [[2.5, 0.06, 0, 0.8], [2.5, 0.06, 0, -0.8], [0.06, 1.5, 1.28, 0], [0.06, 1.5, -1.28, 0]]) k.box(w, 0.2, d, x, 1.16, z, WOOD2, { r: 0.02 }); // apron
    for (const x of [-1.28, 1.28]) for (const z of [-0.8, 0.8]) k.cyl(0.05, 1.36, x, 0, z, WOOD2, { rt: 0.085, n: 10 });
    k.box(2.0, 0.015, 0.5, 0, 1.52, 0, '#f6e7c8', { r: 0.005 }); for (const x of [-0.98, 0.98]) k.box(0.04, 0.12, 0.5, x, 1.41, 0, '#f6e7c8', { r: 0.005 }); // a runner hanging over the ends
  }, { surf: 1.52 });
  add('chair', 'Chair', 'furn', 120, [1, 1], 'floor', k => {
    for (const x of [-0.34, 0.34]) for (const z of [-0.34, 0.34]) turned(k, x, z, 0.8);
    for (const [w, d, x, z] of [[0.72, 0.06, 0, 0.36], [0.72, 0.06, 0, -0.36], [0.06, 0.72, 0.36, 0], [0.06, 0.72, -0.36, 0]]) k.box(w, 0.14, d, x, 0.66, z, WOOD2, { r: 0.02 }); // the apron
    k.box(0.86, 0.08, 0.84, 0, 0.8, 0.01, WOOD, { r: 0.04 }); k.box(0.72, 0.1, 0.7, 0, 0.88, 0.03, '#ffcf5a', { r: 0.05, seg: 2 }); // seat and a tie-on cushion
    for (const x of [-0.24, 0.24]) k.box(0.05, 0.12, 0.02, x, 0.86, -0.33, '#ffcf5a', { r: 0.01 });
    for (const x of [-0.34, 0.34]) k.cyl(0.04, 1.02, x, 0.84, -0.36, WOOD2, { rt: 0.035, n: 8 }); // back posts
    for (const x of [-0.16, 0, 0.16]) k.cyl(0.022, 0.5, x, 1.0, -0.37, WOOD, { n: 6 }); // spindles
    k.box(0.82, 0.16, 0.08, 0, 1.5, -0.37, WOOD, { r: 0.05 }); k.box(0.74, 0.05, 0.06, 0, 1.0, -0.37, WOOD2, { r: 0.02 }); // top rail
  });
  add('desk', 'Study desk', 'furn', 400, [3, 2], 'floor', k => {
    const W = '#f4efe8', B = '#9fd3f0';
    k.box(2.9, 0.1, 1.7, 0, 1.4, 0, W, { r: 0.04 }); k.box(2.84, 0.05, 1.64, 0, 1.36, 0, shade(W, -0.08), { r: 0.02 });
    k.box(0.9, 1.34, 1.6, 0.95, 0.02, 0, B, { r: 0.04 }); for (const [i, y] of [0.1, 0.55, 0.95].entries()) drawerFront(k, 0.8, i === 2 ? 0.34 : 0.4, 0.95, y, 0.8, shade(B, 0.12), 1); // the drawer pedestal
    k.box(0.08, 1.36, 1.5, -1.36, 0, 0, W, { r: 0.03 }); k.box(0.1, 0.06, 1.5, -1.36, 0, 0, shade(W, -0.1), { r: 0.02 }); // the end panel and its foot
    k.box(2.2, 0.6, 0.04, -0.25, 0.75, -0.76, shade(W, -0.05), { r: 0.02 }); // a modesty panel at the back
    k.cyl(0.05, 0.02, -1.1, 1.5, -0.6, '#3d3d4a', { n: 12 }); // cable hole
  }, { surf: 1.5 });
  add('deskchair', 'Spinny chair', 'furn', 220, [1, 1], 'floor', k => {
    const c = '#ff7f9f', d = shade(c, -0.2);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.box(0.07, 0.06, 0.4, Math.sin(a) * 0.19, 0.1, Math.cos(a) * 0.19, '#4a4a5a', { ry: a, r: 0.02 }); k.ball(0.055, Math.sin(a) * 0.38, 0.055, Math.cos(a) * 0.38, '#2f2f3d', { n: 10 }); k.cyl(0.02, 0.05, Math.sin(a) * 0.38, 0.08, Math.cos(a) * 0.38, '#2f2f3d', { n: 6 }); } // star base on casters
    k.cyl(0.08, 0.12, 0, 0.1, 0, '#3d3d4a', { n: 12 }); k.cyl(0.035, 0.6, 0, 0.2, 0, '#c0c8d4', { n: 10 }); k.cyl(0.06, 0.25, 0, 0.22, 0, '#3d3d4a', { rt: 0.05, n: 10 }); // gas lift
    k.box(0.5, 0.06, 0.45, 0, 0.78, 0, '#3d3d4a', { r: 0.02 }); k.box(0.84, 0.17, 0.78, 0, 0.82, 0.02, c, { r: 0.08, seg: 3 }); k.box(0.7, 0.03, 0.03, 0, 0.94, 0.4, d, { r: 0.012 });
    k.box(0.1, 0.35, 0.06, 0, 0.8, -0.35, '#3d3d4a', { r: 0.02 }); k.box(0.76, 0.82, 0.14, 0, 1.08, -0.4, c, { r: 0.1, seg: 3, rx: -0.12 }); k.box(0.6, 0.16, 0.06, 0, 1.18, -0.33, d, { r: 0.05, rx: -0.12 }); // backrest, lumbar pad
    for (const sd of [-1, 1]) { k.box(0.05, 0.28, 0.05, sd * 0.4, 0.86, 0.02, '#3d3d4a', { r: 0.02 }); k.box(0.1, 0.06, 0.4, sd * 0.4, 1.12, 0.04, '#3d3d4a', { r: 0.03 }); } // armrests
  });
  add('bookcase', 'Bookcase', 'furn', 500, [2, 1], 'floor', k => {
    const c = '#e8d1b0', d = shade(c, -0.1);
    k.box(1.9, 3.5, 0.06, 0, 0.1, -0.42, shade(c, -0.16), { r: 0.02 }); // back
    for (const x of [-0.92, 0.92]) k.box(0.1, 3.5, 0.9, x, 0.1, 0, c, { r: 0.03 }); // sides
    k.box(1.96, 0.14, 0.92, 0, 0, 0.02, d, { r: 0.03 }); k.box(2.02, 0.1, 0.98, 0, 3.52, 0.02, d, { r: 0.04 }); k.box(1.9, 0.06, 0.94, 0, 3.46, 0.02, c, { r: 0.02 }); // plinth and crown
    for (const y of [0.14, 1.0, 1.86, 2.72]) k.box(1.76, 0.08, 0.84, 0, y, 0, c, { r: 0.02 });
    for (const [i, y] of [0.22, 1.08, 1.94].entries()) books(k, -0.82, i === 1 ? 0.3 : 0.82, y, -0.05, 0.6, 11 + i);
    k.box(0.4, 0.5, 0.06, 0.55, 1.1, -0.1, '#e86f6f', { r: 0.02, rz: 0.35 }); k.box(0.06, 0.32, 0.22, 0.82, 1.08, -0.05, '#9a9aa8', { r: 0.01 }); // a leaning book, a bookend
    books(k, -0.82, 0.1, 2.8, -0.05, 0.6, 31); k.cyl(0.15, 0.2, 0.5, 2.8, 0, '#e86f6f', { rt: 0.17, n: 12 }); k.ball(0.2, 0.5, 3.12, 0, '#7cc8a4', { n: 12 }); for (let i = 0; i < 4; i++) k.ball(0.09, 0.5 + Math.cos(i * 1.6) * 0.16, 3.1 + (i % 2) * 0.08, Math.sin(i * 1.6) * 0.16, '#5cbf5a', { n: 8 }); // a little plant
    k.box(0.32, 0.38, 0.04, 0.55, 1.94, -0.2, '#f2c14e', { r: 0.02, rx: -0.15 }); k.box(0.24, 0.3, 0.02, 0.55, 1.98, -0.17, '#9fd3f0', { r: 0.01, rx: -0.15 }); // a photo frame
  }, { surf: 3.6, blurb: 'Full of books, with room on top.' });
  add('drawers', 'Chest of drawers', 'furn', 300, [2, 1], 'floor', k => {
    const c = '#ffd6a5';
    k.box(1.84, 1.56, 0.86, 0, 0.18, -0.02, c, { r: 0.04 }); k.box(1.96, 0.1, 0.94, 0, 1.72, 0, shade(c, -0.06), { r: 0.04 }); k.box(1.88, 0.1, 0.9, 0, 0.12, 0, shade(c, -0.12), { r: 0.03 }); // carcass, top and plinth
    for (const x of [-0.82, 0.82]) for (const z of [-0.36, 0.36]) k.cyl(0.05, 0.12, x, 0, z, WOOD2, { rt: 0.06, n: 8 });
    for (const y of [0.26, 0.74, 1.22]) drawerFront(k, 1.68, 0.42, 0, y, 0.42, shade(c, 0.06), 2);
  }, { surf: 1.82 });
  add('nightstand', 'Bedside table', 'furn', 150, [1, 1], 'floor', k => {
    const c = '#f6e2c8';
    for (const x of [-0.34, 0.34]) for (const z of [-0.34, 0.34]) tleg(k, x, z, 0.24, WOOD2, 0.05);
    k.box(0.8, 0.72, 0.78, 0, 0.24, -0.02, c, { r: 0.04 }); k.box(0.9, 0.08, 0.86, 0, 0.98, 0, shade(c, -0.08), { r: 0.03 }); // body and top
    drawerFront(k, 0.7, 0.3, 0, 0.64, 0.38, shade(c, 0.05), 1);
    k.box(0.68, 0.3, 0.7, 0, 0.3, 0, shade(c, -0.25), { r: 0.02 }); k.box(0.3, 0.06, 0.4, -0.1, 0.32, 0.05, '#6fa8e8', { r: 0.01 }); // an open shelf with a book
  }, { surf: 1.1 });
  add('wardrobe', 'Wardrobe', 'furn', 550, [2, 1], 'floor', k => {
    const c = '#c6e3f7', d = shade(c, -0.12);
    k.box(1.9, 3.5, 0.9, 0, 0.2, -0.02, c, { r: 0.05 }); k.box(2.04, 0.12, 1.0, 0, 3.7, 0, d, { r: 0.04 }); k.box(1.96, 0.08, 0.96, 0, 3.64, 0, c, { r: 0.03 }); k.box(1.96, 0.2, 0.94, 0, 0, 0, d, { r: 0.03 }); // carcass, crown, plinth
    for (const x of [-0.475, 0.475]) {
      k.box(0.92, 3.36, 0.05, x, 0.26, 0.44, shade(c, 0.08), { r: 0.03 }); // door
      for (const [y, h] of [[0.45, 1.3], [1.95, 1.45]]) k.box(0.7, h, 0.03, x, y, 0.47, shade(c, 0.14), { r: 0.03 }); // raised panels
      k.box(0.04, 0.42, 0.05, x - Math.sign(x) * 0.4, 1.72, 0.49, '#c9a24a', { r: 0.02 }); // handles by the middle
    }
  });
  add('coffeetable', 'Coffee table', 'furn', 250, [2, 2], 'floor', k => {
    k.cyl(0.95, 0.1, 0, 0.66, 0, WOOD, { n: 32 }); k.torus(0.95, 0.04, 0, 0.71, 0, shade(WOOD, -0.08), { rx: Math.PI / 2 }); // top with a rounded edge
    k.cyl(0.78, 0.05, 0, 0.26, 0, WOOD2, { n: 28 });
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.5; k.cyl(0.045, 0.7, Math.cos(a) * 0.66, 0, Math.sin(a) * 0.66, WOOD2, { rt: 0.07, n: 8, rz: -Math.cos(a) * 0.12, rx: Math.sin(a) * 0.12 }); }
    k.box(0.5, 0.06, 0.36, 0.35, 0.31, 0.1, '#e86f6f', { r: 0.01, ry: 0.3 }); k.box(0.46, 0.05, 0.34, 0.36, 0.37, 0.12, '#6fa8e8', { r: 0.01, ry: 0.2 }); // books on the shelf
  }, { surf: 0.76 });
  // Cupboards and fridges have real doors: each is its own part with its hinge at the part's origin, so the home can
  // swing it open (door0, door1, … turn about y). The fridge has shelves inside that the food sits on.
  const cupboardDoors = (k, sub, col, xs, w, h, y, z) => xs.forEach((x, i) => sub('door' + i, kk => { kk.box(w, h, 0.06, w / 2, 0, 0.03, col, { r: 0.03 }); kk.box(0.06, 0.3, 0.05, w - 0.12, h - 0.45, 0.08, '#9a9aa8', { r: 0.02 }); }, x - w / 2, y, z));
  const kitchenBench = (col, top) => (k, sub) => {
    k.box(2.95, 1.6, 0.92, 0, 0.08, 0, col, { r: 0.05 }); k.box(3.0, 0.14, 1.0, 0, 1.66, 0, top, { r: 0.04 });
    k.box(2.8, 1.3, 0.04, 0, 0.2, 0.42, shade(col, -0.25), { r: 0.02 }); for (const y of [0.65, 1.1]) k.box(2.8, 0.05, 0.4, 0, y, 0.2, shade(col, -0.1), { r: 0.01 }); // inside: dark back, two shelves
    cupboardDoors(k, sub, shade(col, 0.12), [-1, 0, 1], 0.9, 1.3, 0.2, 0.44);
    k.box(0.8, 0.1, 0.6, 0.75, 1.75, 0, '#cfd6e0', { r: 0.04 }); k.cyl(0.04, 0.5, 0.75, 1.8, -0.35, '#c0c8d4', { n: 8 }); k.box(0.06, 0.06, 0.3, 0.75, 2.26, -0.22, '#c0c8d4', { r: 0.02 });
  };
  add('kitchen', 'Kitchen bench', 'kitchen', 600, [3, 1], 'floor', kitchenBench('#bfe3c8', '#f6f1ea'), { surf: 1.8, where: 'in', store: true, blurb: 'Cupboards underneath and a sink on top.' });
  add('kitchen2', 'Chef’s bench', 'kitchen', 1400, [3, 1], 'floor', kitchenBench('#3d4a5a', '#ffffff'), { surf: 1.8, where: 'in', store: true, up: 'kitchen', earn: 4000, blurb: 'A smart dark bench with a stone top. It takes the place of your kitchen bench.' });
  const fridge = (col, big) => (k, sub) => {
    const w = big ? 1.9 : 1.6;
    k.box(w, 3.5, 0.9, 0, 0.08, -0.05, col, { r: 0.12, seg: 2 }); k.box(w - 0.16, 3.3, 0.04, 0, 0.18, 0.39, '#f4fbff', { r: 0.02 }); // the body and the lit inside
    for (const y of [0.9, 1.75, 2.6]) k.box(w - 0.2, 0.05, 0.75, 0, y, 0, '#dcecf8', { r: 0.01 }); // shelves
    sub('door0', kk => { kk.box(w, 3.48, 0.12, w / 2, 0, 0.06, col, { r: 0.1, seg: 2 }); for (const [y, h] of [[1.2, 0.6], [2.6, 0.5]]) kk.box(0.1, h, 0.1, 0.18, y, 0.16, '#f4f1e8', { r: 0.04 }); kk.box(0.36, 0.36, 0.04, w * 0.65, 1.5, 0.13, '#ffe08a', { r: 0.03 }); kk.box(0.3, 0.42, 0.04, w * 0.42, 1.3, 0.13, '#9fd3f0', { r: 0.03, rz: 0.1 }); for (const y of [0.6, 1.5, 2.4]) kk.box(w - 0.3, 0.2, 0.12, w / 2, y, -0.08, shade(col, 0.1), { r: 0.03 }); }, -w / 2, 0.09, 0.4);
  };
  add('fridge', 'Fridge', 'kitchen', 650, [2, 1], 'floor', fridge('#ffb8c8'), { where: 'in', store: true, cold: true });
  add('fridge2', 'Big fridge', 'kitchen', 1300, [2, 1], 'floor', fridge('#cfd6e0', true), { where: 'in', store: true, cold: true, up: 'fridge', earn: 3000, blurb: 'A tall steel fridge with room for more. It takes the place of your fridge.' });
  add('pantry', 'Pantry', 'kitchen', 450, [2, 1], 'floor', (k, sub) => {
    k.box(1.8, 3.2, 0.9, 0, 0.08, -0.05, '#f2e2c4', { r: 0.06 }); k.box(1.64, 3.0, 0.04, 0, 0.18, 0.39, '#7d5236', { r: 0.02 });
    for (const y of [0.9, 1.75, 2.6]) { k.box(1.6, 0.06, 0.7, 0, y, 0, '#c99a64', { r: 0.01 }); for (let i = 0; i < 4; i++) k.cyl(0.11, 0.3, -0.6 + i * 0.4, y + 0.06, -0.1, ['#ffcf5a', '#e86f6f', '#b59cff', '#7cc8a4'][(i + y * 3 | 0) % 4], { n: 10 }); }
    cupboardDoors(k, sub, '#f6ead6', [-0.45, 0.45], 0.88, 3.0, 0.18, 0.42);
  }, { where: 'in', store: true, blurb: 'Shelves of jars for the dry food.' });
  add('stool', 'Step stool', 'kitchen', 120, [1, 1], 'floor', k => {
    const c = '#ffcf5a', d = '#f2b43a';
    k.box(0.7, 0.1, 0.55, 0, 0.62, 0, c, { r: 0.04 }); for (let i = 0; i < 4; i++) k.box(0.6, 0.012, 0.04, 0, 0.72, -0.18 + i * 0.12, '#e0a83a', { r: 0.005 }); // top step with grip strips
    k.box(0.62, 0.08, 0.3, 0, 0.3, 0.2, c, { r: 0.03 }); for (let i = 0; i < 2; i++) k.box(0.54, 0.012, 0.04, 0, 0.38, 0.13 + i * 0.12, '#e0a83a', { r: 0.005 }); // lower step
    for (const sx of [-1, 1]) { k.box(0.08, 0.72, 0.6, sx * 0.3, 0, 0, d, { r: 0.03 }); k.box(0.1, 0.18, 0.16, sx * 0.3, 0.42, -0.08, W, { r: 0.06 }); k.box(0.1, 0.04, 0.62, sx * 0.3, 0, 0, '#5b5b6b', { r: 0.02 }); } // sides with hand holes and rubber feet
    k.box(0.5, 0.06, 0.06, 0, 0.06, -0.24, d, { r: 0.02 }); // brace
  }, { grips: { L: [0.33, 0.5, 0], R: [-0.33, 0.5, 0] },  surf: 0.72, blurb: 'For reaching the bench and high cupboards.' });
  add('stove', 'Stove', 'kitchen', 500, [2, 1], 'floor', k => {
    const c = '#f6f1ea', st = '#c0c8d4';
    k.box(1.6, 1.62, 0.92, 0, 0.08, 0, c, { r: 0.06 }); k.box(1.6, 0.08, 0.86, 0, 0, -0.02, '#5b5b6b', { r: 0.02 }); // body and kick plate
    k.box(1.3, 0.8, 0.06, 0, 0.35, 0.46, '#4a4a5a', { r: 0.04 }); k.box(1.0, 0.5, 0.02, 0, 0.5, 0.49, '#2d2a3a', { r: 0.03 }); k.box(0.7, 0.04, 0.03, 0, 0.62, 0.5, '#ffb46a', { r: 0.01, emit: 0.4 }); // oven door, window and a glow inside
    k.cyl(0.03, 1.0, 0, 0.75, 0.54, st, { rz: Math.PI / 2, n: 8 }); for (const x of [-0.45, 0.45]) k.box(0.04, 0.08, 0.08, x, 1.21, 0.5, st, { r: 0.01 }); // round bar handle on stand-offs
    k.box(1.56, 0.12, 0.04, 0, 1.44, 0.46, shade(c, -0.05), { r: 0.02 }); for (const x of [-0.6, -0.3, 0.3, 0.6]) { k.cyl(0.055, 0.05, x, 1.48, 0.48, st, { rx: Math.PI / 2, n: 12 }); k.box(0.015, 0.06, 0.02, x, 1.48, 0.53, '#4a4a5a', { r: 0.004 }); } // knob panel and dials
    k.box(0.16, 0.06, 0.02, 0, 1.47, 0.49, '#2d2a3a', { r: 0.01 }); k.box(0.12, 0.03, 0.01, 0, 1.485, 0.5, '#7ef0b0', { r: 0.005, emit: 0.8 }); // a little clock
    k.box(1.56, 0.03, 0.88, 0, 1.7, 0, '#2d2a3a', { r: 0.02 }); // glass top
    for (const x of [-0.4, 0.4]) for (const z of [-0.2, 0.2]) { k.cyl(0.17, 0.04, x, 1.7, z, '#333344', { n: 14 }); k.torus(0.12, 0.01, x, 1.745, z, '#6a5a6a', { rx: Math.PI / 2 }); k.torus(0.06, 0.01, x, 1.745, z, '#6a5a6a', { rx: Math.PI / 2 }); } // burners with rings
    k.box(1.6, 0.36, 0.08, 0, 1.72, -0.42, c, { r: 0.03 }); // splash back
    k.cyl(0.25, 0.4, -0.4, 1.74, -0.2, '#e86f6f', { n: 16 }); k.cyl(0.26, 0.04, -0.4, 2.14, -0.2, '#f08a8a', { n: 16 }); k.ball(0.04, -0.4, 2.2, -0.2, '#4a4a5a', { n: 8 }); for (const x of [-0.68, -0.12]) k.box(0.1, 0.05, 0.06, x, 2.0, -0.2, '#c95a5a', { r: 0.02 }); // a pot with its lid and handles
    k.cyl(0.2, 0.06, 0.4, 1.74, 0.2, '#3d4a5a', { n: 16 }); k.box(0.36, 0.04, 0.06, 0.66, 1.77, 0.32, '#3d4a5a', { r: 0.02, ry: -0.5 }); // a frying pan
  }, { grips: { R: [0.3, 1.48, 0.55] },  where: 'in' });
  // ---------- Bathroom
  const bath = (col, spa) => (k, sub) => {
    k.lathe([[0.001, 0.1], [0.85, 0.1], [0.95, 0.9], [0.8, 0.95], [0.75, 0.22], [0.001, 0.2]], 0, 0, 0, col, { n: 24, s: [1, 1, 1.9] });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.ball(0.1, sx * 0.6, 0.06, sz * 1.4, '#f2c14e', { n: 8 });
    k.cyl(0.05, 0.4, 0, 0.85, -1.65, '#c0c8d4', { n: 8 }); k.box(0.08, 0.08, 0.3, 0, 1.2, -1.55, '#c0c8d4', { r: 0.02 });
    sub('water', kk => kk.special(new T.CylinderGeometry(0.72, 0.72, 0.04, 20).scale(1, 1, 1.85), 'water', new T.Matrix4(), { a: 0.6, tint: spa ? '#7fd8e8' : '#9fdcf5' }), 0, 0.62, 0);
    if (spa) for (let i = 0; i < 7; i++) k.ball(0.08 + (i % 3) * 0.03, Math.sin(i * 2.1) * 0.45, 0.68, Math.cos(i * 1.7) * 1.1, '#ffffff', { n: 8 });
  };
  add('bath', 'Bath', 'bath', 600, [2, 4], 'floor', bath('#ffffff'), { where: 'in', blurb: 'A deep bath for bubbly soaks.' });
  add('bath2', 'Spa bath', 'bath', 1500, [2, 4], 'floor', bath('#e8f6ff', true), { where: 'in', up: 'bath', earn: 6000, blurb: 'Bubbles that never stop. It takes the place of your bath.' });
  add('basin', 'Basin', 'bath', 250, [1, 1], 'floor', k => {
    k.cyl(0.14, 1.2, 0, 0, -0.05, '#ffffff', { rt: 0.1, n: 12 }); k.lathe([[0.001, 0], [0.38, 0.05], [0.42, 0.22], [0.36, 0.24], [0.001, 0.1]], 0, 1.2, 0, '#ffffff', { n: 18 });
    k.cyl(0.03, 0.3, 0, 1.4, -0.28, '#c0c8d4', { n: 6 }); k.box(0.05, 0.05, 0.18, 0, 1.68, -0.2, '#c0c8d4', { r: 0.02 });
    k.cyl(0.04, 0.16, 0.25, 1.42, -0.25, '#7cc8a4', { n: 6 }); k.cyl(0.03, 0.2, 0.32, 1.42, -0.25, '#ff9fb7', { n: 6 }); // toothbrushes
  }, { grips: { R: [0, 1.62, -0.12] },  where: 'in', blurb: 'For washing hands and brushing teeth.' });
  add('toilet', 'Toilet', 'bath', 200, [1, 1], 'floor', k => {
    k.lathe([[0.001, 0], [0.22, 0], [0.26, 0.5], [0.36, 0.78], [0.001, 0.78]], 0, 0, 0.05, '#ffffff', { n: 16, s: [1, 1, 1.3] });
    k.box(0.7, 0.75, 0.3, 0, 0.75, -0.32, '#ffffff', { r: 0.08 }); k.ball(0.38, 0, 0.8, 0.05, '#f4f8ff', { s: [1, 0.12, 1.3], n: 14 });
  }, { where: 'in' });
  add('shower', 'Shower', 'bath', 900, [2, 2], 'floor', k => {
    k.box(1.9, 0.12, 1.9, 0, 0, 0, '#e8f2f8', { r: 0.04 });
    for (const [w, d, x, z] of [[1.9, 0.04, 0, 0.93], [0.04, 1.9, 0.93, 0]]) k.glassBox(w, 3.4, d, x, 0.12, z, { a: 0.12, tint: '#b9d6e6' });
    k.cyl(0.04, 3.2, -0.8, 0.12, -0.8, '#c0c8d4', { n: 8 }); k.box(0.38, 0.04, 0.04, -0.675, 3.26, -0.675, '#c0c8d4', { r: 0.015, ry: -Math.PI / 4 }); k.cyl(0.18, 0.06, -0.55, 3.2, -0.55, '#c0c8d4', { n: 12 }); // arm and rain head
  }, { where: 'in', earn: 2500, blurb: 'A rain shower behind glass.' });
  add('towels', 'Towel rail', 'bath', 120, [1, 1], 'wall', k => { k.box(0.9, 0.06, 0.06, 0, 1.6, 0.08, '#c0c8d4', { r: 0.02 }); k.box(0.7, 0.9, 0.06, -0.05, 0.8, 0.12, '#7cc8a4', { r: 0.04 }); k.box(0.5, 0.7, 0.06, 0.15, 0.95, 0.16, '#ffb4c7', { r: 0.04 }); }, { wy: 1.2, h: 1.8 });
  add('bathmat', 'Bath mat', 'bath', 80, [2, 1], 'rug', k => { k.box(1.6, 0.04, 0.8, 0, 0, 0, '#9fd3f0', { r: 0.12 }); for (let i = 0; i < 5; i++) k.ball(0.06, -0.6 + i * 0.3, 0.04, 0, '#ffffff', { s: [1, 0.3, 1], n: 6 }); });

  add('tv', 'TV and games', 'fun', 700, [3, 1], 'floor', (k, sub) => {
    k.box(2.9, 0.75, 0.9, 0, 0.1, 0, '#f4efe8', { r: 0.06 }); legs(k, 2.8, 0.8, 0.12, WOOD2, 0.12, 0.05);
    for (const x of [-0.7, 0.7]) k.box(1.3, 0.45, 0.05, x, 0.25, 0.45, '#ffe4c2', { r: 0.03 });
    k.box(0.2, 0.5, 0.3, 0, 0.85, 0, '#4a4a5a', { r: 0.04 }); k.box(2.3, 1.4, 0.12, 0, 1.25, -0.05, '#2f2f3d', { r: 0.06 });
    k.box(0.55, 0.12, 0.4, 0.95, 0.85, 0.15, '#ffffff', { r: 0.04 }); k.box(0.3, 0.1, 0.18, -0.9, 0.85, 0.25, '#6fa8e8', { r: 0.05 });
    sub('screen', kk => { kk.box(2.1, 1.22, 0.04, 0, 0, 0, '#1d2333', { r: 0.01, emit: 0 }); }, 0, 1.34, 0.02);
  }, { act: 'tv', where: 'in', blurb: 'Tap it to switch it on.' });

  // ---------- Rugs
  add('rug_round', 'Round rug', 'rugs', 200, [3, 3], 'rug', k => { k.cyl(1.45, 0.04, 0, 0, 0, '#ffd1dc', { n: 32 }); k.cyl(1.1, 0.05, 0, 0, 0, '#ffb0c4', { n: 32 }); k.cyl(0.6, 0.06, 0, 0, 0, '#ffe5ec', { n: 28 }); });
  add('rug_rainbow', 'Rainbow rug', 'rugs', 300, [4, 3], 'rug', k => { const C = ['#ff8a8a', '#ffb36b', '#ffe07a', '#9be38f', '#8fc9ff', '#c3a2ff']; k.box(3.9, 0.04, 2.9, 0, 0, 0, '#fff6ec', { r: 0.3, seg: 2 }); C.forEach((c, i) => k.box(3.5, 0.05, 0.38, 0, 0, -1.08 + i * 0.43, c, { r: 0.05 })); });
  add('rug_stars', 'Starry rug', 'rugs', 250, [3, 2], 'rug', k => {
    k.box(2.9, 0.04, 1.9, 0, 0, 0, '#3e4d8f', { r: 0.2, seg: 2 });
    const star = [], R0 = 0.24; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? R0 * 0.45 : R0; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
    for (const [x, z, s] of [[-0.9, -0.4, 1], [0.3, 0.3, 1.3], [1.0, -0.5, 0.8], [-0.4, 0.55, 0.7]]) k.at(x, 0.04, z, s, kk => kk.shape(star.map(p => [p[0] * s, p[1] * s]), 0.03, 0, 0, 0, '#ffe07a'));
  });
  add('picnic', 'Picnic blanket', 'garden', 200, [3, 3], 'rug', k => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) k.box(0.7, 0.04, 0.7, -1.05 + i * 0.7, 0, -1.05 + j * 0.7, (i + j) % 2 ? '#ff7a7a' : '#ffffff', { r: 0.02 }); }, { where: 'out' });

  // ---------- Lights
  add('floorlamp', 'Floor lamp', 'lights', 300, [1, 1], 'floor', k => {
    k.cyl(0.32, 0.08, 0, 0, 0, '#4a4a5a', { n: 18 }); k.cyl(0.04, 2.6, 0, 0.08, 0, '#9a9aa8', { n: 8 });
    k.lathe([[0.22, 0], [0.42, 0], [0.26, 0.6], [0.14, 0.6]], 0, 2.4, 0, '#ffe7b3', { n: 20, emit: 1 });
  }, { act: 'lamp', light: [0, 2.6, 0], glowCol: '#ffd88a' });
  add('desklamp', 'Desk lamp', 'lights', 180, [1, 1], 'small', k => {
    k.cyl(0.2, 0.06, 0, 0, 0, '#6fa8e8', { n: 14 }); k.cyl(0.03, 0.55, 0, 0.06, 0, '#6fa8e8', { rz: 0.35, n: 6 }); k.cyl(0.03, 0.45, -0.18, 0.56, 0, '#6fa8e8', { rz: -0.9, n: 6 });
    k.lathe([[0.05, 0], [0.12, 0.05], [0.2, 0.28], [0.001, 0.3]], 0.2, 0.62, 0, '#6fa8e8', { rz: 2.6, n: 14 }); k.ball(0.07, 0.17, 0.62, 0, '#fff4c4', { n: 8, emit: 1.2 });
  }, { act: 'lamp', light: [0.2, 0.5, 0], glowCol: '#fff0b0' });
  add('lavalamp', 'Lava lamp', 'lights', 220, [1, 1], 'small', (k, sub) => {
    k.lathe([[0.001, 0], [0.16, 0], [0.08, 0.22], [0.001, 0.22]], 0, 0, 0, '#9b6bd6', { n: 14 }); k.lathe([[0.08, 0], [0.14, 0.35], [0.06, 0.7], [0.001, 0.7]], 0, 0.22, 0, '#ffb3e6', { n: 14, emit: 0.7 });
    k.lathe([[0.001, 0], [0.07, 0], [0.04, 0.12], [0.001, 0.12]], 0, 0.9, 0, '#9b6bd6', { n: 12 });
    sub('blobs', kk => { kk.ball(0.05, 0, 0, 0, '#ff5fae', { n: 8, emit: 1 }); kk.ball(0.04, 0.02, 0.2, 0, '#ff5fae', { n: 8, emit: 1 }); }, 0, 0.4, 0);
  }, { act: 'lamp', light: [0, 0.6, 0], glowCol: '#ff8fd0' });
  add('fairy', 'Fairy lights', 'lights', 250, [3, 1], 'wall', k => {
    let px = -1.5, py = 0.6; for (let i = 0; i <= 12; i++) { const x = -1.5 + i * 0.25, y = 0.6 - Math.sin(i / 12 * Math.PI * 2) * 0.12 - Math.abs(Math.sin(i / 12 * Math.PI)) * 0.25; if (i) k.cyl(0.012, Math.hypot(x - px, y - py), (x + px) / 2, (y + py) / 2 - Math.hypot(x - px, y - py) / 2, 0.06, '#4a6a4a', { n: 4, rz: Math.atan2(x - px, -(y - py)) }); k.ball(0.06, x, y - 0.06, 0.08, ['#ffe07a', '#ff9fb7', '#8fd0ff', '#9be38f'][i % 4], { n: 8, emit: 1.4 }); px = x; py = y; }
  }, { act: 'lamp', wy: 3.0, h: 0.8, glowCol: '#fff0b0', light: [0, 0.4, 0.4] });
  add('nightlight', 'Star night-light', 'lights', 150, [1, 1], 'small', k => {
    const star = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.12 : 0.28; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
    k.box(0.4, 0.08, 0.3, 0, 0, 0, '#c3a2ff', { r: 0.03 }); k.at(0, 0.36, -0.05, 0, kk => kk.shape(star, 0.12, 0, 0, 0, '#ffe07a', { emit: 1.2 }), Math.PI / 2);
  }, { act: 'lamp', light: [0, 0.4, 0.1], glowCol: '#ffe07a' });
  add('lamppost', 'Garden lamp', 'garden', 300, [1, 1], 'floor', k => {
    k.cyl(0.18, 0.2, 0, 0, 0, '#3d4a5a', { n: 10 }); k.cyl(0.06, 2.4, 0, 0.2, 0, '#3d4a5a', { n: 8 });
    k.box(0.42, 0.5, 0.42, 0, 2.5, 0, '#fff1c4', { r: 0.05, emit: 1 }); k.cone(0.36, 0.3, 0, 3.0, 0, '#3d4a5a', { n: 4, ry: Math.PI / 4 });
  }, { act: 'lamp', light: [0, 2.7, 0], glowCol: '#ffd88a', where: 'out' });

  // ---------- Plants
  add('monstera', 'Big leafy plant', 'plants', 220, [1, 1], 'floor', k => {
    k.lathe([[0.001, 0], [0.24, 0], [0.32, 0.5], [0.35, 0.56], [0.33, 0.58], [0.001, 0.52]], 0, 0, 0, '#f4efe8', { n: 20 }); k.cyl(0.3, 0.04, 0, 0.5, 0, '#6b4a33', { n: 18 }); // a white pot with soil
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3, hgt = 0.95 + (i % 3) * 0.3, r0 = 0.3 + (i % 2) * 0.12, lx = Math.cos(a) * r0, lz = Math.sin(a) * r0;
      k.cyl(0.02, hgt - 0.5, lx * 0.4, 0.52, lz * 0.4, '#4a9a52', { n: 5, rz: -Math.cos(a) * 0.32, rx: Math.sin(a) * 0.32 }); // stem
      k.at(lx, hgt, lz, -a + Math.PI / 2, kk => { kk.ball(0.26, 0, 0, 0.1, '#3f9e4a', { s: [1, 0.06, 1.25], n: 12 }); for (const sd of [-1, 1]) for (let j = 0; j < 3; j++) kk.box(0.1, 0.02, 0.02, sd * 0.16, 0.012, -0.08 + j * 0.12, '#f4efe8', { r: 0.005, ry: sd * 0.5 }); kk.box(0.01, 0.02, 0.5, 0, 0.014, 0.1, '#7ac06e', { r: 0.004 }); }, -0.5 - (i % 2) * 0.25); // a split leaf with a midrib
    }
  });
  add('cactus', 'Cactus', 'plants', 100, [1, 1], 'small', k => {
    pot(k, 0.18, 0.28, '#e86f6f'); k.cyl(0.17, 0.03, 0, 0.12, 0, '#f08a8a', { n: 16 }); k.cyl(0.15, 0.02, 0, 0.24, 0, '#d9c49a', { n: 14 }); // pot band and gravel
    const g = '#5bb36a', gd = shade(g, -0.18);
    k.pill(0.1, 0.35, 0, 0.24, 0, g, { n: 12 }); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.box(0.012, 0.42, 0.012, Math.cos(a) * 0.098, 0.28, Math.sin(a) * 0.098, gd, { r: 0.005 }); } // ribbed stem
    k.at(0.1, 0.42, 0, 0, kk => { kk.pill(0.045, 0.06, 0, 0, 0, g, { n: 10, rz: -1.4 }); kk.pill(0.045, 0.12, 0.1, 0.02, 0, g, { n: 10 }); }); // a bent arm
    k.at(-0.09, 0.5, 0.02, 0, kk => { kk.pill(0.04, 0.04, 0, 0, 0, g, { n: 10, rz: 1.4 }); kk.pill(0.04, 0.08, -0.08, 0.02, 0, g, { n: 10 }); });
    for (let i = 0; i < 14; i++) { const a = i * 2.4, y = 0.32 + (i % 7) * 0.06; k.box(0.004, 0.004, 0.035, Math.cos(a) * 0.1, y, Math.sin(a) * 0.1, '#fff6d8', { r: 0.001, ry: -a }); } // spines
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.ball(0.035, Math.cos(a) * 0.035, 0.81, Math.sin(a) * 0.035, '#ff9fb7', { s: [1, 0.6, 1], n: 8 }); } k.ball(0.025, 0, 0.83, 0, '#ffe07a', { n: 6 }); // a flower on top
  });
  add('fern', 'Fern', 'plants', 180, [1, 1], 'floor', k => {
    k.lathe([[0.001, 0], [0.2, 0], [0.28, 0.48], [0.3, 0.52], [0.001, 0.5]], 0, 0, 0, '#9fd3f0', { n: 18 }); k.cyl(0.26, 0.03, 0, 0.47, 0, '#6b4a33', { n: 16 }); k.torus(0.29, 0.02, 0, 0.5, 0, shade('#9fd3f0', -0.15), { rx: Math.PI / 2 });
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, up = -0.45 - (i % 3) * 0.2;
      k.at(Math.cos(a) * 0.08, 0.55, Math.sin(a) * 0.08, -a + Math.PI / 2, kk => { kk.cyl(0.012, 0.75, 0, 0, 0.35, '#4a9a52', { rx: Math.PI / 2, n: 4 }); for (let j = 0; j < 7; j++) for (const sd of [-1, 1]) kk.ball(0.09 - j * 0.008, sd * (0.09 - j * 0.008) * 0.75, 0, 0.08 + j * 0.1, i % 2 ? '#5cbf5a' : '#6fd06a', { s: [1, 0.12, 0.45], n: 6, ry: sd * 0.6 }); }, up); // fronds with leaflets
    }
  });
  add('bonsai', 'Little tree', 'plants', 260, [1, 1], 'small', k => {
    k.box(0.5, 0.14, 0.35, 0, 0.02, 0, '#7b5aa6', { r: 0.04 }); for (const x of [-0.19, 0.19]) for (const z of [-0.12, 0.12]) k.box(0.06, 0.03, 0.06, x, 0, z, '#5e4485', { r: 0.01 }); k.box(0.44, 0.02, 0.29, 0, 0.15, 0, '#6b5a3a', { r: 0.01 }); // tray with feet and soil
    k.ball(0.07, 0.12, 0.17, 0.05, '#9fbf8a', { s: [1, 0.4, 1], n: 8 }); k.ball(0.04, -0.15, 0.17, -0.06, '#a8a8b0', { s: [1, 0.6, 1], n: 6 }); // moss and a pebble
    const b = '#7b4f30'; k.cyl(0.05, 0.3, 0, 0.14, 0, b, { rt: 0.035, rz: 0.3, n: 8 }); k.cyl(0.035, 0.22, -0.08, 0.38, 0, b, { rt: 0.02, rz: -0.8, n: 6 }); k.cyl(0.03, 0.18, 0.06, 0.38, 0, b, { rt: 0.018, rz: 0.6, n: 6 }); // twisty trunk and branches
    for (const [x, y, z, r, c] of [[-0.2, 0.56, 0, 0.15, '#5fbf5a'], [-0.08, 0.6, 0.06, 0.1, '#74cd66'], [0.14, 0.5, 0.02, 0.13, '#5fbf5a'], [0.2, 0.55, -0.04, 0.08, '#74cd66'], [-0.02, 0.68, -0.03, 0.09, '#4fae4f']]) { k.ball(r, x, y, z, c, { s: [1.2, 0.55, 1], n: 12 }); k.ball(r * 0.6, x - r * 0.3, y + r * 0.25, z + r * 0.3, shade(c, 0.18), { s: [1.2, 0.5, 1], n: 8 }); } // layered leaf pads with lighter tops
  });
  add('vase', 'Flowers', 'plants', 120, [1, 1], 'small', k => {
    k.lathe([[0.001, 0], [0.1, 0], [0.12, 0.02], [0.16, 0.18], [0.12, 0.3], [0.07, 0.34], [0.09, 0.4], [0.075, 0.4], [0.001, 0.36]], 0, 0, 0, '#8fc9ff', { n: 18 }); k.torus(0.155, 0.01, 0, 0.18, 0, '#ffffff', { rx: Math.PI / 2 }); // vase with a painted stripe
    const C = ['#ff8fb1', '#ffd34f', '#ffffff', '#ff9b6a', '#c3a2ff', '#ff8fb1', '#ffd34f'];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, r = 0.1 + (i % 3) * 0.04, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 0.66 + (i % 2) * 0.08;
      k.cyl(0.01, 0.34 + (i % 2) * 0.08, Math.cos(a) * 0.02, 0.36, Math.sin(a) * 0.02, '#4f9a3c', { n: 4, rz: -Math.cos(a) * r * 3, rx: Math.sin(a) * r * 3 });
      for (let p = 0; p < 5; p++) { const b = p / 5 * Math.PI * 2; k.ball(0.035, x + Math.cos(b) * 0.035, y, z + Math.sin(b) * 0.035, C[i], { s: [1, 0.5, 1], n: 6 }); } k.ball(0.022, x, y + 0.012, z, i % 2 ? '#ffb43a' : '#ffe07a', { n: 6 }); // petals round a centre
    }
    for (const a of [0.4, 2.2, 4.0]) leaf(k, Math.cos(a) * 0.06, 0.45, Math.sin(a) * 0.06, -a + Math.PI / 2, -0.5, 0.2, '#5cbf5a', 0.35); // leaves
  });
  add('hangplant', 'Hanging plant', 'plants', 200, [1, 1], 'wall', k => {
    k.box(0.8, 0.08, 0.45, 0, 0.6, 0.22, WOOD, { r: 0.03 }); for (const x of [-0.3, 0.3]) k.box(0.05, 0.22, 0.3, x, 0.38, 0.15, WOOD2, { r: 0.02 }); // shelf on brackets
    pot(k, 0.16, 0.25, '#ffcf5a', 0.68); k.torus(0.17, 0.012, 0, 0.82, 0, '#f2b43a', { rx: Math.PI / 2 });
    for (let v = 0; v < 6; v++) { const x0 = -0.27 + v * 0.11, z0 = 0.28 + (v % 2) * 0.08, n = 4 + (v % 3); k.cyl(0.012, (n - 1) * 0.15 + 0.1, x0, 0.86 - (n - 1) * 0.15, z0, '#3f8a45', { n: 4 }); for (let j = 0; j < n; j++) { const y = 0.86 - j * 0.15; k.ball(0.065, x0 + Math.sin(j * 1.3 + v) * 0.02, y, z0, j % 2 ? '#4cc068' : '#3fae5a', { s: [1, 0.45, 0.7], n: 8, rz: (j % 2 ? 0.4 : -0.4) }); } } // trailing vines of little leaves
    for (let i = 0; i < 6; i++) leaf(k, Math.cos(i) * 0.08, 0.95, 0.04 + Math.sin(i) * 0.08, i * 1.05, -0.9, 0.22, '#5cbf5a', 0.4); // a crown of leaves on top
  }, { wy: 2.3, h: 1.0 });
  add('lemontree', 'Lemon tree', 'plants', 350, [1, 1], 'floor', k => {
    pot(k, 0.34, 0.6, '#f08a75'); for (const y of [0.15, 0.45]) k.torus(0.32 + y * 0.06, 0.015, 0, y, 0, '#d9705e', { rx: Math.PI / 2 }); // terracotta pot with rings
    const b = '#7b4f30'; k.cyl(0.07, 1.4, 0, 0.55, 0, b, { rt: 0.05, n: 8 }); k.cyl(0.035, 0.5, 0.1, 1.5, 0, b, { rt: 0.02, rz: -0.6, n: 6 }); k.cyl(0.035, 0.5, -0.1, 1.6, 0.05, b, { rt: 0.02, rz: 0.6, n: 6 }); // trunk and branches
    for (const [x, y, z, r, c] of [[0, 2.25, 0, 0.5, '#4fae4f'], [0.32, 1.98, 0.22, 0.38, '#5fbf5a'], [-0.32, 2.05, -0.15, 0.38, '#5fbf5a'], [0.1, 2.5, -0.2, 0.3, '#4fae4f'], [-0.15, 1.95, 0.3, 0.3, '#5fbf5a']]) { k.ball(r, x, y, z, c, { n: 14 }); k.ball(r * 0.55, x - r * 0.25, y + r * 0.45, z + r * 0.25, shade(c, 0.16), { n: 10 }); } // clumps of leaves, lit on top
    for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 0.48 + (i % 2) * 0.1, x = Math.cos(a) * r, y = 1.85 + (i % 3) * 0.22, z = Math.sin(a) * r; k.ball(0.085, x, y, z, '#ffe14d', { s: [1, 1.25, 1], n: 10 }); k.ball(0.02, x, y - 0.11, z, '#f2c14e', { n: 5 }); leaf(k, x, y + 0.09, z, a, -0.6, 0.13, '#3f9a45', 0.4); } // lemons with tips and a leaf each
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.3; k.ball(0.03, Math.cos(a) * 0.55, 2.4, Math.sin(a) * 0.55, '#ffffff', { n: 6 }); } // blossom
  }, { earn: 1500 });
  // ---------- On the walls (built against the wall at z 0, facing +z; wy is the height of the bottom above the floor)
  add('painting', 'Painting', 'walls', 250, [2, 1], 'wall', k => {
    k.box(1.74, 1.3, 0.08, 0, -0.02, 0.05, '#c99055', { r: 0.03 }); k.box(1.62, 1.18, 0.04, 0, 0.04, 0.09, '#e9c27a', { r: 0.02 }); // a moulded frame
    k.box(1.52, 1.1, 0.02, 0, 0.08, 0.1, '#f4efe4', { r: 0.005 }); k.painted(new T.PlaneGeometry(1.5, 1.08), meadow(), 0, 0.62, 0.112); // the painting on its canvas
  }, { wy: 1.9, h: 1.25 });
  add('poster', 'Space poster', 'walls', 180, [2, 1], 'wall', k => {
    k.box(1.3, 1.7, 0.03, 0, -0.05, 0.02, '#f4efe4', { r: 0.005 }); k.box(1.2, 1.6, 0.03, 0, 0, 0.03, '#26306a', { r: 0.005 }); k.box(1.2, 0.5, 0.005, 0, 0, 0.046, '#3a3f8a', { r: 0.002 }); // poster border, deep space and a lighter band
    for (let i = 0; i < 16; i++) k.ball(0.012 + (i % 3) * 0.008, -0.52 + (i * 37 % 16) * 0.07, 0.12 + (i * 53 % 17) * 0.085, 0.06, '#ffffff', { n: 6, emit: 0.4 }); // stars
    k.ball(0.18, -0.32, 1.25, 0.05, '#ffb36b', { s: [1, 1, 0.2], n: 14 }); k.torus(0.26, 0.015, -0.32, 1.25, 0.07, '#ffe07a', { rx: 1.2, rz: 0.3 }); // a ringed planet
    k.ball(0.07, 0.4, 0.3, 0.05, '#9be38f', { s: [1, 1, 0.2], n: 10 }); // a little green planet
    k.pill(0.14, 0.5, 0.05, 0.4, 0.07, '#f4f1e8', { n: 12, rz: -0.3 }); k.cone(0.15, 0.18, 0.31, 1.15, 0.07, '#e86f6f', { rz: -0.3 }); k.ball(0.06, 0.15, 0.82, 0.18, '#8fc9ff', { s: [1, 1, 0.3], n: 10 }); k.torus(0.065, 0.012, 0.15, 0.82, 0.17, '#c0c8d4', {}); // rocket with a porthole
    for (const s of [-1, 1]) k.cone(0.08, 0.2, 0.05 + s * 0.14, 0.42, 0.07, '#e86f6f', { rz: -0.3 + s * 0.4, n: 3, s: [1, 1, 0.3] }); // fins
    k.cone(0.09, 0.22, -0.06, 0.25, 0.07, '#ffb36b', { rz: Math.PI - 0.3, emit: 0.6 }); k.cone(0.05, 0.14, -0.04, 0.22, 0.08, '#ffe07a', { rz: Math.PI - 0.3, emit: 0.8 }); // flames
    k.box(0.9, 0.12, 0.005, 0, 0.0, 0.05, '#ffffff', { r: 0.002 }); for (let i = 0; i < 6; i++) k.box(0.1, 0.05, 0.004, -0.3 + i * 0.12, 0.035, 0.055, '#26306a', { r: 0.002 }); // a title strip
    for (const [x, y] of [[-0.55, 1.55], [0.55, 1.55], [-0.55, 0.05], [0.55, 0.05]]) k.ball(0.025, x, y, 0.06, '#e86f6f', { n: 6 }); // pins
  }, { wy: 1.8, h: 1.6 });
  add('clock', 'Wall clock', 'walls', 200, [1, 1], 'wall', (k, sub) => {
    k.cyl(0.42, 0.1, 0, 0.45, 0.02, '#ff9fb7', { rx: Math.PI / 2, n: 28 }); k.cyl(0.36, 0.04, 0, 0.45, 0.08, '#ffffff', { rx: Math.PI / 2, n: 28 }); k.painted(new T.CircleGeometry(0.35, 40), clockFace(), 0, 0.47, 0.118); // just in front of the white face, so the two never fight
    k.ball(0.03, 0, 0.45, 0.15, DARK, { n: 8 }); // the pin
    sub('hour', kk => kk.box(0.05, 0.2, 0.02, 0, 0, 0, DARK, { r: 0.01 }), 0, 0.45, 0.14);
    sub('min', kk => kk.box(0.035, 0.28, 0.02, 0, 0, 0, '#e86f6f', { r: 0.01 }), 0, 0.45, 0.16);
  }, { wy: 2.6, h: 0.9, act: 'clock', blurb: 'Tells the real time.' });
  add('wallshelf', 'Wall shelf', 'walls', 200, [2, 1], 'wall', k => {
    k.box(1.8, 0.1, 0.5, 0, 0.3, 0.25, WOOD, { r: 0.03 }); k.box(1.8, 0.02, 0.02, 0, 0.3, 0.5, WOOD2, { r: 0.005 }); // shelf with an edge
    for (const x of [-0.6, 0.6]) { k.box(0.07, 0.3, 0.3, x, 0, 0.15, WOOD2, { r: 0.02 }); k.box(0.07, 0.04, 0.3, x, 0.04, 0.15, '#c9a24a', { r: 0.01, rx: 0.8 }); } // brackets with a brace
    books(k, -0.8, 0.0, 0.4, 0.27, 0.35, 77); k.box(0.06, 0.3, 0.25, 0.04, 0.4, 0.27, '#c0c8d4', { r: 0.01 }); // books and a bookend
    k.cyl(0.1, 0.25, 0.5, 0.4, 0.25, '#7cc8a4', { rt: 0.12, n: 14 }); for (let i = 0; i < 6; i++) leaf(k, 0.5 + Math.cos(i) * 0.04, 0.62, 0.25 + Math.sin(i) * 0.04, i * 1.05, -0.8, 0.2, i % 2 ? '#5fbf5a' : '#4fae4f', 0.4); // a potted plant
    k.ball(0.07, 0.25, 0.47, 0.3, '#ffcf5a', { n: 10 }); k.cyl(0.08, 0.02, 0.25, 0.4, 0.3, '#c9a24a', { n: 10 }); // a little trophy ball on a stand
    k.box(0.18, 0.22, 0.03, 0.78, 0.4, 0.2, '#f2c14e', { r: 0.01, rx: -0.15 }); k.box(0.14, 0.18, 0.01, 0.78, 0.42, 0.22, '#bfe3ff', { r: 0.005, rx: -0.15 }); // a photo frame
  }, { wy: 2.4, h: 1.0 });
  add('mirror', 'Mirror', 'walls', 280, [1, 1], 'wall', k => {
    k.ball(0.5, 0, 0.8, 0.03, '#f2c14e', { s: [0.8, 1.2, 0.08], n: 28 }); k.torus(0.42, 0.02, 0, 0.8, 0.05, '#ffe07a', { s: [0.8, 1.2, 1] }); // gilt frame with an inner bead
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.ball(0.035, Math.sin(a) * 0.42, 0.8 + Math.cos(a) * 0.62, 0.06, '#e0a83a', { n: 8 }); } // beads round the frame
    k.ball(0.07, 0, 1.43, 0.05, '#f2c14e', { s: [1.4, 1, 0.5], n: 10 }); // a little crest
    k.special(new T.SphereGeometry(0.42, 24, 12), { glass: '#dff3ff' }, new T.Matrix4().compose(new T.Vector3(0, 0.8, 0.07), new T.Quaternion(), new T.Vector3(0.8, 1.2, 0.05)), { a: 0.85 });
    k.box(0.04, 0.4, 0.005, -0.12, 0.95, 0.1, '#ffffff', { r: 0.002, rz: 0.5 }); k.box(0.02, 0.2, 0.005, -0.05, 0.9, 0.1, '#ffffff', { r: 0.002, rz: 0.5 }); // shine
  }, { wy: 1.3, h: 1.9 });
  add('bunting', 'Bunting', 'walls', 120, [3, 1], 'wall', k => {
    const C = ['#ff8a8a', '#ffe07a', '#8fc9ff', '#9be38f', '#c3a2ff'];
    for (let i = 0; i < 26; i++) { const t0 = i / 25, x = -1.3 + t0 * 2.6, y = 0.55 - Math.sin(t0 * Math.PI) * 0.2; k.ball(0.012, x, y, 0.05, '#ffffff', { n: 4 }); } // a sagging string
    for (let i = 0; i < 9; i++) { const x = -1.25 + i * 0.31, y = 0.55 - Math.sin((x + 1.3) / 2.6 * Math.PI) * 0.2, c = C[i % 5]; k.cone(0.13, 0.32, x, y - 0.32, 0.06, c, { rx: Math.PI, n: 3, s: [1, 1, 0.25] }); k.cone(0.06, 0.14, x, y - 0.2, 0.075, i % 2 ? '#ffffff' : shade(c, -0.15), { rx: Math.PI, n: 3, s: [1, 1, 0.2] }); } // flags with a little pattern
    for (const x of [-1.38, 1.38]) k.ball(0.04, x, 0.55, 0.04, '#c9a24a', { n: 8 }); // hooks
  }, { wy: 3.2, h: 0.7 });
  add('corkboard', 'Pin board', 'walls', 160, [2, 1], 'wall', k => {
    k.box(1.6, 1.1, 0.06, 0, 0, 0.04, '#b9824f', { r: 0.03 }); k.box(1.45, 0.95, 0.03, 0, 0.08, 0.08, '#e9bf86', { r: 0.01 }); // frame and cork
    for (let i = 0; i < 30; i++) k.ball(0.008, -0.68 + (i * 41 % 29) * 0.047, 0.1 + (i * 17 % 19) * 0.047, 0.095, '#c99a5e', { n: 4 }); // cork grain
    const C = ['#fff36b', '#9fe0ff', '#ffb3c8', '#ffffff'];
    for (let i = 0; i < 5; i++) { const x = -0.5 + (i % 3) * 0.48, y = 0.2 + (i > 2 ? 0.4 : 0) + (i % 2) * 0.05, r = i % 2 ? 0.1 : -0.08; k.box(0.32, 0.32, 0.01, x, y, 0.1, C[i % 4], { r: 0.005, rz: r }); for (let l = 0; l < 3; l++) k.box(0.2 - l * 0.04, 0.012, 0.004, x, y + 0.2 - l * 0.06, 0.107, '#8a7a8a', { r: 0.002, rz: r }); k.ball(0.03, x, y + 0.28, 0.12, ['#e86f6f', '#6fa8e8', '#7cd36a'][i % 3], { n: 8 }); } // notes with scribbles and pins
    k.box(0.36, 0.26, 0.01, 0.48, 0.66, 0.1, '#ffffff', { r: 0.005, rz: -0.06 }); k.box(0.3, 0.16, 0.005, 0.48, 0.71, 0.106, '#8fd0ff', { r: 0.003, rz: -0.06 }); k.box(0.3, 0.06, 0.005, 0.48, 0.69, 0.108, '#7cc556', { r: 0.003, rz: -0.06 }); k.ball(0.03, 0.48, 0.9, 0.12, '#ffcf5a', { n: 8 }); // a photo
    k.box(0.04, 0.3, 0.02, 0.68, 0.0, 0.13, '#e86f6f', { r: 0.01, rz: 0.2 }); // a pencil tucked in the frame
  }, { wy: 2.0, h: 1.1 });
  add('hoop', 'Basketball hoop', 'walls', 300, [1, 1], 'wall', k => {
    k.box(0.95, 0.7, 0.06, 0, 0.4, 0.03, '#ffffff', { r: 0.03 }); k.box(0.97, 0.72, 0.04, 0, 0.39, 0.0, '#c0c8d4', { r: 0.03 }); k.box(0.4, 0.3, 0.02, 0, 0.5, 0.07, '#e86f6f', { r: 0.01 }); k.box(0.34, 0.24, 0.022, 0, 0.53, 0.071, '#ffffff', { r: 0.01 }); // backboard with its target square
    k.box(0.16, 0.06, 0.14, 0, 0.39, 0.1, '#5b5b6b', { r: 0.02 }); // bracket
    k.torus(0.2, 0.025, 0, 0.42, 0.3, '#ff7a3d', { rx: Math.PI / 2 }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; k.box(0.01, 0.34, 0.01, Math.cos(a) * 0.17, 0.08, 0.3 + Math.sin(a) * 0.17, '#f4f1e8', { r: 0.002, rz: Math.cos(a) * 0.18, rx: -Math.sin(a) * 0.18 }); } // rim and net cords
    for (const y of [0.3, 0.2]) k.torus(0.15 - (0.3 - y) * 0.2, 0.006, 0, y, 0.3, '#f4f1e8', { rx: Math.PI / 2 }); // net rings
   
  }, { wy: 2.6, h: 1.1 });
  // ---------- Fun
  add('guitar', 'Guitar', 'fun', 400, [1, 1], 'floor', (k, sub) => {
    for (const a of [0, 2.1, 4.2]) k.cyl(0.025, 0.7, Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18 - 0.05, '#4a4a5a', { rz: Math.sin(a) * 0.3, rx: -Math.cos(a) * 0.3, n: 6 }); // the stand
    k.box(0.1, 0.06, 0.2, 0, 0.12, 0.1, '#4a4a5a', { r: 0.02 });
    // the guitar itself is its own part, resting on the stand: picked up and held to play (use.hold)
    sub('held', g => g.at(0, 0, 0, 0, kk => {
      const top = '#f0b16f', side = '#a8643a';
      kk.ball(0.3, 0, 0.35, 0, side, { s: [1, 1, 0.38], n: 22 }); kk.ball(0.23, 0, 0.75, 0, side, { s: [1, 1, 0.38], n: 20 }); // body sides
      kk.ball(0.295, 0, 0.35, 0.012, top, { s: [1, 1, 0.36], n: 22 }); kk.ball(0.225, 0, 0.75, 0.012, top, { s: [1, 1, 0.36], n: 20 }); // spruce top
      kk.torus(0.085, 0.012, 0, 0.6, 0.11, '#6b4330', {}); kk.cyl(0.08, 0.02, 0, 0.59, 0.1, '#2d2228', { rx: Math.PI / 2, n: 16 }); // sound hole with a rosette
      kk.box(0.22, 0.05, 0.05, 0, 0.3, 0.1, '#4a3528', { r: 0.015 }); kk.box(0.18, 0.12, 0.012, 0.06, 0.38, 0.105, '#4a3528', { r: 0.01 }); // bridge and pick guard
      kk.box(0.1, 0.85, 0.06, 0, 0.9, 0.02, '#6b4a33', { r: 0.02 }); kk.box(0.09, 0.82, 0.015, 0, 0.92, 0.055, '#3a2a24', { r: 0.005 }); // neck and fretboard
      for (let i = 0; i < 9; i++) kk.box(0.09, 0.006, 0.006, 0, 1.0 + i * 0.075, 0.064, '#d8d8e0', { r: 0.002 }); // frets
      for (const x of [-0.03, -0.01, 0.01, 0.03]) kk.box(0.004, 1.4, 0.004, x, 0.32, 0.07, '#f4f1e8', { r: 0.001 }); // strings
      kk.box(0.16, 0.22, 0.07, 0, 1.75, 0.02, '#4a3528', { r: 0.03 }); for (const s of [-1, 1]) for (const y of [1.8, 1.88, 1.96]) kk.cyl(0.015, 0.06, s * 0.1, y, 0.02, '#c9a24a', { rz: Math.PI / 2, n: 6 }); // headstock and tuning pegs
    }, -0.2), 0, 0.15, 0);
  }, { act: 'music', blurb: 'Tap it for a tune.' });
  add('piano', 'Piano', 'fun', 900, [3, 1], 'floor', k => {
    const c = '#3b2f3d', d = shade(c, 0.12);
    k.box(2.8, 2.1, 0.62, 0, 0.14, -0.16, c, { r: 0.05 }); k.box(2.9, 0.1, 0.7, 0, 2.24, -0.16, d, { r: 0.04 }); // case and lid
    k.box(2.8, 0.14, 0.7, 0, 0, -0.12, d, { r: 0.04 }); for (const x of [-1.32, 1.32]) { k.box(0.14, 1.1, 0.7, x, 0.14, 0.08, c, { r: 0.04 }); k.cyl(0.07, 1.0, x, 0.14, 0.38, d, { n: 10 }); } // plinth, cheeks, legs
    k.box(2.56, 0.1, 0.42, 0, 1.24, 0.28, c, { r: 0.03 }); k.box(2.44, 0.06, 0.36, 0, 1.34, 0.3, '#fffaf0', { r: 0.008 }); // the keybed and white keys
    for (let i = 0; i < 29; i++) k.box(0.005, 0.065, 0.34, -1.2 + i * 0.086, 1.341, 0.31, '#d8d0c4', { r: 0.001 }); // gaps between the white keys
    for (let i = 0; i < 28; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) k.box(0.05, 0.07, 0.2, -1.2 + i * 0.086 + 0.065, 1.39, 0.23, '#22222a', { r: 0.008 }); // black keys in twos and threes
    k.box(2.5, 0.14, 0.05, 0, 1.42, 0.13, d, { r: 0.02 }); // fallboard
    k.box(1.3, 0.55, 0.04, 0, 1.6, 0.06, d, { r: 0.02, rx: -0.18 }); k.box(0.5, 0.4, 0.02, -0.2, 1.68, 0.1, '#fffaf0', { r: 0.005, rx: -0.18 }); k.box(0.5, 0.4, 0.02, 0.32, 1.68, 0.1, '#fffaf0', { r: 0.005, rx: -0.18, rz: -0.04 }); // music rest with sheet music
    for (const x of [-0.25, 0, 0.25]) k.box(0.04, 0.02, 0.1, x, 0.2, 0.18, '#c9a24a', { r: 0.01 }); // pedals
    k.cyl(0.08, 0.04, 1.1, 2.34, -0.2, '#f2c14e', { n: 10 }); k.cyl(0.03, 0.22, 1.1, 2.38, -0.2, '#f2c14e', { n: 6 }); // a candle
  }, { act: 'music', earn: 2500, where: 'in' });
  add('easel', 'Easel', 'fun', 300, [1, 1], 'floor', k => {
    k.box(0.07, 2.4, 0.07, -0.35, 0, 0.15, WOOD, { rz: -0.12, r: 0.02 }); k.box(0.07, 2.4, 0.07, 0.35, 0, 0.15, WOOD, { rz: 0.12, r: 0.02 }); k.box(0.07, 2.2, 0.07, 0, 0, -0.2, WOOD, { rx: 0.25, r: 0.02 }); // legs: two in front and one behind, meeting at the top
    k.box(0.5, 0.2, 0.16, 0, 2.18, 0.12, WOOD2, { r: 0.03 }); k.box(0.55, 0.05, 0.05, 0, 0.5, 0.15, WOOD2, { r: 0.015 }); // top clamp and cross brace
    k.box(0.9, 0.06, 0.18, 0, 1.0, 0.22, WOOD2, { r: 0.02 }); k.box(0.9, 0.06, 0.03, 0, 1.06, 0.3, WOOD2, { r: 0.01 }); // ledge with a lip
    k.box(0.85, 1.0, 0.05, 0, 1.06, 0.18, '#f4efe4', { r: 0.01, rx: -0.08 }); k.box(0.79, 0.94, 0.02, 0, 1.09, 0.205, '#ffffff', { r: 0.005, rx: -0.08 }); // canvas on its frame
    k.box(0.8, 0.3, 0.01, 0, 1.12, 0.215, '#bfe3ff', { r: 0.003, rx: -0.08 }); k.box(0.8, 0.2, 0.01, 0, 1.12, 0.218, '#9be38f', { r: 0.003, rx: -0.08 }); k.ball(0.08, 0.2, 1.75, 0.235, '#ffd35a', { s: [1, 1, 0.15], n: 12 }); // a painting of a hill and the sun
    for (const [x, y, c] of [[-0.2, 1.62, '#ff8a8a'], [-0.05, 1.45, '#ff9fb7'], [0.12, 1.5, '#ffffff']]) k.ball(0.07, x, y, 0.23, c, { s: [1.4, 0.7, 0.15], n: 10 }); // flowers and a cloud
    k.ball(0.2, 0.3, 1.1, 0.32, '#f4efe4', { s: [1, 0.12, 0.7], n: 14 }); for (const [x, c] of [[0.2, '#e86f6f'], [0.28, '#6fa8e8'], [0.36, '#f2c14e'], [0.42, '#7cc8a4']]) k.ball(0.03, x, 1.13, 0.38, c, { s: [1, 0.4, 1], n: 6 }); // a palette with paint blobs
    for (const [x, c] of [[-0.3, '#e86f6f'], [-0.2, '#6fa8e8']]) { k.cyl(0.012, 0.3, x, 1.06, 0.24, WOOD, { rz: 0.4, n: 5 }); k.cone(0.02, 0.05, x - 0.13, 1.33, 0.24, c, { rz: Math.PI + 0.4, n: 6 }); } // brushes
  });
  add('telescope', 'Telescope', 'fun', 650, [1, 1], 'floor', k => {
    for (const a of [0, 2.1, 4.2]) { k.cyl(0.03, 1.5, Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25, '#4a4a5a', { rz: Math.sin(a) * 0.25, rx: -Math.cos(a) * 0.25, n: 6 }); k.ball(0.04, Math.sin(a) * 0.42, 0.02, Math.cos(a) * 0.42, '#2d2a3a', { n: 8 }); } // tripod with rubber feet
    k.cyl(0.015, 0.3, 0, 0.55, 0, '#6a6a7a', { n: 6 }); k.cyl(0.18, 0.03, 0, 0.7, 0, '#6a6a7a', { n: 3 }); // centre spreader and accessory tray
    k.cyl(0.07, 0.12, 0, 1.42, 0, '#2d2a3a', { n: 10 }); k.ball(0.08, 0, 1.55, 0, '#2d2a3a', { n: 10 }); // mount head
    k.at(0, 1.5, 0, 0.6, kk => {
      kk.cyl(0.13, 1.3, 0, -0.5, 0, '#f4f1e8', { rt: 0.17, n: 18 }); kk.cyl(0.19, 0.12, 0, 0.75, 0, '#6fa8e8', { n: 18 }); kk.cyl(0.16, 0.01, 0, 0.87, 0, '#bfe3ff', { n: 18 }); // tube, dew shield and lens
      for (const y of [-0.2, 0.3]) kk.torus(0.16, 0.018, 0, y, 0, '#6fa8e8', { rx: Math.PI / 2 }); // tube rings
      kk.cyl(0.08, 0.15, 0, -0.62, 0, '#4a4a5a', { n: 12 }); kk.cyl(0.04, 0.12, 0, -0.74, 0, '#2d2a3a', { n: 10 }); // focuser and eyepiece
      kk.cyl(0.03, 0.18, 0.06, -0.55, 0, '#c9a24a', { rz: Math.PI / 2, n: 6 }); // focus knob
      kk.cyl(0.04, 0.4, 0.2, 0.2, 0, '#4a4a5a', { n: 10 }); kk.box(0.06, 0.06, 0.06, 0.15, 0.25, 0, '#2d2a3a', { r: 0.01 }); // finder scope on its bracket
    }, -1.0);
  }, { earn: 3000, blurb: 'For looking at the stars.' });
  add('toychest', 'Toy box', 'fun', 300, [2, 1], 'floor', k => {
    const c = '#8fc9ff', d = shade(c, -0.15);
    k.box(1.8, 0.86, 0.86, 0, 0.06, 0, c, { r: 0.06 }); for (const y of [0.25, 0.6]) k.box(1.82, 0.04, 0.88, 0, y, 0, d, { r: 0.02 }); // planked box with bands
    for (const x of [-0.86, 0.86]) for (const z of [-0.4, 0.4]) k.ball(0.06, x, 0.04, z, '#4a4a5a', { n: 8 }); // little feet
    k.box(1.88, 0.14, 0.94, 0, 1.12, -0.32, '#ffcf5a', { r: 0.06, rx: -1.2 }); // the lid, propped open
    for (const x of [-0.5, 0.5]) { k.box(0.32, 0.32, 0.04, x, 0.32, 0.44, x < 0 ? '#ffe07a' : '#ff9fb7', { r: 0.05 }); k.box(0.16, 0.16, 0.02, x, 0.4, 0.465, '#ffffff', { r: 0.03 }); } // alphabet blocks painted on
    k.ball(0.2, -0.45, 0.95, 0.1, '#ff8a8a', { n: 14 }); k.torus(0.2, 0.02, -0.45, 0.95, 0.1, '#ffffff', { rx: 0.6 }); // a ball
    k.box(0.28, 0.28, 0.28, 0.45, 0.88, 0.0, '#9be38f', { r: 0.04, ry: 0.5 }); k.ball(0.12, 0.05, 1.0, -0.05, '#d39a64', { n: 10 }); k.ball(0.06, -0.02, 1.08, -0.04, '#d39a64', { n: 8 }); k.ball(0.06, 0.12, 1.08, -0.04, '#d39a64', { n: 8 }); // a block and a little bear peeking out
    k.cyl(0.035, 0.5, 0.75, 0.75, -0.1, '#e86f6f', { rz: -0.4, n: 8 }); k.ball(0.06, 0.88, 1.2, -0.1, '#f2c14e', { n: 8 }); // a toy wand
  }, { surf: 1.12 });
  add('teddy', 'Teddy bear', 'fun', 150, [1, 1], 'small', k => {
    const c = '#d39a64', c2 = '#f3d1a8', d = shade(c, -0.15);
    k.ball(0.22, 0, 0.22, 0, c, { s: [1, 1.05, 0.9], n: 16 }); k.ball(0.12, 0, 0.2, 0.15, c2, { s: [1, 1.1, 0.5], n: 12 }); // body and tummy patch
    k.box(0.006, 0.3, 0.006, 0, 0.1, 0.205, d, { r: 0.002 }); // a stitched seam
    k.ball(0.17, 0, 0.55, 0.02, c, { n: 16 }); k.ball(0.075, 0, 0.5, 0.16, c2, { s: [1.1, 0.85, 1], n: 12 }); k.ball(0.028, 0, 0.53, 0.235, DARK, { s: [1.3, 0.9, 1], n: 8 }); // head, muzzle and nose
    k.box(0.005, 0.04, 0.005, 0, 0.475, 0.23, DARK, { r: 0.002 }); for (const x of [-0.02, 0.02]) k.box(0.025, 0.005, 0.005, x, 0.47, 0.228, DARK, { r: 0.002, rz: x > 0 ? -0.5 : 0.5 }); // stitched mouth
    for (const x of [-0.065, 0.065]) { k.ball(0.026, x, 0.6, 0.15, DARK, { n: 8 }); k.ball(0.008, x + 0.008, 0.61, 0.172, W, { n: 6 }); } // button eyes with a shine
    for (const x of [-0.13, 0.13]) { k.ball(0.07, x, 0.69, 0, c, { s: [1, 1, 0.6], n: 12 }); k.ball(0.04, x, 0.69, 0.025, c2, { s: [1, 1, 0.4], n: 10 }); } // ears
    for (const x of [-0.2, 0.2]) { k.ball(0.08, x, 0.3, 0.06, c, { s: [0.9, 1.3, 0.9], n: 12 }); } // arms
    for (const x of [-0.12, 0.12]) { k.ball(0.09, x, 0.06, 0.14, c, { s: [1, 0.9, 1.3], n: 12 }); k.ball(0.055, x, 0.06, 0.25, c2, { s: [1, 1, 0.35], n: 10 }); } // legs and foot pads
    k.torus(0.1, 0.025, 0, 0.4, 0.02, '#e86f6f', { rx: Math.PI / 2 }); k.ball(0.04, 0.06, 0.39, 0.12, '#e86f6f', { s: [1.5, 1, 0.6], n: 8 }); k.ball(0.04, -0.06, 0.39, 0.12, '#e86f6f', { s: [1.5, 1, 0.6], n: 8 }); // a red bow
  });
  add('globe', 'Globe', 'fun', 200, [1, 1], 'small', k => {
    k.lathe([[0.001, 0], [0.16, 0], [0.16, 0.03], [0.12, 0.05], [0.04, 0.07], [0.03, 0.12], [0.04, 0.2], [0.001, 0.2]], 0, 0, 0, '#c98f5a', { n: 16 }); // turned wooden base
    k.at(0, 0.5, 0, 0, kk => {
      kk.torus(0.27, 0.015, 0, 0, 0, '#f2c14e', { arc: Math.PI * 1.2, rz: 0.4 + Math.PI * 0.9 }); kk.cyl(0.008, 0.6, 0, -0.3, 0, '#f2c14e', { n: 4 }); // brass meridian and axle
      kk.painted(new T.SphereGeometry(0.24, 40, 24), atlas(), 0, 0, 0, { ry: -1.13 }); // the world, painted on
      kk.ball(0.02, 0, 0.245, 0, '#f2c14e', { n: 8 }); kk.ball(0.02, 0, -0.245, 0, '#f2c14e', { n: 8 }); // pivots
    }, 0, 0.4);
  });
  add('aquarium', 'Fish tank', 'fun', 700, [2, 1], 'floor', (k, sub) => {
    k.box(1.9, 0.9, 0.9, 0, 0, 0, '#f4efe8', { r: 0.05 }); k.box(1.9, 0.1, 0.9, 0, 2.0, 0, '#4a4a5a', { r: 0.03 }); k.box(1.86, 0.1, 0.86, 0, 0.9, 0, '#4a4a5a', { r: 0.03 });
    k.box(1.7, 0.12, 0.7, 0, 1.0, 0, '#f2dca3', { r: 0.04 }); for (const x of [-0.5, 0.45]) { k.cyl(0.02, 0.5, x, 1.1, -0.15, '#3fae5a', { n: 4, rz: 0.2 }); k.cyl(0.02, 0.6, x + 0.1, 1.1, -0.1, '#4cc068', { n: 4, rz: -0.2 }); } k.ball(0.15, 0.1, 1.12, -0.1, '#9a9aa8', { s: [1.4, 0.8, 1], n: 8 });
    k.waterBox(1.78, 0.9, 0.78, 0, 1.0, 0, { a: 0.35, tint: '#5fd0f0' }); k.glassBox(1.84, 1.0, 0.84, 0, 1.0, 0, { a: 0.14 });
    sub('fish', kk => { for (const [x, y, z, c] of [[-0.3, 0, 0.1, '#ff8a3d'], [0.3, 0.25, -0.1, '#ffe07a'], [0, 0.45, 0.15, '#ff6fa8']]) { kk.ball(0.08, x, y, z, c, { s: [1.4, 1, 0.6], n: 10 }); kk.cone(0.06, 0.1, x - 0.14, y - 0.05, z, c, { rz: Math.PI / 2, n: 4 }); } }, 0, 1.35, 0);
  }, { act: 'fish', earn: 1500, where: 'in' });
  add('fishbowl', 'Goldfish bowl', 'fun', 250, [1, 1], 'small', (k, sub) => { k.cyl(0.18, 0.06, 0, 0, 0, '#9fd3f0', { n: 16 }); k.waterBall(0.28, 0, 0.32, 0, { a: 0.4, tint: '#7fd8f4' }); k.special(new T.SphereGeometry(0.3, 18, 12), 'glass', new T.Matrix4().makeTranslation(0, 0.33, 0), { a: 0.12 }); sub('fish', kk => { kk.ball(0.06, 0, 0, 0, '#ff8a3d', { s: [1.4, 1, 0.6], n: 8 }); kk.cone(0.045, 0.08, -0.1, -0.04, 0, '#ff8a3d', { rz: Math.PI / 2, n: 4 }); }, 0, 0.3, 0); }, { act: 'fish' });
  add('robot', 'Toy robot', 'fun', 220, [1, 1], 'small', k => {
    const m = '#c0c8d4', d = '#9a9aa8';
    k.box(0.3, 0.32, 0.22, 0, 0.12, 0, m, { r: 0.05 }); k.box(0.16, 0.12, 0.02, 0, 0.2, 0.115, '#3d4a5a', { r: 0.015 }); // body and chest panel
    for (const [x, c] of [[-0.04, '#e86f6f'], [0, '#ffd35a'], [0.04, '#7cd36a']]) k.ball(0.014, x, 0.23, 0.13, c, { n: 6, emit: 0.7 }); k.box(0.1, 0.012, 0.005, 0, 0.17, 0.127, '#6fdcff', { r: 0.002, emit: 0.6 }); // buttons and a little screen
    k.cyl(0.05, 0.04, 0, 0.44, 0, d, { n: 10 }); // neck
    k.box(0.26, 0.22, 0.2, 0, 0.47, 0, m, { r: 0.05 }); k.box(0.2, 0.1, 0.02, 0, 0.53, 0.1, '#2d2a3a', { r: 0.03 }); // head and visor
    for (const x of [-0.06, 0.06]) k.ball(0.03, x, 0.58, 0.11, '#6fdcff', { n: 8, emit: 0.8 }); k.box(0.08, 0.015, 0.01, 0, 0.5, 0.105, '#6fdcff', { r: 0.004, emit: 0.5 }); // eyes and a smile
    for (const x of [-0.14, 0.14]) k.cyl(0.035, 0.03, x, 0.56, 0, d, { rz: Math.PI / 2, n: 10 }); // ear bolts
    k.cyl(0.012, 0.12, 0, 0.69, 0, d, { n: 4 }); k.ball(0.035, 0, 0.82, 0, '#e86f6f', { n: 8, emit: 0.5 }); // antenna
    for (const x of [-0.08, 0.08]) { k.box(0.08, 0.13, 0.1, x, 0, 0, d, { r: 0.03 }); k.box(0.1, 0.04, 0.14, x, 0, 0.02, '#5b5b6b', { r: 0.015 }); } // legs with feet
    for (const x of [-0.2, 0.2]) { k.ball(0.04, x, 0.38, 0, d, { n: 8 }); k.box(0.07, 0.24, 0.08, x, 0.14, 0, d, { r: 0.03 }); k.torus(0.035, 0.012, x, 0.12, 0, '#5b5b6b', { arc: Math.PI * 1.5, ry: Math.PI / 2 }); } // shoulders, arms and claw hands
  });
  add('rockinghorse', 'Rocking horse', 'fun', 450, [2, 1], 'floor', k => {
    const h = '#ffffff', sp = '#e0e4ee';
    for (const x of [-0.3, 0.3]) k.torus(1.0, 0.05, x, 1.05, 0, '#c98f5a', { arc: 1.3, rz: Math.PI * 1.29, ry: Math.PI / 2 }); // the rockers
    for (const z of [-0.45, 0, 0.45]) k.box(0.66, 0.05, 0.08, 0, 0.06 + Math.abs(z) * 0.12, z, '#b9824f', { r: 0.02 }); // slats between the rockers
    k.ball(0.6, 0, 0.95, 0, h, { s: [0.5, 0.45, 1], n: 18 }); for (const [x, y, z] of [[0.24, 1.05, -0.2], [-0.2, 0.95, 0.15], [0.22, 0.88, 0.25]]) k.ball(0.06, x, y, z, sp, { s: [0.3, 1, 1], n: 8 }); // body with dapples
    k.box(0.36, 0.5, 0.3, 0, 1.05, 0.55, h, { r: 0.12, rx: 0.5 }); k.ball(0.22, 0, 1.45, 0.75, h, { s: [0.8, 0.9, 1.3], n: 16 }); k.ball(0.13, 0, 1.38, 0.98, '#ffe3ea', { s: [1, 0.85, 0.9], n: 12 }); // neck, head and muzzle
    for (const x of [-0.05, 0.05]) k.ball(0.018, x, 1.4, 1.1, '#d07a8a', { n: 6 }); // nostrils
    for (const x of [-0.09, 0.09]) k.cone(0.05, 0.14, x, 1.6, 0.66, h, { rx: -0.3, n: 8 }); // ears
    for (let i = 0; i < 5; i++) k.ball(0.07, 0, 1.62 - i * 0.12, 0.62 - i * 0.07, '#ff9fb7', { s: [0.6, 1, 1], n: 10 }); k.ball(0.1, 0, 1.0, -0.62, '#ff9fb7', { s: [0.6, 1.6, 0.8], n: 10, rx: 0.6 }); // mane and tail
    k.box(0.4, 0.06, 0.42, 0, 1.22, -0.05, '#e86f6f', { r: 0.03 }); k.box(0.42, 0.1, 0.1, 0, 1.26, -0.24, '#c95a5a', { r: 0.04 }); for (const x of [-0.24, 0.24]) { k.box(0.015, 0.36, 0.015, x, 0.92, -0.05, '#4a4a5a', { r: 0.004 }); k.box(0.08, 0.03, 0.12, x, 0.9, -0.05, '#c0c8d4', { r: 0.01 }); } // saddle, cantle and stirrups
    for (const x of [-0.08, 0.08]) { k.ball(0.03, x, 1.55, 0.92, DARK, { n: 8 }); k.ball(0.008, x + 0.01, 1.56, 0.95, W, { n: 4 }); } // eyes
    k.cyl(0.02, 0.36, 0, 1.4, 0.9, '#c9a24a', { rz: Math.PI / 2, n: 6 }); for (const x of [-0.19, 0.19]) k.box(0.015, 0.02, 0.5, x, 1.38, 0.7, '#e86f6f', { r: 0.005, rx: 0.4 }); // handle and reins
    for (const [x, z] of [[-0.18, 0.4], [0.18, 0.4], [-0.18, -0.4], [0.18, -0.4]]) { k.cyl(0.05, 0.4, x, 0.25, z, h, { rt: 0.07, n: 8 }); k.cyl(0.055, 0.06, x, 0.22, z, '#5b4a5e', { n: 8 }); } // legs and hooves
  });
  // ---------- Pets (built facing +z; the moving parts are animated by the home)
  add('cat', 'Yami the cat', 'pets', 550, [1, 1], 'pet', null, { pet: 'cat', blurb: 'Calm, wise and graceful. Loves fish, quiet places and sunny spots.' });
  add('puppy', 'Puppy', 'pets', 600, [1, 1], 'pet', null, { pet: 'dog', blurb: 'Trots about after you.' });
  add('bunny', 'Bunny', 'pets', 400, [1, 1], 'pet', null, { pet: 'bunny', blurb: 'Hops about and nibbles.' });
  add('catbed', 'Pet bed', 'pets', 150, [1, 1], 'floor', k => {
    const c = '#c3a2ff';
    k.cyl(0.42, 0.08, 0, 0, 0, shade(c, -0.15), { n: 24 }); k.torus(0.34, 0.12, 0, 0.17, 0, c, { rx: Math.PI / 2 }); k.torus(0.34, 0.025, 0, 0.29, 0, shade(c, -0.2), { rx: Math.PI / 2 }); // base and a soft rolled rim, stitched
    k.cyl(0.3, 0.07, 0, 0.08, 0, '#fff1f6', { n: 20 }); k.ball(0.28, 0, 0.12, 0, '#fff1f6', { s: [1, 0.2, 1], n: 16 }); // the cushion
    for (const [x, z] of [[0.08, 0.05], [-0.06, -0.08], [0.12, -0.1]]) k.ball(0.035, x, 0.18, z, '#ffc2d6', { s: [1, 0.3, 1], n: 6 }); // a paw-print pattern
  });
  add('kennel', 'Kennel', 'pets', 400, [2, 2], 'floor', k => {
    const w = '#ffb27a', r = '#e86f6f';
    k.box(1.7, 0.1, 1.6, 0, 0, 0, shade(w, -0.2), { r: 0.03 }); // floor
    for (let i = 0; i < 6; i++) k.box(1.6, 0.18, 1.5, 0, 0.1 + i * 0.19, 0, i % 2 ? w : shade(w, -0.06), { r: 0.03 }); // weatherboards
    k.box(0.62, 0.78, 0.06, 0, 0.12, 0.75, '#3a2f3f', { r: 0.24 }); k.box(0.74, 0.08, 0.08, 0, 0.88, 0.76, '#ffffff', { r: 0.03 }); // the doorway and its lintel
    k.box(0.5, 0.2, 0.04, 0, 1.0, 0.77, '#ffffff', { r: 0.03 }); k.box(0.36, 0.1, 0.02, 0, 1.05, 0.79, '#4a9ae0', { r: 0.02 }); // a name plate
    for (const sd of [-1, 1]) { k.box(1.05, 0.1, 1.8, sd * 0.44, 1.42, 0, r, { r: 0.03, rz: -sd * 0.72 }); for (let j = 0; j < 4; j++) k.box(1.06, 0.03, 0.04, sd * 0.44, 1.48, -0.7 + j * 0.46, shade(r, -0.15), { r: 0.01, rz: -sd * 0.72 }); } // pitched roof with shingle lines
    k.box(0.1, 0.1, 1.84, 0, 1.78, 0, shade(r, -0.2), { r: 0.04 }); // ridge
    k.box(0.5, 0.02, 0.5, 0.6, 0, 1.05, '#c0c8d4', { r: 0.01 }); k.cyl(0.14, 0.1, 0.6, 0.02, 1.05, '#4a9ae0', { rt: 0.17, n: 14 }); k.box(0.3, 0.02, 0.3, 0.6, 0, 0.85, '#c0c8d4', { r: 0.01 }); // a water bowl by the door
  }, { where: 'out' });
  // ---------- Garden
  add('trampoline', 'Trampoline', 'garden', 900, [3, 3], 'floor', k => {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = Math.cos(a) * 1.3, z = Math.sin(a) * 1.3; k.cyl(0.05, 0.75, x, 0, z, '#4a4a5a', { n: 8 }); k.box(0.3, 0.05, 0.08, x, 0, z, '#4a4a5a', { r: 0.02, ry: -a }); k.cyl(0.03, 1.4, x * 1.02, 0.75, z * 1.02, '#6fa8e8', { n: 6 }); } // legs with feet, and net poles
    k.torus(1.33, 0.09, 0, 0.78, 0, '#6fa8e8', { rx: Math.PI / 2 }); k.torus(1.33, 0.09, 0, 0.8, 0, '#ffcf5a', { rx: Math.PI / 2, arc: Math.PI / 3 }); k.torus(1.33, 0.09, 0, 0.8, 0, '#ffcf5a', { rx: Math.PI / 2, arc: Math.PI / 3, rz: Math.PI }); // padded edge with coloured sections
    k.cyl(1.22, 0.04, 0, 0.74, 0, '#2f2f3d', { n: 36 }); k.torus(0.4, 0.008, 0, 0.785, 0, '#ffffff', { rx: Math.PI / 2 }); // the mat and a target ring
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; k.box(0.012, 0.012, 0.1, Math.cos(a) * 1.24, 0.77, Math.sin(a) * 1.24, '#c0c8d4', { r: 0.003, ry: -a + Math.PI / 2 }); } // springs
    k.torus(1.35, 0.02, 0, 2.15, 0, '#6fa8e8', { rx: Math.PI / 2 }); for (let i = 0; i < 18; i++) { const a = (i + 0.5) / 18 * Math.PI * 2; if (a > 1.2 && a < 1.95) continue; k.box(0.008, 1.3, 0.008, Math.cos(a) * 1.34, 0.82, Math.sin(a) * 1.34, '#f4f1e8', { r: 0.002 }); } // top ring and net strands, open at the front
  }, { where: 'out', earn: 1000 });
  add('pool', 'Paddling pool', 'garden', 500, [3, 3], 'floor', k => { k.torus(1.25, 0.22, 0, 0.22, 0, '#8fc9ff', { rx: Math.PI / 2 }); k.torus(1.25, 0.18, 0, 0.58, 0, '#ffb0c4', { rx: Math.PI / 2 }); k.cyl(1.2, 0.05, 0, 0, 0, '#bfe6ff', { n: 28 }); k.special(new T.CylinderGeometry(1.15, 1.15, 0.5, 28), 'water', new T.Matrix4().makeTranslation(0, 0.28, 0), { a: 0.55, tint: '#5fd0f0' }); k.ball(0.18, 0.5, 0.62, 0.3, '#ffe07a', { n: 12 }); }, { where: 'out' });
  add('vegbed', 'Veggie bed', 'garden', 300, [3, 1], 'floor', k => {
    k.box(2.9, 0.5, 0.95, 0, 0, 0, '#b9824f', { r: 0.05 }); for (const y of [0.17, 0.34]) k.box(2.92, 0.015, 0.97, 0, y, 0, '#8f5f3a', { r: 0.005 }); for (const x of [-1.42, 1.42]) for (const z of [-0.44, 0.44]) k.box(0.12, 0.56, 0.12, x, 0, z, '#8f5f3a', { r: 0.03 }); // planked sides and corner posts
    k.box(2.75, 0.1, 0.8, 0, 0.42, 0, '#6b4530', { r: 0.04 }); for (let i = 0; i < 12; i++) k.ball(0.06, -1.25 + i * 0.23, 0.52, (i % 2 - 0.5) * 0.5, '#7d5236', { s: [1.4, 0.4, 1], n: 6 }); // soil with clods
    for (let i = 0; i < 3; i++) { const x = -1.1 + i * 0.4; k.ball(0.09, x, 0.55, 0.15, '#ff8a3d', { n: 8 }); for (let j = 0; j < 4; j++) k.cone(0.03, 0.3, x + (j - 1.5) * 0.04, 0.58, 0.15, '#5cbf5a', { rz: (j - 1.5) * 0.35, n: 4 }); } // carrots
    for (let i = 0; i < 2; i++) { const x = 0.3 + i * 0.6; k.ball(0.2, x, 0.62, 0.05, '#9fe08a', { s: [1, 0.75, 1], n: 12 }); for (let j = 0; j < 5; j++) leaf(k, x, 0.6, 0.05, j * 1.26, -0.5, 0.26, '#7cd36a', 0.6); } // lettuces
    for (const z of [-0.25]) for (let i = 0; i < 3; i++) { const x = -1.1 + i * 0.4; k.cyl(0.012, 0.5, x, 0.5, z, '#c9a46a', { n: 4 }); leaf(k, x, 0.75, z, 0.5, -0.4, 0.15, '#4fae4f'); k.ball(0.05, x + 0.05, 0.7, z, '#ef4b3f', { n: 8 }); k.ball(0.04, x - 0.04, 0.85, z, '#ff9a4a', { n: 8 }); } // tomatoes on canes
    k.box(0.12, 0.25, 0.02, 1.25, 0.5, 0.42, '#f4efe4', { r: 0.01 }); k.cyl(0.01, 0.3, 1.25, 0.4, 0.43, WOOD, { n: 4 }); // a plant label
  });
  add('fruittree', 'Apple tree', 'garden', 600, [2, 2], 'floor', k => {
    const b = '#7b4f30', bd = shade(b, -0.15);
    k.cyl(0.18, 1.8, 0, 0, 0, b, { rt: 0.13, n: 10 }); for (let i = 0; i < 5; i++) { const a = i * 1.26; k.cyl(0.07, 0.3, Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17, bd, { rt: 0.02, rz: Math.cos(a) * 0.9, rx: -Math.sin(a) * 0.9, n: 6 }); } // trunk with roots
    for (let i = 0; i < 6; i++) k.box(0.02, 0.25, 0.02, Math.cos(i) * 0.15, 0.3 + i * 0.22, Math.sin(i) * 0.15, bd, { r: 0.005, ry: i }); // bark lines
    for (const [rz, rx] of [[-0.7, 0], [0.7, 0.2], [0.1, -0.7], [0, 0.7]]) k.cyl(0.07, 0.9, 0, 1.6, 0, b, { rt: 0.03, rz, rx, n: 6 }); // main branches
    for (const [x, y, z, r, c] of [[0, 2.7, 0, 0.85, '#4fae4f'], [0.65, 2.3, 0.3, 0.62, '#5fbf5a'], [-0.55, 2.4, -0.2, 0.64, '#5fbf5a'], [0.1, 2.35, 0.65, 0.55, '#4fae4f'], [-0.2, 2.3, -0.6, 0.55, '#58b858'], [0.3, 3.2, -0.2, 0.5, '#5fbf5a']]) { k.ball(r, x, y, z, c, { n: 16 }); k.ball(r * 0.55, x - r * 0.25, y + r * 0.45, z + r * 0.3, shade(c, 0.16), { n: 10 }); } // leafy crown, lit on top
    for (let i = 0; i < 12; i++) { const a = i * 0.53, r = 0.85 + (i % 2) * 0.15, x = Math.cos(a) * r, y = 2.1 + (i % 4) * 0.25, z = Math.sin(a) * r; k.ball(0.11, x, y, z, i % 3 ? '#ff5a5a' : '#ff8a4a', { n: 10 }); k.ball(0.04, x - 0.04, y + 0.04, z + 0.07, '#ffb0a0', { n: 6 }); k.cyl(0.01, 0.06, x, y + 0.09, z, '#6b4330', { n: 4 }); } // apples with a shine and a stalk
    for (const [x, z] of [[0.6, 0.5], [-0.4, 0.7]]) { k.ball(0.11, x, 0.08, z, '#ff5a5a', { n: 10 }); } // windfalls
  }, { where: 'out' });
  add('mower', 'Lawnmower', 'garden', 600, [1, 1], 'floor', k => {
    const c = '#e86f5a', d = shade(c, -0.18);
    k.box(0.92, 0.22, 0.78, 0, 0.1, 0.05, c, { r: 0.08 }); k.box(0.86, 0.06, 0.7, 0, 0.32, 0.05, d, { r: 0.04 }); k.box(0.94, 0.05, 0.08, 0, 0.06, 0.44, shade(c, -0.3), { r: 0.02 }); // a wide cutting deck, with its front skirt
    k.cyl(0.14, 0.2, 0, 0.36, 0.12, '#3d3a4a', { n: 14 }); k.cyl(0.1, 0.04, 0, 0.56, 0.12, '#5b5b6b', { n: 12 }); k.cyl(0.04, 0.05, 0.06, 0.6, 0.12, '#ffcf5a', { n: 8 }); // the motor, its cap and the fuel cap
    for (const x of [-0.48, 0.48]) for (const z of [-0.26, 0.36]) { k.cyl(0.11, 0.06, x, 0.11, z, '#2d2a3a', { rz: Math.PI / 2, n: 14 }); k.cyl(0.05, 0.07, x, 0.11, z, '#c0c8d4', { rz: Math.PI / 2, n: 10 }); } // wheels and hubs
    k.box(0.62, 0.36, 0.38, 0, 0.12, -0.5, '#3d4a5a', { r: 0.06 }); k.box(0.58, 0.04, 0.34, 0, 0.48, -0.5, '#5b6b7b', { r: 0.02 }); // the grass catcher
    for (const x of [-0.24, 0.24]) k.box(0.04, 0.6, 0.04, x, 0.5 - 0.3, -0.58, '#c0c8d4', { r: 0.015, rx: -0.885 }); k.cyl(0.03, 0.56, 0, 0.7 - 0.28, -0.8, '#2d2a3a', { rz: Math.PI / 2, n: 8 }); // handle bars and the grip, at a small kid's hand height
  }, { grips: { L: [0.2, 0.7, -0.8], R: [-0.2, 0.7, -0.8] }, where: 'out', blurb: 'For mowing the lawn. Put it in the garden and your character mows when the grass gets long.' });
  add('bench', 'Garden bench', 'garden', 250, [3, 1], 'floor', k => {
    const ir = '#3d4a5a', w = '#c98f5a';
    for (const x of [-1.2, 1.2]) {
      k.box(0.1, 0.8, 0.1, x, 0, 0.32, ir, { r: 0.03 }); k.box(0.1, 1.55, 0.1, x, 0, -0.35, ir, { r: 0.03, rx: -0.06 }); k.box(0.1, 0.08, 0.75, x, 0.75, 0, ir, { r: 0.02 }); // cast iron legs and seat rail
      k.torus(0.12, 0.025, x, 0.4, 0, ir, { ry: Math.PI / 2 }); k.torus(0.06, 0.02, x, 0.4, 0.18, ir, { ry: Math.PI / 2 }); k.torus(0.06, 0.02, x, 0.4, -0.18, ir, { ry: Math.PI / 2 }); // scrolls
      k.box(0.1, 0.06, 0.6, x, 1.08, 0.05, ir, { r: 0.02 }); k.ball(0.05, x, 1.08, 0.36, ir, { n: 8 }); k.box(0.06, 0.32, 0.06, x, 0.78, 0.3, ir, { r: 0.02 }); // armrest with a curl and support
      for (const z of [-0.35, 0.32]) k.box(0.18, 0.04, 0.18, x, 0, z, ir, { r: 0.02 }); // feet
    }
    for (let i = 0; i < 4; i++) { k.box(2.7, 0.06, 0.16, 0, 0.82, -0.27 + i * 0.19, w, { r: 0.02 }); for (const x of [-1.2, 1.2]) k.ball(0.012, x, 0.88, -0.27 + i * 0.19, '#4a4a5a', { n: 4 }); } // seat slats and screws
    for (let i = 0; i < 3; i++) k.box(2.7, 0.16, 0.05, 0, 1.06 + i * 0.22, -0.38 - i * 0.01, w, { r: 0.02, rx: -0.06 }); // back slats
    k.box(0.4, 0.12, 0.35, 0.6, 0.88, 0, '#9fd8a8', { r: 0.06 }); // a cushion
  });
  add('birdbath', 'Bird bath', 'garden', 200, [1, 1], 'floor', k => {
    const st = '#cfc8bd', st2 = '#d9d2c6';
    k.lathe([[0.001, 0], [0.28, 0], [0.28, 0.06], [0.2, 0.1], [0.12, 0.14], [0.001, 0.14]], 0, 0, 0, st, { n: 18 }); // stepped base
    k.lathe([[0.001, 0], [0.11, 0], [0.08, 0.2], [0.09, 0.45], [0.075, 0.7], [0.12, 0.86], [0.001, 0.86]], 0, 0.12, 0, st, { n: 14 }); // a turned column
    k.lathe([[0.001, 0], [0.2, 0], [0.45, 0.18], [0.47, 0.22], [0.4, 0.2], [0.001, 0.12]], 0, 1.0, 0, st2, { n: 22 }); k.special(new T.CylinderGeometry(0.38, 0.38, 0.03, 20), 'water', new T.Matrix4().makeTranslation(0, 1.17, 0), { a: 0.6 }); // bowl and water
    for (const [x, y, z] of [[0.06, 0.32, -0.06], [-0.07, 0.55, 0.04]]) k.ball(0.06, x, y, z, '#7cb86a', { s: [1, 0.4, 1], n: 6 }); // a little moss
    k.at(0.25, 1.22, 0, 0, kk => {
      kk.ball(0.1, 0, 0.08, 0, '#6fa8e8', { s: [1.3, 1, 0.9], n: 12 }); kk.ball(0.07, -0.03, 0.06, 0.03, '#ffe3d0', { s: [1, 0.8, 0.6], n: 8 }); kk.ball(0.065, 0.12, 0.17, 0, '#6fa8e8', { n: 10 }); // body, breast and head
      kk.cone(0.025, 0.06, 0.19, 0.16, 0, '#ffb36b', { rz: -Math.PI / 2, n: 4 }); for (const z of [-0.04, 0.04]) kk.ball(0.012, 0.15, 0.19, z, DARK, { n: 6 }); // beak and eyes
      kk.box(0.12, 0.02, 0.06, -0.14, 0.12, 0, '#4f87c9', { r: 0.01, rz: 0.4 }); for (const z of [-0.06, 0.06]) kk.ball(0.05, -0.01, 0.1, z, '#4f87c9', { s: [1.4, 0.6, 0.3], n: 8 }); // tail and wings
      for (const z of [-0.025, 0.025]) kk.cyl(0.006, 0.05, 0.01, -0.03, z, '#ffb36b', { n: 4 }); // legs
    });
  }, { where: 'out' });
  add('letterbox', 'Letterbox', 'garden', 150, [1, 1], 'floor', k => {
    k.box(0.12, 1.2, 0.12, 0, 0, 0, '#c98f5a', { r: 0.03 }); k.box(0.3, 0.06, 0.3, 0, 0, 0, '#a8754a', { r: 0.02 }); k.box(0.3, 0.08, 0.5, 0, 1.12, 0, '#a8754a', { r: 0.02 }); // post, foot and bracket
    k.box(0.45, 0.28, 0.6, 0, 1.2, 0, '#e86f6f', { r: 0.04 }); k.cyl(0.225, 0.6, 0, 1.48, 0, '#e86f6f', { rx: Math.PI / 2, n: 18 }); // a round-topped box
    k.box(0.47, 0.42, 0.04, 0, 1.2, 0.3, '#d95a5a', { r: 0.03 }); k.ball(0.03, 0, 1.4, 0.33, '#f2c14e', { n: 8 }); k.box(0.24, 0.04, 0.01, 0, 1.3, 0.32, '#2d2228', { r: 0.01 }); // door, knob and slot
    k.box(0.04, 0.3, 0.05, 0.25, 1.35, 0.15, '#f2c14e', { r: 0.01 }); k.box(0.14, 0.1, 0.02, 0.32, 1.6, 0.15, '#f2c14e', { r: 0.01 }); // the flag
    k.box(0.32, 0.08, 0.01, 0, 1.23, 0.325, '#ffffff', { r: 0.005 }); for (let i = 0; i < 3; i++) k.box(0.05, 0.05, 0.005, -0.08 + i * 0.08, 1.245, 0.331, DARK, { r: 0.004 }); // the house number
    for (let i = 0; i < 5; i++) leaf(k, Math.cos(i * 1.3) * 0.12, 0.02, Math.sin(i * 1.3) * 0.12, i * 1.3, -1.0, 0.2, '#5cbf5a', 0.5); // grass round the post
  }, { where: 'out' });
  add('sandpit', 'Sandpit', 'garden', 350, [2, 2], 'floor', k => {
    for (const [w, d, x, z] of [[1.9, 0.15, 0, -0.88], [1.9, 0.15, 0, 0.88], [0.15, 1.9, -0.88, 0], [0.15, 1.9, 0.88, 0]]) { k.box(w, 0.35, d, x, 0, z, '#9fd8a8', { r: 0.04 }); k.box(w + 0.04, 0.05, d + 0.04, x, 0.33, z, '#7cc88a', { r: 0.02 }); } // frame with a seat edge
    for (const x of [-0.88, 0.88]) for (const z of [-0.88, 0.88]) k.box(0.24, 0.4, 0.24, x, 0, z, '#ffcf5a', { r: 0.05 }); // corner seats
    k.box(1.65, 0.2, 1.65, 0, 0, 0, '#f2dca3', { r: 0.06 }); for (let i = 0; i < 6; i++) k.ball(0.12, -0.5 + (i * 0.37) % 1.1, 0.2, -0.5 + (i * 0.53) % 1.1, '#ead09a', { s: [1.5, 0.3, 1], n: 8 }); // sand with little bumps
    k.cone(0.25, 0.3, -0.3, 0.2, 0.2, '#ead09a', { n: 12 }); k.cyl(0.05, 0.08, -0.3, 0.48, 0.2, '#ead09a', { n: 8 }); k.box(0.006, 0.1, 0.006, -0.3, 0.55, 0.2, WOOD, { r: 0.002 }); k.cone(0.05, 0.06, -0.27, 0.6, 0.2, '#ff8a8a', { rz: -Math.PI / 2, n: 3, s: [1, 1, 0.2] }); // a sandcastle with a flag
    k.cyl(0.12, 0.2, 0.4, 0.2, -0.2, '#ff8a8a', { rt: 0.15, n: 12 }); k.torus(0.145, 0.012, 0.4, 0.4, -0.2, '#e86f6f', { arc: Math.PI }); // bucket and handle
    k.box(0.12, 0.02, 0.16, 0.2, 0.2, 0.4, '#6fa8e8', { r: 0.02, rx: -0.2 }); k.cyl(0.015, 0.25, 0.2, 0.1, 0.25, '#6fa8e8', { rx: Math.PI / 2 - 0.2, n: 5 }); // a spade
  }, { where: 'out' });
  // Every item can come with its own actions: what a character or pet does when put on or beside it. A new item
  // gets actions just by adding a line here; no engine code. Fields:
  //   kind  sit (on a seat) · lie (on a mattress) · nest (pets curl up in it) · front (stand or sit in front,
  //         facing it) · on (stand on top of it)
  //   h     height of the seat, mattress or top     seats  spots across the width, in tiles from the middle
  //   kid / pet   the pose each one uses           floor  in front, sit on the floor instead of standing
  //   dur   [min, max] seconds before getting up   fx  a little effect while in use (notes, zzz, sparkle, bubbles)
  //   on    the item switches on while in use (a TV)        pets  false when pets don't use it
  //   kidMoves / petMoves   branches of the move, played in turn while it's in use (the first is the plain one):
  //         'base.branch' names, each a variation on the base pose (see kid3d.js and yami3d.js)
  const LIE = ['liebed', 'liebed.roll', 'liebed.starfish', 'liebed.covers', 'liebed.half'];
  const NAP = ['sleep', 'sleep.curl', 'sleep.stretch', 'sleep.knead'], SIT = ['sit', 'sit.wash'], SEAT = ['sitchair', 'sitchair.swing', 'sitchair.stretch', 'sitchair.lean'];
  // a sofa, armchair or beanbag is for lounging: more ways to sit on it
  const COMFY = [...SEAT, 'sitchair.relax', 'sitchair.read', 'sitchair.phone', 'sitchair.hug', 'sitchair.snooze'];
  // the bathroom's branches: in the bath splashing, blowing bubbles, playing with a rubber duck, lying back, scrubbing;
  // under the shower washing hair, singing; at the basin washing hands, brushing teeth, washing the face
  const BATH = ['bath', 'bath.bubbles', 'bath.duck', 'bath.relax', 'bath.scrub'], SHOWER = ['shower', 'shower.hair', 'shower.sing'], WASH = ['wash', 'wash.teeth', 'wash.face'];
  const USE = {
    bed: { kind: 'lie', h: 1.12, kid: 'liebed', pet: 'sleep', kidMoves: LIE, petMoves: NAP, dur: [40, 70], fx: 'zzz' },
    bunk: { kind: 'lie', h: 0.86, kid: 'liebed', pet: 'sleep', kidMoves: LIE, petMoves: NAP, dur: [40, 70], fx: 'zzz' },
    sofa: { kind: 'sit', h: 0.98, seats: [-0.95, 0.95], kid: 'sitchair', pet: 'sit', kidMoves: COMFY, petMoves: SIT, dur: [20, 40] },
    armchair: { kind: 'sit', h: 0.95, kid: 'sitchair', pet: 'sleep', kidMoves: COMFY, petMoves: NAP, dur: [20, 40] },
    chair: { kind: 'sit', h: 1.0, kid: 'sitchair', pet: 'sit', kidMoves: SEAT, petMoves: SIT, dur: [15, 30] },
    deskchair: { kind: 'sit', h: 0.98, kid: 'sitchair', pet: 'sit', kidMoves: SEAT, petMoves: SIT, dur: [15, 30] },
    beanbag: { kind: 'sit', h: 0.78, kid: 'sitchair', pet: 'sleep', kidMoves: COMFY, petMoves: NAP, dur: [20, 40] },
    bench: { kind: 'sit', h: 0.88, seats: [-0.7, 0.7], kid: 'sitchair', pet: 'sit', kidMoves: SEAT, petMoves: SIT, dur: [15, 30] },
    catbed: { kind: 'nest', h: 0.14, pet: 'sleep', petMoves: NAP, dur: [40, 80], fx: 'zzz' },
    kennel: { kind: 'nest', h: 0.05, pet: 'sleep', petMoves: NAP, dur: [40, 80], fx: 'zzz', at: [0, 0.9] },
    piano: { kind: 'front', kid: 'play', pets: false, dur: [12, 20], fx: 'notes', gap: 0.75, hands: { L: [-0.35, 1.42, 0.3], R: [0.35, 1.42, 0.3], move: 'keys' } },
    guitar: { kind: 'front', kid: 'strum', floor: true, pets: false, dur: [10, 16], fx: 'notes', gap: 0.2, face: 'away', hold: { sub: 'held', body: [-0.12, -0.2, 0.06], up: 0.5, lean: -1.12, grips: { L: [0, 1.3, 0.08], R: [0, 0.5, 0.12] }, strum: 'R' } },
    tv: { kind: 'front', kid: 'watch', pets: false, kidMoves: ['watch', 'watch.laugh', 'watch.lean'], floor: true, dur: [20, 35], on: true, gap: 1.6 },
    bookcase: { kind: 'front', kid: 'read', pets: false, kidMoves: ['read', 'read.scan', 'read.browse'], dur: [12, 20], gap: 0.6 },
    easel: { kind: 'front', kid: 'paint', pets: false, dur: [12, 20], fx: 'sparkle', gap: 0.55, hands: { R: [0.05, 1.5, 0.3], move: 'paint' } },
    telescope: { kind: 'front', kid: 'gaze', pets: false, dur: [10, 16], fx: 'sparkle', gap: 0.45 },
    kitchen: { kind: 'front', kid: 'cook', pets: false, dur: [10, 16], fx: 'sparkle', gap: 0.6, hands: { L: [-0.22, 1.86, 0.28], R: [0.18, 1.86, 0.3], move: 'chop' } },
    stove: { kind: 'front', kid: 'cook', pets: false, dur: [10, 16], fx: 'sparkle', gap: 0.6, hands: { L: [-0.3, 1.78, 0.3], R: [0.4, 1.82, 0.2], move: 'stir' } },
    fridge: { kind: 'front', kid: 'snack', pets: false, dur: [6, 10], gap: 0.7 },
    kitchen2: { kind: 'front', kid: 'cook', pets: false, dur: [10, 16], fx: 'sparkle', gap: 0.6, hands: { L: [-0.22, 1.86, 0.28], R: [0.18, 1.86, 0.3], move: 'chop' } },
    fridge2: { kind: 'front', kid: 'snack', pets: false, dur: [6, 10], gap: 0.7 },
    pantry: { kind: 'front', kid: 'snack', pets: false, dur: [6, 10], gap: 0.6 },
    basin: { kind: 'front', kid: 'wash', kidMoves: WASH, pets: false, dur: [20, 40], gap: 0.45, fx: 'bubbles', hands: { L: [-0.07, 1.48, -0.08], R: [0.07, 1.48, -0.08], move: 'rub' } },
    shower: { kind: 'on', h: 0.12, kid: 'shower', kidMoves: SHOWER, pets: false, dur: [60, 120], fx: 'bubbles' },
    bath: { kind: 'on', h: 0.15, kid: 'bath', kidMoves: BATH, pets: false, dur: [120, 240], fx: 'bubbles' },
    bath2: { kind: 'on', h: 0.15, kid: 'bath', kidMoves: BATH, pets: false, dur: [120, 240], fx: 'bubbles' },
    toychest: { kind: 'front', kid: 'toys', pet: 'look', petMoves: ['look', 'look.paw', 'look.sniff'], floor: true, dur: [12, 20], fx: 'sparkle', gap: 0.5 },
    trampoline: { kind: 'on', h: 0.78, kid: 'bounce', pets: false, dur: [8, 14], fx: 'sparkle' },
    pool: { kind: 'on', h: 0.1, kid: 'splash', pets: false, dur: [10, 16], fx: 'bubbles' },
    rockinghorse: { kind: 'sit', h: 1.25, kid: 'rock', pets: false, dur: [10, 16] }
  };
  for (const d of D) if (USE[d.t]) d.use = USE[d.t];
  // ---------- Renovating: windows, curtains and blinds (hung on the walls like pictures, and the house cuts its
  // window holes where the windows are), and floors, wall coverings and front doors (put into a room or doorway).
  const TRIM = '#ffffff';
  // A window w tiles wide and h high, its bottom at y 0, built at the wall's inside face (z 0) with the wall
  // running back to z -0.38: a frame right through the wall, glass in the middle, a sill inside and out.
  function windowModel(k, w, h, style) {
    const t = TRIM, hw = w / 2 - 0.05, zc = -0.19, dz = 0.56;
    for (const s of [-1, 1]) k.box(0.14, h + 0.12, dz, s * hw, -0.06, zc, t, { r: 0.02 }); // sides
    k.box(w + 0.04, 0.14, dz, 0, h - 0.04, zc, t, { r: 0.02 }); // head
    k.box(w + 0.24, 0.12, 0.3, 0, -0.12, 0.06, t, { r: 0.03 }); k.box(w + 0.1, 0.1, 0.2, 0, -0.12, -0.44, t, { r: 0.03 }); k.box(w - 0.1, 0.06, dz, 0, -0.08, zc, shade(t, -0.06), { r: 0.01 }); // sills inside and out, and the bottom rail
    const glass = (gw, gh, x, y) => k.glassBox(gw, gh, 0.03, x, y, zc, { a: 0.55, tint: '#cfeaff' });
    const bar = (bw, bh, x, y) => k.box(bw, bh, 0.06, x, y, zc, t, { r: 0.01 });
    const disc = (r, x, y, z, half) => k.special(new T.CylinderGeometry(r, r, 0.03, 28, 1, false, half ? -Math.PI / 2 : 0, half ? Math.PI : Math.PI * 2), { glass: '#cfeaff' }, new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(Math.PI / 2, 0, 0)), new T.Vector3(1, 1, 1)), { a: 0.7 });
    if (style === 'round') { // a porthole: a trim plate filling the hole, a round pane set in each face
      const r = Math.min(hw, h / 2) - 0.06; k.box(hw * 2, h - 0.04, 0.4, 0, -0.02, zc, t, { r: 0.02 });
      for (const z of [0.03, -0.41]) { disc(r, 0, h / 2, z); k.torus(r, 0.045, 0, h / 2, z, shade(t, -0.08), {}); }
      return;
    }
    if (style === 'arch') { // a square pane below and a half-round fan light in a trim plate above
      const r = hw - 0.02, sh = h - r - 0.08; glass(w - 0.12, sh, 0, 0); bar(0.05, sh, 0, 0); bar(w - 0.12, 0.08, 0, sh);
      k.box(hw * 2, r + 0.04, 0.4, 0, sh + 0.04, zc, t, { r: 0.02 });
      for (const z of [0.03, -0.41]) { disc(r - 0.04, 0, sh + 0.08, z, true); k.torus(r - 0.04, 0.04, 0, sh + 0.08, z, shade(t, -0.08), { arc: Math.PI }); for (const a of [0.6, 1.57, 2.5]) k.box(0.03, r - 0.06, 0.02, Math.cos(a) * (r - 0.06) / 2, sh + 0.08 + Math.sin(a) * (r - 0.06) / 2 - (r - 0.06) / 2, z, t, { r: 0.005, rz: a - Math.PI / 2 }); }
      return;
    }
    glass(w - 0.12, h - 0.1, 0, 0);
    if (style === 'wide') { for (const x of [-hw / 3, hw / 3]) bar(0.05, h - 0.1, x, 0); bar(w - 0.12, 0.05, 0, h * 0.72); }
    else if (style === 'tall') { bar(0.05, h - 0.1, 0, 0); for (const y of [h / 3, h * 2 / 3]) bar(w - 0.12, 0.05, 0, y); }
    else { bar(0.05, h - 0.1, 0, 0); bar(w - 0.12, 0.05, 0, h / 2); }
  }
  const WIN = [['win_classic', 'Cottage window', 2, 1.45, 2.1, 'classic', 300], ['win_wide', 'Picture window', 3, 1.45, 2.1, 'wide', 450], ['win_tall', 'Tall window', 2, 0.9, 2.8, 'tall', 500], ['win_round', 'Round window', 1, 2.0, 1.0, 'round', 260], ['win_arch', 'Arched window', 2, 1.2, 2.6, 'arch', 600]];
  for (const [t, name, w, wy, h, style, xp] of WIN) add(t, name, 'reno', xp, [w, 1], 'wall', k => windowModel(k, w, h, style), { wy, h, opening: 'window', where: 'in', blurb: 'Hang it on an outside wall and the wall opens up for it.' });

  // Curtains and blinds go over a window: built for that window's width (rec.w), height (rec.h) and how high its
  // bottom is off the floor (rec.wy).
  function cover(k, style, c, rec) {
    const w = rec.w || 2, h = rec.h || 2.1, wy = rec.wy != null ? rec.wy : 1.45, d = shade(c, -0.12), l = shade(c, 0.12);
    const rail = (ext, y) => { k.cyl(0.03, w + ext * 2, 0, y - (w + ext * 2) / 2, 0.2, '#ffffff', { rz: Math.PI / 2, n: 8 }); for (const s of [-1, 1]) { k.ball(0.06, s * (w / 2 + ext), y, 0.2, '#ffffff', { n: 8 }); k.box(0.05, 0.12, 0.2, s * (w / 2 + ext - 0.1), y - 0.04, 0.1, '#ffffff', { r: 0.01 }); } };
    if (style === 'curtains' || style === 'drapes') {
      const bot = style === 'drapes' ? -wy + 0.04 : -0.2, len = h + 0.25 - bot;
      rail(0.38, h + 0.3);
      for (const s of [-1, 1]) { for (let i = 0; i < 3; i++) k.pill(0.085, len - 0.17, s * (w / 2 + 0.25 - i * 0.15), bot, 0.2, i === 1 ? d : c, { n: 8, pat: 2 }); for (let i = 0; i < 4; i++) k.torus(0.04, 0.012, s * (w / 2 + 0.38 - i * 0.12), h + 0.27, 0.2, '#ffffff', {}); k.box(0.56, 0.12, 0.26, s * (w / 2 + 0.1), 0.62, 0.2, shade(c, -0.25), { r: 0.04 }); } // gathered panels, rings and tie-backs
      return;
    }
    if (style === 'cafe') { rail(0.05, h * 0.5); for (let i = 0; i < Math.round(w * 6); i++) k.pill(0.05, h * 0.5 - 0.08, -w / 2 + 0.08 + i * (w - 0.16) / Math.max(1, Math.round(w * 6) - 1), 0.02, 0.2, i % 2 ? d : c, { n: 6, pat: 2 }); return; }
    if (style === 'roller') { k.cyl(0.07, w + 0.06, 0, h + 0.08 - (w + 0.06) / 2, 0.14, l, { rz: Math.PI / 2, n: 12 }); k.box(w - 0.1, h * 0.42, 0.015, 0, h * 0.58 + 0.06, 0.1, c, { r: 0.005, pat: 2 }); k.box(w - 0.08, 0.05, 0.03, 0, h * 0.58 + 0.04, 0.1, d, { r: 0.01 }); k.cyl(0.006, 0.4, w / 2 - 0.2, h * 0.58 - 0.34, 0.12, '#ffffff', { n: 4 }); k.ball(0.03, w / 2 - 0.2, h * 0.58 - 0.36, 0.12, '#ffffff', { n: 6 }); return; }
    if (style === 'venetian') { k.box(w, 0.08, 0.1, 0, h + 0.02, 0.12, l, { r: 0.02 }); const n = Math.round(h * 0.6 / 0.1); for (let i = 0; i < n; i++) k.box(w - 0.08, 0.012, 0.09, 0, h - 0.06 - i * 0.1, 0.12, i % 2 ? c : l, { r: 0.004, rx: 0.35, pat: 6 }); for (const x of [-w / 3, w / 3]) k.box(0.008, n * 0.1 + 0.05, 0.008, x, h - 0.05 - n * 0.1, 0.12, '#f4f1e8', { r: 0.002 }); k.cyl(0.006, 0.9, w / 2 - 0.08, h - 0.9, 0.16, '#f4f1e8', { n: 4 }); return; }
    // roman: soft folds stacked at the top
    k.box(w, 0.06, 0.08, 0, h + 0.04, 0.12, l, { r: 0.02 });
    for (let i = 0; i < 4; i++) { k.box(w - 0.06, 0.2, 0.05, 0, h - 0.18 - i * 0.17, 0.12, c, { r: 0.02, pat: 2 }); k.cyl(0.05, w - 0.06, 0, h - 0.2 - i * 0.17 - (w - 0.06) / 2, 0.15, i % 2 ? d : c, { rz: Math.PI / 2, n: 10, pat: 2 }); }
  }
  const COV = [['cur_gathered', 'Curtains', 'curtains', '#e88aa8', 160], ['cur_drapes', 'Long drapes', 'drapes', '#7b8fd6', 260], ['cur_cafe', 'Cafe curtains', 'cafe', '#ffd27a', 120], ['bl_roller', 'Roller blind', 'roller', '#f4efe4', 140], ['bl_venetian', 'Venetian blind', 'venetian', '#ffffff', 180], ['bl_roman', 'Roman blind', 'roman', '#9fd8a8', 200]];
  for (const [t, name, style, col, xp] of COV) add(t, name, 'reno', xp, [2, 1], 'wall', (k, sub, rec) => cover(k, style, col, rec || {}), { wy: 1.45, h: 2.1, cover: true, coverStyle: style, where: 'in', blurb: 'Goes over a window. Pick it up and drop it on one.' });

  // Floors, wall coverings and front doors: bought for one room (or the front door) and put in straight away.
  // look: what the house builder draws; pat: the finish laid over the colour.
  const SAMPLE = (k, col, pat, ps) => { k.box(1.6, 0.12, 1.6, 0, 0, 0, col, { r: 0.04, pat, ps }); };
  const FLOORS = [['fl_wood', 'Wooden boards', 'wood', '#c88a58', 400], ['fl_tile', 'Tiles', 'tile', '#9fd3f0', 350], ['fl_carpet', 'Soft carpet', 'carpet', '#a9b8e8', 300], ['fl_tatami', 'Tatami mats', 'tatami', '#d8d996', 450], ['fl_stone', 'Stone flags', 'stone', '#cfc6b8', 500], ['fl_checker', 'Checkerboard', 'checker', '#2d2a3a', 420], ['fl_marble', 'Marble', 'marble', '#f1ede6', 700]];
  for (const [t, name, look, col, xp] of FLOORS) add(t, name, 'reno', xp, [1, 1], 'reno', k => { if (look === 'tile' || look === 'checker') { for (let i = 0; i < 4; i++) k.box(0.78, 0.12, 0.78, (i % 2 - 0.5) * 0.8, 0, ((i >> 1) - 0.5) * 0.8, (i === 0 || i === 3) ? (look === 'checker' ? col : '#ffffff') : (look === 'checker' ? '#f8f4ec' : col), { r: 0.03 }); } else if (look === 'wood') { for (let i = 0; i < 4; i++) k.box(1.6, 0.12, 0.38, 0, 0, -0.6 + i * 0.4, shade(col, (i % 2) * 0.05), { r: 0.02, pat: 1, ps: 0.6 }); } else SAMPLE(k, col, look === 'marble' ? 7 : look === 'carpet' ? 2 : 0, look === 'carpet' ? 0.35 : 0.5); }, { apply: 'floor', look, col, where: 'in' });
  const WALLS = [['wl_paint', 'Paint', 0, '#f8dccb', 150], ['wl_stripes', 'Striped wallpaper', 4, '#bfe3ff', 250], ['wl_dots', 'Dotty wallpaper', 5, '#ffd2dc', 250], ['wl_flowers', 'Flower wallpaper', 8, '#c9e8c0', 300], ['wl_panels', 'Wooden panelling', 11, '#d9a46e', 400], ['wl_brick', 'Brick wall', 10, '#d98a6a', 450], ['wl_marble', 'Marble wall', 7, '#f1ede6', 600]];
  for (const [t, name, pat, col, xp] of WALLS) add(t, name, 'reno', xp, [1, 1], 'reno', k => { k.box(1.6, 1.6, 0.12, 0, 0, 0, col, { r: 0.03, pat, ps: 1 }); k.box(1.6, 0.2, 0.18, 0, 0, 0.03, '#ffffff', { r: 0.02 }); }, { apply: 'wall', pat, col, where: 'in' });
  const DOORS = [['dr_panel', 'Panel door', 'panel', '#e86f5a', 400], ['dr_glass', 'Glass door', 'glass', '#6fa8e8', 550], ['dr_cottage', 'Cottage door', 'cottage', '#9fd8a8', 500], ['dr_barn', 'Barn door', 'barn', '#b9824f', 450], ['dr_arch', 'Arched door', 'arch', '#7b5aa6', 650]];
  for (const [t, name, look, col, xp] of DOORS) add(t, name, 'reno', xp, [2, 1], 'reno', k => { k.at(-0.9, 0, 0, 0, kk => IH.homes.doorLeaf(kk, 1.8, 3.7, 0.1, { t: look, c: col })); }, { apply: 'door', look, col, where: 'in' });

  const BY = Object.fromEntries(D.map(d => [d.t, d]));
  const CATS = [['mine', 'Mine'], ['reno', 'Renovate'], ['furn', 'Furniture'], ['kitchen', 'Kitchen'], ['bath', 'Bathroom'], ['rugs', 'Rugs'], ['lights', 'Lights'], ['plants', 'Plants'], ['walls', 'Walls'], ['fun', 'Fun'], ['pets', 'Pets'], ['garden', 'Garden']];

  // ---------- Colours and finishes a kid picks when buying. The item's main colour family (its most used colour and
  // the shades of it) takes the new colour, keeping its light and dark parts, and gets the finish's pattern.
  const SWATCHES = ['#e86f6f', '#ff9fb7', '#ffb36b', '#ffd35a', '#9be38f', '#5fbf8a', '#7cc8e8', '#6f8fe8', '#b59cff', '#8a6a5a', '#f4efe4', '#3d3a4a'];
  const FINISHES = [{ id: 'plain', name: 'Plain', pat: 0 }, { id: 'wood', name: 'Wood grain', pat: 1, ps: 1.4 }, { id: 'weave', name: 'Woven', pat: 2 }, { id: 'velvet', name: 'Velvet', pat: 3 }, { id: 'knit', name: 'Knitted', pat: 12 }, { id: 'stripes', name: 'Stripes', pat: 4 }, { id: 'dots', name: 'Dots', pat: 5 }, { id: 'flowers', name: 'Flowers', pat: 8 }, { id: 'metal', name: 'Metal', pat: 6 }, { id: 'marble', name: 'Marble', pat: 7 }];
  const MAIN = {};
  function mainOf(def) {
    if (MAIN[def.t] !== undefined) return MAIN[def.t];
    const k = new Kit(), w = {}; try { def.b(k, (n, fn) => fn(k), {}); } catch (e) { return (MAIN[def.t] = null); }
    for (const p of k.parts) w[p.col] = (w[p.col] || 0) + p.geo.attributes.position.count;
    const best = Object.entries(w).sort((a, b) => b[1] - a[1])[0]; return (MAIN[def.t] = best ? best[0] : null);
  }
  const HSL = c => { const o = {}; new T.Color(c).getHSL(o); return o; };
  // fin: { c: colour, f: finish id } -> what Kit.build needs (null: as it comes)
  function finFor(def, fin) {
    if (!fin || (!fin.c && (!fin.f || fin.f === 'plain'))) return null;
    const m = mainOf(def); if (!m) return null;
    const M = HSL(m), grey = M.s < 0.12, F = FINISHES.find(x => x.id === fin.f) || FINISHES[0], to = fin.c ? HSL(fin.c) : null;
    const memo = {};
    const match = c => { if (memo[c] !== undefined) return memo[c]; const P = HSL(c); let ok; if (grey) ok = P.s < 0.12 && Math.abs(P.l - M.l) < 0.2; else { const dh = Math.abs(P.h - M.h), h = Math.min(dh, 1 - dh); ok = h < 0.06 && P.s > 0.15 && Math.abs(P.l - M.l) < 0.3; } return (memo[c] = ok); };
    const col = c => { if (!to) return c; const P = HSL(c); return '#' + new T.Color().setHSL(to.h, to.s, Math.max(0.04, Math.min(0.97, to.l + (P.l - M.l)))).getHexString(); };
    return { match, col, pat: F.pat, ps: F.ps || 1 };
  }

  // Builds one item. Returns { group, subs, glowMat }. rec: the placed thing (its chosen colour and finish, and for
  // curtains and blinds the window they hang on).
  function make(def, rec) {
    const fin = rec && rec.fin ? finFor(def, rec.fin) : null, k = new Kit(), subs = {}, extras = [];
    if (def.pet) return IH.pets.make(def.pet);
    k.fin = fin;
    def.b(k, (name, fn, x = 0, y = 0, z = 0) => { const kk = new Kit(); kk.fin = fin; fn(kk); const g = kk.build(); g.position.set(x, y, z); extras.push(g); subs[name] = g; }, rec || {});
    const g = k.build(); for (const e of extras) g.add(e);
    g.userData.t = def.t;
    return { group: g, subs, glowMat: g.userData.glowMat || (extras.find(e => e.userData.glowMat) || {}).userData?.glowMat || null };
  }

  // How tall a thing is (its built model, measured once).
  const TALL = {};
  function heightOf(def) {
    if (TALL[def.t] != null) return TALL[def.t];
    if (def.pet || typeof def.b !== 'function') return (TALL[def.t] = 1);
    const k = new Kit(); try { def.b(k, (n, fn, x = 0, y = 0, z = 0) => k.at(x, y, z, 0, fn), {}); } catch (e) { return (TALL[def.t] = 1); }
    let h = 0; for (const p of [...k.parts, ...k.extra]) { p.geo.computeBoundingBox(); h = Math.max(h, p.geo.boundingBox.clone().applyMatrix4(p.m).max.y); }
    return (TALL[def.t] = h);
  }
  IH.items = { DEFS: D, BY, CATS, make, SWATCHES, FINISHES, finFor, heightOf };
})();
