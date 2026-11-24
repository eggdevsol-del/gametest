-- Language courses (te reo Māori, Spanish, Mandarin, Japanese). Every word and phrase a kid has learned is a review
-- card in two directions: r (hear it, pick the meaning) and p (say, type or build it, opened once r reaches box 3).
-- Boxes come back after 1, 3, 7, 16, 35 and 90 days. Kept here rather than in the kid's synced growth doc, which would
-- grow too big with a few thousand cards.
create table if not exists lang_cards (
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  lang text not null,
  card text not null,
  lesson_id text not null,
  box integer not null default 1,
  due date not null,
  right_n integer not null default 0,
  wrong_n integer not null default 0,
  last_on date,
  created_at timestamptz not null default now(),
  primary key (family_id, kid_id, lang, card)
);
create index if not exists lang_cards_due on lang_cards (family_id, kid_id, lang, due);

-- Every review answer: for the grown-ups' report (remembered after a month) and, later, fitting each kid's review
-- timing from our own data. Kept 730 days, like growth_answers.
create table if not exists lang_reviews (
  id bigserial primary key,
  family_id text not null references families(id) on delete cascade,
  kid_id text not null,
  lang text not null,
  card text not null,
  correct boolean not null,
  box_before integer not null,
  gap_days integer,
  ms integer,
  created_at timestamptz not null default now()
);
create index if not exists lang_reviews_kid on lang_reviews (family_id, kid_id, lang, created_at);
create index if not exists lang_reviews_created on lang_reviews (created_at);

-- Recordings of each line of a language with no device voice (te reo Māori), made by a fluent speaker who is a content
-- editor. line_key is the line itself, as the build writes it in growth/<lang>.lines.json. The same for every family.
create table if not exists lang_audio (
  lang text not null,
  line_key text not null,
  mime text not null,
  bytes bytea not null,
  size integer not null,
  recorded_by text,
  approved boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (lang, line_key)
);

-- Language runs in growth_attempts: a Sprouts first sitting, word practice, a unit story and the placement check.
alter table growth_attempts drop constraint if exists growth_attempts_kind_check;
alter table growth_attempts add constraint growth_attempts_kind_check check (kind in ('lesson', 'challenge', 'review', 'moment', 'case', 'echo', 'story', 'lpart', 'lreview', 'lstory', 'lplace'));
