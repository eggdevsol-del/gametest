// How the plans and the family shop are doing, week by week, from our own tables (no third-party analytics).
// Uses DATABASE_URL (Railway Postgres) or the local embedded database, like the server.
//   node scripts/metrics.mjs [weeks]      (default 8)
// Families → welcome fortnight → paying; upgrade moments shown → acted on; plans sheet views by reason; lesson packs,
// Island Club and XP bundles; cancellations and refunds. Test purchases and test families are counted separately.
import { openDb } from '../server/db.js';

const weeks = Math.max(1, Math.min(52, +(process.argv[2] || 8)));
const db = await openDb();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;
const since = `now() - make_interval(weeks => ${weeks})`;
const wk = col => `to_char(date_trunc('week', ${col}), 'YYYY-MM-DD')`;
const table = (title, rows) => { console.log(`\n${title}`); if (!rows.length) return console.log('  (nothing yet)'); console.table(rows); };

table('New families, and how many are paying now', await q(`
  select ${wk('f.created_at')} as week, count(*)::int as families,
    count(*) filter (where exists (select 1 from entitlements e where e.family_id = f.id and e.source = 'welcome'))::int as welcome,
    count(*) filter (where exists (select 1 from entitlements e where e.family_id = f.id and e.source = 'app_store' and e.plan in ('plus', 'family') and e.revoked_at is null))::int as paying
  from families f where f.created_at > ${since} group by 1 order by 1`));

table('Upgrade moments: shown, and what grown-ups did', await q(`
  select moment, count(*) filter (where action = 'shown')::int as shown, count(*) filter (where action = 'plans')::int as to_plans,
    count(*) filter (where action = 'pack')::int as to_pack, count(*) filter (where action = 'dismiss')::int as not_now
  from plan_moments where shown_at > ${since} group by 1 order by 2 desc`));

table('Plans sheet opened, by reason', await q(`
  select coalesce(payload->>'why', '(none)') as why, count(*)::int as opened, count(distinct family_id)::int as families
  from events where type = 'plan.sheet' and created_at > ${since} group by 1 order by 2 desc`));

table('Plan lifecycle from the App Store', await q(`
  select ${wk('created_at')} as week, type, count(*)::int as n from events
  where type in ('plan.welcome', 'plan.purchase', 'plan.buy', 'plan.renew', 'plan.cancel', 'plan.resume', 'plan.lapse', 'plan.refund') and created_at > ${since}
  group by 1, 2 order by 1, 2`));

table('Family shop (App Store purchases; test ones in brackets)', await q(`
  select product_id as product, count(*) filter (where source = 'app_store')::int as sold, count(*) filter (where source = 'test')::int as "(test)",
    count(*) filter (where refunded_at is not null)::int as refunded, coalesce(sum(xp) filter (where source = 'app_store'), 0)::int as xp_given,
    count(distinct family_id) filter (where source = 'app_store')::int as families
  from purchases where created_at > ${since} group by 1 order by 2 desc`));

table('Lesson packs', await q(`
  select plan as pack, count(*)::int as families from entitlements where plan like 'pack:%' and revoked_at is null and starts_at > ${since} group by 1 order by 2 desc`));

table('Kids looking at Plus things, and wishes', await q(`
  select type, count(*)::int as n, count(distinct family_id)::int as families from events
  where type in ('kid.plus_peek', 'shop.wish') and created_at > ${since} group by 1 order by 1`));

await db.close?.();
