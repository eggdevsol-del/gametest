/* Chorecast homes (a prototype), part 5 of 6: pets, drawn as anime cartoon characters.
   Chibi proportions (a big round head, a small body, stubby legs), a hand-drawn 2D face painted onto the front of the
   3D head the way anime CG does it (big glossy eyes with two catchlights, blush, a tiny mouth), faces that change
   with the pose (open, blinking, asleep, happy), soft two-tone shading without toy highlights, and a bold dark
   outline round every part. Posed on the anime beat: walk, stand, sit, sleep and a happy wag when patted. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T) return;
  const { Kit } = IH.kit;
  const INK = '#3a2733';

  const LOOK = {
    cat: { body: '#f6b06a', belly: '#fff3e2', ear: '#ffb7c5', stripe: '#e48d45', iris: ['#4e9a3a', '#b8e86a'], len: 0.46, h: 0.34, head: 0.29, legL: 0.15, tail: 4 },
    dog: { body: '#f2d4a4', belly: '#fffaf0', ear: '#b0703f', stripe: '#d9a061', iris: ['#5a3420', '#b37a4c'], len: 0.5, h: 0.36, head: 0.3, legL: 0.16, tail: 3 },
    bunny: { body: '#fbf6f8', belly: '#ffffff', ear: '#ffc2d1', stripe: '#e6dbe2', iris: ['#c2416b', '#ff9ec0'], len: 0.38, h: 0.3, head: 0.27, legL: 0.1, tail: 1 }
  };

  // ---- bold outline: an inside-out copy pushed out along the normals, drawn in dark ink (no shading, no ink pass)
  const OUTLINE = new T.ShaderMaterial({
    side: T.BackSide, uniforms: { uW: { value: 0.022 }, uC: { value: new T.Color(INK) } },
    vertexShader: 'uniform float uW; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * uW, 1.0); }',
    fragmentShader: 'uniform vec3 uC; void main(){ gl_FragColor = vec4(uC, 1.0); }'
  });
  let MAT = null; const mat = () => MAT || (MAT = IH.look.animeMat({ spec: 0 }));
  function part(fn, x, y, z) {
    const k = new Kit(); fn(k); const g = k.build({ mat: mat() }); g.position.set(x, y, z);
    const m = g.userData.mesh; if (m) { const o = new T.Mesh(m.geometry, OUTLINE); o.layers.set(1); o.castShadow = false; g.add(o); }
    return g;
  }

  // ---- the painted faces
  const FACES = {};
  function face(type, mode) {
    const key = type + mode; if (FACES[key]) return FACES[key];
    const L = LOOK[type], S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    g.lineCap = 'round'; g.lineJoin = 'round';
    const ex = [S * 0.32, S * 0.68], ey = S * 0.47, ew = S * 0.11, eh = S * 0.155;
    // blush
    for (const x of [S * 0.2, S * 0.8]) {
      g.fillStyle = 'rgba(255,120,150,0.45)'; g.beginPath(); g.ellipse(x, S * 0.62, S * 0.075, S * 0.038, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,90,130,0.6)'; g.lineWidth = S * 0.008; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * S * 0.025 - S * 0.008, S * 0.635); g.lineTo(x + i * S * 0.025 + S * 0.008, S * 0.605); g.stroke(); }
    }
    if (L.patches) { g.fillStyle = '#2f2a33'; for (const [i, x] of ex.entries()) { g.beginPath(); g.ellipse(x, ey + eh * 0.15, ew * 1.55, eh * 1.25, (i ? -1 : 1) * 0.5, 0, Math.PI * 2); g.fill(); } }
    if (L.mask) { g.fillStyle = L.mask; g.beginPath(); g.ellipse(S / 2, S * 0.62, S * 0.26, S * 0.16, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = INK; g.fillStyle = INK;
    for (const [i, x] of ex.entries()) {
      const s = i ? 1 : -1;
      if (mode === 'open') {
        g.fillStyle = INK; g.beginPath(); g.ellipse(x, ey, ew, eh, 0, 0, Math.PI * 2); g.fill();
        const gr = g.createLinearGradient(0, ey - eh, 0, ey + eh); gr.addColorStop(0, L.iris[0]); gr.addColorStop(1, L.iris[1]);
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, ey + eh * 0.12, ew * 0.78, eh * 0.78, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = INK; g.beginPath(); g.ellipse(x, ey + eh * 0.05, ew * 0.42, eh * 0.45, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x - ew * 0.35, ey - eh * 0.38, ew * 0.38, eh * 0.3, -0.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + ew * 0.38, ey + eh * 0.42, ew * 0.17, 0, Math.PI * 2); g.fill();
        // lashes: a thick upper lid that flicks out at the corner
        g.lineWidth = S * 0.026; g.beginPath(); g.ellipse(x, ey + eh * 0.1, ew * 1.08, eh * 1.05, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
        g.lineWidth = S * 0.018; g.beginPath(); g.moveTo(x + s * ew * 0.95, ey - eh * 0.55); g.lineTo(x + s * ew * 1.35, ey - eh * 0.85); g.stroke();
      } else if (mode === 'happy') {
        g.lineWidth = S * 0.028; g.beginPath(); g.moveTo(x - ew, ey + eh * 0.25); g.quadraticCurveTo(x, ey - eh * 0.9, x + ew, ey + eh * 0.25); g.stroke();
      } else {
        g.lineWidth = S * 0.026; g.beginPath(); g.moveTo(x - ew, ey); g.quadraticCurveTo(x, ey + eh * 0.75, x + ew, ey); g.stroke();
        if (mode === 'sleep') { g.lineWidth = S * 0.014; g.beginPath(); g.moveTo(x + s * ew * 0.9, ey + eh * 0.1); g.lineTo(x + s * ew * 1.25, ey + eh * 0.3); g.stroke(); }
      }
    }
    // nose and mouth
    const my = S * 0.64;
    if (L.nose === 'none') { /* no nose */ } else if (type === 'dog' || L.nose === 'dark') { g.fillStyle = INK; g.beginPath(); g.ellipse(S / 2, my - S * 0.04, S * 0.035, S * 0.024, 0, 0, Math.PI * 2); g.fill(); }
    else { g.fillStyle = '#ff8fa8'; g.beginPath(); g.moveTo(S / 2 - S * 0.02, my - S * 0.05); g.lineTo(S / 2 + S * 0.02, my - S * 0.05); g.lineTo(S / 2, my - S * 0.025); g.closePath(); g.fill(); }
    g.lineWidth = S * 0.013; g.strokeStyle = INK;
    if (mode === 'happy' || type === 'dog' || L.smile) {
      g.fillStyle = '#c94a62'; g.beginPath(); g.moveTo(S / 2 - S * 0.045, my); g.quadraticCurveTo(S / 2, my + S * 0.08, S / 2 + S * 0.045, my); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ff9fb2'; g.beginPath(); g.ellipse(S / 2, my + S * 0.035, S * 0.022, S * 0.014, 0, 0, Math.PI * 2); g.fill();
    } else if (mode !== 'sleep') {
      g.beginPath(); g.moveTo(S / 2 - S * 0.045, my - S * 0.005); g.quadraticCurveTo(S / 2 - S * 0.022, my + S * 0.03, S / 2, my - S * 0.01); g.quadraticCurveTo(S / 2 + S * 0.022, my + S * 0.03, S / 2 + S * 0.045, my - S * 0.005); g.stroke();
    } else { g.beginPath(); g.arc(S / 2, my + S * 0.005, S * 0.012, 0, Math.PI * 2); g.stroke(); }
    if (type === 'cat' || L.whiskers) { g.lineWidth = S * 0.008; for (const s of [-1, 1]) for (const k of [0, 1]) { g.beginPath(); g.moveTo(S / 2 + s * S * 0.17, my - S * 0.02 + k * S * 0.03); g.lineTo(S / 2 + s * S * 0.27, my - S * 0.04 + k * S * 0.05); g.stroke(); } }
    const tx = new T.CanvasTexture(c); tx.anisotropy = 4; FACES[key] = tx; return tx;
  }

  function make(type) {
    if (IH.yami3d && IH.yami3d.has(type)) return IH.yami3d.make(type); // the cat, the puppy, the bunny in 3D
    if (type === 'cat' && IH.yami) return IH.yami.make();
    const L = LOOK[type], root = new T.Group(), body = new T.Group(); root.add(body);
    const hip = L.legL + 0.03, subs = { body, legs: [], tail: [] };
    body.add(part(k => {
      k.ball(0.5, 0, 0, 0, L.body, { s: [L.len * 0.78, L.h, L.len], n: 22 });
      k.ball(0.5, 0, -0.03, 0.04, L.belly, { s: [L.len * 0.6, L.h * 0.72, L.len * 0.78], n: 18 });
      if (type === 'cat') k.ball(0.5, 0, 0.07, -0.05, L.stripe, { s: [L.len * 0.7, L.h * 0.55, L.len * 0.45], n: 14 });
    }, 0, hip + L.h * 0.38, 0));
    const lx = L.len * 0.2, lz = L.len * 0.28;
    for (const [x, z] of [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]]) {
      const g = part(k => { k.pill(0.062, Math.max(0.01, L.legL - 0.08), 0, -L.legL - 0.01, 0, L.body, { n: 10 }); k.ball(0.07, 0, -L.legL + 0.03, 0.02, L.belly, { s: [1, 0.7, 1.15], n: 10 }); }, x, hip, z);
      body.add(g); subs.legs.push(g);
    }
    // the big round head with its painted face
    const head = new T.Group(); head.position.set(0, hip + L.h * 0.62 + L.head * 0.62, L.len * 0.38); body.add(head); subs.head = head;
    head.add(part(k => {
      k.ball(L.head, 0, 0, 0, L.body, { s: [1.12, 0.96, 1], n: 26 });
      k.ball(L.head * 0.5, 0, -L.head * 0.32, L.head * 0.58, L.belly, { s: [1.5, 0.8, 0.7], n: 16 });
      if (type === 'dog') k.ball(L.head * 0.42, 0, -L.head * 0.28, L.head * 0.78, L.belly, { s: [1.3, 0.85, 0.9], n: 14 });
    }, 0, 0, 0));
    const fm = new T.MeshBasicMaterial({ map: face(type, 'open'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const fg = new T.Mesh(new T.SphereGeometry(L.head * 1.012, 32, 24, Math.PI / 2 - 0.95, 1.9, 0.62, 1.45), fm);
    fg.scale.set(1.12, 0.96, 1); fg.layers.set(1); fg.renderOrder = 3; head.add(fg); subs.face = fm; subs.mode = 'open';
    subs.ears = [];
    for (const x of [-1, 1]) {
      const e = part(k => {
        if (type === 'cat') { k.cone(0.11, 0.2, 0, 0, 0, L.body, { n: 12 }); k.cone(0.065, 0.13, 0, 0.02, 0.03, L.ear, { n: 10 }); }
        else if (type === 'dog') k.ball(0.11, 0, -0.12, 0, L.ear, { s: [0.75, 1.5, 0.45], n: 14 });
        else { k.pill(0.065, 0.3, 0, 0, 0, L.body, { n: 12, s: [1, 1, 0.55] }); k.pill(0.035, 0.24, 0, 0.04, 0.025, L.ear, { n: 10, s: [1, 1, 0.5] }); }
      }, x * L.head * (type === 'dog' ? 0.95 : 0.55), L.head * (type === 'dog' ? 0.45 : 0.72), 0);
      if (type === 'cat') e.rotation.z = -x * 0.3; if (type === 'bunny') e.rotation.z = -x * 0.2;
      head.add(e); subs.ears.push(e);
    }
    let parent = body, at = [0, hip + L.h * 0.5, -L.len * 0.46];
    for (let i = 0; i < L.tail; i++) {
      const seg = type === 'bunny' ? part(k => k.ball(0.085, 0, 0, 0, '#ffffff', { n: 12 }), 0, 0, 0) : part(k => k.pill(type === 'cat' ? 0.045 : 0.055, 0.08, 0, 0, 0, i === L.tail - 1 && type === 'cat' ? L.stripe : L.body, { n: 10 }), 0, 0, 0);
      const j = new T.Group(); j.position.set(...at); j.add(seg); j.rotation.x = i === 0 ? -0.8 : -0.3; parent.add(j); subs.tail.push(j); parent = j; at = [0, 0.13, 0];
    }
    root.userData.pet = type; root.userData.hip = hip;
    return { group: root, subs, pet: type };
  }

  const setFace = (inst, mode) => { const S = inst.subs; if (S.mode === mode) return; S.mode = mode; S.face.map = face(inst.pet, mode); S.face.needsUpdate = true; };

  // Poses a pet. st: 'walk' | 'stand' | 'sit' | 'sleep' | 'happy'; t: beat time.
  function pose(inst, st, t, ph = 0) {
    if (inst.model3d) return IH.yami3d.pose(inst, st, t, ph);
    st = st.split('.')[0]; // drawn characters play the plain move for every branch
    if (inst.sprite) return IH.yami.pose(inst, st, t, ph);
    const S = inst.subs, L = LOOK[inst.pet], b = S.body, sw = Math.sin(t * (inst.pet === 'bunny' ? 9 : 11) + ph);
    b.position.y = 0; b.rotation.set(0, 0, 0); S.head.rotation.set(0, 0, 0);
    S.legs.forEach(l => l.rotation.set(0, 0, 0)); S.ears.forEach(e => { e.rotation.x = 0; });
    const blink = (Math.floor(t * 12 + ph * 7) % 41) < 2;
    let mode = blink ? 'closed' : 'open';
    if (st === 'walk') {
      const a = 0.6; S.legs[0].rotation.x = sw * a; S.legs[3].rotation.x = sw * a; S.legs[1].rotation.x = -sw * a; S.legs[2].rotation.x = -sw * a;
      b.position.y = Math.abs(sw) * 0.02; S.head.rotation.z = sw * 0.06;
      S.tail.forEach((j, i) => { j.rotation.z = Math.sin(t * 6 + i) * 0.3; });
    } else if (st === 'sit') {
      b.rotation.x = -0.35; b.position.y = -0.03; S.legs[0].rotation.x = 0.35; S.legs[1].rotation.x = 0.35; S.legs[2].rotation.x = -1.1; S.legs[3].rotation.x = -1.1; S.head.rotation.x = 0.3;
      S.head.rotation.z = Math.sin(t * 0.9 + ph) * 0.12;
      S.tail.forEach((j, i) => { j.rotation.z = Math.sin(t * 2 + i) * 0.2; });
    } else if (st === 'sleep') {
      b.position.y = -(L.legL + 0.01); S.legs[0].rotation.x = -1.45; S.legs[1].rotation.x = -1.45; S.legs[2].rotation.x = 1.45; S.legs[3].rotation.x = 1.45;
      S.head.rotation.x = 0.3; S.head.rotation.z = 0.35; b.position.y += Math.sin(t * 1.5) * 0.008; mode = 'sleep';
      S.tail.forEach(j => { j.rotation.z = 0.5; });
    } else if (st === 'happy') {
      S.tail.forEach((j, i) => { j.rotation.z = Math.sin(t * 22 + i) * 0.7; }); S.head.rotation.z = Math.sin(t * 8) * 0.18; S.head.rotation.x = -0.15;
      S.ears.forEach((e, i) => { e.rotation.x = Math.sin(t * 14 + i) * 0.2; }); mode = 'happy';
    } else {
      S.tail.forEach((j, i) => { j.rotation.z = Math.sin(t * 2.4 + i * 0.8) * 0.25; }); S.head.rotation.y = Math.sin(t * 0.7 + ph) * 0.4;
    }
    setFace(inst, mode);
  }

  IH.pets = { make, pose, LOOK, face, part, OUTLINE };
})();
