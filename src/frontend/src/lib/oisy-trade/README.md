# OISY Trade — offer calculation

Given an order-book snapshot, this module answers one question: **what is the
largest fill-or-kill order this book is certain to fill, and what is it certain to
produce?** That answer is what the Swap flow shows as an OISY Trade offer.

## This code does not belong here

It belongs in the `oisy_trade` canister, next to the book it reads and the matching
engine it predicts. It cannot go there yet: `oisy_trade` lives in the separate
[`dfinity/oisy-trade`](https://github.com/dfinity/oisy-trade) repository and reaches
this one as a pinned release (`OISY_TRADE_RELEASE` in
`scripts/build.oisy_trade.sh`), so adding an endpoint is a cross-repo change plus a
release bump.

So it is hosted here, deliberately at arm's length from the wallet, in the same
spirit as `$lib/ic-pub-key/`.

**Delete this folder** once `oisy_trade` exposes a quote endpoint. The call site
(`$lib/utils/oisy-trade-swap.utils.ts`) then moves to `$lib/api/oisy-trade.api.ts`
and the shapes in `types.ts` already describe what that endpoint returns.

## The boundary

This module may import **only**:

- `$declarations/oisy_trade/*` — the venue's own generated types;
- `@dfinity/*`;
- `ZERO` from `$lib/constants/app.constants` (the `0n` literal is banned repo-wide);
- its own files.

Nothing else — no swaps, tokens, stores, i18n or wallet code, and equally no other
canister's declarations, no Svelte and no third-party package. The
`no-restricted-imports` override in `eslint.config.mjs` states that set as an
allow-list: it denies every specifier and re-admits those four, so anything new
fails the build instead of eroding the boundary quietly.

Consequences worth knowing before editing:

- **It speaks candid, not OISY.** The side is the venue's `Side` variant, amounts are
  smallest units, and rejections are venue-shaped (`below_lot`, `no_liquidity`, …)
  rather than the Swap form's `FieldErrorKind`. The swap adapter translates.
- **It takes the depth snapshot as an argument.** No canister call, no fetching, no
  clock — which is what keeps it a pure function, and what a canister implementation
  would do differently (it would read the book directly).
- **It stops before fees.** `takerFeeBps` is on the pair, but the destination
  ledger fee is a wallet fact the venue has no business knowing, so this returns
  `gross` and the caller subtracts both.

## Units

Straight from the did, and never converted to floats:

| Value      | Unit                                                 |
| ---------- | ---------------------------------------------------- |
| `price`    | quote smallest units per **one whole** base token    |
| `quantity` | base smallest units, a multiple of `lot_size`        |
| `notional` | `price × quantity / 10^baseDecimals`, in quote units |

## Tests and fixtures

The worked examples live in `src/frontend/src/tests/fixtures/oisy-trade/` as
language-neutral JSON: one order book, with cases covering both sides plus the
boundaries where no order is offerable. They are written that way on purpose:
when this calculation is implemented in Rust upstream, the file is a ready set of
test vectors, and it is the only artifact here worth keeping after the folder is
deleted.
