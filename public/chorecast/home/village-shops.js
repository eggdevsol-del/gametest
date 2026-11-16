/* Chorecast homes (a prototype): inside Hoshi Street's shops (village.js walks the kid in and out).
   Each shop is one room, cut away like the homes (a floor on its own little floating island, walls you can see over
   or that cut down when they'd hide the kid), with a counter at the back, its shopkeeper behind it and the door at
   the front. One unit is one floor tile, about 50 cm.
   - Home & Furniture: today's things on display plinths (the real catalogue models, a fresh mix every day), a
     second-hand corner (today's used things, in the colour their last owner picked); sell things back at the counter
   - the Grocer: crates of every food on two tables and shelves along the walls (the real food models)
   - the Café: a glass case of treats at the counter, tables and chairs to sit and eat at, pendant lamps
   - the Pet Shop: beds, bowls and toys on display, the pets themselves in a pen; sell pet things back at the counter
   IH.villageShops.build(id, ctx) gives a place for village.js: { root, lits, bounds, solids, pond, bridges, spots,
   buildings, arrive, keeper, shoppers } (ctx: { defs, used, food, make, makePet, day }). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit) return;
  const { Kit, shade, painted } = IH.kit;
  const W = 20, D = 14, H = 6.5; // the room
  const bx = (k, w, h, d, x, y, z, c, o = {}) => k.box(w, h, d, x, y, z, c, Object.assign({ r: 0 }, o));
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const LOOK = {
    furniture: { name: 'Home & Furniture', wall: '#f4ede2', wall2: '#e7dccb', floor: '#c9a27a', floor2: '#bb946c', trim: '#3f6fb5', counter: '#f4f0ea', keeper: ['🐨', '#3f6fb5'], sign: ['HOME & FURNITURE', '#3f6fb5', '#ffffff', '🛋️'] },
    grocer: { name: 'Grocer', wall: '#f3f1e6', wall2: '#e3e8d6', floor: '#d9d4c8', floor2: '#cfc9bc', trim: '#2f8a4f', counter: '#e8e2d8', keeper: ['🐵', '#2f8a4f'], sign: ['GROCER', '#2f8a4f', '#ffffff', '🍎'] },
    cafe: { name: 'Café', wall: '#f1e2cb', wall2: '#e3cfb2', floor: '#8a6038', floor2: '#7a5432', trim: '#4a3426', counter: '#6b4a33', keeper: ['🐰', '#4a3426'], sign: ['CAFÉ', '#4a3426', '#ffe7b8', '☕'] },
    pets: { name: 'Pet Shop', wall: '#e4f2f8', wall2: '#d4e8f0', floor: '#e9dcc4', floor2: '#ddd0b6', trim: '#3f86b0', counter: '#ffffff', keeper: ['🐶', '#3f86b0'], sign: ['PET SHOP', '#3f86b0', '#ffffff', '🐾'] }
  };
  // the café's treats: XP, what they give (points), how they look
  const TREATS = [
    { id: 'strawmilk', name: 'Strawberry milk', e: '🍓', xp: 20, gives: { food: 18, fun: 12 }, shape: (k, x, y, z) => { k.cyl(0.16, 0.5, x, y, z, '#ffc2d1', { n: 10 }); k.cyl(0.03, 0.3, x + 0.06, y + 0.45, z, '#ffffff', { n: 4, rz: 0.2 }); } },
    { id: 'taiyaki', name: 'Taiyaki', e: '🐟', xp: 25, gives: { food: 26, fun: 10 }, shape: (k, x, y, z) => { k.ball(0.22, x, y + 0.14, z, '#d99a52', { s: [1.6, 0.9, 0.5], n: 10 }); k.cone(0.14, 0.2, x - 0.38, y + 0.14, z, '#c98a44', { n: 4, rz: Math.PI / 2 }); } },
    { id: 'melonpan', name: 'Melon pan', e: '🍈', xp: 25, gives: { food: 28, fun: 8 }, shape: (k, x, y, z) => k.ball(0.24, x, y + 0.1, z, '#f2d27a', { s: [1, 0.6, 1], n: 12 }) },
    { id: 'cocoa', name: 'Hot chocolate', e: '☕', xp: 20, gives: { food: 14, fun: 14 }, shape: (k, x, y, z) => { k.cyl(0.17, 0.32, x, y, z, '#ffffff', { n: 12 }); k.cyl(0.15, 0.02, x, y + 0.32, z, '#7a4a2a', { n: 12 }); } },
    { id: 'cake', name: 'Strawberry cake', e: '🍰', xp: 35, gives: { food: 30, fun: 18 }, shape: (k, x, y, z) => { k.cyl(0.26, 0.3, x, y, z, '#fff6e6', { n: 12 }); k.cyl(0.27, 0.06, x, y + 0.3, z, '#ffffff', { n: 12 }); k.ball(0.07, x, y + 0.4, z, '#e85a5a', { n: 8 }); } },
    { id: 'dango', name: 'Dango', e: '🍡', xp: 20, gives: { food: 20, fun: 10 }, shape: (k, x, y, z) => { k.cyl(0.015, 0.7, x, y, z, '#d9c3a0', { n: 4, rz: 1.2 }); ['#ffc2d1', '#ffffff', '#9be38f'].forEach((c, i) => k.ball(0.09, x - 0.15 + i * 0.16, y + 0.06 + i * 0.06, z, c, { n: 8 })); } }
  ];

  function signTex(key, text, bg, fg, icon) {
    return painted('vshop:' + key, 1024, 200, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `900 ${h * 0.5}px "Nunito", system-ui, sans-serif`; c.fillText(text, w / 2 + h * 0.3, h * 0.54, w * 0.8);
      c.font = `${h * 0.55}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`; c.fillText(icon, w * 0.12, h * 0.55);
    });
  }
  function tag(k, key, text, x, y, z, ry = 0, bg = '#fff6e0', fg = '#5a4a7a') {
    const tex = painted('vtag:' + key, 256, 96, (c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = shade(bg, -0.25); c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${h * 0.42}px "Nunito", system-ui, sans-serif`; c.fillText(text, w / 2, h * 0.54, w * 0.9); });
    k.painted(new T.PlaneGeometry(0.9, 0.34), tex, x, y, z, { ry });
  }

  // ---------- the room: floor, walls (the back and the side ones tall, each cut down when it'd hide the kid; the front
  // one low, with the door), the counter with its till, the shop's sign over it, the island it floats on
  function room(id, k, lit, solids, spots, buildings, root) {
    const L = LOOK[id], R = rng(id.length * 977);
    // the floor and the island under it
    bx(k, W + 2, 0.42, D + 2, W / 2, -0.42, D / 2, '#c6bfb2', { r: 0.18, seg: 2 });
    for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) bx(k, 0.98, 0.04, 0.98, x + 0.5, 0, z + 0.5, (x + z) % 2 ? L.floor : L.floor2, { r: 0.01 });
    bx(k, W + 2.12, 0.16, D + 2.12, W / 2, -0.5, D / 2, '#b7ad9b', { r: 0.08 });
    bx(k, W + 1.9, 1.15, D + 1.9, W / 2, -1.62, D / 2, '#9a6a45', { r: 0.2, seg: 2 }); bx(k, W + 1.5, 0.9, D + 1.5, W / 2, -2.5, D / 2, '#8f8a99', { r: 0.3, seg: 2 }); bx(k, W - 0.2, 0.8, D - 0.2, W / 2, -3.2, D / 2, '#6f6a7d', { r: 0.35, seg: 2 });
    for (let i = 0; i < 26; i++) { const sd = i % 4, t = R(), y = -0.85 - R() * 1.5, s = 0.22 + R() * 0.3; const [x, z] = sd === 0 ? [-1 + t * (W + 2), D + 0.98] : sd === 1 ? [W + 0.98, -1 + t * (D + 2)] : sd === 2 ? [-1 + t * (W + 2), -0.98] : [-0.98, -1 + t * (D + 2)]; k.ball(s, x, y, z, y < -1.6 ? '#8f8a99' : '#7d5236', { s: [1.2, 0.8, 1], n: 7 }); }
    k.cone(6.5, 3, W / 2, -5.2, D / 2, '#6f6a7d', { rx: Math.PI, n: 9 });
    // the walls: each its own model, with a low stub for when it's cut down
    const wall = (x0, z0, x1, z1, tall, deco) => {
      const wk = new Kit(), wl = new Kit(), w = Math.abs(x1 - x0) || 0.3, d = Math.abs(z1 - z0) || 0.3, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      bx(wk, w, tall, d, cx, 0, cz, L.wall, { r: 0.03 }); bx(wk, w + 0.04, 0.9, d + 0.04, cx, 0, cz, L.wall2); bx(wk, w + 0.08, 0.18, d + 0.08, cx, tall, cz, shade(L.wall, -0.2)); // (the dado, the cap)
      if (deco) deco(wk, wl);
      const full = new T.Group(); full.add(wk.build(), wl.build()); full.children[1].userData.lit = true;
      const sk = new Kit(); bx(sk, w, 0.9, d, cx, 0, cz, L.wall2); bx(sk, w + 0.08, 0.12, d + 0.08, cx, 0.9, cz, shade(L.wall, -0.2)); const stub = sk.build(); stub.visible = false;
      root.add(full, stub); buildings.push({ full, stub, box: new T.Box3(new T.Vector3(Math.min(x0, x1) - 0.2, 0, Math.min(z0, z1) - 0.2), new T.Vector3(Math.max(x0, x1) + 0.2, tall, Math.max(z0, z1) + 0.2)) });
      solids.push([Math.min(x0, x1) - 0.15, Math.min(z0, z1) - 0.15, Math.max(x0, x1) + 0.15, Math.max(z0, z1) + 0.15]);
    };
    // back wall: windows high up, the shop's sign over the counter, shelves of stock behind the counter
    wall(0, -0.15, W, -0.15, H, (wk, wl) => {
      for (const x of [3, 17]) { bx(wk, 3.2, 2.4, 0.1, x, 3.4, 0.0, '#c9ccd2'); bx(wk, 2.9, 2.1, 0.12, x, 3.55, 0.02, '#a8d4f0'); bx(wl, 2.7, 1.9, 0.04, x, 3.65, 0.1, '#fff2d0', { emit: 0.6 }); }
      wk.painted(new T.PlaneGeometry(7.5, 1.45), signTex(id, L.sign[0], L.sign[1], L.sign[2], L.sign[3]), W / 2, 5.0, 0.06);
      for (let i = 0; i < 3; i++) bx(wk, 7, 0.14, 0.7, W / 2, 1.3 + i * 1.1, 0.35, '#c79a68');
      // stock on the shelves: jars, boxes and bags in the shop's own colours
      const C = { furniture: ['#7cc8e8', '#ffd35a', '#ff9fb7', '#ffffff', '#9be38f'], grocer: ['#e85a5a', '#ffd35a', '#f39a4b', '#9be38f', '#ffffff'], cafe: ['#ffffff', '#c79a68', '#ffc2d1', '#7a4a2a', '#f2d27a'], pets: ['#7cc8e8', '#ff9fb7', '#ffd35a', '#9be38f', '#b59cff'] }[id];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) { const x = W / 2 - 3.1 + j * 0.78, y = 1.44 + i * 1.1, c = C[(i * 3 + j) % C.length]; if ((i + j) % 3 === 0) wk.cyl(0.2, 0.62, x, y, 0.4, c, { n: 10 }); else if ((i + j) % 3 === 1) bx(wk, 0.5, 0.7, 0.45, x, y, 0.4, c, { r: 0.05 }); else wk.lathe([[0.01, 0], [0.2, 0.05], [0.24, 0.3], [0.12, 0.55], [0.1, 0.7]], x, y, 0.4, c, { n: 12 }); }
    });
    wall(-0.15, 0, -0.15, D, H, wk => { for (const z of [4, 10]) { bx(wk, 0.1, 2.4, 3.2, 0.0, 3.4, z, '#c9ccd2'); bx(wk, 0.12, 2.1, 2.9, 0.02, 3.55, z, '#a8d4f0'); } });
    wall(W + 0.15, 0, W + 0.15, D, H, wk => { for (const z of [4, 10]) { bx(wk, 0.1, 2.4, 3.2, W, 3.4, z, '#c9ccd2'); bx(wk, 0.12, 2.1, 2.9, W - 0.02, 3.55, z, '#a8d4f0'); } });
    // the front: a low wall with the shop window's sill, and the door in the middle (open: tap it to go out)
    for (const [a, b] of [[0, W / 2 - 1.4], [W / 2 + 1.4, W]]) { bx(k, b - a, 1.0, 0.3, (a + b) / 2, 0, D + 0.15, L.wall2); bx(k, b - a + 0.08, 0.14, 0.4, (a + b) / 2, 1.0, D + 0.15, shade(L.wall, -0.2)); solids.push([a - 0.1, D - 0.05, b + 0.1, D + 0.4]); }
    for (const x of [W / 2 - 1.4, W / 2 + 1.4]) bx(k, 0.3, 1.6, 0.4, x, 0, D + 0.15, L.trim);
    bx(k, 2.4, 0.04, 1.4, W / 2, 0.0, D + 0.9, '#8a8f98'); // (the mat outside)
    spots.push({ kind: 'exit', id: 'door', name: 'the door', at: [W / 2, D - 0.9], yaw: 0, hit: [W / 2, D, 0, 2.8] });
    // the counter, the till, the shopkeeper's spot behind it
    bx(k, 8, 1.7, 1.5, W / 2, 0, 2.6, L.counter, { r: 0.08 }); bx(k, 8.2, 0.14, 1.7, W / 2, 1.7, 2.6, shade(L.counter, -0.15), { r: 0.04 });
    bx(k, 0.9, 0.6, 0.7, W / 2 + 2.6, 1.84, 2.5, '#3d4048', { r: 0.06 }); bx(k, 0.7, 0.04, 0.4, W / 2 + 2.6, 2.44, 2.4, '#7cc8e8', { emit: 0.4 });
    solids.push([W / 2 - 4.1, 1.75, W / 2 + 4.1, 3.45]); solids.push([0, 0, W, 1.0]); // (behind the counter: the keeper's)
    spots.push({ kind: 'counter', id: 'counter', name: 'the counter', at: [W / 2 + 2.6, 4.3], yaw: Math.PI, hit: [W / 2 + 2.9, 2.6, 0, 1.6] }); // (tap the till, or the shopkeeper)
    // lamps hanging from above (the ceiling's left off, so you can see in)
    for (const x of [4, 10, 16]) for (const z of [6, 10.5]) { k.cyl(0.03, 1.8, x, H - 1.6, z, '#2f2a33', { n: 4 }); k.cyl(0.5, 0.45, x, H - 2.05, z, L.trim, { rt: 0.12, n: 10 }); lit.ball(0.28, x, H - 2.1, z, '#ffe2a0', { n: 8, emit: 1 }); }
  }
  // a display plinth: white, with a little price tag
  function plinth(k, x, z, w, d, label, key) { bx(k, w, 0.35, d, x, 0, z, '#ffffff', { r: 0.06 }); bx(k, w + 0.1, 0.06, d + 0.1, x, 0, z, '#d8d2c8'); tag(k, key, label, x, 0.2, z + d / 2 + 0.02); }

  // ---------- each shop's stock
  function furniture(ctx, k, root, solids, spots) {
    const R = rng(ctx.day * 13 + 7), pool = ctx.defs().filter(d => d.xp && !d.pet && d.kind !== 'pet' && !d.apply && !d.opening && !d.cover && d.kind !== 'wall' && d.cat !== 'pets' && d.cat !== 'garden' && Math.max(...d.fp) <= 3 && Math.min(...d.fp) <= 2), pick = [];
    while (pick.length < 6 && pool.length) pick.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    const slots = [[3.6, 6.8], [3.6, 10.6], [7.2, 8.7], [12.8, 8.7], [16.4, 6.8], [16.4, 10.6]];
    const show = (d, x, z, rec, label, key, spot) => {
      const [fw, fd] = d.fp, w = fw + 0.5, dd = fd + 0.5; plinth(k, x, z, w, dd, label, key);
      try { const inst = ctx.make(d, rec); inst.group.position.set(x - fw / 2, 0.35, z - fd / 2); inst.group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); root.add(inst.group); } catch (e) { /* (a model that can't be made here) */ }
      solids.push([x - w / 2, z - dd / 2, x + w / 2, z + dd / 2]); spots.push(Object.assign({ name: d.name, at: [x, z + dd / 2 + 0.9], yaw: Math.PI, hit: [x, z, 0, Math.max(w, dd) + 0.4] }, spot));
    };
    pick.forEach((d, i) => { const [x, z] = slots[i]; show(d, x, z, { w: 2, h: 2.1, wy: 1.45 }, '✨ ' + d.xp, 'xp' + d.xp, { kind: 'item', id: 'n:' + d.t, t: d.t }); });
    // the second-hand corner, by the right-hand wall at the back
    const used = ctx.used().filter(o => { const d = ctx.BY[o.t]; return d && !d.apply && !d.opening && !d.cover && d.kind !== 'wall' && Math.max(...d.fp) <= 2; }).slice(0, 2);
    used.forEach((o, i) => { const d = ctx.BY[o.t]; show(d, 15.6 + i * 2.6 - 1.3, 4.6, { fin: o.fin, w: 2, h: 2.1, wy: 1.45 }, 'USED ' + o.xp, 'u' + o.xp, { kind: 'item', id: 'u:' + o.id, t: o.t, offer: o.id, name: d.name + ' (used)' }); });
    tag(k, 'secondhand', 'SECOND-HAND', 15.6, 1.4, 3.2, 0, '#ffe0e8', '#a0446a');
  }
  function grocer(ctx, k, root, solids, spots) {
    const F = ctx.food, ids = Object.keys(F);
    // two tables of crates, each crate its food (the real food models), and its price
    const crate = (id, x, z) => {
      bx(k, 1.3, 0.35, 1.0, x, 1.25, z, '#a5784b', { r: 0.04 });
      const f = F[id]; for (let i = 0; i < 4; i++) { const kk = new Kit(); try { f.shape(kk); } catch (e) { /* (no shape) */ } const g = kk.build(); g.scale.setScalar(1.6); g.position.set(x - 0.35 + (i % 2) * 0.7, 1.6, z - 0.22 + Math.floor(i / 2) * 0.44); g.rotation.y = i * 1.3; root.add(g); }
      tag(k, 'f' + f.xp, '✨ ' + f.xp, x, 1.32, z + 0.52);
      spots.push({ kind: 'food', id, name: f.name.toLowerCase(), at: [x, z + 1.6], yaw: Math.PI, hit: [x, z, 0, 1.3] });
    };
    for (const [tx, list] of [[5.2, ids.slice(0, 8)], [14.8, ids.slice(8, 16)]]) {
      bx(k, 6, 1.25, 3.0, tx, 0, 8.4, '#c79a68', { r: 0.06 }); solids.push([tx - 3.1, 6.8, tx + 3.1, 10.0]);
      list.forEach((id, i) => crate(id, tx - 2.25 + (i % 4) * 1.5, 7.7 + Math.floor(i / 4) * 1.4));
    }
    // shelves along the walls, stocked
    for (const x of [0.7, W - 0.7]) { for (let i = 0; i < 4; i++) bx(k, 1.0, 0.12, 9, x, 0.6 + i * 1.1, 8.5, '#c9ccd2'); for (let i = 0; i < 36; i++) bx(k, 0.6, 0.6, 0.45, x, 0.72 + (i % 4) * 1.1, 4.5 + Math.floor(i / 4) * 0.95, ['#e85a5a', '#ffd35a', '#7cc8e8', '#9be38f', '#f39a4b', '#ffffff'][i % 6], { r: 0.04 }); solids.push([x - 0.7, 3.9, x + 0.7, 13.1]); }
  }
  function cafe(ctx, k, root, solids, spots) {
    // the glass case of treats on the counter
    bx(k, 6.6, 0.06, 1.0, W / 2 - 1.6, 1.84, 2.9, '#ffffff'); k.glassBox(6.6, 0.9, 1.0, W / 2 - 1.6, 1.84, 2.9, { tint: '#eaf6ff' }); // (the till's at the right-hand end)
    TREATS.forEach((tr, i) => { const x = W / 2 - 4.3 + i * 1.08; tr.shape(k, x, 1.9, 2.9); tag(k, 't' + tr.xp, '✨ ' + tr.xp, x, 1.78, 3.42); spots.push({ kind: 'treat', id: tr.id, name: tr.name.toLowerCase(), at: [x, 4.3], yaw: Math.PI, hit: [x, 2.9, 0, 1.0], treat: tr }); });
    bx(k, 0.8, 1.0, 0.7, W / 2 + 3.6, 1.84, 2.2, '#c9ccd2', { r: 0.1 }); // (the coffee machine)
    // tables, two chairs each, facing
    for (const [tx, tz] of [[4, 7.4], [4, 11.4], [16, 7.4], [16, 11.4]]) {
      k.cyl(0.8, 0.1, tx, 1.45, tz, '#ffffff', { n: 16 }); k.cyl(0.08, 1.45, tx, 0, tz, '#2f2a33', { n: 6 }); k.cyl(0.45, 0.06, tx, 0, tz, '#2f2a33', { n: 10 });
      solids.push([tx - 0.85, tz - 0.85, tx + 0.85, tz + 0.85]);
      for (const s of [-1, 1]) {
        const cx = tx + s * 1.35; bx(k, 0.9, 0.12, 0.9, cx, 0.9, tz, '#2f8a7a', { r: 0.05 }); for (const a of [-0.35, 0.35]) for (const b of [-0.35, 0.35]) bx(k, 0.08, 0.9, 0.08, cx + a, 0, tz + b, '#2f2a33'); bx(k, 0.12, 1.05, 0.9, cx + s * 0.42, 1.0, tz, '#2f8a7a', { r: 0.05 });
        solids.push([cx - 0.5, tz - 0.5, cx + 0.5, tz + 0.5]);
        spots.push({ kind: 'seat', id: `c${tx}${tz}${s}`, name: 'a café table', at: [cx - s * 0.2, tz + 1.0], seat: [cx - s * 0.02, tz], yaw: s > 0 ? -Math.PI / 2 : Math.PI / 2, hit: [cx, tz, 0, 1.0] });
      }
    }
    // plants, a menu board
    for (const [x, z] of [[1.2, 13], [W - 1.2, 13], [1.2, 4.2]]) { k.cyl(0.4, 0.7, x, 0, z, '#c79a68', { n: 10 }); for (let i = 0; i < 5; i++) k.ball(0.42, x + Math.cos(i) * 0.25, 1.0 + i * 0.25, z + Math.sin(i) * 0.25, '#5fbf5a', { n: 8 }); solids.push([x - 0.5, z - 0.5, x + 0.5, z + 0.5]); }
  }
  function pets(ctx, k, root, solids, spots) {
    const pool = ctx.defs().filter(d => d.cat === 'pets' && d.xp && !d.pet && Math.max(...d.fp) <= 2), animals = ctx.defs().filter(d => d.cat === 'pets' && d.pet);
    const slots = [[3.4, 6.6], [3.4, 10.2], [7.2, 8.4], [12.8, 8.4]];
    pool.slice(0, 4).forEach((d, i) => {
      const [x, z] = slots[i], [fw, fd] = d.fp, w = fw + 0.5, dd = fd + 0.5; plinth(k, x, z, w, dd, '✨ ' + d.xp, 'xp' + d.xp);
      try { const inst = ctx.make(d, { w: 2, h: 2.1, wy: 1.45 }); inst.group.position.set(x - fw / 2, 0.35, z - fd / 2); root.add(inst.group); } catch (e) { /* (no model) */ }
      solids.push([x - w / 2, z - dd / 2, x + w / 2, z + dd / 2]); spots.push({ kind: 'item', id: 'n:' + d.t, t: d.t, name: d.name, at: [x, z + dd / 2 + 0.9], yaw: Math.PI, hit: [x, z, 0, Math.max(w, dd) + 0.4] });
    });
    // the pen of pets to take home: a low white fence round a soft mat, a sign for each
    const px = 15.6, pz = 9.6; bx(k, 6, 0.06, 5, px, 0, pz, '#9be38f', { r: 0.04 });
    for (let x = px - 3; x <= px + 3.01; x += 0.5) for (const z of [pz - 2.5, pz + 2.5]) bx(k, 0.08, 0.9, 0.08, x, 0, z, '#ffffff'); for (let z = pz - 2.5; z <= pz + 2.51; z += 0.5) for (const x of [px - 3, px + 3]) bx(k, 0.08, 0.9, 0.08, x, 0, z, '#ffffff');
    for (const z of [pz - 2.5, pz + 2.5]) bx(k, 6, 0.08, 0.06, px, 0.7, z, '#ffffff'); for (const x of [px - 3, px + 3]) bx(k, 0.06, 0.08, 5, x, 0.7, pz, '#ffffff');
    solids.push([px - 3.1, pz - 2.6, px + 3.1, pz + 2.6]);
    const pens = [];
    animals.slice(0, 3).forEach((d, i) => { const x = px - 1.5 + i * 1.5, z = pz - 0.2; tag(k, 'p' + d.xp, '✨ ' + d.xp, x, 0.95, pz + 2.56); pens.push({ d, x, z }); spots.push({ kind: 'item', id: 'n:' + d.t, t: d.t, name: d.name, at: [x, pz + 3.4], yaw: Math.PI, hit: [x, z, 0, 1.6] }); });
    // a shelf of food bags and toys on the left wall, a scratching post
    for (let i = 0; i < 3; i++) bx(k, 1.0, 0.12, 6, 0.7, 0.8 + i * 1.2, 9.5, '#c9ccd2'); for (let i = 0; i < 18; i++) { const y = 0.92 + (i % 3) * 1.2, z = 7 + Math.floor(i / 3) * 0.95; if (i % 2) bx(k, 0.5, 0.75, 0.6, 0.7, y, z, ['#ff9fb7', '#7cc8e8', '#ffd35a', '#9be38f'][i % 4], { r: 0.08 }); else k.ball(0.18, 0.7, y + 0.18, z, ['#e85a5a', '#3f86b0', '#ffb33a'][i % 3], { n: 8 }); }
    solids.push([0, 6.2, 1.4, 12.8]);
    k.cyl(0.18, 2.4, 9.6, 0, 12.4, '#d9c3a0', { n: 8 }); bx(k, 1.2, 0.15, 1.2, 9.6, 0, 12.4, '#c79aa0', { r: 0.06 }); bx(k, 1.0, 0.15, 1.0, 9.6, 2.4, 12.4, '#c79aa0', { r: 0.06 }); solids.push([8.9, 11.7, 10.3, 13.1]);
    // the fish tank, the toys on the wall shelf
    bx(k, 3.0, 1.4, 1.0, 4.5, 0, 1.6, '#3d4048'); k.waterBox(2.8, 1.6, 0.9, 4.5, 1.4, 1.6, { tint: '#7cc8e8' }); k.ball(0.14, 4.0, 2.2, 1.6, '#f39a4b', { s: [1.4, 1, 0.6], n: 6 }); solids.push([2.9, 1.0, 6.1, 2.2]);
    return pens;
  }

  function build(id, ctx) {
    const k = new Kit(), lit = new Kit(), root = new T.Group(), solids = [], spots = [], buildings = [];
    room(id, k, lit, solids, spots, buildings, root);
    let pens = [];
    if (id === 'furniture') furniture(ctx, k, root, solids, spots);
    if (id === 'grocer') grocer(ctx, k, root, solids, spots);
    if (id === 'cafe') cafe(ctx, k, root, solids, spots);
    if (id === 'pets') pens = pets(ctx, k, root, solids, spots) || [];
    const main = k.build(), glow = lit.build(); glow.userData.lit = true; root.add(main, glow);
    for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 3, s.kind === 'treat' ? 1.6 : w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 1.5, z); m.userData.spot = s; root.add(m); }
    const lits = []; root.traverse(o => { if (o.userData.lit) lits.push(o); });
    return { id, name: LOOK[id].name, root, lits, bounds: { x0: -0.5, z0: -0.5, x1: W + 0.5, z1: D + 0.6 }, solids, pond: null, bridges: [], spots, buildings, arrive: [W / 2, D - 1.4], keeper: { at: [W / 2 + 2.6, 1.5], yaw: 0, avatar: LOOK[id].keeper[0], hue: LOOK[id].keeper[1] }, pens, centre: [W / 2, D / 2] };
  }
  IH.villageShops = { build, TREATS, LOOK };
})();
