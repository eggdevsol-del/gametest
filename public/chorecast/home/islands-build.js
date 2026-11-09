/* Chorecast homes (a prototype): the extra islands, each its own floating island and its own ecosystem, built like
   the village (Kit models, cel-shaded, ink lines; one unit is a floor tile, about 50 cm) and run by the same
   controller (village.js). Two kinds:
   - vacation islands, to visit and play: the Beach cove (and later the Lake, Forest grove, Waterfall cliff,
     Mountain lookout, Floating sky islet)
   - utility islands, where the kid produces goods: the Farm paddock (and later the Veggie plot, Orchard terrace,
     Stable yard)
   IH.islandsBuild.build(id) gives the same shape as the village's build(), plus:
     title, sub: the name in the top bar; kind: 'vacation' | 'utility'
     height(x, z): the ground's height (the beach slopes under the sea); walk(x, z): false where nobody walks
     animals: [{ kind, group, parts, ... }] moved by village.js, each its own way
     npc: how many visitors, and lawns (village.js grows the home's grass on them) */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.kit || !IH.look) return;
  const { Kit, painted } = IH.kit, LK = IH.look;
  const rng = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const bx = (k, w, h, d, x, y, z, c, o = {}) => k.box(w, h, d, x, y, z, c, Object.assign({ r: 0 }, o));
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // the list the phone's Travel app shows: what each island is, what it costs (Chorecast's prices), built yet or not
  const LIST = [
    { id: 'beach', name: 'Beach cove', emoji: '🏖️', kind: 'vacation', xp: 1500, built: true, about: 'Sand, rock pools and little waves. Swim, build sandcastles, fish off the rocks.' },
    { id: 'farm', name: 'Farm paddock', emoji: '🐄', kind: 'utility', xp: 1500, built: true, about: 'Hens, goats, cows and alpacas. Collect eggs, milk and wool to cook with or sell in the village.' },
    { id: 'plot', name: 'Veggie plot', emoji: '🥕', kind: 'utility', xp: 800, about: 'Garden beds for carrots, pumpkins and strawberries.' },
    { id: 'orchard', name: 'Orchard terrace', emoji: '🍎', kind: 'utility', xp: 1200, about: 'A sunny terrace of apple, lemon and feijoa trees.' },
    { id: 'stable', name: 'Stable yard', emoji: '🐴', kind: 'utility', xp: 1800, needs: 'farm', about: 'A bigger farm with a stable: horses to groom, feed and ride.' },
    { id: 'lake', name: 'Lake', emoji: '🦢', kind: 'vacation', xp: 2000, about: 'A big freshwater lake: kayaks, swans, the platypus and fishing off the jetty.' },
    { id: 'grove', name: 'Forest grove', emoji: '🌳', kind: 'vacation', xp: 1800, about: 'A wooded islet over a rope bridge, with native birds and the tuatara.' },
    { id: 'waterfall', name: 'Waterfall cliff', emoji: '🌈', kind: 'vacation', xp: 2500, about: 'A waterfall off the island’s edge, with a rainbow in the spray.' },
    { id: 'lookout', name: 'Mountain lookout', emoji: '♨️', kind: 'vacation', xp: 3000, about: 'Hot springs, a geyser and an overlook with a telescope.' },
    { id: 'sky', name: 'Floating sky islet', emoji: '☁️', kind: 'vacation', xp: 4000, about: 'A tiny island floating high above, up a rope ladder.' }
  ];

  // ---------- ground: a height field drawn with the anime shader (its colours per point), and its sides
  function terrain(W, D, h, colour, n = 2) {
    const nx = W * n, nz = D * n, geo = new T.PlaneGeometry(W, D, nx, nz).rotateX(-Math.PI / 2), p = geo.attributes.position, cl = [], c = new T.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + W / 2, z = p.getZ(i) + D / 2, y = h(x, z); p.setXYZ(i, x, y, z); c.set(colour(x, z, y)); cl.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new T.Float32BufferAttribute(cl, 3)); geo.computeVertexNormals();
    const id = IH.kit.nextId ? IH.kit.nextId() : 7, ext = new Float32Array(p.count * 2), pat = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { ext[i * 2] = id; pat[i * 2 + 1] = 1; }
    geo.setAttribute('aExt', new T.BufferAttribute(ext, 2)); geo.setAttribute('aPat', new T.BufferAttribute(pat, 2));
    const m = new T.Mesh(geo, LK.BASE); m.receiveShadow = true; m.castShadow = true; m.userData.main = true; m.userData.bg = true; return m; // (the ground is scenery: painted, no ink lines)
  }
  // the island's sides under it (soil, then rock) and the rocks it floats on, as the homes and the village
  function sides(k, W, D, R, top = '#b7ad9b') {
    bx(k, W + 0.12, 0.16, D + 0.12, W / 2, -0.5, D / 2, top, { r: 0.08 });
    bx(k, W - 0.1, 1.15, D - 0.1, W / 2, -1.62, D / 2, '#9a6a45', { r: 0.2, seg: 2 }); bx(k, W - 0.5, 0.9, D - 0.5, W / 2, -2.5, D / 2, '#8f8a99', { r: 0.3, seg: 2 }); bx(k, W - 2.2, 0.8, D - 2.2, W / 2, -3.2, D / 2, '#6f6a7d', { r: 0.35, seg: 2 });
    for (let i = 0; i < 60; i++) { const side = i % 4, t = R(), y = -0.85 - R() * 1.5, s = 0.25 + R() * 0.35; const [x, z] = side === 0 ? [t * W, D - 0.02] : side === 1 ? [W - 0.02, t * D] : side === 2 ? [t * W, 0.02] : [0.02, t * D]; k.ball(s, x, y, z, y < -1.6 ? '#7d788a' : '#a77b52', { n: 7 }); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.cone(1.4 + R() * 1.1, 2.2 + R() * 1.4, W / 2 + Math.cos(a) * W * 0.3, -4.4 - R() * 0.4, D / 2 + Math.sin(a) * D * 0.28, '#6f6a7d', { rx: Math.PI, n: 7 }); }
    k.cone(Math.min(W, D) * 0.28, 6, W / 2, -8.2, D / 2, '#6f6a7d', { rx: Math.PI, n: 9 });
  }
  // a skirt from the height field's edge down to the island's sides (so a raised or dug edge has no gap)
  function skirt(W, D, h, col) {
    const k = new Kit(), seg = (x0, z0, x1, z1) => { const y0 = h(x0, z0), y1 = h(x1, z1), lo = -0.45, len = Math.hypot(x1 - x0, z1 - z0), y = Math.min(y0, y1); if (Math.max(y0, y1) <= lo + 0.02) return; k.box(len, Math.max(y0, y1) - lo, 0.08, (x0 + x1) / 2, lo, (z0 + z1) / 2, col(y), { ry: -Math.atan2(z1 - z0, x1 - x0) }); void y; };
    for (let x = 0; x < W; x += 0.5) { seg(x, 0.02, x + 0.5, 0.02); seg(x, D - 0.02, x + 0.5, D - 0.02); }
    for (let z = 0; z < D; z += 0.5) { seg(0.02, z, 0.02, z + 0.5); seg(W - 0.02, z, W - 0.02, z + 0.5); }
    return k.build();
  }
  function signTex(key, text, sub, bg, fg, w = 768, h = 220) {
    return painted('isl:' + key, w, h, (cx, W, H) => { cx.fillStyle = bg; cx.fillRect(0, 0, W, H); cx.strokeStyle = fg; cx.globalAlpha = 0.35; cx.lineWidth = 10; cx.strokeRect(8, 8, W - 16, H - 16); cx.globalAlpha = 1; cx.fillStyle = fg; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `900 ${H * (sub ? 0.36 : 0.46)}px "Nunito", system-ui, sans-serif`; cx.fillText(text, W / 2, H * (sub ? 0.4 : 0.52), W * 0.9); if (sub) { cx.font = `800 ${H * 0.2}px "Nunito", system-ui, sans-serif`; cx.fillText(sub, W / 2, H * 0.76, W * 0.9); } });
  }
  function board(k, key, text, sub, bg, fg, w, h, x, y, z, ry = 0) { k.at(x, y, z, ry, kk => kk.painted(new T.PlaneGeometry(w, h), signTex(key, text, sub, bg, fg), 0, 0, 0, {})); }
  // the signpost where the kid arrives: tap it to travel on (the phone's Travel app) or go home
  function signpost(k, x, z, label) {
    k.cyl(0.1, 3.4, x, 0, z, '#8a6038', { n: 6 });
    k.at(x, 2.7, z, 0.3, kk => bx(kk, 2.6, 0.7, 0.12, 0.9, 0, 0, '#fff6e0', { r: 0.06 })); k.at(x, 1.9, z, -0.8, kk => bx(kk, 2.6, 0.7, 0.12, 0.9, 0, 0, '#ffe0e8', { r: 0.06 }));
    k.at(x, 3.05, z, 0.3, kk => kk.painted(new T.PlaneGeometry(2.4, 0.6), signTex('p1' + label, '🏠 Home', '', '#fff6e0', '#5a4a7a', 512, 128), 0.9, 0, 0.07, {}));
    k.at(x, 2.25, z, -0.8, kk => kk.painted(new T.PlaneGeometry(2.4, 0.6), signTex('p2' + label, '📱 Travel', '', '#ffe0e8', '#5a4a7a', 512, 128), 0.9, 0, 0.07, {}));
  }
  // a pōhutukawa: a gnarled trunk, a wide dark canopy dotted with red flowers
  function pohutukawa(k, x, z, R, s = 1, y = 0) {
    k.cyl(0.32 * s, 1.6 * s, x, y, z, '#6b4a33', { n: 7, rz: 0.15 }); k.cyl(0.18 * s, 1.4 * s, x + 0.5 * s, y + 1.2 * s, z, '#6b4a33', { n: 6, rz: -0.6 }); k.cyl(0.18 * s, 1.3 * s, x - 0.4 * s, y + 1.2 * s, z + 0.2, '#6b4a33', { n: 6, rz: 0.7 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + R(), r = (0.9 + R() * 0.9) * s; k.ball((1.0 + R() * 0.5) * s, x + Math.cos(a) * r, y + (2.3 + R() * 0.7) * s, z + Math.sin(a) * r * 0.8, i % 2 ? '#2f6b3a' : '#3b7d44', { s: [1.2, 0.75, 1.1], n: 9 }); }
    for (let i = 0; i < 22; i++) { const a = R() * Math.PI * 2, r = R() * 2.0 * s; k.ball(0.16 * s, x + Math.cos(a) * r, y + (2.9 + R() * 0.6) * s, z + Math.sin(a) * r * 0.8, i % 3 ? '#d6283a' : '#ff4a55', { n: 6 }); }
  }
  function rock(k, x, y, z, s, R, col = '#8f8a99') { k.ball(s, x, y, z, col, { s: [1.2 + R() * 0.4, 0.6 + R() * 0.3, 1 + R() * 0.3], n: 7, ry: R() * 3 }); }

  // ---------- animals: little rigs (body, head, legs) that village.js moves, each its own way
  function part(g, x, y, z) { const p = new T.Group(); p.position.set(x, y, z); g.add(p); return p; }
  function hen(col = '#ffffff') {
    const g = new T.Group(), body = new Kit(); body.ball(0.36, 0, 0.48, 0, col, { s: [1, 0.95, 1.25], n: 12 }); body.cone(0.22, 0.4, 0, 0.62, -0.42, col, { rx: -2.2, n: 6 });
    for (const s of [-1, 1]) body.ball(0.2, s * 0.3, 0.5, -0.02, col === '#ffffff' ? '#f1ece2' : '#8a5a33', { s: [0.4, 0.8, 1.2], n: 8 });
    g.add(body.build());
    const head = part(g, 0, 0.78, 0.3), hk = new Kit(); hk.ball(0.17, 0, 0.08, 0.04, col, { n: 10 }); hk.cone(0.06, 0.14, 0, 0.06, 0.24, '#ffb43a', { rx: Math.PI / 2, n: 5 }); hk.box(0.04, 0.12, 0.16, 0, 0.2, 0.04, '#e8352e', { r: 0.02 }); hk.ball(0.04, 0, -0.02, 0.17, '#e8352e', { n: 6 }); for (const s of [-1, 1]) hk.ball(0.025, s * 0.11, 0.12, 0.12, '#1f1a22', { n: 6 }); head.add(hk.build());
    const legs = []; for (const s of [-1, 1]) { const l = part(g, s * 0.12, 0.26, 0), lk = new Kit(); lk.cyl(0.025, 0.26, 0, -0.26, 0, '#f2a33a', { n: 5 }); lk.box(0.14, 0.02, 0.14, 0, -0.27, 0.04, '#f2a33a'); l.add(lk.build()); legs.push(l); }
    return { group: g, head, legs, kind: 'hen' };
  }
  function quad(o) {
    const g = new T.Group(), s = o.s, bk = new Kit(), L = o.len || 1;
    bk.ball(0.5 * s, 0, o.legH * s + 0.42 * s, 0, o.c, { s: [o.w || 0.9, 0.85, 1.5 * L], n: 14 });
    if (o.patches) for (const [px, py, pz, r] of o.patches) bk.ball(r * s, px * s, (o.legH + 0.42 + py) * s, pz * s, o.patchC, { s: [0.5, 0.8, 1], n: 8 });
    if (o.wool) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; bk.ball(0.22 * s, Math.cos(a) * 0.36 * s, (o.legH + 0.5 + Math.sin(a * 2) * 0.08) * s, Math.sin(a) * 0.55 * s, o.c, { n: 8 }); }
    if (o.udder) bk.ball(0.16 * s, 0, o.legH * s + 0.05 * s, -0.25 * s, '#f6b9c4', { s: [1, 0.7, 1], n: 8 });
    bk.cone(0.07 * s, 0.4 * s, 0, (o.legH + 0.5) * s, -0.72 * s * L, o.tailC || o.c, { rx: -2.6, n: 5 }); g.add(bk.build());
    const neckY = (o.legH + 0.55) * s, head = part(g, 0, neckY + (o.neck || 0) * s, 0.62 * s * L), hk = new Kit();
    if (o.neck) { const nk = new Kit(); nk.cyl(0.17 * s, (o.neck + 0.2) * s, 0, 0, 0, o.c, { n: 8 }); if (o.wool) for (let i = 0; i < 5; i++) nk.ball(0.2 * s, 0, (i * 0.18) * s, 0, o.c, { n: 8 }); const np = part(g, 0, neckY - 0.1 * s, 0.6 * s * L); np.add(nk.build()); }
    hk.ball(0.27 * s, 0, 0.05 * s, 0.05 * s, o.headC || o.c, { s: [0.85, 0.9, 1.15], n: 12 }); hk.ball(0.17 * s, 0, -0.06 * s, 0.28 * s, o.snoutC || o.headC || o.c, { s: [1, 0.8, 0.9], n: 10 });
    for (const sx of [-1, 1]) { hk.ball(0.04 * s, sx * 0.15 * s, 0.13 * s, 0.24 * s, '#1f1a22', { n: 6 }); hk.ball(0.09 * s, sx * 0.25 * s, 0.24 * s, -0.02 * s, o.earC || o.headC || o.c, { s: [1.6, 0.5, 0.9], n: 7, rz: sx * 0.3 }); if (o.horns) hk.cone(0.05 * s, 0.32 * s, sx * 0.1 * s, 0.25 * s, -0.04 * s, '#d9cfb8', { rx: -0.6, n: 5 }); }
    if (o.beard) hk.cone(0.06 * s, 0.18 * s, 0, -0.32 * s, 0.24 * s, o.c, { rx: Math.PI, n: 5 });
    head.add(hk.build());
    const legs = []; for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const l = part(g, sx * 0.22 * s, o.legH * s + 0.1 * s, sz * 0.42 * s * L), lk = new Kit(); lk.cyl(0.08 * s, (o.legH + 0.1) * s, 0, -(o.legH + 0.1) * s, 0, o.legC || o.c, { n: 6 }); lk.cyl(0.085 * s, 0.1 * s, 0, -(o.legH + 0.1) * s, 0, o.hoof || '#3b3330', { n: 6 }); l.add(lk.build()); legs.push(l); }
    return { group: g, head, legs, kind: o.kind };
  }
  const MAKE = {
    hen: () => hen(Math.random() < 0.5 ? '#ffffff' : '#b5703c'),
    goat: () => quad({ kind: 'goat', s: 0.8, legH: 0.55, c: '#f1ece2', horns: true, beard: true, snoutC: '#e8dfd0', len: 0.9 }),
    cow: () => quad({ kind: 'cow', s: 1.25, legH: 0.6, c: '#ffffff', patches: [[0.3, 0.1, 0.2, 0.3], [-0.3, 0.15, -0.3, 0.28], [0.1, 0.3, -0.5, 0.25]], patchC: '#2a2630', snoutC: '#f6c9cf', headC: '#ffffff', earC: '#2a2630', udder: true, len: 1.1, horns: true }),
    alpaca: () => quad({ kind: 'alpaca', s: 0.9, legH: 0.8, c: '#e9d6b4', wool: true, neck: 0.8, len: 0.85, snoutC: '#d9c39c' }),
    crab: () => { const g = new T.Group(), k = new Kit(); k.ball(0.22, 0, 0.14, 0, '#e8523a', { s: [1.4, 0.55, 1], n: 10 }); for (const s of [-1, 1]) { k.ball(0.09, s * 0.36, 0.16, 0.16, '#e8523a', { s: [1.2, 0.7, 1], n: 7 }); k.cyl(0.02, 0.14, s * 0.08, 0.2, 0.12, '#e8523a', { n: 4 }); k.ball(0.035, s * 0.08, 0.34, 0.12, '#1f1a22', { n: 5 }); for (let i = 0; i < 3; i++) k.cyl(0.015, 0.22, s * 0.3, 0.02, -0.1 + i * 0.1, '#c9402c', { n: 4, rz: s * 1.1 }); } g.add(k.build()); return { group: g, kind: 'crab', legs: [] }; },
    gull: () => { const g = new T.Group(), k = new Kit(); k.ball(0.2, 0, 0.36, 0, '#ffffff', { s: [0.8, 0.8, 1.4], n: 10 }); k.ball(0.12, 0, 0.58, 0.22, '#ffffff', { n: 8 }); k.cone(0.04, 0.14, 0, 0.56, 0.38, '#ffcf3a', { rx: Math.PI / 2, n: 5 }); for (const s of [-1, 1]) k.ball(0.03, s * 0.08, 0.62, 0.3, '#1f1a22', { n: 5 }); k.cone(0.09, 0.2, 0, 0.4, -0.32, '#2a2630', { rx: -2.1, n: 4 }); for (const s of [-1, 1]) k.cyl(0.015, 0.22, s * 0.06, 0, 0, '#f2a33a', { n: 4 }); g.add(k.build()); const wings = []; for (const s of [-1, 1]) { const w = part(g, s * 0.16, 0.42, 0), wk = new Kit(); wk.box(0.5, 0.03, 0.26, s * 0.25, 0, 0, '#cfd6de', { r: 0.02 }); wk.box(0.14, 0.035, 0.26, s * 0.45, 0, 0, '#2a2630', { r: 0.02 }); w.add(wk.build()); wings.push(w); } return { group: g, kind: 'gull', wings, legs: [] }; },
    seal: () => { const g = new T.Group(), k = new Kit(); k.ball(0.6, 0, 0.42, 0, '#7d7a86', { s: [0.9, 0.7, 1.7], n: 12 }); k.cone(0.3, 0.6, 0, 0.3, -1.1, '#6c6975', { rx: -1.7, n: 6 }); for (const s of [-1, 1]) k.ball(0.18, s * 0.5, 0.18, 0.4, '#6c6975', { s: [1.4, 0.4, 0.8], n: 7 }); g.add(k.build()); const head = part(g, 0, 0.75, 0.8), hk = new Kit(); hk.ball(0.34, 0, 0, 0, '#85828f', { n: 11 }); hk.ball(0.16, 0, -0.08, 0.26, '#a19eaa', { n: 8 }); hk.ball(0.04, 0, -0.02, 0.4, '#1f1a22', { n: 5 }); for (const s of [-1, 1]) hk.ball(0.05, s * 0.14, 0.08, 0.27, '#1f1a22', { n: 6 }); head.add(hk.build()); return { group: g, head, kind: 'seal', legs: [] }; },
    fish: () => { const g = new T.Group(), k = new Kit(); for (let i = 0; i < 7; i++) { const x = (i % 3 - 1) * 0.5 + (i > 3 ? 0.25 : 0), z = Math.floor(i / 3) * 0.45 - 0.4; k.ball(0.09, x, 0, z, i % 2 ? '#ffb43a' : '#7fd3ff', { s: [0.6, 0.8, 1.8], n: 6 }); k.cone(0.07, 0.12, x, 0, z - 0.2, i % 2 ? '#ffb43a' : '#7fd3ff', { rx: -Math.PI / 2, n: 4, s: [0.3, 1, 1] }); } g.add(k.build()); return { group: g, kind: 'fish', legs: [] }; },
    dolphin: () => { const g = new T.Group(), k = new Kit(); k.ball(0.45, 0, 0, 0, '#7f9cb5', { s: [0.8, 0.8, 2.6], n: 12 }); k.cone(0.12, 0.5, 0, 0.4, 0, '#6c88a0', { rx: -0.4, n: 5, s: [0.4, 1, 1] }); k.cone(0.1, 0.45, 0, 0, 1.25, '#7f9cb5', { rx: Math.PI / 2, n: 6 }); k.box(0.9, 0.06, 0.3, 0, 0, -1.2, '#6c88a0', { r: 0.03 }); k.ball(0.05, 0.22, 0.12, 0.8, '#1f1a22', { n: 5 }); k.ball(0.05, -0.22, 0.12, 0.8, '#1f1a22', { n: 5 }); g.add(k.build()); return { group: g, kind: 'dolphin', legs: [] }; }
  };

  /* ---------- the Beach cove: dunes and pōhutukawa at the back, golden sand, the sea in a cove that slopes down
     to deep blue, a reef along its mouth where the waves break, a rocky point with rock pools and a fishing ledge */
  function beach() {
    const W = 56, D = 48, R = rng(9301), k = new Kit(), lit = new Kit(), solids = [], spots = [], animals = [];
    const solid = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    const shoreZ = x => 27 + Math.sin(x * 0.15) * 1.6 + Math.sin(x * 0.37 + 1) * 0.6;
    const point = (x, z) => Math.exp(-((x - 5) ** 2) / 34 - ((z - 30) ** 2) / 300), east = (x, z) => Math.exp(-((x - W + 4) ** 2) / 24 - ((z - 35) ** 2) / 110);
    const POOLS = [[7.2, 24.5, 1.4], [9.6, 31.5, 1.15]];
    function h(x, z) {
      const dz = z - shoreZ(x);
      let y = dz < 0 ? Math.min(0.5, -dz * 0.045) + sm(12, 4, z) * (0.25 + 0.15 * Math.sin(x * 0.4) * Math.sin(z * 0.6)) : -Math.min(2.6, dz * 0.045 + dz * dz * 0.022); // (no kink at the water's edge: the sand runs on down under the sea)
      y += (Math.sin(x * 1.3) * Math.sin(z * 1.1)) * 0.02; // (ripples in the sand)
      // the rocky point and the east rocks rise out of the sand and the sea (only where they are: the seabed stays deep)
      const pt = point(x, z), ea = east(x, z);
      y += Math.max(0, 1.5 * pt - 0.15 + Math.sin(x * 2.1 + z * 1.7) * 0.06 * pt - y) * sm(0.04, 0.3, pt);
      y += Math.max(0, 1.0 * ea - 0.15 - y) * sm(0.04, 0.3, ea);
      const rim = Math.max(sm(D - 5.5, D - 1.2, z), sm(3, 0.8, x) * sm(20, 30, z), sm(W - 3, W - 0.8, x) * sm(22, 32, z));
      y = y + (0.22 + Math.sin(x * 1.7) * 0.08 - y) * rim;
      for (const [px, pz, pr] of POOLS) { const d = Math.hypot(x - px, z - pz) / pr; if (d < 1.25) y -= 0.55 * (1 - sm(0.6, 1.25, d)); }
      return y;
    }
    const isRock = (x, z) => point(x, z) > 0.42 || east(x, z) > 0.5 || (z > D - 4 && h(x, z) > -0.4) || ((x < 2.5 || x > W - 2.5) && z > 20);
    const colour = (x, z, y) => {
      const dz = z - shoreZ(x);
      if (isRock(x, z)) return y < -0.2 ? '#6f7a7e' : (Math.sin(x * 3 + z * 2) > 0.6 ? '#9a95a5' : '#8a8596');
      if (z < 10 && dz < -10) return Math.sin(x * 0.7) * Math.cos(z * 0.9) > 0.3 ? '#8fcf68' : '#7cc35a'; // dune grass
      if (dz < -1.5) return '#f2dca3';
      if (dz < 0.4) return '#dcc18c'; // wet sand
      if (y > -1.2) return Math.sin(x * 0.9 + z * 0.4) > 0.75 ? '#7c9a5a' : '#e3cf98'; // the sea's sandy bed, a little weed
      return Math.sin(x * 0.6) * Math.sin(z * 0.8) > 0.55 ? '#6b8a52' : '#cdb985';
    };
    const root = new T.Group();
    root.add(terrain(W, D, h, colour, 2));
    sides(k, W, D, R, '#b9a984'); root.add(skirt(W, D, h, y => (y > 0.3 ? '#c9b48a' : '#8f8a99')));
    // the sea: one sheet over the whole cove (it's clear: the bed, the weed, the fish show through), breaking on the reef
    root.add(LK.seaSheet(0.2, 14, W - 0.2, D - 0.2, 0, h, { n: 1.2, wave: { a: 0.16, k: 2.6, w: 1.4 }, brk: 1, foam: 0.35, deepAt: 2.0, shallow: '#86e8dc', deep: '#1f78c0', mud: '#e3cf98' }));
    // rock pools on the point, still and clear, a starfish and an anemone in each
    for (const [px, pz, pr] of POOLS) { const y0 = h(px + pr * 1.2, pz) - 0.06; root.add(LK.seaSheet(px - pr * 1.2, pz - pr * 1.2, px + pr * 1.2, pz + pr * 1.2, y0, h, { n: 6, foam: 0.05, deepAt: 0.5, shallow: '#9ff0e6', deep: '#3a9ac0', mud: '#8f8a99' })); k.ball(0.14, px + 0.3, y0 - 0.38, pz, '#ff8a3d', { s: [1.6, 0.3, 1.6], n: 6 }); k.ball(0.12, px - 0.4, y0 - 0.35, pz + 0.2, '#ff6fa0', { n: 7 }); solid(px - pr, pz - pr, px + pr, pz + pr); }
    // rocks: on the point, along the reef, on the east side
    for (let i = 0; i < 26; i++) { const x = 1 + R() * 9, z = 18 + R() * 26; if (point(x, z) > 0.35) rock(k, x, h(x, z) - 0.05, z, 0.35 + R() * 0.5, R); }
    for (let x = 2; x < W - 2; x += 1.4 + R()) rock(k, x, h(x, D - 2.4) - 0.1, D - 2.4 + R() * 1.2, 0.4 + R() * 0.5, R, '#7d7888');
    for (let i = 0; i < 10; i++) { const x = W - 1 - R() * 6, z = 26 + R() * 18; rock(k, x, h(x, z) - 0.05, z, 0.35 + R() * 0.45, R); }
    // the dunes: pōhutukawa, flax, a boardwalk from the arrival down to the sand
    for (const [x, z, s] of [[6, 5, 1.2], [15, 3.5, 1.0], [44, 3.8, 1.1], [52, 7, 1.0], [3.5, 13, 0.9]]) { pohutukawa(k, x, z, R, s, h(x, z) - 0.1); solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6); }
    for (let i = 0; i < 14; i++) { const x = 2 + R() * 52, z = 1.5 + R() * 8; if (Math.abs(x - 28) < 3) continue; for (let j = 0; j < 6; j++) k.cone(0.06, 0.9 + R() * 0.5, x + (R() - 0.5) * 0.4, h(x, z), z + (R() - 0.5) * 0.4, '#4f8a3c', { n: 3, rx: (R() - 0.5) * 0.6, rz: (R() - 0.5) * 0.6 }); }
    for (let z = 1.0; z < 15; z += 0.55) { const y = h(28, z) + 0.06; bx(k, 2.6, 0.08, 0.45, 28, y, z, '#c9a173', { r: 0.02 }); }
    for (const s of [-1.45, 1.45]) for (let z = 2; z < 14.5; z += 3) k.cyl(0.07, 0.8, 28 + s, h(28 + s, z), z, '#a97f55', { n: 5 });
    signpost(k, 25.2, 2.4, 'beach'); solid(24.9, 2.1, 25.5, 2.7);
    spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [26.6, 3.4], yaw: Math.PI, hit: [25.2, 2.4, 0, 2.4] });
    // the kiosk: ice creams, drinks, and fishing rods for hire, on the dune by the boardwalk
    k.at(41, h(41, 9), 9, 0, kk => {
      bx(kk, 5, 3.0, 3.4, 0, 0, 0, '#7fc8d8', { r: 0.08 }); bx(kk, 5.4, 0.25, 3.8, 0, 3.0, 0, '#ffffff', { r: 0.06 }); bx(kk, 4.2, 1.4, 0.2, 0, 1.2, 1.72, '#355b6a');
      bx(kk, 5.0, 0.15, 0.9, 0, 1.1, 2.1, '#f4ead8', { r: 0.03 });
      for (let i = 0; i < 9; i++) bx(kk, 0.6, 0.08, 1.6, -2.4 + i * 0.6, 2.75, 2.4, i % 2 ? '#ffffff' : '#ff7aa2', { rx: -0.35 });
      kk.ball(0.4, -1.6, 3.6, 0.4, '#ffd6e6', { n: 8 }); kk.cone(0.34, 0.8, -1.6, 2.9, 0.4, '#e8b77a', { rx: Math.PI, n: 8 });
    });
    board(k, 'kiosk', 'Surf & Scoops 🍦', 'ice cream · drinks · rods', '#fff6e0', '#e85a7a', 4.4, 1.1, 41, h(41, 9) + 3.9, 10.75);
    solid(38.3, 7.1, 43.7, 10.9); spots.push({ kind: 'kiosk', id: 'kiosk', name: 'Surf & Scoops', at: [41, 12.6], yaw: Math.PI, hit: [41, 10.6, 0, 4.6], npcPose: 'look' });
    // towels and umbrellas, a driftwood log to sit on, a sandcastle spot, the water's edge, the rock pools, the ledge
    for (const [x, z, c, ry] of [[17, 18.5, '#ff7aa2', 0.2], [23.5, 20, '#7cc8e8', -0.15], [35, 18.5, '#ffd35a', 0.1]]) {
      k.at(x, h(x, z) + 0.02, z, ry, kk => { bx(kk, 1.6, 0.03, 3.0, 0, 0, 0, c); for (let i = 0; i < 5; i++) bx(kk, 1.6, 0.032, 0.2, 0, 0, -1.2 + i * 0.6, '#ffffff'); kk.cyl(0.05, 3.2, 1.2, 0, -1.2, '#e8e2d8', { n: 5 }); kk.cone(1.8, 0.8, 1.2, 2.8, -1.2, c, { n: 10 }); });
      spots.push({ kind: 'towel', id: 'towel' + x, name: 'a beach towel', at: [x, z + 0.3], yaw: Math.PI, hit: [x, z, 0, 2.4], npcPose: 'sit' });
    }
    k.cyl(0.38, 4.2, 44, h(44, 21) + 0.3, 21, '#b8a48a', { n: 8, rz: Math.PI / 2, ry: 0.3 }); solid(42, 20.4, 46, 21.6);
    spots.push({ kind: 'log', id: 'log', name: 'the driftwood log', seat: [44, 21.9], at: [44, 22.8], yaw: 0, hit: [44, 21, 0, 3] });
    spots.push({ kind: 'castle', id: 'castle', name: 'a good spot for a sandcastle', at: [29, 23.4], yaw: Math.PI, hit: [29, 24.6, 0, 2.6], npcPose: 'toys' });
    spots.push({ kind: 'swim', id: 'swim', name: 'the water', at: [31, shoreZ(31) - 0.6], yaw: 0, hit: [31, shoreZ(31) + 3, 0, 6], npcPose: 'splash', swimTo: [31, shoreZ(31) + 4.5] });
    for (const [px, pz] of POOLS) spots.push({ kind: 'rockpool', id: 'pool' + px, name: 'a rock pool', at: [px + 1.9, pz + 0.6], yaw: -Math.PI / 2, hit: [px, pz, 0, 2.6], npcPose: 'look' });
    spots.push({ kind: 'fish', id: 'ledge', name: 'the fishing ledge', at: [6.2, 38.6], yaw: Math.PI * 0.6, hit: [6.2, 39.4, 0, 2.4], noNpc: true });
    // beach life: crabs on the wet sand, gulls on the dry, a seal asleep on the east rocks, fish in the shallows,
    // dolphins out by the reef
    for (let i = 0; i < 3; i++) { const a = MAKE.crab(), x = 14 + i * 9, z = shoreZ(x) - 0.8; a.home = [x, z]; a.group.position.set(x, h(x, z), z); animals.push(a); }
    for (let i = 0; i < 3; i++) { const a = MAKE.gull(), x = 12 + i * 12, z = 16 + i * 1.5; a.home = [x, z]; a.group.position.set(x, h(x, z), z); animals.push(a); }
    { const a = MAKE.seal(), x = W - 4.2, z = 35; a.group.position.set(x, h(x, z) - 0.05, z); a.group.rotation.y = -2.2; a.fixed = true; animals.push(a); solid(x - 1.4, z - 1.4, x + 1.4, z + 1.4); }
    for (let i = 0; i < 2; i++) { const a = MAKE.fish(), c = [20 + i * 16, 32 + i * 2]; a.home = c; a.group.position.set(c[0], -0.7, c[1]); a.under = true; animals.push(a); }
    { const a = MAKE.dolphin(); a.home = [30, 42]; a.group.position.set(30, -2, 42); a.sea = true; animals.push(a); }
    root.add(k.build(), Object.assign(lit.build(), { visible: false }));
    for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 3.5, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, h(x, z) + 1.5, z); m.userData.spot = s; root.add(m); }
    for (const a of animals) root.add(a.group);
    const walk = (x, z) => { const y = h(x, z); if (y < -0.8) return false; const e = 0.35, g = Math.hypot(h(x + e, z) - h(x - e, z), h(x, z + e) - h(x, z - e)) / (2 * e); return g < 0.75; };
    return { id: 'beach', title: 'Beach cove', sub: 'Vacation island · tap the signpost to travel', kind: 'vacation', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids, pond: null, bridges: [], spots, buildings: [], arrive: [28, 3.6], lawns: [], paths: [], height: h, walk, animals, npc: 5, wet: (x, z) => Math.max(0, -h(x, z)), centre: [28, 22] };
  }

  /* ---------- the Farm paddock: a red barn, a chicken coop and run, a big post-and-rail paddock with a water
     trough and hay, a milking stand, a shearing shed, a windmill pump; the home's own grass on the pasture */
  function farm(st) {
    const W = 52, D = 44, R = rng(5150), k = new Kit(), lit = new Kit(), solids = [], spots = [], animals = [], lawns = [], paths = [];
    const solid = (x0, z0, x1, z1) => solids.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]);
    const root = new T.Group();
    bx(k, W, 0.42, D, W / 2, -0.42, D / 2, '#9a7a52', { r: 0.18, seg: 2 }); sides(k, W, D, R, '#8a7452');
    // the ground: a dirt track from the arrival past the barn, the yard, the pasture (the home's grass grows on it)
    bx(k, W - 0.4, 0.04, D - 0.4, W / 2, 0, D / 2, '#7fbf5c', { r: 0.02 });
    const track = [[24, 0.4, 28, 16], [6, 13, 46, 17]]; for (const [x0, z0, x1, z1] of track) { bx(k, x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, 0.02, (z0 + z1) / 2, '#b89668', { r: 0.03 }); paths.push([x0, z0, x1, z1]); }
    for (let i = 0; i < 30; i++) k.ball(0.07, 24.4 + R() * 3.2, 0.06, 1 + R() * 14, '#9c7c55', { s: [1, 0.3, 1], n: 5 });
    lawns.push([1, 18, 51, 43], [1, 1, 23, 12.5], [29, 1, 51, 12.5]);
    // the barn: red, white trim, big doors, a hay loft; the farm's shop (animals and feed) is inside its doors
    k.at(12, 0, 6, 0, kk => {
      bx(kk, 10, 5.2, 7, 0, 0, 0, '#b8402f', { r: 0.06 }); for (let i = 0; i < 12; i++) bx(kk, 0.06, 5.2, 0.04, -4.6 + i * 0.84, 0, 3.52, '#9c3426');
      kk.at(0, 5.2, 0, 0, k2 => { for (const s of [-1, 1]) bx(k2, 5.9, 0.3, 7.6, s * 2.45, 1.0, 0, '#5a4a4a', { rz: s * -0.62, r: 0.04 }); bx(k2, 9.6, 2.6, 0.2, 0, 0, 3.4, '#b8402f'); });
      for (const s of [-1, 1]) { bx(kk, 2.0, 3.6, 0.14, s * 1.05, 0, 3.55, '#9c3426'); bx(kk, 2.0, 0.14, 0.16, s * 1.05, 1.8, 3.6, '#ffffff'); bx(kk, 0.14, 3.6, 0.16, s * 1.98, 0, 3.6, '#ffffff'); kk.box(2.4, 0.14, 0.16, s * 1.05, 1.8, 3.62, '#ffffff', { rz: s * 1.0 }); }
      bx(kk, 1.8, 1.4, 0.14, 0, 6.0, 3.56, '#3d2a24'); for (let i = 0; i < 3; i++) bx(kk, 0.5, 0.4, 0.5, -0.5 + i * 0.5, 6.0, 3.3, '#e8c45a');
    });
    board(k, 'barn', 'FARM SHOP', 'animals · feed', '#fff6e0', '#b8402f', 3.6, 1.0, 12, 4.4, 9.62);
    solid(7, 2.5, 17, 9.5); spots.push({ kind: 'barn', id: 'barn', name: 'the barn', at: [12, 10.8], yaw: Math.PI, hit: [12, 9.6, 0, 4] });
    // the coop and its run (hens inside the wire)
    k.at(36, 0, 4.2, 0, kk => { bx(kk, 3.4, 2.2, 2.4, 0, 0.5, 0, '#f2e1b8', { r: 0.05 }); for (const s of [-1, 1]) for (const z of [-1, 1]) kk.cyl(0.08, 0.55, s * 1.5, 0, z * 1.0, '#8a6038', { n: 5 }); kk.cone(2.6, 1.0, 0, 2.7, 0, '#5a7aa8', { n: 4, ry: Math.PI / 4, s: [1, 1, 0.8] }); bx(kk, 0.6, 0.7, 0.1, 0, 0.9, 1.22, '#3d2a24'); kk.box(0.4, 0.06, 1.4, 0, 0.3, 1.8, '#c9a173', { rx: 0.5 }); bx(kk, 0.8, 0.5, 0.6, 1.9, 0.7, 0, '#d8c39a'); });
    for (const [x0, z0, x1, z1] of [[31, 1.2, 45, 1.2], [31, 11.6, 45, 11.6], [31, 1.2, 31, 11.6], [45, 1.2, 45, 11.6]]) {
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.6)); for (let i = 0; i <= n; i++) k.cyl(0.07, 1.4, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n, '#8a6038', { n: 5 });
      k.box(Math.hypot(x1 - x0, z1 - z0) + 0.1, 1.3, 0.02, (x0 + x1) / 2, 0.05, (z0 + z1) / 2, '#d9e2e8', { ry: -Math.atan2(z1 - z0, x1 - x0) });
    }
    solid(30.6, 0.8, 45.4, 1.6); solid(30.6, 11.2, 45.4, 12.0); solid(30.6, 0.8, 31.4, 12.0); solid(44.6, 0.8, 45.4, 12.0); solid(34.2, 2.9, 38.2, 5.6);
    spots.push({ kind: 'coop', id: 'coop', name: 'the hen house', at: [38, 13.2], yaw: Math.PI, hit: [36, 6, 0, 5] });
    // the paddock: post and rail all round, a gate by the track, a trough, hay bales, a big shade tree
    const P = [5, 19, 47, 41];
    const rail = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.round(L / 2.2), ry = -Math.atan2(z1 - z0, x1 - x0); for (let i = 0; i <= n; i++) bx(k, 0.22, 1.5, 0.22, x0 + (x1 - x0) * i / n, 0, z0 + (z1 - z0) * i / n, '#e9e2d4'); for (const y of [0.55, 1.15]) k.box(L, 0.14, 0.08, (x0 + x1) / 2, y, (z0 + z1) / 2, '#e9e2d4', { ry }); };
    rail(P[0], P[1], 24, P[1]); rail(28, P[1], P[2], P[1]); rail(P[0], P[3], P[2], P[3]); rail(P[0], P[1], P[0], P[3]); rail(P[2], P[1], P[2], P[3]);
    for (const [x0, z0, x1, z1] of [[P[0], P[1], 24, P[1]], [28, P[1], P[2], P[1]], [P[0], P[3], P[2], P[3]], [P[0], P[1], P[0], P[3]], [P[2], P[1], P[2], P[3]]]) solid(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2);
    k.at(26, 0, P[1], 0, kk => { for (let i = 0; i < 4; i++) bx(kk, 3.6, 0.12, 0.08, 0, 0.3 + i * 0.32, 0, '#c9a173'); kk.box(3.8, 0.12, 0.08, 0, 0.7, 0, '#c9a173', { rz: 0.38 }); }); // (the gate, open)
    k.at(16, 0, 24, 0, kk => { bx(kk, 3.2, 0.8, 1.0, 0, 0, 0, '#8f9aa8', { r: 0.06 }); }); k.waterBox(2.9, 0.1, 0.7, 16, 0.62, 24, { tint: '#6fc0d8' }); solid(14.2, 23.3, 17.8, 24.7);
    spots.push({ kind: 'trough', id: 'trough', name: 'the water trough and feed bins', at: [16, 25.6], yaw: Math.PI, hit: [16, 24, 0, 3.2] });
    for (const [x, z, ry] of [[40, 23, 0.3], [42.4, 24.2, 1.2], [41, 25.5, 0.6]]) { k.cyl(0.75, 1.3, x, 0, z, '#e8c45a', { n: 12, rz: Math.PI / 2, ry }); solid(x - 0.9, z - 0.9, x + 0.9, z + 0.9); }
    for (const [x, z] of [[9, 37], [44, 37.5]]) { k.cyl(0.4, 2.4, x, 0, z, '#6b4a33', { n: 7 }); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; k.ball(1.3, x + Math.cos(a) * 1.2, 3.3 + R() * 0.6, z + Math.sin(a) * 1.0, i % 2 ? '#4f9a3c' : '#5fae4a', { n: 9 }); } solid(x - 0.6, z - 0.6, x + 0.6, z + 0.6); }
    // the milking stand and the shearing shed, by the paddock's fence
    k.at(20, 0, 30, 0, kk => { bx(kk, 2.6, 0.3, 1.4, 0, 0, 0, '#c9a173'); for (const s of [-1, 1]) bx(kk, 0.15, 1.6, 0.15, s * 1.2, 0, -0.6, '#8a6038'); bx(kk, 2.6, 0.15, 0.15, 0, 1.5, -0.6, '#8a6038'); kk.cyl(0.25, 0.4, 0.8, 0.3, 0.6, '#c9ccd2', { n: 10 }); kk.cyl(0.22, 0.45, -0.9, 0, 0.6, '#6b4a33', { n: 8 }); });
    solid(18.6, 29.3, 21.4, 30.4); spots.push({ kind: 'milk', id: 'milk', name: 'the milking stand', at: [20, 31.6], yaw: Math.PI, hit: [20, 30, 0, 3] });
    k.at(33, 0, 32, 0, kk => { bx(kk, 4, 2.4, 3, 0, 0, 0, '#c9b28a', { r: 0.05 }); kk.cone(3.0, 1.1, 0, 2.4, 0, '#7a6a5a', { n: 4, ry: Math.PI / 4, s: [1.15, 1, 0.85] }); bx(kk, 1.6, 1.8, 0.1, 0, 0, 1.52, '#5a4632'); for (let i = 0; i < 3; i++) kk.ball(0.3, -1.2 + i * 0.5, 0.3, 1.9, '#f4ecdc', { n: 7 }); });
    solid(30.8, 30.3, 35.2, 33.7); spots.push({ kind: 'shear', id: 'shear', name: 'the shearing shed', at: [33, 34.8], yaw: Math.PI, hit: [33, 32, 0, 3.6] });
    // the windmill pump by the barn, its blades turning (village.js turns parts with userData.spin)
    k.at(3.2, 0, 15, 0, kk => { for (const [a, b] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) kk.box(0.1, 7.4, 0.1, a * 0.6, 0, b * 0.6, '#8a8f98', { rx: b * -0.08, rz: a * 0.08 }); bx(kk, 0.6, 0.5, 0.6, 0, 7.2, 0, '#8a8f98'); });
    const blades = new Kit(); for (let i = 0; i < 12; i++) blades.box(0.32, 2.2, 0.04, 0, 1.1, 0, i % 2 ? '#e9e2d4' : '#c9ccd2', { rz: i / 12 * Math.PI * 2, s: [1, 1, 1] }); const bl = blades.build(); bl.position.set(3.2, 7.45, 15.5); bl.userData.spin = 1.4; root.add(bl);
    solid(2.2, 14, 4.2, 16);
    signpost(k, 22.4, 2.4, 'farm'); solid(22.1, 2.1, 22.7, 2.7);
    spots.push({ kind: 'travel', id: 'post', name: 'the signpost', at: [23.8, 3.6], yaw: Math.PI, hit: [22.4, 2.4, 0, 2.4] });
    // a tractor parked by the barn, a wheelbarrow, milk churns
    k.at(20.5, 0, 12.6, -0.4, kk => { bx(kk, 1.6, 0.9, 2.6, 0, 0.7, 0, '#d8433a', { r: 0.1 }); bx(kk, 1.3, 1.1, 1.2, 0, 1.6, -0.5, '#d8433a', { r: 0.08 }); kk.glassBox(1.2, 0.8, 1.1, 0, 1.8, -0.5, {}); for (const s of [-1, 1]) { kk.cyl(0.65, 0.4, s * 0.95, 0.65, -0.7, '#2a2630', { n: 12, rz: Math.PI / 2 }); kk.cyl(0.4, 0.3, s * 0.85, 0.4, 0.8, '#2a2630', { n: 10, rz: Math.PI / 2 }); } });
    solid(19, 10.9, 22, 14.3);
    for (const [x, z] of [[18.2, 3.0], [18.9, 3.3]]) { k.cyl(0.3, 0.9, x, 0, z, '#c9ccd2', { n: 10 }); k.cyl(0.2, 0.2, x, 0.9, z, '#c9ccd2', { n: 8 }); } solid(17.8, 2.6, 19.3, 3.7);
    // the animals: each in its own place (hens in the run, the rest in the paddock), as many as the kid has
    const own = (st && st.animals) || { hen: 3, goat: 1 };
    const pens = { hen: [31.8, 2.0, 44.2, 10.8], goat: [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1], cow: [P[0] + 1.5, P[1] + 1.5, P[2] - 1.5, P[3] - 1.5], alpaca: [P[0] + 1, P[1] + 1, P[2] - 1, P[3] - 1] };
    for (const kind of ['hen', 'goat', 'cow', 'alpaca']) for (let i = 0; i < (own[kind] || 0); i++) {
      const a = MAKE[kind](), pen = pens[kind]; let x = 0, z = 0; for (let q = 0; q < 30; q++) { x = pen[0] + R() * (pen[2] - pen[0]); z = pen[1] + R() * (pen[3] - pen[1]); if (!solids.some(r => x > r[0] - 1 && x < r[2] + 1 && z > r[1] - 1 && z < r[3] + 1)) break; }
      a.pen = pen; a.group.position.set(x, 0, z); a.group.rotation.y = R() * 6.28; animals.push(a);
    }
    root.add(k.build(), Object.assign(lit.build(), { visible: false }));
    for (const s of spots) if (s.hit) { const [x, z, , w] = s.hit, m = new T.Mesh(new T.BoxGeometry(w, 4, w), new T.MeshBasicMaterial()); m.visible = false; m.position.set(x, 2, z); m.userData.spot = s; root.add(m); }
    for (const a of animals) root.add(a.group);
    // the kid can walk in the paddock (in through its gate) among the animals; the hens' run is theirs
    const walk = (x, z) => !(x > 31.2 && x < 44.8 && z > 1.4 && z < 11.4);
    return { id: 'farm', title: 'Farm paddock', sub: 'Utility island · tap the signpost to travel', kind: 'utility', root, lits: [], bounds: { x0: 0, z0: 0, x1: W, z1: D }, solids, pond: null, bridges: [], spots, buildings: [], arrive: [26, 3.6], lawns, paths, walk, animals, pens, npc: 0, centre: [26, 18], growth: 0.55, welcome: 'Look after the animals, and collect what they make.' };
  }

  const BUILD = { beach, farm };
  // islands-more.js adds the rest with add(id, fn), built from the same pieces
  IH.islandsBuild = { LIST, build: (id, st) => (BUILD[id] ? BUILD[id](st) : null), add: (id, fn) => { BUILD[id] = fn; const i = LIST.find(q => q.id === id); if (i) i.built = true; }, MAKE,
    kit: { rng, bx, sm, terrain, sides, skirt, signTex, board, signpost, pohutukawa, rock, quad, part } };
})();
