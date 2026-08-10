# EmployTeens v2: Execution Plan

**Revised 2026-08-10** after auditing the live database and running EC Database's onboarding three times. The first draft of this document assumed 675 usable listings. That number was wrong, and the correction reorders everything below.

---

## Current state, measured

| | Before today | After |
|---|---|---|
| Active listings | 675 | **339** |
| Within commute range | 338 (50%) | 339 (100%) |
| Hudson County | ~60 | ~60 |
| Listings at 14 | 0 | 0 (not yet re-resolved) |
| Rows at the min_age fallback of 16 | 576 of 675 (85%) | pending audit |
| Can measure interviews or hires | No | Yes |

Three bugs caused most of the gap, all now fixed and deployed:

**Geography was never enforced at ingest.** `isInMarket` lived in `geo.ts`, was wired into the trust audit, and was never called by `ingest-pipeline.ts`. Workday and ATS tenants dumped full national requisition lists in. Five Below contributed 105 listings and BoxLunch 96, spread across the northeast. One was in Rochester Hills, Michigan, which got through because "MI" had no preceding comma so the out-of-state check missed it, and then `rochester` matched an upstate-NY allowlist.

**"Market" meant state lines, not commute range.** The old definition had a blanket `\b(ny|nyc|nj)\b` rule plus an allowlist containing Albany, Buffalo, Rochester and Syracuse. Cherry Hill (near Philadelphia) passed. Now `marketTier` returns core, transit, extended or out, and anything unrecognized defaults to out.

**min_age was one number doing two jobs.** `resolveMinAge` read only the title and company name and could never return above 16. A posting whose description said "must be 18 years of age" was stamped 16 and shown to 16-year-olds. It also defaulted every unrecognized employer to 16, which is why 85% of inventory sat at exactly that value, hiding restaurant, retail, grocery, library and camp work that NJ explicitly permits at 14.

---

## Shipped today

- **Outcome loop.** `applications` gains outcome, applied_at, first_response_at and check cadence. `hired` is now a real status, separate from `offered`. One-tap prompt at day 5 and day 14, max two asks ever. Unreported stays NULL and is never conflated with 'no_response'. Admin funnel at `/api/admin/outcomes` reports its own coverage rate and refuses to be trusted below 30 reported outcomes.
- **Child labor compliance.** `lib/jobs/child-labor.ts` encodes NJ and NY hour limits by age band and school session, the NJ occupations-permitted-at-14 whitelist, prohibited establishments, and FLSA hazardous orders where they are stricter. Splits `legal_min_age` from `employer_min_age`, where NULL means unknown rather than 16.
- **Geo gate at ingest**, running before any network call.
- **Unified opportunity model.** `kind`, `is_paid`, `deadline`, `recurrence`, `delivery`, `eligible_regions`, `language`, grade range, ladder rungs, `evidence_kind`, and a generated `verify_interval_days`. Eligibility fields enforced by CHECK constraint for anything that is not a plain job.
- **83 tests** across four suites.

**Still not applied to live data:** the audit endpoint has never run, so `legal_min_age` is null on all 339 rows and no description has been read for advertised hours. A "4am Inbound" shift at Target in Jersey City is currently marked 16+, which NJ prohibits. **This is the next action.**

---

## What we are copying from EC Database, and what we are not

Researched by completing their eight-question onboarding three times as different teens.

**Copying:**

- **Self-submission as the primary intake for organizations.** Their entire pipeline for 243 youth-led orgs is a Google Form. Those orgs need volunteers and have no reach, so the supply side recruits itself.
- **Inventory with a long shelf life.** Annual competitions stay valid for a year; job reqs die in days.
- **The founder-story asset.** One interview turned into a long-form guide that does SEO, credibility, and recruitment of the next org simultaneously, with the subject distributing it for you.
- Never-blank defaults, IP-prefilled location, fixed question skeleton with field-swapped examples, tiered progression language, detail cards that print "Cost unconfirmed" out loud.

**Not copying:**

- **Their listing data.** The sources are public (hosa.org, DECA, edX, each org's own site), compiling them is roughly a day of work, and copying imports their errors.
- **College admissions advice.** No essay editing, no school lists, no chance-me.
- **Questions with no consumer.** Proven by controlled test: identical answers with grade 12 and "I am experienced" versus grade 9 and "I am exploring" returned byte-identical results. A senior who had "shipped a substantial product" was recommended CS50's Introduction to Programming with Scratch. Every question we ship maps to a named consumer in ranking code.
- **User-generated public profiles and teen-to-adult messaging.** Keeps the moderation surface at zero.
- **Their visual identity.** We have a working token system already. No mascot.

---

## Decisions made this session

**Opportunities bypass the ingest pipeline entirely.** Its gates exist to catch job-board spam; point them at hosa.org and they reject a valid competition for looking like a generic landing page. Curated entries use the existing `isProgramPage` / `is_curated` lane: HTTP liveness only, no URL-shape check, no scam score, no quality gate. Recheck cadence comes from `verify_interval_days`, generated per kind (job 3 days, competition 90).

**Geography applies to in-person only.** A virtual competition has no distance. The real filter is eligibility, which is why `delivery`, `eligible_regions`, `language` and grade range are required by CHECK constraint on non-job rows. EC Database ranked a German-language Berlin competition first and the Australia-and-New-Zealand-only ASX Sharemarket Game third for a Jersey City sophomore. Both were virtual. Neither was a distance problem.

**Volume target matches theirs, gated by eligibility.** Several hundred opportunities and a real organization directory. Scale without their failure mode.

**One feed, two roadmaps.** Results always land in a single list with filter chips, so a teen never has to decide whether they're a "jobs person" or an "extracurriculars person." But there are two distinct entry intents, and they ask different questions, because the eligibility rules genuinely differ: jobs are gated by age and child labor law, opportunities are gated by grade, cost, and commitment. Two wizards, one feed. Public landing pages at `/jobs/[town]/[age]` and `/opportunities/[category]` are a separate SEO problem and do get their own routes.

**Grade opportunities by evidence strength.** An open virtual course produces a PDF. A six-month local role with a named supervisor produces someone who will pick up the phone. Both belong in the app doing different jobs, and saying so out loud is something EC Database structurally cannot do because it would devalue their own inventory.

**Name stays EmployTeens.** Literal, searchable, and the category is searched literally ("jobs for 15 year olds near me"). Maxxing vernacular belongs in tier names and TikTok copy, not in the name a school district or grant reviewer reads.

**No fabricated reviews or user counts.** FTC's consumer review rule and App Store guideline 2.3 both prohibit it, and for a product whose entire thesis is "every listing here is real," inventing trust signals is unrecoverable. Use proof-of-work claims instead — every listing checked against NJ and NY child labor law, employers called to confirm they hire at 14, re-verified every few days, free and we don't sell your data — then collect ten real quotes.

---

## The ladder

Eight rungs, one climb. Rungs 0 to 3 are activity-based and open at 14. Rungs 4 to 7 are employment-based and unlock at 16.

0 not eligible yet · 1 eligible, papers in hand · 2 started something · 3 someone will vouch · 4 applied · 5 employer replied · 6 earning · 7 trusted

Rung 3 is the hinge and the product's actual promise. An adult who will vouch for you is the same asset a job application and a college essay both need. It is also why a 14-year-old is never in a consolation mode: same ladder, earlier.

**Rungs must be detected, not asserted.** Papers status, confirmed applications, outcome reports, program completion confirmed by the org. Self-reported rungs are marked soft and never drive a claim. That distinction is the difference between a real progression and EC Database's fake one.

---

## Supply, in ascending order of cost

**Tier 1 — recurring national competitions (~60 entries, one pass, 12-month shelf life).** HOSA, DECA, FBLA, BPA, Congressional App Challenge, Blue Ocean, Conrad Challenge, Regeneron ISEF, Scholastic, National History Day, Science Olympiad, AMC, USACO, Technovation, Diamond Challenge, NFTE, Junior Achievement. Every entry gets eligibility, cost or `cost_unknown`, deadline, recurrence and a hard geography check.

**Tier 2 — NJ and NYC specific.** NJ Governor's School, county youth programs, pre-college at NJIT / Rutgers / Stevens / NYU, Hudson County libraries, hospital volunteer programs, museums, parks departments, camps that hire and train teens. Much of this already exists in `lib/jobs/local-sources.ts` with `activeMonths` windows and stops being the thing shown when there are no jobs.

**Tier 3 — self-submission, the flywheel.** Native form plus admin review queue, never auto-published. Two audiences: youth-led organizations (Hudson County has them and no local aggregator lists them) and employers. This is inventory that recruits itself and that a national site cannot replicate, because it is local.

**Tier 4 — published hiring ages.** Many chains state their minimum age on their own careers pages or FAQ. Batched web research, no contact with anyone, and it fills `employer_min_age` for the brands that account for most listings.

**No outreach calling tier.** An earlier draft made employer phone verification the path to 14-year-old supply. That was wrong, because it made supply depend on founder hours, which do not scale and were never going to be spent this way. See the section below, which removes the dependency entirely.

---

## Verification is an output, not a prerequisite

The old logic was: confirm an employer hires at 14, then show the listing. That requires a human on a phone, so it never happens, so `employer_min_age` stays null forever and a 14-year-old opens the app to an empty screen. Verification being a precondition is the reason there is no supply.

Inverted: show the listing with honest uncertainty and let the outcome loop harvest the answer.

**Three distinct states on every card, and only one of them is a promise:**

| State | Copy | Meaning |
|---|---|---|
| Confirmed | "Confirmed: hires at 14" | A teen actually got hired or accepted at that age, or the employer published it |
| Legally eligible | "NJ law allows 14 here. We haven't confirmed this employer's policy." | `legal_min_age` < 16, `employer_min_age` NULL |
| Employer floor | "This employer requires 16+" | `employer_min_age` >= 16 |

The word "verified" is reserved for the first row. Everything else says what we don't know.

**The outcome sheet becomes the verification instrument.** It already asks what the employer did. Add one option: **"They said I'm too young."** One tap writes `employer_min_age` for that employer, and the next teen sees an accurate card. Roughly fifteen lines in `lib/outcomes.ts` and `OutcomeCheckSheet.tsx`.

Why this beats calling on every axis: it scales with users rather than with founder hours, it produces evidence of actual practice rather than what a manager said on the phone once in July, and it compounds — after twenty applications to a given store you know their real policy better than corporate HR would tell you.

The cost is real and worth naming: some teens will be turned away for being too young. That is a worse outcome than a confirmed listing and a better one than an empty app, provided the card never promised anything. Teens applying for work get told no constantly. Being told "this is legal, worth asking, no guarantees" treats them as capable of deciding. Showing them nothing does not.

---

## The UI, screen by screen

Built in the existing `--et-` token system. Blue-to-purple for match, green for success, amber for warning, the zinc gray ramp, framer-motion spring sheets. No reskin, no mascot. EC Database's wizard bear works because they sell college dreams; we sell a paycheck. Everything below is structural, not cosmetic.

### 1. Home becomes the rung dashboard

Replaces the current dashboard header, and absorbs Get Ready mode so it stops being a consolation screen for under-16s.

Top: the rung, named and numbered, with the eight-rung track drawn small and the current position lit. Under it, **one realistic next action and one stretch action**, which is the promise EC Database makes and does not keep.

A 15-year-old at rung 1 sees: "Get one thing on your list" as the realistic move, with three nearby options, and "Apply anyway to a place that's legally allowed to hire you" as the stretch. A 16-year-old at rung 4 with two applications out sees: "Follow up with Target, you applied 9 days ago" and "Two new listings near you since Tuesday."

Below that, a compact strip: applications out, replies, interviews. Numbers only, no chart.

### 2. One feed, filter chips

No Jobs tab and Opportunities tab. One list.

Chips across the top: **Open now · Paid · Near me · Starts soon · Show all**. Kind is a filter, never a navigation destination.

Card anatomy, in order of what a teen actually needs: title, employer, distance or "Virtual", the **age state line** from the table above, pay or "Unpaid", and a deadline chip when one exists. Then one reason line, and this is where we beat them — theirs says "It is virtual, so you can participate from Jersey City." Ours can say "Verified 3 days ago · this employer replied to 4 of 5 applicants."

Sort by evidence strength within relevance, so the thing that gets you a reference outranks the thing that gets you a PDF.

### 3. Detail sheet

Bottom sheet, matching the existing `ApplyConfirmSheet` motion.

Structured fields with unknowns printed out loud: deadline, dates, eligibility grades, cost or "Cost unconfirmed", delivery, language when not English. Then **why this is or isn't legal for you at your age**, in plain words: "You're 15. NJ allows this kind of work at 14, but this listing mentions shifts until 10pm, and 15-year-olds can't work past 7pm during the school year." That sentence is generated from `child-labor.ts` and no competitor can produce it.

Apply button, or Call / Text for the human-contact listings. Then the working-papers reminder if they haven't got them.

### 4. Onboarding wizard

Eight screens max, under a minute, no account required until they save something.

Steal the mechanics: two options pre-selected on screen one so nothing is ever blank, location prefilled from IP with an override, fixed question skeleton with examples swapped per interest, attribution question last.

**Hard rule, written into the PR checklist: every question names its consumer in ranking code.** If a question has no consumer it does not ship, because EC Database asks grade and experience level and provably ignores both. Data minimization is also a NYCDPA requirement, so this list is the compliance argument as well as the product one.

#### The eight questions

| # | Question | Options | Consumer in code |
|---|---|---|---|
| 1 | **How old are you?** | 13 · 14 · 15 · 16 · 17 · 18 · 19 | Hard `min_age` filter. Selects the child-labor hours band (14–15 vs 16–17). Gates rungs 4+ |
| 2 | **Where are you?** | Prefilled from IP, editable | Haversine distance in match-engine. `marketTier` boost so core outranks extended |
| 3 | **How do you get around?** | Walk · Bike · Bus or train · Someone drives me · I drive | `TRANSPORT_RANGE` commute radius (already exists in match-engine v3) |
| 4 | **When are you free?** | After school · Weekends · Evenings · Summer only · Pretty flexible | Schedule overlap score (25% weight). Cross-checked against `child-labor.ts` hour limits so we never show a shift they legally can't take |
| 5 | **What are you after right now?** | Money as soon as possible · Experience for my resume · Something for college apps · Not sure yet | **The sort mode.** Money ranks paid and fast-hiring first. College ranks `evidence_kind` of reference/award/title. Not sure gets a balanced mix |
| 6 | **What sounds interesting?** (pick up to 3) | Food and coffee · Stores and retail · Kids and camps · Animals · Sports and rec · Arts and media · Tech · Helping people · Hands-on and building | Interest alignment weight (15%). Also swaps the examples shown in later screens and in the feed |
| 7 | **Have you worked before?** | Never · Casual stuff (babysitting, yard work, tutoring) · Had a real job · Working now | Seeds the rung. Sets `rung_from` on the feed filter |
| 8 | **Do you have working papers?** | Yes · No · What are those? | Rung 0 versus rung 1. "What are those?" routes to the NJ guide instead of scoring anything |

**Age, not grade.** EC Database asks grade. Grade is a broken proxy for what actually matters here, because a 14-year-old can be in 9th or 10th and the legal difference between 15 and 16 is enormous. We ask the thing the law cares about.

**No college-tier question.** Theirs offers Ivy+, Top 50, Top 100 or flagship, with no option for community college, trade, state school, or "I need to work." Question 5 replaces it and covers the same intent without assuming everyone is optimizing for admissions.

**Attribution moves off the wizard.** "How did you find us?" runs as a single tap on the results screen, labeled as not affecting results. Same data, and it doesn't spend a slot in the flow.

**What each answer produces:** legal eligibility and hour band, commute radius, schedule fit, sort mode, interests, and a starting rung. That is the entire input set the ranking engine needs, and nothing collected is unused.

### 4b. The extracurricular roadmap — a second wizard, same feed

Reached from "Build my roadmap." Separate flow because opportunities are gated by different things than jobs: grade rather than age, plus cost and commitment, which the job wizard has no reason to ask.

| # | Question | Options | Consumer in code |
|---|---|---|---|
| 1 | **What are you into?** (pick up to 3) | Health and medicine · Computer science · Engineering · Business · Law and policy · Psychology · Biology · Environment · Math · Physics · Writing and media · Art and design · Education · Not sure yet | Interest weight. Seeds the examples in every later screen |
| 2 | **What part of that pulls you in?** | Adaptive to Q1. CS gets robotics / AI on devices / systems / hardware-plus-software. Health gets patient contact / research / public health / mental health | Sub-topic match weight. Also picks which founder story and org category to surface |
| 3 | **What kind of work sounds exciting?** | Build something · Compete · Research · Lead and organize · Teach and serve · Create and publish. Examples swap per field (DECA and a stock pitch for business, USACO and a hackathon for CS) | Activity-type weight. Maps to `evidence_kind` preference |
| 4 | **What grade are you in?** | 8 or below · 9 · 10 · 11 · 12 | `min_grade` / `max_grade` eligibility filter, which is a hard gate. Also sets urgency: a senior gets near deadlines and fast payoff, a freshman gets multi-year ladders |
| 5 | **Where are you?** | Prefilled from IP, editable | In-person results ranked by distance. Virtual results are geography-free but still filtered by `eligible_regions` |
| 6 | **How much time do you actually have?** | A few hours total · A few hours a week · Most weekends · This is my main thing | Commitment filter. Stops us recommending a six-month program to someone with an afternoon |
| 7 | **Does it need to be free?** | Yes, free only · A small fee is okay · Cost isn't the issue | `cost_cents` filter, and `cost_unknown` rows are demoted rather than hidden |
| 8 | **Where are you starting from?** | I'm exploring · I've tried something · I do this regularly · I've gone deep. Descriptions swap per field | `rung_from` filter on the feed. **This one must actually change results** |

Attribution runs on the results screen, same as the job wizard.

**Questions 6 and 7 are the ones EC Database structurally cannot ask.** Their inventory is aspirational, so asking "do you have three hours or three months" and "can you pay for this" would expose how much of it doesn't fit a working-class student. For a Hudson County teen those are the first two questions that matter, and asking them is the whole differentiation.

**Question 8 must filter, not decorate.** Controlled test on EC Database, 2026-08-10: identical answers with grade 12 plus "I am experienced" versus grade 9 plus "I am exploring" returned byte-identical results, and a senior who had shipped a product was recommended CS50's Scratch course. If ours doesn't visibly change the output, it comes out of the flow.

**The result screen mirrors theirs and improves the reason line.** They return exactly three items — one virtual, one organization, one local — each with a "Why this" line. That shape is good and worth keeping, because three is a decision and thirty is a scroll. Theirs says "It is virtual, so you can participate from Jersey City." Ours says what it costs, what it takes, what it proves: "Free, about 4 hours a week, and you finish with a supervisor who can be a reference."

### 5. Tracker

Mostly shipped. Add the rung badge per application and the "They said I'm too young" outcome option.

### 6. Coach — the Appybara-shaped piece

You already have `lib/ai/career-ai.ts` and `coach-context.ts`, and today they're feed-shaped: the coach knows which jobs matched. Appybara's version is state-shaped: it knows where *you* are and answers "what now."

The upgrade is the context payload, not the model. Feed it rung, working-papers status, applications out with ages in days, outcomes reported, which listings are legally open at their age, and what's expiring this week. Then it can answer the questions teens actually ask:

- "Why hasn't anyone called me back?" → it can see four applications, all under a week old, and say so instead of guessing.
- "Am I ready to apply here?" → the readiness check, our version of chance-me. Not a probability, but what this employer expects and what's missing, grounded in real response data.
- "What should I do this week?" → the rung's next action, with two specific listings attached.
- "Can I even work at 15?" → straight from `child-labor.ts`, with hours and occupation rules.

Guardrails: answers cite the rows they came from, no invented employers or deadlines, and it never states a hiring probability we can't back with outcome data. On employment rights it repeats what the law module encodes and points to the NJ or NY labor department rather than improvising.

### 7. Marketing site and App Store

Direct lift of EC Database's landing structure, which is genuinely good: dark hero panel, eyebrow label, one large claim, two buttons, and a light card with three numbered steps. Ours: get your working papers, find jobs that will actually hire your age, track who replies.

Then numbered feature sections alternating image and text, each product shot in device chrome. That doubles as the App Store screenshot set, which wants exactly this format six to ten times.

Trust section uses proof of work, not social proof: every listing checked against NJ and NY child labor law, re-verified every few days, free and we don't sell your data, built in Jersey City. Coverage instead of a user count — a Hudson County map with towns lit, real employer logos. Real reviews go in when there are real reviews.

---

## Appybara-style features, mapped to data we own

| Appybara | EmployTeens | Why ours is better |
|---|---|---|
| Admit profiles | **Hired paths** | Anonymized from our own outcome loop. Real and unfakeable |
| Application tracker | Shipped | Already the best-instrumented piece we have |
| AI chance-me | **Readiness check** | Not "will you get in" but what this employer expects and what you're missing |
| Mentor program | **Teens who got hired** | Supply side paid in credibility, same trick they use |
| Essay examples | **Scripts** | What to say when you walk in, how to text a manager, a first resume with no experience |

**Do not charge the teens.** They are here because they need income. Employer or program listings, school district and municipal contracts, WIOA youth workforce grants, or a parent tier.

---

## Compliance

**NY Child Data Protection Act**, effective June 20, 2025, applies directly. EmployTeens is "primarily directed to minors" and asks age at onboarding, so actual knowledge is established and ignorance is not available. For 13 to 17 year olds, processing personal data requires the teen's own consent unless strictly necessary for the service they requested. Job matching from onboarding answers fits that exception. Third-party analytics, marketing and anything shared externally do not. The AG guidance explicitly excludes marketing, advertising and R&D from "internal business operations."

Practical consequences: audit every third-party script and SDK, ship a consent screen for anything non-essential, no targeted advertising to minors, no data sales, and App Privacy labels that match what we actually collect. Data minimization is now a legal requirement as well as product hygiene, which converges neatly with the rule about not asking questions we don't use.

**NJ and NY child labor law** is encoded in `lib/jobs/child-labor.ts`. NY is materially stricter for 16 and 17 year olds during the school year: 28 hours a week and 4 hours on a school night, versus NJ's 40 and 8.

Not legal advice. Have counsel review the consent flow before it ships.

---

## Sequencing

**Now.** Run `/api/admin/audit-jobs`. Age re-resolution against occupation law, description parsing for stated ages and advertised hours, populates `legal_min_age` and `employer_min_age`, flags anything above 19. Nothing else should be built before the data underneath is honest.

**Then.** Add the "They said I'm too young" outcome option and ship the three age states on cards. Roughly fifteen lines plus copy, and it turns every application into a verification event.

**Week 1.** Rung detector against existing data. Tier 1 opportunities seeded.

**Week 2.** Rung dashboard replacing the current header. Feed reads rung. Get Ready mode retired and absorbed into rungs 0 to 3. Tier 2 supply.

**Weeks 3 to 4.** Submission form and review queue. First Hudson County youth-org outreach. First hired story.

**Weeks 5 to 6.** Onboarding wizard, detail modal, map view, town and age landing pages. Then the marketing page and App Store screenshots, built from real numbers.

**Parallel, before any App Store submission.** Guideline 4.2 minimum functionality is the real launch risk, not visual polish. A Capacitor shell wrapping a web view is the classic rejection. Add push notifications for deadlines and interviews, document capture for working papers, calendar integration, offline access to saved listings. Two or three of those and you are clearly an app.

---

## What would kill this

- **Two pipelines.** If opportunity ingest forks from job ingest, we maintain two thin databases and both rot.
- **Trusting a headline count again.** Today's lesson: 675 meant 339. Never quote inventory without a geo and tier breakdown behind it.
- **Eligibility theater.** Geography, grade and age must be hard filters. The Berlin competition and the Australian stock game are what happens otherwise.
- **Questions with no consumer.** The single most provable flaw in the site we are learning from.
- **Scope.** One person, and this document lists more work than one person can do at once. If a week passes with no teen closer to a job, we are building the wrong thing.
- **Making supply depend on founder labor.** The first draft of this plan did exactly that and it would have stalled indefinitely. Anything that only works if someone spends an afternoon on the phone is not a plan, it is a wish.
- **Saying "verified" when we mean "probably."** The self-verifying loop only works because the uncertain state is labeled uncertain. The moment a card overpromises and a 14-year-old gets turned away by something we called verified, the whole trust thesis is gone.
