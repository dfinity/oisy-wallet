---
title: Mobile migration handoff
tags: [mobile, ios, android, capacitor, handoff]
---

# Mobile migration handoff

Updated 2026-10-28. The iOS Capacitor app uses the existing Wallet, Token and
Activity routes with their shared auth provider, stores, loaders and workers.
The separate snapshot preview and data pipeline have been removed.

On the iPhone 14 Pro Max, the user confirmed correct ICP, no immediate sign-out,
visible native tabs, and working ICP detail and Activity screens after the fixes
below. A later check confirmed that Base ETH history loads. These checks do not
validate every transaction field or other chains.

Wallet, Activity and Explore now float over the WebView. More opens Notes, Earn,
Borrow and Search. The floating navigation was installed at 13:27 local time;
the shared modal shell and Notes page followed at 15:48. Phone acceptance of those
screens remains pending. Later welcome updates and their installation times are
recorded below. The final authentication review fixes and documentation commit
`1387b85ac` were installed and launched on the phone at 18:14 local time. The
normal bundle excludes test fixtures; no app uninstall or sign-in reset was used.

## Swap USD price fix — 2026-10-28

The phone showed an unavailable USD price for ICP → ckUSDC. Swap's extra token
price loader requested the Ethereum twin through CoinGecko and excluded ck-tokens
from its ledger fallback. The preview has no CoinGecko key, so tokens omitted by
the backend response stayed unpriced. The public ICPSwap ckUSDC endpoint responded
with HTTP 200 and allowed the Capacitor origin.

`loadDisabledIcrcTokensExchanges` now uses the existing flag-gated ICPSwap/Kong
fallback for missing ledger prices, including ck-tokens. Existing prices are kept,
including those arriving during the request. TCYCLES remains excluded. If all
sources fail, the price stays unavailable. No API key or dependency was added.

Seven regression cases cover ICP/ckUSDC store updates, empty responses, existing
ledger/twin prices, concurrent backend updates, provider failure and TCYCLES.
All 180 tests across the ICRC service, exchange service, exchange-derived and
exchange utility suites pass. The three regression cases that exercise the missing
path failed before the fix. A production build exposed a circular dependency when
the loader imported the derived exchange store; both now use the same pure
`icrcTokenPrice` utility. Scoped ESLint and the app/test typecheck passed with no
errors or warnings; the production web bundle and signed iOS build succeeded.
The ICPSwap GET and CORS preflight both returned HTTP 200 for the Capacitor origin.
Signature, unchanged team/app ID, matching bundle metadata and fixture absence
passed. Installed on the existing iPhone at 17:20 and launched at 17:21 local time.
No uninstall, data reset, key addition, commit or push. Live price acceptance in
ICP → ckUSDC remains for the user; no transaction was submitted.

Evidence: `/private/tmp/oisy-swap-prices-before.log`,
`/private/tmp/oisy-swap-prices-tests.log`, `/private/tmp/oisy-swap-prices-lint.log`,
`/private/tmp/oisy-swap-prices-types.log`, `/private/tmp/oisy-swap-prices-sync.log`,
`/private/tmp/oisy-swap-prices-phone-build.log`,
`/private/tmp/oisy-swap-prices-phone-install.json` and
`/private/tmp/oisy-swap-prices-phone-launch.json`. The handoff tree lints cleanly;
the broader frontend documentation tree still reports its existing broken links
and missing frontmatter, outside this pricing change.

## Shared Swap and EVM Send — 2026-10-28

User requested both ICPSwap execution and ETH/ERC-20 Send. Both reuse the existing
web forms and services. Native adds only bounded, principal-bound Keychain metadata
storage. No backend deployment, new SDK or dependency was needed.

Validation: 413 frontend tests passed across 13 suites, followed by a focused
30-test certified-caller/lifecycle rerun. App/test typechecks report zero errors
and warnings; scoped ESLint and both documentation trees pass. The packaged
simulator run passed eight WebKit/journal/session tests, including shared ICP Send
review/cancel, Swap sheet opening/closing, native overlay suppression and expiry.
Light/dark captures were visually checked. Network-blocked simulator fixtures and
mocked service tests do not prove a live quote or funded transaction. No funds moved.

The normal `VITE_MOBILE_UI_TEST=false` bundle was rebuilt and signed for the
existing DFINITY team/app identifier. Signature, matching build metadata and test
fixture absence passed. After the user reconnected the iPhone, this build was
installed at 17:02 and launched at 17:03 local time on 2026-10-28. It replaces the
quote-only preview without uninstalling the app or changing its team, bundle ID
or Keychain service. No sign-out or data reset was requested. Live quote and funded
transaction acceptance on the phone remain pending.

Evidence: `/private/tmp/oisy-mobile-send-swap-tests-complete.log`,
`/private/tmp/oisy-mobile-send-swap-caller-tests.log`,
`/private/tmp/oisy-mobile-send-swap-types-final.log`,
`/private/tmp/oisy-mobile-send-swap-lint-final.log`,
`/private/tmp/oisy-mobile-send-swap-webkit.xcresult`,
`/private/tmp/oisy-mobile-send-swap-captures/`,
`/private/tmp/oisy-mobile-send-swap-phone-build.log`,
`/private/tmp/oisy-mobile-send-swap-phone-install-connected.json` and
`/private/tmp/oisy-mobile-send-swap-phone-launch-connected.json`.
The approved four API/RPC values were absent from 6,680 tracked/nonignored files,
staged changes and branch commit diffs. They remain in ignored configuration and
bundles. No commit or push was made.

Recovery is intentionally conservative. Unknown EVM results block another send on
the chain/sender. A recorded hash may never have been broadcast if cancellation or
expiry happened in between; a missing receipt alone cannot clear it. Unknown
ICPSwap results keep the pool locked, even after available pool tokens are explicitly
withdrawn. Old approval-only records can be released without risking a deposit.
Funded device acceptance and explicit resolution of unknown operations remain open.
See the [transaction contract](../../../../../mobile/capacitor/docs/shared-web-contract.md#durable-mobile-operation-records).

The earlier quote-only preview was installed and launched on the existing iPhone
at 15:51 local time. Its build kept the existing app, team and Keychain settings.
This section supersedes the quote-only limitation recorded below.

## Shared Swap quote preview — 2026-10-28

The next mobile slice opens the shared Swap form and review for canonical ICP and
ck-tokens on Internet Computer. It uses ICPSwap only. KongSwap's existing disabled
flag remains intact. The token picker is locked to ICP, provider discovery avoids
other chains, and unsupported pairs are rejected before quoting. Quotes refresh
while editing and pause on Review. Native tabs, edge Back and refresh follow the
existing full-screen modal contract.

This is a quote/review preview, with explanatory copy in both steps. There is no
mobile submission button. The wizard and `fetchIcpSwap` also reject execution
before approval or deposit. Existing browser Swap behavior remains available.

Why submission is separate: the existing ICPSwap wizard keeps recovery state in
memory. A killed app or expired session can lose it after funds reach a pool.
Implement a wallet-bound operation record and reconciliation before enabling
mobile deposit/swap/withdrawal, then test quote freshness, per-write session checks,
repeated taps and unknown outcomes. Never retry an unknown swap automatically.

Validation: 357 frontend tests pass across 11 suites, including browser regressions,
mobile token/provider restrictions, review-only controls and the execution guard.
App/test type checks report zero errors and warnings; scoped ESLint and both mobile
document-tree checks pass. Packaged WebKit verification passed, including opening
and closing the full-screen Swap form and light/dark captures. It does not validate
a live quote or funded swap. The first WebKit run reached the new Swap checks but
failed an earlier ETH/Base Back assertion; that test now waits for native readiness
rather than treating the web route commit as proof that Back is enabled.

Evidence: `/private/tmp/oisy-swap-preview-tests-final.log`,
`/private/tmp/oisy-swap-preview-webkit-final.xcresult` and
`/private/tmp/oisy-swap-preview-captures/`. The normal signed phone build at
`/private/tmp/oisy-capacitor-phone-build/Build/Products/Debug-iphoneos/App.app`
passed signature, existing team/bundle, matching web-metadata and fixture-absence
checks. This quote-only build was installed and launched at 15:51 local time.
Physical refresh acceptance remains open.

No funds moved; no commit or push. The approved API/RPC values remain in ignored
configuration/bundles. A scan found none in tracked/nonignored source, staged
changes or this branch's commit diffs.

## Refresh provider configuration — 2026-10-28

The user reported a refresh error after about 15 seconds while displayed amounts
still looked correct. Safari inspection of the phone showed failing Solana and
Robinhood Alchemy requests plus repeated `XrpRpcNotConfiguredError` failures.
The mobile worktree had only the Etherscan key. Missing providers exhausted the
shared refresh deadline; the visible spinner was not the cause.

The user authorized reuse of the main checkout's Infura/Alchemy client keys and
asked to reuse the XRP endpoint shipped by the website. The production `oisy.com`
bundle contains an XRP endpoint; the older audit bundle does not include XRPL RPC.
All values were placed only in ignored `.env.development.local`. Anonymous
RPC health/chain checks with the app origin succeeded for XRP and Infura.
Alchemy rejected `localhost` with a domain-allowlist error; the same key also
rejected the audit origin. The user then explicitly requested temporary Solana
and Robinhood disablement. Existing `VITE_SOLANA_MAINNET_DISABLED=true` and
`VITE_ROBINHOOD_MAINNET_DISABLED=true` are set only in the ignored local env.
XRP stays enabled. Re-enable these mainnets after an approved RPC key accepts
the app origin; do not bypass the provider restriction. The existing Solana
mainnet flag does not remove devnet when the user enables testnets.

The mobile preflight now rejects missing Infura/Alchemy configuration and missing
or malformed XRP URLs when XRP is enabled. Twelve regression cases pass. The
credential scan found no values in tracked/non-ignored files, the index diff or
branch commit diffs against `origin/main`; local env and built assets are untracked.
The normal web bundle and signed phone build succeeded with these flags. Scoped
ESLint, documentation lint, signature, matching packaged metadata, fixture absence
and a final Git-visible credential scan pass. Logs:
`/private/tmp/oisy-refresh-config-final-sync.log`,
`/private/tmp/oisy-refresh-config-final-phone-build.log` and
`/private/tmp/oisy-refresh-config-tests.log`. The ready app is
`/private/tmp/oisy-capacitor-phone-build/Build/Products/Debug-iphoneos/App.app`.
Installed and launched on the iPhone 14 Pro Max at 14:56 Zurich on 2026-10-28
after the user reconnected it. The existing team and bundle were retained; no
uninstall or Keychain reset was used. CoreDevice records:
`/private/tmp/oisy-refresh-config-phone-install.json` and
`/private/tmp/oisy-refresh-config-phone-launch.json`. The user has been asked to
pull down on Wallet and confirm completion without the refresh error; that
physical acceptance remains pending. No credentials were committed; no commit
or push was made.

## Visible Wallet refresh feedback — 2026-10-28

The user reported no visible spinner during pull-to-refresh. The full-screen
WebView has no native top inset; web safe-area padding does not move its native
refresh control below the status bar. `WalletInteractions` now draws a single
UIKit spinner on a material surface below the safe area while retaining the
existing pull threshold and shared refresh coordinator. The indicator remains
visible after release until the matching request finishes or is cancelled. Light
and dark appearances and a localized VoiceOver label are included. No web assets,
data loading, authentication or bridge messages changed.

Verification: eight focused simulator tests pass, covering safe-area placement,
pending/completed/cancelled requests, stale replies, haptic deduplication, Back
and shell layout. Light/dark screenshots were inspected; they use an isolated
native layout fixture, not the user's wallet. The first captures exposed a second
stock spinner despite transparent tint; setting the refresh control's alpha to
zero leaves one visible indicator. Swift formatting and both documentation trees
pass. The build still reports existing Sendable-capture warnings in
`TrustedWalletViewController`; this change did not edit those observers.

Evidence: `/private/tmp/oisy-refresh-feedback-final.xcresult` and
`/private/tmp/oisy-refresh-feedback-final-captures/`. The native-only phone build
reuses the verified normal audit web bundle from Send. Signature, original
team/bundle, matching web metadata and fixture absence were checked. Installed
and launched on the iPhone 14 Pro Max at 14:06 Zurich on 2026-10-28 without an
uninstall or Keychain reset. CoreDevice records are
`/private/tmp/oisy-refresh-feedback-phone-install.json` and
`/private/tmp/oisy-refresh-feedback-phone-launch.json`. Physical pull/feedback
acceptance remains for the user; simulator checks dispatch the public refresh
control event and hold completion, rather than synthesize a touch gesture.
No commit or push was made.

## Shared ICP and ck-token Send — 2026-10-28

The mobile hero exposes the existing web Send for ICP and canonical ckBTC,
ckETH and ckERC20 ledgers on Internet Computer. Wallet selection is restricted
to those tokens; Token opens the same destination/amount/review/progress wizard
in the shared full-screen modal. Fees, saved contacts, first-recipient confirmation,
ledger calls and post-send wallet refresh remain owned by the web implementation.

The submission service checks the supported ledger, destination network/account
and current unexpired identity. The confirmation handler latches synchronously
against duplicate taps. An unconfirmed response closes the intent and directs the
user to Activity/balance before another send. No automatic retry or session renewal
was added. Camera scanning, other chains, arbitrary ICRC/SNS, NFTs and ck withdrawals
remain outside this slice. Durable pending-result recovery is still open.

The v2 `audit-read-only` string remains a legacy protocol label. Shared Send is
now exposed; the delegated web identity was already capable of updates. See the
[Send contract](../../../../../mobile/capacitor/docs/shared-web-contract.md#shared-send)
for the current scope and future-agent rules. Real-funds acceptance must be
separately authorized with a recipient and amount.

Verification: 209 focused frontend cases pass, including the real modal/transition
hierarchy resolving a mocked transfer after token/balance refresh. The packaged
WebKit simulator test passes destination validation, amount/review/fee, first-recipient
acknowledgement, Back, cancel, draft reset and native-controls restoration, with
light/dark review captures. Wallet/worker network calls are blocked in that harness;
the final Send button is never invoked there. No real funds were sent.

Logs: `/private/tmp/oisy-send-tests-final.log` and
`/private/tmp/oisy-send-webkit-20261028.xcresult`. App/test type checks report zero
errors and warnings; scoped lint and both documentation trees pass. The phone
bundle was rebuilt with `VITE_MOBILE_UI_TEST=false`; signature, existing team/bundle,
matching web metadata and fixture absence were verified.

Installed and launched on the iPhone 14 Pro Max at 13:46 Zurich on 2026-10-28,
after the user reconnected and unlocked it. The update used the existing team
`7FY8G6QYKD` and bundle `org.dfinity.oisy.native.preview.artem`, without uninstalling
or resetting Keychain. CoreDevice installation and launch succeeded; phone form
acceptance and a funded transfer have not been confirmed. Evidence:
`/private/tmp/oisy-send-phone-install.json` and
`/private/tmp/oisy-send-phone-launch.json`. No commit or push was made.

## Captured-parent Back and Wallet refresh — 2026-10-28

The user's phone recording exposed a flaw in the first slice: WebKit's SPA history
snapshot could show the outgoing token page behind itself during Back. The trusted
wallet now disables that gesture and uses a native edge pan over a captured
Wallet/Search parent. It retains one live wallet WebView. Cancel leaves the token
in place; commit asks the shared router to return and waits for restored scroll and
paint before removing the cover. Parent images stay in memory and are discarded
on privacy/lifecycle changes. Capture failure retains ordinary visible Back.

Mobile header/list and restored token-group intros no longer expand again after
Back. Explicit group expansion still animates. The WebKit fixture includes the
reported expanded ETH group → ETH Base → Back path as well as ICP and Search.

Wallet has native pull-to-refresh with one light haptic. It joins the existing
shared balance and price loaders, including EVM. Correlated completion works even
when values do not change; web/native deadlines stop a hung indicator. Existing
reader failure behavior still applies, including unavailable balances where a
provider failed. Refresh does not reload the document or extend authentication.
The [interaction and refresh contract](../../../../../mobile/capacitor/docs/shared-web-contract.md#token-navigation-contract)
owns the protocol and lifecycle details.

Verification: 462 focused frontend cases pass across the combined run and the
corrected scheduler assertion rerun; app/test type checks report zero errors and
warnings. Native verification covers 56 cases across the signed suite and final
7-case interaction/WebKit rerun. The final run confirms correct parent rendering,
expanded ETH/Base restoration, Search query, cancellation, unchanged runtime/grant,
visible spinner completion and vertical-only refresh. The original unsigned
simulator attempt could not access Keychain; it was rerun with ordinary ad-hoc
signing without changing authentication code. Swift/changed-frontend lint,
document-tree validation and whitespace checks passed.

Evidence: `/private/tmp/oisy-interactions-web-final.log`,
`/private/tmp/oisy-refresh-scheduler-final.log`,
`/private/tmp/oisy-interactions-check-final.log`,
`/private/tmp/oisy-interactions-check-tests-final.log`,
`/private/tmp/oisy-interactions-native-signed-20261028.xcresult` and
`/private/tmp/oisy-interactions-verified-20261028.xcresult`. Final gesture captures
are in `/private/tmp/oisy-interactions-verified-captures/`. They use isolated mock
balances and blocked network calls. Physical finger tracking, haptic feel and live
provider refresh remain device acceptance items.

Installed and launched on the iPhone 14 Pro Max at 12:26 Zurich time on 2026-10-28.
The normal bundle was rebuilt without UI fixtures, its metadata matched the signed
app, and the signature/team/bundle were verified. Installation retained the
existing application and Keychain; no uninstall or session reset was performed.
Build/install evidence: `/private/tmp/oisy-interactions-phone-sync.log`,
`/private/tmp/oisy-interactions-phone-build.log`,
`/private/tmp/oisy-interactions-phone-install.json` and
`/private/tmp/oisy-interactions-phone-launch.json`. Physical acceptance is pending.
No commit or push was made for this change.

## Wallet/Search token navigation — 2026-10-28

The first navigation slice reuses the shared Wallet and Token routes. Token Back
returns to its exact Wallet/Search parent, with in-memory scroll and search state.
Native root requests use IDs; web acknowledges its committed location and revision.
Root selection replaces history, and stale reports cannot switch the active tab.
One trusted WebView and its delegation survive same-document Back.

Native history gestures are gated by the actual preceding WebKit URL, active
session and absence of a pending root request, Account or blocking overlay. Shared
mobile modals reject underlying route changes and retain their contents. The iOS
scroll lock now does nothing when no modal was locked, and keeps the original
position when one modal step replaces another.

This is not independent retained tab history. Interactive edge swipe completion
and cancellation remain a physical-device acceptance item: simulator clicks worked,
but its control tool did not deliver any drag, including ordinary scroll. Automated
Back, history, grant and modal assertions are separate evidence. Financial actions
remain hidden. No commit or push was made for this slice.

The [navigation contract](../../../../../mobile/capacitor/docs/shared-web-contract.md#token-navigation-contract)
and [coverage plan](../../../../../mobile/capacitor/docs/feature-parity.md#first-implementation-slice)
record ownership and next work. Rebuild matching native/web assets together; the
strict v2 handshake adds the `navigationState` capability. Test-only fixtures must
be removed by a normal rebuild before any phone installation.

Verification: 78 focused frontend tests passed, including shared iOS modal scroll,
host ordering and the navigation model. The complete simulator run passed 48
AppTests and 2 AppUITests, including the real bundled WebKit flow. Application/test
type checks reported zero errors and warnings. Changed-file ESLint, Prettier,
Swift formatting, the mobile README/handoff context trees and `git diff --check`
passed. The final normal mobile build/sync also passed with both fixture event
names absent from `build-mobile` and the packaged iOS public assets. This does not
replace physical gesture acceptance.

Evidence: `/private/tmp/oisy-nav-web-final.log`,
`/private/tmp/oisy-navigation-complete-20261028.xcresult`,
`/private/tmp/oisy-nav-native-complete.log`,
`/private/tmp/oisy-nav-check-final.log`,
`/private/tmp/oisy-nav-test-types-final.log` and
`/private/tmp/oisy-nav-normal-build.log`.

Installed and launched on the iPhone 14 Pro Max at 11:37 Zurich time on 2026-10-28.
The signed app retained the existing bundle identifier, development team and
Keychain service; no uninstall or session reset was performed. Its packaged web
build metadata matches the normal bundle, and both test-fixture events are absent.
The user still needs to verify completed/cancelled edge gestures on the device.
Installation evidence: `/private/tmp/oisy-navigation-phone-build.log`,
`/private/tmp/oisy-navigation-phone-install.json` and
`/private/tmp/oisy-navigation-phone-launch.json`.

## Feature and compatibility audit — 2026-10-28

A read-only code audit covered web feature availability, iOS routes/entry points,
Back/swipe feasibility and shared-code regression gaps. The
[coverage plan](../../../../../mobile/capacitor/docs/feature-parity.md) owns the
inventory and proposed stages; the [compatibility guide](../../../../../mobile/capacitor/docs/shared-web-contract.md)
owns agent checks and change/test routing. Root/frontend/mobile agent entry points
now link to that guide. Stale current-state five-minute/renewal descriptions were
corrected; historical build records remain.

At the time of the audit, the recommended first slice was Wallet/Search → Token
→ Back; its subsequent implementation is recorded above. The audit itself changed
no runtime behavior, financial capability, CI workflow or phone installation. The mobile README
context tree (including both new guides), handoff tree, new relative links,
formatting and `git diff --check` pass. A broader migration-spec traversal reports
73 pre-existing link/Source-format errors in the older repository documentation;
these are outside the new guides and were not cleaned up here. The previous app
test results below are not evidence for unimplemented navigation.

## One-hour session — 2026-10-28

The user increased the fixed session limit to one hour, matching the web wallet's
`AUTH_MAX_TIME_TO_LIVE`. Native sign-in requests one hour and persists its deadline;
the web validation limit is derived from the existing web constant. Earlier II
expiry still wins. No automatic renewal or activity-based extension was added.
Existing 20-minute sessions keep their saved deadline; the next sign-in gets the
new lifetime. See the [session policy](../../../../../mobile/capacitor/docs/session-boundary.md#fixed-session-policy).

Verification: all 27 focused frontend tests and 47 simulator tests passed,
including saved-deadline migration, late web/worker grants, expiry cleanup and
welcome UI. Application and test type checks report zero errors and warnings;
focused ESLint, Swift formatting and documentation validation pass. The normal
mobile bundle and signed phone build succeeded, with test fixtures excluded.

Installed and launched on the iPhone 14 Pro Max at 10:18 Zurich time on 2026-10-28,
preserving the existing team, bundle identifier and Keychain service. The user
must sign in again to get a one-hour delegation; an existing shorter session is
not extended. A real passkey sign-in and full elapsed-hour check remain pending;
expiry tests use controlled time.

Evidence: `/private/tmp/oisy-hour-web-tests.log`,
`/private/tmp/oisy-hour-simulator-20261028.xcresult`,
`/private/tmp/oisy-hour-check.log`, `/private/tmp/oisy-hour-check-tests.log`,
`/private/tmp/oisy-hour-phone-build.log`, `/private/tmp/oisy-hour-install.json`
and `/private/tmp/oisy-hour-launch.json`. The interactive explanation also now
uses a one-hour example. No commit or push was made.

## Fixed 20-minute session — 2026-10-28

The preceding build requested 20 minutes from II, persisted a local deadline when sign-in
succeeded, and issued web/worker grants no later than that deadline or actual II
expiry. Relaunch, activity and document replacement cannot restart the clock.
Old Keychain records without a deadline expire into “Welcome back!” and require a
new sign-in. Explicit logout still shows the introduction.

The [session policy](../../../../../mobile/capacitor/docs/session-boundary.md#fixed-session-policy)
owns this behavior. It supersedes the earlier five-minute child limit and renewal
items below. There is no new SDK dependency or domain deployment. The normal build
was installed and launched on the iPhone 14 Pro Max at 10:08 Zurich time on
2026-10-28, after the laptop reboot. The existing team, bundle identifier and
Keychain service were preserved; the app was not uninstalled. A fresh II sign-in
is required to replace the legacy session. Physical sign-in and a full 20-minute
elapsed-time check remain pending.

Verification: 27 focused frontend tests and all 46 simulator tests passed. The
simulator suite includes actual WebKit/session teardown and welcome UI checks.
New expiry tests use controlled timestamps; they do not constitute a 20-minute
physical-phone/passkey test. Application and test type checks report zero errors
and warnings. The reboot removed the earlier temporary simulator/type-check
artifacts and interrupted full-repository lint. After reboot, the 27 frontend tests
passed again, as did focused ESLint, strict Swift formatting, normal mobile web
build/sync and the signed device build. A test-helper parameter warning was fixed.
The installed bundle has no UI-test fixture references; its code signature and
existing development team were verified. Current temporary evidence:
`/private/tmp/oisy-20min-web-tests.log`, `/private/tmp/oisy-20min-focused-lint.log`,
`/private/tmp/oisy-20min-swift-lint.log`, `/private/tmp/oisy-20min-phone-build.log`,
`/private/tmp/oisy-20min-install.json` and `/private/tmp/oisy-20min-launch.json`.

## SDK migration preparation — 2026-10-27

Local branch `codex/ios-sdk-auth-preparation` starts from reviewed `1387b85ac`.
The working phone app and draft PR remain on `codex/ios-native-m1`; this preparation
has not switched authentication or added a runtime dependency.

Read [SDK authentication migration preparation](../../../../../mobile/capacitor/docs/sdk-auth-migration.md)
for the pinned release comparison, callback/provisioning changes, deployment checker
and implementation sequence. v0.11.1 lacks the newer public identity API needed by
our web adapter; its isolated SwiftPM probe also fails with HTTP 404 for the binary
assets. Live II exposes the session methods, but audit's Apple association and the
signed preview/profile do not yet authorize the SDK's HTTPS callback.

The preparation keeps Explore's read-only provider unchanged. Native enforcement
of transaction approval remains a separate change: SDK storage alone cannot
restrict a broad child credential already held by JavaScript.

Preparation validation: 12 deployment-check tests and four existing mobile build
configuration tests pass. Test type checking reports zero errors/warnings;
focused ESLint, formatting and the Capacitor/handoff documentation trees pass.
The live deployment check correctly fails the missing Apple association and
profile capabilities. The SDK package probe did not compile because binary
resolution failed. No SDK sign-in or signed principal proof was attempted.

## Authentication and code review — 2026-10-27

Start with [Authentication and Explore review](../../../../../mobile/capacitor/docs/authentication-review.md).
It links the relevant code, lists questions for II and compares the implementation
with `dfinity/icp-native-sdk` at `cc22ba56b6cbab384fcef02c8e3c8624341cc30a`.
The active app does not link that Swift SDK.

The review added checks for callback lifetime and repeated keys, kept the correct
welcome state after expiry or explicit logout, and fixed Explore cleanup when
expiry happens before account loading. It also removed unused native translations,
debug configuration and a token-menu variant. Historical native media and local
test logs stay outside review commits.

Sign-in still depends on the callback relay deployed on audit; its source is
missing from this branch. The prototype is ready for design and security review.
Production approval is still needed. These fixes were installed at 18:14; real
passkey acceptance was not repeated during that installation.

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
- The Capacitor guide and handoff pass documentation validation. The wider spec
  scan reports existing issues outside the edited docs. Staged sources contain
  no matching local API-key values, private provisioning files or generated mobile
  bundle output.

The runs emitted existing nested-mock, dependency and simulator warnings. The six
failed frontend tests passed after the fixture correction; the other checks above
passed. This review did not test Android, repeat real passkey approval or sign
transactions involving funds. Earlier phone checks are recorded below.

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
and worker responses cannot reinstall the old session. The original five-minute
child limit was replaced by a persisted 20-minute session deadline on 2026-10-28,
with **no automatic renewal**. Financial execution and contact editing
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

The WebKit fixture blocks network reads. It checks packaged code, worker
authentication, routing and expiry, but cannot validate real balances or history.
Its screenshots show loading and error states, including the web UI's initial
zero placeholder. A window capture can miss a WebKit composited layer after a
theme change, so the WebKit snapshots were also inspected.

Documentation: the Capacitor entry tree and handoff validator pass. The migration
spec directory-wide validator also reports legacy issues in other spec files;
current integration links were checked and repaired without a repository-wide cleanup.

The following sections record earlier implementation checkpoints. Their test
counts and installation status apply to those builds. The full frontend suite and
separate website build were run during the later review above; Android remains
untested.
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
mirroring the backend one-link contract. Fixtures use local signing keys rather
than real II canister signatures. The phone check is recorded in the next
paragraph. Logs are at
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

This update added three floating native tabs (Wallet, Activity, Explore) and a
separate glass More button with the OISY mark. The shared mobile host adds bottom
scroll padding to keep the end of the page reachable. At this checkpoint, web
dialogs ended above the controls; the later modal update changed that behavior.
Explore and sign-in used native safe-area insets. The keyboard layout guide kept
the navigation visible after returning from system authentication.

More opened a native menu with Notes, Earn, Borrow and Search. Notes initially
opened the shared modal; it moved to its own page in the update below. Earn and
Borrow used their existing web routes and loaders, and Search used the wallet's
token filter. Fixed route/message allowlists were extended; one wallet
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
Etherscan independently of balance loading. Adding the missing configuration
restored history without changing the provider.

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

- Real-device acceptance of fixed one-hour sessions; automatic renewal is deferred.
- II review of root-signature trust and cold-start callback recovery; see the SDK
  comparison before choosing a local verifier.
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

This update added a common mobile modal shell and a Notes page opened from More.
Feature logic stays in Svelte; native code controls navigation visibility. It
required no dependency, backend, authentication or cryptography changes.

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

This update replaced the signed-out placeholder with two illustrated welcome
screens. It kept the shared wallet screens, sign-in request, delegation validation
and frontend data pipeline. Both welcome screens use the OISY mark, an Internet
Identity sign-in button and an Explore shortcut.
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
preference was restored to its original off value after testing.

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
welcome paths remains pending.

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
