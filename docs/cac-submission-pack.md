# Congressional App Challenge — submission pack

Everything for the form plus the video, in the order the form asks for it.

> **DEADLINE: 12:00 PM EDT, Monday 26 October 2026.** Checked against the
> official 2026 CAC rules PDF. After the submission period closes the entry
> cannot be modified in any way.

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

---

## 2. "Please briefly describe what your app does"

Answers the question in the first sentence. "Briefly" is an instruction, so
using all 400 words here reads as not being able to edit. 178 words.

```
EmployTeens is a job search app for 14 to 18 year olds in New York and New
Jersey. A teen builds a profile, and the app shows them real openings they can
actually get.

Three things it does that a normal job site does not.

It matches on a teenager's constraints. Your age, what time school ends, and
how you get around all change the results. How you travel sets your radius:
walking is one mile, a bike is three, a car is twenty-five. Every card shows
why it matched.

It checks that jobs are real. Every application link is verified before it
goes live and re-checked nightly. Anything that dies, redirects to a homepage,
or says "no longer accepting applications" is removed. There are currently 335
verified openings at employers like Wegmans, Insomnia Cookies, and the City of
New York.

It never shows a job you are too young to hold. Age is a hard legal filter, not
a preference, so a 15-year-old never sees an 18+ posting. For teens too young
to work at all, the app carries competitions, programs, and volunteering that
build a track record instead.
```

> **Numbers verified live 24 Oct, 10:40pm ET:** 335 verified openings, 156
> link-checked that day, 148 of them paid. Re-check right before you submit.

### Shorter alternative, 94 words

```
EmployTeens is a job search app for 14 to 18 year olds in New York and New
Jersey. It matches teens to real openings using the things that actually
decide whether a teenager can take a job: their legal working age, what time
school ends, and how far they can travel without a car. Every application link
is verified before it goes live and re-checked nightly, so nobody gets sent to
a dead posting. For teens too young to work yet, it carries competitions and
volunteering that build a track record instead.
```

---

## 3. "What inspired you to create this app?"

Nayan's story, first person on purpose. **Read the second paragraph and change
anything that did not actually happen to you.** Do not submit a detail you
cannot stand behind.

```
I wanted my own money at fourteen. Not an allowance. Money I earned.

So I started applying, and I kept hitting the same wall in different shapes.
Listings that said "no experience necessary" and then wanted eighteen. "Now
hiring" links that went to a corporate careers page with nothing behind it for
someone my age. Forms that let me fill out everything before telling me I was
too young. Nobody ever says a fourteen-year-old cannot apply. They just build
every door slightly too high and let you work it out yourself.

I eventually got hired as a busser at Harry's Daughter, a restaurant in Jersey
City. Not through any job site. Through an application I put together myself
and handed to a person. That one job turned into more than a job. I ended up
building their website and running their marketing, at fourteen, because
somebody in a small business was willing to see what I could do.

That is the whole idea behind EmployTeens. The hard part was never the work. It
was getting one adult to give me a first chance, and getting to a door that was
actually open.

When we built the database, we checked: of 335 real job listings in our own
system, not one is open to a fourteen-year-old. The youngest is fifteen. I was
not failing that search. There was nothing in it for me.

So the app does two things I needed and did not have. It never shows you a job
you are not legally old enough to hold, and it gives younger teens somewhere to
start building a record before anyone can hire them. It also pushes local small
businesses up the list, because mine was the one that said yes.
```

---

## 4. "What technical difficulties did you face programming your app?"

The official rules word this as "what technical/coding difficulty did you face,
**and how did you address this technical challenge?**" Both versions answer the
second half, do not cut it.

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

## 5. "What improvements would you make for a 2.0 version?"

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

## 6. "What did you learn while participating in the CAC? What was your biggest takeaway?"

On the official question list. Easy to answer badly. Do not write "I learned a
lot about coding."

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

---

## 7. "Did you use AI in the creation, development, or functionality of your app?"

The rules permit AI "provided that all AI usage is fully disclosed" and say it
"must not constitute the entirety of the technical development." Separate the
two uses. Judges respect disclosure and penalize vagueness.

```
Yes, in two different ways.

Inside the app, we use Anthropic's Claude API for two features, with Groq as a
fallback provider if Anthropic is unavailable. The first is the career coach,
where a teen can ask questions about working papers, what to say in an
interview, or what to do next, and get an answer grounded in their own profile
and the listings they have saved. The second is match explanations, the short
"how this fits you" text on each card. If both providers fail, the coach falls
back to written answers we wrote ourselves rather than showing an error. All
three paths are constrained to facts the app already holds. The model is never the source of a job, a pay rate, an
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

## 8. Checkbox questions

### "Which programming language(s) did you use?"

Check **JavaScript** and **Other**.

In the Other box write: `TypeScript (primary), SQL (PostgreSQL)`

TypeScript is not on their list, so JavaScript is the honest closest match and
the write-in names it properly. A technical judge reads TypeScript as a
stronger signal.

Your actual code, excluding dependencies:

| | Files | Lines |
|---|---|---|
| TypeScript (.ts + .tsx) | 138 | 25,494 |
| SQL (schema + migrations) | 23 | 1,546 |
| CSS | 1 | 634 |
| Python | 1 | 56 |

**Do not check Swift or Objective-C.** The 49 lines of `AppDelegate.swift` were
generated by Capacitor. If a judge asks what Swift you wrote, there is nothing
to show, and the rules let them request source code access.

**Python is your call.** One 56-line icon-generation script. It is a build tool,
not the app. Leaving it unchecked is cleaner.

### "Which platform(s) did you code your app for?"

Web app, and an installable PWA (`public/manifest.json` and `public/sw.js`
exist). Only check iOS if you have actually built and run the Capacitor app on
a device or simulator. Having `@capacitor/ios` as a dependency is not the same
as shipping it.

---

## 9. Demo video — voiceover script

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

### Use the Insomnia Cookies card for the Apply shot

Verified end-to-end on 24 Oct. It is the second card on Explore and the best
demo in the database:

- Recognisable brand, real logo, "Hires fast" badge
- Card reads: **Shift Leader · Insomnia Cookies · New York NY (Morningside Heights)**
- Tapping Apply lands on `jobs.lever.co/insomniacookies/...` which reads
  **Shift Leader · New York NY (Morningside Heights) · Part Time · On-Site**
  with a live APPLY FOR THIS JOB button and the street address

Title and location match line for line. That is the whole product proven in one
tap.

**Apply opens a new tab.** On iPhone the screen switches tabs. That looks good
on camera, the handoff is unmistakable. Do not be thrown by it mid-take.

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

