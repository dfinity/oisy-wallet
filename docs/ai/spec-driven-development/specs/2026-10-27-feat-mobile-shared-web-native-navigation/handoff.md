---
title: Mobile migration handoff
tags: [mobile, ios, android, capacitor, handoff]
---

# Mobile migration handoff

Updated 2026-10-27: the iOS Capacitor app now uses the normal Wallet, Token and
Activity routes with the shared auth provider, stores, loaders and workers.
The earlier component-snapshot preview and its separate data pipeline are removed.
Installed over OISY Preview and launched on the iPhone 14 Pro Max on 2026-10-27.
The first phone check reached token loading, then returned to login. After the
II-proof correction below, the user confirmed that ICP is correct and the wallet
stays open. The user then reported missing native tabs; that navigation correction
passed simulator tests and was installed at 13:07 local time. The user confirmed
that tabs are visible and both ICP detail and Activity open. Funded transaction
correctness and additional chains have not been accepted on this build.

The next navigation update floats Wallet, Activity and Explore over the full-height
WebView, with a separate OISY-mark More button. Its native popover opens the shared
Notes page, Earn and Borrow pages, plus Search. The floating-navigation update was installed at 13:27 local time. The subsequent
modal/Notes update passed simulator verification and was installed and launched
on the reconnected iPhone at 15:48; user acceptance of these latest screens is
still pending. Details are recorded in the follow-up below.

## Authentication and code review — 2026-10-27

The current review entry point is [Authentication and Explore review](../../../../../mobile/capacitor/docs/authentication-review.md).
It compares this implementation with `dfinity/icp-native-sdk` at
`cc22ba56b6cbab384fcef02c8e3c8624341cc30a`, maps the relevant sources and lists
questions for the II team. The active app does not link that Swift SDK.

Review fixes add maximum callback lifetime and repeated-key checks, preserve the
expiry-versus-explicit-logout welcome state, and close Explore and revoke stored
consent even if expiry occurs before account loading. Unused native translations,
debug configuration and an unused token-menu variant were removed. Historical
native media and machine-specific logs remain local and are excluded from commits.
The callback relay is a separate existing audit deployment dependency; its source
is absent from this branch. This is ready for design/security review only, not a
production approval. These review changes have not been installed on the phone.

### Review validation

- Full frontend run: 1,325 files and 26,696 tests passed; six app-layout tests failed
  because their page fixture omitted the URL now read by Notes routing. The fixture
  was corrected and all six tests passed on targeted rerun. One pre-existing skip
  and one todo remain. Logs: `/private/tmp/oisy-review-tests.log` and
  `/private/tmp/oisy-review-layout-final.log`.
- Final simulator suite: **43 tests passed** (41 native/WebKit integration tests,
  two UI tests), including delegation bounds, repeated keys, cold-expiry consent
  cleanup, actual shared worker/Notes routing and welcome accessibility.
  Result: `/private/tmp/oisy-review-native-final-20261027.xcresult`.
- Application and test type checks: zero errors/warnings. Full ESLint passes with
  zero warnings; Prettier, strict Swift formatting, i18n and lockfile checks pass.
- Normal website build, mobile build/Capacitor sync and final simulator app build
  pass. The normal mobile bundle was rebuilt with `VITE_MOBILE_UI_TEST=false`;
  `oisyTestEmptyNotes` is absent from its JavaScript.
- Current documentation trees validate. Staged sources contain no matching local
  API-key values, private provisioning files or generated mobile bundle output.

The suite reports existing nested-mock/dependency/simulator warnings; the commands
above complete successfully after the fixture correction. This review did not run
Android, repeat real passkey approval, or test funded signing/swaps. Prior physical
checks are recorded below; they are not evidence for new transaction capabilities.

## Branch and preservation

- Branch `codex/ios-native-m1`, based on merge `9946d6b9b` (main through release 2.6.3).
- The user authorized cleanup, commit and push for review. No audit deployment
  was performed. Do not reset, clean or drop the retained pre-merge stashes.
- Source backups: `/private/tmp/oisy-before-capacitor-cleanup-20261027.tar.gz` and
  `/private/tmp/oisy-before-shared-runtime-20261027.tar.gz`. These temporary local
  files are not durable repository backups.
- `mobile/capacitor/` is the only active mobile app. `mobile/ios-native/` is history.

## Current ownership

| Area          | Implementation                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------- |
| Wallet        | Normal `(app)/+page.svelte`, Assets/Hero and shared Loaders                                    |
| Token/history | Normal `(app)/transactions/+page.svelte`, Transactions and chain history                       |
| Activity      | Normal `(app)/activity/+page.svelte`, AllTransactions and filters                              |
| Search        | More menu opens the existing token filter using `search=true`                                  |
| More          | Native popover: `/notes/`, `/earn/`, `/borrow/`, and Search                                    |
| Navigation    | Floating Wallet/Activity/Explore tabs plus separate OISY-mark More button over one WebView     |
| Account       | Native sheet; real saved-address-book modal, web settings, reload and sign-out                 |
| Auth          | Native II/Keychain parent; shared AuthClientProvider and auth.store use an ephemeral web child |
| Workers       | Each owns its own key; private MessagePort receives a delegation bounded by the web child      |
| Explore       | Separate nonpersistent WebView, Uniswap/1inch, origin consent, Sepolia connection/reads        |

Removed `routes/mobile/`, `EmbeddedWalletLayout`, `NativePreview*`,
`WalletViewSnapshot`, mobile portfolio/history services and obsolete translations.
Feature pages are not copied into Swift. The browser build retains AuthClient/IDB;
mobile does not write native or child private keys there. Native acknowledgements
do not echo web navigation or interrupt an active Explore tab.

Parent/child expiry logs out, clears Keychain, removes the wallet runtime and
revokes Explore permissions. Web logout also terminates all workers; late bootstrap
and worker responses cannot reinstall the old session. Child TTL remains five
minutes with **no automatic renewal**. Financial execution and contact editing
remain unavailable. Token management and settings use the ordinary web flows.

## Verification for this integration

| Check                                    | Evidence                                                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused frontend and browser regressions | 224 tests passed in 18 files; `/private/tmp/oisy-shared-vitest-final.log`                                                                                           |
| Svelte application/test type checking    | 0 errors, 0 warnings; `/private/tmp/oisy-shared-check-tests-final.log`                                                                                              |
| ESLint / Swift formatting                | Changed frontend files pass with zero warnings; changed Swift files pass strict formatting                                                                          |
| Packaged frontend + Capacitor sync       | Passed; `/private/tmp/oisy-shared-sync.log`                                                                                                                         |
| Native suite                             | 30 unit/integration + 1 UI test passed; `/private/tmp/oisy-shared-native-tests.xcresult`                                                                            |
| Actual WebKit runtime                    | Real shared auth worker receives identity, emits expiry, main loader attempts canister reads; routes preserve grant/WebView; native expiry removes runtime/Keychain |
| Latest package/reload regression         | Passed: 4 targeted WebKit/origin tests; `/private/tmp/oisy-shared-final-smoke.xcresult`                                                                             |
| Physical device                          | User confirmed correct ICP/no immediate sign-out, visible native tabs, and ICP detail/Activity opening after both fixes                                             |

The WebKit fixture blocks network reads deliberately. It proves packaged code,
worker authentication, routing and expiry; it does **not** prove real balances or
funded transaction history. Offline captures show the normal web loading/error UI,
including its initial zero placeholder. Treat them as failure-state evidence, not
as a portfolio design or real-account acceptance. A window capture can miss a
WebKit composited layer after theme change; the WebKit snapshots were inspected.

Documentation: the Capacitor entry tree and handoff validator pass. The migration
spec directory-wide validator also reports legacy issues in other spec files;
current integration links were checked and repaired without a repository-wide cleanup.

At the initial integration checkpoint below, the full repository suite, separate
website build and Android had not been run. The later review validation above
supersedes the first two limitations; Android remains untested.
No new Playwright specs, dependencies, restricted scripts, CI, backend or dfx edits
were introduced for this integration. Shared build reports existing optional
provider/Robinhood-network warnings; final build still succeeds.

## Phone installation and acceptance

Use the [Capacitor guide](../../../../../mobile/capacitor/README.md). Preserve the
existing app's development team, local bundle override and Keychain service; install
over it, never uninstall. Phone identity is `org.dfinity.oisy.native.preview.artem`,
DFINITY team `7FY8G6QYKD`; generic simulator identity is
`org.dfinity.oisy.capacitor.preview`. No signing secrets belong in documentation.

The signed app is ready at `/private/tmp/oisy-capacitor-phone-build/Build/Products/Debug-iphoneos/App.app`. Build log: `/private/tmp/oisy-shared-phone-build.log` (success). The earlier install log `/private/tmp/oisy-shared-phone-install.log` records an unavailable device. After reconnection, CoreDevice confirmed installation and launch at 12:51 local time on 2026-10-27. The app was not uninstalled; bundle identity, signing team and Keychain service were preserved.

Phone acceptance now confirms ICP quantity, no immediate sign-out, visible native
tabs, and ICP detail/Activity opening on the shared-runtime build. It does not
confirm funded transaction history, other chains, or every Search/Contacts/Explore
flow. Those remain targeted follow-up checks; do not substitute the retired
snapshot build's approval for current evidence.

## Phone follow-up: II proof during initialization

The user reported loading tokens followed by immediate sign-out. Inspection found
that `initSignerAllowance` forwarded all mobile delegation links as the backend II
proof, while `verify_ii_delegation_chain` requires exactly the original II-signed
link. Its rejection triggers the existing loader sign-out. Shared
`extractIIDelegationChain` now sends that original link; the full child chain stays
in the request identity, preserving replica authentication and expiry enforcement.
Backend validation is unchanged.

Two new child-chain regressions failed before the fix. The utility, loader and
mobile-session suites then passed 28 tests, including an allowance regression
mirroring the backend one-link contract. Fixtures use local signing keys, not real
II canister signatures; phone acceptance is still needed. Logs are at
`/private/tmp/oisy-ii-proof-before.log` and `/private/tmp/oisy-ii-proof-tests.log`.

The correction passed Svelte application/test type checking (0 errors/warnings)
and changed-file ESLint. Packaged frontend sync and signed iPhone build succeeded;
CoreDevice confirmed installation over OISY Preview and launch at 12:59 local time
on 2026-10-27. The user signed in and confirmed that ICP is correct and there is no immediate
sign-out. The subsequent navigation correction below also received phone acceptance for ICP detail and Activity opening. Current logs:
`/private/tmp/oisy-ii-proof-check.log`, `/private/tmp/oisy-ii-proof-eslint.log`,
`/private/tmp/oisy-ii-proof-sync.log`, `/private/tmp/oisy-ii-proof-phone-build.log`,
`/private/tmp/oisy-ii-proof-phone-install.log`.

## Phone follow-up: missing root navigation

After confirming ICP, the user could not open Activity because the native tab bar
was absent. A regression reproduces the failure: a keyboard-frame notification
from a system authentication view sets `tabs.isHidden`, and returning to the shell
does not restore it. The old code also expands content over the tab area.

`ShellViewController` no longer hides tabs from global keyboard notifications.
That correction initially placed content above the tab bar and constrained it
above the native keyboard layout guide. The floating-navigation update below now
extends content behind the controls while preserving keyboard handling. The keyboard overlays the fixed tab bar when present;
dismissal restores visibility without a retained hidden flag.

- The regression failed before the change: `/private/tmp/oisy-tabs-before.xcresult`.
- All 3 targeted simulator tests passed: shell layout regression, real WebKit
  shared-runtime/navigation/expiry integration, and Explore UI navigation.
  Result: `/private/tmp/oisy-tabs-fixed.xcresult`; log: `/private/tmp/oisy-tabs-fixed.log`.
- Strict Swift formatting passed. The light simulator window capture was inspected;
  Wallet, Activity, Explore and Search are visible. Network data is intentionally
  blocked in that fixture, so its balances/errors are not real-account evidence.
- Signed phone build succeeded: `/private/tmp/oisy-tabs-phone-build.log`.
- Installation failed because CoreDevice could not locate the iPhone;
  `devicectl list devices` then showed it as unavailable. Reconnection requested.
  Log: `/private/tmp/oisy-tabs-phone-install.log`.
- After the user reconnected and unlocked the phone, installation succeeded and
  OISY Preview launched at 13:07 local time. Log:
  `/private/tmp/oisy-tabs-phone-install-retry.log`. The navigation correction is
  now installed. The user confirmed: tabs are visible, ICP detail and Activity open.

## Navigation follow-up: floating tabs and More

The user's requested layout now keeps three native tabs (Wallet, Activity, Explore)
and a separate glass More button using the existing OISY mark. Both sit above the
full-height wallet WebView. The shared mobile host adds bottom scroll padding so
end-of-page content stays reachable; web dialogs are bounded above the controls.
Explore/sign-in use native safe-area insets. The keyboard layout guide still avoids
stale hidden-navigation state after system authentication.

More uses a native menu with Notes, Earn and Borrow, followed by Search. Notes
opens the existing shared modal without changing the underlying page. Earn/Borrow
use their ordinary web routes and shared loaders. Search retains the ordinary
wallet token filter. Fixed route/message allowlists were extended; one wallet
WebView and its auth session remain in use. Menu destinations are disabled while
signed out. UIKit provides menu behavior, accessible labels and large-content
viewing; More's caption uses scaled type.

Earn/Borrow opportunity action buttons remain hidden in the mobile audit preview,
while ordinary browser behavior is unchanged. This update does not enable financial
execution or verify real positions. No notes were created or modified in a real
account during testing.

- Frontend: 45 tests passed across five files (routes, host messages, earning cards,
  Earn and Borrow). Log: `/private/tmp/oisy-more-vitest.log`.
- Application/test type checking: zero errors/warnings; `/private/tmp/oisy-more-check.log`.
- Packaged web build and Capacitor sync succeeded; `/private/tmp/oisy-more-sync.log`.
- Native: six targeted tests passed, covering floating layout/keyboard regression,
  fixed routes/origin isolation, shared WebKit/worker/session behavior, Notes opening,
  Earn/Borrow navigation and the More menu UI. Result:
  `/private/tmp/oisy-more-native.xcresult`; log: `/private/tmp/oisy-more-native.log`.
- Light/dark navigation and the native popover were visually inspected in simulator
  captures at `/private/tmp/oisy-more-attachments/`. Their offline fixture deliberately
  blocks network reads, so zero/loading/error states are not real-account evidence.
- Changed-file ESLint, strict Swift formatting, documentation validation and
  `git diff --check` passed.
- Signed phone build succeeded, and CoreDevice confirmed installation and launch
  at 13:27 local time on 2026-10-27. Existing bundle/team/Keychain were preserved.
  Logs: `/private/tmp/oisy-more-phone-build.log`,
  `/private/tmp/oisy-more-phone-install.log`, `/private/tmp/oisy-more-phone-launch.log`.
  User acceptance of the new layout/menu remains pending; the earlier phone
  acceptance above applies to the previous navigation layout.

## Phone follow-up: Base ETH history configuration

The user reported working Base ETH balances but no transaction history. Inspection
confirmed that the installed bundle's Etherscan API-key constant is `undefined`.
The worktree initially had no local development env file; the main checkout had
an Etherscan configuration, which the worktree build did not inherit. History uses
Etherscan independently of balance loading. No transaction-provider rewrite is needed
to fix this missing configuration.

`build:mobile` now checks the key before building. Four offline Vitest checks cover a
missing/blank key, the audit development env file and a build-environment override,
without logging credentials. Mobile build scripts are included in the ESLint project.
The build guide documents worktree-local setup and the limits of a presence-only check.

Verification: 41 Vitest tests passed (the four configuration checks plus existing
Etherscan-provider tests), application/test type checking reported zero errors or
warnings, and changed-file ESLint passed. Logs: `/private/tmp/oisy-base-env-tests.log`,
`/private/tmp/oisy-base-env-check.log`, `/private/tmp/oisy-base-env-eslint.log`.
An actual unconfigured `build:mobile` invocation was also checked: it exits before
replacing packaged assets. Documentation validation and `git diff --check` passed.

The user explicitly approved reusing the existing local Etherscan key on 2026-10-27.
Both Base endpoints (`txlist` and `txlistinternal`, chain 8453) returned valid history
for a public burn address, including one nonempty result each. Both allow the
Capacitor origin through their CORS response. No private wallet data was used in
these diagnostics, and no credential was printed. The approved Etherscan value is
now in the worktree's ignored `.env.development.local` (mode 0600); no unrelated
credentials were copied. The earlier automatic approval rejection is resolved by
that explicit authorization.

The configured shared bundle and Capacitor sync succeeded. Both packaged asset
locations were checked for the configured provider, without printing its value;
the build log contains no credential. The existing real-WebKit simulator test
passed against the new bundle, covering shared auth/worker startup, navigation,
More and expiry. Evidence: `/private/tmp/oisy-base-history-sync.log` and
`/private/tmp/oisy-base-history-native.xcresult` (one test, zero failures).

The signed phone build succeeded; its packaged assets were checked for the approved
history configuration and the build log contains no credential. It is ready at
`/private/tmp/oisy-capacitor-phone-build/Build/Products/Debug-iphoneos/App.app`.
Build log: `/private/tmp/oisy-base-history-phone-build.log`.

The initial installation attempt could not locate the phone; log:
`/private/tmp/oisy-base-history-phone-install.log`. After the user switched USB
ports, CoreDevice confirmed connection, installation over OISY Preview and launch
at 13:50 local time on 2026-10-27. The existing bundle/team/Keychain were preserved.
Logs: `/private/tmp/oisy-base-history-phone-install-retry.log` and
`/private/tmp/oisy-base-history-phone-launch.log`.

The configured fix is installed. The user opened ETH on Base and confirmed:
“Да, транзакции появились” (transactions appeared). Physical-device acceptance now
confirms that Base ETH history loads on this build. This does not validate every
transaction field, pagination or other EVM networks; no financial operation was
performed during verification.

## Remaining work

- Automatic child renewal with worker/client replacement and cancellation tests.
- Native II root-signature verification and cold-start callback recovery review.
- Fresh-account onboarding/allowance and multi-chain funded-history acceptance.
- Android host/toolchain, storage/signing compatibility and device checks.
- Send/swap/buy and dApp signing/broadcast are separate tasks.
- Improve the shared web offline/startup balance state (it currently begins at zero)
  in the common frontend, not by rebuilding a separate mobile portfolio.

Audit serves backend data. Installed UI is bundled; publishing `audit.oisy.com`
does not update an installed app. Develop shared features once in the normal web
routes/components, then rebuild the mobile package. Native-only capabilities belong
behind the fixed host interface. M1 cross-platform/release acceptance is not complete.

## Dependencies

| Document                                                                     | Purpose                                        |
| ---------------------------------------------------------------------------- | ---------------------------------------------- |
| [Migration spec](../2026-10-27-feat-mobile-shared-web-native-navigation.md)  | Scope and acceptance gates                     |
| [Capacitor guide](../../../../../mobile/capacitor/README.md)                 | Build and install ownership                    |
| [Session boundary](../../../../../mobile/capacitor/docs/session-boundary.md) | Authentication, workers, routing and isolation |

## Related

| Document                                                            | Purpose                       |
| ------------------------------------------------------------------- | ----------------------------- |
| [Earlier iOS handoff](../2026-10-22-feat-ios-native-mvp/handoff.md) | Historical native/hybrid work |

## Shared mobile modal shell and Notes page — 2026-10-27

The user approved a common mobile presentation shell and a dedicated Notes page
from More. Shared feature logic stays in Svelte; native code only controls its
navigation visibility. No dependency, backend, authentication or cryptography
change was needed. Nothing has been pushed.

| Before                                        | After                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web dialog ended above the floating tabs      | Full-viewport backdrop, content-sized bottom sheet, 28px top corners, safe-area padding and internal scrolling                                                                  |
| Native tabs remained active behind dialogs    | The existing overlay focus stack publishes blocking state; a fixed, validated host command hides tabs/More through nested overlays and exit transitions; reload/logout reset it |
| Large modal header and duplicate Close footer | 17px header, 44px close target; sole Close footer omitted only when the header can actually dismiss the dialog                                                                  |
| Notes opened as a large modal from More       | `/notes/` page with compact empty-state typography and no Close footer; it has its own loader and does not wait for wallet profile/balances                                     |
| Notes UI lived entirely inside NotesModal     | `Notes.svelte` owns the same shared list/view/editor state, cache, services, crypto and analytics; the website retains its modal wrapper                                        |
| Editor competed with app navigation           | Full-screen mobile editor with explicit Cancel/Save; tab controls hidden while editing, accidental backdrop/Escape ignored                                                      |

Verification: the final simulator run passed 5 native tests, including real WebKit
routing, shared Notes/cache, editing/cancel, sheet geometry, hiding/restoring native
controls, rejecting malformed presentation calls and expiry cleanup. Evidence:
`/private/tmp/oisy-modal-native-final.xcresult`. Frontend checks report zero errors
or warnings; the final 106-test run had one setup-hook timeout (105 passed), so
`overlay.utils.spec.ts` was rerun separately: all 8 tests passed. The 106 unique
frontend tests are green across these runs, with no timeout increase or assertion
change. ESLint also passed with zero warnings. Logs: `/private/tmp/oisy-modal-check-final.log`,
`/private/tmp/oisy-modal-vitest-final.log`, `/private/tmp/oisy-modal-overlay-final.log`.

Simulator fixture builds use `VITE_MOBILE_UI_TEST=true` with the shared in-memory
Notes store and fake identity; network calls remain blocked. This avoids weakening
signed canister-response validation. Normal phone assets must be rebuilt with the
flag false and checked to exclude `oisyTestEmptyNotes`. No real note was saved,
deleted or shared during testing. Contacts screenshots intentionally show its
loading state because the fixture has no live address book.

Screenshots, inspected in light and dark appearance:
[Notes light](./evidence/mobile-modals/capacitor-notes-page-light.png),
[Notes dark](./evidence/mobile-modals/capacitor-notes-page-dark.png),
[editor dark](./evidence/mobile-modals/capacitor-notes-editor-dark.png),
[sheet light](./evidence/mobile-modals/capacitor-shared-sheet-light.png),
[sheet dark](./evidence/mobile-modals/capacitor-shared-sheet-dark.png).

Physical installation: completed after the user reconnected/unlocked the phone.
The first attempt at 15:41 CET failed with a connection reset; CoreDevice confirmed
installation at 15:46 and launch at 15:48. No uninstall or data reset was performed.
The normal bundle was rebuilt with `VITE_MOBILE_UI_TEST=false`; both frontend and
copied iOS JS assets were checked to exclude `oisyTestEmptyNotes`. The signed phone
build succeeded and retains team `7FY8G6QYKD`, bundle
`org.dfinity.oisy.native.preview.artem` and the existing Keychain. Ready artifact:
`/private/tmp/oisy-capacitor-phone-build/Build/Products/Debug-iphoneos/App.app`.
Logs: `/private/tmp/oisy-modal-phone-sync.log`, `/private/tmp/oisy-modal-phone-build.log`,
`/private/tmp/oisy-modal-phone-install.log` records the failed attempt; the successful
retry is in the conversation tool output. Physical acceptance of More → Notes and
a shared modal is still pending; passkey approval may be necessary after expiry.

## Illustrated welcome — 2026-10-27

The next change replaces the generic native signed-out placeholder with two
illustrated welcome states. No shared wallet screen, signing request, delegation
validation or frontend data pipeline is replaced. The native entry point keeps the
OISY mark without a wordmark, a direct Internet Identity CTA, and an Explore shortcut.
First-time/returning presentation uses a cosmetic installation preference; see the
[mobile app README](../../../../../mobile/capacitor/README.md#welcome-screens) for
state migration, motion and artwork provenance.

Verification: 21 focused native/UI tests passed across AuthTests, ShellLayoutTests,
WalletOriginPolicyTests, WelcomeViewTests and MobileShellTests. They cover history
persistence/expiry migration, session rejection/cleanup, welcome ↔ Explore, native
navigation after authentication, both appearances and the largest accessibility
text category. After visual refinement, the relevant three UI/snapshot tests
passed again, followed by the final typography snapshot run. Evidence:
`/private/tmp/oisy-welcome-tests-2.xcresult`, `/private/tmp/oisy-welcome-final.xcresult`
and `/private/tmp/oisy-welcome-typography.xcresult`.

Reduce Motion was enabled in the simulator's Settings. The snapshot test compared
frames 400ms apart during entry and verified that artwork remains unchanged in all
four state/theme combinations. The ordinary run also exercised the one-time entry
animation. Swift strict format lint and agentic-markdown link checks passed. No
frontend source changed in this welcome update; its previous quality gates remain
recorded in the modal section above.

Actual simulator captures:
[first-time light](./evidence/welcome/welcome-first-light.png),
[first-time dark](./evidence/welcome/welcome-first-dark.png),
[returning light](./evidence/welcome/welcome-returning-light.png),
[returning dark](./evidence/welcome/welcome-returning-dark.png),
[largest text](./evidence/welcome/welcome-returning-accessibility.png).

Phone bundle was checked to exclude UI test fixtures. Final signed build log:
`/private/tmp/oisy-welcome-phone-final.log`. CoreDevice confirmed installation at
16:03 and launch at 16:04 CET over the existing phone app, with the same team,
bundle and Keychain. Logs: `/private/tmp/oisy-welcome-phone-install.log` and
`/private/tmp/oisy-welcome-phone-launch.log`. The update includes the previously
verified modal/Notes changes. User acceptance of the new welcome remains pending;
physical passkey approval is performed by the user. The simulator's Reduce Motion
preference was restored to its original off value after testing. Nothing pushed.

## Welcome state follows logout reason — 2026-10-27

Follow-up to the illustrated welcome: explicit logout from native Account or the
shared web host now clears returning presentation and opens “Your Digital Assets
Private and Secure” / “Open or create”. Native/child-session expiry and expired
Keychain restoration keep “Welcome back!” / “Open Wallet”. Both choices persist
across relaunch; a delayed expiry cannot overwrite explicit logout. Session and
Keychain cleanup is shared and unchanged. No frontend transport or auth scope was
changed. The legacy preference key is retained for existing installed previews.
Verification: 25 tests passed (23 native/unit tests and 2 simulator UI tests),
including explicit logout across relaunch, expiry across relaunch, expired saved
session migration, and a stale expiry callback after logout. Swift formatting and
document-tree checks passed. Results:
`/private/tmp/oisy-welcome-logout-reason.xcresult`.

Signed phone build succeeded and CoreDevice confirmed installation and launch at
16:14 CET over the existing OISY Preview, preserving bundle, team and Keychain.
Logs: `/private/tmp/oisy-welcome-logout-phone.log`,
`/private/tmp/oisy-welcome-logout-install.log`, and
`/private/tmp/oisy-welcome-logout-launch.log`. Physical user acceptance of the two
welcome paths remains pending. Nothing pushed.

## Welcome artwork follows device tilt — 2026-10-27

Both signed-out welcome backgrounds now use UIKit's UIInterpolatingMotionEffect
for a restrained two-axis parallax (12 pt horizontal, 16 pt vertical). The existing
text, CTA, overlays, returning blur and first/returning selection stay unchanged.
The artwork has 32 pt of overscan so tilt cannot expose its edges. Reduce Motion,
inactive scenes, system sign-in and authentication disable the effects; removal
from the window also clears them. UIWindowScene activation notifications own the
motion lifecycle: the default SwiftUI scenePhase in this UIKit hosting setup did
not become active, which a real-window assertion caught and the native observer
fix addresses. There is no Core Motion stream, sensor timer, new dependency or
new permission request.

Verification: 20 selected tests passed (15 auth, 3 welcome, 2 UI), including
native-window activation/deactivation, bounded offsets, coverage at maximum tilt,
removal on detach, light/dark rendering and accessible text. Results:
`/private/tmp/oisy-welcome-parallax-lifecycle.xcresult`. A separate appearance run
with the system Reduce Motion setting confirmed true passed both static-frame
comparisons and absence of motion effects:
`/private/tmp/oisy-welcome-parallax-lifecycle-reduced.xcresult`. The simulator setting
was restored to false. Swift formatting and document-tree checks passed; the
existing welcome screenshots were refreshed.

Signed phone build succeeded; CoreDevice confirmed installation and launch at
16:34 CET over OISY Preview, preserving the team, bundle and Keychain. Logs:
`/private/tmp/oisy-welcome-parallax-phone.log`,
`/private/tmp/oisy-welcome-parallax-install.log`, and
`/private/tmp/oisy-welcome-parallax-launch.log`. Actual tilt feel still needs the
user to tilt their physical iPhone; simulator checks do not validate sensor input.
Nothing pushed.
