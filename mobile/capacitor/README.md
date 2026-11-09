---
title: OISY mobile app
tags: [mobile, capacitor, ios, development]
---

# OISY mobile app

This is the only active mobile app as of 2026-10-27. After sign-in, it opens the
shared OISY web wallet at the configured audit HTTPS origin. Native iOS code handles navigation, system-browser sign-in,
Keychain and Explore, the isolated browser for connecting apps.

Wallet, Activity and Explore tabs float over the web content. A separate More
button opens Notes, Earn, Borrow and Search. Web dialogs hide the native controls
until closed. Notes uses a shared web page and a full-screen mobile editor.
Read AGENTS.md before making changes.

## Live-website migration prototype

The [November migration spec](../../docs/ai/spec-driven-development/specs/2026-11-05-feat-mobile-live-web-sdk-auth.md)
targets the deployed website with SDK-derived authentication. Implementation is
authorized. SDK authentication is integrated; the user confirmed ICP account
continuity on 2026-11-06. The controller now loads the live website. Its runtime
adapter must be deployed to audit before installing this version on the phone.
Local verification and remaining acceptance checks are recorded in the spec.

Pinned sources, local verification and audit deployment instructions live with
the prototype.
Source: [SDK authentication handoff prototype](./auth-handoff/README.md)

## SDK integration in this app

Build setup, compatibility boundary and acceptance status for the actual app.
Source: [SDK app integration](./docs/sdk-app-integration.md)

## Ownership

| Area                                                                    | Owner                                                                                         |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Wallet, token details, Activity, Search, Receive, Contacts, preferences | Normal `src/frontend/src/routes/(app)/` pages and existing components                         |
| Data and authentication                                                 | Normal Loaders/stores/schedulers; shared AuthClientProvider with an in-memory mobile identity |
| Typed host transport                                                    | `lib/providers/mobile-host.providers.ts`, `LiveWalletBridge.swift`, contract v2               |
| Native tabs and account controls                                        | `ios/App/App/ShellViewController.swift`, `AccountView.swift`                                  |
| Internet Identity / session                                             | `ios/App/App/Auth/`, `Wallet/WalletSession.swift`                                             |
| Uniswap / 1inch, EIP-1193/6963 discovery and consent                    | `ios/App/App/Explore/`, isolated WebKit/provider                                              |
| Frontend delivery                                                       | Exact configured HTTPS origin in a nonpersistent WKWebView                                    |

The separate Swift wallet, native balance bindings, custom screens, sample
portfolio and old app target were removed. This shell uses the SDK only for auth. `mobile/ios-native/` contains
historical documentation; all active native resources live here.

## Feature coverage and navigation

The source inventory distinguishes shared screens, blocked routes and platform
adaptations, and proposes delivery stages and Back/swipe behavior.
Source: [Feature coverage and navigation plan](./docs/feature-parity.md)

## Shared web compatibility

Ownership, route/bridge invariants and change-specific checks for agents editing
the website or native host. CI gaps and proposed enforcement are explicit.
Source: [Shared web and mobile compatibility](./docs/shared-web-contract.md)

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

The app now uses the pinned native SDK, an associated HTTPS callback, and SDK
Apple storage. It preserves the existing app ID, welcome preference and operation
journal. A new sign-in is required; legacy credentials are removed only after
successful replacement or explicit logout.

The trusted wallet receives an II-scoped session grant for a fresh in-memory key.
The mobile SDK adapter obtains an app delegation for the same audit principal.
Workers use independent keys and app delegations. Browser sign-in keeps its current
AuthClient/IDB implementation. See [Session boundary](./docs/session-boundary.md).

The original one-hour deadline survives reload and relaunch. SDK app credentials
can rotate inside that hour; the II session itself is not extended. Logout hides
the wallet immediately and saves a local tombstone before attempting SDK revocation.
Expiry shows “Welcome back!”; explicit logout shows the introduction.
Missing API data
must be shown as unavailable rather than zero.

Only the configured HTTPS main wallet document may use the fixed v2 bridge.
The live controller registers no general-purpose Capacitor plugins. Wallet and
Explore each use nonpersistent, separate WebKit storage. Explore exposes a public
account only after origin-specific native consent; it supports Sepolia reads only.
The shared Send flow supports ICP, canonical ck-tokens, ETH and ERC-20 transfers.
Same-chain ICP/ck swaps use the existing ICPSwap flow, with wallet-bound operation
records and explicit recovery of available pool balances. Buy, other-chain sends,
ck withdrawals and contact editing remain unavailable. Explore cannot sign or
broadcast. See [Send scope](./docs/shared-web-contract.md#shared-send),
[Swap scope](./docs/shared-web-contract.md#icp-and-ck-token-swap) and
[recovery limitations](./docs/shared-web-contract.md#durable-mobile-operation-records).

## Build and run

The app uses the deployed website's client API configuration and audit HTTPS
origin. Keep provider keys in ignored config or deployment secrets. Never commit
values or generated bundles. Verify provider allowlists for the audit domain;
do not spoof origins or add a generic native HTTP proxy.

Build and deploy the normal audit website with the runtime host adapter first.
Leave `VITE_MOBILE_SHELL` unset/false; the document-start native transport selects
mobile presentation and authentication. New website releases reach the app on its
next document load. The host does not force reloads during an operation.

From the repository root:

```sh
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
node mobile/capacitor/prepare-native-sdk.mjs
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

`build-mobile/` and `.svelte-kit-mobile/` are retained for offline shared-screen
tests and legacy packaging tools. The production app target does not package
their pages. The website deployment owns CSP, feature code and provider settings;
native origin/callback configuration still requires an app release.

Device and simulator IDs now come from the public `app-environment.json` through
generated build settings. Device builds preserve the installed preview ID and team;
simulators keep `org.dfinity.oisy.capacitor.preview`. Build preflight rejects a
mismatched identity. Follow [SDK app integration](./docs/sdk-app-integration.md#build)
for device signing, association checks and cache provenance. Do not uninstall the
existing preview or change its storage namespaces to resolve a build failure.

## Build ownership

`ios/App/project.yml` owns the Xcode project. The existing Capacitor 8.5.3 package
scaffold remains for separate cleanup; the active wallet controller uses WKWebView
directly. `mobile:sync:ios` updates that scaffold and generates the native project,
without building or copying web pages. Do not patch
generated projects or dependencies. Swift 6 complete checking is enabled. Android
SDK/JDK and an Android host remain pending.

## Remaining shared-runtime work

The session guide records the fixed one-hour session without renewal,
Android support and the authentication and release checks still needed.
Source: [Session boundary](./docs/session-boundary.md)

## Verification

Run the native suite, frontend service tests and Svelte checks, one heavy job at a time.
The migration handoff records actual results and remaining physical-device checks.
`WalletWebKitTests` uses an isolated fake identity and rejects network calls. Build
with `VITE_MOBILE_UI_TEST=true` for its Notes and navigation fixtures. They seed
shared in-memory profile/balance/Notes stores while main-frame and worker fetches
remain pending. They never weaken signed canister-response verification and are
compiled out of normal website builds. Test resources are packaged only in
AppTests.xctest; the app target excludes `public/`. Check that deployed website
assets exclude fixture events. The screenshots show fixture
data, not a funded-account test.

```sh
npm exec -- vitest run src/frontend/src/tests/mobile-build-env.spec.ts
npm run check
npm exec -- vitest run src/frontend/src/tests/lib/services/mobile-host.services.spec.ts \
  src/frontend/src/tests/lib/services/mobile-session.services.spec.ts \
  src/frontend/src/tests/lib/services/mobile-worker-session.services.spec.ts \
  src/frontend/src/tests/lib/utils/mobile-history.utils.spec.ts \
  src/frontend/src/tests/lib/components/ui/ModalExitHandler.spec.ts \
  src/frontend/src/tests/routes/layout.spec.ts
DFX_NETWORK=audit OISY_MOBILE_SHELL=1 VITE_MOBILE_SHELL=false VITE_MOBILE_UI_TEST=true npm exec -- vite build
rsync -a --delete build-mobile/ mobile/capacitor/ios/App/App/public/
npm --prefix mobile/capacitor run project:ios
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
