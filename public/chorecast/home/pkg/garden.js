/* Package: garden things. The homes game's garden (items.js models), each with its actions (items.js USE: the
   bench seats two, the kid sits back on it, a pet hops up). The walk engine measures each one from its model, so
   bodies walk round it, sit on it and never go into it. classic: the classic island shop's things it stands in for. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  const thing = t => { const def = IH.items.BY[t]; if (!def) return null; const m = IH.items.make(def, {}); return { group: m.group, subs: m.subs, def, use: def.use || null }; };
  IH.pkg.define('garden', {
    kind: 'items', needs: ['look', 'kit', 'pets', 'items', 'phys'],
    things: ['bench', 'birdbath', 'lamppost', 'letterbox', 'sandpit', 'picnic', 'fruittree', 'vegbed', 'mower'],
    classic: { bench: 'bench', birdbath: 'birdbath', lamp: 'lamppost', letterbox: 'letterbox', picnicblanket: 'picnic', appletree: 'fruittree', lemontree: 'fruittree', feijoatree: 'fruittree', carrotbed: 'vegbed', pumpkinbed: 'vegbed', strawberrybed: 'vegbed', mower: 'mower' },
    make: thing
  });
  // Package: outdoor fun. The trampoline, the paddling pool, the sandpit and the telescope.
  IH.pkg.define('fun', {
    kind: 'items', needs: ['look', 'kit', 'pets', 'items', 'phys'],
    things: ['trampoline', 'pool', 'sandpit', 'telescope'],
    classic: { trampoline: 'trampoline', paddling: 'pool', pool: 'pool', sandpit: 'sandpit', telescope: 'telescope' },
    make: thing
  });
  // Package: plants. The potted and garden plants.
  IH.pkg.define('plants', {
    kind: 'items', needs: ['look', 'kit', 'pets', 'items', 'phys'],
    things: ['cactus', 'fern', 'bonsai', 'monstera', 'lemontree'],
    classic: { cactus: 'cactus' },
    make: thing
  });
})();
