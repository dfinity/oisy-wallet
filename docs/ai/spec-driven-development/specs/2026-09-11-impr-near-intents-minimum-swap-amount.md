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

### 3.3 Probe the minimum when the pair is chosen

A new `fetchNearIntentsMinimumAmount` in
`src/frontend/src/lib/services/near-intents.services.ts` asks for a deliberately tiny
`dry: true` quote and reads the refusal:

- **Probe amount** = `max(3, floor(0.01 / price * 10 ** decimals))`, from the `price` and
  `decimals` of the origin asset in the already-cached `/tokens` response (`cachedTokens`).
  $0.01 sits below every minimum observed (the smallest was ≈ $0.09) and above the
  degenerate floor; the `3` guards a token whose $0.01 rounds to nothing.
- **Addresses** are the real ones the quote fan-out already passes (`userAddress`,
  `recipientAddress` in `NearIntentsQuoteParams`, `src/frontend/src/lib/types/swap.ts`), so
  the bridge-minimum check is reached. The swap form only offers destinations whose address
  the user holds, so they are always available.
- **`dry: true`**, so no deposit address is allocated. Everything else mirrors
  `buildNearIntentsQuoteRequest`.

Outcomes: a `SwapAmountTooLowError` yields the minimum; a **successful** quote means no
minimum above ~$0.01 and yields none; any other error yields none. "None" is indistinguishable
from "not yet known" to the UI, and in both cases the form behaves exactly as it does today.

**Caching and request budget.** One probe per `(originAsset, destinationAsset)` pair, cached
for the session in a module-level map alongside `cachedTokens`, keyed by asset id pair. The
probe must **not** run inside `loadSwapAmounts`, which repeats every
`SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS` (5 s) — that would turn one extra request into a
steady stream against an endpoint we call unauthenticated and which documents a 429
`rate-limit-exceeded`. It runs once when the pair changes. A failed probe is not cached, so
switching away and back retries it.

### 3.4 Show it as guidance, then as the reason

The proactive minimum is **information, not an error**: it appears in tertiary text near the
source amount input, which is the field it constrains, and it does not block anything or
turn the form red. When the user then enters an amount below it, the existing red
destination-side message stays the mechanism that says "this is why you have no offer" —
that path keeps working from the real failed quote, so the two never disagree.

New `swap.text` keys in `src/frontend/src/lib/i18n/en.json`, beside the existing
`swap_amount_too_low*` pair:

- a token-denominated hint, taking `$amount` and `$symbol`, formatted with `formatToken` and
  the source token's decimals exactly as `quoteErrorMinAmount` does in `SwapForm.svelte`;
- a USD-denominated hint, taking the formatted dollar figure;
- a USD-denominated refusal, the error-state counterpart of `swap_amount_too_low_minimum`
  for the reactive path.

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
- **No new API key or authenticated access.** Probes go out unauthenticated like every other
  1Click call today.

## 5. Acceptance criteria

- A BTC→Polygon swap of a few hundred dollars no longer says "This swap is currently not
  offered."; it says the amount is below the provider's minimum and names $1,000. The same
  holds for BSC, and for Polygon and BSC as the **source** side.
- Selecting a pair whose route has a minimum shows that minimum before any amount is
  entered, in non-error styling, in the source token's units for the per-route bridge
  minimum and in USD for the temporary chain limit.
- Selecting a pair with no minimum above ~$0.01, or one whose probe fails or returns an
  unrecognised message, shows no hint and behaves exactly as today.
- Entering an amount below the minimum still produces the red destination-side refusal from
  the real quote round; entering an amount above it quotes normally.
- The pre-existing `Amount is too low for bridge` behaviour is unchanged in message and in
  formatting.
- Switching pairs repeatedly issues at most one probe per pair; the 5-second periodic quote
  refresh issues none.
- No provider other than NEAR Intents changes behaviour, and a successful quote from another
  provider still wins over a NEAR Intents refusal, as `reduceSettledSwapResults` already
  guarantees.

## 6. Tests

The `test-coverage` gate enforces whole-project thresholds, so this lands with its tests:

- `src/frontend/src/tests/lib/rest/near-intents.rest.spec.ts` — both refusal shapes, the
  thousands separator, an unrecognised message falling through to plain `Error`, and a
  message that says "minimum swap amount" with no parseable figure.
- `src/frontend/src/tests/lib/services/near-intents.services.spec.ts` — probe amount
  derivation from `price`/`decimals` including the `3`-unit floor, the cache (one request per
  pair, no caching of failures), a successful probe yielding no minimum, and a non-amount
  error yielding no minimum.
- `src/frontend/src/tests/lib/components/swap/SwapForm.spec.ts` — hint rendering for both
  minimum kinds, absence when unknown, and the reactive red refusal for the USD shape.
- `docs/ai/PRODUCT.md` updated in this PR, per Step 4 — Build (Claude Code).

## 7. Implementation plan: atomic PRs

1. `fix(frontend): name the NEAR Intents temporary swap limit instead of "not offered"`
   §3.1 and §3.2 plus the USD refusal key and its rendering in the existing reactive path.
   This alone fixes the reported Polygon symptom and is shippable on its own.
2. `feat(frontend): show the NEAR Intents minimum before an amount is entered` (needs 1)
   §3.3 and the hint half of §3.4, plus the `PRODUCT.md` update.

## 8. Open questions (facts to confirm)

- Is the $1,000 restriction on `pol`/`bsc` genuinely temporary, and is NEAR able to say what
  drives it and when it lifts? The design does not depend on the answer — nothing is
  hardcoded — but it tells us whether this is worth a follow-up at all or will vanish.
- Does 1Click rate-limit unauthenticated callers in a way one probe per pair could trip? The
  spec documents a 429 `rate-limit-exceeded`; the practical budget for an unauthenticated
  integration is not documented. If it is tight, the probe should move behind the first
  focus of the amount field rather than pair selection.

## 9. Pending decisions (facts are clear, someone must decide)

- **Should the USD minimum also be shown converted into source-token units?** Facts: the
  limit is enforced in USD at 1Click's own price, and the input field is in token units, so
  the honest figure and the actionable one differ. Showing only USD is accurate but leaves
  the user converting; showing both is more useful and slightly less precise. Owner: product
  and design.
- **Should the hint appear on pair selection or on first interaction with the amount field?**
  Facts: eager is more helpful and costs one request per pair; lazy costs nothing for users
  who never reach that field. Interacts with the rate-limit open question above. Owner:
  product.
