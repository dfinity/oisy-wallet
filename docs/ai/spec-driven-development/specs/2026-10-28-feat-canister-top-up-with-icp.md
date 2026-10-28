> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Canister top-up, paid with ICP or TCYCLES

- **Type:** `feat`
- **Area:** Frontend (navigation, the Top up modal, CMC calls, ICP activity labels, recently used destinations), Backend (one active-user-transaction variant)
- **Status:** Draft. All decisions are resolved (§12).

---

## 1. Motivation

OISY can top up a canister, but only from TCYCLES and only from the TCYCLES token page (PRODUCT.md → Top up a canister). A user who holds ICP has to mint TCYCLES first and then top up: two flows, two confirmations and two extra cycles-ledger fees.

The NNS Cycles Minting Canister (CMC) can turn ICP into cycles and put them straight into a canister: an ICP transfer followed by `notify_top_up`. This feature adds that path and makes topping up an OISY feature of its own instead of a feature of one token: a **Canister top-up** item in the navigation opens the flow, and the user pays with ICP or TCYCLES.

It also lets the user pick the canister from their contacts, which the TCYCLES top-up does not offer today.

## 2. What exists already

- **Top up with TCYCLES**: the Top up hero button on the TCYCLES page (`src/frontend/src/lib/components/hero/Actions.svelte`, `CyclesTopUpButton.svelte`) opens the modal in `src/frontend/src/icp/components/cycles-top-up/` (canister, amount, review, progress, `CyclesTopUpRecentCanisters.svelte`), titled "Top up a canister". The service is `src/frontend/src/icp/services/cycles-top-up.services.ts`, and the store of unanswered requests is `src/frontend/src/icp/stores/cycles-top-up.store.ts`. `CYCLES_TOP_UP_ENABLED` is on in every environment and kept as a kill switch.
- **Canister step**: one input plus "Recently topped up", the canisters the loaded TCYCLES history shows top-ups to, each shown as its shortened ID with no contact name. There is no Contacts list. `parseCanisterId` (`src/frontend/src/icp/utils/cycles-top-up.utils.ts`) accepts canister IDs only, and `getCanisterExistence` checks that the canister exists.
- **TCYCLES history is loaded on every page** while TCYCLES is enabled: the wallet workers run for every enabled IC token (`IcLoaderWallets.svelte`).
- **Mint**: `src/frontend/src/icp/components/cycles-mint/` and `src/frontend/src/icp/services/cycles-mint.services.ts` already send ICP to the CMC with a memo (a `Duplicate` answer gives back the original block), notify the CMC with retries, and hand an unfinished mint to the background. The CMC wrapper is `src/frontend/src/icp/canisters/cmc.canister.ts` (the ICP/XDR rate and `notify_mint_cycles`), with constants in `src/frontend/src/icp/constants/cmc.constants.ts`. The vendored Candid (`src/declarations/cmc/cmc.did`) already declares `notify_top_up`.
- **Active user transactions (AUT)**: the `CyclesMint` variant (`src/shared/src/types/active_user_transaction.rs`) holds the source and destination tokens, the amount and the transfer's creation timestamp; it has no field for a canister. The poller is `LoaderActiveUserTransactions.svelte`, and the mint's row helpers are in `src/frontend/src/lib/utils/cycles-mint-active-tx.utils.ts`. A user holds at most 100 rows across every flow, and a finished row stays until the user dismisses it or a new row needs its place (PRODUCT.md → Swap → Cross-session settlement).
- **Navigation**: `src/frontend/src/lib/constants/navigation.constants.ts`. The desktop More section holds Notes, Explore and Rewards; the mobile More sheet holds NFTs, Explore, Rewards, Help and Settings. Notes is the precedent for an item that opens a modal instead of a page (`onclick` in `NavigationMenuMainItems.svelte`), so it never takes the "current page" treatment.
- **Send's destination step**: two tabs, Recently used and Contacts (`SendDestinationTabs.svelte`). Recently used names a destination that belongs to a contact (`KnownDestinations.svelte`), Contacts lists one row per contact address (`SendContacts.svelte`), and each tab has its own empty state. Send always opens on Recently used (`SendModal.svelte`).
- **ICP activity**: `mapIcpTransaction` (`src/frontend/src/icp/utils/icp-transactions.utils.ts`) does not read the memo. `icKnownDestinations` (`src/frontend/src/icp/derived/ic-transactions.derived.ts`) leaves the user's CMC deposit account for Mint out of the recently used destinations.
- **Open drafts**: #14448 extracts the TCYCLES top-up wizard from its modal, and #14449 builds on it to ask "Send or Top up" when TCYCLES is picked in Send. Both touch the wizard this feature extends (§11).

## 3. How an ICP top-up works

Verified on 2026-10-28 against `dfinity/ic` (`rs/nns/cmc/src/main.rs`, `rs/nns/cmc/src/lib.rs`, `rs/ledger_suite/icp/ledger/src/main.rs`).

1. **Deposit.** The user transfers ICP to the CMC's account under the subaccount derived from **the target canister's ID**, with memo `TPUP` (`0x50555054`; for an ICRC-1 transfer, as an 8-byte little-endian `icrc1_memo`, as Mint does for `MINT`). The ICP ledger fee (0.0001 ICP) is paid on top.
2. **Notify.** `notify_top_up { block_index, canister_id }`. The CMC builds the expected account from `canister_id`, checks that the block went there with the `TPUP` memo, converts at its current rate and deposits the cycles into the canister through the management canister. It answers with the number of cycles deposited. There is no cycles-ledger step, so no cycles-ledger fee.
3. **Anyone may notify, but nobody can redirect.** `notify_top_up` has no caller check. A notify that names another canister fails, because that canister's account is not the block's destination, so the only notify that works delivers the cycles to the canister the transfer was made for. A refund goes back to the account that sent the ICP. (Mint differs: only the user's own principal can notify a mint.)
4. **The chain does not name the canister.** An ICP transfer has one memo: `icrc1_transfer` writes only the ICRC-1 memo, and the legacy `transfer` writes only the legacy number memo. The CMC accepts only exactly `TPUP` there, so the canister ID cannot ride along. The ICP ledger records the destination only as an account identifier, a hash of the CMC's principal and the subaccount, so the canister cannot be read back from the block or the index.
5. **Idempotent, with the same errors as Mint.** Notifying the same block again returns the stored result; a concurrent call answers `Processing`. `Refunded` is final. Every other error clears the block's status, so a later notify runs again; `InvalidTransaction` and `TransactionTooOld` simply repeat. Of the CMC's `Other` codes, a top-up can get `Internal` (1), `FailedToFetchBlock` (2) and `RefundFailed` (3); the others belong to other methods.
6. **Refund.** If the deposit fails (no such canister, or the CMC's network-wide minting limit is reached), the CMC returns the ICP **minus 0.0003 ICP**: the 0.0001 ICP fee of the refund transfer plus 0.0002 ICP it burns. At 0.0003 ICP or less, nothing comes back. The refund is a plain transfer with no memo.
7. **Notify window.** As for Mint, the CMC keeps its most recent 1,000,000 notification records; once they have moved past the block, `notify_top_up` answers `TransactionTooOld` and the ICP stays in the CMC's custody for good.
8. **One way.** Cycles in a canister do not come back.

## 4. Entry points

1. **Navigation.** A **Canister top-up** item in the More group, after Rewards, with the fuel pump icon of the Top up hero button. On desktop the More section reads Notes, Explore, Rewards, Canister top-up; on mobile the More sheet reads NFTs, Explore, Rewards, Canister top-up, Help, Settings. It opens the Canister top-up modal, as Notes opens its modal, and never takes the "current page" treatment. The label leads with "canister": a plain "Top up" in a wallet's navigation reads as adding funds to the wallet.
2. **TCYCLES page.** The Top up hero button stays, with its label, its icon and its rule for when it is enabled. It opens the same flow with TCYCLES already picked, so it never shows the token picker.
3. The modal is titled **Canister top-up** from both entry points.
4. **Rollout.** A new flag gates the navigation item and every change to the Top up flow (paying with ICP, the token picker, the title, the canister step's tabs): on for local and staging builds until a real ICP top-up on staging, the recovery path of §6 included, has been verified; then on everywhere and kept as a kill switch. The ICP Activity label and the Recently used exclusion (§5.6) are not flagged: they only describe transfers that already exist. The navigation item ships only together with paying with ICP, never before it. `CYCLES_TOP_UP_ENABLED` keeps governing TCYCLES: while it is off, the TCYCLES page has no Top up button, as today, and the flow does not offer TCYCLES.

## 5. Canister top-up

The steps are: token (only when needed), canister, amount, review, progress.

### 5.1 Token

1. A token is **usable** when its balance covers the network fee plus the smallest amount the flow accepts: more than 0.0004 ICP (an amount above 0.0003 ICP, §5.3, plus the 0.0001 ICP fee), or more than 0.0002 TCYCLES (an amount above 0.0001 TCYCLES plus the 0.0001 TCYCLES fee). A balance that is not loaded counts as zero, and so does TCYCLES while it is not enabled.
2. **Both usable**: a picker lists ICP and TCYCLES with their balances. Picking one goes to the canister step, whose Back returns to the picker.
3. **One usable**: the picker is skipped and the flow starts on the canister step with that token.
4. **None usable**: the modal explains what a canister top-up is (cycles are what a canister runs on, and a top-up adds them) and that it can be paid with ICP or TCYCLES. It does not go on.
5. **An unanswered TCYCLES top-up** (PRODUCT.md → Top up a canister → Outcome) keeps its guarantee: a modal opened from the navigation while one exists starts on that request's Review, as a modal opened later from the TCYCLES page does, so the same canister and amount never become a second withdrawal.

### 5.2 Canister

1. The input is unchanged: canister IDs only, and the canister must exist.
2. Below it, two tabs as in Send: **Recently topped up**, today's heading, and **Contacts**. Picking an entry in either fills in the ID and goes on, after the same existence check as Next.
3. **Recently topped up** lists the canisters the loaded TCYCLES history shows top-ups to, newest first, each with the date of its last top-up, as today. A canister that is an address of a saved contact shows the contact's name. The list is the same whichever token is picked. Top-ups paid with ICP never appear in it, since the chain does not record their canister (§3.4).
4. **Contacts** lists every contact address that is a canister ID, by the same rule as the input, one row per address as Send does, whether or not it was ever topped up. A contact address that is an ICP account identifier is not listed, even when it belongs to a canister: OISY cannot tell, and the canister ID cannot be recovered from it.
5. The step opens on Recently topped up, unless that tab is empty and Contacts is not; then it opens on Contacts. Send does not do this; this step does, because a user who paid with ICP before may have no recent entries at all.
6. With ICP picked, Recently topped up carries a hint, whether or not it has entries: canisters topped up with ICP cannot be listed here, and saving a canister as a contact makes it easy to find again.
7. Each tab has an empty state, as Send's do.
8. The tabs, contact names and the hint apply to both tokens, so the TCYCLES flow gains Contacts too.

### 5.3 Amount (ICP)

The TCYCLES amount step is unchanged. With ICP:

1. An ICP amount, with the balance, **Max** (balance − 0.0001 ICP, and 0 when the balance does not cover the fee) and the fiat value.
2. The cycles the canister receives, updated as the user types: ICP amount × the CMC's rate, shown in trillions of cycles, as in "≈ 2.49T cycles". The canister receives cycles, not TCYCLES, so the ICP flow never writes TCYCLES for them. It is an estimate (≈): the CMC converts at its rate when the notify runs.
3. The rate, as in "1 ICP ≈ 2.49T cycles", read from the CMC and kept current while the step is open, as in Mint. The amount waits for it; without a rate the step says so and cannot go on.
4. The fee: the ICP network fee, 0.0001 ICP, on top of the amount. There is no other fee.
5. The step cannot go on with no amount, with an amount that with its fee exceeds the balance, or with an amount of 0.0003 ICP or less: a refund returns the ICP minus 0.0003 ICP, so at or below that nothing would come back (§3.6).

### 5.4 Review (ICP)

1. The canister ID **in full**, the ICP paid with its fiat value, the estimated cycles, the rate, the fee, the total that leaves the balance, and the Cycles Minting Canister as the one that converts.
2. A notice that a top-up cannot be undone and that cycles cannot be turned back into ICP.
3. The estimate is re-quoted when Review opens, and Top up waits for that quote, as in Mint.
4. The button is **Top up**. Back returns to the amount with the inputs kept.

### 5.5 Progress and result (ICP)

1. Steps: sending ICP to the CMC, topping up the canister, done. The modal locks while a step runs.
2. **Done**: the modal closes with a confirmation naming the canister and the cycles the CMC reports it deposited, in trillions of cycles (§5.3.2), and the ICP balance refreshes.
3. Once the ICP has left the wallet, a top-up is never reported as failed because a notify failed or answered `Processing`: it is notified again. A top-up still running when the user closes the modal carries on in the background and shows in the Active transactions list (§6).
4. **Refunded**: an error that says the canister could not receive the cycles, that the ICP came back minus 0.0003 ICP, and to check the canister ID. Following the failure copy rules of `docs/ai/frontend/brand-and-copy.md`, as the TCYCLES top-up does, the CMC's own reason text is not shown.
5. **Transfer refused** by the ICP ledger (for example, not enough ICP): nothing moved; the user is back on Review. A `Duplicate` answer gives the original block, and the top-up goes on with it. A transfer call that ends without the ledger's answer may still have landed, so it is never reported as refused: the top-up is handed to the background, where the deposit lookup (§6.4) finishes it or closes it as never sent.

### 5.6 History and recently used destinations

1. **ICP Activity** labels an outgoing ICP transfer with the `TPUP` memo, as the legacy memo or as the 8-byte ICRC-1 memo, as **Canister top-up**, in the list and in the details. It does not name the canister (§3.4). The label also covers top-ups made outside OISY. It rests on the memo alone, which only the sender sets.
2. The refund of a failed ICP top-up arrives as a plain incoming transfer without a memo, and stays an ordinary receive.
3. TCYCLES Activity is unchanged.
4. **An ICP top-up is never a recently used destination** in Send and never makes its account familiar for the first-time destination warning (PRODUCT.md → Send → First-time destination addresses). It is recognised by its memo, since its account differs per canister. ICP sent to that account without the memo is never topped up.

## 6. Settlement across sessions

Between the transfer and the notify, the ICP sits in the CMC's custody. Anyone could notify it (§3.3), but nothing else knows to, so a closed tab would strand it. An ICP top-up is therefore an **active user transaction**, as a mint is, with the same guarantee:

> Once ICP has left the wallet, the top-up is driven to **topped up** or **refunded** without the user doing anything, across modal close, refresh, tab close and logout, as long as the user's next session comes while the CMC still accepts the notify (§3.7). Recovery never sends ICP; it only finishes a deposit that already exists.

1. **The row opens before the ICP transfer**, with the canister ID, the amount and the transfer's creation timestamp, and is updated with the block index once the transfer returns. If the row cannot be created, the top-up does not start and nothing moves.
2. A row whose transfer the ICP ledger refused, or that the modal abandons before sending, is deleted, as for Mint.
3. The poller drives a row with a block index: `notify_top_up` settles it as topped up, refunded or failed (§3.5), while `Processing` or an unreachable CMC keeps it running, asked again about once a minute.
4. A row without a block index is resolved by **looking the deposit up** in the ICP history of the canister's CMC deposit account: the transfer from the user's account, of the row's amount, with the `TPUP` memo and the stored creation timestamp. Unlike the mint's deposit account, this one is shared by everyone who tops up that canister through the CMC, so the search runs over that canister's deposits since the transfer; the matching fields still fit only the user's own transfer. The landing window and the index rule are Mint's: not finding it is final only once the ICP index has synced past 15 minutes after the row opened on the backend, and the row then closes as failed, never sent.
5. The modal and the poller may both notify the same deposit; that is harmless (§3.5).
6. The top-up shows in the **Active transactions** list as "Canister top-up 1 ICP": the action, the amount and the token paid, without the canister and without the arrow of Mint's "Mint X ICP → TCYCLES", on the ICP network, with the Cycles Minting Canister as provider. A TCYCLES top-up is a single call with nothing to settle, so it has no row.
7. **Backend:** one new `ActiveUserTransactionData` variant for an ICP top-up, a breaking Candid change that ships alone as `feat(backend)!:`, like every earlier variant. The payload holds what is fixed at creation: the source token (ICP), the amount, the canister ID and the transfer's creation timestamp. The backend rejects any source token other than ICP, an amount outside the existing positive 256-bit bound, and a `canister_id` that is not a canister ID, with tests. The block index and the outcome go into `external_refs`, as for Mint.
8. These rows are **not** a source for Recently topped up (§12, R9).

## 7. CMC client

1. `notify_top_up` is added to the existing CMC wrapper. The vendored Candid already declares it, so no `declarations/` change and no new dependency.
2. The ICP transfer reuses Mint's transfer with a memo, with the `TPUP` memo and the deposit account derived from the canister ID.

## 8. Analytics

The existing **`cycles_top_up`** family (PRODUCT.md → Cycles top-up tracking) covers both tokens:

1. `source_location` is `navigation` when the modal opens from the navigation and `token_details` when it opens from the TCYCLES page.
2. `open` fires when the modal opens; `top_up` fires `executing`, then `success` or `error`, with `token_symbol` ICP or TCYCLES.
3. For ICP, `result_error_code` reuses Mint's codes: `refunded`, `failed` (another final CMC answer), and, where nothing moved, `transfer_failed`, `not_trackable`, `timed_out` and `not_sent`. The terminal event of an ICP top-up fires from its row under the loader's rule, except for a top-up that ends before any ICP moves, which the modal reports once its row is deleted, as for Mint. `event_severity` is `error` for `refunded` and `failed`, `warn` otherwise.
4. No amount, no amount range, no canister ID and no principal, as for the TCYCLES top-up: any of them, with the event's time, would pick out the one transfer on the public ICP ledger.

## 9. Acceptance criteria

- **AC1** With the flag on, the More group shows Canister top-up after Rewards, with the fuel pump icon, on desktop and mobile; it opens the modal and never shows as the current page. With the flag off, it is absent.
- **AC2** The TCYCLES page's Top up button keeps its label and enabled rule and opens the flow with TCYCLES picked, without the picker. The modal is titled Canister top-up from both entry points.
- **AC3** From the navigation, the picker shows only when ICP and TCYCLES are both usable (§5.1.1); with one usable, the flow starts on the canister step with it; with none, the modal explains the feature and the two ways to pay, and does not go on. A missing balance and a disabled TCYCLES count as zero.
- **AC4** An unanswered TCYCLES top-up makes a modal opened from the navigation start on its Review.
- **AC5** The canister step has Recently topped up and Contacts tabs. Recently topped up lists the canisters of loaded TCYCLES top-ups, with a contact's name where the canister is a contact address. Contacts lists every contact address that is a canister ID, one row per address, and no ICP account identifier. Picking an entry goes on after the existence check.
- **AC6** The step opens on Contacts when Recently topped up is empty and Contacts is not, and on Recently topped up otherwise. Each tab has an empty state.
- **AC7** With ICP picked, Recently topped up shows the hint of §5.2.6, with or without entries.
- **AC8** The ICP amount step shows the balance, Max (balance − 0.0001 ICP, or 0), the fiat value, the estimated cycles, the rate and the fee, waits for the rate, and cannot go on with no amount, with an amount that with its fee exceeds the balance, or with an amount of 0.0003 ICP or less.
- **AC9** ICP Review shows the full canister ID, the ICP paid with its fiat value, the estimated cycles, the rate, the fee, the total, the CMC as converter and the one-way notice; it re-quotes when it opens and keeps the inputs on Back.
- **AC10** Topping up with ICP opens the row first, then transfers exactly the entered ICP (plus the fee) to the CMC deposit account of the entered canister with the `TPUP` memo, then notifies the CMC; success shows the canister and the cycles the CMC deposited, and refreshes the ICP balance.
- **AC11** After the transfer, `Processing`, a failed notify or `Other` code 1, 2 or 3 never shows the top-up as failed, and it is notified again. A refund shows as failed, says the ICP came back minus 0.0003 ICP, and never shows the CMC's reason text.
- **AC12** A top-up whose modal was closed, or whose tab was refreshed or closed, or whose user logged out between the transfer and the notify, completes or shows as refunded in the next session without user action, while the CMC still accepts the notify. No recovery path sends ICP. If the row cannot be created, no ICP moves.
- **AC13** An ICP top-up in flight or finished after its ICP left the wallet shows in the Active transactions list; one that ends in the modal before any ICP moves does not.
- **AC14** ICP Activity shows an outgoing transfer with the `TPUP` memo (legacy or 8-byte ICRC-1) as Canister top-up, in the list and the details, without a canister; every other ICP transfer is unchanged.
- **AC15** No ICP top-up appears in Send's Recently used list or suppresses the first-time destination warning, and tests pin it.
- **AC16** The backend accepts the new variant only with ICP as source, a valid amount and a canister ID.
- **AC17** The analytics fire as in §8 and never carry an amount, a canister ID or a principal.
- **AC18** All new copy is translated in every shipped locale (`Languages` enum).
- **AC19** PRODUCT.md documents the navigation item, paying with ICP, the token picker, Contacts in the canister step, the ICP Activity label and the Recently used exclusion, and its Top up section no longer lists "pick a canister from Contacts" and "top up straight from ICP through the CMC" among what it does not do. The 2026-10-06 spec stays as it is.

## 10. Non-goals

- Naming the canister of an ICP top-up in Activity or listing it in Recently topped up (§3.4).
- Reading Recently topped up from active user transactions. If it comes later, deleting a row becomes a soft delete first, so the data stays readable (§12, R9).
- Labelling the refund of a failed ICP top-up.
- A Top up entry on the ICP page, a "Send or Top up" choice when ICP is picked in Send, a choice of token inside the TCYCLES page's Top up, Mint with a "to a canister" option, or offering ICP only when TCYCLES runs short (§12, R1).
- Changes to Mint. Improving it, or adding something to the ICP page, are later follow-ups.
- Canister management: saved canisters outside Contacts, a canister's cycle balance, status or controllers.
- Paying with any other token (XTC, ck tokens).
- Creating canisters (`notify_create_canister`).
- Topping up from a subaccount.
- A backend that finishes a stranded top-up without a user session, as the NNS dapp's does.

## 11. Implementation plan

Six PRs, stacked linearly, each in granular commits and each behaviour PR with its own PRODUCT.md entry. This spec lands with PR 1, not as a PR of its own (§12, R16):

1. `feat(backend)!: add a cycles top-up active-user-transaction variant`: this spec, and §6.7 as the only code change, with a `BREAKING CHANGE:` line.
2. `feat(frontend): top up a canister from ICP through the CMC`: `notify_top_up` in the wrapper, the transfer with `TPUP`, the top-up service with Mint's retry semantics, the deposit lookup (§6.4), the ICP Activity label (§5.6.1) and the Recently used exclusion (§5.6.4), with unit tests. No UI.
3. `feat(frontend): offer contacts when picking a canister to top up`: the new flag (§4.4), and behind it the tabs, contact names, the opening rule and the empty states (§5.2), with component tests.
4. `feat(frontend): top up a canister from the navigation with ICP or TCYCLES`: the navigation item, the token picker and its empty state, the ICP amount, review and progress, the row and its poller handling, the hint, the title and the analytics, in English, with component tests.
5. Translations for every shipped locale.
6. Turning the flag on in production after a real ICP top-up on staging, the recovery path included. Staging talks to the mainnet CMC, so this spends real ICP; a small amount suffices.

**Overlap with open drafts.** #14448 and #14449 extract and extend the top-up wizard that PR 3 and PR 4 change. Whichever lands second takes the merge. Through #14449, a top-up started from Send's choice gets the new canister step too.

The modal is mostly translated copy, so expect pressure on `compare-sizes`; the precedent is a maintainer override. Every new component and derived store ships with tests (`test-coverage` gate).

## 12. Open questions and pending decisions

### Open questions (facts to confirm)

None.

### Pending decisions (facts are clear)

None.

### Resolved

Decided on 2026-10-28.

- **R1 Entry point:** a Canister top-up item in the navigation's More group, after Rewards (§4.1). Topping up is an OISY feature, not a feature of one token. Rejected: a Top up button on the ICP page (most ICP holders never top up a canister), a "Send or Top up" choice for ICP in Send (an extra step on every ICP send), a choice of token inside the TCYCLES page's Top up, Mint with a "to a canister" option, and offering ICP only when TCYCLES runs short.
- **R2 Names:** the navigation item and the modal title are **Canister top-up**; the TCYCLES page button stays **Top up**, where the page gives the context.
- **R3 Token picker:** shown only when both tokens are usable, meaning enough to top up, not just above zero; a missing balance counts as zero; with none usable, the modal explains the feature (§5.1).
- **R4 Rollout:** the navigation item ships only together with paying with ICP (§4.4).
- **R5 TCYCLES page:** its Top up button stays and opens the flow with TCYCLES picked (§4.2).
- **R6 Settlement:** an active user transaction with a new variant that stores the canister ID, opened before the ICP is sent (§6). The AUT is needed anyway, and the chain does not keep the canister (§3.4).
- **R7 Memo:** the canister ID cannot go into the transfer's memo (§3.4).
- **R8 ICP Activity:** a top-up shows as a top-up, without its canister (§5.6.1).
- **R9 Recently topped up:** from TCYCLES history only. Active user transactions are not a source; if they become one later, deleting a row becomes a soft delete first.
- **R10 Contacts:** a Contacts tab with every contact address that is a canister ID, and contact names in Recently topped up (§5.2).
- **R11 ICP hint and opening tab:** the hint shows whenever ICP is picked; the step opens on Contacts when Recently topped up is empty and Contacts is not (§5.2).
- **R12 Notify by anyone:** harmless, since a notify can only deliver to the canister the transfer was made for (§3.3).
- **R13 Unit:** the ICP flow shows the cycles a canister receives as cycles, in trillions ("≈ 2.49T cycles"), never as TCYCLES: TCYCLES is a token, and a top-up paid with ICP involves none (§5.3.2).
- **R14 Active transactions wording:** the action, the amount and the token paid, as in "Canister top-up 1 ICP" (§6.6).
- **R15 Tab label:** Recently topped up, as today (§5.2.2).
- **R16 PRs:** six PRs, stacked linearly; this spec lands with PR 1, not as a PR of its own (§11).
