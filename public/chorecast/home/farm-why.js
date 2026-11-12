/* Chorecast homes: why a kid would want each farm machine (2026-11-12). The farm shop's Machines tab sorts the
   machines into a few families (get the soil ready, planting, plant food, looking after crops, harvest, hay, the
   orchard, the animals and yard); each machine's card says in plain words what it gets you, with a little before
   and after, and how soon it pays for itself. Machines come along when the kid needs them: each unlocks after the
   kid has done its job by hand a few times (or owns the machine before it in the family), and the farm says so
   when it happens. What each machine has done is counted (beds or trees worked, the extra it grew), shown on its
   card. A new machine's first go is coached: hitch it, press Auto, look at the beds.
   Saved on the farm: f.done { key: count } (hand jobs), f.mach { kind: { n, extra } } (what machines did),
   f.told { kind: 1 } (unlocks already announced), f.tut { kind: step } (first-go coaching). */
(function () {
  'use strict';
  const IH = (window.IsoHome = window.IsoHome || {});

  // what the kid has to have done first; null = from the start
  const H = (key, n, says) => ({ key, n, says });
  const OWN = (kind, says) => ({ own: kind, says });
  const FAMS = [
    { k: 'soil', e: '🟫', name: 'Get the soil ready', story: 'Soft, crumbly soil grows more. Each job adds 1 more to the next crop in every bed (up to 3 more).' },
    { k: 'plant', e: '🌱', name: 'Planting', story: 'Plant a whole field in one drive instead of bed by bed.' },
    { k: 'food', e: '🟤', name: 'Plant food', story: 'Fed beds grow 1 more. Pick the kind that suits your farm.' },
    { k: 'care', e: '💧', name: 'Looking after crops', story: 'Water and weeds, done for a whole field at once.' },
    { k: 'harvest', e: '🧺', name: 'Harvest', story: 'Pick a whole field of ready crops in one drive.' },
    { k: 'hay', e: '🌾', name: 'Hay meadow', story: 'Cut it, dry it, bale it: hay feeds your animals. Each machine does one step, in order.' },
    { k: 'orchard', e: '🍎', name: 'Orchard', story: 'Look after every tree in one drive: looked-after trees give more fruit.' },
    { k: 'yard', e: '🐄', name: 'Animals & yard', story: 'Feed, water and bed the animals without carrying it all by hand.' }
  ];
  // per machine: family, tier (good/better/best within a family, where that fits), the one line a kid reads, a
  // little before and after, the extra it grows per bed or tree (for "pays for itself"), and what unlocks it
  const WHY = {
    plough: { fam: 'soil', tier: 'Good', why: 'Turns a whole field in one drive. Next crop: 1 more in every bed.', ba: ['4 🥕', '5 🥕'], extra: 1, need: null },
    tiller: { fam: 'soil', tier: 'Better', why: 'Makes the soil fine and crumbly after the plough: 1 more again.', ba: ['5 🥕', '6 🥕'], extra: 1, need: H('rake', 4, 'You’ve raked beds by hand. The tiller does a whole field in one drive.') },
    powerharrow: { fam: 'soil', tier: 'Best', why: 'Two jobs in one drive: 2 more in every bed.', ba: ['4 🥕', '6 🥕'], extra: 2, need: OWN('tiller', 'The power harrow does the tiller’s job and more, in one drive.') },
    discs: { fam: 'soil', why: 'Breaks up and levels the soil: 1 more in every bed (the same job as the tiller).', ba: ['5 🥕', '6 🥕'], extra: 1, hide: true, need: null },
    subsoiler: { fam: 'soil', tier: 'Lasts', why: 'Rips deep once and helps for 3 crops: 1 more each time, with no redoing.', ba: ['4 🥕 ×3', '5 🥕 ×3'], extra: 1, crops: 3, need: H('harvest', 8, 'Your beds are working hard. The subsoiler loosens them deep for three crops in a row.') },
    drill: { fam: 'plant', tier: 'Small seeds', why: 'Sows a whole field of carrots or lettuce in one drive.', ba: ['8 beds by hand', '1 drive'], need: null },
    planter: { fam: 'plant', tier: 'Big seeds', why: 'Sweetcorn and pumpkins, a whole field at a time, evenly spaced.', ba: ['8 beds by hand', '1 drive'], need: H('plant', 6, 'You’ve planted lots of beds by hand. The precision planter does corn and pumpkins a field at a time.') },
    potatoplanter: { fam: 'plant', tier: 'Potatoes', why: 'Plants a whole field of potatoes in one drive.', ba: ['8 beds by hand', '1 drive'], need: H('plant', 6, 'The potato planter plants a whole field of potatoes in one drive.') },
    transplanter: { fam: 'plant', tier: 'Seedlings', why: 'Tomatoes and strawberries, a whole field at a time.', ba: ['8 beds by hand', '1 drive'], need: H('plant', 10, 'The transplanter plants tomatoes and strawberries a field at a time.') },
    roller: { fam: 'plant', tier: 'Add-on', why: 'Presses new seeds into the soil so they all come up: 1 more in every bed just sown.', ba: ['4 🥕', '5 🥕'], extra: 1, need: H('plant', 10, 'The roller firms new seeds in: 1 more from every bed you’ve just sown.') },
    spreader: { fam: 'food', tier: 'Quick', why: 'Feeds a whole field in one drive: 1 more in every bed. ✨ 5 a bed.', ba: ['4 🥕', '5 🥕'], extra: 1, cost: 5, need: H('compost', 3, 'You’ve spread compost by hand. The fertiliser spreader feeds a whole field in one drive.') },
    manure: { fam: 'food', tier: 'Free', why: 'The same 1 more in every bed, free: it uses the muck your animals make.', ba: ['4 🥕', '5 🥕'], extra: 1, need: H('feed', 8, 'Your animals have made a muck heap. The muck spreader turns it into free plant food.') },
    lime: { fam: 'food', tier: 'Lasts', why: 'Sweetens the soil once, for 5 crops: 1 more each time. ✨ 4 a bed.', ba: ['4 🥕 ×5', '5 🥕 ×5'], extra: 1, crops: 5, cost: 4, need: H('harvest', 16, 'Lime keeps your beds sweet for five crops in a row.') },
    sprayer: { fam: 'care', tier: 'Water', why: 'Waters a whole field in one drive: no more refilling the watering can.', ba: ['6 beds a can', 'a field a drive'], need: H('water', 8, 'You’ve carried a lot of water! The sprayer waters a whole field in one drive.') },
    weeder: { fam: 'care', tier: 'Weeds', why: 'Weeds steal 1 from every bed. This hoes a whole field at once.', ba: ['3 🥕 (weeds)', '4 🥕'], extra: 1, need: H('hoe', 3, 'You’ve hoed weeds by hand. The weeder does a whole field at once.') },
    harvester: { fam: 'harvest', tier: 'Vegetables', why: 'Picks a whole field of ready vegetables into its hopper in one drive.', ba: ['8 beds by hand', '1 drive'], need: H('harvest', 8, 'You’ve picked lots of beds by hand. The harvester picks a whole field in one drive.') },
    potatoharvester: { fam: 'harvest', tier: 'Potatoes', why: 'Digs up a whole field of potatoes and shakes the soil off.', ba: ['8 beds by hand', '1 drive'], need: OWN('potatoplanter', 'Potatoes planted by machine? The potato harvester digs them all up again.') },
    mower: { fam: 'hay', tier: 'Step 1', why: 'Cuts the long grass so it can dry. Dry, cut grass makes more bales.', ba: ['long grass', 'cut rows'], need: H('bale', 1, 'You’ve made your first bales! The mower is the first step to making them properly.') },
    tedder: { fam: 'hay', tier: 'Step 2', why: 'Spins the cut grass up so it dries in 30 minutes instead of a whole day.', ba: ['dry in a day', 'dry in 30 min'], need: OWN('mower', 'Cut grass dries slowly. The tedder dries it in half an hour.') },
    rake: { fam: 'hay', tier: 'Step 3', why: 'Rolls the cut grass into neat rows, so the baler gets every bit.', ba: ['spread out', 'neat rows'], need: OWN('mower', 'The rake rolls cut grass into rows for the baler.') },
    wrapper: { fam: 'hay', tier: 'Silage', why: 'Wraps green bales into silage: cows and goats give 1 more milk on it.', ba: ['🥛', '🥛🥛'], need: OWN('rake', 'Green bales rot unless they’re wrapped. The bale wrapper turns them into silage.') },
    loaderwagon: { fam: 'hay', tier: 'Shortcut', why: 'Picks up the rows loose and brings them in: no baling or carting.', ba: ['bale + cart', '1 drive'], need: H('bale', 12, 'The loader wagon brings hay in loose, in one drive.') },
    pruner: { fam: 'orchard', tier: 'Prune', why: 'Trims every tree in one drive: more fruit for two weeks.', ba: ['3 🍎', '4 🍎'], extra: 1, need: H('prune', 3, 'You’ve pruned trees by hand. The tree pruner does the whole orchard in one drive.') },
    mulcher: { fam: 'orchard', tier: 'Mulch', why: 'Mows between the trees and tucks the grass round them: more fruit for 5 days.', ba: ['3 🍎', '4 🍎'], extra: 1, need: H('pick', 8, 'The mulcher keeps the grass down and feeds the trees.') },
    orchardsprayer: { fam: 'orchard', tier: 'Spray', why: 'Keeps every tree healthy: more fruit for 5 days. ✨ 4 a tree.', ba: ['3 🍎', '4 🍎'], extra: 1, cost: 4, need: H('pick', 16, 'The orchard sprayer keeps every tree healthy in one drive.') },
    picker: { fam: 'orchard', tier: 'Pick', why: 'Picks every ripe tree it passes into bins: no ladder, no carrying.', ba: ['1 tree, 1 ladder', 'a row a drive'], need: H('pick', 16, 'You’ve climbed a lot of ladders! The picking platform picks a whole row.') },
    shaker: { fam: 'orchard', tier: 'Olives', why: 'Shakes olives and feijoas down into its frame in seconds.', ba: ['1 tree, 1 ladder', 'a few seconds'], need: H('pick', 8, 'Olive and feijoa trees? The tree shaker gets them down in seconds.') },
    bowser: { fam: 'yard', tier: 'Water', why: 'Fills every trough it drives past. Thirsty animals stop making things.', ba: ['1 trough at a time', 'all of them'], need: H('trough', 3, 'You’ve topped up the troughs by hand. The water bowser fills them all in one drive.') },
    mixer: { fam: 'yard', tier: 'Feed', why: 'One load feeds three whole paddocks: no more trips to the barn.', ba: ['3 trips', '1 load'], need: H('feed', 10, 'You feed the animals every day. The feed mixer feeds three paddocks from one load.') },
    blower: { fam: 'yard', tier: 'Straw', why: 'Beds every shelter with straw. Snug animals make 1 more.', ba: ['🥚', '🥚🥚'], need: H('feed', 5, 'Snug animals make more. The straw blower beds every shelter in one drive.') },
    bucket: { fam: 'yard', tier: 'Muck', why: 'Scoops the muck heap onto your beds: free plant food, 1 more per bed.', ba: ['4 🥕', '5 🥕'], extra: 1, need: H('feed', 8, 'Your muck heap is growing. The loader bucket spreads it on the beds for free.') },
    spear: { fam: 'yard', tier: 'Bales', why: 'Lifts and stacks bales one at a time, where you want them.', ba: ['roll by hand', 'lift and stack'], need: H('bale', 1, 'The bale spear lifts your bales and stacks them by the barn.') }
  };
  const VEG = 10; // (about what one vegetable or fruit is worth: for "pays for itself")
  const BEDS = 8; // (a field block's beds; an orchard has twelve trees)

  const done = f => (f.done = f.done || {});
  const own = (f, k) => !!(f.implements || {})[k];
  function unlocked(f, k) {
    const W = WHY[k]; if (!W || own(f, k)) return true; const N = W.need; if (!N) return true;
    if (N.own) return own(f, N.own); return (done(f)[N.key] || 0) >= N.n;
  }
  // what's still to do before it unlocks, in the kid's words
  function toGo(f, k) {
    const N = (WHY[k] || {}).need; if (!N) return '';
    if (N.own) return `Unlocks when you own the ${IH.farmWhy.names[N.own] || N.own}`;
    const left = Math.max(0, N.n - (done(f)[N.key] || 0)), L = { rake: ['Rake', 'bed', 'by hand'], plant: ['Plant', 'bed', 'by hand'], harvest: ['Pick', 'bed', 'by hand'], compost: ['Spread compost on', 'bed', 'by hand'], water: ['Water', 'bed', 'with the can'], hoe: ['Hoe', 'bed', 'by hand'], feed: ['Feed a paddock', 'time', ''], bale: ['Make', 'bale', ''], prune: ['Prune', 'tree', 'by hand'], pick: ['Pick', 'tree', 'by hand'], trough: ['Top up', 'trough', 'by hand'] }[N.key] || ['Do it', 'time', ''];
    return `🔒 ${L[0]} ${left} more ${L[1]}${left === 1 ? '' : 's'}${L[2] ? ' ' + L[2] : ''}`;
  }
  // pays for itself after about how many field (or orchard) harvests
  function payback(k, price) {
    const W = WHY[k]; if (!W || !W.extra) return '';
    const per = (W.fam === 'orchard' ? 12 : BEDS) * W.extra * VEG - (W.cost || 0) * (W.fam === 'orchard' ? 12 : BEDS);
    if (per <= 0) return ''; const n = Math.ceil(price / per);
    return `Pays for itself in about ${n} ${W.fam === 'orchard' ? 'pickings' : 'harvests'}`;
  }
  // the hand job counted; any machine that's just unlocked by it is announced (once each)
  function count(f, key, toast, n = 1) {
    const before = Object.keys(WHY).filter(k => !unlocked(f, k)); done(f)[key] = (done(f)[key] || 0) + n;
    const now = before.filter(k => unlocked(f, k) && !(f.told || {})[k] && !WHY[k].hide);
    if (!now.length || !toast) return;
    const k = now[0]; (f.told = f.told || {})[k] = 1; for (const q of now.slice(1)) f.told[q] = 1;
    setTimeout(() => toast(`🔓 New in the farm shop: ${WHY[k].need.says}${now.length > 1 ? ` (and ${now.length - 1} more)` : ''}`), 2600);
  }
  // when a machine is bought, anything that needed it is now open too
  function bought(f, k) { for (const [q, W] of Object.entries(WHY)) if (W.need && W.need.own === k) (f.told = f.told || {})[q] = 1; (f.tut = f.tut || {})[k] = 'hitch'; }
  // what a machine did to one bed or tree: counted, and the extra it'll grow
  function worked(f, k, extra) { const M = (f.mach = f.mach || {}), m = (M[k] = M[k] || { n: 0, extra: 0 }); m.n++; m.extra += extra || 0; }
  function tally(f, k) {
    const m = (f.mach || {})[k]; if (!m || !m.n) return '';
    const W = WHY[k] || {}, thing = W.fam === 'orchard' ? 'tree' : W.fam === 'yard' || W.fam === 'hay' ? '' : 'bed';
    if (!thing) return `Used ${m.n} time${m.n === 1 ? '' : 's'}`;
    return `Worked ${m.n} ${thing}${m.n === 1 ? '' : 's'}${m.extra ? `, growing ${m.extra} more` : ''}`;
  }
  IH.farmWhy = { FAMS, WHY, unlocked, toGo, payback, count, bought, worked, tally, names: {} };
})();
