-- EMPLOYTEENS — logos on cards
-- Run in Supabase Dashboard → SQL Editor.
--
-- Derived from the apply URL's domain via a favicon service, so there is no
-- file to store, no upload step, and no per-entry work. Every organisation with
-- a website resolves. See logoForUrl() in lib/jobs/opportunity-ingest.ts.
--
-- Nullable on purpose: a missing logo renders as the existing initial-letter
-- tile, which is a better failure than a broken image.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Backfill every existing row from its own apply_url host. Same derivation as
-- the ingest, done in SQL so live listings get logos without a re-ingest.
UPDATE public.jobs
   SET logo_url = 'https://www.google.com/s2/favicons?domain='
                  || split_part(split_part(replace(replace(apply_url, 'https://', ''), 'http://', ''), '/', 1), ':', 1)
                  || '&sz=128'
 WHERE logo_url IS NULL
   AND apply_url IS NOT NULL
   AND apply_url <> '';

-- Sanity check after running:
-- SELECT count(*) FILTER (WHERE logo_url IS NOT NULL) AS with_logo, count(*) AS total
--   FROM public.jobs WHERE status = 'active';
