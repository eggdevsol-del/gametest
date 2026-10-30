
/* ---------- Scoring and rewards ---------- */
function reviewAnswer(kid, step, ok) {
  const c = (prog(kid).cards || {})[step.card] || { b: 1 }, b = ok ? Math.min(5, (c.b || 1) + 1) : 1;
  save(kid, { cards: { [step.card]: { b, due: addDays(today(), BOXES[b - 1]) } } });
}
function echoAnswer() {}
function finish() {
  const R = Grow.run, kid = kidNow(); if (!R || !kid) return;
  const ms = Date.now() - R.t0, g = prog(kid), day = dayInfo(kid), l = R.lesson;
  const qidOf = (s, i) => s.qid || s.card || (l ? `${l.id}#${s.i}` : R.mode === 'case' ? `case:${R.cs.id}#${s.i}` : `${R.mode}#${i}`);
  const answers = R.steps.map((s, i) => (s.kind === 'check' && R.res[i] ? { q: qidOf(s, i), ok: !!R.res[i].ok, skill: s.skill || (l && l.skill) || '', text: s.item.q || '' } : null)).filter(Boolean);
  const right = answers.filter(a => a.ok).length, total = answers.length, acc = total ? right / total : 1;
  const playRes = R.res.find((r, i) => r && R.steps[i].kind === 'play'), playScore = playRes ? playRes.score : 1;
  const patch = { day: { ...day, ms: (day.ms || 0) + ms } }, out = { mode: R.mode, right, total, acc };
  let xp = 0;
  // Mastery history per skill and the questions a kid keeps missing (for the grown-ups' "Needs a hand")
  const skills = {}; for (const a of answers) if (a.skill) { const h = (skills[a.skill] ? skills[a.skill].h : ((g.skills || {})[a.skill] || {}).h || []).concat(a.ok ? 1 : 0).slice(-8); skills[a.skill] = { h }; }
  if (Object.keys(skills).length) patch.skills = skills;
  const wrong = {}; answers.filter(a => !a.ok).forEach(a => { wrong[a.q] = { n: (((g.wrong || {})[a.q] || {}).n || 0) + 1, q: a.text, at: Date.now() }; });
  const wkeys = Object.keys(g.wrong || {}).filter(k => (g.wrong[k] || {}).at); if (wkeys.length > 40) wkeys.sort((a, b) => g.wrong[a].at - g.wrong[b].at).slice(0, wkeys.length - 30).forEach(k => { wrong[k] = null; });
  if (Object.keys(wrong).length) patch.wrong = wrong;

  if (R.mode === 'lesson') {
    const prev = (g.done || {})[l.id], was = prev && prev.best >= 0.8, pass = acc >= 0.8, stars = pass ? (acc === 1 && playScore >= 0.8 ? 3 : 2) : 1;
    if (pass && !was) xp = XP.lesson + (acc === 1 ? XP.perfect : 0); else if (pass) xp = XP.replay;
    const as = (g.assigned || []).find(a => a.id === l.id); if (pass && as) { xp += Math.min(XP.assignedMax, as.bonus || 0); patch.assigned = (g.assigned || []).filter(a => a.id !== l.id); }
    patch.done = { [l.id]: { best: Math.max(prev ? prev.best : 0, acc), stars: Math.max(prev ? prev.stars : 0, stars), n: (prev ? prev.n : 0) + 1, at: Date.now() } };
    if (pass && !was) { patch.cards = {}; l.checks.forEach((_, i) => { patch.cards[`${l.id}#${i}`] = { b: 1, due: addDays(today(), 1) }; }); }
    const u = packFor(l.tree, l.band).units.find(x => x.n === l.unit), unitDone = pass && u.lessons.every(x => x === l || passed(kid, x.id));
    if (unitDone && !(g.mile || {})[l.tree]) patch.mile = { [l.tree]: today() };
    Object.assign(out, { pass, stars, first: pass && !was, unitDone, home: l.home, lesson: l });
  } else if (R.mode === 'challenge') {
    const prev = (g.units || {})[R.unit.id] || {}, pass = acc >= 0.8;
    if (pass && !(prev.best >= 0.8)) xp = XP.challenge;
    patch.units = { [R.unit.id]: { best: Math.max(prev.best || 0, acc), at: Date.now() } };
    Object.assign(out, { pass, stars: pass ? (acc === 1 ? 3 : 2) : 1, unit: R.unit });
  } else if (R.mode === 'review') {
    const room = Math.max(0, XP.cardsPerDay - (day.cards || 0)); xp = Math.min(right, room) * XP.card; patch.day.cards = (day.cards || 0) + total;
  } else if (R.mode === 'moment') {
    const first = !(g.mom && g.mom.d === today() && g.mom.done); if (first) xp = XP.moment;
    patch.mom = { d: today(), id: R.moment.id, done: true, ok: right === total }; patch.momH = { [R.moment.id]: today() };
  } else if (R.mode === 'echo') {
    const ids = R.steps.map(s => s.echo); xp = total * XP.echo; patch.echo = (g.echo || []).filter(e => !ids.includes(e.id));
  } else if (R.mode === 'story') {
    if (g.story !== weekKey()) xp = XP.story; patch.story = weekKey();
  } else if (R.mode === 'case') {
    if (!(g.cases || {})[R.cs.id]) xp = XP.caseStudy; patch.cases = { [R.cs.id]: today() };
  }
  const lvl0 = charLevel(kid), titles0 = titles(kid).length, given = Math.max(0, Math.min(xp, XP.dayCap - day.xp));
  const itemId = l ? l.id : R.mode === 'challenge' ? R.unit.id : R.mode === 'case' ? R.cs.id : R.mode === 'moment' ? R.moment.id : R.mode;
  patch.log = [...(g.log || []).slice(-59), { id: itemId, kind: R.mode, c: right, t: total, xp: given, at: Date.now(), ms }];
  award(kid, xp, patch);
  Object.assign(out, { xp: given, capped: given < xp, lvlUp: charLevel(kid) > lvl0 ? charLevel(kid) : 0, newTitle: titles(kid).length > titles0 ? titles(kid).slice(-1)[0] : '' });
  const [tree, band, unit] = String(itemId).split('.');
  C.track('growth.attempt', { kind: R.mode, id: itemId, tree: l ? l.tree : R.tree || null, band: l ? l.band : bandOf(kid), unit: l ? String(l.unit) : R.mode === 'challenge' ? unit : null, correct: right, total, xp: given, ms, answers: answers.map(a => ({ q: a.q, ok: a.ok, skill: a.skill })) }, kid.id);
  Grow.last = out; Grow.view = 'done'; Grow.cleanup.splice(0).forEach(f => f());
  if (out.first && l) Grow.celebrate = l.id;
  if ((out.pass && (out.stars === 3 || out.unitDone)) || out.lvlUp) { Sound.fanfare(); FX.rain(['#FFE066', '#fff', '#7CF5B5', '#9BD8FF', '#FF9FC6']); if (Grow.stage) Grow.stage.react('cheer'); }
  else if (out.pass || !('pass' in out)) { Sound.coin(); if (Grow.stage) Grow.stage.react('cheer'); }
  render();
}

function viewDone(kid) {
  const o = Grow.last, isScored = 'pass' in o;
  const starRow = isScored ? `<div class="gw-stars">${[1, 2, 3].map(n => `<span class="gw-star3 ${n <= o.stars ? 'on' : ''}" style="--d:${n * 260}ms">${C.STAR_SOCK}${C.starGold('g' + n)}</span>`).join('')}</div>` : '';
  const head = isScored ? (o.pass ? (o.stars === 3 ? 'Perfect!' : 'You passed!') : 'Nearly there!') : { review: 'Reviews done!', moment: 'Moment done!', echo: 'Thanks for thinking it through!', story: 'Market story done!', case: 'Story complete!' }[o.mode] || 'Done!';
  const sub = isScored ? (o.pass ? `${o.right} of ${o.total} right.${o.first ? ' New skill mastered!' : ''}` : `${o.right} of ${o.total} right. You need 80% to master it. Try again: practice is how brains grow.`) : o.total ? `${o.right} of ${o.total} right.` : '';
  const nx = suggestions(kid, 1)[0];
  say(isScored && !o.pass ? 'So close! Want another go?' : o.lvlUp ? `Level ${o.lvlUp}! You’re growing fast.` : 'Great work!');
  if (Grow.stage) Grow.stage.show('done', { stars: isScored ? o.stars : 3, pass: o.pass !== false });
  ui.innerHTML = `<div class="gw-pad gw-done">${starRow}<h1 class="gw-h1">${head}</h1><p class="gw-p">${sub}</p>
    <div class="gw-xpwin ${o.xp ? '' : 'none'}">${ic('sparkle')} <b class="num">+${o.xp} XP</b>${o.capped ? '<small>You reached today’s XP limit. Learning still counts!</small>' : ''}</div>
    ${o.lvlUp ? `<div class="gw-banner lvl">⬆️ Level ${o.lvlUp}!</div>` : ''}
    ${o.unitDone ? `<div class="gw-banner unit">🏅 Unit complete! A crystal appears on your island, and the unit challenge is open.</div>` : ''}
    ${o.newTitle ? `<div class="gw-banner title">🎖️ New title: ${esc(o.newTitle)}</div>` : ''}
    ${o.home && o.pass ? `<div class="gw-homecard"><b>Take it home</b><p>${esc(local(o.home))}</p><button class="g-go ghost" data-g="homeDone">I’ll try it</button></div>` : ''}
    <div class="gw-actions">${isScored && !o.pass ? `<button class="g-go" data-g="retry">Try again</button>` : nx && o.mode === 'lesson' ? `<button class="g-go" data-g="lesson" data-id="${nx.id}">Next: ${esc(local(nx.title))}</button>` : ''}
      <button class="g-go ghost" data-g="${Grow.tree ? 'toTree' : 'toHub'}">${Grow.tree ? `Back to ${esc(TREE[Grow.tree].name)}` : 'Back to my skill trees'}</button></div></div>`;
}
function viewBreak(kid) {
  say('Brain break time!');
  ui.innerHTML = `${topbar(kid, 'Character Growth')}<div class="gw-pad gw-done"><span class="gw-big">🌙</span><h1 class="gw-h1">That’s your learning time for today</h1><p class="gw-p">You learned for ${minutesToday(kid)} minutes. Your brain files it all away while you rest. Come back tomorrow for more!</p><p class="gw-p small">Money Moments and reviews still work. A grown-up can change the daily time in Grown-ups, Character Growth.</p><button class="g-go" data-g="toHub">Back to my skill trees</button></div>`;
}

/* ---------- Crew quiz: siblings answer side by side, scores add together ---------- */
function crewItems(kid) {
  const band = bandOf(kid), ls = allLessons(band), mine = ls.filter(l => passed(kid, l.id)), from = (mine.length >= 2 ? mine : ls.filter(l => l.unit === 1)).flatMap(l => l.checks).filter(i => ['mcq', 'tf', 'gap'].includes(i.type));
  return shuffle(from, Math.random).slice(0, 5);
}
function viewCrewPick(kid) {
  Grow.crewSel = Grow.crewSel || [kid.id];
  say('Who’s playing?');
  ui.innerHTML = `${topbar(kid, 'Crew quiz', 'Answer side by side. Scores add together')}<div class="gw-pad"><div class="gw-crewkids">${C.kidsList().map(k => `<button class="gw-ck ${Grow.crewSel.includes(k.id) ? 'on' : ''}" data-g="crewKid" data-id="${k.id}" style="--kh:${k.hue}"><span>${k.avatar}</span><b>${esc(k.name)}</b><small>${BANDS[BAND_IX[bandOf(k)]].name}</small></button>`).join('')}</div>
    <button class="g-go" data-g="crewGo" ${Grow.crewSel.length < 2 ? 'disabled' : ''}>Start with ${Grow.crewSel.length} player${Grow.crewSel.length === 1 ? '' : 's'}</button></div>`;
}
async function crewGo() {
  const kids = Grow.crewSel.map(id => Store.kids[id]).filter(Boolean).slice(0, 4);
  await Promise.all(kids.map(k => loadBand(bandOf(k))));
  Grow.crew = kids.map(k => ({ kid: k, items: crewItems(k), k: 0, right: 0 }));
  Grow.view = 'crew'; render();
}
function viewCrew() {
  const team = Grow.crew.reduce((a, p) => a + p.right, 0), all = Grow.crew.every(p => p.k >= p.items.length);
  say(all ? `Team score: ${team}! Nice teamwork.` : 'Go, crew!');
  ui.innerHTML = `<header class="gw-run-top"><button class="gw-x" data-g="toHub" aria-label="Stop">${ic('x')}</button><b class="gw-team">Team score <span class="num">${team}</span></b></header>
    <div class="gw-crew n${Grow.crew.length}">${Grow.crew.map((p, i) => `<section class="gw-pane" style="--kh:${p.kid.hue}"><header><span>${p.kid.avatar} ${esc(p.kid.name)}</span><b class="num">${p.right}</b></header>${p.k >= p.items.length ? `<p class="gw-p">Finished! ${p.right} of ${p.items.length}.</p>` : `<p class="g-count">${p.k + 1} of ${p.items.length}</p><div class="gw-host" data-pane="${i}"></div>`}</section>`).join('')}</div>
    ${all ? `<div class="gw-pad gw-done"><button class="g-go" data-g="crewEnd">Collect XP</button></div>` : ''}`;
  Grow.crew.forEach((p, i) => {
    const host = ui.querySelector(`[data-pane="${i}"]`); if (!host) return;
    renderItem(p.items[p.k], host, { kid: p.kid, mode: 'check', cleanup: Grow.cleanup }, res => { if (res.ok) p.right++; setTimeout(() => { p.k++; render(); }, 900); });
  });
}
function crewEnd() {
  for (const p of Grow.crew) { const day = dayInfo(p.kid); award(p.kid, p.right * XP.card, { log: [...(prog(p.kid).log || []).slice(-59), { id: 'crew', kind: 'review', c: p.right, t: p.items.length, xp: p.right * XP.card, at: Date.now(), ms: 0 }], day: { ...day } }); C.track('growth.attempt', { kind: 'review', id: 'crew-quiz', correct: p.right, total: p.items.length, xp: p.right * XP.card }, p.kid.id); }
  Sound.fanfare(); FX.rain(); Grow.crew = null; Grow.view = 'hub'; render();
}

/* ---------- Clicks inside the Character Growth screen ---------- */
function onClick(e) {
  const a = e.target.closest('[data-g]'); if (!a || a.disabled) return;
  const kid = kidNow(), g = a.dataset.g, id = a.dataset.id;
  switch (g) {
    case 'back': return back();
    case 'guide': save(kid, { guide: a.dataset.k }); if (Grow.stage) Grow.stage.setGuide(a.dataset.k); Sound.pop(); Grow.view = Grow.tree ? 'tree' : 'hub'; return render();
    case 'tree': Grow.tree = id; Grow.view = 'tree'; Sound.tap(); return render();
    case 'lesson': { const l = lessonById(id); if (l) { if (!Grow.tree) Grow.tree = l.tree; startLesson(kid, l); } return; }
    case 'locked': Sound.tap(); return C.toast('Finish the lesson before this one to open it.');
    case 'pathSel': return PathView.ok && PathView.select(+a.dataset.i);
    case 'how': case 'howAgain': { const R = Grow.run, step = R && R.steps[R.k]; if (step && step.item) HowTo.run(a.closest('.gw-card'), step.item, kid, { again: true }); return; }
    case 'howSkip': case 'howDone': return HowTo.finish(a.closest('.gw-card'));
    case 'challenge': return startChallenge(kid, id);
    case 'review': return startReview(kid);
    case 'echo': return startEcho(kid);
    case 'moment': return startMoment(kid);
    case 'story': return startStory(kid);
    case 'case': return startCase(kid, id);
    case 'crewPick': Grow.crewSel = [kid.id]; Grow.view = 'crewPick'; return render();
    case 'crewKid': { const s = Grow.crewSel; const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else if (s.length < 4) s.push(id); Sound.tap(); return render(); }
    case 'crewGo': return crewGo();
    case 'crewEnd': return crewEnd();
    case 'next': return next();
    case 'decide': return decide(+a.dataset.i);
    case 'finish': return finish();
    case 'retry': { const o = Grow.last; if (o.lesson) startLesson(kid, o.lesson); else if (o.unit) startChallenge(kid, o.unit.id); return; }
    case 'homeDone': a.disabled = true; a.textContent = 'Great! We’ll ask how it went.'; onEvent(kid, 'home', { title: local(Grow.last.lesson.title), skill: Grow.last.lesson.skill }); return;
    case 'toTree': Grow.view = 'tree'; Grow.run = null; return render();
    case 'toHub': Grow.view = 'hub'; Grow.tree = null; Grow.run = null; return render();
  }
}

/* ---------- Pieces the main app shows ---------- */
function ensureLoaded(kid) { const band = bandOf(kid); if (!Packs[`money.${band}`] && !loading[`money.${band}`]) { Promise.all([loadBand(band), loadExtras()]).then(() => C.scheduleRender()); } return !!Packs[`money.${band}`]; }
function card(kid) {
  const ready = ensureLoaded(kid), g = prog(kid), sug = ready ? suggestions(kid, 1)[0] : null, due = ready ? dueCards(kid).length : 0, echo = (g.echo || []).length, d = dayInfo(kid);
  if (ready) scanEchoesSoon(kid);
  const dots = TREES.map((t, i) => { const st = ready ? treeStats(kid, t.id) : { done: 0, total: 0 }, a = -Math.PI / 2 + i / 12 * Math.PI * 2; return `<i style="--th:${t.hue};left:${50 + Math.cos(a) * 38}%;top:${50 + Math.sin(a) * 38}%;--p:${st.total ? st.done / st.total : 0}"></i>`; }).join('');
  return `<section class="card glass cg-card"><header class="card-h"><span class="card-t">Character Growth</span><span class="card-r">Level ${charLevel(kid)}${titles(kid).length ? ` · ${esc(titles(kid)[0])}` : ''}</span></header>
    <button class="cg-main" data-act="gOpen" data-id="${kid.id}"><span class="cg-orbit" aria-hidden="true">${dots}<b class="num">${charLevel(kid)}</b></span>
      <span class="cg-txt"><small>${sug ? `Next · ${esc(TREE[sug.tree].name)}` : ready ? 'All caught up' : 'Loading your skill trees…'}</small><b>${sug ? `${esc(sug.icon)} ${esc(local(sug.title))}` : 'Explore your 12 skill trees'}</b><span class="cg-bar"><i style="width:${Math.min(100, d.xp / XP.dayCap * 100)}%"></i></span><small>${d.xp} of ${XP.dayCap} XP earned from lessons today</small></span></button>
    ${due || echo ? `<div class="cg-chips">${due ? `<button data-act="gOpen" data-id="${kid.id}">🔁 ${due} review${due === 1 ? '' : 's'} due</button>` : ''}${echo ? `<button data-act="gOpen" data-id="${kid.id}">💡 ${echo} question${echo === 1 ? '' : 's'} about your week</button>` : ''}</div>` : ''}
  </section>`;
}
// How many things are waiting for the kid: reviews due, questions about their week and lessons a grown-up set.
function waiting(kid) {
  if (!ensureLoaded(kid)) return 0; const g = prog(kid);
  return dueCards(kid).length + (g.echo || []).length + (g.assigned || []).filter(a => !passed(kid, a.id)).length;
}
let echoScanAt = {};
function scanEchoesSoon(kid) { const t = Date.now(); if (t - (echoScanAt[kid.id] || 0) < 60000) return; echoScanAt[kid.id] = t; setTimeout(() => scanEchoes(kid), 0); }
function momentCard(kid) {
  ensureLoaded(kid); const m = Moments.length ? momentFor(kid) : null, g = prog(kid), done = g.mom && g.mom.d === today() && g.mom.done;
  if (!m) return '';
  return `<button class="cg-moment ${done ? 'done' : ''}" data-act="gMoment" data-id="${kid.id}"><span>${done ? '✅' : '💬'}</span><span><small>Today’s Money Moment${done ? ' · done' : ` · +${XP.moment} XP`}</small><b>${esc(local(m.text)).slice(0, 110)}${m.text.length > 110 ? '…' : ''}</b></span></button>`;
}
function treeDoor(kid, treeId) {
  ensureLoaded(kid); const t = TREE[treeId], st = treeStats(kid, treeId);
  return `<button class="cg-door" data-act="gOpen" data-id="${kid.id}" data-tree="${treeId}" style="--th:${t.hue}"><span>${t.icon}</span><span><b>${esc(t.name)} skill tree</b><small>${st.done} of ${st.total} lessons · Rank: ${investorRank(kid)}</small></span>${ic('next')}</button>`;
}
C.ACT.gMoment = a => { open(a.dataset.id, {}).then(() => { const k = Store.kids[a.dataset.id]; if (k && momentFor(k)) startMoment(k); }); };

window.Growth = {
  card, momentCard, treeDoor, hasLesson, onEvent, open, close, waiting,
  investorRank: kid => `<span class="card-r">Rank: ${investorRank(kid)}</span>`,
  mastered: kid => mastered(kid),
  parentView: () => parentView(), resetParent: () => { if (Grow.parent) Grow.parent.msg = ''; },
  ready: () => C.scheduleRender(),
  _debug: { Packs, TREES, parsePack, parseMoments, parseCases, loadBand, loadExtras, allLessons, lessonById, get Moments() { return Moments; }, get Cases() { return Cases; } },
};
