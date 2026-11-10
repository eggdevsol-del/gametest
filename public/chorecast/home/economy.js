/* Chorecast homes: the farm's running costs, the way a real farm has them (economy plan, phase 2).
   app.js makes one with IH.economy(api) when the game opens and calls tick() then and every minute.
   - Days: only days the kid opens the game count. Weekly bills come every Monday for the week before, worked out
     for the days they played that week, so a week away costs nothing.
   - Bills: council rates, power, water, vehicle registration and vet care, paid from the farm account, never the
     wallet. One the account can't cover waits as overdue; after 3 played days it gets a 10% late fee, and new farm
     things (not feed or seed) can't be bought until it's paid. Fuel is paid each time the tractor goes out.
   - The Monday statement: sales, running costs and bills, the profit, income tax on the profit (the farm's own tax: family tax is only for real money from chores), what's kept. On the
     pay slip.
   - Economic reports: when a grown-up changes the farm earnings or the income tax rate, and every Monday: what changed,
     why, and how farm prices are moving.
   - Lesson cards: a short read, something to try and a quick check, the first time each thing happens, played in the
     game. Finishing one earns XP.
   api: { st, kid, acct, led, slipOf, save, toast, sheet, closeSheet, ui, sound, wGain, nf, esc, sheetOpen } */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  // (IH.econDays moves the clock on, for testing a few weeks in a minute)
  const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 6e4) / 864e5) + (IH.econDays || 0); };
  const dow = day => (day + 4) % 7; // 0 Sunday (day 0 was a Thursday)
  const mondayOf = day => day - ((dow(day) + 6) % 7);
  const dateOf = day => new Date(day * 864e5).toLocaleDateString('en-NZ', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
  const BIG = /^(cow|highland|alpaca|llama|donkey|pony|horse)$/;
  const RUNNING = /grain|hay|nuts|feed|seed|fuel/i;
  // what the farm sells, for the price board in the reports (the grocer's own prices, times the earnings dial)
  const BOARD = [['egg', '🥚', 'Eggs', 14], ['milk', '🥛', 'Milk', 18], ['wool', '🧶', 'Wool', 45], ['honey', '🍯', 'Honey', 45], ['carrot', '🥕', 'Carrots', 12], ['apple', '🍎', 'Apples', 18]];

  // the first lessons, each played once in the game at the moment it matters (checked like every Chorecast lesson)
  const LESSONS = {
    keep: { e: '🧾', title: 'Earning isn’t keeping', xp: 20,
      learn: ['Selling something isn’t the same as keeping the money. Out of what your farm sells come its bills: feed, power, water, rates and fuel.', 'What’s left after the bills is the profit. Income tax comes off the profit, and what’s left after that is yours to keep or pay yourself.'],
      tryQ: 'Your farm sold ✨ 400 of eggs and milk. Its bills were ✨ 250. What’s the profit?', tryO: ['✨ 150', '✨ 400', '✨ 650'], tryA: 0, tryWhy: '400 came in, 250 went out: 150 is left.',
      check: 'Profit is all the money that came in.', checkA: false, checkWhy: 'Profit is what’s left after the bills.' },
    rates: { e: '🏛️', title: 'Council rates', xp: 20,
      learn: ['Everyone who owns land pays rates to the council. Rates pay for things the whole area uses: roads, rubbish collection, parks, libraries and water pipes.', 'The more land you own, the more rates you usually pay. Your farm pays rates every Monday.'],
      tryQ: 'Your paddock’s rates are ✨ 20 a week. You add 2 more blocks of land at ✨ 15 a week each. What are your rates now?', tryO: ['✨ 35', '✨ 50', '✨ 30'], tryA: 1, tryWhy: '20 + 15 + 15 = 50 a week.',
      check: 'Rates help pay for roads and parks.', checkA: true, checkWhy: 'Yes: rates pay for things everyone in the area uses.' },
    tax: { e: '🏫', title: 'What tax pays for', xp: 20,
      learn: ['Tax is money people pay from what they earn. It pays for things we all share, like schools, hospitals, roads and parks.', 'Businesses pay income tax on their profit. Your farm is a business, so every Monday some of its profit goes in income tax.'],
      tryQ: 'Your farm made a profit of ✨ 200 and income tax is 10%. How much tax is that?', tryO: ['✨ 2', '✨ 20', '✨ 200'], tryA: 1, tryWhy: '10% means 10 out of every 100: 20 out of 200.',
      check: 'If your farm made no profit this week, it pays no income tax.', checkA: true, checkWhy: 'Yes: on your farm, tax only comes off profit.' },
    late: { e: '⏰', title: 'Late fees, and paying bills first', xp: 20,
      learn: ['Every bill has a day it’s due. If it isn’t paid in time, a late fee is added, so the same bill costs more.', 'That’s why people pay their bills before buying new things. Your farm can’t buy anything new while a bill is overdue, but feed and seed are always allowed.'],
      tryQ: 'A bill is ✨ 40 and the late fee is 10%. What do you pay if you’re late?', tryO: ['✨ 40', '✨ 44', '✨ 50'], tryA: 1, tryWhy: '10% of 40 is 4, so 40 + 4 = 44.',
      check: 'A late fee makes a bill cheaper.', checkA: false, checkWhy: 'A late fee is extra on top of the bill.' },
    report: { e: '📰', title: 'What an economic report tells us', xp: 20,
      learn: ['An economic report tells everyone how prices are changing: what things cost to buy, and what they sell for.', 'Farmers and business owners read them to plan: what to grow, when to sell, and when to save.'],
      tryQ: 'Egg prices just went up from ✨ 14 to ✨ 21. Is it a good week to sell eggs?', tryO: ['Yes, prices are up', 'No, keep them all', 'It makes no difference'], tryA: 0, tryWhy: 'When the price is up, each egg brings in more.',
      check: 'An economic report can help you decide when to sell.', checkA: true, checkWhy: 'Yes: knowing where prices are going helps you plan.' }
  };

  IH.economy = A => {
    const E = () => { const st = A.st(); const e = (st.econ = st.econ || {}); e.days = e.days || []; e.bills = e.bills || []; e.stmts = e.stmts || []; e.reports = e.reports || []; e.lessons = e.lessons || {}; e.queue = e.queue || []; if (e.dial == null) e.dial = 1; if (e.tax == null) e.tax = 10; if (e.wk == null) e.wk = { mon: mondayOf(today()), sales: 0, run: 0, cap: 0 }; return e; };
    const farm = () => A.st().farm || {};
    const animals = () => { const f = farm(), out = []; if (Array.isArray(f.animals)) for (const a of f.animals) out.push(a.kind); else for (const [k, n] of Object.entries(f.animals || {})) for (let i = 0; i < n; i++) out.push(k); const S = ((A.st().isl || {}).stable || {}).animals || {}; for (const [k, n] of Object.entries(S)) for (let i = 0; i < n; i++) out.push(k); return out; };
    const vehicles = () => (farm().items || []).filter(it => it.t === 'tractor' || it.t === 'quad').map(it => it.t);
    const due = () => E().bills.filter(b => !b.paid);
    const overdue = () => due().filter(b => b.late);
    // pay what's due from the farm account, oldest first, as far as the money goes
    function payDue(only) {
      const a = A.acct(); let any = false;
      for (const b of due()) { if ((only && b.id !== only) || a.bal < b.amt) continue; a.bal -= b.amt; b.paid = today(); any = true;
        A.led('farm', -b.amt, `Paid ${b.label.toLowerCase()}`, A.slipOf('CHORECAST FARM', 'Bill', [[b.label, b.amt], ...(b.how ? [[b.how, null]] : []), ...(b.fee ? [['Late fee (10%)', b.fee]] : [])], [['Paid from the farm account', b.amt, 'big'], ['Farm account after', a.bal, 'muted']])); }
      return any;
    }
    function addBill(label, amt, how, kind) { amt = Math.round(amt); if (amt <= 0) return null; const b = { id: Math.random().toString(36).slice(2, 9), label, amt, how, kind, from: today(), days: 0, paid: 0, late: false }; E().bills.push(b); return b; }
    function offer(key) { const e = E(); if (!LESSONS[key] || e.lessons[key] === 'done' || e.queue.includes(key)) return; e.queue.push(key); }
    // close the week that ended before `mon`: weekly bills for the days played, the statement, income tax
    function closeWeek(mon) {
      const e = E(), from = mon - 7, played = e.days.filter(d => d >= from && d < mon).length, wk = e.wk && e.wk.mon === from ? e.wk : { mon: from, sales: 0, run: 0, cap: 0 };
      e.wk = { mon, sales: 0, run: 0, cap: 0 };
      if (!played) return null; // (a week away: no bills, no statement)
      const blocks = (farm().land || []).length, k = played / 7, part = played < 7 ? `${played} of 7 days played` : '', an = animals(), big = an.filter(x => BIG.test(x)).length, veh = vehicles();
      const bills = [
        addBill('Council rates', (20 + 15 * blocks) * k, `The paddock ✨ 20${blocks ? ` + ${blocks} block${blocks === 1 ? '' : 's'} × ✨ 15` : ''} a week${part ? ` × ${part}` : ''}`, 'rates'),
        addBill('Power', 15 * k, part ? `✨ 15 a week × ${part}` : 'Fences, lights and the barn', 'power'),
        addBill('Water', 2 * an.length * k, `${an.length} animal${an.length === 1 ? '' : 's'} × ✨ 2 a week${part ? ` × ${part}` : ''}`, 'water'),
        veh.length ? addBill('Vehicle registration', veh.reduce((s, t) => s + (t === 'tractor' ? 5 : 3), 0) * k, veh.map(t => (t === 'tractor' ? 'Tractor ✨ 5' : 'Quad ✨ 3')).join(', ') + ' a week' + (part ? ` × ${part}` : ''), 'rego') : null,
        big ? addBill('Vet care', 4 * big * k, `${big} big animal${big === 1 ? '' : 's'} × ✨ 4 a week${part ? ` × ${part}` : ''}`, 'vet') : null
      ].filter(Boolean);
      const billed = bills.reduce((s, b) => s + b.amt, 0), profit = Math.round(wk.sales - wk.run - billed), tax = profit > 0 ? Math.round(profit * e.tax / 100) : 0;
      if (tax) addBill('Income tax', tax, `${e.tax}% of this week’s profit of ✨ ${A.nf(profit)}`, 'tax');
      const s = { mon, sales: Math.round(wk.sales), run: Math.round(wk.run), cap: Math.round(wk.cap), bills: bills.map(b => [b.label, b.amt]), profit, tax, kept: profit - tax, played, rate: e.tax };
      e.stmts.unshift(s); if (e.stmts.length > 26) e.stmts.length = 26;
      A.led('farm', 0, `Weekly statement, week of ${dateOf(from)}`, stmtSlip(s));
      payDue(); offer('keep'); offer('rates'); if (tax) offer('tax');
      return s;
    }
    const stmtSlip = s => Object.assign(A.slipOf('CHORECAST FARM', 'Weekly statement', [['Sales', s.sales], ['Feed, seed and fuel', -s.run], ...s.bills.map(([l, v]) => [l, -v])], [['Profit', s.profit, 'big'], [`Income tax ${s.rate}%`, -s.tax, 'muted'], ['Kept by the farm', s.kept, 'big'], ...(s.cap ? [['Spent on new things (not a running cost)', s.cap, 'muted']] : [])], s.played < 7 ? `You played ${s.played} of 7 days, so the weekly bills were for those days only.` : 'Sales, then each bill taking its bite, then what’s left.'), { date: `week of ${dateOf(s.mon - 7)}` });
    // a played day: count it, close any weeks gone by, age overdue bills, the report and lessons
    function tick() {
      const e = E(), t = today(); if (e.lastDay === t) return show();
      const wasMon = e.wk ? e.wk.mon : mondayOf(t), nowMon = mondayOf(t); let stmt = null;
      for (let m = wasMon + 7; m <= nowMon; m += 7) stmt = closeWeek(m) || stmt;
      if (!e.days.includes(t)) { e.days.push(t); if (e.days.length > 60) e.days.shift(); }
      if (e.lastDay != null) for (const b of due()) { b.days++; if (b.days >= 3 && !b.late) { b.late = true; b.fee = Math.max(1, Math.round(b.amt * 0.1)); b.amt += b.fee; offer('late'); } }
      e.lastDay = t; payDue();
      if (stmt) e.pending = { kind: 'week', stmt };
      A.save(); A.ui(true); return show();
    }
    // the prices on the board now (and at each report, for the trend)
    const prices = () => BOARD.map(([id, , , p]) => [id, Math.round(p * E().dial)]);
    function report(why) {
      const e = E(), r = { day: today(), why, dial: e.dial, tax: e.tax, prices: Object.fromEntries(prices()) }; e.reports.unshift(r); if (e.reports.length > 12) e.reports.length = 12; return r;
    }
    const spark = id => { const pts = E().reports.slice(0, 8).reverse().map(r => r.prices[id] || 0); if (pts.length < 2) return ''; const lo = Math.min(...pts), hi = Math.max(...pts), Y = v => (hi === lo ? 9 : 16 - ((v - lo) / (hi - lo)) * 14); return `<svg class="ih-ec-spark" viewBox="0 0 60 18" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts.map((v, i) => `${(i * 60 / (pts.length - 1)).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/></svg>`; };
    function reportHtml(r) {
      const e = E(), prev = e.reports[1], d = new Date(r.day * 864e5).toLocaleDateString('en-NZ', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      // (a grown-up's change reads as the market moving: the kids see the news, never who set it)
      const was = prev ? prev.dial : 1, what = r.why === 'dial' ? (r.dial > was ? 'Buyers want more farm produce than there is to go round, so prices are up across the market. A good time to sell.' : r.dial < was ? 'There’s plenty of farm produce around this week and buyers are paying less, so prices are down. Some farmers hold on to what keeps and sell later.' : 'Prices are steady this week.')
        : r.why === 'tax' ? `Income tax on business profit is now ${r.tax}%, from this week. Your farm pays it on its profit each Monday.` : 'Here’s how farm prices have moved this week.';
      return `<div class="ih-ec-rep"><div class="ih-ec-rep-h"><b>📰 Economic report</b><small>${A.esc(d)}</small></div>
        <p class="ih-ph-sub">An economic report tells everyone how prices are changing, so families and businesses can plan what to grow, when to sell and when to save.</p>
        <p><b>${A.esc(what)}</b></p>
        <div class="ih-ph-list">${BOARD.map(([id, em, name]) => { const now = r.prices[id], was = prev ? prev.prices[id] : now, up = now > was, dn = now < was; return `<div class="ih-ph-row"><span class="ih-ph-e">${em}</span><span><b>${name}</b><small>✨ ${now}${was !== now ? ` (was ✨ ${was})` : ''}</small></span><span class="ih-ec-tr ${up ? 'up' : dn ? 'dn' : ''}">${spark(id)}${up ? '▲' : dn ? '▼' : '–'}</span></div>`; }).join('')}</div></div>`;
    }
    // what pops up: the Monday statement and report, a grown-up's change, then any lesson waiting
    function show() {
      const e = E(); if (A.sheetOpen()) return;
      if (e.pending && e.pending.kind === 'week') { const s = e.pending.stmt; e.pending = null; const r = report('week'); offer('report'); A.save();
        return A.sheet(`<div class="ih-sh-h"><h3>Monday on the farm</h3><button class="ih-btn" data-a="ecOk" aria-label="Close">✕</button></div>${IH.slip(stmtSlip(s))}${reportHtml(r)}<div class="ih-row"><button class="ih-b1" data-a="ecOk">Got it</button></div>`); }
      if (e.pending && e.pending.kind === 'change') { const why = e.pending.why; e.pending = null; const r = report(why); offer('report'); A.save();
        return A.sheet(`<div class="ih-sh-h"><h3>News from the market</h3><button class="ih-btn" data-a="ecOk" aria-label="Close">✕</button></div>${reportHtml(r)}<div class="ih-row"><button class="ih-b1" data-a="ecOk">Got it</button></div>`); }
      const t = today(), key = e.queue.find(k => !(typeof e.lessons[k] === 'number' && e.lessons[k] === t)); // ("Later" waits till tomorrow)
      if (key) lesson(key);
    }
    // ---------- lesson cards
    let L = null;
    function lesson(key, stage = 'learn') {
      const x = LESSONS[key]; if (!x) return; L = { key, stage, tried: L && L.key === key ? L.tried : null, checked: L && L.key === key ? L.checked : null };
      const say = `<button class="ih-b2 ih-sm" data-a="lsSay">🔊 Read it to me</button>`;
      let inner = '';
      if (stage === 'learn') inner = `${x.learn.map(p => `<p>${A.esc(p)}</p>`).join('')}<div class="ih-row">${say}<button class="ih-b1" data-a="lsGo" data-s="try">Next</button></div>`;
      if (stage === 'try') inner = `<p class="ih-ls-k">Try it</p><p><b>${A.esc(x.tryQ)}</b></p><div class="ih-ls-opts">${x.tryO.map((o, i) => `<button class="${L.tried == null ? '' : i === x.tryA ? 'ok' : i === L.tried ? 'no' : ''}" data-a="lsTry" data-i="${i}" ${L.tried != null ? 'disabled' : ''}>${A.esc(o)}</button>`).join('')}</div>${L.tried != null ? `<p class="ih-ls-why">${L.tried === x.tryA ? 'Yes! ' : 'Not quite. '}${A.esc(x.tryWhy)}</p><div class="ih-row"><button class="ih-b1" data-a="lsGo" data-s="check">Next</button></div>` : ''}`;
      if (stage === 'check') inner = `<p class="ih-ls-k">Quick check: true or false?</p><p><b>${A.esc(x.check)}</b></p><div class="ih-ls-opts two">${[true, false].map(v => `<button class="${L.checked == null ? '' : v === x.checkA ? 'ok' : v === L.checked ? 'no' : ''}" data-a="lsCheck" data-v="${v}" ${L.checked != null ? 'disabled' : ''}>${v ? 'True' : 'False'}</button>`).join('')}</div>${L.checked != null ? `<p class="ih-ls-why">${L.checked === x.checkA ? 'Right! ' : 'Not quite. '}${A.esc(x.checkWhy)}</p><div class="ih-row"><button class="ih-b1" data-a="lsDone">Finish · ✨ +${x.xp} XP</button></div>` : ''}`;
      A.sheet(`<div class="ih-ls"><div class="ih-sh-h"><h3>${x.e} ${A.esc(x.title)}</h3><button class="ih-btn" data-a="lsLater" aria-label="Later">✕</button></div><p class="ih-ls-tag">A lesson · ${stage === 'learn' ? '1' : stage === 'try' ? '2' : '3'} of 3</p>${inner}${stage !== 'check' || L.checked == null ? '<button class="ih-ls-later" data-a="lsLater">Later</button>' : ''}</div>`, 'small');
    }
    function sayLesson() {
      const x = L && LESSONS[L.key]; if (!x || !window.speechSynthesis) return; speechSynthesis.cancel();
      const words = L.stage === 'learn' ? x.learn.join(' ') : L.stage === 'try' ? x.tryQ : x.check;
      const u = new SpeechSynthesisUtterance(words.replace(/✨/g, '')); u.rate = 0.9; u.lang = 'en-NZ'; speechSynthesis.speak(u);
    }
    // ---------- the actions (app.js passes on any data-a starting ec or ls)
    function act(a, el) {
      const e = E();
      if (a === 'ecOk') { A.closeSheet(); A.save(); setTimeout(show, 250); return true; }
      if (a === 'ecPay') { const b = e.bills.find(x => x.id === el.dataset.id), acc = A.acct(); if (!b || b.paid) return true; if (acc.bal < b.amt) { A.toast(`Your farm account has ✨ ${A.nf(acc.bal)}. Sell something, or invest from your wallet, to pay this.`); return true; } payDue(b.id); A.save(); A.ui(true); A.sound('buy'); A.toast(`${b.label} paid.`); return 'bank'; }
      if (a === 'ecDial') { const v = +el.dataset.v; if (v !== e.dial) { e.dial = v; e.pending = { kind: 'change', why: 'dial' }; A.save(); A.toast(`Farm earnings set to ${Math.round(v * 100)}%. The kids see it as market news in their next economic report.`); } return 'grownups'; }
      if (a === 'ecTax') { const v = +el.dataset.v; if (v !== e.tax) { e.tax = v; e.pending = { kind: 'change', why: 'tax' }; A.save(); A.toast(`Income tax on farm profit set to ${v}%. The kids see it as news in their next economic report.`); } return 'grownups'; }
      if (a === 'ecReport') { A.closeSheet(); setTimeout(show, 100); return true; }
      if (a === 'lsGo') { lesson(L.key, el.dataset.s); return true; }
      if (a === 'lsTry') { L.tried = +el.dataset.i; A.sound(L.tried === LESSONS[L.key].tryA ? 'pop' : 'tick'); lesson(L.key, 'try'); return true; }
      if (a === 'lsCheck') { L.checked = el.dataset.v === 'true'; A.sound(L.checked === LESSONS[L.key].checkA ? 'pop' : 'tick'); lesson(L.key, 'check'); return true; }
      if (a === 'lsSay') { sayLesson(); return true; }
      if (a === 'lsLater') { if (L) e.lessons[L.key] = today(); if (window.speechSynthesis) speechSynthesis.cancel(); L = null; A.closeSheet(); A.save(); return true; }
      if (a === 'lsDone') { const x = LESSONS[L.key]; e.lessons[L.key] = 'done'; e.queue = e.queue.filter(k => k !== L.key); A.wGain(x.xp, `lesson: ${x.title}`, 'CHORECAST LESSONS', [[`Lesson: ${x.title}`, x.xp]]); L = null; A.closeSheet(); A.save(); A.ui(true); A.sound('buy'); A.toast(`Lesson done: ✨ +${x.xp} XP.`); setTimeout(show, 600); return true; }
      if (a === 'lsOpen') { lesson(el.dataset.k); return true; }
      return false;
    }
    // ---------- what the Banking app shows
    function billsHtml() {
      const e = E(), list = due(), paid = e.bills.filter(b => b.paid).slice(-8).reverse(), when = d => dateOf(d);
      const row = b => `<div class="ih-ph-row"><span class="ih-ph-e">${b.late ? '⏰' : b.paid ? '✅' : '🧾'}</span><span><b>${A.esc(b.label)} · ✨ ${A.nf(b.amt)}</b><small>${b.paid ? `Paid ${when(b.paid)}` : b.late ? '<em class="ih-ec-late">Overdue</em>' : `Due since ${when(b.from)}`}${b.fee ? ` · includes a ✨ ${b.fee} late fee` : ''}<br>${A.esc(b.how || '')}</small></span>${b.paid ? '' : `<button class="ih-b1 ih-sm" data-a="ecPay" data-id="${b.id}">Pay</button>`}</div>`;
      const s = e.stmts[0], nextMon = mondayOf(today()) + 7;
      return `${list.length ? `<h4 class="ih-ph-h4">To pay</h4><div class="ih-ph-list">${list.map(row).join('')}</div>${overdue().length ? '<p class="ih-ph-sub">While a bill is overdue, the farm can only buy feed and seed.</p>' : ''}` : '<p class="ih-ph-sub">No bills waiting. 🎉</p>'}
        <h4 class="ih-ph-h4">Next Monday</h4><p class="ih-ph-sub">${A.esc(dateOf(nextMon))}: rates, power, water${vehicles().length ? ', registration' : ''}${animals().some(x => BIG.test(x)) ? ', vet care' : ''}, and income tax (${e.tax}%) on the week’s profit, for the days you play.</p>
        ${s ? `<h4 class="ih-ph-h4">Last statement</h4>${IH.slip(stmtSlip(s))}` : ''}
        ${paid.length ? `<h4 class="ih-ph-h4">Paid</h4><div class="ih-ph-list">${paid.map(row).join('')}</div>` : ''}
        ${Object.keys(LESSONS).filter(k => e.lessons[k] === 'done').length ? `<h4 class="ih-ph-h4">Lessons done</h4><div class="ih-bk-amts">${Object.keys(LESSONS).filter(k => e.lessons[k] === 'done').map(k => `<button class="ih-b2 ih-sm" data-a="lsOpen" data-k="${k}">${LESSONS[k].e} ${A.esc(LESSONS[k].title)}</button>`).join('')}</div>` : ''}`;
    }
    function grownHtml() {
      const e = E();
      return `<p class="ih-ph-sub">For grown-ups. In Chorecast these will sit in Grown-ups; here they’re in the game for trying out.</p>
        <h4 class="ih-ph-h4">Farm earnings</h4><p class="ih-ph-sub">What the farm’s produce sells for. The kids see a change as the market moving, in an economic report; it never says a grown-up set it.</p><div class="ih-seg">${[0.5, 1, 1.5].map(v => `<button class="${e.dial === v ? 'on' : ''}" data-a="ecDial" data-v="${v}">${Math.round(v * 100)}%</button>`).join('')}</div>
        <h4 class="ih-ph-h4">Income tax on farm profit</h4><p class="ih-ph-sub">The farm’s own tax, separate from family tax (which is only for real money from chores). The kids see a change as news.</p><div class="ih-seg">${[0, 5, 10, 15, 20].map(v => `<button class="${e.tax === v ? 'on' : ''}" data-a="ecTax" data-v="${v}">${v}%</button>`).join('')}</div>`;
    }
    return {
      tick, show, act, billsHtml, grownHtml, report, LESSONS,
      price: p => Math.max(1, Math.round(p * E().dial)),
      sale(xp) { E().wk.sales += xp; payDue(); },
      cost(xp, what) { if (RUNNING.test(what || '')) E().wk.run += xp; else E().wk.cap += xp; },
      // new farm things wait while a bill is overdue (feed and seed never do)
      canBuy(what) { if (!overdue().length || RUNNING.test(what || '')) return true; A.toast('A farm bill is overdue. Pay it in Banking first (feed and seed are still fine).'); return false; },
      // fuel and the like: paid now if the farm account can, otherwise a bill to pay
      charge(xp, what) { const a = A.acct(); E().wk.run += xp; if (a.bal >= xp) { a.bal -= xp; A.led('farm', -xp, `Paid for ${what}`, A.slipOf('CHORECAST FARM', 'Receipt', [[what[0].toUpperCase() + what.slice(1), xp]], [['Paid from the farm account', xp, 'big'], ['Farm account after', a.bal, 'muted']])); } else addBill(what[0].toUpperCase() + what.slice(1), xp, 'The farm account was short', 'fuel'); A.save(); },
      dueCount: () => due().length, overdueCount: () => overdue().length
    };
  };
  IH.economy.today = today;
})();
