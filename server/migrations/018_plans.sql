-- Plans you can see. The welcome fortnight: every new family has Plus for its first 14 days without paying, kept as an
-- entitlement with source 'welcome'.
alter table entitlements drop constraint if exists entitlements_source_check;
alter table entitlements add constraint entitlements_source_check check (source in ('app_store', 'web', 'grant', 'school', 'welcome'));

-- Upgrade moments shown to grown-ups (a kid finished unit 1, a wish for a Plus thing, the starter island filled, the
-- welcome fortnight ending, Plus ending, the monthly Plus recap) and what they did about each, so the app can space them
-- out and we can see which ones help families.
create table if not exists plan_moments (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text,
  moment text not null,
  action text not null default 'shown',
  shown_at timestamptz not null default now()
);
create index if not exists plan_moments_family on plan_moments (family_id, moment, shown_at desc);
