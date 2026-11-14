/* Chorecast homes (a prototype), part 3 of 5: the homes, from a one-room studio to a six-room manor.
   Each home sits on its own floating plot of land with a cut-away side (turf, topsoil, rock), like the islands did.
   The house is a cut-away dollhouse: the two walls nearest the camera drop to a low ledge so you see in, the far
   walls stand full height with windows, curtains and sunbeams, and inner walls stand at half height with doorways.
   Turning the view swaps which walls are cut away.
   Grid: one unit is one floor tile. The house covers x 0..w, z 0..d; the plot adds a garden round it. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const { Kit, shade, rng } = IH.kit;
  const FY = 0.35, H = 4.6, HI = 2.3, TE = 0.32, TI = 0.2, STUB = 0.55, RING = 17, SIDEWALK = 6; // RING: the street round an island home (a 2.5 m lane, then the 6 m lots facing in)

  const HOMES = [
    {
      id: 'studio', name: 'Cosy Studio', size: 'Small', rooms_: '1 room, a kitchen and a bathroom', xp: 0, earn: 0,
      about: 'One snug room with big windows, a little kitchen and a bathroom. Room for a bed, a desk and your favourite things.',
      w: 12, d: 7, rooms: [{ x: 0, z: 0, w: 8, d: 7, floor: 'wood', wall: '#f8dccb', name: 'Studio' }, { x: 8, z: 0, w: 4, d: 4, floor: 'tile', wall: '#fff2c9', tiles: ['#ffffff', '#9fd3f0'], name: 'Kitchen' }, { x: 8, z: 4, w: 4, d: 3, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' }],
      door: { side: 's', at: 5 }, ext: { style: 'plaster', col: '#fdebd9', trim: '#ffffff', cap: '#a8705a', base: '#e1b9a0' },
      wood: '#dca46c', curtain: '#ff9fb7', plot: { l: 3, t: 3, r: 3, b: 4, ground: 'grass' }, trees: [['round', -2, -2], ['round', 9.5, -1.5]]
    },
    {
      id: 'cabin', name: 'Garden Cabin', size: 'Small', rooms_: '1 room, a kitchen, a bathroom and a deck', xp: 1500, earn: 1000,
      about: 'A log cabin in a flower garden, with a kitchen, a bathroom and a deck for sitting out in the sun.',
      w: 14, d: 8, rooms: [{ x: 0, z: 0, w: 10, d: 8, floor: 'wood', wall: '#f4e6cb', name: 'Cabin' }, { x: 10, z: 0, w: 4, d: 5, floor: 'tile', wall: '#fff2c9', tiles: ['#ffffff', '#9fd3f0'], name: 'Kitchen' }, { x: 10, z: 5, w: 4, d: 3, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' }],
      door: { side: 's', at: 4 }, ext: { style: 'logs', col: '#b8794a', trim: '#7d4b2b', cap: '#5c3720' },
      wood: '#c99059', curtain: '#8fd07b', deck: { depth: 3 }, plot: { l: 3, t: 3, r: 4, b: 6, ground: 'garden' }, trees: [['pine', -2, -2], ['pine', -2, 3], ['round', 12, -2]]
    },
    {
      id: 'flat', name: 'City Flat', size: 'Small', rooms_: '4 rooms', xp: 2200, earn: 1800,
      about: 'A neat flat in town: a bedroom, a lounge, a kitchen and a bathroom.',
      w: 11, d: 8, rooms: [
        { x: 0, z: 0, w: 6, d: 4, floor: 'carpet', wall: '#eae4fb', carpet: '#a9b8e8', name: 'Bedroom' },
        { x: 6, z: 0, w: 5, d: 4, floor: 'tile', wall: '#fff2c9', tiles: ['#ffffff', '#9fd3f0'], name: 'Kitchen' },
        { x: 0, z: 4, w: 6, d: 4, floor: 'wood', wall: '#f6ede0', name: 'Lounge' },
        { x: 6, z: 4, w: 5, d: 4, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' }],
      door: { side: 's', at: 2 }, ext: { style: 'plaster', col: '#e6ecf6', trim: '#ffffff', cap: '#5f6f8f', base: '#c9d2e4' },
      wood: '#d2a272', curtain: '#9db6f0', plot: { l: 3, t: 3, r: 3, b: 4, ground: 'grass' }, trees: [['round', -2, -2], ['round', 12.5, 9]]
    },
    {
      id: 'bach', name: 'Seaside Bach', size: 'Medium', rooms_: '4 rooms and a deck', xp: 3000, earn: 2500,
      about: 'A beach house with a lounge, a bedroom, a kitchen, a bathroom and a deck by the sand.',
      w: 16, d: 8, rooms: [{ x: 0, z: 0, w: 7, d: 8, floor: 'wood', wall: '#dff2f4', name: 'Lounge' }, { x: 7, z: 0, w: 5, d: 8, floor: 'carpet', wall: '#fde4df', carpet: '#7ec8e8', name: 'Bedroom' }, { x: 12, z: 0, w: 4, d: 5, floor: 'tile', wall: '#fff2c9', tiles: ['#ffffff', '#9fd3f0'], name: 'Kitchen' }, { x: 12, z: 5, w: 4, d: 3, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' }],
      door: { side: 's', at: 2 }, ext: { style: 'boards', col: '#f6fafa', trim: '#3b8ad0', cap: '#2e5c8a' },
      wood: '#e3c497', curtain: '#69c4ea', deck: { depth: 3 }, plot: { l: 3, t: 3, r: 3, b: 6, ground: 'sand' }, trees: [['palm', -2, -1.5], ['palm', 17.5, 1]]
    },
    {
      id: 'town', name: 'Town House', size: 'Medium', rooms_: '5 rooms', xp: 5500, earn: 5000,
      about: 'A lounge, a kitchen, a bedroom, a playroom and a bathroom.',
      w: 13, d: 10, rooms: [
        { x: 0, z: 0, w: 8, d: 6, floor: 'wood', wall: '#e5e8f8', name: 'Lounge' },
        { x: 8, z: 0, w: 5, d: 6, floor: 'tile', wall: '#fff2c9', tiles: ['#ffffff', '#9fd3f0'], name: 'Kitchen' },
        { x: 0, z: 6, w: 6, d: 4, floor: 'carpet', wall: '#e2f3dc', carpet: '#b9a7e8', name: 'Bedroom' },
        { x: 6, z: 6, w: 4, d: 4, floor: 'wood', wall: '#fadeeb', name: 'Playroom' },
        { x: 10, z: 6, w: 3, d: 4, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' }],
      door: { side: 's', at: 7 }, ext: { style: 'brick', col: '#c86e52', trim: '#f4efe6', cap: '#7b3f30', mortar: '#ead9c8' },
      wood: '#cf9a66', curtain: '#f2c14e', plot: { l: 3, t: 3, r: 3, b: 4, ground: 'grass', fence: true }, trees: [['round', -2, -2], ['round', 14.5, -1.5], ['round', -2, 11]]
    },
    {
      id: 'family', name: 'Family Home', size: 'Large', rooms_: '6 rooms and a deck', xp: 9000, earn: 9000,
      about: 'A big home with a lounge, a kitchen, two bedrooms, a study, a bathroom and a sunny deck.',
      w: 16, d: 12, rooms: [
        { x: 0, z: 0, w: 9, d: 7, floor: 'wood', wall: '#f3ead9', name: 'Lounge' },
        { x: 9, z: 0, w: 7, d: 7, floor: 'tile', wall: '#e3f4ea', tiles: ['#fffaf0', '#f3b8a0'], name: 'Kitchen' },
        { x: 0, z: 7, w: 6, d: 5, floor: 'carpet', wall: '#e6e3fb', carpet: '#9ccbe9', name: 'Bedroom' },
        { x: 6, z: 7, w: 5, d: 5, floor: 'carpet', wall: '#fde3ea', carpet: '#f6b6c8', name: 'Bedroom' },
        { x: 11, z: 7, w: 5, d: 2, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' },
        { x: 11, z: 9, w: 5, d: 3, floor: 'wood', wall: '#fff1cf', name: 'Study' }],
      door: { side: 's', at: 13 }, ext: { style: 'boards', col: '#f7e7b5', trim: '#ffffff', cap: '#8a6a3a' },
      wood: '#d8a56e', curtain: '#7cc8a4', deck: { depth: 3 }, plot: { l: 4, t: 3, r: 4, b: 6, ground: 'garden', fence: true }, trees: [['round', -3, -2], ['pine', 18.5, -2], ['round', -3, 10]]
    },
    {
      id: 'farm', name: 'Country Farmhouse', size: 'Large', rooms_: '6 rooms and a deck', xp: 12000, earn: 12000,
      about: 'A red farmhouse with a big kitchen, two bedrooms, a bathroom, a lounge and a mudroom by the deck.',
      w: 18, d: 12, rooms: [
        { x: 0, z: 0, w: 8, d: 7, floor: 'wood', wall: '#f7ecdc', name: 'Lounge' },
        { x: 8, z: 0, w: 6, d: 7, floor: 'tile', wall: '#fff4d8', tiles: ['#fffaf0', '#e8b07a'], name: 'Kitchen' },
        { x: 14, z: 0, w: 4, d: 7, floor: 'carpet', wall: '#e8f0e0', carpet: '#b6d49a', name: 'Bedroom' },
        { x: 0, z: 7, w: 6, d: 5, floor: 'carpet', wall: '#f8e2e6', carpet: '#e8a8b8', name: 'Bedroom' },
        { x: 6, z: 7, w: 4, d: 5, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' },
        { x: 10, z: 7, w: 8, d: 5, floor: 'wood', wall: '#efe6d6', name: 'Mudroom' }],
      door: { side: 's', at: 12 }, ext: { style: 'boards', col: '#d9544a', trim: '#ffffff', cap: '#5a3a2a' },
      wood: '#c98f5a', curtain: '#f2c14e', deck: { depth: 3 }, plot: { l: 4, t: 3, r: 4, b: 6, ground: 'garden', fence: true }, trees: [['round', -3, -2], ['pine', 20.5, -2], ['round', -3, 11], ['pine', 21, 9]]
    },
    {
      id: 'manor', name: 'Hilltop Manor', size: 'Huge', rooms_: '7 rooms', xp: 15000, earn: 15000,
      about: 'The biggest home: a grand hall, a tatami room, a kitchen, two bedrooms, a music room, a bathroom and cherry trees.',
      w: 20, d: 14, rooms: [
        { x: 0, z: 0, w: 10, d: 8, floor: 'wood', wall: '#f5eee2', name: 'Grand hall' },
        { x: 10, z: 0, w: 5, d: 8, floor: 'tatami', wall: '#f3ecd6', name: 'Tatami room' },
        { x: 15, z: 0, w: 5, d: 8, floor: 'tile', wall: '#e4f1f8', tiles: ['#ffffff', '#c9d6e8'], name: 'Kitchen' },
        { x: 0, z: 8, w: 7, d: 6, floor: 'carpet', wall: '#ece1f8', carpet: '#b7a2e0', name: 'Bedroom' },
        { x: 7, z: 8, w: 4, d: 6, floor: 'wood', wall: '#fbe6d8', name: 'Music room' },
        { x: 11, z: 8, w: 3, d: 6, floor: 'tile', wall: '#e3f4f8', tiles: ['#ffffff', '#b8e4f0'], name: 'Bathroom' },
        { x: 14, z: 8, w: 6, d: 6, floor: 'carpet', wall: '#def3ec', carpet: '#8fd3c1', name: 'Bedroom' }],
      door: { side: 's', at: 8 }, ext: { style: 'timber', col: '#fbf6ee', trim: '#6b4330', cap: '#4f3123' },
      wood: '#c88a58', curtain: '#e88aa8', plot: { l: 4, t: 4, r: 4, b: 5, ground: 'garden', fence: true }, trees: [['cherry', -3, -2.5], ['cherry', 22.5, -2], ['cherry', -3, 13], ['round', 23, 12]]
    }
  ];

  const SIDES = {
    n: { axis: 'x', line: () => 0, out: [0, -1], inn: [0, 1] },
    s: { axis: 'x', line: d => d.d, out: [0, 1], inn: [0, -1] },
    w: { axis: 'z', line: () => 0, out: [-1, 0], inn: [1, 0] },
    e: { axis: 'z', line: d => d.w, out: [1, 0], inn: [-1, 0] }
  };
  const key = (x, z) => x + ',' + z;

  // A box against a wall side: u along the wall, y up, o0..o1 across it (positive is outside).
  function wbox(k, def, side, u0, u1, y0, y1, o0, o1, col, opt = {}) {
    const S = SIDES[side], L = S.line(def), du = u1 - u0, dy = y1 - y0, dz = o1 - o0; if (du <= 0.001 || dy <= 0.001) return;
    const cu = (u0 + u1) / 2, co = (o0 + o1) / 2;
    if (S.axis === 'x') k.box(du, dy, Math.abs(dz), cu, y0, L + S.out[1] * co, col, opt);
    else k.box(Math.abs(dz), dy, du, L + S.out[0] * co, y0, cu, col, opt);
  }
  const wpos = (def, side, u, o) => { const S = SIDES[side], L = S.line(def); return S.axis === 'x' ? [u, L + S.out[1] * o] : [L + S.out[0] * o, u]; };

  // Solid parts of a wall strip from u0 to u1 and y0 to y1, with openings cut out.
  function solids(u0, u1, y0, y1, open) {
    const out = [], cuts = open.filter(o => o.u1 > u0 && o.u0 < u1 && o.y0 < y1).sort((a, b) => a.u0 - b.u0);
    let u = u0;
    for (const o of cuts) {
      if (o.u0 > u) out.push([u, o.u0, y0, y1]);
      const a = Math.max(u, o.u0), b = Math.min(u1, o.u1);
      if (o.y0 > y0) out.push([a, b, y0, Math.min(o.y0, y1)]);
      if (o.y1 < y1) out.push([a, b, Math.max(o.y1, y0), y1]);
      u = Math.max(u, o.u1);
    }
    if (u < u1) out.push([u, u1, y0, y1]);
    return out;
  }

  function layout(def) {
    const cells = new Map(), edges = new Set(), walls = new Set(), rooms = def.rooms;
    rooms.forEach((r, i) => { for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) cells.set(key(x, z), { x, z, zone: 'in', room: i, y: FY }); });
    const P = def.plot;
    for (let x = -P.l; x < def.w + P.r; x++) for (let z = -P.t; z < def.d + P.b; z++) {
      if (cells.has(key(x, z))) continue;
      const deck = def.deck && z >= def.d && z < def.d + def.deck.depth && x >= 0 && x < def.w;
      cells.set(key(x, z), { x, z, zone: 'out', y: deck ? 0.3 : 0, deck });
    }
    // inner walls between rooms, with a doorway in each
    const inner = [];
    for (let i = 0; i < rooms.length; i++) for (let j = 0; j < rooms.length; j++) {
      if (i === j) continue; const A = rooms[i], B = rooms[j];
      if (A.x + A.w === B.x) { const a = Math.max(A.z, B.z), b = Math.min(A.z + A.d, B.z + B.d); if (b - a >= 1) inner.push({ axis: 'z', at: B.x, a, b, i, j }); }
      if (A.z + A.d === B.z) { const a = Math.max(A.x, B.x), b = Math.min(A.x + A.w, B.x + B.w); if (b - a >= 1) inner.push({ axis: 'x', at: B.z, a, b, i, j }); }
    }
    // One way into each room: starting from the room the front door opens into, each room gets a single doorway
    // from the first room that reaches it (the longest shared wall when there's a choice); every other wall between
    // rooms is solid. A bathroom is never a way through to anywhere.
    const fd = def.door, entry = Math.max(0, rooms.findIndex(r => fd.side === 's' && r.z + r.d === def.d && fd.at >= r.x && fd.at + 2 <= r.x + r.w));
    const seen = new Set([entry]), q = [entry];
    while (q.length) {
      const r = q.shift(); if (r !== entry && rooms[r].name === 'Bathroom') continue;
      const segs = inner.filter(s => (s.i === r || s.j === r) && !seen.has(s.i === r ? s.j : s.i)).sort((a, b) => (b.b - b.a) - (a.b - a.a));
      for (const s of segs) { const o = s.i === r ? s.j : s.i; if (seen.has(o)) continue; seen.add(o); s.open = true; q.push(o); }
    }
    // a room a kid built on (buildon.js) has its doorway where they put it: that one wall open, at that spot
    rooms.forEach((r, ri) => { if (r.doorAt == null) return; const mine = inner.filter(s => s.i === ri || s.j === ri); mine.forEach(s => { s.open = false; }); const s = mine.find(q => r.doorAt >= q.a && r.doorAt < q.b); if (s) { s.open = true; s.fixed = r.doorAt; } });
    for (const s of inner) {
      const len = s.b - s.a, dw = len >= 3 ? 2 : 1, d0 = s.fixed != null ? Math.max(s.a, Math.min(s.b - dw, s.fixed)) : s.a + Math.floor((len - dw) / 2); s.door = s.open ? [d0, d0 + dw] : null;
      for (let u = s.a; u < s.b; u++) { if (s.door && u >= d0 && u < d0 + dw) continue; const k = s.axis === 'z' ? 'v' + key(s.at, u) : 'h' + key(u, s.at); edges.add(k); walls.add(k); }
    }
    // outside walls block too, except the front door
    const dr = def.door, doorU = [dr.at, dr.at + 2];
    for (let x = 0; x < def.w; x++) { for (const [z, sd] of [[0, 'n'], [def.d, 's']]) { if (sd === dr.side && x >= doorU[0] && x < doorU[1]) continue; walls.add('h' + key(x, z)); } }
    for (let z = 0; z < def.d; z++) { for (const [x, sd] of [[0, 'w'], [def.w, 'e']]) { if (sd === dr.side && z >= doorU[0] && z < doorU[1]) continue; walls.add('v' + key(x, z)); } }
    // openings: the door, and a window for each room on each outside side it touches
    const open = { n: [], s: [], e: [], w: [] };
    open[dr.side].push({ u0: dr.at + 0.1, u1: dr.at + 1.9, y0: FY - 0.01, y1: FY + 3.7, kind: 'door' });
    if (def.openings) { for (const o of def.openings) if (open[o.side]) open[o.side].push(o); } else for (const r of rooms) {
      const spans = [];
      if (r.z === 0) spans.push(['n', r.x, r.x + r.w]); if (r.z + r.d === def.d) spans.push(['s', r.x, r.x + r.w]);
      if (r.x === 0) spans.push(['w', r.z, r.z + r.d]); if (r.x + r.w === def.w) spans.push(['e', r.z, r.z + r.d]);
      for (const [sd, a, b] of spans) {
        const len = b - a; if (len < 3) continue;
        const ww = len >= 7 ? 3 : 2, u0 = a + Math.floor((len - ww) / 2);
        const win = { u0: u0 + 0.05, u1: u0 + ww - 0.05, y0: FY + 1.45, y1: FY + 3.55, kind: 'window', room: r };
        if (open[sd].some(o => o.u1 > win.u0 - 0.4 && o.u0 < win.u1 + 0.4)) {
          // the door is in the way: try the other end of the span
          const alt = { ...win, u0: a + 0.55, u1: a + 0.45 + ww }; if (len >= ww + 3 && !open[sd].some(o => o.u1 > alt.u0 - 0.4 && o.u0 < alt.u1 + 0.4)) open[sd].push(alt);
          continue;
        }
        open[sd].push(win);
      }
    }
    // where inner walls meet each outside side (wall pictures can't straddle these)
    const junc = { n: [], s: [], e: [], w: [] };
    for (const s of inner) {
      if (s.axis === 'z') { if (s.a === 0) junc.n.push(s.at); if (s.b === def.d) junc.s.push(s.at); }
      else { if (s.a === 0) junc.w.push(s.at); if (s.b === def.w) junc.e.push(s.at); }
    }
    return { cells, edges, walls, inner, open, junc };
  }

  // ---- building the pieces
  function plot(def, k) {
    const P = def.plot, RG = def.setting === 'island' ? RING : 0, SW = def.setting === 'sidewalk' ? SIDEWALK : 0; // (an island home: a paved street ring round the garden; or a pavement along its front; the island that much bigger)
    const gx0 = -P.l, gz0 = -P.t, gx1 = def.w + P.r, gz1 = def.d + P.b, x0 = gx0 - RG, z0 = gz0 - RG, x1 = gx1 + RG, z1 = gz1 + RG + SW, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const g = P.ground, top = g === 'balcony' ? '#cfcac1' : g === 'sand' ? '#f2dca3' : '#93d36b', lip = g === 'sand' ? '#e4c784' : '#74b84f', soil = '#9a6a45', soil2 = '#7d5236', rock = '#8f8a99', rock2 = '#6f6a7d';
    if (RG) { // the garden, and the paving all round it
      k.box(gx1 - gx0, 0.42, gz1 - gz0, (gx0 + gx1) / 2, -0.42, (gz0 + gz1) / 2, top, { r: 0.04 });
      for (const [a, b, c, d] of [[x0, x1, z0, gz0], [x0, x1, gz1, z1], [x0, gx0, gz0, gz1], [gx1, x1, gz0, gz1]]) k.box(b - a, 0.4, d - c, (a + b) / 2, -0.42, (c + d) / 2, '#cfc9be', { r: 0.02 });
      k.box(W, 0.42, D, cx, -0.44, cz, '#c6bfb2', { r: 0.18, seg: 2 });
    } else if (SW) { // the garden, then the pavement along the island's front: square slabs, a yellow tactile guide strip, the kerb
      k.box(gx1 - gx0, 0.42, gz1 - gz0, (gx0 + gx1) / 2, -0.42, (gz0 + gz1) / 2, top, { r: 0.04 });
      k.box(x1 - x0, 0.42, SW, cx, -0.42, gz1 + SW / 2, '#d3cdc2', { r: 0.04 });
      for (let x = Math.ceil(x0); x < x1; x++) k.box(0.05, 0.005, SW - 0.6, x, 0.0, gz1 + SW / 2 - 0.15, '#bfb8ac', { r: 0 }); // the slabs' joints
      k.box(x1 - x0, 0.01, 0.06, cx, 0.0, gz1 + SW / 2, '#bfb8ac', { r: 0 });
      k.box(x1 - x0 - 0.4, 0.03, 0.6, cx, 0.0, gz1 + SW * 0.62, '#f2c33a', { r: 0.01 }); for (let x = x0 + 0.4; x < x1 - 0.3; x += 0.6) k.box(0.4, 0.05, 0.08, x + 0.2, 0.0, gz1 + SW * 0.62, '#e2b02a', { r: 0.01 }); // tactile guide strip, its raised bars
      k.box(x1 - x0, 0.14, 0.5, cx, 0.0, z1 - 0.25, '#bdb6aa', { r: 0.04 }); // the kerb along the edge
      k.box(gx1 - gx0, 0.12, 0.18, (gx0 + gx1) / 2, 0.0, gz1 + 0.09, '#a9a297', { r: 0.03 }); // the garden's edging
      k.box(W, 0.42, D, cx, -0.44, cz, '#c6bfb2', { r: 0.18, seg: 2 });
    } else k.box(W, 0.42, D, cx, -0.42, cz, top, { r: def.setting ? 0.04 : 0.18, seg: 2 });
    if (def.setting && def.setting !== 'island' && def.setting !== 'sidewalk') return { x0, z0, x1, z1 }; // (on the ground in the city or the countryside: settings.js builds round it)
    k.box(W + 0.12, 0.16, D + 0.12, cx, -0.5, cz, lip, { r: 0.08 });
    k.box(W - 0.1, 1.15, D - 0.1, cx, -1.62, cz, soil, { r: 0.2, seg: 2 });
    k.box(W - 0.5, 0.9, D - 0.5, cx, -2.5, cz, rock, { r: 0.3, seg: 2 });
    k.box(W - 2.2, 0.8, D - 2.2, cx, -3.2, cz, rock2, { r: 0.35, seg: 2 });
    const R = rng(def.w * 31 + def.d);
    // stones and roots on the cut-away sides
    for (let i = 0; i < Math.round((W + D) * 0.9); i++) {
      const side = i % 4, t = R(), y = -0.85 - R() * 1.5, s = 0.18 + R() * 0.28, c = y < -1.6 ? shade(rock, R() * 0.2 - 0.1) : shade(soil2, R() * 0.2 - 0.1);
      const [x, z] = side === 0 ? [x0 + 0.05 + t * W, z1 - 0.02] : side === 1 ? [x1 - 0.02, z0 + t * D] : side === 2 ? [x0 + t * W, z0 + 0.02] : [x0 + 0.02, z0 + t * D];
      k.ball(s, x, y, z, c, { s: [1.2, 0.8, 1], n: 8 });
    }
    for (let i = 0; i < 6; i++) { const t = R(); k.cyl(0.04, 0.55, x0 + 0.3 + t * (W - 0.6), -1.25, z1 - 0.04, '#6b4528', { rz: 0.4 - R() * 0.8, n: 5 }); }
    // rocks under the plot so it floats like an island
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r0 = Math.min(W, D) * 0.28; k.cone(0.9 + R() * 0.8, 1.4 + R(), cx + Math.cos(a) * r0, -4.4 - R() * 0.4, cz + Math.sin(a) * r0, shade(rock2, -0.1 * R()), { rx: Math.PI, n: 7 }); }
    k.cone(Math.min(W, D) * 0.32, 2.8, cx, -5.6, cz, rock2, { rx: Math.PI, n: 9 });
    return RG || SW ? { x0: gx0, z0: gz0, x1: gx1, z1: gz1, view: { x0, z0, x1, z1 } } : { x0, z0, x1, z1 };
  }

  function groundDecor(def, k, lay, soft) {
    const P = def.plot, R = rng(def.w * 7 + def.d * 13), sand = P.ground === 'sand';
    if (P.ground === 'balcony') { // a flat's balcony: square concrete tiles, a rail of frosted glass panels along the front, a drain gully
      const z0 = def.d, z1 = def.d + P.b;
      for (let x = 0; x < def.w; x++) for (let z = z0; z < z1; z++) k.box(0.96, 0.02, 0.96, x + 0.5, 0, z + 0.5, (x + z) % 2 ? '#d6d1c8' : '#cbc5bb', { r: 0.01 });
      k.box(def.w, 0.03, 0.2, def.w / 2, 0, z0 + 0.15, '#a9a49b', { r: 0.01 });
      if (def.setting === 'street') { // over the street: a black iron rail, and flower boxes along it (as in the painting)
        for (let x = 0.3; x < def.w; x += 0.32) k.box(0.06, 2.0, 0.06, x, 0.2, z1 - 0.12, '#2f3238', { r: 0 });
        for (let x = 0.4; x < def.w - 0.3; x += 1.9) { k.box(1.7, 0.6, 0.6, x + 0.85, 0.2, z1 - 0.55, '#4f6b3f', { r: 0.06 }); for (let f = 0; f < 6; f++) { k.ball(0.24, x + 0.25 + f * 0.27, 1.0, z1 - 0.55 + (f % 2 ? 0.12 : -0.1), ['#5fae4a', '#4f9a3f', '#78c25a'][f % 3], { n: 7 }); if (f % 2 === 0) k.ball(0.11, x + 0.25 + f * 0.27, 1.25, z1 - 0.45, ['#ff8fb8', '#e85a5a', '#ffd35a', '#ffffff'][(f / 2 + Math.floor(x)) % 4], { n: 6 }); } }
      } else for (let x = 0.5; x < def.w; x += 1.5) k.glassBox(1.45, 1.9, 0.06, x + 0.25, 0.25, z1 - 0.12, { tint: '#e4eef2' });
      k.box(def.w, 0.32, 0.22, def.w / 2, 0, z1 - 0.12, '#bdb7ad', { r: 0.03 }); k.box(def.w + 0.1, 0.1, 0.16, def.w / 2, 2.15, z1 - 0.12, '#8f949c', { r: 0.03 }); // the kerb and the top rail
      for (const x of [0.06, def.w - 0.06]) { k.box(0.12, 2.25, P.b, x, 0, (z0 + z1) / 2, '#e8e2d6', { r: 0.03 }); } // the ends (the partitions to the neighbours are in the tower)
      return new Set();
    }
    // a path of stepping stones from the front door to the edge
    const pathCells = new Set();
    const dx = def.door.at + 1, z0 = def.d + (def.deck ? def.deck.depth : 0);
    for (let z = z0; z < def.d + P.b; z++) { pathCells.add(key(dx - 1, z)); pathCells.add(key(dx, z)); k.box(1.25, 0.08, 0.7, dx, -0.02, z + 0.5, sand ? '#d7c39a' : '#cfc8bd', { r: 0.12, ry: (R() - 0.5) * 0.3 }); }
    for (const c of lay.cells.values()) {
      if (c.zone !== 'out' || c.deck || pathCells.has(key(c.x, c.z))) continue;
      const n = sand ? (R() < 0.18 ? 1 : 0) : 4;
      for (let i = 0; i < n; i++) {
        const x = c.x + (sand ? 0.15 + R() * 0.7 : ((i % 2) + 0.15 + R() * 0.7) / 2), z = c.z + (sand ? 0.15 + R() * 0.7 : (Math.floor(i / 2) + 0.15 + R() * 0.7) / 2); // a lawn: four clumps a tile, one in each quarter
        if (sand) { for (let j = 0; j < 3; j++) soft.cone(0.05, 0.45, x + (j - 1) * 0.07, 0, z, '#9cc46a', { rz: (j - 1) * 0.35, n: 4, id: 0.5 }); continue; }
        lay.grass.push([x, z, 0.8 + R() * 0.5, R()]); // a drawn tuft here (app.js draws the lawn and grows it)
      }
      if (P.ground === 'garden' && R() < 0.22) { const x = c.x + 0.5, z = c.z + 0.5, pc = ['#ff8fb1', '#ffd34f', '#ffffff', '#b59cff', '#ff9b6a'][(R() * 5) | 0]; soft.cyl(0.02, 0.32, x, 0, z, '#4f9a3c', { n: 4 }); soft.ball(0.09, x, 0.36, z, pc, { n: 8 }); soft.ball(0.04, x, 0.4, z, '#ffe27a', { n: 6 }); }
      if (sand && R() < 0.05) soft.ball(0.12, c.x + 0.5, 0, c.z + 0.5, '#fff1e6', { s: [1, 0.5, 1], n: 8 });
    }
    // fence round the garden, with a gap for the path
    if (P.fence) {
      const x0 = -P.l, x1 = def.w + P.r, z0 = -P.t, z1 = def.d + P.b, wood = '#ffffff';
      const post = (x, z) => { k.box(0.16, 0.95, 0.16, x, 0, z, wood, { r: 0.04 }); k.cone(0.11, 0.14, x, 0.95, z, wood, { n: 4, ry: Math.PI / 4 }); };
      for (let x = x0 + 0.25; x <= x1 - 0.2; x += 0.5) { if (x > dx - 1.1 && x < dx + 1.1) continue; if (def.setting !== 'sidewalk') post(x, z1 - 0.15); post(x, z0 + 0.15); }
      for (let z = z0 + 0.75; z <= z1 - 0.7; z += 0.5) { post(x0 + 0.15, z); post(x1 - 0.15, z); }
      if (def.setting !== 'sidewalk') for (const [a, b] of [[x0 + 0.1, dx - 1.1], [dx + 1.1, x1 - 0.1]]) { k.box(b - a, 0.09, 0.07, (a + b) / 2, 0.55, z1 - 0.15, wood, { r: 0.02 }); }
      k.box(x1 - x0 - 0.2, 0.09, 0.07, (x0 + x1) / 2, 0.55, z0 + 0.15, wood, { r: 0.02 });
      k.box(0.07, 0.09, z1 - z0 - 0.3, x0 + 0.15, 0.55, (z0 + z1) / 2, wood, { r: 0.02 }); k.box(0.07, 0.09, z1 - z0 - 0.3, x1 - 0.15, 0.55, (z0 + z1) / 2, wood, { r: 0.02 });
    }
    // along the footpath (a home with a pavement out front): a picket fence on the garden's edge, a gap where the path
    // comes out for the gate (built apart, so it swings: gate())
    if (def.setting === 'sidewalk') {
      const x0 = -P.l, x1 = def.w + P.r, zf = def.d + P.b - 0.2, wood = '#ffffff';
      for (let x = x0 + 0.2; x <= x1 - 0.15; x += 0.42) { if (x > dx - 1.25 && x < dx + 1.25) continue; k.box(0.11, 1.05, 0.08, x, 0, zf, wood, { r: 0.03 }); k.cone(0.08, 0.12, x, 1.05, zf, wood, { n: 4, ry: Math.PI / 4 }); } // pickets
      for (const [a, b] of [[x0 + 0.05, dx - 1.25], [dx + 1.25, x1 - 0.05]]) for (const y of [0.3, 0.75]) k.box(b - a, 0.09, 0.06, (a + b) / 2, y, zf - 0.07, wood, { r: 0.02 }); // rails
      for (const x of [dx - 1.2, dx + 1.2]) { k.box(0.2, 1.35, 0.2, x, 0, zf, wood, { r: 0.04 }); k.box(0.28, 0.08, 0.28, x, 1.35, zf, '#e8e2d6', { r: 0.03 }); k.ball(0.1, x, 1.5, zf, '#e8e2d6', { n: 10 }); } // gate posts
    }
    return pathCells;
  }
  // the garden gate onto the footpath: two leaves of pickets, each hung on its post, swinging in to the garden
  // (home.gate.set(0..1) opens it; tick(dt) moves it there smoothly)
  function gate(def, root) {
    const P = def.plot, dx = def.door.at + 1, zf = def.d + P.b - 0.2, g = new T.Group(), w = 1.05, hinges = [];
    for (const side of [-1, 1]) {
      const k = new Kit(); // (a leaf in its own space: from its hinge at x 0 out to x w)
      for (let i = 0; i < 4; i++) k.box(0.1, 0.92 + i * 0.05, 0.07, 0.16 + i * 0.25, 0.05, 0, '#ffffff', { r: 0.03 });
      for (const y of [0.28, 0.72]) k.box(w - 0.06, 0.08, 0.06, w / 2, y, -0.06, '#ffffff', { r: 0.02 });
      k.box(0.06, 0.62, 0.05, w / 2, 0.27, -0.07, '#ffffff', { r: 0.02, rz: 0.95 }); // the brace
      if (side > 0) k.ball(0.05, w - 0.1, 0.62, 0.05, '#c9a24a', { n: 8 }); // the latch
      const leaf = k.build(); leaf.traverse(m => { if (m.isMesh) m.userData.bg = true; });
      const h = new T.Group(); h.position.set(dx + side * 1.1, 0, zf); h.add(leaf); g.add(h); hinges.push([h, side]);
    }
    { const hit = new T.Mesh(new T.BoxGeometry(2.6, 1.4, 0.9), new T.MeshBasicMaterial()); hit.visible = false; hit.position.set(dx, 0.7, zf); hit.userData.bg = true; g.add(hit); } // (an easy thing to tap: the whole gateway, not just its pickets)
  g.userData.gate = true; root.add(g);
    let a = 0, want = 0;
    const pose = () => { for (const [h, side] of hinges) h.rotation.y = side < 0 ? a * 1.6 : Math.PI - a * 1.6; }; pose();
    return { group: g, at: new T.Vector3(dx, 0, zf), set(v) { want = v; }, get open() { return want > 0.5; }, tick(dt) { if (Math.abs(want - a) < 1e-3) return; a += (want - a) * Math.min(1, dt * 4); pose(); } };
  }

  function tree(k, type, x, z, R) {
    if (type === 'pine') {
      k.cyl(0.16, 1.2, x, 0, z, '#7a4d2c', { rt: 0.12, n: 8 });
      for (let i = 0; i < 4; i++) k.cone(1.25 - i * 0.24, 1.3, x, 0.9 + i * 0.72, z, shade('#3f9a5b', i * 0.06), { n: 9 });
    } else if (type === 'palm') {
      for (let i = 0; i < 7; i++) k.cyl(0.15 - i * 0.008, 0.55, x + Math.sin(i * 0.25) * 0.3, i * 0.52, z, i % 2 ? '#a5784b' : '#8f6640', { n: 8, rz: -0.12 });
      const tx = x + 0.55, ty = 3.6;
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; k.at(tx, ty, z, a, kk => { kk.box(0.4, 0.06, 1.7, 0, 0, 0.85, '#4fb15d', { r: 0.03, rx: 0.45 }); kk.box(0.22, 0.05, 0.9, 0, -0.32, 1.65, '#45a352', { r: 0.02, rx: 0.9 }); }); }
      for (let i = 0; i < 3; i++) k.ball(0.15, tx + Math.cos(i * 2.1) * 0.16, ty - 0.12, z + Math.sin(i * 2.1) * 0.16, '#7a5a35', { n: 8 });
    } else {
      const cherry = type === 'cherry', c1 = cherry ? '#ffb7cf' : '#5fbf5a', c2 = cherry ? '#ff9cbd' : '#4fae4f', c3 = cherry ? '#ffd2e1' : '#74cd66';
      k.cyl(0.2, 1.6, x, 0, z, '#7b4f30', { rt: 0.14, n: 8 });
      k.cyl(0.08, 0.9, x - 0.3, 1.2, z, '#7b4f30', { rz: 0.7, n: 6 }); k.cyl(0.08, 0.9, x + 0.3, 1.25, z + 0.1, '#7b4f30', { rz: -0.7, n: 6 });
      k.ball(1.05, x, 2.55, z, c1, { n: 14 }); k.ball(0.78, x - 0.8, 2.15, z + 0.25, c2, { n: 12 }); k.ball(0.8, x + 0.75, 2.25, z - 0.1, c3, { n: 12 }); k.ball(0.7, x + 0.1, 3.2, z + 0.25, c3, { n: 12 });
      if (cherry) for (let i = 0; i < 9; i++) { const a = R() * 6.28; k.ball(0.06, x + Math.cos(a) * (0.6 + R() * 1.4), 0.02, z + Math.sin(a) * (0.6 + R() * 1.4), '#ffc4d8', { s: [1, 0.3, 1], n: 6 }); }
    }
  }

  function floors(def, k) {
    const R = rng(def.w * 3 + def.d * 11);
    for (const r of def.rooms) {
      if (r.floor === 'wood') {
        for (let z = r.z; z < r.z + r.d; z += 0.5) {
          let x = r.x - (R() * 1.5); const lane = Math.round((z - r.z) * 2);
          while (x < r.x + r.w) { const len = [1.5, 2, 2.5, 3][(R() * 4) | 0], a = Math.max(x, r.x), b = Math.min(x + len, r.x + r.w); if (b - a > 0.05) k.box(b - a - 0.03, 0.12, 0.47, (a + b) / 2, FY - 0.12, z + 0.25, shade(r.floorCol || def.wood, (R() - 0.5) * 0.1 + (lane % 2 ? 0.03 : 0)), { r: 0.025, pat: 1, ps: 0.6 }); x += len; }
        }
      } else if (r.floor === 'tile') {
        const [t1, t2] = r.floorCol ? ['#ffffff', r.floorCol] : r.tiles || ['#ffffff', '#cfd8e8'];
        for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) k.box(0.95, 0.12, 0.95, x + 0.5, FY - 0.12, z + 0.5, (x + z) % 2 ? t2 : t1, { r: 0.04 });
      } else if (r.floor === 'tatami') {
        k.box(r.w, 0.1, r.d, r.x + r.w / 2, FY - 0.14, r.z + r.d / 2, '#3c5a37', { r: 0.02 });
        for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z += 2) {
          const flip = (x + z / 2) % 2 === 0, len = Math.min(2, r.z + r.d - z);
          k.box(0.86, 0.12, len - 0.14, x + 0.5, FY - 0.12, z + len / 2, flip ? '#d8d996' : '#cfd28c', { r: 0.03 });
        }
      } else if (r.floor === 'stone') {
        const c = r.floorCol || '#cfc6b8';
        for (let x = r.x; x < r.x + r.w; x += 1) for (let z = r.z; z < r.z + r.d; z += 1) { const big = R() < 0.5; k.box(big ? 0.96 : 0.46, 0.12, 0.96, x + (big ? 0.5 : 0.25), FY - 0.12, z + 0.5, shade(c, (R() - 0.5) * 0.14), { r: 0.05 }); if (!big) k.box(0.46, 0.12, 0.96, x + 0.75, FY - 0.12, z + 0.5, shade(c, (R() - 0.5) * 0.14), { r: 0.05 }); }
      } else if (r.floor === 'checker') {
        const c = r.floorCol || '#2d2a3a';
        for (let x = r.x; x < r.x + r.w; x++) for (let z = r.z; z < r.z + r.d; z++) k.box(0.98, 0.12, 0.98, x + 0.5, FY - 0.12, z + 0.5, (x + z) % 2 ? c : '#f8f4ec', { r: 0.02 });
      } else if (r.floor === 'marble') {
        for (let x = r.x; x < r.x + r.w; x += 2) for (let z = r.z; z < r.z + r.d; z += 2) { const w = Math.min(2, r.x + r.w - x), d = Math.min(2, r.z + r.d - z); k.box(w - 0.03, 0.12, d - 0.03, x + w / 2, FY - 0.12, z + d / 2, r.floorCol || '#f1ede6', { r: 0.02, pat: 7, ps: 0.5 }); }
      } else {
        k.box(r.w - 0.04, 0.14, r.d - 0.04, r.x + r.w / 2, FY - 0.14, r.z + r.d / 2, r.carpet || '#c9b8e8', { r: 0.06, seg: 2, pat: r.floorPat || 2, ps: 0.35 });
      }
    }
    // the foundation the house stands on
    k.box(def.w + TE * 2 + 0.2, FY - 0.12, def.d + TE * 2 + 0.2, def.w / 2, 0, def.d / 2, '#c9c1b6', { r: 0.06 });
    if (def.deck) {
      const z0 = def.d + TE, z1 = def.d + def.deck.depth;
      for (let x = 0.25; x < def.w; x += 0.5) k.box(0.46, 0.1, z1 - z0, x, 0.2, (z0 + z1) / 2, shade('#c79a6a', (R() - 0.5) * 0.12), { r: 0.02 });
      k.box(def.w, 0.2, z1 - z0, def.w / 2, 0, (z0 + z1) / 2, '#9b734d', { r: 0.03 });
      for (const x of [0.15, def.w - 0.15]) for (const z of [z1 - 0.15]) k.box(0.18, 1.0, 0.18, x, 0.3, z, '#ffffff', { r: 0.04 });
      k.box(def.w, 0.1, 0.1, def.w / 2, 1.05, z1 - 0.15, '#ffffff', { r: 0.03 });
      for (let x = 0.65; x < def.w - 0.4; x += 0.5) if (Math.abs(x - (def.door.at + 1)) > 1) k.box(0.07, 0.75, 0.07, x, 0.3, z1 - 0.15, '#ffffff', { r: 0.02 });
    }
  }

  // An outside wall side, full height or cut down to a ledge.
  function side(def, lay, sd, full) {
    const k = new Kit(), S = SIDES[sd], ex = def.ext, len = S.axis === 'x' ? def.w : def.d, ua = S.axis === 'x' ? -TE : 0, ub = S.axis === 'x' ? len + TE : len;
    const top = full ? FY + H : FY + STUB, open = lay.open[sd];
    const pieces = solids(ua, ub, 0, top, open);
    for (const [u0, u1, y0, y1] of pieces) {
      wbox(k, def, sd, u0, u1, y0, y1, 0.02, TE, ex.col, { r: 0.02 });
      if (ex.style === 'logs') {
        for (let y = y0 + 0.22; y < y1 - 0.05; y += 0.44) { const yy = Math.min(y, y1 - 0.2); const [px, pz] = wpos(def, sd, (u0 + u1) / 2, TE - 0.05); const ll = u1 - u0 + (u0 <= ua + 0.01 || u1 >= ub - 0.01 ? 0.25 : 0); k.cyl(0.22, ll, px, yy - ll / 2, pz, shade(ex.col, ((y * 7) % 2 > 1 ? 0.06 : -0.04)), S.axis === 'x' ? { rz: Math.PI / 2, n: 10 } : { rx: Math.PI / 2, n: 10 }); }
      } else if (ex.style === 'boards') {
        for (let y = y0; y < y1 - 0.05; y += 0.42) wbox(k, def, sd, u0, u1, y, Math.min(y + 0.4, y1), TE - 0.02, TE + 0.05, shade(ex.col, ((y / 0.42) | 0) % 2 ? -0.03 : 0.02), { r: 0.015, rx: 0 });
      } else if (ex.style === 'brick') {
        let row = 0;
        for (let y = y0; y < y1 - 0.05; y += 0.32, row++) { const off = row % 2 ? 0.31 : 0; for (let u = u0 - off; u < u1; u += 0.62) { const a = Math.max(u, u0), b = Math.min(u + 0.6, u1); if (b - a > 0.05) wbox(k, def, sd, a, b, y + 0.02, Math.min(y + 0.3, y1), TE - 0.02, TE + 0.05, shade(ex.col, ((row * 13 + Math.round(u * 3)) % 5) * 0.025 - 0.05), { r: 0.012 }); } }
      } else if (ex.style === 'timber') {
        for (let u = Math.ceil(u0 / 2.5) * 2.5; u < u1; u += 2.5) wbox(k, def, sd, Math.max(u0, u - 0.12), Math.min(u1, u + 0.12), y0, y1, TE - 0.02, TE + 0.06, ex.trim, { r: 0.02 });
        for (const yy of [FY + 1.2, FY + 4.0]) if (yy > y0 && yy < y1) wbox(k, def, sd, u0, u1, yy, Math.min(yy + 0.22, y1), TE - 0.02, TE + 0.07, ex.trim, { r: 0.02 });
      } else if (y0 < 0.6) wbox(k, def, sd, u0, u1, y0, Math.min(y1, FY + 0.6), TE - 0.02, TE + 0.04, ex.base || shade(ex.col, -0.12), { r: 0.02 });
    }
    // the cut top of the wall
    for (const [u0, u1, , y1] of solids(ua, ub, top - 0.12, top, open)) wbox(k, def, sd, u0, u1, y1 - 0.12, y1 + 0.02, -0.04, TE + 0.08, ex.cap, { r: 0.03 });
    // inside: each room's wall colour, a skirting board, window frames and curtains
    for (const r of def.rooms) {
      const a = S.axis === 'x' ? r.x : r.z, b = a + (S.axis === 'x' ? r.w : r.d), touches = sd === 'n' ? r.z === 0 : sd === 's' ? r.z + r.d === def.d : sd === 'w' ? r.x === 0 : r.x + r.w === def.w;
      if (!touches) continue;
      for (const [u0, u1, y0, y1] of solids(a, b, FY, top - 0.12, open)) wbox(k, def, sd, u0, u1, y0, y1, -0.05, 0.03, r.wall, { r: 0.01, pat: r.wallPat || 0, ps: r.wallPs || 1 });
      for (const [u0, u1] of solids(a, b, FY, FY + 0.3, open)) wbox(k, def, sd, u0, u1, FY, FY + 0.3, -0.1, 0, '#ffffff', { r: 0.02 });
      if (full) for (const [u0, u1] of solids(a, b, FY + 1.05, FY + 1.13, open)) wbox(k, def, sd, u0, u1, FY + 1.05, FY + 1.13, -0.08, 0, shade(r.wall, -0.08), { r: 0.01 }); // the rail stops at the door
    }
    for (const o of open) {
      if (o.kind === 'window' && o.y0 < top && !o.item) {
        const t = ex.trim;
        wbox(k, def, sd, o.u0 - 0.12, o.u1 + 0.12, o.y0 - 0.14, o.y0, -0.22, TE + 0.14, '#ffffff', { r: 0.03 });
        if (full) {
          wbox(k, def, sd, o.u0 - 0.1, o.u1 + 0.1, o.y1, o.y1 + 0.12, -0.08, TE + 0.1, t, { r: 0.03 });
          wbox(k, def, sd, o.u0 - 0.1, o.u0, o.y0, o.y1, -0.08, TE + 0.1, t, { r: 0.02 }); wbox(k, def, sd, o.u1, o.u1 + 0.1, o.y0, o.y1, -0.08, TE + 0.1, t, { r: 0.02 });
          const um = (o.u0 + o.u1) / 2; wbox(k, def, sd, um - 0.04, um + 0.04, o.y0, o.y1, TE * 0.45, TE * 0.55 + 0.04, '#ffffff', { r: 0.01 }); wbox(k, def, sd, o.u0, o.u1, (o.y0 + o.y1) / 2 - 0.04, (o.y0 + o.y1) / 2 + 0.04, TE * 0.45, TE * 0.55 + 0.04, '#ffffff', { r: 0.01 });
          const [gx, gz] = wpos(def, sd, um, TE * 0.5), gw = o.u1 - o.u0, gh = o.y1 - o.y0;
          if (S.axis === 'x') k.glassBox(gw, gh, 0.03, gx, o.y0, gz, { a: 0.55, tint: '#cfeaff' }); else k.glassBox(0.03, gh, gw, gx, o.y0, gz, { a: 0.55, tint: '#cfeaff' });
          // curtains, gathered at the sides, and a rail
          const cc = def.curtain;
          wbox(k, def, sd, o.u0 - 0.35, o.u1 + 0.35, o.y1 + 0.2, o.y1 + 0.28, -0.22, -0.14, '#ffffff', { r: 0.03 });
          for (const [u0, u1] of [[o.u0 - 0.38, o.u0 + 0.12], [o.u1 - 0.12, o.u1 + 0.38]]) {
            for (let i = 0; i < 3; i++) { const uu = u0 + (i + 0.5) * (u1 - u0) / 3, [cx, cz] = wpos(def, sd, uu, -0.2); k.pill(0.085, o.y1 - o.y0 + 0.05, cx, o.y0 - 0.2, cz, shade(cc, i === 1 ? -0.08 : 0.02), { n: 8 }); }
            wbox(k, def, sd, u0 - 0.02, u1 + 0.02, o.y0 + 0.62, o.y0 + 0.74, -0.33, -0.08, shade(cc, -0.25), { r: 0.04 });
          }
        }
      }
      if (o.kind === 'door') {
        const um = (o.u0 + o.u1) / 2;
        if (full) {
          wbox(k, def, sd, o.u0 - 0.14, o.u0, o.y0, o.y1 + 0.14, -0.08, TE + 0.08, ex.trim, { r: 0.02 }); wbox(k, def, sd, o.u1, o.u1 + 0.14, o.y0, o.y1 + 0.14, -0.08, TE + 0.08, ex.trim, { r: 0.02 });
          wbox(k, def, sd, o.u0, o.u1, o.y1, o.y1 + 0.14, -0.08, TE + 0.08, ex.trim, { r: 0.02 });
          // (the door itself is its own hinged panel: door() below)
        }
        const [mx, mz] = wpos(def, sd, um, TE + 0.5); k.box(S.axis === 'x' ? 1.4 : 0.7, 0.05, S.axis === 'x' ? 0.7 : 1.4, mx, def.deck && sd === 's' ? 0.3 : 0.02, mz, '#a77b52', { r: 0.03 });
      }
    }
    // corner posts in the trim colour
    if (S.axis === 'x') for (const u of [-TE / 2, len + TE / 2]) { const [px, pz] = wpos(def, sd, u, TE / 2); k.box(TE + 0.1, top - 0.02, TE + 0.1, px, 0, pz, ex.style === 'logs' ? shade(ex.col, -0.15) : ex.trim, { r: 0.04 }); }
    const g = k.build(); g.userData.side = sd; g.userData.full = full; return g;
  }

  // Inside walls, built standing (HI) and cut down to the same ledge as the outside walls nearest the camera; the
  // cut ones always show (home.setYaw), so from any side the rooms are open to look into.
  function innerWalls(def, lay) {
    const out = [];
    for (const s of lay.inner) {
      const pair = [HI, STUB].map(h => {
        const k = new Kit(), parts = s.door ? [[s.a, s.door[0]], [s.door[1], s.b]] : [[s.a, s.b]];
        for (const [ra, rb] of parts) {
          if (rb - ra < 0.01) continue;
          // each face in the covering of the room it faces
          const fa = def.rooms[s.j], fb = def.rooms[s.i];
          for (const [f, R0] of [[1, fa], [-1, fb]]) { const o = f * (TI / 2 + 0.005), opt = { r: 0.01, pat: R0.wallPat || 0, ps: R0.wallPs || 1 }; if (s.axis === 'z') k.box(0.02, h - 0.02, rb - ra - 0.02, s.at + o, FY, (ra + rb) / 2, R0.wall, opt); else k.box(rb - ra - 0.02, h - 0.02, 0.02, (ra + rb) / 2, FY, s.at + o, R0.wall, opt); }
          if (s.axis === 'z') { k.box(TI, h, rb - ra, s.at, FY, (ra + rb) / 2, '#f4efe7', { r: 0.03 }); k.box(TI + 0.06, 0.1, rb - ra, s.at, FY + h, (ra + rb) / 2, '#a98b76', { r: 0.03 }); for (const o of [-1, 1]) k.box(0.05, 0.26, rb - ra, s.at + o * (TI / 2 + 0.02), FY, (ra + rb) / 2, '#ffffff', { r: 0.015 }); }
          else { k.box(rb - ra, h, TI, (ra + rb) / 2, FY, s.at, '#f4efe7', { r: 0.03 }); k.box(rb - ra, 0.1, TI + 0.06, (ra + rb) / 2, FY + h, s.at, '#a98b76', { r: 0.03 }); for (const o of [-1, 1]) k.box(rb - ra, 0.26, 0.05, (ra + rb) / 2, FY, s.at + o * (TI / 2 + 0.02), '#ffffff', { r: 0.015 }); }
        }
        if (s.door && h === HI) for (const u of s.door) { if (s.axis === 'z') k.box(TI + 0.08, HI + 0.02, 0.1, s.at, FY, u, '#d8c2a8', { r: 0.02 }); else k.box(0.1, HI + 0.02, TI + 0.08, u, FY, s.at, '#d8c2a8', { r: 0.02 }); } // a frame round the doorway
        return k.build();
      });
      // the outside walls this one meets (or, inside the house, the ones it runs alongside)
      const ends = s.axis === 'z' ? [s.a === 0 && 'n', s.b === def.d && 's'] : [s.a === 0 && 'w', s.b === def.w && 'e'];
      out.push({ tall: pair[0], low: pair[1], meets: ends.filter(Boolean).length ? ends.filter(Boolean) : s.axis === 'z' ? ['n', 's'] : ['w', 'e'] });
    }
    return out;
  }

  // Sunbeams slanting in through the windows on the far walls, shaped by what hangs on each window (o.cover):
  // curtains narrow the beam to the gap between them, cafe curtains block its lower half, a roller or Roman blind lets
  // light in only below it (and a faint glow through its fabric), and a venetian blind breaks it into stripes, a thin
  // ribbon of light through every gap between the slats.
  // sunV: the way the sunlight travels (world), when the sun is fixed over the island; without it the light just
  // slants down into the room from each window.
  function beams(def, lay, sd, sunV) {
    const S = SIDES[sd], grp = new T.Group(), v = sunV || [S.inn[0] * 2.8, -2.9, S.inn[1] * 2.8], shift = sunV ? [0, 0, 0] : S.axis === 'x' ? [0.6, 0, 0] : [0, 0, 0.6];
    const corner = (u, y) => { const [x, z] = wpos(def, sd, u, 0.1); return [x, y, z]; };
    // light sheets from lines across the window (u0..u1 at each height ys), all with one brightness
    const sheets = (u0, u1, ys, a) => {
      const pos = [], uv = [], idx = [];
      for (const y of ys) {
        const p0 = corner(u0, y), p1 = corner(u1, y), b = pos.length / 3;
        pos.push(...p0, ...p1); uv.push(0, 0, 1, 0);
        for (const p of [p0, p1]) pos.push(p[0] + v[0] + shift[0], p[1] + v[1], p[2] + v[2] + shift[2]); uv.push(0, 1, 1, 1);
        idx.push(b, b + 1, b + 3, b, b + 3, b + 2);
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      const m = new T.Mesh(g, IH.look.beamMat(undefined, 0.13 * a)); m.layers.set(1); m.renderOrder = 3; grp.add(m);
    };
    for (const o of lay.open[sd]) {
      if (o.kind !== 'window') continue;
      const c = o.cover || '', y0 = o.y0 + 0.05, y1 = o.y1 - 0.05, H = y1 - y0, a = o.u0 + 0.05, b = o.u1 - 0.05;
      if (c === 'curtains' || c === 'drapes') sheets(a + 0.12, b - 0.12, [y1, y0], 1);
      else if (c === 'cafe') sheets(a, b, [y1, y0 + H * 0.5], 1);
      else if (c === 'roller') { sheets(a, b, [y0 + H * 0.56, y0], 1); sheets(a, b, [y1, y0 + H * 0.56], 0.18); }
      else if (c === 'roman') { sheets(a, b, [y0 + H * 0.6, y0], 1); sheets(a, b, [y1, y0 + H * 0.6], 0.15); }
      else if (c === 'venetian') { sheets(a, b, [y0 + H * 0.4, y0], 0.9); const n = 7, ys = []; for (let i = 0; i < n; i++) ys.push(y0 + H * (0.43 + (i + 0.5) / n * 0.55)); sheets(a, b, ys, 0.45); }
      else sheets(a, b, [y1, y0], 1);
    }
    return grp;
  }

  // Door leaves, drawn hinge at x 0, w wide, h high and t thick. Styles: panel (two raised panels), glass (a window in
  // the top half), cottage (planks with a little round window), barn (planks with a Z brace), arch (rounded top).
  function doorLeaf(k, w, h, t, st) {
    const c = st.c || '#e86f5a', l = shade(c, 0.12), d = shade(c, -0.15), br = '#f7c843', pat = st.pat || 0;
    const faces = [t / 2 + 0.015, -t / 2 - 0.015];
    if (st.t === 'arch') { k.box(w, h - w / 2, t, w / 2, 0, 0, c, { r: 0.03, pat }); k.cyl(w / 2, t, w / 2, h - w / 2, -t / 2, c, { rx: Math.PI / 2, n: 20, pat }); for (const z of faces) { k.box(0.06, h - 0.3, 0.03, w / 2, 0.15, z, d, { r: 0.01 }); k.ball(0.07, w - 0.25, 1.6, z * 1.6, br, { n: 10 }); } return; }
    k.box(w, h, t, w / 2, 0, 0, c, { r: 0.03, pat: st.t === 'barn' || st.t === 'cottage' ? 1 : pat, ps: 0.8 });
    for (const z of faces) {
      if (st.t === 'glass') { k.box(w - 0.44, 1.3, 0.05, w / 2, 0.4, z, l, { r: 0.02 }); k.special(new T.BoxGeometry(w - 0.5, 1.2, 0.02), { glass: '#cfeaff' }, new T.Matrix4().makeTranslation(w / 2, 2.6, z), { a: 0.6 }); k.box(w - 0.4, 0.06, 0.05, w / 2, 1.95, z, d, { r: 0.02 }); k.box(0.05, 1.3, 0.05, w / 2, 1.95, z, d, { r: 0.02 }); }
      else if (st.t === 'cottage') { for (let i = 1; i < 4; i++) k.box(0.02, h - 0.1, 0.03, i * w / 4, 0.05, z, d, { r: 0.005 }); k.cyl(0.28, 0.04, w / 2, 2.6, z - 0.02 * Math.sign(z), '#cfeaff', { rx: Math.PI / 2, n: 18 }); k.torus(0.28, 0.04, w / 2, 2.6, z, d, {}); }
      else if (st.t === 'barn') { for (let i = 1; i < 4; i++) k.box(0.02, h - 0.1, 0.03, i * w / 4, 0.05, z, d, { r: 0.005 }); for (const y of [0.35, h - 0.5]) k.box(w - 0.1, 0.16, 0.05, w / 2, y, z, l, { r: 0.02 }); k.box(0.16, Math.hypot(w - 0.3, h - 1.2), 0.05, w / 2, (h - Math.hypot(w - 0.3, h - 1.2)) / 2, z, l, { r: 0.02, rz: Math.atan2(w - 0.3, h - 1.2) }); }
      else for (const y of [0.4, 2.1]) k.box(w - 0.44, 1.3, 0.05, w / 2, y, z, l, { r: 0.02 });
      k.box(0.08, 0.24, 0.02, w - 0.3, 1.62, z + Math.sign(z) * 0.005, br, { r: 0.01 }); k.ball(0.07, w - 0.3, 1.75, z * 1.6, br, { n: 10 }); // a plate and a round knob
    }
  }

  // The front door: its own panel on a hinge at one side of the frame, so it can swing (app.js pushes it open as
  // someone comes through and lets it swing shut). a: how far open (radians), v: how fast it's swinging.
  function door(def, lay) {
    const sd = def.door.side, S = SIDES[sd], o = (lay.open[sd] || []).find(x => x.kind === 'door'); if (!o) return null;
    const w = o.u1 - o.u0, h = o.y1 - o.y0, t = TE * 0.3, k = new Kit();
    doorLeaf(k, w, h, t, def.doorStyle || { t: 'panel', c: '#e86f5a' });
    const pivot = new T.Group(); pivot.add(k.build());
    const [hx, hz] = wpos(def, sd, o.u0, TE * 0.5), [cx, cz] = wpos(def, sd, (o.u0 + o.u1) / 2, TE * 0.5), base = S.axis === 'x' ? 0 : -Math.PI / 2;
    pivot.position.set(hx, o.y0, hz); pivot.rotation.y = base;
    return { group: pivot, side: sd, base, sign: S.axis === 'x' ? -S.inn[1] : S.inn[0], center: [cx, cz], hinge: [hx, hz], w, t: t / 2 + 0.03, a: 0, v: 0 };
  }

  // Builds a whole home. view(k) shows it from one of four sides (0 to 3).
  function build(def) {
    const lay = layout(def), root = new T.Group(), k = new Kit();
    const bounds = plot(def, k);
    lay.grass = []; const soft = new Kit(), path = groundDecor(def, k, lay, soft);
    floors(def, k);
    const inner = innerWalls(def, lay);
    const R = rng(def.w * 101 + def.d);
    const fixed = new Set();
    for (const [type, x, z] of def.trees || []) { tree(k, type, x, z, R); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) fixed.add(key(Math.floor(x) + i, Math.floor(z) + j)); }
    const base = k.build(); base.userData.home = true; root.add(base);
    const sg = soft.build({ shadow: false }); sg.traverse(m => m.layers.set(1)); root.add(sg);
    // path and trees can't have things put on them
    for (const c of lay.cells.values()) if (path.has(key(c.x, c.z)) || fixed.has(key(c.x, c.z))) c.fixed = true;
    const sides = {};
    for (const sd of ['n', 's', 'e', 'w']) {
      const full = side(def, lay, sd, true), stub = side(def, lay, sd, false), bm = beams(def, lay, sd);
      const S = SIDES[sd], L = S.line(def);
      root.add(full, stub, bm); sides[sd] = { full, stub, beams: bm, len: S.axis === 'x' ? def.w : def.d, open: lay.open[sd], junc: lay.junc[sd], outer: true,
        // where the inside face is: u runs along ax from org, n points into the house, things hang up to top
        geo: { org: S.axis === 'x' ? [0, L] : [L, 0], ax: S.axis === 'x' ? [1, 0] : [0, 1], n: [S.inn[0], S.inn[1]], u0: 0, top: FY + H } };
    }
    // both faces of every inside wall are walls too (for pictures, shelves and clocks), up to the standing height
    inner.forEach((w, i) => {
      const s = lay.inner[i]; w.faces = [];
      for (const f of [1, -1]) {
        const key2 = 'i' + i + (f > 0 ? '+' : '-'), n = s.axis === 'z' ? [f, 0] : [0, f], off = TI / 2;
        sides[key2] = { inner: i, len: s.b - s.a, open: s.door ? [{ u0: s.door[0] - s.a, u1: s.door[1] - s.a, y0: FY - 0.01, y1: FY + HI + 0.1, kind: 'door' }] : [], junc: [],
          geo: { org: s.axis === 'z' ? [s.at + f * off, s.a] : [s.a, s.at + f * off], ax: s.axis === 'z' ? [0, 1] : [1, 0], n, u0: 0, top: FY + HI } };
        w.faces.push(key2);
      }
    });
    const dr = door(def, lay); if (dr) root.add(dr.group);
    for (const w of inner) root.add(w.tall, w.low);
    const view = bounds.view; delete bounds.view;
    const home = { def, root, cells: lay.cells, edges: lay.edges, walls: lay.walls, sides, bounds, viewBounds: view, FY, H, door: dr, inner, lay, grass: lay.grass, path };
    // The sides facing the camera drop to a ledge; the far ones stand full height.
    // The sun fixed over the island: rebuild the sunbeams along the real sunlight (toSun: direction to the sun, world),
    // only through windows on the sunny side. null: back to light slanting in through every far window.
    home.setSun = toSun => {
      const key = toSun ? toSun.map(v => v.toFixed(2)).join(',') : 'view'; if (home.sunKey === key) return; home.sunKey = key;
      for (const sd of ['n', 's', 'e', 'w']) {
        const S = SIDES[sd], side = sides[sd]; root.remove(side.beams); side.beams.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
        let v = null; side.sunny = true;
        if (toSun) { const k = 2.9 / Math.max(0.25, toSun[1]), hx = -toSun[0] * k, hz = -toSun[2] * k, hl = Math.hypot(hx, hz), c = hl > 4 ? 4 / hl : 1; v = [hx * c, -2.9, hz * c]; side.sunny = S.out[0] * toSun[0] + S.out[1] * toSun[2] > 0.12; }
        side.beams = beams(def, lay, sd, v); root.add(side.beams);
      }
      home.setYaw(home.yaw != null ? home.yaw : Math.PI / 4);
    };
    home.setYaw = yaw => {
      home.yaw = yaw;
      const cx = Math.sin(yaw), cz = Math.cos(yaw);
      for (const sd of Object.keys(sides)) {
        const g = sides[sd].geo, front = -(g.n[0] * cx + g.n[1] * cz) > 0.1; sides[sd].front = front; // its face turned away from the camera
        if (sides[sd].outer) { sides[sd].full.visible = !front; sides[sd].stub.visible = front; sides[sd].beams.visible = !front && sides[sd].sunny !== false; }
      }
      // inside walls sit at the height of the outside walls nearest the viewer, from every side; one that has
      // pictures or shelves on its face turned to the camera stands up (home.innerUp, set by app.js) so they show
      for (const w of inner) { const up = !!(home.innerUp && w.faces.some(f => !sides[f].front && home.innerUp.has(f))); w.tall.visible = up; w.low.visible = !up; }
    };
    root.traverse(m => { if (m.isMesh) m.userData.bg = true; }); // the house and its island are scenery: painted, no ink (look.js)
    if (def.setting && def.setting !== 'none' && IH.settings) { const S = IH.settings.build(def, def.setting, bounds); root.add(S.group); home.setting = S; }
    if (def.setting === 'sidewalk') home.gate = gate(def, root); // (the garden gate onto the footpath: the way to the village)
    // cut away on every side (a neighbour's flat seen beside this home: open to look into from anywhere, never in the way)
    home.cutAll = () => { home.setYaw = () => {}; for (const sd of Object.keys(sides)) { if (!sides[sd].outer) continue; sides[sd].full.visible = false; sides[sd].stub.visible = true; sides[sd].front = true; if (sides[sd].beams) sides[sd].beams.visible = false; } for (const w of inner) { w.tall.visible = false; w.low.visible = true; } };
    home.setYaw(Math.PI / 4);
    return home;
  }

  // Where a point on a wall face is, in world space: u along it, a few cm into the room. side is a face from
  // home.sides (outside walls n s e w, inside walls i3+ and i3-).
  const wallPoint = (home, sd, u, off = 0.06) => { const g = home.sides[sd].geo; return [g.org[0] + g.ax[0] * u + g.n[0] * off, g.org[1] + g.ax[1] * u + g.n[1] * off]; };
  const wallYaw = (home, sd) => { const n = home.sides[sd].geo.n; return Math.atan2(n[0], n[1]); };
  // The windows the house is built with when nobody has changed them (app.js turns these into window items).
  const autoWindows = def => { const lay = layout(def), out = []; for (const sd of ['n', 's', 'e', 'w']) for (const o of lay.open[sd]) if (o.kind === 'window') out.push({ side: sd, u: o.u0 - 0.05, w: Math.round(o.u1 - o.u0 + 0.1) }); return out; };

  IH.homes = { HOMES, build, SIDES, FY, H, HI, TE, wallPoint, wallYaw, autoWindows, doorLeaf, key };
})();
