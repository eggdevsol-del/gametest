-- Each Character Growth prize now sits on the leaf of the lesson that won it, so the prize history records which
-- lesson that was. The lesson's leaf on the plant reads it from the kid's growth doc (`done[lesson].prize`, with
-- the XP the first pass earned in `done[lesson].xp`); this column is for the grown-ups' reports.
alter table island_prizes add column if not exists lesson_id text;
