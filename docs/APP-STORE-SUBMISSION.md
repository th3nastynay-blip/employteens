# App Store submission pack — EmployTeens

Written 10 Aug 2026 against Apple's live [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), quoted directly rather than paraphrased from blogs. Re-read the source before submitting; Apple edits this page without announcement.

The three guideline numbers that dominate real rejection letters are **2.1** (completeness), **4.3** (spam) and **5.1.1** (data collection). For this app specifically, the dangerous ones are 5.1.2(i) and 5.1.4.

---

## 1. Blockers, in the order they'd sink you

### 5.1.2(i) — third-party AI consent

Apple's exact words:

> You must clearly disclose where personal data will be shared with third parties, **including with third-party AI**, and obtain explicit permission before doing so.

The coach sends a minor's first name, age, grade, state, ZIP, availability, transport, skills, interests and application history to `api.groq.com`. Until this session there was no consent step anywhere, which is a direct violation and trivially discoverable — a reviewer opens the coach and watches the network request.

**Now handled by:** `components/coach/AIConsent.tsx` (names the provider, itemises the fields, decline is a real path), enforced server-side in `app/api/career-ai/route.ts`, recorded in `users.ai_consent_at`.

**You must still:** run `supabase/migrations/add_ai_consent.sql`. Until you do, the server-side check fails closed and the coach refuses everyone. That is the correct failure direction, but it does mean the feature is off until the migration runs.

**Reviewer note to include:** say plainly that the app calls a third-party AI provider, that consent is collected on first use, and that declining leaves the rest of the app fully functional.

### 5.1.4 — minors

> apps ... that collect, transmit, or have the capability to share personal information (e.g. name, address, email, location, photos, videos, drawings, the ability to chat, other personal data, or persistent identifiers used in combination with any of the above) from a minor must include a privacy policy and must comply with all applicable children's privacy statutes.

You collect name, email, ZIP, school and free-text chat from 14-to-19-year-olds. All of it applies.

Also from 5.1.4(a):

> Apps intended primarily for kids should not include third-party analytics or third-party advertising.

You have neither. `app/api/analytics/route.ts` writes to your own Supabase table, and there is no ad SDK. **Say this explicitly in the review notes** — it is a strong point and reviewers do not assume it.

**Do not** use "kids", "children", or anything implying a child audience in the app name, subtitle, icon, screenshots or description. Guideline 2.3.8 reserves that language for the Kids Category, which you are not in and should not join (it forbids the external links your app depends on). "Teens" is fine.

### Age rating questionnaire

Apple replaced the age-rating system in 2025 with 13+/16+/18+ tiers, and the deadline to complete the new questionnaire passed on **31 January 2026**. Apps that have not completed it are blocked from new submissions. Do this first, before anything else in App Store Connect.

Expect this app to land at 13+ or 16+. Answer the AI-chat and unrestricted-web-access questions honestly — an inaccurate age rating is its own rejection and a nasty one, because it usually arrives after everything else has passed.

### 1.5 — support URL

A broken or placeholder support URL is one of the three most common rejections and one of the easiest to avoid. `/support` must load, must be publicly reachable without logging in, and must show a real contact method.

---

## 2. Likely to come up

### 4.2 — minimum functionality

A job app that is mostly a list of external links can be read as a repackaged website. Your defences, worth stating in the review notes: on-device matching against a profile, the vouch/reference flow, the resume builder, the ladder, and the AI coach. Point at features, not screens.

### 1.2 — user-generated content

Probably does not apply: there is no user-to-user content, no profiles visible to other users, no comments. Do not volunteer moderation tooling you do not have.

But be ready for the adjacent question about **AI output shown to minors**. Have an answer: the system prompt constrains scope to teen employment, it is forbidden from producing personalised admission probabilities, it refuses to fabricate experience, and it directs anything consequential to a trusted adult. If a reviewer pushes for a report mechanism on AI replies, that is a small build — say yes rather than arguing.

### 5.1.1(v) — account deletion

Required, and you have it: Profile → Account → Delete account, calling `auth.admin.deleteUser`, which cascades to every table. **Put the exact tap path in the review notes.** Reviewers frequently reject for "no account deletion" when it exists but they could not find it.

### 4.8 — Sign in with Apple

Applies only if you offer third-party social login (Google, Facebook). Email/password alone does not trigger it. If you ever add Google sign-in, Sign in with Apple becomes mandatory in the same release.

---

## 3. App Privacy questionnaire (the nutrition label)

This is the "other thing". It is filled in App Store Connect, not in code, and it must match both the privacy policy and the actual network traffic. Mismatches here are the single most common privacy rejection.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App functionality (login) |
| Name | Yes | Yes | No | App functionality |
| Coarse location (ZIP only) | Yes | Yes | No | App functionality (distance) |
| Sensitive info — age of a minor | Yes | Yes | No | App functionality (legal eligibility) |
| Phone number | Yes (resume, optional) | Yes | No | App functionality |
| User content — other | Yes (chats, resume) | Yes | No | App functionality |
| Product interaction | Yes | Yes | No | Analytics (first-party only) |
| Identifiers — user ID | Yes | Yes | No | App functionality |
| Contacts, photos, precise location, health, financial, browsing history | **No** | — | — | — |

**Tracking: answer No to everything.** You do not share data with data brokers and you run no ad network, so App Tracking Transparency is not triggered.

Do not tick "Advertising" or "Third-party advertising" anywhere. It is not true and it would drag Kids-Category rules onto you.

---

## 4. Before you hit submit

- [ ] Run `add_ai_consent.sql`, then confirm the consent screen appears for a fresh account and that declining leaves the feed, Explore, profile and resume working.
- [ ] Complete the new age-rating questionnaire.
- [ ] `/privacy`, `/terms` and `/support` all load logged-out on the production domain.
- [ ] App Privacy answers match the table above and the privacy policy.
- [ ] Demo account in review notes, with a profile already populated — a reviewer who lands in an empty feed files 2.1.
- [ ] Screenshots show real UI, no placeholder text, no invented statistics.
- [ ] No user counts, ratings or testimonials anywhere in metadata unless they are true.
- [ ] Rotate `CRON_SECRET` and revoke the GitHub PAT in `.git/config`. Not an Apple issue, a you issue.

**Review notes template:**

> EmployTeens helps 14-to-19-year-olds in NJ/NY find part-time work that is legal for their age and fits their school schedule.
>
> Demo account: [email] / [password] — profile is pre-filled so the job feed is populated.
>
> Account deletion: Profile tab → Account → Delete account. Immediate and permanent.
>
> Third-party AI: the AI Coach sends the user's message and limited profile fields to Groq, Inc. Consent is requested on first use with the provider named and the fields itemised; declining leaves every other feature fully functional. Details at /privacy.
>
> This app contains no third-party analytics, no advertising SDKs, and no user-to-user content.

---

## 5. What I am not

Not a lawyer. This is a careful reading of Apple's published rules plus what the code actually does. The privacy policy and terms are specific and honest, which is most of the battle, but minors' data sits under COPPA-adjacent state law that varies and changes. Before you take real users, have someone who practises this read both documents. A school legal clinic or a startup lawyer's free consult is usually enough at your stage.
