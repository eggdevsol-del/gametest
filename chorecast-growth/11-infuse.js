/* ---------- Infused (a prototype): lessons as mini-games inside the homes game's phone ----------
   The homes game (public/chorecast/home/infused.js) asks for these through Growth.infuse. Nothing here is new lesson
   content: every question comes from a lesson's own checked lines (its learn lines, its fact bank, its maths skill's
   worked-out questions, a language lesson's words), so the review rule for lessons still holds.
   A game is a short list of items, all one of three shapes the phone can draw:
     { kind: 'learn', t }                      a line to read before the questions
     { kind: 'pick', q, opts: [{ t, ok }] }    tap the right one (fill the gap, which is true, what a word means)
     { kind: 'tf', q, a, why }                 true or false
   Right answers pay practice XP, from the same daily allowance as maths practice. */
const INF_N = 8;
const infLive = kid => TREES.filter(t => !(GSET().off || {})[t.id] && packFor(t.id, bandOf(kid)));
const infLesson = id => lessonById(id) || Object.values(Packs).flatMap(p => (p.units || []).flatMap(u => u.lessons)).find(l => l.id === id) || null;
const infPlayable = l => !!l && (l.lang ? (l.words || []).length >= 2 : (l.facts || []).filter(Boolean).length >= 2 || (l.tree === 'maths' && !!MSKILL.S[l.skill]));
const infCard = (kid, l) => ({ id: l.id, tree: l.tree, title: local(l.title), icon: l.icon || (subject(l.tree) || {}).icon || '📘', unit: l.unit, passed: passed(kid, l.id), lang: !!l.lang });
function infGame(kid, l, r) {
  const out = [], learn = (l.learn || []).slice(0, 2).map(t => ({ kind: 'learn', t: local(t) }));
  if (l.lang) {
    const ws = l.words.filter(w => w.t && w.en), pool = [...ws, ...((packFor(l.tree, l.band) || { units: [] }).units.find(u => u.n === l.unit) || { lessons: [] }).lessons.flatMap(x => x.words || []).filter(w => w.t && w.en && !ws.includes(w))];
    out.push(...ws.slice(0, 3).map(w => ({ kind: 'learn', t: `${w.pic ? w.pic + ' ' : ''}«${w.t}»${w.rd ? ` (${w.rd})` : ''} means “${w.en}”.`, say: w.t, lang: l.tree })));
    for (let i = 0; out.length < INF_N + 3 && i < 12; i++) {
      const w = ws[i % ws.length], others = shuf(pool.filter(x => x.en !== w.en), r).slice(0, 2);
      if (i % 2 === 0 || !w.pic || others.some(o => !o.pic)) out.push({ kind: 'pick', q: `What does «${w.t}» mean?`, say: w.t, lang: l.tree, opts: shuf([{ t: w.en, ok: true }, ...others.map(o => ({ t: o.en, ok: false }))], r) });
      else out.push({ kind: 'pick', q: `Which one is «${w.t}»?`, say: w.t, lang: l.tree, big: true, opts: shuf([{ t: w.pic, ok: true }, ...others.map(o => ({ t: o.pic, ok: false }))], r) });
    }
    return out;
  }
  out.push(...learn);
  if (l.tree === 'maths' && MSKILL.S[l.skill]) {
    const gens = MSKILL.S[l.skill];
    for (let i = 0, yes = Math.floor(r() * 2); out.length < INF_N + learn.length && i < 40; i++) {
      const p = gens[Math.floor(r() * gens.length)](r); if (!p || !p.wrongs.length) continue;
      if (i % 3 === 2) { const it = mq.tf(p, yes++ % 2 === 0, r); out.push({ kind: 'tf', q: it.q, a: it.a, why: it.why }); }
      else { const it = mq.mcq(p, r); out.push({ kind: 'pick', q: it.q, opts: it.opts }); }
    }
    return out;
  }
  const fs = shuf((l.facts || []).filter(Boolean), r);
  fs.forEach((f, i) => {
    if (out.length >= INF_N + learn.length) return;
    if (i % 3 === 1) { const it = fq.tf(f, r() < 0.5, r); out.push({ kind: 'tf', q: local(it.q), a: it.a, why: local(it.why) }); }
    else if (i % 3 === 2) { const it = fq.pick(f, r); out.push({ kind: 'pick', q: it.q, opts: it.opts.map(o => ({ t: local(o.t), ok: o.ok })) }); }
    else { const it = fq.gap(f, r); out.push({ kind: 'pick', q: local(it.q).replace('_', '___'), opts: it.opts.map(t => ({ t: local(t), ok: t === it.a })) }); }
  });
  return out;
}
// how well a lesson fits an unlock: its words found in the lesson's title, hook and learn lines (the title counts double)
function infScore(l, words) {
  const title = local(l.title).toLowerCase(), body = [l.hook, ...(l.learn || []), ...(l.facts || []).filter(Boolean).map(f => factPut(f, f.key))].map(local).join(' ').toLowerCase();
  // whole words (or their start: "plant" finds "plants"), and the first words given count most
  return words.reduce((s, w, i) => { const re = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), k = i < 3 ? 2 : 1; return s + (re.test(title) ? 3 * k : 0) + (re.test(body) ? k : 0); }, 0);
}
Object.assign(window.Growth, { infuse: {
  // a word read out: the language's recording if there is one, else its voice; English text by the reading voice
  say: (text, lang) => { try { if (lang && LANG[lang]) speakLang(text, lang); else speak(text); } catch (e) { /* no voice */ } },
  // the lessons this kid can play: their age band's subjects, and the languages they're learning
  async ready(kid) { await loadIndex(); await Promise.all([loadBand(bandOf(kid)), loadKidLangs(kid).catch(() => {})]); return true; },
  subjects: kid => infLive(kid).map(t => ({ id: t.id, title: t.title, icon: t.icon || '📘' })),
  langs: kid => kidLangs(kid).map(L => ({ id: L.id, title: L.name || L.title || L.id, icon: L.flag || L.icon || '🗣️' })),
  lessons(kid, tree) {
    const p = packFor(tree, isLang(tree) ? `s${langStage(kid, tree)}` : bandOf(kid)); if (!p) return [];
    return p.units.flatMap(u => u.lessons).filter(infPlayable).map(l => infCard(kid, l));
  },
  // the lessons that best fit an unlock: words to look for, in the subjects given (all, if none)
  find(kid, words, trees) {
    const ws = (words || []).map(w => w.toLowerCase()), list = [];
    for (const t of infLive(kid)) { if (trees && trees.length && !trees.includes(t.id)) continue; for (const l of (packFor(t.id, bandOf(kid)) || { units: [] }).units.flatMap(u => u.lessons)) { if (!infPlayable(l)) continue; const s = infScore(l, ws); if (s > 0) list.push([s, l]); } }
    return list.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([, l]) => infCard(kid, l));
  },
  // a language's first lessons not yet passed (the next ones to learn), or its first ones
  langNext(kid, lang) { const all = window.Growth.infuse.lessons(kid, lang); return (all.filter(x => !x.passed).slice(0, 2).length ? all.filter(x => !x.passed) : all).slice(0, 2); },
  game(kid, id) { const l = infLesson(id); if (!infPlayable(l)) return null; return { title: local(l.title), icon: l.icon || '📘', tree: l.tree, items: infGame(kid, l, mulberry((Date.now() & 0xfffff) ^ hash(kid.id + id))) }; },
  // what it pays: practice XP for each right answer, from the day's practice allowance
  finish(kid, id, right, total) {
    const day = dayInfo(kid), room = Math.max(0, XP.practicePerDay - (day.pr || 0)), n = Math.min(right, room), xp = n * XP.practice;
    const patch = { day: { ...day, pr: (day.pr || 0) + n } }; let got = 0; if (xp) got = award(kid, xp, patch); else save(kid, patch);
    C.track('growth.infused', { lesson: id, right, total, xp: got }, kid.id); return got;
  },
} });
