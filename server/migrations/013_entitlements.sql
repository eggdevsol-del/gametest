-- What each family has bought or been given. App Store purchases are keyed by Apple's original transaction id, so a
-- renewal, refund or restore updates the same row. Notifications from Apple are kept once each (by their uuid).
create table if not exists entitlements (
  id text primary key,
  family_id text not null references families(id) on delete cascade,
  source text not null check (source in ('app_store', 'web', 'grant', 'school')),
  product_id text not null,
  plan text not null,
  lifetime boolean not null default false,
  founding boolean not null default false,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  auto_renew boolean,
  in_trial boolean not null default false,
  environment text,
  updated_at timestamptz not null default now(),
  last_payload jsonb
);
create index if not exists entitlements_family on entitlements (family_id);

create table if not exists app_store_notifications (
  uuid text primary key,
  type text not null,
  subtype text,
  original_transaction_id text,
  family_id text,
  received_at timestamptz not null default now(),
  payload jsonb not null default '{}'
);
