# EmployTeens UI redesign

**2026-08-10.** Written after going through every page on ecdatabase.org: home,
about, extracurriculars index, a major page, organizations, opportunities,
passion projects, and the eight-question wizard run three times.

---

## What they actually do well, named precisely

Not "it looks nice" — these are specific, copyable mechanics.

**1. Numbered sections as a spine.** `01 / 02 / 03 / 04` runs through the
homepage, the final CTA card, and the FAQ. Large ghosted numerals in the
background, small ones in the eyebrow. It makes a long page feel like a
sequence rather than a scroll.

**2. Product screenshots in browser chrome.** Every feature section shows the
actual product inside a fake browser frame with `ecdatabase.org` labelled on it.
Costs nothing, and it makes a young site look established.

**3. A bento grid for the second fold.** Their "Your roadmap" block is mixed-size
cards — a big founder card, a matching card, a directory card, a profiles card,
an onboarding card. Different sizes, one grid. It reads as substance without
being a wall of text.

**4. FAQ as numbered accordion.** Six questions, `01`–`06`, one open at a time.
Answers written plainly, including "Is it free?" answered directly.

**5. Testimonial marquee.** A horizontally scrolling row of real quotes,
duplicated to loop seamlessly. Note theirs are genuinely real — ours will be
empty until we have some, and that section stays out until then.

**6. Status colour is consistent and semantic.** Green for open, amber for a
deadline, grey for legacy. Same three colours on every surface.

**7. Pill tags carry the metadata.** Category, format, location, all as small
rounded chips. No tables, no dense rows.

**8. The mascot anchors every page.** Recurring wizard bear at the top of
sections. It works for them and we are not copying it — more on that below.

---

## What we keep, and what we are not taking

**Keep our tokens.** You already have the gradient you like:
`--et-match-from: #2563EB` → `--et-match-to: #7C3AED`. It is defined and barely
used — currently only on match rings. The redesign's single biggest visual win
is putting that blue-to-purple gradient to work across hero, active states,
progress and section accents.

**Keep the logo and the zinc ramp.** `--et-ink` through `--et-placeholder` is a
good neutral scale. No reason to touch it.

**No mascot.** Theirs is a wizard bear because they sell college dreams to
sophomores optimising for Princeton. Ours is a paycheck for a 15-year-old in
Bayonne. A cartoon in front of that reads as if the app is for someone else.
Our recurring anchor is the **rung ladder** — the eight-segment track from
RungCard, used small in section headers the way they use the bear.

**No fabricated testimonials or user counts.** Their "Trusted by 20,000
students" is real. Ours is not, so that band stays out until it is. In its place:
proof-of-work claims we can actually stand behind — every listing checked
against NJ and NY child labor law, links re-verified, free, we don't sell your
data.

---

## Information architecture

Current tabs: Dashboard · Saved · Coach · Profile.

Proposed:

| Tab | Route | What it is |
|---|---|---|
| **Home** | `/dashboard` | Rung card, next two moves, what's closing soon |
| **Find** | `/jobs` | The unified feed — jobs and opportunities, filter chips |
| **Extracurriculars** | `/extracurriculars` | **New.** The EC surface you asked for |
| **Tracker** | `/jobs/saved` | Applications and outcomes |
| **Coach** | `/career` | AI coach, rung-aware |

Five tabs is one more than we have. If that is too many on a phone, Tracker
folds into Home as a section and we stay at four.

---

## 1. The new Extracurriculars page

Their `/opportunities` is a list plus a map plus filters. Ours should be that
plus the two things they cannot do: seasonality and evidence honesty.

**Top: "Closing soon" strip.** Horizontally scrolling cards for anything with a
real deadline inside 60 days, amber accent. Right now that surfaces **BGIC,
closing 28 August**. This is `calendarHighlights()`, already written and tested.

**Then the split view.** List on the left, map on the right on desktop; a
List / Map toggle on mobile. Same pattern as theirs, and with 13 in-person
entries plus 339 jobs, Hudson County will look denser on our map than theirs.

**Filter rail:** Category · Format (in person / virtual / hybrid) · Grade ·
Cost (free / paid / unconfirmed) · Season (open now / opening soon / all).
Note that "cost unconfirmed" is a filterable state, not a hidden one.

**Card anatomy**, in the order a teen needs it:
logo · title · org · the papers line if they don't have them · cost ·
location or "Virtual" · what it leaves you with · open-now or the season line.

**Below the fold: the calendar.** Twelve month buckets from
`groupByOpeningMonth()`. This is the thing EC Database has no version of, and
with 9 of 31 entries out of season in August it is a third of the inventory
that would otherwise be invisible.

---

## 2. Home, restyled

Keep the rung card as the anchor. Add above it a compressed version of their
numbered-step idea, but only for a teen at rung 0 or 1 who has nothing yet:

```
01  Get your working papers      02  Find something that hires
                                     at your age
03  Track who replies
```

Three steps, ghosted numerals, gradient on the active one. Disappears once they
reach rung 2, because by then they don't need the tutorial.

---

## 3. Coach

Their FAQ answers "How does AI matching work?" in plain language and shows its
reasoning. Ours should do the same, and go further because we have state they
don't: rung, applications, outcomes, and what is legally open at this age.

**Visual:** full-height chat, gradient user bubbles, surface-2 assistant
bubbles. Suggested prompts as chips above the input, generated from rung —
at rung 4 with two applications out, the chips read "Why hasn't anyone called
me back?" and "What do I say if I follow up?"

**Every answer cites its rows.** A small "based on your 2 applications and 14
listings near you" line under the response. That is the difference between a
chatbot and something a teen trusts.

---

## 4. Map

Blocked on geocoding, which is the real work — currently we only have ZIP
centroids, so every Jersey City listing would stack on one pin. Plan:
`lat`/`lng` columns, batch geocode through the **US Census Geocoder** (free,
no key, built for US street addresses), fall back to ZIP centroid and mark those
approximate.

Then Mapbox GL JS with clustering, logo pins from `logo_url`, and a tap-to-open
sheet. Free tier covers 50k loads a month.

**One thing done differently:** their map silently drops the ~34 virtual
entries. Ours shows a "21 virtual, not on the map" chip above it, so a third of
the inventory doesn't just vanish.

---

## 5. Motion

Subtle, and everything on the same curve: `cubic-bezier(0.22, 1, 0.36, 1)`,
which is already used in GetReadyMode.

- Cards fade up 8px, staggered 30ms, capped at 300ms total
- Chips scale to 0.96 on tap (already doing this)
- Sheets spring in — damping 28, stiffness 320 (already doing this)
- The rung track fills left to right once on load, 600ms
- Numerals in section headers fade from 0 to 0.08 opacity on scroll
- Respect `prefers-reduced-motion` and drop everything to a fade

Nothing bounces. Nothing loops. A teen on a three-year-old Android is the target,
not a Dribbble shot.

---

## 6. Marketing site and App Store

Direct lift of their homepage structure, which is genuinely good: dark panel
hero, eyebrow, one big claim, two buttons, and a light card with three numbered
steps. Then numbered feature sections alternating image and text, each shot in
device chrome — which doubles as the App Store screenshot set, since Apple wants
exactly that format six to ten times.

Trust section is proof-of-work, not social proof, until real reviews exist.

---

## Order of work

1. **Extracurriculars page** — the thing you asked for, and all its logic
   (calendar, filters, cards) is already written and tested
2. **Design pass on the feed** — gradient, chips, card anatomy
3. **Home numbered steps** for rungs 0-1
4. **Coach restyle** plus the rung-aware context payload
5. **Geocoding**, then the map
6. **Marketing page** and App Store screenshots

1 through 4 are UI on top of logic that already exists. 5 is genuinely new work.
6 wants real numbers, which we now have.

---

## The honest caveat

Their site is a **desktop marketing site with a web app attached**. Ours is a
**phone app in a Capacitor shell**. Some of what looks good on their 1440px
homepage — the bento grid, the split list-and-map, the wide feature sections —
has to be rethought for a 390px screen rather than scaled down. The numbered
sections, pill tags, status colours and card anatomy all travel fine. The
layouts mostly do not.
