# App Store Launch Plan — submit by Friday, July 17

Goal: first iOS submission Friday. Honest odds with this plan fully executed: better-than-even first-pass approval; if rejected (most likely Guideline 4.2), fix-and-resubmit inside 2-4 days.

## Architecture decision

Capacitor shell around the production web app + native capabilities. Apple rejects bare website wrappers (Guideline 4.2 "minimum functionality"), so the shell ships with real native features: push notifications for new job matches, native splash/icon, haptics, safe-area/status-bar integration. This is the standard, proven path for web-first products.

## Hard blockers found in the code audit (all fixable)

| Gap | Apple rule | Fix |
|---|---|---|
| No in-app account deletion | 5.1.1(v) — automatic rejection | Delete-account API (service role, cascades via existing FKs) + Profile UI with confirmation |
| No privacy policy | 5.1.1 — required URL, extra scrutiny for minors' data | Real policy: what we collect (email, name, age, ZIP, availability), why, retention, deletion, no ads/tracking/sale. Ages 14+ only. |
| No terms of service | Listing requirement | ToS page |
| No support contact | Listing requirement | /support page + email |
| Google OAuth wired in login | 4.8 — third-party login requires Sign in with Apple | Hide OAuth buttons for v1; email-only auth sidesteps the rule. Re-add Google + Apple together post-launch. |
| No push / native features | 4.2 — minimum functionality | OneSignal push: "N new verified jobs match you" wired to the daily feed cron |

Not gaps: job inventory (514 verified is a real product), features (freeze; new code this week = new rejection risk), tracking/ads (we have none → no ATT prompt, clean privacy labels).

## Day-by-day

**Monday — compliance code (Claude)**
Privacy policy, ToS, support pages; account-deletion API + profile UI; hide OAuth buttons; 14+ age validation hardening in signup.
**YOU, today, non-negotiable:** start Apple Developer enrollment at developer.apple.com — INDIVIDUAL type ($99/yr, 1-2 day verification; company/LLC needs D-U-N-S = up to a week you don't have). Start the Xcode download tonight (~15 GB).

**Tuesday — the shell (Claude)**
Capacitor iOS project committed to the repo, pointed at production; status bar, safe areas, keyboard behavior polished for WebView; splash screen.
**YOU: logo delivered by Tuesday night** — one 1024×1024 PNG on a solid background is all I need; I generate the full icon ladder and splash set from it. (Fallback if you slip: the existing bolt mark, swappable later via update.)

**Wednesday — native features (Claude + you)**
OneSignal integration (free tier): device registration in the shell, daily "new matches" push from the existing generate-feed cron. Haptic feedback on save/apply. Pull-to-refresh.
**YOU:** OneSignal account (5 min), and APNs key setup in the Apple portal once enrollment clears — I'll give exact click-by-click steps.

**Thursday — build + listing (you drive, I script everything)**
TestFlight build from Xcode on your Mac (signing needs your logged-in account — I prep the project so it's open-Xcode-press-archive). App Store Connect listing: description, keywords, screenshots (I produce the required sizes), privacy nutrition labels (documented for you), age rating questionnaire (12+ expected; NOT Kids Category — never designate that), demo reviewer account seeded with a 16-year-old Jersey City profile and live matches.

**Friday — submit**
Reviewer notes (demo login, what the app is, native capabilities list, teen-safety posture: verified employers only, no chat between users, no tracking). Submit. Typical review: 24-72h.

## Risk register — ranked

1. **Apple enrollment delay** (out of our control) — the reason it starts TODAY. If verification stalls past Wednesday, Friday slips; nothing else on the list can absorb that.
2. **Guideline 4.2 rejection** — mitigated by push + native touches; if it happens anyway, the fix cycle is adding one more native surface (e.g., native tab bar or widget) and resubmitting. Days, not weeks.
3. **Minors' data scrutiny** — mitigated by honest privacy policy, 14+ floor, zero tracking SDKs, account deletion, and reviewer notes that lead with safety.
4. **WebView jank on device** — Thursday TestFlight run on your actual phone; fix list same day.

## Post-approval week-2 list (do NOT do this week)
Sign in with Apple + restore Google OAuth · push preferences UI · App Store optimization pass · Play Store (one afternoon once iOS ships).
