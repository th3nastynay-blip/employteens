-- EMPLOYTEENS — Salary sanity bounds
-- Run this in Supabase Dashboard → SQL Editor
--
-- WHY: job cards always render salary as "$N/hr" with no unit shown.
-- Nothing in the original schema stopped an unconverted annual/monthly
-- figure from a source like JSearch from landing in salary_min/salary_max —
-- found 2026-07-25 (see app/api/ingest/jsearch/route.ts and the
-- sanitizeHourlyWage() guard in lib/jobs/ingest-pipeline.ts, both fixed
-- alongside this migration). This is the DB-level backstop: even a future
-- ingest source or a hand-typed local-sources.ts entry that skips the
-- application-level checks cannot insert an implausible hourly figure.
-- No legitimate teen part-time hourly wage is anywhere near $100/hr.

-- First, null out any existing rows that already violate the bound —
-- the CHECK constraint can't be added while violating rows exist, and a
-- $45,000 "hourly wage" already live is exactly the bug this migration
-- exists to catch. Falls back to the job card's existing "Competitive pay"
-- display, same as any other job with no salary data.
UPDATE jobs SET salary_min = NULL WHERE salary_min IS NOT NULL AND (salary_min <= 0 OR salary_min > 100);
UPDATE jobs SET salary_max = NULL WHERE salary_max IS NOT NULL AND (salary_max <= 0 OR salary_max > 100);

-- Postgres has no "ADD CONSTRAINT IF NOT EXISTS" — guard manually so this
-- migration is safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_min_plausible_hourly') THEN
    ALTER TABLE jobs ADD CONSTRAINT salary_min_plausible_hourly CHECK (salary_min IS NULL OR (salary_min > 0 AND salary_min <= 100));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'salary_max_plausible_hourly') THEN
    ALTER TABLE jobs ADD CONSTRAINT salary_max_plausible_hourly CHECK (salary_max IS NULL OR (salary_max > 0 AND salary_max <= 100));
  END IF;
END $$;
