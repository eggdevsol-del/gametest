/* Package: the kid. Their own 3D character (kid3d.js: the avatar's animal, rigged, in a T-shirt in their colour),
   with everything it does: walk with planted feet, stand, look about, wave, sit into any seat (phys.js fits the
   hips, back and legs to it), nap. Moves at a walk, turns on a tight circle, and is the 'kid' body to the walk
   engine (as wide and tall as the character). */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  IH.pkg.define('kid', {
    kind: 'body', needs: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'kid3d', 'chars', 'phys'],
    cls: 'kid', speed: 1.2, turnR: 0.22, kid: true,
    idle: ['stand', 'look', 'look'], // what it does standing about
    make: (o = {}) => IH.chars.make(o.avatar || '🦊', o.hue || '#4DABF7'),
    pose: (inst, st, t, ph) => IH.chars.pose(inst, st, t, ph)
  });
})();
