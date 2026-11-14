/* Package: farm and bush animals. The homes game's 3D animals (animals3d.js, made with Morphic): the four-legged
   ones rigged on the pets' skeleton (yami3d.js: walk with planted hooves, stand, graze, lie down), the birds and
   small creatures as whole models that waddle, peck and settle down. Each is a body to the walk engine sized to
   it: 'big' for a cow or a horse, 'pet' for a goat or a pig, 'tiny' for a hen. They wander and graze; they don't
   follow the kid. classic: the classic shop's animals this package stands in for. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  const BIG = ['cow', 'highland', 'alpaca', 'llama', 'donkey', 'horse'], MID = ['goat', 'merino', 'kunekune', 'pony'];
  const SMALL = ['hen', 'rooster', 'duck', 'goose', 'turkey', 'tui', 'kereru', 'weka', 'tuatara', 'crab', 'platypus', 'fantail'];
  function body(kind) {
    const rig = BIG.includes(kind) || MID.includes(kind), cls = BIG.includes(kind) ? 'big' : MID.includes(kind) ? 'pet' : 'tiny';
    return {
      cls, speed: cls === 'big' ? 0.9 : cls === 'pet' ? 0.8 : 0.6, turnR: cls === 'big' ? 0.6 : cls === 'pet' ? 0.4 : 0.2,
      idle: rig ? ['graze', 'graze', 'stand', 'sleep'] : ['graze', 'stand', 'stand', 'sleep'],
      make: () => { const a = IH.animals3d.make(kind); a.group.userData.animal = a; return Object.assign(a.inst || {}, { group: a.group, animal: a }); },
      // (the walk engine counts the ground covered in walkD, which times the rigged animals' strides)
      pose: (inst, st, t) => IH.animals3d.move(inst.animal, t, st.split('.')[0] === 'sit' ? 'stand' : st, 0)
    };
  }
  const bodies = {}; for (const k of [...BIG, ...MID, ...SMALL]) bodies[k] = body(k);
  IH.pkg.define('animals', {
    kind: 'family', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'animals3d', 'phys'], bodies,
    classic: { cow: 'cow', highland: 'highland', alpaca: 'alpaca', llama: 'llama', donkey: 'donkey', horse: 'horse', pony: 'pony', goat: 'goat', merino: 'merino', sheep: 'merino', kunekune: 'kunekune', pig: 'kunekune', hen: 'hen', rooster: 'rooster', duck: 'duck', goose: 'goose', turkey: 'turkey', tui: 'tui', kereru: 'kereru', weka: 'weka', tuatara: 'tuatara', crab: 'crab', platypus: 'platypus', piwakawaka: 'fantail' }
  });
})();
