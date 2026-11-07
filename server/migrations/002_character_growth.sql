-- Character Growth: each kid's progress (synced like kids and jobs), every lesson attempt and answer for
-- the grown-ups' reports, and the content feed that brings new lessons and Money Moments without an app update.

create table if not exists growth_progress (
  family_id text not null references families(id) on delete cascade,
  id text not null, -- the kid's id
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);

create table if not exists growth_attempts (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  kind text not null check (kind in ('lesson', 'challenge', 'review', 'moment', 'case', 'echo', 'story')),
  item_id text not null,
  tree text,
  band text,
  unit text,
  correct integer not null default 0,
  total integer not null default 0,
  xp integer not null default 0,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists growth_attempts_kid on growth_attempts (family_id, kid_id, created_at desc);

create table if not exists growth_answers (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  item_id text not null,
  question_id text not null,
  skill text,
  correct boolean not null,
  answer jsonb,
  created_at timestamptz not null default now()
);
create index if not exists growth_answers_skill on growth_answers (family_id, kid_id, skill);

-- New content arrives here. Only approved, unexpired rows reach kids.
create table if not exists content_items (
  id text primary key,
  kind text not null check (kind in ('moment', 'market_story', 'lesson', 'case')),
  tree text,
  band text,
  unit text,
  tags text[] not null default '{}',
  data jsonb not null,
  season_from text,
  season_to text,
  starts_at timestamptz,
  expires_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'approved', 'withdrawn')),
  sources jsonb not null default '[]',
  created_by text,
  created_at timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz
);
create index if not exists content_items_status on content_items (status, kind);
