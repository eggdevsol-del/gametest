-- The grown-up PIN and kids' passcodes, kept only on the server as salted scrypt hashes. Devices send the digits and
-- the server answers yes or no, so no device holds anything it could use to unlock grown-up powers. kid_id '' is the
-- grown-up PIN. Synced data keeps only whether one is set: settings.pinSet, and true in a kid's `pin`.
create table if not exists family_pins (
  family_id text not null references families(id) on delete cascade,
  kid_id text not null default '',
  hash text not null,
  set_by text,
  set_at timestamptz not null default now(),
  primary key (family_id, kid_id)
);

-- Move hashes made by older versions of the app (unsalted SHA-256, readable by every device in the family) out of the
-- synced data. They're checked the old way once, when the right digits next arrive, then upgraded to scrypt.
insert into family_pins (family_id, kid_id, hash)
  select family_id, '', 'legacy$' || (data->>'pinHash') from family_settings
  where jsonb_typeof(data->'pinHash') = 'string' and data->>'pinHash' <> ''
  on conflict do nothing;
update family_settings set data = (data - 'pinHash') || '{"pinSet": true}'::jsonb
  where jsonb_typeof(data->'pinHash') = 'string' and data->>'pinHash' <> '';
update family_settings set data = data - 'pinHash' where data ? 'pinHash';

insert into family_pins (family_id, kid_id, hash)
  select family_id, id, 'legacy$' || (data->>'pin') from kids
  where jsonb_typeof(data->'pin') = 'string' and data->>'pin' <> ''
  on conflict do nothing;
update kids set data = jsonb_set(data, '{pin}', 'true'::jsonb)
  where jsonb_typeof(data->'pin') = 'string' and data->>'pin' <> '';
