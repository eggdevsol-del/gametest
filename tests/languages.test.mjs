// Language courses: the te reo Māori course parses into the right shape; each age band gets its own steps from the same
// lesson; review cards come back on time and open the harder card at box 3; and on the server, cards are only made for
// passed lessons, move one box per answer when due, recordings come only from content editors, and later stages need
// Plus or the language's pack.
// node tests/languages.test.mjs (or npm test)
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { PRODUCTS, PLANS } from '../server/plans.js';
import { checkPlanWrite } from '../server/guard.js';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passN = 0, failN = 0;
const ok = (c, msg, extra) => { if (c) passN++; else { failN++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra).slice(0, 300) : ''); } };

/* ---------- The app's own lesson code, run here ---------- */
const TODAY = '2026-11-04', plus = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const el = () => ({ style: { setProperty() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
const kids = { a: { id: 'a', name: 'Ari', age: 8 }, b: { id: 'b', name: 'Bo', age: 11 }, c: { id: 'c', name: 'Cy', age: 14 } };
const C = { Store: { kids, growth: {}, ready: false, mode: 'local' }, UI: {}, Sound: {}, FX: {}, ACT: {}, ic: () => '', esc: s => s, fmt: c => `$${(c / 100).toFixed(2)}`, $: () => null, $$: () => [], uid: () => 'x', hash: () => 1, mulberry: () => Math.random, shuffle: a => a.slice(), clamp: (v, a, b) => Math.max(a, Math.min(b, v)), sleep: () => Promise.resolve(), reduced: true, dkey: () => TODAY, addDays: plus, S: () => ({}), G3: {}, api: async () => ({}), track() {} };
const ctx = { window: { Chorecast: C }, document: { createElement: el, head: el(), body: el(), addEventListener() {} }, console, setTimeout, Math, Date, JSON, Intl };
ctx.window.window = ctx.window; vm.createContext(ctx); vm.runInContext(readFileSync(path.join(REPO, 'public/chorecast/growth.js'), 'utf8'), ctx);
const G = ctx.window.Growth._debug, L = G.lang;

// The parked course, stage 1, as the build splits it
const src = readFileSync(path.join(REPO, 'chorecast-growth/content/parked/mi.txt'), 'utf8');
const stage1 = '@lang mi\n' + src.split(/^@stage 1\s*$/m)[1].split(/^@stage \d+/m)[0];
const pack = G.parsePack(stage1, 'mi', 's1');
G.Packs['mi.s1'] = pack;
ok(pack.lang === 'mi' && pack.units.length === 10 && pack.units.every(u => u.lessons.length === 8 && u.story && u.story.lines.length >= 5), 'te reo Level 1 is 10 units of 8 lessons, each unit with a story', pack.units.map(u => u.lessons.length));
const all = pack.units.flatMap(u => u.lessons);
ok(all.every(l => l.words.length >= 1 && l.words.length <= 8 && l.words.every(w => w.pic && w.en)), 'every lesson has 1 to 8 new words, each with a picture and a meaning');
ok(all.every(l => l.checks.length >= 2 && l.play && l.home && l.skill), 'every lesson has a game, two or more questions, a take-home task and a skill');
ok(!/«[^»]*\b(karakia|Tiriti|Treaty)\b/i.test(src), 'no karakia or Treaty content in the lessons');

// Spanish, Mandarin and Japanese stage 1: the same shape, readings for characters and kana, and tracing to write them
for (const lang of ['es', 'zh', 'ja']) {
  const text = readFileSync(path.join(REPO, `chorecast-growth/content/parked/${lang}.txt`), 'utf8');
  const p = G.parsePack(`@lang ${lang}\n` + text.split(/^@stage 1\s*$/m)[1].split(/^@stage \d+/m)[0], lang, 's1'), ls = p.units.flatMap(u => u.lessons);
  ok(p.units.length === 10 && p.units.every(u => u.lessons.length === 8 && u.story), `${lang}: stage 1 is 10 units of 8 lessons, each with a story`);
  ok(ls.every(l => l.words.length >= 1 && l.words.every(w => w.pic && w.en)), `${lang}: every word has a picture and a meaning`);
  if (lang !== 'es') {
    ok(ls.every(l => l.words.every(w => w.rd) && l.says.every(x => x.rd)) && p.units.every(u => u.story.lines.every(x => x.rd)), `${lang}: every word, phrase and story line has its reading`);
    ok(ls.filter(l => l.tries.some(t => t.item.type === 'trace')).length >= (lang === 'ja' ? 40 : 8), `${lang}: kids trace characters`);
  }
}
const ja = readFileSync(path.join(REPO, 'chorecast-growth/content/parked/ja.txt'), 'utf8'), traced = new Set([...ja.matchAll(/trace \| «(.)»/g)].map(m => m[1]));
ok([...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'].every(c => traced.has(c)), 'ja: every basic hiragana is traced somewhere in stage 1');

// One lesson, three ages
const l43 = all.find(l => l.id === 'mi.s1.4.3'), kinds = s => s.map(x => x.kind);
const p1 = L.langSteps(kids.a, l43, 1), p2 = L.langSteps(kids.a, l43, 2);
ok(kinds(p1).filter(k => k === 'word').length === 2 && kinds(p1).includes('part') && !kinds(p1).includes('check'), 'Sprouts: a 4-word lesson’s first sitting has 2 words and no questions', kinds(p1));
ok(kinds(p2).filter(k => k === 'word').length === 2 && kinds(p2).includes('check') && p2[1].kind === 'try', 'Sprouts: the second sitting recaps, then the other 2 words and the questions', kinds(p2));
ok(kinds(p1).includes('chant') || kinds(p2).includes('chant'), 'Sprouts chant the numbers');
const l11 = all.find(l => l.id === 'mi.s1.2.1'), sb = L.langSteps(kids.b, l11, 0), sc = L.langSteps(kids.c, l11, 0), ss = L.langSteps(kids.a, l11, 0);
ok(kinds(sb).indexOf('rule') > kinds(sb).lastIndexOf('word') && sb.find(s => s.kind === 'rule').spot, 'Builders: words first, then “Spot the pattern”', kinds(sb));
ok(kinds(sc).indexOf('rule') < kinds(sc).indexOf('word'), 'Makers: the rule first, then the words', kinds(sc));
ok(!kinds(ss).includes('rule'), 'Sprouts: no grammar rules', kinds(ss));
ok(kinds(sb).filter(k => k === 'try').length === l11.says.length, 'every phrase is a hear-say-compare step');
const quick = L.langSteps(kids.c, l11, 0, true);
ok(kinds(quick).join() === ['hook', ...l11.checks.map(() => 'check')].join(), 'Makers can test out: the hook and the questions only');

// Review cards in this device's storage (no server)
G.Packs['mi.s1'] = pack; L.Dict.build('mi');
L.lcNew(kids.b, 'mi', [{ card: 'kia ora:r', lesson: 'mi.s1.1.1' }]);
const card = () => L.lcCards(kids.b, 'mi')['kia ora:r'];
ok(card() && card().box === 1 && card().due === plus(TODAY, 1), 'a new card is due tomorrow', card());
ok(L.lcDue(kids.b, 'mi').length === 0, 'and isn’t due today');
L.lcAnswer(kids.b, 'mi', 'kia ora:r', true, 900);
ok(card().box === 1, 'answering before it’s due doesn’t move it');
card().due = TODAY; L.lcAnswer(kids.b, 'mi', 'kia ora:r', true, 900);
ok(card().box === 2 && card().due === plus(TODAY, 3), 'right: box 2, back in 3 days', card());
card().due = TODAY; L.lcAnswer(kids.b, 'mi', 'kia ora:r', true, 900);
ok(card().box === 3 && L.lcCards(kids.b, 'mi')['kia ora:p'], 'box 3 opens the say-or-type card');
card().due = TODAY; L.lcAnswer(kids.b, 'mi', 'kia ora:r', false, 900);
ok(card().box === 1 && card().due === plus(TODAY, 1), 'wrong: back to box 1, tomorrow');
ok(L.LBOX.join() === '1,3,7,16,35,90', 'boxes come back after 1, 3, 7, 16, 35 and 90 days');
const qr = L.cardItem(kids.b, 'mi', 'kia ora:r'), qp = L.cardItem(kids.b, 'mi', 'kia ora:p'), qs = L.cardItem(kids.a, 'mi', 'kia ora:p');
ok(qr.type === 'hear' && qr.opts.filter(o => o.ok).length === 1, 'the first card is a listening question');
ok(qp.type === 'type' && qp.a === 'kia ora', 'for Builders the harder card is typed');
ok(qs.type === 'mcq', 'for Sprouts it’s picked, not typed');

/* ---------- Plans: later stages need Plus or the language's pack ---------- */
const free = { limits: PLANS.free, packs: [] }, withPack = { limits: PLANS.free, packs: ['mi'] };
ok(['mi', 'es', 'zh', 'ja'].every(k => PRODUCTS[`chorecast.pack.${k}`] && PRODUCTS[`chorecast.pack.${k}`].pack === k), 'every language has a pack product');
ok(!checkPlanWrite('growth', {}, { done: { 'mi.s1.1.1': { best: 1 } } }, free), 'Free: stage 1 unit 1 is free');
ok(checkPlanWrite('growth', {}, { done: { 'mi.s1.2.1': { best: 1 } } }, free), 'Free: unit 2 comes with Plus');
ok(checkPlanWrite('growth', {}, { done: { 'mi.s2.1.1': { best: 1 } } }, free), 'Free: stage 2 unit 1 comes with Plus too');
ok(!checkPlanWrite('growth', {}, { done: { 'mi.s3.4.2': { best: 1 } } }, withPack), 'the te reo pack opens every stage');

/* ---------- The server ---------- */
const PORT = 8783, dir = mkdtempSync(path.join(os.tmpdir(), 'cc-lang-'));
const srv = spawn('node', [path.join(REPO, 'server/index.js'), '--port', String(PORT), '--static', path.join(REPO, 'public')], { env: { ...process.env, PGLITE_DIR: dir, DATABASE_URL: '', CONTENT_EDITORS: 'kaiako@test.localhost' } });
let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
for (let i = 0; i < 150 && !/Chorecast server on/.test(log); i++) await new Promise(r => setTimeout(r, 100));
function client() {
  let cookie = '';
  return async (method, url, body, raw) => {
    const r = await fetch(`http://localhost:${PORT}` + url, { method, headers: { ...(cookie ? { cookie } : {}), ...(raw ? { 'content-type': raw.type } : body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: raw ? raw.bytes : body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of r.headers.getSetCookie()) { const m = c.match(/^cc_session=([^;]*)/); if (m) cookie = m[1] ? 'cc_session=' + m[1] : ''; }
    const type = r.headers.get('content-type') || '';
    return { status: r.status, type, ...(/json/.test(type) ? await r.json() : { bytes: Buffer.from(await r.arrayBuffer()) }) };
  };
}
try {
  const P = client(), O = client(), Anyone = client();
  await P('POST', '/api/auth/signup', { email: 'kaiako@test.localhost', password: 'correct-horse-9', name: 'Kaiako', consent: true });
  await O('POST', '/api/auth/signup', { email: 'other@test.localhost', password: 'correct-horse-9', name: 'Other', consent: true });
  await P('PUT', '/api/docs/kids/k1', { name: 'Ari', age: 9, jars: { spend: 0, save: 0, invest: 0, give: 0 }, ledger: [], island: { items: [], xpSpent: 0 } });
  await P('PUT', '/api/docs/growth/k1', { done: { 'mi.s1.1.1': { best: 1, at: Date.now() } } });
  const cards = async (today = TODAY) => (await P('GET', `/api/lang/cards?kid=k1&lang=mi&today=${today}`));
  ok((await cards()).cards.length === 0, 'no cards before learning anything');
  const early = await P('POST', '/api/lang/learn', { kid: 'k1', lang: 'mi', today: TODAY, cards: [{ card: 'mōrena:r', lesson: 'mi.s1.1.3' }] });
  ok(early.status === 409 && early.code === 'not_passed', 'no cards for a lesson that isn’t passed', early);
  const learnt = await P('POST', '/api/lang/learn', { kid: 'k1', lang: 'mi', today: TODAY, cards: [{ card: 'kia ora:r', lesson: 'mi.s1.1.1' }, { card: 'kia ora, ari!:r', lesson: 'mi.s1.1.1' }, { card: 'kia ora:p', lesson: 'mi.s1.1.1' }] });
  ok(learnt.status === 200 && learnt.added === 2, 'a passed lesson makes its recognising cards (and not the harder ones)', learnt);
  let c = (await cards()).cards.find(x => x.card === 'kia ora:r');
  ok(c && c.box === 1 && c.due === plus(TODAY, 1), 'due tomorrow', c);
  const notYet = await P('POST', '/api/lang/answers', { kid: 'k1', lang: 'mi', today: TODAY, answers: [{ card: 'kia ora:r', ok: true, ms: 1200 }] });
  c = (await cards()).cards.find(x => x.card === 'kia ora:r');
  ok(notYet.moved === 0 && c.box === 1 && c.right === 1, 'answered early: counted, but the box doesn’t move', { notYet, c });
  const tomorrow = plus(TODAY, 1);
  await P('POST', '/api/lang/answers', { kid: 'k1', lang: 'mi', today: tomorrow, answers: [{ card: 'kia ora:r', ok: true, ms: 900 }, { card: 'kia ora:r', ok: true, ms: 900 }] });
  c = (await cards(tomorrow)).cards.find(x => x.card === 'kia ora:r');
  ok(c.box === 2 && c.due === plus(tomorrow, 3), 'one box per answer when due: a second answer the same day doesn’t skip ahead', c);
  const far = await P('POST', '/api/lang/answers', { kid: 'k1', lang: 'mi', today: '2030-01-01', answers: [{ card: 'kia ora, ari!:r', ok: true }] });
  ok(far.moved === 0, 'a far-off date from the device isn’t believed', far);
  const st = (await cards()).stats;
  ok(st.week.n === 4 && st.week.right === 4, 'the week’s reviews are counted for the report', st);
  ok((await P('GET', '/api/lang/cards?kid=k1&lang=xx')).status === 400, 'an unknown language is refused');
  ok((await O('GET', '/api/lang/cards?kid=k1&lang=mi')).status === 404, 'another family can’t see this kid’s cards');
  ok((await Anyone('GET', '/api/lang/cards?kid=k1&lang=mi')).status === 401, 'and nobody signed out can');

  // Recordings
  const line = 'Kia ora, Ari!', url = `/api/lang/audio/mi/${encodeURIComponent(line)}`, mp4 = { type: 'audio/mp4', bytes: Buffer.from('fake-audio-bytes') };
  ok((await O('POST', url, undefined, mp4)).status === 403, 'only a content editor can record');
  ok((await Anyone('POST', url, undefined, mp4)).status === 401, 'and not someone signed out');
  ok((await P('POST', url, undefined, { type: 'text/plain', bytes: Buffer.from('x') })).status === 415, 'a recording must be audio');
  ok((await P('POST', url, undefined, mp4)).status === 200, 'a content editor records a line');
  const ix = await Anyone('GET', '/api/lang/audio-index/mi');
  ok(ix.lines && ix.lines[line], 'the recordings list has it, for anyone', ix);
  const got = await Anyone('GET', url);
  ok(got.status === 200 && got.type === 'audio/mp4' && got.bytes.equals(mp4.bytes), 'and anyone can play it', got.status);
  ok((await Anyone('GET', `/api/lang/audio/mi/${encodeURIComponent('Tēnā koe')}`)).status === 404, 'a line not recorded yet is a 404');
  const mac = `/api/lang/audio/mi/${encodeURIComponent('Tēnā koutou')}`;
  await P('POST', mac, undefined, mp4);
  ok((await Anyone('GET', '/api/lang/audio-index/mi')).lines['Tēnā koutou'], 'macrons survive the round trip');

  // Language runs are kept as their own kind in the lesson reports
  const ev = await P('POST', '/api/events', { events: [{ type: 'growth.attempt', kidId: 'k1', at: Date.now(), payload: { kind: 'lreview', id: 'lreview', tree: 'mi', correct: 3, total: 4, xp: 9 } }] });
  ok(ev.status === 200, 'a word-practice attempt is stored', ev);
} finally { srv.kill(); await new Promise(r => setTimeout(r, 300)); }

console.log(`${passN} passed, ${failN} failed`);
if (failN) console.log(log.split('\n').filter(l => /rror/.test(l)).slice(0, 8).join('\n'));
process.exit(failN ? 1 : 0);
