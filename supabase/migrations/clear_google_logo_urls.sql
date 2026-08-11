-- EMPLOYTEENS — remove the Google favicon URLs from logo_url
-- Run in Supabase Dashboard → SQL Editor.
--
-- THE BUG THIS ENDS
-- add_logo_url.sql backfilled every job row with
--
--     https://www.google.com/s2/favicons?domain=<company>
--
-- OrgLogo resolves `src ? [src] : brand ...`, so a populated logo_url meant the
-- brand table and every local file in /public/logos were never consulted.
-- Google returned its FABRICATED letter tile for Insomnia Cookies (the green
-- "L") and nothing at all for Target (the red "TA" tile).
--
-- Both symptoms, one cause, and it was in the database the entire time. Seven
-- rounds of changes downstream of it could not have worked.
--
-- Google's favicon service is banned from this codebase: it answers 200 with
-- an invented image rather than 404ing, so a miss cannot be told from a hit.

UPDATE public.jobs
   SET logo_url = NULL
 WHERE logo_url LIKE '%google.com/s2/favicons%';

-- Opportunities are cleared too. Those 31 rows were written by
-- opportunity-ingest with the same service; the brand table and local files
-- are strictly better, and anything still missing falls to unavatar.

-- Expect 0.
SELECT count(*) AS remaining_google_urls
  FROM public.jobs
 WHERE logo_url LIKE '%google.com/s2/favicons%';
