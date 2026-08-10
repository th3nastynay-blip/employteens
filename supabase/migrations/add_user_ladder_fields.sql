-- EMPLOYTEENS — user fields the ladder needs
-- Run in Supabase Dashboard → SQL Editor.
--
-- Two facts the rung detector reads that we have never stored:
--
--   1. Working papers. NJ requires an employment certificate for EVERY job a
--      minor works, not once per teen. Whether they have one is the difference
--      between rung 0 and rung 1, and it is the single most common reason a
--      14 or 15 year old cannot act on anything we show them.
--
--   2. A reference. A named adult who agreed to vouch for them. Entered by the
--      teen and NOT verified by us — no employer account, no confirmation step,
--      nothing for anyone else to do. The value is that they actually asked,
--      which teens almost never think to do while they are still there and
--      which is much harder six months later. We store it so it can be pasted
--      into an application.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_working_papers   BOOLEAN,
  ADD COLUMN IF NOT EXISTS working_papers_at    DATE,
  ADD COLUMN IF NOT EXISTS reference_name       TEXT,
  ADD COLUMN IF NOT EXISTS reference_role       TEXT,
  ADD COLUMN IF NOT EXISTS reference_org        TEXT,
  ADD COLUMN IF NOT EXISTS reference_added_at   TIMESTAMPTZ,
  -- Cached result of detectRung(), refreshed on write. The detector is the
  -- source of truth; this exists so admin queries and cohort reporting do not
  -- have to replay every application.
  ADD COLUMN IF NOT EXISTS current_rung         SMALLINT;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_current_rung_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_current_rung_check
  CHECK (current_rung IS NULL OR current_rung BETWEEN 0 AND 7);

-- has_working_papers stays NULL on existing rows on purpose. NULL means "never
-- asked", which is a different thing from "does not have them" and the detector
-- treats it as a soft rung 0 rather than a confirmed one.

CREATE INDEX IF NOT EXISTS idx_users_rung ON public.users (current_rung);

-- Cohort view: where the user base actually sits on the ladder. This is the
-- number that should move, not the listing count.
DROP VIEW IF EXISTS public.rung_distribution;
CREATE VIEW public.rung_distribution
WITH (security_invoker = on) AS
SELECT
  current_rung,
  count(*)                                        AS users,
  count(*) FILTER (WHERE has_working_papers)      AS with_papers,
  count(*) FILTER (WHERE reference_name IS NOT NULL) AS with_reference
FROM public.users
GROUP BY current_rung
ORDER BY current_rung;
