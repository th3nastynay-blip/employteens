-- EMPLOYTEENS — Add call/text/email-to-apply fields
-- Run this in Supabase Dashboard → SQL Editor
--
-- WHY: genuinely independent small businesses (the ones most likely to give a
-- teen a fast callback) usually have no online application system at all —
-- they hire off a phone call, a text, or an email. verify-url.ts has nothing
-- to fetch for any of those, so these rows can never be auto-verified the way
-- every other job on the platform is. Legitimacy instead rests on a REAL
-- HUMAN confirming the listing before it ever reaches this table (see
-- lib/jobs/smb-phone-sources.ts) — human_verified_at/by is that trail, and
-- human_reverify_by is a mandatory re-check date enforced by
-- lib/jobs/smb-phone-ingest.ts on every run, since there's no HTTP liveness
-- signal to fall back on for any of these three apply methods.
--
-- 'call' and 'text' both use contact_phone (different URI scheme — tel: vs
-- sms: — built at ingest time, see smb-phone-ingest.ts); 'email' uses
-- contact_email. Which channel the verifying human used to confirm the
-- listing is independent of which channel the TEEN is directed to use.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS apply_method       TEXT NOT NULL DEFAULT 'url' CHECK (apply_method IN ('url', 'call', 'text', 'email')),
  ADD COLUMN IF NOT EXISTS contact_phone      TEXT,
  ADD COLUMN IF NOT EXISTS contact_email      TEXT,
  ADD COLUMN IF NOT EXISTS contact_note       TEXT,
  ADD COLUMN IF NOT EXISTS human_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_verified_by  TEXT,
  ADD COLUMN IF NOT EXISTS human_reverify_by  TIMESTAMPTZ;

-- Fast lookup for the daily staleness sweep (smb-phone-ingest.ts / clean-jobs)
CREATE INDEX IF NOT EXISTS idx_jobs_human_reverify
  ON jobs (human_reverify_by ASC NULLS LAST)
  WHERE apply_method != 'url' AND status = 'active';
