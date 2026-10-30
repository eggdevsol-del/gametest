
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
