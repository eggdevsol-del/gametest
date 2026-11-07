// Long lessons in every subject. Maths: every topic's built questions are worked out again from their sums, 300 times
// each, and no wrong choice is also right; the games' answers check out too. Facts: every fact bank parses, has 8 to
// 12 facts with real wrong answers, and turns into questions with one right answer. Every live lesson (and each
// month 2 maths topic with a generator) is built out to 40, 45 or 50 for its age band.
// node tests/lesson-drill.test.mjs (or npm test)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 700) : ''); } };

const TODAY = new Date().toISOString().slice(0, 10);
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const kids = { sprouts: { id: 's1', age: 8 }, builders: { id: 'b1', age: 11 }, makers: { id: 'm1', age: 14 } };
const C = { Store: { kids, growth: {}, ready: false, mode: 'local' }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: () => '', $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a.slice(), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => TODAY, addDays: d => d, S: () => ({}), G3: {}, api: async () => ({}), track() {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON, Intl };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8'), ctx);
const G = ctx.window.Growth._debug, D = G.drill, DRILL = G.lang.DRILL;

/* ---------- Maths: every answer worked out again ---------- */
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const val = s => +String(s).replace(/−/g, '-').replace(/,/g, '');
const fracV = s => { const [a, b] = String(s).split(/[/:]/).map(Number); return a / b; };
const toMin = s => { const [h, m] = String(s).split(':').map(Number); return ((h % 12) * 60 + m) % 720; };
const isPrime = n => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every(d => n % d);
// An expression in n (or a and b) as JavaScript: 2n + 3 → 2*n+3, n² → n**2, 2(n + 1) → 2*(n+1)
const jsExpr = e => String(e).replace(/−/g, '-').replace(/÷/g, '/').replace(/²/g, '**2').replace(/(\d)([nab(])/g, '$1*$2').replace(/([nab)])([nab(])/g, '$1*$2').replace(/\s/g, '');
const evalAt = (e, n, a, b) => Function('n', 'a', 'b', `return (${jsExpr(e)})`)(n, a, b);
const sameAs = (p, x) => {
  if (p.unit === 'expr') return [[1.7, 2.3, -0.6], [3.1, -1.4, 2.2], [-2.5, 0.8, 4.1]].every(([n, a, b]) => Math.abs(evalAt(x, n, a, b) - Function('n', 'a', 'b', `return (${jsExpr(p.calc)})`)(n, a, b)) < 1e-9);
  const v = Function(`return (${p.calc})`)();
  switch (p.unit) {
    case 'num': return Math.abs(val(x) - v) < 1e-9;
    case 'time': return toMin(x) === ((v % 720) + 720) % 720;
    case 'frac': case 'ratio': return Math.abs(fracV(x) - v) < 1e-9;
    case 'cmp': return x === v;
    case 'yn': return x === (isPrime(v) ? 'yes' : 'no');
    case 'expr': return [[1.7, 2.3, -0.6], [3.1, -1.4, 2.2], [-2.5, 0.8, 4.1]].every(([n, a, b]) => Math.abs(evalAt(x, n, a, b) - Function('n', 'a', 'b', `return (${jsExpr(p.calc)})`)(n, a, b)) < 1e-9);
    case 'text': return x === v;
    default: return false;
  }
};
const bad = {}, miss = (k, m) => (bad[k] || (bad[k] = [])).push(m);
let made = 0;
for (const [skill, gens] of Object.entries(D.MSKILL.S)) gens.forEach((g, gi) => {
  for (let i = 0; i < 300; i++) {
    const p = g(rnd); if (!p) continue; made++;
    const k = `${skill}#${gi}`;
    if ((p.ask.match(/_/g) || []).length !== 1) miss(k, `no single gap: ${p.ask}`);
    if (!sameAs(p, p.a)) miss(k, `${p.ask} → ${p.a}, works out to ${p.unit === 'expr' ? p.calc : Function(`return (${p.calc})`)()}`);
    if (!p.wrongs.length) miss(k, `no wrong answers: ${p.ask}`);
    for (const w of p.wrongs) if (sameAs(p, w)) miss(k, `${p.ask}: wrong answer ${w} is also right`);
    if (p.unit === 'ratio' && D.MSKILL.gcd(...p.a.split(':').map(Number)) !== 1) miss(k, `${p.a} isn't simplified`);
    if (p.gap && (p.unit !== 'num' || val(p.a) < 0)) miss(k, `typed gap with answer ${p.a}`);
    if (p.say(p.a) === p.say(p.wrongs[0])) miss(k, `true and false say the same thing: ${p.say(p.a)}`);
  }
});
ok(!Object.keys(bad).length, `every maths topic's built questions work out right, with no wrong choice also right (${Object.keys(D.MSKILL.S).length} topics, ${made} questions)`, Object.entries(bad).slice(0, 6).map(([k, v]) => [k, v.slice(0, 2)]));

// The games: a clock's time in words is that time, pizzas and balances can be done, pops follow their rule
const words = s => { const m = s.match(/(\d+)(?::(\d+)| o’clock)|half past (\d+)|quarter past (\d+)|quarter to (\d+)/); if (!m) return null; if (m[3]) return (+m[3] % 12) * 60 + 30; if (m[4]) return (+m[4] % 12) * 60 + 15; if (m[5]) return ((+m[5] - 1) % 12) * 60 + 45; return (+m[1] % 12) * 60 + (+m[2] || 0); };
const gbad = [];
for (let i = 0; i < 400; i++) {
  for (const kind of ['time-hour', 'time-quarter', 'elapsed-time']) { const c = D.MGAMES.clock(rnd, kind); if (words(c.q) !== c.t || c.t < 0 || c.t >= 720 || (c.step !== 5 && c.t % c.step)) gbad.push(c); }
  const lt = D.MGAMES.later(rnd), [s, add] = [toMin(lt.q.match(/It’s (\d+:\d+)/)[1]), +(lt.q.match(/(\d+) minutes/) || [0, 60])[1]]; if ((s + add) % 720 !== lt.t) gbad.push(lt);
  for (const z of [D.MGAMES.pizza(rnd), D.MGAMES.pizzaEq(rnd)]) { const [n, d] = z.q.match(/(\d+)\/(\d+)/).slice(1).map(Number); if (!(z.n > 0 && z.n < z.d) || Math.abs(z.n / z.d - n / d) > 1e-9) gbad.push(z); }
  const b = D.MGAMES.balance(rnd); if (!(b.total > b.a) || !b.q.includes(`${b.a} + ? = ${b.total}`)) gbad.push(b);
  for (const band of ['sprouts', 'builders']) { const c = D.MGAMES.coins(rnd, band); if (c.cents % 10 || c.cents < 30 || !c.q.includes((c.cents / 100).toFixed(2))) gbad.push(c); }
  for (const rule of ['even', 'mult3', 'mult5', 'gt50', 'f24', 'f36', 'prime', 'mult4']) {
    const p = D.MGAMES.pop(rnd, rule), test = { even: x => x % 2 === 0, mult3: x => x % 3 === 0, mult4: x => x % 4 === 0, mult5: x => x % 5 === 0, gt50: x => x > 50, f24: x => 24 % x === 0, f36: x => 36 % x === 0, prime: isPrime }[rule];
    if (!p.items.some(x => x.ok) || p.items.some(x => x.ok !== test(+x.t)) || new Set(p.items.map(x => x.t)).size !== p.items.length) gbad.push(p);
  }
}
ok(!gbad.length, 'Clock hands, Pizza fractions, Balance scale, Coin counter and Balloon pop all have right answers (400 of each)', gbad.slice(0, 3));

/* ---------- Every live lesson built out ---------- */
const packs = {};
for (const f of readdirSync(path.join(REPO, 'public/chorecast/growth')).filter(f => /^[a-z]+\.(sprouts|builders|makers)\.txt$/.test(f))) {
  const [tree, band] = f.split('.'); packs[f] = G.parsePack(readFileSync(path.join(REPO, 'public/chorecast/growth', f), 'utf8'), tree, band); G.Packs[`${tree}.${band}`] = packs[f];
}
const live = path.join(REPO, 'public/chorecast/growth/index.json'), shipped = JSON.parse(readFileSync(live, 'utf8')).counts;
const lessonSteps = (kid, l) => { const have = l.tries.length + (l.play ? 1 : 0) + l.checks.length; return { have, drill: D.lessonDrill(kid, l, have) }; };
const short = [], noBank = [], itemBad = [];
for (const [f, pack] of Object.entries(packs)) {
  const band = f.split('.')[1], kid = kids[band];
  for (const l of pack.units.flatMap(u => u.lessons)) {
    const { have, drill } = lessonSteps(kid, l), total = have + drill.length;
    if (!drill.length) { noBank.push(l.id); continue; }
    if (total > DRILL[band] || total < Math.min(40, DRILL[band]) || (total !== DRILL[band] && l.unit > 1)) short.push(`${l.id}: ${total}`);
    for (const s of drill) {
      const it = s.item;
      if (s.gen.startsWith('m.') && it.calc) {
        const p = { calc: it.calc, unit: it.unit };
        if (it.type === 'gap' && !sameAs(p, it.a)) itemBad.push([l.id, it.q, it.a]);
        if (it.type === 'mcq' && (it.opts.filter(o => o.ok).length !== 1 || it.opts.some(o => o.ok !== sameAs(p, o.t)))) itemBad.push([l.id, it.q, it.opts]);
        if (it.type === 'tf' && it.a !== sameAs(p, it.shown)) itemBad.push([l.id, it.q, it.a]);
      }
      if (it.type === 'lightning') for (const x of it.items) if (x.calc && x.a !== sameAs({ calc: x.calc, unit: x.unit }, x.shown)) itemBad.push([l.id, x.t, x.a]);
      if (s.gen.startsWith('f.') && it.type === 'gap' && (it.opts.filter(o => o === it.a).length !== 1 || it.opts.length < 3)) itemBad.push([l.id, it.q, it.opts]);
      if (s.gen === 'f.pick' && (it.opts.length !== 3 || it.opts.filter(o => o.ok).length !== 1 || !l.facts.some(f => D.factPut(f, f.key) === it.opts.find(o => o.ok).t && it.opts.filter(o => !o.ok).every(o => f.wrongs.some(w => D.factPut(f, w) === o.t))))) itemBad.push([l.id, 'pick', it.opts]);
      if (it.type === 'tf' && !it.a && it.q === it.why) itemBad.push([l.id, 'a false statement that is the true one', it.q]);
      if (it.type === 'sort' && it.items.some(x => (x.b === 'True' ? !l.facts.some(f => D.factPut(f, f.key) === x.t) : !l.facts.some(f => f.wrongs.some(w => D.factPut(f, w) === x.t))))) itemBad.push([l.id, 'sort', it.items]);
      if (s.gen.startsWith('f.') && it.type === 'tf') { const all = pack.units.flatMap(u => u.lessons).flatMap(o => o.facts); if (it.a ? !all.some(f => D.factPut(f, f.key) === it.q) : !all.some(f => D.factPut(f, f.key) === it.why && f.wrongs.some(w => D.factPut(f, w) === it.q))) itemBad.push([l.id, 'tf', it.q]); }
    }
  }
}
const liveLessons = Object.entries(packs).flatMap(([f, p]) => p.units.flatMap(u => u.lessons).map(l => [f.split('.')[0], l]));
ok(!itemBad.length, 'every built maths question and fact question has exactly one right answer', itemBad.slice(0, 4));
ok(!short.length, `every built-out lesson has 40, 45 or 50 questions and games for its band, and at least 40 in a subject's first unit (${liveLessons.length - noBank.length} lessons)`, short.slice(0, 8));
ok(liveLessons.filter(([tree, l]) => tree === 'maths' && +l.unit <= (shipped[`maths.${l.band}`] || {}).units).every(([, l]) => D.MSKILL.S[l.skill]), 'every live maths lesson has a question generator for its topic', liveLessons.filter(([tree, l]) => tree === 'maths' && !D.MSKILL.S[l.skill]).map(([, l]) => l.skill).slice(0, 20));

/* ---------- Fact banks ---------- */
const factDir = path.join(REPO, 'chorecast-growth/content/facts'), fbad = [];
let facts = 0;
const isLive = (tree, band, l) => { const c = shipped[`${tree}.${band}`]; return c && l.unit <= c.units; };
for (const [tree, l] of liveLessons) {
  const band = l.band, need = tree !== 'maths' || !D.MSKILL.S[l.skill];
  if (!need) continue;
  facts += l.facts.length;
  if (isLive(tree, band, l) && (l.facts.length < 8 || l.facts.length > 12)) fbad.push(`${l.id}: ${l.facts.length} facts`);
  for (const f of l.facts) {
    const full = D.factPut(f, f.key), ws = f.wrongs.map(w => w.toLowerCase());
    if (f.wrongs.length < 2 || new Set(ws).size !== ws.length || ws.includes(f.key.toLowerCase())) fbad.push(`${l.id}: “${full}” needs 2 or 3 different wrong answers, none the right one`);
    if (/[_[\]|]/.test(full) || !/[.!?]["”’]?$/.test(full)) fbad.push(`${l.id}: “${full}” isn't one clean sentence`);
    if (/[{}]/.test(f.key + f.wrongs.join(''))) fbad.push(`${l.id}: “${full}”: a country switch {nz:…~au:…} can only go in the sentence, not the answer or wrong answers`);
    if (full.split(/\s+/).length > (band === 'sprouts' ? 18 : 24)) fbad.push(`${l.id}: “${full}” is too long for ${band}`);
  }
}
if (existsSync(factDir)) for (const f of readdirSync(factDir).filter(f => f.endsWith('.txt'))) {
  const text = readFileSync(path.join(factDir, f), 'utf8'), tree = f.replace('.txt', ''); let band = null;
  for (const line of text.split('\n')) {
    const b = line.match(/^@band (\w+)/); if (b) band = b[1];
    const m = line.match(/^@facts (\d+)\.(\d+)/); if (m && !(packs[`${tree}.${band}.txt`] || { units: [] }).units.some(u => u.n === +m[1] && u.lessons.some(x => x.n === +m[2]))) fbad.push(`${f} ${band} @facts ${m[1]}.${m[2]}: no such lesson`);
    if (/^fact:/.test(line) && !/\[[^\]]+\]/.test(line)) fbad.push(`${f}: no [answer] in “${line}”`);
  }
}
ok(!fbad.length, `every live lesson outside maths has a fact bank of 8 to 12 clean facts (${facts} facts)`, fbad.slice(0, 10));

/* ---------- A fact turns into the right questions ---------- */
const f = D.factOf('Plants make their own food using [sunlight]. | soil; moonlight; rain');
ok(f && f.key === 'sunlight' && f.wrongs.length === 3 && D.factPut(f, '_') === 'Plants make their own food using _.', 'a fact line splits into the sentence, its answer and its wrong answers', f);
const fake = { id: 'science.sprouts.9.1', tree: 'science', band: 'sprouts', unit: 9, n: 1, tries: [], checks: [1, 2], play: {}, facts: Array.from({ length: 10 }, (_, i) => D.factOf(`Fact number ${i} is about [${'abcdefghij'[i]}pple]. | ${'abcdefghij'[i]}x; ${'abcdefghij'[i]}y; ${'abcdefghij'[i]}z`)) };
const fd = D.lessonDrill(kids.builders, fake, 3), kindsOf = fd.reduce((a, s) => ({ ...a, [s.gen]: (a[s.gen] || 0) + 1 }), {});
ok(fd.length === 42 && ['f.gap', 'f.tf', 'f.pick', 'f.lightning', 'f.sort', 'f.letters', 'f.tf2'].every(k => kindsOf[k]), 'a 10-fact lesson for Builders gets fill the gap, true or false both ways, Which one is true?, Lightning rounds, a sort and Guess the word', kindsOf);
ok(fd.filter(s => s.gen === 'f.tf').every((s, i, a) => a.filter(x => x.item.a).length >= 4 && a.filter(x => !x.item.a).length >= 4), 'true and false come in about equal numbers');
ok(JSON.stringify(D.lessonDrill(kids.builders, fake, 3)) === JSON.stringify(fd), 'the same kid gets the same lesson all day');

console.log(`\n${passN} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
