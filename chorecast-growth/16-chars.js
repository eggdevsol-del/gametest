/* ---------- Characters, taught before a kid builds words from them ----------
   Japanese kana are sounds: each one is shown with its sound, and with how it works in the word (は said "wa", a small
   っ, a long vowel, a small ゃ joining the kana before it). Mandarin characters each have a sound and a meaning. Right
   after a word is introduced, a card shows the characters in it that the kid hasn't met in an earlier lesson. The
   lesson then asks about those characters (what sound, which one, what it means) before any "Build it" step, and
   build tiles show each character's sound underneath while rōmaji or pinyin is on (Sprouts, and stages 1 and 2).
   Mandarin meanings are short, kid-sized glosses for stage 1's characters, checked by Claude; a fluent speaker
   reviews them with the course (see zh.map.md). */

// Hiragana, with the matching katakana worked out from it (each katakana sits 0x60 after its hiragana)
const KANA = (() => {
  const m = {};
  for (const x of ('あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno ' +
    'はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya ゆyu よyo らra りri るru れre ろro わwa をo んn がga ぎgi ぐgu げge ごgo ' +
    'ざza じji ずzu ぜze ぞzo だda ぢji づzu でde どdo ばba びbi ぶbu べbe ぼbo ぱpa ぴpi ぷpu ぺpe ぽpo ゃya ゅyu ょyo ぁa ぃi ぅu ぇe ぉo ゔvu').split(' ')) {
    const c = x[0], s = x.slice(1); m[c] = s; m[String.fromCharCode(c.charCodeAt(0) + 0x60)] = s;
  }
  return m;
})();
const SMALL_KANA = 'ゃゅょぁぃぅぇぉャュョァィゥェォ', STOP_KANA = 'っッ';

// Mandarin, stage 1: each character's usual sound and a short meaning. Characters that only work as part of a longer
// word say which word.
const HAN = Object.fromEntries(`你 nǐ you|好 hǎo good|小 xiǎo small|明 míng bright|丽 lì beautiful|早 zǎo early|上 shàng up, on|晚 wǎn evening, late|安 ān calm, safe|老 lǎo old|师 shī teacher|再 zài again|见 jiàn see|天 tiān day, sky|请 qǐng please|谢 xiè thank|不 bù not, no|客 kè guest|气 qì air|是 shì is, yes|的 de a linking word (whose, what kind)|对 duì right, correct|起 qǐ rise, get up|没 méi not, don't have|关 guān close, shut|系 xì link, tie|们 men more than one person|大 dà big|家 jiā home, family|朋 péng friend|友 yǒu friend|我 wǒ I, me|叫 jiào call, be called|名 míng name|字 zì written character, word|他 tā he, him|她 tā she, her|谁 shéi who|人 rén person|新 xīn new|西 xī west|兰 lán orchid (a flower)|澳 ào bay|利 lì benefit, sharp|亚 yà used in place names, like Asia|中 zhōng middle|国 guó country|男 nán boy, man|孩 hái child|女 nǚ girl, woman|学 xué learn, study|校 xiào school|生 shēng life, be born|这 zhè this|很 hěn very|高 gāo tall, high|兴 xìng a happy mood|认 rèn recognise|识 shí know|妈 mā mum|马 mǎ horse|吗 ma turns a sentence into a question|难 nán hard, difficult|过 guò pass, go past|累 lèi tired|害 hài harm|怕 pà afraid|无 wú without, none|聊 liáo chat|饿 è hungry|渴 kě thirsty|冷 lěng cold|热 rè hot|病 bìng sick|疼 téng sore, it hurts|有 yǒu have|点 diǎn dot, a little|儿 ér adds an “r” sound to the word before|事 shì thing, matter|太 tài too, very|棒 bàng great|了 le shows something has happened|漂 piào part of 漂亮 (pretty)|亮 liàng bright, shiny|做 zuò do, make|得 de links an action to how well it's done|一 yī one|二 èr two|三 sān three|四 sì four|五 wǔ five|六 liù six|七 qī seven|八 bā eight|九 jiǔ nine|十 shí ten|几 jǐ how many|个 gè a counting word for things|岁 suì years old|两 liǎng two (of something)|百 bǎi hundred|钱 qián money|块 kuài piece, chunk|毛 máo hair, fur|红 hóng red|色 sè colour|黄 huáng yellow|绿 lǜ green|蓝 lán blue|白 bái white|黑 hēi black|橙 chéng orange|粉 fěn powder, pink|棕 zōng brown|颜 yán face, colour|紫 zǐ purple|灰 huī grey, ash|房 fáng house, room|子 zi often ends a naming word|门 mén door|屋 wū house|顶 dǐng top|窗 chuāng window|户 hù door, home|篱 lí fence|笆 ba part of 篱笆 (fence)|花 huā flower|阳 yáng sun|云 yún cloud|空 kōng sky, empty|彩 cǎi colourful|虹 hóng rainbow|狗 gǒu dog|猫 māo cat|鸟 niǎo bird|鱼 yú fish|牛 niú cow|羊 yáng sheep, goat|猪 zhū pig|鸡 jī chicken|兔 tù rabbit|熊 xióng bear|头 tóu head|鹰 yīng eagle|蝴 hú part of 蝴蝶 (butterfly)|蝶 dié butterfly|那 nà that|只 zhī a counting word for animals|岛 dǎo island|海 hǎi sea|陆 lù land|地 dì ground, earth|在 zài at, in|哪 nǎ which, where|面 miàn side, face|下 xià down, under|里 lǐ inside|爸 bà dad|爷 yé grandad|奶 nǎi milk, nana|宝 bǎo treasure|哥 gē older brother|弟 dì younger brother|姐 jiě older sister|妹 mèi younger sister|帮 bāng help|忙 máng busy|吃 chī eat|喝 hē drink|水 shuǐ water|苹 píng part of 苹果 (apple)|果 guǒ fruit|香 xiāng nice-smelling|蕉 jiāo part of 香蕉 (banana)|包 bāo bag, bun|蛋 dàn egg|米 mǐ rice|饭 fàn cooked rice, a meal|土 tǔ soil|豆 dòu bean|胡 hú part of 胡萝卜 (carrot)|萝 luó part of 萝卜 (radish)|卜 bo part of 萝卜 (radish)|条 tiáo a long, thin strip|要 yào want|给 gěi give|商 shāng trade|店 diàn shop|买 mǎi buy|卖 mài sell|饱 bǎo full (after eating)|来 lái come|星 xīng star|期 qī a stretch of time|今 jīn now, this|昨 zuó yesterday|零 líng zero|午 wǔ noon|雨 yǔ rain|晴 qíng sunny|刮 guā blow (wind)|风 fēng wind|放 fàng put, let go|假 jià holiday|存 cún save, keep|目 mù eye|标 biāo mark, target|自 zì self|行 xíng go, walk|车 chē car, vehicle|立 lì stand|坐 zuò sit|看 kàn look|听 tīng listen|说 shuō speak, say|洗 xǐ wash|碗 wǎn bowl|手 shǒu hand|喂 wèi feed|收 shōu collect, put away|拾 shí pick up|间 jiān room, between|铺 pū spread out|床 chuáng bed|扫 sǎo sweep|倒 dào pour, tip out|垃 lā part of 垃圾 (rubbish)|圾 jī part of 垃圾 (rubbish)|完 wán finish|都 dōu all|真 zhēn really, true`
  .split('|').map(x => { const [c, s, ...m] = x.split(' '); return [c, [s, m.join(' ')]]; }));

const toneless = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const isHan = c => /\p{Script=Han}/u.test(c), isKana = c => /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(c);

// Each Mandarin character's sound in this word, cut from the word's pinyin (so 一 in 一百 is yì, and 儿 is just "r");
// the table's sound if the pinyin doesn't line up
function hanReadings(t, rd) {
  const chars = [...t].filter(isHan), table = chars.map(c => (HAN[c] || [''])[0]), src = String(rd || '').normalize('NFD'), letters = [];
  for (let i = 0; i < src.length; i++) if (!/\p{M}|[\s'’\-·,.!?]/u.test(src[i])) letters.push([src[i].toLowerCase(), i]);
  const flat = letters.map(x => x[0]).join(''), out = [];
  let p = 0;
  for (const c of chars) {
    let want = toneless((HAN[c] || [''])[0]);
    if (c === '儿' && flat.slice(p, p + 2) !== 'er' && flat[p] === 'r') want = 'r';
    if (!want || flat.slice(p, p + want.length) !== want) return table;
    const a = letters[p][1], b = p + want.length < letters.length ? letters[p + want.length][1] : src.length;
    out.push(src.slice(a, b).replace(/[\s'’\-·,.!?]+$/u, '').normalize('NFC').toLowerCase()); p += want.length;
  }
  return p === letters.length ? out : table;
}

// The characters in a word, as units: { c, s (sound), m (meaning, Mandarin), note (how it works here) }
function charUnits(w, lang) {
  const t = String(w.t || ''), rd = toneless(w.rd || '');
  if (lang === 'zh') {
    const rs = hanReadings(t, w.rd);
    return [...t].filter(isHan).map((c, i) => {
      const [s0, m] = HAN[c] || ['', ''], s = rs[i] || s0;
      return { c, s, m, note: s && s0 && s !== s0 && c !== '儿' ? `${c} is usually ${s0}. In ${t}, it's said ${s}.` : c === '儿' && s === 'r' ? `儿 here just adds an “r” to the sound before it.` : '' };
    });
  }
  if (lang !== 'ja') return [];
  const us = [];
  for (const c of t) {
    if (!isKana(c)) continue;
    const prev = us[us.length - 1];
    if (SMALL_KANA.includes(c) && prev && prev.s) {
      const v = KANA[c], base = prev.s, joined = /^y/.test(v) ? (/^(sh|ch|j)i$/.test(base) ? base.slice(0, -1) + v.slice(1) : base.slice(0, -1) + v) : (base === 'u' ? 'w' : base.replace(/[aiueo]$/, '')) + v;
      us[us.length - 1] = { c: prev.c + c, s: joined, note: `The small ${c} joins ${prev.c} to make one sound: ${joined}.` };
      continue;
    }
    if (STOP_KANA.includes(c)) { us.push({ c, s: '', note: `A small ${c} is a tiny stop. The sound after it is said a little harder.` }); continue; }
    if (c === 'ー') { us.push({ c, s: '', note: 'ー makes the sound before it longer.' }); continue; }
    us.push({ c, s: KANA[c] || '' });
  }
  // How a kana works in this word: は said "wa", を said "o", and a vowel that makes the one before it long
  us.forEach((u, i) => {
    const prev = us[i - 1];
    if ((u.c === 'は') && i === us.length - 1 && /wa$/.test(rd)) { u.note = 'は usually says “ha”. At the end of a greeting like this one, it says “wa”.'; u.s = 'wa'; }
    else if (u.c === 'を') u.note = 'を says “o”. It goes after the thing you do something to.';
    else if (prev && prev.s && /^[うおウオ]$/.test(u.c) && /o$/.test(prev.s) && /ō/.test(String(w.rd))) u.note = `${u.c} after an “o” sound makes it long: ō.`;
    else if (prev && prev.s && /^[うウ]$/.test(u.c) && /u$/.test(prev.s) && /ū/.test(String(w.rd))) u.note = `${u.c} after a “u” sound makes it long: ū.`;
  });
  return us;
}
// One tile's sound, for build tiles: a kana, a small kana, or a Mandarin character (its sound in the answer if known)
function tileSound(t, lang, inWord) {
  if (lang === 'ja') return SMALL_KANA.includes(t) ? `small ${KANA[t]}` : STOP_KANA.includes(t) ? 'stop' : t === 'ー' ? 'long' : KANA[t] || '';
  if (lang === 'zh') return (inWord && inWord.get(t)) || (HAN[t] || [''])[0];
  return '';
}
// Every character a kid has been taught before lesson l: the words of the lessons before it in its stage
function charsBefore(l, lang) {
  const pack = Packs[`${l.tree}.${l.band}`], all = pack ? pack.units.flatMap(u => u.lessons) : [], at = all.indexOf(l), seen = new Set();
  (at > 0 ? all.slice(0, at) : []).forEach(x => x.words.forEach(w => charUnits(w, lang).forEach(u => seen.add(u.c))));
  return seen;
}
// The "meet the characters" cards for these words: one after each word that has characters the kid hasn't met yet
function charSteps(l, words, known) {
  const lang = l.lang, out = new Map();
  if (lang !== 'ja' && lang !== 'zh') return out;
  for (const w of words) {
    const us = charUnits(w, lang).map(u => ({ ...u, fresh: !known.has(u.c) }));
    if (us.some(u => u.fresh)) out.set(w, { kind: 'chars', w, units: us });
    us.forEach(u => known.add(u.c));
  }
  return out;
}
// Questions about this lesson's new characters, asked before any "Build it": what sound, which one, what it means
// (The character in these questions is plain text, not «…», so its rōmaji, pinyin or meaning isn't shown with it.)
function charAsks(l, ws, near, r) {
  const lang = l.lang; if (lang !== 'ja' && lang !== 'zh') return { sound: [], pick: [], mean: [] };
  const before = charsBefore(l, lang), uniq = list => list.filter((u, i, a) => u.s && a.findIndex(x => x.c === u.c) === i);
  const fresh = uniq(ws.flatMap(w => charUnits(w, lang)).filter(u => !before.has(u.c)));
  const pool = uniq([...ws, ...near.filter(x => x.kind === 'w')].flatMap(w => charUnits(w, lang)));
  const key = u => toneless(u.s), shufR = a => shuf(a, r);
  const others = (u, ok) => { const o = []; for (const x of shufR(pool)) { if (x.c !== u.c && ok(x) && !o.some(y => !ok(y, x))) o.push(x); if (o.length === 2) break; } return o.length === 2 ? o : null; };
  const sound = fresh.map(u => { const o = others(u, (x, y) => key(x) !== key(y || u)); return o && { type: 'mcq', q: `What sound does ${u.c} make?`, opts: shufR([{ t: u.s, ok: true }, ...o.map(x => ({ t: x.s, ok: false }))]) }; });
  const pick = fresh.map(u => { const o = others(u, (x, y) => key(x) !== key(y || u)); return o && { type: 'mcq', q: `Which one says “${u.s}”?`, opts: shufR([{ t: u.c, ok: true }, ...o.map(x => ({ t: x.c, ok: false }))]), lang }; });
  const mean = lang !== 'zh' ? [] : fresh.filter(u => u.m && !/^part of /.test(u.m)).map(u => { const o = others(u, (x, y) => x.m && !/^part of /.test(x.m) && !sameSense(x.m, (y || u).m)); return o && { type: 'mcq', q: `What does ${u.c} mean?`, opts: shufR([{ t: u.m, ok: true }, ...o.map(x => ({ t: x.m, ok: false }))]) }; });
  return { sound, pick, mean };
}

const CHCSS = `
.l-chars{text-align:center}
.l-chars h3{margin:0 0 4px}
.l-ch-sub{margin:0 0 10px;color:#5A6380;font-weight:700}
.l-ch-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin:6px 0 10px}
.l-ch{position:relative;display:flex;flex-direction:column;align-items:center;min-width:72px;max-width:150px;padding:10px 10px 8px;border-radius:16px;background:#F2F4FA;color:#0D1530;box-shadow:inset 0 -3px 0 rgba(13,21,48,.08);border:0;font:inherit;cursor:pointer}
.l-ch.new{background:#FFF6D6;box-shadow:inset 0 0 0 2px #F5C542,inset 0 -3px 0 rgba(13,21,48,.08)}
.l-ch-new{position:absolute;top:-8px;right:-6px;padding:1px 7px;border-radius:999px;background:#F5C542;color:#3A2A00;font:800 11px var(--f-round)}
.l-ch-c{font:900 calc(38px*var(--ts))/1.15 "Hiragino Sans","PingFang SC","Noto Sans JP","Noto Sans CJK SC",var(--f-round)}
.l-ch-s{margin-top:2px;font:800 calc(16px*var(--ts)) var(--f-round);color:#3B4A8C}
.l-ch-m{margin-top:2px;font:700 calc(13px*var(--ts))/1.25 var(--f-round);color:#5A6380}
.l-ch-sum{margin:4px 0 8px;font:800 calc(17px*var(--ts)) var(--f-round)}
.l-ch-notes{margin:0 auto 10px;padding:0;list-style:none;max-width:460px;text-align:left}
.l-ch-notes li{margin:6px 0;padding:8px 12px;border-radius:12px;background:#EEF4FF;font-weight:700;line-height:1.35}
.g-chip .g-chip-rd{display:block;margin-top:1px;font:700 11px/1.1 var(--f-round);color:#5A6380;letter-spacing:.02em}
.g-chip:has(.g-chip-rd){height:auto;padding:6px 12px;display:inline-flex;flex-direction:column;align-items:center}
`;
const chstyle = document.createElement('style'); chstyle.id = 'growth-chars-css'; chstyle.textContent = CHCSS; document.head.appendChild(chstyle);
