# Spec: The OISY allowance, handled in the app, payable with own cycles, bounded in total

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## 1. Terms

The rest of the spec uses these terms with exactly this meaning.

- **OISY allowance:** the amount of cycles from OISY's account that a user can still spend.
- **OISY allowance threshold:** an amount of cycles. The backend sets a new OISY allowance only while the OISY allowance is below it.
- **Charged call (CC):** a call that costs cycles, charged to the OISY allowance or, from phase 3, to the user's own cycles. Today that's every Chain Fusion Signer call. From phase 2, it also covers backend calls that cost cycles beyond their execution. Its status for this spec:
  - **Insufficient allowance:** the CC fails because the OISY allowance is smaller than its charge.
- **Allowance request (AR):** OISY's call to the backend that asks for a new OISY allowance. Its answers:
  - **Granted:** the backend sets a new OISY allowance.
  - **Skipped:** the backend sets no new OISY allowance because the OISY allowance is at or above the OISY allowance threshold.
  - **Refused:** the backend returns an error and sets no new OISY allowance.
- **Allowance issue:** a global state. It's set when the AR that follows an Insufficient allowance is Refused, and cleared when an AR is Granted or Skipped.
- **AR cooldown:** while Allowance issue is set, the minute after each Refused AR. During it, OISY sends no AR.
- **Usage credits:** the app's word, in its texts, for what a user can spend on CCs: the OISY allowance and, from phase 3, the user's own approval, which phase 2 replaces with the own-cycles subaccount's balance.
- **Own-cycles subaccount:** from phase 2, a subaccount of the user's own cycles-ledger account that holds the cycles their CCs may use (see 5.1).

## 2. Goal

OISY pays the cycles for each user's CCs from the OISY allowance. This spec makes OISY:

1. **Phase 1:** handle Insufficient allowance clearly in the app.
2. **Phase 2:** charge the backend's calls that cost cycles beyond their execution to the same OISY allowance, which makes them CCs.
3. **Phase 3:** let a user pay CCs with their own cycles while Allowance issue is set.
4. **Phase 4:** bound the total OISY grants, and lower the OISY allowance each Granted AR sets.

The phases ship one by one, in this order, except that phase 3 comes before phase 2. Each is useful on its own.

## 3. Motivation

- **Predictable cost.** The cycles OISY grants are limited per user and per hour, but not in total. Phase 4 bounds the total.
- **Running out must work well first.** With a bound in place, Insufficient allowance happens more often. So the app has to handle it well (phase 1), the backend's costs have to count too (phase 2), and users need a way to continue on their own cycles (phase 3).
- **Today's handling is poor.** Insufficient allowance shows as a generic or technical error ("Ledger error: …"). At load, most Refused ARs sign the user out.

## 4. Phase 1: handle Insufficient allowance (frontend)

### 4.1 What exists today

- **The OISY allowance.** A Granted AR sets the OISY allowance to 2.917T cycles. The OISY allowance threshold is 1.458T cycles. The backend grants at most 3 times an hour per user, answers at most 10 ARs a minute per user, and checks the II delegation. The OISY allowance is an ICRC-2 approval from the backend's cycles-ledger account to the signer, with a spender subaccount per user and no expiry. See `src/backend/src/api/signer.rs`, `src/backend/src/signer/service.rs` and `src/backend/src/utils/rate_limiter.rs`.
- **The AR at load.** Every app load, at sign-in or on a page reload, sends an AR (`initSignerAllowance` in `src/frontend/src/lib/services/loader.services.ts`). When the AR is Refused because of the hourly or the per-minute limit, the frontend turns the answer into Skipped with 0 left (`allowSigning` in `src/frontend/src/lib/canisters/backend.canister.ts`), and the app carries on. Any other Refused AR signs the user out.
- **CCs.** Every Chain Fusion Signer call goes through `src/frontend/src/lib/api/signer.api.ts` with "OISY pays" as the payment type (`SIGNER_PAYMENT_TYPE` in `src/frontend/src/lib/canisters/signer.constants.ts`). The flows that make CCs are send, swap, approve, permit, ERC-4626, NFT transfer, OpenCryptoPay, WalletConnect and Liquidium, on BTC, ETH/EVM, SOL and XRP. In production, the certified BTC balance is a CC too (`src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts`). Addresses are derived locally, and the signer is only their fallback. ICP and ICRC sends make no CC.
- **Insufficient allowance** fails the CC before anything is signed, and nothing is charged. The signer's error is `InsufficientAllowance`, and it states the OISY allowance. When OISY's own cycles account is short instead, the error is `InsufficientFunds`.
- **No prices.** The signer has no price list, and each CC has its own price. So the frontend can't know whether the OISY allowance covers the next CC: a cheaper CC may succeed after a costlier one returned Insufficient allowance.
- **What the user sees.** The flow's normal error, which today is generic or technical. For example, a failed ETH swap returns to its review with "failed unexpectedly". On local and staging, a BTC send through the backend tells the user to sign out and back in.

### 4.2 Load

- Every app load sends an AR, as today.
- A Refused AR at load causes **no sign-out**, sets no Allowance issue and shows no toast. The app carries on. The backend sets a new OISY allowance only below the OISY allowance threshold, so a Refused AR at load does not mean the next CC fails.

### 4.3 AR after Insufficient allowance

- When a CC returns Insufficient allowance, OISY sends an AR right away, in the shared signer module, before the flow sees the error. The failing step stays on screen a few seconds longer.
- CCs that return Insufficient allowance at the same time share one AR.
- During the AR cooldown, OISY sends no AR, and the CC is handled as if its AR were Refused.
- An AR stopped by the hourly or the per-minute limit is Refused. The frontend no longer turns it into Skipped.

### 4.4 The CC after the AR

- **Granted**, or **Skipped** with a larger OISY allowance than the Insufficient allowance stated, because another tab or device got a new one in the meantime: the shared signer module repeats the CC once, right away. A CC refused for Insufficient allowance ran nothing, so the repeat is like the first try. If it succeeds, the flow never sees the failure.
- **Refused**, or no AR during the AR cooldown: the CC fails, and Allowance issue is set (see 4.5).
- **Skipped** with no larger OISY allowance: the CC costs more than the OISY allowance, and the backend sets no new one at or above the OISY allowance threshold. The CC fails, and a warning toast says this transaction costs more than the free OISY allowance covers. It stays until the user closes it. Allowance issue is **not** set, since cheaper CCs still work. Today this happens with a large BTC send in production, which is charged for all its inputs in one CC.
- A repeated CC that returns Insufficient allowance again is handled like the Skipped case without a larger OISY allowance, and no second AR is sent.
- When the CC still fails, the flow shows its usual error, as today, but its error toast says "Your transaction couldn't be signed because you don't have enough usage credits left." in place of its usual text. This is the **usage-credits error text**.

### 4.5 Allowance issue and its toast

- When Allowance issue is set, and again with every CC that returns Insufficient allowance while it lasts, the **allowance-issue toast** shows: the free OISY allowance is used up for now, so some transactions may fail.
- It looks different from every other toast: warn level, the inverted theme, a title and its own icon.
- The user can close it. It shows again with the next CC that returns Insufficient allowance while Allowance issue lasts.
- It disappears when Allowance issue clears. Any Granted or Skipped AR clears it. A Skipped AR means the OISY allowance is at or above the OISY allowance threshold, for example after another tab or device got a Granted AR.
- Toasts show above an open form, so the user sees it there too.
- There is no **Retry** button: once the AR cooldown has passed, the next CC that returns Insufficient allowance sends an AR anyway.
- **No global blocking.** Allowance issue disables no feature, since no CC's price is known.

### 4.6 The certified BTC balance

This spec leaves out the certified BTC balance through the Chain Fusion Signer, today the one CC without a form. That route is turned off in every build before phase 1 ships, and the wallet then reads the balance only through the backend. Phase 2 makes that read a CC (see 5).

### 4.7 What does not change

- **No form or flow changes.** None of them learns about the AR, the repeat or Allowance issue. When a CC still fails, each shows its usual error, and the shared toast helper puts the usage-credits error text in its error toast (see 4.4).
- The one exception is a message in a shared helper: the BTC send through the backend (local and staging) tells the user to sign out and back in when the allowance runs out. That message goes, since the AR now runs on its own, and the send shows its usual error instead.
- Every other CC result keeps today's handling, including `InsufficientFunds`, when OISY's own cycles account is short.
- ICP and ICRC sends, receiving, addresses and every balance work as before, with or without Allowance issue.

### 4.8 Analytics

- **`oisy_allowance_request`**, one per AR, whatever triggered it: `event_trigger` is `load` or `insufficient_allowance`, and `event_key` is the AR's answer (`granted`, `skipped` or `refused`). During the AR cooldown no AR is sent, so there is no event either. An AR stopped by a rate limit also fires `rate_limited`, just before.
- **`charged_call`**, one per CC that returns Insufficient allowance, a failed repeat included: `event_key` is the CC's method (for example `eth_sign_transaction`), with `result_status` `error` and `result_error_type` `insufficient_allowance`. Successful CCs fire no event. The name is not tied to the OISY allowance, since from phase 3 a CC can also run out of the user's own cycles.
- Together they show how often CCs run out, which ones, and what the AR answered.

## 5. Phase 2: the backend's costly calls become CCs

- **One allowance.** A user-triggered backend call that costs cycles beyond its execution (for example a Bitcoin canister call, a vetKD key derivation or an HTTP outcall) becomes a CC, charged to the same OISY allowance.
- When the OISY allowance can't cover such a CC, the backend returns Insufficient allowance. The frontend handles it like a signer CC: the AR, the repeat, Allowance issue and the toasts.
- The certified BTC balance through the backend becomes a CC too, one without a form. When the read still fails with Insufficient allowance after the AR, the wallet falls back to the free unverified read from the Bitcoin canister, which the scheduler already makes, and shows that the balance is unverified.
- **Own cycles for backend CCs.** A user who pays with their own cycles (phase 3) also lets the backend's CCs use them, within one limit shared with the signer (see 5.1).
- How the backend charges a CC to the OISY allowance, and the exact list of calls, are still open (see [Open questions](#10-open-questions-facts-to-confirm)).

### 5.1 Own cycles in a subaccount

Phase 3 comes first, with one spender: the signer charges the user's main account, through an approval (see 6.1). Phase 2 adds the backend as a second spender. An approval is per spender and reserves nothing, so a second approval from the main account would be a second limit: 1 TCYCLES to each lets them charge up to 2 together. So phase 2 moves own cycles into the own-cycles subaccount, whose balance is the one limit for both.

- **The subaccount** is fixed: the same for every user, and known to the frontend and the backend. It belongs to the user like their main account: only they can move cycles out of it or change its approvals. OISY holds none of their cycles.
- **Setting the limit** sets the subaccount's balance to the amount the user enters, moving the difference in from the main account, or back to it. It also approves the signer and the backend on the subaccount, each for the new limit: up to three ledger calls, with a fee each. Setting 0 moves everything back and leaves the approvals, since an empty subaccount pays nothing.
- **One balance, one limit.** The signer and the backend charge the same balance, so what one takes, the other can't. An approval only goes down with its own spender's charges, so it never runs out before the balance.
- **Charged first.** Each charge is taken from the subaccount before the call runs. When the balance can't cover it, the charge fails with `InsufficientFunds` and nothing runs. As in phase 3, the flow's error toast shows the usage-credits error text (see 6.1).
- **The signer** charges the subaccount with "patron pays" (`PatronPaysIcrc2Cycles`), the subaccount as the patron, the way it charges the OISY allowance. Patron pays draws on an approval to the signer with a spender subaccount per user, the same spender account the OISY allowance approves, so that's the approval the user gives. The signer accepts any patron except its own account, so it needs no change.
- **The backend** charges the subaccount the same way (`withdraw_from` on the cycles ledger), before each of its CCs, through an approval with a spender subaccount per user too. That adds one ledger call and one ledger fee to each backend CC paid with own cycles. Backend CCs offer the same two ways to pay as signer CCs, and the frontend repeats them with own cycles in the same cases (see 6.1).
- **What changes from phase 3:**
  - The approval step becomes setting the subaccount's balance, and the payment type for own cycles switches from "caller pays" to "patron pays" with the subaccount.
  - A CC is repeated with own cycles while the subaccount has a balance left, instead of while an approval is left.
  - The Tools card shows the subaccount's balance in place of the approval left. The TCYCLES balance no longer limits own cycles, since the limit's cycles are set aside.
- **The assets page.** When TCYCLES is enabled, it shows the subaccount's balance next to the TCYCLES balance, not inside it, since send and Max use only the main account. The USD totals include it, the way they already include a token's staked balance. It's read on its own, with a query on the cycles ledger: at load, after setting the limit and after each CC that own cycles paid.
- **Phase 3's approvals.** Own cycles are on only in local and staging builds. If they're turned on in production before phase 2, phase 2 also has to handle the approvals users gave in phase 3.

## 6. Phase 3: pay with your own cycles

### 6.1 How it works

- The signer accepts "caller pays" (`CallerPaysIcrc2Cycles`): its charge comes from the caller's main cycles-ledger account, through an approval the caller gave the signer. Phase 3 covers signer CCs only; the backend's CCs use the user's cycles from phase 2, which also moves them into the own-cycles subaccount (see 5.1).
- An approval reserves nothing: it only caps what the signer may charge from the user's TCYCLES balance.
- **Allowing.** In one approval, the user sets the spending limit from their TCYCLES balance and confirms it on a review step. A user without TCYCLES gets some first, for example through [Mint TCYCLES](../../PRODUCT.md#mint-tcycles). The approval costs one ledger fee.
- **The approval is the switch.** Approving turns it on, and setting the approval to zero turns it off. There is no separate setting.
- **Automatic use.** Every CC is charged to the OISY allowance first. When a CC returns Insufficient allowance and its AR is Refused, the shared signer module repeats it once, charged to the user's own cycles, if an approval is left; so does a CC that costs more than the OISY allowance covers, with no warning. During the AR cooldown, CCs go straight to own cycles. If the repeat succeeds, the flow never sees the failure. After the cooldown, the next CC tries the OISY allowance first again, so OISY pays again as soon as its allowance covers a CC, without a reload, and phase 1's AR, at most one a minute, serves as the recheck. Before each such repeat, one CC fails at no charge. The approval is the consent, and its amount caps what can be charged.
- **No prompt per transaction**: no warning and no checkbox.
- The approval left and the TCYCLES balance are read with free queries on the cycles ledger.
- **Own cycles running low.** A CC paid with the user's own cycles fails when the approval is used up (`InsufficientAllowance`) or the TCYCLES balance is (`InsufficientFunds`). Both show phase 1's usage-credits error text in the flow's error toast, in place of its usual text (see 4.4).

### 6.2 Entry points and state

- **An allowance card on the Tools page** shows the free signatures left (the OISY allowance left), the spending limit (the approval left, of the limit set last: "1.2 of 2 TCYCLES left") and the ICP Cycles balance, since either can run low, with **Set spending limit** and **Get ICP Cycles**. The ledger keeps only the approval left, so the limit set last comes from the cycles ledger's index. Allowances are also given in signatures, estimated at the backend's cost per signature; the spending limit's counts only what the balance can pay, with a warning while the balance covers less than the approval left. It stays out of the top row: users should rarely need it.
- **Set spending limit** sets the approval to the amount the user enters, starting at the limit set last, up to their TCYCLES balance, 0 to revoke it, after a review step that shows the previous limit, the remaining and the new limit. **Get ICP Cycles** opens Mint TCYCLES. The card reads the cycles ledger itself, so it works whether or not TCYCLES is enabled.
- **From the toast.** The allowance-issue toast links to the Tools card, next to its Learn more link, as the Activity info box links to Settings.
- **Showing it.** When own cycles pay the CC after a Refused AR, the allowance-issue toast keeps its title, and its text says signing now uses the user's own credits (see pending decision 10).

## 7. Phase 4: bound the total

- A global cap on what OISY grants in a period.
- A smaller OISY allowance set by each Granted AR.
- Possibly a separate pool for new users.
- When the cap is reached, ARs are Refused, and phases 1 to 3 handle it.
- The cap size and period, the OISY allowance per Granted AR and the new-user pool get decided later.

## 8. Delivery plan

This spec lands in its own PR, at the bottom of a GitHub stack. The phases follow in PRs on top of it, each with its `docs/ai/PRODUCT.md` update.

1. **Phase 1**, in this order:
   1. Load: no sign-out on a Refused AR at load (#14737).
   2. The AR after Insufficient allowance, the repeat, the AR cooldown, Allowance issue and the toasts (#14739).
   3. Translations (#14754).
   4. The Plausible events (see 4.8).
2. **Phase 2:** the backend's costly calls become CCs, the frontend handles their Insufficient allowance, and the backend accepts the user's own cycles for them, from the own-cycles subaccount, which the signer then charges too (see 5.1).
3. **Phase 3**, which comes before phase 2: the approval step, the Tools card, the payment-type switch and the toast's link to the Tools card, for signer CCs.
4. **Phase 4:** the cap, the smaller OISY allowance per Granted AR and the new-user pool.

## 9. Acceptance criteria

### Phase 1

1. A Refused AR at load signs nobody out, sets no Allowance issue and lets the app load.
2. An AR stopped by the hourly or the per-minute limit counts as Refused.
3. A CC that returns Insufficient allowance triggers one AR before its flow sees the error. CCs failing at the same time share one AR.
4. During the AR cooldown, no AR is sent, and the CC is handled as if its AR were Refused.
5. After a Granted AR, or a Skipped one with a larger OISY allowance, the CC is repeated once. When the repeat succeeds, the flow sees no failure.
6. A repeated CC that returns Insufficient allowance again is handled like the Skipped case without a larger OISY allowance, with no second AR.
7. Refused: the flow shows its usual error, Allowance issue is set, and the allowance-issue toast shows.
8. While Allowance issue is set, every CC that returns Insufficient allowance shows the allowance-issue toast again. The user can close it, and it disappears when Allowance issue clears.
9. The allowance-issue toast looks different from every other toast: warn level, the inverted theme, a title and its own icon.
10. Skipped with no larger OISY allowance: the flow shows its usual error and a warning toast that stays until closed, without setting Allowance issue.
11. Any Granted or Skipped AR clears Allowance issue.
12. No form or flow changes, and Allowance issue alone disables no feature.
13. Every other CC result, `InsufficientFunds` included, keeps today's handling, ICP and ICRC sends are unaffected, and the BTC send through the backend no longer says to sign out and back in.
14. Every AR fires one `oisy_allowance_request` event with its trigger and answer, and every CC that returns Insufficient allowance fires one `charged_call` event with its method.
15. When a CC still fails for Insufficient allowance, the flow's error toast shows the usage-credits error text in place of its usual text, and the rest of the flow is unchanged.

### Phase 2: own cycles

1. Setting the limit leaves the own-cycles subaccount's balance at the new limit, with the signer and the backend each approved on it for that limit.
2. Signer and backend CCs paid with own cycles are charged to the subaccount before they run, and together never take more than its balance.
3. A CC paid with own cycles that the subaccount can't cover runs nothing, and the flow's error toast shows the usage-credits error text.
4. When TCYCLES is enabled, the assets page shows the subaccount's balance next to the TCYCLES balance, the USD totals include it, and send and Max use only the main account.

### Phase 3

1. A user can approve an amount of their TCYCLES for CCs from the Tools card, in one step.
2. Every CC is charged to the OISY allowance first. A CC whose AR is Refused, or that falls in the AR cooldown, is repeated once on the user's own cycles if an approval is left, with no prompt per transaction.
3. The Tools card shows the approval left, of the limit set last, and the TCYCLES balance, with **Set spending limit** and **Get ICP Cycles**.
4. A CC paid with the user's own cycles that fails for the approval or the TCYCLES balance shows the usage-credits error text in the flow's error toast, in place of its usual text.
5. The allowance-issue toast links to the Tools card.
6. Without a reload, OISY pays CCs again as soon as the OISY allowance covers them, for example after the hourly limit resets or another device gets a Granted AR.

## 10. Open questions (facts to confirm)

1. **Phase 2 calls.** Which user-triggered backend calls cost cycles beyond their execution, and how much each?
2. _Answered:_ **BTC balance route.** Yes: the certified BTC balance through the Chain Fusion Signer is turned off in every build before phase 1 ships, and the wallet reads it only through the backend (see 4.6).
3. _Answered:_ **Backend CCs with own cycles (phase 2).** Through the own-cycles subaccount, which the signer and the backend both charge, so its balance is one limit for both and the backend holds none of the user's cycles (see 5.1). A second approval from the main account would be a second limit. This no longer depends on pending decision 3, which only covers the OISY allowance.

## 11. Pending decisions (facts are clear — we just need to decide)

Numbers stay fixed: a resolved decision keeps its number, and a new one gets the next free number.

1. _Resolved:_ **BTC balance fallback: phase 1 or phase 2?** Phase 2. The route through the Chain Fusion Signer is off before phase 1 ships, so phase 1 leaves it out. The read through the backend becomes a CC, with its fallback, in phase 2 (see 4.6 and 5).
2. _Resolved:_ **Skipped after Insufficient allowance.** The OISY allowance stated before and after decides: larger, and the CC repeats; not larger, and the warning toast shows (see 4.4).
3. **Phase 2 mechanics.** How does the backend charge a CC to the one OISY allowance? Lowering the approval costs a ledger fee per change, often more than the call itself. A counter kept by the backend avoids that fee.
4. _Resolved:_ **ARs while Allowance issue is set.** None during the AR cooldown (see 1 and 4.3).
5. _Resolved:_ **The disabled main button.** No longer applies: no form disables anything (see 9).
6. _Resolved:_ **Phase 3 with an active approval.** No longer applies, since no form disables its button (see 9). How phase 3 shows its state is decision 10.
7. **Phase 4.** The cap size and period, the OISY allowance per Granted AR and the new-user pool.
8. _Resolved:_ **Skipped while Allowance issue is set.** A Skipped AR clears Allowance issue too, since the OISY allowance is then at or above the OISY allowance threshold (see 1 and 4.5).
9. _Resolved:_ **Where the outcome shows.** Not in the forms. After a Granted AR the CC repeats once; otherwise the allowance-issue toast and the warning toast say what happened, next to the form's usual error. The earlier design, an outcome box and a disabled main button in every form plus a banner, needed changes in every flow that makes CCs and made them all depend on this feature (#14740 and #14741, closed).
10. _Resolved:_ **Phase 3 with toasts.** The allowance-issue toast links to the Tools card (see 6.2). When own cycles pay the CC after a Refused AR, the toast keeps its title, and its text says signing now uses the user's own credits.

## 12. Non-goals

- No change to any form or flow: none of them learns about the AR, the repeat or Allowance issue.
- No message box and no disabled button in the forms.
- No banner and no **Retry** button.
- No CC prices and no OISY allowance shown in phase 1.
- No setup for own cycles on top of an open form in phase 3 (a later improvement).
- No confirmation per transaction when paying with own cycles.

## 13. References

- Backend: `src/backend/src/api/signer.rs`, `src/backend/src/signer/service.rs`, `src/backend/src/utils/rate_limiter.rs`.
- Frontend: `src/frontend/src/lib/services/loader.services.ts`, `src/frontend/src/lib/canisters/backend.canister.ts`, `src/frontend/src/lib/api/signer.api.ts`, `src/frontend/src/lib/canisters/signer.canister.ts`, `src/frontend/src/lib/canisters/signer.constants.ts`, `src/frontend/src/lib/canisters/signer.errors.ts`, `src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts`, `src/frontend/src/btc/utils/btc-send.utils.ts`, `src/frontend/src/lib/stores/toasts.store.ts`, `src/frontend/src/lib/components/ui/Toast.svelte`, `src/frontend/src/lib/components/tools/Tools.svelte`.
- Interfaces: `src/declarations/signer/signer.did` (`PaymentType`), `src/declarations/cycles_ledger/cycles_ledger.did` (`icrc2_allowance` is a query).
- Signer payments: `src/guard/src/guards/patron_pays_icrc2_cycles.rs` in dfinity/papi at `a102b459`, the version the Chain Fusion Signer uses. It refuses only the signer's own account as patron, and charges through `withdraw_from` with a spender subaccount from the caller's principal.
- Related specs: `2026-09-23-feat-mint-tcycles-from-icp.md`, `2026-10-28-feat-canister-top-up-with-icp.md`, `2026-11-02-impr-btc-send-via-backend.md`.
- Related open drafts, idle since June 2026: [#13144](https://github.com/dfinity/oisy-wallet/pull/13144) (`cfs_sign` event) and [#13145](https://github.com/dfinity/oisy-wallet/pull/13145) (friendlier signer payment errors).
