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

-- SCOPED TO kind='job'. The first version of this file was not, and it wiped
-- the 31 curated opportunities' logos as collateral — those rows were written
-- with the same service but they have nothing else to fall back to, because EC
-- organisations are not in the employer brand table and never should be.
-- restore_opportunity_logos.sql repairs them from the seed's homepage domains.
UPDATE public.jobs
   SET logo_url = NULL
 WHERE kind = 'job'
   AND logo_url LIKE '%google.com/s2/favicons%';

-- Expect 0.
SELECT count(*) AS remaining_google_urls
  FROM public.jobs
 WHERE kind = 'job' AND logo_url LIKE '%google.com/s2/favicons%';
