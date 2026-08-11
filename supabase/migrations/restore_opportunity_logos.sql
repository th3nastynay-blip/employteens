-- EMPLOYTEENS — restore Explore logos
-- Run in Supabase Dashboard → SQL Editor.
--
-- WHY THESE WENT MISSING
-- clear_google_logo_urls.sql matched on '%google.com/s2/favicons%', and the 31
-- curated opportunities had been written with that same service. So clearing
-- the poison from the job rows cleared it from the opportunities too, and their
-- logos came from nowhere else. I flagged that as a consequence instead of
-- scoping the DELETE to kind='job', which is what I should have done.
--
-- Rebuilt from the hand-checked `homepage` domain on each seed entry in
-- lib/jobs/opportunity-sources.ts — the same values that made the EC logos work
-- originally — but pointed at unavatar rather than Google. unavatar 404s
-- honestly when it has no icon, so a miss shows the designed tile instead of a
-- fabricated letter.

UPDATE public.jobs AS j
   SET logo_url = v.logo
  FROM (VALUES
  ('Boston Global Investment Competition', 'https://unavatar.io/globalyouthinvestments.com?fallback=false'),
  ('Virtual Business Challenge (FCCLA)', 'https://unavatar.io/knowledgematters.com?fallback=false'),
  ('Virtual Business Challenge (BPA)', 'https://unavatar.io/knowledgematters.com?fallback=false'),
  ('Blue Ocean Student Entrepreneur Competition', 'https://unavatar.io/blueoceancompetition.org?fallback=false'),
  ('Rutgers Summer Experience', 'https://unavatar.io/camden.rutgers.edu?fallback=false'),
  ('EconEd student membership', 'https://unavatar.io/econ-ed.org?fallback=false'),
  ('Congressional App Challenge', 'https://unavatar.io/congressionalappchallenge.us?fallback=false'),
  ('FAA Airport Design Challenge', 'https://unavatar.io/faa.gov?fallback=false'),
  ('Coding and Creating With Arduino', 'https://unavatar.io/cty.jhu.edu?fallback=false'),
  ('CEMC math and computing contests', 'https://unavatar.io/uwaterloo.ca?fallback=false'),
  ('Razorback AgCademy: Agricultural Systems', 'https://unavatar.io/uark.edu?fallback=false'),
  ('CoCoRaHS rain, hail and snow network', 'https://unavatar.io/nasa.gov?fallback=false'),
  ('Fresh Eyes on Ice', 'https://unavatar.io/nasa.gov?fallback=false'),
  ('Chesapeake Water Watch', 'https://unavatar.io/nasa.gov?fallback=false'),
  ('Great Sunflower Project', 'https://unavatar.io/greatsunflower.org?fallback=false'),
  ('Teen volunteer programs', 'https://unavatar.io/nbpl.org?fallback=false'),
  ('River cleanups', 'https://unavatar.io/hackensackriverkeeper.org?fallback=false'),
  ('High School Educational Monitoring Program', 'https://unavatar.io/meadowlandsrri.com?fallback=false'),
  ('Community group volunteering', 'https://unavatar.io/greaternewark.org?fallback=false'),
  ('Academic Year Teen Internship', 'https://unavatar.io/dorotusa.org?fallback=false'),
  ('53rd Street Outpatient Volunteers', 'https://unavatar.io/mskcc.org?fallback=false'),
  ('Volunteer with Brooklyn Book Bodega', 'https://unavatar.io/brooklynbookbodega.org?fallback=false'),
  ('Teen volunteering', 'https://unavatar.io/bklynlibrary.org?fallback=false'),
  ('Prep Center programs', 'https://unavatar.io/brooklyn.edu?fallback=false'),
  ('Theatre classes and youth programs', 'https://unavatar.io/brooklynchildrenstheatre.org?fallback=false'),
  ('Columbia Model UN Conference (CMUNCE)', 'https://unavatar.io/columbia.edu?fallback=false'),
  ('C-SPAN StudentCam', 'https://unavatar.io/c-span.org?fallback=false'),
  ('K12 Photography Competition', 'https://unavatar.io/k12.com?fallback=false'),
  ('Decoding the Document', 'https://unavatar.io/constitutioncenter.org?fallback=false'),
  ('International Youth Film Festival submission', 'https://unavatar.io/internationalyouthfilmfestival.org?fallback=false'),
  ('Volunteer tutor', 'https://unavatar.io/connectmego.org?fallback=false')
  ) AS v(title, logo)
 WHERE j.source = 'opportunity'
   AND j.title = v.title;

-- Expect 31 with a logo, 0 without.
SELECT count(*) FILTER (WHERE logo_url IS NOT NULL) AS with_logo,
       count(*) FILTER (WHERE logo_url IS NULL)     AS without_logo,
       count(*)                                     AS total
  FROM public.jobs
 WHERE source = 'opportunity';
