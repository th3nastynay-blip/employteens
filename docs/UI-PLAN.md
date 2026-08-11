# EmployTeens — UI plan and handoff

**Written 2026-08-11.** Start the next session by reading this file, then
`docs/UI-REDESIGN-PLAN.md` for the original EC Database teardown.

---

## 0. Read this first — the mistake that cost most of last session

**A file in `supabase/migrations/` is SQL somebody wrote. Nothing runs it.**
It is not the state of the database.

Four production bugs last session, all the same root cause:

| Symptom | Actual cause |
|---|---|
| Every account showed 0 applications | Audit flagged jobs; RLS `status='active'` then hid them; the client dropped applications whose job embed came back null |
| Explore said "0 open now" with 22 in the calendar | Ingest set out-of-season rows `inactive`, which RLS makes unreadable. The page queried for exactly those rows |
| Reference form: "Could not save" | `add_user_ladder_fields.sql` had never been run |
| Rung stuck at "Not eligible yet" for everyone | `has_working_papers` did not exist, so four queries failed silently |

Two of those I diagnosed by guessing before reading an error. Don't.

**Run the drift check before any feature touching a new column.** Generate it
with the script in the git history of this file, or regenerate: parse every
`ADD COLUMN` in `supabase/migrations/*.sql` and `schema.sql`, then

```sql
WITH expected(table_name, column_name) AS (VALUES ('users','some_col'), ...)
SELECT e.* FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
WHERE c.column_name IS NULL;
```

Empty result = repo and database agree. As of 2026-08-11 it is empty.

**Second rule:** never return a generic error string from an API route. Return
`error.message`, `code`, `hint`. The generic "Could not save" is what made the
missing-column bug take four exchanges.

---

## 1. Where things stand

**Done and deployed**

- Design system in `app/globals.css` under "REDESIGN LAYER" (line ~420+)
- `/extracurriculars` — closing-soon strip, filtered list, 12-month calendar
- `OpportunitySheet` — detail sheet with working Apply link
- `OrgLogo` — favicon with monogram fallback
- `ProfileHeader` — attribute row, 8-step stepper, next-action card
- `ReferenceCard` + `/vouch/[token]` — the vouch flow
- Rung ladder actually reads real data now

**Not started**

- Job feed / `JobCard` — still the original design
- Marketing page (`app/page.tsx`) — still Inter, still one fold
- Coach (`/career`)
- Onboarding (13 steps)
- Map — blocked on geocoding, see §5

**Known open issues**

- `app/(app)/dashboard/page.tsx:70` — `loadDashboard` accessed before declared
  (pre-existing lint error, harmless but real)
- `CRON_SECRET` is `employteens123` and has been passed in URLs, so it is in
  Vercel request logs. Rotate it.
- GitHub PAT is plaintext in `.git/config`. Revoke and re-add via SSH.
- Em dashes throughout product copy. Nayan dislikes them. One sweep.
- `/api/admin/audit-jobs` is at `_audited:v7` and has ~150 rows left to walk.
  `title_unknown` rows are tagged `_title:unreviewed` but NOT hidden — decide
  whether to start flagging after reading the counts.

---

## 2. The design system — use these, don't reinvent

Defined in `app/globals.css`. All of it already exists.

**Type.** `.display` + `.display-xl` (30px) / `.display-lg` (24px) /
`.display-md` (19px). Outfit via `--font-display`. Body stays Inter.

**Sections.** `.numbered` with `data-n="01"` draws a ghosted numeral behind the
heading. `.numbered-eyebrow` is the small blue label above it.

**Gradient.** `--et-match-from` (#2563EB) → `--et-match-to` (#7C3AED).
`.grad-border` for a gradient hairline, `.grad-panel` for a filled panel.

**Metadata.** `.pill` + `.pill-green` / `-blue` / `-amber` / `-muted`.
Unconfirmed data is `pill-muted` — dimmed, never hidden.

**Filters.** `.fchip` + `.fchip-on` (gradient) + `.fchip-empty` + `.fchip-count`.
One class, used by FeedChips, dashboard tabs and the EC filters.

**Status.** `.status-dot` + `.status-open` / `-closing` / `-upcoming`.

**Motion.** One curve: `cubic-bezier(0.22, 1, 0.36, 1)` as `--ease-out`.
`.rise` + `.rise-1..5` for staggered fade-up. `.press` for tap. `.fill-track`
for the progress bar. All disabled under `prefers-reduced-motion`.

**Layout.** `.pb-nav` on every page inside `(app)` — the bottom nav is
`position: fixed; z-index: 100` and will sit on content without it. Anything
that must appear ABOVE the nav needs `z-index > 100` (the sheet uses 200/201).

---

## 3. UI work, in order

### 3.1 Job feed — DO THIS FIRST

The most-used screen, and the only one still on the old design. A teen
switching between Feed and Explore currently sees two different products.

Files: `components/jobs/JobCard.tsx` (352 lines), `components/jobs/FeedSection.tsx`,
`app/(app)/dashboard/page.tsx`.

- Swap the logo block for `<OrgLogo src={job.logo_url} name={job.company} />`
- Add a two-line description clamp, same as `OpportunityCard`
- Build `JobSheet` modelled on `OpportunitySheet`: description, pay, hours,
  distance, age line, apply method. Reuse the fixed-footer Apply pattern.
- Keep the match ring — a job IS scored against schedule and commute, so the
  ring is real precision there. Opportunities deliberately have no ring.
- Card anatomy order: logo · title · company · match · pay · distance ·
  age/papers line · apply method
- `apply_method` is `url | call | text | email`. Call and text listings need a
  visibly different action, not a generic "Apply".

### 3.2 Rest of the profile

`ProfileHeader` and `ReferenceCard` are done. Everything below them is the old
card style: availability grid, transport, interests, skills, resume, sign out.

Convert each to a plain section with a `.numbered-eyebrow` label. Kill
`ProfileCard`, `CompletionRing` and the AI-insights block — the stepper
replaced the ring, and the insights are generic filler that says
"Public transit access increases your radius" to everyone.

### 3.3 Marketing page

`app/page.tsx`, 188 lines, one fold. Currently renders in Inter, so the front
door looks older than the app.

- Apply `.display` to the headline
- Gradient on the primary CTA
- Then extend into numbered feature sections, each screenshot in device chrome
  (`.chrome-frame` / `.chrome-bar` already exist). That set doubles as the App
  Store screenshots, which Apple wants 6-10 of in exactly that format.
- Trust section is proof-of-work, NOT social proof. No fabricated testimonials
  or user counts — there is one real user. `/api/public-stats` gives a real
  listing count; use that and nothing else.

### 3.4 Coach

`app/(app)/career`. Gradient user bubbles, surface-2 assistant bubbles,
suggested prompts as `.fchip` above the input generated from the rung. Every
answer should cite its rows — "based on your 2 applications and 14 listings
near you". That line is the difference between a chatbot and something a teen
trusts.

### 3.5 Onboarding

13 steps, seen once. Last on purpose. When you get there, add a working-papers
question — it currently has none, which is why `has_working_papers` was never
written.

---

## 4. Things NOT to copy from EC Database / Appybara

Written down because they keep coming up.

- **No mascot.** Their wizard bear works because they sell college dreams to
  sophomores. Ours is a paycheck for a 15-year-old in Bayonne.
- **No peer comparison.** Appybara's "How strong is your profile?" ranks you
  against other applicants. Useless and unkind here.
- **No fabricated social proof.** "Trusted by 20,000 students" is real for
  them. It is not for us.
- **Desktop layouts do not translate.** Their bento grid and split list/map are
  1440px patterns. This is a 390px Capacitor shell. Numbered sections, pills,
  status colours and card anatomy travel fine. Layouts mostly do not.

---

## 5. Map — decide before building

Blocked on geocoding: only 45 hardcoded ZIP centroids exist in
`lib/ai/match-engine.ts`, so every Jersey City listing shares one coordinate.
Real work is `lat`/`lng` columns plus a batch run through the US Census
Geocoder (free, no key).

**Push back before spending a day on it.** EC Database's map works because
their inventory is national. Yours is concentrated in ~15 square miles, where a
map mostly tells a teen "everything is near you" — which they know. A
"walkable / one bus / PATH ride" filter answers the real question — *can I get
there after school* — and needs no coordinates at all.

If the map does get built: show a "N virtual, not on the map" chip. Theirs
silently drops ~34 virtual entries.

---

## 6. Test loop

After any change touching the ladder or the feed:

1. Dashboard → "I already have my working papers" → rung moves off 0
2. Profile → add a reference → open `/vouch/<token>` in a private window →
   confirm → reload profile → card reads Verified, rung jumps to 7
3. Explore → tap a card → sheet opens → Apply link goes somewhere real
4. Saved → applications still listed, including ones whose job was flagged

`npx tsc --noEmit` and `npx eslint` both pass clean today except the one
pre-existing dashboard error. `npx next build` cannot run in the sandbox (no
egress to Google Fonts) — Vercel is the real check.

---

## 7. The honest note

Most of last session went on data bugs, not design, and the reason the UI kept
looking broken was that the pages had nothing to render. Before judging any
screen, confirm it has data. Before building on a column, confirm it exists.
