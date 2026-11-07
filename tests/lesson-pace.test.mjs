// A year of lessons: maths practice can't have a wrong answer (every kind, 1,000 times, worked out again from its
// sum); there's no cap on new lessons unless a grown-up sets one, and a cap never stops a grown-up's assigned lesson; each kid picks a language and a
// grown-up's off beats it; every live subject has a pack product; and the lesson checker fails a pack with a wrong
// written sum, a short unit or a matching pair with a second =.
// node tests/lesson-pace.test.mjs (or npm test)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { PRODUCTS } from '../server/plans.js';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

/* ---------- The app's own lesson code, run here ---------- */
const TODAY = new Date().toISOString().slice(0, 10);
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const kids = { a: { id: 'a', name: 'Ari', age: 8 }, b: { id: 'b', name: 'Bo', age: 11 } };
let SET = {};
const C = { Store: { kids, growth: {}, ready: false, mode: 'local' }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: c => `$${(c / 100).toFixed(2)}`, $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a.slice(), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => TODAY, addDays: d => d, S: () => SET, G3: {}, api: async () => ({}), track() {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON, Intl };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8'), ctx);
const G = ctx.window.Growth._debug, M = G.maths, P = G.pace, K = G.pick;

/* ---------- Maths practice: every answer worked out again ---------- */
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const frac = s => { const [a, b] = String(s).replace('−', '-').split('/').map(Number); return b ? a / b : a; };
const bad = {};
for (const [kind, make] of Object.entries(M.K)) {
  for (let i = 0; i < 1000; i++) {
    const it = make(rnd), v = Function(`return (${it.calc})`)(), miss = m => { (bad[kind] || (bad[kind] = [])).push(m); };
    if (it.type === 'gap') { if (Math.abs(+it.a - v) > 1e-9) miss(`${it.q} → ${it.a}, works out to ${v}`); if (!it.q.includes('_')) miss('no blank'); if (+it.a < 0) miss('negative on the number pad'); continue; }
    const right = it.opts.filter(o => o.ok);
    if (right.length !== 1 || it.opts.length < 3) { miss(`options ${JSON.stringify(it.opts)}`); continue; }
    const same = t => (it.unit === 'time' ? ((toMin(t) - v) % 720 + 720) % 720 === 0 : Math.abs(frac(t) - v) < 1e-9);
    if (!same(right[0].t)) miss(`${it.q} → ${right[0].t}, works out to ${v}`);
    for (const o of it.opts.filter(o => !o.ok)) if (same(o.t)) miss(`${it.q}: wrong option ${o.t} is also right`);
  }
}
ok(!Object.keys(bad).length, `every maths practice kind (${Object.keys(M.K).length}) gives the right answer 1,000 times out of 1,000`, bad);
ok(M.LEVELS.flat().every(k => M.K[k] && M.NAMES[k]), 'every kind in a band exists and has a name');
for (const band of [0, 1, 2]) {
  const set = M.set(rnd, band, 10, {});
  ok(set.length === 10 && set.every((x, i) => !i || set[i - 1].kind !== x.kind), `band ${band}: a practice set is 10 questions, never the same kind twice in a row`);
}
const weakSets = Array.from({ length: 200 }, () => M.set(rnd, 1, 10, { fracof: { n: 10, r: 1 }, times12: { n: 10, r: 10 } })).flat();
const count = k => weakSets.filter(x => x.kind === k).length;
ok(count('fracof') > count('times12') * 2, 'practice gives a kind the kid keeps missing far more often than one they always get', { fracof: count('fracof'), times12: count('times12') });

/* ---------- New lessons a day ---------- */
const sprouts = readFileSync(path.join(REPO, 'public/chorecast/growth/money.sprouts.txt'), 'utf8');
G.Packs['money.sprouts'] = G.parsePack(sprouts, 'money', 'sprouts');
for (const t of ['maths', 'words', 'science', 'mind', 'body', 'character']) G.Packs[`${t}.sprouts`] = G.parsePack(readFileSync(path.join(REPO, `public/chorecast/growth/${t}.sprouts.txt`), 'utf8'), t, 'sprouts');
const kid = kids.a, first = G.Packs['money.sprouts'].units[0].lessons[0];
SET = {}; C.Store.growth.a = { day: { d: TODAY, xp: 250, ms: 3 * 3600e3, cards: 0, nl: 12, ll: 9 } };
ok(P.perDay() === Infinity && P.newLeft(kid) > 100 && !P.restOfDay(kid) && P.langNewLeft(kid) > 100, 'no cap on new lessons by default, even after 12 today (and 9 language lessons)');
ok(P.suggestions(kid, 3).length === 3, 'a kid with lessons to do always gets three to pick from');
SET = { growth: { perDay: 2 } }; C.Store.growth.a = { day: { d: TODAY, xp: 90, ms: 0, cards: 0, nl: 2 } };
ok(P.newLeft(kid) === 0 && P.suggestions(kid, 3).length === 0 && P.restOfDay(kid), 'with a cap of 2, after two new lessons today none are offered and the day is marked done', P.suggestions(kid, 3).map(l => l.id));
C.Store.growth.a.assigned = [{ id: first.id, bonus: 20 }];
ok(P.suggestions(kid, 3).map(l => l.id).join() === first.id, 'a lesson a grown-up assigned is still offered');
C.Store.growth.a.assigned = [];
C.Store.growth.a.day = { d: '2000-01-01', nl: 2 };
ok(P.newLeft(kid) === 2, 'yesterday’s count doesn’t carry over');
C.Store.growth.a.day = { d: TODAY, nl: 2 }; SET = { growth: { perDay: 3 } };
ok(P.newLeft(kid) === 1, 'a grown-up can allow 3 a day');
SET = { growth: { perDay: 0 } };
ok(P.newLeft(kid) > 100 && !P.restOfDay(kid), '“No limit” never stops new lessons');
SET = {};
ok(P.lessonsLeft(kid) === G.TREES.reduce((n, t) => n + (G.Packs[`${t.id}.sprouts`] ? G.Packs[`${t.id}.sprouts`].units.reduce((a, u) => a + u.lessons.length, 0) : 0), 0), 'lessons left counts every live subject');
SET = { growth: { perDay: 2 } }; C.Store.growth.a.day = { d: TODAY, ll: 2, nl: 0 };
ok(P.langNewLeft(kid) === 0 && P.newLeft(kid) === 2, 'with a cap, language lessons count on their own tally');
SET = {};

/* ---------- Long lessons: rounds, and practising what you missed ---------- */
const mk = (n, extra = []) => [{ kind: 'hook' }, { kind: 'learn' }, ...extra, ...Array.from({ length: n }, (_, i) => ({ kind: 'check', i })), { kind: 'home' }];
const short = P.addRounds(mk(P.ROUND_MIN - 1));
ok(!short.some(s => s.kind === 'round'), `a lesson with fewer than ${P.ROUND_MIN} scored questions has no rounds`);
const long = P.addRounds(mk(46, [{ kind: 'play' }])), cps = long.filter(s => s.kind === 'round');
ok(cps.length === 3 && cps.every(c => c.of === 4) && cps.map(c => c.n).join() === '1,2,3', 'a 47-item lesson becomes 4 rounds with 3 checkpoints', cps);
ok(long[long.length - 1].kind === 'home' && long[long.length - 2].kind === 'check', 'no checkpoint after the last round');
const scoredBefore = i => long.slice(0, i).filter(s => P.stepWorth(s)).length;
ok(cps.every(c => scoredBefore(long.indexOf(c)) % P.ROUND_SIZE === 0), `checkpoints come after every ${P.ROUND_SIZE} scored items (a game counts once)`);
const odd = P.addRounds(mk(25)), oddAt = odd.map((s, i) => (s.kind === 'round' ? i : -1)).filter(i => i >= 0).map(i => odd.slice(0, i).filter(s => P.stepWorth(s)).length);
ok(oddAt.join() === '9,18', 'rounds are as even as they can be: 25 questions make rounds of 9, 9 and 7, not 12, 12 and 1', oddAt);
// First try: 10 questions, 7 right = 70%. Practise the 3 missed: get 2 right = 90%.
const base = { steps: mk(10), res: [] }; base.steps.forEach((s, i) => { if (s.kind === 'check') base.res[i] = { ok: s.i < 7 }; });
const try1 = P.runPoints(base);
ok(P.pct(try1.got / try1.total) === 70 && try1.got < try1.need, 'a first try of 7 out of 10 is 70%: not passed');
const missed = base.steps.map((s, i) => (s.kind === 'check' && !base.res[i].ok ? i : -1)).filter(i => i >= 0);
const RR = { steps: [{ kind: 'intro' }, ...missed.map(i => base.steps[i])], res: [], retry: { base, map: [-1, ...missed] } };
let Mg = P.runPoints(P.mergeRetry(RR));
ok(Mg.got === 7 && Mg.left === 3, 'before practising, the missed 3 count as still to do and the 7 right are kept', Mg);
RR.res[1] = { ok: true }; RR.res[2] = { ok: true }; RR.res[3] = { ok: false };
Mg = P.runPoints(P.mergeRetry(RR));
ok(P.pct(Mg.got / Mg.total) === 90 && Mg.got >= Mg.need && Mg.left === 0, 'getting 2 of the 3 missed right makes the whole lesson 90%: passed', Mg);

/* ---------- Every kid picks a language ---------- */
C.Store.growth.a = {}; SET = {};
const ids = ls => ls.map(L => L.id).join();
ok(ids(K.kidLangs(kid)) === '' && ids(K.langPickable(kid)) === 'es,zh,ja', 'a kid with no pick learns no language yet and can pick any live one', ids(K.langPickable(kid)));
C.Store.growth.a = { langPick: 'es' };
ok(ids(K.kidLangs(kid)) === 'es', 'the kid’s pick is their language');
SET = { growth: { langs: { a: { es: false } } } };
ok(ids(K.kidLangs(kid)) === '' && !ids(K.langPickable(kid)).includes('es'), 'a grown-up’s Off beats the kid’s pick and takes it off the picker');
SET = { growth: { langs: { a: { ja: true, es: null } } } };
ok(ids(K.kidLangs(kid)) === 'es,ja', 'a grown-up’s On adds a course next to the kid’s pick');
ok(!K.langPickable(kid).some(L => L.id === 'mi'), 'te reo Māori isn’t offered until it’s reviewed and recorded');

/* ---------- Packs for every subject ---------- */
const packIds = Object.values(PRODUCTS).map(p => p.pack).filter(Boolean);
ok(G.TREES.every(t => packIds.includes(t.id)), 'every live subject can be bought as a pack', G.TREES.map(t => t.id).filter(t => !packIds.includes(t)));
ok(!packIds.includes('time') && !packIds.includes('world'), 'the replaced subjects have no packs');

/* ---------- Kid screens never sell ---------- */
const code = readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8');
const fnText = name => { const i = code.indexOf(`function ${name}(`); return i < 0 ? '' : code.slice(i, code.indexOf('\n}\n', i)); };
const kidUi = [fnText('langPicker'), fnText('doneDayCard'), code.slice(code.indexOf('// No language yet: the kid picks one'), code.indexOf('const cs = casesFor(kid)'))].join('\n');
ok(kidUi.length > 500 && !/\$\d|\bbuy\b|upgrade|ask a grown-up|price/i.test(kidUi), 'the language picker and the day’s-done card have no prices, buying or upgrade nudges');

/* ---------- The checker fails a broken pack ---------- */
const tmp = mkdtempSync(path.join(os.tmpdir(), 'cc-pace-'));
cpSync(path.join(REPO, 'public/chorecast/growth'), tmp, { recursive: true });
const run = () => spawnSync(process.execPath, [path.join(REPO, 'scripts/check-growth.mjs')], { encoding: 'utf8', env: { ...process.env, GROWTH_DIR: tmp } });
let r = run();
ok(r.status === 0 && /All content looks good/.test(r.stdout), 'the checker passes the real packs', (r.stdout + r.stderr).slice(-300));
const mf = path.join(tmp, 'maths.sprouts.txt'), orig = readFileSync(mf, 'utf8');
ok(orig.includes('check: gap | 300 + 40 + 9 = _ | 349'), 'the test sum is where expected');
writeFileSync(mf, orig.replace('check: gap | 300 + 40 + 9 = _ | 349', 'check: gap | 300 + 40 + 9 = _ | 350'));
r = run();
ok(r.status === 1 && /works out to 349, not 350/.test(r.stdout), 'a wrong written sum fails the checker', r.stdout.slice(-300));
const cut = orig.replace(/\n@lesson 4\.4 \|[\s\S]*$/, '\n');
writeFileSync(mf, cut);
r = run();
ok(r.status === 1 && /unit 4 has 3 lessons, expected 4/.test(r.stdout), 'a unit with a lesson missing fails the checker', r.stdout.slice(-300));
writeFileSync(mf, orig.replace('2 × 3=6;', 'y = 2 × 3=6;'));
r = run();
ok(r.status === 1 && /has more than one =/.test(r.stdout), 'a matching pair with a second = fails the checker', r.stdout.slice(-300));

console.log(`${passN} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);
