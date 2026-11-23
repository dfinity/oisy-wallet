# Spec: The OISY allowance, handled in the app, payable with own cycles, bounded in total

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## 1. Terms

The rest of the spec uses these terms with exactly this meaning.

- **OISY allowance:** the amount of cycles from OISY's account that a user can still spend.
- **OISY allowance threshold:** an amount of cycles. The backend sets a new OISY allowance only while the OISY allowance is below it.
- **Charged call (CC):** a call that costs cycles, charged to the OISY allowance or, from phase 3, to the user's own cycles. Today that's every Chain Fusion Signer call, including the certified BTC balance. From phase 2, it also covers backend calls that cost cycles beyond their execution. Its status for this spec:
  - **Insufficient allowance:** the CC fails because the OISY allowance is smaller than its charge.
- **Allowance request (AR):** OISY's call to the backend that asks for a new OISY allowance. Its answers:
  - **Granted:** the backend sets a new OISY allowance.
  - **Skipped:** the backend sets no new OISY allowance because the OISY allowance is at or above the OISY allowance threshold.
  - **Refused:** the backend returns an error and sets no new OISY allowance.
- **Allowance issue:** a global state. It's set when the AR that follows an Insufficient allowance is Refused, and cleared when an AR is Granted.
- **AR cooldown:** while Allowance issue is set, the minute after each Refused AR. During it, OISY sends no AR.

## 2. Goal

OISY pays the cycles for each user's CCs from the OISY allowance. This spec makes OISY:

1. **Phase 1:** handle Insufficient allowance clearly in the app.
2. **Phase 2:** charge the backend's calls that cost cycles beyond their execution to the same OISY allowance, which makes them CCs.
3. **Phase 3:** let a user pay CCs with their own cycles while Allowance issue is set.
4. **Phase 4:** bound the total OISY grants, and lower the OISY allowance each Granted AR sets.

The phases ship one by one, in this order. Each is useful on its own.

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
- A Refused AR at load causes **no sign-out**, sets no Allowance issue and shows no banner. The app carries on. The backend sets a new OISY allowance only below the OISY allowance threshold, so a Refused AR at load does not mean the next CC fails.

### 4.3 AR after Insufficient allowance

- When a CC returns Insufficient allowance, OISY sends an AR right away, in the shared signer module, before the flow sees the error. The failing step in the execution modal stays on screen a few seconds longer.
- CCs that return Insufficient allowance at the same time share one AR.
- During the AR cooldown, OISY sends no AR, and the CC is handled as if its AR were Refused.
- An AR stopped by the hourly or the per-minute limit is Refused. The frontend no longer turns it into Skipped.
- The flow takes its **normal error path** back to its form and **never continues by itself**. The error tells the form the AR's answer.

### 4.4 What the form shows

- **Granted:** an info box says the OISY allowance ran out and has been renewed, so try again. The form's buttons work as usual.
- **Refused**, or no AR during the AR cooldown: a warning says there isn't enough OISY allowance right now, so try again later. The form's main button (for example **Swap**) is disabled, and Allowance issue is set.
- **Skipped:** the form compares the OISY allowance stated in the Skipped answer with the one stated in the Insufficient allowance error.
  - **Larger now:** another tab or device got a new OISY allowance in the meantime. The form shows what it shows for Granted.
  - **Not larger:** the CC costs more than the OISY allowance, and the backend sets no new one at or above the OISY allowance threshold. A warning says this transaction costs more than the OISY allowance covers, and the form's main button is disabled. Allowance issue is **not** set, since cheaper CCs still work. Today this happens with a large BTC send in production, which is charged for all its inputs in one CC.

### 4.5 Allowance issue and the banner

- While Allowance issue is set, a global banner says the OISY allowance is limited and some transactions may fail. It can't be closed.
- The banner has a **Retry** button that sends an AR. It's disabled during the AR cooldown.
- Any Granted AR clears Allowance issue: from **Retry**, from an AR after Insufficient allowance, or at app load.
- **No global blocking.** Allowance issue disables no feature, since no CC's price is known. Only the form whose CC just failed disables its main button.

### 4.6 CCs without a form

A CC without a form, today the certified BTC balance in production, follows the same AR, and a Refused AR sets Allowance issue as for any CC. The certified BTC balance then falls back to the free unverified read from the Bitcoin canister, which the scheduler already makes, and the wallet shows that the balance is unverified. Whether this lands in phase 1 or phase 2 is still open (see [Pending decisions](#11-pending-decisions-facts-are-clear--we-just-need-to-decide)).

### 4.7 What does not change

- Every other CC result keeps today's handling, including `InsufficientFunds`, when OISY's own cycles account is short.
- ICP and ICRC sends, receiving, addresses and every balance other than BTC work as before, with or without Allowance issue.

## 5. Phase 2: the backend's costly calls become CCs

- **One allowance.** A user-triggered backend call that costs cycles beyond its execution (for example a Bitcoin canister call, a vetKD key derivation or an HTTP outcall) becomes a CC, charged to the same OISY allowance.
- When the OISY allowance can't cover such a CC, the backend returns Insufficient allowance. The frontend handles it like a signer CC: the AR, the form, Allowance issue and the banner.
- How the backend charges a CC to the OISY allowance, and the exact list of calls, are still open (see [Open questions](#10-open-questions-facts-to-confirm)).

## 6. Phase 3: pay with your own cycles

### 6.1 How it works

- The signer accepts "caller pays" (`CallerPaysIcrc2Cycles`): its charge comes from the caller's main cycles-ledger account, through an approval the caller gave the signer.
- **Allowing.** In one approval step, the user picks an amount from their TCYCLES balance and confirms. A user without TCYCLES gets some first, for example through [Mint TCYCLES](../../PRODUCT.md#mint-tcycles). The approval costs one ledger fee.
- **The approval is the switch.** Approving turns it on, and setting the approval to zero turns it off. There is no separate setting.
- **Automatic use.** While Allowance issue is set and an approval is left, CCs are charged to the user's own cycles instead of the OISY allowance. The approval is the consent, and its amount caps what can be charged.
- **No prompt per transaction**: no warning and no checkbox.
- The approval left and the TCYCLES balance are read with free queries on the cycles ledger.

### 6.2 Entry points

- **The form's warning after a Refused AR** offers **Use my own cycles**. It closes the form and opens the Tools page. Opening the setup on top of the form can come later.
- **The banner** offers it too (see 6.3).
- **An allowance card on the Tools page** shows the approval left and the TCYCLES balance, with **Add more** and **Get cycles**.

Because the AR is automatic, **Use my own cycles** only appears after a Refused AR. A user never pays with their own cycles while a Granted AR is one click away.

### 6.3 Banner

- **a) No approval left:** the OISY allowance is limited, with **Retry** or **Use my own cycles**.
- **b) Approval active:** CCs are charged to the user's own cycles from their approval of X TC, with **Check again**, which sends an AR.
- When the approval runs out, the banner goes back to a).

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
   2. The AR after Insufficient allowance, the AR cooldown, Allowance issue and the banner.
   3. The swap forms.
   4. The send forms: Send, Convert and the AI assistant's send.
   5. The other flows that make CCs: WalletConnect, NFT transfer, ERC-4626, OpenCryptoPay and Liquidium.
   6. Translations.
2. **Phase 2:** the backend's costly calls become CCs, and the frontend handles their Insufficient allowance.
3. **Phase 3:** the approval step, the Tools card, the payment-type switch, banner states a) and b), and the backend accepting the user's cycles for its CCs.
4. **Phase 4:** the cap, the smaller OISY allowance per Granted AR and the new-user pool.

## 9. Acceptance criteria

### Phase 1

1. A Refused AR at load signs nobody out, sets no Allowance issue and lets the app load.
2. An AR stopped by the hourly or the per-minute limit counts as Refused.
3. A CC that returns Insufficient allowance triggers one AR before its flow sees the error. CCs failing at the same time share one AR.
4. During the AR cooldown, no AR is sent, and the CC is handled as if its AR were Refused.
5. A failed flow returns to its form through its normal error path and never continues by itself.
6. Granted, or Skipped with a larger OISY allowance than at the failure: the form shows the info box and its usual buttons.
7. Refused: the form shows the warning, disables its main button and sets Allowance issue.
8. Skipped with no larger OISY allowance: the form shows the warning that the transaction costs more than the OISY allowance covers and disables its main button, without setting Allowance issue.
9. While Allowance issue is set, the banner shows, can't be closed and offers **Retry**, which is disabled during the AR cooldown.
10. Any Granted AR clears Allowance issue.
11. Allowance issue alone disables no feature.
12. Every flow that makes CCs reaches these outcomes instead of a generic or technical error. That covers send, swap, approve, permit, ERC-4626, NFT transfer, OpenCryptoPay, WalletConnect and Liquidium, on BTC, ETH/EVM, SOL and XRP. The BTC backend send's "sign out and back in" message is replaced too.
13. Every other CC result, `InsufficientFunds` included, keeps today's handling, and ICP and ICRC sends are unaffected.

### Phase 3

1. A user can approve an amount of their TCYCLES for CCs from the form's warning after a Refused AR, from the banner or from the Tools card, in one step.
2. While Allowance issue is set and an approval is left, CCs are charged to the user's own cycles, with no prompt per transaction.
3. The banner shows a) without an approval left and b) with one.
4. The Tools card shows the approval left and the TCYCLES balance, with **Add more** and **Get cycles**.

## 10. Open questions (facts to confirm)

1. **Phase 2 calls.** Which user-triggered backend calls cost cycles beyond their execution, and how much each?
2. **BTC balance route.** Will the certified BTC balance through the backend, on local and staging today, reach production before phase 1 ships?
3. **Phase 3, backend CCs.** How does a user pay the backend's CCs with their own cycles: a second approval, with the backend as spender, or another way? This depends on pending decision 2.

## 11. Pending decisions (facts are clear — we just need to decide)

1. **BTC balance fallback: phase 1 or phase 2?** In production, the certified BTC balance is a CC today, so it can return Insufficient allowance in phase 1. If the backend route reaches production first (open question 2), it becomes a phase 2 CC.
2. **Phase 2 mechanics.** How does the backend charge a CC to the one OISY allowance? Lowering the approval costs a ledger fee per change, often more than the call itself. A counter kept by the backend avoids that fee.
3. **The disabled main button.** After a Refused AR, does the form's main button enable again when Allowance issue is cleared, for example by a Granted AR after a CC without a form?
4. **Skipped while Allowance issue is set.** When another tab or device got a new OISY allowance, an AR from **Retry** is Skipped, not Granted, so Allowance issue stays set. Should a Skipped AR clear it too?
5. **Phase 3 with an active approval.** After a Refused AR, the form would disable its main button although the next try would be charged to the user's own cycles. Should the button stay enabled then, with a note that the next try uses the user's own cycles?
6. **Phase 4.** The cap size and period, the OISY allowance per Granted AR and the new-user pool.

### Resolved

- _Resolved:_ an AR that is Skipped after Insufficient allowance. The form compares the OISY allowance before and after (see 4.4).
- _Resolved:_ ARs while Allowance issue is set. None during the AR cooldown (see 1 and 4.3).

## 12. Non-goals

- A failed flow never continues by itself.
- No warning in each form while Allowance issue is set. The banner is the only global sign.
- The banner can't be closed.
- No CC prices and no OISY allowance shown in phase 1.
- No setup for own cycles on top of an open form in phase 3 (a later improvement).
- No confirmation per transaction when paying with own cycles.

## 13. References

- Backend: `src/backend/src/api/signer.rs`, `src/backend/src/signer/service.rs`, `src/backend/src/utils/rate_limiter.rs`.
- Frontend: `src/frontend/src/lib/services/loader.services.ts`, `src/frontend/src/lib/canisters/backend.canister.ts`, `src/frontend/src/lib/api/signer.api.ts`, `src/frontend/src/lib/canisters/signer.canister.ts`, `src/frontend/src/lib/canisters/signer.constants.ts`, `src/frontend/src/lib/canisters/signer.errors.ts`, `src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts`, `src/frontend/src/btc/utils/btc-send.utils.ts`, `src/frontend/src/eth/components/swap/SwapEthWizard.svelte`, `src/frontend/src/lib/components/swap/SwapReview.svelte`, `src/frontend/src/lib/components/tools/Tools.svelte`.
- Interfaces: `src/declarations/signer/signer.did` (`PaymentType`), `src/declarations/cycles_ledger/cycles_ledger.did` (`icrc2_allowance` is a query).
- Related specs: `2026-09-23-feat-mint-tcycles-from-icp.md`, `2026-10-28-feat-canister-top-up-with-icp.md`, `2026-11-02-impr-btc-send-via-backend.md`.
- Related open drafts, idle since June 2026: [#13144](https://github.com/dfinity/oisy-wallet/pull/13144) (`cfs_sign` event) and [#13145](https://github.com/dfinity/oisy-wallet/pull/13145) (friendlier signer payment errors).
