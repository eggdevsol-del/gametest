-- First steps for new families: which welcome card button a grown-up chose before signing up, the pocket-money step,
-- hiding the Getting started checklist, and each kid's first-visit tour with their guide (finished or skipped). The app
-- reports them as `onboard.step` events, which are also kept in `events`; this table shows where new families stop.
-- The pocket-money choice itself lives in family_settings (`pocket`: week in cents, pretend, and the price scale it set),
-- the hidden checklist in family_settings (`start.hidden`), and a finished tour in the kid's doc (`toured`).
create table if not exists first_steps (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text,
  step text not null,
  detail jsonb not null default '{}'::jsonb,
  done_at timestamptz not null default now()
);
create index if not exists first_steps_family on first_steps (family_id, step, done_at);
