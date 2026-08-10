-- EMPLOYTEENS — Split legal minimum age from employer minimum age
-- Run this in Supabase Dashboard → SQL Editor
--
-- WHY
-- `min_age` was one number standing in for two unrelated facts: what the LAW
-- permits for an occupation, and what a specific EMPLOYER will actually do.
-- Merging them was wrong in both directions.
--
--   Too strict: every unrecognized employer defaulted to 16, even though NJ
--   explicitly permits 14-year-olds in restaurants, supermarkets, retail,
--   hotels, hospitals, libraries, camps and amusement work. Real 14-eligible
--   listings were hidden from the users we can least afford to fail.
--
--   Too loose: nothing read the posting for hours, so a listing advertising
--   shifts until 11pm could surface to a 15-year-old who legally cannot work
--   past 7pm during the school year.
--
-- `min_age` stays as the effective age used for filtering, so nothing that
-- reads it needs to change. The new columns explain how we got there.
--
-- See lib/jobs/child-labor.ts. Sources: NJ DOL workers-under-18 guidance and
-- NY DOL LS-171.

ALTER TABLE public.jobs
  -- Youngest age the law permits for this occupation, ignoring employer policy.
  -- A row with legal_min_age 14 and employer_min_age NULL is a call-to-verify
  -- candidate, not something to hide.
  ADD COLUMN IF NOT EXISTS legal_min_age    INTEGER,
  -- What the employer states or what we confirmed by phone. NULL means unknown,
  -- which is different from "16".
  ADD COLUMN IF NOT EXISTS employer_min_age INTEGER,
  -- Which state's child labor rules govern. NY is materially stricter than NJ
  -- for 16 and 17 year olds during the school year (28 hours a week vs 40).
  ADD COLUMN IF NOT EXISTS work_state       TEXT,
  -- Human-readable trail of how min_age was derived. Makes bad calls debuggable
  -- without re-running the resolver.
  ADD COLUMN IF NOT EXISTS min_age_reason   TEXT;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_work_state_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_work_state_check
  CHECK (work_state IS NULL OR work_state IN ('NJ', 'NY'));

-- Backfill is deliberately NOT done here. Existing rows were aged by the old
-- company-name-only heuristic and need the new resolver, which lives in
-- application code. Run the audit endpoint to populate these:
--   GET /api/admin/audit-jobs?dry=1   (inspect age_corrected and age_samples)
--   GET /api/admin/audit-jobs         (apply)

-- Finding 14-eligible inventory is the whole point, so index for it.
CREATE INDEX IF NOT EXISTS idx_jobs_legal_min_age
  ON public.jobs (legal_min_age, status)
  WHERE status = 'active';

-- Rows the law allows at 14 or 15 but where we have never confirmed the
-- employer's own policy. This is the outreach call list.
CREATE INDEX IF NOT EXISTS idx_jobs_young_unverified
  ON public.jobs (legal_min_age)
  WHERE employer_min_age IS NULL AND legal_min_age < 16 AND status = 'active';
