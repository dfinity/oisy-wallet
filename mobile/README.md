# OISY Mobile Apps (POC)

Capacitor shell wrapping the OISY web app as native Android and iOS apps.

> **Proof of concept.** Not store-ready: custom URL scheme instead of verified
> app links, no signing, no biometric lock, session key in WebView storage.
> Spec: [`docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md`](../docs/ai/spec-driven-development/specs/2026-07-10-feat-mobile-app-poc.md).

## How login works (and why the wallet is the same as on the web)

Internet Identity derives the principal from the **origin** of the frontend
requesting the delegation. The app therefore never authenticates from the
WebView: it opens the system browser on `<canonical origin>/mobile-auth`,
which runs the normal II sign-in for an app-owned session key and returns the
delegation chain via the `oisy://auth-callback` deep link. Same origin ⇒ same
principal ⇒ same wallet. See `src/frontend/src/lib/services/auth-mobile.services.ts`
(app side) and `src/frontend/src/lib/services/auth-mobile-bridge.services.ts`
(bridge side).

## Build locally

Prerequisites: repo dependencies installed (`npm ci` at the root), plus
Android Studio / SDK for Android and Xcode + CocoaPods for iOS (macOS only).

```bash
# 1. Build the web app (repo root)
npm run build

# 2. Copy web assets + native config into the platform projects
npx cap sync android   # or: ios   (run from mobile/)

# 3a. Android — debug APK
cd mobile/android && ./gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk

# 3b. iOS — open in Xcode and run on a simulator/device
npx cap open ios       # from mobile/
```

CI builds the same artifacts via `.github/workflows/mobile-build.yml`
(manual `workflow_dispatch`, or automatically when `mobile/**` changes).

## Layout

| Path                  | What                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `capacitor.config.ts` | App id/name, `webDir` pointing at the root `build/` output       |
| `android/`            | Generated Android project (deep link registered in the manifest) |
| `ios/`                | Generated Xcode project (URL scheme registered in `Info.plist`)  |

The web assets under `android/app/src/main/assets/public` and
`ios/App/App/public` are build artifacts produced by `cap sync` and are not
committed.
