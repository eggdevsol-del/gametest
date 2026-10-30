
/* ---------- 3D stage: the kid's guide on a little floating island, with props for the lesson's scene ----------
   Same cel look as the islands: toon shading and even ink outlines. The guide reacts with classic animation
   moves: anticipation, squash and stretch, follow-through. */
function Stage3D(canvas) {
  const T = window.THREE, G3 = C.G3; if (!T || !G3 || !G3.ok) return null;
  let R; try { R = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.setClearColor(0, 0);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x7d95e8, 0.85));
  const sun = new T.DirectionalLight(0xfff3dc, 0.85); sun.position.set(-3, 6, 5); scene.add(sun);
  const MAT = {}, toon = (c, o = {}) => { const k = c + JSON.stringify(o); if (MAT[k]) return MAT[k]; const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD, emissive: o.e || 0 }); G3.rimPatch(m); return (MAT[k] = m); };
  const basic = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op ?? 1 });
  const geo = { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18) };
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(geo[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); g.add(m); return m; };

  // Floating island the guide stands on
  const world = new T.Group(); scene.add(world);
  const isle = new T.Group(); world.add(isle);
  part(isle, 'c', toon(0x58b84a), [0, -0.05, 0], [1.9, 0.18, 1.3]);
  part(isle, 'c', toon(0x8a5a3c), [0, -0.2, 0], [1.85, 0.16, 1.26]);
  part(isle, 'k', toon(0x7a5536), [0, -0.75, 0], [1.75, 1.0, 1.2], [Math.PI, 0, 0]);
  G3.outline(isle);

  // Guides
  function buildGuide(kind) {
    const g = new T.Group(), P = {};
    if (kind === 'robot') {
      P.body = part(g, 'b', toon(0x4a78d4), [0, 0.62, 0], [0.62, 0.66, 0.5]);
      P.head = new T.Group(); P.head.position.set(0, 1.2, 0); g.add(P.head);
      part(P.head, 'b', toon(0x6c96e6), [0, 0.12, 0], [0.56, 0.42, 0.46]);
      P.eyeL = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [-0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
      P.eyeR = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
      part(P.head, 'c', toon(0x9aa3b5), [0, 0.42, 0], [0.02, 0.22, 0.02]);
      P.tip = part(P.head, 's', toon(0xff5a5a, { e: 0x8a1010 }), [0, 0.56, 0], [0.06, 0.06, 0.06]);
      P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, 0); g.add(P.wingL); part(P.wingL, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
      P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, 0); g.add(P.wingR); part(P.wingR, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
      part(g, 'c', toon(0x2c3e66), [-0.16, 0.14, 0], [0.09, 0.28, 0.09]); part(g, 'c', toon(0x2c3e66), [0.16, 0.14, 0], [0.09, 0.28, 0.09]);
    } else {
      const cocky = kind === 'cocky', body = cocky ? 0xe9edf2 : 0x5f7f2c, belly = cocky ? 0xf6f7fa : 0x7f9e3a, wing = cocky ? 0xdfe5ee : 0x4e6c23, under = cocky ? 0xffe06a : 0xe2702a;
      P.body = part(g, 's', toon(body), [0, 0.62, 0], [0.42, 0.52, 0.38]);
      part(g, 's', toon(belly), [0, 0.55, 0.16], [0.3, 0.38, 0.26]);
      P.head = new T.Group(); P.head.position.set(0, 1.18, 0.02); g.add(P.head);
      part(P.head, 's', toon(body), [0, 0, 0], [0.32, 0.3, 0.3]);
      P.eyeL = part(P.head, 's', toon(0x1b1b22), [-0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
      P.eyeR = part(P.head, 's', toon(0x1b1b22), [0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
      part(P.head, 's', basic(0xffffff), [-0.115, 0.075, 0.27], [0.015, 0.015, 0.01]); part(P.head, 's', basic(0xffffff), [0.145, 0.075, 0.27], [0.015, 0.015, 0.01]);
      const beak = part(P.head, 'k', toon(cocky ? 0x3a3a44 : 0x44464f), [0, -0.06, 0.3], [0.08, 0.2, 0.09], [Math.PI * 0.62, 0, 0]);
      if (cocky) for (let i = 0; i < 5; i++) part(P.head, 'k', toon(0xffd23b), [(i - 2) * 0.05, 0.3 + (2 - Math.abs(i - 2)) * 0.05, -0.06 - i * 0.02], [0.05, 0.3, 0.05], [-0.5 - i * 0.12, 0, (i - 2) * -0.25]);
      else part(P.head, 's', toon(0x6e8f30), [0, 0.2, -0.08], [0.12, 0.08, 0.16]);
      P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, -0.02); g.add(P.wingL);
      part(P.wingL, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingL, 's', toon(under), [0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
      P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, -0.02); g.add(P.wingR);
      part(P.wingR, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingR, 's', toon(under), [-0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
      part(g, 'k', toon(wing), [0, 0.35, -0.36], [0.16, 0.5, 0.08], [-1.9, 0, 0]);
      for (const x of [-0.13, 0.13]) part(g, 'c', toon(0x777a85), [x, 0.12, 0.05], [0.035, 0.22, 0.035]);
    }
    beak0 = null; G3.outline(g); g.position.set(0, 0, 0.1); return { g, P };
  }
  let beak0 = null, guide = null, guideKind = '';
  function setGuide(kind) {
    if (kind === guideKind) return; guideKind = kind;
    if (guide) world.remove(guide.g);
    guide = buildGuide(kind); world.add(guide.g);
  }

  // Scene props, a few chunky shapes each
  const PROPS = {
    bank: g => { const d = part(g, 'c', toon(0x8d97ab), [-1.25, 0.62, -0.35], [0.5, 0.12, 0.5], [Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) part(g, 'b', toon(0x5d6578), [-1.25, 0.62, -0.27], [0.06, 0.62, 0.06], [0, 0, i * Math.PI / 4]); for (let i = 0; i < 5; i++) part(g, 'c', toon(0xd9a400), [1.1, 0.06 + i * 0.09, -0.2], [0.22, 0.04, 0.22]); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xd9a400), [1.45, 0.06 + i * 0.09, 0.1], [0.22, 0.04, 0.22]); return d; },
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
  function setScene(key) {
    if (key === sceneKey) return; sceneKey = key;
    if (props) world.remove(props);
    props = new T.Group(); (PROPS[key] || PROPS.island)(props); G3.outline(props); world.add(props);
    props.scale.setScalar(0.01); props.userData.pop = performance.now();
  }

  let act = { kind: 'idle', t0: 0 }, raf = 0, last = 0, running = false, blinkAt = 2;
  function react(kind) { act = { kind, t0: performance.now() }; }
  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height;
    // Keep the whole island in frame whatever shape the stage is: narrow stages need the camera further back.
    const a = cam.aspect, z = a < 0.75 ? 11.5 : a < 1.1 ? 9 : a < 1.6 ? 7.4 : 6.4; cam.position.set(0, 1.5, z); cam.lookAt(0, 0.62, 0); cam.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(canvas);
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016), t = now / 1000; last = now;
    world.rotation.y = Math.sin(t * 0.3) * 0.12; world.position.y = Math.sin(t * 0.9) * 0.05;
    if (props) { const k = Math.min(1, (now - props.userData.pop) / 500); props.scale.setScalar(Math.max(0.01, 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2))); }
    if (guide) {
      const P = guide.P, g = guide.g, a = (now - act.t0) / 1000;
      let y = 0, sx = 1, sy = 1, ry = Math.sin(t * 0.7) * 0.25, tilt = 0, wing = Math.sin(t * 2) * 0.08;
      const breathe = 1 + Math.sin(t * 2.4) * 0.02; sy *= breathe; sx /= Math.sqrt(breathe);
      if (act.kind === 'hop' && a < 0.7) { const p = a / 0.7; if (p < 0.2) { sy *= 1 - p * 1.2; sx *= 1 + p; } else { const q = (p - 0.2) / 0.8; y = Math.sin(q * Math.PI) * 0.45; sy *= 1 + Math.sin(q * Math.PI) * 0.12; } wing = -Math.sin(a * 22) * 0.9; }
      else if (act.kind === 'cheer' && a < 1.2) { const p = a / 1.2; y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.4; ry = p * Math.PI * 2; wing = -1.2 + Math.sin(a * 26) * 0.5; }
      else if (act.kind === 'puzzled' && a < 1.0) { tilt = Math.sin(Math.min(1, a * 3) * Math.PI / 2) * 0.35 * (1 - Math.max(0, a - 0.7) / 0.3); ry = Math.sin(a * 9) * 0.15; }
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
    setGuide, setScene, react,
    start() { if (running) return; running = true; size(); last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}
