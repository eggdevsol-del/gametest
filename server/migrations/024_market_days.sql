-- Market town (2026-11-15): each kid's day at the market, for the grown-ups: customers served on shifts, produce sold
-- at their own stall (to townsfolk or a brother or sister), requests done for townsfolk, and the XP all that earned.
-- One row a kid a day, added to as the day goes (POST /api/market/day). The XP itself is counted where it always is
-- (the island's activity and farm limits on the kid's doc); this is the summary.
create table if not exists market_days (
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  day text not null, -- YYYY-MM-DD, the family's day
  served integer not null default 0,
  sold integer not null default 0,
  quests integer not null default 0,
  xp integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (family_id, kid_id, day)
);
