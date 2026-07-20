# Xcode Handoff — build & TestFlight in ~15 minutes

Prereq: Apple Developer enrollment APPROVED (you'll get an email).

## One-time setup
1. Pull latest: the repo now contains `ios/` — the native app.
2. In Xcode: **Open Existing Project…** → `EMPLOYTEENS FINAL/ios/App/App.xcodeproj`
3. First open: Xcode resolves Swift packages automatically (progress bar top). Wait for it.
4. Click the blue **App** project icon (left sidebar) → **Signing & Capabilities** tab:
   - Check **Automatically manage signing**
   - **Team**: select your name (appears once enrollment is approved and you're
     signed into Xcode: Settings → Accounts → + → your Apple ID)
   - Bundle Identifier should read `com.employteens.app`
5. Top bar device selector → **Any iOS Device (arm64)**

## Test on your own iPhone first (optional but smart)
Plug in your iPhone → select it in the device bar → press ▶. The app installs
and runs on your phone directly.

## Archive & upload (the real thing)
1. Menu: **Product → Archive** (takes a few minutes)
2. Organizer window opens → **Distribute App** → **App Store Connect** → Upload
   → accept defaults → Upload.
3. Done. The build appears in App Store Connect → TestFlight in ~15–30 min
   (Apple processes it), then we attach it to the listing and submit.

## If anything errs
Screenshot the error and send it — signing issues are 90% "Team not selected"
or "not signed into Xcode with the enrolled Apple ID."
