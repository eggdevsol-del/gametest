/* The field machines (phase C, 2026-11-11), Farming Simulator 24 as the reference for what a real farm needs
   (generic names and looks, no brands). Each has one clear job on the field blocks' beds (village-islands.js
   IH.bedOps), a detailed model, and working parts that move as it goes (tines and rotors spin, discs and rollers
   roll). Mounted ones sit rigid on the tractor's three-point linkage; trailed ones swing on their drawbar.
   Models are built along +z to the tractor (the hitch at z = len), standing on y = 0, the working parts at the back. */
(() => {
  const IH = window.IsoHome = window.IsoHome || {}, T = window.THREE;
  if (!T || !IH.kit) return;
  const { Kit } = IH.kit, PI = Math.PI;
  const DK = '#3d4048', DK2 = '#2a2d31', ST = '#a9b3bf', STD = '#7f8a97', STL = '#cdd5de', YEL = '#e8c45a', RED = '#c8433a', REDD = '#a83a2f', GRN = '#2f8a4f', GRND = '#26703f', BLU = '#3f6fb5', BLUD = '#33598f', ORG = '#e07a2a', ORGD = '#c0631f', WHT = '#f1f1ee';

  // the jobs (job: what it does to a bed, IH.bedOps.work/plough/water/plant/lift; crops: what a planter sows; only
  // or not: what a harvester lifts; cost: ✨ a bed; muck: uses the barn's muck heap)
  const DEFS = {
    subsoiler: { e: '🔩', name: 'Subsoiler', xp: 700, job: 'subsoil', mount: true, about: 'Rips deep under empty beds to break the hard pan: the next three crops there each give one more.' },
    discs: { e: '💿', name: 'Disc harrow', xp: 650, job: 'till', about: 'Two gangs of discs break up and level the soil in empty beds.' },
    tiller: { e: '🌀', name: 'Rotary tiller', xp: 750, job: 'till', mount: true, about: 'Spinning tines work empty beds to a fine, crumbly tilth.' },
    powerharrow: { e: '〰️', name: 'Power harrow', xp: 900, job: 'fine', mount: true, about: 'Rows of spinning tines and a packer roller: the finest seedbed in empty beds.' },
    roller: { e: '🛞', name: 'Roller', xp: 450, job: 'roll', about: 'Firms newly sown beds so the seed meets the soil.' },
    planter: { e: '🌽', name: 'Precision planter', xp: 900, job: 'sow', mount: true, crops: ['corn', 'pumpkin'], about: 'Plants big seeds one at a time, evenly spaced: sweetcorn and pumpkins.' },
    potatoplanter: { e: '🥔', name: 'Potato planter', xp: 950, job: 'sow', crops: ['potato'], about: 'Cups lift seed potatoes from the hopper into the rows and ridge them over.' },
    transplanter: { e: '🪴', name: 'Transplanter', xp: 1000, job: 'sow', crops: ['tomato', 'strawberry'], about: 'Plants out seedlings from trays: tomatoes and strawberries.' },
    spreader: { e: '⚪', name: 'Fertiliser spreader', xp: 600, job: 'feed', kind: 'fert', cost: 5, mount: true, about: 'Two spinning discs throw fertiliser over the beds: well fed. ✨ 5 a bed.' },
    manure: { e: '🟫', name: 'Muck spreader', xp: 800, job: 'feed', kind: 'muck', muck: true, about: 'Spreads muck from the barn’s heap (it builds up as the animals are fed): well fed, and free.' },
    lime: { e: '⬜', name: 'Lime spreader', xp: 550, job: 'lime', cost: 4, about: 'Sweetens sour soil: the next five crops in each bed give one more. ✨ 4 a bed.' },
    weeder: { e: '🌿', name: 'Inter-row weeder', xp: 650, job: 'weed', mount: true, about: 'Hoes out the weeds between the rows of growing crops.' },
    harvester: { e: '🧺', name: 'Vegetable harvester', xp: 1600, job: 'lift', not: ['potato'], about: 'Lifts ready crops (not potatoes) into its hopper. Stop by a seed shed to unload.' },
    potatoharvester: { e: '⛏️', name: 'Potato harvester', xp: 1700, job: 'lift', only: ['potato'], about: 'Digs ready potatoes, sieves the soil off, and fills its bunker. Stop by a seed shed to unload.' }
  };

  // ---- shared bits
  function wheel(r, w, rim = STL) { const k = new Kit(); k.cyl(r, w, 0, -w / 2, 0, DK2, { n: 18, rz: PI / 2 }); k.cyl(r * 0.6, w + 0.02, 0, -w / 2 - 0.01, 0, rim, { n: 14, rz: PI / 2 }); k.cyl(r * 0.18, w + 0.06, 0, -w / 2 - 0.03, 0, DK, { n: 8, rz: PI / 2 }); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; k.box(w + 0.02, 0.05, 0.08, 0, Math.cos(a) * r - 0.025, Math.sin(a) * r, '#1f2125', { rx: -a, r: 0.01 }); } const g = k.build(); return g; }
  // the three-point headstock (mounted kit): the two lower link pins, the top link mast
  function headstock(k, z, w = 1.0, col = DK) { k.box(w, 0.16, 0.14, 0, 0.42, z, col, { r: 0.03 }); for (const s of [-1, 1]) { k.box(0.1, 0.5, 0.1, s * 0.42, 0.42, z, col); k.cyl(0.05, 0.16, s * 0.5, 0.48, z, STD, { n: 6, rz: PI / 2 }); } k.box(0.12, 0.7, 0.1, 0, 0.55, z - 0.05, col, { rx: 0.2 }); k.cyl(0.04, 0.6, 0, 0.62, z + 0.25, STD, { n: 6, rx: PI / 2 - 0.3 }); }
  // the PTO shaft up to the tractor, in its yellow guard
  function pto(k, y, z0, z1) { const L = z1 - z0; k.cyl(0.035, L, 0, y - L / 2, (z0 + z1) / 2, DK, { n: 6, rx: PI / 2 }); k.cyl(0.07, L * 0.7, 0, y - L * 0.35, (z0 + z1) / 2, YEL, { n: 8, rx: PI / 2 }); }
  // a drawbar out to the hitch, with its jack stand
  function drawbar(k, len, y = 0.5) { for (const s of [-1, 1]) k.box(0.08, 0.08, len, s * 0.25, y, len / 2 - 0.1, DK, { ry: s * -0.16, r: 0.02 }); k.box(0.14, 0.12, 0.24, 0, y - 0.02, len, DK, { r: 0.04 }); k.cyl(0.035, 0.45, 0.22, 0.06, len * 0.6, STD, { n: 6 }); k.cyl(0.07, 0.03, 0.22, 0.04, len * 0.6, DK, { n: 8 }); }
  const lights = (k, w, y, z) => { for (const s of [-1, 1]) { k.box(0.14, 0.09, 0.05, s * (w / 2 - 0.1), y, z, '#d8433a', { r: 0.02 }); k.box(0.14, 0.05, 0.05, s * (w / 2 - 0.1), y - 0.08, z, '#ffb340', { r: 0.02 }); } };
  const decal = (k, x, y, z, w, c, ry = 0) => k.box(w, 0.08, 0.012, x, y, z, c, { ry, r: 0.01 });

  // each model: { g, wheels (rolled by distance), spins: [{ o, axis, per }] (radians per metre travelled), len, r, mount }
  const M = {};
  M.subsoiler = () => {
    const g = new T.Group(), k = new Kit(), wheels = [];
    headstock(k, 0.95); k.box(2.4, 0.2, 0.2, 0, 0.62, 0.55, RED, { r: 0.04 }); for (const s of [-1, 1]) k.box(0.1, 0.18, 0.5, s * 0.45, 0.62, 0.8, RED);
    for (let i = 0; i < 3; i++) { const x = -0.8 + i * 0.8; k.box(0.06, 0.95, 0.14, x, -0.2, 0.42, STD, { rx: 0.25, r: 0.02 }); k.box(0.07, 0.08, 0.32, x, -0.22, 0.25, ST, { rx: -0.3, r: 0.02 }); k.box(0.12, 0.2, 0.18, x, 0.62, 0.55, REDD, { r: 0.02 }); k.cyl(0.03, 0.08, x, 0.74, 0.62, STD, { n: 6, rx: PI / 2 }); } // (three legs, their shins and points, the shear-bolt clamps)
    decal(k, 0.6, 0.66, 0.66, 0.5, YEL);
    k.box(0.06, 0.04, 2.4, 0, 0.8, 0.55, DK);
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 1.25, 0.25, 0.2); const m = wheel(0.25, 0.16); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); const a = new Kit(); a.box(0.06, 0.45, 0.06, s * 1.25, 0.25, 0.35, DK); g.add(a.build()); }
    return { g, wheels, spins: [], len: 1.0, r: 0.25, mount: true };
  };
  M.discs = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.0, 0.55); k.box(2.6, 0.12, 0.12, 0, 0.75, 0.3, ORG, { r: 0.03 }); k.box(2.6, 0.12, 0.12, 0, 0.75, -1.0, ORG, { r: 0.03 }); for (const s of [-1, 1]) k.box(0.12, 0.12, 1.4, s * 1.25, 0.75, -0.35, ORG, { r: 0.03 });
    for (const [z, sk] of [[0.0, 0.22], [-0.85, -0.22]]) {
      const gang = new T.Group(); gang.position.set(0, 0.3, z); gang.rotation.y = sk; const gk = new Kit();
      for (let i = 0; i < 9; i++) { const x = -1.1 + i * 0.275; gk.cyl(0.28, 0.025, x, -0.0125, 0, STL, { n: 18, rz: PI / 2 }); gk.cyl(0.12, 0.04, x + 0.02, -0.02, 0, STD, { n: 10, rz: PI / 2 }); }
      gk.cyl(0.035, 2.5, 0, -1.25, 0, DK, { n: 6, rz: PI / 2 }); const gm = gk.build(); const spin = new T.Group(); spin.add(gm); gang.add(spin); g.add(gang); spins.push({ o: spin, axis: 'x', per: 1 / 0.28 });
      const hk = new Kit(); for (const x of [-0.9, 0.9]) hk.box(0.1, 0.45, 0.1, x, 0.3, z, ORGD); g.add(hk.build());
    }
    lights(k, 2.6, 0.95, -1.06); decal(k, -0.6, 0.78, 0.37, 0.7, '#ffffff');
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.7, 0.32, -0.45); const m = wheel(0.32, 0.22); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.0, r: 0.32 };
  };
  M.tiller = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    headstock(k, 0.75); pto(k, 0.55, 0.3, 1.5);
    k.box(2.3, 0.08, 0.9, 0, 0.62, 0.2, ORG, { r: 0.03 }); k.box(2.3, 0.45, 0.06, 0, 0.2, 0.62, ORG, { r: 0.02 }); k.box(2.3, 0.08, 0.5, 0, 0.5, -0.32, ORG, { rx: 0.5, r: 0.02 }); // (the hood over the rotor, the back flap)
    for (const s of [-1, 1]) { k.box(0.08, 0.55, 0.9, s * 1.15, 0.1, 0.2, ORGD, { r: 0.02 }); k.box(0.06, 0.08, 0.6, s * 1.16, 0.0, 0.2, ST, { r: 0.02 }); } // (side plates and skids)
    k.box(0.3, 0.5, 0.35, 1.0, 0.65, 0.35, DK, { r: 0.05 }); k.box(0.36, 0.36, 0.2, 0, 0.75, 0.55, DK, { r: 0.04 }); // (the side drive and the gearbox)
    decal(k, -0.5, 0.45, 0.66, 0.7, '#ffffff'); k.box(2.3, 0.06, 0.08, 0, 0.0, -0.55, STD, { r: 0.02 });
    g.add(k.build());
    const rot = new T.Group(); rot.position.set(0, 0.22, 0.2); const rk = new Kit(); rk.cyl(0.07, 2.1, 0, -1.05, 0, DK, { n: 8, rz: PI / 2 }); for (let i = 0; i < 10; i++) for (let j = 0; j < 4; j++) { const a = j / 4 * PI * 2 + i * 0.6; rk.box(0.04, 0.24, 0.05, -0.95 + i * 0.21, Math.cos(a) * 0.12, Math.sin(a) * 0.12, ST, { rx: -a, r: 0.01 }); } rot.add(rk.build()); g.add(rot); spins.push({ o: rot, axis: 'x', per: 6 });
    return { g, wheels: [], spins, len: 0.9, r: 0.3, mount: true };
  };
  M.powerharrow = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    headstock(k, 0.8); pto(k, 0.6, 0.4, 1.5);
    k.box(2.5, 0.3, 0.6, 0, 0.3, 0.3, RED, { r: 0.04 }); k.box(2.5, 0.06, 0.66, 0, 0.6, 0.3, REDD, { r: 0.02 }); k.box(0.4, 0.3, 0.3, 0, 0.6, 0.45, DK, { r: 0.04 }); for (const s of [-1, 1]) k.box(0.06, 0.45, 0.7, s * 1.27, 0.15, 0.3, REDD, { r: 0.02 });
    decal(k, 0, 0.42, 0.61, 1.0, YEL); k.box(2.4, 0.04, 0.3, 0, 0.35, -0.15, RED, { rx: -0.4 });
    for (const s of [-1, 1]) k.box(0.08, 0.5, 0.08, s * 1.2, 0.2, -0.3, DK, { rx: 0.6 });
    g.add(k.build());
    for (let i = 0; i < 8; i++) { const r = new T.Group(); r.position.set(-1.05 + i * 0.3, 0.12, 0.3); const rk = new Kit(); rk.cyl(0.05, 0.1, 0, 0.05, 0, DK, { n: 6 }); for (const s of [-1, 1]) rk.box(0.04, 0.24, 0.05, s * 0.09, -0.16, 0, ST, { r: 0.01, rz: s * 0.15 }); r.add(rk.build()); g.add(r); spins.push({ o: r, axis: 'y', per: (i % 2 ? -1 : 1) * 7 }); }
    const pk = new T.Group(); pk.position.set(0, 0.2, -0.5); const kk = new Kit(); kk.cyl(0.2, 2.4, 0, -1.2, 0, STD, { n: 14, rz: PI / 2 }); for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; kk.box(2.4, 0.03, 0.03, 0, Math.cos(a) * 0.2, Math.sin(a) * 0.2, ST); } pk.add(kk.build()); g.add(pk); spins.push({ o: pk, axis: 'x', per: 1 / 0.2 });
    return { g, wheels: [], spins, len: 1.0, r: 0.2, mount: true };
  };
  M.roller = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    drawbar(k, 1.8, 0.45); k.box(2.8, 0.14, 0.14, 0, 0.55, 0.1, BLU, { r: 0.03 }); for (const x of [-1.4, -0.47, 0.47, 1.4]) k.box(0.08, 0.3, 0.6, x, 0.3, -0.2, BLUD); decal(k, 0.6, 0.6, 0.18, 0.6, '#ffffff');
    g.add(k.build());
    for (const x of [-0.93, 0, 0.93]) { const r = new T.Group(); r.position.set(x, 0.28, -0.25); const rk = new Kit(); rk.cyl(0.25, 0.86, 0, -0.43, 0, STD, { n: 16, rz: PI / 2 }); for (let i = 0; i < 9; i++) rk.cyl(0.28, 0.03, -0.4 + i * 0.1, -0.015, 0, ST, { n: 16, rz: PI / 2 }); r.add(rk.build()); g.add(r); spins.push({ o: r, axis: 'x', per: 1 / 0.28 }); }
    return { g, wheels: [], spins, len: 1.8, r: 0.28 };
  };
  M.planter = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    headstock(k, 0.8); k.box(2.8, 0.14, 0.14, 0, 0.6, 0.6, DK, { r: 0.03 });
    for (let i = 0; i < 4; i++) { const x = -1.05 + i * 0.7; k.box(0.08, 0.08, 0.6, x, 0.55, 0.3, DK); k.box(0.34, 0.36, 0.34, x, 0.75, 0.15, GRN, { r: 0.06 }); k.box(0.36, 0.05, 0.36, x, 1.11, 0.15, GRND, { r: 0.03 }); k.cyl(0.05, 0.35, x, 0.4, 0.15, DK, { n: 6 }); k.cyl(0.13, 0.03, x, 0.13, 0.35, ST, { n: 12, rz: PI / 2 }); k.box(0.12, 0.08, 0.04, x, 0.95, 0.33, YEL, { r: 0.01 });
      const pw = new T.Group(); pw.position.set(x, 0.12, -0.15); const pk = new Kit(); for (const s of [-1, 1]) pk.cyl(0.12, 0.04, s * 0.07 - 0.02, 0, 0, DK2, { n: 12, rz: PI / 2, rx: 0 }); pw.add(pk.build()); g.add(pw); spins.push({ o: pw, axis: 'x', per: 1 / 0.12 }); }
    for (const s of [-1, 1]) { k.box(0.06, 0.06, 1.2, s * 1.4, 1.0, 0.4, DK, { rx: -1.2 }); k.cyl(0.15, 0.03, s * 1.4, 1.5, 0.1, ST, { n: 12, rz: PI / 2 }); } // (the row markers, folded up)
    g.add(k.build());
    return { g, wheels: [], spins, len: 1.0, r: 0.12, mount: true };
  };
  M.potatoplanter = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.0, 0.55); k.box(1.9, 0.12, 2.0, 0, 0.45, -0.4, DK, { r: 0.03 });
    k.box(1.7, 0.7, 1.1, 0, 0.9, -0.3, RED, { r: 0.06 }); k.box(1.9, 0.1, 1.3, 0, 1.6, -0.3, REDD, { r: 0.03 }); for (let i = 0; i < 10; i++) k.ball(0.09, -0.6 + (i % 5) * 0.3, 1.6, -0.6 + Math.floor(i / 5) * 0.5, '#c9a173', { s: [1.2, 0.9, 1], n: 6 }); // (the hopper, heaped with seed potatoes)
    for (const x of [-0.45, 0.45]) { k.box(0.22, 1.1, 0.14, x, 0.25, -0.95, '#d9d2c4', { r: 0.04 }); for (let i = 0; i < 5; i++) k.cyl(0.04, 0.06, x, 0.35 + i * 0.2, -1.03, '#c9a173', { n: 6, rx: PI / 2 }); k.cyl(0.18, 0.04, x - 0.1, 0.12, -1.35, ST, { n: 12, rz: PI / 2 + 0.3 }); k.cyl(0.18, 0.04, x + 0.1, 0.12, -1.35, ST, { n: 12, rz: PI / 2 - 0.3 }); } // (the cup belts, the ridging discs)
    decal(k, 0, 1.0, 0.26, 0.8, '#ffffff'); lights(k, 1.9, 0.6, -1.42);
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 1.05, 0.38, -0.3); const m = wheel(0.38, 0.22); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.0, r: 0.38 };
  };
  M.transplanter = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 1.8, 0.5); k.box(2.2, 0.1, 0.1, 0, 0.5, 0.3, BLU, { r: 0.03 }); k.box(2.2, 0.1, 0.1, 0, 0.5, -0.9, BLU, { r: 0.03 });
    for (const x of [-0.55, 0.55]) {
      k.box(0.36, 0.06, 0.32, x, 0.75, -1.1, DK, { r: 0.04 }); k.box(0.36, 0.36, 0.06, x, 0.78, -1.26, DK, { r: 0.04 }); k.cyl(0.03, 0.3, x, 0.45, -1.1, DK, { n: 6 }); // (a seat for each planter)
      k.box(0.6, 0.04, 0.8, x, 1.15, -0.2, ST, { r: 0.01 }); for (let i = 0; i < 2; i++) { k.box(0.5, 0.06, 0.32, x, 1.19 + i * 0.12, -0.35 + i * 0.3, '#2a2630', { r: 0.01 }); for (let q = 0; q < 6; q++) k.cone(0.04, 0.12, x - 0.17 + (q % 3) * 0.17, 1.25 + i * 0.12, -0.42 + Math.floor(q / 3) * 0.16 + i * 0.3, '#5fae4a', { n: 4 }); } k.box(0.06, 0.7, 0.06, x, 0.45, -0.2, DK); // (the tray rack, seedlings ready)
      const car = new T.Group(); car.position.set(x, 0.75, -0.75); const ck = new Kit(); ck.cyl(0.24, 0.04, 0, 0, 0, '#d8433a', { n: 16 }); for (let q = 0; q < 8; q++) { const a = q / 8 * PI * 2; ck.cyl(0.04, 0.12, Math.cos(a) * 0.18, 0.02, Math.sin(a) * 0.18, ST, { n: 6 }); } car.add(ck.build()); g.add(car); spins.push({ o: car, axis: 'y', per: 2.5 }); // (the carousel of cups)
      k.cyl(0.03, 0.4, x, 0.3, -0.75, DK, { n: 6 }); k.cyl(0.12, 0.05, x - 0.08, 0.12, -0.95, ST, { n: 12, rz: PI / 2 }); k.cyl(0.12, 0.05, x + 0.08, 0.12, -0.95, ST, { n: 12, rz: PI / 2 });
    }
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 1.15, 0.3, -0.3); const m = wheel(0.3, 0.18); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 1.8, r: 0.3 };
  };
  M.spreader = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    headstock(k, 0.65); pto(k, 0.55, 0.2, 1.4);
    for (const [x, z] of [[-0.5, 0.45], [0.5, 0.45], [-0.5, -0.45], [0.5, -0.45]]) k.box(0.08, 0.7, 0.08, x, 0, z, BLUD);
    k.lathe([[0.1, 0], [0.75, 0.6], [0.8, 0.95], [0.78, 1.0]], 0, 0.55, 0, BLU, { n: 20 }); k.cyl(0.82, 0.05, 0, 1.55, 0, BLUD, { n: 20 }); k.cyl(0.78, 0.03, 0, 1.53, 0, WHT, { n: 20 }); // (the cone hopper, filled to the brim)
    k.box(0.06, 0.06, 0.9, 0, 1.6, 0, DK); k.box(0.5, 0.08, 0.012, 0, 1.0, 0.6, '#ffffff', { rx: -0.6 }); k.box(1.3, 0.15, 0.08, 0, 0.35, -0.65, ST, { r: 0.02 });
    g.add(k.build());
    for (const s of [-1, 1]) { const d = new T.Group(); d.position.set(s * 0.32, 0.42, -0.3); const dk = new Kit(); dk.cyl(0.25, 0.03, 0, 0, 0, ST, { n: 16 }); for (let q = 0; q < 4; q++) dk.box(0.24, 0.06, 0.02, Math.cos(q * PI / 2) * 0.12, 0.03, Math.sin(q * PI / 2) * 0.12, STD, { ry: -q * PI / 2 }); d.add(dk.build()); g.add(d); spins.push({ o: d, axis: 'y', per: s * 9 }); }
    return { g, wheels: [], spins, len: 0.8, r: 0.25, mount: true };
  };
  M.manure = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.4, 0.6); k.box(1.9, 0.12, 3.0, 0, 0.55, -0.6, DK, { r: 0.03 });
    k.box(1.9, 0.9, 3.0, 0, 0.67, -0.6, RED, { r: 0.04 }); k.box(1.75, 0.05, 2.85, 0, 0.7, -0.6, '#3a2a1c'); for (let i = 0; i < 9; i++) k.ball(0.32, -0.6 + (i % 3) * 0.6, 1.4, -1.6 + Math.floor(i / 3) * 0.9, '#4a3424', { s: [1.2, 0.5, 1.2], n: 8 }); // (the box, heaped with muck)
    for (const s of [-1, 1]) for (let i = 0; i < 5; i++) k.box(0.04, 0.9, 0.08, s * 0.96, 0.67, 0.6 - i * 0.6, REDD, { r: 0.01 });
    decal(k, 0.4, 1.2, 0.92, 0.7, '#ffffff'); lights(k, 1.9, 0.75, -2.15);
    g.add(k.build());
    for (const x of [-0.45, 0.45]) { const b = new T.Group(); b.position.set(x, 1.0, -2.2); const bk = new Kit(); bk.cyl(0.14, 1.3, 0, -0.65, 0, DK, { n: 8 }); for (let i = 0; i < 12; i++) { const a = i * 0.9; bk.box(0.36, 0.05, 0.05, Math.cos(a) * 0.18, -0.6 + i * 0.1, Math.sin(a) * 0.18, ST, { ry: -a }); } b.add(bk.build()); g.add(b); spins.push({ o: b, axis: 'y', per: (x < 0 ? 1 : -1) * 8 }); } // (the two upright beaters)
    for (const s of [-1, 1]) for (const z of [-0.2, -1.1]) { const w = new T.Group(); w.position.set(s * 1.1, 0.42, z); const m = wheel(0.42, 0.28); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.4, r: 0.42 };
  };
  M.lime = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.0, 0.55); k.box(1.6, 0.12, 2.4, 0, 0.5, -0.5, DK, { r: 0.03 });
    k.box(1.5, 0.9, 2.2, 0, 0.75, -0.5, '#d9d6cf', { r: 0.06 }); k.box(1.6, 0.06, 2.3, 0, 1.65, -0.5, '#c2bfb8', { r: 0.02 }); k.box(1.3, 0.04, 2.0, 0, 1.6, -0.5, '#f4f4ef');
    k.box(0.5, 0.2, 0.5, 0, 0.5, -1.75, ST, { r: 0.04 }); decal(k, 0, 1.2, 0.61, 0.6, BLU); lights(k, 1.6, 0.7, -1.62);
    g.add(k.build());
    const d = new T.Group(); d.position.set(0, 0.42, -1.9); const dk = new Kit(); dk.cyl(0.3, 0.03, 0, 0, 0, ST, { n: 16 }); for (let q = 0; q < 4; q++) dk.box(0.28, 0.06, 0.02, Math.cos(q * PI / 2) * 0.14, 0.03, Math.sin(q * PI / 2) * 0.14, STD, { ry: -q * PI / 2 }); d.add(dk.build()); g.add(d); spins.push({ o: d, axis: 'y', per: 9 });
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 0.95, 0.4, -0.4); const m = wheel(0.4, 0.24); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.0, r: 0.4 };
  };
  M.weeder = () => {
    const g = new T.Group(), k = new Kit(), spins = [];
    headstock(k, 0.7); k.box(2.6, 0.14, 0.14, 0, 0.55, 0.45, GRN, { r: 0.03 }); decal(k, 0.8, 0.58, 0.53, 0.4, '#ffffff');
    for (let i = 0; i < 5; i++) { const x = -1.0 + i * 0.5; k.box(0.06, 0.06, 0.55, x, 0.5, 0.15, DK); k.box(0.05, 0.5, 0.05, x, 0.05, -0.1, STD, { rx: 0.3 }); k.box(0.22, 0.02, 0.14, x, 0.0, -0.22, ST, { r: 0.01 }); // (each unit's parallel link, its spring tine and ducksfoot sweep)
      const fw = new T.Group(); fw.position.set(x + 0.18, 0.15, -0.35); const fk = new Kit(); fk.cyl(0.04, 0.04, 0, 0, 0, DK, { n: 8, rz: PI / 2 }); for (let q = 0; q < 10; q++) { const a = q / 10 * PI * 2; fk.box(0.02, 0.16, 0.02, 0, Math.cos(a) * 0.08, Math.sin(a) * 0.08, '#e8a03a', { rx: -a }); } fw.add(fk.build()); g.add(fw); spins.push({ o: fw, axis: 'x', per: 1 / 0.15 }); } // (the finger weeder wheels)
    g.add(k.build());
    return { g, wheels: [], spins, len: 0.9, r: 0.15, mount: true };
  };
  M.harvester = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.6, 0.6); k.box(1.9, 0.14, 3.2, 0, 0.5, -0.6, DK, { r: 0.03 });
    k.box(1.6, 0.06, 0.8, 0, 0.12, 0.9, ST, { rx: 0.35 }); for (const s of [-1, 1]) k.box(0.06, 0.5, 1.1, s * 0.82, 0.1, 0.7, GRN, { rx: 0.3 }); // (the lifting share and its side plates)
    k.box(1.4, 0.08, 1.8, 0, 0.75, 0.0, '#3a3f45', { rx: -0.45 }); for (let i = 0; i < 9; i++) k.box(1.4, 0.03, 0.04, 0, 0.45 + i * 0.1, 0.6 - i * 0.19, STD); // (the elevator web)
    k.box(1.8, 1.0, 1.6, 0, 0.6, -1.3, GRN, { r: 0.06 }); k.box(1.9, 0.08, 1.7, 0, 1.6, -1.3, GRND, { r: 0.03 }); k.box(1.6, 0.04, 1.4, 0, 1.56, -1.3, '#ff8a3d'); for (let i = 0; i < 6; i++) k.box(0.18, 0.08, 0.06, -0.5 + (i % 3) * 0.5, 1.6, -1.5 + Math.floor(i / 3) * 0.4, '#ff8a3d', { r: 0.03, ry: i }); // (the hopper, part full)
    decal(k, 0, 1.1, -0.48, 0.9, YEL); lights(k, 1.8, 0.8, -2.12);
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 1.1, 0.5, -0.9); const m = wheel(0.5, 0.3); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.6, r: 0.5 };
  };
  M.potatoharvester = () => {
    const g = new T.Group(), k = new Kit(), wheels = [], spins = [];
    drawbar(k, 2.8, 0.6); k.box(2.0, 0.14, 3.6, 0, 0.5, -0.7, DK, { r: 0.03 });
    k.box(1.2, 0.06, 0.7, -0.3, 0.12, 1.0, ST, { rx: 0.35 }); for (const s of [-1, 1]) k.box(0.06, 0.45, 0.9, -0.3 + s * 0.62, 0.1, 0.9, ORG, { rx: 0.3 });
    k.box(1.2, 0.08, 1.6, -0.3, 0.7, 0.1, '#3a3f45', { rx: -0.35 }); for (let i = 0; i < 8; i++) k.box(1.2, 0.03, 0.04, -0.3, 0.45 + i * 0.09, 0.7 - i * 0.18, STD); // (the sieving web)
    k.box(1.4, 0.06, 1.0, -0.3, 1.25, -0.8, ST, { r: 0.02 }); for (const x of [-0.95, 0.35]) k.box(0.06, 0.9, 0.06, x, 1.3, -0.8, DK); k.box(1.6, 0.05, 1.2, -0.3, 2.2, -0.8, ORG, { r: 0.02 }); for (let i = 0; i < 6; i++) k.ball(0.07, -0.7 + (i % 3) * 0.3, 1.33, -1.0 + Math.floor(i / 3) * 0.3, '#c9a173', { s: [1.2, 0.9, 1], n: 6 }); // (the picking table under its roof)
    k.box(1.6, 1.1, 1.4, 0.0, 0.6, -1.8, ORG, { r: 0.05 }); k.box(1.7, 0.08, 1.5, 0, 1.7, -1.8, ORGD, { r: 0.03 }); for (let i = 0; i < 8; i++) k.ball(0.1, -0.5 + (i % 4) * 0.33, 1.68, -2.1 + Math.floor(i / 4) * 0.5, '#c9a173', { s: [1.2, 0.9, 1], n: 6 }); // (the bunker)
    k.box(0.4, 0.1, 2.0, 1.25, 1.6, -0.9, DK, { rz: 0.35, r: 0.02 }); for (let i = 0; i < 8; i++) k.box(0.34, 0.03, 0.04, 1.25, 1.66 - i * 0.0, -1.8 + i * 0.24, STD, { rz: 0.35 }); // (the side elevator, folded along)
    decal(k, -0.3, 1.0, -1.08, 0.8, '#ffffff'); lights(k, 2.0, 0.8, -2.52);
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * 1.15, 0.5, -1.1); const m = wheel(0.5, 0.32); if (s < 0) m.rotation.y = PI; w.add(m); g.add(w); wheels.push(w); }
    return { g, wheels, spins, len: 2.8, r: 0.5 };
  };

  /* the irrigation reel (equipment, placed with the planner in a field block): a reel cart with its big drum of hose,
     a hose run out to the gun cart; it waters every planted bed in its block once a day by itself, the gun turning */
  function irrigator(kk) {
    for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) kk.box(0.1, 0.8, 0.1, x, 0, z, BLUD);
    kk.box(1.9, 0.12, 1.5, 0, 0.75, 0, BLU, { r: 0.03 }); kk.cyl(0.75, 1.1, 0, 1.6 - 0.55, 0, BLU, { n: 22, rz: PI / 2 }); kk.cyl(0.6, 1.12, 0, 1.6 - 0.56, 0, DK2, { n: 22, rz: PI / 2 });
    for (let i = 0; i < 5; i++) kk.torus(0.63 + (i % 2) * 0.03, 0.05, -0.4 + i * 0.2, 1.6, 0, '#2a2d31', { ry: PI / 2 });
    for (const s of [-1, 1]) { kk.cyl(0.35, 0.18, s * 0.95, 0.26, 0.2, DK2, { n: 14, rz: PI / 2 }); kk.cyl(0.2, 0.2, s * 0.96, 0.25, 0.2, STL, { n: 10, rz: PI / 2 }); }
    kk.box(0.5, 0.4, 0.4, 0.75, 1.0, -0.4, DK, { r: 0.05 }); kk.box(0.08, 0.08, 1.4, 0, 0.6, 1.3, DK, { r: 0.02 });
    kk.cyl(0.05, 1.6, 0, 0.06 - 0.8, 1.55, '#2a2d31', { n: 6, rx: PI / 2 }); // (the hose out to the gun cart)
    kk.box(0.8, 0.08, 0.6, 0, 0.35, 2.6, ST, { r: 0.02 }); for (const s of [-1, 1]) kk.cyl(0.18, 0.08, s * 0.4, 0.14, 2.6, DK2, { n: 10, rz: PI / 2 }); kk.cyl(0.05, 0.6, 0, 0.4, 2.6, STD, { n: 6 });
  }
  function irrigatorGun() { const k = new Kit(); k.cyl(0.06, 0.25, 0, 0, 0, ST, { n: 8 }); k.cyl(0.05, 0.7, 0, 0.3, 0.3, STL, { n: 8, rx: 1.0 }); k.cone(0.07, 0.15, 0, 0.55, 0.62, ST, { n: 8, rx: 1.0 }); k.box(0.04, 0.2, 0.25, 0.08, 0.32, 0.4, DK, { r: 0.01 }); return k.build(); }

  IH.farmMachines = { DEFS, has: kind => !!M[kind], model: kind => M[kind](), irrigator, irrigatorGun };
})();
