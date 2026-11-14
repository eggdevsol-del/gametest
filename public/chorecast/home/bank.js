/* Chorecast homes: the farm's bank (economy plan, phase 5), inside the Banking app.
   - Loans: small, medium or large, fixed or variable, signed for with a finger, repaid every played day from the
     farm account. A missed repayment adds a 5% late fee and lowers the credit score; 3 in a row brings a warning;
     after 7 a large loan's security (the block of land it's secured against) goes back to the bank, with what was
     repaid (less the fees) returned. Small and medium loans are never repossessed. Animals and the home never are.
     Up to 3 at once, and only if the daily repayment fits the farm's income (the affordability check).
   - The credit score (300 to 850, starting at 600): on-time repayments raise it, missed ones lower it. A good score
     opens the large loan and takes a point off the rate. (In Chorecast itself this becomes the Trust Score.)
   - The savings jar: farm money put away earns 2% every Monday. A goal to save for. Insurance against storms.
   - The budget: a weekly limit for each kind of spending, opened by the budgeting lesson.
   - Interest rates move behind the scenes (a grown-up's setting); the kids see it as news, never as a parent's doing.
   economy.js makes one: IH.bank(A, X) with its own internals (X); it calls day(), week(), act() and the html parts. */
(function () {
  const IH = window.IsoHome = window.IsoHome || {};
  // the lessons that go with it, played in the game when they come up (economy.js adds them to its own)
  IH.econLessons = Object.assign(IH.econLessons || {}, {
    budget: { e: '📝', title: 'Making a budget', xp: 20,
      learn: ['A budget is a plan for your money: how much you expect to come in, and how much you’ll spend on each thing.', 'You set a limit for each kind of spending, then check as the week goes. If one runs over, you spend less somewhere else.'],
      tryQ: 'Your farm will earn ✨ 300 this week. Feed costs ✨ 120 and bills ✨ 80. How much is left for new things?', tryO: ['✨ 100', '✨ 300', '✨ 200'], tryA: 0, tryWhy: '300 − 120 − 80 = 100.',
      check: 'A budget helps you plan before you spend.', checkA: true, checkWhy: 'Yes: you decide where the money goes before it’s gone.' },
    debt: { e: '🏦', title: 'Borrowing and debt', xp: 20,
      learn: ['A loan is money you borrow now and pay back later, with interest: an extra amount for borrowing it.', 'The money you owe is called debt. A loan can help you buy something that earns money, but only borrow what you’re sure you can pay back every day.'],
      tryQ: 'You borrow ✨ 300 at 5% interest. How much do you pay back altogether?', tryO: ['✨ 300', '✨ 315', '✨ 350'], tryA: 1, tryWhy: '5% of 300 is 15, so 300 + 15 = 315.',
      check: 'With a loan, you pay back more than you borrowed.', checkA: true, checkWhy: 'Yes: the interest is the cost of borrowing.' },
    fixed: { e: '📈', title: 'Fixed and variable interest', xp: 20,
      learn: ['A fixed rate stays the same for the whole loan, so you always know what you’ll pay.', 'A variable rate moves with interest rates in the economy. It can start lower, but it can go up as well as down.'],
      tryQ: 'You want to know exactly what you’ll pay each day. Which rate suits you?', tryO: ['Fixed', 'Variable'], tryA: 0, tryWhy: 'A fixed rate never changes, so you can plan.',
      check: 'A variable rate can go up while you’re still paying the loan.', checkA: true, checkWhy: 'Yes: that’s the risk you take for a lower start.' },
    credit: { e: '⭐', title: 'Credit scores', xp: 20,
      learn: ['A credit score shows how well someone pays back what they borrow. Paying on time makes it go up; missing payments makes it go down.', 'Banks look at it to decide whether to lend, and at what rate. A good score means better loans.'],
      tryQ: 'Which helps your credit score most?', tryO: ['Paying every repayment on time', 'Borrowing as much as you can', 'Missing a payment now and then'], tryA: 0, tryWhy: 'On-time repayments are what build a good score.',
      check: 'Missing repayments lowers your credit score.', checkA: true, checkWhy: 'Yes, and it makes the next loan harder to get.' },
    contract: { e: '✍️', title: 'Reading a contract', xp: 20,
      learn: ['A contract is an agreement you sign. When you sign it, you promise to keep to everything in it.', 'Always read it first: how much, for how long, what it costs, and what happens if you can’t keep your promise.'],
      tryQ: 'When should you read a loan’s terms?', tryO: ['Before you sign', 'After you sign', 'Only if something goes wrong'], tryA: 0, tryWhy: 'Once it’s signed, you’ve agreed to it.',
      check: 'Once you sign a contract, you’ve agreed to everything in it.', checkA: true, checkWhy: 'Yes: that’s why you read it first.' },
    saving: { e: '🫙', title: 'Saving and interest', xp: 20,
      learn: ['Money you save can earn interest: the bank pays you a little for keeping it there.', 'Your savings jar earns 2% every Monday. Leave it in and next week the interest earns interest too. That’s called compound interest.'],
      tryQ: 'You have ✨ 200 in the jar. At 2%, how much interest comes on Monday?', tryO: ['✨ 2', '✨ 4', '✨ 20'], tryA: 1, tryWhy: '2% of 200 is 4.',
      check: 'Leaving your savings alone lets them grow.', checkA: true, checkWhy: 'Yes: interest is added on top, week after week.' },
    risk: { e: '☔', title: 'Risk and insurance', xp: 20,
      learn: ['A risk is something bad that might happen, like a storm damaging your fences.', 'Insurance means paying a small amount every week, so if something bad happens the insurer pays for it. You pay a small, sure cost to avoid a big, unlucky one.'],
      tryQ: 'Insurance costs ✨ 10 a week and storm repairs cost ✨ 80. After how many weeks has insurance cost more than one repair?', tryO: ['4 weeks', '8 weeks', '9 weeks'], tryA: 2, tryWhy: '8 weeks costs 80, the same as one repair; the ninth week takes it past.',
      check: 'Insurance is only worth it if something bad happens.', checkA: false, checkWhy: 'It also means a bad week can’t cost you a lot, so you don’t have to worry.' },
    goal: { e: '🎯', title: 'Setting a savings goal', xp: 20,
      learn: ['A savings goal is something you’re saving for, with a price and a plan.', 'Knowing how much you save each week tells you how long it’ll take. Saving a little more gets you there sooner.'],
      tryQ: 'You want ✨ 600 and save ✨ 150 a week. How many weeks will it take?', tryO: ['3 weeks', '4 weeks', '6 weeks'], tryA: 1, tryWhy: '150 × 4 = 600.',
      check: 'A goal with a plan is easier to reach.', checkA: true, checkWhy: 'Yes: you can see how far you’ve come and how far to go.' }
  });

  const LOANS = { small: { name: 'Small', amt: 300, days: 7, rate: 0.05 }, medium: { name: 'Medium', amt: 1000, days: 14, rate: 0.08 }, large: { name: 'Large', amt: 3000, days: 28, rate: 0.12 } };
  const RATES = { low: -0.02, normal: 0, high: 0.03 };
  const GOALS = [['block', '🗺️', 'A new block of land'], ['alpaca', '🦙', 'An alpaca', 700], ['cow', '🐄', 'A cow', 650], ['tractor', '🚜', 'A second tractor', 1500], ['beehive', '🐝', 'A beehive', 250]];
  const pct = r => `${Math.round(r * 1000) / 10}%`;
  const band = c => (c >= 740 ? 'Great' : c >= 670 ? 'Good' : c >= 580 ? 'Fair' : 'Building');

  IH.bank = (A, X) => {
    const E = () => { const e = X.E(); e.loans = e.loans || []; if (e.credit == null) e.credit = 600; if (!e.rates) e.rates = 'normal'; if (!e.allow) e.allow = 'all'; e.jar = e.jar || 0; e.budget = e.budget || {}; return e; };
    const fm = () => A.st().farm || {};
    const nf = A.nf, esc = A.esc;
    const credit = d => { const e = E(); e.credit = Math.max(300, Math.min(850, Math.round(e.credit + d))); };
    // the rate a loan of this size costs now: its own, the economy's interest rates, a point off for great credit
    const rateOf = (size, type) => Math.max(0.01, LOANS[size].rate + RATES[E().rates] + (type === 'variable' ? -0.01 : 0) + (E().credit >= 740 ? -0.01 : 0));
    const payOf = l => Math.round(l.amt / l.days + l.amt * (l.type === 'fixed' ? l.rate : rateOf(l.size, 'variable')) / l.days);
    const owedOf = l => payOf(l) * l.left + (l.fees || 0);
    // what the farm brings in a day: last week's sales over 7, or this week's so far
    const income = () => { const e = E(), s = e.stmts[0], wk = e.wk || {}, played = Math.max(1, e.days.filter(d => d >= (wk.mon || 0)).length); return Math.max(s ? s.sales / 7 : 0, (wk.sales || 0) / played); };
    const ownBlocks = () => (fm().land || []).filter(b => !b.free && !E().loans.some(l => l.sec === b.id && l.left > 0));
    // can this loan be taken? (null: yes; otherwise the reason, in words)
    function refuse(size) {
      const e = E(), L = LOANS[size], live = e.loans.filter(l => l.left > 0);
      if (e.allow === 'off') return 'Loans are switched off for now.';
      if (e.allow === 'small' && size !== 'small') return 'Only small loans for now.';
      if (live.length >= 3) return 'You already have 3 loans. Pay one off first.';
      if (live.some(l => l.missed)) return 'A loan has missed repayments. Catch up on it before borrowing more.';
      if (size === 'large' && e.credit < 650) return `A large loan needs a credit score of 650 (yours is ${e.credit}).`;
      if (size === 'large' && !ownBlocks().length) return 'A large loan is secured against a block of land you bought. You don’t have one free to secure it.';
      const per = Math.round(L.amt / L.days + L.amt * rateOf(size, 'fixed') / L.days), inc = income() - live.reduce((t, l) => t + payOf(l), 0);
      if (per > inc) return `The repayment would be ✨ ${nf(per)} a day, and your farm brings in about ✨ ${nf(Math.max(0, inc))} a day after your other loans. Banks only lend what you can pay back.`;
      return null;
    }
    // ---------- a played day: each loan's repayment, the storm
    function day() {
      const e = E(), acc = A.acct();
      for (const l of e.loans) {
        if (l.left <= 0) continue; const pay = payOf(l) + (l.fees || 0);
        if (acc.bal >= pay) {
          acc.bal -= pay; l.repaid = (l.repaid || 0) + pay; l.left--; l.missed = 0; const fee = l.fees || 0; l.fees = 0; credit(3); track('loan', pay);
          A.led('farm', -pay, `Loan repayment (${LOANS[l.size].name.toLowerCase()} loan)`, A.slipOf('CHORECAST FARM BANK', 'Loan repayment', [['Repayment', pay - fee], ...(fee ? [['Late fees', fee]] : [])], [['Paid from the farm account', pay, 'big'], ['Days left', l.left, 'muted'], ['Still owed', owedOf(l), 'muted']]));
          if (!l.left) { credit(15); X.news({ kind: 'note', h: '🎉 Loan paid off!', body: `You’ve paid back your ${LOANS[l.size].name.toLowerCase()} loan: ✨ ${nf(l.repaid)} for the ✨ ${nf(l.amt)} you borrowed. Your credit score went up to ${E().credit}.` }); }
        } else {
          l.missed = (l.missed || 0) + 1; const fee = Math.max(1, Math.round(payOf(l) * 0.05)); l.fees = (l.fees || 0) + fee; credit(-20);
          if (l.missed === 1) X.news({ kind: 'note', h: '⏰ A loan repayment was missed', body: `Your farm account didn’t have the ✨ ${nf(pay)} for today’s repayment. A late fee of ✨ ${fee} was added and your credit score went down to ${E().credit}. Sell something, or invest from your wallet, so tomorrow’s goes through.` });
          if (l.missed === 3) { X.offer('debt'); X.news({ kind: 'note', h: '⚠️ Three repayments missed', body: `That’s three in a row. Your credit score is ${E().credit} now.${l.size === 'large' ? ' After seven, the land this loan is secured against goes back to the bank.' : ''} Please put money in the farm account.` }); }
          if (l.missed >= 7 && l.size === 'large') repossess(l);
        }
      }
      // storms: forecast a day ahead (never a surprise), then damage the fences, unless insured
      if (e.storm && X.today() >= e.storm) { e.storm = 0; if (e.ins) { X.news({ kind: 'note', h: '⛈️ The storm came through', body: 'It knocked down some fences. Your insurance paid the ✨ 80 to fix them.' }); } else { X.bill('Storm repairs', 80, 'Fences knocked down by the storm'); X.news({ kind: 'note', h: '⛈️ The storm came through', body: 'It knocked down some fences. The repairs cost ✨ 80, and the bill is in Banking. Insurance would have paid it.' }); } }
      else if (!e.storm && Math.random() < 1 / 25) { e.storm = X.today() + 1; X.offer('risk'); X.news({ kind: 'note', h: '🌩️ Storm forecast for tomorrow', body: `Strong winds are on the way. Storms can knock down fences (about ✨ 80 to fix). ${e.ins ? 'Your insurance covers it.' : 'Insurance (✨ 10 a week, in Banking) would cover it, from today.'}` }); }
    }
    function repossess(l) {
      const f = fm(), b = (f.land || []).find(q => q.id === l.sec); l.left = 0;
      const back = Math.max(0, (l.repaid || 0) - (l.fees || 0));
      if (b) {
        const R = IH.farmLand ? IH.farmLand.rectOf(b.slot) : null, inR = p => R && p.x0 >= R[0] && p.x1 <= R[2] && p.z0 >= R[1] && p.z1 <= R[3];
        const gone = (f.paddocks || []).filter(inR), keep = (f.paddocks || []).filter(p => !inR(p));
        for (const a of f.animals || []) if (gone.some(p => p.id === a.pad) && keep.length) a.pad = keep[0].id; // (animals are never taken: they come home)
        f.paddocks = keep; f.items = (f.items || []).filter(it => !(R && it.x > R[0] && it.x < R[2] && it.z > R[1] && it.z < R[3])); f.land = f.land.filter(q => q !== b);
      }
      if (back) { A.acct().bal += back; A.led('farm', back, 'Returned after the land went back to the bank', null); }
      credit(-60); X.news({ kind: 'note', h: '🏦 The land went back to the bank', body: `After seven missed repayments, the block your large loan was secured against belongs to the bank now. ✨ ${nf(back)} of what you’d repaid (less the fees) has come back to your farm account. Your animals came home safe.` });
    }
    // ---------- Monday: insurance, the jar's interest
    function week(k) {
      const e = E(), out = [];
      if (e.ins) out.push(X.bill('Insurance', Math.round(10 * k), 'Storms and damage: ✨ 10 a week'));
      if (e.jar >= 10) { const add = Math.max(1, Math.round(e.jar * 0.02)); e.jar += add; A.led('farm', 0, `Savings jar interest: ✨ ${add}`, A.slipOf('CHORECAST FARM BANK', 'Interest', [['Savings jar interest (2%)', add]], [['Jar after', e.jar, 'big']])); }
      return out.filter(Boolean);
    }
    // ---------- the Banking app's parts
    function acctHtml() {
      const e = E(), acc = A.acct(), g = e.goal, have = Math.round(acc.bal + e.jar), s = e.stmts[0], per = s ? Math.max(0, s.kept) : 0;
      const gTarget = g ? (g.k === 'block' && IH.farmLand ? IH.farmLand.price((fm().land || []).filter(b => !b.free).length) : g.target) : 0;
      return `<h4 class="ih-ph-h4">🫙 Savings jar · ✨ ${nf(e.jar)}</h4><p class="ih-ph-sub">Farm money put away. It earns 2% every Monday.</p><div class="ih-bk-amts">${[20, 50, 100].filter(n => n <= acc.bal).map(n => `<button class="ih-b2 ih-sm" data-a="ecJar" data-n="${n}">Put in ✨ ${n}</button>`).join('')}${e.jar ? `<button class="ih-b2 ih-sm" data-a="ecJar" data-n="-${e.jar}">Take it all out</button>` : ''}</div>
        <h4 class="ih-ph-h4">🎯 Saving for</h4>${g ? `<p class="ih-ph-sub"><b>${g.e} ${esc(g.name)}</b>: ✨ ${nf(Math.min(have, gTarget))} of ✨ ${nf(gTarget)} (farm account and jar)</p><div class="ih-cc-bar"><i style="width:${Math.round(Math.min(1, have / gTarget) * 100)}%"></i></div><p class="ih-ph-sub">${have >= gTarget ? 'You can afford it now! 🎉' : per ? `At last week’s ✨ ${nf(per)} kept, about ${Math.ceil((gTarget - have) / per)} more week${Math.ceil((gTarget - have) / per) === 1 ? '' : 's'}.` : 'Once the farm makes a profit, you’ll see how long it’ll take.'}</p><button class="ih-bk-grown" data-a="ecGoal" data-k="">Change goal</button>` : `<div class="ih-bk-amts">${GOALS.map(([k, em, nm, xp]) => `<button class="ih-b2 ih-sm" data-a="ecGoal" data-k="${k}">${em} ${esc(nm)}${xp ? ` · ✨ ${nf(xp)}` : ''}</button>`).join('')}</div>`}
        <h4 class="ih-ph-h4">⭐ Credit score · ${e.credit}</h4><p class="ih-ph-sub">${band(e.credit)}. Paying loans on time raises it; missing a repayment lowers it.</p>
        <h4 class="ih-ph-h4">☔ Insurance</h4><p class="ih-ph-sub">${e.ins ? 'On: storms and damage are covered, for ✨ 10 every Monday.' : 'Off. ✨ 10 a week covers storm damage.'}</p><button class="ih-b2 ih-sm" data-a="ecIns">${e.ins ? 'Stop insurance' : 'Get insurance'}</button>`;
    }
    function loansHtml() {
      const e = E(), live = e.loans.filter(l => l.left > 0), done = e.loans.filter(l => l.left <= 0).slice(-3).reverse();
      const card = l => `<div class="ih-cc-card"><p><b>${LOANS[l.size].name} loan · ✨ ${nf(l.amt)}</b></p><p class="ih-ph-sub">${l.type === 'fixed' ? `Fixed ${pct(l.rate)}` : `Variable, now ${pct(rateOf(l.size, 'variable'))}`} · ✨ ${nf(payOf(l))} a day · ${l.left} day${l.left === 1 ? '' : 's'} left · ✨ ${nf(owedOf(l))} still owed${l.fees ? ` (with ✨ ${l.fees} in late fees)` : ''}${l.missed ? ` · <b class="ih-ec-late">${l.missed} missed</b>` : ''}</p>${l.sig ? `<img class="ih-sig-img" alt="Your signature" src="${l.sig}">` : ''}</div>`;
      const rows = Object.entries(LOANS).map(([k, L]) => { const no = refuse(k), r = rateOf(k, 'fixed'); return `<div class="ih-ph-row"><span class="ih-ph-e">🏦</span><span><b>${L.name}: ✨ ${nf(L.amt)} over ${L.days} days</b><small>From ${pct(r)} · about ✨ ${nf(Math.round(L.amt * (1 + r) / L.days))} a day${k === 'large' ? ' · secured against a block of land' : ''}${no ? `<br>${esc(no)}` : ''}</small></span>${no ? '' : `<button class="ih-b1 ih-sm" data-a="ecLoan" data-k="${k}">Apply</button>`}</div>`; }).join('');
      return `<p class="ih-ph-sub">Borrow to buy something that earns, then pay it back a little every day you play. Credit score: <b>${e.credit}</b> (${band(e.credit)}).</p>${live.length ? `<h4 class="ih-ph-h4">Your loans</h4>${live.map(card).join('')}` : ''}<h4 class="ih-ph-h4">Borrow</h4><div class="ih-ph-list">${rows}</div>${done.length ? `<h4 class="ih-ph-h4">Paid off</h4>${done.map(l => `<p class="ih-ph-sub">✅ ${LOANS[l.size].name} loan of ✨ ${nf(l.amt)}: ✨ ${nf(l.repaid || 0)} paid back</p>`).join('')}` : ''}`;
    }
    // the agreement: every term on one screen, then a signature
    let SIGN = null;
    function terms(size, type) {
      const L = LOANS[size], r = rateOf(size, type), per = Math.round(L.amt / L.days + L.amt * r / L.days), sec = size === 'large' ? ownBlocks()[0] : null;
      SIGN = { size, type: type || 'fixed', sec: sec ? sec.id : null };
      const slot = sec && IH.farmLand ? IH.farmLand.SLOT_NAME[sec.slot].toLowerCase() : '';
      A.sheet(`<div class="ih-sh-h"><h3>✍️ Loan agreement</h3><button class="ih-btn" data-a="ecLoanX" aria-label="Close">✕</button></div>
        <div class="ih-bk-amts">${['fixed', 'variable'].map(t => `<button class="ih-b${SIGN.type === t ? '1' : '2'} ih-sm" data-a="ecLoan" data-k="${size}" data-t="${t}">${t === 'fixed' ? `Fixed ${pct(rateOf(size, 'fixed'))}` : `Variable ${pct(rateOf(size, 'variable'))}`}</button>`).join('')}</div>
        <p class="ih-ph-sub">${SIGN.type === 'fixed' ? 'Fixed: the rate stays the same to the end. You always know what you’ll pay.' : 'Variable: starts a point lower, but moves when interest rates change. It could go up or down.'}</p>
        <div class="ih-terms"><p><b>The bank lends you ✨ ${nf(L.amt)}</b>, paid into your farm account today.</p><ul>
          <li>Interest: ${pct(r)}, ${SIGN.type === 'fixed' ? 'fixed' : 'variable (it can change)'}.</li>
          <li>You pay back ✨ ${nf(per)} every day you play, for ${L.days} days: ✨ ${nf(per * L.days)} altogether${SIGN.type === 'variable' ? ' if rates stay the same' : ''}.</li>
          <li>Repayments come out of the farm account by themselves.</li>
          <li>Miss one and a late fee of 5% is added, and your credit score goes down.</li>
          ${sec ? `<li>This loan is secured against your ${esc(slot)} block of land. Miss 7 repayments in a row and that block goes back to the bank. What you’ve repaid, less fees, comes back to you. Your animals and your home are never taken.</li>` : '<li>Nothing is taken if you miss repayments, but new loans stop until it’s paid.</li>'}</ul></div>
        <p class="ih-ph-sub">Sign with your finger to agree to all of this.</p><canvas class="ih-sig" width="300" height="110" aria-label="Sign here"></canvas>
        <div class="ih-row"><button class="ih-b2" data-a="ecSigClear">Clear</button><button class="ih-b1" data-a="ecSign">Sign and borrow ✨ ${nf(L.amt)}</button></div>`);
      setTimeout(bindSig, 30);
    }
    function bindSig() {
      const cv = document.querySelector('.ih-sig'); if (!cv) return; const g = cv.getContext('2d'); g.lineWidth = 2.6; g.lineCap = 'round'; g.strokeStyle = '#1C2340'; let down = false, n = 0;
      const at = ev => { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) * cv.width / r.width, (ev.clientY - r.top) * cv.height / r.height]; };
      cv.onpointerdown = ev => { down = true; cv.setPointerCapture(ev.pointerId); const [x, y] = at(ev); g.beginPath(); g.moveTo(x, y); };
      cv.onpointermove = ev => { if (!down) return; const [x, y] = at(ev); g.lineTo(x, y); g.stroke(); n++; SIGN.strokes = n; };
      cv.onpointerup = () => { down = false; };
    }
    function sign() {
      const cv = document.querySelector('.ih-sig'); if (!SIGN || !cv) return;
      if ((SIGN.strokes || 0) < 8) return A.toast('Sign in the box first: a few strokes of your finger.');
      const no = refuse(SIGN.size); if (no) return A.toast(no);
      const L = LOANS[SIGN.size], l = { id: Math.random().toString(36).slice(2, 9), size: SIGN.size, amt: L.amt, days: L.days, left: L.days, type: SIGN.type, rate: rateOf(SIGN.size, SIGN.type), fees: 0, missed: 0, repaid: 0, at: Date.now(), sec: SIGN.sec, sig: cv.toDataURL('image/png') };
      E().loans.push(l); A.acct().bal += l.amt;
      A.led('farm', l.amt, `Borrowed: ${L.name.toLowerCase()} loan`, A.slipOf('CHORECAST FARM BANK', 'Loan agreement', [[`${L.name} loan`, l.amt], [`${l.type === 'fixed' ? 'Fixed' : 'Variable'} rate ${pct(l.rate)}`, null], [`${l.days} daily repayments of`, payOf(l)]], [['Into the farm account', l.amt, 'big'], ['To pay back', payOf(l) * l.days, 'muted']], 'Signed by you. A copy is kept in Banking, under Loans.'));
      SIGN = null; A.closeSheet(); A.save(); A.ui(true); A.sound('buy'); A.toast(`✨ ${nf(l.amt)} is in your farm account. The first repayment comes out tomorrow.`); X.offer('fixed'); X.offer('credit'); X.offer('contract');
      return true;
    }
    // the budget: a weekly limit for each kind of spending, against what's gone so far this week
    const CATS = [['feed', '🌾', 'Feed and seed'], ['bills', '🧾', 'Bills'], ['fuel', '⛽', 'Fuel'], ['new', '🛒', 'New things'], ['loan', '🏦', 'Loan repayments']];
    function budgetHtml() {
      const e = E(); if (e.lessons.budget !== 'done') return `<div class="ih-cc-card"><p><b>Your budget opens after the budgeting lesson.</b></p><p class="ih-ph-sub">It’s short: what a budget is, and how to plan one.</p><button class="ih-b1 ih-sm" data-a="lsOpen" data-k="budget">Start the lesson</button></div>`;
      const cat = (e.wk && e.wk.cat) || {}, sales = Math.round((e.wk && e.wk.sales) || 0), spent = CATS.reduce((t, [k]) => t + (cat[k] || 0), 0);
      return `<div class="ih-cc-hero"><small>This week so far</small><b>✨ ${nf(sales)} in · ✨ ${nf(spent)} out</b><small><b class="${sales >= spent ? 'ih-ec-up' : 'ih-ec-late'}">${sales - spent >= 0 ? `✨ ${nf(sales - spent)} ahead` : `✨ ${nf(spent - sales)} behind`}</b></small><small>Wallet ✨ ${nf(A.wallet())} · Farm ✨ ${nf(A.acct().bal)} · Jar ✨ ${nf(e.jar)}</small><small>Put into the farm from your wallet so far: ✨ ${nf(A.acct().invested || 0)}</small></div>
        <p class="ih-ph-sub">Set a weekly limit for each kind of spending. You’ll get a warning at 80%.</p><div class="ih-ph-list">${CATS.map(([k, em, nm]) => { const lim = e.budget[k] || 0, s0 = Math.round(cat[k] || 0), over = lim && s0 > lim; return `<div class="ih-ph-row"><span class="ih-ph-e">${em}</span><span><b>${nm}</b><small>${lim ? `✨ ${nf(s0)} of ✨ ${nf(lim)}${over ? ' · <b class="ih-ec-late">over</b>' : ''}` : `✨ ${nf(s0)} so far · no limit set`}</small>${lim ? `<i class="ih-cc-bar"><i style="width:${Math.min(100, Math.round(s0 / lim * 100))}%"></i></i>` : ''}</span><button class="ih-b2 ih-sm" data-a="ecBud" data-k="${k}" data-d="-20">−</button><button class="ih-b2 ih-sm" data-a="ecBud" data-k="${k}" data-d="20">+</button></div>`; }).join('')}</div>`;
    }
    // spending, by kind, for the budget (and the 80% warning)
    function track(kind, xp) {
      const e = E(), wk = e.wk; if (!wk) return; wk.cat = wk.cat || {}; wk.cat[kind] = (wk.cat[kind] || 0) + xp; wk.warn = wk.warn || {};
      const lim = e.budget[kind]; if (lim && wk.cat[kind] >= lim * 0.8 && !wk.warn[kind]) { wk.warn[kind] = 1; A.toast(`Budget: ${CATS.find(c => c[0] === kind)[2].toLowerCase()} is at ${Math.round(wk.cat[kind] / lim * 100)}% of this week’s ✨ ${nf(lim)}.`); }
    }
    function grownHtml() {
      const e = E();
      return `<h4 class="ih-ph-h4">Loans</h4><p class="ih-ph-sub">Which loans the kids can take. (In Chorecast: small only for Sprouts by default.)</p><div class="ih-seg">${[['off', 'Off'], ['small', 'Small only'], ['all', 'All']].map(([k, nm]) => `<button class="${e.allow === k ? 'on' : ''}" data-a="ecAllow" data-v="${k}">${nm}</button>`).join('')}</div>
        <h4 class="ih-ph-h4">Interest rates</h4><p class="ih-ph-sub">Moves loan rates (variable loans as they go). The kids see it as news about the economy, never as your doing.</p><div class="ih-seg">${Object.keys(RATES).map(k => `<button class="${e.rates === k ? 'on' : ''}" data-a="ecRates" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>`;
    }
    function act(a, el) {
      const e = E(), acc = A.acct();
      if (a === 'ecLoan') { if (e.lessons.debt !== 'done') { X.lesson('debt'); A.toast('First, a short lesson on borrowing.'); return true; } const no = refuse(el.dataset.k); if (no) { A.toast(no); return true; } terms(el.dataset.k, el.dataset.t || (SIGN && SIGN.size === el.dataset.k ? SIGN.type : 'fixed')); return true; }
      if (a === 'ecLoanX') { SIGN = null; A.closeSheet(); return true; }
      if (a === 'ecSigClear') { const cv = document.querySelector('.ih-sig'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); if (SIGN) SIGN.strokes = 0; return true; }
      if (a === 'ecSign') { sign(); return true; }
      if (a === 'ecJar') { const n = +el.dataset.n; X.offer('saving'); if (n > 0) { if (acc.bal < n) return true; acc.bal -= n; e.jar += n; A.led('farm', -n, 'Put in the savings jar', null); } else { const m = Math.min(e.jar, -n); e.jar -= m; acc.bal += m; A.led('farm', m, 'Taken out of the savings jar', null); } A.save(); A.sound('pop'); return 'bank'; }
      if (a === 'ecGoal') { const g = GOALS.find(q => q[0] === el.dataset.k); e.goal = g ? { k: g[0], e: g[1], name: g[2], target: g[3] || 0 } : null; X.offer('goal'); A.save(); return 'bank'; }
      if (a === 'ecIns') { e.ins = !e.ins; X.offer('risk'); A.save(); A.toast(e.ins ? 'Insured: ✨ 10 every Monday covers storm damage.' : 'Insurance stopped.'); return 'bank'; }
      if (a === 'ecBud') { const k = el.dataset.k; e.budget[k] = Math.max(0, (e.budget[k] || 0) + +el.dataset.d); A.save(); return 'bank'; }
      if (a === 'ecAllow') { e.allow = el.dataset.v; A.save(); return 'grownups'; }
      if (a === 'ecRates') { const v = el.dataset.v; if (v !== e.rates) { const up = RATES[v] > RATES[e.rates]; e.rates = v; X.news({ kind: 'note', h: '📰 Economic report', body: up ? 'Interest rates are up across the economy this week. Borrowing costs more: new loans and variable-rate loans cost more each day.' : 'Interest rates are down across the economy this week. Borrowing costs less: new loans and variable-rate loans cost less each day.' }); X.offer('fixed'); A.save(); A.toast('Interest rates set. The kids see it as economic news.'); } return 'grownups'; }
      return false;
    }
    return { day, week, act, track, acctHtml, loansHtml, budgetHtml, grownHtml, live: () => E().loans.filter(l => l.left > 0).length };
  };
})();
