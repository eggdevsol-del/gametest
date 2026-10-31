-- Custom chores a grown-up sends straight to one kid. The send itself lives in family_settings (`sends`), which
-- syncs to every device at once, so it lands on the kid's list immediately; this table keeps the history for the
-- grown-ups' reports. The server fills it from the app's `chore.sent` events, which are also kept in `events`.
-- Custom chores now carry a frequency too (`freq` in family_settings.custom: daily, 2days, twice, weekly,
-- fortnight, monthly or once), which kids see on the chore.
create table if not exists chore_sends (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  chore_key text not null,
  title text,
  tier text check (tier in ('must', 'team', 'gig')),
  freq text,
  sent_by text,
  sent_at timestamptz not null default now()
);
create index if not exists chore_sends_kid on chore_sends (family_id, kid_id, sent_at);
