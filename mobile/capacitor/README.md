---
title: OISY Capacitor app
tags: [mobile, capacitor, ios, development]
---

# OISY Capacitor app

The only active mobile project, consolidated on 2026-10-27. Signed-in launch opens
the real shared OISY web wallet. There is no native-wallet mode or sample balance
screen. Native iOS code owns navigation, system-browser sign-in, Keychain and an
isolated **Explore** section for connecting apps. Wallet, Activity and Explore float
over the web content; the separate More button opens Notes, Earn, Borrow and Search.
Notes is a shared web page. Blocking web sheets hide the native controls until
closed; editing a note uses the same web editor in a full-screen mobile frame.
Read AGENTS.md before changes.

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

The native SDK, generated balance bindings, custom Swift token/transaction/import
screens, sample portfolio and old app target were deleted. `mobile/ios-native/`
contains historical documentation only. Native resources now belong to this folder.

## Welcome screens

Signed-out entry is a full-screen native welcome with the OISY mark and an Explore
shortcut. First-time installations and explicit logout show “Your Digital Assets
Private and Secure” and “Open or create”. Session expiry shows a softly blurred
wallet illustration, “Welcome back!” and “Open Wallet”. Both buttons open the existing system-browser
Internet Identity flow. Native tabs/More stay hidden only while welcome is visible;
Explore and the authenticated wallet retain the normal navigation.

A cosmetic UserDefaults boolean selects returning presentation after successful
sign-in or restoration of a saved session, including expiry migration. Expiry
retains it; explicit logout clears it. Both outcomes survive app relaunch and use
the same Keychain/session cleanup. It contains no account data and never
authenticates the user. The historical `.hasSignedIn` preference key is retained
for installed previews; the observable property is `showsWelcomeBack`.

The backgrounds are bundled images generated with the built-in image generation
tool from the user's OISY brand reference. Native text/buttons remain sharp,
localized and accessible. Artwork makes one subtle settling movement and responds
to device tilt with UIKit motion effects (up to 12 pt horizontally and 16 pt
vertically). Extra artwork covers the edges; text, buttons and contrast overlays
stay fixed. Reduce Motion disables both animations. Tilt effects are removed while
the scene is inactive, system sign-in is open, after authentication, and when the
artwork leaves the window. Native UIWindowScene activation owns this lifecycle
inside the UIKit shell. No raw motion data is collected. Large text can scroll
without losing the CTA. Light and
dark appearances share the art with an appropriate contrast layer. Exact prompts
and asset locations are recorded in [Artwork provenance](./docs/welcome-artwork.json).

## Authentication review

The review entry point compares the retained adapter with the exact Swift SDK,
records fixes, and identifies decisions for Internet Identity reviewers.
Source: [Authentication and Explore review](./docs/authentication-review.md)

## Session and isolation

The existing Internet Identity relay, URL scheme and Keychain service are retained.
The parent key stays native; the trusted wallet generates an in-memory child key
and receives a bounded delegation. The existing AuthClientProvider, auth store,
normal loaders and workers now use that session. Each worker generates its own
key and obtains a bounded delegation through a private MessagePort. Browser builds
retain their existing AuthClient/IDB flow. See [Session boundary](./docs/session-boundary.md).

A five-minute child or parent expiry logs out, clears Keychain and closes the wallet
and Explore grants. Foreground and bridge-entry checks use the native deadline.
Automatic renewal remains pending. Unavailable API data stays unavailable, not zero.

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

An unsigned-in simulator shows Internet Identity entry and Explore. Automated tests
use isolated signed fixtures and block network calls; there is no user-facing sample
mode. Physical sign-in still requires the user's passkey interaction.

`build-mobile/` and `.svelte-kit-mobile/` remain isolated from the website build.
`mobile-build.json` records source revision, dirty state, contract and audit mode.
The packaged CSP permits the normal HTTPS/WSS data endpoints while keeping scripts local. Publishing
`audit.oisy.com` does not update installed interface assets.

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

Automatic child renewal, Android, II review of the delegation trust model and remaining release gates.
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
