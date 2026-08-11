-- EMPLOYTEENS — undo the fake 14+ inventory
-- Run in Supabase Dashboard → SQL Editor.
--
-- The v6/v7 audit "unlocked" ~27 chain listings from 16 down to 14 on the
-- strength of reason strings like
--
--   "legal: NY permits at 14: mercantile store and retail sales;
--    employer policy unknown"
--
-- Glossier, Eataly, Blue Bottle, Thuma. None of them hire 14-year-olds. The
-- law says what is PERMITTED; it says nothing about who is HIRING, and we
-- treated the first as evidence of the second. Every one of those rows was a
-- dead end for the teen who tapped it.
--
-- lib/jobs/child-labor.ts now holds at 16 whenever employer_min_age is null,
-- so the next audit will not recreate these. This repairs the rows already
-- written.

UPDATE public.jobs
   SET min_age = 16,
       min_age_reason = COALESCE(min_age_reason, '') ||
         ' | held at 16: law permits younger but employer policy is unknown'
 WHERE kind = 'job'
   AND min_age < 16
   AND employer_min_age IS NULL;

-- What that touched, and what is LEGITIMATELY still under 16: anything with a
-- declared employer age, plus the curated opportunity rows, which set their
-- age deliberately from a grade range.
--
--   SELECT source, min_age, count(*)
--     FROM public.jobs
--    WHERE min_age < 16 AND status = 'active'
--    GROUP BY 1, 2 ORDER BY 3 DESC;
--
-- Expect only source='opportunity' and source='local' to remain.
