/* Chorecast homes (a prototype): the kid's own character, an anime chibi with a body that matches their avatar
   (a fox kid for 🦊, a panda kid for 🐼, a dragon kid for 🐲 ...), wearing a T-shirt in the kid's colour. Same look
   as the pets: big head with a painted face, bold outline, soft two-tone shading. Walks, stands, sits, naps,
   looks at their things and waves when tapped, all posed on the anime beat with feet on the floor. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.pets) return;
  const P = IH.pets, part = P.part;

  // fur, belly/muzzle, limbs, ears, tail, extras, eye colours
  const SPECIES = {
    '🦊': { fur: '#f39a4b', belly: '#fff3e2', ear: 'point', earIn: '#ffd0b0', tail: 'bushy', tip: '#ffffff', iris: ['#8a4a12', '#f2b544'], nose: 'dark' },
    '🐼': { fur: '#ffffff', belly: '#ffffff', limb: '#2f2a33', ear: 'round', earCol: '#2f2a33', earIn: '#2f2a33', tail: 'puff', patches: true, iris: ['#3a2a2a', '#8b6a5a'], nose: 'dark' },
    '🐯': { fur: '#f7a440', belly: '#fff6e8', ear: 'round', earIn: '#fff6e8', tail: 'thin', tip: '#2f2a33', stripes: '#3a2a2a', iris: ['#3f7a2a', '#c6e36a'], nose: 'pink', whiskers: true },
    '🦄': { fur: '#ffffff', belly: '#fff6fb', ear: 'point', earIn: '#ffc2d1', horn: '#f5c84c', mane: '#c39cff', tail: 'mane', iris: ['#7a3fc2', '#ff9ee0'], nose: 'none' },
    '🐸': { fur: '#79cf6a', belly: '#e9f8c8', ear: 'eyes', tail: 'none', iris: ['#2a4a1a', '#8fd06a'], nose: 'none', smile: true },
    '🐙': { fur: '#ff8fa8', belly: '#ffd0da', limb: '#ff8fa8', ear: 'none', tail: 'none', tentacles: true, iris: ['#3a2a6a', '#9a8aff'], nose: 'none' },
    '🦖': { fur: '#6fcf8f', belly: '#e9f6c4', ear: 'none', tail: 'dino', spikes: '#3fae6a', iris: ['#5a3a10', '#f2c14e'], nose: 'none', smile: true },
    '🐵': { fur: '#a8723f', belly: '#f5d6b0', ear: 'side', earIn: '#f5d6b0', tail: 'curl', mask: '#f5d6b0', iris: ['#4a2a1a', '#a87a4a'], nose: 'dark' },
    '🐨': { fur: '#a9adb8', belly: '#eceef2', ear: 'big', earIn: '#f4f0f2', tail: 'none', iris: ['#2a2a3a', '#7a7a9a'], nose: 'dark' },
    '🦁': { fur: '#f2bf5a', belly: '#fff2d6', ear: 'round', earIn: '#fff2d6', mane: '#c9752f', tail: 'thin', tip: '#c9752f', iris: ['#7a4a10', '#f2c14e'], nose: 'pink' },
    '🐧': { fur: '#33406a', belly: '#ffffff', limb: '#33406a', feet: '#ffb347', ear: 'none', tail: 'none', beak: '#ffb347', iris: ['#1a1a2a', '#5a6aa0'], nose: 'none' },
    '🐰': { fur: '#fbf6f8', belly: '#ffffff', ear: 'long', earIn: '#ffc2d1', tail: 'puff', iris: ['#c2416b', '#ff9ec0'], nose: 'pink' },
    '🐶': { fur: '#f2d4a4', belly: '#fffaf0', ear: 'flop', earCol: '#b0703f', tail: 'thin', iris: ['#5a3420', '#b37a4c'], nose: 'dark', smile: true },
    '🐱': { fur: '#f6b06a', belly: '#fff3e2', ear: 'point', earIn: '#ffb7c5', tail: 'thin', tip: '#e48d45', iris: ['#4e9a3a', '#b8e86a'], nose: 'pink', whiskers: true },
    '🐲': { fur: '#5fc7b0', belly: '#f6efc0', ear: 'none', horn: '#f6efc0', horns: 2, tail: 'dino', spikes: '#ff8fa8', wings: '#3fa890', iris: ['#a8320f', '#ffc04e'], nose: 'none', smile: true },
    '🦉': { fur: '#a87a50', belly: '#f3e1c4', ear: 'tuft', tail: 'none', beak: '#f2b544', wingArms: true, iris: ['#7a4a10', '#ffd24e'], nose: 'none' }
  };
  const DEF = SPECIES['🐱'];

  function make(avatar, hue) {
    if (IH.kid3d && IH.kid3d.has(avatar)) return IH.kid3d.make(avatar, hue);
    const sp = SPECIES[avatar] || DEF, key = 'kid' + (Object.keys(SPECIES).indexOf(avatar) + 1);
    P.LOOK[key] = Object.assign({ iris: sp.iris }, sp);
    const shirt = hue || '#4DABF7', limb = sp.limb || sp.fur, root = new T.Group(), body = new T.Group(); root.add(body);
    const LEG = 0.42, subs = { body, legs: [], arms: [], tail: [], ears: [] };
    // body and clothes
    body.add(part(k => {
      if (sp.tentacles) k.ball(0.32, 0, 0.05, 0, sp.fur, { s: [1, 0.9, 0.95], n: 20 });
      else { k.pill(0.27, 0.26, 0, 0, 0, shirt, { n: 18 }); k.cyl(0.29, 0.14, 0, -0.02, 0, '#3b4a7a', { n: 18 }); k.ball(0.06, 0, 0.36, 0.25, '#ffffff', { s: [1, 1, 0.4], n: 10 }); }
      if (sp.belly !== sp.fur && (sp.beak || sp.wingArms)) k.ball(0.24, 0, 0.3, 0.1, sp.belly, { s: [1, 1.1, 0.6], n: 14 });
      if (sp.spikes) for (let i = 0; i < 4; i++) k.cone(0.07 - i * 0.008, 0.14, 0, 0.55 - i * 0.16, -0.26 - i * 0.02, sp.spikes, { rx: -0.9 - i * 0.2, n: 6 });
      if (sp.wings) for (const s of [-1, 1]) k.ball(0.2, s * 0.24, 0.42, -0.22, sp.wings, { s: [0.25, 1, 0.8], rz: s * 0.5, n: 12 });
    }, 0, LEG, 0));
    // legs (pivot at the hip)
    for (const x of [-0.13, 0.13]) {
      const g = part(k => {
        if (sp.tentacles) { k.pill(0.08, 0.28, 0, -LEG + 0.02, 0, sp.fur, { n: 10 }); k.ball(0.08, 0, -LEG + 0.06, 0.05, sp.belly, { s: [1, 0.6, 1.2], n: 10 }); return; }
        k.pill(0.085, LEG - 0.14, 0, -LEG + 0.02, 0, limb, { n: 12 });
        k.ball(0.1, 0, -LEG + 0.06, 0.05, sp.feet || '#ffffff', { s: [1, 0.65, 1.3], n: 12 });
      }, x, LEG, 0);
      body.add(g); subs.legs.push(g);
    }
    // arms (pivot at the shoulder)
    for (const x of [-1, 1]) {
      const g = part(k => {
        if (sp.wingArms) { k.ball(0.17, 0, -0.18, 0, sp.fur, { s: [0.45, 1.3, 0.9], n: 12 }); return; }
        k.pill(0.075, 0.24, 0, -0.38, 0, sp.tentacles ? sp.fur : limb, { n: 10 });
        k.pill(0.09, 0.08, 0, -0.14, 0, sp.tentacles ? sp.fur : shirt, { n: 10 });
      }, x * 0.31, LEG + 0.48, 0);
      g.rotation.z = x * 0.18; body.add(g); subs.arms.push(g);
    }
    // the big head with its painted face
    const HR = 0.4, head = new T.Group(); head.position.set(0, LEG + 0.62 + HR * 0.82, 0.02); body.add(head); subs.head = head;
    head.add(part(k => {
      k.ball(HR, 0, 0, 0, sp.fur, { s: [1.1, 0.97, 1], n: 28 });
      if (!sp.patches && !sp.beak && !sp.tentacles && !sp.mask) k.ball(HR * 0.5, 0, -HR * 0.3, HR * 0.6, sp.belly, { s: [1.5, 0.8, 0.7], n: 16 });
      if (sp.beak) k.cone(0.07, 0.13, 0, -HR * 0.18, HR * 0.95, sp.beak, { rx: Math.PI / 2 + 0.3, n: 10 });
      if (sp.mane) { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; k.ball(HR * 0.32, Math.cos(a) * HR * 1.02, Math.sin(a) * HR * 0.92, -HR * 0.25, sp.mane, { n: 10 }); } }
      if (sp.horn && !sp.horns) k.cone(0.07, 0.3, 0, HR * 0.82, HR * 0.3, sp.horn, { rx: 0.35, n: 10 });
      if (sp.horns) for (const s of [-1, 1]) k.cone(0.06, 0.22, s * HR * 0.45, HR * 0.78, -HR * 0.1, sp.horn, { rz: -s * 0.35, rx: -0.3, n: 8 });
    }, 0, 0, 0));
    const fm = new T.MeshBasicMaterial({ map: P.face(key, 'open'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const fg = new T.Mesh(new T.SphereGeometry(HR * 1.012, 32, 24, Math.PI / 2 - 0.95, 1.9, 0.62, 1.45), fm);
    fg.scale.set(1.1, 0.97, 1); fg.layers.set(1); fg.renderOrder = 3; head.add(fg); subs.face = fm; subs.mode = 'open';
    // ears
    for (const x of [-1, 1]) {
      const e = part(k => {
        const ec = sp.earCol || sp.fur, ei = sp.earIn || sp.belly;
        if (sp.ear === 'point') { k.cone(0.13, 0.26, 0, 0, 0, ec, { n: 12 }); k.cone(0.08, 0.17, 0, 0.02, 0.04, ei, { n: 10 }); }
        else if (sp.ear === 'round') { k.ball(0.12, 0, 0, 0, ec, { s: [1, 1, 0.55], n: 14 }); k.ball(0.07, 0, 0, 0.04, ei, { s: [1, 1, 0.4], n: 10 }); }
        else if (sp.ear === 'big') { k.ball(0.17, 0, 0, 0, ec, { s: [1, 1, 0.5], n: 14 }); k.ball(0.11, 0, 0, 0.05, ei, { s: [1, 1, 0.4], n: 12 }); }
        else if (sp.ear === 'side') { k.ball(0.11, 0, 0, 0, ec, { s: [0.5, 1, 1], n: 12 }); k.ball(0.07, x * 0.03, 0, 0, ei, { s: [0.4, 1, 1], n: 10 }); }
        else if (sp.ear === 'long') { k.pill(0.08, 0.36, 0, 0, 0, ec, { n: 12, s: [1, 1, 0.55] }); k.pill(0.045, 0.3, 0, 0.04, 0.03, ei, { n: 10, s: [1, 1, 0.5] }); }
        else if (sp.ear === 'flop') k.ball(0.13, 0, -0.14, 0, ec, { s: [0.7, 1.5, 0.45], n: 14 });
        else if (sp.ear === 'tuft') k.cone(0.07, 0.18, 0, 0, 0, sp.fur, { n: 8 });
        else if (sp.ear === 'eyes') { k.ball(0.12, 0, 0, 0, sp.fur, { n: 14 }); }
      }, x * HR * (sp.ear === 'flop' || sp.ear === 'side' ? 1.05 : sp.ear === 'big' ? 0.85 : sp.ear === 'eyes' ? 0.42 : 0.55), HR * (sp.ear === 'flop' ? 0.4 : sp.ear === 'side' ? 0.05 : sp.ear === 'eyes' ? 0.8 : 0.78), sp.ear === 'eyes' ? HR * 0.2 : 0);
      if (sp.ear === 'none') continue;
      if (sp.ear === 'point' || sp.ear === 'tuft') e.rotation.z = -x * 0.32; if (sp.ear === 'long') e.rotation.z = -x * 0.18;
      head.add(e); subs.ears.push(e);
    }
    // tail
    if (sp.tail !== 'none') {
      const j = new T.Group(); j.position.set(0, LEG + 0.12, -0.24); body.add(j); subs.tail.push(j);
      j.add(part(k => {
        if (sp.tail === 'bushy') { k.ball(0.16, 0, 0.12, -0.12, sp.fur, { s: [0.8, 0.8, 1.5], n: 14 }); k.ball(0.1, 0, 0.18, -0.32, sp.tip, { n: 12 }); }
        else if (sp.tail === 'puff') k.ball(0.1, 0, 0, 0, sp.belly === '#ffffff' && sp.fur === '#ffffff' ? '#f0eef2' : '#ffffff', { n: 12 });
        else if (sp.tail === 'mane') k.ball(0.14, 0, 0.05, -0.12, sp.mane, { s: [0.7, 1, 1.4], n: 12 });
        else if (sp.tail === 'dino') { k.cone(0.15, 0.5, 0, 0, -0.22, sp.fur, { rx: -Math.PI / 2 - 0.25, n: 12 }); if (sp.spikes) k.cone(0.05, 0.1, 0, 0.09, -0.24, sp.spikes, { n: 6 }); }
        else if (sp.tail === 'curl') { k.torus(0.12, 0.035, 0, 0.12, -0.12, sp.fur, { ry: Math.PI / 2, arc: Math.PI * 1.5 }); }
        else { k.pill(0.04, 0.28, 0, 0, 0, sp.fur, { rx: -0.9, n: 8 }); if (sp.tip) k.ball(0.055, 0, 0.22, -0.25, sp.tip, { n: 8 }); }
      }, 0, 0, 0));
    }
    root.userData.pet = 'kid';
    return { group: root, subs, pet: 'kid', key };
  }

  function setFace(inst, mode) { const S = inst.subs; if (S.mode === mode) return; S.mode = mode; S.face.map = P.face(inst.key, mode); S.face.needsUpdate = true; }

  // st: 'walk' | 'stand' | 'sit' | 'sleep' | 'happy' | 'look'
  function pose(inst, st, t, ph = 0) {
    if (inst.model3d) return IH.kid3d.pose(inst, st, t, ph);
    st = st.split('.')[0]; // drawn characters play the plain move for every branch
    const S = inst.subs, b = S.body, sw = Math.sin(t * 9 + ph);
    b.position.y = 0; b.rotation.set(0, 0, 0); S.head.rotation.set(0, 0, 0);
    S.legs.forEach(l => l.rotation.set(0, 0, 0)); S.arms.forEach((a, i) => a.rotation.set(0, 0, (i ? 1 : -1) * 0.18));
    let mode = (Math.floor(t * 12 + ph * 7) % 47) < 2 ? 'closed' : 'open';
    if (st === 'walk') {
      S.legs[0].rotation.x = sw * 0.6; S.legs[1].rotation.x = -sw * 0.6; S.arms[0].rotation.x = -sw * 0.55; S.arms[1].rotation.x = sw * 0.55;
      b.position.y = Math.abs(sw) * 0.03; S.head.rotation.z = sw * 0.05;
    } else if (st === 'sit' || st === 'sleep') {
      b.position.y = -0.38; S.legs.forEach(l => { l.rotation.x = -1.45; }); S.arms.forEach((a, i) => { a.rotation.x = -0.5; a.rotation.z = (i ? 1 : -1) * 0.1; });
      if (st === 'sleep') { S.head.rotation.x = 0.35; S.head.rotation.z = 0.25; mode = 'sleep'; b.position.y += Math.sin(t * 1.5) * 0.01; }
      else S.head.rotation.z = Math.sin(t * 0.8 + ph) * 0.15;
    } else if (st === 'happy') {
      S.arms[1].rotation.z = 2.6 + Math.sin(t * 14) * 0.35; S.arms[0].rotation.z = -0.4; S.head.rotation.z = Math.sin(t * 7) * 0.12; mode = 'happy';
      b.position.y = Math.abs(Math.sin(t * 7)) * 0.02;
    } else if (st === 'look') {
      S.head.rotation.x = 0.25; S.arms.forEach(a => { a.rotation.x = -0.6; }); S.head.rotation.z = Math.sin(t * 1.2) * 0.1;
    } else {
      S.head.rotation.y = Math.sin(t * 0.6 + ph) * 0.4; b.rotation.z = Math.sin(t * 1.1) * 0.02;
    }
    S.tail.forEach(j => { j.rotation.y = Math.sin(t * (st === 'happy' ? 12 : 2.5)) * 0.3; });
    setFace(inst, mode);
  }

  IH.chars = { make, pose, SPECIES };
})();
