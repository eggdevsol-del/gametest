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
// Tells the lesson's 3D scene about each move, so it can act it out (see Stage3D). Demos and crew panes pass no fx.
const fx = (ctx, e, d) => { if (ctx && ctx.fx) ctx.fx(e, d || {}); };

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
    fx(ctx, 'pick', { i: +b.dataset.i, ok, right: it.any ? [] : opts.map((x, k) => (x.ok ? k : -1)).filter(k => k >= 0) });
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
    const btn = host.querySelector(`[data-v="${v ? 1 : 0}"]`); btn.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(btn) : oops(btn); fx(ctx, 'pick', { v, ok });
    host.querySelectorAll('.g-tf').forEach(b => { b.disabled = true; });
    done({ ok, score: ok ? 1 : 0, answer: v ? 'True' : 'False', right: `${it.a ? 'True' : 'False'}${it.why ? '. ' + local(it.why) : ''}` });
  };
  host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => answer(b.dataset.v === '1'); });
  let x0 = null, dx = 0;
  card.onpointerdown = e => { x0 = e.clientX; dx = 0; try { card.setPointerCapture(e.pointerId); } catch (_) {} card.style.transition = 'none'; };
  card.onpointermove = e => { if (x0 == null) return; dx = e.clientX - x0; card.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`; fx(ctx, 'lean', { dx }); card.dataset.lean = dx > 30 ? 'r' : dx < -30 ? 'l' : ''; };
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
    const ok = sameAnswer(v, ans); blank.textContent = v || '?'; blank.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(blank) : oops(blank); fx(ctx, 'pick', { ok, v });
    host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    done({ ok, score: ok ? 1 : 0, answer: v, right: ans });
  };
  host.querySelectorAll('.g-chip').forEach(b => { b.onclick = () => finish(b.dataset.v); });
  host.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { const k = b.dataset.k; val = k === '⌫' ? val.slice(0, -1) : (val + k).slice(0, 8); blank.textContent = val || '?'; host.querySelector('[data-ok]').disabled = !val; Sound.tap(); fx(ctx, 'type', { val }); }; });
  const inp = host.querySelector('.g-input'); if (inp) { inp.oninput = () => { blank.textContent = inp.value || '?'; fx(ctx, 'type', { val: inp.value }); }; inp.onkeydown = e => { if (e.key === 'Enter') finish(inp.value.trim()); }; setTimeout(() => inp.focus(), 50); }
  const ok = host.querySelector('[data-ok]'); if (ok) ok.onclick = () => finish(inp ? inp.value.trim() : val);
};

// Tap an item, then tap where it belongs (works the same with a finger, a mouse or a keyboard).
function placer(host, items, bins, render, check, ev = () => {}) {
  let sel = null; const placed = {};
  const draw = () => {
    host.querySelectorAll('[data-item]').forEach(el => { const i = +el.dataset.item; el.classList.toggle('sel', sel === i); el.classList.toggle('gone', placed[i] != null); });
    host.querySelectorAll('[data-bin]').forEach(el => { const b = el.dataset.bin; el.querySelector('.g-binin').innerHTML = items.map((t, i) => (placed[i] === b ? `<span class="g-mini" data-un="${i}">${esc(local(t))}</span>` : '')).join(''); });
  };
  host.addEventListener('click', e => {
    if (host.dataset.locked) return;
    const it = e.target.closest('[data-item]'), bin = e.target.closest('[data-bin]'), un = e.target.closest('[data-un]');
    if (un) { delete placed[+un.dataset.un]; Sound.tap(); ev('unplace', { item: +un.dataset.un }); draw(); return; }
    if (it) { sel = +it.dataset.item; Sound.tap(); draw(); return; }
    if (bin && sel != null) { if (placed[sel] != null) ev('unplace', { item: sel }); placed[sel] = bin.dataset.bin; ev('place', { item: sel, bin: bin.dataset.bin }); sel = null; Sound.pop(); bin.classList.remove('g-land'); void bin.offsetWidth; bin.classList.add('g-land'); draw(); if (Object.keys(placed).length === items.length) setTimeout(() => check(placed), 250); }
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
    const score = right / items.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-bins'), true) : oops(host.querySelector('.g-bins')); fx(ctx, 'graded', { ok });
    done({ ok, score, answer: placed, right: ok ? '' : items.filter((x, i) => placed[i] !== x.b).map(x => `${local(x.t)} → ${local(x.b)}`).join(', ') });
  }, (e, d) => fx(ctx, e, d));
};

GAMES.order = GAMES.build = (it, host, ctx, done) => {
  done = once(done);
  const order = shuffle(it.steps.map((t, i) => ({ t, i })), rnd), picked = [];
  const draw = () => {
    host.innerHTML = `${qHead(it.q)}<ol class="g-line ${it.type === 'build' ? 'stack' : ''}">${it.steps.map((_, k) => { const p = picked[k]; return `<li class="${p ? 'on' : ''}" ${p ? `data-back="${k}"` : ''}><span class="g-n">${k + 1}</span>${p ? esc(local(p.t)) : ''}</li>`; }).join('')}</ol>
      <div class="g-tray">${order.map((o, j) => (picked.includes(o) ? '' : `<button class="g-chip" data-pick="${j}">${esc(local(o.t))}</button>`)).join('')}</div>`;
    host.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { picked.push(order[+b.dataset.pick]); Sound.pop(); fx(ctx, 'pick', { k: picked.length - 1 }); if (picked.length === it.steps.length) return finish(); draw(); }; });
    host.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => { picked.splice(+b.dataset.back); Sound.tap(); fx(ctx, 'back', { n: +b.dataset.back }); draw(); }; });
  };
  const finish = () => {
    draw(); host.dataset.locked = 1; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    let right = 0; host.querySelectorAll('.g-line li').forEach((li, k) => { const ok = picked[k].i === k; if (ok) right++; li.classList.add(ok ? 'right' : 'wrong'); });
    const score = right / it.steps.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-line'), true) : oops(host.querySelector('.g-line')); fx(ctx, 'graded', { ok: picked.map((p, k) => p.i === k) });
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
    if (r && selL != null) { const j = +r.dataset.r; for (const k of Object.keys(made)) if (made[k] === j) delete made[k]; made[selL] = j; fx(ctx, 'pair', { i: selL, j }); selL = null; Sound.pop(); }
    paint();
    if (Object.keys(made).length === left.length) {
      host.dataset.locked = 1; let ok2 = 0;
      left.forEach((t, i) => { const good = right[made[i]] === it.pairs[i][1]; if (good) ok2++; host.querySelector(`[data-l="${i}"]`).classList.add(good ? 'right' : 'wrong'); });
      const score = ok2 / left.length, ok = score >= 0.99; ok ? cheer(host.querySelector('.g-match'), true) : oops(host.querySelector('.g-match')); fx(ctx, 'graded', { ok: left.map((t, i) => right[made[i]] === it.pairs[i][1]) });
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
  r.oninput = () => { out.textContent = show(r.value); fx(ctx, 'slide', { v: +r.value }); }; fx(ctx, 'slide', { v: mid });
  host.querySelector('[data-ok]').onclick = () => {
    const v = +r.value, span = it.max - it.min, tol = it.tol != null ? it.tol : span * 0.1, diff = Math.abs(v - it.a), ok = diff <= tol;
    r.disabled = true; host.querySelector('[data-ok]').disabled = true;
    host.querySelector('.g-slider').insertAdjacentHTML('beforeend', `<i class="g-target" style="left:${((it.a - it.min) / span) * 100}%"></i>`);
    ok ? cheer(out) : oops(out); fx(ctx, 'lock', { v, a: it.a, ok });
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
    b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b); fx(ctx, 'pick', { i: +b.dataset.i, ok, best: it.products.indexOf(best) });
    done({ ok, score: ok ? 1 : 0, answer: p.name, right: `${local(best.name)}: ${per(best).label}` });
  }; });
};

GAMES.scam = (it, host, ctx, done) => {
  done = once(done);
  const msgs = shuffle(it.msgs, rnd); let k = 0, right = 0;
  const draw = () => {
    const m = msgs[k];
    host.innerHTML = `${qHead(it.q)}<div class="g-phone"><div class="g-ph-top">Messages · ${k + 1} of ${msgs.length}</div><div class="g-bubble">${esc(local(m.t))}</div></div>
      <div class="g-tfrow"><button class="g-tf yes" data-v="0">${ic('check')} Looks real</button><button class="g-tf no" data-v="1">⚠️ Scam!</button></div>`; fx(ctx, 'msg', { k });
    host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => {
      const said = b.dataset.v === '1', ok = said === m.scam; if (ok) right++;
      b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b); fx(ctx, 'pick', { said, scam: m.scam, ok }); host.querySelectorAll('.g-tf').forEach(x => { x.disabled = true; });
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
    host.querySelectorAll('.g-card').forEach(x => { x.disabled = true; }); b.classList.add(c.grade === 'bad' ? 'wrong' : 'right', 'picked'); c.grade === 'bad' ? oops(b) : cheer(b); fx(ctx, 'pick', { i: +b.dataset.i, grade: c.grade });
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
    host.querySelectorAll('.g-card').forEach((x, i) => { x.disabled = true; if (args[i].ok) x.classList.add('right'); }); b.classList.add(ok ? 'right' : 'wrong', 'picked'); ok ? cheer(b) : oops(b); fx(ctx, 'pick', { i: +b.dataset.i, ok });
    if (it.other) host.insertAdjacentHTML('beforeend', `<div class="g-outcome ok"><b>Now argue the other side:</b> ${esc(local(it.other))}</div>`);
    done({ ok, score: ok ? 1 : 0, answer: a.t, right: ok ? '' : `Stronger: “${local(args.find(x => x.ok).t)}”` });
  }; });
};

GAMES.tap = (it, host, ctx, done) => {
  done = once(done);
  const items = shuffle(it.items, rnd), hits = items.filter(x => x.hit).length, chosen = new Set();
  host.innerHTML = `${qHead(it.q)}<div class="g-room">${items.map((x, i) => `<button class="g-thing" style="--d:${i * 40}ms" data-i="${i}" aria-label="${esc(x.e)}">${esc(x.e)}</button>`).join('')}</div><p class="g-hint">Find all ${hits}, then tap Done</p><button class="g-go" data-ok>Done</button>`; fx(ctx, 'setup', { items: items.map(x => x.e) });
  host.querySelectorAll('.g-thing').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; const i = +b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle('on', chosen.has(i)); Sound.tap(); fx(ctx, 'tap', { i, on: chosen.has(i) }); }; });
  host.querySelector('[data-ok]').onclick = () => {
    host.dataset.locked = 1; let tp = 0, fp = 0;
    items.forEach((x, i) => { const b = host.querySelector(`[data-i="${i}"]`); b.disabled = true; if (x.hit && chosen.has(i)) { tp++; b.classList.add('right'); } else if (x.hit) b.classList.add('missed'); else if (chosen.has(i)) { fp++; b.classList.add('wrong'); } });
    const score = Math.max(0, (tp - fp) / hits), ok = tp === hits && fp === 0; ok ? cheer(host.querySelector('.g-room'), true) : oops(host.querySelector('.g-room')); fx(ctx, 'graded', { ok: items.map((x, i) => x.hit && chosen.has(i)) });
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
      <i class="g-bar"><i style="width:${Math.min(100, used / it.income * 100)}%"></i></i></div><button class="g-go" data-ok ${left < 0 ? 'disabled' : ''}>Lock in my budget</button>`; fx(ctx, 'alloc', { amt: amt.slice() });
    host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { const i = +b.dataset.i; amt[i] = Math.max(it.cats[i].min, amt[i] + step * +b.dataset.d); Sound.tap(); draw(); }; });
    host.querySelector('[data-ok]').onclick = finish;
  };
  const finish = () => {
    host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const used = amt.reduce((a, b) => a + b, 0), spare = it.income - used, saveIx = it.cats.findIndex(c => /sav|buffer|emergenc|vault/i.test(c.n));
    const cushion = spare + (saveIx >= 0 ? amt[saveIx] : 0);
    let ok = used <= it.income, msg = 'Every dollar has a job. Nice planning.';
    if (it.surprise) { const covered = cushion >= it.surprise.c; ok = ok && covered; fx(ctx, 'surprise', { covered }); msg = covered ? `Surprise! ${local(it.surprise.n)} cost ${dollars(it.surprise.c)}, and your savings covered it.` : `Surprise! ${local(it.surprise.n)} cost ${dollars(it.surprise.c)}. Keeping some money spare or in savings would have covered it.`; }
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
  const show = y => { ln.setAttribute('points', pts.slice(0, y + 1).map((p, i) => `${X(i)},${Y(p)}`).join(' ')); dot.setAttribute('cx', X(y)); dot.setAttribute('cy', Y(pts[y])); lab.innerHTML = `Year ${y} · <b class="num">${dollars(sold != null && y >= sold ? pts[sold] : pts[y])}</b>${sold != null && y > sold ? ' (sold, in cash)' : ''}`; fx(ctx, 'year', { y, v: pts[y], max: Math.max(...pts), drop: y === crash }); };
  const run = async from => { for (let y = from; y <= years; y++) { show(y); Sound.tick(y / years); await sleep(reduced ? 60 : 420); if (y === crash && sold == null) return ask(); } end(); };
  const ask = () => {
    mb.innerHTML = `<p class="g-alert">Uh oh! Prices just fell by about a third. Everyone is talking about it.</p><div class="g-tfrow"><button class="g-tf yes" data-h>Hold on</button><button class="g-tf no" data-s>Sell now</button></div>`;
    oops(host.querySelector('.g-chart'));
    mb.querySelector('[data-h]').onclick = () => { mb.innerHTML = ''; fx(ctx, 'pick', { hold: true }); run(crash + 1); };
    mb.querySelector('[data-s]').onclick = () => { sold = crash; mb.innerHTML = ''; fx(ctx, 'pick', { hold: false }); run(crash + 1); };
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
  rr.oninput = () => { const y = +rr.value; host.querySelector('[data-y]').textContent = y; host.querySelector('[data-v]').textContent = dollars(fv(y)); ball.style.transform = `scale(${0.6 + Math.min(2.2, fv(y) / it.start * 0.4)}) rotate(${y * 40}deg)`; fx(ctx, 'slide', { y, r: fv(y) / it.start, label: dollars(fv(y)) }); };
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
      <div class="g-crowd" aria-hidden="true"></div></div><p class="g-sub">Goal: make at least ${fmt(it.goal)} profit. Too cheap and you earn little each; too dear and nobody buys.</p><button class="g-go" data-open>Open the stall</button>`; fx(ctx, 'price', { label: fmt(priceC) });
    host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { priceC = Math.max(it.cost, priceC + +b.dataset.d); Sound.tap(); draw(); }; });
    host.querySelector('[data-open]').onclick = open;
  };
  const open = async () => {
    tries++; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const n = sold(priceC), crowd = host.querySelector('.g-crowd'), faces = ['🧒', '👩', '👨', '👵', '🧑', '👧']; fx(ctx, 'open', { n });
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
    fx(ctx, 'pick', { ok: hit });
    if (hit) { cancelAnimationFrame(raf); cheer(zone, true); host.querySelector('[data-tap]').disabled = true; done({ ok: true, score: 1 }); }
    else { oops(mark); host.querySelector('.g-hint').textContent = tries ? `${tries} tr${tries === 1 ? 'y' : 'ies'} left` : 'Missed it this time'; if (!tries) { cancelAnimationFrame(raf); host.querySelector('[data-tap]').disabled = true; done({ ok: false, score: 0.3, right: 'Wait for the marker to reach the green zone' }); } }
  };
  ctx.cleanup && ctx.cleanup.push(() => cancelAnimationFrame(raf));
};

GAMES.diff = (it, host, ctx, done) => {
  done = once(done);
  const changed = new Set(it.b.map((l, i) => (l !== it.a[i] ? i : -1)).filter(i => i >= 0)), chosen = new Set();
  host.innerHTML = `${qHead(it.q)}<div class="g-docs"><div class="g-doc"><b>Before</b>${it.a.map(l => `<p>${esc(local(l))}</p>`).join('')}</div><div class="g-doc"><b>After · tap what changed</b>${it.b.map((l, i) => `<button data-i="${i}">${esc(local(l))}</button>`).join('')}</div></div><button class="g-go" data-ok>Done</button>`;
  host.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const i = +b.dataset.i; chosen.has(i) ? chosen.delete(i) : chosen.add(i); b.classList.toggle('on', chosen.has(i)); Sound.tap(); fx(ctx, 'tap', { i, on: chosen.has(i) }); }; });
  host.querySelector('[data-ok]').onclick = () => {
    fx(ctx, 'graded', { ok: it.b.map((l, i) => (changed.has(i) ? chosen.has(i) : !chosen.has(i))) });
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
    while (k < it.turns.length && it.turns[k].them) { log.insertAdjacentHTML('beforeend', `<p class="them">${esc(local(it.turns[k].them))}</p>`); log.scrollTop = 1e6; Sound.pop(); fx(ctx, 'line', { who: 'them' }); k++; await sleep(reduced ? 50 : 500); }
    if (k >= it.turns.length) return done({ ok: right / Math.max(1, mine) >= 0.66, score: right / Math.max(1, mine) });
    const opts = shuffle(it.turns[k].me, rnd);
    rep.innerHTML = opts.map((o, i) => `<button class="g-chip" data-i="${i}">${esc(local(o.t))}</button>`).join('');
    rep.querySelectorAll('button').forEach(b => { b.onclick = () => { const o = opts[+b.dataset.i]; if (o.ok) right++; rep.innerHTML = ''; log.insertAdjacentHTML('beforeend', `<p class="me ${o.ok ? 'good' : 'meh'}">${esc(local(o.t))}</p>`); o.ok ? cheer(log) : oops(log); fx(ctx, 'line', { who: 'me', ok: !!o.ok }); k++; setTimeout(next, 450); }; });
  };
  next();
};

GAMES.mystery = (it, host, ctx, done) => {
  done = once(done);
  let shown = 1; const opts = shuffle(it.opts, rnd);
  const draw = () => {
    host.innerHTML = `${qHead('Mystery box')}<div class="g-box">${it.clues.map((c, i) => `<p class="${i < shown ? 'on' : ''}">${i < shown ? `<b>Clue ${i + 1}</b> ${esc(local(c))}` : `🔒 Clue ${i + 1}`}</p>`).join('')}</div>
      <div class="g-chips">${opts.map((o, i) => `<button class="g-chip" data-i="${i}">${esc(local(o.t))}</button>`).join('')}</div>${shown < it.clues.length ? '<button class="g-go ghost" data-more>Show another clue</button>' : ''}`;
    host.querySelectorAll('[data-i]').forEach(b => { b.onclick = () => { const o = opts[+b.dataset.i]; host.querySelectorAll('button').forEach(x => { x.disabled = true; }); b.classList.add(o.ok ? 'right' : 'wrong'); o.ok ? cheer(b, true) : oops(b); fx(ctx, 'pick', { ok: o.ok }); done({ ok: o.ok, score: o.ok ? Math.max(0.6, 1 - (shown - 1) * 0.15) : 0, right: opts.find(x => x.ok).t }); }; });
    const more = host.querySelector('[data-more]'); if (more) more.onclick = () => { shown++; Sound.whoosh(); fx(ctx, 'clue', { n: shown }); draw(); };
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
    const q = (GEN[it.kind] || GEN.add)(r, band); fx(ctx, 'next', { k });
    renderItem(q, sub, ctx, res => { if (res.ok) right++; k++; setTimeout(() => (k < n ? step() : done({ ok: right / n >= 0.66, score: right / n, right: res.ok ? '' : res.right })), res.ok ? 650 : 1500); });
  };
  step();
};

function renderItem(item, host, ctx, done) {
  host.innerHTML = ''; host.removeAttribute('data-locked');
  (GAMES[item.type] || GAMES.note)(item, host, ctx, done);
  host.querySelectorAll('[data-say]').forEach(b => { b.onclick = () => speak(b.dataset.say); });
}
// done (optional) runs when the reading ends, is cut off, or can't start
function speak(text, done) {
  try { const u = new SpeechSynthesisUtterance(text), vs = speechSynthesis.getVoices(), v = vs.find(x => /en-(NZ|AU)/i.test(x.lang)) || vs.find(x => /^en/i.test(x.lang)); if (v) u.voice = v; u.rate = 0.95; if (done) u.onend = u.onerror = () => done(); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { if (done) done(); }
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
const stop = s => /[.?!…]$/.test(s) ? s : s + '.';
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
  C.track('growth.open', { from: opts.from || (opts.need ? 'shop' : opts.tree ? 'tree' : 'card') }, kidId);
}
function close() {
  if (!root) return; Grow.cleanup.splice(0).forEach(f => f()); try { speechSynthesis.cancel(); } catch (e) {}
  root.hidden = true; Grow.open = false; document.body.classList.remove('gw-open'); if (Grow.stage) Grow.stage.stop(); if (PlantView.ok) PlantView.stop(); HowTo.stop();
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
// Unit challenges a kid has opened (every lesson in the unit passed) but hasn't won the crown for yet
function openCrowns(kid) {
  const won = prog(kid).units || {};
  return treesOn().flatMap(tree => { const pack = packFor(tree.id, bandOf(kid)); return pack ? pack.units.filter(u => u.lessons.length && u.lessons.every(l => passed(kid, l.id)) && !((won[u.id] || {}).best >= 0.8)).map(u => ({ u, tree })) : []; });
}
// A unit challenge asks up to 8 of the unit's questions
const crownSize = u => Math.min(8, u.lessons.reduce((n, l) => n + l.checks.length, 0));
// With every lesson passed, the home screen says so plainly and points at what's still to win
function allDoneCard(kid) {
  const crowns = openCrowns(kid);
  return `<section class="gw-alldone"><span class="gad-ic" aria-hidden="true">${crowns.length ? '🏆' : '🌸'}</span><div><b>You finished every lesson!</b><p>${crowns.length
    ? `Next, win your unit crown${crowns.length === 1 ? '' : 's'}. A crown quiz mixes questions from a whole unit. Get 80% or more right to win the crown and ${XP.challenge} XP.`
    : 'You won every unit crown too. Amazing! New lessons are on the way in an update.'}</p></div></section>
    ${crowns.length ? `<div class="gw-pick">${crowns.map(({ u, tree }, i) => `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tree.hue}" data-g="challenge" data-id="${u.id}"><span class="lc-ic">🏆</span><span class="lc-t"><small>${esc(tree.name)} · Unit ${u.n} crown</small><b>${esc(local(u.title))}</b><em>${crownSize(u)} questions · ${passGoal(crownSize(u))} · +${XP.challenge} XP</em></span><span class="lc-go">${ic('play')}</span></button>`).join('')}</div>` : ''}`;
}
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
  Grow.cleanup.splice(0).forEach(f => f()); HowTo.stop();
  const v = Grow.view, tree = Grow.tree && TREE[Grow.tree];
  root.style.setProperty('--gh', (tree || (Grow.run && TREE[Grow.run.lesson ? Grow.run.lesson.tree : Grow.run.tree]) || { hue: '#2F6FE4' }).hue);
  root.dataset.view = v;
  if (Grow.stage) Grow.stage.setScene(v === 'tree' && tree ? tree.scene : Grow.run && Grow.run.lesson ? Grow.run.lesson.scene : Grow.run && Grow.run.scene ? Grow.run.scene : 'island');
  // The tree view is a full-screen plant with its own 3D view, so the stage rests. Every step of a lesson, quiz,
  // review or story, and its results, take place in front of the plant, which grows with each right answer in a
  // lesson's quiz; other screens show just the guide.
  const plant = PlantView.ok && (v === 'tree' || plantRun());
  if (Grow.stage) { if (plant) Grow.stage.stop(); else Grow.stage.start(); if (!RUN_VIEWS.includes(v) && v !== 'done') Grow.stage.show(null); }
  if (PlantView.ok && !plant) PlantView.stop();
  if (v === 'guide') return viewGuide(kid);
  if (v === 'hub') return viewHub(kid);
  if (v === 'tree') return viewTree(kid, tree);
  if (v === 'lesson' || v === 'challenge' || v === 'review' || v === 'moment' || v === 'echo' || v === 'story' || v === 'case') return viewRun(kid);
  if (v === 'done') return viewDone(kid);
  if (v === 'break') return viewBreak(kid);
  if (v === 'crewPick') return viewCrewPick(kid);
  if (v === 'crew') return viewCrew();
}
const RUN_VIEWS = ['lesson', 'challenge', 'review', 'moment', 'echo', 'story', 'case'];
const plantRun = () => !!Grow.run && (RUN_VIEWS.includes(Grow.view) || Grow.view === 'done');
// The subject a run's plant view looks along: its lesson's, its story's, or else Money Sense, the stalk
const plantTree = (R, step) => TREE[(R.lesson && R.lesson.tree) || step.tree || R.tree] || TREE.money || TREES[0];
/* Puts the plant on the stage for a run's step, or for its results. Through a lesson it stands as grown by the quiz
   questions answered right so far, and only the quiz's answers grow it. A unit's crown quiz holds on that unit's
   ring, which glows with every right answer. Anything else shows the plant as it stands. On the results of a
   lesson's first pass, its new leaf waits (`newLeaf`) to unfurl when the kid goes back to the plant. */
function plantFor(kid, R, step, newLeaf) {
  const stage = root.querySelector('.gw-stage'), l = R.lesson;
  if (R.mode === 'challenge') return PlantView.crown(stage, kid, TREE[R.tree], R.unit);
  if (l && Grow.view !== 'done') return PlantView.quiz(stage, kid, l, R.res.filter((r, i) => r && r.ok && i <= R.k && R.steps[i].kind === 'check').length, step.kind === 'check');
  return PlantView.look(stage, kid, plantTree(R, step), newLeaf);
}
// A lesson's quiz grows the plant and a unit's crown quiz lights its ring
const plantQuiz = () => { const R = Grow.run; return (Grow.view === 'lesson' || Grow.view === 'challenge') && !!R && (R.mode === 'lesson' || R.mode === 'challenge') && R.steps[R.k].kind === 'check'; };
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
  Prize.tick(kid);
  const g = prog(kid), lvl = charLevel(kid), m = mastered(kid), sug = suggestions(kid, 3), due = dueCards(kid).length, echo = (g.echo || []).length;
  const mom = momentFor(kid), momDone = g.mom && g.mom.d === today() && g.mom.done, story = marketStory(kid), storyDone = g.story === weekKey();
  const t = titles(kid), needN = Grow.need ? Math.ceil(Grow.need / XP.lesson) : 0;
  say(Grow.need ? `You need ${Grow.need} more XP. ${needN === 1 ? 'One lesson' : `${needN} lessons`} will do it!` : sug.length ? `Ready, ${kid.name}? Pick what to learn next.` : openCrowns(kid).length ? `You finished every lesson, ${kid.name}! Now win your unit crowns.` : `You’ve done everything here, ${kid.name}! New lessons arrive in updates.`);
  const tile = (g2, ico, title, sub, extra = '') => `<button class="gw-tile" data-g="${g2}" ${extra}><span class="gt-ic">${ico}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
  ui.innerHTML = `${topbar(kid, 'Character Growth', `${esc(kid.name)} · ${BANDS[BAND_IX[bandOf(kid)]].name}, ages ${BANDS[BAND_IX[bandOf(kid)]].ages}`)}
    <div class="gw-pad">
      <section class="gw-me"><div class="gw-lvl"><b class="num">${lvl}</b><small>Level</small></div><div class="gw-me-t"><b>${m} skill${m === 1 ? '' : 's'} mastered</b><small>${t.length ? t.map(esc).join(' · ') : 'Master 4 lessons in a tree to earn its title'}</small>${minutesToday(kid) ? `<small>${minutesToday(kid)} minute${minutesToday(kid) === 1 ? '' : 's'} of learning today</small>` : ''}</div></section>
      ${!sug.length && !Grow.need ? allDoneCard(kid) : ''}
      ${prizeStrip(kid)}
      ${Grow.need ? `<div class="gw-need">${ic('sparkle')} Each lesson you pass pays ${XP.lesson} XP, up to ${XP.dayCap} XP a day.</div>` : ''}
      ${sug.length ? `<h2 class="gw-h2">Pick your next lesson</h2><div class="gw-pick">${sug.map((l, i) => { const tr = TREE[l.tree], as = (g.assigned || []).find(a => a.id === l.id); return `<button class="gw-lcard ${i === 0 ? 'main' : ''}" style="--th:${tr.hue}" data-g="lesson" data-id="${l.id}"><span class="lc-ic">${esc(l.icon)}</span><span class="lc-t"><small>${esc(tr.name)} · Unit ${l.unit}</small><b>${esc(local(l.title))}</b>${as ? `<em>From a grown-up${as.bonus ? ` · +${as.bonus} XP bonus` : ''}</em>` : ''}</span><span class="lc-go">${ic('play')}</span></button>`; }).join('')}</div>` : ''}
      <div class="gw-tiles">
        ${due ? tile('review', '🔁', `${due} review${due === 1 ? '' : 's'} due`, 'Quick questions so you remember') : ''}
        ${echo ? tile('echo', '💡', `${echo} question${echo === 1 ? '' : 's'} about your week`, `+${XP.echo} XP each`) : ''}
        ${mom ? tile('moment', momDone ? '✅' : '💬', 'Today’s Money Moment', momDone ? 'Done for today' : `30 seconds · +${XP.moment} XP`) : ''}
        ${story && !storyDone ? tile('story', '📰', 'This week in the market', `+${XP.story} XP`) : ''}
        ${C.kidsList().length > 1 ? tile('crewPick', '👯', 'Crew quiz', 'Answer side by side with a sibling') : ''}
      </div>
      <h2 class="gw-h2">${treesOn().length <= 3 ? 'Your Learning Tree' : 'Skill trees'}</h2>
      ${constellation(kid)}
      ${casesFor(kid).length ? `<h2 class="gw-h2">Real stories</h2><div class="gw-cases">${casesFor(kid).slice(0, 12).map(cs => `<button class="gw-case ${(prog(kid).cases || {})[cs.id] ? 'done' : ''}" data-g="case" data-id="${cs.id}" style="--th:${(TREE[cs.tree] || {}).hue || '#2F6FE4'}"><span>${esc(cs.icon)}</span><b>${esc(cs.name)}</b><small>${esc((TREE[cs.tree] || {}).name || '')}</small></button>`).join('')}</div>` : ''}
    </div>`;
}
// The 12 trees as a staggered constellation, 3 across and 4 down, each linked to its neighbours.
function constellation(kid) {
  const on = treesOn(), W = 600, H = 800;
  // With up to three live trees there's little to link, so each gets a big door into its part of the Learning Tree.
  if (on.length <= 3) {
    const door = t => { const st = treeStats(kid, t.id), nx = nextIn(kid, t.id); return `<button class="gw-one ${nx ? 'open' : ''}" style="--th:${t.hue}" data-g="tree" data-id="${t.id}"><span class="g1-ic">${t.icon}</span><span class="g1-t"><b>${esc(t.name)}</b><small>${esc(t.blurb)}</small><span class="g1-bar"><i style="width:${st.total ? st.done / st.total * 100 : 0}%"></i></span><small>${st.done} of ${st.total} lessons · ${t.id === 'money' ? (st.done ? 'See your tree grow' : 'Plant your seed') : st.done ? 'See your branch grow' : 'Start a new branch'}</small></span></button>`; };
    return `<div class="gw-ones">${on.map(door).join('')}</div>`;
  }
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
  say(nx ? `Next up in ${tree.name}: ${stop(local(nx.title))}` : st.total ? `You’ve done every ${tree.name} lesson for now!` : 'Lessons for this tree are on their way.');
  // Every subject is a plant. One whose lessons haven't loaded yet shows its seed and fills in once they arrive.
  if (PlantView.ok) {
    if (!pack) loadBand(band).then(() => C.scheduleRender());
    ui.innerHTML = topbar(kid, tree.name, `${esc(tree.blurb)} · ${st.done} of ${st.total} lessons`);
    const cel = Grow.celebrate; Grow.celebrate = null;
    PlantView.show(ui, kid, tree, cel && cel.split('.')[0] === tree.id ? cel : null); return;
  }
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
  Grow.run = { mode: 'challenge', unit: u, tree, scene: TREE[tree].scene, steps: [{ kind: 'intro', text: `Unit challenge: ${stop(local(u.title))} ${pool.length} mixed questions, no hints. ${passGoal(pool.length, true)} (80% or more) to win the crown.` }, ...pool.map((p, i) => ({ kind: 'check', item: p.item, i, qid: p.qid, skill: p.skill }))], k: 0, res: [], t0: Date.now() };
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
  // Scored runs tell the kid the pass mark up front and on every question, with how they're going
  const q = quizAt(R), scored = q && (R.mode === 'lesson' || R.mode === 'challenge') && !(R.mode === 'lesson' && passed(kid, l.id));
  const goalFor = n => (R.mode === 'challenge' ? `${passGoal(n, true)} to win the crown` : `${passGoal(n, true)} to pass and open the next lesson`);
  if (step.kind === 'hook') {
    const n = l.checks.length, goal = n && !passed(kid, l.id) ? `<p class="gw-goal">🎯 At the end there ${n === 1 ? 'is 1 question' : `are ${n} questions`}. ${goalFor(n)}.</p>` : '';
    body = `<div class="gw-card hook"><span class="gw-big">${esc(l.icon)}</span><h2>${esc(local(l.title))}</h2><p>${esc(local(l.hook))}</p>${goal}${speakBtn(l.hook)}<button class="g-go" data-g="next">Let’s go</button></div>`; say(l.hook);
  }
  else if (step.kind === 'intro') { body = `<div class="gw-card hook"><span class="gw-big">🏆</span><p>${esc(step.text)}</p><button class="g-go" data-g="next">Start</button></div>`; say('You’ve got this. No hints this time!'); }
  else if (step.kind === 'learn') { body = `<div class="gw-card learn">${step.title ? `<h3>${esc(step.title)}</h3>` : ''}${local(step.text).split('\n').map(p => `<p>${esc(p)}</p>`).join('')}${speakBtn(step.text)}<button class="g-go" data-g="next">Next</button></div>`; say(R.mode === 'lesson' ? ['Here’s the idea.', 'Got it?', 'Nearly there!'][Math.min(2, R.k % 3)] : ''); if (Grow.stage) Grow.stage.react('point'); }
  else if (step.kind === 'try') { body = `<div class="gw-card try">${step.ex ? `<div class="gw-ex"><b>Worked example</b><p>${esc(local(step.ex))}</p></div><p class="gw-yt">Now you try:</p>` : ''}<div class="gw-host"></div><div class="gw-fb"></div></div>`; say('Your turn to try one.'); }
  else if (step.kind === 'decide') { body = `<div class="gw-card"><h3>Decision point</h3><p class="gw-p2">${esc(local(step.q))}</p><div class="g-cards col n${step.opts.length}">${step.opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-g="decide" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div><div class="gw-fb"></div></div>`; say('What would you do?'); }
  else if (step.kind === 'home') { body = `<div class="gw-card home"><span class="gw-big">🏠</span><h3>Take it home</h3><p>${esc(local(l.home || 'Tell a grown-up one thing you learned today.'))}</p><button class="g-go" data-g="finish">Finish lesson</button></div>`; say('Last bit! Try this at home.'); }
  else {
    const bar = scored && step.kind === 'check' ? `<div class="gw-qgoal"><b>Question ${q.i} of ${q.n}</b><span>🎯 ${passGoal(q.n, true)} · ${q.right} right so far</span></div>` : '';
    body = `${bar}<div class="gw-card"><div class="gw-host"></div><div class="gw-fb"></div></div>`;
    say(step.kind === 'guess' ? 'Have a guess! It’s fine to get it wrong.' : step.kind === 'play' ? 'Game time!' : R.mode === 'review' ? `From “${local(step.title || '')}”` : scored && step.kind === 'check' && q.i === 1 ? `Question time! ${goalFor(q.n)}.` : '');
  }
  ui.innerHTML = `${head}<div class="gw-pad gw-runpad">${title}${body}</div>`;
  if (step.kind === 'learn') holdNext(ui.querySelector('.gw-card.learn [data-g="next"]'), 'learn' + R.k, kid, `${step.title || ''} ${local(step.text)}`);
  if (PlantView.ok) plantFor(kid, R, step);
  else if (Grow.stage) { const [kind, data] = stageFor(step, R) || []; Grow.stage.show(kind, data); }
  const host = ui.querySelector('.gw-host');
  if (host) {
    const ctx = { kid, mode: step.kind, cleanup: Grow.cleanup, fx: (e, d) => Grow.stage && Grow.stage.fx(e, d) };
    renderItem(step.item, host, ctx, res => answered(kid, step, res));
    const card = host.closest('.gw-card');
    if (card && HowTo.has(step.item)) {
      card.classList.add('has-how'); card.insertAdjacentHTML('afterbegin', '<button class="gw-howbtn" data-g="how" aria-label="How to play">?</button>');
      if (!HowTo.seen(kid, step.item) && R.mode !== 'challenge') HowTo.run(card, step.item, kid);
    }
  }
}
// Where a run's questions stand at its current step: this question's number, how many there are, and how many
// were answered right before it (and including it, once it's answered).
function quizAt(R) {
  const qs = R.steps.map((s, i) => (s.kind === 'check' ? i : -1)).filter(i => i >= 0); if (!qs.length) return null;
  return { n: qs.length, i: qs.filter(i => i <= R.k).length, right: qs.filter(i => i <= R.k && R.res[i] && R.res[i].ok).length, left: qs.filter(i => i > R.k).length };
}
/* Explanations (learn cards, why an answer was wrong, what a choice led to) hold their Next button until there's
   been time to read them: about 90 words a minute at 7 to 9, 140 at 10 to 12, and 190 at 13 to 15.
   The youngest hear them read out when read-aloud is on, so for them it's the voice's pace (about 130 words a
   minute) and Next also waits for the voice to finish. The button fills up as the time passes. A hold is kept per
   step, so drawing the step again doesn't restart it. */
const WPM = { sprouts: 90, builders: 140, makers: 190 }, VOICE_WPM = 130;
function holdNext(btn, key, kid, text) {
  const R = Grow.run, words = String(text || '').split(/\s+/).filter(w => /\w/.test(w)).length; if (!btn || !R || !words) return;
  const listen = GSET().readAloud && bandOf(kid) === 'sprouts' && 'speechSynthesis' in window;
  const ms = clamp(words / (listen ? VOICE_WPM : WPM[bandOf(kid)] || 140) * 60000, 1500, 30000);
  const hs = R.holds || (R.holds = {}), fresh = !hs[key], h = hs[key] || (hs[key] = { until: Date.now() + ms, ms, heard: !listen });
  if (fresh && listen) {
    speak(String(text).replace(/\p{Extended_Pictographic}/gu, '').trim(), () => { h.heard = true; });
    setTimeout(() => { h.heard = true; }, ms + 1500); // a voice that never starts or never ends doesn't lock the step
  }
  const open = () => Date.now() >= h.until && h.heard; if (open()) return;
  btn.disabled = true; btn.classList.add('hold'); btn.setAttribute('aria-label', 'Next, once you’ve had time to read this');
  btn.style.setProperty('--from', `${clamp(1 - (h.until - Date.now()) / h.ms, 0, 1) * 100}%`); btn.style.setProperty('--hold', `${Math.max(0, h.until - Date.now())}ms`);
  const t = setInterval(() => { if (!btn.isConnected) return clearInterval(t); if (open()) { clearInterval(t); btn.disabled = false; btn.classList.replace('hold', 'held'); btn.removeAttribute('aria-label'); } }, 200);
  Grow.cleanup.push(() => clearInterval(t));
}
// Which 3D scene acts out a step: the lesson's subject for hooks and learn cards, the task itself for questions and games.
function stageFor(step, R) {
  const l = R.lesson, it = step.item;
  if (step.kind === 'hook') return ['hook', { icon: l.icon, text: `${local(l.title)} ${local(l.hook)}` }];
  if (step.kind === 'learn') return ['idea', { text: `${step.title || ''} ${local(step.text)}`, icon: l ? l.icon : R.cs ? R.cs.icon : R.mode === 'story' ? '📈' : '💡' }];
  if (step.kind === 'home') return ['home', { text: local((l && l.home) || '') }];
  if (step.kind === 'intro') return ['intro', { n: R.steps.length - 1 }];
  if (step.kind === 'decide') return ['fork', { n: step.opts.length }];
  return it ? itemStage(it) : null;
}
function itemStage(it) {
  const jarC = Object.fromEntries((C.JARS || []).map(j => [j.label, j.color]));
  switch (it.type) {
    case 'mcq': return ['mcq', { n: it.opts.length, q: local(it.q) }];
    case 'island': return ['mcq', { n: 3, q: local(it.q || '') }];
    case 'tf': return ['tf', { q: local(it.q) }];
    case 'gap': return ['gap', { q: local(it.q), opts: it.opts }];
    case 'gen': return ['gap', { q: '' }];
    case 'sort': return ['sort', { bins: it.bins.map(b => local(b)), colors: it.bins.map((b, i) => (jarC[b] ? parseInt(String(jarC[b]).replace('#', ''), 16) : null)) }];
    case 'order': case 'build': return ['order', { n: it.steps.length, build: it.type === 'build' }];
    case 'match': case 'route': return ['match', { n: it.pairs.length, left: it.pairs.map(p => local(p[0])) }];
    case 'slider': return ['slider', { min: it.min, max: it.max, unit: it.unit, start: it.min }];
    case 'price': return ['price', { products: it.products }];
    case 'scam': return ['scam', {}];
    case 'path': return ['fork', { n: it.choices.length }];
    case 'debate': return ['debate', {}];
    case 'tap': return ['tap', { items: it.items.map(x => x.e) }];
    case 'budget': return ['budget', { cats: it.cats, income: it.income }];
    case 'market': return ['market', { years: it.years }];
    case 'compound': return ['snowball', { start: it.start }];
    case 'shop': return ['shop', { item: it.item }];
    case 'timing': return ['timing', { zone: it.zone }];
    case 'diff': return ['docs', { n: it.b.length }];
    case 'chat': return ['chat', {}];
    case 'mystery': return ['mystery', { n: it.clues.length }];
    default: return ['idea', { text: local(it.q || ''), icon: '💡' }];
  }
}
function answered(kid, step, res) {
  const R = Grow.run; R.res[R.k] = { ...res, kind: step.kind, step };
  const fb = ui.querySelector('.gw-fb'); if (!fb) return;
  const guess = step.kind === 'guess', grows = PlantView.ok && plantQuiz() && R.mode === 'lesson' && !passed(kid, R.lesson.id);
  const msg = guess ? (res.ok ? 'Great guess!' : 'Good guess. Let’s find out why.') : res.ok ? (grows ? ['Right! Your plant grew.', 'Yes! Up it grows.', 'Nice one. Look at it grow!'] : ['Nice one!', 'Spot on!', 'You got it!', 'Brilliant!'])[Math.floor(Math.random() * (grows ? 3 : 4))] : 'Not quite.';
  // After a scored question, say where that leaves the pass: made it, still possible, or not this time
  const q = step.kind === 'check' && (R.mode === 'challenge' || (R.mode === 'lesson' && !passed(kid, R.lesson.id))) ? quizAt(R) : null, need = q ? passNeed(q.n) : 0;
  const where = !q ? '' : res.ok && q.right === need ? `🎉 That’s ${need} right: you’ve passed!${q.left ? ' Keep going.' : ''}`
    : q.right + q.left < need ? `You need ${need} of ${q.n} right to pass. Finish, then tap Try again.`
    : !res.ok ? `You can still pass: get ${need - q.right} more right.` : '';
  const why = !res.ok && res.right && !guess ? res.right : '';
  fb.innerHTML = `<div class="gw-fbin ${res.ok || guess ? 'good' : 'bad'}"><b>${msg}</b>${why ? `<span>${esc(why)}</span>` : ''}</div>${where ? `<p class="gw-fbgoal">${where}</p>` : ''}<button class="g-go" data-g="next">${R.k + 1 >= R.steps.length ? 'Finish' : 'Next'}</button>`;
  if (why || where) holdNext(fb.querySelector('[data-g="next"]'), 'fb' + R.k, kid, `${why ? `${msg} ${why}` : ''} ${where}`);
  if (PlantView.ok) PlantView.answer(res.ok || guess); else if (Grow.stage) Grow.stage.react(res.ok || guess ? 'cheer' : 'puzzled');
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
  if (o.out) holdNext(fb.querySelector('[data-g="next"]'), 'dec' + R.k, kidNow(), local(o.out));
  Sound.pop(); if (PlantView.ok) PlantView.answer(true); else if (Grow.stage) { Grow.stage.react('point'); Grow.stage.fx('pick', { i }); }
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
  // Each source of XP is a row on the results screen
  let xp = 0; const rows = [], add = (label, n) => { if (n > 0) { rows.push([label, n]); xp += n; } };
  // Mastery history per skill and the questions a kid keeps missing (for the grown-ups' "Needs a hand")
  const skills = {}; for (const a of answers) if (a.skill) { const h = (skills[a.skill] ? skills[a.skill].h : ((g.skills || {})[a.skill] || {}).h || []).concat(a.ok ? 1 : 0).slice(-8); skills[a.skill] = { h }; }
  if (Object.keys(skills).length) patch.skills = skills;
  const wrong = {}; answers.filter(a => !a.ok).forEach(a => { wrong[a.q] = { n: (((g.wrong || {})[a.q] || {}).n || 0) + 1, q: a.text, at: Date.now() }; });
  const wkeys = Object.keys(g.wrong || {}).filter(k => (g.wrong[k] || {}).at); if (wkeys.length > 40) wkeys.sort((a, b) => g.wrong[a].at - g.wrong[b].at).slice(0, wkeys.length - 30).forEach(k => { wrong[k] = null; });
  if (Object.keys(wrong).length) patch.wrong = wrong;

  if (R.mode === 'lesson') {
    const prev = (g.done || {})[l.id], was = prev && prev.best >= 0.8, pass = acc >= 0.8, stars = pass ? (acc === 1 && playScore >= 0.8 ? 3 : 2) : 1;
    if (pass && !was) { add('Lesson passed', XP.lesson); if (acc === 1) add('Every answer right', XP.perfect); } else if (pass) add('Practice round', XP.replay);
    const as = (g.assigned || []).find(a => a.id === l.id); if (pass && as) { add('Bonus from a grown-up', Math.min(XP.assignedMax, as.bonus || 0)); patch.assigned = (g.assigned || []).filter(a => a.id !== l.id); }
    patch.done = { [l.id]: { best: Math.max(prev ? prev.best : 0, acc), stars: Math.max(prev ? prev.stars : 0, stars), n: (prev ? prev.n : 0) + 1, at: Date.now() } };
    if (pass && !was) { patch.cards = {}; l.checks.forEach((_, i) => { patch.cards[`${l.id}#${i}`] = { b: 1, due: addDays(today(), 1) }; }); }
    const u = packFor(l.tree, l.band).units.find(x => x.n === l.unit), unitDone = pass && u.lessons.every(x => x === l || passed(kid, x.id));
    if (unitDone && !(g.mile || {})[l.tree]) patch.mile = { [l.tree]: today() };
    Object.assign(out, { pass, stars, first: pass && !was, unitDone, home: l.home, lesson: l, could: was ? XP.replay : XP.lesson, game: playRes ? playScore : null });
  } else if (R.mode === 'challenge') {
    const prev = (g.units || {})[R.unit.id] || {}, pass = acc >= 0.8;
    if (pass && !(prev.best >= 0.8)) add('Unit challenge passed', XP.challenge);
    patch.units = { [R.unit.id]: { best: Math.max(prev.best || 0, acc), at: Date.now() } };
    Object.assign(out, { pass, stars: pass ? (acc === 1 ? 3 : 2) : 1, unit: R.unit, crown: pass && !(prev.best >= 0.8) });
  } else if (R.mode === 'review') {
    const room = Math.max(0, XP.cardsPerDay - (day.cards || 0)), n = Math.min(right, room); add(`${n} card${n === 1 ? '' : 's'} remembered`, n * XP.card); patch.day.cards = (day.cards || 0) + total;
  } else if (R.mode === 'moment') {
    const first = !(g.mom && g.mom.d === today() && g.mom.done); if (first) add('Today’s Money Moment', XP.moment);
    patch.mom = { d: today(), id: R.moment.id, done: true, ok: right === total }; patch.momH = { [R.moment.id]: today() };
  } else if (R.mode === 'echo') {
    const ids = R.steps.map(s => s.echo); add(`${total} question${total === 1 ? '' : 's'} about your week`, total * XP.echo); patch.echo = (g.echo || []).filter(e => !ids.includes(e.id));
  } else if (R.mode === 'story') {
    if (g.story !== weekKey()) add('This week in the market', XP.story); patch.story = weekKey();
  } else if (R.mode === 'case') {
    if (!(g.cases || {})[R.cs.id]) add('Real story read', XP.caseStudy); patch.cases = { [R.cs.id]: today() };
  }
  const lvl0 = charLevel(kid), titles0 = titles(kid).length, given = Math.max(0, Math.min(xp, XP.dayCap - day.xp));
  if (given < xp) rows.push(['Over today’s XP limit', given - xp]);
  // A first pass keeps what it earned, for the lesson's leaf on the plant
  if (out.first) patch.done[l.id].xp = given;
  const itemId = l ? l.id : R.mode === 'challenge' ? R.unit.id : R.mode === 'case' ? R.cs.id : R.mode === 'moment' ? R.moment.id : R.mode;
  patch.log = [...(g.log || []).slice(-59), { id: itemId, kind: R.mode, c: right, t: total, xp: given, at: Date.now(), ms }];
  award(kid, xp, patch);
  if (out.first || out.crown) out.prize = Prize.onPass(kid, out.first ? l.id : null);
  Object.assign(out, { xp: given, rows, capped: given < xp, lvlUp: charLevel(kid) > lvl0 ? charLevel(kid) : 0, newTitle: titles(kid).length > titles0 ? titles(kid).slice(-1)[0] : '' });
  const [tree, band, unit] = String(itemId).split('.');
  C.track('growth.attempt', { kind: R.mode, id: itemId, tree: l ? l.tree : R.tree || null, band: l ? l.band : bandOf(kid), unit: l ? String(l.unit) : R.mode === 'challenge' ? unit : null, correct: right, total, xp: given, ms, answers: answers.map(a => ({ q: a.q, ok: a.ok, skill: a.skill })) }, kid.id);
  Grow.last = out; Grow.view = 'done'; Grow.cleanup.splice(0).forEach(f => f());
  if (out.first && l) Grow.celebrate = l.id;
  render();
}
function celebrate(o) {
  const cheer = () => { if (PlantView.ok) PlantView.answer(true); else if (Grow.stage) Grow.stage.react('cheer'); };
  if ((o.pass && (o.stars === 3 || o.unitDone)) || o.lvlUp || o.prize) { Sound.fanfare(); FX.rain(['#FFE066', '#fff', '#7CF5B5', '#9BD8FF', '#FF9FC6']); cheer(); }
  else if (o.pass || !('pass' in o)) { Sound.coin(); cheer(); }
}

/* ---------- Results: scored like a finished chore ----------
   The meter fills to the share of answers right while the stars slam in (one for finishing, two at 80%, three for
   every answer right and a good game score), then each source of XP counts up into the big total, and the verdict,
   the kid's XP balance and what's next appear. A tap skips to the end; drawing the screen again shows it finished. */
const ACC_TH = [0, 0.8, 1];
const signed = n => (n < 0 ? '−' : '+') + Math.abs(Math.round(n)).toLocaleString();
function viewDone(kid) {
  const o = Grow.last, isScored = 'pass' in o, fin = !!o.tally, rows = o.rows || [];
  if (!fin) o.tally = { fast: false, done: false };
  const head = isScored ? (o.pass ? (o.stars === 3 ? 'Perfect!' : 'You passed!') : 'Nearly there!') : { review: 'Reviews done!', moment: 'Moment done!', echo: 'Thanks for thinking it through!', story: 'Market story done!', case: 'Story complete!' }[o.mode] || 'Done!';
  // Kids are told exactly what moving on takes, and whether it's open now
  const need = passNeed(o.total), opened = o.first && o.lesson && nextIn(kid, o.lesson.tree);
  const sub = !isScored ? '' : !o.pass ? `You got ${o.right} of ${o.total}. To ${o.mode === 'challenge' ? 'win the crown' : 'open the next lesson'}, you need ${need} of ${o.total} right (that’s 80% or more). Tap Try again: practice is how brains grow!${o.could ? ` Passing earns ${o.could} XP.` : ''}`
    : o.stars === 2 && o.acc === 1 && o.game != null ? 'Every answer right! Score 80% in the game for the third star.' : opened ? 'New skill mastered! The next lesson is open.' : o.first ? 'New skill mastered!' : '';
  const bal = C.xpOf ? C.xpOf(kid).left : 0, day = dayInfo(kid), nx = suggestions(kid, 1)[0];
  say(isScored && !o.pass ? `So close! You need ${need} of ${o.total} right. Tap Try again.` : o.lvlUp ? `Level ${o.lvlUp}! You’re growing fast.` : opened ? 'Great work! The next lesson is open.' : 'Great work!');
  if (PlantView.ok && Grow.run) plantFor(kid, Grow.run, Grow.run.steps[Grow.run.k], o.first ? o.lesson.id : null);
  else if (Grow.stage) Grow.stage.show('done', { stars: isScored ? o.stars : 3, pass: o.pass !== false, quiet: true });
  ui.innerHTML = `<div class="gw-pad gw-done"><div class="gw-res" data-g="tallySkip">
    ${isScored ? `<div class="rstars" role="img" aria-label="${o.stars} of 3 stars">${[1, 2, 3].map(n => `<span class="rstar ${fin && n <= o.stars ? 'on' : ''}" data-star="${n}">${C.STAR_SOCK}${C.starGold('g' + n)}</span>`).join('')}</div>` : ''}
    <div class="res-score num" data-total>${fin ? signed(o.xp) : '+0'}</div><div class="res-lbl">XP earned</div>
    ${o.total ? `<div class="res-meter" aria-hidden="true"><i data-fill style="width:${fin ? o.acc * 100 : 0}%"></i>${isScored ? ACC_TH.slice(1).map((t, i) => `<span class="res-notch ${fin && i + 2 <= o.stars ? 'on' : ''}" data-notch="${i + 2}" style="left:${t * 100}%">${C.STAR_SOCK}</span>`).join('') : ''}</div>
      <p class="gw-acc"><b class="num" data-right>${fin ? o.right : 0}</b> of ${o.total} right</p>` : ''}
    <p class="res-verdict" data-verdict>${fin ? head : ''}</p>
    ${rows.length ? `<div class="res-rows">${rows.map(([lb, v], i) => `<div class="res-row ${fin ? 'done' : ''} ${v < 0 ? 'minus' : ''}" data-row="${i}"><span>${esc(lb)}</span><b class="num">${fin ? signed(v) : '+0'}</b></div>`).join('')}</div>` : ''}
    </div>
    <div class="res-end" data-end ${fin ? '' : 'hidden'}>
    ${sub ? `<p class="gw-p">${sub}</p>` : ''}
    <div class="res-pay"><span>XP to spend on your island</span><b class="num">${bal.toLocaleString()}</b><small>${o.capped ? 'You reached today’s XP limit. Learning still counts!' : `${day.xp} of ${XP.dayCap} XP from learning today`}</small></div>
    ${o.lvlUp ? `<div class="gw-banner lvl">⬆️ Level ${o.lvlUp}!</div>` : ''}
    ${prizeBanner(o, kid)}
    ${o.unitDone ? `<div class="gw-banner unit">🏆 Unit complete! A ring grows on your plant, and the unit challenge is open.</div>` : ''}
    ${o.first && o.lesson && treeStats(kid, o.lesson.tree).done === treeStats(kid, o.lesson.tree).total ? `<div class="gw-banner title">🌸 Every lesson done! Go back to your plant to watch it bloom.</div>` : ''}
    ${o.newTitle ? `<div class="gw-banner title">🎖️ New title: ${esc(o.newTitle)}</div>` : ''}
    ${o.home && o.pass ? `<div class="gw-homecard"><b>Take it home</b><p>${esc(local(o.home))}</p><button class="g-go ghost" data-g="homeDone">I’ll try it</button></div>` : ''}
    <div class="gw-actions">${isScored && !o.pass ? `<button class="g-go" data-g="retry">Try again</button>` : nx && o.mode === 'lesson' ? `<button class="g-go" data-g="lesson" data-id="${nx.id}">Next: ${esc(local(nx.title))}</button>` : ''}
      <button class="g-go ghost" data-g="${Grow.tree ? 'toTree' : 'toHub'}">${Grow.tree ? `Back to ${esc(TREE[Grow.tree].name)}` : 'Back to my skill trees'}</button></div></div></div>`;
  if (fin) o.tally.done = true; else runTally(o, ui.querySelector('.gw-done'), head);
}
async function runTally(o, el, head) {
  const T0 = o.tally, rows = o.rows || [], stars = 'pass' in o ? o.stars : 0;
  const $t = el.querySelector('[data-total]'), $f = el.querySelector('[data-fill]'), $n = el.querySelector('[data-right]');
  const alive = () => Grow.open && Grow.view === 'done' && Grow.last === o && o.tally === T0 && el.isConnected, fast = () => T0.fast || reduced;
  // Counts from 0 to 1 over dur ms with an ease-out, ticking as it goes; at once when skipped.
  const run = (dur, fn) => new Promise(res => {
    const start = performance.now(); let tick = 0;
    const f = now => {
      if (!alive()) return res();
      const k = fast() ? 1 : clamp((now - start) / dur, 0, 1), e = 1 - (1 - k) * (1 - k); fn(e);
      if (k < 1 && now - tick > 50) { tick = now; Sound.tick(e); $t.classList.remove('tick'); void $t.offsetWidth; $t.classList.add('tick'); }
      if (k < 1) requestAnimationFrame(f); else res();
    };
    requestAnimationFrame(f);
  });
  const earn = k => {
    const s = el.querySelector(`[data-star="${k}"]`), n = el.querySelector(`[data-notch="${k}"]`); if (!s) return;
    if (n) n.classList.add('on'); s.classList.add('on');
    if (!fast()) s.querySelector('.rs-gold').animate([{ transform: 'scale(2.4) rotate(-120deg)', opacity: 0 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.42 }, { transform: 'scale(1.18)', offset: 0.6 }, { transform: 'scale(.94)', offset: 0.8 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, easing: 'cubic-bezier(.3,.7,.4,1)' });
    setTimeout(() => { if (!alive()) return; Sound.star(k); const r = s.getBoundingClientRect(); FX.burst(r.left + r.width / 2, r.top + r.height / 2, ['#FFE066', '#fff', '#7CF5B5'], k === 3 ? 26 : 14); }, fast() ? 0 : 300);
  };
  let queued = 0, chain = Promise.resolve();
  const want = k => { if (k <= queued) return; queued = k; chain = chain.then(() => { if (alive()) earn(k); return sleep(fast() ? 120 : 330); }); };
  const reach = m => { for (let k = queued + 1; k <= stars && m >= ACC_TH[k - 1] - 1e-9; k++) want(k); };
  Sound.whoosh(); await sleep(fast() ? 0 : 450); if (!alive()) return;
  if ($f) await run(clamp(o.total * 140, 500, 1100), e => { const m = o.acc * e; $f.style.width = m * 100 + '%'; $n.textContent = Math.round(o.right * e); reach(m); });
  for (let k = queued + 1; k <= stars; k++) want(k);
  await chain; if (!alive()) return;
  let total = 0;
  for (let i = 0; i < rows.length; i++) {
    const v = rows[i][1], row = el.querySelector(`[data-row="${i}"]`), cell = row.querySelector('b'), t0 = total;
    row.classList.add('live');
    await run(clamp(Math.abs(v) * 14, 350, 900), e => { cell.textContent = signed(v * e); $t.textContent = signed(t0 + v * e); });
    if (!alive()) return;
    total += v; row.classList.replace('live', 'done');
    if (!fast()) await sleep(140);
  }
  $t.textContent = signed(o.xp);
  await sleep(fast() ? 0 : 200); if (!alive()) return;
  T0.done = true;
  el.querySelector('[data-verdict]').textContent = head;
  const end = el.querySelector('[data-end]'); end.hidden = false; end.classList.add('in');
  celebrate(o);
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
    case 'locked': Sound.tap(); return C.toast('Pass the lesson before this one to open it: get 80% or more of its questions right.');
    case 'plantSel': return PlantView.ok && PlantView.select(+a.dataset.i);
    case 'plantUnit': return PlantView.ok && PlantView.unit(+a.dataset.i);
    case 'plantBloom': return PlantView.ok && PlantView.bloomAgain();
    case 'plantOver': return PlantView.ok && PlantView.overview(false);
    case 'how': case 'howAgain': { const R = Grow.run, step = R && R.steps[R.k]; if (step && step.item) HowTo.run(a.closest('.gw-card'), step.item, kid, { again: true }); return; }
    case 'howSkip': case 'howDone': return HowTo.finish(a.closest('.gw-card'));
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
    case 'tallySkip': if (Grow.last && Grow.last.tally) Grow.last.tally.fast = true; return;
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
      <span class="cg-txt"><small>${sug ? `Next · ${esc(TREE[sug.tree].name)}` : ready ? 'All caught up' : 'Loading your skill trees…'}</small><b>${sug ? `${esc(sug.icon)} ${esc(local(sug.title))}` : (TREES.length === 1 ? `Start ${esc(TREES[0].name)}` : `Explore your ${TREES.length} skill trees`)}</b><span class="cg-bar"><i style="width:${Math.min(100, d.xp / XP.dayCap * 100)}%"></i></span><small>${d.xp} of ${XP.dayCap} XP earned from lessons today</small></span></button>
    ${due || echo ? `<div class="cg-chips">${due ? `<button data-act="gOpen" data-id="${kid.id}">🔁 ${due} review${due === 1 ? '' : 's'} due</button>` : ''}${echo ? `<button data-act="gOpen" data-id="${kid.id}">💡 ${echo} question${echo === 1 ? '' : 's'} about your week</button>` : ''}</div>` : ''}
  </section>`;
}
// How many things are waiting for the kid: reviews due, questions about their week and lessons a grown-up set.
function waiting(kid) {
  if (!ensureLoaded(kid)) return 0; const g = prog(kid);
  return dueCards(kid).length + (g.echo || []).length + (g.assigned || []).filter(a => !passed(kid, a.id)).length;
}
let echoScanAt = {};
function scanEchoesSoon(kid) { const t = Date.now(); if (t - (echoScanAt[kid.id] || 0) < 60000) return; echoScanAt[kid.id] = t; setTimeout(() => scanEchoes(kid), 0); }
function momentCard(kid) {
  ensureLoaded(kid); const m = Moments.length ? momentFor(kid) : null, g = prog(kid), done = g.mom && g.mom.d === today() && g.mom.done;
  if (!m) return '';
  return `<button class="cg-moment ${done ? 'done' : ''}" data-act="gMoment" data-id="${kid.id}"><span>${done ? '✅' : '💬'}</span><span><small>Today’s Money Moment${done ? ' · done' : ` · +${XP.moment} XP`}</small><b>${esc(local(m.text)).slice(0, 110)}${m.text.length > 110 ? '…' : ''}</b></span></button>`;
}
function treeDoor(kid, treeId) {
  const t = TREE[treeId]; if (!t) return ''; // parked trees have no door
  ensureLoaded(kid); const st = treeStats(kid, treeId);
  return `<button class="cg-door" data-act="gOpen" data-id="${kid.id}" data-tree="${treeId}" style="--th:${t.hue}"><span>${t.icon}</span><span><b>${esc(t.name)} skill tree</b><small>${st.done} of ${st.total} lessons · Rank: ${investorRank(kid)}</small></span>${ic('next')}</button>`;
}
C.ACT.gMoment = a => { open(a.dataset.id, {}).then(() => { const k = Store.kids[a.dataset.id]; if (k && momentFor(k)) startMoment(k); }); };

window.Growth = {
  card, momentCard, treeDoor, hasLesson, onEvent, open, close, waiting,
  investorRank: kid => `<span class="card-r">Rank: ${investorRank(kid)}</span>`,
  mastered: kid => mastered(kid),
  parentView: () => parentView(), resetParent: () => { if (Grow.parent) Grow.parent.msg = ''; },
  ready: () => C.scheduleRender(),
  _debug: { Packs, TREES, parsePack, parseMoments, parseCases, loadBand, loadExtras, allLessons, lessonById, get Moments() { return Moments; }, get Cases() { return Cases; } },
};


// The kid's guide (Kiri the kea, Coco the cockatoo or Bolt the robot), shared by the lesson stage and the plant.
const GUIDE_GEO = {};
function guideModel(kind, toon) {
  const T = window.THREE, G3 = C.G3;
  if (!GUIDE_GEO.s) Object.assign(GUIDE_GEO, { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18) });
  const basic = c => new T.MeshBasicMaterial({ color: c });
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(GUIDE_GEO[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const g = new T.Group(), P = {};
  if (kind === 'robot') {
    P.body = part(g, 'b', toon(0x4a78d4), [0, 0.62, 0], [0.62, 0.66, 0.5]);
    P.head = new T.Group(); P.head.position.set(0, 1.2, 0); g.add(P.head);
    part(P.head, 'b', toon(0x6c96e6), [0, 0.12, 0], [0.56, 0.42, 0.46]);
    P.eyeL = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [-0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
    P.eyeR = part(P.head, 's', toon(0x7ff4ff, { e: 0x2bb4c4 }), [0.13, 0.15, 0.24], [0.07, 0.07, 0.03]);
    part(P.head, 'c', toon(0x9aa3b5), [0, 0.42, 0], [0.02, 0.22, 0.02]);
    P.tip = part(P.head, 's', new T.MeshToonMaterial({ color: 0xff5a5a, gradientMap: G3.GRAD, emissive: 0x8a1010 }), [0, 0.56, 0], [0.06, 0.06, 0.06]);
    P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, 0); g.add(P.wingL); part(P.wingL, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
    P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, 0); g.add(P.wingR); part(P.wingR, 'b', toon(0x3a64bc), [0, -0.2, 0], [0.12, 0.42, 0.14]);
    part(g, 'c', toon(0x2c3e66), [-0.16, 0.14, 0], [0.09, 0.28, 0.09]); part(g, 'c', toon(0x2c3e66), [0.16, 0.14, 0], [0.09, 0.28, 0.09]);
  } else {
    const cocky = kind === 'cocky', body = cocky ? 0xe9edf2 : 0x5f7f2c, belly = cocky ? 0xf6f7fa : 0x7f9e3a, wing = cocky ? 0xdfe5ee : 0x4e6c23, under = cocky ? 0xffe06a : 0xe2702a;
    P.body = part(g, 's', toon(body), [0, 0.62, 0], [0.42, 0.52, 0.38]);
    part(g, 's', toon(belly), [0, 0.55, 0.16], [0.3, 0.38, 0.26]);
    P.head = new T.Group(); P.head.position.set(0, 1.18, 0.02); g.add(P.head);
    part(P.head, 's', toon(body), [0, 0, 0], [0.32, 0.3, 0.3]);
    P.eyeL = part(P.head, 's', new T.MeshToonMaterial({ color: 0x1b1b22, gradientMap: G3.GRAD }), [-0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
    P.eyeR = part(P.head, 's', P.eyeL.material, [0.13, 0.05, 0.24], [0.05, 0.06, 0.04]);
    part(P.head, 's', basic(0xffffff), [-0.115, 0.075, 0.27], [0.015, 0.015, 0.01]); part(P.head, 's', basic(0xffffff), [0.145, 0.075, 0.27], [0.015, 0.015, 0.01]);
    part(P.head, 'k', toon(cocky ? 0x3a3a44 : 0x44464f), [0, -0.06, 0.3], [0.08, 0.2, 0.09], [Math.PI * 0.62, 0, 0]);
    if (cocky) for (let i = 0; i < 5; i++) part(P.head, 'k', toon(0xffd23b), [(i - 2) * 0.05, 0.3 + (2 - Math.abs(i - 2)) * 0.05, -0.06 - i * 0.02], [0.05, 0.3, 0.05], [-0.5 - i * 0.12, 0, (i - 2) * -0.25]);
    else part(P.head, 's', toon(0x6e8f30), [0, 0.2, -0.08], [0.12, 0.08, 0.16]);
    P.wingL = new T.Group(); P.wingL.position.set(-0.36, 0.82, -0.02); g.add(P.wingL);
    part(P.wingL, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingL, 's', toon(under), [0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
    P.wingR = new T.Group(); P.wingR.position.set(0.36, 0.82, -0.02); g.add(P.wingR);
    part(P.wingR, 's', toon(wing), [0, -0.22, 0], [0.12, 0.34, 0.24]); part(P.wingR, 's', toon(under), [-0.03, -0.3, 0.02], [0.08, 0.2, 0.17]);
    part(g, 'k', toon(wing), [0, 0.35, -0.36], [0.16, 0.5, 0.08], [-1.9, 0, 0]);
    for (const x of [-0.13, 0.13]) part(g, 'c', toon(0x777a85), [x, 0.12, 0.05], [0.035, 0.22, 0.035]);
  }
  return { g, P };
}

/* ---------- 3D stage: the kid's guide on a floating island, and a 3D scene for every step of a lesson ----------
   Same cel look as the islands: toon shading and even ink outlines. The guide stands to one side and reacts with
   classic animation moves (anticipation, squash and stretch, follow-through) while the middle of the island acts
   out the step: the idea in a learn card (piggy banks, price tags, pies of percentages, coin stacks), or the task
   itself (jars to sort into, stepping stones to put in order, answer plinths, a balance scale), reacting to every
   tap the kid makes. Scenes are built from the step's own words and data, so new lessons get them for free. */
function Stage3D(canvas) {
  const T = window.THREE, G3 = C.G3; if (!T || !G3 || !G3.ok) return null;
  let R; try { R = new T.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return null; }
  const pace = G3.pacer ? G3.pacer(R, 2) : (R.setPixelRatio(Math.min(2, devicePixelRatio || 1)), () => {}); R.setClearColor(0, 0);
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(34, 1, 0.1, 100);
  scene.add(new T.HemisphereLight(0xffffff, 0x7d95e8, 0.85));
  const sun = new T.DirectionalLight(0xfff3dc, 0.85); sun.position.set(-3, 6, 5); scene.add(sun);
  const MAT = {}, toon = (c, o = {}) => { const k = c + JSON.stringify(o); if (MAT[k]) return MAT[k]; const m = new T.MeshToonMaterial({ color: c, gradientMap: G3.GRAD, emissive: o.e || 0 }); G3.rimPatch(m); m.userData.keep = 1; return (MAT[k] = m); };
  const basic = (c, op) => new T.MeshBasicMaterial({ color: c, transparent: op != null, opacity: op ?? 1 });
  const geo = { s: new T.SphereGeometry(1, 24, 16), c: new T.CylinderGeometry(1, 1, 1, 24), b: new T.BoxGeometry(1, 1, 1), k: new T.ConeGeometry(1, 1, 18), t: new T.TorusGeometry(1, 0.12, 10, 32), d: new T.DodecahedronGeometry(1, 0), c6: new T.CylinderGeometry(1, 1, 1, 6) };
  // r128 geometries and textures have no userData of their own, so the keep flag gets its own object.
  const keep = o => { o.userData = { ...(o.userData || {}), keep: 1 }; return o; };
  Object.values(geo).forEach(keep);
  const part = (g, shape, mat, [x, y, z] = [0, 0, 0], [sx, sy, sz] = [1, 1, 1], rot) => { const m = new T.Mesh(geo[shape], mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); if (rot) m.rotation.set(...rot); if (g) g.add(m); return m; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new T.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; };

  // Floating island the guide and the lesson stand on
  const world = new T.Group(); scene.add(world);
  const isle = new T.Group(); world.add(isle);
  part(isle, 'c', toon(0x58b84a), [0, -0.05, 0], [2.75, 0.18, 1.7]);
  part(isle, 'c', toon(0x8a5a3c), [0, -0.2, 0], [2.7, 0.16, 1.66]);
  part(isle, 'k', toon(0x7a5536), [0, -0.85, 0], [2.55, 1.2, 1.55], [Math.PI, 0, 0]);
  G3.outline(isle);

  /* ---- Tweens, labels and little animation verbs ---- */
  const E = { out: t => 1 - (1 - t) ** 3, back: t => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2, io: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), lin: t => t,
    bounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375; return n * (t -= 2.625 / d) * t + 0.984375; } };
  const tws = new Set();
  const tw = (ms, fn, e = E.out) => new Promise(res => tws.add({ t0: performance.now(), d: Math.max(1, ms * (reduced ? 0.25 : 1)), fn, e, res }));
  const wait = ms => new Promise(r => setTimeout(r, ms * (reduced ? 0.25 : 1)));
  const TX = new Map(), EX = new Map();
  function textTex(text, fg, bg) {
    const key = `${text}|${fg}|${bg}`; if (TX.has(key)) return TX.get(key);
    const fs = 56, pad = 26, F = `900 ${fs}px Nunito, ui-rounded, system-ui, sans-serif`, m = document.createElement('canvas').getContext('2d'); m.font = F;
    const W = Math.ceil(m.measureText(text).width) + pad * 2, H = fs + 30, c = document.createElement('canvas'); c.width = W + 10; c.height = H + 10;
    const x = c.getContext('2d'), r = H / 2; x.translate(5, 5); x.beginPath(); x.moveTo(r, 0); x.arcTo(W, 0, W, H, r); x.arcTo(W, H, 0, H, r); x.arcTo(0, H, 0, 0, r); x.arcTo(0, 0, W, 0, r); x.closePath();
    x.fillStyle = bg; x.fill(); x.lineWidth = 5; x.strokeStyle = '#2b2238'; x.stroke(); x.font = F; x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 3);
    const tex = keep(new T.CanvasTexture(c)); const v = { tex, a: c.width / c.height }; TX.set(key, v); return v;
  }
  function label(text, o = {}) { const s = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false })); s.renderOrder = 5; s.userData.h = o.h || 0.24; setLabel(s, text, o); return s; }
  function setLabel(s, text, o = {}) { const v = textTex(String(text), o.fg || '#0D1530', o.bg || '#ffffff'); s.material.map = v.tex; s.material.needsUpdate = true; s.scale.set(s.userData.h * v.a, s.userData.h, 1); }
  function emoji(e, h = 0.45) {
    let t = EX.get(e);
    if (!t) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '100px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72); t = keep(new T.CanvasTexture(c)); EX.set(e, t); }
    const s = new T.Sprite(new T.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(h, h, 1); s.renderOrder = 4; return s;
  }
  const STAR = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.translate(32, 32); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); return keep(new T.CanvasTexture(c)); })();
  const clip = (s, n = 18) => { s = local(String(s || '')).trim(); if (s.length <= n) return s; const c = s.slice(0, n - 1), w = c.replace(/\s+\S*$/, ''); return (w.length > 6 ? w : c) + '…'; };
  const PAL = [0x3b9bf0, 0xf0588f, 0x2fb257, 0xffb020, 0xa66bff, 0xff7a45, 0x18b597, 0xe5533d];
  const hexCss = c => '#' + c.toString(16).padStart(6, '0');
  const X0 = 0.55, spread = (n, w) => Array.from({ length: n }, (_, i) => X0 + (n === 1 ? 0 : (i / (n - 1) - 0.5) * w));
  // Outline once, then mark everything so a later outline of the whole scene doesn't add a second hull.
  const ink = o => { G3.outline(o); o.traverse(m => { if (m.isMesh && !m.userData.ink) m.userData.noInk = true; }); return o; };
  const coinM = toon(0xffc93c, { e: 0x5a3a00 });
  const coin = () => ink(part(null, 'c', coinM, [0, 0, 0], [0.12, 0.035, 0.12]));
  function pop(o, s = o.userData.full || (o.userData.full = o.scale.clone()), ms = 420, delay = 0) { const full = s.isVector3 ? s.clone() : new T.Vector3(s, s, s); o.scale.setScalar(0.001); o.visible = true; return wait(delay).then(() => tw(ms, k => o.scale.copy(full).multiplyScalar(Math.max(0.001, k)), E.back)); }
  function bounce(o, amt = 0.22) { const s0 = o.userData.s0 || (o.userData.s0 = o.scale.clone()); return tw(420, k => { const q = Math.sin(k * Math.PI) * (1 - k * 0.4); o.scale.set(s0.x * (1 - q * amt * 0.5), s0.y * (1 + q * amt), s0.z * (1 - q * amt * 0.5)); }, E.lin).then(() => o.scale.copy(s0)); }
  function shake(o) { const r0 = o.userData.r0 ?? (o.userData.r0 = o.rotation.z); return tw(460, k => { o.rotation.z = r0 + Math.sin(k * Math.PI * 6) * 0.14 * (1 - k); }, E.lin).then(() => { o.rotation.z = r0; }); }
  function lift(o, to, ms = 380) { const y0 = o.position.y; return tw(ms, k => { o.position.y = y0 + (to - y0) * k; }, E.back); }
  function fly(o, to, h = 0.8, ms = 520, spin = true) { const from = o.position.clone(); return tw(ms, k => { o.position.lerpVectors(from, to, k); o.position.y += Math.sin(Math.PI * k) * h; if (spin) o.rotation.x = k * Math.PI * 2; }, E.io); }
  function drop(o, ms = 560, h = 2.4) { const y = o.position.y; o.position.y = y + h; return tw(ms, k => { o.position.y = y + h * (1 - k); }, E.bounce); }
  function burst(parent, pos, color = 0xffe066, n = 10) {
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: STAR, color, transparent: true, depthWrite: false })); s.position.copy(pos); s.renderOrder = 9; parent.add(s);
      const a = i / n * Math.PI * 2 + Math.random() * 0.4, d = new T.Vector3(Math.cos(a), 0.6 + Math.random() * 0.8, Math.sin(a) * 0.5).multiplyScalar(0.5 + Math.random() * 0.4);
      tw(700 + Math.random() * 300, k => { s.position.copy(pos).addScaledVector(d, k); s.material.opacity = 1 - k; s.scale.setScalar(0.22 * (1 - k * 0.6)); }).then(() => { parent.remove(s); s.material.dispose(); });
    }
  }
  const glow = (m, on, c = 0x3a2a00) => { if (!m.material) return; if (!m.userData.lit) { m.material = m.material.clone(); m.userData.lit = 1; } m.material.emissive.setHex(on ? c : 0); };
  const tick = (o, fn) => { o.userData.tick = fn; return o; };

  function buildGuide(kind) { const r = guideModel(kind, toon); G3.outline(r.g); return r; }
  let guide = null, guideKind = '';
  const holder = grp(world, 0, 0, 0.1); // moves the guide aside while a lesson scene is showing
  function setGuide(kind) {
    if (kind === guideKind) return; guideKind = kind;
    if (guide) holder.remove(guide.g);
    guide = buildGuide(kind); holder.add(guide.g);
  }
  // Wide stages put the guide beside the scene; tall ones tuck it in behind, so the scene can fill the width.
  let aside = false, tallLayout = false;
  function guideAside(on) {
    aside = on; const x0 = holder.position.x, z0 = holder.position.z, s0 = holder.scale.x, x1 = on ? (tallLayout ? -1.3 : -1.95) : 0, z1 = on && tallLayout ? -0.7 : 0.1, s1 = on ? (tallLayout ? 0.7 : 0.82) : 1;
    if (x0 === x1 && z0 === z1) return; tw(520, k => { holder.position.x = x0 + (x1 - x0) * k; holder.position.z = z0 + (z1 - z0) * k; holder.scale.setScalar(s0 + (s1 - s0) * k); }, E.io);
  }

  // Scene props, a few chunky shapes each. While a lesson scene shows, they step back to set the scene.
  const PROPS = {
    bank: g => { part(g, 'c', toon(0x8d97ab), [-1.25, 0.62, -0.35], [0.5, 0.12, 0.5], [Math.PI / 2, 0, 0]); for (let i = 0; i < 4; i++) part(g, 'b', toon(0x5d6578), [-1.25, 0.62, -0.27], [0.06, 0.62, 0.06], [0, 0, i * Math.PI / 4]); for (let i = 0; i < 5; i++) part(g, 'c', toon(0xd9a400), [1.1, 0.06 + i * 0.09, -0.2], [0.22, 0.04, 0.22]); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xd9a400), [1.45, 0.06 + i * 0.09, 0.1], [0.22, 0.04, 0.22]); },
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
  const setRoot = grp(world), subjRoot = grp(world);
  function setScene(key) {
    if (key === sceneKey) return; sceneKey = key;
    if (props) setRoot.remove(props);
    props = new T.Group(); (PROPS[key] || PROPS.island)(props); G3.outline(props); setRoot.add(props);
    props.scale.setScalar(0.01); props.userData.pop = performance.now();
  }
  function setBack(on) { const z0 = setRoot.position.z, z1 = on ? -1.05 : 0, s0 = setRoot.scale.x, s1 = on ? 0.62 : 1; if (z0 === z1) return; tw(520, k => { setRoot.position.z = z0 + (z1 - z0) * k; setRoot.scale.setScalar(s0 + (s1 - s0) * k); }, E.io); }

  /* ---- Ideas: little animated props picked from the words of a hook, learn card or question ---- */
  const CONCEPTS = [
    [/\bunit price|per 100 ?g|per litre|per kg|compar(e|ing)|better value|best value\b/i, 'scale', 'Compare'],
    [/\bsav(e|es|ed|ing|ings)\b|\bvault\b|\bpiggy\b|put (it )?away/i, 'piggy', 'Save'],
    [/\bscam\w*|fraud|phish\w*|\bfake\b|\btrick\w*/i, 'shield', 'Stay safe'],
    [/\bbudget\w*|\bplan(s|ning|ned)?\b|\bgoal\w*|\blist\b/i, 'plan', 'Plan'],
    [/\binterest\b|\bgrow(s|n|th|ing)?\b|compound|invest\w*/i, 'plant', 'Grow'],
    [/\bshares?\b|\bstocks?\b|\bmarket\b|\bfunds?\b|\bindex\b/i, 'chart', 'Market'],
    [/\bg(i|a)v(e|es|ing)\b|donat\w*|charit\w*|\bkind\w*|\bcauses?\b|volunteer\w*|\bthank\w*|\bhelp(s|ed|ing)?\b/i, 'heart', 'Give'],
    [/\bsell(s|ing)?\b|\bsold\b|customer\w*|profit\w*|business\w*|\bstall\b/i, 'stall', 'Sell'],
    [/\bprice\w*|\bcost(s|ing)?\b|\bdeal\w*|special\w*|discount\w*|\bsale\b|cheap\w*|expensive/i, 'tag', 'Price'],
    [/\bspend\w*|\bspent\b|\bbuy\w*|\bbought\b|\bshop(s|ping)?\b|purchas\w*/i, 'bag', 'Spend'],
    [/\bcards?\b|eftpos|pay ?later|credit|\bdebt\w*|\bloans?\b|borrow\w*|\bowe\w*/i, 'card', 'Card'],
    [/\bonline\b|internet|\bapps?\b|\bphones?\b|message\w*|\btexts?\b|email\w*|password\w*|privacy|\bpost(s|ed)?\b/i, 'phone', 'Online'],
    [/\bwork(s|ing|er|ers)?\b|\bjobs?\b|\bboss\w*|career\w*|employ\w*|\bskills?\b/i, 'tools', 'Work'],
    [/\btax\w*|council\w*|government|\bvot(e|es|ing)\b|\blaws?\b|\brules?\b|\bpublic\b/i, 'hall', 'Community'],
    [/\bfood\b|\blunch\w*|\bcook\w*|recipe\w*|\bmeals?\b|kitchen/i, 'food', 'Food'],
    [/\bhome\b|\bhouse\w*|\brent\w*|\bbills?\b|clean\w*|chores?/i, 'house', 'Home'],
    [/\bfeel\w*|\bcalm\w*|breath\w*|\bworr\w*|stress\w*|habit\w*|\bsleep\w*|\bmind\w*/i, 'calm', 'Mind'],
    [/\bhistory\b|ancient|barter\w*|\bshells?\b|long ago|centur\w*|\bkings?\b/i, 'urn', 'Long ago'],
    [/\btime\b|\bhours?\b|\bminutes?\b|\blate\b|\bweek(s|ly)?\b|\bdays?\b|\byears?\b/i, 'clock', 'Time'],
    [/\bread\w*|\bwrit\w*|\bwords?\b|\bspeak\w*|\bask\w*|explain\w*|\bstory\b|persuad\w*/i, 'speech', 'Words'],
    [/\bmoney\b|\$\d|dollars?|\bpay\b|\bpaid\b|\bearn\w*|pocket money|income|\bwage\w*/i, 'coins', 'Money'],
  ];
  function conceptsOf(text, n = 2) { const out = []; for (const [re, k, name] of CONCEPTS) { if (out.length >= n) break; if (re.test(text) && !out.some(o => o.k === k)) out.push({ k, name }); } return out; }
  const IDEA = {
    piggy: g => { const b = grp(g); part(b, 's', toon(0xff9ebb), [0, 0.4, 0], [0.4, 0.32, 0.32]); part(b, 'c', toon(0xff7fa6), [0.4, 0.42, 0], [0.1, 0.08, 0.1], [0, 0, Math.PI / 2]); for (const s of [-1, 1]) { part(b, 'k', toon(0xff86ae), [0.16, 0.72, 0.13 * s], [0.07, 0.13, 0.05], [0, 0, -0.4]); part(b, 's', toon(0x1b1b22), [0.32, 0.52, 0.13 * s], [0.03, 0.03, 0.03]); for (const f of [-1, 1]) part(b, 'c', toon(0xff8fb3), [0.2 * f, 0.1, 0.16 * s], [0.06, 0.18, 0.06]); } part(b, 'b', toon(0x7a2848), [0, 0.72, 0], [0.04, 0.02, 0.16]); b.rotation.y = -0.5; const c = coin(); g.add(c); c.visible = false; return t => { const p = (t % 2.2) / 2.2; c.visible = p < 0.5; c.position.set(0, 1.5 - p * 1.6, 0); c.rotation.x = p * 9; if (p > 0.5 && p < 0.6) b.scale.set(1.04, 0.96, 1.04); else b.scale.set(1, 1, 1); }; },
    shield: g => { const s = part(g, 'c6', toon(0x6a79f0), [0, 0.6, 0], [0.42, 0.08, 0.5], [Math.PI / 2, 0, 0]); part(g, 'b', toon(0xffffff), [-0.06, 0.58, 0.06], [0.08, 0.26, 0.04], [0, 0, 0.7]); part(g, 'b', toon(0xffffff), [0.08, 0.64, 0.06], [0.08, 0.4, 0.04], [0, 0, -0.6]); return t => { s.scale.set(0.42 + Math.sin(t * 3) * 0.02, 0.08, 0.5 + Math.sin(t * 3) * 0.02); g.rotation.y = Math.sin(t) * 0.3; }; },
    plan: g => { part(g, 'b', toon(0xb07a45), [0, 0.55, 0], [0.6, 0.75, 0.05]); part(g, 'b', toon(0xffffff), [0, 0.53, 0.03], [0.52, 0.66, 0.02]); part(g, 'b', toon(0x9aa3b5), [0, 0.93, 0.04], [0.2, 0.07, 0.04]); const ticks = [0, 1, 2].map(i => { part(g, 'b', toon(0xc9cfdc), [0.06, 0.74 - i * 0.2, 0.05], [0.28, 0.04, 0.01]); const k = part(g, 's', toon(0x2fb257), [-0.17, 0.74 - i * 0.2, 0.06], [0.05, 0.05, 0.02]); return k; }); return t => { const n = Math.floor((t % 3.6) / 0.9); ticks.forEach((k, i) => { k.visible = i < n; }); }; },
    plant: g => { part(g, 'c', toon(0xc8693c), [0, 0.15, 0], [0.22, 0.3, 0.22]); const stem = part(g, 'c', toon(0x3f8f35), [0, 0.3, 0], [0.03, 0.01, 0.03]); const leaves = [0, 1, 2, 3].map(i => part(g, 's', toon(0x43b65a), [0, 0, 0], [0.1, 0.05, 0.16])); const coins = [0, 1, 2].map(() => { const c = coin(); g.add(c); return c; }); return t => { const p = Math.min(1, (t % 4) / 2.6), h = 0.05 + p * 0.75; stem.scale.y = h; stem.position.y = 0.3 + h / 2; leaves.forEach((l, i) => { const y = 0.38 + (i + 1) / 5 * h; l.position.set((i % 2 ? 1 : -1) * 0.1, y, 0); l.rotation.z = (i % 2 ? -1 : 1) * 0.5; l.visible = p > i / 5; }); coins.forEach((c, i) => { c.visible = p > 0.7 + i * 0.1; c.position.set((i - 1) * 0.16, 0.3 + h + 0.05, 0.05); c.rotation.x = Math.PI / 2; }); }; },
    chart: g => { const bars = [0, 1, 2, 3].map(i => part(g, 'b', toon(i === 2 ? 0xe5533d : 0x2fb257), [-0.36 + i * 0.24, 0, 0], [0.18, 1, 0.18])); return t => { bars.forEach((b, i) => { const h = 0.25 + i * 0.18 + Math.sin(t * 1.6 + i) * 0.1 - (i === 2 ? 0.25 : 0); b.scale.y = Math.max(0.08, h); b.position.y = b.scale.y / 2; }); }; },
    heart: g => { const h = grp(g, 0, 0.55, 0); part(h, 's', toon(0xf25ca2), [-0.13, 0.08, 0], [0.18, 0.18, 0.14]); part(h, 's', toon(0xf25ca2), [0.13, 0.08, 0], [0.18, 0.18, 0.14]); part(h, 'k', toon(0xf25ca2), [0, -0.14, 0], [0.3, 0.32, 0.14], [Math.PI, 0, 0]); return t => { const b = 1 + Math.max(0, Math.sin(t * 6)) * 0.12; h.scale.setScalar(b); }; },
    stall: g => { part(g, 'b', toon(0xe9c08a), [0, 0.2, 0], [0.7, 0.36, 0.3]); for (let i = 0; i < 4; i++) part(g, 'b', toon(i % 2 ? 0xffffff : 0xffb020), [-0.27 + i * 0.18, 0.78, 0.02], [0.18, 0.03, 0.4], [0.3, 0, 0]); for (const x of [-0.32, 0.32]) part(g, 'c', toon(0x9c6b3c), [x, 0.45, -0.12], [0.025, 0.7, 0.025]); const lem = [0, 1, 2].map(i => part(g, 's', toon(0xffe14a), [-0.18 + i * 0.18, 0.43, 0.04], [0.07, 0.06, 0.06])); return t => { lem.forEach((l, i) => { l.position.y = 0.43 + Math.max(0, Math.sin(t * 4 + i * 2)) * 0.08; }); }; },
    tag: g => { const p = grp(g, 0, 1.0, 0); part(p, 'c', toon(0x5d636b), [0, -0.12, 0], [0.01, 0.24, 0.01]); const tg = part(p, 'b', toon(0xff5a4e), [0, -0.42, 0], [0.38, 0.3, 0.04]); const l = label('$', { h: 0.22, fg: '#E5483D' }); l.position.set(0, -0.42, 0.04); p.add(l); return t => { p.rotation.z = Math.sin(t * 2) * 0.25; }; },
    bag: g => { part(g, 'b', toon(0xf2a31b), [0, 0.3, 0], [0.5, 0.56, 0.3]); const h = part(g, 't', toon(0x8a5a3c), [0, 0.6, 0], [0.14, 0.14, 0.14]); const items = [0x3b9bf0, 0xf0588f, 0x2fb257].map((c, i) => part(g, 's', toon(c), [(i - 1) * 0.12, 0.6, 0], [0.08, 0.08, 0.08])); return t => { items.forEach((it, i) => { const p = ((t + i * 0.6) % 1.8) / 1.8; it.position.y = 0.58 + Math.sin(p * Math.PI) * 0.4; it.visible = p < 0.95; }); h.rotation.x = Math.PI / 2; }; },
    card: g => { const c = grp(g, 0, 0.55, 0); part(c, 'b', toon(0x2f6fe4), [0, 0, 0], [0.62, 0.4, 0.03]); part(c, 'b', toon(0xffc93c), [-0.16, 0.04, 0.02], [0.12, 0.09, 0.01]); part(c, 'b', toon(0x1b1b22), [0, -0.12, 0.02], [0.5, 0.05, 0.01]); return t => { c.position.x = Math.sin(t * 2) * 0.12; c.rotation.y = Math.sin(t * 2) * 0.4; }; },
    phone: g => { part(g, 'b', toon(0x23283a), [0, 0.6, 0], [0.42, 0.78, 0.06]); part(g, 'b', toon(0x9bd8ff, { e: 0x1a3a5a }), [0, 0.62, 0.035], [0.36, 0.64, 0.01]); const b = emoji('💬', 0.32); b.position.set(0.32, 1.1, 0.1); g.add(b); return t => { const s = 0.28 + Math.abs(Math.sin(t * 2)) * 0.08; b.scale.set(s, s, 1); }; },
    tools: g => { part(g, 'b', toon(0xc23a2c), [0, 0.18, 0], [0.62, 0.34, 0.32]); part(g, 't', toon(0x6d7486), [0, 0.42, 0], [0.12, 0.12, 0.12]); const hm = grp(g, 0.42, 0.42, 0.1); part(hm, 'c', toon(0x9c6b3c), [0, 0.2, 0], [0.025, 0.4, 0.025]); part(hm, 'b', toon(0x6d7486), [0, 0.42, 0], [0.22, 0.1, 0.1]); return t => { hm.rotation.z = -Math.abs(Math.sin(t * 4)) * 0.9; }; },
    hall: g => { part(g, 'b', toon(0xf1ece2), [0, 0.3, 0], [0.8, 0.44, 0.4]); part(g, 'k', toon(0xd9cbb0), [0, 0.68, 0], [0.6, 0.32, 0.28], [0, Math.PI / 4, 0]); for (let i = 0; i < 4; i++) part(g, 'c', toon(0xffffff), [-0.3 + i * 0.2, 0.3, 0.22], [0.035, 0.44, 0.035]); part(g, 'c', toon(0x5d636b), [0, 1.05, 0], [0.012, 0.5, 0.012]); const f = part(g, 'b', toon(0x2f6fe4), [0.12, 1.22, 0], [0.24, 0.14, 0.01]); return t => { f.rotation.y = Math.sin(t * 5) * 0.4; }; },
    food: g => { part(g, 'c', toon(0xffffff), [0, 0.04, 0], [0.4, 0.04, 0.4]); const a = part(g, 's', toon(0xe5533d), [-0.12, 0.18, 0], [0.13, 0.13, 0.13]); part(g, 'b', toon(0xf4d58d), [0.16, 0.14, 0.04], [0.24, 0.12, 0.2]); part(g, 'b', toon(0x6fbf4a), [0.16, 0.21, 0.04], [0.26, 0.03, 0.22]); return t => { a.position.y = 0.18 + Math.abs(Math.sin(t * 3)) * 0.05; }; },
    house: g => { part(g, 'b', toon(0xf4e3c3), [0, 0.28, 0], [0.6, 0.56, 0.5]); part(g, 'k', toon(0xd9534f), [0, 0.76, 0], [0.5, 0.4, 0.44], [0, Math.PI / 4, 0]); part(g, 'b', toon(0x8a5a3c), [-0.12, 0.16, 0.26], [0.14, 0.32, 0.02]); const w = part(g, 'b', toon(0xffe066, { e: 0x5a4a00 }), [0.15, 0.34, 0.26], [0.14, 0.13, 0.02]); return t => { w.visible = Math.sin(t * 1.5) > -0.6; }; },
    calm: g => { const b = part(g, 's', toon(0x9be3f2), [0, 0.55, 0], [0.3, 0.3, 0.3]); for (let i = 0; i < 6; i++) part(g, 's', toon(0xff9ec7), [Math.cos(i) * 0.3, 0.1, Math.sin(i) * 0.3], [0.14, 0.05, 0.08], [0, -i, 0]); return t => { const s = 0.24 + (Math.sin(t * 1.2) + 1) * 0.08; b.scale.setScalar(s); }; },
    urn: g => { const prof = [[0, 0], [0.12, 0], [0.2, 0.15], [0.22, 0.32], [0.12, 0.55], [0.09, 0.62], [0.13, 0.66]].map(p => new T.Vector2(p[0], p[1])); const u = new T.Mesh(new T.LatheGeometry(prof, 20), toon(0xc98a3e)); g.add(u); for (let i = 0; i < 3; i++) part(g, 'c', toon(0xb08d3a), [0.3 + i * 0.05, 0.02 + i * 0.035, 0.1], [0.08, 0.02, 0.08]); return t => { u.rotation.y = t * 0.6; }; },
    clock: g => { part(g, 'c', toon(0xffffff), [0, 0.6, 0], [0.38, 0.06, 0.38], [Math.PI / 2, 0, 0]); part(g, 't', toon(0x2f6fe4), [0, 0.6, 0], [0.38, 0.38, 0.3]); const hh = grp(g, 0, 0.6, 0.05), mh = grp(g, 0, 0.6, 0.06); part(hh, 'b', toon(0x1b1b22), [0, 0.09, 0], [0.04, 0.18, 0.02]); part(mh, 'b', toon(0x1b1b22), [0, 0.13, 0], [0.03, 0.26, 0.02]); part(g, 'c', toon(0x5d636b), [0, 0.11, 0], [0.04, 0.22, 0.04]); return t => { mh.rotation.z = -t * 3; hh.rotation.z = -t * 0.25; }; },
    speech: g => { const a = emoji('💬', 0.42), b = emoji('🗨️', 0.42); a.position.set(-0.22, 0.7, 0); b.position.set(0.25, 0.95, 0); g.add(a, b); return t => { a.visible = Math.sin(t * 2) > -0.3; b.visible = Math.sin(t * 2) < 0.3; }; },
    scale: g => { part(g, 'c', toon(0x8c6a4e), [0, 0.03, 0], [0.24, 0.06, 0.24]); part(g, 'c', toon(0xa07a55), [0, 0.42, 0], [0.03, 0.8, 0.03]); const p = grp(g, 0, 0.82, 0); part(p, 'b', toon(0xc99a5e), [0, 0, 0], [1.0, 0.05, 0.06]); const pans = [-0.46, 0.46].map(x => { const q = grp(g); part(q, 'c', toon(0xe8c46a), [0, 0, 0], [0.2, 0.03, 0.2]); part(q, 'b', toon(x < 0 ? 0xf0583d : 0x3b9bf0), [0, 0.1, 0], [0.14, 0.16, 0.1]); return [q, x]; }); return t => { const a = Math.sin(t * 1.4) * 0.16; p.rotation.z = a; pans.forEach(([q, x]) => q.position.set(x * Math.cos(a), 0.82 + x * Math.sin(a) - 0.34, 0)); }; },
    coins: g => { const cs = []; for (let i = 0; i < 6; i++) { const c = coin(); c.position.set(0, 0.02 + i * 0.04, 0); g.add(c); cs.push(c); } return t => { const n = 1 + Math.floor((t % 3) / 0.5); cs.forEach((c, i) => { c.visible = i < n; }); }; },
  };
  function ideaProp(k, name) { const g = new T.Group(); const act = (IDEA[k] || IDEA.coins)(g); const l = label(name, { h: 0.24 }); l.position.y = 1.45; g.add(l); return tick(g, act); }

  // Numbers in the words become things: dollar amounts are coin towers, percentages are slices of a pie.
  function numbers(text) {
    const s = local(text), d = [...s.matchAll(/\$\s?(\d+(?:\.\d+)?)/g)].map(m => +m[1]).slice(0, 3), p = [...s.matchAll(/(\d+(?:\.\d+)?)\s?%/g)].map(m => +m[1]).filter(v => v > 0 && v <= 100).slice(0, 4);
    return { dollars: [...new Set(d)], pcts: p };
  }
  function wedge(a0, a1, r, h) { const sh = new T.Shape(); sh.moveTo(0, 0); sh.absarc(0, 0, r, a0, a1, false); sh.lineTo(0, 0); const g2 = new T.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: Math.max(3, Math.ceil((a1 - a0) * 9)) }); g2.rotateX(-Math.PI / 2); return g2; }
  function pie(pcts, r = 0.55) {
    const g = new T.Group(); let a = Math.PI / 2, sum = pcts.reduce((x, y) => x + y, 0); const list = sum <= 100 ? pcts.concat(sum < 100 ? [100 - sum] : []) : [pcts[0], 100 - pcts[0]];
    list.forEach((v, i) => { const a1 = a + v / 100 * Math.PI * 2, rest = i === list.length - 1 && sum < 100 && list.length > pcts.length, mid = (a + a1) / 2; const m = new T.Mesh(wedge(a, a1, r, rest ? 0.08 : 0.16 + (i === 0 ? 0.06 : 0)), toon(rest ? 0xd9dee8 : PAL[i % PAL.length])); m.position.set(Math.cos(mid) * 0.05, 0, -Math.sin(mid) * 0.05); g.add(m); if (!rest) { const l = label(`${v}%`, { h: 0.18, fg: hexCss(PAL[i % PAL.length]) }); l.position.set(Math.cos(mid) * r * 0.75, 0.42, -Math.sin(mid) * r * 0.75); g.add(l); } a = a1; });
    return g;
  }
  function tower(v) { const g = new T.Group(), n = clamp(Math.round(Math.log2(v + 1) * 1.6), 1, 14); for (let i = 0; i < n; i++) { const c = coin(); c.position.y = 0.02 + i * 0.04; g.add(c); c.visible = false; wait(i * 70).then(() => { c.visible = true; drop(c, 420, 1.2); }); } const l = label('$' + (v % 1 ? v.toFixed(2) : v), { h: 0.2 }); l.position.y = 0.2 + n * 0.04; g.add(l); return g; }

  /* ---- Scenes for each part of a lesson ---- */
  const SC = {};
  // Hook: the lesson's emoji spins in on a pedestal, with the ideas it's about and a question mark.
  SC.hook = ({ icon, text }) => {
    const g = new T.Group(); part(g, 'c', toon(0xffffff), [X0, 0.12, 0], [0.42, 0.24, 0.42]); part(g, 'c', toon(0xffc93c), [X0, 0.26, 0], [0.44, 0.04, 0.44]);
    const e = emoji(icon || '💡', 0.85); e.position.set(X0, 0.82, 0); g.add(e);
    const q = label('?', { h: 0.34, fg: '#2F6FE4' }); q.position.set(X0 + 0.6, 1.25, 0); g.add(q);
    const ideas = conceptsOf(text, 2).map((c, i) => { const p = ideaProp(c.k, c.name); p.position.set(i ? X0 + 1.35 : X0 - 0.95, 0, 0.1); p.scale.setScalar(0.75); g.add(p); return p; });
    return { g, enter() { ideas.forEach((p, i) => pop(p, 0.75, 420, 150 + i * 160)); }, tick(t) { e.position.y = 0.82 + Math.sin(t * 2) * 0.06; q.position.y = 1.25 + Math.abs(Math.sin(t * 3)) * 0.12; ideas.forEach(p => p.userData.tick && p.userData.tick(t)); } };
  };
  // Learn card: the idea itself. Numbers become coin towers and pies; key words become little animated props.
  SC.idea = ({ text, icon }) => {
    const g = new T.Group(), n = numbers(text), cs = conceptsOf(text, n.pcts.length || n.dollars.length ? 1 : 2), parts = [];
    if (n.pcts.length) { const p = pie(n.pcts); parts.push(p); }
    n.dollars.slice(0, n.pcts.length ? 1 : 3).forEach(v => parts.push(tower(v)));
    cs.forEach(c => parts.push(ideaProp(c.k, c.name)));
    if (!parts.length) { const e = emoji(icon || '💡', 0.7); e.position.y = 0.7; const h = new T.Group(); h.add(e); part(h, 'c', toon(0xffffff), [0, 0.1, 0], [0.3, 0.2, 0.3]); parts.push(tick(h, t => { e.position.y = 0.7 + Math.sin(t * 2) * 0.06; })); }
    const xs = spread(parts.length, parts.length > 2 ? 2.4 : 1.6);
    parts.forEach((p, i) => { p.position.set(xs[i], 0, 0.15 - (i % 2) * 0.2); p.visible = false; g.add(p); });
    return { g, enter() { parts.forEach((p, i) => pop(p, 1, 460, i * 220)); }, tick(t) { parts.forEach(p => p.userData.tick && p.userData.tick(t)); } };
  };
  SC.home = ({ text }) => {
    const g = new T.Group(), h = ideaProp('house', 'At home'); h.position.set(X0 - 0.5, 0, -0.1); g.add(h);
    const pl = ideaProp('plan', 'Try it'); pl.position.set(X0 + 0.75, 0, 0.15); g.add(pl);
    const cs = conceptsOf(text, 1).filter(c => c.k !== 'house' && c.k !== 'plan').map(c => { const p = ideaProp(c.k, c.name); p.position.set(X0 + 1.6, 0, 0); p.scale.setScalar(0.7); g.add(p); return p; });
    return { g, tick(t) { [h, pl, ...cs].forEach(p => p.userData.tick(t)); } };
  };
  SC.intro = ({ n }) => {
    const g = new T.Group(); part(g, 'c', toon(0x3b2f5c), [X0, 0.15, 0], [0.5, 0.3, 0.5]);
    const prof = [[0, 0], [0.2, 0], [0.2, 0.06], [0.07, 0.1], [0.05, 0.3], [0.1, 0.34], [0.24, 0.42], [0.27, 0.7], [0.25, 0.7], [0.21, 0.46], [0, 0.44]].map(p => new T.Vector2(p[0], p[1]));
    const cup = grp(g, X0, 0.3, 0); cup.add(new T.Mesh(new T.LatheGeometry(prof, 24), coinM)); for (const s of [-1, 1]) { const hd = new T.Mesh(new T.TorusGeometry(0.1, 0.025, 8, 16, Math.PI), coinM); hd.position.set(0.27 * s, 0.56, 0); hd.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; cup.add(hd); }
    const qs = []; for (let i = 0; i < Math.min(8, n || 6); i++) { const q = label('?', { h: 0.2, fg: '#2F6FE4' }); const a = i / Math.min(8, n || 6) * Math.PI * 2; q.position.set(X0 + Math.cos(a) * 0.95, 0.7, Math.sin(a) * 0.5); g.add(q); qs.push([q, a]); }
    return { g, tick(t) { cup.rotation.y = t * 0.8; qs.forEach(([q, a]) => { q.position.set(X0 + Math.cos(a + t * 0.6) * 0.95, 0.7 + Math.sin(t * 2 + a) * 0.1, Math.sin(a + t * 0.6) * 0.5); }); } };
  };
  // quiet: the results screen underneath plays the star sounds
  SC.done = ({ stars = 0, pass = true, quiet = false }) => {
    const g = new T.Group(), list = [];
    for (let i = 0; i < 3; i++) { const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.12 : 0.28, a = Math.PI / 2 + k * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const sg = new T.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); sg.center(); const s = new T.Mesh(sg, i < stars ? coinM : toon(0x4b5675)); s.position.set(X0 + (i - 1) * 0.75, i === 1 ? 1.0 : 0.8, 0); s.visible = false; g.add(s); list.push(s); }
    return { g, enter() { list.forEach((s, i) => pop(s, 1, 500, i * 260).then(() => { if (i < stars) { burst(g, s.position.clone(), 0xffe066, 10); if (!quiet && C.Sound && C.Sound.step) C.Sound.step(i + 2); } })); }, tick(t) { list.forEach((s, i) => { s.rotation.y = Math.sin(t * 2 + i) * 0.4; }); } };
  };

  /* ---- Task scenes: one per kind of question or game, reacting to every move the kid makes ---- */
  function plinths(n, colors, labels, w = 2.3) {
    const xs = spread(n, n > 2 ? w : 1.5); return xs.map((x, i) => { const p = grp(null, x, 0, 0.15); const top = part(p, 'c', toon(colors[i % colors.length]), [0, 0.15, 0], [0.24, 0.3, 0.24]); part(p, 'c', toon(0xffffff), [0, 0.31, 0], [0.26, 0.03, 0.26]); if (labels) { const l = label(labels[i], { h: 0.22 }); l.position.y = 0.62; p.add(l); p.userData.l = l; } p.userData.top = top; return p; });
  }
  const LETTERS = 'ABCDEF';
  SC.mcq = ({ n = 3, q }) => {
    const g = new T.Group(), ps = plinths(n, PAL, [...LETTERS.slice(0, n)]); ps.forEach(p => g.add(p));
    const cs = conceptsOf(q || '', 1).map(c => { const p = ideaProp(c.k, c.name); p.position.set(X0, 0, -0.75); p.scale.setScalar(0.6); g.add(p); return p; });
    let picked = -1;
    return { g, enter() { ps.forEach((p, i) => pop(p, 1, 380, i * 120)); }, tick(t) { cs.forEach(p => p.userData.tick(t)); ps.forEach((p, i) => { if (i !== picked) p.position.y = Math.sin(t * 2 + i) * 0.03; }); },
      on(e, d) {
        if (e === 'pick') { picked = d.i; const p = ps[d.i]; if (!p) return; lift(p, 0.25); if (d.ok) { glow(p.userData.top, true, 0x1f6a2a); burst(g, p.position.clone().add(new T.Vector3(0, 0.9, 0)), 0x7cf29c, 12); } else { shake(p); (d.right || []).forEach(j => ps[j] && (glow(ps[j].userData.top, true, 0x1f6a2a), bounce(ps[j]))); } }
      } };
  };
  SC.tf = ({ q }) => {
    const g = new T.Group(), posts = [['True', 0x2fb257, X0 + 0.9], ['False', 0xe5533d, X0 - 0.9]].map(([t, c, x]) => { const p = grp(g, x, 0, 0); part(p, 'c', toon(0x9c6b3c), [0, 0.4, 0], [0.04, 0.8, 0.04]); const b = part(p, 'b', toon(c), [0, 0.85, 0], [0.5, 0.26, 0.05]); const l = label(t === 'True' ? '✓ True' : '✗ False', { h: 0.2, fg: hexCss(c) }); l.position.set(0, 0.86, 0.06); p.add(l); p.userData.b = b; return p; });
    const card = grp(g, X0, 0.8, 0.2); part(card, 'b', toon(0xffffff), [0, 0, 0], [0.42, 0.56, 0.03]); const qm = label('?', { h: 0.26, fg: '#2F6FE4' }); qm.position.z = 0.03; card.add(qm);
    let gone = false;
    return { g, tick(t) { if (!gone) { card.rotation.y = Math.sin(t * 1.5) * 0.5; card.position.y = 0.8 + Math.sin(t * 2) * 0.05; } },
      on(e, d) { if (e === 'lean') card.position.x = X0 + clamp(d.dx / 300, -0.6, 0.6); if (e === 'pick') { gone = true; const p = posts[d.v ? 0 : 1]; fly(card, p.position.clone().add(new T.Vector3(0, 0.3, 0.12)), 0.5, 480, false).then(() => { if (d.ok) { burst(g, p.position.clone().add(new T.Vector3(0, 1.1, 0)), 0x7cf29c); bounce(p); } else shake(p); }); } } };
  };
  SC.gap = ({ q, opts }) => {
    const g = new T.Group(), n = numbers(q || ''), tile = grp(g, X0 + 0.55, 0, 0.1); part(tile, 'b', toon(0x9aa3b5), [0, 0.2, 0], [0.5, 0.4, 0.4]); const face = part(tile, 'b', toon(0xffffff), [0, 0.72, 0], [0.8, 0.6, 0.1]); const v = label('?', { h: 0.34, fg: '#2F6FE4' }); v.position.set(0, 0.72, 0.08); tile.add(v);
    const extra = n.pcts.length ? pie(n.pcts.slice(0, 2), 0.42) : n.dollars.length ? tower(n.dollars[0]) : null; if (extra) { extra.position.set(X0 - 0.75, 0, 0.1); g.add(extra); }
    return { g, on(e, d) { if (e === 'type') { setLabel(v, d.val || '?', { fg: '#2F6FE4' }); bounce(tile, 0.08); } if (e === 'next') { setLabel(v, '?', { fg: '#2F6FE4' }); glow(face, false); pop(tile, 1, 300); } if (e === 'pick') { setLabel(v, d.v || '?', { fg: d.ok ? '#1E8A40' : '#E5483D' }); glow(face, true, d.ok ? 0x1f6a2a : 0x6a1f1f); if (d.ok) { burst(g, tile.position.clone().add(new T.Vector3(0, 1.2, 0)), 0x7cf29c, 12); bounce(tile); } else shake(tile); } } };
  };
  SC.sort = ({ bins, colors }) => {
    const g = new T.Group(), n = bins.length, xs = spread(n, n > 3 ? 2.6 : 2.0);
    const prof = [[0, 0], [0.23, 0], [0.26, 0.05], [0.27, 0.4], [0.22, 0.48], [0.19, 0.52], [0.19, 0.57]].map(p => new T.Vector2(p[0], p[1])), jarG = new T.LatheGeometry(prof, 22);
    const glass = new T.MeshToonMaterial({ color: 0xddf2ff, gradientMap: G3.GRAD, transparent: true, opacity: 0.36, depthWrite: false });
    const jars = bins.map((b, i) => { const j = grp(g, xs[i], 0, -0.1); j.add(new T.Mesh(jarG, glass)); const c = colors[i] || PAL[i % PAL.length]; part(j, 'c', toon(c), [0, 0.6, 0], [0.21, 0.08, 0.21]); part(j, 'c', toon(c), [0, 0.025, 0], [0.25, 0.05, 0.25]); const l = label(clip(b, 12), { h: 0.19, fg: hexCss(c) }); l.position.y = 0.9; j.add(l); j.userData.n = 0; j.userData.tokens = {}; return j; });
    const tray = []; const home = k => new T.Vector3(X0 - 0.6 + (k % 6) * 0.24, 0.02 + Math.floor(k / 6) * 0.04, 0.75);
    return { g, enter() { jars.forEach((j, i) => pop(j, 1, 420, i * 120)); },
      on(e, d) {
        const j = jars[bins.indexOf(d.bin)];
        if (e === 'place' && j) { const c = coin(); c.position.copy(home(d.item)); g.add(c); const k = j.userData.n++; j.userData.tokens[d.item] = c; fly(c, new T.Vector3(j.position.x + (k % 2 ? 0.05 : -0.05), 0.06 + Math.min(k, 12) * 0.036, j.position.z), 0.9, 520).then(() => bounce(j)); }
        if (e === 'unplace') for (const jj of jars) { const c = jj.userData.tokens[d.item]; if (c) { delete jj.userData.tokens[d.item]; jj.userData.n = Math.max(0, jj.userData.n - 1); fly(c, home(d.item), 0.6, 400).then(() => g.remove(c)); } }
        if (e === 'graded') jars.forEach(jj => { const ok = d.ok; ok ? bounce(jj) : shake(jj); if (ok) burst(g, jj.position.clone().add(new T.Vector3(0, 1, 0)), 0xffe066, 8); });
      } };
  };
  SC.order = ({ n, build }) => {
    const g = new T.Group(), stones = [];
    for (let i = 0; i < n; i++) { const a = -0.9 + i / Math.max(1, n - 1) * 1.8; const s = grp(g, build ? X0 : X0 + Math.sin(a) * 1.25, build ? 0 : 0, build ? 0 : Math.cos(a) * 0.45 - 0.35); if (build) { const b = part(s, 'b', toon(PAL[i % PAL.length]), [0, 0.1 + i * 0.22, 0], [0.7 - i * 0.06, 0.2, 0.42]); b.visible = false; s.userData.b = b; } else { s.userData.b = part(s, 'c', toon(0xd8d2c4), [0, 0.06, 0], [0.24, 0.12, 0.24]); const l = label(String(i + 1), { h: 0.2 }); l.position.y = 0.42; s.add(l); } stones.push(s); }
    const tok = build ? null : part(g, 's', toon(0xffc93c, { e: 0x5a3a00 }), [X0 - 1.5, 0.15, 0.4], [0.1, 0.1, 0.1]);
    return { g,
      on(e, d) {
        if (e === 'pick') { const s = stones[d.k]; if (!s) return; if (build) { const b = s.userData.b; b.visible = true; drop(b, 460, 1.2); } else { glow(s.userData.b, true, 0x5a4a00); lift(s, 0.08); if (tok) fly(tok, s.position.clone().add(new T.Vector3(0, 0.25, 0)), 0.4, 360, false); } }
        if (e === 'back') stones.forEach((s, i) => { if (i >= d.n) { if (build) s.userData.b.visible = false; else { glow(s.userData.b, false); s.position.y = 0; } } });
        if (e === 'graded') stones.forEach((s, i) => { const ok = d.ok[i]; glow(s.userData.b, true, ok ? 0x1f6a2a : 0x6a1f1f); ok ? bounce(s) : shake(s); });
      } };
  };
  SC.match = ({ left, n }) => {
    const g = new T.Group(), H = ['#FFD43B', '#7CF5B5', '#9BD8FF', '#FF9FC6', '#C9A7FF', '#FFB86B'].map(c => new T.Color(c).getHex());
    const posts = side => Array.from({ length: n }, (_, i) => { const p = grp(g, X0 + side * 0.85, 0, -0.5 + i * (1.1 / Math.max(1, n - 1))); part(p, 'c', toon(0x9c6b3c), [0, 0.3, 0], [0.05, 0.6, 0.05]); const k = part(p, 's', toon(0xffffff), [0, 0.64, 0], [0.09, 0.09, 0.09]); if (side < 0 && left) { const l = label(clip(left[i], 10), { h: 0.15 }); l.position.set(-0.45, 0.64, 0); p.add(l); } p.userData.k = k; return p; });
    const L = posts(-1), Rp = posts(1), ropes = {};
    return { g,
      on(e, d) {
        if (e === 'pair') { if (ropes[d.i]) g.remove(ropes[d.i]); const a = L[d.i].position.clone().setY(0.64), b = Rp[d.j % n].position.clone().setY(0.64), mid = a.clone().lerp(b, 0.5).add(new T.Vector3(0, -0.12, 0)); const r = new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(a, mid, b), 16, 0.025, 6), toon(H[d.i % H.length])); g.add(r); ropes[d.i] = r; glow(L[d.i].userData.k, true, 0x5a4a00); glow(Rp[d.j % n].userData.k, true, 0x5a4a00); bounce(Rp[d.j % n]); }
        if (e === 'graded') d.ok.forEach((ok, i) => { ok ? bounce(L[i]) : shake(L[i]); if (ok) burst(g, L[i].position.clone().add(new T.Vector3(0, 0.8, 0)), 0x7cf29c, 6); });
      } };
  };
  SC.slider = ({ min, max, unit, start }) => {
    const g = new T.Group(), col = grp(g, X0, 0, 0.1), H = 1.3; part(col, 'c', toon(0xffffff), [0, 0.03, 0], [0.32, 0.06, 0.32]);
    const bar = part(col, 'c', unit === '$' ? coinM : toon(0x3b9bf0), [0, 0, 0], [0.22, 1, 0.22]); const v = label('', { h: 0.22 }); col.add(v);
    const ring = part(col, 't', toon(0x2fb257, { e: 0x1f6a2a }), [0, 0, 0], [0.32, 0.32, 0.32], [Math.PI / 2, 0, 0]); ring.visible = false;
    for (let i = 0; i <= 4; i++) part(col, 'b', toon(0x5d636b), [0.32, 0.06 + i / 4 * H, 0], [0.12, 0.015, 0.015]);
    const show = (x, txt) => { const f = clamp((x - min) / ((max - min) || 1), 0, 1), h = Math.max(0.02, f * H); bar.scale.y = h; bar.position.y = 0.06 + h / 2; v.position.y = 0.3 + h; setLabel(v, txt); };
    const fmtV = x => `${unit === '$' ? '$' : ''}${(+x).toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit && unit !== '$' ? ' ' + unit : ''}`;
    show(start, fmtV(start));
    return { g, on(e, d) { if (e === 'slide') show(d.v, fmtV(d.v)); if (e === 'lock') { const f = clamp((d.a - min) / ((max - min) || 1), 0, 1); ring.position.y = 0.06 + f * H; ring.visible = true; pop(ring, 0.32); if (d.ok) burst(g, col.position.clone().add(new T.Vector3(0, 1.4, 0)), 0x7cf29c, 12); else shake(col); } } };
  };
  SC.price = ({ products }) => {
    const g = new T.Group(), n = Math.min(3, products.length), q = products.slice(0, n), maxQ = Math.max(...q.map(p => p.qty)), xs = spread(n, 2.0);
    const boxes = q.map((p, i) => { const s = 0.45 + 0.55 * Math.sqrt(p.qty / maxQ), b = grp(g, xs[i], 0, 0); part(b, 'c', toon(0xe8c46a), [0, 0.03, 0], [0.3, 0.06, 0.3]); const body = part(b, 'b', toon(PAL[i]), [0, 0.06 + 0.22 * s, 0], [0.32 * s, 0.44 * s, 0.22 * s]); const l = label(`$${p.cost % 1 ? p.cost.toFixed(2) : p.cost}`, { h: 0.18, fg: '#E5483D' }); l.position.y = 0.3 + 0.44 * s; b.add(l); const nm = label(clip(local(p.name), 12), { h: 0.14 }); nm.position.y = 0.52 + 0.44 * s; b.add(nm); b.userData.body = body; b.userData.top = 0.62 + 0.44 * s; return b; });
    const crown = grp(g); part(crown, 'c', coinM, [0, 0, 0], [0.13, 0.08, 0.13]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(crown, 'k', coinM, [Math.cos(a) * 0.11, 0.07, Math.sin(a) * 0.11], [0.03, 0.08, 0.03]); } crown.visible = false;
    return { g, enter() { boxes.forEach((b, i) => pop(b, 1, 400, i * 150)); }, tick(t) { if (crown.visible) crown.rotation.y = t * 1.5; },
      on(e, d) { if (e === 'pick') { const b = boxes[d.i]; if (b) d.ok ? bounce(b) : shake(b); const w = boxes[d.best]; if (w) { crown.position.set(w.position.x, w.userData.top + 0.1, 0); pop(crown, 1); burst(g, crown.position.clone(), 0xffe066, 10); } } } };
  };
  SC.scam = () => {
    const g = new T.Group(), ph = grp(g, X0 - 0.3, 0, 0); part(ph, 'b', toon(0x23283a), [0, 0.65, 0], [0.5, 0.95, 0.07]); const scr = part(ph, 'b', toon(0x9bd8ff, { e: 0x1a3a5a }), [0, 0.67, 0.04], [0.42, 0.8, 0.01]);
    const bub = emoji('✉️', 0.3); bub.position.set(0, 0.8, 0.08); ph.add(bub);
    const sh = grp(g, X0 + 0.75, 0, 0); part(sh, 'c6', toon(0x6a79f0), [0, 0.6, 0], [0.32, 0.07, 0.4], [Math.PI / 2, 0, 0]); sh.visible = false; const okS = emoji('✅', 0.45); okS.position.set(X0 + 0.75, 0.65, 0); okS.visible = false; g.add(okS);
    return { g, tick(t) { bub.position.y = 0.8 + Math.sin(t * 3) * 0.04; },
      on(e, d) { if (e === 'msg') { sh.visible = okS.visible = false; glow(scr, false); pop(bub, 0.3); } if (e === 'pick') { const show = d.said ? sh : okS; pop(show, d.said ? 1 : 0.45); d.ok ? burst(g, new T.Vector3(X0 + 0.75, 1.1, 0), 0x7cf29c, 8) : shake(ph); glow(scr, true, d.scam ? 0x6a1f1f : 0x1f6a2a); } } };
  };
  SC.fork = ({ n }) => {
    const g = new T.Group(), xs = spread(n, n > 2 ? 2.2 : 1.6), signs = xs.map((x, i) => { const p = grp(g, x, 0, -0.45); part(p, 'c', toon(0x9c6b3c), [0, 0.4, 0], [0.04, 0.8, 0.04]); const b = part(p, 'b', toon(PAL[i]), [0, 0.82, 0], [0.4, 0.24, 0.05]); const l = label(LETTERS[i], { h: 0.2 }); l.position.set(0, 0.82, 0.06); p.add(l); p.userData.b = b; return p; });
    for (let i = 0; i < 6; i++) part(g, 'c', toon(0xd8d2c4), [X0, 0.02, 0.75 - i * 0.18], [0.12, 0.03, 0.12]);
    const walker = part(g, 's', toon(0xffc93c, { e: 0x5a3a00 }), [X0, 0.14, 0.8], [0.11, 0.11, 0.11]);
    return { g, on(e, d) { if (e === 'pick') { const s = signs[d.i]; if (!s) return; fly(walker, s.position.clone().add(new T.Vector3(0, 0.14, 0.3)), 0.5, 700, false).then(() => { const good = d.grade ? d.grade !== 'bad' : d.ok !== false; good ? (bounce(s), burst(g, s.position.clone().add(new T.Vector3(0, 1.1, 0)), 0x7cf29c, 8)) : shake(s); glow(s.userData.b, true, good ? 0x1f6a2a : 0x6a1f1f); }); } } };
  };
  SC.debate = () => {
    const g = new T.Group(), pods = [0, 1].map(i => { const p = grp(g, X0 + (i ? 0.75 : -0.75), 0, 0); const b = part(p, 'b', toon(PAL[i]), [0, 0.25, 0], [0.42, 0.5, 0.3]); const s = emoji(i ? '🗨️' : '💬', 0.4); s.position.set(0, 0.95, 0); p.add(s); const l = label(LETTERS[i], { h: 0.2 }); l.position.set(0, 0.28, 0.17); p.add(l); p.userData.b = b; return p; });
    return { g, tick(t) { pods.forEach((p, i) => { p.children.forEach(c => { if (c.isSprite && c.scale.x > 0.3) c.position.y = 0.95 + Math.sin(t * 2.5 + i * 2) * 0.05; }); }); }, on(e, d) { if (e === 'pick') { const p = pods[d.i]; if (!p) return; lift(p, 0.15); d.ok ? (burst(g, p.position.clone().add(new T.Vector3(0, 1.2, 0)), 0x7cf29c, 10), glow(p.userData.b, true, 0x1f6a2a)) : shake(p); } } };
  };
  SC.tap = ({ items }) => {
    const g = new T.Group(), n = Math.min(10, items.length), sp = items.slice(0, n).map((e, i) => { const a = i / n * Math.PI * 2, s = emoji(e, 0.36); s.position.set(X0 + Math.cos(a) * 1.15, 0.35, Math.sin(a) * 0.55); g.add(s); const r = part(g, 't', toon(0xffe066, { e: 0x6a4a00 }), [s.position.x, 0.05, s.position.z], [0.22, 0.22, 0.22], [Math.PI / 2, 0, 0]); r.visible = false; return { s, r }; });
    return { g, tick(t) { sp.forEach((o, i) => { o.s.position.y = 0.35 + Math.sin(t * 2 + i) * 0.04 + (o.r.visible ? 0.12 : 0); }); }, on(e, d) { if (e === 'tap' && sp[d.i]) { sp[d.i].r.visible = d.on; if (d.on) pop(sp[d.i].r, 0.22, 300); } if (e === 'graded') d.ok.forEach((ok, i) => { if (!sp[i]) return; if (ok) burst(g, sp[i].s.position.clone(), 0x7cf29c, 6); }); } };
  };
  SC.budget = ({ cats, income }) => {
    const g = new T.Group(), n = Math.min(6, cats.length), xs = spread(n, n > 3 ? 2.4 : 1.8), per = income / 20;
    const stands = cats.slice(0, n).map((c, i) => { const s = grp(g, xs[i], 0, -0.25 - Math.abs(i - (n - 1) / 2) * 0.08); part(s, 'c', toon(0xe3dccf), [0, 0.1, 0], [0.17, 0.2, 0.17]); part(s, 'c', toon(PAL[i]), [0, 0.21, 0], [0.18, 0.03, 0.18]); const l = label(clip(local(c.n), 11), { h: 0.15, fg: hexCss(PAL[i]) }); l.position.y = 1.05; s.add(l); s.userData.coins = []; return s; });
    const pile = grp(g, X0 - 1.25, 0, 0.55), loose = []; for (let i = 0; i < 20; i++) { const c = coin(); c.position.set(0, 0.02 + i * 0.034, 0); pile.add(c); loose.push(c); }
    const tag = label(`$${income}`, { h: 0.2 }); tag.position.y = 0.95; pile.add(tag);
    function set(amt) { amt.slice(0, n).forEach((a, i) => { const want = Math.round(a / per), have = stands[i].userData.coins; while (have.length < want && loose.length) { const c = loose.pop(); pile.remove(c); c.position.set(pile.position.x, c.position.y, pile.position.z); g.add(c); have.push(c); fly(c, new T.Vector3(stands[i].position.x, 0.24 + (have.length - 1) * 0.034, stands[i].position.z), 0.55, 380); } while (have.length > want) { const c = have.pop(); g.remove(c); c.position.set(0, 0.02 + loose.length * 0.034, 0); pile.add(c); loose.push(c); } }); const used = amt.reduce((a, b) => a + b, 0); setLabel(tag, `$${Math.max(0, income - used)} left`); }
    return { g, enter() { stands.forEach((s, i) => pop(s, 1, 380, i * 110)); }, on(e, d) { if (e === 'alloc') set(d.amt); if (e === 'surprise') { const b = grp(g, X0 + 1.4, 0, 0.4); part(b, 'b', toon(0x7b5cff), [0, 0.05, 0], [0.32, 0.07, 0.24]); ink(b); drop(b, 600, 2.2).then(() => { d.covered ? burst(g, b.position.clone().add(new T.Vector3(0, 0.4, 0)), 0x7cf29c, 10) : stands.forEach(s => shake(s)); }); } } };
  };
  SC.market = ({ years }) => {
    const g = new T.Group(), bars = []; for (let y = 0; y <= years; y++) { const b = part(g, 'b', toon(0x2fb257), [X0 - 1.2 + y / years * 2.4, 0, -0.1], [Math.min(0.16, 2.2 / (years + 1)), 0.01, 0.2]); b.visible = false; bars.push(b); }
    return { g, on(e, d) { if (e === 'year') { const b = bars[d.y]; if (!b) return; const h = Math.max(0.05, d.v / d.max * 1.4); b.visible = true; b.scale.y = h; b.position.y = h / 2; if (d.drop) { b.material = toon(0xe5533d); shake(b); } else bounce(b, 0.1); } if (e === 'pick' && d.hold != null) d.hold ? burst(g, new T.Vector3(X0, 1.5, 0), 0x7cf29c, 10) : bars.forEach(b => b.visible && shake(b)); } };
  };
  SC.snowball = ({ start }) => {
    const g = new T.Group(); part(g, 'b', toon(0xffffff), [X0, 0.15, 0], [2.4, 0.08, 0.6], [0, 0, 0.12]); const ball = part(g, 's', toon(0xf2f8ff), [X0 - 1.0, 0.35, 0], [0.16, 0.16, 0.16]); const l = label('$' + start, { h: 0.2 }); g.add(l);
    const set = (y, r) => { const s = clamp(0.14 * Math.sqrt(r), 0.12, 0.6); ball.scale.setScalar(s); ball.position.set(X0 - 1.0 + Math.min(1, y / 20) * 2.0, 0.28 + s - (Math.min(1, y / 20) * 0.28), 0); ball.rotation.z = -y; l.position.set(ball.position.x, ball.position.y + s + 0.2, 0); };
    set(0, 1); return { g, on(e, d) { if (e === 'slide') { set(d.y, d.r); setLabel(l, d.label); } } };
  };
  SC.shop = ({ item }) => {
    const g = new T.Group(), st = ideaProp('stall', clip(local(item), 14)); st.position.set(X0 + 0.4, 0, -0.25); g.add(st); const sign = label('$?', { h: 0.26, fg: '#E5483D' }); sign.position.set(X0 - 0.5, 0.9, 0.1); g.add(sign); part(g, 'c', toon(0x9c6b3c), [X0 - 0.5, 0.35, 0.1], [0.03, 0.7, 0.03]);
    let crowd = [];
    return { g, tick(t) { st.userData.tick(t); crowd.forEach((c, i) => { c.position.y = 0.16 + Math.abs(Math.sin(t * 5 + i)) * 0.06; }); }, on(e, d) { if (e === 'price') setLabel(sign, d.label, { fg: '#E5483D' }); if (e === 'open') { crowd.forEach(c => g.remove(c)); crowd = []; for (let i = 0; i < Math.min(12, d.n); i++) { const c = part(g, 's', toon(PAL[i % PAL.length]), [X0 + 1.5, 0.16, 0.6 - (i % 4) * 0.25], [0.11, 0.14, 0.11]); ink(c); crowd.push(c); fly(c, new T.Vector3(X0 + 0.9 - (i % 4) * 0.25, 0.16, 0.55 - Math.floor(i / 4) * 0.2), 0.3, 400 + i * 80, false); } } } };
  };
  SC.timing = ({ zone }) => {
    const g = new T.Group(), dial = grp(g, X0, 0.75, 0); part(dial, 'c', toon(0xffffff), [0, 0, 0], [0.55, 0.06, 0.55], [Math.PI / 2, 0, 0]); const z = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.07, 24, 1, false, Math.PI * 0.62, Math.PI * 0.36), toon(0x2fb257)); z.rotation.x = Math.PI / 2; dial.add(z); const nd = grp(dial, 0, 0, 0.06); part(nd, 'b', toon(0xe5533d), [0, 0.22, 0], [0.04, 0.44, 0.02]); part(g, 'c', toon(0x9c6b3c), [X0, 0.2, -0.05], [0.04, 0.4, 0.04]); const l = label(clip(local(zone), 12), { h: 0.18, fg: '#1E8A40' }); l.position.set(X0, 1.48, 0); g.add(l);
    return { g, tick(t) { nd.rotation.z = Math.sin(t * 1.4 * Math.PI) * 1.4; }, on(e, d) { if (e === 'pick') d.ok ? burst(g, new T.Vector3(X0, 1.3, 0), 0x7cf29c, 12) : shake(dial); } };
  };
  SC.docs = ({ n }) => {
    const g = new T.Group(), board = (x, t) => { const b = grp(g, x, 0, 0); part(b, 'b', toon(0xffffff), [0, 0.7, 0], [0.8, 0.95, 0.04]); const l = label(t, { h: 0.16 }); l.position.set(0, 1.25, 0.03); b.add(l); return b; };
    board(X0 - 0.55, 'Before'); const after = board(X0 + 0.55, 'After'); const lines = Array.from({ length: Math.min(6, n) }, (_, i) => part(after, 'b', toon(0xc9cfdc), [0, 1.0 - i * 0.14, 0.03], [0.6, 0.06, 0.01]));
    for (let i = 0; i < Math.min(6, n); i++) part(g, 'b', toon(0xc9cfdc), [X0 - 0.55, 1.0 - i * 0.14, 0.03], [0.6, 0.06, 0.01]);
    return { g, on(e, d) { if (e === 'tap' && lines[d.i]) glow(lines[d.i], d.on, 0x6a4a00); if (e === 'graded') d.ok.forEach((ok, i) => lines[i] && glow(lines[i], true, ok ? 0x1f6a2a : 0x6a1f1f)); } };
  };
  SC.chat = () => {
    const g = new T.Group(), ph = grp(g, X0, 0, 0); part(ph, 'b', toon(0x23283a), [0, 0.7, 0], [0.7, 1.15, 0.07]); part(ph, 'b', toon(0xf2f4fa), [0, 0.72, 0.04], [0.62, 1.0, 0.01]); const bubbles = [];
    return { g, on(e, d) { if (e === 'line') { const b = part(ph, 'b', toon(d.who === 'me' ? (d.ok === false ? 0x9aa3b5 : 0x2f6fe4) : 0xffffff), [d.who === 'me' ? 0.1 : -0.1, 0, 0.06], [0.38, 0.12, 0.02]); bubbles.push(b); bubbles.forEach((x, i) => { x.position.y = 1.1 - (bubbles.length - 1 - i) * 0.16; x.visible = x.position.y > 0.3; }); pop(b, b.scale.clone(), 260); } } };
  };
  SC.mystery = ({ n }) => {
    const g = new T.Group(), chest = grp(g, X0 + 0.55, 0, 0); part(chest, 'b', toon(0x9c6b3c), [0, 0.2, 0], [0.6, 0.4, 0.4]); const lid = grp(chest, 0, 0.4, -0.2); part(lid, 'b', toon(0xb07a45), [0, 0.06, 0.2], [0.62, 0.12, 0.42]); part(chest, 'b', toon(0xffc93c), [0, 0.3, 0.21], [0.1, 0.12, 0.02]);
    const scrolls = Array.from({ length: Math.min(5, n) }, (_, i) => { const s = grp(g, X0 - 1.0 + i * 0.32, 0, 0.3); part(s, 'c', toon(0xf4e3c3), [0, 0.25, 0], [0.06, 0.4, 0.06], [0, 0, Math.PI / 2]); s.visible = i === 0; return s; });
    return { g, tick(t) { scrolls.forEach((s, i) => { s.position.y = Math.sin(t * 2 + i) * 0.04; }); }, on(e, d) { if (e === 'clue' && scrolls[d.n - 1]) pop(scrolls[d.n - 1], 1, 360); if (e === 'pick') { if (d.ok) { tw(500, k => { lid.rotation.x = -k * 1.6; }, E.back); burst(g, chest.position.clone().add(new T.Vector3(0, 0.8, 0)), 0xffe066, 14); } else shake(chest); } } };
  };
  SC.board = ({ icon }) => SC.idea({ text: '', icon });

  /* ---- Showing a scene ---- */
  let subj = null;
  // Sprites share one geometry across three.js, so only their materials are freed.
  function disposeTree(o) { o.traverse(x => { if (x.isSprite) { x.material.dispose(); return; } if (x.geometry && !(x.geometry.userData && x.geometry.userData.keep)) x.geometry.dispose(); if (x.material && !x.material.userData.keep && !x.material.isShaderMaterial) x.material.dispose(); }); }
  function show(kind, data = {}) {
    const old = subj; subj = null;
    if (old) tw(200, k => old.g.scale.setScalar(Math.max(0.001, 1 - k)), E.lin).then(() => { subjRoot.remove(old.g); disposeTree(old.g); });
    if (!kind || !SC[kind]) { guideAside(false); setBack(false); return; }
    let s; try { s = SC[kind](data); } catch (e) { console.warn('stage scene', kind, e); guideAside(false); setBack(false); return; }
    ink(s.g); subjRoot.add(s.g); subj = s; s.g.scale.setScalar(0.001);
    wait(old ? 140 : 0).then(() => { if (subj !== s) return; return tw(460, k => s.g.scale.setScalar(Math.max(0.001, k)), E.back).then(() => { if (subj === s && s.enter) s.enter(); }); });
    guideAside(true); setBack(true);
  }
  function fx(evt, d) { if (subj && subj.on) { try { subj.on(evt, d || {}); } catch (e) { console.warn('stage fx', evt, e); } } }

  let act = { kind: 'idle', t0: 0 }, raf = 0, last = 0, running = false, blinkAt = 2;
  function react(kind) { act = { kind, t0: performance.now() }; }
  function size() {
    const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return;
    R.setSize(r.width, r.height, false); cam.aspect = r.width / r.height;
    // Fit the whole island, guide and scene whatever shape the stage is; tall stages look down on it a little.
    const a = cam.aspect, tan = Math.tan(cam.fov * Math.PI / 360), tall = clamp((1.15 - a) / 0.55, 0, 1), was = tallLayout;
    tallLayout = a < 1.05; subjRoot.position.x = tallLayout ? -0.45 : 0; isle.scale.set(tallLayout ? 0.8 : 1, 1, 1);
    const d = Math.max(tallLayout ? 4.6 : 5.6, (tallLayout ? 4.0 : 6.0) / (2 * tan * a)), cx = tallLayout ? -0.1 : 0;
    cam.position.set(cx, 1.4 + d * (0.1 + tall * 0.32), d); cam.lookAt(cx, 0.62 - tall * 0.12, 0); cam.updateProjectionMatrix();
    if (was !== tallLayout && aside) guideAside(true);
  }
  const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(canvas);
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016), t = now / 1000; last = now;
    for (const w of tws) { const k = Math.min(1, (now - w.t0) / w.d); w.fn(w.e(k), k); if (k >= 1) { tws.delete(w); w.res(); } }
    world.rotation.y = Math.sin(t * 0.3) * (subj ? 0.05 : 0.12); world.position.y = Math.sin(t * 0.9) * 0.05;
    if (props) { const k = Math.min(1, (now - props.userData.pop) / 500); props.scale.setScalar(Math.max(0.01, 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2))); }
    if (subj && subj.tick) { try { subj.tick(t, dt); } catch (e) { subj.tick = null; } }
    if (guide) {
      const P = guide.P, g = guide.g, a = (now - act.t0) / 1000;
      let y = 0, sx = 1, sy = 1, ry = Math.sin(t * 0.7) * 0.25 + (subj ? 0.55 : 0), tilt = 0, wing = Math.sin(t * 2) * 0.08;
      const breathe = 1 + Math.sin(t * 2.4) * 0.02; sy *= breathe; sx /= Math.sqrt(breathe);
      if (act.kind === 'hop' && a < 0.7) { const p = a / 0.7; if (p < 0.2) { sy *= 1 - p * 1.2; sx *= 1 + p; } else { const q = (p - 0.2) / 0.8; y = Math.sin(q * Math.PI) * 0.45; sy *= 1 + Math.sin(q * Math.PI) * 0.12; } wing = -Math.sin(a * 22) * 0.9; }
      else if (act.kind === 'cheer' && a < 1.2) { const p = a / 1.2; y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.4; ry = p * Math.PI * 2; wing = -1.2 + Math.sin(a * 26) * 0.5; }
      else if (act.kind === 'puzzled' && a < 1.0) { tilt = Math.sin(Math.min(1, a * 3) * Math.PI / 2) * 0.35 * (1 - Math.max(0, a - 0.7) / 0.3); ry += Math.sin(a * 9) * 0.15; }
      else if (act.kind === 'point' && a < 0.9) { const p = Math.sin(Math.min(1, a / 0.25) * Math.PI / 2) * (1 - Math.max(0, a - 0.6) / 0.3); P.wingR.rotation.z = 1.6 * p; tilt = -0.1 * p; }
      if (act.kind !== 'point' || a >= 0.9) P.wingR.rotation.z = -wing;
      P.wingL.rotation.z = wing;
      g.position.y = y; g.scale.set(sx, sy, sx); g.rotation.y = ry; P.head.rotation.z = tilt;
      if (t > blinkAt) { const b = (t - blinkAt) / 0.14; const s = b < 1 ? Math.max(0.1, Math.abs(1 - 2 * b)) : 1; P.eyeL.scale.y = P.eyeR.scale.y = (guideKind === 'robot' ? 0.07 : 0.06) * s; if (b >= 1) blinkAt = t + 2 + Math.random() * 3; }
      if (P.tip) P.tip.material.emissive.setHex(Math.sin(t * 4) > 0 ? 0x8a1010 : 0x3a0505);
    }
    pace(now); G3.inkFor(R); R.render(scene, cam);
  }
  return {
    setGuide, setScene, react, show, fx,
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
    ${(() => { const ps = Prize.stats(kid); if (!ps) return ''; const nx = ps.next; return `<h3 class="pgroup-t">Island prizes<small>Every few lessons wins a makeover colour, and every second prize an animal or special thing. The gap follows ${esc(kid.name)}’s pace, so prizes keep coming whether they learn a little or a lot.</small></h3>
    <div class="group"><div class="row"><div class="row-main"><b>${ps.won} prize${ps.won === 1 ? '' : 's'} won${nx ? ` · next: ${esc(nx.info.name)} in ${nx.left} lesson${nx.left === 1 ? '' : 's'}` : ''}</b><small>${ps.week} lesson${ps.week === 1 ? '' : 's'} passed this week, so after this one a prize every ${ps.gap} lessons${ps.got.length ? ` · won so far: ${ps.got.map(id => esc((C.prizeInfo(id) || { name: id }).name)).join(', ')}` : ''}</small></div></div></div>`; })()}
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
      ${Cases.length ? `<div class="row"><div class="row-main"><b>Stories about living people</b><small>Real stories include people like Melanie Perkins and Elon Musk</small></div>${sw('gpLiving', set.living, 'Stories about living people')}</div>` : ''}
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
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=crew]{grid-template-rows:minmax(0,1fr);grid-template-columns:0 minmax(0,1fr)} }
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
.gw-one{display:flex;align-items:center;gap:16px;width:100%;max-width:520px;margin:0 auto 24px;padding:16px;border-radius:24px;text-align:left;color:#fff;background:linear-gradient(135deg,color-mix(in srgb,var(--th) 70%,#fff 10%),var(--th));box-shadow:0 14px 30px -14px rgba(0,0,0,.55),inset 0 -5px 0 rgba(0,0,0,.14)}
.gw-ones{display:grid;gap:12px;margin-bottom:24px}
.gw-ones .gw-one{margin-bottom:0}
.gw-one:active{transform:scale(.98)}
.gw-one.open{animation:starPulse 2.4s ease-in-out infinite}
.g1-ic{width:72px;height:72px;flex:none;border-radius:50%;display:grid;place-items:center;font-size:38px;background:rgba(255,255,255,.25)}
.g1-t{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}
.g1-t b{font:900 20px/1.15 var(--f-round)}
.g1-t small{font:800 12px/1.3 var(--f-round);opacity:.9}
.g1-bar{height:8px;border-radius:99px;background:rgba(255,255,255,.28);overflow:hidden}
.g1-bar i{display:block;height:100%;border-radius:inherit;background:#FFE066}
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
/* Every lesson passed: what's left to win */
.gw-alldone{display:flex;gap:14px;align-items:center;margin:14px 0 10px;padding:14px 16px;border-radius:22px;background:#fff;color:#0D1530;box-shadow:0 0 0 3px #FFE066,0 14px 28px -16px rgba(0,0,0,.5);animation:gwIn .35s both}
.gad-ic{flex:none;width:56px;height:56px;border-radius:18px;display:grid;place-items:center;font-size:32px;background:#FFF3D1}
.gw-alldone b{display:block;font:900 19px/1.2 var(--f-round)}
.gw-alldone p{margin:4px 0 0;font:700 15px/1.4 var(--f-round);color:#3A4466}
/* What passing takes: on the lesson's first card, above every question, and after each answer */
.gw-goal,.gw-fbgoal{margin:0;padding:10px 14px;border-radius:14px;background:#FFF3D1;color:#6B4300;font:800 15px/1.4 var(--f-round);text-align:left}
.gw-qgoal{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;margin:0 0 10px;padding:9px 14px;border-radius:14px;background:rgba(255,255,255,.18);font:800 14px/1.3 var(--f-round)}
.gw-qgoal b{font-weight:900}
/* An explanation's Next button fills up while there's still time to read or listen, and works once it's full */
.g-go.hold,.g-go.hold:disabled{position:relative;isolation:isolate;overflow:hidden;opacity:.85;cursor:default}
.g-go.hold::before{content:"";position:absolute;inset:0 auto 0 0;z-index:-1;width:var(--from,0%);background:rgba(255,255,255,.32);animation:gwHold var(--hold,1s) linear forwards}
@keyframes gwHold{from{width:var(--from,0%)}to{width:100%}}
.g-go.held{animation:gwReady .35s cubic-bezier(.2,1.6,.4,1)}
@keyframes gwReady{40%{transform:scale(1.05)}}
.gw-fbin b{font:900 17px var(--f-round)}
.gw-fbin.good{background:#E3F9EA;color:#14532D}
.gw-fbin.bad{background:#FFF1E6;color:#7A3B00}
.gw-done{text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px;padding-top:12px}
/* Results reuse the chore results look (.rstar, .res-score, .res-meter, .res-row, .res-pay from the app), a bit smaller under the stage */
.gw-res{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}
.gw-res .rstar{width:clamp(62px,15vw,96px)}
.gw-res .rstar:nth-child(2){width:clamp(78px,19vw,120px)}
.gw-res .res-score{font-size:clamp(44px,11vw,84px)}
.gw-acc{font:800 16px var(--f-round);opacity:.95;margin-top:-6px}
.gw-acc b{font-weight:900}
.gw-res .res-row.minus b{color:#FFD9D9}
.res-end.in>.gw-p{animation:gwIn .3s both}
.res-end.in .gw-actions{animation:gwIn .35s .2s both}
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


/* ---------- The Learning Tree: one tree per kid that every subject grows ----------
   It starts as a seed in the soil of a floating island. Money Sense is the seed: its lessons grow the stalk and
   its flower. Every other subject grows a branch of its own off the stalk, and as those branches grow, the stalk
   turns to wood, thickens and puts roots down over the island. A finished subject's branch blossoms in its
   colour and hangs its badge; with every subject done the whole tree is in bloom.
   Each subject's view looks along its own part of the tree (the stalk, or its branch). Every quiz question
   answered right grows it a step (the tree takes the stage beside the questions). Every lesson passed unfurls a
   big leaf, one side then the other, carrying what the lesson earned on top: its XP, or the island prize it
   won. A prize waits in a locked bubble where its leaf will grow and unlocks onto the leaf when the lesson is
   passed. A finished unit puts a ring on the stalk or branch that opens its challenge. The camera follows the
   growing tip; drag, swipe or scroll to look along it, tap a label for its card, or step back to see the whole
   tree. Other subjects' branches show their lessons as clusters of leaves. Without WebGL, viewTree falls back
   to a list. */
const PlantView = (() => {
  const T = window.THREE, G3 = C.G3;
  if (!T || !G3 || !G3.ok) return { ok: false };
  const V3 = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z), lerp = (a, b, t) => a + (b - a) * t, smooth = t => t * t * (3 - 2 * t);
  const outBack = t => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;
  const outBounce = t => (t < 0.55 ? (t / 0.55) ** 2 : t < 0.85 ? 1 - 0.12 * Math.sin((t - 0.55) / 0.3 * Math.PI) : 1 - 0.04 * Math.sin((t - 0.85) / 0.15 * Math.PI));
  const wait = ms => new Promise(r => setTimeout(r, ms * (reduced ? 0.4 : 1)));
  // This view renders in sRGB like the main island, so colours are given in sRGB and converted.
  const col = h => new T.Color(h).convertSRGBToLinear();
  const MC = {};
  function toon(hex, o = {}) {
    const k = `${hex}|${o.ds ? 1 : 0}|${o.vc ? 1 : 0}|${o.e ?? ''}`; if (!o.map && MC[k]) return MC[k];
    const m = new T.MeshToonMaterial({ color: col(hex), gradientMap: G3.GRAD, side: o.ds ? T.DoubleSide : T.FrontSide, vertexColors: !!o.vc, map: o.map || null, emissive: o.e != null ? col(o.e) : new T.Color(0) });
    G3.rimPatch(m); return o.map ? m : (MC[k] = m);
  }
  const RING = toon(0x8be06a), RING_GOLD = toon(0xffc93c);
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; };
  const faceted = g => { const f = g.index ? g.toNonIndexed() : g; f.computeVertexNormals(); return f; };
  // Bakes the pieces of scenery that never move on their own into one mesh per material, so a field of tufts costs
  // one draw call instead of eighty. Same geometry, same materials, same look; outline the result afterwards.
  // A mesh marked `keep`, or carrying children, stays as it is.
  function bake(group, only = null) {
    group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(), by = new Map();
    (only || (() => { const a = []; group.traverse(o => { if (o.isMesh && !o.userData.keep && !o.children.length) a.push(o); }); return a; })()).forEach(o => { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); });
    for (const [mat, list] of by) {
      if (list.length < 2) continue;
      const geos = list.map(o => o.geometry.clone().applyMatrix4(inv.clone().multiply(o.matrixWorld))), indexed = geos.every(g => g.index);
      const parts = indexed ? geos : geos.map(g => (g.index ? g.toNonIndexed() : g)), names = Object.keys(parts[0].attributes).filter(k => parts.every(g => g.attributes[k]));
      const out = new T.BufferGeometry();
      for (const k of names) { const sz = parts[0].attributes[k].itemSize, arr = new Float32Array(parts.reduce((a, g) => a + g.attributes[k].count * sz, 0)); let at = 0; for (const g of parts) { arr.set(g.attributes[k].array, at); at += g.attributes[k].array.length; } out.setAttribute(k, new T.BufferAttribute(arr, sz)); }
      if (indexed) { const verts = parts.reduce((a, g) => a + g.attributes.position.count, 0), idx = new (verts > 65535 ? Uint32Array : Uint16Array)(parts.reduce((a, g) => a + g.index.count, 0)); let at = 0, base = 0; for (const g of parts) { for (let i = 0; i < g.index.count; i++) idx[at++] = g.index.array[i] + base; base += g.attributes.position.count; } out.setIndex(new T.BufferAttribute(idx, 1)); }
      list.forEach(o => o.parent.remove(o)); geos.forEach(g => g.dispose());
      const m = new T.Mesh(out, mat); m.userData.noInk = !!list[0].userData.noInk; group.add(m);
    }
    return group;
  }
  function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return t; }
  const GAME_NAME = { sort: 'Sort', order: 'Put in order', build: 'Build it', match: 'Match', route: 'Route', slider: 'Slider', price: 'Best price', scam: 'Scam spotter', path: 'Choose a path', debate: 'Debate', tap: 'Find them', budget: 'Budget planner', market: 'Market time-lapse', compound: 'Snowball', shop: 'Run a stall', timing: 'Timing', diff: 'Spot the difference', chat: 'Chat', mystery: 'Mystery box', island: 'Your island', gen: 'Quick maths', mcq: 'Quiz', tf: 'True or false', gap: 'Fill the gap' };

  /* State */
  let R = null, pace = null, glowTex = null, scene, cam, el, cv, tagsEl, cardEl, followEl, overEl, plant, planG = null, sky, sunSprite, clouds = [], isl, signMesh, coinsG, seed, shells, coty, flower, sepals, outer, inner, rays, dots, goalStar, butterflies, guide = null, guideKind = '';
  let mode = 'tree', crownI = -1, running = false, raf = 0, last = 0, t = 0, key = '', treeId = '', busy = false, celTok = 0, drag = null, prizeSig = '', kidName = '';
  let LS = [], US = [], Q = 1, UN = [], LEAVES = [], ITEMS = [], tagEls = [], utagEls = [], goalEl = null, prizeAt = {}, prizeGs = [];
  let done = [], real = [], udone = [], crowned = [], cur = -1, sel = null, bloomOn = false, passedA = 0, shown = 0, quizFresh = false, quizGrow = false, quizMax = 0;
  const V = { s: 0, ts: 0, F: 0, shell: 0, shiver: 0, bloomT: 0, bud: 0 };
  const CAM = { y: 0.75, manual: null, idle: 0, az: 0.35, az0: 0.35, dist: 6, w: 1, h: 1, wide: true, sheet: 0, top: 0, cardW: 0, over: false, tgt: V3(0, 0.75, 0) };

  /* Paths: the stalk (which becomes the trunk) and one branch per subject after Money Sense. A subject's lessons lie
     along its path. Answers map onto it: the first right answer pushes a shoot clear of the seed (or of the trunk),
     every lesson's questions take an equal share of the rest, and the bloom grows the last bit (TOP to 1). */
  const H = 18, BASE = 0.3, NS = 540, RAD = 10, TOP = 0.93;
  function makePath(cv, n) {
    const P = { LEN: cv.getLength(), n, SP: [], SN: [], SB: [], ST: [] }, fr = cv.computeFrenetFrames(n, false);
    for (let i = 0; i <= n; i++) { P.SP.push(cv.getPointAt(i / n)); P.SN.push(fr.normals[i]); P.SB.push(fr.binormals[i]); P.ST.push(fr.tangents[i]); }
    P.sample = (u, out = {}) => { const f = clamp(u, 0, 1) * n, i0 = Math.floor(Math.min(f, n - 1)), k = f - i0; out.p = (out.p || V3()).lerpVectors(P.SP[i0], P.SP[i0 + 1], k); out.n = (out.n || V3()).lerpVectors(P.SN[i0], P.SN[i0 + 1], k).normalize(); out.b = (out.b || V3()).lerpVectors(P.SB[i0], P.SB[i0 + 1], k).normalize(); out.t = (out.t || V3()).lerpVectors(P.ST[i0], P.ST[i0 + 1], k).normalize(); return out; };
    // The point at a height, for paths that always climb: where the camera looks as it follows the path
    P.atY = (y, out) => { let a = 0, b = n; if (y <= P.SP[0].y) return out.copy(P.SP[0]); if (y >= P.SP[n].y) return out.copy(P.SP[n]); while (b - a > 1) { const m = (a + b) >> 1; if (P.SP[m].y < y) a = m; else b = m; } return out.lerpVectors(P.SP[a], P.SP[b], (y - P.SP[a].y) / Math.max(1e-6, P.SP[b].y - P.SP[a].y)); };
    return P;
  }
  const TRUNK = makePath(new T.CatmullRomCurve3([[0, BASE - 0.05, 0], [0.04, BASE + 1, 0.02], [-0.18, BASE + 3.2, 0.1], [0.2, BASE + 6, -0.08], [-0.16, BASE + 9, 0.06], [0.17, BASE + 12, -0.05], [-0.1, BASE + 15, 0.04], [0, BASE + H, 0]].map(p => V3(...p)), false, 'centripetal'), NS);
  TRUNK.sprout = 0.95 / TRUNK.LEN; TRUNK.K = 1;
  // How much the other subjects have grown the tree (0 to 1), and how woody the stalk is
  const treeG = () => Math.pow(clamp(V.F / (ALL_TREES.length - 1), 0, 1), 0.75), woodOf = () => smooth(clamp(V.F / 1.4, 0, 1));
  TRUNK.radius = (u, s) => { const L = TRUNK.LEN, W = woodOf(), flare = 1 + (0.7 + 1.2 * W) * Math.max(0, 1 - u * L / (0.45 + 1.4 * W)), tip = clamp((s - u) * L / 0.6, 0, 1); return (0.17 - 0.09 * u) * (1 + 3.2 * treeG() * (1 - 0.55 * u)) * flare * (0.16 + 0.84 * Math.sqrt(tip)); };
  /* Branches: one per subject after Money Sense, in catalogue order so each subject always has the same branch.
     They spiral up the trunk (golden angle), leave it nearly level and sweep up, longest in the middle so the
     crown rounds off. Lessons on a branch are smaller than the stalk's (K), and the camera comes closer to match. */
  const BK = 0.45, BR = ALL_TREES.filter(x => x.id !== 'money').map((tr, b) => {
    const u0 = (3.6 + b * 0.82) / (H + 0.3), a = b * 2.39996 + 0.9, d = V3(Math.cos(a), 0, Math.sin(a)), reach = 3.3 + 1.7 * Math.sin(Math.PI * (b + 0.6) / 11.2), rise = 7.2 - 0.12 * b;
    const p0 = TRUNK.sample(u0).p.clone(), up = V3(0, 1, 0);
    const P = makePath(new T.CubicBezierCurve3(p0, p0.clone().addScaledVector(d, 0.5 * reach).addScaledVector(up, 0.45), p0.clone().addScaledVector(d, 0.92 * reach).addScaledVector(up, 0.42 * rise), p0.clone().addScaledVector(d, reach).addScaledVector(up, rise)), 160);
    P.sprout = 0.05; P.K = BK; P.u0 = u0; P.d = d; P.az0 = Math.PI - a - 0.5; P.tree = tr; P.b = b;
    P.radius = (u, s) => { const tip = clamp((s - u) * P.LEN / 0.35, 0, 1); return Math.max(0.012, (TRUNK.radius(u0, 1) * 0.5 * (1 - 0.75 * u) + 0.03)) * (0.25 + 0.75 * Math.sqrt(tip)); };
    return P;
  });
  const BRANCH = Object.fromEntries(BR.map(P => [P.tree.id, P]));
  let PATH = TRUNK, K = 1;
  const sample = (u, out) => PATH.sample(u, out), radius = (u, s) => PATH.radius(u, s), isMS = () => PATH === TRUNK;
  const uOf = a => (a <= 0 ? 0 : PATH.sprout + (TOP - PATH.sprout) * Math.min(1, a / Q));
  let GOAL = V3();
  // Tubes (the stalk and the branches) are made once at full length and rewritten in place as they grow,
  // drawing only the grown part, so growing doesn't allocate a new geometry every frame.
  const GREEN = col(0x5cc13f), BARK = col(0x8a5a3a), BARK_D = col(0x6a4329), BARK_L = col(0xa8744c), cTmp = new T.Color();
  // Green stalk turning to wood, with darker grooves running up it
  const barkCol = (W, j, shade, out) => out.copy(GREEN).lerp(j % 3 === 0 ? BARK_D : j % 3 === 1 ? BARK : BARK_L, W).multiplyScalar(shade);
  function Tube(P, rad, mat) {
    const n = P.n, V = (n + 1) * (rad + 1) + 1, pos = new Float32Array(V * 3), nor = new Float32Array(V * 3), cl = new Float32Array(V * 3), idx = new Uint16Array(n * rad * 6 + rad * 3);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('inkNormal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(cl, 3)); geo.setIndex(new T.BufferAttribute(idx, 1)); geo.setDrawRange(0, 0);
    // The tube changes length as it grows, so it is never culled from a stale bounding box
    const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.visible = false; G3.outline(m); m.children.forEach(c => { c.frustumCulled = false; });
    m.built = ''; const q = {};
    m.build = (s, W, sig) => {
      if (sig === m.built) return; m.built = sig;
      if (s <= 0.0005) { m.visible = false; return; } m.visible = true;
      const rings = Math.max(2, Math.ceil(s * n)) + 1, ti = rings * (rad + 1); let k = 0;
      for (let i = 0; i < rings; i++) {
        const u = Math.min(s, i / n), r = P.radius(u, s); P.sample(u, q);
        for (let j = 0; j <= rad; j++) { const a = j / rad * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), o = (i * (rad + 1) + j) * 3, nx = c * q.n.x + sn * q.b.x, ny = c * q.n.y + sn * q.b.y, nz = c * q.n.z + sn * q.b.z; pos[o] = q.p.x + nx * r; pos[o + 1] = q.p.y + ny * r; pos[o + 2] = q.p.z + nz * r; nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz; barkCol(W, j, 0.9 + 0.1 * i / rings, cTmp); cl[o] = cTmp.r; cl[o + 1] = cTmp.g; cl[o + 2] = cTmp.b; }
      }
      for (let i = 0; i < rings - 1; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx[k++] = a; idx[k++] = a + 1; idx[k++] = b; idx[k++] = b; idx[k++] = a + 1; idx[k++] = b + 1; }
      P.sample(s, q); pos[ti * 3] = q.p.x + q.t.x * 0.04; pos[ti * 3 + 1] = q.p.y + q.t.y * 0.04; pos[ti * 3 + 2] = q.p.z + q.t.z * 0.04; nor[ti * 3] = q.t.x; nor[ti * 3 + 1] = q.t.y; nor[ti * 3 + 2] = q.t.z; barkCol(W, 0, 1, cTmp); cl[ti * 3] = cTmp.r; cl[ti * 3 + 1] = cTmp.g; cl[ti * 3 + 2] = cTmp.b;
      const lastRing = (rings - 1) * (rad + 1); for (let j = 0; j < rad; j++) { idx[k++] = lastRing + j + 1; idx[k++] = lastRing + j; idx[k++] = ti; }
      for (const a of ['position', 'normal', 'inkNormal', 'color']) { geo.attributes[a].updateRange.count = (ti + 1) * 3; geo.attributes[a].needsUpdate = true; }
      geo.index.updateRange.count = k; geo.index.needsUpdate = true; geo.setDrawRange(0, k);
    };
    return m;
  }
  let stalk = null, roots = [];
  const soilY = (r, sc) => (r < 1.05 * sc ? 0.36 * sc * Math.sqrt(1 - (r / (1.05 * sc)) ** 2) : 0) + 0.02;

  /* Leaves: a veined texture on a curved, slightly cupped blade */
  function leafShape(L, W, round) { const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(L * 0.25, W * (round ? 1.1 : 0.95), L * (round ? 0.8 : 0.7), W * (round ? 1 : 0.75), L, 0); s.bezierCurveTo(L * (round ? 0.8 : 0.7), -W * (round ? 1 : 0.75), L * 0.25, -W * (round ? 1.1 : 0.95), 0, 0); return s; }
  function leafGeo(L, W, round, droop, cup) {
    const g = new T.ExtrudeGeometry(leafShape(L, W, round), { depth: 0.035, bevelEnabled: false, curveSegments: 18 }); g.translate(0, 0, -0.0175); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - droop * x * x / L + cup * z * z / W); uv.setXY(i, x / L, (-z + W) / (2 * W)); }
    g.computeVertexNormals(); return g;
  }
  let leafM = null, INKI = null, puffs, puffInk, blossoms, blossomInk, hearts, ghost, ghostInk;
  const KNG = new T.TorusGeometry(1, 0.32, 8, 18), PERB = 24, MAXP = BR.length * PERB + 14, MAXB = BR.length * 7 + 12;
  const LEAFC = [0x4caf50, 0x5bbf4a, 0x3d9b4f, 0x6fcf4f].map(col);
  // A finished subject's badge, which hangs at the tip of its branch
  function subjBadge(icon, hue) { return canvasTex(160, 160, (g, w) => { g.fillStyle = hue; g.beginPath(); g.arc(w / 2, w / 2, 74, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, w / 2, 62, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = '#2b2238'; g.beginPath(); g.arc(w / 2, w / 2, 76, 0, 7); g.stroke(); g.font = '72px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(icon, w / 2, w / 2 + 6); }); }

  /* Scene pieces every plant shares: sky, island, seed, stalk, baby leaves, flower, butterflies */
  function world() {
    scene = new T.Scene(); cam = new T.PerspectiveCamera(40, 1, 0.1, 400);
    scene.add(new T.HemisphereLight(col(0xdff2ff), col(0x7fbf6a), 0.75));
    const sun = new T.DirectionalLight(col(0xfff3dc), 0.95); sun.position.set(-6, 10, 8); scene.add(sun);
    sky = new T.Mesh(new T.SphereGeometry(200, 32, 16), new T.ShaderMaterial({ side: T.BackSide, depthWrite: false, uniforms: { top: { value: col(0x3f9cff) }, mid: { value: col(0x8fd0ff) }, low: { value: col(0xe8f7ff) } },
      vertexShader: 'varying vec3 vW; void main(){ vW = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top, mid, low; varying vec3 vW; void main(){ float h = vW.y; vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0, 0.7, h)) : mix(mid, low, smoothstep(0.0, -0.5, h)); gl_FragColor = linearToOutputTexel(vec4(c, 1.0)); }' }));
    scene.add(sky);
    const glow = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(255,250,220,1)'); r.addColorStop(0.18, 'rgba(255,240,170,1)'); r.addColorStop(0.32, 'rgba(255,230,140,.55)'); r.addColorStop(1, 'rgba(255,230,140,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    glowTex = glow;
    sunSprite = new T.Sprite(new T.SpriteMaterial({ map: glow, depthWrite: false, transparent: true })); sunSprite.scale.set(36, 36, 1); scene.add(sunSprite);
    { const cm = toon(0xffffff), cg = new T.SphereGeometry(1, 18, 12); let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 18; i++) { const g = new T.Group(), n = 4 + Math.floor(rnd() * 3); for (let k = 0; k < n; k++) { const r = 0.9 + rnd() * 1.1, b = mesh(cg, cm, g, (k - n / 2) * 1.2 + rnd() * 0.4, rnd() * 0.5 + (k % 2) * 0.4, rnd() * 0.6); b.scale.set(r, r * 0.75, r); } bake(g); g.position.set(-22 + rnd() * 44, -3 + rnd() * 34, -14 - rnd() * 22); g.userData = { v: 0.15 + rnd() * 0.25, s: 0.8 + rnd() * 0.7, b: g.position.clone() }; g.scale.setScalar(g.userData.s); scene.add(g); clouds.push(g); } }

    const wld = new T.Group(); scene.add(wld); plant = new T.Group(); wld.add(plant);
    // The floating island: grass, a layered rock cone, a soil mound for the seed, tufts, daisies and a sign
    isl = new T.Group(); wld.add(isl);
    mesh(new T.CylinderGeometry(3.1, 2.8, 0.5, 48), toon(0x6fcf4f), isl, 0, -0.25, 0);
    mesh(new T.TorusGeometry(2.95, 0.16, 8, 48), toon(0x58b83d), isl, 0, -0.02, 0).rotation.x = Math.PI / 2;
    const rockG = faceted(new T.ConeGeometry(2.85, 3.6, 11, 3)); rockG.rotateX(Math.PI);
    { const p = rockG.attributes.position, cs = [], A = col(0x9b7655), B = col(0x6f5040), Lt = col(0xc29a72); for (let i = 0; i < p.count; i++) { const band = Math.sin(p.getY(i) * 4.2 + Math.sin(p.getX(i) * 2) * 0.8), c = band > 0.35 ? Lt : band < -0.45 ? B : A; cs.push(c.r, c.g, c.b); } rockG.setAttribute('color', new T.Float32BufferAttribute(cs, 3)); }
    mesh(rockG, toon(0xffffff, { vc: 1 }), isl, 0, -2.3, 0);
    const soilG = new T.SphereGeometry(1.05, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    { const p = soilG.attributes.position, cs = [], A = col(0x7a4e2d), B = col(0x5e3a20); for (let i = 0; i < p.count; i++) { const c = Math.sin(p.getX(i) * 13) * Math.cos(p.getZ(i) * 11) > 0.55 ? B : A; cs.push(c.r, c.g, c.b); } soilG.setAttribute('color', new T.Float32BufferAttribute(cs, 3)); }
    mesh(soilG, toon(0xffffff, { vc: 1 }), isl).scale.y = 0.36;
    coinsG = new T.Group(); isl.add(coinsG); { const cg = new T.CylinderGeometry(0.2, 0.2, 0.05, 24); [[1.25, 0.35, 0.6], [-1.1, 0.7, -0.9], [0.2, -1.35, 0.3]].forEach(([x, z, r]) => mesh(cg, toon(0xffc93c), coinsG, x, 0.05, z).rotation.set(r, r * 2, 0.4)); }
    { const tg = new T.ConeGeometry(0.06, 0.38, 5); for (let i = 0; i < 26; i++) { const a = i * 2.4, d = 1.45 + (i % 5) * 0.28, tf = new T.Group(); tf.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); [-0.06, 0, 0.06].forEach((o, k) => { mesh(tg, toon(0x4fae36), tf, o, 0.16, (k - 1) * 0.03).rotation.z = o * 3; }); isl.add(tf); } }
    { const sg = new T.CylinderGeometry(0.02, 0.02, 0.36, 5), pg = new T.SphereGeometry(0.07, 8, 6), mg = new T.SphereGeometry(0.06, 8, 6);
      [[2.2, 0.9], [-2.1, -0.4], [0.9, 2.15], [-0.6, -2.2], [1.8, -1.5]].forEach(([x, z]) => { const f = new T.Group(); f.position.set(x, 0, z); mesh(sg, toon(0x4fae36), f, 0, 0.18, 0); for (let k = 0; k < 5; k++) mesh(pg, toon(0xffffff), f, Math.cos(k * 1.26) * 0.09, 0.38, Math.sin(k * 1.26) * 0.09).scale.y = 0.45; mesh(mg, toon(0xffd84d), f, 0, 0.4, 0); isl.add(f); }); }
    [[1.9, 1.6, 0.22], [-2.3, 0.9, 0.16], [-1.4, -1.9, 0.26]].forEach(([x, z, s]) => mesh(faceted(new T.DodecahedronGeometry(s)), toon(0xb9b2c4), isl, x, s * 0.4, z).rotation.set(x, z, 0));
    const sign = new T.Group(); sign.position.set(-1.75, 0, 1.35); sign.rotation.y = 0.5; isl.add(sign);
    mesh(new T.BoxGeometry(0.08, 0.7, 0.08), toon(0xc98a4b), sign, 0, 0.35, 0);
    const board = mesh(new T.BoxGeometry(0.95, 0.42, 0.06), toon(0xc98a4b), sign, 0, 0.72, 0);
    signMesh = mesh(new T.PlaneGeometry(0.86, 0.34), new T.MeshBasicMaterial(), board, 0, 0, 0.032); signMesh.userData.noInk = true;
    bake(coinsG).children.forEach(c => { c.userData.keep = true; }); bake(isl); G3.outline(isl);
    { const far = new T.Group(); [[-36, 4, -34, 1.6], [40, 13, -30, 2], [-38, 25, -28, 1.4]].forEach(([x, y, z, s]) => { const f = new T.Group(); f.position.set(x, y, z); f.scale.setScalar(s); mesh(new T.CylinderGeometry(2, 1.8, 0.4, 24), toon(0x7fd65f), f); mesh(faceted(new T.ConeGeometry(1.9, 2.4, 9)), toon(0xa98263), f, 0, -1.4, 0).rotation.x = Math.PI; mesh(new T.SphereGeometry(0.7, 12, 8), toon(0x4fae36), f, 0.4, 0.7, 0).scale.y = 1.3; far.add(f); }); scene.add(bake(far)); }

    // The seed: two half shells that split open on the first right answer
    seed = new T.Group(); seed.position.set(0, 0.4, 0); plant.add(seed);
    const shellG = new T.SphereGeometry(0.26, 22, 14, 0, Math.PI);
    shells = [0, 1].map(k => { const p = new T.Group(); seed.add(p); const m = mesh(shellG, toon(0xf0bd6a, { ds: 1 }), p); m.scale.set(1, 1.45, 1); m.rotation.y = k ? Math.PI : 0; m.userData.noInk = true; return p; });
    // The stalk, the roots that creep over the island once it turns to wood, and a branch for every other subject
    const barkM = toon(0xffffff, { vc: 1 });
    stalk = Tube(TRUNK, RAD, barkM); plant.add(stalk);
    roots = Array.from({ length: 6 }, (_, k) => { const a = k / 6 * Math.PI * 2 + 0.4, len = k % 2 ? 1.7 : 2.2, pts = []; for (let i = 0; i <= 8; i++) { const f = i / 8, r = 0.12 + f * len, w = Math.sin(f * 6 + k) * 0.08 * f; pts.push(V3(Math.cos(a + w) * r, soilY(r, 1) - 0.03 * f, Math.sin(a + w) * r)); } const P = makePath(new T.CatmullRomCurve3(pts), 20); P.radius = (u, s) => Math.max(0.012, (0.13 * treeG() + 0.05) * (1 - u * 0.85)) * (0.4 + 0.6 * clamp((s - u) * 6, 0, 1)); const m = Tube(P, 7, barkM); plant.add(m); return m; });
    BR.forEach(P => { P.tube = Tube(P, 8, barkM); plant.add(P.tube); P.s = 0; P.bloomT = 0; P.k = 0; });
    // Other subjects' lessons show as clusters of leaves around their branch, and a finished subject blossoms in its
    // colour. They are instanced: all the clusters in the tree are one draw call, and their outlines another.
    INKI = new T.ShaderMaterial({ side: T.BackSide, uniforms: { uRes: { value: new T.Vector2(1, 1) }, uPx: { value: 2 }, uColor: { value: col(0x2b2238) } },
      vertexShader: `attribute vec3 inkNormal; uniform vec2 uRes; uniform float uPx;
void main() {
  vec4 lp = vec4(position, 1.0); vec3 ln = inkNormal;
  #ifdef USE_INSTANCING
  lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
  #endif
  vec4 clip = projectionMatrix * modelViewMatrix * lp; vec2 d = (projectionMatrix * vec4(normalize(normalMatrix * ln), 0.0)).xy; float l = length(d);
  if (l > 1e-5) clip.xy += d / l * uPx * 2.0 / uRes * clip.w;
  clip.z += 0.0006 * clip.w; gl_Position = clip;
}`, fragmentShader: 'uniform vec3 uColor; void main() { gl_FragColor = linearToOutputTexel(vec4(uColor, 1.0)); }' });
    const inst = (geo, mat, n) => { const m = new T.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; plant.add(m); return m; };
    const plain = () => { const m = new T.MeshToonMaterial({ color: 0xffffff, gradientMap: G3.GRAD }); G3.rimPatch(m); return m; };
    const puffG = new T.SphereGeometry(1, 14, 10); puffG.setAttribute('inkNormal', puffG.attributes.normal);
    puffs = inst(puffG, plain(), MAXP); puffInk = inst(puffG, INKI, MAXP); puffInk.instanceMatrix = puffs.instanceMatrix;
    const petalsG = (() => { const parts = []; for (let k = 0; k < 5; k++) { const g = new T.SphereGeometry(0.16, 10, 8); g.scale(1, 0.38, 0.62); g.translate(0.15, 0, 0); g.rotateY(k / 5 * Math.PI * 2); parts.push(g.toNonIndexed()); } const out = new T.BufferGeometry(); for (const a of ['position', 'normal']) { const arr = new Float32Array(parts.reduce((s, g) => s + g.attributes[a].array.length, 0)); let at = 0; parts.forEach(g => { arr.set(g.attributes[a].array, at); at += g.attributes[a].array.length; }); out.setAttribute(a, new T.BufferAttribute(arr, 3)); } out.setAttribute('inkNormal', out.attributes.normal); return out; })();
    blossoms = inst(petalsG, plain(), MAXB); blossomInk = inst(petalsG, INKI, MAXB); hearts = inst(new T.SphereGeometry(0.075, 10, 8), toon(0xffd84d), MAXB);
    blossomInk.instanceMatrix = hearts.instanceMatrix = blossoms.instanceMatrix;
    // Colours exist from the first frame, so the shaders are built with per-instance colour. The colour buffer is
    // sized from the count when it's first made, so the full count is set while it is.
    { const w = col(0xffffff), z = new T.Matrix4().makeScale(0, 0, 0); puffs.count = MAXP; blossoms.count = MAXB; for (let i = 0; i < MAXP; i++) { puffs.setColorAt(i, LEAFC[0]); puffs.setMatrixAt(i, z); } for (let i = 0; i < MAXB; i++) { blossoms.setColorAt(i, w); blossoms.setMatrixAt(i, z); } puffs.count = blossoms.count = 0; }
    BR.forEach(P => { const sp = new T.Sprite(new T.SpriteMaterial({ map: subjBadge(P.tree.icon, P.tree.hue), transparent: true, depthTest: false })); sp.renderOrder = 5; sp.visible = false; plant.add(sp); P.badge = sp; });

    leafM = toon(0xffffff, { map: canvasTex(256, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#53c447'); gr.addColorStop(0.5, '#7ddb5a'); gr.addColorStop(1, '#53c447'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8f59c'; g.lineCap = 'round'; g.lineWidth = 5; g.beginPath(); g.moveTo(4, h / 2); g.lineTo(w - 6, h / 2); g.stroke();
      g.lineWidth = 3; for (let i = 1; i < 6; i++) { const x = i * w / 6.2; [1, -1].forEach(d => { g.beginPath(); g.moveTo(x, h / 2); g.quadraticCurveTo(x + 18, h / 2 - d * 20, x + 34, h / 2 - d * 44); g.stroke(); }); }
    }) });
    // Two round baby leaves near the soil, out with the first right answers
    coty = [1, -1].map(side => { const pv = new T.Group(); pv.position.copy(TRUNK.sample(0.72 / TRUNK.LEN).p); pv.rotation.y = side > 0 ? 0.3 : Math.PI + 0.3; plant.add(pv); const tilt = new T.Group(); pv.add(tilt); tilt.rotation.z = 0.5; G3.outline(mesh(leafGeo(0.6, 0.26, true, 0.25, 0.25), leafM, tilt, 0.05, 0, 0)); pv.scale.setScalar(0.001); return pv; });
    // Money Sense's big leaves stay on the stalk while another subject is in view, drawn together in one go
    { const g = leafGeo(1.45, 0.61, true, 0.12, 0.35); G3.outline(new T.Mesh(g, leafM)); ghost = inst(g, leafM, 40); ghostInk = inst(g, INKI, 40); ghostInk.instanceMatrix = ghost.instanceMatrix; }

    // The flower: sepals and two rings of petals around a sunny centre, a closed bud until the last lesson
    flower = new T.Group(); plant.add(flower); flower.scale.setScalar(0.001);
    const petalShape = new T.Shape(); petalShape.moveTo(0, 0); petalShape.bezierCurveTo(0.36, 0.2, 0.44, 0.85, 0, 1.15); petalShape.bezierCurveTo(-0.44, 0.85, -0.36, 0.2, 0, 0);
    const petalRing = (n, len, c, base, open0, open1, offset) => {
      const g = new T.ExtrudeGeometry(petalShape, { depth: 0.03, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -0.015); g.scale(len / 1.15 * 0.9, len / 1.15, 1);
      { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) + 0.9 * x * x - 0.1 * y * y); } g.computeVertexNormals(); }
      const m = new T.MeshToonMaterial({ color: col(c), gradientMap: G3.GRAD, emissive: col(c).multiplyScalar(0.22) }); G3.rimPatch(m);
      return Array.from({ length: n }, (_, i) => { const yaw = new T.Group(); yaw.rotation.y = i / n * Math.PI * 2 + offset; flower.add(yaw); const tilt = new T.Group(); tilt.position.z = base; yaw.add(tilt); G3.outline(mesh(g, m, tilt)); return { tilt, open0, open1, d: i / n }; });
    };
    sepals = petalRing(5, 0.95, 0x3e9e31, 0.06, -0.15, 1.85, 0.3); outer = petalRing(8, 1.65, 0xff7db8, 0.12, -0.3, 1.1, 0); inner = petalRing(6, 1.15, 0xffc2dc, 0.08, -0.22, 0.75, 0.25);
    const heart = mesh(new T.SphereGeometry(0.38, 20, 12), toon(0xffd84d), flower, 0, 0.14, 0); heart.scale.y = 0.55; G3.outline(heart);
    { const dg = new T.SphereGeometry(0.035, 6, 4), ds = []; for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 0.07 + 0.17 * Math.sqrt(i / 14); ds.push(mesh(dg, toon(0xf08a24), flower, Math.cos(a) * r * 1.25, 0.33 - r * 0.35, Math.sin(a) * r * 1.25)); } bake(flower, ds); }
    rays = new T.Sprite(new T.SpriteMaterial({ map: canvasTex(512, 512, (g, w) => { g.translate(w / 2, w / 2); for (let i = 0; i < 16; i++) { g.rotate(Math.PI / 8); const gr = g.createLinearGradient(0, 0, 0, -w / 2); gr.addColorStop(0, 'rgba(255,240,170,.55)'); gr.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(0, -w / 2); g.fill(); } }), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }));
    rays.scale.set(8, 8, 1); plant.add(rays);

    // A faint dotted path along to where this subject will bloom, so kids can see the journey ahead (placed per subject)
    dots = new T.InstancedMesh(new T.SphereGeometry(0.045, 8, 6), new T.MeshBasicMaterial({ color: col(0xffffff), transparent: true, opacity: 0.75 }), 80); dots.count = 0; dots.userData.at = []; dots.frustumCulled = false; plant.add(dots);
    goalStar = new T.Sprite(new T.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, opacity: 0.85 })); plant.add(goalStar);

    butterflies = [0xff9f1c, 0x5b8cff].map(c => {
      const g = new T.Group(), wm = new T.MeshBasicMaterial({ transparent: true, side: T.DoubleSide, depthWrite: false, map: canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#' + c.toString(16).padStart(6, '0'); x.beginPath(); x.ellipse(w * 0.45, h * 0.36, w * 0.4, h * 0.3, -0.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(w * 0.4, h * 0.74, w * 0.28, h * 0.2, 0.4, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(w * 0.55, h * 0.3, w * 0.07, 0, 7); x.fill(); x.strokeStyle = '#2b2238'; x.lineWidth = 6; x.beginPath(); x.ellipse(w * 0.45, h * 0.36, w * 0.4, h * 0.3, -0.3, 0, Math.PI * 2); x.stroke(); }) });
      const wings = [1, -1].map(s => { const w = new T.Group(); g.add(w); const m = mesh(new T.PlaneGeometry(0.5, 0.5), wm, w, s * 0.25, 0, 0); if (s < 0) m.scale.x = -1; m.rotation.x = -Math.PI / 2; return w; });
      mesh(new T.CylinderGeometry(0.03, 0.03, 0.34, 6), new T.MeshBasicMaterial({ color: col(0x2b2238) }), g).rotation.x = Math.PI / 2;
      g.visible = false; scene.add(g); return { g, wings };
    });
  }
  function signFor(name) {
    const words = String(name).split(' '), lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name];
    if (signMesh.material.map) signMesh.material.map.dispose();
    signMesh.material.map = canvasTex(256, 100, (g, w, h) => { g.fillStyle = '#c98a4b'; g.fillRect(0, 0, w, h); g.fillStyle = '#3b2412'; g.textAlign = 'center'; g.textBaseline = 'middle'; const fs = Math.min(38, 230 / Math.max(...lines.map(l => l.length)) * 1.7); g.font = `900 ${fs}px Nunito, ui-rounded, sans-serif`; lines.forEach((l, i) => g.fillText(l, w / 2, lines.length > 1 ? h * (i ? 0.72 : 0.3) : h / 2)); });
    signMesh.material.needsUpdate = true;
  }

  /* Particles: sparkles, leaf bits and petals */
  const P = [], PG = {}; let starTex = null; // leaf bits and petals share one plane each
  function burst(at, n, kind) {
    starTex = starTex || canvasTex(64, 64, (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = '#fff6c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 30, a = i * Math.PI / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); });
    for (let i = 0; i < n; i++) {
      let o;
      // Petals in a branch's bloom take its subject's colour; everything scales with the part of the tree in view
      if (kind === 'star') { o = new T.Sprite(new T.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, color: col(i % 3 ? 0xfff2a8 : 0xffffff) })); o.scale.setScalar((0.28 + Math.random() * 0.2) * K); }
      else { const c = kind === 'leaf' ? [0x5cc13f, 0x8be06a, 0x3e9e31][i % 3] : isMS() ? [0xff6fa8, 0xffa8cb, 0xffffff, 0xffd84d][i % 4] : [PATH.tree.hue, PATH.tree.hue, '#ffffff', 0xffd84d][i % 4]; o = new T.Mesh(PG[kind] || (PG[kind] = new T.PlaneGeometry(kind === 'leaf' ? 0.22 : 0.2, 0.13)), new T.MeshBasicMaterial({ color: col(c), side: T.DoubleSide, transparent: true })); o.scale.setScalar(K); }
      o.position.copy(at); scene.add(o);
      const a = Math.random() * Math.PI * 2, up = (kind === 'petal' ? 2.5 + Math.random() * 3 : 1 + Math.random() * 2.2) * K, sp = (kind === 'petal' ? 2 + Math.random() * 3 : 1 + Math.random() * 1.6) * K;
      P.push({ o, v: V3(Math.cos(a) * sp, up, Math.sin(a) * sp), g: K, life: 0, max: kind === 'petal' ? 4 + Math.random() * 2 : 1 + Math.random() * 0.6, spin: V3(Math.random() * 6, Math.random() * 6, Math.random() * 6), kind });
    }
  }
  function tickParticles(dt) {
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt; const f = p.life / p.max;
      if (f >= 1) { scene.remove(p.o); p.o.material.dispose(); P.splice(i, 1); continue; }
      p.v.multiplyScalar(Math.exp(-(p.kind === 'star' ? 2.2 : 1.1) * dt)); p.v.y -= (p.kind === 'star' ? 1.5 : 1.2) * p.g * dt; if (p.kind === 'petal') p.v.x += Math.sin(p.life * 3 + i) * dt * 1.5 * p.g;
      p.o.position.addScaledVector(p.v, dt); if (!p.o.isSprite) { p.o.rotation.x += p.spin.x * dt; p.o.rotation.y += p.spin.y * dt; p.o.rotation.z += p.spin.z * dt; }
      p.o.material.opacity = f > 0.7 ? 1 - (f - 0.7) / 0.3 : 1;
    }
  }
  const tipWorld = () => plant.localToWorld(sample(V.s).p.clone());
  function pulse(n) { setTimeout(() => { if (!running) return; burst(tipWorld(), 10, 'star'); Sound.step(n); }, 220); }

  function mount() {
    if (el) return;
    R = new T.WebGLRenderer({ antialias: true }); pace = G3.pacer ? G3.pacer(R, 2) : (R.setPixelRatio(Math.min(2, devicePixelRatio || 1)), () => {}); R.outputEncoding = T.sRGBEncoding; R.toneMapping = T.NoToneMapping;
    el = document.createElement('div'); el.className = 'pl';
    el.innerHTML = '<div class="pl-tags"></div><div class="pl-btns"><button class="pl-follow" type="button" hidden>⬇ Back to my lessons</button><button class="pl-over" type="button">🌳 My whole tree</button></div><section class="pl-card" aria-live="polite"></section>';
    cv = R.domElement; cv.className = 'pl-cv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Your Learning Tree. Drag or scroll to look along it, and tap a label to see its lesson.'); el.prepend(cv);
    tagsEl = el.querySelector('.pl-tags'); cardEl = el.querySelector('.pl-card'); followEl = el.querySelector('.pl-follow'); overEl = el.querySelector('.pl-over');
    followEl.onclick = () => { CAM.manual = null; showFollow(); Sound.tap(); };
    overEl.onclick = () => { overview(!CAM.over); Sound.tap(); };
    // Looking along the part of the tree in view; the whole-tree view looks over all of it
    const lo = () => (CAM.over ? 0.4 : Math.max(0.4, PATH.SP[0].y - 1)), top = () => (CAM.over ? treeTop() : sample(1).p.y + 1.5 * K);
    cv.addEventListener('wheel', e => { e.preventDefault(); CAM.manual = clamp((CAM.manual ?? CAM.y) - e.deltaY * 0.012 * (CAM.over ? 1.5 : K), lo(), top()); CAM.idle = 0; showFollow(); }, { passive: false });
    cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, cy: CAM.manual ?? CAM.y, az: CAM.az }; try { cv.setPointerCapture(e.pointerId); } catch (_) {} cv.classList.add('drag'); });
    cv.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y, dx = e.clientX - drag.x; if (Math.abs(dy) > 3 || CAM.manual != null) { CAM.manual = clamp(drag.cy + dy * (CAM.dist / Math.max(300, CAM.h)) * 1.1, lo(), top()); CAM.idle = 0; showFollow(); } CAM.az = drag.az - dx * 0.004; });
    const up = () => { drag = null; cv.classList.remove('drag'); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    const ro = new (window.ResizeObserver || function () { return { observe() {} }; })(resize); ro.observe(el); ro.observe(cardEl);
    world();
  }

  /* The plan: this band's lessons in order, each with its share of the stalk and a big leaf where it ends, and a
     ring at the end of every unit */
  const PITCH = 0.2, ROLL = 0.22, LEAF_AZ = 0.35;
  const leafSide = i => (i % 2 ? -1 : 1);
  // A subject's lessons in order, each with its share of the answers (`from` to `to`)
  function lessonsOf(treeId, band) {
    const pack = TREE[treeId] && packFor(treeId, band), LS = [], US = []; let a = 0;
    for (const u of pack ? pack.units : []) { if (!u.lessons.length) continue; const ls = []; for (const l of u.lessons) { const w = Math.max(1, l.checks.length); ls.push(LS.length); LS.push({ l, u: US.length, from: a, to: a + w }); a += w; } US.push({ unit: u, ls }); }
    return { LS, US, Q: Math.max(1, a) };
  }
  // The leaf direction for a lesson: either side of where the camera usually looks from, so both show their tops
  const leafYaw = (i, side, az0) => (side > 0 ? LEAF_AZ - 0.35 : Math.PI + LEAF_AZ + 0.35) + ((i * 7) % 5 - 2) * 0.05 + (az0 - 0.35);
  function plan(kid, tree) {
    if (planG) { planG.traverse(o => { if (o.userData.own) o.geometry.dispose(); }); dropItems(); plant.remove(planG); }
    planG = new T.Group(); plant.add(planG); prizeGs = []; prizeSig = ''; ITEMS = [];
    // Money Sense grows the stalk; every other subject grows its own branch, with smaller leaves the camera comes closer to
    PATH = BRANCH[tree.id] || TRUNK; K = PATH.K; CAM.az0 = PATH === TRUNK ? 0.35 : PATH.az0;
    ({ LS, US, Q } = lessonsOf(tree.id, bandOf(kid)));
    LS.forEach(x => { x.at = uOf(x.to); });
    GOAL = sample(1).p.clone().add(V3(0, 0.6 * K, 0)); goalStar.position.copy(sample(1).p); goalStar.scale.set(1.6 * K, 1.6 * K, 1);
    { const at = []; for (let d = 0.18 * K; d < PATH.LEN * TOP && at.length < 80; d += 0.32 * K) at.push(d / PATH.LEN); dots.userData.at = at; dots.userData.s = -1; dots.count = at.length; }
    LEAVES = LS.map((x, i) => {
      const side = leafSide(i), at = x.at - 0.01, L = lerp(1.65, 1.3, LS.length > 1 ? i / (LS.length - 1) : 0), pv = new T.Group(); pv.position.copy(sample(at).p);
      pv.rotation.y = leafYaw(i, side, CAM.az0); planG.add(pv);
      const pitch = new T.Group(); pv.add(pitch); const roll = new T.Group(); pitch.add(roll);
      const stem = mesh(new T.CylinderGeometry(0.035, 0.05, 0.5, 8), toon(0x4fae36), roll, 0.25, 0, 0); stem.rotation.z = Math.PI / 2; stem.userData.own = 1;
      mesh(leafGeo(L, L * 0.42, true, 0.12, 0.35), leafM, roll, 0.45, 0, 0).userData.own = 1;
      G3.outline(roll);
      // The spot on the blade's top where its XP or prize sits, found with the leaf fully open
      const padL = V3(0.45 + L * 0.55, 0.02 - 0.12 * L * 0.3, 0), padS = V3();
      pitch.rotation.z = PITCH; roll.rotation.x = side * ROLL; pv.scale.setScalar(K); pv.updateMatrixWorld(true); planG.worldToLocal(roll.localToWorld(padS.copy(padL)));
      // `base` is where the leaf joins a thin stalk; as the stalk thickens into a trunk the leaf moves out with its bark
      const yaw = pv.rotation.y; pv.scale.setScalar(0.001); return { pv, pitch, roll, side, at, t: 0, L, padL, padS, pad: padS.clone(), base: pv.position.clone(), dir: V3(Math.cos(yaw), 0, -Math.sin(yaw)), off: V3() };
    });
    UN = US.map(U => { const u = LS[U.ls[U.ls.length - 1]].at - 0.02, q = sample(u), m = new T.Mesh(KNG, RING); m.position.copy(q.p); m.quaternion.setFromUnitVectors(V3(0, 0, 1), q.t); m.scale.setScalar(0.001); G3.outline(m); planG.add(m); return { m, t: 0, gold: 0, at: u }; });
    tagsEl.innerHTML = '';
    tagEls = LS.map((x, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl-tag'; b.dataset.g = 'plantSel'; b.dataset.i = i; tagsEl.appendChild(b); return b; });
    utagEls = US.map((U, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'pl-utag'; b.dataset.g = 'plantUnit'; b.dataset.i = i; tagsEl.appendChild(b); return b; });
    goalEl = document.createElement('div'); goalEl.className = 'pl-goal'; goalEl.textContent = isMS() ? '🌸 Bloom' : '🌸 Blossom'; tagsEl.appendChild(goalEl);
    signFor(`${kid.name}’s tree`);
  }
  /* The whole tree's progress: how far each subject has grown its part, worked out from every subject's lessons */
  let TS = { F: 0, ms: null, br: {}, need: 0 };
  function treeState(kid) {
    const band = bandOf(kid), s = { F: 0, ms: null, br: {}, need: 0 };
    for (const tr of ALL_TREES) {
      const { LS: ls, Q: q } = tr.id === treeId ? { LS, Q } : lessonsOf(tr.id, band), pass = ls.map(x => passed(kid, x.l.id)), P = BRANCH[tr.id] || TRUNK;
      const steps = ls.reduce((a, x, i) => a + (pass[i] ? x.to - x.from : 0), 0), k = pass.filter(Boolean).length, all = ls.length > 0 && k === ls.length;
      const at = ls.map(x => P.sprout + (TOP - P.sprout) * Math.min(1, x.to / q));
      // `r` is how far a branch reaches when it isn't in view: each lesson pushes it out, quickly at first
      const x = { n: ls.length, k, all, pass, at, s: all ? 1 : steps ? P.sprout + (TOP - P.sprout) * Math.min(1, steps / q) : 0, r: all ? 1 : k ? 0.2 + 0.8 * Math.sqrt(k / ls.length) : 0 };
      if (tr.id === 'money') s.ms = x; else { s.br[tr.id] = x; s.F += ls.length ? k / ls.length : 0; if (k) s.need = Math.max(s.need, P.u0 + 0.05); }
    }
    return s;
  }
  // The kid's guide hovers beside the growing tip. Its colours are sRGB like the rest of this view.
  function setGuide(kind) {
    if (guide && guideKind === kind) return; if (guide) plant.remove(guide.g);
    const mine = new Set(), gm = guideModel(kind, (c, o = {}) => { const m = toon(c, { e: o.e }); mine.add(m); return m; });
    gm.g.traverse(o => { const m = o.material; if (!o.isMesh || mine.has(m) || m.userData.lin) return; m.color.convertSRGBToLinear(); if (m.emissive) m.emissive.convertSRGBToLinear(); m.userData.lin = 1; });
    G3.outline(gm.g); guide = { g: new T.Group(), body: gm.g, P: gm.P, hop: 0, shake: 0 }; guide.g.add(gm.g); guide.g.scale.setScalar(0.5); guide.g.position.set(1.3, 0, 0.6); plant.add(guide.g); guideKind = kind;
  }

  /* What sits on a leaf: a gold star with the lesson's XP, or the island prize the lesson won */
  const TX = {}, sprite = (map, w, h, o = {}) => { const s = new T.Sprite(new T.SpriteMaterial({ map, transparent: true, depthWrite: false, ...o })); s.scale.set(w, h, 1); return s; };
  function badgeTex(text, c1, c2, fg) {
    const k = `b|${text}|${c1}`; if (TX[k]) return TX[k];
    return (TX[k] = canvasTex(256, 104, (g, w, h) => {
      const r = 40, path = () => { g.beginPath(); g.moveTo(r + 6, 6); g.arcTo(w - 6, 6, w - 6, h - 6, r); g.arcTo(w - 6, h - 6, 6, h - 6, r); g.arcTo(6, h - 6, 6, 6, r); g.arcTo(6, 6, w - 6, 6, r); g.closePath(); };
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); path(); g.fillStyle = gr; g.fill(); g.lineWidth = 7; g.strokeStyle = '#2b2238'; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(w / 2, 26, w / 2 - 34, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${text.length > 8 ? 40 : 48}px Nunito, ui-rounded, sans-serif`; g.fillText(text, w / 2, h / 2 + 3);
    }));
  }
  // A padlock, shut or sprung open
  function lockTex(open) {
    const k = `lock|${open}`; if (TX[k]) return TX[k];
    return (TX[k] = canvasTex(128, 128, (g) => {
      g.lineCap = 'round'; g.lineWidth = 15; g.strokeStyle = '#2b2238'; const sh = () => { g.beginPath(); g.moveTo(40, 66); g.lineTo(40, 42); g.arc(64, 42, 24, Math.PI, 0); g.lineTo(88, open ? 30 : 66); g.stroke(); };
      g.save(); if (open) { g.translate(64, 0); g.rotate(-0.5); g.translate(-64, -16); } sh(); g.lineWidth = 7; g.strokeStyle = '#c9cfdc'; sh(); g.restore();
      const box = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); g.fill(); };
      g.fillStyle = '#2b2238'; box(22, 58, 84, 62, 14); const gr = g.createLinearGradient(0, 62, 0, 116); gr.addColorStop(0, '#ffe066'); gr.addColorStop(1, '#f2a91e'); g.fillStyle = gr; box(28, 64, 72, 50, 10);
      g.fillStyle = '#2b2238'; g.beginPath(); g.arc(64, 84, 8, 0, Math.PI * 2); g.fill(); g.fillRect(60, 86, 8, 16);
    }));
  }
  const bubbleTex = () => TX.bubble || (TX.bubble = canvasTex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, w * 0.3, w / 2, w / 2, w / 2 - 4); r.addColorStop(0, 'rgba(255,255,255,0.06)'); r.addColorStop(0.8, 'rgba(220,245,255,0.3)'); r.addColorStop(1, 'rgba(255,255,255,0.9)');
    g.fillStyle = r; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - 4, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.ellipse(w * 0.33, w * 0.3, 26, 14, -0.7, 0, Math.PI * 2); g.fill();
  }));
  let STAR_G = null;
  function starG() {
    if (STAR_G) return STAR_G; const sh = new T.Shape(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 0.11 : 0.25, a = Math.PI / 2 + k * Math.PI / 5; k ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    STAR_G = new T.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); STAR_G.center(); return STAR_G;
  }
  // Scales a prize model to about the same size as the leaf's star
  function prizeMesh(id) { const m = G3.prize && G3.prize(id); if (!m) return null; const b = new T.Box3().setFromObject(m); m.scale.setScalar(clamp(0.55 / Math.max(0.05, b.max.y - b.min.y), 0.8, 3.2)); return m; }
  // A locked bubble around a prize that is still to be won
  function encase(g) { const bubble = sprite(bubbleTex(), 1.05, 1.05), lock = sprite(lockTex(false), 0.34, 0.34); bubble.position.y = 0.28; lock.position.set(0.3, 0.02, 0); g.add(bubble, lock); return { bubble, lock }; }
  // What passing a lesson earned: saved with the pass, or found in the attempt log for passes from before that
  function earned(kid, id) {
    const g = prog(kid), d = (g.done || {})[id] || {}; if (d.xp != null || d.prize) return { xp: d.xp || 0, prize: d.prize || null };
    const e = (g.log || []).find(x => x.id === id && x.kind === 'lesson' && x.t && x.c / x.t >= 0.8); return { xp: e ? e.xp : XP.lesson, prize: null };
  }
  function freeG(g) { g.traverse(o => { if (o.isMesh && !o.userData.ink && o.geometry && o.geometry !== STAR_G) o.geometry.dispose(); if (o.isSprite) o.material.dispose(); }); }
  function dropItems() { for (const it of ITEMS) if (it) { planG.remove(it.g); freeG(it.g); } ITEMS = []; }
  // Builds or keeps what sits on each passed lesson's leaf. The lesson being celebrated keeps its prize locked.
  function placeItems(kid, skip) {
    LS.forEach((x, i) => {
      const old = ITEMS[i]; if (!real[i]) { if (old) { planG.remove(old.g); freeG(old.g); ITEMS[i] = null; } return; }
      const e = earned(kid, x.l.id), info = e.prize && C.prizeInfo ? C.prizeInfo(e.prize) : null, sig = info ? `p:${e.prize}` : `x:${e.xp}`;
      // A prize left locked by a celebration that was cut short just sits on its leaf
      if (old && old.sig === sig) { if (old.state === 'locked' && x.l.id !== skip) { old.g.remove(old.bubble, old.lock); old.bubble.material.dispose(); old.lock.material.dispose(); old.state = 'on'; } return; }
      if (old) { planG.remove(old.g); freeG(old.g); }
      const g = new T.Group(), it = { g, i, sig, kind: 'xp', state: 'on', k: 0 }; planG.add(g); g.scale.setScalar(0.001);
      const m = info && prizeMesh(e.prize);
      if (m) { Object.assign(it, { kind: 'prize', m, info }); g.add(m); const halo = sprite(glowTex, 1.1, 1.1, { opacity: 0.4 }); halo.position.y = 0.25; g.add(halo); if (x.l.id === skip) { it.state = 'locked'; Object.assign(it, encase(g)); } }
      else { const s = mesh(starG(), toon(0xffc93c, { e: 0x5a3a00 }), g, 0, 0.3, 0); G3.outline(s); it.m = s; const b = sprite(badgeTex(e.xp > 0 ? `+${e.xp} XP` : 'Passed!', '#fff6c8', '#ffd84d', '#3a2400'), 0.86, 0.35); b.position.y = 0.78; g.add(b); it.badge = b; }
      ITEMS[i] = it;
    });
  }

  /* Progress */
  function refresh(kid, skip) {
    real = LS.map(x => passed(kid, x.l.id)); done = LS.map((x, i) => real[i] && x.l.id !== skip);
    passedA = LS.reduce((a, x, i) => a + (real[i] ? x.to - x.from : 0), 0);
    udone = US.map(U => U.ls.every(i => done[i])); crowned = US.map(U => ((prog(kid).units || {})[U.unit.id] || {}).best >= 0.8);
    cur = LS.findIndex((x, i) => !done[i] && (x.l.id === skip || available(kid, x.l)));
    const wasBloom = bloomOn; bloomOn = LS.length > 0 && done.every(Boolean);
    if (bloomOn && !wasBloom) { V.bloomT = 10; butterflies.forEach(b => { b.g.visible = true; }); }
    if (!bloomOn) { V.bloomT = 0; butterflies.forEach(b => { b.g.visible = false; }); }
    TS = treeState(kid); placeItems(kid, skip); placePrizes(kid); paintTags(kid);
    // A branch that just finished blossoms when its celebration gets there, not before
    if (skip && !isMS()) PATH.bloomT = 0;
  }
  // Snap every piece to where progress says it is, for a tree shown for the first time.
  function snap() {
    V.s = bloomOn ? 1 : uOf(shown); V.shell = shown > 0 || bloomOn || (TS.ms && TS.ms.k) ? 1 : 0; V.bud = budTarget(); V.F = TS.F; V.ts = TS.ms ? TS.ms.s : 0;
    BR.forEach(P => { const x = TS.br[P.tree.id]; P.s = P === PATH ? V.s : x ? x.r : 0; P.bloomT = x && x.all && (P !== PATH || bloomOn) ? 10 : 0; });
    P_T.fill(9); builtTree = '';
    UN.forEach((k, i) => { k.t = udone[i] && k.at <= V.s + 0.004 ? 1 : 0; }); LEAVES.forEach((lf, i) => { lf.t = done[i] && lf.at <= V.s + 0.004 ? 1 : 0; });
    CAM.manual = null; CAM.y = followY(); CAM.dist = baseDist(); CAM.az = CAM.az0; PATH.atY(CAM.y, CAM.tgt); if (isMS()) CAM.tgt.set(0, CAM.y, 0);
  }
  function budTarget() { if (!isMS()) return TS.ms && TS.ms.all ? 1 : 0; if (bloomOn) return 1; const U = US[US.length - 1]; if (!U) return 0; const from = LS[U.ls[0]].from; return clamp((shown - from) / Math.max(1, Q - from), 0, 1) * 0.5; }
  // Island prizes: the next prize, and the one planned after it, wait in a locked bubble where the leaf of the
  // lesson that will win them is going to grow.
  function placePrizes(kid) {
    const ups = Prize.upcoming(kid); prizeAt = {}; let n = 0;
    LS.forEach((x, i) => { if (real[i]) return; n++; const u = ups.find(p => p.left === n); if (u) prizeAt[i] = u; });
    const sig = Object.entries(prizeAt).map(([i, u]) => `${i}:${u.id}`).join(','); if (sig === prizeSig) return; prizeSig = sig;
    for (const p of prizeGs) { planG.remove(p.g); freeG(p.g); } prizeGs = [];
    for (const [i, u] of Object.entries(prizeAt)) {
      const m = prizeMesh(u.id); if (!m) continue; const g = new T.Group(); g.add(m); g.scale.setScalar(K); const { bubble, lock } = encase(g);
      planG.add(g); prizeGs.push({ g, m, i: +i, bubble, lock });
    }
  }

  /* Labels that ride on the stalk */
  // A lesson's label sits just under its own leaf, so the space above every leaf is free for what it carries
  const sideOf = i => leafSide(i), UNDER = 30;
  function medalOf(kid, l) { const m = medal(kid, l); return m === 'gold' ? '🥇' : m === 'silver' ? '🥈' : '🥉'; }
  function paintTags(kid) {
    LS.forEach((x, i) => {
      const b = tagEls[i], l = x.l, d = done[i], isCur = i === cur, open = !d && !isCur && available(kid, l), pz = prizeAt[i], isSel = sel && sel.k === 'l' && sel.i === i, title = esc(local(l.title));
      b.className = `pl-tag ${d ? 'done' : isCur ? 'cur' : open ? 'open' : 'locked'}${isSel ? ' sel' : ''}`;
      b.setAttribute('aria-label', `Lesson ${l.unit}.${l.n}, ${local(l.title)}, ${d ? 'done' : isCur ? 'up next' : open ? 'ready' : 'locked'}`);
      b.innerHTML = d ? `<span class="n">${medalOf(kid, l)}</span>${title}` : isCur ? `<span class="n">▶</span><span><small>Up next${pz ? ' · wins a prize' : ''}</small>${title}</span>${pz ? `<span class="pz">${pz.info.icon}</span>` : ''}` : `<span class="n">${open ? `${l.unit}.${l.n}` : '🔒'}</span>${open ? title : `${l.unit}.${l.n}`}${pz ? `<span class="pz">${pz.info.icon}</span>` : ''}`;
      b._w = 0;
    });
    US.forEach((U, i) => { const b = utagEls[i]; b.className = `pl-utag${crowned[i] ? ' crown' : ''}${sel && sel.k === 'u' && sel.i === i ? ' sel' : ''}`; b.innerHTML = `${crowned[i] ? '👑' : '🏆'} Unit ${U.unit.n} ${crowned[i] ? 'crown won' : 'challenge'}`; b.setAttribute('aria-label', `Unit ${U.unit.n}, ${local(U.unit.title)}: ${crowned[i] ? 'crown won' : 'challenge open'}`); b._w = 0; });
  }
  const tmp = V3(), tq = {}, hide = b => { if (b._on !== false) { b.style.visibility = 'hidden'; b._on = false; } };
  function placeTags() {
    const W = CAM.w, Hh = CAM.h, topY = CAM.top + 6, botY = Hh - (CAM.wide ? 0 : CAM.sheet) - 10, maxX = CAM.wide ? W - CAM.cardW - 24 : W - 8, cy = CAM.manual ?? CAM.y;
    // Labels show near where the camera looks (closer on a branch, where everything is smaller), and none in the whole-tree view
    const hideBloom = (bloomOn && V.bloomT > 1 && V.bloomT < 8) || CAM.over ? 0 : 1, near = 4.2 * K;
    // Puts a label beside a point on the plant: outward to the right (side 1) or left (-1), or centred below it
    // (0), moved down by dy pixels.
    const put = (b, p, side, fade, dy = 0) => {
      tmp.copy(p); plant.localToWorld(tmp); tmp.project(cam);
      const x = (tmp.x + 1) / 2 * W, y = (1 - tmp.y) / 2 * Hh;
      if (!b._w) { b._w = b.offsetWidth; b._h = b.offsetHeight; }
      if (tmp.z > 1 || fade <= 0.02 || y < topY + b._h / 2 || y > botY - b._h || x < -200 || x > W + 200) return hide(b);
      if (b._on !== true) { b.style.visibility = 'visible'; b._on = true; }
      const left = side > 0 ? x + 26 : side < 0 ? x - 26 - b._w : x - b._w / 2, top = (side ? y - b._h / 2 : y) + dy;
      // Only labels that moved are written, so a still plant doesn't restyle the page every frame
      const tf = `translate(${clamp(left, 8, Math.max(8, maxX - b._w)).toFixed(1)}px,${top.toFixed(1)}px)`, op = fade.toFixed(2);
      if (b._tf !== tf) { b.style.transform = tf; b._tf = tf; } if (b._op !== op) { b.style.opacity = op; b._op = op; }
    };
    LS.forEach((x, i) => { const p = sample(x.at, tq).p; put(tagEls[i], p, sideOf(i), hideBloom * clamp(1.25 - Math.abs(p.y - cy) / near, 0, 1), UNDER); });
    // A finished unit's label stacks under the label of its last lesson
    US.forEach((U, i) => { const j = U.ls[U.ls.length - 1], k = UN[i]; if (k.t < 0.6) { hide(utagEls[i]); return; } const p = sample(LS[j].at, tq).p; if (!utagEls[i]._w) { utagEls[i]._w = utagEls[i].offsetWidth; utagEls[i]._h = utagEls[i].offsetHeight; } put(utagEls[i], p, sideOf(j), hideBloom * clamp(1.25 - Math.abs(p.y - cy) / near, 0, 1), UNDER + (tagEls[j]._h || 30) / 2 + 6 + utagEls[i]._h / 2); });
    put(goalEl, GOAL, 1, bloomOn || CAM.over ? 0 : clamp(1.2 - Math.abs(GOAL.y - cy) / (6 * K), 0, 1));
  }

  /* The card beside the plant: the chosen lesson, a unit's challenge, or the finished plant */
  function card(kid) {
    const tree = TREE[treeId], s = CAM.over ? { k: 'o' } : sel || { k: 'l', i: 0 }, ms = isMS(); let h;
    if (s.k === 'o') {
      const st = stageOf();
      h = `<div class="plc-ic">🌳</div><div class="plc-eb">${esc(kidName)}’s Learning Tree · Stage ${st + 1} of ${STAGES.length}</div><div class="plc-t">${STAGES[st][0]}</div><p class="plc-p">${STAGES[st][1]}</p>
        <div class="plc-subj">${TREES.map(tr => { const x = tr.id === 'money' ? TS.ms : TS.br[tr.id], n = x ? x.n : 0, k = x ? x.k : 0; return `<button class="plc-s${tr.id === treeId ? ' on' : ''}" data-g="tree" data-id="${tr.id}" style="--h:${tr.hue}"><span class="ic">${tr.icon}</span><span class="nm"><b>${esc(tr.name)}</b><small>${tr.id === 'money' ? 'The seed, stalk and flower' : 'A branch'}</small><i style="--p:${n ? Math.round(k / n * 100) : 0}%"></i></span><span class="st">${x && x.all ? '🌸 Done' : `${k} of ${n}`}</span></button>`; }).join('')}</div>
        ${TREES.length < ALL_TREES.length ? '<p class="plc-goal">🌱 More subjects are on their way. Each one grows a new branch on your tree.</p>' : ''}<div class="plc-act"><button class="g-go" data-g="plantOver">⬇ Back to my lessons</button></div>`;
    } else if (s.k === 'e') {
      h = ms ? `<div class="plc-ic">🌱</div><div class="plc-eb">${esc(tree.name)}</div><div class="plc-t">Your seed is planted</div><p class="plc-p">Lessons for ${esc(tree.name)} are on their way. When they arrive, every question you get right helps this seed grow.</p>`
        : `<div class="plc-ic">${esc(tree.icon)}</div><div class="plc-eb">${esc(tree.name)}</div><div class="plc-t">A bud is waiting on your tree</div><p class="plc-p">Lessons for ${esc(tree.name)} are on their way. When they arrive, every question you get right grows this branch.</p>`;
    } else if (s.k === 'b') {
      const left = crowned.filter(c => !c).length;
      h = `<div class="plc-ic">🌸</div><div class="plc-eb">${esc(tree.name)} · every lesson done</div><div class="plc-t">${ms ? 'Your flower bloomed!' : 'Your branch blossomed!'}</div><p class="plc-p">You passed all ${LS.length} lessons and grew ${LS.length} leaves${ms ? '' : ` on your ${esc(tree.name)} branch`}. ${left ? `Tap a unit’s label to try its challenge: ${left === 1 ? 'one crown' : `${left} crowns`} still to win.` : 'You won every unit crown too!'}</p><div class="plc-act"><button class="g-go ghost" data-g="plantBloom">🌸 Watch it ${ms ? 'bloom' : 'blossom'} again</button></div>`;
    } else if (s.k === 'u') {
      const U = US[s.i], all = udone[s.i];
      h = `<div class="plc-ic">${crowned[s.i] ? '👑' : '🏆'}</div><div class="plc-eb">Unit ${U.unit.n} · ${all ? 'Every lesson passed' : 'Lessons still to pass'}</div><div class="plc-t">${esc(local(U.unit.title))} challenge</div><p class="plc-p">Mixed questions from the whole unit, with no hints. Get 80% to win the crown.</p><div class="plc-chips"><span>❓ Up to 8 questions</span><span>✨ +${XP.challenge} XP</span></div><div class="plc-act">${all ? `<button class="g-go" data-g="challenge" data-id="${U.unit.id}">${crowned[s.i] ? 'Play again' : '▶ Start the challenge'}</button>` : `<button class="g-go ghost" data-g="locked">🔒 Finish every lesson in Unit ${U.unit.n} first</button>`}</div>`;
    } else {
      const x = LS[s.i], l = x.l, d = done[s.i], open = d || s.i === cur || available(kid, l), first = s.i === cur && !real.some(Boolean), pz = prizeAt[s.i];
      const game = l.play ? GAME_NAME[l.play.type] || 'Game' : null, prev = s.i > 0 ? LS[s.i - 1].l : null;
      const e = real[s.i] ? earned(kid, l.id) : null, won = e && e.prize && C.prizeInfo ? C.prizeInfo(e.prize) : null;
      const chips = [`📖 ${l.learn.length} learn card${l.learn.length === 1 ? '' : 's'}`, game ? `🎮 ${game}` : '', l.checks.length ? `🌱 ${l.checks.length} question${l.checks.length === 1 ? '' : 's'} to grow` : '', e ? `✨ Earned +${e.xp} XP` : `✨ +${XP.lesson} XP`].filter(Boolean);
      const act = !open ? `<button class="g-go ghost" data-g="locked">🔒 ${prev ? `Pass “${esc(local(prev.title))}” first` : 'Pass the unit before this one first'}</button>` : `<button class="g-go" data-g="lesson" data-id="${l.id}">${d ? 'Play again' : first ? (ms ? '🌱 Plant my seed' : '🌿 Grow my branch') : '▶ Start lesson'}</button>`;
      // What it takes to move on, said plainly: kids need telling at every step
      const goal = d ? '' : !open ? (prev ? `🎯 To open this lesson, go back to “${esc(local(prev.title))}” and ${passGoal(prev.checks.length)}.` : '🎯 To open this lesson, pass every lesson in the unit before it.')
        : l.checks.length ? `🎯 ${passGoal(l.checks.length, true)} at the end to pass${s.i + 1 < LS.length ? ' and open the next lesson' : ''}.` : '';
      h = `<div class="plc-ic">${esc(l.icon)}</div><div class="plc-eb">Unit ${l.unit} · Lesson ${l.n}${d ? ` · ${medalOf(kid, l)}` : ''}</div><div class="plc-t">${esc(local(l.title))}</div><p class="plc-p">${esc(local(l.hook))}</p>
        ${first ? `<ul class="plc-how"><li><span>${ms ? '🌱' : '🌿'}</span>Every question you get right helps your ${ms ? 'seed' : 'branch'} grow.</li><li><span>🍃</span>Pass a lesson and a big leaf grows, with your XP or a prize on top.</li><li><span>🌸</span>Pass all ${LS.length} lessons and it ${ms ? 'flowers' : 'blossoms'}.</li></ul>` : `<div class="plc-chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>`}
        ${won ? `<div class="plc-prize ${won.big ? 'big' : ''}"><span>${won.icon}</span><span><small>Unlocked on this leaf</small><b>${esc(won.name)}</b></span></div>` : pz ? `<div class="plc-prize ${pz.info.big ? 'big' : ''}"><span>${pz.info.icon}</span><span><small>${pz.planned ? 'Planned prize' : 'Prize'}</small><b>${pz.planned ? 'Should win' : 'Pass this to win'} ${esc(pz.info.name)}</b></span></div>` : ''}${goal ? `<p class="plc-goal">${goal}</p>` : ''}<div class="plc-act">${act}</div>`;
    }
    cardEl.innerHTML = h; cardEl.classList.remove('in'); void cardEl.offsetWidth; cardEl.classList.add('in');
  }
  function pickDefault(kid) { sel = !LS.length ? { k: 'e' } : cur >= 0 ? { k: 'l', i: cur } : bloomOn ? { k: 'b' } : { k: 'l', i: 0 }; paintTags(kid); card(kid); }
  function select(k, i) {
    const kid = kidNow(); if (!kid || busy || (k === 'l' && !LS[i]) || (k === 'u' && !US[i])) return;
    sel = { k, i }; paintTags(kid); card(kid); Sound.tap();
    // Look at what was tapped; the current lesson and the bloom go back to following the tip.
    CAM.manual = k === 'u' ? sample(UN[i].at).p.y : k === 'l' && i !== cur ? sample(LS[i].at).p.y + 0.1 * K : null; CAM.idle = 0; showFollow();
  }
  // Steps back to see the whole tree, with its stage and every subject in the card, or comes back to the lessons
  function overview(on) {
    const kid = kidNow(); if (!kid || busy || mode !== 'tree') return;
    CAM.over = !!on; CAM.manual = null; CAM.idle = 0; card(kid); showFollow(); resize();
  }
  function showFollow() {
    if (followEl) followEl.hidden = mode !== 'tree' || CAM.over || CAM.manual == null || Math.abs(CAM.manual - followY()) < 0.6 * K;
    if (overEl) { overEl.textContent = CAM.over ? '⬇ Back to my lessons' : '🌳 My whole tree'; overEl.hidden = mode !== 'tree'; }
  }
  /* The tree's stages, from the seed to full bloom */
  const STAGES = [
    ['A seed in the soil', 'Pass your first Money Sense lesson and the seed cracks open.'],
    ['Seedling', 'Every Money Sense lesson grows the stalk and adds a big leaf. Pass them all and it flowers.'],
    ['First flower', 'Money Sense is done and its flower is out. Every new subject grows a branch, and the stalk starts turning into a tree.'],
    ['Sapling', 'The stalk is turning to wood and roots are creeping over the island. Every lesson in another subject grows its branch and adds a cluster of leaves.'],
    ['Young tree', 'Finish a subject and its branch blossoms in that subject’s colour, with its badge hanging at the tip.'],
    ['Growing tree', 'The trunk thickens with every subject and the leaves fill in, with your first flower still at the top.'],
    ['Full bloom', 'Every subject is done. Your whole tree is in blossom.'],
  ];
  function stageOf() { const F = TS.F, ms = TS.ms || { k: 0, all: false }; return F >= ALL_TREES.length - 1.01 ? 6 : F >= 4 ? 5 : F >= 1 ? 4 : F > 0 ? 3 : ms.all ? 2 : ms.k ? 1 : 0; }
  // The top of the tree as it stands: the stalk's tip, or the highest branch tip
  function treeTop() { let y = TRUNK.sample(Math.max(trunkS(), 0.08)).p.y + 1.5; BR.forEach(P => { if (P.s > 0) y = Math.max(y, P.sample(P.s).p.y + 1.8); }); return y; }
  const trunkS = () => Math.max(isMS() ? V.s : V.ts, TS.need);
  const tipY = () => sample(V.s).p.y;
  const followY = () => (CAM.over ? treeTop() * 0.46 : bloomOn ? tipY() - lerp(0.4, 1.3, smooth(clamp(V.bloomT / 2.5, 0, 1))) * K : Math.max(isMS() ? 1 : PATH.SP[0].y + 0.4, tipY() - 0.2 * K));
  const TAN = Math.tan(Math.PI / 9); // half the camera's 40° view
  const baseDist = () => {
    if (CAM.over) { let w = 3.4; BR.forEach(P => { if (P.s > 0) w = Math.max(w, Math.hypot(P.sample(P.s).p.x, P.sample(P.s).p.z) + 1.6); }); const fw = Math.max(240, CAM.w - CAM.cardW), fh = Math.max(240, CAM.h - CAM.sheet - CAM.top); return Math.max(treeTop() * 0.62 / TAN * CAM.h / fh, w / TAN * CAM.h / fw) * 1.08; }
    const near = isMS() ? smooth(clamp(V.s / 0.12, 0, 1)) : 1, d = cam.aspect < 0.8 ? lerp(8.6, 10.5, near) : lerp(6.6, 8.2, near);
    // Far enough back that a whole leaf fits beside the stalk in the space the card leaves
    return Math.max(d, lerp(1.2, 2.65, near) * CAM.h / (Math.max(240, CAM.w - CAM.cardW) * TAN)) * K;
  };

  /* The moment a lesson is passed for the first time: the stalk catches up, the lesson's leaf unfurls and its XP
     pops up on top, or its prize unlocks onto it; a finished unit adds a ring, and after the last lesson the flower
     opens. */
  async function celebrate(kid, id, fresh, tok) {
    const i = LS.findIndex(x => x.l.id === id), x = LS[i], w = x.to - x.from;
    busy = true; refresh(kid, id); const full = passedA;
    shown = fresh ? full - w : clamp(shown, full - w, full); if (fresh) snap();
    sel = { k: 'l', i }; CAM.over = false; paintTags(kid); card(kid); CAM.manual = null; showFollow();
    const ok = () => tok === celTok && running, padWorld = () => plant.localToWorld(LEAVES[i].pad.clone());
    await wait(500);
    while (shown < full) { if (!ok()) return; shown++; pulse(shown); await wait(380); }
    for (let k = 0; k < 20 && Math.abs(uOf(shown) - V.s) > 0.004; k++) { await wait(80); if (!ok()) return; }
    done[i] = true; Sound.star(2); paintTags(kid);
    setTimeout(() => { if (ok()) burst(padWorld(), 16, 'leaf'); }, 350);
    await wait(1500); if (!ok()) return;
    const it = ITEMS[i];
    if (it && it.state === 'locked') { it.state = 'unlocking'; it.k = 0; await wait(3000); if (!ok()) return; }
    else { Sound.step(4); burst(padWorld().add(V3(0, 0.4, 0)), 12, 'star'); await wait(900); if (!ok()) return; }
    if (US[x.u].ls.every(j => done[j])) {
      udone[x.u] = true; UN[x.u].gold = 1; Sound.fanfare(); C.toast(`Unit ${US[x.u].unit.n} done! Its challenge is open.`);
      setTimeout(() => { if (ok()) burst(plant.localToWorld(sample(UN[x.u].at).p.clone()), 14, 'star'); }, 300);
      await wait(1600); if (!ok()) return;
    }
    if (done.every(Boolean)) { bloom(); await wait(4200); if (!ok()) return; }
    busy = false; refresh(kid); pickDefault(kid);
  }
  function bloom() {
    bloomOn = true; V.bloomT = 0; CAM.manual = null; showFollow(); butterflies.forEach(b => { b.g.visible = false; });
    // A branch blossoms in its subject's colour and hangs its badge at the tip
    if (!isMS()) {
      const tr = PATH.tree; PATH.bloomT = -1.2;
      setTimeout(() => { if (running) Sound.fanfare(); }, 900);
      setTimeout(() => { if (!running) return; const at = plant.localToWorld(sample(1).p.clone()); burst(at, 50, 'petal'); burst(at, 24, 'star'); butterflies.forEach(b => { b.g.visible = true; }); FX.rain([tr.hue, '#FFE066', '#fff', '#7CF5B5']); C.toast(`${tr.icon} Your ${tr.name} branch is in blossom!`); }, 1500);
      return;
    }
    sepals.concat(outer, inner).forEach(p => { p.tilt.rotation.x = p.open0; });
    setTimeout(() => { if (running) Sound.fanfare(); }, 1400);
    setTimeout(() => { if (!running) return; const at = V3(); flower.getWorldPosition(at); burst(at, 70, 'petal'); burst(at, 30, 'star'); butterflies.forEach(b => { b.g.visible = true; }); FX.rain(['#FF7DB8', '#FFC2DC', '#FFE066', '#fff', '#7CF5B5']); }, 2300);
  }

  function resize() {
    if (!R || !el.isConnected) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const w = r.width, h = r.height; R.setSize(w, h, false); cam.aspect = w / h; CAM.w = w; CAM.h = h;
    const quiz = mode === 'quiz', bar = !quiz && el.parentNode && el.parentNode.querySelector('.gw-top');
    el.classList.toggle('over', !quiz && CAM.over);
    CAM.wide = !quiz && w > 760 && w / h >= 0.8; CAM.top = bar ? bar.getBoundingClientRect().bottom - r.top : 0;
    el.classList.toggle('wide', CAM.wide); el.classList.toggle('phone', !quiz && !CAM.wide); el.style.setProperty('--pl-top', `${Math.round(CAM.top + 8)}px`);
    CAM.cardW = CAM.wide ? cardEl.offsetWidth + 16 : 0; CAM.sheet = !quiz && !CAM.wide ? cardEl.offsetHeight + 12 : 0;
    // Shift the picture so the plant sits in the space the card and top bar (or the guide's speech bubble) leave free.
    if (quiz) cam.setViewOffset(w, h, 0, -Math.min(50, h * 0.1), w, h); else cam.setViewOffset(w, h, CAM.wide ? Math.min(220, CAM.cardW / 2) : 0, (CAM.sheet - CAM.top) / 2, w, h);
    cam.updateProjectionMatrix(); tagEls.concat(utagEls, goalEl ? [goalEl] : []).forEach(b => { b._w = 0; });
  }

  /* Every frame */
  const tipQ = {}, flQ = {}, right = V3(), fwd = V3(), gp = V3(), dotQ = {}, dotM = new T.Matrix4(), bfV = V3(), UP = V3(0, 1, 0), lookV = V3();
  const m4 = new T.Matrix4(), mB = new T.Matrix4(), q4 = new T.Quaternion(), s4 = V3(), e4 = new T.Euler(), tA = V3(), tB = V3(), tC = V3();
  const P_T = new Float32Array(MAXP); let builtTree = '', ghostSig = '';
  const rnd = s => { const x = Math.sin(s * 127.1) * 43758.5453; return x - Math.floor(x); };
  const hover = (g, lf, i) => { g.position.copy(lf.padS).add(lf.off); g.position.y += (0.62 + (reduced ? 0 : Math.sin(t * 2 + i) * 0.06)) * K; };
  // The bubble and its lock sit on the camera's side of the prize, so they show in front of it
  function faceBubble(o, i) { o.bubble.position.set(0, 0.28, 0).addScaledVector(fwd, 0.42); o.lock.position.set(0, 0.04, 0).addScaledVector(right, 0.3).addScaledVector(fwd, 0.55); o.lock.material.rotation = reduced ? 0 : Math.sin(t * 3 + i) * 0.08; }
  // The unlock: the lock shakes and springs open, the bubble pops, and the prize drops onto its leaf with a spin
  // under an "Unlocked!" badge.
  const UNLOCK = 3.2;
  function unlockStep(it, lf, dt) {
    const k = (it.k += dt), g = it.g; g.scale.setScalar(K);
    if (k < 0.75) { hover(g, lf, it.i); faceBubble(it, it.i); it.lock.material.rotation = Math.sin(k * 38) * 0.35 * (k / 0.75); it.bubble.scale.setScalar(1.05 * (1 + Math.sin(k * 14) * 0.05)); it.m.rotation.y += dt * 0.7; return; }
    if (!it.popped) {
      it.popped = 1; it.from = g.position.clone(); it.spin0 = it.m.rotation.y; it.lock.material.map = lockTex(true); it.lock.material.rotation = 0; it.lock.material.needsUpdate = true;
      const at = plant.localToWorld(g.position.clone().add(V3(0, 0.28 * K, 0))); burst(at, 22, 'star'); burst(at, 10, 'petal');
      it.rays = sprite(rays.material.map, 2.4, 2.4, { blending: T.AdditiveBlending, opacity: 0 }); it.rays.position.y = 0.3; g.add(it.rays);
      it.label = sprite(badgeTex('Unlocked!', '#a8f7cd', '#2fb35a', '#0b3d1f'), 0.001, 0.001); it.label.position.y = 1.1; g.add(it.label);
      Sound.star(3); if (it.info.big) setTimeout(() => { if (running) Sound.fanfare(); }, 250); C.toast(`You unlocked ${it.info.name}!`);
    }
    g.position.lerpVectors(it.from, lf.pad, outBounce(clamp((k - 0.75) / 0.65, 0, 1)));
    it.m.rotation.y = it.spin0 + (1 - (1 - clamp((k - 0.75) / 1.3, 0, 1)) ** 3) * Math.PI * 4;
    const b = clamp((k - 0.75) / 0.25, 0, 1); it.bubble.scale.setScalar(1.05 * (1 + b * 0.7)); it.bubble.material.opacity = 1 - b;
    const lk = clamp((k - 0.75) / 0.6, 0, 1); it.lock.position.set(0, 0.04 + lk * 0.8, 0).addScaledVector(right, 0.3 + lk * 0.2).addScaledVector(fwd, 0.55); it.lock.material.opacity = 1 - lk;
    it.rays.material.opacity = 0.75 * clamp((k - 0.8) / 0.3, 0, 1) * clamp((UNLOCK - k) / 0.8, 0, 1); it.rays.material.rotation = k * 0.8;
    const ls = Math.max(0.001, outBack(clamp((k - 0.95) / 0.4, 0, 1))); it.label.scale.set(1.15 * ls, 0.47 * ls, 1); it.label.material.opacity = clamp((UNLOCK - k) / 0.5, 0, 1);
    if (k >= UNLOCK) { [it.bubble, it.lock, it.rays, it.label].forEach(s => { g.remove(s); s.material.dispose(); }); it.state = 'on'; }
  }
  /* The rest of the tree: the trunk as it thickens and turns to wood, the roots, every branch, the clusters of
     leaves for other subjects' lessons, blossoms on finished branches, and Money Sense's leaves while a branch is
     in view. Each piece is only rewritten when it changes. */
  function growTree(dt) {
    V.F += (TS.F - V.F) * (1 - Math.exp(-dt * 2)); if (Math.abs(TS.F - V.F) < 0.001) V.F = TS.F;
    if (!isMS()) { const want = TS.ms ? TS.ms.s : 0; V.ts += (want - V.ts) * (1 - Math.exp(-dt * 2.6)); if (Math.abs(want - V.ts) < 0.0005) V.ts = want; }
    const ts = trunkS(), W = woodOf(), Fk = V.F.toFixed(3);
    stalk.build(ts, W, `${ts.toFixed(4)}|${Fk}`);
    const rg = smooth(clamp(V.F / 5, 0, 1)); roots.forEach(r => r.build(rg, W, `${rg.toFixed(3)}|${Fk}`));
    const sig = `${Fk}|${PATH === TRUNK ? '' : PATH.tree.id}|${BR.map(P => P.s.toFixed(3)).join(',')}`, all = sig !== builtTree; builtTree = sig;
    let pi = 0, bi = 0, pd = false, bd = false;
    BR.forEach(P => {
      const x = TS.br[P.tree.id], view = P === PATH;
      if (view) P.s = V.s; else { const want = x ? x.r : 0; P.s += (want - P.s) * (1 - Math.exp(-dt * 2)); if (Math.abs(want - P.s) < 0.0005) P.s = want; }
      P.tube.build(P.s, Math.max(0.55, W), `${P.s.toFixed(4)}|${Fk}`);
      // Clusters gather in a bushy clump round the outer part of the branch as it reaches out, one per lesson passed
      // (the branch in view has its big leaves instead)
      const n = x ? Math.min(PERB, x.n) : 0;
      for (let i = 0; i < PERB; i++, pi++) {
        const u = n ? clamp(0.2 + 0.8 * Math.sqrt((i + 1) / n) - 0.05 * rnd(P.b * 31 + i), 0.32, 1) : 1, on = i < n && !view && x.pass[i] && u <= P.s + 0.01;
        if (!on) { if (P_T[pi] !== 0) { P_T[pi] = 0; m4.makeScale(0, 0, 0); puffs.setMatrixAt(pi, m4); pd = true; } continue; }
        if (P_T[pi] >= 0.6 && !all) continue;
        if (P_T[pi] === 0 && !busy && running && mode === 'tree') burst(plant.localToWorld(P.sample(u).p.clone()), 5, 'leaf');
        P_T[pi] = Math.min(9, P_T[pi] + dt); pd = true;
        P.sample(u, tipQ); tB.crossVectors(tipQ.t, UP).normalize(); tC.crossVectors(tB, tipQ.t).normalize();
        const ang = i * 2.39996 + P.b, w = 0.55 + 0.6 * Math.sin(Math.PI * (u - 0.4) / 0.62), rr = (0.35 + 0.45 * rnd(P.b * 7 + i * 5)) * w, sz = (0.55 + 0.3 * rnd(P.b + i * 3)) * (0.75 + 0.35 * w) * Math.max(0.001, outBack(clamp(P_T[pi] / 0.5, 0, 1)));
        tA.copy(tipQ.p).addScaledVector(tB, Math.cos(ang) * rr).addScaledVector(tC, Math.sin(ang) * rr * 0.8 + 0.2);
        q4.setFromEuler(e4.set(rnd(i) * 3, rnd(i + 9) * 3, 0)); s4.set(sz, sz * 0.84, sz); m4.compose(tA, q4, s4); puffs.setMatrixAt(pi, m4); puffs.setColorAt(pi, LEAFC[(i + P.b) % 4]);
      }
      // A finished subject blossoms in its colour along the outer branch and hangs its badge at the tip
      const bloomed = x && x.all && (!view || bloomOn); P.bloomT = bloomed ? P.bloomT + dt : 0;
      const hue = col(P.tree.hue).lerp(col(0xffffff), 0.18), animB = bloomed && P.bloomT < 2;
      for (let j = 0; j < 7; j++, bi++) {
        if (!animB && !all) continue; bd = true;
        const sc = bloomed ? Math.max(0.001, outBack(clamp((P.bloomT - j * 0.08) / 0.45, 0, 1))) * (view ? 0.75 : 1.5) : 0, u = 0.58 + j * 0.06;
        P.sample(u, tipQ); tB.crossVectors(tipQ.t, UP).normalize(); const a = j * 2.2 + P.b; tC.copy(tB).multiplyScalar(Math.cos(a)).addScaledVector(UP, 0.7 + 0.3 * Math.abs(Math.sin(a))).normalize();
        tA.copy(tipQ.p).addScaledVector(tC, (view ? 0.2 : 1.55) + P.radius(u, 1)); q4.setFromUnitVectors(UP, tC); s4.setScalar(sc); m4.compose(tA, q4, s4); blossoms.setMatrixAt(bi, m4); blossoms.setColorAt(bi, hue);
      }
      P.badge.visible = !!bloomed && P.bloomT > 0.4;
      if (P.badge.visible) { const s = Math.max(0.001, outBack(clamp((P.bloomT - 0.4) / 0.5, 0, 1))) * (view ? 0.55 : 1.1); P.sample(1, tipQ); P.badge.position.copy(tipQ.p).addScaledVector(P.d, 0.3 * s).add(tB.set(0, -1.1 * s + Math.sin(t * 2 + P.b) * 0.04, 0)); P.badge.scale.set(s, s, 1); }
    });
    // The crown: a ring of leaves and mixed blossoms around the first flower once every subject is done
    const crown = smooth(clamp((V.F - (BR.length - 0.4)) / 0.4, 0, 1));
    if (all || (crown > 0 && crown < 1)) {
      TRUNK.sample(1, flQ); pd = bd = true;
      for (let j = 0; j < 14; j++, pi++) { const a = j / 14 * Math.PI * 2, r = 1.8 + (j % 3) * 0.4, sz = (0.7 + (j % 4) * 0.08) * crown; tA.set(flQ.p.x + Math.cos(a) * r, flQ.p.y - 1.2 + (j % 2) * 0.6, flQ.p.z + Math.sin(a) * r); q4.identity(); s4.set(sz, sz * 0.82, sz); m4.compose(tA, q4, s4); puffs.setMatrixAt(pi, m4); puffs.setColorAt(pi, LEAFC[j % 4]); }
      for (let j = 0; j < 12; j++, bi++) { const a = j / 12 * Math.PI * 2 + 0.26, r = 2.2 + (j % 2) * 0.35; tA.set(flQ.p.x + Math.cos(a) * r, flQ.p.y - 0.4 + (j % 2) * 0.5, flQ.p.z + Math.sin(a) * r); q4.setFromEuler(e4.set(-0.3, a, 0)); s4.setScalar(crown * 1.6); m4.compose(tA, q4, s4); blossoms.setMatrixAt(bi, m4); blossoms.setColorAt(bi, col(BR[j % BR.length].tree.hue).lerp(col(0xffffff), 0.18)); }
    } else { pi += 14; bi += 12; }
    puffs.count = puffInk.count = pi; blossoms.count = blossomInk.count = hearts.count = bi;
    if (pd) { puffs.instanceMatrix.needsUpdate = true; if (puffs.instanceColor) puffs.instanceColor.needsUpdate = true; }
    if (bd) { blossoms.instanceMatrix.needsUpdate = true; if (blossoms.instanceColor) blossoms.instanceColor.needsUpdate = true; }
    // Money Sense's leaves on the stalk while another subject is in view, moving out with the bark as it thickens
    const ms = !isMS() && TS.ms, gs = ms ? `${ts.toFixed(4)}|${Fk}|${ms.k}` : '';
    if (gs !== ghostSig) {
      ghostSig = gs; let g = 0;
      if (ms) ms.pass.forEach((p, i) => {
        if (!p || g >= 40 || ms.at[i] > ts + 0.004) return; const side = leafSide(i), yaw = leafYaw(i, side, 0.35), L = lerp(1.65, 1.3, ms.n > 1 ? i / (ms.n - 1) : 0), at = ms.at[i] - 0.01, push = Math.max(0, TRUNK.radius(at, 1) * 0.92 - 0.2);
        TRUNK.sample(at, tipQ); m4.makeRotationY(yaw).multiply(mB.makeRotationZ(PITCH)).multiply(mB.makeRotationX(side * ROLL)).multiply(mB.makeTranslation(0.45, 0, 0)).multiply(mB.makeScale(L / 1.45, L / 1.45, L / 1.45));
        m4.premultiply(mB.makeTranslation(tipQ.p.x + Math.cos(yaw) * push, tipQ.p.y, tipQ.p.z - Math.sin(yaw) * push)); ghost.setMatrixAt(g++, m4);
      });
      ghost.count = ghostInk.count = g; ghost.instanceMatrix.needsUpdate = true;
    }
  }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016) * (reduced ? 1.6 : 1); last = now; t += dt;
    const ms = isMS();
    // Growth eases toward the answers shown
    V.s += ((bloomOn ? 1 : uOf(shown)) - V.s) * (1 - Math.exp(-dt * (bloomOn ? 1.2 : 2.6)));
    growTree(dt);
    const ts = trunkS();
    if (Math.abs(V.s - (dots.userData.s ?? -1)) > 0.002) { dots.userData.s = V.s; dots.userData.at.forEach((u, i) => { sample(u, dotQ); const k = u > V.s + 0.01 ? K : 0; dotM.makeScale(k, k, k); dotM.setPosition(dotQ.p); dots.setMatrixAt(i, dotM); }); dots.instanceMatrix.needsUpdate = true; }
    const seeded = shown > 0 || bloomOn || !ms || reduced;
    V.shell = lerp(V.shell, ts > 0.001 ? 1 : 0, 1 - Math.exp(-dt * 3));
    seed.scale.setScalar(seeded || ts > 0.001 ? 1 : 1 + Math.sin(t * 3) * 0.05); seed.visible = V.F < 2.5;
    shells.forEach((p, k) => { p.rotation.x = (k ? -1 : 1) * V.shell * 1.05; p.position.z = (k ? -1 : 1) * V.shell * 0.12; p.position.y = -V.shell * 0.1; });
    // Pieces still at zero size are hidden, so they cost nothing to draw
    coty.forEach((c, k) => { const s = outBack(clamp((ts - 0.8 / TRUNK.LEN) / (0.15 / TRUNK.LEN), 0, 1)) * (1 - 0.6 * woodOf()); c.scale.setScalar(Math.max(0.001, s)); c.visible = s > 0.001; c.children[0].rotation.z = 0.5 + Math.sin(t * 1.7 + k) * 0.04; });
    UN.forEach((k, i) => { const on = udone[i] && k.at <= V.s + 0.004; k.t = lerp(k.t, on ? 1 : 0, 1 - Math.exp(-dt * 5)); const s = Math.max(0.001, outBack(clamp(k.t, 0, 1)) * radius(k.at, 1) * 1.15); k.m.scale.set(s, s, s * 0.8); k.m.visible = k.t > 0.002; k.gold = Math.max(0, k.gold - dt * 0.8); k.m.material = crowned[i] || k.gold > 0.05 ? RING_GOLD : RING; });
    LEAVES.forEach((lf, i) => {
      const on = done[i] && lf.at <= V.s + 0.004; lf.t = clamp(lf.t + (on ? dt / 1.4 : -dt * 3), 0, 1);
      if (ms) { lf.off.copy(lf.dir).multiplyScalar(Math.max(0, TRUNK.radius(lf.at, 1) * 0.92 - 0.2)); lf.pv.position.copy(lf.base).add(lf.off); }
      lf.pv.scale.setScalar(Math.max(0.001, outBack(lf.t)) * K); lf.pv.visible = lf.t > 0; const o = smooth(lf.t); lf.pitch.rotation.z = lerp(1.35, PITCH, o) + Math.sin(t * 1.3 + i) * 0.025; lf.roll.rotation.x = lf.side * lerp(1.3, ROLL, o) + Math.sin(t * 2.1 + i) * 0.03;
    });
    // The flower rides the top of the stalk: a bud through Money Sense's last unit, open once it's done, and a
    // little bigger as the tree grows round it
    sample(V.s, tipQ); TRUNK.sample(ts, flQ); flower.position.copy(flQ.p); flower.quaternion.setFromUnitVectors(UP, flQ.t);
    if (bloomOn) V.bloomT += dt;
    V.bud = lerp(V.bud, budTarget(), 1 - Math.exp(-dt * 2)); flower.scale.setScalar(Math.max(0.001, V.bud * (1 + 0.6 * treeG()))); flower.visible = V.bud > 0.0015;
    const open = bloomOn ? smooth(clamp((V.bloomT - 1.6) / 2.2, 0, 1)) : 0, openF = ms ? open : TS.ms && TS.ms.all ? 1 : 0;
    sepals.concat(outer, inner).forEach(p => { const o = smooth(clamp(openF * 1.3 - p.d * 0.3, 0, 1)); p.tilt.rotation.x = lerp(p.open0, p.open1, o) + (openF > 0.99 ? Math.sin(t * 1.5 + p.d * 6) * 0.03 : 0); });
    const bc = ms ? flQ.p : sample(1).p;
    rays.position.copy(bc); rays.scale.set(8 * K, 8 * K, 1); rays.material.opacity = bloomOn ? clamp((V.bloomT - 2.2) / 1.2, 0, 0.7) * (0.8 + Math.sin(t * 2) * 0.15) : 0; rays.material.rotation = t * 0.15; rays.visible = rays.material.opacity > 0;
    butterflies.forEach((b, k) => { if (!b.g.visible) return; const a = t * (0.7 + k * 0.25) + k * 3, r = (1.8 + Math.sin(t * 0.6 + k) * 0.4) * K, c = ms ? flower.getWorldPosition(bfV) : plant.localToWorld(bfV.copy(bc)); b.g.position.set(c.x + Math.cos(a) * r, c.y + (0.4 + Math.sin(t * 2 + k) * 0.5) * K, c.z + Math.sin(a) * r); b.g.scale.setScalar(K); b.g.rotation.y = -a; const f = Math.sin(t * 22 + k) * 0.9; b.wings[0].rotation.z = f; b.wings[1].rotation.z = -f; });
    V.shiver = Math.max(0, V.shiver - dt * 1.8);
    plant.rotation.z = (reduced ? 0 : Math.sin(t * 0.8) * 0.012 / (1 + 2 * treeG())) + Math.sin(t * 38) * V.shiver * 0.02;
    goalStar.material.opacity = bloomOn ? 0 : 0.55 + Math.sin(t * 2.4) * 0.3; goalStar.visible = !bloomOn && !CAM.over;
    tickParticles(dt);
    // The guide perches on the newest leaf beside the stalk or branch, clear of the labels and of what the leaves
    // carry, and hops up to each new leaf. Before the first leaf it stands by the seed (or where the branch starts),
    // and around the open flower it flies.
    right.set(Math.cos(CAM.az), 0, -Math.sin(CAM.az)); fwd.set(Math.sin(CAM.az), 0, Math.cos(CAM.az));
    if (guide) {
      let tl = -1; LEAVES.forEach((lf, i) => { if (lf.t > 0.85) tl = i; });
      const lf = tl >= 0 && !open ? LEAVES[tl] : null, side = lf ? lf.side : 1, g = guide.g;
      if (lf) planG.worldToLocal(lf.roll.localToWorld(gp.set(0.45 + lf.L * 0.1, 0.03, 0)));
      else { gp.copy(tipQ.p).addScaledVector(right, side * lerp(1.15, 2.4, open) * K).addScaledVector(fwd, 0.35 * K); gp.y = ms ? Math.max(0, gp.y - 0.95 - open * 0.7 - (V.s < 0.03 ? 1 : 0)) : gp.y - (0.5 + open * 0.7) * K; }
      g.position.lerp(gp, 1 - Math.exp(-dt * 3)); g.scale.setScalar(0.5 * K * clamp(CAM.dist / (9 * K), 1, 1.15)); guide.hop = Math.max(0, guide.hop - dt * 1.6); guide.shake = Math.max(0, guide.shake - dt * 2);
      const air = g.position.distanceTo(gp) > 0.15 * K || (!lf && (ms ? g.position.y > 0.08 : true)), P2 = guide.P; guide.body.position.y = Math.sin(guide.hop * Math.PI) * 0.6 + (air && !reduced ? Math.sin(t * 2.2) * 0.06 : 0);
      g.rotation.y = CAM.az - side * 0.5 + (guide.hop > 0 ? (1 - guide.hop) * Math.PI * 2 : 0); g.rotation.z = Math.sin(t * 30) * guide.shake * 0.12;
      const wv = air || guide.hop > 0 ? 0.6 + Math.sin(t * 18) * 0.5 : 0.06; P2.wingL.rotation.z = wv; P2.wingR.rotation.z = -wv; P2.head.rotation.z = Math.sin(t * 0.8) * 0.1;
    }
    // What sits on the leaves rides on them as they sway. Prizes still to win wait in their bubbles above where
    // their leaf will grow, and a prize just won unlocks onto its leaf.
    LEAVES.forEach(lf => { if (lf.t > 0.02) { lf.roll.updateWorldMatrix(true, false); planG.worldToLocal(lf.roll.localToWorld(lf.pad.copy(lf.padL))); } else lf.pad.copy(lf.padS).add(lf.off); });
    for (const p of prizeGs) { hover(p.g, LEAVES[p.i], p.i); p.m.rotation.y = t * 0.7 + p.i; faceBubble(p, p.i); if (p.m.userData.tick) p.m.userData.tick(t, dt); }
    for (const it of ITEMS) {
      if (!it) continue; const lf = LEAVES[it.i], g = it.g;
      if (it.state === 'locked') { hover(g, lf, it.i); g.scale.setScalar(K); g.visible = true; it.m.rotation.y = t * 0.7 + it.i; faceBubble(it, it.i); }
      else if (it.state === 'unlocking') unlockStep(it, lf, dt);
      else { const sc = outBack(smooth(clamp((lf.t - 0.7) / 0.3, 0, 1))); g.position.copy(lf.pad); g.scale.setScalar(Math.max(0.001, sc) * K); g.visible = sc > 0; it.m.rotation.y = t * (it.kind === 'xp' ? 1.2 : 0.5) + it.i; if (it.badge) it.badge.position.y = 0.78 + Math.sin(t * 2.2 + it.i) * 0.03; }
      if (it.kind === 'prize' && it.m.userData.tick) it.m.userData.tick(t, dt);
    }
    // Camera: follows the tip up the stalk or along the branch; a drag, swipe or scroll looks around and it drifts
    // back after a while. The whole-tree view looks at the middle of the tree and turns slowly round it.
    CAM.idle += dt; if (CAM.manual != null && CAM.idle > 8 && !drag && crownI < 0) { CAM.manual = null; showFollow(); }
    CAM.y += ((CAM.manual ?? followY()) - CAM.y) * (1 - Math.exp(-dt * 2.2));
    if (CAM.over || ms) lookV.set(0, CAM.y, 0); else PATH.atY(CAM.y, lookV);
    CAM.tgt.lerp(lookV, 1 - Math.exp(-dt * 3));
    const bl = bloomOn && !CAM.over ? smooth(clamp(V.bloomT / 3, 0, 1)) : 0; CAM.dist = lerp(CAM.dist, baseDist() * lerp(1, 1.12, bl), 1 - Math.exp(-dt * 1.5));
    if ((bl > 0 || CAM.over) && !drag && !reduced) CAM.az += dt * (CAM.over ? 0.1 : 0.18);
    else if (!reduced && !drag) { CAM.az = CAM.az0 + (((CAM.az - CAM.az0 + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; CAM.az += (CAM.az0 + Math.sin(t * 0.12) * 0.25 - CAM.az) * dt * 0.2; }
    cam.position.set(CAM.tgt.x + Math.sin(CAM.az) * CAM.dist, CAM.tgt.y + CAM.dist * (CAM.over ? 0.2 : lerp(0.16, 0.3, bl)), CAM.tgt.z + Math.cos(CAM.az) * CAM.dist); cam.lookAt(CAM.tgt);
    sky.position.copy(cam.position); sunSprite.position.set(cam.position.x - 40, cam.position.y + 30, cam.position.z - 90);
    // Clouds drift behind the tree. When the camera steps back or turns right round it (the whole-tree view), they
    // move back and round with it, so they never float in front.
    { const th = CAM.az - 0.35, ca = Math.cos(th), sa = Math.sin(th), far = Math.max(1, CAM.dist / 9);
      clouds.forEach(c => { const u = c.userData, b = u.b; b.x += u.v * dt; if (b.x > 26) b.x = -26; const x = b.x * far, z = b.z * far; c.position.set(CAM.tgt.x * (far - 1) / far + x * ca + z * sa, b.y * far, CAM.tgt.z * (far - 1) / far - x * sa + z * ca); c.scale.setScalar(u.s * far); }); }
    pace(now); G3.inkFor(R); R.getDrawingBufferSize(INKI.uniforms.uRes.value); INKI.uniforms.uPx.value = 1.7 * R.getPixelRatio(); R.render(scene, cam);
    if (mode === 'tree') placeTags();
  }

  // Builds the plant for a kid's tree, or keeps the one already built. Returns true when it was built fresh.
  function ensure(kid, tree) {
    mount(); setGuide(prog(kid).guide || 'kea'); kidName = kid.name;
    const k = `${kid.id}|${kid.name}|${tree.id}|${bandOf(kid)}|${(packFor(tree.id, bandOf(kid)) || { units: [] }).units.map(u => u.lessons.map(l => l.checks.length).join('.')).join(',')}`;
    if (k === key) return false; key = k; treeId = tree.id; plan(kid, tree); return true;
  }
  return {
    ok: true,
    // The full-screen plant for a tree. `celebrateId` is a lesson just passed for the first time.
    show(host, kid, tree, celebrateId) {
      mount(); Prize.tick(kid); mode = 'tree'; crownI = -1; CAM.over = false; el.classList.remove('quiz'); host.appendChild(el);
      const fresh = ensure(kid, tree), tok = ++celTok; busy = false; resize(); this.start();
      if (celebrateId && LS.some(x => x.l.id === celebrateId)) { celebrate(kid, celebrateId, fresh, tok); return; }
      refresh(kid); shown = passedA;
      // A tree shown fresh starts from the whole-tree view and comes in to the lessons, so kids see their whole tree first
      if (fresh) { snap(); if (!reduced) { CAM.over = true; CAM.dist = baseDist(); CAM.y = followY(); CAM.tgt.set(0, CAM.y, 0); CAM.over = false; } }
      pickDefault(kid); showFollow();
    },
    // The plant on the lesson stage through a lesson; `right` is how many quiz questions are already right this time.
    // Only the quiz's answers (`grow`) grow it.
    quiz(host, kid, l, right, grow = true) {
      const tree = TREE[l.tree]; if (!tree) return false;
      mount(); mode = 'quiz'; CAM.over = false; el.classList.add('quiz'); if (el.parentNode !== host) host.insertBefore(el, host.querySelector('.gw-say'));
      const fresh = ensure(kid, tree), x = LS.find(y => y.l.id === l.id); ++celTok; busy = false; crownI = -1; refresh(kid); quizFresh = !passed(kid, l.id) && !!x; quizGrow = grow;
      quizMax = quizFresh ? passedA + x.to - x.from : passedA; shown = Math.min(quizMax, passedA + (quizFresh ? right : 0));
      if (fresh) snap(); CAM.manual = null; resize(); this.start(); return true;
    },
    // A unit's crown quiz on the plant: the camera holds on the unit's ring, which flashes gold with every right answer.
    crown(host, kid, tree, unit) {
      if (!tree || !unit) return false;
      mount(); mode = 'quiz'; CAM.over = false; el.classList.add('quiz'); if (el.parentNode !== host) host.insertBefore(el, host.querySelector('.gw-say'));
      const fresh = ensure(kid, tree); ++celTok; busy = false; quizFresh = false; refresh(kid); shown = quizMax = passedA; if (fresh) snap();
      crownI = US.findIndex(U => U.unit.id === unit.id); CAM.manual = crownI >= 0 ? sample(UN[crownI].at).p.y : null; CAM.idle = 0;
      resize(); this.start(); return true;
    },
    // The plant behind a review, a real story or a results screen: it follows the subject's growing tip, sparkling at
    // a right answer and shivering at a wrong one. On the results of a lesson's first pass (`newLeaf`), it stays as the
    // quiz left it, and the lesson's leaf waits to unfurl when the kid goes back to the plant.
    look(host, kid, tree, newLeaf) {
      if (!tree) return false;
      mount(); mode = 'quiz'; CAM.over = false; el.classList.add('quiz'); if (el.parentNode !== host) host.insertBefore(el, host.querySelector('.gw-say'));
      const fresh = ensure(kid, tree), x = newLeaf && LS.find(y => y.l.id === newLeaf); ++celTok; busy = false; crownI = -1; quizFresh = false; refresh(kid, x ? newLeaf : undefined);
      shown = quizMax = x && !fresh ? clamp(shown, passedA - (x.to - x.from), passedA) : passedA;
      if (fresh) snap(); CAM.manual = null; resize(); this.start(); return true;
    },
    answer(ok) {
      if (mode !== 'quiz' || !running) return;
      if (crownI >= 0) { if (ok) { const k = UN[crownI]; k.gold = 1; burst(plant.localToWorld(sample(k.at).p.clone()), 12, 'star'); Sound.step(3); if (guide) guide.hop = 1; } else { V.shiver = 1; if (guide) guide.shake = 1; } return; }
      if (ok) { if (quizFresh && quizGrow) shown = Math.min(quizMax, shown + 1); pulse(shown); if (guide) guide.hop = 1; } else { V.shiver = 1; if (guide) guide.shake = 1; }
      CAM.manual = null;
    },
    select: i => select('l', i),
    unit: i => select('u', i),
    bloomAgain() { if (!bloomOn || busy) return; bloom(); },
    overview: on => overview(on),
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); ++celTok; busy = false; if (el && mode === 'quiz') el.remove(); },
  };
})();

const PLANT_CSS = `
.gw[data-view=tree]{grid-template-rows:0 minmax(0,1fr)}
@media (min-width:900px) and (min-aspect-ratio:5/4){ .gw[data-view=tree]{grid-template-rows:minmax(0,1fr);grid-template-columns:0 minmax(0,1fr)} }
.gw[data-view=tree] .gw-ui{overflow:hidden;padding-bottom:0}
.gw[data-view=tree] .gw-top{position:absolute;left:0;right:0;top:0;background:linear-gradient(color-mix(in srgb,var(--gh) 45%,#0B1A4A),transparent)}
.pl{position:absolute;inset:0;overflow:hidden;background:#8FD0FF}
.gw-stage>.pl{z-index:0}
.gw-stage>.gw-say{z-index:1}
.pl-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab}
.pl-cv.drag{cursor:grabbing}
.pl-tags{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.pl.quiz .pl-tags,.pl.quiz .pl-card,.pl.quiz .pl-btns{display:none}
.pl-tag,.pl-utag,.pl-goal{position:absolute;left:0;top:0;visibility:hidden;will-change:transform;white-space:nowrap}
.pl-tag{pointer-events:auto;display:inline-flex;align-items:center;gap:7px;padding:5px 12px 5px 5px;border:0;border-radius:999px;background:#fff;color:#16203D;font:800 13px/1.15 var(--f-round);box-shadow:0 6px 16px -8px rgba(8,20,60,.6);cursor:pointer}
.pl-tag .n{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:12px;background:#E6EDF8;font:900 12px var(--f-round)}
.pl-tag.done{background:#EAF8EE}
.pl-tag.done .n{background:#FFF3C4}
.pl-tag.cur{padding:6px 14px 6px 6px;font-size:15px;box-shadow:0 0 0 3px #FFC93C,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag.cur .n{background:#FFC93C;color:#5A3A00;height:30px;min-width:30px;border-radius:15px}
.pl-tag.cur small{display:block;font:900 10px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#B07800}
.pl-tag.locked{background:rgba(255,255,255,.7);color:rgba(22,32,61,.7);box-shadow:none}
.pl-tag.sel{box-shadow:0 0 0 3px #fff,0 0 0 6px #2FB35A,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag.cur.sel{box-shadow:0 0 0 3px #FFC93C,0 0 0 6px #fff,0 10px 22px -8px rgba(8,20,60,.6)}
.pl-tag .pz{margin-left:2px;font-size:15px}
.pl-utag{pointer-events:auto;border:0;padding:5px 11px;border-radius:999px;background:#1F8A43;color:#fff;font:900 13px/1.2 var(--f-round);box-shadow:0 8px 18px -10px rgba(0,0,0,.6);cursor:pointer}
.pl-utag.crown{background:#B07800}
.pl-utag.sel{box-shadow:0 0 0 3px #fff,0 8px 18px -10px rgba(0,0,0,.6)}
.pl-goal{padding:6px 12px;border-radius:999px;background:#FF6FA8;color:#fff;font:900 12px/1 var(--f-round);letter-spacing:.06em;text-transform:uppercase;pointer-events:none;box-shadow:0 6px 14px -8px rgba(0,0,0,.6)}
.pl-btns{position:absolute;z-index:2;display:flex;flex-wrap:wrap;gap:8px}
.pl.wide .pl-btns{left:var(--gut,16px);bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}
.pl.phone .pl-btns{left:var(--gut,16px);right:var(--gut-r,16px);top:var(--pl-top,84px)}
.pl-follow,.pl-over{border:0;border-radius:14px;padding:10px 14px;background:rgba(255,255,255,.94);color:#16203D;font:800 14px/1 var(--f-round);box-shadow:inset 0 -3px 0 rgba(22,32,61,.1),0 8px 18px -10px rgba(8,20,60,.6);cursor:pointer}
.pl-follow[hidden],.pl-over[hidden]{display:none}
.pl.over .pl-over{background:#1F8A43;color:#fff}
.plc-subj{grid-column:1/-1;display:grid;gap:6px;margin-top:10px}
.plc-s{display:flex;align-items:center;gap:10px;width:100%;border:0;border-radius:16px;padding:8px 10px;background:#F3F6FB;color:#0D1530;text-align:left;font:inherit;cursor:pointer}
.plc-s.on{box-shadow:inset 0 0 0 2px var(--h)}
.plc-s .ic{flex:none;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:color-mix(in srgb,var(--h) 22%,#fff)}
.plc-s .nm{flex:1;min-width:0;display:grid;gap:2px}
.plc-s .nm b{font:900 15px/1.2 var(--f-round)}
.plc-s .nm small{font:700 12px/1.2 var(--f-round);color:#5A6380}
.plc-s .nm i{display:block;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--h) var(--p),#DDE4F0 var(--p))}
.plc-s .st{flex:none;font:900 13px var(--f-round);color:#5A6380}
.pl-card{position:absolute;z-index:2;background:#fff;color:#0D1530;border-radius:26px;padding:16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 14px;align-content:start;overflow:auto;box-shadow:0 24px 50px -20px rgba(8,20,60,.6)}
.pl.wide .pl-card{right:var(--gut-r,16px);top:var(--pl-top,84px);width:min(380px,42%);max-height:calc(100% - var(--pl-top,84px) - 16px)}
.pl.phone .pl-card{left:var(--gut,16px);right:var(--gut-r,16px);bottom:calc(env(safe-area-inset-bottom,0px) + 12px);max-width:560px;margin:0 auto;max-height:52%}
.pl-card.in{animation:plIn .38s cubic-bezier(.2,.9,.2,1)}
@keyframes plIn{from{translate:0 18px;opacity:0}to{translate:0 0;opacity:1}}
.plc-ic{grid-row:span 2;width:60px;height:60px;border-radius:19px;display:grid;place-items:center;font-size:32px;background:color-mix(in srgb,var(--gh) 18%,#fff)}
.plc-eb{font:900 12px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#5A6380;align-self:end}
.plc-t{font:900 21px/1.15 var(--f-round)}
.plc-p{grid-column:1/-1;font:700 15px/1.45 var(--f-round);color:#5A6380;margin-top:8px}
.plc-chips{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.plc-chips span{padding:5px 10px;border-radius:999px;background:#EEF3FA;font:800 13px var(--f-round)}
.plc-how{grid-column:1/-1;display:grid;gap:8px;margin:10px 0 0;padding:0;list-style:none}
.plc-goal{grid-column:1/-1;margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#FFF3D1;color:#6B4300;font:800 15px/1.35 var(--f-round)}
.plc-how li{display:flex;gap:10px;align-items:center;font:800 15px/1.35 var(--f-round)}
.plc-how span{flex:none;width:34px;height:34px;display:grid;place-items:center;border-radius:12px;background:#EAF8EE;font-size:18px}
.plc-prize{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin-top:10px;padding:8px 12px;border-radius:16px;background:#FFF6D6;box-shadow:inset 0 0 0 2px #FFC93C}
.plc-prize.big{background:#FFE8D6;box-shadow:inset 0 0 0 2px #FF9F43}
.plc-prize>span:first-child{font-size:26px}
.plc-prize small{display:block;font:900 10px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#8A5A00}
.plc-prize b{font:900 15px/1.25 var(--f-round)}
.plc-act{grid-column:1/-1;display:flex;margin-top:12px}
.plc-act .g-go{flex:1;margin:0}
@media (max-width:560px){ .pl.phone .plc-p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} .plc-t{font-size:19px} .plc-ic{width:52px;height:52px;font-size:28px} }
@media (prefers-reduced-motion:reduce){ .pl-card.in{animation:none} }
`;
{ const st = document.createElement('style'); st.id = 'growth-plant-css'; st.textContent = PLANT_CSS; document.head.appendChild(st); }


/* ---------- How to play: a hand demonstrates each kind of game before the kid's first go ----------
   The demo plays the real game on a made-up example (fruit and veggies, a dollar coin, a lemonade stall), so it
   teaches the moves without giving away the lesson's answers. It runs the first time a kid meets each kind of
   game, and the "?" on any question replays it. It plays at an easy pace and loops, with a short rest between
   goes, until the kid taps "My turn!". */
const HowTo = (() => {
  const STOP = Symbol('stop');
  // PACE stretches every move and pause so a 7-year-old can follow; REST is the gap before the demo plays again.
  const PACE = 1.35, REST = 1800;
  let tok = 0, hand = null, mess = [];
  const SAMPLE = {
    mcq: { type: 'mcq', q: 'Which one is money?', keep: true, opts: [{ t: '🪙 A dollar coin', ok: true }, { t: '🍌 A banana', ok: false }, { t: '🧦 A sock', ok: false }] },
    tf: { type: 'tf', q: 'Fish live in water.', a: true, why: '' },
    gap: { type: 'gap', q: '2 + 3 = _', a: '5', opts: null },
    gapOpts: { type: 'gap', q: 'A dog has _ legs', a: '4', opts: ['4', '3', '6'] },
    sort: { type: 'sort', q: 'Sort the fruit and the veggies', bins: ['Fruit', 'Veggie'], items: [{ t: 'Apple', b: 'Fruit' }, { t: 'Carrot', b: 'Veggie' }, { t: 'Banana', b: 'Fruit' }] },
    order: { type: 'order', q: 'Put the morning in order', steps: ['Wake up', 'Eat breakfast', 'Go to school'] },
    build: { type: 'build', q: 'Build a sandwich from the bottom up', steps: ['Bread', 'Cheese', 'Bread'] },
    match: { type: 'match', q: 'Match each animal to its home', pairs: [['Bird', 'Nest'], ['Bee', 'Hive'], ['Fish', 'Sea']] },
    slider: { type: 'slider', q: 'How many legs does a spider have?', min: 0, max: 12, a: 8, unit: '', tol: 1, step: 1 },
    price: { type: 'price', q: 'Which bag of apples is better value?', products: [{ name: 'Small bag', cost: 2, qty: 1, unit: 'kg' }, { name: 'Big bag', cost: 3, qty: 2, unit: 'kg' }] },
    scam: { type: 'scam', q: 'Real or scam?', msgs: [{ t: 'You won a free phone! Send us your password to claim it.', scam: true }], why: '' },
    path: { type: 'path', q: 'You find $5 on the classroom floor.', choices: [{ t: 'Hand it to the teacher', grade: 'good', out: 'The owner gets it back.' }, { t: 'Keep it', grade: 'bad', out: 'Someone is missing their money.' }] },
    debate: { type: 'debate', q: 'Should kids help with chores?', args: [{ t: 'Yes, because everyone in a home shares the work', ok: true }, { t: 'No, because chores are boring', ok: false }], other: '' },
    tap: { type: 'tap', q: 'Find the fruit', items: [{ e: '🍎', hit: true, why: '' }, { e: '🚗', hit: false, why: '' }, { e: '🍌', hit: true, why: '' }, { e: '⚽', hit: false, why: '' }] },
    budget: { type: 'budget', q: 'Plan your $10', income: 10, cats: [{ n: 'Snacks', min: 0 }, { n: 'Savings', min: 0 }], surprise: null },
    market: { type: 'market', q: 'Watch $100 in a fund over 6 years', years: 6 },
    compound: { type: 'compound', q: 'Watch a $10 snowball grow', start: 10, rate: 10, years: 3 },
    shop: { type: 'shop', q: 'Run a lemonade stall', item: 'Lemonade', cost: 50, goal: 100 },
    timing: { type: 'timing', q: 'Tap when the marker is in the green', label: 'Tap!', zone: 'Now' },
    diff: { type: 'diff', q: 'What changed?', a: ['Bus $10', 'Lunch $10'], b: ['Bus $10', 'Lunch $14'] },
    chat: { type: 'chat', q: 'Your friend asks to borrow your bike', turns: [{ them: 'Can I borrow your bike?' }, { me: [{ t: 'Sure. Can you bring it back by 5?', ok: true }, { t: 'No way. Go away.', ok: false }] }] },
    mystery: { type: 'mystery', q: 'Who or what is it?', clues: ['It’s round', 'It’s shiny', 'You can spend it'], opts: [{ t: 'A coin', ok: true }, { t: 'A cloud', ok: false }] },
    note: { type: 'note', q: 'Read this, then tap OK.' },
  };
  // Which demo a game uses, and the key that remembers a kid has seen it.
  const KIND = { gen: 'gap', island: 'mcq', route: 'match' };
  const kindOf = it => (it.type === 'gap' && it.opts ? 'gapOpts' : KIND[it.type] || it.type);

  const chk = my => { if (my !== tok) throw STOP; };
  const anim = (my, ms, fn) => new Promise((res, rej) => { const t0 = performance.now(), d = ms * (reduced ? 0.4 : PACE); const step = now => { if (my !== tok) return rej(STOP); const k = Math.min(1, (now - t0) / d); fn(k * k * (3 - 2 * k)); k < 1 ? requestAnimationFrame(step) : res(); }; requestAnimationFrame(step); });
  const pause = (my, ms) => new Promise((res, rej) => setTimeout(() => (my === tok ? res() : rej(STOP)), ms * (reduced ? 0.4 : PACE)));
  function mountHand() {
    if (hand) return hand;
    const el = document.createElement('div'); el.className = 'gw-hand'; el.hidden = true;
    el.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 6c3 0 5.5 2.3 5.5 5.3v17.3l1.6-.8c3-1.2 5.5 0 6.4 2.3l.4.9c2.4-1 5.3-.5 6.3 1.9l.4.8c2.6-.9 5.4.4 6 3.1V48c0 8.3-6.8 14-15 14h-3.5c-5.6 0-9.6-2.6-12.6-7.4L7.8 43c-1.8-2.8-1.2-5.4 1-6.6 2.2-1.2 4.5-.3 6.2 2l3.4 4.4V11.3C18.4 8.3 17 6 20 6z" fill="#fff" stroke="#1A2340" stroke-width="3.2" stroke-linejoin="round"/></svg>';
    document.body.appendChild(el); hand = { el, x: 0, y: 0 }; return hand;
  }
  const H = {
    set(x, y) { hand.x = x; hand.y = y; hand.el.style.transform = `translate(${x - 18}px,${y - 4}px)`; },
    pt(el, fx = 0.5, fy = 0.55) { el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect(); return { x: r.left + r.width * fx, y: r.top + r.height * fy }; },
    async to(my, p, ms = 600) { const x0 = hand.x, y0 = hand.y; await anim(my, ms, k => H.set(x0 + (p.x - x0) * k, y0 + (p.y - y0) * k)); },
    async press(my) { hand.el.classList.add('press'); const r = document.createElement('i'); r.className = 'gw-rip'; r.style.left = hand.x + 'px'; r.style.top = hand.y + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 520); await pause(my, 160); },
    async release(my) { hand.el.classList.remove('press'); await pause(my, 120); },
  };
  // Moves to an element, taps it, and clicks it for real so the game reacts just as it would for a finger.
  async function tapOn(my, el) { if (!el) return; await H.to(my, H.pt(el)); await H.press(my); el.click(); await H.release(my); }
  const byText = (host, sel, t) => [...host.querySelectorAll(sel)].find(x => x.textContent.replace(/\s+/g, ' ').trim().includes(t));
  const until = async (my, f, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { chk(my); const v = f(); if (v) return v; await pause(my, 100); } return null; };

  const SCRIPT = {
    mcq: async (my, h, cap) => { cap('Read the question, then tap the answer you think is right.'); await tapOn(my, h.querySelector('.g-card')); await pause(my, 1100); },
    tf: async (my, h, cap) => {
      cap('Swipe the card right for true, or left for false. You can tap a button instead.');
      const card = h.querySelector('.g-swcard'), p = H.pt(card); await H.to(my, p); await H.press(my);
      await anim(my, 700, k => { H.set(p.x + 130 * k, p.y); card.style.transform = `translateX(${130 * k}px) rotate(${130 * k / 14}deg)`; card.dataset.lean = k > 0.3 ? 'r' : ''; });
      h.querySelector('[data-v="1"]').click(); await H.release(my); await pause(my, 1100);
    },
    gap: async (my, h, cap) => { cap('Tap the number pad to type your answer, then tap Check.'); await tapOn(my, h.querySelector('[data-k="5"]')); await pause(my, 300); await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 1100); },
    gapOpts: async (my, h, cap) => { cap('Tap the word or number that fills the gap.'); await tapOn(my, h.querySelector('.g-chip[data-v="4"]')); await pause(my, 1100); },
    sort: async (my, h, cap) => {
      cap('Tap a card, then tap the box it belongs in.');
      for (const [t, b] of [['Apple', 'Fruit'], ['Carrot', 'Veggie'], ['Banana', 'Fruit']]) { await tapOn(my, byText(h, '[data-item]', t)); await pause(my, 200); await tapOn(my, h.querySelector(`[data-bin="${b}"]`)); await pause(my, 250); if (t === 'Apple') cap('Keep going until every card has a box. Tap a card in a box to take it back out.'); }
      await pause(my, 1200);
    },
    order: async (my, h, cap) => { cap('Tap the steps in the order they happen. Tap a numbered step to undo it.'); for (const t of SAMPLE.order.steps) { await tapOn(my, byText(h, '[data-pick]', t)); await pause(my, 250); } await pause(my, 1200); },
    build: async (my, h, cap) => { cap('Tap the pieces in order, from the bottom up.'); for (const t of ['Bread', 'Cheese', 'Bread']) { await tapOn(my, byText(h, '[data-pick]', t)); await pause(my, 250); } await pause(my, 1200); },
    match: async (my, h, cap) => { cap('Tap something on the left, then its partner on the right.'); for (let i = 0; i < 3; i++) { await tapOn(my, h.querySelector(`[data-l="${i}"]`)); await pause(my, 150); await tapOn(my, byText(h, '[data-r]', SAMPLE.match.pairs[i][1])); await pause(my, 250); if (!i) cap('They change colour when they’re joined. Do every pair.'); } await pause(my, 1200); },
    slider: async (my, h, cap) => {
      cap('Drag the dot along the line to your answer.');
      const r = h.querySelector('input[type=range]'), at = v => { const b = r.getBoundingClientRect(); return { x: b.left + 14 + (b.width - 28) * (v - 0) / 12, y: b.top + b.height / 2 }; };
      await H.to(my, at(+r.value)); await H.press(my); const v0 = +r.value;
      await anim(my, 900, k => { const v = Math.round(v0 + (8 - v0) * k); if (+r.value !== v) { r.value = v; r.dispatchEvent(new Event('input')); } H.set(at(v0 + (8 - v0) * k).x, at(0).y); });
      await H.release(my); cap('Then tap Lock it in.'); await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 1200);
    },
    price: async (my, h, cap) => { cap('Look at the price for each kilo, then tap the better value.'); await pause(my, 600); await tapOn(my, byText(h, '.g-prod', 'Big bag')); await pause(my, 1200); },
    scam: async (my, h, cap) => { cap('Read the message. Tap Scam! if it’s a trick, or Looks real if it’s safe.'); await pause(my, 700); await tapOn(my, h.querySelector('[data-v="1"]')); await pause(my, 1400); },
    path: async (my, h, cap) => { cap('Read what happens, then choose what you would do.'); await pause(my, 600); await tapOn(my, byText(h, '.g-card', 'teacher')); await pause(my, 1400); },
    debate: async (my, h, cap) => { cap('Tap the argument with the stronger reason.'); await pause(my, 600); await tapOn(my, byText(h, '.g-card', 'everyone')); await pause(my, 1300); },
    tap: async (my, h, cap) => { cap('Tap everything that fits, then tap Done.'); for (const e of ['🍎', '🍌']) { await tapOn(my, h.querySelector(`.g-thing[aria-label="${e}"]`)); await pause(my, 200); } await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 1300); },
    budget: async (my, h, cap) => {
      cap('Tap + to give a job more money, and − to take some back.');
      for (const [row, n] of [[0, 3], [1, 4]]) for (let i = 0; i < n; i++) { const b = h.querySelectorAll('.g-brow')[row].querySelector('[data-d="1"]'); await tapOn(my, b); await pause(my, 120); }
      cap('When you’re happy, lock in your budget.'); await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 1300);
    },
    market: async (my, h, cap) => {
      cap('Start the time-lapse and watch the price move.'); await tapOn(my, h.querySelector('[data-go]'));
      const hold = await until(my, () => h.querySelector('[data-h]'), 8000); cap('Prices dropped! Decide: hold on, or sell?'); await pause(my, 700); await tapOn(my, hold);
      await until(my, () => h.querySelector('.g-outcome'), 8000); await pause(my, 1200);
    },
    compound: async (my, h, cap) => {
      cap('Drag the years along and watch the snowball grow.');
      const r = h.querySelector('input[type=range]'), b = () => r.getBoundingClientRect(), max = +r.max; await H.to(my, { x: b().left + 14, y: b().top + b().height / 2 }); await H.press(my);
      await anim(my, 1200, k => { const v = Math.round(max * k); if (+r.value !== v) { r.value = v; r.dispatchEvent(new Event('input')); } H.set(b().left + 14 + (b().width - 28) * k, b().top + b().height / 2); });
      await H.release(my); cap('Then answer the question underneath.'); await tapOn(my, byText(h, '.g-card', '$13.31')); await pause(my, 1200);
    },
    shop: async (my, h, cap) => { cap('Set your price with + and −. Too cheap earns little; too dear and nobody buys.'); await tapOn(my, h.querySelector('[data-d="10"]')); await pause(my, 300); cap('Then open the stall and see who buys.'); await tapOn(my, h.querySelector('[data-open]')); await pause(my, 2200); },
    timing: async (my, h, cap) => {
      cap('Watch the marker. Tap when it’s in the green zone.'); const btn = h.querySelector('[data-tap]'), mark = h.querySelector('.g-mark'); await H.to(my, H.pt(btn));
      await until(my, () => { const p = parseFloat(mark.style.left) || 0; return p > 64 && p < 78; }, 6000); await H.press(my); btn.click(); await H.release(my); await pause(my, 1200);
    },
    diff: async (my, h, cap) => { cap('Tap each line that changed, then tap Done.'); await tapOn(my, h.querySelector('.g-doc button[data-i="1"]')); await pause(my, 300); await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 1300); },
    chat: async (my, h, cap) => { cap('Read the message, then tap the best reply.'); const b = await until(my, () => byText(h, '.g-replies button', 'Sure'), 5000); await pause(my, 500); await tapOn(my, b); await pause(my, 1400); },
    mystery: async (my, h, cap) => { cap('Read the clue. Stuck? Tap Show another clue.'); await pause(my, 700); await tapOn(my, h.querySelector('[data-more]')); await pause(my, 700); cap('When you know, tap your answer. Fewer clues earns more.'); await tapOn(my, byText(h, '.g-chip', 'A coin')); await pause(my, 1300); },
    note: async (my, h, cap) => { cap('Read it, then tap OK.'); await tapOn(my, h.querySelector('[data-ok]')); await pause(my, 600); },
  };

  // Runs the demo for `item` inside `card`, hiding the real game until the kid taps "My turn!". Each go starts from a
  // fresh copy of the example; between goes the hand steps aside and the caption says it's about to play again.
  async function run(card, item, kid, opts = {}) {
    const kind = kindOf(item), sample = SAMPLE[kind], script = SCRIPT[kind]; if (!sample || !script) return;
    stop(); const my = ++tok; mountHand();
    const host = card.querySelector('.gw-host'), fb = card.querySelector('.gw-fb'); if (host) host.hidden = true; if (fb) fb.hidden = true;
    let box = card.querySelector('.gw-how'); if (!box) { box = document.createElement('div'); box.className = 'gw-how'; card.prepend(box); }
    box.innerHTML = `<div class="gwh-top"><span class="gwh-k">How to play</span><span class="gwh-loop" hidden>Playing again…</span></div><p class="gwh-cap"></p><div class="gwh-demo"><div class="gwh-host"></div></div><button class="g-go gwh-mine" data-g="howDone">My turn!</button>`;
    const cap = t => { if (my === tok) box.querySelector('.gwh-cap').textContent = t; };
    const demo = box.querySelector('.gwh-host'), loop = box.querySelector('.gwh-loop');
    const fresh = () => { clean(); demo.innerHTML = ''; renderItem(sample, demo, { kid, mode: 'demo', cleanup: mess }, () => {}); };
    const park = () => { const r = card.getBoundingClientRect(); H.set(r.left + r.width * 0.75, Math.min(innerHeight + 30, r.bottom + 40)); };
    if (!opts.again) save(kid, { how: { [kind]: 1 } });
    C.track('growth.howto', { kind, again: !!opts.again }, kid.id);
    try {
      for (let go = 0; ; go++) {
        if (!card.isConnected) throw STOP;
        fresh(); loop.hidden = true;
        await pause(my, go ? 500 : 400); park(); hand.el.hidden = false;
        await script(my, demo, cap); chk(my);
        hand.el.hidden = true; loop.hidden = false;
        cap('Here it comes again. Tap My turn! whenever you’re ready.');
        await pause(my, REST);
      }
    } catch (e) { if (e !== STOP) console.warn('how to play', kind, e); }
    if (my === tok) stop();
  }
  const clean = () => mess.splice(0).forEach(f => { try { f(); } catch (e) {} });
  function finish(card) { stop(); if (!card) return; const box = card.querySelector('.gw-how'); if (box) box.remove(); const host = card.querySelector('.gw-host'), fb = card.querySelector('.gw-fb'); if (host) host.hidden = false; if (fb) fb.hidden = false; }
  function stop() { tok++; clean(); if (hand) { hand.el.hidden = true; hand.el.classList.remove('press'); } }
  const seen = (kid, item) => !!((prog(kid).how || {})[kindOf(item)]);
  return { run, finish, stop, seen, has: item => !!SAMPLE[kindOf(item)] };
})();

const HOW_CSS = `
.gw-how{display:grid;gap:10px;margin-bottom:12px;padding:12px;border-radius:20px;background:color-mix(in srgb,#FFC93C 16%,#fff);border:2px dashed color-mix(in srgb,#FFC93C 80%,transparent);color:#0D1530}
.gwh-top{display:flex;align-items:center;gap:10px}
.gwh-k{font:900 12px var(--f-round);letter-spacing:.1em;text-transform:uppercase;color:#7A4E00}
.gwh-skip{margin-left:auto;min-height:36px;padding:0 14px;border-radius:999px;background:#fff;color:#0D1530;font:800 14px var(--f-round);box-shadow:inset 0 -3px 0 rgba(13,21,48,.08)}
.gwh-cap{font:800 16px/1.35 var(--f-round);margin:0}
.gwh-demo{position:relative;padding:10px;border-radius:16px;background:#fff;pointer-events:none}
.gwh-demo::after{content:"Example";position:absolute;top:8px;right:8px;padding:2px 8px;border-radius:999px;background:#FFC93C;color:#5A3A00;font:900 10px var(--f-round);letter-spacing:.08em;text-transform:uppercase}
.gwh-loop{margin-left:auto;font:800 13px var(--f-round);color:#7A4E00;animation:gwhBlink 1.2s ease-in-out infinite}
@keyframes gwhBlink{50%{opacity:.45}}
.gwh-mine{margin:0;width:100%}
.gw-howbtn{position:absolute;top:10px;right:10px;width:40px;height:40px;border-radius:50%;background:#F2F4FA;color:#0D1530;font:900 18px var(--f-round);z-index:2}
.gw-card.has-how{padding-top:24px}
.gw-card:has(.gw-how) .gw-howbtn{display:none}
.gw-hand{position:fixed;left:0;top:0;width:58px;height:58px;z-index:130;pointer-events:none;filter:drop-shadow(0 6px 8px rgba(0,0,0,.28))}
.gw-hand svg{width:100%;height:100%;transition:transform .14s;transform-origin:30% 8%}
.gw-hand.press svg{transform:scale(.84)}
.gw-rip{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:4px solid #FFC93C;pointer-events:none;z-index:129;animation:gwRip .5s ease-out forwards}
@keyframes gwRip{from{transform:scale(.3);opacity:1}to{transform:scale(1.3);opacity:0}}
.g-cards{counter-reset:opt}
.g-cards .g-card{position:relative;padding-left:52px}
.g-cards .g-card::before{counter-increment:opt;content:counter(opt,upper-alpha);position:absolute;left:12px;top:50%;transform:translateY(-50%);width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:color-mix(in srgb,var(--gh) 18%,#fff);color:color-mix(in srgb,var(--gh) 70%,#0D1530);font:900 14px var(--f-round)}
`;
{ const st = document.createElement('style'); st.id = 'growth-how-css'; st.textContent = HOW_CSS; document.head.appendChild(st); }

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
// Prize progress counts lessons passed and unit challenges won, so a kid who has passed every lesson can still win
// the prize they can see by winning unit crowns.
const prizeCount = kid => mastered(kid) + Object.values(prog(kid).units || {}).filter(u => u.best >= 0.8).length;
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
    return { k: 0, at: prizeCount(kid) - before + 3, gap: 3, id: pick(kid, 0, {}), got: {}, h: [] };
  }
  // A planned prize the kid has since got some other way is swapped for the next one on the list.
  const cur = (kid, p) => (!p.id.startsWith('chest') && C.hasPrize(kid, p.id) ? pick(kid, p.k, p.got) : p.id);
  // After a lesson is passed or a unit crown won for the first time: wins the prize if this reached it, then plans
  // the next one. A lesson keeps the prize it won, for its leaf on the plant.
  function onPass(kid, lesson) {
    const p = { ...state(kid, 1) }, m = prizeCount(kid); p.h = [...(p.h || []), Date.now()].slice(-40); p.id = cur(kid, p);
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
    const m = prizeCount(kid), g = gapFor(pace(p.h)); if (m + g < p.at) save(kid, { prize: { at: m + g, gap: g, closer: today() } });
  }
  // The next prize, and a planned one after it (its gap is only fixed once the first is won).
  function upcoming(kid) {
    const p = state(kid), m = prizeCount(kid), left = Math.max(1, p.at - m), id1 = cur(kid, p), a = C.prizeInfo(id1);
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

// How to reach a prize in steps a kid can take now: lessons while there are any, then unit crowns, and once
// both are done, that new lessons will win it.
function prizeHow(kid, left, what = 'it') {
  const crowns = openCrowns(kid).length;
  if (treesOn().some(t => nextIn(kid, t.id))) return left === 1 ? `Pass your next lesson to win ${what}!` : `Pass ${left} more lessons to win ${what}`;
  if (crowns >= left) return left === 1 ? `Win a unit crown to win ${what}!` : `Win ${left} more unit crowns to win ${what}`;
  if (crowns) return `Win your ${crowns === 1 ? 'last unit crown' : `${crowns} unit crowns`} to get closer. New lessons on the way will win ${what}.`;
  return `You’ve done every lesson and crown for now. New lessons on the way will win ${what}!`;
}
// The strip on the Character Growth home screen: what the next lesson or two will win.
function prizeStrip(kid) {
  const [a, b] = Prize.upcoming(kid); if (!a) return '';
  const done = clamp(1 - a.left / Math.max(a.left, a.of), 0, 1), closer = (prog(kid).prize || {}).closer === today();
  return `<section class="gw-prize ${a.info.big ? 'big' : ''}"><span class="gwp-ic">${a.info.icon}</span><div class="gwp-t"><small>Next island prize${closer ? ' · it moved closer!' : ''}</small><b>${esc(a.info.name)}</b>
    <span>${prizeHow(kid, a.left)}${b ? ` · then ${esc(b.info.name)}` : ''}</span>
    <i class="gwp-bar" aria-hidden="true"><i style="width:${Math.round(done * 100)}%"></i></i></div></section>`;
}
// On the lesson-done screen: the prize just won, or how close the next one is.
function prizeBanner(o, kid) {
  if (!o.prize) { const a = (o.first || o.crown) && Prize.upcoming(kid)[0]; return a ? `<div class="gw-banner">${a.info.icon} ${prizeHow(kid, a.left, esc(a.info.name))}</div>` : ''; }
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


// If the app finished starting before this file loaded, redraw so the Character Growth card appears.
if (Store.ready) C.scheduleRender();
})();
