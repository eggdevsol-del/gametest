-- What each grown-up agreed to at sign-up: that they're the parent or guardian of the kids they add, and the terms
-- and privacy policy of that date (TERMS_VERSION in server/index.js). Goes with the grown-up's account.
create table if not exists consents (
  user_id text not null references users(id) on delete cascade,
  family_id text references families(id) on delete cascade,
  kind text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, kind, version)
);
