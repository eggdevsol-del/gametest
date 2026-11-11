/* Chorecast homes: land blocks for the farm (economy plan, phase 3). The farm grows by buying blocks of land that
   join onto its sides, each as big as the paddock itself (52 m by 60 m), so it stays one place to walk and drive
   across. Eight places in the first ring: the four sides, and the four corners once a side next to them is owned.
   Each block is one of five kinds (a field of raised beds, an orchard, a fenced pasture, a hay meadow, a bee
   garden), has a low hedge, a post-and-rail fence or a low stone wall along the land it joins, with a wide gate
   the tractor drives through, and pays council rates every Monday (economy.js). The Veggie plot and the Orchard
   terrace were islands; they're blocks here now, with what was growing on them (app.js moves them over).
   Saved on the farm as f.land: [{ id, slot, type, edge, base, from?, free?, cut? }] */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit || !IH.islandsBuild) return;
  const { Kit } = IH.kit, IB = IH.islandsBuild, K = IB.kit, { rng, bx, sides } = K;
  const W = 52, D = 60, DAY = 864e5;
  const SLOTS = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0], ne: [1, -1], se: [1, 1], sw: [-1, 1], nw: [-1, -1] };
  const SLOT_NAME = { n: 'North', e: 'East', s: 'South', w: 'West', ne: 'North-east', se: 'South-east', sw: 'South-west', nw: 'North-west' };
  const rectOf = slot => { const [i, j] = SLOTS[slot]; return [i * W, j * D, i * W + W, j * D + D]; };
  const PADDOCK = [0, 0, W, D];
  const TYPES = {
    field: { e: '🥕', name: 'Field', about: 'Eight raised beds for vegetables, a water tank and a seed shed.', earns: 'About ✨ 150 a week in vegetables, when planted and watered.' },
    orchard: { e: '🍎', name: 'Orchard', about: 'Twelve fruit trees (apples, lemons, feijoas), a packing shed for jam, and two beehives.', earns: 'About ✨ 120 a week in fruit, more as jam.' },
    pasture: { e: '🐑', name: 'Pasture', about: 'A big fenced paddock with a gate: room for more animals.', earns: 'What its animals make, less their feed.' },
    meadow: { e: '🌾', name: 'Hay meadow', about: 'Long grass to bale. Feed your own animals or sell the bales.', earns: 'About ✨ 200 a week in hay, cut and baled.' },
    bees: { e: '🐝', name: 'Bee garden', about: 'Wildflowers and four beehives.', earns: 'About ✨ 90 a week in honey.' }
  };
  const EDGES = { hedge: 'Low hedge', fence: 'Post-and-rail fence', stone: 'Low stone wall' };
  const EDGE_XP = 300;
  const price = n => Math.round(5000 * Math.pow(1.25, n) / 10) * 10; // (the first bought block 5,000, then 25% more each)
  const owned = f => (f && f.land) || [];
  // where a block can go: a side, or a corner once a side next to it is owned
  function canHave(f, slot) {
    const have = new Set(owned(f).map(b => b.slot)); if (have.has(slot)) return false;
    if (slot.length === 1) return true;
    return have.has(slot[0]) || have.has(slot[1]);
  }
  // every piece of ground: the paddock, then the blocks
  const rects = f => [PADDOCK, ...owned(f).map(b => rectOf(b.slot))];
  function bounds(f) { const R = rects(f); return { x0: Math.min(...R.map(r => r[0])), z0: Math.min(...R.map(r => r[1])), x1: Math.max(...R.map(r => r[2])), z1: Math.max(...R.map(r => r[3])) }; }
  // on the land, at least m in from its outside edge (the ground between two pieces is all one)
  function onLand(f) {
    const R = rects(f), inAny = (x, z) => R.some(r => x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]);
    return (x, z, m = 0) => inAny(x, z) && (!m || (inAny(x - m, z) && inAny(x + m, z) && inAny(x, z - m) && inAny(x, z + m) && inAny(x - m, z - m) && inAny(x + m, z + m) && inAny(x - m, z + m) && inAny(x + m, z - m)));
  }
  // where a gate goes on the paddock's own edges: where its tracks and open ground meet them
  const PAD_GATE = { n: 26, s: 26, e: 30, w: 9 };

  // ---------- building it, into the farm's kit (k), its root, its solids and spots
  function build(f, k, root, solid, spots) {
    const out = { lawns: [], paths: [], meadows: [], beds: [], trees: [], drawBed: null, rects: rects(f), walkins: [] }, list = owned(f), RR = rng(9090);
    // a walk-in building (farm-buildings.js): its model, its walls and what's inside as solids, its places to tap
    const FB = IH.farmBuildings, walkIn = Bw => { root.add(Bw.group); for (const r of Bw.solids) solid(...r); for (const sp of Bw.spots) spots.push(sp); out.walkins.push(Bw); return Bw; };
    const wall = (type, x0, z0, x1, z1, gate) => {
      // an axis-aligned run from (x0, z0) to (x1, z1), an 8 m opening at `gate` along it
      const alongX = z0 === z1, a = alongX ? x0 : z0, b = alongX ? x1 : z1, runs = gate == null ? [[a, b]] : [[a, gate - 4], [gate + 4, b]];
      const piece = (p, q) => {
        const L = q - p; if (L < 0.5) return; const mid = (p + q) / 2, at = (u, y) => (alongX ? [u, y, z0] : [x0, y, u]);
        const box = (w, h, d, u, y, col, o) => { const [x, yy, z] = at(u, y); if (alongX) k.box(w, h, d, x, yy, z, col, o); else k.box(d, h, w, x, yy, z, col, o); };
        if (type === 'hedge') { box(L, 0.95, 0.9, mid, 0, '#4f8f3a', { r: 0.3 }); box(L - 0.3, 0.3, 0.7, mid, 0.85, '#5fa448', { r: 0.15 }); }
        else if (type === 'stone') { box(L, 0.7, 0.6, mid, 0, '#a9a297', { r: 0.08 }); for (let u = p + 0.45; u < q - 0.3; u += 0.9) box(0.8, 0.14, 0.66, u, 0.7, RR() < 0.5 ? '#b9b2a5' : '#99938a', { r: 0.05 }); }
        else { const n = Math.max(1, Math.round(L / 2.2)); for (let i = 0; i <= n; i++) box(0.2, 1.4, 0.2, p + (q - p) * i / n, 0, '#e9e2d4', { r: 0.03 }); for (const y of [0.5, 1.1]) box(L, 0.13, 0.08, mid, y, '#e9e2d4', { r: 0.02 }); }
        if (alongX) solid(p, z0 - 0.45, q, z0 + 0.45); else solid(x0 - 0.45, p, x0 + 0.45, q);
      };
      for (const [p, q] of runs) piece(Math.min(p, q), Math.max(p, q));
      if (gate != null) for (const u of [gate - 4.2, gate + 4.2]) { if (alongX) bx(k, 0.5, 1.7, 0.5, u, 0, z0, type === 'stone' ? '#8f897f' : '#7a5a3a'); else bx(k, 0.5, 1.7, 0.5, x0, 0, u, type === 'stone' ? '#8f897f' : '#7a5a3a'); }
    };
    list.forEach((blk, n) => {
      const r = rectOf(blk.slot), [x0, z0, x1, z1] = r, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = rng(4100 + n * 37);
      // the ground: soil, the island's sides, grass
      bx(k, W, 0.42, D, cx, -0.42, cz, '#9a7a52', { r: 0.18, seg: 2 }); k.at(x0, 0, z0, 0, kk => sides(kk, W, D, R, '#8a7452')); bx(k, W, 0.04, D, cx, 0, cz, '#7fbf5c', { r: 0.02 });
      out.lawns.push(r.slice());
      // its boundary with each piece of land it joins (drawn once: against the paddock, or an earlier block), a gate in it, and a track in from the gate
      const others = [{ r: PADDOCK, pad: true }, ...list.slice(0, n).map(b => ({ r: rectOf(b.slot) }))];
      for (const o of others) {
        const q = o.r; let seg = null;
        if (q[2] === x0 || q[0] === x1) { const x = q[2] === x0 ? x0 : x1, a = Math.max(z0, q[1]), b = Math.min(z1, q[3]); if (b - a > 1) seg = { x0: x, z0: a, x1: x, z1: b, side: q[2] === x0 ? 'w' : 'e' }; }
        else if (q[3] === z0 || q[1] === z1) { const z = q[3] === z0 ? z0 : z1, a = Math.max(x0, q[0]), b = Math.min(x1, q[2]); if (b - a > 1) seg = { x0: a, z0: z, x1: b, z1: z, side: q[3] === z0 ? 'n' : 's' }; }
        if (!seg) continue;
        const along = seg.z0 === seg.z1, padSide = o.pad ? { n: 's', s: 'n', w: 'e', e: 'w' }[seg.side] : null; // (which edge of the paddock this is)
        const gate = o.pad ? PAD_GATE[padSide] : along ? (seg.x0 + seg.x1) / 2 : (seg.z0 + seg.z1) / 2;
        wall(blk.edge || 'hedge', seg.x0, seg.z0, seg.x1, seg.z1, gate);
        // gravel in through the gate, a little way into the block
        const dd = blk.type === 'meadow' ? 3.5 : 10; // (in a hay meadow, just to the long grass)
        const t = along ? (seg.side === 'n' ? [gate - 2, z0, gate + 2, z0 + dd] : [gate - 2, z1 - dd, gate + 2, z1]) : (seg.side === 'w' ? [x0, gate - 2, x0 + dd, gate + 2] : [x1 - dd, gate - 2, x1, gate + 2]);
        bx(k, t[2] - t[0], 0.06, t[3] - t[1], (t[0] + t[2]) / 2, 0.02, (t[1] + t[3]) / 2, '#b89668', { r: 0.03 }); out.paths.push(t);
      }
      const L = (lx, lz) => [x0 + lx, z0 + lz], id = s0 => `lb${blk.id}${s0}`;
      if (blk.type === 'field') {
        // eight raised beds in two rows (lanes left clear through the middle), a water tank, a seed shed
        let i = blk.base || 0;
        for (const lz of [24, 36]) for (const lx of [9, 16.5, 35.5, 43]) {
          const [x, z] = L(lx, lz); bx(k, 4.8, 0.7, 3.4, x, 0, z, '#9c6b45', { r: 0.05 }); bx(k, 4.4, 0.06, 3.0, x, 0.68, z, '#5a3f2c'); solid(x - 2.4, z - 1.7, x + 2.4, z + 1.7);
          const g = new T.Group(); g.position.set(x, 0.72, z); root.add(g); out.beds[i] = { g };
          spots.push({ kind: 'bed', id: id('b' + i), i, name: 'the raised bed', at: [x, z + 2.6], yaw: Math.PI, hit: [x, z, 0, 4.4] }); i++;
        }
        { const [x, z] = L(9, 49); k.cyl(1.1, 2.2, x, 0, z, '#8f9aa8', { n: 14 }); k.cyl(1.15, 0.2, x, 2.2, z, '#7a8592', { n: 14 }); solid(x - 1.2, z - 1.2, x + 1.2, z + 1.2); spots.push({ kind: 'tank', id: id('tank'), name: 'the water tank', at: [x, z + 2], yaw: Math.PI, hit: [x, z, 0, 2.6] }); }
        { const [x, z] = L(43, 49); if (FB) { const hut = walkIn(FB.seedShed({ x, z, id: id('seeds') })); for (const sp of spots) if (sp.kind === 'bed' && !sp.hut && sp.i >= (blk.base || 0) && sp.i < i) sp.hut = hut; } else { IB.more.shed(k, x, z, 0, '#7a9a6a', '#a5523f'); solid(x - 2, z - 1.5, x + 2, z + 1.5); spots.push({ kind: 'seedshed', id: id('seeds'), name: 'the seed shed', at: [x, z + 3], yaw: Math.PI, hit: [x, z, 0, 4] }); } }
        out.drawBed = (bi, crop, stage, soil) => { const b = out.beds[bi]; if (!b) return; while (b.g.children.length) b.g.remove(b.g.children[0]); const kk = new Kit(); if (IB.more.soilBed) IB.more.soilBed(kk, soil); if (crop) IB.more.cropBed(kk, crop, stage); if (kk.parts.length) b.g.add(kk.build()); };
      } else if (blk.type === 'orchard') {
        // twelve trees in three rows (apples, lemons, feijoas), each with its fruit (shown when it's ripe); a packing shed; two beehives
        const sp = f.specials || {}, KINDS = [['apple', '#e8463e', 12], sp.orange ? ['orange', '#ff9a2e', 21] : ['lemon', '#ffd84a', 21], sp.olive ? ['olive', '#6b7a3a', 41] : ['feijoa', '#7aa04a', 41]]; let i = blk.base || 0; // (oranges and olives from the Spanish town's nursery)
        for (const [kind, fc, lz] of KINDS) for (const lx of [8, 15.5, 36.5, 44]) {
          const [x, z] = (f.treeAt || {})[i] || L(lx, lz); IB.more.tree(k, x, z, R, 0.85, 0, kind === 'lemon' || kind === 'orange' ? ['#3f8a3c', '#4e9e48'] : kind === 'feijoa' ? ['#5a8a5a', '#6a9a6a'] : kind === 'olive' ? ['#8a9a7a', '#9aaa88'] : ['#4f9a3c', '#5fae4a']); solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6);
          const fk = new Kit(); for (let q = 0; q < 10; q++) { const a = q / 10 * Math.PI * 2 + R(), rr = 1.1 + R() * 0.8; fk.ball(0.18, Math.cos(a) * rr, 2.4 + R() * 1.3, Math.sin(a) * rr * 0.85, fc, { n: 7, s: kind === 'feijoa' ? [0.8, 1.1, 0.8] : [1, 1, 1] }); }
          const fruit = fk.build(); fruit.position.set(x, 0, z); root.add(fruit); out.trees.push({ kind, x, z, fruit, i });
          spots.push({ kind: 'fruittree', id: id('t' + i), i, fruit: kind, name: `the ${kind} tree`, at: [x, z + 1.9], yaw: Math.PI, hit: [x, z, 0, 3] }); i++;
        }
        let hut = null; { const [x, z] = L(44, 52); if (FB) { hut = walkIn(FB.packShed({ x, z, id: id('press') })); const sp = spots[spots.length - 1]; if (sp && sp.kind === 'press') sp.hut = hut; } else { IB.more.shed(k, x, z, 0, '#c9b28a', '#7a6a5a'); solid(x - 2, z - 1.5, x + 2, z + 1.5); spots.push({ kind: 'press', id: id('press'), name: 'the packing shed', at: [x, z + 3], yaw: Math.PI, hit: [x, z, 0, 4] }); } }
        hives(L(7, 52), 2, hut);
      } else if (blk.type === 'pasture') {
        // (its paddock is one of the farm's paddocks, added when it was bought: fences, gate and animals as any other)
      } else if (blk.type === 'meadow') {
        const m = [x0 + 4, z0 + 4, x1 - 4, z1 - 4]; out.paths.push(m); out.meadows.push({ rect: m, blk });
      } else if (blk.type === 'bees') {
        for (let q = 0; q < 70; q++) { const lx = 4 + R() * 44, lz = 4 + R() * 52; if (Math.abs(lx - 26) < 5 || Math.abs(lz - 30) < 5 || (lx < 22 && lz > 46)) continue; const [x, z] = L(lx, lz); k.ball(0.22 + R() * 0.12, x, 0.18, z, ['#ff8fb1', '#ffd34f', '#b59cff', '#ffffff', '#ff9a5a'][q % 5], { n: 6 }); k.cone(0.08, 0.35, x, 0, z, '#5fae4a', { n: 3 }); }
        { const [x, z] = L(19.5, 51); hives(L(8, 52), 4, FB ? walkIn(FB.honeyHouse({ x, z })) : null); }
      }
      function hives([hx, hz], nH, hut) {
        for (let q = 0; q < nH; q++) { const x = hx + q * 2.4; k.at(x, 0, hz, 0, kk => { bx(kk, 1.4, 0.3, 1.4, 0, 0, 0, '#8a6038'); for (let j = 0; j < 3; j++) bx(kk, 1.3, 0.45, 1.3, 0, 0.3 + j * 0.47, 0, j % 2 ? '#ffd35a' : '#f2c14a', { r: 0.04 }); bx(kk, 1.5, 0.15, 1.5, 0, 1.75, 0, '#c9a173'); }); solid(x - 0.8, hz - 0.8, x + 0.8, hz + 0.8); }
        spots.push({ kind: 'hives', id: id('hives'), name: 'the beehives', at: [hx + (nH - 1) * 1.2, hz + 2.2], yaw: Math.PI, hit: [hx + (nH - 1) * 1.2, hz, 0, nH * 2.4], hut });
      }
    });
    return out;
  }
  // a block meadow's long grass (the lawn kit's own), cut where it's been baled; it grows back in two days
  function meadowGrass(M, phase) {
    const blk = M.blk, cut = blk.cut || (blk.cut = { cells: {}, at: 0 }); if (cut.at && Date.now() - cut.at > 2 * DAY) { cut.cells = {}; cut.at = 0; }
    if (!IH.lawnKit) return null; const [x0, z0, x1, z1] = M.rect, cells = [];
    for (let i = x0; i < x1; i++) for (let j = z0; j < z1; j++) cells.push({ x: i, z: j });
    const L = IH.lawnKit.build({ cells, x0: x0 - 4, z0: z0 - 4, W, D, seed: 777 + blk.id.length, phase: phase || 'day', per: e => (e ? 30 : 6), ground: false });
    L.position.y = 0.07; IH.lawnKit.grow(L, 1.25); for (const key of Object.keys(cut.cells)) { const [i, j] = key.split(',').map(Number); IH.lawnKit.cutAt(L, i + 0.5, j + 0.5, 0.75); }
    M.L = L; M.cells = cut.cells; M.key = (i, j) => i + ',' + j; M.mark = () => { cut.at = cut.at || Date.now(); };
    return L;
  }
  IH.farmLand = { W, D, SLOTS, SLOT_NAME, TYPES, EDGES, EDGE_XP, rectOf, price, canHave, bounds, onLand, build, meadowGrass, owned, PAD_GATE };
})();
