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

/* ---------- Catalogue ----------
   Only LIVE trees reach kids. The rest are parked in chorecast-growth/content/parked until a grown-up has read them. */
const LIVE = ['money', 'character'];
const ALL_TREES = [
  { id: 'money', name: 'Money Sense', icon: '💰', hue: '#30C25A', title: 'Budget Boss', scene: 'bank', blurb: 'Earning, spending, saving and budgeting' },
  { id: 'character', name: 'Good Character', icon: '🌟', hue: '#E8A317', title: 'Good Egg', scene: 'home', blurb: 'Gratitude, attitude, boundaries and screens' },
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
const TREES = ALL_TREES.filter(t => LIVE.includes(t.id));
const TREE = Object.fromEntries(TREES.map(t => [t.id, t]));
// Kids 16 and up use the Makers band: older teens aren't who Chorecast is for.
const BANDS = [
  { id: 'sprouts', name: 'Sprouts', ages: '7 to 9', words: 10 },
  { id: 'builders', name: 'Builders', ages: '10 to 12', words: 14 },
  { id: 'makers', name: 'Makers', ages: '13 to 15', words: 18 },
];
const BAND_IX = Object.fromEntries(BANDS.map((b, i) => [b.id, i]));
const GSET = () => ({ cap: 20, off: {}, band: {}, country: 'nz', living: true, readAloud: true, ...((S().growth) || {}) });
function bandOf(kid) {
  const age = kid.age || 9, base = age <= 9 ? 0 : age <= 12 ? 1 : 2, shift = GSET().band[kid.id] || 0;
  return BANDS[clamp(base + shift, 0, BANDS.length - 1)].id;
}
// XP rules from the plan: modest, capped, and only for correct, completed learning.
const XP = { lesson: 40, perfect: 10, replay: 10, card: 3, cardsPerDay: 15, echo: 15, caseStudy: 50, challenge: 120, moment: 10, story: 20, path: 500, dayCap: 250, assignedMax: 50 };
const BOXES = [1, 3, 7, 16, 35];
const RANKS = ['Saver', 'Starter', 'Steady', 'Long-termer', 'Portfolio Pro'];

/* ---------- Content packs ----------
   One text file per tree and band (growth/<tree>.<band>.txt), plus moments.txt and cases.txt.
   {nz:...~au:...} picks the family's country; "*" marks right answers. */
const Packs = {}, loading = {};
let Moments = [], Cases = [], feedLoaded = false, contentVer = '1', shipped = null;
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
  return loading.index || (loading.index = fetchText('growth/index.json').then(t => { const ix = JSON.parse(t); contentVer = ix.version || contentVer; shipped = ix.counts || null; }).catch(() => {}));
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
    // index.json lists what was built; skip files that are parked so they don't 404.
    const has = f => !shipped || f in shipped;
    if (has('moments.txt')) try { Moments = parseMoments(await fetchText(`growth/moments.txt?v=${contentVer}`)); } catch (e) { console.warn('moments', e); }
    if (has('cases.txt')) try { Cases = parseCases(await fetchText(`growth/cases.txt?v=${contentVer}`)); } catch (e) { console.warn('cases', e); }
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
// Passing (and opening the next lesson) takes 80% of the questions right. Kids are told it as "get N of M right".
const passNeed = n => Math.max(1, Math.ceil(n * 0.8 - 1e-9));
const passGoal = (n, cap) => `${cap ? 'Get' : 'get'} ${passNeed(n)} of ${n} right`;
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
