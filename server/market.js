// The pretend Market's prices, worked out exactly as the app works them out (buildMarket and FUNDS in
// public/chorecast/index.html): a seeded random walk, one step every 3 hours since 1 January 2026. The server needs
// them to check that a trade on a kid's iPad used the real price. Keep the two in step: change one, change the other.
export const EPOCH = Date.UTC(2026, 0, 1), TICK = 3 * 3600e3;
export const FUNDS = [
  { id: 'snail', start: 100, mu: 0.000013, sigma: 0.00022 },
  { id: 'forest', start: 500, mu: 0.00004, sigma: 0.0042 },
  { id: 'scoops', start: 300, mu: 0.000032, sigma: 0.0068, season: 0.00022 },
  { id: 'rocket', start: 200, mu: 0.00006, sigma: 0.012, jump: 0.01 },
];

export function hash(str) { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// The tick the app shows at a moment in time (the app never shows tick 0).
export const tickAt = ms => Math.max(1, Math.floor((ms - EPOCH) / TICK));

// Each fund's walk, extended as far as it has been asked for. The random numbers are drawn in the same order as the
// app's loop, so tick i comes out the same here.
const walks = new Map();
function walk(f) {
  let w = walks.get(f.id);
  if (!w) { w = { r: mulberry(hash('fund:' + f.id + ':v31')), p: Math.log(f.start), arr: [Math.exp(Math.log(f.start))] }; walks.set(f.id, w); }
  return w;
}
export function priceAt(id, t) {
  const f = FUNDS.find(x => x.id === id); if (!f) return 0;
  const w = walk(f), r = w.r; t = Math.max(0, Math.floor(t));
  while (w.arr.length <= t) {
    const i = w.arr.length;
    const u1 = r() || 1e-9, u2 = r(); const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let m = f.mu;
    if (f.season) { const doy = ((i * TICK) / 864e5) % 365; m += f.season * Math.cos(2 * Math.PI * (doy - 15) / 365); }
    let ret = m + f.sigma * z;
    if (f.jump) { const j = r(); if (j < f.jump * 0.5) ret -= 0.05 + r() * 0.08; else if (j < f.jump) ret += 0.05 + r() * 0.09; }
    w.p += ret; w.arr.push(Math.exp(w.p));
  }
  return w.arr[t];
}
