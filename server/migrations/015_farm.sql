-- Every sale at a kid's island farm stand (from the app's farm.sell events): what, how many, the day's price and the
-- XP it paid. For grown-ups' reports and for checking the farm economy pays what it should.
create table if not exists farm_sales (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  product text not null,
  qty integer not null,
  price integer,
  xp integer not null,
  sold_at timestamptz not null default now()
);
create index if not exists farm_sales_family on farm_sales (family_id, kid_id, sold_at desc);
