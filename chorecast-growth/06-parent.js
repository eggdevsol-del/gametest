
/* ---------- Grown-ups: what each kid is learning, and the settings ---------- */
function parentView() {
  const P = Grow.parent || (Grow.parent = { bonus: 20, aTree: 'money' }), kids = C.kidsList();
  const head = `<header class="phead"><h2>Character Growth</h2><p>Short lessons in money, life, work and learning skills. Kids earn XP for the island, and you can see what they’ve mastered and what they find hard.</p></header>`;
  if (!kids.length) return head + '<div class="pempty">Add a kid first.</div>';
  if (!P.kidId || !Store.kids[P.kidId]) P.kidId = kids[0].id;
  const kid = Store.kids[P.kidId], band = bandOf(kid);
  if (!Packs[`money.${band}`]) { Promise.all([loadBand(band), loadExtras()]).then(() => C.scheduleRender()); return head + '<div class="pempty">Loading lessons…</div>'; }
  const editor = Store.mode === 'server' && !!C.acct()?.me?.contentEditor;
  if (editor && !P.qLoaded && !P.qLoading) { P.qLoading = true; C.api('GET', '/api/content/queue').then(r => { P.queue = r.items || []; }).catch(() => { P.queue = []; }).finally(() => { P.qLoading = false; P.qLoaded = true; C.scheduleRender(); }); }
  const g = prog(kid), set = GSET(), week = Date.now() - 7 * 864e5, log = (g.log || []).filter(x => x.at > week);
  const wkC = log.reduce((a, x) => a + x.c, 0), wkT = log.reduce((a, x) => a + x.t, 0), wkMin = Math.round(log.reduce((a, x) => a + (x.ms || 0), 0) / 60000), wkXp = log.reduce((a, x) => a + (x.xp || 0), 0);
  const improved = Object.entries(g.skills || {}).map(([k, v]) => { const h = v.h || []; if (h.length < 4) return null; const half = Math.floor(h.length / 2), a = h.slice(0, half).reduce((s, x) => s + x, 0) / half, b = h.slice(half).reduce((s, x) => s + x, 0) / (h.length - half); return { k, d: b - a, b }; }).filter(x => x && x.d > 0).sort((x, y) => y.d - x.d).slice(0, 3);
  const wrong = Object.entries(g.wrong || {}).filter(([, v]) => v && v.n).sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at).slice(0, 5);
  const lastPass = (g.log || []).slice().reverse().map(x => lessonById(x.id)).find(l => l && passed(kid, l.id));
  const lessonOfQ = q => lessonById(String(q).split('#')[0]);
  const cell = l => { const d = (g.done || {})[l.id], md = medal(kid, l); return `<i class="pg-dot ${md ? md : d ? 'tried' : ''}" title="${esc(local(l.title))}${md ? ` · ${md}` : d ? ' · learning' : ' · not started'}"></i>`; };
  const ATree = TREE[P.aTree] || TREES[0], aPack = packFor(ATree.id, band), aLessons = aPack ? aPack.units.flatMap(u => u.lessons) : [];
  const cases = Object.entries(g.cases || {}).map(([id, d]) => ({ cs: Cases.find(c => c.id === id), d })).filter(x => x.cs);
  const sw = (act, on, label, extra = '') => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${!!on}" aria-label="${esc(label)}" data-act="${act}" ${extra}></button>`;
  return `${head}
    <div class="kseg" data-keep="gpkseg">${kids.map(k => `<button class="kseg-i ${k.id === kid.id ? 'on' : ''}" data-act="gpKid" data-id="${k.id}"><span class="ava-s" style="--hue:${k.hue}">${k.avatar}</span>${esc(k.name)}</button>`).join('')}</div>
    <div class="pg-stats">
      <div class="pg-stat hl"><b class="num">${charLevel(kid)}</b><span>Level</span></div>
      <div class="pg-stat"><b class="num">${mastered(kid)}</b><span>Skills mastered</span></div>
      <div class="pg-stat"><b class="num">${log.filter(x => x.kind === 'lesson').length}</b><span>Lessons this week</span></div>
      <div class="pg-stat"><b class="num">${wkMin}</b><span>Minutes this week</span></div>
      <div class="pg-stat"><b class="num">${wkT ? Math.round(wkC / wkT * 100) + '%' : '–'}</b><span>Accuracy this week</span></div>
      <div class="pg-stat"><b class="num">${wkXp}</b><span>XP from learning this week</span></div>
    </div>
    <h3 class="pgroup-t">Skill map<small>${BANDS[BAND_IX[band]].name}, ages ${BANDS[BAND_IX[band]].ages} · 🥉 mastered · 🥈 strong · 🥇 still remembered after 35 days</small></h3>
    <div class="group pg-map">${TREES.map(t => { const pack = packFor(t.id, band), st = treeStats(kid, t.id), off = (set.off || {})[t.id]; return `<div class="row ${off ? 'off' : ''}"><span class="pg-ti" style="--th:${t.hue}">${t.icon}</span><div class="row-main"><b>${esc(t.name)}</b><small>${st.done} of ${st.total} lessons${off ? ' · switched off' : ''}</small></div><div class="pg-units">${(pack ? pack.units : []).map(u => `<span class="pg-u ${u.lessons.length ? '' : 'soon'}" title="Unit ${u.n}: ${esc(local(u.title))}">${u.lessons.length ? u.lessons.map(cell).join('') : '<i class="pg-dot soon"></i>'}</span>`).join('')}</div></div>`; }).join('')}</div>
    <div class="pg-two">
      <section><h3 class="pgroup-t">This week</h3><div class="group">${log.length ? log.slice().reverse().slice(0, 8).map(x => { const l = lessonById(x.id); return `<div class="row"><div class="row-main"><b>${l ? `${esc(l.icon)} ${esc(local(l.title))}` : esc({ review: 'Reviews', moment: 'Money Moment', echo: 'Questions about the week', story: 'Market story', case: (Cases.find(c => c.id === x.id) || {}).name || 'Real story', challenge: 'Unit challenge' }[x.kind] || x.kind)}</b><small>${x.t ? `${x.c} of ${x.t} right · ` : ''}${x.xp} XP · ${C.timeAgo(x.at)}</small></div></div>`; }).join('') : '<div class="row"><div class="row-main"><small>No learning yet this week.</small></div></div>'}
        ${improved.length ? `<div class="row"><div class="row-main"><b>Most improved</b><small>${improved.map(x => esc(x.k)).join(', ')}</small></div></div>` : ''}</div></section>
      <section><h3 class="pgroup-t">Needs a hand</h3><div class="group">${wrong.length ? wrong.map(([q, v]) => { const l = lessonOfQ(q); return `<div class="row"><div class="row-main"><b>${esc(local(v.q || 'A question'))}</b><small>${l ? `${esc(local(l.title))} · ` : ''}missed ${v.n} time${v.n === 1 ? '' : 's'}</small></div></div>`; }).join('') : '<div class="row"><div class="row-main"><small>Nothing tricky yet. Questions a kid keeps missing show up here.</small></div></div>'}</div>
        <h3 class="pgroup-t">Talk about it</h3><div class="group"><div class="row"><div class="row-main"><b>${lastPass ? `Ask ${esc(kid.name)} about “${esc(local(lastPass.title))}”` : `Ask ${esc(kid.name)} which skill tree looks most fun`}</b><small>${lastPass ? esc(local(lastPass.home || lastPass.learn[0] || '')) : 'A short chat at dinner helps a lesson stick.'}</small></div></div></div></section>
    </div>
    ${cases.length ? `<h3 class="pgroup-t">Real stories read</h3><div class="group">${cases.map(x => `<div class="row"><span class="pg-ti" style="--th:${(TREE[x.cs.tree] || {}).hue || '#2F6FE4'}">${esc(x.cs.icon)}</span><div class="row-main"><b>${esc(x.cs.name)}</b><small>${esc((TREE[x.cs.tree] || {}).name || '')} · ${esc(x.d)}</small></div></div>`).join('')}</div>` : ''}
    <h3 class="pgroup-t">Assign a lesson<small>It shows first on ${esc(kid.name)}’s list with a bonus</small></h3>
    <div class="group"><div class="row wrap"><div class="chips">${TREES.map(t => `<button class="chip-p ${t.id === ATree.id ? 'on' : ''}" data-act="gpATree" data-id="${t.id}">${t.icon} ${esc(t.name)}</button>`).join('')}</div></div>
      ${aLessons.map(l => `<div class="row"><div class="row-main"><b>${esc(l.icon)} ${esc(local(l.title))}</b><small>Unit ${l.unit}${passed(kid, l.id) ? ' · already mastered' : ''}</small></div><button class="pbtn ${P.aLesson === l.id ? 'primary' : ''}" data-act="gpALesson" data-id="${l.id}">${P.aLesson === l.id ? ic('check') + ' Picked' : 'Pick'}</button></div>`).join('')}
      <div class="row"><div class="row-main"><b>Bonus XP</b><small>On top of the usual ${XP.lesson} XP</small></div><div class="stepper"><button data-act="gpBonus" data-d="-10" aria-label="Less bonus">${ic('minus')}</button><b>${P.bonus}</b><button data-act="gpBonus" data-d="10" aria-label="More bonus">${ic('plus')}</button></div><button class="pbtn primary" data-act="gpAssign" ${P.aLesson ? '' : 'disabled'}>Assign</button></div>
      ${(g.assigned || []).map(a => { const l = lessonById(a.id); return l ? `<div class="row"><div class="row-main"><b>Assigned: ${esc(local(l.title))}</b><small>+${a.bonus} XP bonus</small></div><button class="pbtn danger" data-act="gpUnassign" data-id="${a.id}">Remove</button></div>` : ''; }).join('')}</div>
    <h3 class="pgroup-t">Settings<small>For the whole family</small></h3>
    <div class="group">
      <div class="row wrap"><div class="row-main"><b>Daily learning time</b><small>After this, new lessons wait until tomorrow</small></div><div class="chips">${[[10, '10 min'], [20, '20 min'], [30, '30 min'], [45, '45 min'], [0, 'No limit']].map(([v, l]) => `<button class="chip-p ${set.cap === v ? 'on' : ''}" data-act="gpCap" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row wrap"><div class="row-main"><b>${esc(kid.name)}’s lessons</b><small>Picked from age ${kid.age || '?'}. Move a band if they need more or less challenge.</small></div><div class="chips">${[[-1, 'One band easier'], [0, 'Automatic'], [1, 'One band harder']].map(([v, l]) => `<button class="chip-p ${(set.band[kid.id] || 0) === v ? 'on' : ''}" data-act="gpBand" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row wrap"><div class="row-main"><b>Country rules</b><small>Tax, GST, KiwiSaver or super, and prices</small></div><div class="chips">${[['nz', 'New Zealand'], ['au', 'Australia']].map(([v, l]) => `<button class="chip-p ${set.country === v ? 'on' : ''}" data-act="gpCountry" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div class="row"><div class="row-main"><b>Stories about living people</b><small>Real stories include people like Melanie Perkins and Elon Musk</small></div>${sw('gpLiving', set.living, 'Stories about living people')}</div>
      <div class="row"><div class="row-main"><b>Read aloud for Sprouts</b><small>Lessons for ages 7 to 9 are read out</small></div>${sw('gpRead', set.readAloud, 'Read aloud')}</div>
      ${TREES.map(t => `<div class="row"><span class="pg-ti" style="--th:${t.hue}">${t.icon}</span><div class="row-main"><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small></div>${sw('gpTree', !(set.off || {})[t.id], t.name, `data-id="${t.id}"`)}</div>`).join('')}
    </div>
    ${editor ? `<h3 class="pgroup-t">New content<small>Lessons, Money Moments and stories waiting for a grown-up’s OK</small></h3><div class="group">${(P.queue || []).length ? P.queue.map(it => `<div class="row"><div class="row-main"><b>${esc(it.kind.replace('_', ' '))}${it.band ? ` · ${esc(it.band)}` : ''}</b><small>${esc((it.data.text || it.data.title || '').slice(0, 140))}</small></div><button class="pbtn primary" data-act="gpApprove" data-id="${esc(it.id)}">Approve</button><button class="pbtn danger" data-act="gpWithdraw" data-id="${esc(it.id)}">Withdraw</button></div>`).join('') : `<div class="row"><div class="row-main"><small>${P.qLoading ? 'Checking…' : 'Nothing waiting. New items arrive here before kids see them.'}</small></div></div>`}</div>` : ''}`;
}
const setG = patch => C.saveSettings({ growth: patch });
Object.assign(C.ACT, {
  gpKid: a => { Grow.parent.kidId = a.dataset.id; Grow.parent.aLesson = null; C.render(); },
  gpCap: a => setG({ cap: +a.dataset.v }),
  gpBand: a => setG({ band: { [Grow.parent.kidId]: +a.dataset.v } }),
  gpCountry: a => setG({ country: a.dataset.v }),
  gpLiving: () => setG({ living: !GSET().living }),
  gpRead: () => setG({ readAloud: !GSET().readAloud }),
  gpTree: a => setG({ off: { [a.dataset.id]: !(GSET().off || {})[a.dataset.id] } }),
  gpATree: a => { Grow.parent.aTree = a.dataset.id; Grow.parent.aLesson = null; C.render(); },
  gpALesson: a => { Grow.parent.aLesson = a.dataset.id; C.render(); },
  gpBonus: a => { Grow.parent.bonus = clamp(Grow.parent.bonus + +a.dataset.d, 0, XP.assignedMax); C.render(); },
  gpAssign: () => { const P = Grow.parent, kid = Store.kids[P.kidId], g = prog(kid); if (!P.aLesson) return; save(kid, { assigned: [...(g.assigned || []).filter(x => x.id !== P.aLesson), { id: P.aLesson, bonus: P.bonus, at: Date.now() }] }); C.track('growth.assigned', { id: P.aLesson, bonus: P.bonus }, kid.id); P.aLesson = null; C.toast(`Assigned to ${kid.name}`); },
  gpUnassign: a => { const kid = Store.kids[Grow.parent.kidId]; save(kid, { assigned: (prog(kid).assigned || []).filter(x => x.id !== a.dataset.id) }); },
  gpApprove: a => contentReview(a.dataset.id, 'approved'),
  gpWithdraw: a => contentReview(a.dataset.id, 'withdrawn'),
});
async function contentReview(id, status) {
  try { await C.api('PATCH', '/api/content/' + encodeURIComponent(id), { status }); Grow.parent.queue = (Grow.parent.queue || []).filter(x => x.id !== id); feedLoaded = false; C.toast(status === 'approved' ? 'Approved. Kids see it next time they open Character Growth.' : 'Withdrawn.'); }
  catch (e) { C.toast(e.message); }
  C.render();
}
