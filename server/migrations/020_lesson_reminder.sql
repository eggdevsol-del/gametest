-- The kids' lesson reminder: the day each kid's iPad last heard "Lesson time!", so it comes at most once a day.
-- (019 is kept for the language courses, which aren't live yet.)
alter table push_devices add column if not exists lesson_reminded_on text;
