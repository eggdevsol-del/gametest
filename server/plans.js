// Plans, what each allows, and the App Store products that grant them. Prices live in App Store Connect, never here.
// Until launch the server runs with PAYWALL unset, and every family has everything (shown as "beta").
export const PAYWALL = process.env.PAYWALL === 'on';
export const FOUNDING_SEATS = 1000;

export const PLANS = {
  free: { name: 'Free', kids: 2, grownups: 1, allLessons: false, extras: false },
  plus: { name: 'Plus', kids: 99, grownups: 2, allLessons: true, extras: true },
  family: { name: 'Family', kids: 99, grownups: 6, allLessons: true, extras: true },
};
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
};

// The family's plan from its entitlements: the best one still running, plus any lesson packs.
export async function planOf(db, familyId) {
  const rows = (await db.query(`select id, source, product_id, plan, lifetime, founding, expires_at, auto_renew, in_trial from entitlements
    where family_id = $1 and revoked_at is null and (expires_at is null or expires_at > now())`, [familyId])).rows;
  let plan = 'free', until = null, trial = false, renews = null;
  for (const r of rows) {
    if (!PLANS[r.plan] || RANK[r.plan] < RANK[plan]) continue;
    if (RANK[r.plan] > RANK[plan] || !r.expires_at || (until && new Date(r.expires_at) > until)) { plan = r.plan; until = r.expires_at ? new Date(r.expires_at) : null; trial = !!r.in_trial; renews = r.auto_renew; }
  }
  const packs = rows.filter(r => r.plan.startsWith('pack:')).map(r => r.plan.slice(5));
  const effective = PAYWALL ? plan : 'plus';
  return { plan: effective, bought: plan, beta: !PAYWALL, until, trial, renews, packs, limits: PLANS[effective], lifetime: rows.some(r => r.lifetime) };
}
