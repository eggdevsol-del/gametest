/* Chorecast homes (a prototype): Yami as a 3D character.
   The model (yami/yami.glb) was generated with Morphic (Hyper3D Rodin) from a turnaround of the user's Yami sheet,
   then reduced to 16k triangles and rigged in Blender: one continuous skin (body, legs, paws, tail, head and ears
   all one surface) bound with automatic weights to a 16-bone skeleton, so every joint bends as soft skin.
   It is drawn with the anime shader (painted texture in two cel tones, ink lines) and posed by bones on the
   anime beat: walk (diagonal gait, head bob, tail sway), stand (breathing, looking about, tail swish), sit, lie
   down to sleep (curled tail, slow breaths) and a happy hop with anticipation. Poses blend through springs, so
   moves overlap and settle like hand-timed animation. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.look) return;
  const base = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^/]*$/, '') : 'home/');
  const HEIGHT = 1.15; // standing height in tiles
  // the pets, each its own model made the same way (a Morphic turnaround, a 3D model, the four-legged rig)
  const PETS = { cat: { file: 'yami/yami.glb', h: HEIGHT }, dog: { file: 'pets/dog.glb', h: 1.15 }, bunny: { file: 'pets/bunny.glb', h: 0.95 } };
  function wantPet(kind, then) {
    const P = PETS[kind] || PETS.cat; if (P.m) return then(P.m);
    (P.wait = P.wait || []).push(then); if (P.wait.length > 1) return;
    loadGLB(base + P.file).then(m => { P.m = m; P.wait.splice(0).forEach(f => f(m)); }).catch(e => console.error('yami3d', kind, e));
  }

  // ---- a small GLB reader: one skinned mesh, its node tree and its colour texture
  async function loadGLB(url) {
    const buf = await (await fetch(url)).arrayBuffer(), dv = new DataView(buf);
    let off = 12, json = null, bin = null;
    while (off < buf.byteLength) { const len = dv.getUint32(off, true), type = dv.getUint32(off + 4, true); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, off + 8, len))); else bin = buf.slice(off + 8, off + 8 + len); off += 8 + len; }
    const CT = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }, N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const acc = i => { const a = json.accessors[i], bv = json.bufferViews[a.bufferView], C = CT[a.componentType], n = N[a.type], st = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * C.BYTES_PER_ELEMENT;
      const out = new C(a.count * n), src = new DataView(bin);
      for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) { const p = st + k * stride + c * C.BYTES_PER_ELEMENT; out[k * n + c] = C === Float32Array ? src.getFloat32(p, true) : C === Uint16Array ? src.getUint16(p, true) : C === Uint32Array ? src.getUint32(p, true) : src.getUint8(p); }
      return { arr: out, n }; };
    const meshNode = json.nodes.findIndex(n => n.mesh != null), prim = json.meshes[json.nodes[meshNode].mesh].primitives[0], at = prim.attributes;
    const geo = new T.BufferGeometry();
    const P = acc(at.POSITION), Nn = acc(at.NORMAL), U = acc(at.TEXCOORD_0);
    geo.setAttribute('position', new T.BufferAttribute(P.arr, 3)); geo.setAttribute('normal', new T.BufferAttribute(Nn.arr, 3)); geo.setAttribute('uv', new T.BufferAttribute(U.arr, 2));
    if (at.JOINTS_0 != null) { // (rigged: characters and pets; furniture has no skeleton)
      const J = acc(at.JOINTS_0), W = acc(at.WEIGHTS_0);
      for (let k = 0; k < W.arr.length; k += 4) if (W.arr[k] + W.arr[k + 1] + W.arr[k + 2] + W.arr[k + 3] < 1e-4) { W.arr[k] = 1; J.arr[k] = 0; } // unweighted bits follow the spine
      geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(Array.from(J.arr), 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(W.arr, 4));
    }
    geo.setIndex(new T.BufferAttribute(acc(prim.indices).arr, 1));
    geo.computeBoundingBox(); geo.computeBoundingSphere();
    // the colour texture
    const mat = json.materials[prim.material], tex = json.textures[mat.pbrMetallicRoughness.baseColorTexture.index], im = json.images[tex.source], ibv = json.bufferViews[im.bufferView];
    const blob = new Blob([new Uint8Array(bin, ibv.byteOffset || 0, ibv.byteLength)], { type: im.mimeType });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(blob); });
    const map = new T.Texture(img); map.flipY = false; map.needsUpdate = true; map.anisotropy = 4;
    const skin = json.skins && json.skins[0], ibm = skin ? acc(skin.inverseBindMatrices).arr : null;
    return { json, geo, map, skin, ibm, meshNode, img };
  }
  wantPet('cat', () => {});

  // Builds a posable copy of a rigged model: its node tree, a skinned mesh in the anime look, standing `height`
  // tall with feet on the floor, centred and facing +z. Returns { body, top, mesh, B (bones by name) }.
  function instance(model, height, matOpts = {}) {
    const { json, geo, map, skin, ibm, meshNode } = model, objs = json.nodes.map((n, i) => (skin.joints.includes(i) ? new T.Bone() : new T.Object3D()));
    json.nodes.forEach((n, i) => { const o = objs[i]; o.name = n.name || ''; if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); (n.children || []).forEach(c => o.add(objs[c])); });
    const mat = IH.look.animeMat(Object.assign({ map, skinning: true, spec: 0, side: T.DoubleSide }, matOpts));
    const mesh = new T.SkinnedMesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.customDepthMaterial = new T.MeshDepthMaterial({ skinning: true, depthPacking: T.RGBADepthPacking });
    const holder = objs[meshNode]; if (holder.parent) holder.parent.add(mesh); mesh.position.copy(holder.position); mesh.quaternion.copy(holder.quaternion); mesh.scale.copy(holder.scale);
    const top = new T.Group(); json.scenes[json.scene || 0].nodes.forEach(i => { if (i !== meshNode) top.add(objs[i]); }); if (!mesh.parent) top.add(mesh);
    const bones = skin.joints.map(i => objs[i]), inv = bones.map((b, k) => new T.Matrix4().fromArray(ibm, k * 16));
    top.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones, inv), mesh.matrixWorld);
    const bb = geo.boundingBox, s = height / (bb.max.y - bb.min.y); top.scale.setScalar(s); top.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
    const body = new T.Group(); body.add(top);
    const B = {}; bones.forEach(b => { B[b.name] = b; b.userData.rest = b.quaternion.clone(); });
    return { body, top, mesh, B, s };
  }
  // Moves every listed bone toward its target rotation through a spring (sub-stepped, so stiff springs stay stable).
  const SE = new T.Euler(), SQ = new T.Quaternion();
  function springBones(inst, P, dt, k, d) {
    for (const n of new Set([...Object.keys(inst.B), ...Object.keys(P)])) {
      const b = inst.B[n]; if (!b) continue; const to = P[n] || [0, 0, 0], c = inst.cur[n] || (inst.cur[n] = [0, 0, 0]), v = inst.vel[n] || (inst.vel[n] = [0, 0, 0]);
      const steps = Math.max(1, Math.ceil(dt / 0.012)), h = dt / steps;
      for (let i = 0; i < steps; i++) for (let a = 0; a < 3; a++) { v[a] += (k * (to[a] - c[a]) - d * v[a]) * h; c[a] += v[a] * h; }
      SQ.setFromEuler(SE.set(c[0], c[1], c[2])); b.quaternion.copy(b.userData.rest).multiply(SQ);
    }
  }

  // ---- one cat
  function make(kind = 'cat') {
    const root = new T.Group(), inst = { group: root, subs: {}, pet: kind, model3d: true, st: 'stand', t: null }, HT = (PETS[kind] || PETS.cat).h;
    const build = MODEL => {
      const { json, geo, map, skin, ibm, meshNode } = MODEL, objs = json.nodes.map((n, i) => (skin.joints.includes(i) ? new T.Bone() : new T.Object3D()));
      json.nodes.forEach((n, i) => { const o = objs[i]; o.name = n.name || ''; if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); (n.children || []).forEach(c => o.add(objs[c])); });
      const mat = IH.look.animeMat({ map, skinning: true, spec: 0, side: T.DoubleSide, tone: [0.6, 1.18] });
      const mesh = new T.SkinnedMesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.customDepthMaterial = new T.MeshDepthMaterial({ skinning: true, depthPacking: T.RGBADepthPacking });
      const holder = objs[meshNode]; if (holder.parent) holder.parent.add(mesh); mesh.position.copy(holder.position); mesh.quaternion.copy(holder.quaternion); mesh.scale.copy(holder.scale);
      const top = new T.Group(); json.scenes[json.scene || 0].nodes.forEach(i => { if (i !== meshNode) top.add(objs[i]); }); if (!mesh.parent) top.add(mesh);
      const bones = skin.joints.map(i => objs[i]), inv = bones.map((b, k) => new T.Matrix4().fromArray(ibm, k * 16));
      top.updateMatrixWorld(true); mesh.bind(new T.Skeleton(bones, inv), mesh.matrixWorld);
      // size and place: feet on the floor, centred, standing HEIGHT tall, facing +z
      const bb = geo.boundingBox, s = HT / (bb.max.y - bb.min.y); top.scale.setScalar(s); top.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
      const body = new T.Group(); body.add(top); root.add(body);
      const B = {}; bones.forEach(b => { B[b.name] = b; b.userData.rest = b.quaternion.clone(); });
      Object.assign(inst, { body, top, mesh, B, cur: {}, vel: {}, look: 0, nextLook: 0, hopV: 0, hopY: 0, s });
      inst.cols = colliders(MODEL, autoDefs(MODEL)); // the body's shape, bone by bone (touching it, keeping out of things)
      // Yami's eyes in the texture (green, either side of the nose); the closed lid is drawn in a soft pale line on black fur
      if (kind === 'cat') inst.open = map, inst.shut = closedEyes(MODEL, [{ x: 828, y: 153, r: 17, dir: [0.99, 0.11], down: [0.11, -0.99] }, { x: 912, y: 162, r: 17, dir: [0.99, 0.11], down: [0.11, -0.99] }], '#cfc8e0');
    };
    wantPet(kind, build);
    return inst;
  }

  // Target pose per state: bone rotations (radians about each bone's local X, Y, Z) plus body drop and pitch.
  // Every leg section bends the way a real cat's does. In this rig a positive X turn swings a section's lower end
  // backward, so:
  //   shoulder / hip swing:     fleg1 / hleg1  + = leg back, - = leg forward
  //   elbow (points back):      fleg2          - = flex (forearm and paw fold forward)
  //   wrist (carpus):           fleg3          + = flex (paw curls back)
  //   knee (points forward):    hleg2          + = flex (shank folds back)
  //   hock (heel, points back): hleg3          - = flex (foot folds forward)
  const TAIL = ['tail1', 'tail2', 'tail3', 'tail4'];
  // Branches of a move are named 'base.branch' (sleep.curl, look.paw); u is the time since the branch began.
  const ease = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function target(st0, t, inst) {
    const P = {}, set = (n, x = 0, y = 0, z = 0) => { P[n] = [x, y, z]; };
    const [st, br] = st0.split('.'), u = t - (inst.st0 || 0);
    const leg = (side, f, shoulder, elbow, wrist) => { const g = f ? 'fleg' : 'hleg'; set(`${g}1.${side}`, shoulder); set(`${g}2.${side}`, elbow); set(`${g}3.${side}`, wrist); };
    let drop = 0, pitch = 0, roll = 0;
    if (st === 'walk') {
      // diagonal gait: left fore with right hind; a leg lifts only while it swings forward
      const p = inst.walkD != null ? inst.walkD / 0.45 * Math.PI : t * Math.PI * 2 * 1.4; // paws in step with the ground covered
      for (const [side, ph] of [['L', 0], ['R', Math.PI]]) {
        const qf = p + ph, qh = p + ph + Math.PI, lf = Math.max(0, -Math.cos(qf)), lh = Math.max(0, -Math.cos(qh));
        leg(side, true, Math.sin(qf) * 0.34, -lf * 0.45, lf * 1.1);    // elbow folds forward, wrist curls the paw back
        leg(side, false, Math.sin(qh) * 0.3, lh * 0.55, -lh * 0.85);   // knee folds back, hock folds the foot forward
      }
      set('spine', 0, 0, Math.sin(p * 2) * 0.03); set('neck', -0.05); set('head', Math.sin(p * 2) * 0.04);
      TAIL.forEach((n, i) => set(n, 0.05, 0, Math.sin(p - i * 0.6) * 0.18));
      drop = Math.abs(Math.sin(p)) * 0.015;
    } else if (st === 'sit') {
      // haunches down: hips swing forward, knees and hocks fold so the long feet lie flat; forelegs stay upright
      pitch = -0.45; drop = 0.12;
      for (const side of ['L', 'R']) { leg(side, false, -0.95, 1.55, -1.05); leg(side, true, 0.42, 0, 0); }
      set('neck', 0.38); set('head', 0.12 + inst.look * 0.3, inst.look);
      TAIL.forEach((n, i) => set(n, -0.45, 0, 0.25 * Math.sin(t * 1.2 - i * 0.5) + (i ? 0.38 : 0)));
      if (br === 'scratch') { // a hind foot up to scratch behind an ear, quick little kicks
        leg('L', false, -1.75 + Math.sin(u * 16) * 0.22, 0.55, -0.35); set('neck', 0.35, 0, 0.35); set('head', 0.25, 0.45, 0.5);
      }
      if (br === 'wash') { // licks a raised front paw, then wipes it over an ear
        const lick = Math.sin(u * 9) * 0.12, wipe = (u % 4) > 2.6;
        leg('L', true, -0.9, -1.6 + lick, 0.9); set('neck', 0.7); set('head', wipe ? 0.1 : 0.55 + lick, wipe ? -0.4 : 0.15, wipe ? -0.35 : 0);
      }
    } else if (st === 'sleep') {
      // lying like a loaf: elbows fold so the forearms lie forward on the floor, hind legs folded flat under the body
      drop = 0.42 + Math.sin(t * 1.4) * 0.008;
      for (const side of ['L', 'R']) { leg(side, true, 0.55, -1.75, 0.35); leg(side, false, -0.8, 1.85, -1.2); }
      set('neck', 0.55, 0.35); set('head', 0.35, 0.3, 0.25);
      TAIL.forEach((n, i) => set(n, -0.55, 0, 0.5 + i * 0.12));
      set('spine', 0, 0, 0.08); set('chest', 0, 0, 0.1);
      if (br === 'curl') { // a doughnut: body bent round, nose tucked into the tail
        set('spine', 0, 0, 0.55); set('chest', 0, 0, 0.6); set('neck', 0.6, 0, 0.7); set('head', 0.4, 0, 0.5);
        TAIL.forEach((n, i) => set(n, -0.55, 0, 0.7 + i * 0.25));
      }
      if (br === 'stretch') { // a big front-paw stretch and yawn, then settles back down
        const k = ease(0.2, 1.0, u) - ease(2.4, 3.4, u);
        for (const side of ['L', 'R']) leg(side, true, 0.55 - k * 1.3, -1.75 + k * 1.75, 0.35 - k * 0.3);
        set('neck', 0.55 - k * 0.9); set('head', 0.35 - k * 0.6, 0.3 * (1 - k)); drop += k * 0.04;
      }
      if (br === 'knead') { // treads the blanket, front paws in turn, before lying down again
        const k = ease(0, 0.4, u) - ease(4.5, 5.2, u);
        for (const [side, ph] of [['L', 0], ['R', Math.PI]]) leg(side, true, 0.55 - k * (0.5 + Math.max(0, Math.sin(u * 7 + ph)) * 0.35), -1.75 * (1 - k), 0.35);
        drop -= k * 0.12; set('neck', 0.55 - k * 0.4); set('head', 0.35 - k * 0.25, 0, 0);
      }
    } else if (st === 'play') {
      // playing with a toy. bow: front down, rear up, tail going; crouch: low and creeping, eyes on it, the tail tip
      // twitching; pounce: a wiggle, a leap with the front paws reaching, a landing on it; shake: a toy in the mouth,
      // head thrashing side to side; bat: a quick paw swipe; wrestle: on its side, front paws hugging the toy, back legs
      // kicking at it; tug: braced back on its haunches, pulling; nudge: nose down to push it along
      const wag = Math.sin(t * 16);
      if (br === 'bow') { pitch = 0.42; drop = 0.04; for (const s of ['L', 'R']) { leg(s, true, -0.95, -1.65, 0.6); leg(s, false, 0.05, 0.15, -0.1); } set('neck', -0.45); set('head', -0.2, inst.look * 0.4, Math.sin(t * 5) * 0.12); TAIL.forEach((n, i) => set(n, 0.5, 0, wag * 0.45)); }
      else if (br === 'crouch') { drop = 0.17; pitch = 0.08; for (const s of ['L', 'R']) { leg(s, true, -0.25, -1.2, 1.0); leg(s, false, -0.65, 1.45, -1.05); } set('neck', 0.05); set('head', -0.12); TAIL.forEach((n, i) => set(n, -0.15, 0, i === 3 ? Math.sin(t * 9) * 0.6 : 0.05)); }
      else if (br === 'pounce') {
        const k = u % 1.1, wig = k < 0.35 ? Math.sin(k * 40) * 0.12 : 0, air = k > 0.35 && k < 0.75 ? 1 : 0;
        drop = air ? -0.05 : 0.15; pitch = air ? -0.15 : 0.12;
        for (const s of ['L', 'R']) { leg(s, true, air ? -1.25 : -0.3, air ? -0.1 : -1.1, air ? 0.2 : 0.9); leg(s, false, air ? 0.75 : -0.6 + wig, air ? 0.2 : 1.4, air ? 0.1 : -1.0); }
        set('neck', air ? -0.2 : 0.05); set('head', 0.05); TAIL.forEach((n, i) => set(n, air ? 0.3 : -0.1, 0, wig * 2));
      } else if (br === 'shake') { drop = 0.03; for (const s of ['L', 'R']) { leg(s, true, -0.15, 0, 0); leg(s, false, -0.1, 0.25, -0.15); } const sh = Math.sin(u * 24); set('neck', 0.1, sh * 0.35, sh * 0.2); set('head', 0.05, sh * 0.5, sh * 0.25); set('spine', 0, 0, -sh * 0.08); TAIL.forEach((n, i) => set(n, 0.4, 0, wag * 0.4)); }
      else if (br === 'bat') { pitch = -0.3; drop = 0.1; for (const s of ['L', 'R']) leg(s, false, -0.9, 1.5, -1.05); leg('L', true, 0.35, 0, 0); const sw = Math.max(0, Math.sin(u * 7)); leg('R', true, -0.6 - sw * 0.9, -0.6 + sw * 0.5, 0.7); set('neck', 0.35); set('head', 0.25, 0, sw * 0.15); TAIL.forEach((n, i) => set(n, -0.3, 0, Math.sin(t * 3 - i) * 0.3)); }
      else if (br === 'wrestle') {
        roll = 1.35; drop = 0.36; const kick = Math.sin(u * 15), bite = Math.sin(u * 5);
        for (const s of ['L', 'R']) { leg(s, true, -0.7, -1.5, 0.9); leg(s, false, -0.9 + kick * 0.55 * (s === 'L' ? 1 : -1), 0.9 + kick * 0.45, -0.4); }
        set('spine', 0, 0, 0.35); set('chest', 0.15, 0, 0.3); set('neck', 0.55 + bite * 0.15, 0, 0.3); set('head', 0.35 + bite * 0.1, 0, 0.2); TAIL.forEach((n, i) => set(n, -0.2, 0, Math.sin(t * 4 - i) * 0.5));
      } else if (br === 'tug') { pitch = -0.22; drop = 0.08; for (const s of ['L', 'R']) { leg(s, true, 0.45, 0.05, -0.1); leg(s, false, -0.8, 1.25, -0.9); } const yank = Math.sin(u * 6); set('neck', 0.35 + yank * 0.1, yank * 0.25); set('head', 0.15, yank * 0.3); TAIL.forEach((n, i) => set(n, 0.4, 0, wag * 0.35)); }
      else { /* nudge */ const k = Math.abs(Math.sin(u * 2.4)); for (const s of ['L', 'R']) { leg(s, true, 0.1, -0.2, 0.15); leg(s, false, -0.3, 0.6, -0.45); } drop = 0.06; set('neck', 0.8 * k + 0.1); set('head', 0.45 * k); TAIL.forEach((n, i) => set(n, 0.1, 0, Math.sin(t * 3 - i) * 0.2)); }
    } else if (st === 'eat') {
      // crouched over the bowl, head down, chewing
      pitch = 0.12; drop = 0.08;
      for (const side of ['L', 'R']) { leg(side, false, -0.4, 0.9, -0.6); leg(side, true, 0.2, -0.3, 0.2); }
      set('neck', 0.95); set('head', 0.5 + Math.abs(Math.sin(t * 7)) * 0.12, 0, 0);
      TAIL.forEach((n, i) => set(n, -0.2, 0, Math.sin(t * 1.6 - i * 0.6) * 0.3));
    } else if (st === 'happy') {
      set('neck', -0.25); set('head', -0.2, 0, Math.sin(t * 8) * 0.18);
      TAIL.forEach((n, i) => set(n, 0.3, 0, Math.sin(t * 16 - i * 0.7) * 0.35));
    } else {
      set('head', 0.05 + Math.sin(t * 0.9) * 0.04, inst.look); set('neck', 0.02); set('chest', Math.sin(t * 2.4) * 0.015);
      TAIL.forEach((n, i) => set(n, 0.1 + (st === 'look' ? 0.2 : 0), 0, Math.sin(t * 1.3 - i * 0.6) * 0.22));
      if (br === 'paw') { // reaches up and bats at something on the shelf
        const bat = Math.max(0, Math.sin(u * 5)) * ease(0, 0.4, u % 3) * ((u % 3) < 1.6 ? 1 : 0);
        leg('R', true, -1.1 - bat * 0.6, -0.5 + bat * 0.4, 0.6); set('neck', -0.45); set('head', -0.35, 0.1);
      }
      if (br === 'sniff') { set('neck', 0.3 + Math.sin(u * 2) * 0.1); set('head', 0.35, Math.sin(u * 1.4) * 0.5, 0); }
    }
    return { P, drop, pitch, roll };
  }

  const E = new T.Euler(), Q = new T.Quaternion();
  // On each beat: move every joint toward its pose through a spring (follow-through and settle), then apply.
  function pose(inst, st, t) {
    if (!inst.B) return;
    const dt = inst.t == null ? 0 : Math.min(0.25, Math.max(0, t - inst.t)); inst.t = t;
    if (st !== inst.st) { if (st === 'happy') { inst.antic = t + 0.12; } inst.st = st; inst.st0 = t; }
    eyes(inst, /^sleep/.test(st), t);
    if (t > inst.nextLook) { inst.look = st === 'sleep' ? 0 : (Math.random() - 0.5) * 0.9; inst.nextLook = t + 1.4 + Math.random() * 2.6; }
    const tg = target(st, t, inst); if (IH.yami3d.test) Object.assign(tg.P, IH.yami3d.test);
    // Turning bends the body: measured from how fast it's turning (any turn, walking or standing), the head leads into
    // the turn, the neck, chest and back curve along it, and the tail swings out the other way for balance.
    { const yaw = inst.group.rotation.y, py = inst.yawPrev == null ? yaw : inst.yawPrev; inst.yawPrev = yaw;
      const rate = dt > 0 ? Math.atan2(Math.sin(yaw - py), Math.cos(yaw - py)) / dt : 0, want = Math.max(-1, Math.min(1, rate / 3.2));
      inst.bend = (inst.bend || 0) + (want - (inst.bend || 0)) * Math.min(1, dt * 6); const b = inst.bend * (IH.yami3d.bendSign || 1);
      if (Math.abs(b) > 0.01 && !/^(sleep|play\.wrestle)/.test(st)) {
        const add = (n, x, y, z) => { const c = tg.P[n] || [0, 0, 0]; tg.P[n] = [c[0] + x, c[1] + y, c[2] + z]; };
        add('spine', 0, 0, b * 0.32); add('chest', 0, 0, b * 0.28); add('neck', 0, 0, b * 0.3); add('head', 0, b * 0.45, 0);
        TAIL.forEach((n, i) => add(n, 0, 0, -b * (0.25 + i * 0.12)));
      } }
    const { P, drop, pitch, roll = 0 } = tg, k = st === 'walk' ? 160 : 70, d = st === 'walk' ? 18 : 11;
    const names = new Set([...Object.keys(inst.B), ...Object.keys(P)]);
    for (const n of names) {
      const b = inst.B[n]; if (!b) continue; const to = P[n] || [0, 0, 0], c = inst.cur[n] || (inst.cur[n] = [0, 0, 0]), v = inst.vel[n] || (inst.vel[n] = [0, 0, 0]);
      const steps = Math.max(1, Math.ceil(dt / 0.012)), h = dt / steps; // small sub-steps keep stiff springs stable
      for (let i = 0; i < steps; i++) for (let a = 0; a < 3; a++) { v[a] += (k * (to[a] - c[a]) - d * v[a]) * h; c[a] += v[a] * h; }
      Q.setFromEuler(E.set(c[0], c[1], c[2])); b.quaternion.copy(b.userData.rest).multiply(Q);
    }
    // the body: drop, pitch, and the happy hop with anticipation (crouch, spring up, land)
    const c = inst.cur.__b || (inst.cur.__b = [0, 0, 0]); c[0] += (drop - c[0]) * Math.min(1, dt * 8); c[1] += (pitch - c[1]) * Math.min(1, dt * 6); c[2] = (c[2] || 0) + (roll - (c[2] || 0)) * Math.min(1, dt * 5);
    if (inst.antic && t < inst.antic) c[0] += 0.05;
    else if (inst.antic) { inst.antic = 0; inst.hopV = 1.6; }
    inst.hopV -= 9 * dt; inst.hopY = Math.max(0, inst.hopY + inst.hopV * dt); if (inst.hopY === 0) inst.hopV = Math.max(0, inst.hopV);
    inst.body.position.y = -c[0] + inst.hopY; inst.body.rotation.x = c[1]; inst.body.rotation.z = c[2]; // (roll: over on its side to wrestle)
    const sq = inst.hopY > 0 ? 1.04 : st === 'happy' && inst.antic ? 0.93 : 1; inst.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    plantPaws(inst, st);
    IH.rig3d.look(inst, /^(sleep|eat)/.test(st) ? null : inst.focus, dt, 0.9); // the face follows what it's doing
    restHead(inst, st);
    tailRest(inst, TAIL, /^(sleep|sit|lie|eat)/.test(st) || !!inst.perched, dt);
  }

  // Asleep, the head rests: the neck lowers it till the chin is on the floor (or the paws), the nose lies level
  // with the floor, and the head is upright when lying like a loaf or laid on its side when curled up.
  const RV = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], RQ = [new T.Quaternion(), new T.Quaternion(), new T.Quaternion()], UP = new T.Vector3(0, 1, 0);
  function turnWorld(b, axis, a) {
    if (!a || !isFinite(a)) return;
    const pq = b.parent.getWorldQuaternion(RQ[0]).invert(), wq = b.getWorldQuaternion(RQ[1]);
    b.quaternion.copy(pq.multiply(RQ[2].setFromAxisAngle(axis, a).multiply(wq))); b.updateMatrixWorld(true);
  }
  function restHead(inst, st) {
    const [s0, br] = st.split('.'), h = inst.B && inst.B.head, nk = inst.B && inst.B.neck; if (s0 !== 'sleep' || !h) return;
    IH.rig3d.faceOf(inst, h); inst.group.updateMatrixWorld(true);
    const curl = br === 'curl', gy = inst.group.position.y;
    // the bottom of the head (its collision shape), so the chin, not the bone, is what touches down
    const chin = () => { const c = inst.cols && IH.rig3d.capsules(inst, inst.cols).filter(k => k.bone === 'head'); return c && c.length ? Math.min(...c.map(k => Math.min(k.a.y, k.b.y) - k.r)) : h.getWorldPosition(RV[3]).y - 0.07; };
    if (nk && br !== 'stretch' && br !== 'knead') for (let i = 0; i < 3; i++) {
      const np = nk.getWorldPosition(RV[0]), hp = h.getWorldPosition(RV[1]), L = np.distanceTo(hp), want = hp.y - (chin() - (gy + (curl ? 0.005 : 0.03)));
      if (L < 1e-3 || Math.abs(hp.y - want) < 0.008) break;
      const fl = RV[2].set(hp.x - np.x, 0, hp.z - np.z); if (fl.lengthSq() < 1e-6) break; fl.normalize();
      const cur = Math.asin(Math.max(-1, Math.min(1, (hp.y - np.y) / L))), tgt = Math.asin(Math.max(-1, Math.min(1, (want - np.y) / L)));
      turnWorld(nk, RV[3].crossVectors(UP, fl).normalize(), cur - tgt);
    }
    const fwd = inst.faceLocal.clone().applyQuaternion(h.getWorldQuaternion(RQ[0])), flat = new T.Vector3(fwd.x, 0, fwd.z); if (flat.lengthSq() < 1e-6) return; flat.normalize();
    const ax = new T.Vector3().crossVectors(fwd, flat); if (ax.lengthSq() > 1e-8) turnWorld(h, ax.normalize(), fwd.angleTo(flat));
    // roll about the nose: the top of the head up, or (curled) over to one side
    const up = inst.upLocal.clone().applyQuaternion(h.getWorldQuaternion(RQ[0])); up.addScaledVector(flat, -up.dot(flat)); if (up.lengthSq() < 1e-6) return; up.normalize();
    const want = curl ? new T.Vector3().crossVectors(flat, UP).multiplyScalar(-1).lerp(UP, 0.15).normalize() : UP.clone();
    const roll = Math.atan2(new T.Vector3().crossVectors(up, want).dot(flat), up.dot(want)); turnWorld(h, flat, roll);
  }

  // Paws on the ground. Walking, the legs go in diagonal pairs (left front with right hind): each paw is set down a
  // half stride ahead of its shoulder or hip and stays exactly where it landed while the body walks over it, then
  // lifts and swings through; the strides are timed by the ground covered (inst.walkD), so no paw slides. Standing,
  // each paw sits on the ground under its shoulder or hip. Each leg reaches its paw by two-bone IK (upper leg and
  // lower leg; the elbows bend back, the knees forward, as a real cat's or dog's do) and the paw stays level.
  const STRIDE = { cat: 0.3, dog: 0.32, bunny: 0.22 }, PV = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], PQ = new T.Quaternion(), PE = new T.Euler();
  function plantPaws(inst, st) {
    const walking = st === 'walk', standing = st === 'stand' || st === 'look';
    if ((!walking && !standing) || !inst.B['fleg1.L'] || !inst.cols) { inst.pp = null; return; }
    inst.group.updateMatrixWorld(true);
    const yaw = inst.group.rotation.y, f = [Math.sin(yaw), Math.cos(yaw)], gy = inst.group.position.y, F = inst.pp || (inst.pp = {}), STEP = STRIDE[inst.pet] || 0.3;
    const ang = (dx, dy, dz) => Math.atan2(dx * f[0] + dz * f[1], -dy);
    const caps = IH.rig3d.capsules(inst, inst.cols), tip = n => caps.find(k => k.bone === n);
    for (const [g, s, off, front] of [['fleg', 'L', 0, true], ['hleg', 'R', 0, false], ['fleg', 'R', 1, true], ['hleg', 'L', 1, false]]) {
      const n1 = g + '1.' + s, n2 = g + '2.' + s, n3 = g + '3.' + s, b1 = inst.B[n1], b2 = inst.B[n2], b3 = inst.B[n3], pb = tip(n3); if (!b1 || !b2 || !b3 || !pb) continue;
      const j1 = b1.getWorldPosition(PV[0]), j2 = b2.getWorldPosition(PV[1]), j3 = b3.getWorldPosition(PV[2]), L1 = j1.distanceTo(j2), L2 = j2.distanceTo(j3);
      const pc = PV[3].copy(pb.a), vx = pc.x - j3.x, vy = pc.y - j3.y, vz = pc.z - j3.z, key = g + s; // the paw hangs from the last joint
      let tx = j1.x + vx, tz = j1.z + vz, py = gy + pb.r;
      if (walking && inst.walkD != null) {
        const ph = ((inst.walkD / STEP + off) % 2 + 2) % 2, ahead = (x, z) => [x + vx + f[0] * STEP * 0.5, z + vz + f[1] * STEP * 0.5];
        if (ph < 1) { if (!F[key] || F[key].sw) { const [ax, az] = ahead(j1.x, j1.z); F[key] = { x: ax, z: az, sw: false }; } tx = F[key].x; tz = F[key].z; }
        else { if (!F[key]) F[key] = { x: tx, z: tz }; if (!F[key].sw) { F[key].sw = true; F[key].fx = F[key].x; F[key].fz = F[key].z; } const u = ph - 1, e = u * u * (3 - 2 * u), [nx, nz] = ahead(j1.x, j1.z); tx = F[key].fx + (nx + f[0] * STEP * 0.5 - F[key].fx) * e; tz = F[key].fz + (nz + f[1] * STEP * 0.5 - F[key].fz) * e; py += Math.sin(Math.PI * u) * 0.08; }
      } else F[key] = null;
      // where the last joint must be for the paw to land there
      const wx = tx - vx, wy = py - vy, wz = tz - vz, dxp = wx - j1.x, dyp = wy - j1.y, dzp = wz - j1.z, fw = dxp * f[0] + dzp * f[1], dn = -dyp, d = Math.max(0.03, Math.min(L1 + L2 - 1e-3, Math.hypot(fw, dn)));
      const aT = Math.atan2(fw, dn), b = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)))), A1 = aT + (front ? -b : b);
      const kx = Math.sin(A1) * L1, ky = -Math.cos(A1) * L1, A2 = Math.atan2(fw - kx, dn + ky);
      const c1 = inst.cur[n1] || (inst.cur[n1] = [0, 0, 0]), c2 = inst.cur[n2] || (inst.cur[n2] = [0, 0, 0]), c3 = inst.cur[n3] || (inst.cur[n3] = [0, 0, 0]);
      const o1 = ang(j2.x - j1.x, j2.y - j1.y, j2.z - j1.z) + c1[0], o2 = ang(j3.x - j2.x, j3.y - j2.y, j3.z - j2.z) + c1[0] + c2[0];
      const t1 = o1 - A1, t2 = o2 - A2 - t1;
      c3[0] += (c1[0] + c2[0]) - (t1 + t2); c1[0] = t1; c2[0] = t2; // the paw keeps its angle
      for (const n of [n1, n2, n3]) { if (inst.vel[n]) inst.vel[n][0] = 0; const c = inst.cur[n], bn = inst.B[n]; bn.quaternion.copy(bn.userData.rest).multiply(PQ.setFromEuler(PE.set(c[0], c[1], c[2]))); }
      inst.group.updateMatrixWorld(true);
    }
  }
  IH.yami3d = { make, pose, has: kind => !!PETS[kind], get ready() { return !!PETS.cat.m; } };
  // Closed eyes: a copy of the model's own texture with each eye painted over in the fur round it and a soft
  // closed-lid curve drawn across (the anime sleeping eye). eyes: centre, radius, the eye line and the way down
  // the face, in the texture's 1024 pixels. Made once per model; swapped in to sleep and to blink.
  function closedEyes(model, eyes, line) {
    if (model.shut) return model.shut;
    const im = model.img, W = im.naturalWidth || im.width, k = W / 1024, c = document.createElement('canvas'); c.width = W; c.height = im.naturalHeight || im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    for (const e of eyes) {
      const cx = e.x * k, cy = e.y * k, r = e.r * k, ring = [];
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) { const d = x.getImageData(Math.round(cx + Math.cos(a) * r * 1.7), Math.round(cy + Math.sin(a) * r * 1.7), 1, 1).data; ring.push([d[0], d[1], d[2]]); }
      ring.sort((a, b) => a[0] + a[1] + a[2] - b[0] - b[1] - b[2]); const m = ring[Math.floor(ring.length / 2)];
      x.fillStyle = `rgb(${m[0]},${m[1]},${m[2]})`; x.filter = `blur(${Math.round(r * 0.25)}px)`; x.beginPath(); x.ellipse(cx, cy, r * 1.3, r * 1.3, 0, 0, Math.PI * 2); x.fill(); x.filter = 'none'; // soft edge, no visible patch
      const [ax, ay] = e.dir, [dx, dy] = e.down;
      x.strokeStyle = line; x.lineWidth = r * 0.24; x.lineCap = 'round'; x.beginPath();
      x.moveTo(cx - ax * r, cy - ay * r); x.quadraticCurveTo(cx + dx * r * 0.7, cy + dy * r * 0.7, cx + ax * r, cy + ay * r); x.stroke();
    }
    const t = new T.Texture(c); t.flipY = false; t.anisotropy = 4; t.needsUpdate = true; return (model.shut = t);
  }
  // shut or open the eyes on an instance: asleep, or a quick blink every few seconds
  function eyes(inst, asleep, t) {
    if (!inst.mesh || !inst.shut) return;
    if (t > (inst.blinkAt || 0) + 0.15) inst.blinkAt = (inst.blinkAt || t) + 2.5 + Math.random() * 3.5;
    const shut = asleep || (t > inst.blinkAt && t < inst.blinkAt + 0.15), u = inst.mesh.material.uniforms.tMap;
    const want = shut ? inst.shut : inst.open; if (u.value !== want) u.value = want;
  }
  // Collision shape measured from the model itself: for each listed bone a capsule from the joint to the next
  // joint (or, at a tip like the head, to the middle of the skin that bone moves), as fat as the skin it carries
  // (the 80th percentile of distances, so ears and whiskers don't bloat it). Kept in the bone's own space, so it
  // follows every pose. defs: [bone, next bone or null].
  function colliders(model, defs) {
    const key = defs.map(d => d.join('>')).join('|'); model.cols = model.cols || {}; if (model.cols[key]) return model.cols[key];
    const { json, geo, skin, ibm } = model, names = skin.joints.map(i => json.nodes[i].name), I = n => names.indexOf(n);
    const M = names.map((n, k) => new T.Matrix4().fromArray(ibm, k * 16)), pos = geo.attributes.position, si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
    const own = names.map(() => []), v = new T.Vector3();
    for (let i = 0; i < pos.count; i++) { let b = 0, w = -1; for (let c = 0; c < 4; c++) { const ww = sw.array[i * 4 + c]; if (ww > w) { w = ww; b = si.array[i * 4 + c]; } } own[b].push(i); }
    const out = [];
    for (const [n, m, fall] of defs) {
      const j = I(n); if (j < 0) continue;
      const pts = own[j].map(i => v.fromBufferAttribute(pos, i).clone().applyMatrix4(M[j]));
      if (pts.length < 6) { if (fall) out.push({ bone: n, a: new T.Vector3(), b: new T.Vector3(), r: fall, world: true }); continue; } // too little skin to measure (small hands): a ball of the given size
      let a = new T.Vector3(), b;
      if (m && I(m) >= 0) b = new T.Vector3().applyMatrix4(new T.Matrix4().copy(M[I(m)]).invert()).applyMatrix4(M[j]);
      else { b = new T.Vector3(); pts.forEach(p => b.add(p)); b.multiplyScalar(1 / pts.length); a = b.clone(); } // a tip (head, hand, foot) is a ball round its own middle
      const ab = b.clone().sub(a), L2 = ab.lengthSq() || 1e-9;
      const d = pts.map(p => { const t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / L2)); return p.distanceTo(a.clone().addScaledVector(ab, t)); }).sort((x, y) => x - y);
      out.push({ bone: n, a, b, r: d[Math.floor(d.length * 0.8)] });
    }
    return (model.cols[key] = out);
  }
  // every bone to its first child (a tip on its own), for a model with no hand-made list
  function autoDefs(model) {
    const { json, skin } = model, J = new Set(skin.joints);
    return skin.joints.map(i => { const n = json.nodes[i], c = (n.children || []).find(k => J.has(k)); return [n.name, c != null ? json.nodes[c].name : null]; });
  }
  // A tail has weight (any rig: the fox's, a cat's, a dog's). It never goes into anything under it (the floor, a bed,
  // a seat, a table top), and when resting (lying, sitting, asleep) it lies along that surface instead of sticking up
  // in the air. Each bone, root to tip, is tipped just enough that its underside (thinned a little: fur is soft)
  // rests on what's below; where it rests is worked out a few times a second and eased to every beat.
  const TQ = new T.Quaternion(), TE = new T.Euler();
  function tailRest(inst, names, rest, dt, soft = 0.55) {
    const P = IH.phys; if (!P || !inst.cols || !inst.B[names[0]] || IH.noTail) return;
    const off = inst.tailOff || (inst.tailOff = {}), aim = inst.tailAim || (inst.tailAim = {});
    const ground = (x, y, z) => { const g = P.support(x, y + 0.3, z); return g > -100 ? g : P.floorAt(x, z); };
    inst.tailAcc = (inst.tailAcc || 0) + dt; const look = inst.tailAcc >= 0.12; if (look) inst.tailAcc = 0;
    names.forEach((n, i) => {
      const b = inst.B[n], col = inst.cols.filter(c => names.indexOf(c.bone) >= i); if (!b || !col.length) return; // (this bone and those past it)
      const q0 = b.quaternion.clone();
      const gap = (ax, az) => { b.quaternion.copy(q0).multiply(TQ.setFromEuler(TE.set(ax, 0, az))); b.updateMatrixWorld(true); let e = 1e9, hi = -1e9; for (const k of capsules(inst, col)) for (const p of [k.a, k.b]) { const d = p.y - k.r * soft - ground(p.x, p.y, p.z) + 0.03; e = Math.min(e, d); hi = Math.max(hi, d); } return [e, hi]; };
      const cost = ([e, hi], ax, az) => (e < 0 ? -e * 6 : 0) + (rest ? Math.max(0, e) + hi * 0.5 : 0) + (Math.abs(ax) + Math.abs(az)) * 0.05; // into it: very bad; resting: lying along it
      const was = off[n] || [0, 0], e0 = gap(0, 0);
      let best = aim[n] || [0, 0];
      if (!rest && e0[0] >= 0) best = [0, 0]; // free and clear: it moves as it likes
      else if (look || e0[0] < -0.05) { // a coarse look round, then a finer one about the best
        best = [0, 0]; let bc = cost(e0, 0, 0);
        const tryAt = (ax, az) => { const c = cost(gap(ax, az), ax, az); if (c < bc - 1e-6) { bc = c; best = [ax, az]; } };
        for (let ax = -1.4; ax <= 1.401; ax += 0.35) for (let az = -1.4; az <= 1.401; az += 0.35) tryAt(ax, az);
        const [bx, bz] = best; for (const dx of [-0.15, 0, 0.15]) for (const dz of [-0.15, 0, 0.15]) if (dx || dz) tryAt(bx + dx, bz + dz);
      }
      aim[n] = best;
      const k = Math.min(1, dt * 8), o = off[n] = [was[0] + (best[0] - was[0]) * k, was[1] + (best[1] - was[1]) * k];
      b.quaternion.copy(q0).multiply(TQ.setFromEuler(TE.set(o[0], 0, o[1]))); b.updateMatrixWorld(true);
    });
  }
  // the capsules in the space of `into` (an Object3D), for this frame's pose
  function capsules(inst, cols, into) {
    const S = new T.Vector3(), out = [];
    for (const c of cols) { const b = inst.B[c.bone]; if (!b) continue; b.getWorldScale(S); const A = b.localToWorld(c.a.clone()), B = b.localToWorld(c.b.clone()); if (into) { into.worldToLocal(A); into.worldToLocal(B); } out.push({ bone: c.bone, a: A, b: B, r: c.world ? c.r : c.r * S.x }); }
    return out;
  }
  // Looking at something: the neck and head turn (the neck a third, the head the rest) so the face points at a
  // world point, after the pose is set, so it works over any move. The face's own forward direction is measured
  // once from the rest pose (the model faces +Z). It eases onto a new focus and fades out when there's none.
  const QA = new T.Quaternion(), QB = new T.Quaternion(), QC = new T.Quaternion(), QI = new T.Quaternion(), VF = new T.Vector3(), VH = new T.Vector3(), VD = new T.Vector3();
  function faceOf(inst, head) {
    if (inst.faceLocal && inst.upLocal) return inst.faceLocal;
    const saved = Object.entries(inst.B).map(([, b]) => [b, b.quaternion.clone()]), bp = inst.body.position.clone(), br = inst.body.rotation.clone();
    for (const [b] of saved) if (b.userData.rest) b.quaternion.copy(b.userData.rest);
    inst.body.position.set(0, 0, 0); inst.body.rotation.set(0, 0, 0); inst.group.updateMatrixWorld(true);
    const qh = head.getWorldQuaternion(new T.Quaternion()), qg = inst.group.getWorldQuaternion(new T.Quaternion());
    qh.invert(); inst.faceLocal = new T.Vector3(0, 0, 1).applyQuaternion(qg).applyQuaternion(qh).normalize(); inst.upLocal = new T.Vector3(0, 1, 0).applyQuaternion(qg).applyQuaternion(qh).normalize();
    for (const [b, q] of saved) b.quaternion.copy(q); inst.body.position.copy(bp); inst.body.rotation.copy(br); inst.group.updateMatrixWorld(true);
    return inst.faceLocal;
  }
  function look(inst, at, dt, max = 1.1) {
    const head = inst.B && inst.B.head; if (!head) return;
    const L = inst.lk || (inst.lk = { p: null, w: 0 }), k = Math.min(1, dt * 6);
    if (at) { if (!L.p || !isFinite(L.p.x)) L.p = at.clone(); else L.p.lerp(at, k); }
    L.w += ((at ? 1 : 0) - L.w) * Math.min(1, dt * 4); if (!L.p || L.w < 0.01) return;
    const f = faceOf(inst, head), parts = inst.B.neck ? [[inst.B.neck, 0.35], [head, 1]] : [[head, 1]];
    for (const [b, share] of parts) {
      inst.group.updateMatrixWorld(true);
      head.getWorldQuaternion(QA); head.getWorldPosition(VH);
      VF.copy(f).applyQuaternion(QA); VD.copy(L.p).sub(VH); if (VD.lengthSq() < 1e-6) return; VD.normalize();
      // a natural range: no more than about 30 degrees down or 25 up (a thing at its feet: the eyes do the rest)
      const el = Math.max(-0.5, Math.min(0.42, Math.asin(Math.max(-1, Math.min(1, VD.y))))), hz = Math.hypot(VD.x, VD.z) || 1; VD.set(VD.x / hz * Math.cos(el), Math.sin(el), VD.z / hz * Math.cos(el));
      QB.setFromUnitVectors(VF, VD);
      const ang = 2 * Math.acos(Math.min(1, Math.abs(QB.w))), amt = Math.min(1, ang > 1e-4 ? (max * share) / ang : 1) * share * L.w;
      QB.copy(QI.identity().slerp(QB, amt));
      b.getWorldQuaternion(QA); QA.premultiply(QB); b.parent.getWorldQuaternion(QC).invert(); b.quaternion.copy(QC.multiply(QA));
    }
  }
  IH.rig3d = { loadGLB, instance, springBones, closedEyes, eyes, colliders, capsules, look, autoDefs, faceOf, tailRest };
})();
