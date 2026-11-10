-- The homes game replaces the floating island in the app (2026-11-10), behind a switch a grown-up can flip back.
-- The classic island stays in each kid's own data (kids.data -> 'island'); this keeps a copy as it was on the day of
-- the switch too: every kid's island, the things they bought and placed, their land, looks, tools, upgrades and
-- unlocks, so nothing's lost whatever happens to the kid's data later.
create table if not exists island_backup (
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  island jsonb not null,
  saved_at timestamptz not null default now(),
  primary key (family_id, kid_id, saved_at)
);
insert into island_backup (family_id, kid_id, island)
  select family_id, id, data -> 'island' from kids where data ? 'island';
