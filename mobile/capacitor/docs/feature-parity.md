---
title: Mobile feature coverage and navigation plan
tags: [mobile, ios, product, navigation, planning]
---

# Mobile feature coverage and navigation plan

Source audit on 2026-10-28 of `codex/ios-sdk-auth-preparation`, based on
`646d0b85d` plus local session, navigation, refresh and ICP/ck Send changes.
This inventories the branch, not every deployed environment. The stages below
remain proposed except where implementation and evidence are stated explicitly.
They do not replace the migration spec's cross-platform milestones.

The mobile app loads the normal web routes, components, stores and workers from
the configured live website. Expand this implementation; keep Swift responsible for system integration,
navigation controls, authentication and isolated Explore. Do not create another
wallet UI or data pipeline.

## Presentation update (2026-11-09)

Send, Swap, Contacts and other shared multi-step wizards use full-page mobile
presentation with Back/Cancel controls. They keep the existing web form and
cancellation logic; this does not add independent native screens or route stacks.
Accessory dialogs, such as Sorting, filters and receive-address QR details, can
use the optional `nativeSheets` host capability. See the
[system sheet contract](./shared-web-contract.md#system-sheets) for ownership,
fallback behavior and dismissal guards.

The simulator checks cover same-document/session preservation, accessory dismissal,
full-page Send/Swap review and cancellation, Contacts, Notes editing, enlarged text
and Back restoration. A separate native test verifies that hidden Wallet and
native Account presentation reject a delayed sheet request. No funded transaction
was submitted.

The frontend at `d114b2b7ae` was deployed to audit in
[run 42642935268](https://github.com/dfinity/oisy-wallet/actions/runs/42642935268).
Published assets contain the sheet adapter and exclude test fixtures; II callback
and Apple association files are unchanged. The signed app, including the native
visibility guard, was installed over the existing iPhone preview and launched on
2026-11-09. The user confirmed on the phone that Sorting opens and closes as a
native sheet, Send/Swap/Contacts open full-screen, and Wallet still shows the
expected balances. This confirms presentation acceptance, not funded transaction
execution.

A subsequent phone recording exposed a web-backdrop flash on opening transaction
details and a safe-area jump on closing. The follow-up hides the pending backdrop,
clears web sheet layout before release, and holds the page image until WebKit has
painted the restored viewport and scroll position. The simulator checks the real
shared transaction dialog, unchanged document/session, native scroll restoration
and the existing primary flows. All 89 focused frontend tests and 10 simulator
checks passed, with zero Svelte/type warnings. The release-order regression fails
against the previous implementation. Recorded simulator frames show the corrected
transition.

The fix at `380cb0dda1` was deployed to audit in
[run 42648864851](https://github.com/dfinity/oisy-wallet/actions/runs/42648864851),
and the signed update was installed and launched on the iPhone on 2026-11-09.
Public CSS contains the pending-backdrop fix; test fixtures are absent and auth
association files are unchanged. The user confirmed on the iPhone that transaction
details now open and close smoothly, with the flash and list jump resolved.

## Reading the inventory

“Reachable” means the source exposes a mobile entry point and permits its route.
It does not prove funded-account behavior, provider availability or phone support
for every action. Existing phone acceptance includes ICP balances, token/Activity
navigation and Base ETH history. This audit did not execute financial operations.

Frontend paths in the table are relative to `src/frontend/src/`. Mobile paths
are relative to `mobile/capacitor/`. Environment flags still apply.

Local phone preview configuration on 2026-10-28: the user requested temporary
Solana-mainnet and Robinhood disablement while Alchemy rejects the local app
origin. Existing mainnet flags are set only in the ignored worktree env; they do
not change website source or deployment. XRP remains enabled with the endpoint
from the published web wallet. Restore the disabled networks after an approved
RPC key accepts the app origin. Solana devnet is a separate testnet flag path;
these mainnet switches do not certify or disable devnet support.

## Feature inventory

| Feature                                   | Shared web source                                                                          | Current iOS coverage                                                                              | Work needed                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Wallet, token groups, balances and prices | `routes/(app)/+page.svelte`, `lib/components/tokens/Assets.svelte`                         | Shared page reachable; Earning/Trading/Borrowing asset tabs hidden                                | Preserve filtering, grouping and scroll across navigation; verify loading, unavailable and retry states        |
| Token detail and token history            | `routes/(app)/transactions/+page.svelte`, chain transaction components                     | Shared page reachable with `network` and `token`                                                  | Back and list scroll implemented; history pagination and device swipe acceptance remain                        |
| Activity and transaction detail           | `routes/(app)/activity/+page.svelte`, `lib/components/transactions/AllTransactions.svelte` | Shared Activity; transaction details are usually modals; header pending-transaction entry missing | Modal-first Back, pending-operation access and filter restoration                                              |
| Receive, QR, addresses and copy           | `lib/components/receive/`, per-chain receive components                                    | Receive retained in shared hero actions                                                           | Verify address/network correctness and copy; optional native share adapter                                     |
| Manage and import tokens                  | `ManageTokensModal.svelte`, `AddTokenByNetwork.svelte`, `AddTokenReviewByNetwork.svelte`   | Shared management flow reachable; writes are not globally disabled                                | Keyboard, validation, duplicate detection, save/cancel and persistence acceptance                              |
| Search                                    | `TokensFilter.svelte`, native More → `/?search=true`                                       | Token filtering only                                                                              | Query/results retained on token Back; add actions only when availability is defined                            |
| Send                                      | `lib/components/send/SendModal.svelte`, `SendWizard.svelte`, per-chain services            | Shared ICP/ck/ETH/ERC-20 Send enabled; other chains hidden                                        | Funded acceptance; ICP result persistence, EVM unknown-send recovery; then BTC, SOL/XRP                        |
| Swap and conversion                       | `lib/components/swap/`, `lib/types/swap.ts`, per-chain Convert components                  | Shared ICP/ck ICPSwap execution and durable stage records; Convert/cycles hidden                  | Funded acceptance and resolution of unknown pool operations; other providers deferred                          |
| Buy                                       | `BuyModalContent.svelte`, `OnramperWidget.svelte`                                          | Hidden; browser widget requires iframe, popups and payment/camera integration                     | Provider-approved external flow/return or a deliberately supported embedding; current mobile CSP blocks frames |
| Contacts                                  | `lib/components/address-book/`, `ios/App/App/AccountView.swift`                            | Saved contacts visible; create/edit/delete hidden                                                 | Shared editing forms, discard protection, backend persistence and network validation                           |
| Notes                                     | `routes/(app)/notes/+page.svelte`, `Notes.svelte`                                          | Shared list/editor/create/save/delete/share controls; not read-only                               | Real encryption/share acceptance; recipient share-link route is not integrated                                 |
| NFTs                                      | `routes/(app)/collectibles/+page.svelte`, collection/NFT/manage components                 | No native entry; route and collection/collectible query keys blocked                              | Collections → NFT detail, image consent, management/import and spam controls; send after execution gates       |
| Preferences                               | `routes/(app)/settings/+page.svelte`, `SettingsPreferences.svelte`                         | Shared settings reachable; full web profile menu replaced                                         | Check currency/language/networks; restore privacy/theme controls in Account without new stores                 |
| Export                                    | `SettingsExportData.svelte`, `lib/services/export-data.services.ts`                        | CSV button rendered; browser download behavior on iOS unproven                                    | Narrow file-export/share capability and device test; visible UI is not native support                          |
| Earn and positions                        | `/earn/`, `/earning/`, `/earn/autopilot/`, provider components                             | Overview reachable; CTAs hidden, positions/provider routes blocked                                | Overview → provider/position first; deposit/withdraw after execution validation                                |
| Borrow and supply                         | `/borrow/`, `/borrowings/`, `/providers/liquidium/`                                        | Overview reachable; actions and other routes blocked                                              | Position views, then supply/borrow/repay/withdraw lifecycle                                                    |
| OISY Trade                                | `/trading/`, `/providers/oisy-trade/`                                                      | Routes and asset tab blocked                                                                      | Portfolio, positions, active/history orders; deposit/withdraw/order/cancel separately                          |
| Rewards, referral and VIP                 | `/rewards/`, Rewards components, `lib/components/core/Menu.svelte`                         | Native entry absent; route blocked; profile-menu entries displaced                                | Expose applicable shared screens and respect account eligibility                                               |
| Explore                                   | Web `/explore/`, `DappsExplorer.svelte`; native `ios/App/App/Explore/`                     | Native directory/browser with Uniswap/1inch; isolated consent and Sepolia reads                   | Reuse discovery metadata where useful; keep untrusted runtime separate; signing is separate work               |
| WalletConnect                             | `/wc/`, wallet-connect components and listener                                             | Listener disabled, entry removed, route blocked                                                   | QR/deep links, chain/session consent, pending requests, disconnect and execution scope                         |
| Pay and scanner                           | `lib/components/pay/`, `scanner/`, web Header/Menu                                         | Entry points removed                                                                              | Camera lifecycle, existing URI parsers, allowed schemes and review before execution                            |
| Tips and claims                           | Public `tip/` routes and Tip dialogs                                                       | No entry; claim routes outside allowlist                                                          | Deep-link/recipient flow, eligibility and interrupted-operation recovery                                       |
| Help and legal                            | `/help/`, public legal pages and support links                                             | No equivalent Account section; Help route blocked                                                 | Explicit internal destination or approved external link handling                                               |
| AI assistant                              | `lib/components/ai-assistant/` and tools                                                   | Console entry hidden                                                                              | Defer until core flows are stable; retain feature flag/opt-in and transaction review                           |

The route gate currently accepts `/`, `/index.html`, `/activity/`, `/transactions/`,
`/settings/`, `/notes/`, `/earn/` and `/borrow/`, with only `network`, `token` and
`search` query keys. Both [web policy](../../../src/frontend/src/lib/utils/mobile-navigation.utils.ts)
and [native policy](../ios/App/App/TrustedWalletViewController.swift) enforce it.
Adding a menu item alone cannot unlock another feature.

`PERSONAL_NOTES_ENABLED`, `HELP_ENABLED`, `OISY_TRADE_ENABLED` and
`LIQUIDIUM_ENABLED` are on in this branch. Earn and AI depend on environment
configuration. Onramper is enabled for local/staging, including audit, but disabled
for beta/production. The swap provider enum includes ICP Swap, KongSwap, Velora,
Near Intents, OneSec, Chain Fusion, OISY Trade and LI.FI; this is an implementation
inventory, not evidence that every pair/provider works in the current environment.

## Proposed navigation

Keep Wallet, Activity and Explore as root tabs. Keep More as a menu, not a fourth
history stack. More can expose Notes, NFTs, Earn, Borrow, Trade, Rewards and Search
as they become supported; honor feature flags rather than showing dead entries.
Account owns preferences, contacts, connected apps, help/legal and sign-out.
Search should return tokens and supported actions from shared definitions.

Web owns feature routes, nested steps and form state. Native owns root controls,
system presentations and gesture integration. One trusted wallet WebView remains
mounted, with Explore using separate storage and no wallet bridge.

| Origin and destination                        | Back behavior                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Wallet → token                                | Restore Wallet's filters, expanded groups and scroll                                     |
| Search → token                                | Restore the search query/results, not an unconditional jump to Wallet                    |
| Token or Activity → transaction modal         | Dismiss the top modal first; keep underlying route and scroll                            |
| Notes list → note                             | Return to the list; local Notes step state must participate in Back                      |
| Notes editor                                  | Cancel/discard through the editor; never silently lose unsaved text                      |
| Account → Contacts/Preferences                | Return to Account; preserve this origin explicitly                                       |
| NFT collection → item; Earn/Borrow → position | Pop within the feature when these routes are enabled                                     |
| Manage/import → selector/review               | Close the innermost step first and protect entered values                                |
| Future Send/Swap wizard                       | Previous editable step or confirmed cancellation; protect submission and never replay it |
| Wallet/Activity/Explore root                  | No edge swipe into a different tab                                                       |
| Explore dApp                                  | Independent browser history and origin/consent checks                                    |
| Expiry/logout/system authentication           | Native lifecycle wins; clear private route/draft state                                   |

Return to an inactive tab should restore its last location. Reselecting the active
tab should return to its root, then scroll to the top on another tap. Opening a
More feature should remember its origin; Back at that feature's root returns
there. These are proposed semantics and need tests before becoming product claims.

## Edge-swipe feasibility and implementation

The trusted wallet now uses a native edge pan with a captured Wallet/Search parent
and one live WebView. Stock WebKit history gestures are disabled: the user's device
recording showed the outgoing token page behind itself during SPA Back. The shared
router still owns the route change, scroll and search state. Capture failure leaves
the visible Back control usable. See the [interaction contract](./shared-web-contract.md#token-navigation-contract)
for validation, privacy cleanup and bounded capture/return behavior.

Roots, pending tab requests, Account and blocking overlays disable the gesture.
Explore retains its independent browser history. Root requests replace history;
this is one approved parent, not independent retained tab stacks.

Wallet also has native pull-to-refresh with one light haptic. It refreshes the
shared balance and price owners without replacing the document or session. The
[refresh contract](./shared-web-contract.md#wallet-refresh-contract) describes
completion, failure and cancellation behavior. Simulator callback tests do not
establish physical haptic feel or real network correctness.

Remaining navigation work:

1. Confirm completed/cancelled edge gestures on a physical device, including a
   modal opened over a token, background return and expiry.
2. Define retained tab/More origin behavior without relying on WebKit's single
   linear back-forward list to represent multiple stacks.
3. Add Notes editor and Account return guards, then nested feature/form steps.
   Keep visible Back/Cancel controls; a gesture must never be the only exit.

A UINavigationController around the existing host does not turn Svelte routes
into native screens. Creating a WebView for every token would duplicate runtimes
and complicate session/state ownership. Keep the retained host; Capacitor supports
[custom CAPBridgeViewController subclasses](https://capacitorjs.com/docs/ios/viewcontroller).

[SvelteKit's shallow-routing guidance](https://svelte.dev/docs/kit/shallow-routing)
explains why a modal without history can send Back to the wrong page. The current
online docs describe v3 APIs; this branch uses SvelteKit `^2.70.2`. Use the installed
v2 APIs (`pushState`, `replaceState`, `goto` options and page snapshots) and do not
copy v3 examples as part of this task. Snapshots can persist through sessionStorage:
keep private notes, recipient inputs and credentials out of history snapshots.

## Delivery stages

These batches refine the existing migration roadmap. Android and release approval
remain separate acceptance work; shared source alone does not establish parity.

| Stage                            | Deliverable                                                                                                                                             | Exit evidence                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Navigation and core screens   | Wallet/Token/Activity/Search Back model, interactive-swipe spike, modal precedence, pending operations, useful Account/More destinations                | Origin/scroll restored; cancelled swipe/discard changes nothing; no cross-tab pop or extra runtime; expiry clears the stack                                                     |
| 2. Everyday coverage             | Receive/copy/share, token management/import, contacts editing, Notes/share handling, preferences/privacy/theme, Help/legal; NFT collection/detail reads | Real shared forms save/cancel correctly; no missing native entry; export/camera/share tested individually; ordinary browser remains correct                                     |
| 3. Send                          | Reuse shared ICP/ICRC send first, then EVM and remaining chains                                                                                         | Approved testnet scope; address/network/fee/review correctness; expiry before submission, pending recovery and no duplicate broadcast; mainnet acceptance separately authorized |
| 4. Swap and conversions          | One same-chain provider, then allowances and multi-step/cross-chain flows                                                                               | Quote expiry and slippage, approval/submit errors, background return and operation recovery; no automatic replay after sign-in                                                  |
| 5. Provider and app integrations | Earn/Borrow/Trade operations, Buy, Rewards/Tips, Pay/scanner, WalletConnect and Explore signing                                                         | Provider-specific return/deep-link flows, supported networks, native consent and session cleanup; separate signing review and device evidence                                   |
| 6. Optional surfaces             | AI assistant and lower-priority experiments                                                                                                             | Existing opt-in/flags preserved; supported actions use the same review and execution paths                                                                                      |

Stages 1–2 can be broken into small screen-focused PRs. Stage 3's fee/review work
can start after the Back/form guards are stable rather than waiting for every NFT
or reward screen. Do not enable all hidden actions by deleting `!MOBILE_SHELL`.
As actions become supported, separate platform presentation from a small explicit
feature-availability policy. That policy is not cryptographic authorization.

## First implementation slice

Implemented in the working branch: Wallet/Search → Token → Back, exact parent
tracking, in-memory list scroll, retained search input, acknowledged root requests
and blocking-overlay protection. Existing shared routes and stores remain the
feature implementation. The iOS modal scroll lock also now restores position only
after a real lock and preserves its original offset across modal steps.

Automated WebKit coverage uses an isolated profile/balance fixture with main-frame
and worker network calls blocked. It does not establish funded-account behavior.
Physical acceptance of the revised edge gesture and independent per-tab stacks remain open.
The next slice is Notes editor/Account return guards, followed by Receive and token
management acceptance. ICP/ck-token Send now has scoped entry and submission guards;
see the [Send contract](./shared-web-contract.md#shared-send) for limitations.
Same-chain ICP/ck Swap now submits through ICPSwap with durable stage records;
ETH/ERC-20 Send records hash/nonce before broadcast. See the
[transaction contract](./shared-web-contract.md#durable-mobile-operation-records)
for pending-state limitations and required funded acceptance.

## Dependencies

| Document                                                                                                                | Purpose                                            |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| [Shared web compatibility](./shared-web-contract.md)                                                                    | Ownership, change checks and agent workflow        |
| [Session boundary](./session-boundary.md)                                                                               | Fixed deadline, private keys and runtime isolation |
| [Migration spec](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation.md) | Cross-platform milestones and acceptance           |

## Related

| Document                                                                                                                           | Purpose                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Web product behavior](../../../docs/ai/PRODUCT.md)                                                                                | Product intent; code remains authoritative when route descriptions differ |
| [Migration handoff](../../../docs/ai/spec-driven-development/specs/2026-10-27-feat-mobile-shared-web-native-navigation/handoff.md) | Recorded builds and physical-device evidence                              |
