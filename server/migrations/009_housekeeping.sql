-- Daily clean-up (server/housekeeping.js): job photos a family-chosen number of days after review, photos nothing
-- uses, and old events, change log rows, sessions and invites. One row per job holds its last run, so only one
-- server does each day's run.
create table if not exists housekeeping (
  job text primary key,
  last_run timestamptz not null default now(),
  detail jsonb not null default '{}'
);

create index if not exists events_created on events (created_at);
create index if not exists doc_changes_created on doc_changes (created_at);
create index if not exists growth_answers_created on growth_answers (created_at);
create index if not exists photos_family_kind on photos (family_id, kind, created_at);
create index if not exists sessions_expires on sessions (expires_at);
