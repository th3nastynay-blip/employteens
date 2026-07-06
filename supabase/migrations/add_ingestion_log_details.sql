-- EMPLOYTEENS — Add durable per-run detail breakdown to ingestion_logs
-- Run this in Supabase Dashboard → SQL Editor (after add_verification_fields.sql)
--
-- Every ingestion run and every cleanup/purge run now writes a row here with a
-- `details` JSON blob (IngestStats shape from lib/jobs/ingest-pipeline.ts, or an
-- equivalent shape for cleanup/purge runs). This is what /api/admin/stats sums
-- to answer "how many total have we ever imported / verified / rejected /
-- expired / removed" — the four pre-existing columns alone can't capture the
-- more granular breakdown (rejected_generic vs rejected_url vs rejected_mismatch,
-- expired vs manually purged, etc).

ALTER TABLE ingestion_logs
  ADD COLUMN IF NOT EXISTS details JSONB;

CREATE INDEX IF NOT EXISTS idx_ingestion_logs_source_completed
  ON ingestion_logs (source, completed_at DESC);
