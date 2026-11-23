# Spec: The OISY allowance, handled in the app, payable with own cycles, bounded in total

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## 1. Goal

OISY pays the cycles for each user's costly calls from one per-user grant, the **OISY allowance**. Today it pays for signing through the Chain Fusion Signer. This spec makes OISY:

1. **Phase 1:** handle a used-up OISY allowance clearly in the app.
2. **Phase 2:** charge the backend's own costly calls to the same allowance.
3. **Phase 3:** let a user pay with their own cycles when the OISY allowance is used up.
4. **Phase 4:** bound the total OISY grants, and lower the default grant per user.

The phases ship one by one, in this order. Each is useful on its own.

## 2. Motivation

- **Predictable cost.** The cycles OISY grants are limited per user and per hour, but not in total. Phase 4 bounds the total.
- **Running out must work well first.** With a bound in place, users run out more often. So the app has to handle a used-up allowance well (phase 1), the backend's costs have to count too (phase 2), and users need a way to continue on their own cycles (phase 3).
- **Today's handling is poor.** A used-up allowance shows as a generic or technical error ("Ledger error: …"). At load, most failures of the allowance request sign the user out.

## 3. Terms

- **OISY allowance:** the cycles OISY grants a user for costly calls. The code still calls it the signing allowance (`allow_signing`). Phase 2 extends it to the backend's costly calls, so the UI never calls it a signing allowance.
- **Allowance request:** the call that asks the backend for a new OISY allowance. It tops up only when less than the top-up level is left. Otherwise it answers "not needed", with the amount left.
- **Allowance-issue state:** a global frontend state. It means an automatic re-request after a failed call failed (see [4.3](#43-automatic-re-request)).
- **Own cycles:** the user's TCYCLES, held in their main account on the cycles ledger.

## 4. Phase 1: handle a used-up OISY allowance (frontend)

### 4.1 What exists today

- **The grant.** One request grants about $4 (2.917T cycles). It tops up only below about $2 (1.458T). The backend grants at most 3 times an hour per user, answers at most 10 requests a minute per user, and checks the II delegation. The grant is an ICRC-2 approval from the backend's cycles-ledger account to the signer, with a spender subaccount per user and no expiry. See `src/backend/src/api/signer.rs`, `src/backend/src/signer/service.rs` and `src/backend/src/utils/rate_limiter.rs`.
- **The request at load.** Every app load, sign-in or page reload, requests a new allowance (`initSignerAllowance` in `src/frontend/src/lib/services/loader.services.ts`). The hourly-limit answer lets the app carry on: the frontend turns it into "not needed" with 0 left (`allowSigning` in `src/frontend/src/lib/canisters/backend.canister.ts`). Any other failure signs the user out.
- **Paid calls.** Every signer call goes through `src/frontend/src/lib/api/signer.api.ts` with "OISY pays" as the payment type (`SIGNER_PAYMENT_TYPE` in `src/frontend/src/lib/canisters/signer.constants.ts`). The callers are the signing flows on BTC, ETH/EVM, SOL and XRP: send, swap, approve, permit, ERC-4626, NFT transfer, OpenCryptoPay, WalletConnect and Liquidium. In production, the certified BTC balance is a paid call too (`src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts`). Addresses are derived locally, and the signer is only their fallback. ICP and ICRC sends don't use the signer.
- **A call the allowance can't cover** fails before anything is signed, and nothing is charged. Its error says `InsufficientAllowance`, with the amount left. When OISY's own cycles account is short instead, it says `InsufficientFunds`.
- **No prices.** The signer has no price list, and each call has its own price. So the frontend can't know whether what's left covers the next call: a cheap call may work while a costlier one fails.
- **What the user sees.** The flow's normal error, which today is generic or technical. For example, a failed ETH swap returns to its review with "failed unexpectedly". On local and staging, a BTC send through the backend tells the user to sign out and back in to renew the allowance.

### 4.2 Load

- Every app load requests a new allowance, as today.
- If the request fails for any reason, there is **no sign-out and no banner**, and the app carries on. The request only tops up below about $2, so a failed request doesn't mean the user can't sign.
- The frontend treats the **hourly-limit answer as a failure**, not as "not needed".

### 4.3 Automatic re-request

- When a paid call fails for lack of allowance, OISY requests a new allowance right away, in the shared signer module, before the flow sees the error. The failing step in the execution modal stays on screen a few seconds longer.
- Calls that fail at the same time share one request.
- The call still fails. The flow takes its **normal error path** back to its form and **never continues by itself**.
- The error tells the form the outcome: **A**, a new allowance came through, or **B**, the request failed.

### 4.4 Status A: a new allowance came through

The form shows an info box: the allowance ran out and has been renewed, so try again. Its buttons work as usual.

### 4.5 Status B: the request failed

- The form shows a warning box: there isn't enough allowance right now, so try again later.
- The form's main button (for example **Swap**) is disabled.
- The global allowance-issue state is set.

### 4.6 Allowance-issue state and banner

- **Set only by B.** It always means an automatic re-request after a failed call failed: the hourly limit, an empty OISY cycles account or an unreachable cycles ledger.
- **Banner.** While the state is set, a global banner says the allowance is limited and some transactions may fail. It can't be closed.
- **Retry.** The banner has a **Retry** button, with a fixed cooldown of 1 minute after each try.
- **Cleared** as soon as a new allowance comes through: from the banner's Retry, from an automatic re-request (status A) or from a new app load.
- **No global blocking.** No feature is disabled because of the state, since no call's price is known. Only the form whose call just failed disables its main button (B).

### 4.7 Background calls

A paid call without a form, today the certified BTC balance in production, uses the same automatic re-request, and B sets the state as for any call. The certified BTC balance then falls back to the free unverified read from the Bitcoin canister, which the scheduler already makes, and the wallet shows that the balance is unverified. Whether this lands in phase 1 or phase 2 is still open (see [Pending decisions](#11-pending-decisions-facts-are-clear--we-just-need-to-decide)).

### 4.8 What does not change

ICP and ICRC sends, receiving, addresses and every balance other than BTC work as before, with or without the state.

## 5. Phase 2: the backend's costly calls use the OISY allowance

- **One allowance.** A user-triggered backend call that costs cycles beyond its execution (for example a Bitcoin canister call, a vetKD key derivation or an HTTP outcall) is charged to the same OISY allowance as signing.
- When the allowance can't cover such a call, the backend refuses it with an allowance error. The frontend handles that error like a signer's: automatic re-request, A or B, the state and the banner.
- How the backend charges a call to the allowance, and the exact list of calls, are still open (see [Open questions](#10-open-questions-facts-to-confirm)).

## 6. Phase 3: pay with your own cycles

### 6.1 How it works

- The signer accepts "caller pays" (`CallerPaysIcrc2Cycles`): its fee comes from the caller's main cycles-ledger account, through an approval the caller gave the signer.
- **Allowing.** In one approval step, the user picks an amount from their TCYCLES balance and confirms. A user without TCYCLES gets some first, for example through [Mint TCYCLES](../../PRODUCT.md#mint-tcycles). The approval costs one ledger fee.
- **The approval is the switch.** Approving turns it on, and setting the approval to zero turns it off. There is no separate setting.
- **Automatic use.** While the allowance-issue state is set and an approval is left, paid calls use the user's cycles instead of the OISY allowance. The approval is the consent, and its amount caps what can be spent.
- **No prompt per transaction**: no warning and no checkbox.
- The approval left and the TCYCLES balance are read with free queries on the cycles ledger.

### 6.2 Entry points

- **Status B's warning box** offers **Use my own cycles**. It closes the form and opens the Tools page. Opening the setup on top of the form can come later.
- **The banner** offers it too (see 6.3).
- **An allowance card on the Tools page** shows the approval left and the TCYCLES balance, with **Add more** and **Get cycles**.

Because the re-request is automatic, **Use my own cycles** only appears once OISY's allowance really isn't available. A user never pays with their own cycles while a free allowance is one click away.

### 6.3 Banner

- **a) No approval left:** the allowance is limited, with **Retry** or **Use my own cycles**.
- **b) Approval active:** the allowance is limited and signing uses the user's own cycles from their approval of X TC, with **Check again** to get the OISY allowance back.
- When the approval runs out, the banner goes back to a).

## 7. Phase 4: bound the total

- A global cap on what OISY grants in a period.
- A smaller default grant per user.
- Possibly a separate pool for new users.
- When the cap is reached, the allowance request fails, and phases 1 to 3 handle it.
- Cap size, period, default grant and the new-user pool get decided later.

## 8. Delivery plan

1. **Phase 1:** one PR with this spec, the frontend changes and `docs/ai/PRODUCT.md`. Translations may follow in their own PR.
2. **Phase 2:** the backend charges its costly calls to the OISY allowance, the frontend handles its allowance errors, and `PRODUCT.md` is updated.
3. **Phase 3:** the approval step, the Tools card, the payment-type switch, banner states a) and b), the backend accepting the user's cycles for its own calls, and `PRODUCT.md`.
4. **Phase 4:** the cap, the smaller default grant and the new-user pool, with `PRODUCT.md`.

## 9. Acceptance criteria

### Phase 1

1. An allowance request at load that fails, for any reason, signs nobody out, shows no banner and lets the app load.
2. The hourly-limit answer counts as a failed request.
3. A paid call that fails for lack of allowance triggers one automatic re-request, before its flow sees the error. Calls failing at the same time trigger one request between them.
4. A failed flow returns to its form through its normal error path and never continues by itself.
5. A: the form shows the info box and its usual buttons.
6. B: the form shows the warning box, disables its main button and sets the allowance-issue state.
7. While the state is set, the banner shows, can't be closed and offers Retry, with a 1-minute cooldown after each try.
8. The state and banner clear on any new allowance: banner Retry, an automatic re-request or an app load.
9. No feature is disabled by the state alone.
10. Every flow that calls the signer reaches A or B instead of a generic or technical error. That covers send, swap, approve, permit, ERC-4626, NFT transfer, OpenCryptoPay, WalletConnect and Liquidium, on BTC, ETH/EVM, SOL and XRP. The BTC backend send's "sign out and back in" message is replaced too.
11. ICP and ICRC sends are unaffected.

### Phase 3

1. A user can approve an amount of their TCYCLES for paid calls from status B, the banner or the Tools card, in one step.
2. While the state is set and an approval is left, paid calls use the user's cycles, with no prompt per transaction.
3. The banner shows a) without an approval left and b) with one.
4. The Tools card shows the approval left and the TCYCLES balance, with Add more and Get cycles.

## 10. Open questions (facts to confirm)

1. **Phase 2 calls.** Which user-triggered backend calls cost cycles beyond their execution, and how much each?
2. **BTC balance route.** Will the certified BTC balance through the backend, on local and staging today, reach production before phase 1 ships?
3. **Phase 3, backend calls.** How does a user pay the backend's costly calls with their own cycles: a second approval, with the backend as spender, or another way? This depends on pending decision 3.

## 11. Pending decisions (facts are clear — we just need to decide)

1. **BTC balance fallback: phase 1 or phase 2?** In production, the certified BTC balance is paid from the OISY allowance today, so it fails in phase 1 once the allowance is used up. If the backend route reaches production first (open question 2), it becomes a phase 2 cost.
2. **"Not needed" after a failed call.** In production, a BTC send through the signer is charged in one go, with no cap on its inputs, so it can cost more than OISY ever grants. The re-request then answers "not needed", and a second try fails the same way. Should that count as B for the form, without setting the global state?
3. **Phase 2 mechanics.** How does the backend charge a call to the one allowance? Lowering the approval costs a ledger fee per change, often more than the call itself. A counter kept by the backend avoids that fee.
4. **Re-requests while the state is set.** Does a failing call still trigger an automatic re-request, or only once the 1-minute cooldown has passed?
5. **B's disabled button.** Does it enable again when the state clears, for example after a background re-request succeeds?
6. **Phase 3 with an active approval.** Status B would disable the main button although the next try would use the user's cycles. Should B keep the button enabled then, and say that the next try uses the user's cycles?
7. **Phase 4.** Cap size and period, the default grant and the new-user pool.

## 12. Non-goals

- A failed flow never continues by itself.
- No warning in each form while the state is set. The banner is the only global sign.
- The banner can't be closed.
- No call prices and no allowance left shown in phase 1.
- No setup for own cycles on top of an open form in phase 3 (a later improvement).
- No confirmation per transaction when paying with own cycles.

## 13. References

- Backend: `src/backend/src/api/signer.rs`, `src/backend/src/signer/service.rs`, `src/backend/src/utils/rate_limiter.rs`.
- Frontend: `src/frontend/src/lib/services/loader.services.ts`, `src/frontend/src/lib/canisters/backend.canister.ts`, `src/frontend/src/lib/api/signer.api.ts`, `src/frontend/src/lib/canisters/signer.canister.ts`, `src/frontend/src/lib/canisters/signer.constants.ts`, `src/frontend/src/lib/canisters/signer.errors.ts`, `src/frontend/src/btc/schedulers/btc-wallet.scheduler.ts`, `src/frontend/src/btc/utils/btc-send.utils.ts`, `src/frontend/src/eth/components/swap/SwapEthWizard.svelte`, `src/frontend/src/lib/components/swap/SwapReview.svelte`, `src/frontend/src/lib/components/tools/Tools.svelte`.
- Interfaces: `src/declarations/signer/signer.did` (`PaymentType`), `src/declarations/cycles_ledger/cycles_ledger.did` (`icrc2_allowance` is a query).
- Related specs: `2026-09-23-feat-mint-tcycles-from-icp.md`, `2026-10-28-feat-canister-top-up-with-icp.md`, `2026-11-02-impr-btc-send-via-backend.md`.
- Related open drafts, idle since June 2026: [#13144](https://github.com/dfinity/oisy-wallet/pull/13144) (`cfs_sign` event) and [#13145](https://github.com/dfinity/oisy-wallet/pull/13145) (friendlier signer payment errors).
