# EmployTeens v2: Execution Plan

**Written 2026-08-10.** Source research: three full runs of the EC Database onboarding wizard, their organizations and opportunities pages, the Dr. Interested founder story, and Appybara's product surface.

---

## The one-sentence version

Keep the jobs core and its verification infrastructure, widen the inventory to every kind of thing a teen can *do*, hang all of it on a single track-record ladder, and adopt the one thing EC Database and Appybara actually got right: **a supply side that recruits itself.**

---

## 0. What we are copying, and what we are not

**Copying:**

- Self-submission as the primary intake for organizations. Their entire org pipeline is a Google Form and it produced 243 listings.
- Inventory with a long shelf life. Annual competitions stay valid for a year. Job reqs die in days.
- The founder-story content asset. One interview, turned into a long-form guide, that simultaneously does SEO, credibility, and recruitment of the next org.
- Field-adaptive onboarding: fixed question skeleton, swapped examples per interest.
- Tiered progression language (their Explorer / Strategist / Mythic).
- Structured detail cards that state unknowns out loud.

**Not copying:**

- **Their database.** Their compiled listings are their work, and half their fields are unconfirmed. We go to primary sources, which are public, and verify. Better data and no dependency.
- **College admissions advice.** No essay editing, no school lists, no chance-me. Crowded market, well-funded incumbents, and off-mission.
- **Asking questions we do not use.** Proven by controlled test: EC Database's grade and experience-level questions have zero effect on output. Every question we ship must have a named consumer in ranking code.
- **User-generated public profiles or teen-to-adult messaging.** Keeps the minor-safety and moderation surface at zero. Revisit only after a legal pass.

---

## 1. The unifying data model

This is the make-or-break. If jobs and opportunities end up in two tables with two pipelines, the whole thing collapses into maintaining two thin databases.

**Rule: one `jobs` table, extended. One ingest pipeline. One verification path. One quality score. One min-age resolver.** If a content type needs its own table or its own ingest, it is out of scope.

New columns on `jobs`:

| Column | Purpose |
|---|---|
| `kind` | `job` \| `internship` \| `program` \| `competition` \| `volunteer` \| `org_role` \| `gig` |
| `is_paid` / `pay_note` | Paid is now a field, not a different product |
| `deadline`, `window_opens`, `recurrence` | `annual` \| `rolling` \| `one_time`. Drives seasonal surfacing |
| `cost_cents`, `cost_unknown` | State unknowns explicitly rather than hiding them |
| `org_id` | FK to new `organizations` table |
| `evidence_kind` | What proof this produces: `hours` \| `title` \| `award` \| `reference` \| `income` |
| `rung_from`, `rung_to` | Which ladder rungs this moves a teen between |

`rung_from` / `rung_to` is the important one. It is what lets a single feed serve a 14-year-old with no papers and a 17-year-old with a job history, without branching the UI.

New `organizations` table: name, slug, logo, category, `is_youth_led`, contact, `submitted_by` (`self` \| `curated`), `verified_at`, `verified_by`, `reverify_by`. Verification for an org means a live website, a reachable human contact, and evidence of recent activity. Same discipline as job URL verification.

---

## 2. The ladder is the spine

Eight rungs, one climb. Rungs 0 to 3 are activity-based and open at 14. Rungs 4 to 7 are employment-based and unlock at 16.

0. **Not eligible yet.** No working papers, or under age.
1. **Eligible.** Papers in hand, or an age-appropriate path identified.
2. **Started something.** One shift, program, or gig completed.
3. **Someone will vouch.** Showed up repeatedly. An adult would take a reference call.
4. **Applied.** First real application sent.
5. **Employer replied.** Interview scheduled.
6. **Earning.** Hired.
7. **Trusted.** Reference in hand, title held, or rehired.

Rung 3 is the hinge and the product's actual promise. An adult who will vouch for you is the same asset a job application and a college essay both need. It is also the reason a 14-year-old is never in a consolation mode: they are on the same ladder, earlier.

**Detection, not assertion.** A rung must be earned from evidence we hold: papers status, confirmed applications, outcome reports, program completion confirmed by the org. Self-reported rungs are marked soft and never drive a claim. This is the difference between a real progression and EC Database's fake one.

Every surface reads the rung: feed contents, coach context, dashboard next-action, email cadence.

---

## 3. Supply, in ascending order of cost

### Tier 1 — Recurring national competitions and programs (week 1, ~60 entries)

Cheapest inventory in existence: published, recurring, annually predictable, twelve-month shelf life. One research pass.

Sources to seed from directly: HOSA, DECA, FBLA, BPA, Congressional App Challenge, Blue Ocean Student Entrepreneur Competition, Conrad Challenge, Regeneron ISEF, Scholastic Art & Writing, National History Day, Science Olympiad, MATHCOUNTS/AMC, USACO, Technovation, Diamond Challenge, NFTE, Junior Achievement.

Every entry gets: eligibility grades, cost (or `cost_unknown`), deadline, `recurrence: annual`, and a hard geography check. **The ASX Schools Sharemarket Game is the cautionary tale.** EC Database ranked an Australia-and-New-Zealand-only contest third for a Jersey City student. Our min-age and eligibility gating already exists; extend it to geography and grade.

### Tier 2 — NJ and NYC specific (week 2)

Higher value, still one-pass, and a national site will never have them: NJ Governor's School, county youth programs, pre-college at NJIT / Rutgers / Stevens / NYU, Hudson County library systems, hospital volunteer programs (Jersey City Medical Center, Hoboken UMC, Palisades), museums, parks departments, summer camps that hire and train teens.

Much of this is already in `lib/jobs/local-sources.ts` with `activeMonths` windows. It stops being "the thing we show when we have no jobs" and becomes rungs 1 through 3.

### Tier 3 — Self-submission, the flywheel (ongoing)

The mechanism that produced 243 orgs for EC Database with no sourcing team.

Build a native submission form (not a Google Form) plus an admin review queue. Two audiences:

- **Youth-led organizations.** Hudson County has teen-founded orgs and no local aggregator lists them. They need volunteers and have no reach. We are free distribution to exactly their audience. This inventory recruits itself and a national site cannot replicate it, because it is local.
- **Employers and programs.** The "post a job free" form, now with a reason to exist: there is somewhere to point the businesses we already call.

Submissions are never auto-published. Review queue, verification, then live.

---

## 4. Appybara-style features, mapped to data we actually own

Appybara's loop is: see real people who got in, copy their path, track your application. The direct translation is stronger for us because **we measure outcomes and nobody else in this space does.**

| Appybara | EmployTeens equivalent | Why ours is better |
|---|---|---|
| Admit profiles | **Hired paths** | Anonymized from our own outcome loop: "16, Bayonne, no experience, applied to 4 places, hired in 9 days." Real, ours, and unfakeable |
| Application tracker | Already shipped | Extend with rung and outcome. Already the best-instrumented piece we have |
| AI chance-me | **Readiness check** | Not "will you get in" but "here is what this employer expects and what you are missing." Grounded in real response data |
| Mentor program | **Teens who got hired** | Answer questions, get status. Supply side paid in credibility, same trick |
| Essay examples | **Scripts and templates** | What to say when you walk in, what to text a manager, first resume with no experience |
| Discord + Reddit | Community | Their real distribution channel. Ours would be the first place Hudson County teens compare notes |

**On money: do not charge the teens.** They are on this app because they need income. Charging them inverts the mission. Real options are employer or program listing upgrades, school district and municipal contracts, workforce development grant funding (WIOA youth funds exist and this is exactly the use case), or a parent-side tier. This is a decision to make deliberately, not a default.

---

## 5. UI upgrade, concretely

1. **Onboarding wizard.** Field-adaptive: fixed skeleton, swapped examples. Location pre-filled from IP with an override. Defaults pre-selected so no screen is ever blank. Attribution question last. Hard rule: every question maps to a consumer in ranking code, and we write that mapping down.
2. **Rung dashboard** replacing the current dashboard header. Current rung, one realistic next action, one stretch action. This is the promise EC Database made and did not keep.
3. **Detail modal** with structured fields: deadline, dates, eligibility, cost, apply method, and explicit unknowns. Direct lift, it is good.
4. **Map view** for local opportunities alongside the list.
5. **Field-adaptive accent color.** Cheap, and it makes the app feel built for you.
6. **Tiered progression language** on category pages, our version of Explorer / Strategist / Mythic.
7. **Result reveal** with a real reason line per item. Ours can cite verification date and response history rather than "it is virtual."

---

## 6. SEO and content engine

EC Database has twelve major pages. Ours are higher-intent and less contested:

- `/jobs/[town]/[age]` — "What a 15-year-old can do in Bayonne right now." Every Hudson County town crossed with 14 through 18.
- `/opportunities/[category]` — the tiered ladder per interest area.
- `/learn/[topic]` — NJ working papers, the first interview, what to say when you walk in, what counts as experience.
- **Hired stories.** Our founder-story equivalent, and the higher-conviction version: a real local teen, what they did, how long it took, who hired them. Same four jobs the Dr. Interested piece does, plus it recruits the employer featured in it.

---

## 7. Sequencing

**Phase A — Foundation (weeks 1 to 2).** Schema extension and one unified pipeline. Ladder rung detector against existing data. Tier 1 supply seeded, roughly 60 entries. Nothing user-visible changes yet.

**Phase B — Spine (weeks 3 to 4).** Rung dashboard. Feed reads rung. Get Ready mode retired and absorbed into rungs 0 through 3. Tier 2 supply.

**Phase C — Flywheel (weeks 5 to 6).** Submission form and review queue. First Hudson County youth-org outreach. First hired story.

**Phase D — Polish (weeks 7 to 8).** Onboarding wizard. Detail modal. Map. Town and age landing pages.

Legal research on minor privacy, NJ and NY employment law, and platform age rules runs in parallel and gates anything involving profiles, messaging, or community.

---

## 8. What would kill this

- **Two pipelines.** If opportunity ingest forks from job ingest, we are maintaining two thin databases and both rot.
- **Unverified inventory.** An expired program is exactly as damaging as an expired job. Same expiry rules or the whole quality thesis collapses.
- **Eligibility theater.** Geography, grade, and age gates must be hard filters. The German competition and the Australian stock game are what happens without them.
- **Questions with no consumer.** The single most provable flaw in the site we are learning from.
- **Scope creep into admissions advice.** The moment we are editing essays we are the weakest entrant in a crowded market instead of the only entrant in an empty one.
