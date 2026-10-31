/* ---------- Island prizes: passing lessons wins things for the kid's island ----------
   Every few lessons a kid passes, in any tree, wins a prize: a makeover colour (paint or a tree colour), and every
   second prize something big, like an animal or a treehouse (the list is C.PRIZES in the app). The next prizes
   wait in locked bubbles on the plant where the leaf of the lesson that will win them is going to grow, so a kid
   can see which lesson to aim for; once won, the prize sits on that lesson's leaf.
   How many lessons a prize takes follows the kid's pace, counted as lessons passed in the last 7 days:
     0 to 2 → 3 lessons, 3 to 6 → 4, 7 to 12 → 5, 13 to 18 → 6, 19 to 24 → 7, more → 8.
   A kid who learns now and then still wins something about once a week. A kid racing ahead gets prizes a little
   further apart, so there is always one coming up and the list lasts. Each gap is set when a prize is won, so a
   prize a kid can see never moves further away; after a quiet week the next one moves closer to welcome them back. */
const Prize = (() => {
  const P = C.PRIZES;
  if (!P) return { upcoming: () => [], onPass: () => null, tick() {}, hint: () => '', stats: () => null };
  const WEEK = 7 * 864e5;
  const gapFor = n => (n <= 2 ? 3 : n <= 6 ? 4 : n <= 12 ? 5 : n <= 18 ? 6 : n <= 24 ? 7 : 8);
  const pace = h => (h || []).filter(t => t > Date.now() - WEEK).length;
  const pick = (kid, k, got) => (k % 2 ? P.big : P.small).find(id => !(got || {})[id] && !C.hasPrize(kid, id)) || (k % 2 ? 'chest:big' : 'chest:small');
  // `before` counts the lesson just passed as not passed yet, for a kid's very first prize schedule.
  function state(kid, before = 0) {
    const p = prog(kid).prize; if (p && p.id) return p;
    return { k: 0, at: mastered(kid) - before + 3, gap: 3, id: pick(kid, 0, {}), got: {}, h: [] };
  }
  // A planned prize the kid has since got some other way is swapped for the next one on the list.
  const cur = (kid, p) => (!p.id.startsWith('chest') && C.hasPrize(kid, p.id) ? pick(kid, p.k, p.got) : p.id);
  // After a lesson is passed for the first time: wins the prize if this lesson reached it, then plans the next one.
  // The lesson keeps the prize it won, for its leaf on the plant.
  function onPass(kid, lesson) {
    const p = { ...state(kid, 1) }, m = mastered(kid); p.h = [...(p.h || []), Date.now()].slice(-40); p.id = cur(kid, p);
    let won = null;
    if (m >= p.at) {
      won = C.prizeInfo(p.id) || C.prizeInfo('chest:small');
      if (won.kind === 'chest') save(kid, { xp: (prog(kid).xp || 0) + won.xp }); else C.grantPrize(kid, p.id);
      const n = pace(p.h);
      C.track('growth.prize', { id: p.id, name: won.name, kind: won.kind, big: !!won.big, n: p.k + 1, lessons: m, gap: p.gap, pace: n, next: gapFor(n), lesson: lesson || null }, kid.id);
      p.got = { ...(p.got || {}), [p.id]: today() }; p.k += 1; p.gap = gapFor(n); p.at = m + p.gap; p.id = pick(kid, p.k, p.got); p.closer = null;
    }
    save(kid, won && lesson ? { prize: p, done: { [lesson]: { prize: won.id } } } : { prize: p }); return won;
  }
  // Saves a first schedule, and after a quiet spell pulls the next prize closer (never further away).
  function tick(kid) {
    const p = prog(kid).prize;
    if (!p || !p.id) { save(kid, { prize: state(kid) }); return; }
    const m = mastered(kid), g = gapFor(pace(p.h)); if (m + g < p.at) save(kid, { prize: { at: m + g, gap: g, closer: today() } });
  }
  // The next prize, and a planned one after it (its gap is only fixed once the first is won).
  function upcoming(kid) {
    const p = state(kid), m = mastered(kid), left = Math.max(1, p.at - m), id1 = cur(kid, p), a = C.prizeInfo(id1);
    const id2 = pick(kid, p.k + 1, { ...(p.got || {}), [id1]: 1 }), b = C.prizeInfo(id2);
    return [a && { id: id1, info: a, left, of: p.gap || left }, b && { id: id2, info: b, left: left + gapFor(pace(p.h)), planned: true }].filter(Boolean);
  }
  function hint(kid, id) {
    const u = upcoming(kid).find(x => x.id === id); if (!u) return 'Win it in Character Growth';
    return u.planned ? `Win it in about ${u.left} lessons` : u.left === 1 ? 'Win it with your next lesson!' : `Win it in ${u.left} more lessons`;
  }
  // For the grown-ups' report.
  function stats(kid) { const p = state(kid), n = pace(p.h); return { won: p.k || 0, got: Object.keys(p.got || {}), week: n, gap: gapFor(n), next: upcoming(kid)[0] || null }; }
  return { upcoming, onPass, tick, hint, stats };
})();

// The strip on the Character Growth home screen: what the next lesson or two will win.
function prizeStrip(kid) {
  const [a, b] = Prize.upcoming(kid); if (!a) return '';
  const done = clamp(1 - a.left / Math.max(a.left, a.of), 0, 1), closer = (prog(kid).prize || {}).closer === today();
  return `<section class="gw-prize ${a.info.big ? 'big' : ''}"><span class="gwp-ic">${a.info.icon}</span><div class="gwp-t"><small>Next island prize${closer ? ' · it moved closer!' : ''}</small><b>${esc(a.info.name)}</b>
    <span>${a.left === 1 ? 'Pass your next lesson to win it!' : `Pass ${a.left} more lessons to win it`}${b ? ` · then ${esc(b.info.name)}` : ''}</span>
    <i class="gwp-bar" aria-hidden="true"><i style="width:${Math.round(done * 100)}%"></i></i></div></section>`;
}
// On the lesson-done screen: the prize just won, or how close the next one is.
function prizeBanner(o, kid) {
  if (!o.prize) { const a = o.first && Prize.upcoming(kid)[0]; return a ? `<div class="gw-banner">${a.info.icon} ${a.left === 1 ? 'One more lesson' : `${a.left} more lessons`} to win ${esc(a.info.name)}</div>` : ''; }
  const p = o.prize, how = p.kind === 'chest' ? `+${p.xp} bonus XP for your island shop.` : p.kind === 'look' ? `Try it on your ${p.part === 'leaf' ? 'trees' : 'house'} in the island shop’s Makeover tab.` : 'Place it on your island from the island shop, for free.';
  return `<div class="gw-banner prize">${p.icon} You won ${p.kind === 'chest' ? 'a ' : ''}${esc(p.name)}! <small>${how}</small></div>`;
}

Object.assign(window.Growth, { prizeHint: (kid, id) => Prize.hint(kid, id), prizes: kid => Prize.upcoming(kid) });

const PRIZE_CSS = `
.gw-prize{display:flex;align-items:center;gap:12px;margin-top:12px;padding:12px 14px;border-radius:20px;background:linear-gradient(135deg,rgba(255,201,60,.32),rgba(255,255,255,.14));box-shadow:inset 0 0 0 2px rgba(255,201,60,.55)}
.gw-prize.big{background:linear-gradient(135deg,rgba(255,106,61,.34),rgba(255,201,60,.24));box-shadow:inset 0 0 0 2px rgba(255,160,60,.7)}
.gwp-ic{flex:0 0 52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:30px;background:rgba(255,255,255,.9);animation:gwpBob 2.4s ease-in-out infinite}
@keyframes gwpBob{50%{transform:translateY(-3px) rotate(-4deg)}}
.gwp-t{flex:1;min-width:0;display:grid;gap:2px}
.gwp-t small{font:900 11px var(--f-round);letter-spacing:.1em;text-transform:uppercase;opacity:.85}
.gwp-t b{font:900 18px/1.2 var(--f-round)}
.gwp-t span{font:700 14px/1.35 var(--f-round);opacity:.9}
.gwp-bar{display:block;height:8px;margin-top:6px;border-radius:99px;background:rgba(255,255,255,.3);overflow:hidden}
.gwp-bar i{display:block;height:100%;border-radius:99px;background:#FFC93C}
.gw-banner.prize{background:linear-gradient(135deg,#FFC93C,#FF9F43);color:#3A2400;display:grid;gap:2px}
.gw-banner.prize small{font:800 13px/1.35 var(--f-round)}
@media (prefers-reduced-motion:reduce){ .gwp-ic{animation:none} }
`;
{ const st = document.createElement('style'); st.id = 'growth-prize-css'; st.textContent = PRIZE_CSS; document.head.appendChild(st); }
