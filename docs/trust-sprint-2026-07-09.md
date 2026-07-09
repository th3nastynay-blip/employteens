# Trust Sprint — July 8–9, 2026

Every number below is from production (`/api/admin/stats` + audit run responses, 2026-07-09 02:54 UTC).

## The cut

| Metric | Before | After |
|---|---|---|
| Jobs visible to users | 399 | **101** |
| Distinct employers | 143 | **18** |
| Avg quality score (surviving jobs) | — | **~82 / 100** |
| Jobs a 14-year-old can get | 2 | 2 |
| Jobs a 15-year-old can get (min_age ≤ 15) | 3 | 3 |

**Hidden, by reason (flagged — reversible, not deleted):**

| Reason | Count |
|---|---|
| Final destination is an aggregator (Indeed/ZipRecruiter/etc.) | **177** |
| Adult role on a teen board (VP, Director, Manager, Engineer, Security…) | **~109** |
| Out of market (Sunnyvale CA, Greenwich CT…) | ~13 |
| Expired / dead / no apply flow | 0 new tonight (45 purged previously) |

~150 titles rewritten to product quality. 47 geo false positives ("Belleville, Essex County" is NJ) were caught, restored, and re-audited properly.

## Before → after samples (real rows)

| Before | After |
|---|---|
| "Theatre Crew — Ages 14–17 Considered (School Work Permit)" | **Theatre Crew** + tags: Ages 14+, Work permit needed, Part-time |
| "(Seasonal Sales Associate, Part-Time) Editor, Soho" | **Sales Associate** + tags: Seasonal, Part-time |
| "Operations Associate, Brooklyn, #892" | **Operations Associate** |
| "CREW MEMBER $16/hr - NOW HIRING!!! #3382" (pattern) | **Crew Member** + tag: Hiring now |
| "Vice President, Product" @ Glossier | **flagged — not a teen job** |
| "Sr Product Software Engineer (ROKU)" @ Disney | **flagged — not a teen job** |
| "Support Lead" @ Five Below → indeed.com | **flagged — aggregator destination** |
| "Retail Sales Associate" @ Autozone, "Belleville, Essex County" | kept after geo fix (NJ county-form location) |

## What the audit exposed (worse than expected)

1. **The old board was ~75% junk by the new standard.** 177 of 399 "verified" jobs sent teens to an aggregator page with another Apply hop. Another ~109 were roles no teenager can hold — Lockheed Systems Engineers, Disney Sr Software Engineers, nursing home Admissions Directors — ingested because Adzuna keyword queries and Lever company feeds had zero role filtering.
2. **Geo was broken by substring matching**: `'ny'` matched "Su**nny**vale", `'manhattan'` matched "Manhattan Beach, CA". California jobs were shipping to NJ teens. Fixed with word-boundary + county-aware matching (`lib/jobs/geo.ts`).
3. Every gate now runs at ingest too, so tomorrow's 6 AM cron runs re-fill the board under the strict rules: aggregator-destination rejection, teen-appropriateness, geo, title cleaning, quality minimum (55) — junk can't come back.

## How Apply works now

Verified job → `apply_url` is the post-redirect final destination (employer site or their ATS) → teen taps Apply → employer application page, one hop, apply flow present (checked). Aggregator finals are rejected at vet time, non-redirecting aggregator links rejected without a network call. City programs are the one deliberate exception: visibly badged "🏛️ City program" with a "Learn & apply" CTA — program pages, honestly labeled, kept because they're the only 14–15 supply (your call, and the right one).

## Honest ledger

- **101 jobs / 18 employers is small.** You said 180 incredible beats 1,800 questionable; you got 101 verifiable. Tomorrow's crons will grow it back under strict rules — watch `rejected_aggregator` vs `inserted` in the cron responses.
- **18 employers is hand-reviewable.** Worth 30 minutes: check each employer's real minimum age (Gopuff, for instance, may be 18+ in practice — if so it should carry min_age 18, not the default 16).
- Hudson County named-city visible jobs dropped to 6 (JC 4, Union City 2) because most were Adzuna→aggregator. The Hudson-targeted queries run tomorrow 6 AM; direct-destination ones will survive.
- One min_age 18 listing remains visible — legitimate, since 18–19 is inside the 14–19 audience and under-18s are hard-blocked by the match engine.
- Flagged ≠ deleted: everything sits at `status='flagged'` with an `_orig:` title tag for review. `/api/admin/audit-jobs?mode=reconsider` restores rows that pass the cheap gates after a rule fix.
