-- The Cosy Studio on each kid's classic island (the homes game's save: the home as they've done it up, rooms they've
-- built on, what's in Mine, the farm and their wallet ledger), synced like the growth doc so it follows a kid between
-- devices. Before this it was kept only on the device it was played on (localStorage cc:home:<kid id>); the first
-- device to open the kid's island after this sends its copy up.
create table if not exists home_saves (
  family_id text not null references families(id) on delete cascade,
  id text not null, -- the kid's id
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);
