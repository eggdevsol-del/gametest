
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
