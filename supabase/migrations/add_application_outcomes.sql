-- EMPLOYTEENS — Application outcome loop
-- Run this in Supabase Dashboard → SQL Editor
--
-- WHY THIS EXISTS
-- The platform's stated KPI is interviews and hires, but nothing in the schema
-- could measure either. `applications.status` tracked what the TEEN did
-- (saved / applied) and was advanced manually from the tracker UI; it never
-- recorded what the EMPLOYER did, or when. Without a timestamped employer
-- response there is no response rate, no time-to-response, no interview rate,
-- and therefore no honest basis for any employer trust score later on.
--
-- THE ONE DISTINCTION THAT MATTERS HERE
--   outcome IS NULL          → we never got an answer from the teen. UNKNOWN.
--   outcome = 'no_response'  → the teen told us the employer ghosted them.
-- These are not the same thing and must never be collapsed. Self-reported
-- feedback loops routinely see 10–25% completion, so the NULLs will dominate
-- early. Every metric built on this data has to report its own coverage rate
-- alongside the result, or it is measuring the responders, not the employers.

-- ── 1. 'hired' becomes a real status ──────────────────────────────────────
-- Previously a hire had to be recorded as 'offered'. Conflating an offer with
-- an accepted job makes the headline KPI unmeasurable.
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('saved', 'applied', 'interviewing', 'offered', 'hired', 'rejected'));

-- ── 2. Outcome columns ────────────────────────────────────────────────────
ALTER TABLE public.applications
  -- When the teen confirmed they actually applied (ApplyConfirmSheet "Yes").
  -- Distinct from created_at, which is when the job was first saved.
  ADD COLUMN IF NOT EXISTS applied_at            TIMESTAMPTZ,
  -- What the employer did, as reported by the teen.
  ADD COLUMN IF NOT EXISTS outcome               TEXT,
  -- When the teen told us. Used for coverage/lag analysis, not for metrics.
  ADD COLUMN IF NOT EXISTS outcome_reported_at   TIMESTAMPTZ,
  -- Best estimate of when the employer first made contact. For a same-session
  -- report this is close to accurate; for a late report it is an upper bound,
  -- so time-to-response should be read as "no slower than".
  ADD COLUMN IF NOT EXISTS first_response_at     TIMESTAMPTZ,
  -- Prompt cadence bookkeeping (see lib/outcomes.ts — max 2 asks, ever).
  ADD COLUMN IF NOT EXISTS outcome_checks        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_outcome_check_at TIMESTAMPTZ;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_outcome_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_outcome_check
  CHECK (outcome IS NULL OR outcome IN (
    'no_response',      -- ghosted (terminal, only after the 2nd ask)
    'rejected',         -- explicit no
    'interview',        -- interview scheduled or held  ← the primary KPI
    'hired',            -- got the job                  ← the north star
    'position_filled'   -- already filled / no longer hiring
  ));

-- ── 3. Backfill ───────────────────────────────────────────────────────────
-- Existing rows that reached 'applied' or beyond have no applied_at. updated_at
-- is the closest available proxy (the tracker writes it on every transition).
-- Marked as approximate: these rows are excluded from time-to-response math
-- by the admin endpoint, which only trusts rows where applied_at was stamped
-- at confirm time going forward.
UPDATE public.applications
   SET applied_at = COALESCE(applied_at, updated_at, created_at)
 WHERE status IN ('applied', 'interviewing', 'offered', 'hired', 'rejected')
   AND applied_at IS NULL;

-- ── 4. Indexes ────────────────────────────────────────────────────────────
-- Drives the "which application should we ask about?" query on app open.
CREATE INDEX IF NOT EXISTS idx_applications_outcome_due
  ON public.applications (user_id, applied_at)
  WHERE outcome IS NULL AND applied_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_applications_outcome
  ON public.applications (outcome, outcome_reported_at);

-- ── 5. Admin aggregates ───────────────────────────────────────────────────
-- security_invoker = on so RLS still applies to anyone who is not service
-- role. Without it these views would be a read-everyone's-applications hole.

DROP VIEW IF EXISTS public.employer_response_stats;
CREATE VIEW public.employer_response_stats
WITH (security_invoker = on) AS
SELECT
  lower(trim(j.company))                                            AS employer,
  count(*)                                                          AS applications,
  count(a.outcome)                                                  AS reported,
  -- Coverage: what fraction of applications we actually heard back about.
  -- Read every column below through this number.
  round(count(a.outcome)::numeric / nullif(count(*), 0), 3)         AS report_rate,
  count(*) FILTER (WHERE a.outcome IN ('interview', 'hired', 'rejected', 'position_filled')) AS employer_responded,
  count(*) FILTER (WHERE a.outcome = 'interview')                   AS interviews,
  count(*) FILTER (WHERE a.outcome = 'hired')                       AS hires,
  count(*) FILTER (WHERE a.outcome = 'no_response')                 AS ghosted,
  percentile_cont(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (a.first_response_at - a.applied_at)) / 86400
  ) FILTER (WHERE a.first_response_at IS NOT NULL AND a.applied_at IS NOT NULL)
                                                                    AS median_days_to_response,
  -- HARD GATE. Nothing user-facing may render a row where this is false.
  -- Five reported outcomes is already a thin sample; below that the numbers
  -- are noise wearing a percentage sign.
  (count(a.outcome) >= 5)                                           AS has_signal
FROM public.applications a
JOIN public.jobs j ON j.id = a.job_id
WHERE a.applied_at IS NOT NULL
GROUP BY lower(trim(j.company));

COMMENT ON VIEW public.employer_response_stats IS
  'Employer-level outcome aggregates. Instrumentation only — do NOT surface any row where has_signal = false, and never display a rate without its report_rate.';

DROP VIEW IF EXISTS public.outcome_funnel;
CREATE VIEW public.outcome_funnel
WITH (security_invoker = on) AS
SELECT
  count(*)                                                          AS applications,
  count(a.outcome)                                                  AS reported,
  round(count(a.outcome)::numeric / nullif(count(*), 0), 3)         AS report_rate,
  count(*) FILTER (WHERE a.outcome IN ('interview', 'hired', 'rejected', 'position_filled')) AS responses,
  count(*) FILTER (WHERE a.outcome = 'interview')                   AS interviews,
  count(*) FILTER (WHERE a.outcome = 'hired')                       AS hires,
  count(*) FILTER (WHERE a.outcome = 'no_response')                 AS ghosted
FROM public.applications a
WHERE a.applied_at IS NOT NULL;
