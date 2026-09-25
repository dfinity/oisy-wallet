# impr: Tell the user when the XRP send form cannot read account state

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Problem

The XRP send form blocks Next until three figures are known — the account's reserve, the network fee, and the balance. All three are `undefined` while loading **and** `undefined` when loading failed, and the form renders neither state. A user who hits an RPC failure sees a Max of zero and a Next that will not enable, with nothing on screen explaining why or suggesting that anything is being retried.

Nothing is broken and nothing is at risk: all three sources retry on their own, so the form recovers without user action. But for a failure lasting more than a few seconds it is indistinguishable from a form that is simply dead, which is the worst reading available for a screen that moves funds.

Raised in review on #13593 and deliberately deferred there, because a partial fix — explaining a fee failure while staying mute on a balance one — is worse than none.

## Current behaviour

| Source  | Set by                                                              | On failure                                                                        | Retry              | Visible to the user                           |
| ------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------ | --------------------------------------------- |
| Reserve | `XrpFeeContext.loadReserve` → `reserveStore`                        | `undefined` (except `XrpAccountNotFoundError`, which is the settled base reserve) | failure-only, 10s  | nothing                                       |
| Fee     | `XrpFeeContext.estimateFee` → `feeStore`                            | nothing published; last good value retained                                       | poller, 10s        | nothing                                       |
| Balance | `xrp-wallet.scheduler` worker → `syncWalletError` → `balancesStore` | `balancesStore.reset(tokenId)`                                                    | scheduler interval | a global toast, `init.error.xrp_wallet_error` |

The gate is `XrpSendForm.svelte`:

```
isNullish($reserve) || isNullish($fee) || isNullish($sendBalance)
```

Two consequences worth stating precisely, because the review that prompted this got both slightly wrong:

- It is **not** permanent. Each source retries, so a transient failure clears itself.
- The send-time `xrp_account_state_unavailable` message in `XrpSendTokenWizard.send()` does **not** cover this. It is reachable only when a value goes missing _after_ the form gate passed — a reload failing while the user sits on review. When a value has simply never loaded, Next is disabled and that message cannot be reached.

## Proposed behaviour

The form distinguishes _reading_ from _could not read_, and says which.

- While any of the three is unknown and no failure has been recorded, the form shows a neutral reading state. Next stays disabled.
- Once a source has failed at least once and is still unknown, the form shows that it could not read the account details and is retrying. Next stays disabled.
- When all three are known, the state disappears and the form behaves exactly as today.
- Recovery is automatic — there is no retry button. The three retries already exist and a manual control would duplicate them, and be misleading about which source it retried.

The distinction matters because the two states call for different things from the user: waiting versus knowing that something is wrong and may need attention (a network problem, a provider outage).

## Acceptance criteria

1. With all three known, the form renders no status and Next is enabled exactly as it is today.
2. With any source unknown and no failure recorded, the form renders the reading state, and Next is disabled.
3. After a reserve lookup fails, the form renders the failure state naming account details, and keeps it until the reserve arrives.
4. After a fee request fails with no previous estimate, the form renders the failure state. After a fee request fails with a previous estimate retained, it does **not** — the form has a usable fee and nothing is blocked.
5. After a balance sync error, the form renders the failure state, in addition to the existing global toast.
6. When a failed source later succeeds, the failure state clears without user action.
7. `XrpAccountNotFoundError` is not a failure: an account that is not on-ledger owns nothing, the base reserve is the answer, and the form proceeds normally.
8. The strings are localized across the 13 locales in the `Languages` enum. `ar.json` keeps the empty values the sync writes.

## Non-goals

- No retry button, per the reasoning above.
- No change to any retry cadence, or to which errors are retried.
- No change to the send-time guards in `XrpSendTokenWizard.send()`. They cover a different case — a value lost after the gate passed — and already have their own message.
- No change to the global `xrp_wallet_error` toast. This adds form-level context; it does not replace the existing signal.
- Not generalised to the BTC, ETH, SOL or ICP send forms. They have different readiness models and this should prove itself on XRP first.

## Implementation notes

- `src/frontend/src/xrp/stores/xrp-fee.store.ts` — `FeeStore` and `ReserveStore` currently expose `bigint | undefined`. They need a way to express "failed and still unknown" without collapsing it into the same `undefined`. Keep the existing readers working: `XrpSendAmount`, `XrpSendForm` and `XrpFeeDisplay` all subscribe to the value, and the value is what gates the form.
- `src/frontend/src/xrp/components/fee/XrpFeeContext.svelte` — the two catch blocks and the out-of-range quote branch are where a failure is currently swallowed. `loadReserve` already distinguishes `XrpAccountNotFoundError` from an operational failure; that distinction is the model.
- `src/frontend/src/xrp/services/xrp-listener.services.ts` — `syncWalletError` resets `balancesStore` and toasts. The error reaches the app; what is missing is a state the form can read. This is the leg with the most design freedom and the least precedent.
- `src/frontend/src/xrp/components/send/XrpSendForm.svelte` — renders the state. The `invalid` expression stays as it is; this is presentation, not gating.
- `src/frontend/src/lib/i18n/en.json` — new strings under `send`, then `npm run i18n` and translations for the 13 shipped locales.
- `docs/ai/PRODUCT.md` — the XRP section exists on `main`: #13597 created it and has merged, along with the rest of the XRP stack. The workflow's requirement that the `PRODUCT.md` change land in the same PR as the behaviour change is therefore satisfied by basing on `main`, and the section this extends is already there. (Written when `main` had no XRP section and the implementation would have had to sit on top of #13597.)

## Open questions (facts to confirm)

1. Does `syncWalletError` fire on every balance sync failure, or only on some? `xrp-wallet.scheduler.ts:110` catches and calls `postMessageWalletError`, but confirm there is no path that resets the balance silently — the form would then show a reading state forever for a case that is really a failure.
2. Is `hideToast` used anywhere for XRP? If a caller suppresses the toast, the form state becomes the only signal and criterion 5 matters more than it looks.
3. Does any other subscriber to `feeStore` / `reserveStore` depend on the exact `bigint | undefined` shape in a way a wider type would break? `XrpFeeDisplay` and `XrpSendAmount` are the known readers; confirm there are no others.

## Pending decisions (facts are clear — we just need to decide)

1. **Where the state renders.** Under the amount input, above the toolbar, or as a banner at the top of the form. Affects nothing functional; it is a design call and the form is already dense.
2. **One string or three.** A single "could not read your account details" covers all three sources and cannot go stale; naming the failing source (fee / reserve / balance) is more useful and means three strings across 14 locales, plus a rule for what to show when two fail at once.
3. ~~**Whether the implementation waits for #13597 or merges before it.**~~ **Resolved by events:** #13597 merged, so `main` carries both the XRP section and the enabled chain. Basing on `main` now satisfies the workflow with none of the trade-offs this question weighed — no early section for unreachable behaviour, no deferred `PRODUCT.md` line.
