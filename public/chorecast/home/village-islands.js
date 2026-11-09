/* Chorecast homes (a prototype): what there is to do on the islands from islands-more.js. village.js calls
   IH.villageIslands(ctx) once and adds the acts it gives to its own (ctx carries what it needs from there: walkTo,
   chore, toast, ride and so on, and V, the place that's open). Utility islands make things, kept in the save per
   island (shop.isl(id)); vacation islands are for playing, with books to fill and a little XP for each first find. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {}, T = window.THREE;
  const DAY = 864e5, today = () => Math.floor(Date.now() / DAY);
  const CROPS = { carrot: { e: '🥕', name: 'carrots', seed: 10, days: 2, n: 4 }, lettuce: { e: '🥬', name: 'lettuces', seed: 10, days: 2, n: 2 }, tomato: { e: '🍅', name: 'tomatoes', seed: 15, days: 3, n: 4 }, pumpkin: { e: '🎃', name: 'pumpkins', seed: 20, days: 3, n: 2, goods: true }, strawberry: { e: '🍓', name: 'strawberries', seed: 15, days: 2, n: 6, goods: true } };
  const FRUIT = { apple: { e: '🍎', n: 3 }, lemon: { e: '🍋', n: 3, goods: true }, feijoa: { e: '🍐', n: 4, goods: true } };
  const STABLE_SHOP = [['horse', '🐴', 'Horse', 1200, 3, 'To ride in the arena.'], ['pony', '🐎', 'Pony', 900, 2, 'A smaller ride.'], ['donkey', '🫏', 'Donkey', 600, 1, 'A gentle friend for the paddock.'], ['merino', '🐑', 'Merino sheep', 400, 4, 'A bag of wool every two days.'], ['kunekune', '🐷', 'Kunekune pig', 350, 2, 'Finds a truffle every two days.']];
  const BIRDS = [['tui', 'a tūī', '🐦'], ['fantail', 'a pīwakawaka (fantail)', '🐦'], ['kereru', 'a kererū', '🕊️'], ['ruru', 'a ruru (morepork)', '🦉'], ['weka', 'a weka', '🐦'], ['takahe', 'a takahē', '🐦'], ['bellbird', 'a korimako (bellbird)', '🐦'], ['kaka', 'a kākā', '🦜']];

  IH.villageIslands = c => {
    const V = () => c.V, sh = () => c.V.stage.shop, st = id => sh().isl(id), save = () => sh().farmSave();
    // a look at something: walk there, a while, then the words (and, the first time, a find in a book)
    const look = (s, secs, words, gives, emo, book) => c.chore(s, 'look', secs, () => {
      if (gives) sh().relax(gives); if (emo) c.float(V().kid, emo); c.sound('pop');
      if (book) { const b = sh().book(book[0], book[1]); if (b.isNew) { sh().xp(10); c.xp(); return c.toast(`${words} New in your ${book[2]} (${b.count}): ✨ +10 XP.`); } }
      c.toast(words);
    });
    // ---------- the Veggie plot
    const bedState = i => { const P = st('plot'); P.beds = P.beds || []; return P.beds[i] || (P.beds[i] = {}); };
    const bedStage = b => { if (!b.crop) return -1; const C = CROPS[b.crop], w = (b.watered || []).length; return w >= C.days ? 3 : Math.min(2, w); };
    const drawBeds = () => { const B = V().B; if (!B.drawBed) return; B.beds.forEach((_, i) => { const b = bedState(i); B.drawBed(i, b.crop, Math.max(0, bedStage(b))); }); };
    function seedPanel(i) {
      c.gamePanel(`<div class="vg-gh"><b>🌱 Plant bed ${i + 1}</b><span>✨ ${Math.round(sh().wallet().left).toLocaleString()}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">Pick the seeds. Water the bed once a day; it’s ready after a few days of watering.</div>
        <div class="vg-gb vg-mine">${Object.entries(CROPS).map(([id, C]) => `<button data-v="isl" data-k="plant:${i}:${id}"><span class="e">${C.e}</span>${C.name[0].toUpperCase() + C.name.slice(1)} · ✨ ${C.seed}<small>&nbsp;${C.days} days · ${C.n} to pick</small></button>`).join('')}</div>`);
    }
    function plant(i, id) {
      const C = CROPS[id]; if (!C || !sh().pay(C.seed, 'the seeds')) return; const b = bedState(i); Object.assign(b, { crop: id, planted: today(), watered: [] }); save();
      const s = V().B.spots.find(q => q.kind === 'bed' && q.i === i); document.querySelector('.vg-game').hidden = true;
      c.chore(s, 'water', 2, () => { drawBeds(); c.toast(`${C.name[0].toUpperCase() + C.name.slice(1)} planted! Water them every day.`); c.sound('place'); }); c.xp();
    }
    function water(s) {
      const b = bedState(s.i); if ((b.watered || []).includes(today())) return c.toast('Already watered today. Come back tomorrow.');
      if (!V().can) return c.toast('Your watering can’s empty. Fill it at the water tank.');
      c.chore(s, 'water', 2.2, () => { V().can -= 1; (b.watered = b.watered || []).push(today()); save(); drawBeds(); c.float(V().kid, '💧'); c.sound('pop'); c.toast(bedStage(b) === 3 ? 'Ready to pick!' : `Watered. ${CROPS[b.crop].days - b.watered.length} more day${CROPS[b.crop].days - b.watered.length === 1 ? '' : 's'} of watering.`); });
    }
    function harvest(s) {
      const b = bedState(s.i), C = CROPS[b.crop];
      c.chore(s, 'fetch', 2.2, () => { if (C.goods) sh().addGoods(b.crop, C.n); else sh().addFood(b.crop, C.n); for (const k of Object.keys(b)) delete b[k]; save(); drawBeds(); c.float(V().kid, C.e); c.sound('buy'); c.toast(`${C.n} ${C.name}! ${C.goods ? 'On your goods shelf: sell them at the grocer.' : 'Into your fridge at home.'}`); });
    }
    // ---------- the Orchard terrace
    const ripe = i => { const O = st('orchard'); O.picked = O.picked || {}; const p = O.picked[i]; return !p || Date.now() - p >= 2 * DAY; };
    const drawFruit = () => { const B = V().B; if (B.trees) for (const t of B.trees) t.fruit.visible = ripe(t.i); };
    function pick(s) {
      if (!ripe(s.i)) return c.toast('Not ripe yet. Fruit comes back every two days.');
      c.chore(s, 'fetch', 2.6, () => { const F = FRUIT[s.fruit]; st('orchard').picked[s.i] = Date.now(); save(); drawFruit(); if (F.goods) sh().addGoods(s.fruit, F.n); else sh().addFood(s.fruit, F.n); c.float(V().kid, F.e); c.sound('buy'); c.toast(`${F.n} ${s.fruit === 'feijoa' ? 'feijoas' : s.fruit + 's'}! ${F.goods ? 'On your goods shelf.' : 'Into your fridge.'}`); });
    }
    function honey(s) {
      const O = st('orchard'), last = O.honey || 0; if (last && Date.now() - last < 3 * DAY) return c.toast('The bees are still making it. Honey every three days.');
      c.chore(s, 'fetch', 3, () => { O.honey = Date.now(); save(); sh().addFood('honey', 2); c.float(V().kid, '🍯'); c.sound('buy'); c.toast('Two jars of honey into your pantry! 🐝'); });
    }
    function jam(s) {
      const g = sh().goods(), f = sh().food ? sh().food() : {}, have = (g.lemon || 0) + (g.feijoa || 0) + (f.apple || 0); if (have < 3) return c.toast('You need three fruit to make jam (apples, lemons or feijoas).');
      c.chore(s, 'stir', 4, () => { let need = 3; for (const k of ['feijoa', 'lemon']) while (need && sh().useGoods(k)) need--; while (need && sh().useFood('apple')) need--; sh().addGoods('jam'); c.float(V().kid, '🫙'); c.sound('buy'); c.toast('A jar of jam! The grocer pays ✨ 85 for it.'); });
    }
    // ---------- the Stable yard
    const stab = () => { const S = st('stable'); S.animals = S.animals || { horse: 1, merino: 1 }; S.got = S.got || {}; return S; };
    function tackShop() {
      const S = stab(); c.gamePanel(`<div class="vg-gh"><b>🐴 Stables & tack</b><span>✨ ${Math.round(sh().wallet().left).toLocaleString()}</span><button class="vg-x" data-v="gclose" aria-label="Close">✕</button></div><div class="vg-gq">Horses to ride, and friends for the paddock.</div>
        <div class="vg-gb vg-mine">${STABLE_SHOP.map(([k, e, name, xp, cap, about]) => { const n = S.animals[k] || 0; return `<button data-v="isl" data-k="sbuy:${k}" ${n >= cap ? 'disabled' : ''}><span class="e">${e}</span>${name} · ✨ ${xp}<small>&nbsp;${n} / ${cap} · ${about}</small></button>`; }).join('')}</div>`);
    }
    function stableBuy(kind) {
      const S = stab(), it = STABLE_SHOP.find(q => q[0] === kind); if (!it || (S.animals[kind] || 0) >= it[4] || !sh().pay(it[3], 'a ' + it[2].toLowerCase())) return;
      S.animals[kind] = (S.animals[kind] || 0) + 1; if (!S.got[kind]) S.got[kind] = Date.now(); save();
      const B = V().B, a = IH.islandsBuild.MAKE[kind](), pen = B.pens[kind]; a.pen = pen; a.group.position.set((pen[0] + pen[2]) / 2, 0, (pen[1] + pen[3]) / 2); B.root.add(a.group); B.animals.push(a);
      c.toast(`Welcome, ${it[2].toLowerCase()}! ${it[1]}`); c.xp(); tackShop();
    }
    const stableFed = () => (stab().fed || 0) >= today() - 1;
    function stableCollect(s, kind, what, every, emo) {
      const S = stab(), n = S.animals[kind] || 0; if (!n) return c.toast(kind === 'merino' ? 'No sheep yet. The tack room has merinos.' : 'No pig yet. The tack room has kunekunes.');
      if (!stableFed()) return c.toast('Feed them hay at the barn first.');
      const last = S.got[kind] || 0, batches = last ? Math.min(3, Math.floor((Date.now() - last) / (every * DAY))) : 1; if (!batches) return c.toast('Nothing yet. Come back in a day or two.');
      c.chore(s, kind === 'merino' ? 'sweep' : 'fetch', 2.6, () => { S.got[kind] = Date.now(); save(); sh().addGoods(what, batches * n); c.float(V().kid, emo); c.sound('buy'); c.toast(`${batches * n} ${what === 'wool' ? 'bag' + (batches * n === 1 ? '' : 's') + ' of wool' : 'truffle' + (batches * n === 1 ? '' : 's')}! On your goods shelf.`); });
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

    const acts = {
      // the Veggie plot
      seedshed: () => [{ e: '🌱', label: 'Seeds: pick a bed to plant', run: () => c.toast('Tap an empty bed to plant it. Seeds are paid for there.') }],
      tank: s => [{ e: '🚿', label: V().can ? `Watering can full (${V().can} beds)` : 'Fill the watering can', run: () => c.chore(s, 'water', 1.6, () => { V().can = 6; c.float(V().kid, '💧'); c.toast('Watering can full! Enough for six beds.'); }) }],
      bed: s => { const b = bedState(s.i), g = bedStage(b); return g < 0 ? [{ e: '🌱', label: 'Plant something', run: () => seedPanel(s.i) }] : g === 3 ? [{ e: CROPS[b.crop].e, label: `Pick the ${CROPS[b.crop].name}`, run: () => harvest(s) }] : [{ e: '💧', label: (b.watered || []).includes(today()) ? 'Watered today ✓' : `Water the ${CROPS[b.crop].name}`, run: () => water(s) }]; },
      // the Orchard terrace
      fruittree: s => [{ e: FRUIT[s.fruit].e, label: ripe(s.i) ? `Pick the ${s.fruit === 'feijoa' ? 'feijoas' : s.fruit + 's'}` : 'Not ripe yet', run: () => pick(s) }],
      hives: s => [{ e: '🍯', label: 'Collect the honey', run: () => honey(s) }],
      press: s => [{ e: '🫙', label: 'Make jam from three fruit', run: () => jam(s) }],
      // the Stable yard
      tack: () => [{ e: '🐴', label: 'Stables & tack shop', run: () => tackShop() }],
      groom: s => [{ e: '🪮', label: 'Groom the horses', run: () => { if (!sh().daily('groom', 1)) return c.toast('They’re shining already. Groom them again tomorrow.'); c.chore(s, 'pat', 3, () => { sh().xp(5); sh().relax({ fun: 8 }); c.xp(); c.float(V().kid, '✨'); c.toast('Brushed and gleaming! ✨ +5 XP'); }); } }],
      hay: s => [{ e: '🌾', label: (stab().fed || 0) === today() ? 'Fed today ✓' : 'Feed everyone hay', run: () => { const S = stab(); if (S.fed === today()) return c.toast('They’re full. Feed them again tomorrow.'); c.chore(s, 'feed', 2.6, () => { S.fed = today(); save(); for (const a of V().B.animals) c.float({ pos: a.group.position }, '❤️'); c.toast('Everyone’s fed! 🌾'); }); } }],
      strough: s => [{ e: '💧', label: 'Top up the water trough', run: () => c.chore(s, 'water', 2, () => { sh().relax({ fun: 4 }); c.toast('Fresh water for everyone.'); }) }],
      sshear: s => [{ e: '🧶', label: 'Shear the sheep', run: () => stableCollect(s, 'merino', 'wool', 2, '🧶') }],
      truffle: s => [{ e: '🍄', label: 'Truffle hunt with the pig', run: () => stableCollect(s, 'kunekune', 'truffle', 2, '🍄') }],
      arena: s => [{ e: '🏇', label: `Ride round the arena · ${sh().dailyLeft('ride', 3)} left today`, run: () => rideArena(s) }],
      // the Lake
      kayak: s => [{ e: '🛶', label: 'Paddle a kayak round the lake', run: () => kayak(s) }],
      // the Forest grove
      hide: s => [{ e: '🔭', label: 'Watch the birds', run: () => { if (!sh().daily('birds', 8)) return c.toast('The birds are quiet now. Come back tomorrow.'); const [k, name, e] = BIRDS[Math.floor(Math.random() * BIRDS.length)]; look(s, 4, `You spotted ${name}! ${e}`, { fun: 6 }, e, ['birds', k, 'bird book']); } }],
      tuatara: s => [{ e: '🦎', label: 'Look at the tuatara', run: () => look(s, 3, 'A tuatara! Their family has been around since the dinosaurs. 🦎', { fun: 5 }, '🦎', ['nature', 'tuatara', 'nature book']) }],
      cave: s => [{ e: '✨', label: 'Peek into the glow-worm cave', run: () => look(s, 4, 'Thousands of tiny blue glow-worms, like stars in the dark. ✨', { fun: 10 }, '✨', ['nature', 'glowworm', 'nature book']) }],
      stream: s => [{ e: '💧', label: 'Skip stones', run: () => c.chore(s, 'fetch', 2, () => { const n = 1 + Math.floor(Math.random() * 7); c.float(V().kid, '💧'.repeat(Math.min(n, 4))); sh().relax({ fun: 6 }); c.toast(`${n} skip${n === 1 ? '' : 's'}!${n >= 6 ? ' Amazing! 🎉' : ''}`); }) }],
      // the Waterfall cliff
      behind: s => [{ e: '💦', label: 'Walk behind the waterfall', run: () => look(s, 4, 'Behind the falls: a curtain of water, roaring, and cool spray. 💦', { fun: 12, clean: 6 }, '💦', ['nature', 'behindfalls', 'nature book']) }],
      rainbow: s => [{ e: '🌈', label: 'Make a wish on the rainbow', run: () => look(s, 3, 'A rainbow in the spray. Make a wish! 🌈', { fun: 8 }, '🌈') }],
      edge: s => [{ e: '☁️', label: 'Look over the edge', run: () => look(s, 3, 'The creek pours off the edge and falls away into the clouds. ☁️', { fun: 6 }, '☁️') }],
      // the Mountain lookout
      geyser: s => [{ e: '⛲', label: 'Wait for the geyser', run: () => look(s, 6, 'Whoosh! It erupts every twenty seconds or so. ⛲', { fun: 10 }, '⛲', ['nature', 'geyser', 'nature book']) }],
      spring: s => [{ e: '🌈', label: 'Look at the rainbow spring', run: () => look(s, 3, 'The colours come from tiny living things in the hot water.', { fun: 6 }, '🌈', ['nature', 'spring', 'nature book']) }],
      soak: s => [{ e: '♨️', label: 'Soak in the hot pool', run: () => c.walkTo(s.swimTo[0], s.swimTo[1], ok => { if (ok) { sh().relax({ energy: 18, clean: 10, fun: 6 }); c.float(V().kid, '♨️'); c.toast('Aaah. Warm and cosy. ♨️'); } }) }],
      telescope: s => [{ e: '🔭', label: 'Look through the telescope', run: () => look(s, 4, V().where === 'sky' ? (sh().phase && sh().phase() === 'night' ? 'A shooting star! Make a wish. 🌠' : 'The moon, faint in the day sky. Come back at night for the stars. 🌙') : 'Far off: your home island, and Hoshi Street’s lanterns. 🏝️', { fun: 6 }, '🔭') }],
      stars: s => [{ e: '🌠', label: 'Look for stars', run: () => look(s, 4, sh().phase && sh().phase() === 'night' ? 'A shooting star! Make a wish. 🌠' : 'The moon, faint in the day sky. Come back at night for the stars. 🌙', { fun: 6 }, '🌠') }],
      // the Floating sky islet
      balloon: s => [{ e: '🎈', label: `Go up in the balloon · ${sh().dailyLeft('balloon', 3)} left today`, run: () => balloon(s) }],
      kite: s => [{ e: '🪁', label: 'Fly a kite', run: () => kite(s) }],
      bell: s => [{ e: '🔔', label: 'Ring the wishing bell', run: () => c.chore(s, 'happy', 1.6, () => { c.sound('tune'); c.float(V().kid, '🔔'); sh().relax({ fun: 6 }); c.toast('Ding! Make a wish. ✨'); }) }]
    };
    return {
      acts,
      click(k) { const [what, a, b] = k.split(':'); if (what === 'plant') return plant(+a, b); if (what === 'sbuy') return stableBuy(a); },
      prep() { const v = V(); if (!v) return; v.can = 0; if (v.where === 'plot') drawBeds(); if (v.where === 'orchard') drawFruit(); void T; }
    };
  };
})();
