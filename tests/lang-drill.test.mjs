// Long language lessons: every Spanish, Mandarin and Japanese lesson, for every age band and several kids, is built
// out to its 40, 45 or 50 questions and games, and every built question has exactly one right answer. The right
// answer is the dictionary's; every wrong choice is a real word or phrase from the course that means something else and
// doesn't sound the same; tiles build exactly the word or phrase; a gap puts the phrase back together; and the same kid
// gets the same lesson all day, so a saved lesson picks up where it was.
// node tests/lang-drill.test.mjs (or npm test)
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 600) : ''); } };

/* ---------- The app's own lesson code, run here ---------- */
const TODAY = new Date().toISOString().slice(0, 10);
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const kids = {};
for (const [band, age] of [['sprouts', 8], ['builders', 11], ['makers', 14]]) for (let n = 0; n < 4; n++) kids[`${band}${n}`] = { id: `${band}${n}`, name: `Kid ${n}`, age };
const C = { Store: { kids, growth: {}, ready: false, mode: 'local' }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: () => '', $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a.slice(), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => TODAY, addDays: d => d, S: () => ({}), G3: {}, api: async () => ({}), track() {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON, Intl };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8'), ctx);
const G = ctx.window.Growth._debug, L = G.lang, P = G.pace;

const unq = s => String(s).replace(/[«»]/g, '');
const ak = s => unq(s).normalize('NFC').toLowerCase().replace(/[.,!?¿¡;:"'’“”。、，！？]/g, '').replace(/\s+/g, ' ').trim();
const pm = x => (x.kind === 'w' && x.pic ? `${x.pic} ${x.en}` : x.en);

for (const lang of ['es', 'zh', 'ja']) {
  const pack = G.parsePack(readFileSync(path.join(REPO, `public/chorecast/growth/${lang}.s1.txt`), 'utf8'), lang, 's1');
  G.Packs[`${lang}.s1`] = pack; L.Dict.build(lang);
  const lessons = pack.units.flatMap(u => u.lessons);
  // Every word and phrase in the course, from the lessons themselves: one spelling can be two words (Japanese «さん» is
  // both “three” and the polite name ending), and a word and a phrase can share one («de nada», «De nada.»)
  const uni = new Map();
  for (const l of lessons) { l.words.forEach(w => uni.set(`w|${ak(w.t)}|${w.en}`, { ...w, kind: 'w' })); l.says.forEach(x => uni.set(`s|${ak(x.t)}|${x.en}`, { t: x.t, en: x.en, rd: x.rd, pic: '💬', kind: 's' })); }
  const texts = new Map(), byMeaning = new Map(), byPic = new Map(), push = (m, k, x) => (m.get(k) || m.set(k, []).get(k)).push(x);
  for (const x of uni.values()) { push(texts, ak(x.t), x); push(byMeaning, pm(x), x); if (x.kind === 'w' && x.pic) push(byPic, x.pic, x); }
  const cands = t => texts.get(ak(t)) || [];
  const differs = (a, b) => b && ak(a.t) !== ak(b.t) && !L.sameSense(a.en, b.en) && L.soundKey(a, lang) !== L.soundKey(b, lang);
  const allDiffer = (t, list) => list.length > 0 && list.every(x => differs(t, x));
  const bad = [], counts = { sprouts: [], builders: [], makers: [] }, kinds = {};
  const miss = (l, k, s, why) => bad.push(`${l.id} ${k} ${s.gen}: ${why} ${JSON.stringify(s.item).slice(0, 200)}`);

  for (const l of lessons) for (const k of Object.keys(kids)) {
    const kid = kids[k], band = k.replace(/\d$/, ''), part = band === 'sprouts' && l.words.length > 3 ? 2 : 0;
    const steps = L.langSteps(kid, l, part), scored = steps.filter(s => P.stepWorth(s)).length, gens = st => JSON.stringify(st.filter(s => s.gen));
    if (k.endsWith('0')) counts[band].push([scored, l.id]);
    if (k.endsWith('1') && gens(L.langSteps(kid, l, part)) !== gens(steps)) bad.push(`${l.id} ${k}: not the same lesson twice in a day`);
    const mine = new Set([...l.words, ...l.says].map(x => ak(x.t)));
    for (const s of steps.filter(x => x.gen)) {
      const it = s.item, gen = s.gen.replace(/^mix\./, ''); kinds[gen] = (kinds[gen] || 0) + 1;
      const opts = it.opts || [], right = opts.filter(o => o.ok);
      if (['hear', 'mcq', 'pair', 'sound'].includes(it.type)) {
        if (right.length !== 1 || opts.length !== 3 || new Set(opts.map(o => ak(o.t))).size !== 3) { miss(l, k, s, 'not 3 different choices with one right'); continue; }
      }
      if (/^char/.test(gen)) {
        // A question about one of the lesson's new characters: its sound, which one says a sound, or what it means
        const us = [...l.words].flatMap(w => L.charUnits(w, lang)), byC = new Map(us.slice().reverse().map(u => [u.c, u])), soundOf = x => (byC.get(x) || L.charUnits({ t: x }, lang)[0] || {}).s, tl = x => String(x).normalize('NFD').replace(/\p{M}/gu, '');
        const c = (it.q.match(/^What (?:sound does|does) (\S+) (?:make|mean)\?$/) || [])[1], u = byC.get(c);
        if (gen === 'charSound' && (!u || right[0].t !== u.s || new Set(opts.map(o => tl(o.t))).size !== 3)) miss(l, k, s, 'not the character’s sound, or two choices sound the same');
        else if (gen === 'charMean' && (!u || right[0].t !== L.HAN[c][1] || opts.some((o, i) => opts.some((x, j) => j > i && L.sameSense(o.t, x.t))))) miss(l, k, s, 'not the character’s meaning, or two choices mean the same');
        else if (gen === 'charPick') { const say = (it.q.match(/^Which one says “(.+)”\?$/) || [])[1], w = byC.get(right[0].t); if (!w || w.s !== say || opts.some(o => !o.ok && (!soundOf(o.t) || tl(soundOf(o.t)) === tl(say)))) miss(l, k, s, 'the right character doesn’t say it, or another one does too'); }
        continue;
      }
      if (it.type === 'hear') {
        const tt = (it.q.match(/«([^»]+)»/) || [])[1], pics = /^Which one is/.test(it.q);
        const t = cands(tt).find(x => (pics ? x.kind === 'w' && x.pic === right[0].t : pm(x) === right[0].t));
        if (!t) { miss(l, k, s, 'the right choice isn’t its meaning'); continue; }
        if (!s.gen.startsWith('mix') && !mine.has(ak(t.t))) miss(l, k, s, 'asks about a word from another lesson before the mix');
        for (const o of opts.filter(o => !o.ok)) if (!allDiffer(t, (pics ? byPic : byMeaning).get(o.t) || [])) miss(l, k, s, `“${o.t}” could also be right`);
      } else if (it.type === 'mcq' || it.type === 'pair' || it.type === 'sound') {
        if (it.type === 'mcq' && /«/.test(it.q)) miss(l, k, s, 'shows the word in the question, where tapping it gives the meaning away');
        const t = cands(right[0].t).find(x => (it.type === 'pair' ? pm(x) === it.en : it.q.includes(`“${x.en}”`)));
        if (!t) { miss(l, k, s, 'the answer doesn’t mean what the question asks'); continue; }
        for (const o of opts.filter(o => !o.ok)) if (!allDiffer(t, cands(o.t))) miss(l, k, s, `«${unq(o.t)}» could also be right`);
      } else if (it.type === 'hearyes') {
        const t = cands(it.t).find(x => pm(x) === it.mean); if (!t) { miss(l, k, s, 'not a course word'); continue; }
        if (it.a ? it.show !== pm(t) : !allDiffer(t, byMeaning.get(it.show) || [])) miss(l, k, s, 'yes or no is wrong');
      } else if (it.type === 'tiles') {
        const t = cands(it.a)[0] || cands(it.a.replace(/ /g, ''))[0], phrase = l.says.find(x => (lang === 'es' ? ak(x.t) === ak(it.a) : ak(x.t).replace(/ /g, '') === ak(it.a).replace(/ /g, '')));
        if (!t && !phrase) miss(l, k, s, 'the tiles don’t build a lesson word or phrase');
        const parts = /\s/.test(it.a) ? it.a.split(' ') : [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(it.a)].map(x => x.segment);
        if (parts.length < 2) miss(l, k, s, 'one tile');
        if (band === 'sprouts' && parts.length > 5) miss(l, k, s, 'too many tiles for Sprouts');
        if ((it.extra || []).some(e => parts.some(p => ak(p) === ak(e)))) miss(l, k, s, 'a spare tile is the same as a needed one');
      } else if (it.type === 'lgap') {
        if (it.before + it.a + it.after !== it.full || !l.says.some(x => x.t === it.full)) miss(l, k, s, 'the gap doesn’t put the lesson’s phrase back');
        if (it.opts.filter(o => ak(o) === ak(it.a)).length !== 1 || it.opts.length !== 3) miss(l, k, s, 'not one right choice of 3');
        const w = cands(it.a).find(x => x.kind === 'w'); for (const o of it.opts.filter(o => ak(o) !== ak(it.a))) if (!w || !allDiffer(w, cands(o))) miss(l, k, s, `«${o}» could also fit`);
      } else if (it.type === 'type') { if (lang !== 'es' || band === 'sprouts' || !mine.has(ak(it.a))) miss(l, k, s, 'typing is for Spanish Builders and Makers, on this lesson’s words'); }
      else if (it.type === 'trace') { if (lang === 'es' || !/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(unq(it.q))) miss(l, k, s, 'tracing is for characters and kana'); }
      else if (it.type === 'say') { if (!mine.has(ak(it.q))) miss(l, k, s, 'says a word from another lesson'); }
      else if (it.type === 'match') {
        // Match is read, not heard, so words that sound the same (他 he, 她 she) can both be in it
        const ws = it.pairs.map(p => cands(p[0]).find(x => pm(x) === p[1]));
        if (it.pairs.length < 3 || ws.some(w => !w) || ws.some((w, i) => ws.some((x, j) => j > i && (ak(w.t) === ak(x.t) || L.sameSense(w.en, x.en))))) miss(l, k, s, 'match pairs aren’t all different');
      } else if (it.type === 'memory') {
        const ws = it.pairs.map(p => cands(p[0]).find(x => x.kind === 'w' && x.pic === p[1]));
        if (it.pairs.length < 3 || ws.some(w => !w) || new Set(it.pairs.map(p => p[1])).size !== it.pairs.length || new Set(ws.map(w => ak(w.t))).size !== ws.length) miss(l, k, s, 'memory pairs aren’t each a word and its own picture');
      } else if (it.type === 'lpop') {
        if (it.rounds.length < 3 || new Set(it.rounds.map(x => x.t)).size < 2) miss(l, k, s, 'too few rounds or words');
        for (const x of it.rounds) { const t = cands(x.t).find(c => pm(c) === x.en); if (!t || x.opts.length !== 4 || new Set(x.opts.map(ak)).size !== 4 || !x.opts.includes(x.t) || x.opts.filter(o => o !== x.t).some(o => !allDiffer(t, cands(o)))) miss(l, k, s, `round «${x.t}»: a bubble could also be right`); }
      } else if (it.type === 'letters') { if (lang !== 'es' || !mine.has(ak(it.a)) || !it.q.includes(pm(cands(it.a).find(x => x.kind === 'w') || {}))) miss(l, k, s, 'Guess the word is for Spanish words from this lesson, with their meaning'); }
      else miss(l, k, s, 'unknown kind');
    }
  }
  ok(!bad.length, `${lang}: every built question has exactly one right answer (${Object.values(kinds).reduce((a, b) => a + b, 0)} questions checked)`, bad.slice(0, 6));
  ok(['hearMean', 'hearYes', 'pickWord', 'heard', 'sound', 'match', 'build', 'write', 'sayIt', 'hearPhrase', 'buildPhrase', 'gap', 'pickPhrase', 'hearPic'].every(g => kinds[g] > 20), `${lang}: every way of asking is used`, kinds);
  for (const [band, list] of Object.entries(counts)) {
    const want = L.DRILL[band], full = list.filter(c => c[0] === want).length, low = list.filter(c => c[0] < want - 2);
    ok(list.every(c => c[0] <= want) && full / list.length >= 0.9 && low.every(c => /\.s1\.1\.\d$/.test(c[1])) && Math.min(...list.map(c => c[0])) >= 20, `${lang} ${band}: lessons have ${want} questions and games (${full} of ${list.length}; only some in a stage’s first unit, with nothing before them to mix in, have fewer)`, low);
  }
}

// Characters before building: in Mandarin and Japanese, every character on a build tile (and every spare tile) has
// been shown on a "meet the characters" card in this lesson or an earlier one, before the tiles come up
for (const lang of ['ja', 'zh']) {
  const lessons = G.Packs[`${lang}.s1`].units.flatMap(u => u.lessons), late = [], missing = new Set(), off = [];
  for (const band of ['sprouts', 'builders', 'makers']) {
    const kid = kids[`${band}2`], known = new Set();
    for (const l of lessons) {
      const parts = band === 'sprouts' && l.words.length > 3 ? [1, 2] : [0];
      for (const part of parts) for (const s of L.langSteps(kid, l, part)) {
        if (s.kind === 'chars') s.units.forEach(u => [u.c, ...u.c].forEach(c => known.add(c)));
        const it = s.item; if (!it || it.type !== 'tiles' || /\s/.test(it.a)) continue;
        const need = [...it.a, ...(it.extra || []).join('')].filter(c => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(c));
        const units = L.charUnits({ t: it.a }, lang).map(u => u.c).concat(...(it.extra || []).map(e => L.charUnits({ t: e }, lang).map(u => u.c)));
        const notYet = units.filter(c => !known.has(c));
        if (notYet.length && need.length) late.push(`${band} ${l.id} ${s.gen || 'try'}: «${it.a}» before ${notYet.join(' ')} was taught`);
      }
    }
  }
  for (const l of lessons) for (const w of l.words) {
    for (const c of w.t) if (lang === 'ja' ? /[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(c) && !L.KANA[c] && !'っッ'.includes(c) : /\p{Script=Han}/u.test(c) && !L.HAN[c]) missing.add(c);
    if (lang === 'zh') { const rs = L.hanReadings(w.t, w.rd), plain = x => x.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, ''); if (plain(rs.join('')) !== plain(w.rd || '')) off.push(`${w.t} ${w.rd} → ${rs.join(' ')}`); }
  }
  ok(!late.length, `${lang}: every character on a build tile is taught on a character card first`, late.slice(0, 6));
  ok(!missing.size, `${lang}: every character in stage 1 has a sound${lang === 'zh' ? ' and a meaning' : ''}`, [...missing]);
  if (lang === 'zh') ok(!off.length, 'zh: each word’s pinyin splits into its characters’ sounds', off.slice(0, 8));
}
const oha = L.charUnits({ t: 'おはよう', rd: 'ohayō' }, 'ja'), kon = L.charUnits({ t: 'こんにちは', rd: 'konnichiwa' }, 'ja'), gak = L.charUnits({ t: 'がっこう', rd: 'gakkō' }, 'ja'), nz = L.charUnits({ t: 'ニュージーランド', rd: 'Nyūjīrando' }, 'ja');
ok(oha.map(u => u.s).join(' ') === 'o ha yo u' && /long: ō/.test(oha[3].note) && kon[4].s === 'wa' && /wa/.test(kon[4].note) && gak[1].c === 'っ' && /stop/.test(gak[1].note) && nz[0].c === 'ニュ' && nz[0].s === 'nyu' && nz.some(u => u.c === 'ー'), 'kana cards say each sound, and how は, a long vowel, a small っ, a small ュ and ー work', [oha, kon, gak, nz]);
const yd = L.charUnits({ t: '有点儿', rd: 'yǒudiǎnr' }, 'zh'), yb = L.charUnits({ t: '一百', rd: 'yìbǎi' }, 'zh');
ok(yd.map(u => u.s).join(' ') === 'yǒu diǎn r' && yb[0].s === 'yì' && /usually yī/.test(yb[0].note) && yb[1].m === 'hundred', 'Mandarin cards give each character its sound in the word, and its meaning', [yd, yb]);
const ch = L.langSteps(kids.sprouts3, G.Packs['ja.s1'].units[0].lessons[0], 0), firstChars = ch.findIndex(s => s.kind === 'chars'), firstBuild = ch.findIndex(s => s.item && s.item.type === 'tiles'), firstQuiz = ch.findIndex(s => /^char/.test(s.gen || ''));
ok(firstChars > 0 && ch[firstChars - 1].kind === 'word' && firstQuiz > firstChars && (firstBuild < 0 || firstBuild > firstQuiz), 'a kana card comes right after its word, its questions come next, and building comes after both', { firstChars, firstQuiz, firstBuild });

// Rounds, and nothing saved goes out of step: a 45-question lesson is 4 rounds; the same lesson the same day is the same length
const es11 = G.Packs['es.s1'].units[2].lessons[1], long = L.langSteps(kids.builders0, es11, 0), rounds = P.addRounds(long);
ok(rounds.filter(s => s.kind === 'round').length === 3 && rounds.find(s => s.kind === 'round').of === 4, 'a 45-question lesson is 4 rounds, with 3 save points', rounds.filter(s => s.kind === 'round'));
ok(long.findIndex(s => s.gen) > long.findLastIndex(s => s.kind === 'word') && long.findLastIndex(s => s.gen) < long.findIndex(s => s.kind === 'check'), 'the built questions come after the new words and before the lesson’s own questions');
ok(L.langSteps(kids.makers0, es11, 0, true).every(s => !s.gen), 'a Makers test-out is still just the lesson’s own questions');
const p1 = L.langSteps(kids.sprouts0, G.Packs['es.s1'].units.flatMap(u => u.lessons).find(l => l.words.length > 3), 1);
ok(p1.every(s => !s.gen), 'a Sprouts first sitting stays short');

console.log(`\n${passN} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
