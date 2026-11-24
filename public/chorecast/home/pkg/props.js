/* Package: the classic island's own things and animals, as 3D models made with Morphic (the same pipeline as the
   kids, pets and farm animals: an anime turnaround sheet drawn with Morphic, a 3D model from it (Hyper3D Rodin), then
   reduced in headless Blender to one mesh and a small colour texture: home/props/<kind>.glb). Drawn with the anime
   shader. Three ways in:
     · things (a tent, a swing, a kite…): solid things the walk engine measures, sized to the classic model they
       stand in for, so a kid's island keeps its look and layout
     · land animals (a koala, a penguin…): bodies that walk, waddle, peck and settle down, like the hen
     · water animals (a turtle, a narwhal…): keep their classic swimming; only their model changes (skin())
   READY lists the kinds that have a model; the rest keep their classic model. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  const base = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/pkg\/[^/]*$/, '') : 'home/') + 'props/';
  // the kinds that have a model (props/list.json, written as each one's made), and the water animals the farm set
  // already has a model for (home/animals/)
  let READY = new Set();
  const ANIMAL = { seal: 'seal', swan: 'swan', dolphin: 'dolphin', goldfish: 'fish' };
  const ready = () => READY.size ? Promise.resolve(READY) : fetch(base + 'list.json').then(r => r.json()).then(l => (READY = new Set(l))).catch(() => READY);
  const has = t => READY.has(t) || !!ANIMAL[t];
  // the animals among them: those that walk on land, and those that keep to the water
  const LAND = ['kiwi', 'koala', 'penguin', 'redpanda', 'dragon', 'unicorn', 'hamster', 'guineapig', 'gecko', 'hedgehog', 'tortoise', 'parrot', 'takahe', 'quokka', 'echidna', 'wallaby', 'wombat', 'emu', 'kangaroo', 'hermitcrab', 'kakapo', 'lyrebird', 'phoenix', 'griffin', 'pegasus', 'sheepdog', 'starfish', 'ruru', 'kookaburra', 'budgie'];
  const WATER = ['seaturtle', 'narwhal', 'frog', 'seal', 'swan', 'dolphin', 'goldfish'];
  const BIG = ['unicorn', 'griffin', 'pegasus', 'kangaroo', 'emu', 'dragon'], SMALL = ['hamster', 'guineapig', 'gecko', 'hedgehog', 'starfish', 'hermitcrab', 'frog', 'kiwi', 'tortoise'];
  // Each animal's real size beside the kid, in tiles (the kid is 2 tiles, about 1.3 m, so a metre is about 1.5):
  // standing height, or length (len) for the flat and the swimming ones. Tiny ones are drawn a little bigger than
  // life so they can still be seen and tapped. (Until 2026-11-15 they were sized to the classic models, which were
  // toys as big as the kid.)
  const SIZE = {
    kiwi: 0.55, koala: 0.6, penguin: 0.8, redpanda: 0.65, dragon: 2.6, unicorn: 2.8, hamster: 0.16, guineapig: 0.22, gecko: { len: 0.3 }, hedgehog: 0.24,
    tortoise: 0.35, parrot: 0.6, takahe: 0.75, quokka: 0.7, echidna: 0.32, wallaby: 1.2, wombat: 0.6, emu: 2.6, kangaroo: 2.3, hermitcrab: { len: 0.2 },
    kakapo: 0.65, lyrebird: 1.1, phoenix: 1.5, griffin: 2.6, pegasus: 2.8, sheepdog: 0.9, starfish: { len: 0.4 }, ruru: 0.45, kookaburra: 0.6, budgie: 0.3,
    seaturtle: { len: 1.5 }, narwhal: { len: 3.0 }, frog: { len: 0.2 }, seal: { len: 2.4 }, swan: { len: 1.8 }, dolphin: { len: 3.0 }, goldfish: { len: 0.2 }
  };
  const models = {}, waits = {};
  // corrections to a model as it was made: the hopscotch was modelled standing up like a sign, so it's laid flat (face up)
  const FIX = { hopscotch: g => g.rotateX(-Math.PI / 2), starfish: g => g.rotateX(-Math.PI / 2) };
  function load(kind) {
    if (models[kind]) return Promise.resolve(models[kind]);
    return waits[kind] || (waits[kind] = IH.rig3d.loadGLB(ANIMAL[kind] ? base.replace(/props\/$/, 'animals/') + ANIMAL[kind] + '.glb' : base + kind + '.glb').then(m => { if (m && FIX[kind]) { m.geo = FIX[kind](m.geo.clone()); m.geo.computeBoundingBox(); } return (models[kind] = m); }).catch(e => { console.error('props', kind, e); delete waits[kind]; return null; }));
  }
  const MAT = {};
  // the model as a mesh standing on the ground, centred, scaled to fit a box { w, h, d }, to height h alone, or to
  // length len alone
  function mesh(kind, box) {
    const m = models[kind]; if (!m) return null;
    const mat = MAT[kind] || (MAT[kind] = IH.look.animeMat({ map: m.map, spec: 0, side: T.DoubleSide, tone: [0.6, 1.18] }));
    const o = new T.Mesh(m.geo, mat); o.castShadow = true; o.receiveShadow = true;
    m.geo.computeBoundingBox(); const bb = m.geo.boundingBox, sx = bb.max.x - bb.min.x, sy = bb.max.y - bb.min.y, sz = bb.max.z - bb.min.z;
    const s = box.len ? box.len / Math.max(sx, sz) : box.w ? Math.min(box.h / sy, Math.max(box.w, box.d) / Math.max(sx, sz)) : box.h / sy;
    o.scale.setScalar(s); o.position.set(-(bb.min.x + bb.max.x) / 2 * s, -bb.min.y * s, -(bb.min.z + bb.max.z) / 2 * s);
    return o;
  }
  // a land animal: a body like the hen's (waddles, pecks, settles down), its real size (h: the size to use for one
  // that isn't in SIZE)
  function body(kind, h) {
    const cls = BIG.includes(kind) ? 'big' : SMALL.includes(kind) ? 'tiny' : 'pet';
    return {
      cls, kind, speed: cls === 'big' ? 0.9 : cls === 'pet' ? 0.75 : 0.5, turnR: cls === 'big' ? 0.5 : 0.25, idle: ['graze', 'stand', 'stand', 'sleep'],
      make: () => { const g = new T.Group(), b = new T.Group(); g.add(b); const z = SIZE[kind], o = mesh(kind, z == null ? { h } : typeof z === 'number' ? { h: z } : z); if (o) b.add(o); const a = { group: g, body: b, kind, d3: 'mesh', legs: [] }; return { group: g, animal: a }; },
      pose: (inst, st, t) => IH.animals3d.move(inst.animal, t, st.split('.')[0] === 'sit' ? 'stand' : st, 0)
    };
  }
  IH.pkg.define('props', {
    kind: 'family', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'animals3d', 'phys'],
    ready, has, land: t => LAND.includes(t), water: t => WATER.includes(t), loaded: t => !!models[t],
    load: kinds => Promise.all(kinds.filter(has).map(load)),
    // a thing, fitted to a box { w, h, d } (world units): { group, def, use: null }
    thing(t, box) { const o = mesh(t, box); if (!o) return null; const g = new T.Group(); g.add(o); return { group: g, def: { t, fp: [box.w, box.d] }, use: null }; },
    body,
    // a water animal's classic group gets the model in place of its classic parts, at its real size (its swimming
    // carries on)
    skin(group, kind) {
      group.updateMatrixWorld(true); const bb = new T.Box3().setFromObject(group), sc = new T.Vector3(); group.getWorldScale(sc);
      const z = SIZE[kind], h = (bb.max.y - bb.min.y) / sc.y, w = (bb.max.x - bb.min.x) / sc.x, d = (bb.max.z - bb.min.z) / sc.z;
      const o = mesh(kind, z && z.len ? { len: z.len / sc.x } : { w, h, d }); if (!o) return false; // (its real length, in the group's own units)
      for (const c of [...group.children]) c.visible = false;
      group.add(o); return true;
    }
  });
})();
