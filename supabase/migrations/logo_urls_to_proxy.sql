-- EMPLOYTEENS — point stored logo_url at our own proxy
--
-- The 31 Explore rows hold https://unavatar.io/<domain>?fallback=false. unavatar
-- rate-limits per CLIENT IP at ~30 requests/hour and this page renders 31 cards,
-- so one page load exhausted a visitor's quota and the tail of the list came
-- back HTTP 429 -> initials tile. Deterministic, and worse with every row added.
--
-- /api/logo fetches server-side once and the CDN caches it for a year, so the
-- quota is never reached. See app/api/logo/route.ts.
--
-- Rewrites in place rather than restating 31 domains, because the domain is
-- already in the stored URL and re-typing it is a chance to get one wrong.

UPDATE public.jobs
   SET logo_url = '/api/logo?d=' || substring(logo_url from 'unavatar\.io/([^?]+)')
 WHERE logo_url LIKE 'https://unavatar.io/%'
   AND substring(logo_url from 'unavatar\.io/([^?]+)') IS NOT NULL;

-- Expect: proxied 31, still_unavatar 0, google 0.
SELECT count(*) FILTER (WHERE logo_url LIKE '/api/logo%')            AS proxied,
       count(*) FILTER (WHERE logo_url LIKE '%unavatar.io%')         AS still_unavatar,
       count(*) FILTER (WHERE logo_url LIKE '%google.com/s2%')       AS google,
       count(*) FILTER (WHERE logo_url IS NULL)                      AS null_logo
  FROM public.jobs
 WHERE source = 'opportunity';
