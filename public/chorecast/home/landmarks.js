/* Chorecast homes: the original Chorecast island's money world, as things on the island (the round classic island).
   Each one shows something real from the kid's money and jobs, and is an engine item like any other: phys measures
   it, kids and pets walk round it, and Decorate moves it. They can be moved but not put away or sold: they show
   what the kid has earned and saved, not things they bought.
   - The Vault pond: as full as the Save jar (full at 50). Green with leaves when the pond hasn't been cleaned.
   - The investing windmill: there while the kid has investments.
   - The Spend coins: a stack, up to 6 coins.
   - The rainbow: when today's chores are all done.
   - The kid's flag, in their colour.
   - A chore tree for each paid job, up to 8 + 4 for each island size.
   sync() keeps them in step: called when the home opens and whenever the app says the money has changed. */
(function () {
  const T = window.THREE, IH = window.IsoHome = window.IsoHome || {};
  if (!T || !IH.items) return;
  const { shade } = IH.kit, { DEFS, BY } = IH.items;
  const STONE = '#c9c2b6', STONE2 = '#ada597', WOOD = '#b9824f', GOLD = '#ffcf4a', GOLD2 = '#e0a92a';
  const def = (t, name, fp, b, o = {}) => { const d = Object.assign({ t, name, cat: 'landmark', xp: 0, fp, kind: 'floor', b, where: 'out', landmark: true }, o); DEFS.push(d); BY[t] = d; };

  def('lm_pond', 'Vault pond', [3, 3], (k, sub, rec) => {
    const lv = rec.lv != null ? rec.lv : 0.5, dirty = !!rec.dirty, R = 1.3;
    k.lathe([[R - 0.15, 0], [R + 0.1, 0], [R + 0.16, 0.12], [R + 0.08, 0.2], [R - 0.2, 0.2], [R - 0.24, 0.05]], 0, 0, 0, STONE, { n: 28 }); // the stone rim
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; k.ball(0.16 + (i % 3) * 0.03, Math.cos(a) * (R + 0.02), 0.18, Math.sin(a) * (R + 0.02), i % 2 ? STONE : STONE2, { s: [1.3, 0.6, 1], n: 8 }); }
    k.cyl(R - 0.15, 0.06, 0, 0, 0, '#5a6b6a', { n: 28 }); // the bed of the pond
    const y = 0.04 + lv * 0.13; // (fuller with more saved)
    k.special(new T.CylinderGeometry(R - 0.17, R - 0.17, 0.02, 28), 'water', new T.Matrix4().makeTranslation(0, y, 0), { a: dirty ? 0.95 : 0.7, tint: dirty ? '#6f8f3a' : undefined });
    if (lv > 0.45) for (const [x, z, r] of [[0.4, 0.3, 0.2], [-0.5, -0.2, 0.16], [0.1, -0.6, 0.14]]) { k.cyl(r, 0.02, x, y + 0.01, z, '#5fae54', { n: 12 }); if (r > 0.18) k.ball(0.07, x, y + 0.07, z, '#ff9fc2', { n: 8 }); } // lily pads, a flower
    if (dirty) for (let i = 0; i < 9; i++) { const a = i * 2.1, r = 0.3 + (i % 3) * 0.3; k.box(0.14, 0.01, 0.09, Math.cos(a) * r, y + 0.02, Math.sin(a) * r, i % 2 ? '#c98a3a' : '#a8742e', { ry: a, r: 0.02 }); } // fallen leaves
    // the Vault sign
    k.box(0.08, 0.6, 0.08, R + 0.25, 0, 0.6, WOOD); k.box(0.62, 0.3, 0.06, R + 0.25, 0.5, 0.64, '#f4e2bf', { r: 0.03 }); k.box(0.36, 0.08, 0.02, R + 0.25, 0.62, 0.68, '#3f8f6f');
  }, { blurb: 'Your Save jar, as a pond. It fills as you save.' });

  def('lm_windmill', 'Investing windmill', [2, 2], (k, sub) => {
    k.lathe([[0.75, 0], [0.62, 1.2], [0.48, 2.4], [0.001, 2.4]], 0, 0, 0, '#f2ead8', { n: 8 }); // the tower
    k.cone(0.62, 0.7, 0, 2.38, 0, '#c8604a', { n: 8 }); // the cap
    k.box(0.36, 0.6, 0.06, 0, 0, 0.66, WOOD, { r: 0.04 }); k.box(0.26, 0.26, 0.04, 0, 1.4, 0.5, '#9fd0ef', { r: 0.03 }); // the door, a window
    sub('blades', kk => { kk.cyl(0.08, 0.16, 0, -0.08, 0, '#5b4a5e', { rx: Math.PI / 2, n: 10 }); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; kk.box(0.22, 1.1, 0.03, Math.cos(a + Math.PI / 2) * 0.62, Math.sin(a + Math.PI / 2) * 0.62 - 0.55, 0.06, '#f7f3ea', { rz: a, r: 0.02 }); } }, 0, 2.3, 0.6);
  }, { blurb: 'Your investments, turning.', spin: 'blades' });

  def('lm_coins', 'Spend coins', [1, 1], (k, sub, rec) => {
    const n = Math.max(1, Math.min(6, rec.lv || 1));
    for (let i = 0; i < n; i++) { k.cyl(0.3, 0.07, Math.sin(i * 1.7) * 0.03, i * 0.075, Math.cos(i * 1.7) * 0.03, i % 2 ? GOLD : GOLD2, { n: 20 }); k.cyl(0.2, 0.072, Math.sin(i * 1.7) * 0.03, i * 0.075, Math.cos(i * 1.7) * 0.03, shade(GOLD, 0.15), { n: 16 }); }
  }, { blurb: 'Your Spend jar: a coin for every $3 in it.' });

  def('lm_flag', 'Your flag', [1, 1], (k, sub, rec) => {
    k.cyl(0.05, 2.6, 0, 0, 0, '#e8e4dc', { n: 8 }); k.ball(0.08, 0, 2.62, 0, GOLD, { n: 10 }); k.cyl(0.2, 0.1, 0, 0, 0, STONE2, { n: 12 });
    k.box(0.9, 0.55, 0.03, 0.47, 2.1, 0, rec.c || '#4DABF7', { r: 0.02 }); k.ball(0.12, 0.47, 2.1, 0.02, '#ffffff', { s: [1, 1, 0.2], n: 12 });
  }, { blurb: 'Your island, your flag.' });

  def('lm_rainbow', 'Rainbow', [4, 1], k => {
    const C = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
    C.forEach((c, i) => k.add(new T.TorusGeometry(1.9 - i * 0.13, 0.065, 8, 40, Math.PI), c, k._m(0, 0, 0, {}), {}));
    for (const x of [-1.9, 1.9]) for (let i = 0; i < 3; i++) k.ball(0.32 - i * 0.05, x + (i - 1) * 0.25, 0.15, (i % 2) * 0.15, '#ffffff', { s: [1, 0.7, 1], n: 12 }); // clouds at its feet
  }, { blurb: 'Every chore done today.' });

  def('lm_tree', 'Chore tree', [2, 2], (k, sub, rec) => {
    const kind = rec.k || 'round', b = '#7b4f30';
    k.cyl(0.16, 1.5, 0, 0, 0, b, { rt: 0.11, n: 9 });
    if (kind === 'pine') for (let i = 0; i < 3; i++) k.cone(0.95 - i * 0.22, 1.1, 0, 1.1 + i * 0.6, 0, i % 2 ? '#3f9a5a' : '#4aa865', { n: 9 });
    else { const c = kind === 'cherry' ? ['#ffb3c8', '#ff9fbb'] : ['#5fbf5a', '#4fae4f']; for (const [x, y, z, r, i] of [[0, 2.2, 0, 0.8, 0], [0.55, 1.9, 0.25, 0.55, 1], [-0.5, 1.95, -0.2, 0.58, 1], [0.1, 1.9, 0.55, 0.5, 0]]) k.ball(r, x, y, z, c[i], { n: 12 }); }
    if (kind === 'fruit') for (let i = 0; i < 8; i++) { const a = i * 0.8; k.ball(0.1, Math.cos(a) * 0.75, 1.9 + (i % 3) * 0.2, Math.sin(a) * 0.75, '#ff5a5a', { n: 8 }); }
    k.box(0.06, 0.5, 0.06, 0.7, 0, 0.7, WOOD); k.box(0.5, 0.24, 0.05, 0.7, 0.42, 0.72, '#f4e2bf', { r: 0.03 }); // its job's sign
  }, { blurb: 'One for every paid job you have.' });

  // ---------- keeping them in step with the kid's money (m: { save, invest, spend, jobs, done, hue, size, trees })
  const want = m => {
    const L = [['lm_flag', 0, { c: m.hue || '#4DABF7' }], ['lm_pond', 0, { lv: Math.max(0.15, Math.min(1, (m.save || 0) / 50)), dirty: !!m.pondDirty }]];
    if ((m.invest || 0) > 0) L.push(['lm_windmill', 0, {}]);
    if ((m.spend || 0) > 0) L.push(['lm_coins', 0, { lv: Math.min(6, Math.ceil(m.spend / 3)) }]);
    if (m.done) L.push(['lm_rainbow', 0, {}]);
    const n = Math.min(m.jobs || 0, 8 + 4 * (m.size || 0)), kinds = m.trees && m.trees.length ? m.trees : ['round'];
    for (let i = 0; i < n; i++) L.push(['lm_tree', i, { k: kinds[i % kinds.length] }]);
    return L;
  };
  // list: the home's items; spot(def): somewhere free for a new one. Returns { added, changed, removed } (records)
  function sync(list, m, spot) {
    const out = { added: [], changed: [], removed: [] }, W = want(m), keep = new Set();
    for (const [t, n, props] of W) {
      const have = list.filter(it => it.t === t)[n];
      if (have) { keep.add(have); const diff = Object.keys(props).some(p => have[p] !== props[p]); if (diff) { Object.assign(have, props); out.changed.push(have); } continue; }
      const at = spot(BY[t]); if (!at) continue;
      const rec = { id: 'lm' + Math.random().toString(36).slice(2, 9), t, ...at, ...props }; list.push(rec); keep.add(rec); out.added.push(rec);
    }
    for (let i = list.length - 1; i >= 0; i--) { const it = list[i]; if (BY[it.t] && BY[it.t].landmark && !keep.has(it)) { list.splice(i, 1); out.removed.push(it); } }
    return out;
  }
  IH.landmarks = { sync, want, is: t => !!(BY[t] && BY[t].landmark) };
})();
