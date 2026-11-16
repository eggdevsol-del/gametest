-- Push notification addresses from the iOS app, one per signed-in device. A device that's removed takes its token
-- with it. tz is the device's time zone, for the kids' chore reminder at the family's chosen hour.
create table if not exists push_devices (
  device_id text primary key references devices(id) on delete cascade,
  family_id text not null references families(id) on delete cascade,
  token text not null,
  environment text not null default 'production' check (environment in ('production', 'sandbox')),
  tz text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reminded_on text,
  failed_at timestamptz
);
create index if not exists push_devices_family on push_devices (family_id);
