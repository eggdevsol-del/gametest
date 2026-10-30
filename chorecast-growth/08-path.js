
/* ---------- A skill tree as a path of floating 3D islands ----------
   Every lesson is an island, with a challenge island closing each unit. Passing a lesson builds a rope bridge
   to the next island, which shakes off its mist and colours in, and the kid's guide hops across. Units still
   being written show as small misty islands with no bridge yet. Drag or scroll along the path; tap an island
   for its card. Lessons with no WebGL fall back to the list in viewTree. */
const PathView = (() => {
  const T = window.THREE, G3 = C.G3;
  if (!T || !G3 || !G3.ok) return { ok: false };
  const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), lerp = (a, b, t) => a + (b - a) * t;
  const E = { out: t => 1 - (1 - t) ** 3, io: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), back: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, lin: t => t };
  const tws = new Set();
  const tw = (ms, fn, e = E.out, group = 'path') => new Promise(res => tws.add({ t0: performance.now(), d: Math.max(1, ms * (reduced ? 0.3 : 1)), fn, e, res, group }));
  const kill = group => { for (const w of tws) if (w.group === group) tws.delete(w); };
  const wait = ms => new Promise(r => setTimeout(r, ms * (reduced ? 0.3 : 1)));

  // Toon shading with a fogged, screen-space ink outline, so faraway islands fade into the sky together.
  const INK_VS = `attribute vec3 inkN; uniform vec2 uRes; uniform float uPx; varying float vD;
void main(){ vec4 p = vec4(position, 1.0); vec3 n = inkN;
  #ifdef USE_INSTANCING
  p = instanceMatrix * p; n = mat3(instanceMatrix) * n;
  #endif
  vec4 mv = modelViewMatrix * p; vec4 cp = projectionMatrix * mv; vec2 d = (normalMatrix * n).xy; float l = length(d);
  if (l > 1e-5) cp.xy += (d / l) * uPx * 2.0 / uRes * cp.w; gl_Position = cp; vD = -mv.z; }`;
  const U = { uRes: { value: new T.Vector2(1, 1) }, uFogCol: { value: new T.Color(0x9fd3f8) }, uFog: { value: new T.Vector2(17, 44) } };
  const INKM = new T.ShaderMaterial({ uniforms: { uRes: U.uRes, uPx: { value: 1.8 * Math.min(2, devicePixelRatio || 1) }, uCol: { value: new T.Color(0x2b2238) }, uFogCol: U.uFogCol, uFog: U.uFog }, vertexShader: INK_VS, fragmentShader: 'uniform vec3 uCol, uFogCol; uniform vec2 uFog; varying float vD; void main(){ gl_FragColor = vec4(mix(uCol, uFogCol, smoothstep(uFog.x, uFog.y, vD)), 1.0); }', side: T.BackSide });
  function prepInk(g) {
    if (g.attributes.inkN) return g; if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal, map = new Map(), key = i => (p.getX(i) * 1000 | 0) + ',' + (p.getY(i) * 1000 | 0) + ',' + (p.getZ(i) * 1000 | 0);
    for (let i = 0; i < p.count; i++) { const k = key(i), v = map.get(k) || [0, 0, 0]; v[0] += n.getX(i); v[1] += n.getY(i); v[2] += n.getZ(i); map.set(k, v); }
    const a = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = map.get(key(i)), l = Math.hypot(v[0], v[1], v[2]) || 1; a[i * 3] = v[0] / l; a[i * 3 + 1] = v[1] / l; a[i * 3 + 2] = v[2] / l; }
    g.setAttribute('inkN', new T.BufferAttribute(a, 3)); return g;
  }
  const MC = {};
  const toonC = c => { const k = 'c' + c; if (MC[k]) return MC[k]; const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD }); G3.rimPatch(m); return (MC[k] = m); };
  const own = c => { const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD }); G3.rimPatch(m); return m; };
  function M(geo, mat, o = {}) { const m = new T.Mesh(geo, typeof mat === 'number' ? (o.own ? own(mat) : toonC(mat)) : mat); if (o.ink !== false) { prepInk(geo); const k = new T.Mesh(geo, INKM); k.raycast = () => {}; k.userData.ink = 1; m.add(k); } if (m.material.color) m.userData.base = m.material.color.clone(); return m; }
  const faceted = g => { const f = g.index ? g.toNonIndexed() : g.clone(); f.computeVertexNormals(); return f; };
  const GEO = { sph: new T.SphereGeometry(1, 20, 14), box: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(1, 1, 1, 20), cone: new T.ConeGeometry(1, 1, 16), tor: new T.TorusGeometry(1, 0.08, 10, 40), coin: new T.CylinderGeometry(0.11, 0.11, 0.032, 20) };
  GEO.icoF = faceted(new T.IcosahedronGeometry(1, 1)); GEO.dodeF = faceted(new T.DodecahedronGeometry(1, 0)); GEO.coneF = faceted(GEO.cone);
  Object.values(GEO).forEach(prepInk);
  const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const sc = (o, x, y = x, z = x) => { o.scale.set(x, y, z); return o; };
  const EMO = new Map();
  function emoji(e, h = 0.5) { let t = EMO.get(e); if (!t) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72); t = new T.CanvasTexture(c); EMO.set(e, t); } const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false })); s.scale.set(h, h, 1); return s; }

  /* Islands, trees, props */
  function warp(geo, fn) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (Math.hypot(x, z) < 1e-4) continue; const k = fn(x, z, y); p.setX(i, x * k); p.setZ(i, z * k); } geo.computeVertexNormals(); return geo; }
  function island(r, seed, grass) {
    const g = new T.Group(), rnd = mulberry(seed), ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    const jit = (x, z) => { const a = Math.atan2(z, x); return 1 + 0.07 * Math.sin(a * 3 + ph[0]) + 0.04 * Math.sin(a * 5 + ph[1]); };
    g.add(at(M(warp(new T.CylinderGeometry(r, r * 0.95, 0.24, 30), jit), grass, { own: 1 }), 0, -0.12, 0));
    g.add(at(M(warp(new T.CylinderGeometry(r * 0.95, r * 0.8, 0.3, 30), jit), 0x9b6b45, { own: 1 }), 0, -0.39, 0));
    const rk = new T.ConeGeometry(r * 0.8, r * 1.3, 11, 4); rk.rotateX(Math.PI); warp(rk, (x, z, y) => jit(x, z) * (1 + 0.12 * Math.sin(Math.atan2(z, x) * 7 + y * 6 + ph[2])));
    g.add(at(M(faceted(rk), 0x8a7566, { own: 1 }), 0, -0.54 - r * 0.65, 0));
    const n = Math.round(2 + r * 2);
    for (let i = 0, tries = 0; i < n && tries < 50; tries++) {
      const a = rnd() * Math.PI * 2, da = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)); if (Math.abs(da) < 1.05) continue;
      const rr = r * (0.6 + rnd() * 0.22), t = rnd(), d = new T.Group();
      if (t < 0.5) { d.add(at(sc(M(GEO.cyl, 0x8a5a35, { own: 1 }), 0.045, 0.32, 0.045), 0, 0.16, 0)); const c = [0x2e9c49, 0x43b65a, 0x5bc86b][Math.floor(rnd() * 3)]; for (let k = 0; k < 3; k++) d.add(at(sc(M(GEO.icoF, c, { own: 1 }), 0.19 - k * 0.035), (rnd() - 0.5) * 0.1, 0.38 + k * 0.12, (rnd() - 0.5) * 0.1)); d.scale.setScalar(0.75 + rnd() * 0.5); }
      else if (t < 0.7) { d.add(at(sc(M(GEO.cyl, 0x7a4e2e, { own: 1 }), 0.04, 0.2, 0.04), 0, 0.1, 0)); for (let k = 0; k < 3; k++) d.add(at(sc(M(GEO.coneF, 0x2a8a55, { own: 1 }), 0.22 - k * 0.05, 0.26, 0.22 - k * 0.05), 0, 0.3 + k * 0.16, 0)); }
      else if (t < 0.88) d.add(at(sc(M(GEO.dodeF, 0xa6a3b0, { own: 1 }), 0.13 + rnd() * 0.08, 0.1 + rnd() * 0.06, 0.12), 0, 0.05, 0));
      else for (let k = 0; k < 4; k++) d.add(at(sc(M(GEO.sph, [0xff7aa8, 0xffd43b, 0xffffff, 0xb18cff][k], { ink: false, own: 1 }), 0.04), (rnd() - 0.5) * 0.3, 0.04, (rnd() - 0.5) * 0.3));
      d.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr); d.rotation.y = rnd() * 6; g.add(d); i++;
    }
    return g;
  }
  // A small prop for the lesson's scene, so a bank lesson looks like a bank and a market lesson like a stall.
  const PROP = {
    bank: g => { g.add(at(sc(M(GEO.box, 0xf1ece2), 0.6, 0.36, 0.4), 0, 0.18, 0)); const roof = sc(M(new T.ConeGeometry(0.5, 0.26, 4), 0xd9cbb0), 1); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 0.49, 0)); for (let i = 0; i < 3; i++) g.add(at(sc(M(GEO.cyl, 0xffffff), 0.035, 0.32, 0.035), -0.18 + i * 0.18, 0.18, 0.22)); for (let i = 0; i < 4; i++) g.add(at(sc(M(GEO.coin, 0xffc93c), 1), 0.45, 0.02 + i * 0.035, 0.25)); },
    shares: g => { [0.3, 0.5, 0.38, 0.7].forEach((h, i) => g.add(at(sc(M(GEO.box, i === 2 ? 0xe5533d : 0x2fb257), 0.16, h, 0.16), -0.27 + i * 0.18, h / 2, 0))); },
    workshop: g => { g.add(at(sc(M(GEO.box, 0xc23a2c), 0.5, 0.28, 0.28), 0, 0.14, 0)); g.add(at(sc(M(GEO.tor, 0x6d7486), 0.1), 0, 0.33, 0)); },
    stall: g => { g.add(at(sc(M(GEO.box, 0xe9c08a), 0.56, 0.3, 0.26), 0, 0.15, 0)); for (let i = 0; i < 4; i++) { const s = sc(M(GEO.box, i % 2 ? 0xffffff : 0xe8473c), 0.15, 0.025, 0.34); s.rotation.x = 0.3; g.add(at(s, -0.22 + i * 0.15, 0.62, 0.02)); } for (const x of [-0.26, 0.26]) g.add(at(sc(M(GEO.cyl, 0x9c6b3c), 0.02, 0.6, 0.02), x, 0.32, -0.1)); },
    garden: g => { [[-0.2, 0xff6b9d], [0, 0xffd23b], [0.2, 0xc084fc]].forEach(([x, c]) => { g.add(at(sc(M(GEO.cyl, 0x3f8f35), 0.015, 0.3, 0.015), x, 0.15, 0)); g.add(at(sc(M(GEO.sph, c), 0.07, 0.04, 0.07), x, 0.32, 0)); }); },
    kitchen: g => { g.add(at(sc(M(GEO.box, 0xe8dfcf), 0.5, 0.34, 0.32), 0, 0.17, 0)); g.add(at(sc(M(GEO.cyl, 0x3d4357), 0.12, 0.16, 0.12), 0.08, 0.42, 0)); },
    stage: g => { g.add(at(sc(M(GEO.cyl, 0x3d4357), 0.02, 0.6, 0.02), 0, 0.3, 0)); g.add(at(sc(M(GEO.sph, 0x9aa3b5), 0.08, 0.1, 0.08), 0, 0.64, 0)); },
    museum: g => { for (const x of [-0.25, 0.25]) { g.add(at(sc(M(GEO.cyl, 0xf1ece2), 0.06, 0.6, 0.06), x, 0.3, 0)); g.add(at(sc(M(GEO.box, 0xe2dac9), 0.16, 0.04, 0.16), x, 0.62, 0)); } g.add(at(sc(M(GEO.box, 0xe2dac9), 0.6, 0.05, 0.18), 0, 0.66, 0)); },
    home: g => { g.add(at(sc(M(GEO.box, 0xf4e3c3), 0.5, 0.4, 0.42), 0, 0.2, 0)); const roof = sc(M(new T.ConeGeometry(0.42, 0.32, 4), 0xd9534f), 1); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 0.56, 0)); },
    online: g => { g.add(at(sc(M(GEO.box, 0x23283a), 0.34, 0.6, 0.05), 0, 0.32, 0)); g.add(at(sc(M(GEO.box, 0x5ac8fa), 0.28, 0.5, 0.01), 0, 0.33, 0.03)); },
    townhall: g => { g.add(at(sc(M(GEO.box, 0xf1ece2), 0.6, 0.36, 0.36), 0, 0.18, 0)); const roof = sc(M(new T.ConeGeometry(0.46, 0.26, 4), 0xd9cbb0), 1); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 0.49, 0)); g.add(at(sc(M(GEO.box, 0x2f6fe4), 0.16, 0.1, 0.01), 0.1, 0.8, 0)); g.add(at(sc(M(GEO.cyl, 0x5d636b), 0.01, 0.3, 0.01), 0, 0.72, 0)); },
    island: g => { g.add(at(sc(M(GEO.cyl, 0x8a5a3c), 0.04, 0.4, 0.04), 0, 0.2, 0)); g.add(at(sc(M(GEO.sph, 0x4caf50), 0.26), 0, 0.5, 0)); },
    trophy: g => { const prof = [[0, 0], [0.2, 0], [0.2, 0.06], [0.07, 0.1], [0.05, 0.3], [0.1, 0.34], [0.24, 0.42], [0.27, 0.7], [0.25, 0.7], [0.21, 0.46], [0, 0.44]].map(p => new T.Vector2(p[0], p[1])); g.add(at(M(new T.LatheGeometry(prof, 24), 0xffc93c), 0, 0.12, 0)); g.add(at(sc(M(GEO.box, 0x3b2f5c), 0.42, 0.12, 0.42), 0, 0.06, 0)); },
    start: g => { g.add(at(sc(M(GEO.box, 0xfff1d6), 0.72, 0.5, 0.6), 0, 0.25, 0)); const roof = M(new T.ConeGeometry(0.6, 0.44, 4), 0xe5533d); roof.rotation.y = Math.PI / 4; g.add(at(roof, 0, 0.72, 0)); g.add(at(sc(M(GEO.box, 0x8a5a35), 0.16, 0.27, 0.03), -0.12, 0.14, 0.3)); g.add(at(sc(M(GEO.box, 0x8fd3ff), 0.15, 0.13, 0.03), 0.18, 0.32, 0.3)); },
  };

  /* State */
  let R = null, scene, cam, el, cv, tagsEl, cardEl, guide = null, ring, selRing, planks, kidId = '', treeId = '', key = '';
  let isles = [], bridges = [], POS = [], L = [], tagEls = [], unitEls = [], clouds, cloudData = [];
  let s = 0, vel = 0, sel = 0, cur = -1, busy = false, intro = false, travel = false, running = false, raf = 0, last = 0;
  const ray = new T.Raycaster(), ndc = new T.Vector2(), tmp = V();
  const GAME_NAME = { sort: 'Sort', order: 'Put in order', build: 'Build it', match: 'Match', route: 'Route', slider: 'Slider', price: 'Best price', scam: 'Scam spotter', path: 'Choose a path', debate: 'Debate', tap: 'Find them', budget: 'Budget planner', market: 'Market time-lapse', compound: 'Snowball', shop: 'Run a stall', timing: 'Timing', diff: 'Spot the difference', chat: 'Chat', mystery: 'Mystery box', island: 'Your island', gen: 'Quick maths', mcq: 'Quiz', tf: 'True or false', gap: 'Fill the gap' };

  function mount() {
    if (el) return;
    el = document.createElement('div'); el.className = 'gp';
    el.innerHTML = '<canvas class="gp-cv" aria-label="Skill tree islands. Drag to move along the path, tap an island to see its lesson."></canvas><div class="gp-tags"></div><section class="gp-card" aria-live="polite"></section>';
    cv = el.querySelector('.gp-cv'); tagsEl = el.querySelector('.gp-tags'); cardEl = el.querySelector('.gp-card');
    R = new T.WebGLRenderer({ canvas: cv, antialias: true, alpha: true }); R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.setClearColor(0, 0);
    cam = new T.PerspectiveCamera(40, 1, 0.1, 200);
    cv.addEventListener('pointerdown', onDown); addEventListener('pointermove', onMove); addEventListener('pointerup', onUp); addEventListener('pointercancel', onUp);
    cv.addEventListener('wheel', e => { e.preventDefault(); if (busy) return; kill('pan'); intro = false; vel = 0; s = clamp(s - e.deltaY / 380, -0.4, POS.length - 0.8); }, { passive: false });
    new (window.ResizeObserver || function () { return { observe() {} }; })(resize).observe(el);
  }

  // Islands in path order: a start island, each unit's lessons and its challenge, and misty islands for units still to come.
  function plan(kid, tree) {
    const pack = packFor(tree.id, bandOf(kid)), out = [{ kind: 'start' }]; if (!pack) return out;
    for (const u of pack.units) {
      if (!u.lessons.length) { out.push({ kind: 'soon', unit: u }); continue; }
      u.lessons.forEach(l => out.push({ kind: 'lesson', l, unit: u })); out.push({ kind: 'boss', unit: u });
    }
    return out;
  }
  function stateOf(kid, d, skip) {
    if (d.kind === 'start') return 'start';
    if (d.kind === 'soon') return 'soon';
    if (d.kind === 'boss') { const uc = (prog(kid).units || {})[d.unit.id] || {}; if (uc.best >= 0.8) return 'done'; return d.unit.lessons.every(l => passed(kid, l.id) && l.id !== skip) ? 'open' : 'locked'; }
    if (passed(kid, d.l.id) && d.l.id !== skip) return 'done';
    return available(kid, d.l) && !(skip && !passedOr(kid, d.l, skip)) ? 'open' : 'locked';
  }
  // While a just-passed lesson is replayed as "not yet passed" for the bridge-building moment.
  function passedOr(kid, l, skip) { const pack = packFor(l.tree, l.band), u = pack.units.find(x => x.n === l.unit), i = u.lessons.indexOf(l); return !(i > 0 && u.lessons[i - 1].id === skip); }

  function build(kid, tree) {
    // Free the last tree's island meshes; shared shapes, cached materials and emoji textures stay.
    if (scene) { const keepG = new Set(Object.values(GEO)), keepM = new Set(Object.values(MC)); scene.traverse(o => { if (o.isSprite) { o.material.dispose(); return; } if (o.geometry && !keepG.has(o.geometry)) o.geometry.dispose(); if (o.material && o.material !== INKM && !keepM.has(o.material)) o.material.dispose(); }); }
    scene = new T.Scene(); const hue = new T.Color(tree.hue), fog = hue.clone().lerp(new T.Color(0x7fd3ff), 0.45);
    scene.fog = new T.Fog(fog, 17, 44); U.uFogCol.value.copy(fog);
    scene.add(new T.HemisphereLight(0xffffff, 0xafc2e6, 0.55)); const d = new T.DirectionalLight(0xfff3dc, 0.7); d.position.set(-4, 8, 6); scene.add(d);
    L = plan(kid, tree); const N = L.length;
    POS = L.map((x, i) => V(i ? Math.sin(i * 1.1) * 2.1 : 0, i * 0.24, -i * 3.75));
    const grass = new T.Color(0x5ccb61).lerp(hue, 0.18).getHex();
    isles = L.map((x, i) => {
      const r = x.kind === 'start' ? 1.5 : x.kind === 'boss' ? 1.3 : x.kind === 'soon' ? 0.85 : 1, g = new T.Group(); g.position.copy(POS[i]); scene.add(g);
      g.add(island(r, hash(tree.id) + i * 7, grass));
      const prop = new T.Group(); (PROP[x.kind === 'start' ? 'start' : x.kind === 'boss' ? 'trophy' : x.kind === 'soon' ? 'island' : x.l.scene] || PROP.island)(prop); prop.position.z = -0.1; g.add(prop);
      const badge = x.kind === 'lesson' ? emoji(x.l.icon, 0.55) : x.kind === 'start' ? emoji(tree.icon, 0.6) : null; if (badge) { badge.position.set(0, x.kind === 'start' ? 1.55 : 1.2, -0.1); g.add(badge); }
      const pick = new T.Mesh(new T.SphereGeometry(r * 1.15, 12, 8), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })); pick.position.y = 0.2; pick.userData.i = i; g.add(pick);
      const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const rr = k % 2 ? 0.12 : 0.28, a = Math.PI / 2 + k * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } const sg = new T.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 1 }); sg.center();
      const star = M(sg, 0xffc93c); star.scale.setScalar(0.6); star.position.set(0.55, 1.0, 0.2); star.visible = false; g.add(star);
      const mist = new T.Group(), mm = new T.MeshToonMaterial({ color: 0xf4f8ff, gradientMap: G3.GRAD, transparent: true, opacity: 0.9, depthWrite: false }); for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2 + i, m = new T.Mesh(GEO.sph, mm); m.scale.set(0.45, 0.26, 0.36); m.position.set(Math.cos(a) * r * 0.85, 0.15 + (k % 2) * 0.18, Math.sin(a) * r * 0.85); mist.add(m); } g.add(mist);
      const meshes = []; g.traverse(o => { if (o.isMesh && o.userData.base && !mist.children.includes(o) && o !== star) { o.userData.grey = greyOf(o.userData.base); if (MC['c' + o.material.color.getHex()] === o.material) { o.material = o.material.clone(); G3.rimPatch(o.material); } meshes.push(o); } });
      return { g, pick, star, mist, mm, meshes, badge, look: -1, r };
    });
    // Bridges: planks share one instanced mesh and one instanced outline.
    const PLANK = prepInk(new T.BoxGeometry(0.46, 0.05, 0.15)); let total = 0; bridges = [];
    for (let b = 0; b < N - 1; b++) {
      const a = POS[b], c = POS[b + 1], dir = V(c.x - a.x, 0, c.z - a.z).normalize(), p0 = a.clone().addScaledVector(dir, isles[b].r * 0.9), p1 = c.clone().addScaledVector(dir, -isles[b + 1].r * 0.9);
      p0.y = a.y - 0.02; p1.y = c.y - 0.02; const len = p0.distanceTo(p1), n = Math.max(4, Math.round(len / 0.23)), yaw = Math.atan2(dir.x, dir.z), side = V(dir.z, 0, -dir.x);
      const pts = []; for (let k = 0; k <= 20; k++) { const t = k / 20; pts.push(V().lerpVectors(p0, p1, t).add(V(0, -0.22 * Math.sin(Math.PI * t), 0))); }
      const g = new T.Group(); scene.add(g);
      for (const sd of [-1, 1]) { g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => p.clone().addScaledVector(side, 0.22 * sd).add(V(0, 0.2, 0)))), 24, 0.014, 5), toonC(0x6e4a2e))); for (const p of [p0, p1]) g.add(at(sc(M(GEO.cyl, 0x8a5a35), 0.03, 0.32, 0.03), p.x + side.x * 0.22 * sd, p.y + 0.12, p.z + side.z * 0.22 * sd)); }
      const puffs = new T.Group(); for (let k = 1; k < 6; k++) { const m = new T.Mesh(GEO.sph, toonC(0xf4f8ff)); m.scale.set(0.16, 0.1, 0.14); m.position.copy(pts[k * 3 + 1]).add(V(0, 0.08, 0)); puffs.add(m); } scene.add(puffs);
      bridges.push({ g, puffs, first: total, n, p0, p1, yaw, pts }); total += n;
    }
    planks = new T.InstancedMesh(PLANK, toonC(0xb57a45), Math.max(1, total)); const plankInk = new T.InstancedMesh(PLANK, INKM, Math.max(1, total));
    plankInk.instanceMatrix = planks.instanceMatrix; planks.frustumCulled = plankInk.frustumCulled = false; scene.add(planks, plankInk);
    // Puffy clouds drift beside and below the path.
    const rnd = mulberry(5); cloudData = [];
    for (let c = 0; c < Math.ceil(N * 1.6) + 6; c++) {
      const z = 9 - c * 2.6 - rnd() * 2, under = c % 5 === 2, sd = under ? 0 : (c % 2 ? 1 : -1), cx = under ? (rnd() - 0.5) * 6 : sd * (4.6 + rnd() * 5), cy = -z * 0.064 - (under ? 6.5 : 2.4 + rnd() * 3), v = (0.04 + rnd() * 0.06) * (rnd() < 0.5 ? -1 : 1), k = 4 + Math.floor(rnd() * 3), big = 0.8 + rnd() * 0.7;
      for (let j = 0; j < k; j++) cloudData.push({ x: cx + (j - k / 2) * 0.7 * big + (rnd() - 0.5) * 0.3, y: cy + (rnd() - 0.3) * 0.35 * big, z: z + (rnd() - 0.5) * 0.9, s: (0.55 + rnd() * 0.45) * big * (j === Math.floor(k / 2) ? 1.3 : 1), v, ph: c });
    }
    clouds = new T.InstancedMesh(GEO.sph, toonC(0xf4f9ff), cloudData.length); clouds.frustumCulled = false; scene.add(clouds);
    ring = new T.Mesh(GEO.tor, new T.MeshToonMaterial({ color: 0xffc93c, gradientMap: G3.GRAD, emissive: 0x6a4300 })); ring.rotation.x = Math.PI / 2; scene.add(ring);
    selRing = new T.Mesh(GEO.tor, new T.MeshToonMaterial({ color: 0xffffff, gradientMap: G3.GRAD, emissive: 0x777777 })); selRing.rotation.x = Math.PI / 2; scene.add(selRing);
    const gm = guideModel(prog(kid).guide || 'kea', c => { const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD }); G3.rimPatch(m); return m; });
    gm.g.traverse(o => { if (o.isMesh && o.material.isMeshToonMaterial) { prepInk(o.geometry); const k = new T.Mesh(o.geometry, INKM); k.userData.ink = 1; o.add(k); } });
    guide = { g: new T.Group(), P: gm.P, face: 0, flap: 0 }; guide.g.add(gm.g); guide.g.scale.setScalar(0.55); scene.add(guide.g);
    // HTML labels and unit banners
    tagsEl.innerHTML = ''; tagEls = L.map((x, i) => { const b = document.createElement('button'); b.className = 'gp-tag'; b.dataset.g = 'pathSel'; b.dataset.i = i; tagsEl.appendChild(b); return b; });
    unitEls = [];
    L.forEach((x, i) => { if (!i || x.kind === 'boss' || (x.kind === 'lesson' && x.unit.lessons[0] !== x.l)) return; const div = document.createElement('div'); div.className = 'gp-unit'; div.innerHTML = `<small>Unit ${x.unit.n}${x.kind === 'soon' ? ' · coming soon' : ''}</small><b>${esc(local(x.unit.title))}</b>`; tagsEl.appendChild(div); const mid = POS[i - 1].clone().lerp(POS[i], 0.5), sd = mid.x > 0 ? -1 : 1; unitEls.push({ el: div, at: mid.add(V(sd * 2.3, 1.1, 0)) }); });
  }
  function greyOf(c) { const l = c.r * 0.3 + c.g * 0.59 + c.b * 0.11; return new T.Color(l * 0.55 + 0.66 * 0.45, l * 0.55 + 0.7 * 0.45, l * 0.55 + 0.8 * 0.45); }
  function setLook(i, k) { const I = isles[i]; if (I.look === k) return; I.look = k; for (const m of I.meshes) m.material.color.copy(m.userData.base).lerp(m.userData.grey, k); I.mm.opacity = 0.9 * k; I.mist.visible = k > 0.02; if (I.badge) I.badge.material.opacity = 1 - k * 0.6; }
  function plankM(b, k, show) { const B = bridges[b], t = (k + 0.5) / B.n, p = V().lerpVectors(B.p0, B.p1, t); p.y += -0.22 * Math.sin(Math.PI * t); const m = new T.Matrix4().makeRotationY(B.yaw + Math.sin(k * 12.9) * 0.06); m.setPosition(p); if (show < 1) m.scale(V(Math.max(0.001, show), Math.max(0.001, show), Math.max(0.001, show))); planks.setMatrixAt(B.first + k, m); }
  function setBridge(b, show) { const B = bridges[b]; for (let k = 0; k < B.n; k++) plankM(b, k, show ? 1 : 0); B.g.visible = show; B.puffs.visible = !show; planks.instanceMatrix.needsUpdate = true; }

  let states = [];
  function refresh(kid, skip) {
    states = L.map(d => stateOf(kid, d, skip));
    cur = states.findIndex(x => x === 'open'); if (cur < 0) cur = -1;
    L.forEach((d, i) => { const st = states[i]; setLook(i, st === 'locked' || st === 'soon' ? 0.82 : 0); isles[i].star.visible = st === 'done'; paintTag(kid, i); });
    bridges.forEach((B, b) => setBridge(b, states[b + 1] !== 'locked' && states[b + 1] !== 'soon'));
  }
  function medalOf(kid, d) { if (d.kind === 'boss') return '👑'; const m = medal(kid, d.l); return m === 'gold' ? '🥇' : m === 'silver' ? '🥈' : '🥉'; }
  function num(d) { return d.kind === 'boss' ? '🏆' : `${d.l.unit}.${d.l.n}`; }
  function paintTag(kid, i) {
    const d = L[i], st = states[i], b = tagEls[i], isCur = i === cur, title = d.kind === 'lesson' ? local(d.l.title) : d.kind === 'boss' ? 'Unit challenge' : d.kind === 'soon' ? 'Coming soon' : 'Start';
    b.className = `gp-tag ${st}${isCur ? ' cur' : ''}${i === sel ? ' sel' : ''}`;
    b.setAttribute('aria-label', `${title}${st === 'locked' ? ', locked' : st === 'done' ? ', done' : isCur ? ', up next' : ''}`);
    if (st === 'start') b.innerHTML = `<span class="n">🌱</span>Start`;
    else if (st === 'soon') b.innerHTML = `<span class="n">☁️</span>Unit ${d.unit.n}`;
    else if (st === 'done') b.innerHTML = `<span class="n">${medalOf(kid, d)}</span>${esc(title)}`;
    else if (isCur) b.innerHTML = `<span class="n">${num(d)}</span><span><small>Up next</small>${esc(title)}</span>`;
    else if (st === 'open') b.innerHTML = `<span class="n">${num(d)}</span>${esc(title)}`;
    else b.innerHTML = `<span class="n">🔒</span>${num(d)}`;
  }
  function card(kid, i) {
    const d = L[i], st = states[i], tree = TREE[treeId]; let h;
    if (d.kind === 'start') { const nx = cur >= 0 ? L[cur] : null; h = `<div class="gpc-ic">${tree.icon}</div><div class="gpc-eb">${esc(tree.name)}</div><div class="gpc-t">Where the path begins</div><p class="gpc-p">Every lesson you pass builds a bridge to the next island. Finish a unit to open its challenge island.</p><div class="gpc-act">${nx ? `<button class="g-go" data-g="pathSel" data-i="${cur}">Go to the next island</button>` : ''}</div>`; }
    else if (d.kind === 'soon') h = `<div class="gpc-ic">☁️</div><div class="gpc-eb">Unit ${d.unit.n}</div><div class="gpc-t">${esc(local(d.unit.title))}</div><p class="gpc-p">${esc(local(d.unit.goal))}. These lessons are on their way in a content update.</p>`;
    else if (d.kind === 'boss') { const all = st !== 'locked'; h = `<div class="gpc-ic">🏆</div><div class="gpc-eb">Unit ${d.unit.n} · Challenge island</div><div class="gpc-t">${esc(local(d.unit.title))} challenge</div><p class="gpc-p">Mixed questions from the whole unit, with no hints. Get 80% to win the crown.</p><div class="gpc-chips"><span>❓ Up to 8 questions</span><span>✨ +${XP.challenge} XP</span></div><div class="gpc-act">${all ? `<button class="g-go" data-g="challenge" data-id="${d.unit.id}">${st === 'done' ? 'Play again' : '▶ Start the challenge'}</button>` : `<button class="g-go ghost" data-g="locked">🔒 Finish every lesson in Unit ${d.unit.n} first</button>`}</div>`; }
    else {
      const l = d.l, game = l.play ? GAME_NAME[l.play.type] || 'Game' : null, prev = i > 0 && L[i - 1].kind === 'lesson' ? L[i - 1].l : null;
      const chips = [`📖 ${l.learn.length} learn card${l.learn.length === 1 ? '' : 's'}`, game ? `🎮 ${game}` : '', l.checks.length ? `✅ ${l.checks.length} questions` : '', `✨ +${XP.lesson} XP`].filter(Boolean);
      const act = st === 'locked' ? `<button class="g-go ghost" data-g="locked">🔒 ${prev ? `Finish “${esc(local(prev.title))}” first` : 'Finish the unit before this one first'}</button>` : `<button class="g-go" data-g="lesson" data-id="${l.id}">${st === 'done' ? 'Play again' : '▶ Start lesson'}</button>`;
      h = `<div class="gpc-ic">${esc(l.icon)}</div><div class="gpc-eb">Unit ${l.unit} · Lesson ${l.n}${st === 'done' ? ` · ${medalOf(kid, d)}` : ''}</div><div class="gpc-t">${esc(local(l.title))}</div><p class="gpc-p">${esc(local(l.hook))}</p><div class="gpc-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div><div class="gpc-act">${act}</div>`;
    }
    cardEl.innerHTML = h; cardEl.classList.remove('in'); void cardEl.offsetWidth; cardEl.classList.add('in');
  }

  /* Camera along the path */
  const focusOf = i => i - 0.12;
  function camTarget(sv) { const N = POS.length, i0 = clamp(Math.floor(sv), 0, N - 1), i1 = clamp(i0 + 1, 0, N - 1), f = clamp(sv - i0, 0, 1), k = f * f * (3 - 2 * f), t = V().lerpVectors(POS[i0], POS[i1], k); if (sv < 0) t.z -= sv * 3.75; if (sv > N - 1) t.z -= (sv - N + 1) * 3.75; return t; }
  function placeCam() { const t = camTarget(s), tan = Math.tan(cam.fov * Math.PI / 360), d = clamp(10 / (2 * tan * cam.aspect), 11.5, 21); cam.position.set(t.x * 0.5, t.y + d * 0.66, t.z + d * 0.75); cam.lookAt(t.x * 0.5, t.y - 0.6, t.z - 0.2); }
  function panTo(i, ms = 650, group = 'pan') { kill('pan'); const s0 = s, s1 = focusOf(i); vel = 0; return tw(ms, k => { s = lerp(s0, s1, k); }, E.io, group); }
  let down = null;
  function onDown(e) { if (busy) return; intro = false; kill('pan'); kill('intro'); down = { x: e.clientX, y: e.clientY, s, drag: false, ly: e.clientY, lt: performance.now() }; vel = 0; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
  function onMove(e) { if (!down) return; const dy = e.clientY - down.y; if (!down.drag && Math.hypot(e.clientX - down.x, dy) > 7) { down.drag = true; cv.classList.add('drag'); } if (down.drag) { const ppi = Math.max(150, innerHeight / 3.6), now = performance.now(); s = clamp(down.s + dy / ppi, -0.4, POS.length - 0.8); vel = (e.clientY - down.ly) / ppi / Math.max(0.008, (now - down.lt) / 1000); down.ly = e.clientY; down.lt = now; } }
  function onUp(e) {
    if (!down) return; const d = down; down = null; cv.classList.remove('drag');
    if (!d.drag && e.type === 'pointerup') { const r = cv.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, cam); const hit = ray.intersectObjects(isles.map(I => I.pick))[0]; if (hit) select(hit.object.userData.i, true); vel = 0; }
    else vel = clamp(vel, -6, 6);
  }
  function select(i, pan) { const kid = kidNow(); if (!kid || !L[i]) return; sel = i; L.forEach((_, k) => paintTag(kid, k)); card(kid, i); if (pan && !busy) { Sound.tap(); panTo(i); } if (!travel && guide) { const I = POS[i], K = guide.g.position; guide.face = Math.atan2(I.x - K.x, I.z - K.z); } }
  const spotOn = i => POS[i].clone().add(V(0.3, 0, 0.58));

  /* The bridge-building moment after a lesson is passed for the first time */
  async function celebrate(kid, id) {
    const i = L.findIndex(d => d.kind === 'lesson' && d.l.id === id); if (i < 0) return refresh(kid);
    busy = true; refresh(kid, id); guide.g.position.copy(spotOn(i)); s = focusOf(i); await wait(450);
    const I = isles[i]; I.star.visible = true; I.star.scale.setScalar(0.001); Sound.fanfare && Sound.fanfare();
    await tw(600, k => I.star.scale.setScalar(Math.max(0.001, k * 0.6)), E.back); states[i] = 'done'; paintTag(kid, i);
    const realNext = L[i + 1] ? stateOf(kid, L[i + 1], null) : 'locked';
    if (L[i + 1] && realNext !== 'locked' && realNext !== 'soon') {
      const B = bridges[i]; B.g.visible = true; B.puffs.visible = false; for (let k = 0; k < B.n; k++) plankM(i, k, 0); planks.instanceMatrix.needsUpdate = true;
      for (let k = 0; k < B.n; k++) { const kk = k; tw(260, q => { plankM(i, kk, E.back(q)); planks.instanceMatrix.needsUpdate = true; }, E.lin); Sound.tap(); await wait(70); }
      await wait(250);
      const J = isles[i + 1], k0 = J.look; await tw(900, q => { J.look = -1; for (const m of J.meshes) m.material.color.copy(m.userData.base).lerp(m.userData.grey, k0 * (1 - q)); J.mm.opacity = 0.9 * (1 - q); J.g.scale.setScalar(1 + Math.sin(q * Math.PI) * 0.08); }, E.out);
      J.look = 0; J.mist.visible = false; Sound.pop();
      await hopAcross(i, i + 1);
    }
    busy = false; refresh(kid); select(cur >= 0 ? cur : i, false);
  }
  async function hopAcross(a, b) {
    travel = true; const B = bridges[a], pts = [B.p0.clone(), B.pts[6].clone(), B.pts[10].clone(), B.pts[14].clone(), B.p1.clone(), spotOn(b)], s0 = s, s1 = focusOf(b);
    for (let k = 0; k < pts.length; k++) { const from = guide.g.position.clone(), to = pts[k]; guide.face = Math.atan2(to.x - from.x, to.z - from.z); guide.flap = 1; await tw(360, q => { guide.g.position.lerpVectors(from, to, q); guide.g.position.y += Math.sin(Math.PI * q) * 0.45; s = lerp(s0, s1, (k + q) / pts.length); }, E.io); guide.flap = 0; }
    guide.face = 0; travel = false;
  }

  function resize() { if (!R || !el.isConnected) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); R.getDrawingBufferSize(U.uRes.value); }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016), t = now / 1000; last = now;
    for (const w of tws) { const k = Math.min(1, (now - w.t0) / w.d); w.fn(w.e(k), k); if (k >= 1) { tws.delete(w); w.res(); } }
    if (!down && !busy && !intro) { if (Math.abs(vel) > 0.01) { s = clamp(s + vel * dt, -0.4, POS.length - 0.8); vel *= Math.pow(0.04, dt); } else vel = 0; }
    placeCam();
    const m = new T.Matrix4(), q = new T.Quaternion(), p = V(), sv = V(); cloudData.forEach((d, i) => { p.set(d.x + Math.sin(t * d.v + d.ph) * 1.2, d.y + Math.sin(t * 0.4 + d.ph) * 0.08, d.z); sv.set(d.s, d.s * 0.72, d.s * 0.85); m.compose(p, q, sv); clouds.setMatrixAt(i, m); }); clouds.instanceMatrix.needsUpdate = true;
    ring.visible = cur >= 0; if (cur >= 0) { const P = POS[cur]; ring.position.set(P.x, P.y + 0.03, P.z); ring.scale.setScalar(isles[cur].r * (1.05 + Math.sin(t * 3) * 0.025)); }
    selRing.visible = sel !== cur && sel > 0; if (selRing.visible) { const P = POS[sel]; selRing.position.set(P.x, P.y + 0.04, P.z); selRing.scale.setScalar(isles[sel].r * 1.1); }
    isles.forEach((I, i) => { if (I.star.visible) { I.star.rotation.y = t * 1.6; I.star.position.y = 1.0 + Math.sin(t * 2 + i) * 0.05; } if (I.badge) I.badge.position.y = (L[i].kind === 'start' ? 1.55 : 1.2) + Math.sin(t * 1.8 + i) * 0.05; });
    if (guide) { const P = guide.P; guide.g.rotation.y += (((guide.face - guide.g.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * Math.min(1, dt * 8); P.head.rotation.z = Math.sin(t * 0.8) * 0.1; const w = 0.06 + guide.flap * (0.6 + Math.sin(t * 30) * 0.45); P.wingL.rotation.z = w; P.wingR.rotation.z = -w; if (!travel) guide.g.children[0].position.y = Math.abs(Math.sin(t * 2.4)) * 0.04; }
    R.render(scene, cam);
    const r = el.getBoundingClientRect(), W = r.width, H = r.height;
    L.forEach((d, i) => { const b = tagEls[i]; tmp.copy(POS[i]).add(V(0, -0.1, isles[i].r * 0.95)).project(cam); const dist = cam.position.distanceTo(POS[i]), op = tmp.z > 1 ? 0 : clamp((34 - dist) / 9, 0, 1); b.style.opacity = op; b.style.visibility = op < 0.05 ? 'hidden' : 'visible'; b.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * W}px,${(-tmp.y * 0.5 + 0.5) * H}px) translate(-50%,4px)`; });
    unitEls.forEach(u => { tmp.copy(u.at).project(cam); const dist = cam.position.distanceTo(u.at), op = tmp.z > 1 ? 0 : clamp((30 - dist) / 8, 0, 1); u.el.style.opacity = op; const w2 = (u.el.offsetWidth || 160) / 2, x = clamp((tmp.x * 0.5 + 0.5) * W, w2 + 8, W - w2 - 8); u.el.style.transform = `translate(${x}px,${(-tmp.y * 0.5 + 0.5) * H}px) translate(-50%,-50%)`; });
  }

  return {
    ok: true,
    // Shows a tree's path for a kid. `celebrateId` is a lesson just passed for the first time.
    show(host, kid, tree, celebrateId) {
      mount(); host.appendChild(el);
      const k = `${kid.id}|${tree.id}|${bandOf(kid)}|${(packFor(tree.id, bandOf(kid)) || { units: [] }).units.map(u => u.lessons.length).join(',')}|${prog(kid).guide || 'kea'}`;
      const fresh = k !== key; if (fresh) { kill('path'); build(kid, tree); key = k; kidId = kid.id; treeId = tree.id; }
      resize();
      if (celebrateId) { running || this.start(); celebrate(kid, celebrateId); return; }
      refresh(kid); guide.g.position.copy(spotOn(cur >= 0 ? cur : 0)); guide.face = 0;
      sel = cur >= 0 ? cur : 0; L.forEach((_, i) => paintTag(kid, i)); card(kid, sel);
      if (fresh) { intro = true; s = -0.3; tw(1800, q => { s = lerp(-0.3, focusOf(sel), q); }, E.io, 'intro').then(() => { intro = false; }); } else s = focusOf(sel);
      this.start();
    },
    select: i => select(i, true),
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
})();

const PATH_CSS = `
.gw[data-view=tree]{grid-template-rows:0 minmax(0,1fr)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=tree]{grid-template-rows:minmax(0,1fr);grid-template-columns:0 minmax(0,1fr)} }
.gw[data-view=tree] .gw-ui{overflow:hidden;padding-bottom:0}
.gw[data-view=tree] .gw-top{position:absolute;left:0;right:0;top:0;background:linear-gradient(color-mix(in srgb,var(--gh) 50%,#0B1A4A),transparent)}
.gp{position:absolute;inset:0;overflow:hidden}
.gp-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.gp-cv.drag{cursor:grabbing}
.gp-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.gp-tag{position:absolute;left:0;top:0;pointer-events:auto;display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border-radius:999px;background:#fff;color:#16203D;font:800 13px/1.15 var(--f-round);white-space:nowrap;box-shadow:0 6px 16px -8px rgba(8,20,60,.6);will-change:transform}
.gp-tag .n{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:#E6EDF8;font:900 12px var(--f-round)}
.gp-tag.done .n{background:#FFF3C4}
.gp-tag.cur{padding:6px 14px 6px 6px;font-size:15px;box-shadow:0 0 0 3px #FFC93C,0 10px 22px -8px rgba(8,20,60,.6)}
.gp-tag.cur .n{background:#FFC93C;color:#5A3A00;height:30px;min-width:30px;border-radius:15px}
.gp-tag.cur small{display:block;font:900 10px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#B07800}
.gp-tag.locked,.gp-tag.soon{opacity:.8}
.gp-tag.sel{box-shadow:0 0 0 3px #fff,0 10px 22px -8px rgba(8,20,60,.6)}
.gp-tag.cur.sel{box-shadow:0 0 0 3px #FFC93C,0 0 0 6px #fff,0 10px 22px -8px rgba(8,20,60,.6)}
.gp-unit{position:absolute;left:0;top:0;padding:8px 14px;border-radius:14px;background:rgba(13,21,48,.42);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);color:#fff;pointer-events:none;will-change:transform;max-width:220px}
.gp-unit small{display:block;font:900 11px var(--f-round);letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.gp-unit b{font:900 16px/1.2 var(--f-round)}
.gp-card{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);width:min(560px,calc(100% - 2 * var(--gut)));background:#fff;color:#0D1530;border-radius:26px;padding:16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;box-shadow:0 24px 50px -20px rgba(8,20,60,.6)}
.gp-card.in{animation:gpIn .38s cubic-bezier(.2,.9,.2,1)}
@keyframes gpIn{from{transform:translate(-50%,20px);opacity:0}to{transform:translate(-50%,0);opacity:1}}
.gpc-ic{grid-row:span 2;width:60px;height:60px;border-radius:19px;display:grid;place-items:center;font-size:32px;background:color-mix(in srgb,var(--gh) 18%,#fff)}
.gpc-eb{font:900 12px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#5A6380;align-self:end}
.gpc-t{font:900 21px/1.15 var(--f-round)}
.gpc-p{grid-column:1/-1;font:700 15px/1.45 var(--f-round);color:#5A6380;margin-top:8px}
.gpc-chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.gpc-chips span{padding:5px 10px;border-radius:999px;background:#EEF3FA;font:800 13px var(--f-round)}
.gpc-act{grid-column:1/-1;display:flex;margin-top:12px}
.gpc-act .g-go{flex:1;margin:0}
@media (max-width:560px){ .gpc-p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} .gpc-t{font-size:19px} }
@media (prefers-reduced-motion:reduce){ .gp-card.in{animation:none} }
`;
{ const st = document.createElement('style'); st.id = 'growth-path-css'; st.textContent = PATH_CSS; document.head.appendChild(st); }
