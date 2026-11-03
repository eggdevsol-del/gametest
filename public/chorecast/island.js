/* Chorecast island, part two: the 3D models for the bigger island shop (catalog.js), the chore tree types, the new
   pieces of land, house styles, fences, paths, the name sign and sky magic. index.html's 3D layer calls
   window.ChorecastIsland(kit) with its own drawing helpers, so everything here shares the island's toon shading and
   ink outlines. Models face +z, sit on y = 0 and use the same scale as the first shop (an animal is about 0.2 tall). */
window.ChorecastIsland = K => {
  const { T, add, mat, SM, sph, cyl, bx, cn, eyes, merged, rough, sprite, emojiTex, GOLD, horse, barn, WOOD, DARK } = K;
  const PI = Math.PI, P2 = PI / 2;
  const ring = (n, f) => { for (let i = 0; i < n; i++) f(i / n * PI * 2, i); };
  const tor = (g, r, t, c, x, y, z, arc = PI * 2) => add(g, new T.TorusGeometry(r, t, 8, 28, arc), SM(c), x, y, z);
  const disc = (g, r, c, x, y, z, h = 0.012, seg = 24) => cyl(g, r, r, h, c, x, y, z, seg);
  const tilt = (o, rx = 0, ry = 0, rz = 0) => { o.rotation.set(rx, ry, rz); return o; };
  const stick = (g, a, b, r, c) => { const v = new T.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), o = add(g, new T.CylinderGeometry(r, r, v.length(), 6), mat(c), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize()); return o; };
  const glow = (g, r, c, x, y, z) => { const o = add(g, new T.SphereGeometry(r, 10, 8), mat(c, { e: c }), x, y, z); o.userData.noInk = true; return o; };
  const emo = (g, e, s, x, y, z) => { const sp = sprite(emojiTex(e), s); sp.position.set(x, y, z); g.add(sp); return sp; };
  const blob = (g, r, c, x, y, z, seed = 1) => add(g, rough(new T.SphereGeometry(r, 16, 12), r * 0.07, seed), SM(c), x, y, z);
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
    if (o.bigEyes) { [-1, 1].forEach(sx => sph(g, hr * 0.32, 0xffd43b, sx * hr * 0.42, hy + hr * 0.12, hz + hr * 0.78, 1, 1, 0.4)); eyes(g, hy + hr * 0.12, hz + hr * 0.9, hr * 0.42, hr * 0.15); }
    else eyes(g, hy + hr * 0.2, hz + hr * 0.75, hr * 0.5, 0.006 * s);
    [-1, 1].forEach(sx => { const L = leg + 0.02 * s; add(g, merged([[new T.CylinderGeometry(0.005 * s, 0.005 * s, L, 8), 0, L / 2, 0], ...[-0.55, 0, 0.55].map(a => [new T.SphereGeometry(0.0045 * s, 8, 6), Math.sin(a) * 0.009 * s, 0.003 * s, Math.cos(a) * 0.009 * s, 0, a, 0, 0.7, 0.5, 2.2])]), mat(o.legC || 0xffa94d), sx * 0.02 * s, 0, 0); });
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
    emu: g => {
      const body = 0x5e4e40, shag = 0x6f5d4c;
      sph(g, 0.1, body, 0, 0.27, 0, 0.85, 0.8, 1.15); [[0.05, 0.3, -0.03], [-0.05, 0.3, -0.03], [0, 0.32, -0.07], [0.035, 0.25, -0.09], [-0.035, 0.25, -0.09]].forEach(([x, y, z], i) => sph(g, 0.05, i % 2 ? shag : body, x, y, z, 1, 0.7, 1.3));
      [-1, 1].forEach(sx => tilt(sph(g, 0.03, shag, sx * 0.03, 0.22, -0.13, 0.5, 0.5, 1.6), 0.6, 0, 0));
      const nk = [[0, 0.33, 0.07, 0.022, 0.4], [0, 0.4, 0.1, 0.018, 0.15], [0, 0.46, 0.105, 0.016, -0.1]];
      nk.forEach(([x, y, z, r, rx]) => tilt(cyl(g, r * 0.85, r, 0.08, 0x5a6a8a, x, y, z, 12), rx));
      sph(g, 0.032, 0x3b4a6a, 0, 0.51, 0.115, 0.95, 0.9, 1.2); tilt(cn(g, 0.012, 0.032, 0x2b2b35, 0, 0.505, 0.155, 10), P2 + 0.15);
      eyes(g, 0.52, 0.135, 0.02, 0.006);
      [-1, 1].forEach(sx => add(g, merged([[new T.CylinderGeometry(0.013, 0.011, 0.12, 12), 0, 0.17, 0.005], [new T.CylinderGeometry(0.009, 0.008, 0.11, 12), 0, 0.06, 0.02, -0.15], ...[-0.5, 0, 0.5].map(a => [new T.SphereGeometry(0.008, 8, 6), Math.sin(a) * 0.016, 0.005, 0.03 + Math.cos(a) * 0.016, 0, a, 0, 0.6, 0.5, 2.4])]), mat(0x7a6a56), sx * 0.035, 0, 0));
    },
    kangaroo: g => roo(g, { c: 0xb5703a, belly: 0xe8c08a, s: 1.15, joey: true }),
    lyrebird: g => bird(g, { c: 0x7a5a3a, belly: 0x9c7a5a, head: 0x6b4a2a, beakC: 0x2b2b35, s: 1.2, tail: 'lyre', tailC: 0xa86f3e, leg: 0.05 }),
    // ---- Beach
    starfish: g => { const c = 0xff8c42; sph(g, 0.032, c, 0, 0.012, 0, 1, 0.45, 1); const dots = [[new T.SphereGeometry(0.007, 8, 6), 0, 0.021, 0]]; ring(5, a => { const o = sph(g, 0.03, c, Math.cos(a) * 0.045, 0.011, Math.sin(a) * 0.045, 0.5, 0.36, 1.7); o.rotation.y = P2 - a; [0.03, 0.058].forEach((d, j) => dots.push([new T.SphereGeometry(0.0055 - j * 0.001, 8, 6), Math.cos(a) * d, 0.02 - j * 0.002, Math.sin(a) * d])); }); add(g, merged(dots), SM(0xffd8a8)); },
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
    pumptrack: g => {
      add(g, new T.CylinderGeometry(0.2, 0.2, 0.01, 40), mat(0x6fcf5a), 0, 0.005, 0).scale.set(1.25, 1, 0.82);
      const tr = add(g, new T.TorusGeometry(0.21, 0.05, 12, 64), SM(0xb08a5a), 0, 0.012, 0); tr.rotation.x = P2; tr.scale.set(1.35, 1, 0.38);
      ring(8, (a, i) => { if (i % 4 === 0) return; sph(g, 0.034, 0xa07a4a, Math.cos(a) * 0.21 * 1.35, 0.02, Math.sin(a) * 0.21, 1, 0.6, 1).rotation.y = -a; });
      [-1, 1].forEach(sx => { const b = add(g, new T.TorusGeometry(0.11, 0.035, 10, 24, PI), SM(0x9a7448), sx * 0.2, 0.022, 0); b.rotation.set(P2, 0, sx < 0 ? P2 : -P2); b.scale.set(1, 1, 0.8); });
      cyl(g, 0.004, 0.004, 0.09, 0xffffff, -0.3, 0.045, 0.18, 8); bx(g, 0.05, 0.03, 0.003, 0xff6b6b, -0.275, 0.08, 0.18);
      const b = new T.Group(); g.add(b); [-1, 1].forEach(sx => cyl(b, 0.02, 0.02, 0.004, 0x222222, sx * 0.025, 0.045, 0, 16).rotation.x = P2); bx(b, 0.05, 0.005, 0.004, 0x4dabf7, 0, 0.055, 0); sph(b, 0.014, 0xffc9a8, 0, 0.095, 0); sph(b, 0.015, 0xff6b6b, 0, 0.1, 0, 1, 0.6, 1);
      tick(g, t => { const a = t * 0.9; b.position.set(Math.cos(a) * 0.21 * 1.35, 0.02 + Math.abs(Math.sin(a * 3)) * 0.02, Math.sin(a) * 0.21); b.rotation.y = -a; });
    },
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
    ponga: g => {
      cyl(g, 0.026, 0.036, 0.32, 0x4a3328, 0, 0.16, 0, 12); for (let i = 0; i < 5; i++) sph(g, 0.03, 0x5a4030, 0, 0.04 + i * 0.06, 0, 1, 0.55, 1);
      // Each frond arches up and out, then droops, in five segments with a pair of leaflets on each.
      const dark = [], light = [], box = (w, h, d) => new T.BoxGeometry(w, h, d);
      ring(9, a => { let y = 0, z = 0, ang = -0.75; const fd = [], fl = [];
        for (let j = 0; j < 5; j++) { const len = 0.06 - j * 0.006, mx = z + Math.cos(ang) * len / 2, my = y - Math.sin(ang) * len / 2, L = j < 2 ? fd : fl; L.push([box(0.007, 0.004, len), 0, my, mx, ang]); for (const sx of [-1, 1]) L.push([box(0.034 - j * 0.005, 0.003, 0.016), sx * (0.017 - j * 0.0025), my, mx, ang, sx * 0.25, sx * 0.25]); y -= Math.sin(ang) * len; z += Math.cos(ang) * len; ang += 0.42; }
        dark.push([merged(fd).rotateY(-a), 0, 0.32, 0]); light.push([merged(fl).rotateY(-a), 0, 0.32, 0]); });
      add(g, merged(dark), mat(0x2f7d3f)); add(g, merged(light), mat(0x4caf50));
      [-1, 1].forEach(sx => tilt(tor(g, 0.014, 0.004, 0x6fbf5a, sx * 0.012, 0.35, 0, PI * 1.5), 0, P2, sx * 0.4));
    },
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
     Every piece of land a kid owns is a floating island of its own, which the studio travels to with its arrows, and
     each is its own little ecosystem: a vege garden, a horse yard, an alpine mountain, an orchard, a lake with a jetty,
     native bush, a beach and sea, and a pastel cloud island (the farm is built by index.html). Each is built by itself
     at the origin, facing the camera's usual side (FRONT). Its side is cut away like a slice of cake (skirt): the top
     layer, soil with roots and stones, clay, then the rock underneath; where there's water the side is a see-through
     wall of water. What's on an island is stored relative to it (isle, lu, lv, in island radii: toLocal and toWorld).
     Its zones are where things go and animals wander (a zone's `not` marks spots to keep out of), and its terrain
     (ground height and water level) lets animals walk its slopes, swim and dive. */
  const FRONT = 0.7;
  // An island's frame: its centre, radius r and (ox, oz), the way its front faces.
  const isle = key => { const r = key === 'sky' ? 0.85 : 1; return { key, a: FRONT, r, cx: 0, cz: 0, ox: Math.cos(FRONT), oz: Math.sin(FRONT) }; };
  // A spot on an island as (u, v) in its own frame (u towards the front, v across, in island radii), and back.
  const toLocal = (L, x, z) => ({ u: +(((x - L.cx) * L.ox + (z - L.cz) * L.oz) / L.r).toFixed(4), v: +((-(x - L.cx) * L.oz + (z - L.cz) * L.ox) / L.r).toFixed(4) });
  const toWorld = (L, u, v) => [L.cx + (u * L.ox - v * L.oz) * L.r, L.cz + (u * L.oz + v * L.ox) * L.r];
  const outward = (L, x, z) => ((x - L.cx) * L.ox + (z - L.cz) * L.oz) / L.r;
  const across = (L, x, z) => (-(x - L.cx) * L.oz + (z - L.cz) * L.ox) / L.r;
  // Smooth noise over an island, 0 to 1; f is how many bumps across it.
  const nz = (x, z, f, s, o = 3) => K.fbm(x * 0.35 + 0.5, z * 0.35 + 0.5, f, s, o);
  const blend = (a, b, t) => new T.Color(a).lerp(new T.Color(b), Math.max(0, Math.min(1, t))).getHex();

  // Layers in an island's side, from the top: [how deep the layer goes, colour]. The first (null) is the surface's own
  // colour: turf, sand, leaf litter or mud.
  const SOIL = [[0.02, null], [0.1, 0x4b3020], [0.2, 0x6b4a2e], [9, 0x8f6c4a]];
  const SAND = [[0.03, null], [0.12, 0xd9bf88], [0.24, 0xb89a68], [9, 0x8f7a5a]];
  const MUD = [[0.03, null], [0.12, 0x5a4a35], [0.24, 0x6b5a42], [9, 0x8a7a62]];
  // An island's cut-away side, from its rim (top(a): the ground's height at angle a) down to the rock (base), with roots
  // hanging out of the topsoil and stones poking through lower down (a layer's colour can be a function of height and
  // angle, for banded rock). o: { E, top, base, baseR, cap(a), lawnC, layers, seed, sea }.
  function skirt(g, L, o) {
    const N = 128, D = [0, 0.012, 0.024, 0.045, 0.07, 0.1, 0.13, 0.17, 0.22, 0.28, 0.35, 0.43, 0.52];
    let tall = 0; for (let i = 0; i < N; i++) tall = Math.max(tall, o.top(i / N * PI * 2) - o.base); while (D[D.length - 1] < tall) D.push(D[D.length - 1] + 0.07);
    const M = D.length, rr = K.mulberry(o.seed + 5), layers = o.layers || SOIL, pos = [], cols = [], idx = [], c = new T.Color(), grey = new T.Color(0x9a948a);
    for (let i = 0; i <= N; i++) {
      const a = i / N * PI * 2, t0 = o.top(a), span = Math.max(0.02, t0 - o.base);
      for (let j = 0; j < M; j++) {
        const yy = j === M - 1 ? o.base : Math.max(o.base, t0 - D[j]), d = t0 - yy, f = d / span;
        const dent = j && j < M - 1 ? Math.abs(Math.sin(a * 7 + j * 1.7 + o.seed) * 0.009 + Math.sin(a * 17 - j * 2.3) * 0.005) : 0;
        const rad = j === M - 1 ? o.baseR : o.E - f * (o.E - o.baseR) * 0.6 - dent;
        pos.push(L.cx + Math.cos(a) * rad, yy, L.cz + Math.sin(a) * rad);
        const lay = layers.find(l => d < l[0]) || layers[layers.length - 1];
        c.set(lay[1] == null ? (o.cap ? o.cap(a) : o.lawnC) : typeof lay[1] === 'function' ? lay[1](yy, a) : lay[1]);
        if (lay[1] != null && rr() < 0.08) c.lerp(grey, 0.55);
        c.multiplyScalar(1 - Math.min(0.25, d * 0.4)).convertSRGBToLinear(); cols.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < M - 1; j++) { const A = i * M + j, B = A + M; idx.push(A, B, A + 1, B, B + 1, A + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    add(g, geo, mat(0xffffff, { vc: true }));
    for (let i = 0; i < Math.round(18 * L.r); i++) {
      const a = rr() * PI * 2, t0 = o.top(a); if ((o.sea != null && t0 < o.sea + 0.01) || t0 - o.base > 0.5) continue;
      const ca = Math.cos(a), sa = Math.sin(a), d0 = 0.04 + rr() * 0.05, len = 0.06 + rr() * 0.12, R0 = o.E - 0.02, at = (out, dy) => [L.cx + ca * (R0 + out), t0 - d0 - dy, L.cz + sa * (R0 + out)];
      const p1 = at(0.028, len * 0.45); stick(g, at(0, 0), p1, 0.006, 0x5a3a22); stick(g, p1, at(0.02 + rr() * 0.025, len), 0.0035, 0x5a3a22);
    }
    for (let i = 0; i < Math.round(28 * L.r); i++) {
      const a = rr() * PI * 2, t0 = o.top(a), d0 = 0.06 + rr() * 0.32; if (t0 - d0 < o.base + 0.03) continue;
      const R0 = o.E - d0 / Math.max(0.02, t0 - o.base) * (o.E - o.baseR) * 0.6, s0 = 0.014 + rr() * 0.02;
      add(g, rough(new T.DodecahedronGeometry(s0, 0), s0 * 0.3, o.seed + i), mat(rr() < 0.5 ? 0x8d8a84 : 0x6f6a62, { flat: true }), L.cx + Math.cos(a) * R0, t0 - d0, L.cz + Math.sin(a) * R0);
    }
  }
  // Where the side is under water, a see-through wall of water from the bed up to the surface, deeper blue lower down,
  // with light shimmering through it and a bright line at the surface.
  const WALL_V = 'attribute float ang; varying vec3 vP; varying float vA; void main() { vP = position; vA = ang; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const WALL_F = `uniform float uTime, uSea; uniform vec3 uShallow, uDeep; varying vec3 vP; varying float vA;
void main() {
  float d = uSea - vP.y, k = smoothstep(0.0, 0.32, d);
  vec3 c = mix(uShallow, uDeep, k);
  float shim = pow(abs(sin(vA * 46.0 + uTime * 1.2 + sin(vP.y * 70.0 - uTime * 1.7) * 1.3)), 10.0) * 0.16 * (1.0 - smoothstep(0.0, 0.2, d));
  float top = 1.0 - smoothstep(0.0, 0.008, d);
  c += vec3(0.8, 0.95, 1.0) * (shim + top * 0.45);
  gl_FragColor = linearToOutputTexel(vec4(c, clamp(mix(0.32, 0.72, k) + top * 0.3, 0.0, 1.0)));
}`;
  function waterWall(g, L, E, sea, top, o = {}) {
    const N = 128, pos = [], ang = [], idx = [], R = E + 0.002;
    for (let i = 0; i <= N; i++) {
      const a = i / N * PI * 2; pos.push(L.cx + Math.cos(a) * R, sea, L.cz + Math.sin(a) * R, L.cx + Math.cos(a) * R, Math.min(sea, top(a)), L.cz + Math.sin(a) * R); ang.push(a, a);
      if (i && (top(a) < sea - 0.002 || top(a - PI * 2 / N) < sea - 0.002)) { const v = (i - 1) * 2; idx.push(v, v + 2, v + 1, v + 2, v + 3, v + 1); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('ang', new T.Float32BufferAttribute(ang, 1)); geo.setIndex(idx);
    const m = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: { uTime: K.WATER_T, uSea: { value: sea }, uShallow: { value: K.lin(o.night ? 0x1d4a5a : o.shallow || 0x6fd6e0) }, uDeep: { value: K.lin(o.night ? 0x08203a : o.deep || 0x0e4f86) } }, vertexShader: WALL_V, fragmentShader: WALL_F, transparent: true, depthWrite: false, side: T.DoubleSide }));
    m.userData.noInk = true; m.userData.ownMat = true; m.renderOrder = 1; g.add(m); return m;
  }
  // Light rippling over the bed under clear water (caustics), added on top of the ground's own colour: strongest in the
  // shallows and gone in the deep.
  const CAUS_V = 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const CAUS_F = `uniform float uTime, uSea; varying vec3 vP;
float cz(vec2 p, float t) { float c = 0.0; for (int i = 0; i < 3; i++) { p += vec2(sin(p.y * 1.3 + t * 0.8), cos(p.x * 1.1 - t * 0.7)); c += 1.0 / (1.0 + 14.0 * abs(sin(p.x) + sin(p.y))); } return c / 3.0; }
void main() { float d = uSea - vP.y; if (d < 0.004) discard; float k = cz(vP.xz * 16.0, uTime) * smoothstep(0.004, 0.02, d) * (1.0 - smoothstep(0.05, 0.4, d)); gl_FragColor = vec4(vec3(0.7, 0.92, 1.0) * k * 0.55, 1.0); }`;
  function caustics(g, ground, sea) {
    const m = new T.Mesh(ground.geometry, new T.ShaderMaterial({ uniforms: { uTime: K.WATER_T, uSea: { value: sea - ground.position.y } }, vertexShader: CAUS_V, fragmentShader: CAUS_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.copy(ground.position); m.userData.noInk = true; m.userData.ownMat = true; m.renderOrder = 1; g.add(m); return m;
  }
  // The wash of each breaking wave running up the sand and sliding back, in step with the sea's swells (same speed w and
  // the same wobble along the shore): a thin sheet of water with a bright foam edge. run is how high up it reaches.
  const SWASH_V = 'attribute float sd; varying float vD; varying vec3 vW; void main() { vD = sd; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
  const SWASH_F = `uniform float uTime, uW, uRun; varying float vD; varying vec3 vW;
float h2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n2(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f); return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), u.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), u.x), u.y); }
void main() {
  float e = -vD; if (e < -0.004) discard;
  float ph = uTime * uW + (sin(vW.x * 3.1) + sin(vW.z * 2.7)) * 0.6, s = fract((ph - 1.5708) / 6.2832);
  float run = uRun * sin(3.14159 * clamp(s * 1.5, 0.0, 1.0)), edge = run + (n2(vW.xz * 40.0 + uTime * 0.4) - 0.5) * 0.005;
  if (e > edge) discard;
  float front = smoothstep(edge - 0.007, edge, e), back = 1.0 - smoothstep(0.33, 0.66, s);
  vec3 c = mix(vec3(0.8, 0.94, 0.98), vec3(1.0), front);
  gl_FragColor = linearToOutputTexel(vec4(c, 0.12 + 0.2 * back + 0.75 * front * (0.6 + 0.4 * n2(vW.xz * 90.0))));
}`;
  function swash(g, ground, sea, run, w) {
    const geo = ground.geometry.clone(), p = geo.attributes.position, sd = [], s0 = sea - ground.position.y; for (let i = 0; i < p.count; i++) sd.push(s0 - p.getY(i));
    geo.setAttribute('sd', new T.Float32BufferAttribute(sd, 1));
    const m = new T.Mesh(geo, new T.ShaderMaterial({ uniforms: { uTime: K.WATER_T, uW: { value: w }, uRun: { value: run } }, vertexShader: SWASH_V, fragmentShader: SWASH_F, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.position.copy(ground.position); m.userData.noInk = true; m.userData.ownMat = true; m.renderOrder = 3; g.add(m); return m;
  }
  // An island: the rock underneath, its cut-away side and the ground on top. o: { seed, rock, lawnC, h(x, z) height
  // above y, col(x, z, h) colour, n (grid detail), base (where the rock starts), sea (water level), water (wall colours),
  // cap(a) (the side's top colour), layers, habAt(x, z) (what a tap on it lands on) }. Returns the ground.
  function ground(g, L, y, o) {
    const base = o.base ?? -0.115, H = 1.3 * L.r + 0.1, sa = FRONT + 2.4, rk = mat(0xffffff, { vc: true, flat: true }), E = L.r + 0.05, h = o.h || (() => 0);
    add(g, K.strata(rough(new T.ConeGeometry(L.r * 0.92, H, 12, 6).rotateX(PI), 0.16, o.seed), o.seed, o.rock), rk, L.cx, base - H / 2, L.cz);
    add(g, K.strata(rough(new T.ConeGeometry(L.r * 0.32, L.r * 0.6, 7, 3).rotateX(PI), 0.08, o.seed + 1), o.seed + 1, o.rock), rk, L.cx + Math.cos(sa) * L.r * 0.45, base - 0.09 - L.r * 0.3, L.cz + Math.sin(sa) * L.r * 0.45);
    const top = a => y + h(L.cx + Math.cos(a) * E, L.cz + Math.sin(a) * E) - 0.03;
    skirt(g, L, { E, top, base, baseR: L.r * 0.92, cap: o.cap, lawnC: o.lawnC, layers: o.layers, seed: o.seed, sea: o.sea });
    if (o.sea != null) waterWall(g, L, E, o.sea, top, o.water);
    const n = o.n || 48, geo = new T.PlaneGeometry(2 * E, 2 * E, n, n).rotateX(-P2), p = geo.attributes.position, cols = [], C = new T.Color(), mud = new T.Color(0x5a4a32);
    for (let i = 0; i < p.count; i++) { let x = p.getX(i), z = p.getZ(i), lip = 0; const d = Math.hypot(x, z); if (d > E) { x *= E / d; z *= E / d; lip = -0.03; } const wx = L.cx + x, wz = L.cz + z, hh = h(wx, wz) + lip; p.setXYZ(i, x, hh, z); C.set(o.col ? o.col(wx, wz, hh) : o.lawnC); if (!o.col) C.lerp(mud, K.smooth01(0.006, 0.03, -hh)); C.convertSRGBToLinear(); cols.push(C.r, C.g, C.b); }
    geo.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); geo.computeVertexNormals();
    const s = add(g, geo, mat(0xffffff, { vc: true }), L.cx, y, L.cz); s.userData.noInk = true; if (o.habAt) s.userData.habAt = o.habAt; return s;
  }
  // Grass on an island at the lawn's own density, leaving out anything in `ex` (ex.grow and ex.tint change it).
  const isleGrass = (g, ctx, seed, L, y, ex = {}) => { if (ctx.meadow) meadow(g, seed, L, y, ex); return K.grassField(g, seed, Math.round(ctx.dens * PI * (L.r + 0.03) ** 2), ex.grow ?? ctx.grow ?? K.MOWN + 0.3, ctx.night, { exact: true, cx: L.cx, cz: L.cz, rad: L.r + 0.03, y, tint: ctx.tint, ...ex }); };
  function meadow(g, seed, L, y, ex) {
    const n = Math.round(L.r * L.r * 70 / (1.1 * 1.1)), fm = new T.InstancedMesh(new T.SphereGeometry(0.013, 6, 4), mat(0xffffff), n), d0 = new T.Object3D(), rr = K.mulberry(seed + 41), c = new T.Color(); let k = 0;
    for (let i = 0; i < n && k < n; i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * L.r * 0.95, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0; if ((ex.not && ex.not(x, z)) || (ex.clear && ex.clear.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) || (ex.dens && rr() > ex.dens(x, z))) continue; d0.position.set(x, y + 0.03 + rr() * 0.02 + (ex.ground ? ex.ground(x, z) : 0), z); d0.updateMatrix(); fm.setMatrixAt(k, d0.matrix); fm.setColorAt(k++, c.set([0xff6b9d, 0xffd43b, 0xffffff, 0xc084fc, 0xff8c42][k % 5])); }
    fm.count = k; fm.userData.noInk = true; fm.userData.ownMat = true; g.add(fm);
  }
  // Posts round an island's edge, for fences and stone edging.
  const arc = (L, n, f, inset = 0.06) => { for (let i = 0; i < n; i++) { const a = i / n * PI * 2; f(L.cx + Math.cos(a) * (L.r - inset), L.cz + Math.sin(a) * (L.r - inset), a, i); } };
  // Many copies of one small shape (tussocks, seedlings, kelp, dune grass) in one draw: list of [x, y, z, lean, turn, size].
  function many(g, geo, c, list) {
    const m = new T.InstancedMesh(geo, mat(c), list.length), d = new T.Object3D();
    list.forEach(([x, y, z, lean = 0, turn = 0, s = 1], i) => { d.position.set(x, y, z); d.rotation.set(lean, turn, 0); d.scale.setScalar(s); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.userData.noInk = true; g.add(m); return m;
  }
  // A ponga (tree fern): a dark trunk and a crown of drooping fronds.
  function treeFern(g, x, y, z, s = 1) {
    const t = new T.Group(); t.position.set(x, y, z); g.add(t); cyl(t, 0.02 * s, 0.03 * s, 0.34 * s, 0x4a3524, 0, 0.17 * s, 0, 7);
    for (let i = 0; i < 9; i++) { const f = new T.Group(); f.position.y = 0.34 * s; f.rotation.y = i / 9 * PI * 2; t.add(f); const fr = add(f, new T.ConeGeometry(0.03 * s, 0.26 * s, 4), mat(i % 2 ? 0x2f7a35 : 0x3a8a3f), 0, -0.04 * s, 0.11 * s); fr.rotation.x = P2 + 0.55; fr.scale.set(1, 1, 0.25); }
    return t;
  }
  // A school of little fish swimming a loop under the water; yAt(x, z) is how deep they swim there.
  function school(fx, g, n, cx, cz, rx, rz, yAt, c) {
    const fish = []; for (let i = 0; i < n; i++) { const f = new T.Group(); sph(f, 0.018, c, 0, 0, 0, 0.6, 0.7, 1.4); cn(f, 0.014, 0.025, c, 0, 0, -0.03, 4).rotation.x = P2; g.add(f); fish.push(f); }
    fx.push(t => fish.forEach((f, i) => { const p = t * 0.35 + i * 0.22, x = cx + Math.sin(p) * rx + Math.sin(i * 7.1) * 0.03, z = cz + Math.sin(p * 2) * rz + Math.cos(i * 5.3) * 0.03; f.position.set(x, yAt(x, z) + Math.sin(t * 2 + i) * 0.005, z); f.rotation.y = Math.atan2(Math.cos(p) * rx, 2 * Math.cos(p * 2) * rz); }));
  }
  // Swaying underwater plants (kelp, waterweed): one group of thin blades that sways together.
  function weed(fx, g, spots, c, h0, seed) {
    const rr = K.mulberry(seed), w = new T.Group(); g.add(w); const list = [];
    spots.forEach(([x, y, z]) => { for (let j = 0; j < 4; j++) list.push([x + (rr() - 0.5) * 0.04, y, z + (rr() - 0.5) * 0.04, (rr() - 0.5) * 0.4, rr() * 6, 0.6 + rr() * 0.7]); });
    many(w, new T.ConeGeometry(0.006, h0, 4).translate(0, h0 / 2, 0), c, list);
    fx.push(t => { w.rotation.z = Math.sin(t * 0.9) * 0.012; w.rotation.x = Math.cos(t * 0.7) * 0.01; });
  }
  // Builds one piece of land as an island (the farm's is built by index.html, with ground()).
  // ctx: { top, lawnC, night, flat, tint, rock, dens (blades per unit area), grow, meadow }.
  // Returns { L, zones, surf, tick, terrain: { h(x, z) ground height, sea (water level, or null) } }.
  function land(g, k, key, ctx) {
    const L = isle(key), y = ctx.top, seed = k.seed + key.length * 17, rr = K.mulberry(seed + 99), zones = {}, surf = [], fx = [], night = ctx.night, base = { seed, rock: ctx.rock };
    const tone = c => (night ? blend(c, 0x0f2a24, 0.5) : c), on = (m, hab) => { m.userData.hab = hab; surf.push(m); return m; }, spot = (u, v) => toWorld(L, u, v), face = Math.atan2(L.ox, L.oz);
    let hRel = () => 0, sea = null, play = {};
    if (key === 'plot') {
      // A working vege garden: two long dug beds with furrows (where crop beds go) either side of a bark path, raised
      // beds of lettuces and cabbages and a bean teepee at the front, sunflowers along the back, a shed, compost bins,
      // a water tank, a wheelbarrow and a scarecrow.
      const BEDS = [[-0.06, -0.36], [-0.06, 0.36]], inBed = (x, z, m = 0) => { const u = outward(L, x, z), v = across(L, x, z); return BEDS.some(([bu, bv]) => Math.pow(Math.abs(u - bu) / (0.46 + m), 4) + Math.pow(Math.abs(v - bv) / (0.16 + m), 4) < 1); };
      const bark = (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.74 * L.r;
      hRel = (x, z) => (inBed(x, z) ? 0.014 + 0.006 * Math.sin(across(L, x, z) * L.r * 105) : 0);
      on(ground(g, L, y, { ...base, lawnC: tone(0x4f8f38), h: hRel, n: 80, habAt: (x, z) => (inBed(x, z, -0.02) ? 'plot' : 'field'),
        col: (x, z, hh) => tone(inBed(x, z) ? (hh > 0.016 ? 0x7a5236 : 0x553522) : bark(x, z) ? (nz(x, z, 24, seed) > 0.6 ? 0xa98250 : 0xc8a06a) : blend(0x4f8f38, 0x3f7a2e, nz(x, z, 6, seed))) }), 'field');
      isleGrass(g, ctx, seed, L, y, { not: (x, z) => bark(x, z) || inBed(x, z, 0.03) });
      const shed = new T.Group(), [shx, shz] = spot(-0.7, 0.02); shed.position.set(shx, y, shz); shed.rotation.y = face; g.add(shed);
      bx(shed, 0.3, 0.2, 0.22, 0x6f9a6a, 0, 0.1, 0); [-1, 1].forEach(s => tilt(bx(shed, 0.17, 0.012, 0.26, 0x5b5f6e, s * 0.075, 0.235, 0), 0, 0, -s * 0.5)); bx(shed, 0.08, 0.15, 0.006, 0x4a3524, 0.05, 0.075, 0.112); bx(shed, 0.06, 0.05, 0.006, 0xbfe3ff, -0.08, 0.12, 0.112);
      for (let i = 0; i < 3; i++) { const [x, z] = spot(-0.58, -0.62 + i * 0.12), b = new T.Group(); b.position.set(x, y, z); b.rotation.y = face; g.add(b); bx(b, 0.1, 0.012, 0.1, 0x4a3020, 0, 0.07, 0); for (let j = 0; j < 4; j++) { bx(b, 0.1, 0.014, 0.008, 0x9a6a3c, 0, 0.012 + j * 0.02, 0.05); bx(b, 0.1, 0.014, 0.008, 0x9a6a3c, 0, 0.012 + j * 0.02, -0.05); bx(b, 0.008, 0.014, 0.1, 0x9a6a3c, 0.05, 0.012 + j * 0.02, 0); } }
      { const [x, z] = spot(-0.5, 0.64); cyl(g, 0.075, 0.075, 0.2, 0x3f6b4a, x, y + 0.1, z, 16); cyl(g, 0.078, 0.078, 0.012, 0x2f5a3a, x, y + 0.205, z, 16); }
      const sunflowers = []; for (let i = 0; i < 6; i++) { const a = L.a + PI + (i < 3 ? -1 : 1) * (0.55 + (i % 3) * 0.2), r0 = 0.86 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, hh = 0.22 + (i % 2) * 0.05; sunflowers.push([x, z]); cyl(g, 0.006, 0.008, hh, 0x4f8a2f, x, y + hh / 2, z, 5); const hd = new T.Group(); hd.position.set(x, y + hh, z); hd.rotation.set(-0.5, Math.atan2(L.cx - x, L.cz - z), 0); g.add(hd); cyl(hd, 0.045, 0.045, 0.01, 0xffc823, 0, 0, 0, 12).rotation.x = P2; cyl(hd, 0.022, 0.022, 0.014, 0x6b3f1f, 0, 0, 0.004, 10).rotation.x = P2; }
      [[0.6, -0.3, 0x9fd65a], [0.6, 0.3, 0x5f9a7a]].forEach(([u, v, c], b) => { const rb = new T.Group(), [x, z] = spot(u, v); rb.position.set(x, y, z); rb.rotation.y = face; g.add(rb); bx(rb, 0.18, 0.05, 0.26, WOOD, 0, 0.025, 0); bx(rb, 0.16, 0.012, 0.24, 0x553522, 0, 0.05, 0); for (let i = 0; i < 2; i++) for (let j = 0; j < 4; j++) sph(rb, b ? 0.026 : 0.022, c, -0.04 + i * 0.08, 0.065, -0.09 + j * 0.06, 1, b ? 0.85 : 0.6, 1); });
      { const [x, z] = spot(0.66, 0), tp = y + 0.3; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const b = [x + sx * 0.06, y, z + sz * 0.06]; stick(g, b, [x, tp, z], 0.004, 0x9a6a3c); for (let j = 1; j < 4; j++) { const q = j / 4; sph(g, 0.018, 0x3f8f35, b[0] + (x - b[0]) * q, y + (tp - y) * q, b[2] + (z - b[2]) * q, 1, 0.8, 1); } }); }
      { const s = new T.Group(), [x, z] = spot(0.28, 0.62); s.position.set(x, y, z); s.rotation.y = face; g.add(s); cyl(s, 0.006, 0.006, 0.3, 0x8a5a3c, 0, 0.15, 0, 5); bx(s, 0.2, 0.008, 0.008, 0x8a5a3c, 0, 0.22, 0); bx(s, 0.08, 0.1, 0.04, 0x3a5a9a, 0, 0.2, 0); sph(s, 0.035, 0xe8c48a, 0, 0.29, 0); cn(s, 0.05, 0.04, 0xd4a64a, 0, 0.33, 0, 10); }
      { const w = new T.Group(), [x, z] = spot(0.12, -0.62); w.position.set(x, y, z); w.rotation.y = face + 0.6; g.add(w); bx(w, 0.1, 0.04, 0.14, 0x5a7a9a, 0, 0.05, 0); cyl(w, 0.025, 0.025, 0.012, DARK, 0, 0.025, 0.08, 10).rotation.z = P2; [-1, 1].forEach(s => bx(w, 0.008, 0.008, 0.12, 0x8a5a3c, s * 0.05, 0.04, -0.1)); }
      const sprouts = []; BEDS.forEach(([bu, bv]) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) { const [x, z] = spot(bu + 0.18 + i * 0.05, bv - 0.09 + j * 0.06); sprouts.push([x, y + hRel(x, z), z, 0, rr() * 6, 0.8 + rr() * 0.5]); } });
      many(g, new T.ConeGeometry(0.012, 0.035, 5).translate(0, 0.017, 0), 0x5fae3a, sprouts);
      const [px, pz] = spot(-0.06, -0.36); zones.plot = { x: px, z: pz, r: 0.14, y: y + 0.02 };
      zones.lawn = { x: L.cx, z: L.cz, r: 0.82 * L.r, y, not: (x, z) => inBed(x, z, 0.04) };
      play = { start: spot(0.3, 0), spots: [], sunflowers, scarecrow: spot(0.28, 0.62) }; for (let i = 0; i < 400 && play.spots.length < 40; i++) { const [x, z] = spot((rr() - 0.5) * 1.1, (rr() - 0.5) * 1.1); if (inBed(x, z, -0.04)) play.spots.push([x, z]); }
    } else if (key === 'stable') {
      // A horse yard: a sand arena with white rails and show jumps, the stable block at the back, hay and a trough.
      const AU = 0.18, A1 = 0.56, A2 = 0.38, inArena = (x, z, m = 0) => ((outward(L, x, z) - AU) / (A2 + m)) ** 2 + (across(L, x, z) / (A1 + m)) ** 2 < 1;
      const [sx, sz] = spot(-0.66, 0), inStable = (x, z) => Math.hypot(x - sx, z - sz) < 0.33;
      on(ground(g, L, y, { ...base, lawnC: tone(0x4c8a36), n: 64, habAt: () => 'stable', col: (x, z) => tone(inArena(x, z) ? blend(0xd8bf8a, 0xc4a874, nz(x, z, 30, seed)) : blend(0x4c8a36, 0x5a9a40, nz(x, z, 8, seed))) }), 'stable');
      isleGrass(g, ctx, seed, L, y, { not: (x, z) => inArena(x, z, 0.03) || inStable(x, z) });
      const rails = []; for (let i = 0; i < 40; i++) { const a = i / 40 * PI * 2, [x, z] = spot(AU + Math.cos(a) * (A2 + 0.03), Math.sin(a) * (A1 + 0.03)); if (Math.abs(Math.cos(a) - 1) < 0.02) continue; cyl(g, 0.008, 0.008, 0.1, 0xf4f1ea, x, y + 0.05, z, 6); rails.push([x, z, i]); }
      rails.forEach(([x, z, i], j) => { const nb = rails[j + 1]; if (nb && nb[2] === i + 1) [0.045, 0.09].forEach(hh => stick(g, [x, y + hh, z], [nb[0], y + hh, nb[1]], 0.005, 0xf4f1ea)); });
      [-0.44, 0.44].forEach((v, n) => { const j = new T.Group(), [x, z] = spot(AU, v); j.position.set(x, y, z); j.rotation.y = face; g.add(j); [-1, 1].forEach(s => { bx(j, 0.02, 0.12, 0.03, 0xffffff, s * 0.1, 0.06, 0); bx(j, 0.02, 0.04, 0.03, n ? 0x2f6bd0 : 0xd0302f, s * 0.1, 0.1, 0); }); [0.05, 0.09].forEach(hh => { for (let q = 0; q < 4; q++) bx(j, 0.05, 0.01, 0.01, q % 2 ? 0xffffff : n ? 0x2f6bd0 : 0xd0302f, -0.075 + q * 0.05, hh, 0); }); });
      const st = new T.Group(); st.position.set(sx, y, sz); st.rotation.y = face; g.add(st);
      bx(st, 0.56, 0.2, 0.2, 0x9c5a3a, 0, 0.1, 0); tilt(bx(st, 0.62, 0.014, 0.28, 0x5b5f6e, 0, 0.235, 0.02), 0.32); bx(st, 0.58, 0.02, 0.02, 0xf4f1ea, 0, 0.2, 0.101);
      for (let i = 0; i < 3; i++) { bx(st, 0.1, 0.13, 0.006, 0x3b2a24, -0.18 + i * 0.18, 0.065, 0.101); bx(st, 0.11, 0.012, 0.008, 0xf4f1ea, -0.18 + i * 0.18, 0.08, 0.104); }
      bx(st, 0.07, 0.05, 0.006, 0x3b2a24, 0, 0.17, 0.103);
      [[-0.5, 0.5], [-0.42, 0.6]].forEach(([u, v], i) => { const [x, z] = spot(u, v); cyl(g, 0.05, 0.05, 0.085, 0xe9c46a, x, y + 0.05, z, 14).rotation.set(P2, 0, i * 0.7); });
      { const tr = new T.Group(), [x, z] = spot(-0.25, -0.62); tr.position.set(x, y, z); tr.rotation.y = face; g.add(tr); bx(tr, 0.2, 0.05, 0.07, 0x8d9096, 0, 0.035, 0); add(tr, new T.BoxGeometry(0.18, 0.004, 0.05), K.waterMat({ flat: 0.05, deepAt: 0.08, scale: 14 }), 0, 0.058, 0).userData.noInk = true; }
      zones.stable = { x: L.cx + L.ox * L.r * 0.1, z: L.cz + L.oz * L.r * 0.1, r: 0.62 * L.r, y, not: inStable };
      play = { y, jumps: [0.25, 0.75], jumpAt: [spot(AU, -0.44), spot(AU, 0.44)], rail: spot(AU + A2 + 0.03, 0.05), arena: spot(AU, 0), trough: spot(-0.25, -0.62), pile: spot(-0.46, 0.55), walk: (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.85 * L.r && !inStable(x, z), lap: Array.from({ length: 48 }, (_, i) => { const a = i / 48 * PI * 2; return spot(AU + Math.cos(a) * (A2 - 0.1), Math.sin(a) * (A1 - 0.12)); }) };
    } else if (key === 'lookout') {
      // A geyser basin, after Yellowstone: a rainbow hot spring in the middle (deep blue, then turquoise, green, yellow,
      // and orange bacterial mats streaming off it), a geyser on its sinter cone that erupts every so often, steaming
      // vents and a bubbling mud pot, white travertine terraces with blue pools, a golden meadow, a hill of lodgepole
      // pines and dead snags, and a boardwalk winding between it all up to an overlook deck above the spring.
      sea = y - 0.006;
      const at = (u, v) => spot(u, v), [gx, gz] = at(0.12, 0.22), GR = 0.24, [ox, oz] = at(0.36, -0.46), [mx, mz] = at(0.56, -0.16), [tx, tz] = at(-0.4, 0.56), [lx, lz] = at(-0.56, -0.1);
      const vents = [at(0.62, 0), at(-0.04, -0.18), at(0.36, 0.66), at(-0.22, 0.32)];
      // The big spring and two smaller hot pools, each a bowl measured in its own radius (pool 0 has the long mats).
      const POOLS = [[gx, gz, GR], [...at(0.6, 0.42), 0.1], [...at(-0.12, -0.42), 0.085]], pool = (x, z) => { let best = [9, 0]; POOLS.forEach(([px, pz, pr], i) => { const d = Math.hypot(x - px, z - pz) / pr; if (d < best[0]) best = [d, i]; }); return best; };
      const dG = (x, z) => pool(x, z)[0], dO = (x, z) => Math.hypot(x - ox, z - oz), dM = (x, z) => Math.hypot(x - mx, z - mz), dT = (x, z) => Math.hypot(x - tx, z - tz);
      const hill = (x, z) => 0.42 * (1 - K.smooth01(0.15, 1, Math.hypot((outward(L, x, z) + 0.9) / 0.75, (across(L, x, z) + 0.32) / 0.95)));
      const raw = (x, z) => {
        const [g0, pi] = pool(x, z), sink = pi ? 0.06 : 0.08, spring = g0 < 1.4 ? -sink * (1 - K.smooth01(0, 1, g0)) ** 1.5 + 0.012 * Math.exp(-(((g0 - 1.06) / 0.08) ** 2)) : 0;
        return hill(x, z) + spring + 0.055 * (1 - K.smooth01(0, 0.14, dO(x, z))) - 0.022 * (1 - K.smooth01(0.03, 0.07, dM(x, z))) + 0.008 * (nz(x, z, 9, seed) - 0.5);
      };
      const top = raw(lx, lz);
      hRel = (x, z) => { const w = 1 - K.smooth01(0.1, 0.16, Math.hypot(x - lx, z - lz)); return raw(x, z) * (1 - w) + top * w; };
      // Orange and rust mats stream out from the spring in fingers, and run off in channels towards the front.
      const finger = (x, z) => { const a = Math.atan2(z - gz, x - gx); return 0.32 * (0.5 + 0.5 * Math.sin(a * 9 + Math.sin(a * 4) * 2)) * (0.6 + 0.8 * nz(x, z, 14, seed + 4)); };
      const runoff = (x, z) => { const u = outward(L, x, z) - 0.12, v = across(L, x, z) - 0.22; return u > 0.2 && Math.abs(v - 0.06 * Math.sin(u * 13)) < 0.035 + 0.02 * u; };
      const meadow = (x, z) => (across(L, x, z) < -0.32 || (outward(L, x, z) > 0.62 && across(L, x, z) < 0.05)) && dO(x, z) > 0.17 && hill(x, z) < 0.05 && dG(x, z) > 1.35;
      const colAt = (x, z, hh) => {
        const [g0, pi] = pool(x, z), n0 = nz(x, z, 16, seed + 7), hl = hill(x, z);
        if (Math.hypot(x - lx, z - lz) < 0.15) return tone(0xb59a7a);
        if (g0 < 0.42) return 0x163a9a; if (g0 < 0.72) return 0x1f8fb0; if (g0 < 0.9) return 0x4fbf9a; if (g0 < 1.04) return 0x9fd05a;
        if (g0 < 1.22) return tone(0xf2d24c);
        const f = pi ? g0 + 0.1 : g0 - finger(x, z) * 1.6;
        if (f < 1.25 || (!pi && runoff(x, z) && g0 < 2.6)) return tone(n0 > 0.5 ? 0xeb8a35 : 0xe07a2c);
        if (f < 1.55) return tone(0xb5523b);
        if (dO(x, z) < 0.14) return tone(n0 > 0.55 ? 0xd8cdb4 : 0xefe6cf);
        if (dM(x, z) < 0.075) return tone(0x8a7d70);
        if (vents.some(([vx, vz]) => Math.hypot(x - vx, z - vz) < 0.06)) return tone(0xe0a43a);
        if (hl > 0.05) { const sl = Math.hypot(hill(x + 0.01, z) - hill(x - 0.01, z), hill(x, z + 0.01) - hill(x, z - 0.01)) / 0.02; return tone(sl > 0.9 && n0 > 0.45 ? 0xc9a46a : n0 > 0.6 ? 0x7a7a42 : 0x5f6b3a); }
        if (meadow(x, z)) return tone(blend(0x9fae5a, 0xc2b863, n0));
        return tone(n0 > 0.6 ? 0xc9c2ae : 0xddd8c8);
      };
      const blocked = (x, z) => dG(x, z) < 1.3 || dO(x, z) < 0.16 || dM(x, z) < 0.09 || dT(x, z) < 0.28 || hRel(x, z) > 0.07 || vents.some(([vx, vz]) => Math.hypot(x - vx, z - vz) < 0.06);
      // The cut-away side: sinter crust, soil, then bands of yellow rhyolite, like the Grand Canyon of the Yellowstone.
      const band = yy => { const b = Math.sin(yy * 24 + 0.7); return b > 0.45 ? 0xe2c48e : b < -0.4 ? 0xa8794f : 0xc9a46a; };
      const gnd = on(ground(g, L, y, { ...base, lawnC: tone(0xddd8c8), h: hRel, col: colAt, n: 96, habAt: (x, z) => (blocked(x, z) ? null : 'field'), layers: [[0.02, null], [0.05, 0xd9cdb0], [0.12, 0x6b4a2e], [9, band]],
        cap: a => { const x = L.cx + Math.cos(a) * (L.r + 0.05), z = L.cz + Math.sin(a) * (L.r + 0.05); return colAt(x, z, hRel(x, z)); } }), 'field');
      caustics(g, gnd, sea);
      POOLS.forEach(([px, pz, pr], i) => K.waterSheet(g, px, pz, pr * 1.12, sea, (x, z) => y + hRel(x, z) - sea, { night, clear: true, deepAt: i ? 0.045 : 0.06, foam: 0.004, edge: 0.003, shallow: 0x46d6b8, deep: 0x0a4fd0, n: i ? 24 : 40 }));
      L.noFence = a => hill(L.cx + Math.cos(a) * (L.r - 0.04), L.cz + Math.sin(a) * (L.r - 0.04)) > 0.05;
      isleGrass(g, ctx, seed, L, y, { dens: (x, z) => (meadow(x, z) ? 1 : hill(x, z) > 0.04 ? 0.3 : 0), ground: hRel, tint: [0x8a9a4a, 0x7a8a3a, 0xd8c870] });
      // Steam: puffs that rise, swell and fade from each vent, the spring and the geyser.
      const puffs = [], steam = (x, yy, z, n, s0, rate) => { for (let i = 0; i < n; i++) { const m = add(g, new T.SphereGeometry(s0, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), x, yy, z); m.userData.noInk = true; m.userData.ownMat = true; puffs.push({ m, x, y: yy, z, ph: i / n, rate, s0 }); } };
      vents.forEach(([vx, vz]) => steam(vx, y + hRel(vx, vz), vz, 4, 0.03, 0.35));
      POOLS.forEach(([px, pz, pr], i) => steam(px, sea, pz, i ? 3 : 6, i ? 0.04 : 0.07, 0.18)); steam(ox, y + 0.06, oz, 3, 0.035, 0.4);
      fx.push(t => puffs.forEach(p => { const q = (t * p.rate + p.ph) % 1; p.m.position.set(p.x + Math.sin(t * 0.7 + p.ph * 9) * 0.03 * q, p.y + q * 0.32, p.z + Math.cos(t * 0.6 + p.ph * 7) * 0.03 * q); p.m.scale.setScalar(0.6 + q * 2.2); p.m.material.opacity = 0.42 * Math.sin(Math.PI * q); }));
      // The geyser: a sinter cone with a vent; every 24 seconds it erupts for 7, a column of water roaring up with spray
      // and a cloud of steam, then dies back.
      cn(g, 0.07, 0.05, 0xefe6cf, ox, y + 0.06, oz, 10); cyl(g, 0.012, 0.012, 0.004, 0x4a4038, ox, y + 0.086, oz, 8);
      const colm = add(g, new T.CylinderGeometry(0.018, 0.034, 1, 10, 1, true).translate(0, 0.5, 0), new T.MeshBasicMaterial({ color: 0xf2fbff, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide }), ox, y + 0.085, oz);
      colm.userData.noInk = true; colm.userData.ownMat = true;
      const spray = []; for (let i = 0; i < 16; i++) { const m = add(g, new T.SphereGeometry(0.012, 6, 5), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }), ox, y, oz); m.userData.noInk = true; m.userData.ownMat = true; spray.push({ m, a: i * 2.4, s: 0.5 + (i % 4) * 0.2 }); }
      const cloud = []; for (let i = 0; i < 5; i++) { const m = add(g, new T.SphereGeometry(0.08, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), ox, y, oz); m.userData.noInk = true; m.userData.ownMat = true; cloud.push(m); }
      fx.push(t => {
        const c = t % 24, on = c < 7, e = on ? Math.min(1, c / 1.2) * Math.min(1, (7 - c) / 2) : 0, hh = 0.62 * e * (0.92 + 0.08 * Math.sin(t * 13));
        colm.visible = e > 0.02; colm.scale.set(1, Math.max(0.01, hh), 1);
        spray.forEach((p, i) => { const q = (t * 1.6 + i / spray.length) % 1, r0 = 0.02 + q * 0.12 * p.s; p.m.visible = on && e > 0.2; p.m.position.set(ox + Math.cos(p.a) * r0, y + 0.08 + hh * (0.7 + 0.5 * Math.sin(Math.PI * q)) - q * q * 0.25, oz + Math.sin(p.a) * r0); });
        cloud.forEach((m, i) => { const q = (c / 9 + i / 5) % 1; m.material.opacity = c < 10 ? 0.5 * Math.sin(Math.PI * q) * Math.min(1, c / 1.5) * Math.max(0, 1 - Math.max(0, c - 7) / 3) : 0; m.position.set(ox + Math.sin(i * 2.1) * 0.06 * q, y + 0.1 + hh * 0.9 + q * 0.3, oz + Math.cos(i * 1.7) * 0.06 * q); m.scale.setScalar(0.8 + q * 2); });
      });
      // The mud pot bubbles.
      const mud = add(g, new T.CircleGeometry(0.065, 18).rotateX(-P2), mat(0x8a7d70), mx, y + hRel(mx, mz) + 0.003, mz); mud.userData.noInk = true;
      const bub = [0, 1, 2, 3].map(i => { const m = add(g, new T.SphereGeometry(0.012, 8, 6, 0, PI * 2, 0, P2), mat(0x9a8d80), mx + Math.cos(i * 1.7) * 0.03, y + hRel(mx, mz) + 0.004, mz + Math.sin(i * 1.7) * 0.03); m.userData.noInk = true; return m; });
      fx.push(t => bub.forEach((m, i) => { const q = (t * 0.7 + i * 0.27) % 1; m.scale.setScalar(q < 0.85 ? 0.3 + q * 1.2 : 0.01); }));
      // Travertine terraces: white steps of mineral with pools of blue water on each, stained orange where it drips.
      for (let i = 0; i < 4; i++) {
        const r0 = 0.24 - i * 0.05, [cx2, cz2] = at(-0.4 - i * 0.05, 0.56 - i * 0.02), b = y + hRel(cx2, cz2) + i * 0.045;
        add(g, rough(new T.CylinderGeometry(r0, r0 + 0.015, 0.05, 18, 1), 0.012, seed + i), mat(i % 2 ? 0xf1ebdc : 0xe8e0cc, { flat: true }), cx2, b + 0.02, cz2);
        add(g, new T.CircleGeometry(r0 - 0.03, 18).rotateX(-P2), K.waterMat({ flat: 0.03, deepAt: 0.05, scale: 14, shallow: 0x7fe0d8, deep: 0x2aa0c8, clear: true }), cx2, b + 0.046, cz2).userData.noInk = true;
        for (let j = 0; j < 7; j++) { const a = j * 0.9 + i, d = bx(g, 0.012, 0.05, 0.004, j % 2 ? 0xd08a4a : 0xb86a3a, cx2 + Math.cos(a) * (r0 + 0.016), b + 0.015, cz2 + Math.sin(a) * (r0 + 0.016)); d.rotation.y = -a + P2; }
      }
      // Lodgepole pines and dead snags on the hill and round the meadow.
      const trees = []; for (let i = 0; i < 900 && trees.length < 24; i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * 0.9 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0; if ((hill(x, z) > 0.04 || (meadow(x, z) && rr() < 0.25)) && Math.hypot(x - lx, z - lz) > 0.2 && !trees.some(([x2, z2]) => Math.hypot(x - x2, z - z2) < 0.1)) trees.push([x, z]); }
      trees.forEach(([x, z], i) => { const b = y + hRel(x, z); if (i % 5 === 4) { cyl(g, 0.008, 0.014, 0.34, 0x9a948c, x, b + 0.17, z, 6); [0.2, 0.26].forEach((hy, j) => stick(g, [x, b + hy, z], [x + (j ? -0.04 : 0.05), b + hy + 0.03, z + 0.02], 0.004, 0x9a948c)); } else { const p = species(g, x, b, z, 'pine', seed + i, 0.85); p.scale.x *= 0.7; p.scale.z *= 0.7; p.scale.y *= 1.35; } });
      // The boardwalk, raised on posts, from the front edge between the spring and the geyser and up to the overlook.
      const walk = [[0.96, 0.18], [0.62, 0.12], [0.36, -0.12], [0.06, -0.14], [-0.22, -0.06], [-0.44, -0.08]].map(([u, v]) => at(u, v)); let q = 0;
      walk.forEach((p, i) => { const nx = walk[i + 1]; if (!nx) return; const len = Math.hypot(nx[0] - p[0], nx[1] - p[1]), ry = Math.atan2(nx[0] - p[0], nx[1] - p[1]); for (let s = 0; s < len; s += 0.03, q++) { const x = p[0] + (nx[0] - p[0]) * s / len, z = p[1] + (nx[1] - p[1]) * s / len, b = y + Math.max(hRel(x, z), sea - y) + 0.025; bx(g, 0.07, 0.008, 0.024, q % 2 ? 0xb98a5a : 0xa77a4c, x, b, z).rotation.y = ry; if (q % 5 === 0) [-1, 1].forEach(sd => cyl(g, 0.004, 0.004, 0.03, 0x6b4a2e, x + Math.cos(ry) * 0.03 * sd, b - 0.015, z - Math.sin(ry) * 0.03 * sd, 4)); } });
      // The overlook deck on the hill.
      const dy = y + top;
      cyl(g, 0.14, 0.15, 0.025, WOOD, lx, dy + 0.012, lz, 18);
      const deck = on(add(g, new T.CircleGeometry(0.13, 24).rotateX(-P2), mat(0xb98a5a), lx, dy + 0.026, lz), 'lookout'); deck.userData.noInk = true;
      ring(12, a => cyl(g, 0.005, 0.005, 0.07, 0x6b4a2e, lx + Math.cos(a) * 0.135, dy + 0.06, lz + Math.sin(a) * 0.135, 5));
      tor(g, 0.135, 0.004, 0x6b4a2e, lx, dy + 0.09, lz).rotation.x = P2;
      zones.lookout = { x: lx, z: lz, r: 0.07, y: dy + 0.026 };
      const [wx, wz] = at(0.2, -0.7); zones.lawn = { x: wx, z: wz, r: 0.3 * L.r, y, not: blocked };
      { const [px, pz] = at(0.36, -0.13); play = { at: [px, y + Math.max(hRel(px, pz), sea - y) + 0.03, pz], geyser: [ox, y + 0.06, oz], gxz: [ox, oz], spring: [gx, gz], cycle: 24, erupt: 7, walk: (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.85 * L.r && !blocked(x, z) }; }
    } else if (key === 'orchard') {
      // An orchard: grass mown in stripes, blossom trees along the back, beehives, crates of picked fruit, a ladder, and
      // wildflowers along the stone wall.
      on(ground(g, L, y, { ...base, lawnC: tone(0x55a03c), n: 56, habAt: () => 'orchard', col: (x, z) => tone(Math.floor((across(L, x, z) + 1) * 6) % 2 ? 0x5aa843 : 0x4b9536) }), 'orchard');
      isleGrass(g, ctx, seed, L, y, { tint: [0x55a03c, 0x3f8a2e, 0x9ad65a], grow: K.MOWN + 0.15 });
      [1, 2, 3].forEach(s => meadow(g, seed + s * 7, L, y, { not: (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.8 * L.r }));
      arc(L, 40, (x, z, a, i) => { const o = add(g, rough(new T.BoxGeometry(0.075, 0.05, 0.045), 0.006, seed + i), mat(i % 2 ? 0xb7ada0 : 0xa59b8e, { flat: true }), x, y + 0.02, z); o.rotation.y = -a; });
      play = { trees: [], hives: [spot(-0.4, 0.72), spot(-0.24, 0.78)] }; [[-0.72, -0.36], [-0.8, 0], [-0.72, 0.36]].forEach(([u, v], i) => { const [x, z] = spot(u, v); species(g, x, y, z, 'cherry', seed + i, 0.9); play.trees.push([x, z]); });
      { const [x, z] = spot(-0.62, -0.3); stick(g, [x + 0.05, y, z + 0.05], [x + 0.01, y + 0.3, z + 0.01], 0.005, 0xb07a4a); stick(g, [x + 0.1, y, z + 0.02], [x + 0.05, y + 0.3, z - 0.02], 0.005, 0xb07a4a); for (let i = 1; i < 6; i++) { const q = i / 6; stick(g, [x + 0.05 - 0.04 * q, y + 0.3 * q, z + 0.05 - 0.04 * q], [x + 0.1 - 0.05 * q, y + 0.3 * q, z + 0.02 - 0.04 * q], 0.003, 0xb07a4a); } }
      [[-0.4, 0.72], [-0.24, 0.78]].forEach(([u, v]) => { const [x, z] = spot(u, v), h = new T.Group(); h.position.set(x, y, z); h.rotation.y = face; g.add(h); bx(h, 0.08, 0.02, 0.08, 0x8a5a3c, 0, 0.01, 0); for (let i = 0; i < 3; i++) bx(h, 0.09, 0.04, 0.09, i % 2 ? 0xf4f1ea : 0xffe9a8, 0, 0.04 + i * 0.042, 0); bx(h, 0.1, 0.012, 0.1, 0x5b5f6e, 0, 0.17, 0); });
      [[0.55, -0.52, 0xd93a3a], [0.5, -0.66, 0xffd43b]].forEach(([u, v, c]) => { const [x, z] = spot(u, v), b = new T.Group(); b.position.set(x, y, z); b.rotation.y = face + u; g.add(b); bx(b, 0.12, 0.06, 0.08, 0xc9a06a, 0, 0.03, 0); for (let i = 0; i < 6; i++) sph(b, 0.018, c, -0.04 + (i % 3) * 0.04, 0.065, -0.015 + Math.floor(i / 3) * 0.03); });
      zones.orchard = { x: L.cx, z: L.cz, r: 0.78 * L.r, y };
    } else if (key === 'grove') {
      // Native bush: a forest floor of moss and leaf litter, tall trees and tree ferns round the back and sides, ferns,
      // a mossy fallen log and toadstools.
      hRel = (x, z) => 0.012 * (nz(x, z, 7, seed) - 0.5);
      on(ground(g, L, y, { ...base, lawnC: tone(0x3f5a2c), h: hRel, n: 56, habAt: () => 'grove', col: (x, z) => { const n0 = nz(x, z, 20, seed + 2); return tone(n0 > 0.62 ? 0x6b4a2a : n0 > 0.42 ? 0x3f5a2c : 0x33462a); }, layers: [[0.025, null], [0.1, 0x3a2a1c], [0.2, 0x5a3e28], [9, 0x8f6c4a]] }), 'grove');
      isleGrass(g, ctx, seed, L, y, { dens: () => 0.22, tint: [0x2f4a24, 0x2a4420, 0x6a8a3a], ground: hRel });
      { const [px, pz] = spot(0.22, 0.05); play = { at: [px, y, pz], perches: [], trees: [] }; }
      arc(L, 16, (x, z, a, i) => { if (Math.cos(a - L.a) > 0.4) return; play.perches.push([x, y + hRel(x, z) + (i % 3 === 1 ? 0.4 : 0.55), z]); play.trees.push([x, z]); if (i % 3 === 1) treeFern(g, x, y + hRel(x, z), z, 1.1); else species(g, x, y + hRel(x, z), z, ['kauri', 'nikau', 'pine', 'cabbage', 'kauri'][i % 5], seed + i, 1.05); }, 0.13);
      [[-0.45, -0.3, 'k'], [-0.5, 0.35, 'f'], [-0.12, -0.6, 'n'], [-0.2, 0.6, 'f']].forEach(([u, v, t], i) => { const [x, z] = spot(u, v); if (t === 'f') treeFern(g, x, y + hRel(x, z), z, 0.95); else species(g, x, y + hRel(x, z), z, t === 'k' ? 'kauri' : 'nikau', seed + 40 + i, 0.9); });
      for (let i = 0; i < 16; i++) { const a = rr() * PI * 2, r0 = (0.3 + rr() * 0.55) * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, f = new T.Group(); f.position.set(x, y + hRel(x, z), z); g.add(f); for (let q = 0; q < 5; q++) { const o = cn(f, 0.012, 0.12, 0x3f8a3f, 0, 0.04, 0, 4); o.rotation.set(Math.sin(q * 1.3) * 0.7, q * 1.26, Math.cos(q * 1.3) * 0.7); o.scale.z = 0.35; } }
      { const [x, z] = spot(0.18, -0.42), lg = cyl(g, 0.035, 0.04, 0.34, 0x6b4a2e, x, y + 0.03, z, 9); lg.rotation.set(0, face + 0.4, P2); const ms = bx(g, 0.3, 0.014, 0.05, 0x4f8a3a, x, y + 0.066, z); ms.rotation.y = face + 0.4 - P2; }
      for (let i = 0; i < 7; i++) { const a = rr() * PI * 2, r0 = (0.2 + rr() * 0.6) * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, b = y + hRel(x, z); cyl(g, 0.005, 0.006, 0.03, 0xf4efe4, x, b + 0.015, z, 6); add(g, new T.SphereGeometry(0.017, 10, 6, 0, PI * 2, 0, P2), mat(i % 3 ? 0xd93a3a : 0xc98a4a), x, b + 0.028, z); }
      zones.grove = { x: L.cx, z: L.cz, r: 0.6 * L.r, y };
    } else if (key === 'sky') {
      // A cloud island: a pastel meadow, cloud bushes, glowing crystals, a rainbow over the back, little rocks orbiting
      // it and clouds drifting round its rock.
      hRel = (x, z) => 0.02 * (nz(x, z, 5, seed) - 0.5);
      on(ground(g, L, y, { ...base, lawnC: tone(0xc7b4f0), h: hRel, n: 48, habAt: () => 'sky', col: (x, z) => tone(blend(0xc7b4f0, 0xf2c3e3, nz(x, z, 8, seed + 4))), layers: [[0.02, null], [0.12, 0xb7a6d8], [9, 0x9b8fc0]] }), 'sky');
      isleGrass(g, ctx, seed, L, y, { tint: [0xbfa9f0, 0xa58fe6, 0xffe0f6], ground: hRel });
      [[-0.5, -0.45], [-0.62, 0.3], [0.3, -0.62], [0.45, 0.55], [-0.2, 0.7], [-0.75, -0.05]].forEach(([u, v], i) => { const [x, z] = spot(u, v), b = y + hRel(x, z); for (let j = 0; j < 4; j++) sph(g, 0.05 + (j % 2) * 0.025, 0xffffff, x + Math.cos(j * 1.7 + i) * 0.05, b + 0.04 + (j % 2) * 0.03, z + Math.sin(j * 1.7 + i) * 0.05); });
      const crys = [[-0.3, -0.2, 0xb9a6ff], [0.2, 0.4, 0xffb3e6], [-0.55, 0.55, 0x9fe8ff], [0.6, -0.15, 0xc5ffd8], [-0.1, -0.7, 0xffe28a]].map(([u, v, c]) => { const [x, z] = spot(u, v), o = add(g, new T.OctahedronGeometry(0.045, 0), mat(c, { e: c & 0x3f3f3f, flat: true }), x, y + hRel(x, z) + 0.07, z); o.scale.y = 1.8; return o; });
      fx.push(t => crys.forEach((o, i) => { o.rotation.y = t * 0.6 + i; }));
      { const [x, z] = spot(-0.62, 0); [0xff6b6b, 0xffa94d, 0xffe066, 0x69db7c, 0x4dabf7, 0x9775fa].forEach((c, i) => { const rb = tor(g, 0.52 - i * 0.022, 0.011, c, x, y - 0.05, z, PI); rb.rotation.y = face; rb.userData.noInk = true; }); }
      const orbit = new T.Group(); g.add(orbit); [0, 1, 2].forEach(i => { const m = new T.Group(), a = i / 3 * PI * 2; m.position.set(Math.cos(a) * 1.25, -0.1 + i * 0.12, Math.sin(a) * 1.25); orbit.add(m); add(m, K.strata(rough(new T.ConeGeometry(0.07, 0.12, 7, 2).rotateX(PI), 0.02, seed + i), seed + i, ctx.rock), mat(0xffffff, { vc: true, flat: true }), 0, -0.06, 0); cyl(m, 0.072, 0.07, 0.015, tone(0xc7b4f0), 0, 0.005, 0, 10); });
      const puffs = new T.Group(); g.add(puffs);
      for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2, r0 = L.r * (0.8 + (i % 3) * 0.12), p = add(puffs, new T.SphereGeometry(0.11 + (i % 3) * 0.05, 12, 8), mat(0xffffff), Math.cos(a) * r0, -0.3 - (i % 2) * 0.28, Math.sin(a) * r0); p.scale.y = 0.6; p.userData.noInk = true; }
      fx.push(t => { puffs.rotation.y = t * 0.08; orbit.rotation.y = -t * 0.12; });
      zones.sky = { x: L.cx, z: L.cz, r: 0.75 * L.r, y };
      { const [px, pz] = spot(0.25, -0.15); play = { at: [px, y, pz], face: Math.atan2(-L.ox, -L.oz), clouds: [[-0.5, -0.45], [-0.62, 0.3], [0.3, -0.62], [0.45, 0.55], [-0.2, 0.7], [-0.75, -0.05]].map(([u2, v2]) => spot(u2, v2)), rainbow: spot(-0.62, 0) }; }
    } else if (key === 'beach') {
      // A cove: dry sand and dunes at the back, a wiggly shoreline, then the sea over more than half the island. The bed
      // banks down steeply from the shore, then slopes out to the deep. Waves roll in and break, and their wash runs up
      // the sand. Under the surface: seagrass, kelp, coral, rocks and a school of fish. Pohutukawa and nikau shade the dunes.
      sea = y - 0.03;
      const shoreU = v => -0.12 + 0.07 * Math.sin(2.1 * v + 0.6) + 0.04 * Math.sin(4.7 * v + 1.9), out = (x, z) => outward(L, x, z) - shoreU(across(L, x, z));
      hRel = (x, z) => {
        const e = out(x, z);
        if (e < 0) { const q = Math.min(1, -e / 0.6); return -0.03 + 0.06 * (1 - (1 - q) * (1 - q)) + 0.008 * (nz(x, z, 9, seed) - 0.5) * q; }
        return -0.03 - 0.12 * K.smooth01(0, 0.2, e) - 0.24 * K.smooth01(0.12, 1.05, e) + 0.01 * (nz(x, z, 14, seed + 1) - 0.5) * K.smooth01(0.05, 0.25, e);
      };
      const colAt = (x, z, hh) => {
        const dep = -0.03 - hh;
        if (dep < -0.012) return tone(blend(0xf1d9a0, 0xe6cb8c, nz(x, z, 12, seed + 3)));
        if (dep < 0.004) return tone(0xc9ae78);
        if (dep > 0.06 && dep < 0.24 && nz(x, z, 10, seed + 5) > 0.62) return tone(0x4d7a3c);
        return tone(blend(blend(0xd4bd86, 0x9d9a73, dep / 0.2), 0x6f7f6a, (dep - 0.2) / 0.2));
      };
      const E = L.r + 0.05, gnd = on(ground(g, L, y, { ...base, h: hRel, col: colAt, n: 88, base: -0.3, sea, lawnC: 0xf1d9a0, layers: SAND, water: { night, shallow: 0x7fe6e0, deep: 0x0f5c9a }, habAt: (x, z) => (hRel(x, z) > -0.026 ? 'beach' : null),
        cap: a => { const x = L.cx + Math.cos(a) * E, z = L.cz + Math.sin(a) * E; return colAt(x, z, hRel(x, z) - 0.03); } }), 'beach');
      caustics(g, gnd, sea); swash(g, gnd, sea, 0.012, 1.6);
      on(K.waterSheet(g, L.cx, L.cz, E, sea, (x, z) => y + hRel(x, z) - sea, { night, clear: true, deepAt: 0.32, foam: 0.01, edge: 0.004, shallow: 0x7fe6e0, deep: 0x0f5c9a, n: 80, wave: { a: 0.012, k: 55, w: 1.6 }, brk: 1 }), 'sea');
      const dry = [], wet = [];
      for (let i = 0; i < 1400 && (dry.length < 120 || wet.length < 60); i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * 0.92 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, e = out(x, z), hh = hRel(x, z); if (e < -0.25 && dry.length < 120) dry.push([x, y + hh, z]); else if (e > 0.18 && sea - (y + hh) > 0.07 && wet.length < 60) wet.push([x, y + hh, z]); }
      many(g, new T.ConeGeometry(0.005, 0.07, 3).translate(0, 0.035, 0), tone(0xa9b85a), dry.slice(0, 90).flatMap(([x, yy, z]) => [0, 1, 2].map(j => [x + (rr() - 0.5) * 0.02, yy, z + (rr() - 0.5) * 0.02, (rr() - 0.5) * 0.7, rr() * 6, 0.7 + rr() * 0.6])));
      [[-0.82, -0.3, 'pohutukawa'], [-0.74, 0.42, 'nikau'], [-0.88, 0.12, 'nikau']].forEach(([u, v, t], i) => { const [x, z] = spot(u, v); species(g, x, y + hRel(x, z), z, t, seed + i, t === 'nikau' ? 1.15 : 1); });
      { const [x, z] = spot(-0.42, -0.58), dw = cyl(g, 0.018, 0.024, 0.3, 0x9a8a78, x, y + hRel(x, z) + 0.015, z, 7); dw.rotation.set(0, face + 0.9, P2); }
      for (let i = 0; i < 8; i++) { const [x, yy, z] = dry[90 + (i % 30)] || dry[i]; add(g, new T.ConeGeometry(0.012, 0.022, 7), mat([0xffd1dc, 0xf6e7c0, 0xffb38a][i % 3]), x, yy + 0.006, z).rotation.z = P2; }
      wet.slice(0, 8).forEach(([x, yy, z], i) => add(g, rough(new T.DodecahedronGeometry(0.04 + (i % 3) * 0.02, 0), 0.012, seed + i), mat(i % 2 ? 0x7d8a84 : 0x6a7670, { flat: true }), x, yy + 0.01, z));
      wet.slice(8, 14).forEach(([x, yy, z], i) => { const c = [0xff7aa2, 0xff9f43, 0xb07cff][i % 3]; for (let j = 0; j < 5; j++) { const a = j * 1.3 + i; cyl(g, 0.006, 0.01, 0.05 + (j % 3) * 0.02, c, x + Math.cos(a) * 0.025, yy + 0.03, z + Math.sin(a) * 0.025, 5).rotation.set(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4); } sph(g, 0.022, c, x, yy + 0.015, z, 1, 0.7, 1); });
      weed(fx, g, wet.slice(14, 40), 0x3f7a3a, 0.14, seed + 9);
      const [fx0, fz0] = spot(0.45, 0.05); school(fx, g, 7, fx0, fz0, 0.28, 0.22, (x, z) => { const b = y + hRel(x, z); return Math.min(sea - 0.035, b + (sea - b) * 0.5); }, 0xffb23a);
      const [bx0, bz0] = spot(-0.52, 0), [wx0, wz0] = spot(0.42, 0);
      zones.beach = { x: bx0, z: bz0, r: 0.34 * L.r, y, follow: true };
      zones.sea = { x: wx0, z: wz0, r: 0.5 * L.r, y: sea, water: true };
      zones.coast = { x: L.cx, z: L.cz, r: 0.88 * L.r, y };
      zones.lawn = zones.beach;
      play = { L, sea, palms: [spot(-0.74, 0.42), spot(-0.88, 0.12)], walk: (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.85 * L.r && hRel(x, z) > -0.026 };
    } else if (key === 'lake') {
      // A lake island: water right to the edge over a weedy bed that shelves down to a deep middle, reeds and lilies
      // round the edge, and a wooden jetty out from the back with a rowboat tied at the end.
      sea = y - 0.01;
      const [qx, qz] = spot(0.12, -0.08);
      hRel = (x, z) => { const d = Math.hypot(x - qx, z - qz) / L.r, a = Math.atan2(z - qz, x - qx), rs = 1 + 0.12 * Math.sin(2 * a + 0.4) + 0.07 * Math.sin(3 * a + 1.7); return -0.065 - 0.28 * (1 - K.smooth01(0.1, 0.95 * rs, d)) + 0.012 * (nz(x, z, 12, seed) - 0.5); };
      const colAt = (x, z, hh) => { const dep = sea - y - hh; if (dep < 0.09) return tone(0x8a7a55); if (dep < 0.2 && nz(x, z, 12, seed + 5) > 0.58) return tone(0x4a6a35); return tone(blend(0x6a6a4a, 0x3a4436, (dep - 0.09) / 0.2)); };
      const E = L.r + 0.05, gnd = ground(g, L, y, { ...base, h: hRel, col: colAt, n: 72, base: -0.32, sea, lawnC: 0x8a7a55, layers: MUD, water: { night, shallow: 0x8fd8c8, deep: 0x0f4d6a } });
      caustics(g, gnd, sea);
      on(K.waterSheet(g, L.cx, L.cz, E, sea, (x, z) => y + hRel(x, z) - sea, { night, clear: true, deepAt: 0.28, foam: 0.004, edge: 0.003, shallow: 0x8fd8c8, deep: 0x0f4d6a, n: 64 }), 'lake');
      const J0 = -0.98, J1 = -0.22, JV = 0.1, JW = 0.075, deckY = sea + 0.035, len = (J1 - J0) * L.r, [jx, jz] = spot((J0 + J1) / 2, JV), onDeck = (x, z) => { const u = outward(L, x, z), v = across(L, x, z) - JV; return u > J0 && u < J1 && Math.abs(v) < JW; };
      const jt = new T.Group(); jt.position.set(jx, 0, jz); jt.rotation.y = face; g.add(jt);
      const deck = on(bx(jt, JW * 2 * L.r, 0.008, len, 0x8a6240, 0, deckY - 0.01, 0), 'jetty');
      for (let q = 0; q * 0.034 < len; q++) bx(jt, JW * 2 * L.r + 0.01, 0.01, 0.028, q % 2 ? 0xb98a5a : 0xa77a4c, 0, deckY, -len / 2 + 0.017 + q * 0.034);
      for (let q = 0; q <= 4; q++) { const zz = -len / 2 + 0.03 + q * (len - 0.06) / 4; [-1, 1].forEach(s => { const [wx, wz] = spot(J0 + (0.03 + q * (len - 0.06) / 4) / L.r, JV - s * JW), b = y + hRel(wx, wz); cyl(jt, 0.011, 0.011, deckY - b + 0.02, 0x5a3e28, s * (JW * L.r - 0.006), (deckY + b) / 2, zz, 7); }); }
      [-1, 1].forEach(s => cyl(jt, 0.014, 0.016, 0.05, 0x5a3e28, s * (JW * L.r - 0.01), deckY + 0.025, len / 2 - 0.02, 8));
      [-1, 1].forEach(s => stick(jt, [s * 0.025, deckY + 0.03, len / 2 + 0.005], [s * 0.025, sea - 0.08, len / 2 + 0.012], 0.004, 0xb0b4ba)); for (let q = 0; q < 4; q++) stick(jt, [-0.025, deckY - q * 0.035, len / 2 + 0.008], [0.025, deckY - q * 0.035, len / 2 + 0.008], 0.003, 0xb0b4ba);
      cyl(jt, 0.006, 0.006, 0.18, 0x3b2a24, -JW * L.r + 0.012, deckY + 0.09, len / 2 - 0.05, 6); glow(jt, 0.015, 0xffd36b, -JW * L.r + 0.012, deckY + 0.19, len / 2 - 0.05);
      const boat = new T.Group(); boat.position.set(JW * L.r + 0.09, sea, len / 2 - 0.12); jt.add(boat);
      { const hull = add(boat, new T.CylinderGeometry(0.06, 0.06, 0.26, 14, 1, false, 0, PI), mat(0xd9653b, { ds: true }), 0, 0.005, 0); hull.rotation.set(P2, 0, P2); hull.scale.set(1, 1, 0.55); bx(boat, 0.1, 0.008, 0.03, 0xf1e3c6, 0, 0.02, 0); stick(boat, [-0.05, 0.03, -0.05], [-0.12, -0.01, 0.06], 0.004, 0xc9a06a); stick(jt, [JW * L.r, deckY, len / 2 - 0.08], [JW * L.r + 0.05, sea + 0.02, len / 2 - 0.12], 0.002, 0xeadfc4); }
      fx.push(t => { boat.position.y = sea + Math.sin(t * 1.4) * 0.006; boat.rotation.z = Math.sin(t * 1.1) * 0.05; });
      const ja = Math.atan2(jz - L.cz, jx - L.cx), bed = [];
      ring(18, (a, i) => { if (Math.abs(Math.atan2(Math.sin(a - ja), Math.cos(a - ja))) < 0.4 || i % 4 === 3) return; const r0 = 0.88 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, b = y + hRel(x, z); for (let j = 0; j < 4; j++) { const xx = x + Math.cos(j * 2.1) * 0.025, zz = z + Math.sin(j * 2.1) * 0.025, hh = sea - b + 0.09 + (j % 3) * 0.03; cyl(g, 0.004, 0.005, hh, 0x6b8a3a, xx, b + hh / 2, zz, 4); if (j % 2) cyl(g, 0.009, 0.009, 0.04, 0x6b4a2a, xx, b + hh - 0.01, zz, 6); } });
      for (let i = 0; i < 12; i++) { const a = i * 0.83 + 0.3, r0 = (0.55 + (i % 3) * 0.1) * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0; if (onDeck(x, z)) continue; add(g, new T.CylinderGeometry(0.03, 0.03, 0.003, 9, 1, false, 0.4, PI * 1.8), mat(0x4caf50), x, sea + 0.003, z).userData.noInk = true; if (i % 4 === 0) sph(g, 0.012, 0xff9ec8, x, sea + 0.012, z, 1, 0.6, 1); }
      for (let i = 0; i < 900 && bed.length < 60; i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * 0.85 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0, b = y + hRel(x, z); if (sea - b > 0.06 && !onDeck(x, z)) bed.push([x, b, z]); }
      bed.slice(0, 6).forEach(([x, b, z], i) => add(g, rough(new T.DodecahedronGeometry(0.035 + (i % 3) * 0.015, 0), 0.01, seed + i), mat(0x6f7268, { flat: true }), x, b + 0.01, z));
      { const [x, b, z] = bed[6] || bed[0]; cyl(g, 0.025, 0.03, 0.26, 0x4a3a2a, x, b + 0.02, z, 8).rotation.set(0, 1.2, P2); }
      weed(fx, g, bed.slice(7, 40), 0x3a6a35, 0.12, seed + 9);
      school(fx, g, 6, L.cx + L.ox * 0.1, L.cz + L.oz * 0.1, 0.3, 0.24, (x, z) => { const b = y + hRel(x, z); return Math.min(sea - 0.03, b + (sea - b) * 0.45); }, 0xc9d4dc);
      zones.lake = { x: L.cx, z: L.cz, r: 0.8 * L.r, y: sea, water: true };
      zones.jetty = { x: jx, z: jz, r: len / 2, y: deckY + 0.005, not: (x, z) => !onDeck(x, z) };
      zones.lawn = zones.jetty;
      { const [px, pz] = spot(J1 - 0.05, JV); play = { at: [px, deckY + 0.005, pz], face: Math.atan2(L.ox, L.oz), sea, end: [px, pz], out: [px + L.ox, pz + L.oz], walk: onDeck, floor: (x, z) => (onDeck(x, z) ? deckY + 0.005 : y + hRel(x, z)) }; }
    }
    if (!play.walk) play.walk = (x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.85 * L.r && !(zones.lawn && zones.lawn.not && zones.lawn.not(x, z));
    return { L, zones, surf, play, tick: fx.length ? t => fx.forEach(f => f(t)) : null, terrain: { h: (x, z) => y + hRel(x, z), sea } };
  }

  /* ---------- The kid's character and island activities ----------
     The kid's character (their avatar's animal, in a scarf of their own colour) visits each island and does the thing
     that suits it: fishing off the jetty, surfing, photographing the geyser, weeding, show jumping, picking cherries,
     spotting birds, flying a kite, stacking hay, and kick-ups at home. Each success earns a little XP; the studio
     counts it against the day's limit. activity() returns { step(t, dt) → successes, end() }, where a success is
     { xp, say, icon, at: [x, y, z] }. u is the island's userData: its terrain and play spots (u.play). */
  const ACT = {
    lake: { name: 'Fishing', icon: '🎣', verb: 'Go fishing', noun: ['fish', 'fish'], about: '2 to 4 XP a fish' },
    beach: { name: 'Surfing', icon: '🏄', verb: 'Go surfing', noun: ['wave', 'waves'], about: '3 XP a wave' },
    lookout: { name: 'Geyser watch', icon: '📷', verb: 'Take photos', noun: ['photo', 'photos'], about: '2 XP a photo, 5 for an eruption' },
    plot: { name: 'Weeding', icon: '🌱', verb: 'Pull weeds', noun: ['weed', 'weeds'], about: '2 XP a weed' },
    stable: { name: 'Show jumping', icon: '🏇', verb: 'Ride the course', noun: ['round', 'rounds'], about: '4 XP a clear round' },
    orchard: { name: 'Cherry picking', icon: '🍒', verb: 'Pick cherries', noun: ['handful', 'handfuls'], about: '2 XP a handful' },
    grove: { name: 'Bird spotting', icon: '🔭', verb: 'Spot birds', noun: ['bird', 'birds'], about: '3 XP a bird' },
    sky: { name: 'Kite flying', icon: '🪁', verb: 'Fly a kite', noun: ['gust', 'gusts'], about: '2 XP a gust' },
    farm: { name: 'Hay stacking', icon: '🌾', verb: 'Stack hay', noun: ['bale', 'bales'], about: '2 XP a bale' },
    home: { name: 'Kick-ups', icon: '⚽', verb: 'Do kick-ups', noun: ['set of ten', 'sets of ten'], about: '3 XP for every ten' },
  };
  // Each avatar's animal: fur, belly and face colours, and its ears, snout, tail and extras.
  const SPECIES = {
    '🦊': { fur: 0xf08a3c, belly: 0xfff4e6, ear: 'point', earIn: 0x3b2a24, snout: 'long', nose: 0x2a1f1a, tail: 'bushy', tip: 0xfff4e6, feet: 0x3b2a24, limbs: 0x3b2a24 },
    '🐼': { fur: 0xf6f6f2, belly: 0xf6f6f2, ear: 'round', earC: 0x222222, patches: 0x222222, limbs: 0x222222, snout: 'short', nose: 0x222222, tail: 'stub' },
    '🐯': { fur: 0xf2913a, belly: 0xfff4e6, ear: 'round', stripes: 0x2a1f1a, snout: 'short', nose: 0xd96b7a, tail: 'long', tip: 0x2a1f1a, whiskers: true },
    '🦄': { fur: 0xfbf7ff, belly: 0xfbf7ff, ear: 'point', earIn: 0xf4c4d4, horn: true, mane: [0xff9ec8, 0xc4a6ff, 0x8fd0ff], snout: 'horse', nose: 0xf4c4d4, tail: 'mane', feet: 0xc9a8e8 },
    '🐸': { fur: 0x6cc24a, belly: 0xd6f0a8, frogEyes: true, snout: 'wide', feet: 0x5aa83a },
    '🐙': { octo: true, fur: 0xe8708f, belly: 0xf4a6c4 },
    '🦖': { fur: 0x5aa84a, belly: 0xd6e8a0, snout: 'rex', spikes: 0x3f7a35, tail: 'thick', tiny: true },
    '🐵': { fur: 0x8a5a3c, belly: 0xf0c8a0, face: 0xf0c8a0, ear: 'side', earIn: 0xf0c8a0, snout: 'muzzle', nose: 0x5a3a28, tail: 'curl' },
    '🐨': { fur: 0x9aa0a8, belly: 0xe8e8e8, ear: 'fluffy', earIn: 0xf2f2f2, bigNose: true },
    '🦁': { fur: 0xf2c25a, belly: 0xfff0c8, ear: 'round', mane: [0xc86a2a, 0xa8521f], snout: 'short', nose: 0x6b3a2a, tail: 'tuft', tip: 0xa8521f, whiskers: true },
    '🐧': { fur: 0x2a2f3a, belly: 0xfafafa, face: 0xfafafa, beak: 0xffa53a, feet: 0xffa53a, flippers: true },
    '🐰': { fur: 0xf2efea, belly: 0xffffff, ear: 'long', earIn: 0xffb6c8, snout: 'short', nose: 0xff8fa8, tail: 'puff', whiskers: true },
    '🐶': { fur: 0xd8a868, belly: 0xfff0d8, ear: 'floppy', earC: 0x8a5a3c, snout: 'muzzle', nose: 0x2a1f1a, tail: 'long' },
    '🐱': { fur: 0xf2b45a, belly: 0xfff0d8, ear: 'point', earIn: 0xffb6c8, stripes: 0xd8903a, snout: 'short', nose: 0xff8fa8, tail: 'long', whiskers: true },
    '🐲': { fur: 0x4caf50, belly: 0xf2e08a, horns: 0xf6e7c0, snout: 'dragon', nose: 0x2f7a35, wings: 0x2f8a40, spikes: 0xf2a33a, tail: 'spade' },
    '🦉': { fur: 0x8a6a4a, belly: 0xe8d4b0, face: 0xe8d4b0, owlEyes: true, beak: 0xf2a33a, ear: 'tuft', flippers: true, feet: 0xf2a33a },
  };
  // The kid's character: their avatar's animal standing on two legs, with a scarf in their own colour. Legs and arms
  // are on pivots (P) so activities can pose them, and a paw (P.hand) holds things.
  function kidModel(hue, avatar) {
    const S = SPECIES[avatar] || SPECIES['🐶'], k = new T.Group(), P = {}, fur = S.fur, limb = S.limbs || fur, cone = (g, r, h, c, x, y, z, rx = 0, rz = 0) => { const o = cn(g, r, h, c, x, y, z, 8); o.rotation.set(rx, 0, rz); return o; };
    // Legs (an octopus has two walking tentacles, and six more round its base).
    const leg = x => { const p = new T.Group(); p.position.set(x, 0.085, 0); k.add(p); if (S.octo) { cyl(p, 0.009, 0.015, 0.085, fur, 0, -0.042, 0, 8); sph(p, 0.01, S.belly, 0, -0.085, 0.01); } else { cyl(p, 0.016, 0.017, 0.06, limb, 0, -0.032, 0, 8); sph(p, 0.019, S.feet || limb, 0, -0.068, 0.008, 1, 0.65, 1.35); } return p; };
    P.legL = leg(-0.024); P.legR = leg(0.024);
    if (S.octo) for (let i = 0; i < 6; i++) { const a = PI * 0.2 + i / 5 * PI * 1.6, t = cyl(k, 0.007, 0.013, 0.09, fur, Math.cos(a) * 0.035, 0.04, Math.sin(a) * -0.035 - 0.005, 7); t.rotation.set(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7); }
    P.body = new T.Group(); P.body.position.y = 0.085; k.add(P.body);
    sph(P.body, 0.046, fur, 0, 0.04, 0, 1, S.octo ? 0.8 : 1.12, 0.95);
    if (!S.octo) sph(P.body, 0.033, S.belly, 0, 0.038, 0.024, 0.9, 1.1, 0.5);
    tor(P.body, 0.032, 0.009, new T.Color(hue || '#e5533d').getHex(), 0, 0.088, 0).rotation.x = P2;
    if (S.patches) sph(P.body, 0.047, S.patches, 0, 0.07, -0.004, 1.02, 0.45, 0.98);
    if (S.stripes) for (let i = 0; i < 3; i++) bx(P.body, 0.07, 0.006, 0.012, S.stripes, 0, 0.02 + i * 0.022, -0.04).rotation.y = 0.1 * (i - 1);
    if (S.spikes) for (let i = 0; i < 4; i++) cone(P.body, 0.009, 0.022, S.spikes, 0, 0.085 - i * 0.022, -0.04 - i * 0.004, -0.6);
    if (S.wings) [-1, 1].forEach(s => { const w = sph(P.body, 0.03, S.wings, s * 0.035, 0.07, -0.04, 0.25, 1, 1.4); w.rotation.set(0.4, 0, s * -0.5); });
    // Arms (flippers and wings for the penguin and owl, little arms for the dinosaur, tentacles for the octopus).
    const arm = x => { const p = new T.Group(); p.position.set(x, 0.075, 0); P.body.add(p); const sc = S.tiny ? 0.6 : 1; if (S.flippers) sph(p, 0.02, fur, 0, -0.035, 0, 0.45, 1.8, 0.9); else { cyl(p, S.octo ? 0.007 : 0.011, S.octo ? 0.01 : 0.012, 0.055 * sc, limb, 0, -0.028 * sc, 0, 8); sph(p, 0.013, S.octo ? S.belly : S.limbs || fur, 0, -0.058 * sc, 0); } return p; };
    P.armL = arm(-0.046); P.armR = arm(0.046);
    P.hand = new T.Group(); P.hand.position.y = -0.065; P.armR.add(P.hand);
    P.handL = new T.Group(); P.handL.position.y = -0.065; P.armL.add(P.handL);
    // The head: big and round, with the animal's face.
    const h = new T.Group(); h.position.y = 0.145; P.body.add(h); P.head = h;
    if (S.octo) sph(h, 0.07, fur, 0, 0.02, -0.005, 1, 1.25, 1); else sph(h, 0.058, fur, 0, 0, 0);
    if (S.face) sph(h, 0.046, S.face, 0, -0.006, 0.026, 1, 0.92, 0.65);
    if (S.patches) [-1, 1].forEach(s => { const p2 = sph(h, 0.017, S.patches, s * 0.022, 0.004, 0.048, 1, 1.3, 0.5); p2.rotation.z = s * 0.5; });
    const eyeY = S.octo ? 0.005 : 0.008, eyeZ = S.octo ? 0.064 : 0.054;
    if (S.owlEyes) [-1, 1].forEach(s => { sph(h, 0.019, 0xf2c94c, s * 0.022, 0.006, 0.048, 1, 1, 0.5); sph(h, 0.01, 0x111111, s * 0.022, 0.006, 0.057); sph(h, 0.003, 0xffffff, s * 0.019, 0.01, 0.062); });
    else if (S.frogEyes) [-1, 1].forEach(s => { sph(h, 0.02, fur, s * 0.026, 0.045, 0.018); sph(h, 0.011, 0x111111, s * 0.026, 0.05, 0.034); sph(h, 0.003, 0xffffff, s * 0.023, 0.055, 0.044); });
    else [-1, 1].forEach(s => { sph(h, 0.009, 0x111111, s * 0.022, eyeY, eyeZ); sph(h, 0.003, 0xffffff, s * 0.019, eyeY + 0.004, eyeZ + 0.007); });
    // Ears
    const E = S.ear;
    if (E === 'point') [-1, 1].forEach(s => { cone(h, 0.018, 0.04, fur, s * 0.033, 0.05, -0.004, 0, -s * 0.35); cone(h, 0.009, 0.024, S.earIn || S.belly, s * 0.033, 0.047, 0.004, 0, -s * 0.35); });
    if (E === 'round') [-1, 1].forEach(s => { sph(h, 0.018, S.earC || fur, s * 0.042, 0.042, -0.004, 1, 1, 0.55); if (!S.earC) sph(h, 0.01, S.belly, s * 0.042, 0.042, 0.004, 1, 1, 0.4); });
    if (E === 'long') [-1, 1].forEach(s => { const e = sph(h, 0.014, fur, s * 0.02, 0.09, -0.006, 1, 3, 0.6); e.rotation.z = -s * 0.15; const i2 = sph(h, 0.008, S.earIn, s * 0.02, 0.09, 0.001, 1, 2.6, 0.4); i2.rotation.z = -s * 0.15; });
    if (E === 'floppy') [-1, 1].forEach(s => { const e = sph(h, 0.019, S.earC, s * 0.056, -0.004, -0.004, 0.55, 1.6, 1); e.rotation.z = s * 0.25; });
    if (E === 'side') [-1, 1].forEach(s => { sph(h, 0.018, fur, s * 0.058, 0.006, 0, 0.5, 1, 1); sph(h, 0.011, S.earIn, s * 0.062, 0.006, 0, 0.4, 1, 1); });
    if (E === 'fluffy') [-1, 1].forEach(s => { sph(h, 0.027, fur, s * 0.05, 0.036, -0.006, 1, 1, 0.6); sph(h, 0.017, S.earIn, s * 0.052, 0.036, 0.004, 1, 1, 0.4); });
    if (E === 'tuft') [-1, 1].forEach(s => cone(h, 0.012, 0.03, fur, s * 0.034, 0.055, 0, 0, -s * 0.5));
    // Snout, nose and mouth
    const N = S.snout;
    if (N === 'long') { cone(h, 0.022, 0.05, S.belly, 0, -0.014, 0.068, P2); sph(h, 0.008, S.nose, 0, -0.014, 0.094); }
    if (N === 'short') { sph(h, 0.021, S.belly, 0, -0.018, 0.048, 1.2, 0.85, 0.8); sph(h, 0.007, S.nose, 0, -0.008, 0.064); }
    if (N === 'muzzle') { sph(h, 0.026, S.belly, 0, -0.018, 0.048, 1.1, 0.85, 0.85); sph(h, 0.009, S.nose, 0, -0.006, 0.07); }
    if (N === 'horse') { sph(h, 0.028, S.nose, 0, -0.022, 0.05, 1, 0.85, 1.25); [-1, 1].forEach(s => sph(h, 0.004, 0x8a5a7a, s * 0.011, -0.018, 0.084)); }
    if (N === 'wide') { const m2 = tor(h, 0.03, 0.003, 0x2a4a1f, 0, -0.012, 0.045, PI); m2.rotation.set(0, 0, PI); }
    if (N === 'rex') { sph(h, 0.034, fur, 0, -0.016, 0.05, 1, 0.75, 1.4); sph(h, 0.03, S.belly, 0, -0.032, 0.052, 0.95, 0.4, 1.3); for (let i = 0; i < 4; i++) cone(h, 0.004, 0.01, 0xffffff, -0.018 + i * 0.012, -0.026, 0.085, PI); }
    if (N === 'dragon') { sph(h, 0.03, fur, 0, -0.014, 0.05, 1, 0.8, 1.35); [-1, 1].forEach(s => sph(h, 0.005, S.nose, s * 0.01, -0.006, 0.09)); }
    if (S.beak) cone(h, 0.012, 0.026, S.beak, 0, -0.012, 0.064, P2);
    if (S.bigNose) sph(h, 0.017, 0x2a2a2a, 0, -0.008, 0.056, 1, 1.35, 0.8);
    if (S.whiskers) [-1, 1].forEach(s => [0, 1].forEach(j => stick(h, [s * 0.016, -0.016 - j * 0.006, 0.062], [s * 0.05, -0.012 - j * 0.012, 0.06], 0.0012, 0x333333)));
    if (S.stripes) for (let i = 0; i < 3; i++) bx(h, 0.006, 0.026, 0.03, S.stripes, -0.014 + i * 0.014, 0.05, 0.004).rotation.x = -0.4;
    // Horns, manes and tails
    if (S.horn) { const hn = cone(h, 0.008, 0.05, 0xffd43b, 0, 0.068, 0.028, 0.45); hn.userData.gold = true; }
    if (S.horns) [-1, 1].forEach(s => cone(h, 0.007, 0.034, S.horns, s * 0.026, 0.056, -0.012, -0.6, -s * 0.3));
    if (S.mane && S.horn) for (let i = 0; i < 6; i++) sph(h, 0.014, S.mane[i % 3], 0, 0.05 - i * 0.016, -0.045 - (i % 2) * 0.004);
    else if (S.mane) for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; sph(h, 0.022, S.mane[i % 2], Math.cos(a) * 0.058, Math.sin(a) * 0.058, -0.016); }
    const tl = new T.Group(); tl.position.set(0, 0.03, -0.045); P.body.add(tl);
    if (S.tail === 'bushy') { const t2 = sph(tl, 0.026, fur, 0, 0.01, -0.03, 0.8, 0.8, 1.6); t2.rotation.x = -0.6; sph(tl, 0.016, S.tip, 0, 0.035, -0.06); }
    if (S.tail === 'stub') sph(tl, 0.014, fur, 0, 0, -0.004);
    if (S.tail === 'puff') sph(tl, 0.017, 0xffffff, 0, 0, -0.006);
    if (S.tail === 'long' || S.tail === 'tuft') { stick(tl, [0, 0, 0], [0, 0.02, -0.05], 0.006, fur); stick(tl, [0, 0.02, -0.05], [0, 0.07, -0.065], 0.005, fur); sph(tl, S.tail === 'tuft' ? 0.012 : 0.006, S.tip || fur, 0, 0.072, -0.066); }
    if (S.tail === 'curl') { const c2 = tor(tl, 0.025, 0.005, fur, 0, 0.02, -0.035, PI * 1.5); c2.rotation.y = P2; }
    if (S.tail === 'mane') S.mane.forEach((c3, i) => { const t3 = sph(tl, 0.012, c3, (i - 1) * 0.008, -0.01, -0.03, 1, 0.8, 2.6); t3.rotation.x = 0.7; });
    if (S.tail === 'thick' || S.tail === 'spade') { cone(tl, 0.026, 0.1, fur, 0, -0.03, -0.045, -1.9); if (S.tail === 'spade') add(tl, new T.OctahedronGeometry(0.016, 0), mat(S.spikes, { flat: true }), 0, -0.055, -0.095).scale.set(1, 0.4, 1); }
    k.userData.P = P; k.rotation.order = 'YXZ'; return k;
  }
  // Smooth posing: behaviours and activities set the pose they want (joints, lean, turn, and height above the ground);
  // what's shown eases towards it, so sitting, lying, standing up and turning blend instead of snapping. before() puts
  // the wanted pose back so steps carry on from it; after() eases what's shown and, standing, lifts or lowers each hip
  // so its foot meets the ground under it. sync() takes what's been set directly as the new wanted pose.
  function poser(m, floor) {
    const P = m.userData.P, J = ['legL', 'legR', 'armL', 'armR', 'body', 'head'], want = {}, show = {};
    const read = o => { J.forEach(n => { o[n] = [P[n].rotation.x, P[n].rotation.y, P[n].rotation.z]; }); o.by = P.body.position.y; o.rx = m.rotation.x; o.rz = m.rotation.z; o.ry = m.rotation.y; o.off = m.position.y - floor(m.position.x, m.position.z); };
    const draw = () => { J.forEach(n => P[n].rotation.set(...show[n])); P.body.position.y = show.by; m.rotation.set(show.rx, show.ry, show.rz); };
    read(want); read(show);
    return {
      before(noY) { J.forEach(n => P[n].rotation.set(...want[n])); P.body.position.y = want.by; m.rotation.set(want.rx, want.ry, want.rz); if (!noY) m.position.y = floor(m.position.x, m.position.z) + want.off; },
      after(dt, noY) {
        read(want);
        const a = 1 - Math.exp(-dt * 14), b = 1 - Math.exp(-dt * 6), c = 1 - Math.exp(-dt * 9);
        J.forEach(n => { const sh = show[n], w = want[n]; for (let i = 0; i < 3; i++) sh[i] += (w[i] - sh[i]) * a; });
        show.by += (want.by - show.by) * a; show.rx += (want.rx - show.rx) * b; show.rz += (want.rz - show.rz) * b;
        show.ry += Math.atan2(Math.sin(want.ry - show.ry), Math.cos(want.ry - show.ry)) * c; draw();
        if (!noY) { show.off += (want.off - show.off) * c; m.position.y = floor(m.position.x, m.position.z) + show.off; }
        const up = !noY && Math.abs(show.rx) < 0.2 && Math.abs(show.off) < 0.012, g0 = floor(m.position.x, m.position.z), cy = Math.cos(show.ry), sy = Math.sin(show.ry);
        ['legL', 'legR'].forEach((n, i) => { const sx = (i ? 0.024 : -0.024) * m.scale.x, d = up ? Math.max(-0.025, Math.min(0.025, floor(m.position.x + sx * cy, m.position.z - sx * sy) - g0)) / m.scale.y : 0; P[n].position.y += (0.085 + d - P[n].position.y) * a; });
      },
      sync(all) { read(want); if (all) read(show); else draw(); },
    };
  }
  // A thought bubble with a picture of what the character's about to do.
  const THOUGHT = {};
  function thoughtTex(e) {
    if (THOUGHT[e]) return THOUGHT[e];
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), blob = (cx, cy, r, line) => { x.beginPath(); x.arc(cx, cy, r, 0, PI * 2); x.fill(); if (line) x.stroke(); };
    const cloud = [[64, 54, 34], [38, 60, 24], [90, 60, 24], [50, 36, 22], [78, 36, 22]];
    x.fillStyle = '#fff'; x.strokeStyle = 'rgba(40,50,80,0.4)'; x.lineWidth = 5;
    blob(22, 116, 7, true); blob(36, 100, 10, true); cloud.forEach(([a, b, r]) => blob(a, b, r, true)); cloud.forEach(([a, b, r]) => blob(a, b, r - 2.5));
    x.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 52);
    const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding; return (THOUGHT[e] = t);
  }
  const still = P => { ['legL', 'legR', 'armL', 'armR', 'body'].forEach(n => P[n].rotation.set(0, 0, 0)); P.body.position.y = 0.085; };
  const walking = (P, t, on) => { const s = on ? Math.sin(t * 11) * 0.55 : 0; P.legL.rotation.x = s; P.legR.rotation.x = -s; P.armL.rotation.x = -s * 0.8; P.armR.rotation.x = s * 0.8; };
  // Walks the kid towards (x, z) over the ground; true once there.
  function walkTo(m, u, x, z, dt, sp = 0.2) { const dx = x - m.position.x, dz = z - m.position.z, d = Math.hypot(dx, dz); if (d < 0.012) return true; const s = Math.min(d, sp * dt); m.position.x += dx / d * s; m.position.z += dz / d * s; m.rotation.y = Math.atan2(dx, dz); m.position.y = u.terrain.h(m.position.x, m.position.z); return false; }
  const ease = q => q * q * (3 - 2 * q), V = new T.Vector3();
  // A thin line between two points (fishing line, kite string), updated every frame.
  function line(g, c = 0xf4f1ea) { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)); const l = new T.Line(geo, new T.LineBasicMaterial({ color: c })); l.userData.noInk = true; l.userData.ownMat = true; l.frustumCulled = false; g.add(l); return (a, b) => { const p = geo.attributes.position; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true; }; }
  // Where an object is, in the island's own coordinates.
  const local = (g, o) => g.worldToLocal(o.getWorldPosition(new T.Vector3()));
  function ripple(g, fx, x, y, z) { const r = add(g, new T.RingGeometry(0.02, 0.03, 18).rotateX(-P2), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false }), x, y + 0.003, z); r.userData.noInk = true; r.userData.ownMat = true; fx.push({ m: r, t: 0 }); }
  function activity(g, key, o) {
    const u = g.userData, pl = u.play || {}, m = o.kid, P = m.userData.P, rr = K.mulberry(Date.now() % 9973), props = new T.Group(), rings = [], out = [];
    g.add(props); const st = { phase: 'go', t: 0, n: 0 }, h = (x, z) => u.terrain.h(x, z), say = (xp, s, icon, at) => out.push({ xp, say: s, icon, at: at || [m.position.x, m.position.y + 0.26, m.position.z] });
    const phase = p => { st.phase = p; st.t = 0; }, held = [];
    const hold = (obj, hand = P.hand) => { hand.add(obj); held.push(obj); return obj; };
    const pose = poser(m, (x, z) => u.terrain.h(x, z));
    let step;
    still(P);
    if (key === 'lake') {
      // Fishing: cast, wait for a bite while the float bobs, strike, and reel the fish up out of the water.
      const rod = hold(new T.Group()); rod.rotation.x = -1.1; cyl(rod, 0.003, 0.005, 0.28, 0x6b4a2e, 0, 0.12, 0, 6); const tip = new T.Object3D(); tip.position.y = 0.26; rod.add(tip);
      const bob = new T.Group(); props.add(bob); sph(bob, 0.011, 0xe03131, 0, 0, 0); sph(bob, 0.007, 0xffffff, 0, 0.008, 0);
      const fish = new T.Group(); props.add(fish); sph(fish, 0.02, 0x8a9a7a, 0, 0, 0, 0.6, 0.7, 1.5); cn(fish, 0.016, 0.03, 0x8a9a7a, 0, 0, -0.035, 4).rotation.x = P2; fish.visible = false;
      cyl(props, 0.03, 0.026, 0.05, 0x5b7a9a, pl.at[0] + Math.cos(pl.face) * 0.06, pl.at[1] + 0.025, pl.at[2] - Math.sin(pl.face) * 0.06, 12);
      const string = line(props), FISH = [['brown trout', 4], ['rainbow trout', 4], ['perch', 3], ['eel', 3], ['kōaro', 2], ['bully', 2]];
      let target = null, wait = 0, catchOf = null;
      m.position.set(...pl.at); m.rotation.y = pl.face;
      step = (t, dt) => {
        const tp = local(g, tip);
        if (st.phase === 'go' || st.phase === 'cast') {
          if (st.phase === 'go') { target = [pl.at[0] + Math.sin(pl.face) * (0.22 + rr() * 0.14) + Math.cos(pl.face) * (rr() - 0.5) * 0.2, pl.sea, pl.at[2] + Math.cos(pl.face) * (0.22 + rr() * 0.14) - Math.sin(pl.face) * (rr() - 0.5) * 0.2]; phase('cast'); }
          const q = Math.min(1, st.t / 1); P.armR.rotation.x = q < 0.4 ? -0.3 - q * 1.5 : -0.9 + (q - 0.4) * 0.3; rod.rotation.x = -1.1 + (q < 0.4 ? 0.6 : 0);
          const e = ease(Math.max(0, (q - 0.4) / 0.6)); bob.position.set(tp.x + (target[0] - tp.x) * e, tp.y + (target[1] - tp.y) * e + Math.sin(Math.PI * e) * 0.12, tp.z + (target[2] - tp.z) * e);
          if (q >= 1) { ripple(props, rings, ...target); wait = 2.5 + rr() * 4; phase('wait'); }
        } else if (st.phase === 'wait') { bob.position.set(target[0], pl.sea + 0.004 + Math.sin(t * 3) * 0.003, target[2]); P.armR.rotation.x = -0.82 + Math.sin(t * 1.3) * 0.03; if (st.t > wait) { ripple(props, rings, ...target); catchOf = FISH[Math.floor(rr() * FISH.length)]; phase('bite'); } }
        else if (st.phase === 'bite') { bob.position.y = pl.sea - 0.012 * Math.abs(Math.sin(st.t * 18)); if (st.t > 0.6) phase('reel'); }
        else if (st.phase === 'reel') {
          const q = Math.min(1, st.t / 1.2); P.armR.rotation.x = -0.82 - q * 0.9; fish.visible = true;
          fish.position.set(target[0] + (tp.x - target[0]) * q * 0.85, pl.sea + (tp.y - 0.06 - pl.sea) * q, target[2] + (tp.z - target[2]) * q * 0.85); fish.rotation.set(-1.2, pl.face, Math.sin(t * 20) * 0.5); bob.position.copy(fish.position).y += 0.03;
          if (q >= 1) { say(catchOf[1], `${/^[aeiou]/.test(catchOf[0]) ? 'An' : 'A'} ${catchOf[0]}!`, '🐟'); fish.visible = false; phase('go'); }
        }
        string(tp, bob.position);
      };
    } else if (key === 'beach') {
      // Surfing: paddle out lying on the board, turn and wait, then stand and ride a wave back in.
      const board = new T.Group(); props.add(board); sph(board, 0.03, 0xffd43b, 0, 0, 0, 0.9, 0.22, 3.2); bx(board, 0.008, 0.004, 0.17, 0xe03131, 0, 0.005, 0);
      let lane = (rr() - 0.5) * 0.6, from = toWorld(pl.L, 0.18, lane), to = toWorld(pl.L, 0.78, lane + (rr() - 0.5) * 0.2);
      const along = (q, a, b) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
      { const [sx, sz] = toWorld(pl.L, 0.02, lane); m.position.set(sx, h(sx, sz), sz); m.rotation.y = Math.atan2(from[0] - sx, from[1] - sz); st.phase = 'paddle'; }
      step = (t, dt) => {
        if (st.phase === 'go') { lane = (rr() - 0.5) * 0.6; from = toWorld(pl.L, 0.18, lane); to = toWorld(pl.L, 0.78, lane + (rr() - 0.5) * 0.2); phase('paddle'); }
        const bobY = pl.sea + 0.004 + Math.sin(t * 2.4) * 0.004;
        if (st.phase === 'paddle') {
          const q = Math.min(1, st.t / 3.2), [x, z] = along(ease(q), from, to); board.position.set(x, bobY, z); board.rotation.set(0, Math.atan2(to[0] - from[0], to[1] - from[1]), 0);
          m.position.set(x, bobY + 0.012, z); m.rotation.set(P2 * 0.95, board.rotation.y, 0); P.body.rotation.x = 0; P.armL.rotation.x = -1.6 + Math.sin(t * 7) * 0.9; P.armR.rotation.x = -1.6 - Math.sin(t * 7) * 0.9; P.legL.rotation.x = P.legR.rotation.x = 0;
          if (q >= 1) phase('turn');
        } else if (st.phase === 'turn') {
          const q = Math.min(1, st.t / 1.4); board.position.y = bobY; board.rotation.y = Math.atan2(to[0] - from[0], to[1] - from[1]) + Math.PI * ease(q); m.position.set(board.position.x, bobY + 0.02, board.position.z); m.rotation.set(0, board.rotation.y, 0); still(P); P.legL.rotation.x = P.legR.rotation.x = -1.4;
          if (q >= 1) phase('ride');
        } else if (st.phase === 'ride') {
          const q = Math.min(1, st.t / 2.8), [x, z] = along(ease(q), to, from), swell = Math.sin(Math.PI * Math.min(1, q * 1.2)) * 0.03;
          board.position.set(x + Math.sin(q * 9) * 0.03, pl.sea + 0.006 + swell, z); board.rotation.set(0, Math.atan2(from[0] - to[0], from[1] - to[1]), Math.sin(q * 9) * 0.25);
          m.position.set(board.position.x, board.position.y + 0.01, board.position.z); m.rotation.set(0, board.rotation.y + P2 * 0.8, board.rotation.z * 0.5); still(P); P.body.position.y = 0.075; P.legL.rotation.z = 0.35; P.legR.rotation.z = -0.35; P.armL.rotation.z = 1.2; P.armR.rotation.z = -1.2;
          if (q >= 1) { say(3, 'Rode a wave!', '🌊'); phase('go'); }
        }
      };
    } else if (key === 'lookout') {
      // Geyser watch: camera up for the hot spring now and then, and always for an eruption.
      const cam = hold(new T.Group()); bx(cam, 0.04, 0.026, 0.02, 0x2a2f3a, 0, 0, 0.012); cyl(cam, 0.008, 0.008, 0.012, 0x111111, 0, 0, 0.026, 8).rotation.x = P2;
      const flash = glow(props, 0.03, 0xffffff, 0, 0, 0); flash.visible = false;
      m.position.set(...pl.at); m.rotation.y = Math.atan2(pl.geyser[0] - pl.at[0], pl.geyser[2] - pl.at[2]); let next = 2 + rr() * 3, shot = -1, up = 0;
      step = (t, dt) => {
        const c = t % pl.cycle, erupting = c > 1.6 && c < pl.erupt - 1, cyc = Math.floor(t / pl.cycle);
        const want = erupting || st.t > next - 0.6; up += ((want ? 1 : 0) - up) * Math.min(1, dt * 6); P.armR.rotation.x = -1.5 * up; P.armL.rotation.x = -1.4 * up; P.armL.rotation.z = -0.4 * up;
        const snap = s => { const p = local(g, cam); flash.position.copy(p); flash.visible = true; setTimeout(() => { flash.visible = false; }, 120); say(...s); };
        if (erupting && shot !== cyc && c > 3) { shot = cyc; snap([5, 'Eruption! What a shot', '📸']); st.t = 0; next = 3 + rr() * 3; }
        else if (!erupting && st.t > next) { snap([2, ['Snap! The rainbow spring', 'Snap! Steam rising', 'Snap! The terraces'][Math.floor(rr() * 3)], '📷']); st.t = 0; next = 4 + rr() * 4; }
      };
    } else if (key === 'plot') {
      // Weeding: weeds sprout in the beds; walk to one, crouch and pull it out.
      const weeds = [], sprout = () => { const [x, z] = pl.spots[Math.floor(rr() * pl.spots.length)], w = new T.Group(); w.position.set(x, h(x, z), z); props.add(w); for (let j = 0; j < 5; j++) add(w, new T.ConeGeometry(0.01, 0.07, 4), mat(0x3d6b21), (j - 2) * 0.01, 0.035, (j % 2) * 0.01).rotation.z = (j - 2) * 0.28; sph(w, 0.011, 0xffd43b, 0, 0.07, 0); w.scale.setScalar(0.01); w.userData.grow = 0; weeds.push(w); };
      for (let i = 0; i < 3; i++) sprout(); m.position.set(pl.start[0], h(...pl.start), pl.start[1]); let tgt = null;
      step = (t, dt) => {
        weeds.forEach(w => { if (w.userData.grow < 1) { w.userData.grow = Math.min(1, w.userData.grow + dt * 1.5); w.scale.setScalar(ease(w.userData.grow)); } });
        if (st.phase === 'go') { tgt = weeds.reduce((a, w) => (!a || Math.hypot(w.position.x - m.position.x, w.position.z - m.position.z) < Math.hypot(a.position.x - m.position.x, a.position.z - m.position.z) ? w : a), null); phase('walk'); }
        if (st.phase === 'walk') { still(P); const there = walkTo(m, u, tgt.position.x - 0.04, tgt.position.z - 0.04, dt); walking(P, t, !there); if (there) { m.rotation.y = Math.atan2(tgt.position.x - m.position.x, tgt.position.z - m.position.z); phase('pull'); } }
        else if (st.phase === 'pull') {
          const q = Math.min(1, st.t / 1.1), c2 = Math.sin(Math.PI * Math.min(1, q * 1.4)); P.body.rotation.x = 0.7 * c2; P.legL.rotation.x = P.legR.rotation.x = -0.5 * c2; P.body.position.y = 0.085 - 0.02 * c2; P.armR.rotation.x = P.armL.rotation.x = -0.9 * c2;
          if (q > 0.6) { tgt.position.y += dt * 0.15; tgt.scale.multiplyScalar(1 - dt * 3); }
          if (q >= 1) { props.remove(tgt); weeds.splice(weeds.indexOf(tgt), 1); sprout(); still(P); say(2, 'Weed pulled', '🌱'); phase('go'); }
        }
      };
    } else if (key === 'stable') {
      // Show jumping: canter round the arena on a horse, clearing the jumps; a clear round each lap.
      const hz = new T.Group(); hz.rotation.order = 'YXZ'; props.add(hz); K.horse(hz, 0x8a5a3c, 0x3b2a1e); hz.scale.setScalar(1.15); hz.add(m); m.position.set(0, 0.2, -0.01); m.rotation.set(0, 0, 0);
      P.legL.rotation.set(-1.3, 0, 0.5); P.legR.rotation.set(-1.3, 0, -0.5); P.armL.rotation.x = P.armR.rotation.x = -0.9; let s = 0;
      const lap = pl.lap, n = lap.length, at = q => { const f = (q % 1) * n, i = Math.floor(f), a = lap[i], b = lap[(i + 1) % n], w = f - i; return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w]; };
      step = (t, dt) => {
        const s0 = s; s += dt * 0.06; const [x, z] = at(s), [x2, z2] = at(s + 0.004); let jump = 0;
        pl.jumps.forEach(j => { const d = ((s % 1) - j + 1) % 1; if (d < 0.05) jump = Math.sin(Math.PI * d / 0.05); });
        hz.position.set(x, pl.y + Math.abs(Math.sin(t * 9)) * 0.012 + jump * 0.1, z); hz.rotation.set(-jump * 0.25, Math.atan2(x2 - x, z2 - z), 0);
        if (Math.floor(s) > Math.floor(s0)) say(4, 'Clear round!', '🏆', [x, pl.y + 0.45, z]);
      };
      const end0 = () => { const p = hz.position; hz.remove(m); g.add(m); m.position.set(p.x + 0.08, h(p.x + 0.08, p.z), p.z); m.rotation.set(0, hz.rotation.y, 0); still(P); };
      o.onEnd = end0;
    } else if (key === 'orchard') {
      // Cherry picking: walk tree to tree with a basket, reach up and pick a handful into it.
      const basket = hold(new T.Group(), P.handL); cyl(basket, 0.026, 0.02, 0.03, 0xc9a06a, 0, -0.02, 0, 12); const fruit = []; let ti = 0, berry = null;
      m.position.set(pl.trees[0][0] + 0.15, h(pl.trees[0][0] + 0.15, pl.trees[0][1]), pl.trees[0][1]);
      step = (t, dt) => {
        const [tx, tz] = pl.trees[ti % pl.trees.length];
        if (st.phase === 'go') { const there = walkTo(m, u, tx + 0.13, tz + 0.05, dt); walking(P, t, !there); if (there) { still(P); m.rotation.y = Math.atan2(tx - m.position.x, tz - m.position.z); phase('reach'); } }
        else if (st.phase === 'reach') {
          const q = Math.min(1, st.t / 1.3), up = Math.sin(Math.PI * Math.min(1, q * 1.3)); P.armR.rotation.x = -2.7 * up;
          if (q > 0.35 && !berry) { berry = new T.Group(); sph(berry, 0.012, 0xc81e3a, -0.008, 0, 0); sph(berry, 0.012, 0xc81e3a, 0.008, 0, 0); hold(berry); }
          if (q >= 1) { if (berry) { P.hand.remove(berry); berry.position.set(fruit.length % 3 * 0.01 - 0.01, -0.004 + Math.floor(fruit.length / 3) * 0.006, 0); basket.add(berry); fruit.push(berry); if (fruit.length > 6) basket.remove(fruit.shift()); berry = null; } say(2, 'A handful of cherries', '🍒'); ti++; phase('go'); }
        }
      };
    } else if (key === 'grove') {
      // Bird spotting: binoculars up, scanning the treetops; native birds fly in and land, and each one seen counts.
      const bino = hold(new T.Group()); [-1, 1].forEach(sx => cyl(bino, 0.008, 0.009, 0.03, 0x2a2f3a, sx * 0.011, 0, 0.01, 8).rotation.x = P2);
      const BIRDS = [['tūī', 0x1f3a4a], ['pīwakawaka', 0x8a6a4a], ['kererū', 0x3f8a5a], ['korimako', 0x7a8a3a], ['kākā', 0x8a4a2a]];
      const bird = new T.Group(); props.add(bird); const body = sph(bird, 0.018, 0x1f3a4a, 0, 0, 0, 0.8, 0.8, 1.3); sph(bird, 0.012, 0x1f3a4a, 0, 0.012, 0.018); const wings = [-1, 1].map(sx => { const w = bx(bird, 0.04, 0.004, 0.02, 0x1f3a4a, sx * 0.02, 0.004, 0); return w; }); bird.visible = false;
      m.position.set(pl.at[0], h(pl.at[0], pl.at[2]), pl.at[2]); let perch, from, kind, yaw = m.rotation.y;
      step = (t, dt) => {
        P.armR.rotation.x = P.armL.rotation.x = -1.55; P.armL.rotation.z = -0.35;
        if (st.phase === 'go') { perch = pl.perches[Math.floor(rr() * pl.perches.length)]; kind = BIRDS[Math.floor(rr() * BIRDS.length)]; [body, ...bird.children].forEach(c => { if (c.material && c.material.color) c.material = mat(kind[1]); }); from = [perch[0] + (rr() - 0.5) * 1.6, perch[1] + 0.5, perch[2] + (rr() - 0.5) * 1.6]; bird.visible = true; phase('fly'); }
        if (st.phase === 'fly' || st.phase === 'away') {
          const q = Math.min(1, st.t / 1.6), a = st.phase === 'fly' ? from : perch, b = st.phase === 'fly' ? perch : from;
          bird.position.set(a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q + Math.sin(Math.PI * q) * 0.1, a[2] + (b[2] - a[2]) * q); bird.rotation.y = Math.atan2(b[0] - a[0], b[2] - a[2]); wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * Math.sin(t * 30) * 0.8; });
          if (q >= 1) { if (st.phase === 'fly') phase('sit'); else { bird.visible = false; phase('go'); } }
        } else if (st.phase === 'sit') { wings.forEach(w => { w.rotation.z = 0; }); if (st.t > 1.8) { say(3, `Spotted a ${kind[0]}!`, '🐦', [perch[0], perch[1] + 0.08, perch[2]]); phase('away'); } }
        const want = bird.visible ? Math.atan2(bird.position.x - m.position.x, bird.position.z - m.position.z) : yaw + Math.sin(t * 0.4) * 0.6; m.rotation.y += Math.atan2(Math.sin(want - m.rotation.y), Math.cos(want - m.rotation.y)) * Math.min(1, dt * 2.5);
      };
    } else if (key === 'sky') {
      // Kite flying: a kite on a long string dances in the wind; every gust it catches loops it round.
      const kite = new T.Group(); props.add(kite); const kb = add(kite, new T.OctahedronGeometry(0.06, 0), mat(0xff6b9d, { flat: true }), 0, 0, 0); kb.scale.set(1, 1.4, 0.15);
      const tail = [0, 1, 2, 3, 4].map(i => bx(kite, 0.016, 0.006, 0.006, [0xffd43b, 0x4dabf7, 0x69db7c][i % 3], 0, -0.1 - i * 0.03, 0)); const string = line(props);
      const sparks = [0, 1, 2, 3, 4, 5].map(() => { const s = glow(props, 0.008, 0xfff3a0, 0, 0, 0); s.visible = false; return s; });
      m.position.set(pl.at[0], h(pl.at[0], pl.at[2]), pl.at[2]); m.rotation.y = pl.face; let next = 3 + rr() * 3, loop = -1;
      step = (t, dt) => {
        P.armR.rotation.x = -2 + Math.sin(t * 1.7) * 0.15;
        const kx = m.position.x + Math.sin(pl.face) * 0.5 + Math.sin(t * 0.7) * 0.15, kz = m.position.z + Math.cos(pl.face) * 0.5 + Math.cos(t * 0.5) * 0.1, ky = m.position.y + 0.75 + Math.sin(t * 1.1) * 0.06;
        kite.position.set(kx, ky, kz); kite.rotation.set(0, pl.face, Math.sin(t * 2) * 0.3 + (loop >= 0 ? loop * Math.PI * 2 : 0));
        tail.forEach((b, i) => { b.position.x = Math.sin(t * 5 - i) * 0.012 * i; });
        string(local(g, P.hand), kite.position);
        if (loop >= 0) { loop += dt / 1.1; sparks.forEach((s, i) => { s.visible = true; const a = i / sparks.length * Math.PI * 2 + t * 3; s.position.set(kx + Math.cos(a) * 0.1, ky + Math.sin(a) * 0.1, kz); }); if (loop >= 1) { loop = -1; sparks.forEach(s => { s.visible = false; }); say(2, 'Caught a gust!', '🪁', [kx, ky, kz]); } }
        else if (st.t > next) { loop = 0; st.t = 0; next = 3.5 + rr() * 3; }
      };
    } else if (key === 'farm') {
      // Hay stacking: carry bales from the pile by the barn and stack them up; the stack is cleared after six.
      const stack = []; let bale = null;
      m.position.set(pl.pile[0] + 0.1, h(pl.pile[0] + 0.1, pl.pile[1]), pl.pile[1]);
      step = (t, dt) => {
        if (st.phase === 'go') { const there = walkTo(m, u, pl.pile[0] + 0.08, pl.pile[1] + 0.02, dt); walking(P, t, !there); if (there) { still(P); phase('lift'); } }
        else if (st.phase === 'lift') { const q = Math.min(1, st.t / 0.5); P.armR.rotation.x = P.armL.rotation.x = -1.2 * q; if (!bale) { bale = new T.Group(); cyl(bale, 0.035, 0.035, 0.06, 0xe9c46a, 0, 0, 0, 12).rotation.z = P2; bale.position.set(0, 0.13, 0.06); m.add(bale); } if (q >= 1) phase('carry'); }
        else if (st.phase === 'carry') { const there = walkTo(m, u, pl.stack[0] - 0.08, pl.stack[1], dt, 0.15); walking(P, t, !there); P.armR.rotation.x = P.armL.rotation.x = -1.2; if (there) phase('drop'); }
        else if (st.phase === 'drop') {
          const q = Math.min(1, st.t / 0.5); if (q >= 1) { m.remove(bale); bale.position.set(pl.stack[0] + (stack.length % 2) * 0.02, h(...pl.stack) + 0.035 + stack.length * 0.06, pl.stack[1]); bale.rotation.y = stack.length * 0.7; props.add(bale); stack.push(bale); bale = null; if (stack.length > 6) stack.splice(0).forEach(b => props.remove(b)); still(P); say(2, 'Bale stacked', '🌾'); phase('go'); }
        }
      };
    } else {
      // Kick-ups: keep the ball up, foot to foot; every ten counts.
      const ball = new T.Group(); props.add(ball); sph(ball, 0.022, 0xffffff, 0, 0, 0); [[1, 0, 0], [-1, 0.3, 0.2], [0, 1, 0], [0.2, -0.6, 0.8]].forEach(([a, b, c]) => sph(ball, 0.007, 0x222222, a * 0.019, b * 0.019, c * 0.019));
      m.position.set(pl.at[0], h(pl.at[0], pl.at[2]), pl.at[2]); m.rotation.y = pl.face; let kicks = 0, k0 = 0;
      step = (t, dt) => {
        const per = 0.6, c = (t % per) / per, foot = Math.floor(t / per) % 2, f = Math.sin(pl.face), fz = Math.cos(pl.face);
        if (Math.floor(t / per) !== k0) { k0 = Math.floor(t / per); kicks++; if (kicks % 10 === 0) say(3, `${kicks} kick-ups!`, '⚽'); }
        const kickLeg = foot ? P.legL : P.legR; P.legL.rotation.x = P.legR.rotation.x = 0; kickLeg.rotation.x = -0.9 * Math.max(0, 1 - c * 4);
        ball.position.set(m.position.x + f * 0.05 + (foot ? -0.015 : 0.015) * fz, m.position.y + 0.03 + Math.sin(Math.PI * c) * 0.16, m.position.z + fz * 0.05 - (foot ? -0.015 : 0.015) * f); ball.rotation.x += dt * 8;
        P.armL.rotation.z = 0.4; P.armR.rotation.z = -0.4;
      };
    }
    pose.sync();
    return {
      resync() { pose.sync(true); },
      step(t, dt) { st.t += dt; out.length = 0; pose.before(true); step(t, dt); pose.after(dt, true); for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.t += dt; r.m.scale.setScalar(1 + r.t * 4); r.m.material.opacity = 0.8 * (1 - r.t / 0.8); if (r.t > 0.8) { props.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); } } return out.slice(); },
      end() { if (o.onEnd) o.onEnd(); held.forEach(o2 => o2.parent && o2.parent.remove(o2)); g.remove(props); props.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.userData.ownMat && c.material) c.material.dispose(); }); },
    };
  }

  /* ---------- Behaviours ----------
     When the kid isn't doing an activity, their character lives on the island by itself: it wanders about and plays
     out little scenes with props, picked at random from what suits the island and the time of day, plus whatever the
     kid's own things there let it do. Things work by kind (seats, swings, water play, fires, pets…), so every item adds
     something, and tools add more (a rod for surf casting, a bug net for bug hunts). A behaviour is a list of steps:
     go somewhere, face something, act for a while (posing the character and moving props), or do something at once.
     brain() returns { step(t, dt), end() }. o: { kid, hue, night, dusk, tools: {}, items: [{ id, t, x, z }] }. */
  const KINDS = {
    seat: ['bench', 'picnic', 'deckchairs', 'swingseat', 'picnicblanket'], lie: ['hammock', 'tent'], bounce: ['trampoline', 'bouncy'], swing: ['swing', 'tyreswing'],
    slide: ['slide', 'waterslide', 'skateramp'], ball: ['ball', 'soccergoal', 'netball', 'rugbyposts', 'cricket', 'minigolf', 'hoop'], hop: ['hopscotch', 'sandpit'],
    ride: ['seesaw', 'roundabout', 'carousel', 'ferris', 'coaster', 'gokart', 'flyingfox', 'pumptrack', 'rocketToy', 'balloon'], splash: ['paddling', 'splashpad', 'pool', 'hottub', 'shower', 'fountain', 'birdbath', 'wishingwell'],
    fire: ['campfire', 'bbq', 'pizzaoven'], look: ['telescope', 'observatory', 'lighthouse', 'clocktower'], flower: ['flowers', 'tulips', 'roses', 'lavender', 'hydrangeas', 'sunflowers', 'butterflygarden', 'mushrooms', 'pumpkins', 'harakeke', 'bamboo'],
    climb: ['treehouse', 'playhouse', 'climbing', 'castletower', 'treevillage'], mail: ['letterbox'], wash: ['clothesline'], bees: ['beehive'], kite: ['kite', 'matarikikites'],
  };
  const kindOf = t => Object.keys(KINDS).find(k => KINDS[k].includes(t));
  // The picture in the thought bubble for each behaviour, and for each kind of thing.
  const PIC = { stroll: '🚶', rest: '😌', wave: '👋', dance: '💃', nap: '😴', stretch: '🙆', butterfly: '🦋', stars: '⭐', water: '🌼', read: '📖', kickabout: '⚽', skip: '🏃', bubbles: '🫧', sweep: '🧹', hoop: '⭕', sunbathe: '😎', sandcastle: '🏰', swim: '🏊', coconuts: '🥥', shells: '🐚', paddle: '🌊', beachfire: '🔥', surfcast: '🎣', dangle: '🦶', skipstones: '💫', peer: '👀', jettysun: '😎', waterbeds: '💧', dig: '🌱', carrot: '🥕', sunflower: '🌻', scarecrow: '💬', chooks: '🐔', bucket: '💧', pitchfork: '🌾', fence: '🔨', jumpfoot: '🏃', rail: '🐴', geyserwatch: '⛲', snap: '📸', picnic: '🧺', pick: '🍎', shade: '🌳', hives: '🐝', rake: '🍂', birdwatch: '🐦', hugtree: '🌳', sticks: '🌲', bugs: '🐛', toadstools: '🍄', cloudbounce: '☁️', float: '✨', rainbowwave: '🌈',
    seat: '📖', lie: '😴', bounce: '🤸', swing: '😄', slide: '🎢', ball: '⚽', hop: '🦘', ride: '🎡', splash: '💦', fire: '🔥', look: '🔭', flower: '🌸', climb: '🧗', mail: '✉️', wash: '👕', bees: '🐝', kite: '🪁', pet: '❤️', any: '😍' };
  function brain(g, key, o) {
    const u = g.userData, m = o.kid, P = m.userData.P, pl = u.play || {}, L = u.L || { cx: 0, cz: 0, r: 1.05 * (u.S || 1), ox: Math.cos(FRONT), oz: Math.sin(FRONT) }, sea = u.terrain.sea, rr = K.mulberry((Date.now() % 9973) + 7);
    const floor = pl.floor || u.terrain.h, walk = pl.walk || ((x, z) => Math.hypot(x - L.cx, z - L.cz) < 0.85 * L.r), props = new T.Group(); g.add(props);
    const ticks = [], fades = [], held = [], hue = new T.Color(o.hue || '#e5533d').getHex(), pose = poser(m, floor);
    // Where to go: a random walkable spot, one by the water, one near something.
    const spot = (ok = walk) => { for (let i = 0; i < 80; i++) { const a = rr() * PI * 2, r0 = Math.sqrt(rr()) * 0.85 * L.r, x = L.cx + Math.cos(a) * r0, z = L.cz + Math.sin(a) * r0; if (ok(x, z)) return [x, z]; } return null; };
    const depth = (x, z) => (sea == null ? -1 : sea - u.terrain.h(x, z));
    const byWater = () => spot((x, z) => walk(x, z) && [[0.07, 0], [-0.07, 0], [0, 0.07], [0, -0.07]].some(([dx, dz]) => depth(x + dx, z + dz) > 0.012));
    const near = (p, r = 0.13) => spot((x, z) => walk(x, z) && Math.hypot(x - p[0], z - p[1]) < r && Math.hypot(x - p[0], z - p[1]) > 0.05) || p;
    const gy = () => floor(m.position.x, m.position.z), here = () => [m.position.x, m.position.z];
    // Steps
    const go = (p, sp = 0.16) => ({ run: (dt, t) => { if (!p) return true; const dx = p[0] - m.position.x, dz = p[1] - m.position.z, d = Math.hypot(dx, dz); if (d < 0.012) { still(P); m.position.y = gy(); return true; } const s = Math.min(d, sp * dt); m.position.x += dx / d * s; m.position.z += dz / d * s; m.rotation.y = Math.atan2(dx, dz); m.position.y = gy(); walking(P, t, true); return false; } });
    const face = p => ({ run: () => { if (p) m.rotation.y = Math.atan2(p[0] - m.position.x, p[1] - m.position.z); return true; } });
    const act = (d, f) => ({ d, run: (dt, t, q) => { if (f) f(q, t, dt); return q >= 1; } });
    const now = f => ({ run: () => { f(); return true; } });
    // Props: put in the world, held in a paw, a little emoji bubble over the head, and per-frame movers.
    const pop = obj => { const s0 = obj.scale.clone(), k = { t: 0 }; obj.scale.multiplyScalar(0.01); fades.push(dt => { k.t = Math.min(1, k.t + dt * 4); const e = 1 - Math.pow(1 - k.t, 3); obj.scale.copy(s0).multiplyScalar(Math.max(0.01, e)); return k.t < 1; }); return obj; };
    const put = (obj, x, y, z) => { obj.position.set(x, y, z); props.add(obj); return pop(obj); };
    const hand = (obj, left) => { (left ? P.handL : P.hand).add(obj); held.push(obj); return pop(obj); };
    const bubble = (e, d = 1.8) => { const s = sprite(emojiTex(e), 0.07); s.userData.ownMat = true; props.add(s); const t0 = { t: 0 }; ticks.push(dt => { t0.t += dt; s.position.set(m.position.x, m.position.y + 0.33 + t0.t * 0.03, m.position.z); s.material.opacity = Math.min(1, (d - t0.t) * 2); return t0.t < d; }); };
    const say = (e, d) => now(() => bubble(e, d));
    const every = f => ticks.push(f);
    const G = () => new T.Group();
    const sit = (q = 1) => { m.position.y = gy() - 0.07 * q; P.legL.rotation.x = P.legR.rotation.x = -1.45 * q; };
    const lie = front => { m.rotation.x = front ? P2 * 0.95 : -P2; m.position.y = gy() + (front ? 0.045 : 0.056); };
    const crouch = q => { P.body.rotation.x = 0.6 * q; P.legL.rotation.x = P.legR.rotation.x = -0.6 * q; P.body.position.y = 0.085 - 0.025 * q; };
    const wave = t => { P.armR.rotation.z = -2.5 + Math.sin(t * 10) * 0.3; };
    const drops = (x, y, z, c = 0x8fd0ff, n = 6) => { for (let i = 0; i < n; i++) { const s = sph(props, 0.006, c, x, y, z), v = [(rr() - 0.5) * 0.2, 0.15 + rr() * 0.15, (rr() - 0.5) * 0.2], life = { t: 0 }; every(dt => { life.t += dt; v[1] -= dt * 0.8; s.position.x += v[0] * dt; s.position.y += v[1] * dt; s.position.z += v[2] * dt; if (life.t > 0.7) { props.remove(s); return false; } return true; }); } };
    const flames = (x, y, z, s0 = 1) => { const f = G(); put(f, x, y, z); for (let i = 0; i < 5; i++) stick(f, [Math.cos(i * 1.3) * 0.03 * s0, 0, Math.sin(i * 1.3) * 0.03 * s0], [0, 0.02 * s0, 0], 0.005, 0x6b4a2e); const fl = [0xff6b1a, 0xffb020, 0xffe066].map((c, i) => { const c2 = add(f, new T.ConeGeometry(0.022 * s0 * (1 - i * 0.25), 0.07 * s0 * (1 - i * 0.2), 7), mat(c, { e: c }), 0, 0.04 * s0, 0); c2.userData.noInk = true; return c2; }); every(dt => { const t = performance.now() / 1000; fl.forEach((c2, i) => { c2.scale.set(1, 0.8 + Math.sin(t * 12 + i * 2) * 0.25, 1); c2.rotation.y = t * (2 + i); }); return f.parent === props; }); return f; };
    const book = () => { const b = G(); bx(b, 0.04, 0.005, 0.03, 0xffffff, 0, 0, 0); bx(b, 0.042, 0.004, 0.032, [0xe03131, 0x2f6fe4, 0x30c25a][Math.floor(rr() * 3)], 0, -0.003, 0); b.rotation.x = -1.1; return b; };
    const ball = (c = 0xffffff) => { const b = G(); sph(b, 0.02, c, 0, 0, 0); [[1, 0, 0], [-1, 0.3, 0.2], [0, 1, 0]].forEach(([a, b2, c2]) => sph(b, 0.006, 0x222222, a * 0.018, b2 * 0.018, c2 * 0.018)); return b; };
    const can = () => { const w = G(); cyl(w, 0.016, 0.018, 0.03, 0x4caf50, 0, -0.01, 0.02, 10); stick(w, [0, -0.005, 0.035], [0, 0.01, 0.07], 0.003, 0x4caf50); return w; };
    const broom = () => { const b = G(); cyl(b, 0.003, 0.003, 0.18, 0xb07a4a, 0, 0.0, 0.03, 5); cn(b, 0.02, 0.04, 0xe0b84a, 0, -0.1, 0.03, 8).rotation.x = PI; b.rotation.x = 0.5; return b; };
    // The library: [id, where ('any' or island keys), weight, when(), steps()].
    const LIB = [
      ['stroll', 'any', 1, null, () => [go(spot()), act(1.2, (q, t) => { P.head.rotation.y = Math.sin(t * 2) * 0.6; }), go(spot()), now(() => { P.head.rotation.y = 0; })]],
      ['rest', 'any', 0.8, null, () => [go(spot()), act(5, (q, t) => { sit(); P.legL.rotation.x = -1.3 + Math.sin(t * 3) * 0.2; P.legR.rotation.x = -1.3 - Math.sin(t * 3) * 0.2; }), say('😊')]],
      ['wave', 'any', 0.6, null, () => [go(spot()), face([L.cx + L.ox * 9, L.cz + L.oz * 9]), say('👋'), act(2.2, (q, t) => wave(t))]],
      ['dance', 'any', 0.7, null, () => [go(spot()), say('🎵', 2.5), act(4, (q, t) => { P.body.rotation.z = Math.sin(t * 6) * 0.25; P.armL.rotation.z = 1.2 + Math.sin(t * 6) * 0.6; P.armR.rotation.z = -1.2 + Math.sin(t * 6) * 0.6; m.position.y = gy() + Math.abs(Math.sin(t * 6)) * 0.02; m.rotation.y += 0.02; })]],
      ['nap', 'any', 0.5, null, () => [go(spot()), act(7, (q, t) => { lie(false); if (Math.floor(t * 0.6) !== Math.floor((t - 0.02) * 0.6)) bubble('💤', 1.4); })]],
      ['stretch', 'any', 0.5, null, () => [go(spot()), act(2.5, (q, t) => { const s = Math.sin(Math.PI * q); P.armL.rotation.z = 2.8 * s; P.armR.rotation.z = -2.8 * s; m.position.y = gy() + 0.01 * s; }), say('🥱')]],
      ['butterfly', 'any', 0.6, () => !o.night, () => { const b = G(), wg = [-1, 1].map(s => { const w = bx(b, 0.02, 0.002, 0.016, [0xffb3e6, 0xffd43b, 0x9fe8ff][Math.floor(rr() * 3)], s * 0.011, 0, 0); return w; }); let p0 = spot(); const fly = { t: 0 }; return [now(() => { put(b, m.position.x + 0.2, gy() + 0.12, m.position.z); every(dt => { fly.t += dt; wg.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(fly.t * 25) * 0.8; }); b.position.x += (m.position.x + Math.sin(fly.t * 1.3) * 0.08 - b.position.x) * dt * 1.2; b.position.z += (m.position.z + Math.cos(fly.t * 1.1) * 0.08 - b.position.z) * dt * 1.2; b.position.y = gy() + 0.14 + Math.sin(fly.t * 3) * 0.03; return true; }); }), go(p0, 0.22), act(1.5, (q, t) => { P.armR.rotation.x = -2 * Math.abs(Math.sin(t * 5)); m.position.y = gy() + Math.abs(Math.sin(t * 8)) * 0.02; }), go(spot(), 0.22), say('🦋')]; }],
      ['stars', 'any', 0.8, () => o.night, () => [go(spot()), act(6, (q, t) => { lie(false); if (rr() < 0.01) bubble('⭐', 1.2); })]],
      // Home
      ['water', ['home'], 1, () => o.tools.wateringcan, () => { const p = spot(); return [go(p), now(() => hand(can())), act(3.5, (q, t) => { P.armR.rotation.x = -0.9; if (rr() < 0.25) { const w = local(g, P.hand); drops(w.x + Math.sin(m.rotation.y) * 0.05, w.y, w.z + Math.cos(m.rotation.y) * 0.05, 0x8fd0ff, 1); } }), say('🌼')]; }],
      ['read', ['home', 'orchard', 'grove', 'sky'], 1, null, () => [go(spot()), now(() => hand(book())), act(7, (q, t) => { sit(); P.armR.rotation.x = -1.1; P.armL.rotation.x = -1.1; P.head.rotation.x = 0.25; }), say('📖')]],
      ['kickabout', ['home', 'farm'], 1, null, () => { const b = put(ball(), ...[0, 0, 0]), p1 = spot(), p2 = spot(); let bp = here(); return [now(() => { b.position.set(m.position.x + 0.05, gy() + 0.02, m.position.z); bp = [b.position.x, b.position.z]; every(() => { b.position.y = floor(b.position.x, b.position.z) + 0.02; return true; }); }), go(p1, 0.22), act(0.4, () => { b.position.x += (m.position.x + Math.sin(m.rotation.y) * 0.05 - b.position.x) * 0.3; b.position.z += (m.position.z + Math.cos(m.rotation.y) * 0.05 - b.position.z) * 0.3; }), go(p2, 0.22), act(0.4, () => { b.position.x += (m.position.x + Math.sin(m.rotation.y) * 0.05 - b.position.x) * 0.3; b.position.z += (m.position.z + Math.cos(m.rotation.y) * 0.05 - b.position.z) * 0.3; }), say('⚽')]; }],
      ['skip', ['home', 'beach', 'sky'], 0.8, null, () => { const rope = G(); return [go(spot()), now(() => { const loop = add(rope, new T.TorusGeometry(0.11, 0.003, 4, 24), mat(hue), 0, 0, 0); put(rope, 0, 0, 0); every(() => { rope.position.set(m.position.x, m.position.y + 0.11, m.position.z); rope.rotation.set(performance.now() / 160, m.rotation.y, 0, 'YXZ'); return true; }); loop.rotation.y = P2; }), act(4, (q, t) => { m.position.y = gy() + Math.abs(Math.sin(t * 10)) * 0.03; P.armL.rotation.z = 0.6; P.armR.rotation.z = -0.6; })]; }],
      ['bubbles', ['home', 'sky', 'orchard'], 0.8, null, () => [go(spot()), now(() => { const w = G(); stick(w, [0, 0, 0], [0, 0.05, 0.02], 0.002, 0xff6b9d); add(w, new T.TorusGeometry(0.012, 0.002, 4, 12), mat(0xff6b9d), 0, 0.055, 0.02); hand(w); }), act(5, (q, t) => { P.armR.rotation.x = -1.6; if (rr() < 0.06) { const p = local(g, P.hand), s = add(props, new T.SphereGeometry(0.014, 10, 8), new T.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.45, depthWrite: false }), p.x, p.y + 0.06, p.z), v = { t: 0 }; s.userData.ownMat = true; s.userData.noInk = true; every(dt => { v.t += dt; s.position.y += dt * 0.08; s.position.x += Math.sin(v.t * 3) * 0.002; if (v.t > 2.5) { props.remove(s); return false; } return true; }); } }), say('🫧')]],
      ['sweep', ['home', 'stable', 'farm'], 0.8, () => o.tools.broom || key !== 'home', () => [go(spot()), now(() => hand(broom())), act(1.6, (q, t) => { P.armR.rotation.x = -0.4 + Math.sin(t * 8) * 0.4; }), go(spot(), 0.08), act(1.6, (q, t) => { P.armR.rotation.x = -0.4 + Math.sin(t * 8) * 0.4; }), say('🧹')]],
      ['hoop', ['home', 'beach', 'sky'], 0.7, null, () => { const h = G(); return [go(spot()), now(() => { add(h, new T.TorusGeometry(0.06, 0.004, 5, 24), mat(0xff6b9d), 0, 0, 0).rotation.x = P2; put(h, 0, 0, 0); }), act(4, (q, t) => { h.position.set(m.position.x + Math.cos(t * 12) * 0.015, m.position.y + 0.13, m.position.z + Math.sin(t * 12) * 0.015); P.body.rotation.z = Math.sin(t * 12) * 0.12; P.armL.rotation.z = 1.4; P.armR.rotation.z = -1.4; }), say('😄')]; }],
      // Beach
      ['sunbathe', ['beach'], 1.2, () => !o.night, () => { const p = spot(); return [go(p), now(() => { const tw = G(); bx(tw, 0.09, 0.004, 0.2, hue, 0, 0.002, 0); for (let i = 0; i < 3; i++) bx(tw, 0.092, 0.005, 0.014, 0xffffff, 0, 0.003, -0.07 + i * 0.07); tw.rotation.y = m.rotation.y; put(tw, m.position.x - Math.sin(m.rotation.y) * 0.1, gy(), m.position.z - Math.cos(m.rotation.y) * 0.1); const um = G(); cyl(um, 0.003, 0.003, 0.22, 0xeeeeee, 0, 0.11, 0, 5); add(um, new T.ConeGeometry(0.11, 0.045, 10, 1, true), mat(0xff6b6b, { ds: true }), 0, 0.22, 0); put(um, m.position.x + 0.08, gy(), m.position.z); const gl = G(); [-1, 1].forEach(s => sph(gl, 0.011, 0x111111, s * 0.02, 0.008, 0.056, 1, 1, 0.4)); P.head.add(gl); held.push(gl); }), act(8, () => lie(false)), say('😎')]; }],
      ['sandcastle', ['beach'], 1.2, null, () => { const p = spot(), cs = G(); let lvl = 0; return [go(p), now(() => { put(cs, m.position.x + Math.sin(m.rotation.y) * 0.07, gy(), m.position.z + Math.cos(m.rotation.y) * 0.07); const bk = G(); cyl(bk, 0.014, 0.011, 0.02, 0xff6b6b, 0, -0.01, 0, 8); hand(bk, true); }), act(6, (q, t) => { sit(); P.armR.rotation.x = -0.9 + Math.sin(t * 6) * 0.3; const want = Math.floor(q * 4); while (lvl < want) { if (lvl < 3) cyl(cs, 0.04 - lvl * 0.01, 0.045 - lvl * 0.01, 0.025, 0xe8cf8f, 0, 0.0125 + lvl * 0.025, 0, 10); else { [-1, 1].forEach(s => cn(cs, 0.012, 0.03, 0xe8cf8f, s * 0.025, 0.035, 0.02, 8)); stick(cs, [0, 0.075, 0], [0, 0.11, 0], 0.002, 0x6b4a2e); bx(cs, 0.02, 0.012, 0.002, hue, 0.01, 0.105, 0); } lvl++; } }), say('🏰'), act(1.5, () => sit())]; }],
      ['swim', ['beach', 'lake'], 1, () => sea != null && !o.night, () => { const s0 = byWater(), w = spot((x, z) => depth(x, z) > 0.08 && Math.hypot(x - L.cx, z - L.cz) < 0.8 * L.r); return w && s0 ? [go(s0), say('🏊'), act(4, (q, t) => { const x = s0[0] + (w[0] - s0[0]) * q, z = s0[1] + (w[1] - s0[1]) * q; m.position.set(x, Math.max(u.terrain.h(x, z), sea - 0.035), z); m.rotation.y = Math.atan2(w[0] - s0[0], w[1] - s0[1]); if (depth(x, z) > 0.03) { m.rotation.x = P2 * 0.9; P.armL.rotation.x = -1.6 + Math.sin(t * 6) * 1.2; P.armR.rotation.x = -1.6 - Math.sin(t * 6) * 1.2; } else walking(P, t, true); }), act(4, (q, t) => { const x = w[0] + (s0[0] - w[0]) * q, z = w[1] + (s0[1] - w[1]) * q; m.position.set(x, Math.max(u.terrain.h(x, z), sea - 0.035), z); m.rotation.y = Math.atan2(s0[0] - w[0], s0[1] - w[1]); if (depth(x, z) > 0.03) { m.rotation.x = P2 * 0.9; P.armL.rotation.x = -1.6 + Math.sin(t * 6) * 1.2; P.armR.rotation.x = -1.6 - Math.sin(t * 6) * 1.2; } else { m.rotation.x = 0; walking(P, t, true); } }), now(() => { m.rotation.x = 0; still(P); })] : [go(spot())]; }],
      ['coconuts', ['beach'], 1, () => (pl.palms || []).length, () => { const pm = pl.palms[Math.floor(rr() * pl.palms.length)], nut = G(); sph(nut, 0.02, 0x6b4a2e, 0, 0, 0); return [go(near(pm, 0.1)), face(pm), act(1.6, (q, t) => { P.armL.rotation.x = P.armR.rotation.x = -2.6; m.rotation.z = Math.sin(t * 20) * 0.05; }), now(() => { m.rotation.z = 0; put(nut, pm[0], floor(pm[0], pm[1]) + 0.4, pm[1]); const f = { v: 0 }; every(dt => { if (nut.parent !== props) return false; f.v -= dt * 1.2; nut.position.y = Math.max(floor(nut.position.x, nut.position.z) + 0.02, nut.position.y + f.v * dt); return true; }); }), act(1, () => { still(P); }), now(() => { props.remove(nut); nut.position.set(0, 0.01, 0.02); hand(nut); }), say('🥥'), go(spot(), 0.13)]; }],
      ['shells', ['beach'], 1, null, () => [go(byWater()), act(1.2, q => crouch(Math.sin(Math.PI * q))), now(() => { const sh = G(); add(sh, new T.ConeGeometry(0.012, 0.02, 7), mat(0xffd1dc), 0, 0, 0).rotation.z = P2; hand(sh); }), act(1, () => { P.armR.rotation.x = -2.4; }), say('🐚'), go(byWater()), act(1.2, q => crouch(Math.sin(Math.PI * q)))]],
      ['paddle', ['beach'], 0.9, () => !o.night, () => { const a = byWater(), b2 = byWater(); if (!a || !b2) return [go(spot())]; return [go(a), act(5, (q, t) => { const x = a[0] + (b2[0] - a[0]) * q, z = a[1] + (b2[1] - a[1]) * q; m.position.set(x, floor(x, z), z); m.rotation.y = Math.atan2(b2[0] - a[0], b2[1] - a[1]); walking(P, t, true); if (rr() < 0.08 && depth(x, z) > 0) drops(x, sea + 0.01, z, 0xcfefff, 3); }), say('💦')]; }],
      ['beachfire', ['beach', 'lake', 'grove', 'lookout'], 1.4, () => o.dusk || o.night, () => { const p = key === 'lake' ? (pl.end || spot()) : spot(); return [go(p), now(() => flames(m.position.x + Math.sin(m.rotation.y) * 0.08, gy(), m.position.z + Math.cos(m.rotation.y) * 0.08)), now(() => { const s = G(); stick(s, [0, 0, 0], [0, 0.03, 0.09], 0.0025, 0x9a6a3c); sph(s, 0.008, 0xfff6e0, 0, 0.032, 0.095); hand(s); }), act(8, (q, t) => { sit(); P.armR.rotation.x = -1.2 + Math.sin(t) * 0.1; }), say('🔥')]; }],
      ['surfcast', ['beach', 'lake'], 1.3, () => o.tools.rod && sea != null, () => { const p = key === 'lake' ? pl.end : byWater(), rod = G(); cyl(rod, 0.003, 0.005, 0.3, 0x2a2f3a, 0, 0.13, 0, 6); rod.rotation.x = -1.1; const tip = new T.Object3D(); tip.position.y = 0.28; rod.add(tip); let tgt; const ln = line(props), bob = sph(G(), 0.009, 0xffffff, 0, 0, 0); return [go(p), now(() => { const w = spot((x, z) => depth(x, z) > 0.04 && Math.hypot(x - m.position.x, z - m.position.z) < 0.45) || here(); tgt = w; m.rotation.y = Math.atan2(w[0] - m.position.x, w[1] - m.position.z); hand(rod); props.add(bob); }), act(1, (q) => { P.armR.rotation.x = q < 0.4 ? -0.3 - q * 2 : -1.1; const tp = local(g, tip), e = Math.max(0, (q - 0.4) / 0.6); bob.position.set(tp.x + (tgt[0] - tp.x) * e, tp.y + (sea - tp.y) * e + Math.sin(Math.PI * e) * 0.1, tp.z + (tgt[1] - tp.z) * e); ln(tp, bob.position); }), act(6, (q, t) => { bob.position.y = sea + Math.sin(t * 3) * 0.003; ln(local(g, tip), bob.position); P.armR.rotation.x = -1.1; }), say(rr() < 0.5 ? '🐟' : '🙂'), now(() => { props.remove(bob); ln(new T.Vector3(), new T.Vector3()); })]; }],
      // Lake (on the jetty)
      ['dangle', ['lake'], 1.2, () => pl.end, () => [go(pl.end), face(pl.out), act(7, (q, t) => { sit(); P.legL.rotation.x = -0.5 + Math.sin(t * 2.5) * 0.4; P.legR.rotation.x = -0.5 - Math.sin(t * 2.5) * 0.4; m.position.y = gy() - 0.06; }), say('😌')]],
      ['skipstones', ['lake', 'beach'], 1, () => sea != null, () => { const st = sph(G(), 0.01, 0x8d9096, 0, 0, 0); let a0, dir; return [go(key === 'lake' ? pl.end : byWater()), now(() => { dir = key === 'lake' ? pl.face : m.rotation.y; m.rotation.y = dir; a0 = local(g, P.hand); props.add(st); }), act(0.4, q => { P.armR.rotation.x = -0.6 + q * 1.2; P.armR.rotation.z = -0.8; }), act(2, q => { const d = q * 0.6, hops = Math.abs(Math.sin(q * Math.PI * 4)) * 0.05 * (1 - q); st.position.set(a0.x + Math.sin(dir) * d, sea + 0.004 + hops, a0.z + Math.cos(dir) * d); if (hops < 0.003 && rr() < 0.3) ripple(props, ticksR, st.position.x, sea, st.position.z); }), say('🪨')]; }],
      ['peer', ['lake'], 0.8, () => pl.end, () => [go(near(pl.end, 0.12)), face(pl.out), act(3, q => crouch(Math.min(1, q * 3))), say('👀'), act(1, q => crouch(1 - q))]],
      ['jettysun', ['lake'], 0.8, () => !o.night && pl.end, () => [go(near(pl.end, 0.25)), act(7, () => lie(false)), say('😎')]],
      // Veggie plot
      ['waterbeds', ['plot'], 1.2, null, () => { const p = (pl.spots || [])[Math.floor(rr() * (pl.spots || [1]).length)] || spot(); return [go(near(p, 0.1)), now(() => hand(can())), act(4, () => { P.armR.rotation.x = -0.9; if (rr() < 0.3) { const w = local(g, P.hand); drops(w.x + Math.sin(m.rotation.y) * 0.05, w.y, w.z + Math.cos(m.rotation.y) * 0.05, 0x8fd0ff, 1); } }), say('💧')]; }],
      ['dig', ['plot', 'farm'], 1, null, () => { const sp = G(); cyl(sp, 0.003, 0.003, 0.14, 0xb07a4a, 0, 0.0, 0.02, 5); bx(sp, 0.03, 0.04, 0.004, 0x9aa0a8, 0, -0.08, 0.02); return [go(spot()), now(() => hand(sp)), act(3.5, (q, t) => { P.armR.rotation.x = -0.6 + Math.sin(t * 5) * 0.5; P.body.rotation.x = 0.25 + Math.sin(t * 5) * 0.15; if (rr() < 0.04) drops(m.position.x + Math.sin(m.rotation.y) * 0.06, gy() + 0.02, m.position.z + Math.cos(m.rotation.y) * 0.06, 0x6b4a2a, 3); }), say('🌱')]; }],
      ['carrot', ['plot'], 1, () => (pl.spots || []).length, () => { const p = pl.spots[Math.floor(rr() * pl.spots.length)], cr = G(); cn(cr, 0.009, 0.05, 0xff8a1a, 0, 0, 0, 8).rotation.x = PI; [0, 1, 2].forEach(i => cn(cr, 0.004, 0.03, 0x3f8f35, (i - 1) * 0.005, 0.035, 0, 4)); return [go(near(p, 0.08)), face(p), act(1.4, q => crouch(Math.sin(Math.PI * Math.min(1, q * 1.2)))), now(() => hand(cr)), act(1.2, () => { P.armR.rotation.x = -2.6; }), say('🥕')]; }],
      ['sunflower', ['plot'], 0.8, () => (pl.sunflowers || []).length, () => { const f = pl.sunflowers[Math.floor(rr() * pl.sunflowers.length)]; return [go(near(f, 0.09)), face(f), act(2.5, (q, t) => { P.body.rotation.x = -0.3 * Math.sin(Math.PI * q); P.head.rotation.x = -0.4 * Math.sin(Math.PI * q); }), say('🌻')]; }],
      ['scarecrow', ['plot'], 0.6, () => pl.scarecrow, () => [go(near(pl.scarecrow, 0.12)), face(pl.scarecrow), say('💬', 2.5), act(3, (q, t) => { P.armR.rotation.z = -0.5 + Math.sin(t * 4) * 0.4; P.head.rotation.z = Math.sin(t * 3) * 0.15; })]],
      // Farm
      ['chooks', ['farm'], 1.2, null, () => [go(spot()), act(4, (q, t) => { P.armR.rotation.x = -1 + Math.sin(t * 7) * 0.6; if (rr() < 0.3) drops(m.position.x + Math.sin(m.rotation.y) * 0.06, gy() + 0.12, m.position.z + Math.cos(m.rotation.y) * 0.06, 0xe9c46a, 2); }), say('🐔')]],
      ['bucket', ['farm', 'stable'], 1, () => pl.trough, () => { const bk = G(); cyl(bk, 0.02, 0.016, 0.03, 0x9aa0a8, 0, -0.02, 0, 10); return [go(spot()), now(() => hand(bk)), go(near(pl.trough, 0.1), 0.13), face(pl.trough), act(1.2, q => { P.armR.rotation.x = -1.4 * Math.sin(Math.PI * q); }), say('💧')]; }],
      ['pitchfork', ['farm', 'stable'], 1, () => pl.pile, () => { const fk = G(); cyl(fk, 0.003, 0.003, 0.18, 0xb07a4a, 0, 0, 0.02, 5); [-1, 0, 1].forEach(s => cyl(fk, 0.0015, 0.0015, 0.04, 0x9aa0a8, s * 0.008, -0.11, 0.02, 4)); return [go(near(pl.pile, 0.12)), face(pl.pile), now(() => hand(fk)), act(4, (q, t) => { P.armR.rotation.x = -0.4 - Math.abs(Math.sin(t * 3)) * 1.2; if (rr() < 0.05) drops(m.position.x, gy() + 0.15, m.position.z, 0xe9c46a, 3); }), say('🌾')]; }],
      ['fence', ['farm', 'stable'], 0.7, null, () => { const hm = G(); cyl(hm, 0.003, 0.003, 0.07, 0xb07a4a, 0, -0.02, 0.02, 5); bx(hm, 0.03, 0.012, 0.012, 0x6f757d, 0, -0.055, 0.02); const a = rr() * PI * 2, e = [L.cx + Math.cos(a) * 0.82 * L.r, L.cz + Math.sin(a) * 0.82 * L.r]; return [go(e), face([L.cx + Math.cos(a) * 2, L.cz + Math.sin(a) * 2]), now(() => hand(hm)), act(2.5, (q, t) => { P.armR.rotation.x = -1.2 + Math.abs(Math.sin(t * 9)) * 0.8; }), say('🔨')]; }],
      // Stable yard
      ['jumpfoot', ['stable'], 1, () => (pl.jumpAt || []).length, () => { const j = pl.jumpAt[Math.floor(rr() * pl.jumpAt.length)]; const a = near(j, 0.16), b2 = [2 * j[0] - a[0], 2 * j[1] - a[1]]; return [go(a), face(j), act(1.2, (q, t) => { const x = a[0] + (b2[0] - a[0]) * q, z = a[1] + (b2[1] - a[1]) * q; m.position.set(x, floor(x, z) + Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (q - 0.35) / 0.3)))) * 0.13, z); walking(P, t * 1.5, true); }), say('😆')]; }],
      ['rail', ['stable'], 0.8, () => pl.rail, () => [go(pl.rail), face(pl.arena), act(6, (q, t) => { sit(); m.position.y = gy() + 0.03; P.legL.rotation.x = -1.3 + Math.sin(t * 2) * 0.2; }), say('🐴')]],
      // Geyser park
      ['geyserwatch', ['lookout'], 1.2, () => pl.gxz, () => [go(near(pl.gxz, 0.35)), face(pl.gxz), act(9, (q, t) => { sit(); const c = t % 24; if (c > 1.4 && c < 1.5) bubble('😮', 1.6); })]],
      ['snap', ['lookout'], 1, () => pl.spring, () => { const cam = G(); bx(cam, 0.04, 0.026, 0.02, 0x2a2f3a, 0, 0, 0.012); return [go(near(pl.spring, 0.4)), face(pl.spring), now(() => hand(cam)), act(1, q => { P.armR.rotation.x = P.armL.rotation.x = -1.5 * q; }), say('📸'), act(1.2, () => { P.armR.rotation.x = P.armL.rotation.x = -1.5; })]; }],
      ['picnic', ['lookout', 'orchard', 'sky', 'grove'], 1, () => !o.night, () => { const p = spot(); return [go(p), now(() => { const bl = G(); bx(bl, 0.16, 0.003, 0.16, 0xe03131, 0, 0.002, 0); for (let i = 0; i < 4; i++) bx(bl, 0.16, 0.004, 0.012, 0xffffff, 0, 0.003, -0.06 + i * 0.04); put(bl, m.position.x, gy(), m.position.z); const bk = G(); cyl(bk, 0.025, 0.02, 0.03, 0xc9a06a, 0, 0.015, 0, 10); put(bk, m.position.x + 0.05, gy(), m.position.z + 0.04); const sw = G(); bx(sw, 0.03, 0.012, 0.03, 0xf2d9a0, 0, 0, 0.015); hand(sw); }), act(7, (q, t) => { sit(); P.armR.rotation.x = -1.4 + Math.abs(Math.sin(t * 2)) * 0.5; }), say('🥪')]; }],
      // Orchard
      ['pick', ['orchard'], 1.2, () => (pl.trees || []).length, () => { const tr = pl.trees[Math.floor(rr() * pl.trees.length)], ap = G(); sph(ap, 0.014, 0xd93a3a, 0, 0, 0); return [go(near(tr, 0.11)), face(tr), act(1.4, q => { P.armR.rotation.x = -2.7 * Math.sin(Math.PI * Math.min(1, q * 1.3)); }), now(() => hand(ap)), act(2.5, (q, t) => { P.armR.rotation.x = -1.6 - Math.abs(Math.sin(t * 6)) * 0.3; }), say('🍎')]; }],
      ['shade', ['orchard', 'grove'], 0.9, () => (pl.trees || []).length, () => { const tr = pl.trees[Math.floor(rr() * pl.trees.length)]; return [go(near(tr, 0.12)), act(7, () => lie(false)), say('💤')]; }],
      ['hives', ['orchard'], 1, () => (pl.hives || []).length, () => { const hv = pl.hives[Math.floor(rr() * pl.hives.length)], bees = [0, 1, 2, 3].map(() => sph(props, 0.006, 0xffd43b, 0, 0, 0)); every(() => { const t = performance.now() / 1000; bees.forEach((b, i) => b.position.set(hv[0] + Math.cos(t * 3 + i * 1.6) * 0.07, floor(hv[0], hv[1]) + 0.18 + Math.sin(t * 5 + i) * 0.03, hv[1] + Math.sin(t * 3 + i * 1.6) * 0.07)); return true; }); return [go(near(hv, 0.12)), face(hv), act(3, (q, t) => { P.armR.rotation.x = -0.9; P.head.rotation.y = Math.sin(t * 2) * 0.3; }), say('🐝')]; }],
      ['rake', ['orchard', 'grove'], 0.8, null, () => { const rk = G(); cyl(rk, 0.003, 0.003, 0.17, 0xb07a4a, 0, 0, 0.02, 5); bx(rk, 0.05, 0.006, 0.006, 0x6f757d, 0, -0.09, 0.02); const pile = G(); return [go(spot()), now(() => { hand(rk); put(pile, m.position.x + Math.sin(m.rotation.y) * 0.08, gy(), m.position.z + Math.cos(m.rotation.y) * 0.08); }), act(4, (q, t) => { P.armR.rotation.x = -0.5 + Math.sin(t * 5) * 0.4; if (pile.children.length < q * 8) sph(pile, 0.012, [0xd9822b, 0xb5541c, 0xe8b04a][pile.children.length % 3], (rr() - 0.5) * 0.04, 0.006 + pile.children.length * 0.002, (rr() - 0.5) * 0.04, 1, 0.4, 1); }), say('🍂')]; }],
      // Forest grove
      ['birdwatch', ['grove'], 1.2, null, () => { const bn = G(); [-1, 1].forEach(s => cyl(bn, 0.008, 0.009, 0.03, 0x2a2f3a, s * 0.011, 0, 0.01, 8).rotation.x = P2); return [go(spot()), now(() => hand(bn)), act(6, (q, t) => { P.armR.rotation.x = P.armL.rotation.x = -1.55; P.armL.rotation.z = -0.35; m.rotation.y += Math.sin(t * 0.8) * 0.01; }), say('🐦')]; }],
      ['hugtree', ['grove'], 0.8, () => (pl.trees || []).length, () => { const tr = pl.trees[Math.floor(rr() * pl.trees.length)]; return [go(near(tr, 0.07)), face(tr), act(3, () => { P.armL.rotation.x = P.armR.rotation.x = -1.4; P.armL.rotation.z = 0.5; P.armR.rotation.z = -0.5; }), say('🌳')]; }],
      ['sticks', ['grove', 'beach'], 0.9, null, () => { const bundle = G(); let n = 0; return [now(() => { bundle.position.set(0, 0.13, 0.05); m.add(bundle); held.push(bundle); }), ...[0, 1, 2].flatMap(() => [go(spot()), act(1, q => crouch(Math.sin(Math.PI * q))), now(() => { stick(bundle, [-0.03, n * 0.006, 0], [0.03, n * 0.006 + 0.004, 0.004], 0.004, 0x6b4a2e); n++; })]), say('🪵')]; }],
      ['bugs', ['grove', 'home', 'plot'], 0.9, () => key === 'grove' || o.tools.bugnet, () => { const mg = G(); add(mg, new T.TorusGeometry(0.014, 0.003, 5, 14), mat(0x2a2f3a), 0, 0.02, 0.015); add(mg, new T.CircleGeometry(0.013, 14), new T.MeshBasicMaterial({ color: 0xcfefff, transparent: true, opacity: 0.4 }), 0, 0.02, 0.015).userData.ownMat = true; return [go(spot()), now(() => hand(mg)), act(3, q => { crouch(Math.min(1, q * 3)); P.armR.rotation.x = -1.2; }), say('🐛'), go(spot()), act(2.5, q => crouch(Math.min(1, q * 3))), say('🔍')]; }],
      ['toadstools', ['grove'], 0.6, null, () => [go(spot()), act(2.5, q => crouch(Math.sin(Math.PI * q))), say('🍄')]],
      // Sky islet
      ['cloudbounce', ['sky'], 1.2, () => (pl.clouds || []).length, () => { const c2 = pl.clouds[Math.floor(rr() * pl.clouds.length)]; return [go(c2), act(4, (q, t) => { m.position.y = gy() + Math.abs(Math.sin(t * 4)) * 0.18; P.armL.rotation.z = 1.5 + Math.sin(t * 8) * 0.3; P.armR.rotation.z = -1.5 - Math.sin(t * 8) * 0.3; m.rotation.x = Math.sin(t * 4) * 0.2; }), now(() => { m.rotation.x = 0; }), say('☁️')]; }],
      ['float', ['sky'], 1, null, () => [go(spot()), act(5, (q, t) => { const s = Math.sin(Math.PI * q); m.position.y = gy() + s * 0.22; P.armL.rotation.z = 1.4 * s; P.armR.rotation.z = -1.4 * s; m.rotation.y += 0.01; }), say('✨')]],
      ['rainbowwave', ['sky'], 0.7, () => pl.rainbow, () => [go(spot()), face(pl.rainbow), say('🌈'), act(2.5, (q, t) => wave(t))]],
    ];
    // Things the kid owns on this island add behaviours by kind.
    const ITEM = {
      seat: it => [go(near([it.x, it.z], 0.06)), face([it.x + 1, it.z]), now(() => hand(book())), act(6, () => { sit(); m.position.y = gy() - 0.02; P.armR.rotation.x = P.armL.rotation.x = -1.1; }), say('📖')],
      lie: it => [go(near([it.x, it.z], 0.07)), act(7, () => lie(false)), say('💤')],
      bounce: it => [go([it.x, it.z]), act(5, (q, t) => { const b = Math.abs(Math.sin(t * 3.5)); m.position.y = gy() + 0.05 + b * 0.25; m.rotation.x = q > 0.5 && b > 0.85 ? (t * 6) % (PI * 2) : 0; P.armL.rotation.z = 1.2 * b; P.armR.rotation.z = -1.2 * b; }), now(() => { m.rotation.x = 0; }), say('🤸')],
      swing: it => [go([it.x, it.z]), act(6, (q, t) => { sit(); const s = Math.sin(t * 2.6) * 0.5; m.position.y = gy() + 0.08; m.rotation.x = s * 0.4; P.armL.rotation.x = P.armR.rotation.x = -2.6; m.position.z += 0; }), now(() => { m.rotation.x = 0; }), say('😄')],
      slide: it => { const a = [it.x - 0.08, it.z], b2 = [it.x + 0.12, it.z]; return [go(a), act(0.8, q => { m.position.y = gy() + q * 0.12; walking(P, q * 6, true); }), act(1.2, q => { sit(); m.position.x = a[0] + (b2[0] - a[0]) * q; m.position.y = floor(m.position.x, m.position.z) + 0.12 * (1 - q) - 0.04; P.armL.rotation.z = 1.4; P.armR.rotation.z = -1.4; }), say('😆')]; },
      ball: it => { const b = ball(); return [go(near([it.x, it.z], 0.25)), face([it.x, it.z]), now(() => put(b, m.position.x + Math.sin(m.rotation.y) * 0.04, gy() + 0.02, m.position.z + Math.cos(m.rotation.y) * 0.04)), act(0.3, q => { P.legR.rotation.x = -1.2 * Math.sin(Math.PI * q); }), act(1, q => { const s = b.position; s.x += ([it.x][0] - s.x) * 0.08; s.z += (it.z - s.z) * 0.08; s.y = floor(s.x, s.z) + 0.02 + Math.sin(Math.PI * q) * 0.12; }), say('⚽'), act(1.2, (q, t) => { P.armL.rotation.z = 2.6; P.armR.rotation.z = -2.6; m.position.y = gy() + Math.abs(Math.sin(t * 8)) * 0.03; })]; },
      hop: it => [go([it.x - 0.1, it.z]), act(3, (q, t) => { m.position.x = it.x - 0.1 + q * 0.2; m.position.y = gy() + Math.abs(Math.sin(t * 7)) * 0.04; P.legL.rotation.x = Math.sin(t * 7) > 0 ? -0.8 : 0; })],
      ride: it => [go(near([it.x, it.z], 0.14)), face([it.x, it.z]), say('🎢'), act(3, (q, t) => { m.position.y = gy() + Math.abs(Math.sin(t * 6)) * 0.04; P.armL.rotation.z = 2.6; P.armR.rotation.z = -2.6; })],
      splash: it => [go(near([it.x, it.z], 0.08)), face([it.x, it.z]), act(4, (q, t) => { P.armR.rotation.x = -1 + Math.sin(t * 8) * 0.5; if (rr() < 0.25) drops(it.x, floor(it.x, it.z) + 0.06, it.z, 0x8fd0ff, 2); }), say('💦')],
      fire: it => [go(near([it.x, it.z], 0.12)), face([it.x, it.z]), now(() => { const s = G(); stick(s, [0, 0, 0], [0, 0.03, 0.09], 0.0025, 0x9a6a3c); sph(s, 0.008, 0xfff6e0, 0, 0.032, 0.095); hand(s); }), act(7, () => { sit(); P.armR.rotation.x = -1.2; }), say('🔥')],
      look: it => [go(near([it.x, it.z], 0.08)), face([it.x, it.z]), act(4, (q, t) => { P.body.rotation.x = 0.2; P.head.rotation.x = 0.3; }), say(o.night ? '🌟' : '👀')],
      flower: it => [go(near([it.x, it.z], 0.08)), face([it.x, it.z]), ...(o.tools.wateringcan ? [now(() => hand(can())), act(3, () => { P.armR.rotation.x = -0.9; if (rr() < 0.3) drops(it.x, floor(it.x, it.z) + 0.08, it.z, 0x8fd0ff, 1); })] : [act(2.2, q => { P.body.rotation.x = 0.4 * Math.sin(Math.PI * q); })]), say('🌸')],
      climb: it => [go(near([it.x, it.z], 0.08)), act(1.2, q => { m.position.y = gy() + q * 0.18; P.armL.rotation.x = P.armR.rotation.x = -2.6 + Math.sin(q * 20) * 0.3; }), say('🙋'), act(2.5, (q, t) => { m.position.y = gy() + 0.18; wave(t); }), act(1, q => { m.position.y = gy() + 0.18 * (1 - q); })],
      mail: it => { const lt = G(); bx(lt, 0.035, 0.024, 0.002, 0xffffff, 0, 0, 0.02); return [go(near([it.x, it.z], 0.06)), face([it.x, it.z]), act(1, q => { P.armR.rotation.x = -1.4 * q; }), now(() => hand(lt)), act(2, () => { P.armR.rotation.x = -1.6; P.head.rotation.x = 0.3; }), say('✉️')]; },
      wash: it => { const sh = G(); bx(sh, 0.04, 0.04, 0.003, hue, 0, -0.02, 0.02); return [go(near([it.x, it.z], 0.08)), now(() => hand(sh)), act(2.5, (q, t) => { P.armR.rotation.x = P.armL.rotation.x = -2.4; }), say('👕')]; },
      bees: it => [go(near([it.x, it.z], 0.12)), face([it.x, it.z]), act(3, (q, t) => { P.head.rotation.y = Math.sin(t * 2) * 0.3; }), say('🐝')],
      kite: () => { const kt = G(); const kb = add(kt, new T.OctahedronGeometry(0.05, 0), mat(0xff6b9d, { flat: true }), 0, 0, 0); kb.scale.set(1, 1.4, 0.15); const ln = line(props); return [go(spot()), now(() => props.add(kt)), act(9, (q, t) => { P.armR.rotation.x = -2 + Math.sin(t * 1.7) * 0.15; kt.position.set(m.position.x - Math.sin(m.rotation.y) * 0.4 + Math.sin(t * 0.7) * 0.1, m.position.y + 0.6 + Math.sin(t * 1.1) * 0.05, m.position.z - Math.cos(m.rotation.y) * 0.4); kt.rotation.set(0, m.rotation.y, Math.sin(t * 2) * 0.3); ln(local(g, P.hand), kt.position); }), say('🪁')]; },
      pet: it => [go(near([it.x, it.z], 0.07)), face([it.x, it.z]), act(2.5, (q, t) => { crouch(0.6); P.armR.rotation.x = -1.1 + Math.sin(t * 8) * 0.25; }), say('❤️'), now(() => crouch(0))],
      any: it => { const cam = G(); bx(cam, 0.04, 0.026, 0.02, 0x2a2f3a, 0, 0, 0.012); return [go(near([it.x, it.z], 0.14)), face([it.x, it.z]), now(() => hand(cam)), act(1.2, q => { P.armR.rotation.x = P.armL.rotation.x = -1.5 * q; }), say(['😍', '📸', '🤩'][Math.floor(rr() * 3)])]; },
    };
    const ticksR = [];
    let cur = null, i = 0, st = 0, last = '', live = (o.items || []).filter(it => it.m), lastPet = 0;
    function candidates() {
      const out = LIB.filter(([id, on, w, when]) => (on === 'any' || on.includes(key)) && (!when || when())).map(([id, on, w, , steps]) => ({ id, icon: PIC[id], w: on === 'any' ? w * 0.6 : w, steps }));
      // The kid's things share about half the turns however many there are, so the island's own scenes still come up.
      const own = live.map(it => { const pos = it.m.position, kind = it.pet ? 'pet' : kindOf(it.t) || 'any'; return { id: it.id, icon: PIC[kind], w: kind === 'any' ? 0.35 : 1.1, steps: () => ITEM[kind]({ ...it, x: pos.x, z: pos.z }) }; });
      const base = out.reduce((n, b) => n + b.w, 0), mine = own.reduce((n, b) => n + b.w, 0), k2 = mine > base ? base / mine : 1;
      own.forEach(b => { b.w *= k2; out.push(b); });
      return out.filter(b => b.id !== last);
    }
    // Between scenes the character pauses and looks about, then a thought bubble shows what it's going to do.
    function start() {
      const list = candidates(); let r = rr() * list.reduce((s, b) => s + b.w, 0), b = list[0];
      for (const c2 of list) { r -= c2.w; if (r <= 0) { b = c2; break; } }
      last = b.id; i = 0; st = 0;
      cur = [act(0.6 + rr() * 0.9, (q, t) => { P.head.rotation.y = Math.sin(t * 1.4) * 0.35; }), now(() => { P.head.rotation.y = 0; think(b.icon); }), ...b.steps().filter(Boolean)];
    }
    const bubbles = [];
    function think(e) {
      if (!e) return; const s = sprite(thoughtTex(e), 0.17); s.userData.ownMat = true; s.renderOrder = 5; g.add(s); bubbles.push(s); const k = { t: 0 };
      fades.push(dt => { k.t += dt; s.position.set(m.position.x + 0.06, m.position.y + 0.37 + Math.sin(k.t * 2) * 0.008, m.position.z); s.material.opacity = Math.max(0, Math.min(1, k.t * 3, (3.2 - k.t) * 2.5)); s.scale.setScalar(0.17 * Math.min(1, 0.4 + k.t * 2)); if (k.t < 3.2) return true; g.remove(s); s.material.dispose(); bubbles.splice(bubbles.indexOf(s), 1); return false; });
    }
    // Props left from a scene shrink away while the next begins.
    function leave() {
      const gone = [...props.children, ...held]; held.length = 0;
      gone.forEach(obj => { const s0 = obj.scale.clone(), k = { t: 0 }; fades.push(dt => { k.t += dt * 4; obj.scale.copy(s0).multiplyScalar(Math.max(0.01, 1 - k.t)); if (k.t < 1) return true; if (obj.parent) obj.parent.remove(obj); obj.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.userData.ownMat && x.material) x.material.dispose(); }); return false; }); });
      ticks.length = 0; still(P); P.head.rotation.set(0, 0, 0); m.rotation.x = 0; m.rotation.z = 0; m.position.y = gy();
    }
    function clean() { held.forEach(h => h.parent && h.parent.remove(h)); held.length = 0; for (let j = props.children.length - 1; j >= 0; j--) { const c2 = props.children[j]; props.remove(c2); c2.traverse(x => { if (x.geometry) x.geometry.dispose(); if (x.userData.ownMat && x.material) x.material.dispose(); }); } ticks.length = 0; }
    return {
      step(t, dt) {
        pose.before();
        if (!cur) start();
        const s = cur[i]; st += dt; const q = s && s.d ? Math.min(1, st / s.d) : 0;
        let done = true; try { done = !s || s.run(dt, t, q); } catch (e) { console.warn('behaviour', last, e); i = cur.length; }
        if (done) { i++; st = 0; if (i >= cur.length) { leave(); cur = null; } }
        pose.after(dt);
        for (let j = ticks.length - 1; j >= 0; j--) if (ticks[j](dt) === false) ticks.splice(j, 1);
        for (let j = fades.length - 1; j >= 0; j--) if (fades[j](dt) === false) fades.splice(j, 1);
        for (let j = ticksR.length - 1; j >= 0; j--) { const r = ticksR[j]; r.t += dt; r.m.scale.setScalar(1 + r.t * 4); r.m.material.opacity = 0.8 * (1 - r.t / 0.8); if (r.t > 0.8) { props.remove(r.m); r.m.material.dispose(); ticksR.splice(j, 1); } }
      },
      end() { clean(); fades.length = 0; bubbles.splice(0).forEach(b2 => { g.remove(b2); b2.material.dispose(); }); g.remove(props); },
      get doing() { return last; },
    };
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
    if (L.fence && FENCE[L.fence] && !(I && ['farm', 'stable', 'lake'].includes(I.key))) {
      // Round the island's edge, leaving a gap at the front for the path (on the beach, just along the dunes at the back).
      const pts = [], cr = I ? I.r - 0.04 : R - 0.05, n = Math.round(cr * 34);
      for (let i = 0; i < n; i++) { const a = i / n * PI * 2; if (I ? (I.key === 'beach' && Math.cos(a - I.a) > -0.45) || (I.noFence && I.noFence(a)) : Math.abs(a - P2) < 0.14) continue; pts.push([Math.cos(a) * cr, Math.sin(a) * cr, a]); }
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
  return { items: M, species, land, isle, toLocal, toWorld, ground, skirt, waterWall, caustics, isleGrass, arc, style, dress, ACT, kidModel, activity, brain, LAWN, ROCK, glow, emo };
};
