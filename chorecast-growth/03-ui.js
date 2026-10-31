
/* ---------- The Character Growth screen ----------
   A full-screen overlay above the app: a 3D stage with the kid's guide, and beside or below it the skill
   trees, a tree's path of lessons, or the lesson being played. */
const Grow = { open: false, kidId: null, view: 'hub', tree: null, run: null, stage: null, need: 0, sessionAt: 0, breakShown: false, cleanup: [] };
const BEATS = ['Hook', 'Guess', 'Learn', 'Try', 'Play', 'Check', 'Home'];
const BEAT_OF = { hook: 0, guess: 1, learn: 2, try: 3, play: 4, check: 5, home: 6 };
const kidNow = () => Store.kids[Grow.kidId] || null;
let root = null, ui = null;

function mount() {
  if (root) return;
  root = document.createElement('div'); root.id = 'growth'; root.className = 'gw'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Character Growth');
  root.innerHTML = `<div class="gw-stage"><canvas class="gw-cv" aria-hidden="true"></canvas><div class="gw-say" aria-live="polite"></div></div><div class="gw-ui"></div>`;
  document.body.appendChild(root); ui = root.querySelector('.gw-ui');
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', e => { if (Grow.open && e.key === 'Escape') { e.stopPropagation(); back(); } }, true);
}
const stop = s => /[.?!…]$/.test(s) ? s : s + '.';
function say(text) { const b = root && root.querySelector('.gw-say'); if (!b) return; b.textContent = local(text || ''); b.classList.toggle('on', !!text); }

async function open(kidId, opts = {}) {
  const kid = Store.kids[kidId]; if (!kid) return;
  mount(); Grow.kidId = kidId; Grow.need = opts.need || 0; Grow.view = 'hub'; Grow.tree = opts.tree || null; Grow.run = null;
  root.hidden = false; Grow.open = true; document.body.classList.add('gw-open'); Grow.sessionAt = Date.now(); Grow.breakShown = false;
  Sound.ensure(); Sound.whoosh();
  if (!Grow.stage) { Grow.stage = Stage3D(root.querySelector('.gw-cv')); }
  if (Grow.stage) { Grow.stage.setGuide(prog(kid).guide || 'kea'); Grow.stage.start(); }
  ui.innerHTML = `<div class="gw-loading">${C.sunMark ? C.sunMark(48) : ''}<p>Growing your skill trees…</p></div>`;
  await Promise.all([loadBand(bandOf(kid)), loadExtras()]);
  scanEchoes(kid);
  if (!prog(kid).guide) Grow.view = 'guide';
  else if (Grow.tree) Grow.view = 'tree';
  render();
  C.track('growth.open', { from: opts.from || (opts.need ? 'shop' : opts.tree ? 'tree' : 'card') }, kidId);
}
function close() {
  if (!root) return; Grow.cleanup.splice(0).forEach(f => f()); try { speechSynthesis.cancel(); } catch (e) {}
  root.hidden = true; Grow.open = false; document.body.classList.remove('gw-open'); if (Grow.stage) Grow.stage.stop(); if (PlantView.ok) PlantView.stop(); HowTo.stop();
  C.scheduleRender();
}
function back() {
  if (Grow.view === 'lesson' || Grow.view === 'done' || Grow.view === 'case' || Grow.view === 'challenge') { Grow.cleanup.splice(0).forEach(f => f()); Grow.view = Grow.tree ? 'tree' : 'hub'; Grow.run = null; return render(); }
  if (Grow.view !== 'hub' && Grow.view !== 'guide') { Grow.view = 'hub'; Grow.tree = null; return render(); }
  close();
}

/* ---------- What to learn next ---------- */
function treesOn() { const off = GSET().off || {}; return TREES.filter(t => !off[t.id]); }
function available(kid, l) {
  // A lesson opens once the lesson before it in its unit is passed; each unit opens when the unit before is done.
  const pack = packFor(l.tree, l.band), u = pack.units.find(x => x.n === l.unit), i = u.lessons.indexOf(l);
  if (i > 0 && !passed(kid, u.lessons[i - 1].id)) return false;
  const prevU = pack.units.filter(x => x.n < u.n && x.lessons.length).pop();
  return !prevU || prevU.lessons.every(x => passed(kid, x.id));
}
function nextIn(kid, treeId) { const pack = packFor(treeId, bandOf(kid)); if (!pack) return null; for (const u of pack.units) for (const l of u.lessons) if (!passed(kid, l.id) && available(kid, l)) return l; return null; }
// Unit challenges a kid has opened (every lesson in the unit passed) but hasn't won the crown for yet
function openCrowns(kid) {
  const won = prog(kid).units || {};
  return treesOn().flatMap(tree => { const pack = packFor(tree.id, bandOf(kid)); return pack ? pack.units.filter(u => u.lessons.length && u.lessons.every(l => passed(kid, l.id)) && !((won[u.id] || {}).best >= 0.8)).map(u => ({ u, tree })) : []; });
}
// A unit challenge asks up to 8 of the unit's questions
const crownSize = u => Math.min(8, u.lessons.reduce((n, l) => n + l.checks.length, 0));
// With every lesson passed, the home screen says so plainly and points at what's still to win
function allDoneCard(kid) {
  const crowns = openCrowns(kid);
  return `<section class="gw-alldone"><span class="gad-ic" aria-hidden="true">${crowns.length ? '🏆' : '🌸'}</span><div><b>You finished every lesson!</b><p>${crowns.length
    ? `Next, win your unit crown${crowns.length === 1 ? '' : 's'}. A crown quiz mixes questions from a whole unit. Get 80% or more right to win the crown and ${XP.challenge} XP.`
    : 'You won every unit crown too. Amazing! New lessons are on the way in an update.'}</p></div></section>
    ${crowns.length ? `<div class="gw-pick">${crowns.map(({ u, tree }, i) => `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tree.hue}" data-g="challenge" data-id="${u.id}"><span class="lc-ic">🏆</span><span class="lc-t"><small>${esc(tree.name)} · Unit ${u.n} crown</small><b>${esc(local(u.title))}</b><em>${crownSize(u)} questions · ${passGoal(crownSize(u))} · +${XP.challenge} XP</em></span><span class="lc-go">${ic('play')}</span></button>`).join('')}</div>` : ''}`;
}
function suggestions(kid, n = 3) {
  const g = prog(kid), assigned = (g.assigned || []).map(a => lessonById(a.id)).filter(l => l && !passed(kid, l.id));
  const recent = (g.log || []).slice().reverse().map(x => String(x.id).split('.')[0]);
  const trees = treesOn().map(t => ({ t, next: nextIn(kid, t.id), done: treeStats(kid, t.id).done, recent: recent.indexOf(t.id) })).filter(x => x.next);
  trees.sort((a, b) => (a.recent === -1 ? 99 : a.recent) - (b.recent === -1 ? 99 : b.recent) || a.done - b.done);
  const r = mulberry(hash(kid.id + today())), first = trees.shift(), rest = shuffle(trees, r);
  return [...assigned, ...(first ? [first.next] : []), ...rest.map(x => x.next)].filter((l, i, a) => a.indexOf(l) === i).slice(0, n);
}
function hasLesson(kid) { if (!allLessons(bandOf(kid)).length) { loadBand(bandOf(kid)).then(() => C.scheduleRender()); return true; } return !!suggestions(kid, 1).length; }

/* ---------- Rendering ---------- */
function render() {
  if (!root || !Grow.open) return; const kid = kidNow(); if (!kid) return close();
  Grow.cleanup.splice(0).forEach(f => f()); HowTo.stop();
  const v = Grow.view, tree = Grow.tree && TREE[Grow.tree];
  root.style.setProperty('--gh', (tree || (Grow.run && TREE[Grow.run.lesson ? Grow.run.lesson.tree : Grow.run.tree]) || { hue: '#2F6FE4' }).hue);
  root.dataset.view = v;
  if (Grow.stage) Grow.stage.setScene(v === 'tree' && tree ? tree.scene : Grow.run && Grow.run.lesson ? Grow.run.lesson.scene : Grow.run && Grow.run.scene ? Grow.run.scene : 'island');
  // The tree view is a full-screen plant with its own 3D view, so the stage rests. Every question takes place in
  // front of the plant, which grows with each right answer in a lesson's quiz; reading steps and the finish screen
  // show their own 3D scene on the stage, and other screens show just the guide.
  const plant = PlantView.ok && (v === 'tree' || plantStep());
  if (Grow.stage) { if (plant) Grow.stage.stop(); else Grow.stage.start(); if (!RUN_VIEWS.includes(v) && v !== 'done') Grow.stage.show(null); }
  if (PlantView.ok && !plant) PlantView.stop();
  if (v === 'guide') return viewGuide(kid);
  if (v === 'hub') return viewHub(kid);
  if (v === 'tree') return viewTree(kid, tree);
  if (v === 'lesson' || v === 'challenge' || v === 'review' || v === 'moment' || v === 'echo' || v === 'story' || v === 'case') return viewRun(kid);
  if (v === 'done') return viewDone(kid);
  if (v === 'break') return viewBreak(kid);
  if (v === 'crewPick') return viewCrewPick(kid);
  if (v === 'crew') return viewCrew();
}
const RUN_VIEWS = ['lesson', 'challenge', 'review', 'moment', 'echo', 'story', 'case'];
// Steps that ask the kid something. All of them play in front of the plant.
const ASKS = ['check', 'guess', 'try', 'play', 'decide'];
const plantStep = () => { const R = Grow.run; return RUN_VIEWS.includes(Grow.view) && !!R && ASKS.includes(R.steps[R.k].kind); };
// The subject a question's plant view looks along: its lesson's, its story's, or else Money Sense, the stalk
const plantTree = (R, step) => TREE[(R.lesson && R.lesson.tree) || step.tree || R.tree] || TREE.money || TREES[0];
// A lesson's quiz grows the plant and a unit's crown quiz lights its ring
const plantQuiz =() => { const R = Grow.run; return (Grow.view === 'lesson' || Grow.view === 'challenge') && !!R && (R.mode === 'lesson' || R.mode === 'challenge') && R.steps[R.k].kind === 'check'; };
const topbar = (kid, title, sub) => `<header class="gw-top"><button class="gw-back" data-g="back" aria-label="Back">${ic('back')}<span>${Grow.view === 'hub' ? 'Back to my sky' : 'Back'}</span></button><div class="gw-tt"><b>${esc(title)}</b>${sub ? `<small>${sub}</small>` : ''}</div>${xpRing(kid)}</header>`;
function xpRing(kid) {
  const d = dayInfo(kid), p = Math.min(1, d.xp / XP.dayCap), R = 17, L = 2 * Math.PI * R;
  return `<div class="gw-xp" title="XP from Character Growth today"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${R}" class="t"/><circle cx="22" cy="22" r="${R}" class="b" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}" transform="rotate(-90 22 22)"/></svg><span><b class="num">${d.xp}</b><small>/${XP.dayCap} XP today</small></span></div>`;
}

function viewGuide(kid) {
  say('Hi! Who would you like to learn with?');
  ui.innerHTML = `<div class="gw-pad"><h1 class="gw-h1">Pick your guide</h1><p class="gw-p">Your guide cheers you on, explains new ideas and hops when you get it right.</p>
    <div class="gw-guides">${[['kea', '🦜', 'Kiri the kea', 'A cheeky, clever mountain parrot from Aotearoa'], ['cocky', '🐦', 'Coco the cockatoo', 'A loud, happy cockatoo with a sunshine crest'], ['robot', '🤖', 'Bolt the robot', 'A friendly robot who loves numbers']].map(([k, e, n, d]) => `<button class="gw-guide" data-g="guide" data-k="${k}"><span class="gg-e">${e}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>`;
}

function viewHub(kid) {
  Prize.tick(kid);
  const g = prog(kid), lvl = charLevel(kid), m = mastered(kid), sug = suggestions(kid, 3), due = dueCards(kid).length, echo = (g.echo || []).length;
  const mom = momentFor(kid), momDone = g.mom && g.mom.d === today() && g.mom.done, story = marketStory(kid), storyDone = g.story === weekKey();
  const t = titles(kid), needN = Grow.need ? Math.ceil(Grow.need / XP.lesson) : 0;
  say(Grow.need ? `You need ${Grow.need} more XP. ${needN === 1 ? 'One lesson' : `${needN} lessons`} will do it!` : sug.length ? `Ready, ${kid.name}? Pick what to learn next.` : openCrowns(kid).length ? `You finished every lesson, ${kid.name}! Now win your unit crowns.` : `You’ve done everything here, ${kid.name}! New lessons arrive in updates.`);
  const tile = (g2, ico, title, sub, extra = '') => `<button class="gw-tile" data-g="${g2}" ${extra}><span class="gt-ic">${ico}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
  ui.innerHTML = `${topbar(kid, 'Character Growth', `${esc(kid.name)} · ${BANDS[BAND_IX[bandOf(kid)]].name}, ages ${BANDS[BAND_IX[bandOf(kid)]].ages}`)}
    <div class="gw-pad">
      <section class="gw-me"><div class="gw-lvl"><b class="num">${lvl}</b><small>Level</small></div><div class="gw-me-t"><b>${m} skill${m === 1 ? '' : 's'} mastered</b><small>${t.length ? t.map(esc).join(' · ') : 'Master 4 lessons in a tree to earn its title'}</small>${minutesToday(kid) ? `<small>${minutesToday(kid)} minute${minutesToday(kid) === 1 ? '' : 's'} of learning today</small>` : ''}</div></section>
      ${!sug.length && !Grow.need ? allDoneCard(kid) : ''}
      ${prizeStrip(kid)}
      ${Grow.need ? `<div class="gw-need">${ic('sparkle')} Each lesson you pass pays ${XP.lesson} XP, up to ${XP.dayCap} XP a day.</div>` : ''}
      ${sug.length ? `<h2 class="gw-h2">Pick your next lesson</h2><div class="gw-pick">${sug.map((l, i) => { const tr = TREE[l.tree], as = (g.assigned || []).find(a => a.id === l.id); return `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tr.hue}" data-g="lesson" data-id="${l.id}"><span class="lc-ic">${esc(l.icon)}</span><span class="lc-t"><small>${esc(tr.name)} · Unit ${l.unit}</small><b>${esc(local(l.title))}</b>${as ? `<em>From a grown-up${as.bonus ? ` · +${as.bonus} XP bonus` : ''}</em>` : ''}</span><span class="lc-go">${ic('play')}</span></button>`; }).join('')}</div>` : ''}
      <div class="gw-tiles">
        ${due ? tile('review', '🔁', `${due} review${due === 1 ? '' : 's'} due`, 'Quick questions so you remember') : ''}
        ${echo ? tile('echo', '💡', `${echo} question${echo === 1 ? '' : 's'} about your week`, `+${XP.echo} XP each`) : ''}
        ${mom ? tile('moment', momDone ? '✅' : '💬', 'Today’s Money Moment', momDone ? 'Done for today' : `30 seconds · +${XP.moment} XP`) : ''}
        ${story && !storyDone ? tile('story', '📰', 'This week in the market', `+${XP.story} XP`) : ''}
        ${C.kidsList().length > 1 ? tile('crewPick', '👯', 'Crew quiz', 'Answer side by side with a sibling') : ''}
      </div>
      <h2 class="gw-h2">${treesOn().length <= 3 ? 'Your Learning Tree' : 'Skill trees'}</h2>
      ${constellation(kid)}
      ${casesFor(kid).length ? `<h2 class="gw-h2">Real stories</h2><div class="gw-cases">${casesFor(kid).slice(0, 12).map(cs => `<button class="gw-case ${(prog(kid).cases || {})[cs.id] ? 'done' : ''}" data-g="case" data-id="${cs.id}" style="--th:${(TREE[cs.tree] || {}).hue || '#2F6FE4'}"><span>${esc(cs.icon)}</span><b>${esc(cs.name)}</b><small>${esc((TREE[cs.tree] || {}).name || '')}</small></button>`).join('')}</div>` : ''}
    </div>`;
}
// The 12 trees as a staggered constellation, 3 across and 4 down, each linked to its neighbours.
function constellation(kid) {
  const on = treesOn(), W = 600, H = 800;
  // With up to three live trees there's little to link, so each gets a big door into its part of the Learning Tree.
  if (on.length <= 3) {
    const door = t => { const st = treeStats(kid, t.id), nx = nextIn(kid, t.id); return `<button class="gw-one ${nx ? 'open' : ''}" style="--th:${t.hue}" data-g="tree" data-id="${t.id}"><span class="g1-ic">${t.icon}</span><span class="g1-t"><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small><span class="g1-bar"><i style="width:${st.total ? st.done / st.total * 100 : 0}%"></i></span><small>${st.done} of ${st.total} lessons · ${t.id === 'money' ? (st.done ? 'See your tree grow' : 'Plant your seed') : st.done ? 'See your branch grow' : 'Start a new branch'}</small></span></button>`; };
    return `<div class="gw-ones">${on.map(door).join('')}</div>`;
  }
  const pos = on.map((t, i) => { const c = i % 3, r = Math.floor(i / 3); return { t, c, r, x: 100 + c * 200, y: 95 + r * 190 + (c === 1 ? 70 : 0) }; });
  const at = (r, c) => pos.find(p => p.r === r && p.c === c);
  const links = pos.flatMap(p => [at(p.r, p.c + 1), at(p.r + 1, p.c)].filter(Boolean).map(q => `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`)).join('');
  return `<div class="gw-const" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="gw-links">${links}</g></svg>
    ${pos.map(({ t, x, y }) => { const st = treeStats(kid, t.id), p = st.total ? st.done / st.total : 0, nx = nextIn(kid, t.id), R = 31, L = 2 * Math.PI * R; return `<button class="gw-star ${nx ? 'open' : ''} ${st.total && st.done === st.total ? 'full' : ''}" style="left:${x / W * 100}%;top:${y / H * 100}%;--th:${t.hue}" data-g="tree" data-id="${t.id}" aria-label="${esc(t.name)}: ${st.done} of ${st.total} lessons"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" class="t"/><circle cx="36" cy="36" r="${R}" class="b" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}" transform="rotate(-90 36 36)"/></svg><span class="gs-ic">${t.icon}</span><span class="gs-n">${esc(t.name)}<small>${st.done}/${st.total}</small></span></button>`; }).join('')}</div>`;
}
function casesFor(kid) {
  const b = BAND_IX[bandOf(kid)], liveOk = GSET().living;
  return Cases.filter(cs => (BAND_IX[cs.band] ?? 1) <= b && (liveOk || !cs.living) && !(GSET().off || {})[cs.tree]);
}

function viewTree(kid, tree) {
  const band = bandOf(kid), pack = packFor(tree.id, band), st = treeStats(kid, tree.id), g = prog(kid);
  const nx = nextIn(kid, tree.id);
  say(nx ? `Next up in ${tree.name}: ${stop(local(nx.title))}` : st.total ? `You’ve done every ${tree.name} lesson for now!` : 'Lessons for this tree are on their way.');
  // Every subject is a plant. One whose lessons haven't loaded yet shows its seed and fills in once they arrive.
  if (PlantView.ok) {
    if (!pack) loadBand(band).then(() => C.scheduleRender());
    ui.innerHTML = topbar(kid, tree.name, `${esc(tree.blurb)} · ${st.done} of ${st.total} lessons`);
    const cel = Grow.celebrate; Grow.celebrate = null;
    PlantView.show(ui, kid, tree, cel && cel.split('.')[0] === tree.id ? cel : null); return;
  }
  const units = pack ? pack.units : [];
  const node = (l, idx) => {
    const done = passed(kid, l.id), open = !done && available(kid, l), md = medal(kid, l), side = idx % 4 === 1 ? 'r' : idx % 4 === 3 ? 'l' : 'c';
    return `<button class="gw-node ${done ? 'done ' + md : open ? 'open' : 'locked'} ${l === nx ? 'next' : ''} s-${side}" data-g="${open || done ? 'lesson' : 'locked'}" data-id="${l.id}" aria-label="${esc(local(l.title))}${done ? `, ${md} medal` : open ? ', ready' : ', locked'}"><span class="gn-ic">${done ? (md === 'gold' ? '🥇' : md === 'silver' ? '🥈' : '🥉') : open ? esc(l.icon) : '🔒'}</span><span class="gn-t">${esc(local(l.title))}</span></button>`;
  };
  ui.innerHTML = `${topbar(kid, tree.name, `${esc(tree.blurb)} · ${st.done} of ${st.total} lessons`)}
    <div class="gw-pad gw-path">
      ${units.map(u => {
        const has = u.lessons.length, allDone = has && u.lessons.every(l => passed(kid, l.id)), uc = (g.units || {})[u.id] || {};
        const stories = u.n === 1 ? casesFor(kid).filter(cs => cs.tree === tree.id) : [];
        return `<section class="gw-unit ${has ? '' : 'soon'}"><header><span class="gu-n">Unit ${u.n}</span><b>${esc(local(u.title))}</b><small>${esc(local(u.goal))}</small></header>
          ${has ? `<div class="gw-nodes">${u.lessons.map(node).join('')}
            <button class="gw-node boss ${uc.best >= 0.8 ? 'done gold' : allDone ? 'open' : 'locked'}" data-g="${allDone ? 'challenge' : 'locked'}" data-id="${u.id}"><span class="gn-ic">${uc.best >= 0.8 ? '👑' : allDone ? '🏆' : '🔒'}</span><span class="gn-t">Unit challenge${allDone ? ` · ${XP.challenge} XP` : ''}</span></button>
            ${stories.map(cs => `<button class="gw-node story ${(g.cases || {})[cs.id] ? 'done' : 'open'}" data-g="case" data-id="${cs.id}"><span class="gn-ic">${esc(cs.icon)}</span><span class="gn-t">Real story: ${esc(cs.name)}</span></button>`).join('')}</div>`
            : `<p class="gw-soon">${ic('sparkle')} Coming in a content update</p>`}</section>`;
      }).join('') || '<p class="gw-p">Lessons for this tree are on their way.</p>'}
    </div>`;
}

/* ---------- Running a lesson, challenge, review, Money Moment, echo, story or case study ---------- */
function startLesson(kid, l, mode = 'lesson') {
  if (overTime(kid)) { Grow.view = 'break'; return render(); }
  const steps = [{ kind: 'hook' }];
  if (l.guess) steps.push({ kind: 'guess', item: l.guess });
  l.learn.forEach(text => steps.push({ kind: 'learn', text }));
  l.tries.forEach(t => steps.push({ kind: 'try', ex: t.ex, item: t.item }));
  if (l.play) steps.push({ kind: 'play', item: l.play });
  l.checks.forEach((item, i) => steps.push({ kind: 'check', item, i }));
  steps.push({ kind: 'home' });
  Grow.run = { mode, kid: kid.id, lesson: l, tree: l.tree, steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'lesson'; Sound.go(); render();
}
function startChallenge(kid, unitId) {
  const [tree, band, un] = unitId.split('.'), u = packFor(tree, band).units.find(x => x.n === +un);
  const pool = shuffle(u.lessons.flatMap(l => l.checks.map((item, i) => ({ item, qid: `${l.id}#${i}`, skill: l.skill }))), Math.random).slice(0, 8);
  Grow.run = { mode: 'challenge', unit: u, tree, scene: TREE[tree].scene, steps: [{ kind: 'intro', text: `Unit challenge: ${stop(local(u.title))} ${pool.length} mixed questions, no hints. ${passGoal(pool.length, true)} (80% or more) to win the crown.` }, ...pool.map((p, i) => ({ kind: 'check', item: p.item, i, qid: p.qid, skill: p.skill }))], k: 0, res: [], t0: Date.now() };
  Grow.view = 'challenge'; Sound.go(); render();
}
function startReview(kid) {
  const day = dayInfo(kid), left = Math.max(1, XP.cardsPerDay - (day.cards || 0)), cards = dueCards(kid).map(c => ({ ...c, ...(cardItem(c.id) || {}) })).filter(c => c.item);
  const mix = interleave(cards).slice(0, Math.min(8, Math.max(3, left)));
  if (!mix.length) { C.toast('No reviews due right now.'); return; }
  Grow.run = { mode: 'review', scene: 'island', steps: mix.map((c, i) => ({ kind: 'check', item: c.item, i, card: c.id, skill: c.lesson.skill, title: c.lesson.title, tree: c.lesson.tree })), k: 0, res: [], t0: Date.now() };
  Grow.view = 'review'; render();
}
function interleave(cards) { const by = {}; cards.forEach(c => { (by[c.lesson.tree] || (by[c.lesson.tree] = [])).push(c); }); const out = [], qs = Object.values(by); while (qs.some(q => q.length)) qs.forEach(q => { if (q.length) out.push(q.shift()); }); return out; }
function startMoment(kid) {
  const m = momentFor(kid); if (!m) return;
  if (!(prog(kid).mom && prog(kid).mom.d === today())) save(kid, { mom: { d: today(), id: m.id } });
  Grow.run = { mode: 'moment', moment: m, scene: 'bank', steps: [{ kind: 'learn', text: m.text, title: 'Money Moment' }, { kind: 'check', item: m.item, i: 0, skill: m.tags[0] || 'money' }], k: 0, res: [], t0: Date.now() };
  Grow.view = 'moment'; render();
}
function startEcho(kid) {
  const list = (prog(kid).echo || []).slice(0, 3); if (!list.length) return;
  Grow.run = { mode: 'echo', scene: 'island', steps: list.map((e, i) => { const q = ECHO[e.type](e.data); return { kind: 'check', item: { type: 'mcq', q: q.q, opts: q.opts, any: q.any, keep: q.any }, i, echo: e.id, skill: q.skill }; }), k: 0, res: [], t0: Date.now() };
  Grow.view = 'echo'; render();
}
function startStory(kid) {
  const s = marketStory(kid); if (!s) return;
  Grow.run = { mode: 'story', scene: 'shares', steps: [{ kind: 'learn', title: 'This week in the market', text: s.lines.join('\n') }, { kind: 'check', item: s.item, i: 0, skill: 'cycles' }], k: 0, res: [], t0: Date.now() };
  Grow.view = 'story'; render();
}
function startCase(kid, id) {
  const cs = Cases.find(x => x.id === id); if (!cs) return;
  const band = bandOf(kid), meet = cs.meet[band] || cs.meet.all || Object.values(cs.meet)[0] || '';
  const steps = [{ kind: 'learn', title: `Meet ${cs.name}`, text: meet }];
  if (cs.decide && cs.opts.length) steps.push({ kind: 'decide', q: cs.decide, opts: cs.opts });
  if (cs.happened) steps.push({ kind: 'learn', title: 'What really happened', text: cs.happened });
  if (cs.skill) steps.push({ kind: 'learn', title: 'The skill to keep', text: cs.skill });
  cs.checks.forEach((item, i) => steps.push({ kind: 'check', item, i }));
  if (cs.turn) steps.push({ kind: 'learn', title: 'Your turn', text: cs.turn });
  Grow.run = { mode: 'case', cs, tree: cs.tree, scene: (TREE[cs.tree] || {}).scene || 'museum', steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'case'; render();
}

function viewRun(kid) {
  const R = Grow.run, step = R.steps[R.k], l = R.lesson, total = R.steps.length;
  const beat = step.kind === 'decide' ? 'Choose' : step.kind === 'intro' ? 'Ready' : R.mode === 'lesson' ? BEATS[BEAT_OF[step.kind]] : step.kind === 'check' ? (R.mode === 'review' ? 'Review' : 'Question') : step.title || 'Read';
  const head = `<header class="gw-run-top"><button class="gw-x" data-g="back" aria-label="Stop">${ic('x')}</button><div class="gw-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${R.k + 1}"><i style="width:${(R.k + 1) / total * 100}%"></i></div><span class="gw-beat">${esc(beat)}</span></header>`;
  const title = l ? `<p class="gw-ltitle">${esc(l.icon)} ${esc(local(l.title))}</p>` : R.mode === 'challenge' ? `<p class="gw-ltitle">🏆 ${esc(local(R.unit.title))}</p>` : R.mode === 'case' ? `<p class="gw-ltitle">${esc(R.cs.icon)} ${esc(R.cs.name)}</p>` : '';
  let body = '';
  // Scored runs tell the kid the pass mark up front and on every question, with how they're going
  const q = quizAt(R), scored = q && (R.mode === 'lesson' || R.mode === 'challenge') && !(R.mode === 'lesson' && passed(kid, l.id));
  const goalFor = n => (R.mode === 'challenge' ? `${passGoal(n, true)} to win the crown` : `${passGoal(n, true)} to pass and open the next lesson`);
  if (step.kind === 'hook') {
    const n = l.checks.length, goal = n && !passed(kid, l.id) ? `<p class="gw-goal">🎯 At the end there ${n === 1 ? 'is 1 question' : `are ${n} questions`}. ${goalFor(n)}.</p>` : '';
    body = `<div class="gw-card hook"><span class="gw-big">${esc(l.icon)}</span><h2>${esc(local(l.title))}</h2><p>${esc(local(l.hook))}</p>${goal}${speakBtn(l.hook)}<button class="g-go" data-g="next">Let’s go</button></div>`; say(l.hook);
  }
  else if (step.kind === 'intro') { body = `<div class="gw-card hook"><span class="gw-big">🏆</span><p>${esc(step.text)}</p><button class="g-go" data-g="next">Start</button></div>`; say('You’ve got this. No hints this time!'); }
  else if (step.kind === 'learn') { body = `<div class="gw-card learn">${step.title ? `<h3>${esc(step.title)}</h3>` : ''}${local(step.text).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}${speakBtn(step.text)}<button class="g-go" data-g="next">Next</button></div>`; say(R.mode === 'lesson' ? ['Here’s the idea.', 'Got it?', 'Nearly there!'][Math.min(2, R.k % 3)] : ''); if (Grow.stage) Grow.stage.react('point'); }
  else if (step.kind === 'try') { body = `<div class="gw-card try">${step.ex ? `<div class="gw-ex"><b>Worked example</b><p>${esc(local(step.ex))}</p></div><p class="gw-yt">Now you try:</p>` : ''}<div class="gw-host"></div><div class="gw-fb"></div></div>`; say('Your turn to try one.'); }
  else if (step.kind === 'decide') { body = `<div class="gw-card"><h3>Decision point</h3><p class="gw-p2">${esc(local(step.q))}</p><div class="g-cards col n${step.opts.length}">${step.opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-g="decide" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div><div class="gw-fb"></div></div>`; say('What would you do?'); }
  else if (step.kind === 'home') { body = `<div class="gw-card home"><span class="gw-big">🏠</span><h3>Take it home</h3><p>${esc(local(l.home || 'Tell a grown-up one thing you learned today.'))}</p><button class="g-go" data-g="finish">Finish lesson</button></div>`; say('Last bit! Try this at home.'); }
  else {
    const bar = scored && step.kind === 'check' ? `<div class="gw-qgoal"><b>Question ${q.i} of ${q.n}</b><span>🎯 ${passGoal(q.n, true)} · ${q.right} right so far</span></div>` : '';
    body = `${bar}<div class="gw-card"><div class="gw-host"></div><div class="gw-fb"></div></div>`;
    say(step.kind === 'guess' ? 'Have a guess! It’s fine to get it wrong.' : step.kind === 'play' ? 'Game time!' : R.mode === 'review' ? `From “${local(step.title || '')}”` : scored && step.kind === 'check' && q.i === 1 ? `Question time! ${goalFor(q.n)}.` : '');
  }
  ui.innerHTML = `${head}<div class="gw-pad gw-runpad">${title}${body}</div>`;
  if (step.kind === 'learn') holdNext(ui.querySelector('.gw-card.learn [data-g="next"]'), 'learn' + R.k, kid, `${step.title || ''} ${local(step.text)}`);
  // In a lesson's quiz the plant takes the stage, already grown by the questions answered right so far. In a unit's
  // crown quiz it looks at that unit's ring, which glows with every right answer. Other questions show it as it is.
  if (PlantView.ok && plantStep()) {
    const stage = root.querySelector('.gw-stage'), right = R.res.filter((r, i) => r && r.ok && i <= R.k && R.steps[i].kind === 'check').length;
    if (plantQuiz() && R.mode === 'challenge') PlantView.crown(stage, kid, TREE[R.tree], R.unit); else if (plantQuiz()) PlantView.quiz(stage, kid, l, right); else PlantView.look(stage, kid, plantTree(R, step));
  }
  else if (Grow.stage) { const [kind, data] = stageFor(step, R) || []; Grow.stage.show(kind, data); }
  const host = ui.querySelector('.gw-host');
  if (host) {
    const ctx = { kid, mode: step.kind, cleanup: Grow.cleanup, fx: (e, d) => Grow.stage && Grow.stage.fx(e, d) };
    renderItem(step.item, host, ctx, res => answered(kid, step, res));
    const card = host.closest('.gw-card');
    if (card && HowTo.has(step.item)) {
      card.classList.add('has-how'); card.insertAdjacentHTML('afterbegin', '<button class="gw-howbtn" data-g="how" aria-label="How to play">?</button>');
      if (!HowTo.seen(kid, step.item) && R.mode !== 'challenge') HowTo.run(card, step.item, kid);
    }
  }
}
// Where a run's questions stand at its current step: this question's number, how many there are, and how many
// were answered right before it (and including it, once it's answered).
function quizAt(R) {
  const qs = R.steps.map((s, i) => (s.kind === 'check' ? i : -1)).filter(i => i >= 0); if (!qs.length) return null;
  return { n: qs.length, i: qs.filter(i => i <= R.k).length, right: qs.filter(i => i <= R.k && R.res[i] && R.res[i].ok).length, left: qs.filter(i => i > R.k).length };
}
/* Explanations (learn cards, why an answer was wrong, what a choice led to) hold their Next button until there's
   been time to read them: about 90 words a minute at 7 to 9, 140 at 10 to 12, and 190 at 13 to 15.
   The youngest hear them read out when read-aloud is on, so for them it's the voice's pace (about 130 words a
   minute) and Next also waits for the voice to finish. The button fills up as the time passes. A hold is kept per
   step, so drawing the step again doesn't restart it. */
const WPM = { sprouts: 90, builders: 140, makers: 190 }, VOICE_WPM = 130;
function holdNext(btn, key, kid, text) {
  const R = Grow.run, words = String(text || '').split(/\s+/).filter(w => /\w/.test(w)).length; if (!btn || !R || !words) return;
  const listen = GSET().readAloud && bandOf(kid) === 'sprouts' && 'speechSynthesis' in window;
  const ms = clamp(words / (listen ? VOICE_WPM : WPM[bandOf(kid)] || 140) * 60000, 1500, 30000);
  const hs = R.holds || (R.holds = {}), fresh = !hs[key], h = hs[key] || (hs[key] = { until: Date.now() + ms, ms, heard: !listen });
  if (fresh && listen) {
    speak(String(text).replace(/\p{Extended_Pictographic}/gu, '').trim(), () => { h.heard = true; });
    setTimeout(() => { h.heard = true; }, ms + 1500); // a voice that never starts or never ends doesn't lock the step
  }
  const open = () => Date.now() >= h.until && h.heard; if (open()) return;
  btn.disabled = true; btn.classList.add('hold'); btn.setAttribute('aria-label', 'Next, once you’ve had time to read this');
  btn.style.setProperty('--from', `${clamp(1 - (h.until - Date.now()) / h.ms, 0, 1) * 100}%`); btn.style.setProperty('--hold', `${Math.max(0, h.until - Date.now())}ms`);
  const t = setInterval(() => { if (!btn.isConnected) return clearInterval(t); if (open()) { clearInterval(t); btn.disabled = false; btn.classList.replace('hold', 'held'); btn.removeAttribute('aria-label'); } }, 200);
  Grow.cleanup.push(() => clearInterval(t));
}
// Which 3D scene acts out a step: the lesson's subject for hooks and learn cards, the task itself for questions and games.
function stageFor(step, R) {
  const l = R.lesson, it = step.item;
  if (step.kind === 'hook') return ['hook', { icon: l.icon, text: `${local(l.title)} ${local(l.hook)}` }];
  if (step.kind === 'learn') return ['idea', { text: `${step.title || ''} ${local(step.text)}`, icon: l ? l.icon : R.cs ? R.cs.icon : R.mode === 'story' ? '📈' : '💡' }];
  if (step.kind === 'home') return ['home', { text: local((l && l.home) || '') }];
  if (step.kind === 'intro') return ['intro', { n: R.steps.length - 1 }];
  if (step.kind === 'decide') return ['fork', { n: step.opts.length }];
  return it ? itemStage(it) : null;
}
function itemStage(it) {
  const jarC = Object.fromEntries((C.JARS || []).map(j => [j.label, j.color]));
  switch (it.type) {
    case 'mcq': return ['mcq', { n: it.opts.length, q: local(it.q) }];
    case 'island': return ['mcq', { n: 3, q: local(it.q || '') }];
    case 'tf': return ['tf', { q: local(it.q) }];
    case 'gap': return ['gap', { q: local(it.q), opts: it.opts }];
    case 'gen': return ['gap', { q: '' }];
    case 'sort': return ['sort', { bins: it.bins.map(b => local(b)), colors: it.bins.map((b, i) => (jarC[b] ? parseInt(String(jarC[b]).replace('#', ''), 16) : null)) }];
    case 'order': case 'build': return ['order', { n: it.steps.length, build: it.type === 'build' }];
    case 'match': case 'route': return ['match', { n: it.pairs.length, left: it.pairs.map(p => local(p[0])) }];
    case 'slider': return ['slider', { min: it.min, max: it.max, unit: it.unit, start: it.min }];
    case 'price': return ['price', { products: it.products }];
    case 'scam': return ['scam', {}];
    case 'path': return ['fork', { n: it.choices.length }];
    case 'debate': return ['debate', {}];
    case 'tap': return ['tap', { items: it.items.map(x => x.e) }];
    case 'budget': return ['budget', { cats: it.cats, income: it.income }];
    case 'market': return ['market', { years: it.years }];
    case 'compound': return ['snowball', { start: it.start }];
    case 'shop': return ['shop', { item: it.item }];
    case 'timing': return ['timing', { zone: it.zone }];
    case 'diff': return ['docs', { n: it.b.length }];
    case 'chat': return ['chat', {}];
    case 'mystery': return ['mystery', { n: it.clues.length }];
    default: return ['idea', { text: local(it.q || ''), icon: '💡' }];
  }
}
function answered(kid, step, res) {
  const R = Grow.run; R.res[R.k] = { ...res, kind: step.kind, step };
  const fb = ui.querySelector('.gw-fb'); if (!fb) return;
  const guess = step.kind === 'guess', grows = PlantView.ok && plantQuiz() && R.mode === 'lesson' && !passed(kid, R.lesson.id);
  const msg = guess ? (res.ok ? 'Great guess!' : 'Good guess. Let’s find out why.') : res.ok ? (grows ? ['Right! Your plant grew.', 'Yes! Up it grows.', 'Nice one. Look at it grow!'] : ['Nice one!', 'Spot on!', 'You got it!', 'Brilliant!'])[Math.floor(Math.random() * (grows ? 3 : 4))] : 'Not quite.';
  // After a scored question, say where that leaves the pass: made it, still possible, or not this time
  const q = step.kind === 'check' && (R.mode === 'challenge' || (R.mode === 'lesson' && !passed(kid, R.lesson.id))) ? quizAt(R) : null, need = q ? passNeed(q.n) : 0;
  const where = !q ? '' : res.ok && q.right === need ? `🎉 That’s ${need} right: you’ve passed!${q.left ? ' Keep going.' : ''}`
    : q.right + q.left < need ? `You need ${need} of ${q.n} right to pass. Finish, then tap Try again.`
    : !res.ok ? `You can still pass: get ${need - q.right} more right.` : '';
  const why = !res.ok && res.right && !guess ? res.right : '';
  fb.innerHTML = `<div class="gw-fbin ${res.ok || guess ? 'good' : 'bad'}"><b>${msg}</b>${why ? `<span>${esc(why)}</span>` : ''}</div>${where ? `<p class="gw-fbgoal">${where}</p>` : ''}<button class="g-go" data-g="next">${R.k + 1 >= R.steps.length ? 'Finish' : 'Next'}</button>`;
  if (why || where) holdNext(fb.querySelector('[data-g="next"]'), 'fb' + R.k, kid, `${why ? `${msg} ${why}` : ''} ${where}`);
  if (PlantView.ok && plantStep()) PlantView.answer(res.ok || guess); else if (Grow.stage) Grow.stage.react(res.ok || guess ? 'cheer' : 'puzzled');
  say(res.ok ? msg : guess ? 'Let’s find out!' : 'That’s how we learn. Keep going!');
  if (R.mode === 'review') reviewAnswer(kid, step, res.ok);
  if (R.mode === 'echo') echoAnswer(kid, step, res.ok);
}
function next() {
  const R = Grow.run, kid = kidNow(); if (!R || !kid) return;
  if (Date.now() - Grow.sessionAt > 20 * 60000 && !Grow.breakShown) { Grow.breakShown = true; C.toast('You’ve been learning for 20 minutes. Maybe stretch your legs?'); }
  if (R.k + 1 >= R.steps.length) return finish();
  R.k++; Sound.tap(); render(); ui.scrollTop = 0;
}
function decide(i) {
  const R = Grow.run, step = R.steps[R.k], o = step.opts[i], fb = ui.querySelector('.gw-fb');
  ui.querySelectorAll('[data-g="decide"]').forEach((b, j) => { b.disabled = true; if (j === i) b.classList.add('picked'); });
  fb.innerHTML = `<div class="gw-fbin good"><b>You chose: ${esc(local(o.t))}</b>${o.out ? `<span>${esc(local(o.out))}</span>` : ''}</div><button class="g-go" data-g="next">Next</button>`;
  if (o.out) holdNext(fb.querySelector('[data-g="next"]'), 'dec' + R.k, kidNow(), local(o.out));
  Sound.pop(); if (PlantView.ok && plantStep()) PlantView.answer(true); else if (Grow.stage) { Grow.stage.react('point'); Grow.stage.fx('pick', { i }); }
}
