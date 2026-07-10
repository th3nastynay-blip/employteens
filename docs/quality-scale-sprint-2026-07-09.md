# Quality-at-Scale Sprint — July 9, 2026

Goal: 300+ high-quality direct-application jobs, age lock, distance honesty, Hudson County priority. All numbers live from production (2026-07-10 03:12 UTC).

## Final numbers

| Metric | Yesterday (post-purge) | Now |
|---|---|---|
| Verified jobs visible | 101 | **422** |
| Distinct employers | 18 | **27** |
| Aggregator links among them | 0 | **0** |
| Avg quality score (audit batches) | ~82 | **83–94** |
| Hudson County named-city jobs | 6 | **46** (JC 28, Hoboken 7, UC 4, NB 4, Bayonne 2, Kearny 1) |
| Jobs a 14-year-old can get | 2 | 3 |
| Jobs a 15-year-old can get (min_age ≤ 15) | 3 | 6 |

Every one of the 422: specific position, direct employer application URL (their site or their ATS), teen-appropriate title, in-market location, clean product title, quality ≥ 55.

## The two bugs you reported — found and fixed

**"I'm getting 16+ jobs as 14."** Three stacked causes: (1) cache writers skipped the age filter entirely when age was null — a pre-onboarding cache filled with 16+ jobs and survived the user setting age 14; (2) generate-feed upserted without deleting, so stale rows lived forever — including your expired-link sightings; (3) the dashboard trusted the cache blindly. Now: null age = assume 14 (most restrictive), delete-then-insert cache writes, and the dashboard re-validates every cached job against current status and current age on every load. A 14-year-old cannot see a 16+ job through any path.

**"Location matches should actually be close."** Jobs without ZIPs defaulted to '00000' and the engine guessed "same state ≈ 6 miles" — Syracuse floated into Jersey City feeds. Now: city-name → ZIP backfill at ingest (30 NY/NJ metro cities), centroids for every derivable ZIP, and unknown distance scores conservatively (35, not 80). Jobs beyond 2.5× your transport range sink to 5.

## Where the volume came from (and didn't)

**New: Workday direct ingestion.** Major chains expose a public JSON API on their own Workday tenants — specific requisitions, native apply flows. Live tenants: **Wegmans (hires at 15)**, Five Below, **CVS (Jersey City/Hoboken/Bayonne/Union City stores)**, **Target (Jersey City)**, **Michaels (Secaucus)**. +94 jobs, all direct. Runs daily inside clean-jobs.

**Lever/Greenhouse/SmartRecruiters expanded**: Insomnia Cookies confirmed live (+8 fail-safe candidate boards). +128 direct jobs, with the adult-role gate rejecting 122 manager/director listings at the door.

**Adzuna is structurally dead under your rules — and that's the right outcome.** Their API now terminates every link on a JavaScript lander page with another Apply hop; there is no server-resolvable direct employer URL (that hop is their business model). 887 fetched → 546 aggregator rejections + 273 adult roles → 0 inserted. Same for JSearch: 25/50 pointed at Indeed/LinkedIn/ZipRecruiter, 2 direct survivors. Aggregator APIs cannot produce jobs that meet the "one tap → employer apply page" standard.

**Removed**: the unpaid JCFPL volunteer listing (no-pay volunteer, unverifiable apply — out per your direction), with orphan cleanup so removed directory entries auto-deactivate their rows.

## Honest ledger

- **14/15 supply is still the hard problem**: 3 jobs at 14, 6 at 15. Wegmans at 15 helps but their NJ stores are 15–20 miles from Hudson County. The next real lever is more 15-hiring Workday tenants (Six Flags runs its own portal, unfortunately) and direct employer outreach.
- Adzuna's 263 legacy table rows are inactive/flagged; the source will yield ~0 going forward. Its 6:15 AM cron slot could be repurposed for a second Workday run later.
- One CVS "Beauty Sales Consultant" was rejected by the `consultant` pattern — the adult-role regex trades a few false positives for zero Lockheed engineers. Acceptable.
- Feed caches rebuild at the next generate-feed run (10 AM UTC); until then the dashboard's own re-validation covers correctness.
- Rotation debt unchanged: CRON_SECRET + the `?secret=` params come out together when you rotate.
