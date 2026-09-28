> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: price TCYCLES at its XDR peg

- **Type:** `impr`
- **Area:** Frontend (price providers, price worker); backend (exchange-rate providers) in a later follow-up
- **Status:** Ready for the frontend PR. Two facts to confirm while building it (§8); all decisions resolved (§10).

---

## 1. Motivation

1 TCYCLES (10¹² cycles, ledger `um5iw-rqaaa-aaaaq-qaaba-cai`) is worth exactly 1 XDR, the IMF's Special Drawing Right: that is the rate at which the NNS Cycles Minting Canister (CMC) turns ICP into cycles. CoinGecko does not list TCYCLES, so OISY prices it from the ICPSwap fallback, which reads a pool that barely trades. Measured on 2026-09-28 between 10:20 and 10:40 UTC:

| Source                                                    | 1 TCYCLES in USD                                                |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| ICPSwap, the price OISY shows                             | 1.2599 (last 24h: 3 trades, $7 volume, low 0.0871, high 2.2306) |
| CoinGecko XDR: BTC in USD ÷ BTC in XDR = 82,746 / 60,646  | 1.3644                                                          |
| CMC rate (1 ICP = 2.1792 XDR) × ICP at $2.9714 (Coinbase) | 1.3635                                                          |
| open.er-api.com XDR                                       | 1.3607                                                          |

The three XDR sources agree within 0.3%. The pool price is 7.7% below them, and within the same 24 hours it ranged from 94% below them to 64% above.

A price read from that pool is not just noisy, it hides losses:

- The swap review values both sides of a quote at the feed's prices, warns from a −1% difference and asks for a confirmation from −5%. When the feed price comes from the pool being traded, a sale at the day's low, at 6.4% of the token's value, shows a value difference close to 0%.
- Balances, the portfolio total and the USD figures of the Mint flow (#14134, draft) move with a pool that trades $7 a day.

CoinGecko, the provider OISY already uses, quotes XDR as a fiat currency ("IMF Special Drawing Rights"), like the currencies of the display-currency switcher. Pricing TCYCLES from it makes its USD value the official one without adding a provider.

## 2. What exists already

- **Price sourcing** is described in `docs/ai/PRODUCT.md` → _Exchange-rate sourcing_. Staging, beta and production all take the frontend provider path: `exchangeRateICRCToUsd` (`src/frontend/src/lib/services/exchange.services.ts`) asks CoinGecko's `simple/token_price` for every ICRC ledger, then fills the gaps through `icrcFallbackProviders`: ICPSwap, then KongSwap. Local and staging builds may instead run in backend mode, but only while the backend's runtime `exchange_rate_enabled` flag is on, and staging's is off (`false` on 2026-09-28), so no deployed environment uses backend prices today. In backend mode, the backend's `get_exchange_rates` prices through CoinGecko and then the `IcpSwapProvider` supplemental (`supplemental_price_providers` in `src/backend/src/exchange/mod.rs`), and the frontend fills whatever is still missing through the same ICPSwap/Kong cascade. The backend wins every collision.
- **How TCYCLES ends up on ICPSwap:** CoinGecko's `token_price` answers `{}` for `um5iw…`, and the pool passes both layers' $500 liquidity filter (`ICPSWAP_MIN_TVL_USD` in `src/frontend/src/lib/utils/exchange.utils.ts`, `MIN_TVL_USD` in `src/backend/src/exchange/providers/icpswap/mod.rs`) with $2,360.
- **The BTC cross already exists.** `exchangeRateUsdToCurrency` derives the display-currency rate from one `simple/price?ids=bitcoin&vs_currencies=usd,<currency>&include_24hr_change=true` request, as BTC in USD ÷ BTC in the currency, and its 24h multiplier as `(1 + a) / (1 + b)` from the two 24h changes. The provider path also requests BTC in USD on every refresh (`exchangeRateBTCToUsd`).
- **CoinGecko's XDR** is a supported `vs_currencies` value; the `exchange_rates` endpoint lists it as "IMF Special Drawing Rights", type `fiat`. It moves rarely: on Monday 2026-09-28 at 10:30 UTC, BTC's `usd_24h_change` and `xdr_24h_change` were identical, so CoinGecko's XDR/USD had not changed in 24 hours (§8, Q2).
- **The swap guard:** `calculateValueDifference` (`src/frontend/src/lib/utils/swap.utils.ts`) with `SWAP_VALUE_DIFFERENCE_WARNING_VALUE = -1` and `SWAP_VALUE_DIFFERENCE_ERROR_VALUE = -5` (`src/frontend/src/lib/constants/swap.constants.ts`). A token without a price makes the review ask for its own confirmation (`value_difference_missing_price_confirmation`).
- **The token:** TCYCLES in `src/frontend/src/env/tokens/tokens.icrc.json`.

## 3. Behaviour

1. **TCYCLES is priced at 1 XDR.** Its USD price is CoinGecko's XDR rate, BTC in USD ÷ BTC in XDR, taken from one response. TCYCLES is recognised by its ledger canister ID `um5iw-rqaaa-aaaaq-qaaba-cai`, never by its symbol.
2. **Its 24h change is XDR's own** against USD, derived from BTC's two 24h changes the way the display-currency multiplier is: usually a fraction of a percent, and zero while CoinGecko's XDR rate has not moved.
3. **TCYCLES is never priced from a market.** Neither ICPSwap nor KongSwap is asked for TCYCLES, in any mode, fill or fallback. A CoinGecko listing, should one appear, does not override the peg either: it would track the same pools.
4. **No XDR rate, no TCYCLES price.** If a refresh has no usable XDR rate (the request failed, or the value is missing, non-finite or not positive), TCYCLES has no price for that refresh: it shows "$ value is not available", and the swap review asks for the missing-price confirmation. No other token is affected (§10, D2).
5. **The backend follows later.** This change prices TCYCLES on the frontend: on the provider path, which staging, beta and production use, and by keeping it out of the ICPSwap/Kong cascade in backend mode's frontend fill. The backend itself keeps pricing TCYCLES through ICPSwap until the backend follow-up (§7), so a build running in backend mode, which no deployed environment does today (§2), keeps the ICPSwap price until then: the backend's price wins every collision (§10, D3).
6. **No new frontend request.** On the provider path, the XDR rate comes from the BTC request that every refresh already sends, with `xdr` added to its currencies. The backend follow-up sends at most one extra CoinGecko request per refresh, and only when TCYCLES is among the tokens it prices.
7. **Everything else follows the price:** the balance, the portfolio total, the display-currency conversion, the swap value difference, the Mint flow's USD figures and the USD values in analytics. None of them changes.

What users will notice, by design:

- A TCYCLES balance is worth what 1 XDR is worth: 8.3% more than the pool price on 2026-09-28.
- Selling TCYCLES on ICPSwap below 1 XDR shows as a loss: −7.7% at that pool price, so the review asks for the confirmation. Buying above 1 XDR shows as a loss too, while Mint, once it ships, mints at the peg.

## 4. Sources considered

| Source                                                             | Decision                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CoinGecko XDR (BTC cross)                                          | **Chosen.** Existing provider, existing pattern, no new frontend request.                                                                                                                                         |
| CMC `get_icp_xdr_conversion_rate` × the ICP price                  | Rejected: it divides two ICP prices taken from different sources at different times (CoinGecko's now, the exchange rate canister's median as of the CMC's last 5-minute refresh). Already declined on 2026-09-24. |
| Exchange rate canister (`uf6dk-hyaaa-aaaaq-qaaaq-cai`), `CXDR`/USD | Rejected: callable only from a canister, as an update call with cycles attached, so it cannot serve the frontend provider path that staging, beta and production use.                                             |
| An FX API with XDR (e.g. open.er-api.com), or the IMF              | Rejected: a new third-party dependency for a rate the existing provider already quotes.                                                                                                                           |
| A CoinGecko listing of TCYCLES                                     | Does not exist, and would track DEX trading rather than the peg (§3.3).                                                                                                                                           |

## 5. Acceptance criteria

**Frontend PR**

- **AC1** On the frontend provider path (staging, beta and production), TCYCLES's USD price equals `bitcoin.usd / bitcoin.xdr` of the refresh's BTC response, and its 24h change equals `((1 + usd_24h_change / 100) / (1 + xdr_24h_change / 100) - 1) * 100` of that response.
- **AC2** The frontend never asks ICPSwap or KongSwap for TCYCLES: not on the provider path, not in the backend-mode fill, and not when the XDR rate is missing.
- **AC3** A CoinGecko `token_price` result for `um5iw…`, if one ever appears, does not replace the XDR price.
- **AC4** A refresh without a usable XDR rate leaves TCYCLES unpriced ("$ value is not available") and every other price unchanged.
- **AC5** The provider path sends the same requests as before; only the BTC request's `vs_currencies` changes.
- **AC6** Every other token keeps its sources, their order and their filters.
- **AC7** Unit tests cover the price and 24h change derivation, each invalid-XDR case, the absence of any ICPSwap or Kong request for TCYCLES on either frontend path, and the XDR price's precedence over a CoinGecko listing.
- **AC8** `docs/ai/PRODUCT.md` → _Exchange-rate sourcing_ states the TCYCLES rule, including that the frontend never prices TCYCLES from a market, and that backend mode still shows the backend's price for it until the backend follow-up.

**Backend follow-up**

- **AC9** In backend mode, the backend returns TCYCLES with the price and 24h change of AC1 from its own CoinGecko response, never asks ICPSwap for it, leaves it unpriced without a usable XDR rate, and does not let a CoinGecko listing replace the XDR price. `docs/ai/PRODUCT.md` drops the backend-mode exception.

## 6. Non-goals

- Pricing any other token from a peg: XTC (the DIP20 cycles token), ck-tokens, stablecoins.
- XDR as a display currency.
- A market cap for TCYCLES (it has none today either).
- Any change to the ICPSwap/Kong fallback or its liquidity filter for other tokens.

## 7. Implementation plan (atomic PRs)

1. `feat(frontend): price TCYCLES at its XDR peg`: `xdr` added to the provider path's BTC request, TCYCLES priced from it and kept out of the ICPSwap/Kong cascade, on the provider path and in the backend-mode fill; tests; PRODUCT.md (AC1 to AC8). This is the PR that changes staging, beta and production.
2. Later, as its own follow-up: `feat(backend): price TCYCLES at its XDR peg`: TCYCLES taken out of the CoinGecko token request and the ICPSwap supplemental, and priced from one `simple/price?ids=bitcoin&vs_currencies=usd,xdr` request, sent only when TCYCLES is requested; Rust unit tests; PRODUCT.md (AC9).

PR 1 ships alone (§10, D3) and changes every deployed environment, since none of them uses backend prices (§2). Until the backend follow-up lands, a build running in backend mode keeps showing the ICPSwap price for TCYCLES, since the backend wins every collision.

## 8. Open questions (facts to confirm)

- **Q1** Does CoinGecko's Pro API (`pro-api.coingecko.com`, used by the frontend's provider path and by the backend) return `xdr` from `simple/price` like the public API does? Verified on the public API only.
- **Q2** How often does CoinGecko update its XDR rate on business days? It had not moved in the 24 hours to Monday 10:30 UTC (§2). XDR/USD rarely moves more than a fraction of a percent a day, so this bounds the error rather than blocking the approach.

## 9. Pending decisions (facts are clear)

None.

## 10. Resolved

- **D1 Source:** CoinGecko's XDR rate (2026-09-28). 1 XDR is the official value of 1 TCYCLES; the alternatives are in §4.
- **D2 No usable XDR rate (§3.4), was P1:** TCYCLES has no price for that refresh, with no fallback to ICPSwap or any other source (2026-09-28). A missing price is honest and makes the swap review ask for confirmation, while the pool price is what this spec removes: in one day it ranged from 94% below the peg to 64% above it.
- **D3 Backend (§3.5, §7), was P2:** later. The frontend PR ships alone, and the backend follows as its own PR (2026-09-28). No deployed environment uses backend prices (staging's `exchange_rate_enabled` is off, and beta and production never read it), so the frontend PR alone changes all of them.
