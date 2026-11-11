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
  const PI = Math.PI;
  const W = 52, D = 60, DAY = 864e5, today = () => Math.floor(Date.now() / DAY) + (IH.econDays || 0); // (IH.econDays: the test clock, economy.js)
  const TRACK = [[24, 0.4, 28, 16], [6, 13, 51, 17], [47.6, 13, 51, 45]], MEADOW = [4, 45.5, 48, 58], BARN = [6.6, 2.2, 17.4, 9.8], FENCE_XP = 8, DRIVE_XP = 3;
  // the hay yard on the grass in front of the barn: round bales stood on end in two lines, three high (each 6 hay)
  const YARD = [13.4, 10.0, 17.8, 12.8], YARD_CAP = 18, YARD_DROP = { x: 15.6, z: 14.6 };

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
    milkstand: { name: 'Milking shed', e: '🥛', xp: 800, fp: [5.6, 4.2], in: false, about: 'A walk-in shed: a stand, a vat, a sink. Milk your goats and cows here.' },
    shearstand: { name: 'Woolshed', e: '✂️', xp: 900, fp: [6.4, 4.6], in: false, about: 'A walk-in shed: the board, a catching pen, the wool press. Shear sheep, alpacas and llamas here.' },
    beehive: { name: 'Beehive', e: '🐝', xp: 250, fp: [1.6, 1.6], in: false, about: 'Two jars of honey every three days.' },
    tank: { name: 'Water tank', e: '🛢️', xp: 200, fp: [2.4, 2.4], in: false },
    hay: { name: 'Hay bales', e: '🟫', xp: 60, fp: [3, 2], in: null },
    barrow: { name: 'Wheelbarrow', e: '🛒', xp: 80, fp: [1.4, 1], in: null },
    churns: { name: 'Milk churns', e: '🥛', xp: 60, fp: [1.6, 1], in: null },
    tree: { name: 'Shade tree', e: '🌳', xp: 150, fp: [1.4, 1.4], in: null, about: 'Shade for the animals, or just for looks. Inside a paddock or out.' },
    tractor: { name: 'Tractor', e: '🚜', xp: 1500, fp: [2.6, 4.0], in: false, about: 'Drive it round the farm.' },
    quad: { name: 'Quad bike', e: '🏍️', xp: 900, fp: [1.6, 2.4], in: false, about: 'Zoom round the farm.' }
  };
  const NEEDS_NAME = { coop: 'a hen house', pond: 'a duck pond', sty: 'a pig ark', milkstand: 'a milking shed', shearstand: 'a woolshed' };
  // fittings that are walk-in buildings now (farm-buildings.js), and the builder for each
  const SHEDS = { milkstand: 'milkShed', shearstand: 'shearShed' };
  const qturn = a => Math.round((a || 0) / (Math.PI / 2)) * (Math.PI / 2);
  const fpOf = it => { const d = ITEMS[it.t], q = Math.abs(Math.round(Math.sin(qturn(it.ry)))); return d ? (q ? [d.fp[1], d.fp[0]] : d.fp) : [1, 1]; };

  // ---------- the save: made, and version 1 farms moved over (their hen run, big paddock and fittings as they were)
  const nid = () => Math.random().toString(36).slice(2, 9);
  function state(st) {
    const f = st || {}; if (f.v === 2) return tagAnimals(f);
    const old = f.animals || { hen: 3, goat: 1 }, run = { id: 'run', x0: 31, z0: 1.2, x1: 45, z1: 11.6 }, big = { id: 'big', x0: 5, z0: 19, x1: 47, z1: 41 };
    const animals = []; for (const [kind, n] of Object.entries(old)) for (let i = 0; i < n; i++) animals.push({ id: nid(), kind, pad: kind === 'hen' ? 'run' : 'big', got: (f.got || {})[kind] || 0 });
    const items = [['coop', 36, 4.4, 0], ['trough', 38, 9.6, 0], ['trough', 16, 24, 0], ['hay', 41, 24, 0.3], ['feeder', 30, 24, 0], ['shelter', 42, 35, 0], ['milkstand', 8.6, 11.4, 0], ['shearstand', 49, 9, 0], ['tractor', 20.5, 11.6, -0.4], ['churns', 18.6, 3.2, 0]].map(([t, x, z, ry]) => ({ id: nid(), t, x, z, ry }));
    const land = f.land; for (const k of Object.keys(f)) delete f[k];
    return Object.assign(f, { v: 2, paddocks: [run, big], items, animals, feed: { grain: 10, hay: 10, nuts: 0 }, fed: {} }, land ? { land } : {});
  }
  const inPad = (p, x, z, m = 0) => x > p.x0 + m && x < p.x1 - m && z > p.z0 + m && z < p.z1 - m;
  const padOf = (f, x, z) => f.paddocks.find(p => inPad(p, x, z, 0.3));
  const area = p => (p.x1 - p.x0) * (p.z1 - p.z0);
  /* ---------- the animals as individuals (economy plan, phase 4): each has a name (once the kid gives one), a sex,
     and a neglect count: played days its paddock went unfed. 1-2 hungry, 3-4 unwell (feeding alone won't fix it: the
     vet's needed), 5-6 very sick, 7 it dies. Only played days count (economy.js runs the day), so being away never
     harms one, and holiday mode (a neighbour feeding them) stops the count. Now and then a pair that's well fed and
     has room has a young one. */
  // the field machines (economy plan, phase 7): bought at the barn, hitched like the baler
  const MACHINES = {
    plough: { e: '⛏️', name: 'Plough', xp: 600, about: 'Turns the soil in the empty beds it passes: the next crop there gives one more.', how: 'Drive along a field block’s middle lane: it works the empty beds both sides.' },
    drill: { e: '🌱', name: 'Seed drill', xp: 800, about: 'Sows every empty bed it passes, with the seed you pick (paid for as it goes).', how: 'Pick the seed, then drive along a field block’s middle lane.' },
    sprayer: { e: '💧', name: 'Sprayer', xp: 700, about: 'Waters every planted bed it passes, once a day.', how: 'Drive along a field block’s middle lane: it waters the beds both sides.' }
  };
  const BABY = { hen: 'chick', rooster: 'chick', duck: 'duckling', goose: 'gosling', turkey: 'poult', goat: 'kid', cow: 'calf', highland: 'calf', merino: 'lamb', alpaca: 'cria', llama: 'cria', kunekune: 'piglet', donkey: 'foal', pony: 'foal' };
  const MOTHERS = /^(egg|milk)$/; // (only mothers lay or give milk)
  const hashS = s0 => [...String(s0)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const isYoung = a => !!a.born && today() - a.born < 14;
  const health = a => { const n = a.neg || 0; return n >= 5 ? ['Very sick', 'sick2'] : n >= 3 ? ['Unwell: needs the vet', 'sick'] : n >= 1 ? ['Hungry', 'hungry'] : ['Healthy', 'ok']; };
  const animalName = a => a.name || `your ${ANIMALS[a.kind] ? ANIMALS[a.kind].name.toLowerCase() : a.kind}`;
  function tagAnimals(f) {
    for (const a of f.animals || []) { const m = ANIMALS[a.kind] || {}; if (!a.sex) a.sex = a.kind === 'rooster' ? 'm' : a.kind === 'hen' || MOTHERS.test(m.makes || '') ? 'f' : hashS(a.id) % 2 ? 'f' : 'm'; if (a.neg == null) a.neg = 0; }
    return f;
  }
  // the kind a young one is, from its parents (a chick from a hen and a rooster is a hen or a rooster)
  const pairs = kind => (kind === 'hen' || kind === 'rooster' ? ['hen', 'rooster'] : [kind]);
  // one played day on the farm: who went hungry, who's sick, who died, who was born. prev: the last played day.
  IH.farmDay = (f0, prev, R = Math.random) => {
    const f = state(f0), now = today(), out = []; if (prev == null || f.v !== 2) return out;
    const hol = f.holiday && f.holiday.until >= now;
    for (const a of [...f.animals]) {
      if (hol || (f.fed[a.pad] || 0) >= prev) { if ((a.neg || 0) < 3) a.neg = 0; } else a.neg = (a.neg || 0) + 1;
      if (a.neg === 3 || a.neg === 5) out.push({ kind: a.neg === 3 ? 'sick' : 'verysick', id: a.id, name: animalName(a), animal: a.kind, e: (ANIMALS[a.kind] || {}).e });
      if (a.neg >= 7) { f.animals.splice(f.animals.indexOf(a), 1); (f.remembered = f.remembered || []).push({ name: a.name || '', kind: a.kind, day: now }); out.push({ kind: 'died', name: animalName(a), animal: a.kind, e: (ANIMALS[a.kind] || {}).e }); }
    }
    for (const p of f.paddocks) {
      const here = f.animals.filter(a => a.pad === p.id && !a.neg && !isYoung(a)), done = new Set();
      for (const a of here) {
        const kinds = pairs(a.kind), key = kinds.join(); if (done.has(key)) continue; done.add(key);
        const grp = here.filter(b => kinds.includes(b.kind)), mums = grp.filter(b => b.sex === 'f'), dads = grp.filter(b => b.sex === 'm');
        if (!mums.length || !dads.length || R() > 1 / 14) continue;
        const sex = R() < 0.5 ? 'f' : 'm', kind = kinds.length > 1 ? (sex === 'm' ? 'rooster' : 'hen') : a.kind;
        if (used(f, p) + ANIMALS[kind].room > area(p)) continue; // (a full paddock: no young ones)
        const b = { id: nid(), kind, pad: p.id, sex, born: now, got: 0, neg: 0, name: '' }; f.animals.push(b);
        out.push({ kind: 'born', id: b.id, animal: kind, baby: BABY[kind] || 'baby', e: ANIMALS[kind].e, mum: animalName(mums[0]), sex });
      }
    }
    return out;
  };
  IH.farmData = { ANIMALS, ITEMS, FEED, BABY, health, isYoung, animalName };
  // a brother's or sister's farm job (app.js, Employment), done on the farm's save: feed every paddock (from the feed
  // in store), collect what the layers have laid, water the field beds. Gives back what was done, in words.
  IH.farmChores = (task, st0) => {
    const f = state(st0.farm || (st0.farm = {})), now = today();
    if (task === 'feed') { let n = 0; for (const p of f.paddocks) { const L = f.animals.filter(a => a.pad === p.id); if (!L.length || (f.fed[p.id] || 0) === now) continue; const need = {}; for (const a of L) need[ANIMALS[a.kind].eats] = (need[ANIMALS[a.kind].eats] || 0) + 1; if (Object.entries(need).some(([k, x]) => (f.feed[k] || 0) < x)) continue; for (const [k, x] of Object.entries(need)) f.feed[k] -= x; f.fed[p.id] = now; n++; } return n ? `fed ${n} paddock${n === 1 ? '' : 's'}` : 'found everyone already fed (or not enough feed)'; }
    if (task === 'eggs') { let n = 0; for (const a of f.animals) { const m = ANIMALS[a.kind]; if (m.makes !== 'egg' || a.sex === 'm' || isYoung(a) || (f.fed[a.pad] || 0) < now - 1) continue; const k = a.got ? Math.min(3, Math.floor((Date.now() - a.got) / (m.every * DAY))) : 1; if (k > 0) { n += k * m.n; a.got = Date.now(); } } if (n) { st0.food = st0.food || {}; st0.food.egg = (st0.food.egg || 0) + n; } return n ? `collected ${n} egg${n === 1 ? '' : 's'}` : 'found no eggs ready yet'; }
    if (task === 'water') { const P = ((st0.isl = st0.isl || {}).plot = st0.isl.plot || {}), d = Math.floor(Date.now() / DAY); let n = 0; for (const b of P.beds || []) { if (!b || !b.crop || (b.watered || []).includes(d)) continue; (b.watered = b.watered || []).push(d); n++; } return n ? `watered ${n} bed${n === 1 ? '' : 's'}` : 'found nothing that needed water today'; }
    return '';
  };
  const used = (f, p) => f.animals.filter(a => a.pad === p.id).reduce((s, a) => s + ANIMALS[a.kind].room, 0);
  // the gate: in the middle of the side nearest the track
  function gateOf(p) {
    const G = p.gate; if (G && 'nsew'.includes(G.side)) { const along = G.side === 'n' || G.side === 's', lo = (along ? p.x0 : p.z0) + 2, hi = (along ? p.x1 : p.z1) - 2, t = Math.max(lo, Math.min(hi, G.t)); return along ? { side: G.side, x: t, z: G.side === 'n' ? p.z0 : p.z1 } : { side: G.side, x: G.side === 'w' ? p.x0 : p.x1, z: t }; }
    return gateMid(p);
  }
  // (where it goes unless it's been moved: in the middle of the side nearest the track)
  function gateMid(p) { const cx = (p.x0 + p.x1) / 2, cz = (p.z0 + p.z1) / 2, d = { n: Math.abs(p.z0 - 15), s: Math.abs(p.z1 - 15), w: Math.abs(p.x0 - 26), e: Math.abs(p.x1 - 26) }; const side = Object.keys(d).sort((a, b) => d[a] - d[b])[0]; return side === 'n' ? { side, x: cx, z: p.z0 } : side === 's' ? { side, x: cx, z: p.z1 } : side === 'w' ? { side, x: p.x0, z: cz } : { side, x: p.x1, z: cz }; }
  const outside = (g, d = 1.4) => (g.side === 'n' ? [g.x, g.z - d] : g.side === 's' ? [g.x, g.z + d] : g.side === 'w' ? [g.x - d, g.z] : [g.x + d, g.z]);

  // ---------- the models: fittings and equipment, all Kit-built like everything else
  function itemModel(t, kk) {
    if (IH.farmItems && IH.farmItems[t]) return IH.farmItems[t](kk); // (farm-items.js: the detailed models)
    if (t === 'tree') return IB.more.tree(kk, 0, 0, rng(808), 1.05, 0, ['#4f9a3c', '#5fae4a']);
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
    if (kind === 'baler') {
      // a round baler: the drawbar and PTO shaft up to the hitch, the green body with its panels and decals, the
      // round chamber with the tailgate seam and hinges, the pickup reel with its rows of tines, the twine box, lights
      const GR = '#2f8a4f', GD = '#26703f';
      k.box(0.12, 0.12, 1.5, 0, 0.55, 1.1, '#3d4048'); k.cyl(0.05, 1.3, 0.18, 0.62 - 0.65, 1.15, '#3d4048', { n: 6, rx: Math.PI / 2 }); k.cyl(0.09, 0.3, 0.18, 0.62 - 0.15, 1.3, '#e8c45a', { n: 8, rx: Math.PI / 2 });
      k.box(2.0, 1.4, 1.5, 0, 0.45, -0.1, GR, { r: 0.12 }); for (const s of [-1, 1]) { k.box(0.03, 1.1, 1.2, s * 1.0, 0.6, -0.1, GD, { r: 0.04 }); k.box(0.03, 0.12, 0.7, s * 1.01, 1.2, 0.1, '#e8c45a', { r: 0.02 }); k.box(0.03, 0.08, 0.5, s * 1.01, 1.02, 0.1, '#ffffff', { r: 0.02 }); }
      k.cyl(0.72, 2.02, 0, 0.92 - 1.01, -0.4, GD, { n: 18, rz: Math.PI / 2 }); k.cyl(0.735, 0.04, 0, 0.92 - 0.02, -0.4, '#1f5c33', { n: 18, rz: Math.PI / 2 });
      for (const s of [-1, 1]) { k.cyl(0.1, 0.06, s * 1.03, 0.92 - 0.03, -0.4, '#3d4048', { n: 8, rz: Math.PI / 2 }); k.box(0.12, 0.1, 0.1, s * 1.0, 0.42, -1.05, '#d8433a', { r: 0.03 }); k.box(0.12, 0.1, 0.1, s * 1.0, 0.3, -1.05, '#ffb340', { r: 0.03 }); }
      k.box(2.2, 0.35, 0.5, 0, 0.12, 0.8, '#e8c45a', { r: 0.06 }); k.cyl(0.14, 2.1, 0, 0.28 - 1.05, 0.98, '#c9a03a', { n: 10, rz: Math.PI / 2 });
      for (let i = 0; i < 14; i++) for (const a of [0, 2.1, 4.2]) k.box(0.025, 0.2, 0.025, -0.95 + i * 0.146, 0.28 + Math.sin(a) * 0.14, 0.98 + Math.cos(a) * 0.14 + 0.08, '#3d4048', { rx: -a, r: 0 });
      k.box(0.5, 0.35, 0.4, -0.55, 1.85, 0.25, GR, { r: 0.05 }); k.box(0.46, 0.05, 0.36, -0.55, 2.2, 0.25, GD, { r: 0.02 }); for (let i = 0; i < 3; i++) k.cyl(0.07, 0.05, -0.7 + i * 0.15, 2.2, 0.25, '#f2e6c0', { n: 8 });
    } else if (kind === 'plough') {
      // a three-furrow plough: a drawbar, a steel frame, three curved mouldboards with their shares, a depth wheel
      k.box(0.12, 0.12, 1.4, 0, 0.55, 1.0, '#3d4048'); k.box(0.2, 0.18, 2.6, 0, 0.6, -0.3, '#c8433a', { r: 0.04, ry: 0.45 });
      for (let i = 0; i < 3; i++) { const x = -0.7 + i * 0.7, z = 0.2 - i * 0.7; k.box(0.12, 0.5, 0.12, x, 0.2, z, '#3d4048'); k.box(0.5, 0.4, 0.08, x - 0.12, 0.05, z - 0.1, '#c9ccd2', { ry: 0.7, rz: 0.3, r: 0.04 }); k.cone(0.07, 0.3, x, 0.02, z + 0.2, '#8a8f98', { n: 4, rx: Math.PI / 2 }); }
    } else if (kind === 'drill') {
      // a seed drill: the green hopper with its lid, the row of seed tubes down to the coulters, a press roller
      k.box(0.12, 0.12, 1.5, 0, 0.55, 1.0, '#3d4048'); k.box(2.2, 0.8, 0.9, 0, 0.75, -0.3, '#2f8a4f', { r: 0.08 }); k.box(2.3, 0.08, 1.0, 0, 1.55, -0.3, '#26703f', { r: 0.04 });
      for (let i = 0; i < 8; i++) { const x = -0.95 + i * 0.27; k.cyl(0.025, 0.6, x, 0.15, 0.05, '#3d4048', { n: 5 }); k.cyl(0.07, 0.03, x, 0.08, 0.15, '#8a8f98', { n: 8, rz: Math.PI / 2 }); }
      k.cyl(0.14, 2.1, 0, 0.14 - 1.05, -0.9, '#5d6670', { n: 10, rz: Math.PI / 2 }); k.box(0.6, 0.2, 0.05, 0, 1.0, 0.16, '#e8c45a', { r: 0.02 });
    } else if (kind === 'sprayer') {
      // a boom sprayer: the white tank on its frame, the long folding boom with nozzles both sides
      k.box(0.12, 0.12, 1.5, 0, 0.55, 1.0, '#3d4048'); k.box(1.6, 0.2, 1.8, 0, 0.5, -0.3, '#3d4048', { r: 0.03 }); k.cyl(0.6, 1.6, -0.8, 0.7 + 0.0, -0.3, '#f1f1ee', { n: 14, rz: Math.PI / 2 }); k.cyl(0.18, 0.15, 0, 1.3 + 0.0, -0.3, '#3a7bc8', { n: 8 });
      for (const sd of [-1, 1]) { k.box(4.4, 0.08, 0.08, sd * 2.9, 0.8, -1.2, '#3d4048', { r: 0.02 }); k.box(0.06, 0.6, 0.06, sd * 0.85, 0.5, -1.2, '#3d4048'); for (let i = 0; i < 8; i++) k.cone(0.05, 0.15, sd * (1.0 + i * 0.55), 0.62, -1.2, '#3a7bc8', { n: 4, rx: Math.PI }); }
    } else {
      // a flatbed trailer: the A-frame drawbar with its jack, a planked deck on two runners, the headboard with
      // its mesh, side rails on stakes, mudguards over the wheels, the tail lights and number plate
      const RW = '#b7834f', RD = '#8a6038', ST = '#3d4048';
      for (const s of [-1, 1]) k.box(0.08, 0.08, 1.7, s * 0.28, 0.55, 1.2, ST, { ry: s * -0.17, r: 0.02 }); k.box(0.16, 0.14, 0.24, 0, 0.53, 1.95, ST, { r: 0.04 });
      k.cyl(0.04, 0.5, 0.25, 0.08, 1.4, '#5d6670', { n: 6 }); k.cyl(0.08, 0.04, 0.25, 0.05, 1.4, ST, { n: 8 }); k.cyl(0.03, 0.15, 0.25, 0.58 - 0.075, 1.4, '#d8433a', { n: 5, rz: Math.PI / 2 });
      for (const s of [-1, 1]) k.box(0.12, 0.14, 2.9, s * 0.6, 0.5, -0.4, ST, { r: 0.02 });
      k.box(2.0, 0.12, 2.8, 0, 0.62, -0.4, RW, { r: 0.03 }); for (let i = 0; i < 9; i++) k.box(0.02, 0.125, 2.8, -0.88 + i * 0.22, 0.62, -0.4, RD, { r: 0 });
      k.box(2.0, 0.7, 0.08, 0, 0.74, 0.98, ST, { r: 0.02 }); for (let i = 0; i < 9; i++) k.box(0.02, 0.62, 0.09, -0.8 + i * 0.2, 0.78, 0.98, '#5d6670', { r: 0 }); for (let i = 0; i < 3; i++) k.box(1.9, 0.02, 0.09, 0, 0.9 + i * 0.18, 0.98, '#5d6670', { r: 0 });
      for (const s of [-1, 1]) { k.box(0.08, 0.4, 2.8, s * 0.98, 0.8, -0.4, RD, { r: 0.02 }); for (let i = 0; i < 5; i++) k.box(0.1, 0.48, 0.08, s * 1.0, 0.72, 0.85 - i * 0.62, ST, { r: 0.02 }); k.box(0.36, 0.05, 1.0, s * 1.1, 1.0, -0.3, ST, { r: 0.02 }); k.box(0.05, 0.3, 0.6, s * 1.27, 0.72, -0.3, ST, { r: 0.02 }); }
      k.box(2.0, 0.4, 0.08, 0, 0.8, -1.8, RD, { r: 0.02 }); for (const s of [-1, 1]) { k.box(0.16, 0.1, 0.06, s * 0.82, 0.52, -1.86, '#d8433a', { r: 0.03 }); k.box(0.16, 0.06, 0.06, s * 0.82, 0.45, -1.86, '#ffb340', { r: 0.02 }); } k.box(0.42, 0.14, 0.03, 0, 0.47, -1.86, '#fff6e0', { r: 0.02 });
    }
    g.add(k.build());
    for (const s of [-1, 1]) { const w = new T.Group(); w.position.set(s * (kind === 'baler' ? 1.12 : 1.1), 0.45, -0.3); const m = wheel(0.45, 0.3); if (s < 0) m.rotation.y = Math.PI; w.add(m); g.add(w); wheels.push(w); }
    const load = new T.Group(); load.position.set(0, 0.72, -0.4); g.add(load);
    return { g, wheels, load, len: kind === 'baler' ? 1.9 : kind === 'trailer' ? 2.2 : 1.6, r: 0.45 };
  }
  // a round bale of hay, lying on its side
  function baleModel() { const k = new Kit(); k.cyl(0.62, 1.15, 0, -0.575, 0, '#e8c45a', { n: 16, rz: Math.PI / 2 }); for (const s of [-1, 1]) { k.cyl(0.56, 0.02, s * 0.585, -0.01, 0, '#d9b24a', { n: 16, rz: Math.PI / 2 }); k.torus(0.32, 0.02, s * 0.59, 0, 0, '#c9a03a', { ry: Math.PI / 2 }); } const g = k.build(); g.position.y = 0.62; const o = new T.Group(); o.add(g); return o; }
  // a round bale stood on its end (the yard stacks)
  function baleUp() { const k = new Kit(); k.cyl(0.62, 1.15, 0, 0, 0, '#e8c45a', { n: 16 }); k.cyl(0.56, 0.02, 0, 1.15, 0, '#d9b24a', { n: 16 }); k.torus(0.32, 0.02, 0, 1.17, 0, '#c9a03a', { rx: Math.PI / 2 }); k.cyl(0.625, 0.05, 0, 0.55, 0, '#f0d98a', { n: 16 }); k.cyl(0.6, 0.03, 0, 0, 0, '#c9a03a', { n: 16 }); const o = new T.Group(); o.add(k.build()); return o; }
  // where the i-th yard bale stands: the bottom layer first (both lines, west to east), then the next layer up
  function yardSlot(i) { const L = Math.floor(i / 6), j = i % 6; return { x: YARD[0] + 0.75 + (j % 3) * 1.4, y: L * 1.17, z: YARD[1] + 0.72 + Math.floor(j / 3) * 1.34 }; }
  // the yard shows the hay in store, a bale for every 6 (what the animals eat comes off the top)
  function yardSync(B, f) { if (!B.yard) return; const n = Math.min(YARD_CAP, Math.floor(((f.feed && f.feed.hay) || 0) / 6)); while (B.yard.children.length > Math.max(0, n)) B.yard.remove(B.yard.children[B.yard.children.length - 1]); while (B.yard.children.length < n) { const i = B.yard.children.length, s = yardSlot(i), m = baleUp(); m.position.set(s.x, s.y, s.z); m.rotation.y = (i * 1.7) % 6.28; B.yard.add(m); } }
  function fence(k, p, gate, root, gates) {
    const sides = [[[p.x0, p.z0], [p.x1, p.z0], 'n'], [[p.x1, p.z0], [p.x1, p.z1], 'e'], [[p.x1, p.z1], [p.x0, p.z1], 's'], [[p.x0, p.z1], [p.x0, p.z0], 'w']];
    const runs = []; for (const [a, b, s] of sides) { if (s !== gate.side) { runs.push([a, b]); continue; } const L = Math.hypot(b[0] - a[0], b[1] - a[1]), uc = ((gate.x - a[0]) * (b[0] - a[0]) + (gate.z - a[1]) * (b[1] - a[1])) / (L * L), u0 = uc - 1.6 / L, u1 = uc + 1.6 / L, at = u => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; runs.push([a, at(u0)], [at(u1), b]); if (root) gates.push(hangGate(k, root, at(u0), at(u1))); }
    for (const [a, b] of runs) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.2) continue; const n = Math.max(1, Math.round(L / 2.2)), ry = -Math.atan2(b[1] - a[1], b[0] - a[0]); for (let i = 0; i <= n; i++) bx(k, 0.22, 1.5, 0.22, a[0] + (b[0] - a[0]) * i / n, 0, a[1] + (b[1] - a[1]) * i / n, '#e9e2d4'); for (const y of [0.55, 1.15]) k.box(L, 0.14, 0.08, (a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, '#e9e2d4', { ry }); }
    return runs;
  }

  // A milking or shearing stand saved before 2026-11-11 is a shed now, bigger than the stand was: if the shed doesn't
  // fit where the stand stood, it moves to the nearest clear spot (on the farm's land, off the track, out of the
  // paddocks and the meadow, clear of everything else) and the kid is told when they next arrive.
  function roomForSheds(f) {
    const onL = IH.farmLand ? IH.farmLand.onLand(f) : (x, z, m = 0) => x >= m && z >= m && x <= W - m && z <= D - m;
    const rectOf = (it, x = it.x, z = it.z) => { const [w, d] = fpOf(it); return [x - w / 2, z - d / 2, x + w / 2, z + d / 2]; };
    for (const it of f.items) {
      if (!SHEDS[it.t]) continue;
      const blocks = [BARN, [2, 13.8, 4.4, 16.2], [21.6, 1.6, 23.2, 3.2], YARD, [MEADOW[0] - 1, MEADOW[1] - 1, MEADOW[2] + 1, MEADOW[3] + 1], ...TRACK, ...(f.drives || []).map(q => [q.x0, q.z0, q.x1, q.z1]), ...f.paddocks.map(p => [p.x0 - 0.6, p.z0 - 0.6, p.x1 + 0.6, p.z1 + 0.6]), ...f.items.filter(o => o !== it).map(o => rectOf(o).map((v, i) => v + (i < 2 ? -0.4 : 0.4)))];
      // (with room to walk in: 2.5 m of clear ground in front of its door side)
      const fy = qturn(it.ry), fx0 = Math.round(Math.sin(fy)), fz0 = Math.round(Math.cos(fy));
      const withApron = r => [Math.min(r[0], r[0] + fx0 * 2.5), Math.min(r[1], r[1] + fz0 * 2.5), Math.max(r[2], r[2] + fx0 * 2.5), Math.max(r[3], r[3] + fz0 * 2.5)];
      const ok = (x, z) => { const r0 = rectOf(it, x, z), r = withApron(r0); return onL(r[0], r[1], 1) && onL(r[2], r[3], 1) && onL(r[0], r[3], 1) && onL(r[2], r[1], 1) && !blocks.some(b => r[0] < b[2] && r[2] > b[0] && r[1] < b[3] && r[3] > b[1] && !(TRACK.includes(b) && !(r0[0] < b[2] && r0[2] > b[0] && r0[1] < b[3] && r0[3] > b[1]))); };
      if (ok(it.x, it.z)) continue;
      let best = null; for (let rr = 0.5; rr <= 24 && !best; rr += 0.5) for (let a = 0; a < 48; a++) { const x = it.x + Math.cos(a / 48 * Math.PI * 2) * rr, z = it.z + Math.sin(a / 48 * Math.PI * 2) * rr; if (ok(x, z)) { best = [Math.round(x * 10) / 10, Math.round(z * 10) / 10]; break; } }
      if (best) { it.x = best[0]; it.z = best[1]; (f.notes = f.notes || []).push(`Your ${it.t === 'milkstand' ? 'milking stand is a milking shed' : 'shearing stand is a woolshed'} now! It needed more room, so it’s moved a little.`); }
    }
  }

  // ---------- the farm, from its save
  function build(st0) {
    const f = state(st0), R = rng(5150), k = new Kit(), solids = [], spots = [], animals = [], root = new T.Group();
    const solid = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    bx(k, W, 0.42, D, W / 2, -0.42, D / 2, '#9a7a52', { r: 0.18, seg: 2 }); sides(k, W, D, R, '#8a7452');
    bx(k, W - 0.4, 0.04, D - 0.4, W / 2, 0, D / 2, '#7fbf5c', { r: 0.02 });
    for (const [x0, z0, x1, z1] of [...TRACK, ...(f.drives || []).map(d => [d.x0, d.z0, d.x1, d.z1])]) bx(k, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, '#b89668', { r: 0.03 }); // (the track, and the driveways laid since)
    // the land blocks joined on (farm-land.js): their ground, boundaries and gates, and what's on each
    if (IH.farmBuildings) roomForSheds(f);
    const LAND = IH.farmLand ? IH.farmLand.build(f, k, root, solid, spots) : { lawns: [], paths: [], meadows: [], beds: [], trees: [], drawBed: null };
    const walkins = [...(LAND.walkins || [])], sheds = {};
    // the barn (the farm shop and the planner), the windmill, the signpost: always there
    // the barn (walk-in: farm-buildings.js) with the farm shop counter, the planner board, the feed bins and the hay
    let barnW = null;
    if (IH.farmBuildings) { barnW = IH.farmBuildings.barn(); root.add(barnW.group); walkins.push(barnW); for (const r of barnW.solids) solid(...r); for (const sp of barnW.spots) spots.push(sp); }
    else { solid(...BARN); spots.push({ kind: 'fbarn', id: 'barn', name: 'the barn', at: [12, 10.8], yaw: Math.PI, hit: [12, 9.6, 0, 4] }); }
    { const W0 = windpump(3.2, 15); k.at(3.2, 0, 15, 0, W0.tower); root.add(W0.rotor); solid(2.0, 13.8, 4.4, 16.2); }
    signpost(k, 22.4, 2.4, 'farm'); solid(22.1, 2.1, 22.7, 2.7); spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [23.8, 3.6], yaw: Math.PI, hit: [22.4, 2.4, 0, 2.4] });
    // the paddocks: fences, a gate, and the gate's spot (feeding, who lives here)
    const gates = [], pads = f.paddocks.map(p => { const g = gateOf(p), runs = fence(k, p, g, root, gates); for (const [a, b] of runs) solid(a[0] - 0.2, a[1] - 0.2, b[0] + 0.2, b[1] + 0.2); const at = outside(g); spots.push({ kind: 'fgate', id: 'gate' + p.id, pad: p.id, name: 'the paddock gate', at, yaw: Math.atan2(g.x - at[0], g.z - at[1]), hit: [g.x, g.z, 0, 2.6] }); return { p, g }; });
    // fittings and equipment
    const models = {}, vehicles = {};
    for (const it of f.items) { const d = ITEMS[it.t]; if (!d) continue;
      if (SHEDS[it.t] && IH.farmBuildings) { const Bw = IH.farmBuildings[SHEDS[it.t]]({ x: it.x, z: it.z, ry: qturn(it.ry), item: it.id }); root.add(Bw.group); for (const r of Bw.solids) solid(...r); for (const sp of Bw.spots) spots.push(sp); walkins.push(Bw); sheds[it.id] = Bw; models[it.id] = Bw.group; continue; }
      const g = new T.Group(), kk = new Kit(); itemModel(it.t, kk); g.add(kk.build()); if (it.t === 'coop' && IH.farmItems && IH.farmItems.coopLid) { const lid = new T.Group(), lk = new Kit(); IH.farmItems.coopLid(lk); lid.add(lk.build()); lid.position.set(1.42, 1.65, -0.1); g.add(lid); g.userData.lid = lid; } if (it.t === 'tractor') vehicles[it.id] = Object.assign(tractorWheels(g), { item: it }); if (it.t === 'pond' && IH.look.seaSheet) g.add(IH.look.seaSheet(-2.2, -1.7, 2.2, 1.7, 0.16, (x, z) => { const e = (x / 1.85) ** 2 + (z / 1.35) ** 2; return e < 1 ? 0.16 - 0.8 * (1 - e) : 0.4; }, { n: 6, foam: 0.18, deepAt: 0.6, shallow: '#8fe0d0', deep: '#2f7f9f', mud: '#8f8a99' })); g.position.set(it.x, 0, it.z); g.rotation.y = it.ry || 0; root.add(g); models[it.id] = g;
      const [w, dd] = d.fp, c = Math.abs(Math.cos(it.ry || 0)), s = Math.abs(Math.sin(it.ry || 0)), hw = (w * c + dd * s) / 2, hd = (w * s + dd * c) / 2; solid(it.x - hw, it.z - hd, it.x + hw, it.z + hd); if (vehicles[it.id]) vehicles[it.id].solid = solids.length - 1;
      if (/^(coop|pond|sty|milkstand|shearstand|beehive|tractor|quad|trough|feeder)$/.test(it.t)) spots.push({ kind: 'fitem', id: 'it' + it.id, item: it.id, t: it.t, name: 'the ' + d.name.toLowerCase(), at: [it.x, it.z + hd + 1.2], yaw: Math.PI, hit: [it.x, it.z, 0, Math.max(w, dd) + 0.4] }); }
    // the animals, each in its own paddock, moving its own way (village.js: the generic movers, or the 3D ones)
    const pens = {}; for (const { p } of pads) pens[p.id] = [p.x0 + 1, p.z0 + 1, p.x1 - 1, p.z1 - 1];
    for (const a of f.animals) { const pen = pens[a.pad]; if (!pen) continue; const mk = (IH.animals3d && IH.animals3d.make) || ((kind) => (IB.MAKE[kind] || IB.MAKE.hen)()); const m = mk(a.kind); m.pen = pen; m.rec = a; if (isYoung(a)) m.group.scale.multiplyScalar(0.55); let x = 0, z = 0; for (let q = 0; q < 30; q++) { x = pen[0] + R() * (pen[2] - pen[0]); z = pen[1] + R() * (pen[3] - pen[1]); if (!solids.some(r => x > r[0] - 0.8 && x < r[2] + 0.8 && z > r[1] - 0.8 && z < r[3] + 0.8)) break; } m.group.position.set(x, 0, z); m.group.rotation.y = R() * 6.28; animals.push(m); root.add(m.group); }
    root.add(k.build()); for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 2, z); m.userData.spot = s; root.add(m); }
    // the hay meadow at the front: long grass (the home's own), cut where the baler's been (it grows back in two days),
    // a low hedge round it, and the round bales lying where they dropped
    const hay = f.hay || (f.hay = { cells: {}, at: 0 }); if (hay.at && Date.now() - hay.at > 2 * DAY) { hay.cells = {}; hay.at = 0; }
    let meadowL = null; if (IH.lawnKit) { const cells = []; for (let i = MEADOW[0]; i < MEADOW[2]; i++) for (let j = Math.ceil(MEADOW[1]); j < MEADOW[3]; j++) cells.push({ x: i, z: j }); meadowL = IH.lawnKit.build({ cells, x0: 0, z0: 0, W, D, seed: 777, phase: 'day', per: e => (e ? 30 : 6), ground: false }); meadowL.position.y = 0.07; IH.lawnKit.grow(meadowL, 1.25); root.add(meadowL); for (const key of Object.keys(hay.cells)) { const i = Math.floor(key / 1000), j = key % 1000; IH.lawnKit.cutAt(meadowL, i + 0.5, j + 0.5, 0.75); } }
    board(k, 'meadow', 'HAY MEADOW', 'tractor work: bale it, haul it', '#fff6e0', '#4a7a3a', 3.4, 0.9, MEADOW[2] + 1.2, 1.6, MEADOW[1] + 1.2, -Math.PI / 2);
    f.bales = f.bales || []; const bales = f.bales.map(b => { const m = baleModel(); m.position.set(b.x, 0, b.z); m.rotation.y = b.ry || 0; root.add(m); return { rec: b, g: m }; });
    for (const M of LAND.meadows) { const L2 = IH.farmLand.meadowGrass(M); if (L2) root.add(L2); }
    const meadows = [{ rect: MEADOW, L: meadowL, cells: hay.cells, key: (i, j) => i * 1000 + j, mark: () => { hay.at = hay.at || Date.now(); } }, ...LAND.meadows];
    const onL = IH.farmLand ? IH.farmLand.onLand(f) : (x, z, m = 0) => x >= m && z >= m && x <= W - m && z <= D - m;
    const lawns = [[0, 0, W, D], ...LAND.lawns], paths = TRACK.map(r => r.slice()).concat((f.drives || []).map(d => [d.x0, d.z0, d.x1, d.z1]), [[MEADOW[0] - 0.5, MEADOW[1] - 0.3, MEADOW[2] + 0.2, MEADOW[3] + 0.2]], walkins.map(w0 => { const r = w0.solids.reduce((a, q) => [Math.min(a[0], q[0]), Math.min(a[1], q[1]), Math.max(a[2], q[2]), Math.max(a[3], q[3])], [1e9, 1e9, -1e9, -1e9]); return r; }), LAND.paths); // (grass everywhere else: the meadow has its own long hay)
    solid(...YARD); const yard = new T.Group(); root.add(yard);
    const B = { walkins, sheds, barn: barnW, gates, vehicles, meadowL, meadows, bales, MEADOW, yard, flights: [], flying: 0, beds: LAND.beds, drawBed: LAND.drawBed, trees: LAND.trees, onLand: onL, walk: (x, z) => onL(x, z, 0.9), tick: t => { for (const M of meadows) if (M.L) IH.lawnKit.tick(M.L, t, 1); flightsTick(B, f, t); }, id: 'farm', title: 'Farm paddock', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: walkins.map(w0 => w0.lamp), bounds: IH.farmLand ? IH.farmLand.bounds(f) : { x0: 0, z0: 0, x1: W, z1: D }, solids, pond: null, bridges: [], spots, buildings: [], arrive: [26, 3.6], lawns, paths, animals, pens, models, npc: 0, centre: [26, 20], growth: 0.55, welcome: 'Your farm. The barn has animals, feed and the farm planner.', farm: f };
    yardSync(B, f); return B;
  }
  // bales coming off the trailer: each lifted off the deck in an arc, stood on end, onto the next place in the yard
  function flightsTick(B, f, t) {
    for (let i = B.flights.length - 1; i >= 0; i--) {
      const F0 = B.flights[i]; if (F0.t0 == null) F0.t0 = t + F0.delay; const u = (t - F0.t0) / 0.9; if (u < 0) continue;
      const e = Math.min(1, u), s = e * e * (3 - 2 * e), m = F0.g;
      m.position.set(F0.a.x + (F0.b.x - F0.a.x) * s, F0.a.y + (F0.b.y - F0.a.y) * s + Math.sin(Math.PI * e) * 1.4, F0.a.z + (F0.b.z - F0.a.z) * s); m.rotation.set(0, F0.ry, (1 - s) * Math.PI / 2);
      if (u >= 1) { B.root.remove(m); B.flights.splice(i, 1); B.flying--; if (F0.done) F0.done(); yardSync(B, f); }
    }
  }
  IB.add('farm', build);

  // The tractor's home: parked by the barn. Every time the kid arrives on the farm it's there (and Auto parks it
  // there when the job's done); a second tractor parks alongside.
  const TRACTOR_HOME = { x: 20.5, z: 11.6, ry: -0.4 };
  IH.farmPark = f => { let n = 0; for (const it of (f && f.items) || []) if (it.t === 'tractor') { Object.assign(it, { x: TRACTOR_HOME.x + n * 3.4, z: TRACTOR_HOME.z, ry: TRACTOR_HOME.ry }); n++; } };

  /* ---------- on the farm (village.js calls this once; ctx is what it needs from there) */
  IH.villageFarm = c => {
    const V = () => c.V, sh = () => c.V.stage.shop, F = () => state(sh().farm()), save = () => sh().farmSave();
    const ready = a => { const m = ANIMALS[a.kind]; if (!m.makes || isYoung(a) || (a.sex === 'm' && MOTHERS.test(m.makes))) return 0; const b = a.got ? Math.min(3, Math.floor((Date.now() - a.got) / (m.every * DAY))) : 1; return b * m.n; };
    const hasIn = (f, pad, t) => f.items.some(it => it.t === t && padOf(f, it.x, it.z) && padOf(f, it.x, it.z).id === pad);
    const hasAny = (f, t) => f.items.some(it => it.t === t);
    const fed = (f, pad) => (f.fed[pad] || 0) >= today() - 1;
    // why an animal isn't making anything (or null: it is)
    function why(f, a) {
      const m = ANIMALS[a.kind]; if (!m.makes) return null; if ((a.neg || 0) >= 3) return 'unwell: call the vet'; if (!fed(f, a.pad)) return 'hungry'; if (!hasIn(f, a.pad, 'trough')) return 'no water';
      if ((m.needs === 'coop' || m.needs === 'pond' || m.needs === 'sty') && !hasIn(f, a.pad, m.needs)) return 'needs ' + NEEDS_NAME[m.needs];
      if ((m.needs === 'milkstand' || m.needs === 'shearstand') && !hasAny(f, m.needs)) return 'needs ' + NEEDS_NAME[m.needs]; return null;
    }
    function collect(s, test, what, pose, emo) {
      const f = F(), L = f.animals.filter(a => test(a)), ok = L.filter(a => !why(f, a) && ready(a) > 0);
      if (!L.length) return c.toast('No animals here for that yet.');
      if (!ok.length) { const w = L.map(a => why(f, a)).find(Boolean); return c.toast(w ? `They can’t yet: ${w}.` : 'Nothing ready yet. Come back tomorrow.'); }
      let n = 0; for (const a of ok) { let k = ready(a); if (a.kind === 'hen' && f.animals.some(o => o.kind === 'rooster' && o.pad === a.pad)) k *= 2; n += k; }
      if (what === 'egg' && eggSeries(s, n, () => { for (const a of ok) a.got = Date.now(); save(); sh().addFood('egg', n); c.float(V().kid, '🥚'); c.sound('buy'); c.toast(`${n} ${n === 1 ? 'egg' : 'eggs'} into the egg fridge in the barn, and your fridge at home! 🥚`); })) return;
      if ((what === 'milk' || what === 'wool') && shedSeries(s, what, ok, n, () => { for (const a of ok) a.got = Date.now(); save(); if (what === 'wool') sh().addGoods('wool', n); else sh().addFood('milk', n); c.float(V().kid, emo); c.sound('buy'); c.toast(what === 'milk' ? `${n} ${n === 1 ? 'bottle' : 'bottles'} of milk into the vat, and your fridge at home! 🥛` : `${n} ${n === 1 ? 'bag' : 'bags'} of wool pressed and on your goods shelf at home! 🧶`); })) return;
      for (const a of ok) a.got = Date.now();
      c.chore(s, pose, 3, () => { save(); if (what === 'wool' || what === 'truffle') sh().addGoods(what, n); else sh().addFood(what, n); c.float(V().kid, emo); c.sound('buy'); c.toast(`${n} ${{ egg: n === 1 ? 'egg' : 'eggs', milk: n === 1 ? 'bottle of milk' : 'bottles of milk', wool: n === 1 ? 'bag of wool' : 'bags of wool', truffle: n === 1 ? 'truffle' : 'truffles' }[what]}! ${what === 'wool' || what === 'truffle' ? 'On your goods shelf.' : 'Into your fridge at home.'}`); }, null, { egg: { tool: 'basket', fx: 'straw', dist: 0.9, y: 0.6, rate: 8 }, milk: { tool: 'pail', fx: 'milk', dist: 0.55, y: 0.75, rate: 16 }, wool: { tool: 'shears', fx: 'wool', dist: 0.8, y: 0.9, rate: 10 }, truffle: { fx: 'soil', dist: 1.0, y: 0.1, rate: 10 } }[what]);
    }
    // ---------- who lives in a paddock: names, sex, age, health; naming one
    const VET_XP = 40, sexMark = a => (a.sex === 'f' ? '♀' : '♂');
    function whoPanel(pad, nameId) {
      const f = F(), L = f.animals.filter(a => a.pad === pad), p = f.paddocks.find(q => q.id === pad);
      const row = a => { const [hw, hc] = health(a); return `<button data-v="farm" data-k="name:${a.id}" class="${nameId === a.id ? 'on' : ''}"><span class="e">${ANIMALS[a.kind].e}</span>${esc(a.name || ANIMALS[a.kind].name)} ${sexMark(a)}${isYoung(a) ? ' · young' : ''}<small>&nbsp;<i class="vg-hb ${hc}"></i>${hw}${why(f, a) && !(a.neg >= 3) ? ` · ${esc(why(f, a))}` : ''} · tap to ${a.name ? 'rename' : 'name'}</small></button>`; };
      const naming = nameId && f.animals.find(a => a.id === nameId);
      c.gamePanel(`<div class="vg-gh"><b>📋 Who lives here</b><span>${p ? `${used(f, p)} / ${Math.floor(area(p))} room` : ''}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div>
        ${L.length ? `<div class="vg-gb vg-mine">${L.map(row).join('')}</div>` : '<div class="vg-gq">Nobody lives here yet. Buy animals at the barn.</div>'}
        ${naming ? `<div class="vg-gq">A name for this ${esc(ANIMALS[naming.kind].name.toLowerCase())}:</div><div class="vg-gb vg-go"><input class="vg-name" maxlength="14" value="${esc(naming.name || '')}" placeholder="${esc(['Daisy', 'Pickles', 'Bramble', 'Clover', 'Biscuit', 'Maple'][hashS(naming.id) % 6])}" aria-label="Name"><button data-v="farm" data-k="nameok:${naming.id}:${pad}">Save</button></div>` : ''}`);
      if (naming) setTimeout(() => { const el = document.querySelector('.vg-name'); if (el) el.focus(); }, 50);
    }
    function nameIt(id, pad) {
      const f = F(), a = f.animals.find(q => q.id === id), el = document.querySelector('.vg-name'); if (!a || !el) return;
      const nm = (el.value || el.placeholder || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 14); if (!nm) return;
      a.name = nm; save(); c.sound('pop'); c.toast(`${ANIMALS[a.kind].e} Hello, ${nm}!`); whoPanel(pad);
    }
    function callVet(pad) {
      const f = F(), L = f.animals.filter(a => a.pad === pad && (a.neg || 0) >= 3); if (!L.length) return;
      if (!sh().farmPay(VET_XP, 'a vet visit')) return;
      for (const a of L) a.neg = 0; save(); c.sound('tune'); c.toast(`The vet's been. ${L.map(animalName).join(', ')} ${L.length === 1 ? 'is' : 'are'} on the mend. Keep their paddock fed every day.`);
      for (const m of V().B.animals) if (m.rec && L.includes(m.rec)) c.float({ pos: m.group.position }, '💚');
    }
    // ---------- mustering: pick animals in a paddock, they follow the kid (along the way the kid walks, so through
    // the gates), and go into the paddock at whichever gate the kid stops at
    let MU = null;
    function musterPanel(pad) {
      const f = F(), L = f.animals.filter(a => a.pad === pad); MU = MU && MU.from === pad && !MU.going ? MU : { from: pad, ids: new Set(), going: false };
      c.gamePanel(`<div class="vg-gh"><b>🐾 Lead animals</b><span>${MU.ids.size} picked</span><button class="vg-x" data-v="farm" data-k="munone" aria-label="Close">✕</button></div>
        <div class="vg-gq">Tap the animals to bring. They’ll follow you. Walk to another paddock’s gate and let them in.</div>
        <div class="vg-gb vg-mine">${L.map(a => `<button data-v="farm" data-k="mupick:${a.id}" class="${MU.ids.has(a.id) ? 'on' : ''}"><span class="e">${ANIMALS[a.kind].e}</span>${esc(a.name || ANIMALS[a.kind].name)} ${sexMark(a)}${MU.ids.has(a.id) ? ' ✓' : ''}</button>`).join('')}</div>
        <div class="vg-gb vg-go"><button data-v="farm" data-k="muall">All of them</button><button data-v="farm" data-k="mugo" ${MU.ids.size ? '' : 'disabled'}>Lead them</button></div>`);
    }
    function lead() {
      let n = 0; for (const m of V().B.animals) if (m.rec && MU.ids.has(m.rec.id)) { m.follow = ++n; m.st = null; }
      MU.going = true; document.querySelector('.vg-game').hidden = true; c.sound('on'); c.toast(`${n} following you. Walk to another paddock’s gate and tap it.`);
    }
    function stopLeading(words) {
      if (!MU) return; const f = F(), pen = id => { const p = f.paddocks.find(q => q.id === id); return p ? [p.x0 + 1, p.z0 + 1, p.x1 - 1, p.z1 - 1] : null; };
      for (const m of V().B.animals) if (m.follow) { m.follow = 0; m.st = null; m.pen = pen(m.rec.pad) || m.pen; }
      MU = null; if (words) c.toast(words);
    }
    function letIn(pad) {
      const f = F(), p = f.paddocks.find(q => q.id === pad); if (!MU || !p) return;
      const L = f.animals.filter(a => MU.ids.has(a.id)), need = L.reduce((t, a) => t + ANIMALS[a.kind].room, 0);
      if (used(f, p) + need > area(p)) return c.toast(`Not enough room here for all of them (${Math.floor(area(p) - used(f, p))} room left, they need ${need}).`);
      for (const a of L) a.pad = pad; save(); c.sound('tune'); stopLeading(`${L.length === 1 ? animalName(L[0]) + ' is' : L.length + ' animals are'} in their new paddock. Make sure it has water and feed!`);
    }
    /* ---------- task series (build rule, 2026-11-11): the barn's things carried out to the paddocks and back. Each
       is a run of steps (village.js steps): the stock changes in a step of its own, so stopping halfway (a tap
       somewhere else) puts the bucket or basket back and changes nothing that wasn't done. */
    const barnB = () => V().B.barn;
    const intoPad = side => (side === 'n' ? 0 : side === 's' ? PI : side === 'w' ? PI / 2 : -PI / 2);
    // where to tip feed in a paddock: in front of its hay feeder (inside the paddock), else just inside the gate
    function feedAt(f, pad) {
      const p = f.paddocks.find(q => q.id === pad); if (!p) return null;
      const it = f.items.find(i => i.t === 'feeder' && padOf(f, i.x, i.z) === p);
      if (it) { const hd = ITEMS.feeder.fp[1] / 2 + 0.95, front = it.z + hd < p.z1 - 0.6; return { x: it.x, z: front ? it.z + hd : it.z - hd, yaw: front ? PI : 0 }; }
      const g = gateOf(p), q = outside(g, -2.4); return { x: q[0], z: q[1], yaw: intoPad(g.side) };
    }
    function feedSeries(s, need) {
      const f = F(), Bn = barnB(); if (!Bn || !c.steps) return false;
      const A = Bn.at, P = Bn.parts, dest = feedAt(f, s.pad); if (!dest) return false;
      const grains = Object.keys(need).filter(k0 => k0 !== 'hay' && P['lid_' + k0]), L = [];
      const tip = k0 => ({ run: () => { f.feed[k0] = Math.max(0, (f.feed[k0] || 0) - need[k0]); save(); } });
      if (grains.length) {
        L.push({ go: A.hooks }, { take: P.bucket, hold: 'bucket0' });
        for (const k0 of grains) L.push({ go: A[k0] }, { open: P['lid_' + k0], rz: 1.25, secs: 0.55 }, { act: 'fetch', secs: 1.0, tool: 'scoop', sound: 'pat' }, { act: 'fetch', secs: 1.0, tool: 'scoop', fx: { kind: 'dust', dist: 0.55, y: 0.95, rate: 10 } }, { hold: 'bucket' }, { close: P['lid_' + k0], secs: 0.45 });
        L.push({ go: dest }, { act: 'feed', secs: 2.4, fx: { kind: 'dust', dist: 0.9, y: 0.6, rate: 14 } }, ...grains.map(tip), { hold: 'bucket0' }, { go: A.hooks }, { put: P.bucket });
      }
      if (need.hay) L.push({ go: A.hay }, { act: 'fetch', secs: 1.5, fx: { kind: 'hay', dist: 0.6, y: 0.8, rate: 10 } }, { hold: 'hayflake' }, { go: dest }, { act: 'feed', secs: 2.2, fx: { kind: 'hay', dist: 0.9, y: 0.5, rate: 14 } }, tip('hay'), { hold: null });
      L.push({ run: () => { f.fed[s.pad] = today(); save(); for (const a of V().B.animals) if (a.rec && a.rec.pad === s.pad) c.float({ pos: a.group.position }, '❤️'); c.sound('tune'); c.toast(`Fed! (${Object.entries(need).map(([k0, n]) => `${n} ${FEED[k0].name.toLowerCase()}`).join(', ')})`); } });
      c.steps(L, { name: 'Feeding the animals', cancel: why => { if (why === 'blocked') c.toast('Can’t get there from here.'); } }); return true;
    }
    // eggs: the basket off its hook in the barn, the nest box's lid up, each egg picked, the lid down, the eggs into
    // the egg fridge by the barn door, the basket hung back up
    function eggSeries(s, n, apply) {
      const Bn = barnB(), v = V(), it = F().items.find(i => i.id === s.item); if (!Bn || !c.steps || !it) return false;
      const A = Bn.at, P = Bn.parts, lid = v.B.models[s.item] && v.B.models[s.item].userData.lid, ry = it.ry || 0;
      const nest = { x: it.x + 2.75 * Math.cos(ry) - 0.1 * Math.sin(ry), z: it.z - 2.75 * Math.sin(ry) - 0.1 * Math.cos(ry), yaw: -PI / 2 + ry };
      const picks = []; for (let i = 0; i < Math.min(n, 4); i++) picks.push({ act: 'fetch', secs: 0.85, fx: { kind: 'sparkle', dist: 0.5, y: 1.25, rate: 5, delay: 0.4 } });
      c.steps([{ go: A.hooks }, { take: P.basket, hold: 'basket0' }, { go: nest }, lid && { open: lid, rz: 1.15, secs: 0.6 }, ...picks, { hold: 'basket' }, lid && { close: lid, secs: 0.5 },
        { go: A.fridge }, { open: P.fridgeDoor, ry: 1.45, secs: 0.5 }, { act: 'place', secs: 1.4 }, { run: apply }, { hold: 'basket0' }, { close: P.fridgeDoor, secs: 0.45 }, { go: A.hooks }, { put: P.basket }],
      { name: 'Collecting the eggs', cancel: why => { if (why === 'blocked') c.toast('Can’t get there from here.'); } });
      return true;
    }
    /* milking and shearing (the sheds): the pail or the shears off their hook, out to the paddock, one of the animals
       led in through its gate and across to the shed, up onto the stand or the board, milked or shorn, led home and
       let go inside its gate, then the milk poured into the vat (the pail rinsed at the sink) or the fleece thrown
       on the wool table and pressed; the pail or the shears hung back up. One animal goes for the lot. */
    function shedSeries(s, what, ok, n, apply) {
      const v = V(), Bw = v.B.sheds && v.B.sheds[s.item]; if (!Bw || !c.steps) return false;
      const a = ok.find(x => v.B.animals.some(m => m.rec && m.rec.id === x.id)), m = a && v.B.animals.find(q => q.rec && q.rec.id === a.id); if (!m) return false;
      const p = F().paddocks.find(q => q.id === a.pad); if (!p) return false;
      const g = gateOf(p), gin = outside(g, -2.0), gout = outside(g, 1.8), A = Bw.at, P = Bw.parts;
      const at2 = (q, yaw) => ({ x: q[0], z: q[1], yaw });
      const lead = () => { m.follow = 1; m.hold = null; m.st = null; }, stay = pt => { m.follow = 0; m.hold = pt; }, free = () => { m.follow = 0; m.hold = null; m.st = null; };
      const there = pt => () => Math.hypot(m.group.position.x - pt.x, m.group.position.z - pt.z) < 0.25;
      const home = () => { free(); const pen = m.pen; if (pen && !(m.group.position.x > pen[0] - 1 && m.group.position.x < pen[2] + 1 && m.group.position.z > pen[1] - 1 && m.group.position.z < pen[3] + 1)) m.group.position.set((pen[0] + pen[2]) / 2, 0, (pen[1] + pen[3]) / 2); };
      const fetchIt = [{ go: at2(gout, intoPad(g.side)) }, { go: at2(gin, intoPad(g.side)) }, { act: 'pat', secs: 1.0, then: lead, say: undefined }];
      const takeHome = [{ run: lead }, { go: A.door }, { go: at2(gout, intoPad(g.side)) }, { go: at2(gin, intoPad(g.side)) }, { until: () => Math.hypot(m.group.position.x - gin[0], m.group.position.z - gin[1]) < 2.2, max: 8 }, { run: free }, { wait: 0.6 }];
      const L = what === 'milk'
        ? [{ go: A.pail }, { take: P.pail, hold: 'pail' }, ...fetchIt, { go: A.door }, { go: A.milk }, { run: () => stay(A.stand) }, { until: there(A.stand), max: 10 }, { wait: 0.4 }, { act: 'feed', secs: 1.2, sound: 'pat' }, { act: 'feed', secs: 3.0, fx: { kind: 'milk', dist: 0.55, y: 0.55, rate: 20 } },
          ...takeHome, { go: A.vat }, { open: P.vatLid, rx: -1.3, secs: 0.5 }, { act: 'feed', secs: 1.8, fx: { kind: 'milk', dist: 0.6, y: 1.0, rate: 22 } }, { run: apply }, { close: P.vatLid, secs: 0.4 }, { go: A.sink }, { act: 'dishes', secs: 1.6, fx: { kind: 'splash', dist: 0.55, y: 0.85, rate: 10 } }, { go: A.pail }, { put: P.pail }]
        : [{ go: A.shears }, { take: P.shears, hold: 'shears' }, ...fetchIt, { go: A.door }, { go: A.penGate }, { run: () => stay(A.pen) }, { until: there(A.pen), max: 10 }, { go: A.shear }, { run: () => stay(A.board) }, { until: there(A.board), max: 10 }, { wait: 0.4 },
          { act: 'chop', secs: 2.2, fx: { kind: 'wool', dist: 0.7, y: 0.6, rate: 16 } }, { act: 'chop', secs: 2.2, fx: { kind: 'wool', dist: 0.7, y: 0.4, rate: 16 } }, { act: 'fetch', secs: 1.0, then: j => { j.held = 'fleece'; if (v.kid.inst) v.kid.inst.holding = 'fleece'; } },
          ...takeHome, { go: A.table }, { act: 'place', secs: 1.2 }, { hold: null }, { act: 'fetch', secs: 1.2, fx: { kind: 'wool', dist: 0.6, y: 1.0, rate: 8 } }, { go: A.press }, { open: P.lever, rz: -0.7, secs: 0.6 }, { close: P.lever, secs: 0.6 }, { open: P.lever, rz: -0.7, secs: 0.6 }, { close: P.lever, secs: 0.6 }, { run: apply }, { go: A.shears }, { put: P.shears }];
      c.steps(L, { name: what === 'milk' ? 'Milking' : 'Shearing', cancel: why => { home(); if (why === 'blocked') c.toast('Can’t get there from here.'); } });
      return true;
    }
    function feedPad(s) {
      const f = F(), L = f.animals.filter(a => a.pad === s.pad); if (!L.length) return c.toast('Nobody lives in this paddock yet. Buy animals at the barn.');
      if ((f.fed[s.pad] || 0) === today()) return c.toast('They’re full. Feed them again tomorrow.');
      const need = {}; for (const a of L) need[ANIMALS[a.kind].eats] = (need[ANIMALS[a.kind].eats] || 0) + 1;
      const short = Object.entries(need).filter(([k, n]) => (f.feed[k] || 0) < n); if (short.length) return c.toast(`Not enough ${short.map(([k]) => FEED[k].name.toLowerCase()).join(' or ')}. Buy feed at the barn.`);
      if (feedSeries(s, need)) return;
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
      v.drive = DR; const k = v.kid; k.path = []; k.pose = 'sitchair'; c.sound('on'); if (sh().farmCharge) sh().farmCharge(5, 'fuel for the tractor');
      for (const kk in KEYS) KEYS[kk] = false; addEventListener('keydown', onKey, true); addEventListener('keyup', onKey, true);
      const el = document.createElement('div'); el.className = 'vg-drive'; DR.el = el;
      el.innerHTML = `<div class="vg-dr-top"><b>🚜</b><span>Hitch:</span><button data-v="farm" data-k="hitch:none" class="on">Nothing</button><button data-v="farm" data-k="hitch:baler">🟢 Baler</button><button data-v="farm" data-k="hitch:trailer">🟫 Trailer</button>${Object.keys(MACHINES).filter(m => (F().implements || {})[m]).map(m => `<button data-v="farm" data-k="hitch:${m}">${MACHINES[m].e} ${MACHINES[m].name}</button>`).join('')}<button data-v="farm" data-k="auto" class="vg-dr-auto">🤖 Auto</button><button data-v="farm" data-k="dout" class="vg-dr-out">Get out</button></div><div class="vg-dr-note" hidden></div>
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
    const seedList = () => (IH.bedOps ? IH.bedOps.crops(F()) : ['carrot']);
    function seedNote() { if (!DR) return; DR.seed = DR.seed || seedList()[0]; const el = DR.el && DR.el.querySelector('.vg-dr-note'); if (el) { el.hidden = false; el.innerHTML = `Seed: <button data-v="farm" data-k="seed">${IH.bedOps ? IH.bedOps.label(DR.seed) : DR.seed} ▸</button>`; } }
    // Auto with a field machine: along the middle lane of the field block nearest the tractor, then home
    function fieldJob() {
      const L = (F().land || []).filter(b => b.type === 'field'); if (!L.length || !IH.farmLand) return null;
      const near = L.map(b => IH.farmLand.rectOf(b.slot)).sort((p, q) => Math.hypot((p[0] + p[2]) / 2 - DR.x, (p[1] + p[3]) / 2 - DR.z) - Math.hypot((q[0] + q[2]) / 2 - DR.x, (q[1] + q[3]) / 2 - DR.z))[0], z = near[1] + 30;
      return [{ t: 'line', a: [near[0] + 4, z], b: [near[2] - 4, z], say: `${MACHINES[DR.imp.kind].name.toLowerCase()}: working the beds` }, { t: 'goto', goal: { x: TRACTOR_HOME.x, z: TRACTOR_HOME.z, yaw: TRACTOR_HOME.ry, tol: 0.7, ytol: 0.25 }, say: 'parking' }];
    }
    function hitch(kind) {
      if (!DR) return; if (Math.abs(DR.v) > 0.05) return c.toast('Stop first to hitch up.');
      const v = V(); if (DR.imp) { DR.imp.load.forEach((b, i) => dropBale({ x: DR.imp.x - Math.sin(DR.imp.yaw) * (2 + i * 1.4), z: DR.imp.z - Math.cos(DR.imp.yaw) * (2 + i * 1.4), ry: DR.imp.yaw + Math.PI / 2 })); v.B.root.remove(DR.imp.g); DR.imp = null; }
      if (kind !== 'none') { const I = implementModel(kind); I.kind = kind; I.yaw = DR.yaw; I.load = []; I.acc = 0; v.B.root.add(I.g); DR.imp = I; placeImp(0); c.sound('place'); DR.worked = new Set(); c.toast(MACHINES[kind] ? `${MACHINES[kind].name} on! ${MACHINES[kind].how}` : kind === 'baler' ? 'Baler on! Drive it over the long grass in the hay meadow.' : 'Trailer on! Drive up to bales to load them, then stop on the track beside the hay yard by the barn.'); if (kind === 'drill') seedNote(); }
      for (const b of DR.el.querySelectorAll('[data-k^="hitch:"]')) b.classList.toggle('on', b.dataset.k === 'hitch:' + kind);
    }
    function placeImp(dist) {
      const I = DR.imp, hx = DR.x - Math.sin(DR.yaw) * 1.75, hz = DR.z - Math.cos(DR.yaw) * 1.75;
      I.yaw += (dist / I.len) * Math.sin(DR.yaw - I.yaw); // (a trailer swings in line behind, the right way going forward or back)
      { const ph = Math.atan2(Math.sin(DR.yaw - I.yaw), Math.cos(DR.yaw - I.yaw)); if (Math.abs(ph) > 1.15) I.yaw = DR.yaw - Math.sign(ph) * 1.15; } // (the drawbar's stop: it can't fold back against the tractor)
      I.x = hx - Math.sin(I.yaw) * I.len; I.z = hz - Math.cos(I.yaw) * I.len; I.g.position.set(I.x, 0, I.z); I.g.rotation.y = I.yaw;
      for (const w of I.wheels) w.rotation.x += dist / I.r;
    }
    function blocked(x, z, yaw) {
      const v = V(), B = v.B, c0 = Math.cos(yaw), s0 = Math.sin(yaw);
      for (const [lx, lz] of [[-1.15, 2.05], [1.15, 2.05], [-1.2, -1.45], [1.2, -1.45], [0, 2.1], [-1.2, 0.4], [1.2, 0.4]]) {
        const px = x + lx * c0 + lz * s0, pz = z - lx * s0 + lz * c0; if (B.onLand ? !B.onLand(px, pz, 0.6) : (px < 0.6 || pz < 0.6 || px > W - 0.6 || pz > D - 0.6)) return true; // (the edge of the land: the paddock and its blocks)
        if (B.solids.some((r, i) => i !== DR.veh.solid && px > r[0] && px < r[2] && pz > r[1] && pz < r[3])) return true;
      }
      return false;
    }
    // how far into things it is: the footprint points that are inside something, and how deep the deepest is
    function depth(x, z, yaw) {
      const B = V().B, c0 = Math.cos(yaw), s0 = Math.sin(yaw); let d = 0;
      for (const [lx, lz] of [[-1.15, 2.05], [1.15, 2.05], [-1.2, -1.45], [1.2, -1.45], [0, 2.1], [-1.2, 0.4], [1.2, 0.4]]) {
        const px = x + lx * c0 + lz * s0, pz = z - lx * s0 + lz * c0;
        if (B.onLand ? !B.onLand(px, pz, 0.6) : (px < 0.6 || pz < 0.6 || px > W - 0.6 || pz > D - 0.6)) d += 0.3;
        for (let i = 0; i < B.solids.length; i++) { if (i === DR.veh.solid) continue; const r = B.solids[i]; if (px > r[0] && px < r[2] && pz > r[1] && pz < r[3]) d += Math.min(px - r[0], r[2] - px, pz - r[1], r[3] - pz); }
      }
      return d;
    }
    // stopped beside the hay yard: the bales come off one by one and are stood up in the yard's lines and stacks
    function unload(I) {
      const v = V(), f = F(), n = I.load.length, have = Math.floor((f.feed.hay || 0) / 6);
      I.load.forEach((b, k) => {
        const w = new T.Vector3(); b.g.getWorldPosition(w); b.g.parent.remove(b.g);
        const i = have + k, s = i < YARD_CAP ? yardSlot(i) : { x: 12, y: 0, z: 10.2 }, m = baleUp(); m.position.copy(w); v.B.root.add(m);
        v.B.flights.push({ g: m, a: { x: w.x, y: w.y - 0.6, z: w.z }, b: s, ry: (i * 1.7) % 6.28, delay: k * 0.55, done: () => { f.feed.hay = (f.feed.hay || 0) + 6; save(); c.sound('place'); c.fx('hay', s.x, s.y + 1.1, s.z, 5); } }); v.B.flying++;
      });
      I.load = []; if (AP) AP.did = true; save(); c.xp(); c.sound('buy');
      c.toast(`${n} bale${n === 1 ? '' : 's'} stacked by the barn: ${n * 6} hay for your animals! 🌾`);
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
      if (!moved && Math.abs(dist) > 1e-5) {
        // a glancing touch slides along the fence or edge (the part of the move that isn't into it); head on, it stops
        const dx = nx - DR.x, dz = nz - DR.z, want = Math.hypot(dx, dz); let best = null;
        for (const [px, pz, py] of [[nx, DR.z, yaw2], [DR.x, nz, yaw2], [nx, DR.z, DR.yaw], [DR.x, nz, DR.yaw]]) { const got = Math.hypot(px - DR.x, pz - DR.z); if (got > want * 0.35 && (!best || got > best[3]) && !blocked(px, pz, py)) best = [px, pz, py, got]; }
        if (best) { DR.x = best[0]; DR.z = best[1]; DR.yaw = best[2]; moved = Math.sign(dist) * best[3]; DR.v = Math.sign(dist) * Math.min(Math.abs(target), best[3] / dt) * 0.8; DR.blockT = 0; }
      }
      // the wheels: the back ones roll, the front ones roll and steer
      for (const w of DR.veh.rear) w.rotation.x += moved / R_REAR; for (const w of DR.veh.front) w.rotation.x += moved / R_FRONT; for (const p of DR.veh.pivots) p.rotation.y = DR.steer;
      const sp = Math.abs(DR.v); DR.m.position.set(DR.x, Math.sin(t * 17) * 0.012 * Math.min(1, sp), DR.z); DR.m.rotation.set(Math.sin(t * 11) * 0.006 * sp, DR.yaw, Math.sin(t * 9) * 0.006 * sp);
      // the kid in the seat, the camera with them; smoke from the stack, dust off the back wheels
      c.seatKid(DR.m, TRACTOR_SEAT, 0); k.pos.set(DR.x, 0, DR.z); k.yaw = DR.yaw;
      DR.smoke -= dt; if (DR.smoke < 0) { DR.smoke = thr ? 0.12 : 0.6; const c0 = Math.cos(DR.yaw), s0 = Math.sin(DR.yaw); c.fx('smoke', DR.x + 0.42 * c0 + 1.4 * s0, 3.0, DR.z - 0.42 * s0 + 1.4 * c0, 1); }
      if (sp > 2 && Math.random() < dt * 8) c.fx('dust', DR.x - Math.sin(DR.yaw) * 1.4 + (Math.random() - 0.5) * 2, 0.1, DR.z - Math.cos(DR.yaw) * 1.4, 1);
      if (!DR.imp) return; placeImp(moved); const I = DR.imp;
      // the baler: over the long grass it picks it up, cuts it and, every so often, a round bale rolls out the back
      const Mh = I.kind === 'baler' && moved > 0 && (!AP || AP.pickup) ? (v.B.meadows || []).find(q => I.x > q.rect[0] && I.x < q.rect[2] && I.z > q.rect[1] && I.z < q.rect[3]) : null;
      if (Mh) {
        const R0 = Mh.rect; let n = 0;
        for (let i = Math.floor(I.x - 1.3); i <= Math.floor(I.x + 1.3); i++) for (let j = Math.floor(I.z - 0.8); j <= Math.floor(I.z + 0.8); j++) { if (i < R0[0] || i >= R0[2] || j < Math.ceil(R0[1]) || j >= R0[3]) continue; const key = Mh.key(i, j); if (Mh.cells[key] || Math.hypot(i + 0.5 - I.x, j + 0.5 - I.z) > 1.3) continue; Mh.cells[key] = 1; n++; if (Mh.L) IH.lawnKit.cutAt(Mh.L, i + 0.5, j + 0.5, 0.75); }
        if (n) { I.acc += n; Mh.mark(); c.fx('hay', I.x + Math.sin(I.yaw) * 1.0, 0.4, I.z + Math.cos(I.yaw) * 1.0, Math.min(4, n)); }
        if (I.acc >= 30) { I.acc -= 30; dropBale({ x: I.x - Math.sin(I.yaw) * 1.4, z: I.z - Math.cos(I.yaw) * 1.4, ry: I.yaw + Math.PI / 2 }); c.sound('place'); if (!DR.told) { DR.told = true; c.toast('A bale! Keep going. Then hitch the trailer and bring them to the hay yard by the barn.'); } }
      }
      // the field machines: each bed within reach, once a pass (plough an empty one, sow an empty one, water a planted one)
      if (MACHINES[I.kind] && moved > 0 && IH.bedOps) {
        let n = 0; for (const s0 of v.B.spots) { if (s0.kind !== 'bed' || DR.worked.has(s0.i)) continue; const bxx = s0.hit[0], bzz = s0.hit[1]; if (Math.hypot(bxx - I.x, bzz - I.z) > 6.8) continue;
          const O0 = IH.bedOps; let did = false;
          if (I.kind === 'plough') did = O0.plough(s0.i); else if (I.kind === 'sprayer') did = O0.water(s0.i); else if (I.kind === 'drill' && DR.seed && O0.empty(s0.i)) { if (sh().farmPay(O0.seedCost(DR.seed), `${O0.name(DR.seed)} seed`)) did = O0.plant(s0.i, DR.seed); }
          DR.worked.add(s0.i); if (did) { n++; c.fx(I.kind === 'sprayer' ? 'drops' : 'soil', bxx, 0.9, bzz, 6); } }
        if (n) { if (AP) AP.did = true; IH.bedOps.redraw(); c.sound('pop'); }
      }
      // the trailer: bales it comes up against are loaded on (four at most); at the barn they're unloaded into the hay store
      if (I.kind === 'trailer') {
        if (I.load.length < 4) for (let i = v.B.bales.length - 1; i >= 0; i--) { const b = v.B.bales[i]; if (Math.hypot(b.g.position.x - I.x, b.g.position.z - I.z) < 2.1 && I.load.length < 4) { v.B.bales.splice(i, 1); f.bales.splice(f.bales.indexOf(b.rec), 1); v.B.root.remove(b.g); const m = baleModel(); m.scale.setScalar(0.8); m.position.set((I.load.length % 2 ? 0.5 : -0.5), 0, I.load.length < 2 ? 0.5 : -0.6); m.rotation.y = Math.PI / 2; I.load.push({ g: m }); I.g.children[I.g.children.length - 1].add(m); save(); c.sound('pop'); c.fx('hay', I.x, 1.2, I.z, 6); } }
        if (I.load.length && Math.hypot(I.x - YARD_DROP.x, I.z - YARD_DROP.z) < 3.2 && Math.abs(DR.v) < 0.6) unload(I);
      }
    }
    /* ---------- auto: the kid does the hay job alone, driving the same tractor the same way (pedal, wheel, the
       turning circle). The route planner (tractor-plan.js) finds every way round: clear of fences, posts and the
       edge (the baler or trailer too), swinging wide at corners, and where there's no room to turn it scans the
       open ground nearby for a three-point turn. The meadow's baled in straight, evenly spaced rows parallel to
       its long hedge, back and forth with the pickup up on the turns (so the cut stays in tidy lines), then the
       headland strips along the hedge ends; then trailer on, bales collected four at a time and hauled to the
       barn, as many trips as it takes, and the tractor parked back by the barn. Steering by pure pursuit
       (a point a little ahead on the planned way, the wheel turned to arc onto it), reversing too; bumping
       something or drifting off the way, it stops and plans again from where it is. */
    let AP = null;
    const TP = () => IH.tractorPlan;
    const note = s0 => { const el = DR && DR.el && DR.el.querySelector('.vg-dr-note'); if (el) { el.hidden = !s0; el.textContent = s0 || ''; } };
    const rearOf = () => [DR.x - Math.sin(DR.yaw) * 0.62, DR.z - Math.cos(DR.yaw) * 0.62];
    const stop = () => ({ thr: 0, st: DR.steer / 0.62, vmax: 1 }); // (off the pedal: it rolls to a stand, the wheel left where it is)
    // the rows: parallel to the meadow's long (south) hedge, evenly spaced a baler's width apart (a little overlap)
    // which meadow Auto bales: the one the tractor's in or nearest (the paddock's own, or a block's), and how much of it is still long
    const meadowOf = () => { const ms = V().B.meadows || []; let best = ms[0], bd = 1e9; for (const q of ms) { const r = q.rect, dx = Math.max(r[0] - DR.x, 0, DR.x - r[2]), dz = Math.max(r[1] - DR.z, 0, DR.z - r[3]), d = Math.hypot(dx, dz); if (d < bd) { bd = d; best = q; } } return best; };
    const meadowLeft = Mq => { const M = Mq.rect; let cut = 0, all = 0; for (let i = M[0]; i < M[2]; i++) for (let j = Math.ceil(M[1]); j < M[3]; j++) { all++; if (Mq.cells[Mq.key(i, j)]) cut++; } return (all - cut) / all; };
    // auto does the job of whatever's on the hitch: the baler bales the meadow, the trailer brings the bales in
    function balerJob(M) {
      const legs = [], z0 = M[3] - 1.3, z1 = M[1] + 1.6, N = Math.max(2, Math.ceil((z0 - z1) / 2.4) + 1), gap = (z1 - z0) / (N - 1); // (from the far hedge back, so each turn swings out into open ground)
      for (let i = 0; i < N; i++) { const z = z0 + gap * i, west = i % 2 === 0; legs.push({ t: 'line', a: west ? [M[2] - 8, z] : [M[0] + 7, z], b: west ? [M[0] + 0.8, z] : [M[2] + 0.4, z], say: `baling row ${i + 1} of ${N + 2}` }); }
      // the headlands: the strips the rows' turns left, cut along the end hedge and the open end
      // (along the open end, the same spacing, each run south up to the far hedge, then backed straight out)
      [M[2] - 3.4, M[2] - 1.05].forEach((x, i) => legs.push({ t: 'line', a: [x, M[1] + 1.0], b: [x, M[3] - 2.55], say: `baling row ${N + i + 1} of ${N + 2} (the headland)` }, { t: 'back', d: 5, say: 'backing out from the hedge' }));
      legs.push({ t: 'goto', goal: { x: TRACTOR_HOME.x, z: TRACTOR_HOME.z, yaw: TRACTOR_HOME.ry, tol: 0.7, ytol: 0.25 }, say: 'parking' });
      return legs;
    }
    function autoStart() {
      if (!DR) return; if (AP) return autoStop('Auto off.');
      if (!TP()) return c.toast('Auto isn’t ready yet.');
      const kind = DR.imp && DR.imp.kind, v = V();
      if (!kind) return c.toast('Hitch the baler (to bale the meadow) or the trailer (to bring the bales in), then press Auto.');
      const FJ = MACHINES[kind] ? fieldJob() : null; if (MACHINES[kind] && !FJ) return c.toast('There’s no field block to work. Buy one with Plan → Land.'); if (MACHINES[kind]) DR.worked = new Set();
      const MQ = meadowOf(); if (kind === 'baler' && meadowLeft(MQ) < 0.08) return c.toast('This meadow’s all cut. It grows back in a couple of days.');
      if (kind === 'trailer' && !v.B.bales.length && !DR.imp.load.length) return c.toast('No bales to bring in. Bale the meadow first.');
      AP = { job: kind, legs: FJ || (kind === 'baler' ? balerJob(MQ.rect) : [{ t: 'collect' }]), leg: null, home: { x: TRACTOR_HOME.x, z: TRACTOR_HOME.z, yaw: TRACTOR_HOME.ry }, G: TP().grid(v.B.solids, v.B.bounds.x1 - v.B.bounds.x0, v.B.bounds.z1 - v.B.bounds.z0, DR.veh.solid, 0.6, { x0: v.B.bounds.x0, z0: v.B.bounds.z0, land: v.B.onLand }), skip: new Set(), tried: new Map(), pickup: false, stuck: 0 };
      const b = DR.el.querySelector('.vg-dr-auto'); if (b) { b.classList.add('on'); b.textContent = '🤖 Stop'; }
      c.toast(kind === 'baler' ? 'Auto: watch them bale the meadow! Push the joystick to take over.' : 'Auto: watch them bring the bales in! Push the joystick to take over.'); c.sound('on');
    }
    // stopped on the track beside the hay yard, heading for the barn end (the trailer alongside the yard)
    const haul = say => ({ t: 'goto', goal: { x: YARD_DROP.x - 4.1, z: YARD_DROP.z + 0.2, yaw: -Math.PI / 2, tol: 0.8, ytol: 0.3 }, say, vmax: 3.2 });
    function autoStop(words) { AP = null; note(''); const b = DR && DR.el && DR.el.querySelector('.vg-dr-auto'); if (b) { b.classList.remove('on'); b.textContent = '🤖 Auto'; } if (words) c.toast(words); }
    const lenOf = () => (DR.imp ? DR.imp.len : 0);
    // start planning a way from here to a pose
    function goto(L) {
      const g = L.goal; L.search = TP().plan(AP.G, { x: DR.x, z: DR.z, yaw: DR.yaw, iyaw: DR.imp ? DR.imp.yaw : DR.yaw, len: lenOf() }, g, { m: L.tries ? 0.22 : 0.45, max: L.tries ? 50000 : 25000 }); L.segs = null;
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
      if (!L.search.done) { L.search.step(2500); return stop(); }
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
    // a straight run interrupted part way: pick it up again from the nearest point on the line (not where the
    // tractor's wandered to); if there's hardly any left, leave it
    function resume(L) {
      const dx = L.b[0] - L.a[0], dz = L.b[1] - L.a[1], LL = Math.hypot(dx, dz) || 1, u = Math.max(0, Math.min(1, ((DR.x - L.a[0]) * dx + (DR.z - L.a[1]) * dz) / (LL * LL)));
      if ((1 - u) * LL < 5) { L.skip = true; return; }
      L.a = [L.a[0] + dx * u, L.a[1] + dz * u];
    }
    function bumped(t) { return DR.blockT && t - DR.blockT < 0.12; }
    function autopilot(t, dt) {
      void dt; const v = V();
      if (!AP.leg) { AP.leg = AP.legs.shift(); if (!AP.leg && AP.job === 'trailer' && DR.imp && DR.imp.load.length) { AP.legs.push(haul('one more load to the hay yard'), { t: 'goto', goal: { x: AP.home.x, z: AP.home.z, yaw: AP.home.yaw, tol: 0.7, ytol: 0.25 }, say: 'parking' }); AP.leg = AP.legs.shift(); } if (!AP.leg) { const did = AP.did, job = AP.job; autoStop(''); if (did) { c.toast(job === 'baler' ? 'Baling done! Hitch the trailer and press Auto to bring the bales in. 🌾' : MACHINES[job] ? `${MACHINES[job].e} Done: the beds in that field are worked.` : 'All done! Every bale’s stacked by the barn. 🌾'); c.sound('buy'); } else c.toast(AP.fails ? 'Auto: I couldn’t find a way from here. Drive out into the open and try again.' : 'Nothing left to do.'); return stop(); } }
      const L = AP.leg; AP.pickup = false;
      if (bumped(t) && t > (AP.bumpT || 0) && L.t !== 'back') {
        // bumped something: ease off it the other way, then plan again from there
        AP.bumpT = t + 1; AP.stuck++; if (AP.stuck > 8) { autoStop(''); c.toast('Auto: I’m stuck. Can you drive me out?'); return stop(); }
        if (L.go) { L.go.search = null; L.go.tries = 0; } if (L.search !== undefined) { L.search = null; L.tries = 0; } if (L.t === 'line') { L.go = null; if (L.lined) { L.lined = false; resume(L); } }
        AP.legs.unshift(L); AP.leg = { t: 'back', d: 1.6, sign: AP.lastDir < 0 ? 1 : -1, say: 'easing off' }; return stop();
      }
      const next = () => { AP.leg = null; AP.stuck = 0; return stop(); }, fail = () => { autoStop(''); c.toast('Auto: I can’t find a way there. Can you drive a bit and try again?'); return stop(); };
      if (L.t === 'wait') { note('Auto: ' + L.say); if (L.t0 == null) L.t0 = t; return t - L.t0 > L.s ? next() : stop(); }
      if (L.t === 'hitch') { if (Math.abs(DR.v) > 0.05) return stop(); if (!DR.imp || DR.imp.kind !== L.kind) hitch(L.kind); return next(); }
      if (L.t === 'goto') { if (L.say) note('Auto: ' + L.say); const r = runGoto(t, L, L.vmax || 3.0); if (r === 'fail') { AP.fails = (AP.fails || 0) + 1; if (L.bale) { afterGoto(L); return next(); } if ((L.unstick || 0) < 3) { L.unstick = (L.unstick || 0) + 1; L.search = null; L.tries = 0; AP.legs.unshift(L); AP.leg = { t: 'back', d: 3, sign: L.unstick % 2 ? 1 : -1, say: 'straightening up to try again' }; return stop(); } return fail(); } if (r) return r; afterGoto(L); return next(); }
      if (L.t === 'line') {
        // a straight run: first get lined up on its start (planned), then drive it dead straight with the pickup down
        if (L.skip) return next();
        note('Auto: ' + L.say);
        const yaw = Math.atan2(L.b[0] - L.a[0], L.b[1] - L.a[1]);
        if (!L.go) L.go = { goal: { x: L.a[0], z: L.a[1], yaw, tol: 0.4, ytol: 0.1, htol: 0.5, dir: 1 } };
        if (!L.lined) { const r = runGoto(t, L.go, 3.0); if (r === 'fail') { AP.fails = (AP.fails || 0) + 1; if (!L.tries2) { L.tries2 = 1; L.go = null; L.a = [L.a[0] + Math.sin(yaw) * 1.5, L.a[1] + Math.cos(yaw) * 1.5]; return stop(); } return next(); } if (r) return r; L.lined = true; const ra = [DR.x - Math.sin(DR.yaw) * 0.62, DR.z - Math.cos(DR.yaw) * 0.62], len = Math.hypot(L.b[0] - ra[0], L.b[1] - ra[1]), pts = []; for (let s = 0; s <= len; s += 0.4) pts.push([ra[0] + Math.sin(yaw) * s, ra[1] + Math.cos(yaw) * s]); pts.push([L.b[0] - Math.sin(yaw) * 0.62, L.b[1] - Math.cos(yaw) * 0.62]); L.seg = { dir: 1, pts, k: 0 }; }
        AP.pickup = true; AP.did = true; const r = track(t, L.seg, 2.6);
        if (r === 'off') { L.lined = false; L.go = null; resume(L); return stop(); }
        return r || next();
      }
      if (L.t === 'back') {
        // straight back the way it came (the towed thing stays in line going straight back)
        note('Auto: ' + L.say);
        if (!L.seg) { const [rx, rz] = rearOf(), sg = L.sign || -1, pts = []; for (let s0 = 0; s0 <= L.d; s0 += 0.4) pts.push([rx + sg * Math.sin(DR.yaw) * s0, rz + sg * Math.cos(DR.yaw) * s0]); L.seg = { dir: sg, pts, k: 0 }; L.t0 = t; }
        if (bumped(t) && t - L.t0 > 0.3) return next();
        if (DR.imp && (L.sign || -1) < 0 && t - L.t0 > 0.3 && Math.abs(Math.sin((DR.yaw - DR.imp.yaw) / 2)) > Math.sin(0.35)) return next(); // (backing, the towed thing starting to swing: stop there)
        const r = track(t, L.seg, 1.2); if (r === 'off') return next(); return r || next();
      }
      if (L.t === 'collect') {
        const I = DR.imp, inM = b => (v.B.meadows || []).some(q => { const M = q.rect; return b.g.position.x > M[0] - 2 && b.g.position.x < M[2] + 3 && b.g.position.z > M[1] - 2 && b.g.position.z < M[3] + 1; });
        const left = v.B.bales.filter(b => inM(b) && !AP.skip.has(b));
        if (!I || I.kind !== 'trailer') return next();
        if (I.load.length >= 4 || (!left.length && I.load.length)) { AP.legs.unshift(haul('taking the bales to the hay yard'), { t: 'wait', s: 0.6 * I.load.length + 0.6, say: 'stacking the bales' }, { t: 'collect' }); return next(); }
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
    const atCounter = (s, f) => () => c.walkTo(s.at[0], s.at[1], ok => ok && f(), s.yaw);
    const acts = {
      fshop: s => [{ e: '🐮', label: 'Buy animals', run: atCounter(s, () => shop('animals')) }, { e: '🌾', label: 'Buy feed', run: atCounter(s, () => shop('feed')) }, { e: '🚜', label: 'Buy machines', run: atCounter(s, () => shop('machines')) }],
      fplan: s => [{ e: '🛠️', label: 'Farm planner: paddocks, fittings, equipment, land', run: atCounter(s, () => planner()) }],
      fbarn: () => [{ e: '🐮', label: 'Buy animals', run: () => shop('animals') }, { e: '🌾', label: 'Buy feed', run: () => shop('feed') }, { e: '🚜', label: 'Buy machines', run: () => shop('machines') }, { e: '🛠️', label: 'Farm planner: paddocks, fittings, equipment', run: () => planner() }],
      fgate: s => { const f = F(), L = f.animals.filter(a => a.pad === s.pad), p = f.paddocks.find(q => q.id === s.pad); return [{ e: '🌾', label: L.length ? ((f.fed[s.pad] || 0) === today() ? 'Fed today ✓' : `Feed them (${L.length} animal${L.length === 1 ? '' : 's'})`) : 'Nobody lives here yet', run: () => feedPad(s) },
        { e: '📋', label: `Who lives here · ${p ? used(f, p) : 0} / ${p ? Math.floor(area(p)) : 0} room`, run: () => whoPanel(s.pad) },
        ...(L.some(a => (a.neg || 0) >= 3) ? [{ e: '🩺', label: `Call the vet · ✨ ${VET_XP}`, run: () => callVet(s.pad) }] : []),
        ...(MU && MU.ids.size && MU.from !== s.pad ? [{ e: '🐾', label: `Let them in here (${MU.ids.size})`, run: () => letIn(s.pad) }] : MU && MU.ids.size && MU.from === s.pad ? [{ e: '↩️', label: 'Put them back', run: () => stopLeading('Back in their paddock.') }] : L.length ? [{ e: '🐾', label: 'Lead animals to another paddock', run: () => musterPanel(s.pad) }] : [])]; },
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
      tab = tab || 'animals'; const f = F(), info = '✨ farm ' + Math.round(sh().farmAcct().bal).toLocaleString(), pr = xp => sh().cardPrice(xp);
      const tabs = [['animals', '🐮 Animals'], ['feed', '🌾 Feed'], ['machines', '🚜 Machines']].map(([k, l]) => ({ label: l, on: tab === k, attrs: `data-v="farm" data-k="shop:${k}"` }));
      const o = { key: 'fshop:' + tab, title: '🏪 Farm shop', info, tabs, qty: tab !== 'machines' ? sh().qtyBar('farm', 'shop:' + tab) : '' };
      if (tab === 'machines') { const own = f.implements || {}; return c.shopTray({ ...o, note: 'For the tractor’s hitch. Auto runs each one along a field block’s middle lane, working the beds on both sides.',
        cards: Object.entries(MACHINES).map(([k0, m]) => ({ e: m.e, name: m.name, sub: m.about, tag: own[k0] ? '<span class="ih-own">Yours ✓</span>' : pr(m.xp), attrs: `data-v="farm" data-k="mbuy:${k0}"`, off: !!own[k0] })) }); }
      if (tab === 'feed') return c.shopTray({ ...o, note: 'Every animal eats one serving a day.',
        cards: Object.entries(FEED).map(([k, x]) => ({ e: x.e, name: `${x.name} ×${x.n}`, sub: `You have ${f.feed[k] || 0}`, tag: pr(x.xp), attrs: `data-v="farm" data-k="feed:${k}"` })) });
      c.shopTray({ ...o, note: `Pick an animal, then the paddock it lives in.${f.paddocks.length ? '' : ' Build a paddock first (Farm planner).'}`,
        cards: Object.entries(ANIMALS).map(([k, a]) => ({ e: a.e, name: a.name, sub: `${a.makes ? `${a.n} ${a.makes} every ${a.every === 1 ? 'day' : a.every + ' days'}` : a.about || ''} · room ${a.room}`, tag: pr(a.xp), attrs: `data-v="farm" data-k="pick:${k}"` })) });
    }
    function pickPad(kind) {
      const f = F(), a = ANIMALS[kind];
      c.shopTray({ key: 'pick', title: `${a.e} Which paddock?`, info: `✨ ${a.xp} each`, qty: sh().qtyBar('farm', 'pick:' + kind), go: '<button class="ih-trgo" data-v="farm" data-k="shop:animals">‹ Animals</button>',
        note: `A ${a.name.toLowerCase()} needs ${a.room} room${a.needs && /coop|pond|sty/.test(a.needs) ? ` and a ${ITEMS[a.needs].name.toLowerCase()}` : ''}.`,
        cards: f.paddocks.map((p, i) => { const free = Math.floor(area(p)) - used(f, p), who = f.animals.filter(x => x.pad === p.id).map(x => ANIMALS[x.kind].e).join('');
          return { e: '🟩', name: `Paddock ${i + 1}`, sub: `${free} room left${who ? ' · ' + who : ''}${a.needs && /coop|pond|sty/.test(a.needs) && !hasIn(f, p.id, a.needs) ? ` · no ${ITEMS[a.needs].name.toLowerCase()} yet` : ''}${hasIn(f, p.id, 'trough') ? '' : ' · no water yet'}`, tag: free < a.room ? '<span class="ih-lock">Full</span>' : '<span class="ih-price">Put here</span>', attrs: `data-v="farm" data-k="buy:${kind}:${p.id}"`, off: free < a.room }; }),
        empty: 'No paddocks yet. Build one in the Farm planner first.' });
    }
    function buyAnimal(kind, pad) {
      const f = F(), a = ANIMALS[kind], p = f.paddocks.find(q => q.id === pad); if (!a || !p || Math.floor(area(p)) - used(f, p) < a.room) return;
      const n = Math.max(1, sh().qtyN(Math.min(Math.floor((Math.floor(area(p)) - used(f, p)) / a.room), Math.floor((sh().farmAcct().bal + sh().wallet().left) / a.xp))));
      if (!sh().farmPay(a.xp * n, n > 1 ? `${n} ${a.name.toLowerCase()}s` : 'a ' + a.name.toLowerCase())) return;
      for (let q = 0; q < n; q++) f.animals.push({ id: nid(), kind, pad, got: 0 }); save(); c.xp(); c.toast(n > 1 ? `Welcome to the farm, ${n} ${a.name.toLowerCase()}s! ${a.e}` : `Welcome to the farm, ${a.name.toLowerCase()}! ${a.e}`); reload();
    }

    /* ---------- the farm planner: paddocks (two taps for the corners), fittings and equipment (pick, then tap
       where), moving and selling (tap a thing). Each change is paid for, saved, and the farm rebuilt. */
    let P = null;
    const preview = new T.Group();
    function planner(mode) {
      P = P || { mode: 'menu' }; if (mode) P.mode = mode; V().plan = P; const f = F(), w = 'farm ' + Math.round(sh().farmAcct().bal).toLocaleString();
      const head = `<div class="vg-gh"><b>🛠️ Farm planner</b><span>✨ ${w}</span><button class="vg-x" data-v="farm" data-k="pclose" aria-label="Done">✕</button></div>`;
      const tabs = `<div class="vg-gb vg-ptabs">${[['land', '🗺️ Land'], ['pad', '🟩 Paddocks'], ['fit', '🏠 Fittings'], ['eq', '🚜 Equipment'], ['drive', '🟫 Driveways'], ['edit', '✋ Move or sell']].map(([k, l]) => `<button data-v="farm" data-k="mode:${k}" class="${P.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
      let body = '<div class="vg-gq">Lay out your farm. Pick what to do.</div>';
      if (P.mode === 'pad') body = `<div class="vg-gq">${P.cand ? (P.cand.bad ? `${esc(P.cand.bad)} Tap a new first corner.` : 'Build this paddock?') : P.a ? 'Now tap the opposite corner.' : `Tap one corner of the new paddock on the grass, then the opposite corner. Fencing costs ✨ ${FENCE_XP} a metre (two tiles).`}</div>${P.cand && !P.cand.bad ? `<div class="vg-gb vg-go"><button data-v="farm" data-k="padok"><span class="e">✅</span>Build it · ✨ ${P.cand.xp}</button><button data-v="farm" data-k="padno">Cancel</button></div>` : ''}`;
      if (P.mode === 'fit' || P.mode === 'eq') body = `<div class="vg-gq">${P.t ? `Tap where the ${ITEMS[P.t].name.toLowerCase()} goes${ITEMS[P.t].in ? ' (inside a paddock)' : ITEMS[P.t].in === false ? ' (outside the paddocks)' : ''}. <button class="vg-link" data-v="farm" data-k="rot">↻ Turn it</button>` : P.mode === 'fit' ? 'Things for inside a paddock.' : 'Farm equipment, for outside the paddocks.'}</div>
        <div class="vg-gb vg-mine">${Object.entries(ITEMS).filter(([, d]) => P.mode === 'fit' ? d.in !== false : d.in !== true).map(([t, d]) => `<button data-v="farm" data-k="item:${t}" class="${P.t === t ? 'on' : ''}"><span class="e">${d.e}</span>${d.name} · ✨ ${d.xp}${d.about ? `<small>&nbsp;${esc(d.about)}</small>` : ''}</button>`).join('')}</div>`;
      if (P.mode === 'edit') body = P.sel ? `<div class="vg-gq">${P.sel.kind === 'item' ? `The ${ITEMS[F().items.find(i => i.id === P.sel.id).t].name.toLowerCase()}.` : 'This paddock.'} ${P.moving ? 'Tap where it goes now.' : ''}</div><div class="vg-gb vg-go">${P.sel.kind === 'item' ? '<button data-v="farm" data-k="move"><span class="e">✋</span>Move it</button>' : ''}<button data-v="farm" data-k="sell"><span class="e">🏷️</span>${P.sel.kind === 'item' ? 'Sell it (half back)' : 'Take the fence down (half back)'}</button><button data-v="farm" data-k="desel">Cancel</button></div>` : '<div class="vg-gq">Tap a fitting or a piece of equipment to move or sell it, or the inside of a paddock to take its fence down.</div>';
      if (P.mode === 'land') body = landHtml();
      if (P.mode === 'drive') body = `<div class="vg-gq">${P.cand ? (P.cand.bad ? `${esc(P.cand.bad)} Tap a new first corner.` : `Lay this driveway? ${P.cand.x1 - P.cand.x0} m by ${P.cand.z1 - P.cand.z0} m.`) : P.a ? 'Now tap the far corner.' : `Tap one corner of the driveway, then the far corner. Gravel costs ✨ ${DRIVE_XP} a square metre. To take one up, use Move or sell.`}</div>${P.cand && !P.cand.bad ? `<div class="vg-gb vg-go"><button data-v="farm" data-k="padno">Not now</button><button data-v="farm" data-k="driveok">Lay it · ✨ ${P.cand.xp.toLocaleString()}</button></div>` : ''}`;
      if (P.mode === 'edit' && P.sel && P.sel.kind !== 'item' && P.sel.kind !== 'pad') body = P.sel.kind === 'ftree' ? `<div class="vg-gq">This ${esc(P.sel.name)}. ${P.moving ? 'Tap where it goes now (in its orchard).' : 'Its fruit comes with it.'}</div><div class="vg-gb vg-go"><button data-v="farm" data-k="desel">Leave it</button><button data-v="farm" data-k="tmove"><span class="e">✋</span>Move it</button></div>`
        : `<div class="vg-gq">This driveway.</div><div class="vg-gb vg-go"><button data-v="farm" data-k="desel">Leave it</button><button data-v="farm" data-k="sell"><span class="e">🟫</span>Take it up · ✨ ${Math.round(P.sel.xp / 2)} back</button></div>`;
      if (P.mode === 'edit' && P.sel && P.sel.kind === 'pad') body = body.replace('</div><div class="vg-gb vg-go">', ` ${P.gating ? 'Tap a spot on its fence for the gate.' : ''}</div><div class="vg-gb vg-go"><button data-v="farm" data-k="gmove"><span class="e">🚪</span>Move the gate</button>`);
      if (P.mode === 'fit' || P.mode === 'eq') {
        c.shopTray({ key: 'plan:' + P.mode, title: '🛠️ Farm planner', info: '✨ ' + w, close: 'data-v="farm" data-k="pclose"',
          tabs: [['land', '🗺️ Land'], ['pad', '🟩 Paddocks'], ['fit', '🏠 Fittings'], ['eq', '🚜 Equipment'], ['drive', '🟫 Driveways'], ['edit', '✋ Move or sell']].map(([k, l]) => ({ label: l, on: P.mode === k, attrs: `data-v="farm" data-k="mode:${k}"` })),
          go: P.t ? '<button class="ih-trgo" data-v="farm" data-k="rot">↻ Turn it</button>' : '',
          note: P.t ? `Tap where the ${ITEMS[P.t].name.toLowerCase()} goes${ITEMS[P.t].in ? ' (inside a paddock)' : ITEMS[P.t].in === false ? ' (outside the paddocks)' : ''}.` : P.mode === 'fit' ? 'Things for inside a paddock. Pick one, then tap where it goes.' : 'Farm equipment, for outside the paddocks. Pick one, then tap where it goes.',
          cards: Object.entries(ITEMS).filter(([, d]) => P.mode === 'fit' ? d.in !== false : d.in !== true).map(([t, d]) => ({ e: d.e, name: d.name, sub: d.about || '', tag: sh().cardPrice(d.xp), attrs: `data-v="farm" data-k="item:${t}"`, on: P.t === t })) });
        return drawPreview();
      }
      c.gamePanel(head + tabs + body); drawPreview();
      void f;
    }
    // ---------- land (farm-land.js): the places around the farm, what each costs and what it'd add each week; buying
    // one opens a budget check first. Prices are XP from the farm account (topped up from the wallet if short).
    const FL = () => IH.farmLand;
    function landHtml() {
      const L = FL(); if (!L) return '<div class="vg-gq">Land isn’t ready yet.</div>';
      const f = F(), mine = L.owned(f), n = mine.filter(b => !b.free).length;
      if (P.buy) {
        const slot = P.buy, t = P.ltype || 'field', e = P.ledge || 'hedge', pr = L.price(n), acc = sh().farmAcct().bal, w = sh().wallet().left;
        return `<div class="vg-gq"><b>${L.SLOT_NAME[slot]} block</b> · 52 m by 60 m, joined onto your farm.</div>
          <div class="vg-gq">What will it be?</div><div class="vg-gb vg-mine">${Object.entries(L.TYPES).map(([k, T0]) => `<button data-v="farm" data-k="ltype:${k}" class="${t === k ? 'on' : ''}"><span class="e">${T0.e}</span>${T0.name}<small>&nbsp;${esc(T0.about)}</small></button>`).join('')}</div>
          <div class="vg-gq">Its boundary</div><div class="vg-gb vg-ptabs">${Object.entries(L.EDGES).map(([k, nm]) => `<button data-v="farm" data-k="ledge:${k}" class="${e === k ? 'on' : ''}">${nm}</button>`).join('')}</div>
          <div class="vg-gq vg-budget"><b>Before you buy</b><br>Price: ✨ ${pr.toLocaleString()} XP, from the farm account (✨ ${Math.round(acc).toLocaleString()}), then your wallet (✨ ${Math.round(w).toLocaleString()}) for the rest.<br>Every Monday after: council rates ✨ 15, plus water and power for what's on it.<br>${esc(L.TYPES[t].earns)}${pr > acc + w ? '<br><b>You don’t have enough yet.</b> Save up: sell produce, and do chores and lessons.' : ''}</div>
          <div class="vg-gb vg-go"><button data-v="farm" data-k="lno">Not now</button><button data-v="farm" data-k="lbuy" ${pr > acc + w ? 'disabled' : ''}>Buy it · ✨ ${pr.toLocaleString()}</button></div>`;
      }
      const rows = Object.keys(L.SLOTS).map(slot => {
        const b = mine.find(q => q.slot === slot), T0 = b && L.TYPES[b.type];
        if (b) return `<button data-v="farm" data-k="lsee:${slot}"><span class="e">${T0.e}</span>${L.SLOT_NAME[slot]}: ${T0.name}<small>&nbsp;${L.EDGES[b.edge || 'hedge']}${b.free ? ' · moved from your old island' : ''}</small></button>`;
        if (!L.canHave(f, slot)) return `<button disabled><span class="e">🔒</span>${L.SLOT_NAME[slot]}<small>&nbsp;Buy a block next to it first.</small></button>`;
        return `<button data-v="farm" data-k="lpick:${slot}"><span class="e">🟫</span>${L.SLOT_NAME[slot]} · ✨ ${L.price(n).toLocaleString()}<small>&nbsp;Empty land, 52 m by 60 m.</small></button>`;
      }).join('');
      const sel = P.lsee && mine.find(q => q.slot === P.lsee);
      return `<div class="vg-gq">Grow your farm with blocks of land on its sides. Each costs more than the one before, and each adds rates every Monday. The outlined places are for sale.</div><div class="vg-gb vg-mine">${rows}</div>${sel ? `<div class="vg-gq">Change the ${L.SLOT_NAME[sel.slot].toLowerCase()} block’s boundary (✨ ${L.EDGE_XP} for the work):</div><div class="vg-gb vg-ptabs">${Object.entries(L.EDGES).map(([k, nm]) => `<button data-v="farm" data-k="ledgeset:${k}" class="${(sel.edge || 'hedge') === k ? 'on' : ''}">${nm}</button>`).join('')}</div>` : ''}`;
    }
    function drawPreview() {
      const B = V().B; if (preview.parent !== B.root) B.root.add(preview); while (preview.children.length) preview.remove(preview.children[0]);
      const k = new Kit(); const box = (x0, z0, x1, z1, col) => { for (const [a, b] of [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]]) k.box(Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.2, 0.12, 0.2, (a[0] + b[0]) / 2, 0.08, (a[1] + b[1]) / 2, col, { ry: -Math.atan2(b[1] - a[1], b[0] - a[0]) }); };
      if (P && P.mode === 'land' && FL()) { const f = F(); for (const slot of Object.keys(FL().SLOTS)) if (FL().canHave(f, slot)) { const r = FL().rectOf(slot); box(r[0] + 0.5, r[1] + 0.5, r[2] - 0.5, r[3] - 0.5, P.buy === slot ? '#ffd35a' : '#ffffff'); } }
      if (P && P.a && !P.cand) k.ball(0.35, P.a[0], 0.3, P.a[1], '#ffd35a', { n: 8 });
      if (P && P.cand) box(P.cand.x0, P.cand.z0, P.cand.x1, P.cand.z1, P.cand.bad ? '#ff6b6b' : '#7be08c');
      if (P && P.sel && P.sel.kind === 'ftree') box(P.sel.x - 1.2, P.sel.z - 1.2, P.sel.x + 1.2, P.sel.z + 1.2, '#ffd35a');
      if (P && P.sel && P.sel.kind === 'drive') { const d = (F().drives || []).find(q => q.id === P.sel.id); if (d) box(d.x0, d.z0, d.x1, d.z1, '#ffd35a'); }
      if (P && P.sel) { const f = F(); if (P.sel.kind === 'ftree' || P.sel.kind === 'drive') { /* (above) */ } else if (P.sel.kind === 'item') { const it = f.items.find(i => i.id === P.sel.id), d = ITEMS[it.t]; box(it.x - d.fp[0] / 2 - 0.3, it.z - d.fp[1] / 2 - 0.3, it.x + d.fp[0] / 2 + 0.3, it.z + d.fp[1] / 2 + 0.3, '#ffd35a'); } else { const p = f.paddocks.find(q => q.id === P.sel.id); if (p) box(p.x0, p.z0, p.x1, p.z1, '#ffd35a'); } }
      if (k.parts.length) preview.add(k.build({ shadow: false }));
    }
    // can a rectangle (a paddock, an item's footprint) go here?
    function clear(x0, z0, x1, z1, skip) {
      const onL = V().B.onLand; if (onL ? !(onL(x0, z0, 1) && onL(x1, z1, 1) && onL(x0, z1, 1) && onL(x1, z0, 1)) : (x0 < 1 || z0 < 1 || x1 > W - 1 || z1 > D - 1)) return 'Too near the edge.';
      const hit = r => x0 < r[2] && x1 > r[0] && z0 < r[3] && z1 > r[1];
      if (hit(BARN) || hit([2, 13.8, 4.4, 16.2]) || hit([21.6, 1.6, 23.2, 3.2])) return 'Something’s in the way.';
      if (hit([MEADOW[0] - 1, MEADOW[1] - 1, MEADOW[2] + 1, MEADOW[3] + 1])) return 'That’s the hay meadow.';
      for (const [a, b, cc, d] of TRACK) if (skip !== 'track' && hit([a, b, cc, d])) return 'Keep the track clear.';
      return null;
    }
    function tap(x, z) {
      if (!P) return false; const f = F();
      // a driveway: two corners, whole metres, at least two wide; it can join the track but not a paddock or a thing
      if (P.mode === 'drive') {
        const sx = Math.round(x), sz = Math.round(z);
        if (!P.a || P.cand) { P.a = [sx, sz]; P.cand = null; return planner(), true; }
        const x0 = Math.min(P.a[0], sx), x1 = Math.max(P.a[0], sx), z0 = Math.min(P.a[1], sz), z1 = Math.max(P.a[1], sz);
        let bad = Math.min(x1 - x0, z1 - z0) < 2 ? 'At least two metres wide.' : clear(x0, z0, x1, z1, 'track');
        if (!bad && f.paddocks.some(p => x0 < p.x1 + 0.3 && x1 > p.x0 - 0.3 && z0 < p.z1 + 0.3 && z1 > p.z0 - 0.3)) bad = 'Not through a paddock.';
        if (!bad && f.items.some(it => Math.abs(it.x - (x0 + x1) / 2) < (ITEMS[it.t].fp[0] + x1 - x0) / 2 && Math.abs(it.z - (z0 + z1) / 2) < (ITEMS[it.t].fp[1] + z1 - z0) / 2)) bad = 'Something’s in the way.';
        P.cand = { x0, z0, x1, z1, bad, xp: (x1 - x0) * (z1 - z0) * DRIVE_XP }; if (bad) c.toast(bad); planner(); return true;
      }
      // a paddock's gate: the nearest spot on its fence (not within two metres of a corner)
      if (P.mode === 'edit' && P.gating && P.sel && P.sel.kind === 'pad') {
        const p = f.paddocks.find(q => q.id === P.sel.id); if (!p) return true;
        const d = { n: Math.abs(z - p.z0), s: Math.abs(z - p.z1), w: Math.abs(x - p.x0), e: Math.abs(x - p.x1) }, side = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
        if (d[side] > 2) { c.toast('Tap on the fence itself.'); return true; }
        const along = side === 'n' || side === 's', t = Math.round((along ? x : z) * 2) / 2, lo = (along ? p.x0 : p.z0) + 2, hi = (along ? p.x1 : p.z1) - 2;
        if (t < lo || t > hi) { c.toast('Not so near a corner.'); return true; }
        const g = along ? { side, x: t, z: side === 'n' ? p.z0 : p.z1 } : { side, x: side === 'w' ? p.x0 : p.x1, z: t }, out = outside(g, 1.6), onL = V().B.onLand;
        if (onL && !onL(out[0], out[1], 0.5)) { c.toast('The gate has to open onto your land.'); return true; }
        if (f.paddocks.some(q => q !== p && inPad(q, out[0], out[1], -0.5))) { c.toast('That opens into another paddock.'); return true; }
        if (f.items.some(it => Math.hypot(it.x - g.x, it.z - g.z) < 2.4)) { c.toast('Something’s in the way of the gate.'); return true; }
        p.gate = { side, t }; P.gating = false; save(); c.sound('place'); c.toast('Gate moved.'); return reload(), true;
      }
      // a fruit tree: anywhere in its own orchard, clear of the others and of the shed and hives
      if (P.mode === 'edit' && P.moving && P.sel && P.sel.kind === 'ftree') {
        const B = V().B, cx = Math.round(x * 2) / 2, cz = Math.round(z * 2) / 2, me = B.trees.find(t0 => t0.i === P.sel.i); if (!me) return true;
        const blk = (FL() ? FL().owned(f) : []).find(b => { const r = FL().rectOf(b.slot); return b.type === 'orchard' && me.x > r[0] && me.x < r[2] && me.z > r[1] && me.z < r[3]; }), r = blk && FL().rectOf(blk.slot);
        let bad = !r ? 'That tree can’t move.' : !(cx > r[0] + 2 && cx < r[2] - 2 && cz > r[1] + 2 && cz < r[3] - 2) ? 'Keep it inside its orchard.' : null;
        if (!bad && B.trees.some(t0 => t0 !== me && Math.hypot(t0.x - cx, t0.z - cz) < 3)) bad = 'Too close to another tree.';
        if (!bad && B.solids.some(q => !(Math.abs((q[0] + q[2]) / 2 - me.x) < 0.01 && Math.abs((q[1] + q[3]) / 2 - me.z) < 0.01) && cx + 0.7 > q[0] && cx - 0.7 < q[2] && cz + 0.7 > q[1] && cz - 0.7 < q[3])) bad = 'Something’s in the way.';
        if (!bad && B.paths.some(q => cx + 0.7 > q[0] && cx - 0.7 < q[2] && cz + 0.7 > q[1] && cz - 0.7 < q[3])) bad = 'Not on the track.';
        if (bad) { c.toast(bad); return true; }
        (f.treeAt = f.treeAt || {})[me.i] = [cx, cz]; P.moving = false; P.sel = null; save(); c.sound('place'); c.toast('Tree moved. It’ll settle in.'); return reload(), true;
      }
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
        if (!sh().farmPay(d.xp, 'the ' + d.name.toLowerCase())) return true;
        f.items.push({ id: nid(), t, x: cx, z: cz, ry }); save(); c.xp(); c.sound('place'); c.toast(`${d.e} ${d.name} placed!`); reload(); return true;
      }
      if (P.mode === 'edit') {
        const it = f.items.slice().reverse().find(i => Math.abs(i.x - x) < ITEMS[i.t].fp[0] / 2 + 0.4 && Math.abs(i.z - z) < ITEMS[i.t].fp[1] / 2 + 0.4);
        const tr = !it && (V().B.trees || []).find(t0 => Math.hypot(t0.x - x, t0.z - z) < 1.4), dv = !it && !tr && (f.drives || []).find(d => x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1);
        if (it) P.sel = { kind: 'item', id: it.id }; else if (tr) P.sel = { kind: 'ftree', i: tr.i, name: tr.kind + ' tree', x: tr.x, z: tr.z }; else if (dv) P.sel = { kind: 'drive', id: dv.id, xp: dv.xp || 0 }; else { const p = padOf(f, x, z); P.sel = p ? { kind: 'pad', id: p.id } : null; }
        P.moving = false; P.gating = false; planner(); return true;
      }
      return false;
    }
    function buyLand() {
      const L = FL(), f = F(), slot = P.buy; if (!L || !slot || !L.canHave(f, slot)) return;
      const n = L.owned(f).filter(b => !b.free).length, pr = L.price(n), type = P.ltype || 'field';
      if (!sh().farmPay(pr, `the ${L.SLOT_NAME[slot].toLowerCase()} block of land`)) return;
      const blk = { id: nid(), slot, type, edge: P.ledge || 'hedge', base: 100 * ((f.land || []).length + 1), at: Date.now() };
      (f.land = f.land || []).push(blk);
      // a pasture is a paddock like any other: fenced, with its gate (animals go in it from the barn)
      if (type === 'pasture') { const r = L.rectOf(slot); f.paddocks.push({ id: nid(), x0: r[0] + 6, z0: r[1] + 6, x1: r[2] - 6, z1: r[3] - 6 }); }
      P.buy = null; save(); c.xp(); c.sound('buy'); c.toast(`${L.TYPES[type].e} Your ${L.SLOT_NAME[slot].toLowerCase()} block is ready: a ${L.TYPES[type].name.toLowerCase()}! Rates start next Monday.`);
      return reload();
    }
    function reload() { const keep = P; IH.village.reload(); P = keep; setTimeout(() => { if (P && V() && V().where === 'farm') planner(); }, 60); }
    function click(k) {
      const [what, a, b] = k.split(':'), f = F();
      if (what === 'feed') { const x = FEED[a], n = Math.max(1, sh().qtyN(Math.min(50, Math.floor((sh().farmAcct().bal + sh().wallet().left) / x.xp)))); if (!sh().farmPay(x.xp * n, n > 1 ? `${n} lots of ${x.name.toLowerCase()}` : 'the ' + x.name.toLowerCase())) return; f.feed[a] = (f.feed[a] || 0) + x.n * n; save(); c.xp(); c.sound('buy'); if (n > 1) c.toast(`${x.n * n} servings of ${x.name.toLowerCase()} in the feed bin.`); return shop('feed'); }
      if (what === 'shop') return shop(a);
      if (what === 'pick') return pickPad(a);
      if (what === 'buy') return buyAnimal(a, b);
      if (what === 'dout') return getOut();
      if (what === 'auto') return autoStart();
      if (what === 'hitch') return hitch(a);
      if (what === 'pclose') { P = null; V().plan = null; while (preview.children.length) preview.remove(preview.children[0]); document.querySelector('.vg-game').hidden = true; c.closeTray(); return; }
      if (what === 'mode') { P = { mode: a }; return planner(); }
      if (what === 'name') return whoPanel(f.animals.find(x => x.id === a) ? f.animals.find(x => x.id === a).pad : null, a);
      if (what === 'nameok') return nameIt(a, b);
      if (what === 'mupick') { if (MU) { if (MU.ids.has(a)) MU.ids.delete(a); else MU.ids.add(a); return musterPanel(MU.from); } return; }
      if (what === 'muall') { if (MU) { for (const x of f.animals) if (x.pad === MU.from) MU.ids.add(x.id); return musterPanel(MU.from); } return; }
      if (what === 'mugo') { if (MU && MU.ids.size) lead(); return; }
      if (what === 'munone') { if (MU && !MU.going) MU = null; document.querySelector('.vg-game').hidden = true; return; }
      if (what === 'mbuy') { const m = MACHINES[a]; if (!m || (f.implements || {})[a]) return; if (!sh().farmPay(m.xp, 'a ' + m.name.toLowerCase())) return; (f.implements = f.implements || {})[a] = 1; save(); c.toast(`${m.e} ${m.name} bought! Hitch it to the tractor.`); return shop('machines'); }
      if (what === 'seed') { const L = seedList(); DR.seed = L[(L.indexOf(DR.seed) + 1) % L.length]; return seedNote(); }
      if (what === 'lpick') { P.buy = a; P.ltype = P.ltype || 'field'; P.ledge = P.ledge || 'hedge'; return planner(); }
      if (what === 'ltype') { P.ltype = a; return planner(); }
      if (what === 'ledge') { P.ledge = a; return planner(); }
      if (what === 'lno') { P.buy = null; return planner(); }
      if (what === 'lsee') { P.lsee = P.lsee === a ? null : a; return planner(); }
      if (what === 'lbuy') return buyLand();
      if (what === 'ledgeset') { const b = (f.land || []).find(q => q.slot === P.lsee); if (!b || (b.edge || 'hedge') === a) return; if (!sh().farmPay(FL().EDGE_XP, `a new ${FL().EDGES[a].toLowerCase()}`)) return; b.edge = a; save(); c.sound('place'); c.toast(`${FL().EDGES[a]} built.`); return reload(); }
      if (what === 'item') { P.t = a; return planner(); }
      if (what === 'rot') { P.ry = P.ry ? 0 : Math.PI / 2; return planner(); }
      if (what === 'padno') { P.a = null; P.cand = null; return planner(); }
      if (what === 'padok') { const C = P.cand; if (!C || C.bad || !sh().farmPay(C.xp, 'the fencing')) return; f.paddocks.push({ id: nid(), x0: C.x0, z0: C.z0, x1: C.x1, z1: C.z1 }); P.a = null; P.cand = null; save(); c.xp(); c.sound('place'); c.toast('Paddock built! Put a water trough in it, then some animals.'); return reload(); }
      if (what === 'desel') { P.sel = null; P.moving = false; P.gating = false; return planner(); }
      if (what === 'tmove') { P.moving = true; c.toast('Tap where it goes, inside its orchard.'); return planner(); }
      if (what === 'gmove') { P.gating = true; c.toast('Tap a spot on the fence for the gate.'); return planner(); }
      if (what === 'driveok') { const C = P.cand; if (!C || C.bad || !sh().farmPay(C.xp, 'the gravel for a driveway')) return; (f.drives = f.drives || []).push({ id: nid(), x0: C.x0, z0: C.z0, x1: C.x1, z1: C.z1, xp: C.xp }); P.a = null; P.cand = null; save(); c.xp(); c.sound('place'); c.toast('Driveway laid!'); return reload(); }
      if (what === 'move') { P.moving = true; P.ry = (f.items.find(i => i.id === P.sel.id) || {}).ry || 0; return planner(); }
      if (what === 'sell') {
        if (P.sel.kind === 'drive') { const d = (f.drives || []).find(q => q.id === P.sel.id); if (!d) return; f.drives = f.drives.filter(q => q !== d); const back = Math.round((d.xp || 0) / 2); if (back) sh().farmIn(back, 'gravel taken up'); c.toast(back ? `Driveway taken up: ✨ ${back} back for the gravel.` : 'Driveway taken up.'); P.sel = null; save(); c.xp(); return reload(); }
        if (P.sel.kind === 'item') { const i = f.items.findIndex(x => x.id === P.sel.id), it = f.items[i]; if (i < 0) return; f.items.splice(i, 1); sh().farmIn(Math.round(ITEMS[it.t].xp / 2), `sold the ${ITEMS[it.t].name.toLowerCase()}`); c.toast(`Sold the ${ITEMS[it.t].name.toLowerCase()}: ✨ ${Math.round(ITEMS[it.t].xp / 2)} back.`); }
        else { const p = f.paddocks.find(q => q.id === P.sel.id); if (!p) return; if (f.animals.some(x => x.pad === p.id)) return c.toast('Animals live there. Move them out first (sell them, or keep the paddock).'); if (f.items.some(it => ITEMS[it.t].in && padOf(f, it.x, it.z) === p)) return c.toast('Take its fittings out first.'); f.paddocks = f.paddocks.filter(q => q !== p); const back = Math.round((p.x1 - p.x0 + p.z1 - p.z0) * FENCE_XP / 2); sh().xp(back); c.toast(`Fence down: ✨ ${back} back.`); }
        P.sel = null; save(); c.xp(); return reload();
      }
    }
    const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    return { ap: () => AP, dr: () => DR, acts, click, tap, tick, shop, prep() { AP = null; MU = null; { const f0 = V() && V().where === 'farm' && F(); if (f0 && f0.notes && f0.notes.length) { const n0 = f0.notes.splice(0); save(); setTimeout(() => c.toast(n0.join(' ')), 2500); } } if (DR) { removeEventListener('keydown', onKey, true); removeEventListener('keyup', onKey, true); DR = null; } P = null; const v = V(); if (v) v.plan = null; if (v && v.where === 'farm') { const btn = document.createElement('button'); btn.className = 'ih-pill vg-plan'; btn.dataset.v = 'farm'; btn.dataset.k = 'mode:menu'; btn.textContent = '🛠️ Plan'; const top = v.ui.querySelector('.ih-top .ih-sp'); if (top) top.before(btn); } }, ANIMALS, ITEMS, TRACTOR_SEAT };
  };
})();
