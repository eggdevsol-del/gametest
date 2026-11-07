/* ---------- More mini-games ----------
   Memory flip, Lightning round, Balloon pop, Listen and pop (languages), Clock hands, Pizza fractions, Coin counter,
   Balance scale and Guess the word. The long-lesson builders (14-drill.js, and drillSteps in 11-lang.js) put them in
   lessons; each marks itself and calls done({ ok, score }) like every other game. */
const BAND_SECS = { sprouts: 14, builders: 10, makers: 8 };

// Memory flip: every card starts face down. Turn two over; a pair that goes together stays up. A few misses are free,
// since you have to look before you know.
GAMES.memory = (it, host, ctx, done) => {
  done = once(done);
  const cards = shuffle(it.pairs.flatMap((p, i) => [{ t: p[0], i }, { t: p[1], i }]), rnd), up = [], got = new Set(); let misses = 0, busy = false;
  host.innerHTML = `${qHead(it.q)}<div class="g-mem n${cards.length}">${cards.map((c, j) => `<button class="g-mc" data-j="${j}" aria-label="Card ${j + 1}"><span class="g-mc-b">?</span><span class="g-mc-f">${esc(local(c.t))}</span></button>`).join('')}</div><p class="g-hint">Turn over two cards at a time.</p>`;
  const card = j => host.querySelector(`.g-mc[data-j="${j}"]`);
  host.querySelectorAll('.g-mc').forEach(b => { b.onclick = () => {
    const j = +b.dataset.j; if (busy || host.dataset.locked || got.has(cards[j].i) || up.includes(j)) return;
    b.classList.add('up'); up.push(j); Sound.tap(); if (up.length < 2) return;
    const [x, y] = up; busy = true;
    if (cards[x].i === cards[y].i) {
      got.add(cards[x].i); [x, y].forEach(k => card(k).classList.add('got')); up.length = 0; busy = false; Sound.pop(); fx(ctx, 'graded', { ok: true });
      if (got.size === it.pairs.length) { host.dataset.locked = 1; const n = it.pairs.length, score = n / (n + Math.max(0, misses - n)); cheer(host.querySelector('.g-mem'), true); done({ ok: score >= 0.66, score, answer: `${misses} misses` }); }
    } else { misses++; fx(ctx, 'graded', { ok: false }); setTimeout(() => { [x, y].forEach(k => card(k).classList.remove('up')); up.length = 0; busy = false; }, 950); }
  }; });
};

// Lightning round: true or false, one after another, before the bar runs out
GAMES.lightning = (it, host, ctx, done) => {
  done = once(done);
  const items = it.items, secs = BAND_SECS[ctx.kid ? bandOf(ctx.kid) : 'builders'] || 10, wrong = []; let k = 0, right = 0, timer = null;
  const end = () => {
    host.dataset.locked = 1; const score = right / items.length;
    host.innerHTML = `${qHead(`${right} of ${items.length} right!`)}${wrong.length ? `<ul class="g-lt-why">${wrong.map(w => `<li>${esc(local(w.why))}</li>`).join('')}</ul>` : '<p class="g-note">Every one right. Lightning fast! ⚡</p>'}`;
    (score >= 0.8 ? cheer : oops)(host.querySelector('.g-q')); done({ ok: score >= 0.8, score, answer: `${right} of ${items.length}` });
  };
  const next = () => {
    if (k >= items.length) return end();
    const x = items[k]; let gone = false;
    host.innerHTML = `${qHead(it.q)}<div class="g-ltbar"><i style="transition-duration:${secs}s"></i></div><p class="g-count">⚡ ${k + 1} of ${items.length}</p><div class="g-swipe"><div class="g-swcard g-ltcard"><span>${esc(local(x.t))}</span></div></div><div class="g-tfrow"><button class="g-tf no" data-v="0">${ic('x')} False</button><button class="g-tf yes" data-v="1">${ic('check')} True</button></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() => { const bar = host.querySelector('.g-ltbar i'); if (bar) bar.style.width = '0%'; }));
    const pick = v => {
      if (gone) return; gone = true; clearTimeout(timer); const ok = v === x.a; if (ok) right++; else wrong.push(x);
      const b = v == null ? host.querySelector('.g-ltbar') : host.querySelector(`[data-v="${v ? 1 : 0}"]`); b.classList.add(ok ? 'right' : 'wrong');
      ok ? Sound.pop() : Sound.tap(); fx(ctx, 'graded', { ok }); k++; setTimeout(next, ok ? 450 : 1000);
    };
    host.querySelectorAll('.g-tf').forEach(b => { b.onclick = () => pick(b.dataset.v === '1'); });
    timer = setTimeout(() => pick(null), secs * 1000);
  };
  if (ctx.cleanup) ctx.cleanup.push(() => clearTimeout(timer));
  next();
};

// Balloon pop: pop every balloon that fits the rule, then Done. Tap a popped one again to bring it back.
GAMES.pop = (it, host, ctx, done) => {
  done = once(done);
  const items = shuffle(it.items, rnd), popped = new Set();
  host.innerHTML = `${qHead(it.q)}<div class="g-pop">${items.map((x, i) => `<button class="g-bal" style="--d:${(i % 5) * 0.37}s;--h:${(i * 47) % 360}" data-i="${i}"><span>${esc(local(x.t))}</span></button>`).join('')}</div><button class="g-go" data-done>Done</button>`;
  host.querySelectorAll('.g-bal').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; const i = +b.dataset.i; if (popped.has(i)) popped.delete(i); else popped.add(i); b.classList.toggle('popped', popped.has(i)); Sound.pop(); }; });
  host.querySelector('[data-done]').onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1;
    const need = items.filter(x => x.ok).length, hit = items.filter((x, i) => x.ok && popped.has(i)).length, bad = items.filter((x, i) => !x.ok && popped.has(i)).length;
    items.forEach((x, i) => { const b = host.querySelector(`.g-bal[data-i="${i}"]`); b.disabled = true; if (x.ok && !popped.has(i)) b.classList.add('missed'); if (!x.ok && popped.has(i)) b.classList.add('wrongpop'); });
    const score = Math.max(0, (hit - bad) / need), ok = hit === need && !bad; ok ? cheer(host.querySelector('.g-pop'), true) : oops(host.querySelector('.g-pop')); fx(ctx, 'graded', { ok });
    host.querySelector('[data-done]').disabled = true;
    done({ ok, score, answer: `${hit} of ${need}`, right: ok ? '' : `The ones to pop: ${items.filter(x => x.ok).map(x => local(x.t)).join(', ')}` });
  };
};

// Listen and pop (languages): a word is said, pop the bubble with that word. Five quick rounds.
GAMES.lpop = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, rounds = it.rounds; let k = 0, right = 0;
  const round = () => {
    if (k >= rounds.length) { host.dataset.locked = 1; const score = right / rounds.length; host.innerHTML = qHead(`${right} of ${rounds.length} popped right!`); (score >= 0.8 ? cheer : oops)(host.querySelector('.g-q')); return done({ ok: score >= 0.8, score, answer: `${right} of ${rounds.length}` }); }
    const x = rounds[k], opts = shuffle(x.opts, rnd), vi = (ctx.voice = (ctx.voice || 0) + 1); let gone = false;
    host.innerHTML = `<div class="g-qrow"><h2 class="g-q">Listen, then pop that word!</h2><button type="button" class="l-hear" data-hear aria-label="Hear it again">🔊</button></div>${canHear(lang, x.t) ? '' : `<p class="l-norec">No voice on this device: pop the word that means ${esc(x.en)}.</p>`}<p class="g-count">${k + 1} of ${rounds.length}</p>
      <div class="g-pop">${opts.map((o, i) => `<button class="g-bal" style="--d:${i * 0.3}s;--h:${(i * 83 + k * 40) % 360}" data-i="${i}"><span>${esc(`«${o}»`)}</span></button>`).join('')}</div>`;
    const play = () => speakLang(x.t, lang, { voice: vi }); host.querySelector('[data-hear]').onclick = play; setTimeout(play, 300);
    host.querySelectorAll('.g-bal').forEach(b => { b.onclick = () => {
      if (gone) return; gone = true; const ok = opts[+b.dataset.i] === x.t; if (ok) right++;
      b.classList.add(ok ? 'popped' : 'wrongpop'); if (!ok) host.querySelectorAll('.g-bal').forEach((y, i) => { if (opts[i] === x.t) y.classList.add('missed'); });
      ok ? Sound.pop() : Sound.tap(); fx(ctx, 'graded', { ok }); k++; setTimeout(round, ok ? 650 : 1400);
    }; });
  };
  round();
};

// Clock hands: drag the hands, or use the buttons, to show a time. The hour hand follows the minute hand, like a
// real clock. There's no digital readout: reading the hands is the point.
GAMES.clock = (it, host, ctx, done) => {
  done = once(done);
  const step = it.step || 5, C0 = 100; let mins = it.t === 0 ? 360 : 0, drag = null;
  const xy = (deg, len) => [C0 + len * Math.sin(deg * Math.PI / 180), C0 - len * Math.cos(deg * Math.PI / 180)];
  host.innerHTML = `${qHead(it.q)}<div class="g-clock"><svg viewBox="0 0 200 200" aria-label="A clock with an hour hand and a minute hand">
      <circle cx="100" cy="100" r="94" class="g-ck-face"/>${Array.from({ length: 60 }, (_, i) => { const [a, b] = [xy(i * 6, i % 5 ? 88 : 82), xy(i * 6, 92)]; return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="g-ck-tick ${i % 5 ? '' : 'big'}"/>`; }).join('')}
      ${Array.from({ length: 12 }, (_, i) => { const [x, y] = xy((i + 1) * 30, 68); return `<text x="${x}" y="${y}" class="g-ck-n">${i + 1}</text>`; }).join('')}
      <line data-h x1="100" y1="100" class="g-ck-h"/><line data-m x1="100" y1="100" class="g-ck-m"/><circle cx="100" cy="100" r="6" class="g-ck-c"/></svg></div>
    <div class="g-ck-row"><button class="g-chip" data-d="-60">◀ hour</button><button class="g-chip" data-d="60">hour ▶</button><button class="g-chip" data-d="-${step}">◀ ${step} min</button><button class="g-chip" data-d="${step}">${step} min ▶</button></div><button class="g-go" data-check>Check</button>`;
  const svg = host.querySelector('svg'), H = host.querySelector('[data-h]'), M = host.querySelector('[data-m]');
  const draw = () => { const [hx, hy] = xy((mins % 720) / 2, 46), [mx, my] = xy((mins % 60) * 6, 74); H.setAttribute('x2', hx); H.setAttribute('y2', hy); M.setAttribute('x2', mx); M.setAttribute('y2', my); };
  const angle = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * 200 / r.width - C0, y = (e.clientY - r.top) * 200 / r.height - C0; return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360; };
  const off = (a, b) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const move = e => {
    if (!drag || host.dataset.locked) return; const a = angle(e);
    if (drag === 'm') { const want = Math.round(a / 6 / step) * step % 60; let d = want - (mins % 60); if (d > 30) d -= 60; if (d < -30) d += 60; mins = (mins + d + 720) % 720; }
    else mins = Math.floor(a / 30) * 60 + (mins % 60);
    draw();
  };
  svg.onpointerdown = e => { if (host.dataset.locked) return; const a = angle(e); drag = off(a, (mins % 60) * 6) <= off(a, (mins % 720) / 2) ? 'm' : 'h'; try { svg.setPointerCapture(e.pointerId); } catch (x) {} move(e); };
  svg.onpointermove = move; svg.onpointerup = svg.onpointercancel = () => { drag = null; };
  host.querySelectorAll('[data-d]').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; mins = (mins + +b.dataset.d + 720) % 720; Sound.tap(); draw(); }; });
  host.querySelector('[data-check]').onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1; const ok = mins === it.t % 720;
    ok ? cheer(svg, true) : oops(svg); fx(ctx, 'graded', { ok }); host.querySelectorAll('button').forEach(b => { b.disabled = true; });
    if (!ok) setTimeout(() => { mins = it.t % 720; svg.classList.add('fix'); draw(); }, 700);
    done({ ok, score: ok ? 1 : 0, answer: TIME_WORDS(mins), right: ok ? '' : `That shows ${TIME_WORDS(mins)}. Watch the hands move to ${TIME_WORDS(it.t)}.` });
  };
  draw();
};

// Pizza fractions: tap slices to shade them
GAMES.pizza = (it, host, ctx, done) => {
  done = once(done);
  const d = it.d, on = new Set(), R = 90, C0 = 100;
  const slice = i => { const a0 = i / d * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / d * 2 * Math.PI - Math.PI / 2; return `M${C0},${C0} L${(C0 + R * Math.cos(a0)).toFixed(2)},${(C0 + R * Math.sin(a0)).toFixed(2)} A${R},${R} 0 0 1 ${(C0 + R * Math.cos(a1)).toFixed(2)},${(C0 + R * Math.sin(a1)).toFixed(2)} Z`; };
  host.innerHTML = `${qHead(it.q)}<div class="g-pizza"><svg viewBox="0 0 200 200" aria-label="A pizza cut into ${d} equal slices"><circle cx="100" cy="100" r="96" class="g-pz-crust"/>${Array.from({ length: d }, (_, i) => `<path class="g-sl" data-s="${i}" d="${slice(i)}" tabindex="0" role="button" aria-label="Slice ${i + 1}"/>`).join('')}</svg></div><p class="g-count" data-n>0 of ${d} slices shaded</p><button class="g-go" data-check>Check</button>`;
  const count = host.querySelector('[data-n]');
  const tog = el => { if (host.dataset.locked) return; const i = +el.dataset.s; if (on.has(i)) on.delete(i); else on.add(i); el.classList.toggle('on', on.has(i)); count.textContent = `${on.size} of ${d} slices shaded`; Sound.tap(); };
  host.querySelectorAll('.g-sl').forEach(el => { el.addEventListener('click', () => tog(el)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog(el); } }); });
  host.querySelector('[data-check]').onclick = () => {
    if (host.dataset.locked) return; host.dataset.locked = 1; const ok = on.size === it.n, svg = host.querySelector('svg');
    ok ? cheer(svg, true) : oops(svg); fx(ctx, 'graded', { ok }); host.querySelector('[data-check]').disabled = true;
    done({ ok, score: ok ? 1 : 0, answer: `${on.size} of ${d}`, right: ok ? '' : `Shade ${it.n} of the ${d} slices.` });
  };
};

// Coin counter: tap coins (and notes) to make an amount. No running total: counting it up is the skill.
GAMES.coins = (it, host, ctx, done) => {
  done = once(done);
  const kinds = [...(GSET().country === 'au' ? [5] : []), 10, 20, 50, 100, 200, ...(it.notes ? [500, 1000] : [])], tray = [];
  const label = c => (c < 100 ? `${c}c` : `$${c / 100}`), money = c => `$${(c / 100).toFixed(2)}`;
  const coin = (c, attr) => `<button class="g-coin ${c >= 500 ? 'note' : c >= 100 ? 'gold' : 'silver'}" ${attr}>${label(c)}</button>`;
  const draw = () => {
    host.innerHTML = `${qHead(it.q)}<div class="g-ctray">${tray.map((c, j) => coin(c, `data-back="${j}"`)).join('') || '<span class="l-built-ph">Tap coins to put them here</span>'}</div>
      <div class="g-coins">${kinds.map(c => coin(c, `data-add="${c}"`)).join('')}</div><button class="g-go" data-check ${tray.length ? '' : 'disabled'}>Check</button>`;
    host.querySelectorAll('[data-add]').forEach(b => { b.onclick = () => { if (host.dataset.locked || tray.length >= 20) return; tray.push(+b.dataset.add); Sound.coin ? Sound.coin() : Sound.tap(); draw(); }; });
    host.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; tray.splice(+b.dataset.back, 1); Sound.tap(); draw(); }; });
    host.querySelector('[data-check]').onclick = () => {
      if (host.dataset.locked) return; host.dataset.locked = 1; const sum = tray.reduce((a, b) => a + b, 0), ok = sum === it.cents, t = host.querySelector('.g-ctray');
      host.querySelectorAll('button').forEach(b => { b.disabled = true; }); ok ? cheer(t, true) : oops(t); fx(ctx, 'graded', { ok });
      done({ ok, score: ok ? 1 : 0, answer: money(sum), right: ok ? '' : `Your coins make ${money(sum)}, not ${money(it.cents)}.` });
    };
  };
  draw();
};

// Balance scale: add weights to the side with the gap until both sides weigh the same. The beam tips as you go.
GAMES.balance = (it, host, ctx, done) => {
  done = once(done);
  const put = [], W = it.weights || [1, 2, 5, 10];
  const draw = () => {
    const left = it.a + put.reduce((a, b) => a + b, 0), tilt = Math.max(-14, Math.min(14, (it.total - left) * 3));
    host.innerHTML = `${qHead(it.q)}<div class="g-scale"><div class="g-beam" style="transform:rotate(${tilt}deg)"><div class="g-pan"><b class="g-wt big">${it.a}</b>${put.map((w, j) => `<button class="g-wt" data-back="${j}" aria-label="Take off ${w}">${w}</button>`).join('')}${put.length ? '' : '<b class="g-wt q">?</b>'}</div><div class="g-pan"><b class="g-wt big">${it.total}</b></div></div><div class="g-post"></div></div>
      <div class="g-weights">${W.map(w => `<button class="g-chip" data-add="${w}">+ ${w}</button>`).join('')}</div><button class="g-go" data-check ${put.length ? '' : 'disabled'}>Check</button>`;
    host.querySelectorAll('[data-add]').forEach(b => { b.onclick = () => { if (host.dataset.locked || put.length >= 12) return; put.push(+b.dataset.add); Sound.pop(); draw(); }; });
    host.querySelectorAll('[data-back]').forEach(b => { b.onclick = () => { if (host.dataset.locked) return; put.splice(+b.dataset.back, 1); Sound.tap(); draw(); }; });
    host.querySelector('[data-check]').onclick = () => {
      if (host.dataset.locked) return; host.dataset.locked = 1; const add = put.reduce((a, b) => a + b, 0), ok = it.a + add === it.total, s = host.querySelector('.g-scale');
      host.querySelectorAll('button').forEach(b => { b.disabled = true; }); ok ? cheer(s, true) : oops(s); fx(ctx, 'graded', { ok });
      done({ ok, score: ok ? 1 : 0, answer: String(add), right: ok ? '' : `${it.a} + ${it.total - it.a} = ${it.total}, so the gap is ${it.total - it.a}.` });
    };
  };
  draw();
};

// Guess the word: tap letters to fill in a word from its clue. Each wrong letter costs a heart.
GAMES.letters = (it, host, ctx, done) => {
  done = once(done);
  const lang = ctx.lang, chars = [...String(it.a)], isL = c => /\p{L}/u.test(c), key = c => plainL(c.toLowerCase());
  const need = new Set(chars.filter(isL).map(key)), lives0 = ctx.kid && bandOf(ctx.kid) === 'sprouts' ? 6 : 5, tried = new Set(); let lives = lives0;
  const extra = shuffle('abcdefghijklmnopqrstuvwxyz'.split('').filter(c => !need.has(c)), rnd).slice(0, Math.max(5, 14 - need.size)), keys = [...need, ...extra].sort();
  const draw = end => {
    host.innerHTML = `${qHead(it.q)}<div class="g-lw"${lang ? ` lang="${lang}"` : ''}>${chars.map(c => (isL(c) ? `<span class="g-lt ${tried.has(key(c)) || end ? 'on' : ''}">${tried.has(key(c)) || end ? esc(c) : ''}</span>` : `<span class="g-lt sp">${esc(c)}</span>`)).join('')}</div>
      <p class="g-lives" aria-label="${lives} hearts left">${'❤️'.repeat(lives)}${'🤍'.repeat(lives0 - lives)}</p><div class="g-keys">${keys.map(c => `<button class="g-key ${tried.has(c) ? (need.has(c) ? 'hit' : 'miss') : ''}" data-k="${c}" ${tried.has(c) || end ? 'disabled' : ''}>${c}</button>`).join('')}</div>`;
    host.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => {
      const c = b.dataset.k; if (host.dataset.locked || tried.has(c)) return; tried.add(c);
      if (!need.has(c)) { lives--; Sound.tap(); } else Sound.pop();
      const won = [...need].every(x => tried.has(x)), lost = lives <= 0;
      draw(won || lost);
      if (won || lost) {
        host.dataset.locked = 1; const got = [...need].filter(x => tried.has(x)).length / need.size, w = host.querySelector('.g-lw');
        won ? cheer(w, true) : oops(w); fx(ctx, 'graded', { ok: won });
        done({ ok: won, score: won ? 1 : got * 0.5, answer: won ? it.a : 'out of hearts', right: won ? '' : `The word was “${it.a}”.` });
      }
    }; });
  };
  draw(false);
};

const PCSS = `
.g-mem{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.g-mem.n6{grid-template-columns:repeat(3,minmax(0,1fr))}
.g-mc{position:relative;min-height:84px;border:0;border-radius:16px;background:linear-gradient(160deg,var(--gh),color-mix(in srgb,var(--gh) 60%,#0D1530));color:#fff;font:800 calc(15px*var(--ts))/1.25 var(--f-round);padding:8px;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18);transition:transform .25s,background .25s}
.g-mc .g-mc-f{display:none}.g-mc .g-mc-b{font-size:calc(26px*var(--ts));opacity:.85}
.g-mc.up,.g-mc.got{background:#fff;color:#0D1530;box-shadow:inset 0 0 0 3px var(--gh);transform:rotateY(0) scale(1.02)}
.g-mc.up .g-mc-f,.g-mc.got .g-mc-f{display:block}.g-mc.up .g-mc-b,.g-mc.got .g-mc-b{display:none}
.g-mc.got{background:#DDF8E6;box-shadow:inset 0 0 0 3px #30C25A}
.g-ltbar{height:8px;border-radius:99px;background:#E8EBF3;overflow:hidden;margin:4px 0 6px}
.g-ltbar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#FFB020,#FF6B3D);transition-property:width;transition-timing-function:linear}
.g-ltbar.wrong i{background:#E5484D}
.g-ltcard{min-height:130px}
.g-lt-why{margin:8px 0 0;padding-left:20px;font:700 calc(15px*var(--ts))/1.4 var(--f-round);color:#3A4360}
.g-pop{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;padding:6px 0 10px}
.g-bal{position:relative;width:74px;height:88px;border:0;border-radius:50% 50% 46% 46%;background:radial-gradient(circle at 32% 28%,#fff8,transparent 34%),hsl(var(--h) 80% 62%);color:#0D1530;font:900 calc(17px*var(--ts)) var(--f-round);box-shadow:inset -6px -8px 0 #0002;animation:gBob 2.6s var(--d) ease-in-out infinite;transition:transform .2s,opacity .2s}
.g-bal::after{content:'';position:absolute;left:50%;bottom:-14px;width:1px;height:14px;background:#0D153055}
.g-bal.popped{transform:scale(.55);opacity:.35;animation:none}
.g-bal.missed{box-shadow:0 0 0 4px #30C25A;animation:none}.g-bal.wrongpop{box-shadow:0 0 0 4px #E5484D;opacity:.6}
@keyframes gBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@media (prefers-reduced-motion:reduce){.g-bal{animation:none}}
.g-clock{display:grid;place-items:center}.g-clock svg{width:min(70vw,260px);height:auto;touch-action:none;cursor:grab}
.g-ck-face{fill:#fff;stroke:#0D1530;stroke-width:4}.g-ck-tick{stroke:#9AA3B5;stroke-width:1.5}.g-ck-tick.big{stroke:#0D1530;stroke-width:3}
.g-ck-n{font:800 15px var(--f-round);fill:#0D1530;text-anchor:middle;dominant-baseline:central}
.g-ck-h{stroke:#0D1530;stroke-width:8;stroke-linecap:round}.g-ck-m{stroke:var(--gh);stroke-width:5;stroke-linecap:round}.g-ck-c{fill:#0D1530}
.g-clock svg.fix line{transition:all .6s}
.g-ck-row,.g-weights{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin:10px 0}
.g-pizza{display:grid;place-items:center}.g-pizza svg{width:min(70vw,250px);height:auto}
.g-pz-crust{fill:#E9B872}.g-sl{fill:#FFE7A8;stroke:#C98A3B;stroke-width:2;cursor:pointer;transition:fill .15s}.g-sl.on{fill:#E8553E}
.g-ctray{min-height:70px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px;border-radius:14px;border:2px dashed #DCE1EE;margin-bottom:10px}
.g-coins{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.g-coin{width:56px;height:56px;border-radius:50%;border:0;font:900 calc(14px*var(--ts)) var(--f-round);box-shadow:inset 0 -4px 0 #0002,0 2px 4px #0002}
.g-coin.silver{background:radial-gradient(circle at 35% 30%,#fff,#C9CFD9)}.g-coin.gold{background:radial-gradient(circle at 35% 30%,#FFF4C2,#E1B33A)}
.g-coin.note{width:76px;height:44px;border-radius:8px;background:linear-gradient(135deg,#9BE3C4,#4FB38A)}
.g-scale{position:relative;height:150px;margin:6px 0}
.g-beam{position:absolute;left:6%;right:6%;top:46px;height:8px;border-radius:4px;background:#5A6380;display:flex;justify-content:space-between;transition:transform .45s cubic-bezier(.3,1.4,.5,1);transform-origin:50% 50%}
.g-pan{width:44%;min-height:58px;margin-top:8px;padding:6px;border-radius:0 0 18px 18px;background:#F2F4FA;border:2px solid #DCE1EE;border-top:0;display:flex;flex-wrap:wrap;gap:4px;justify-content:center;align-items:flex-end}
.g-post{position:absolute;left:calc(50% - 5px);top:50px;width:10px;height:96px;background:#5A6380;border-radius:4px}
.g-wt{min-width:34px;height:34px;padding:0 6px;border:0;border-radius:8px;background:var(--gh);color:#fff;font:900 calc(15px*var(--ts)) var(--f-round)}
.g-wt.big{background:#0D1530}.g-wt.q{background:#fff;color:#9AA3B5;border:2px dashed #9AA3B5}
.g-lw{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;margin:6px 0}
.g-lt{width:32px;height:42px;border-bottom:4px solid var(--gh);display:grid;place-items:center;font:900 calc(24px*var(--ts)) var(--f-round);color:#0D1530}
.g-lt.sp{border:0;width:12px}.g-lt.on{animation:cardIn .35s both}
.g-lives{text-align:center;margin:4px 0;letter-spacing:2px}
.g-keys{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
.g-key{min-height:42px;border:0;border-radius:10px;background:#F2F4FA;font:900 calc(18px*var(--ts)) var(--f-round);color:#0D1530;box-shadow:inset 0 -3px 0 #0001}
.g-key.hit{background:#DDF8E6;color:#1F8A4C}.g-key.miss{background:#FFE9E3;color:#B4442B}
`;
const pstyle = document.createElement('style'); pstyle.id = 'growth-play-css'; pstyle.textContent = PCSS; document.head.appendChild(pstyle);
