-- EMPLOYTEENS — the season line shown on a closed listing
-- Run in Supabase Dashboard → SQL Editor.
--
-- When an opportunity is out of season the card needs to say something more
-- useful than "closed". This carries the plain-English cycle from the seed
-- ("Opens around May, entries close late October") so a teen in August knows
-- the Congressional App Challenge is live and hospital volunteer intake opens
-- in February.
--
-- Deliberately prose rather than a date. See the header of
-- lib/jobs/opportunity-sources.ts: the organiser's own site was advertising
-- 2025 dates in August 2026, so a stored date would be confidently wrong. A
-- pattern stays true.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS window_note TEXT;
