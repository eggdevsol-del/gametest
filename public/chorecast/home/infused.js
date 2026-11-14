/* Chorecast homes: Infused (a prototype). The chores and the lessons inside the game.
   On when the app passes opts.infused (Grown-ups → Island game → Infused); the app's side is the Infused module in
   index.html, which shows its own full-screen chores and proof wall and brings the kid back here when the job's done.
   - The game opens in the kid's home, close up. After 5 seconds, or their first tap, today's must-dos come up, and
     nothing in the game can be played until each has its photo in.
   - After that, extra jobs are offered at a break in play (arriving somewhere, closing the phone, a quiet moment), never
     in the middle of something: a choice of two, or "Not now". At least 8 minutes of play between offers, three a
     visit at most. (Kids stick with jobs they chose, at times that are predictable and don't cut into what they're
     doing, better than ones sprung on them at random.)
   - The phone gets Chores and Proof wall (the app's full screens) and Lessons and Languages: lessons from Character
     Growth as mini-games that fill the phone's screen, with a back button top left.
   - Unlocking something new (an animal, a machine, land, a kitchen thing, a language island) offers a lesson about
     it: the lesson that best fits, found by its words in the kid's own lessons. Nothing here is new lesson content. */
(() => {
  const IH = window.IsoHome = window.IsoHome || {};
  const GAP = (() => { try { const m = location.search.match(/[?&]infgap=(\d+)/); if (m) return +m[1] * 1000; } catch (e) { /* */ } return 8 * 60 * 1000; })();
  const MAX_OFFERS = 3, SNOOZE = 5 * 60 * 1000;
  let S = null; // { c (the game's handles), br (the app's bridge), layer, gated, ... }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const now = () => Date.now();
  const st = () => { const s = S.c.st(); return s.infused || (s.infused = { seen: {}, queue: [] }); };

  // ---------- what an unlock is about: words to find a lesson by, and the subjects to look in
  const TOPICS = [
    [/hen|chook|chicken|duck|cow|calf|goat|sheep|lamb|alpaca|pig|horse|pony|bee|hive|rabbit|animal/, ['animal', 'living', 'life', 'habitat', 'food chain', 'care'], ['science', 'body', 'character']],
    [/tractor|plough|drill|sprayer|baler|mower|trailer|harvester|tedder|rake|loader|wrapper|tiller|harrow|roller|spreader|mixer|blower|bowser|platform|shaker|subsoiler|planter|weeder|machine|reel|mulcher|bucket|spear/, ['big purchase', 'saving', 'save up', 'borrow', 'loan', 'cost', 'force', 'push', 'pull', 'machine', 'energy'], ['money', 'science']],
    [/block of land|field|orchard|raised bed|veggie bed|garden bed|fruit tree|seed|plant|garden|meadow/, ['plant', 'grow', 'seed', 'soil', 'water', 'sun', 'area', 'measure'], ['science', 'maths']],
    [/fridge|oven|stove|kitchen|food|recipe|cook|pantry|grocer/, ['food', 'eat', 'healthy', 'energy', 'meal'], ['body', 'science']],
    [/island|beach|lake|grove|stable|waterfall|lookout|sky|paddock/, ['habitat', 'ocean', 'water', 'weather', 'earth', 'goal', 'saving'], ['science', 'money']],
    [/sofa|chair|desk|lamp|rug|shelf|table|bed|wardrobe|plant pot|tv|wall|floor|window|door|paint/, ['needs', 'wants', 'budget', 'price', 'compare', 'shape', 'measure'], ['money', 'maths']],
  ];
  // a thing's own words, looked for first (a hen's lesson is about eggs and birds before living things in general)
  const OWN = { hen: ['egg', 'chicken', 'bird'], chook: ['egg', 'chicken', 'bird'], duck: ['egg', 'bird', 'duck'], cow: ['milk', 'cow', 'mammal'], calf: ['cow', 'mammal'], goat: ['milk', 'goat', 'mammal'], sheep: ['wool', 'sheep', 'mammal'], lamb: ['sheep', 'mammal'], alpaca: ['wool', 'mammal'], pig: ['pig', 'mammal'], horse: ['horse', 'mammal'], pony: ['horse', 'mammal'], bee: ['bee', 'honey', 'pollen', 'insect'], hive: ['bee', 'honey', 'insect'], rabbit: ['rabbit', 'mammal'],
    tractor: ['big purchase', 'save up', 'borrow'], fridge: ['food', 'fresh', 'cold'], oven: ['cook', 'heat'], orchard: ['fruit', 'tree', 'seed'], field: ['seed', 'soil', 'plant'] };
  const LANG_ISLE = { spain: 'es', china: 'zh', japan: 'ja' };

  // ---------- the layer the cards sit in (over the game, under the phone)
  function layer() {
    if (S.layer && S.layer.isConnected) return S.layer;
    const L = document.createElement('div'); L.className = 'inf-layer'; S.c.root.appendChild(L); S.layer = L; return L;
  }
  function card(html, o = {}) {
    const L = layer(); L.classList.toggle('block', !!o.block); L.innerHTML = `<div class="inf-card ${o.cls || ''}" role="dialog">${html}</div>`;
    L.hidden = false; return L.firstElementChild;
  }
  function clear() { if (S && S.layer) { S.layer.innerHTML = ''; S.layer.hidden = !S.gated; S.layer.classList.toggle('block', !!S.gated); } }

  // ---------- the must-dos come first
  function gateNow() {
    if (!S || !S.gated || S.gateUp) return;
    const left = S.br.must();
    if (!left.length) return openUp(false);
    S.gateUp = true; S.c.sound('pop');
    const el = card(`<div class="inf-k">Before you play 🎮</div><h2>Today’s must-dos</h2>
      <div class="inf-list">${left.map(c => `<div class="inf-row"><span>${c.icon}</span><b>${esc(c.title)}</b></div>`).join('')}</div>
      <p class="inf-sub">Do these first. Each one counts as soon as its photo is in, then it’s play time.</p>${later()}
      <button class="inf-go" data-i="go">Let’s do them</button>`, { block: true, cls: 'inf-gate' });
    el.querySelector('[data-i="go"]').addEventListener('click', () => {
      S.gateUp = false; clear(); S.br.track('gate.open', { left: left.length });
      S.br.gate().then(() => { if (!S) return; const n = S.br.must().length; if (n) { S.gateUp = false; gateNow(); } else openUp(true); });
    });
  }
  // must-dos that come later today (dinner jobs, say): shown, so they're no surprise
  const hr = h => { const H = Math.floor(h), m = Math.round((h - H) * 60); return `${H % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${H < 12 ? 'am' : 'pm'}`; };
  const later = () => { const L = S.br.soon ? S.br.soon() : []; return L.length ? `<div class="inf-soon">Later today: ${L.map(c => `${c.icon} ${esc(c.title)} at ${hr(c.at)}`).join(' · ')}</div>` : ''; };
  function openUp(did) {
    S.gated = false; S.gateUp = false; S.lastOffer = now(); clear(); S.layer.hidden = true;
    if (did) { S.c.sound('buy'); S.c.toast('All your must-dos are done! ✨ Play time.'); S.br.track('gate.done', {}); }
    else { const L = S.br.soon ? S.br.soon() : []; S.c.toast(L.length ? `Must-dos done for now ✓ Play time! ${L[0].icon} ${L[0].title} comes at ${hr(L[0].at)}.` : 'Must-dos all done today ✓ Play time!'); }
  }

  // ---------- extra jobs, at a break in play
  function brk(why, where) {
    if (!S || S.gated) return;
    if (S.dueAt && S.br.must().length) return regate();
    if (why === 'arrive' && LANG_ISLE[where]) setTimeout(() => langNudge(LANG_ISLE[where]), 5000);
    if (S.offers >= MAX_OFFERS || now() - S.lastOffer < GAP || S.layer.querySelector('.inf-card')) return;
    const list = S.br.extras(); if (!list.length) return;
    // fixed-price jobs first (their pay moves the goal bar by a known amount), in a fresh order each time
    const pick = list.map(c => [c, (c.pay > 0 ? 0 : 1) + Math.random()]).sort((a, b) => a[1] - b[1]).map(x => x[0]).slice(0, 2); S.offers++; S.lastOffer = now();
    // the offer shows the kid's own saving goal, and how far each job moves it (its pay into the Save jar at their
    // split); with no goal set, each job's pay and time instead
    const G = S.br.goal ? S.br.goal() : null, pct = n => Math.min(100, Math.round(n / G.target * 100));
    const opt = c => { const add = G && c.pay ? Math.round(c.pay * G.share) : 0;
      return `<button class="inf-copt" data-k="${esc(c.key)}" data-add="${add}"><span class="e">${c.icon}</span><span class="t"><b>${esc(c.title)}</b><small>${c.mins ? `${c.mins} min` : ''}${G && add ? ` · ${esc(c.payTxt || '')}` : ''}</small></span>${G && add ? `<span class="plus">+${esc(G.fmt(add))}<small>${pct(G.saved)}% → ${pct(G.saved + add)}%</small></span>` : `<span class="plus pay">${esc(c.payTxt || '')}</span>`}</button>`; };
    const el = card(`${G ? `<div class="inf-goal"><span class="g">${G.icon}</span><div class="gi"><b>${esc(G.name)}</b><small data-g="txt">${esc(G.fmt(G.saved))} of ${esc(G.fmt(G.target))} saved</small><div class="inf-gbar"><u data-g="add" style="width:${pct(G.saved)}%"></u><i style="width:${pct(G.saved)}%"></i></div></div></div>
      <h2>Pick a job to get closer</h2>` : `<div class="inf-k">A good moment for a job? 🙌</div><h2>Pick a job</h2>`}
      <div class="inf-list">${pick.map(opt).join('')}</div>
      <button class="inf-later" data-i="later">Not now</button>`, { cls: 'offer goal' });
    S.br.track('offer', { why, n: pick.length, goal: !!G });
    if (G) { const bar = el.querySelector('[data-g="add"]'), txt = el.querySelector('[data-g="txt"]');
      const show = add => { bar.style.width = pct(G.saved + add) + '%'; txt.textContent = `${G.fmt(G.saved + add)} of ${G.fmt(G.target)} saved`; };
      el.querySelectorAll('.inf-copt').forEach(b => { b.addEventListener('pointerenter', () => show(+b.dataset.add)); b.addEventListener('pointerleave', () => show(0)); }); }
    el.querySelectorAll('.inf-copt').forEach(b => b.addEventListener('click', () => {
      if (G && !b.classList.contains('lit')) { // (the first tap shows where the bar would get to; the second takes the job)
        el.querySelectorAll('.inf-copt').forEach(x => x.classList.remove('lit')); b.classList.add('lit'); const bar = el.querySelector('[data-g="add"]'); bar.style.width = pct(G.saved + +b.dataset.add) + '%'; el.querySelector('[data-g="txt"]').textContent = `${G.fmt(G.saved + +b.dataset.add)} of ${G.fmt(G.target)} saved`; S.c.sound('pop'); return; }
      clear(); S.br.track('offer.take', { key: b.dataset.k }); S.br.chore(b.dataset.k).then(r => { if (S && r && r.did) { S.c.sound('buy'); S.c.toast(G ? `Nice work! ✨ Closer to your ${G.name.toLowerCase()}.` : 'Nice work! ✨ Back to it.'); } });
    }));
    el.querySelector('[data-i="later"]').addEventListener('click', () => { clear(); S.lastOffer = now() - GAP + SNOOZE; S.br.track('offer.later', {}); });
  }
  // A must-do whose time has come (dinner jobs at dinner time): a heads-up, then the must-dos card again at the next
  // break, or in two minutes at the latest
  function dueCheck() {
    if (!S || S.gated) return;
    const due = S.br.must(); if (!due.length) { S.dueAt = 0; return; }
    if (!S.dueAt) { S.dueAt = now(); S.c.sound('pop'); S.c.toast(`${due[0].icon} Time for ${due.length === 1 ? due[0].title.toLowerCase() : 'some must-dos'} soon. Play stops in 2 minutes until ${due.length === 1 ? 'it’s' : 'they’re'} done.`); return; }
    if (now() - S.dueAt > 120000) regate();
  }
  function regate() { if (!S || S.gated) return; S.gated = true; S.gateUp = false; S.dueAt = 0; clear(); S.layer.hidden = false; S.layer.classList.add('block'); gateNow(); }

  // ---------- lessons for unlocks
  function unlocked(name, kind) {
    if (!S || !S.br.growth || !name) return;
    const key = String(name).toLowerCase().replace(/^(a|an|the|some|\d+ ×?)\s+/, '').replace(/ \(used\)$/, ''), seen = st().seen;
    if (/seed|feed|vet|spray|lime|fertili|compost|fuel|grocer|bill|wage|trade|mowing|service|treat|meal|straw|water/.test(key) || seen[key]) return; // (everyday things aren't unlocks)
    seen[key] = now(); S.c.save();
    const T = TOPICS.find(([re]) => re.test(key)) || [null, ['spend', 'needs', 'wants', 'budget', 'choice', 'price'], ['money']];
    const own = Object.entries(OWN).filter(([w]) => new RegExp(`\\b${w}`).test(key)).flatMap(([, ws]) => ws), words = [...own, ...T[1]];
    S.br.growth.ready().then(() => {
      const found = S.br.growth.find(words, T[2]); if (!found.length || !S) return;
      const L = found[0], q = st().queue; if (!q.some(x => x.id === L.id)) q.unshift({ id: L.id, title: L.title, icon: L.icon, tree: L.tree, why: name }); q.splice(6); S.c.save();
      if (S.gated || S.layer.querySelector('.inf-card')) return;
      const el = card(`<div class="inf-k">🔓 New: ${esc(name.replace(/^(a|an|the)\s+/i, ''))}</div><h2>${L.icon} ${esc(L.title)}</h2>
        <p class="inf-sub">A lesson that goes with it, as a quick game on your phone.</p>
        <div class="inf-two"><button class="inf-later" data-i="later">Later</button><button class="inf-go" data-i="play">Play it</button></div>`, { cls: 'offer' });
      S.br.track('unlock.lesson', { what: key, lesson: L.id, kind });
      el.querySelector('[data-i="later"]').addEventListener('click', () => { clear(); S.c.toast('It’s in Lessons on your phone, under For you.'); });
      el.querySelector('[data-i="play"]').addEventListener('click', () => { clear(); S.c.phone('learn'); setTimeout(() => P && P.go({ v: 'game', id: L.id, back: { v: 'home' } }), 50); });
    }, () => {});
  }
  function langNudge(lang) {
    if (!S || !S.br.growth || S.gated || S.layer.querySelector('.inf-card')) return;
    S.br.growth.ready().then(() => {
      const ls = S.br.growth.langs(); if (!ls.some(x => x.id === lang)) return;
      const nx = S.br.growth.langNext(lang)[0]; if (!nx) return;
      const el = card(`<div class="inf-k">🗣️ You’re in ${esc((ls.find(x => x.id === lang) || {}).title || '')} country</div><h2>${nx.icon} ${esc(nx.title)}</h2>
        <p class="inf-sub">Learn a few words while you’re here, as a quick game on your phone.</p>
        <div class="inf-two"><button class="inf-later" data-i="later">Later</button><button class="inf-go" data-i="play">Play it</button></div>`, { cls: 'offer' });
      el.querySelector('[data-i="later"]').addEventListener('click', clear);
      el.querySelector('[data-i="play"]').addEventListener('click', () => { clear(); S.c.phone('langs'); setTimeout(() => P && P.go({ v: 'game', id: nx.id, back: { v: 'lang', tree: lang } }), 50); });
    }, () => {});
  }

  // ---------- the phone's Lessons and Languages: mini-games filling the phone's screen
  let P = null; // { el, app, view }
  function mount(el, app) {
    P = { el, app, view: null }; el.addEventListener('click', onPhone);
    if (!S || !S.br.growth) { el.innerHTML = `${top('Lessons')}<p class="inf-sub">Lessons aren’t ready on this device yet.</p>`; return; }
    el.innerHTML = `${top(app === 'langs' ? 'Languages' : 'Lessons')}<p class="inf-sub">Getting your lessons…</p>`;
    S.br.growth.ready().then(() => { if (P && P.el === el) P.go({ v: 'home' }); }, () => { el.innerHTML = `${top('Lessons')}<p class="inf-sub">Your lessons couldn’t load. Check the internet.</p>`; });
    P.go = view => { if (!P || P.el !== el) return; P.view = view; draw(); };
  }
  const top = (title, back = true) => `<div class="inf-ph-top">${back ? '<button class="inf-ph-back" data-p="back" aria-label="Back">‹</button>' : ''}<b>${esc(title)}</b></div>`;
  function draw() {
    const G = S.br.growth, v = P.view, el = P.el;
    if (v.v === 'home' && P.app === 'learn') {
      const q = st().queue, subs = G.subjects();
      el.innerHTML = `${top('Lessons')}${q.length ? `<div class="inf-sec">For you</div><div class="inf-ls">${q.map(x => `<button class="inf-li" data-p="game" data-id="${esc(x.id)}"><span>${x.icon}</span><b>${esc(x.title)}</b><small>Goes with ${esc(String(x.why).replace(/^(a|an|the)\s+/i, ''))}</small></button>`).join('')}</div>` : ''}
        <div class="inf-sec">Subjects</div><div class="inf-grid">${subs.map(t => `<button class="inf-sub-b" data-p="tree" data-tree="${t.id}"><span>${t.icon}</span>${esc(t.title)}</button>`).join('')}</div>`;
    } else if (v.v === 'home') {
      const ls = G.langs();
      el.innerHTML = `${top('Languages')}${ls.length ? `<div class="inf-grid">${ls.map(L => `<button class="inf-sub-b" data-p="lang" data-tree="${L.id}"><span>${L.icon}</span>${esc(L.title)}</button>`).join('')}</div>` : '<p class="inf-sub">Pick a language to learn in Grow first, then its games show up here.</p>'}`;
    } else if (v.v === 'tree' || v.v === 'lang') {
      const ls = G.lessons(v.tree);
      el.innerHTML = `${top(v.v === 'lang' ? 'Languages' : 'Lessons')}<div class="inf-ls">${ls.map(l => `<button class="inf-li" data-p="game" data-id="${esc(l.id)}"><span>${l.icon}</span><b>${esc(l.title)}</b><small>Unit ${l.unit}${l.passed ? ' · ✓ passed' : ''}</small></button>`).join('') || '<p class="inf-sub">No games here yet.</p>'}</div>`;
    } else if (v.v === 'game') {
      if (!v.g) { v.g = G.game(v.id); v.i = 0; v.right = 0; v.total = 0; if (!v.g) { el.innerHTML = `${top('Lessons')}<p class="inf-sub">That lesson hasn’t got a game yet.</p>`; return; } }
      const it = v.g.items[v.i];
      if (!it) return finish(v);
      const bar = `<div class="inf-bar"><i style="width:${Math.round(v.i / v.g.items.length * 100)}%"></i></div>`, say = it.say ? `<button class="inf-say" data-p="say" aria-label="Hear it">🔊</button>` : '';
      if (it.kind === 'learn') el.innerHTML = `${top(v.g.title)}${bar}<div class="inf-learn"><span class="inf-big">${v.g.icon}</span><p>${esc(it.t)}</p>${say}</div><button class="inf-go" data-p="next">Next</button>`;
      else if (it.kind === 'tf') el.innerHTML = `${top(v.g.title)}${bar}<div class="inf-q"><small>True or false?</small><p>${esc(it.q)}</p></div><div class="inf-opts two"><button class="inf-opt" data-p="ans" data-v="1">True</button><button class="inf-opt" data-p="ans" data-v="0">False</button></div><div class="inf-why" hidden></div>`;
      else el.innerHTML = `${top(v.g.title)}${bar}<div class="inf-q"><p>${esc(it.q)}</p>${say}</div><div class="inf-opts ${it.big ? 'big' : ''}">${it.opts.map((o, i) => `<button class="inf-opt" data-p="ans" data-v="${i}">${esc(o.t)}</button>`).join('')}</div><div class="inf-why" hidden></div>`;
      if (it.say && v.said !== v.i) { v.said = v.i; G.say(it.say, it.lang); }
    }
  }
  function finish(v) {
    if (!v.paid) { v.paid = true; v.xp = S.br.growth.finish(v.id, v.right, v.total); const q = st().queue, i = q.findIndex(x => x.id === v.id); if (i >= 0) { q.splice(i, 1); S.c.save(); } }
    const stars = v.total ? Math.round(v.right / v.total * 3) : 0;
    P.el.innerHTML = `${top(v.g.title)}<div class="inf-end"><div class="inf-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><h2>${v.right} of ${v.total} right</h2><p class="inf-sub">${v.xp ? `+${v.xp} XP for your learning` : 'Today’s practice XP is full: playing still counts as practice.'}</p>
      <div class="inf-two"><button class="inf-later" data-p="back">Done</button><button class="inf-go" data-p="again">Play again</button></div></div>`;
    S.c.sound(stars >= 2 ? 'buy' : 'pop');
  }
  function onPhone(e) {
    const b = e.target.closest('[data-p]'); if (!b || !P) return; e.stopPropagation();
    const a = b.dataset.p, v = P.view || {};
    if (a === 'back') { if (!v || v.v === 'home') return S.c.phone('home'); if (v.v === 'game' && v.back) return P.go(v.back); return P.go(v.v === 'game' ? { v: P.app === 'langs' ? 'lang' : 'tree', tree: v.g ? v.g.tree : v.tree } : { v: 'home' }); }
    if (a === 'tree' || a === 'lang') return P.go({ v: a, tree: b.dataset.tree });
    if (a === 'game') return P.go({ v: 'game', id: b.dataset.id, back: v });
    if (a === 'again') return P.go({ v: 'game', id: v.id, back: v.back });
    if (a === 'next') { v.i++; return draw(); }
    if (a === 'say') { const it = v.g && v.g.items[v.i]; if (it && it.say) S.br.growth.say(it.say, it.lang); return; }
    if (a === 'ans' && !v.locked) {
      const it = v.g.items[v.i], ok = it.kind === 'tf' ? (b.dataset.v === '1') === it.a : !!it.opts[+b.dataset.v].ok;
      v.locked = true; v.total++; if (ok) v.right++;
      b.classList.add(ok ? 'ok' : 'no'); S.c.sound(ok ? 'pop' : 'no');
      if (!ok && it.kind !== 'tf') P.el.querySelectorAll('.inf-opt').forEach((x, i) => { if (it.opts[i].ok) x.classList.add('ok'); });
      if (!ok && it.kind === 'tf') P.el.querySelector(`.inf-opt[data-v="${it.a ? 1 : 0}"]`).classList.add('ok');
      const why = P.el.querySelector('.inf-why'); if (why && it.why && !ok) { why.hidden = false; why.textContent = it.why; }
      setTimeout(() => { v.locked = false; v.i++; if (P && P.view === v) draw(); }, ok ? 650 : 1600);
    }
  }

  IH.infused = {
    // c: the game's handles { root, st, save, toast, sound, phone, closeUp }; br: the app's bridge
    start(c, br) {
      S = { c, br, gated: true, gateUp: false, offers: 0, lastOffer: now(), lastIn: now(), layer: null };
      layer(); S.layer.classList.add('block'); S.layer.hidden = false;
      setTimeout(() => S && S.c.closeUp && S.c.closeUp(), 400);
      S.t5 = setTimeout(gateNow, 5000);
      S.onIn = () => { if (!S) return; S.lastIn = now(); if (S.gated) gateNow(); };
      S.layer.addEventListener('pointerdown', S.onIn);
      c.root.addEventListener('pointerdown', () => { if (S) S.lastIn = now(); }, true);
      // a quiet moment counts as a break: nothing touched for 25 seconds
      S.tick = setInterval(() => { dueCheck(); if (S && !S.gated && now() - S.lastIn > 25000 && !document.querySelector('.ih-sheet:not([hidden])')) brk('quiet'); }, 15000);
    },
    stop() { if (!S) return; clearTimeout(S.t5); clearInterval(S.tick); if (S.layer) S.layer.remove(); S = null; P = null; },
    get on() { return !!S; },
    get gated() { return !!(S && S.gated); },
    brk, unlocked, mount,
    unmount() { P = null; },
    apps: () => (S ? [['chores', '✅', 'Chores'], ['proof', '📸', 'Proof wall'], ['learn', '🧠', 'Lessons'], ['langs', '🗣️', 'Languages']] : []),
    open(app) { if (!S) return false; if (app === 'chores') { S.br.chores(); return true; } if (app === 'proof') { S.br.proof(); return true; } return false; },
  };
})();
