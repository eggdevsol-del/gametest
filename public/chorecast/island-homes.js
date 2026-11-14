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
  // (a rigged model is only sized once its file has loaded: before that it's a stand-in that would size it wrong; and
  // it's sized again if its shape changes a lot later)
  const PS = new T.Vector3();
  const localH = (model, holder) => { const wh = heightOf(model); if (!wh) return 0; holder.getWorldScale(PS); return wh / (PS.y || 1) * holder.scale.y; }; // (its height as the holder's parent sees it, at scale 1)
  function fit(holder, model, h, inst) { if (inst && !inst.B) return false; const mh = localH(model, holder) / (holder.scale.y || 1); if (!mh) return false; holder.userData.mh = mh; const s = h / mh; holder.scale.setScalar(s); holder.position.y = 0; (holder.parent || holder).updateMatrixWorld(true); BOX.setFromObject(model); const lo = BOX.min.clone(); if (holder.parent) holder.parent.worldToLocal(lo); holder.position.y = -lo.y; islandLook(model); return true; } // (standing on its parent's floor)

  // ---------- an animal (or pet) that the island walks about
  function animalBuilder(t, orig) {
    return g => {
      if (API.thumb || !ready() || (ANIMAL[t] && !IH().animals3d.has(ANIMAL[t]))) return orig(g);
      // (each island draws at most a dozen animated animals, set by index.html as it builds the island: the rest keep the
      // island's own lighter model, so a busy island, or a screen of them, stays smooth)
      if (API.budget != null) { if (API.budget <= 0) return orig(g); API.budget--; }
      let a, petI = null;
      if (PET[t] && IH().pets) { petI = IH().pets.make(PET[t]); a = { group: petI.group }; } else a = IH().animals3d.make(ANIMAL[t]);
      const holder = new T.Group(), h = classicH(t, orig); holder.add(a.group); g.add(holder); g.userData.homesAnimal = ANIMAL[t] || PET[t];
      const rig = a.inst || petI; let fitted = fit(holder, a.group, h, rig), last = null, still = 0, nfit = 0;
      const own = g.userData.tick;
      g.userData.tick = (time, dt) => {
        if (own) own(time, dt);
        if (!fitted) fitted = fit(holder, a.group, h, rig); else { islandLook(a.group); if (++nfit % 60 === 0) { const mh = localH(a.group, holder) / (holder.scale.y || 1); if (Math.abs(mh - holder.userData.mh) / holder.userData.mh > 0.25) fitted = fit(holder, a.group, h, rig); } }
        g.getWorldPosition(V); const d = last ? Math.hypot(V.x - last.x, V.z - last.z) : 0; last = last || new T.Vector3(); last.copy(V);
        const moving = d > 0.0004; still = moving ? 0 : still + (dt || 0);
        const want = g.userData.homesSt, st = want ? (want === 'walk' && !moving ? 'stand' : want) : moving ? 'walk' : still > 9 && /hen|goose|duck|cow|goat|merino|alpaca|llama|horse|pony|donkey|kunekune|highland|turkey/.test(ANIMAL[t] || '') ? 'graze' : 'stand';
        const dist = d / Math.max(1e-6, holder.scale.x * g.scale.x);
        const host = g.parent; IH().groundAt = host && host.userData.terrain ? groundFn(host) : null; // (paws planted on the island's slopes)
        try { if (petI) IH().pets.pose(petI, st === 'graze' ? 'stand' : st, time); else IH().animals3d.move(a, time, st, dist, g.userData.homesFocus || null); } catch (e) { /* model still loading */ }
        IH().groundAt = null;
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
    bugs: 'look', toadstools: 'look', cloudbounce: 'bounce', float: 'sit', rainbowwave: 'happy', lake: 'gaze',
    seat: 'sit', lie: 'liebed', bounce: 'bounce', swing: 'sit', slide: 'play', ball: 'play', hop: 'bounce', ride: 'sit', splash: 'splash', fire: 'sit', look: 'gaze', flower: 'water', climb: 'bounce', mail: 'look', wash: 'place', bees: 'look', kite: 'play', pet: 'pat', any: 'look', beach: 'bounce', plot: 'water', stable: 'pat', orchard: 'feed', grove: 'look', sky: 'bounce', farm: 'feed', lookout: 'gaze' };
  const KIDS = new Set(), LAWNS = new Set();
  function dress(m, hue, avatar) {
    if (!ready() || !m.userData.P) return m;
    let c; try { c = IH().chars.make(avatar, hue); } catch (e) { return m; }
    const P = m.userData.P, h = heightOf(m) || 0.27; // (the classic character's height, measured before the homes one is added)
    const holder = new T.Group(); holder.add(c.group); m.add(holder);
    // the classic character stays, unseen, for the island's activities to move; the homes one is what shows
    for (const ch of m.children) if (ch !== holder) ch.traverse(o => { if (o.isMesh) o.visible = false; });
    const K0 = { m, c, holder, h, P, fitted: false, last: null, hands: false };
    K0.fitted = fit(holder, c.group, h, c); KIDS.add(K0); m.userData.homesKid = K0; m.userData.dispose = () => KIDS.delete(K0);
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
    for (const L of LAWNS) { if (!L.parent) { LAWNS.delete(L); continue; } try { IH().lawnKit.tick(L, t, 1); } catch (e) { /* */ } }
    for (const K0 of KIDS) {
      const m = K0.m; if (!m.parent && performance.now() - (K0.born || (K0.born = performance.now())) > 4000) { KIDS.delete(K0); continue; }
      if (!K0.fitted) K0.fitted = fit(K0.holder, K0.c.group, K0.h, K0.c); else islandLook(K0.c.group);
      if (!K0.hands && K0.fitted) K0.hands = hands(K0);
      for (const ch of m.children) if (ch !== K0.holder) ch.traverse(o => { if (o.isMesh && o.visible && !(K0.P.hand && isIn(o, K0.P.hand)) && !(K0.P.handL && isIn(o, K0.P.handL))) o.visible = false; });
      m.getWorldPosition(V); const d = K0.last ? Math.hypot(V.x - K0.last.x, V.z - K0.last.z) : 0; K0.last = K0.last || new T.Vector3(); K0.last.copy(V);
      const doing = m.userData.doing, st = d > 0.0005 ? 'walk' : (doing && POSE[doing]) || 'stand';
      IH().groundAt = m.parent && m.parent.userData.terrain ? groundFn(m.parent) : null;
      try { IH().chars.pose(K0.c, st, t); } catch (e) { /* loading */ }
      IH().groundAt = null;
    }
  }
  const isIn = (o, p) => { for (let q = o; q; q = q.parent) if (q === p) return true; return false; };
  const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
  start();

  // ---------- the island's ground, for feet and paws: (x, z) in the world → the height of the island there
  const IV = new T.Vector3(), IM = new T.Matrix4();
  function groundFn(host) {
    const Tn = host.userData.terrain; IM.copy(host.matrixWorld).invert();
    return (x, z) => { IV.set(x, 0, z).applyMatrix4(IM); const ly = Tn.h(IV.x, IV.z); IV.y = ly; IV.applyMatrix4(host.matrixWorld); return IV.y; };
  }

  // ---------- finding the way round things: a walk grid over the island
  // Each island (its group's userData) gets a grid of 3.5 cm cells: free where the island says a character can walk
  // (play.walk: on the grass, off the house, out of the pond), or inside its zone, and clear of the things placed on it
  // and the trees. Rebuilt when something's added or taken away. Paths go cell to cell (diagonals too), then are
  // pulled straight wherever the way between two points is clear.
  const NC = 0.035;
  function radiusOf(o, host) { if (o.userData.navR != null) return o.userData.navR; o.updateMatrixWorld(true); BOX.setFromObject(o); const ws = new T.Vector3(); host.getWorldScale(ws); const sx = (BOX.max.x - BOX.min.x) / ws.x, sz = (BOX.max.z - BOX.min.z) / ws.z; return (o.userData.navR = BOX.isEmpty() ? 0 : Math.min(0.2, Math.max(sx, sz) * 0.42)); }
  function navFor(u, host) {
    const items = (u.items || []).filter(o => !o.userData.homesAnimal && !o.userData.brainless), sig = items.map(o => o.userData.itemId).join(',') + '|' + (u.trees || []).length;
    if (u.nav && u.nav.sig === sig) return u.nav;
    const Z = (u.zones && (u.zones.lawn || u.zones.farm || Object.values(u.zones)[0])) || { x: 0, z: 0, r: 1 }, walk = u.play && u.play.walk, Tn = u.terrain;
    const R = (Z.r || 1) * 1.15, x0 = (Z.x || 0) - R, z0 = (Z.z || 0) - R, N = Math.ceil(2 * R / NC), free = new Uint8Array(N * N);
    const obs = [...items.map(o => [o.position.x, o.position.z, radiusOf(o, host)]), ...(u.trees || []).map(o => [o.position.x, o.position.z, 0.05])].filter(o => o[2] > 0.005);
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = x0 + (i + 0.5) * NC, z = z0 + (j + 0.5) * NC;
      let ok = walk ? walk(x, z) : Math.hypot(x - (Z.x || 0), z - (Z.z || 0)) < (Z.r || 1) * 0.9;
      if (ok && Tn && Tn.sea != null && Tn.sea - Tn.h(x, z) > -0.004) ok = false;
      if (ok) for (const [ox, oz, r] of obs) if (Math.hypot(x - ox, z - oz) < r + 0.02) { ok = false; break; }
      free[j * N + i] = ok ? 1 : 0;
    }
    return (u.nav = { sig, x0, z0, N, free, Z });
  }
  const cellOf = (G, x, z) => [Math.floor((x - G.x0) / NC), Math.floor((z - G.z0) / NC)];
  const okCell = (G, i, j) => i >= 0 && j >= 0 && i < G.N && j < G.N && G.free[j * G.N + i] === 1;
  function nearestFree(G, i, j) { for (let r = 0; r < 8; r++) for (let a = -r; a <= r; a++) for (const [di, dj] of [[a, -r], [a, r], [-r, a], [r, a]]) if (okCell(G, i + di, j + dj)) return [i + di, j + dj]; return null; }
  function path(G, from, to) {
    let s = cellOf(G, from[0], from[1]), g = cellOf(G, to[0], to[1]);
    if (!okCell(G, ...s)) s = nearestFree(G, ...s); if (!okCell(G, ...g)) g = nearestFree(G, ...g); if (!s || !g) return null;
    const N = G.N, id = (i, j) => j * N + i, open = [[0, s[0], s[1]]], cost = new Map([[id(...s), 0]]), from_ = new Map(), goal = id(...g);
    const hh = (i, j) => { const dx = Math.abs(i - g[0]), dz = Math.abs(j - g[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    let n = 0;
    while (open.length && n++ < 9000) {
      let bi = 0; for (let k = 1; k < open.length; k++) if (open[k][0] < open[bi][0]) bi = k; const [, i, j] = open.splice(bi, 1)[0], c = id(i, j);
      if (c === goal) { const out = []; let q = c; while (q != null) { out.push([G.x0 + (q % N + 0.5) * NC, G.z0 + (Math.floor(q / N) + 0.5) * NC]); q = from_.get(q); } out.reverse(); out[out.length - 1] = [to[0], to[1]]; return smooth(G, out); }
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const a = i + di, b = j + dj; if (!okCell(G, a, b) && id(a, b) !== goal) continue; if (di && dj && (!okCell(G, i + di, j) || !okCell(G, i, j + dj))) continue; // (no cutting corners)
        const nc = cost.get(c) + (di && dj ? 1.414 : 1), k = id(a, b); if (cost.has(k) && cost.get(k) <= nc) continue;
        cost.set(k, nc); from_.set(k, c); open.push([nc + hh(a, b), a, b]);
      }
    }
    return null;
  }
  const clear = (G, a, b) => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / (NC * 0.5)); for (let k = 1; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n, [i, j] = cellOf(G, x, z); if (!okCell(G, i, j)) return false; } return true; };
  function smooth(G, P) { if (P.length < 3) return P; const out = [P[0]]; let k = 0; while (k < P.length - 1) { let far = k + 1; for (let q = P.length - 1; q > k + 1; q--) if (clear(G, P[k], P[q])) { far = q; break; } out.push(P[far]); k = far; } return out.slice(1); }
  // the next point to walk to on the way to (x, z), for anything the island moves (the kid in island.js's walkTo)
  function nav(m, u, x, z) {
    const host = m.parent; if (!host || !u || !u.terrain) return null;
    const G = navFor(u, host), key = Math.round(x * 200) + ',' + Math.round(z * 200), P = m.userData.np;
    if (!P || P.key !== key || P.sig !== G.sig) m.userData.np = { key, sig: G.sig, pts: path(G, [m.position.x, m.position.z], [x, z]) };
    const pts = m.userData.np.pts; if (!pts || !pts.length) return null;
    while (pts.length > 1 && Math.hypot(pts[0][0] - m.position.x, pts[0][1] - m.position.z) < 0.02) pts.shift();
    return pts[0];
  }

  // ---------- the homes animals' ways, on the island (in place of the island's own wandering)
  // Wander from place to place round whatever's in the way; graze (the grazers); asleep at night (chin down: the
  // homes sleep pose) and a nap now and then in the day; the curious ones come over to see the kid and watch them for
  // a bit; the shy ones get out of the way; and they keep a little apart from each other.
  const CURIOUS = /dog|goat|merino|alpaca|llama|pony|horse|kunekune|donkey|cow|highland|bunny|cat|turkey/, SHY = /tui|kereru|weka|fantail|duck|goose|hen|rooster|tuatara|crab/, GRAZER = /cow|goat|merino|alpaca|llama|horse|pony|donkey|highland|goose|kunekune|hen|rooster|turkey|duck/;
  const BIG = /cow|horse|pony|donkey|highland|llama|alpaca/;
  const rnd = (a, b) => a + Math.random() * (b - a);
  function kidOn(host) { for (const K0 of KIDS) if (K0.m.parent === host) return K0.m; return null; }
  function walkBrain(m, host, Z, o = {}) {
    const kind = m.userData.homesAnimal; if (!kind || !ready() || (o.mode && o.mode !== 'land')) return false; // (swimmers and floaters keep the island's own ways)
    const u = host.userData, Tn = u.terrain; if (!Tn) return false;
    const B = { mode: 'idle', until: performance.now() / 1000 + rnd(0.5, 3), pts: null, speed: (BIG.test(kind) ? 0.085 : 0.06) * rnd(0.9, 1.1), cool: 0 }; m.userData.brain = B;
    if (Tn) { m.position.y = Tn.h(m.position.x, m.position.z); m.rotation.order = 'YXZ'; }
    const own = m.userData.tick, G = () => navFor(u, host);
    const goTo = (x, z, sp = 1) => { const pts = path(G(), [m.position.x, m.position.z], [x, z]); if (!pts) return false; B.pts = pts; B.sp = sp; return true; };
    const wander = () => { const g0 = G(); for (let k = 0; k < 20; k++) { const a = Math.random() * 6.283, d = rnd(0.12, 0.5), x = m.position.x + Math.cos(a) * d, z = m.position.z + Math.sin(a) * d, [i, j] = cellOf(g0, x, z); if (okCell(g0, i, j) && (!o.farm || Math.hypot(x - Z.x, z - Z.z) < Z.r * 0.8)) { if (goTo(x, z)) { B.mode = 'walk'; return; } } } B.mode = 'idle'; B.until = performance.now() / 1000 + rnd(1, 3); };
    m.userData.tick = (t, dt) => {
      const now = performance.now() / 1000; dt = Math.min(dt || 0.016, 0.1);
      const kid = kidOn(host), dk = kid ? Math.hypot(kid.position.x - m.position.x, kid.position.z - m.position.z) : 9, night = !!u.night;
      m.userData.homesFocus = null;
      // night: everyone sleeps where they are; morning wakes them
      if (night && B.mode !== 'sleep') { B.mode = 'sleep'; B.pts = null; B.until = Infinity; }
      if (!night && B.mode === 'sleep' && B.until === Infinity) { B.mode = 'idle'; B.until = now + rnd(0.5, 2); }
      if (B.mode === 'sleep' && dk < 0.1 && B.until !== Infinity) { B.mode = 'idle'; B.until = now + 1; } // (the kid walking right up wakes a napper)
      if (!night && B.mode !== 'flee' && B.mode !== 'sleep' && SHY.test(kind) && dk < 0.2) { const ax = m.position.x - kid.position.x, az = m.position.z - kid.position.z, l = Math.hypot(ax, az) || 1; if (goTo(m.position.x + ax / l * 0.4, m.position.z + az / l * 0.4, 1.9) || goTo(m.position.x - az / l * 0.35, m.position.z + ax / l * 0.35, 1.9)) B.mode = 'flee'; }
      if (!night && CURIOUS.test(kind) && (B.mode === 'idle' || B.mode === 'graze') && dk < 0.6 && dk > 0.16 && now > B.cool) { const l = dk || 1; if (goTo(kid.position.x + (m.position.x - kid.position.x) / l * 0.13, kid.position.z + (m.position.z - kid.position.z) / l * 0.13, 1.1)) { B.mode = 'approach'; B.cool = now + rnd(25, 45); } }
      // following the path
      if (B.pts && B.pts.length && (B.mode === 'walk' || B.mode === 'flee' || B.mode === 'approach')) {
        const p = B.pts[0], dx = p[0] - m.position.x, dz = p[1] - m.position.z, d = Math.hypot(dx, dz), st = Math.min(d, B.speed * (B.sp || 1) * dt);
        if (d > 1e-5) { m.position.x += dx / d * st; m.position.z += dz / d * st; const want = Math.atan2(dx, dz), turn = Math.atan2(Math.sin(want - m.rotation.y), Math.cos(want - m.rotation.y)); m.rotation.y += turn * Math.min(1, dt * 6); }
        if (d < 0.015) B.pts.shift();
        if (!B.pts.length) { B.pts = null; if (B.mode === 'approach') { B.mode = 'watch'; B.until = now + rnd(3, 6); } else { B.mode = 'idle'; B.until = now + rnd(1.5, 5); } }
      } else if (B.mode === 'watch') { m.userData.homesFocus = kid ? kid.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, 0.15, 0)) : null; if (kid) { const want = Math.atan2(kid.position.x - m.position.x, kid.position.z - m.position.z); m.rotation.y += Math.atan2(Math.sin(want - m.rotation.y), Math.cos(want - m.rotation.y)) * Math.min(1, dt * 2); } if (now > B.until) wander(); }
      else if (now > B.until && B.mode !== 'sleep') {
        const r = Math.random();
        if (B.mode !== 'graze' && GRAZER.test(kind) && r < 0.4) { B.mode = 'graze'; B.until = now + rnd(4, 10); }
        else if (r < 0.03) { B.mode = 'sleep'; B.until = now + rnd(15, 30); } // (a nap, now and then)
        else wander();
      } else if (B.mode === 'sleep' && now > B.until) { B.mode = 'idle'; B.until = now + 1; }
      // a little room between animals: a nudge apart when two get close
      for (const o2 of u.items || []) { if (o2 === m || !o2.userData.brain) continue; const ax = m.position.x - o2.position.x, az = m.position.z - o2.position.z, l = Math.hypot(ax, az), need = BIG.test(kind) || BIG.test(o2.userData.homesAnimal) ? 0.1 : 0.06; if (l > 1e-4 && l < need) { const k = (need - l) * Math.min(1, dt * 4); const nx = m.position.x + ax / l * k, nz = m.position.z + az / l * k, [i, j] = cellOf(G(), nx, nz); if (okCell(G(), i, j)) { m.position.x = nx; m.position.z = nz; } } }
      // standing on the slope under it, leaning with it
      const x = m.position.x, z = m.position.z, f0 = Math.sin(m.rotation.y), f1 = Math.cos(m.rotation.y), e = 0.03, k = 1 - Math.exp(-dt * 8);
      m.position.y = Tn.h(x, z); const pitch = -Math.atan2(Tn.h(x + f0 * e, z + f1 * e) - Tn.h(x - f0 * e, z - f1 * e), 2 * e), roll = Math.atan2(Tn.h(x + f1 * e, z - f0 * e) - Tn.h(x - f1 * e, z + f0 * e), 2 * e);
      m.rotation.x += (pitch - m.rotation.x) * k; m.rotation.z += (roll - m.rotation.z) * k;
      m.userData.homesSt = B.mode === 'walk' || B.mode === 'flee' || B.mode === 'approach' ? 'walk' : B.mode === 'graze' ? 'graze' : B.mode === 'sleep' ? 'sleep' : B.mode === 'watch' ? 'look' : 'stand';
      if (own) own(t, dt);
    };
    return true;
  }

  // ---------- the homes game's grass on the island's lawn (the Studio's flat islands)
  // The lawn kit's own grass (blades where their shape shows, the layers or solid grass for the body of the lawn, the
  // same wind, colours and growth), in tiles of TS: its edge follows the island's round rim and the holes (the house,
  // the pond, the stream) pixel by pixel, and nothing grows up through what stands on it.
  const TS = 0.042; // (a tile of grass on the island: its blades come up about to a hen's knee when it's long)
  function lawn(g, u, o) {
    if (API.thumb || !ready() || !IH().lawnKit) return null;
    const R = o.R, N = Math.ceil(R / TS) + 1, cells = [], inside = (x, z) => Math.hypot(x, z) < R && !(o.excl && o.excl(x, z));
    for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) { const x = (i + 0.5) * TS, z = (j + 0.5) * TS; if (Math.hypot(x, z) < R + TS * 0.5 && [[0, 0], [-0.4, -0.4], [0.4, 0.4], [-0.4, 0.4], [0.4, -0.4]].some(([a, b]) => inside(x + a * TS, z + b * TS))) cells.push({ x: i, z: j }); }
    let L; try { L = IH().lawnKit.build({ cells, x0: -N, z0: -N, W: 2 * N, D: 2 * N, seed: o.seed || 7, phase: o.night ? 'night' : 'day', per: e => (e ? 8 : 2), ground: false }); } catch (e) { console.warn('island lawn', e); return null; }
    L.scale.setScalar(TS); L.position.set(0, o.top + 0.001, 0);
    L.traverse(q => { q.layers.enable(0); if (q.isMesh) q.userData.noInk = true; }); // (the homes game draws its lawn on layer 1; the island's camera sees layer 0)
    const M = L.userData.map; if (M) { const { data, x0, z0, mw, mh } = M; for (let pz = 0; pz < mh; pz++) for (let px = 0; px < mw; px++) { const x = (x0 + (px + 0.5) / 8) * TS, z = (z0 + (pz + 0.5) / 8) * TS; data[(pz * mw + px) * 4 + 2] = inside(x, z) ? 255 : 0; } M.tex.needsUpdate = true; }
    IH().lawnKit.grow(L, Math.max(0, Math.min(1.25, o.grow != null ? o.grow : 0.6))); L.userData.islandLawn = true;
    g.add(L); LAWNS.add(L); u.homesLawn = L; return L;
  }
  // nothing grows up through what stands on the lawn: the grass under each placed thing kept down
  function lawnUnder(u) {
    const L = u.homesLawn, M = L && L.userData.map; if (!M) return; const { data, x0, z0, mw, mh } = M;
    for (const o of u.items || []) { if (o.userData.homesAnimal) continue; const r = radiusOf(o, o.parent || L.parent) * 0.85; if (r < 0.01) continue;
      for (let pz = 0; pz < mh; pz++) for (let px = 0; px < mw; px++) { const x = (x0 + (px + 0.5) / 8) * TS, z = (z0 + (pz + 0.5) / 8) * TS; if (Math.hypot(x - o.position.x, z - o.position.z) < r) data[(pz * mw + px) * 4 + 1] = 0; } }
    M.tex.needsUpdate = true;
  }
  // ---------- the Cosy Studio as the island's house: the kid's own studio, walls up and a roof on, where the house stood
  // (the island keeps clear a patch about 0.9 wide and 0.74 deep for it); null until the homes game has loaded
  function house(k) {
    if (!ready() || !IH().islandHouse || !k || !k.kidId) return null;
    if (K.pull) K.pull(k.kidId); // (the latest copy of their studio, from the server if another device saved it last)
    const H0 = IH().islandHouse(k.kidId, { roof: k.look && k.look.roof != null ? '#' + new T.Color(k.look.roof).getHexString() : null }); if (!H0) return null;
    const s = Math.min(0.9 / H0.w, 0.7 / H0.d), holder = new T.Group(); holder.add(H0.group); H0.group.scale.setScalar(s); H0.group.position.set(-H0.w / 2 * s, 0, -H0.d / 2 * s);
    islandLook(H0.group); holder.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    Object.assign(holder.userData, { walls: [], studio: true, smokeAt: null }); return holder;
  }
  const API = { lawns: () => [...LAWNS], kids: () => [...KIDS], ready, dress, house, nav, walk: walkBrain, lawn, lawnUnder, ANIMAL, PET, THING, NEW_H, islandLook, active: () => KIDS.size, budget: null };
  window.ChorecastIslandHomes.api = API; // (for checking from the console)
  return API;
};
