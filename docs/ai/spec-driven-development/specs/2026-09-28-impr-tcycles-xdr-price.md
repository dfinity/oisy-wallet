> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: price TCYCLES at its XDR peg

- **Type:** `impr`
- **Area:** Frontend (price providers, price worker, analytics); backend (exchange-rate providers) in a later follow-up
- **Status:** Ready for implementation, in this spec's own PR (§7). All questions and decisions resolved (§10).

---

## 1. Motivation

1 TCYCLES (10¹² cycles, ledger `um5iw-rqaaa-aaaaq-qaaba-cai`) is worth exactly 1 XDR, the IMF's Special Drawing Right: that is the rate at which the NNS Cycles Minting Canister (CMC) turns ICP into cycles. CoinGecko does not list TCYCLES, so OISY prices it from the ICPSwap fallback, which reads a pool that barely trades. Measured on 2026-09-28 between 10:20 and 11:20 UTC:

| Source                                                            | 1 TCYCLES in USD                                                |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| ICPSwap, the price OISY shows                                     | 1.2599 (last 24h: 3 trades, $7 volume, low 0.0871, high 2.2306) |
| IMF, official rate for 2026-09-25 (the latest published)          | 1.3601                                                          |
| IMF basket valued with CoinGecko's live rates at 10:00 UTC (§3.1) | 1.3600                                                          |
| open.er-api.com XDR                                               | 1.3607                                                          |
| CMC rate (1 ICP = 2.1792 XDR) × ICP at $2.9714 (Coinbase)         | 1.3635 (the exchange rate canister's `CXDR`, §2)                |
| CoinGecko XDR: BTC in USD ÷ BTC in XDR = 82,746 / 60,646          | 1.3644 (unchanged since 2026-09-21, §2)                         |

The pool price is 7.4% below the IMF's, and within the same 24 hours it ranged from 94% below it to 64% above.

A price read from that pool is not just noisy, it hides losses:

- The swap review values both sides of a quote at the feed's prices, warns from a −1% difference and asks for a confirmation from −5%. When the feed price comes from the pool being traded, a sale at the day's low, at 6.4% of the token's value, shows a value difference close to 0%.
- Balances, the portfolio total and the USD figures of the Mint flow (#14134, draft) move with a pool that trades $7 a day.

The IMF defines the XDR as a fixed basket of five currencies, and CoinGecko, the provider OISY already uses, quotes all five live, as it does for the display-currency switcher. Pricing TCYCLES from that basket makes its USD value the official one without adding a provider.

## 2. What exists already

- **Price sourcing** is described in `docs/ai/PRODUCT.md` → _Exchange-rate sourcing_. Staging, beta and production all take the frontend provider path: `exchangeRateICRCToUsd` (`src/frontend/src/lib/services/exchange.services.ts`) asks CoinGecko's `simple/token_price` for every ICRC ledger, then fills the gaps through `icrcFallbackProviders`: ICPSwap, then KongSwap. The path refreshes every 5 minutes (`getSyncExchangeTimerInterval`). Local and staging builds may instead run in backend mode, but only while the backend's runtime `exchange_rate_enabled` flag is on, and staging's is off (`false` on 2026-09-28), so no deployed environment uses backend prices today. In backend mode, the backend's `get_exchange_rates` prices through CoinGecko and then the `IcpSwapProvider` supplemental (`supplemental_price_providers` in `src/backend/src/exchange/mod.rs`), and the frontend fills whatever is still missing through the same ICPSwap/Kong cascade. The backend wins every collision.
- **How TCYCLES ends up on ICPSwap:** CoinGecko's `token_price` answers `{}` for `um5iw…`, and the pool passes both layers' $500 liquidity filter (`ICPSWAP_MIN_TVL_USD` in `src/frontend/src/lib/utils/exchange.utils.ts`, `MIN_TVL_USD` in `src/backend/src/exchange/providers/icpswap/mod.rs`) with $2,360.
- **The BTC cross already exists.** `exchangeRateUsdToCurrency` derives the display-currency rate from one `simple/price?ids=bitcoin&vs_currencies=usd,<currency>&include_24hr_change=true` request, as BTC in USD ÷ BTC in the currency, and its 24h multiplier as `(1 + a) / (1 + b)` from the two 24h changes. EUR, CNY, JPY and GBP are all display currencies. The provider path also requests BTC in USD on every refresh (`exchangeRateBTCToUsd`).
- **The XDR is a basket.** Since 2022-08-01, 1 XDR is 0.57813 USD + 0.37379 EUR + 1.0993 CNY + 13.452 JPY + 0.080870 GBP. The IMF publishes its USD value every business day (`https://www.imf.org/external/np/fin/data/rms_five.aspx`; 2026-09-21 to 09-25: 1.365250, 1.364590, 1.361470, 1.358690, 1.360080). Valued with CoinGecko's own hourly rates at 11:00 UTC, the basket matched each of those days within 0.02% (1.36515, 1.36460, 1.36154, 1.35875, 1.36029).
- **The basket expires.** These amounts hold for the valuation period that ends on 2027-07-31. The next basket applies from 2027-08-01, and its amounts are fixed only on the last business day before (in 2022, on 29 July for 1 August). The IMF picks them so that both baskets are worth the same on that day; afterwards they drift apart slowly: the 2016 and 2022 baskets were 0.28% apart on 2026-09-28.
- **CoinGecko's own XDR is stale.** `vs_currencies=xdr` works on the public and the Pro API (§10, Q1), but in 10 days of hourly history to 2026-09-28 CoinGecko's XDR/USD changed once, on 2026-09-21 at 15:00 UTC, from 1.36928 to 1.36441, while its EUR/USD changed 145 times in the same 239 hours. On 2026-09-28 it was 0.32% above the IMF's latest rate.
- **The CMC mints at `CXDR`,** which the exchange rate canister computes from the 2016 amounts (`src/xrc/src/forex.rs` in `dfinity/exchange-rate-canister`): 0.28% above the IMF basket on 2026-09-28, hence the 1.3635 in §1.
- **The swap guard:** `calculateValueDifference` (`src/frontend/src/lib/utils/swap.utils.ts`) with `SWAP_VALUE_DIFFERENCE_WARNING_VALUE = -1` and `SWAP_VALUE_DIFFERENCE_ERROR_VALUE = -5` (`src/frontend/src/lib/constants/swap.constants.ts`). A token without a price makes the review ask for its own confirmation (`value_difference_missing_price_confirmation`).
- **Analytics:** `docs/ai/frontend/analytics.md` (event families, metadata keys, privacy invariants). The only severity key today is `result_error_severity`, which rates errors alone (`blocker`, `critical`, `major`, `minor`).
- **The token:** TCYCLES in `src/frontend/src/env/tokens/tokens.icrc.json`.

## 3. Behaviour

1. **TCYCLES is priced at 1 XDR, from the IMF basket.** Its USD price is 0.57813 + 0.37379 × (USD per EUR) + 1.0993 × (USD per CNY) + 13.452 × (USD per JPY) + 0.080870 × (USD per GBP), where USD per X is BTC in USD ÷ BTC in X, all from one CoinGecko response. TCYCLES is recognised by its ledger canister ID `um5iw-rqaaa-aaaaq-qaaba-cai`, never by its symbol.
2. **Its 24h change is the basket's own,** from the same response: the basket valued at the four rates of 24 hours earlier, each derived from BTC's 24h changes in USD and in that currency, against its value now.
3. **TCYCLES is never priced from a market.** Neither ICPSwap nor KongSwap is asked for TCYCLES, in any mode, fill or fallback. A CoinGecko listing, should one appear, does not override the peg either: it would track the same pools.
4. **No usable basket, no TCYCLES price.** If a refresh lacks any of the five BTC prices (the request failed, or a value is missing, non-finite or not positive), or the basket has expired (§3.5), that refresh brings no TCYCLES price and nothing else is asked for one. As for every token, the last price already on screen stays until a later refresh brings one or the page reloads; without one, TCYCLES shows "$ value is not available", and the swap review asks for the missing-price confirmation. No other token is affected (§10, D2).
5. **The basket expires after a grace period.** The 2022 amounts are valid through 2027-07-31. During the grace period, from 2027-08-01 to 2027-09-30 (UTC), TCYCLES is still priced with them: the new basket is worth the same on its first day and drifts away slowly, so two months cost about 0.01%, and the new amounts have time to ship. From 2027-10-01 00:00 UTC, no refresh prices TCYCLES until the amounts are updated (§10, D4).
6. **An analytics event counts down to the switch.** From 2027-07-25 00:00 UTC, one week before the switch, every refresh on the provider path that includes TCYCLES fires one Plausible event, with the phase in `event_key`, the whole days left in it, rounded up, in `event_value`, and the phase's level in `event_severity` (§3.7):

   | Phase           | When                     | `event_severity` | Meaning                                                                      | Days left until |
   | --------------- | ------------------------ | ---------------- | ---------------------------------------------------------------------------- | --------------- |
   | `expiring_soon` | 2027-07-25 to 2027-07-31 | `warn`           | The basket will expire soon; prices are still exact.                         | 2027-08-01      |
   | `grace`         | 2027-08-01 to 2027-09-30 | `warn`           | The IMF's new basket applies; OISY's price now drifts from the official XDR. | 2027-10-01      |
   | `expired`       | from 2027-10-01          | `error`          | TCYCLES has no price.                                                        | (always 0)      |

   The event carries no amount, no USD value and nothing about the user. At one refresh every 5 minutes, that is up to 12 events an hour per open wallet with TCYCLES enabled (§10, D5).

7. **`event_severity` is a new, general metadata key,** so that any event can be filtered by severity. Its scale, from low to high, is `info`, `warn`, `error`, `blocker`: OpenTelemetry's level names, with `blocker` as in `result_error_severity` (the user cannot continue at all) in place of `fatal`. `result_error_severity` stays as it is. Only the countdown event sets `event_severity` for now (§10, D6).
8. **The backend follows later.** This change prices TCYCLES on the frontend: on the provider path, which staging, beta and production use, and by keeping it out of the ICPSwap/Kong cascade in backend mode's frontend fill. The backend itself keeps pricing TCYCLES through ICPSwap until the backend follow-up (§7), so a build running in backend mode, which no deployed environment does today (§2), keeps the ICPSwap price until then: the backend's price wins every collision (§10, D3).
9. **No new frontend request.** The five BTC prices come from the BTC request that every refresh already sends, with `eur,cny,jpy,gbp` added to its currencies. The backend follow-up sends at most one extra CoinGecko request per refresh, and only when TCYCLES is among the tokens it prices.
10. **Everything else follows the price:** the balance, the portfolio total, the display-currency conversion, the swap value difference, the Mint flow's USD figures and the USD values in analytics. None of them changes.

What users will notice, by design:

- A TCYCLES balance is worth what 1 XDR is worth: 8.0% more than the pool price on 2026-09-28.
- Selling TCYCLES on ICPSwap below 1 XDR shows as a loss: −7.4% at that pool price, so the review asks for the confirmation. Buying above 1 XDR shows as a loss too.
- Mint, once it ships, shows the TCYCLES it mints as worth about 0.3% less than the ICP paid: the CMC charges `CXDR`, which sits that much above the IMF's XDR (§2).

## 4. Sources considered

| Source                                                             | Decision                                                                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IMF basket valued with CoinGecko's live EUR, CNY, JPY and GBP      | **Chosen.** Existing provider and request, and it tracks the IMF's daily rate (§2). Needs the 2022 amounts in code, with their end date (§3.5).                             |
| CoinGecko's own XDR (`vs_currencies=xdr`)                          | Rejected: stale, one change in 10 days, 0.32% above the IMF on 2026-09-28 (§2). Chosen first, and replaced the same day.                                                    |
| CMC `get_icp_xdr_conversion_rate` × the ICP price                  | Rejected: it divides two ICP prices taken from different sources at different times, and prices at `CXDR`, 0.28% above the IMF basket (§2). Already declined on 2026-09-24. |
| Exchange rate canister (`uf6dk-hyaaa-aaaaq-qaaaq-cai`), `CXDR`/USD | Rejected: callable only from a canister, as an update call with cycles attached, so it cannot serve the frontend provider path; and `CXDR` uses the 2016 amounts.           |
| The IMF's published rate                                           | Rejected: no API, and its rates page refuses non-browser clients (HTTP 403).                                                                                                |
| An FX API with XDR (e.g. open.er-api.com)                          | Rejected: a new third-party dependency, for a rate the basket already gives from the existing provider.                                                                     |
| A CoinGecko listing of TCYCLES                                     | Does not exist, and would track DEX trading rather than the peg (§3.3).                                                                                                     |

## 5. Acceptance criteria

**Frontend PR**

- **AC1** On the frontend provider path (staging, beta and production), TCYCLES's USD price equals the §3.1 basket computed from the refresh's BTC response (`usd`, `eur`, `cny`, `jpy`, `gbp`).
- **AC2** Its 24h change equals the basket's change from the rates of 24 hours earlier to the current ones, each earlier rate being the current one × `(1 + x_24h_change / 100) / (1 + usd_24h_change / 100)` for its currency `x`.
- **AC3** The frontend never asks ICPSwap or KongSwap for TCYCLES: not on the provider path, not in the backend-mode fill, and not when the basket is unusable or expired.
- **AC4** A CoinGecko `token_price` result for `um5iw…`, if one ever appears, does not replace the basket price.
- **AC5** A refresh that lacks any of the five BTC prices brings no TCYCLES price, and every other price is unchanged.
- **AC6** TCYCLES is priced with the 2022 amounts until 2027-09-30 23:59:59 UTC, and no refresh prices it from 2027-10-01 00:00 UTC.
- **AC7** From 2027-07-25 00:00 UTC, every provider-path refresh that includes TCYCLES fires exactly one countdown event, with its phase, days and severity: `expiring_soon` 7 `warn` at 2027-07-25 00:00, `expiring_soon` 1 `warn` at 2027-07-31 23:00, `grace` 61 `warn` at 2027-08-01 00:00, `grace` 1 `warn` at 2027-09-30 23:00, `expired` 0 `error` at 2027-10-01 00:00. No event fires before 2027-07-25, or for a refresh without TCYCLES.
- **AC8** The provider path sends the same requests as before; only the BTC request's `vs_currencies` changes.
- **AC9** Every other token keeps its sources, their order and their filters.
- **AC10** Unit tests cover the price and 24h change derivation, each missing or invalid BTC price, the expiry and event boundaries of AC6 and AC7 on a mocked clock, the event's full metadata per phase, the absence of any ICPSwap or Kong request for TCYCLES on either frontend path, and the basket price's precedence over a CoinGecko listing.
- **AC11** `docs/ai/frontend/analytics.md` §4 documents `event_severity` and its scale, next to `result_error_severity`, and the severity values come from a `plausible.ts` enum, not literals.
- **AC12** `docs/ai/PRODUCT.md` → _Exchange-rate sourcing_ states the TCYCLES rule, including that the frontend never prices TCYCLES from a market, the basket's end date and grace period, the countdown event, and that backend mode still shows the backend's price for TCYCLES until the backend follow-up.

**Backend follow-up**

- **AC13** In backend mode, the backend returns TCYCLES with the price and 24h change of AC1 and AC2 from its own CoinGecko response, under the same expiry as AC6, never asks ICPSwap for it, leaves it unpriced without a usable basket, and does not let a CoinGecko listing replace the basket price. `docs/ai/PRODUCT.md` drops the backend-mode exception.

## 6. Non-goals

- Pricing any other token from a peg: XTC (the DIP20 cycles token), ck-tokens, stablecoins.
- Loading the basket amounts at runtime: the IMF fixes the next ones only on the last business day before they apply, so the 2027 update is a code change, and the countdown event (§3.6) is its reminder.
- The exchange rate canister's outdated `CXDR` amounts, which are outside OISY.
- XDR as a display currency.
- Adding `event_severity` to existing events.
- A market cap for TCYCLES (it has none today either).
- Any change to the ICPSwap/Kong fallback or its liquidity filter for other tokens.

## 7. Implementation plan

1. This PR (#14153), which carries this spec and the frontend implementation together, renamed `feat(frontend): price TCYCLES at its XDR peg` once the code is in: `eur,cny,jpy,gbp` added to the provider path's BTC request; TCYCLES priced from the basket with its 24h change, end date and grace period, and kept out of the ICPSwap/Kong cascade, on the provider path and in the backend-mode fill; the countdown event and the `event_severity` key, added as `docs/ai/frontend/analytics.md` describes, with that doc updated; tests; PRODUCT.md (AC1 to AC12). This is the PR that changes staging, beta and production.
2. Later, as its own follow-up: `feat(backend): price TCYCLES at its XDR peg`: TCYCLES taken out of the CoinGecko token request and the ICPSwap supplemental, and priced from the basket with one `simple/price?ids=bitcoin&vs_currencies=usd,eur,cny,jpy,gbp&include_24hr_change=true` request, sent only when TCYCLES is requested; Rust unit tests; PRODUCT.md (AC13).
3. In the last days of July 2027, once the IMF publishes the new amounts: a PR that sets them and their end date.

This PR ships alone (§10, D3, D7) and changes every deployed environment, since none of them uses backend prices (§2). Until the backend follow-up lands, a build running in backend mode keeps showing the ICPSwap price for TCYCLES, since the backend wins every collision.

## 8. Open questions (facts to confirm)

None.

## 9. Pending decisions (facts are clear)

None.

## 10. Resolved

- **D1 Source (revised 2026-09-28):** the IMF basket, valued with CoinGecko's live EUR, CNY, JPY and GBP rates. It replaces CoinGecko's own XDR, which was chosen first the same day and dropped once its history showed it stale (§2). 1 XDR is the official value of 1 TCYCLES; the alternatives are in §4.
- **D2 No usable rate (§3.4), was P1:** that refresh brings no TCYCLES price, with no fallback to ICPSwap or any other source (2026-09-28). A missing price is honest and makes the swap review ask for confirmation, while the pool price is what this spec removes: in one day it ranged from 94% below the peg to 64% above it.
- **D3 Backend (§3.8, §7), was P2:** later. The frontend PR ships alone, and the backend follows as its own PR (2026-09-28). No deployed environment uses backend prices (staging's `exchange_rate_enabled` is off, and beta and production never read it), so the frontend PR alone changes all of them.
- **D4 End date (§3.5):** the 2022 amounts carry their end date and a grace period to 2027-09-30, after which TCYCLES has no price rather than a price from an outdated basket (2026-09-28).
- **D5 Countdown event (§3.6):** from one week before the switch, on every price refresh, with the days left in the current phase: `expiring_soon` (warn), `grace` (warn), then `expired` (error), which keeps it firing once TCYCLES has lost its price (2026-09-28).
- **D6 Severity (§3.7):** a new `event_severity` key, so that any event can be filtered by severity, on the scale `info`, `warn`, `error`, `blocker` (2026-09-28). The common standards all name the level above warning "error" and put worse levels above it (OpenTelemetry: TRACE, DEBUG, INFO, WARN, ERROR, FATAL; syslog, RFC 5424: … Warning, Error, Critical …); OISY's `blocker` takes the place of `fatal`.
- **D7 One PR:** the spec ships in the feature's PR: #14153 gains the frontend implementation, `analytics.md` and `PRODUCT.md`. The backend follow-up and the 2027 amounts stay separate, later PRs (2026-09-28).
- **Q1 Pro API:** CoinGecko's Pro API (`pro-api.coingecko.com`, used by the frontend's provider path and by the backend) returns `xdr` from `simple/price` like the public API; checked with the production key on 2026-09-28 at 11:18 UTC (BTC at 83,026 USD and 60,851 XDR: 1.3644). Since D1's revision the basket needs only EUR, CNY, JPY and GBP, which the display-currency switcher already requests.
- **Q2 CoinGecko's XDR update rhythm:** one change in 10 days of hourly history (§2), which led to D1's revision.
