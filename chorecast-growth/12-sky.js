/* ---------- Prototype: the Character Growth home on the app's own sky ----------
   A home screen that looks like the kid's other screens instead of a separate app: the living sky shows through, with
   the same top bar, hero number, glass cards, chore-style tiles and tab bar, and the guide stands on its island where
   the kid's own island sits on Today. Lessons, quizzes and the plant keep their own screens, now on the sky too.
   Off unless this device has the preview on: open the app with ?growlook=sky (or ?growlook=classic to go back). */
const LOOK_KEY = 'cc:growLook';
try { const q = new URLSearchParams(location.search).get('growlook'); if (q === 'sky' || q === 'classic') localStorage.setItem(LOOK_KEY, q); } catch (e) {}
function skyLook() { try { return localStorage.getItem(LOOK_KEY) === 'sky'; } catch (e) { return false; } }
function skyOn() {
  const on = skyLook(), was = document.body.classList.contains('gw-sky');
  root.classList.toggle('sky', on); document.body.classList.toggle('gw-sky', on && Grow.open);
  if (Grow.stage && Grow.stage.setLook) Grow.stage.setLook(on);
  if (PlantView.ok) PlantView.skyTint(on);
  if (on && Grow.open && !was) C.scheduleRender(); // the app's sky starts moving again behind Character Growth
  return on;
}

// The guide's stage lives beside the lessons in the classic look, and in the hero's island slot on the sky home.
let stageEl = null;
function placeStage(slot) {
  stageEl = stageEl || (root && root.querySelector('.gw-stage')); if (!stageEl) return;
  const to = slot || root; if (stageEl.parentNode === to) return;
  to.prepend(stageEl);
}

const SKY_TABS = [['today', 'sun', 'Today'], ['grow', 'sprout', 'Grow'], ['money', 'jar', 'Money'], ['market', 'chart', 'Market'], ['proof', 'photo', 'Proof wall']];
const skyTabs = () => `<nav class="tabbar glass" aria-label="Sections">${SKY_TABS.map(([k, i, l]) => k === 'grow'
  ? `<button class="tab on" data-g="skyTop" aria-current="page">${ic(i)}<span>${l}</span></button>`
  : `<button class="tab" data-g="skyTab" data-tab="${k}">${ic(i)}<span>${l}</span></button>`).join('')}</nav>`;
// A sticker in a subject's colour, like the chore stickers
const hueSticker = (hue, icon, cls = '') => `<span class="sticker ${cls}" style="--c1:color-mix(in srgb,${hue} 62%,#fff);--c2:${hue}" aria-hidden="true">${icon}</span>`;
const QUICK_HUE = { review: '#2F7BEA', echo: '#FF9F0A', moment: '#18B597', story: '#8A5CF0', crown: '#E8A317' };

function viewHubSky(kid) {
  Prize.tick(kid);
  const g = prog(kid), lvl = charLevel(kid), m = mastered(kid), sug = suggestions(kid, 3), due = dueCards(kid).length, echo = (g.echo || []).length;
  const mom = momentFor(kid), momDone = g.mom && g.mom.d === today() && g.mom.done, story = marketStory(kid), storyDone = g.story === weekKey();
  const t = titles(kid), d = dayInfo(kid), room = Math.max(0, XP.dayCap - d.xp), band = BANDS[BAND_IX[bandOf(kid)]], crowns = openCrowns(kid);
  const needN = Grow.need ? Math.ceil(Grow.need / XP.lesson) : 0, first = sug[0];
  say(Grow.need ? `You need ${Grow.need} more XP. ${needN === 1 ? 'One lesson' : `${needN} lessons`} will do it!` : sug.length ? `Ready, ${kid.name}? Pick what to learn next.` : restOfDay(kid) ? `That’s today’s new lessons, ${kid.name}! Let’s practise.` : crowns.length ? `You finished every lesson, ${kid.name}! Now win your unit crowns.` : `You’ve done everything here, ${kid.name}! New lessons arrive in updates.`);

  // The hero: like "Ari's sky" on Today, with the level as the big number and today's learning as the weather
  const cond = Grow.need ? ['🎯', `${Grow.need} XP to go`] : due ? ['🔁', due === 1 ? 'A review is waiting' : `${due} reviews waiting`] : !room ? ['🌸', 'All your XP for today'] : d.xp ? ['🌿', 'Growing nicely today'] : sug.length ? ['🌱', 'Ready to learn'] : restOfDay(kid) ? ['🌙', 'New lessons done for today'] : crowns.length ? ['🏆', 'Crowns to win'] : ['🌳', 'Every lesson done'];
  const allDone = treesOn().reduce((n, tr) => n + treeStats(kid, tr.id).done, 0), crownsWon = Object.values(g.units || {}).filter(u => u.best >= 0.8).length;
  const hero = `<section class="hero gws-hero" aria-label="${esc(kid.name)}'s learning">
      <div class="hero-loc"><span class="hero-ava" style="--hue:${kid.hue}">${kid.avatar}</span><span>${esc(kid.name)}'s learning</span></div>
      <div class="hero-num num" aria-label="Level ${lvl}"><span class="gws-lw">Level</span>${lvl}</div>
      <div class="hero-cond"><span class="wx" aria-hidden="true">${cond[0]}</span>${cond[1]}</div>
      <div class="hero-sub">${d.xp} of ${XP.dayCap} XP from lessons today${minutesToday(kid) ? ` · ${minutesToday(kid)} min of learning` : ''}</div>
      <div class="gws-slot"></div>
      <div class="gws-cap"><b>${band.name} · ages ${band.ages}</b><span>${t.length ? t.map(esc).join(' · ') : `${m} skill${m === 1 ? '' : 's'} mastered · master 4 lessons in a tree to earn its title`}</span></div>
      <div class="dayline" aria-hidden="true"><div class="dayline-fill" style="width:${Math.round(d.xp / XP.dayCap * 100)}%"></div><span class="dayline-sun" style="left:${Math.round(d.xp / XP.dayCap * 100)}%">${ic('sparkle')}</span></div>
      <div class="minis">${[['#30C25A', 'Passed', allDone], ['#FFC94D', 'Mastered', m], ['#F06595', 'Crowns', crownsWon]].map(([c, l, n]) => `<div class="mini glass"><span><i style="background:${c}"></i>${l}</span><b class="num">${n}</b></div>`).join('')}</div>
    </section>`;

  // "Learn this next", the same card as "Do this next" on Today
  const crown0 = !first && crowns[0];
  const next = first ? `<button class="next-card glass" data-g="lesson" data-id="${first.id}">${hueSticker(TREE[first.tree].hue, esc(first.icon), 'sm next-ic')}<span class="next-txt"><small>Learn this next</small><b>${esc(local(first.title))}</b><em>${esc(TREE[first.tree].name)} · Unit ${first.unit} · ${xpWords(kid, first)}</em></span><span class="next-go" aria-hidden="true">${ic('play')}</span></button>`
    : crown0 ? `<button class="next-card glass" data-g="challenge" data-id="${crown0.u.id}">${hueSticker(QUICK_HUE.crown, '🏆', 'sm next-ic')}<span class="next-txt"><small>Win this next</small><b>${esc(crown0.tree.name)} · Unit ${crown0.u.n} crown</b><em>${crownSize(crown0.u)} questions · ${passGoal(crownSize(crown0.u))} · +${XP.challenge} XP</em></span><span class="next-go" aria-hidden="true">${ic('play')}</span></button>`
    : restOfDay(kid) ? `<section class="next-card done glass"><span class="next-ic" aria-hidden="true">🌙</span><span class="next-txt"><small>Learn this next</small><b>That’s today’s ${perDay()} new lessons!</b><em>More open tomorrow. Practise until then.</em></span></section>`
    : `<section class="next-card done glass"><span class="next-ic" aria-hidden="true">🌸</span><span class="next-txt"><small>Learn this next</small><b>You finished every lesson!</b><em>New lessons arrive in an update.</em></span></section>`;

  const tile = (g2, id, hue, icon, top, name, pay, extra = '') => `<button class="tile" data-g="${g2}" ${id ? `data-id="${id}"` : ''} style="--c1:color-mix(in srgb,${hue} 62%,#fff);--c2:${hue}" ${extra}><span class="tile-top">${top}</span><span class="sticker" aria-hidden="true">${icon}</span><span class="tile-name">${name}</span><span class="tile-pay num">${pay}</span></button>`;
  const lessonTiles = sug.map(l => { const as = (g.assigned || []).find(a => a.id === l.id), lx = lessonXp(kid, l); return tile('lesson', l.id, TREE[l.tree].hue, esc(l.icon), as ? '⭐ From a grown-up' : esc(TREE[l.tree].name), esc(local(l.title)), lx ? `+${lx + (as && as.bonus ? as.bonus : 0)} XP` : 'Practice'); });
  const crownTiles = crowns.map(({ u, tree }) => tile('challenge', u.id, QUICK_HUE.crown, '🏆', `${esc(tree.name)} crown`, esc(local(u.title)), `+${XP.challenge} XP`));
  const lessonsCard = sug.length || crowns.length ? `<section class="card glass"><header class="card-h"><span class="dot" style="background:#5AC8FA"></span><span class="card-t">${sug.length ? 'Lessons for you' : 'Unit crowns'}</span><span class="card-r">${sug.length || crowns.length} ready</span></header>
      <div class="tiles">${(sug.length ? lessonTiles : crownTiles).join('')}</div>
      <p class="card-foot">${room ? `A new lesson pays up to ${XP.lesson + XP.perfect} XP: ${XP.lesson} for passing and ${XP.perfect} more if every answer is right.` : `You’ve earned all ${XP.dayCap} learning XP for today. Lessons still grow your tree, and the XP starts again tomorrow.`}</p></section>` : '';

  const quick = [
    due ? tile('review', '', QUICK_HUE.review, '🔁', 'A few minutes', `${due} review${due === 1 ? '' : 's'} due`, `+${Math.min(due, 8) * XP.card} XP`) : '',
    mathsOn() ? tile('mpractice', '', '#2FA8E8', '🧮', `${PRACTICE_N} questions`, 'Maths practice', `+${XP.practice} XP each`) : '',
    echo ? tile('echo', '', QUICK_HUE.echo, '💡', 'About your week', `${echo} question${echo === 1 ? '' : 's'}`, `+${echo * XP.echo} XP`) : '',
    mom ? tile('moment', '', QUICK_HUE.moment, momDone ? '✅' : '💬', '30 seconds', 'Today’s Money Moment', momDone ? 'Done' : `+${XP.moment} XP`) : '',
    story && !storyDone ? tile('story', '', QUICK_HUE.story, '📰', 'This week', 'In the market', `+${XP.story} XP`) : '',
  ].filter(Boolean);
  const quickCard = quick.length ? `<section class="card glass"><header class="card-h"><span class="dot" style="background:var(--gig)"></span><span class="card-t">Quick ones</span><span class="card-tag">· Bonus</span><span class="card-r">${quick.length}</span></header><div class="tiles">${quick.join('')}</div></section>` : '';

  const [pa, pb] = Prize.upcoming(kid);
  const prizeCard = pa ? (() => { const f = clamp(1 - pa.left / Math.max(pa.left, pa.of), 0, 1), closer = (g.prize || {}).closer === today();
    return `<section class="card glass"><header class="card-h"><span class="dot" style="background:var(--sun)"></span><span class="card-t">Next island prize</span>${closer ? '<span class="card-tag">· it moved closer!</span>' : ''}<span class="card-r">${pa.left} to go</span></header>
      <div class="gws-prize">${hueSticker('#FF9F43', pa.info.icon, 'sm')}<div class="gws-rt"><b>${esc(pa.info.name)}</b><span class="gws-bar" aria-hidden="true"><i style="width:${Math.round(f * 100)}%"></i></span><small>${prizeHow(kid, pa.left)}${pb ? ` · then ${esc(pb.info.name)}` : ''}</small></div></div></section>`; })() : '';

  const row = (g2, id, hue, icon, name, sub, f, foot) => `<button class="gws-row" data-g="${g2}" data-id="${id}">${hueSticker(hue, icon, 'sm')}<span class="gws-rt"><b>${name}</b><small>${sub}</small><span class="gws-bar" aria-hidden="true"><i style="width:${Math.round(f * 100)}%"></i></span><small>${foot}</small></span>${ic('next')}</button>`;
  const trees = treesOn().map(tr => { const st = treeStats(kid, tr.id); return row('tree', tr.id, tr.hue, tr.icon, esc(tr.name), esc(tr.blurb), st.total ? st.done / st.total : 0, `${st.done} of ${st.total} lessons${scoreWords(st)} · ${tr.id === 'money' ? (st.done ? 'See your tree grow' : 'Plant your seed') : st.done ? 'See your branch grow' : 'Start a new branch'}`); });
  const treeCard = `<section class="card glass"><header class="card-h"><span class="dot" style="background:var(--good)"></span><span class="card-t">${treesOn().length <= 3 ? 'Your Learning Tree' : 'Skill trees'}</span><span class="card-r">Level ${lvl}</span></header><div class="gws-rows">${trees.join('')}</div></section>`;

  // Languages get a section of their own, a tile per course a grown-up has switched on for this kid
  const ls = kidLangs(kid);
  const langs = ls.map(L => { const s = langStage(kid, L.id), st = treeStats(kid, L.id), due = LC.cards[lcKey(kid, L.id)] ? lcDue(kid, L.id).length : 0, nx = st.total ? nextIn(kid, L.id) : null; return { L, s, st, due, nx }; });
  const wordsDue = langs.reduce((a, x) => a + x.due, 0), firstNx = langs.find(x => x.nx && !x.due);
  const langCard = ls.length ? `<section class="card glass gws-langs"><header class="card-h"><span class="dot" style="background:var(--bonus)"></span><span class="card-t">Languages</span>${wordsDue ? '<span class="card-tag">· practise first</span>' : ''}<span class="card-r">${wordsDue ? `${wordsDue} word${wordsDue === 1 ? '' : 's'} to practise` : `${ls.length} course${ls.length === 1 ? '' : 's'}`}</span></header>
      <div class="tiles">${langs.map(({ L, s, st, due }) => tile('lang', L.id, L.hue, esc(L.icon), due ? `🔁 ${due} to practise` : esc(L.levels[s - 1] || `Stage ${s}`), esc(L.name), st.total ? `${st.done} of ${st.total}` : 'Start')).join('')}</div>
      <p class="card-foot">${firstNx ? `Next in ${esc(firstNx.L.name)}: ${esc(local(firstNx.nx.title))}. ` : ''}Hear it, say it, read it and write it. New words come back the next day so they stick.</p></section>`
    : (() => {
      // No language yet: the kid picks one. A tap says hello in it; Start keeps it.
      const can = langPickable(kid), t = Grow.langTry && can.find(L => L.id === Grow.langTry); if (!can.length) return '';
      return `<section class="card glass gws-langs"><header class="card-h"><span class="dot" style="background:var(--bonus)"></span><span class="card-t">Pick a language</span><span class="card-r">${can.length} to choose from</span></header>
        <div class="tiles">${can.map(L => tile('ltry', L.id, L.hue, esc(L.icon), `<span lang="${L.id}">${esc((LANG_HI[L.id] || [''])[0])}</span>`, esc(L.name), t === L ? '🔊 Again' : 'Hear it', `aria-pressed="${t === L}"`)).join('')}</div>
        ${t ? `<div class="gws-pickgo"><button class="btn-big" data-g="lstart" data-id="${t.id}">Start ${esc(t.name)}</button></div>` : ''}
        <p class="card-foot">Learn to speak, read and write a new language. Tap one to hear it. You can swap later.</p></section>`;
    })();

  const cs = casesFor(kid).slice(0, 12), csDone = cs.filter(x => (g.cases || {})[x.id]).length;
  const caseCard = cs.length ? `<section class="card glass"><header class="card-h"><span class="dot" style="background:var(--team)"></span><span class="card-t">Real stories</span><span class="card-r">${csDone}/${cs.length} read</span></header>
      <div class="lessons">${cs.map(x => `<button class="lsn ${(g.cases || {})[x.id] ? 'done' : ''}" data-g="case" data-id="${x.id}"><span class="lsn-ic" aria-hidden="true">${esc(x.icon)}</span><span class="lsn-t">${esc(x.name)}</span><small class="gws-lsub">${esc((TREE[x.tree] || {}).name || '')} · +${XP.caseStudy} XP</small></button>`).join('')}</div>
      <p class="card-foot">True stories about real people and money. Each one ends with a question to think about.</p></section>` : '';

  ui.innerHTML = `<div class="wrap kid gws" style="--hue:${kid.hue}">
    <header class="topbar"><button class="pill glass" data-g="skyFamily">${ic('back')}<span>Family</span></button>
      <div class="topbar-r">${C.kidsList().length > 1 ? `<button class="pill glass" data-g="crewPick">${ic('crew')}<span>Crew quiz</span></button>` : ''}<button class="icon-btn glass" data-g="skyMute" aria-label="${Sound.muted ? 'Turn sound on' : 'Turn sound off'}">${ic(Sound.muted ? 'soundOff' : 'soundOn')}</button></div></header>
    <div class="split">${next}${hero}<div class="col">${prizeCard}${lessonsCard}${langCard}${quickCard}${treeCard}${caseCard}</div></div>
  </div>${skyTabs()}`;
  placeStage(ui.querySelector('.gws-slot'));
}

const SKY_CLICK = {
  skyTop: () => { ui.scrollTo({ top: 0, behavior: C.reduced ? 'auto' : 'smooth' }); },
  skyTab: (kid, id, a) => { close(); UI.tab = a.dataset.tab; Sound.tap(); scrollTo(0, 0); C.render(); },
  skyFamily: () => { close(); C.ACT.home(); },
  skyMute: () => { Sound.toggle(); render(); },
};

const SKY_CSS = `
body.gw-open.gw-sky #app,body.gw-open.gw-sky #g3{visibility:hidden}
.gw.sky{background:none}
.gw.sky .gw-top{background:var(--glass);-webkit-backdrop-filter:blur(30px) saturate(170%);backdrop-filter:blur(30px) saturate(170%);border-bottom:1px solid var(--glass-line)}
.gw.sky[data-view=tree] .gw-top{background:none;-webkit-backdrop-filter:none;backdrop-filter:none;border-bottom:0}
.gw.sky .pl{background:#3E92EB}
.gw.sky[data-view=hub]{display:block}
.gw.sky[data-view=hub] .gw-ui{position:absolute;inset:0;padding-bottom:0}
.gws .topbar{padding-top:env(safe-area-inset-top,0px)}
.gws-lw{font-size:.16em;font-weight:800;letter-spacing:.1em;text-transform:uppercase;vertical-align:2.9em;margin-right:.3em;color:var(--on-sky-2)}
.gws-slot{position:relative;height:clamp(230px,37vh,320px);margin:8px -8px 0}
.gws-slot .gw-stage{position:absolute;inset:0;overflow:visible}
.gws-slot .gw-say{top:0;font-size:calc(14px*var(--ts));padding:8px 14px}
.gws-cap{display:flex;flex-direction:column;gap:2px;margin:2px 4px 0}
.gws-cap b{font:900 calc(13px*var(--ts)) var(--f-round);letter-spacing:.08em;text-transform:uppercase}
.gws-cap span{font:700 calc(13px*var(--ts))/1.3 var(--f-round);color:var(--on-sky-2)}
.gws .dayline-sun .ic{width:18px;height:18px}
.gws .tile-top{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gws .tile{min-height:178px}
.gws-prize{display:flex;align-items:center;gap:14px}
.gws-rows{display:grid;gap:10px}
.gws-row{display:flex;align-items:center;gap:14px;width:100%;padding:12px 14px 12px 12px;border-radius:22px;background:var(--glass-2);text-align:left;transition:transform .15s,background .2s}
.gws-row:active{transform:scale(.98)}
.gws-row>.ic{flex:none;opacity:.7}
.gws-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.gws-rt b{font:800 calc(17px*var(--ts))/1.2 var(--f-round)}
.gws-rt small{font:700 calc(13px*var(--ts))/1.3 var(--f-round);color:var(--on-sky-2)}
.gws-bar{display:block;height:8px;border-radius:5px;background:rgba(255,255,255,.22);overflow:hidden;margin:5px 0 2px}
.gws-bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#FFE7A6,#FFC94D)}
.gws-lsub{font:700 calc(12px*var(--ts)) var(--f-round);color:var(--on-sky-2);margin-top:auto}
.gws .tile[aria-pressed=true]{outline:3px solid #fff;outline-offset:2px}
.gws-pickgo{margin:12px 0 4px}
.gws-pickgo .btn-big{width:100%}
@media (min-width:1000px){ .gws .hero{top:calc(env(safe-area-inset-top,0px) + 8px)} }
`;
{ const st = document.createElement('style'); st.id = 'growth-sky-css'; st.textContent = SKY_CSS; document.head.appendChild(st); }
