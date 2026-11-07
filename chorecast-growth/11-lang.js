/* ---------- Languages ----------
   Te reo Māori, Spanish, Mandarin and Japanese courses (LANGS in 01-core.js). A course is one path for every age:
   the kid's band changes how a lesson is taught and how fast it goes.
   - Sprouts (7 to 9): hear it, see it, do the action, chant it. No grammar words. A lesson of more than 3 new words
     takes two sittings.
   - Builders (10 to 12): words, then "Spot the pattern". Typed answers.
   - Makers (13 to 15): the rule first, then examples. They can test out of a lesson they already know.
   Every word and phrase becomes a pair of review cards for the kid: hear it and pick the meaning first, then say or
   type it once that's sticking (box 3). Cards come back after 1, 3, 7, 16, 35 and 90 days, at most 20 a day per
   language, and new lessons wait until the day's cards are done. Cards live on the server (lang_cards), or in this
   device's storage when there's no server. Text in «…» is in the language being learned: device voices say it, or
   for te reo Māori a fluent speaker's recording. */
const LBOX = [1, 3, 7, 16, 35, 90], LCARDS_PER_DAY = 20, LSTEPS = ['word', 'rule', 'chant', 'line', 'part'];
const lineKey = s => String(s).replace(/[«»]/g, '').normalize('NFC').replace(/\s+/g, ' ').trim();
const plainL = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC');
const answerKey = s => lineKey(s).toLowerCase().replace(/[.,!?¿¡;:"'’“”。、！？]/g, '').replace(/\s+/g, ' ').trim();
const cardKey = t => lineKey(t).toLowerCase();
const apiPath = u => (C.apiUrl ? C.apiUrl(u) : u);
const langStage = (kid, lang) => (((prog(kid).lang || {})[lang] || {}).s) || 1;
// Courses a family can switch on: live ones, plus parked ones in a preview build
const langOn = () => LANGS.filter(L => LANG_LIVE.includes(L.id) || (previewBuild && shipped && shipped[`${L.id}.s1`]));
/* Which courses a kid learns. Every kid picks one for themselves (langPick in their growth doc). For each course a
   grown-up can also say on (true: on whatever the kid picked) or off (false: the kid can't pick it). Unset leaves it
   to the kid. */
const langSet = kid => (GSET().langs || {})[kid.id] || {};
const kidLangs = kid => langOn().filter(L => { const v = langSet(kid)[L.id]; return v === true || (v !== false && prog(kid).langPick === L.id); });
const langPickable = kid => langOn().filter(L => langSet(kid)[L.id] !== false);
// What a kid hears when they try a course before picking it: hello, and what it means
const LANG_HI = { mi: ['Kia ora!', 'Hello!'], es: ['¡Hola!', 'Hello!'], zh: ['你好！', 'Hello! (nǐ hǎo)'], ja: ['こんにちは！', 'Hello! (konnichiwa)'] };
// New language lessons follow the family's new-lessons-a-day cap (none unless a grown-up sets one), counted on their
// own tally, and always after that day's words to practise. Finishing part 2 of a lesson started yesterday doesn't
// count as starting a new one.
const langNewLeft = kid => Math.max(0, perDay() - (dayInfo(kid).ll || 0));
const speakOn = () => GSET().speak !== false;

/* ---------- Voices and recordings ---------- */
const Rec = { index: {}, asked: {} };
// Which lines of a voiceless language have a recording, with a version so a re-recording isn't served from cache
function recIndex(lang) {
  if (Rec.asked[lang] || Store.mode !== 'server') return Promise.resolve(Rec.index[lang] || {});
  Rec.asked[lang] = fetch(apiPath(`/api/lang/audio-index/${lang}`)).then(r => (r.ok ? r.json() : { lines: {} })).then(j => { Rec.index[lang] = j.lines || {}; return Rec.index[lang]; }).catch(() => (Rec.index[lang] = {}));
  return Rec.asked[lang];
}
function voicesFor(lang) {
  const L = LANG[lang]; if (!L || !L.voices || !('speechSynthesis' in window)) return [];
  const all = speechSynthesis.getVoices(), out = [];
  for (const code of L.voices) all.filter(v => v.lang.replace('_', '-').toLowerCase().startsWith(code.toLowerCase())).sort((a, b) => (/(enhanced|premium)/i.test(b.name) ? 1 : 0) - (/(enhanced|premium)/i.test(a.name) ? 1 : 0)).forEach(v => { if (!out.includes(v)) out.push(v); });
  if (!out.length) all.filter(v => v.lang.toLowerCase().startsWith(lang)).forEach(v => out.push(v));
  return out;
}
function canHear(lang, text) {
  const L = LANG[lang]; if (!L) return false;
  return L.voices ? voicesFor(lang).length > 0 || ('speechSynthesis' in window && !speechSynthesis.getVoices().length) : !!(Rec.index[lang] || {})[lineKey(text)];
}
let langAudio = null;
// Says a line in the language. opts.slow for the 🐢 button, opts.voice picks among the device's voices (listening
// games take turns through them). Resolves when it ends, or false when there's nothing to play.
function speakLang(text, lang, opts = {}) {
  const L = LANG[lang], key = lineKey(text); if (!L || !key) return Promise.resolve(false);
  try { speechSynthesis.cancel(); } catch (e) {}
  if (langAudio) { langAudio.pause(); langAudio = null; }
  if (!L.voices) {
    const v = (Rec.index[lang] || {})[key]; if (!v) return Promise.resolve(false);
    return new Promise(res => {
      const a = new Audio(apiPath(`/api/lang/audio/${lang}/${encodeURIComponent(key)}?v=${v}`)); langAudio = a;
      a.playbackRate = opts.slow ? 0.75 : 1; a.onended = a.onerror = () => res(true); a.play().catch(() => res(false));
    });
  }
  return new Promise(res => {
    try {
      const u = new SpeechSynthesisUtterance(key), vs = voicesFor(lang), kid = kidNow();
      if (vs.length) u.voice = vs[(opts.voice || 0) % vs.length];
      u.lang = u.voice ? u.voice.lang : L.voices[0];
      u.rate = opts.slow ? 0.55 : kid && bandOf(kid) === 'sprouts' ? 0.8 : 0.9;
      u.onend = u.onerror = () => res(true); speechSynthesis.speak(u);
    } catch (e) { res(false); }
  });
}

/* ---------- Text in the language ----------
   After a step or game is drawn, «…» in it becomes the language's text: tappable to hear in headings and cards,
   and plain (styled) inside answer buttons, where a tap means "this is my answer". */
function markLang(host, lang) {
  if (!host || !lang) return;
  const walk = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), hits = [];
  while (walk.nextNode()) if (/«[^»]+»/.test(walk.currentNode.nodeValue)) hits.push(walk.currentNode);
  for (const node of hits) {
    const inBtn = !!node.parentElement.closest('button'), frag = document.createDocumentFragment();
    String(node.nodeValue).split(/(«[^»]+»)/).forEach(part => {
      const m = part.match(/^«([^»]+)»$/);
      if (!m) { if (part) frag.appendChild(document.createTextNode(part)); return; }
      const el = document.createElement(inBtn ? 'span' : 'button'); el.className = 'lw'; el.lang = lang === 'zh' ? 'zh-Hans' : lang;
      if (rubyOn(lang)) el.appendChild(rubyFrag(m[1], lang)); else el.textContent = m[1];
      if (!inBtn) { el.type = 'button'; el.dataset.lsay = m[1]; el.setAttribute('aria-label', `${m[1]}, hear it`); }
      frag.appendChild(el);
    });
    node.parentNode.replaceChild(frag, node);
  }
  host.querySelectorAll('[data-lsay]').forEach(b => { b.onclick = e => { e.stopPropagation(); speakLang(b.dataset.lsay, lang); hint(b, lang); }; });
}
/* Mandarin and Japanese show each known word's pinyin or rōmaji above it, for Sprouts always and for everyone in the
   first two stages. Words are found longest first, so a phrase's own reading wins over its words'. */
// A Mandarin or Japanese lesson title is in the language, so it gets readings and can be tapped to hear
const langTitle = l => (l.lang && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(l.title) ? `«${l.title}»` : l.title);
const rubyOn = lang => (lang === 'zh' || lang === 'ja') && (k => !k || bandOf(k) === 'sprouts' || langStage(k, lang) <= 2)(kidNow());
function rubyFrag(text, lang) {
  const f = document.createDocumentFragment(), chars = [...text];
  for (let i = 0; i < chars.length;) {
    let hit = null;
    for (let n = Math.min(12, chars.length - i); n >= 1 && !hit; n--) { const seg = chars.slice(i, i + n).join(''), w = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(seg) && Dict.get(lang, seg); if (w && w.rd) hit = [seg, w.rd, n]; }
    if (!hit) { f.append(chars[i]); i++; continue; }
    const r = document.createElement('ruby'), rt = document.createElement('rt'); r.append(hit[0]); rt.textContent = hit[1]; r.append(rt); f.append(r); i += hit[2];
  }
  return f;
}
// Tapping a known word shows what it means, just under it, for a moment
function hint(btn, lang) {
  const w = Dict.get(lang, btn.dataset.lsay); if (!w) return;
  const old = btn.querySelector('.lw-hint'); if (old) return old.remove();
  btn.insertAdjacentHTML('beforeend', `<span class="lw-hint">${esc(w.en)}</span>`); setTimeout(() => { const h = btn.querySelector('.lw-hint'); if (h) h.remove(); }, 2600);
}
const strip = (lang, target) => { const L = LANG[lang]; return L && L.strip ? `<div class="l-strip" role="group" aria-label="Letters">${[...L.strip].map(ch => `<button type="button" class="l-key" data-key="${ch}">${ch}</button>`).join('')}</div>` : ''; };

/* ---------- Every word a kid has met, from the course's loaded stages ---------- */
const Dict = {
  by: {},
  build(lang) {
    const d = {}; for (const key of Object.keys(Packs).filter(k => k.startsWith(lang + '.s'))) for (const u of Packs[key].units) for (const l of u.lessons) {
      for (const w of l.words || []) d[cardKey(w.t)] = d[cardKey(w.t)] || { ...w, kind: 'w', lesson: l.id };
      for (const s of l.says || []) d[cardKey(s.t)] = d[cardKey(s.t)] || { t: s.t, en: s.en, rd: s.rd, pic: '💬', kind: 's', lesson: l.id };
    }
    this.by[lang] = d; return d;
  },
  all(lang) { return this.by[lang] || this.build(lang); },
  get(lang, t) { return this.all(lang)[cardKey(t)] || null; },
};

/* ---------- Review cards ---------- */
const LC = { cards: {}, loaded: {}, queue: {}, stats: {}, timer: null };
const lcKey = (kid, lang) => `${kid.id}|${lang}`;
const lsKey = (kid, lang) => `cc:lang:${kid.id}:${lang}`;
function lcLoad(kid, lang) {
  const k = lcKey(kid, lang); if (LC.loaded[k]) return LC.loaded[k];
  LC.loaded[k] = (async () => {
    if (Store.mode === 'server') {
      try { const r = await C.api('GET', `/api/lang/cards?kid=${encodeURIComponent(kid.id)}&lang=${lang}&today=${today()}&since=${new Date().setHours(0, 0, 0, 0)}`); LC.cards[k] = Object.fromEntries((r.cards || []).map(c => [c.card, c])); LC.stats[k] = r.stats || {}; }
      catch (e) { LC.cards[k] = LC.cards[k] || {}; LC.loaded[k] = null; }
    } else {
      try { const j = JSON.parse(localStorage.getItem(lsKey(kid, lang)) || '{}'); LC.cards[k] = j.cards || {}; LC.stats[k] = j.stats || {}; } catch (e) { LC.cards[k] = {}; LC.stats[k] = {}; }
    }
    lcHeal(kid, lang);
  })();
  return LC.loaded[k];
}
const lcCards = (kid, lang) => LC.cards[lcKey(kid, lang)] || {};
function lcSaveLocal(kid, lang) { if (Store.mode === 'server') return; try { localStorage.setItem(lsKey(kid, lang), JSON.stringify({ cards: lcCards(kid, lang), stats: LC.stats[lcKey(kid, lang)] || {} })); } catch (e) {} }
// Today's reviews for a language: due cards, oldest first, up to the day's limit less what's been done today
function lcDue(kid, lang) {
  const t = today(), st = LC.stats[lcKey(kid, lang)] || {}, doneToday = st.day === t ? st.n || 0 : 0;
  return Object.values(lcCards(kid, lang)).filter(c => c.due <= t && Dict.get(lang, c.card.replace(/:[rp]$/, ''))).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box)).slice(0, Math.max(0, LCARDS_PER_DAY - doneToday));
}
// Last week's reviews: [answered, right]
function lcWeek(kid, lang) { const w = (LC.stats[lcKey(kid, lang)] || {}).week || {}; return [w.n || 0, w.right || 0]; }
function lcNew(kid, lang, list) {
  const k = lcKey(kid, lang), cards = LC.cards[k] || (LC.cards[k] = {}), add = [];
  for (const x of list) if (!cards[x.card]) { cards[x.card] = { card: x.card, lesson: x.lesson, box: x.box || 1, due: addDays(today(), LBOX[(x.box || 1) - 1]), right: 0, wrong: 0 }; add.push(x); }
  lcSaveLocal(kid, lang);
  if (Store.mode === 'server' && add.length) lcPost(kid, lang, '/api/lang/learn', { cards: add }, 0);
}
async function lcPost(kid, lang, url, body, tries) {
  try { await C.api('POST', url, { kid: kid.id, lang, today: today(), ...body }); }
  catch (e) { if (tries < 5) setTimeout(() => lcPost(kid, lang, url, body, tries + 1), 2500 * (tries + 1)); }
}
// A first pass makes a recognising card for every new word and phrase in the lesson
function lcLearn(kid, l, box = 1) {
  lcNew(kid, l.lang, [...l.words.map(w => w.t), ...l.says.map(s => s.t)].map(t => ({ card: `${cardKey(t)}:r`, lesson: l.id, box })));
}
// Lessons passed on another device (or before a card was made) get their cards when the course is opened
function lcHeal(kid, lang) {
  const d = prog(kid).done || {}, have = lcCards(kid, lang);
  for (const key of Object.keys(Packs).filter(x => x.startsWith(lang + '.s'))) for (const u of Packs[key].units) for (const l of u.lessons) {
    if (!((d[l.id] || {}).best >= 0.8)) continue;
    if ([...l.words, ...l.says].some(w => !have[`${cardKey(w.t)}:r`])) lcLearn(kid, l, d[l.id].placed ? 3 : 1);
  }
}
function lcAnswer(kid, lang, card, ok, ms) {
  const k = lcKey(kid, lang), c = (LC.cards[k] || {})[card], t = today(); if (!c) return;
  const st = LC.stats[k] || (LC.stats[k] = {}); if (st.day !== t) { st.day = t; st.n = 0; } st.n++;
  st.week = { n: ((st.week || {}).n || 0) + 1, right: ((st.week || {}).right || 0) + (ok ? 1 : 0) };
  if (c.due <= t) { c.box = ok ? Math.min(LBOX.length, c.box + 1) : 1; c.due = addDays(t, LBOX[c.box - 1]); }
  if (ok) c.right++; else c.wrong++;
  c.last = t;
  // Recognising it well enough (box 3) opens the harder card: say, type or build it
  const p = card.replace(/:r$/, ':p');
  if (card.endsWith(':r') && c.box >= 3 && !LC.cards[k][p]) LC.cards[k][p] = { card: p, lesson: c.lesson, box: 1, due: addDays(t, 1), right: 0, wrong: 0 };
  (LC.queue[k] || (LC.queue[k] = [])).push({ card, ok, ms });
  lcSaveLocal(kid, lang);
}
function lcFlush() {
  if (Store.mode !== 'server') return;
  for (const [k, list] of Object.entries(LC.queue)) {
    if (!list.length) continue; const [kidId, lang] = k.split('|'), kid = Store.kids[kidId]; LC.queue[k] = [];
    if (kid) lcPost(kid, lang, '/api/lang/answers', { answers: list }, 0);
  }
}
if (window.addEventListener) window.addEventListener('pagehide', lcFlush);

/* ---------- A question from a card ---------- */
function cardItem2(kid, lang, card) {
  const [key, dir] = [card.replace(/:[rp]$/, ''), card.slice(-1)], w = Dict.get(lang, key); if (!w) return null;
  const pool = shuffle(Object.values(Dict.all(lang)).filter(x => x.kind === w.kind && cardKey(x.t) !== key && x.en !== w.en && (w.kind === 's' || x.pic !== w.pic)), Math.random).slice(0, 2), band = bandOf(kid);
  const opt = x => (w.kind === 'w' && x.pic ? `${x.pic} ${x.en}` : x.en);
  if (dir === 'r') return { type: 'hear', q: `What does «${w.t}» mean?`, opts: shuffle([{ t: opt(w), ok: true }, ...pool.map(x => ({ t: opt(x), ok: false }))], Math.random) };
  // Saying it: Sprouts pick it, older kids build or type it
  if (band === 'sprouts' || lang === 'zh' || lang === 'ja') {
    if (w.kind === 's' && band !== 'sprouts') return { type: 'tiles', q: `Build it: ${w.en}`, a: w.t, extra: [] };
    return { type: 'mcq', q: `How do you say ${w.kind === 'w' && w.pic ? w.pic + ' ' : ''}“${w.en}”?`, opts: shuffle([{ t: `«${w.t}»`, ok: true }, ...pool.map(x => ({ t: `«${x.t}»`, ok: false }))], Math.random) };
  }
  if (w.kind === 's') return { type: 'tiles', q: `Build it: ${w.en}`, a: w.t, extra: [] };
  return { type: 'type', q: `${w.pic ? w.pic + ' ' : ''}How do you say “${w.en}”?`, a: w.t };
}

/* ---------- Games ---------- */
// Hear it, then pick. The «…» part of the question is a speaker button, not text, so it's real listening.
GAMES.hear = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, m = String(it.q).match(/«([^»]+)»/), target = m ? m[1] : '', opts = shuffle(it.opts, rnd), vi = (ctx.voice = (ctx.voice || 0) + 1);
  const q = esc(local(it.q)).replace(/«[^»]+»/, '<button type="button" class="l-hear" data-hear aria-label="Hear it again">🔊</button>');
  host.innerHTML = `<div class="g-qrow"><h2 class="g-q">${q}</h2></div>${canHear(lang, target) ? '' : `<p class="l-norec">${esc(`«${target}»`)}</p>`}<div class="g-cards n${opts.length}">${opts.map((o, i) => `<button class="g-card ${/^\p{Extended_Pictographic}/u.test(o.t) ? 'pic' : ''}" style="--d:${i * 70}ms" data-i="${i}"><span>${esc(local(o.t))}</span></button>`).join('')}</div>`;
  const play = () => speakLang(target, lang, { voice: vi }); host.querySelector('[data-hear]').onclick = play; setTimeout(play, 350);
  host.querySelectorAll('.g-card').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const o = opts[+b.dataset.i], ok = o.ok; b.classList.add(ok ? 'right' : 'wrong');
    if (!ok) host.querySelectorAll('.g-card').forEach((x, i) => { if (opts[i].ok) x.classList.add('right'); });
    ok ? cheer(b) : oops(b); fx(ctx, 'graded', { ok });
    done({ ok, score: ok ? 1 : 0, answer: o.t, right: ok ? '' : `«${target}» is ${local(opts.find(x => x.ok).t)}` });
  }; });
};
// Which did you hear? Two or three written words that sound alike; one is played.
GAMES.pair = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, opts = shuffle(it.opts, rnd), right = opts.find(o => o.ok), target = String(right.t).replace(/[«»]/g, ''), vi = (ctx.voice = (ctx.voice || 0) + 1);
  host.innerHTML = `<div class="g-qrow"><h2 class="g-q">${esc(local(it.q.replace(/«[^»]+»/g, '')))}</h2><button type="button" class="l-hear" data-hear aria-label="Hear it again">🔊</button></div>${it.en && !canHear(lang, target) ? `<p class="l-norec">No voice on this device: pick the one that means ${esc(it.en)}.</p>` : ''}<div class="g-cards n${opts.length}">${opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-i="${i}"><span>${esc(o.t)}</span></button>`).join('')}</div>`;
  const play = () => speakLang(target, lang, { voice: vi }); host.querySelector('[data-hear]').onclick = play; setTimeout(play, 350);
  host.querySelectorAll('.g-card').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const o = opts[+b.dataset.i], ok = o.ok; b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b); fx(ctx, 'graded', { ok });
    done({ ok, score: ok ? 1 : 0, answer: o.t, right: ok ? '' : `It was ${right.t}` });
  }; });
};
/* Hear it, say it, hear both. The kid's recording stays in this page's memory and is dropped as soon as the step
   moves on: it's never saved or sent anywhere. Without a microphone (or with Speaking practice off) they say it out
   loud along with the voice. Never marked: it's practice. */
GAMES.say = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, target = String(it.q).replace(/[«»]/g, ''), mic = speakOn() && navigator.mediaDevices && window.MediaRecorder;
  let rec = null, url = null, stream = null, chunks = [];
  const clean = () => { try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) {} if (stream) stream.getTracks().forEach(t => t.stop()); if (url) URL.revokeObjectURL(url); stream = rec = url = null; };
  if (ctx.cleanup) ctx.cleanup.push(clean);
  host.innerHTML = `<div class="l-say"><p class="l-say-t" lang="${lang}">${esc(target)}</p>${it.rd ? `<p class="l-rd">${esc(it.rd)}</p>` : ''}${it.en ? `<p class="l-say-en">${esc(it.en)}</p>` : ''}
    <div class="l-say-row"><button class="g-go ghost" data-model>🔊 Hear it</button><button class="g-go ghost" data-slow>🐢 Slowly</button></div>
    ${mic ? '<button class="g-go l-rec" data-rec>🎙️ Say it</button><div class="l-say-row" data-after hidden><button class="g-go ghost" data-both>🔁 Hear both</button></div>' : '<p class="l-say-tip">Say it out loud with the voice.</p>'}
    <button class="g-go" data-done>${mic ? 'Next' : 'I said it'}</button></div>`;
  markLang(host, lang);
  const model = () => speakLang(target, lang); host.querySelector('[data-model]').onclick = model; host.querySelector('[data-slow]').onclick = () => speakLang(target, lang, { slow: true }); setTimeout(model, 300);
  const recBtn = host.querySelector('[data-rec]');
  if (recBtn) recBtn.onclick = async () => {
    if (rec && rec.state === 'recording') { rec.stop(); return; }
    try {
      stream = stream || await navigator.mediaDevices.getUserMedia({ audio: true }); chunks = [];
      rec = new MediaRecorder(stream); rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })); chunks = []; recBtn.textContent = '🎙️ Say it again'; recBtn.classList.remove('on'); host.querySelector('[data-after]').hidden = false; both(); };
      rec.start(); recBtn.textContent = '⏹ Stop'; recBtn.classList.add('on'); setTimeout(() => { if (rec && rec.state === 'recording') rec.stop(); }, 5000);
    } catch (e) { recBtn.outerHTML = '<p class="l-say-tip">No microphone here. Say it out loud with the voice.</p>'; }
  };
  const both = async () => { await speakLang(target, lang); if (url) { const a = new Audio(url); a.play().catch(() => {}); } C.track('lang.say', { lang }, ctx.kid && ctx.kid.id); };
  const bb = host.querySelector('[data-both]'); if (bb) bb.onclick = both;
  host.querySelector('[data-done]').onclick = () => { clean(); fx(ctx, 'graded', { ok: true }); done({ ok: true, score: 1, answer: 'said' }); };
};
// Type it, with a strip of the language's letters (macrons, accents, tone marks). Sprouts and Builders who leave the
// marks off are right, and see how it's spelled; Makers need them.
GAMES.type = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, kid = ctx.kid, strict = kid && bandOf(kid) === 'makers';
  host.innerHTML = `${qHead(it.q)}<div class="l-type"><input class="l-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" lang="${lang}" aria-label="Your answer">${strip(lang)}<button class="g-go" data-check>Check</button></div>`;
  markLang(host, lang);
  const inp = host.querySelector('.l-in'); setTimeout(() => inp.focus(), 200);
  host.querySelectorAll('[data-key]').forEach(b => { b.onclick = () => { const s = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, s) + b.dataset.key + inp.value.slice(inp.selectionEnd ?? s); inp.focus(); inp.setSelectionRange(s + 1, s + 1); Sound.tap(); }; });
  const check = () => {
    if (host.dataset.locked || !inp.value.trim()) return; host.dataset.locked = 1; inp.disabled = true;
    const a = answerKey(inp.value), want = answerKey(it.a), exact = a === want, near = plainL(a) === plainL(want), ok = exact || (near && !strict);
    ok ? cheer(inp) : oops(inp); fx(ctx, 'graded', { ok });
    if (ok && !exact) host.querySelector('.l-type').insertAdjacentHTML('beforeend', `<p class="l-spell">Right! It’s spelled «${esc(it.a)}».</p>`);
    markLang(host, lang);
    done({ ok, score: ok ? 1 : 0, answer: inp.value, right: ok ? '' : near ? `So close! Check the marks: it’s spelled «${it.a}».` : `It’s «${it.a}»${it.hint ? ` (${it.hint})` : ''}.` });
  };
  host.querySelector('[data-check]').onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
};
// Build it from tiles: the words of a phrase, or the letters (kana, characters) of a word.
GAMES.tiles = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, a = lineKey(it.a), parts = /\s/.test(a) ? a.split(' ') : [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(a)].map(x => x.segment);
  const tiles = shuffle([...parts, ...(it.extra || [])].map((t, i) => ({ t, i })), rnd), picked = [];
  const draw = () => {
    host.innerHTML = `${qHead(it.q)}<div class="l-built" lang="${lang}">${picked.map((p, k) => `<button class="g-chip on" data-back="${k}">${esc(p.t)}</button>`).join('') || '<span class="l-built-ph">Tap the tiles in order</span>'}</div>
      <div class="g-tray" lang="${lang}">${tiles.map((p, j) => (picked.includes(p) ? '' : `<button class="g-chip" data-pick="${j}">${esc(p.t)}</button>`)).join('')}</div>`;
    host.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { picked.push(tiles[+b.dataset.pick]); Sound.pop(); if (picked.length === parts.length) return finish(); draw(); }; });
    host.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => { picked.splice(+b.dataset.back, 1); Sound.tap(); draw(); }; });
  };
  const finish = () => {
    draw(); host.dataset.locked = 1; host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const got = picked.map(p => p.t).join(/\s/.test(a) ? ' ' : ''), ok = answerKey(got) === answerKey(a);
    const built = host.querySelector('.l-built'); built.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(built, true) : oops(built); fx(ctx, 'graded', { ok });
    if (ok) speakLang(a, lang);
    done({ ok, score: ok ? 1 : 0, answer: got, right: ok ? '' : `It’s «${a}».` });
  };
  draw();
};

/* Trace a character or a few kana over a faint copy. Marked by how much of the letter the finger covered and how much
   of the drawing stayed on it, so scribbling over everything doesn't pass. (No stroke order yet.) */
GAMES.trace = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, ch = String(it.q).replace(/[«»]/g, '').trim(), N = 320, STEP = 4;
  host.innerHTML = `${qHead(`Trace «${ch}»${it.en ? `: ${it.en}` : ''}`)}<div class="l-trace"><canvas width="${N}" height="${N}" aria-label="Trace ${esc(ch)} with your finger"></canvas></div>
    <div class="l-say-row"><button class="g-go ghost" data-hear>🔊 Hear it</button><button class="g-go ghost" data-clear>↺ Start again</button></div><button class="g-go" data-check>Done</button>`;
  markLang(host, lang);
  const cv = host.querySelector('canvas'), g = cv.getContext('2d'), size = Math.floor(N * 0.8 / Math.max(1, [...ch].length * 0.9));
  const font = `700 ${size}px "PingFang SC", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans CJK SC", "Noto Sans JP", sans-serif`;
  const glyph = (c, fat) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, N / 2, N / 2 + size * 0.04); if (fat) { c.lineWidth = fat; c.lineJoin = 'round'; c.strokeText(ch, N / 2, N / 2 + size * 0.04); } };
  const maskOf = fat => { const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d'); glyph(x, fat); return x.getImageData(0, 0, N, N).data; };
  const thin = maskOf(0), wide = maskOf(28), pts = [];
  for (let y = 0; y < N; y += STEP) for (let x = 0; x < N; x += STEP) if (thin[(y * N + x) * 4 + 3] > 128) pts.push([x, y]);
  cv._glyphPts = pts;
  const ink = document.createElement('canvas'); ink.width = ink.height = N; const k = ink.getContext('2d'), hue = getComputedStyle(cv).getPropertyValue('--gh').trim() || '#2F6FE4';
  const guide = () => { g.clearRect(0, 0, N, N); g.fillStyle = '#DCE1EE'; glyph(g, 0); k.clearRect(0, 0, N, N); };
  [g, k].forEach(c => { c.lineCap = c.lineJoin = 'round'; c.lineWidth = 22; }); g.strokeStyle = hue; k.strokeStyle = '#000'; guide();
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * N / r.width, (e.clientY - r.top) * N / r.height]; };
  let last = null, any = false;
  const line = (a, b) => [g, k].forEach(c => { c.lineWidth = 22; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); });
  cv.onpointerdown = e => { try { cv.setPointerCapture(e.pointerId); } catch (x) {} last = pos(e); line(last, [last[0] + 0.1, last[1] + 0.1]); any = true; };
  cv.onpointermove = e => { if (!last) return; const p = pos(e); line(last, p); last = p; };
  cv.onpointerup = cv.onpointercancel = () => { last = null; };
  host.querySelector('[data-hear]').onclick = () => speakLang(ch, lang); setTimeout(() => speakLang(ch, lang), 300);
  host.querySelector('[data-clear]').onclick = () => { guide(); any = false; Sound.tap(); };
  host.querySelector('[data-check]').onclick = () => {
    if (!any || host.dataset.locked) return; host.dataset.locked = 1;
    const d = k.getImageData(0, 0, N, N).data; let hit = 0, drawn = 0, near = 0;
    pts.forEach(([x, y]) => { if (d[(y * N + x) * 4 + 3] > 0) hit++; });
    for (let y = 0; y < N; y += STEP) for (let x = 0; x < N; x += STEP) if (d[(y * N + x) * 4 + 3] > 0) { drawn++; if (wide[(y * N + x) * 4 + 3] > 0) near++; }
    const cover = pts.length ? hit / pts.length : 1, keep = drawn ? near / drawn : 0, ok = cover >= 0.6 && keep >= 0.55;
    ok ? cheer(cv, true) : oops(cv); fx(ctx, 'graded', { ok }); if (ok) speakLang(ch, lang);
    done({ ok, score: ok ? Math.min(1, cover) : cover * keep, answer: 'traced', right: ok ? '' : cover < 0.6 ? 'Try to cover the whole grey letter.' : 'Keep your finger on the grey letter.' });
  };
};

// Hear it, then say whether it means what the card shows. The word isn't written, so it's real listening.
GAMES.hearyes = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, vi = (ctx.voice = (ctx.voice || 0) + 1);
  host.innerHTML = `<div class="g-qrow"><h2 class="g-q">Listen. Does it mean this?</h2><button type="button" class="l-hear" data-hear aria-label="Hear it again">🔊</button></div>${canHear(lang, it.t) ? '' : `<p class="l-norec" lang="${lang}">${esc(it.t)}${it.rd ? ` · ${esc(it.rd)}` : ''}</p>`}
    <div class="g-swipe"><div class="g-swcard l-yn"><span>${esc(it.show)}</span></div></div>
    <div class="g-tfrow"><button class="g-tf no" data-v="0">${ic('x')} No</button><button class="g-tf yes" data-v="1">${ic('check')} Yes</button></div>`;
  const play = () => speakLang(it.t, lang, { voice: vi }); host.querySelector('[data-hear]').onclick = play; setTimeout(play, 350);
  host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const v = b.dataset.v === '1', ok = v === it.a; host.querySelectorAll('.g-tf').forEach(x => { x.disabled = true; });
    b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(b) : oops(b); fx(ctx, 'graded', { ok });
    done({ ok, score: ok ? 1 : 0, answer: v ? 'Yes' : 'No', right: ok ? '' : `«${it.t}» means ${it.mean}.` });
  }; });
};
// Three words you can only hear: tap each to hear it, then pick the one that means the picture
GAMES.sound = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, opts = shuffle(it.opts, rnd), voice = opts.every(o => canHear(lang, o.t)); let sel = -1;
  host.innerHTML = `${qHead(it.q)}<div class="g-cards n${opts.length} l-sound">${opts.map((o, i) => `<button class="g-card" style="--d:${i * 70}ms" data-i="${i}" aria-label="Sound ${i + 1}"><span>🔊 ${i + 1}</span>${voice ? '' : `<small lang="${lang}">${esc(o.t)}</small>`}</button>`).join('')}</div><button class="g-go" data-check disabled>Check</button>`;
  const cards = [...host.querySelectorAll('.l-sound .g-card')], check = host.querySelector('[data-check]');
  cards.forEach(b => { b.onclick = () => { if (host.dataset.locked) return; sel = +b.dataset.i; cards.forEach(x => x.classList.toggle('sel', x === b)); check.disabled = false; speakLang(opts[sel].t, lang); }; });
  check.onclick = () => {
    if (host.dataset.locked || sel < 0) return; host.dataset.locked = 1; const ok = opts[sel].ok;
    cards.forEach((x, i) => { x.disabled = true; x.innerHTML = `<span>«${esc(opts[i].t)}»</span>`; if (opts[i].ok) x.classList.add('right'); });
    if (!ok) cards[sel].classList.add('wrong'); ok ? cheer(cards[sel]) : oops(cards[sel]); fx(ctx, 'graded', { ok }); check.disabled = true;
    const right = opts.find(o => o.ok).t; speakLang(right, lang);
    done({ ok, score: ok ? 1 : 0, answer: opts[sel].t, right: ok ? '' : `It was «${right}».` });
  };
};
// Fill the gap in one of the lesson's phrases, with its meaning as the clue; then hear the whole phrase
GAMES.lgap = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, opts = shuffle(it.opts, rnd), pre = it.before.trimEnd(), post = it.after.trimStart(), sp = s => (s ? ' ' : ''), part = s => (/\p{L}/u.test(s) ? esc(`«${s}»`) : esc(s));
  host.innerHTML = `${qHead(`Fill the gap: “${it.en}”`)}<p class="l-gap" lang="${lang}">${part(pre)}${sp(pre !== it.before)}<span class="g-blank" data-blank>?</span>${sp(post !== it.after)}${part(post)}</p>
    <div class="g-chips">${opts.map((o, i) => `<button class="g-chip" data-i="${i}">${esc(`«${o}»`)}</button>`).join('')}</div>`;
  const blank = host.querySelector('[data-blank]');
  host.querySelectorAll('.g-chip').forEach(b => { b.onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const o = opts[+b.dataset.i], ok = answerKey(o) === answerKey(it.a); host.querySelectorAll('.g-chip').forEach(x => { x.disabled = true; });
    blank.textContent = o; blank.classList.add(ok ? 'right' : 'wrong'); b.classList.add(ok ? 'right' : 'wrong'); ok ? cheer(blank) : oops(blank); fx(ctx, 'pick', { ok });
    if (ok) speakLang(it.full, lang);
    done({ ok, score: ok ? 1 : 0, answer: o, right: ok ? '' : `It’s «${it.a}»: «${it.full}»` });
  }; });
};

/* ---------- Lessons ---------- */
// The steps of a language lesson for this kid. part 1 is a Sprouts first sitting; quick is a Makers test-out.
function langSteps(kid, l, part, quick) {
  const band = bandOf(kid), by = l.by[band] || {}, rules = by.rule || (band === 'sprouts' ? [] : l.rules), learn = by.learn || l.learn;
  const steps = [{ kind: 'hook' }];
  if (quick) { l.checks.forEach((item, i) => steps.push({ kind: 'check', item, i })); return steps; }
  const split = band === 'sprouts' && l.words.length > 3, half = Math.ceil(l.words.length / 2);
  let words = l.words, says = l.says;
  if (split && part === 1) { words = l.words.slice(0, half); says = l.says.slice(0, Math.ceil(l.says.length / 2)); }
  else if (split) {
    const met = l.words.slice(0, half); if (met.length >= 2) steps.push({ kind: 'try', ex: 'First, the words from last time.', item: recapItem(l, met) });
    words = l.words.slice(half); says = l.says.slice(Math.ceil(l.says.length / 2));
  }
  if (l.guess && part !== 2) steps.push({ kind: 'guess', item: l.guess });
  if (band === 'makers') rules.forEach(text => steps.push({ kind: 'rule', text }));
  words.forEach(w => steps.push({ kind: 'word', w }));
  says.forEach(s => steps.push({ kind: 'try', ex: '', item: { type: 'say', q: `«${s.t}»`, en: s.en, rd: s.rd } }));
  if (split && part === 1) { if (words.length >= 2) steps.push({ kind: 'play', item: recapItem(l, words) }); steps.push({ kind: 'part' }); return steps; }
  if (band !== 'makers') rules.forEach(text => steps.push({ kind: 'rule', text, spot: band === 'builders' }));
  learn.forEach(text => steps.push({ kind: 'learn', text }));
  if (band === 'sprouts' && l.chant.length) steps.push({ kind: 'chant', lines: l.chant });
  l.tries.forEach(t => steps.push({ kind: 'try', ex: t.ex, item: t.item }));
  const have = steps.filter(s => stepWorth(s)).length + (l.play ? 1 : 0) + l.checks.length;
  drillSteps(kid, l, have).forEach(s => steps.push(s));
  if (l.play) steps.push({ kind: 'play', item: l.play });
  l.checks.forEach((item, i) => steps.push({ kind: 'check', item, i }));
  steps.push({ kind: 'home' });
  return steps;
}
// "Which one is …?" over a few of the lesson's words, with their pictures
function recapItem(l, ws) {
  const w = ws[Math.floor(Math.random() * ws.length)], pick = [w, ...shuffle(ws.filter(x => x !== w), Math.random).slice(0, 2)], pics = new Set(pick.map(x => x.pic)).size === pick.length;
  return { type: 'hear', q: `Which one is «${w.t}»?`, opts: shuffle(pick.map(x => ({ t: pics && x.pic ? x.pic : `${x.pic} ${x.en}`.trim(), ok: x === w })), Math.random) };
}
/* ---------- A long lesson: the new words and phrases from every angle ----------
   After the words, phrases and the lesson's own tries, a lesson asks about the same words from every side. Every
   question is built from the lesson's checked words and phrases, or from ones met earlier in the stage, so nothing new
   is made up. The lesson's own game and questions still come last.
     Listen    hear it, pick what it means; hear it, does it mean this? (yes or no)
     Read      see what it means, pick the word; hear it, pick the written word; hear three, pick the one that means
               it; match them all
     Make it   build it from its letters, kana or characters; type it (Spanish, Builders and Makers) or trace it
               (Mandarin and Japanese); say it
     Phrases   hear a phrase, pick its meaning; build it from its words; fill the gap with a new word; pick the phrase
               (Builders and Makers)
     Mix       the new words again with fresh choices, then the words and phrases from earlier lessons, nearest first
   Sprouts get about 40 questions and games, Builders 45 and Makers 50, split into rounds. A lesson with one new word
   and nothing before it gets fewer, rather than the same question over and over. Distractors never share a meaning
   with the answer, and never sound the same (Spanish words that differ only by an accent, Mandarin or Japanese words
   with the same reading), so every question has exactly one right answer. */
const DRILL = { sprouts: 40, builders: 45, makers: 50 };
const LPUNCT = /[¡¿!?.,;:。、，！？…"“”「」]/gu;
const senses = en => String(en).toLowerCase().replace(/\([^)]*\)|“[^”]*”/g, '').split(/,|;|\bor\b/).map(x => x.replace(/[^\p{L}\p{N}' ]/gu, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
const sameSense = (a, b) => { const x = senses(a); return senses(b).some(s => x.includes(s)); };
const soundKey = (x, lang) => (lang === 'zh' || lang === 'ja' ? String(x.rd || x.t).toLowerCase().replace(/[\s'’\-·.,!?]/g, '') : plainL(answerKey(x.t)));
const graphemesOf = (s, lang) => [...new Intl.Segmenter(lang, { granularity: 'grapheme' }).segment(s)].map(x => x.segment).filter(x => x.trim());
const CJK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;
// A seeded random, so the same kid gets the same lesson all day (a saved lesson picks up where it was)
function drillRng(key) { let h = 2166136261; for (const ch of key) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0; return () => { h = (h + 0x6D2B79F5) >>> 0; let t = Math.imul(h ^ (h >>> 15), h | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuf = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pm = w => (w.kind === 'w' && w.pic ? `${w.pic} ${w.en}` : w.en);
const howSay = (pic, en) => `How do you say ${pic ? pic + ' ' : ''}“${en}”${/[?？]$/.test(en) ? '' : '?'}`;
// Up to n others to choose from, of the same kind: this lesson's and unit's first, then ones met in earlier lessons,
// then the rest of the course. Grammar words (a meaning that's only a note, like “(a question word)”) are never one.
function others(D, w, n, more = () => true) {
  const out = [], seen = new Set([cardKey(w.t)]), mine = soundKey(w, D.lang);
  for (const x of [...shuf(D.near, D.r), ...shuf(D.met, D.r), ...shuf(D.rest, D.r)]) {
    if (out.length >= n) break; const k = cardKey(x.t);
    if (seen.has(k) || x.kind !== w.kind || /^\(/.test(x.en) || sameSense(x.en, w.en) || soundKey(x, D.lang) === mine || (w.kind === 'w' && w.pic && x.pic === w.pic)) continue;
    if (out.some(o => sameSense(o.en, x.en) || soundKey(o, D.lang) === soundKey(x, D.lang) || (x.kind === 'w' && o.pic && o.pic === x.pic)) || !more(x)) continue;
    seen.add(k); out.push(x);
  }
  return out.length >= n ? out : null;
}
// A phrase's tiles: its words (Spanish; Japanese is written with a space between chunks), or for Mandarin the longest
// known word at each point, with any other character on its own tile
function phraseTiles(s, lang) {
  const t = lineKey(s.t).replace(LPUNCT, ' ').replace(/\s+/g, ' ').trim();
  if (lang !== 'zh') return t.split(' ');
  const chars = [...t.replace(/\s/g, '')], has = new Set(Object.values(Dict.all(lang)).filter(w => w.kind === 'w').map(w => w.t)), out = [];
  for (let i = 0; i < chars.length;) { let n = Math.min(6, chars.length - i); while (n > 1 && !has.has(chars.slice(i, i + n).join(''))) n--; out.push(chars.slice(i, i + n).join('')); i += n; }
  return out;
}
// Where a word sits in a phrase, if it's there once and the phrase has more to it than the word
function gapOf(s, w, lang) {
  const t = lineKey(s.t); let i = -1, a = w.t;
  if (lang === 'zh') { if (!phraseTiles(s, lang).includes(w.t)) return null; i = t.indexOf(w.t); if (t.indexOf(w.t, i + 1) >= 0) return null; }
  else if (lang === 'ja') { i = t.indexOf(w.t); if (i < 0 || graphemesOf(w.t, lang).length < 2 || t.indexOf(w.t, i + 1) >= 0) return null; }
  else { const m = t.match(new RegExp(`(^|[^\\p{L}])(${w.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\p{L}])`, 'iu')); if (!m) return null; i = m.index + m[1].length; a = m[2]; }
  const before = t.slice(0, i), after = t.slice(i + a.length);
  return i >= 0 && /\p{L}/u.test(before + after) ? { before, a, after } : null;
}
const capLike = (x, a) => (/^\p{Lu}/u.test(a) ? x.charAt(0).toUpperCase() + x.slice(1) : x);
// Each way of asking about a word (w) or a phrase (s). null when there isn't enough to ask it well.
const ASK = {
  hearMean: (D, w) => { const o = others(D, w, 2); return o && { type: 'hear', q: `What does «${w.t}» mean?`, opts: [{ t: pm(w), ok: true }, ...o.map(x => ({ t: pm(x), ok: false }))] }; },
  hearPic: (D, w) => { const o = w.pic && others(D, w, 2, x => !!x.pic); return o && { type: 'hear', q: `Which one is «${w.t}»?`, opts: [{ t: w.pic, ok: true }, ...o.map(x => ({ t: x.pic, ok: false }))] }; },
  hearYes: (D, w, i, l, want) => { const yes = want != null ? want : (i + D.yesAt) % 2 === 0, x = yes ? w : (others(D, w, 1) || [])[0]; return x && { type: 'hearyes', t: w.t, rd: w.rd, show: pm(x), a: yes, mean: pm(w) }; },
  pickWord: (D, w) => { const o = others(D, w, 2); return o && { type: 'mcq', q: howSay(w.kind === 'w' && w.pic, w.en), opts: [{ t: `«${w.t}»`, ok: true }, ...o.map(x => ({ t: `«${x.t}»`, ok: false }))] }; },
  heard: (D, w) => { const o = others(D, w, 2); return o && { type: 'pair', q: 'Which one did you hear?', en: pm(w), opts: [{ t: `«${w.t}»`, ok: true }, ...o.map(x => ({ t: `«${x.t}»`, ok: false }))] }; },
  sound: (D, w) => { const o = others(D, w, 2); return o && { type: 'sound', q: `Which one means ${w.pic ? w.pic + ' ' : ''}“${w.en}”? Tap each one to hear it.`, opts: [{ t: w.t, ok: true }, ...o.map(x => ({ t: x.t, ok: false }))] }; },
  build: (D, w) => {
    const words = /\s/.test(w.t), parts = words ? w.t.split(/\s+/) : graphemesOf(w.t, D.lang), max = D.band === 'sprouts' ? 5 : 8;
    if (parts.length < 2 || parts.length > max) return null;
    const pool = shuf(D.near.filter(x => x.kind === 'w' && cardKey(x.t) !== cardKey(w.t)).flatMap(x => (words ? x.t.split(/\s+/) : graphemesOf(x.t, D.lang))), D.r);
    const extra = [...new Set(pool.filter(p => !parts.some(q => answerKey(q) === answerKey(p))))].slice(0, D.band === 'sprouts' ? 1 : 2);
    return { type: 'tiles', q: `Build it: ${pm(w)}`, a: words ? parts.join(' ') : w.t, extra };
  },
  write: (D, w, i, l) => {
    if (D.lang === 'es') return D.band === 'sprouts' ? null : { type: 'type', q: `Type it: ${pm(w)}`, a: w.t };
    const g = graphemesOf(w.t, D.lang);
    if (!CJK.test(w.t) || g.length > (D.lang === 'zh' ? 2 : 3) || l.tries.some(x => x.item.type === 'trace' && lineKey(String(x.item.q).replace(/[«»]/g, '')) === w.t)) return null;
    return { type: 'trace', q: `«${w.t}»`, en: w.en };
  },
  sayIt: (D, w) => ({ type: 'say', q: `«${w.t}»`, en: w.en, rd: w.rd }),
  letters: (D, w) => (D.lang === 'es' && /^\p{L}{3,10}$/u.test(w.t) ? { type: 'letters', q: `Spell it: ${pm(w)}`, a: w.t } : null),
  hearPhrase: (D, s) => { const o = others(D, s, 2); return o && { type: 'hear', q: `What does «${s.t}» mean?`, opts: [{ t: s.en, ok: true }, ...o.map(x => ({ t: x.en, ok: false }))] }; },
  buildPhrase: (D, s) => {
    const parts = phraseTiles(s, D.lang); if (parts.length < 2 || parts.length > (D.band === 'sprouts' ? 5 : 7)) return null;
    const x = shuf(D.near.filter(o => o.kind === 'w' && !/\s/.test(o.t) && !parts.some(p => answerKey(p) === answerKey(o.t))), D.r)[0];
    return { type: 'tiles', q: `Build it: ${s.en}`, a: parts.join(' '), extra: x ? [x.t] : [] };
  },
  gap: (D, s, i, l) => {
    for (const w of D.ws) {
      const g = gapOf(s, w, D.lang); if (!g) continue;
      const o = others(D, w, 2, x => !/\s/.test(x.t) === !/\s/.test(w.t) && !lineKey(s.t).toLowerCase().includes(x.t.toLowerCase())); if (!o) continue;
      return { type: 'lgap', en: s.en, before: g.before, after: g.after, a: g.a, full: lineKey(s.t), opts: [g.a, ...o.map(x => capLike(x.t, g.a))] };
    }
    return null;
  },
  pickPhrase: (D, s) => { const o = D.band !== 'sprouts' && others(D, s, 2); return o && { type: 'mcq', q: howSay('', s.en), opts: [{ t: `«${s.t}»`, ok: true }, ...o.map(x => ({ t: `«${x.t}»`, ok: false }))] }; },
};
// The extra steps for a lesson, given how many scored steps it already has
function drillSteps(kid, l, have) {
  const lang = l.lang, band = bandOf(kid), pack = Packs[`${l.tree}.${l.band}`], r = drillRng(`${kid.id}|${l.id}|${today()}`);
  const asW = w => ({ ...w, kind: 'w' }), asS = s => ({ t: s.t, en: s.en, rd: s.rd, pic: '💬', kind: 's' });
  const all = pack ? pack.units.flatMap(u => u.lessons) : [], at = all.indexOf(l), before = at > 0 ? all.slice(0, at).reverse() : [];
  const ws = l.words.map(asW), ss = l.says.map(asS), unitBefore = before.filter(x => x.unit === l.unit), older = before.filter(x => x.unit !== l.unit);
  const near = [...ws, ...ss, ...unitBefore.flatMap(x => [...x.words.map(asW), ...x.says.map(asS)])], idx = new Map(all.map((x, i) => [x.id, i]));
  const metOf = x => (idx.has(x.lesson) ? idx.get(x.lesson) < at : String(x.lesson).split('.')[1] < l.band), dict = Object.values(Dict.all(lang)).filter(x => !near.some(y => cardKey(y.t) === cardKey(x.t)));
  const D = { lang, band, r, ws, yesAt: Math.floor(r() * 2), near, met: dict.filter(metOf), rest: dict.filter(x => !metOf(x)) };
  const want = Math.max(0, (DRILL[band] || 45) - have);
  const group = (phase, prio, name, list, make) => ({ phase, prio, items: list.map((x, i) => make(x, i)).filter(Boolean).map(item => ({ kind: 'try', ex: '', item, gen: name })) });
  const ask = name => (x, i) => ASK[name](D, x, i, l);
  const matchOf = () => {
    const set = [...ws, ...unitBefore.flatMap(x => x.words.map(asW))].filter((x, i, a) => a.findIndex(y => cardKey(y.t) === cardKey(x.t) || sameSense(y.en, x.en)) === i).slice(0, 4);
    return set.length >= 3 ? [{ kind: 'play', item: { type: 'match', q: 'Match them', pairs: set.map(x => [`«${x.t}»`, pm(x)]) }, gen: 'match' }] : [];
  };
  // Memory flip: each word and its picture, face down
  const memOf = () => {
    const set = [...ws, ...unitBefore.flatMap(x => x.words.map(asW))].filter((x, i, a) => x.pic && a.findIndex(y => cardKey(y.t) === cardKey(x.t) || y.pic === x.pic || sameSense(y.en, x.en)) === i).slice(0, 4);
    return set.length >= 3 ? [{ kind: 'play', item: { type: 'memory', q: 'Memory flip: find each word’s picture', pairs: set.map(x => [`«${x.t}»`, x.pic]) }, gen: 'memory' }] : [];
  };
  // Listen and pop: five words said, each popped from bubbles of words that sound different
  const lpopOf = () => {
    const pool = [...ws, ...unitBefore.flatMap(x => x.words.map(asW))].filter((x, i, a) => a.findIndex(y => cardKey(y.t) === cardKey(x.t)) === i), rounds = [];
    for (let i = 0; i < 8 && rounds.length < 5 && pool.length >= 3; i++) { const w = pool[i % pool.length], o = others(D, w, 3); if (o) rounds.push({ t: w.t, en: pm(w), opts: [w.t, ...o.map(x => x.t)] }); }
    return rounds.length >= 3 ? [{ kind: 'play', item: { type: 'lpop', rounds }, gen: 'lpop' }] : [];
  };
  const core = [
    group(1, 1, 'hearMean', ws, ask('hearMean')), group(1, 2, 'hearYes', ws, ask('hearYes')),
    group(2, 1, 'pickWord', ws, ask('pickWord')), group(2, 2, 'heard', ws, ask('heard')), group(2, 3, 'sound', ws, ask('sound')), { phase: 2, prio: 1, items: matchOf() }, { phase: 2, prio: 2, items: memOf() }, { phase: 2, prio: 2, items: lpopOf() },
    group(3, 1, 'build', ws, ask('build')), group(3, 2, 'write', ws, ask('write')), group(3, 3, 'sayIt', ws, ask('sayIt')), group(3, 3, 'letters', ws, ask('letters')),
    group(4, 1, 'hearPhrase', ss, ask('hearPhrase')), group(4, 1, 'buildPhrase', ss, ask('buildPhrase')), group(4, 2, 'gap', ss, ask('gap')), group(4, 3, 'pickPhrase', ss, ask('pickPhrase')),
  ];
  // Too many for this band: drop the least important ways of asking first, a step at a time from the biggest group
  const count = () => core.reduce((n, g) => n + g.items.length, 0);
  for (let prio = 3; prio >= 1 && count() > want; prio--) while (count() > want) { const g = core.filter(x => x.prio === prio && x.items.length).sort((a, b) => b.items.length - a.items.length)[0]; if (!g) break; g.items.pop(); }
  // Too few: the new words again, then earlier words and phrases, nearest first
  const mix = [], room = () => want - count() - mix.length, add = (name, x, i, want2) => { if (room() <= 0) return; const item = ASK[name](D, x, i, l, want2); if (item) mix.push({ kind: 'try', ex: '', item, gen: `mix.${name}` }); };
  // The new words again: by picture only, then yes or no the other way round
  ws.forEach((w, i) => add('hearPic', w, i)); ws.forEach((w, i) => add('hearYes', w, i, (i + D.yesAt) % 2 !== 0));
  const fill = ls => { const w2 = ls.flatMap(x => x.words.map(asW)).filter(w => !/^\(/.test(w.en)), s2 = ls.flatMap(x => x.says.map(asS)); w2.forEach((w, i) => add(i % 2 ? 'pickWord' : 'hearMean', w, i)); s2.forEach((s, i) => add('hearPhrase', s, i)); w2.forEach((w, i) => add(i % 2 ? 'hearMean' : 'pickWord', w, i)); };
  fill(unitBefore); fill(older);
  return [...core.sort((a, b) => a.phase - b.phase).flatMap(g => g.items), ...mix];
}
function partOne(kid, l) { return bandOf(kid) === 'sprouts' && l.words.length > 3 && !passed(kid, l.id) && !(((prog(kid).lang || {})[l.lang] || {}).part || {})[l.id]; }
// New words wait until today's cards are done, and slow down when last week's reviews went badly.
function langGate(kid, l) {
  if (passed(kid, l.id)) return null;
  if (lcDue(kid, l.lang).length) return 'due';
  const [n, right] = lcWeek(kid, l.lang); if (n >= 10 && right / n < 0.8) return 'slow';
  return null;
}
function startLangLesson(kid, l, mode, quick) {
  const gate = quick ? null : langGate(kid, l);
  if (gate === 'due') { C.toast('First, your words to practise. Then the new lesson opens.'); return startLangReview(kid, l.lang); }
  if (gate === 'slow') { C.toast('Let’s practise the words you know before adding new ones.'); return startLangReview(kid, l.lang, true); }
  const started = ((((prog(kid).lang || {})[l.lang] || {}).part) || {})[l.id];
  if (mode === 'lesson' && !quick && !passed(kid, l.id) && !started && !langNewLeft(kid)) { C.track('growth.limit', { kind: 'lang', lang: l.lang }, kid.id); return C.toast(`That’s today’s new ${LANG[l.lang].name} lessons done! More open tomorrow. You can still play the ones you’ve done.`); }
  const part = partOne(kid, l) ? 1 : bandOf(kid) === 'sprouts' && l.words.length > 3 && !passed(kid, l.id) ? 2 : 0;
  Grow.run = { mode: part === 1 ? 'lpart' : mode, kid: kid.id, lesson: l, tree: l.tree, lang: l.lang, part, quick: !!quick, steps: langSteps(kid, l, part, quick), k: 0, res: [], t0: Date.now() };
  if (Grow.run.mode === 'lesson' && !quick) { Grow.run.steps = addRounds(Grow.run.steps); resumeRun(kid, Grow.run); }
  Grow.view = 'lesson'; Sound.go(); render();
}
function startLangReview(kid, lang, weak) {
  let cards = lcDue(kid, lang);
  if (!cards.length && weak) cards = Object.values(lcCards(kid, lang)).sort((a, b) => a.box - b.box || b.wrong - a.wrong).slice(0, 8);
  const steps = cards.slice(0, 10).map((c, i) => ({ kind: 'check', item: cardItem2(kid, lang, c.card), i, lcard: c.card, title: (Dict.get(lang, c.card.replace(/:[rp]$/, '')) || {}).en })).filter(s => s.item);
  if (!steps.length) { C.toast('No words to practise right now.'); return; }
  Grow.run = { mode: 'lreview', tree: lang, lang, scene: LANG[lang].scene, steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'review'; render();
}
function startLangStory(kid, unitId) {
  const [lang, band, un] = unitId.split('.'), u = packFor(lang, band).units.find(x => x.n === +un), st = u && u.story; if (!st) return;
  const steps = [{ kind: 'intro', text: `Story time: ${st.title}. Listen, and tap any line to hear it again.` }, ...st.lines.map((ln, i) => ({ kind: 'line', ln, i })), ...st.checks.map((item, i) => ({ kind: 'check', item, i, qid: `${st.id}#${i}` }))];
  Grow.run = { mode: 'lstory', tree: lang, lang, story: st, scene: LANG[lang].scene, steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'story'; Sound.go(); render();
}
// Placement: two questions from each unit of the kid's stage, in order. Units before the first one missed are
// counted as learned (no XP), and their words start at box 3.
function startPlacement(kid, lang) {
  const s = langStage(kid, lang), pack = packFor(lang, `s${s}`); if (!pack) return;
  const steps = [{ kind: 'intro', text: 'Show what you know! Answer what you can, and skip nothing: a wrong answer just means that’s where you start.' }];
  for (const u of pack.units) { const ls = u.lessons; [ls[0], ls[ls.length - 1]].filter(Boolean).forEach(l => { const item = l.checks[l.checks.length - 1]; if (item) steps.push({ kind: 'check', item, i: steps.length, unit: u.n }); }); }
  Grow.run = { mode: 'lplace', tree: lang, lang, scene: LANG[lang].scene, steps, k: 0, res: [], t0: Date.now() };
  Grow.view = 'review'; render();
}

/* ---------- Finishing language runs (called from finish() in 04-flow.js) ---------- */
function langFinish(kid, R, out, add, patch, right, total) {
  const g = prog(kid), l = R.lesson, lp = { ...((g.lang || {})[R.lang] || {}) };
  if (R.mode === 'lpart') { add('Part 1 done', XP.replay); lp.part = { ...(lp.part || {}), [l.id]: today() }; patch.lang = { [R.lang]: lp }; Object.assign(out, { part1: true, lesson: l }); return; }
  if (R.mode === 'lreview') { const day = dayInfo(kid), room = Math.max(0, XP.cardsPerDay - (day.cards || 0)), n = Math.min(right, room); add(`${n} word${n === 1 ? '' : 's'} remembered`, n * XP.card); patch.day.cards = (day.cards || 0) + total; lcFlush(); return; }
  if (R.mode === 'lstory') { if (!(lp.stories || {})[R.story.id] && right / Math.max(1, total) >= 0.5) { add('Story read', XP.story); lp.stories = { ...(lp.stories || {}), [R.story.id]: today() }; patch.lang = { [R.lang]: lp }; } return; }
  if (R.mode === 'lplace') {
    const s = langStage(kid, R.lang), pack = packFor(R.lang, `s${s}`), miss = R.steps.find((st, i) => st.kind === 'check' && R.res[i] && !R.res[i].ok);
    const from = miss ? miss.unit : pack.units.length + 1, done = {};
    for (const u of pack.units) if (u.n < from) for (const x of u.lessons) if (!passed(kid, x.id)) done[x.id] = { best: 0.8, stars: 1, n: 0, at: Date.now(), placed: true };
    if (Object.keys(done).length) patch.done = done;
    lp.placed = today(); patch.lang = { [R.lang]: lp }; Object.assign(out, { placedFrom: from });
    setTimeout(() => { for (const u of pack.units) if (u.n < from) u.lessons.forEach(x => lcLearn(kid, x, 3)); }, 0);
    C.track('lang.place', { lang: R.lang, stage: s, from }, kid.id);
  }
}
function langPassed(kid, l) { lcLearn(kid, l); lcFlush(); C.track('lang.lesson', { lang: l.lang, id: l.id }, kid.id); }

/* ---------- Steps a language lesson adds to viewRun ---------- */
function langBody(kid, step, R) {
  const lang = R.lang;
  if (step.kind === 'word') {
    const w = step.w, act = bandOf(kid) === 'sprouts' && w.act;
    say(act ? `Say it, and ${w.act}!` : 'Listen, then say it.');
    return `<div class="gw-card l-word"><span class="l-pic">${esc(w.pic)}</span><p class="l-target" lang="${lang}">${esc(w.t)}</p>${w.rd ? `<p class="l-rd">${esc(w.rd)}</p>` : ''}<p class="l-en">${esc(w.en)}</p>${act ? `<p class="l-act">👐 Do it: ${esc(w.act)}</p>` : ''}
      <div class="l-say-row"><button class="g-go ghost" data-l="hear">🔊 Hear it</button><button class="g-go ghost" data-l="slow">🐢 Slowly</button></div>${canHear(lang, w.t) ? '' : '<p class="l-norec">Recording on its way</p>'}<button class="g-go" data-g="next">Next</button></div>`;
  }
  if (step.kind === 'rule') { say(step.spot ? 'Can you see the pattern?' : 'Here’s how it works.'); return `<div class="gw-card learn l-rule"><h3>${step.spot ? '🔍 Spot the pattern' : '📏 How it works'}</h3><p>${esc(local(step.text))}</p><button class="g-go" data-g="next">Next</button></div>`; }
  if (step.kind === 'chant') { say('Chant it with me!'); return `<div class="gw-card l-chant"><h3>🥁 Chant it</h3>${step.lines.map((t, i) => `<p class="l-cl" data-cl="${i}" lang="${lang}">${esc(t)}</p>`).join('')}<div class="l-say-row"><button class="g-go ghost" data-l="chant">▶ Chant</button></div><button class="g-go" data-g="next">Next</button></div>`; }
  if (step.kind === 'line') {
    const ln = step.ln; say(ln.who ? `${ln.who}:` : '');
    return `<div class="gw-card l-line"><p class="l-who">${esc(ln.who)}</p><p class="l-target" lang="${lang}">${esc(ln.t)}</p>${ln.rd ? `<p class="l-rd">${esc(ln.rd)}</p>` : ''}<details class="l-mean"><summary>What does it mean?</summary><p>${esc(ln.en)}</p></details><div class="l-say-row"><button class="g-go ghost" data-l="hear">🔊 Again</button></div><button class="g-go" data-g="next">Next</button></div>`;
  }
  if (step.kind === 'part') { say('Great listening! That’s part 1.'); return `<div class="gw-card hook"><span class="gw-big">🌱</span><h2>Part 1 done!</h2><p>Part 2 has the rest of the words, a game and the questions. Do it now, or next time.</p><button class="g-go" data-g="finish">Finish part 1</button></div>`; }
  return '';
}
function langAfter(kid, step, R) {
  const lang = R.lang, text = step.kind === 'word' ? step.w.t : step.kind === 'line' ? step.ln.t : '';
  const voice = step.kind === 'line' ? Math.max(0, (R.who || (R.who = [])).indexOf(step.ln.who) < 0 ? R.who.push(step.ln.who) - 1 : R.who.indexOf(step.ln.who)) : 0;
  ui.querySelectorAll('[data-l]').forEach(b => { b.onclick = () => {
    const k = b.dataset.l; if (k === 'hear') speakLang(text, lang, { voice }); else if (k === 'slow') speakLang(text, lang, { slow: true });
    else if (k === 'chant') chant(step.lines, lang);
  }; });
  if (text) setTimeout(() => speakLang(text, lang, { voice }), 300);
  if (step.kind === 'chant') setTimeout(() => chant(step.lines, lang), 400);
}
// Each line on the beat: a tick, the line, a tick, the next line
async function chant(lines, lang) {
  for (let i = 0; i < lines.length; i++) {
    const el = ui.querySelector(`[data-cl="${i}"]`); if (!el) return;
    ui.querySelectorAll('.l-cl').forEach(x => x.classList.toggle('on', x === el)); Sound.step(i % 6);
    await speakLang(lines[i], lang); await sleep(250);
  }
  ui.querySelectorAll('.l-cl').forEach(x => x.classList.remove('on'));
}

/* ---------- A course's own screen: its stage, units, stories and words to practise ---------- */
function viewLang(kid, L) {
  const s = langStage(kid, L.id), key = `${L.id}.s${s}`, pack = Packs[key];
  if (!pack || !LC.cards[lcKey(kid, L.id)]) { ui.innerHTML = `${topbar(kid, L.name, 'Loading…')}<div class="gw-pad"><p class="gw-p">Getting your lessons ready…</p></div>`; Promise.all([loadLang(L.id, s), recIndex(L.id)]).then(() => { Dict.build(L.id); return lcLoad(kid, L.id); }).then(() => { if (Grow.open && Grow.view === 'lang') render(); }); return; }
  const st = treeStats(kid, L.id), nx = nextIn(kid, L.id), due = lcDue(kid, L.id).length, cards = Object.values(lcCards(kid, L.id)), known = cards.filter(c => c.card.endsWith(':r') && c.box >= 3).length;
  const g = prog(kid), lp = (g.lang || {})[L.id] || {}, band = bandOf(kid), next = shipped && shipped[`${L.id}.s${s + 1}`];
  say(due ? `${due} word${due === 1 ? '' : 's'} to practise first!` : nx ? `Next up: ${local(nx.title)}.` : 'You finished this stage!');
  const node = l => {
    const done = passed(kid, l.id), open = !done && available(kid, l), plan = !done && C.planLocked && C.planLocked(l), half = partOne(kid, l) ? '' : (lp.part || {})[l.id] && !done ? ' · part 2 next' : '';
    return `<button class="gw-node ${done ? 'done' : open ? 'open' : plan ? 'locked plus' : 'locked'} ${l === nx ? 'next' : ''}" data-g="${open || done ? 'lesson' : plan ? 'planLocked' : 'locked'}" data-id="${l.id}" aria-label="${esc(local(l.title))}${done ? ', done' : open ? ', ready' : plan ? ', comes with Chorecast Plus' : ', locked'}"><span class="gn-ic">${done ? '✅' : open ? esc(l.icon) : plan ? '✦' : '🔒'}</span><span class="gn-t">${esc(local(l.title))}${half}</span></button>`;
  };
  ui.innerHTML = `${topbar(kid, L.name, `${esc(L.levels[s - 1] || `Stage ${s}`)} · ${st.done} of ${st.total} lessons · ${known} words known`)}
    <div class="gw-pad gw-path l-path" style="--th:${L.hue}">
      <div class="gw-tiles">
        ${due ? `<button class="gw-tile" data-g="lpractice" data-id="${L.id}"><span class="gt-ic">🔁</span><span><b>${due} word${due === 1 ? '' : 's'} to practise</b><small>Do these first, then new words open</small></span></button>` : ''}
        ${nx && !due && !langNewLeft(kid) && !((lp.part || {})[nx.id]) ? `<div class="gw-tile l-wait"><span class="gt-ic">🌙</span><span><b>Today’s new lessons are done</b><small>“${esc(local(nx.title))}” opens tomorrow. New words stick better after a sleep.</small></span></div>` : ''}
        ${!st.done && !lp.placed ? `<button class="gw-tile" data-g="lplace" data-id="${L.id}"><span class="gt-ic">🧭</span><span><b>Already know some?</b><small>A quick check finds where to start</small></span></button>` : ''}
        ${band === 'makers' && nx && !passed(kid, nx.id) ? `<button class="gw-tile" data-g="lquick" data-id="${nx.id}"><span class="gt-ic">⚡</span><span><b>Know “${esc(local(nx.title))}”?</b><small>Pass its questions to skip ahead</small></span></button>` : ''}
        ${st.total && st.done === st.total && next ? `<button class="gw-tile" data-g="lnext" data-id="${L.id}"><span class="gt-ic">🚀</span><span><b>Start ${esc(L.levels[s] || `stage ${s + 1}`)}</b><small>You finished ${esc(L.levels[s - 1] || `stage ${s}`)}!</small></span></button>` : ''}
      </div>
      ${pack.units.map(u => {
        const allDone = u.lessons.length && u.lessons.every(l => passed(kid, l.id)), uc = (g.units || {})[u.id] || {}, sd = u.story && (lp.stories || {})[u.story.id];
        return `<section class="gw-unit"><header><span class="gu-n">Unit ${u.n}</span><b>${esc(local(u.title))}</b><small>${esc(local(u.goal))}</small></header><div class="gw-nodes">${u.lessons.map(node).join('')}
          ${u.story ? `<button class="gw-node story ${sd ? 'done' : allDone ? 'open' : 'locked'}" data-g="${allDone ? 'lstory' : 'locked'}" data-id="${u.id}"><span class="gn-ic">${sd ? '✅' : '📖'}</span><span class="gn-t">Story: ${esc(u.story.title)}</span></button>` : ''}
          <button class="gw-node boss ${uc.best >= 0.8 ? 'done gold' : allDone ? 'open' : 'locked'}" data-g="${allDone ? 'challenge' : 'locked'}" data-id="${u.id}"><span class="gn-ic">${uc.best >= 0.8 ? '👑' : allDone ? '🏆' : '🔒'}</span><span class="gn-t">Unit challenge${allDone ? ` · ${XP.challenge} XP` : ''}</span></button></div></section>`;
      }).join('')}
      ${langSet(kid)[L.id] !== true && prog(kid).langPick === L.id ? `<p class="gw-p l-swap">Want to learn a different language? <button class="gw-link" data-g="lswap" data-id="${L.id}">Pick another</button> Your ${esc(L.name)} stays saved.</p>` : ''}
    </div>`;
}
// A kid with no language yet picks one: tap a course to hear it, then start it
function langPicker(kid) {
  const can = langPickable(kid); if (!can.length) return '';
  const t = Grow.langTry && can.find(L => L.id === Grow.langTry);
  return `<div class="gw-ones l-pick">${can.map(L => `<button class="gw-one open ${t === L ? 'on' : ''}" style="--th:${L.hue}" data-g="ltry" data-id="${L.id}" aria-pressed="${t === L}"><span class="g1-ic">${L.icon}</span><span class="g1-t"><b>${esc(L.name)}</b><small lang="${L.id}">${esc((LANG_HI[L.id] || [''])[0])}</small><small>${esc(L.blurb)}</small></span></button>`).join('')}</div>
    ${t ? `<div class="l-pick-go"><button class="g-go" data-g="lstart" data-id="${t.id}">Start ${esc(t.name)}</button><button class="gw-link" data-g="ltry" data-id="${t.id}">🔊 Hear it again</button></div>` : '<p class="gw-p">Tap a language to hear it. You can swap later.</p>'}`;
}
// The Languages section of the Character Growth home screen
function langDoors(kid) {
  const ls = kidLangs(kid);
  if (!ls.length) { const p = langPicker(kid); return p ? `<h2 class="gw-h2">Pick a language to learn</h2>${p}` : ''; }
  return `<h2 class="gw-h2">Languages</h2><div class="gw-ones">${ls.map(L => {
    const s = langStage(kid, L.id), st = treeStats(kid, L.id), due = LC.cards[lcKey(kid, L.id)] ? lcDue(kid, L.id).length : 0;
    return `<button class="gw-one open" style="--th:${L.hue}" data-g="lang" data-id="${L.id}"><span class="g1-ic">${L.icon}</span><span class="g1-t"><b>${esc(L.name)}</b><small>${esc(L.levels[s - 1] || '')}</small><span class="g1-bar"><i style="width:${st.total ? st.done / st.total * 100 : 0}%"></i></span><small>${st.total ? `${st.done} of ${st.total} lessons` : 'Tap to start'}${due ? ` · ${due} word${due === 1 ? '' : 's'} to practise` : ''}</small></span></button>`;
  }).join('')}</div>`;
}
// After index.json, which says which courses are built
async function loadKidLangs(kid) { await loadIndex(); await Promise.all(kidLangs(kid).map(async L => { await Promise.all([loadLang(L.id, langStage(kid, L.id)), recIndex(L.id)]); Dict.build(L.id); await lcLoad(kid, L.id); })); }

const LANG_CLICK = {
  lang: (kid, id) => { Grow.tree = id; Grow.view = 'lang'; Sound.tap(); render(); },
  lpractice: (kid, id) => startLangReview(kid, id),
  lplace: (kid, id) => startPlacement(kid, id),
  lstory: (kid, id) => startLangStory(kid, id),
  lquick: (kid, id) => { const l = lessonById(id); if (l) startLangLesson(kid, l, 'lesson', true); },
  lnext: (kid, id) => { const s = langStage(kid, id), lp = (prog(kid).lang || {})[id] || {}; save(kid, { lang: { [id]: { ...lp, s: s + 1, placed: null } } }); C.track('lang.stage', { lang: id, stage: s + 1 }, kid.id); loadLang(id, s + 1).then(() => { Dict.build(id); render(); }); },
  // Picking: the first tap says hello in the language, the Start button keeps it
  ltry: (kid, id) => { if (!LANG[id]) return; Grow.langTry = id; Sound.tap(); render(); speakLang((LANG_HI[id] || [''])[0], id).then(ok => { if (!ok) C.toast(`${LANG_HI[id][0]} means “${LANG_HI[id][1]}”. This device has no ${LANG[id].name} voice yet: a grown-up can add one.`); }); },
  lstart: (kid, id) => {
    if (!langPickable(kid).some(L => L.id === id)) return;
    const was = prog(kid).langPick || null; Grow.langTry = null; save(kid, { langPick: id }); C.track('lang.pick', { lang: id, was }, kid.id); Sound.coin();
    Grow.tree = id; Grow.view = 'lang'; loadKidLangs(kid).then(() => C.scheduleRender()); render();
  },
  lswap: (kid, id) => { save(kid, { langPick: null }); C.track('lang.pick', { lang: null, was: id }, kid.id); Grow.tree = null; Grow.view = 'hub'; Sound.tap(); render(); },
};

/* ---------- Grown-ups: languages for each kid, their progress, and (for content editors) the recording studio ---------- */
function langParent(kid, sw) {
  const ls = langOn(); if (!ls.length) return '';
  const mine = langSet(kid), P = Grow.parent, learning = kidLangs(kid), pick = prog(kid).langPick;
  ls.forEach(L => { if (learning.includes(L) && !LC.cards[lcKey(kid, L.id)]) loadKidLangs(kid).then(() => C.scheduleRender()); });
  const rows = ls.map(L => {
    const on = learning.includes(L), v = mine[L.id], s =langStage(kid, L.id), cards = Object.values(lcCards(kid, L.id)), r = cards.filter(c => c.card.endsWith(':r')), st = treeStats(kid, L.id), stats = LC.stats[lcKey(kid, L.id)] || {};
    const strong = r.filter(c => c.box >= 4).length, due = on && LC.cards[lcKey(kid, L.id)] ? lcDue(kid, L.id).length : 0, month = stats.month || {}, weak = r.filter(c => c.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.box - b.box).slice(0, 6).map(c => Dict.get(L.id, c.card.replace(/:r$/, ''))).filter(Boolean);
    const stages = L.levels.map((n, i) => [i + 1, n]).filter(([i]) => shipped && shipped[`${L.id}.s${i}`]);
    const who = v === true ? 'On' : v === false ? `Off: ${esc(kid.name)} can’t pick it` : pick === L.id ? `${esc(kid.name)} picked this` : pick ? `${esc(kid.name)} picked another` : `${esc(kid.name)} can pick it`;
    const chip = (val, label) => `<button class="chip-p ${(val === 'kid' ? v !== true && v !== false : v === val) ? 'on' : ''}" data-act="gpLangSet" data-id="${L.id}" data-v="${val}">${label}</button>`;
    return `<div class="row wrap"><span class="pg-ti" style="--th:${L.hue}">${L.icon}</span><div class="row-main"><b>${esc(L.name)}</b><small>${who} · ${on ? `${esc(L.levels[s - 1] || '')} · ${st.done} of ${st.total} lessons · ${r.length} words met, ${strong} strong · ${due} to practise today${month.n ? ` · ${Math.round(month.right / month.n * 100)}% remembered after a month` : ''}` : esc(L.blurb)}</small></div><div class="chips" role="group" aria-label="${esc(L.name)} for ${esc(kid.name)}">${chip('kid', `${esc(kid.name)}’s choice`)}${chip(true, 'On')}${chip(false, 'Off')}</div></div>
      ${on && stages.length > 1 ? `<div class="row wrap"><div class="row-main"><small>Start ${esc(kid.name)} at</small></div><div class="chips">${stages.map(([i, n]) => `<button class="chip-p ${s === i ? 'on' : ''}" data-act="gpLangStage" data-id="${L.id}" data-v="${i}">${esc(n)}</button>`).join('')}</div></div>` : ''}
      ${on && weak.length ? `<div class="row"><div class="row-main"><b>Words to practise together</b><small>${weak.map(w => `${esc(w.t)} (${esc(w.en)})`).join(' · ')}</small></div></div>` : ''}`;
  }).join('');
  const editor = Store.mode === 'server' && !!C.acct()?.me?.contentEditor, voiceless = ls.filter(L => !L.voices);
  return `<h3 class="pgroup-t">Languages<small>Each course goes from first words to speaking on their own. Lessons give ${esc(kid.name)} the words and grammar; talking together at home is what makes it fluent, so try the “take it home” task with them.</small></h3>
    <div class="group">${rows}
      <div class="row"><div class="row-main"><b>Speaking practice</b><small>Kids hear a word, record themselves and hear both. Recordings stay on this device for that moment only and are never saved or sent.</small></div>${sw('gpSpeak', speakOn(), 'Speaking practice')}</div>
      ${editor && voiceless.length ? voiceless.map(L => `<div class="row"><div class="row-main"><b>Record ${esc(L.name)}</b><small>${esc(L.name)} has no device voice, so every word and line is recorded by a fluent speaker before it reaches kids.</small></div><button class="pbtn" data-act="gpRec" data-id="${L.id}">Recording studio</button></div>`).join('') : ''}
    </div>${P.rec ? recStudio(P.rec) : ''}`;
}
// The recording studio: every line of a stage in order. Record, listen, redo, keep. Kept recordings upload at once.
function recStudio(rs) {
  const L = LANG[rs.lang]; if (!rs.lines) { rs.lines = {}; fetchText(`growth/${rs.lang}.lines.json?v=${contentVer}`).then(t => { rs.lines = JSON.parse(t); }).catch(() => {}).then(() => { Rec.asked[rs.lang] = null; return recIndex(rs.lang); }).then(() => C.scheduleRender()); }
  const stages = Object.keys(rs.lines), list = rs.lines[`s${rs.stage}`] || [], have = Rec.index[rs.lang] || {}, todo = list.filter(k => !have[k]).length, page = list.slice(rs.from || 0, (rs.from || 0) + 25);
  return `<h3 class="pgroup-t">${esc(L.name)} recording studio<small>${list.length - todo} of ${list.length} lines recorded for ${esc(L.levels[rs.stage - 1] || '')}. Speak clearly and naturally, close to the microphone, in a quiet room.</small></h3>
    <div class="group"><div class="row wrap"><div class="chips">${stages.map(s => `<button class="chip-p ${`s${rs.stage}` === s ? 'on' : ''}" data-act="gpRecStage" data-v="${s.slice(1)}">${esc(L.levels[+s.slice(1) - 1] || s)}</button>`).join('')}<button class="chip-p" data-act="gpRecTodo">Next unrecorded</button><button class="chip-p" data-act="gpRecClose">Close</button></div></div>
      ${page.map(k => `<div class="row"><div class="row-main"><b lang="${rs.lang}">${esc(k)}</b><small>${have[k] ? '✅ Recorded' : rs.take && rs.take.k === k ? '🎙️ New take, not kept yet' : 'Not recorded yet'}</small></div>
        ${have[k] ? `<button class="pbtn" data-act="gpRecPlay" data-k="${esc(k)}">▶</button>` : ''}<button class="pbtn ${rs.on === k ? 'danger' : ''}" data-act="gpRecGo" data-k="${esc(k)}">${rs.on === k ? '⏹ Stop' : have[k] ? 'Redo' : '● Record'}</button>
        ${rs.take && rs.take.k === k ? `<button class="pbtn" data-act="gpRecHear">Hear take</button><button class="pbtn primary" data-act="gpRecKeep">Keep</button>` : ''}</div>`).join('')}
      <div class="row"><div class="row-main"><small>Lines ${(rs.from || 0) + 1} to ${Math.min(list.length, (rs.from || 0) + 25)} of ${list.length}</small></div><button class="pbtn" data-act="gpRecPage" data-d="-25" ${(rs.from || 0) ? '' : 'disabled'}>Back</button><button class="pbtn" data-act="gpRecPage" data-d="25" ${(rs.from || 0) + 25 < list.length ? '' : 'disabled'}>More</button></div></div>`;
}
const recMime = () => ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
Object.assign(C.ACT, {
  // A course for one kid: the kid's choice (unset), on, or off
  gpLangSet: a => {
    const kid = Store.kids[Grow.parent.kidId], v = a.dataset.v === 'true' ? true : a.dataset.v === 'false' ? false : null;
    setG({ langs: { [kid.id]: { [a.dataset.id]: v } } }); C.track('lang.setting', { lang: a.dataset.id, on: v }, kid.id);
    loadKidLangs(kid).then(() => C.scheduleRender());
  },
  gpLangStage: a => { const kid = Store.kids[Grow.parent.kidId], lp = (prog(kid).lang || {})[a.dataset.id] || {}; save(kid, { lang: { [a.dataset.id]: { ...lp, s: +a.dataset.v, placed: null } } }); loadKidLangs(kid).then(() => C.scheduleRender()); },
  gpSpeak: () => setG({ speak: !speakOn() }),
  gpRec: a => { Grow.parent.rec = { lang: a.dataset.id, stage: 1, from: 0 }; C.render(); },
  gpRecClose: () => { const r = Grow.parent.rec; if (r && r.rec) try { r.rec.stop(); } catch (e) {} Grow.parent.rec = null; C.render(); },
  gpRecStage: a => { Object.assign(Grow.parent.rec, { stage: +a.dataset.v, from: 0, take: null }); C.render(); },
  gpRecPage: a => { const r = Grow.parent.rec; r.from = Math.max(0, (r.from || 0) + +a.dataset.d); C.render(); },
  gpRecTodo: () => { const r = Grow.parent.rec, list = r.lines[`s${r.stage}`] || [], have = Rec.index[r.lang] || {}, i = list.findIndex(k => !have[k]); if (i >= 0) r.from = Math.floor(i / 25) * 25; C.render(); },
  gpRecPlay: a => speakLang(a.dataset.k, Grow.parent.rec.lang),
  gpRecGo: async a => {
    const r = Grow.parent.rec, k = a.dataset.k;
    if (r.on === k && r.rec) { r.rec.stop(); return; }
    try {
      r.stream = r.stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = recMime(), chunks = []; r.rec = new MediaRecorder(r.stream, mime ? { mimeType: mime } : {}); r.on = k;
      r.rec.ondataavailable = e => chunks.push(e.data);
      r.rec.onstop = () => { r.take = { k, blob: new Blob(chunks, { type: r.rec.mimeType || mime || 'audio/webm' }) }; r.on = null; C.render(); new Audio(URL.createObjectURL(r.take.blob)).play().catch(() => {}); };
      r.rec.start(); C.render();
    } catch (e) { C.toast('The microphone isn’t available here.'); }
  },
  gpRecHear: () => { const t = Grow.parent.rec.take; if (t) new Audio(URL.createObjectURL(t.blob)).play().catch(() => {}); },
  gpRecKeep: async () => {
    const r = Grow.parent.rec, t = r.take; if (!t) return;
    try {
      const res = await fetch(apiPath(`/api/lang/audio/${r.lang}/${encodeURIComponent(t.k)}`), { method: 'POST', credentials: 'include', headers: { 'content-type': t.blob.type.split(';')[0] }, body: t.blob });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Couldn’t save that take.');
      r.take = null; Rec.asked[r.lang] = null; await recIndex(r.lang); C.toast('Kept.');
    } catch (e) { C.toast(e.message); }
    C.render();
  },
});

/* ---------- Styles ---------- */
const LCSS = `
.lw{all:unset;cursor:pointer;position:relative;font-weight:900;color:color-mix(in srgb,var(--gh) 70%,#0D1530);border-bottom:2px dotted currentColor}
button .lw,.g-card .lw{cursor:inherit;border:0;color:inherit}
.lw-hint{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:4px;white-space:nowrap;padding:4px 8px;border-radius:8px;background:#0D1530;color:#fff;font:700 calc(12px*var(--ts)) var(--f-round);z-index:2}
.l-word,.l-line,.l-chant,.l-say{text-align:center}
.l-pic{display:block;font-size:calc(64px*var(--ts));line-height:1.1}
.gw-card .l-target{margin:6px 0 2px;font:900 calc(32px*var(--ts))/1.2 var(--f-round);color:color-mix(in srgb,var(--gh) 70%,#0D1530)}
.gw-card .l-en{margin:0;font:700 calc(17px*var(--ts)) var(--f-round);color:#5A6380}
.gw-card .l-act{margin:8px 0 0;font:800 calc(15px*var(--ts)) var(--f-round)}
.l-say-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:10px}
.l-say-row .g-go{flex:0 1 auto;width:auto;padding-inline:16px}
.gw-card .l-say-t{font:900 calc(28px*var(--ts))/1.25 var(--f-round);margin:4px 0}
.gw-card .l-say-en{margin:0;color:#5A6380;font:700 calc(15px*var(--ts)) var(--f-round)}
.gw-card .l-say-tip,.gw-card .l-norec,.l-norec{color:#5A6380;font:700 calc(13px*var(--ts)) var(--f-round);margin:8px 0 0}
.l-rec.on{background:#E5484D}
.gw-card .l-who{margin:0;font:900 calc(13px*var(--ts)) var(--f-round);text-transform:uppercase;letter-spacing:.06em;color:#5A6380}
.l-mean{margin-top:8px;font:700 calc(15px*var(--ts)) var(--f-round)}
.l-mean summary{cursor:pointer;color:#5A6380}
.gw-card .l-cl{font:900 calc(22px*var(--ts))/1.3 var(--f-round);margin:6px 0;opacity:.55;transition:opacity .2s,transform .2s}
.l-cl.on{opacity:1;transform:scale(1.06)}
.l-hear{all:unset;cursor:pointer;display:inline-grid;place-items:center;width:1.8em;height:1.8em;border-radius:50%;background:color-mix(in srgb,var(--gh) 18%,#fff);vertical-align:middle}
.g-card.pic span{font-size:calc(34px*var(--ts))}
.l-type{display:flex;flex-direction:column;gap:10px}
.l-in{font:800 calc(22px*var(--ts)) var(--f-round);padding:12px 14px;border-radius:14px;border:2px solid #DCE1EE;color:#0D1530;background:#fff}
.l-in:focus{outline:none;border-color:var(--gh)}
.l-strip{display:flex;flex-wrap:wrap;gap:6px}
.l-key{min-width:42px;min-height:42px;border-radius:12px;border:0;background:#F2F4FA;font:800 calc(18px*var(--ts)) var(--f-round);color:#0D1530}
.gw-card .l-spell{margin:0;color:#1F8A4C;font:800 calc(14px*var(--ts)) var(--f-round)}
.l-built{min-height:56px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border-radius:14px;border:2px dashed #DCE1EE;margin-bottom:10px}
.l-built.right{border-color:#30C25A}.l-built.wrong{border-color:#E5484D}
.l-built-ph{color:#9AA3B5;font:700 calc(14px*var(--ts)) var(--f-round)}
.gw-card .l-rd{margin:2px 0 0;font:700 calc(16px*var(--ts)) var(--f-round);color:#5A6380;letter-spacing:.02em}
.gw ruby rt{font-size:.55em;font-weight:700;color:inherit;opacity:.72}
.gw ruby+ruby{margin-left:.18em}
.l-sound .g-card{text-align:center;display:grid;place-items:center;gap:2px}
.l-sound .g-card.sel{box-shadow:inset 0 0 0 3px var(--gh);transform:translateY(-3px)}
.l-sound .g-card small{font:700 calc(14px*var(--ts)) var(--f-round);color:#5A6380}
.l-sound+.g-go{margin-top:12px}
.gw-card .l-gap{font:900 calc(26px*var(--ts))/1.6 var(--f-round);text-align:center;margin:4px 0 14px}
.l-yn{min-height:120px;cursor:default}
.l-trace{display:grid;place-items:center}
.l-trace canvas{width:min(76vw,320px);height:min(76vw,320px);touch-action:none;border-radius:20px;background:#F7F8FC;border:2px solid #DCE1EE}
`;
const lstyle = document.createElement('style'); lstyle.id = 'growth-lang-css'; lstyle.textContent = LCSS; document.head.appendChild(lstyle);
