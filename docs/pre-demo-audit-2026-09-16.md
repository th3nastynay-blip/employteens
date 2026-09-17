# EmployTeens — pre-demo audit, 16 September 2026

Audited against the live deployment at `employteensfinal.vercel.app` and the repo at commit `ce423cd`. Read-only on the database, as agreed. Every claim below is something I saw, not something I inferred.

## The short version

The engineering is in better shape than the prompt that commissioned this audit assumed. Authentication is correct, secrets are not leaking, every privileged endpoint is guarded, the build is clean, and the link verifier is unusually careful. I could not find a security hole.

The problem is not the code. It is that the product currently has almost no job supply reaching users, and the parts of the interface that describe the supply were overstating it. Two of the three fixes below exist to stop the app asserting things that are not true.

## What would have gone wrong in the room

**1. The homepage number and the app disagreed by 10x.** The landing page read "273 openings live right now". A signed-in teen's feed held 28 items. Anyone in that meeting could have found the gap in ninety seconds by making an account, and the whole pitch rests on trust.

The cause: `/api/public-stats` counted rows where `status='active'`, but the feed additionally requires `verification_status='verified'`. About 245 employer postings sit in the table having failed URL verification — correctly hidden from teens, and wrongly counted on the marketing page. Fixed: the public number now uses the same predicate the feed uses.

Expect the headline to drop from 273 to roughly 28. That is the number the product can defend.

**2. The feed contains no paid jobs at all.** On `/jobs`, the chip counts read: Open now 28, Paid **0**, Near me **0**, Virtual 16. Every one of the 28 items is a competition, programme or volunteering listing. For a platform whose landing page says "Part-time jobs in Hudson County and NYC", clicking "Paid" and getting zero is the worst single moment available in the demo.

This is a data-pipeline state, not a bug, and I could not fix it without writing to the database. See "What I could not fix" below.

**3. Six listings were claiming to be in Jersey City when they are not.** `toJobRow` in `lib/jobs/opportunity-ingest.ts` derived a town from an eligibility region:

```ts
location: isVirtual ? 'Virtual' : local === 'US-NY' ? 'New York, NY' : 'Jersey City, NJ'
```

An eligibility region is who may *enter*. It is not where the thing *happens*. So every in-person listing not tagged `US-NY` was written down as Jersey City, at ZIP 07302. Live, in the top ten of Best Matches:

| Listing | Shown as | Actually in |
|---|---|---|
| CEMC contests — University of Waterloo | Jersey City, NJ | Waterloo, Ontario, **Canada** |
| Rutgers Summer Experience | Jersey City, NJ | Camden, NJ (~90 min each way) |
| Community group volunteering — Greater Newark Conservancy | Jersey City, NJ | Newark, NJ |
| Teen volunteer programs — North Bergen Free Public Library | Jersey City, NJ | North Bergen, NJ |
| High School Educational Monitoring | Jersey City, NJ | Lyndhurst, NJ |
| River cleanups — Hackensack Riverkeeper | Jersey City, NJ | Hackensack, NJ |

Several cards contradicted themselves on screen. The Rutgers card carried the tags "South Jersey" and "Long trip" directly above a line reading "Jersey City, NJ", and its own description said Camden is ninety minutes from Hudson County. The Hackensack card said "on the Hackensack River" and "Jersey City, NJ" in adjacent lines.

In a Jersey City municipal office, "Greater Newark Conservancy — Jersey City, NJ" is the line someone notices.

**4. A React hydration error on every dashboard load.** Minified error #418, server/client text mismatch. Cause: the greeting read `new Date().getHours()` during render on a statically prerendered page, so the build baked in whatever "Good ___" was true at build time. Not cosmetic — a hydration mismatch makes React discard and re-render the subtree, and that is why the headline "Finding your matches…" stayed on screen underneath a fully loaded feed showing 25 results. The page said it was still searching while displaying the answers.

**5. Opportunity cards invented a legal age.** Volunteering and competition cards read "13+ by law · employer unconfirmed" — directly above their own tags reading "Open at 12" and "No age limit". There is no statutory minimum age for volunteering. The number came from `min_age = Math.max(13, min_grade + 5)`, which the ingest's own comment describes as plumbing so age filters do not hide entries. Rendering plumbing as law, and contradicting the card's own tags, made the invented half sound like the authoritative half.

## What I changed

All changes are in the working tree, unstaged. Nothing is deployed and nothing touched the database.

| File | Change |
|---|---|
| `lib/jobs/opportunity-sources.ts` | Added `city` / `zip` to `OpportunitySource` with a "location is read, never derived" rule; filled in the real town for all 13 in-person entries |
| `lib/jobs/opportunity-ingest.ts` | `toJobRow` reads `city`/`zip` off the entry; an in-person entry with no city now says "Location not stated" rather than picking one |
| `lib/jobs/opportunity-location.ts` | **New.** Display-time correction keyed on `apply_url`, so rows already written to the database render truthfully without a migration. Never touches employer job rows |
| `components/jobs/JobCard.tsx` | Uses `displayLocation`; opportunity rows show "Grades N–M" instead of a fabricated "N+ by law" |
| `components/jobs/JobSheet.tsx`, `components/feed/OpportunityCard.tsx`, `components/feed/OpportunitySheet.tsx` | Use `displayLocation` |
| `app/(app)/dashboard/page.tsx` | Greeting computed after mount — kills hydration error #418 and the stuck loading headline |
| `app/api/public-stats/route.ts` | Public counts use the same predicate as the feed |
| `scripts/test-opportunity-location.ts` | **New.** 60 assertions locking the location bug down |
| `scripts/test-opportunity-ingest.ts` | Fixed two assertions that were encoding bugs as expected behaviour (see below) |

### The test that was guarding the bug

`test-opportunity-ingest.ts` contained:

```ts
check('NJ in-person entries land in Jersey City', String(lrow.location).includes('Jersey City'), ...)
```

It passed, because the code hardcoded Jersey City. The test was not verifying a location, it was verifying that the app always claimed the same one. That is how six mislabelled listings shipped with a green suite. A second assertion called `logoForUrl(o.apply_url)` without the `homepage` argument and so failed on exactly the two entries the `homepage` field exists to rescue.

## What I could not fix, and why

**No paid jobs in the feed.** Roughly 245 employer postings are in the table but not `verification_status='verified'`, so none reach users. Fixing this means either re-running ingest and the verifier against production, or relaxing the verifier — and the verifier is the best thing in this codebase, so relaxing it would be the wrong trade. Both are database writes, which were out of scope for this pass. This is the number one thing to resolve before any public launch, and the honest framing for tomorrow is that supply is the open problem and the verifier is why the number is small.

**Stale locations in the database.** The display-time fix means cards read correctly, but the rows still hold "Jersey City, NJ" and ZIP 07302. Anything computing distance server-side — the "Near You" tab, `commute_estimate` — still measures from the wrong origin. A re-ingest clears it.

**Supabase Auth redirect allowlist.** The code is correct: signup, password reset and OAuth all build `emailRedirectTo` from `window.location.origin`, and `/auth/callback` uses the request origin, so nothing is pinned to localhost. But Supabase independently enforces a Site URL and a redirect allowlist in its dashboard, which I cannot read. **Verify before launch** that `https://employteensfinal.vercel.app/auth/callback` is on that allowlist, or verification emails will bounce users to the wrong host.

**End-to-end email delivery.** Not tested. I did not create accounts or send mail. Triggering, provider acceptance and actual inbox delivery are three different things and I verified none of them. The production test is: sign up with a fresh address, confirm the mail arrives, confirm the link lands on the Vercel domain, confirm the session sticks.

## Security: nothing found

Genuinely clean.

- No `SUPABASE_SERVICE_ROLE_KEY` reachable from client code. `createAdminClient` is imported only by server routes; no `'use client'` file touches it.
- All 17 admin / cron / ingest endpoints check `CRON_SECRET`.
- `/api/match-user` rejects a mismatched `user_id` with 401 rather than trusting the body.
- `/api/account/delete` requires a session and deletes only the caller's own account.
- `/api/career-ai` requires a session and meters usage.
- RLS is on for every table. `ingestion_logs` has RLS enabled with no policy, which denies by default.
- `.env.local` is gitignored; no secrets in tracked files.

One low-severity note: `/admin` is a client page with no authorisation check of its own. Middleware keeps out anonymous visitors, but any signed-in teen can open it. RLS means they see almost nothing — their own row, active job counts, an empty ingestion log — so the exposure is close to zero, but it should get a real gate before launch.

## Smaller things, not fixed

- **Test data in the demo account.** The profile shows a verified reference reading "John vouched for you — They confirmed as JEan Grey". If tomorrow's demo runs on this account, an X-Men character appears as the verified reference, with the typo. Use a clean account or fix the record.
- **The ladder reports two different totals.** Profile says "WHERE YOU ARE 7 of 7"; the dashboard says "Step 8 of 8: Trusted". Same ladder, two answers.
- **Profile step indicator overflows.** "COMPLETE YOUR PROFILE 8 of 9" shows five dots, and the fifth label ("Transportation") is clipped mid-word. The chip row above it truncates too.
- **`test-rungs.ts` has three pre-existing failures.** Two are a stale enum name (`soft` → `self_reported`). The third — "one hire 90 days ago → 7, got 6" — is a real disagreement between the test and `lib/rungs.ts` and someone should decide which is right. Untouched by this audit; I did not go near `lib/rungs.ts`.
- **`next.config.ts` sets `typescript.ignoreBuildErrors: true`.** Currently harmless — `tsc --noEmit` is clean — but it means a future type error ships silently. Worth removing while it costs nothing.
- **Fonts are fetched from Google at build time.** A Google Fonts outage during a Vercel build fails the deploy. Low probability, trivial to de-risk by self-hosting.
- **`vercel.json` declares four cron jobs.** Vercel's Hobby plan allows two. If this project is on Hobby, two of them are not running.
- **British spelling** ("favourite", "programme") throughout a US-market product.

## Test results

```
npx tsc --noEmit                    clean, exit 0
npx next build                      46/46 routes generated, compiled successfully
npx eslint .                        1 real error (Deno edge function parse), 16 warnings

scripts/test-calendar.ts             pass
scripts/test-child-labor.ts          pass
scripts/test-feed-filters.ts         pass
scripts/test-geo.ts                  pass
scripts/test-min-age.ts              pass
scripts/test-opportunity-ingest.ts   pass  (2 assertions corrected)
scripts/test-opportunity-location.ts pass  (new, 60 assertions)
scripts/test-opportunity-sources.ts  pass
scripts/test-outcomes.ts             pass
scripts/test-rungs.ts                FAIL  (3, pre-existing, untouched)
```

The build was run against a copy with `next/font/google` stubbed, because the audit sandbox has no outbound network. Everything else about the build is real.

## Application links

Every curated opportunity link I opened resolved to the correct, live, on-topic application page — no 404s, no redirects to homepages, no expired postings:

CEMC · Rutgers RUSE · Greater Newark Conservancy · North Bergen Library · Hackensack Riverkeeper · Meadowlands RRI · DOROT · CMUNCE · Brooklyn Book Bodega · FAA Airport Design Challenge · International Youth Film Festival

The 245 unverified employer postings were not individually checked, since none of them reach users.

## Launch-blocker checklist

| Item | Status |
|---|---|
| No secrets exposed to the browser | Verified |
| Every privileged endpoint authenticated | Verified |
| RLS on every table | Verified |
| Production build passes | Verified |
| Curated application links live and correct | Verified |
| Location fabrication | Fixed, regression-tested |
| Homepage count matches what users see | Fixed |
| Hydration error / stuck loading headline | Fixed |
| Invented legal age on opportunity cards | Fixed |
| **Paid jobs reaching the feed** | **Blocked — needs a DB write** |
| Stale locations in existing rows | Blocked — needs a re-ingest |
| Supabase redirect allowlist includes prod | Not verified — needs dashboard access |
| End-to-end email delivery | Not tested |
| `/admin` authorisation | Not fixed |
| `test-rungs` failures | Not fixed — needs a product decision |

---

*Nothing in this audit was deployed. The live site still has every bug described above until these changes ship.*
