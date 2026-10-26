# Spec: Point to two separate swaps when LI.FI's route can't be verified

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

When the swap form has no offer for a pair, but LI.FI has a route that moves the funds through
exactly one other token, OISY tells the user that they can make the same swap themselves as two
separate swaps, each one fully verified, and offers to set up the first one.

Example: USDC on Base → NVDA on Robinhood Chain gets no offer. LI.FI's route bridges USDC to USDG
on Robinhood Chain and swaps USDG to NVDA from there. OISY verifies and offers each half on its
own: USDC (Base) → USDG (Robinhood Chain), then USDG → NVDA. Users already do exactly this by
hand; today nothing in the form tells them it is possible.

Source: Stefan, 2026-10-26.

## Background

### Why OISY offers no direct swap for these pairs

OISY signs a LI.FI transaction only after decoding it and checking that it pays the user, in the
token asked for, at least the minimum they reviewed (`docs/ai/PRODUCT.md`, "LI.FI"; the v1 spec
`2026-10-07-feat-lifi-swap-provider.md`, "Calldata binding"). The v1 spec allows single-step
routes only. Two route shapes fail those checks, both seen in live quotes on 2026-10-26:

- **A swap after the bridge.** USDC (Base) → NVDA, TSLA or WETH on Robinhood Chain, and USDC
  (Arbitrum) → AAPL: Across pays USDG to a fresh, single-use address that LI.FI generates for
  each quote (a "Smart Deposit Address"), and LI.FI's server swaps USDG to the destination token
  from there. The signed transaction has no destination call and names that address as the
  receiver: nothing in it says where the NVDA goes or how much arrives. LI.FI Intents routes for
  the same pair end the same way. OISY cannot verify this, so it offers nothing.
- **A DEX swap before Across.** DAI (Base) → USDG (Robinhood Chain): LI.FI swaps DAI to USDC on
  Base, then bridges with Across. Across's minimum output cannot be bound behind a DEX swap (v1
  spec, "No DEX swap before Across"), so OISY refuses the route; asked again without Across,
  LI.FI has no route.

### The swaps the user can make instead

Each half of these routes is a swap OISY verifies today: a bridge that delivers its token with
nothing after it and nothing but LI.FI's fee before it, or a swap on one network, whose contract
pays the user at least the reviewed minimum.

Two separate swaps are not atomic. Between them, the user holds the in-between token, and each
swap has its own price, fees and slippage. That is why OISY does not chain them itself (see
[Decisions](#decisions)): the user makes and reviews each swap.

## Behaviour

### When the hint shows

All of the following hold:

1. The source and destination are tokens on two different EVM networks, and LI.FI is enabled
   (today: local and staging).
2. No provider has an offer for the pair and amount, and none named a minimum amount. A minimum
   keeps its own message: a larger amount gets a direct offer.
3. LI.FI has a route for the pair that OISY could not verify, and the route moves the funds
   through **exactly one** token besides the source and the destination: the _in-between token_.
   LI.FI's fee step does not count; every other token the route passes through does, wrapped
   coins included.
4. OISY lists the in-between token, enabled or not. It is matched by network and contract
   address, never by symbol: Robinhood Chain has two tokens named USDG, and OISY lists one.
5. The in-between token is not a wrapped native coin (e.g. WETH) on the destination side of the
   bridge. Across pays those out unwrapped, so OISY could not offer the first swap as suggested.

### Where the route comes from

- **LI.FI's answer to OISY's usual request**, when OISY refused the route it contained. This
  needs no extra request.
- **One more request**, only when that answer had no route at all: the same request with steps
  after the bridge allowed, everything else unchanged (same bridges, amount, slippage and
  addresses). LI.FI's answers vary between identical requests: on 2026-10-26 the same USDC
  (Base) → NVDA request came back once with no route ("None of the available routes could
  successfully generate a tx") and minutes later with the Across + Smart Deposit route.
- A quote that fails OISY's trust checks (a contract, chain, token or amount other than the one
  asked for) never feeds the hint.
- The route is read only for its in-between token. It is never shown, never signed, and never
  used for an amount.
- The answer is cached together with LI.FI's offer for the same inputs and the same refresh
  interval. The hint adds at most one request per interval for unchanged inputs, and only when
  LI.FI's first answer had no route.

### What the user sees

- Under the destination amount, the existing "This swap is currently not offered." stays: it is
  true for the direct swap.
- Below the token inputs, in place of the cross-network note ("You move tokens from Base to
  Robinhood Chain network"), an info box:

  > OISY only offers swaps it can fully verify before you sign. There's no such direct route from
  > USDC to NVDA, but you can do it yourself in two separate swaps: first USDC → USDG, then USDG →
  > NVDA.

- A button in the box: **Swap to USDG first**. It sets the in-between token as the destination
  and keeps the source and the amount; the form then quotes that swap as usual.
- No expected amount of the destination token. LI.FI's estimate for its route is not what two
  separate swaps give: they pay two network fees and two provider fees, and the price can move
  in between.
- The in-between token need not be enabled. The button sets it directly, without the token picker
  (which shows a token that is not enabled only when a provider lists it, and LI.FI lists none).
  LI.FI and Velora swaps enable their destination token once sent, so USDG is in the wallet for
  the second swap.

### Tracking

- One new Plausible event, sent when the box appears and when its button is pressed, the two
  told apart by its metadata. It is a structured event family (`docs/ai/frontend/analytics.md`,
  pattern B).
- It names LI.FI as the provider, the source token, the destination token and the in-between
  token. It carries no amounts.
- "Appears" is counted once per pair, in-between token and amount while the swap modal is open: not
  on every quote refresh, not when a refresh hides the box and the next brings it back, and not
  when the form is rebuilt on the way back from the token picker.
- LI.FI's existing `swap_offer` event stays as it is. It fires for every LI.FI answer, also when
  another provider's offer keeps the box hidden, so it cannot tell how often the box shows.

### Negative guarantees (what it does _not_ do)

- OISY never runs two swaps in a row and never holds funds between them. Each swap is a separate,
  fully verified swap that the user reviews and signs.
- Nothing from the unverified route is signed, and none of its amounts is shown.
- OISY does not remember the first swap or prompt the second one: the user starts it like any
  swap.
- No hint when any provider offers the pair, for routes through two or more in-between tokens,
  for in-between tokens OISY does not list, or for pairs with a Solana side.

## Implementation

1. **LI.FI quoting** — `src/frontend/src/lib/services/lifi-swap.services.ts`:
   `fetchExecutableLifiQuote` keeps the trusted quote it could not execute; `fetchLifiSwapQuote`
   makes the second request when LI.FI answered with no route (HTTP 404 or 422). The hint shares
   the existing single cache entry with the offer.
2. **Reading the route** — `src/frontend/src/lib/utils/lifi-swap.utils.ts`: a pure function that
   returns the in-between token (network and address) from a quote's `includedSteps` when there
   is exactly one; the second request is `buildLifiQuoteRequest`'s request with
   `allowDestinationCall: true`.
3. **Reaching the form** — the same path as the NEAR Intents minimum: a typed reason rejected by
   the provider (like `SwapAmountTooLowError` in `src/frontend/src/lib/rest/near-intents.rest.ts`),
   surfaced by `reduceSettledSwapResults` in `src/frontend/src/lib/services/swap.services.ts` only
   when no provider has an offer, with the minimum taking precedence, and stored by
   `src/frontend/src/lib/components/swap/SwapAmountsContext.svelte` as
   `swapAmountsStore.quoteError`. `SwapQuoteError` in `src/frontend/src/lib/types/swap.ts` gains
   the new type.
4. **Matching the token** — against `tokens` in `src/frontend/src/lib/derived/tokens.derived.ts`
   (enabled or not), by network and address; the wrapped native coins are those in
   `LIFI_ACROSS_WRAPPED_NATIVE` (`src/frontend/src/eth/constants/lifi.constants.ts`).
5. **UI** — a new `src/frontend/src/lib/components/swap/SwapTwoSwapsHint.svelte` on `MessageBox`
   (level `info`), rendered by `src/frontend/src/lib/components/swap/SwapForm.svelte` in place of
   `SwapCrossChainInfo` while it shows. The button calls the swap context's
   `setDestinationToken`.
6. **Tracking** — a new member of `PLAUSIBLE_EVENTS` in `src/frontend/src/lib/enums/plausible.ts`
   (plus any metadata enum members it needs) and one tracking function in a domain analytics
   service, called by the box when it appears and when its button is pressed, following
   `docs/ai/frontend/analytics.md` (§5 pattern B, §6 privacy, §8 checklist).
7. **i18n** — new keys under `swap.text` in `en.json`; the other locales follow in their own PR.
8. **Tests** — the route reading (one, none and two in-between tokens; fee and wrapping steps; a
   wrapped native coin), the quoting (a refused route gives the hint without another request; no
   route triggers exactly one more; both are cached; a quote failing the trust checks gives none),
   the component (copy, the button sets the destination, hidden when an offer exists or a minimum
   is named) and the tracking (sent on appearing and on the button, not again on a quote refresh).
9. **`PRODUCT.md`** — the LI.FI section describes the hint and its limits.

## Acceptance criteria

1. USDC (Base) → NVDA (Robinhood Chain), when LI.FI's route is Across to USDG followed by a Smart
   Deposit swap: the form shows "This swap is currently not offered." and the box naming USDG.
   **Swap to USDG first** sets USDG (`0x5fc5…d168`) as the destination, keeps the source and
   amount, and the form quotes that swap.
2. DAI (Base) → USDG (Robinhood Chain), when no provider offers it and LI.FI's route swaps DAI to
   USDC before Across: the box names USDC on Base.
3. ETH (Base) → NVDA, when LI.FI's route wraps ETH on Base and bridges WETH: two in-between
   tokens, no box.
4. A pair any provider offers: no box.
5. A provider naming a minimum amount: the minimum message, no box.
6. An in-between token OISY does not list (e.g. the second USDG on Robinhood Chain,
   `0x0A3B…954F`): no box.
7. An in-between token that is a wrapped native coin on the destination side: no box.
8. A LI.FI quote failing the trust checks: no box.
9. A first answer with no route leads to exactly one more LI.FI request; the same inputs within
   the refresh interval lead to none.
10. The box never shows an amount of the destination token.
11. The box appearing for a pair and amount, and each press of its button, sends the tracking
    event once; a quote refresh, the box hiding and coming back, or the form being rebuilt does
    not send it again.

## Decisions

Made with Stefan on 2026-10-26:

- **OISY does not run multi-step swaps yet.** Chaining two swaps is not atomic, can leave the
  in-between token behind, and its slippage adds up. The user makes both swaps.
- **Exactly one in-between token.** More would get complicated for the user, and most routes
  have one.
- **The in-between token comes from LI.FI's route**, not from a fixed list.
- **The copy leads with what OISY does** ("fully verify") and says the user can do it as two
  separate swaps. It does not talk about servers or providers being hacked.
- **No expected amount of the destination token.**
- **The box is tracked**, when it appears and when its button is pressed (see
  [Tracking](#tracking)).

## Out of scope

- Routes through two or more in-between tokens.
- Pairs with a Solana side.
- Naming the native coin when a route goes through a wrapped one (e.g. ETH (Base) → ETH (Robinhood
  Chain) → NVDA): no hint for now.
- Remembering or prompting the second swap.
- Hints from providers other than LI.FI.
- Quoting both suggested swaps before showing the hint. Both are kinds OISY verifies today;
  quoting them up front would add two requests.

## Open questions

1. How often does the second request find a route that the first answer did not have? Seen once,
   on 2026-10-26, for USDC (Base) → NVDA. If it rarely helps, it can go.

## Pending decisions

1. **Tracking.** Should the box be tracked? _Resolved (Stefan, 2026-10-26): yes, see
   [Tracking](#tracking)._ The box gets its own event instead of a new error type on LI.FI's
   `swap_offer` event, which fires for every LI.FI answer, also when the box stays hidden.
