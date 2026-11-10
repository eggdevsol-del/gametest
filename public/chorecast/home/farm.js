/* Chorecast homes (a prototype): the Farm paddock, renovated by the kid. The farm is built from the save, so it's
   theirs to lay out: paddocks fenced wherever they like (a gate on the side nearest the track), fittings put inside
   paddocks (water troughs, hen houses, duck ponds, pig arks, shelters, hay feeders), farm equipment anywhere (a
   milking stand, a shearing stand, beehives, a tractor and a quad bike to drive, a water tank, a wheelbarrow), feed
   bought at the barn (grain for poultry, hay for grazers, nuts for pigs), and a whole farmyard of animals, each
   living in a paddock of its own.
   What animals make needs looking after: fed (every day: grain, hay or nuts, one serving each), water in their
   paddock, and the right place or gear (hens and turkeys a hen house; ducks and geese a pond; pigs an ark; milk a
   milking stand; wool a shearing stand). A rooster doubles the eggs of the hens he lives with.
   Save (st.farm, v 2): { paddocks: [{ id, x0, z0, x1, z1 }], items: [{ id, t, x, z, ry }], animals: [{ id, kind,
   pad, got }], feed: { grain, hay, nuts }, fed: { [paddock id]: day } }. Version 1 saves (animal counts) move over.
   islands-build.js's farm is replaced by this one (IH.islandsBuild.add('farm')), and village.js runs it with the
   acts and the planner from IH.villageFarm(ctx). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit || !IH.islandsBuild) return;
  const { Kit } = IH.kit, IB = IH.islandsBuild, K = IB.kit, { rng, bx, sides, board, signpost, gate: hangGate } = K;
  const W = 52, D = 60, DAY = 864e5, today = () => Math.floor(Date.now() / DAY);
  const TRACK = [[24, 0.4, 28, 16], [6, 13, 51, 17], [47.6, 13, 51, 45]], MEADOW = [4, 45.5, 48, 58], BARN = [6.6, 2.2, 17.4, 9.8], FENCE_XP = 8;

  // ---------- what there is: animals (price, room each, what they eat, what they make, what they need), fittings, equipment
  const ANIMALS = {
    hen: { name: 'Hen', e: '🐔', xp: 250, room: 2, eats: 'grain', makes: 'egg', n: 1, every: 1, needs: 'coop' },
    rooster: { name: 'Rooster', e: '🐓', xp: 300, room: 2, eats: 'grain', about: 'Doubles the eggs of the hens in his paddock.' },
    duck: { name: 'Duck', e: '🦆', xp: 220, room: 2, eats: 'grain', makes: 'egg', n: 1, every: 1, needs: 'pond' },
    goose: { name: 'Goose', e: '🪿', xp: 300, room: 3, eats: 'grain', makes: 'egg', n: 1, every: 2, needs: 'pond' },
    turkey: { name: 'Turkey', e: '🦃', xp: 400, room: 3, eats: 'grain', makes: 'egg', n: 1, every: 2, needs: 'coop' },
    goat: { name: 'Goat', e: '🐐', xp: 450, room: 6, eats: 'hay', makes: 'milk', n: 1, every: 1, needs: 'milkstand' },
    cow: { name: 'Cow', e: '🐄', xp: 650, room: 14, eats: 'hay', makes: 'milk', n: 2, every: 1, needs: 'milkstand' },
    highland: { name: 'Highland cow', e: '🐂', xp: 800, room: 14, eats: 'hay', about: 'Shaggy and gentle. Just for love.' },
    merino: { name: 'Merino sheep', e: '🐑', xp: 400, room: 6, eats: 'hay', makes: 'wool', n: 1, every: 2, needs: 'shearstand' },
    alpaca: { name: 'Alpaca', e: '🦙', xp: 700, room: 8, eats: 'hay', makes: 'wool', n: 2, every: 2, needs: 'shearstand' },
    llama: { name: 'Llama', e: '🦙', xp: 750, room: 8, eats: 'hay', makes: 'wool', n: 1, every: 2, needs: 'shearstand' },
    kunekune: { name: 'Kunekune pig', e: '🐷', xp: 350, room: 6, eats: 'nuts', makes: 'truffle', n: 1, every: 2, needs: 'sty' },
    donkey: { name: 'Donkey', e: '🫏', xp: 600, room: 10, eats: 'hay', about: 'A gentle friend. Keeps the others calm.' },
    pony: { name: 'Pony', e: '🐎', xp: 900, room: 12, eats: 'hay', about: 'To pat and brush. Rides are at the Stable yard.' }
  };
  const FEED = { grain: { name: 'Poultry grain', e: '🌾', xp: 60, n: 10 }, hay: { name: 'Hay', e: '🟨', xp: 80, n: 10 }, nuts: { name: 'Pig nuts', e: '🥜', xp: 60, n: 10 } };
  // in: inside a paddock (a fitting) or out (equipment, anywhere but in one)
  const ITEMS = {
    trough: { name: 'Water trough', e: '💧', xp: 120, fp: [3, 1.2], in: true, about: 'Animals need water in their paddock to make anything.' },
    feeder: { name: 'Hay feeder', e: '🪣', xp: 150, fp: [2, 2], in: true, about: 'Keeps the hay off the ground.' },
    coop: { name: 'Hen house', e: '🏠', xp: 400, fp: [3.6, 2.6], in: true, about: 'Hens and turkeys lay in it.' },
    pond: { name: 'Duck pond', e: '🫧', xp: 350, fp: [4, 3], in: true, about: 'Ducks and geese lay by it.' },
    sty: { name: 'Pig ark', e: '🛖', xp: 250, fp: [3, 2.4], in: true, about: 'Pigs sleep in it, and root for truffles.' },
    shelter: { name: 'Field shelter', e: '⛺', xp: 300, fp: [4, 3], in: true, about: 'Shade and a dry place for the big animals.' },
    milkstand: { name: 'Milking stand', e: '🥛', xp: 300, fp: [2.8, 1.6], in: false, about: 'Milk your goats and cows here.' },
    shearstand: { name: 'Shearing stand', e: '✂️', xp: 300, fp: [3, 2.6], in: false, about: 'Shear sheep, alpacas and llamas here.' },
    beehive: { name: 'Beehive', e: '🐝', xp: 250, fp: [1.6, 1.6], in: false, about: 'Two jars of honey every three days.' },
    tank: { name: 'Water tank', e: '🛢️', xp: 200, fp: [2.4, 2.4], in: false },
    hay: { name: 'Hay bales', e: '🟫', xp: 60, fp: [3, 2], in: null },
    barrow: { name: 'Wheelbarrow', e: '🛒', xp: 80, fp: [1.4, 1], in: null },
    churns: { name: 'Milk churns', e: '🥛', xp: 60, fp: [1.6, 1], in: null },
    tractor: { name: 'Tractor', e: '🚜', xp: 1500, fp: [2.6, 4.0], in: false, about: 'Drive it round the farm.' },
    quad: { name: 'Quad bike', e: '🏍️', xp: 900, fp: [1.6, 2.4], in: false, about: 'Zoom round the farm.' }
  };
  const NEEDS_NAME = { coop: 'a hen house', pond: 'a duck pond', sty: 'a pig ark', milkstand: 'a milking stand', shearstand: 'a shearing stand' };

  // ---------- the save: made, and version 1 farms moved over (their hen run, big paddock and fittings as they were)
  const nid = () => Math.random().toString(36).slice(2, 9);
  function state(st) {
    const f = st || {}; if (f.v === 2) return f;
    const old = f.animals || { hen: 3, goat: 1 }, run = { id: 'run', x0: 31, z0: 1.2, x1: 45, z1: 11.6 }, big = { id: 'big', x0: 5, z0: 19, x1: 47, z1: 41 };
    const animals = []; for (const [kind, n] of Object.entries(old)) for (let i = 0; i < n; i++) animals.push({ id: nid(), kind, pad: kind === 'hen' ? 'run' : 'big', got: (f.got || {})[kind] || 0 });
    const items = [['coop', 36, 4.4, 0], ['trough', 38, 9.6, 0], ['trough', 16, 24, 0], ['hay', 41, 24, 0.3], ['feeder', 30, 24, 0], ['shelter', 42, 35, 0], ['milkstand', 8.6, 11.4, 0], ['shearstand', 49, 9, 0], ['tractor', 20.5, 11.6, -0.4], ['churns', 18.6, 3.2, 0]].map(([t, x, z, ry]) => ({ id: nid(), t, x, z, ry }));
    for (const k of Object.keys(f)) delete f[k];
    return Object.assign(f, { v: 2, paddocks: [run, big], items, animals, feed: { grain: 10, hay: 10, nuts: 0 }, fed: {} });
  }
  const inPad = (p, x, z, m = 0) => x > p.x0 + m && x < p.x1 - m && z > p.z0 + m && z < p.z1 - m;
  const padOf = (f, x, z) => f.paddocks.find(p => inPad(p, x, z, 0.3));
  const area = p => (p.x1 - p.x0) * (p.z1 - p.z0);
  const used = (f, p) => f.animals.filter(a => a.pad === p.id).reduce((s, a) => s + ANIMALS[a.kind].room, 0);
  // the gate: in the middle of the side nearest the track
  function gateOf(p) { const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, d = { n: Math.abs(p.z0 - 15), s: Math.abs(p.z1 - 15), w: Math.abs(p.x0 - 26), e: Math.abs(p.x1 - 26) }; const side = Object.keys(d).sort((a, b) => d[a] - d[b])[0]; return side === 'n' ? { side, x: cx, z: p.z0 } : side === 's' ? { side, x: cx, z: p.z1 } : side === 'w' ? { side, x: p.x0, z: cz } : { side, x: p.x1, z: cz }; }
  const outside = (g, d = 1.4) => (g.side === 'n' ? [g.x, g.z - d] : g.side === 's' ? [g.x, g.z + d] : g.side === 'w' ? [g.x - d, g.z] : [g.x + d, g.z]);

  // ---------- the models: fittings and equipment, all Kit-built like everything else
  function itemModel(t, kk) {
    if (t === 'trough') { bx(kk, 3, 0.8, 1.0, 0, 0, 0, '#8f9aa8', { r: 0.06 }); kk.waterBox(2.7, 0.1, 0.7, 0, 0.62, 0, { tint: '#6fc0d8' }); }
    else if (t === 'feeder') { for (const [a, b] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) bx(kk, 0.12, 1.4, 0.12, a, 0, b, '#6b4a33'); bx(kk, 1.8, 0.7, 1.8, 0, 0.5, 0, '#c9a173', { r: 0.04 }); kk.ball(0.9, 0, 1.3, 0, '#e8c45a', { s: [1, 0.5, 1], n: 9 }); kk.cone(1.4, 0.6, 0, 1.6, 0, '#7a6a5a', { n: 4, ry: Math.PI / 4 }); }
    else if (t === 'coop') { bx(kk, 3.2, 2.0, 2.2, 0, 0.5, 0, '#f2e1b8', { r: 0.05 }); for (const a of [-1.4, 1.4]) for (const b of [-0.9, 0.9]) kk.cyl(0.08, 0.55, a, 0, b, '#8a6038', { n: 5 }); kk.cone(2.4, 1.0, 0, 2.5, 0, '#5a7aa8', { n: 4, ry: Math.PI / 4, s: [1, 1, 0.8] }); bx(kk, 0.6, 0.7, 0.1, 0, 0.9, 1.12, '#3d2a24'); kk.box(0.4, 0.06, 1.4, 0, 0.3, 1.7, '#c9a173', { rx: 0.5 }); }
    else if (t === 'pond') { kk.cyl(1, 0.14, 0, 0, 0, '#8f8a99', { s: [2.1, 1, 1.6], n: 24 });  for (let i = 0; i < 3; i++) kk.cyl(0.3, 0.04, -0.8 + i * 0.7, 0.16, 0.3 * (i % 2 ? 1 : -1), '#5fae4a', { n: 8 }); kk.cyl(0.04, 1.0, 1.6, 0, -1.0, '#6f9a42', { n: 3 }); kk.cyl(0.04, 1.2, 1.75, 0, -0.9, '#6f9a42', { n: 3 }); }
    else if (t === 'sty') { kk.cyl(1.2, 2.6, 0, 0, 0, '#9aa0aa', { n: 14, rx: Math.PI / 2, s: [1.1, 1, 1] }); bx(kk, 2.6, 0.1, 2.4, 0, -0.05, 0, '#6b4a33'); kk.ball(0.75, 0, 0.7, 1.3, '#2a2420', { s: [1, 1, 0.1], n: 10 }); }
    else if (t === 'shelter') { for (const [a, b] of [[-1.9, -1.4], [1.9, -1.4], [-1.9, 1.4], [1.9, 1.4]]) bx(kk, 0.15, 2.4, 0.15, a, 0, b, '#6b4a33'); bx(kk, 4.2, 0.2, 3.2, 0, 2.4, 0, '#a8673f', { rx: 0.12 }); bx(kk, 4, 1.6, 0.12, 0, 0.6, -1.45, '#9c6b45'); }
    else if (t === 'milkstand') { bx(kk, 2.6, 0.3, 1.4, 0, 0, 0, '#c9a173'); for (const s of [-1, 1]) bx(kk, 0.15, 1.6, 0.15, s * 1.2, 0, -0.6, '#8a6038'); bx(kk, 2.6, 0.15, 0.15, 0, 1.5, -0.6, '#8a6038'); kk.cyl(0.25, 0.4, 0.8, 0.3, 0.6, '#c9ccd2', { n: 10 }); kk.cyl(0.22, 0.45, -0.9, 0, 0.6, '#6b4a33', { n: 8 }); }
    else if (t === 'shearstand') { bx(kk, 3, 0.25, 2.4, 0, 0, 0, '#b7834f'); bx(kk, 3, 1.4, 0.12, 0, 0.25, -1.1, '#9c6b45'); kk.cyl(0.05, 1.8, 1.2, 0, -1.0, '#8a8f98', { n: 5 }); bx(kk, 0.5, 0.15, 0.3, 1.2, 1.8, -0.9, '#3d4048'); for (let i = 0; i < 3; i++) kk.ball(0.28, -1 + i * 0.5, 0.45, 0.6, '#f4ecdc', { n: 7 }); }
    else if (t === 'beehive') { bx(kk, 1.4, 0.3, 1.4, 0, 0, 0, '#8a6038'); for (let j = 0; j < 3; j++) bx(kk, 1.3, 0.45, 1.3, 0, 0.3 + j * 0.47, 0, j % 2 ? '#ffd35a' : '#f2c14a', { r: 0.04 }); bx(kk, 1.5, 0.15, 1.5, 0, 1.75, 0, '#c9a173'); }
    else if (t === 'tank') { kk.cyl(1.1, 2.2, 0, 0, 0, '#8f9aa8', { n: 14 }); kk.cyl(1.15, 0.2, 0, 2.2, 0, '#7a8592', { n: 14 }); }
    else if (t === 'hay') { for (const [a, b, ry] of [[-0.7, 0, 0.3], [0.8, 0.2, 1.2], [0, 0.4, 0.6]]) kk.cyl(0.6, 1.1, a, 0, b, '#e8c45a', { n: 12, rz: Math.PI / 2, ry }); }
    else if (t === 'barrow') { bx(kk, 0.9, 0.4, 0.7, 0, 0.35, 0, '#3f86b0', { r: 0.06 }); kk.cyl(0.2, 0.08, 0, 0.2, 0.55, '#2a2630', { n: 10, rz: Math.PI / 2 }); for (const s of [-0.3, 0.3]) kk.box(0.06, 0.06, 0.8, s, 0.5, -0.6, '#8a6038'); }
    else if (t === 'churns') for (const a of [-0.4, 0.4]) { kk.cyl(0.3, 0.9, a, 0, 0, '#c9ccd2', { n: 10 }); kk.cyl(0.2, 0.2, a, 0.9, 0, '#c9ccd2', { n: 8 }); }
    else if (t === 'tractor') tractorModel(kk);
    else if (t === 'quad') { bx(kk, 1.0, 0.5, 1.8, 0, 0.5, 0, '#3a8a4a', { r: 0.12 }); bx(kk, 0.6, 0.2, 0.7, 0, 1.0, -0.2, '#2a2630', { r: 0.06 }); kk.cyl(0.04, 0.5, 0, 1.0, 0.7, '#3d4048', { n: 4 }); bx(kk, 0.8, 0.06, 0.06, 0, 1.45, 0.7, '#3d4048'); for (const s of [-1, 1]) for (const b of [-0.65, 0.65]) kk.cyl(0.32, 0.3, s * 0.6, 0.32, b, '#2a2630', { n: 10, rz: Math.PI / 2 }); }
  }
  // A farm tractor, front +z: the bonnet and grille over the engine, a stack, the big treaded back wheels under
  // mudguards and the small front ones, and the cab: a floor, a sprung seat with a backrest (TRACTOR_SEAT: where you
  // sit), the steering wheel on its column, four posts, a roof, glass at the front and back (open sides, so you're seen).
  const TRACTOR_SEAT = { x: 0, y: 1.42, z: -0.62, back: -0.98 };
  function tractorModel(kk) {
    const RED = '#d8433a', DK = '#2a2630';
    bx(kk, 1.0, 0.5, 3.6, 0, 0.55, 0.1, '#3d4048', { r: 0.06 }); // the chassis
    bx(kk, 1.2, 0.95, 1.9, 0, 0.9, 0.95, RED, { r: 0.14 }); bx(kk, 1.1, 0.1, 1.8, 0, 1.85, 0.95, '#c23a31', { r: 0.05 }); // the bonnet
    bx(kk, 1.0, 0.7, 0.1, 0, 0.98, 1.92, '#3d4048', { r: 0.03 }); for (let i = 0; i < 5; i++) bx(kk, 0.9, 0.05, 0.04, 0, 1.06 + i * 0.12, 1.98, '#9aa0aa');
    for (const s of [-1, 1]) kk.ball(0.12, s * 0.42, 1.55, 1.92, '#fff3c0', { n: 8 }); // headlights
    kk.cyl(0.07, 1.1, 0.42, 1.8, 1.4, '#3d4048', { n: 6 }); kk.cyl(0.09, 0.08, 0.42, 2.9, 1.4, '#3d4048', { n: 6 }); // the stack
    for (const s of [-1, 1]) { kk.box(0.62, 0.08, 1.6, s * 0.98, 1.95, -0.62, RED, { r: 0.04 }); kk.box(0.62, 0.7, 0.08, s * 0.98, 1.3, 0.2, RED); kk.cyl(0.05, 1.7, 0, 0.92 - 0.85, -0.62, '#3d4048', { n: 6, rz: Math.PI / 2 }); kk.cyl(0.05, 1.3, 0, 0.48 - 0.65, 1.45, '#3d4048', { n: 6, rz: Math.PI / 2 }); } // the mudguards; the axles (the wheels turn on them: tractorWheels)
    bx(kk, 0.3, 0.2, 0.3, 0, 0.75, -1.72, '#3d4048', { r: 0.03 }); // the hitch
    bx(kk, 1.5, 0.08, 1.4, 0, 1.08, -0.55, '#3d4048'); // the cab floor
    // the seat: a sprung post, the cushion, the backrest (against which you sit)
    kk.cyl(0.07, 0.2, 0, 1.12, TRACTOR_SEAT.z, '#3d4048', { n: 6 }); bx(kk, 0.7, 0.12, 0.62, 0, TRACTOR_SEAT.y - 0.12, TRACTOR_SEAT.z, '#2a2630', { r: 0.05 });
    kk.box(0.7, 0.7, 0.12, 0, TRACTOR_SEAT.y - 0.06, TRACTOR_SEAT.back, '#2a2630', { r: 0.05, rx: -0.12 });
    // the steering wheel on its column, angled to you
    kk.cyl(0.04, 0.75, 0, 1.15, 0.12, '#3d4048', { n: 6, rx: -0.5 }); kk.torus(0.22, 0.035, 0, 1.85, -0.1, DK, { rx: Math.PI / 2 - 0.5 });
    // the cab: four posts, the roof, glass front and back
    for (const [x, z] of [[-0.72, -1.22], [0.72, -1.22], [-0.72, 0.14], [0.72, 0.14]]) kk.cyl(0.05, 1.95, x, 1.12, z, '#3d4048', { n: 6 });
    bx(kk, 1.7, 0.12, 1.65, 0, 3.07, -0.54, RED, { r: 0.05 }); bx(kk, 1.76, 0.06, 1.71, 0, 3.0, -0.54, '#ffffff');
    kk.glassBox(1.36, 1.15, 0.04, 0, 1.85, 0.14, { tint: '#d8eef8' }); kk.glassBox(1.36, 1.6, 0.04, 0, 1.4, -1.22, { tint: '#d8eef8' });
  }
  // A farm windpump: a tapering lattice tower (four legs, braces round each face, crossed on the sides), a little
  // deck and the gearbox head on top, the pump rod down the middle to a pipe and trough at the foot, a tail vane
  // behind that keeps it to the wind, and the rotor: a hub on its shaft with 18 vanes fanned out round it, two rings
  // binding them. Only the rotor turns (about its shaft).
  const strut = (kk, a, b, r, col) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); kk.cyl(r, L, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - L / 2, (a[2] + b[2]) / 2, col, { n: 5, rx: Math.atan2(dz, dy), rz: -Math.asin(dx / L) }); };
  function windpump(x, z) {
    const H = 7.0, B0 = 1.0, B1 = 0.28, GALV = '#9aa0aa', DARK = '#6f7480', at = (sx, sz, y) => { const w = B0 + (B1 - B0) * (y / H); return [sx * w, y, sz * w]; };
    const tower = kk => {
      const C = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sz] of C) strut(kk, at(sx, sz, 0), at(sx, sz, H), 0.06, GALV);
      for (const y of [1.6, 3.2, 4.6, 5.9]) for (let i = 0; i < 4; i++) { const [ax, az] = C[i], [bx2, bz2] = C[(i + 1) % 4]; strut(kk, at(ax, az, y), at(bx2, bz2, y), 0.035, GALV); }
      for (const [y0, y1] of [[0.1, 1.6], [1.6, 3.2], [3.2, 4.6]]) for (let i = 0; i < 4; i++) { const [ax, az] = C[i], [bx2, bz2] = C[(i + 1) % 4]; strut(kk, at(ax, az, y0), at(bx2, bz2, y1), 0.025, DARK); strut(kk, at(bx2, bz2, y0), at(ax, az, y1), 0.025, DARK); }
      for (const [sx, sz] of C) kk.box(0.3, 0.12, 0.3, sx * B0, 0, sz * B0, '#a9a297', { r: 0.03 }); // the feet on their pads
      kk.box(1.0, 0.08, 1.0, 0, H, 0, '#8a6038', { r: 0.02 }); // the deck
      kk.box(0.5, 0.42, 0.62, 0, H + 0.08, 0.05, DARK, { r: 0.08 }); kk.cyl(0.07, 0.5, 0, H + 0.29 - 0.25, 0.55, GALV, { n: 8, rx: Math.PI / 2 }); // the gearbox, the shaft out the front
      kk.cyl(0.03, H + 0.1, 0, 0, 0, '#c9ccd2', { n: 5 }); kk.cyl(0.06, 0.9, 0, 0, 0.0, DARK, { n: 8 }); // the pump rod down the middle, the pump at the foot
      kk.cyl(0.05, 1.2, 0.6, 0.45 - 0.6, 0.0, DARK, { n: 6, rz: Math.PI / 2 }); kk.box(1.2, 0.5, 0.6, 1.5, 0, 0, '#8f9aa8', { r: 0.05 }); kk.waterBox(1.05, 0.06, 0.45, 1.5, 0.42, 0, { tint: '#6fc0d8' }); // the pipe and the little trough
      kk.cyl(0.03, 2.2, 0, H + 0.29 - 1.1, -1.15, GALV, { n: 5, rx: Math.PI / 2 }); kk.box(0.03, 0.9, 1.2, 0, H - 0.18, -2.2, '#e9e2d4', { r: 0.01 }); kk.box(0.035, 0.12, 1.2, 0, H + 0.62, -2.2, '#c94a4a', { r: 0.01 }); // the tail vane on its boom
    };
    const rk = new Kit(); rk.cyl(0.16, 0.22, 0, -0.11, 0, DARK, { n: 10, rx: Math.PI / 2 }); rk.ball(0.12, 0, 0, 0.14, GALV, { n: 8 });
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, r0 = 0.32, L = 1.32; rk.box(0.3, L, 0.035, Math.sin(a) * (r0 + L / 2), Math.cos(a) * (r0 + L / 2) - L / 2, 0, i % 2 ? '#e9e2d4' : '#d6d2c8', { rz: -a, r: 0.01 }); } // vanes, fanned out from the hub
    for (const R of [0.85, 1.6]) rk.torus(R, 0.03, 0, 0, 0.02, GALV); // the rings that bind them
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; rk.box(0.04, 1.3, 0.04, Math.sin(a) * 0.95, Math.cos(a) * 0.95 - 0.65, -0.03, GALV, { rz: -a }); } // arms from the hub
    const rotor = rk.build(); rotor.position.set(x, H + 0.29, z + 0.85); rotor.userData.spin = 1.4;
    return { tower, rotor };
  }
  // The tractor's wheels, each its own part: the big back ones roll on their axle, the small front ones roll and
  // steer on their pivots. A wheel: tyre, tread lugs across it, the hub. { rear: [groups], pivots: [groups], front: [groups] }
  const R_REAR = 0.92, R_FRONT = 0.48, WHEELBASE = 2.07;
  function wheel(r, w) {
    const k = new Kit(), DK = '#2a2630', n = Math.round(r * 15);
    k.cyl(r, w, 0, -w / 2, 0, DK, { n: 20, rz: Math.PI / 2 }); k.cyl(r * 0.46, w + 0.02, 0, -(w + 0.02) / 2, 0, '#e8c45a', { n: 14, rz: Math.PI / 2 });
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; k.box(w * 1.04, 0.1, r * 0.22, 0, Math.sin(a) * (r - 0.04) - 0.05, Math.cos(a) * (r - 0.04), DK, { rx: Math.PI / 2 - a, r: 0.02 }); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.ball(r * 0.06, w / 2 + 0.01, Math.sin(a) * r * 0.25, Math.cos(a) * r * 0.25, '#8a8f98', { n: 5 }); } // wheel nuts (to see it turn)
    return k.build();
  }
  function tractorWheels(g) {
    const rear = [], pivots = [], front = [];
    for (const s of [-1, 1]) {
      const w = new T.Group(); w.position.set(s * 0.98, R_REAR, -0.62); const m = wheel(R_REAR, 0.55); if (s < 0) m.rotation.y = Math.PI; w.add(m); g.add(w); rear.push(w);
      const p = new T.Group(); p.position.set(s * 0.78, R_FRONT, 1.45); const f = new T.Group(), fm = wheel(R_FRONT, 0.34); if (s < 0) fm.rotation.y = Math.PI; f.add(fm); p.add(f); g.add(p); pivots.push(p); front.push(f);
    }
    return { rear, pivots, front };
  }
  // Things it pulls (on the hitch behind): a round baler (the pickup reel in front, the bale chamber, its own two
  // wheels) and a flatbed trailer (a drawbar, a deck with rails, two wheels; bales ride on it).
  function implementModel(kind) {
    const g = new T.Group(), k = new Kit(), wheels = [];
    if (kind === 'baler') { k.box(0.1, 0.1, 1.5, 0, 0.55, 1.1, '#3d4048'); k.box(2.0, 1.4, 1.5, 0, 0.45, -0.1, '#2f8a4f', { r: 0.12 }); k.cyl(0.72, 2.02, 0, 0.92 - 1.01, -0.4, '#26703f', { n: 18, rz: Math.PI / 2 }); k.box(2.2, 0.35, 0.5, 0, 0.12, 0.8, '#e8c45a', { r: 0.06 }); for (let i = 0; i < 6; i++) k.box(0.05, 0.28, 0.05, -0.9 + i * 0.36, 0.1, 1.02, '#8a8f98'); }
    else { k.box(0.1, 0.1, 1.6, 0, 0.55, 1.4, '#3d4048'); k.box(2.0, 0.18, 2.8, 0, 0.62, -0.4, '#b7834f', { r: 0.04 }); for (const s of [-1, 1]) k.box(0.08, 0.4, 2.8, s * 0.98, 0.8, -0.4, '#8a6038'); k.box(2.0, 0.4, 0.08, 0, 0.8, -1.8, '#8a6038'); }
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * (kind === 'baler' ? 1.12 : 1.1), 0.45, -0.3); const m = wheel(0.45, 0.3); if (s < 0) m.rotation.y = Math.PI; w.add(m); g.add(w); wheels.push(w); }
    const load = new T.Group(); load.position.set(0, 0.72, -0.4); g.add(load);
    return { g, wheels, load, len: kind === 'baler' ? 1.9 : 2.2, r: 0.45 };
  }
  // a round bale of hay, lying on its side
  function baleModel() { const k = new Kit(); k.cyl(0.62, 1.15, 0, -0.575, 0, '#e8c45a', { n: 16, rz: Math.PI / 2 }); for (const s of [-1, 1]) { k.cyl(0.56, 0.02, s * 0.585, -0.01, 0, '#d9b24a', { n: 16, rz: Math.PI / 2 }); k.torus(0.32, 0.02, s * 0.59, 0, 0, '#c9a03a', { ry: Math.PI / 2 }); } const g = k.build(); g.position.y = 0.62; const o = new T.Group(); o.add(g); return o; }
  function fence(k, p, gate, root, gates) {
    const sides = [[[p.x0, p.z0], [p.x1, p.z0], 'n'], [[p.x1, p.z0], [p.x1, p.z1], 'e'], [[p.x1, p.z1], [p.x0, p.z1], 's'], [[p.x0, p.z1], [p.x0, p.z0], 'w']];
    const runs = []; for (const [a, b, s] of sides) { if (s !== gate.side) { runs.push([a, b]); continue; } const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u0 = (L / 2 - 1.6) / L, u1 = (L / 2 + 1.6) / L, at = u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; runs.push([a, at(u0)], [at(u1), b]); if (root) gates.push(hangGate(k, root, at(u0), at(u1))); }
    for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) continue; const n = Math.max(1, Math.round(L / 2.2)), ry = -Math.atan2(b[1] - a[1], b[0] - a[0]); for (let i = 0; i <= n; i++) bx(k, 0.22, 1.5, 0.22, a[0] + (b[0] - a[0]) * i / n, 0, a[1] + (b[1] - a[1]) * i / n, '#e9e2d4'); for (const y of [0.55, 1.15]) k.box(L, 0.14, 0.08, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, '#e9e2d4', { ry }); }
    return runs;
  }

  // ---------- the farm, from its save
  function build(st0) {
    const f = state(st0), R = rng(5150), k = new Kit(), solids = [], spots = [], animals = [], root = new T.Group();
    const solid = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    bx(k, W, 0.42, D, W / 2, -0.42, D / 2, '#9a7a52', { r: 0.18, seg: 2 }); sides(k, W, D, R, '#8a7452');
    bx(k, W - 0.4, 0.04, D - 0.4, W / 2, 0, D / 2, '#7fbf5c', { r: 0.02 });
    for (const [x0, z0, x1, z1] of TRACK) bx(k, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, '#b89668', { r: 0.03 });
    // the barn (the farm shop and the planner), the windmill, the signpost: always there
    k.at(12, 0, 6, 0, kk => {
      bx(kk, 10, 5.2, 7, 0, 0, 0, '#b8402f', { r: 0.06 }); for (let i = 0; i < 12; i++) bx(kk, 0.06, 5.2, 0.04, -4.6 + i * 0.84, 0, 3.52, '#9c3426');
      kk.at(0, 5.2, 0, 0, k2 => { for (const s of [-1, 1]) bx(k2, 5.9, 0.3, 7.6, s * 2.45, 1.0, 0, '#5a4a4a', { rz: s * -0.62, r: 0.04 }); });
      for (const s of [-1, 1]) { bx(kk, 2.0, 3.6, 0.14, s * 1.05, 0, 3.55, '#9c3426'); bx(kk, 0.14, 3.6, 0.16, s * 1.98, 0, 3.6, '#ffffff'); kk.box(2.4, 0.14, 0.16, s * 1.05, 1.8, 3.62, '#ffffff', { rz: s * 1.0 }); }
      bx(kk, 1.8, 1.4, 0.14, 0, 6.0, 3.56, '#3d2a24');
    });
    board(k, 'barn2', 'FARM SHOP', 'animals · feed · planner', '#fff6e0', '#b8402f', 3.6, 1.0, 12, 4.4, 9.62); solid(...BARN);
    spots.push({ kind: 'fbarn', id: 'barn', name: 'the barn', at: [12, 10.8], yaw: Math.PI, hit: [12, 9.6, 0, 4] });
    { const W0 = windpump(3.2, 15); k.at(3.2, 0, 15, 0, W0.tower); root.add(W0.rotor); solid(2.0, 13.8, 4.4, 16.2); }
    signpost(k, 22.4, 2.4, 'farm'); solid(22.1, 2.1, 22.7, 2.7); spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [23.8, 3.6], yaw: Math.PI, hit: [22.4, 2.4, 0, 2.4] });
    // the paddocks: fences, a gate, and the gate's spot (feeding, who lives here)
    const gates = [], pads = f.paddocks.map(p => { const g = gateOf(p), runs = fence(k, p, g, root, gates); for (const [a, b] of runs) solid(a[0] - 0.2, a[1] - 0.2, b[0] + 0.2, b[1] + 0.2); const at = outside(g); spots.push({ kind: 'fgate', id: 'gate' + p.id, pad: p.id, name: 'the paddock gate', at, yaw: Math.atan2(g.x - at[0], g.z - at[1]), hit: [g.x, g.z, 0, 2.6] }); return { p, g }; });
    // fittings and equipment
    const models = {}, vehicles = {};
    for (const it of f.items) { const d = ITEMS[it.t]; if (!d) continue; const g = new T.Group(), kk = new Kit(); itemModel(it.t, kk); g.add(kk.build()); if (it.t === 'tractor') vehicles[it.id] = Object.assign(tractorWheels(g), { item: it }); if (it.t === 'pond' && IH.look.seaSheet) g.add(IH.look.seaSheet(-2.2, -1.7, 2.2, 1.7, 0.16, (x, z) => { const e = (x / 1.85) ** 2 + (z / 1.35) ** 2; return e < 1 ? 0.16 - 0.8 * (1 - e) : 0.4; }, { n: 6, foam: 0.18, deepAt: 0.6, shallow: '#8fe0d0', deep: '#2f7f9f', mud: '#8f8a99' })); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; root.add(g); models[it.id] = g;
      const [w, dd] = d.fp, c = Math.abs(Math.cos(it.ry || 0)), s = Math.abs(Math.sin(it.ry || 0)), hw = (w * c + dd * s) / 2, hd = (w * s + dd * c) / 2; solid(it.x - hw, it.z - hd, it.x + hw, it.z + hd); if (vehicles[it.id]) vehicles[it.id].solid = solids.length - 1;
      if (/^(coop|pond|sty|milkstand|shearstand|beehive|tractor|quad|trough|feeder)$/.test(it.t)) spots.push({ kind: 'fitem', id: 'it' + it.id, item: it.id, t: it.t, name: 'the ' + d.name.toLowerCase(), at: [it.x, it.z + hd + 1.2], yaw: Math.PI, hit: [it.x, it.z, 0, Math.max(w, dd) + 0.4] }); }
    // the animals, each in its own paddock, moving its own way (village.js: the generic movers, or the 3D ones)
    const pens = {}; for (const { p } of pads) pens[p.id] = [p.x0 + 1, p.z0 + 1, p.x1 - 1, p.z1 - 1];
    for (const a of f.animals) { const pen = pens[a.pad]; if (!pen) continue; const mk = (IH.animals3d && IH.animals3d.make) || ((kind) => (IB.MAKE[kind] || IB.MAKE.hen)()); const m = mk(a.kind); m.pen = pen; m.rec = a; let x = 0, z = 0; for (let q = 0; q < 30; q++) { x = pen[0] + R() * (pen[2] - pen[0]); z = pen[1] + R() * (pen[3] - pen[1]); if (!solids.some(r => x > r[0] - 0.8 && x < r[2] + 0.8 && z > r[1] - 0.8 && z < r[3] + 0.8)) break; } m.group.position.set(x, 0, z); m.group.rotation.y = R() * 6.28; animals.push(m); root.add(m.group); }
    root.add(k.build()); for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 2, z); m.userData.spot = s; root.add(m); }
    // the hay meadow at the front: long grass (the home's own), cut where the baler's been (it grows back in two days),
    // a low hedge round it, and the round bales lying where they dropped
    const hay = f.hay || (f.hay = { cells: {}, at: 0 }); if (hay.at && Date.now() - hay.at > 2 * DAY) { hay.cells = {}; hay.at = 0; }
    let meadowL = null; if (IH.lawnKit) { const cells = []; for (let i = MEADOW[0]; i < MEADOW[2]; i++) for (let j = Math.ceil(MEADOW[1]); j < MEADOW[3]; j++) cells.push({ x: i, z: j }); meadowL = IH.lawnKit.build({ cells, x0: 0, z0: 0, W, D, seed: 777, phase: 'day', per: e => (e ? 30 : 6), ground: false }); meadowL.position.y = 0.07; IH.lawnKit.grow(meadowL, 1.25); root.add(meadowL); for (const key of Object.keys(hay.cells)) { const i = Math.floor(key / 1000), j = key % 1000; IH.lawnKit.cutAt(meadowL, i + 0.5, j + 0.5, 0.75); } }
    for (let x = MEADOW[0] - 0.6; x < MEADOW[2] + 0.6; x += 0.9) for (const z of [MEADOW[3] + 0.6]) k.ball(0.5, x, 0.35, z, '#4f8a3c', { s: [1, 0.75, 1], n: 7 });
    for (let z = MEADOW[1]; z < MEADOW[3] + 0.6; z += 0.9) k.ball(0.5, MEADOW[0] - 0.8, 0.35, z, '#4f8a3c', { s: [1, 0.75, 1], n: 7 });
    solid(MEADOW[0] - 0.4, MEADOW[3] + 0.2, MEADOW[2] + 1, MEADOW[3] + 1.2); solid(MEADOW[0] - 1.4, MEADOW[1], MEADOW[0] - 0.3, MEADOW[3] + 1.2);
    board(k, 'meadow', 'HAY MEADOW', 'tractor work: bale it, haul it', '#fff6e0', '#4a7a3a', 3.4, 0.9, MEADOW[2] + 1.2, 1.6, MEADOW[1] + 1.2, -Math.PI / 2);
    f.bales = f.bales || []; const bales = f.bales.map(b => { const m = baleModel(); m.position.set(b.x, 0, b.z); m.rotation.y = b.ry || 0; root.add(m); return { rec: b, g: m }; });
    const lawns = [[0, 0, W, D]], paths = TRACK.map(r => r.slice()).concat([[MEADOW[0] - 0.5, MEADOW[1] - 0.3, MEADOW[2] + 0.2, MEADOW[3] + 0.2]]); // (grass everywhere else: the meadow has its own long hay)
    return { gates, vehicles, meadowL, bales, MEADOW, tick: t => { if (meadowL) IH.lawnKit.tick(meadowL, t, 1); }, id: 'farm', title: 'Farm paddock', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids, pond: null, bridges: [], spots, buildings: [], arrive: [26, 3.6], lawns, paths, animals, pens, models, npc: 0, centre: [26, 20], growth: 0.55, welcome: 'Your farm. The barn has animals, feed and the farm planner.', farm: f };
  }
  IB.add('farm', build);

  /* ---------- on the farm (village.js calls this once; ctx is what it needs from there) */
  IH.villageFarm = c => {
    const V = () => c.V, sh = () => c.V.stage.shop, F = () => state(sh().farm()), save = () => sh().farmSave();
    const ready = a => { const m = ANIMALS[a.kind]; if (!m.makes) return 0; const b = a.got ? Math.min(3, Math.floor((Date.now() - a.got) / (m.every * DAY))) : 1; return b * m.n; };
    const hasIn = (f, pad, t) => f.items.some(it => it.t === t && padOf(f, it.x, it.z) && padOf(f, it.x, it.z).id === pad);
    const hasAny = (f, t) => f.items.some(it => it.t === t);
    const fed = (f, pad) => (f.fed[pad] || 0) >= today() - 1;
    // why an animal isn't making anything (or null: it is)
    function why(f, a) {
      const m = ANIMALS[a.kind]; if (!m.makes) return null; if (!fed(f, a.pad)) return 'hungry'; if (!hasIn(f, a.pad, 'trough')) return 'no water';
      if ((m.needs === 'coop' || m.needs === 'pond' || m.needs === 'sty') && !hasIn(f, a.pad, m.needs)) return 'needs ' + NEEDS_NAME[m.needs];
      if ((m.needs === 'milkstand' || m.needs === 'shearstand') && !hasAny(f, m.needs)) return 'needs ' + NEEDS_NAME[m.needs]; return null;
    }
    function collect(s, test, what, pose, emo) {
      const f = F(), L = f.animals.filter(a => test(a)), ok = L.filter(a => !why(f, a) && ready(a) > 0);
      if (!L.length) return c.toast('No animals here for that yet.');
      if (!ok.length) { const w = L.map(a => why(f, a)).find(Boolean); return c.toast(w ? `They can’t yet: ${w}.` : 'Nothing ready yet. Come back tomorrow.'); }
      let n = 0; for (const a of ok) { let k = ready(a); if (a.kind === 'hen' && f.animals.some(o => o.kind === 'rooster' && o.pad === a.pad)) k *= 2; n += k; a.got = Date.now(); }
      c.chore(s, pose, 3, () => { save(); if (what === 'wool' || what === 'truffle') sh().addGoods(what, n); else sh().addFood(what, n); c.float(V().kid, emo); c.sound('buy'); c.toast(`${n} ${{ egg: n === 1 ? 'egg' : 'eggs', milk: n === 1 ? 'bottle of milk' : 'bottles of milk', wool: n === 1 ? 'bag of wool' : 'bags of wool', truffle: n === 1 ? 'truffle' : 'truffles' }[what]}! ${what === 'wool' || what === 'truffle' ? 'On your goods shelf.' : 'Into your fridge at home.'}`); }, null, { egg: { tool: 'basket', fx: 'straw', dist: 0.9, y: 0.6, rate: 8 }, milk: { tool: 'pail', fx: 'milk', dist: 0.55, y: 0.75, rate: 16 }, wool: { tool: 'shears', fx: 'wool', dist: 0.8, y: 0.9, rate: 10 }, truffle: { fx: 'soil', dist: 1.0, y: 0.1, rate: 10 } }[what]);
    }
    function feedPad(s) {
      const f = F(), L = f.animals.filter(a => a.pad === s.pad); if (!L.length) return c.toast('Nobody lives in this paddock yet. Buy animals at the barn.');
      if ((f.fed[s.pad] || 0) === today()) return c.toast('They’re full. Feed them again tomorrow.');
      const need = {}; for (const a of L) need[ANIMALS[a.kind].eats] = (need[ANIMALS[a.kind].eats] || 0) + 1;
      const short = Object.entries(need).filter(([k, n]) => (f.feed[k] || 0) < n); if (short.length) return c.toast(`Not enough ${short.map(([k]) => FEED[k].name.toLowerCase()).join(' or ')}. Buy feed at the barn.`);
      c.chore(s, 'feed', 2.8, () => { for (const [k, n] of Object.entries(need)) f.feed[k] -= n; f.fed[s.pad] = today(); save(); for (const a of V().B.animals) if (a.rec && a.rec.pad === s.pad) c.float({ pos: a.group.position }, '❤️'); c.sound('tune'); c.toast(`Fed! (${Object.entries(need).map(([k, n]) => `${n} ${FEED[k].name.toLowerCase()}`).join(', ')})`); }, null, need.hay && !need.grain ? { tool: 'fork', fx: 'hay', dist: 1.1, y: 0.5, rate: 14 } : { tool: 'sack', fx: 'dust', dist: 1.2, y: 0.5, rate: 12, delay: 0.5 });
    }
    function drive(s, t) {
      if (t === 'tractor') return c.walkTo(s.at[0], s.at[1], ok => ok && startDrive(s.item), s.yaw);
      c.walkTo(s.at[0], s.at[1], ok => { if (!ok) return; const B = V().B, m = B.models[s.item]; if (!m) return; const x0 = m.position.x, z0 = m.position.z, r0 = m.rotation.y;
        c.ride({ dur: 16, lift: 0.75, model: m, pose: 'sitchair', bob: 0.05, at: u => { const a = u * Math.PI * 2; return [26 + Math.cos(a - Math.PI / 2) * 20, 0, 15 + Math.sin(a - Math.PI / 2) * 1.2 + Math.sin(a * 2) * 0.6]; }, end: () => { m.position.set(x0, 0, z0); m.rotation.y = r0; sh().relax({ fun: 16 }); c.toast('Vroom! Round the farm. 🏍️'); } }); }, s.yaw);
    }

    /* ---------- driving the tractor: the kid in the seat, steering and pedals held down (the buttons, or the
       arrow keys / WASD). It drives like a real one: the front wheels steer, it turns round its back axle in a
       proper circle (never on the spot, and not at all standing still), speeds up and slows down with some weight,
       reverses, bumps to a stop against fences and things. It pulls the baler or the trailer on its hitch. */
    let DR = null; const KEYS = {}, JOY = { x: 0, y: 0 };
    const keyMap = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    const onKey = e => { const k = keyMap[e.code]; if (!k || !DR) return; KEYS[k] = e.type === 'keydown'; e.preventDefault(); e.stopPropagation(); };
    function startDrive(id) {
      const v = V(), m = v.B.models[id], veh = v.B.vehicles[id]; if (!m || !veh) return;
      DR = { id, m, veh, x: m.position.x, z: m.position.z, yaw: m.rotation.y, v: 0, steer: 0, imp: null, bumped: 0, smoke: 0 };
      v.drive = DR; const k = v.kid; k.path = []; k.pose = 'sitchair'; c.sound('on');
      for (const kk in KEYS) KEYS[kk] = false; addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
      const el = document.createElement('div'); el.className = 'vg-drive'; DR.el = el;
      el.innerHTML = `<div class="vg-dr-top"><b>🚜</b><span>Hitch:</span><button data-v="farm" data-k="hitch:none" class="on">Nothing</button><button data-v="farm" data-k="hitch:baler">🟢 Baler</button><button data-v="farm" data-k="hitch:trailer">🟫 Trailer</button><button data-v="farm" data-k="auto" class="vg-dr-auto">🤖 Auto</button><button data-v="farm" data-k="dout" class="vg-dr-out">Get out</button></div><div class="vg-dr-note" hidden></div>
        <div class="vg-joy" aria-label="Drive: push up to go, down to reverse, left and right to steer"><span class="vg-joy-u">▲</span><span class="vg-joy-d">▼</span><span class="vg-joy-l">⟲</span><span class="vg-joy-r">⟳</span><i class="vg-joy-k"></i></div>`;
      // the joystick: drag the knob; how far up or down is the pedal, how far left or right is the wheel (analogue)
      const J = el.querySelector('.vg-joy'), knob = J.querySelector('.vg-joy-k'); let jid = null;
      const jmove = e => { const r = J.getBoundingClientRect(), R = r.width / 2, dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R), L = Math.hypot(dx, dy), k = L > R * 0.8 ? R * 0.8 / L : 1; JOY.x = Math.max(-1, Math.min(1, -dx * k / (R * 0.8))); JOY.y = Math.max(-1, Math.min(1, -dy * k / (R * 0.8))); if (Math.abs(JOY.x) < 0.12) JOY.x = 0; if (Math.abs(JOY.y) < 0.12) JOY.y = 0; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`; };
      J.addEventListener('pointerdown', e => { e.preventDefault(); jid = e.pointerId; try { J.setPointerCapture(jid); } catch (er) { /* */ } J.classList.add('on'); jmove(e); });
      J.addEventListener('pointermove', e => { if (e.pointerId === jid) jmove(e); });
      for (const ev of ['pointerup', 'pointercancel']) J.addEventListener(ev, e => { if (e.pointerId !== jid) return; jid = null; JOY.x = 0; JOY.y = 0; knob.style.transform = ''; J.classList.remove('on'); });
      v.ui.appendChild(el); v.follow = true;
      JOY.x = 0; JOY.y = 0;
      c.toast('In the seat! Push the joystick up to drive, down to reverse, left and right to steer. It can’t turn on the spot: back up to get round tight corners.');
    }
    function hitch(kind) {
      if (!DR) return; if (Math.abs(DR.v) > 0.05) return c.toast('Stop first to hitch up.');
      const v = V(); if (DR.imp) { DR.imp.load.forEach((b, i) => dropBale({ x: DR.imp.x - Math.sin(DR.imp.yaw) * (2 + i * 1.4), z: DR.imp.z - Math.cos(DR.imp.yaw) * (2 + i * 1.4), ry: DR.imp.yaw + Math.PI / 2 })); v.B.root.remove(DR.imp.g); DR.imp = null; }
      if (kind !== 'none') { const I = implementModel(kind); I.kind = kind; I.yaw = DR.yaw; I.load = []; I.acc = 0; v.B.root.add(I.g); DR.imp = I; placeImp(0); c.sound('place'); c.toast(kind === 'baler' ? 'Baler on! Drive it over the long grass in the hay meadow.' : 'Trailer on! Drive up to bales to load them, then to the barn.'); }
      for (const b of DR.el.querySelectorAll('[data-k^="hitch:"]')) b.classList.toggle('on', b.dataset.k === 'hitch:' + kind);
    }
    function placeImp(dist) {
      const I = DR.imp, hx = DR.x - Math.sin(DR.yaw) * 1.75, hz = DR.z - Math.cos(DR.yaw) * 1.75;
      I.yaw += (dist / I.len) * Math.sin(DR.yaw - I.yaw); // (a trailer swings in line behind, the right way going forward or back)
      I.x = hx - Math.sin(I.yaw) * I.len; I.z = hz - Math.cos(I.yaw) * I.len; I.g.position.set(I.x, 0, I.z); I.g.rotation.y = I.yaw;
      for (const w of I.wheels) w.rotation.x += dist / I.r;
    }
    function blocked(x, z, yaw) {
      const v = V(), B = v.B, c0 = Math.cos(yaw), s0 = Math.sin(yaw);
      for (const [lx, lz] of [[-1.15, 2.05], [1.15, 2.05], [-1.2, -1.45], [1.2, -1.45], [0, 2.1], [-1.2, 0.4], [1.2, 0.4]]) {
        const px = x + lx * c0 + lz * s0, pz = z - lx * s0 + lz * c0; if (px < 0.6 || pz < 0.6 || px > W - 0.6 || pz > D - 0.6) return true;
        if (B.solids.some((r, i) => i !== DR.veh.solid && px > r[0] && px < r[2] && pz > r[1] && pz < r[3])) return true;
      }
      return false;
    }
    // how far into things it is: the footprint points that are inside something, and how deep the deepest is
    function depth(x, z, yaw) {
      const B = V().B, c0 = Math.cos(yaw), s0 = Math.sin(yaw); let d = 0;
      for (const [lx, lz] of [[-1.15, 2.05], [1.15, 2.05], [-1.2, -1.45], [1.2, -1.45], [0, 2.1], [-1.2, 0.4], [1.2, 0.4]]) {
        const px = x + lx * c0 + lz * s0, pz = z - lx * s0 + lz * c0;
        d += Math.max(0, 0.6 - px, 0.6 - pz, px - (W - 0.6), pz - (D - 0.6));
        for (let i = 0; i < B.solids.length; i++) { if (i === DR.veh.solid) continue; const r = B.solids[i]; if (px > r[0] && px < r[2] && pz > r[1] && pz < r[3]) d += Math.min(px - r[0], r[2] - px, pz - r[1], r[3] - pz); }
      }
      return d;
    }
    function dropBale(b) { const v = V(), f = F(); const rec = { x: b.x, z: b.z, ry: b.ry || 0 }; f.bales.push(rec); const m = baleModel(); m.position.set(rec.x, 0, rec.z); m.rotation.y = rec.ry; v.B.root.add(m); v.B.bales.push({ rec, g: m }); save(); }
    function tick(t, dt) {
      if (!DR || !V() || V().drive !== DR) return; const v = V(), f = F(), k = v.kid;
      let thr = Math.max(-1, Math.min(1, (KEYS.up ? 1 : 0) - (KEYS.down ? 1 : 0) + JOY.y)), st = Math.max(-1, Math.min(1, (KEYS.left ? 1 : 0) - (KEYS.right ? 1 : 0) + JOY.x)), vmax = 4.0;
      if (AP && (thr || st)) autoStop('You took the wheel.');
      else if (AP) ({ thr, st, vmax } = autopilot(t, dt));
      const target = thr > 0 ? vmax * Math.min(1, thr) : thr < 0 ? -1.6 * Math.min(1, -thr) : 0, braking = thr !== 0 && Math.abs(DR.v) > 0.05 && Math.sign(target) !== Math.sign(DR.v);
      const acc = braking ? 6 : thr ? 2.2 : 3.2; DR.v += Math.max(-acc * dt, Math.min(acc * dt, target - DR.v));
      DR.steer += Math.max(-1.5 * dt, Math.min(1.5 * dt, st * 0.62 - DR.steer)); // (the wheel turns at a hand's speed, and comes back when let go)
      const dist = DR.v * dt, yaw2 = DR.yaw + (dist / WHEELBASE) * Math.tan(DR.steer), my = (DR.yaw + yaw2) / 2;
      const rx = DR.x - Math.sin(DR.yaw) * 0.62 + Math.sin(my) * dist, rz = DR.z - Math.cos(DR.yaw) * 0.62 + Math.cos(my) * dist, nx = rx + Math.sin(yaw2) * 0.62, nz = rz + Math.cos(yaw2) * 0.62;
      let moved = dist;
      if (Math.abs(dist) > 1e-5 && blocked(nx, nz, yaw2) && !(blocked(DR.x, DR.z, DR.yaw) && depth(nx, nz, yaw2) <= depth(DR.x, DR.z, DR.yaw))) { /* (already touching something, any move that doesn't push further in is let through, so it never sticks) */ DR.blockT = t; if (Math.abs(DR.v) > 0.6 && t > DR.bumped) { c.sound('pat'); DR.bumped = t + 0.6; c.fx('dust', nx + Math.sin(yaw2) * 2 * Math.sign(DR.v), 0.3, nz + Math.cos(yaw2) * 2 * Math.sign(DR.v), 6); } DR.v = 0; moved = 0; }
      else { DR.x = nx; DR.z = nz; DR.yaw = yaw2; }
      // the wheels: the back ones roll, the front ones roll and steer
      for (const w of DR.veh.rear) w.rotation.x += moved / R_REAR; for (const w of DR.veh.front) w.rotation.x += moved / R_FRONT; for (const p of DR.veh.pivots) p.rotation.y = DR.steer;
      const sp = Math.abs(DR.v); DR.m.position.set(DR.x, Math.sin(t * 17) * 0.012 * Math.min(1, sp), DR.z); DR.m.rotation.set(Math.sin(t * 11) * 0.006 * sp, DR.yaw, Math.sin(t * 9) * 0.006 * sp);
      // the kid in the seat, the camera with them; smoke from the stack, dust off the back wheels
      c.seatKid(DR.m, TRACTOR_SEAT, 0); k.pos.set(DR.x, 0, DR.z); k.yaw = DR.yaw;
      DR.smoke -= dt; if (DR.smoke < 0) { DR.smoke = thr ? 0.12 : 0.6; const c0 = Math.cos(DR.yaw), s0 = Math.sin(DR.yaw); c.fx('smoke', DR.x + 0.42 * c0 + 1.4 * s0, 3.0, DR.z - 0.42 * s0 + 1.4 * c0, 1); }
      if (sp > 2 && Math.random() < dt * 8) c.fx('dust', DR.x - Math.sin(DR.yaw) * 1.4 + (Math.random() - 0.5) * 2, 0.1, DR.z - Math.cos(DR.yaw) * 1.4, 1);
      if (!DR.imp) return; placeImp(moved); const I = DR.imp, M = v.B.MEADOW;
      // the baler: over the long grass it picks it up, cuts it and, every so often, a round bale rolls out the back
      if (I.kind === 'baler' && moved > 0 && (!AP || AP.pickup) && I.x > M[0] && I.x < M[2] && I.z > M[1] && I.z < M[3]) {
        const hay = f.hay; let n = 0;
        for (let i = Math.floor(I.x - 1.3); i <= Math.floor(I.x + 1.3); i++) for (let j = Math.floor(I.z - 0.8); j <= Math.floor(I.z + 0.8); j++) { if (i < M[0] || i >= M[2] || j < Math.ceil(M[1]) || j >= M[3]) continue; const key = i * 1000 + j; if (hay.cells[key] || Math.hypot(i + 0.5 - I.x, j + 0.5 - I.z) > 1.3) continue; hay.cells[key] = 1; n++; if (v.B.meadowL) IH.lawnKit.cutAt(v.B.meadowL, i + 0.5, j + 0.5, 0.75); }
        if (n) { I.acc += n; hay.at = hay.at || Date.now(); c.fx('hay', I.x + Math.sin(I.yaw) * 1.0, 0.4, I.z + Math.cos(I.yaw) * 1.0, Math.min(4, n)); }
        if (I.acc >= 30) { I.acc -= 30; dropBale({ x: I.x - Math.sin(I.yaw) * 1.4, z: I.z - Math.cos(I.yaw) * 1.4, ry: I.yaw + Math.PI / 2 }); c.sound('place'); if (!DR.told) { DR.told = true; c.toast('A bale! Keep going. Then hitch the trailer and take them to the barn.'); } }
      }
      // the trailer: bales it comes up against are loaded on (four at most); at the barn they're unloaded into the hay store
      if (I.kind === 'trailer') {
        if (I.load.length < 4) for (let i = v.B.bales.length - 1; i >= 0; i--) { const b = v.B.bales[i]; if (Math.hypot(b.g.position.x - I.x, b.g.position.z - I.z) < 2.1 && I.load.length < 4) { v.B.bales.splice(i, 1); f.bales.splice(f.bales.indexOf(b.rec), 1); v.B.root.remove(b.g); const m = baleModel(); m.scale.setScalar(0.8); m.position.set((I.load.length % 2 ? 0.5 : -0.5), 0, I.load.length < 2 ? 0.5 : -0.6); m.rotation.y = Math.PI / 2; I.load.push({ g: m }); I.g.children[I.g.children.length - 1].add(m); save(); c.sound('pop'); c.fx('hay', I.x, 1.2, I.z, 6); } }
        if (I.load.length && Math.hypot(I.x - 12, I.z - 11.5) < 4.5 && Math.abs(DR.v) < 1.5) { const n = I.load.length; for (const b of I.load) b.g.parent.remove(b.g); I.load = []; f.feed.hay = (f.feed.hay || 0) + n * 6; save(); c.xp(); c.sound('buy'); c.fx('hay', I.x, 1.4, I.z, 14); c.toast(`${n} bale${n === 1 ? '' : 's'} into the barn: ${n * 6} hay for your animals! 🌾`); }
      }
    }
    /* ---------- auto: the kid does the hay job alone, driving the same tractor the same way (pedal, wheel, the
       turning circle). The route planner (tractor-plan.js) finds every way round: clear of fences, posts and the
       edge (the baler or trailer too), swinging wide at corners, and where there's no room to turn it scans the
       open ground nearby for a three-point turn. The meadow's baled in straight, evenly spaced rows parallel to
       its long hedge, back and forth with the pickup up on the turns (so the cut stays in tidy lines), then the
       headland strips along the hedge ends; then trailer on, bales collected four at a time and hauled to the
       barn, as many trips as it takes, and the tractor parked back where it started. Steering by pure pursuit
       (a point a little ahead on the planned way, the wheel turned to arc onto it), reversing too; bumping
       something or drifting off the way, it stops and plans again from where it is. */
    let AP = null;
    const TP = () => IH.tractorPlan;
    const note = s0 => { const el = DR && DR.el && DR.el.querySelector('.vg-dr-note'); if (el) { el.hidden = !s0; el.textContent = s0 || ''; } };
    const rearOf = () => [DR.x - Math.sin(DR.yaw) * 0.62, DR.z - Math.cos(DR.yaw) * 0.62];
    const stop = () => ({ thr: 0, st: DR.steer / 0.62, vmax: 1 }); // (off the pedal: it rolls to a stand, the wheel left where it is)
    // the rows: parallel to the meadow's long (south) hedge, evenly spaced a baler's width apart (a little overlap)
    function hayJob() {
      const M = V().B.MEADOW, f = F(), legs = [], N = 5, z0 = M[3] - 1.8, z1 = M[1] + 1.6, gap = (z1 - z0) / (N - 1); // (from the far hedge back, so each turn swings out into open ground)
      let cut = 0, all = 0; for (let i = M[0]; i < M[2]; i++) for (let j = Math.ceil(M[1]); j < M[3]; j++) { all++; if (f.hay.cells[i * 1000 + j]) cut++; }
      if (all - cut > all * 0.08) {
        legs.push({ t: 'hitch', kind: 'baler' });
        for (let i = 0; i < N; i++) { const z = z0 + gap * i, west = i % 2 === 0; legs.push({ t: 'line', a: west ? [M[2] - 8, z] : [M[0] + 9, z], b: west ? [M[0] + 3.4, z] : [M[2] + 0.4, z], say: `baling row ${i + 1} of ${N + 2}` }); }
        // the headlands: the strips the rows' turns left, cut along the end hedge and the open end
        // (along the open end, the same spacing, each run south up to the far hedge, then backed straight out)
        [M[2] - 3.4, M[2] - 1.05].forEach((x, i) => legs.push({ t: 'line', a: [x, M[1] + 1.0], b: [x, M[3] - 2.55], say: `baling row ${N + i + 1} of ${N + 2} (the headland)` }, { t: 'back', d: 5, say: 'backing out from the hedge' }));
      }
      legs.push({ t: 'hitch', kind: 'trailer' }, { t: 'collect' });
      return legs;
    }
    function autoStart() {
      if (!DR) return; if (AP) return autoStop('Auto off.');
      if (!TP()) return c.toast('Auto isn’t ready yet.');
      const v = V(); AP = { legs: hayJob(), leg: null, home: { x: DR.x, z: DR.z, yaw: DR.yaw }, G: TP().grid(v.B.solids, v.B.bounds.x1, v.B.bounds.z1, DR.veh.solid), skip: new Set(), tried: new Map(), pickup: false, stuck: 0 };
      const b = DR.el.querySelector('.vg-dr-auto'); if (b) { b.classList.add('on'); b.textContent = '🤖 Stop'; }
      c.toast('Auto: watch them make hay! Push the joystick to take over.'); c.sound('on');
    }
    function autoStop(words) { AP = null; note(''); const b = DR && DR.el && DR.el.querySelector('.vg-dr-auto'); if (b) { b.classList.remove('on'); b.textContent = '🤖 Auto'; } if (words) c.toast(words); }
    const lenOf = () => (DR.imp ? DR.imp.len : 0);
    // start planning a way from here to a pose
    function goto(L) {
      const g = L.goal; L.search = TP().plan(AP.G, { x: DR.x, z: DR.z, yaw: DR.yaw, iyaw: DR.imp ? DR.imp.yaw : DR.yaw, len: lenOf() }, g, { m: L.tries ? 0.22 : 0.45, max: L.tries ? 120000 : 60000 }); L.segs = null;
    }
    // a planned way, cut where it changes between forward and back, as back-axle points
    function segments(P) {
      const out = []; let cur = null;
      for (let i = 1; i < P.length; i++) { const d = P[i].dir; if (!cur || cur.dir !== d) { cur = { dir: d, pts: [] }; const q = P[i - 1]; cur.pts.push([q.x - Math.sin(q.yaw) * 0.62, q.z - Math.cos(q.yaw) * 0.62]); out.push(cur); } const q = P[i]; cur.pts.push([q.x - Math.sin(q.yaw) * 0.62, q.z - Math.cos(q.yaw) * 0.62]); }
      for (const s of out) s.k = 0; return out;
    }
    // follow one stretch (all forward or all back): pure pursuit on the back axle; null once it's at the end and stopped
    function track(t, S, vmax) {
      const [rx, rz] = rearOf(), P = S.pts, n = P.length;
      let best = S.k, bd = Infinity; for (let i = S.k; i < Math.min(n, S.k + 24); i++) { const d = Math.hypot(P[i][0] - rx, P[i][1] - rz); if (d < bd) { bd = d; best = i; } } S.k = best;
      const end = P[n - 1], dEnd = Math.hypot(end[0] - rx, end[1] - rz), pre = n > 1 ? P[n - 2] : P[0], past = ((rx - end[0]) * (end[0] - pre[0]) + (rz - end[1]) * (end[1] - pre[1])) > 0;
      if ((S.k >= n - 2 && dEnd < 0.45) || (S.k >= n - 3 && past) || n < 2) return Math.abs(DR.v) > 0.05 ? stop() : null;
      S.bd = bd; if (bd > 1.1) return 'off';
      const Ld = S.dir > 0 ? 2.1 : 1.5; let j = S.k; while (j < n - 1 && Math.hypot(P[j][0] - rx, P[j][1] - rz) < Ld) j++;
      let [tx, tz] = P[j]; if (j === n - 1) { const L0 = Math.hypot(tx - rx, tz - rz); if (L0 < Ld && n > 1) { const dx = end[0] - pre[0], dz = end[1] - pre[1], L1 = Math.hypot(dx, dz) || 1; tx += dx / L1 * (Ld - L0); tz += dz / L1 * (Ld - L0); } }
      const head = S.dir > 0 ? DR.yaw : DR.yaw + Math.PI, alpha = Math.atan2(Math.sin(Math.atan2(tx - rx, tz - rz) - head), Math.cos(Math.atan2(tx - rx, tz - rz) - head));
      let steer = Math.atan((2 * 2.07 * Math.sin(alpha)) / Ld); if (S.dir < 0) steer = -steer;
      const st = Math.max(-1, Math.min(1, steer / 0.62)), rem = (n - 1 - S.k) * 0.3 + dEnd * 0.5;
      // the wheel has to come round before the turn: slow while it's far from where it should be
      const lag = Math.abs(steer - DR.steer), sp = Math.min(vmax * (1 - Math.min(0.55, Math.abs(st) * 0.45)) * (lag > 0.25 ? 0.5 : 1), 0.35 + rem * 0.65);
      if (AP) AP.lastDir = S.dir;
      if (S.dir > 0) return { thr: 1, st, vmax: Math.max(0.4, sp) };
      return { thr: -Math.max(0.3, Math.min(1, Math.min(sp, 1.2) / 1.6)), st, vmax: 1 };
    }
    // run a goto leg: plan (a slice a tick), then drive each stretch, stopping where it changes direction
    function runGoto(t, L, vmax) {
      if (!L.search) goto(L);
      if (!L.search.done) { L.search.step(1200); return stop(); }
      if (!L.search.path) { if (!L.tries) { L.tries = 1; goto(L); return stop(); } return 'fail'; }
      if (!L.segs) { L.segs = segments(L.search.path); L.si = 0; }
      while (L.si < L.segs.length) {
        const r = track(t, L.segs[L.si], vmax);
        if (r === 'off') { AP.offs = (AP.offs || 0) + 1; L.search = null; L.tries = 0; return stop(); }
        if (r) return r;
        L.si++;
      }
      return null;
    }
    function bumped(t) { return DR.blockT && t - DR.blockT < 0.12; }
    function autopilot(t, dt) {
      void dt; const v = V();
      if (!AP.leg) { AP.leg = AP.legs.shift(); if (!AP.leg && DR.imp && DR.imp.load.length) { AP.legs.push({ t: 'goto', goal: { x: 9.0, z: 15, yaw: -Math.PI / 2, tol: 1.0, ytol: 0.45 }, say: 'one more to the barn', vmax: 3.2 }, { t: 'goto', goal: { x: AP.home.x, z: AP.home.z, yaw: AP.home.yaw, tol: 0.7, ytol: 0.25 }, say: 'parking' }); AP.leg = AP.legs.shift(); } if (!AP.leg) { autoStop(''); c.toast('All done! The hay’s made and in the barn. 🌾'); c.sound('buy'); return stop(); } }
      const L = AP.leg; AP.pickup = false;
      if (bumped(t) && t > (AP.bumpT || 0) && L.t !== 'back') {
        // bumped something: ease off it the other way, then plan again from there
        AP.bumpT = t + 1; AP.stuck++; if (AP.stuck > 8) { autoStop(''); c.toast('Auto: I’m stuck. Can you drive me out?'); return stop(); }
        if (L.go) { L.go.search = null; L.go.tries = 0; } if (L.search !== undefined) { L.search = null; L.tries = 0; } if (L.t === 'line') { L.lined = false; const [rx, rz] = rearOf(), yw = Math.atan2(L.b[0] - L.a[0], L.b[1] - L.a[1]); L.a = [rx + Math.sin(yw) * 0.62, rz + Math.cos(yw) * 0.62]; L.go = null; }
        AP.legs.unshift(L); AP.leg = { t: 'back', d: 1.6, sign: AP.lastDir < 0 ? 1 : -1, say: 'easing off' }; return stop();
      }
      const next = () => { AP.leg = null; AP.stuck = 0; return stop(); }, fail = () => { autoStop(''); c.toast('Auto: I can’t find a way there. Can you drive a bit and try again?'); return stop(); };
      if (L.t === 'hitch') { if (Math.abs(DR.v) > 0.05) return stop(); if (!DR.imp || DR.imp.kind !== L.kind) hitch(L.kind); return next(); }
      if (L.t === 'goto') { if (L.say) note('Auto: ' + L.say); const r = runGoto(t, L, L.vmax || 3.0); if (r === 'fail') { if (L.bale) { afterGoto(L); return next(); } return fail(); } if (r) return r; afterGoto(L); return next(); }
      if (L.t === 'line') {
        // a straight run: first get lined up on its start (planned), then drive it dead straight with the pickup down
        note('Auto: ' + L.say);
        const yaw = Math.atan2(L.b[0] - L.a[0], L.b[1] - L.a[1]);
        if (!L.go) L.go = { goal: { x: L.a[0], z: L.a[1], yaw, tol: 0.4, ytol: 0.1, htol: 0.5, dir: 1 } };
        if (!L.lined) { const r = runGoto(t, L.go, 3.0); if (r === 'fail') { if (!L.tries2) { L.tries2 = 1; L.go = null; L.a = [L.a[0] + Math.sin(yaw) * 1.5, L.a[1] + Math.cos(yaw) * 1.5]; return stop(); } return next(); } if (r) return r; L.lined = true; const ra = [DR.x - Math.sin(DR.yaw) * 0.62, DR.z - Math.cos(DR.yaw) * 0.62], len = Math.hypot(L.b[0] - ra[0], L.b[1] - ra[1]), pts = []; for (let s = 0; s <= len; s += 0.4) pts.push([ra[0] + Math.sin(yaw) * s, ra[1] + Math.cos(yaw) * s]); pts.push([L.b[0] - Math.sin(yaw) * 0.62, L.b[1] - Math.cos(yaw) * 0.62]); L.seg = { dir: 1, pts, k: 0 }; }
        AP.pickup = true; const r = track(t, L.seg, 2.6);
        if (r === 'off') { L.lined = false; const [rx, rz] = rearOf(); L.a = [rx + Math.sin(yaw) * 0.62, rz + Math.cos(yaw) * 0.62]; L.go = null; return stop(); }
        return r || next();
      }
      if (L.t === 'back') {
        // straight back the way it came (the towed thing stays in line going straight back)
        note('Auto: ' + L.say);
        if (!L.seg) { const [rx, rz] = rearOf(), sg = L.sign || -1, pts = []; for (let s0 = 0; s0 <= L.d; s0 += 0.4) pts.push([rx + sg * Math.sin(DR.yaw) * s0, rz + sg * Math.cos(DR.yaw) * s0]); L.seg = { dir: sg, pts, k: 0 }; L.t0 = t; }
        if (bumped(t) && t - L.t0 > 0.3) return next();
        const r = track(t, L.seg, 1.2); if (r === 'off') return next(); return r || next();
      }
      if (L.t === 'collect') {
        const M = v.B.MEADOW, I = DR.imp, inM = b => b.g.position.x > M[0] - 2 && b.g.position.x < M[2] + 3 && b.g.position.z > M[1] - 2 && b.g.position.z < M[3] + 1;
        const left = v.B.bales.filter(b => inM(b) && !AP.skip.has(b));
        if (!I || I.kind !== 'trailer') { AP.legs.unshift({ t: 'hitch', kind: 'trailer' }, L); AP.leg = null; return stop(); }
        if (I.load.length >= 4 || (!left.length && I.load.length)) { AP.legs.unshift({ t: 'goto', goal: { x: 9.0, z: 15, yaw: -Math.PI / 2, tol: 1.0, ytol: 0.45 }, say: 'hauling the bales to the barn', vmax: 3.2 }, { t: 'collect' }); return next(); }
        if (!left.length) { AP.legs.unshift({ t: 'goto', goal: { x: AP.home.x, z: AP.home.z, yaw: AP.home.yaw, tol: 0.7, ytol: 0.25 }, say: 'parking' }); return next(); }
        // the nearest bale, and a way to come at it that fits, the trailer passing over it
        const [rx, rz] = rearOf(); left.sort((a, b) => Math.hypot(a.g.position.x - rx, a.g.position.z - rz) - Math.hypot(b.g.position.x - rx, b.g.position.z - rz));
        const bl = left[0], bx = bl.g.position.x, bz = bl.g.position.z, back = 1.75 + I.len - 0.4;
        const hs = [0, 1, 2, 3, 4, 5, 6, 7].map(k => k * Math.PI / 4).map(h => ({ h, x: bx + Math.sin(h) * back, z: bz + Math.cos(h) * back })).filter(p => TP().fits(AP.G, p.x, p.z, p.h, I.len, 0.35));
        const tried = AP.tried.get(bl) || []; hs.splice(0, hs.length, ...hs.filter(p => !tried.some(h => Math.abs(Math.sin((p.h - h) / 2)) < 0.2)));
        if (!hs.length || tried.length >= 3) { AP.skip.add(bl); return stop(); }
        hs.sort((p, q) => (Math.hypot(p.x - DR.x, p.z - DR.z) + 2 * Math.abs(Math.sin((p.h - DR.yaw) / 2))) - (Math.hypot(q.x - DR.x, q.z - DR.z) + 2 * Math.abs(Math.sin((q.h - DR.yaw) / 2))));
        const p = hs[0]; AP.legs.unshift({ t: 'goto', goal: { x: p.x, z: p.z, yaw: p.h, tol: 0.8, ytol: 0.35, htol: 0.6 }, say: `picking up bales (${I.load.length} of 4 on)`, vmax: 2.6, bale: bl, h: p.h }, { t: 'collect' });
        AP.lastBale = bl; return next();
      }
      return next();
    }
    // (a bale the trailer drove to but didn't get is left for a grown-up, so auto doesn't go round and round)
    function afterGoto(L) { if (L && L.bale && V().B.bales.includes(L.bale)) AP.tried.set(L.bale, (AP.tried.get(L.bale) || []).concat(L.h)); }
    function getOut() {
      if (!DR) return; if (Math.abs(DR.v) > 0.1) return c.toast('Stop first.'); if (AP) autoStop('');
      const v = V(), f = F(), it = f.items.find(i => i.id === DR.id), k = v.kid;
      if (DR.imp) { DR.imp.load.forEach((b, i) => dropBale({ x: DR.imp.x - Math.sin(DR.imp.yaw) * (2 + i * 1.4), z: DR.imp.z - Math.cos(DR.imp.yaw) * (2 + i * 1.4), ry: DR.imp.yaw + Math.PI / 2 })); v.B.root.remove(DR.imp.g); }
      if (it) Object.assign(it, { x: Math.round(DR.x * 10) / 10, z: Math.round(DR.z * 10) / 10, ry: DR.yaw });
      const c0 = Math.cos(DR.yaw), s0 = Math.sin(DR.yaw); k.pos.set(DR.x - 1.8 * c0, 0, DR.z + 1.8 * s0); k.yaw = DR.yaw; k.pose = null;
      removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); if (DR.el) DR.el.remove(); v.drive = null; DR = null; save(); c.sound('off'); reload();
    }
    const acts = {
      fbarn: () => [{ e: '🐮', label: 'Buy animals', run: () => shop('animals') }, { e: '🌾', label: 'Buy feed', run: () => shop('feed') }, { e: '🛠️', label: 'Farm planner: paddocks, fittings, equipment', run: () => planner() }],
      fgate: s => { const f = F(), L = f.animals.filter(a => a.pad === s.pad), p = f.paddocks.find(q => q.id === s.pad); return [{ e: '🌾', label: L.length ? ((f.fed[s.pad] || 0) === today() ? 'Fed today ✓' : `Feed them (${L.length} animal${L.length === 1 ? '' : 's'})`) : 'Nobody lives here yet', run: () => feedPad(s) },
        { e: '📋', label: `Who lives here · ${p ? used(f, p) : 0} / ${p ? Math.floor(area(p)) : 0} room`, run: () => c.toast(L.length ? L.map(a => ANIMALS[a.kind].e + ' ' + ANIMALS[a.kind].name + (why(f, a) ? ` (${why(f, a)})` : '')).join(', ') : 'Empty. Buy animals at the barn.') }]; },
      fitem: s => {
        const f = F();
        if (s.t === 'coop') return [{ e: '🥚', label: 'Collect the eggs', run: () => { const p = padOf(f, s.at[0], s.at[1] - 2) || padOf(f, ...(() => { const it = f.items.find(i => i.id === s.item); return [it.x, it.z]; })()); collect(s, a => p && a.pad === p.id && (a.kind === 'hen' || a.kind === 'turkey'), 'egg', 'fetch', '🥚'); } }];
        if (s.t === 'pond') return [{ e: '🥚', label: 'Collect duck and goose eggs', run: () => { const it = f.items.find(i => i.id === s.item), p = padOf(f, it.x, it.z); collect(s, a => p && a.pad === p.id && (a.kind === 'duck' || a.kind === 'goose'), 'egg', 'fetch', '🥚'); } }];
        if (s.t === 'sty') return [{ e: '🍄', label: 'Truffle hunt with the pigs', run: () => { const it = f.items.find(i => i.id === s.item), p = padOf(f, it.x, it.z); collect(s, a => p && a.pad === p.id && a.kind === 'kunekune', 'truffle', 'fetch', '🍄'); } }];
        if (s.t === 'milkstand') return [{ e: '🥛', label: 'Milk the goats and cows', run: () => collect(s, a => a.kind === 'goat' || a.kind === 'cow', 'milk', 'wash', '🥛') }];
        if (s.t === 'shearstand') return [{ e: '🧶', label: 'Shear the woolly ones', run: () => collect(s, a => a.kind === 'merino' || a.kind === 'alpaca' || a.kind === 'llama', 'wool', 'chop', '🧶') }];
        if (s.t === 'beehive') return [{ e: '🍯', label: 'Collect the honey', run: () => { const it = f.items.find(i => i.id === s.item); if (it.got && Date.now() - it.got < 3 * DAY) return c.toast('The bees are still making it. Honey every three days.'); c.chore(s, 'fetch', 2.6, () => { it.got = Date.now(); save(); sh().addFood('honey', 2); c.float(V().kid, '🍯'); c.toast('Two jars of honey into your pantry! 🐝'); }, null, { tool: 'jar', fx: 'smoke', dist: 1.0, y: 1.3, rate: 6 }); } }];
        if (s.t === 'tractor' || s.t === 'quad') return [{ e: ITEMS[s.t].e, label: s.t === 'quad' ? 'Ride the quad bike' : 'Drive the tractor', run: () => drive(s, s.t) }];
        if (s.t === 'trough') return [{ e: '💧', label: 'Top up the water', run: () => c.chore(s, 'water', 2.4, () => c.toast('Fresh water. 💧'), null, { tool: 'can', fx: 'drops', at: 'hand', rate: 22, delay: 0.6 }) }];
        return [{ e: '🪣', label: 'Fill it with hay', run: () => c.chore(s, 'feed', 2.4, () => c.toast('Hay in. 🌾'), null, { tool: 'fork', fx: 'hay', dist: 1.0, y: 1.2, rate: 14 }) }];
      }
    };

    // ---------- the barn's shop: animals (into the paddock the kid picks), feed
    function shop(tab) {
      const f = F(), w = Math.round(sh().wallet().left).toLocaleString();
      if (tab === 'feed') return c.gamePanel(`<div class="vg-gh"><b>🌾 Feed</b><span>✨ ${w}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">Every animal eats one serving a day. You have: ${Object.entries(FEED).map(([k, x]) => `${x.e} ${f.feed[k] || 0} ${x.name.toLowerCase()}`).join(' · ')}</div>
        <div class="vg-gb vg-mine">${Object.entries(FEED).map(([k, x]) => `<button data-v="farm" data-k="feed:${k}"><span class="e">${x.e}</span>${x.name} ×${x.n} · ✨ ${x.xp}</button>`).join('')}</div>`);
      c.gamePanel(`<div class="vg-gh"><b>🐮 Animals</b><span>✨ ${w}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">Pick an animal, then the paddock it lives in. ${f.paddocks.length ? '' : 'Build a paddock first (Farm planner).'}</div>
        <div class="vg-gb vg-mine">${Object.entries(ANIMALS).map(([k, a]) => `<button data-v="farm" data-k="pick:${k}"><span class="e">${a.e}</span>${a.name} · ✨ ${a.xp}<small>&nbsp;${a.makes ? `${a.n} ${a.makes} every ${a.every === 1 ? 'day' : a.every + ' days'} · needs ${NEEDS_NAME[a.needs]}` : esc(a.about || '')} · eats ${FEED[a.eats].name.toLowerCase()} · room ${a.room}</small></button>`).join('')}</div>`);
    }
    function pickPad(kind) {
      const f = F(), a = ANIMALS[kind];
      c.gamePanel(`<div class="vg-gh"><b>${a.e} Which paddock?</b><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">A ${a.name.toLowerCase()} needs ${a.room} room.</div>
        <div class="vg-gb vg-mine">${f.paddocks.map((p, i) => { const free = Math.floor(area(p)) - used(f, p), who = f.animals.filter(x => x.pad === p.id).map(x => ANIMALS[x.kind].e).join(''); return `<button data-v="farm" data-k="buy:${kind}:${p.id}" ${free < a.room ? 'disabled' : ''}>Paddock ${i + 1} ${who}<small>&nbsp;${free} room left${a.needs && /coop|pond|sty/.test(a.needs) && !hasIn(f, p.id, a.needs) ? ` · no ${ITEMS[a.needs].name.toLowerCase()} yet` : ''}${hasIn(f, p.id, 'trough') ? '' : ' · no water yet'}</small></button>`; }).join('') || '<small>No paddocks yet.</small>'}</div>`);
    }
    function buyAnimal(kind, pad) {
      const f = F(), a = ANIMALS[kind], p = f.paddocks.find(q => q.id === pad); if (!a || !p || Math.floor(area(p)) - used(f, p) < a.room) return;
      if (!sh().pay(a.xp, 'a ' + a.name.toLowerCase())) return;
      f.animals.push({ id: nid(), kind, pad, got: 0 }); save(); c.xp(); c.toast(`Welcome to the farm, ${a.name.toLowerCase()}! ${a.e}`); reload();
    }

    /* ---------- the farm planner: paddocks (two taps for the corners), fittings and equipment (pick, then tap
       where), moving and selling (tap a thing). Each change is paid for, saved, and the farm rebuilt. */
    let P = null;
    const preview = new T.Group();
    function planner(mode) {
      P = P || { mode: 'menu' }; if (mode) P.mode = mode; V().plan = P; const f = F(), w = Math.round(sh().wallet().left).toLocaleString();
      const head = `<div class="vg-gh"><b>🛠️ Farm planner</b><span>✨ ${w}</span><button class="vg-x" data-v="farm" data-k="pclose" aria-label="Done">✕</button></div>`;
      const tabs = `<div class="vg-gb vg-ptabs">${[['pad', '🟩 Paddocks'], ['fit', '🏠 Fittings'], ['eq', '🚜 Equipment'], ['edit', '✋ Move or sell']].map(([k, l]) => `<button data-v="farm" data-k="mode:${k}" class="${P.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      let body = '<div class="vg-gq">Lay out your farm. Pick what to do.</div>';
      if (P.mode === 'pad') body = `<div class="vg-gq">${P.cand ? (P.cand.bad ? `${esc(P.cand.bad)} Tap a new first corner.` : 'Build this paddock?') : P.a ? 'Now tap the opposite corner.' : `Tap one corner of the new paddock on the grass, then the opposite corner. Fencing costs ✨ ${FENCE_XP} a metre (two tiles).`}</div>${P.cand && !P.cand.bad ? `<div class="vg-gb vg-go"><button data-v="farm" data-k="padok"><span class="e">✅</span>Build it · ✨ ${P.cand.xp}</button><button data-v="farm" data-k="padno">Cancel</button></div>` : ''}`;
      if (P.mode === 'fit' || P.mode === 'eq') body = `<div class="vg-gq">${P.t ? `Tap where the ${ITEMS[P.t].name.toLowerCase()} goes${ITEMS[P.t].in ? ' (inside a paddock)' : ITEMS[P.t].in === false ? ' (outside the paddocks)' : ''}. <button class="vg-link" data-v="farm" data-k="rot">↻ Turn it</button>` : P.mode === 'fit' ? 'Things for inside a paddock.' : 'Farm equipment, for outside the paddocks.'}</div>
        <div class="vg-gb vg-mine">${Object.entries(ITEMS).filter(([, d]) => P.mode === 'fit' ? d.in !== false : d.in !== true).map(([t, d]) => `<button data-v="farm" data-k="item:${t}" class="${P.t === t ? 'on' : ''}"><span class="e">${d.e}</span>${d.name} · ✨ ${d.xp}${d.about ? `<small>&nbsp;${esc(d.about)}</small>` : ''}</button>`).join('')}</div>`;
      if (P.mode === 'edit') body = P.sel ? `<div class="vg-gq">${P.sel.kind === 'item' ? `The ${ITEMS[F().items.find(i => i.id === P.sel.id).t].name.toLowerCase()}.` : 'This paddock.'} ${P.moving ? 'Tap where it goes now.' : ''}</div><div class="vg-gb vg-go">${P.sel.kind === 'item' ? '<button data-v="farm" data-k="move"><span class="e">✋</span>Move it</button>' : ''}<button data-v="farm" data-k="sell"><span class="e">🏷️</span>${P.sel.kind === 'item' ? 'Sell it (half back)' : 'Take the fence down (half back)'}</button><button data-v="farm" data-k="desel">Cancel</button></div>` : '<div class="vg-gq">Tap a fitting or a piece of equipment to move or sell it, or the inside of a paddock to take its fence down.</div>';
      c.gamePanel(head + tabs + body); drawPreview();
      void f;
    }
    function drawPreview() {
      const B = V().B; if (preview.parent !== B.root) B.root.add(preview); while (preview.children.length) preview.remove(preview.children[0]);
      const k = new Kit(); const box = (x0, z0, x1, z1, col) => { for (const [a, b] of [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]]) k.box(Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.2, 0.12, 0.2, (a[0] + b[0]) / 2, 0.08, (a[1] + b[1]) / 2, col, { ry: -Math.atan2(b[1] - a[1], b[0] - a[0]) }); };
      if (P && P.a && !P.cand) k.ball(0.35, P.a[0], 0.3, P.a[1], '#ffd35a', { n: 8 });
      if (P && P.cand) box(P.cand.x0, P.cand.z0, P.cand.x1, P.cand.z1, P.cand.bad ? '#ff6b6b' : '#7be08c');
      if (P && P.sel) { const f = F(); if (P.sel.kind === 'item') { const it = f.items.find(i => i.id === P.sel.id), d = ITEMS[it.t]; box(it.x - d.fp[0] / 2 - 0.3, it.z - d.fp[1] / 2 - 0.3, it.x + d.fp[0] / 2 + 0.3, it.z + d.fp[1] / 2 + 0.3, '#ffd35a'); } else { const p = f.paddocks.find(q => q.id === P.sel.id); if (p) box(p.x0, p.z0, p.x1, p.z1, '#ffd35a'); } }
      if (k.parts.length) preview.add(k.build({ shadow: false }));
    }
    // can a rectangle (a paddock, an item's footprint) go here?
    function clear(x0, z0, x1, z1, skip) {
      if (x0 < 1 || z0 < 1 || x1 > W - 1 || z1 > D - 1) return 'Too near the edge.';
      const hit = r => x0 < r[2] && x1 > r[0] && z0 < r[3] && z1 > r[1];
      if (hit(BARN) || hit([2, 13.8, 4.4, 16.2]) || hit([21.6, 1.6, 23.2, 3.2])) return 'Something’s in the way.';
      if (hit([MEADOW[0] - 1, MEADOW[1] - 1, MEADOW[2] + 1, MEADOW[3] + 1])) return 'That’s the hay meadow.';
      for (const [a, b, cc, d] of TRACK) if (skip !== 'track' && hit([a, b, cc, d])) return 'Keep the track clear.';
      return null;
    }
    function tap(x, z) {
      if (!P) return false; const f = F();
      if (P.mode === 'pad') {
        const sx = Math.round(x), sz = Math.round(z);
        if (!P.a || P.cand) { P.a = [sx, sz]; P.cand = null; return planner(), true; }
        const x0 = Math.min(P.a[0], sx), x1 = Math.max(P.a[0], sx), z0 = Math.min(P.a[1], sz), z1 = Math.max(P.a[1], sz);
        let bad = x1 - x0 < 4 || z1 - z0 < 4 ? 'At least four tiles each way.' : clear(x0, z0, x1, z1);
        if (!bad && f.paddocks.some(p => x0 < p.x1 + 0.5 && x1 > p.x0 - 0.5 && z0 < p.z1 + 0.5 && z1 > p.z0 - 0.5)) bad = 'That runs into another paddock.';
        if (!bad && f.items.some(it => !ITEMS[it.t].in && it.x > x0 - 1 && it.x < x1 + 1 && it.z > z0 - 1 && it.z < z1 + 1)) bad = 'Equipment’s in the way. Move it first.';
        P.cand = { x0, z0, x1, z1, bad, xp: Math.round((x1 - x0 + z1 - z0) * 2 / 2) * FENCE_XP };
        if (bad) c.toast(bad); planner(); return true;
      }
      if ((P.mode === 'fit' || P.mode === 'eq' || (P.mode === 'edit' && P.moving)) && (P.t || P.moving)) {
        const t = P.moving ? f.items.find(i => i.id === P.sel.id).t : P.t, d = ITEMS[t], ry = P.ry || 0, sw = ry % Math.PI ? d.fp[1] : d.fp[0], sd = ry % Math.PI ? d.fp[0] : d.fp[1];
        const cx = Math.round(x * 2) / 2, cz = Math.round(z * 2) / 2, x0 = cx - sw / 2, x1 = cx + sw / 2, z0 = cz - sd / 2, z1 = cz + sd / 2, p = padOf(f, cx, cz);
        let bad = clear(x0, z0, x1, z1);
        if (!bad && d.in === true && !(p && inPad(p, x0, z0, 0.2) && inPad(p, x1, z1, 0.2))) bad = 'That goes inside a paddock.';
        if (!bad && d.in === false && f.paddocks.some(q => x0 < q.x1 + 0.4 && x1 > q.x0 - 0.4 && z0 < q.z1 + 0.4 && z1 > q.z0 - 0.4)) bad = 'Equipment goes outside the paddocks.';
        if (!bad && d.in == null && f.paddocks.some(q => (x0 < q.x1 + 0.4 && x1 > q.x0 - 0.4 && z0 < q.z1 + 0.4 && z1 > q.z0 - 0.4) && !(inPad(q, x0, z0, 0.2) && inPad(q, x1, z1, 0.2)))) bad = 'Not across a fence.';
        if (!bad && f.items.some(it => it.id !== (P.moving ? P.sel.id : null) && Math.abs(it.x - cx) < (ITEMS[it.t].fp[0] + sw) / 2 + 0.3 && Math.abs(it.z - cz) < (ITEMS[it.t].fp[1] + sd) / 2 + 0.3)) bad = 'Something’s already there.';
        const g = f.paddocks.map(gateOf).find(gg => Math.hypot(gg.x - cx, gg.z - cz) < 2.6); if (!bad && g) bad = 'Keep the gate clear.';
        if (bad) { c.toast(bad); return true; }
        if (P.moving) { const it = f.items.find(i => i.id === P.sel.id); Object.assign(it, { x: cx, z: cz, ry }); P.moving = false; P.sel = null; save(); c.toast('Moved.'); return reload(), true; }
        if (!sh().pay(d.xp, 'the ' + d.name.toLowerCase())) return true;
        f.items.push({ id: nid(), t, x: cx, z: cz, ry }); save(); c.xp(); c.sound('place'); c.toast(`${d.e} ${d.name} placed!`); reload(); return true;
      }
      if (P.mode === 'edit') {
        const it = f.items.slice().reverse().find(i => Math.abs(i.x - x) < ITEMS[i.t].fp[0] / 2 + 0.4 && Math.abs(i.z - z) < ITEMS[i.t].fp[1] / 2 + 0.4);
        if (it) P.sel = { kind: 'item', id: it.id }; else { const p = padOf(f, x, z); P.sel = p ? { kind: 'pad', id: p.id } : null; }
        P.moving = false; planner(); return true;
      }
      return false;
    }
    function reload() { const keep = P; IH.village.reload(); P = keep; setTimeout(() => { if (P && V() && V().where === 'farm') planner(); }, 60); }
    function click(k) {
      const [what, a, b] = k.split(':'), f = F();
      if (what === 'feed') { const x = FEED[a]; if (!sh().pay(x.xp, 'the ' + x.name.toLowerCase())) return; f.feed[a] = (f.feed[a] || 0) + x.n; save(); c.xp(); c.sound('buy'); return shop('feed'); }
      if (what === 'pick') return pickPad(a);
      if (what === 'buy') return buyAnimal(a, b);
      if (what === 'dout') return getOut();
      if (what === 'auto') return autoStart();
      if (what === 'hitch') return hitch(a);
      if (what === 'pclose') { P = null; V().plan = null; while (preview.children.length) preview.remove(preview.children[0]); document.querySelector('.vg-game').hidden = true; return; }
      if (what === 'mode') { P = { mode: a }; return planner(); }
      if (what === 'item') { P.t = a; return planner(); }
      if (what === 'rot') { P.ry = P.ry ? 0 : Math.PI / 2; return planner(); }
      if (what === 'padno') { P.a = null; P.cand = null; return planner(); }
      if (what === 'padok') { const C = P.cand; if (!C || C.bad || !sh().pay(C.xp, 'the fencing')) return; f.paddocks.push({ id: nid(), x0: C.x0, z0: C.z0, x1: C.x1, z1: C.z1 }); P.a = null; P.cand = null; save(); c.xp(); c.sound('place'); c.toast('Paddock built! Put a water trough in it, then some animals.'); return reload(); }
      if (what === 'desel') { P.sel = null; P.moving = false; return planner(); }
      if (what === 'move') { P.moving = true; P.ry = (f.items.find(i => i.id === P.sel.id) || {}).ry || 0; return planner(); }
      if (what === 'sell') {
        if (P.sel.kind === 'item') { const i = f.items.findIndex(x => x.id === P.sel.id), it = f.items[i]; if (i < 0) return; f.items.splice(i, 1); sh().xp(Math.round(ITEMS[it.t].xp / 2)); c.toast(`Sold the ${ITEMS[it.t].name.toLowerCase()}: ✨ ${Math.round(ITEMS[it.t].xp / 2)} back.`); }
        else { const p = f.paddocks.find(q => q.id === P.sel.id); if (!p) return; if (f.animals.some(x => x.pad === p.id)) return c.toast('Animals live there. Move them out first (sell them, or keep the paddock).'); if (f.items.some(it => ITEMS[it.t].in && padOf(f, it.x, it.z) === p)) return c.toast('Take its fittings out first.'); f.paddocks = f.paddocks.filter(q => q !== p); const back = Math.round((p.x1 - p.x0 + p.z1 - p.z0) * FENCE_XP / 2); sh().xp(back); c.toast(`Fence down: ✨ ${back} back.`); }
        P.sel = null; save(); c.xp(); return reload();
      }
    }
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    return { ap: () => AP, acts, click, tap, tick, prep() { AP = null; if (DR) { removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); DR = null; } P = null; const v = V(); if (v) v.plan = null; if (v && v.where === 'farm') { const btn = document.createElement('button'); btn.className = 'ih-pill vg-plan'; btn.dataset.v = 'farm'; btn.dataset.k = 'mode:menu'; btn.textContent = '🛠️ Plan'; const top = v.ui.querySelector('.ih-top .ih-sp'); if (top) top.before(btn); } }, ANIMALS, ITEMS, TRACTOR_SEAT };
  };
})();
