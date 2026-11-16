-- Every island activity session (from the app's island.play events): which activity (fishing, surfing, show jumping,
-- ...), how many successes and the XP it paid. For grown-ups' reports and for checking activities pay what they should.
create table if not exists island_play (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  activity text not null,
  successes integer not null,
  xp integer not null,
  played_at timestamptz not null default now()
);
create index if not exists island_play_family on island_play (family_id, kid_id, played_at desc);
