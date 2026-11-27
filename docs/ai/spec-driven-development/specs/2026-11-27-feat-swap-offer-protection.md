# Spec: Tell protected swap offers from unprotected ones

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Smart Swap never picks an offer that guarantees nothing when one that guarantees a minimum is
available, and a user who picks such an offer by hand knows they get an estimate.

Terms follow [`GLOSSARY.md`](../../../../GLOSSARY.md): a **protected offer** has a minimum that the
provider's protocol or OISY's pre-sign check enforces (exact offers count as protected); an
**unprotected offer** is an estimate with no minimum. Users only ever see the word "Estimate", and
only on unprotected offers.

The UI stays extremely minimal: no badge, colour, icon or banner for protected offers, and no hint
on the form while a protected offer is selected. The exception is marked in one place per surface,
in grey text that already exists on that surface.

Source: Artem, 2026-11-27, grilled in Claude Code. Every decision is listed in
[Decisions](#decisions).

This is the "no-slippage form redesign" that
[`2026-11-25-feat-rift-swap-provider.md`](./2026-11-25-feat-rift-swap-provider.md) (on
`origin/docs/ai/rift-spec`) defers ranking and presentation to, and that gates Rift's production
flag. Rift is the first unprotected provider. This spec ships on `main` first, provider-agnostic:
every provider on `main` is protected, so nothing changes visibly until Rift merges on top.

## Background

### How each provider protects the price

| Provider                  | What protects the price                                                                                                            | Class       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| ICPSwap                   | The pool enforces `amountOutMinimum` (`lib/services/swap.services.ts:915`)                                                         | Protected   |
| KongSwap                  | The canister enforces `max_slippage` (`lib/canisters/kong_backend.canister.ts:74`); the offer carries no minimum                   | Protected   |
| Velora (Delta and Market) | A signed order minimum or calldata minimum, decoded and checked before signing (`lib/utils/velora-swap.utils.ts:79,87-93`)         | Protected   |
| NEAR Intents              | A signed `minAmountOut`, refunded if not met (`lib/utils/swap.utils.ts:403-412`)                                                   | Protected   |
| LI.FI                     | `toAmountMin` in the calldata, plus a re-quote that refuses a lower minimum (`lib/services/lifi-swap-execution.services.ts:75-79`) | Protected   |
| Chain Fusion, 1Sec        | 1:1 minus fees (exact)                                                                                                             | Protected   |
| OISY Trade                | Fill-or-kill at the quoted price (exact)                                                                                           | Protected   |
| Rift (Rift branches only) | Nothing: "Quotes are indicative, not exact", and it fills at whatever price applies once the deposit arrives                       | Unprotected |

Protection is a property of the provider, not of the offer: Kong and Velora enforce a minimum
without exposing `receiveOutMinimum` on the offer, so that field can't be the signal.

### Ranking and "Best Rate" today

- Offers are sorted by raw `receiveAmount`, descending, in two places:
  `lib/services/swap.services.ts:773` (ICP) and `reduceSettledSwapResults` at
  `lib/services/swap.services.ts:1708` (every other source network).
- The automatic pick is `swapAmounts[0]` (`lib/components/swap/SwapAmountsContext.svelte:205`). A
  manual pick (`setManualProvider` in `lib/stores/swap-amounts.store.ts`) lasts only while the
  amount stays the same.
- "Best Rate" means "is `swaps[0]`", derived three times: `SwapProvider.svelte:29`,
  `SwapProviderCell.svelte:121`, `SwapProviderListModal.svelte:126`.
- The card's status line (`SwapProviderCell.svelte:150-164`) shows "Est. +$amount vs. lowest quote"
  (`swap.text.smart_swap_gain`) for the best offer, otherwise "Best of $count offers" or
  "$count offers compared". With a single offer the card is compact and has no status line
  (`SwapProviderCell.svelte:180-186`).
- `calculateSwapGainUsd` (`lib/utils/swap.utils.ts:515`) compares the selected offer with the
  lowest of all offers.

### Review today

`SwapReview.svelte` shows a "Max slippage" row (lines 166-181) and, above 7%, a high-slippage
`MessageBox` (around line 198) for every provider. The Rift branches add
`SwapRiftEstimateWarning.svelte` with `swap.text.rift_estimate_warning`.

## Behaviour

### Protection

- One map in `lib/constants/swap.constants.ts`, typed `Record<SwapProvider, boolean>` so that adding
  a provider to the enum fails type-checking until its protection is declared. Every provider on
  `main` is `true`. Name suggestion: `SWAP_PROVIDER_GUARANTEES_MINIMUM`, read through
  `isProtectedOffer(offer: SwapMappedResult): boolean` in `lib/utils/swap.utils.ts`.

### Ranking

- One helper, `sortSwapOffers`, replaces both sorts: protected offers first by `receiveAmount`
  descending, then unprotected offers by `receiveAmount` descending.
- So `swaps[0]` is the best protected offer whenever one exists, and the automatic pick
  (`swapAmounts[0]`) needs no change.
- **Best Rate** is `swaps[0]`, and only if it is protected. One helper replaces the three
  derivations. When only unprotected offers exist, no offer has Best Rate.

### Form: Smart Swap card

- A protected offer is selected: no change, whatever unprotected offers exist.
- An unprotected offer is selected (by hand, or because it is the only kind): the status line reads
  **"Estimate · no minimum"** (new key `swap.text.unprotected_offer_status`), in the status line's
  existing grey. This replaces the gain, "Best of" and "compared" texts. It shows even when the card
  would otherwise be compact (a single offer), because it is the only mark on the form.
- The gain compares protected offers only: `calculateSwapGainUsd` ignores unprotected offers, both
  as the selected offer and as the lowest quote.
- "Best of $count offers" counts protected offers only, so it never claims to beat a higher
  estimate it left out. "$count offers compared" keeps counting all offers.
- The screen-reader announcement (`SwapProviderCell.svelte:195`) adds the status after the provider
  name when the selected offer is unprotected, for example "Rift, Estimate · no minimum".
- A manual pick still resets when the amount changes (existing store behaviour), so an unprotected
  offer is opted into again after every amount edit.

### Provider list

- One list, no section header or divider, in `sortSwapOffers` order: an unprotected offer sits below
  every protected offer even when its amount is higher. The higher number further down is how
  people find it.
- An unprotected row shows the word **"Estimate"** (new key `swap.text.estimate`) in the slot that
  holds the Best Rate badge on other rows (`SwapProviderListItem.svelte:80-88`), before the fiat
  value, in the same grey as the fiat value. No badge, colour, icon or "≈". It shows on phones too,
  where the Best Rate badge shrinks to a star.
- The selected-offer card at the top of the list is unchanged; each provider's details component
  (for Rift, `SwapDetailsRift.svelte`) already describes its terms.

### Review

When the selected offer is unprotected:

- The "Max slippage" row is hidden.
- The high-slippage `MessageBox` is hidden, since slippage doesn't apply.
- One warning `MessageBox` (new `SwapUnprotectedOfferWarning.svelte`, pattern:
  `SwapLifiBtcRelayWarning.svelte`), with new key `swap.text.unprotected_offer_warning`:
  "$provider guarantees no minimum. It swaps at the best price it finds once your deposit arrives,
  so you may receive more or less than shown. Your max slippage setting doesn't apply to this
  offer."
- No confirmation checkbox: picking the offer by hand is the consent. The existing value-difference
  checkbox still applies as it does today.

When the Rift branches merge onto this, `SwapRiftEstimateWarning.svelte` and
`swap.text.rift_estimate_warning` are deleted in favour of the generic warning.

### Unchanged

- The header slippage pill (`SwapSlippage.svelte`) stays for every provider; it still sets the
  minimum of the protected offers.
- Provider details sheets, quote fetching, execution and errors.

## Non-goals

- Hiding the slippage pill or the "Max slippage" row for exact offers (OISY Trade, Chain Fusion,
  1Sec). Separate fix.
- Any marker for protected offers ("Guaranteed", a shield, a minimum on every row).
- A form hint that a higher estimate or a safer offer exists.
- New analytics events.
- Rift itself: its integration, flag and production flip stay in the Rift spec.

## Acceptance

- [ ] `SWAP_PROVIDER_GUARANTEES_MINIMUM` covers every `SwapProvider`; all are protected on `main`.
- [ ] Both sort sites use `sortSwapOffers`; unit tests cover protected-only, unprotected higher,
      unprotected lower, unprotected-only, and ties.
- [ ] Best Rate comes from one helper and is never on an unprotected offer.
- [ ] `calculateSwapGainUsd` ignores unprotected offers; "Best of $count offers" counts protected
      offers only.
- [ ] The card's status line reads "Estimate · no minimum" whenever the selected offer is
      unprotected, including a single offer; the announcement includes it.
- [ ] An unprotected list row shows grey "Estimate" in the Best Rate slot at 320, 375, 768 and
      1440 px without wrapping the fiat value.
- [ ] Review hides "Max slippage" and the high-slippage box, and shows the generic warning, only
      for an unprotected offer.
- [ ] With every provider protected, the form, list and Review render exactly as before (existing
      specs pass unchanged).
- [ ] `docs/ai/PRODUCT.md` swap section describes protected and unprotected offers, in the same PR.
- [ ] New keys exist in `en.json` only, with i18n types regenerated.

Specs force a provider unprotected by mocking the map, since `main` has no unprotected provider.

### States

| State                                       | Expected                                                                                                                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Comparing (quotes loading)                  | As today; ordering and marking apply once offers settle                                                                 |
| No offers / quote error                     | As today                                                                                                                |
| Protected offers only                       | As today, pixel for pixel                                                                                               |
| Protected + unprotected, unprotected lower  | Unprotected row last with "Estimate"; form unchanged                                                                    |
| Protected + unprotected, unprotected higher | Best protected offer picked and marked Best Rate; unprotected row last with "Estimate"; gain ignores it; form unchanged |
| Unprotected picked by hand                  | Status "Estimate · no minimum"; Review: no Max slippage row, no high-slippage box, warning                              |
| Amount edited after an unprotected pick     | Manual pick resets; best protected offer picked again                                                                   |
| Only one offer, unprotected                 | Picked automatically; card shows the status line; no Best Rate; Review warning                                          |
| Several offers, all unprotected             | Highest estimate picked; no Best Rate anywhere; status line and Review warning                                          |
| Long provider name                          | Name truncates as today; "Estimate" and the fiat value stay whole                                                       |
| Light and dark theme                        | "Estimate" and the status use existing grey tokens in both                                                              |
| Back to the form from the list or Review    | Selection and marking unchanged                                                                                         |

### Evidence to attach before "done"

Screenshots of the list, the Smart Swap card and Review with a mocked unprotected offer, at 375 and
1440 px, light and dark (see `docs/ai/visual-artifacts.md` and the mock UI mode), attached to the
PR body. Before/after of the protected-only list to show it is unchanged.

## Decisions

All made 2026-11-27 by Artem.

- **Terms**: protected vs unprotected offer; exact offers count as protected. "Fixed slippage" is
  retired because it conflated an enforced minimum with no slippage at all.
- **Protection is per provider**, in one map, not inferred from `receiveOutMinimum`.
- **Default is the best protected offer**; an unprotected offer is opt-in. An estimate and a
  guaranteed floor aren't comparable on one number. Considered and rejected: best rate with a
  "safer options available" notice, and a margin threshold.
- **Form is silent** while a protected offer is selected; only the status line changes for an
  unprotected one.
- **List**: unprotected offers last, one unlabeled list, grey "Estimate" in the Best Rate slot.
- **Review**: hide the Max slippage row rather than replace it; one generic warning; no checkbox.
- **Only unprotected offers**: picked automatically, no Best Rate.
- **Gain** compares protected offers only.
- **Ships provider-agnostic on `main`** before Rift.
- Made while writing the spec, from the answers above: the status line overrides compact mode for
  a single unprotected offer; "Best of $count offers" counts protected offers; the high-slippage
  box is hidden with the row; the announcement includes the status.

## Open questions (facts to confirm)

None.

## Pending decisions

None.
