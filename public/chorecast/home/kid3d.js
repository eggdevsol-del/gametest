/* Chorecast homes (a prototype): the kid's own character in 3D.
   Made the same way as Yami: a turnaround drawn with Morphic in the app's anime style, a 3D model from it (Hyper3D
   Rodin), then reduced and rigged in headless Blender, one continuous skin on a 19-bone two-legged skeleton (hips,
   chest, neck, head; upper arm, forearm, hand; thigh, shin, foot; a three-bone tail) with automatic weights.
   The T-shirt is white in the model; the shader dyes it the kid's own colour (a per-vertex shirt mask found from the
   texture). Drawn with the anime shader and posed by bones on the anime beat: walk, stand, look, sit, nap, wave.
   Avatars without a 3D model yet keep their drawn chibi (chars.js). */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.rig3d) return;
  const base = (document.currentScript && document.currentScript.src ? document.currentScript.src.replace(/[^/]*$/, '') : 'home/');
  // every avatar's own model (the same pipeline: a Morphic turnaround, a Morphic 3D model, rigged in Blender)
  const FILES = { '🦊': 'fox', '🐼': 'panda', '🐯': 'tiger', '🦄': 'unicorn', '🐸': 'frog', '🦖': 'dino', '🐵': 'monkey', '🐨': 'koala', '🦁': 'lion', '🐧': 'penguin', '🐰': 'bunny', '🐶': 'dog', '🐱': 'cat', '🐲': 'dragon', '🦉': 'owl', '🐙': 'octopus' }, HEIGHT = 2.0, models = {}, waits = {};
  const READY = new Set(Object.values(FILES)); // all made

  // Marks the white T-shirt: texels that are bright, unsaturated white, on the torso band of the body.
  function shirtMask(m) {
    const g = m.geo; if (g.getAttribute('aTint')) return;
    const c = document.createElement('canvas'), W = c.width = 256, H = c.height = 256, x = c.getContext('2d'); x.drawImage(m.img, 0, 0, W, H);
    const px = x.getImageData(0, 0, W, H).data, uv = g.getAttribute('uv'), pos = g.getAttribute('position'), bb = g.boundingBox, out = new Float32Array(uv.count);
    for (let i = 0; i < uv.count; i++) {
      const u = Math.min(W - 1, Math.max(0, Math.floor(uv.getX(i) * W))), v = Math.min(H - 1, Math.max(0, Math.floor(uv.getY(i) * H))), k = (v * W + u) * 4;
      const r = px[k] / 255, gg = px[k + 1] / 255, b = px[k + 2] / 255, h = (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y);
      out[i] = Math.min(r, gg, b) > 0.78 && r - b < 0.07 && h > 0.21 && h < 0.53 ? 1 : 0;
    }
    g.setAttribute('aTint', new T.BufferAttribute(out, 1));
  }
  function want(name, then) {
    if (models[name]) return then(models[name]);
    (waits[name] = waits[name] || []).push(then); if (waits[name].length > 1) return;
    IH.rig3d.loadGLB(base + 'kids/' + name + '.glb').then(m => { shirtMask(m); models[name] = m; waits[name].splice(0).forEach(f => f(m)); }).catch(e => console.error('kid3d', e));
  }
  const has = avatar => !!FILES[avatar] && READY.has(FILES[avatar]);

  function make(avatar, hue) {
    const root = new T.Group(), inst = { group: root, subs: {}, pet: 'kid', model3d: true, st: 'stand', t: null, cur: {}, vel: {}, look: 0, nextLook: 0, hopV: 0, hopY: 0 };
    want(FILES[avatar], m => {
      const r = IH.rig3d.instance(m, HEIGHT, { tint: hue || '#4DABF7', tone: [0.85, 1.06] });
      Object.assign(inst, r); root.add(r.body);
      inst.cols = IH.rig3d.colliders(m, COLS);
      inst.fur = IH.chars && IH.chars.SPECIES && IH.chars.SPECIES[avatar] ? IH.chars.SPECIES[avatar].fur : '#f39a4b';
      // the fox's eyes in the texture (amber, on the slanted face); the closed lid in dark brown
      const fe = { r: 24, dir: [-0.43, 0.9], down: [0.9, 0.43] };
      if (FILES[avatar] === 'fox') { inst.open = m.map; inst.shut = IH.rig3d.closedEyes(m, [{ x: 232, y: 236, ...fe }, { x: 183, y: 340, ...fe }], '#3a2418'); } // (the others: their eyes are found later)
    });
    return inst;
  }

  // Joint directions (checked by bending each joint on its own): a positive X turn swings a bone's far end
  // backward. So the knee bends with + (shin back), the hip lifts the thigh forward with -, the ankle points the
  // toes down with +; the shoulder swings an arm forward with - and raises it out to the side with +Z; the
  // elbow bends the forearm forward with -.
  const TAIL = ['tail1', 'tail2', 'tail3'];
  // the body's collision shape, measured from the mesh (rig3d.colliders): joint-to-joint capsules plus the tips
  const COLS = [['hips', 'chest'], ['chest', 'neck'], ['neck', 'head'], ['head', null], ['tail1', 'tail2'], ['tail2', 'tail3'], ['tail3', null],
    ...['L', 'R'].flatMap(s => [['uparm.' + s, 'forearm.' + s], ['forearm.' + s, 'hand.' + s], ['hand.' + s, null, 0.075], ['thigh.' + s, 'shin.' + s], ['shin.' + s, 'foot.' + s], ['foot.' + s, null]])];
  // A move can have branches, named 'base.branch' (liebed.roll, read.browse): the base pose with a twist.
  // u is the time since this branch began, for moves that play through once (pull the blanket up, take a book out).
  const ease = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function target(st0, t, inst) {
    const P = {}, set = (n, x = 0, y = 0, z = 0) => { P[n] = [x, y, z]; };
    const [st, br] = st0.split('.'), u = t - (inst.st0 || 0);
    inst.prop = null; inst.doze = false; // a move that uses a book says so each beat; tools are what's in hand (inst.holding)
    let drop = 0, lie = 0;
    if (st === 'sitchair' || st === 'play') {
      // on a seat: thighs level, shins hanging down; at the piano the hands reach forward and play
      // on a seat the legs rest wherever they fall (phys.js: dangling, along a deep seat, feet on the floor)
      const F = inst.fitMode === 'seat' && inst.fit && inst.fit.legs;
      for (const s of ['L', 'R']) { const [a, b] = (F && F[s]) || [-1.5, 1.45]; set('thigh.' + s, a); set('shin.' + s, b); set('foot.' + s, -0.1 + (-0.05 - a - b) * 0.7); }
      if (st === 'play') { for (const [s, ph] of [['L', 0], ['R', 2]]) { set('uparm.' + s, -1.0); set('forearm.' + s, -0.7 + Math.sin(t * 9 + ph) * 0.12); set('hand.' + s, 0.2 + Math.sin(t * 13 + ph) * 0.2); } set('head', 0.15, Math.sin(t * 1.5) * 0.15, Math.sin(t * 3) * 0.06); }
      else { for (const s of ['L', 'R']) { set('uparm.' + s, -0.35); set('forearm.' + s, -0.8); } set('head', 0.05, inst.look * 0.6); set('chest', Math.sin(t * 2.4) * 0.02); }
      if (br === 'swing') for (const [s, ph] of [['L', 0], ['R', Math.PI]]) if (P['shin.' + s][0] > 1.0) set('shin.' + s, P['shin.' + s][0] - 0.25 + Math.sin(u * 4 + ph) * 0.35); // only legs that hang free
      if (br === 'stretch') { const k = ease(0.2, 1.0, u) - ease(2.2, 3.0, u); for (const s of ['L', 'R']) { set('uparm.' + s, -0.35 - k * 2.6, 0, (s === 'L' ? 1 : -1) * k * 0.3); set('forearm.' + s, -0.8 + k * 0.6); } set('head', 0.05 - k * 0.35); set('chest', -k * 0.12); }
      if (br === 'eat') { const bite = Math.max(0, Math.sin(u * 1.6)); set('uparm.R', -0.75 - bite * 0.35); set('forearm.R', -1.2 - bite * 0.7); set('uparm.L', -0.5); set('forearm.L', -1.0); set('head', 0.25 - bite * 0.15, 0, Math.sin(u * 9) * 0.03 * bite); } // the plate in the lap, a forkful now and then
      // more ways to sit on a sofa or a comfy chair
      if (br === 'relax') { set('chest', -0.22); set('head', -0.1, inst.look * 0.4); for (const s of ['L', 'R']) { set('uparm.' + s, -2.5, 0, (s === 'L' ? 1 : -1) * 0.55); set('forearm.' + s, -2.0); } } // hands behind the head
      if (br === 'read') { for (const s of ['L', 'R']) { set('uparm.' + s, -0.75, 0, (s === 'L' ? -1 : 1) * 0.15); set('forearm.' + s, -1.25); } set('head', 0.42, Math.sin(u * 0.4) * 0.08); inst.prop = 'book'; }
      if (br === 'phone') { const tap = Math.max(0, Math.sin(u * 7)) * 0.12; set('uparm.R', -0.6); set('forearm.R', -1.5 - tap); set('uparm.L', -0.55); set('forearm.L', -1.45); set('head', 0.5, 0, Math.sin(u * 0.8) * 0.05); inst.prop = 'phone'; }
      if (br === 'hug') { for (const s of ['L', 'R']) { set('uparm.' + s, -0.9, 0, (s === 'L' ? -1 : 1) * 0.55); set('forearm.' + s, -1.6, (s === 'L' ? 1 : -1) * 0.6); } set('head', 0.2, 0, 0.18); set('chest', 0.08); inst.prop = 'cushion'; } // a cushion hugged to the chest
      if (br === 'snooze') { const nod = ease(0.5, 2.5, u) * (0.75 + Math.sin(u * 0.9) * 0.08) - Math.max(0, Math.sin(u * 0.35) - 0.97) * 8; set('head', 0.15 + Math.max(0, nod) * 0.55, 0, 0.12 * Math.max(0, nod)); set('chest', 0.05); inst.doze = nod > 0.4; } // dozes off, head nodding, eyes shut
      if (br === 'lean') { set('chest', -0.25); set('head', 0.2, inst.look * 0.6); for (const s of ['L', 'R']) { set('uparm.' + s, 0.3, 0, (s === 'L' ? 1 : -1) * 0.3); set('forearm.' + s, -0.4); } }
      TAIL.forEach((n, i) => set(n, -0.6 - i * 0.2, 0, 0.35));
      if (inst.fitMode === 'seat' && inst.fit) P.chest = [(P.chest ? P.chest[0] : 0) - (inst.fit.recline || 0), /* + bends the chest forward, so leaning back is - */ P.chest ? P.chest[1] : 0, P.chest ? P.chest[2] : 0]; // lies back along a reclined backrest
      return { P, drop: 0, lie: 0, sitting: true };
    }
    // watching TV and strumming (standing), playing with toys (crouched)
    if (st === 'watch' || st === 'strum' || st === 'toys') {
      // never sat on the floor: watching and strumming standing up; playing with toys crouched down
      let d = 0;
      if (st === 'toys') { for (const s of ['L', 'R']) { set('thigh.' + s, -1.35); set('shin.' + s, 2.0); set('foot.' + s, -0.5); } d = 0.42; }
      if (st === 'watch') { for (const s of ['L', 'R']) { set('uparm.' + s, -0.4); set('forearm.' + s, -0.9); } set('head', 0.05 + Math.sin(t * 0.6) * 0.03, 0, Math.sin(t * 0.9) * 0.05); }
      if (st === 'watch' && br === 'laugh') { const sh = Math.sin(u * 16) * 0.06 * (1 - ease(1.8, 2.6, u)); set('chest', -0.15 + sh); set('head', -0.3 + sh, 0, 0); set('uparm.L', -0.9); set('forearm.L', -1.6); }
      if (st === 'watch' && br === 'lean') { set('chest', 0.3); set('head', -0.1); for (const s of ['L', 'R']) { set('uparm.' + s, -0.7); set('forearm.' + s, -1.4); } }
      if (st === 'strum') { set('uparm.L', -0.9); set('forearm.L', -1.3); set('uparm.R', -0.5); set('forearm.R', -1.1 + Math.sin(t * 10) * 0.35); set('head', 0.2, 0, Math.sin(t * 4) * 0.12); }
      if (st === 'toys') { set('uparm.L', -0.9 + Math.sin(t * 5) * 0.3); set('uparm.R', -0.9 + Math.sin(t * 5 + 2) * 0.3); set('forearm.L', -0.6); set('forearm.R', -0.6); set('head', 0.35, Math.sin(t * 2) * 0.2); }
      TAIL.forEach((n, i) => set(n, -0.3 - i * 0.2, 0, 0.3 + Math.sin(t * 2 - i) * 0.15));
      return { P, drop: d, lie: 0 };
    }
    // standing at something: reading, painting, stargazing, cooking, bouncing, splashing
    if (st === 'read' || st === 'paint' || st === 'gaze' || st === 'cook' || st === 'bounce' || st === 'splash') {
      let hop = 0;
      if (st === 'read' && !br) { for (const s of ['L', 'R']) { set('uparm.' + s, -0.7); set('forearm.' + s, -1.2); } set('head', 0.4, Math.sin(t * 0.7) * 0.1); inst.prop = 'book'; }
      if (st === 'read' && br === 'scan') {
        // runs a finger along the spines, shelf by shelf, head following
        const shelf = Math.floor(u / 2.6) % 3, sweep = Math.sin(u * Math.PI / 1.3) * 0.55;
        set('uparm.R', -1.25 - shelf * 0.35, 0, sweep * 0.6); set('forearm.R', -0.25); set('hand.R', 0.2);
        set('uparm.L', -0.15); set('head', 0.15 - shelf * 0.2, -sweep * 0.5); set('chest', 0, -sweep * 0.15); inst.prop = null;
      }
      if (st === 'read' && br === 'browse') {
        // reaches up, takes a book out, looks at the cover, flicks a page, puts it back (six seconds, then again)
        const c = u % 6.5, reach = ease(0, 0.9, c) - ease(1.4, 2.2, c) + ease(4.6, 5.4, c) - ease(5.8, 6.4, c), hold = c > 1.3 && c < 5.2;
        set('uparm.R', -0.7 - reach * 1.3, 0, 0.1); set('forearm.R', -1.2 + reach * 0.95); set('hand.R', 0.1);
        set('uparm.L', hold ? -0.7 : -0.15); set('forearm.L', hold ? -1.15 + (c > 3 && c < 3.6 ? Math.sin((c - 3) * 10) * 0.25 : 0) : -0.2);
        set('head', hold ? 0.4 : -0.15 + reach * -0.2, hold ? Math.sin(c * 1.1) * 0.12 : 0); inst.prop = c > 0.85 && c < 5.5 ? 'book' : null;
      }
      if (st === 'paint') { set('uparm.R', -1.4, 0, 0.3 + Math.sin(t * 3) * 0.25); set('forearm.R', -0.5 + Math.sin(t * 6) * 0.3); set('uparm.L', -0.3); set('head', 0.05, Math.sin(t * 1.3) * 0.15, 0.1); }
      if (st === 'gaze') { set('neck', -0.35); set('head', -0.45, Math.sin(t * 0.5) * 0.08); set('uparm.L', -1.0); set('forearm.L', -1.0); set('uparm.R', -0.9); set('forearm.R', -1.1); }
      if (st === 'cook') { set('uparm.L', -0.8); set('forearm.L', -0.9); set('uparm.R', -0.9 + Math.sin(t * 6) * 0.15); set('forearm.R', -0.8 + Math.cos(t * 6) * 0.25); set('head', 0.35); }
      if (st === 'bounce') { hop = Math.abs(Math.sin(t * Math.PI * 1.6)) * 0.55; for (const s of ['L', 'R']) set('uparm.' + s, 0, 0, (s === 'L' ? -1 : 1) * (1.2 + hop)); set('head', -0.1); }
      if (st === 'splash') { for (const [s, ph] of [['L', 0], ['R', Math.PI]]) { set('uparm.' + s, -0.6 + Math.sin(t * 9 + ph) * 0.5, 0, (s === 'L' ? -1 : 1) * 0.4); set('forearm.' + s, -0.4); } set('head', -0.1, 0, Math.sin(t * 5) * 0.12); }
      if (st !== 'read') inst.prop = null;
      TAIL.forEach((n, i) => set(n, 0.1, 0, Math.sin(t * 2.4 - i * 0.6) * 0.3));
      return { P, drop: -hop, lie: 0 };
    }
    // chores and everyday things, standing or crouched: watering a plant, sweeping, making the bed, feeding and
    // patting a pet, washing up, a snack from the fridge
    if (['water', 'sweep', 'makebed', 'feed', 'pat', 'dishes', 'snack', 'fetch', 'switch', 'scan', 'place', 'chop', 'stir', 'dry'].includes(st)) {
      let d = 0, bathe = false; inst.prop = null;
      if (st === 'water') { set('uparm.R', -1.0, 0, 0.15); set('forearm.R', -0.35); set('hand.R', 0.35 + Math.sin(t * 2) * 0.12); set('uparm.L', -0.1); set('head', 0.4, -0.1); set('chest', 0.12); }
      if (st === 'sweep') { const sw = Math.sin(t * 5); set('chest', 0.3, sw * 0.18); for (const s of ['L', 'R']) { set('uparm.' + s, -0.75, 0, sw * 0.35 + (s === 'L' ? 0.1 : -0.1)); set('forearm.' + s, -0.5); } set('head', 0.35); for (const s of ['L', 'R']) { set('thigh.' + s, -0.25); set('shin.' + s, 0.4); } d = 0.05; }
      if (st === 'makebed') { const sw = Math.sin(t * 3); set('chest', 0.3); for (const [s, ph] of [['L', 0], ['R', Math.PI]]) { set('uparm.' + s, -1.35 + Math.sin(t * 3 + ph) * 0.15, 0, (s === 'L' ? 1 : -1) * (0.3 + sw * 0.15)); set('forearm.' + s, -0.45); } set('head', 0.3); } // smoothing the duvet over the top, hands above it
      if (st === 'feed' || st === 'pat') {
        // crouched down to the pet
        for (const s of ['L', 'R']) { set('thigh.' + s, -1.35); set('shin.' + s, 2.0); set('foot.' + s, -0.5); }
        set('chest', 0.15); set('head', 0.2, 0, Math.sin(t * 1.5) * 0.08); d = 0.42;
        if (st === 'feed') { set('uparm.R', -1.1); set('forearm.R', -0.5); set('hand.R', 0.5 + Math.max(0, Math.sin(t * 4)) * 0.4); set('uparm.L', -0.9); set('forearm.L', -0.8); }
        else { set('uparm.R', -1.0, 0, 0.1); set('forearm.R', -0.55 + Math.sin(t * 4.5) * 0.3); set('hand.R', 0.3); set('uparm.L', -0.3); set('forearm.L', -0.9); }
      }
      if (st === 'dishes') { for (const [s, ph] of [['L', 0], ['R', 1.5]]) { set('uparm.' + s, -0.85 + Math.sin(t * 8 + ph) * 0.12, 0, (s === 'L' ? 1 : -1) * 0.1); set('forearm.' + s, -0.9 + Math.cos(t * 8 + ph) * 0.25); } set('head', 0.45); set('chest', 0.1); }
      // getting a tool from the cupboard or putting it back: reaches in, a moment, then back out
      if (st === 'fetch') { const r = ease(0.2, 0.9, u) - ease(1.6, 2.3, u); set('uparm.R', -0.4 - r * 1.0, 0, 0.1); set('forearm.R', -0.5 + r * 0.25); set('chest', r * 0.15); set('head', 0.15); }
      // a lamp switch: reaches up, a press, the hand comes down
      if (st === 'switch') { const r = ease(0.1, 0.5, u) - ease(1.0, 1.4, u); set('uparm.R', -0.3 - r * 1.35, 0, 0.1); set('forearm.R', -0.4 + r * 0.2); set('hand.R', r * Math.max(0, Math.sin(u * 14)) * 0.3); set('head', -0.05 * r); }
      // in the kitchen: a good look in the fridge, putting something down on the bench, chopping, stirring the pan
      if (st === 'scan') { set('head', 0.15 + Math.sin(u * 0.9) * 0.15, Math.sin(u * 1.3) * 0.45); set('uparm.L', -1.1, 0, 0.2); set('forearm.L', -0.3); set('chest', 0.08); }
      if (st === 'place') { const r = ease(0.1, 0.6, u) - ease(0.9, 1.3, u); set('uparm.R', -0.5 - r * 0.8); set('forearm.R', -0.6 + r * 0.2); set('head', 0.3); }
      if (st === 'chop') { const c = Math.abs(Math.sin(t * 7)); set('uparm.R', -0.85); set('forearm.R', -0.75 - c * 0.35); set('hand.R', c * 0.3); set('uparm.L', -0.8, 0, -0.1); set('forearm.L', -0.9); set('head', 0.45); set('chest', 0.12); }
      if (st === 'stir') { set('uparm.R', -0.85 + Math.sin(t * 4) * 0.12, 0, Math.cos(t * 4) * 0.15); set('forearm.R', -0.7); set('uparm.L', -0.6); set('forearm.L', -1.0); set('head', 0.4); }
      // drying off with a towel: rubbing the head, then the back (still covered)
      if (st === 'dry') { const r = Math.sin(t * 8), back = (u % 6) > 3; set('uparm.R', back ? -0.4 : -2.4, 0, back ? -0.9 : 0.4); set('forearm.R', back ? -1.4 : -1.5 + r * 0.25); set('uparm.L', back ? -0.4 : -2.4, 0, back ? 0.9 : -0.4); set('forearm.L', back ? -1.4 : -1.5 - r * 0.25); set('head', 0.2, 0, r * 0.1); bathe = true; }
      if (st === 'snack') { const bite = Math.max(0, Math.sin(t * 2.2)); set('uparm.R', -0.6 - bite * 0.3); set('forearm.R', -1.6 - bite * 0.5); set('uparm.L', -0.2); set('head', 0.05 - bite * 0.1, 0, Math.sin(t * 9) * 0.03 * bite); }
      TAIL.forEach((n, i) => set(n, 0.1, 0, Math.sin(t * 2.4 - i * 0.6) * 0.3));
      return { P, drop: d, lie: 0, bathing: bathe };
    }
    // the bathroom: sitting in the bath splashing, washing under the shower, at the basin (hands, then teeth)
    if (st === 'bath') {
      for (const s of ['L', 'R']) { set('thigh.' + s, -1.4); set('shin.' + s, 0.25); set('foot.' + s, -0.3); }
      for (const [s, ph] of [['L', 0], ['R', Math.PI]]) { set('uparm.' + s, -0.5 + Math.sin(t * 3 + ph) * 0.3, 0, (s === 'L' ? 1 : -1) * 0.4); set('forearm.' + s, -0.6); } // splashing
      set('head', 0.05, Math.sin(t * 0.7) * 0.2, Math.sin(t * 1.1) * 0.08);
      if (br === 'bubbles') { set('uparm.R', -1.1); set('forearm.R', -1.6); set('hand.R', 0.3); set('uparm.L', -0.3); set('forearm.L', -0.4); set('head', -0.1, 0, 0); } // a bubble wand to the mouth
      if (br === 'duck') { const b = Math.sin(u * 2); set('uparm.L', -0.9, 0, 0.2); set('forearm.L', -0.4 + b * 0.15); set('uparm.R', -0.9, 0, -0.2); set('forearm.R', -0.4 - b * 0.15); set('head', 0.4, b * 0.3); } // pushing a rubber duck about
      if (br === 'relax') { for (const s of ['L', 'R']) { set('uparm.' + s, -2.6, 0, (s === 'L' ? 1 : -1) * 0.6); set('forearm.' + s, -1.9); } set('chest', -0.35); set('head', -0.2, 0, 0.1); } // lying back, hands behind the head
      if (br === 'scrub') { const sc = Math.sin(u * 8); set('uparm.R', -1.0, 0, -0.5); set('forearm.R', -1.5 + sc * 0.3); set('uparm.L', -0.6, 0, 0.3); set('forearm.L', -0.5); set('head', 0.25, 0.3); } // scrubbing an arm
      TAIL.forEach((n, i) => set(n, -0.3 - i * 0.2, 0, 0.3)); return { P, drop: 0.36, lie: 0, bathing: true };
    }
    if (st === 'shower' || st === 'wash') {
      const brush = st === 'wash' && (br === 'teeth' || (!br && (u % 30) > 12)), sc = Math.sin(t * 9);
      if (st === 'shower') for (const [s, ph] of [['L', 0], ['R', 1.6]]) { set('uparm.' + s, -2.5 + Math.sin(t * 6 + ph) * 0.2, 0, (s === 'L' ? 1 : -1) * 0.35); set('forearm.' + s, -1.4 + Math.cos(t * 6 + ph) * 0.3); }
      else if (brush) { set('uparm.R', -0.9); set('forearm.R', -1.9 + sc * 0.12); set('hand.R', sc * 0.2); set('uparm.L', -0.2); }
      else for (const [s, ph] of [['L', 0], ['R', Math.PI]]) { set('uparm.' + s, -0.8, 0, (s === 'L' ? -1 : 1) * 0.15); set('forearm.' + s, -0.8 + Math.sin(t * 8 + ph) * 0.2); }
      set('head', st === 'shower' ? -0.2 : 0.35, 0, st === 'shower' ? Math.sin(t * 2) * 0.1 : 0);
      if (st === 'shower' && br === 'hair') for (const [s, ph] of [['L', 0], ['R', Math.PI]]) { set('uparm.' + s, -2.9, 0, (s === 'L' ? 1 : -1) * 0.5); set('forearm.' + s, -1.7 + Math.sin(t * 10 + ph) * 0.25); } // a good shampoo
      if (st === 'shower' && br === 'sing') { set('uparm.R', -1.2); set('forearm.R', -1.7); set('hand.R', 0.2); set('uparm.L', -0.4, 0, 0.6 + Math.sin(t * 3) * 0.3); set('head', -0.35, Math.sin(t * 2) * 0.3, Math.sin(t * 4) * 0.12); } // singing into a shampoo bottle
      if (st === 'wash' && br === 'face') for (const s of ['L', 'R']) { set('uparm.' + s, -1.0, 0, (s === 'L' ? -1 : 1) * 0.25); set('forearm.' + s, -1.8 + Math.sin(t * 6) * 0.15); } // splashing water on the face
      TAIL.forEach((n, i) => set(n, 0.1, 0, Math.sin(t * 2.4 - i * 0.6) * 0.3)); return { P, drop: 0, lie: 0, bathing: st === 'shower' };
    }
    if (st === 'rock') {
      // on the rocking horse: legs astride, holding on, rocking
      for (const s of ['L', 'R']) { set('thigh.' + s, -1.2, 0, (s === 'L' ? 1 : -1) * 0.35); set('shin.' + s, 1.0); set('uparm.' + s, -1.0); set('forearm.' + s, -0.8); }
      set('chest', Math.sin(t * 4) * 0.12); set('head', -0.1 + Math.sin(t * 4) * 0.08);
      return { P, drop: 0, lie: 0 };
    }
    if (st === 'liebed') {
      // lying on the back in bed, arms by the sides, slow sleepy breathing
      lie = -Math.PI / 2; let roll = 0, cover;
      for (const s of ['L', 'R']) { set('uparm.' + s, 0, 0, s === 'L' ? 0.25 : -0.25); set('forearm.' + s, -0.3); set('thigh.' + s, -0.05); }
      set('chest', Math.sin(t * 1.4) * 0.04); set('neck', 0.15); set('head', 0.2, 0.3); TAIL.forEach((n, i) => set(n, 0.3, 0, 0.4)); // the head lies back on the pillow
      if (br === 'roll') {
        // rolls onto the side, knees drawn up, one arm under the pillow
        roll = ease(0.2, 1.4, u) * (inst.rollSide || 1) * 1.45;
        for (const s of ['L', 'R']) { set('thigh.' + s, -0.9); set('shin.' + s, 1.2); }
        set('uparm.L', -1.6, 0, 0.3); set('forearm.L', -1.4); set('uparm.R', -0.6); set('forearm.R', -0.8); set('head', 0.2, 0);
      }
      if (br === 'starfish') {
        // arms and legs flung out wide
        const k = ease(0.1, 1.0, u);
        set('uparm.L', 0, 0, 0.25 + k * 1.35); set('uparm.R', 0, 0, -0.25 - k * 1.35); set('forearm.L', -0.15); set('forearm.R', -0.15);
        set('thigh.L', -0.05, 0, k * 0.55); set('thigh.R', -0.05, 0, -k * 0.55); set('head', 0.05, 0.15 * Math.sin(t * 0.3));
      }
      if (br === 'covers') {
        // reaches down for the blanket and pulls it up to the chin
        const reach = ease(0, 0.6, u) - ease(0.7, 1.6, u), up = ease(0.7, 1.6, u);
        for (const s of ['L', 'R']) { set('uparm.' + s, -0.3 - reach * 0.9 - up * 0.2, 0, s === 'L' ? 0.15 : -0.15); set('forearm.' + s, -0.3 - up * 1.9); }
        set('head', -0.25 * reach, 0.2); cover = Math.max(inst.cover || 0, up); // never drops what's already pulled up
      }
      if (br === 'half') {
        // pushes the blanket down to the waist and stretches
        const push = ease(0.2, 1.2, u), str = ease(1.5, 2.3, u) - ease(3.2, 4.2, u);
        for (const s of ['L', 'R']) { set('uparm.' + s, -0.4 + push * 0.4 - str * 2.4, 0, (s === 'L' ? 1 : -1) * (0.2 + str * 0.2)); set('forearm.' + s, -1.3 + push * 1.0); }
        cover = 1 - push * 0.5; set('head', 0.1 - str * 0.2, 0.2);
      }
      return { P, drop: 0, lie, roll, cover };
    }
    if (st === 'walk') {
      const p = inst.walkD != null ? inst.walkD / STEP * Math.PI : t * Math.PI * 2 * 1.3; // in step with the ground covered
      for (const [s, ph] of [['L', 0], ['R', Math.PI]]) {
        const q = p + ph, sw = Math.sin(q), lift = Math.max(0, -Math.cos(q));
        set('thigh.' + s, sw * 0.5 - lift * 0.35); set('shin.' + s, lift * 0.9); set('foot.' + s, -lift * 0.2);
        const tight = Math.max(0.25, Math.min(1, ((inst.room == null ? 1 : inst.room) - 0.36) / 0.3)); // close to things: small swings, arms in
        if (inst.carrying || inst.handMesh) { set('uparm.' + s, -0.9); set('forearm.' + s, -0.7); } // holding something in front
        else { set('uparm.' + s, -sw * 0.45 * tight, 0, (s === 'L' ? -1 : 1) * (1 - tight) * 0.15); set('forearm.' + s, -0.25 - Math.max(0, -sw) * 0.3 * tight); }
      }
      set('chest', 0.04, Math.sin(p) * 0.08); set('head', 0, -Math.sin(p) * 0.05); drop = 0.035 + Math.abs(Math.sin(p)) * 0.015; // a little lower, knees soft, so the feet can reach their steps
      TAIL.forEach((n, i) => set(n, 0.1, 0, Math.sin(p * 0.5 - i * 0.6) * 0.25));
    } else if (st === 'sit' || st === 'sleep') {
      // sitting on the floor, legs out in front, hands in the lap; a nap drops the head
      drop = 0.36;
      for (const s of ['L', 'R']) { set('thigh.' + s, -1.45); set('shin.' + s, 0.2); set('foot.' + s, -0.3); set('uparm.' + s, -0.45); set('forearm.' + s, -0.9); }
      if (st === 'sleep') { set('neck', 0.35); set('head', 0.25, 0, 0.25 + Math.sin(t * 1.4) * 0.03); set('chest', 0.15 + Math.sin(t * 1.4) * 0.03); }
      else { set('head', 0, inst.look * 0.6); set('chest', Math.sin(t * 2.4) * 0.02); }
      TAIL.forEach((n, i) => set(n, -0.3 - i * 0.2, 0, 0.3));
    } else if (st === 'happy') {
      // a wave: the right arm up, the hand waving at the elbow
      set('uparm.R', 0, 0, 2.75); set('forearm.R', 0, 0, 0.45 + Math.sin(t * 14) * 0.4); set('uparm.L', -0.15); // the arm rises out to the side, the hand waves
      set('head', -0.12, 0, Math.sin(t * 7) * 0.12); TAIL.forEach((n, i) => set(n, 0.2, 0, Math.sin(t * 12 - i * 0.7) * 0.4));
    } else {
      set('chest', Math.sin(t * 2.4) * 0.025); set('head', st === 'look' ? -0.22 : -0.02, inst.look, Math.sin(t * 0.8) * 0.05); // (looking at something: eyes down to it, never up at the lights; a + turn tips the head back)
      for (const s of ['L', 'R']) set('uparm.' + s, Math.sin(t * 1.1 + (s === 'L' ? 0 : 1)) * 0.04);
      TAIL.forEach((n, i) => set(n, 0.05, 0, Math.sin(t * 1.4 - i * 0.6) * 0.25));
    }
    return { P, drop, lie };
  }

  function pose(inst, st, t) {
    if (!inst.B) return;
    const dt = inst.t == null ? 0 : Math.min(0.25, Math.max(0, t - inst.t)); inst.t = t;
    IH.rig3d.eyes(inst, /^(sleep|liebed)/.test(st) || (st === 'sitchair.snooze' && inst.doze), t);
    if (st !== inst.st) { if (st === 'happy') inst.hopV = 1.2; inst.st = st; inst.st0 = t; if (st === 'liebed.roll') inst.rollSide = Math.random() < 0.5 ? -1 : 1; }
    if (t > inst.nextLook) { inst.look = st === 'sleep' ? 0 : (Math.random() - 0.5) * 0.9; inst.nextLook = t + 1.5 + Math.random() * 2.5; }
    const tg = target(st, t, inst); if (IH.kid3d.test) Object.assign(tg.P, IH.kid3d.test);
    // the head keeps out of things and out of other bodies (a pet being patted): it draws back, chest and neck
    // together, as far as it needs (eased, so it moves like a person ducking away, not a jump)
    if (inst.headBack) { const hb = inst.headBack, add = (n, v) => { const p = tg.P[n] || [0, 0, 0]; tg.P[n] = [p[0] - v, p[1], p[2]]; }; add('chest', hb * 0.55); add('neck', hb * 0.45); }
    IH.rig3d.springBones(inst, tg.P, dt, st === 'walk' ? 160 : 80, st === 'walk' ? 18 : 12);
    const c = inst.cur.__b || (inst.cur.__b = [0]); c[0] += (tg.drop - c[0]) * Math.min(1, dt * 7);
    inst.hopV -= 9 * dt; inst.hopY = Math.max(0, inst.hopY + inst.hopV * dt); if (inst.hopY === 0) inst.hopV = Math.max(0, inst.hopV);
    inst.body.position.y = -c[0] + inst.hopY;
    // lying down tips the whole body over (feet at the foot of the bed, head on the pillow)
    const lr = inst.cur.__lie || (inst.cur.__lie = [0, 0]); lr[0] += ((tg.lie || 0) - lr[0]) * Math.min(1, dt * (tg.lie ? 6 : 16)); /* getting up is quick (it's upright before it steps off the bed) */ lr[1] += ((tg.roll || 0) - lr[1]) * Math.min(1, dt * 5);
    inst.body.rotation.x = lr[0]; inst.body.rotation.y = lr[1];
    props(inst, tg);
    // lying in bed: whatever the pose (rolled, starfish, stretching), the lowest part of the body rests on the
    // mattress, never sinks into it and never floats (measured from the collision shape each beat)
    const lf = inst.cur.__lift || (inst.cur.__lift = [0]);
    if (inst.floorY != null && inst.cols && tg.lie) {
      inst.group.updateMatrixWorld(true);
      const low = Math.min(...IH.rig3d.capsules(inst, inst.cols.filter(k => (Math.abs(tg.roll || 0) > 0.6 ? !/^(tail|head)/.test(k.bone) : ['hips', 'chest'].includes(k.bone)))).map(k => Math.min(k.a.y, k.b.y) - k.r)); // the back rests on the mattress (head sinks into the pillow, the tail may hang in); rolled onto a side, the whole side does // measured before the lift is added
      const need = Math.max(-0.6, Math.min(0.6, inst.floorY - low));
      lf[0] += (need - lf[0]) * Math.min(1, dt * (need > lf[0] ? 14 : 4)); // up quickly (never in the bed), down gently
    } else lf[0] += (0 - lf[0]) * Math.min(1, dt * 8);
    inst.body.position.y += lf[0];
    // against furniture (phys.js): on a seat the hips rest on it, the back against the backrest and the legs where
    // they fall; standing at something, it steps back until nothing (but the tail) is inside it
    const F = inst.fit || (inst.fit = { z: 0, y: 0, recline: 0 });
    if (inst.fitMode && inst.cols && IH.phys) {
      const y0 = inst.body.position.y; inst.body.position.z = F.z; inst.body.position.y = y0 + F.y;
      inst.group.updateMatrixWorld(true);
      const caps = IH.rig3d.capsules(inst, inst.cols), yaw = inst.group.rotation.y, fwd = { x: Math.sin(yaw), z: Math.cos(yaw) };
      if (inst.fitMode === 'seat') {
        IH.phys.seat(inst, caps, fwd, F, dt);
        // the legs go straight to where they rest (no spring lag dipping them into the seat on the way)
        if (F.legs) for (const s of ['L', 'R']) { const L = F.legs[s]; if (!L) continue; for (const [n, v] of [['thigh.' + s, L[0]], ['shin.' + s, L[1]]]) { if (n[0] === 's' && /swing/.test(inst.st)) continue; const c = inst.cur[n], vv = inst.vel[n]; if (c) { c[0] += (v - c[0]) * 0.6; if (vv) vv[0] = 0; } } }
      } else IH.phys.clear(caps, fwd, F, dt, inst.bodies);
      inst.body.position.z = F.z; inst.body.position.y = y0 + F.y;
    } else { const k = Math.min(1, dt * 8); F.z -= F.z * k; F.y -= F.y * k; F.recline = 0; F.legs = null; inst.body.position.z = F.z; inst.body.position.y += F.y; }
    tailRest(inst, tg, dt);
    if (inst.debugTail) inst.tailGap = IH.rig3d.capsules(inst, inst.cols.filter(c => /^tail/.test(c.bone))).map(k => [k.bone, +k.r.toFixed(2), ...[k.a, k.b].map(p => [+p.y.toFixed(2), +IH.phys.support(p.x, p.y + 0.3, p.z).toFixed(2), +IH.phys.floorAt(p.x, p.z).toFixed(2)])]);
    plantFeet(inst, st);
    reachArms(inst, t);
    // the face follows what it's doing (the app sets the focus each beat: the TV, the plant, the pet, the way ahead)
    IH.rig3d.look(inst, /^(sleep|liebed)/.test(st) ? null : inst.focus, dt);
    if (inst.cols && IH.phys && !tg.lie) {
      inst.group.updateMatrixWorld(true);
      const hd = IH.rig3d.capsules(inst, inst.cols).filter(k => k.bone === 'head' || k.bone === 'neck').reduce((m, k) => Math.max(m, IH.phys.penAll(k.a.x, k.a.y, k.a.z, k.r * 0.85, inst.bodies)), 0);
      inst.headBack = Math.max(0, Math.min(0.7, (inst.headBack || 0) + (hd > 0.01 ? dt * 2.5 : -dt * 0.6)));
    } else inst.headBack = 0;
  }
  // The tail has weight: it never goes into anything (the mattress, a seat, the floor), and lying down or sitting it
  // lies along whatever's under it (no tail sticking up in the air off the bed). Each bone, root to tip, is tipped
  // just enough (eased, so it settles rather than snaps) that its underside rests on the surface below it.
  function tailRest(inst, tg, dt) { IH.rig3d.tailRest(inst, TAIL, !!tg.lie || inst.fitMode === 'seat' || /^(sleep|liebed|sit)/.test(inst.st || ''), dt); } // (yami3d: rests on what's under it)
  // Feet on the ground. Walking, each foot is set down a half step ahead of its hip and stays exactly where it
  // landed (in the world) while the body walks over it, then lifts and swings to the next spot; the steps are timed
  // by the ground covered (inst.walkD, from the app), so nothing slides. Standing, both feet sit on the ground under
  // the hips. The legs reach their feet by two-bone IK: thigh and shin in the plane the character faces, the knee
  // bending forward, the sole kept level.
  const STEP = 0.22, IV = [new T.Vector3(), new T.Vector3(), new T.Vector3()], IQ = new T.Quaternion(), IE = new T.Euler();
  // Hands that reach: the app sets inst.reach = { R: Vector3 | null, L: Vector3 | null } (world points: a handle bar,
  // a tap, a knob, a door handle) and each arm bends to put its hand there: two-bone IK from the shoulder, the elbow
  // falling down and a little out and back as a real elbow does. Hands ease onto a target and off it again.
  const AV = [new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3(), new T.Vector3()], AQ = [new T.Quaternion(), new T.Quaternion(), new T.Quaternion()];
  function turnTo(b, from, to) { // turn bone b (in world space) so its direction 'from' points along 'to'
    if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return;
    const r = AQ[0].setFromUnitVectors(from.clone().normalize(), to.clone().normalize()), wq = b.getWorldQuaternion(AQ[1]), pq = b.parent.getWorldQuaternion(AQ[2]).invert();
    b.quaternion.copy(pq.multiply(r.multiply(wq))); b.updateMatrixWorld(true);
  }
  function reachArms(inst, t) {
    const R = inst.reach || {}, W = inst.reachW || (inst.reachW = { R: 0, L: 0 }), last = inst.reachLast || (inst.reachLast = {}), dt = Math.min(0.1, Math.max(0, t - (inst.reachT || t))); inst.reachT = t;
    for (const s of ['R', 'L']) {
      const tg = R[s]; if (tg) last[s] = tg.clone(); W[s] += ((tg ? 1 : 0) - W[s]) * Math.min(1, dt * 9); if (W[s] < 0.01 || !last[s]) continue;
      const ua = inst.B['uparm.' + s], fa = inst.B['forearm.' + s], hd = inst.B['hand.' + s]; if (!ua || !fa || !hd) continue;
      inst.group.updateMatrixWorld(true);
      const S = ua.getWorldPosition(AV[0]), E = fa.getWorldPosition(AV[1]), H = hd.getWorldPosition(AV[2]), L1 = S.distanceTo(E), L2 = E.distanceTo(H);
      const T0 = last[s].clone(), q0 = ua.quaternion.clone(), q1 = fa.quaternion.clone();
      const to = T0.clone().sub(S), d = Math.max(0.02, Math.min(L1 + L2 - 1e-3, to.length())), dir = to.normalize();
      const yaw = inst.group.rotation.y, fwd = AV[3].set(Math.sin(yaw), 0, Math.cos(yaw)), right = AV[4].set(-Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(s === 'R' ? 1 : -1);
      const pole = AV[5].set(0, -1, 0).addScaledVector(right, 0.55).addScaledVector(fwd, -0.25); pole.addScaledVector(dir, -pole.dot(dir)); if (pole.lengthSq() < 1e-6) pole.copy(right); pole.normalize();
      const ca = Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))), sa = Math.sqrt(1 - ca * ca);
      const E2 = S.clone().addScaledVector(dir, ca * L1).addScaledVector(pole, sa * L1);
      turnTo(ua, E.clone().sub(S), E2.clone().sub(S));
      const E3 = fa.getWorldPosition(new T.Vector3()), H3 = hd.getWorldPosition(new T.Vector3()); turnTo(fa, H3.sub(E3), T0.clone().sub(E3));
      if (W[s] < 0.999) { ua.quaternion.copy(q0.slerp(ua.quaternion.clone(), W[s])); fa.quaternion.copy(q1.slerp(fa.quaternion.clone(), W[s])); ua.updateMatrixWorld(true); }
      if (inst.debugReach) (inst.reachErr = inst.reachErr || {})[s] = +hd.getWorldPosition(new T.Vector3()).distanceTo(T0).toFixed(3);
    }
  }
  function plantFeet(inst, st) {
    const walking = st === 'walk', standing = /^(stand|look|happy)$/.test(st);
    if ((!walking && !standing) || !inst.B['thigh.L']) { inst.fp = null; return; }
    inst.group.updateMatrixWorld(true);
    const yaw = inst.group.rotation.y, f = [Math.sin(yaw), Math.cos(yaw)], gy = inst.group.position.y, F = inst.fp || (inst.fp = {});
    const ang = (dx, dy, dz) => Math.atan2(dx * f[0] + dz * f[1], -dy); // from straight down toward the front
    for (const [s, off] of [['L', 0], ['R', 1]]) {
      const th = inst.B['thigh.' + s], sh = inst.B['shin.' + s], ft = inst.B['foot.' + s];
      const hip = th.getWorldPosition(IV[0]), knee = sh.getWorldPosition(IV[1]), ank = ft.getWorldPosition(IV[2]);
      const aH = 0.06 /* the ankle joint stands 6 cm off the floor (measured on the model at rest) */, Lt = hip.distanceTo(knee), Ls = knee.distanceTo(ank);
      let tx = hip.x, tz = hip.z, ty = gy + aH;
      if (walking && inst.walkD != null) {
        const ph = ((inst.walkD / STEP + off) % 2 + 2) % 2, ahead = (x, z) => [x + f[0] * STEP * 0.5, z + f[1] * STEP * 0.5];
        if (ph < 1) { if (!F[s] || F[s].sw) F[s] = { x: ahead(hip.x, hip.z)[0], z: ahead(hip.x, hip.z)[1], sw: false }; tx = F[s].x; tz = F[s].z; } // planted
        else { if (!F[s]) F[s] = { x: hip.x, z: hip.z }; if (!F[s].sw) { F[s].sw = true; F[s].fx = F[s].x; F[s].fz = F[s].z; } const u = ph - 1, e = u * u * (3 - 2 * u), [nx, nz] = ahead(hip.x, hip.z); tx = F[s].fx + (nx + f[0] * STEP * 0.5 - F[s].fx) * e; tz = F[s].fz + (nz + f[1] * STEP * 0.5 - F[s].fz) * e; ty += Math.sin(Math.PI * u) * 0.07; } // swinging through, lifted
      } else F[s] = null;
      // two-bone IK in the facing plane
      const vx = tx - hip.x, vy = ty - hip.y, vz = tz - hip.z, fw = vx * f[0] + vz * f[1], dn = -vy, d = Math.max(0.05, Math.min(Lt + Ls - 1e-3, Math.hypot(fw, dn)));
      const aT = Math.atan2(fw, dn), b = Math.acos(Math.max(-1, Math.min(1, (Lt * Lt + d * d - Ls * Ls) / (2 * Lt * d)))), A1 = aT + b;
      const kx = Math.sin(A1) * Lt, ky = -Math.cos(A1) * Lt, A2 = Math.atan2(fw - kx, -(-dn - ky));
      // the rig's own angles (thigh: - lifts it forward; shin: + bends back), from how they sit right now
      const c1 = inst.cur['thigh.' + s] || (inst.cur['thigh.' + s] = [0, 0, 0]), c2 = inst.cur['shin.' + s] || (inst.cur['shin.' + s] = [0, 0, 0]), c3 = inst.cur['foot.' + s] || (inst.cur['foot.' + s] = [0, 0, 0]);
      const o1 = ang(knee.x - hip.x, knee.y - hip.y, knee.z - hip.z) + c1[0], o2 = ang(ank.x - knee.x, ank.y - knee.y, ank.z - knee.z) + c1[0] + c2[0];
      const t1 = o1 - A1, t2 = o2 - A2 - t1;
      c3[0] += (-(t1 + t2) - (-(c1[0] + c2[0]))); // the sole stays level as the leg turns
      c1[0] = t1; c2[0] = t2; for (const n of ['thigh.' + s, 'shin.' + s, 'foot.' + s]) { if (inst.vel[n]) inst.vel[n][0] = 0; const c = inst.cur[n], bn = inst.B[n]; bn.quaternion.copy(bn.userData.rest).multiply(IQ.setFromEuler(IE.set(c[0], c[1], c[2]))); }
      inst.group.updateMatrixWorld(true);
      if (IH.kid3d.debugIK) { const a2 = ft.getWorldPosition(new T.Vector3()); (inst.ikErr = inst.ikErr || {})[s] = { err: +Math.hypot(a2.x - tx, a2.y - ty, a2.z - tz).toFixed(3), d: +d.toFixed(3), L: +(Lt + Ls).toFixed(3), A1: +A1.toFixed(2), A2: +A2.toFixed(2), t1: +t1.toFixed(2), t2: +t2.toFixed(2), o1: +o1.toFixed(2), o2: +o2.toFixed(2), dy: +(ty - a2.y).toFixed(3) }; }
    }
  }
  // Things a move uses: how far the bed's duvet is pulled over (0 lying on top, 1 up to the chin; the bed reads it,
  // and it stays as it was left until getting up) and a book in the hand.
  const TV1 = new T.Vector3(), TV2 = new T.Vector3(), TV3 = new T.Vector3(), TUP = new T.Vector3(0, 1, 0), TQ1 = new T.Quaternion(), TQ2 = new T.Quaternion(), TE = new T.Euler();
  // In the bath or shower, the clothes take the colour of the fur and a thick cloud of steam covers the body: a solid
  // core of puffs that bob and turn slowly, with wisps rising off it and fading. Flat drawn colour (no lighting or
  // anime shading from the scene, and none of the body's lines show through: the mask layer), always facing the camera.
  // two drawings: a solid cel puff for the core (white on top, a soft blue-grey shade underneath, hard edges so it
  // hides what's behind it completely and gets the same outline as everything else) and a soft see-through wisp
  const STEAM_TEX = {};
  function steamTex(kind) {
    if (STEAM_TEX[kind]) return STEAM_TEX[kind];
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const B = [[64, 72, 34], [40, 64, 24], [88, 62, 25], [64, 44, 24], [42, 88, 20], [86, 88, 20]];
    if (kind === 'core') {
      x.fillStyle = '#cfdcea'; B.forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); });
      x.fillStyle = '#e9f0f7'; B.forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx - r * 0.08, cy - r * 0.12, r * 0.86, 0, Math.PI * 2); x.fill(); });
      x.fillStyle = '#ffffff'; B.forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx - r * 0.18, cy - r * 0.24, r * 0.6, 0, Math.PI * 2); x.fill(); });
    } else B.forEach(([cx, cy, r]) => {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3);
      g.addColorStop(0, 'rgba(250,252,255,0.9)'); g.addColorStop(0.6, 'rgba(240,246,252,0.7)'); g.addColorStop(1, 'rgba(240,246,252,0)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r * 1.3, 0, Math.PI * 2); x.fill();
    });
    return (STEAM_TEX[kind] = new T.CanvasTexture(c));
  }
  // where each puff sits on the cloud (x, y, size); the wisps start low and rise
  const CORE = [[-0.2, 0.12, 0.78], [0.2, 0.08, 0.78], [0, -0.16, 0.86], [0.02, 0.32, 0.7], [-0.18, -0.3, 0.6], [0.2, -0.28, 0.6]], WISPS = 6;
  function modesty(inst, on) {
    const u = inst.mesh && inst.mesh.material.uniforms && inst.mesh.material.uniforms.uTint; if (!u) return;
    if (!inst.tint0) inst.tint0 = u.value.clone();
    u.value.copy(on ? new T.Color(inst.fur || '#f39a4b') : inst.tint0);
    if (!inst.steam && on) {
      const g = new T.Group(), puffs = [];
      for (let i = 0; i < CORE.length + WISPS; i++) {
        const core = i < CORE.length, m = new T.Mesh(new T.PlaneGeometry(1, 1), core
          ? new T.MeshBasicMaterial({ map: steamTex('core'), alphaTest: 0.5, side: T.DoubleSide, toneMapped: false, fog: false })
          : new T.MeshBasicMaterial({ map: steamTex('wisp'), transparent: true, depthWrite: false, side: T.DoubleSide, toneMapped: false, fog: false }));
        m.layers.set(1); m.layers.enable(2); m.userData.noInk = true; m.renderOrder = core ? 6 : 7; m.position.z = core ? 0.012 * i : 0.1;
        g.add(m); puffs.push(m);
      }
      g.userData.puffs = puffs; g.userData.seed = puffs.map(() => Math.random()); inst.group.add(g); inst.steam = g;
    }
    if (!inst.steam) return;
    inst.steam.visible = on; if (!on) return;
    const g = inst.steam, t = performance.now() / 1000, P = g.userData.puffs, S = g.userData.seed;
    P.forEach((m, i) => {
      if (i < CORE.length) { // the solid core: always fully there, just billowing a little
        const [cx, cy, sz] = CORE[i], w = t * 0.9 + S[i] * 6;
        m.position.x = cx + Math.sin(w) * 0.03; m.position.y = cy + Math.cos(w * 0.8) * 0.03; m.rotation.z = S[i] * 6 + t * 0.15 * (i % 2 ? 1 : -1);
        m.scale.setScalar(sz * (1 + Math.sin(w * 1.3) * 0.05)); m.material.opacity = 1;
      } else { // a wisp: rises off the top of the cloud, grows and fades, then starts again
        const k = (t / 3.2 + S[i]) % 1;
        m.position.x = (S[i] - 0.5) * 0.6 + Math.sin(t + S[i] * 9) * 0.06; m.position.y = 0.1 + k * 0.85; m.rotation.z = S[i] * 6 + k;
        m.scale.setScalar(0.35 + k * 0.45); m.material.opacity = Math.sin(k * Math.PI) * 0.6;
      }
    });
    // over the body from chest to hips (the shorts too), out in front of it toward the camera so it covers it
    const a = inst.B.chest.getWorldPosition(new T.Vector3()), b = inst.B.hips.getWorldPosition(new T.Vector3()), mid = a.clone().lerp(b, 0.65);
    if (inst.cam) { const cp = inst.cam.getWorldPosition(new T.Vector3()), dir = cp.sub(mid).normalize(); mid.addScaledVector(dir, 0.5); }
    inst.group.updateMatrixWorld(true); g.position.copy(inst.group.worldToLocal(mid)); g.scale.setScalar(1.15);
    if (inst.cam) { const q = inst.cam.getWorldQuaternion(new T.Quaternion()), gq = inst.group.getWorldQuaternion(new T.Quaternion()).invert(); g.quaternion.copy(gq.multiply(q)); }
  }
  function props(inst, tg) {
    modesty(inst, !!tg.bathing);
    const K = IH.kit && IH.kit.Kit; if (!K) return;
    inst.cover = !tg.lie ? 0 : tg.cover != null ? tg.cover : inst.cover || 0;
    if (!inst.book && inst.B && inst.B['hand.R']) {
      const k = new K(); k.box(0.32, 0.42, 0.08, 0, -0.21, 0, '#5b8def', { r: 0.02 }); k.box(0.29, 0.38, 0.06, 0.02, -0.19, 0, '#fff8ea', { r: 0.01 });
      const g = k.build(), hand = inst.B['hand.R'], v = new T.Vector3(); inst.group.updateMatrixWorld(true); hand.getWorldScale(v); g.scale.setScalar(1 / v.x); g.position.y = 0.12 / v.x; hand.add(g); inst.book = g;
    }
    if (inst.book) inst.book.visible = inst.prop === 'book' && /^(read|sitchair\.read)/.test(inst.st);
    if (!inst.phone && inst.B && inst.B['hand.R']) {
      const k = new K(); k.box(0.16, 0.3, 0.025, 0, -0.15, 0, '#3d3a4a', { r: 0.03 }); k.box(0.13, 0.25, 0.006, 0, -0.14, 0.014, '#8fd0ff', { r: 0.02, emit: 0.5 });
      const g = k.build(), hand = inst.B['hand.R'], v = new T.Vector3(); inst.group.updateMatrixWorld(true); hand.getWorldScale(v); g.scale.setScalar(1 / v.x); g.position.y = 0.1 / v.x; g.rotation.x = -0.9; hand.add(g); inst.phone = g;
    }
    if (inst.phone) inst.phone.visible = inst.prop === 'phone';
    if (!inst.cushion && inst.B && inst.B.chest) {
      const k = new K(); k.box(0.42, 0.42, 0.16, 0, -0.21, 0, '#ffd2dc', { r: 0.08 }); for (const [x, y] of [[-0.19, 0.19], [0.19, 0.19], [-0.19, -0.19], [0.19, -0.19]]) k.ball(0.04, x, y - 0.21 + 0.21, 0, '#ffb3c8', { n: 6 });
      const g = k.build(), ch = inst.B.chest, v = new T.Vector3(); inst.group.updateMatrixWorld(true); ch.getWorldScale(v); g.scale.setScalar(1 / v.x); g.position.set(0, 0.25 / v.x, 0.2 / v.x); ch.add(g); inst.cushion = g;
    }
    if (inst.cushion) inst.cushion.visible = inst.prop === 'cushion';
    // a watering can and a broom, made once and kept in the right hand
    if (!inst.tools && inst.B && inst.B['hand.R']) {
      const hand = inst.B['hand.R'], v = new T.Vector3(); inst.group.updateMatrixWorld(true); hand.getWorldScale(v); inst.tools = {};
      const can = new K(); can.cyl(0.16, 0.26, 0, -0.32, 0, '#6fb8e8', { n: 12 }); can.cyl(0.03, 0.34, 0, -0.18, 0.2, '#5aa3d6', { n: 6, rx: 0.9 }); can.box(0.04, 0.2, 0.18, 0, -0.08, -0.05, '#5aa3d6', { r: 0.02 });
      const br = new K(); br.cyl(0.03, 1.0, 0, -0.1, 0, '#c98f5a', { n: 6 }); br.box(0.42, 0.16, 0.1, 0, 0.9, 0, '#f2c14e', { r: 0.04 }); // one unit long: aimed and stretched to the floor each beat
      for (const [n, k] of [['can', can], ['broom', br]]) { const g = k.build(); g.scale.setScalar(1 / v.x); g.position.y = 0.1 / v.x; hand.add(g); inst.tools[n] = g; }
    }
    if (inst.tools) for (const n in inst.tools) inst.tools[n].visible = inst.holding === n && !/^(liebed|sitchair)/.test(inst.st);
    // The broom points from the hand down to the floor in front (swept side to side while sweeping), so the brush is
    // always on the floor, never through it; the can hangs upright from the hand and tips forward to pour.
    if (inst.tools && inst.holding && inst.tools[inst.holding].visible) {
      const hand = inst.B['hand.R'], g = inst.tools[inst.holding]; inst.group.updateMatrixWorld(true);
      const hp = hand.getWorldPosition(TV1), hq = hand.getWorldQuaternion(TQ1).invert(), ws = hand.getWorldScale(TV3).x, yaw = inst.group.rotation.y, fl = inst.group.position.y;
      const f = [Math.sin(yaw), Math.cos(yaw)], tt = inst.t || 0;
      if (inst.holding === 'broom') {
        const sweep = /^sweep/.test(inst.st), sx = sweep ? Math.sin(tt * 5) * 0.35 : 0, out = sweep ? 0.6 : 0.2;
        TV2.set(hp.x + f[0] * out + f[1] * sx, fl + 0.15, hp.z + f[1] * out - f[0] * sx).sub(hp);
        const L = Math.max(0.3, TV2.length()); TV2.normalize();
        g.quaternion.copy(hq).multiply(TQ2.setFromUnitVectors(TUP, TV2)); g.scale.set(1 / ws, L / ws * 0.92, 1 / ws); g.position.set(0, 0, 0);
      } else {
        const pour = /^water/.test(inst.st) ? 0.55 + Math.sin(tt * 2) * 0.1 : 0;
        g.quaternion.copy(hq).multiply(TQ2.setFromEuler(TE.set(pour, yaw, 0, 'YXZ'))); g.scale.setScalar(1 / ws); g.position.set(0, 0, 0);
      }
    }
  }

  IH.kid3d = { make, pose, has };
})();
