-- EMPLOYTEENS — bring the 31 curated opportunities back
-- Run in Supabase Dashboard → SQL Editor.
--
-- WHAT KILLED THEM
-- /api/cron/clean-jobs decided what counts as a curated programme page with
--
--     programPage: j.source === 'local'
--
-- Opportunity rows carry source='opportunity'. So on the first run of that
-- cron — which I scheduled this morning — all 31 competitions, programmes and
-- volunteer entries were re-verified using the STRICT job-posting rules. Those
-- demand an ATS job-ID URL shape that a programme page will never have, so
-- every one failed and was switched off. Explore went from 31 live entries to
-- one.
--
-- Exactly the same bug I had already fixed in audit-jobs, sitting in a second
-- file. Both now key on `kind` as well as source, and kind is NOT NULL with a
-- CHECK constraint so it cannot drift the way a free-text source string did.
-- The 14-day staleness sweep and the duplicate sweep are also scoped to
-- kind='job' now: a 14-day cadence is right for a job req and wrong for an
-- annual competition, and two Knowledge Matters entries share a company and a
-- location of 'Virtual', which the dedupe key read as duplicates.

UPDATE public.jobs
   SET status              = 'active',
       is_active           = true,
       verification_status = 'verified',
       verified_at         = NOW(),
       last_checked_at     = NOW()
 WHERE source = 'opportunity';

-- Expect 31, all active.
SELECT kind, status, count(*)
  FROM public.jobs
 WHERE source = 'opportunity'
 GROUP BY kind, status
 ORDER BY 3 DESC;
