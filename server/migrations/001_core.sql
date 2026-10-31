-- Core: parent accounts, families, paired devices, sign-in sessions, and the family's synced app data.
-- Every app write also lands in doc_changes, and every user action in events.

create table if not exists users (
  id text primary key,
  email text not null,
  name text not null default '',
  password_hash text not null,
  recovery_hash text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create unique index if not exists users_email_lower on users (lower(email));

create table if not exists families (
  id text primary key,
  name text not null default 'Our family',
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  family_id text not null references families(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'parent',
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);
create index if not exists family_members_user on family_members (user_id);

-- A parent's phone or a kid's paired iPad. Removing a device ends its sessions.
create table if not exists devices (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  user_id text references users(id) on delete set null,
  kind text not null check (kind in ('parent', 'kid')),
  name text not null default '',
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists devices_family on devices (family_id);

-- Only a hash of each session token is stored.
create table if not exists sessions (
  token_hash text primary key,
  family_id text not null references families(id) on delete cascade,
  device_id text not null references devices(id) on delete cascade,
  user_id text references users(id) on delete cascade,
  role text not null check (role in ('parent', 'kid')),
  elevated_until timestamptz,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_device on sessions (device_id);

-- Codes for a second grown-up to join, or for pairing a kid's iPad.
create table if not exists invites (
  code text primary key,
  family_id text not null references families(id) on delete cascade,
  kind text not null check (kind in ('parent', 'device')),
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by text
);

create table if not exists family_settings (
  family_id text primary key references families(id) on delete cascade,
  data jsonb not null default '{}',
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists kids (
  family_id text not null references families(id) on delete cascade,
  id text not null,
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);

create table if not exists jobs (
  family_id text not null references families(id) on delete cascade,
  id text not null,
  kid_id text,
  status text,
  day text,
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);
create index if not exists jobs_family_kid on jobs (family_id, kid_id);
create index if not exists jobs_family_status on jobs (family_id, status);

create table if not exists habits (
  family_id text not null references families(id) on delete cascade,
  id text not null,
  kid_id text,
  data jsonb not null default '{}',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (family_id, id)
);
create index if not exists habits_family_kid on habits (family_id, kid_id);

-- Proof-of-job photos, already compressed to JPEG on the device.
create table if not exists photos (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  mime text not null default 'image/jpeg',
  bytes bytea not null,
  size integer not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists photos_family on photos (family_id);

-- Audit trail of every synced write.
create table if not exists doc_changes (
  seq bigserial primary key,
  family_id text not null,
  collection text not null,
  doc_id text not null,
  op text not null check (op in ('set', 'merge', 'delete')),
  device_id text,
  user_id text,
  created_at timestamptz not null default now()
);
create index if not exists doc_changes_family on doc_changes (family_id, seq);

-- Every in-app event: sign-ins, jobs, approvals, purchases, lessons and so on.
create table if not exists events (
  id bigserial primary key,
  family_id text references families(id) on delete cascade,
  user_id text,
  device_id text,
  kid_id text,
  type text not null,
  payload jsonb not null default '{}',
  client_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists events_family_time on events (family_id, created_at desc);
create index if not exists events_type on events (type);
