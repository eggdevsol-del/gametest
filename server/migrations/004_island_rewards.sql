-- Island rewards: prizes won in Character Growth, everything bought in the island shop, and farm feedings.
-- The island itself (what's placed, makeover colours, the farm paddock, the feed bin) stays in the kid's doc in
-- `kids`; these tables keep the history for the grown-ups' reports. The server fills them from the app's events
-- (growth.prize, island.buy and island.feed), which are also kept in `events`.

-- One row per prize: a makeover colour, an animal or special item, or a chest of bonus XP. `lessons_at` is how
-- many lessons the kid had passed when they won it; `gap` is how many lessons it took and `pace` how many they'd
-- passed in the 7 days before, which sets the gap to the next prize (`next_gap`).
create table if not exists island_prizes (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  prize_id text not null,
  name text,
  kind text check (kind in ('look', 'item', 'chest')),
  big boolean not null default false,
  prize_no integer,
  lessons_at integer,
  gap integer,
  pace integer,
  next_gap integer,
  won_at timestamptz not null default now()
);
create index if not exists island_prizes_kid on island_prizes (family_id, kid_id, won_at);

-- Every island shop purchase: animals, toys, tools, makeover colours, the farm paddock and bags of feed.
create table if not exists island_purchases (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  item text not null,
  name text,
  category text,
  paid_with text check (paid_with in ('xp', 'cash')),
  price integer,
  bought_at timestamptz not null default now()
);
create index if not exists island_purchases_kid on island_purchases (family_id, kid_id, bought_at);

-- Every time a kid feeds their farm animals: how many animals, the scoops used, whether they were hungry, the
-- scoops left in the bin and the XP it earned.
create table if not exists farm_feedings (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  animals integer not null,
  scoops integer not null,
  were_hungry boolean not null default false,
  scoops_left integer,
  xp integer,
  fed_at timestamptz not null default now()
);
create index if not exists farm_feedings_kid on farm_feedings (family_id, kid_id, fed_at);
