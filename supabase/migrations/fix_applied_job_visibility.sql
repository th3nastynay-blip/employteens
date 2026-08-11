-- EMPLOYTEENS — a teen's own history must not disappear
-- Run in Supabase Dashboard → SQL Editor.
--
-- THE BUG
-- schema.sql has exactly one SELECT policy on jobs:
--
--   USING (status = 'active' AND scam_risk_score < 70)
--
-- Sensible for browsing. Catastrophic for history. The trust audit flags rows
-- (status='flagged') when a listing turns out to be out of market, expired, or
-- not a teen job. The instant it does, RLS stops returning that row to
-- everyone — including the teen who applied to it last week.
--
-- app/(app)/jobs/saved/page.tsx selects `jobs (*)` as an embedded resource and
-- then drops any row where the embed came back null. So the application record
-- itself was never deleted; it simply stopped being visible. Every account
-- looked like it had zero applications.
--
-- That is the worst possible failure for this product. The entire premise is
-- "we track what you applied to so you can prove you did the work". Losing it
-- because WE decided a listing was low quality inverts the promise.
--
-- THE RULE
-- Browsing is filtered. History is not. If a teen applied to it, they can
-- always read it, whatever we later decided about the listing.

DROP POLICY IF EXISTS "Users can read jobs they applied to" ON public.jobs;
CREATE POLICY "Users can read jobs they applied to"
  ON public.jobs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.job_id = public.jobs.id
        AND a.user_id = auth.uid()
    )
  );

-- Postgres ORs multiple permissive SELECT policies together, so this widens
-- access rather than replacing the browse policy. Browsing still sees only
-- active, low-scam-risk rows.

-- The policy runs a subquery per candidate row, so it needs the index to not
-- become a sequential scan on every jobs read.
CREATE INDEX IF NOT EXISTS applications_job_user_idx
  ON public.applications (job_id, user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verify after running
-- ─────────────────────────────────────────────────────────────────────────────
-- Should return one row per application, with title populated even where the
-- job is flagged. A NULL title here means the policy did not take.
--
--   SELECT a.user_id, a.status, j.status AS job_status, j.title
--     FROM public.applications a
--     LEFT JOIN public.jobs j ON j.id = a.job_id
--    ORDER BY a.created_at DESC
--    LIMIT 50;
--
-- And the count that was reading zero:
--
--   SELECT count(*) FROM public.applications;
