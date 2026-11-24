/* ---------- Maths practice ----------
   Ten quick questions at the kid's level, with fresh numbers every time, for after today's new lessons (or any time).
   Each kind follows the NZ Curriculum's maths for the band's school years: Sprouts about Years 3 to 5, Builders 6 to
   8, Makers 9 and 10. Practice mixes in some of the band below, leans towards the kinds a kid gets wrong most, and
   pays a little XP per right answer.
   Every question works out its own answer in code, and also carries `calc`, the sum as plain JavaScript maths, which
   tests/lesson-pace.test.mjs works out again on its own (`unit` says how to compare: a time, a fraction or a
   number). So a generated question can't have a wrong answer. Keep this block free of anything from the rest of the
   app: the test reads it on its own. */
/* MATHS-START */
const MATHS = (() => {
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1)), pick = (r, xs) => xs[Math.floor(r() * xs.length)];
  const mix = (r, xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const num = v => String(+(+v).toFixed(2)), neg = v => (v < 0 ? `−${Math.abs(v)}` : String(v));
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a)), frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
  const commas = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const hm = mins => `${Math.floor(mins / 60) % 12 || 12}:${String(mins % 60).padStart(2, '0')}`;
  // A multiple-choice question: the right answer and wrong ones, without repeats
  const mcq = (r, q, right, wrongs, calc, unit) => { const w = [...new Set(wrongs.map(String))].filter(x => x !== String(right)).slice(0, 3); return { type: 'mcq', q, opts: mix(r, [{ t: String(right), ok: true }, ...w.map(t => ({ t, ok: false }))]), calc, unit }; };
  const gap = (q, a, calc) => ({ type: 'gap', q, a: num(a), calc });
  const K = {
    // Sprouts: Years 3 to 5
    add: r => { const a = ri(r, 12, 89), b = ri(r, 11, 89); return gap(`${a} + ${b} = _`, a + b, `${a}+${b}`); },
    sub: r => { const a = ri(r, 30, 99), b = ri(r, 11, a - 5); return gap(`${a} − ${b} = _`, a - b, `${a}-${b}`); },
    times: r => { const a = pick(r, [2, 3, 4, 5, 10, 6, 7, 8, 9]), b = ri(r, 2, 10); return gap(`${a} × ${b} = _`, a * b, `${a}*${b}`); },
    divide: r => { const b = pick(r, [2, 3, 4, 5, 10]), q = ri(r, 2, 10); return gap(`${b * q} ÷ ${b} = _`, q, `${b * q}/${b}`); },
    place: r => { const n = ri(r, 1000, 9999), p = ri(r, 0, 3), d = Math.floor(n / 10 ** p) % 10 || 1, m = n - (Math.floor(n / 10 ** p) % 10) * 10 ** p + d * 10 ** p; return gap(`In ${commas(m)}, what is the ${d} in the ${['ones', 'tens', 'hundreds', 'thousands'][p]} place worth? _`, d * 10 ** p, `${d}*${10 ** p}`); },
    round10: r => { let n = ri(r, 11, 99); if (n % 10 === 5) n++; return gap(`Round ${n} to the nearest ten: _`, Math.round(n / 10) * 10, `Math.round(${n}/10)*10`); },
    half: r => { const n = ri(r, 2, 50) * 2; return gap(`Half of ${n} is _`, n / 2, `${n}/2`); },
    clock: r => { const h = ri(r, 1, 10), m = pick(r, [0, 15, 30, 45]), add = pick(r, [15, 30, 45, 60]), t = h * 60 + m + add; return mcq(r, `It’s ${hm(h * 60 + m)}. What time is it ${add === 60 ? 'an hour' : `${add} minutes`} later?`, hm(t), [hm(t + 15), hm(t - 15), hm(h * 60 + add)], `${h}*60+${m}+${add}`, 'time'); },
    // Builders: Years 6 to 8
    times12: r => { const a = ri(r, 3, 12), b = ri(r, 3, 12); return gap(`${a} × ${b} = _`, a * b, `${a}*${b}`); },
    divide12: r => { const b = ri(r, 3, 12), q = ri(r, 3, 12); return gap(`${b * q} ÷ ${b} = _`, q, `${b * q}/${b}`); },
    addbig: r => { const a = ri(r, 120, 4800), b = ri(r, 120, 4800); return gap(`${a} + ${b} = _`, a + b, `${a}+${b}`); },
    subbig: r => { const a = ri(r, 500, 5000), b = ri(r, 100, a - 50); return gap(`${a} − ${b} = _`, a - b, `${a}-${b}`); },
    mult21: r => { const a = ri(r, 13, 99), b = ri(r, 3, 9); return gap(`${a} × ${b} = _`, a * b, `${a}*${b}`); },
    fracof: r => { const d = pick(r, [2, 3, 4, 5, 10]), n = ri(r, 1, d - 1), q = d * ri(r, 2, 12); return gap(`${n}/${d} of ${q} = _`, q / d * n, `${q}/${d}*${n}`); },
    equiv: r => { const d = pick(r, [3, 4, 5, 6]), n = ri(r, 1, d - 1), k = ri(r, 2, 4); return mcq(r, `Which fraction is the same as ${n}/${d}?`, `${n * k}/${d * k}`, [`${n}/${d * k}`, `${n * k}/${d}`, `${n + k}/${d + k}`], `${n}/${d}`, 'frac'); },
    decadd: r => { const a = ri(r, 11, 99) / 10, b = ri(r, 11, 99) / 10; return gap(`${a} + ${b} = _`, a + b, `${a}+${b}`); },
    percent: r => { const p = pick(r, [10, 25, 50, 20, 75]), v = 20 * ri(r, 1, 10); return gap(`${p}% of ${v} = _`, v * p / 100, `${v}*${p}/100`); },
    area: r => { const w = ri(r, 3, 12), h = ri(r, 2, 9); return r() < 0.5 ? gap(`A rectangle is ${w} m long and ${h} m wide. Its area is _ m²`, w * h, `${w}*${h}`) : gap(`A rectangle is ${w} m long and ${h} m wide. The distance around it (its perimeter) is _ m`, 2 * (w + h), `2*(${w}+${h})`); },
    order: r => { const a = ri(r, 2, 20), b = ri(r, 2, 9), c = ri(r, 2, 9); return gap(`${a} + ${b} × ${c} = _`, a + b * c, `${a}+${b}*${c}`); },
    negative: r => { const a = ri(r, 1, 9), b = ri(r, a + 1, 15); return mcq(r, `${a} − ${b} = ?`, neg(a - b), [neg(b - a), neg(-(a + b)), neg(a - b + 2)], `${a}-${b}`); },
    mean: r => { const xs = [ri(r, 2, 20), ri(r, 2, 20), ri(r, 2, 20)], last = 4 - (xs.reduce((s, x) => s + x, 0) % 4) + 4 * ri(r, 0, 3); xs.push(last); return gap(`The mean (average) of ${xs.join(', ')} is _`, xs.reduce((s, x) => s + x, 0) / 4, `(${xs.join('+')})/4`); },
    // Makers: Years 9 and 10
    integers: r => { const a = ri(r, 2, 12), b = ri(r, 2, 9), t = ri(r, 0, 2); const [q, v, c] = t === 0 ? [`(−${a}) × ${b}`, -a * b, `(-${a})*${b}`] : t === 1 ? [`(−${a}) + (−${b})`, -a - b, `(-${a})+(-${b})`] : [`${a} − (−${b})`, a + b, `${a}-(-${b})`]; return mcq(r, `${q} = ?`, neg(v), [neg(-v), neg(v + b), neg(v - b)], c); },
    brackets: r => { const a = ri(r, 2, 12), b = ri(r, 2, 12), c = ri(r, 2, 6), d = ri(r, 1, 10); return gap(`(${a} + ${b}) × ${c} − ${d} = _`, (a + b) * c - d, `(${a}+${b})*${c}-${d}`); },
    equation: r => { const a = ri(r, 2, 9), x = ri(r, 1, 12), b = ri(r, 1, 20); return gap(`Solve ${a}x + ${b} = ${a * x + b}. x = _`, x, `(${a * x + b}-${b})/${a}`); },
    discount: r => { const v = 20 * ri(r, 2, 15), p = pick(r, [10, 20, 25, 50]); return gap(`A $${v} jacket is ${p}% off. It now costs $_`, v * (1 - p / 100), `${v}*(1-${p}/100)`); },
    ratio: r => { const a = ri(r, 1, 4), b = ri(r, a + 1, 6), t = (a + b) * ri(r, 2, 12); return gap(`Share $${t} in the ratio ${a}:${b}. The bigger share is $_`, t * b / (a + b), `${t}*${b}/(${a}+${b})`); },
    triangle: r => { const b = ri(r, 2, 14), h = ri(r, 2, 10) * 2; return gap(`A triangle has a base of ${b} cm and a height of ${h} cm. Its area is _ cm²`, b * h / 2, `${b}*${h}/2`); },
    pythag: r => { const [a, b] = pick(r, [[3, 4], [5, 12], [8, 15], [6, 8], [9, 12], [7, 24]]); return gap(`A right-angled triangle has short sides of ${a} cm and ${b} cm. The longest side is _ cm`, Math.sqrt(a * a + b * b), `Math.sqrt(${a}*${a}+${b}*${b})`); },
    powers: r => { const t = ri(r, 0, 2), a = ri(r, 2, t === 1 ? 6 : 15); return t === 0 ? gap(`${a}² = _`, a * a, `${a}*${a}`) : t === 1 ? gap(`${a}³ = _`, a ** 3, `${a}*${a}*${a}`) : gap(`The square root of ${a * a} is _`, a, `Math.sqrt(${a * a})`); },
    simplify: r => { const d = pick(r, [3, 4, 5, 7, 8]), n = ri(r, 1, d - 1), k = ri(r, 2, 6); if (gcd(n, d) > 1) return K.simplify(r); return mcq(r, `Simplify ${n * k}/${d * k}`, `${n}/${d}`, [`${n * k}/${d}`, `${n + 1}/${d + 1}`, `${n}/${d * 2}`], `${n * k}/${d * k}`, 'frac'); },
    chance: r => { const a = ri(r, 1, 7), b = (a + ri(r, 0, 5)) % 7 + 1; return mcq(r, `A bag has ${a} red and ${b} blue marbles. You pick one without looking. What’s the chance it’s red?`, frac(a, a + b), [frac(b, a + b), `${a}/${b}`, `1/${a + b}`, '1/2'], `${a}/(${a}+${b})`, 'frac'); },
    median: r => { const xs = Array.from({ length: 5 }, () => ri(r, 1, 30)), s = xs.slice().sort((a, b) => a - b); return gap(`The median (middle number) of ${xs.join(', ')} is _`, s[2], `[${xs.join(',')}].sort((a,b)=>a-b)[2]`); },
  };
  const LEVELS = [
    ['add', 'sub', 'times', 'divide', 'place', 'round10', 'half', 'clock'],
    ['times12', 'divide12', 'addbig', 'subbig', 'mult21', 'fracof', 'equiv', 'decadd', 'percent', 'area', 'order', 'negative', 'mean'],
    ['integers', 'brackets', 'equation', 'discount', 'ratio', 'triangle', 'pythag', 'powers', 'simplify', 'chance', 'median'],
  ];
  const NAMES = { add: 'Adding', sub: 'Taking away', times: 'Times tables', divide: 'Dividing', place: 'Place value', round10: 'Rounding', half: 'Halves', clock: 'Telling the time', times12: 'Times tables to 12', divide12: 'Dividing', addbig: 'Adding big numbers', subbig: 'Taking away big numbers', mult21: 'Multiplying', fracof: 'Fractions of amounts', equiv: 'Equal fractions', decadd: 'Decimals', percent: 'Percentages', area: 'Area and perimeter', order: 'Order of operations', negative: 'Negative numbers', mean: 'Averages', integers: 'Integers', brackets: 'Brackets first', equation: 'Equations', discount: 'Discounts', ratio: 'Ratios', triangle: 'Triangle area', pythag: 'Pythagoras', powers: 'Powers and roots', simplify: 'Simplifying fractions', chance: 'Chance', median: 'Median' };
  // n questions for a band (0 to 2): mostly its own kinds, some from the band below, more of the kinds marked weak
  function set(r, band, n = 10, stats = {}) {
    const own = LEVELS[band] || LEVELS[0], below = band > 0 ? LEVELS[band - 1] : [];
    const weight = k => { const s = stats[k] || {}; return s.n >= 3 ? 1 + 2 * (1 - s.r / s.n) : 1.5; };
    const out = [];
    for (let i = 0; i < n; i++) {
      const pool = below.length && r() < 0.3 ? below : own, ws = pool.map(weight), tot = ws.reduce((a, b) => a + b, 0);
      let x = r() * tot, k = pool[0]; for (let j = 0; j < pool.length; j++) { x -= ws[j]; if (x <= 0) { k = pool[j]; break; } }
      if (out.length && out[out.length - 1].kind === k && pool.length > 1) { i--; continue; } // no two of a kind in a row
      out.push({ kind: k, item: { ...K[k](r), kind: k } });
    }
    return out;
  }
  return { K, LEVELS, NAMES, set };
})();
/* MATHS-END */

const PRACTICE_N = 10;
function startPractice(kid) {
  const band = BAND_IX[bandOf(kid)] || 0, r = mulberry((Date.now() & 0xfffff) ^ hash(kid.id));
  const qs = MATHS.set(r, band, PRACTICE_N, prog(kid).mp || {});
  Grow.run = { mode: 'practice', tree: 'maths', scene: (TREE.maths || {}).scene || 'island', steps: qs.map((x, i) => ({ kind: 'check', item: x.item, i, qid: `maths.practice.${x.kind}`, skill: `maths.${x.kind}`, title: MATHS.NAMES[x.kind] })), k: 0, res: [], t0: Date.now() };
  Grow.view = 'review'; Sound.go(); render();
}
// What practice pays and remembers: a little XP per right answer (up to a daily amount), and right and wrong counts
// per kind, so the next set leans towards the tricky ones and grown-ups can see them.
function practiceFinish(kid, R, add, patch, right, total) {
  const day = dayInfo(kid), room = Math.max(0, XP.practicePerDay - (day.pr || 0)), n = Math.min(right, room);
  add(`${n} maths answer${n === 1 ? '' : 's'} right`, n * XP.practice); patch.day.pr = (day.pr || 0) + Math.min(right, room);
  const mp = {}, was = prog(kid).mp || {};
  R.steps.forEach((s, i) => { const k = s.item.kind, res = R.res[i]; if (!k || !res) return; const p = mp[k] || { n: (was[k] || {}).n || 0, r: (was[k] || {}).r || 0 }; mp[k] = { n: p.n + 1, r: p.r + (res.ok ? 1 : 0), at: Date.now() }; });
  patch.mp = mp; C.track('growth.practice', { subject: 'maths', right, total }, kid.id);
}
// The kinds a kid finds hardest, for the grown-ups' page: at least 4 tries and under 70% right
function practiceWeak(kid) { return Object.entries(prog(kid).mp || {}).filter(([, s]) => s.n >= 4 && s.r / s.n < 0.7).sort((a, b) => a[1].r / a[1].n - b[1].r / b[1].n).slice(0, 3).map(([k]) => MATHS.NAMES[k] || k); }
const mathsOn = () => !(GSET().off || {}).maths;
