// Checks every Character Growth content pack with the app's own parser, so a typo in a lesson file is caught
// before kids see a broken question. Run after editing chorecast-growth/content: node scripts/check-growth.mjs
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const code = await readFile(path.join(root, 'public', 'chorecast', 'growth.js'), 'utf8');
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const C = { Store: { kids: {}, growth: {}, ready: false }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: c => `$${(c / 100).toFixed(2)}`, $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => '2026-10-30', addDays: d => d, S: () => ({}), G3: {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(code, ctx);
const { parsePack, parseMoments, parseCases } = ctx.window.Growth._debug;

const GENS = ['change', 'add', 'percent', 'round', 'scale', 'gst', 'time', 'compound', 'unit', 'split'];
const problems = [];
function checkItem(it, where) {
  const bad = msg => problems.push(`${where}: ${it.type}: ${msg}`);
  switch (it.type) {
    case 'mcq': if (it.opts.length < 2) bad('needs 2+ options'); if (!it.opts.some(o => o.ok)) bad('no option marked *'); break;
    case 'tf': if (!it.q) bad('no statement'); break;
    case 'gap': if (!it.a) bad('no answer'); if (!it.q.includes('_')) bad('no _ blank'); if (it.opts && !it.opts.includes(it.a)) bad('answer missing from choices'); break;
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
    default: bad('unknown item type');
  }
}

const dir = path.join(root, 'public', 'chorecast', 'growth');
let lessons = 0, items = 0;
for (const f of (await readdir(dir)).filter(f => /^\w+\.\w+\.txt$/.test(f))) {
  const [tree, band] = f.split('.'), pack = parsePack(await readFile(path.join(dir, f), 'utf8'), tree, band);
  if (pack.units.length !== 8) problems.push(`${f}: has ${pack.units.length} units, expected 8`);
  for (const u of pack.units) for (const l of u.lessons) {
    lessons++; const w = `${l.id} "${l.title}"`;
    if (!l.play) problems.push(`${w}: no play`); if (l.checks.length < 2) problems.push(`${w}: fewer than 2 checks`); if (!l.skill) problems.push(`${w}: no skill`); if (!l.hook) problems.push(`${w}: no hook`); if (!l.learn.length) problems.push(`${w}: no learn`);
    for (const it of [l.guess, l.play, ...l.tries.map(t => t.item), ...l.checks].filter(Boolean)) { items++; checkItem(it, w); }
  }
}
const moments = parseMoments(await readFile(path.join(dir, 'moments.txt'), 'utf8'));
for (const m of moments) { items++; checkItem(m.item, `moment ${m.id}`); }
const ids = moments.map(m => m.id); ids.filter((x, i) => ids.indexOf(x) !== i).forEach(x => problems.push(`moment ${x}: duplicate id`));
const cases = parseCases(await readFile(path.join(dir, 'cases.txt'), 'utf8'));
for (const c of cases) { if (c.opts.length < 2) problems.push(`case ${c.id}: needs 2+ options`); if (!c.checks.length) problems.push(`case ${c.id}: no checks`); c.checks.forEach(it => { items++; checkItem(it, `case ${c.id}`); }); }
console.log(`${lessons} lessons, ${moments.length} moments, ${cases.length} cases, ${items} questions checked`);
if (problems.length) { console.log(problems.join('\n')); process.exit(1); } else console.log('All content looks good.');
