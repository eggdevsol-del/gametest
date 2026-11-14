/* Package: garden furniture. The homes game's garden things (items.js models), each with its actions (items.js
   USE: the bench seats two, the kid sits back on it, a pet hops up). The walk engine measures each one from its
   model, so bodies walk round it, sit on it and never go into it. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  IH.pkg.define('garden', {
    kind: 'items', needs: ['look', 'kit', 'pets', 'items', 'phys'],
    things: ['bench', 'birdbath', 'lamppost', 'letterbox', 'sandpit'],
    // one thing: { group, def, use } (use: what a body does with it, or null)
    make(t) { const def = IH.items.BY[t]; if (!def) return null; const m = IH.items.make(def, {}); return { group: m.group, subs: m.subs, def, use: def.use || null }; }
  });
})();
