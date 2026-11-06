// Plans, what each allows, and the App Store products that grant them. Prices live in App Store Connect, never here.
// Until launch the server runs with PAYWALL unset and every family has Plus, so everything can be tried out. There's no
// beta: at launch PAYWALL is switched on and the plans start.
import { CATALOG, ITEMS, LOOKS } from './catalog.js';

export const PAYWALL = process.env.PAYWALL === 'on';
export const FOUNDING_SEATS = 1000;
// Every new family has Plus for its first fortnight, without paying (an entitlement with source 'welcome').
export const WELCOME_DAYS = process.env.WELCOME_DAYS != null ? Math.max(0, +process.env.WELCOME_DAYS || 0) : 14;

// `shop` and `funds`: the island shop and Market funds the plan has ('starter' is the catalogue's starter list).
// `rules`: whether grown-ups can set their own interest and tax rates (Free keeps the standard ones, or none).
export const PLANS = {
  free: { name: 'Free', kids: 2, grownups: 1, allLessons: false, extras: false, shop: 'starter', funds: 'starter', rules: false },
  plus: { name: 'Plus', kids: 99, grownups: 2, allLessons: true, extras: true, shop: 'all', funds: 'all', rules: true },
  family: { name: 'Family', kids: 99, grownups: 6, allLessons: true, extras: true, shop: 'all', funds: 'all', rules: true },
};
// The Free plan's money rules: each one on at the standard rate, or off.
export const FREE_RULES = { taxRate: [0, 10], interestWeekly: [0, 2] };

// Whether a plan has a thing: an island shop item ('item', by t, which covers land, sizes, tools and upgrades), a look
// ('look', as 'part:key' or 'tree:key'), land ('land'), an island size ('size'), a collection ('set') or a Market fund
// ('fund'). Prizes are never Plus-only: they're won, not bought.
const ST = CATALOG.starter, STARTER = { items: new Set(ST.items), looks: new Set(ST.looks), land: new Set(ST.land), sets: new Set(ST.sets), funds: new Set(ST.funds) };
export function allowed(limits, kind, id) {
  if (kind === 'fund') return limits.funds === 'all' || STARTER.funds.has(id);
  if (limits.shop === 'all') return true;
  if (kind === 'item') { const d = ITEMS.get(id); return !!d && (!!d.prize || (d.size ? d.size <= ST.maxSize : d.land ? STARTER.land.has(d.land) : STARTER.items.has(id))); }
  if (kind === 'look') { const d = LOOKS.get(id); return !!d && (!!d.prize || STARTER.looks.has(id)); }
  if (kind === 'land') return STARTER.land.has(id);
  if (kind === 'size') return +id <= ST.maxSize;
  if (kind === 'set') return STARTER.sets.has(id);
  return false;
}
const RANK = { free: 0, plus: 1, family: 2 };

// Product ids set up in App Store Connect (task P0-17). Lifetime is Plus for good; a lesson pack opens one subject.
export const PRODUCTS = {
  'chorecast.plus.monthly': { plan: 'plus' },
  'chorecast.plus.yearly': { plan: 'plus' },
  'chorecast.family.monthly': { plan: 'family' },
  'chorecast.family.yearly': { plan: 'family' },
  'chorecast.lifetime': { plan: 'plus', lifetime: true },
  'chorecast.lifetime.founding': { plan: 'plus', lifetime: true, founding: true },
  'chorecast.pack.invest': { pack: 'invest' },
  // The family shop: XP bundles and the Island Club are for one kid (`kid`); a lesson pack opens one subject for the
  // whole family, for good.
  'chorecast.xp.500': { kid: true, xp: 500 },
  'chorecast.xp.1200': { kid: true, xp: 1200 },
  'chorecast.xp.3000': { kid: true, xp: 3000 },
  'chorecast.xp.7500': { kid: true, xp: 7500 },
  'chorecast.club.monthly': { kid: true, xp: 1000, club: true },
  ...Object.fromEntries(['money', 'character', 'work', 'make', 'give', 'maths', 'words', 'science', 'home', 'mind', 'online', 'body'].map(k => [`chorecast.pack.${k}`, { pack: k }])),
  // Language courses: te reo Māori, Spanish, Mandarin and Japanese, every stage
  ...Object.fromEntries(['mi', 'es', 'zh', 'ja'].map(k => [`chorecast.pack.${k}`, { pack: k }])),
};
// The Island Club's members-only prize for each month of the year (January first), placed free from the island shop.
export const CLUB_PRIZES = ['pegasus', 'griffin', 'phoenix', 'narwhal', 'unicorn', 'dragon', 'lyrebird', 'kakapo', 'redpanda', 'dolphin', 'balloon', 'lighthouse'];
export const clubPrize = (when = new Date()) => CLUB_PRIZES[new Date(when).getUTCMonth()];

// The family's plan from its entitlements: the best one still running, plus any lesson packs. `welcome` is set while the
// plan is the free welcome fortnight. Before launch (no PAYWALL) every family has Plus, unless a grown-up has switched
// on "Preview the Free plan" (settings.planPreview), which makes the server and app behave exactly as Free.
export async function planOf(db, familyId) {
  const rows = (await db.query(`select id, source, product_id, plan, lifetime, founding, expires_at, auto_renew, in_trial from entitlements
    where family_id = $1 and revoked_at is null and (expires_at is null or expires_at > now())`, [familyId])).rows;
  let plan = 'free', until = null, trial = false, renews = null, welcome = false;
  for (const r of rows) {
    if (!PLANS[r.plan] || RANK[r.plan] < RANK[plan]) continue;
    if (RANK[r.plan] > RANK[plan] || !r.expires_at || (until && new Date(r.expires_at) > until)) { plan = r.plan; until = r.expires_at ? new Date(r.expires_at) : null; trial = !!r.in_trial; renews = r.auto_renew; welcome = r.source === 'welcome'; }
  }
  const packs = rows.filter(r => r.plan.startsWith('pack:')).map(r => r.plan.slice(5));
  let preview = false;
  if (!PAYWALL) { const r = (await db.query('select data from family_settings where family_id = $1', [familyId])).rows[0], d = r && (typeof r.data === 'string' ? JSON.parse(r.data) : r.data); preview = !!d && d.planPreview === 'free'; }
  const effective = PAYWALL ? plan : preview ? 'free' : 'plus';
  return { plan: effective, bought: plan, preview, until, trial, welcome: PAYWALL && welcome, renews, packs, limits: PLANS[effective], lifetime: rows.some(r => r.lifetime) };
}
