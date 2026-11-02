// What a kid's iPad may change on its own kid record without a grown-up unlocking it. Grown-ups' phones, and kids'
// iPads unlocked with the PIN, aren't checked here. Kids can play, move money between jars, buy and sell in the Market
// and the island shop, and collect vault interest. Every change to their money has to be one of those, recorded as a new
// statement entry, and add up, so a kid can't hand themselves money a grown-up would then pay out.
// XP from lessons, habits and island jobs is still counted on the device: it's game points and can't become money.
// The island shop's prices come from the app's catalog.js, so nothing can be bought for less than the shop asks, and
// farm sales can't earn more XP in a day than the family's farm limit.
import { FUNDS, priceAt, tickAt } from './market.js';
import { ITEMS, LAND, SIZES, LOOKS, SETS, RULES } from './catalog.js';

const JARS = ['spend', 'save', 'invest', 'give'];
// Only grown-ups set who the kid is and their pay totals.
const GROWN_UP = ['name', 'age', 'avatar', 'hue', 'order', 'createdAt', 'earned', 'taxPaid'];
// Statement entries a kid's own actions make. Pay, payouts and bonuses come from grown-ups.
const KID_KINDS = new Set(['move', 'spend', 'buy', 'sell', 'interest', 'xp']);
const DAY = 864e5, LEDGER_MAX = 240;

// Deep equality that ignores key order (Postgres jsonb reorders keys) and treats a missing value and null alike.
export function same(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
  const ka = Object.keys(a).filter(k => a[k] != null), kb = Object.keys(b).filter(k => b[k] != null);
  return ka.length === kb.length && ka.every(k => same(a[k], b[k]));
}
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const cashOf = k => JARS.reduce((t, j) => t + num((k.jars || {})[j]), 0);
const dayNo = key => Date.parse(key + 'T00:00:00Z') / DAY;
// The latest date it can be anywhere on Earth right now, as the app writes dates.
const latestDay = now => new Date(now + 14 * 3600e3).toISOString().slice(0, 10);
const stale = () => ({ code: 'stale', message: 'Something changed on another device, so this iPad has the latest now. Try that again.' });
const nope = why => ({ code: 'not_allowed', message: `That wasn’t saved: ${why}` });

// prev and next are the whole kid record before and after the write; settings is the family's settings.
// Returns null when the change is fine, else { code, message }.
export function checkKidWrite(prev, next, settings, now = Date.now()) {
  for (const f of GROWN_UP) if (!same(prev[f], next[f])) return nope(`only a grown-up can change ${f === 'earned' || f === 'taxPaid' ? 'pay totals' : 'a kid’s profile'}.`);

  // The statement: new entries go on top, and everything already there stays exactly as it was (the oldest drop off
  // the bottom past 240).
  const P = Array.isArray(prev.ledger) ? prev.ledger : [], N = Array.isArray(next.ledger) ? next.ledger : [];
  if (N.length > LEDGER_MAX + 60) return nope('the statement is too long.');
  const had = new Set(P.map(e => e && e.id));
  let fresh = 0; while (fresh < N.length && N[fresh] && !had.has(N[fresh].id)) fresh++;
  const kept = N.slice(fresh);
  if (kept.length < Math.min(P.length, Math.max(0, LEDGER_MAX - fresh)) || !same(kept, P.slice(0, kept.length))) return stale();

  const ids = new Set(); let delta = 0, interest = 0, sold = 0, bought = 0, spent = 0, interestEntries = 0; const ticks = [];
  for (const e of N.slice(0, fresh)) {
    if (!e || typeof e.id !== 'string' || ids.has(e.id) || !KID_KINDS.has(e.kind)) return nope('only a grown-up can add pay or bonuses.');
    ids.add(e.id);
    const a = e.amt; if (typeof a !== 'number' || !Number.isFinite(a)) return nope('an amount is missing.');
    if (e.kind === 'move') continue;
    if (e.kind === 'xp') { if (a !== 0) return nope('XP isn’t money.'); continue; }
    if ((e.kind === 'spend' || e.kind === 'buy') ? a > 0 : a < 0) return nope('an amount has the wrong sign.');
    if (e.kind === 'buy' || e.kind === 'sell') {
      const at = num(e.at); if (at < now - DAY || at > now + 10 * 60e3) return stale();
      ticks.push(tickAt(at));
    }
    delta += a;
    if (e.kind === 'interest') { interest += a; interestEntries++; }
    else if (e.kind === 'sell') sold += a;
    else if (e.kind === 'buy') bought -= a;
    else spent -= a;
  }

  // Jars: never below zero, and the total moves by exactly what the new entries say.
  for (const j of JARS) { const v = (next.jars || {})[j]; if (v != null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0)) return nope('a jar can’t go below zero.'); }
  if (Math.abs(cashOf(next) - cashOf(prev) - delta) > 0.5) return nope('the jars don’t match the statement.');

  // Vault interest: at most once per day, from the last day it was paid, at no more than the family's weekly rate plus
  // the best Trust Score bonus (1%).
  const i0 = prev.interestAt, i1 = next.interestAt;
  if (i1 !== i0 && (typeof i1 !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(i1) || (i0 && i1 < i0) || i1 > latestDay(now))) return nope('the vault date is wrong.');
  if (interest > 0) {
    if (interestEntries > 1 || !i0 || !(i1 > i0)) return stale();
    const days = Math.min(60, Math.max(1, dayNo(i1) - dayNo(i0))), rate = num(settings && settings.interestWeekly) + 1;
    const most = num((prev.jars || {}).save) * (Math.pow(1 + rate / 100, days / 7) - 1);
    if (interest > Math.ceil(most) + 1) return nope('that’s more interest than the vault pays.');
  }
  if (num(next.interestEarned) - num(prev.interestEarned) > interest + 0.5) return nope('the interest total doesn’t match the statement.');

  // Market: units bought can't be worth more than was paid, and units sold can't fetch more than they're worth, at the
  // price around the time of the trade (a tick either side for clocks, two back for a screen left open).
  let soldMost = 0, boughtLeast = 0; const lo = Math.min(...ticks) - 2, hi = Math.max(...ticks) + 1;
  for (const f of FUNDS) {
    const raw = ((next.holdings || {})[f.id] || {}).units;
    if (raw != null && (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0)) return nope('units can’t go below zero.');
    const du = num(raw) - num(((prev.holdings || {})[f.id] || {}).units); if (Math.abs(du) < 1e-9) continue;
    if (!ticks.length) { if (du > 0) return nope('units come from a trade.'); continue; }
    let pLow = Infinity, pHigh = 0; for (let t = lo; t <= hi; t++) { const p = priceAt(f.id, t); pLow = Math.min(pLow, p); pHigh = Math.max(pHigh, p); }
    if (du > 0) boughtLeast += du * pLow; else soldMost += -du * pHigh;
  }
  if (boughtLeast > bought + 1) return nope('those units cost more than was paid.');

  // Island shop: an item keeps the price it was bought for, a new item was paid for in this change, and selling one back
  // returns at most half what was paid.
  const isP = prev.island || {}, isN = next.island || {}, itemsP = Array.isArray(isP.items) ? isP.items : [], itemsN = Array.isArray(isN.items) ? isN.items : [];
  const before = new Map(itemsP.filter(Boolean).map(i => [i.id, i])), still = new Set(); let newCash = 0, newXp = 0;
  // A purchase is paid in XP or Spend-jar cents, at least the shop's price in that currency.
  const paid = (rec, def) => !!rec && typeof rec === 'object' && ((num(rec.xp) > 0 && num(rec.xp) >= num(def.xp)) || (num(rec.cash) > 0 && num(rec.cash) >= num(def.cash)));
  for (const it of itemsN) {
    if (!it) continue; const old = before.get(it.id);
    if (old) {
      if (still.has(it.id)) return nope('an island item can’t be copied.'); still.add(it.id);
      for (const f of ['t', 'cash', 'xp', 'won']) if (!same(old[f], it[f])) return nope('an island item’s price can’t change.');
    } else {
      const def = ITEMS.get(it.t); if (!def) return nope('that isn’t in the island shop.');
      if (it.won) { if (it.cash || it.xp) return nope('a prize is free.'); if (!def.prize) return nope('only prizes are free.'); }
      else { if (def.prize) return nope('prizes can’t be bought.'); if (!paid(it, def)) return nope('that costs more in the island shop.'); }
      newCash += num(it.cash); newXp += num(it.xp);
    }
  }
  // Land, island sizes, tools, upgrades and looks keep what was paid for them, like items.
  const added = (a, b) => Object.keys(b || {}).filter(k => !(a || {})[k]);
  const buys = [];
  for (const k of added(isP.land, isN.land)) { const def = LAND.get(k); if (!def) return nope('that land isn’t in the shop.'); buys.push([isN.land[k], def]); }
  for (const k of added(isP.sizes, isN.sizes)) { const def = SIZES.get(+k); if (!def) return nope('that island size isn’t in the shop.'); buys.push([isN.sizes[k], def]); }
  if (num(isN.size) !== num(isP.size) && (num(isN.size) !== num(isP.size) + 1 || !(isN.sizes || {})[num(isN.size)])) return nope('an island grows one size at a time.');
  for (const k of added(isP.upgrades, isN.upgrades)) { const def = ITEMS.get(k); if (!def || !def.upgrade) return nope('that upgrade isn’t in the shop.'); buys.push([isN.upgrades[k], def]); }
  for (const k of added(isP.tools, isN.tools)) {
    const def = ITEMS.get(k), v = isN.tools[k]; if (!def || def.cat !== 'tools') return nope('that tool isn’t in the shop.');
    if (v === true) { if (k !== 'bucket' || isP.farm || !isN.farm) return nope('a tool has to be bought.'); continue; } // the paddock's free feed bucket
    buys.push([v, def]);
  }
  for (const k of added(isP.owned, isN.owned)) {
    const def = LOOKS.get(k), v = isN.owned[k]; if (!def) return nope('that look isn’t in the shop.');
    if (v === 'won') { if (!def.prize) return nope('only prize looks are free.'); continue; }
    if (def.prize) return nope('prize looks can’t be bought.'); buys.push([v, def]);
  }
  for (const [rec, def] of buys) { if (!paid(rec, def)) return nope('that costs more in the island shop.'); newCash += num(rec.cash); newXp += num(rec.xp); }
  for (const ty of Object.values(isN.treeType || {})) if (ty && !(isN.owned || {})[`tree:${ty}`]) return nope('that tree type hasn’t been bought.');
  // Farm earnings: only on a day the farm is on, and no more in a day than the family's farm limit.
  const f0 = num(isP.farmXp), f1 = num(isN.farmXp);
  if (f1 !== f0) {
    if (f1 < f0) return nope('farm earnings only go up.');
    if (settings && settings.farmOn === false) return nope('the island farm is switched off.');
    const d0 = isP.farmDay || {}, d1 = isN.farmDay || {}, cap = settings && settings.farmCap === 0 ? Infinity : num(settings && settings.farmCap != null ? settings.farmCap : RULES.farmCap);
    if (typeof d1.d !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(d1.d) || d1.d > latestDay(now) || (d0.d && d1.d < d0.d)) return nope('the farm’s day is wrong.');
    const before0 = d0.d === d1.d ? num(d0.xp) : 0;
    if (Math.abs((num(d1.xp) - before0) - (f1 - f0)) > 0.5 || num(d1.xp) > cap + 0.5) return nope('that’s more than the farm can earn today.');
  }
  // A collection pays its bonus once.
  const newSets = added(isP.sets, isN.sets);
  for (const k of newSets) if (!SETS.has(k)) return nope('that collection isn’t real.');
  if (num(isN.bonusXp) - num(isP.bonusXp) > newSets.length * num(RULES.setXp) + 0.5) return nope('that’s more bonus XP than the collections give.');
  let cashBack = 0, xpBack = 0;
  for (const it of before.values()) if (!still.has(it.id) && !it.won) { cashBack += Math.floor(num(it.cash) / 2); xpBack += Math.floor(num(it.xp) / 2); }
  if (newCash > spent + 0.5) return nope('a new island item wasn’t paid for.');
  const xs0 = num(isP.xpSpent), xs1 = num(isN.xpSpent);
  if (newXp > Math.max(0, xs1 - xs0) + 0.5 || xs1 < xs0 - xpBack - 0.5) return nope('XP spent on the island doesn’t add up.');
  if (sold > soldMost + cashBack + 1) return nope('that sold for more than it’s worth.');
  return null;
}
