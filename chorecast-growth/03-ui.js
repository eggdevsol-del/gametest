
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
  root.hidden = true; Grow.open = false; document.body.classList.remove('gw-open'); if (Grow.stage) Grow.stage.stop();
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
  Grow.cleanup.splice(0).forEach(f => f());
  const v = Grow.view, tree = Grow.tree && TREE[Grow.tree];
  root.style.setProperty('--gh', (tree || (Grow.run && TREE[Grow.run.lesson ? Grow.run.lesson.tree : Grow.run.tree]) || { hue: '#2F6FE4' }).hue);
  root.dataset.view = v;
  if (Grow.stage) Grow.stage.setScene(v === 'tree' && tree ? tree.scene : Grow.run && Grow.run.lesson ? Grow.run.lesson.scene : Grow.run && Grow.run.scene ? Grow.run.scene : 'island');
  if (v === 'guide') return viewGuide(kid);
  if (v === 'hub') return viewHub(kid);
  if (v === 'tree') return viewTree(kid, tree);
  if (v === 'lesson' || v === 'challenge' || v === 'review' || v === 'moment' || v === 'echo' || v === 'story' || v === 'case') return viewRun(kid);
  if (v === 'done') return viewDone(kid);
  if (v === 'break') return viewBreak(kid);
  if (v === 'crewPick') return viewCrewPick(kid);
  if (v === 'crew') return viewCrew();
}
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
  const g = prog(kid), lvl = charLevel(kid), m = mastered(kid), sug = suggestions(kid, 3), due = dueCards(kid).length, echo = (g.echo || []).length;
  const mom = momentFor(kid), momDone = g.mom && g.mom.d === today() && g.mom.done, story = marketStory(kid), storyDone = g.story === weekKey();
  const t = titles(kid), needN = Grow.need ? Math.ceil(Grow.need / XP.lesson) : 0;
  say(Grow.need ? `You need ${Grow.need} more XP. ${needN === 1 ? 'One lesson' : `${needN} lessons`} will do it!` : sug.length ? `Ready, ${kid.name}? Pick what to learn next.` : `You’ve finished every lesson here, ${kid.name}! New ones arrive in updates.`);
  const tile = (g2, ico, title, sub, extra = '') => `<button class="gw-tile" data-g="${g2}" ${extra}><span class="gt-ic">${ico}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
  ui.innerHTML = `${topbar(kid, 'Character Growth', `${esc(kid.name)} · ${BANDS[BAND_IX[bandOf(kid)]].name}, ages ${BANDS[BAND_IX[bandOf(kid)]].ages}`)}
    <div class="gw-pad">
      <section class="gw-me"><div class="gw-lvl"><b class="num">${lvl}</b><small>Level</small></div><div class="gw-me-t"><b>${m} skill${m === 1 ? '' : 's'} mastered</b><small>${t.length ? t.map(esc).join(' · ') : 'Master 4 lessons in a tree to earn its title'}</small>${minutesToday(kid) ? `<small>${minutesToday(kid)} minute${minutesToday(kid) === 1 ? '' : 's'} of learning today</small>` : ''}</div></section>
      ${Grow.need ? `<div class="gw-need">${ic('sparkle')} Each lesson you pass pays ${XP.lesson} XP, up to ${XP.dayCap} XP a day.</div>` : ''}
      ${sug.length ? `<h2 class="gw-h2">Pick your next lesson</h2><div class="gw-pick">${sug.map((l, i) => { const tr = TREE[l.tree], as = (g.assigned || []).find(a => a.id === l.id); return `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tr.hue}" data-g="lesson" data-id="${l.id}"><span class="lc-ic">${esc(l.icon)}</span><span class="lc-t"><small>${esc(tr.name)} · Unit ${l.unit}</small><b>${esc(local(l.title))}</b>${as ? `<em>From a grown-up${as.bonus ? ` · +${as.bonus} XP bonus` : ''}</em>` : ''}</span><span class="lc-go">${ic('play')}</span></button>`; }).join('')}</div>` : ''}
      <div class="gw-tiles">
        ${due ? tile('review', '🔁', `${due} review${due === 1 ? '' : 's'} due`, 'Quick questions so you remember') : ''}
        ${echo ? tile('echo', '💡', `${echo} question${echo === 1 ? '' : 's'} about your week`, `+${XP.echo} XP each`) : ''}
        ${mom ? tile('moment', momDone ? '✅' : '💬', 'Today’s Money Moment', momDone ? 'Done for today' : `30 seconds · +${XP.moment} XP`) : ''}
        ${story && !storyDone ? tile('story', '📰', 'This week in the market', `+${XP.story} XP`) : ''}
        ${C.kidsList().length > 1 ? tile('crewPick', '👯', 'Crew quiz', 'Answer side by side with a sibling') : ''}
      </div>
      <h2 class="gw-h2">Skill trees</h2>
      ${constellation(kid)}
      ${casesFor(kid).length ? `<h2 class="gw-h2">Real stories</h2><div class="gw-cases">${casesFor(kid).slice(0, 12).map(cs => `<button class="gw-case ${(prog(kid).cases || {})[cs.id] ? 'done' : ''}" data-g="case" data-id="${cs.id}" style="--th:${(TREE[cs.tree] || {}).hue || '#2F6FE4'}"><span>${esc(cs.icon)}</span><b>${esc(cs.name)}</b><small>${esc((TREE[cs.tree] || {}).name || '')}</small></button>`).join('')}</div>` : ''}
    </div>`;
}
// The 12 trees as a staggered constellation, 3 across and 4 down, each linked to its neighbours.
function constellation(kid) {
  const on = treesOn(), W = 600, H = 800;
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
  Grow.run = { mode: 'challenge', unit: u, tree, scene: TREE[tree].scene, steps: [{ kind: 'intro', text: `Unit challenge: ${stop(local(u.title))} ${pool.length} mixed questions, no hints. Get 80% to win the crown.` }, ...pool.map((p, i) => ({ kind: 'check', item: p.item, i, qid: p.qid, skill: p.skill }))], k: 0, res: [], t0: Date.now() };
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
  if (step.kind === 'hook') { body = `<div class="gw-card hook"><span class="gw-big">${esc(l.icon)}</span><h2>${esc(local(l.title))}</h2><p>${esc(local(l.hook))}</p>${speakBtn(l.hook)}<button class="g-go" data-g="next">Let’s go</button></div>`; say(l.hook); }
  else if (step.kind === 'intro') { body = `<div class="gw-card hook"><span class="gw-big">🏆</span><p>${esc(step.text)}</p><button class="g-go" data-g="next">Start</button></div>`; say('You’ve got this. No hints this time!'); }
  else if (step.kind === 'learn') { body = `<div class="gw-card learn">${step.title ? `<h3>${esc(step.title)}</h3>` : ''}${local(step.text).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}${speakBtn(step.text)}<button class="g-go" data-g="next">Next</button></div>`; say(R.mode === 'lesson' ? ['Here’s the idea.', 'Got it?', 'Nearly there!'][Math.min(2, R.k % 3)] : ''); if (Grow.stage) Grow.stage.react('point'); if (GSET().readAloud && bandOf(kid) === 'sprouts') speak(local(step.text)); }
  else if (step.kind === 'try') { body = `<div class="gw-card try">${step.ex ? `<div class="gw-ex"><b>Worked example</b><p>${esc(local(step.ex))}</p></div><p class="gw-yt">Now you try:</p>` : ''}<div class="gw-host"></div><div class="gw-fb"></div></div>`; say('Your turn to try one.'); }
  else if (step.kind === 'decide') { body = `<div class="gw-card"><h3>Decision point</h3><p class="gw-p2">${esc(local(step.q))}</p><div class="g-cards col n${step.opts.length}">${step.opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-g="decide" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div><div class="gw-fb"></div></div>`; say('What would you do?'); }
  else if (step.kind === 'home') { body = `<div class="gw-card home"><span class="gw-big">🏠</span><h3>Take it home</h3><p>${esc(local(l.home || 'Tell a grown-up one thing you learned today.'))}</p><button class="g-go" data-g="finish">Finish lesson</button></div>`; say('Last bit! Try this at home.'); }
  else { body = `<div class="gw-card"><div class="gw-host"></div><div class="gw-fb"></div></div>`; say(step.kind === 'guess' ? 'Have a guess! It’s fine to get it wrong.' : step.kind === 'play' ? 'Game time!' : R.mode === 'review' ? `From “${local(step.title || '')}”` : ''); }
  ui.innerHTML = `${head}<div class="gw-pad gw-runpad">${title}${body}</div>`;
  const host = ui.querySelector('.gw-host');
  if (host) {
    const ctx = { kid, mode: step.kind, cleanup: Grow.cleanup };
    renderItem(step.item, host, ctx, res => answered(kid, step, res));
  }
}
function answered(kid, step, res) {
  const R = Grow.run; R.res[R.k] = { ...res, kind: step.kind, step };
  const fb = ui.querySelector('.gw-fb'); if (!fb) return;
  const guess = step.kind === 'guess', msg = guess ? (res.ok ? 'Great guess!' : 'Good guess. Let’s find out why.') : res.ok ? ['Nice one!', 'Spot on!', 'You got it!', 'Brilliant!'][Math.floor(Math.random() * 4)] : 'Not quite.';
  fb.innerHTML = `<div class="gw-fbin ${res.ok || guess ? 'good' : 'bad'}"><b>${msg}</b>${!res.ok && res.right && !guess ? `<span>${esc(res.right)}</span>` : ''}</div><button class="g-go" data-g="next">${R.k + 1 >= R.steps.length ? 'Finish' : 'Next'}</button>`;
  if (Grow.stage) Grow.stage.react(res.ok || guess ? 'cheer' : 'puzzled');
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
  Sound.pop(); if (Grow.stage) Grow.stage.react('point');
}
