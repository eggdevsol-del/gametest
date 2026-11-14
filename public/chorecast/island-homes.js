/* Chorecast island, part three: the homes game's models on the classic floating islands.
   The homes game (home/*.js, window.IsoHome) has animated animals, pets and characters, and detailed things for the
   garden. Here each of them stands in for the classic island's own model of the same thing: the same shop item (so
   everything a kid has already bought turns into the new model), drawn at the classic model's own height with the
   island's toon shading and ink, and animated (walking while the island moves it about, standing, grazing, asleep).
   The kid's character is their homes character: the classic one is still there underneath, unseen, so every island
   activity works as before, and the homes character plays the move that goes with what it's doing (sweeping, feeding
   the hens, watering, reading, napping...) and holds the same things in its own hand.
   Until the homes game's files have loaded (HomesGame.load in index.html), the classic models show. index.html calls
   window.ChorecastIslandHomes(kit) once, after island.js, with its own drawing helpers. */
window.ChorecastIslandHomes = K => {
  const { T, mat, GRAD, ITEM } = K;
  const IH = () => window.IsoHome || {};
  const ready = () => !!(IH().items && IH().animals3d && IH().chars);
  // classic shop item → the homes model that replaces it
  const ANIMAL = { duck: 'duck', tui: 'tui', kereru: 'kereru', weka: 'weka', tuatara: 'tuatara', crab: 'crab', seal: 'seal', swan: 'swan', platypus: 'platypus', dolphin: 'dolphin', piwakawaka: 'fantail',
    hen: 'hen', goat: 'goat', cow: 'cow', alpaca: 'alpaca', pony: 'pony', rooster: 'rooster', merino: 'merino', sheep: 'merino', kunekune: 'kunekune', pig: 'kunekune', turkey: 'turkey', donkey: 'donkey',
    llama: 'llama', horse: 'horse', goose: 'goose', highland: 'highland', goldfish: 'fish' };
  const PET = { puppy: 'dog', sheepdog: 'dog', bunny: 'bunny', kitten: 'cat' };
  const THING = { bench: 'bench', birdbath: 'birdbath', letterbox: 'letterbox', lamp: 'lamppost', sandpit: 'sandpit', trampoline: 'trampoline', mower: 'mower', paddling: 'pool', telescope: 'telescope', kennel: 'kennel', appletree: 'fruittree', lemontree: 'lemontree' };
  // new shop items that only exist as homes models: their height on the island
  const NEW_H = { goose: 0.16, highland: 0.24 };

  // ---------- drawing a homes model the island's way
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const VC = () => mat(0xffffff, { vc: true, smooth: true });
  function islandLook(root) {
    root.traverse(m => {
      if (!m.isMesh || m.userData.cv || m.userData.ink) return; m.userData.cv = true;
      const old = m.material; if (!old || Array.isArray(old)) return;
      if (m.geometry && m.geometry.attributes.color && !m.isSkinnedMesh && !old.map) { // a kit model: its colours are per corner, as the screen shows them
        const c = m.geometry.attributes.color; if (!c.userData) c.userData = {}; if (!m.geometry.userData.lin) { m.geometry.userData.lin = true; for (let i = 0; i < c.array.length; i++) c.array[i] = lin(c.array[i]); c.needsUpdate = true; }
        if (!old.transparent) m.material = VC(); return;
      }
      // the homes game's own shader keeps its picture in tMap (a GLB animal, pet or character): the same picture, in toon
      const U = old.uniforms || {}, tex = old.map || (U.tMap && U.tMap.value && U.tMap.value.isTexture ? U.tMap.value : null);
      if (old.transparent && !tex) return; // (glass, glows: as they are)
      const col = old.color && !tex ? old.color.clone().convertSRGBToLinear() : new T.Color(0xffffff);
      if (tex) tex.encoding = T.sRGBEncoding;
      const tm = new T.MeshToonMaterial({ color: col, map: tex, gradientMap: GRAD, skinning: !!m.isSkinnedMesh, transparent: !!old.transparent, alphaTest: old.alphaTest || 0, side: old.side });
      m.material = tm; if (m.isSkinnedMesh) m.userData.noInk = true; // (an ink shell can't bend with the bones)
      m.castShadow = true; m.receiveShadow = true;
    });
  }
  const BOX = new T.Box3(), V = new T.Vector3();
  const heightOf = o => { o.updateMatrixWorld(true); BOX.setFromObject(o); return BOX.isEmpty() ? 0 : BOX.max.y - BOX.min.y; };
  // the classic model's height, so the new one stands just as tall on the island
  const CH = {};
  const classicH = (t, orig) => { if (CH[t] != null) return CH[t]; if (NEW_H[t]) return (CH[t] = NEW_H[t]); const g = new T.Group(); try { orig(g); } catch (e) { /* */ } return (CH[t] = heightOf(g) || 0.2); };
  // fit: once the model has its shape (a loaded file can take a moment), scale it to h and stand it on the ground
  function fit(holder, model, h) { const mh = heightOf(model); if (!mh) return false; const s = h / mh; holder.scale.setScalar(s); model.updateMatrixWorld(true); BOX.setFromObject(model); holder.position.y = -BOX.min.y * s; islandLook(model); return true; }

  // ---------- an animal (or pet) that the island walks about
  function animalBuilder(t, orig) {
    return g => {
      if (!ready() || (ANIMAL[t] && !IH().animals3d.has(ANIMAL[t]))) return orig(g);
      let a, petI = null;
      if (PET[t] && IH().pets) { petI = IH().pets.make(PET[t]); a = { group: petI.group }; } else a = IH().animals3d.make(ANIMAL[t]);
      const holder = new T.Group(), h = classicH(t, orig); holder.add(a.group); g.add(holder);
      let fitted = fit(holder, a.group, h), last = null, still = 0;
      const own = g.userData.tick;
      g.userData.tick = (time, dt) => {
        if (own) own(time, dt);
        if (!fitted) fitted = fit(holder, a.group, h); else islandLook(a.group);
        g.getWorldPosition(V); const d = last ? Math.hypot(V.x - last.x, V.z - last.z) : 0; last = last || new T.Vector3(); last.copy(V);
        const moving = d > 0.0004; still = moving ? 0 : still + (dt || 0);
        const st = moving ? 'walk' : still > 9 && /hen|goose|duck|cow|goat|merino|alpaca|llama|horse|pony|donkey|kunekune|highland|turkey/.test(ANIMAL[t] || '') ? 'graze' : 'stand';
        const dist = d / Math.max(1e-6, holder.scale.x * g.scale.x);
        try { if (petI) IH().pets.pose(petI, moving ? 'walk' : 'stand', time); else IH().animals3d.move(a, time, st, dist); } catch (e) { /* model still loading */ }
      };
    };
  }
  // ---------- a thing for the garden or farm
  function thingBuilder(t, orig) {
    return g => {
      const D = ready() && IH().items.BY[THING[t]]; if (!D) return orig(g);
      let made; try { made = IH().items.make(D, {}); } catch (e) { return orig(g); }
      const holder = new T.Group(); holder.add(made.group); g.add(holder); if (!fit(holder, made.group, classicH(t, orig))) return orig(g);
    };
  }
  // a homes model that can't be made (a file missing, a name not known) falls back to the island's own, never breaking the island
  const safe = (f, orig) => g => { try { f(g); } catch (e) { while (g.children.length) g.remove(g.children[0]); delete g.userData.tick; orig(g); } };
  const ORIG = {};
  for (const t of [...Object.keys(ANIMAL), ...Object.keys(PET)]) { ORIG[t] = ITEM[t] || null; const fb = ITEM[t] || (g => { const m = new T.Mesh(new T.SphereGeometry(0.06, 12, 8), mat(0xf2e6cf, { smooth: true })); m.position.y = 0.06; g.add(m); }); ITEM[t] = safe(animalBuilder(t, fb), fb); }
  for (const t of Object.keys(THING)) if (ITEM[t]) { ORIG[t] = ITEM[t]; ITEM[t] = safe(thingBuilder(t, ITEM[t]), ITEM[t]); }

  // ---------- the kid: their homes character over the classic one
  const POSE = { stroll: 'walk', rest: 'sit', wave: 'happy', dance: 'happy', nap: 'sleep', stretch: 'happy', butterfly: 'look', stars: 'gaze', water: 'water', read: 'read', kickabout: 'play', skip: 'bounce',
    bubbles: 'play', sweep: 'sweep', hoop: 'play', sunbathe: 'liebed', sandcastle: 'toys', swim: 'splash', coconuts: 'look', shells: 'look', paddle: 'splash', beachfire: 'sit', surfcast: 'gaze', dangle: 'sit',
    skipstones: 'play', peer: 'look', jettysun: 'sit', waterbeds: 'water', dig: 'feed', carrot: 'feed', sunflower: 'water', scarecrow: 'look', chooks: 'feed', bucket: 'feed', pitchfork: 'sweep', fence: 'chop',
    jumpfoot: 'bounce', rail: 'sit', geyserwatch: 'watch', snap: 'scan', picnic: 'snack', pick: 'feed', shade: 'sit', hives: 'look', rake: 'sweep', birdwatch: 'gaze', hugtree: 'happy', sticks: 'place',
    bugs: 'look', toadstools: 'look', cloudbounce: 'bounce', float: 'sit', rainbowwave: 'happy', lake: 'gaze', beach: 'bounce', plot: 'water', stable: 'pat', orchard: 'feed', grove: 'look', sky: 'bounce', farm: 'feed', lookout: 'gaze' };
  const KIDS = new Set();
  function dress(m, hue, avatar) {
    if (!ready() || !m.userData.P) return m;
    let c; try { c = IH().chars.make(avatar, hue); } catch (e) { return m; }
    const holder = new T.Group(); holder.add(c.group); m.add(holder);
    const P = m.userData.P, h = heightOf(m) || 0.27;
    // the classic character stays, unseen, for the island's activities to move; the homes one is what shows
    for (const ch of m.children) if (ch !== holder) ch.traverse(o => { if (o.isMesh) o.visible = false; });
    const K0 = { m, c, holder, h, P, fitted: false, last: null, hands: false };
    K0.fitted = fit(holder, c.group, h); KIDS.add(K0); m.userData.homesKid = K0; m.userData.dispose = () => KIDS.delete(K0);
    return m;
  }
  // things the island puts in the kid's paw go in the homes character's hand (its bone), still the island's size
  function hands(K0) {
    const B = K0.c.B; if (!B) return false;
    const hb = B['hand.R'] || null, hl = B['hand.L'] || null; if (!hb) return false;
    for (const [pivot, bone] of [[K0.P.hand, hb], [K0.P.handL, hl]]) {
      if (!pivot || !bone) continue; bone.add(pivot); pivot.position.set(0, 0, 0); K0.m.updateMatrixWorld(true);
      const ws = new T.Vector3(), ms = new T.Vector3(); bone.getWorldScale(ws); K0.m.getWorldScale(ms); pivot.scale.setScalar(ms.x / (ws.x || 1));
    }
    return true;
  }
  let raf = 0, t0 = performance.now(), prev = t0;
  function loop(now) {
    raf = requestAnimationFrame(loop); const t = (now - t0) / 1000, dt = Math.min(0.1, (now - prev) / 1000); prev = now;
    for (const K0 of KIDS) {
      const m = K0.m; if (!m.parent && performance.now() - (K0.born || (K0.born = performance.now())) > 4000) { KIDS.delete(K0); continue; }
      if (!K0.fitted) K0.fitted = fit(K0.holder, K0.c.group, K0.h); else islandLook(K0.c.group);
      if (!K0.hands && K0.fitted) K0.hands = hands(K0);
      for (const ch of m.children) if (ch !== K0.holder) ch.traverse(o => { if (o.isMesh && o.visible && !(K0.P.hand && isIn(o, K0.P.hand)) && !(K0.P.handL && isIn(o, K0.P.handL))) o.visible = false; });
      m.getWorldPosition(V); const d = K0.last ? Math.hypot(V.x - K0.last.x, V.z - K0.last.z) : 0; K0.last = K0.last || new T.Vector3(); K0.last.copy(V);
      const doing = m.userData.doing, st = d > 0.0005 ? 'walk' : (doing && POSE[doing]) || 'stand';
      try { IH().chars.pose(K0.c, st, t); } catch (e) { /* loading */ }
    }
  }
  const isIn = (o, p) => { for (let q = o; q; q = q.parent) if (q === p) return true; return false; };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  start();
  return { ready, dress, ANIMAL, PET, THING, NEW_H, islandLook, active: () => KIDS.size };
};
