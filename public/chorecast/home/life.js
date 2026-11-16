/* Chorecast homes (a prototype): life in the home.
   The character and the pets look after themselves. Each has needs that run down over time and fill up again by
   doing things, and every thing in the home says what it's good for (a bed for energy, the TV for fun, the kitchen
   for food), so what they get up to depends on what's in their home. When one is free it weighs everything it
   could do: how much it needs what that thing gives, how far away it is, and a little mood (it doesn't do the same
   thing twice running). The character also does its own chores when they need doing: makes the bed after sleeping,
   waters thirsty plants, feeds a hungry pet, sweeps up dust and washes up after cooking. Pets come for company,
   beg when they're hungry, nap and play.
   This file is the thinking only (what they need and what's worth doing); the home (app.js) walks them there. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};

  // needs, 0 (empty) to 100 (full), and how fast each runs down (points a second; a prototype day is quick)
  // (real time: a full need runs down over roughly half an hour to an hour and a half)
  const SLOW = 0.12;
  const NEEDS = {
    kid: { energy: 0.22 * SLOW, food: 0.3 * SLOW, fun: 0.55 * SLOW, friends: 0.32 * SLOW, tidy: 0.25 * SLOW, clean: 0.2 * SLOW },
    pet: { energy: 0.3 * SLOW, food: 0.32 * SLOW, fun: 0.45 * SLOW, friends: 0.4 * SLOW }
  };
  const LABEL = { energy: ['Energy', '⚡'], food: ['Food', '🍎'], fun: ['Fun', '🎈'], friends: ['Friends', '💛'], tidy: ['Tidy home', '🧹'], clean: ['Clean', '🫧'] };
  // What each thing gives while it's being used (points a second), for the character and for pets, and the little
  // thought shown when they set off for it.
  const RELAX = { energy: 0.9, fun: 0.6 }, PERCH = { energy: 0.5 };
  const GIVES = {
    bed: { kid: { energy: 3.2 }, pet: { energy: 2.4 }, think: '😴' }, bunk: { kid: { energy: 3.2 }, pet: { energy: 2.4 }, think: '😴' },
    sofa: { kid: RELAX, pet: { energy: 1.8, friends: 0.3 }, think: '🛋️' }, armchair: { kid: RELAX, pet: { energy: 1.8 }, think: '🛋️' },
    beanbag: { kid: { energy: 0.7, fun: 0.8 }, pet: { energy: 1.8 }, think: '🛋️' },
    chair: { kid: PERCH, pet: { energy: 0.8 }, think: '🪑' }, deskchair: { kid: { energy: 0.4, fun: 0.5 }, pet: { energy: 0.8 }, think: '🪑' }, bench: { kid: PERCH, pet: { energy: 0.8 }, think: '🪑' },
    catbed: { pet: { energy: 3 }, think: '💤' }, kennel: { pet: { energy: 3 }, think: '💤' },
    tv: { kid: { fun: 3.2 }, think: '📺' },
    bookcase: { kid: { fun: 2.2 }, think: '📚' },
    piano: { kid: { fun: 2.8 }, think: '🎹' }, guitar: { kid: { fun: 2.8 }, think: '🎸' }, easel: { kid: { fun: 2.6 }, think: '🎨' },
    telescope: { kid: { fun: 2.4 }, think: '🔭' }, toychest: { kid: { fun: 2.8 }, pet: { fun: 2.4 }, think: '🧸' },
    trampoline: { kid: { fun: 3.4 }, think: '🤸' }, pool: { kid: { fun: 3.2 }, think: '💦' }, rockinghorse: { kid: { fun: 2.8 }, think: '🐴' },
    kitchen: { kid: { food: 5 }, think: '🍳' }, kitchen2: { kid: { food: 5 }, think: '🍳' }, stove: { kid: { food: 5 }, think: '🍳' }, fridge: { kid: { food: 4.5 }, think: '🥪' }, fridge2: { kid: { food: 4.5 }, think: '🥪' }, pantry: { kid: { food: 3 }, think: '🥪' },
    // the bathroom: a bath or shower, washing up at the basin (hands, teeth)
    bath: { kid: { clean: 4, energy: 0.4 }, think: '🛁' }, bath2: { kid: { clean: 4, energy: 0.6, fun: 0.6 }, think: '🛁' }, shower: { kid: { clean: 5 }, think: '🚿' }, basin: { kid: { clean: 2 }, think: '🪥' }
  };
  // Chores: what the character does for its home. Each has how much it matters (0 to 1), worked out from the home
  // by the app, and fills the tidy need (and a pet's food for feeding it).
  // dur in seconds, real time; tool: fetched from the cupboard first and put back after
  const CHORES = {
    makebed: { pose: 'makebed', dur: 2.5, tidy: 22, think: '🛏️', say: 'made the bed' },
    water: { pose: 'water', dur: 14, tidy: 12, think: '💧', say: 'watered a plant', tool: 'can' },
    feed: { pose: 'feed', dur: 14, tidy: 8, think: '🥣', say: 'fed {pet}' },
    sweep: { pose: 'sweep', dur: 40, tidy: 14, think: '🧹', say: 'swept up', tool: 'broom' },
    dishes: { pose: 'dishes', dur: 50, tidy: 18, think: '🧽', say: 'washed up' },
    pat: { pose: 'pat', dur: 18, friends: 30, think: '💛' },
    plate: { pose: 'feed', dur: 3, tidy: 10, think: '🍽️', say: 'cleared a plate' },
    towel: { pose: 'feed', dur: 3, tidy: 10, think: '🧺', say: 'hung up the towel' },
    mow: { pose: 'fetch', dur: 1.5, tidy: 30, think: '🌱', say: 'mowed the lawn' }
  };
  // How long a thing is used for when they choose it themselves (seconds, real time: a show on TV, a chapter of a
  // book, a tune or two). Things not listed use their own dur from items.js.
  const DUR = {
    tv: [180, 360], bookcase: [120, 240], piano: [90, 180], guitar: [90, 180], easel: [150, 300], telescope: [90, 180],
    toychest: [120, 240], trampoline: [90, 180], pool: [120, 240], rockinghorse: [60, 120], kitchen: [90, 150], stove: [90, 150],
    fridge: [40, 80], sofa: [90, 240], armchair: [90, 240], beanbag: [90, 240], chair: [60, 150], deskchair: [90, 200], bench: [60, 150],
    catbed: [120, 300], kennel: [120, 300], bed: [120, 300], bunk: [120, 300], bath: [150, 300], bath2: [150, 300], shower: [90, 150], basin: [30, 60]
  };
  // The time of day shapes what they feel like: meals at mealtimes, the bed at night, the trampoline in the
  // daytime, the telescope after dark, making the bed in the morning. Parts of the day: morning (6 to 9), day,
  // midday (12 to 2), afternoon, evening (5 to 9), night.
  const ANY = { morning: 1, day: 1, midday: 1, afternoon: 1, evening: 1, night: 0.3 };
  const MEAL = { morning: 2.5, day: 0.4, midday: 2.2, afternoon: 0.6, evening: 2.5, night: 0.1 };
  const PLAY = { morning: 0.7, day: 1.2, midday: 1, afternoon: 1.4, evening: 1, night: 0.15 };
  const OUT = { morning: 0.8, day: 1.5, midday: 1.2, afternoon: 1.6, evening: 0.4, night: 0 };
  const WHEN = {
    bed: { morning: 0.1, day: 0.15, midday: 0.15, afternoon: 0.3, evening: 0.8, night: 4 }, bunk: null,
    kitchen: MEAL, stove: MEAL, fridge: MEAL,
    tv: { morning: 0.4, day: 0.6, midday: 0.8, afternoon: 1.5, evening: 1.6, night: 0.2 },
    bookcase: { morning: 0.6, day: 1, midday: 0.8, afternoon: 1, evening: 1.5, night: 0.8 },
    telescope: { morning: 0.1, day: 0.1, midday: 0.1, afternoon: 0.2, evening: 1.6, night: 2.5 },
    trampoline: OUT, pool: OUT, piano: PLAY, guitar: PLAY, easel: PLAY, toychest: PLAY, rockinghorse: PLAY,
    deskchair: { morning: 0.6, day: 1.3, midday: 0.8, afternoon: 1.3, evening: 0.8, night: 0.2 },
    makebed: { morning: 3, day: 1.2, midday: 1, afternoon: 1, evening: 0.8, night: 0 },
    sweep: { morning: 1.2, day: 1.2, midday: 1, afternoon: 1.2, evening: 0.6, night: 0 },
    water: { morning: 1.5, day: 1, midday: 0.8, afternoon: 0.8, evening: 1.2, night: 0 },
    dishes: { morning: 1, day: 1, midday: 1, afternoon: 1, evening: 1.2, night: 0.4 },
    mow: { morning: 1.2, day: 1.6, midday: 1.2, afternoon: 1.6, evening: 0.5, night: 0 },
    pat: ANY, feed: { morning: 1.5, day: 1, midday: 1, afternoon: 1, evening: 1.5, night: 0.5 },
    bath: { morning: 0.6, day: 0.3, midday: 0.3, afternoon: 0.6, evening: 2.2, night: 0.6 }, bath2: null,
    shower: { morning: 2.2, day: 0.4, midday: 0.3, afternoon: 0.6, evening: 1.2, night: 0.2 },
    basin: { morning: 2, day: 0.6, midday: 0.8, afternoon: 0.6, evening: 1.2, night: 1.5 }
  };
  WHEN.bath2 = WHEN.bath;
  // What each kind of pet gets up to, all pet things: playing with toys, exploring and sniffing about, climbing up
  // on furniture (cats), curling up to sleep, scratching an itch. Weights say how much it likes each.
  const PETS = {
    cat: { toy: 1.2, explore: 1, climb: 1.4, sleep: 1.4, scratch: 1, knead: 1 },
    dog: { toy: 1.6, explore: 1.4, climb: 0, sleep: 1, scratch: 1.2, knead: 0 },
    bunny: { toy: 0.6, explore: 1.6, climb: 0, sleep: 1, scratch: 0.8, knead: 0 }
  };
  WHEN.bunk = WHEN.bed;
  const when = (what, part) => { const w = WHEN[what]; return w ? w[part] : part === 'night' ? 0.3 : 1; };

  function make(kind) { const n = {}; for (const k in NEEDS[kind]) n[k] = 55 + Math.random() * 40; return n; }
  // runs needs down (dt seconds) and adds whatever is being given
  function tick(needs, kind, dt, gives, night) {
    for (const k in NEEDS[kind]) {
      const d = NEEDS[kind][k] * (k === 'energy' && night ? 2.2 : 1);
      needs[k] = Math.max(0, Math.min(100, needs[k] - d * dt + ((gives && gives[k]) || 0) * dt));
    }
  }
  // how much a need matters: little when nearly full, a lot as it runs low
  const want = v => { const e = Math.max(0, 100 - v) / 100; return e * e; };
  // Scores one option: what it gives over its time, weighted by need, less a little for distance. opts: each
  // { gives: {need: rate} or null, amount: {need: points} (chores), dur, dist, same (did it last time), urgent }.
  function score(needs, o) {
    let s = 0;
    if (o.gives) for (const k in o.gives) if (needs[k] != null) s += want(needs[k]) * Math.min(100 - needs[k], o.gives[k] * (o.dur || 20));
    if (o.amount) for (const k in o.amount) if (needs[k] != null) s += want(needs[k]) * Math.min(100, o.amount[k]) * 1.5;
    s += (o.urgent || 0) * 40;
    s /= 1 + (o.dist || 0) * 0.06;
    if (o.same) s *= 0.35;
    return s * (0.8 + Math.random() * 0.4);
  }
  // picks among the scored options, mostly the best, sometimes the next best (so it isn't a clockwork)
  function choose(options) {
    const ok = options.filter(o => o.score > 1).sort((a, b) => b.score - a.score);
    if (!ok.length) return null;
    const top = ok.slice(0, 3), tot = top.reduce((a, o) => a + o.score * o.score, 0); let r = Math.random() * tot;
    for (const o of top) { r -= o.score * o.score; if (r <= 0) return o; }
    return top[0];
  }
  // when to stop: the main thing it gives is full (or the time is up)
  const full = (needs, gives) => !gives || Object.keys(gives).every(k => needs[k] == null || needs[k] >= 97);

  // what each gives, slowed to match (so a show or a meal fills a need over its real length)
  for (const k in GIVES) for (const w of ['kid', 'pet']) if (GIVES[k][w]) GIVES[k][w] = Object.fromEntries(Object.entries(GIVES[k][w]).map(([n, v]) => [n, v * 0.15]));
  IH.life = { NEEDS, LABEL, GIVES, CHORES, DUR, PETS, when, make, tick, score, choose, full, want };
})();
