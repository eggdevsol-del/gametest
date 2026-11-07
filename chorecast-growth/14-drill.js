/* ---------- Long lessons in every subject ----------
   A lesson file stays short. When a kid starts a lesson, the app adds questions and games on the lesson's own topic
   until it reaches DRILL (40 for Sprouts, 45 for Builders, 50 for Makers, counting the lesson's own tries, game and
   checks), and the lesson's own game and questions still come last:
   - Maths: MSKILL, by the lesson's skill, makes fresh questions worked out in code. Each one also carries `calc`, the
     sum as plain JavaScript, which tests/lesson-drill.test.mjs works out again, so a built maths question can't have a
     wrong answer. The same question is asked as fill the gap, multiple choice and true or false, and in games: Memory
     flip, Lightning round, Balloon pop, and for the right topics Clock hands, Pizza fractions, Coin counter and
     Balance scale. Then the unit's earlier topics are mixed in.
   - Other subjects: the lesson's fact bank (fact: lines in content/facts/<tree>.txt, checked like every lesson and
     sampled by a grown-up). Each fact is asked as fill the gap, true or false both ways round, Guess the word,
     Lightning rounds and a True or False sort, then earlier lessons' facts are mixed in. Money Sense adds Coin counter.
   A lesson with no fact bank yet, or a maths skill with no generator, stays as it's written. */

/* MSKILL-START */
const MSKILL = (() => {
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1)), pick = (r, xs) => xs[Math.floor(r() * xs.length)];
  const num = v => String(+(+v).toFixed(4)), neg = v => (v < 0 ? `−${num(-v)}` : num(v));
  const commas = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a)), frac = (n, d) => { const g = gcd(n, d); return `${n / g}/${d / g}`; };
  const hm = mins => { const m = ((mins % 720) + 720) % 720; return `${Math.floor(m / 60) || 12}:${String(m % 60).padStart(2, '0')}`; };
  const NAMES = ['Ari', 'Bo', 'Mia', 'Leo', 'Sam', 'Zoe', 'Kai', 'Ivy'];
  /* A problem: the question with a gap (`ask`), its answer, the sum as JavaScript (`calc`), wrong answers that are
     really wrong, and `say(x)`, the statement with x as the answer (for true or false). unit says how answers compare:
     num, time (h:mm on a 12-hour clock), frac, cmp (<, > or =), yn (yes or no), text, expr (an expression in n, or a
     and b), ratio. A num answer under 0 is never a typed gap (the number pad has no minus). */
  const fmt = (v, unit) => (unit === 'num' || !unit ? neg(+v) : String(v));
  const P = (ask, a, calc, wrongs, say, o = {}) => {
    const unit = o.unit || 'num', A = fmt(a, unit);
    return { ask, a: A, calc, unit, wrongs: [...new Set(wrongs.map(w => fmt(w, unit)))].filter(w => w !== A && w !== 'NaN' && w !== '−0'), say, mem: o.mem || '', gap: o.gap !== false && unit === 'num' && +a >= 0 };
  };
  const E = (expr, a, calc, wrongs, o) => P(`${expr} = _`, a, calc, wrongs, x => `${expr} = ${x}`, { mem: expr, ...o });
  const near = (a, ...d) => d.map(x => a + x).filter(x => x >= 0);
  const timeQ = (ask, mins, wrongMins, say) => P(ask, hm(mins), `${mins}`, wrongMins.map(hm), say, { unit: 'time' });
  const sign = (a, b) => (a > b ? '>' : a < b ? '<' : '=');
  const cmpQ = (A, B, av, bv) => P(`Which sign goes in the gap? ${A} _ ${B}`, sign(av, bv), `(${av})>(${bv})?'>':(${av})<(${bv})?'<':'='`, ['<', '>', '='], x => `${A} ${x} ${B}`, { unit: 'cmp' });
  const biggest = (xs, show = String) => { const m = Math.max(...xs); return P(`Which is the biggest: ${xs.slice(0, -1).map(show).join(', ')} or ${show(xs[xs.length - 1])}? _`, show(m), `Math.max(${xs.join(',')})`, xs.filter(x => x !== m).map(show), x => `${x} is the biggest of ${xs.map(show).join(', ')}.`, { gap: false }); };
  const distinct3 = r => { const d = []; while (d.length < 3) { const x = ri(r, 1, 9); if (!d.includes(x)) d.push(x); } return d; };
  const exprs = {
    more: k => [`${k} more than n`, `n + ${k}`, [`${k}n`, `n − ${k}`]], times: k => [`${k} times n`, `${k}n`, [`n + ${k}`, `n ÷ ${k}`]],
    less: k => [`${k} less than n`, `n − ${k}`, [`${k} − n`, `n + ${k}`]], dbl: k => [`double n, then add ${k}`, `2n + ${k}`, [`2(n + ${k})`, `n + ${2 * k}`]],
    half: () => ['half of n', 'n ÷ 2', ['2n', 'n − 2']], sq: () => ['n squared', 'n²', ['2n', 'n + 2']], minusFrom: k => [`n taken away from ${k}`, `${k} − n`, [`n − ${k}`, `${k}n`]],
  };
  const S = {
    /* ----- Sprouts ----- */
    'place-value': [
      r => { const [h, t, o] = distinct3(r), n = 100 * h + 10 * t + o, p = ri(r, 0, 2), d = [o, t, h][p], v = d * 10 ** p; return P(`In ${n}, the ${d} is worth _`, v, `${d}*${10 ** p}`, [d, d * 10 ** (p + 1), p ? d * 10 ** (p - 1) : d * 100], x => `In ${n}, the ${d} is worth ${x}.`, { mem: `the ${d} in ${n}` }); },
      r => { const [h, t, o] = distinct3(r), n = 100 * h + 10 * t + o; return E(`${h * 100} + ${t * 10} + ${o}`, n, `${h * 100}+${t * 10}+${o}`, [100 * o + 10 * t + h, n + 10, n - 1]); },
    ],
    'compare-numbers': [
      r => { const a = ri(r, 101, 989); let b = pick(r, [a + 10 * ri(r, 1, 5), a - 10 * ri(r, 1, 5), Math.floor(a / 100) * 100 + (a % 10) * 10 + Math.floor(a / 10) % 10, a + 100]); if (b === a || b < 100 || b > 999) b = a + 1; return cmpQ(a, b, a, b); },
      r => { const h = ri(r, 1, 9) * 100, xs = [h + ri(r, 10, 99), h + ri(r, 10, 99), h - 100 + ri(r, 10, 99) + (h === 100 ? 100 : 0)]; return new Set(xs).size === 3 ? biggest(xs) : null; },
    ],
    'count-tens': [
      r => { const n = ri(r, 101, 889), k = pick(r, [10, 100]); return E(`${n} + ${k}`, n + k, `${n}+${k}`, [n + k * 10, n + 1, n + k + 10 * (k === 10 ? 10 : 1) / (k === 10 ? 1 : 10)]); },
      r => { const s = pick(r, [10, 100]), n = ri(r, 1, 6) * (s === 10 ? 50 : 100) + ri(r, 0, 9) * (s === 10 ? 1 : 10); return P(`What comes next? ${n}, ${n + s}, ${n + 2 * s}, _`, n + 3 * s, `${n}+3*${s}`, [n + 4 * s, n + 2 * s + 1, n + 3 * s + (s === 10 ? 100 : 10)], x => `After ${n}, ${n + s}, ${n + 2 * s} comes ${x}.`); },
    ],
    rounding: [
      r => { let n = ri(r, 11, 99); if (n % 10 === 0) n++; const a = Math.round(n / 10) * 10; return P(`Round ${n} to the nearest ten: _`, a, `Math.round(${n}/10)*10`, [a === Math.ceil(n / 10) * 10 ? Math.floor(n / 10) * 10 : Math.ceil(n / 10) * 10, n, a + 10], x => `${n} rounded to the nearest ten is ${x}.`, { mem: `${n} to the nearest 10` }); },
      r => { let n = ri(r, 101, 989); if (n % 10 === 0) n++; const a = Math.round(n / 10) * 10; return P(`Round ${n} to the nearest ten: _`, a, `Math.round(${n}/10)*10`, [a === Math.ceil(n / 10) * 10 ? Math.floor(n / 10) * 10 : Math.ceil(n / 10) * 10, Math.round(n / 100) * 100 === a ? a + 10 : Math.round(n / 100) * 100], x => `${n} rounded to the nearest ten is ${x}.`, { mem: `${n} to the nearest 10` }); },
    ],
    'add-mental': [
      r => { const a = ri(r, 5, 9), b = ri(r, 11 - a, 9); return E(`${a} + ${b}`, a + b, `${a}+${b}`, near(a + b, 1, -1, 10)); },
      r => { const a = ri(r, 1, 9); return P(`${a} + _ = 10`, 10 - a, `10-${a}`, near(10 - a, 1, -1, a - (10 - a) || 2), x => `${a} + ${x} = 10`, { mem: `${a} + ? = 10` }); },
      r => { const a = ri(r, 11, 19), b = ri(r, 2, 9); return E(`${a} + ${b}`, a + b, `${a}+${b}`, near(a + b, 1, -1, 10)); },
    ],
    'add-2digit': [r => { const a = ri(r, 12, 68), b = ri(r, 11, 99 - a); return E(`${a} + ${b}`, a + b, `${a}+${b}`, near(a + b, 10, -10, 1)); }],
    'subtract-2digit': [r => { const a = ri(r, 31, 99), b = ri(r, 11, a - 10); return E(`${a} − ${b}`, a - b, `${a}-${b}`, near(a - b, 10, -10, 2)); }],
    'word-problems': [
      r => { const n = pick(r, NAMES), a = ri(r, 12, 60), b = ri(r, 11, 39); return P(`${n} has ${a} eggs and collects ${b} more. How many eggs now? _`, a + b, `${a}+${b}`, near(a + b, 10, -10, -1), x => `${n} has ${a} eggs and collects ${b} more, so ${n} has ${x} eggs.`); },
      r => { const n = pick(r, NAMES), a = ri(r, 20, 90), b = ri(r, 5, a - 5); return P(`${n} has $${a} and spends $${b}. How much is left? $_`, a - b, `${a}-${b}`, [a + b, ...near(a - b, 10, -1)], x => `${n} has $${a} and spends $${b}, so $${x} is left.`); },
      r => { const a = ri(r, 12, 50), b = ri(r, 12, 49); return P(`The farm stand sells ${a} apples in the morning and ${b} in the afternoon. How many altogether? _`, a + b, `${a}+${b}`, near(a + b, 10, -10, 1), x => `The farm stand sells ${a} apples in the morning and ${b} in the afternoon: ${x} altogether.`); },
      r => { const a = ri(r, 25, 80), b = ri(r, 6, a - 10); return P(`There are ${a} birds on the island. ${b} fly away. How many are left? _`, a - b, `${a}-${b}`, [a + b, ...near(a - b, 10, -1)], x => `There are ${a} birds on the island and ${b} fly away, so ${x} are left.`); },
    ],
    'equal-groups': [
      r => { const g = ri(r, 2, 6), n = ri(r, 2, 10); return P(`${g} groups of ${n} make _`, g * n, `${g}*${n}`, [g + n, g * n + n, g * n - g], x => `${g} groups of ${n} make ${x}.`, { mem: `${g} groups of ${n}` }); },
      r => { const g = ri(r, 2, 6), n = ri(r, 2, 5); return P(`${Array(g).fill(n).join(' + ')} = _ × ${n}`, g, `${g * n}/${n}`, [g + 1, g - 1, g * n], x => `${Array(g).fill(n).join(' + ')} = ${x} × ${n}`); },
    ],
    'times-2-10': [r => { const a = pick(r, [2, 10]), b = ri(r, 1, 12); return E(`${b} × ${a}`, a * b, `${b}*${a}`, near(a * b, a, -a, 1)); }],
    'times-5': [r => { const b = ri(r, 1, 12); return E(`${b} × 5`, 5 * b, `${b}*5`, near(5 * b, 5, -5, 1)); }],
    arrays: [
      r => { const a = ri(r, 2, 6), b = ri(r, 2, 10); return P(`An array has ${a} rows of ${b}. How many altogether? _`, a * b, `${a}*${b}`, [a + b, a * b + a, a * b - b], x => `An array with ${a} rows of ${b} has ${x} altogether.`); },
      r => { const a = ri(r, 2, 10), b = ri(r, 2, 10); return a === b ? null : P(`${a} × ${b} = ${b} × _`, a, `${a}*${b}/${b}`, [b, a * b, a + 1], x => `${a} × ${b} = ${b} × ${x}`); },
    ],
    length: [
      r => { const m = ri(r, 1, 9); return P(`${m} m = _ cm`, m * 100, `${m}*100`, [m * 10, m * 1000, m], x => `${m} m = ${x} cm`, { mem: `${m} m in cm` }); },
      r => { const m = ri(r, 1, 5), c = ri(r, 1, 9) * 10; return P(`${m} m ${c} cm = _ cm`, m * 100 + c, `${m}*100+${c}`, [m + c, m * 10 + c, m * 100 + c * 10], x => `${m} m ${c} cm = ${x} cm`); },
    ],
    'time-hour': [
      r => { const h = ri(r, 1, 12), half = r() < 0.5; return timeQ(`What time is ${half ? `half past ${h}` : `${h} o’clock`}? _`, h * 60 + (half ? 30 : 0), [h * 60 + (half ? 0 : 30), h * 60 + 15, (h - 1) * 60 + 30], x => `${half ? `Half past ${h}` : `${h} o’clock`} is ${x}.`); },
    ],
    'time-quarter': [
      r => { const h = ri(r, 1, 12), past = r() < 0.5, t = past ? h * 60 + 15 : h * 60 - 15; return timeQ(`What time is quarter ${past ? 'past' : 'to'} ${h}? _`, t, [past ? h * 60 - 15 : h * 60 + 15, h * 60 + 45, h * 60 + 30], x => `Quarter ${past ? 'past' : 'to'} ${h} is ${x}.`); },
    ],
    'elapsed-time': [
      r => { const s = ri(r, 1, 10) * 60 + pick(r, [0, 15, 30, 45]), add = pick(r, [15, 30, 45, 60, 90]), d = add === 60 ? 'an hour' : add === 90 ? 'an hour and a half' : `${add} minutes`; return timeQ(`It’s ${hm(s)}. What time will it be ${d} later? _`, s + add, [s + add + 15, s + add - 15, s + add + 60], x => `${d.charAt(0).toUpperCase() + d.slice(1)} after ${hm(s)} is ${x}.`); },
    ],
    /* ----- Builders ----- */
    'place-value-big': [
      r => { const ds = []; while (ds.length < 7) { const x = ri(r, ds.length ? 0 : 1, 9); if (!ds.includes(x)) ds.push(x); } const n = +ds.join(''), p = ri(r, 2, 6), d = ds[6 - p]; if (!d) return null; return P(`In ${commas(n)}, what is the ${d} worth? _`, d * 10 ** p, `${d}*${10 ** p}`, [d * 10 ** (p + 1), d * 10 ** (p - 1), d], x => `In ${commas(n)}, the ${d} is worth ${commas(x)}.`); },
    ],
    'rounding-big': [
      r => { let n = ri(r, 1001, 98999); const u = pick(r, [100, 1000]); if (n % u === u / 2) n++; const a = Math.round(n / u) * u, other = a === Math.ceil(n / u) * u ? Math.floor(n / u) * u : Math.ceil(n / u) * u; return P(`Round ${commas(n)} to the nearest ${u === 100 ? 'hundred' : 'thousand'}: _`, a, `Math.round(${n}/${u})*${u}`, [other, Math.round(n / 10) * 10 === a ? a + u : Math.round(n / 10) * 10, a + u * 10], x => `${commas(n)} rounded to the nearest ${u === 100 ? 'hundred' : 'thousand'} is ${commas(x)}.`); },
    ],
    decimals: [
      r => { const t = ri(r, 1, 9); return P(`${t} tenths written as a decimal is _`, t / 10, `${t}/10`, [t / 100, t, t * 10], x => `${t} tenths written as a decimal is ${x}.`, { mem: `${t} tenths` }); },
      r => { const h = ri(r, 1, 99); if (h % 10 === 0) return null; return P(`${h} hundredths written as a decimal is _`, h / 100, `${h}/100`, [h / 10, h / 1000, h], x => `${h} hundredths written as a decimal is ${x}.`, { mem: `${h} hundredths` }); },
      r => { const [a, b, c] = distinct3(r), x = `${a}.${b}${c}`, p = pick(r, [1, 2]), d = p === 1 ? b : c; return P(`In ${x}, the ${d} is worth _`, d / 10 ** p, `${d}/${10 ** p}`, [d, d / 10 ** (3 - p), d * 10], y => `In ${x}, the ${d} is worth ${y}.`); },
    ],
    'compare-decimals': [
      r => { const a = ri(r, 1, 9), b = ri(r, 10, 99), A = a / 10, B = b / 100; return A === B ? null : cmpQ(num(A), num(B), A, B); },
      r => { const xs = [ri(r, 1, 9) / 10, ri(r, 10, 99) / 100, ri(r, 1, 9) / 100]; return new Set(xs).size === 3 ? biggest(xs, num) : null; },
    ],
    'times-12': [r => { const a = ri(r, 3, 12), b = ri(r, 3, 12); return E(`${a} × ${b}`, a * b, `${a}*${b}`, near(a * b, a, -b, 1)); }],
    'times-10-100': [r => { const n = ri(r, 2, 99), k = pick(r, [10, 100, 1000]); return E(`${n} × ${commas(k)}`, n * k, `${n}*${k}`, [n * k * 10, n * k / 10, n + k]); }],
    'multiply-2x1': [r => { const a = ri(r, 12, 99), b = ri(r, 3, 9); return E(`${a} × ${b}`, a * b, `${a}*${b}`, near(a * b, 10, -10, b)); }],
    factors: [
      r => { const n = pick(r, [12, 18, 20, 24, 30, 36, 40, 42, 48]), fs = [], nf = []; for (let i = 2; i < n; i++) (n % i ? nf : fs).push(i); const f = pick(r, fs), w = [pick(r, nf), pick(r, nf), pick(r, nf)]; return P(`Which of these is a factor of ${n}? _`, f, `${n}%${f}===0?${f}:NaN`, w, x => `${x} is a factor of ${n}.`, { gap: false }); },
      r => { const p = pick(r, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 9, 15, 21, 25, 27, 33, 35, 39, 49, 51]), prime = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29].includes(p); return P(`Is ${p} a prime number? _`, prime ? 'yes' : 'no', `(${p})`, [prime ? 'no' : 'yes'], x => `${p} ${x === 'yes' ? 'is' : 'is not'} a prime number.`, { unit: 'yn' }); },
    ],
    'fractions-meaning': [
      r => { const d = pick(r, [3, 4, 5, 6, 8, 10]), n = ri(r, 1, d - 1), who = pick(r, NAMES); return P(`A pizza is cut into ${d} equal slices. ${who} eats ${n}. What fraction is eaten? _`, `${n}/${d}`, `${n}/${d}`, [`${d}/${n}`, `${n}/${d + n}`, `${d - n}/${d}`].filter(w => w.split('/')[0] / w.split('/')[1] !== n / d), x => `${who} eats ${n} of ${d} equal slices: that’s ${x} of the pizza.`, { unit: 'frac' }); },
    ],
    'equivalent-fractions': [
      r => { const d = pick(r, [2, 3, 4, 5]), n = ri(r, 1, d - 1), k = ri(r, 2, 5); return P(`${n}/${d} = _/${d * k}`, n * k, `${n}*${k}`, [n + k, n * k + 1, d * k - n], x => `${n}/${d} = ${x}/${d * k}`); },
      r => { const d = pick(r, [3, 4, 5, 6]), n = ri(r, 1, d - 1), k = ri(r, 2, 4); return P(`Which fraction is the same as ${n}/${d}? _`, `${n * k}/${d * k}`, `${n}/${d}`, [`${n}/${d * k}`, `${n * k}/${d}`, `${n + k}/${d + k}`], x => `${x} is the same as ${n}/${d}.`, { unit: 'frac' }); },
    ],
    'compare-fractions': [
      r => { const a = ri(r, 1, 7), b = ri(r, a + 1, 8), c = ri(r, 1, 7), d = ri(r, c + 1, 8); return a * d === b * c ? null : cmpQ(`${a}/${b}`, `${c}/${d}`, a / b, c / d); },
    ],
    'fraction-of-amount': [r => { const d = pick(r, [2, 3, 4, 5, 10]), n = ri(r, 1, d - 1), q = d * ri(r, 2, 12); return P(`${n}/${d} of ${q} = _`, q / d * n, `${q}/${d}*${n}`, [q / d, q * n, q - q / d * n || q + 1], x => `${n}/${d} of ${q} = ${x}`, { mem: `${n}/${d} of ${q}` }); }],
    perimeter: [
      r => { const w = ri(r, 3, 15), h = ri(r, 2, 12); return P(`A rectangle is ${w} m long and ${h} m wide. Its perimeter is _ m`, 2 * (w + h), `2*(${w}+${h})`, [w * h, w + h, 2 * w + h], x => `A ${w} m by ${h} m rectangle has a perimeter of ${x} m.`); },
      r => { const s = ri(r, 2, 15); return P(`A square has sides of ${s} cm. Its perimeter is _ cm`, 4 * s, `4*${s}`, [s * s, 2 * s, s + 4], x => `A square with ${s} cm sides has a perimeter of ${x} cm.`); },
    ],
    'area-rect': [
      r => { const w = ri(r, 3, 15), h = ri(r, 2, 12); return P(`A rectangle is ${w} m long and ${h} m wide. Its area is _ m²`, w * h, `${w}*${h}`, [2 * (w + h), w + h, w * h + w], x => `A ${w} m by ${h} m rectangle has an area of ${x} m².`); },
      r => { const s = ri(r, 2, 12); return P(`A square has sides of ${s} cm. Its area is _ cm²`, s * s, `${s}*${s}`, [4 * s, 2 * s, s * s + s], x => `A square with ${s} cm sides has an area of ${x} cm².`); },
    ],
    'area-composite': [
      r => { const a = ri(r, 4, 10), b = ri(r, 3, 8), c = ri(r, 2, 6), d = ri(r, 1, 5); return P(`An L shape is made of a ${a} m by ${b} m rectangle and a ${c} m by ${d} m rectangle. Its area is _ m²`, a * b + c * d, `${a}*${b}+${c}*${d}`, [a * b * c * d, a * b, (a + c) * (b + d)], x => `A ${a} m by ${b} m rectangle and a ${c} m by ${d} m rectangle make ${x} m² together.`); },
    ],
    'area-or-perimeter': [
      r => { const [what, a] = pick(r, [['a fence around a paddock', 'perimeter'], ['carpet for a bedroom floor', 'area'], ['a frame around a painting', 'perimeter'], ['grass seed for a lawn', 'area'], ['paint for a wall', 'area'], ['a ribbon around the edge of a cake board', 'perimeter'], ['tiles for a bathroom floor', 'area'], ['lights along the edge of a deck', 'perimeter']]); return P(`To work out how much ${what} you need, do you use the area or the perimeter? _`, a, `'${a}'`, [a === 'area' ? 'perimeter' : 'area'], x => `For ${what}, you use the ${x}.`, { unit: 'text' }); },
      r => { const w = ri(r, 4, 12), h = ri(r, 3, 9), fence = r() < 0.5; return fence ? P(`How many metres of fence go around a ${w} m by ${h} m paddock? _`, 2 * (w + h), `2*(${w}+${h})`, [w * h, w + h], x => `A ${w} m by ${h} m paddock needs ${x} m of fence.`) : P(`How many square metres of carpet cover a ${w} m by ${h} m floor? _`, w * h, `${w}*${h}`, [2 * (w + h), w + h], x => `A ${w} m by ${h} m floor needs ${x} m² of carpet.`); },
    ],
    /* ----- Makers ----- */
    negatives: [
      r => { const t = ri(r, -5, 8), k = ri(r, 2, 12), up = r() < 0.4, v = up ? t + k : t - k; return P(`It’s ${neg(t)} °C. The temperature ${up ? 'rises' : 'drops'} ${k} degrees. Now it’s _ °C`, v, `${t}${up ? '+' : '-'}${k}`, [-v, up ? t - k : t + k, v + (up ? -1 : 1)], x => `${neg(t)} °C ${up ? 'plus' : 'minus'} ${k} degrees is ${x} °C.`); },
      r => { const a = -ri(r, 1, 12), b = -ri(r, 1, 12); return a === b ? null : cmpQ(neg(a), neg(b), a, b); },
    ],
    'integer-add': [
      r => { const a = ri(r, 2, 12), b = ri(r, 2, 9), t = ri(r, 0, 2); const [q, v, c] = t === 0 ? [`(−${a}) + (−${b})`, -a - b, `(-${a})+(-${b})`] : t === 1 ? [`${a} − (−${b})`, a + b, `${a}-(-${b})`] : [`(−${a}) + ${b}`, b - a, `(-${a})+${b}`]; return E(q, v, c, [-v, v + 2 * b, a + b === Math.abs(v) ? a - b : a + b]); },
    ],
    'integer-multiply': [
      r => { const a = ri(r, 2, 12), b = ri(r, 2, 9), t = ri(r, 0, 2); const [q, v, c] = t === 0 ? [`(−${a}) × ${b}`, -a * b, `(-${a})*${b}`] : t === 1 ? [`(−${a}) × (−${b})`, a * b, `(-${a})*(-${b})`] : [`(−${a * b}) ÷ ${b}`, -a, `(-${a * b})/${b}`]; return E(q, v, c, [-v, v + (v < 0 ? -b : b), a + b]); },
    ],
    'order-of-operations': [
      r => { const a = ri(r, 2, 20), b = ri(r, 2, 9), c = ri(r, 2, 9); return E(`${a} + ${b} × ${c}`, a + b * c, `${a}+${b}*${c}`, [(a + b) * c, a + b + c, a * b + c]); },
      r => { const a = ri(r, 2, 12), b = ri(r, 2, 12), c = ri(r, 2, 6), d = ri(r, 1, 10); return E(`(${a} + ${b}) × ${c} − ${d}`, (a + b) * c - d, `(${a}+${b})*${c}-${d}`, [a + b * c - d, (a + b) * (c - d), (a + b) * c + d]); },
      r => { const d = ri(r, 2, 6), q = ri(r, 2, 9), a = ri(r, 2, 9), b = ri(r, 2, 9); return E(`${a} × ${b} − ${d * q} ÷ ${d}`, a * b - q, `${a}*${b}-${d * q}/${d}`, [(a * b - d * q) / d, a * b + q, a * (b - q)].filter(Number.isInteger)); },
    ],
    'algebra-expressions': [
      r => { const k = ri(r, 2, 9), [d, a, w] = exprs[pick(r, Object.keys(exprs))](k); return P(`Which expression means “${d}”? _`, a, a, w, x => `“${d}” is written ${x}.`, { unit: 'expr' }); },
    ],
    substitution: [
      r => { const a = ri(r, 2, 9), b = ri(r, 1, 9), [e, v, c] = pick(r, [[`2a + b`, 2 * a + b, `2*${a}+${b}`], [`3a − b`, 3 * a - b, `3*${a}-${b}`], ['ab', a * b, `${a}*${b}`], ['a² + b', a * a + b, `${a}*${a}+${b}`], [`4(a + b)`, 4 * (a + b), `4*(${a}+${b})`]]); return P(`If a = ${a} and b = ${b}, then ${e} = _`, v, c, [v + a, v - b, a + b], x => `When a = ${a} and b = ${b}, ${e} = ${x}`); },
    ],
    'simplify-algebra': [
      r => { const p = ri(r, 2, 9), q = ri(r, 2, 9); return P(`Simplify ${p}n + ${q}n. _`, `${p + q}n`, `${p}*n+${q}*n`, [`${p * q}n`, `${p + q}n²`, `${p + q + 1}n`], x => `${p}n + ${q}n = ${x}`, { unit: 'expr' }); },
      r => { const p = ri(r, 2, 9), q = ri(r, 2, 9), s = ri(r, 1, 5); return P(`Simplify ${p}a + ${q}b + ${s}a. _`, `${p + s}a + ${q}b`, `${p}*a+${q}*b+${s}*a`, [`${p + q + s}ab`, `${p + q + s}a`, `${p}a + ${q + s}b`], x => `${p}a + ${q}b + ${s}a = ${x}`, { unit: 'expr' }); },
      r => { const p = ri(r, 5, 12), q = ri(r, 1, p - 1); return P(`Simplify ${p}n − ${q}n. _`, `${p - q}n`, `${p}*n-${q}*n`, [`${p + q}n`, `${p - q}`, `${p - q}n²`], x => `${p}n − ${q}n = ${x}`, { unit: 'expr' }); },
    ],
    equations: [
      r => { const a = ri(r, 2, 9), x = ri(r, 1, 12), b = ri(r, 1, 20); return P(`Solve ${a}x + ${b} = ${a * x + b}. x = _`, x, `(${a * x + b}-${b})/${a}`, [x + 1, a * x, (a * x + b) / a === x ? x + 2 : Math.round((a * x + b) / a)], y => `In ${a}x + ${b} = ${a * x + b}, x = ${y}`); },
      r => { const a = ri(r, 2, 9), x = ri(r, 3, 15), b = ri(r, 1, a * x - 1); return P(`Solve ${a}x − ${b} = ${a * x - b}. x = _`, x, `(${a * x - b}+${b})/${a}`, [x - 1, x + 1, a * x], y => `In ${a}x − ${b} = ${a * x - b}, x = ${y}`); },
      r => { const k = ri(r, 2, 9), m = ri(r, 2, 12); return P(`Solve x ÷ ${k} = ${m}. x = _`, k * m, `${k}*${m}`, [m, k + m, m - k > 0 ? m - k : m + 1], y => `If x ÷ ${k} = ${m}, x = ${y}`); },
    ],
    'percent-of': [r => { const p = pick(r, [10, 20, 25, 50, 75, 5, 15]), v = 20 * ri(r, 1, 15); return P(`${p}% of ${v} = _`, v * p / 100, `${v}*${p}/100`, [v * p / 10, v - v * p / 100, p], x => `${p}% of ${v} = ${x}`, { mem: `${p}% of ${v}` }); }],
    'percent-change': [
      r => { const v = 20 * ri(r, 2, 15), p = pick(r, [10, 20, 25, 50]); return P(`A $${v} jacket is ${p}% off. It now costs $_`, v * (1 - p / 100), `${v}*(1-${p}/100)`, [v * p / 100, v + v * p / 100, v - p], x => `$${v} with ${p}% off is $${x}.`); },
      r => { const v = 20 * ri(r, 2, 15), p = pick(r, [10, 20, 25, 50]); return P(`A $${v} bike goes up in price by ${p}%. It now costs $_`, v * (1 + p / 100), `${v}*(1+${p}/100)`, [v * (1 - p / 100), v + p, v * p / 100], x => `$${v} plus ${p}% is $${x}.`); },
    ],
    ratios: [
      r => { const a = ri(r, 1, 5), b = ri(r, a + 1, 9), k = ri(r, 2, 6); if (gcd(a, b) > 1) return null; return P(`Simplify the ratio ${a * k}:${b * k}. _`, `${a}:${b}`, `${a * k}/${b * k}`, [`${b}:${a}`, `${a * k}:${b}`, `${a + 1}:${b + 1}`], x => `${a * k}:${b * k} simplifies to ${x}.`, { unit: 'ratio' }); },
      r => { const a = ri(r, 2, 5), b = ri(r, 1, 4), k = ri(r, 2, 6); return P(`A recipe uses ${a} cups of flour for every ${b} egg${b > 1 ? 's' : ''}. With ${b * k} eggs you need _ cups of flour`, a * k, `${a}*${b * k}/${b}`, [a + k, b * k, a * k + a], x => `With ${b * k} eggs you need ${x} cups of flour.`); },
    ],
    'share-ratio': [r => { const a = ri(r, 1, 4), b = ri(r, a + 1, 6), t = (a + b) * ri(r, 2, 12), big = r() < 0.5; return P(`Share $${t} in the ratio ${a}:${b}. The ${big ? 'bigger' : 'smaller'} share is $_`, t * (big ? b : a) / (a + b), `${t}*${big ? b : a}/(${a}+${b})`, [t * (big ? a : b) / (a + b), t / 2, t / (a + b)], x => `$${t} shared ${a}:${b} gives a ${big ? 'bigger' : 'smaller'} share of $${x}.`); }],
    'angles-line': [
      r => { const x = ri(r, 15, 165); return P(`Two angles sit on a straight line. One is ${x}°. The other is _°`, 180 - x, `180-${x}`, [360 - x, 90 - x > 0 ? 90 - x : x + 10, x], y => `Angles of ${x}° and ${y}° make a straight line.`); },
      r => { const x = ri(r, 40, 150), y = ri(r, 40, 300 - x - 20); return P(`Three angles go around a point. Two are ${x}° and ${y}°. The third is _°`, 360 - x - y, `360-${x}-${y}`, [180 - x - y > 0 ? 180 - x - y : x + y, x + y, 360 - x], z => `${x}°, ${y}° and ${z}° go all the way around a point.`); },
    ],
    'triangle-angles': [
      r => { const x = ri(r, 20, 100), y = ri(r, 20, 160 - x - 1); return P(`Two angles of a triangle are ${x}° and ${y}°. The third is _°`, 180 - x - y, `180-${x}-${y}`, [360 - x - y, x + y, 90 - y > 0 ? 90 - y : y], z => `A triangle with angles of ${x}° and ${y}° has a third angle of ${z}°.`); },
      r => { const t = 2 * ri(r, 10, 70); return P(`An isosceles triangle has a top angle of ${t}°. Each of the other two angles is _°`, (180 - t) / 2, `(180-${t})/2`, [180 - t, t, 90 - t / 4], z => `An isosceles triangle with a ${t}° top angle has two ${z}° angles.`); },
    ],
    pythagoras: [r => { const [a, b, c] = pick(r, [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [7, 24, 25], [12, 16, 20]]); return P(`A right-angled triangle has short sides of ${a} cm and ${b} cm. The longest side is _ cm`, c, `Math.sqrt(${a}*${a}+${b}*${b})`, [a + b, c + 1, b + 1], x => `Short sides of ${a} cm and ${b} cm make a longest side of ${x} cm.`); }],
    'pythagoras-use': [
      r => { const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15]]); return P(`A ${c} m ladder leans on a wall with its foot ${a} m from the wall. How high up the wall does it reach? _ m`, b, `Math.sqrt(${c}*${c}-${a}*${a})`, [c - a, c + a, b + 1], x => `A ${c} m ladder with its foot ${a} m out reaches ${x} m up the wall.`); },
      r => { const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17]]); return P(`A rectangle is ${a} m by ${b} m. Its diagonal is _ m`, c, `Math.sqrt(${a}*${a}+${b}*${b})`, [a + b, c + 2, b], x => `A ${a} m by ${b} m rectangle has a ${x} m diagonal.`); },
    ],
  };
  // Month 2's number topics (not live yet), done the same way
  const table = k => r => { const b = ri(r, 1, 12); return E(`${b} × ${k}`, k * b, `${b}*${k}`, near(k * b, k, -k, 1)); };
  Object.assign(S, {
    'times-3': [table(3)], 'times-4': [table(4)], 'times-8': [table(8)],
    'division-sharing': [r => { const b = ri(r, 2, 5), q = ri(r, 2, 10); return P(`${b * q} shared equally between ${b} is _ each`, q, `${b * q}/${b}`, [b * q - b, q + 1, b], x => `${b * q} shared equally between ${b} is ${x} each.`); }],
    'division-facts': [r => { const b = ri(r, 3, 12), q = ri(r, 3, 12); return E(`${b * q} ÷ ${b}`, q, `${b * q}/${b}`, near(q, 1, -1, b)); }],
    halves: [r => { const n = 2 * ri(r, 2, 50); return P(`Half of ${n} is _`, n / 2, `${n}/2`, [n * 2, n / 2 + 1, n - 2], x => `Half of ${n} is ${x}.`, { mem: `half of ${n}` }); }],
    quarters: [r => { const n = 4 * ri(r, 1, 25); return P(`A quarter of ${n} is _`, n / 4, `${n}/4`, [n / 2, n * 4, n / 4 + 1], x => `A quarter of ${n} is ${x}.`, { mem: `a quarter of ${n}` }); }],
    thirds: [r => { const n = 3 * ri(r, 1, 20); return P(`A third of ${n} is _`, n / 3, `${n}/3`, [n / 2, n * 3, n / 3 + 1], x => `A third of ${n} is ${x}.`, { mem: `a third of ${n}` }); }],
    'fractions-of-group': S['fraction-of-amount'],
    'divide-big': [r => { const d = ri(r, 3, 9), q = ri(r, 21, 199); return E(`${d * q} ÷ ${d}`, q, `${d * q}/${d}`, near(q, 10, -10, 1)); }],
    remainders: [r => { const d = ri(r, 3, 9), q = ri(r, 3, 12), m = ri(r, 1, d - 1); return P(`${d * q + m} ÷ ${d} = ${q} remainder _`, m, `${d * q + m}%${d}`, [m + 1, d - m === m ? m + 2 : d - m, q], x => `${d * q + m} ÷ ${d} = ${q} remainder ${x}`); }],
    'fraction-decimal': [r => { const [n, d] = pick(r, [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [7, 10], [3, 10]]); return P(`${n}/${d} as a decimal is _`, n / d, `${n}/${d}`, [n / d / 10, n + d / 10, d / 10], x => `${n}/${d} as a decimal is ${x}.`, { mem: `${n}/${d}` }); }],
    percentages: S['percent-of'],
    'decimal-add': [r => { const a = ri(r, 11, 99) / 10, b = ri(r, 11, 99) / 10; return E(`${num(a)} + ${num(b)}`, a + b, `${a}+${b}`, [a + b + 1, a + b - 0.1, a + b + 0.1]); }],
    'decimal-times-10': [r => { const x = ri(r, 11, 999) / 100, k = pick(r, [10, 100]); return E(`${num(x)} × ${k}`, x * k, `${x}*${k}`, [x * k * 10, x * k / 10, x + k]); }],
    'metric-units': [r => { const [big, small, f] = pick(r, [['kg', 'g', 1000], ['L', 'mL', 1000], ['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10]]), n = ri(r, 2, 9); return P(`${n} ${big} = _ ${small}`, n * f, `${n}*${f}`, [n * f * 10, n * f / 10, n], x => `${n} ${big} = ${x} ${small}`, { mem: `${n} ${big} in ${small}` }); }],
    'converting-units': [r => { const [big, small, f] = pick(r, [['kg', 'g', 1000], ['L', 'mL', 1000], ['km', 'm', 1000], ['m', 'cm', 100]]), n = ri(r, 1, 99) * f / 10; return P(`${commas(n)} ${small} = _ ${big}`, n / f, `${n}/${f}`, [n / f * 10, n / f / 10, n], x => `${commas(n)} ${small} = ${x} ${big}`); }],
    volume: [r => { const a = ri(r, 2, 10), b = ri(r, 2, 8), c = ri(r, 2, 6); return P(`A box is ${a} cm long, ${b} cm wide and ${c} cm high. Its volume is _ cm³`, a * b * c, `${a}*${b}*${c}`, [a + b + c, 2 * (a * b + b * c + a * c), a * b], x => `A ${a} by ${b} by ${c} cm box holds ${x} cm³.`); }],
    mean: [r => { const xs = [ri(r, 2, 20), ri(r, 2, 20), ri(r, 2, 20)], last = 4 - (xs.reduce((s, x) => s + x, 0) % 4) + 4 * ri(r, 0, 3); xs.push(last); const m = xs.reduce((s, x) => s + x, 0) / 4; return P(`The mean of ${xs.join(', ')} is _`, m, `(${xs.join('+')})/4`, [m + 1, xs.reduce((s, x) => s + x, 0), xs.slice().sort((a, b) => a - b)[1]], x => `The mean of ${xs.join(', ')} is ${x}.`); }],
    powers: [r => { const a = ri(r, 2, 12), c = r() < 0.4 && a < 7; return c ? E(`${a}³`, a ** 3, `${a}**3`, [a * 3, a * a, a ** 3 + a]) : E(`${a}²`, a * a, `${a}*${a}`, [a * 2, a * a + a, (a + 1) * (a + 1)]); }],
    'square-roots': [r => { const a = ri(r, 2, 15); return P(`The square root of ${a * a} is _`, a, `Math.sqrt(${a * a})`, [a * a / 2, a + 1, a * 2], x => `The square root of ${a * a} is ${x}.`, { mem: `√${a * a}` }); }],
    'index-laws': [r => { const a = ri(r, 2, 9), m = ri(r, 2, 6), n = ri(r, 2, 6); return P(`${a}^${m} × ${a}^${n} = ${a}^_`, m + n, `${m}+${n}`, [m * n, m + n + 1, Math.abs(m - n) || m + n + 2], x => `${a}^${m} × ${a}^${n} = ${a}^${x}`); }],
    'linear-patterns': [r => { const s = ri(r, 2, 9), a = ri(r, 1, 12); return P(`What comes next? ${a}, ${a + s}, ${a + 2 * s}, ${a + 3 * s}, _`, a + 4 * s, `${a}+4*${s}`, [a + 5 * s, a + 3 * s + 1, a + 4 * s + 2], x => `After ${a}, ${a + s}, ${a + 2 * s}, ${a + 3 * s} comes ${x}.`); }],
    'linear-graphs': [r => { const m = ri(r, 2, 5), c = ri(r, 1, 9), x = ri(r, 1, 9); return P(`y = ${m}x + ${c}. When x = ${x}, y = _`, m * x + c, `${m}*${x}+${c}`, [m * (x + c), m + x + c, m * x], v => `When y = ${m}x + ${c} and x = ${x}, y = ${v}`); }],
    'area-triangles': [r => { const b = ri(r, 2, 14), h = ri(r, 2, 10) * 2; return P(`A triangle has a base of ${b} cm and a height of ${h} cm. Its area is _ cm²`, b * h / 2, `${b}*${h}/2`, [b * h, b + h, b * h / 4], x => `A triangle with a ${b} cm base and ${h} cm height has an area of ${x} cm².`); }],
    circles: [r => { const rad = ri(r, 2, 20); return P(`A circle has a radius of ${rad} cm. Its diameter is _ cm`, 2 * rad, `2*${rad}`, [rad / 2, rad * rad, rad + 2], x => `A circle with a ${rad} cm radius has a ${x} cm diameter.`); }],
  });
  S['prism-volume'] = S.volume;
  return { S, P, num, neg, hm, gcd, frac };
})();
/* MSKILL-END */

/* ---------- Turning a problem into questions and games ---------- */
const mq = {
  gap: p => ({ type: 'gap', q: p.ask, a: p.a, calc: p.calc, unit: p.unit }),
  mcq: (p, r) => ({ type: 'mcq', q: p.ask.replace('_', '?'), opts: shuf([{ t: p.a, ok: true }, ...shuf(p.wrongs, r).slice(0, 2).map(t => ({ t, ok: false }))], r), calc: p.calc, unit: p.unit }),
  tf: (p, yes, r) => { const x = yes ? p.a : shuf(p.wrongs, r)[0]; return { type: 'tf', q: p.say(x), a: yes, why: p.say(p.a), calc: p.calc, unit: p.unit, shown: x }; },
};
const TIME_WORDS = m => { const h = Math.floor(m / 60) % 12 || 12, mm = m % 60, nx = (h % 12) + 1; return mm === 0 ? `${h} o’clock` : mm === 30 ? `half past ${h}` : mm === 15 ? `quarter past ${h}` : mm === 45 ? `quarter to ${nx}` : MSKILL.hm(m); };
// The extra games a maths topic gets, beyond its questions
const MGAMES = {
  clock: (r, kind) => { const h = 1 + Math.floor(r() * 12), m = kind === 'time-hour' ? [0, 30][Math.floor(r() * 2)] : kind === 'time-quarter' ? [15, 45][Math.floor(r() * 2)] : 5 * Math.floor(r() * 12), t = h * 60 + m; return { type: 'clock', q: `Set the clock to ${TIME_WORDS(t)}`, t: t % 720, step: kind === 'elapsed-time' ? 5 : 15 }; },
  later: r => { const s = (1 + Math.floor(r() * 10)) * 60 + 15 * Math.floor(r() * 4), add = [15, 30, 45, 60][Math.floor(r() * 4)]; return { type: 'clock', q: `It’s ${MSKILL.hm(s)}. Set the clock to ${add === 60 ? 'an hour' : `${add} minutes`} later`, t: (s + add) % 720, step: 15 }; },
  pizza: r => { const d = [3, 4, 5, 6, 8, 10][Math.floor(r() * 6)], n = 1 + Math.floor(r() * (d - 1)); return { type: 'pizza', q: `Shade ${n}/${d} of the pizza`, n, d }; },
  pizzaEq: r => { const [n, d, k] = [[1, 2, 2], [1, 2, 3], [1, 2, 4], [1, 3, 2], [2, 3, 2], [1, 4, 2], [3, 4, 2], [1, 5, 2]][Math.floor(r() * 8)]; return { type: 'pizza', q: `This pizza has ${d * k} slices. Shade ${n}/${d} of it`, n: n * k, d: d * k }; },
  balance: r => { const a = 3 + Math.floor(r() * 12), b = 2 + Math.floor(r() * 12); return { type: 'balance', q: `Add weights to make it balance: ${a} + ? = ${a + b}`, a, total: a + b, weights: [1, 2, 5, 10] }; },
  coins: (r, band) => { const max = band === 'sprouts' ? 50 : 200, c = 10 * (3 + Math.floor(r() * (max - 2))); return { type: 'coins', q: `Make $${(c / 100).toFixed(2)} with coins${band === 'sprouts' ? '' : ' and notes'}`, cents: c, notes: band !== 'sprouts' }; },
  pop: (r, rule) => {
    const R = rule || ['even', 'mult3', 'mult5', 'gt50'][Math.floor(r() * 4)], test = { even: x => x % 2 === 0, odd: x => x % 2 === 1, mult3: x => x % 3 === 0, mult4: x => x % 4 === 0, mult5: x => x % 5 === 0, gt50: x => x > 50, f24: x => 24 % x === 0, f36: x => 36 % x === 0, prime: x => [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47].includes(x) }[R];
    const say = { even: 'even number', odd: 'odd number', mult3: 'multiple of 3', mult4: 'multiple of 4', mult5: 'multiple of 5', gt50: 'number bigger than 50', f24: 'factor of 24', f36: 'factor of 36', prime: 'prime number' }[R];
    const top = /^f/.test(R) ? 24 : R === 'prime' ? 47 : 99, xs = new Set(); while (xs.size < 9) xs.add(2 + Math.floor(r() * (top - 1)));
    const items = [...xs].map(x => ({ t: String(x), ok: test(x) }));
    if (!items.some(i => i.ok)) { let x = 2; while (!test(x) || xs.has(x)) x++; items[0] = { t: String(x), ok: true }; }
    return { type: 'pop', q: `Pop every ${say}!`, items, rule: R };
  },
};
const MSKILL_GAMES = {
  'time-hour': ['clock', 'clock', 'clock'], 'time-quarter': ['clock', 'clock', 'clock'], 'elapsed-time': ['later', 'later', 'clock'],
  'fractions-meaning': ['pizza', 'pizza', 'pizza'], 'equivalent-fractions': ['pizzaEq', 'pizzaEq'], 'compare-fractions': ['pizza'], 'fraction-of-amount': ['pizza'], halves: ['pizza'], quarters: ['pizza'], thirds: ['pizza'], 'fractions-of-group': ['pizza'],
  'add-mental': ['balance', 'balance'], 'add-2digit': ['balance'], 'subtract-2digit': ['balance'], 'word-problems': ['coins', 'balance'],
  'times-2-10': ['pop:even'], 'times-5': ['pop:mult5'], 'times-3': ['pop:mult3'], 'times-4': ['pop:mult4'], factors: ['pop:f24', 'pop:prime', 'pop:f36'], 'compare-numbers': ['pop:gt50'], divisibility: ['pop:mult3', 'pop:mult5', 'pop:even'],
};
// Memory flip pairs from 4 problems with short labels, all different
function memoryOf(probs) {
  const ok = probs.filter(p => p.mem), pairs = [];
  for (const p of ok) if (!pairs.some(q => q[0] === p.mem || q[1] === p.a)) pairs.push([p.mem, p.a]);
  return pairs.length >= 3 ? { type: 'memory', q: 'Memory flip: find the pairs that match', pairs: pairs.slice(0, 4) } : null;
}
const lightningOf = (items, q = 'Lightning round! True or false?') => (items.length >= 4 ? { type: 'lightning', q, items } : null);

/* ---------- Facts ----------
   fact: A sentence with the [answer] in square brackets. | wrong; wrong; wrong
   The wrong answers must make the sentence clearly false, and each is a real choice for the gap. */
function factOf(val) {
  const [t, w] = String(val).split('|').map(x => x.trim()), m = (t || '').match(/^(.*?)\[([^\]]+)\](.*)$/);
  if (!m) return null;
  return { pre: m[1], key: m[2], post: m[3], wrongs: splitList(w || '') };
}
const factPut = (f, x) => `${f.pre}${x}${f.post}`;
const fq = {
  gap: (f, r) => ({ type: 'gap', q: factPut(f, '_'), a: f.key, opts: shuf([f.key, ...shuf(f.wrongs, r).slice(0, 2)], r) }),
  tf: (f, yes, r) => ({ type: 'tf', q: factPut(f, yes ? f.key : shuf(f.wrongs, r)[0]), a: yes, why: factPut(f, f.key) }),
  letters: f => (/^[\p{L}’'-]{3,10}$/u.test(f.key) ? { type: 'letters', q: factPut(f, '_'), a: f.key } : null),
  pick: (f, r) => ({ type: 'mcq', q: 'Which one is true?', opts: shuf([{ t: factPut(f, f.key), ok: true }, ...shuf(f.wrongs, r).slice(0, 2).map(w => ({ t: factPut(f, w), ok: false }))], r) }),
  line: (f, yes, r) => ({ t: factPut(f, yes ? f.key : shuf(f.wrongs, r)[0]), a: yes, why: factPut(f, f.key) }),
};

/* ---------- Building a lesson out ---------- */
// `have` is how many scored steps the lesson already has; returns the extra steps to put before its own game and checks
function lessonDrill(kid, l, have) {
  if (l.lang) return [];
  const band = bandOf(kid), want = Math.max(0, (DRILL[band] || 45) - have), r = drillRng(`${kid.id}|${l.id}|${today()}`);
  if (!want) return [];
  const pack = packFor(l.tree, l.band) || { units: [] }, all = pack.units.flatMap(u => u.lessons), at = all.indexOf(l);
  const before = at > 0 ? all.slice(0, at).reverse() : [], unitBefore = before.filter(x => x.unit === l.unit), older = before.filter(x => x.unit !== l.unit);
  const step = (item, gen, kind = 'try') => ({ kind, ex: '', item, gen });
  if (l.tree === 'maths' && MSKILL.S[l.skill]) return mathsDrill(l, want, r, band, unitBefore, step);
  if ((l.facts || []).length) return factDrill(l, want, r, band, unitBefore, older, step);
  return [];
}
function mathsDrill(l, want, r, band, unitBefore, step) {
  const gens = MSKILL.S[l.skill], seen = new Set();
  // A new question on the topic; a topic with only a few possible questions (Pythagoras triples) repeats some
  const fresh = (fs = gens) => { for (let i = 0; i < 60; i++) { const p = fs[Math.floor(r() * fs.length)](r); if (p && p.wrongs.length && (i >= 40 || !seen.has(p.ask + p.a))) { seen.add(p.ask + p.a); return p; } } return null; };
  const games = (MSKILL_GAMES[l.skill] || []).map(g => { const [name, arg] = g.split(':'); return step(MGAMES[name](r, arg || (name === 'coins' ? band : l.skill)), `m.${name}`); });
  const pool = Array.from({ length: 6 }, () => fresh()).filter(Boolean), mem = memoryOf(pool);
  if (mem) games.push(step(mem, 'm.memory', 'play'));
  const lt = lightningOf(pool.slice(0, 5).map((p, i) => { const it = mq.tf(p, (i + Math.floor(r() * 2)) % 2 === 0, r); return { t: it.q, a: it.a, why: it.why, calc: p.calc, unit: p.unit, shown: it.shown }; }));
  if (lt) games.push(step(lt, 'm.lightning', 'play'));
  const earlier = unitBefore.map(x => x.skill).filter(s => MSKILL.S[s] && s !== l.skill), mixN = earlier.length ? Math.min(Math.round(want * 0.2), 8) : 0;
  const rest = Math.max(0, want - games.length - mixN), each = Math.ceil(rest / 3), out = { gap: [], mcq: [], tf: [] };
  let yes = Math.floor(r() * 2);
  for (const kind of ['gap', 'mcq', 'tf']) for (let i = 0; i < each && out.gap.length + out.mcq.length + out.tf.length < rest; i++) {
    const p = fresh(); if (!p) break;
    out[kind].push(step(kind === 'gap' ? (p.gap ? mq.gap(p) : mq.mcq(p, r)) : kind === 'mcq' ? mq.mcq(p, r) : mq.tf(p, yes++ % 2 === 0, r), `m.${kind}`));
  }
  const mix = [];
  for (let i = 0; i < mixN; i++) { const p = fresh(MSKILL.S[earlier[i % earlier.length]]); if (p) mix.push(step(i % 2 && !p.gap ? mq.mcq(p, r) : p.gap ? mq.gap(p) : mq.mcq(p, r), 'm.mix')); }
  const g = games.slice(0, Math.max(0, want - mix.length - out.gap.length - out.mcq.length - out.tf.length)), third = Math.ceil(g.length / 3);
  return [...out.gap, ...g.slice(0, third), ...out.mcq, ...g.slice(third, 2 * third), ...out.tf, ...g.slice(2 * third), ...mix].slice(0, want);
}
function factDrill(l, want, r, band, unitBefore, older, step) {
  const fs = l.facts.filter(Boolean), yesAt = Math.floor(r() * 2), G = {};
  const add = (name, prio, items) => { G[name] = { prio, items: items.filter(Boolean) }; };
  add('gap', 1, fs.map(f => step(fq.gap(f, r), 'f.gap')));
  add('tf', 1, fs.map((f, i) => step(fq.tf(f, (i + yesAt) % 2 === 0, r), 'f.tf')));
  add('pick', 2, fs.map(f => step(fq.pick(f, r), 'f.pick')));
  const lines = shuf(fs, r).map((f, i) => fq.line(f, i % 2 === 0, r));
  add('lightning', 2, [lightningOf(lines.slice(0, 5)), lightningOf(lines.slice(5, 10), 'Lightning round 2! True or false?')].map(x => x && step(x, 'f.lightning', 'play')));
  const sortSet = shuf(fs, r).slice(0, 4).map((f, i) => ({ t: factPut(f, i % 2 ? shuf(f.wrongs, r)[0] : f.key), b: i % 2 ? 'False' : 'True' }));
  add('sort', 2, sortSet.length >= 4 ? [step({ type: 'sort', q: 'Sort each one: true or false?', bins: ['True', 'False'], items: shuf(sortSet, r) }, 'f.sort', 'play')] : []);
  add('letters', 2, fs.map(fq.letters).filter(Boolean).slice(0, 3).map(x => step(x, 'f.letters')));
  add('coins', 2, l.tree === 'money' && band !== 'makers' ? [step(MGAMES.coins(r, band), 'f.coins'), step(MGAMES.coins(r, band), 'f.coins')] : []);
  add('tf2', 3, fs.map((f, i) => step(fq.tf(f, (i + yesAt) % 2 !== 0, r), 'f.tf2')));
  const groups = Object.values(G), count = () => groups.reduce((n, g) => n + g.items.length, 0);
  // Too many for this band: drop the least important first, a step at a time from the biggest group
  for (let prio = 3; prio >= 1 && count() > want; prio--) while (count() > want) { const g = groups.filter(x => x.prio === prio && x.items.length).sort((a, b) => b.items.length - a.items.length)[0]; if (!g) break; g.items.pop(); }
  // Too few: facts from earlier lessons in the unit, then earlier units, nearest first
  const mix = [];
  for (const ls of [unitBefore, older]) for (const x of ls) for (const f of (x.facts || []).filter(Boolean)) { if (count() + mix.length >= want) break; mix.push(step(mix.length % 2 ? fq.tf(f, r() < 0.5, r) : fq.gap(f, r), 'f.mix')); }
  const lt = G.lightning.items;
  return [...G.gap.items, ...lt.slice(0, 1), ...G.tf.items, ...G.letters.items, ...G.pick.items, ...G.sort.items, ...G.coins.items, ...G.tf2.items, ...lt.slice(1), ...mix];
}
