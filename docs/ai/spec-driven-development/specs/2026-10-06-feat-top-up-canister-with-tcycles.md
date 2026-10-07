> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Top up a canister with TCYCLES

- **Type:** `feat`
- **Area:** Frontend (TCYCLES token page, Top up modal, cycles-ledger calls, TCYCLES activity labels, recently used destinations, a send-flow warning)
- **Status:** Draft. All decisions and Q1 are resolved; Q2 is open (§12).

---

## 1. Motivation

Canisters on the Internet Computer pay for computation and storage with cycles, and a canister that runs out of cycles stops. OISY holds cycles as **TCYCLES**, the cycles ledger's token (1 TCYCLES = 10¹² cycles), and can mint them from ICP (PRODUCT.md → Mint TCYCLES), but it cannot put them into a canister. Today a developer who keeps cycles in OISY sends them to a `dfx` identity and runs `dfx cycles top-up` from there.

The cycles ledger does the whole thing in one call: `withdraw` burns TCYCLES from the caller's balance and deposits the same number of cycles into any canister. This feature adds a **Top up** action on the TCYCLES page: the user enters a canister ID and an amount, and the cycles land in that canister.

It also writes down a rule the send flow already follows without saying so: a burn is never a recently used destination.

## 2. What exists already

- **TCYCLES**: ledger `um5iw-rqaaa-aaaaq-qaaba-cai` (the cycles ledger), index `ul4oc-4iaaa-aaaaq-qaabq-cai`, 12 decimals, fee 0.0001 TCYCLES, in the Compute asset type, priced at 1 XDR (PRODUCT.md → Exchange-rate sourcing).
- **Token page actions**: `src/frontend/src/lib/components/hero/Actions.svelte`. The TCYCLES page shows Receive, Send, Swap and Mint (`CyclesMintButton.svelte`, behind `CYCLES_MINT_ENABLED`; the page check is `isTokenCyclesLedger` in `src/frontend/src/icp/utils/cycles-mint.utils.ts`). Four is the most any token page shows today: where a fifth button would appear, the `tooManyButtons` workaround drops Buy (#9113). Send is disabled while the page token has no usable balance (`outflowActionsDisabled`, set in `HeroContent.svelte`).
- **Flows to build on**: the Mint modal (`src/frontend/src/icp/components/cycles-mint/`: modal, form, review, progress) is the nearest screen. The Send flow's destination step (`SendDestinationTabs.svelte`, `KnownDestinations.svelte`) is the model for a list of earlier destinations.
- **Cycles-ledger client**: none in the frontend. The pinned `@icp-sdk/canisters` 3.1.0 has no cycles-ledger wrapper. `dfx.json` already declares `cycles_ledger` for local development, but `scripts/did.delete.types.mjs` deletes its generated bindings because it is not on that script's allowlist. The backend's Rust client wraps `withdraw` (`src/cycles_ledger/client/src/lib.rs`), but this feature has no use for the backend.
- **History**: `mapIcrcTransaction` (`src/frontend/src/icp/utils/icrc-transactions.utils.ts`) maps an index burn to type `burn`, with no recipient and without its memo; the row reads "Burn". ckBTC withdrawals already get their own label on a burn (`extendCkBTCTransaction` in `src/frontend/src/icp/utils/ckbtc-transactions.utils.ts`).
- **Recently used**: `getKnownDestinations` (`src/frontend/src/lib/utils/transactions.utils.ts`) keeps only non-zero `send` rows with a recipient, after dropping transfers an ICRC-2 spender pulled. `icKnownDestinations` (`src/frontend/src/icp/derived/ic-transactions.derived.ts`) also drops the user's CMC deposit account (Mint). ICP, ICRC, ckBTC and ckETH history all type a burn as `burn`, so no burn is listed today, but no test says so.

## 3. How a top-up works

Verified on 2026-10-06 against `dfinity/cycles-ledger` (`cycles-ledger/src/storage.rs`, `memo.rs`, `config.rs`), the live ledger's Candid, and recent mainnet blocks.

1. **One call.** `withdraw { to, amount, from_subaccount, created_at_time }`, made by the user's own principal, burns `amount` + 0.0001 TCYCLES from the caller's account and deposits `amount` cycles into canister `to` through the management canister's `deposit_cycles`. Any canister can be topped up; no controller rights are needed.
2. **Receiver.** A self-authenticating principal (a user, not a canister) is refused with `InvalidReceiver` before anything is burned, so it costs nothing. The ledger catches no other kind of non-canister ID; those fail at the deposit (§3.4).
3. **The burn names the canister.** The burn's memo carries the target canister, CBOR-encoded as a one-element array: `0x81 0x4a` followed by the canister's 10 bytes. Mainnet block 16,786,001, for example, has memo `81 4a 00 00 00 00 01 10 f2 be 01 01`, which is `ywcsb-maaaa-aaaai-q6k7a-cai`. The index returns burn memos, so history can say which canister was topped up. A burn made by `create_canister` carries a different memo (32 × `0xFE`).
4. **A failed deposit is refunded, minus fees.** If `deposit_cycles` fails (for example, because no such canister exists), the ledger mints `amount` − 0.0001 TCYCLES back to the caller, with memo 32 × `0xFF`, and answers `FailedToWithdraw`. The attempt costs 0.0002 TCYCLES in all; at an amount of 0.0001 TCYCLES or less, nothing comes back.
5. **Deduplication.** With `created_at_time` set, the same request sent again within 24 hours answers `Duplicate { duplicate_of }` and moves nothing. The ledger refuses a `created_at_time` more than a minute ahead of its own clock (`CreatedInFuture`) or older than 24 hours (`TooOld`).
6. **One way.** Cycles in a canister do not come back to the wallet.
7. **Nothing to settle later.** There is no approval and no second call, so nothing can be stranded between steps. Unlike Mint, a top-up needs no active user transaction (PRODUCT.md → Swap → Cross-session settlement).

## 4. Entry point

1. A **Top up** hero button on the TCYCLES page, after Mint, as the fifth button (§12, D1). Its icon is a fuel pump (§12, D5), drawn in the same filled two-tone style as the other hero icons. OISY has no such icon yet, so it is a new one.
2. It appears only for the mainnet cycles ledger's token, with the same check as Mint.
3. It is disabled exactly when Send is, since it spends TCYCLES: while the TCYCLES balance is zero or not loaded. Mint, which spends ICP, stays enabled.
4. It sits behind a rollout flag, on for local and staging builds and off in production until a real top-up on staging has been verified, and then kept as a kill switch (§12, D4).

## 5. Top up

The modal follows the Send flow's shape: canister, amount, review. The title is **Top up a canister**, with one plain sentence under it: the cycles go from the TCYCLES balance into the canister, which spends them on computation and storage.

### 5.1 Canister

1. One input for the canister ID. It accepts only a **canister ID**, and says that a canister ID is needed for anything else: a user principal, the anonymous principal, an ICRC account with a subaccount, an ICP account identifier, an address on another network, or text that is not a principal. The text form of a principal carries a checksum, so a typo is caught here.
2. **The canister must exist.** Before the user can continue, OISY asks the Internet Computer whether the canister exists. This reads the canister's public state and needs no controller rights (§12, Q1). Every canister has a list of controllers there, with or without code, so a canister without code is accepted: it can hold cycles. An ID with no canister behind it is refused, with a message to check the ID. That is the case when the subnet that hosts the ID's range proves there is no such canister, or when no subnet hosts the ID at all and the boundary node answers that the canister does not exist. Anything else (no answer, another error, a proof that does not verify) means the check could not be made: the step says so and offers to try again, and it does not let the user continue.
3. **Recently topped up** (§12, D2): the canisters the loaded TCYCLES history shows top-ups to, newest first, each with the date of its last top-up. Picking one fills in the ID. Like the Send flow's Recently used list, it comes from history alone, so it covers what is loaded and nothing is stored. With no top-ups in the loaded history, the list is not shown.

### 5.2 Amount

1. A TCYCLES amount, with the balance, **Max** (balance − 0.0001 TCYCLES, and 0 when the balance does not cover the fee) and the fiat value.
2. The fee: 0.0001 TCYCLES, on top of the amount.
3. The step cannot continue with no amount, with an amount that with its fee exceeds the balance, or with an amount of 0.0001 TCYCLES or less: a failed deposit refunds the amount minus 0.0001 TCYCLES (§3.4), so at or below that it would return nothing.

### 5.3 Review

1. The canister ID **in full**, never shortened, since cycles sent to the wrong canister are gone. The amount with its fiat value, the fee, and the total that leaves the balance.
2. A notice that a top-up cannot be undone.
3. The button is **Top up**. Back returns to the previous step with the inputs kept.

### 5.4 Progress and result

1. One step, "Topping up …", while the call runs. The modal locks, as Mint's does.
2. **Done**, or a `Duplicate` answer, which means an identical earlier request went through: the modal closes with a confirmation, "Topped up <canister> with X TCYCLES", and the TCYCLES balance refreshes.
3. **Refused before anything moved** (`InsufficientFunds`, `InvalidReceiver`, `CreatedInFuture`, `TemporarilyUnavailable`, `BadFee`, `GenericError`, or `TooOld` on the first attempt): an error that says nothing left the wallet, and the user is back on Review. For `CreatedInFuture` and first-attempt `TooOld`, the next step it offers is to check the device's clock. If an unanswered request is retried and returns `TooOld`, only the retry is known to have been refused: the original outcome remains unknown. Direct the user to TCYCLES Activity and do not automatically create a fresh withdrawal.
4. **Deposit failed** (`FailedToWithdraw`): an error that says the canister could not receive the cycles, that the entered amount came back minus 0.0001 TCYCLES, that the attempt cost 0.0002 TCYCLES in total fees, and to check the canister ID. Following the failure copy rules of `docs/ai/frontend/brand-and-copy.md`, the Internet Computer's own reason text is not shown.
5. **No answer** (the call timed out or the connection dropped): the top-up may or may not have gone through, so it is reported as neither. The modal says it cannot tell yet, that TCYCLES Activity will show the top-up if it happened, and offers to try again. Trying again sends the identical request, including `created_at_time`, so retrying this request cannot create a second withdrawal (§3.5). The unanswered request outlives the modal, for the principal that sent it, until the page reloads, so a modal opened later resends it too for the same canister and amount. While the earlier outcome is unknown, the message warns that starting a fresh request can cause an additional top-up if the earlier one succeeded, and directs the user to check TCYCLES Activity first.

### 5.5 Activity

1. TCYCLES Activity shows a top-up as **Top up**, naming the canister where an outgoing row names its recipient. The details are titled **Top up** too, and show the canister ID in full. This applies to every burn whose memo names a canister (§3.3), so it also covers top-ups made before this feature or by an ICRC-2 spender.
2. The refund of a failed top-up (§3.4) shows as **Top-up refund**. The ledger does not link it to its burn, so neither does OISY.
3. Every other burn on the cycles ledger keeps showing as **Burn**, including a burn whose memo OISY cannot read.

### 5.6 Sending TCYCLES to a canister

1. When the user sends TCYCLES to an account whose owner is a canister ID, the send flow warns that this does not top up the canister: the TCYCLES land in the canister's account on the cycles ledger, and the canister only gets cycles if its own code withdraws them. The warning says that Top up is the way to add cycles to a canister.
2. It appears on the address step and again on Review. It does not block the send: a canister can own TCYCLES on purpose.
3. It applies to TCYCLES only, the same token Top up appears for (§4.2), and to an account with a subaccount as well, since what counts is the account's owner.
4. While the Top up flag is off, the warning leaves out the pointer to Top up, which the user could not find.

## 6. Burns are never recently used

A burn is never a recently used destination, on any ledger and in any send flow, and never counts as a familiar destination for the first-time destination warning (PRODUCT.md → Send → First-time destination addresses). A top-up is a burn, so a topped-up canister never appears in a send flow's Recently used list either. Recently topped up (§5.1.3) lists only top-ups, and only in the Top up flow.

This already holds on `main`. This feature adds tests that pin it for ICP, ICRC (top-ups included), ckBTC and ckETH burns, so that a later change to how a burn is mapped, such as giving a top-up a destination, cannot list it by accident. The CMC deposit account stays excluded as before; a top-up does not involve the CMC.

## 7. Cycles-ledger client

1. Bindings generated from the existing `cycles_ledger` entry in `dfx.json`, by adding it to the allowlist in `scripts/did.delete.types.mjs`, and a thin wrapper under `src/frontend/src/icp/canisters/` for `withdraw`. This is how the CMC was added for Mint. Approved on 2026-10-06, as CLAUDE.md requires for `scripts/` and `src/declarations/` (§12, D3). Once OISY moves to an `@icp-sdk/canisters` version that wraps the cycles ledger, the bindings and the wrapper go.
2. The memo is read strictly: only the exact encoding of §3.3 makes a burn a top-up; anything else stays a plain burn.
3. The existence check reads the canister's `controllers` entry with the agent OISY already ships, so no new dependency. It must tell a proven absence and the boundary node's `canister_not_found` apart from a failed read. The agent's ready-made `CanisterStatus.request` cannot: it returns `null` for both (§12, Q1).

## 8. Analytics

One structured event family, **`cycles_top_up`**, under `event_context: compute` and `source_location: token_details`, following the domain-service pattern in `docs/ai/frontend/analytics.md`.

| `event_modifier` | Fires when                   | `result_status`                 | Properties                                     |
| ---------------- | ---------------------------- | ------------------------------- | ---------------------------------------------- |
| `open`           | the Top up modal opens       | none                            | none                                           |
| `top_up`         | a top-up starts and finishes | `executing` → `success`/`error` | `token_symbol`; `result_error_code` on failure |

`result_error_code` says why a top-up ended in `error`: `refused` (nothing moved), `refunded` (the deposit failed and the amount came back minus fees), or `unknown` (no answer). The event carries no amount, no canister ID and no principal: an amount or a canister ID, together with the event's time, picks out the one burn on the public cycles ledger, and with it the user's account.

That includes an amount range (a bucket, as `docs/ai/frontend/analytics.md` §6 suggests for amounts). A bucket hides a top-up only when many burns in the same range happen around the event's time, and on the cycles ledger almost none do above $1: in 600 blocks sampled over about 11 hours on 2026-10-05/06, 584 of the 586 top-ups were under $1, 2 were between $1 and $10, and none was larger. A top-up of $1 or more would be one of a handful a day, so its range and time would still point at its burn (§12, D6).

The event's own time remains. `executing` and then `success` or `error` arrive as they happen, so per-event timestamps bracket the burn within seconds, and in the same sample the ledger ran 5 to 27 blocks a minute: such a window often holds a single burn. Every OISY event tied to an on-chain action (sends, swaps, mints) carries the same exposure, so whether to blur event times is a decision for `docs/ai/frontend/analytics.md` §6 as a whole, not for this flow.

## 9. Acceptance criteria

- **AC1** With the flag on, the TCYCLES page shows Top up as its fifth hero button, after Mint, with the fuel pump icon (D5), and no other token page does. With the flag off, it is absent.
- **AC2** Top up is disabled exactly when Send is.
- **AC3** The canister step accepts an existing canister ID, including one with no code. It refuses each non-canister input of §5.1.1 with a message that a canister ID is needed, refuses an ID with no canister behind it, and does not continue when the existence check cannot be made.
- **AC4** Recently topped up lists the canisters of the loaded top-ups, newest first, with the date of the last top-up, and picking one fills in the ID. It is hidden when there are none.
- **AC5** The amount step shows the balance, Max (balance − 0.0001 TCYCLES, or 0), the fiat value and the fee, and cannot continue with no amount, with an amount that with its fee exceeds the balance, or with an amount of 0.0001 TCYCLES or less.
- **AC6** Review shows the full canister ID, the amount with its fiat value, the fee, the total and the notice; Back keeps the inputs.
- **AC7** Top up makes one `withdraw` call from the user's default account, with the entered canister and amount and a creation timestamp. Success, or `Duplicate`, closes the modal with the confirmation and refreshes the balance.
- **AC8** A refusal before anything moved says nothing left the wallet. `FailedToWithdraw` says the entered amount came back minus 0.0001 TCYCLES and that the attempt cost 0.0002 TCYCLES in total fees. Neither shows the Internet Computer's own reason text.
- **AC9** A call without an answer is reported as neither done nor failed, and trying again resends the identical request. A resent request that gets `TooOld` keeps the outcome unknown and points to TCYCLES Activity, without starting a fresh request. While the outcome is unknown, Review warns that a fresh request, after a change of amount or canister, can top up again, and points to TCYCLES Activity first. Both hold in a modal opened later, until the page reloads.
- **AC10** TCYCLES Activity shows a burn whose memo names a canister as Top up with that canister, in the list and in the details, the refund of a failed top-up as Top-up refund, and every other burn as Burn.
- **AC11** No ICP, ICRC (top-ups included), ckBTC or ckETH burn appears in a send flow's Recently used list or suppresses the first-time destination warning, and tests pin it. The CMC deposit account stays excluded.
- **AC12** The analytics fire as in §8 and never carry an amount, a canister ID or a principal.
- **AC13** All new copy is translated in every shipped locale (`Languages` enum).
- **AC14** PRODUCT.md documents Top up, its analytics, its non-goals and the send warning. The Mint section no longer lists topping up a canister among what it does not do, and Send → First-time destination addresses states that burns never count.
- **AC15** Sending TCYCLES to an account owned by a canister, with or without a subaccount, shows the warning of §5.6 on the address step and on Review, without blocking the send. It points to Top up only while the Top up flag is on. No other token and no other destination shows it.

## 10. Non-goals

- **Canister management**: saved and named canisters, a canister's cycle balance, status or controllers. That is a later feature, similar to contacts, and Recently topped up may move into it.
- Showing the canister's cycle balance. Reading it needs `canister_status`, which only a canister's controllers can call.
- Picking a canister from Contacts.
- Topping up straight from ICP through the CMC (`notify_top_up`). That is a transfer followed by a notify, with the cross-session settlement Mint needed; the user mints TCYCLES first.
- Creating canisters (`create_canister`).
- Topping up from a subaccount, or on another account's behalf through an ICRC-2 approval (`withdraw_from`).
- A first-time-canister confirmation like the send flow's first-time destination warning.
- Topping up from other cycles tokens (XTC).
- Blocking a send of TCYCLES to a canister (§5.6).
- Labels for the cycles ledger's other burns (canister creation, penalty fees): they stay Burn.

## 11. Implementation plan

Six PRs (§12, D7), each in granular commits. Each PR updates PRODUCT.md for the behaviour it ships, as `workflow.md` asks:

1. **#14217, `docs(ai): add spec for topping up a canister with TCYCLES`**: this spec.
2. **#14229, cycles-ledger client**: the bindings (§7.1, approved in D3), the `withdraw` wrapper, the top-up service mapping each `withdraw` answer to §5.4, and the canister existence check (§5.1.2, §7.3), with unit tests.
3. **Activity labels and burns**: the Top up and Top-up refund labels in TCYCLES Activity (§5.5), and the tests pinning burns out of Recently used (§6), with the PRODUCT.md entries for both.
4. **UI**: the flag, the fuel pump icon, the button, the modal, Recently topped up and analytics, in English, with component tests. PRODUCT.md gains Top up and its analytics, and Mint's non-goals no longer list topping up a canister.
5. **Send warning**: the warning for TCYCLES sent to a canister (§5.6), in English, with tests and its PRODUCT.md entry. It comes after PR4 because it points to the Top up flow.
6. **Translations**: every shipped locale.

The modal is mostly translated copy, so expect pressure on `compare-sizes`; the precedent is a maintainer override. Every new component and derived store ships with tests (`test-coverage` gate). Staging talks to the mainnet cycles ledger, so verifying a top-up there spends real TCYCLES; a small amount suffices.

## 12. Open questions and pending decisions

### Open questions (facts to confirm)

- **Q2 Refund memo on mainnet.** The 32 × `0xFF` refund memo (§3.4) comes from the source; no refund was among the recent mainnet blocks checked. Confirm it on a real failed top-up before the Top-up refund label (§5.5.2) relies on it. A test top-up is planned for that.

### Pending decisions (facts are clear)

None.

### Resolved

- **D1 Placement:** a fifth hero button, after Mint (§4.1). The five-button row was checked at phone width on 2026-10-06. The rejected alternatives were a single cycles button that opens a choice between Mint and Top up, and a "to a canister" path inside Send.
- **D2 Recently topped up:** in v1, built from the loaded transaction history only, with nothing stored (§5.1.3).
- **D3 Cycles-ledger bindings:** allowlist the existing `cycles_ledger` entry and add a thin wrapper (§7.1), as was done for the CMC (Mint spec, D5). Approved on 2026-10-06.
- **D4 Rollout:** as for Mint, a flag that is on for local and staging builds until a real top-up on staging is verified, then on everywhere and kept as a kill switch (§4.4).
- **D5 Icon:** a fuel pump (§4.1), decided on 2026-10-06 from three candidates drawn in the hero row at phone width, in both themes. Cycles are what a canister runs on, and a top-up refuels it. The pump has the same visual weight as its neighbours (Receive's QR code, Send's paper plane, Swap's arrows, Mint's pickaxe) and looks like none of them. The rejected candidates were a charging battery, which is wide and short and so reads smaller than its neighbours, and a bolt in a circle, which in a multi-chain wallet can suggest an instant payment or Bitcoin's Lightning Network.
- **D6 No amounts in analytics, not even as a range:** decided on 2026-10-06 (§8). Amount ranges stay a separate change, introduced together with an event that can use them without singling out a transaction.
- **D7 Six PRs:** decided on 2026-10-06 (§11). PR1, #14217, is this spec on its own; the implementation follows in five PRs. The send warning (§5.6) was added the same day as its own PR, after the UI.
- **Q1 Existence check:** verified on 2026-10-06 on mainnet, with the agent version OISY pins (§5.1.2, §7.3).
  - The cycles ledger (`um5iw-rqaaa-aaaaq-qaaba-cai`, with code): `controllers` and `module_hash` are both found.
  - Two canisters without code (`2223e-iaaaa-aaaac-awyra-cai`, `2223u-yaaaa-aaaal-qutrq-cai`): `controllers` is found and `module_hash` is absent, so `module_hash` cannot tell whether a canister exists.
  - An unused ID inside a subnet's range (`z6546-5qaaa-aaaai-777ya-cai`): the subnet's certificate verifies and proves both paths absent.
  - An ID outside every subnet's range, the anonymous principal, and a user principal: the boundary node answers HTTP 400, `canister_not_found`, "The specified canister does not exist." That answer is not certified, but a wrong one can only block a top-up, never move cycles.
  - `CanisterStatus.request` returns `null` in every one of these "no" cases, and also when the read fails.
- **Destination check:** canister IDs only, and the canister must exist (§5.1).
- **Activity label:** Top up, naming the canister (§5.5).
- **No canister cycle balance** in v1 (§10).
- **Burns are never recently used** (§6).
- **No active user transaction:** a top-up is a single call (§3.7).
- **Name:** Top up, the Internet Computer's term for adding cycles to a canister, which the Mint spec kept free for this feature (D7).
