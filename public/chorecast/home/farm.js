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
  const { Kit } = IH.kit, IB = IH.islandsBuild, K = IB.kit, { rng, bx, sides, board, signpost } = K;
  const W = 52, D = 44, DAY = 864e5, today = () => Math.floor(Date.now() / DAY);
  const TRACK = [[24, 0.4, 28, 16], [6, 13, 46, 17]], BARN = [6.6, 2.2, 17.4, 9.8], FENCE_XP = 8;

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
    const RED = '#d8433a', DK = '#2a2630', HUB = '#e8c45a';
    bx(kk, 1.0, 0.5, 3.6, 0, 0.55, 0.1, '#3d4048', { r: 0.06 }); // the chassis
    bx(kk, 1.2, 0.95, 1.9, 0, 0.9, 0.95, RED, { r: 0.14 }); bx(kk, 1.1, 0.1, 1.8, 0, 1.85, 0.95, '#c23a31', { r: 0.05 }); // the bonnet
    bx(kk, 1.0, 0.7, 0.1, 0, 0.98, 1.92, '#3d4048', { r: 0.03 }); for (let i = 0; i < 5; i++) bx(kk, 0.9, 0.05, 0.04, 0, 1.06 + i * 0.12, 1.98, '#9aa0aa');
    for (const s of [-1, 1]) kk.ball(0.12, s * 0.42, 1.55, 1.92, '#fff3c0', { n: 8 }); // headlights
    kk.cyl(0.07, 1.1, 0.42, 1.8, 1.4, '#3d4048', { n: 6 }); kk.cyl(0.09, 0.08, 0.42, 2.9, 1.4, '#3d4048', { n: 6 }); // the stack
    for (const s of [-1, 1]) { // the big back wheels with their hubs and tread, the mudguards; the front wheels
      kk.cyl(0.92, 0.55, s * 0.98, 0.92, -0.62, DK, { n: 20, rz: Math.PI / 2 }); kk.cyl(0.42, 0.57, s * 0.98, 0.92, -0.62, HUB, { n: 14, rz: Math.PI / 2 });
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; kk.box(0.58, 0.1, 0.2, s * 0.98, 0.92 + Math.sin(a) * 0.86, -0.62 + Math.cos(a) * 0.86, DK, { rx: Math.PI / 2 - a }); } // (lugs across the tread, standing out from it)
      kk.box(0.62, 0.08, 1.6, s * 0.98, 1.95, -0.62, RED, { r: 0.04 }); kk.box(0.62, 0.7, 0.08, s * 0.98, 1.3, 0.2, RED);
      kk.cyl(0.48, 0.34, s * 0.78, 0.48, 1.45, DK, { n: 16, rz: Math.PI / 2 }); kk.cyl(0.22, 0.36, s * 0.78, 0.48, 1.45, HUB, { n: 10, rz: Math.PI / 2 });
    }
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
  function fence(k, p, gate) {
    const sides = [[[p.x0, p.z0], [p.x1, p.z0], 'n'], [[p.x1, p.z0], [p.x1, p.z1], 'e'], [[p.x1, p.z1], [p.x0, p.z1], 's'], [[p.x0, p.z1], [p.x0, p.z0], 'w']];
    const runs = []; for (const [a, b, s] of sides) { if (s !== gate.side) { runs.push([a, b]); continue; } const L = Math.hypot(b[0] - a[0], b[1] - a[1]), u0 = (L / 2 - 1.6) / L, u1 = (L / 2 + 1.6) / L, at = u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; runs.push([a, at(u0)], [at(u1), b]); }
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
    k.at(3.2, 0, 15, 0, kk => { for (const [a, b] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) kk.box(0.1, 7.4, 0.1, a * 0.6, 0, b * 0.6, '#8a8f98', { rx: b * -0.08, rz: a * 0.08 }); bx(kk, 0.6, 0.5, 0.6, 0, 7.2, 0, '#8a8f98'); });
    const blades = new Kit(); for (let i = 0; i < 12; i++) blades.box(0.32, 2.2, 0.04, 0, 1.1, 0, i % 2 ? '#e9e2d4' : '#c9ccd2', { rz: i / 12 * Math.PI * 2 }); const bl = blades.build(); bl.position.set(3.2, 7.45, 15.5); bl.userData.spin = 1.4; root.add(bl); solid(2.2, 14, 4.2, 16);
    signpost(k, 22.4, 2.4, 'farm'); solid(22.1, 2.1, 22.7, 2.7); spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [23.8, 3.6], yaw: Math.PI, hit: [22.4, 2.4, 0, 2.4] });
    // the paddocks: fences, a gate, and the gate's spot (feeding, who lives here)
    const pads = f.paddocks.map(p => { const g = gateOf(p), runs = fence(k, p, g); for (const [a, b] of runs) solid(a[0] - 0.2, a[1] - 0.2, b[0] + 0.2, b[1] + 0.2); const at = outside(g); spots.push({ kind: 'fgate', id: 'gate' + p.id, pad: p.id, name: 'the paddock gate', at, yaw: Math.atan2(g.x - at[0], g.z - at[1]), hit: [g.x, g.z, 0, 2.6] }); return { p, g }; });
    // fittings and equipment
    const models = {};
    for (const it of f.items) { const d = ITEMS[it.t]; if (!d) continue; const g = new T.Group(), kk = new Kit(); itemModel(it.t, kk); g.add(kk.build()); if (it.t === 'pond' && IH.look.seaSheet) g.add(IH.look.seaSheet(-2.2, -1.7, 2.2, 1.7, 0.16, (x, z) => { const e = (x / 1.85) ** 2 + (z / 1.35) ** 2; return e < 1 ? 0.16 - 0.8 * (1 - e) : 0.4; }, { n: 6, foam: 0.18, deepAt: 0.6, shallow: '#8fe0d0', deep: '#2f7f9f', mud: '#8f8a99' })); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; root.add(g); models[it.id] = g;
      const [w, dd] = d.fp, c = Math.abs(Math.cos(it.ry || 0)), s = Math.abs(Math.sin(it.ry || 0)), hw = (w * c + dd * s) / 2, hd = (w * s + dd * c) / 2; solid(it.x - hw, it.z - hd, it.x + hw, it.z + hd);
      if (/^(coop|pond|sty|milkstand|shearstand|beehive|tractor|quad|trough|feeder)$/.test(it.t)) spots.push({ kind: 'fitem', id: 'it' + it.id, item: it.id, t: it.t, name: 'the ' + d.name.toLowerCase(), at: [it.x, it.z + hd + 1.2], yaw: Math.PI, hit: [it.x, it.z, 0, Math.max(w, dd) + 0.4] }); }
    // the animals, each in its own paddock, moving its own way (village.js: the generic movers, or the 3D ones)
    const pens = {}; for (const { p } of pads) pens[p.id] = [p.x0 + 1, p.z0 + 1, p.x1 - 1, p.z1 - 1];
    for (const a of f.animals) { const pen = pens[a.pad]; if (!pen) continue; const mk = (IH.animals3d && IH.animals3d.make) || ((kind) => (IB.MAKE[kind] || IB.MAKE.hen)()); const m = mk(a.kind); m.pen = pen; m.rec = a; let x = 0, z = 0; for (let q = 0; q < 30; q++) { x = pen[0] + R() * (pen[2] - pen[0]); z = pen[1] + R() * (pen[3] - pen[1]); if (!solids.some(r => x > r[0] - 0.8 && x < r[2] + 0.8 && z > r[1] - 0.8 && z < r[3] + 0.8)) break; } m.group.position.set(x, 0, z); m.group.rotation.y = R() * 6.28; animals.push(m); root.add(m.group); }
    root.add(k.build()); for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 2, z); m.userData.spot = s; root.add(m); }
    const lawns = [[1, 1, 51, 43]], paths = TRACK.map(r => r.slice());
    return { id: 'farm', title: 'Farm paddock', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids, pond: null, bridges: [], spots, buildings: [], arrive: [26, 3.6], lawns, paths, animals, pens, models, npc: 0, centre: [26, 20], growth: 0.55, welcome: 'Your farm. The barn has animals, feed and the farm planner.', farm: f };
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
      c.walkTo(s.at[0], s.at[1], ok => { if (!ok) return; const B = V().B, m = B.models[s.item]; if (!m) return; const x0 = m.position.x, z0 = m.position.z, r0 = m.rotation.y;
        c.ride({ dur: t === 'quad' ? 16 : 22, lift: t === 'quad' ? 0.75 : 0, seat: t === 'quad' ? null : TRACTOR_SEAT, model: m, pose: 'sitchair', bob: t === 'quad' ? 0.05 : 0.02, at: u => { const a = u * Math.PI * 2; return [26 + Math.cos(a - Math.PI / 2) * 20, 0, 15 + Math.sin(a - Math.PI / 2) * 1.2 + Math.sin(a * 2) * 0.6]; }, end: () => { m.position.set(x0, 0, z0); m.rotation.y = r0; sh().relax({ fun: 16 }); c.toast(t === 'quad' ? 'Vroom! Round the farm. 🏍️' : 'Round the farm in the tractor! 🚜'); } }); }, s.yaw);
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
    return { acts, click, tap, prep() { P = null; const v = V(); if (v) v.plan = null; if (v && v.where === 'farm') { const btn = document.createElement('button'); btn.className = 'ih-pill vg-plan'; btn.dataset.v = 'farm'; btn.dataset.k = 'mode:menu'; btn.textContent = '🛠️ Plan'; const top = v.ui.querySelector('.ih-top .ih-sp'); if (top) top.before(btn); } }, ANIMALS, ITEMS, TRACTOR_SEAT };
  };
})();
