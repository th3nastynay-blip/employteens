-- EMPLOYTEENS — seasonality is not the same fact as liveness
-- Run in Supabase Dashboard → SQL Editor.
--
-- THE BUG THIS FIXES
-- opportunity-ingest.ts set `status: inSeason(o, month) ? 'active' : 'inactive'`.
-- That conflated two different things:
--
--   liveness   — is this row real, verified, and worth showing at all
--   season     — is the application window open THIS month
--
-- The jobs SELECT policy is `USING (status = 'active' ...)`, so the moment an
-- entry went out of season it became unreadable BY CLIENTS ENTIRELY. The
-- Extracurriculars page then asked for `.in('status', ['active','inactive'])`
-- to build its "coming later" section — a query RLS can never satisfy. All 31
-- curated entries sat in the table as `inactive` and the page rendered
-- "0 open now" while the calendar, which reads the seed file directly rather
-- than the database, cheerfully showed 22. That gap between the two halves of
-- the same page is what exposed it.
--
-- THE FIX
-- status means alive. A curated opportunity that we verified last week is
-- alive in February whether or not you can apply in February. Seasonality
-- moves to its own column, and the UI derives open-vs-upcoming from it.
--
-- This also removes the seed/database split I flagged when building the
-- calendar: month arrays lived only in lib/jobs/opportunity-sources.ts, so
-- cards came from Supabase and timing came from a bundled file. Now both
-- come from the row.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS active_months SMALLINT[];

COMMENT ON COLUMN public.jobs.active_months IS
  'Months (1-12) the application window is open. NULL or empty = open all year. Wraps across the year boundary, e.g. {9,10,11,12,1,2,3}. Liveness lives in status; this is season only.';

-- Guard the contents. A 13 in here would silently never match.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_active_months_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_active_months_check
  CHECK (
    active_months IS NULL
    OR (
      array_length(active_months, 1) IS NULL
      OR (SELECT bool_and(m BETWEEN 1 AND 12) FROM unnest(active_months) AS m)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Bring the 31 curated entries back to life.
--
-- They are not dead. They were verified on 2026-08-10 and every link was
-- checked. They were marked inactive purely because their window was shut,
-- which is now a different column.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.jobs
   SET status    = 'active',
       is_active = true
 WHERE source = 'opportunity'
   AND status  = 'inactive';

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────────────────────
-- Expect 31 active opportunity rows:
--
--   SELECT kind, status, count(*) FROM public.jobs
--    WHERE source = 'opportunity' GROUP BY kind, status ORDER BY 3 DESC;
--
-- active_months is backfilled by the next run of
-- POST /api/ingest/opportunities, which upserts every seed entry. Until then
-- active_months is NULL, which the UI reads as "open all year" — the safe
-- direction to be wrong in, since it shows the entry rather than hiding it.
