-- Errors from the server and from the app in families' browsers, grouped by where they happened and what they said.
-- No request bodies or family data are stored, only the message, a short stack and which family hit it first.
create table if not exists app_errors (
  fingerprint text primary key,
  source text not null check (source in ('server', 'app')),
  place text not null default '',
  message text not null,
  stack text,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  count integer not null default 1,
  family_id text,
  alerted_at timestamptz
);
create index if not exists app_errors_last on app_errors (last_at desc);
