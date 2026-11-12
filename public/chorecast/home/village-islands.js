/* Chorecast homes (a prototype): what there is to do on the islands from islands-more.js. village.js calls
   IH.villageIslands(ctx) once and adds the acts it gives to its own (ctx carries what it needs from there: walkTo,
   chore, toast, ride and so on, and V, the place that's open). Utility islands make things, kept in the save per
   island (shop.isl(id)); vacation islands are for playing, with books to fill and a little XP for each first find. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {}, T = window.THREE;
  const DAY = 864e5, today = () => Math.floor(Date.now() / DAY);
  const CROPS = { carrot: { e: '🥕', name: 'carrots', seed: 10, days: 2, n: 4 }, lettuce: { e: '🥬', name: 'lettuces', seed: 10, days: 2, n: 2 }, tomato: { e: '🍅', name: 'tomatoes', seed: 15, days: 3, n: 4 }, pumpkin: { e: '🎃', name: 'pumpkins', seed: 20, days: 3, n: 2, goods: true }, strawberry: { e: '🍓', name: 'strawberries', seed: 15, days: 2, n: 6, goods: true },
    // (from the language islands' specialities: only once they're bought, lang-islands.js)
    tea: { e: '🍵', name: 'tea', seed: 8, days: 3, n: 3, goods: true, special: 'tea' }, rice: { e: '🌾', name: 'rice', seed: 8, days: 3, n: 4, goods: true, special: 'rice' },
    // (2026-11-11: seed potatoes and sweetcorn, for the planters and harvesters as well as by hand)
    potato: { e: '🥔', name: 'potatoes', seed: 15, days: 3, n: 6, goods: true }, corn: { e: '🌽', name: 'sweetcorn', seed: 15, days: 4, n: 5, goods: true } };
  const FRUIT = { apple: { e: '🍎', n: 3 }, lemon: { e: '🍋', n: 3, goods: true }, feijoa: { e: '🍐', n: 4, goods: true }, orange: { e: '🍊', n: 3, goods: true }, olive: { e: '🫒', n: 4, goods: true } };
  const STABLE_SHOP = [['horse', '🐴', 'Horse', 1200, 3, 'To ride in the arena.'], ['pony', '🐎', 'Pony', 900, 2, 'A smaller ride.'], ['donkey', '🫏', 'Donkey', 600, 1, 'A gentle friend for the paddock.'], ['merino', '🐑', 'Merino sheep', 400, 4, 'A bag of wool every two days.'], ['kunekune', '🐷', 'Kunekune pig', 350, 2, 'Finds a truffle every two days.']];
  const BIRDS = [['tui', 'a tūī', '🐦'], ['fantail', 'a pīwakawaka (fantail)', '🐦'], ['kereru', 'a kererū', '🕊️'], ['ruru', 'a ruru (morepork)', '🦉'], ['weka', 'a weka', '🐦'], ['takahe', 'a takahē', '🐦'], ['bellbird', 'a korimako (bellbird)', '🐦'], ['kaka', 'a kākā', '🦜']];

  IH.villageIslands = c => {
    const V = () => c.V, sh = () => c.V.stage.shop, st = id => sh().isl(id), save = () => sh().farmSave();
    // (a job done by hand, counted on the farm: enough of one unlocks the machine that does it, farm-why.js)
    const cnt = key => { const f = sh().farm && sh().farm(); if (f && IH.farmWhy) { IH.farmWhy.count(f, key, c.toast); save(); } };
    // a look at something: walk there, a while, then the words (and, the first time, a find in a book)
    const look = (s, secs, words, gives, emo, book, fxo) => c.chore(s, 'look', secs, () => {
      if (gives) sh().relax(gives); if (emo) c.float(V().kid, emo); c.sound('pop');
      if (book) { const b = sh().book(book[0], book[1]); if (b.isNew) { sh().xp(10); c.xp(); return c.toast(`${words} New in your ${book[2]} (${b.count}): ✨ +10 XP.`); } }
      c.toast(words);
    }, null, fxo || {});
    // ---------- the Veggie plot
    const bedState = i => { const P = st('plot'); P.beds = P.beds || []; return P.beds[i] || (P.beds[i] = {}); };
    /* ---------- the soil (2026-11-11, phase C): a bed's ground can be worked before a crop goes in and looked after
       while it grows. None of it is needed (sow it, water it, it grows), but each thing done properly adds to the
       harvest, up to three more: dug or ploughed (b.plough), raked fine or tilled or disced (b.till), a power-harrowed
       seedbed (b.fine), rolled after sowing (b.roll), fed with compost, fertiliser or muck (b.fed), deep-ripped by the
       subsoiler (b.deep: the next 3 crops), limed (b.lime: the next 5 crops). Weeds come up in a planted bed left two
       days without hoeing, and cost one. Picking clears what was for this crop; deep ripping and lime count down. */
    const weedy = b => !!b.crop && bedStage(b) < 3 && today() - (b.weeded || b.planted || today()) >= 2;
    const bonusOf = b => Math.min(3, (b.plough ? 1 : 0) + (b.till ? 1 : 0) + (b.fine ? 1 : 0) + (b.roll ? 1 : 0) + (b.fed ? 1 : 0) + (b.deep > 0 ? 1 : 0) + (b.lime > 0 ? 1 : 0)) - (weedy(b) ? 1 : 0);
    const yieldOf = b => Math.max(1, CROPS[b.crop].n + bonusOf(b));
    function cleared(b) { const keep = { deep: Math.max(0, (b.deep || 0) - 1), lime: Math.max(0, (b.lime || 0) - 1) }; for (const k of Object.keys(b)) delete b[k]; if (keep.deep) b.deep = keep.deep; if (keep.lime) b.lime = keep.lime; }
    const soilOf = b => ({ plough: !!b.plough, till: !!(b.till || b.fine), fine: !!b.fine, roll: !!b.roll, fed: b.fed || null, weeds: weedy(b), lime: b.lime > 0 });
    const bedStage = b => { if (!b.crop) return -1; const C = CROPS[b.crop], w = (b.watered || []).length; return w >= C.days ? 3 : Math.min(2, w); };
    const drawBeds = () => { const B = V().B; if (!B.drawBed) return; B.beds.forEach((_, i) => { const b = bedState(i); B.drawBed(i, b.crop, Math.max(0, bedStage(b)), soilOf(b)); }); };
    function seedPanel(i) {
      c.shopTray({ key: 'seeds', title: `🌱 Seeds for bed ${i + 1}`, info: `✨ farm ${Math.round(sh().farmAcct().bal).toLocaleString()}`, note: 'Pick the seeds. Water the bed once a day; it’s ready after a few days of watering.',
        cards: Object.entries(CROPS).filter(([, C]) => !C.special || ((sh().farm() || {}).specials || {})[C.special]).map(([id, C]) => ({ e: C.e, name: C.name[0].toUpperCase() + C.name.slice(1), sub: `${C.days} days · ${C.n} to pick`, tag: sh().cardPrice(C.seed), attrs: `data-v="isl" data-k="plant:${i}:${id}"` })) });
    }
    function plant(i, id) {
      const C = CROPS[id]; if (!C) return; const sp = V().B.spots.find(q => q.kind === 'bed' && q.i === i);
      // (a field block's seed shed: a tray filled at the potting bench, carried out, the seeds put in with the trowel and
      // firmed down, the empty tray taken back; the seeds are paid for when they go in)
      if (sp && sp.hut && c.steps) {
        if (sh().farmAcct().bal + sh().wallet().left < C.seed) return c.toast(`You need ✨ ${C.seed} for the seeds.`);
        document.querySelector('.vg-game').hidden = true; c.closeTray(); const H = sp.hut, A = H.at;
        c.steps([{ go: A.bench }, { act: 'fetch', secs: 1.3, fx: { kind: 'soil', dist: 0.55, y: 0.95, rate: 8 } }, { take: H.parts.tray, hold: 'tray' }, { go: { x: sp.at[0], z: sp.at[1], yaw: sp.yaw } },
          { act: 'fetch', secs: 1.6, tool: 'trowel', fx: { kind: 'soil', dist: 0.6, y: 0.75, rate: 10 } }, { act: 'pat', secs: 1.3 },
          { run: () => { if (!sh().farmPay(C.seed, 'the seeds')) return; const b = bedState(i); Object.assign(b, { crop: id, planted: today(), watered: [] }); cnt('plant'); save(); drawBeds(); c.sound('place'); c.xp(); c.toast(`${C.name[0].toUpperCase() + C.name.slice(1)} planted! Water them every day.`); } },
          { go: A.bench }, { put: H.parts.tray }], { name: 'Planting' });
        return;
      }
      if (!sh().farmPay(C.seed, 'the seeds')) return; const b = bedState(i); Object.assign(b, { crop: id, planted: today(), watered: [] }); cnt('plant'); save();
      const s = V().B.spots.find(q => q.kind === 'bed' && q.i === i); document.querySelector('.vg-game').hidden = true; c.closeTray();
      c.chore(s, 'fetch', 2.4, () => { drawBeds(); c.toast(`${C.name[0].toUpperCase() + C.name.slice(1)} planted! Water them every day.`); c.sound('place'); }, null, { tool: 'trowel', fx: 'soil', dist: 0.7, y: 0.75, rate: 9 }); c.xp();
    }
    function water(s) {
      const b = bedState(s.i); if ((b.watered || []).includes(today())) return c.toast('Already watered today. Come back tomorrow.');
      if (!V().can) return c.toast('Your watering can’s empty. Fill it at the water tank.');
      c.chore(s, 'water', 2.4, () => { V().can -= 1; (b.watered = b.watered || []).push(today()); cnt('water'); save(); drawBeds(); c.float(V().kid, '💧'); c.sound('pop'); c.toast(bedStage(b) === 3 ? 'Ready to pick!' : `Watered. ${CROPS[b.crop].days - b.watered.length} more day${CROPS[b.crop].days - b.watered.length === 1 ? '' : 's'} of watering.`); }, null, { tool: 'can', fx: 'drops', at: 'hand', rate: 22, delay: 0.6 });
    }
    function harvest(s) {
      const b = bedState(s.i), C = CROPS[b.crop], n = yieldOf(b), extra = n - C.n;
      c.chore(s, 'fetch', 2.6, () => { if (C.goods) sh().addGoods(b.crop, n); else sh().addFood(b.crop, n); cleared(b); cnt('harvest'); save(); drawBeds(); c.float(V().kid, C.e); c.sound('buy'); c.toast(`${n} ${C.name}${extra > 0 ? ` (${extra} more for the work you put into the soil)` : extra < 0 ? ' (the weeds took some)' : ''}! ${C.goods ? 'On your goods shelf: sell them at the grocer.' : 'Into your fridge at home.'}`); }, null, { tool: 'basket', fx: 'soil', dist: 0.7, y: 0.75, rate: 8 });
    }
    /* ---------- the bed by hand (the seed shed's tools): dig it over with the spade, rake it fine, hoe the weeds,
       spread compost from the sack; each tool off the rack, to the bed and worked, then back on the rack. The
       machines do the same jobs faster (farm.js), these are how a new farm starts. */
    const HAND = {
      dig: { e: '⛏️', label: 'Dig it over', tool: 'spade', part: 'spade', ok: b => !b.crop && !b.plough, did: b => { b.plough = 1; }, says: 'Dug over: the soil’s turned.', fx: 'soil', secs: [1.8, 1.8] },
      rake: { e: '🧹', label: 'Rake it fine', tool: 'rake', part: 'rake', ok: b => !b.crop && !b.till, did: b => { b.till = 1; }, says: 'Raked fine and level: a good seedbed.', fx: 'soil', secs: [1.6, 1.6] },
      hoe: { e: '🌿', label: 'Hoe the weeds', tool: 'hoe', part: 'hoe', ok: b => weedy(b), did: b => { b.weeded = today(); }, says: 'Weeds hoed out.', fx: 'leaves', secs: [1.5, 1.5] },
      compost: { e: '🟤', label: 'Spread compost · ✨ 4', tool: 'sack', part: 'compost', ok: b => !b.fed && bedStage(b) < 3, did: b => { b.fed = 'compost'; }, says: 'Compost spread: well fed.', fx: 'soil', secs: [1.4, 1.6], xp: 4 }
    };
    function byHand(s, what) {
      const H0 = HAND[what], b = bedState(s.i); if (!H0.ok(b)) return;
      const go = { x: s.at[0], z: s.at[1], yaw: s.yaw }, work = H0.secs.map((t, q) => ({ act: what === 'compost' ? 'feed' : 'fetch', secs: t, fx: { kind: H0.fx, dist: 0.8, y: 0.75, rate: q ? 12 : 9 } }));
      const apply = () => { if (H0.xp && !sh().farmPay(H0.xp, 'compost')) return; H0.did(bedState(s.i)); cnt(what); save(); drawBeds(); c.sound('pop'); c.toast(H0.says); };
      const hut = s.hut, P = hut && hut.parts[H0.part];
      if (hut && P && c.steps) return c.steps([{ go: hut.at.rack || hut.at.bench }, { take: P, hold: H0.tool }, { go }, ...work, { run: apply }, { go: hut.at.rack || hut.at.bench }, { put: P }], { name: H0.label.replace(/ ·.*/, '') });
      c.chore(s, work[0].act, 3, apply, null, { tool: H0.tool, fx: H0.fx, dist: 0.8, y: 0.75, rate: 10 });
    }
    // ---------- the Orchard terrace
    const ripe = i => { const O = st('orchard'); O.picked = O.picked || {}; const p = O.picked[i]; return !p || Date.now() - p >= 2 * DAY; };
    /* ---------- looking after the trees (phase E): pruned (lasts 14 days), sprayed (5 days), mulched (5 days); each
       adds one to the next picking, up to three. By hand or by machine (farm.js), the same as the beds. */
    const care = i => { const O = st('orchard'); O.care = O.care || {}; return O.care[i] || (O.care[i] = {}); };
    const within = (d, n) => d != null && today() - d < n;
    const treeBonus = i => { const C = care(i); return Math.min(3, (within(C.pr, 14) ? 1 : 0) + (within(C.sp, 5) ? 1 : 0) + (within(C.mu, 5) ? 1 : 0)); };
    const drawFruit = () => { const B = V().B; if (B.trees) for (const t of B.trees) { t.fruit.visible = ripe(t.i); if (t.mulch) t.mulch.visible = within(care(t.i).mu, 5); } };
    const fruitName = k0 => (k0 === 'feijoa' ? 'feijoas' : k0 === 'olive' ? 'olives' : k0 + 's');
    function picked(i, kind, keep) { const F = FRUIT[kind], n = F.n + treeBonus(i); st('orchard').picked[i] = Date.now(); save(); drawFruit(); if (!keep) { if (F.goods) sh().addGoods(kind, n); else sh().addFood(kind, n); } return n; }
    // a ladder stood against a tree while it's picked (the packing shed's own, carried out and back)
    function ladderAt(x, z, yaw) { const k = new IH.kit.Kit(); for (const e of [-0.25, 0.25]) k.box(0.06, 3.1, 0.08, e, 0, 0, '#c9a173', { r: 0.02 }); for (let y = 0.3; y < 3.0; y += 0.32) k.box(0.5, 0.05, 0.06, 0, y, 0, '#b08a5a', { r: 0.02 }); const g = new T.Group(); g.add(k.build()); g.position.set(x, 0, z); g.rotation.set(0, yaw, 0); g.rotateX(-0.28); V().B.root.add(g); return g; }
    function pick(s) {
      if (!ripe(s.i)) return c.toast('Not ripe yet. Fruit comes back every two days.');
      // (with a packing shed: the ladder carried out and stood against the tree, the fruit picked into the basket, the
      // basket carried in to the grading table, then back for the ladder)
      if (s.hut && c.steps && s.hut.parts.ladder) {
        const H = s.hut, A = H.at, P = H.parts, tr = { x: s.at[0], z: s.at[1], yaw: s.yaw }; let lad = null;
        const drop = () => { if (lad) { V().B.root.remove(lad); lad = null; } };
        return c.steps([{ go: A.ladder }, { take: P.ladder, hold: 'ladder' }, { go: tr }, { run: () => { lad = ladderAt(s.hit[0] + Math.sin(s.yaw + Math.PI) * 0.75, s.hit[1] + Math.cos(s.yaw + Math.PI) * 0.75, s.yaw + Math.PI); } }, { hold: null }, { act: 'place', secs: 0.8 },
          { act: 'fetch', secs: 1.2, fx: { kind: 'leaves', dist: 0.7, y: 2.4, rate: 6 } }, { act: 'fetch', secs: 1.2, fx: { kind: 'leaves', dist: 0.7, y: 2.6, rate: 6 } }, { act: 'fetch', secs: 1.2, fx: { kind: 'leaves', dist: 0.7, y: 2.3, rate: 6 } }, { hold: 'basketf' },
          { run: () => { const n = picked(s.i, s.fruit); cnt('pick'); c.float(V().kid, FRUIT[s.fruit].e); c.sound('buy'); c.toast(`${n} ${fruitName(s.fruit)}${treeBonus(s.i) ? ` (${treeBonus(s.i)} more for looking after the tree)` : ''}! ${FRUIT[s.fruit].goods ? 'On your goods shelf.' : 'Into your fridge.'}`); } },
          { go: A.grade }, { act: 'place', secs: 1.0 }, { hold: null }, { go: tr }, { run: drop }, { hold: 'ladder' }, { go: A.ladder }, { put: P.ladder }],
        { name: 'Picking', cancel: drop });
      }
      c.chore(s, 'fetch', 2.6, () => { const F = FRUIT[s.fruit], n = picked(s.i, s.fruit); cnt('pick'); c.float(V().kid, F.e); c.sound('buy'); c.toast(`${n} ${fruitName(s.fruit)}! ${F.goods ? 'On your goods shelf.' : 'Into your fridge.'}`); }, null, { tool: 'basket', fx: 'leaves', dist: 1.0, y: 2.6, rate: 6 });
    }
    // pruning by hand: the secateurs from the packing shed, the tree shaped (twigs fly), the secateurs hung back
    function prune(s) {
      if (within(care(s.i).pr, 14)) return c.toast('Pruned already. Prune it again in a couple of weeks.');
      const apply = () => { care(s.i).pr = today(); cnt('prune'); save(); c.sound('pop'); c.toast('Pruned: more fruit next picking. ✂️'); };
      const H = s.hut, P = H && H.parts.secateurs;
      if (!P || !c.steps) return c.chore(s, 'chop', 3, apply, null, { tool: 'shears', fx: 'leaves', dist: 0.8, y: 2.0, rate: 10 });
      c.steps([{ go: H.at.secateurs }, { take: P, hold: 'shears' }, { go: { x: s.at[0], z: s.at[1], yaw: s.yaw } }, { act: 'chop', secs: 1.8, fx: { kind: 'leaves', dist: 0.8, y: 2.1, rate: 10 } }, { act: 'chop', secs: 1.8, fx: { kind: 'leaves', dist: 0.8, y: 1.7, rate: 10 } }, { run: apply }, { go: H.at.secateurs }, { put: P }], { name: 'Pruning' });
    }
    function honey(s) {
      const O = st('orchard'), last = O.honey || 0; if (last && Date.now() - last < 3 * DAY) return c.toast('The bees are still making it. Honey every three days.');
      // (with a honey house or a packing shed: the smoker lit, the bees calmed, a frame lifted out and carried in,
      // uncapped, spun in the extractor, the honey run off into jars and shelved)
      if (s.hut && c.steps) {
        const H = s.hut, A = H.at, P = H.parts, reel = P.reel;
        c.steps([P.smoker ? { go: A.smoker } : null, P.smoker ? { take: P.smoker, hold: 'smoker' } : { hold: 'smoker' }, { act: 'fetch', secs: 1.0, fx: { kind: 'smoke', dist: 0.4, y: 1.1, rate: 6 } },
          { go: { x: s.at[0], z: s.at[1], yaw: s.yaw } }, { act: 'water', secs: 2.2, fx: { kind: 'smoke', dist: 0.9, y: 1.2, rate: 10 } }, { act: 'fetch', secs: 1.4, fx: { kind: 'sparkle', dist: 0.7, y: 1.4, rate: 4 } }, { hold: 'frame' },
          { go: A.uncap || A.bench }, { act: 'chop', secs: 1.8 }, { hold: null }, { go: A.reel }, { run: () => { if (reel && c.tween) c.tween(reel, 'y', reel.rotation.y + Math.PI * 14, 3.0); } }, { act: 'stir', secs: 3.0, sound: 'pat' },
          { act: 'place', secs: 1.4, tool: 'jar' }, { go: A.jars }, { act: 'place', secs: 1.0, tool: 'jar' },
          { run: () => { O.honey = Date.now(); save(); sh().addFood('honey', 2); c.float(V().kid, '🍯'); c.sound('buy'); c.toast('Two jars of honey, spun and on the shelf, and into your pantry! 🐝'); } },
          P.smoker ? { go: A.smoker } : null, P.smoker ? { put: P.smoker } : { hold: null }], { name: 'Getting the honey' });
        return;
      }
      c.chore(s, 'fetch', 3, () => { O.honey = Date.now(); save(); sh().addFood('honey', 2); c.float(V().kid, '🍯'); c.sound('buy'); c.toast('Two jars of honey into your pantry! 🐝'); }, null, { tool: 'jar', fx: 'smoke', dist: 1.1, y: 1.4, rate: 6 });
    }
    function jam(s) {
      const g = sh().goods(), f = sh().food ? sh().food() : {}, have = (g.lemon || 0) + (g.feijoa || 0) + (f.apple || 0); if (have < 3) return c.toast('You need three fruit to make jam (apples, lemons or feijoas).');
      // (the packing shed: fruit from the grading table, washed at the sink, chopped on the bench, cooked down in the pot
      // on the stove, ladled into jars and shelved; the fruit's used when it goes in the pot)
      if (s.hut && c.steps) {
        const H = s.hut, A = H.at;
        c.steps([{ go: A.grade }, { act: 'fetch', secs: 1.2 }, { hold: 'basketf' }, { go: A.sink }, { act: 'dishes', secs: 1.8, fx: { kind: 'splash', dist: 0.55, y: 0.85, rate: 10 } }, { go: A.bench }, { act: 'chop', secs: 2.2 }, { hold: null },
          { go: A.stove }, { run: () => { let need = 3; for (const k of ['feijoa', 'lemon']) while (need && sh().useGoods(k)) need--; while (need && sh().useFood('apple')) need--; } }, { act: 'stir', secs: 3.4, fx: { kind: 'steam', dist: 0.5, y: 1.15, rate: 5 } }, { act: 'place', secs: 1.4, tool: 'jar' },
          { go: A.jars }, { act: 'place', secs: 1.0, tool: 'jar' }, { run: () => { sh().addGoods('jam'); c.float(V().kid, '🫙'); c.sound('buy'); c.toast('A jar of jam, on the shelf and on your goods shelf at home! The grocer pays ✨ 85 for it.'); } }], { name: 'Making jam' });
        return;
      }
      c.chore(s, 'stir', 4, () => { let need = 3; for (const k of ['feijoa', 'lemon']) while (need && sh().useGoods(k)) need--; while (need && sh().useFood('apple')) need--; sh().addGoods('jam'); c.float(V().kid, '🫙'); c.sound('buy'); c.toast('A jar of jam! The grocer pays ✨ 85 for it.'); }, null, { fx: 'steam', dist: 0.7, y: 1.2, rate: 5 });
    }
    // ---------- the Stable yard
    const stab = () => { const S = st('stable'); S.animals = S.animals || { horse: 1, merino: 1 }; S.got = S.got || {}; return S; };
    function tackShop() {
      const S = stab(); c.shopTray({ key: 'tack', title: '🐴 Stables & tack', info: `✨ farm ${Math.round(sh().farmAcct().bal).toLocaleString()}`, qty: sh().qtyBar('isl', 'tack'), note: 'Horses to ride, and friends for the paddock.',
        cards: STABLE_SHOP.map(([k, e, name, xp, cap, about]) => { const n = S.animals[k] || 0; return { e, name, sub: `${n} / ${cap} · ${about}`, tag: n >= cap ? '<span class="ih-own">Full</span>' : sh().cardPrice(xp), attrs: `data-v="isl" data-k="sbuy:${k}"`, off: n >= cap }; }) });
    }
    function stableBuy(kind) {
      const S = stab(), it = STABLE_SHOP.find(q => q[0] === kind); if (!it || (S.animals[kind] || 0) >= it[4]) return;
      const n = Math.max(1, sh().qtyN(Math.min(it[4] - (S.animals[kind] || 0), Math.floor((sh().farmAcct().bal + sh().wallet().left) / it[3]))));
      if (!sh().farmPay(it[3] * n, n > 1 ? `${n} × ${it[2].toLowerCase()}` : 'a ' + it[2].toLowerCase())) return;
      S.animals[kind] = (S.animals[kind] || 0) + n; if (!S.got[kind]) S.got[kind] = Date.now(); save();
      const B = V().B; for (let q = 0; q < n; q++) { const a = IH.islandsBuild.MAKE[kind](), pen = B.pens[kind]; a.pen = pen; a.group.position.set((pen[0] + pen[2]) / 2 + (q - (n - 1) / 2) * 1.6, 0, (pen[1] + pen[3]) / 2); B.root.add(a.group); B.animals.push(a); }
      c.toast(n > 1 ? `Welcome, ${n} × ${it[2].toLowerCase()}! ${it[1]}` : `Welcome, ${it[2].toLowerCase()}! ${it[1]}`); c.xp(); tackShop();
    }
    const stableFed = () => (stab().fed || 0) >= today() - 1;
    function stableCollect(s, kind, what, every, emo) {
      const S = stab(), n = S.animals[kind] || 0; if (!n) return c.toast(kind === 'merino' ? 'No sheep yet. The tack room has merinos.' : 'No pig yet. The tack room has kunekunes.');
      if (!stableFed()) return c.toast('Feed them hay at the barn first.');
      const last = S.got[kind] || 0, batches = last ? Math.min(3, Math.floor((Date.now() - last) / (every * DAY))) : 1; if (!batches) return c.toast('Nothing yet. Come back in a day or two.');
      c.chore(s, kind === 'merino' ? 'chop' : 'fetch', 3, () => { S.got[kind] = Date.now(); save(); sh().addGoods(what, batches * n); c.float(V().kid, emo); c.sound('buy'); c.toast(`${batches * n} ${what === 'wool' ? 'bag' + (batches * n === 1 ? '' : 's') + ' of wool' : 'truffle' + (batches * n === 1 ? '' : 's')}! On your goods shelf.`); }, null, kind === 'merino' ? { tool: 'shears', fx: 'wool', dist: 0.8, y: 0.9, rate: 10 } : { fx: 'soil', dist: 1.0, y: 0.1, rate: 10 });
    }
    function rideArena(s) {
      const S = stab(); if (!(S.animals.horse || S.animals.pony)) return c.toast('You need a horse or a pony. The tack room has them.');
      if (!sh().daily('ride', 3)) return c.toast('The horses are tired. Three rides a day.');
      c.walkTo(s.at[0], s.at[1], ok => { if (!ok) return; const A = s.loop, B = V().B, kind = S.animals.horse ? 'horse' : 'pony', a3 = IH.islandsBuild.MAKE[kind](), m = a3.group; B.root.add(m);
        c.ride({ dur: 16, lift: a3.d3 ? (kind === 'pony' ? 1.15 : 1.7) : kind === 'pony' ? 0.95 : 1.35, model: m, a3: a3.d3 ? a3 : null, pose: 'sitchair', bob: a3.d3 ? 0 : 0.06, at: u => { const a = Math.PI + u * Math.PI * 2; return [A.x + Math.cos(a) * (A.rx - 2), 0, A.z + Math.sin(a) * (A.rz - 2)]; },
          end: () => { B.root.remove(m); sh().xp(10); sh().relax({ fun: 18 }); c.xp(); c.toast('What a ride! A riding lesson: ✨ +10 XP. 🐴'); } }); }, s.yaw);
    }
    // ---------- vacation rides: the kayak, the balloon; the kite
    function kayak(s) {
      c.walkTo(s.at[0], s.at[1], ok => { if (!ok) return; const L = s.loop, B = V().B, k = new IH.kit.Kit(); k.ball(0.5, 0, 0.12, 0, '#ffd35a', { s: [0.8, 0.45, 4.2], n: 10 }); k.cyl(0.03, 2.6, 0, 0.6, 0, '#6b4a33', { n: 4, rz: Math.PI / 2 }); const m = k.build(); B.root.add(m);
        c.ride({ dur: 22, lift: -0.25, model: m, pose: 'sitchair', bob: 0.03, at: u => { const a = -Math.PI / 2 + u * Math.PI * 2; return [L.x + Math.cos(a) * (L.rx - 5), 0, L.z + Math.sin(a) * (L.rz - 4)]; },
          end: () => { B.root.remove(m); sh().relax({ fun: 20, energy: -4 }); c.toast('Round the lake and back! 🛶'); } }); }, s.yaw);
    }
    function balloon(s) {
      if (!sh().daily('balloon', 3)) return c.toast('The balloon’s resting. Three trips a day.');
      c.walkTo(s.at[0], s.at[1], ok => { if (!ok) return; const b = s.balloon, x = b.position.x, z = b.position.z, y0 = b.position.y;
        c.ride({ dur: 18, lift: 0.35, model: b, pose: 'happy', at: u => [x + Math.sin(u * Math.PI * 2) * 2, y0 + Math.sin(u * Math.PI) * 14, z + Math.sin(u * Math.PI) * 3], end: () => { b.position.set(x, y0, z); sh().relax({ fun: 22 }); c.toast('Up above the clouds and back down! 🎈'); } }); }, s.yaw);
    }
    function kite(s) {
      c.chore(s, 'happy', 8, () => { const K = V().B.kite; if (K) K.visible = false; sh().relax({ fun: 15 }); c.toast('The kite flew so high! 🪁'); });
      setTimeout(() => { const v = V(); if (!v || !v.B.kite) return; const K = v.B.kite; K.position.set(s.at[0] + 3, 0, s.at[1] - 4); K.userData.y = 8; K.visible = true; }, 2500);
    }

    // the field machines (farm.js): straight onto the beds, no watering can, no walking
    // the orchard machines (farm.js): straight onto the trees
    IH.orchardOps = {
      work(i, job) { const C = care(i); const k0 = { prune: 'pr', spray: 'sp', mulch: 'mu' }[job]; if (!k0 || within(C[k0], k0 === 'pr' ? 14 : 5)) return false; C[k0] = today(); save(); return true; },
      lift(i, kind, ok) { if (!ripe(i) || (ok && !ok(kind))) return null; return { id: kind, n: picked(i, kind, true) }; }, // (into the machine's bins: stored when they're unloaded)
      store(id, n) { const F = FRUIT[id]; if (!F) return; if (F.goods) sh().addGoods(id, n); else sh().addFood(id, n); },
      ready: i => ripe(i), redraw: () => drawFruit(), name: k0 => fruitName(k0), e: k0 => (FRUIT[k0] || {}).e
    };
    IH.bedOps = {
      crops: f => Object.keys(CROPS).filter(id => !CROPS[id].special || ((f || {}).specials || {})[CROPS[id].special]),
      label: id => `${CROPS[id].e} ${CROPS[id].name[0].toUpperCase() + CROPS[id].name.slice(1)}`, name: id => CROPS[id].name, seedCost: id => CROPS[id].seed,
      empty: i => !bedState(i).crop,
      plant(i, id) { const b = bedState(i); if (b.crop || !CROPS[id]) return false; Object.assign(b, { crop: id, planted: today(), watered: [] }); save(); return true; },
      water(i) { const b = bedState(i); if (!b.crop || bedStage(b) === 3 || (b.watered || []).includes(today())) return false; (b.watered = b.watered || []).push(today()); save(); return true; },
      plough(i) { const b = bedState(i); if (b.crop || b.plough) return false; b.plough = 1; save(); return true; },
      // (phase C: one call per machine's job; each says whether it did anything to this bed)
      work(i, job, o = {}) {
        const b = bedState(i), g = bedStage(b), done = () => { save(); return true; };
        if (job === 'subsoil') { if (b.crop || b.deep > 0) return false; b.deep = 3; return done(); }
        if (job === 'till') { if (b.crop || b.till) return false; b.till = 1; return done(); }
        if (job === 'fine') { if (b.crop || b.fine) return false; b.fine = 1; b.till = 1; return done(); }
        if (job === 'roll') { if (!b.crop || g === 3 || b.roll) return false; b.roll = 1; return done(); }
        if (job === 'feed') { if (b.fed || g === 3) return false; b.fed = o.kind || 'fert'; return done(); }
        if (job === 'lime') { if (b.lime > 0) return false; b.lime = 5; return done(); }
        if (job === 'weed') { if (!weedy(b)) return false; b.weeded = today(); return done(); }
        return false;
      },
      // the harvesters: a ready bed's crop into the hopper (the bed's cleared); { id, n } or null
      lift(i, ok) { const b = bedState(i); if (!b.crop || bedStage(b) !== 3 || (ok && !ok(b.crop))) return null; const id = b.crop, n = yieldOf(b); cleared(b); save(); return { id, n }; },
      store(id, n) { const C = CROPS[id]; if (!C) return; if (C.goods) sh().addGoods(id, n); else sh().addFood(id, n); },
      crop: id => CROPS[id], weedy: i => weedy(bedState(i)), bonus: i => bonusOf(bedState(i)), // (the extra the next pick gets: what a machine adds is the change) ready: i => { const b = bedState(i); return !!b.crop && bedStage(b) === 3; },
      redraw: () => drawBeds()
    };
    /* ---------- the stable (walk-in): grooming a horse at the cross-ties (the brush from the tack room, the horse led
       in from the arena, brushed down, its feet picked out, led back), mucking out the boxes (the fork, the straw) */
    function groomSeries(s) {
      const B = V().B, Bw = B.stableW; if (!Bw || !c.steps) return false;
      if (sh().dailyLeft('groom', 1) <= 0) { c.toast('They’re shining already. Groom them again tomorrow.'); return true; }
      const h = B.animals.find(a => a.kind === 'horse') || B.animals.find(a => a.kind === 'pony'), ar = B.spots.find(q => q.kind === 'arena'); if (!h || !ar) return false;
      const A = Bw.at, P = Bw.parts, gate = { x: ar.at[0], z: ar.at[1], yaw: ar.yaw };
      const lead = () => { h.follow = 1; h.hold = null; h.st = null; }, free = () => { h.follow = 0; h.hold = null; h.st = null; };
      c.steps([{ go: A.brush }, { take: P.brush, hold: 'brush' }, { go: gate }, { act: 'pat', secs: 1.2, then: lead }, { go: A.door }, { go: A.groom }, { run: () => { h.follow = 0; h.hold = A.ties; } }, { until: () => Math.hypot(h.group.position.x - A.ties.x, h.group.position.z - A.ties.z) < 0.3, max: 10 }, { wait: 0.4 },
        { act: 'pat', secs: 2.6, fx: { kind: 'dust', dist: 0.8, y: 1.1, rate: 8 } }, { act: 'fetch', secs: 1.2 }, { act: 'pat', secs: 1.4, fx: { kind: 'sparkle', dist: 0.8, y: 1.3, rate: 5 } },
        { run: lead }, { go: A.door }, { go: gate }, { run: free }, { wait: 0.6 }, { go: A.brush }, { put: P.brush },
        { run: () => { if (!sh().daily('groom', 1)) return; sh().xp(5); sh().relax({ fun: 8 }); c.xp(); c.float(V().kid, '✨'); c.toast('Brushed, hooves picked out, gleaming! ✨ +5 XP'); } }],
      { name: 'Grooming', cancel: free });
      return true;
    }
    function muckOut(s) {
      const Bw = V().B.stableW; if (sh().dailyLeft('muck', 1) <= 0) return c.toast('The boxes are clean. Muck out again tomorrow.');
      if (!Bw || !c.steps) return c.chore(s, 'fetch', 3, () => { if (sh().daily('muck', 1)) { sh().xp(5); c.xp(); c.toast('Fresh straw down! ✨ +5 XP'); } }, null, { tool: 'fork', fx: 'straw', dist: 0.8, y: 0.3, rate: 12 });
      const A = Bw.at, P = Bw.parts, L = [{ go: A.fork }, { take: P.fork, hold: 'fork' }];
      for (const b of A.boxes) L.push({ go: b }, { act: 'fetch', secs: 1.6, fx: { kind: 'straw', dist: 0.9, y: 0.3, rate: 12 } }, { act: 'fetch', secs: 1.3, fx: { kind: 'straw', dist: 0.9, y: 0.3, rate: 12 } });
      L.push({ go: A.fork }, { put: P.fork }, { run: () => { if (!sh().daily('muck', 1)) return; sh().xp(5); sh().relax({ fun: 4 }); c.xp(); c.toast('All four boxes mucked out, fresh straw down! ✨ +5 XP'); } });
      c.steps(L, { name: 'Mucking out' });
    }
    const acts = {
      // the Veggie plot
      seedshed: () => [{ e: '🌱', label: 'Seeds: pick a bed to plant', run: () => c.toast('Tap an empty bed to plant it. Seeds are paid for there.') }],
      tank: s => [{ e: '🚿', label: V().can ? `Watering can full (${V().can} beds)` : 'Fill the watering can', run: () => c.chore(s, 'fetch', 2, () => { V().can = 6; c.float(V().kid, '💧'); c.toast('Watering can full! Enough for six beds.'); }, null, { tool: 'can', fx: 'drops', dist: 0.6, y: 0.9, rate: 18 }) }],
      bed: s => { const b = bedState(s.i), g = bedStage(b), hand = Object.entries(HAND).filter(([, H0]) => H0.ok(b)).map(([k, H0]) => ({ e: H0.e, label: H0.label, run: () => byHand(s, k) })); return g < 0 ? [{ e: '🌱', label: 'Plant something', run: () => seedPanel(s.i) }, ...hand] : g === 3 ? [{ e: CROPS[b.crop].e, label: `Pick the ${CROPS[b.crop].name}${bonusOf(b) > 0 ? ` (+${bonusOf(b)})` : ''}`, run: () => harvest(s) }] : [{ e: '💧', label: (b.watered || []).includes(today()) ? 'Watered today ✓' : `Water the ${CROPS[b.crop].name}`, run: () => water(s) }, ...hand]; },
      // the Orchard terrace
      fruittree: s => [{ e: FRUIT[s.fruit].e, label: ripe(s.i) ? `Pick the ${fruitName(s.fruit)}${treeBonus(s.i) ? ` (+${treeBonus(s.i)})` : ''}` : 'Not ripe yet', run: () => pick(s) }, ...(within(care(s.i).pr, 14) ? [] : [{ e: '✂️', label: 'Prune it', run: () => prune(s) }])],
      hives: s => [{ e: '🍯', label: 'Collect the honey', run: () => honey(s) }],
      press: s => [{ e: '🫙', label: 'Make jam from three fruit', run: () => jam(s) }],
      // the Stable yard
      tack: s => [{ e: '🐴', label: 'Stables & tack shop', run: () => (V().B.stableW ? c.walkTo(s.at[0], s.at[1], ok => ok && tackShop(), s.yaw) : tackShop()) }],
      muck: s => [{ e: '🧹', label: sh().dailyLeft('muck', 1) > 0 ? 'Muck out the boxes' : 'Mucked out today ✓', run: () => muckOut(s) }],
      groom: s => [{ e: '🪮', label: 'Groom the horses', run: () => { if (groomSeries(s)) return; if (!sh().daily('groom', 1)) return c.toast('They’re shining already. Groom them again tomorrow.'); c.chore(s, 'pat', 3, () => { sh().xp(5); sh().relax({ fun: 8 }); c.xp(); c.float(V().kid, '✨'); c.toast('Brushed and gleaming! ✨ +5 XP'); }, null, { tool: 'brush', fx: 'dust', dist: 0.7, y: 1.1, rate: 7 }); } }],
      hay: s => [{ e: '🌾', label: (stab().fed || 0) === today() ? 'Fed today ✓' : 'Feed everyone hay', run: () => { const S = stab(); if (S.fed === today()) return c.toast('They’re full. Feed them again tomorrow.'); c.chore(s, 'feed', 2.6, () => { S.fed = today(); save(); for (const a of V().B.animals) c.float({ pos: a.group.position }, '❤️'); c.toast('Everyone’s fed! 🌾'); }, null, { tool: 'fork', fx: 'hay', dist: 0.9, y: 0.4, rate: 14 }); } }],
      strough: s => [{ e: '💧', label: 'Top up the water trough', run: () => c.chore(s, 'water', 2.4, () => { sh().relax({ fun: 4 }); c.toast('Fresh water for everyone.'); }, null, { tool: 'can', fx: 'drops', at: 'hand', rate: 22, delay: 0.6 }) }],
      sshear: s => [{ e: '🧶', label: 'Shear the sheep', run: () => stableCollect(s, 'merino', 'wool', 2, '🧶') }],
      truffle: s => [{ e: '🍄', label: 'Truffle hunt with the pig', run: () => stableCollect(s, 'kunekune', 'truffle', 2, '🍄') }],
      arena: s => [{ e: '🏇', label: `Ride round the arena · ${sh().dailyLeft('ride', 3)} left today`, run: () => rideArena(s) }],
      // the Lake
      kayak: s => [{ e: '🛶', label: 'Paddle a kayak round the lake', run: () => kayak(s) }],
      // the Forest grove
      hide: s => [{ e: '🔭', label: 'Watch the birds', run: () => { if (!sh().daily('birds', 8)) return c.toast('The birds are quiet now. Come back tomorrow.'); const [k, name, e] = BIRDS[Math.floor(Math.random() * BIRDS.length)]; look(s, 4, `You spotted ${name}! ${e}`, { fun: 6 }, e, ['birds', k, 'bird book']); } }],
      tuatara: s => [{ e: '🦎', label: 'Look at the tuatara', run: () => look(s, 3, 'A tuatara! Their family has been around since the dinosaurs. 🦎', { fun: 5 }, '🦎', ['nature', 'tuatara', 'nature book'], { fx: 'sparkle', dist: 0.4, y: 0.6, rate: 3 }) }],
      cave: s => [{ e: '✨', label: 'Peek into the glow-worm cave', run: () => look(s, 4, 'Thousands of tiny blue glow-worms, like stars in the dark. ✨', { fun: 10 }, '✨', ['nature', 'glowworm', 'nature book'], { fx: 'sparkle', dist: 1.6, y: 1.2, rate: 6 }) }],
      stream: s => [{ e: '💧', label: 'Skip stones', run: () => c.chore(s, 'fetch', 2.4, () => { const k = V().kid; for (let i = 1; i < 6; i++) setTimeout(() => { const v = V(); if (v) c.fx('splash', k.pos.x + Math.sin(k.yaw) * (1.4 + i * 0.9), 0, k.pos.z + Math.cos(k.yaw) * (1.4 + i * 0.9), 6); }, i * 180); const n = 1 + Math.floor(Math.random() * 7); c.float(V().kid, '💧'.repeat(Math.min(n, 4))); sh().relax({ fun: 6 }); c.toast(`${n} skip${n === 1 ? '' : 's'}!${n >= 6 ? ' Amazing! 🎉' : ''}`); }) }],
      // the Waterfall cliff
      behind: s => [{ e: '💦', label: 'Walk behind the waterfall', run: () => look(s, 4, 'Behind the falls: a curtain of water, roaring, and cool spray. 💦', { fun: 12, clean: 6 }, '💦', ['nature', 'behindfalls', 'nature book'], { fx: 'splash', dist: 0.8, y: 1.6, rate: 12 }) }],
      rainbow: s => [{ e: '🌈', label: 'Make a wish on the rainbow', run: () => look(s, 3, 'A rainbow in the spray. Make a wish! 🌈', { fun: 8 }, '🌈') }],
      edge: s => [{ e: '☁️', label: 'Look over the edge', run: () => look(s, 3, 'The creek pours off the edge and falls away into the clouds. ☁️', { fun: 6 }, '☁️') }],
      // the Mountain lookout
      geyser: s => [{ e: '⛲', label: 'Wait for the geyser', run: () => look(s, 6, 'Whoosh! It erupts every twenty seconds or so. ⛲', { fun: 10 }, '⛲', ['nature', 'geyser', 'nature book'], { fx: 'steam', dist: 2.6, y: 0.4, rate: 4 }) }],
      spring: s => [{ e: '🌈', label: 'Look at the rainbow spring', run: () => look(s, 3, 'The colours come from tiny living things in the hot water.', { fun: 6 }, '🌈', ['nature', 'spring', 'nature book']) }],
      soak: s => [{ e: '♨️', label: 'Soak in the hot pool', run: () => c.walkTo(s.swimTo[0], s.swimTo[1], ok => { if (ok) { sh().relax({ energy: 18, clean: 10, fun: 6 }); c.float(V().kid, '♨️'); c.toast('Aaah. Warm and cosy. ♨️'); const k = V().kid; c.fx('splash', k.pos.x, k.pos.y + 0.5, k.pos.z, 10); V().emit.push({ kind: 'steam', at: 'front', dist: 0.2, y: 0.9, rate: 3, from: V().t, until: V().t + 10 }); } }) }],
      telescope: s => [{ e: '🔭', label: 'Look through the telescope', run: () => look(s, 4, V().where === 'sky' ? (sh().phase && sh().phase() === 'night' ? 'A shooting star! Make a wish. 🌠' : 'The moon, faint in the day sky. Come back at night for the stars. 🌙') : 'Far off: your home island, and Hoshi Street’s lanterns. 🏝️', { fun: 6 }, '🔭') }],
      stars: s => [{ e: '🌠', label: 'Look for stars', run: () => look(s, 4, sh().phase && sh().phase() === 'night' ? 'A shooting star! Make a wish. 🌠' : 'The moon, faint in the day sky. Come back at night for the stars. 🌙', { fun: 6 }, '🌠') }],
      // the Floating sky islet
      balloon: s => [{ e: '🎈', label: `Go up in the balloon · ${sh().dailyLeft('balloon', 3)} left today`, run: () => balloon(s) }],
      kite: s => [{ e: '🪁', label: 'Fly a kite', run: () => kite(s) }],
      bell: s => [{ e: '🔔', label: 'Ring the wishing bell', run: () => c.chore(s, 'switch', 1.6, () => { c.sound('tune'); c.float(V().kid, '🔔'); sh().relax({ fun: 6 }); c.toast('Ding! Make a wish. ✨'); const k = V().kid; c.fx('sparkle', k.pos.x + Math.sin(k.yaw) * 0.6, 2.2, k.pos.z + Math.cos(k.yaw) * 0.6, 16); }) }]
    };
    return {
      acts,
      click(k) { const [what, a, b] = k.split(':'); if (what === 'plant') return plant(+a, b); if (what === 'sbuy') return stableBuy(a); if (what === 'tack') return tackShop(); },
      prep() { const v = V(); if (!v) return; v.can = 0; if (v.B && v.B.drawBed) drawBeds(); if (v.B && v.B.trees) drawFruit(); void T; } // (the farm's field and orchard blocks too)
    };
  };
})();
