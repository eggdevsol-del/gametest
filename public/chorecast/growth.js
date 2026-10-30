/* Chorecast · Character Growth
   Interactive lessons in money, life, work and learning skills for ages 7 to 18, earning XP for the island.
   Built from chorecast-growth/*.js by scripts/build-growth.mjs into public/chorecast/growth.js.
   Lessons live in public/chorecast/growth/*.txt content packs (format in CONTENT.md), so new lessons,
   Money Moments and case studies ship without touching this code, and the server's content feed adds more. */
(() => {
'use strict';
const C = window.Chorecast; if (!C) return;
const { Store, UI, Sound, FX, ic, esc, fmt, $, $$, uid, hash, mulberry, shuffle, clamp, sleep, reduced, dkey, addDays } = C;
const S = () => C.S();

/* ---------- Catalogue ---------- */
const TREES = [
  { id: 'money', name: 'Money Sense', icon: '💰', hue: '#30C25A', title: 'Budget Boss', scene: 'bank', blurb: 'Earning, spending, saving and budgeting' },
  { id: 'invest', name: 'Investor School', icon: '📈', hue: '#18B597', title: 'Patient Investor', scene: 'shares', blurb: 'How money grows, risk and patience' },
  { id: 'work', name: 'Work and Careers', icon: '🧰', hue: '#FF9F0A', title: 'Hard Worker', scene: 'workshop', blurb: 'Doing a job well, jobs and workplaces' },
  { id: 'make', name: 'Make and Sell', icon: '🍋', hue: '#FF6B6B', title: 'Market Maker', scene: 'stall', blurb: 'Costs, prices, customers and profit' },
  { id: 'give', name: 'Give and Change', icon: '💝', hue: '#F25CA2', title: 'Kind Heart', scene: 'garden', blurb: 'Giving, causes and making a difference' },
  { id: 'maths', name: 'Everyday Maths', icon: '🧮', hue: '#2FA8E8', title: 'Number Ninja', scene: 'kitchen', blurb: 'Change, percentages, recipes and rates' },
  { id: 'words', name: 'Words That Work', icon: '💬', hue: '#A66BF0', title: 'Word Smith', scene: 'stage', blurb: 'Asking, explaining, writing and persuading' },
  { id: 'time', name: 'Money Through Time', icon: '🏺', hue: '#C98A3E', title: 'Time Traveller', scene: 'museum', blurb: 'From barter and shells to banks and booms' },
  { id: 'home', name: 'Home and Life', icon: '🏡', hue: '#F2A31B', title: 'Home Hero', scene: 'home', blurb: 'Cooking, cleaning, safety and running a home' },
  { id: 'mind', name: 'Mind and Body', icon: '🧘', hue: '#3BB8D9', title: 'Calm Captain', scene: 'garden', blurb: 'Feelings, habits, patience and wellbeing' },
  { id: 'online', name: 'Smart Online', icon: '🛡️', hue: '#6A79F0', title: 'Scam Spotter', scene: 'online', blurb: 'Privacy, scams, ads and staying safe' },
  { id: 'world', name: 'How the World Works', icon: '🏛️', hue: '#2F6FE4', title: 'Civic Star', scene: 'townhall', blurb: 'Rules, tax, councils and government' },
];
const TREE = Object.fromEntries(TREES.map(t => [t.id, t]));
const BANDS = [
  { id: 'sprouts', name: 'Sprouts', ages: '7 to 9', words: 10 },
  { id: 'builders', name: 'Builders', ages: '10 to 12', words: 14 },
  { id: 'makers', name: 'Makers', ages: '13 to 15', words: 18 },
  { id: 'launchers', name: 'Launchers', ages: '16 to 18', words: 22 },
];
const BAND_IX = Object.fromEntries(BANDS.map((b, i) => [b.id, i]));
const GSET = () => ({ cap: 20, off: {}, band: {}, country: 'nz', living: true, readAloud: true, ...((S().growth) || {}) });
function bandOf(kid) {
  const age = kid.age || 9, base = age <= 9 ? 0 : age <= 12 ? 1 : age <= 15 ? 2 : 3, shift = GSET().band[kid.id] || 0;
  return BANDS[clamp(base + shift, 0, 3)].id;
}
// XP rules from the plan: modest, capped, and only for correct, completed learning.
const XP = { lesson: 40, perfect: 10, replay: 10, card: 3, cardsPerDay: 15, echo: 15, caseStudy: 50, challenge: 120, moment: 10, story: 20, path: 500, dayCap: 250, assignedMax: 50 };
const BOXES = [1, 3, 7, 16, 35];
const RANKS = ['Saver', 'Starter', 'Steady', 'Long-termer', 'Portfolio Pro'];

/* ---------- Content packs ----------
   One text file per tree and band (growth/<tree>.<band>.txt), plus moments.txt and cases.txt.
   {nz:...~au:...} picks the family's country; "*" marks right answers. */
const Packs = {}, loading = {};
let Moments = [], Cases = [], feedLoaded = false, contentVer = '1';
const local = s => String(s == null ? '' : s).replace(/\{nz:([^~}]*)~au:([^}]*)\}/g, (m, nz, au) => (GSET().country === 'au' ? au : nz));
const splitList = s => String(s || '').split(';').map(x => x.trim()).filter(Boolean);
const starOpts = arr => arr.map(o => o.trim()).filter(Boolean).map(o => ({ t: o.replace(/\*$/, '').trim(), ok: /\*$/.test(o) }));

function parseItem(line) {
  const f = line.split('|').map(x => x.trim()), type = f[0];
  switch (type) {
    case 'mcq': return { type, q: f[1], opts: starOpts(f.slice(2)) };
    case 'tf': return { type, q: f[1], a: /^t/i.test(f[2] || '') , why: f[3] || '' };
    case 'gap': return { type, q: f[1], a: f[2], opts: f[3] ? splitList(f[3]) : null };
    case 'sort': return { type, q: f[3] || 'Sort each one', bins: f[1] === 'jars' ? ['Spend', 'Vault', 'Invest', 'Give'] : f[1].split(',').map(x => x.trim()), jars: f[1] === 'jars', items: splitList(f[2]).map(x => { const i = x.lastIndexOf('='); return { t: x.slice(0, i).trim(), b: x.slice(i + 1).trim() }; }) };
    case 'order': case 'build': return { type, q: f[1], steps: splitList(f[2]) };
    case 'match': case 'route': return { type, q: f[1], pairs: splitList(f[2]).map(x => { const i = x.indexOf('='); return [x.slice(0, i).trim(), x.slice(i + 1).trim()]; }) };
    case 'slider': return { type, q: f[1], min: +f[2], max: +f[3], a: +f[4], unit: f[5] || '', tol: f[6] != null && f[6] !== '' ? +f[6] : null, step: f[7] ? +f[7] : null };
    case 'price': return { type, q: f[1], products: splitList(f[2]).map(p => { const [name, cost, qty, unit] = p.split(':').map(x => x.trim()); return { name, cost: +cost, qty: +qty, unit: unit || '' }; }) };
    case 'scam': return { type, q: f[1], msgs: splitList(f[2]).map(x => { const i = x.lastIndexOf('='); return { t: x.slice(0, i).trim(), scam: x.slice(i + 1).trim() === 'scam' }; }), why: f[3] || '' };
    case 'path': return { type, q: f[1], choices: f.slice(2).map(c => { const [t, rest = ''] = c.split('=>'); const m = rest.trim().match(/^(good|ok|bad)\s*:\s*(.*)$/i); return { t: t.trim(), grade: m ? m[1].toLowerCase() : 'ok', out: m ? m[2] : rest.trim() }; }) };
    case 'debate': return { type, q: f[1], args: starOpts(f.slice(2, 4)), other: f[4] || '' };
    case 'tap': return { type, q: f[1], items: splitList(f[2]).map(x => { const [e, kind, why] = x.split(':').map(y => (y || '').trim()); return { e, hit: kind === 'yes', why: why || '' }; }) };
    case 'budget': return { type, q: f[1], income: +f[2], cats: splitList(f[3]).map(x => { const [n, min] = x.split('='); return { n: n.trim(), min: +(min || 0) }; }), surprise: f[4] ? (([n, c]) => ({ n, c: +c }))(f[4].split(':')) : null };
    case 'market': return { type, q: f[1], years: +f[2] || 10 };
    case 'compound': return { type, q: f[1], start: +f[2], rate: +f[3], years: +f[4] };
    case 'shop': return { type, q: f[1], item: f[2], cost: +f[3], goal: +(f[4] || 0) };
    case 'timing': return { type, q: f[1], label: f[2] || 'Tap!', zone: f[3] || 'sale' };
    case 'diff': return { type, q: f[1], a: splitList(f[2]), b: splitList(f[3]) };
    case 'chat': return { type, q: f[1], turns: f.slice(2).map(t => t.startsWith('me:') ? { me: starOpts(t.slice(3).split('/')) } : { them: t.replace(/^them:\s*/, '') }) };
    case 'mystery': return { type, q: 'Who or what is it?', clues: splitList(f[1]), opts: starOpts(f.slice(2)) };
    case 'island': return { type, q: f[1] || '', kind: f[2] || 'items' };
    case 'gen': return { type, kind: f[1], n: +(f[2] || 3) };
    default: return { type: 'note', q: line };
  }
}

function parsePack(text, tree, band) {
  const pack = { tree, band, units: [] }; let unit = null, les = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@unit')) { const [n, title, goal] = line.slice(5).split('|').map(x => x.trim()); unit = { id: `${tree}.${band}.${n}`, n: +n, title, goal: goal || '', lessons: [] }; pack.units.push(unit); les = null; continue; }
    if (line.startsWith('@lesson')) {
      const [num, title, icon, scene] = line.slice(7).split('|').map(x => x.trim()), [un, ln] = num.split('.').map(Number);
      unit = pack.units.find(u => u.n === un) || unit;
      les = { id: `${tree}.${band}.${un}.${ln}`, tree, band, unit: un, n: ln, title, icon: icon || TREE[tree].icon, scene: scene || TREE[tree].scene, learn: [], tries: [], checks: [], hook: '', home: '', skill: '' };
      unit.lessons.push(les); continue;
    }
    if (!les) continue;
    const i = line.indexOf(':'), key = line.slice(0, i).trim(), val = line.slice(i + 1).trim();
    if (key === 'hook') les.hook = val;
    else if (key === 'learn') les.learn.push(val);
    else if (key === 'guess') les.guess = parseItem(val);
    else if (key === 'try') { const [ex, item] = val.split('::').map(x => x.trim()); les.tries.push({ ex: item ? ex : '', item: parseItem(item || ex) }); }
    else if (key === 'play') les.play = parseItem(val);
    else if (key === 'check') les.checks.push(parseItem(val));
    else if (key === 'home') les.home = val;
    else if (key === 'skill') les.skill = val;
    else if (key === 'mins') les.mins = +val;
  }
  for (const u of pack.units) u.lessons.sort((a, b) => a.n - b.n);
  return pack;
}

function parseMoments(text) {
  const out = []; let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@m ')) { const [id, bands, season, tags] = line.slice(3).split('|').map(x => x.trim()); cur = { id, bands: bands === 'all' || !bands ? BANDS.map(b => b.id) : bands.split(',').map(x => x.trim()), season: season || '', tags: (tags || '').split(',').map(x => x.trim()).filter(Boolean), text: '', item: null }; out.push(cur); continue; }
    if (!cur) continue;
    if (!cur.text) cur.text = line; else if (!cur.item) cur.item = parseItem(line);
  }
  return out.filter(m => m.item);
}

function parseCases(text) {
  const out = []; let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('@case')) { const [id, name, tree, band, icon, flags] = line.slice(5).split('|').map(x => x.trim()); cur = { id, name, tree, band, icon: icon || '⭐', living: /living/.test(flags || ''), meet: {}, opts: [], checks: [], decide: '', happened: '', skill: '', turn: '' }; out.push(cur); continue; }
    if (!cur) continue;
    const i = line.indexOf(':'), key = line.slice(0, i).trim(), val = line.slice(i + 1).trim();
    if (key.startsWith('meet')) cur.meet[key.split('@')[1] || 'all'] = val;
    else if (key === 'opt') { const [t, out2] = val.split('=>').map(x => x.trim()); cur.opts.push({ t, out: out2 || '' }); }
    else if (key === 'check') cur.checks.push(parseItem(val));
    else if (['decide', 'happened', 'skill', 'turn'].includes(key)) cur[key] = val;
  }
  return out;
}

async function fetchText(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(url + ' ' + r.status); return r.text(); }
// Content version from index.json, so every pack URL changes when the content does.
function loadIndex() {
  return loading.index || (loading.index = fetchText('growth/index.json').then(t => { contentVer = JSON.parse(t).version || contentVer; }).catch(() => {}));
}
async function loadBand(band) {
  await loadIndex();
  const todo = TREES.filter(t => !Packs[`${t.id}.${band}`]).map(t => {
    const key = `${t.id}.${band}`;
    return loading[key] || (loading[key] = fetchText(`growth/${key}.txt?v=${contentVer}`).then(txt => { Packs[key] = parsePack(txt, t.id, band); mergeFeedInto(key); }).catch(e => { console.warn('growth pack', key, e); Packs[key] = { tree: t.id, band, units: [] }; }));
  });
  await Promise.all(todo);
}
async function loadExtras() {
  if (loading.extras) return loading.extras;
  loading.extras = (async () => {
    await loadIndex();
    try { Moments = parseMoments(await fetchText(`growth/moments.txt?v=${contentVer}`)); } catch (e) { console.warn('moments', e); }
    try { Cases = parseCases(await fetchText(`growth/cases.txt?v=${contentVer}`)); } catch (e) { console.warn('cases', e); }
    await loadFeed();
  })();
  return loading.extras;
}
// Server content feed: approved lessons, Money Moments and case studies added after this release.
let Feed = [];
async function loadFeed() {
  if (feedLoaded || Store.mode !== 'server') return; feedLoaded = true;
  try { Feed = (await C.api('GET', '/api/content/feed')).items || []; } catch (e) { Feed = []; }
  for (const it of Feed) {
    if (it.kind === 'moment' && it.data && it.data.item) Moments.push({ id: it.id, bands: it.band ? [it.band] : BANDS.map(b => b.id), season: it.season_from && it.season_to ? `${it.season_from}..${it.season_to}` : '', tags: it.tags || [], text: it.data.text || '', item: typeof it.data.item === 'string' ? parseItem(it.data.item) : it.data.item });
    if (it.kind === 'case' && it.data && it.data.text) Cases.push(...parseCases(it.data.text));
  }
  Object.keys(Packs).forEach(mergeFeedInto);
}
function mergeFeedInto(key) {
  const pack = Packs[key]; if (!pack) return;
  for (const it of Feed) if (it.kind === 'lesson' && it.data && it.data.text && `${it.tree}.${it.band}` === key && !pack.merged?.[it.id]) {
    const extra = parsePack(it.data.text, pack.tree, pack.band);
    for (const u of extra.units) { const have = pack.units.find(x => x.n === u.n); if (have) { for (const l of u.lessons) if (!have.lessons.find(x => x.n === l.n)) have.lessons.push(l); have.lessons.sort((a, b) => a.n - b.n); } else pack.units.push(u); }
    pack.units.sort((a, b) => a.n - b.n); (pack.merged || (pack.merged = {}))[it.id] = 1;
  }
}
const packFor = (tree, band) => Packs[`${tree}.${band}`] || null;
const allLessons = band => TREES.flatMap(t => (packFor(t.id, band) || { units: [] }).units.flatMap(u => u.lessons));
function lessonById(id) {
  const [tree, band, un, ln] = String(id).split('.'), pack = packFor(tree, band); if (!pack) return null;
  const u = pack.units.find(x => x.n === +un); return u ? u.lessons.find(x => x.n === +ln) || null : null;
}

/* ---------- Progress (Store.growth[kidId], synced like jars and the island) ---------- */
const prog = kid => (Store.growth || {})[kid.id] || {};
const save = (kid, patch) => C.updDoc('growth', kid.id, patch);
const passed = (kid, id) => ((prog(kid).done || {})[id] || {}).best >= 0.8;
function mastered(kid) { return Object.values(prog(kid).done || {}).filter(d => d.best >= 0.8).length; }
function charLevel(kid) { return Math.min(50, 1 + Math.floor(Math.sqrt(mastered(kid) * 4))); }
function medal(kid, l) {
  const d = (prog(kid).done || {})[l.id]; if (!d || d.best < 0.8) return null;
  const cards = l.checks.map((_, i) => (prog(kid).cards || {})[`${l.id}#${i}`]).filter(Boolean);
  if (cards.length && cards.every(c => c.b >= 5)) return 'gold';
  if (d.best >= 1 || (cards.length && cards.every(c => c.b >= 3))) return 'silver';
  return 'bronze';
}
function treeStats(kid, treeId) {
  const pack = packFor(treeId, bandOf(kid)); if (!pack) return { total: 0, done: 0 };
  const ls = pack.units.flatMap(u => u.lessons); return { total: ls.length, done: ls.filter(l => passed(kid, l.id)).length };
}
function titles(kid) { return TREES.filter(t => treeStats(kid, t.id).done >= 4).map(t => t.title); }
function investorRank(kid) { return RANKS[Math.min(4, Math.floor(treeStats(kid, 'invest').done / 2))]; }
const today = () => dkey();
function dayInfo(kid) { const d = prog(kid).day || {}; return d.d === today() ? d : { d: today(), xp: 0, ms: 0, cards: 0 }; }
// Awards XP within today's cap; returns what was actually given.
function award(kid, amount, patch = {}) {
  const day = dayInfo(kid), give = Math.max(0, Math.min(amount, XP.dayCap - day.xp));
  save(kid, { ...patch, xp: (prog(kid).xp || 0) + give, day: { ...day, ...(patch.day || {}), xp: day.xp + give } });
  return give;
}
function minutesToday(kid) { return Math.round(dayInfo(kid).ms / 60000); }
function overTime(kid) { const cap = GSET().cap; return cap > 0 && minutesToday(kid) >= cap; }

/* ---------- Spaced review ---------- */
function dueCards(kid) {
  const t = today(), cards = prog(kid).cards || {};
  return Object.entries(cards).filter(([, c]) => c.due <= t).map(([id, c]) => ({ id, ...c })).sort((a, b) => a.due < b.due ? -1 : 1);
}
function cardItem(cardId) { const [lid, i] = cardId.split('#'), l = lessonById(lid); return l ? { lesson: l, item: l.checks[+i] } : null; }
function skillHist(kid, skill, ok) { if (!skill) return {}; const h = (((prog(kid).skills || {})[skill] || {}).h || []).concat(ok ? 1 : 0).slice(-8); return { skills: { [skill]: { h } } }; }
function skillScore(kid, skill) { const h = ((prog(kid).skills || {})[skill] || {}).h || []; return h.length ? h.reduce((a, b) => a + b, 0) / h.length : null; }

/* ---------- Echo questions: built from the kid's own numbers when something happens ---------- */
const money = c => fmt(Math.round(c));
const ECHO = {
  pay: d => ({ q: `You earned ${money(d.gross)} and paid ${d.rate}% family tax. How much went to the Family Fund?`, opts: shuffle([{ t: money(d.tax), ok: true }, { t: money(d.net), ok: false }, { t: money(d.tax * 2 + 10), ok: false }], mulberry(d.gross | 0)), skill: 'percent' }),
  buyCash: d => ({ q: `The ${d.name.toLowerCase()} cost ${money(d.cost)}. Which of these is its opportunity cost?`, opts: [{ t: `The next best thing ${money(d.cost)} could have done, like saving it`, ok: true }, { t: 'The price on the tag', ok: false }, { t: 'Nothing, because it was mine to spend', ok: false }], skill: 'choices' }),
  sell: d => ({ q: `You sold the ${d.name.toLowerCase()} back for ${money(d.back)}, half of what it cost. Why did it lose value?`, opts: [{ t: 'Used things are usually worth less than new ones', ok: true }, { t: 'The shop made a mistake', ok: false }, { t: 'Money shrinks over time', ok: false }], skill: 'value' }),
  fast3: d => ({ q: `You beat the clock by about ${d.saved} minute${d.saved === 1 ? '' : 's'} on “${d.title}”. What usually makes a job faster without making it worse?`, opts: [{ t: 'Planning the order of the steps first', ok: true }, { t: 'Skipping the hard steps', ok: false }, { t: 'Rushing and hoping', ok: false }], skill: 'planning' }),
  redo: d => ({ q: `A grown-up asked for a redo on “${d.title}”. What would a good worker check before saying done?`, opts: [{ t: 'That every step is finished properly', ok: true }, { t: 'That it looks done from far away', ok: false }, { t: 'That nobody is watching', ok: false }], skill: 'quality' }),
  counter: d => ({ q: `You quoted ${money(d.asked)} and were offered ${money(d.offered)}. What’s a smart thing to say next?`, opts: [{ t: 'Explain the work involved and suggest a price in between', ok: true }, { t: 'Refuse and walk away angry', ok: false }, { t: 'Say yes to anything', ok: false }], skill: 'negotiate' }),
  give: d => ({ q: `You have ${money(d.give)} in your Give jar. Which cause matters most to you right now?`, opts: [{ t: 'Animals', ok: true }, { t: 'People who need food or shelter', ok: true }, { t: 'Nature and the planet', ok: true }, { t: 'Something in my own community', ok: true }], skill: 'giving', any: true }),
  drop: d => ({ q: `${d.fund} fell ${d.pct}% today. What did we learn about wobbles?`, opts: [{ t: 'Prices often bounce back, and selling in a panic locks in the loss', ok: true }, { t: 'Sell everything straight away', ok: false }, { t: 'It means the fund is broken', ok: false }], skill: 'cycles' }),
  basket: d => ({ q: `About ${d.pct}% of your investments are in ${d.fund}. Which move spreads the risk?`, opts: [{ t: 'Put some into a different kind of fund', ok: true }, { t: 'Put even more into the same fund', ok: false }, { t: 'Hide the money under the bed', ok: false }], skill: 'diversify' }),
  vault: d => { const after = Math.round(d.save * Math.pow(1 + d.rate / 100, 4)); return { q: `Your Vault has ${money(d.save)}. At ${d.rate}% a week, about how much after 4 weeks?`, opts: shuffle([{ t: money(after), ok: true }, { t: money(d.save), ok: false }, { t: money(d.save * 4), ok: false }], mulberry(d.save)), skill: 'compound' }; },
  kitchen: d => ({ q: `A recipe for 4 people uses 400 g of pasta. How much for 6 people?`, opts: [{ t: '600 g', ok: true }, { t: '500 g', ok: false }, { t: '800 g', ok: false }], skill: 'scaling' }),
  home: d => ({ q: `You tried the take-home task from “${d.title}”. How did it go?`, opts: [{ t: 'I did it with a grown-up', ok: true }, { t: 'I did it on my own', ok: true }, { t: 'Not yet, but I will', ok: true }], skill: d.skill || '', any: true }),
};
function onEvent(kid, type, data = {}) {
  if (!kid || !ECHO[type]) return;
  if (type === 'pay' && /kitchen/.test(data.theme || '')) onEvent(kid, 'kitchen', data);
  const g = prog(kid), list = (g.echo || []).filter(e => e.type !== type).slice(-4);
  save(kid, { echo: [...list, { id: uid(), type, data, at: Date.now() }] });
  C.track('growth.echo_queued', { type }, kid.id);
}
// Checks the kid's market and jars for echo-worthy moments (run when the card or hub renders).
function scanEchoes(kid) {
  const g = prog(kid), seen = g.echoSeen || {}, t = today(), j = kid.jars || {}, out = [];
  if ((j.give || 0) >= 500 && seen.give !== t && !(g.echo || []).some(e => e.type === 'give')) out.push(['give', { give: j.give }]);
  const holds = Object.entries(kid.holdings || {}).filter(([, h]) => h.units > 0);
  if (holds.length && C.Market.last > 8) {
    let best = null;
    for (const [fid, h] of holds) { const now = C.price(fid), before = C.price(fid, C.Market.last - 8), pct = before ? Math.round((now - before) / before * 1000) / 10 : 0; if (pct <= -3 && (!best || pct < best.pct)) best = { fund: (C.FUNDS.find(f => f.id === fid) || {}).name || fid, pct: Math.abs(pct) }; }
    if (best && seen.drop !== t) out.push(['drop', best]);
    const vals = holds.map(([fid, h]) => [fid, h.units * C.price(fid)]), tot = vals.reduce((a, [, v]) => a + v, 0), top = vals.sort((a, b) => b[1] - a[1])[0];
    if (tot > 0 && holds.length >= 1 && top[1] / tot > 0.8 && seen.basket !== t) out.push(['basket', { fund: (C.FUNDS.find(f => f.id === top[0]) || {}).name || top[0], pct: Math.round(top[1] / tot * 100) }]);
  }
  if ((j.save || 0) >= 200 && seen.vault !== t && Math.random() < 0.2) out.push(['vault', { save: j.save, rate: S().interestWeekly || 2 }]);
  if (out.length) { const s2 = { ...seen }; out.forEach(([k]) => { s2[k] = t; }); const list = (g.echo || []).slice(-4); save(kid, { echoSeen: s2, echo: [...list, ...out.slice(0, 2).map(([type, data]) => ({ id: uid(), type, data, at: Date.now() }))] }); }
}

/* ---------- Money Moments: one a day, fits the kid, no repeats for 90 days, seasonal ---------- */
function inSeason(m, d = new Date()) {
  if (!m.season) return true;
  const [a, b] = local(m.season).split('..'), md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return a <= b ? md >= a && md <= b : md >= a || md <= b;
}
function momentFor(kid) {
  const g = prog(kid), t = today();
  if (g.mom && g.mom.d === t) return Moments.find(m => m.id === g.mom.id) || null;
  const band = bandOf(kid), hist = g.momH || {}, cutoff = addDays(t, -90);
  let pool = Moments.filter(m => m.bands.includes(band) && inSeason(m) && !(hist[m.id] && hist[m.id] > cutoff));
  if (!pool.length) pool = Moments.filter(m => m.bands.includes(band));
  if (!pool.length) return null;
  const seasonal = pool.filter(m => m.season); if (seasonal.length) pool = seasonal.concat(pool);
  const weak = new Set(Object.keys(g.skills || {}).filter(s => skillScore(kid, s) < 0.7)), r = mulberry(hash(kid.id + t));
  const weighted = pool.flatMap(m => (m.tags.some(x => weak.has(x)) ? [m, m] : [m]));
  return weighted[Math.floor(r() * weighted.length)];
}

/* ---------- Weekly market story ---------- */
function weekKey(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return dkey(x); }
function marketStory(kid) {
  if (C.Market.last < 60) return null;
  const moves = C.FUNDS.map(f => { const now = C.price(f.id), then = C.price(f.id, C.Market.last - 56); return { f, pct: then ? (now - then) / then * 100 : 0 }; }).sort((a, b) => b.pct - a.pct);
  const held = new Set(Object.entries(kid.holdings || {}).filter(([, h]) => h.units > 0).map(([id]) => id)), top = moves[0], bottom = moves[moves.length - 1];
  const fmtP = p => { const r = Math.round(p * 10) / 10 || 0; return `${r >= 0 ? '+' : ''}${r.toFixed(1)}%`; };
  return {
    week: weekKey(),
    lines: moves.map(m => `${m.f.icon} ${m.f.name}: ${fmtP(m.pct)}${held.has(m.f.id) ? ' (you own some)' : ''}`),
    item: { type: 'mcq', q: `${bottom.f.name} had the worst week. What’s the patient investor’s move?`, opts: [{ t: 'Hold on and look at the long-term trend', ok: true }, { t: 'Sell it all today', ok: false }, { t: `Move everything into ${top.f.name}`, ok: false }] },
  };
}


/* ---------- Mini-games ----------
   Each mechanic draws into a host element and calls done(result) once, where result is
   { ok, score 0..1, answer, right } and "right" explains the right answer for the feedback strip. */
const GAMES = {};
const rnd = () => Math.random();
const norm = s => String(s).toLowerCase().replace(/[\s$,]/g, '').replace(/[’']/g, "'");
const asNum = s => { const v = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return Number.isFinite(v) ? v : null; };
const sameAnswer = (a, b) => { const x = asNum(a), y = asNum(b); return x != null && y != null && /^[\s$\-0-9.,%c]+$/i.test(String(b)) ? Math.abs(x - y) < 0.001 : norm(a) === norm(b); };
const dollars = v => '$' + (Math.round(v * 100) / 100).toFixed(Math.abs(v - Math.round(v)) < 0.001 ? 0 : 2);
function speakBtn(text) { return GSET().readAloud && 'speechSynthesis' in window ? `<button class="g-say" data-say="${esc(local(text))}" aria-label="Read it out loud">${ic('soundOn')}</button>` : ''; }
function qHead(text) { return `<div class="g-qrow"><h2 class="g-q">${esc(local(text))}</h2>${speakBtn(text)}</div>`; }
function cheer(node, big) {
  const r = node.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#FFE066', '#fff', '#7CF5B5', '#9BD8FF'], big ? 26 : 14);
  Sound.step(Math.floor(Math.random() * 6)); if (Grow.stage) Grow.stage.react('hop');
}
function oops(node) { node.classList.remove('g-wobble'); void node.offsetWidth; node.classList.add('g-wobble'); Sound.tap(); if (Grow.stage) Grow.stage.react('puzzled'); }
const once = fn => { let did = false; return r => { if (did) return; did = true; fn(r); }; };

GAMES.note = (it, host, ctx, done) => { host.innerHTML = `<p class="g-note">${esc(local(it.q))}</p><button class="g-go" data-ok>OK</button>`; host.querySelector('[data-ok]').onclick = () => done({ ok: true, score: 1 }); };

GAMES.mcq = (it, host, ctx, done) => {
  done = once(done);
  const opts = it.keep ? it.opts : shuffle(it.opts, rnd);
  host.innerHTML = `${qHead(it.q)}<div class="g-cards n${opts.length}">${opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div>`;
  host.querySelectorAll('.g-card').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const o = opts[+b.dataset.i], ok = !!(it.any || o.ok);
    host.querySelectorAll('.g-card').forEach((x, i) => { if (opts[i].ok && !it.any) x.classList.add('right'); x.disabled = true; });
    b.classList.add(ok ? 'right' : 'wrong', 'picked'); ok ? cheer(b) : oops(b);
    done({ ok, score: ok ? 1 : 0, answer: o.t, right: it.any ? '' : opts.filter(x => x.ok).map(x => local(x.t)).join(' or ') });
  }; });
};

GAMES.tf = (it, host, ctx, done) => {
  done = once(done);
  host.innerHTML = `${qHead('True or false?')}<div class="g-swipe"><div class="g-swcard" tabindex="0"><span>${esc(local(it.q))}</span><i class="g-sw-l">False</i><i class="g-sw-r">True</i></div></div>
    <div class="g-tfrow"><button class="g-tf no" data-v="0">${ic('x')} False</button><button class="g-tf yes" data-v="1">${ic('check')} True</button></div><p class="g-hint">Swipe the card, or tap a button</p>`;
  const card = host.querySelector('.g-swcard');
  const answer = v => {
    if (host.dataset.locked) return; host.dataset.locked = 1; const ok = v === it.a;
    card.style.transition = 'transform .35s cubic-bezier(.2,.8,.3,1), opacity .35s'; card.style.transform = `translateX(${v ? 140 : -140}%) rotate(${v ? 18 : -18}deg)`; card.style.opacity = '0';
    const btn = host.querySelector(`[data-v="${v ? 1 : 0}"]`); btn.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(btn) : oops(btn);
    host.querySelectorAll('.g-tf').forEach(b => { b.disabled = true; });
    done({ ok, score: ok ? 1 : 0, answer: v ? 'True' : 'False', right: `${it.a ? 'True' : 'False'}${it.why ? '. ' + local(it.why) : ''}` });
  };
  host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => answer(b.dataset.v === '1'); });
  let x0 = null, dx = 0;
  card.onpointerdown = e => { x0 = e.clientX; dx = 0; try { card.setPointerCapture(e.pointerId); } catch (_) {} card.style.transition = 'none'; };
  card.onpointermove = e => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`; card.dataset.lean = dx > 30 ? 'r' : dx < -30 ? 'l' : ''; };
  card.onpointerup = () => { if (x0 == null) return; x0 = null; if (Math.abs(dx) > 90) answer(dx > 0); else { card.style.transition = 'transform .3s'; card.style.transform = ''; card.dataset.lean = ''; } };
  card.onkeydown = e => { if (e.key === 'ArrowRight') answer(true); if (e.key === 'ArrowLeft') answer(false); };
};

GAMES.gap = (it, host, ctx, done) => {
  done = once(done);
  const ans = local(it.a), numeric = !it.opts && asNum(ans) != null && /^[\s$\-0-9.,%c]+$/i.test(ans);
  const q = esc(local(it.q)).replace('_', '<span class="g-blank" data-blank>?</span>');
  host.innerHTML = `<div class="g-qrow"><h2 class="g-q">${q}</h2>${speakBtn(it.q.replace('_', 'blank'))}</div>
    ${it.opts ? `<div class="g-chips">${shuffle(it.opts, rnd).map(o => `<button class="g-chip" data-v="${esc(o)}">${esc(local(o))}</button>`).join('')}</div>`
      : numeric ? `<div class="g-pad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div><button class="g-go" data-ok disabled>Check</button>`
      : `<input class="g-input" type="text" autocomplete="off" autocapitalize="off" placeholder="Type your answer"><button class="g-go" data-ok>Check</button>`}`;
  const blank = host.querySelector('[data-blank]'); let val = '';
  const finish = v => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const ok = sameAnswer(v, ans); blank.textContent = v || '?'; blank.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(blank) : oops(blank);
    host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    done({ ok, score: ok ? 1 : 0, answer: v, right: ans });
  };
  host.querySelectorAll('.g-chip').forEach(b => { b.onclick = () => finish(b.dataset.v); });
  host.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { const k = b.dataset.k; val = k === '⌫' ? val.slice(0, -1) : (val + k).slice(0, 8); blank.textContent = val || '?'; host.querySelector('[data-ok]').disabled = !val; Sound.tap(); }; });
  const inp = host.querySelector('.g-input'); if (inp) { inp.oninput = () => { blank.textContent = inp.value || '?'; }; inp.onkeydown = e => { if (e.key === 'Enter') finish(inp.value.trim()); }; setTimeout(() => inp.focus(), 50); }
  const ok = host.querySelector('[data-ok]'); if (ok) ok.onclick = () => finish(inp ? inp.value.trim() : val);
};

// Tap an item, then tap where it belongs (works the same with a finger, a mouse or a keyboard).
function placer(host, items, bins, render, check) {
  let sel = null; const placed = {};
  const draw = () => {
    host.querySelectorAll('[data-item]').forEach(el => { const i = +el.dataset.item; el.classList.toggle('sel', sel === i); el.classList.toggle('gone', placed[i] != null); });
    host.querySelectorAll('[data-bin]').forEach(el => { const b = el.dataset.bin; el.querySelector('.g-binin').innerHTML = items.map((t, i) => (placed[i] === b ? `<span class="g-mini" data-un="${i}">${esc(local(t))}</span>` : '')).join(''); });
  };
  host.addEventListener('click', e => {
    if (host.dataset.locked) return;
    const it = e.target.closest('[data-item]'), bin = e.target.closest('[data-bin]'), un = e.target.closest('[data-un]');
    if (un) { delete placed[+un.dataset.un]; Sound.tap(); draw(); return; }
    if (it) { sel = +it.dataset.item; Sound.tap(); draw(); return; }
    if (bin && sel != null) { placed[sel] = bin.dataset.bin; sel = null; Sound.pop(); bin.classList.remove('g-land'); void bin.offsetWidth; bin.classList.add('g-land'); draw(); if (Object.keys(placed).length === items.length) setTimeout(() => check(placed), 250); }
  });
  render(); draw();
}

GAMES.sort = (it, host, ctx, done) => {
  done = once(done);
  const items = shuffle(it.items, rnd), jarC = Object.fromEntries((C.JARS || []).map(j => [j.label, j.color]));
  placer(host, items.map(x => x.t), it.bins, () => {
    host.innerHTML = `${qHead(it.q)}<div class="g-tray">${items.map((x, i) => `<button class="g-chip" data-item="${i}">${esc(local(x.t))}</button>`).join('')}</div>
      <div class="g-bins n${it.bins.length} ${it.jars ? 'jars' : ''}">${it.bins.map(b => `<button class="g-bin" data-bin="${esc(b)}" style="--bc:${jarC[b === 'Vault' ? 'Vault' : b] || 'rgba(255,255,255,.22)'}"><b>${esc(local(b))}</b><span class="g-binin"></span></button>`).join('')}</div>`;
  }, placed => {
    host.dataset.locked = 1; let right = 0;
    items.forEach((x, i) => { const ok = placed[i] === x.b; if (ok) right++; const m = host.querySelector(`[data-un="${i}"]`); if (m) m.classList.add(ok ? 'right' : 'wrong'); });
    const score = right / items.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-bins'), true) : oops(host.querySelector('.g-bins'));
    done({ ok, score, answer: placed, right: ok ? '' : items.filter((x, i) => placed[i] !== x.b).map(x => `${local(x.t)} → ${local(x.b)}`).join(', ') });
  });
};

GAMES.order = GAMES.build = (it, host, ctx, done) => {
  done = once(done);
  const order = shuffle(it.steps.map((t, i) => ({ t, i })), rnd), picked = [];
  const draw = () => {
    host.innerHTML = `${qHead(it.q)}<ol class="g-line ${it.type === 'build' ? 'stack' : ''}">${it.steps.map((_, k) => { const p = picked[k]; return `<li class="${p ? 'on' : ''}" ${p ? `data-back="${k}"` : ''}><span class="g-n">${k + 1}</span>${p ? esc(local(p.t)) : ''}</li>`; }).join('')}</ol>
      <div class="g-tray">${order.map((o, j) => (picked.includes(o) ? '' : `<button class="g-chip" data-pick="${j}">${esc(local(o.t))}</button>`)).join('')}</div>`;
    host.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { picked.push(order[+b.dataset.pick]); Sound.pop(); if (picked.length === it.steps.length) return finish(); draw(); }; });
    host.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => { picked.splice(+b.dataset.back); Sound.tap(); draw(); }; });
  };
  const finish = () => {
    draw(); host.dataset.locked = 1; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    let right = 0; host.querySelectorAll('.g-line li').forEach((li, k) => { const ok = picked[k].i === k; if (ok) right++; li.classList.add(ok ? 'right' : 'wrong'); });
    const score = right / it.steps.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-line'), true) : oops(host.querySelector('.g-line'));
    done({ ok, score, answer: picked.map(p => p.t), right: ok ? '' : it.steps.map((s, k) => `${k + 1}. ${local(s)}`).join('  ') });
  };
  draw();
};

GAMES.match = GAMES.route = (it, host, ctx, done) => {
  done = once(done);
  const left = it.pairs.map(p => p[0]), right = shuffle(it.pairs.map(p => p[1]), rnd), made = {}; let selL = null;
  const hues = ['#FFD43B', '#7CF5B5', '#9BD8FF', '#FF9FC6', '#C9A7FF', '#FFB86B'];
  host.innerHTML = `${qHead(it.q)}<div class="g-match ${it.type === 'route' ? 'map' : ''}"><div class="g-col">${left.map((t, i) => `<button class="g-m" data-l="${i}">${esc(local(t))}</button>`).join('')}</div><div class="g-col">${right.map((t, j) => `<button class="g-m" data-r="${j}">${it.type === 'route' ? '📍 ' : ''}${esc(local(t))}</button>`).join('')}</div></div>`;
  const paint = () => {
    host.querySelectorAll('[data-l]').forEach(b => { const i = +b.dataset.l; b.classList.toggle('sel', selL === i); b.style.setProperty('--mc', made[i] != null ? hues[i % hues.length] : ''); b.classList.toggle('done', made[i] != null); });
    host.querySelectorAll('[data-r]').forEach(b => { const j = +b.dataset.r, i = Object.keys(made).find(k => made[k] === j); b.style.setProperty('--mc', i != null ? hues[i % hues.length] : ''); b.classList.toggle('done', i != null); });
  };
  host.addEventListener('click', e => {
    if (host.dataset.locked) return; const l = e.target.closest('[data-l]'), r = e.target.closest('[data-r]');
    if (l) { const i = +l.dataset.l; if (made[i] != null) delete made[i]; selL = i; Sound.tap(); }
    if (r && selL != null) { const j = +r.dataset.r; for (const k of Object.keys(made)) if (made[k] === j) delete made[k]; made[selL] = j; selL = null; Sound.pop(); }
    paint();
    if (Object.keys(made).length === left.length) {
      host.dataset.locked = 1; let ok2 = 0;
      left.forEach((t, i) => { const good = right[made[i]] === it.pairs[i][1]; if (good) ok2++; host.querySelector(`[data-l="${i}"]`).classList.add(good ? 'right' : 'wrong'); });
      const score = ok2 / left.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-match'), true) : oops(host.querySelector('.g-match'));
      done({ ok, score, right: ok ? '' : it.pairs.map(p => `${local(p[0])} → ${local(p[1])}`).join(', ') });
    }
  });
  paint();
};

GAMES.slider = (it, host, ctx, done) => {
  done = once(done);
  const step = it.step || ((it.max - it.min) > 50 ? 1 : (it.max - it.min) > 5 ? 0.5 : 0.1), mid = it.min + Math.round(((it.max - it.min) / 2) / step) * step;
  const show = v => `${it.unit === '$' ? '$' : ''}${(+v).toLocaleString(undefined, { maximumFractionDigits: 2 })}${it.unit && it.unit !== '$' ? ' ' + it.unit : ''}`;
  host.innerHTML = `${qHead(it.q)}<div class="g-slider"><output class="g-out num">${show(mid)}</output><input type="range" min="${it.min}" max="${it.max}" step="${step}" value="${mid}" aria-label="Your estimate"><div class="g-ends"><span>${show(it.min)}</span><span>${show(it.max)}</span></div></div><button class="g-go" data-ok>Lock it in</button>`;
  const r = host.querySelector('input'), out = host.querySelector('output');
  r.oninput = () => { out.textContent = show(r.value); };
  host.querySelector('[data-ok]').onclick = () => {
    const v = +r.value, span = it.max - it.min, tol = it.tol != null ? it.tol : span * 0.1, diff = Math.abs(v - it.a), ok = diff <= tol;
    r.disabled = true; host.querySelector('[data-ok]').disabled = true;
    host.querySelector('.g-slider').insertAdjacentHTML('beforeend', `<i class="g-target" style="left:${((it.a - it.min) / span) * 100}%"></i>`);
    ok ? cheer(out) : oops(out);
    done({ ok, score: Math.max(0, 1 - diff / span * 2), answer: v, right: show(it.a) });
  };
};

GAMES.price = (it, host, ctx, done) => {
  done = once(done);
  const per = p => { const base = /^(g|ml)$/i.test(p.unit) ? 100 : 1; return { v: p.cost / p.qty * base, label: `${dollars(p.cost / p.qty * base)} per ${base === 100 ? '100 ' : ''}${p.unit || 'each'}` }; };
  const best = it.products.reduce((a, p) => (per(p).v < per(a).v ? p : a));
  host.innerHTML = `${qHead(it.q)}<div class="g-shelf">${it.products.map((p, i) => `<button class="g-prod" data-i="${i}"><span class="g-tag">${dollars(p.cost)}</span><b>${esc(local(p.name))}</b><small>${p.qty} ${esc(p.unit)}</small><em class="g-per">${per(p).label}</em></button>`).join('')}</div>`;
  host.querySelectorAll('.g-prod').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const p = it.products[+b.dataset.i], ok = p === best; host.classList.add('reveal');
    host.querySelectorAll('.g-prod').forEach((x, i) => { x.disabled = true; if (it.products[i] === best) x.classList.add('right'); });
    b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b);
    done({ ok, score: ok ? 1 : 0, answer: p.name, right: `${local(best.name)}: ${per(best).label}` });
  }; });
};

GAMES.scam = (it, host, ctx, done) => {
  done = once(done);
  const msgs = shuffle(it.msgs, rnd); let k = 0, right = 0;
  const draw = () => {
    const m = msgs[k];
    host.innerHTML = `${qHead(it.q)}<div class="g-phone"><div class="g-ph-top">Messages · ${k + 1} of ${msgs.length}</div><div class="g-bubble">${esc(local(m.t))}</div></div>
      <div class="g-tfrow"><button class="g-tf yes" data-v="0">${ic('check')} Looks real</button><button class="g-tf no" data-v="1">⚠️ Scam!</button></div>`;
    host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => {
      const said = b.dataset.v === '1', ok = said === m.scam; if (ok) right++;
      b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b); host.querySelectorAll('.g-tf').forEach(x => { x.disabled = true; });
      host.querySelector('.g-bubble').insertAdjacentHTML('beforeend', `<em class="g-verdict ${m.scam ? 'bad' : 'good'}">${m.scam ? 'Scam' : 'Real'}</em>`);
      setTimeout(() => { k++; if (k < msgs.length) draw(); else { const score = right / msgs.length; done({ ok: score >= 0.8, score, right: local(it.why) || `Spotted ${right} of ${msgs.length}` }); } }, 900);
    }; });
  };
  draw();
};

GAMES.path = (it, host, ctx, done) => {
  done = once(done);
  host.innerHTML = `<div class="g-story">${esc(local(it.q))}</div>${qHead('What do you do?')}<div class="g-cards n${it.choices.length} col">${it.choices.map((c, i) => `<button class="g-card" style="--d:${i * 70}ms" data-i="${i}"><span>${esc(local(c.t))}</span></button>`).join('')}</div>`;
  host.querySelectorAll('.g-card').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1; const c = it.choices[+b.dataset.i], score = c.grade === 'good' ? 1 : c.grade === 'ok' ? 0.6 : 0.2;
    host.querySelectorAll('.g-card').forEach(x => { x.disabled = true; }); b.classList.add(c.grade === 'bad' ? 'wrong' : 'right', 'picked'); c.grade === 'bad' ? oops(b) : cheer(b);
    host.insertAdjacentHTML('beforeend', `<div class="g-outcome ${c.grade}"><b>${c.grade === 'good' ? 'Great call.' : c.grade === 'ok' ? 'Not bad.' : 'Hmm, here’s what happened.'}</b> ${esc(local(c.out))}</div>`);
    const best = it.choices.find(x => x.grade === 'good');
    done({ ok: c.grade !== 'bad', score, answer: c.t, right: c.grade === 'good' || !best ? '' : `A stronger choice: ${local(best.t)}` });
  }; });
};

GAMES.debate = (it, host, ctx, done) => {
  done = once(done);
  const args = shuffle(it.args, rnd);
  host.innerHTML = `${qHead(it.q)}<p class="g-sub">Which argument is stronger?</p><div class="g-cards n2 col">${args.map((a, i) => `<button class="g-card debate" style="--d:${i * 80}ms" data-i="${i}"><span>“${esc(local(a.t))}”</span></button>`).join('')}</div>`;
  host.querySelectorAll('.g-card').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1; const a = args[+b.dataset.i], ok = a.ok;
    host.querySelectorAll('.g-card').forEach((x, i) => { x.disabled = true; if (args[i].ok) x.classList.add('right'); }); b.classList.add(ok ? 'right' : 'wrong', 'picked'); ok ? cheer(b) : oops(b);
    if (it.other) host.insertAdjacentHTML('beforeend', `<div class="g-outcome ok"><b>Now argue the other side:</b> ${esc(local(it.other))}</div>`);
    done({ ok, score: ok ? 1 : 0, answer: a.t, right: ok ? '' : `Stronger: “${local(args.find(x => x.ok).t)}”` });
  }; });
};

GAMES.tap = (it, host, ctx, done) => {
  done = once(done);
  const items = shuffle(it.items, rnd), hits = items.filter(x => x.hit).length, chosen = new Set();
  host.innerHTML = `${qHead(it.q)}<div class="g-room">${items.map((x, i) => `<button class="g-thing" style="--d:${i * 40}ms" data-i="${i}" aria-label="${esc(x.e)}">${esc(x.e)}</button>`).join('')}</div><p class="g-hint">Find all ${hits}, then tap Done</p><button class="g-go" data-ok>Done</button>`;
  host.querySelectorAll('.g-thing').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; const i = +b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle('on', chosen.has(i)); Sound.tap(); }; });
  host.querySelector('[data-ok]').onclick = () => {
    host.dataset.locked = 1; let tp = 0, fp = 0;
    items.forEach((x, i) => { const b = host.querySelector(`[data-i="${i}"]`); b.disabled = true; if (x.hit && chosen.has(i)) { tp++; b.classList.add('right'); } else if (x.hit) b.classList.add('missed'); else if (chosen.has(i)) { fp++; b.classList.add('wrong'); } });
    const score = Math.max(0, (tp - fp) / hits), ok = tp === hits && fp === 0; ok ? cheer(host.querySelector('.g-room'), true) : oops(host.querySelector('.g-room'));
    host.querySelector('[data-ok]').disabled = true;
    done({ ok, score, right: items.filter(x => x.hit).map(x => `${x.e} ${local(x.why)}`.trim()).join(' · ') });
  };
};

GAMES.budget = (it, host, ctx, done) => {
  done = once(done);
  const amt = it.cats.map(c => c.min), step = it.income >= 100 ? 5 : 1;
  const draw = () => {
    const used = amt.reduce((a, b) => a + b, 0), left = it.income - used;
    host.innerHTML = `${qHead(it.q)}<div class="g-budget"><div class="g-inc"><span>Money in</span><b class="num">${dollars(it.income)}</b><span>Left to plan</span><b class="num ${left < 0 ? 'neg' : ''}">${dollars(left)}</b></div>
      ${it.cats.map((c, i) => `<div class="g-brow"><span>${esc(local(c.n))}${c.min ? `<small>needs at least ${dollars(c.min)}</small>` : ''}</span><div class="g-step"><button data-i="${i}" data-d="-1" aria-label="Less">${ic('minus')}</button><b class="num">${dollars(amt[i])}</b><button data-i="${i}" data-d="1" aria-label="More">${ic('plus')}</button></div></div>`).join('')}
      <i class="g-bar"><i style="width:${Math.min(100, used / it.income * 100)}%"></i></i></div><button class="g-go" data-ok ${left < 0 ? 'disabled' : ''}>Lock in my budget</button>`;
    host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const i = +b.dataset.i; amt[i] = Math.max(it.cats[i].min, amt[i] + step * +b.dataset.d); Sound.tap(); draw(); }; });
    host.querySelector('[data-ok]').onclick = finish;
  };
  const finish = () => {
    host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const used = amt.reduce((a, b) => a + b, 0), spare = it.income - used, saveIx = it.cats.findIndex(c => /sav|buffer|emergenc|vault/i.test(c.n));
    const cushion = spare + (saveIx >= 0 ? amt[saveIx] : 0);
    let ok = used <= it.income, msg = 'Every dollar has a job. Nice planning.';
    if (it.surprise) { const covered = cushion >= it.surprise.c; ok = ok && covered; msg = covered ? `Surprise! ${local(it.surprise.n)} cost ${dollars(it.surprise.c)}, and your savings covered it.` : `Surprise! ${local(it.surprise.n)} cost ${dollars(it.surprise.c)}. Keeping some money spare or in savings would have covered it.`; }
    host.insertAdjacentHTML('beforeend', `<div class="g-outcome ${ok ? 'good' : 'bad'}">${esc(msg)}</div>`);
    ok ? cheer(host.querySelector('.g-budget'), true) : oops(host.querySelector('.g-budget'));
    done({ ok, score: ok ? 1 : 0.4, answer: amt, right: ok ? '' : 'Plan some savings for surprises' });
  };
  draw();
};

GAMES.market = (it, host, ctx, done) => {
  done = once(done);
  const r = mulberry(hash(it.q)), years = it.years, crash = 3 + Math.floor(r() * (years - 5)); let v = 100; const pts = [v];
  for (let y = 1; y <= years; y++) { v *= y === crash ? 0.68 : y === crash + 1 ? 1.18 : 1 + 0.05 + (r() - 0.45) * 0.14; pts.push(v); }
  const W = 300, H = 140, max = Math.max(...pts) * 1.08, X = i => 10 + i / years * (W - 20), Y = p => H - 10 - p / max * (H - 20);
  host.innerHTML = `${qHead(it.q)}<div class="g-chart"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><polyline class="g-ln" points=""/><circle class="g-dot" r="5"/></svg><div class="g-yr">Year 0 · <b class="num">$100</b></div></div><div class="g-mbtn"></div>`;
  const ln = host.querySelector('.g-ln'), dot = host.querySelector('.g-dot'), lab = host.querySelector('.g-yr'), mb = host.querySelector('.g-mbtn');
  let sold = null;
  const show = y => { ln.setAttribute('points', pts.slice(0, y + 1).map((p, i) => `${X(i)},${Y(p)}`).join(' ')); dot.setAttribute('cx', X(y)); dot.setAttribute('cy', Y(pts[y])); lab.innerHTML = `Year ${y} · <b class="num">${dollars(sold != null && y >= sold ? pts[sold] : pts[y])}</b>${sold != null && y > sold ? ' (sold, in cash)' : ''}`; };
  const run = async from => { for (let y = from; y <= years; y++) { show(y); Sound.tick(y / years); await sleep(reduced ? 60 : 420); if (y === crash && sold == null) return ask(); } end(); };
  const ask = () => {
    mb.innerHTML = `<p class="g-alert">Uh oh! Prices just fell by about a third. Everyone is talking about it.</p><div class="g-tfrow"><button class="g-tf yes" data-h>Hold on</button><button class="g-tf no" data-s>Sell now</button></div>`;
    oops(host.querySelector('.g-chart'));
    mb.querySelector('[data-h]').onclick = () => { mb.innerHTML = ''; run(crash + 1); };
    mb.querySelector('[data-s]').onclick = () => { sold = crash; mb.innerHTML = ''; run(crash + 1); };
  };
  const end = () => {
    const finalV = sold != null ? pts[sold] : pts[years], ok = sold == null;
    mb.innerHTML = `<div class="g-outcome ${ok ? 'good' : 'bad'}">${ok ? `You held on. $100 grew to ${dollars(finalV)} after ${years} years, even with the crash.` : `You sold at ${dollars(pts[sold])}. If you’d held on, it would be ${dollars(pts[years])} now.`}</div>`;
    ok ? cheer(host.querySelector('.g-chart'), true) : oops(host.querySelector('.g-chart'));
    done({ ok, score: ok ? 1 : 0.4, right: ok ? '' : 'Patient investors usually ride out drops' });
  };
  mb.innerHTML = `<button class="g-go" data-go>Start the ${years}-year time-lapse</button>`; mb.querySelector('[data-go]').onclick = () => { mb.innerHTML = ''; run(0); };
  show(0);
};

GAMES.compound = (it, host, ctx, done) => {
  done = once(done);
  const fv = y => it.start * Math.pow(1 + it.rate / 100, y), simple = it.start * (1 + it.rate / 100 * it.years);
  host.innerHTML = `${qHead(it.q)}<div class="g-snow"><div class="g-ball" aria-hidden="true">❄️</div><div class="g-snowtxt">Year <b class="num" data-y>0</b> · <b class="num" data-v>${dollars(it.start)}</b></div><input type="range" min="0" max="${it.years * 2}" value="0" aria-label="Years"></div>`;
  const rr = host.querySelector('input'), ball = host.querySelector('.g-ball');
  rr.oninput = () => { const y = +rr.value; host.querySelector('[data-y]').textContent = y; host.querySelector('[data-v]').textContent = dollars(fv(y)); ball.style.transform = `scale(${0.6 + Math.min(2.2, fv(y) / it.start * 0.4)}) rotate(${y * 40}deg)`; };
  const sub = document.createElement('div'); host.appendChild(sub);
  GAMES.mcq({ type: 'mcq', q: `At ${it.rate}% a year, about how much is ${dollars(it.start)} after ${it.years} years?`, opts: shuffle([{ t: dollars(fv(it.years)), ok: true }, { t: dollars(simple), ok: false }, { t: dollars(it.start + it.rate), ok: false }], rnd) }, sub, ctx, r => done({ ...r, right: r.ok ? '' : `${dollars(fv(it.years))}. Interest earns interest, so it snowballs` }));
};

GAMES.shop = (it, host, ctx, done) => {
  done = once(done);
  let priceC = Math.max(it.cost + 10, Math.round(it.cost * 1.5 / 10) * 10), tries = 0;
  const sold = p => Math.max(0, Math.round(24 - p / 10 * 1.6)), profit = p => sold(p) * (p - it.cost);
  const draw = () => {
    host.innerHTML = `${qHead(it.q)}<div class="g-stall"><div class="g-awning"></div><div class="g-st-in"><span class="g-st-item">${esc(local(it.item))}</span><small>Costs you ${fmt(it.cost)} each to make</small>
      <div class="g-step big"><button data-d="-10" aria-label="Lower price">${ic('minus')}</button><b class="num">${fmt(priceC)}</b><button data-d="10" aria-label="Raise price">${ic('plus')}</button></div></div>
      <div class="g-crowd" aria-hidden="true"></div></div><p class="g-sub">Goal: make at least ${fmt(it.goal)} profit. Too cheap and you earn little each; too dear and nobody buys.</p><button class="g-go" data-open>Open the stall</button>`;
    host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { priceC = Math.max(it.cost, priceC + +b.dataset.d); Sound.tap(); draw(); }; });
    host.querySelector('[data-open]').onclick = open;
  };
  const open = async () => {
    tries++; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const n = sold(priceC), crowd = host.querySelector('.g-crowd'), faces = ['🧒', '👩', '👨', '👵', '🧑', '👧'];
    for (let i = 0; i < Math.min(n, 12); i++) { crowd.insertAdjacentHTML('beforeend', `<span style="--d:${i * 90}ms">${faces[i % faces.length]}</span>`); }
    await sleep(reduced ? 100 : 1300); const p = profit(priceC), ok = p >= it.goal;
    host.insertAdjacentHTML('beforeend', `<div class="g-outcome ${ok ? 'good' : 'bad'}">${n} sold at ${fmt(priceC)}. Takings ${fmt(n * priceC)} − costs ${fmt(n * it.cost)} = <b>${fmt(p)} profit</b>. ${ok ? 'Goal reached!' : tries < 3 ? 'Try a different price.' : ''}</div>`);
    if (ok) { cheer(host.querySelector('.g-stall'), true); done({ ok: true, score: tries === 1 ? 1 : 0.8, answer: priceC }); }
    else if (tries < 3) { oops(host.querySelector('.g-stall')); host.insertAdjacentHTML('beforeend', '<button class="g-go" data-again>Change the price</button>'); host.querySelector('[data-again]').onclick = draw; }
    else { oops(host.querySelector('.g-stall')); const best = [...Array(40)].map((_, i) => it.cost + i * 10).reduce((a, b) => (profit(b) > profit(a) ? b : a)); done({ ok: false, score: 0.3, right: `Around ${fmt(best)} makes the most profit` }); }
  };
  draw();
};

GAMES.timing = (it, host, ctx, done) => {
  done = once(done);
  let tries = 3;
  host.innerHTML = `${qHead(it.q)}<div class="g-timing"><i class="g-zone"><span>${esc(local(it.zone))}</span></i><i class="g-mark"></i></div><button class="g-go big" data-tap>${esc(local(it.label))}</button><p class="g-hint">${tries} tries</p>`;
  const mark = host.querySelector('.g-mark'), zone = host.querySelector('.g-zone'), t0 = performance.now(), speed = 1.4;
  let raf = 0; const pos = () => { const t = (performance.now() - t0) / 1000 * speed; return (Math.sin(t * Math.PI) + 1) / 2; };
  const tick = () => { mark.style.left = pos() * 100 + '%'; raf = requestAnimationFrame(tick); }; tick();
  host.querySelector('[data-tap]').onclick = () => {
    const p = pos(), hit = p > 0.62 && p < 0.8; tries--;
    if (hit) { cancelAnimationFrame(raf); cheer(zone, true); host.querySelector('[data-tap]').disabled = true; done({ ok: true, score: 1 }); }
    else { oops(mark); host.querySelector('.g-hint').textContent = tries ? `${tries} tr${tries === 1 ? 'y' : 'ies'} left` : 'Missed it this time'; if (!tries) { cancelAnimationFrame(raf); host.querySelector('[data-tap]').disabled = true; done({ ok: false, score: 0.3, right: 'Wait for the marker to reach the green zone' }); } }
  };
  ctx.cleanup && ctx.cleanup.push(() => cancelAnimationFrame(raf));
};

GAMES.diff = (it, host, ctx, done) => {
  done = once(done);
  const changed = new Set(it.b.map((l, i) => (l !== it.a[i] ? i : -1)).filter(i => i >= 0)), chosen = new Set();
  host.innerHTML = `${qHead(it.q)}<div class="g-docs"><div class="g-doc"><b>Before</b>${it.a.map(l => `<p>${esc(local(l))}</p>`).join('')}</div><div class="g-doc"><b>After · tap what changed</b>${it.b.map((l, i) => `<button data-i="${i}">${esc(local(l))}</button>`).join('')}</div></div><button class="g-go" data-ok>Done</button>`;
  host.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const i = +b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle('on', chosen.has(i)); Sound.tap(); }; });
  host.querySelector('[data-ok]').onclick = () => {
    let tp = 0, fp = 0; host.querySelectorAll('[data-i]').forEach(b => { const i = +b.dataset.i; b.disabled = true; if (changed.has(i) && chosen.has(i)) { tp++; b.classList.add('right'); } else if (changed.has(i)) b.classList.add('missed'); else if (chosen.has(i)) { fp++; b.classList.add('wrong'); } });
    host.querySelector('[data-ok]').disabled = true; const ok = tp === changed.size && !fp, score = Math.max(0, (tp - fp) / changed.size);
    ok ? cheer(host.querySelector('.g-docs'), true) : oops(host.querySelector('.g-docs'));
    done({ ok, score, right: ok ? '' : [...changed].map(i => local(it.b[i])).join(' · ') });
  };
};

GAMES.chat = (it, host, ctx, done) => {
  done = once(done);
  let k = 0, right = 0, mine = it.turns.filter(t => t.me).length;
  host.innerHTML = `${qHead(it.q)}<div class="g-chat" aria-live="polite"></div><div class="g-replies"></div>`;
  const log = host.querySelector('.g-chat'), rep = host.querySelector('.g-replies');
  const next = async () => {
    while (k < it.turns.length && it.turns[k].them) { log.insertAdjacentHTML('beforeend', `<p class="them">${esc(local(it.turns[k].them))}</p>`); log.scrollTop = 1e6; Sound.pop(); k++; await sleep(reduced ? 50 : 500); }
    if (k >= it.turns.length) return done({ ok: right / Math.max(1, mine) >= 0.66, score: right / Math.max(1, mine) });
    const opts = shuffle(it.turns[k].me, rnd);
    rep.innerHTML = opts.map((o, i) => `<button class="g-chip" data-i="${i}">${esc(local(o.t))}</button>`).join('');
    rep.querySelectorAll('button').forEach(b => { b.onclick = () => { const o = opts[+b.dataset.i]; if (o.ok) right++; rep.innerHTML = ''; log.insertAdjacentHTML('beforeend', `<p class="me ${o.ok ? 'good' : 'meh'}">${esc(local(o.t))}</p>`); o.ok ? cheer(log) : oops(log); k++; setTimeout(next, 450); }; });
  };
  next();
};

GAMES.mystery = (it, host, ctx, done) => {
  done = once(done);
  let shown = 1; const opts = shuffle(it.opts, rnd);
  const draw = () => {
    host.innerHTML = `${qHead('Mystery box')}<div class="g-box">${it.clues.map((c, i) => `<p class="${i < shown ? 'on' : ''}">${i < shown ? `<b>Clue ${i + 1}</b> ${esc(local(c))}` : `🔒 Clue ${i + 1}`}</p>`).join('')}</div>
      <div class="g-chips">${opts.map((o, i) => `<button class="g-chip" data-i="${i}">${esc(local(o.t))}</button>`).join('')}</div>${shown < it.clues.length ? '<button class="g-go ghost" data-more>Show another clue</button>' : ''}`;
    host.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const o = opts[+b.dataset.i]; host.querySelectorAll('button').forEach(x => { x.disabled = true; }); b.classList.add(o.ok ? 'right' : 'wrong'); o.ok ? cheer(b, true) : oops(b); done({ ok: o.ok, score: o.ok ? Math.max(0.6, 1 - (shown - 1) * 0.15) : 0, right: opts.find(x => x.ok).t }); }; });
    const more = host.querySelector('[data-more]'); if (more) more.onclick = () => { shown++; Sound.whoosh(); draw(); };
  };
  draw();
};

GAMES.island = (it, host, ctx, done) => {
  const kid = ctx.kid, isl = kid.island || {}, items = isl.items || [], xpSpent = items.reduce((a, x) => a + (x.xp || 0), 0), cashSpent = items.reduce((a, x) => a + (x.cash || 0), 0);
  let q;
  if (it.kind === 'resale') q = cashSpent ? { type: 'mcq', q: `You spent ${fmt(cashSpent)} of Spend money on island things. If you sold them all back at half price, how much would you get?`, opts: shuffle([{ t: fmt(Math.floor(cashSpent / 2)), ok: true }, { t: fmt(cashSpent), ok: false }, { t: fmt(cashSpent * 2), ok: false }], rnd) }
    : { type: 'mcq', q: 'If you buy something for $8 and sell it back at half price, how much do you get?', opts: shuffle([{ t: '$4', ok: true }, { t: '$8', ok: false }, { t: '$16', ok: false }], rnd) };
  else if (it.kind === 'stand') q = { type: 'mcq', q: `A lemonade stand on your island: each cup costs 30c to make. Which price makes a profit on every cup?`, opts: shuffle([{ t: '50c', ok: true }, { t: '30c', ok: false }, { t: '20c', ok: false }], rnd) };
  else q = { type: 'gap', q: `Count the things on your island (not the house or trees). How many are there? _`, a: String(items.length) };
  if (it.q) q.q = `${local(it.q)} ${q.q}`;
  GAMES[q.type](q, host, ctx, done);
};

// Generated practice with fresh numbers every time, pitched to the kid's band.
const GEN = {
  change: (r, b) => { const cost = [0.5, 1.2, 2.4, 3.75, 6.3][b] * (1 + Math.floor(r() * 4)), paid = cost <= 5 ? 5 : cost <= 10 ? 10 : 20; return { type: 'gap', q: `Something costs ${dollars(cost)}. You pay with a ${dollars(paid)} note. Your change is $_`, a: (paid - cost).toFixed(2).replace(/\.00$/, '') }; },
  add: r => { const coins = [0.1, 0.2, 0.5, 1, 2], a = coins[Math.floor(r() * 5)], c = coins[Math.floor(r() * 5)]; return { type: 'gap', q: `${dollars(a)} + ${dollars(c)} = $_`, a: String(+(a + c).toFixed(2)) }; },
  percent: (r, b) => { const p = [10, 50, 25, 20, 15][Math.floor(r() * (2 + b))], v = [20, 40, 80, 120, 60][Math.floor(r() * 5)]; return { type: 'gap', q: `${p}% of $${v} = $_`, a: String(+(v * p / 100).toFixed(2)) }; },
  round: r => { const v = (Math.floor(r() * 900) + 100) / 100; return { type: 'gap', q: `Round ${dollars(v)} to the nearest dollar: $_`, a: String(Math.round(v)) }; },
  scale: r => { const serves = [2, 4][Math.floor(r() * 2)], want = serves * [2, 3][Math.floor(r() * 2)] / 2 * 2, g = [100, 200, 250][Math.floor(r() * 3)]; return { type: 'gap', q: `A recipe for ${serves} uses ${g} g of flour. For ${want} people you need _ g`, a: String(g * want / serves) }; },
  gst: r => { const nz = GSET().country !== 'au', rate = nz ? 15 : 10, v = [20, 40, 60, 100, 200][Math.floor(r() * 5)]; return { type: 'gap', q: `A price is $${v} before GST. Add ${rate}% GST: $_`, a: String(+(v * (1 + rate / 100)).toFixed(2)) }; },
  time: r => { const start = 8 + Math.floor(r() * 4), mins = [15, 30, 45, 90][Math.floor(r() * 4)], end = start * 60 + mins; return { type: 'gap', q: `A job starts at ${start}:00 and takes ${mins} minutes. It finishes at _ (h:mm)`, a: `${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`, opts: [`${Math.floor(end / 60)}:${String(end % 60).padStart(2, '0')}`, `${start}:${mins % 60 || '00'}`, `${start + 1}:${String((mins + 15) % 60).padStart(2, '0')}`] }; },
  compound: r => { const p = [100, 500, 1000][Math.floor(r() * 3)], rate = [5, 10][Math.floor(r() * 2)]; const v = p * Math.pow(1 + rate / 100, 2); return { type: 'mcq', q: `$${p} earns ${rate}% interest a year. After 2 years it’s about…`, opts: shuffle([{ t: dollars(v), ok: true }, { t: dollars(p + p * rate / 100), ok: false }, { t: dollars(p * 2), ok: false }], r) }; },
  unit: r => { const a = [2, 3, 4][Math.floor(r() * 3)], b = a * 2, pa = (1 + Math.floor(r() * 3)) * 1.5, pb = pa * 2 * (r() < 0.5 ? 0.9 : 1.1); return { type: 'price', q: 'Which is better value?', products: [{ name: 'Small pack', cost: +pa.toFixed(2), qty: a * 100, unit: 'g' }, { name: 'Big pack', cost: +pb.toFixed(2), qty: b * 100, unit: 'g' }] }; },
  split: r => { const pay = [10, 20, 40, 50][Math.floor(r() * 4)], pct = [10, 20, 30, 50][Math.floor(r() * 4)]; return { type: 'gap', q: `You get $${pay} and save ${pct}%. You save $_`, a: String(pay * pct / 100) }; },
};
GAMES.gen = (it, host, ctx, done) => {
  done = once(done);
  const r = mulberry((Date.now() & 0xffff) ^ hash(it.kind)), band = BAND_IX[bandOf(ctx.kid)] || 0, n = it.n || 3; let k = 0, right = 0;
  const step = () => {
    const sub = document.createElement('div'); host.innerHTML = `<p class="g-count">Question ${k + 1} of ${n}</p>`; host.appendChild(sub);
    const q = (GEN[it.kind] || GEN.add)(r, band);
    renderItem(q, sub, ctx, res => { if (res.ok) right++; k++; setTimeout(() => (k < n ? step() : done({ ok: right / n >= 0.66, score: right / n, right: res.ok ? '' : res.right })), res.ok ? 650 : 1500); });
  };
  step();
};

function renderItem(item, host, ctx, done) {
  host.innerHTML = ''; host.removeAttribute('data-locked');
  (GAMES[item.type] || GAMES.note)(item, host, ctx, done);
  host.querySelectorAll('[data-say]').forEach(b => { b.onclick = () => speak(b.dataset.say); });
}
function speak(text) {
  try { const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices(), v = vs.find(x => /en-(NZ|AU)/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang)); if (v) u.voice = v; u.rate = 0.95; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}


/* ---------- The Character Growth screen ----------
   A full-screen overlay above the app: a 3D stage with the kid's guide, and beside or below it the skill
   trees, a tree's path of lessons, or the lesson being played. */
const Grow = { open: false, kidId: null, view: 'hub', tree: null, run: null, stage: null, need: 0, sessionAt: 0, breakShown: false, cleanup: [] };
const BEATS = ['Hook', 'Guess', 'Learn', 'Try', 'Play', 'Check', 'Home'];
const BEAT_OF = { hook: 0, guess: 1, learn: 2, try: 3, play: 4, check: 5, home: 6 };
const kidNow = () => Store.kids[Grow.kidId] || null;
let root = null, ui = null;

function mount() {
  if (root) return;
  root = document.createElement('div'); root.id = 'growth'; root.className = 'gw'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Character Growth');
  root.innerHTML = `<div class="gw-stage"><canvas class="gw-cv" aria-hidden="true"></canvas><div class="gw-say" aria-live="polite"></div></div><div class="gw-ui"></div>`;
  document.body.appendChild(root); ui = root.querySelector('.gw-ui');
  root.addEventListener('click', onClick);
  document.addEventListener('keydown', e => { if (Grow.open && e.key === 'Escape') { e.stopPropagation(); back(); } }, true);
}
function say(text) { const b = root && root.querySelector('.gw-say'); if (!b) return; b.textContent = local(text || ''); b.classList.toggle('on', !!text); }

async function open(kidId, opts = {}) {
  const kid = Store.kids[kidId]; if (!kid) return;
  mount(); Grow.kidId = kidId; Grow.need = opts.need || 0; Grow.view = 'hub'; Grow.tree = opts.tree || null; Grow.run = null;
  root.hidden = false; Grow.open = true; document.body.classList.add('gw-open'); Grow.sessionAt = Date.now(); Grow.breakShown = false;
  Sound.ensure(); Sound.whoosh();
  if (!Grow.stage) { Grow.stage = Stage3D(root.querySelector('.gw-cv')); }
  if (Grow.stage) { Grow.stage.setGuide(prog(kid).guide || 'kea'); Grow.stage.start(); }
  ui.innerHTML = `<div class="gw-loading">${C.sunMark ? C.sunMark(48) : ''}<p>Growing your skill trees…</p></div>`;
  await Promise.all([loadBand(bandOf(kid)), loadExtras()]);
  scanEchoes(kid);
  if (!prog(kid).guide) Grow.view = 'guide';
  else if (Grow.tree) Grow.view = 'tree';
  render();
  C.track('growth.open', { from: opts.need ? 'shop' : opts.tree ? 'tree' : 'card' }, kidId);
}
function close() {
  if (!root) return; Grow.cleanup.splice(0).forEach(f => f()); try { speechSynthesis.cancel(); } catch (e) {}
  root.hidden = true; Grow.open = false; document.body.classList.remove('gw-open'); if (Grow.stage) Grow.stage.stop();
  C.scheduleRender();
}
function back() {
  if (Grow.view === 'lesson' || Grow.view === 'done' || Grow.view === 'case' || Grow.view === 'challenge') { Grow.cleanup.splice(0).forEach(f => f()); Grow.view = Grow.tree ? 'tree' : 'hub'; Grow.run = null; return render(); }
  if (Grow.view !== 'hub' && Grow.view !== 'guide') { Grow.view = 'hub'; Grow.tree = null; return render(); }
  close();
}

/* ---------- What to learn next ---------- */
function treesOn() { const off = GSET().off || {}; return TREES.filter(t => !off[t.id]); }
function available(kid, l) {
  // A lesson opens once the lesson before it in its unit is passed; each unit opens when the unit before is done.
  const pack = packFor(l.tree, l.band), u = pack.units.find(x => x.n === l.unit), i = u.lessons.indexOf(l);
  if (i > 0 && !passed(kid, u.lessons[i - 1].id)) return false;
  const prevU = pack.units.filter(x => x.n < u.n && x.lessons.length).pop();
  return !prevU || prevU.lessons.every(x => passed(kid, x.id));
}
function nextIn(kid, treeId) { const pack = packFor(treeId, bandOf(kid)); if (!pack) return null; for (const u of pack.units) for (const l of u.lessons) if (!passed(kid, l.id) && available(kid, l)) return l; return null; }
function suggestions(kid, n = 3) {
  const g = prog(kid), assigned = (g.assigned || []).map(a => lessonById(a.id)).filter(l => l && !passed(kid, l.id));
  const recent = (g.log || []).slice().reverse().map(x => String(x.id).split('.')[0]);
  const trees = treesOn().map(t => ({ t, next: nextIn(kid, t.id), done: treeStats(kid, t.id).done, recent: recent.indexOf(t.id) })).filter(x => x.next);
  trees.sort((a, b) => (a.recent === -1 ? 99 : a.recent) - (b.recent === -1 ? 99 : b.recent) || a.done - b.done);
  const r = mulberry(hash(kid.id + today())), first = trees.shift(), rest = shuffle(trees, r);
  return [...assigned, ...(first ? [first.next] : []), ...rest.map(x => x.next)].filter((l, i, a) => a.indexOf(l) === i).slice(0, n);
}
function hasLesson(kid) { if (!allLessons(bandOf(kid)).length) { loadBand(bandOf(kid)).then(() => C.scheduleRender()); return true; } return !!suggestions(kid, 1).length; }

/* ---------- Rendering ---------- */
function render() {
  if (!root || !Grow.open) return; const kid = kidNow(); if (!kid) return close();
  Grow.cleanup.splice(0).forEach(f => f());
  const v = Grow.view, tree = Grow.tree && TREE[Grow.tree];
  root.style.setProperty('--gh', (tree || (Grow.run && TREE[Grow.run.lesson ? Grow.run.lesson.tree : Grow.run.tree]) || { hue: '#2F6FE4' }).hue);
  root.dataset.view = v;
  if (Grow.stage) Grow.stage.setScene(v === 'tree' && tree ? tree.scene : Grow.run && Grow.run.lesson ? Grow.run.lesson.scene : Grow.run && Grow.run.scene ? Grow.run.scene : 'island');
  if (v === 'guide') return viewGuide(kid);
  if (v === 'hub') return viewHub(kid);
  if (v === 'tree') return viewTree(kid, tree);
  if (v === 'lesson' || v === 'challenge' || v === 'review' || v === 'moment' || v === 'echo' || v === 'story' || v === 'case') return viewRun(kid);
  if (v === 'done') return viewDone(kid);
  if (v === 'break') return viewBreak(kid);
  if (v === 'crewPick') return viewCrewPick(kid);
  if (v === 'crew') return viewCrew();
}
const topbar = (kid, title, sub) => `<header class="gw-top"><button class="gw-back" data-g="back" aria-label="Back">${ic('back')}<span>${Grow.view === 'hub' ? 'Back to my sky' : 'Back'}</span></button><div class="gw-tt"><b>${esc(title)}</b>${sub ? `<small>${sub}</small>` : ''}</div>${xpRing(kid)}</header>`;
function xpRing(kid) {
  const d = dayInfo(kid), p = Math.min(1, d.xp / XP.dayCap), R = 17, L = 2 * Math.PI * R;
  return `<div class="gw-xp" title="XP from Character Growth today"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${R}" class="t"/><circle cx="22" cy="22" r="${R}" class="b" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}" transform="rotate(-90 22 22)"/></svg><span><b class="num">${d.xp}</b><small>/${XP.dayCap} XP today</small></span></div>`;
}

function viewGuide(kid) {
  say('Hi! Who would you like to learn with?');
  ui.innerHTML = `<div class="gw-pad"><h1 class="gw-h1">Pick your guide</h1><p class="gw-p">Your guide cheers you on, explains new ideas and hops when you get it right.</p>
    <div class="gw-guides">${[['kea', '🦜', 'Kiri the kea', 'A cheeky, clever mountain parrot from Aotearoa'], ['cocky', '🐦', 'Coco the cockatoo', 'A loud, happy cockatoo with a sunshine crest'], ['robot', '🤖', 'Bolt the robot', 'A friendly robot who loves numbers']].map(([k, e, n, d]) => `<button class="gw-guide" data-g="guide" data-k="${k}"><span class="gg-e">${e}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>`;
}

function viewHub(kid) {
  const g = prog(kid), lvl = charLevel(kid), m = mastered(kid), sug = suggestions(kid, 3), due = dueCards(kid).length, echo = (g.echo || []).length;
  const mom = momentFor(kid), momDone = g.mom && g.mom.d === today() && g.mom.done, story = marketStory(kid), storyDone = g.story === weekKey();
  const t = titles(kid), needN = Grow.need ? Math.ceil(Grow.need / XP.lesson) : 0;
  say(Grow.need ? `You need ${Grow.need} more XP. ${needN === 1 ? 'One lesson' : `${needN} lessons`} will do it!` : sug.length ? `Ready, ${kid.name}? Pick what to learn next.` : `You’ve finished every lesson here, ${kid.name}! New ones arrive in updates.`);
  const tile = (g2, ico, title, sub, extra = '') => `<button class="gw-tile" data-g="${g2}" ${extra}><span class="gt-ic">${ico}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
  ui.innerHTML = `${topbar(kid, 'Character Growth', `${esc(kid.name)} · ${BANDS[BAND_IX[bandOf(kid)]].name}, ages ${BANDS[BAND_IX[bandOf(kid)]].ages}`)}
    <div class="gw-pad">
      <section class="gw-me"><div class="gw-lvl"><b class="num">${lvl}</b><small>Level</small></div><div class="gw-me-t"><b>${m} skill${m === 1 ? '' : 's'} mastered</b><small>${t.length ? t.map(esc).join(' · ') : 'Master 4 lessons in a tree to earn its title'}</small>${minutesToday(kid) ? `<small>${minutesToday(kid)} minute${minutesToday(kid) === 1 ? '' : 's'} of learning today</small>` : ''}</div></section>
      ${Grow.need ? `<div class="gw-need">${ic('sparkle')} Each lesson you pass pays ${XP.lesson} XP, up to ${XP.dayCap} XP a day.</div>` : ''}
      ${sug.length ? `<h2 class="gw-h2">Pick your next lesson</h2><div class="gw-pick">${sug.map((l, i) => { const tr = TREE[l.tree], as = (g.assigned || []).find(a => a.id === l.id); return `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tr.hue}" data-g="lesson" data-id="${l.id}"><span class="lc-ic">${esc(l.icon)}</span><span class="lc-t"><small>${esc(tr.name)} · Unit ${l.unit}</small><b>${esc(local(l.title))}</b>${as ? `<em>From a grown-up${as.bonus ? ` · +${as.bonus} XP bonus` : ''}</em>` : ''}</span><span class="lc-go">${ic('play')}</span></button>`; }).join('')}</div>` : ''}
      <div class="gw-tiles">
        ${due ? tile('review', '🔁', `${due} review${due === 1 ? '' : 's'} due`, 'Quick questions so you remember') : ''}
        ${echo ? tile('echo', '💡', `${echo} question${echo === 1 ? '' : 's'} about your week`, `+${XP.echo} XP each`) : ''}
        ${mom ? tile('moment', momDone ? '✅' : '💬', 'Today’s Money Moment', momDone ? 'Done for today' : `30 seconds · +${XP.moment} XP`) : ''}
        ${story && !storyDone ? tile('story', '📰', 'This week in the market', `+${XP.story} XP`) : ''}
        ${C.kidsList().length > 1 ? tile('crewPick', '👯', 'Crew quiz', 'Answer side by side with a sibling') : ''}
      </div>
      <h2 class="gw-h2">Skill trees</h2>
      ${constellation(kid)}
      ${casesFor(kid).length ? `<h2 class="gw-h2">Real stories</h2><div class="gw-cases">${casesFor(kid).slice(0, 12).map(cs => `<button class="gw-case ${(prog(kid).cases || {})[cs.id] ? 'done' : ''}" data-g="case" data-id="${cs.id}" style="--th:${(TREE[cs.tree] || {}).hue || '#2F6FE4'}"><span>${esc(cs.icon)}</span><b>${esc(cs.name)}</b><small>${esc((TREE[cs.tree] || {}).name || '')}</small></button>`).join('')}</div>` : ''}
    </div>`;
}
// The 12 trees as a staggered constellation, 3 across and 4 down, each linked to its neighbours.
function constellation(kid) {
  const on = treesOn(), W = 600, H = 800;
  const pos = on.map((t, i) => { const c = i % 3, r = Math.floor(i / 3); return { t, c, r, x: 100 + c * 200, y: 95 + r * 190 + (c === 1 ? 70 : 0) }; });
  const at = (r, c) => pos.find(p => p.r === r && p.c === c);
  const links = pos.flatMap(p => [at(p.r, p.c + 1), at(p.r + 1, p.c)].filter(Boolean).map(q => `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`)).join('');
  return `<div class="gw-const" style="aspect-ratio:${W}/${H}"><svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="gw-links">${links}</g></svg>
    ${pos.map(({ t, x, y }) => { const st = treeStats(kid, t.id), p = st.total ? st.done / st.total : 0, nx = nextIn(kid, t.id), R = 31, L = 2 * Math.PI * R; return `<button class="gw-star ${nx ? 'open' : ''} ${st.total && st.done === st.total ? 'full' : ''}" style="left:${x / W * 100}%;top:${y / H * 100}%;--th:${t.hue}" data-g="tree" data-id="${t.id}" aria-label="${esc(t.name)}: ${st.done} of ${st.total} lessons"><svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="${R}" class="t"/><circle cx="36" cy="36" r="${R}" class="b" stroke-dasharray="${L.toFixed(1)}" stroke-dashoffset="${(L * (1 - p)).toFixed(1)}" transform="rotate(-90 36 36)"/></svg><span class="gs-ic">${t.icon}</span><span class="gs-n">${esc(t.name)}<small>${st.done}/${st.total}</small></span></button>`; }).join('')}</div>`;
}
function casesFor(kid) {
  const b = BAND_IX[bandOf(kid)], liveOk = GSET().living;
  return Cases.filter(cs => (BAND_IX[cs.band] ?? 1) <= b && (liveOk || !cs.living) && !(GSET().off || {})[cs.tree]);
}

function viewTree(kid, tree) {
  const band = bandOf(kid), pack = packFor(tree.id, band), st = treeStats(kid, tree.id), g = prog(kid);
  const nx = nextIn(kid, tree.id);
  say(nx ? `Next up in ${tree.name}: ${local(nx.title)}.` : st.total ? `You’ve done every ${tree.name} lesson for now!` : 'Lessons for this tree are on their way.');
  const units = pack ? pack.units : [];
  const node = (l, idx) => {
    const done = passed(kid, l.id), open = !done && available(kid, l), md = medal(kid, l), side = idx % 4 === 1 ? 'r' : idx % 4 === 3 ? 'l' : 'c';
    return `<button class="gw-node ${done ? 'done ' + md : open ? 'open' : 'locked'} ${l === nx ? 'next' : ''} s-${side}" data-g="${open || done ? 'lesson' : 'locked'}" data-id="${l.id}" aria-label="${esc(local(l.title))}${done ? `, ${md} medal` : open ? ', ready' : ', locked'}"><span class="gn-ic">${done ? (md === 'gold' ? '🥇' : md === 'silver' ? '🥈' : '🥉') : open ? esc(l.icon) : '🔒'}</span><span class="gn-t">${esc(local(l.title))}</span></button>`;
  };
  ui.innerHTML = `${topbar(kid, tree.name, `${esc(tree.blurb)} · ${st.done} of ${st.total} lessons`)}
    <div class="gw-pad gw-path">
      ${units.map(u => {
        const has = u.lessons.length, allDone = has && u.lessons.every(l => passed(kid, l.id)), uc = (g.units || {})[u.id] || {};
        const stories = u.n === 1 ? casesFor(kid).filter(cs => cs.tree === tree.id) : [];
        return `<section class="gw-unit ${has ? '' : 'soon'}"><header><span class="gu-n">Unit ${u.n}</span><b>${esc(local(u.title))}</b><small>${esc(local(u.goal))}</small></header>
          ${has ? `<div class="gw-nodes">${u.lessons.map(node).join('')}
            <button class="gw-node boss ${uc.best >= 0.8 ? 'done gold' : allDone ? 'open' : 'locked'}" data-g="${allDone ? 'challenge' : 'locked'}" data-id="${u.id}"><span class="gn-ic">${uc.best >= 0.8 ? '👑' : allDone ? '🏆' : '🔒'}</span><span class="gn-t">Unit challenge${allDone ? ` · ${XP.challenge} XP` : ''}</span></button>
            ${stories.map(cs => `<button class="gw-node story ${(g.cases || {})[cs.id] ? 'done' : 'open'}" data-g="case" data-id="${cs.id}"><span class="gn-ic">${esc(cs.icon)}</span><span class="gn-t">Real story: ${esc(cs.name)}</span></button>`).join('')}</div>`
            : `<p class="gw-soon">${ic('sparkle')} Coming in a content update</p>`}</section>`;
      }).join('') || '<p class="gw-p">Lessons for this tree are on their way.</p>'}
    </div>`;
}

/* ---------- Running a lesson, challenge, review, Money Moment, echo, story or case study ---------- */
function startLesson(kid, l, mode = 'lesson') {
  if (overTime(kid)) { Grow.view = 'break'; return render(); }
  const steps = [{ kind: 'hook' }];
  if (l.guess) steps.push({ kind: 'guess', item: l.guess });
  l.learn.forEach(text => steps.push({ kind: 'learn', text }));
  l.tries.forEach(t => steps.push({ kind: 'try', ex: t.ex, item: t.item }));
  if (l.play) steps.push({ kind: 'play', item: l.play });
  l.checks.forEach((item, i) => steps.push({ kind: 'check', item, i }));
  steps.push({ kind: 'home' });
  Grow.run = { mode, kid: kid.id, lesson: l, tree: l.tree, steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'lesson'; Sound.go(); render();
}
function startChallenge(kid, unitId) {
  const [tree, band, un] = unitId.split('.'), u = packFor(tree, band).units.find(x => x.n === +un);
  const pool = shuffle(u.lessons.flatMap(l => l.checks.map((item, i) => ({ item, qid: `${l.id}#${i}`, skill: l.skill }))), Math.random).slice(0, 8);
  Grow.run = { mode: 'challenge', unit: u, tree, scene: TREE[tree].scene, steps: [{ kind: 'intro', text: `Unit challenge: ${local(u.title)}. ${pool.length} mixed questions, no hints. Get 80% to win the crown.` }, ...pool.map((p, i) => ({ kind: 'check', item: p.item, i, qid: p.qid, skill: p.skill }))], k: 0, res: [], t0: Date.now() };
  Grow.view = 'challenge'; Sound.go(); render();
}
function startReview(kid) {
  const day = dayInfo(kid), left = Math.max(1, XP.cardsPerDay - (day.cards || 0)), cards = dueCards(kid).map(c => ({ ...c, ...(cardItem(c.id) || {}) })).filter(c => c.item);
  const mix = interleave(cards).slice(0, Math.min(8, Math.max(3, left)));
  if (!mix.length) { C.toast('No reviews due right now.'); return; }
  Grow.run = { mode: 'review', scene: 'island', steps: mix.map((c, i) => ({ kind: 'check', item: c.item, i, card: c.id, skill: c.lesson.skill, title: c.lesson.title, tree: c.lesson.tree })), k: 0, res: [], t0: Date.now() };
  Grow.view = 'review'; render();
}
function interleave(cards) { const by = {}; cards.forEach(c => { (by[c.lesson.tree] || (by[c.lesson.tree] = [])).push(c); }); const out = [], qs = Object.values(by); while (qs.some(q => q.length)) qs.forEach(q => { if (q.length) out.push(q.shift()); }); return out; }
function startMoment(kid) {
  const m = momentFor(kid); if (!m) return;
  if (!(prog(kid).mom && prog(kid).mom.d === today())) save(kid, { mom: { d: today(), id: m.id } });
  Grow.run = { mode: 'moment', moment: m, scene: 'bank', steps: [{ kind: 'learn', text: m.text, title: 'Money Moment' }, { kind: 'check', item: m.item, i: 0, skill: m.tags[0] || 'money' }], k: 0, res: [], t0: Date.now() };
  Grow.view = 'moment'; render();
}
function startEcho(kid) {
  const list = (prog(kid).echo || []).slice(0, 3); if (!list.length) return;
  Grow.run = { mode: 'echo', scene: 'island', steps: list.map((e, i) => { const q = ECHO[e.type](e.data); return { kind: 'check', item: { type: 'mcq', q: q.q, opts: q.opts, any: q.any, keep: q.any }, i, echo: e.id, skill: q.skill }; }), k: 0, res: [], t0: Date.now() };
  Grow.view = 'echo'; render();
}
function startStory(kid) {
  const s = marketStory(kid); if (!s) return;
  Grow.run = { mode: 'story', scene: 'shares', steps: [{ kind: 'learn', title: 'This week in the market', text: s.lines.join('\n') }, { kind: 'check', item: s.item, i: 0, skill: 'cycles' }], k: 0, res: [], t0: Date.now() };
  Grow.view = 'story'; render();
}
function startCase(kid, id) {
  const cs = Cases.find(x => x.id === id); if (!cs) return;
  const band = bandOf(kid), meet = cs.meet[band] || cs.meet.all || Object.values(cs.meet)[0] || '';
  const steps = [{ kind: 'learn', title: `Meet ${cs.name}`, text: meet }];
  if (cs.decide && cs.opts.length) steps.push({ kind: 'decide', q: cs.decide, opts: cs.opts });
  if (cs.happened) steps.push({ kind: 'learn', title: 'What really happened', text: cs.happened });
  if (cs.skill) steps.push({ kind: 'learn', title: 'The skill to keep', text: cs.skill });
  cs.checks.forEach((item, i) => steps.push({ kind: 'check', item, i }));
  if (cs.turn) steps.push({ kind: 'learn', title: 'Your turn', text: cs.turn });
  Grow.run = { mode: 'case', cs, tree: cs.tree, scene: (TREE[cs.tree] || {}).scene || 'museum', steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'case'; render();
}

function viewRun(kid) {
  const R = Grow.run, step = R.steps[R.k], l = R.lesson, total = R.steps.length;
  const beat = step.kind === 'decide' ? 'Choose' : step.kind === 'intro' ? 'Ready' : R.mode === 'lesson' ? BEATS[BEAT_OF[step.kind]] : step.kind === 'check' ? (R.mode === 'review' ? 'Review' : 'Question') : step.title || 'Read';
  const head = `<header class="gw-run-top"><button class="gw-x" data-g="back" aria-label="Stop">${ic('x')}</button><div class="gw-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${R.k + 1}"><i style="width:${(R.k + 1) / total * 100}%"></i></div><span class="gw-beat">${esc(beat)}</span></header>`;
  const title = l ? `<p class="gw-ltitle">${esc(l.icon)} ${esc(local(l.title))}</p>` : R.mode === 'challenge' ? `<p class="gw-ltitle">🏆 ${esc(local(R.unit.title))}</p>` : R.mode === 'case' ? `<p class="gw-ltitle">${esc(R.cs.icon)} ${esc(R.cs.name)}</p>` : '';
  let body = '';
  if (step.kind === 'hook') { body = `<div class="gw-card hook"><span class="gw-big">${esc(l.icon)}</span><h2>${esc(local(l.title))}</h2><p>${esc(local(l.hook))}</p>${speakBtn(l.hook)}<button class="g-go" data-g="next">Let’s go</button></div>`; say(l.hook); }
  else if (step.kind === 'intro') { body = `<div class="gw-card hook"><span class="gw-big">🏆</span><p>${esc(step.text)}</p><button class="g-go" data-g="next">Start</button></div>`; say('You’ve got this. No hints this time!'); }
  else if (step.kind === 'learn') { body = `<div class="gw-card learn">${step.title ? `<h3>${esc(step.title)}</h3>` : ''}${local(step.text).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}${speakBtn(step.text)}<button class="g-go" data-g="next">Next</button></div>`; say(R.mode === 'lesson' ? ['Here’s the idea.', 'Got it?', 'Nearly there!'][Math.min(2, R.k % 3)] : ''); if (Grow.stage) Grow.stage.react('point'); if (GSET().readAloud && bandOf(kid) === 'sprouts') speak(local(step.text)); }
  else if (step.kind === 'try') { body = `<div class="gw-card try">${step.ex ? `<div class="gw-ex"><b>Worked example</b><p>${esc(local(step.ex))}</p></div><p class="gw-yt">Now you try:</p>` : ''}<div class="gw-host"></div><div class="gw-fb"></div></div>`; say('Your turn to try one.'); }
  else if (step.kind === 'decide') { body = `<div class="gw-card"><h3>Decision point</h3><p class="gw-p2">${esc(local(step.q))}</p><div class="g-cards col n${step.opts.length}">${step.opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-g="decide" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div><div class="gw-fb"></div></div>`; say('What would you do?'); }
  else if (step.kind === 'home') { body = `<div class="gw-card home"><span class="gw-big">🏠</span><h3>Take it home</h3><p>${esc(local(l.home || 'Tell a grown-up one thing you learned today.'))}</p><button class="g-go" data-g="finish">Finish lesson</button></div>`; say('Last bit! Try this at home.'); }
  else { body = `<div class="gw-card"><div class="gw-host"></div><div class="gw-fb"></div></div>`; say(step.kind === 'guess' ? 'Have a guess! It’s fine to get it wrong.' : step.kind === 'play' ? 'Game time!' : R.mode === 'review' ? `From “${local(step.title || '')}”` : ''); }
  ui.innerHTML = `${head}<div class="gw-pad gw-runpad">${title}${body}</div>`;
  const host = ui.querySelector('.gw-host');
  if (host) {
    const ctx = { kid, mode: step.kind, cleanup: Grow.cleanup };
    renderItem(step.item, host, ctx, res => answered(kid, step, res));
  }
}
function answered(kid, step, res) {
  const R = Grow.run; R.res[R.k] = { ...res, kind: step.kind, step };
  const fb = ui.querySelector('.gw-fb'); if (!fb) return;
  const guess = step.kind === 'guess', msg = guess ? (res.ok ? 'Great guess!' : 'Good guess. Let’s find out why.') : res.ok ? ['Nice one!', 'Spot on!', 'You got it!', 'Brilliant!'][Math.floor(Math.random() * 4)] : 'Not quite.';
  fb.innerHTML = `<div class="gw-fbin ${res.ok || guess ? 'good' : 'bad'}"><b>${msg}</b>${!res.ok && res.right && !guess ? `<span>${esc(res.right)}</span>` : ''}</div><button class="g-go" data-g="next">${R.k + 1 >= R.steps.length ? 'Finish' : 'Next'}</button>`;
  if (Grow.stage) Grow.stage.react(res.ok || guess ? 'cheer' : 'puzzled');
  say(res.ok ? msg : guess ? 'Let’s find out!' : 'That’s how we learn. Keep going!');
  if (R.mode === 'review') reviewAnswer(kid, step, res.ok);
  if (R.mode === 'echo') echoAnswer(kid, step, res.ok);
}
function next() {
  const R = Grow.run, kid = kidNow(); if (!R || !kid) return;
  if (Date.now() - Grow.sessionAt > 20 * 60000 && !Grow.breakShown) { Grow.breakShown = true; C.toast('You’ve been learning for 20 minutes. Maybe stretch your legs?'); }
  if (R.k + 1 >= R.steps.length) return finish();
  R.k++; Sound.tap(); render(); ui.scrollTop = 0;
}
function decide(i) {
  const R = Grow.run, step = R.steps[R.k], o = step.opts[i], fb = ui.querySelector('.gw-fb');
  ui.querySelectorAll('[data-g="decide"]').forEach((b, j) => { b.disabled = true; if (j === i) b.classList.add('picked'); });
  fb.innerHTML = `<div class="gw-fbin good"><b>You chose: ${esc(local(o.t))}</b>${o.out ? `<span>${esc(local(o.out))}</span>` : ''}</div><button class="g-go" data-g="next">Next</button>`;
  Sound.pop(); if (Grow.stage) Grow.stage.react('point');
}


/* ---------- Scoring and rewards ---------- */
function reviewAnswer(kid, step, ok) {
  const c = (prog(kid).cards || {})[step.card] || { b: 1 }, b = ok ? Math.min(5, (c.b || 1) + 1) : 1;
  save(kid, { cards: { [step.card]: { b, due: addDays(today(), BOXES[b - 1]) } } });
}
function echoAnswer() {}
function finish() {
  const R = Grow.run, kid = kidNow(); if (!R || !kid) return;
  const ms = Date.now() - R.t0, g = prog(kid), day = dayInfo(kid), l = R.lesson;
  const qidOf = (s, i) => s.qid || s.card || (l ? `${l.id}#${s.i}` : R.mode === 'case' ? `case:${R.cs.id}#${s.i}` : `${R.mode}#${i}`);
  const answers = R.steps.map((s, i) => (s.kind === 'check' && R.res[i] ? { q: qidOf(s, i), ok: !!R.res[i].ok, skill: s.skill || (l && l.skill) || '', text: s.item.q || '' } : null)).filter(Boolean);
  const right = answers.filter(a => a.ok).length, total = answers.length, acc = total ? right / total : 1;
  const playRes = R.res.find((r, i) => r && R.steps[i].kind === 'play'), playScore = playRes ? playRes.score : 1;
  const patch = { day: { ...day, ms: (day.ms || 0) + ms } }, out = { mode: R.mode, right, total, acc };
  let xp = 0;
  // Mastery history per skill and the questions a kid keeps missing (for the grown-ups' "Needs a hand")
  const skills = {}; for (const a of answers) if (a.skill) { const h = (skills[a.skill] ? skills[a.skill].h : ((g.skills || {})[a.skill] || {}).h || []).concat(a.ok ? 1 : 0).slice(-8); skills[a.skill] = { h }; }
  if (Object.keys(skills).length) patch.skills = skills;
  const wrong = {}; answers.filter(a => !a.ok).forEach(a => { wrong[a.q] = { n: (((g.wrong || {})[a.q] || {}).n || 0) + 1, q: a.text, at: Date.now() }; });
  const wkeys = Object.keys(g.wrong || {}).filter(k => (g.wrong[k] || {}).at); if (wkeys.length > 40) wkeys.sort((a, b) => g.wrong[a].at - g.wrong[b].at).slice(0, wkeys.length - 30).forEach(k => { wrong[k] = null; });
  if (Object.keys(wrong).length) patch.wrong = wrong;

  if (R.mode === 'lesson') {
    const prev = (g.done || {})[l.id], was = prev && prev.best >= 0.8, pass = acc >= 0.8, stars = pass ? (acc === 1 && playScore >= 0.8 ? 3 : 2) : 1;
    if (pass && !was) xp = XP.lesson + (acc === 1 ? XP.perfect : 0); else if (pass) xp = XP.replay;
    const as = (g.assigned || []).find(a => a.id === l.id); if (pass && as) { xp += Math.min(XP.assignedMax, as.bonus || 0); patch.assigned = (g.assigned || []).filter(a => a.id !== l.id); }
    patch.done = { [l.id]: { best: Math.max(prev ? prev.best : 0, acc), stars: Math.max(prev ? prev.stars : 0, stars), n: (prev ? prev.n : 0) + 1, at: Date.now() } };
    if (pass && !was) { patch.cards = {}; l.checks.forEach((_, i) => { patch.cards[`${l.id}#${i}`] = { b: 1, due: addDays(today(), 1) }; }); }
    const u = packFor(l.tree, l.band).units.find(x => x.n === l.unit), unitDone = pass && u.lessons.every(x => x === l || passed(kid, x.id));
    if (unitDone && !(g.mile || {})[l.tree]) patch.mile = { [l.tree]: today() };
    Object.assign(out, { pass, stars, first: pass && !was, unitDone, home: l.home, lesson: l });
  } else if (R.mode === 'challenge') {
    const prev = (g.units || {})[R.unit.id] || {}, pass = acc >= 0.8;
    if (pass && !(prev.best >= 0.8)) xp = XP.challenge;
    patch.units = { [R.unit.id]: { best: Math.max(prev.best || 0, acc), at: Date.now() } };
    Object.assign(out, { pass, stars: pass ? (acc === 1 ? 3 : 2) : 1, unit: R.unit });
  } else if (R.mode === 'review') {
    const room = Math.max(0, XP.cardsPerDay - (day.cards || 0)); xp = Math.min(right, room) * XP.card; patch.day.cards = (day.cards || 0) + total;
  } else if (R.mode === 'moment') {
    const first = !(g.mom && g.mom.d === today() && g.mom.done); if (first) xp = XP.moment;
    patch.mom = { d: today(), id: R.moment.id, done: true, ok: right === total }; patch.momH = { [R.moment.id]: today() };
  } else if (R.mode === 'echo') {
    const ids = R.steps.map(s => s.echo); xp = total * XP.echo; patch.echo = (g.echo || []).filter(e => !ids.includes(e.id));
  } else if (R.mode === 'story') {
    if (g.story !== weekKey()) xp = XP.story; patch.story = weekKey();
  } else if (R.mode === 'case') {
    if (!(g.cases || {})[R.cs.id]) xp = XP.caseStudy; patch.cases = { [R.cs.id]: today() };
  }
  const lvl0 = charLevel(kid), titles0 = titles(kid).length, given = Math.max(0, Math.min(xp, XP.dayCap - day.xp));
  const itemId = l ? l.id : R.mode === 'challenge' ? R.unit.id : R.mode === 'case' ? R.cs.id : R.mode === 'moment' ? R.moment.id : R.mode;
  patch.log = [...(g.log || []).slice(-59), { id: itemId, kind: R.mode, c: right, t: total, xp: given, at: Date.now(), ms }];
  award(kid, xp, patch);
  Object.assign(out, { xp: given, capped: given < xp, lvlUp: charLevel(kid) > lvl0 ? charLevel(kid) : 0, newTitle: titles(kid).length > titles0 ? titles(kid).slice(-1)[0] : '' });
  const [tree, band, unit] = String(itemId).split('.');
  C.track('growth.attempt', { kind: R.mode, id: itemId, tree: l ? l.tree : R.tree || null, band: l ? l.band : bandOf(kid), unit: l ? String(l.unit) : R.mode === 'challenge' ? unit : null, correct: right, total, xp: given, ms, answers: answers.map(a => ({ q: a.q, ok: a.ok, skill: a.skill })) }, kid.id);
  Grow.last = out; Grow.view = 'done'; Grow.cleanup.splice(0).forEach(f => f());
  if ((out.pass && (out.stars === 3 || out.unitDone)) || out.lvlUp) { Sound.fanfare(); FX.rain(['#FFE066', '#fff', '#7CF5B5', '#9BD8FF', '#FF9FC6']); if (Grow.stage) Grow.stage.react('cheer'); }
  else if (out.pass || !('pass' in out)) { Sound.coin(); if (Grow.stage) Grow.stage.react('cheer'); }
  render();
}

function viewDone(kid) {
  const o = Grow.last, isScored = 'pass' in o;
  const starRow = isScored ? `<div class="gw-stars">${[1, 2, 3].map(n => `<span class="gw-star3 ${n <= o.stars ? 'on' : ''}" style="--d:${n * 260}ms">${C.STAR_SOCK}${C.starGold('g' + n)}</span>`).join('')}</div>` : '';
  const head = isScored ? (o.pass ? (o.stars === 3 ? 'Perfect!' : 'You passed!') : 'Nearly there!') : { review: 'Reviews done!', moment: 'Moment done!', echo: 'Thanks for thinking it through!', story: 'Market story done!', case: 'Story complete!' }[o.mode] || 'Done!';
  const sub = isScored ? (o.pass ? `${o.right} of ${o.total} right.${o.first ? ' New skill mastered!' : ''}` : `${o.right} of ${o.total} right. You need 80% to master it. Try again: practice is how brains grow.`) : o.total ? `${o.right} of ${o.total} right.` : '';
  const nx = suggestions(kid, 1)[0];
  say(isScored && !o.pass ? 'So close! Want another go?' : o.lvlUp ? `Level ${o.lvlUp}! You’re growing fast.` : 'Great work!');
  ui.innerHTML = `<div class="gw-pad gw-done">${starRow}<h1 class="gw-h1">${head}</h1><p class="gw-p">${sub}</p>
    <div class="gw-xpwin ${o.xp ? '' : 'none'}">${ic('sparkle')} <b class="num">+${o.xp} XP</b>${o.capped ? '<small>You reached today’s XP limit. Learning still counts!</small>' : ''}</div>
    ${o.lvlUp ? `<div class="gw-banner lvl">⬆️ Level ${o.lvlUp}!</div>` : ''}
    ${o.unitDone ? `<div class="gw-banner unit">🏅 Unit complete! A crystal appears on your island, and the unit challenge is open.</div>` : ''}
    ${o.newTitle ? `<div class="gw-banner title">🎖️ New title: ${esc(o.newTitle)}</div>` : ''}
    ${o.home && o.pass ? `<div class="gw-homecard"><b>Take it home</b><p>${esc(local(o.home))}</p><button class="g-go ghost" data-g="homeDone">I’ll try it</button></div>` : ''}
    <div class="gw-actions">${isScored && !o.pass ? `<button class="g-go" data-g="retry">Try again</button>` : nx && o.mode === 'lesson' ? `<button class="g-go" data-g="lesson" data-id="${nx.id}">Next: ${esc(local(nx.title))}</button>` : ''}
      <button class="g-go ghost" data-g="${Grow.tree ? 'toTree' : 'toHub'}">${Grow.tree ? `Back to ${esc(TREE[Grow.tree].name)}` : 'Back to my skill trees'}</button></div></div>`;
}
function viewBreak(kid) {
  say('Brain break time!');
  ui.innerHTML = `${topbar(kid, 'Character Growth')}<div class="gw-pad gw-done"><span class="gw-big">🌙</span><h1 class="gw-h1">That’s your learning time for today</h1><p class="gw-p">You learned for ${minutesToday(kid)} minutes. Your brain files it all away while you rest. Come back tomorrow for more!</p><p class="gw-p small">Money Moments and reviews still work. A grown-up can change the daily time in Grown-ups, Character Growth.</p><button class="g-go" data-g="toHub">Back to my skill trees</button></div>`;
}

/* ---------- Crew quiz: siblings answer side by side, scores add together ---------- */
function crewItems(kid) {
  const band = bandOf(kid), ls = allLessons(band), mine = ls.filter(l => passed(kid, l.id)), from = (mine.length >= 2 ? mine : ls.filter(l => l.unit === 1)).flatMap(l => l.checks).filter(i => ['mcq', 'tf', 'gap'].includes(i.type));
  return shuffle(from, Math.random).slice(0, 5);
}
function viewCrewPick(kid) {
  Grow.crewSel = Grow.crewSel || [kid.id];
  say('Who’s playing?');
  ui.innerHTML = `${topbar(kid, 'Crew quiz', 'Answer side by side. Scores add together')}<div class="gw-pad"><div class="gw-crewkids">${C.kidsList().map(k => `<button class="gw-ck ${Grow.crewSel.includes(k.id) ? 'on' : ''}" data-g="crewKid" data-id="${k.id}" style="--kh:${k.hue}"><span>${k.avatar}</span><b>${esc(k.name)}</b><small>${BANDS[BAND_IX[bandOf(k)]].name}</small></button>`).join('')}</div>
    <button class="g-go" data-g="crewGo" ${Grow.crewSel.length < 2 ? 'disabled' : ''}>Start with ${Grow.crewSel.length} player${Grow.crewSel.length === 1 ? '' : 's'}</button></div>`;
}
async function crewGo() {
  const kids = Grow.crewSel.map(id => Store.kids[id]).filter(Boolean).slice(0, 4);
  await Promise.all(kids.map(k => loadBand(bandOf(k))));
  Grow.crew = kids.map(k => ({ kid: k, items: crewItems(k), k: 0, right: 0 }));
  Grow.view = 'crew'; render();
}
function viewCrew() {
  const team = Grow.crew.reduce((a, p) => a + p.right, 0), all = Grow.crew.every(p => p.k >= p.items.length);
  say(all ? `Team score: ${team}! Nice teamwork.` : 'Go, crew!');
  ui.innerHTML = `<header class="gw-run-top"><button class="gw-x" data-g="toHub" aria-label="Stop">${ic('x')}</button><b class="gw-team">Team score <span class="num">${team}</span></b></header>
    <div class="gw-crew n${Grow.crew.length}">${Grow.crew.map((p, i) => `<section class="gw-pane" style="--kh:${p.kid.hue}"><header><span>${p.kid.avatar} ${esc(p.kid.name)}</span><b class="num">${p.right}</b></header>${p.k >= p.items.length ? `<p class="gw-p">Finished! ${p.right} of ${p.items.length}.</p>` : `<p class="g-count">${p.k + 1} of ${p.items.length}</p><div class="gw-host" data-pane="${i}"></div>`}</section>`).join('')}</div>
    ${all ? `<div class="gw-pad gw-done"><button class="g-go" data-g="crewEnd">Collect XP</button></div>` : ''}`;
  Grow.crew.forEach((p, i) => {
    const host = ui.querySelector(`[data-pane="${i}"]`); if (!host) return;
    renderItem(p.items[p.k], host, { kid: p.kid, mode: 'check', cleanup: Grow.cleanup }, res => { if (res.ok) p.right++; setTimeout(() => { p.k++; render(); }, 900); });
  });
}
function crewEnd() {
  for (const p of Grow.crew) { const day = dayInfo(p.kid); award(p.kid, p.right * XP.card, { log: [...(prog(p.kid).log || []).slice(-59), { id: 'crew', kind: 'review', c: p.right, t: p.items.length, xp: p.right * XP.card, at: Date.now(), ms: 0 }], day: { ...day } }); C.track('growth.attempt', { kind: 'review', id: 'crew-quiz', correct: p.right, total: p.items.length, xp: p.right * XP.card }, p.kid.id); }
  Sound.fanfare(); FX.rain(); Grow.crew = null; Grow.view = 'hub'; render();
}

/* ---------- Clicks inside the Character Growth screen ---------- */
function onClick(e) {
  const a = e.target.closest('[data-g]'); if (!a || a.disabled) return;
  const kid = kidNow(), g = a.dataset.g, id = a.dataset.id;
  switch (g) {
    case 'back': return back();
    case 'guide': save(kid, { guide: a.dataset.k }); if (Grow.stage) Grow.stage.setGuide(a.dataset.k); Sound.pop(); Grow.view = Grow.tree ? 'tree' : 'hub'; return render();
    case 'tree': Grow.tree = id; Grow.view = 'tree'; Sound.tap(); return render();
    case 'lesson': { const l = lessonById(id); if (l) { if (!Grow.tree) Grow.tree = l.tree; startLesson(kid, l); } return; }
    case 'locked': Sound.tap(); return C.toast('Finish the lesson before this one to open it.');
    case 'challenge': return startChallenge(kid, id);
    case 'review': return startReview(kid);
    case 'echo': return startEcho(kid);
    case 'moment': return startMoment(kid);
    case 'story': return startStory(kid);
    case 'case': return startCase(kid, id);
    case 'crewPick': Grow.crewSel = [kid.id]; Grow.view = 'crewPick'; return render();
    case 'crewKid': { const s = Grow.crewSel; const i = s.indexOf(id); if (i >= 0) s.splice(i, 1); else if (s.length < 4) s.push(id); Sound.tap(); return render(); }
    case 'crewGo': return crewGo();
    case 'crewEnd': return crewEnd();
    case 'next': return next();
    case 'decide': return decide(+a.dataset.i);
    case 'finish': return finish();
    case 'retry': { const o = Grow.last; if (o.lesson) startLesson(kid, o.lesson); else if (o.unit) startChallenge(kid, o.unit.id); return; }
    case 'homeDone': a.disabled = true; a.textContent = 'Great! We’ll ask how it went.'; onEvent(kid, 'home', { title: local(Grow.last.lesson.title), skill: Grow.last.lesson.skill }); return;
    case 'toTree': Grow.view = 'tree'; Grow.run = null; return render();
    case 'toHub': Grow.view = 'hub'; Grow.tree = null; Grow.run = null; return render();
  }
}

/* ---------- Pieces the main app shows ---------- */
function ensureLoaded(kid) { const band = bandOf(kid); if (!Packs[`money.${band}`] && !loading[`money.${band}`]) { Promise.all([loadBand(band), loadExtras()]).then(() => C.scheduleRender()); } return !!Packs[`money.${band}`]; }
function card(kid) {
  const ready = ensureLoaded(kid), g = prog(kid), sug = ready ? suggestions(kid, 1)[0] : null, due = ready ? dueCards(kid).length : 0, echo = (g.echo || []).length, d = dayInfo(kid);
  if (ready) scanEchoesSoon(kid);
  const dots = TREES.map((t, i) => { const st = ready ? treeStats(kid, t.id) : { done: 0, total: 0 }, a = -Math.PI / 2 + i / 12 * Math.PI * 2; return `<i style="--th:${t.hue};left:${50 + Math.cos(a) * 38}%;top:${50 + Math.sin(a) * 38}%;--p:${st.total ? st.done / st.total : 0}"></i>`; }).join('');
  return `<section class="card glass cg-card"><header class="card-h"><span class="card-t">Character Growth</span><span class="card-r">Level ${charLevel(kid)}${titles(kid).length ? ` · ${esc(titles(kid)[0])}` : ''}</span></header>
    <button class="cg-main" data-act="gOpen" data-id="${kid.id}"><span class="cg-orbit" aria-hidden="true">${dots}<b class="num">${charLevel(kid)}</b></span>
      <span class="cg-txt"><small>${sug ? `Next · ${esc(TREE[sug.tree].name)}` : ready ? 'All caught up' : 'Loading your skill trees…'}</small><b>${sug ? `${esc(sug.icon)} ${esc(local(sug.title))}` : 'Explore your 12 skill trees'}</b><span class="cg-bar"><i style="width:${Math.min(100, d.xp / XP.dayCap * 100)}%"></i></span><small>${d.xp} of ${XP.dayCap} XP earned from lessons today</small></span></button>
    ${due || echo ? `<div class="cg-chips">${due ? `<button data-act="gOpen" data-id="${kid.id}">🔁 ${due} review${due === 1 ? '' : 's'} due</button>` : ''}${echo ? `<button data-act="gOpen" data-id="${kid.id}">💡 ${echo} question${echo === 1 ? '' : 's'} about your week</button>` : ''}</div>` : ''}
  </section>`;
}
let echoScanAt = {};
function scanEchoesSoon(kid) { const t = Date.now(); if (t - (echoScanAt[kid.id] || 0) < 60000) return; echoScanAt[kid.id] = t; setTimeout(() => scanEchoes(kid), 0); }
function momentCard(kid) {
  ensureLoaded(kid); const m = Moments.length ? momentFor(kid) : null, g = prog(kid), done = g.mom && g.mom.d === today() && g.mom.done;
  if (!m) return '';
  return `<button class="cg-moment ${done ? 'done' : ''}" data-act="gMoment" data-id="${kid.id}"><span>${done ? '✅' : '💬'}</span><span><small>Today’s Money Moment${done ? ' · done' : ` · +${XP.moment} XP`}</small><b>${esc(local(m.text)).slice(0, 110)}${m.text.length > 110 ? '…' : ''}</b></span></button>`;
}
function treeDoor(kid, treeId) {
  ensureLoaded(kid); const t = TREE[treeId], st = treeStats(kid, treeId);
  return `<button class="cg-door" data-act="gOpen" data-id="${kid.id}" data-tree="${treeId}" style="--th:${t.hue}"><span>${t.icon}</span><span><b>${esc(t.name)} skill tree</b><small>${st.done} of ${st.total} lessons · Rank: ${investorRank(kid)}</small></span>${ic('next')}</button>`;
}
C.ACT.gMoment = a => { open(a.dataset.id, {}).then(() => { const k = Store.kids[a.dataset.id]; if (k && momentFor(k)) startMoment(k); }); };

window.Growth = {
  card, momentCard, treeDoor, hasLesson, onEvent, open, close,
  investorRank: kid => `<span class="card-r">Rank: ${investorRank(kid)}</span>`,
  mastered: kid => mastered(kid),
  parentView: () => parentView(), resetParent: () => { if (Grow.parent) Grow.parent.msg = ''; },
  ready: () => C.scheduleRender(),
  _debug: { Packs, TREES, parsePack, parseMoments, parseCases, loadBand, loadExtras, allLessons, lessonById, get Moments() { return Moments; }, get Cases() { return Cases; } },
};


/* ---------- 3D stage: the kid's guide on a little floating island, with props for the lesson's scene ----------
   Same cel look as the islands: toon shading and even ink outlines. The guide reacts with classic animation
   moves: anticipation, squash and stretch, follow-through. */
function Stage3D(canvas) {
  const T = window.THREE, G3 = C.G3; if (!T || !G3 || !G3.ok) return null;
  let R; try { R = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return null; }
  R.setPixelRatio(Math.min(2, devicePixelRatio || 1)); R.setClearColor(0, 0);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x7d95e8, 0.85));
  const sun = new T.DirectionalLight(0xfff3dc, 0.85); sun.position.set(-3, 6, 5); scene.add(sun);
  const MAT = {}, toon = (c, o = {}) => { const k = c + JSON.stringify(o); if (MAT[k]) return MAT[k]; const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD, emissive: o.e || 0 }); G3.rimPatch(m); return (MAT[k] = m); };
  const basic = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op ?? 1 });
  const geo = { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18) };
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(geo[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); g.add(m); return m; };

  // Floating island the guide stands on
  const world = new T.Group(); scene.add(world);
  const isle = new T.Group(); world.add(isle);
  part(isle, 'c', toon(0x58b84a), [0, -0.05, 0], [1.9, 0.18, 1.3]);
  part(isle, 'c', toon(0x8a5a3c), [0, -0.2, 0], [1.85, 0.16, 1.26]);
  part(isle, 'k', toon(0x7a5536), [0, -0.75, 0], [1.75, 1.0, 1.2], [Math.PI, 0, 0]);
  G3.outline(isle);

  // Guides
  function buildGuide(kind) {
    const g = new T.Group(), P = {};
    if (kind === 'robot') {
      P.body = part(g, 'b', toon(0x4a78d4), [0, 0.62, 0], [0.62, 0.66, 0.5]);
      P.head = new T.Group(); P.head.position.set(0, 1.2, 0); g.add(P.head);
      part(P.head, 'b', toon(0x6c96e6), [0, 0.12, 0], [0.56, 0.42, 0.46]);
      P.eyeL = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [-0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
      P.eyeR = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
      part(P.head, 'c', toon(0x9aa3b5), [0, 0.42, 0], [0.02, 0.22, 0.02]);
      P.tip = part(P.head, 's', toon(0xff5a5a, { e: 0x8a1010 }), [0, 0.56, 0], [0.06, 0.06, 0.06]);
      P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, 0); g.add(P.wingL); part(P.wingL, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
      P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, 0); g.add(P.wingR); part(P.wingR, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
      part(g, 'c', toon(0x2c3e66), [-0.16, 0.14, 0], [0.09, 0.28, 0.09]); part(g, 'c', toon(0x2c3e66), [0.16, 0.14, 0], [0.09, 0.28, 0.09]);
    } else {
      const cocky = kind === 'cocky', body = cocky ? 0xe9edf2 : 0x5f7f2c, belly = cocky ? 0xf6f7fa : 0x7f9e3a, wing = cocky ? 0xdfe5ee : 0x4e6c23, under = cocky ? 0xffe06a : 0xe2702a;
      P.body = part(g, 's', toon(body), [0, 0.62, 0], [0.42, 0.52, 0.38]);
      part(g, 's', toon(belly), [0, 0.55, 0.16], [0.3, 0.38, 0.26]);
      P.head = new T.Group(); P.head.position.set(0, 1.18, 0.02); g.add(P.head);
      part(P.head, 's', toon(body), [0, 0, 0], [0.32, 0.3, 0.3]);
      P.eyeL = part(P.head, 's', toon(0x1b1b22), [-0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
      P.eyeR = part(P.head, 's', toon(0x1b1b22), [0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
      part(P.head, 's', basic(0xffffff), [-0.115, 0.075, 0.27], [0.015, 0.015, 0.01]); part(P.head, 's', basic(0xffffff), [0.145, 0.075, 0.27], [0.015, 0.015, 0.01]);
      const beak = part(P.head, 'k', toon(cocky ? 0x3a3a44 : 0x44464f), [0, -0.06, 0.3], [0.08, 0.2, 0.09], [Math.PI * 0.62, 0, 0]);
      if (cocky) for (let i = 0; i < 5; i++) part(P.head, 'k', toon(0xffd23b), [(i - 2) * 0.05, 0.3 + (2 - Math.abs(i - 2)) * 0.05, -0.06 - i * 0.02], [0.05, 0.3, 0.05], [-0.5 - i * 0.12, 0, (i - 2) * -0.25]);
      else part(P.head, 's', toon(0x6e8f30), [0, 0.2, -0.08], [0.12, 0.08, 0.16]);
      P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, -0.02); g.add(P.wingL);
      part(P.wingL, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingL, 's', toon(under), [0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
      P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, -0.02); g.add(P.wingR);
      part(P.wingR, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingR, 's', toon(under), [-0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
      part(g, 'k', toon(wing), [0, 0.35, -0.36], [0.16, 0.5, 0.08], [-1.9, 0, 0]);
      for (const x of [-0.13, 0.13]) part(g, 'c', toon(0x777a85), [x, 0.12, 0.05], [0.035, 0.22, 0.035]);
    }
    beak0 = null; G3.outline(g); g.position.set(0, 0, 0.1); return { g, P };
  }
  let beak0 = null, guide = null, guideKind = '';
  function setGuide(kind) {
    if (kind === guideKind) return; guideKind = kind;
    if (guide) world.remove(guide.g);
    guide = buildGuide(kind); world.add(guide.g);
  }

  // Scene props, a few chunky shapes each
  const PROPS = {
    bank: g => { const d = part(g, 'c', toon(0x8d97ab), [-1.25, 0.62, -0.35], [0.5, 0.12, 0.5], [Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) part(g, 'b', toon(0x5d6578), [-1.25, 0.62, -0.27], [0.06, 0.62, 0.06], [0, 0, i * Math.PI / 4]); for (let i = 0; i < 5; i++) part(g, 'c', toon(0xd9a400), [1.1, 0.06 + i * 0.09, -0.2], [0.22, 0.04, 0.22]); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xd9a400), [1.45, 0.06 + i * 0.09, 0.1], [0.22, 0.04, 0.22]); return d; },
    shares: g => { [[0.35, 0x2fa84f], [0.65, 0x2fa84f], [0.45, 0xd9534f], [0.95, 0x2fa84f]].forEach(([h, c], i) => part(g, 'b', toon(c), [0.8 + i * 0.28, h / 2, -0.35], [0.2, h, 0.2])); part(g, 'k', toon(0xffd23b), [-1.2, 0.9, -0.3], [0.16, 0.3, 0.16], [0, 0, -0.6]); part(g, 'c', toon(0xffd23b), [-1.35, 0.6, -0.3], [0.05, 0.6, 0.05], [0, 0, -0.6]); },
    workshop: g => { part(g, 'b', toon(0xc23a2c), [1.15, 0.2, -0.2], [0.7, 0.36, 0.36]); part(g, 'b', toon(0x9aa3b5), [1.15, 0.43, -0.2], [0.3, 0.06, 0.06]); part(g, 'c', toon(0x9c6b3c), [-1.2, 0.3, -0.1], [0.04, 0.6, 0.04], [0, 0, 0.4]); part(g, 'b', toon(0x6d7486), [-1.32, 0.6, -0.1], [0.28, 0.12, 0.12], [0, 0, 0.4]); },
    stall: g => { part(g, 'b', toon(0x9c6b3c), [1.15, 0.3, -0.3], [0.9, 0.08, 0.5]); for (const x of [0.75, 1.55]) part(g, 'c', toon(0x9c6b3c), [x, 0.15, -0.3], [0.03, 0.3, 0.03]); for (let i = 0; i < 5; i++) part(g, 'b', toon(i % 2 ? 0xffffff : 0xe8473c), [0.75 + i * 0.2, 0.95, -0.42], [0.2, 0.04, 0.6], [0.35, 0, 0]); for (const x of [0.75, 1.55]) part(g, 'c', toon(0x9c6b3c), [x, 0.6, -0.55], [0.03, 0.75, 0.03]); for (let i = 0; i < 4; i++) part(g, 's', toon(0xffd84a), [0.85 + i * 0.18, 0.4, -0.25], [0.08, 0.07, 0.07]); },
    garden: g => { [[-1.2, 0xff6b9d], [-0.9, 0xffd23b], [1.1, 0xc084fc], [1.4, 0xff8a3d]].forEach(([x, c]) => { part(g, 'c', toon(0x3f8f35), [x, 0.18, -0.2], [0.02, 0.36, 0.02]); for (let i = 0; i < 5; i++) part(g, 's', toon(c), [x + Math.cos(i * 1.256) * 0.08, 0.38, -0.2 + Math.sin(i * 1.256) * 0.08], [0.06, 0.03, 0.06]); part(g, 's', toon(0xffe066), [x, 0.4, -0.2], [0.04, 0.04, 0.04]); }); },
    kitchen: g => { part(g, 'b', toon(0xe8dfcf), [1.15, 0.25, -0.3], [0.9, 0.5, 0.45]); part(g, 'b', toon(0x8d97ab), [1.15, 0.51, -0.3], [0.92, 0.04, 0.47]); part(g, 'c', toon(0x3d4357), [1.0, 0.66, -0.3], [0.17, 0.24, 0.17]); part(g, 'c', toon(0xff8a3d), [-1.2, 0.08, -0.1], [0.22, 0.16, 0.22]); },
    stage: g => { part(g, 'c', toon(0x3d4357), [1.15, 0.45, -0.2], [0.025, 0.9, 0.025]); part(g, 's', toon(0x9aa3b5), [1.15, 0.95, -0.2], [0.09, 0.11, 0.09]); part(g, 's', toon(0xffffff), [-1.2, 1.25, -0.4], [0.32, 0.2, 0.06]); part(g, 'k', toon(0xffffff), [-1.05, 1.05, -0.4], [0.07, 0.14, 0.04], [0, 0, 0.5]); },
    museum: g => { for (const x of [-1.45, -0.95]) { part(g, 'c', toon(0xf1ece2), [x, 0.5, -0.45], [0.09, 1.0, 0.09]); part(g, 'b', toon(0xe2dac9), [x, 1.03, -0.45], [0.24, 0.06, 0.24]); } part(g, 'b', toon(0xe2dac9), [1.2, 0.25, -0.2], [0.42, 0.5, 0.42]); part(g, 'c', toon(0xd9a400), [1.2, 0.72, -0.2], [0.2, 0.04, 0.2], [Math.PI / 2, 0, 0]); },
    home: g => { part(g, 'b', toon(0xf4e3c3), [1.2, 0.3, -0.35], [0.66, 0.6, 0.55]); part(g, 'k', toon(0xd9534f), [1.2, 0.82, -0.35], [0.56, 0.44, 0.48], [0, Math.PI / 4, 0]); part(g, 'b', toon(0x8a5a3c), [1.2, 0.18, -0.07], [0.16, 0.36, 0.02]); },
    online: g => { part(g, 'b', toon(0x23283a), [1.2, 0.65, -0.35], [0.56, 1.0, 0.08]); part(g, 'b', toon(0x5ac8fa, { e: 0x1a4a6a }), [1.2, 0.67, -0.3], [0.48, 0.84, 0.02]); part(g, 'b', toon(0xffc93c), [-1.2, 0.3, -0.2], [0.34, 0.28, 0.16]); const s = new T.Mesh(new T.TorusGeometry(0.12, 0.035, 8, 18, Math.PI), toon(0x9aa3b5)); s.position.set(-1.2, 0.44, -0.2); g.add(s); },
    townhall: g => { part(g, 'b', toon(0xf1ece2), [1.2, 0.36, -0.4], [0.9, 0.5, 0.45]); part(g, 'k', toon(0xd9cbb0), [1.2, 0.8, -0.4], [0.66, 0.36, 0.3], [0, Math.PI / 4, 0]); for (let i = 0; i < 4; i++) part(g, 'c', toon(0xffffff), [0.88 + i * 0.21, 0.36, -0.15], [0.04, 0.5, 0.04]); part(g, 'b', toon(0x2f6fe4), [-1.2, 0.2, -0.1], [0.34, 0.4, 0.3]); part(g, 'b', toon(0x1b1b22), [-1.2, 0.41, -0.1], [0.16, 0.02, 0.03]); },
    island: g => { part(g, 'c', toon(0x8a5a3c), [1.25, 0.3, -0.35], [0.06, 0.6, 0.06]); part(g, 's', toon(0x4caf50), [1.25, 0.75, -0.35], [0.36, 0.32, 0.36]); part(g, 's', toon(0x66c05a), [1.05, 0.68, -0.2], [0.22, 0.2, 0.22]); part(g, 's', toon(0xff6b9d), [-1.15, 0.08, -0.05], [0.07, 0.07, 0.07]); },
  };
  let props = null, sceneKey = '';
  function setScene(key) {
    if (key === sceneKey) return; sceneKey = key;
    if (props) world.remove(props);
    props = new T.Group(); (PROPS[key] || PROPS.island)(props); G3.outline(props); world.add(props);
    props.scale.setScalar(0.01); props.userData.pop = performance.now();
  }

  let act = { kind: 'idle', t0: 0 }, raf = 0, last = 0, running = false, blinkAt = 2;
  function react(kind) { act = { kind, t0: performance.now() }; }
  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height;
    // Keep the whole island in frame whatever shape the stage is: narrow stages need the camera further back.
    const a = cam.aspect, z = a < 0.75 ? 11.5 : a < 1.1 ? 9 : a < 1.6 ? 7.4 : 6.4; cam.position.set(0, 1.5, z); cam.lookAt(0, 0.62, 0); cam.updateProjectionMatrix();
  }
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(canvas);
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016), t = now / 1000; last = now;
    world.rotation.y = Math.sin(t * 0.3) * 0.12; world.position.y = Math.sin(t * 0.9) * 0.05;
    if (props) { const k = Math.min(1, (now - props.userData.pop) / 500); props.scale.setScalar(Math.max(0.01, 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2))); }
    if (guide) {
      const P = guide.P, g = guide.g, a = (now - act.t0) / 1000;
      let y = 0, sx = 1, sy = 1, ry = Math.sin(t * 0.7) * 0.25, tilt = 0, wing = Math.sin(t * 2) * 0.08;
      const breathe = 1 + Math.sin(t * 2.4) * 0.02; sy *= breathe; sx /= Math.sqrt(breathe);
      if (act.kind === 'hop' && a < 0.7) { const p = a / 0.7; if (p < 0.2) { sy *= 1 - p * 1.2; sx *= 1 + p; } else { const q = (p - 0.2) / 0.8; y = Math.sin(q * Math.PI) * 0.45; sy *= 1 + Math.sin(q * Math.PI) * 0.12; } wing = -Math.sin(a * 22) * 0.9; }
      else if (act.kind === 'cheer' && a < 1.2) { const p = a / 1.2; y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.4; ry = p * Math.PI * 2; wing = -1.2 + Math.sin(a * 26) * 0.5; }
      else if (act.kind === 'puzzled' && a < 1.0) { tilt = Math.sin(Math.min(1, a * 3) * Math.PI / 2) * 0.35 * (1 - Math.max(0, a - 0.7) / 0.3); ry = Math.sin(a * 9) * 0.15; }
      else if (act.kind === 'point' && a < 0.9) { const p = Math.sin(Math.min(1, a / 0.25) * Math.PI / 2) * (1 - Math.max(0, a - 0.6) / 0.3); P.wingR.rotation.z = 1.6 * p; tilt = -0.1 * p; }
      if (act.kind !== 'point' || a >= 0.9) P.wingR.rotation.z = -wing;
      P.wingL.rotation.z = wing;
      g.position.y = y; g.scale.set(sx, sy, sx); g.rotation.y = ry; P.head.rotation.z = tilt;
      if (t > blinkAt) { const b = (t - blinkAt) / 0.14; const s = b < 1 ? Math.max(0.1, Math.abs(1 - 2 * b)) : 1; P.eyeL.scale.y = P.eyeR.scale.y = (guideKind === 'robot' ? 0.07 : 0.06) * s; if (b >= 1) blinkAt = t + 2 + Math.random() * 3; }
      if (P.tip) P.tip.material.emissive.setHex(Math.sin(t * 4) > 0 ? 0x8a1010 : 0x3a0505);
    }
    G3.inkFor(R); R.render(scene, cam);
  }
  return {
    setGuide, setScene, react,
    start() { if (running) return; running = true; size(); last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
  };
}


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


/* ---------- Styles ---------- */
const CSS = `
body.gw-open{overflow:hidden}
.gw{--gh:#2F6FE4;position:fixed;inset:0;z-index:95;color:#fff;display:grid;grid-template-rows:minmax(150px,32vh) minmax(0,1fr);background:radial-gradient(120% 80% at 50% 0%,color-mix(in srgb,var(--gh) 55%,#7FD3FF),color-mix(in srgb,var(--gh) 70%,#0B1A4A) 70%);transition:background .6s}
.gw[hidden]{display:none}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw{grid-template-rows:minmax(0,1fr);grid-template-columns:minmax(300px,40%) minmax(0,1fr)} }
.gw[data-view=lesson] .gw-stage,.gw[data-view=challenge] .gw-stage,.gw[data-view=review] .gw-stage,.gw[data-view=crew] .gw-stage{min-height:0}
.gw[data-view=crew]{grid-template-rows:0 minmax(0,1fr)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=crew]{grid-template-columns:0 minmax(0,1fr)} }
.gw-stage{position:relative;min-height:0;overflow:hidden}
.gw-cv{position:absolute;inset:0;width:100%;height:100%}
.gw-say{position:absolute;left:50%;top:max(14px,env(safe-area-inset-top,0px));transform:translate(-50%,-6px) scale(.9);max-width:min(86%,420px);padding:10px 16px;border-radius:18px 18px 18px 6px;background:#fff;color:#0D1530;font:800 15px/1.35 var(--f-round);box-shadow:0 10px 24px -12px rgba(0,0,0,.45);opacity:0;transition:opacity .25s,transform .3s cubic-bezier(.2,1.4,.4,1);pointer-events:none;text-align:center}
.gw-say.on{opacity:1;transform:translate(-50%,0) scale(1)}
.gw-ui{position:relative;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 28px)}
.gw-pad{padding:6px var(--gut-r) 24px var(--gut);max-width:880px;margin:0 auto}
.gw-loading{min-height:60%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font:800 16px var(--f-round);opacity:.9;animation:breathe 1.6s ease-in-out infinite}
.gw-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 10px) var(--gut-r) 10px var(--gut);background:linear-gradient(color-mix(in srgb,var(--gh) 55%,#0B1A4A) 70%,transparent)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw-top{padding-top:14px} }
.gw-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px 0 10px;border-radius:999px;background:rgba(255,255,255,.18);font:800 15px var(--f-round)}
.gw-tt{flex:1;min-width:0;display:flex;flex-direction:column}
.gw-tt b{font:900 21px/1.15 var(--f-round)}
.gw-tt small{font:700 13px var(--f-round);opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gw-xp{display:flex;align-items:center;gap:6px}
.gw-xp svg{width:40px;height:40px}
.gw-xp .t{fill:none;stroke:rgba(255,255,255,.22);stroke-width:5}
.gw-xp .b{fill:none;stroke:#FFE066;stroke-width:5;stroke-linecap:round;transition:stroke-dashoffset .6s}
.gw-xp span{display:flex;flex-direction:column;line-height:1.05}
.gw-xp b{font:900 17px var(--f-round)}
.gw-xp small{font:700 11px var(--f-round);opacity:.85}
@media (max-width:560px){ .gw-xp span{display:none} .gw-back span{display:none} .gw-back{padding:0 12px} }
.gw-h1{font:900 clamp(26px,5vw,36px)/1.1 var(--f-round);margin:6px 0 6px;text-shadow:0 2px 14px rgba(0,0,0,.18)}
.gw-h2{font:900 19px var(--f-round);margin:22px 0 10px;letter-spacing:.01em}
.gw-p{font:700 16px/1.45 var(--f-round);opacity:.9}
.gw-p.small{font-size:14px;margin-top:8px}
.gw-me{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:24px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22)}
.gw-lvl{width:62px;height:62px;flex:none;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 35% 30%,#FFF3B0,#FFC93C 60%,#E8961A);color:#4A2A00;box-shadow:0 0 0 3px #fff,0 10px 20px -10px rgba(0,0,0,.5)}
.gw-lvl b{font:900 26px/1 var(--f-round)}
.gw-lvl small{font:900 10px var(--f-round);text-transform:uppercase;letter-spacing:.08em}
.gw-me-t{display:flex;flex-direction:column;gap:2px;min-width:0}
.gw-me-t b{font:900 18px var(--f-round)}
.gw-me-t small{font:700 13px/1.35 var(--f-round);opacity:.88}
.gw-need{margin-top:10px;padding:10px 14px;border-radius:16px;background:rgba(255,230,102,.22);font:800 14px var(--f-round);display:flex;gap:8px;align-items:center}
.gw-pick{display:grid;gap:10px}
.gw-lcard{display:flex;align-items:center;gap:14px;padding:12px 14px;border-radius:22px;background:#fff;color:#0D1530;text-align:left;box-shadow:0 12px 26px -16px rgba(0,0,0,.5);transition:transform .15s;animation:gwIn .4s cubic-bezier(.2,1.2,.4,1) both}
.gw-lcard:active{transform:scale(.98)}
.gw-lcard.main{padding:16px;box-shadow:0 0 0 3px #FFE066,0 16px 30px -14px rgba(0,0,0,.55)}
.lc-ic{width:52px;height:52px;flex:none;border-radius:16px;display:grid;place-items:center;font-size:28px;background:color-mix(in srgb,var(--th) 22%,#fff)}
.gw-lcard.main .lc-ic{width:62px;height:62px;font-size:34px}
.lc-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lc-t small{font:800 12px var(--f-round);color:color-mix(in srgb,var(--th) 70%,#0D1530);text-transform:uppercase;letter-spacing:.06em}
.lc-t b{font:900 18px/1.2 var(--f-round)}
.lc-t em{font:800 12px var(--f-round);font-style:normal;color:#B7791F}
.lc-go{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--th);color:#fff;flex:none}
.gw-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-top:12px}
.gw-tile{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.24);text-align:left;color:#fff}
.gt-ic{width:42px;height:42px;flex:none;border-radius:14px;display:grid;place-items:center;font-size:22px;background:rgba(255,255,255,.2)}
.gw-tile b{display:block;font:900 15px/1.2 var(--f-round)}
.gw-tile small{font:700 12px var(--f-round);opacity:.85}
.gw-const{position:relative;width:100%;max-width:520px;margin:0 auto 24px}
.gw-const svg{position:absolute;inset:0;width:100%;height:100%}
.gw-links line{stroke:rgba(255,255,255,.28);stroke-width:2;stroke-dasharray:4 6}
.gw-links line.hub{stroke:rgba(255,255,255,.14)}
.gw-core{fill:rgba(255,230,102,.2);stroke:rgba(255,230,102,.6);stroke-width:2}
.gw-core-l{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;pointer-events:none}
.gw-core-l b{font:900 30px/1 var(--f-round);color:#FFE066}
.gw-core-l small{font:900 11px var(--f-round);text-transform:uppercase;letter-spacing:.08em;opacity:.85}
.gw-star{position:absolute;width:min(19%,96px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,var(--th) 45%,#fff),var(--th));box-shadow:0 10px 22px -10px rgba(0,0,0,.6),inset 0 -6px 10px rgba(0,0,0,.18);transition:transform .2s}
.gw-star:active{transform:translate(-50%,-50%) scale(.94)}
.gw-star.open{animation:starPulse 2.4s ease-in-out infinite}
@keyframes starPulse{50%{box-shadow:0 0 0 8px color-mix(in srgb,var(--th) 30%,transparent),0 10px 22px -10px rgba(0,0,0,.6)}}
.gw-star svg{position:absolute;inset:-12%;width:124%;height:124%}
.gw-star .t{fill:none;stroke:rgba(255,255,255,.25);stroke-width:5}
.gw-star .b{fill:none;stroke:#FFE066;stroke-width:5;stroke-linecap:round}
.gs-ic{font-size:clamp(20px,4.6vw,34px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.25))}
.gs-n{position:absolute;top:104%;left:50%;transform:translateX(-50%);width:max-content;max-width:120px;text-align:center;font:900 12px/1.15 var(--f-round);text-shadow:0 1px 6px rgba(0,0,0,.4)}
.gs-n small{display:block;font:800 11px var(--f-round);opacity:.85}
.gw-cases{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.gw-case{flex:none;width:130px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px;border-radius:18px;background:#fff;color:#0D1530;text-align:left;box-shadow:inset 0 -4px 0 var(--th)}
.gw-case span{font-size:28px}
.gw-case b{font:900 14px/1.2 var(--f-round)}
.gw-case small{font:700 11px var(--f-round);color:#5A6380}
.gw-case.done{opacity:.7}
.gw-guides{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-top:16px}
.gw-guide{display:flex;flex-direction:column;align-items:center;gap:6px;padding:18px 14px;border-radius:24px;background:#fff;color:#0D1530;text-align:center;box-shadow:0 14px 28px -16px rgba(0,0,0,.5)}
.gg-e{font-size:54px;animation:gwBob 3s ease-in-out infinite}
.gw-guide b{font:900 18px var(--f-round)}
.gw-guide small{font:700 13px/1.35 var(--f-round);color:#5A6380}
@keyframes gwBob{50%{transform:translateY(-5px) rotate(-4deg)}}
@keyframes gwIn{from{opacity:0;transform:translateY(12px) scale(.97)}}
.gw-path{display:flex;flex-direction:column;gap:16px}
.gw-unit{padding:14px;border-radius:24px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2)}
.gw-unit header{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}
.gu-n{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.08em;color:#FFE066}
.gw-unit header b{font:900 20px var(--f-round)}
.gw-unit header small{font:700 14px/1.35 var(--f-round);opacity:.85}
.gw-unit.soon{opacity:.6}
.gw-soon{display:flex;align-items:center;gap:8px;font:800 14px var(--f-round);opacity:.85}
.gw-nodes{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative}
.gw-node{position:relative;display:flex;align-items:center;gap:12px;width:min(100%,380px);padding:8px 14px 8px 8px;border-radius:999px;background:rgba(255,255,255,.12);text-align:left;color:#fff;transition:transform .15s}
.gw-node.s-r{transform:translateX(18%)}
.gw-node.s-l{transform:translateX(-18%)}
@media (max-width:560px){ .gw-node.s-r{transform:translateX(8%)} .gw-node.s-l{transform:translateX(-8%)} }
.gn-ic{width:52px;height:52px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:26px;background:rgba(255,255,255,.2);box-shadow:inset 0 -5px 0 rgba(0,0,0,.15)}
.gn-t{font:900 15px/1.2 var(--f-round)}
.gw-node.open{background:#fff;color:#0D1530}
.gw-node.open .gn-ic{background:var(--gh);box-shadow:inset 0 -5px 0 rgba(0,0,0,.18)}
.gw-node.next{box-shadow:0 0 0 3px #FFE066;animation:nodeHop 1.8s ease-in-out infinite}
@keyframes nodeHop{50%{translate:0 -4px}}
.gw-node.done .gn-ic{background:#fff}
.gw-node.done.gold .gn-ic{background:radial-gradient(circle,#FFF3B0,#FFC93C)}
.gw-node.locked{opacity:.55}
.gw-node.boss .gn-ic{border-radius:18px}
.gw-node.story .gn-ic{border-radius:14px;background:rgba(255,255,255,.3)}
.gw-run-top{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:12px;padding:calc(env(safe-area-inset-top,0px) + 10px) var(--gut-r) 10px var(--gut)}
.gw-x{width:44px;height:44px;flex:none;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.18)}
.gw-prog{flex:1;height:12px;border-radius:6px;background:rgba(0,0,0,.2);overflow:hidden}
.gw-prog i{display:block;height:100%;border-radius:6px;background:linear-gradient(180deg,#FFF3B0 0 45%,#FFC93C 45%);transition:width .4s cubic-bezier(.2,.9,.3,1)}
.gw-beat{font:900 13px var(--f-round);text-transform:uppercase;letter-spacing:.08em;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.2)}
.gw-team{flex:1;font:900 18px var(--f-round);text-align:center}
.gw-runpad{padding-top:0}
.gw-ltitle{font:900 14px var(--f-round);opacity:.9;margin-bottom:8px}
.gw-card{position:relative;padding:18px;border-radius:26px;background:#fff;color:#0D1530;box-shadow:0 20px 40px -24px rgba(0,0,0,.55);animation:gwIn .35s cubic-bezier(.2,1.2,.4,1) both}
.gw-card.hook,.gw-card.home{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
.gw-card h2{font:900 24px/1.2 var(--f-round)}
.gw-card h3{font:900 18px var(--f-round);color:color-mix(in srgb,var(--gh) 70%,#0D1530);margin-bottom:6px}
.gw-card p{font:700 18px/1.5 var(--f-round)}
.gw-card.learn p+p{margin-top:8px}
.gw-card .g-go{margin-top:14px}
.gw-big{font-size:64px;line-height:1;animation:gwBob 3s ease-in-out infinite}
.gw-ex{padding:12px 14px;border-radius:16px;background:color-mix(in srgb,var(--gh) 10%,#fff);border:2px dashed color-mix(in srgb,var(--gh) 40%,#fff)}
.gw-ex b{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:color-mix(in srgb,var(--gh) 70%,#0D1530)}
.gw-ex p{font-size:16px!important}
.gw-yt{font:900 15px var(--f-round)!important;margin:12px 0 4px}
.gw-p2{font:800 17px/1.45 var(--f-round);margin-bottom:12px}
.gw-fb:empty{display:none}
.gw-fb{margin-top:14px;display:flex;flex-direction:column;gap:10px;animation:gwIn .3s both}
.gw-fbin{padding:12px 14px;border-radius:16px;font:700 15px/1.4 var(--f-round);display:flex;flex-direction:column;gap:2px}
.gw-fbin b{font:900 17px var(--f-round)}
.gw-fbin.good{background:#E3F9EA;color:#14532D}
.gw-fbin.bad{background:#FFF1E6;color:#7A3B00}
.gw-done{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:12px}
.gw-stars{display:flex;align-items:flex-end;gap:8px;margin-top:8px}
.gw-star3{position:relative;width:76px;height:76px}
.gw-star3:nth-child(2){width:96px;height:96px;transform:translateY(-10px)}
.gw-star3 svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.gw-star3 .rs-sock path{fill:rgba(0,0,0,.22);stroke:rgba(255,255,255,.55);stroke-width:6;stroke-linejoin:round}
.gw-star3 .rs-gold{opacity:0}
.gw-star3 .rs-gold .rs-body{stroke:#2B2238;stroke-width:10;stroke-linejoin:round;paint-order:stroke}
.gw-star3.on .rs-gold{animation:gwSlam .65s var(--d) cubic-bezier(.3,.7,.4,1) both}
@keyframes gwSlam{0%{opacity:0;transform:scale(2.4) rotate(-120deg)}42%{opacity:1;transform:scale(1) rotate(0)}60%{transform:scale(1.18)}80%{transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
.gw-xpwin{display:inline-flex;flex-direction:column;align-items:center;gap:2px;padding:10px 20px;border-radius:20px;background:rgba(255,230,102,.25);font:900 22px var(--f-round)}
.gw-xpwin.none{display:none}
.gw-xpwin small{font:700 13px var(--f-round);opacity:.9}
.gw-banner{padding:10px 16px;border-radius:16px;background:rgba(255,255,255,.2);font:900 16px var(--f-round);animation:gwIn .4s .3s both}
.gw-homecard{width:min(100%,460px);padding:14px 16px;border-radius:20px;background:#fff;color:#0D1530;text-align:left}
.gw-homecard b{font:900 13px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:#B7791F}
.gw-homecard p{font:700 16px/1.45 var(--f-round);margin:4px 0 6px}
.gw-actions{display:flex;flex-direction:column;gap:10px;width:min(100%,460px);margin-top:8px}
.gw-crewkids{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:8px 0 16px}
.gw-ck{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px;border-radius:20px;background:rgba(255,255,255,.14);border:2px solid transparent}
.gw-ck span{font-size:40px}
.gw-ck b{font:900 16px var(--f-round)}
.gw-ck small{font:700 12px var(--f-round);opacity:.85}
.gw-ck.on{background:#fff;color:#0D1530;border-color:var(--kh)}
.gw-crew{display:grid;gap:10px;padding:0 10px 10px;height:calc(100% - 70px)}
.gw-crew.n2{grid-template-columns:1fr 1fr}.gw-crew.n3{grid-template-columns:repeat(3,1fr)}.gw-crew.n4{grid-template-columns:1fr 1fr}
@media (max-width:700px){ .gw-crew.n2,.gw-crew.n3,.gw-crew.n4{grid-template-columns:1fr} }
.gw-pane{min-height:0;overflow:auto;padding:12px;border-radius:24px;background:linear-gradient(160deg,color-mix(in srgb,var(--kh) 40%,#fff 0%),color-mix(in srgb,var(--kh) 85%,#0B1A4A));}
.gw-pane header{display:flex;justify-content:space-between;align-items:center;font:900 17px var(--f-round);margin-bottom:6px}
.gw-pane header b{font:900 26px var(--f-round)}
.gw-pane .gw-host{background:#fff;color:#0D1530;border-radius:20px;padding:12px}
.cg-card{overflow:hidden}
.cg-main{display:flex;align-items:center;gap:14px;width:100%;text-align:left;color:inherit;padding:2px 0}
.cg-orbit{position:relative;width:86px;height:86px;flex:none;border-radius:50%;background:radial-gradient(circle,rgba(255,230,102,.32),rgba(255,255,255,.06) 70%);display:grid;place-items:center}
.cg-orbit i{position:absolute;width:13px;height:13px;margin:-6.5px;border-radius:50%;background:color-mix(in srgb,var(--th) calc(35% + var(--p) * 65%),rgba(255,255,255,.25));box-shadow:0 0 calc(var(--p) * 10px) var(--th)}
.cg-orbit b{font:900 26px var(--f-round);color:#FFE066;text-shadow:0 1px 8px rgba(0,0,0,.25)}
.cg-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.cg-txt small{font:800 12px var(--f-round);color:var(--on-sky-2);text-transform:uppercase;letter-spacing:.05em}
.cg-txt b{font:900 19px/1.2 var(--f-round)}
.cg-bar{display:block;height:8px;border-radius:4px;background:rgba(255,255,255,.2);overflow:hidden;margin-top:2px}
.cg-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#FFE066,#FFB020)}
.cg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cg-chips button{min-height:34px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.2);font:800 13px var(--f-round)}
.cg-moment{display:flex;align-items:center;gap:12px;width:100%;margin:2px 0 12px;padding:12px;border-radius:18px;background:rgba(255,255,255,.18);text-align:left}
.cg-moment>span:first-child{font-size:26px}
.cg-moment small{display:block;font:800 12px var(--f-round);color:var(--on-sky-2);text-transform:uppercase;letter-spacing:.05em}
.cg-moment b{font:800 15px/1.35 var(--f-round)}
.cg-moment.done{opacity:.75}
.cg-door{display:flex;align-items:center;gap:12px;width:100%;margin-bottom:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.18);text-align:left}
.cg-door>span:first-child{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:var(--th)}
.cg-door>span:nth-child(2){flex:1;min-width:0}
.cg-door b{display:block;font:900 16px var(--f-round)}
.cg-door small{font:700 13px var(--f-round);color:var(--on-sky-2)}
.pg-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:12px 0 4px}
.pg-stat{padding:14px;border-radius:18px;background:var(--cell)}
.pg-stat b{display:block;font:800 28px/1.1 var(--f-round)}
.pg-stat span{font:500 13px var(--f-text);color:var(--ink-2)}
.pg-stat.hl{background:linear-gradient(135deg,#7C5CFF,#C084FC);color:#fff}
.pg-stat.hl span{color:rgba(255,255,255,.9)}
.pg-ti{width:36px;height:36px;flex:none;border-radius:10px;display:grid;place-items:center;font-size:19px;background:color-mix(in srgb,var(--th) 22%,var(--cell))}
.pg-map .row-main{flex:0 1 220px}
.pg-units{flex:1 1 220px;display:flex;flex-wrap:wrap;gap:6px;justify-content:flex-end}
.pg-u{display:inline-flex;gap:2px;padding:3px 5px;border-radius:8px;background:var(--fill)}
.pg-dot{width:10px;height:10px;border-radius:50%;background:var(--fill-2)}
.pg-dot.tried{background:#F5A623}
.pg-dot.bronze{background:#C98A3E}
.pg-dot.silver{background:#9AA3B5}
.pg-dot.gold{background:#FFC93C;box-shadow:0 0 0 2px rgba(255,201,60,.35)}
.pg-dot.soon{background:transparent;border:1px dashed var(--fill-2)}
.pg-two{display:grid;grid-template-columns:minmax(0,1fr);gap:0 16px}
@media (min-width:1000px){ .pg-two{grid-template-columns:repeat(2,minmax(0,1fr))} }
/* mini-games */
.g-qrow{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px}
.g-q{flex:1;font:900 21px/1.3 var(--f-round)}
.g-say{width:40px;height:40px;flex:none;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--gh) 14%,#fff);color:color-mix(in srgb,var(--gh) 75%,#0D1530)}
.g-sub{font:800 15px var(--f-round);color:#5A6380;margin:-4px 0 10px}
.g-go{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:54px;width:100%;padding:0 22px;border-radius:18px;background:var(--gh);color:#fff;font:900 18px var(--f-round);box-shadow:0 6px 0 color-mix(in srgb,var(--gh) 70%,#000),0 14px 24px -14px rgba(0,0,0,.5);transition:transform .1s,box-shadow .1s}
.gw .g-go{background:var(--gh)}
.gw-done .g-go,.gw-pad>.g-go{background:#fff;color:#0D1530;box-shadow:0 6px 0 rgba(0,0,0,.18)}
.g-go:active{transform:translateY(4px);box-shadow:0 2px 0 color-mix(in srgb,var(--gh) 70%,#000)}
.g-go:disabled{opacity:.45}
.g-go.ghost{background:transparent!important;color:inherit!important;box-shadow:inset 0 0 0 2px currentColor!important}
.gw-card .g-go.ghost{color:color-mix(in srgb,var(--gh) 70%,#0D1530)!important}
.g-go.big{min-height:70px;font-size:22px}
.g-note{font:700 17px/1.5 var(--f-round);margin-bottom:12px}
.g-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;perspective:900px}
.g-cards.n3,.g-cards.col{grid-template-columns:minmax(0,1fr)}
.g-card{min-height:64px;padding:12px 16px;border-radius:18px;background:#F2F4FA;color:#0D1530;font:800 17px/1.3 var(--f-round);text-align:left;box-shadow:inset 0 -4px 0 rgba(13,21,48,.08);animation:cardIn .45s var(--d,0ms) cubic-bezier(.2,1.2,.4,1) both;transform-origin:50% 100%;transition:background .2s,box-shadow .2s,transform .15s}
@keyframes cardIn{from{opacity:0;transform:rotateX(-70deg) translateY(10px)}}
.g-card:active{transform:scale(.97)}
.g-card.right{background:#DDF8E6;box-shadow:inset 0 0 0 3px #30C25A;animation:cardFlip .5s both}
.g-card.wrong{background:#FFE9E3;box-shadow:inset 0 0 0 3px #FF8A65}
.g-card.debate span{font-style:italic}
.g-card:disabled{cursor:default}
@keyframes cardFlip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg) scale(1.04)}100%{transform:rotateY(0)}}
.g-wobble{animation:gWob .45s ease-in-out}
@keyframes gWob{20%,60%{transform:translateX(-7px) rotate(-1deg)}40%,80%{transform:translateX(7px) rotate(1deg)}}
.g-swipe{display:grid;place-items:center;padding:8px 0 4px}
.g-swcard{position:relative;width:min(100%,380px);min-height:170px;padding:24px 22px;border-radius:24px;background:linear-gradient(160deg,#fff,#F2F4FA);color:#0D1530;font:900 21px/1.35 var(--f-round);display:grid;place-items:center;text-align:center;box-shadow:0 14px 30px -16px rgba(0,0,0,.45),inset 0 0 0 2px rgba(13,21,48,.06);touch-action:pan-y;cursor:grab;user-select:none}
.g-sw-l,.g-sw-r{position:absolute;top:12px;font:900 13px var(--f-round);font-style:normal;padding:4px 10px;border-radius:999px;opacity:0;transition:opacity .15s}
.g-sw-l{left:12px;background:#FFE9E3;color:#B33A1C}
.g-sw-r{right:12px;background:#DDF8E6;color:#1B7A3A}
.g-swcard[data-lean=l] .g-sw-l,.g-swcard[data-lean=r] .g-sw-r{opacity:1}
.g-tfrow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.g-tf{min-height:56px;border-radius:18px;font:900 18px var(--f-round);display:inline-flex;align-items:center;justify-content:center;gap:6px}
.g-tf.no{background:#FFE9E3;color:#B33A1C}
.g-tf.yes{background:#DDF8E6;color:#1B7A3A}
.g-tf.right{box-shadow:0 0 0 3px #30C25A}
.g-tf.wrong{box-shadow:0 0 0 3px #FF8A65}
.g-hint{font:700 13px var(--f-round);color:#5A6380;text-align:center;margin-top:8px}
.g-blank{display:inline-block;min-width:60px;padding:0 10px;margin:0 4px;border-radius:10px;background:color-mix(in srgb,var(--gh) 14%,#fff);border-bottom:3px solid var(--gh);text-align:center}
.g-blank.right{background:#DDF8E6;border-color:#30C25A}
.g-blank.wrong{background:#FFE9E3;border-color:#FF8A65}
.g-chips{display:flex;flex-wrap:wrap;gap:8px}
.g-chip{min-height:46px;padding:0 16px;border-radius:14px;background:#F2F4FA;color:#0D1530;font:800 16px var(--f-round);box-shadow:inset 0 -3px 0 rgba(13,21,48,.08);transition:transform .15s,opacity .2s}
.g-chip.sel{background:var(--gh);color:#fff;transform:translateY(-3px)}
.g-chip.gone{opacity:0;pointer-events:none;width:0;padding:0;margin:0 -4px}
.g-chip.right{background:#DDF8E6}
.g-chip.wrong{background:#FFE9E3}
.g-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:320px;margin:4px auto 10px}
.g-pad button{min-height:56px;border-radius:16px;background:#F2F4FA;font:900 22px var(--f-round);color:#0D1530;box-shadow:inset 0 -4px 0 rgba(13,21,48,.08)}
.g-pad button:active{transform:translateY(2px)}
.g-input{width:100%;min-height:54px;padding:0 16px;margin-bottom:10px;border-radius:16px;border:2px solid #E1E5F0;font:800 18px var(--f-round);-webkit-user-select:text;user-select:text}
.g-tray{display:flex;flex-wrap:wrap;gap:8px;min-height:50px;margin-bottom:12px}
.g-bins{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.g-bins.n3{grid-template-columns:repeat(3,minmax(0,1fr))}
.g-bins.n4{grid-template-columns:repeat(2,minmax(0,1fr))}
@media (min-width:640px){ .g-bins.n4{grid-template-columns:repeat(4,minmax(0,1fr))} }
.g-bin{min-height:110px;padding:10px;border-radius:20px;background:color-mix(in srgb,var(--bc) 18%,#fff);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--bc) 50%,#fff);display:flex;flex-direction:column;align-items:center;gap:6px;color:#0D1530}
.g-bins.jars .g-bin{border-radius:20px 20px 28px 28px;background:linear-gradient(180deg,#fff,color-mix(in srgb,var(--bc) 25%,#fff))}
.g-bin b{font:900 15px var(--f-round)}
.g-binin{display:flex;flex-wrap:wrap;gap:4px;justify-content:center}
.g-mini{padding:4px 8px;border-radius:10px;background:#fff;font:800 12px var(--f-round);box-shadow:0 2px 6px -2px rgba(0,0,0,.2)}
.g-mini.right{background:#DDF8E6}.g-mini.wrong{background:#FFE9E3}
.g-land{animation:gLand .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes gLand{50%{transform:scale(1.06)}}
.g-line{list-style:none;margin:0 0 12px;padding:0;display:flex;flex-direction:column;gap:6px}
.g-line li{display:flex;align-items:center;gap:10px;min-height:46px;padding:6px 12px 6px 6px;border-radius:14px;background:#F2F4FA;font:800 15px var(--f-round);border:2px dashed #D5DBEA}
.g-line li.on{border-style:solid;border-color:transparent;background:color-mix(in srgb,var(--gh) 12%,#fff);animation:gwIn .25s both}
.g-line li.right{background:#DDF8E6}.g-line li.wrong{background:#FFE9E3}
.g-line.stack{flex-direction:column-reverse}
.g-n{width:30px;height:30px;flex:none;border-radius:50%;display:grid;place-items:center;background:#fff;font:900 14px var(--f-round)}
.g-match{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.g-match.map{padding:10px;border-radius:20px;background:repeating-linear-gradient(45deg,#E9F6FF 0 12px,#E1F1FF 12px 24px)}
.g-col{display:flex;flex-direction:column;gap:8px}
.g-m{min-height:50px;padding:8px 12px;border-radius:14px;background:#F2F4FA;color:#0D1530;font:800 15px/1.25 var(--f-round);text-align:left;box-shadow:inset 6px 0 0 var(--mc,transparent)}
.g-m.sel{background:color-mix(in srgb,var(--gh) 16%,#fff);box-shadow:inset 0 0 0 2px var(--gh)}
.g-m.right{background:#DDF8E6}.g-m.wrong{background:#FFE9E3}
.g-slider{position:relative;padding:8px 4px 4px}
.g-out{display:block;text-align:center;font:900 34px var(--f-round);color:color-mix(in srgb,var(--gh) 80%,#0D1530);margin-bottom:6px}
.g-slider input{width:100%;accent-color:var(--gh);height:36px}
.g-ends{display:flex;justify-content:space-between;font:800 12px var(--f-round);color:#5A6380}
.g-target{position:absolute;bottom:22px;width:4px;height:30px;margin-left:-2px;border-radius:2px;background:#30C25A;box-shadow:0 0 0 3px rgba(48,194,90,.25)}
.g-slider+.g-go{margin-top:12px}
.g-shelf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.g-prod{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:18px 12px 14px;border-radius:20px;background:#F7F4EC;color:#0D1530;box-shadow:inset 0 -6px 0 #E8DFCB}
.g-tag{position:absolute;top:-8px;right:10px;padding:4px 10px;border-radius:8px;background:#FFD43B;font:900 15px var(--f-round);transform:rotate(4deg);box-shadow:0 4px 8px -4px rgba(0,0,0,.3)}
.g-prod b{font:900 17px var(--f-round);margin-top:6px}
.g-prod small{font:700 13px var(--f-round);color:#5A6380}
.g-per{font:800 13px var(--f-round);font-style:normal;color:#14532D;opacity:0;transition:opacity .3s}
.reveal .g-per{opacity:1}
.g-prod.right{box-shadow:0 0 0 3px #30C25A,inset 0 -6px 0 #E8DFCB}.g-prod.wrong{box-shadow:0 0 0 3px #FF8A65,inset 0 -6px 0 #E8DFCB}
.g-phone{width:min(100%,360px);margin:0 auto;padding:14px;border-radius:30px;background:#1B2033;box-shadow:inset 0 0 0 6px #2A3150}
.g-ph-top{font:800 12px var(--f-round);color:#9AA3B5;text-align:center;margin-bottom:10px}
.g-bubble{position:relative;padding:14px;border-radius:18px 18px 18px 6px;background:#fff;color:#0D1530;font:700 16px/1.4 var(--f-text);animation:gwIn .3s both}
.g-verdict{display:inline-block;margin-top:8px;padding:3px 10px;border-radius:999px;font:900 12px var(--f-round);font-style:normal}
.g-verdict.bad{background:#FFE9E3;color:#B33A1C}.g-verdict.good{background:#DDF8E6;color:#1B7A3A}
.g-story{padding:14px;border-radius:18px;background:color-mix(in srgb,var(--gh) 10%,#fff);font:700 17px/1.5 var(--f-round);margin-bottom:12px}
.g-outcome{margin-top:12px;padding:12px 14px;border-radius:16px;font:700 15px/1.45 var(--f-round);animation:gwIn .3s both}
.g-outcome.good{background:#DDF8E6;color:#14532D}.g-outcome.ok{background:#EEF2FF;color:#23306B}.g-outcome.bad{background:#FFF1E6;color:#7A3B00}
.g-room{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px;border-radius:24px;background:linear-gradient(180deg,#FFF8E8 0 55%,#E9D9BC 55%);transform:perspective(700px) rotateX(14deg);transform-origin:50% 100%}
.g-thing{aspect-ratio:1;border-radius:18px;background:rgba(255,255,255,.75);font-size:clamp(28px,7vw,44px);display:grid;place-items:center;box-shadow:0 6px 12px -8px rgba(0,0,0,.4);animation:cardIn .4s var(--d) both;transition:transform .15s}
.g-thing.on{box-shadow:0 0 0 4px var(--gh);transform:scale(1.06)}
.g-thing.right{box-shadow:0 0 0 4px #30C25A}.g-thing.wrong{box-shadow:0 0 0 4px #FF8A65}.g-thing.missed{box-shadow:0 0 0 4px #FFC93C;animation:gWob .5s}
.g-room+.g-hint{margin:12px 0}
.g-budget{display:flex;flex-direction:column;gap:8px}
.g-inc{display:grid;grid-template-columns:auto 1fr auto 1fr;gap:4px 10px;align-items:baseline;padding:10px 14px;border-radius:16px;background:color-mix(in srgb,var(--gh) 10%,#fff);font:800 13px var(--f-round);color:#5A6380}
.g-inc b{font:900 20px var(--f-round);color:#0D1530}.g-inc b.neg{color:#C2410C}
.g-brow{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 4px;border-bottom:1px solid #EEF0F6;font:800 15px var(--f-round)}
.g-brow small{display:block;font:700 12px var(--f-round);color:#5A6380}
.g-step{display:flex;align-items:center;gap:8px}
.g-step button{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#F2F4FA;color:#0D1530}
.g-step b{min-width:64px;text-align:center;font:900 17px var(--f-round)}
.g-step.big b{font-size:28px;min-width:90px}
.g-bar{display:block;height:10px;border-radius:5px;background:#EEF0F6;overflow:hidden;margin:6px 0 4px}
.g-bar i{display:block;height:100%;background:var(--gh);transition:width .3s}
.g-chart{position:relative;padding:10px;border-radius:20px;background:#0F1730}
.g-chart svg{width:100%;height:auto;display:block}
.g-ln{fill:none;stroke:#7CF5B5;stroke-width:3;stroke-linejoin:round;stroke-linecap:round}
.g-dot{fill:#FFE066;stroke:#0F1730;stroke-width:2}
.g-yr{position:absolute;left:16px;top:12px;font:800 14px var(--f-round);color:#fff}
.g-mbtn{margin-top:12px}
.g-alert{font:900 16px/1.4 var(--f-round);color:#B33A1C;margin-bottom:6px}
.g-snow{display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px;border-radius:20px;background:linear-gradient(180deg,#EAF6FF,#fff);margin-bottom:12px}
.g-ball{font-size:46px;transition:transform .25s cubic-bezier(.2,1.4,.4,1)}
.g-snowtxt{font:800 15px var(--f-round)}
.g-snow input{width:100%;accent-color:var(--gh)}
.g-stall{position:relative;border-radius:20px;overflow:hidden;background:#FFF8E8;padding:44px 14px 14px;margin-bottom:10px}
.g-awning{position:absolute;left:0;right:0;top:0;height:30px;background:repeating-linear-gradient(90deg,#E8473C 0 30px,#fff 30px 60px);border-radius:0 0 50% 50% / 0 0 30% 30%}
.g-st-in{display:flex;flex-direction:column;align-items:center;gap:6px}
.g-st-item{font:900 22px var(--f-round)}
.g-st-in small{font:700 13px var(--f-round);color:#5A6380}
.g-crowd{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;min-height:34px;margin-top:8px;font-size:24px}
.g-crowd span{animation:walkIn .4s var(--d) both}
@keyframes walkIn{from{opacity:0;transform:translateX(-30px)}}
.g-timing{position:relative;height:56px;border-radius:28px;background:#EEF0F6;margin:6px 0 14px;overflow:hidden}
.g-zone{position:absolute;left:62%;width:18%;top:0;bottom:0;background:#DDF8E6;border-left:2px dashed #30C25A;border-right:2px dashed #30C25A;display:grid;place-items:center;font:900 12px var(--f-round);color:#1B7A3A;font-style:normal}
.g-mark{position:absolute;top:8px;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:#FFD43B;box-shadow:0 4px 10px -4px rgba(0,0,0,.4)}
.g-docs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
@media (max-width:560px){ .g-docs{grid-template-columns:1fr} }
.g-doc{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:16px;background:#F7F4EC;font:700 14px/1.4 var(--f-text)}
.g-doc>b{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:#5A6380}
.g-doc p,.g-doc button{padding:6px 8px;border-radius:10px;background:#fff;text-align:left;font:700 14px/1.4 var(--f-text);color:#0D1530}
.g-doc button.on{box-shadow:inset 0 0 0 2px var(--gh)}
.g-doc button.right{background:#DDF8E6}.g-doc button.wrong{background:#FFE9E3}.g-doc button.missed{background:#FFF4CC}
.g-chat{display:flex;flex-direction:column;gap:8px;max-height:300px;overflow:auto;padding:10px;border-radius:18px;background:#F2F4FA;margin-bottom:10px}
.g-chat p{max-width:82%;padding:10px 12px;border-radius:16px;font:700 15px/1.4 var(--f-text);animation:gwIn .25s both}
.g-chat .them{align-self:flex-start;background:#fff;border-bottom-left-radius:4px}
.g-chat .me{align-self:flex-end;background:var(--gh);color:#fff;border-bottom-right-radius:4px}
.g-chat .me.meh{background:#9AA3B5}
.g-replies{display:flex;flex-direction:column;gap:8px}
.g-replies .g-chip{text-align:left;padding:10px 14px;height:auto}
.g-box{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.g-box p{padding:10px 12px;border-radius:14px;background:#F2F4FA;font:700 15px/1.4 var(--f-round);color:#9AA3B5}
.g-box p.on{background:color-mix(in srgb,var(--gh) 12%,#fff);color:#0D1530;animation:gwIn .3s both}
.g-box b{color:color-mix(in srgb,var(--gh) 75%,#0D1530);margin-right:4px}
.g-mystery+.g-go{margin-top:10px}
.g-count{font:900 12px var(--f-round);text-transform:uppercase;letter-spacing:.08em;color:#5A6380;margin-bottom:6px}
.gw-pane .g-count{color:rgba(255,255,255,.85)}
@media (prefers-reduced-motion:reduce){ .gw *{animation:none!important;transition:none!important} }
`;
const style = document.createElement('style'); style.id = 'growth-css'; style.textContent = CSS; document.head.appendChild(style);


// If the app finished starting before this file loaded, redraw so the Character Growth card appears.
if (Store.ready) C.scheduleRender();
})();
