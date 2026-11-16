-- Photo guides for custom chores: a grown-up does the chore once, photographing each step, and those photos
-- become the kids' how-to guide. The chore itself (pay, type, who does it) stays with the other custom chores
-- in family_settings; this table holds the steps and photos. Synced like kids and jobs (collection "guides").

create table if not exists chore_guides (
  family_id text not null references families(id) on delete cascade,
  id text not null, -- the custom chore's key
  photo_mode text check (photo_mode in ('each', 'end')), -- kids photograph every step, or just the finished job
  step_count integer,
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);

-- What each photo is for: 'proof' (a kid's finished job), 'step' (a kid's photo of one step) or 'guide'
-- (a grown-up's how-to photo). Guide photos are deleted with their guide.
alter table photos add column if not exists kind text not null default 'proof';
create index if not exists photos_family_kind on photos (family_id, kind);
