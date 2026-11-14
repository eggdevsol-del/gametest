/* Package: the puppy. The homes game's 3D dog (yami3d.js), with its own moves: trot with planted paws, stand,
   sit, curl up asleep, wag when happy. A 'pet' body to the walk engine: lower and narrower than the kid, quicker,
   on a wider turning circle. It keeps near the kid. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  IH.pkg.define('puppy', {
    kind: 'body', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'phys'],
    cls: 'pet', speed: 1.3, turnR: 0.32, follows: 'kid',
    idle: ['stand', 'sit', 'sit', 'sleep'],
    make: () => IH.pets.make('dog'),
    pose: (inst, st, t, ph) => IH.pets.pose(inst, st, t, ph)
  });
})();
