-- Email checks and password reset links. Only a hash of each emailed token is kept; a token works once.
alter table users add column if not exists email_verified_at timestamptz;

create table if not exists email_tokens (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  kind text not null check (kind in ('verify', 'reset')),
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
create index if not exists email_tokens_user on email_tokens (user_id, kind);
