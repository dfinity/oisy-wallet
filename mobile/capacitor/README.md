---
title: OISY Capacitor app
tags: [mobile, capacitor, ios, development]
---

# OISY Capacitor app

This is the only active mobile app as of 2026-10-27. After sign-in, it opens the
shared OISY web wallet. Native iOS code handles navigation, system-browser sign-in,
Keychain and Explore, the isolated browser for connecting apps.

Wallet, Activity and Explore tabs float over the web content. A separate More
button opens Notes, Earn, Borrow and Search. Web dialogs hide the native controls
until closed. Notes uses a shared web page and a full-screen mobile editor.
Read AGENTS.md before making changes.

## Ownership

| Area                                                                    | Owner                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Wallet, token details, Activity, Search, Receive, Contacts, preferences | Normal `src/frontend/src/routes/(app)/` pages and existing components                         |
| Data and authentication                                                 | Normal Loaders/stores/schedulers; shared AuthClientProvider with an in-memory mobile identity |
| Typed Capacitor transport                                               | `lib/services/mobile-host.services.ts`, contract v2                                           |
| Native tabs and account controls                                        | `ios/App/App/ShellViewController.swift`, `AccountView.swift`                                  |
| Internet Identity / session                                             | `ios/App/App/Auth/`, `Wallet/WalletSession.swift`                                             |
| Uniswap / 1inch, EIP-1193/6963 discovery and consent                    | `ios/App/App/Explore/`, isolated WebKit/provider                                              |
| Static frontend delivery                                                | Capacitor 8.5.3, packaged local assets, no loopback server                                    |

The separate Swift wallet, its native SDK and balance bindings, custom screens,
sample portfolio and old app target were removed. `mobile/ios-native/` contains
historical documentation; all active native resources live here.

## Welcome screens

Signed-out users see a full-screen native welcome with the OISY mark and an Explore
shortcut. First-time installations and explicit logout show “Your Digital Assets
Private and Secure” and “Open or create”. Session expiry shows a softly blurred
wallet illustration, “Welcome back!” and “Open Wallet”. Both buttons open Internet
Identity in the system browser.
The welcome screen hides tabs and More; Explore and the signed-in wallet show them.

A UserDefaults boolean selects the returning welcome after sign-in or restoration
of a saved session, including migration of an expired session. Expiry keeps it;
explicit logout clears it. The choice survives relaunch, and both paths use the
same Keychain and session cleanup. This preference contains no account data and
does not authenticate the user. Installed previews keep the `.hasSignedIn` storage
key; the observable property is `showsWelcomeBack`.

The bundled backgrounds were generated from the user's OISY brand reference.
Native text and buttons stay sharp, localized and accessible. Artwork moves once
on entry, then responds to device tilt through UIKit motion effects: up to 12 pt
horizontally and 16 pt vertically. Extra artwork covers the edges; text, buttons
and contrast overlays stay fixed.

Reduce Motion disables both effects. Tilt also stops while the scene is inactive,
during system sign-in, after authentication, and when the artwork leaves the
window. UIWindowScene activation controls this lifecycle; no raw motion data is
collected. Large text can scroll with the sign-in button still reachable. Light
and dark appearances use the same artwork with different contrast layers. Exact
prompts and asset locations are in [Artwork provenance](./docs/welcome-artwork.json).

## Authentication review

This guide compares the auth adapter with `dfinity/icp-native-sdk`, lists the
review fixes and sets out questions for the Internet Identity team.
Source: [Authentication and Explore review](./docs/authentication-review.md)

## Session and isolation

The app keeps the existing Internet Identity relay, URL scheme and Keychain service.
The parent key stays native. The trusted web wallet generates an in-memory child
key and receives a time-limited delegation. AuthClientProvider, the auth store,
loaders and workers use this session. Each worker has its own key and receives a
bounded delegation through a private MessagePort. Browser builds keep their
AuthClient/IDB flow. See [Session boundary](./docs/session-boundary.md).

The child expires after at most five minutes, or sooner if the parent expires.
Expiry signs out, clears Keychain, closes the wallet and revokes Explore grants.
Foreground and bridge-entry checks enforce the native deadline. Automatic renewal
is not implemented. Missing API data must be shown as unavailable rather than zero.

Only the exact local `capacitor://localhost` main wallet document may use the fixed
v2 bridge. General-purpose Capacitor HTTP/cookie plugins remain blocked. Wallet and
Explore each use nonpersistent, separate WebKit storage. Explore exposes a public
account only after origin-specific native consent; it supports Sepolia reads only.
Send, swap, buy, transaction signing/broadcast and contact editing remain unavailable.

## Build and run

The mobile audit bundle uses the same development environment resolution as
`vite.config.ts`. Configure `VITE_ETHERSCAN_API_KEY` in an ignored
`.env.development.local` at the **worktree root**, or in the build environment.
A local env file in another checkout is not automatically available here. Use an
approved client API key with access to the required networks; never commit its value.
`npm run build:mobile` checks for this key before building, because EVM transaction
history uses Etherscan even when balance loading succeeds independently. This check
validates presence only; network access, key validity and provider plan availability
still require an authorized runtime check. Rebuild/reinstall after configuration changes.

From the repository root:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
npm run mobile:sync:ios
xcodebuild -project mobile/capacitor/ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath /tmp/oisy-capacitor-build \
  CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= build
xcrun simctl install booted /tmp/oisy-capacitor-build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted org.dfinity.oisy.capacitor.preview
```

A signed-out simulator shows the welcome screen and Explore. Automated tests
use isolated signed fixtures and block network calls; there is no user-facing sample
mode. Physical sign-in still requires the user's passkey interaction.

`build-mobile/` and `.svelte-kit-mobile/` remain isolated from the website build.
`mobile-build.json` records source revision, dirty state, contract and audit mode.
The packaged CSP allows HTTPS/WSS data endpoints and local scripts, including
inline bootstrap code. Publishing `audit.oisy.com` does not update the installed UI.

For the existing physical preview, use the previously configured development team
and bundle identifier override; do not uninstall it or switch Keychain entitlements.
Those personal settings stay local. The generic simulator app identifier remains
`org.dfinity.oisy.capacitor.preview`; display name is OISY Preview.

## Build ownership

`ios/App/project.yml` owns the Xcode project; `cap sync` owns CapApp-SPM, config and
public assets. Root npm and SPM pin Capacitor 8.5.3. Swift 6 complete checking and the
existing experimental SPM tools 6.2 setting support the iOS 26 target. Do not patch
generated projects or dependencies. Android SDK/JDK and an Android host remain pending.

## Remaining shared-runtime work

The session guide tracks automatic child renewal, Android support and the
authentication and release checks still needed.
Source: [Session boundary](./docs/session-boundary.md)

## Verification

Run the native suite, frontend service tests and Svelte checks, one heavy job at a time.
The migration handoff records actual results and remaining physical-device checks.
`WalletWebKitTests` uses an isolated fake identity and rejects network calls. Build
with `VITE_MOBILE_UI_TEST=true` for its empty Notes cache fixture. The fixture uses
the shared store and never weakens signed canister-response verification. It is
compiled out of normal builds; always rebuild without this flag before phone
installation. The screenshots show fixture data, not a funded-account test.

```sh
npm exec -- vitest run src/frontend/src/tests/mobile-build-env.spec.ts
npm run check
npm exec -- vitest run src/frontend/src/tests/lib/services/mobile-host.services.spec.ts \
  src/frontend/src/tests/lib/services/mobile-session.services.spec.ts \
  src/frontend/src/tests/lib/services/mobile-worker-session.services.spec.ts
VITE_MOBILE_UI_TEST=true npm run mobile:sync:ios
xcodebuild -project mobile/capacitor/ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath /tmp/oisy-capacitor-build \
  CODE_SIGN_IDENTITY=- DEVELOPMENT_TEAM= test
```

## Dependencies

| Document                                                                                                             | Purpose                                            |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Migration spec](../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation.md) | Shared architecture and remaining acceptance gates |
| [Frontend guide](../../docs/ai/frontend/README.md)                                                                   | Shared feature conventions                         |

## Related

| Document                                                                                                                        | Purpose                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [Migration handoff](../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Current verification and next work       |
| [Archived native experiment](../ios-native/README.md)                                                                           | Retired prototype and local-only archive |
