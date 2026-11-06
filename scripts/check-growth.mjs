// Checks every Character Growth content pack with the app's own parser, so a typo in a lesson file is caught
// before kids see a broken question. Run after editing chorecast-growth/content: node scripts/check-growth.mjs
// Each band's units grow in order, with the lessons per unit perUnit gives (see CONTENT.md). Each stage of a language
// course has 10 units of 8 lessons, and its words follow the rules in langProblems below. Written sums are worked out.
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = await readFile(path.join(root, 'public', 'chorecast', 'growth.js'), 'utf8');
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const C = { Store: { kids: {}, growth: {}, ready: false }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: c => `$${(c / 100).toFixed(2)}`, $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => '2026-10-30', addDays: d => d, S: () => ({}), G3: {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(code, ctx);
const { parsePack, parseMoments, parseCases, LANGS, LANG_LIVE } = ctx.window.Growth._debug;
const LANG = Object.fromEntries(LANGS.map(L => [L.id, L]));

/* Units: subjects grow a few whole units at a time (a monthly drop), numbered 1, 2, 3... with no gaps. Every unit has
   4 lessons, except Money Sense's first 8 units, which have 6. */
const perUnit = (tree, n) => (tree === 'money' && n <= 8 ? 6 : 4);
const { maths: MATHS, GEN_KINDS } = ctx.window.Growth._debug;
const GENS = [...GEN_KINDS, ...Object.keys(MATHS.K)];
/* Any sum written out in a question is worked out again: "7 × 8 = _" must have 56 as its answer, and "12 ÷ 4 = ?" must
   have 3 as its right option. Only plain sums count (digits, + − × ÷ and brackets), so words are never guessed at. */
const N = String.raw`\(?\s*[−-]?\s*\d[\d,]*(?:\.\d+)?\s*\)?`, SUM = new RegExp(String.raw`((?:${N}\s*[+\-−×÷*/]\s*)+${N})\s*=\s*(?:_|\?)`);
function sumOf(q) {
  const m = String(q || '').match(SUM); if (!m) return null;
  const e = m[1].replace(/,(?=\d{3})/g, '').replace(/−/g, ' -').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d.+\-*/()\s]+$/.test(e)) return null;
  try { const v = Function(`return (${e})`)(); return Number.isFinite(v) ? v : null; } catch (e2) { return null; }
}
const numOf = s => { const t = String(s).replace(/−/g, '-').replace(/[$,\s]/g, ''); return /^-?\d+(\.\d+)?$/.test(t) ? +t : null; };
const problems = [];
function checkItem(it, where) {
  const bad = msg => problems.push(`${where}: ${it.type}: ${msg}`);
  switch (it.type) {
    case 'mcq': if (it.opts.length < 2) bad('needs 2+ options'); if (!it.opts.some(o => o.ok)) bad('no option marked *'); { const v = sumOf(it.q), r = it.opts.filter(o => o.ok).map(o => numOf(o.t)); if (v != null && r.length && r.every(x => x != null) && !r.some(x => Math.abs(x - v) < 1e-9)) bad(`"${it.q}" works out to ${+v.toFixed(4)}, not ${it.opts.filter(o => o.ok).map(o => o.t).join(' or ')}`); } break;
    case 'tf': if (!it.q) bad('no statement'); break;
    case 'gap': if (!it.a) bad('no answer'); if (!it.q.includes('_')) bad('no _ blank'); if (it.opts && !it.opts.includes(it.a)) bad('answer missing from choices'); { const v = sumOf(it.q), a = numOf(it.a); if (v != null && a != null && Math.abs(v - a) > 1e-9) bad(`"${it.q}" works out to ${+v.toFixed(4)}, not ${it.a}`); } break;
    case 'sort': if (it.bins.length < 2) bad('needs 2+ bins'); it.items.forEach(x => { if (!it.bins.includes(x.b)) bad(`"${x.t}" goes to unknown bin "${x.b}"`); }); break;
    case 'order': case 'build': if (it.steps.length < 3) bad('needs 3+ steps'); break;
    case 'match': case 'route': if (it.pairs.length < 3) bad('needs 3+ pairs'); it.pairs.forEach(p => { if (!p[0] || !p[1]) bad(`broken pair "${p.join('=')}"`); }); break;
    case 'slider': if (!(it.min < it.max) || it.a < it.min || it.a > it.max) bad('answer outside the range'); break;
    case 'price': if (it.products.length < 2 || it.products.some(p => !(p.cost > 0 && p.qty > 0))) bad('products need name:cost:qty:unit'); break;
    case 'scam': if (it.msgs.length < 3) bad('needs 3+ messages'); break;
    case 'path': if (it.choices.length < 2 || !it.choices.some(c => c.grade === 'good')) bad('needs 2+ choices and one good'); break;
    case 'debate': if (it.args.length !== 2 || it.args.filter(a => a.ok).length !== 1) bad('needs 2 arguments, one marked *'); break;
    case 'tap': if (!it.items.some(x => x.hit)) bad('nothing to find'); break;
    case 'budget': { const need = it.cats.reduce((a, c) => a + c.min, 0); if (!(it.income > 0) || need > it.income) bad('minimums exceed income'); if (it.surprise && it.income - need < it.surprise.c) bad('surprise can never be covered'); break; }
    case 'market': case 'compound': case 'timing': case 'island': break;
    case 'shop': if (!(it.cost > 0 && it.cost < 100)) bad('cost must be 1 to 99 cents'); break;
    case 'diff': if (it.a.join() === it.b.join()) bad('nothing changed'); break;
    case 'chat': if (!it.turns.some(t => t.me)) bad('no replies to choose'); it.turns.filter(t => t.me).forEach(t => { if (!t.me.some(o => o.ok)) bad('a reply set has no option marked *'); }); break;
    case 'mystery': if (it.clues.length < 2 || !it.opts.some(o => o.ok)) bad('needs 2+ clues and a right answer'); break;
    case 'gen': if (!GENS.includes(it.kind)) bad(`unknown generator "${it.kind}"`); break;
    case 'hear': case 'pair': if (it.opts.length < 2) bad('needs 2+ options'); if (it.opts.filter(o => o.ok).length !== 1) bad('needs exactly one option marked *'); if (!/«[^»]+»/.test(it.q) && it.type === 'hear') bad('nothing in «» to hear'); break;
    case 'say': if (!it.q) bad('nothing to say'); break;
    case 'type': case 'tiles': if (!it.a) bad('no answer'); break;
    case 'trace': if (!/«[^»]+»/.test(it.q)) bad('nothing in «» to trace'); break;
    default: bad('unknown item type');
  }
}

// GROWTH_DIR checks another folder of built packs (tests/lesson-pace.test.mjs uses it to prove a broken pack fails)
const dir = process.env.GROWTH_DIR || path.join(root, 'public', 'chorecast', 'growth');
let lessons = 0, items = 0;
const index = JSON.parse(await readFile(path.join(dir, 'index.json'), 'utf8'));
if (index.preview && !process.env.GROWTH_PREVIEW_OK) problems.push('index.json: this is a preview build with parked language courses in it. Run node scripts/build-growth.mjs (without --preview) before committing.');

/* Language courses, stage by stage in order, so "known" builds up the way a kid meets the words:
   - every lesson has 1 to 8 new words, each with a picture, and a rule only where it has a pattern to show
   - every «word» in a question is taught by the end of its lesson's teaching (its words, phrases, learn and rule lines)
   - a unit's story uses known words, with no more than 1 new word in 20
   - each word is spelled one way (macrons and accents), except the pairs a course lists on its @pairs line
   - a live language with no device voice has a recording of every line (growth/audio/<lang>.json, from the server) */
const LSHAPE = [10, 8], WORDS_MAX = 8, STORY_NEW = 0.05;
const CJK = lang => lang === 'zh' || lang === 'ja';
const quoted = o => [...JSON.stringify(o).matchAll(/«([^»]+)»/g)].map(m => m[1]);
function tokens(s, lang, known) {
  const t = String(s).normalize('NFC').toLowerCase();
  if (!CJK(lang)) return t.split(/[^\p{L}\p{M}'’-]+/u).map(w => w.replace(/^['’-]+|['’-]+$/g, '')).filter(Boolean);
  const out = []; let i = 0; const chars = [...t];
  while (i < chars.length) {
    if (!/[\p{L}\p{M}]/u.test(chars[i])) { i++; continue; }
    let n = Math.min(8, chars.length - i); while (n > 1 && !known.has(chars.slice(i, i + n).join(''))) n--;
    out.push(chars.slice(i, i + n).join('')); i += n;
  }
  return out;
}
const plain = w => w.normalize('NFD').replace(/\p{M}/gu, '');
function langProblems(lang, packs) {
  const known = new Set(), spell = {}, P = [], allow = new Set((packs[0] && packs[0].pairs || []).flatMap(x => x.split('/').map(w => w.trim().toLowerCase())));
  const learnFrom = (texts, w) => texts.forEach(s => tokens(s, lang, known).forEach(t => { known.add(t); if (!CJK(lang)) (spell[plain(t)] || (spell[plain(t)] = new Set())).add(t); }));
  for (const pack of packs) for (const u of pack.units) {
    for (const l of u.lessons) {
      const w = `${l.id} "${l.title}"`;
      if (!l.words.length || l.words.length > WORDS_MAX) P.push(`${w}: has ${l.words.length} new words (1 to ${WORDS_MAX})`);
      l.words.forEach(x => { if (!x.pic) P.push(`${w}: word "${x.t}" has no picture`); if (!x.en) P.push(`${w}: word "${x.t}" has no meaning`); if (CJK(lang) && !x.rd) P.push(`${w}: word "${x.t}" has no reading`); });
      if (CJK(lang)) l.says.forEach(x => { if (!x.rd) P.push(`${w}: phrase "${x.t}" has no reading`); });
      l.says.forEach(x => { if (!x.en) P.push(`${w}: phrase "${x.t}" has no meaning`); });
      if (l.checks.some(it => it.type === 'say')) P.push(`${w}: a say question can't be marked, so it can't be a check`);
      const by = Object.values(l.by || {});
      learnFrom([...l.words.map(x => x.t), ...l.says.map(x => x.t), ...l.chant, ...[l.hook, ...l.learn, ...l.rules, ...l.tries.map(t => t.ex), ...by.flatMap(b => [...(b.learn || []), ...(b.rule || []), b.hook || ''])].flatMap(s => quoted(s))]);
      for (const it of [l.guess, l.play, ...l.tries.map(t => t.item), ...l.checks].filter(Boolean)) {
        const texts = [...quoted(it), ...(it.type === 'type' || it.type === 'tiles' ? [it.a] : [])];
        const nw = [...new Set(texts.flatMap(s => tokens(s, lang, known)).filter(t => !known.has(t)))];
        if (nw.length && it !== l.guess) P.push(`${w}: ${it.type} uses words not taught yet: ${nw.join(', ')}`);
      }
    }
    if (u.story) {
      const st = u.story, tk = [...st.lines.map(x => x.t), ...st.checks.flatMap(quoted)].flatMap(s => tokens(s, lang, known)), nw = tk.filter(t => !known.has(t));
      if (!st.lines.length) P.push(`${st.id}: story has no lines`); if (st.checks.length < 2) P.push(`${st.id}: story has fewer than 2 checks`);
      st.lines.forEach(x => { if (!x.en) P.push(`${st.id}: line "${x.t}" has no meaning`); });
      if (tk.length && nw.length / tk.length > STORY_NEW) P.push(`${st.id}: ${nw.length} of ${tk.length} words are new (${[...new Set(nw)].join(', ')}); keep it under 1 in 20`);
      st.checks.forEach(it => { items++; checkItem(it, st.id); });
    }
  }
  for (const [k, set] of Object.entries(spell)) if (set.size > 1 && ![...set].every(x => allow.has(x))) P.push(`${lang}: "${k}" is spelled more than one way: ${[...set].join(', ')} (add a real pair to @pairs)`);
  return P;
}
const langPacks = {};

for (const f of (await readdir(dir)).filter(f => /^\w+\.\w+\.txt$/.test(f))) {
  const [tree, band] = f.split('.'), pack = parsePack(await readFile(path.join(dir, f), 'utf8'), tree, band), [UNITS, PER_UNIT] = LSHAPE;
  if (LANG[tree]) (langPacks[tree] || (langPacks[tree] = [])).push(pack);
  if (LANG[tree]) {
    if (pack.units.length !== UNITS) problems.push(`${f}: has ${pack.units.length} units, expected ${UNITS}`);
    pack.units.forEach(u => { if (u.lessons.length !== PER_UNIT) problems.push(`${f}: unit ${u.n} has ${u.lessons.length} lessons, expected ${PER_UNIT}`); });
  } else {
    if (!pack.units.length) problems.push(`${f}: has no units`);
    pack.units.forEach((u, i) => { if (u.n !== i + 1) problems.push(`${f}: unit ${u.n} is out of order (expected unit ${i + 1})`); if (u.lessons.length !== perUnit(tree, u.n)) problems.push(`${f}: unit ${u.n} has ${u.lessons.length} lessons, expected ${perUnit(tree, u.n)}`); });
  }
  for (const u of pack.units) for (const l of u.lessons) {
    lessons++; const w = `${l.id} "${l.title}"`;
    if (!l.play) problems.push(`${w}: no play`); if (l.checks.length < 2) problems.push(`${w}: fewer than 2 checks`); if (!l.skill) problems.push(`${w}: no skill`); if (!l.hook) problems.push(`${w}: no hook`); if (!l.learn.length && !l.words) problems.push(`${w}: no learn`);
    for (const it of [l.guess, l.play, ...l.tries.map(t => t.item), ...l.checks].filter(Boolean)) { items++; checkItem(it, w); }
  }
}
for (const [lang, packs] of Object.entries(langPacks)) {
  packs.sort((a, b) => +a.band.slice(1) - +b.band.slice(1));
  problems.push(...langProblems(lang, packs));
  if (!LANG[lang].voices && LANG_LIVE.includes(lang) && !index.preview) {
    const lines = JSON.parse(await readFile(path.join(dir, `${lang}.lines.json`), 'utf8')), file = path.join(dir, 'audio', `${lang}.json`);
    const have = new Set(existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : []);
    for (const [s, list] of Object.entries(lines)) { const miss = list.filter(k => !have.has(k)); if (miss.length) problems.push(`${lang} ${s}: ${miss.length} lines have no recording yet (first: "${miss[0]}")`); }
  }
}
// A live course must be built, and a built course must be live (or this is a preview build)
for (const lang of LANG_LIVE) if (!langPacks[lang]) problems.push(`${lang}: listed in LANG_LIVE but not built (is it still in content/parked?)`);
if (!index.preview) for (const lang of Object.keys(langPacks)) if (!LANG_LIVE.includes(lang)) problems.push(`${lang}: built for kids but not in LANG_LIVE (park it in content/parked, or add it to LANG_LIVE)`);
const read = async f => existsSync(path.join(dir, f)) ? readFile(path.join(dir, f), 'utf8') : '';
const moments = parseMoments(await read('moments.txt'));
for (const m of moments) { items++; checkItem(m.item, `moment ${m.id}`); }
const ids = moments.map(m => m.id); ids.filter((x, i) => ids.indexOf(x) !== i).forEach(x => problems.push(`moment ${x}: duplicate id`));
const cases = parseCases(await read('cases.txt'));
for (const c of cases) { if (c.opts.length < 2) problems.push(`case ${c.id}: needs 2+ options`); if (!c.checks.length) problems.push(`case ${c.id}: no checks`); c.checks.forEach(it => { items++; checkItem(it, `case ${c.id}`); }); }
console.log(`${lessons} lessons, ${moments.length} moments, ${cases.length} cases, ${items} questions checked`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); } else console.log('All content looks good.');
