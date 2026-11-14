/* Package: pets. The homes game's 3D puppy, kitten and bunny (yami3d.js: rigged, paws planted as they walk, sit,
   curl up asleep, wag when happy) and their beds. Each pet is a 'pet' body to the walk engine and keeps near the
   kid. classic: the classic island shop's things this package stands in for. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  const pet = (kind, speed, turnR) => ({ cls: 'pet', pet: true, speed, turnR, follows: 'kid', idle: ['stand', 'sit', 'sit', 'sleep'], make: () => IH.pets.make(kind), pose: (inst, st, t, ph) => IH.pets.pose(inst, st, t, ph) });
  IH.pkg.define('pets', {
    kind: 'family', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'items', 'phys'],
    bodies: { puppy: pet('dog', 1.3, 0.32), kitten: pet('cat', 1.2, 0.3), bunny: pet('bunny', 1.0, 0.24) },
    things: ['kennel', 'catbed'],
    classic: { puppy: 'puppy', kitten: 'kitten', bunny: 'bunny', kennel: 'kennel' },
    make(t) { const def = IH.items.BY[t]; if (!def) return null; const m = IH.items.make(def, {}); return { group: m.group, subs: m.subs, def, use: def.use || null }; }
  });
  // (the single puppy, as the first proof had it)
  IH.pkg.define('puppy', Object.assign({ kind: 'body', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'phys'] }, pet('dog', 1.3, 0.32)));
})();
