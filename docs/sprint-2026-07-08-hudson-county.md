# Hudson County Launch Sprint — July 8, 2026

Validation report. All numbers pulled live from production (`/api/admin/stats`, 2026-07-08 22:53 UTC) after this sprint's deploys.

## Live numbers

| Metric | Value |
|---|---|
| Verified jobs visible to users | **399** |
| Distinct employers | **143** |
| Total rows ever imported | 598 |
| Rejected during ingestion (bad/generic/dead/scam URLs) | 799 |
| Verification pass rate at ingest | 1,218 / 2,053 fetched (59%) |
| Duplicates deactivated by cleanup | 230 |
| Dead rows purged | 45 |

**Jobs by minimum age (visible):** 14 → **2** (was 0 this morning) · 15 → **2** (was 1) · 16 → 394 · 18+ → 1

**Hudson County, by named city:** Jersey City 11 · Union City 4 · Hoboken 3 · Secaucus 2 · West New York 2 · Kearny 1. The 10 new Hudson-targeted Adzuna queries and rebalanced JSearch queries deploy tonight and first run at the 6am crons — expect these counts to climb starting tomorrow.

**By source:** lever 281 · adzuna 263 · greenhouse 29 · jsearch 15 · smartrecruiters 6 · **local 4** (new).

## What shipped

**Curated local sources (the 14/15 fix).** API aggregators structurally can't surface younger-teen jobs — even Hudson County's own programs floor at 15 (JC Next 15–24, Secaucus 15, WNY SYEP 15). New `lib/jobs/local-sources.ts`: researched directory of municipal youth programs, library volunteer-to-paid paths, and AMC (14–17), with seasonal windows, funneled through the same verify/dedupe pipeline in a new `programPage` mode (liveness + closed-language checks; bot-blocks and timeouts are treated as inconclusive for hand-curated URLs, not fatal). Runs daily inside clean-jobs (all 4 Vercel cron slots taken). Seasonal entries (Bayonne/Secaucus/WNY rec, application windows Jan–May) auto-activate next spring.

**Ingestion hardening.** Pass-0 dedupe: known-active URLs skip re-verification entirely (was O(db-size) network work per run); clean-jobs is now the sole re-verification owner (~840-job capacity at current batch size — scaling note in the file). Rejection reasons and insert errors now surface in every ingest response.

**Match engine v3.** Age is a filter, not a wasted 30% constant weight. Real haversine distances via ZIP centroids for all Hudson County + adjacent NYC/Newark. Employer quality and hiring urgency now move the score. Full `score_breakdown` exposed. Verified: Hoboken 15-year-old → AMC Newport 95 ("About 1.1 miles from you · Hires at age 14 — you qualify"), JC Next 86, 18+ warehouse hard-blocked.

**Application tracking.** Clicking Apply no longer fabricates an "applied" status. Pending click → "Did you apply?" sheet on return (Yes / Not yet / Don't ask again). `/jobs/saved` is now a Saved/Applied/Archived tracker with interview → offer progression. No schema changes needed.

**AI Coach.** Shared context fetcher (profile, matches, applications with timestamps, fresh-job counts) feeds both chat and new proactive insight chips: interview prep, offer handling, 5–14-day follow-up nudges, real new-job counts, weekend-availability gap, honest 14–15 paths. Fixed confidently-wrong labor facts (NJ working papers are online-only since 2023).

**Homepage.** 15 rotating headlines, letter-flip cascade every 4.2s, accent line always brand gradient, reduced-motion fallback. Replaced the fabricated "+ 44 more matches" with a real count from new `/api/public-stats` (live: "399 verified jobs right now").

**Trust badges.** Verified today / Verified this week (from `last_verified_at`), New (≤3 days), Teen favorite (score ≥90) — all computed from real data.

## Bugs found and fixed along the way

1. `vercel.json` declared 5 crons against a 4-cron plan limit (clean-jobs was already on GitHub Actions).
2. **`createAdminClient` was cookie-aware** — any request carrying a session cookie silently replaced the service-role key with the user's JWT, so RLS applied and admin inserts failed. Crons worked; browser-triggered admin actions never could. Now a plain service-role client.
3. `salary_min` is INTEGER; fractional wages ($15.23) failed entire batch inserts.
4. Nightly re-verification would have deactivated every curated job as "generic" the morning after ingestion (fixed via per-job `programPage` flag in `verifyBatch`).

## Open items

- Rotate `CRON_SECRET` (still `employteens123`); remove the `?secret=` query-param auth on admin/stats + ingest/local at the same time — added for browser ops, documented as rotation debt.
- Hudson city counts should jump after tomorrow's 6am cron runs; check `hudson_county_by_city` in stats.
- Research pass 2: verified program URLs still missing for Hoboken, North Bergen, Kearny, Weehawken, Guttenberg, Harrison, East Newark rec departments.
- 14-year-old supply is 2 jobs. That's the honest market ceiling via automation today; growing it means employer outreach (local ice cream shops, groceries), not more scraping.
- When active jobs approach ~800, raise clean-jobs BATCH_SIZE or run the workflow twice daily (edit on GitHub — repo token lacks workflow scope).
