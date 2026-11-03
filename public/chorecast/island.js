/* Chorecast island, part two: the 3D models for the bigger island shop (catalog.js), the chore tree types, the new
   pieces of land, house styles, fences, paths, the name sign and sky magic. index.html's 3D layer calls
   window.ChorecastIsland(kit) with its own drawing helpers, so everything here shares the island's toon shading and
   ink outlines. Models face +z, sit on y = 0 and use the same scale as the first shop (an animal is about 0.2 tall). */
window.ChorecastIsland = K => {
  const { T, add, mat, SM, sph, cyl, bx, cn, eyes, rough, sprite, emojiTex, GOLD, horse, barn, WOOD, DARK } = K;
  const PI = Math.PI, P2 = PI / 2;
  const ring = (n, f) => { for (let i = 0; i < n; i++) f(i / n * PI * 2, i); };
  const tor = (g, r, t, c, x, y, z, arc = PI * 2) => add(g, new T.TorusGeometry(r, t, 8, 28, arc), SM(c), x, y, z);
  const disc = (g, r, c, x, y, z, h = 0.012, seg = 24) => cyl(g, r, r, h, c, x, y, z, seg);
  const tilt = (o, rx = 0, ry = 0, rz = 0) => { o.rotation.set(rx, ry, rz); return o; };
  const stick = (g, a, b, r, c) => { const v = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), o = add(g, new T.CylinderGeometry(r, r, v.length(), 6), mat(c), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return o; };
  const glow = (g, r, c, x, y, z) => { const o = add(g, new T.SphereGeometry(r, 10, 8), mat(c, { e: c }), x, y, z); o.userData.noInk = true; return o; };
  const emo = (g, e, s, x, y, z) => { const sp = sprite(emojiTex(e), s); sp.position.set(x, y, z); g.add(sp); return sp; };
  const blob = (g, r, c, x, y, z, seed = 1) => add(g, rough(new T.IcosahedronGeometry(r, 1), r * 0.15, seed), mat(c), x, y, z);
  // Pools, ponds and troughs on shop items: the island's water shader at a fixed depth.
  const WM = {}, water = c => WM[c || 0] || (WM[c || 0] = K.waterMat({ flat: 0.05, deepAt: 0.08, scale: 14, ...(c ? { shallow: c } : {}) }));
  const tick = (g, f) => { const own = g.userData.tick; g.userData.tick = own ? (t, dt) => { own(t, dt); f(t, dt); } : f; };

  /* ---------- Animal builders ---------- */
  // A four-legged animal. s scales it (1 is cat-sized); len stretches the body; ears, tail and spots are options.
  function quad(g, o) {
    const s = o.s || 1, L = o.len || 1.25, leg = (o.leg ?? 0.06) * s, by = leg + 0.055 * s, bz = 0.07 * s * L;
    sph(g, 0.07 * s, o.c, 0, by, 0, o.w || 0.9, o.h || 0.8, L);
    if (o.belly) sph(g, 0.055 * s, o.belly, 0, by - 0.018 * s, 0.01 * s, 0.75, 0.55, L * 0.85);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => cyl(g, 0.012 * s, 0.011 * s, leg + 0.03 * s, o.legs || o.c, sx * 0.034 * s, (leg + 0.03 * s) / 2, sz * 0.045 * s * L, 6));
    const nk = (o.neck || 0) * s, hy = by + 0.045 * s + nk, hz = bz + 0.03 * s + nk * 0.3, hr = 0.045 * s * (o.hs || 1);
    if (nk) tilt(cyl(g, 0.024 * s, 0.03 * s, nk + 0.05 * s, o.c, 0, by + nk * 0.5 + 0.02 * s, bz * 0.8, 8), 0.35);
    sph(g, hr, o.head || o.c, 0, hy, hz);
    if (o.snout) sph(g, hr * 0.5, o.snout, 0, hy - hr * 0.25, hz + hr * 0.85, 1, 0.8, o.snoutL || 1.2);
    sph(g, hr * 0.16, o.nose || 0x222222, 0, hy - hr * 0.1, hz + hr * (o.snout ? 0.85 + 0.6 * (o.snoutL || 1.2) : 1.0));
    const ec = o.earC || o.head || o.c;
    if (o.ears === 'round') [-1, 1].forEach(sx => sph(g, hr * 0.38, ec, sx * hr * 0.7, hy + hr * 0.75, hz - hr * 0.1, 1, 1, 0.5));
    else if (o.ears === 'long') [-1, 1].forEach(sx => { sph(g, hr * 0.3, ec, sx * hr * 0.45, hy + hr * 1.3, hz - hr * 0.2, 0.8, 2.6, 0.6).rotation.z = -sx * 0.2; });
    else if (o.ears === 'point') [-1, 1].forEach(sx => cn(g, hr * 0.32, hr * 0.8, ec, sx * hr * 0.55, hy + hr * 0.95, hz - hr * 0.1, 5));
    else if (o.ears === 'flop') [-1, 1].forEach(sx => sph(g, hr * 0.32, ec, sx * hr * 0.95, hy - hr * 0.05, hz - hr * 0.1, 0.7, 1.6, 0.7));
    const tc = o.tailC || o.c;
    if (o.tail === 'long') tilt(cyl(g, 0.008 * s, 0.012 * s, 0.11 * s, tc, 0, by + 0.01 * s, -bz - 0.04 * s, 5), -1.0);
    else if (o.tail === 'fluffy') sph(g, 0.03 * s, tc, 0, by + 0.02 * s, -bz - 0.02 * s, 0.8, 0.8, 1.6);
    else if (o.tail === 'stub') sph(g, 0.018 * s, tc, 0, by + 0.01 * s, -bz);
    (o.spots || []).forEach(([x, y, z, r]) => sph(g, r * s, o.spotC || 0x222222, x * s, by + y * s, z * s, 1, 0.6, 1));
    eyes(g, hy + hr * 0.2, hz + hr * 0.8, hr * 0.42, 0.007 * s);
    return { hy, hz, hr, by, s };
  }
  // A bird: plump body, wings at the sides, a beak pointing +z. Tails: short, fan, long, lyre or turkey.
  function bird(g, o) {
    const s = o.s || 1, leg = (o.leg ?? 0.035) * s, by = leg + 0.05 * s, tc = o.tailC || o.wing || o.c;
    sph(g, 0.055 * s, o.c, 0, by, 0, 0.85, 0.9, 1.15);
    if (o.belly) sph(g, 0.045 * s, o.belly, 0, by - 0.008 * s, 0.022 * s, 0.75, 0.85, 0.7);
    const wings = [-1, 1].map(sx => { const w = new T.Group(); w.position.set(sx * 0.045 * s, by + 0.012 * s, -0.008 * s); sph(w, 0.03 * s, o.wing || o.c, 0, -0.004 * s, 0, 0.35, 0.75, 1.25); g.add(w); return w; });
    const nk = (o.neck || 0) * s, hy = by + 0.055 * s + nk, hz = 0.035 * s + nk * 0.15, hr = 0.034 * s * (o.hs || 1);
    if (nk) cyl(g, 0.014 * s, 0.022 * s, nk + 0.03 * s, o.neckC || o.c, 0, by + 0.03 * s + nk / 2, 0.03 * s, 7);
    sph(g, hr, o.head || o.c, 0, hy, hz);
    const bl = (o.beak || 0.028) * s;
    tilt(cn(g, 0.011 * s * (o.bw || 1), bl, o.beakC || 0xffa94d, 0, hy - hr * 0.15, hz + hr + bl * 0.35, 6), P2 + (o.hook ? 0.5 : 0));
    if (o.tuft) sph(g, 0.012 * s, 0xffffff, 0, hy - hr * 0.9, hz + hr * 0.6);
    if (o.crest) for (let i = 0; i < 3; i++) sph(g, 0.012 * s, o.crest, 0, hy + hr * (0.9 + i * 0.05), hz - hr * (0.1 + i * 0.35), 0.6, 1, 1);
    if (o.tail === 'fan') for (let i = -2; i <= 2; i++) tilt(bx(g, 0.016 * s, 0.004 * s, 0.075 * s, tc, i * 0.016 * s, by + 0.02 * s, -0.08 * s), 0.35, i * 0.28, 0);
    else if (o.tail === 'long') tilt(cn(g, 0.022 * s, 0.1 * s, tc, 0, by + 0.005 * s, -0.09 * s, 6), -P2 - 0.25);
    else if (o.tail === 'lyre') { [-1, 1].forEach(sx => tilt(tor(g, 0.06 * s, 0.006 * s, tc, sx * 0.03 * s, by + 0.08 * s, -0.08 * s, PI), 0, P2, sx * 0.3)); for (let i = -2; i <= 2; i++) tilt(cyl(g, 0.002 * s, 0.002 * s, 0.15 * s, 0xd8c9a8, i * 0.012 * s, by + 0.08 * s, -0.08 * s, 3), -0.3, 0, i * 0.12); }
    else if (o.tail === 'turkey') ring(9, (a, i) => { if (i > 4) return; const ang = (i - 2) * 0.36; tilt(sph(g, 0.03 * s, i % 2 ? 0x8a5a3c : 0xc8843c, Math.sin(ang) * 0.07 * s, by + 0.05 * s + Math.cos(ang) * 0.07 * s, -0.06 * s, 0.35, 1.6, 0.25), 0, 0, -ang); });
    else tilt(cn(g, 0.018 * s, 0.05 * s, tc, 0, by + 0.01 * s, -0.065 * s, 5), -P2 - 0.4);
    if (o.bigEyes) [-1, 1].forEach(sx => { sph(g, hr * 0.32, 0xffd43b, sx * hr * 0.42, hy + hr * 0.12, hz + hr * 0.78, 1, 1, 0.4); sph(g, hr * 0.15, 0x1b1b2a, sx * hr * 0.42, hy + hr * 0.12, hz + hr * 0.9); });
    else eyes(g, hy + hr * 0.2, hz + hr * 0.75, hr * 0.5, 0.006 * s);
    [-1, 1].forEach(sx => cyl(g, 0.005 * s, 0.005 * s, leg + 0.02 * s, o.legC || 0xffa94d, sx * 0.02 * s, (leg + 0.02 * s) / 2, 0, 5));
    if (o.flap) tick(g, t => wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.2 + Math.sin(t * 10) * 0.4); }));
    return { hy, hz, hr, by, wings };
  }
  function lizard(g, o) {
    const s = o.s || 1;
    for (let i = 0; i < 3; i++) sph(g, (0.032 - i * 0.004) * s, o.c, 0, 0.03 * s, (0.04 - i * 0.045) * s, 1, 0.55, 1.4);
    tilt(cn(g, 0.014 * s, 0.13 * s, o.c, 0, 0.022 * s, -0.16 * s, 6), -P2);
    sph(g, 0.03 * s, o.c, 0, 0.038 * s, 0.09 * s, 1, 0.7, 1.35);
    [[-1, 0.05], [1, 0.05], [-1, -0.05], [1, -0.05]].forEach(([sx, z]) => tilt(cyl(g, 0.007 * s, 0.006 * s, 0.05 * s, o.c, sx * 0.035 * s, 0.015 * s, z * s, 5), 0, 0, sx * 1.1));
    if (o.spines) for (let i = 0; i < 7; i++) cn(g, 0.006 * s, 0.025 * s, o.spines, 0, 0.05 * s, (0.1 - i * 0.03) * s, 4);
    if (o.spots) for (let i = 0; i < 5; i++) sph(g, 0.007 * s, o.spots, ((i % 2) - 0.5) * 0.03 * s, 0.045 * s, (0.04 - i * 0.03) * s);
    eyes(g, 0.055 * s, 0.11 * s, 0.018 * s, 0.006 * s);
  }
  function shellie(g, o) { // tortoises and turtles
    const s = o.s || 1;
    add(g, new T.SphereGeometry(0.07 * s, 16, 10, 0, PI * 2, 0, PI / 2), SM(o.shell), 0, 0.02 * s, 0).scale.set(1, 0.75, 1.15);
    for (let i = 0; i < 5; i++) { const a = i * 1.26; sph(g, 0.014 * s, o.spot, Math.cos(a) * 0.035 * s, 0.065 * s, Math.sin(a) * 0.04 * s, 1, 0.4, 1); }
    sph(g, 0.012 * s, o.spot, 0, 0.075 * s, 0, 1, 0.4, 1);
    sph(g, 0.024 * s, o.c, 0, 0.035 * s, 0.09 * s, 1, 0.9, 1.2);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => sph(g, 0.017 * s, o.c, sx * 0.055 * s, 0.015 * s, sz * 0.05 * s, o.flip ? 1.8 : 1, 0.5, o.flip ? 0.7 : 1));
    eyes(g, 0.045 * s, 0.11 * s, 0.013 * s, 0.005 * s);
  }
  function fishy(g, o) {
    const s = o.s || 1, f = new T.Group(); f.position.y = o.y ?? 0.03; g.add(f);
    sph(f, 0.035 * s, o.c, 0, 0, 0, 0.6, 0.9, 1.4);
    tilt(cn(f, 0.03 * s, 0.04 * s, o.fin || o.c, 0, 0, -0.06 * s, 4), -P2);
    tilt(cn(f, 0.012 * s, 0.03 * s, o.fin || o.c, 0, 0.03 * s, -0.005 * s, 4), 0, 0, 0);
    eyes(f, 0.008 * s, 0.035 * s, 0.014 * s, 0.005 * s);
    tick(g, t => { f.rotation.y = Math.sin(t * 6) * 0.25; });
  }
  function spiky(g, o) { // hedgehog and echidna
    const s = o.s || 1;
    sph(g, 0.07 * s, o.c, 0, 0.055 * s, 0, 1, 0.8, 1.2);
    for (let i = 0; i < 26; i++) { const a = i * 2.4, b = 0.3 + (i % 5) * 0.22, x = Math.cos(a) * Math.sin(b), y = Math.cos(b), z = Math.sin(a) * Math.sin(b) - 0.2; const sp = cn(g, 0.01 * s, 0.045 * s, o.spine, x * 0.06 * s, 0.055 * s + y * 0.05 * s, z * 0.07 * s, 4); sp.lookAt(x * 2, 1 + y * 2, z * 2 - 0.5); sp.rotateX(P2); }
    sph(g, 0.03 * s, o.face, 0, 0.045 * s, 0.075 * s, 0.9, 0.85, 1.2);
    if (o.snout) tilt(cyl(g, 0.006 * s, 0.009 * s, 0.05 * s, 0x2b2b35, 0, 0.04 * s, 0.11 * s, 5), P2 + 0.2);
    else sph(g, 0.009 * s, 0x222222, 0, 0.045 * s, 0.11 * s);
    eyes(g, 0.058 * s, 0.098 * s, 0.016 * s, 0.006 * s);
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => cyl(g, 0.008 * s, 0.008 * s, 0.02 * s, o.face, sx * 0.04 * s, 0.01 * s, sz * 0.04 * s, 5));
  }
  function roo(g, o) { // kangaroos and wallabies stand up on big back feet
    const s = o.s || 1, c = o.c;
    tilt(sph(g, 0.06 * s, c, 0, 0.13 * s, -0.01 * s, 0.85, 1.35, 0.9), 0.2);
    sph(g, 0.045 * s, o.belly, 0, 0.12 * s, 0.035 * s, 0.7, 1.1, 0.5);
    [-1, 1].forEach(sx => { sph(g, 0.035 * s, c, sx * 0.04 * s, 0.05 * s, -0.01 * s, 0.7, 1, 1.3); sph(g, 0.015 * s, c, sx * 0.04 * s, 0.01 * s, 0.035 * s, 0.7, 0.5, 2.4); tilt(cyl(g, 0.007 * s, 0.006 * s, 0.05 * s, c, sx * 0.03 * s, 0.17 * s, 0.05 * s, 5), 0.8); });
    tilt(cn(g, 0.025 * s, 0.17 * s, c, 0, 0.05 * s, -0.11 * s, 7), -P2 + 0.35);
    sph(g, 0.035 * s, c, 0, 0.23 * s, 0.03 * s, 0.9, 0.95, 1.3); sph(g, 0.006 * s, 0x222222, 0, 0.225 * s, 0.075 * s);
    [-1, 1].forEach(sx => { sph(g, 0.012 * s, c, sx * 0.018 * s, 0.275 * s, 0.015 * s, 0.7, 2.4, 0.5).rotation.z = -sx * 0.25; });
    eyes(g, 0.24 * s, 0.06 * s, 0.017 * s, 0.006 * s);
    if (o.joey) { sph(g, 0.017 * s, c, 0, 0.12 * s, 0.07 * s); [-1, 1].forEach(sx => sph(g, 0.006 * s, c, sx * 0.008 * s, 0.14 * s, 0.065 * s, 0.7, 1.8, 0.5)); eyes(g, 0.125 * s, 0.085 * s, 0.007 * s, 0.003 * s); }
  }
  const wings = (g, c, y, z, span = 0.12) => { const ws = [-1, 1].map(sx => { const w = new T.Group(), sh = new T.Shape(); w.position.set(sx * 0.04, y, z); sh.moveTo(0, 0); sh.lineTo(sx * span, 0.07); sh.lineTo(sx * span * 0.9, -0.01); sh.lineTo(sx * span * 0.45, -0.03); sh.closePath(); const m = add(w, new T.ShapeGeometry(sh), mat(c, { ds: true })); m.rotation.x = -P2 + 0.3; m.userData.noInk = true; g.add(w); return w; }); tick(g, t => ws.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * 6) * 0.35); })); };

  const M = {
    // ---- Pets
    hamster: g => { sph(g, 0.06, 0xe8b46a, 0, 0.055, 0, 1, 0.9, 1.1); sph(g, 0.045, 0xfff1d6, 0, 0.045, 0.03, 0.9, 0.7, 0.8); [-1, 1].forEach(s => { sph(g, 0.016, 0xe8b46a, s * 0.035, 0.105, 0.03); sph(g, 0.018, 0xfff1d6, s * 0.03, 0.06, 0.055); }); sph(g, 0.008, 0xff8fab, 0, 0.07, 0.065); eyes(g, 0.085, 0.055, 0.022, 0.007); },
    guineapig: g => { sph(g, 0.07, 0xfff3df, 0, 0.055, 0, 0.95, 0.75, 1.3); sph(g, 0.045, 0x9c6b3c, 0.02, 0.07, -0.04, 1, 0.8, 1); sph(g, 0.035, 0x2b2b35, -0.03, 0.075, 0.03, 1, 0.8, 1); [-1, 1].forEach(s => sph(g, 0.014, 0x9c6b3c, s * 0.03, 0.095, 0.06, 1, 0.6, 0.8)); sph(g, 0.007, 0xff8fab, 0, 0.06, 0.09); eyes(g, 0.075, 0.08, 0.025, 0.007); },
    budgie: g => bird(g, { c: 0x6fd36a, belly: 0xb6f07a, head: 0xffe066, beakC: 0xffb38a, wing: 0x3a8a3a, s: 0.85, tail: 'long', tailC: 0x2f6fb5 }),
    gecko: g => lizard(g, { c: 0x8fd14f, spots: 0xffd43b }),
    hedgehog: g => spiky(g, { c: 0x8a6a4a, spine: 0x6b4a3a, face: 0xd9b88f }),
    tortoise: g => shellie(g, { shell: 0x8a6a3a, spot: 0xc8a25a, c: 0xa8a070 }),
    parrot: g => bird(g, { c: 0xe03131, belly: 0xff6b6b, wing: 0x3b82f6, head: 0xe03131, beakC: 0x2b2b35, hook: true, s: 1.3, tail: 'long', tailC: 0xffc93c }),
    // ---- New Zealand natives (they live in the forest grove)
    piwakawaka: g => bird(g, { c: 0x7a6a5c, belly: 0xe8c79a, head: 0x3b3430, beakC: 0x222222, s: 0.75, tail: 'fan', tailC: 0x3b3430, beak: 0.015 }),
    tui: g => bird(g, { c: 0x1f2a44, belly: 0x2b3d5c, wing: 0x2a4a5e, head: 0x1f2a44, beakC: 0x111111, tuft: true, s: 1.05 }),
    kereru: g => bird(g, { c: 0x2f7d5f, belly: 0xffffff, head: 0x4f8a6f, wing: 0x7a5a8a, beakC: 0xd9483b, legC: 0xd9483b, s: 1.3 }),
    weka: g => bird(g, { c: 0x8a5a2b, belly: 0x9c6b3c, head: 0x6b4a2a, beakC: 0xd9a35b, legC: 0xd98a5b, s: 1.25, beak: 0.035, leg: 0.05 }),
    ruru: g => bird(g, { c: 0x6b4a2a, belly: 0xc9a06a, head: 0x6b4a2a, beakC: 0x2b2b35, bigEyes: true, hs: 1.25, s: 1.05, beak: 0.012 }),
    takahe: g => bird(g, { c: 0x2a5aa8, belly: 0x2f7d6f, wing: 0x1f8a6a, head: 0x2a4a9a, beakC: 0xe03131, legC: 0xe03131, s: 1.45, bw: 1.8, beak: 0.032, leg: 0.05 }),
    tuatara: g => lizard(g, { c: 0x6f7a4a, spines: 0xf1ece4, s: 1.25 }),
    kakapo: g => bird(g, { c: 0x6f9f3a, belly: 0xb9c95a, wing: 0x4f7a2a, head: 0x8aa84a, beakC: 0xd8cfb8, hook: true, s: 1.5, hs: 1.15, leg: 0.03 }),
    // ---- Australian animals
    kookaburra: g => bird(g, { c: 0xf1e3c4, belly: 0xffffff, wing: 0x7a5a3a, head: 0xf1e3c4, beakC: 0x3b3430, beak: 0.05, hs: 1.25, s: 1.2, tail: 'long', tailC: 0x9c6b3c }),
    quokka: g => { quad(g, { c: 0x9c7a5a, belly: 0xc8a882, s: 0.85, len: 1.05, leg: 0.03, ears: 'round', tail: 'long', hs: 1.1, snout: 0xb08a6a, snoutL: 0.8 }); },
    echidna: g => spiky(g, { c: 0x3b3430, spine: 0xe9dcb8, face: 0x3b3430, snout: true, s: 1.1 }),
    wallaby: g => roo(g, { c: 0x8a8070, belly: 0xc9c0b0, s: 0.85 }),
    wombat: g => quad(g, { c: 0x7a6250, s: 1.25, len: 1.15, leg: 0.025, ears: 'round', tail: 'stub', snout: 0x5a4a40, snoutL: 0.7, hs: 1.1 }),
    emu: g => bird(g, { c: 0x6b5a4a, belly: 0x7a6a5a, head: 0x3b4a6a, neckC: 0x5a6a8a, beakC: 0x2b2b35, s: 1.4, neck: 0.12, leg: 0.13, legC: 0x6b5a4a, tail: 'short' }),
    kangaroo: g => roo(g, { c: 0xb5703a, belly: 0xe8c08a, s: 1.15, joey: true }),
    lyrebird: g => bird(g, { c: 0x7a5a3a, belly: 0x9c7a5a, head: 0x6b4a2a, beakC: 0x2b2b35, s: 1.2, tail: 'lyre', tailC: 0xa86f3e, leg: 0.05 }),
    // ---- Beach
    starfish: g => { const c = 0xff8c42; ring(5, a => { const o = cn(g, 0.025, 0.08, c, Math.cos(a) * 0.035, 0.012, Math.sin(a) * 0.035, 5); o.rotation.set(0, -a, P2); o.scale.y = 1; o.scale.z = 0.5; }); sph(g, 0.028, c, 0, 0.012, 0, 1, 0.5, 1); ring(5, a => sph(g, 0.006, 0xffd8a8, Math.cos(a) * 0.03, 0.022, Math.sin(a) * 0.03)); },
    crab: g => { sph(g, 0.05, 0xe5533d, 0, 0.04, 0, 1.3, 0.6, 1); [-1, 1].forEach(s => { sph(g, 0.022, 0xe5533d, s * 0.075, 0.045, 0.04, 1, 0.7, 1.2); tilt(cn(g, 0.012, 0.03, 0xff8a6a, s * 0.08, 0.06, 0.06, 5), 0.6, 0, s * 0.3); for (let i = 0; i < 3; i++) tilt(cyl(g, 0.004, 0.004, 0.06, 0xc8443a, s * 0.06, 0.02, -0.025 + i * 0.022, 4), 0, 0, s * 1.2); cyl(g, 0.004, 0.004, 0.03, 0xc8443a, s * 0.018, 0.075, 0.03, 4); sph(g, 0.008, 0x1b1b2a, s * 0.018, 0.092, 0.03); }); },
    hermitcrab: g => { for (let i = 0; i < 4; i++) sph(g, 0.05 - i * 0.011, i % 2 ? 0xf1e3c4 : 0xe0b48a, -0.01 + i * 0.006, 0.05 + i * 0.022, -0.02 - i * 0.008); sph(g, 0.025, 0xff8a5a, 0, 0.03, 0.05, 1.2, 0.8, 1); [-1, 1].forEach(s => { sph(g, 0.012, 0xff8a5a, s * 0.03, 0.03, 0.07); cyl(g, 0.003, 0.003, 0.025, 0xc8443a, s * 0.012, 0.055, 0.06, 4); sph(g, 0.006, 0x1b1b2a, s * 0.012, 0.07, 0.06); }); },
    seal: g => { tilt(sph(g, 0.07, 0x7a8090, 0, 0.06, 0, 0.85, 0.75, 1.6), -0.35); sph(g, 0.045, 0x8a909f, 0, 0.13, 0.08); sph(g, 0.02, 0xa8aebb, 0, 0.12, 0.12, 1.2, 0.8, 1); sph(g, 0.007, 0x222222, 0, 0.125, 0.14); [-1, 1].forEach(s => { tilt(sph(g, 0.02, 0x6a7080, s * 0.055, 0.04, 0.05, 1.8, 0.4, 1), 0, 0, s * 0.4); for (let i = 0; i < 2; i++) tilt(cyl(g, 0.0015, 0.0015, 0.05, 0xffffff, s * 0.035, 0.12 - i * 0.008, 0.13, 3), 0, 0, P2); }); tilt(sph(g, 0.02, 0x6a7080, 0, 0.02, -0.12, 2, 0.4, 1), 0, 0, 0); eyes(g, 0.145, 0.115, 0.02, 0.008); },
    seaturtle: g => shellie(g, { shell: 0x3a7a5a, spot: 0x6fa86a, c: 0x8ab87a, s: 1.4, flip: true }),
    dolphin: g => { const d = new T.Group(); d.position.y = 0.06; g.add(d); tilt(sph(d, 0.06, 0x7f9ab5, 0, 0, 0, 0.75, 0.8, 1.9), -0.15); sph(d, 0.04, 0xdde6ee, 0, -0.02, 0.02, 0.7, 0.6, 1.6); tilt(cn(d, 0.012, 0.05, 0x7f9ab5, 0, -0.005, 0.13, 6), P2); tilt(cn(d, 0.02, 0.05, 0x6f8aa5, 0, 0.05, -0.02, 4), -0.4); tilt(sph(d, 0.03, 0x6f8aa5, 0, 0.0, -0.12, 1.6, 0.25, 0.6), 0.2); eyes(d, 0.02, 0.085, 0.03, 0.006); tick(g, t => { d.position.y = 0.06 + Math.abs(Math.sin(t * 1.6)) * 0.08; d.rotation.x = Math.cos(t * 1.6) * 0.4; }); },
    // ---- Water
    goldfish: g => fishy(g, { c: 0xff8c1a, fin: 0xffb84d, y: -0.005 }),
    frog: g => { sph(g, 0.05, 0x4caf50, 0, 0.04, 0, 1.1, 0.75, 1); sph(g, 0.035, 0x8bd45a, 0, 0.03, 0.025, 0.9, 0.6, 0.8); [-1, 1].forEach(s => { sph(g, 0.018, 0x4caf50, s * 0.025, 0.075, 0.03); sph(g, 0.01, 0x1b1b2a, s * 0.025, 0.083, 0.043); sph(g, 0.022, 0x3d9b4f, s * 0.05, 0.015, -0.02, 1, 0.5, 1.8); }); tor(g, 0.016, 0.003, 0x2b5a2b, 0, 0.04, 0.045, PI).rotation.z = PI; },
    swan: g => { sph(g, 0.08, 0xffffff, 0, 0.05, 0, 0.85, 0.65, 1.3); [-1, 1].forEach(s => sph(g, 0.045, 0xf6f7fa, s * 0.05, 0.075, -0.02, 0.4, 0.6, 1.2)); const n = new T.Group(); n.position.set(0, 0.06, 0.07); g.add(n); tilt(cyl(n, 0.012, 0.016, 0.13, 0xffffff, 0, 0.06, 0, 7), -0.2); sph(n, 0.025, 0xffffff, 0, 0.13, 0.02); tilt(cn(n, 0.01, 0.035, 0xff8c1a, 0, 0.125, 0.05, 6), P2); sph(n, 0.008, 0x1b1b2a, 0, 0.125, 0.03); eyes(n, 0.135, 0.035, 0.016, 0.004); },
    platypus: g => { sph(g, 0.055, 0x7a5a3a, 0, 0.035, 0, 1, 0.55, 1.5); sph(g, 0.035, 0x7a5a3a, 0, 0.04, 0.07); tilt(bx(g, 0.05, 0.012, 0.05, 0x2b2b35, 0, 0.035, 0.11), 0.1); tilt(bx(g, 0.05, 0.01, 0.07, 0x5a4030, 0, 0.025, -0.1), -0.1); [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => sph(g, 0.014, 0x3b3430, sx * 0.05, 0.01, sz * 0.045, 1.4, 0.4, 1)); eyes(g, 0.055, 0.095, 0.018, 0.005); },
    narwhal: g => { const d = new T.Group(); d.position.y = 0.04; g.add(d); sph(d, 0.06, 0x9fb3c8, 0, 0, 0, 0.9, 0.7, 1.5); sph(d, 0.045, 0xe6eef5, 0, -0.02, 0.01, 0.8, 0.5, 1.3); add(d, new T.ConeGeometry(0.008, 0.13, 8), GOLD(), 0, 0.02, 0.15).rotation.x = P2 - 0.1; tilt(sph(d, 0.03, 0x8aa0b8, 0, 0.0, -0.1, 1.6, 0.25, 0.6), 0.2); eyes(d, 0.02, 0.075, 0.035, 0.006); tick(g, t => { d.position.y = 0.04 + Math.sin(t * 1.4) * 0.015; d.rotation.z = Math.sin(t * 1.4) * 0.1; }); },
    // ---- Fantasy prizes
    phoenix: g => { const b = bird(g, { c: 0xff6a1a, belly: 0xffc93c, head: 0xff3d1a, wing: 0xff8c1a, beakC: 0xffd43b, crest: 0xffd43b, s: 1.4, tail: 'long', tailC: 0xffb020, flap: true }); for (let i = 0; i < 4; i++) glow(g, 0.012, [0xffd43b, 0xff8c1a][i % 2], (i - 1.5) * 0.02, b.by + 0.02, -0.14 - (i % 2) * 0.02); },
    griffin: g => { const q = quad(g, { c: 0xd9a35b, belly: 0xf1d29a, s: 1.3, len: 1.3, ears: 'none', tail: 'long', tailC: 0xb5803a, head: 0xffffff, hs: 1.05 }); tilt(cn(g, 0.014, 0.04, 0xffc93c, 0, q.hy - 0.01, q.hz + q.hr + 0.012, 6), P2 + 0.5); wings(g, 0xf3e9d4, q.by + 0.04, -0.02, 0.16); },
    pegasus: g => { horse(g, 0xfdfbff, 0xb9d9ff, false); wings(g, 0xffffff, 0.17, 0, 0.17); },
    // ---- Animal homes
    birdfeeder: g => { cyl(g, 0.01, 0.012, 0.32, DARK, 0, 0.16, 0, 6); bx(g, 0.12, 0.012, 0.12, WOOD, 0, 0.32, 0); cn(g, 0.1, 0.06, 0xd9483b, 0, 0.42, 0, 4).rotation.y = PI / 4; [-0.04, 0.04].forEach(x => cyl(g, 0.004, 0.004, 0.07, WOOD, x, 0.36, 0, 4)); for (let i = 0; i < 5; i++) sph(g, 0.006, 0xe9c46a, (i - 2) * 0.015, 0.332, 0.02); },
    hutch: g => { bx(g, 0.26, 0.14, 0.16, WOOD, 0, 0.12, 0); [-1, 1].forEach(sx => [-1, 1].forEach(sz => cyl(g, 0.008, 0.008, 0.06, DARK, sx * 0.12, 0.03, sz * 0.07, 4))); tilt(bx(g, 0.3, 0.012, 0.2, 0xd9483b, 0, 0.205, 0), 0.15); bx(g, 0.1, 0.1, 0.004, 0xcfd6df, 0.06, 0.12, 0.081); bx(g, 0.07, 0.09, 0.006, DARK, -0.07, 0.12, 0.081); },
    kennel: g => { bx(g, 0.2, 0.14, 0.2, 0xd9483b, 0, 0.07, 0); [-1, 1].forEach(s => tilt(bx(g, 0.14, 0.012, 0.24, 0x5b5f6e, s * 0.055, 0.17, 0), 0, 0, -s * 0.75)); bx(g, 0.08, 0.09, 0.006, 0x2b1d18, 0, 0.05, 0.101); bx(g, 0.07, 0.025, 0.004, 0xffffff, 0, 0.12, 0.102); sph(g, 0.012, 0xffd43b, 0.06, 0.02, 0.13, 1, 0.5, 2); },
    cattower: g => { cyl(g, 0.12, 0.12, 0.02, 0xbfa58a, 0, 0.01, 0, 16); [0.1, 0.22, 0.34].forEach((y, i) => { cyl(g, 0.02, 0.02, 0.12, 0xe9dcc4, (i - 1) * 0.04, y - 0.05, 0, 8); cyl(g, 0.07, 0.07, 0.02, 0x9c7a6a, (i - 1) * 0.04, y + 0.01, 0, 14); }); sph(g, 0.02, 0xff6b9d, -0.02, 0.28, 0.06); tilt(cyl(g, 0.002, 0.002, 0.06, 0xeeeeee, -0.02, 0.31, 0.06, 3), 0); },
  };

  /* ---------- Farm ---------- */
  Object.assign(M, {
    rooster: g => { sph(g, 0.065, 0xc8642b, 0, 0.085, 0, 1, 0.95, 1.2); sph(g, 0.035, 0xe08a3a, 0, 0.15, 0.05); for (let i = 0; i < 3; i++) sph(g, 0.012, 0xe03131, 0, 0.19 + (i % 2) * 0.01, 0.06 - i * 0.015, 0.6, 1.3, 1); tilt(cn(g, 0.01, 0.025, 0xffa94d, 0, 0.145, 0.09, 6), P2); sph(g, 0.012, 0xe03131, 0, 0.125, 0.075, 0.8, 1.4, 0.8); for (let i = 0; i < 4; i++) tilt(sph(g, 0.02, [0x1f5a3a, 0x2b2b35][i % 2], 0, 0.13 + i * 0.01, -0.08 - i * 0.012, 0.4, 1.8, 0.6), -0.6 - i * 0.2); [-0.022, 0.022].forEach(x => cyl(g, 0.005, 0.005, 0.045, 0xffc93c, x, 0.022, 0, 5)); eyes(g, 0.16, 0.08, 0.018, 0.006); },
    merino: g => { for (let i = 0; i < 9; i++) sph(g, 0.05, 0xf1e8d4, Math.cos(i * 2.4) * 0.045, 0.1 + (i % 3) * 0.02, Math.sin(i * 1.7) * 0.055); sph(g, 0.034, 0xf6efe0, 0, 0.13, 0.1); sph(g, 0.024, 0xe8dcc4, 0, 0.115, 0.125); [-1, 1].forEach(s => sph(g, 0.012, 0xe8dcc4, s * 0.038, 0.13, 0.095, 1.6, 0.6, 0.8)); [[-0.04, 0.04], [0.04, 0.04], [-0.04, -0.04], [0.04, -0.04]].forEach(([x, z]) => cyl(g, 0.01, 0.01, 0.07, 0xe8dcc4, x, 0.035, z, 5)); eyes(g, 0.14, 0.128, 0.018, 0.006); },
    kunekune: g => { const q = quad(g, { c: 0xe9c79a, s: 1.15, len: 1.15, leg: 0.035, ears: 'flop', tail: 'stub', snout: 0xf1b8a8, snoutL: 0.6, spots: [[0.03, 0.035, 0, 0.025], [-0.035, 0.03, -0.05, 0.02]], spotC: 0x3b3430 }); [-1, 1].forEach(s => sph(g, 0.007, 0xe9c79a, s * 0.012, q.hy - q.hr * 0.95, q.hz + q.hr * 0.4, 0.8, 1.8, 0.8)); },
    turkey: g => bird(g, { c: 0x5a3a2a, belly: 0x6b4a3a, wing: 0x7a5a3a, head: 0x9fb3c8, beakC: 0xd9a35b, tuft: false, s: 1.35, tail: 'turkey', leg: 0.045 }),
    donkey: g => { const q = quad(g, { c: 0x9aa0a8, belly: 0xd8dde3, s: 1.35, len: 1.3, leg: 0.08, neck: 0.04, ears: 'long', earC: 0x8a9098, tail: 'long', snout: 0xd8dde3, snoutL: 1.2 }); tilt(bx(g, 0.012, 0.03, 0.08, 0x5a5f68, 0, q.hy + 0.01, q.hz - 0.08), 0.6); },
    llama: g => { sph(g, 0.065, 0xfbf6ec, 0, 0.14, 0, 0.9, 0.85, 1.25); [[-0.03, 0.045], [0.03, 0.045], [-0.03, -0.045], [0.03, -0.045]].forEach(([x, z]) => cyl(g, 0.01, 0.009, 0.1, 0xe8dcc4, x, 0.05, z, 6)); cyl(g, 0.023, 0.028, 0.17, 0xfbf6ec, 0, 0.25, 0.065, 8).rotation.x = 0.1; sph(g, 0.032, 0x8a5a3a, 0, 0.35, 0.08, 1, 1.05, 1.2); sph(g, 0.016, 0x6b4a2a, 0, 0.34, 0.115); [-1, 1].forEach(s => tilt(sph(g, 0.009, 0x8a5a3a, s * 0.018, 0.39, 0.07, 0.8, 2.2, 0.6), 0, 0, -s * 0.15)); bx(g, 0.1, 0.015, 0.09, 0xe03131, 0, 0.21, -0.01); eyes(g, 0.36, 0.105, 0.017, 0.006); },
    sheepdog: g => quad(g, { c: 0x2b2b35, belly: 0xffffff, head: 0x2b2b35, s: 1.15, len: 1.35, leg: 0.06, ears: 'flop', tail: 'fluffy', tailC: 0xffffff, snout: 0xffffff, snoutL: 1.3, spots: [[0, 0.04, 0.06, 0.03]], spotC: 0xffffff }),
    horse: g => { horse(g, 0x8a4f2a, 0x2b1d18, false); g.scale.setScalar(1.25); },
    carrotbed: g => { bx(g, 0.3, 0.04, 0.18, 0x6b4a2a, 0, 0.02, 0); bx(g, 0.28, 0.01, 0.16, 0x4a3020, 0, 0.042, 0); for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { const x = -0.11 + i * 0.055, z = r ? 0.04 : -0.04; cn(g, 0.012, 0.03, 0xff8c1a, x, 0.045, z, 6); for (let k = 0; k < 3; k++) tilt(bx(g, 0.006, 0.05, 0.003, 0x3d9b4f, x, 0.07, z), 0, k, (k - 1) * 0.35); } },
    pumpkinbed: g => { bx(g, 0.3, 0.04, 0.18, 0x6b4a2a, 0, 0.02, 0); bx(g, 0.28, 0.01, 0.16, 0x4a3020, 0, 0.042, 0); [[-0.06, 0], [0.07, 0.02]].forEach(([x, z], i) => { sph(g, 0.05 - i * 0.008, 0xff8c1a, x, 0.07, z, 1.2, 0.8, 1.2); cyl(g, 0.006, 0.008, 0.025, 0x2f9e44, x, 0.11, z, 5); }); for (let i = 0; i < 6; i++) sph(g, 0.025, 0x3d9b4f, -0.12 + i * 0.05, 0.055, (i % 2 ? 1 : -1) * 0.055, 1, 0.3, 1); },
    strawberrybed: g => { bx(g, 0.3, 0.04, 0.18, 0x6b4a2a, 0, 0.02, 0); bx(g, 0.28, 0.01, 0.16, 0x4a3020, 0, 0.042, 0); for (let i = 0; i < 8; i++) { const x = -0.11 + (i % 4) * 0.073, z = i < 4 ? -0.04 : 0.04; sph(g, 0.03, 0x2f9e44, x, 0.06, z, 1, 0.5, 1); sph(g, 0.012, 0xe5383b, x + 0.015, 0.055, z + 0.02, 1, 1.2, 1); sph(g, 0.01, 0xffffff, x - 0.012, 0.075, z - 0.01); } },
    appletree: g => { cyl(g, 0.025, 0.04, 0.2, DARK, 0, 0.1, 0, 7); blob(g, 0.15, 0x3d9b4f, 0, 0.3, 0, 31); ring(9, (a, i) => sph(g, 0.017, 0xe03131, Math.cos(a) * 0.13, 0.28 + (i % 3) * 0.04, Math.sin(a) * 0.13)); },
    lemontree: g => { cyl(g, 0.025, 0.04, 0.2, DARK, 0, 0.1, 0, 7); blob(g, 0.15, 0x2f8a3f, 0, 0.3, 0, 32); ring(9, (a, i) => sph(g, 0.017, 0xffe066, Math.cos(a) * 0.13, 0.28 + (i % 3) * 0.04, Math.sin(a) * 0.13, 1, 1, 1.25)); },
    feijoatree: g => { cyl(g, 0.025, 0.04, 0.2, DARK, 0, 0.1, 0, 7); blob(g, 0.15, 0x5a7a4a, 0, 0.3, 0, 33); ring(8, (a, i) => sph(g, 0.016, 0x8fbf4a, Math.cos(a) * 0.13, 0.27 + (i % 3) * 0.04, Math.sin(a) * 0.13, 1, 1.35, 1)); },
    stand: g => { bx(g, 0.34, 0.12, 0.14, WOOD, 0, 0.06, 0); [-0.16, 0.16].forEach(x => cyl(g, 0.01, 0.01, 0.34, DARK, x, 0.17, -0.06, 5)); tilt(bx(g, 0.38, 0.012, 0.2, 0xe03131, 0, 0.34, 0.01), 0.3); for (let i = 0; i < 4; i++) bx(g, 0.385, 0.013, 0.05, 0xffffff, 0, 0.342 - 0.003, -0.07 + i * 0.05).rotation.x = 0.3; [[-0.1, 0xffe066], [0, 0xe03131], [0.1, 0xff8c1a]].forEach(([x, c]) => { bx(g, 0.08, 0.04, 0.08, 0xc98d5a, x, 0.14, 0.02); for (let k = 0; k < 4; k++) sph(g, 0.016, c, x + (k % 2 - 0.5) * 0.03, 0.17, 0.02 + (k > 1 ? 0.02 : -0.02)); }); bx(g, 0.16, 0.05, 0.006, 0xffffff, 0, 0.28, -0.06); },
    coolstore: g => { barn(g, 0, 0).scale.setScalar(1.35); bx(g, 0.1, 0.06, 0.006, 0x9fd3ff, 0.1, 0.2, 0.155); emo(g, '❄️', 0.1, 0, 0.5, 0.05); },
    jamkitchen: g => { bx(g, 0.26, 0.18, 0.2, 0xfff3df, 0, 0.09, 0); cn(g, 0.21, 0.13, 0xe5533d, 0, 0.245, 0, 4).rotation.y = PI / 4; bx(g, 0.07, 0.12, 0.006, 0x8a5a3c, -0.06, 0.06, 0.101); bx(g, 0.18, 0.012, 0.06, WOOD, 0.02, 0.1, 0.13); [0, 1, 2].forEach(i => { cyl(g, 0.016, 0.016, 0.035, [0xe03131, 0xff8c1a, 0x8fbf4a][i], 0.0 + i * 0.045, 0.125, 0.13, 10); cyl(g, 0.017, 0.017, 0.008, 0xf1e3c4, 0.0 + i * 0.045, 0.146, 0.13, 10); }); },
    spinwheel: g => { bx(g, 0.16, 0.02, 0.06, WOOD, 0, 0.08, 0); [-0.06, 0.06].forEach(x => cyl(g, 0.008, 0.008, 0.08, DARK, x, 0.04, 0, 5)); cyl(g, 0.008, 0.008, 0.18, DARK, 0.04, 0.17, 0, 5); const w = new T.Group(); w.position.set(0.04, 0.24, 0.02); g.add(w); tor(w, 0.08, 0.008, WOOD, 0, 0, 0); for (let i = 0; i < 6; i++) tilt(cyl(w, 0.003, 0.003, 0.16, DARK, 0, 0, 0, 4), 0, 0, i * PI / 6); sph(g, 0.03, 0xf1e8d4, -0.05, 0.12, 0, 1, 0.9, 1); tick(g, t => { w.rotation.z = t * 2; }); },
    marketstall: g => { bx(g, 0.4, 0.13, 0.16, WOOD, 0, 0.065, 0); [-0.19, 0.19].forEach(x => [-0.07, 0.07].forEach(z => cyl(g, 0.008, 0.008, 0.38, 0xffffff, x, 0.19, z, 5))); for (let i = 0; i < 6; i++) tilt(bx(g, 0.07, 0.012, 0.22, i % 2 ? 0xffffff : 0x2f9e44, -0.175 + i * 0.07, 0.4, 0), 0, 0, 0); for (let i = 0; i < 7; i++) sph(g, 0.02, [0xe03131, 0xffe066, 0xff8c1a, 0x8fbf4a][i % 4], -0.15 + i * 0.05, 0.145, 0.02); bx(g, 0.2, 0.06, 0.006, 0xfff3bf, 0, 0.33, 0.09); },
    dairy: g => { bx(g, 0.34, 0.2, 0.24, 0xffffff, 0, 0.1, 0); [-1, 1].forEach(s => tilt(bx(g, 0.2, 0.014, 0.28, 0x2f6fb5, s * 0.085, 0.245, 0), 0, 0, -s * 0.55)); bx(g, 0.08, 0.13, 0.006, 0x2f6fb5, 0, 0.065, 0.121); [[0.13, 0.04], [0.17, -0.02]].forEach(([x, z]) => { cyl(g, 0.025, 0.03, 0.08, 0xc8d0da, x + 0.08, 0.04, z + 0.14, 10); cyl(g, 0.015, 0.02, 0.02, 0xc8d0da, x + 0.08, 0.09, z + 0.14, 10); }); emo(g, '🧀', 0.08, 0, 0.32, 0.05); },
  });

  /* ---------- Play ---------- */
  Object.assign(M, {
    hopscotch: g => { [[0, 0], [0, 1], [-0.5, 2], [0.5, 2], [0, 3], [-0.5, 4], [0.5, 4], [0, 5]].forEach(([x, z], i) => { bx(g, 0.07, 0.006, 0.07, 0xffffff, x * 0.075, 0.004, 0.18 - z * 0.075); bx(g, 0.058, 0.008, 0.058, [0xff6b9d, 0xffd43b, 0x4dabf7, 0x69db7c][i % 4], x * 0.075, 0.006, 0.18 - z * 0.075); }); },
    sandpit: g => { ring(4, (a, i) => tilt(bx(g, 0.3, 0.05, 0.03, WOOD, Math.cos(a) * 0.14, 0.025, Math.sin(a) * 0.14), 0, -a + P2, 0)); bx(g, 0.27, 0.035, 0.27, 0xf1d9a0, 0, 0.02, 0); tilt(bx(g, 0.05, 0.008, 0.07, 0xff6b6b, 0.05, 0.05, 0.03), 0.4); cyl(g, 0.03, 0.025, 0.04, 0x4dabf7, -0.06, 0.05, -0.04, 10); },
    tyreswing: g => { [-0.15, 0.15].forEach(x => tilt(cyl(g, 0.012, 0.012, 0.42, WOOD, x, 0.2, 0, 6), 0, 0, x > 0 ? 0.15 : -0.15)); cyl(g, 0.012, 0.012, 0.34, WOOD, 0, 0.4, 0, 6).rotation.z = P2; const s = new T.Group(); s.position.y = 0.4; g.add(s); [-0.02, 0.02].forEach(x => cyl(s, 0.002, 0.002, 0.2, 0xeadfc4, x, -0.1, 0, 3)); tor(s, 0.05, 0.018, 0x2b2b35, 0, -0.22, 0).rotation.x = P2; tick(g, t => { s.rotation.x = Math.sin(t * 1.8) * 0.4; }); },
    seesaw: g => { tilt(cn(g, 0.05, 0.08, 0xff6b6b, 0, 0.04, 0, 3), 0, 0, 0); const p = new T.Group(); p.position.y = 0.085; g.add(p); bx(p, 0.42, 0.015, 0.05, 0xffd43b, 0, 0, 0); [-0.17, 0.17].forEach(x => { bx(p, 0.05, 0.012, 0.06, 0x4dabf7, x, 0.012, 0); cyl(p, 0.006, 0.006, 0.05, 0x495057, x + (x > 0 ? -0.03 : 0.03), 0.03, 0, 5).rotation.x = P2; }); tick(g, t => { p.rotation.z = Math.sin(t * 1.6) * 0.22; }); },
    cricket: g => { [-0.025, 0, 0.025].forEach(x => cyl(g, 0.005, 0.005, 0.14, 0xf1e3c4, x, 0.07, -0.08, 5)); [-0.0125, 0.0125].forEach(x => cyl(g, 0.003, 0.003, 0.03, 0xf1e3c4, x, 0.142, -0.08, 4).rotation.z = P2); tilt(bx(g, 0.035, 0.18, 0.012, 0xe9cfa0, 0.08, 0.09, 0.05), 0, 0, -0.35); cyl(g, 0.01, 0.01, 0.06, 0x2b2b35, 0.11, 0.18, 0.05, 6).rotation.z = -0.35; sph(g, 0.016, 0xc0392b, -0.04, 0.016, 0.08); },
    paddling: g => { tor(g, 0.17, 0.04, 0x4dabf7, 0, 0.04, 0).rotation.x = P2; tor(g, 0.17, 0.02, 0xffffff, 0, 0.075, 0).rotation.x = P2; add(g, new T.CylinderGeometry(0.16, 0.16, 0.012, 28), water(0x7fd8ff), 0, 0.05, 0); sph(g, 0.03, 0xffd43b, 0.05, 0.07, 0.04); },
    hoop: g => { cyl(g, 0.012, 0.016, 0.5, 0x495057, 0, 0.25, -0.05, 6); bx(g, 0.16, 0.11, 0.01, 0xffffff, 0, 0.5, -0.03); bx(g, 0.06, 0.04, 0.012, 0xe03131, 0, 0.48, -0.025); tor(g, 0.035, 0.004, 0xff6b35, 0, 0.455, 0.015).rotation.x = P2; add(g, new T.CylinderGeometry(0.035, 0.02, 0.05, 10, 1, true), mat(0xffffff, { op: 0.6, ds: true }), 0, 0.43, 0.015); sph(g, 0.025, 0xff8c1a, 0.07, 0.025, 0.08); },
    soccergoal: g => { [-0.18, 0.18].forEach(x => cyl(g, 0.008, 0.008, 0.16, 0xffffff, x, 0.08, 0, 6)); cyl(g, 0.008, 0.008, 0.36, 0xffffff, 0, 0.16, 0, 6).rotation.z = P2; tilt(bx(g, 0.36, 0.16, 0.004, 0xdfe7ef, 0, 0.08, -0.05), -0.35); [0x222222, 0xffffff].forEach((c, i) => add(g, new T.SphereGeometry(0.025, 10, 8, i * PI, PI), SM(c), 0.05, 0.025, 0.1)); },
    netball: g => { cyl(g, 0.01, 0.014, 0.52, 0x495057, 0, 0.26, 0, 6); tor(g, 0.035, 0.004, 0x495057, 0, 0.5, 0.04).rotation.x = P2; add(g, new T.CylinderGeometry(0.035, 0.022, 0.05, 10, 1, true), mat(0xffffff, { op: 0.6, ds: true }), 0, 0.475, 0.04); sph(g, 0.024, 0xffffff, -0.06, 0.024, 0.06); },
    roundabout: g => { cyl(g, 0.02, 0.02, 0.04, 0x495057, 0, 0.02, 0, 8); const r = new T.Group(); r.position.y = 0.05; g.add(r); disc(r, 0.18, 0xff6b6b, 0, 0, 0, 0.02, 28); ring(4, a => { stick(r, [Math.cos(a) * 0.05, 0.01, Math.sin(a) * 0.05], [Math.cos(a) * 0.16, 0.12, Math.sin(a) * 0.16], 0.006, 0xffd43b); }); tor(r, 0.06, 0.006, 0xffd43b, 0, 0.12, 0).rotation.x = P2; tick(g, t => { r.rotation.y = t * 0.9; }); },
    rugbyposts: g => { [-0.09, 0.09].forEach(x => cyl(g, 0.007, 0.007, 0.7, 0xffffff, x, 0.35, 0, 6)); cyl(g, 0.007, 0.007, 0.18, 0xffffff, 0, 0.2, 0, 6).rotation.z = P2; [-0.09, 0.09].forEach(x => cyl(g, 0.014, 0.014, 0.12, 0x2b2b35, x, 0.06, 0, 8)); sph(g, 0.03, 0x9c5a2b, 0.05, 0.02, 0.12, 0.7, 0.7, 1.2); },
    chess: g => { for (let i = 0; i < 16; i++) bx(g, 0.07, 0.008, 0.07, (i + Math.floor(i / 4)) % 2 ? 0x2b2b35 : 0xf6f1e4, -0.105 + (i % 4) * 0.07, 0.004, -0.105 + Math.floor(i / 4) * 0.07); [[-0.105, -0.105, 0xffffff, 1], [0.035, -0.035, 0xffffff, 0], [-0.035, 0.105, 0x2b2b35, 1], [0.105, 0.035, 0x2b2b35, 0]].forEach(([x, z, c, k]) => { cyl(g, 0.022, 0.026, 0.02, c, x, 0.018, z, 10); cyl(g, 0.012, 0.018, k ? 0.1 : 0.06, c, x, k ? 0.07 : 0.05, z, 10); sph(g, 0.018, c, x, k ? 0.125 : 0.085, z); }); },
    playhouse: g => { bx(g, 0.24, 0.18, 0.2, 0xffd6e8, 0, 0.09, 0); cn(g, 0.2, 0.13, 0xff6b9d, 0, 0.245, 0, 4).rotation.y = PI / 4; bx(g, 0.07, 0.11, 0.006, 0xffffff, -0.05, 0.055, 0.101); bx(g, 0.06, 0.05, 0.006, 0x9fd3ff, 0.06, 0.11, 0.101); bx(g, 0.07, 0.015, 0.03, 0x69db7c, 0.06, 0.08, 0.11); },
    climbing: g => { ring(4, (a, i) => cyl(g, 0.008, 0.008, 0.32, 0xff6b35, Math.cos(a + PI / 4) * 0.15, 0.16, Math.sin(a + PI / 4) * 0.15, 5)); for (let y = 0; y < 3; y++) ring(4, a => { const x0 = Math.cos(a + PI / 4) * 0.15, z0 = Math.sin(a + PI / 4) * 0.15, x1 = Math.cos(a + 3 * PI / 4) * 0.15, z1 = Math.sin(a + 3 * PI / 4) * 0.15; stick(g, [x0, 0.09 + y * 0.1, z0], [x1, 0.09 + y * 0.1, z1], 0.006, [0x4dabf7, 0xffd43b, 0x69db7c][y]); }); },
    splashpad: g => { disc(g, 0.2, 0x4dabf7, 0, 0.006, 0, 0.012, 28); disc(g, 0.15, 0x74c0fc, 0, 0.012, 0, 0.004, 28); const jets = []; ring(5, a => { cyl(g, 0.01, 0.012, 0.02, 0xffd43b, Math.cos(a) * 0.1, 0.02, Math.sin(a) * 0.1, 8); const j = add(g, new T.CylinderGeometry(0.004, 0.012, 0.15, 6), mat(0x9be7ff, { op: 0.6 }), Math.cos(a) * 0.1, 0.1, Math.sin(a) * 0.1); j.userData.noInk = true; jets.push(j); }); tick(g, t => jets.forEach((j, i) => { j.scale.y = 0.4 + Math.abs(Math.sin(t * 2 + i)) * 0.8; j.position.y = 0.03 + j.scale.y * 0.075; })); },
    minigolf: g => { add(g, new T.CylinderGeometry(0.18, 0.18, 0.015, 6), mat(0x40c057), 0, 0.008, 0); disc(g, 0.018, 0x111111, 0.08, 0.017, 0.02, 0.004, 12); cyl(g, 0.003, 0.003, 0.14, 0xffffff, 0.08, 0.085, 0.02, 4); tilt(bx(g, 0.05, 0.035, 0.003, 0xe03131, 0.105, 0.135, 0.02), 0); sph(g, 0.012, 0xffffff, -0.08, 0.025, -0.02); const m = new T.Group(); m.position.set(-0.04, 0, -0.08); g.add(m); bx(m, 0.05, 0.08, 0.05, 0xffffff, 0, 0.04, 0); cn(m, 0.045, 0.04, 0xe03131, 0, 0.1, 0, 4).rotation.y = PI / 4; const b = new T.Group(); b.position.set(0, 0.06, 0.03); m.add(b); for (let i = 0; i < 4; i++) tilt(bx(b, 0.012, 0.09, 0.004, 0x4dabf7, 0, 0, 0), 0, 0, i * P2); tick(g, t => { b.rotation.z = t * 2; }); },
    skateramp: g => { const sh = new T.Shape(); sh.moveTo(-0.2, 0); for (let i = 0; i <= 16; i++) { const a = i / 16 * PI; sh.lineTo(-Math.cos(a) * 0.2, 0.14 - Math.sin(a) * 0.12); } sh.lineTo(0.2, 0); sh.closePath(); add(g, new T.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false }), mat(0x9aa7b5), 0, 0, -0.09); [-0.2, 0.2].forEach(x => bx(g, 0.02, 0.01, 0.18, 0xff6b35, x, 0.145, 0)); },
    flyingfox: g => { cyl(g, 0.014, 0.014, 0.42, WOOD, -0.25, 0.21, 0, 6); cyl(g, 0.014, 0.014, 0.26, WOOD, 0.25, 0.13, 0, 6); stick(g, [-0.25, 0.4, 0], [0.25, 0.25, 0], 0.003, 0x495057); const s = new T.Group(); g.add(s); cyl(s, 0.002, 0.002, 0.12, 0xeadfc4, 0, -0.06, 0, 3); cyl(s, 0.03, 0.03, 0.012, 0xff6b6b, 0, -0.12, 0, 12); tick(g, t => { const p = (Math.sin(t * 0.8) + 1) / 2; s.position.set(-0.23 + p * 0.46, 0.39 - p * 0.14, 0); }); },
    bouncy: g => { bx(g, 0.36, 0.06, 0.3, 0x4dabf7, 0, 0.03, 0); ring(4, (a, i) => { const x = (i % 2 ? 1 : -1) * 0.16, z = (i < 2 ? 1 : -1) * 0.13; cyl(g, 0.035, 0.035, 0.24, [0xff6b6b, 0xffd43b][i % 2], x, 0.15, z, 12); cn(g, 0.04, 0.06, [0xffd43b, 0xff6b6b][i % 2], x, 0.3, z, 12); }); [[0, -0.13, 0.36, 0.14], [-0.16, 0, 0.3, 0.12], [0.16, 0, 0.3, 0.12]].forEach(([x, z, w, h], i) => tilt(bx(g, i ? 0.02 : w, h, i ? w * 0.8 : 0.02, 0xff8fb1, x, 0.06 + h / 2, z), 0)); const top = bx(g, 0.3, 0.012, 0.24, 0x74c0fc, 0, 0.065, 0); tick(g, t => { top.position.y = 0.065 + Math.abs(Math.sin(t * 4)) * 0.006; }); },
    pumptrack: g => { add(g, new T.TorusGeometry(0.2, 0.04, 8, 32), mat(0xb08a5a), 0, 0.01, 0).scale.set(1.3, 1, 0.35); add(g, new T.TorusGeometry(0.2, 0.04, 8, 32), mat(0xb08a5a), 0, 0.01, 0).rotation.x = P2; ring(6, a => sph(g, 0.04, 0xa07a4a, Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2, 1, 0.5, 1)); const b = new T.Group(); g.add(b); cyl(b, 0.02, 0.02, 0.004, 0x222222, -0.025, 0.04, 0, 12).rotation.x = P2; cyl(b, 0.02, 0.02, 0.004, 0x222222, 0.025, 0.04, 0, 12).rotation.x = P2; bx(b, 0.05, 0.005, 0.004, 0x4dabf7, 0, 0.05, 0); tick(g, t => { const a = t * 0.9; b.position.set(Math.cos(a) * 0.2, 0.02 + Math.abs(Math.sin(a * 3)) * 0.02, Math.sin(a) * 0.2); b.rotation.y = -a; }); },
    waterslide: g => { bx(g, 0.12, 0.42, 0.12, 0xffd43b, -0.18, 0.21, -0.1); bx(g, 0.14, 0.02, 0.14, 0xff6b35, -0.18, 0.43, -0.1); for (let i = 0; i < 14; i++) { const t = i / 13, a = t * PI * 1.2, x = -0.18 + Math.sin(a) * 0.15 + t * 0.2, z = -0.1 + (1 - Math.cos(a)) * 0.12, y = 0.42 - t * 0.38; add(g, new T.CylinderGeometry(0.045, 0.045, 0.05, 10, 1, true, 0, PI), mat(0x4dabf7, { ds: true }), x, y, z).rotation.set(P2, 0, a); } add(g, new T.CylinderGeometry(0.15, 0.15, 0.05, 24), mat(0x74c0fc), 0.12, 0.025, 0.2); add(g, new T.CylinderGeometry(0.14, 0.14, 0.01, 24), water(), 0.12, 0.05, 0.2); },
    gokart: g => { tor(g, 0.32, 0.05, 0x495057, 0, 0.01, 0).scale.set(1, 0.55, 1); add(g, new T.TorusGeometry(0.32, 0.05, 6, 40), mat(0x495057), 0, 0.01, 0).rotation.x = P2; ring(16, (a, i) => bx(g, 0.03, 0.025, 0.03, i % 2 ? 0xe03131 : 0xffffff, Math.cos(a) * 0.39, 0.012, Math.sin(a) * 0.39)); const k = new T.Group(); g.add(k); bx(k, 0.07, 0.025, 0.045, 0xffd43b, 0, 0.04, 0); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => tilt(cyl(k, 0.012, 0.012, 0.01, 0x222222, sx * 0.03, 0.025, sz * 0.025, 10), P2)); sph(k, 0.014, 0xff6b9d, -0.005, 0.07, 0); tick(g, t => { const a = t * 1.3; k.position.set(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32); k.rotation.y = -a; }); },
    carousel: g => { disc(g, 0.26, 0xf1e3c4, 0, 0.02, 0, 0.04, 28); cyl(g, 0.02, 0.02, 0.5, 0xffc93c, 0, 0.27, 0, 10); const r = new T.Group(); g.add(r); cn(r, 0.3, 0.14, 0xff6b9d, 0, 0.56, 0, 16); for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; bx(r, 0.012, 0.03, 0.06, i % 2 ? 0xffffff : 0xff6b9d, Math.cos(a) * 0.28, 0.48, Math.sin(a) * 0.28).rotation.y = -a; } const horses = []; ring(4, a => { const h = new T.Group(); h.position.set(Math.cos(a) * 0.18, 0.12, Math.sin(a) * 0.18); h.rotation.y = -a; r.add(h); cyl(h, 0.004, 0.004, 0.36, 0xffd43b, 0, 0.12, 0, 4); horse(h, [0xffffff, 0xffd6e8, 0xd6ecff, 0xfff3bf][Math.round(a) % 4], 0xffc93c, false); h.children.slice(1).forEach(c => c.position.y -= 0.03); horses.push(h); }); tick(g, t => { r.rotation.y = t * 0.6; horses.forEach((h, i) => { h.position.y = 0.12 + Math.sin(t * 2 + i * 1.5) * 0.03; }); }); },
    ferris: g => { [-0.06, 0.06].forEach(z => { stick(g, [-0.18, 0, z], [0, 0.42, z], 0.012, 0xced4da); stick(g, [0.18, 0, z], [0, 0.42, z], 0.012, 0xced4da); }); const w = new T.Group(); w.position.y = 0.42; g.add(w); tor(w, 0.32, 0.008, 0xff6b6b, 0, 0, -0.05); tor(w, 0.32, 0.008, 0xff6b6b, 0, 0, 0.05); const cars = []; ring(8, (a, i) => { stick(w, [0, 0, 0], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], 0.004, 0xffd43b); const c = new T.Group(); c.position.set(Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0); w.add(c); bx(c, 0.06, 0.05, 0.08, [0x4dabf7, 0xffd43b, 0x69db7c, 0xff8fb1][i % 4], 0, -0.04, 0); cars.push(c); }); tick(g, t => { w.rotation.z = t * 0.25; cars.forEach(c => { c.rotation.z = -w.rotation.z; }); }); },
    coaster: g => { const pts = []; for (let i = 0; i <= 64; i++) { const a = i / 64 * PI * 2; pts.push(new T.Vector3(Math.cos(a) * 0.36, 0.12 + Math.sin(a * 2) * 0.1 + (Math.cos(a) > 0.6 ? Math.pow((Math.cos(a) - 0.6) / 0.4, 2) * 0.3 : 0), Math.sin(a) * 0.22)); } const curve = new T.CatmullRomCurve3(pts, true); add(g, new T.TubeGeometry(curve, 96, 0.012, 6, true), mat(0xe03131)); for (let i = 0; i < 16; i++) { const p = curve.getPoint(i / 16); cyl(g, 0.006, 0.006, p.y, 0xced4da, p.x, p.y / 2, p.z, 4); } const car = new T.Group(); g.add(car); bx(car, 0.06, 0.03, 0.035, 0xffd43b, 0, 0.02, 0); sph(car, 0.01, 0xff6b9d, -0.01, 0.045, 0); sph(car, 0.01, 0x4dabf7, 0.015, 0.045, 0); tick(g, t => { const u = (t * 0.12) % 1, p = curve.getPoint(u), q = curve.getPoint((u + 0.01) % 1); car.position.copy(p); car.lookAt(q); car.rotateY(-P2); }); },
  });

  /* ---------- Garden ---------- */
  const bloom = (g, c, n = 7, h = 0.12, r = 0.022, spread = 0.12) => { for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * spread * 2, z = ((i * 37) % 7 - 3) * 0.012, hh = h * (0.8 + ((i * 13) % 5) * 0.06); cyl(g, 0.004, 0.004, hh, 0x2f9e44, x, hh / 2, z, 4); sph(g, r, Array.isArray(c) ? c[i % c.length] : c, x, hh, z); } };
  Object.assign(M, {
    sunflowers: g => { for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.06, h = 0.22 + (i % 2) * 0.05; cyl(g, 0.006, 0.006, h, 0x2f9e44, x, h / 2, 0, 5); ring(10, a => sph(g, 0.012, 0xffd43b, x + Math.cos(a) * 0.028, h + Math.sin(a) * 0.028, 0.008, 1, 1, 0.4)); sph(g, 0.018, 0x6b4a2a, x, h, 0.012, 1, 1, 0.5); tilt(sph(g, 0.02, 0x3d9b4f, x + 0.02, h * 0.5, 0, 1, 0.3, 0.7), 0, 0, -0.5); } },
    tulips: g => { bx(g, 0.28, 0.03, 0.12, 0x7a5236, 0, 0.015, 0); bloom(g, [0xff4d6d, 0xffd43b, 0xff8fb1, 0xc084fc], 6, 0.1, 0.02, 0.11); },
    roses: g => { blob(g, 0.08, 0x2f7d3f, 0, 0.07, 0, 41); blob(g, 0.06, 0x2f7d3f, 0.08, 0.05, 0.03, 42); ring(8, (a, i) => sph(g, 0.018, i % 3 ? 0xe5383b : 0xff8fb1, Math.cos(a) * 0.07 + 0.03, 0.08 + (i % 2) * 0.03, Math.sin(a) * 0.06)); },
    lavender: g => { for (let i = 0; i < 9; i++) { const x = ((i % 3) - 1) * 0.05, z = (Math.floor(i / 3) - 1) * 0.04; cyl(g, 0.003, 0.003, 0.1, 0x6f9a6a, x, 0.05, z, 4); sph(g, 0.011, 0x9b7be8, x, 0.12, z, 1, 2.6, 1); } },
    hydrangeas: g => { blob(g, 0.08, 0x3d8b40, 0, 0.06, 0, 43); [[0, 0.11, 0.03, 0x74a7ff], [0.06, 0.09, 0.04, 0xc084fc], [-0.06, 0.09, 0.02, 0xff8fb1]].forEach(([x, y, z, c]) => { for (let k = 0; k < 6; k++) sph(g, 0.016, c, x + Math.cos(k) * 0.02, y + (k % 2) * 0.012, z + Math.sin(k) * 0.02); }); },
    cactus: g => { cyl(g, 0.12, 0.1, 0.06, 0xc0604a, 0, 0.03, 0, 10); sph(g, 0.04, 0x40a058, 0, 0.16, 0, 1, 2.6, 1); [-1, 1].forEach(s => { tilt(sph(g, 0.022, 0x40a058, s * 0.05, 0.17, 0, 1, 1.8, 1), 0, 0, -s * 0.3); }); sph(g, 0.014, 0xff6b9d, 0, 0.27, 0); },
    harakeke: g => { for (let i = 0; i < 12; i++) { const a = i * 0.52, o = cn(g, 0.012, 0.3, i % 2 ? 0x3d6b3a : 0x527a3a, Math.cos(a) * 0.02, 0.14, Math.sin(a) * 0.02, 4); o.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); o.scale.z = 0.3; } for (let i = 0; i < 2; i++) { cyl(g, 0.004, 0.004, 0.4, 0x6b4a3a, 0.02 - i * 0.04, 0.2, 0, 4); sph(g, 0.014, 0xc0392b, 0.02 - i * 0.04, 0.4, 0); } },
    ponga: g => { cyl(g, 0.025, 0.035, 0.32, 0x4a3328, 0, 0.16, 0, 7); ring(9, a => { const f = new T.Group(); f.position.set(0, 0.32, 0); f.rotation.y = -a; g.add(f); tilt(bx(f, 0.022, 0.006, 0.24, 0x2f7d3f, 0, -0.03, 0.12), 0.35); }); },
    bamboo: g => { for (let i = 0; i < 5; i++) { const x = (i % 3 - 1) * 0.04, z = (i > 2 ? 0.03 : -0.02), h = 0.35 + (i % 3) * 0.07; cyl(g, 0.01, 0.01, h, 0x9fbf4a, x, h / 2, z, 6); for (let k = 1; k < 4; k++) cyl(g, 0.011, 0.011, 0.006, 0x7a9a3a, x, h * k / 4, z, 6); tilt(bx(g, 0.01, 0.003, 0.07, 0x5f9a3a, x + 0.03, h * 0.85, z), 0.4, 0, 0.5); } },
    hedge: g => { for (let i = 0; i < 4; i++) blob(g, 0.07, 0x2f7d3f, (i - 1.5) * 0.09, 0.07, 0, 50 + i); bx(g, 0.34, 0.08, 0.1, 0x2f7d3f, 0, 0.05, 0); g.userData.shape = true; },
    topiary: g => { cyl(g, 0.06, 0.05, 0.06, 0xc0604a, 0, 0.03, 0, 10); cyl(g, 0.008, 0.008, 0.1, DARK, 0, 0.1, 0, 5); sph(g, 0.08, 0x2f7d3f, 0, 0.2, 0); g.userData.shape = true; },
    gnome: g => { cyl(g, 0.035, 0.04, 0.06, 0x4dabf7, 0, 0.03, 0, 10); sph(g, 0.03, 0xffd8b8, 0, 0.08, 0.005); cn(g, 0.03, 0.07, 0xe03131, 0, 0.13, 0, 10); tilt(cn(g, 0.025, 0.05, 0xffffff, 0, 0.055, 0.025, 8), PI); sph(g, 0.008, 0xff9f8a, 0, 0.08, 0.034); },
    fairydoor: g => { cyl(g, 0.08, 0.09, 0.14, 0x8a6a4a, 0, 0.07, 0, 10); disc(g, 0.08, 0xc9a37a, 0, 0.142, 0, 0.004, 14); const sh = new T.Shape(); sh.moveTo(-0.025, 0); sh.lineTo(0.025, 0); sh.lineTo(0.025, 0.04); sh.absarc(0, 0.04, 0.025, 0, PI, false); sh.closePath(); add(g, new T.ExtrudeGeometry(sh, { depth: 0.006, bevelEnabled: false }), mat(0xc084fc), 0, 0.005, 0.083); sph(g, 0.004, 0xffd43b, 0.014, 0.035, 0.092); glow(g, 0.006, 0xfff3bf, -0.04, 0.1, 0.075); },
    compost: g => { bx(g, 0.16, 0.16, 0.16, 0x2f6b3f, 0, 0.08, 0); tilt(bx(g, 0.17, 0.015, 0.17, 0x245a33, 0, 0.165, -0.01), -0.1); bx(g, 0.1, 0.05, 0.004, 0x245a33, 0, 0.03, 0.081); },
    rainbarrel: g => { cyl(g, 0.07, 0.065, 0.18, 0x3d6b9a, 0, 0.09, 0, 14); [0.04, 0.14].forEach(y => tor(g, 0.071, 0.004, 0x2b3d5c, 0, y, 0).rotation.x = P2); cyl(g, 0.008, 0.008, 0.03, 0xced4da, 0.06, 0.03, 0.04, 5).rotation.z = P2; },
    wormfarm: g => { [0, 1, 2].forEach(i => bx(g, 0.18, 0.05, 0.14, [0x2b2b35, 0x3b3b46, 0x2b2b35][i], 0, 0.03 + i * 0.055, 0)); bx(g, 0.19, 0.012, 0.15, 0x40c057, 0, 0.19, 0); ring(3, a => tilt(cyl(g, 0.004, 0.004, 0.025, 0xff9fb4, Math.cos(a) * 0.04, 0.2, Math.sin(a) * 0.03, 4), 0, 0, 1)); },
    birdbath: g => { cyl(g, 0.03, 0.05, 0.16, 0xbdb3a4, 0, 0.08, 0, 10); cyl(g, 0.1, 0.06, 0.04, 0xbdb3a4, 0, 0.18, 0, 16); add(g, new T.CylinderGeometry(0.085, 0.085, 0.006, 16), water(), 0, 0.198, 0); const b = new T.Group(); b.position.set(0.08, 0.2, 0); b.scale.setScalar(0.45); g.add(b); bird(b, { c: 0x6f8aa5, belly: 0xf1e3c4, beakC: 0x2b2b35 }); tick(g, t => { b.rotation.y = Math.sin(t * 0.7) * 0.8; }); },
    scarecrow: g => { cyl(g, 0.008, 0.008, 0.4, DARK, 0, 0.2, 0, 5); cyl(g, 0.006, 0.006, 0.28, DARK, 0, 0.3, 0, 5).rotation.z = P2; bx(g, 0.12, 0.12, 0.05, 0x4dabf7, 0, 0.27, 0); [-1, 1].forEach(s => tilt(cn(g, 0.012, 0.04, 0xe9c46a, s * 0.14, 0.3, 0, 5), 0, 0, s * P2)); sph(g, 0.04, 0xf1d9a0, 0, 0.38, 0); cyl(g, 0.06, 0.06, 0.01, 0xc8a24a, 0, 0.41, 0, 12); cyl(g, 0.03, 0.035, 0.04, 0xc8a24a, 0, 0.43, 0, 12); eyes(g, 0.39, 0.035, 0.014, 0.006); },
    rockgarden: g => { [[0, 0, 0.06, 0x9aa0a8], [0.08, 0.04, 0.045, 0xb7ada0], [-0.07, 0.05, 0.04, 0x8a8f96], [0.02, -0.07, 0.035, 0xa8a49a]].forEach(([x, z, r, c], i) => add(g, rough(new T.DodecahedronGeometry(r, 0), r * 0.15, 60 + i), mat(c, { flat: true }), x, r * 0.6, z)); [[0.05, -0.04], [-0.04, 0.08]].forEach(([x, z]) => sph(g, 0.012, 0xff8fb1, x, 0.012, z)); },
    stonelanterns: g => [-0.08, 0.08].forEach(x => { bx(g, 0.05, 0.02, 0.05, 0xb7ada0, x, 0.01, 0); cyl(g, 0.012, 0.012, 0.1, 0xb7ada0, x, 0.07, 0, 6); bx(g, 0.05, 0.04, 0.05, 0xb7ada0, x, 0.14, 0); glow(g, 0.012, 0xffd36b, x, 0.14, 0.024); cn(g, 0.05, 0.04, 0x9aa0a8, x, 0.18, 0, 4).rotation.y = PI / 4; }),
    sundial: g => { cyl(g, 0.04, 0.05, 0.12, 0xbdb3a4, 0, 0.06, 0, 10); disc(g, 0.07, 0xc9a24a, 0, 0.125, 0, 0.01, 20); const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.05, 0); sh.lineTo(0, 0.04); sh.closePath(); add(g, new T.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: false }), mat(0x8a6a2a), -0.025, 0.13, -0.002); },
    archway: g => { [-0.12, 0.12].forEach(x => cyl(g, 0.008, 0.008, 0.28, 0xffffff, x, 0.14, 0, 5)); tor(g, 0.12, 0.008, 0xffffff, 0, 0.28, 0, PI); for (let i = 0; i < 18; i++) { const a = i / 17 * PI, x = Math.cos(a) * 0.12, y = 0.28 + Math.sin(a) * 0.12; sph(g, 0.02, 0x3d9b4f, x, y, 0.01); if (i % 3 === 0) sph(g, 0.012, 0xff6b9d, x, y, 0.025); } for (let i = 0; i < 6; i++) sph(g, 0.02, 0x3d9b4f, (i < 3 ? -0.12 : 0.12), 0.05 + (i % 3) * 0.08, 0.01); },
    pondbridge: g => { for (let i = 0; i < 9; i++) { const t = i / 8 - 0.5, y = 0.06 + Math.cos(t * PI) * 0.06; bx(g, 0.035, 0.012, 0.14, WOOD, t * 0.36, y, 0).rotation.z = -Math.sin(t * PI) * 0.4; } [-1, 1].forEach(s => { for (let i = 0; i < 5; i++) { const t = i / 4 - 0.5; cyl(g, 0.005, 0.005, 0.08, DARK, t * 0.32, 0.1 + Math.cos(t * PI) * 0.06, s * 0.065, 4); } }); },
    butterflygarden: g => { bx(g, 0.3, 0.03, 0.18, 0x7a5236, 0, 0.015, 0); bloom(g, [0xff8fb1, 0xffd43b, 0xc084fc, 0xff8c42], 8, 0.11, 0.02, 0.12); const fl = []; for (let i = 0; i < 3; i++) { const b = new T.Group(); g.add(b); [-1, 1].forEach(s => { const w = add(b, new T.CircleGeometry(0.018, 8), mat([0xff8c1a, 0x4dabf7, 0xff6b9d][i], { ds: true }), s * 0.012, 0, 0); w.userData.noInk = true; w.rotation.y = s * 0.6; }); fl.push(b); } tick(g, t => fl.forEach((b, i) => { b.position.set(Math.cos(t * 0.6 + i * 2) * 0.12, 0.18 + Math.sin(t * 1.3 + i) * 0.04, Math.sin(t * 0.6 + i * 2) * 0.08); b.children.forEach((w, k) => { w.rotation.y = (k ? -1 : 1) * (0.3 + Math.abs(Math.sin(t * 14 + i)) * 0.9); }); })); },
    wishingwell: g => { cyl(g, 0.1, 0.1, 0.1, 0xb7ada0, 0, 0.05, 0, 14); add(g, new T.CylinderGeometry(0.08, 0.08, 0.006, 14), water(0x3f8fd8), 0, 0.09, 0); [-0.09, 0.09].forEach(x => cyl(g, 0.01, 0.01, 0.2, WOOD, x, 0.18, 0, 5)); cn(g, 0.15, 0.08, 0xc0604a, 0, 0.31, 0, 4).rotation.y = PI / 4; cyl(g, 0.008, 0.008, 0.18, WOOD, 0, 0.22, 0, 5).rotation.z = P2; cyl(g, 0.02, 0.018, 0.03, 0x8a5a3c, 0, 0.15, 0, 8); },
    greenhouse: g => { bx(g, 0.34, 0.16, 0.24, 0xffffff, 0, 0.08, 0); add(g, new T.BoxGeometry(0.33, 0.15, 0.23), mat(0xcfefff, { op: 0.45 }), 0, 0.08, 0).userData.noInk = true; [-1, 1].forEach(s => { add(g, new T.BoxGeometry(0.2, 0.008, 0.26), mat(0xcfefff, { op: 0.45 }), s * 0.085, 0.2, 0).rotation.z = -s * 0.55; }); for (let i = 0; i < 4; i++) { const x = -0.12 + i * 0.08; cyl(g, 0.004, 0.004, 0.06, 0x2f9e44, x, 0.03, 0, 4); sph(g, 0.016, [0xff6b6b, 0xffd43b][i % 2], x, 0.06, 0); } },
  });
  const kiwiStone = g => { const c = 0xc8c0b0; sph(g, 0.09, c, 0, 0.08, 0, 1, 0.85, 1.2); sph(g, 0.045, c, 0, 0.12, 0.09); tilt(cyl(g, 0.006, 0.011, 0.13, c, 0, 0.085, 0.17, 6), 1.95); [-0.03, 0.03].forEach(x => cyl(g, 0.008, 0.008, 0.05, c, x, 0.02, 0, 5)); };
  M.kiwistatue = g => { bx(g, 0.16, 0.06, 0.12, 0xbdb3a4, 0, 0.03, 0); const k = new T.Group(); k.position.y = 0.06; k.scale.setScalar(1.3); g.add(k); kiwiStone(k); };

  /* ---------- Outdoor living ---------- */
  Object.assign(M, {
    picnicblanket: g => { for (let i = 0; i < 16; i++) bx(g, 0.06, 0.006, 0.06, (i + Math.floor(i / 4)) % 2 ? 0xe03131 : 0xffffff, -0.09 + (i % 4) * 0.06, 0.003, -0.09 + Math.floor(i / 4) * 0.06); bx(g, 0.08, 0.05, 0.06, 0xc98d5a, 0.04, 0.03, -0.03); tor(g, 0.03, 0.004, 0x8a5a3c, 0.04, 0.06, -0.03, PI); sph(g, 0.016, 0xe03131, -0.05, 0.015, 0.05); },
    umbrella: g => { cyl(g, 0.006, 0.006, 0.36, 0xffffff, 0, 0.18, 0, 5); for (let i = 0; i < 8; i++) { const a = i / 8 * PI * 2; add(g, new T.ConeGeometry(0.22, 0.09, 8, 1, true, a, PI / 4), mat(i % 2 ? 0xffffff : 0xff6b6b, { ds: true }), 0, 0.38, 0); } bx(g, 0.18, 0.006, 0.1, 0x4dabf7, 0.06, 0.003, 0.08); },
    deckchairs: g => [-0.07, 0.07].forEach((x, i) => { tilt(bx(g, 0.08, 0.004, 0.16, [0x4dabf7, 0xffd43b][i], x, 0.07, 0), -0.6); [-1, 1].forEach(s => tilt(cyl(g, 0.004, 0.004, 0.14, WOOD, x + s * 0.04, 0.06, 0, 4), 0.6)); }),
    clothesline: g => { cyl(g, 0.01, 0.012, 0.36, 0x9aa0a8, 0, 0.18, 0, 6); const h = new T.Group(); h.position.y = 0.34; g.add(h); ring(4, a => stick(h, [0, 0, 0], [Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.2], 0.004, 0x9aa0a8)); [0.08, 0.15].forEach(r => { const o = tor(h, r, 0.0015, 0xdddddd, 0, 0.012 + r * 0.12, 0, PI * 2); o.rotation.x = P2; }); [[0.12, 0, 0xff6b9d], [-0.1, 0.06, 0x4dabf7], [0.02, -0.14, 0xffd43b]].forEach(([x, z, c]) => bx(h, 0.05, 0.06, 0.004, c, x, -0.02, z).rotation.y = Math.atan2(x, z)); tick(g, t => { h.rotation.y = Math.sin(t * 0.3) * 0.6; }); },
    lanterns: g => { [-0.15, 0.15].forEach(x => cyl(g, 0.006, 0.006, 0.3, DARK, x, 0.15, 0, 5)); stick(g, [-0.15, 0.29, 0], [0.15, 0.29, 0], 0.002, 0x333333); [-0.08, 0, 0.08].forEach((x, i) => { cyl(g, 0.0015, 0.0015, 0.03, 0x333333, x, 0.27, 0, 3); const l = add(g, new T.SphereGeometry(0.025, 10, 8), mat([0xff6b6b, 0xffd43b, 0x69db7c][i], { e: [0x7a1010, 0x7a5a00, 0x1a5a1a][i] }), x, 0.235, 0); l.scale.y = 1.2; }); },
    fairylights: g => { const pts = [[-0.18, 0.28], [-0.06, 0.24], [0.06, 0.27], [0.18, 0.23]]; [-0.18, 0.18].forEach(x => cyl(g, 0.005, 0.005, 0.3, DARK, x, 0.15, 0, 5)); const bulbs = []; for (let i = 0; i < 13; i++) { const t = i / 12, x = -0.18 + t * 0.36, y = 0.28 - Math.sin(t * PI) * 0.06; bulbs.push(glow(g, 0.008, [0xfff3bf, 0xffd36b, 0xff9fb4, 0x9fe3ff][i % 4], x, y, 0)); } for (let i = 0; i < 12; i++) { const t0 = i / 12, t1 = (i + 1) / 12; stick(g, [-0.18 + t0 * 0.36, 0.285 - Math.sin(t0 * PI) * 0.06, 0], [-0.18 + t1 * 0.36, 0.285 - Math.sin(t1 * PI) * 0.06, 0], 0.0012, 0x333333); } tick(g, t => bulbs.forEach((b, i) => { b.scale.setScalar(0.85 + Math.abs(Math.sin(t * 2 + i)) * 0.35); })); },
    shower: g => { bx(g, 0.14, 0.012, 0.14, WOOD, 0, 0.006, 0); cyl(g, 0.006, 0.006, 0.36, 0xced4da, -0.05, 0.18, -0.05, 5); stick(g, [-0.05, 0.36, -0.05], [0, 0.36, 0], 0.005, 0xced4da); cyl(g, 0.025, 0.012, 0.015, 0xced4da, 0, 0.35, 0, 10); const d = add(g, new T.CylinderGeometry(0.02, 0.03, 0.28, 8, 1, true), mat(0x9be7ff, { op: 0.35, ds: true }), 0, 0.2, 0); d.userData.noInk = true; },
    bbq: g => { bx(g, 0.2, 0.1, 0.12, 0x2b2b35, 0, 0.12, 0); [-1, 1].forEach(sx => [-1, 1].forEach(sz => cyl(g, 0.006, 0.006, 0.08, 0x495057, sx * 0.08, 0.04, sz * 0.05, 4))); tilt(bx(g, 0.2, 0.012, 0.12, 0x343a40, 0, 0.2, -0.06), -0.9); for (let i = 0; i < 3; i++) { cyl(g, 0.008, 0.008, 0.07, 0xa8553a, -0.05 + i * 0.05, 0.18, 0.02, 6).rotation.x = P2; } bx(g, 0.07, 0.012, 0.08, WOOD, 0.14, 0.15, 0); },
    tent: g => { add(g, new T.SphereGeometry(0.16, 16, 8, 0, PI * 2, 0, P2), mat(0xff8c42), 0, 0, 0).scale.y = 0.9; add(g, new T.CircleGeometry(0.06, 12, 0, PI), mat(0x3b2a1e), 0, 0.0, 0.158).userData.noInk = true; for (let i = 0; i < 2; i++) tor(g, 0.16, 0.003, 0x495057, 0, 0, 0, PI).rotation.y = i * P2; },
    swingseat: g => { [-0.15, 0.15].forEach(x => { tilt(cyl(g, 0.01, 0.01, 0.36, 0xffffff, x, 0.17, -0.05, 5), 0.25); tilt(cyl(g, 0.01, 0.01, 0.36, 0xffffff, x, 0.17, 0.05, 5), -0.25); }); cyl(g, 0.01, 0.01, 0.32, 0xffffff, 0, 0.34, 0, 5).rotation.z = P2; const s = new T.Group(); s.position.y = 0.34; g.add(s); [-0.11, 0.11].forEach(x => cyl(s, 0.002, 0.002, 0.18, 0x666666, x, -0.09, 0, 3)); bx(s, 0.26, 0.02, 0.09, 0x4dabf7, 0, -0.18, 0); bx(s, 0.26, 0.08, 0.015, 0x4dabf7, 0, -0.14, -0.04); tick(g, t => { s.rotation.x = Math.sin(t * 1.2) * 0.2; }); },
    bikerack: g => { [-0.05, 0.05].forEach(z => tor(g, 0.04, 0.005, 0x9aa0a8, 0.1, 0.04, z, PI)); const b = new T.Group(); b.position.set(-0.04, 0, 0.02); g.add(b); [-0.07, 0.07].forEach(x => tor(b, 0.045, 0.007, 0x222222, x, 0.045, 0).rotation.y = 0); stick(b, [-0.07, 0.045, 0], [0, 0.09, 0], 0.006, 0x4dabf7); stick(b, [0, 0.09, 0], [0.07, 0.045, 0], 0.006, 0x4dabf7); stick(b, [-0.02, 0.045, 0], [0, 0.09, 0], 0.006, 0x4dabf7); stick(b, [0.05, 0.12, 0], [0.07, 0.045, 0], 0.005, 0x4dabf7); cyl(b, 0.004, 0.004, 0.06, 0x222222, 0.05, 0.12, 0, 4).rotation.x = P2; bx(b, 0.03, 0.008, 0.015, 0x222222, -0.005, 0.1, 0); },
    watertank: g => { cyl(g, 0.11, 0.11, 0.26, 0x8fa7a3, 0, 0.13, 0, 18); for (let i = 1; i < 6; i++) tor(g, 0.112, 0.003, 0x7a908c, 0, i * 0.045, 0).rotation.x = P2; cn(g, 0.115, 0.04, 0x8fa7a3, 0, 0.28, 0, 18); cyl(g, 0.006, 0.006, 0.04, 0xced4da, 0.1, 0.03, 0.04, 5).rotation.z = P2; },
    pizzaoven: g => { bx(g, 0.24, 0.1, 0.2, 0xb7ada0, 0, 0.05, 0); add(g, new T.SphereGeometry(0.1, 16, 8, 0, PI * 2, 0, P2), mat(0xc0604a), 0, 0.1, 0); add(g, new T.CircleGeometry(0.04, 12, 0, PI), mat(0x2b1d18), 0, 0.1, 0.098).userData.noInk = true; glow(g, 0.015, 0xff8c1a, 0, 0.11, 0.08); cyl(g, 0.015, 0.015, 0.08, 0x9aa0a8, 0.03, 0.22, -0.03, 8); },
    shed: g => { bx(g, 0.24, 0.2, 0.18, 0x6f9a6a, 0, 0.1, 0); [-1, 1].forEach(s => tilt(bx(g, 0.15, 0.012, 0.22, 0x5b5f6e, s * 0.06, 0.24, 0), 0, 0, -s * 0.6)); bx(g, 0.24, 0.07, 0.012, 0x6f9a6a, 0, 0.2, 0.084); bx(g, 0.08, 0.15, 0.006, 0xf6f1e4, -0.05, 0.075, 0.091); bx(g, 0.05, 0.05, 0.006, 0x9fd3ff, 0.06, 0.12, 0.091); },
    deck: g => { for (let i = 0; i < 8; i++) bx(g, 0.044, 0.02, 0.32, WOOD, -0.16 + i * 0.046, 0.04, 0); [-1, 1].forEach(sz => { for (let i = 0; i < 5; i++) cyl(g, 0.006, 0.006, 0.08, 0xffffff, -0.16 + i * 0.08, 0.09, sz * 0.15, 5); bx(g, 0.34, 0.012, 0.012, 0xffffff, 0, 0.13, sz * 0.15); }); cyl(g, 0.04, 0.04, 0.01, 0xffd43b, 0.05, 0.06, 0, 12); },
    solar: g => { [[-0.08, 0], [0.08, 0]].forEach(([x]) => { cyl(g, 0.006, 0.006, 0.1, 0x9aa0a8, x, 0.05, 0.05, 4); cyl(g, 0.006, 0.006, 0.18, 0x9aa0a8, x, 0.09, -0.06, 4); }); const p = tilt(bx(g, 0.3, 0.012, 0.18, 0x1f3f8f, 0, 0.14, 0), -0.6); add(g, new T.BoxGeometry(0.29, 0.013, 0.17), mat(0x2f5fbf, { std: true, m: 0.4, r: 0.2 }), 0, 0.141, 0).rotation.x = -0.6; for (let i = 1; i < 4; i++) tilt(bx(g, 0.002, 0.014, 0.18, 0xdfe7ef, -0.15 + i * 0.075, 0.142, 0), -0.6); },
    hottub: g => { cyl(g, 0.15, 0.15, 0.1, 0x8a5a3c, 0, 0.05, 0, 20); add(g, new T.CylinderGeometry(0.13, 0.13, 0.01, 20), water(0x6fd6ff), 0, 0.095, 0); const b = []; for (let i = 0; i < 5; i++) { const o = add(g, new T.SphereGeometry(0.01, 6, 4), mat(0xffffff, { op: 0.8 }), Math.cos(i * 1.3) * 0.08, 0.1, Math.sin(i * 1.3) * 0.08); o.userData.noInk = true; b.push(o); } tick(g, t => b.forEach((o, i) => { o.position.y = 0.1 + ((t * 0.3 + i * 0.2) % 1) * 0.04; })); },
    workshop: g => { bx(g, 0.34, 0.22, 0.24, 0xc0604a, 0, 0.11, 0); [-1, 1].forEach(s => tilt(bx(g, 0.2, 0.014, 0.28, 0x5b5f6e, s * 0.085, 0.27, 0), 0, 0, -s * 0.55)); bx(g, 0.18, 0.15, 0.006, 0xd8dde3, 0, 0.075, 0.121); for (let i = 1; i < 5; i++) bx(g, 0.18, 0.004, 0.008, 0xb7c0ca, 0, i * 0.03, 0.123); bx(g, 0.1, 0.06, 0.006, 0xffffff, 0, 0.19, 0.121); },
    cinema: g => { [-0.2, 0.2].forEach(x => cyl(g, 0.008, 0.008, 0.36, 0x2b2b35, x, 0.18, -0.1, 5)); bx(g, 0.4, 0.22, 0.008, 0xffffff, 0, 0.24, -0.1); bx(g, 0.36, 0.18, 0.009, 0x4dabf7, 0, 0.24, -0.095).userData.noInk = true; [[-0.12, 0.08], [0, 0.08], [0.12, 0.08], [-0.06, 0.18], [0.06, 0.18]].forEach(([x, z], i) => { bx(g, 0.08, 0.04, 0.07, [0xe03131, 0xffd43b][i % 2], x, 0.02, z); bx(g, 0.08, 0.05, 0.015, [0xe03131, 0xffd43b][i % 2], x, 0.06, z + 0.03); }); },
    ute: g => { bx(g, 0.3, 0.07, 0.14, 0xffffff, 0, 0.07, 0); bx(g, 0.12, 0.07, 0.13, 0xffffff, 0.06, 0.135, 0); bx(g, 0.1, 0.05, 0.132, 0x9fd3ff, 0.062, 0.14, 0); bx(g, 0.15, 0.015, 0.13, 0x9aa0a8, -0.08, 0.11, 0); [[-0.09, -1], [-0.09, 1], [0.09, -1], [0.09, 1]].forEach(([x, s]) => tilt(cyl(g, 0.03, 0.03, 0.02, 0x222222, x, 0.03, s * 0.07, 12), P2)); [0, 1, 2].forEach(i => bx(g, 0.04, 0.03, 0.04, [0xe9c46a, 0xff8c1a, 0x8fbf4a][i], -0.13 + i * 0.045, 0.125, 0)); },
    pool: g => { bx(g, 0.5, 0.06, 0.32, 0xdfe7ef, 0, 0.02, 0); add(g, new T.BoxGeometry(0.45, 0.01, 0.27), water(0x4dc2ff), 0, 0.052, 0); stick(g, [0.22, 0.05, -0.12], [0.22, 0.13, -0.12], 0.004, 0xced4da); stick(g, [0.22, 0.05, -0.08], [0.22, 0.13, -0.08], 0.004, 0xced4da); tor(g, 0.035, 0.012, 0xff6b6b, -0.1, 0.06, 0.04).rotation.x = P2; bx(g, 0.1, 0.01, 0.04, 0x4dabf7, 0.18, 0.15, 0.1); },
  });

  /* ---------- Big dreams ---------- */
  Object.assign(M, {
    giantfruit: g => { bx(g, 0.2, 0.06, 0.2, 0xbdb3a4, 0, 0.03, 0); const f = new T.Group(); f.position.y = 0.2; g.add(f); add(f, new T.SphereGeometry(0.14, 20, 14, 0, PI), mat(0x8a5a2b), 0, 0, 0).rotation.y = -P2; add(f, new T.CircleGeometry(0.135, 24), mat(0x7fc241), 0, 0, 0.001).userData.noInk = true; add(f, new T.CircleGeometry(0.05, 18), mat(0xf6f1c8), 0, 0, 0.003).userData.noInk = true; ring(12, a => sph(f, 0.006, 0x1b1b2a, Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0.004)); tick(g, t => { f.rotation.y = Math.sin(t * 0.4) * 0.5; }); },
    clocktower: g => { bx(g, 0.18, 0.6, 0.18, 0xd9c7a8, 0, 0.3, 0); bx(g, 0.2, 0.03, 0.2, 0xbdab8a, 0, 0.61, 0); cn(g, 0.16, 0.22, 0x2f6fb5, 0, 0.73, 0, 4).rotation.y = PI / 4; const hands = []; [[0, 0.091], [0.091, 0], [0, -0.091], [-0.091, 0]].forEach(([x, z]) => { const f = new T.Group(); f.position.set(x, 0.48, z); f.lookAt(x * 10, 0.48, z * 10); g.add(f); add(f, new T.CircleGeometry(0.06, 20), mat(0xffffff)).userData.noInk = true; const h = new T.Group(); h.position.z = 0.002; f.add(h); bx(h, 0.004, 0.045, 0.002, 0x1b1b2a, 0, 0.02, 0); hands.push(h); }); tick(g, t => hands.forEach(h => { h.rotation.z = -t * 0.5; })); },
    observatory: g => { cyl(g, 0.16, 0.18, 0.18, 0xf1ece4, 0, 0.09, 0, 20); const d = new T.Group(); d.position.y = 0.18; g.add(d); add(d, new T.SphereGeometry(0.16, 20, 10, 0, PI * 2, 0, P2), mat(0xced4da, { std: true, m: 0.5, r: 0.3 })); bx(d, 0.05, 0.17, 0.12, 0x1b1b2a, 0, 0.08, 0.1).rotation.x = -0.6; tilt(cyl(d, 0.025, 0.035, 0.16, 0x5c7cfa, 0, 0.13, 0.08, 10), -0.7); bx(g, 0.06, 0.09, 0.006, 0x8a5a3c, 0, 0.045, 0.172); tick(g, t => { d.rotation.y = t * 0.15; }); },
    treevillage: g => { [[-0.15, -0.05, 0.55], [0.15, 0.05, 0.6], [0, -0.18, 0.5]].forEach(([x, z, h], i) => { cyl(g, 0.035, 0.05, h, DARK, x, h / 2, z, 8); blob(g, 0.13, 0x3d9b4f, x, h + 0.1, z, 80 + i); bx(g, 0.18, 0.015, 0.16, WOOD, x, h * 0.7, z); bx(g, 0.11, 0.09, 0.1, [0xe9c08a, 0xffd6e8, 0xd6ecff][i], x, h * 0.7 + 0.055, z); cn(g, 0.1, 0.07, [0xe5533d, 0xff6b9d, 0x4dabf7][i], x, h * 0.7 + 0.135, z, 4).rotation.y = PI / 4; }); stick(g, [-0.07, 0.385, -0.05], [0.07, 0.42, 0.05], 0.006, 0xeadfc4); stick(g, [-0.1, 0.37, -0.08], [-0.03, 0.35, -0.16], 0.006, 0xeadfc4); },
    castletower: g => { cyl(g, 0.13, 0.15, 0.7, 0xc9c3d6, 0, 0.35, 0, 16); ring(8, a => bx(g, 0.05, 0.06, 0.05, 0xc9c3d6, Math.cos(a) * 0.13, 0.73, Math.sin(a) * 0.13)); [0.25, 0.45].forEach(y => bx(g, 0.04, 0.07, 0.006, 0x3b2a5a, 0, y, 0.147)); bx(g, 0.08, 0.12, 0.006, 0x8a5a3c, 0, 0.06, 0.148); cyl(g, 0.004, 0.004, 0.3, 0x777777, 0, 0.85, 0, 4); const f = tilt(bx(g, 0.12, 0.07, 0.004, 0xe03131, 0.06, 0.96, 0), 0); tick(g, t => { f.rotation.y = Math.sin(t * 2) * 0.3; }); },
    launchpad: g => { cyl(g, 0.2, 0.22, 0.04, 0x9aa0a8, 0, 0.02, 0, 20); for (let i = 0; i < 6; i++) cyl(g, 0.01, 0.01, 0.06 + (i % 3) * 0.04, 0x495057, Math.cos(i) * 0.15, 0.06, Math.sin(i) * 0.15, 4); const r = new T.Group(); r.position.y = 0.04; g.add(r); cyl(r, 0.05, 0.06, 0.36, 0xf5f7ff, 0, 0.22, 0, 14); cn(r, 0.05, 0.12, 0xe03131, 0, 0.46, 0, 14); ring(3, a => { const f = new T.Group(); f.rotation.y = a; r.add(f); bx(f, 0.008, 0.1, 0.06, 0xe03131, 0, 0.08, 0.07); }); sph(r, 0.022, 0x4dabf7, 0, 0.3, 0.05); [0.13, 0.2, 0.27].forEach(y => tor(r, 0.051, 0.003, 0xc0c6d0, 0, y, 0).rotation.x = P2); bx(g, 0.04, 0.48, 0.04, 0xff8c1a, -0.12, 0.26, -0.05); [0.2, 0.36].forEach(y => bx(g, 0.07, 0.012, 0.012, 0xff8c1a, -0.08, y, -0.05)); const fl = add(r, new T.ConeGeometry(0.04, 0.1, 10), mat(0xffb020, { e: 0xff6a00 }), 0, -0.01, 0); fl.rotation.x = PI; fl.userData.noInk = true; tick(g, t => { const c = (t % 14), up = c > 10 ? Math.pow(c - 10, 2) * 0.12 : 0; r.position.y = 0.04 + up; fl.visible = c > 9.2; fl.scale.y = 0.8 + Math.random() * 0.5; }); },
    goldstatue: g => { bx(g, 0.2, 0.08, 0.2, 0xf1ece4, 0, 0.04, 0); bx(g, 0.16, 0.04, 0.16, 0xffc93c, 0, 0.1, 0); const G = GOLD(); add(g, new T.CylinderGeometry(0.045, 0.06, 0.16, 12), G, 0, 0.2, 0); add(g, new T.SphereGeometry(0.05, 16, 12), G, 0, 0.32, 0); [-1, 1].forEach(s => { const a = add(g, new T.CylinderGeometry(0.012, 0.012, 0.12, 8), G, s * 0.065, 0.27, 0); a.rotation.z = s * 2.5; }); g.userData.avatarAt = [0, 0.48, 0]; },
    trophy: g => { bx(g, 0.16, 0.08, 0.16, 0x2b2b35, 0, 0.04, 0); const G = GOLD(); add(g, new T.CylinderGeometry(0.03, 0.045, 0.03, 12), G, 0, 0.095, 0); add(g, new T.CylinderGeometry(0.012, 0.012, 0.06, 8), G, 0, 0.14, 0); add(g, new T.CylinderGeometry(0.075, 0.03, 0.12, 16, 1, true), G, 0, 0.23, 0); [-1, 1].forEach(s => { const h = add(g, new T.TorusGeometry(0.03, 0.007, 6, 12, PI), G, s * 0.075, 0.24, 0); h.rotation.z = s * -P2; }); g.userData.badgeAt = [0, 0.04, 0.085]; },
  });

  /* ---------- Seasonal shelf ---------- */
  Object.assign(M, {
    lunarlanterns: g => { [-0.17, 0.17].forEach(x => cyl(g, 0.006, 0.006, 0.34, 0xc0392b, x, 0.17, 0, 5)); stick(g, [-0.17, 0.33, 0], [0.17, 0.33, 0], 0.002, 0x333333); [-0.09, 0, 0.09].forEach((x, i) => { cyl(g, 0.002, 0.002, 0.03, 0x333333, x, 0.315, 0, 3); const l = add(g, new T.SphereGeometry(0.035, 12, 10), mat(0xe03131, { e: 0x5a0a0a }), x, 0.26, 0); l.scale.y = 0.8; cyl(g, 0.02, 0.02, 0.01, 0xffc93c, x, 0.29, 0, 10); cyl(g, 0.02, 0.02, 0.01, 0xffc93c, x, 0.233, 0, 10); cyl(g, 0.003, 0.003, 0.04, 0xffc93c, x, 0.21, 0, 3); }); },
    eastereggs: g => { cyl(g, 0.09, 0.07, 0.06, 0xc98d5a, 0, 0.03, 0, 14); tor(g, 0.08, 0.005, 0xa86f3e, 0, 0.12, 0, PI); [[0, 0.07, 0, 0xff8fb1], [0.04, 0.065, 0.02, 0x74c0fc], [-0.04, 0.065, -0.01, 0xffd43b], [0.12, 0.025, 0.06, 0x69db7c], [-0.1, 0.025, 0.07, 0xc084fc]].forEach(([x, y, z, c]) => sph(g, 0.025, c, x, y, z, 0.8, 1.1, 0.8)); },
    matarikistars: g => { cyl(g, 0.006, 0.006, 0.42, WOOD, 0, 0.21, 0, 5); [[0, 0.5], [0.05, 0.47], [-0.05, 0.47], [0.08, 0.53], [-0.07, 0.55], [0.02, 0.58], [-0.02, 0.44], [0.06, 0.6], [-0.04, 0.62]].forEach(([x, y], i) => { glow(g, i ? 0.011 : 0.016, 0xfff3bf, x, y, 0); }); },
    matarikikites: g => { cyl(g, 0.004, 0.004, 0.5, 0x8a5a3c, 0, 0.25, 0, 4); const k = new T.Group(); k.position.y = 0.58; g.add(k); const sh = new T.Shape(); sh.moveTo(0, 0.12); sh.lineTo(0.09, -0.02); sh.lineTo(0, -0.1); sh.lineTo(-0.09, -0.02); sh.closePath(); add(k, new T.ShapeGeometry(sh), mat(0xe9c46a, { ds: true })); add(k, new T.ShapeGeometry(sh), mat(0xc0392b, { ds: true }), 0, 0, 0.002).scale.setScalar(0.6); for (let i = 0; i < 4; i++) sph(k, 0.008, [0xffffff, 0x2b2b35][i % 2], 0, -0.13 - i * 0.03, 0); tick(g, t => { k.position.x = Math.sin(t * 0.8) * 0.05; k.rotation.z = Math.sin(t * 1.1) * 0.2; }); },
    halloweenlantern: g => { sph(g, 0.08, 0xff8c1a, 0, 0.065, 0, 1.2, 0.85, 1.2); cyl(g, 0.01, 0.012, 0.03, 0x2f9e44, 0, 0.14, 0, 5); [[-0.03, 0.08], [0.03, 0.08]].forEach(([x, y]) => add(g, new T.CircleGeometry(0.014, 3), mat(0xffe066, { e: 0xffa000 }), x, y, 0.094).userData.noInk = true); add(g, new T.CircleGeometry(0.035, 12, PI, PI), mat(0xffe066, { e: 0xffa000 }), 0, 0.05, 0.096).userData.noInk = true; },
    diwalilights: g => { for (let i = 0; i < 5; i++) { const x = (i - 2) * 0.07; add(g, new T.SphereGeometry(0.025, 12, 8, 0, PI * 2, P2, P2), mat(0xc0604a, { ds: true }), x, 0.025, 0).rotation.x = 0; const f = add(g, new T.ConeGeometry(0.008, 0.03, 8), mat(0xffd43b, { e: 0xff8c00 }), x, 0.04, 0); f.userData.noInk = true; } tick(g, t => g.children.forEach((c, i) => { if (c.geometry && c.geometry.type === 'ConeGeometry') c.scale.y = 0.8 + Math.sin(t * 12 + i) * 0.2; })); },
    xmastree: g => { cyl(g, 0.025, 0.03, 0.06, DARK, 0, 0.03, 0, 6); [[0.14, 0.14, 0.12], [0.11, 0.12, 0.22], [0.08, 0.1, 0.31]].forEach(([r, h, y]) => cn(g, r, h, 0x2f7d3f, 0, y, 0, 12)); ring(10, (a, i) => sph(g, 0.012, [0xe03131, 0xffd43b, 0x4dabf7][i % 3], Math.cos(a) * (0.1 - (i % 3) * 0.025), 0.1 + (i % 3) * 0.1, Math.sin(a) * (0.1 - (i % 3) * 0.025))); const st = add(g, new T.OctahedronGeometry(0.03, 0), mat(0xffd43b, { e: 0x7a5a00 }), 0, 0.39, 0); tick(g, t => { st.rotation.y = t; }); },
    xmaslights: g => { [-0.18, 0.18].forEach(x => cyl(g, 0.005, 0.005, 0.3, 0xffffff, x, 0.15, 0, 5)); const bulbs = []; for (let i = 0; i < 11; i++) { const t = i / 10; bulbs.push(glow(g, 0.01, [0xe03131, 0x2f9e44, 0xffd43b, 0x4dabf7][i % 4], -0.18 + t * 0.36, 0.28 - Math.sin(t * PI) * 0.06, 0)); } tick(g, t => bulbs.forEach((b, i) => { b.visible = Math.sin(t * 3 + i * 1.7) > -0.6; })); },
    garland: g => { cyl(g, 0.008, 0.008, 0.18, DARK, 0, 0.09, -0.02, 5); tor(g, 0.09, 0.025, 0x2f7d4f, 0, 0.25, 0).rotation.x = 0; ring(12, a => sph(g, 0.014, 0xe03131, Math.cos(a) * 0.09, 0.25 + Math.sin(a) * 0.09, 0.02)); bx(g, 0.05, 0.03, 0.01, 0xffc93c, 0, 0.17, 0.02); },
  });

  /* ---------- Tools (also what the island jobs use) ---------- */
  Object.assign(M, {
    spade: g => { cyl(g, 0.008, 0.008, 0.36, WOOD, 0, 0.22, 0, 6); tor(g, 0.025, 0.006, 0x2b2b35, 0, 0.42, 0, PI).rotation.z = PI; add(g, new T.BoxGeometry(0.07, 0.09, 0.008), mat(0x9aa7b5, { std: true, m: 0.6, r: 0.3 }), 0, 0.04, 0); },
    wateringcan: g => { cyl(g, 0.05, 0.055, 0.09, 0x40c057, 0, 0.045, 0, 14); tilt(cyl(g, 0.008, 0.012, 0.12, 0x40c057, 0.08, 0.08, 0, 6), 0, 0, -0.9); cyl(g, 0.018, 0.012, 0.015, 0x2f9e44, 0.13, 0.12, 0, 8).rotation.z = -0.9; tor(g, 0.035, 0.007, 0x2f9e44, -0.02, 0.1, 0, PI).rotation.z = 0.3; },
    broom: g => { cyl(g, 0.006, 0.006, 0.4, WOOD, 0, 0.26, 0, 6); cn(g, 0.05, 0.08, 0xe9c46a, 0, 0.04, 0, 10); tor(g, 0.026, 0.005, 0xe03131, 0, 0.08, 0).rotation.x = P2; },
    basket: g => { add(g, new T.CylinderGeometry(0.07, 0.05, 0.06, 14, 1, true), mat(0xc98d5a, { ds: true }), 0, 0.03, 0); disc(g, 0.05, 0xb07a4a, 0, 0.002, 0, 0.004, 14); tor(g, 0.065, 0.006, 0xa86f3e, 0, 0.06, 0, PI); [[0, 0.04, 0], [0.025, 0.045, 0.015], [-0.02, 0.045, -0.015]].forEach(([x, y, z]) => sph(g, 0.017, 0xfff3df, x, y, z, 0.85, 1.1, 0.85)); },
    pail: g => { cyl(g, 0.05, 0.04, 0.08, 0xc8d0da, 0, 0.04, 0, 14); add(g, new T.CylinderGeometry(0.046, 0.046, 0.006, 14), mat(0xffffff), 0, 0.078, 0); tor(g, 0.05, 0.004, 0x495057, 0, 0.08, 0, PI); },
    shears: g => [-1, 1].forEach(s => { const a = new T.Group(); a.rotation.y = s * 0.15; g.add(a); bx(a, 0.015, 0.006, 0.12, 0xced4da, s * 0.008, 0.01, 0.05); tor(a, 0.02, 0.006, 0xe03131, s * 0.012, 0.01, -0.03).rotation.x = P2; }),
    bugnet: g => { const p = new T.Group(); p.rotation.z = 0.4; cyl(p, 0.006, 0.006, 0.45, 0x8b5a3c, 0, 0.22, 0, 6); tor(p, 0.06, 0.005, 0x40c057, 0, 0.46, 0).rotation.x = P2; add(p, new T.ConeGeometry(0.06, 0.1, 14, 1, true), mat(0xe8fff0, { op: 0.6, ds: true }), 0, 0.41, 0).rotation.x = PI; g.add(p); const m = new T.Group(); m.position.set(0.1, 0.02, 0.04); g.add(m); tor(m, 0.025, 0.005, 0x2b2b35, 0, 0.03, 0).rotation.x = 0; add(m, new T.CircleGeometry(0.023, 16), mat(0xcfefff, { op: 0.5 }), 0, 0.03, 0).userData.noInk = true; tilt(cyl(m, 0.005, 0.005, 0.05, 0x2b2b35, 0.02, 0.0, 0, 5), 0, 0, 0.7); },
    clippers: g => [-1, 1].forEach(s => { const a = new T.Group(); a.position.y = 0.02; a.rotation.z = s * 0.15; cyl(a, 0.008, 0.008, 0.18, 0xff8c1a, 0, 0.09, 0, 6); bx(a, 0.012, 0.14, 0.004, 0xced4da, s * 0.004, 0.25, 0); g.add(a); }),
    rod: g => { const p = new T.Group(); p.rotation.z = 0.5; cyl(p, 0.004, 0.007, 0.55, 0x2b2b35, 0, 0.27, 0, 6); cyl(p, 0.015, 0.015, 0.02, 0xced4da, 0.012, 0.08, 0, 10).rotation.z = P2; g.add(p); cyl(g, 0.0012, 0.0012, 0.2, 0xffffff, -0.27, 0.38, 0, 3); sph(g, 0.012, 0xe03131, -0.27, 0.28, 0); },
    paintkit: g => { bx(g, 0.16, 0.012, 0.12, 0xf1e3c4, 0, 0.006, 0); [[0xe03131, -0.05, -0.03], [0xffd43b, 0, -0.03], [0x4dabf7, 0.05, -0.03], [0x40c057, -0.025, 0.02], [0xc084fc, 0.025, 0.02]].forEach(([c, x, z]) => cyl(g, 0.018, 0.018, 0.01, c, x, 0.016, z, 12)); tilt(cyl(g, 0.005, 0.005, 0.16, WOOD, 0.06, 0.05, 0.06, 5), 0, 0, 1.0); cn(g, 0.008, 0.025, 0xe03131, 0.125, 0.012, 0.06, 6).rotation.z = 1.0 + PI; },
    skimmer: g => { const p = new T.Group(); p.rotation.z = 0.5; cyl(p, 0.005, 0.005, 0.5, 0x9aa0a8, 0, 0.25, 0, 6); bx(p, 0.1, 0.006, 0.08, 0x4dabf7, 0, 0.5, 0); g.add(p); },
  });

  /* ---------- Land: shop pictures for the bigger islands and new land ---------- */
  const miniIsland = (g, r, lawn = 0x3f8f35) => { add(g, new T.ConeGeometry(r, r * 1.3, 10).rotateX(PI), mat(0x8a5f3c), 0, -r * 0.65, 0); add(g, new T.CylinderGeometry(r * 1.02, r, 0.04, 24), mat(lawn), 0, 0.02, 0); };
  Object.assign(M, {
    size1: g => { miniIsland(g, 0.16); emo(g, '↔️', 0.14, 0, 0.14, 0); },
    size2: g => { miniIsland(g, 0.19); emo(g, '⬆️', 0.14, 0, 0.16, 0); },
    size3: g => { miniIsland(g, 0.22); emo(g, '🏝️', 0.16, 0, 0.18, 0); },
    size4: g => { miniIsland(g, 0.25); emo(g, '🌏', 0.18, 0, 0.2, 0); },
    plot: g => { miniIsland(g, 0.16, 0x6b4a2a); for (let i = 0; i < 3; i++) bx(g, 0.24, 0.02, 0.05, 0x4a3020, 0, 0.045, -0.08 + i * 0.08); for (let i = 0; i < 6; i++) sph(g, 0.02, 0x3d9b4f, -0.08 + (i % 3) * 0.08, 0.07, -0.08 + Math.floor(i / 3) * 0.16); },
    orchard: g => { miniIsland(g, 0.17); [[-0.07, -0.03, 0xe03131], [0.07, 0.03, 0xffe066]].forEach(([x, z, c], i) => { cyl(g, 0.012, 0.018, 0.1, DARK, x, 0.09, z, 6); blob(g, 0.06, 0x3d9b4f, x, 0.17, z, 90 + i); ring(5, a => sph(g, 0.01, c, x + Math.cos(a) * 0.055, 0.16, z + Math.sin(a) * 0.055)); }); },
    beach: g => { miniIsland(g, 0.17, 0xf1d9a0); add(g, new T.CylinderGeometry(0.1, 0.1, 0.01, 20), water(), 0.06, 0.042, 0.06); bx(g, 0.1, 0.004, 0.05, 0xff6b6b, -0.05, 0.045, -0.04); sph(g, 0.02, 0xff8c42, -0.06, 0.05, 0.06, 1, 0.4, 1); },
    grove: g => { miniIsland(g, 0.17); [[-0.06, -0.04], [0.06, -0.02], [0, 0.06]].forEach(([x, z], i) => { cyl(g, 0.01, 0.014, 0.08, DARK, x, 0.08, z, 6); cn(g, 0.06, 0.14, 0x2e7d4f, x, 0.17, z, 8); }); },
    stable: g => { miniIsland(g, 0.17); const b = barn(g, 0, 0); b.scale.setScalar(0.6); b.position.y = 0.04; },
    lake: g => { miniIsland(g, 0.18); add(g, new T.CylinderGeometry(0.13, 0.13, 0.01, 24), water(0x3f9fe0), 0, 0.045, 0); const s = new T.Group(); s.scale.setScalar(0.5); s.position.set(0.03, 0.04, 0.02); g.add(s); M.swan(s); },
    waterfall: g => { miniIsland(g, 0.17); const w = add(g, new T.BoxGeometry(0.06, 0.3, 0.01), mat(0x9be7ff, { op: 0.75 }), 0, -0.1, 0.17); w.userData.noInk = true; add(g, new T.BoxGeometry(0.06, 0.012, 0.16), water(), 0, 0.045, 0.09); },
    lookout: g => { miniIsland(g, 0.16); add(g, rough(new T.ConeGeometry(0.13, 0.3, 7), 0.02, 95), mat(0x8a8f96, { flat: true }), 0, 0.18, 0); cn(g, 0.045, 0.06, 0xffffff, 0, 0.31, 0, 7); },
    sky: g => { const s = new T.Group(); s.position.y = 0.15; g.add(s); miniIsland(s, 0.12); for (let i = 0; i < 6; i++) bx(g, 0.04, 0.004, 0.01, WOOD, 0.06, 0.02 + i * 0.03, 0.06); [-0.02, 0.02].forEach(x => cyl(g, 0.002, 0.002, 0.16, 0xeadfc4, 0.06 + x, 0.08, 0.06, 3)); tick(g, t => { s.position.y = 0.15 + Math.sin(t * 1.2) * 0.01; }); },
  });

  /* ---------- Chore tree types (given to a chore tree with the tree spade) ---------- */
  // Each grows from (x, y, z) like the island's own trees: base size, a sway phase, and the grow factor from pruning.
  function species(g, x, y, z, kind, seed, grow = 1) {
    const r = K.mulberry(seed), t = new T.Group(), base = 0.8 + r() * 0.4;
    t.position.set(x, y, z); t.scale.setScalar(base * grow); t.userData.base = base; t.userData.sway = r() * 6;
    const trunk = (h, c = 0x8a5a3c, w = 0.035) => cyl(t, w * 0.7, w, h, c, 0, h / 2, 0, 8);
    const puffs = (c1, c2, y0, rad, n = 5, s0 = seed) => { for (let i = 0; i < n; i++) { const a = i * 2.4, d = i ? rad * 0.6 : 0; blob(t, rad * (i ? 0.75 : 1), i % 2 ? c2 : c1, Math.cos(a) * d, y0 + (i % 3) * rad * 0.35, Math.sin(a) * d, s0 + i); } };
    switch (kind) {
      case 'kowhai': trunk(0.24); puffs(0x6f9a3a, 0x8fb04a, 0.32, 0.13); ring(10, (a, i) => { const d = 0.1 + (i % 3) * 0.03; tilt(cn(t, 0.012, 0.05, 0xffd21f, Math.cos(a) * d, 0.27 + (i % 2) * 0.06, Math.sin(a) * d, 5), PI); }); break;
      case 'pine': trunk(0.14, 0x6b4a3a); [[0.17, 0.2, 0.2], [0.13, 0.18, 0.33], [0.09, 0.16, 0.45]].forEach(([rd, h, yy]) => cn(t, rd, h, 0x2e6b4f, 0, yy, 0, 10)); break;
      case 'cabbage': trunk(0.3, 0x9a8a7a, 0.022); ring(14, (a, i) => { const o = cn(t, 0.008, 0.16, i % 2 ? 0x6f9a3a : 0x8fb04a, 0, 0.36, 0, 4); o.rotation.set(Math.cos(a) * (0.6 + (i % 3) * 0.3), 0, Math.sin(a) * (0.6 + (i % 3) * 0.3)); o.position.set(Math.sin(a) * 0.05, 0.36, Math.cos(a) * 0.05); }); break;
      case 'birch': trunk(0.32, 0xf1f1ec, 0.025); for (let i = 0; i < 4; i++) bx(t, 0.028, 0.008, 0.028, 0x2b2b35, 0, 0.06 + i * 0.06, 0); puffs(0x9fcf5a, 0xc8e67a, 0.36, 0.11); break;
      case 'oak': trunk(0.2, 0x6b4a3a, 0.05); puffs(0x3d8b40, 0x5aa04a, 0.3, 0.17, 6); break;
      case 'gum': trunk(0.36, 0xd9d1c4, 0.03); puffs(0x7a9a6a, 0x9ab48a, 0.42, 0.12, 4); break;
      case 'nikau': trunk(0.36, 0x8a9a7a, 0.025); cyl(t, 0.03, 0.03, 0.06, 0x5f8a4a, 0, 0.38, 0, 8); ring(8, a => { const f = new T.Group(); f.position.y = 0.42; f.rotation.y = a; t.add(f); tilt(bx(f, 0.03, 0.006, 0.2, 0x3d8b40, 0, 0.0, 0.09), -0.35); }); break;
      case 'cherry': trunk(0.22, 0x5a3a2a); puffs(0xf47fb4, 0xffc2dc, 0.32, 0.14); break;
      case 'bottlebrush': trunk(0.2); puffs(0x4f7a3a, 0x6a8f4a, 0.3, 0.13); ring(9, (a, i) => sph(t, 0.018, 0xd9262b, Math.cos(a) * 0.12, 0.28 + (i % 3) * 0.05, Math.sin(a) * 0.12, 1, 1.8, 1)); break;
      case 'banksia': trunk(0.2, 0x7a6a5a); puffs(0x5a7a4a, 0x7a9a5a, 0.3, 0.13); ring(7, (a, i) => sph(t, 0.017, 0xf2b22a, Math.cos(a) * 0.12, 0.3 + (i % 2) * 0.06, Math.sin(a) * 0.12, 1, 2, 1)); break;
      case 'fruit': trunk(0.2); puffs(0x3d9b4f, 0x5abf5a, 0.3, 0.14); ring(9, (a, i) => sph(t, 0.016, [0xe03131, 0xff8c1a][i % 2], Math.cos(a) * 0.13, 0.28 + (i % 3) * 0.04, Math.sin(a) * 0.13)); break;
      case 'pohutukawa': trunk(0.22, 0x5a3a2a, 0.045); puffs(0x2f7d4f, 0x3d8b5a, 0.33, 0.15); ring(12, (a, i) => sph(t, 0.017, 0xe03131, Math.cos(a) * 0.14, 0.3 + (i % 3) * 0.05, Math.sin(a) * 0.14)); break;
      case 'kauri': trunk(0.5, 0x9a8f86, 0.05); puffs(0x3d6b3a, 0x527a4a, 0.56, 0.13, 4); break;
      default: return null;
    }
    g.add(t); return t;
  }

  /* ---------- Islands of land ----------
     Every piece of land a kid owns is a floating island of its own, which the studio travels to with its arrows. Each
     is built by itself at the origin, with the home island's lawn colour, grass and rock, and faces the camera's usual
     side (FRONT): the beach's sand and sea and the stable's open yard face the viewer. What's on an island is stored
     relative to it (isle, lu, lv, in island radii: toLocal and toWorld), so things keep their spot if it changes size.
     Its zones are where things go and animals wander; a zone's `not` marks spots to keep out of (the lake, the
     mountain, the veggie patch, the stable). */
  const FRONT = 0.7, SOIL = 0x8a5f3c;
  // An island's frame: its centre, radius r and (ox, oz), the way its front faces.
  const isle = key => { const r = key === 'sky' ? 0.85 : 1; return { key, a: FRONT, r, cx: 0, cz: 0, ox: Math.cos(FRONT), oz: Math.sin(FRONT) }; };
  // A spot on an island as (u, v) in its own frame (u towards the front, v across, in island radii), and back.
  const toLocal = (L, x, z) => ({ u: +(((x - L.cx) * L.ox + (z - L.cz) * L.oz) / L.r).toFixed(4), v: +((-(x - L.cx) * L.oz + (z - L.cz) * L.ox) / L.r).toFixed(4) });
  const toWorld = (L, u, v) => [L.cx + (u * L.ox - v * L.oz) * L.r, L.cz + (u * L.oz + v * L.ox) * L.r];
  // The island itself: rock underneath like the home island's, a soil band, and the grassy top with a rounded rim.
  // o: { seed, rock, lawnC, h(x, z) ground height, col(x, z, h) ground colour, side (rim colour) }. Returns the ground.
  function ground(g, L, y, o) {
    const H = 1.3 * L.r + 0.1, sa = FRONT + 2.4, rk = mat(0xffffff, { vc: true, flat: true });
    add(g, K.strata(rough(new T.ConeGeometry(L.r * 0.92, H, 12, 6).rotateX(PI), 0.16, o.seed), o.seed, o.rock), rk, L.cx, -0.115 - H / 2, L.cz);
    add(g, K.strata(rough(new T.ConeGeometry(L.r * 0.32, L.r * 0.6, 7, 3).rotateX(PI), 0.08, o.seed + 1), o.seed + 1, o.rock), rk, L.cx + Math.cos(sa) * L.r * 0.45, -0.2 - L.r * 0.3, L.cz + Math.sin(sa) * L.r * 0.45);
    add(g, new T.CylinderGeometry(L.r, L.r * 0.95, 0.24, 40), mat(SOIL), L.cx, -0.05, L.cz);
    add(g, new T.CylinderGeometry(L.r + 0.05, L.r, y - 0.08, 48, 1, true), mat(o.side || o.lawnC), L.cx, (y - 0.03 + 0.05) / 2, L.cz).userData.noInk = true;
    const n = 44, E = L.r + 0.05, geo = new T.PlaneGeometry(2 * E, 2 * E, n, n).rotateX(-P2), p = geo.attributes.position, cols = [], C = new T.Color(), mud = new T.Color(0x5a4a32);
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), z = p.getZ(i), lip = 0; const d = Math.hypot(x, z); if (d > E) { x *= E / d; z *= E / d; lip = -0.03; } const wx = L.cx + x, wz = L.cz + z, h = (o.h ? o.h(wx, wz) : 0) + lip; p.setXYZ(i, x, h, z); C.set(o.col ? o.col(wx, wz, h) : o.lawnC); if (!o.col) C.lerp(mud, K.smooth01(0.006, 0.03, -h)); C.convertSRGBToLinear(); cols.push(C.r, C.g, C.b); }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const s = add(g, geo, mat(0xffffff, { vc: true }), L.cx, y, L.cz); s.userData.noInk = true; return s;
  }
  // Grass on an island at the lawn's own density, leaving out anything in `ex`.
  const isleGrass = (g, ctx, seed, L, y, ex = {}) => { if (ctx.meadow) meadow(g, seed, L, y, ex); return K.grassField(g, seed, Math.round(ctx.dens * PI * (L.r + 0.03) ** 2), ctx.grow ?? K.MOWN + 0.3, ctx.night, { exact: true, cx: L.cx, cz: L.cz, rad: L.r + 0.03, y, tint: ctx.tint, ...ex }); };
  function meadow(g, seed, L, y, ex) {
    const n = Math.round(L.r * L.r * 70 / (1.1 * 1.1)), fm = new T.InstancedMesh(new T.SphereGeometry(0.013, 6, 4), mat(0xffffff), n), d0 = new T.Object3D(), rr = K.mulberry(seed + 41), c = new T.Color(); let k = 0;
    for (let i = 0; i < n && k < n; i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * L.r * 0.95, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0; if ((ex.not && ex.not(x, z)) || (ex.clear && ex.clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) || (ex.dens && rr() > ex.dens(x, z))) continue; d0.position.set(x, y + 0.03 + rr() * 0.02 + (ex.ground ? ex.ground(x, z) : 0), z); d0.updateMatrix(); fm.setMatrixAt(k, d0.matrix); fm.setColorAt(k++, c.set([0xff6b9d, 0xffd43b, 0xffffff, 0xc084fc, 0xff8c42][k % 5])); }
    fm.count = k; fm.userData.noInk = true; fm.userData.ownMat = true; g.add(fm);
  }
  // Posts round an island's edge, for fences and stone edging.
  const arc = (L, n, f, inset = 0.06) => { for (let i = 0; i < n; i++) { const a = i / n * PI * 2; f(L.cx + Math.cos(a) * (L.r - inset), L.cz + Math.sin(a) * (L.r - inset), a, i); } };
  // How far towards the front a point is: -1 at the back edge, 1 at the front.
  const outward = (L, x, z) => ((x - L.cx) * L.ox + (z - L.cz) * L.oz) / L.r;
  // Builds one piece of land as an island (the farm's is built by index.html, with ground()).
  // ctx: { top, lawnC, night, flat, tint, rock, dens (blades per unit area), grow, meadow }. Returns { L, zones, surf, tick }.
  function land(g, k, key, ctx) {
    const { lawnC } = ctx, L = isle(key), y = ctx.top, seed = k.seed + key.length * 17, base = { seed, rock: ctx.rock, lawnC }, zones = { lawn: { x: L.cx, z: L.cz, r: L.r * 0.8, y } }, surf = [], fx = [];
    const on = (m, hab) => { m.userData.hab = hab; surf.push(m); return m; };
    if (key === 'plot') {
      // A tilled veggie patch in the middle, with a timber edge and furrows across it.
      const pw = L.r, pd2 = L.r * 0.62, rot = -L.a + P2;
      const inPatch = (x, z, m = 0.03) => { const dx = x - L.cx, dz = z - L.cz, u = dx * Math.cos(rot) - dz * Math.sin(rot), v = dx * Math.sin(rot) + dz * Math.cos(rot); return Math.abs(u) < pw / 2 + m && Math.abs(v) < pd2 / 2 + m; };
      on(ground(g, L, y, base), 'field'); isleGrass(g, ctx, seed, L, y, { not: inPatch });
      const patch = new T.Group(); patch.position.set(L.cx, y, L.cz); patch.rotation.y = rot; g.add(patch);
      on(bx(patch, pw, 0.03, pd2, 0x6b4a2a, 0, 0.012, 0), 'plot');
      for (let i = 0; i < 6; i++) bx(patch, pw - 0.04, 0.014, 0.03, 0x4a3020, 0, 0.03, -pd2 / 2 + 0.05 + i * (pd2 - 0.1) / 5);
      [[0, pd2 / 2], [0, -pd2 / 2]].forEach(([x0, z0]) => bx(patch, pw + 0.04, 0.04, 0.025, WOOD, x0, 0.02, z0)); [-1, 1].forEach(sx => bx(patch, 0.025, 0.04, pd2, WOOD, sx * pw / 2, 0.02, 0));
      zones.plot = { x: L.cx, z: L.cz, r: Math.min(pw, pd2) * 0.42, y: y + 0.03 };
      zones.lawn.not = (x, z) => inPatch(x, z, 0.08);
    } else if (key === 'stable') {
      // A stable at the back of a fenced yard, open to the front, where horses and farm animals roam.
      const sx = L.cx - L.ox * L.r * 0.5, sz = L.cz - L.oz * L.r * 0.5;
      on(ground(g, L, y, base), 'stable'); isleGrass(g, ctx, seed, L, y, { clear: [[sx, sz, 0.3]] });
      const st = new T.Group(); st.position.set(sx, y, sz); st.rotation.y = Math.atan2(L.ox, L.oz); st.scale.setScalar(1.3); g.add(st);
      bx(st, 0.36, 0.17, 0.17, 0x9c5a3a, 0, 0.085, 0); tilt(bx(st, 0.4, 0.014, 0.23, 0x5b5f6e, 0, 0.2, 0), 0.3); for (let i = 0; i < 3; i++) bx(st, 0.07, 0.1, 0.006, 0x3b2a24, -0.11 + i * 0.11, 0.06, 0.086);
      let prev = null; arc(L, 44, (x, z) => { bx(g, 0.024, 0.1, 0.024, 0xb07a4a, x, y + 0.05, z); if (prev && Math.hypot(x - prev[0], z - prev[1]) < 0.2) [0.045, 0.085].forEach(hh => stick(g, [prev[0], y + hh, prev[1]], [x, y + hh, z], 0.006, 0xf7f3ea)); prev = [x, z]; });
      zones.stable = { x: L.cx + L.ox * L.r * 0.12, z: L.cz + L.oz * L.r * 0.12, r: L.r * 0.6, y, not: (x, z) => Math.hypot(x - sx, z - sz) < 0.36 };
    } else if (key === 'lookout') {
      // A rocky mountain in the middle, with steps winding up to a lookout on top.
      const h = 0.62, mr = L.r * 0.6;
      on(ground(g, L, y, base), 'field'); isleGrass(g, ctx, seed, L, y, { clear: [[L.cx, L.cz, mr - 0.02]] });
      add(g, rough(new T.CylinderGeometry(L.r * 0.3, mr, h, 10, 3), 0.04, seed + 3), mat(0x8a8f96, { flat: true }), L.cx, y + h / 2, L.cz);
      on(add(g, new T.CircleGeometry(L.r * 0.33, 24).rotateX(-P2), mat(lawnC), L.cx, y + h + 0.002, L.cz), 'lookout').userData.noInk = true;
      for (let i = 0; i < 12; i++) { const a = i * 0.62, rr = L.r * (0.62 - i * 0.026); bx(g, 0.06, 0.012, 0.035, 0xc9b38a, L.cx + Math.cos(a) * rr, y + 0.02 + i * h / 12, L.cz + Math.sin(a) * rr).rotation.y = -a; }
      zones.lookout = { x: L.cx, z: L.cz, r: L.r * 0.24, y: y + h };
      zones.lawn.not = (x, z) => Math.hypot(x - L.cx, z - L.cz) < mr + 0.06;
    } else if (key === 'orchard') {
      on(ground(g, L, y, base), 'orchard'); isleGrass(g, ctx, seed, L, y);
      arc(L, 40, (x, z, a, i) => { const o = add(g, rough(new T.BoxGeometry(0.075, 0.05, 0.045), 0.006, seed + i), mat(i % 2 ? 0xb7ada0 : 0xa59b8e, { flat: true }), x, y + 0.02, z); o.rotation.y = -a; });
      zones.orchard = { x: L.cx, z: L.cz, r: L.r * 0.78, y };
    } else if (key === 'lake') {
      // A lake dug into the middle: the bank slopes down into it, and the water sits in the hollow.
      const lr = L.r * 0.55, dip = (x, z) => -0.085 * (1 - K.smooth01(lr - 0.06, lr + 0.05, Math.hypot(x - L.cx, z - L.cz)));
      on(ground(g, L, y, { ...base, h: dip }), 'lakeshore'); isleGrass(g, ctx, seed, L, y, { clear: [[L.cx, L.cz, lr + 0.03]], ground: dip });
      on(K.waterSheet(g, L.cx, L.cz, lr + 0.08, y - 0.022, (x, z) => dip(x, z) + 0.022, { night: ctx.night, deepAt: 0.06, deep: 0x16609e }), 'lake');
      for (let i = 0; i < 6; i++) { const a = i * 1.1, pad = add(g, new T.CylinderGeometry(0.022, 0.022, 0.003, 7), mat(0x4caf50), L.cx + Math.cos(a) * lr * 0.6, y - 0.019, L.cz + Math.sin(a) * lr * 0.55); pad.userData.noInk = true; }
      ring(12, (a, i) => { const rx = L.cx + Math.cos(a) * (lr + 0.02), rz = L.cz + Math.sin(a) * (lr + 0.02); if (i % 3 === 2) return; for (let j = 0; j < 3; j++) cyl(g, 0.004, 0.004, 0.08 + j * 0.02, 0x6b8a3a, rx + j * 0.01, y + dip(rx, rz) + 0.04, rz, 4); });
      zones.lake = { x: L.cx, z: L.cz, r: lr * 0.7, y: y - 0.026, water: true };
      zones.lawn.not = (x, z) => Math.hypot(x - L.cx, z - L.cz) < lr + 0.08;
    } else if (key === 'grove') {
      // Native trees round the back and sides (the front stays open to see in), with ferns underneath.
      on(ground(g, L, y, base), 'grove'); isleGrass(g, ctx, seed, L, y);
      arc(L, 13, (x, z, a, i) => { if (Math.cos(a - L.a) > 0.35) return; species(g, x, y, z, ['kauri', 'pine', 'nikau', 'cabbage', 'oak'][i % 5], seed + i, 0.95); }, 0.14);
      for (let i = 0; i < 8; i++) { const a = i * 1.7, f = new T.Group(); f.position.set(L.cx + Math.cos(a) * L.r * 0.55, y, L.cz + Math.sin(a) * L.r * 0.55); g.add(f); for (let q = 0; q < 5; q++) { const o = cn(f, 0.012, 0.12, 0x3f8a3f, 0, 0.04, 0, 4); o.rotation.set(Math.sin(q * 1.3) * 0.7, q * 1.26, Math.cos(q * 1.3) * 0.7); o.scale.z = 0.35; } }
      zones.grove = { x: L.cx, z: L.cz, r: L.r * 0.62, y };
    } else if (key === 'beach') {
      // Grass at the back gives way to sand, which slopes gently down into the sea at the front: wet sand, shallows
      // and foam where the waves lap.
      const sand = new T.Color(0xf1d9a0), wet = new T.Color(0xc9ae78), grassC = new T.Color(lawnC), C2 = new T.Color();
      const h = (x, z) => -0.095 * K.smooth01(0.32, 0.98, outward(L, x, z));
      const col = (x, z, hh) => { const u = outward(L, x, z), toSand = K.smooth01(-0.2, 0.1, u); return C2.copy(grassC).lerp(sand, toSand).lerp(wet, K.smooth01(0.012, 0.035, -hh)).getHex(); };
      on(ground(g, L, y, { ...base, h, col, side: 0xe0c48a }), 'beach');
      isleGrass(g, ctx, seed, L, y, { dens: (x, z) => 1 - K.smooth01(-0.25, 0.02, outward(L, x, z)) });
      const w = K.waterSheet(g, L.cx, L.cz, L.r + 0.05, y - 0.03, (x, z) => h(x, z) + 0.03, { night: ctx.night, deepAt: 0.07, foam: 0.014, shallow: 0x8ff0e6, deep: 0x1f8fd0, n: 56 }); w.userData.hab = 'beach';
      [[0.3, 0.1], [-0.25, 0.05], [0.5, 0.3]].forEach(([dv, du], i) => { const [px, pz] = toWorld(L, du, dv); add(g, rough(new T.DodecahedronGeometry(0.05, 0), 0.01, seed + i), mat(0x8a8f96, { flat: true }), px, y + h(px, pz), pz); });
      zones.beach = { x: L.cx + L.ox * L.r * 0.28, z: L.cz + L.oz * L.r * 0.28, r: L.r * 0.26, y };
      zones.lawn = { x: L.cx - L.ox * L.r * 0.4, z: L.cz - L.oz * L.r * 0.4, r: L.r * 0.42, y };
    } else if (key === 'sky') {
      // A smaller island with clouds drifting round its rock.
      on(ground(g, L, y, base), 'sky'); isleGrass(g, ctx, seed, L, y);
      const puffs = new T.Group(); g.add(puffs);
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, rr = L.r * (0.8 + (i % 3) * 0.12), p = add(puffs, new T.SphereGeometry(0.11 + (i % 3) * 0.05, 12, 8), mat(0xffffff), Math.cos(a) * rr, -0.3 - (i % 2) * 0.28, Math.sin(a) * rr); p.scale.y = 0.6; p.userData.noInk = true; }
      fx.push(t => { puffs.rotation.y = t * 0.08; });
      zones.sky = { x: L.cx, z: L.cz, r: L.r * 0.75, y };
    }
    return { L, zones, surf, tick: fx.length ? t => fx.forEach(f => f(t)) : null };
  }

  /* ---------- House styles ---------- */
  // A style keeps the house's level (its size) but changes how it's built. Walls in `walls` get grubby and can be
  // water-blasted like the standard house. smokeAt is where chimney smoke comes out.
  const DIMS = [null, [0.46, 0.34, 0.42], [0.6, 0.42, 0.48], [0.7, 0.62, 0.52], [0.66, 0.7, 0.56]];
  function style(kind, level, look, night, grime) {
    if (!kind || level < 1 || (kind === 'fort' && level < 4)) return null;
    const g = new T.Group(), walls = [], [W, H, D] = DIMS[Math.min(4, level)], dirt = c => new T.Color(c).lerp(new T.Color(0x7d6e55), Math.round(grime * 10) / 10 * 0.55).getHex();
    const wall = (w, h, d, c, x, y, z) => { const o = bx(g, w, h, d, dirt(c), x, y, z); o.userData.clean = c; walls.push(o); return o; };
    const glass = night ? 0xffd36b : 0x8fd3ff, win = (x, y, z, w = 0.1) => { bx(g, w + 0.03, w + 0.03, 0.012, 0xffffff, x, y, z); add(g, new T.BoxGeometry(w, w, 0.016), mat(glass, night ? { e: 0xffa020 } : {}), x, y, z + 0.003); };
    let smokeAt = new T.Vector3(W * 0.25, H + 0.25, -D * 0.1);
    if (kind === 'bach') {
      wall(W, H * 0.8, D, 0x8ecae6, 0, H * 0.4, 0); for (let i = 1; i < 6; i++) bx(g, W + 0.004, 0.006, D + 0.004, 0x6fb0d0, 0, i * H * 0.13, 0);
      tilt(bx(g, W + 0.12, 0.02, D + 0.16, 0xd8dde3, 0, H * 0.86, 0), 0, 0, 0.12); for (let i = 0; i < 7; i++) bx(g, 0.006, 0.022, D + 0.16, 0xb7c0ca, -W / 2 - 0.04 + i * (W + 0.08) / 6, H * 0.87 + (i - 3) * -0.012, 0);
      bx(g, W + 0.1, 0.02, 0.14, WOOD, 0, 0.02, D / 2 + 0.07); win(-W * 0.22, H * 0.42, D / 2 + 0.002, 0.12); bx(g, 0.1, 0.2, 0.012, 0xffd43b, W * 0.2, 0.11, D / 2 + 0.006);
      smokeAt = new T.Vector3(-W * 0.3, H + 0.1, 0); cyl(g, 0.02, 0.02, 0.14, 0x9aa0a8, -W * 0.3, H * 0.95, 0, 8);
    } else if (kind === 'cabin') {
      for (let i = 0; i < 6; i++) { const y = 0.03 + i * H * 0.15, o = add(g, new T.CylinderGeometry(0.03, 0.03, W + 0.06, 8), mat(dirt(0xa0673a)), 0, y, D / 2); o.rotation.z = P2; o.userData.clean = 0xa0673a; walls.push(o); const b = add(g, new T.CylinderGeometry(0.03, 0.03, W + 0.06, 8), mat(dirt(0xa0673a)), 0, y, -D / 2); b.rotation.z = P2; b.userData.clean = 0xa0673a; walls.push(b); [-1, 1].forEach(s => { const c = add(g, new T.CylinderGeometry(0.03, 0.03, D, 8), mat(dirt(0x8a5a30)), s * W / 2, y + 0.03, 0); c.rotation.x = P2; c.userData.clean = 0x8a5a30; walls.push(c); }); }
      bx(g, W - 0.04, H * 0.9, D - 0.04, 0x8a5a30, 0, H * 0.45, 0);
      [-1, 1].forEach(s => tilt(bx(g, W * 0.62, 0.025, D + 0.14, look.roof ?? 0x4f6b3a, s * W * 0.25, H * 0.98, 0), 0, 0, -s * 0.62));
      win(-W * 0.22, H * 0.5, D / 2 + 0.035); bx(g, 0.1, 0.2, 0.012, 0x5a3a20, W * 0.18, 0.1, D / 2 + 0.03);
      bx(g, 0.08, H * 1.4, 0.08, 0xb7ada0, W * 0.35, H * 0.7, -D * 0.2); smokeAt = new T.Vector3(W * 0.35, H * 1.42, -D * 0.2);
    } else if (kind === 'treehome') {
      cyl(g, 0.08, 0.12, H * 1.1, DARK, 0, H * 0.55, -0.02, 10); blob(g, W * 0.55, 0x3d8b40, 0, H * 1.75, -0.05, 7); blob(g, W * 0.38, 0x5aa04a, W * 0.3, H * 1.6, 0.05, 8);
      bx(g, W + 0.08, 0.025, D + 0.06, WOOD, 0, H * 0.9, 0); wall(W * 0.8, H * 0.55, D * 0.75, 0xe9c08a, 0, H * 1.2, 0); cn(g, W * 0.68, H * 0.4, look.roof ?? 0xe5533d, 0, H * 1.67, 0, 4).rotation.y = PI / 4;
      win(-W * 0.18, H * 1.25, D * 0.375 + 0.002); bx(g, 0.09, 0.15, 0.01, 0x8a5a3c, W * 0.18, H * 1.0, D * 0.375 + 0.004);
      for (let i = 0; i < 6; i++) bx(g, 0.08, 0.01, 0.012, WOOD, W * 0.45, 0.06 + i * H * 0.14, D * 0.4); [-0.03, 0.03].forEach(dx => cyl(g, 0.005, 0.005, H * 0.9, WOOD, W * 0.45 + dx, H * 0.45, D * 0.4, 4));
      smokeAt = new T.Vector3(0, H * 1.9, 0);
    } else if (kind === 'fairy') {
      const o = add(g, new T.CylinderGeometry(W * 0.42, W * 0.48, H, 16), mat(dirt(0xfff1e0)), 0, H / 2, 0); o.userData.clean = 0xfff1e0; walls.push(o);
      add(g, new T.SphereGeometry(W * 0.62, 18, 10, 0, PI * 2, 0, P2), mat(look.roof ?? 0xff6b9d), 0, H, 0).scale.y = 0.75;
      ring(9, (a, i) => sph(g, 0.03, 0xffffff, Math.cos(a) * W * 0.4, H + 0.12 + (i % 2) * 0.05, Math.sin(a) * W * 0.4, 1, 0.5, 1));
      const sh = new T.Shape(); sh.moveTo(-0.05, 0); sh.lineTo(0.05, 0); sh.lineTo(0.05, 0.1); sh.absarc(0, 0.1, 0.05, 0, PI, false); sh.closePath(); add(g, new T.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false }), mat(look.door ?? 0xc084fc), 0, 0, W * 0.45);
      [[-0.15, 0.4], [0.15, 0.4]].forEach(([x, y]) => { const c = add(g, new T.CircleGeometry(0.04, 16), mat(glass, night ? { e: 0xffa020 } : {}), x * W * 2.2, H * y + 0.06, W * 0.455); c.rotation.y = x > 0 ? 0.3 : -0.3; });
      smokeAt = new T.Vector3(0, H + W * 0.5, 0);
    } else if (kind === 'fort') {
      wall(W, H * 0.7, D, 0x8a6a4a, 0, H * 0.35, 0); for (let i = 0; i < 6; i++) bx(g, 0.07, 0.08, 0.07, 0x7a5a3a, -W / 2 + 0.035 + i * (W - 0.07) / 5, H * 0.74, D / 2 - 0.035);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { cyl(g, 0.09, 0.1, H * 1.05, 0x7a5a3a, sx * W / 2, H * 0.52, sz * D / 2, 10); ring(6, a => bx(g, 0.035, 0.05, 0.035, 0x6b4a2a, sx * W / 2 + Math.cos(a) * 0.08, H * 1.07, sz * D / 2 + Math.sin(a) * 0.08)); });
      bx(g, 0.14, 0.2, 0.012, 0x3b2a1e, 0, 0.1, D / 2 + 0.006); [-0.06, 0.06].forEach(x => cyl(g, 0.012, 0.012, 0.02, 0x2b2b35, x, H * 0.45, D / 2 + 0.01, 8).rotation.x = P2);
      cyl(g, 0.006, 0.006, 0.4, 0x6b4a2a, W / 2, H * 1.3, D / 2, 4); bx(g, 0.14, 0.09, 0.004, 0x1b1b22, W / 2 + 0.07, H * 1.45, D / 2); emo(g, '💀', 0.06, W / 2 + 0.07, H * 1.45, D / 2 + 0.006);
      smokeAt = new T.Vector3(-W * 0.3, H * 1.1, -D * 0.2);
    }
    g.userData.walls = walls; g.userData.smokeAt = smokeAt; return g;
  }

  /* ---------- Dressing the island: fence, path, name sign, smoke and sky magic ---------- */
  const FENCE = {
    picket: (g, x, z, a) => { bx(g, 0.022, 0.1, 0.008, 0xffffff, x, 0.05, z).rotation.y = -a; cn(g, 0.014, 0.02, 0xffffff, x, 0.11, z, 4).rotation.y = -a + PI / 4; },
    rustic: (g, x, z, a) => { cyl(g, 0.012, 0.014, 0.1, 0x8a5a3c, x, 0.05, z, 6); },
    hedge: (g, x, z, a, i) => { blob(g, 0.055, 0x3d8b40, x, 0.045, z, 200 + i); },
    stone: (g, x, z, a, i) => { add(g, rough(new T.BoxGeometry(0.1, 0.07, 0.05), 0.006, 300 + i), mat(i % 2 ? 0xb7ada0 : 0xa59b8e, { flat: true }), x, 0.035, z).rotation.y = -a + P2; },
    bamboo: (g, x, z) => { for (let j = 0; j < 3; j++) cyl(g, 0.008, 0.008, 0.12 + (j % 2) * 0.02, 0xc9b56a, x + j * 0.012, 0.065, z, 6); },
  };
  const SKY_FX = {
    fireflies: (g, R, top) => { const fl = []; for (let i = 0; i < 14; i++) fl.push(glow(g, 0.008, 0xd8ff6b, 0, top, 0)); return t => fl.forEach((f, i) => { const a = t * 0.3 + i * 0.45; f.position.set(Math.cos(a * 1.3 + i) * R * (0.3 + (i % 5) * 0.12), top + 0.15 + Math.sin(t * 1.7 + i) * 0.08, Math.sin(a + i * 2) * R * (0.3 + (i % 4) * 0.13)); f.visible = Math.sin(t * 3 + i * 1.9) > -0.3; }); },
    shooting: (g, R, top) => { const st = []; for (let i = 0; i < 3; i++) { const s = add(g, new T.CylinderGeometry(0.003, 0.012, 0.35, 6), mat(0xfff3bf, { e: 0xfff3bf, op: 0.9 }), 0, 0, 0); s.rotation.z = 1.1; s.userData.noInk = true; st.push(s); } return t => st.forEach((s, i) => { const p = ((t * 0.18 + i / 3) % 1); s.visible = p < 0.35; s.position.set(-R + p * 6 * R, top + 1.4 - p * 1.6, -0.6 + i * 0.3); }); },
    lanterns: (g, R, top) => { const ls = []; for (let i = 0; i < 7; i++) { const l = add(g, new T.CylinderGeometry(0.02, 0.028, 0.05, 8), mat(0xffa94d, { e: 0x8a3a00 }), 0, 0, 0); l.userData.noInk = true; ls.push(l); } return t => ls.forEach((l, i) => { const p = (t * 0.05 + i / 7) % 1; l.position.set(Math.cos(i * 2.1) * R * 0.7 + Math.sin(t * 0.5 + i) * 0.05, top + 0.2 + p * 1.6, Math.sin(i * 2.1) * R * 0.6); l.scale.setScalar(p > 0.85 ? (1 - p) / 0.15 : 1); }); },
    rainbow: (g, R) => { [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa].forEach((c, i) => add(g, new T.TorusGeometry(R * 1.14 - i * 0.07, 0.035, 8, 48, PI), mat(c, { smooth: true }), 0, 0.15, -0.75)); return null; },
    aurora: (g, R, top) => { const rb = []; [0x6bffb8, 0x9b7bff, 0x6bd6ff].forEach((c, i) => { const p = add(g, new T.PlaneGeometry(R * 2.6, 0.35, 24, 1), mat(c, { op: 0.35, ds: true, e: c }), 0, top + 1.1 + i * 0.12, -0.9 - i * 0.1); p.userData.noInk = true; rb.push(p); }); return t => rb.forEach((p, i) => { const pos = p.geometry.attributes.position; for (let v = 0; v < pos.count; v++) { const x = pos.getX(v); pos.setZ(v, Math.sin(x * 2 + t * 0.6 + i) * 0.12); } pos.needsUpdate = true; }); },
  };
  function nameSign(g, name, gold, x, y, z) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x2 = c.getContext('2d');
    x2.fillStyle = gold ? '#ffcf4a' : '#c98d5a'; x2.fillRect(0, 0, 256, 96); x2.strokeStyle = gold ? '#a8781a' : '#7a4f2a'; x2.lineWidth = 8; x2.strokeRect(4, 4, 248, 88);
    x2.fillStyle = gold ? '#5a3a00' : '#fff8ec'; x2.font = '900 46px Nunito, system-ui, sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(String(name || '').slice(0, 12), 128, 50);
    const tx = new T.CanvasTexture(c); tx.encoding = T.sRGBEncoding;
    const s = new T.Group(); s.position.set(x, y, z); g.add(s);
    [-0.07, 0.07].forEach(dx => cyl(s, 0.008, 0.008, 0.16, gold ? 0xd9a520 : DARK, dx, 0.08, 0, 5));
    const b = add(s, new T.BoxGeometry(0.22, 0.085, 0.012), new T.MeshToonMaterial({ map: tx, gradientMap: K.GRAD }), 0, 0.15, 0); b.userData.ownMat = true;
    return s;
  }
  // Adds the kid's chosen dressing. ctx: { top, R, house (group), night } on the home island; on a land island ctx.isle
  // is its frame, and only the fence and the sky go on it.
  function dress(g, k, ctx) {
    const L = k.lookKeys || {}, { top, R } = ctx, fx = [], I = ctx.isle;
    if (L.fence && FENCE[L.fence] && !(I && (I.key === 'farm' || I.key === 'stable'))) {
      // Round the island's edge, leaving a gap at the front for the path (or, on the beach, the sand and the sea).
      const pts = [], cr = I ? I.r - 0.04 : R - 0.05, n = Math.round(cr * 34);
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2; if (I ? I.key === 'beach' && Math.cos(a - I.a) > -0.15 : Math.abs(a - P2) < 0.14) continue; pts.push([Math.cos(a) * cr, Math.sin(a) * cr, a]); }
      const f = new T.Group(); f.position.y = top; g.add(f); pts.forEach(([x, z, a], i) => FENCE[L.fence](f, x, z, a, i));
      if (L.fence === 'rustic') pts.forEach(([x, z], i) => { const nb = pts.find(([x2, z2], j) => j > i && Math.hypot(x2 - x, z2 - z) < 0.16); if (nb) [0.05, 0.085].forEach(h => stick(f, [x, h, z], [nb[0], h, nb[1]], 0.006, 0xa86f3e)); });
    }
    if (I) { if (L.sky && SKY_FX[L.sky]) { const f = SKY_FX[L.sky](g, I.r, top); if (f) fx.push(f); } return fx.length ? t => fx.forEach(f => f(t)) : null; }
    if (L.path) {
      const p = new T.Group(); p.position.y = top; g.add(p); const z0 = 0.1, z1 = R - 0.06, n = Math.max(4, Math.round((z1 - z0) / 0.07));
      for (let i = 0; i < n; i++) { const z = z0 + (z1 - z0) * i / (n - 1), x = 0.05 + Math.sin(i * 0.9) * 0.02;
        if (L.path === 'stones') add(p, new T.CylinderGeometry(0.035, 0.038, 0.012, 9), mat(0xbdb3a4, { flat: true }), x + (i % 2 ? 0.02 : -0.02), 0.004, z);
        else if (L.path === 'gravel') bx(p, 0.12, 0.008, 0.075, 0xd8cdb8, x, 0.003, z);
        else if (L.path === 'brick') { bx(p, 0.055, 0.01, 0.03, 0xc0604a, x - 0.03, 0.004, z - 0.017); bx(p, 0.055, 0.01, 0.03, 0xa8503a, x + 0.03, 0.004, z + 0.017); }
        else if (L.path === 'boardwalk') bx(p, 0.13, 0.014, 0.06, 0xc98d5a, x, 0.007, z);
        else if (L.path === 'rainbowpath') bx(p, 0.12, 0.01, 0.06, [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa][i % 6], x, 0.004, z); }
    }
    if (L.sign) nameSign(g, k.name, L.sign === 'gold', 0.26, top, R - 0.16);
    if (L.smoke && ctx.house && ctx.house.userData.smokeAt) {
      const at = ctx.house.userData.smokeAt.clone().add(ctx.house.position), puffs = [];
      const col = { rainbow: [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa] }[L.smoke];
      for (let i = 0; i < 6; i++) { const m = L.smoke === 'rainbow' ? add(g, new T.SphereGeometry(0.03, 8, 6), mat(col[i], { op: 0.85 })) : emo(g, L.smoke === 'hearts' ? '💖' : '⭐', 0.07, 0, 0, 0); if (m.isMesh) m.userData.noInk = true; puffs.push(m); }
      fx.push(t => puffs.forEach((m, i) => { const p = (t * 0.25 + i / 6) % 1; m.position.set(at.x + Math.sin(t + i) * 0.04 * p, at.y + p * 0.5, at.z); m.scale.setScalar(0.5 + p); if (m.material) m.material.opacity = 0.9 * (1 - p); }));
    }
    if (L.sky && SKY_FX[L.sky]) { const f = SKY_FX[L.sky](g, R, top); if (f) fx.push(f); }
    return fx.length ? t => fx.forEach(f => f(t)) : null;
  }

  // Lawn colours: under the blades, and the blade base and tips.
  const LAWN = { clover: [0x2f8a3f, 0x1f6b2a, 0x8fd45a], golden: [0x9fb33a, 0x6b7a2a, 0xe8e07a], autumn: [0xb98b3a, 0x7a5a2a, 0xe8a85a], sand: [0xe7d3a1, 0xc8b07a, 0xf6e7c0], meadow: [0x4c9a3a, 0x2a6b2a, 0xc4e86a] };
  // Cliff colours: middle, dark and light bands.
  const ROCK = { sandstone: [0xe2b77d, 0xc8925a, 0xf1d3a0], granite: [0x9aa0a8, 0x6f757d, 0xc8cdd3], volcanic: [0x3b3a40, 0x26252a, 0x5a5960], crystal: [0x9fe3ff, 0x6fb8e0, 0xdff6ff], gold: [0xffc93c, 0xd99a1a, 0xffe58a] };
  return { items: M, species, land, isle, toLocal, toWorld, ground, isleGrass, arc, style, dress, LAWN, ROCK, glow, emo };
};
