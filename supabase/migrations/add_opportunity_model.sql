-- EMPLOYTEENS — Unified opportunity model
-- Run this in Supabase Dashboard → SQL Editor, AFTER:
--   1. add_application_outcomes.sql
--   2. add_legal_min_age.sql
--
-- WHY ONE TABLE
-- Jobs and extracurriculars are the same thing from a teen's point of view:
-- something you do that an adult will later vouch for. Splitting them into two
-- tables means two pipelines, two staleness problems, and a UI that asks a
-- 15-year-old whether they are a "jobs person" or an "opportunities person".
-- So: one table, one feed, a `kind` field, and a different verification cadence
-- per kind.
--
-- WHY NOT ONE PIPELINE
-- The ingest pipeline's gates (aggregator detection, ATS job-ID URL patterns,
-- scam scoring, quality score) exist to catch job-board spam. Point them at
-- hosa.org and they would reject a perfectly good competition for looking like
-- a generic landing page. Curated opportunities come in through the existing
-- `isProgramPage` / `is_curated` lane instead: HTTP liveness only, no URL-shape
-- check. Same table, same feed, different door.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. What kind of thing is this
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'job';

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_kind_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_kind_check
  CHECK (kind IN ('job', 'internship', 'program', 'competition', 'volunteer', 'org_role', 'gig'));

-- Everything currently in the table is a job. Explicit rather than implied.
UPDATE public.jobs SET kind = 'job' WHERE kind IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Paid or not is a field, not a separate product
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS is_paid   BOOLEAN,
  ADD COLUMN IF NOT EXISTS pay_note  TEXT;

-- Existing rows are paid jobs.
UPDATE public.jobs SET is_paid = true WHERE is_paid IS NULL AND kind = 'job';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Timing
--
-- This is the whole reason opportunity inventory is cheap: a job req dies in
-- days, an annual competition stays valid for a year. Recording recurrence is
-- what lets the app resurface something in January that closed last March.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS deadline     DATE,
  ADD COLUMN IF NOT EXISTS window_opens DATE,
  ADD COLUMN IF NOT EXISTS recurrence   TEXT;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_recurrence_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_recurrence_check
  CHECK (recurrence IS NULL OR recurrence IN ('annual', 'seasonal', 'rolling', 'one_time'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Cost
--
-- State unknowns explicitly. EC Database prints "Cost unconfirmed" on their
-- detail cards and it reads as honesty rather than sloppiness. A hidden cost
-- is worse than an admitted unknown, especially for the families we serve.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS cost_cents   INTEGER,
  ADD COLUMN IF NOT EXISTS cost_unknown BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Delivery and eligibility
--
-- THE ASX GUARD. EC Database ranked the Australia-and-New-Zealand-only ASX
-- Schools Sharemarket Game third for a Jersey City student, and put a
-- German-language competition run out of Berlin first. Neither was a distance
-- problem: both were virtual. Both were "who is allowed to enter" problems, and
-- they had no field for it.
--
-- Virtual does NOT mean open to everyone. For anything that is not a plain job,
-- delivery / eligible_regions / grade range are REQUIRED (enforced below), so
-- the mistake cannot be made at data entry.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS delivery        TEXT,
  -- e.g. {'US-NJ','US-NY'} for local, {'US'} for national, {'GLOBAL'} for open.
  ADD COLUMN IF NOT EXISTS eligible_regions TEXT[],
  ADD COLUMN IF NOT EXISTS language        TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS min_grade       SMALLINT,
  ADD COLUMN IF NOT EXISTS max_grade       SMALLINT;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_delivery_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_delivery_check
  CHECK (delivery IS NULL OR delivery IN ('in_person', 'virtual', 'hybrid'));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_grade_range_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_grade_range_check
  CHECK (
    (min_grade IS NULL OR min_grade BETWEEN 6 AND 12)
    AND (max_grade IS NULL OR max_grade BETWEEN 6 AND 12)
    AND (min_grade IS NULL OR max_grade IS NULL OR min_grade <= max_grade)
  );

-- Backfill BEFORE adding the constraint. Existing job rows are all in-person
-- in NJ/NY; adding the CHECK first would fail validation against them.
UPDATE public.jobs
   SET delivery = COALESCE(delivery, 'in_person'),
       eligible_regions = COALESCE(eligible_regions, ARRAY['US-NJ', 'US-NY'])
 WHERE kind = 'job';

-- Jobs are exempt (they are gated by location + min_age already). Everything
-- else must declare who can actually participate before it can be stored.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_eligibility_required_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_eligibility_required_check
  CHECK (
    kind = 'job'
    OR (delivery IS NOT NULL
        AND eligible_regions IS NOT NULL
        AND array_length(eligible_regions, 1) > 0
        AND min_grade IS NOT NULL
        AND max_grade IS NOT NULL)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. The ladder
--
-- Every opportunity declares which rungs it moves a teen between. This is what
-- lets ONE feed serve a 14-year-old with no working papers and a 17-year-old
-- with job history, without branching the UI.
--
--   0 not eligible yet   1 eligible (papers in hand)   2 started something
--   3 someone will vouch 4 applied                     5 employer replied
--   6 earning            7 trusted (reference, title, rehire)
--
-- evidence_kind is the honest part, and the thing EC Database structurally
-- cannot say: an open virtual course produces a PDF, a six-month volunteer role
-- produces a human who will pick up the phone. Both belong in the app doing
-- different jobs. Sorting by evidence strength is the differentiator.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS rung_from    SMALLINT,
  ADD COLUMN IF NOT EXISTS rung_to      SMALLINT,
  ADD COLUMN IF NOT EXISTS evidence_kind TEXT;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_rung_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_rung_check
  CHECK (
    (rung_from IS NULL OR rung_from BETWEEN 0 AND 7)
    AND (rung_to IS NULL OR rung_to BETWEEN 0 AND 7)
    AND (rung_from IS NULL OR rung_to IS NULL OR rung_from <= rung_to)
  );

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_evidence_kind_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_evidence_kind_check
  CHECK (evidence_kind IS NULL OR evidence_kind IN ('hours', 'title', 'award', 'reference', 'income', 'certificate'));

-- A real job takes you from "applied" to "earning" and produces income.
UPDATE public.jobs
   SET rung_from = COALESCE(rung_from, 4),
       rung_to   = COALESCE(rung_to, 6),
       evidence_kind = COALESCE(evidence_kind, 'income')
 WHERE kind = 'job';

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Verification cadence, derived from kind
--
-- A job req dies in days. An annual competition is valid for a year. Running
-- the same paranoid check on both wastes the verification budget and adds
-- nothing. Generated so it can never drift out of sync with `kind`.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jobs DROP COLUMN IF EXISTS verify_interval_days;
ALTER TABLE public.jobs
  ADD COLUMN verify_interval_days SMALLINT
  GENERATED ALWAYS AS (
    CASE kind
      WHEN 'job'         THEN 3
      WHEN 'internship'  THEN 7
      WHEN 'gig'         THEN 7
      WHEN 'org_role'    THEN 30
      WHEN 'volunteer'   THEN 30
      WHEN 'program'     THEN 90
      WHEN 'competition' THEN 90
      ELSE 14
    END
  ) STORED;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Organizations
--
-- The supply flywheel. EC Database got 243 youth-led organizations through a
-- Google Form, because those orgs need volunteers and have no reach. Hudson
-- County has teen-founded orgs too and no local aggregator lists them. This is
-- inventory that recruits itself and that a national site cannot replicate.
--
-- Nothing here is auto-published: submitted_by='self' rows stay invisible until
-- verified_at is set.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  category      TEXT,
  website       TEXT,
  logo_url      TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description   TEXT,
  is_youth_led  BOOLEAN NOT NULL DEFAULT false,
  -- 'self' came in through the public submission form, 'curated' we added.
  submitted_by  TEXT NOT NULL DEFAULT 'curated',
  -- Verification means: live website, a reachable human, evidence of recent
  -- activity. NULL means not yet reviewed, and not yet visible.
  verified_at   TIMESTAMPTZ,
  verified_by   TEXT,
  reverify_by   DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organizations_submitted_by_check CHECK (submitted_by IN ('self', 'curated'))
);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Verified organizations are public" ON public.organizations;
CREATE POLICY "Verified organizations are public"
  ON public.organizations FOR SELECT
  USING (verified_at IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Indexes
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_jobs_kind_active
  ON public.jobs (kind, status) WHERE status = 'active';

-- Drives the rung-aware feed.
CREATE INDEX IF NOT EXISTS idx_jobs_rung
  ON public.jobs (rung_from, rung_to) WHERE status = 'active';

-- Seasonal resurfacing: what opens next.
CREATE INDEX IF NOT EXISTS idx_jobs_window
  ON public.jobs (window_opens, deadline) WHERE status = 'active';

-- Which rows are actually due for a recheck, honouring the per-kind cadence.
CREATE INDEX IF NOT EXISTS idx_jobs_recheck_due
  ON public.jobs (last_checked_at NULLS FIRST) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_jobs_org ON public.jobs (org_id);
CREATE INDEX IF NOT EXISTS idx_org_verified ON public.organizations (verified_at) WHERE verified_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Sanity check — run this after the migration
-- ─────────────────────────────────────────────────────────────────────────────

-- SELECT kind, count(*), count(*) FILTER (WHERE is_paid) AS paid,
--        min(verify_interval_days) AS recheck_days
--   FROM public.jobs WHERE status = 'active' GROUP BY kind ORDER BY 2 DESC;
