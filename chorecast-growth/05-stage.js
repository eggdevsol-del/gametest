
// The kid's guide (Kiri the kea, Coco the cockatoo or Bolt the robot), shared by the lesson stage and the plant.
const GUIDE_GEO = {};
function guideModel(kind, toon) {
  const T = window.THREE, G3 = C.G3;
  if (!GUIDE_GEO.s) Object.assign(GUIDE_GEO, { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18) });
  const basic = c => new T.MeshBasicMaterial({ color: c });
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(GUIDE_GEO[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const g = new T.Group(), P = {};
  if (kind === 'robot') {
    P.body = part(g, 'b', toon(0x4a78d4), [0, 0.62, 0], [0.62, 0.66, 0.5]);
    P.head = new T.Group(); P.head.position.set(0, 1.2, 0); g.add(P.head);
    part(P.head, 'b', toon(0x6c96e6), [0, 0.12, 0], [0.56, 0.42, 0.46]);
    P.eyeL = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [-0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
    P.eyeR = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
    part(P.head, 'c', toon(0x9aa3b5), [0, 0.42, 0], [0.02, 0.22, 0.02]);
    P.tip = part(P.head, 's', new T.MeshToonMaterial({ color: 0xff5a5a, gradientMap: G3.GRAD, emissive: 0x8a1010 }), [0, 0.56, 0], [0.06, 0.06, 0.06]);
    P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, 0); g.add(P.wingL); part(P.wingL, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
    P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, 0); g.add(P.wingR); part(P.wingR, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
    part(g, 'c', toon(0x2c3e66), [-0.16, 0.14, 0], [0.09, 0.28, 0.09]); part(g, 'c', toon(0x2c3e66), [0.16, 0.14, 0], [0.09, 0.28, 0.09]);
  } else {
    const cocky = kind === 'cocky', body = cocky ? 0xe9edf2 : 0x5f7f2c, belly = cocky ? 0xf6f7fa : 0x7f9e3a, wing = cocky ? 0xdfe5ee : 0x4e6c23, under = cocky ? 0xffe06a : 0xe2702a;
    P.body = part(g, 's', toon(body), [0, 0.62, 0], [0.42, 0.52, 0.38]);
    part(g, 's', toon(belly), [0, 0.55, 0.16], [0.3, 0.38, 0.26]);
    P.head = new T.Group(); P.head.position.set(0, 1.18, 0.02); g.add(P.head);
    part(P.head, 's', toon(body), [0, 0, 0], [0.32, 0.3, 0.3]);
    P.eyeL = part(P.head, 's', new T.MeshToonMaterial({ color: 0x1b1b22, gradientMap: G3.GRAD }), [-0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
    P.eyeR = part(P.head, 's', P.eyeL.material, [0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
    part(P.head, 's', basic(0xffffff), [-0.115, 0.075, 0.27], [0.015, 0.015, 0.01]); part(P.head, 's', basic(0xffffff), [0.145, 0.075, 0.27], [0.015, 0.015, 0.01]);
    part(P.head, 'k', toon(cocky ? 0x3a3a44 : 0x44464f), [0, -0.06, 0.3], [0.08, 0.2, 0.09], [Math.PI * 0.62, 0, 0]);
    if (cocky) for (let i = 0; i < 5; i++) part(P.head, 'k', toon(0xffd23b), [(i - 2) * 0.05, 0.3 + (2 - Math.abs(i - 2)) * 0.05, -0.06 - i * 0.02], [0.05, 0.3, 0.05], [-0.5 - i * 0.12, 0, (i - 2) * -0.25]);
    else part(P.head, 's', toon(0x6e8f30), [0, 0.2, -0.08], [0.12, 0.08, 0.16]);
    P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, -0.02); g.add(P.wingL);
    part(P.wingL, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingL, 's', toon(under), [0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
    P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, -0.02); g.add(P.wingR);
    part(P.wingR, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingR, 's', toon(under), [-0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
    part(g, 'k', toon(wing), [0, 0.35, -0.36], [0.16, 0.5, 0.08], [-1.9, 0, 0]);
    for (const x of [-0.13, 0.13]) part(g, 'c', toon(0x777a85), [x, 0.12, 0.05], [0.035, 0.22, 0.035]);
  }
  return { g, P };
}

/* ---------- 3D stage: the kid's guide on a floating island, and a 3D scene for every step of a lesson ----------
   Same cel look as the islands: toon shading and even ink outlines. The guide stands to one side and reacts with
   classic animation moves (anticipation, squash and stretch, follow-through) while the middle of the island acts
   out the step: the idea in a learn card (piggy banks, price tags, pies of percentages, coin stacks), or the task
   itself (jars to sort into, stepping stones to put in order, answer plinths, a balance scale), reacting to every
   tap the kid makes. Scenes are built from the step's own words and data, so new lessons get them for free. */
function Stage3D(canvas) {
  const T = window.THREE, G3 = C.G3; if (!T || !G3 || !G3.ok) return null;
  let R; try { R = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.setClearColor(0, 0);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x7d95e8, 0.85));
  const sun = new T.DirectionalLight(0xfff3dc, 0.85); sun.position.set(-3, 6, 5); scene.add(sun);
  const MAT = {}, toon = (c, o = {}) => { const k = c + JSON.stringify(o); if (MAT[k]) return MAT[k]; const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD, emissive: o.e || 0 }); G3.rimPatch(m); m.userData.keep = 1; return (MAT[k] = m); };
  const basic = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op ?? 1 });
  const geo = { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18), t: new T.TorusGeometry(1, 0.12, 10, 32), d: new T.DodecahedronGeometry(1, 0), c6: new T.CylinderGeometry(1, 1, 1, 6) };
  // r128 geometries and textures have no userData of their own, so the keep flag gets its own object.
  const keep = o => { o.userData = { ...(o.userData || {}), keep: 1 }; return o; };
  Object.values(geo).forEach(keep);
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(geo[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); if (g) g.add(m); return m; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };

  // Floating island the guide and the lesson stand on
  const world = new T.Group(); scene.add(world);
  const isle = new T.Group(); world.add(isle);
  part(isle, 'c', toon(0x58b84a), [0, -0.05, 0], [2.75, 0.18, 1.7]);
  part(isle, 'c', toon(0x8a5a3c), [0, -0.2, 0], [2.7, 0.16, 1.66]);
  part(isle, 'k', toon(0x7a5536), [0, -0.85, 0], [2.55, 1.2, 1.55], [Math.PI, 0, 0]);
  G3.outline(isle);

  /* ---- Tweens, labels and little animation verbs ---- */
  const E = { out: t => 1 - (1 - t) ** 3, back: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, io: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), lin: t => t,
    bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; } };
  const tws = new Set();
  const tw = (ms, fn, e = E.out) => new Promise(res => tws.add({ t0: performance.now(), d: Math.max(1, ms * (reduced ? 0.25 : 1)), fn, e, res }));
  const wait = ms => new Promise(r => setTimeout(r, ms * (reduced ? 0.25 : 1)));
  const TX = new Map(), EX = new Map();
  function textTex(text, fg, bg) {
    const key = `${text}|${fg}|${bg}`; if (TX.has(key)) return TX.get(key);
    const fs = 56, pad = 26, F = `900 ${fs}px Nunito, ui-rounded, system-ui, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = F;
    const W = Math.ceil(m.measureText(text).width) + pad * 2, H = fs + 30, c = document.createElement('canvas'); c.width = W + 10; c.height = H + 10;
    const x = c.getContext('2d'), r = H / 2; x.translate(5, 5); x.beginPath(); x.moveTo(r, 0); x.arcTo(W, 0, W, H, r); x.arcTo(W, H, 0, H, r); x.arcTo(0, H, 0, 0, r); x.arcTo(0, 0, W, 0, r); x.closePath();
    x.fillStyle = bg; x.fill(); x.lineWidth = 5; x.strokeStyle = '#2b2238'; x.stroke(); x.font = F; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 3);
    const tex = keep(new T.CanvasTexture(c)); const v = { tex, a: c.width / c.height }; TX.set(key, v); return v;
  }
  function label(text, o = {}) { const s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false })); s.renderOrder = 5; s.userData.h = o.h || 0.24; setLabel(s, text, o); return s; }
  function setLabel(s, text, o = {}) { const v = textTex(String(text), o.fg || '#0D1530', o.bg || '#ffffff'); s.material.map = v.tex; s.material.needsUpdate = true; s.scale.set(s.userData.h * v.a, s.userData.h, 1); }
  function emoji(e, h = 0.45) {
    let t = EX.get(e);
    if (!t) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72); t = keep(new T.CanvasTexture(c)); EX.set(e, t); }
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(h, h, 1); s.renderOrder = 4; return s;
  }
  const STAR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); return keep(new T.CanvasTexture(c)); })();
  const clip = (s, n = 18) => { s = local(String(s || '')).trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), w = c.replace(/\s+\S*$/, ''); return (w.length > 6 ? w : c) + '…'; };
  const PAL = [0x3b9bf0, 0xf0588f, 0x2fb257, 0xffb020, 0xa66bff, 0xff7a45, 0x18b597, 0xe5533d];
  const hexCss = c => '#' + c.toString(16).padStart(6, '0');
  const X0 = 0.55, spread = (n, w) => Array.from({ length: n }, (_, i) => X0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * w));
  // Outline once, then mark everything so a later outline of the whole scene doesn't add a second hull.
  const ink = o => { G3.outline(o); o.traverse(m => { if (m.isMesh && !m.userData.ink) m.userData.noInk = true; }); return o; };
  const coinM = toon(0xffc93c, { e: 0x5a3a00 });
  const coin = () => ink(part(null, 'c', coinM, [0, 0, 0], [0.12, 0.035, 0.12]));
  function pop(o, s = o.userData.full || (o.userData.full = o.scale.clone()), ms = 420, delay = 0) { const full = s.isVector3 ? s.clone() : new T.Vector3(s, s, s); o.scale.setScalar(0.001); o.visible = true; return wait(delay).then(() => tw(ms, k => o.scale.copy(full).multiplyScalar(Math.max(0.001, k)), E.back)); }
  function bounce(o, amt = 0.22) { const s0 = o.userData.s0 || (o.userData.s0 = o.scale.clone()); return tw(420, k => { const q = Math.sin(k * Math.PI) * (1 - k * 0.4); o.scale.set(s0.x * (1 - q * amt * 0.5), s0.y * (1 + q * amt), s0.z * (1 - q * amt * 0.5)); }, E.lin).then(() => o.scale.copy(s0)); }
  function shake(o) { const r0 = o.userData.r0 ?? (o.userData.r0 = o.rotation.z); return tw(460, k => { o.rotation.z = r0 + Math.sin(k * Math.PI * 6) * 0.14 * (1 - k); }, E.lin).then(() => { o.rotation.z = r0; }); }
  function lift(o, to, ms = 380) { const y0 = o.position.y; return tw(ms, k => { o.position.y = y0 + (to - y0) * k; }, E.back); }
  function fly(o, to, h = 0.8, ms = 520, spin = true) { const from = o.position.clone(); return tw(ms, k => { o.position.lerpVectors(from, to, k); o.position.y += Math.sin(Math.PI * k) * h; if (spin) o.rotation.x = k * Math.PI * 2; }, E.io); }
  function drop(o, ms = 560, h = 2.4) { const y = o.position.y; o.position.y = y + h; return tw(ms, k => { o.position.y = y + h * (1 - k); }, E.bounce); }
  function burst(parent, pos, color = 0xffe066, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: STAR, color, transparent: true, depthWrite: false })); s.position.copy(pos); s.renderOrder = 9; parent.add(s);
      const a = i / n * Math.PI * 2 + Math.random() * 0.4, d = new T.Vector3(Math.cos(a), 0.6 + Math.random() * 0.8, Math.sin(a) * 0.5).multiplyScalar(0.5 + Math.random() * 0.4);
      tw(700 + Math.random() * 300, k => { s.position.copy(pos).addScaledVector(d, k); s.material.opacity = 1 - k; s.scale.setScalar(0.22 * (1 - k * 0.6)); }).then(() => { parent.remove(s); s.material.dispose(); });
    }
  }
  const glow = (m, on, c = 0x3a2a00) => { if (!m.material) return; if (!m.userData.lit) { m.material = m.material.clone(); m.userData.lit = 1; } m.material.emissive.setHex(on ? c : 0); };
  const tick = (o, fn) => { o.userData.tick = fn; return o; };

  function buildGuide(kind) { const r = guideModel(kind, toon); G3.outline(r.g); return r; }
  let guide = null, guideKind = '';
  const holder = grp(world, 0, 0, 0.1); // moves the guide aside while a lesson scene is showing
  function setGuide(kind) {
    if (kind === guideKind) return; guideKind = kind;
    if (guide) holder.remove(guide.g);
    guide = buildGuide(kind); holder.add(guide.g);
  }
  // Wide stages put the guide beside the scene; tall ones tuck it in behind, so the scene can fill the width.
  let aside = false, tallLayout = false;
  function guideAside(on) {
    aside = on; const x0 = holder.position.x, z0 = holder.position.z, s0 = holder.scale.x, x1 = on ? (tallLayout ? -1.3 : -1.95) : 0, z1 = on && tallLayout ? -0.7 : 0.1, s1 = on ? (tallLayout ? 0.7 : 0.82) : 1;
    if (x0 === x1 && z0 === z1) return; tw(520, k => { holder.position.x = x0 + (x1 - x0) * k; holder.position.z = z0 + (z1 - z0) * k; holder.scale.setScalar(s0 + (s1 - s0) * k); }, E.io);
  }

  // Scene props, a few chunky shapes each. While a lesson scene shows, they step back to set the scene.
  const PROPS = {
    bank: g => { part(g, 'c', toon(0x8d97ab), [-1.25, 0.62, -0.35], [0.5, 0.12, 0.5], [Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) part(g, 'b', toon(0x5d6578), [-1.25, 0.62, -0.27], [0.06, 0.62, 0.06], [0, 0, i * Math.PI / 4]); for (let i = 0; i < 5; i++) part(g, 'c', toon(0xd9a400), [1.1, 0.06 + i * 0.09, -0.2], [0.22, 0.04, 0.22]); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xd9a400), [1.45, 0.06 + i * 0.09, 0.1], [0.22, 0.04, 0.22]); },
    shares: g => { [[0.35, 0x2fa84f], [0.65, 0x2fa84f], [0.45, 0xd9534f], [0.95, 0x2fa84f]].forEach(([h, c], i) => part(g, 'b', toon(c), [0.8 + i * 0.28, h / 2, -0.35], [0.2, h, 0.2])); part(g, 'k', toon(0xffd23b), [-1.2, 0.9, -0.3], [0.16, 0.3, 0.16], [0, 0, -0.6]); part(g, 'c', toon(0xffd23b), [-1.35, 0.6, -0.3], [0.05, 0.6, 0.05], [0, 0, -0.6]); },
    workshop: g => { part(g, 'b', toon(0xc23a2c), [1.15, 0.2, -0.2], [0.7, 0.36, 0.36]); part(g, 'b', toon(0x9aa3b5), [1.15, 0.43, -0.2], [0.3, 0.06, 0.06]); part(g, 'c', toon(0x9c6b3c), [-1.2, 0.3, -0.1], [0.04, 0.6, 0.04], [0, 0, 0.4]); part(g, 'b', toon(0x6d7486), [-1.32, 0.6, -0.1], [0.28, 0.12, 0.12], [0, 0, 0.4]); },
    stall: g => { part(g, 'b', toon(0x9c6b3c), [1.15, 0.3, -0.3], [0.9, 0.08, 0.5]); for (const x of [0.75, 1.55]) part(g, 'c', toon(0x9c6b3c), [x, 0.15, -0.3], [0.03, 0.3, 0.03]); for (let i = 0; i < 5; i++) part(g, 'b', toon(i % 2 ? 0xffffff : 0xe8473c), [0.75 + i * 0.2, 0.95, -0.42], [0.2, 0.04, 0.6], [0.35, 0, 0]); for (const x of [0.75, 1.55]) part(g, 'c', toon(0x9c6b3c), [x, 0.6, -0.55], [0.03, 0.75, 0.03]); for (let i = 0; i < 4; i++) part(g, 's', toon(0xffd84a), [0.85 + i * 0.18, 0.4, -0.25], [0.08, 0.07, 0.07]); },
    garden: g => { [[-1.2, 0xff6b9d], [-0.9, 0xffd23b], [1.1, 0xc084fc], [1.4, 0xff8a3d]].forEach(([x, c]) => { part(g, 'c', toon(0x3f8f35), [x, 0.18, -0.2], [0.02, 0.36, 0.02]); for (let i = 0; i < 5; i++) part(g, 's', toon(c), [x + Math.cos(i * 1.256) * 0.08, 0.38, -0.2 + Math.sin(i * 1.256) * 0.08], [0.06, 0.03, 0.06]); part(g, 's', toon(0xffe066), [x, 0.4, -0.2], [0.04, 0.04, 0.04]); }); },
    kitchen: g => { part(g, 'b', toon(0xe8dfcf), [1.15, 0.25, -0.3], [0.9, 0.5, 0.45]); part(g, 'b', toon(0x8d97ab), [1.15, 0.51, -0.3], [0.92, 0.04, 0.47]); part(g, 'c', toon(0x3d4357), [1.0, 0.66, -0.3], [0.17, 0.24, 0.17]); part(g, 'c', toon(0xff8a3d), [-1.2, 0.08, -0.1], [0.22, 0.16, 0.22]); },
    stage: g => { part(g, 'c', toon(0x3d4357), [1.15, 0.45, -0.2], [0.025, 0.9, 0.025]); part(g, 's', toon(0x9aa3b5), [1.15, 0.95, -0.2], [0.09, 0.11, 0.09]); part(g, 's', toon(0xffffff), [-1.2, 1.25, -0.4], [0.32, 0.2, 0.06]); part(g, 'k', toon(0xffffff), [-1.05, 1.05, -0.4], [0.07, 0.14, 0.04], [0, 0, 0.5]); },
    museum: g => { for (const x of [-1.45, -0.95]) { part(g, 'c', toon(0xf1ece2), [x, 0.5, -0.45], [0.09, 1.0, 0.09]); part(g, 'b', toon(0xe2dac9), [x, 1.03, -0.45], [0.24, 0.06, 0.24]); } part(g, 'b', toon(0xe2dac9), [1.2, 0.25, -0.2], [0.42, 0.5, 0.42]); part(g, 'c', toon(0xd9a400), [1.2, 0.72, -0.2], [0.2, 0.04, 0.2], [Math.PI / 2, 0, 0]); },
    home: g => { part(g, 'b', toon(0xf4e3c3), [1.2, 0.3, -0.35], [0.66, 0.6, 0.55]); part(g, 'k', toon(0xd9534f), [1.2, 0.82, -0.35], [0.56, 0.44, 0.48], [0, Math.PI / 4, 0]); part(g, 'b', toon(0x8a5a3c), [1.2, 0.18, -0.07], [0.16, 0.36, 0.02]); },
    online: g => { part(g, 'b', toon(0x23283a), [1.2, 0.65, -0.35], [0.56, 1.0, 0.08]); part(g, 'b', toon(0x5ac8fa, { e: 0x1a4a6a }), [1.2, 0.67, -0.3], [0.48, 0.84, 0.02]); part(g, 'b', toon(0xffc93c), [-1.2, 0.3, -0.2], [0.34, 0.28, 0.16]); const s = new T.Mesh(new T.TorusGeometry(0.12, 0.035, 8, 18, Math.PI), toon(0x9aa3b5)); s.position.set(-1.2, 0.44, -0.2); g.add(s); },
    townhall: g => { part(g, 'b', toon(0xf1ece2), [1.2, 0.36, -0.4], [0.9, 0.5, 0.45]); part(g, 'k', toon(0xd9cbb0), [1.2, 0.8, -0.4], [0.66, 0.36, 0.3], [0, Math.PI / 4, 0]); for (let i = 0; i < 4; i++) part(g, 'c', toon(0xffffff), [0.88 + i * 0.21, 0.36, -0.15], [0.04, 0.5, 0.04]); part(g, 'b', toon(0x2f6fe4), [-1.2, 0.2, -0.1], [0.34, 0.4, 0.3]); part(g, 'b', toon(0x1b1b22), [-1.2, 0.41, -0.1], [0.16, 0.02, 0.03]); },
    island: g => { part(g, 'c', toon(0x8a5a3c), [1.25, 0.3, -0.35], [0.06, 0.6, 0.06]); part(g, 's', toon(0x4caf50), [1.25, 0.75, -0.35], [0.36, 0.32, 0.36]); part(g, 's', toon(0x66c05a), [1.05, 0.68, -0.2], [0.22, 0.2, 0.22]); part(g, 's', toon(0xff6b9d), [-1.15, 0.08, -0.05], [0.07, 0.07, 0.07]); },
  };
  let props = null, sceneKey = '';
  const setRoot = grp(world), subjRoot = grp(world);
  function setScene(key) {
    if (key === sceneKey) return; sceneKey = key;
    if (props) setRoot.remove(props);
    props = new T.Group(); (PROPS[key] || PROPS.island)(props); G3.outline(props); setRoot.add(props);
    props.scale.setScalar(0.01); props.userData.pop = performance.now();
  }
  function setBack(on) { const z0 = setRoot.position.z, z1 = on ? -1.05 : 0, s0 = setRoot.scale.x, s1 = on ? 0.62 : 1; if (z0 === z1) return; tw(520, k => { setRoot.position.z = z0 + (z1 - z0) * k; setRoot.scale.setScalar(s0 + (s1 - s0) * k); }, E.io); }

  /* ---- Ideas: little animated props picked from the words of a hook, learn card or question ---- */
  const CONCEPTS = [
    [/\bunit price|per 100 ?g|per litre|per kg|compar(e|ing)|better value|best value\b/i, 'scale', 'Compare'],
    [/\bsav(e|es|ed|ing|ings)\b|\bvault\b|\bpiggy\b|put (it )?away/i, 'piggy', 'Save'],
    [/\bscam\w*|fraud|phish\w*|\bfake\b|\btrick\w*/i, 'shield', 'Stay safe'],
    [/\bbudget\w*|\bplan(s|ning|ned)?\b|\bgoal\w*|\blist\b/i, 'plan', 'Plan'],
    [/\binterest\b|\bgrow(s|n|th|ing)?\b|compound|invest\w*/i, 'plant', 'Grow'],
    [/\bshares?\b|\bstocks?\b|\bmarket\b|\bfunds?\b|\bindex\b/i, 'chart', 'Market'],
    [/\bg(i|a)v(e|es|ing)\b|donat\w*|charit\w*|\bkind\w*|\bcauses?\b|volunteer\w*|\bthank\w*|\bhelp(s|ed|ing)?\b/i, 'heart', 'Give'],
    [/\bsell(s|ing)?\b|\bsold\b|customer\w*|profit\w*|business\w*|\bstall\b/i, 'stall', 'Sell'],
    [/\bprice\w*|\bcost(s|ing)?\b|\bdeal\w*|special\w*|discount\w*|\bsale\b|cheap\w*|expensive/i, 'tag', 'Price'],
    [/\bspend\w*|\bspent\b|\bbuy\w*|\bbought\b|\bshop(s|ping)?\b|purchas\w*/i, 'bag', 'Spend'],
    [/\bcards?\b|eftpos|pay ?later|credit|\bdebt\w*|\bloans?\b|borrow\w*|\bowe\w*/i, 'card', 'Card'],
    [/\bonline\b|internet|\bapps?\b|\bphones?\b|message\w*|\btexts?\b|email\w*|password\w*|privacy|\bpost(s|ed)?\b/i, 'phone', 'Online'],
    [/\bwork(s|ing|er|ers)?\b|\bjobs?\b|\bboss\w*|career\w*|employ\w*|\bskills?\b/i, 'tools', 'Work'],
    [/\btax\w*|council\w*|government|\bvot(e|es|ing)\b|\blaws?\b|\brules?\b|\bpublic\b/i, 'hall', 'Community'],
    [/\bfood\b|\blunch\w*|\bcook\w*|recipe\w*|\bmeals?\b|kitchen/i, 'food', 'Food'],
    [/\bhome\b|\bhouse\w*|\brent\w*|\bbills?\b|clean\w*|chores?/i, 'house', 'Home'],
    [/\bfeel\w*|\bcalm\w*|breath\w*|\bworr\w*|stress\w*|habit\w*|\bsleep\w*|\bmind\w*/i, 'calm', 'Mind'],
    [/\bhistory\b|ancient|barter\w*|\bshells?\b|long ago|centur\w*|\bkings?\b/i, 'urn', 'Long ago'],
    [/\btime\b|\bhours?\b|\bminutes?\b|\blate\b|\bweek(s|ly)?\b|\bdays?\b|\byears?\b/i, 'clock', 'Time'],
    [/\bread\w*|\bwrit\w*|\bwords?\b|\bspeak\w*|\bask\w*|explain\w*|\bstory\b|persuad\w*/i, 'speech', 'Words'],
    [/\bmoney\b|\$\d|dollars?|\bpay\b|\bpaid\b|\bearn\w*|pocket money|income|\bwage\w*/i, 'coins', 'Money'],
  ];
  function conceptsOf(text, n = 2) { const out = []; for (const [re, k, name] of CONCEPTS) { if (out.length >= n) break; if (re.test(text) && !out.some(o => o.k === k)) out.push({ k, name }); } return out; }
  const IDEA = {
    piggy: g => { const b = grp(g); part(b, 's', toon(0xff9ebb), [0, 0.4, 0], [0.4, 0.32, 0.32]); part(b, 'c', toon(0xff7fa6), [0.4, 0.42, 0], [0.1, 0.08, 0.1], [0, 0, Math.PI / 2]); for (const s of [-1, 1]) { part(b, 'k', toon(0xff86ae), [0.16, 0.72, 0.13 * s], [0.07, 0.13, 0.05], [0, 0, -0.4]); part(b, 's', toon(0x1b1b22), [0.32, 0.52, 0.13 * s], [0.03, 0.03, 0.03]); for (const f of [-1, 1]) part(b, 'c', toon(0xff8fb3), [0.2 * f, 0.1, 0.16 * s], [0.06, 0.18, 0.06]); } part(b, 'b', toon(0x7a2848), [0, 0.72, 0], [0.04, 0.02, 0.16]); b.rotation.y = -0.5; const c = coin(); g.add(c); c.visible = false; return t => { const p = (t % 2.2) / 2.2; c.visible = p < 0.5; c.position.set(0, 1.5 - p * 1.6, 0); c.rotation.x = p * 9; if (p > 0.5 && p < 0.6) b.scale.set(1.04, 0.96, 1.04); else b.scale.set(1, 1, 1); }; },
    shield: g => { const s = part(g, 'c6', toon(0x6a79f0), [0, 0.6, 0], [0.42, 0.08, 0.5], [Math.PI / 2, 0, 0]); part(g, 'b', toon(0xffffff), [-0.06, 0.58, 0.06], [0.08, 0.26, 0.04], [0, 0, 0.7]); part(g, 'b', toon(0xffffff), [0.08, 0.64, 0.06], [0.08, 0.4, 0.04], [0, 0, -0.6]); return t => { s.scale.set(0.42 + Math.sin(t * 3) * 0.02, 0.08, 0.5 + Math.sin(t * 3) * 0.02); g.rotation.y = Math.sin(t) * 0.3; }; },
    plan: g => { part(g, 'b', toon(0xb07a45), [0, 0.55, 0], [0.6, 0.75, 0.05]); part(g, 'b', toon(0xffffff), [0, 0.53, 0.03], [0.52, 0.66, 0.02]); part(g, 'b', toon(0x9aa3b5), [0, 0.93, 0.04], [0.2, 0.07, 0.04]); const ticks = [0, 1, 2].map(i => { part(g, 'b', toon(0xc9cfdc), [0.06, 0.74 - i * 0.2, 0.05], [0.28, 0.04, 0.01]); const k = part(g, 's', toon(0x2fb257), [-0.17, 0.74 - i * 0.2, 0.06], [0.05, 0.05, 0.02]); return k; }); return t => { const n = Math.floor((t % 3.6) / 0.9); ticks.forEach((k, i) => { k.visible = i < n; }); }; },
    plant: g => { part(g, 'c', toon(0xc8693c), [0, 0.15, 0], [0.22, 0.3, 0.22]); const stem = part(g, 'c', toon(0x3f8f35), [0, 0.3, 0], [0.03, 0.01, 0.03]); const leaves = [0, 1, 2, 3].map(i => part(g, 's', toon(0x43b65a), [0, 0, 0], [0.1, 0.05, 0.16])); const coins = [0, 1, 2].map(() => { const c = coin(); g.add(c); return c; }); return t => { const p = Math.min(1, (t % 4) / 2.6), h = 0.05 + p * 0.75; stem.scale.y = h; stem.position.y = 0.3 + h / 2; leaves.forEach((l, i) => { const y = 0.38 + (i + 1) / 5 * h; l.position.set((i % 2 ? 1 : -1) * 0.1, y, 0); l.rotation.z = (i % 2 ? -1 : 1) * 0.5; l.visible = p > i / 5; }); coins.forEach((c, i) => { c.visible = p > 0.7 + i * 0.1; c.position.set((i - 1) * 0.16, 0.3 + h + 0.05, 0.05); c.rotation.x = Math.PI / 2; }); }; },
    chart: g => { const bars = [0, 1, 2, 3].map(i => part(g, 'b', toon(i === 2 ? 0xe5533d : 0x2fb257), [-0.36 + i * 0.24, 0, 0], [0.18, 1, 0.18])); return t => { bars.forEach((b, i) => { const h = 0.25 + i * 0.18 + Math.sin(t * 1.6 + i) * 0.1 - (i === 2 ? 0.25 : 0); b.scale.y = Math.max(0.08, h); b.position.y = b.scale.y / 2; }); }; },
    heart: g => { const h = grp(g, 0, 0.55, 0); part(h, 's', toon(0xf25ca2), [-0.13, 0.08, 0], [0.18, 0.18, 0.14]); part(h, 's', toon(0xf25ca2), [0.13, 0.08, 0], [0.18, 0.18, 0.14]); part(h, 'k', toon(0xf25ca2), [0, -0.14, 0], [0.3, 0.32, 0.14], [Math.PI, 0, 0]); return t => { const b = 1 + Math.max(0, Math.sin(t * 6)) * 0.12; h.scale.setScalar(b); }; },
    stall: g => { part(g, 'b', toon(0xe9c08a), [0, 0.2, 0], [0.7, 0.36, 0.3]); for (let i = 0; i < 4; i++) part(g, 'b', toon(i % 2 ? 0xffffff : 0xffb020), [-0.27 + i * 0.18, 0.78, 0.02], [0.18, 0.03, 0.4], [0.3, 0, 0]); for (const x of [-0.32, 0.32]) part(g, 'c', toon(0x9c6b3c), [x, 0.45, -0.12], [0.025, 0.7, 0.025]); const lem = [0, 1, 2].map(i => part(g, 's', toon(0xffe14a), [-0.18 + i * 0.18, 0.43, 0.04], [0.07, 0.06, 0.06])); return t => { lem.forEach((l, i) => { l.position.y = 0.43 + Math.max(0, Math.sin(t * 4 + i * 2)) * 0.08; }); }; },
    tag: g => { const p = grp(g, 0, 1.0, 0); part(p, 'c', toon(0x5d636b), [0, -0.12, 0], [0.01, 0.24, 0.01]); const tg = part(p, 'b', toon(0xff5a4e), [0, -0.42, 0], [0.38, 0.3, 0.04]); const l = label('$', { h: 0.22, fg: '#E5483D' }); l.position.set(0, -0.42, 0.04); p.add(l); return t => { p.rotation.z = Math.sin(t * 2) * 0.25; }; },
    bag: g => { part(g, 'b', toon(0xf2a31b), [0, 0.3, 0], [0.5, 0.56, 0.3]); const h = part(g, 't', toon(0x8a5a3c), [0, 0.6, 0], [0.14, 0.14, 0.14]); const items = [0x3b9bf0, 0xf0588f, 0x2fb257].map((c, i) => part(g, 's', toon(c), [(i - 1) * 0.12, 0.6, 0], [0.08, 0.08, 0.08])); return t => { items.forEach((it, i) => { const p = ((t + i * 0.6) % 1.8) / 1.8; it.position.y = 0.58 + Math.sin(p * Math.PI) * 0.4; it.visible = p < 0.95; }); h.rotation.x = Math.PI / 2; }; },
    card: g => { const c = grp(g, 0, 0.55, 0); part(c, 'b', toon(0x2f6fe4), [0, 0, 0], [0.62, 0.4, 0.03]); part(c, 'b', toon(0xffc93c), [-0.16, 0.04, 0.02], [0.12, 0.09, 0.01]); part(c, 'b', toon(0x1b1b22), [0, -0.12, 0.02], [0.5, 0.05, 0.01]); return t => { c.position.x = Math.sin(t * 2) * 0.12; c.rotation.y = Math.sin(t * 2) * 0.4; }; },
    phone: g => { part(g, 'b', toon(0x23283a), [0, 0.6, 0], [0.42, 0.78, 0.06]); part(g, 'b', toon(0x9bd8ff, { e: 0x1a3a5a }), [0, 0.62, 0.035], [0.36, 0.64, 0.01]); const b = emoji('💬', 0.32); b.position.set(0.32, 1.1, 0.1); g.add(b); return t => { const s = 0.28 + Math.abs(Math.sin(t * 2)) * 0.08; b.scale.set(s, s, 1); }; },
    tools: g => { part(g, 'b', toon(0xc23a2c), [0, 0.18, 0], [0.62, 0.34, 0.32]); part(g, 't', toon(0x6d7486), [0, 0.42, 0], [0.12, 0.12, 0.12]); const hm = grp(g, 0.42, 0.42, 0.1); part(hm, 'c', toon(0x9c6b3c), [0, 0.2, 0], [0.025, 0.4, 0.025]); part(hm, 'b', toon(0x6d7486), [0, 0.42, 0], [0.22, 0.1, 0.1]); return t => { hm.rotation.z = -Math.abs(Math.sin(t * 4)) * 0.9; }; },
    hall: g => { part(g, 'b', toon(0xf1ece2), [0, 0.3, 0], [0.8, 0.44, 0.4]); part(g, 'k', toon(0xd9cbb0), [0, 0.68, 0], [0.6, 0.32, 0.28], [0, Math.PI / 4, 0]); for (let i = 0; i < 4; i++) part(g, 'c', toon(0xffffff), [-0.3 + i * 0.2, 0.3, 0.22], [0.035, 0.44, 0.035]); part(g, 'c', toon(0x5d636b), [0, 1.05, 0], [0.012, 0.5, 0.012]); const f = part(g, 'b', toon(0x2f6fe4), [0.12, 1.22, 0], [0.24, 0.14, 0.01]); return t => { f.rotation.y = Math.sin(t * 5) * 0.4; }; },
    food: g => { part(g, 'c', toon(0xffffff), [0, 0.04, 0], [0.4, 0.04, 0.4]); const a = part(g, 's', toon(0xe5533d), [-0.12, 0.18, 0], [0.13, 0.13, 0.13]); part(g, 'b', toon(0xf4d58d), [0.16, 0.14, 0.04], [0.24, 0.12, 0.2]); part(g, 'b', toon(0x6fbf4a), [0.16, 0.21, 0.04], [0.26, 0.03, 0.22]); return t => { a.position.y = 0.18 + Math.abs(Math.sin(t * 3)) * 0.05; }; },
    house: g => { part(g, 'b', toon(0xf4e3c3), [0, 0.28, 0], [0.6, 0.56, 0.5]); part(g, 'k', toon(0xd9534f), [0, 0.76, 0], [0.5, 0.4, 0.44], [0, Math.PI / 4, 0]); part(g, 'b', toon(0x8a5a3c), [-0.12, 0.16, 0.26], [0.14, 0.32, 0.02]); const w = part(g, 'b', toon(0xffe066, { e: 0x5a4a00 }), [0.15, 0.34, 0.26], [0.14, 0.13, 0.02]); return t => { w.visible = Math.sin(t * 1.5) > -0.6; }; },
    calm: g => { const b = part(g, 's', toon(0x9be3f2), [0, 0.55, 0], [0.3, 0.3, 0.3]); for (let i = 0; i < 6; i++) part(g, 's', toon(0xff9ec7), [Math.cos(i) * 0.3, 0.1, Math.sin(i) * 0.3], [0.14, 0.05, 0.08], [0, -i, 0]); return t => { const s = 0.24 + (Math.sin(t * 1.2) + 1) * 0.08; b.scale.setScalar(s); }; },
    urn: g => { const prof = [[0, 0], [0.12, 0], [0.2, 0.15], [0.22, 0.32], [0.12, 0.55], [0.09, 0.62], [0.13, 0.66]].map(p => new T.Vector2(p[0], p[1])); const u = new T.Mesh(new T.LatheGeometry(prof, 20), toon(0xc98a3e)); g.add(u); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xb08d3a), [0.3 + i * 0.05, 0.02 + i * 0.035, 0.1], [0.08, 0.02, 0.08]); return t => { u.rotation.y = t * 0.6; }; },
    clock: g => { part(g, 'c', toon(0xffffff), [0, 0.6, 0], [0.38, 0.06, 0.38], [Math.PI / 2, 0, 0]); part(g, 't', toon(0x2f6fe4), [0, 0.6, 0], [0.38, 0.38, 0.3]); const hh = grp(g, 0, 0.6, 0.05), mh = grp(g, 0, 0.6, 0.06); part(hh, 'b', toon(0x1b1b22), [0, 0.09, 0], [0.04, 0.18, 0.02]); part(mh, 'b', toon(0x1b1b22), [0, 0.13, 0], [0.03, 0.26, 0.02]); part(g, 'c', toon(0x5d636b), [0, 0.11, 0], [0.04, 0.22, 0.04]); return t => { mh.rotation.z = -t * 3; hh.rotation.z = -t * 0.25; }; },
    speech: g => { const a = emoji('💬', 0.42), b = emoji('🗨️', 0.42); a.position.set(-0.22, 0.7, 0); b.position.set(0.25, 0.95, 0); g.add(a, b); return t => { a.visible = Math.sin(t * 2) > -0.3; b.visible = Math.sin(t * 2) < 0.3; }; },
    scale: g => { part(g, 'c', toon(0x8c6a4e), [0, 0.03, 0], [0.24, 0.06, 0.24]); part(g, 'c', toon(0xa07a55), [0, 0.42, 0], [0.03, 0.8, 0.03]); const p = grp(g, 0, 0.82, 0); part(p, 'b', toon(0xc99a5e), [0, 0, 0], [1.0, 0.05, 0.06]); const pans = [-0.46, 0.46].map(x => { const q = grp(g); part(q, 'c', toon(0xe8c46a), [0, 0, 0], [0.2, 0.03, 0.2]); part(q, 'b', toon(x < 0 ? 0xf0583d : 0x3b9bf0), [0, 0.1, 0], [0.14, 0.16, 0.1]); return [q, x]; }); return t => { const a = Math.sin(t * 1.4) * 0.16; p.rotation.z = a; pans.forEach(([q, x]) => q.position.set(x * Math.cos(a), 0.82 + x * Math.sin(a) - 0.34, 0)); }; },
    coins: g => { const cs = []; for (let i = 0; i < 6; i++) { const c = coin(); c.position.set(0, 0.02 + i * 0.04, 0); g.add(c); cs.push(c); } return t => { const n = 1 + Math.floor((t % 3) / 0.5); cs.forEach((c, i) => { c.visible = i < n; }); }; },
  };
  function ideaProp(k, name) { const g = new T.Group(); const act = (IDEA[k] || IDEA.coins)(g); const l = label(name, { h: 0.24 }); l.position.y = 1.45; g.add(l); return tick(g, act); }

  // Numbers in the words become things: dollar amounts are coin towers, percentages are slices of a pie.
  function numbers(text) {
    const s = local(text), d = [...s.matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map(m => +m[1]).slice(0, 3), p = [...s.matchAll(/(\d+(?:\.\d+)?)\s?%/g)].map(m => +m[1]).filter(v => v > 0 && v <= 100).slice(0, 4);
    return { dollars: [...new Set(d)], pcts: p };
  }
  function wedge(a0, a1, r, h) { const sh = new T.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, a0, a1, false); sh.lineTo(0, 0); const g2 = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: Math.max(3, Math.ceil((a1 - a0) * 9)) }); g2.rotateX(-Math.PI / 2); return g2; }
  function pie(pcts, r = 0.55) {
    const g = new T.Group(); let a = Math.PI / 2, sum = pcts.reduce((x, y) => x + y, 0); const list = sum <= 100 ? pcts.concat(sum < 100 ? [100 - sum] : []) : [pcts[0], 100 - pcts[0]];
    list.forEach((v, i) => { const a1 = a + v / 100 * Math.PI * 2, rest = i === list.length - 1 && sum < 100 && list.length > pcts.length, mid = (a + a1) / 2; const m = new T.Mesh(wedge(a, a1, r, rest ? 0.08 : 0.16 + (i === 0 ? 0.06 : 0)), toon(rest ? 0xd9dee8 : PAL[i % PAL.length])); m.position.set(Math.cos(mid) * 0.05, 0, -Math.sin(mid) * 0.05); g.add(m); if (!rest) { const l = label(`${v}%`, { h: 0.18, fg: hexCss(PAL[i % PAL.length]) }); l.position.set(Math.cos(mid) * r * 0.75, 0.42, -Math.sin(mid) * r * 0.75); g.add(l); } a = a1; });
    return g;
  }
  function tower(v) { const g = new T.Group(), n = clamp(Math.round(Math.log2(v + 1) * 1.6), 1, 14); for (let i = 0; i < n; i++) { const c = coin(); c.position.y = 0.02 + i * 0.04; g.add(c); c.visible = false; wait(i * 70).then(() => { c.visible = true; drop(c, 420, 1.2); }); } const l = label('$' + (v % 1 ? v.toFixed(2) : v), { h: 0.2 }); l.position.y = 0.2 + n * 0.04; g.add(l); return g; }

  /* ---- Scenes for each part of a lesson ---- */
  const SC = {};
  // Hook: the lesson's emoji spins in on a pedestal, with the ideas it's about and a question mark.
  SC.hook = ({ icon, text }) => {
    const g = new T.Group(); part(g, 'c', toon(0xffffff), [X0, 0.12, 0], [0.42, 0.24, 0.42]); part(g, 'c', toon(0xffc93c), [X0, 0.26, 0], [0.44, 0.04, 0.44]);
    const e = emoji(icon || '💡', 0.85); e.position.set(X0, 0.82, 0); g.add(e);
    const q = label('?', { h: 0.34, fg: '#2F6FE4' }); q.position.set(X0 + 0.6, 1.25, 0); g.add(q);
    const ideas = conceptsOf(text, 2).map((c, i) => { const p = ideaProp(c.k, c.name); p.position.set(i ? X0 + 1.35 : X0 - 0.95, 0, 0.1); p.scale.setScalar(0.75); g.add(p); return p; });
    return { g, enter() { ideas.forEach((p, i) => pop(p, 0.75, 420, 150 + i * 160)); }, tick(t) { e.position.y = 0.82 + Math.sin(t * 2) * 0.06; q.position.y = 1.25 + Math.abs(Math.sin(t * 3)) * 0.12; ideas.forEach(p => p.userData.tick && p.userData.tick(t)); } };
  };
  // Learn card: the idea itself. Numbers become coin towers and pies; key words become little animated props.
  SC.idea = ({ text, icon }) => {
    const g = new T.Group(), n = numbers(text), cs = conceptsOf(text, n.pcts.length || n.dollars.length ? 1 : 2), parts = [];
    if (n.pcts.length) { const p = pie(n.pcts); parts.push(p); }
    n.dollars.slice(0, n.pcts.length ? 1 : 3).forEach(v => parts.push(tower(v)));
    cs.forEach(c => parts.push(ideaProp(c.k, c.name)));
    if (!parts.length) { const e = emoji(icon || '💡', 0.7); e.position.y = 0.7; const h = new T.Group(); h.add(e); part(h, 'c', toon(0xffffff), [0, 0.1, 0], [0.3, 0.2, 0.3]); parts.push(tick(h, t => { e.position.y = 0.7 + Math.sin(t * 2) * 0.06; })); }
    const xs = spread(parts.length, parts.length > 2 ? 2.4 : 1.6);
    parts.forEach((p, i) => { p.position.set(xs[i], 0, 0.15 - (i % 2) * 0.2); p.visible = false; g.add(p); });
    return { g, enter() { parts.forEach((p, i) => pop(p, 1, 460, i * 220)); }, tick(t) { parts.forEach(p => p.userData.tick && p.userData.tick(t)); } };
  };
  SC.home = ({ text }) => {
    const g = new T.Group(), h = ideaProp('house', 'At home'); h.position.set(X0 - 0.5, 0, -0.1); g.add(h);
    const pl = ideaProp('plan', 'Try it'); pl.position.set(X0 + 0.75, 0, 0.15); g.add(pl);
    const cs = conceptsOf(text, 1).filter(c => c.k !== 'house' && c.k !== 'plan').map(c => { const p = ideaProp(c.k, c.name); p.position.set(X0 + 1.6, 0, 0); p.scale.setScalar(0.7); g.add(p); return p; });
    return { g, tick(t) { [h, pl, ...cs].forEach(p => p.userData.tick(t)); } };
  };
  SC.intro = ({ n }) => {
    const g = new T.Group(); part(g, 'c', toon(0x3b2f5c), [X0, 0.15, 0], [0.5, 0.3, 0.5]);
    const prof = [[0, 0], [0.2, 0], [0.2, 0.06], [0.07, 0.1], [0.05, 0.3], [0.1, 0.34], [0.24, 0.42], [0.27, 0.7], [0.25, 0.7], [0.21, 0.46], [0, 0.44]].map(p => new T.Vector2(p[0], p[1]));
    const cup = grp(g, X0, 0.3, 0); cup.add(new T.Mesh(new T.LatheGeometry(prof, 24), coinM)); for (const s of [-1, 1]) { const hd = new T.Mesh(new T.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), coinM); hd.position.set(0.27 * s, 0.56, 0); hd.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; cup.add(hd); }
    const qs = []; for (let i = 0; i < Math.min(8, n || 6); i++) { const q = label('?', { h: 0.2, fg: '#2F6FE4' }); const a = i / Math.min(8, n || 6) * Math.PI * 2; q.position.set(X0 + Math.cos(a) * 0.95, 0.7, Math.sin(a) * 0.5); g.add(q); qs.push([q, a]); }
    return { g, tick(t) { cup.rotation.y = t * 0.8; qs.forEach(([q, a]) => { q.position.set(X0 + Math.cos(a + t * 0.6) * 0.95, 0.7 + Math.sin(t * 2 + a) * 0.1, Math.sin(a + t * 0.6) * 0.5); }); } };
  };
  // quiet: the results screen underneath plays the star sounds
  SC.done = ({ stars = 0, pass = true, quiet = false }) => {
    const g = new T.Group(), list = [];
    for (let i = 0; i < 3; i++) { const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.12 : 0.28, a = Math.PI / 2 + k * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const sg = new T.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); sg.center(); const s = new T.Mesh(sg, i < stars ? coinM : toon(0x4b5675)); s.position.set(X0 + (i - 1) * 0.75, i === 1 ? 1.0 : 0.8, 0); s.visible = false; g.add(s); list.push(s); }
    return { g, enter() { list.forEach((s, i) => pop(s, 1, 500, i * 260).then(() => { if (i < stars) { burst(g, s.position.clone(), 0xffe066, 10); if (!quiet && C.Sound && C.Sound.step) C.Sound.step(i + 2); } })); }, tick(t) { list.forEach((s, i) => { s.rotation.y = Math.sin(t * 2 + i) * 0.4; }); } };
  };

  /* ---- Task scenes: one per kind of question or game, reacting to every move the kid makes ---- */
  function plinths(n, colors, labels, w = 2.3) {
    const xs = spread(n, n > 2 ? w : 1.5); return xs.map((x, i) => { const p = grp(null, x, 0, 0.15); const top = part(p, 'c', toon(colors[i % colors.length]), [0, 0.15, 0], [0.24, 0.3, 0.24]); part(p, 'c', toon(0xffffff), [0, 0.31, 0], [0.26, 0.03, 0.26]); if (labels) { const l = label(labels[i], { h: 0.22 }); l.position.y = 0.62; p.add(l); p.userData.l = l; } p.userData.top = top; return p; });
  }
  const LETTERS = 'ABCDEF';
  SC.mcq = ({ n = 3, q }) => {
    const g = new T.Group(), ps = plinths(n, PAL, [...LETTERS.slice(0, n)]); ps.forEach(p => g.add(p));
    const cs = conceptsOf(q || '', 1).map(c => { const p = ideaProp(c.k, c.name); p.position.set(X0, 0, -0.75); p.scale.setScalar(0.6); g.add(p); return p; });
    let picked = -1;
    return { g, enter() { ps.forEach((p, i) => pop(p, 1, 380, i * 120)); }, tick(t) { cs.forEach(p => p.userData.tick(t)); ps.forEach((p, i) => { if (i !== picked) p.position.y = Math.sin(t * 2 + i) * 0.03; }); },
      on(e, d) {
        if (e === 'pick') { picked = d.i; const p = ps[d.i]; if (!p) return; lift(p, 0.25); if (d.ok) { glow(p.userData.top, true, 0x1f6a2a); burst(g, p.position.clone().add(new T.Vector3(0, 0.9, 0)), 0x7cf29c, 12); } else { shake(p); (d.right || []).forEach(j => ps[j] && (glow(ps[j].userData.top, true, 0x1f6a2a), bounce(ps[j]))); } }
      } };
  };
  SC.tf = ({ q }) => {
    const g = new T.Group(), posts = [['True', 0x2fb257, X0 + 0.9], ['False', 0xe5533d, X0 - 0.9]].map(([t, c, x]) => { const p = grp(g, x, 0, 0); part(p, 'c', toon(0x9c6b3c), [0, 0.4, 0], [0.04, 0.8, 0.04]); const b = part(p, 'b', toon(c), [0, 0.85, 0], [0.5, 0.26, 0.05]); const l = label(t === 'True' ? '✓ True' : '✗ False', { h: 0.2, fg: hexCss(c) }); l.position.set(0, 0.86, 0.06); p.add(l); p.userData.b = b; return p; });
    const card = grp(g, X0, 0.8, 0.2); part(card, 'b', toon(0xffffff), [0, 0, 0], [0.42, 0.56, 0.03]); const qm = label('?', { h: 0.26, fg: '#2F6FE4' }); qm.position.z = 0.03; card.add(qm);
    let gone = false;
    return { g, tick(t) { if (!gone) { card.rotation.y = Math.sin(t * 1.5) * 0.5; card.position.y = 0.8 + Math.sin(t * 2) * 0.05; } },
      on(e, d) { if (e === 'lean') card.position.x = X0 + clamp(d.dx / 300, -0.6, 0.6); if (e === 'pick') { gone = true; const p = posts[d.v ? 0 : 1]; fly(card, p.position.clone().add(new T.Vector3(0, 0.3, 0.12)), 0.5, 480, false).then(() => { if (d.ok) { burst(g, p.position.clone().add(new T.Vector3(0, 1.1, 0)), 0x7cf29c); bounce(p); } else shake(p); }); } } };
  };
  SC.gap = ({ q, opts }) => {
    const g = new T.Group(), n = numbers(q || ''), tile = grp(g, X0 + 0.55, 0, 0.1); part(tile, 'b', toon(0x9aa3b5), [0, 0.2, 0], [0.5, 0.4, 0.4]); const face = part(tile, 'b', toon(0xffffff), [0, 0.72, 0], [0.8, 0.6, 0.1]); const v = label('?', { h: 0.34, fg: '#2F6FE4' }); v.position.set(0, 0.72, 0.08); tile.add(v);
    const extra = n.pcts.length ? pie(n.pcts.slice(0, 2), 0.42) : n.dollars.length ? tower(n.dollars[0]) : null; if (extra) { extra.position.set(X0 - 0.75, 0, 0.1); g.add(extra); }
    return { g, on(e, d) { if (e === 'type') { setLabel(v, d.val || '?', { fg: '#2F6FE4' }); bounce(tile, 0.08); } if (e === 'next') { setLabel(v, '?', { fg: '#2F6FE4' }); glow(face, false); pop(tile, 1, 300); } if (e === 'pick') { setLabel(v, d.v || '?', { fg: d.ok ? '#1E8A40' : '#E5483D' }); glow(face, true, d.ok ? 0x1f6a2a : 0x6a1f1f); if (d.ok) { burst(g, tile.position.clone().add(new T.Vector3(0, 1.2, 0)), 0x7cf29c, 12); bounce(tile); } else shake(tile); } } };
  };
  SC.sort = ({ bins, colors }) => {
    const g = new T.Group(), n = bins.length, xs = spread(n, n > 3 ? 2.6 : 2.0);
    const prof = [[0, 0], [0.23, 0], [0.26, 0.05], [0.27, 0.4], [0.22, 0.48], [0.19, 0.52], [0.19, 0.57]].map(p => new T.Vector2(p[0], p[1])), jarG = new T.LatheGeometry(prof, 22);
    const glass = new T.MeshToonMaterial({ color: 0xddf2ff, gradientMap: G3.GRAD, transparent: true, opacity: 0.36, depthWrite: false });
    const jars = bins.map((b, i) => { const j = grp(g, xs[i], 0, -0.1); j.add(new T.Mesh(jarG, glass)); const c = colors[i] || PAL[i % PAL.length]; part(j, 'c', toon(c), [0, 0.6, 0], [0.21, 0.08, 0.21]); part(j, 'c', toon(c), [0, 0.025, 0], [0.25, 0.05, 0.25]); const l = label(clip(b, 12), { h: 0.19, fg: hexCss(c) }); l.position.y = 0.9; j.add(l); j.userData.n = 0; j.userData.tokens = {}; return j; });
    const tray = []; const home = k => new T.Vector3(X0 - 0.6 + (k % 6) * 0.24, 0.02 + Math.floor(k / 6) * 0.04, 0.75);
    return { g, enter() { jars.forEach((j, i) => pop(j, 1, 420, i * 120)); },
      on(e, d) {
        const j = jars[bins.indexOf(d.bin)];
        if (e === 'place' && j) { const c = coin(); c.position.copy(home(d.item)); g.add(c); const k = j.userData.n++; j.userData.tokens[d.item] = c; fly(c, new T.Vector3(j.position.x + (k % 2 ? 0.05 : -0.05), 0.06 + Math.min(k, 12) * 0.036, j.position.z), 0.9, 520).then(() => bounce(j)); }
        if (e === 'unplace') for (const jj of jars) { const c = jj.userData.tokens[d.item]; if (c) { delete jj.userData.tokens[d.item]; jj.userData.n = Math.max(0, jj.userData.n - 1); fly(c, home(d.item), 0.6, 400).then(() => g.remove(c)); } }
        if (e === 'graded') jars.forEach(jj => { const ok = d.ok; ok ? bounce(jj) : shake(jj); if (ok) burst(g, jj.position.clone().add(new T.Vector3(0, 1, 0)), 0xffe066, 8); });
      } };
  };
  SC.order = ({ n, build }) => {
    const g = new T.Group(), stones = [];
    for (let i = 0; i < n; i++) { const a = -0.9 + i / Math.max(1, n - 1) * 1.8; const s = grp(g, build ? X0 : X0 + Math.sin(a) * 1.25, build ? 0 : 0, build ? 0 : Math.cos(a) * 0.45 - 0.35); if (build) { const b = part(s, 'b', toon(PAL[i % PAL.length]), [0, 0.1 + i * 0.22, 0], [0.7 - i * 0.06, 0.2, 0.42]); b.visible = false; s.userData.b = b; } else { s.userData.b = part(s, 'c', toon(0xd8d2c4), [0, 0.06, 0], [0.24, 0.12, 0.24]); const l = label(String(i + 1), { h: 0.2 }); l.position.y = 0.42; s.add(l); } stones.push(s); }
    const tok = build ? null : part(g, 's', toon(0xffc93c, { e: 0x5a3a00 }), [X0 - 1.5, 0.15, 0.4], [0.1, 0.1, 0.1]);
    return { g,
      on(e, d) {
        if (e === 'pick') { const s = stones[d.k]; if (!s) return; if (build) { const b = s.userData.b; b.visible = true; drop(b, 460, 1.2); } else { glow(s.userData.b, true, 0x5a4a00); lift(s, 0.08); if (tok) fly(tok, s.position.clone().add(new T.Vector3(0, 0.25, 0)), 0.4, 360, false); } }
        if (e === 'back') stones.forEach((s, i) => { if (i >= d.n) { if (build) s.userData.b.visible = false; else { glow(s.userData.b, false); s.position.y = 0; } } });
        if (e === 'graded') stones.forEach((s, i) => { const ok = d.ok[i]; glow(s.userData.b, true, ok ? 0x1f6a2a : 0x6a1f1f); ok ? bounce(s) : shake(s); });
      } };
  };
  SC.match = ({ left, n }) => {
    const g = new T.Group(), H = ['#FFD43B', '#7CF5B5', '#9BD8FF', '#FF9FC6', '#C9A7FF', '#FFB86B'].map(c => new T.Color(c).getHex());
    const posts = side => Array.from({ length: n }, (_, i) => { const p = grp(g, X0 + side * 0.85, 0, -0.5 + i * (1.1 / Math.max(1, n - 1))); part(p, 'c', toon(0x9c6b3c), [0, 0.3, 0], [0.05, 0.6, 0.05]); const k = part(p, 's', toon(0xffffff), [0, 0.64, 0], [0.09, 0.09, 0.09]); if (side < 0 && left) { const l = label(clip(left[i], 10), { h: 0.15 }); l.position.set(-0.45, 0.64, 0); p.add(l); } p.userData.k = k; return p; });
    const L = posts(-1), Rp = posts(1), ropes = {};
    return { g,
      on(e, d) {
        if (e === 'pair') { if (ropes[d.i]) g.remove(ropes[d.i]); const a = L[d.i].position.clone().setY(0.64), b = Rp[d.j % n].position.clone().setY(0.64), mid = a.clone().lerp(b, 0.5).add(new T.Vector3(0, -0.12, 0)); const r = new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), 16, 0.025, 6), toon(H[d.i % H.length])); g.add(r); ropes[d.i] = r; glow(L[d.i].userData.k, true, 0x5a4a00); glow(Rp[d.j % n].userData.k, true, 0x5a4a00); bounce(Rp[d.j % n]); }
        if (e === 'graded') d.ok.forEach((ok, i) => { ok ? bounce(L[i]) : shake(L[i]); if (ok) burst(g, L[i].position.clone().add(new T.Vector3(0, 0.8, 0)), 0x7cf29c, 6); });
      } };
  };
  SC.slider = ({ min, max, unit, start }) => {
    const g = new T.Group(), col = grp(g, X0, 0, 0.1), H = 1.3; part(col, 'c', toon(0xffffff), [0, 0.03, 0], [0.32, 0.06, 0.32]);
    const bar = part(col, 'c', unit === '$' ? coinM : toon(0x3b9bf0), [0, 0, 0], [0.22, 1, 0.22]); const v = label('', { h: 0.22 }); col.add(v);
    const ring = part(col, 't', toon(0x2fb257, { e: 0x1f6a2a }), [0, 0, 0], [0.32, 0.32, 0.32], [Math.PI / 2, 0, 0]); ring.visible = false;
    for (let i = 0; i <= 4; i++) part(col, 'b', toon(0x5d636b), [0.32, 0.06 + i / 4 * H, 0], [0.12, 0.015, 0.015]);
    const show = (x, txt) => { const f = clamp((x - min) / ((max - min) || 1), 0, 1), h = Math.max(0.02, f * H); bar.scale.y = h; bar.position.y = 0.06 + h / 2; v.position.y = 0.3 + h; setLabel(v, txt); };
    const fmtV = x => `${unit === '$' ? '$' : ''}${(+x).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit && unit !== '$' ? ' ' + unit : ''}`;
    show(start, fmtV(start));
    return { g, on(e, d) { if (e === 'slide') show(d.v, fmtV(d.v)); if (e === 'lock') { const f = clamp((d.a - min) / ((max - min) || 1), 0, 1); ring.position.y = 0.06 + f * H; ring.visible = true; pop(ring, 0.32); if (d.ok) burst(g, col.position.clone().add(new T.Vector3(0, 1.4, 0)), 0x7cf29c, 12); else shake(col); } } };
  };
  SC.price = ({ products }) => {
    const g = new T.Group(), n = Math.min(3, products.length), q = products.slice(0, n), maxQ = Math.max(...q.map(p => p.qty)), xs = spread(n, 2.0);
    const boxes = q.map((p, i) => { const s = 0.45 + 0.55 * Math.sqrt(p.qty / maxQ), b = grp(g, xs[i], 0, 0); part(b, 'c', toon(0xe8c46a), [0, 0.03, 0], [0.3, 0.06, 0.3]); const body = part(b, 'b', toon(PAL[i]), [0, 0.06 + 0.22 * s, 0], [0.32 * s, 0.44 * s, 0.22 * s]); const l = label(`$${p.cost % 1 ? p.cost.toFixed(2) : p.cost}`, { h: 0.18, fg: '#E5483D' }); l.position.y = 0.3 + 0.44 * s; b.add(l); const nm = label(clip(local(p.name), 12), { h: 0.14 }); nm.position.y = 0.52 + 0.44 * s; b.add(nm); b.userData.body = body; b.userData.top = 0.62 + 0.44 * s; return b; });
    const crown = grp(g); part(crown, 'c', coinM, [0, 0, 0], [0.13, 0.08, 0.13]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(crown, 'k', coinM, [Math.cos(a) * 0.11, 0.07, Math.sin(a) * 0.11], [0.03, 0.08, 0.03]); } crown.visible = false;
    return { g, enter() { boxes.forEach((b, i) => pop(b, 1, 400, i * 150)); }, tick(t) { if (crown.visible) crown.rotation.y = t * 1.5; },
      on(e, d) { if (e === 'pick') { const b = boxes[d.i]; if (b) d.ok ? bounce(b) : shake(b); const w = boxes[d.best]; if (w) { crown.position.set(w.position.x, w.userData.top + 0.1, 0); pop(crown, 1); burst(g, crown.position.clone(), 0xffe066, 10); } } } };
  };
  SC.scam = () => {
    const g = new T.Group(), ph = grp(g, X0 - 0.3, 0, 0); part(ph, 'b', toon(0x23283a), [0, 0.65, 0], [0.5, 0.95, 0.07]); const scr = part(ph, 'b', toon(0x9bd8ff, { e: 0x1a3a5a }), [0, 0.67, 0.04], [0.42, 0.8, 0.01]);
    const bub = emoji('✉️', 0.3); bub.position.set(0, 0.8, 0.08); ph.add(bub);
    const sh = grp(g, X0 + 0.75, 0, 0); part(sh, 'c6', toon(0x6a79f0), [0, 0.6, 0], [0.32, 0.07, 0.4], [Math.PI / 2, 0, 0]); sh.visible = false; const okS = emoji('✅', 0.45); okS.position.set(X0 + 0.75, 0.65, 0); okS.visible = false; g.add(okS);
    return { g, tick(t) { bub.position.y = 0.8 + Math.sin(t * 3) * 0.04; },
      on(e, d) { if (e === 'msg') { sh.visible = okS.visible = false; glow(scr, false); pop(bub, 0.3); } if (e === 'pick') { const show = d.said ? sh : okS; pop(show, d.said ? 1 : 0.45); d.ok ? burst(g, new T.Vector3(X0 + 0.75, 1.1, 0), 0x7cf29c, 8) : shake(ph); glow(scr, true, d.scam ? 0x6a1f1f : 0x1f6a2a); } } };
  };
  SC.fork = ({ n }) => {
    const g = new T.Group(), xs = spread(n, n > 2 ? 2.2 : 1.6), signs = xs.map((x, i) => { const p = grp(g, x, 0, -0.45); part(p, 'c', toon(0x9c6b3c), [0, 0.4, 0], [0.04, 0.8, 0.04]); const b = part(p, 'b', toon(PAL[i]), [0, 0.82, 0], [0.4, 0.24, 0.05]); const l = label(LETTERS[i], { h: 0.2 }); l.position.set(0, 0.82, 0.06); p.add(l); p.userData.b = b; return p; });
    for (let i = 0; i < 6; i++) part(g, 'c', toon(0xd8d2c4), [X0, 0.02, 0.75 - i * 0.18], [0.12, 0.03, 0.12]);
    const walker = part(g, 's', toon(0xffc93c, { e: 0x5a3a00 }), [X0, 0.14, 0.8], [0.11, 0.11, 0.11]);
    return { g, on(e, d) { if (e === 'pick') { const s = signs[d.i]; if (!s) return; fly(walker, s.position.clone().add(new T.Vector3(0, 0.14, 0.3)), 0.5, 700, false).then(() => { const good = d.grade ? d.grade !== 'bad' : d.ok !== false; good ? (bounce(s), burst(g, s.position.clone().add(new T.Vector3(0, 1.1, 0)), 0x7cf29c, 8)) : shake(s); glow(s.userData.b, true, good ? 0x1f6a2a : 0x6a1f1f); }); } } };
  };
  SC.debate = () => {
    const g = new T.Group(), pods = [0, 1].map(i => { const p = grp(g, X0 + (i ? 0.75 : -0.75), 0, 0); const b = part(p, 'b', toon(PAL[i]), [0, 0.25, 0], [0.42, 0.5, 0.3]); const s = emoji(i ? '🗨️' : '💬', 0.4); s.position.set(0, 0.95, 0); p.add(s); const l = label(LETTERS[i], { h: 0.2 }); l.position.set(0, 0.28, 0.17); p.add(l); p.userData.b = b; return p; });
    return { g, tick(t) { pods.forEach((p, i) => { p.children.forEach(c => { if (c.isSprite && c.scale.x > 0.3) c.position.y = 0.95 + Math.sin(t * 2.5 + i * 2) * 0.05; }); }); }, on(e, d) { if (e === 'pick') { const p = pods[d.i]; if (!p) return; lift(p, 0.15); d.ok ? (burst(g, p.position.clone().add(new T.Vector3(0, 1.2, 0)), 0x7cf29c, 10), glow(p.userData.b, true, 0x1f6a2a)) : shake(p); } } };
  };
  SC.tap = ({ items }) => {
    const g = new T.Group(), n = Math.min(10, items.length), sp = items.slice(0, n).map((e, i) => { const a = i / n * Math.PI * 2, s = emoji(e, 0.36); s.position.set(X0 + Math.cos(a) * 1.15, 0.35, Math.sin(a) * 0.55); g.add(s); const r = part(g, 't', toon(0xffe066, { e: 0x6a4a00 }), [s.position.x, 0.05, s.position.z], [0.22, 0.22, 0.22], [Math.PI / 2, 0, 0]); r.visible = false; return { s, r }; });
    return { g, tick(t) { sp.forEach((o, i) => { o.s.position.y = 0.35 + Math.sin(t * 2 + i) * 0.04 + (o.r.visible ? 0.12 : 0); }); }, on(e, d) { if (e === 'tap' && sp[d.i]) { sp[d.i].r.visible = d.on; if (d.on) pop(sp[d.i].r, 0.22, 300); } if (e === 'graded') d.ok.forEach((ok, i) => { if (!sp[i]) return; if (ok) burst(g, sp[i].s.position.clone(), 0x7cf29c, 6); }); } };
  };
  SC.budget = ({ cats, income }) => {
    const g = new T.Group(), n = Math.min(6, cats.length), xs = spread(n, n > 3 ? 2.4 : 1.8), per = income / 20;
    const stands = cats.slice(0, n).map((c, i) => { const s = grp(g, xs[i], 0, -0.25 - Math.abs(i - (n - 1) / 2) * 0.08); part(s, 'c', toon(0xe3dccf), [0, 0.1, 0], [0.17, 0.2, 0.17]); part(s, 'c', toon(PAL[i]), [0, 0.21, 0], [0.18, 0.03, 0.18]); const l = label(clip(local(c.n), 11), { h: 0.15, fg: hexCss(PAL[i]) }); l.position.y = 1.05; s.add(l); s.userData.coins = []; return s; });
    const pile = grp(g, X0 - 1.25, 0, 0.55), loose = []; for (let i = 0; i < 20; i++) { const c = coin(); c.position.set(0, 0.02 + i * 0.034, 0); pile.add(c); loose.push(c); }
    const tag = label(`$${income}`, { h: 0.2 }); tag.position.y = 0.95; pile.add(tag);
    function set(amt) { amt.slice(0, n).forEach((a, i) => { const want = Math.round(a / per), have = stands[i].userData.coins; while (have.length < want && loose.length) { const c = loose.pop(); pile.remove(c); c.position.set(pile.position.x, c.position.y, pile.position.z); g.add(c); have.push(c); fly(c, new T.Vector3(stands[i].position.x, 0.24 + (have.length - 1) * 0.034, stands[i].position.z), 0.55, 380); } while (have.length > want) { const c = have.pop(); g.remove(c); c.position.set(0, 0.02 + loose.length * 0.034, 0); pile.add(c); loose.push(c); } }); const used = amt.reduce((a, b) => a + b, 0); setLabel(tag, `$${Math.max(0, income - used)} left`); }
    return { g, enter() { stands.forEach((s, i) => pop(s, 1, 380, i * 110)); }, on(e, d) { if (e === 'alloc') set(d.amt); if (e === 'surprise') { const b = grp(g, X0 + 1.4, 0, 0.4); part(b, 'b', toon(0x7b5cff), [0, 0.05, 0], [0.32, 0.07, 0.24]); ink(b); drop(b, 600, 2.2).then(() => { d.covered ? burst(g, b.position.clone().add(new T.Vector3(0, 0.4, 0)), 0x7cf29c, 10) : stands.forEach(s => shake(s)); }); } } };
  };
  SC.market = ({ years }) => {
    const g = new T.Group(), bars = []; for (let y = 0; y <= years; y++) { const b = part(g, 'b', toon(0x2fb257), [X0 - 1.2 + y / years * 2.4, 0, -0.1], [Math.min(0.16, 2.2 / (years + 1)), 0.01, 0.2]); b.visible = false; bars.push(b); }
    return { g, on(e, d) { if (e === 'year') { const b = bars[d.y]; if (!b) return; const h = Math.max(0.05, d.v / d.max * 1.4); b.visible = true; b.scale.y = h; b.position.y = h / 2; if (d.drop) { b.material = toon(0xe5533d); shake(b); } else bounce(b, 0.1); } if (e === 'pick' && d.hold != null) d.hold ? burst(g, new T.Vector3(X0, 1.5, 0), 0x7cf29c, 10) : bars.forEach(b => b.visible && shake(b)); } };
  };
  SC.snowball = ({ start }) => {
    const g = new T.Group(); part(g, 'b', toon(0xffffff), [X0, 0.15, 0], [2.4, 0.08, 0.6], [0, 0, 0.12]); const ball = part(g, 's', toon(0xf2f8ff), [X0 - 1.0, 0.35, 0], [0.16, 0.16, 0.16]); const l = label('$' + start, { h: 0.2 }); g.add(l);
    const set = (y, r) => { const s = clamp(0.14 * Math.sqrt(r), 0.12, 0.6); ball.scale.setScalar(s); ball.position.set(X0 - 1.0 + Math.min(1, y / 20) * 2.0, 0.28 + s - (Math.min(1, y / 20) * 0.28), 0); ball.rotation.z = -y; l.position.set(ball.position.x, ball.position.y + s + 0.2, 0); };
    set(0, 1); return { g, on(e, d) { if (e === 'slide') { set(d.y, d.r); setLabel(l, d.label); } } };
  };
  SC.shop = ({ item }) => {
    const g = new T.Group(), st = ideaProp('stall', clip(local(item), 14)); st.position.set(X0 + 0.4, 0, -0.25); g.add(st); const sign = label('$?', { h: 0.26, fg: '#E5483D' }); sign.position.set(X0 - 0.5, 0.9, 0.1); g.add(sign); part(g, 'c', toon(0x9c6b3c), [X0 - 0.5, 0.35, 0.1], [0.03, 0.7, 0.03]);
    let crowd = [];
    return { g, tick(t) { st.userData.tick(t); crowd.forEach((c, i) => { c.position.y = 0.16 + Math.abs(Math.sin(t * 5 + i)) * 0.06; }); }, on(e, d) { if (e === 'price') setLabel(sign, d.label, { fg: '#E5483D' }); if (e === 'open') { crowd.forEach(c => g.remove(c)); crowd = []; for (let i = 0; i < Math.min(12, d.n); i++) { const c = part(g, 's', toon(PAL[i % PAL.length]), [X0 + 1.5, 0.16, 0.6 - (i % 4) * 0.25], [0.11, 0.14, 0.11]); ink(c); crowd.push(c); fly(c, new T.Vector3(X0 + 0.9 - (i % 4) * 0.25, 0.16, 0.55 - Math.floor(i / 4) * 0.2), 0.3, 400 + i * 80, false); } } } };
  };
  SC.timing = ({ zone }) => {
    const g = new T.Group(), dial = grp(g, X0, 0.75, 0); part(dial, 'c', toon(0xffffff), [0, 0, 0], [0.55, 0.06, 0.55], [Math.PI / 2, 0, 0]); const z = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.07, 24, 1, false, Math.PI * 0.62, Math.PI * 0.36), toon(0x2fb257)); z.rotation.x = Math.PI / 2; dial.add(z); const nd = grp(dial, 0, 0, 0.06); part(nd, 'b', toon(0xe5533d), [0, 0.22, 0], [0.04, 0.44, 0.02]); part(g, 'c', toon(0x9c6b3c), [X0, 0.2, -0.05], [0.04, 0.4, 0.04]); const l = label(clip(local(zone), 12), { h: 0.18, fg: '#1E8A40' }); l.position.set(X0, 1.48, 0); g.add(l);
    return { g, tick(t) { nd.rotation.z = Math.sin(t * 1.4 * Math.PI) * 1.4; }, on(e, d) { if (e === 'pick') d.ok ? burst(g, new T.Vector3(X0, 1.3, 0), 0x7cf29c, 12) : shake(dial); } };
  };
  SC.docs = ({ n }) => {
    const g = new T.Group(), board = (x, t) => { const b = grp(g, x, 0, 0); part(b, 'b', toon(0xffffff), [0, 0.7, 0], [0.8, 0.95, 0.04]); const l = label(t, { h: 0.16 }); l.position.set(0, 1.25, 0.03); b.add(l); return b; };
    board(X0 - 0.55, 'Before'); const after = board(X0 + 0.55, 'After'); const lines = Array.from({ length: Math.min(6, n) }, (_, i) => part(after, 'b', toon(0xc9cfdc), [0, 1.0 - i * 0.14, 0.03], [0.6, 0.06, 0.01]));
    for (let i = 0; i < Math.min(6, n); i++) part(g, 'b', toon(0xc9cfdc), [X0 - 0.55, 1.0 - i * 0.14, 0.03], [0.6, 0.06, 0.01]);
    return { g, on(e, d) { if (e === 'tap' && lines[d.i]) glow(lines[d.i], d.on, 0x6a4a00); if (e === 'graded') d.ok.forEach((ok, i) => lines[i] && glow(lines[i], true, ok ? 0x1f6a2a : 0x6a1f1f)); } };
  };
  SC.chat = () => {
    const g = new T.Group(), ph = grp(g, X0, 0, 0); part(ph, 'b', toon(0x23283a), [0, 0.7, 0], [0.7, 1.15, 0.07]); part(ph, 'b', toon(0xf2f4fa), [0, 0.72, 0.04], [0.62, 1.0, 0.01]); const bubbles = [];
    return { g, on(e, d) { if (e === 'line') { const b = part(ph, 'b', toon(d.who === 'me' ? (d.ok === false ? 0x9aa3b5 : 0x2f6fe4) : 0xffffff), [d.who === 'me' ? 0.1 : -0.1, 0, 0.06], [0.38, 0.12, 0.02]); bubbles.push(b); bubbles.forEach((x, i) => { x.position.y = 1.1 - (bubbles.length - 1 - i) * 0.16; x.visible = x.position.y > 0.3; }); pop(b, b.scale.clone(), 260); } } };
  };
  SC.mystery = ({ n }) => {
    const g = new T.Group(), chest = grp(g, X0 + 0.55, 0, 0); part(chest, 'b', toon(0x9c6b3c), [0, 0.2, 0], [0.6, 0.4, 0.4]); const lid = grp(chest, 0, 0.4, -0.2); part(lid, 'b', toon(0xb07a45), [0, 0.06, 0.2], [0.62, 0.12, 0.42]); part(chest, 'b', toon(0xffc93c), [0, 0.3, 0.21], [0.1, 0.12, 0.02]);
    const scrolls = Array.from({ length: Math.min(5, n) }, (_, i) => { const s = grp(g, X0 - 1.0 + i * 0.32, 0, 0.3); part(s, 'c', toon(0xf4e3c3), [0, 0.25, 0], [0.06, 0.4, 0.06], [0, 0, Math.PI / 2]); s.visible = i === 0; return s; });
    return { g, tick(t) { scrolls.forEach((s, i) => { s.position.y = Math.sin(t * 2 + i) * 0.04; }); }, on(e, d) { if (e === 'clue' && scrolls[d.n - 1]) pop(scrolls[d.n - 1], 1, 360); if (e === 'pick') { if (d.ok) { tw(500, k => { lid.rotation.x = -k * 1.6; }, E.back); burst(g, chest.position.clone().add(new T.Vector3(0, 0.8, 0)), 0xffe066, 14); } else shake(chest); } } };
  };
  SC.board = ({ icon }) => SC.idea({ text: '', icon });

  /* ---- Showing a scene ---- */
  let subj = null;
  // Sprites share one geometry across three.js, so only their materials are freed.
  function disposeTree(o) { o.traverse(x => { if (x.isSprite) { x.material.dispose(); return; } if (x.geometry && !(x.geometry.userData && x.geometry.userData.keep)) x.geometry.dispose(); if (x.material && !x.material.userData.keep && !x.material.isShaderMaterial) x.material.dispose(); }); }
  function show(kind, data = {}) {
    const old = subj; subj = null;
    if (old) tw(200, k => old.g.scale.setScalar(Math.max(0.001, 1 - k)), E.lin).then(() => { subjRoot.remove(old.g); disposeTree(old.g); });
    if (!kind || !SC[kind]) { guideAside(false); setBack(false); return; }
    let s; try { s = SC[kind](data); } catch (e) { console.warn('stage scene', kind, e); guideAside(false); setBack(false); return; }
    ink(s.g); subjRoot.add(s.g); subj = s; s.g.scale.setScalar(0.001);
    wait(old ? 140 : 0).then(() => { if (subj !== s) return; return tw(460, k => s.g.scale.setScalar(Math.max(0.001, k)), E.back).then(() => { if (subj === s && s.enter) s.enter(); }); });
    guideAside(true); setBack(true);
  }
  function fx(evt, d) { if (subj && subj.on) { try { subj.on(evt, d || {}); } catch (e) { console.warn('stage fx', evt, e); } } }

  let act = { kind: 'idle', t0: 0 }, raf = 0, last = 0, running = false, blinkAt = 2;
  function react(kind) { act = { kind, t0: performance.now() }; }
  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height;
    // Fit the whole island, guide and scene whatever shape the stage is; tall stages look down on it a little.
    const a = cam.aspect, tan = Math.tan(cam.fov * Math.PI / 360), tall = clamp((1.15 - a) / 0.55, 0, 1), was = tallLayout;
    tallLayout = a < 1.05; subjRoot.position.x = tallLayout ? -0.45 : 0; isle.scale.set(tallLayout ? 0.8 : 1, 1, 1);
    const d = Math.max(tallLayout ? 4.6 : 5.6, (tallLayout ? 4.0 : 6.0) / (2 * tan * a)), cx = tallLayout ? -0.1 : 0;
    cam.position.set(cx, 1.4 + d * (0.1 + tall * 0.32), d); cam.lookAt(cx, 0.62 - tall * 0.12, 0); cam.updateProjectionMatrix();
    if (was !== tallLayout && aside) guideAside(true);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(canvas);
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016), t = now / 1000; last = now;
    for (const w of tws) { const k = Math.min(1, (now - w.t0) / w.d); w.fn(w.e(k), k); if (k >= 1) { tws.delete(w); w.res(); } }
    world.rotation.y = Math.sin(t * 0.3) * (subj ? 0.05 : 0.12); world.position.y = Math.sin(t * 0.9) * 0.05;
    if (props) { const k = Math.min(1, (now - props.userData.pop) / 500); props.scale.setScalar(Math.max(0.01, 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2))); }
    if (subj && subj.tick) { try { subj.tick(t, dt); } catch (e) { subj.tick = null; } }
    if (guide) {
      const P = guide.P, g = guide.g, a = (now - act.t0) / 1000;
      let y = 0, sx = 1, sy = 1, ry = Math.sin(t * 0.7) * 0.25 + (subj ? 0.55 : 0), tilt = 0, wing = Math.sin(t * 2) * 0.08;
      const breathe = 1 + Math.sin(t * 2.4) * 0.02; sy *= breathe; sx /= Math.sqrt(breathe);
      if (act.kind === 'hop' && a < 0.7) { const p = a / 0.7; if (p < 0.2) { sy *= 1 - p * 1.2; sx *= 1 + p; } else { const q = (p - 0.2) / 0.8; y = Math.sin(q * Math.PI) * 0.45; sy *= 1 + Math.sin(q * Math.PI) * 0.12; } wing = -Math.sin(a * 22) * 0.9; }
      else if (act.kind === 'cheer' && a < 1.2) { const p = a / 1.2; y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.4; ry = p * Math.PI * 2; wing = -1.2 + Math.sin(a * 26) * 0.5; }
      else if (act.kind === 'puzzled' && a < 1.0) { tilt = Math.sin(Math.min(1, a * 3) * Math.PI / 2) * 0.35 * (1 - Math.max(0, a - 0.7) / 0.3); ry += Math.sin(a * 9) * 0.15; }
      else if (act.kind === 'point' && a < 0.9) { const p = Math.sin(Math.min(1, a / 0.25) * Math.PI / 2) * (1 - Math.max(0, a - 0.6) / 0.3); P.wingR.rotation.z = 1.6 * p; tilt = -0.1 * p; }
      if (act.kind !== 'point' || a >= 0.9) P.wingR.rotation.z = -wing;
      P.wingL.rotation.z = wing;
      g.position.y = y; g.scale.set(sx, sy, sx); g.rotation.y = ry; P.head.rotation.z = tilt;
      if (t > blinkAt) { const b = (t - blinkAt) / 0.14; const s = b < 1 ? Math.max(0.1, Math.abs(1 - 2 * b)) : 1; P.eyeL.scale.y = P.eyeR.scale.y = (guideKind === 'robot' ? 0.07 : 0.06) * s; if (b >= 1) blinkAt = t + 2 + Math.random() * 3; }
      if (P.tip) P.tip.material.emissive.setHex(Math.sin(t * 4) > 0 ? 0x8a1010 : 0x3a0505);
    }
    G3.inkFor(R); R.render(scene, cam);
  }
  return {
    setGuide, setScene, react, show, fx,
    start() { if (running) return; running = true; size(); last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
