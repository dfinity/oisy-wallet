> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Tell the user the NEAR Intents minimum swap amount before they hit it

- **Type:** `impr`
- **Area:** Frontend, swap (NEAR Intents provider, swap form)
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

A NEAR Intents swap below the provider's minimum produces no offer. Today the user learns
this only by entering an amount, waiting out a quote round, and reading the result — and
for the largest minimum of all, the one that actually prompted this spec, the message they
get is wrong.

`fix(frontend): surface the NEAR Intents minimum-amount refusal in the swap form` (#13820)
built the reactive half of this: `fetchNearIntentsQuote`
(`src/frontend/src/lib/rest/near-intents.rest.ts`) matches a 400 whose message reads
`Amount is too low for bridge, try at least 8300`, parses the minimum, and throws
`SwapAmountTooLowError` (`src/frontend/src/lib/types/errors.ts`);
`reduceSettledSwapResults` (`src/frontend/src/lib/services/swap.services.ts`) rethrows it
when no provider quoted; `SwapAmountsContext.svelte` puts it in the store as
`quoteError: { type: 'amount-too-low', minAmount }`; and `SwapForm.svelte` renders
`swap.text.swap_amount_too_low_minimum` in place of the generic
`swap.text.swap_is_not_offered`.

Two gaps remain.

**The 1Click API has a second, unrelated refusal message that the parser does not match.**
Swapping into or out of Polygon or BSC below **$1,000** fails with
`Temporary swap limits: minimum swap amount is $1,000`. The `/amount is too low/i` pattern
does not match it, so the refusal falls through to the generic "This swap is currently not
offered." — which is the symptom that was reported: a BTC→Polygon swap of a few hundred
dollars looks unsupported rather than under-sized. This is the bug half of this spec.

**Even when matched, the minimum arrives too late.** The user must commit to an amount and
wait for a failed round before the form tells them the floor. The minimum for a token pair
is knowable the moment the pair is chosen, which is the improvement half of this spec.

## 2. What the 1Click API does and does not expose

Verified against the live API on 2026-09-11. Recording it here because none of it is
documented and all of it shapes the design.

**There is no structured minimum anywhere.** Not in `GET /v0/tokens` (the per-token fields
are `assetId`, `decimals`, `blockchain`, `symbol`, `price`, `priceUpdatedAt`,
`contractAddress`, `coingeckoId` — no minimum), not in the 400 body (`{message,
correlationId, timestamp, path}`), and not in the OpenAPI contract at
`https://1click.chaindefuser.com/docs/v0/openapi.yaml` (v0.1.10), where
`BadRequestResponse` is `{ message: string }` and nothing more — no error code, no numeric
field. There is no limits-style endpoint; the full path set is `auth/authenticate`,
`auth/refresh`, `account/balances`, `account/history`, `tokens`, `quote`, `status`,
`any-input/withdrawals`, `deposit/submit`, `generate-intent`, `submit-intent`, `orders`.
The SDK is a generated client over that same spec, so it cannot expose what the API does
not send. **The message string is the only carrier, and parsing it is the only option.**

`NearIntentsQuote.minAmountIn` (`src/frontend/src/lib/types/near-intents.ts`) is _not_ this
minimum and must not be used for it: per the spec it is the slippage-buffer deposit floor
(`amountIn` less slippage), and it is only present when a quote already succeeded.

**There are exactly two refusal shapes, with different units and different scope:**

|                    | `Amount is too low for bridge, try at least N` | `Temporary swap limits: minimum swap amount is $1,000` |
| ------------------ | ---------------------------------------------- | ------------------------------------------------------ |
| Unit of the number | base units of the **origin asset**             | **USD**                                                |
| Scope              | per route                                      | per chain, either side of the route                    |
| Applies to         | every route                                    | only `pol` and `bsc`                                   |
| Checked            | **after** address validation                   | **before** address validation                          |
| Magnitude          | roughly the destination's withdrawal cost      | flat $1,000                                            |

Measured examples of the per-route bridge minimum: BTC→ETH, →SOL, →Base, →Arbitrum and
→ETH-USDC all report `8300` sats (≈ $6.56); ETH→Base and ETH→Arbitrum report
`35000000000001` wei (≈ $0.09); ETH→BTC reports ≈ `2.54e15` wei (≈ $6.6); ETH→SOL ≈
`3.98e13` wei (≈ $0.10); SOL→ETH `993028`; ETH-USDC→BTC `6603820`. The number tracks the
cost of getting funds out on the destination side, expressed in the origin asset — hence
BTC destinations being expensive from anywhere and L2 destinations being cheap.

The `$1,000` limit is evaluated on the input's USD value at 1Click's own `price`: BTC→POL
at 1,266,000 sats is refused, at 1,270,000 sats (`amountInUsd: 1000.4171`) it quotes. It
fires on **either** side — `pol`→ETH and `bsc`→ETH are refused just as ETH→`pol` and
ETH→`bsc` are. A sweep of all 34 chains as destination found `pol` and `bsc` to be the only
restricted ones; of the six chains in `NEAR_INTENTS_BLOCKCHAIN_MAP`
(`src/frontend/src/lib/constants/swap.constants.ts`) those two are affected and Ethereum,
Arbitrum, Base and Solana are not. Notably this is not a property of the underlying bridge:
`avax`, `op`, `scroll`, `monad` and `xlayer` route over the same HOT Omni bridge as `pol`
and are unrestricted.

**A probe amount that is too small produces useless messages rather than the minimum.**
Below roughly three base units of the origin asset the API answers `Failed to get quote`,
`No liquidity available` or `Internal server error` instead of naming a minimum (BTC→ETH:
1 sat → `Failed to get quote`, 2 sats → `No liquidity available`, 3 sats → the minimum).
`Internal server error` is transient — the same request that produced it returned the
minimum on all 5 immediate retries. A probe must therefore be small enough to stay under
the minimum but not degenerate, and must treat an unrecognised message as "unknown" rather
than as "no minimum".

Because the bridge-minimum check runs **after** address validation, a probe that wants that
number has to send addresses the destination chain accepts; an invalid `recipient` or
`refundTo` masks it (`recipient is not valid` / `refundTo is not valid`). The `$1,000` check
runs first and surfaces regardless.

## 3. Design

### 3.1 A minimum is either token-denominated or USD-denominated

Replace the single `minAmount?: bigint` with a discriminated description, because the two
refusals genuinely differ in kind and rendering a USD limit as a token amount would be a
lie the price moves out from under:

```ts
export type SwapAmountMinimum =
	| { type: 'token'; value: bigint } // origin asset base units
	| { type: 'usd'; value: number }; // USD
```

`SwapAmountTooLowError` (`src/frontend/src/lib/types/errors.ts`) carries this instead of
`minAmount`, and so does `SwapQuoteError` (`src/frontend/src/lib/types/swap.ts`). The
existing `minAmount?: bigint` becomes the `'token'` case; no call site loses information.

### 3.2 Parse both shapes in one place

`near-intents.rest.ts` gains a second pattern beside the existing two. Both live in the rest
layer, next to the request that produces them, and both produce `SwapAmountTooLowError`:

- `/amount is too low/i` with `/try at least (\d+)/i` → `{ type: 'token', value }`
  (unchanged behaviour).
- A pattern for the temporary-limit shape, matching on `minimum swap amount` and extracting
  the dollar figure tolerant of thousands separators → `{ type: 'usd', value }`.

Match on `minimum swap amount` rather than on `Temporary swap limits`: the number and the
chain set are the volatile parts of that message and the word "Temporary" is a promise the
API may well keep, so anchor on the part that states the constraint. If a future message
states a minimum in a shape neither pattern matches, the generic `Error` path and today's
"not offered" message remain the fallback — no regression, just no improvement.

### 3.3 Only the fiat chain limit is announced upfront

The two minimums are announced differently, because they are different kinds of thing.

The **bridge minimum** is an inherent withdrawal-cost floor: ≈ $0.09 out of Ethereum toward
an L2, ≈ $6.60 toward Bitcoin. Almost nobody swaps below it, and since §3.2 it is reported
correctly the moment it does bind. Putting "minimum 0.000083 BTC" under every BTC pair
would be clutter in service of a constraint that rarely applies, so it stays reactive-only.

The **fiat chain limit** is a policy restriction: $1,000, on two chains, large enough to
change whether a user attempts the swap at all. That one is worth saying before the user
commits to a number, and it is the only thing this section adds.

### 3.4 Probing is per chain, and needs neither a pair nor an address

Restricting the upfront hint to the fiat limit makes the probe far cheaper than a general
minimum probe would be, because of two properties from §2: the fiat limit is a property of a
**chain** rather than of a route, and it is checked **before** address validation.

So `fetchNearIntentsChainRestriction` in
`src/frontend/src/lib/services/near-intents.services.ts` sends a `dry: true` quote with
`amount: "1"` and deliberately placeholder addresses, and reads which way it fails:

| Response                                                           | Conclusion                                                |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| `Temporary swap limits: minimum swap amount is $1,000`             | one side of the probed pair is restricted, at that figure |
| anything else (`recipient is not valid`, `Failed to get quote`, …) | neither side is restricted                                |

No price arithmetic, no `decimals`, no user addresses, and no dependence on the
$0.01-probe reasoning that the bridge minimum needed — `amount: "1"` is enough, because the
limit is evaluated before anything else can object. `dry: true` means no deposit address is
ever allocated, and in practice the request 400s regardless.

**What is cached, and why that shape.** A non-fiat answer proves **both** probed chains are
unrestricted, so it is recorded per chain. A fiat answer proves at least one side is
restricted but not which, so it is recorded against the **pair**. A pair whose two chains
are both already known-unrestricted needs no probe at all, which is what keeps this from
being a request per pair selection: after the first few pairs, most of the six chains in
`NEAR_INTENTS_BLOCKCHAIN_MAP` have a verdict and probing stops.

This also avoids a bootstrap trap. Deciding to "probe only chains already known to be
restricted" cannot work — on a fresh session nothing is known, so nothing would be probed
and the hint would never appear. Probing until a chain has _any_ verdict, rather than until
it has a restricted one, is what makes the cache converge instead of staying empty.

The probe must **not** run inside `loadSwapAmounts`, which repeats every
`SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS` (5 s) — that would turn a bounded handful of
requests into a steady stream against an endpoint we call unauthenticated and which
documents a 429 `rate-limit-exceeded`. It runs when the pair changes, and only when the
verdict is not already cached. A failed probe is not cached, so switching away and back
retries it.

**The placeholder-address trick is deliberate but fail-safe.** It relies on the observed
check ordering. If 1Click ever validates addresses first, every probe returns
`recipient is not valid` and the cache concludes "unrestricted" — the hint silently stops
appearing, and the reactive message from §3.2 still names the limit when the user hits it.
That is the right direction to fail in, and §6 pins the ordering with a test so the
assumption is visible rather than implicit.

### 3.5 Show it as guidance, then as the reason

The proactive minimum is **information, not an error**: it appears in tertiary text near the
source amount input, which is the field it constrains, and it does not block anything or
turn the form red. When the user then enters an amount below it, the existing red
destination-side message stays the mechanism that says "this is why you have no offer" —
that path keeps working from the real failed quote, so the two never disagree.

The probe fires **when the pair is selected**, so the hint is on screen before the user
touches the amount field.

**It cannot go in the provider sheet.** The two provider minimums OISY already shows —
Chain Fusion's `swap.text.chain_fusion_minimum_amount` and OISY Trade's
`swap.text.oisy_trade_minimum_notional` — are `ModalValue` rows inside their `SwapDetails*`
components, which `SwapProvider.svelte` renders only when `nonNullish(selectedProvider)`.
Below a minimum there is no quote, so no selected provider, so that entire block is absent:
the one place OISY already puts provider minimums is structurally unavailable exactly when
this hint is needed.

**It goes full width beside the other pair-level notices**, as a new
`SwapMinimumAmountInfo.svelte` rendering a `MessageBox` in a `mt-6` wrapper next to
`SwapCrossChainInfo` in `SwapForm.svelte` — the established pattern for telling the user
something about the pair they have chosen.

The obvious-looking alternative, joining the pay field's existing `text-tertiary`
`amountInfo` row, was built and rejected on inspection. That row is
`flex min-h-6 items-center justify-between` (`TokenInputContent.svelte`) with the balance
and Max button as its other child, so on a 375px viewport the left side has very little
width: `~CHF 12'345.67` beside `Min. CHF 1'000.00` wraps onto two lines and runs into the
balance. A full-width box has room for any currency and cannot collide with anything. Being
a box rather than micro-text also suits a $1,000 floor, which is worth noticing.

The copy is a sentence rather than a `Min. …` label, because it now sits in a banner.

**A USD minimum is shown in the user's display currency, never as a raw dollar figure.**
The API enforces the limit in USD, but OISY does not show the user USD unless that is what
they picked, so the figure goes through the same path as every other fiat amount in the app
— `formatCurrency` (`src/frontend/src/lib/utils/format.utils.ts`) with `$currentCurrency`
(`$lib/derived/currency.derived`), `$currencyExchangeStore`
(`$lib/stores/currency-exchange.store`) and `$currentLanguage` (`$lib/derived/i18n.derived`),
the pattern used in `LiquidiumPositionCard.svelte` and its siblings. The minimum is not
converted into source-token units: the constraint really is a fiat one, and a token figure
would drift with the price while reading as precise.

`formatCurrency` returns `undefined` while the exchange rate still belongs to the previous
currency (right after a switch) or is missing. Treat that exactly like an unknown minimum:
show no hint, and in the reactive path fall back to the minimum-less
`swap.text.swap_amount_too_low`, never a bare number with no currency on it.

One new `swap.text` key in `src/frontend/src/lib/i18n/en.json`: a short hint naming the
minimum, taking a single `$amount` placeholder that already carries the currency symbol from
`formatCurrency` — the key must not hardcode `$` or any currency. The reactive counterparts
(`swap_amount_too_low`, `swap_amount_too_low_minimum`,
`swap_amount_too_low_minimum_fiat`) already exist from §3.2. No token-denominated hint key is
needed, since only the fiat limit is announced upfront (§3.3).

Other locales are structurally synced by the existing i18n workflow, which does not
translate; translations follow the project's usual route and are not part of this change.

## 4. Non-goals

- **No hardcoded chain list and no hardcoded $1,000.** The API calls the limit "Temporary";
  a constant for it would go stale silently and invisibly. Everything comes from the live
  response.
- **No blocking.** The form does not disable Review or refuse input below the minimum. The
  quote round is still the authority on whether a swap is possible, and a minimum read from
  a probe a few seconds old must never be what prevents a swap the provider would accept.
- **No change to any other provider.** Velora, ICPSwap, KongSwap, Chain Fusion, 1Sec and
  OISY Trade keep their current behaviour, including Chain Fusion's own
  `swap.text.chain_fusion_minimum_amount` and OISY Trade's minimum notional, which are
  separate mechanisms with their own sources.
- **No binary search for an exact minimum.** One probe, one number, straight from the API.
- **No use of the quote's `minAmountIn`** for this purpose (see §2).
- **No conversion of the fiat minimum into source-token units** (see §3.5).
- **No upfront announcement of the bridge minimum** (see §3.3).
- **No new API key or authenticated access.** Probes go out unauthenticated like every other
  1Click call today.

## 5. Acceptance criteria

For the §3.2 half:

- A BTC→Polygon swap of a few hundred dollars no longer says "This swap is currently not
  offered."; it says the amount is below the provider's minimum and names the $1,000 limit
  in the user's display currency. The same holds for BSC, and for Polygon and BSC as the
  **source** side.
- Switching display currency re-renders the fiat minimum in the new currency; while the
  exchange rate is still catching up, no hint is shown and no uncurrencied number appears.
- The pre-existing `Amount is too low for bridge` behaviour is unchanged in message and in
  formatting.
- No provider other than NEAR Intents changes behaviour, and a successful quote from another
  provider still wins over a NEAR Intents refusal, as `reduceSettledSwapResults` already
  guarantees.

For the §3.3–§3.5 half:

- Selecting a Polygon or BSC pair shows the $1,000 limit under the pay amount, in non-error
  styling, in the user's display currency, before any amount is entered.
- Selecting a pair with no fiat limit shows no hint, including pairs that do have a bridge
  minimum — that one is never announced upfront.
- A pair whose probe fails, or whose verdict is not yet known, shows no hint and behaves
  exactly as today.
- Entering an amount below the limit still produces the red destination-side refusal from the
  real quote round; entering an amount above it quotes normally. The hint and the refusal
  never disagree, because both come from the same message shape.
- Selecting pairs among chains whose verdicts are already cached issues no probe at all, and
  the 5-second periodic quote refresh never issues one.

## 6. Tests

The `test-coverage` gate enforces whole-project thresholds, so this lands with its tests:

- `src/frontend/src/tests/lib/rest/near-intents.rest.spec.ts` — both refusal shapes, the
  separator and decimal variants, an unrecognised message falling through to plain `Error`,
  and a "minimum swap amount" message with no parseable figure. (Landed with §3.2.)
- `src/frontend/src/tests/lib/services/near-intents.services.spec.ts` — a fiat refusal
  yielding a restricted verdict for the pair, a non-fiat response yielding an unrestricted
  verdict for **both** chains, no probe when both chains are already known unrestricted,
  failures not cached, and the probe request itself carrying `dry: true` and `amount: "1"`.
  One test pins the check-ordering assumption from §3.4 by asserting that a placeholder
  address is enough to surface the limit, so the trick fails loudly in a spec rather than
  silently in the UI if 1Click reorders its validation.
- `src/frontend/src/tests/lib/components/swap/SwapMinimumAmountInfo.spec.ts` — the notice
  rendered for a restricted pair, converted into the selected currency, absent while the
  verdict is unknown, and absent (with no bare figure) when `formatCurrency` returns
  `undefined`.
- `src/frontend/src/tests/lib/components/swap/SwapAmountsContext.spec.ts` — the probe runs on
  pair selection, is not repeated when only the amount changes, re-runs when the pair
  changes, and leaves the store empty when it reaches no verdict or throws.

## 7. Implementation plan: atomic PRs

1. `fix(frontend): name the NEAR Intents temporary swap limit instead of "not offered"`
   §3.1 and §3.2. This alone fixes the reported Polygon symptom and is shippable on its own.
   Carries the `PRODUCT.md` description of the reactive behaviour, since it is the PR that
   changes it. **Shipped as #14037.**
2. `feat(frontend): show the NEAR Intents swap limit before an amount is entered` (needs 1)
   §3.3 to §3.5, extending the `PRODUCT.md` section that PR 1 created.

## 8. Open questions (facts to confirm)

- Is the $1,000 restriction on `pol`/`bsc` genuinely temporary, and is NEAR able to say what
  drives it and when it lifts? The design does not depend on the answer — nothing is
  hardcoded — but it tells us whether this is worth a follow-up at all or will vanish.
- Does 1Click rate-limit unauthenticated callers in a way the probe could trip? The spec
  documents a 429 `rate-limit-exceeded` and the practical budget is not published. The
  per-chain cache bounds this at roughly one probe per chain per session rather than one per
  pair selection, which makes it a much smaller question than it was for a general
  minimum probe; if the budget turns out to be tight anyway, deferring the probe to the first
  focus of the amount field is a change to when it is called and to nothing else.

## 9. Pending decisions

None outstanding. All four were decided on 2026-09-11:

- **The fiat minimum is shown in the user's display currency and is not converted into
  source-token units** (§3.5). The limit is genuinely a fiat constraint, so it is rendered
  through the app's normal `formatCurrency` path rather than as a hardcoded dollar figure,
  and a token-unit rendering would drift with the price while reading as exact.
- **The probe fires on pair selection**, not on first interaction with the amount field, so
  the minimum is visible before the user commits to a number.
- **Only the fiat chain limit is announced upfront** (§3.3); the bridge minimum stays
  reactive-only, because it is an inherent cost floor that rarely binds and announcing it on
  every pair would be clutter. A materiality threshold was considered and rejected: it would
  need an arbitrary cutoff to pick and defend, where the fiat/bridge split follows the
  constraints' own natures.
- **The hint is a full-width `MessageBox` beside the other pair-level notices** (§3.5). The
  provider sheet cannot host it, since it does not render without a selected provider, and
  the pay field's info row proved too narrow: a long currency string wraps into the balance
  on a 375px viewport.
