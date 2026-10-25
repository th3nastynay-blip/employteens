# Congressional App Challenge — submission pack

Everything for the form plus the video.

> **DEADLINE: 12:00 PM EDT, Monday 26 October 2026.** Checked against the
> official 2026 CAC rules PDF. Not Sunday night. After the submission period
> closes the entry cannot be modified in any way.

---

## 1. FIRST: force a full re-verification sweep

This is the only thing with a deadline tonight. Re-verification checks 60 jobs
per run and you have 332 active, so a listing can currently be up to 14 days
stale. Six runs sweeps the whole table.

Run this in Terminal. **The secret stays on your machine, it is read from
`.env.local` and never printed.**

```bash
cd ~/Claude/Projects/"EMPLOYTEENS FINAL"
set -a; source .env.local; set +a

for i in 1 2 3 4 5 6; do
  echo "--- pass $i ---"
  curl -s -X GET "https://employteensfinal.vercel.app/api/cron/clean-jobs" \
    -H "Authorization: Bearer $CRON_SECRET"
  echo
  sleep 5
done
```

Each pass prints what it deactivated. **This writes to the database** — dead
and expired listings get switched off, so your active count will drop. That is
the point. A smaller honest number beats a judge clicking a dead link.

Afterwards, check the new total:

```
https://employteensfinal.vercel.app/api/public-stats
```

If `active_jobs` drops a lot (say below 150), tell me before you record the
video so we adjust the number you say out loud.

---

## 2. "What technical difficulties did you face programming your app?"

Pick either version. Both are true and specific.

### Full version

```
The hardest part was not building the app. It was discovering that our job
verification was lying to us.

Early on, we checked an application link by looking at whether the page loaded
and whether its text mentioned being closed. That works on a plain web page. It
does not work on the systems most employers actually use. Greenhouse, Lever and
Workday render their pages with JavaScript, so when our code fetched one it got
back an empty shell with no text in it. Our checker read that emptiness and
concluded the job was fine.

So we wrote an exception: for those sites, trust the URL shape and skip the
network request, since the data came from the employer's own API when we first
found it. That reasoning was true at the moment we imported the job and false
forever after. A role filled six months ago keeps the exact same URL and the
exact same job ID. Nothing could ever retire it. Our database said those
listings were healthy while a teenager tapping them landed on "this position is
no longer accepting applications." It was the worst kind of bug, because every
test passed.

What fixed it was realizing JavaScript affects the page body, not the status
line. A removed posting returns 404 whether or not it renders. So now we always
make the request and judge those links only on the status code and where the
redirect lands, never on text.

The second problem was redirects. We kept a blocklist of job aggregators to
reject, and the list never ended. A site called jobilize.com reached a real
user before we had heard of it. Blocklists have an infinite tail. We inverted
it: a link is accepted only if it ends on a known applicant tracking system or
on a domain containing the employer's own name. Everything else is rejected
without needing to be on any list.

Both bugs taught us the same thing. The dangerous failures are not the ones
that crash. They are the ones that return success while being wrong.
```

### Short version

```
Our job link checker was lying to us and every test passed.

Most employers post through systems like Greenhouse and Workday, which build
their pages with JavaScript. When our code fetched one, it got back an empty
shell with no text, so our "is this job still open" check saw nothing wrong and
marked it healthy. We patched around it by trusting the URL shape for those
sites and skipping the network request. That was true when we first imported a
job and false forever after, because a filled role keeps the same URL and the
same ID. Teenagers were tapping listings our database swore were fine and
landing on "no longer accepting applications."

The fix was realizing JavaScript affects the page body, not the status code. A
deleted posting returns 404 either way. So we stopped reading the text and
started reading the status line.
```

---

## 3. "What improvements would you make for a 2.0 version?"

```
The honest answer is supply, not features.

While auditing our own database we checked how many of our employer listings a
fourteen-year-old could legally apply to. Zero. The youngest minimum age
anywhere in the table is fifteen, and most of the listings are sixteen and up.
That is not a bug in our code. It is what the job market looks like for the
exact person we built this for, and it is the reason the app carries curated
programs and volunteering for that age group at all.

So 2.0 is about getting real openings for the bottom of the age range, and that
means going around the job boards rather than scraping more of them. Small
local businesses hire fourteen and fifteen year olds far more often than
national chains do, and almost none of them post online. Many want a phone call
or someone walking in. We want to support apply-by-call and apply-in-person
listings properly, with the number, the hours to call, and what to say, instead
of only handling links.

We would also let a local business post an opening directly. Right now every
listing is something we found. The restaurant that hired me would never use
Indeed, but they would absolutely tell a neighborhood app they need a busser.

Technically, re-verification is our next bottleneck. It currently rechecks
sixty listings a night, which means a full sweep takes about six days and a
listing can be two weeks old before its turn comes up. That was fine at a
hundred jobs and will not be fine at a thousand. We need to parallelize it and
recheck the most-clicked listings more often than the rest.

Everything else on our list is small. Supply for younger teens is the one that
decides whether this is useful or just well built.
```

---

## 4. "Did you use AI in the creation, development, or functionality of your app?"

Answer honestly and separate the two things. Judges respect disclosure and
penalize vagueness.

```
Yes, in two different ways.

Inside the app, we use Anthropic's Claude API for two features. The first is
the career coach, where a teen can ask questions about working papers, what to
say in an interview, or what to do next, and get an answer grounded in their
own profile and the listings they have saved. The second is match explanations,
the short "how this fits you" text on each card. Both are constrained to facts
the app already holds. The model is never the source of a job, a pay rate, an
age requirement, or a deadline, because a model that invents an employer detail
is worse than no feature at all.

While building it, we used AI as a coding assistant, mostly for reviewing our
own work and catching things we had missed. It found real bugs, including one
where every listing in a whole category was labeled with the wrong city. We
made the design decisions, chose the architecture, wrote the verification
rules, and decided what the app is allowed to claim. We also had to argue with
it more than once when it was confidently wrong.
```

That last line is worth keeping. It is true, it is specific, and it signals you
understand the tool rather than depending on it.

---

## 5. Demo video — voiceover script

**Format: screen recording with voiceover.** Every narration line must have
something on screen at the moment it is spoken.

### Rules, checked against the official 2026 CAC rules PDF

- **1 to 3 minutes.** Going outside that range "may be penalized by the judges
  at their discretion."
- **Upload to YouTube or Vimeo and set it to PUBLIC.** Not unlisted. The rules
  say this explicitly.
- The video **must** contain all six of these:

| Required | Where it is in the script below |
|---|---|
| The name(s) of each participant | 0:00 — both of you say your names |
| The name of the app | 0:06 |
| Purpose in **one clear sentence** | 0:08 — the single sentence, say it cleanly |
| The app's target audience | 0:14 |
| The tools and coding languages used | 0:20–0:34 |
| Showcase the functionality | 0:34 onward |

This script runs about **2:45**. Narration is 323 words, roughly 2:15 of actual
speech, leaving ~30s of deliberate silence between sections. Comfortably inside
the 1–3 minute window.

Record on a **17-year-old profile**, never 14, or the feed looks empty.

### The method that actually works

Do not talk and navigate at the same time. You will stumble and the pacing will
be wrong.

1. Record the screen **silent**, slowly, one take per section. Pause a full
   second on anything you want read.
2. Rough-cut the silent footage to roughly these timings.
3. Narrate **while watching the cut**, so words land on the right frame.
4. Say each line a half-second *before* the action, not after.

---

### Script

**[0:00–0:20] SCREEN: landing page, slow scroll to the verified count**

> **NAYAN:** I'm Nayan Perkari.
>
> **MIA:** And I'm Mia [LAST NAME].
>
> **NAYAN:** This is EmployTeens. EmployTeens helps teenagers find jobs they
> are legally old enough to take and that actually still exist. It's built for
> fourteen to eighteen year olds in New York and New Jersey, who get almost
> nothing useful from normal job sites.

**[0:20–0:34] SCREEN: keep scrolling the landing page, or show the app on a phone**

> **MIA:** We wrote it in TypeScript, using React and Next.js. The database is
> PostgreSQL through Supabase, the interface is Tailwind CSS, it's deployed on
> Vercel, and the career coach runs on Anthropic's Claude API.

**[0:34–0:58] SCREEN: onboarding — age, then school end time, then transport**
Pause on the school-time and transport screens.

> **NAYAN:** It starts with questions no other job site asks. How old are you.
> What time does school let out. How do you actually get around. That last one
> sets how far a job can be before it stops being realistic. If you walk, that's
> one mile. A bike is three. A car is twenty-five.

**[0:58–1:24] SCREEN: the feed scrolling, then one card expanded to "How it fits you"**
Stop scrolling while the breakdown is on screen.

> **MIA:** Here's the feed. Every card tells you why it matched, not just that
> it did. Your schedule, the distance, your interests, how fast that employer
> hires. Age isn't part of the score at all. It's a hard legal filter applied
> first, so a fifteen-year-old never even sees an eighteen-plus job.

**[1:24–1:56] SCREEN: tap Apply → the employer's real page loads. Let it finish.**
**Do not cut or speed this up. The whole video is this shot.**

> **NAYAN:** Tap apply, and you go straight to the employer's own application.
> Not a middleman, not a careers homepage. Every one of these links gets
> verified before the listing goes live, and re-checked every single night. If a
> link dies, the listing disappears. Sending a teenager to a dead link is how
> they decide the whole search is pointless.

**[1:56–2:16] SCREEN: Explore tab, scroll the programs**

> **MIA:** Fourteen and fifteen year olds mostly can't legally work yet. So they
> get this instead. Competitions, programs, volunteering, each one picked
> because finishing it leaves you something real.

**[2:16–2:45] SCREEN: the reference / vouch card**

> **NAYAN:** Like this. You send your supervisor one link, they confirm it, and
> it becomes the one part of your profile that somebody other than you vouched
> for. Nobody hires a sixteen-year-old because of their resume. They hire
> because an adult said they were worth it. That's what we built.

---

### Silent recording checklist, in order

Record these as separate clips. Three takes each.

| # | Clip | Length | Note |
|---|---|---|---|
| 1 | Landing page, slow scroll | 35s | Covers the intro and the tools section |
| 2 | Onboarding: age → school time → transport | 25s | Pause 1s on each |
| 3 | Feed scroll, then expand one card | 28s | Hold still on the fit breakdown |
| 4 | Tap Apply, employer page loads fully | 35s | **Longest take. Do not trim.** |
| 5 | Explore tab scroll | 22s | |
| 6 | Reference / vouch card | 30s | |

### Before you hit record

- [ ] Run the re-verification sweep in section 1, then update the number you say
- [ ] Set the demo profile to age 17
- [ ] Fix the reference reading "JEan Grey," or do not show that screen
- [ ] Do **not** tap the **Near me** chip, it reads 0
- [ ] Get Mia's last name into the intro line
- [ ] Do Not Disturb on, notifications off, battery above 50%
- [ ] Record the **phone** screen. At laptop width the app is a narrow column in
      a lot of white space and it looks unfinished

### After you record

- [ ] Total runtime is between **1:00 and 3:00**
- [ ] Upload to YouTube or Vimeo
- [ ] **Set visibility to PUBLIC.** Not unlisted. This is an explicit rule
- [ ] Open the link in a private window to confirm it plays without signing in

### Things that will cost you points

- **Music under the voiceover.** Intro and outro only, if at all.
- **Fast scrolling.** If a viewer cannot read a card, it may as well not be there.
- **Trimming the Apply shot.** Those three seconds of a real employer page
  loading are the only proof you have that the listings are real.
- **Saying numbers you did not check.** Pull the live figure right before you
  record.

---

## 6. "What did you learn while participating in the CAC? What was your biggest takeaway?"

This question is on the official list and is easy to answer badly. Do not write
"I learned a lot about coding."

```
The biggest thing we learned is that a bug that crashes is a gift, and a bug
that returns success is the dangerous one.

Our job link checker passed every test we had while quietly marking filled
positions as healthy. Nothing errored. Nothing turned red. A teenager tapping
one of those listings just landed on a page saying the role was gone, and we
had no way of knowing. We only found it by opening our own app and clicking
through listings like a user instead of like the people who built it.

That changed how we work. We stopped asking "does the code run" and started
asking "is what the screen says actually true." When we audited the whole app
against that question we found more: listings claiming to be in Jersey City
that were really in Newark, Camden, and one in Ontario, Canada. An age label
that said "by law" about a number that had nothing to do with the law. A
homepage counter that disagreed with the app by a factor of ten. Every one of
those shipped with tests passing.

The second thing we learned is that the hard part of this problem was never
technical. We can filter a database in milliseconds. Getting a fourteen-year-old
in front of an employer who will actually consider them is a people problem, and
no amount of code solves it on its own.
```
