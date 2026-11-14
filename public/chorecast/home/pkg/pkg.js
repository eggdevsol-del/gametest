/* Chorecast packages: the homes game's characters, items and walking, each as a package any island can load.
   A package is one file in home/pkg/ that calls IH.pkg.define(name, spec):
     needs   the engine files it is built on (look, kit, yami3d, kid3d, phys, items, …), loaded once, in order
     kind    'body' (a character or animal that walks) or 'items' (a family of things to put down)
     make()  builds it; a body also says how it moves (speed, turning circle, size class) and how to pose it
   IH.pkg.load(['kid', 'puppy', 'garden']) loads the packages, the engine files they need and the walk engine
   (pkg/walk.js), then resolves with the packages' specs. Nothing is loaded twice: if the homes game already
   loaded an engine file, it's used as it is. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  if (IH.pkg) return;
  const here = document.currentScript && document.currentScript.src ? document.currentScript.src : 'home/pkg/pkg.js';
  const PKG = here.replace(/[^/]*$/, ''), HOME = PKG.replace(/pkg\/$/, '');
  // the engine files in the order they depend on each other, and what each one sets (to know it's already there)
  const ORDER = ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'kid3d', 'phys', 'chars', 'items'];
  const SETS = { look: 'look', kit: 'kit', pets: 'pets', anim2d: 'anim2d', yami: 'yami', yami3d: 'yami3d', kid3d: 'kid3d', phys: 'phys', chars: 'chars', items: 'items' };
  const defs = {}, files = {};
  const one = src => files[src] || (files[src] = new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = ok; s.onerror = () => { delete files[src]; no(new Error('Could not load ' + src)); }; document.head.appendChild(s); }));
  // (scripts added with async off run in the order they were added, so the engine files go in together, in order)
  const engine = names => Promise.all(ORDER.filter(n => names.has(n) && !IH[SETS[n]]).map(n => one(HOME + n + '.js')));

  IH.pkg = {
    define(name, spec) { defs[name] = Object.assign({ name, needs: [] }, spec); },
    get(name) { return defs[name]; },
    async load(names) {
      await Promise.all(names.map(n => defs[n] ? null : one(PKG + n + '.js')));
      const need = new Set(['phys']); for (const n of names) { const d = defs[n]; if (!d) throw new Error('No package ' + n); for (const e of d.needs) need.add(e); }
      // (a need's own needs: the kid's 3D model is posed by the pets' rig, so kid3d brings yami3d and look)
      const DEEP = { kid3d: ['look', 'kit', 'pets', 'anim2d', 'yami', 'yami3d', 'chars'], yami3d: ['look', 'kit', 'pets', 'anim2d', 'yami'], chars: ['pets', 'kit', 'look'], pets: ['kit', 'look'], items: ['kit', 'look'], kit: ['look'] };
      for (const n of [...need]) for (const d of DEEP[n] || []) need.add(d);
      await engine(need);
      if (!IH.walk) await one(PKG + 'walk.js');
      return names.map(n => defs[n]);
    }
  };
})();
