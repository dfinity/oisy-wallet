> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Compute asset type, and minting TCYCLES from ICP

- **Type:** `feat`
- **Area:** Frontend (asset-type filter, TCYCLES token page, Mint modal, ICP ledger and CMC calls, active user transactions); backend (one new active-user-transaction variant)
- **Status:** Ready for implementation. All open questions and decisions are resolved (§12).

---

## 1. Motivation

Cycles are what canisters on the Internet Computer burn for compute and storage. OISY already lists the cycles ledger's token, **TCYCLES** ("Trillion Cycles", ledger `um5iw-rqaaa-aaaaq-qaaba-cai`, 12 decimals, fee 0.0001 TCYCLES), but the only ways to get it are receiving it or swapping for it on a DEX. The NNS **Cycles Minting Canister** (CMC, `rkp4c-7iaaa-aaaaa-aaaca-cai`) turns ICP into cycles at the protocol rate and deposits them straight into a cycles-ledger account.

This feature:

1. adds a **Compute** asset type, last in the asset-type filter and visually accented, and moves TCYCLES into it from Stablecoins;
2. adds a **Mint** action on the TCYCLES token page that opens a **Mint TCYCLES** flow: the user enters an ICP amount, sees the TCYCLES it mints, and mints them into their own TCYCLES balance.

## 2. What exists already

### Asset types

- An asset type is the `category` token tag: `TokenCategoryTagValue` in `src/frontend/src/lib/enums/token-tag.ts` (`crypto`, `stablecoin`, `stock`, `commodity`). The tag schema (`src/frontend/src/lib/schema/token-tag.schema.ts`) is built from the enum, so a new value parses everywhere tags are read.
- `TokenTypeFilterBar.svelte` (token list) renders "All asset types" followed by one `PillButton` per enum value, in declaration order. `TokenCategoryFilterDropdown.svelte` (via `ModalTokensList.svelte`, e.g. Manage tokens) lists the same values. Filtering is `filterTokensByCategory` / `filterTokensUiByCategory` in `src/frontend/src/lib/utils/token-tag.utils.ts`; a token group matches when any member does. The user can hide the bar (`hideTokenCategoryFilterStore`).
- Labels: `token_tag.category.*` in `en.json` ("Crypto", "Stablecoins", "Stocks", "Commodities").
- TCYCLES carries `{ "type": "category", "value": "stablecoin" }`, set by hand in `src/frontend/src/env/tokens/tokens.icrc.json`; `scripts/build.tokens.icrc.ts` keeps hand-set fields when it refreshes metadata.
- TCYCLES is curated but not enabled by default (`ICRC_SUGGESTED_LEDGER_CANISTER_IDS` is empty in `tokens.icrc.additional.env.ts`), so most users have it disabled.
- An empty category shows `NothingFoundPlaceholder` from `TokensList.svelte`: "There are no $asset_type in your wallet" (`$asset_type` is the lowercased label) and, when disabled tokens of that type exist, "Choose from $count supported tokens to customize your portfolio view."

### Token page actions

- `src/frontend/src/lib/components/hero/Actions.svelte` renders the hero buttons. On an ICP-network token page that is Receive, Send, Swap (only when the token is swappable) and Buy (only with a `buy` config), so TCYCLES shows Receive / Send / Swap (ICPSwap lists it). The row already caps itself at four buttons (the `tooManyButtons` workaround drops Buy).
- A **Mint** hero button exists as a variant of Send: `SendButton.svelte` shows `IconPickaxe` and the label `mint.text.mint` when the user is the token's minting account. Reusable strings: `mint.text.mint` ("Mint"), `mint.text.minting` ("Minting..."), `mint.text.mint_review_subtitle` ("You mint").

### Flows to build on

- The **Convert** flow (`src/frontend/src/lib/components/convert/`: `ConvertModal` → `ConvertWizard`, `ConvertForm`, `ConvertReview` with `TokensReview`, fee rows, a progress step) is the nearest existing screen: source amount with Max, a "you receive" amount, fees, Review, progress. It assumes 1:1 conversions, so Mint reuses its building blocks rather than becoming another `ConvertWizard` branch.
- `src/frontend/src/icp/api/icp-ledger.api.ts` wraps the ICP ledger (`transfer`, `icrc1Transfer`); neither passes a memo today.
- **Active user transactions** (AUT): `ActiveUserTransactionData` in `src/shared/src/types/active_user_transaction.rs`, the poller `LoaderActiveUserTransactions.svelte`, and the **Active transactions** list behind the bell button in the app header (`ActiveUserTransactionsButton.svelte`, one `ActiveUserTransactionItem.svelte` per row). See PRODUCT.md → Swap → Cross-session settlement.
- **Recently used destinations** (`getKnownDestinations` in `src/frontend/src/lib/utils/transactions.utils.ts`) list every non-zero outgoing transfer, except those an ICRC-2 spender pulled (`excludeSpenderInitiated`).

### Reference, not template: the NNS dapp

The NNS dapp's Add cycles modal (`dfinity/nns-dapp`: `frontend/src/lib/modals/canisters/AddCyclesModal.svelte`, `frontend/src/lib/components/canisters/SelectCyclesCanister.svelte` and `ConfirmCyclesCanister.svelte`, `frontend/src/lib/api/canisters.api.ts`) is the reference for the mechanics: an ICP input with its T Cycles equivalent, a **Review cycles purchase** step, then an ICP transfer to the CMC followed by a notify call, retried while the CMC answers `Processing`. The UI follows OISY's own wizard conventions, not the NNS dapp's. The NNS dapp also differs in two ways that matter: it tops up a canister (`notify_top_up`) where OISY mints into the user's own balance (`notify_mint_cycles`), and its backend re-notifies a top-up the browser failed to finish, which OISY has no equivalent of (§6).

## 3. How minting works

Verified against `dfinity/ic` (`rs/nns/cmc/src/main.rs`, `lib.rs`) and `dfinity/cycles-ledger` (`cycles-ledger/src/storage.rs`, `config.rs`) on 2026-09-23.

1. **There is no approve flow.** The CMC's only user-facing update methods are `notify_top_up`, `notify_mint_cycles`, `notify_create_canister` and `create_canister`, and none of them uses ICRC-2. Minting is always a transfer, then a notify.
2. **Deposit.** The user transfers ICP to the CMC's account under the subaccount derived from **the user's own principal**, with memo `MINT` (`0x544e494d`; for an ICRC-1 transfer the CMC reads it from an 8-byte little-endian `icrc1_memo`). The ICP ledger fee (0.0001 ICP) is paid on top.
3. **Notify.** The user then calls `notify_mint_cycles` with that block index. The CMC checks the block (its subaccount for the caller, memo `MINT`), converts, and deposits into the caller's cycles-ledger account. **Only the user's own principal can notify its deposit**, so OISY's backend cannot finish a mint on the user's behalf.
4. **Amount.** cycles = ICP e8s × `xdr_permyriad_per_icp` (1 XDR = 10¹² cycles = 1 TCYCLES). The cycles ledger keeps a **0.0001 TCYCLES** deposit fee, so the credited amount is that minus 10⁸ cycles. The CMC's `minted` field is the figure before that fee.
5. **Rate.** The CMC refreshes its ICP/XDR rate every 5 minutes, and converts at the rate current when the notify runs, not when the user saw the quote.
6. **Idempotent.** Notifying the same block again returns the stored result; a concurrent call answers `Processing`. `Refunded`, `InvalidTransaction` and `TransactionTooOld` do not change on retry.
7. **Refund.** If the deposit into the cycles ledger fails (the amount does not cover the 0.0001 TCYCLES fee, or the CMC's network-wide mint limit, 150,000 TCYCLES per hour by default, is reached), the CMC returns the ICP **minus 0.0003 ICP**. At 0.0003 ICP or less, nothing comes back.
8. **Nothing expires quickly.** A deposit nobody notifies stays in the CMC's custody. It remains notifiable for a long but finite time: the CMC keeps its most recent 1,000,000 notification records.
9. **One way.** Cycles cannot be turned back into ICP.

## 4. Compute asset type

1. A new asset type **Compute** is added last: after Commodities in the filter bar and in the Manage tokens dropdown.
2. TCYCLES moves from Stablecoins to Compute and no longer appears under Stablecoins.
3. The Compute pill stands out from the other pills while unselected, through a tinted background from the brand colour family. The tint must stay distinct from the hover wash the unselected pills already use, in both light and dark mode. Selected, Compute looks like every other selected pill, so "which filter is on" reads the same everywhere. `PillButton` is shared (the share-note dialog and limit orders use it too), so the accent must not change those.
4. The empty state stays as it is, including "Choose from 1 supported tokens…", which points a user with TCYCLES disabled towards enabling it. Enabling TCYCLES by default is **out of scope**: a default-enabled token is not written to the user's profile, so it could never be withdrawn again without hiding it from users who hold a balance. That needs its own fix first.
5. One copy fix: the empty-state title "There are no $asset_type in your wallet" is not a sentence with "compute". Compute's version must read naturally (e.g. "There are no compute tokens in your wallet") in every shipped locale.
6. "Compute" is translated in the 14 shipped locales (`Languages` enum).
7. Nothing else changes: "All asset types", the hide-asset-types setting, the filtering rules, and the other categories.

## 5. Mint TCYCLES

### 5.1 Entry point

- On the TCYCLES token page, a **Mint** hero button appears as the fourth button, after Receive, Send and Swap (TCYCLES is swappable through ICPSwap). It has the same pickaxe icon and "Mint" label as the existing Mint variant of Send.
- It is always shown and always enabled, with no balance logic: with no ICP, the form shows 0 ICP available and never lets the user continue (§5.2). It must not reuse the page's outflow-disabled state, which follows the TCYCLES balance and would lock minting for exactly the users who have none yet.
- It appears only for the TCYCLES ledger the CMC deposits into (`um5iw-…`), and nowhere else (§10).
- It sits behind a rollout flag that is on for local and staging builds and off in production (`LOCAL || STAGING`). The flag stays off in production until a real mint on staging, including the recovery path of §6, has been verified. The Compute asset type (§4) is not flagged: it only changes presentation.

### 5.2 Form

Built from OISY's existing wizard pieces (the Convert flow's form, fees and review layout), not from the NNS dapp's.

- Title **Mint TCYCLES**.
- **What it does**, in one plain sentence under the title: minting creates new TCYCLES from ICP at the network's rate, and the ICP is burned. The name "Mint" is accurate but not self-explanatory, so this sentence carries the meaning (§12, D7).
- **ICP amount**: an input showing the user's ICP balance, with **Max** (balance − 0.0001 ICP) and the fiat value.
- **TCYCLES received**, updated as the user types: ICP amount × rate − the 0.0001 TCYCLES deposit fee, with its fiat value. It is shown as an estimate (≈), because the CMC converts at its rate when the mint runs.
- **Rate**: "1 ICP ≈ N TCYCLES", read from the CMC. It stays current while the form is open (the CMC moves every 5 minutes). The amount is disabled while the rate loads; if it cannot be loaded, the form says so and cannot continue.
- **Fees**: the ICP network fee (0.0001 ICP, on top of the amount) and the cycles-ledger fee (0.0001 TCYCLES, taken from what is received). There is no other conversion fee.
- **One-way notice**: minting cannot be reversed, and TCYCLES cannot be turned back into ICP.
- The user enters ICP only. Entering a TCYCLES target instead (the NNS dapp's two-way input) is not offered.
- The form cannot continue when the rate is missing, the amount is zero, the amount plus fee exceeds the balance (which covers a zero balance), or the estimate would not clear the deposit fee with a margin for a rate change before the mint runs. Such an amount is refunded minus 0.0003 ICP, and can be lost entirely (§3.7).

### 5.3 Review

Every OISY flow that moves funds has a review step (Send, Convert, Swap, Stake, Liquidium), and minting is irreversible, so Mint has one too.

- "You mint ≈ Y TCYCLES" and "You pay X ICP" with fiat values, the rate, both fees, and who mints: the NNS Cycles Minting Canister. The one-way notice is repeated. The button is **Mint**; Back returns to the form with the amount kept.
- The estimate is re-quoted at the CMC's current rate when Review opens.

### 5.4 Progress and result

- Steps: transferring ICP to the CMC, minting TCYCLES, done. The modal locks while a step is in flight, as Convert does.
- Success shows what was **actually credited** (the CMC's `minted` minus the 0.0001 TCYCLES deposit fee) and refreshes the TCYCLES and ICP balances.
- Once the ICP has left the wallet, a mint is never reported as failed because a notify call failed or answered `Processing`: those are retried. If the mint is still pending when the user closes the modal, it carries on in the background and shows in the header's Active transactions list (§6).
- A refund is reported as failed, saying that the ICP was returned minus 0.0003 ICP and giving the CMC's reason.
- If the ICP transfer itself fails, nothing has moved: it is an ordinary error, and the user can try again.

### 5.5 Afterwards

- TCYCLES Activity shows the cycles-ledger mint as an incoming mint (existing rendering).
- ICP Activity shows the deposit as an outgoing transfer to the CMC deposit account. **That account never appears among the recently used destinations and never counts as a familiar destination** (PRODUCT.md → Send → First-time destination addresses). A plain ICP send to it, made outside this flow and without the `MINT` memo, is never minted and cannot be recovered through OISY. The existing `transfer_from` filter does not catch it, because the deposit is an ordinary transfer (§3.1).

## 6. Settlement across sessions

Between the transfer and the notify, the ICP sits in the CMC's custody, and only the user's own principal can finish the mint (§3.3). A closed tab, a backgrounded phone or a logout in that window would otherwise strand it with nothing tracking it. The mint is therefore an **active user transaction** (AUT), like the Chain Fusion conversions (PRODUCT.md → Swap → Cross-session settlement). The guarantee:

> Once ICP has left the wallet, the mint is driven to **minted** or **refunded** without the user doing anything, across modal close, refresh, tab close and logout. Recovery never sends ICP; it only finishes a deposit that already exists.

1. **The row opens before the ICP transfer** (the OISY Trade precedent) and is updated with the block index once the transfer returns. If the row cannot be created (e.g. the per-user AUT cap of 100 is reached), the mint does not start and nothing moves (fail-closed).
2. A row whose transfer failed is closed as failed.
3. The global poller drives a row with a block index: `notify_mint_cycles` settles it as minted, refunded or failed (§3.6), while `Processing` or an unreachable CMC keeps it in flight.
4. A row whose transfer outcome was never observed (the tab died during the transfer call) is resolved by **looking the deposit up** in the user's ICP history: the transfer to the CMC deposit account with the `MINT` memo and the transfer creation timestamp stored in the row. It is never resolved by sending again. If no deposit is found once the transfer can no longer land, the row is closed as not sent, and nothing moved.
5. **The modal and the poller may both notify the same deposit.** That is harmless here (§3.6: one gets `Processing`, and both then read the same result), so unlike the ICPSwap migration no ownership guard is needed. Terminal side effects (balance refresh, analytics) still fire exactly once per mint.
6. The mint shows in the **Active transactions** list, the bell button in the app header (`ActiveUserTransactionsButton.svelte` in `Header.svelte`), with its status like any other row: "Mint X ICP → TCYCLES", the ICP network, and the Cycles Minting Canister as provider. The row component (`ActiveUserTransactionItem.svelte`) has one branch per kind of row, and on `main` it knows only swap providers and Liquidium. #14121 (open, stacked on #14109) adds the first kind that is not a swap, an XRP send, as its own branch with its own label, network and icon. The mint follows that pattern, but unlike an XRP send it has two tokens on one network, so it keeps the swap layout ("X ICP → TCYCLES", the network collapsing to "ICP") and writes the display refs the swap providers already write. Only the label ("Mint" instead of "Swap"), the provider name and the icon differ. IC tokens, ICP included, already map to backend token IDs (`toBackendTokenId`), so unlike XRP no mapping is added.
7. **Backend:** one new `ActiveUserTransactionData` variant for the mint. Adding a variant is a breaking candid change and ships alone as `feat(backend)!:` (precedents: #13710 Chain Fusion, #13796 OISY Trade; #14109 Xrp is open). The payload holds what is fixed at creation: source ICP, destination TCYCLES, the amount, and the ICP transfer's creation timestamp. The row opens before the transfer, so that timestamp is known up front; reused on a retry, it lets the ledger deduplicate the transfer, and it is what finds the block for recovery (§6.4). Only the block index, learned once the transfer returns, rides in `external_refs`.

## 7. CMC client

The mint needs `notify_mint_cycles`, which the pinned `@icp-sdk/canisters` 3.1.0 does not wrap (its `CmcCanister` only covers the rate). The wrapper arrived in 3.4.0, and moving to it is **not** a quick bump (checked 2026-09-23):

- `@icp-sdk/canisters` ≥ 3.4 requires `@icp-sdk/core` ^5 and `@dfinity/utils` ^4.1. OISY runs core 4.2.3 and utils 4.0.3.
- `@dfinity/oisy-wallet-signer` 6.0.0, the latest release, pins core ^4, canisters ~3.1.0 and utils ~4.0.3, so the bump needs a signer release first.
- `@dfinity/vetkeys` 0.4.0, the latest release and used for notes and tips, depends on `@dfinity/agent` ^3.1. Today it shares the agent with core 4 (which wraps agent 3.4.3); core 5 ships its own sources, so the two would split. Whether that breaks anything needs testing.
- core 5 is a real major: the agent sources are ported into the package, calls move to `/api/v4` and queries to `/api/v3`, deprecated APIs are removed, and certificate verification changes.
- The bump would also clean up two existing mismatches: `@icp-sdk/auth` 6.2.2 and `@icp-sdk/signer` 5.4.0 already declare core ^5 and run on core 4 only through `overrides`, and `@liquidium/client` bundles a second copy of core 5.4.0 and canisters 3.6.0.

So the SDK bump is its own project, and none is planned (2026-09-23). This feature does not wait for it (§12, D5): OISY adds the CMC the way it already added Kong, ICPSwap and XTC. That means a `dfx.json` entry pointing at the CMC's published candid, the generated bindings in `src/declarations/`, and a thin wrapper class under `src/frontend/src/icp/canisters/` for the two calls the mint needs: the rate, and `notify_mint_cycles`. Once the SDK bump lands, all three are deleted in favour of the SDK's `CmcCanister`.

## 8. Analytics

One structured event family, following the domain-service pattern in `docs/ai/frontend/analytics.md`: the mint funnel (modal opened; mint executing, then success or error, with a refund as an error with its own value), carrying the token symbols (ICP, TCYCLES), amounts and USD values, as `deposit_withdraw` does. It never carries a principal. The terminal event fires once, from the AUT (§6.5). Choosing the Compute filter is covered by the filter's existing tracking.

## 9. Acceptance criteria

**Compute**

- **AC1** The filter bar reads: All asset types, Crypto, Stablecoins, Stocks, Commodities, Compute. The Manage tokens category dropdown also lists Compute last.
- **AC2** Compute shows TCYCLES (when enabled) and nothing else; Stablecoins no longer shows TCYCLES.
- **AC3** In both themes, the unselected Compute pill is visibly distinct from the other unselected pills and from their hover state; the selected Compute pill looks the same as any other selected pill.
- **AC4** With TCYCLES disabled, Compute shows the empty state, with a grammatical title and the existing "Choose from … supported tokens" hint, in every shipped locale.

**Mint**

- **AC5** With the flag on, the TCYCLES page shows an always-enabled Mint button (pickaxe, "Mint") as its fourth hero button, after Receive, Send and Swap, and no other token page does. With the flag off, it is absent.
- **AC6** With 0 ICP, the form shows 0 ICP available and cannot continue.
- **AC7** The form shows the ICP balance, Max (balance − 0.0001 ICP), the estimate (ICP × rate − 0.0001 TCYCLES) as the user types, the rate, both fees and the one-way notice.
- **AC8** The form cannot continue without a rate, with a zero amount, with an amount above the balance minus the fee, or with an amount whose estimate does not clear the deposit fee.
- **AC9** Review shows what is paid and received with fiat values, the rate, the fees and the CMC as minter; it re-quotes when it opens and keeps the amount on Back.
- **AC10** Minting moves exactly the entered ICP (plus the fee) to the CMC deposit account of the user's principal with the `MINT` memo; the CMC credits the user's default TCYCLES account; the success state shows the credited amount.
- **AC11** After the transfer, `Processing` or a failed notify call never shows the mint as failed.
- **AC12** A refund is shown as failed, stating that the ICP came back minus 0.0003 ICP.
- **AC13** A mint whose modal was closed, or whose tab was refreshed or closed, or whose user logged out between the transfer and the notify, completes (or shows as refunded) in the next session without user action. No recovery path ever sends ICP.
- **AC14** If the AUT row cannot be created, no ICP moves.
- **AC15** A mint in flight, minted or failed shows in the Active transactions list as "Mint X ICP → TCYCLES" with the Cycles Minting Canister as provider.
- **AC16** The CMC deposit account never appears among the recently used ICP destinations and never suppresses the first-time destination warning.
- **AC17** The mint analytics fire as specified, once per mint, and never carry a principal.
- **AC18** PRODUCT.md documents the Compute asset type and minting, including the non-goals.

## 10. Non-goals

- TCYCLES → ICP (the CMC cannot do it).
- Topping up a canister (`notify_top_up`, the NNS dapp form's actual purpose), or sending cycles to a canister (the cycles ledger's `withdraw`). Both are natural follow-ups.
- Minting into a subaccount or for another principal, or with a custom deposit memo.
- A Mint entry on the ICP page, or the CMC as a Swap provider (the "Chain Fusion as a swap provider" pattern).
- Enabling TCYCLES by default (§4.4).
- Labelling the ICP deposit as a mint in Activity (follow-up).
- Moving other cycles-backed tokens into Compute. XTC (the DIP20 "Cycles" token) stays under Crypto: this spec is about TCYCLES.
- The `@icp-sdk/core` / `@icp-sdk/canisters` bump (§7).

## 11. Implementation plan (atomic PRs)

1. `feat(frontend): add a Compute asset type and move TCYCLES into it`: §4, all locales, tests, PRODUCT.md (Tokens). Unflagged.
2. `feat(backend)!: add a cycles-mint active-user-transaction variant`: §6.7 on its own, with a `BREAKING CHANGE:` line.
3. `feat(frontend): mint cycles through the CMC`: the vendored CMC candid and wrapper (§7), the ICP transfer with a memo, the mint service with its retry semantics (§3.6), the recently-used exclusion (§5.5), unit tests. No UI.
4. `feat(frontend): mint TCYCLES from ICP on the TCYCLES page`: the flag, the button, the modal (form, review, progress), the AUT row, its poller handling and its Active transactions entry (§6), analytics, all locales, component tests, PRODUCT.md. Stacked on 2 and 3.
5. Later: turn the flag on in production after a real mint on staging. Staging talks to the mainnet CMC and ledgers, so QA spends real ICP; small amounts suffice.

**Overlap with the open XRP stack.** #14109 (`feat(backend)!: add an Xrp active-user-transaction variant`) adds a variant to the same enum as PR 2, and #14121 changes the same row component and poller (`ActiveUserTransactionItem.svelte`, `LoaderActiveUserTransactions.svelte`) as PR 4. Whether #14109 lands is open, so PR 2 does not wait for it. The two stay compatible in either order: stored rows are Candid, which identifies a variant by its name, so neither PR changes how the other's rows, or any existing row, decode; and PR 2 places its type, validation and tests away from #14109's additions. Whichever merges second resolves only mechanical conflicts (the enum's last line and the import lists) by keeping both. Each breaking candid change still lands on its own. PR 4 builds on the XRP row's branch pattern once #14121 is in, and if #14121 is still open when PR 4 is ready, whichever lands second takes the merge.

The modal is mostly translated copy, so expect pressure on `compare-sizes`; the precedent is a maintainer override, not a split. Every new component and derived store ships with tests (`test-coverage` gate).

## 12. Open questions and pending decisions

### Open questions (facts to confirm)

None.

### Pending decisions (facts are clear)

None.

### Resolved

- **D1 Review step:** yes (§5.3).
- **D2 Settlement:** an AUT (§6). The CMC has no approve flow, so there is no way around the two steps.
- **D3 Compute pill accent:** a tinted background from the brand colour family, distinct from the hover wash (§4.3). The alternatives were an outline, an icon, and the navigation's "New" tag.
- **D4 Rollout:** Compute ships unflagged; Mint sits behind `LOCAL || STAGING` until verified on staging (§5.1).
- **D5 CMC client:** add the CMC to OISY the way Kong, ICPSwap and XTC were added: a `dfx.json` entry, generated bindings in `src/declarations/`, and a thin wrapper class (§7). Approved on 2026-09-24, as CLAUDE.md requires for `declarations/`. The rejected alternatives were the `@icp-sdk/core` 5 bump (a project of its own, gated on an `oisy-wallet-signer` release) and forcing `@icp-sdk/canisters` 3.4 onto core 4 through `overrides` (untested, and it would override the signer's pin).
- **D6 XTC:** stays under Crypto (§10).
- **D7 Name:** the action is called **Mint**, because that is what happens: the Cycles Minting Canister creates new cycles and burns the ICP, and the TCYCLES history records a mint. Its main value is setting the action apart from the page's Swap button, which trades at the market price through ICPSwap. The rejected names were Buy (OISY's fiat on-ramp), Convert (OISY's 1:1 conversions that go both ways, with buttons labelled by the target token), Swap (already on the page), and Top up (the IC's term for adding cycles to a canister, kept for that follow-up). The existing "Mint" label, which Send shows to a token's minting account, never appears on the TCYCLES page.
- **Q1 Swap on the TCYCLES page:** shown, since ICPSwap lists TCYCLES, so Mint is the fourth hero button (§5.1).
- **Q2 SDK bump:** no `@icp-sdk/core` 5 bump is planned, so the mint cannot wait for the SDK's wrapper (§7).
- The modal follows OISY's UI; the NNS dapp is a reference only.
- The Mint button is always enabled; the form alone handles an empty ICP balance.
- TCYCLES is not enabled by default, and the existing empty-state hint stays (§4.4).
