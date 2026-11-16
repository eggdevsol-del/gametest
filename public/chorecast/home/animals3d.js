/* Chorecast homes (a prototype): the islands' animals as 3D models, made the way the kids and pets are: a turnaround
   drawn with Morphic in the app's anime style (2×2 views), a 3D model from the four views (Hyper3D Rodin), then
   prepared in headless Blender. The four-legged farm animals (goat, cow, Highland cow, merino, kunekune, alpaca,
   llama, donkey, horse, pony) are rigged on the pets' four-legged skeleton and posed by yami3d.js (walk, stand, eat,
   sit, sleep); the birds and the sea and bush creatures are single meshes, moved whole (a bob and a waddle walking,
   a peck or a nod standing). All drawn with the anime shader. home/animals/<kind>.glb.
   IH.animals3d.make(kind) gives { group, kind, d3, inst? } at once; the model fills in when it has loaded. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.look) return;
  const base = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^/]*$/, '') : 'home/');
  // standing height in tiles (rigged), or height / length for the rest
  const RIGGED = { goat: 1.5, cow: 2.4, highland: 2.3, merino: 1.5, kunekune: 1.1, alpaca: 2.5, llama: 2.9, donkey: 2.1, horse: 2.8, pony: 1.9 };
  const STATIC = { hen: { h: 0.8 }, rooster: { h: 1.0 }, duck: { h: 0.75 }, goose: { h: 1.15 }, turkey: { h: 1.05 }, crab: { h: 0.4 }, gull: { h: 0.75 }, seal: { len: 2.0 }, dolphin: { len: 2.8 }, fish: { len: 0.45 },
    swan: { h: 1.3 }, platypus: { len: 0.9 }, tui: { h: 0.6 }, fantail: { h: 0.5 }, kereru: { h: 0.75 }, tuatara: { len: 1.0 }, weka: { h: 0.75 }, bee: { h: 0.32 } };
  for (const [k, h] of Object.entries(RIGGED)) if (IH.yami3d && IH.yami3d.add) IH.yami3d.add(k, 'animals/' + k + '.glb', h);
  const models = {}, waits = {};
  function want(kind, then) {
    if (models[kind]) return then(models[kind]); (waits[kind] = waits[kind] || []).push(then); if (waits[kind].length > 1) return;
    IH.rig3d.loadGLB(base + 'animals/' + kind + '.glb').then(m => { models[kind] = m; waits[kind].splice(0).forEach(f => f(m)); }).catch(e => console.error('animals3d', kind, e));
  }
  const MAT = {};
  function make(kind) {
    if (RIGGED[kind] && IH.yami3d) { const inst = IH.yami3d.make(kind); return { group: inst.group, kind, d3: 'rig', inst, legs: [] }; }
    const g = new T.Group(), body = new T.Group(); g.add(body); const a = { group: g, body, kind, d3: 'mesh', legs: [] };
    want(kind, m => {
      const mat = MAT[kind] || (MAT[kind] = IH.look.animeMat({ map: m.map, spec: 0, side: T.DoubleSide, tone: [0.6, 1.18] }));
      const mesh = new T.Mesh(m.geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
      const bb = m.geo.boundingBox, S = STATIC[kind] || { h: 1 }, sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
      const s = S.len ? S.len / Math.max(sx, sz) : S.h / sy; mesh.scale.setScalar(s); mesh.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
      body.add(mesh);
    });
    return a;
  }
  // a school of little fish (one model, several of them)
  function school(n = 6) { const g = new T.Group(); for (let i = 0; i < n; i++) { const f = make('fish'); f.group.position.set((i % 3 - 1) * 0.6 + (i > 2 ? 0.3 : 0), 0, Math.floor(i / 3) * 0.6 - 0.3); f.group.rotation.y = (i % 2 ? 0.2 : -0.15); g.add(f.group); } return { group: g, kind: 'fish', legs: [] }; }
  // How a 3D animal moves this frame. st: walk | stand | graze | sleep | sleep.curl; dist: ground covered (the rigged
  // ones' strides are timed by it, each paw planted where it lands, so nothing slides); focus: what it watches.
  // Rigged: the pets' poses (asleep, the chin rests flat on the ground, or the head laid on its side curled up),
  // grazing standing with the neck bent down. Whole meshes: a waddle rocking on the feet (never off the ground), a
  // peck, and asleep lying forward with the chin (or beak) down on the ground.
  const BOX = new T.Box3();
  function move(a, t, st, dist = 0, focus = null) {
    if (st === true) st = 'walk'; else if (st === false) st = 'stand'; // (older callers)
    if (a.d3 === 'rig') {
      const I = a.inst; I.walkD = (I.walkD || 0) + (dist || 0); I.focus = focus;
      try { IH.yami3d.pose(I, st === 'graze' ? 'stand' : st, t); } catch (e) { return; } if (!I.B || !I.B.neck) return;
      I.graze = (I.graze || 0) + ((st === 'graze' ? 1 : 0) - (I.graze || 0)) * 0.08; if (I.graze > 0.01) { I.B.neck.rotateX(1.05 * I.graze); I.B.head.rotateX((0.55 + Math.sin(t * 3) * 0.06) * I.graze); }
      return;
    }
    if (!a.body) return; const b = a.body, bird = /^(hen|rooster|duck|goose|turkey|gull|weka|tui|fantail|kereru)$/.test(a.kind);
    a.lie = (a.lie || 0) + ((/^sleep/.test(st) ? 1 : 0) - (a.lie || 0)) * 0.06;
    if (st === 'walk') { b.rotation.z = Math.sin(t * 9) * (bird ? 0.12 : 0.04); b.rotation.x = 0.04; b.rotation.y = Math.sin(t * 4.5) * 0.05; }
    else { b.rotation.z *= 0.8; b.rotation.y *= 0.8; b.rotation.x = st === 'graze' ? (bird ? 0.35 + Math.max(0, Math.sin(t * 7)) * 0.25 : 0.12) : Math.sin(t * 1.3) * 0.03; }
    if (a.lie > 0.01) { b.rotation.x = b.rotation.x * (1 - a.lie) + (bird ? 0.42 : 0.2) * a.lie; b.rotation.z *= 1 - a.lie; }
    // whatever the tilt, its lowest point rests on the ground: the feet walking, the chin and belly asleep
    b.position.y = 0; const m = b.children[0]; if (m) { a.group.updateMatrixWorld(true); BOX.setFromObject(b); b.position.y = a.group.position.y - BOX.min.y; }
  }
  IH.animals3d = { make, school, move, has: kind => !!(RIGGED[kind] || STATIC[kind]), RIGGED, STATIC };
  // the islands' own makers use these from now on (their Kit-built stand-ins stay for anything without a model)
  const IB = IH.islandsBuild; if (IB && IB.MAKE) for (const k of Object.keys(Object.assign({}, RIGGED, STATIC))) IB.MAKE[k] = () => make(k);
  if (IB && IB.MAKE) IB.MAKE.fish = () => school();
})();
