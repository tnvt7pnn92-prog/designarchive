-- The daily quiz is gone from the site, and so is its progress: the quiz_state table (one row
-- per account: the days played and the streak) is dropped with its policy. The first sign-in
-- import and "download my data" stopped reading it in 20260930130000_collection.sql.

drop table if exists public.quiz_state;
