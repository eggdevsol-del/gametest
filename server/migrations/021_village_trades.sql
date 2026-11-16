-- The village (homes prototype): every trade between brothers and sisters, and every sale from one's market stall to
-- another, kept so a grown-up can see what went where. family_id is the signed-in family; room is the family code
-- for a prototype family that isn't signed in. What each side gave: { items: [{ t, fin, used, cond, price }], xp }.
create table if not exists village_trades (
  id bigserial primary key,
  family_id text references families(id) on delete cascade,
  room text,
  kind text not null check (kind in ('trade', 'stall')),
  a_name text not null,
  b_name text not null,
  a_gave jsonb not null,
  b_gave jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists village_trades_family on village_trades (family_id, created_at desc);
create index if not exists village_trades_room on village_trades (room, created_at desc);
