-- EMPLOYTEENS — Add job verification metadata fields
-- Run this in Supabase Dashboard → SQL Editor

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS verified_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_checked_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS http_status        INTEGER,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS verification_status TEXT    DEFAULT 'unverified';

-- Mark all existing curated/seed jobs as unverified so the cleanup cron
-- will recheck them on first run
UPDATE jobs
  SET verification_status = 'unverified', is_active = false
  WHERE source = 'curated';

-- Index for fast active-job queries
CREATE INDEX IF NOT EXISTS idx_jobs_active
  ON jobs (status, is_active, verification_status);

CREATE INDEX IF NOT EXISTS idx_jobs_last_checked
  ON jobs (last_checked_at ASC NULLS FIRST)
  WHERE status = 'active';
