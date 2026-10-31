
/* ---------- A skill tree as a plant that grows from a seed ----------
   Each tree is one plant on a floating island, for the kid's band. It starts as a seed in the soil. Every quiz
   question answered right in a lesson grows the stalk a step (the plant takes the stage beside the questions).
   Every lesson passed unfurls a big leaf, right then left, carrying what the lesson earned on top: its XP, or the
   island prize it won. A prize waits in a locked bubble where its leaf will grow and unlocks onto the leaf when
   the lesson is passed. A finished unit puts a ring on the stalk that opens its challenge, and passing the last
   lesson opens a flower at the top. The camera follows the growing tip; drag, swipe or scroll to look up and
   down, and tap a label for its card. Without WebGL, viewTree falls back to a list. */
const PlantView = (() => {
  const T = window.THREE, G3 = C.G3;
  if (!T || !G3 || !G3.ok) return { ok: false };
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), lerp = (a, b, t) => a + (b - a) * t, smooth = t => t * t * (3 - 2 * t);
  const outBack = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
  const outBounce = t => (t < 0.55 ? (t / 0.55) ** 2 : t < 0.85 ? 1 - 0.12 * Math.sin((t - 0.55) / 0.3 * Math.PI) : 1 - 0.04 * Math.sin((t - 0.85) / 0.15 * Math.PI));
  const wait = ms => new Promise(r => setTimeout(r, ms * (reduced ? 0.4 : 1)));
  // This view renders in sRGB like the main island, so colours are given in sRGB and converted.
  const col = h => new T.Color(h).convertSRGBToLinear();
  const MC = {};
  function toon(hex, o = {}) {
    const k = `${hex}|${o.ds ? 1 : 0}|${o.vc ? 1 : 0}|${o.e ?? ''}`; if (!o.map && MC[k]) return MC[k];
    const m = new T.MeshToonMaterial({ color: col(hex), gradientMap: G3.GRAD, side: o.ds ? T.DoubleSide : T.FrontSide, vertexColors: !!o.vc, map: o.map || null, emissive: o.e != null ? col(o.e) : new T.Color(0) });
    G3.rimPatch(m); return o.map ? m : (MC[k] = m);
  }
  const RING = toon(0x8be06a), RING_GOLD = toon(0xffc93c);
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; };
  const faceted = g => { const f = g.index ? g.toNonIndexed() : g; f.computeVertexNormals(); return f; };
  // Bakes the pieces of scenery that never move on their own into one mesh per material, so a field of tufts costs
  // one draw call instead of eighty. Same geometry, same materials, same look; outline the result afterwards.
  // A mesh marked `keep`, or carrying children, stays as it is.
  function bake(group, only = null) {
    group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(), by = new Map();
    (only || (() => { const a = []; group.traverse(o => { if (o.isMesh && !o.userData.keep && !o.children.length) a.push(o); }); return a; })()).forEach(o => { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); });
    for (const [mat, list] of by) {
      if (list.length < 2) continue;
      const geos = list.map(o => o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))), indexed = geos.every(g => g.index);
      const parts = indexed ? geos : geos.map(g => (g.index ? g.toNonIndexed() : g)), names = Object.keys(parts[0].attributes).filter(k => parts.every(g => g.attributes[k]));
      const out = new T.BufferGeometry();
      for (const k of names) { const sz = parts[0].attributes[k].itemSize, arr = new Float32Array(parts.reduce((a, g) => a + g.attributes[k].count * sz, 0)); let at = 0; for (const g of parts) { arr.set(g.attributes[k].array, at); at += g.attributes[k].array.length; } out.setAttribute(k, new T.BufferAttribute(arr, sz)); }
      if (indexed) { const verts = parts.reduce((a, g) => a + g.attributes.position.count, 0), idx = new (verts > 65535 ? Uint32Array : Uint16Array)(parts.reduce((a, g) => a + g.index.count, 0)); let at = 0, base = 0; for (const g of parts) { for (let i = 0; i < g.index.count; i++) idx[at++] = g.index.array[i] + base; base += g.attributes.position.count; } out.setIndex(new T.BufferAttribute(idx, 1)); }
      list.forEach(o => o.parent.remove(o)); geos.forEach(g => g.dispose());
      const m = new T.Mesh(out, mat); m.userData.noInk = !!list[0].userData.noInk; group.add(m);
    }
    return group;
  }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  const GAME_NAME = { sort: 'Sort', order: 'Put in order', build: 'Build it', match: 'Match', route: 'Route', slider: 'Slider', price: 'Best price', scam: 'Scam spotter', path: 'Choose a path', debate: 'Debate', tap: 'Find them', budget: 'Budget planner', market: 'Market time-lapse', compound: 'Snowball', shop: 'Run a stall', timing: 'Timing', diff: 'Spot the difference', chat: 'Chat', mystery: 'Mystery box', island: 'Your island', gen: 'Quick maths', mcq: 'Quiz', tf: 'True or false', gap: 'Fill the gap' };

  /* State */
  let R = null, pace = null, glowTex = null, scene, cam, el, cv, tagsEl, cardEl, followEl, plant, planG = null, sky, sunSprite, clouds = [], signMesh, coinsG, seed, shells, stalk, stalkInk, coty, flower, sepals, outer, inner, rays, dots, goalStar, butterflies, guide = null, guideKind = '';
  let mode = 'tree', running = false, raf = 0, last = 0, t = 0, key = '', treeId = '', busy = false, celTok = 0, drag = null, prizeSig = '';
  let LS = [], US = [], Q = 1, UN = [], LEAVES = [], ITEMS = [], tagEls = [], utagEls = [], goalEl = null, prizeAt = {}, prizeGs = [];
  let done = [], real = [], udone = [], crowned = [], cur = -1, sel = null, bloomOn = false, passedA = 0, shown = 0, quizFresh = false, quizMax = 0;
  const V = { s: 0, shell: 0, shiver: 0, bloomT: 0, bud: 0 };
  const CAM = { y: 0.75, manual: null, idle: 0, az: 0.35, dist: 6, w: 1, h: 1, wide: true, sheet: 0, top: 0, cardW: 0 };

  /* The stalk follows one gentle S curve. Answers map onto it: the first right answer pushes a shoot clear of the
     seed, every lesson's questions take an equal share of the rest, and the bloom grows the last bit (TOP to 1). */
  const H = 18, BASE = 0.3, NS = 540, RAD = 10, TOP = 0.93;
  const curve = new T.CatmullRomCurve3([[0, BASE - 0.05, 0], [0.04, BASE + 1, 0.02], [-0.18, BASE + 3.2, 0.1], [0.2, BASE + 6, -0.08], [-0.16, BASE + 9, 0.06], [0.17, BASE + 12, -0.05], [-0.1, BASE + 15, 0.04], [0, BASE + H, 0]].map(p => V3(...p)), false, 'centripetal');
  const LEN = curve.getLength(), SPROUT = 0.95 / LEN, SP = [], SN = [], SB = [], STn = [];
  { const fr = curve.computeFrenetFrames(NS, false); for (let i = 0; i <= NS; i++) { SP.push(curve.getPointAt(i / NS)); SN.push(fr.normals[i]); SB.push(fr.binormals[i]); STn.push(fr.tangents[i]); } }
  const uOf = a => (a <= 0 ? 0 : SPROUT + (TOP - SPROUT) * Math.min(1, a / Q)), GOAL = curve.getPointAt(1).add(V3(0, 0.6, 0));
  function sample(u, out = {}) { const f = clamp(u, 0, 1) * NS, i0 = Math.floor(Math.min(f, NS - 1)), k = f - i0; out.p = (out.p || V3()).lerpVectors(SP[i0], SP[i0 + 1], k); out.n = (out.n || V3()).lerpVectors(SN[i0], SN[i0 + 1], k).normalize(); out.b = (out.b || V3()).lerpVectors(SB[i0], SB[i0 + 1], k).normalize(); out.t = (out.t || V3()).lerpVectors(STn[i0], STn[i0 + 1], k).normalize(); return out; }
  function radius(u, s) { const flare = 1 + 0.7 * Math.max(0, 1 - u * LEN / 0.45), tip = clamp((s - u) * LEN / 0.6, 0, 1); return (0.17 - 0.09 * u) * flare * (0.16 + 0.84 * Math.sqrt(tip)); }
  // The stalk's mesh is made once at full length and rewritten in place as it grows, drawing only the grown part,
  // so growing doesn't allocate a new geometry every frame.
  let builtS = -1;
  const SV = (NS + 1) * (RAD + 1) + 1, SPOS = new Float32Array(SV * 3), SNOR = new Float32Array(SV * 3), SIDX = new Uint16Array(NS * RAD * 6 + RAD * 3);
  const stalkGeo = new T.BufferGeometry();
  stalkGeo.setAttribute('position', new T.BufferAttribute(SPOS, 3)); stalkGeo.setAttribute('normal', new T.BufferAttribute(SNOR, 3)); stalkGeo.setAttribute('inkNormal', new T.BufferAttribute(SNOR, 3)); stalkGeo.setIndex(new T.BufferAttribute(SIDX, 1));
  function buildStalk(s) {
    if (Math.abs(s - builtS) < 0.0004) return; builtS = s;
    if (s <= 0.0005) { stalk.visible = false; return; } stalk.visible = true;
    const rings = Math.max(2, Math.ceil(s * NS)) + 1, ti = rings * (RAD + 1), q = {}; let k = 0;
    for (let i = 0; i < rings; i++) {
      const u = Math.min(s, i / NS), r = radius(u, s); sample(u, q);
      for (let j = 0; j <= RAD; j++) { const a = j / RAD * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), o = (i * (RAD + 1) + j) * 3, nx = c * q.n.x + sn * q.b.x, ny = c * q.n.y + sn * q.b.y, nz = c * q.n.z + sn * q.b.z; SPOS[o] = q.p.x + nx * r; SPOS[o + 1] = q.p.y + ny * r; SPOS[o + 2] = q.p.z + nz * r; SNOR[o] = nx; SNOR[o + 1] = ny; SNOR[o + 2] = nz; }
    }
    for (let i = 0; i < rings - 1; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; SIDX[k++] = a; SIDX[k++] = a + 1; SIDX[k++] = b; SIDX[k++] = b; SIDX[k++] = a + 1; SIDX[k++] = b + 1; }
    sample(s, q); SPOS[ti * 3] = q.p.x + q.t.x * 0.04; SPOS[ti * 3 + 1] = q.p.y + q.t.y * 0.04; SPOS[ti * 3 + 2] = q.p.z + q.t.z * 0.04; SNOR[ti * 3] = 0; SNOR[ti * 3 + 1] = 1; SNOR[ti * 3 + 2] = 0;
    const lastRing = (rings - 1) * (RAD + 1); for (let j = 0; j < RAD; j++) { SIDX[k++] = lastRing + j + 1; SIDX[k++] = lastRing + j; SIDX[k++] = ti; }
    const pa = stalkGeo.attributes.position, na = stalkGeo.attributes.normal, ia = stalkGeo.attributes.inkNormal;
    pa.updateRange.count = na.updateRange.count = ia.updateRange.count = (ti + 1) * 3; stalkGeo.index.updateRange.count = k;
    pa.needsUpdate = na.needsUpdate = ia.needsUpdate = stalkGeo.index.needsUpdate = true; stalkGeo.setDrawRange(0, k);
  }

  /* Leaves: a veined texture on a curved, slightly cupped blade */
  function leafShape(L, W, round) { const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(L * 0.25, W * (round ? 1.1 : 0.95), L * (round ? 0.8 : 0.7), W * (round ? 1 : 0.75), L, 0); s.bezierCurveTo(L * (round ? 0.8 : 0.7), -W * (round ? 1 : 0.75), L * 0.25, -W * (round ? 1.1 : 0.95), 0, 0); return s; }
  function leafGeo(L, W, round, droop, cup) {
    const g = new T.ExtrudeGeometry(leafShape(L, W, round), { depth: 0.035, bevelEnabled: false, curveSegments: 18 }); g.translate(0, 0, -0.0175); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - droop * x * x / L + cup * z * z / W); uv.setXY(i, x / L, (-z + W) / (2 * W)); }
    g.computeVertexNormals(); return g;
  }
  let leafM = null;
  const KNG = new T.TorusGeometry(1, 0.32, 8, 18);

  /* Scene pieces every plant shares: sky, island, seed, stalk, baby leaves, flower, butterflies */
  function world() {
    scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 1, 0.1, 400);
    scene.add(new T.HemisphereLight(col(0xdff2ff), col(0x7fbf6a), 0.75));
    const sun = new T.DirectionalLight(col(0xfff3dc), 0.95); sun.position.set(-6, 10, 8); scene.add(sun);
    sky = new T.Mesh(new T.SphereGeometry(200, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { top: { value: col(0x3f9cff) }, mid: { value: col(0x8fd0ff) }, low: { value: col(0xe8f7ff) } },
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vW; void main(){ float h = vW.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, low, smoothstep(0.0, -0.5, h)); gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }' }));
    scene.add(sky);
    const glow = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(0.18, 'rgba(255,240,170,1)'); r.addColorStop(0.32, 'rgba(255,230,140,.55)'); r.addColorStop(1, 'rgba(255,230,140,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    glowTex = glow;
    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: glow, depthWrite: false, transparent: true })); sunSprite.scale.set(36, 36, 1); scene.add(sunSprite);
    { const cm = toon(0xffffff), cg = new T.SphereGeometry(1, 18, 12); let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 18; i++) { const g = new T.Group(), n = 4 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const r = 0.9 + rnd() * 1.1, b = mesh(cg, cm, g, (k - n / 2) * 1.2 + rnd() * 0.4, rnd() * 0.5 + (k % 2) * 0.4, rnd() * 0.6); b.scale.set(r, r * 0.75, r); } bake(g); g.position.set(-22 + rnd() * 44, -3 + rnd() * 34, -14 - rnd() * 22); g.userData.v = 0.15 + rnd() * 0.25; g.scale.setScalar(0.8 + rnd() * 0.7); scene.add(g); clouds.push(g); } }

    const wld = new T.Group(); scene.add(wld); plant = new T.Group(); wld.add(plant);
    // The floating island: grass, a layered rock cone, a soil mound for the seed, tufts, daisies and a sign
    const isl = new T.Group(); wld.add(isl);
    mesh(new T.CylinderGeometry(3.1, 2.8, 0.5, 48), toon(0x6fcf4f), isl, 0, -0.25, 0);
    mesh(new T.TorusGeometry(2.95, 0.16, 8, 48), toon(0x58b83d), isl, 0, -0.02, 0).rotation.x = Math.PI / 2;
    const rockG = faceted(new T.ConeGeometry(2.85, 3.6, 11, 3)); rockG.rotateX(Math.PI);
    { const p = rockG.attributes.position, cs = [], A = col(0x9b7655), B = col(0x6f5040), Lt = col(0xc29a72); for (let i = 0; i < p.count; i++) { const band = Math.sin(p.getY(i) * 4.2 + Math.sin(p.getX(i) * 2) * 0.8), c = band > 0.35 ? Lt : band < -0.45 ? B : A; cs.push(c.r, c.g, c.b); } rockG.setAttribute('color', new T.Float32BufferAttribute(cs, 3)); }
    mesh(rockG, toon(0xffffff, { vc: 1 }), isl, 0, -2.3, 0);
    const soilG = new T.SphereGeometry(1.05, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    { const p = soilG.attributes.position, cs = [], A = col(0x7a4e2d), B = col(0x5e3a20); for (let i = 0; i < p.count; i++) { const c = Math.sin(p.getX(i) * 13) * Math.cos(p.getZ(i) * 11) > 0.55 ? B : A; cs.push(c.r, c.g, c.b); } soilG.setAttribute('color', new T.Float32BufferAttribute(cs, 3)); }
    mesh(soilG, toon(0xffffff, { vc: 1 }), isl).scale.y = 0.36;
    coinsG = new T.Group(); isl.add(coinsG); { const cg = new T.CylinderGeometry(0.2, 0.2, 0.05, 24); [[1.25, 0.35, 0.6], [-1.1, 0.7, -0.9], [0.2, -1.35, 0.3]].forEach(([x, z, r]) => mesh(cg, toon(0xffc93c), coinsG, x, 0.05, z).rotation.set(r, r * 2, 0.4)); }
    { const tg = new T.ConeGeometry(0.06, 0.38, 5); for (let i = 0; i < 26; i++) { const a = i * 2.4, d = 1.45 + (i % 5) * 0.28, tf = new T.Group(); tf.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); [-0.06, 0, 0.06].forEach((o, k) => { mesh(tg, toon(0x4fae36), tf, o, 0.16, (k - 1) * 0.03).rotation.z = o * 3; }); isl.add(tf); } }
    { const sg = new T.CylinderGeometry(0.02, 0.02, 0.36, 5), pg = new T.SphereGeometry(0.07, 8, 6), mg = new T.SphereGeometry(0.06, 8, 6);
      [[2.2, 0.9], [-2.1, -0.4], [0.9, 2.15], [-0.6, -2.2], [1.8, -1.5]].forEach(([x, z]) => { const f = new T.Group(); f.position.set(x, 0, z); mesh(sg, toon(0x4fae36), f, 0, 0.18, 0); for (let k = 0; k < 5; k++) mesh(pg, toon(0xffffff), f, Math.cos(k * 1.26) * 0.09, 0.38, Math.sin(k * 1.26) * 0.09).scale.y = 0.45; mesh(mg, toon(0xffd84d), f, 0, 0.4, 0); isl.add(f); }); }
    [[1.9, 1.6, 0.22], [-2.3, 0.9, 0.16], [-1.4, -1.9, 0.26]].forEach(([x, z, s]) => mesh(faceted(new T.DodecahedronGeometry(s)), toon(0xb9b2c4), isl, x, s * 0.4, z).rotation.set(x, z, 0));
    const sign = new T.Group(); sign.position.set(-1.75, 0, 1.35); sign.rotation.y = 0.5; isl.add(sign);
    mesh(new T.BoxGeometry(0.08, 0.7, 0.08), toon(0xc98a4b), sign, 0, 0.35, 0);
    const board = mesh(new T.BoxGeometry(0.95, 0.42, 0.06), toon(0xc98a4b), sign, 0, 0.72, 0);
    signMesh = mesh(new T.PlaneGeometry(0.86, 0.34), new T.MeshBasicMaterial(), board, 0, 0, 0.032); signMesh.userData.noInk = true;
    bake(coinsG).children.forEach(c => { c.userData.keep = true; }); bake(isl); G3.outline(isl);
    { const far = new T.Group(); [[-36, 4, -34, 1.6], [40, 13, -30, 2], [-38, 25, -28, 1.4]].forEach(([x, y, z, s]) => { const f = new T.Group(); f.position.set(x, y, z); f.scale.setScalar(s); mesh(new T.CylinderGeometry(2, 1.8, 0.4, 24), toon(0x7fd65f), f); mesh(faceted(new T.ConeGeometry(1.9, 2.4, 9)), toon(0xa98263), f, 0, -1.4, 0).rotation.x = Math.PI; mesh(new T.SphereGeometry(0.7, 12, 8), toon(0x4fae36), f, 0.4, 0.7, 0).scale.y = 1.3; far.add(f); }); scene.add(bake(far)); }

    // The seed: two half shells that split open on the first right answer
    seed = new T.Group(); seed.position.set(0, 0.4, 0); plant.add(seed);
    const shellG = new T.SphereGeometry(0.26, 22, 14, 0, Math.PI);
    shells = [0, 1].map(k => { const p = new T.Group(); seed.add(p); const m = mesh(shellG, toon(0xf0bd6a, { ds: 1 }), p); m.scale.set(1, 1.45, 1); m.rotation.y = k ? Math.PI : 0; m.userData.noInk = true; return p; });
    // A first sliver of stalk gives the outline its geometry; it is rebuilt as the plant grows.
    // The stalk changes length every frame, so it is never culled from a stale bounding box
    stalk = new T.Mesh(stalkGeo, toon(0x5cc13f)); stalk.frustumCulled = false; plant.add(stalk); G3.outline(stalk); stalkInk = stalk.children[0]; stalkInk.frustumCulled = false;

    leafM = toon(0xffffff, { map: canvasTex(256, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#53c447'); gr.addColorStop(0.5, '#7ddb5a'); gr.addColorStop(1, '#53c447'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8f59c'; g.lineCap = 'round'; g.lineWidth = 5; g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 6, h / 2); g.stroke();
      g.lineWidth = 3; for (let i = 1; i < 6; i++) { const x = i * w / 6.2; [1, -1].forEach(d => { g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 18, h / 2 - d * 20, x + 34, h / 2 - d * 44); g.stroke(); }); }
    }) });
    // Two round baby leaves near the soil, out with the first right answers
    coty = [1, -1].map(side => { const pv = new T.Group(); pv.position.copy(curve.getPointAt(0.72 / LEN)); pv.rotation.y = side > 0 ? 0.3 : Math.PI + 0.3; plant.add(pv); const tilt = new T.Group(); pv.add(tilt); tilt.rotation.z = 0.5; G3.outline(mesh(leafGeo(0.6, 0.26, true, 0.25, 0.25), leafM, tilt, 0.05, 0, 0)); pv.scale.setScalar(0.001); return pv; });

    // The flower: sepals and two rings of petals around a sunny centre, a closed bud until the last lesson
    flower = new T.Group(); plant.add(flower); flower.scale.setScalar(0.001);
    const petalShape = new T.Shape(); petalShape.moveTo(0, 0); petalShape.bezierCurveTo(0.36, 0.2, 0.44, 0.85, 0, 1.15); petalShape.bezierCurveTo(-0.44, 0.85, -0.36, 0.2, 0, 0);
    const petalRing = (n, len, c, base, open0, open1, offset) => {
      const g = new T.ExtrudeGeometry(petalShape, { depth: 0.03, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -0.015); g.scale(len / 1.15 * 0.9, len / 1.15, 1);
      { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 0.9 * x * x - 0.1 * y * y); } g.computeVertexNormals(); }
      const m = new T.MeshToonMaterial({ color: col(c), gradientMap: G3.GRAD, emissive: col(c).multiplyScalar(0.22) }); G3.rimPatch(m);
      return Array.from({ length: n }, (_, i) => { const yaw = new T.Group(); yaw.rotation.y = i / n * Math.PI * 2 + offset; flower.add(yaw); const tilt = new T.Group(); tilt.position.z = base; yaw.add(tilt); G3.outline(mesh(g, m, tilt)); return { tilt, open0, open1, d: i / n }; });
    };
    sepals = petalRing(5, 0.95, 0x3e9e31, 0.06, -0.15, 1.85, 0.3); outer = petalRing(8, 1.65, 0xff7db8, 0.12, -0.3, 1.1, 0); inner = petalRing(6, 1.15, 0xffc2dc, 0.08, -0.22, 0.75, 0.25);
    const heart = mesh(new T.SphereGeometry(0.38, 20, 12), toon(0xffd84d), flower, 0, 0.14, 0); heart.scale.y = 0.55; G3.outline(heart);
    { const dg = new T.SphereGeometry(0.035, 6, 4), ds = []; for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 0.07 + 0.17 * Math.sqrt(i / 14); ds.push(mesh(dg, toon(0xf08a24), flower, Math.cos(a) * r * 1.25, 0.33 - r * 0.35, Math.sin(a) * r * 1.25)); } bake(flower, ds); }
    rays = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(512, 512, (g, w) => { g.translate(w / 2, w / 2); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); const gr = g.createLinearGradient(0, 0, 0, -w / 2); gr.addColorStop(0, 'rgba(255,240,170,.55)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(0, -w / 2); g.fill(); } }), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    rays.scale.set(8, 8, 1); plant.add(rays);

    // A faint dotted path up to where the flower will open, so kids can see the journey ahead
    const DOTS = []; for (let d = 0.18; d < LEN * TOP; d += 0.32) DOTS.push(d / LEN);
    dots = new T.InstancedMesh(new T.SphereGeometry(0.045, 8, 6), new T.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: 0.75 }), DOTS.length); dots.userData.at = DOTS; dots.frustumCulled = false; plant.add(dots);
    goalStar = new T.Sprite(new T.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, opacity: 0.85 })); goalStar.scale.set(1.6, 1.6, 1); goalStar.position.copy(sample(1).p); plant.add(goalStar);

    butterflies = [0xff9f1c, 0x5b8cff].map(c => {
      const g = new T.Group(), wm = new T.MeshBasicMaterial({ transparent: true, side: T.DoubleSide, depthWrite: false, map: canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#' + c.toString(16).padStart(6, '0'); x.beginPath(); x.ellipse(w * 0.45, h * 0.36, w * 0.4, h * 0.3, -0.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(w * 0.4, h * 0.74, w * 0.28, h * 0.2, 0.4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.55, h * 0.3, w * 0.07, 0, 7); x.fill(); x.strokeStyle = '#2b2238'; x.lineWidth = 6; x.beginPath(); x.ellipse(w * 0.45, h * 0.36, w * 0.4, h * 0.3, -0.3, 0, Math.PI * 2); x.stroke(); }) });
      const wings = [1, -1].map(s => { const w = new T.Group(); g.add(w); const m = mesh(new T.PlaneGeometry(0.5, 0.5), wm, w, s * 0.25, 0, 0); if (s < 0) m.scale.x = -1; m.rotation.x = -Math.PI / 2; return w; });
      mesh(new T.CylinderGeometry(0.03, 0.03, 0.34, 6), new T.MeshBasicMaterial({ color: col(0x2b2238) }), g).rotation.x = Math.PI / 2;
      g.visible = false; scene.add(g); return { g, wings };
    });
  }
  function signFor(name) {
    const words = String(name).split(' '), lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
    if (signMesh.material.map) signMesh.material.map.dispose();
    signMesh.material.map = canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#c98a4b'; g.fillRect(0, 0, w, h); g.fillStyle = '#3b2412'; g.textAlign = 'center'; g.textBaseline = 'middle'; const fs = Math.min(38, 230 / Math.max(...lines.map(l => l.length)) * 1.7); g.font = `900 ${fs}px Nunito, ui-rounded, sans-serif`; lines.forEach((l, i) => g.fillText(l, w / 2, lines.length > 1 ? h * (i ? 0.72 : 0.3) : h / 2)); });
    signMesh.material.needsUpdate = true;
  }

  /* Particles: sparkles, leaf bits and petals */
  const P = [], PG = {}; let starTex = null; // leaf bits and petals share one plane each
  function burst(at, n, kind) {
    starTex = starTex || canvasTex(64, 64, (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = '#fff6c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); });
    for (let i = 0; i < n; i++) {
      let o;
      if (kind === 'star') { o = new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, color: col(i % 3 ? 0xfff2a8 : 0xffffff) })); o.scale.setScalar(0.28 + Math.random() * 0.2); }
      else { const c = kind === 'leaf' ? [0x5cc13f, 0x8be06a, 0x3e9e31][i % 3] : [0xff6fa8, 0xffa8cb, 0xffffff, 0xffd84d][i % 4]; o = new T.Mesh(PG[kind] || (PG[kind] = new T.PlaneGeometry(kind === 'leaf' ? 0.22 : 0.2, 0.13)), new T.MeshBasicMaterial({ color: col(c), side: T.DoubleSide, transparent: true })); }
      o.position.copy(at); scene.add(o);
      const a = Math.random() * Math.PI * 2, up = kind === 'petal' ? 2.5 + Math.random() * 3 : 1 + Math.random() * 2.2, sp = kind === 'petal' ? 2 + Math.random() * 3 : 1 + Math.random() * 1.6;
      P.push({ o, v: V3(Math.cos(a) * sp, up, Math.sin(a) * sp), life: 0, max: kind === 'petal' ? 4 + Math.random() * 2 : 1 + Math.random() * 0.6, spin: V3(Math.random() * 6, Math.random() * 6, Math.random() * 6), kind });
    }
  }
  function tickParticles(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt; const f = p.life / p.max;
      if (f >= 1) { scene.remove(p.o); p.o.material.dispose(); P.splice(i, 1); continue; }
      p.v.multiplyScalar(Math.exp(-(p.kind === 'star' ? 2.2 : 1.1) * dt)); p.v.y -= (p.kind === 'star' ? 1.5 : 1.2) * dt; if (p.kind === 'petal') p.v.x += Math.sin(p.life * 3 + i) * dt * 1.5;
      p.o.position.addScaledVector(p.v, dt); if (!p.o.isSprite) { p.o.rotation.x += p.spin.x * dt; p.o.rotation.y += p.spin.y * dt; p.o.rotation.z += p.spin.z * dt; }
      p.o.material.opacity = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
    }
  }
  const tipWorld = () => plant.localToWorld(sample(V.s).p.clone());
  function pulse(n) { setTimeout(() => { if (!running) return; burst(tipWorld(), 10, 'star'); Sound.step(n); }, 220); }

  function mount() {
    if (el) return;
    R = new T.WebGLRenderer({ antialias: true }); pace = G3.pacer ? G3.pacer(R, 2) : (R.setPixelRatio(Math.min(2, devicePixelRatio || 1)), () => {}); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.NoToneMapping;
    el = document.createElement('div'); el.className = 'pl';
    el.innerHTML = '<div class="pl-tags"></div><button class="pl-follow" type="button" hidden>⬇ Back to my plant</button><section class="pl-card" aria-live="polite"></section>';
    cv = R.domElement; cv.className = 'pl-cv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Your plant. Drag or scroll to look up and down the stalk, and tap a label to see its lesson.'); el.prepend(cv);
    tagsEl = el.querySelector('.pl-tags'); cardEl = el.querySelector('.pl-card'); followEl = el.querySelector('.pl-follow');
    followEl.onclick = () => { CAM.manual = null; showFollow(); Sound.tap(); };
    const top = () => sample(1).p.y + 1.5;
    cv.addEventListener('wheel', e => { e.preventDefault(); CAM.manual = clamp((CAM.manual ?? CAM.y) - e.deltaY * 0.012, 0.4, top()); CAM.idle = 0; showFollow(); }, { passive: false });
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cy: CAM.manual ?? CAM.y, az: CAM.az }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} cv.classList.add('drag'); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y, dx = e.clientX - drag.x; if (Math.abs(dy) > 3 || CAM.manual != null) { CAM.manual = clamp(drag.cy + dy * (CAM.dist / Math.max(300, CAM.h)) * 1.1, 0.4, top()); CAM.idle = 0; showFollow(); } CAM.az = drag.az - dx * 0.004; });
    const up = () => { drag = null; cv.classList.remove('drag'); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const ro = new (window.ResizeObserver || function () { return { observe() {} }; })(resize); ro.observe(el); ro.observe(cardEl);
    world();
  }

  /* The plan: this band's lessons in order, each with its share of the stalk and a big leaf where it ends, and a
     ring at the end of every unit */
  const PITCH = 0.2, ROLL = 0.22, LEAF_AZ = 0.35;
  const leafSide = i => (i % 2 ? -1 : 1);
  function plan(kid, tree) {
    if (planG) { planG.traverse(o => { if (o.userData.own) o.geometry.dispose(); }); dropItems(); plant.remove(planG); }
    planG = new T.Group(); plant.add(planG); prizeGs = []; prizeSig = ''; ITEMS = [];
    const pack = packFor(tree.id, bandOf(kid)); LS = []; US = []; let a = 0;
    for (const u of pack ? pack.units : []) { if (!u.lessons.length) continue; const ls = []; for (const l of u.lessons) { const w = Math.max(1, l.checks.length); ls.push(LS.length); LS.push({ l, u: US.length, from: a, to: a + w }); a += w; } US.push({ unit: u, ls }); }
    Q = Math.max(1, a); LS.forEach(x => { x.at = uOf(x.to); });
    // Leaves fan out to either side of where the camera usually looks from, so both show their tops
    LEAVES = LS.map((x, i) => {
      const side = leafSide(i), at = x.at - 0.01, L = lerp(1.65, 1.3, LS.length > 1 ? i / (LS.length - 1) : 0), pv = new T.Group(); pv.position.copy(sample(at).p);
      pv.rotation.y = (side > 0 ? LEAF_AZ - 0.35 : Math.PI + LEAF_AZ + 0.35) + ((i * 7) % 5 - 2) * 0.05; planG.add(pv);
      const pitch = new T.Group(); pv.add(pitch); const roll = new T.Group(); pitch.add(roll);
      const stem = mesh(new T.CylinderGeometry(0.035, 0.05, 0.5, 8), toon(0x4fae36), roll, 0.25, 0, 0); stem.rotation.z = Math.PI / 2; stem.userData.own = 1;
      mesh(leafGeo(L, L * 0.42, true, 0.12, 0.35), leafM, roll, 0.45, 0, 0).userData.own = 1;
      G3.outline(roll);
      // The spot on the blade's top where its XP or prize sits, found with the leaf fully open
      const padL = V3(0.45 + L * 0.55, 0.02 - 0.12 * L * 0.3, 0), padS = V3();
      pitch.rotation.z = PITCH; roll.rotation.x = side * ROLL; pv.updateMatrixWorld(true); planG.worldToLocal(roll.localToWorld(padS.copy(padL)));
      pv.scale.setScalar(0.001); return { pv, pitch, roll, side, at, t: 0, L, padL, padS, pad: padS.clone() };
    });
    UN = US.map(U => { const u = LS[U.ls[U.ls.length - 1]].at - 0.02, q = sample(u), m = new T.Mesh(KNG, RING); m.position.copy(q.p); m.quaternion.setFromUnitVectors(V3(0, 0, 1), q.t); m.scale.setScalar(0.001); G3.outline(m); planG.add(m); return { m, t: 0, gold: 0, at: u, r: radius(u, 1) * 1.15 }; });
    tagsEl.innerHTML = '';
    tagEls = LS.map((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl-tag'; b.dataset.g = 'plantSel'; b.dataset.i = i; tagsEl.appendChild(b); return b; });
    utagEls = US.map((U, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl-utag'; b.dataset.g = 'plantUnit'; b.dataset.i = i; tagsEl.appendChild(b); return b; });
    goalEl = document.createElement('div'); goalEl.className = 'pl-goal'; goalEl.textContent = '🌸 Bloom'; tagsEl.appendChild(goalEl);
    signFor(tree.name); coinsG.visible = tree.id === 'money';
  }
  // The kid's guide hovers beside the growing tip. Its colours are sRGB like the rest of this view.
  function setGuide(kind) {
    if (guide && guideKind === kind) return; if (guide) plant.remove(guide.g);
    const mine = new Set(), gm = guideModel(kind, (c, o = {}) => { const m = toon(c, { e: o.e }); mine.add(m); return m; });
    gm.g.traverse(o => { const m = o.material; if (!o.isMesh || mine.has(m) || m.userData.lin) return; m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); m.userData.lin = 1; });
    G3.outline(gm.g); guide = { g: new T.Group(), body: gm.g, P: gm.P, hop: 0, shake: 0 }; guide.g.add(gm.g); guide.g.scale.setScalar(0.5); guide.g.position.set(1.3, 0, 0.6); plant.add(guide.g); guideKind = kind;
  }

  /* What sits on a leaf: a gold star with the lesson's XP, or the island prize the lesson won */
  const TX = {}, sprite = (map, w, h, o = {}) => { const s = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, depthWrite: false, ...o })); s.scale.set(w, h, 1); return s; };
  function badgeTex(text, c1, c2, fg) {
    const k = `b|${text}|${c1}`; if (TX[k]) return TX[k];
    return (TX[k] = canvasTex(256, 104, (g, w, h) => {
      const r = 40, path = () => { g.beginPath(); g.moveTo(r + 6, 6); g.arcTo(w - 6, 6, w - 6, h - 6, r); g.arcTo(w - 6, h - 6, 6, h - 6, r); g.arcTo(6, h - 6, 6, 6, r); g.arcTo(6, 6, w - 6, 6, r); g.closePath(); };
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); path(); g.fillStyle = gr; g.fill(); g.lineWidth = 7; g.strokeStyle = '#2b2238'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(w / 2, 26, w / 2 - 34, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 8 ? 40 : 48}px Nunito, ui-rounded, sans-serif`; g.fillText(text, w / 2, h / 2 + 3);
    }));
  }
  // A padlock, shut or sprung open
  function lockTex(open) {
    const k = `lock|${open}`; if (TX[k]) return TX[k];
    return (TX[k] = canvasTex(128, 128, (g) => {
      g.lineCap = 'round'; g.lineWidth = 15; g.strokeStyle = '#2b2238'; const sh = () => { g.beginPath(); g.moveTo(40, 66); g.lineTo(40, 42); g.arc(64, 42, 24, Math.PI, 0); g.lineTo(88, open ? 30 : 66); g.stroke(); };
      g.save(); if (open) { g.translate(64, 0); g.rotate(-0.5); g.translate(-64, -16); } sh(); g.lineWidth = 7; g.strokeStyle = '#c9cfdc'; sh(); g.restore();
      const box = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); };
      g.fillStyle = '#2b2238'; box(22, 58, 84, 62, 14); const gr = g.createLinearGradient(0, 62, 0, 116); gr.addColorStop(0, '#ffe066'); gr.addColorStop(1, '#f2a91e'); g.fillStyle = gr; box(28, 64, 72, 50, 10);
      g.fillStyle = '#2b2238'; g.beginPath(); g.arc(64, 84, 8, 0, Math.PI * 2); g.fill(); g.fillRect(60, 86, 8, 16);
    }));
  }
  const bubbleTex = () => TX.bubble || (TX.bubble = canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2 - 4); r.addColorStop(0, 'rgba(255,255,255,0.06)'); r.addColorStop(0.8, 'rgba(220,245,255,0.3)'); r.addColorStop(1, 'rgba(255,255,255,0.9)');
    g.fillStyle = r; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(w * 0.33, w * 0.3, 26, 14, -0.7, 0, Math.PI * 2); g.fill();
  }));
  let STAR_G = null;
  function starG() {
    if (STAR_G) return STAR_G; const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.11 : 0.25, a = Math.PI / 2 + k * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    STAR_G = new T.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); STAR_G.center(); return STAR_G;
  }
  // Scales a prize model to about the same size as the leaf's star
  function prizeMesh(id) { const m = G3.prize && G3.prize(id); if (!m) return null; const b = new T.Box3().setFromObject(m); m.scale.setScalar(clamp(0.55 / Math.max(0.05, b.max.y - b.min.y), 0.8, 3.2)); return m; }
  // A locked bubble around a prize that is still to be won
  function encase(g) { const bubble = sprite(bubbleTex(), 1.05, 1.05), lock = sprite(lockTex(false), 0.34, 0.34); bubble.position.y = 0.28; lock.position.set(0.3, 0.02, 0); g.add(bubble, lock); return { bubble, lock }; }
  // What passing a lesson earned: saved with the pass, or found in the attempt log for passes from before that
  function earned(kid, id) {
    const g = prog(kid), d = (g.done || {})[id] || {}; if (d.xp != null || d.prize) return { xp: d.xp || 0, prize: d.prize || null };
    const e = (g.log || []).find(x => x.id === id && x.kind === 'lesson' && x.t && x.c / x.t >= 0.8); return { xp: e ? e.xp : XP.lesson, prize: null };
  }
  function freeG(g) { g.traverse(o => { if (o.isMesh && !o.userData.ink && o.geometry && o.geometry !== STAR_G) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); }); }
  function dropItems() { for (const it of ITEMS) if (it) { planG.remove(it.g); freeG(it.g); } ITEMS = []; }
  // Builds or keeps what sits on each passed lesson's leaf. The lesson being celebrated keeps its prize locked.
  function placeItems(kid, skip) {
    LS.forEach((x, i) => {
      const old = ITEMS[i]; if (!real[i]) { if (old) { planG.remove(old.g); freeG(old.g); ITEMS[i] = null; } return; }
      const e = earned(kid, x.l.id), info = e.prize && C.prizeInfo ? C.prizeInfo(e.prize) : null, sig = info ? `p:${e.prize}` : `x:${e.xp}`;
      // A prize left locked by a celebration that was cut short just sits on its leaf
      if (old && old.sig === sig) { if (old.state === 'locked' && x.l.id !== skip) { old.g.remove(old.bubble, old.lock); old.bubble.material.dispose(); old.lock.material.dispose(); old.state = 'on'; } return; }
      if (old) { planG.remove(old.g); freeG(old.g); }
      const g = new T.Group(), it = { g, i, sig, kind: 'xp', state: 'on', k: 0 }; planG.add(g); g.scale.setScalar(0.001);
      const m = info && prizeMesh(e.prize);
      if (m) { Object.assign(it, { kind: 'prize', m, info }); g.add(m); const halo = sprite(glowTex, 1.1, 1.1, { opacity: 0.4 }); halo.position.y = 0.25; g.add(halo); if (x.l.id === skip) { it.state = 'locked'; Object.assign(it, encase(g)); } }
      else { const s = mesh(starG(), toon(0xffc93c, { e: 0x5a3a00 }), g, 0, 0.3, 0); G3.outline(s); it.m = s; const b = sprite(badgeTex(e.xp > 0 ? `+${e.xp} XP` : 'Passed!', '#fff6c8', '#ffd84d', '#3a2400'), 0.86, 0.35); b.position.y = 0.78; g.add(b); it.badge = b; }
      ITEMS[i] = it;
    });
  }

  /* Progress */
  function refresh(kid, skip) {
    real = LS.map(x => passed(kid, x.l.id)); done = LS.map((x, i) => real[i] && x.l.id !== skip);
    passedA = LS.reduce((a, x, i) => a + (real[i] ? x.to - x.from : 0), 0);
    udone = US.map(U => U.ls.every(i => done[i])); crowned = US.map(U => ((prog(kid).units || {})[U.unit.id] || {}).best >= 0.8);
    cur = LS.findIndex((x, i) => !done[i] && (x.l.id === skip || available(kid, x.l)));
    const wasBloom = bloomOn; bloomOn = LS.length > 0 && done.every(Boolean);
    if (bloomOn && !wasBloom) { V.bloomT = 10; butterflies.forEach(b => { b.g.visible = true; }); }
    if (!bloomOn) { V.bloomT = 0; butterflies.forEach(b => { b.g.visible = false; }); }
    placeItems(kid, skip); placePrizes(kid); paintTags(kid);
  }
  // Snap every piece to where progress says it is, for a plant shown for the first time.
  function snap() {
    V.s = bloomOn ? 1 : uOf(shown); V.shell = shown > 0 || bloomOn ? 1 : 0; V.bud = budTarget();
    UN.forEach((k, i) => { k.t = udone[i] && k.at <= V.s + 0.004 ? 1 : 0; }); LEAVES.forEach((lf, i) => { lf.t = done[i] && lf.at <= V.s + 0.004 ? 1 : 0; });
    CAM.manual = null; CAM.y = followY(); CAM.dist = baseDist();
  }
  function budTarget() { if (bloomOn) return 1; const U = US[US.length - 1]; if (!U) return 0; const from = LS[U.ls[0]].from; return clamp((shown - from) / Math.max(1, Q - from), 0, 1) * 0.5; }
  // Island prizes: the next prize, and the one planned after it, wait in a locked bubble where the leaf of the
  // lesson that will win them is going to grow.
  function placePrizes(kid) {
    const ups = Prize.upcoming(kid); prizeAt = {}; let n = 0;
    LS.forEach((x, i) => { if (real[i]) return; n++; const u = ups.find(p => p.left === n); if (u) prizeAt[i] = u; });
    const sig = Object.entries(prizeAt).map(([i, u]) => `${i}:${u.id}`).join(','); if (sig === prizeSig) return; prizeSig = sig;
    for (const p of prizeGs) { planG.remove(p.g); freeG(p.g); } prizeGs = [];
    for (const [i, u] of Object.entries(prizeAt)) {
      const m = prizeMesh(u.id); if (!m) continue; const g = new T.Group(); g.add(m); const { bubble, lock } = encase(g);
      planG.add(g); prizeGs.push({ g, m, i: +i, bubble, lock });
    }
  }

  /* Labels that ride on the stalk */
  // A lesson's label sits just under its own leaf, so the space above every leaf is free for what it carries
  const sideOf = i => leafSide(i), UNDER = 30;
  function medalOf(kid, l) { const m = medal(kid, l); return m === 'gold' ? '🥇' : m === 'silver' ? '🥈' : '🥉'; }
  function paintTags(kid) {
    LS.forEach((x, i) => {
      const b = tagEls[i], l = x.l, d = done[i], isCur = i === cur, open = !d && !isCur && available(kid, l), pz = prizeAt[i], isSel = sel && sel.k === 'l' && sel.i === i, title = esc(local(l.title));
      b.className = `pl-tag ${d ? 'done' : isCur ? 'cur' : open ? 'open' : 'locked'}${isSel ? ' sel' : ''}`;
      b.setAttribute('aria-label', `Lesson ${l.unit}.${l.n}, ${local(l.title)}, ${d ? 'done' : isCur ? 'up next' : open ? 'ready' : 'locked'}`);
      b.innerHTML = d ? `<span class="n">${medalOf(kid, l)}</span>${title}` : isCur ? `<span class="n">▶</span><span><small>Up next${pz ? ' · wins a prize' : ''}</small>${title}</span>${pz ? `<span class="pz">${pz.info.icon}</span>` : ''}` : `<span class="n">${open ? `${l.unit}.${l.n}` : '🔒'}</span>${open ? title : `${l.unit}.${l.n}`}${pz ? `<span class="pz">${pz.info.icon}</span>` : ''}`;
      b._w = 0;
    });
    US.forEach((U, i) => { const b = utagEls[i]; b.className = `pl-utag${crowned[i] ? ' crown' : ''}${sel && sel.k === 'u' && sel.i === i ? ' sel' : ''}`; b.innerHTML = `${crowned[i] ? '👑' : '🏆'} Unit ${U.unit.n} ${crowned[i] ? 'crown won' : 'challenge'}`; b.setAttribute('aria-label', `Unit ${U.unit.n}, ${local(U.unit.title)}: ${crowned[i] ? 'crown won' : 'challenge open'}`); b._w = 0; });
  }
  const tmp = V3(), tq = {}, hide = b => { if (b._on !== false) { b.style.visibility = 'hidden'; b._on = false; } };
  function placeTags() {
    const W = CAM.w, Hh = CAM.h, topY = CAM.top + 6, botY = Hh - (CAM.wide ? 0 : CAM.sheet) - 10, maxX = CAM.wide ? W - CAM.cardW - 24 : W - 8, cy = CAM.manual ?? CAM.y;
    const hideBloom = bloomOn && V.bloomT > 1 && V.bloomT < 8 ? 0 : 1;
    // Puts a label beside a point on the plant: outward to the right (side 1) or left (-1), or centred below it
    // (0), moved down by dy pixels.
    const put = (b, p, side, fade, dy = 0) => {
      tmp.copy(p); plant.localToWorld(tmp); tmp.project(cam);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * Hh;
      if (!b._w) { b._w = b.offsetWidth; b._h = b.offsetHeight; }
      if (tmp.z > 1 || fade <= 0.02 || y < topY + b._h / 2 || y > botY - b._h || x < -200 || x > W + 200) return hide(b);
      if (b._on !== true) { b.style.visibility = 'visible'; b._on = true; }
      const left = side > 0 ? x + 26 : side < 0 ? x - 26 - b._w : x - b._w / 2, top = (side ? y - b._h / 2 : y) + dy;
      // Only labels that moved are written, so a still plant doesn't restyle the page every frame
      const tf = `translate(${clamp(left, 8, Math.max(8, maxX - b._w)).toFixed(1)}px,${top.toFixed(1)}px)`, op = fade.toFixed(2);
      if (b._tf !== tf) { b.style.transform = tf; b._tf = tf; } if (b._op !== op) { b.style.opacity = op; b._op = op; }
    };
    LS.forEach((x, i) => { const p = sample(x.at, tq).p; put(tagEls[i], p, sideOf(i), hideBloom * clamp(1.25 - Math.abs(p.y - cy) / 4.2, 0, 1), UNDER); });
    // A finished unit's label stacks under the label of its last lesson
    US.forEach((U, i) => { const j = U.ls[U.ls.length - 1], k = UN[i]; if (k.t < 0.6) { hide(utagEls[i]); return; } const p = sample(LS[j].at, tq).p; if (!utagEls[i]._w) { utagEls[i]._w = utagEls[i].offsetWidth; utagEls[i]._h = utagEls[i].offsetHeight; } put(utagEls[i], p, sideOf(j), hideBloom * clamp(1.25 - Math.abs(p.y - cy) / 4.2, 0, 1), UNDER + (tagEls[j]._h || 30) / 2 + 6 + utagEls[i]._h / 2); });
    put(goalEl, GOAL, 1, bloomOn ? 0 : clamp(1.2 - Math.abs(GOAL.y - cy) / 6, 0, 1));
  }

  /* The card beside the plant: the chosen lesson, a unit's challenge, or the finished plant */
  function card(kid) {
    const tree = TREE[treeId], s = sel || { k: 'l', i: 0 }; let h;
    if (s.k === 'b') {
      const left = crowned.filter(c => !c).length;
      h = `<div class="plc-ic">🌸</div><div class="plc-eb">${esc(tree.name)} · every lesson done</div><div class="plc-t">Your plant bloomed!</div><p class="plc-p">You passed all ${LS.length} lessons and grew ${LS.length} leaves. ${left ? `Tap a unit’s label to try its challenge: ${left === 1 ? 'one crown' : `${left} crowns`} still to win.` : 'You won every unit crown too!'}</p><div class="plc-act"><button class="g-go ghost" data-g="plantBloom">🌸 Watch it bloom again</button></div>`;
    } else if (s.k === 'u') {
      const U = US[s.i], all = udone[s.i];
      h = `<div class="plc-ic">${crowned[s.i] ? '👑' : '🏆'}</div><div class="plc-eb">Unit ${U.unit.n} · ${all ? 'Every lesson passed' : 'Lessons still to pass'}</div><div class="plc-t">${esc(local(U.unit.title))} challenge</div><p class="plc-p">Mixed questions from the whole unit, with no hints. Get 80% to win the crown.</p><div class="plc-chips"><span>❓ Up to 8 questions</span><span>✨ +${XP.challenge} XP</span></div><div class="plc-act">${all ? `<button class="g-go" data-g="challenge" data-id="${U.unit.id}">${crowned[s.i] ? 'Play again' : '▶ Start the challenge'}</button>` : `<button class="g-go ghost" data-g="locked">🔒 Finish every lesson in Unit ${U.unit.n} first</button>`}</div>`;
    } else {
      const x = LS[s.i], l = x.l, d = done[s.i], open = d || s.i === cur || available(kid, l), first = s.i === cur && !real.some(Boolean), pz = prizeAt[s.i];
      const game = l.play ? GAME_NAME[l.play.type] || 'Game' : null, prev = s.i > 0 ? LS[s.i - 1].l : null;
      const e = real[s.i] ? earned(kid, l.id) : null, won = e && e.prize && C.prizeInfo ? C.prizeInfo(e.prize) : null;
      const chips = [`📖 ${l.learn.length} learn card${l.learn.length === 1 ? '' : 's'}`, game ? `🎮 ${game}` : '', l.checks.length ? `🌱 ${l.checks.length} question${l.checks.length === 1 ? '' : 's'} to grow` : '', e ? `✨ Earned +${e.xp} XP` : `✨ +${XP.lesson} XP`].filter(Boolean);
      const act = !open ? `<button class="g-go ghost" data-g="locked">🔒 ${prev ? `Pass “${esc(local(prev.title))}” first` : 'Pass the unit before this one first'}</button>` : `<button class="g-go" data-g="lesson" data-id="${l.id}">${d ? 'Play again' : first ? '🌱 Plant my seed' : '▶ Start lesson'}</button>`;
      // What it takes to move on, said plainly: kids need telling at every step
      const goal = d ? '' : !open ? (prev ? `🎯 To open this lesson, go back to “${esc(local(prev.title))}” and ${passGoal(prev.checks.length)}.` : '🎯 To open this lesson, pass every lesson in the unit before it.')
        : l.checks.length ? `🎯 ${passGoal(l.checks.length, true)} at the end to pass${s.i + 1 < LS.length ? ' and open the next lesson' : ''}.` : '';
      h = `<div class="plc-ic">${esc(l.icon)}</div><div class="plc-eb">Unit ${l.unit} · Lesson ${l.n}${d ? ` · ${medalOf(kid, l)}` : ''}</div><div class="plc-t">${esc(local(l.title))}</div><p class="plc-p">${esc(local(l.hook))}</p>
        ${first ? `<ul class="plc-how"><li><span>🌱</span>Every question you get right helps your seed grow.</li><li><span>🍃</span>Pass a lesson and a big leaf grows, with your XP or a prize on top.</li><li><span>🌸</span>Pass all ${LS.length} lessons and it blooms.</li></ul>` : `<div class="plc-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>`}
        ${won ? `<div class="plc-prize ${won.big ? 'big' : ''}"><span>${won.icon}</span><span><small>Unlocked on this leaf</small><b>${esc(won.name)}</b></span></div>` : pz ? `<div class="plc-prize ${pz.info.big ? 'big' : ''}"><span>${pz.info.icon}</span><span><small>${pz.planned ? 'Planned prize' : 'Prize'}</small><b>${pz.planned ? 'Should win' : 'Pass this to win'} ${esc(pz.info.name)}</b></span></div>` : ''}${goal ? `<p class="plc-goal">${goal}</p>` : ''}<div class="plc-act">${act}</div>`;
    }
    cardEl.innerHTML = h; cardEl.classList.remove('in'); void cardEl.offsetWidth; cardEl.classList.add('in');
  }
  function pickDefault(kid) { sel = cur >= 0 ? { k: 'l', i: cur } : bloomOn ? { k: 'b' } : { k: 'l', i: 0 }; paintTags(kid); card(kid); }
  function select(k, i) {
    const kid = kidNow(); if (!kid || busy || (k === 'l' && !LS[i]) || (k === 'u' && !US[i])) return;
    sel = { k, i }; paintTags(kid); card(kid); Sound.tap();
    // Look at what was tapped; the current lesson and the bloom go back to following the tip.
    CAM.manual = k === 'u' ? sample(UN[i].at).p.y : k === 'l' && i !== cur ? sample(LS[i].at).p.y + 0.1 : null; CAM.idle = 0; showFollow();
  }
  function showFollow() { if (followEl) followEl.hidden = mode !== 'tree' || CAM.manual == null || Math.abs(CAM.manual - followY()) < 0.6; }
  const tipY = () => sample(V.s).p.y;
  const followY = () => (bloomOn ? tipY() - lerp(0.4, 1.3, smooth(clamp(V.bloomT / 2.5, 0, 1))) : Math.max(1, tipY() - 0.2));
  const TAN = Math.tan(Math.PI / 9); // half the camera's 40° view
  const baseDist = () => {
    const near = smooth(clamp(V.s / 0.12, 0, 1)), d = cam.aspect < 0.8 ? lerp(8.6, 10.5, near) : lerp(6.6, 8.2, near);
    // Far enough back that a whole leaf fits beside the stalk in the space the card leaves
    return Math.max(d, lerp(1.2, 2.65, near) * CAM.h / (Math.max(240, CAM.w - CAM.cardW) * TAN));
  };

  /* The moment a lesson is passed for the first time: the stalk catches up, the lesson's leaf unfurls and its XP
     pops up on top, or its prize unlocks onto it; a finished unit adds a ring, and after the last lesson the flower
     opens. */
  async function celebrate(kid, id, fresh, tok) {
    const i = LS.findIndex(x => x.l.id === id), x = LS[i], w = x.to - x.from;
    busy = true; refresh(kid, id); const full = passedA;
    shown = fresh ? full - w : clamp(shown, full - w, full); if (fresh) snap();
    sel = { k: 'l', i }; paintTags(kid); card(kid); CAM.manual = null; showFollow();
    const ok = () => tok === celTok && running, padWorld = () => plant.localToWorld(LEAVES[i].pad.clone());
    await wait(500);
    while (shown < full) { if (!ok()) return; shown++; pulse(shown); await wait(380); }
    for (let k = 0; k < 20 && Math.abs(uOf(shown) - V.s) > 0.004; k++) { await wait(80); if (!ok()) return; }
    done[i] = true; Sound.star(2); paintTags(kid);
    setTimeout(() => { if (ok()) burst(padWorld(), 16, 'leaf'); }, 350);
    await wait(1500); if (!ok()) return;
    const it = ITEMS[i];
    if (it && it.state === 'locked') { it.state = 'unlocking'; it.k = 0; await wait(3000); if (!ok()) return; }
    else { Sound.step(4); burst(padWorld().add(V3(0, 0.4, 0)), 12, 'star'); await wait(900); if (!ok()) return; }
    if (US[x.u].ls.every(j => done[j])) {
      udone[x.u] = true; UN[x.u].gold = 1; Sound.fanfare(); C.toast(`Unit ${US[x.u].unit.n} done! Its challenge is open.`);
      setTimeout(() => { if (ok()) burst(plant.localToWorld(sample(UN[x.u].at).p.clone()), 14, 'star'); }, 300);
      await wait(1600); if (!ok()) return;
    }
    if (done.every(Boolean)) { bloom(); await wait(4200); if (!ok()) return; }
    busy = false; refresh(kid); pickDefault(kid);
  }
  function bloom() {
    bloomOn = true; V.bloomT = 0; CAM.manual = null; showFollow(); sepals.concat(outer, inner).forEach(p => { p.tilt.rotation.x = p.open0; });
    butterflies.forEach(b => { b.g.visible = false; });
    setTimeout(() => { if (running) Sound.fanfare(); }, 1400);
    setTimeout(() => { if (!running) return; const at = V3(); flower.getWorldPosition(at); burst(at, 70, 'petal'); burst(at, 30, 'star'); butterflies.forEach(b => { b.g.visible = true; }); FX.rain(['#FF7DB8', '#FFC2DC', '#FFE066', '#fff', '#7CF5B5']); }, 2300);
  }

  function resize() {
    if (!R || !el.isConnected) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const w = r.width, h = r.height; R.setSize(w, h, false); cam.aspect = w / h; CAM.w = w; CAM.h = h;
    const quiz = mode === 'quiz', bar = !quiz && el.parentNode && el.parentNode.querySelector('.gw-top');
    CAM.wide = !quiz && w > 760 && w / h >= 0.8; CAM.top = bar ? bar.getBoundingClientRect().bottom - r.top : 0;
    el.classList.toggle('wide', CAM.wide); el.classList.toggle('phone', !quiz && !CAM.wide); el.style.setProperty('--pl-top', `${Math.round(CAM.top + 8)}px`);
    CAM.cardW = CAM.wide ? cardEl.offsetWidth + 16 : 0; CAM.sheet = !quiz && !CAM.wide ? cardEl.offsetHeight + 12 : 0;
    // Shift the picture so the plant sits in the space the card and top bar (or the guide's speech bubble) leave free.
    if (quiz) cam.setViewOffset(w, h, 0, -Math.min(50, h * 0.1), w, h); else cam.setViewOffset(w, h, CAM.wide ? Math.min(220, CAM.cardW / 2) : 0, (CAM.sheet - CAM.top) / 2, w, h);
    cam.updateProjectionMatrix(); tagEls.concat(utagEls, goalEl ? [goalEl] : []).forEach(b => { b._w = 0; });
  }

  /* Every frame */
  const tipQ = {}, right = V3(), fwd = V3(), gp = V3(), dotQ = {}, dotM = new T.Matrix4(), bfV = V3(), UP = V3(0, 1, 0);
  const hover = (g, lf, i) => { g.position.copy(lf.padS); g.position.y += 0.62 + (reduced ? 0 : Math.sin(t * 2 + i) * 0.06); };
  // The bubble and its lock sit on the camera's side of the prize, so they show in front of it
  function faceBubble(o, i) { o.bubble.position.set(0, 0.28, 0).addScaledVector(fwd, 0.42); o.lock.position.set(0, 0.04, 0).addScaledVector(right, 0.3).addScaledVector(fwd, 0.55); o.lock.material.rotation = reduced ? 0 : Math.sin(t * 3 + i) * 0.08; }
  // The unlock: the lock shakes and springs open, the bubble pops, and the prize drops onto its leaf with a spin
  // under an "Unlocked!" badge.
  const UNLOCK = 3.2;
  function unlockStep(it, lf, dt) {
    const k = (it.k += dt), g = it.g; g.scale.setScalar(1);
    if (k < 0.75) { hover(g, lf, it.i); faceBubble(it, it.i); it.lock.material.rotation = Math.sin(k * 38) * 0.35 * (k / 0.75); it.bubble.scale.setScalar(1.05 * (1 + Math.sin(k * 14) * 0.05)); it.m.rotation.y += dt * 0.7; return; }
    if (!it.popped) {
      it.popped = 1; it.from = g.position.clone(); it.spin0 = it.m.rotation.y; it.lock.material.map = lockTex(true); it.lock.material.rotation = 0; it.lock.material.needsUpdate = true;
      const at = plant.localToWorld(g.position.clone().add(V3(0, 0.28, 0))); burst(at, 22, 'star'); burst(at, 10, 'petal');
      it.rays = sprite(rays.material.map, 2.4, 2.4, { blending: T.AdditiveBlending, opacity: 0 }); it.rays.position.y = 0.3; g.add(it.rays);
      it.label = sprite(badgeTex('Unlocked!', '#a8f7cd', '#2fb35a', '#0b3d1f'), 0.001, 0.001); it.label.position.y = 1.1; g.add(it.label);
      Sound.star(3); if (it.info.big) setTimeout(() => { if (running) Sound.fanfare(); }, 250); C.toast(`You unlocked ${it.info.name}!`);
    }
    g.position.lerpVectors(it.from, lf.pad, outBounce(clamp((k - 0.75) / 0.65, 0, 1)));
    it.m.rotation.y = it.spin0 + (1 - (1 - clamp((k - 0.75) / 1.3, 0, 1)) ** 3) * Math.PI * 4;
    const b = clamp((k - 0.75) / 0.25, 0, 1); it.bubble.scale.setScalar(1.05 * (1 + b * 0.7)); it.bubble.material.opacity = 1 - b;
    const lk = clamp((k - 0.75) / 0.6, 0, 1); it.lock.position.set(0, 0.04 + lk * 0.8, 0).addScaledVector(right, 0.3 + lk * 0.2).addScaledVector(fwd, 0.55); it.lock.material.opacity = 1 - lk;
    it.rays.material.opacity = 0.75 * clamp((k - 0.8) / 0.3, 0, 1) * clamp((UNLOCK - k) / 0.8, 0, 1); it.rays.material.rotation = k * 0.8;
    const ls = Math.max(0.001, outBack(clamp((k - 0.95) / 0.4, 0, 1))); it.label.scale.set(1.15 * ls, 0.47 * ls, 1); it.label.material.opacity = clamp((UNLOCK - k) / 0.5, 0, 1);
    if (k >= UNLOCK) { [it.bubble, it.lock, it.rays, it.label].forEach(s => { g.remove(s); s.material.dispose(); }); it.state = 'on'; }
  }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016) * (reduced ? 1.6 : 1); last = now; t += dt;
    // Growth eases toward the answers shown
    V.s += ((bloomOn ? 1 : uOf(shown)) - V.s) * (1 - Math.exp(-dt * (bloomOn ? 1.2 : 2.6)));
    buildStalk(V.s);
    if (Math.abs(V.s - (dots.userData.s ?? -1)) > 0.002) { dots.userData.s = V.s; dots.userData.at.forEach((u, i) => { sample(u, dotQ); const k = u > V.s + 0.01 ? 1 : 0; dotM.makeScale(k, k, k); dotM.setPosition(dotQ.p); dots.setMatrixAt(i, dotM); }); dots.instanceMatrix.needsUpdate = true; }
    V.shell = lerp(V.shell, shown > 0 || bloomOn ? 1 : 0, 1 - Math.exp(-dt * 3));
    seed.scale.setScalar(shown > 0 || bloomOn || reduced ? 1 : 1 + Math.sin(t * 3) * 0.05);
    shells.forEach((p, k) => { p.rotation.x = (k ? -1 : 1) * V.shell * 1.05; p.position.z = (k ? -1 : 1) * V.shell * 0.12; p.position.y = -V.shell * 0.1; });
    // Pieces still at zero size are hidden, so they cost nothing to draw
    coty.forEach((c, k) => { const s = outBack(clamp((V.s - 0.8 / LEN) / (0.15 / LEN), 0, 1)); c.scale.setScalar(Math.max(0.001, s)); c.visible = s > 0.001; c.children[0].rotation.z = 0.5 + Math.sin(t * 1.7 + k) * 0.04; });
    UN.forEach((k, i) => { const on = udone[i] && k.at <= V.s + 0.004; k.t = lerp(k.t, on ? 1 : 0, 1 - Math.exp(-dt * 5)); const s = Math.max(0.001, outBack(clamp(k.t, 0, 1)) * k.r); k.m.scale.set(s, s, s * 0.8); k.m.visible = k.t > 0.002; k.gold = Math.max(0, k.gold - dt * 0.8); k.m.material = crowned[i] || k.gold > 0.05 ? RING_GOLD : RING; });
    LEAVES.forEach((lf, i) => { const on = done[i] && lf.at <= V.s + 0.004; lf.t = clamp(lf.t + (on ? dt / 1.4 : -dt * 3), 0, 1); lf.pv.scale.setScalar(Math.max(0.001, outBack(lf.t))); lf.pv.visible = lf.t > 0; const o = smooth(lf.t); lf.pitch.rotation.z = lerp(1.35, PITCH, o) + Math.sin(t * 1.3 + i) * 0.025; lf.roll.rotation.x = lf.side * lerp(1.3, ROLL, o) + Math.sin(t * 2.1 + i) * 0.03; });
    // The bud rides the tip through the last unit, then opens
    sample(V.s, tipQ); flower.position.copy(tipQ.p); flower.quaternion.setFromUnitVectors(UP, tipQ.t);
    if (bloomOn) V.bloomT += dt;
    V.bud = lerp(V.bud, budTarget(), 1 - Math.exp(-dt * 2)); flower.scale.setScalar(Math.max(0.001, V.bud)); flower.visible = V.bud > 0.0015;
    const open = bloomOn ? smooth(clamp((V.bloomT - 1.6) / 2.2, 0, 1)) : 0;
    sepals.concat(outer, inner).forEach(p => { const o = smooth(clamp(open * 1.3 - p.d * 0.3, 0, 1)); p.tilt.rotation.x = lerp(p.open0, p.open1, o) + (open > 0.99 ? Math.sin(t * 1.5 + p.d * 6) * 0.03 : 0); });
    rays.position.copy(tipQ.p); rays.material.opacity = bloomOn ? clamp((V.bloomT - 2.2) / 1.2, 0, 0.7) * (0.8 + Math.sin(t * 2) * 0.15) : 0; rays.material.rotation = t * 0.15; rays.visible = rays.material.opacity > 0;
    butterflies.forEach((b, k) => { if (!b.g.visible) return; const a = t * (0.7 + k * 0.25) + k * 3, r = 1.8 + Math.sin(t * 0.6 + k) * 0.4, c = flower.getWorldPosition(bfV); b.g.position.set(c.x + Math.cos(a) * r, c.y + 0.4 + Math.sin(t * 2 + k) * 0.5, c.z + Math.sin(a) * r); b.g.rotation.y = -a; const f = Math.sin(t * 22 + k) * 0.9; b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f; });
    V.shiver = Math.max(0, V.shiver - dt * 1.8);
    plant.rotation.z = (reduced ? 0 : Math.sin(t * 0.8) * 0.012) + Math.sin(t * 38) * V.shiver * 0.02;
    goalStar.material.opacity = bloomOn ? 0 : 0.55 + Math.sin(t * 2.4) * 0.3; goalStar.visible = !bloomOn;
    clouds.forEach(c => { c.position.x += c.userData.v * dt; if (c.position.x > 26) c.position.x = -26; });
    tickParticles(dt);
    // The guide perches on the newest leaf beside the stalk, clear of the labels and of what the leaves carry, and
    // hops up to each new leaf. Before the first leaf it stands by the seed, and around the open flower it flies.
    right.set(Math.cos(CAM.az), 0, -Math.sin(CAM.az)); fwd.set(Math.sin(CAM.az), 0, Math.cos(CAM.az));
    if (guide) {
      let tl = -1; LEAVES.forEach((lf, i) => { if (lf.t > 0.85) tl = i; });
      const lf = tl >= 0 && !open ? LEAVES[tl] : null, side = lf ? lf.side : 1, g = guide.g;
      if (lf) planG.worldToLocal(lf.roll.localToWorld(gp.set(0.45 + lf.L * 0.1, 0.03, 0)));
      else { gp.copy(tipQ.p).addScaledVector(right, side * lerp(1.15, 2.4, open)).addScaledVector(fwd, 0.35); gp.y = Math.max(0, gp.y - 0.95 - open * 0.7 - (V.s < 0.03 ? 1 : 0)); }
      g.position.lerp(gp, 1 - Math.exp(-dt * 3)); g.scale.setScalar(0.5 * clamp(CAM.dist / 9, 1, 1.15)); guide.hop = Math.max(0, guide.hop - dt * 1.6); guide.shake = Math.max(0, guide.shake - dt * 2);
      const air = g.position.distanceTo(gp) > 0.15 || (!lf && g.position.y > 0.08), P2 = guide.P; guide.body.position.y = Math.sin(guide.hop * Math.PI) * 0.6 + (air && !reduced ? Math.sin(t * 2.2) * 0.06 : 0);
      g.rotation.y = CAM.az - side * 0.5 + (guide.hop > 0 ? (1 - guide.hop) * Math.PI * 2 : 0); g.rotation.z = Math.sin(t * 30) * guide.shake * 0.12;
      const wv = air || guide.hop > 0 ? 0.6 + Math.sin(t * 18) * 0.5 : 0.06; P2.wingL.rotation.z = wv; P2.wingR.rotation.z = -wv; P2.head.rotation.z = Math.sin(t * 0.8) * 0.1;
    }
    // What sits on the leaves rides on them as they sway. Prizes still to win wait in their bubbles above where
    // their leaf will grow, and a prize just won unlocks onto its leaf.
    LEAVES.forEach(lf => { if (lf.t > 0.02) { lf.roll.updateWorldMatrix(true, false); planG.worldToLocal(lf.roll.localToWorld(lf.pad.copy(lf.padL))); } else lf.pad.copy(lf.padS); });
    for (const p of prizeGs) { hover(p.g, LEAVES[p.i], p.i); p.m.rotation.y = t * 0.7 + p.i; faceBubble(p, p.i); if (p.m.userData.tick) p.m.userData.tick(t, dt); }
    for (const it of ITEMS) {
      if (!it) continue; const lf = LEAVES[it.i], g = it.g;
      if (it.state === 'locked') { hover(g, lf, it.i); g.scale.setScalar(1); g.visible = true; it.m.rotation.y = t * 0.7 + it.i; faceBubble(it, it.i); }
      else if (it.state === 'unlocking') unlockStep(it, lf, dt);
      else { const sc = outBack(smooth(clamp((lf.t - 0.7) / 0.3, 0, 1))); g.position.copy(lf.pad); g.scale.setScalar(Math.max(0.001, sc)); g.visible = sc > 0; it.m.rotation.y = t * (it.kind === 'xp' ? 1.2 : 0.5) + it.i; if (it.badge) it.badge.position.y = 0.78 + Math.sin(t * 2.2 + it.i) * 0.03; }
      if (it.kind === 'prize' && it.m.userData.tick) it.m.userData.tick(t, dt);
    }
    // Camera: follows the tip; a drag, swipe or scroll looks around and it drifts back after a while
    CAM.idle += dt; if (CAM.manual != null && CAM.idle > 8 && !drag) { CAM.manual = null; showFollow(); }
    CAM.y += ((CAM.manual ?? followY()) - CAM.y) * (1 - Math.exp(-dt * 2.2));
    const bl = bloomOn ? smooth(clamp(V.bloomT / 3, 0, 1)) : 0; CAM.dist = lerp(CAM.dist, baseDist() * lerp(1, 1.12, bl), 1 - Math.exp(-dt * 1.5));
    if (bloomOn && !drag && !reduced) CAM.az += dt * 0.18; else if (!reduced && !drag) CAM.az += (0.35 + Math.sin(t * 0.12) * 0.25 - CAM.az) * dt * 0.2;
    cam.position.set(Math.sin(CAM.az) * CAM.dist, CAM.y + CAM.dist * lerp(0.16, 0.3, bl), Math.cos(CAM.az) * CAM.dist); cam.lookAt(0, CAM.y, 0);
    sky.position.copy(cam.position); sunSprite.position.set(cam.position.x - 40, cam.position.y + 30, cam.position.z - 90);
    pace(now); G3.inkFor(R); R.render(scene, cam);
    if (mode === 'tree') placeTags();
  }

  // Builds the plant for a kid's tree, or keeps the one already built. Returns true when it was built fresh.
  function ensure(kid, tree) {
    mount(); setGuide(prog(kid).guide || 'kea');
    const k = `${kid.id}|${tree.id}|${bandOf(kid)}|${(packFor(tree.id, bandOf(kid)) || { units: [] }).units.map(u => u.lessons.map(l => l.checks.length).join('.')).join(',')}`;
    if (k === key) return false; key = k; treeId = tree.id; plan(kid, tree); return true;
  }
  return {
    ok: true,
    // The full-screen plant for a tree. `celebrateId` is a lesson just passed for the first time.
    show(host, kid, tree, celebrateId) {
      mount(); Prize.tick(kid); mode = 'tree'; el.classList.remove('quiz'); host.appendChild(el);
      const fresh = ensure(kid, tree), tok = ++celTok; busy = false; resize(); this.start();
      if (celebrateId && LS.some(x => x.l.id === celebrateId)) { celebrate(kid, celebrateId, fresh, tok); return; }
      refresh(kid); shown = passedA; if (fresh) snap(); pickDefault(kid); showFollow();
    },
    // The plant on the lesson stage during the quiz; `right` is how many questions are already right this time.
    quiz(host, kid, l, right) {
      const tree = TREE[l.tree]; if (!tree) return false;
      mount(); mode = 'quiz'; el.classList.add('quiz'); if (el.parentNode !== host) host.insertBefore(el, host.querySelector('.gw-say'));
      const fresh = ensure(kid, tree), x = LS.find(y => y.l.id === l.id); ++celTok; busy = false; refresh(kid); quizFresh = !passed(kid, l.id) && !!x;
      quizMax = quizFresh ? passedA + x.to - x.from : passedA; shown = Math.min(quizMax, passedA + (quizFresh ? right : 0));
      if (fresh) snap(); CAM.manual = null; resize(); this.start(); return true;
    },
    answer(ok) {
      if (mode !== 'quiz' || !running) return;
      if (ok) { if (quizFresh) shown = Math.min(quizMax, shown + 1); pulse(shown); if (guide) guide.hop = 1; } else { V.shiver = 1; if (guide) guide.shake = 1; }
      CAM.manual = null;
    },
    select: i => select('l', i),
    unit: i => select('u', i),
    bloomAgain() { if (!bloomOn || busy) return; bloom(); },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); ++celTok; busy = false; if (el && mode === 'quiz') el.remove(); },
  };
})();

const PLANT_CSS = `
.gw[data-view=tree]{grid-template-rows:0 minmax(0,1fr)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=tree]{grid-template-rows:minmax(0,1fr);grid-template-columns:0 minmax(0,1fr)} }
.gw[data-view=tree] .gw-ui{overflow:hidden;padding-bottom:0}
.gw[data-view=tree] .gw-top{position:absolute;left:0;right:0;top:0;background:linear-gradient(color-mix(in srgb,var(--gh) 45%,#0B1A4A),transparent)}
.pl{position:absolute;inset:0;overflow:hidden;background:#8FD0FF}
.gw-stage>.pl{z-index:0}
.gw-stage>.gw-say{z-index:1}
.pl-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.pl-cv.drag{cursor:grabbing}
.pl-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.pl.quiz .pl-tags,.pl.quiz .pl-card,.pl.quiz .pl-follow{display:none}
.pl-tag,.pl-utag,.pl-goal{position:absolute;left:0;top:0;visibility:hidden;will-change:transform;white-space:nowrap}
.pl-tag{pointer-events:auto;display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border:0;border-radius:999px;background:#fff;color:#16203D;font:800 13px/1.15 var(--f-round);box-shadow:0 6px 16px -8px rgba(8,20,60,.6);cursor:pointer}
.pl-tag .n{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:#E6EDF8;font:900 12px var(--f-round)}
.pl-tag.done{background:#EAF8EE}
.pl-tag.done .n{background:#FFF3C4}
.pl-tag.cur{padding:6px 14px 6px 6px;font-size:15px;box-shadow:0 0 0 3px #FFC93C,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag.cur .n{background:#FFC93C;color:#5A3A00;height:30px;min-width:30px;border-radius:15px}
.pl-tag.cur small{display:block;font:900 10px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#B07800}
.pl-tag.locked{background:rgba(255,255,255,.7);color:rgba(22,32,61,.7);box-shadow:none}
.pl-tag.sel{box-shadow:0 0 0 3px #fff,0 0 0 6px #2FB35A,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag.cur.sel{box-shadow:0 0 0 3px #FFC93C,0 0 0 6px #fff,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag .pz{margin-left:2px;font-size:15px}
.pl-utag{pointer-events:auto;border:0;padding:5px 11px;border-radius:999px;background:#1F8A43;color:#fff;font:900 13px/1.2 var(--f-round);box-shadow:0 8px 18px -10px rgba(0,0,0,.6);cursor:pointer}
.pl-utag.crown{background:#B07800}
.pl-utag.sel{box-shadow:0 0 0 3px #fff,0 8px 18px -10px rgba(0,0,0,.6)}
.pl-goal{padding:6px 12px;border-radius:999px;background:#FF6FA8;color:#fff;font:900 12px/1 var(--f-round);letter-spacing:.06em;text-transform:uppercase;pointer-events:none;box-shadow:0 6px 14px -8px rgba(0,0,0,.6)}
.pl-follow{position:absolute;z-index:2;border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.94);color:#16203D;font:800 14px/1 var(--f-round);box-shadow:inset 0 -3px 0 rgba(22,32,61,.1),0 8px 18px -10px rgba(8,20,60,.6);cursor:pointer}
.pl-follow[hidden]{display:none}
.pl.wide .pl-follow{left:var(--gut,16px);bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}
.pl.phone .pl-follow{left:var(--gut,16px);top:var(--pl-top,84px)}
.pl-card{position:absolute;z-index:2;background:#fff;color:#0D1530;border-radius:26px;padding:16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;align-content:start;overflow:auto;box-shadow:0 24px 50px -20px rgba(8,20,60,.6)}
.pl.wide .pl-card{right:var(--gut-r,16px);top:var(--pl-top,84px);width:min(380px,42%);max-height:calc(100% - var(--pl-top,84px) - 16px)}
.pl.phone .pl-card{left:var(--gut,16px);right:var(--gut-r,16px);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);max-width:560px;margin:0 auto;max-height:52%}
.pl-card.in{animation:plIn .38s cubic-bezier(.2,.9,.2,1)}
@keyframes plIn{from{translate:0 18px;opacity:0}to{translate:0 0;opacity:1}}
.plc-ic{grid-row:span 2;width:60px;height:60px;border-radius:19px;display:grid;place-items:center;font-size:32px;background:color-mix(in srgb,var(--gh) 18%,#fff)}
.plc-eb{font:900 12px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#5A6380;align-self:end}
.plc-t{font:900 21px/1.15 var(--f-round)}
.plc-p{grid-column:1/-1;font:700 15px/1.45 var(--f-round);color:#5A6380;margin-top:8px}
.plc-chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.plc-chips span{padding:5px 10px;border-radius:999px;background:#EEF3FA;font:800 13px var(--f-round)}
.plc-how{grid-column:1/-1;display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}
.plc-goal{grid-column:1/-1;margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#FFF3D1;color:#6B4300;font:800 15px/1.35 var(--f-round)}
.plc-how li{display:flex;gap:10px;align-items:center;font:800 15px/1.35 var(--f-round)}
.plc-how span{flex:none;width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:#EAF8EE;font-size:18px}
.plc-prize{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 12px;border-radius:16px;background:#FFF6D6;box-shadow:inset 0 0 0 2px #FFC93C}
.plc-prize.big{background:#FFE8D6;box-shadow:inset 0 0 0 2px #FF9F43}
.plc-prize>span:first-child{font-size:26px}
.plc-prize small{display:block;font:900 10px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#8A5A00}
.plc-prize b{font:900 15px/1.25 var(--f-round)}
.plc-act{grid-column:1/-1;display:flex;margin-top:12px}
.plc-act .g-go{flex:1;margin:0}
@media (max-width:560px){ .pl.phone .plc-p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} .plc-t{font-size:19px} .plc-ic{width:52px;height:52px;font-size:28px} }
@media (prefers-reduced-motion:reduce){ .pl-card.in{animation:none} }
`;
{ const st = document.createElement('style'); st.id = 'growth-plant-css'; st.textContent = PLANT_CSS; document.head.appendChild(st); }
