/* Chorecast homes (a prototype): Yami the cat, drawn exactly as on the user's character sheet and animated by the
   2D cut-out engine (anim2d.js).
   - Parts: if home/yami/parts.json exists (the generated part images described in art/yami/PROMPTS.md), those are
     used. Until then the parts are cut from the sheet itself (yami-sheet.webp): per view a body, a head (with the
     happy face from the sheet's expressions row as a second head), ears, a bending tail and painted eyelids.
   - Acting: breathes, blinks, looks about with held key poses, twitches an ear, swishes her tail with
     follow-through, bobs and squashes as she walks, hops with anticipation when patted, curls up to sleep.
   - Views follow which way she faces compared with the camera, with a squash "turn" between them. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.anim2d) return;
  const A = IH.anim2d, HEIGHT = 1.35;
  const base = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^/]*$/, '') : 'home/');

  // ---- cutting parts from the sheet
  const CROP = { front: [135, 290, 410, 690], side: [840, 115, 232, 450], back: [710, 660, 210, 430], happy: [238, 1308, 150, 150] };
  // which part each pixel of a view belongs to (frame px); 'both' keeps a sliver in two parts so joints never gap
  const REGION = {
    front: (x, y) => ((x > 290 && y > 520) || (y > 645 && x > 205)) ? 'tail' : y < 75 && x < 100 ? 'earL' : y < 75 && x > 195 ? 'earR' : y < 255 ? 'head' : y < 275 ? 'both' : 'body',
    side: (x, y) => ((x > 190 && y > 350) || (y > 405 && x > 75)) ? 'tail' : y < 50 && x > 85 && x < 150 ? 'earR' : y < 148 && x < 170 ? 'head' : y < 162 && x < 170 ? 'both' : 'body',
    back: (x, y) => ((y > 365 && x > 100) || (x > 178 && y > 340)) ? 'tail' : y < 50 && x < 75 ? 'earL' : y < 50 && x > 135 ? 'earR' : y < 122 ? 'head' : y < 134 ? 'both' : 'body'
  };
  const RIG = {
    front: { head: [150, 258], earL: [62, 72], earR: [238, 72], tail: [300, 590], tip: [262, 682], eyes: [[90, 165, 27, 19], [200, 165, 27, 19]] },
    side: { head: [118, 152], earR: [112, 48], tail: [200, 362], tip: [92, 440], eyes: [[47, 101, 11, 13]] },
    back: { head: [105, 128], earL: [55, 46], earR: [155, 46], tail: [112, 362], tip: [205, 405], eyes: [] }
  };
  function paperOff(img, [x, y, w, h]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, x, y, w, h, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h), p = d.data, bg = [p[0], p[1], p[2]], seen = new Uint8Array(w * h), q = [];
    const near = i => Math.abs(p[i * 4] - bg[0]) + Math.abs(p[i * 4 + 1] - bg[1]) + Math.abs(p[i * 4 + 2] - bg[2]) < 34;
    for (let i = 0; i < w; i++) q.push(i, (h - 1) * w + i); for (let j = 0; j < h; j++) q.push(j * w, j * w + w - 1);
    while (q.length) { const i = q.pop(); if (seen[i] || !near(i)) continue; seen[i] = 1; p[i * 4 + 3] = 0; const xx = i % w, yy = (i / w) | 0; if (xx > 0) q.push(i - 1); if (xx < w - 1) q.push(i + 1); if (yy > 0) q.push(i - w); if (yy < h - 1) q.push(i + w); }
    for (let yy = 1; yy < h - 1; yy++) for (let xx = 1; xx < w - 1; xx++) { const i = yy * w + xx; if (seen[i]) continue; if ((seen[i - 1] || seen[i + 1] || seen[i - w] || seen[i + w]) && (p[i * 4] + p[i * 4 + 1] + p[i * 4 + 2]) / 3 > 150) p[i * 4 + 3] = 120; }
    g.putImageData(d, 0, 0); return c;
  }
  function split(src, region) {
    const w = src.width, h = src.height, out = {}, sd = src.getContext('2d').getImageData(0, 0, w, h).data;
    for (const n of ['body', 'head', 'earL', 'earR', 'tail']) { const c = document.createElement('canvas'); c.width = w; c.height = h; out[n] = { c, d: c.getContext('2d').createImageData(w, h) }; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (!sd[i + 3]) continue; let r = region(x, y);
      const put = n => { const d = out[n].d.data; d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2]; d[i + 3] = sd[i + 3]; };
      if (r === 'both') { put('head'); put('body'); } else put(r);
    }
    for (const n in out) out[n].c.getContext('2d').putImageData(out[n].d, 0, 0);
    return Object.fromEntries(Object.entries(out).map(([n, v]) => [n, v.c]));
  }
  // Eyelids painted in her fur colour, with the closed-eye line, shown for blinks and sleep.
  function lids(w, h, eyes) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    for (const [x, y, rx, ry] of eyes) {
      g.fillStyle = '#58585d'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a2a2e'; g.lineWidth = Math.max(2, rx * 0.16); g.lineCap = 'round'; g.beginPath(); g.moveTo(x - rx * 0.9, y - ry * 0.05); g.quadraticCurveTo(x, y + ry * 0.55, x + rx * 0.9, y - ry * 0.05); g.stroke();
    }
    return c;
  }
  function fromSheet(img) {
    const views = {}, extra = {};
    for (const v of ['front', 'side', 'back']) {
      const full = paperOff(img, CROP[v]), parts = split(full, REGION[v]), R = RIG[v], [, , fw, fh] = CROP[v];
      const list = [{ name: 'body', canvas: parts.body, pivot: [fw / 2, fh * 0.75], z: 0 }];
      if (v !== 'back') list.push({ name: 'tail', canvas: parts.tail, pivot: R.tail, parent: 'body', z: v === 'front' ? 1 : -1, bend: { tip: R.tip } });
      else list.push({ name: 'tail', canvas: parts.tail, pivot: R.tail, parent: 'body', z: 1, bend: { tip: R.tip } });
      list.push({ name: 'head', canvas: parts.head, pivot: R.head, parent: 'body', z: 2 });
      for (const e of ['earL', 'earR']) if (R[e]) list.push({ name: e, canvas: parts[e], pivot: R[e], parent: 'head', z: e === 'earR' && v === 'side' ? 1 : 3 });
      if (R.eyes.length) list.push({ name: 'lids', canvas: lids(fw, fh, R.eyes), pivot: R.head, parent: 'head', z: 4 });
      views[v] = { fw, fh, parts: list };
    }
    // the happy head: the sheet's happy expression laid over the front head
    const f = paperOff(img, CROP.front), g = f.getContext('2d'), hc = paperOff(img, CROP.happy), s = 1.78;
    g.clearRect(0, 0, f.width, 262); g.drawImage(hc, 146 - 75 * s, 0, 150 * s, 150 * s);
    const hp = split(f, REGION.front); extra.happyHead = new T.CanvasTexture(hp.head);
    return { views, extra };
  }
  // Generated parts: home/yami/parts.json lists each view's frame size and parts (file, pivot, parent, z, bend).
  async function fromParts() {
    const r = await fetch(base + 'yami/parts.json', { cache: 'no-store' }); if (!r.ok) throw new Error('no parts');
    const m = await r.json(), load = f => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = base + 'yami/' + f; });
    const views = {}, extra = {};
    for (const [v, spec] of Object.entries(m.views)) {
      const parts = [];
      for (const p of spec.parts) { const im = await load(p.file), c = document.createElement('canvas'); c.width = spec.fw; c.height = spec.fh; c.getContext('2d').drawImage(im, 0, 0, spec.fw, spec.fh); parts.push({ ...p, canvas: c }); }
      views[v] = { fw: spec.fw, fh: spec.fh, parts };
    }
    if (m.happyHead) { const im = await load(m.happyHead), c = document.createElement('canvas'); c.width = m.views.front.fw; c.height = m.views.front.fh; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); extra.happyHead = new T.CanvasTexture(c); }
    return { views, extra, generated: true };
  }

  let RIGSET = null, waiting = [];
  const loaded = rs => { RIGSET = rs; const w = waiting; waiting = []; w.forEach(f => f()); };
  // Drawn frames (yami/frames.json, made with Morphic from the sheet) come first; then generated parts; then the sheet.
  let FR = null;
  const fromSheetOrParts = () => fromParts().then(loaded).catch(() => { const img = new Image(); img.onload = () => loaded(fromSheet(img)); img.src = base + 'yami-sheet.webp'; });
  // 12-drawings-a-second animations (yami/anims.json) come first: one atlas per movement and angle.
  let AN = null;
  const fromFrames = () => fetch(base + 'yami/frames.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('no frames'); return r.json(); }).then(m => {
    const L = new T.TextureLoader(); FR = { sit: m.sit, f: {} };
    for (const [n, f] of Object.entries(m.frames)) { const tx = L.load(base + 'yami/' + f.file); tx.minFilter = T.LinearMipmapLinearFilter; tx.anisotropy = 4; FR.f[n] = { ...f, tex: tx }; }
    loaded({ frames: true });
  }).catch(fromSheetOrParts);
  fetch(base + 'yami/anims.json', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('no anims'); return r.json(); }).then(m => {
    const L = new T.TextureLoader(); AN = { sit: m.sit, a: {} };
    for (const [n, a] of Object.entries(m.anims)) { const tx = L.load(base + 'yami/' + a.file); tx.anisotropy = 4; AN.a[n] = { ...a, tex: tx }; }
    loaded({ anims: true });
  }).catch(fromFrames);

  // ---- animation mode: every frame on screen is its own drawing, 12 a second, chosen by movement and angle
  function makeAnim(inst) {
    const card = new T.Group(), g = new T.PlaneGeometry(1, 1); g.translate(0.5, 0.5, 0);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: T.DoubleSide })); m.layers.set(1); m.layers.enable(2); m.renderOrder = 1;
    const body = new T.Group(); body.add(m); card.add(body); inst.group.add(card);
    const sh = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x3a2a40, transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1.4, 0.8, 1); sh.layers.set(1); inst.group.add(sh);
    Object.assign(inst, { animMode: true, card, body, mesh: m, tex: {}, cur: null, idx: 0, extra: null, nextExtra: 5 + Math.random() * 6, turnAt: -9, viewKey: null, tick: 0 });
  }
  const texFor = (inst, n) => { if (!AN.a[n].tex.image) return null; if (!inst.tex[n]) { const a = AN.a[n], t = a.tex.clone(); t.needsUpdate = true; t.repeat.set(1 / a.n, 1); inst.tex[n] = t; } return inst.tex[n]; };
  // On each beat: the next drawing of the current animation (one-shots hold their last drawing).
  function poseAnim(inst, st, t) {
    if (st !== inst.st) { inst.st = st; inst.extra = null; }
    if ((st === 'stand' || st === 'look') && !inst.extra && t > inst.nextExtra) inst.extra = { name: Math.random() < 0.6 ? 'groom' : 'stretch', until: t + (Math.random() < 0.6 ? 3 : 1) };
    if (inst.extra && t > inst.extra.until) { inst.extra = null; inst.nextExtra = t + 7 + Math.random() * 8; }
    inst.tick++;
  }
  function faceAnim(inst, cam, camYaw, tint, now = performance.now() / 1000) {
    const g = inst.group; g.updateMatrixWorld(); g.getWorldQuaternion(Q).invert().multiply(cam.quaternion); inst.card.quaternion.copy(Q);
    let a = g.rotation.y - camYaw; a = Math.atan2(Math.sin(a), Math.cos(a)); const A2 = Math.abs(a), st = inst.st;
    const view = A2 < Math.PI * 0.2 ? 'front' : A2 < Math.PI * 0.4 ? 'tq' : A2 < Math.PI * 0.76 ? 'side' : 'back';
    let name = st === 'walk' ? `walk_${view}` : st === 'sleep' ? 'sleep' : st === 'sit' ? 'liedown' : st === 'happy' ? (view === 'side' ? 'happy_side' : 'happy_front') : inst.extra ? inst.extra.name : `idle_${view}`;
    const an = AN.a[name];
    if (name !== inst.cur) { inst.cur = name; inst.idx = 0; inst.lastTick = inst.tick; if (inst.viewKey && st !== 'walk') inst.turnAt = now; }
    if (inst.tick !== inst.lastTick) { inst.lastTick = inst.tick; inst.idx = an.loop ? (inst.idx + 1) % an.n : Math.min(an.n - 1, inst.idx + 1); }
    // which way the drawing faces: L or R drawings flip to match her heading; front and back ones don't
    const wantLeft = a < 0, flip = an.face === 'C' ? false : an.face === 'L' ? !wantLeft : wantLeft;
    const key = name + (flip ? '-' : '+'); if (inst.viewKey && key !== inst.viewKey && name === inst.cur && st !== 'walk' && inst.viewKey.slice(0, -1) === name) inst.turnAt = now; inst.viewKey = key;
    const tx = texFor(inst, name), m = inst.mesh, k = HEIGHT / AN.sit; m.visible = !!tx; if (!tx) return; tx.offset.x = inst.idx / an.n;
    if (m.material.map !== tx) { m.material.map = tx; m.material.needsUpdate = true; }
    m.scale.set(an.fw * k, an.fh * k, 1); m.position.x = -an.ax * k;
    const tp = (now - inst.turnAt) / 0.17, turn = tp < 0 || tp > 1 ? 1 : 0.55 + 0.45 * A.ease(tp);
    inst.body.scale.set((flip ? -1 : 1) * turn, 1, 1);
    if (tint) m.material.color.setRGB(Math.min(1, tint.x), Math.min(1, tint.y), Math.min(1, tint.z));
  }

  // ---- frame mode: every pose is a finished drawing; the engine adds timing, breathing, squash, hops and turns
  const K = () => HEIGHT / FR.sit;
  function makeFramed(inst) {
    const card = new T.Group(), g = new T.PlaneGeometry(1, 1); g.translate(0.5, 0.5, 0);
    const m = new T.Mesh(g, new T.MeshBasicMaterial({ transparent: true, alphaTest: 0.4, side: T.DoubleSide })); m.layers.set(1); m.layers.enable(2); m.renderOrder = 1;
    const body = new T.Group(); body.add(m); card.add(body); inst.group.add(card);
    const sh = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x3a2a40, transparent: true, opacity: 0.22, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; sh.scale.set(1.4, 0.8, 1); sh.layers.set(1); inst.group.add(sh);
    Object.assign(inst, { framed: true, card, body, mesh: m, beats: 0, walkBeats: 0, sy: new A.Spring(1, 260, 14), hop: new A.Spring(0, 160, 13), extra: null, nextExtra: 4 + Math.random() * 6, nextBlink: 1, blinkTo: 0, frame: null, turnAt: -9, viewKey: null });
  }
  function poseFramed(inst, st, t) {
    const dt = inst.t == null ? 0 : Math.min(0.25, Math.max(0, t - inst.t)); inst.t = t; inst.beats++;
    if (st !== inst.st) {
      if (st === 'happy') { inst.sy.v = 0.86; inst.hopAt = t + 0.09; } // anticipation, then the hop
      else inst.sy.v = 0.93; // a settle into each new pose
      inst.st = st; inst.extra = null;
    }
    if (inst.hopAt && t >= inst.hopAt) { inst.hop.v = 0; inst.hop.vel = 2.6; inst.hopAt = 0; }
    if (st === 'walk') inst.walkBeats++;
    // idle business: now and then a groom or a stretch, played once and held
    if ((st === 'stand' || st === 'sit') && !inst.extra && t > inst.nextExtra) { inst.extra = { name: Math.random() < 0.6 ? 'groom' : 'stretch', until: t + (Math.random() < 0.6 ? 2.6 : 1.4) }; inst.sy.v = 0.92; }
    if (inst.extra && t > inst.extra.until) { inst.extra = null; inst.nextExtra = t + 6 + Math.random() * 8; inst.sy.v = 0.94; }
    if (t > inst.nextBlink) { inst.blinkTo = t + 0.17; inst.nextBlink = t + 2 + Math.random() * 3.5; }
    inst.sy.to = st === 'sleep' ? 1 + Math.sin(t * 1.4) * 0.025 : st === 'walk' ? 1 : 1 + Math.sin(t * 2.4) * 0.012;
    inst.sy.step(dt); inst.hop.vel -= 14 * dt; inst.hop.v = Math.max(0, inst.hop.v + inst.hop.vel * dt); if (inst.hop.v === 0 && inst.hop.vel < 0) inst.hop.vel = 0;
    inst.blink = t < inst.blinkTo;
  }
  function faceFramed(inst, cam, camYaw, tint, now = performance.now() / 1000) {
    const g = inst.group; g.updateMatrixWorld(); g.getWorldQuaternion(Q).invert().multiply(cam.quaternion); inst.card.quaternion.copy(Q);
    let a = g.rotation.y - camYaw; a = Math.atan2(Math.sin(a), Math.cos(a)); const A2 = Math.abs(a), st = inst.st;
    const view = A2 < Math.PI * 0.2 ? 'front' : A2 < Math.PI * 0.38 ? 'tq' : A2 < Math.PI * 0.76 ? 'side' : 'back';
    let name, flip = a > 0;
    if (st === 'walk') { const i = 1 + (Math.floor(inst.walkBeats / 2) % 4); name = view === 'back' ? `walk_back_${i}` : view === 'side' ? `walk_side_${i}` : `walk_front_${i}`; if (view !== 'side') flip = false; }
    else if (st === 'sleep') name = 'curl';
    else if (st === 'happy') name = view === 'side' ? 'side_happy' : 'front_happy';
    else if (inst.extra) name = inst.extra.name;
    else if (st === 'sit' && view !== 'back') name = 'loaf';
    else name = view === 'front' ? (inst.blink ? 'front_blink' : 'front') : view === 'tq' ? 'tq' : view === 'side' ? (st === 'look' ? 'side_up' : inst.blink ? 'side_blink' : 'side') : 'back';
    if (view === 'front' || view === 'back') flip = name === 'curl' || name === 'loaf' || name === 'groom' || name === 'stretch' ? a > 0 : false;
    const key = name.replace(/_blink|_\d$/, '') + (flip ? '-' : '+');
    if (inst.viewKey && key !== inst.viewKey && st !== 'walk') inst.turnAt = now; inst.viewKey = key;
    const f = FR.f[name], k = K(), m = inst.mesh;
    if (m.material.map !== f.tex) { m.material.map = f.tex; m.material.needsUpdate = true; }
    m.scale.set(f.w * k, f.h * k, 1); m.position.x = -f.ax * k;
    const tp = (now - inst.turnAt) / 0.17, turn = tp < 0 || tp > 1 ? 1 : 0.55 + 0.45 * A.ease(tp), sy = inst.sy.v;
    inst.body.scale.set((flip ? -1 : 1) * (1 + (1 - sy) * 0.6) * turn, sy, 1); inst.body.position.y = inst.hop.v * 0.18;
    if (tint) m.material.color.setRGB(Math.min(1, tint.x), Math.min(1, tint.y), Math.min(1, tint.z));
  }


  // ---- the character
  function make() {
    const root = new T.Group(), inst = { group: root, subs: {}, pet: 'cat', sprite: true, st: 'stand', t: null };
    const build = () => {
      const ch = new A.Character(RIGSET.views, HEIGHT); root.add(ch.group); inst.ch = ch; inst.happyHead = RIGSET.extra.happyHead;
      inst.normalHead = {}; for (const [k, v] of Object.entries(ch.views)) inst.normalHead[k] = v.parts.head.mesh.material.map;
      Object.assign(inst.subs, { headR: new A.Spring(0, 70, 9), headY: new A.Spring(0, 120, 12), tail: new A.Spring(0.1, 40, 6), earL: new A.Spring(0, 160, 7), earR: new A.Spring(0, 160, 7), sy: new A.Spring(1, 220, 13), hop: new A.Spring(0, 150, 13), look: new A.Keys(0), nextLook: 0, nextBlink: 1, blinkTo: 0, nextEar: 2 });
      ch.card.rotation.y = Math.PI / 4; ch.show('front', 0);
    };
    const pick = () => (RIGSET.anims ? makeAnim(inst) : RIGSET.frames ? makeFramed(inst) : build());
    if (RIGSET) pick(); else waiting.push(pick);
    root.userData.pet = 'cat';
    return inst;
  }

  // On the beat: act out the state.
  function pose(inst, st, t) {
    if (inst.animMode) return poseAnim(inst, st, t);
    if (inst.framed) return poseFramed(inst, st, t);
    if (!inst.ch) return;
    const S = inst.subs, dt = inst.t == null ? 0 : Math.min(0.25, Math.max(0, t - inst.t)); inst.t = t;
    if (st !== inst.st) {
      // anticipation into a hop when she's patted; a settle when she sits or lies down
      if (st === 'happy') { S.sy.v = 0.86; S.hop.kick(-0); setTimeout(() => { S.hop.to = -26; setTimeout(() => { S.hop.to = 0; }, 160); }, 110); }
      if (st === 'sit' || st === 'sleep') S.sy.kick(-1.2);
      inst.st = st;
    }
    // looks about: held key poses at random times, eased, with the head spring adding follow-through
    if (t > S.nextLook) { const r = st === 'sleep' ? 0.16 : (Math.random() - 0.5) * 0.36; S.look.go(r, t, 0.25); S.nextLook = t + 1.2 + Math.random() * 2.6; S.headR.kick(-r * 1.5); }
    S.headR.to = st === 'walk' ? 0 : S.look.step(t);
    // blinks (two beats) and ear twitches
    if (t > S.nextBlink) { S.blinkTo = t + 0.17; S.nextBlink = t + 2 + Math.random() * 3.5; }
    if (t > S.nextEar && st !== 'sleep') { (Math.random() < 0.5 ? S.earL : S.earR).kick(Math.random() < 0.5 ? 9 : -9); S.nextEar = t + 2.5 + Math.random() * 5; }
    // tail: slow swish at rest, quick when happy, up and swinging on a walk, curled in sleep
    S.tail.to = st === 'happy' ? Math.sin(t * 9) * 0.45 : st === 'walk' ? 0.25 + Math.sin(t * 4.5) * 0.22 : st === 'sleep' ? 0.55 : Math.sin(t * 1.1) * 0.22;
    // body: breathing, walking bounce with squash on each footfall, sleep breathing
    const step = Math.abs(Math.sin(t * 9));
    S.sy.to = st === 'walk' ? (step < 0.25 ? 0.95 : 1.02) : 1 + Math.sin(t * (st === 'sleep' ? 1.4 : 2.4)) * (st === 'sleep' ? 0.022 : 0.012);
    S.headY.to = st === 'walk' ? -step * 5 : st === 'sleep' ? 16 : 0;
    for (const k of ['headR', 'headY', 'tail', 'earL', 'earR', 'sy', 'hop']) S[k].step(dt);
    inst.blink = t < S.blinkTo || st === 'sleep';
    inst.bounce = st === 'walk' ? -step * 8 : 0;
  }

  // Every frame: face the camera and draw the right view, posed.
  const Q = new T.Quaternion();
  function face(inst, cam, camYaw, tint, now = performance.now() / 1000) {
    if (inst.animMode) return faceAnim(inst, cam, camYaw, tint, now);
    if (inst.framed) return faceFramed(inst, cam, camYaw, tint, now);
    const ch = inst.ch; if (!ch) return; const S = inst.subs, g = inst.group; g.updateMatrixWorld();
    g.getWorldQuaternion(Q).invert().multiply(cam.quaternion); ch.card.quaternion.copy(Q);
    let a = g.rotation.y - camYaw; a = Math.atan2(Math.sin(a), Math.cos(a));
    const happy = inst.st === 'happy';
    let view = Math.abs(a) < Math.PI * 0.3 ? 'front' : Math.abs(a) > Math.PI * 0.72 ? 'back' : 'side';
    if (inst.st !== 'walk' && view === 'back' && (happy || inst.st === 'sleep')) view = 'front';
    const flip = view === 'side' && a > 0 ? -1 : 1, v = ch.show(view, now, flip);
    ch.card.scale.set(flip * ch.turnSquash(now), 1, 1);
    const sy = S.sy.v, sx = 1 + (1 - sy) * 0.6;
    v.apply({
      body: { sy, sx, y: (S.hop.v || 0) + (inst.bounce || 0) },
      head: { r: S.headR.v * (view === 'side' ? 0.6 : 1), y: S.headY.v, tex: view === 'front' && happy && inst.happyHead ? inst.happyHead : inst.normalHead[view] },
      earL: { r: S.earL.v * 0.04 + (happy ? 0.12 : 0) }, earR: { r: -S.earR.v * 0.04 - (happy ? 0.12 : 0) },
      tail: { bend: S.tail.v * (view === 'front' ? -1 : 1) },
      lids: { show: !!inst.blink && !(view === 'front' && happy) }
    });
    if (tint) { const c = new T.Color(Math.min(1, tint.x), Math.min(1, tint.y), Math.min(1, tint.z)); for (const vv of Object.values(ch.views)) for (const p of Object.values(vv.parts)) p.mesh.material.color.copy(c); }
  }

  IH.yami = { make, pose, face, get ready() { return !!RIGSET; } };
})();
