This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Per-Provider Exchange-Rate Flags + Frontend Price Fallback

## Goal

Two related changes to the exchange-rate flow:

1. **Per-provider enable flags**, hardcoded in code (no runtime config, no candid,
   no `ApiKeys`):
   - **Backend (2):** `COINGECKO` and `ICPSWAP` — gate whether each backend
     provider participates in a refresh.
   - **Frontend (3):** `COINGECKO`, `ICPSWAP`, `KONGSWAP` — gate whether each
     frontend provider participates. (`ICPSWAP` and `KONGSWAP` flags already
     exist; only the `COINGECKO` flag is new — bringing it to parity.)
2. **Frontend price fallback (not XOR).** When the backend serves exchange rates,
   the frontend no longer _stops_ fetching prices itself. It uses the backend as
   the primary source and then runs its own providers **only for the tokens the
   backend returned without a price**, merging the results. When the backend is
   disabled, behaviour is unchanged (full frontend-provider path).

## Motivation

- **The backend price set is a subset, by design.** The backend prices native
  tokens + a caller's priceable custom tokens via CoinGecko (primary) and
  ICPSwap (supplemental, ICRC-only). Tokens CoinGecko doesn't cover and ICPSwap
  can't supplement come back with `price: None`. Today, when the frontend is in
  backend mode it shows _no_ price for those, even though the frontend's own
  providers (e.g. ICPSwap with different filtering, or CoinGecko for an
  ERC-20/SPL the backend skipped) might have one. The fallback closes that gap:
  **30 tokens served, 5 without a price → the frontend fills those 5.**
- **Per-provider flags give a code-level kill-switch per provider in both
  layers** without a redeploy-config dance. They are hardcoded `const`s, flipped
  in a PR — matching the existing `ICPSWAP_PROVIDER_ENABLED` /
  `KONGSWAP_PROVIDER_ENABLED` convention on the frontend.

---

## Background

### Backend (today)

- `fetch_and_update_prices` ([`src/backend/src/exchange/mod.rs:370`](../../../src/backend/src/exchange/mod.rs))
  builds a `CoinGeckoProvider` primary + `supplemental_price_providers(replicated)`
  (which returns `vec![Box::new(IcpSwapProvider::new(replicated))]`) and calls
  `fetch_all_prices`.
- `fetch_all_prices` ([`src/backend/src/exchange/composite.rs:42`](../../../src/backend/src/exchange/composite.rs))
  runs the primary, keeps only valid prices (`has_valid_price`), then runs each
  supplemental **only for the tokens still missing a valid price**, in order.
- There is a **global** opt-in gate, `is_exchange_rate_refresh_enabled()`
  ([`mod.rs:342`](../../../src/backend/src/exchange/mod.rs), backed by the
  `ApiKeys` cell), but **no per-provider toggles** — to drop a provider today you
  edit the provider list / call site.
- KongSwap is **not** a backend provider and is out of scope here.

### Frontend (today)

- The price worker ([`src/frontend/src/lib/workers/exchange.worker.ts`](../../../src/frontend/src/lib/workers/exchange.worker.ts))
  has a hard **XOR** in `syncExchange` (`exchange.worker.ts:392`):

  ```ts
  const data = backendExchangeEnabledFromTimerData(latestTimerData)
  	? await syncExchangeFromBackend(params) // backend only
  	: await syncExchangeFromProviders(params); // providers only
  ```

  `backendExchangeEnabled` is a runtime value queried from the backend
  (`exchange_rate_enabled`), with the build-time `BACKEND_EXCHANGE_ENABLED`
  (`= LOCAL || STAGING`) as the until-loaded fallback.

- `syncExchangeFromBackend` ([`exchange.worker.ts:142`](../../../src/frontend/src/lib/workers/exchange.worker.ts))
  calls `fetchExchangeRatesFromBackend` and returns a `PostMessageDataResponseExchange`
  whose price categories are: native singles (`currentEthPrice`, `currentBtcPrice`,
  `currentIcpPrice`, `currentSolPrice`, `currentBnbPrice`, `currentPolPrice`,
  `currentArbitrumEthPrice`, `currentBaseEthPrice`), and the maps
  `currentErc20Prices`, `currentIcrcPrices`, `currentSplPrices`, plus the derived
  `currentErc4626Prices`. `fetchExchangeRatesFromBackend`
  ([`exchange.services.ts:306`](../../../src/frontend/src/lib/services/exchange.services.ts))
  only emits entries where the backend returned a non-null price
  (`mapExchangeRateToCoingecko` drops `isNullish(rate?.usd.price)`), so a
  backend-`None` token is simply **absent** from these maps / `undefined` for a
  native.
- `syncExchangeFromProviders` ([`exchange.worker.ts:248`](../../../src/frontend/src/lib/workers/exchange.worker.ts))
  fetches everything from the frontend providers via the `exchangeRate*ToUsd`
  helpers in [`exchange.services.ts`](../../../src/frontend/src/lib/services/exchange.services.ts).
- The frontend already has a clean per-provider fallback abstraction for ICRC:
  `icrcFallbackProviders` ([`exchange.services.ts:164`](../../../src/frontend/src/lib/services/exchange.services.ts)),
  `[{ enabled: ICPSWAP_PROVIDER_ENABLED, ... }, { enabled: KONGSWAP_PROVIDER_ENABLED, ... }]`,
  consumed by `exchangeRateICRCToUsd` which starts from CoinGecko then fills
  missing IDs from each enabled fallback. CoinGecko itself
  (`fetchIcrcPricesFromCoingecko`, and the native/ERC-20/SPL `exchangeRate*`
  helpers) is currently **unconditional** — no flag.
- `findMissingLedgerCanisterIds` ([`exchange.utils.ts:89`](../../../src/frontend/src/lib/utils/exchange.utils.ts))
  already computes "which requested ids are absent from a CoinGecko-shaped
  response" — the building block reused below.
- Existing flags: [`icpswap.env.ts:9`](../../../src/frontend/src/env/rest/icpswap.env.ts)
  `ICPSWAP_PROVIDER_ENABLED = true`; [`kongswap.env.ts:12`](../../../src/frontend/src/env/rest/kongswap.env.ts)
  `KONGSWAP_PROVIDER_ENABLED = false` (sunsetted); CoinGecko env
  [`coingecko.env.ts`](../../../src/frontend/src/env/rest/coingecko.env.ts) has
  **no** provider flag yet.

---

## Decisions (resolved during clarification)

1. **Flag count is 5, not a symmetric 6.** Backend has only two providers
   (CoinGecko, ICPSwap); KongSwap is **not** integrated server-side and stays
   frontend-only. So: **2 backend flags + 3 frontend flags**. Of these, **3 are
   new** (backend CoinGecko, backend ICPSwap, frontend CoinGecko); the frontend
   ICPSwap/Kong flags already exist.
2. **Backend flags are hardcoded `const`s — no configs.** They are **not**
   `ApiKeys` fields, **not** candid endpoints, and do **not** touch
   `backend.did`. They are flipped by editing code, matching the frontend's
   `*_PROVIDER_ENABLED` style. (The existing global `exchange_rate_enabled` /
   `exchange_rate_replicated` runtime config is untouched and orthogonal.)
3. **Frontend behaviour becomes fallback, not XOR.** Backend stays the primary
   source; frontend providers fill only the backend's `None`s. Backend-disabled
   path is unchanged.
4. **Fallback respects the frontend per-provider flags.** The fill step runs
   through the same flag-gated provider helpers, so a disabled frontend provider
   does not participate in the fill either.

---

## Implementation

The work is delivered as **atomic PRs across waves** — see
[Delivery plan](#delivery-plan-atomic-prs--waves). Each PR below is independently
mergeable and carries its own tests.

### PR-1 (backend) — Hardcoded per-provider flags

Add two module-level `const bool` flags near the provider wiring in
[`src/backend/src/exchange/mod.rs`](../../../src/backend/src/exchange/mod.rs)
(e.g. just above `supplemental_price_providers`). Suggested names mirror the
frontend: `COINGECKO_PROVIDER_ENABLED`, `ICPSWAP_PROVIDER_ENABLED`, both `true`.
Add a short `//` comment capturing _why_ they are hardcoded (code-level
kill-switch, no runtime config by design).

Gate the two providers:

- **ICPSwap (supplemental):** in `supplemental_price_providers`, include
  `IcpSwapProvider` only when `ICPSWAP_PROVIDER_ENABLED`. When disabled, return
  an empty `Vec`.
- **CoinGecko (primary):** the primary is currently a required `&P` in
  `fetch_all_prices` ([`composite.rs:42`](../../../src/backend/src/exchange/composite.rs)).
  Make the primary skippable. Preferred mechanics (implementer's choice, keep it
  minimal and testable): thread a `primary_enabled: bool` into `fetch_all_prices`
  and, when `false`, skip the primary fetch (treat it as an empty result) so the
  supplementals run over **all** requested tokens. `fetch_and_update_prices`
  passes `COINGECKO_PROVIDER_ENABLED`.

Edge cases to preserve / handle:

- Both disabled → no prices fetched (all tokens resolve to `None`). Acceptable
  for a kill-switch; no panic, no wasted outcalls.
- The global `is_exchange_rate_refresh_enabled()` gate still wins: if refresh is
  off, neither provider runs regardless of these flags.
- The CoinGecko API key is still required to _build_ the primary; gating must not
  change the existing `ApiKeyNotSet` behaviour when CoinGecko is enabled. When
  CoinGecko is disabled, do not require the key.

Tests: extend `composite.rs` unit tests (a "primary disabled → supplementals see
all tokens" case; "ICPSwap disabled → supplemental list empty"). Add/extend
`src/backend/tests/it/exchange.rs` only if the integration layer is the right
place to assert the wiring.

Run backend gates (`./scripts/format.sh`, `./scripts/lint.rust.sh`,
`./scripts/lint.did.sh` — `.did` must be unchanged —, `./scripts/test.backend.sh`).

### PR-2 (frontend) — CoinGecko provider flag (parity)

Add `COINGECKO_PROVIDER_ENABLED = true` to
[`src/frontend/src/env/rest/coingecko.env.ts`](../../../src/frontend/src/env/rest/coingecko.env.ts),
matching the ICPSwap/Kong shape (a plain `const`, not env-parsed, since those two
are plain consts).

Gate CoinGecko everywhere it is used in the **frontend provider path**
([`exchange.services.ts`](../../../src/frontend/src/lib/services/exchange.services.ts)):

- `exchangeRateICRCToUsd`: when disabled, start the cascade from `{}` instead of
  calling `fetchIcrcPricesFromCoingecko`, then let the existing flag-gated
  `icrcFallbackProviders` fill from ICPSwap/Kong as today.
- The native helpers (`exchangeRateETHToUsd`, `…BTC…`, `…ICP…`, `…SOL…`,
  `…BNB…`, `…POL…`), `exchangeRateERC20ToUsd`, `exchangeRateSPLToUsd`, and the
  FX helper `exchangeRateUsdToCurrency`: when disabled, short-circuit to the
  existing "no data" shape (`{}` / `undefined`) without hitting CoinGecko.

Keep mechanics minimal and consistent; do not change behaviour when the flag is
`true` (the default). This PR is **frontend-provider-path only** — it does not
touch the backend branch or the worker orchestration.

Tests: a small spec asserting that with the flag off, the CoinGecko helpers
don't fetch and the ICRC cascade still returns ICPSwap results; with it on,
behaviour is unchanged. Follow existing `exchange.services` test conventions.

### PR-3 (frontend) — Backend-then-fallback merge

Replace the XOR in `syncExchange` ([`exchange.worker.ts:392`](../../../src/frontend/src/lib/workers/exchange.worker.ts))
with a merge when the backend is enabled:

1. `const backendData = await syncExchangeFromBackend(params)`.
2. Compute the **missing** subset per category, from `params` vs `backendData`:
   - ICRC: `findMissingLedgerCanisterIds({ allLedgerCanisterIds: params.icrcLedgerCanisterIds, coingeckoResponse: backendData.currentIcrcPrices })`.
   - ERC-20: addresses in `params.erc20ContractAddresses` absent from
     `backendData.currentErc20Prices` (lower-cased keys).
   - SPL: addresses in `params.splTokenAddresses` absent from
     `backendData.currentSplPrices`.
   - Natives: each of the (up to) eight native singles that came back
     `undefined`.
3. Fetch **only the missing subset** from the frontend providers, reusing the
   existing `exchangeRate*ToUsd` helpers (so the frontend per-provider flags from
   PR-2 and the ICRC fallback chain all apply). Skip a category entirely when its
   missing set is empty (no wasted requests). If nothing is missing, skip the
   provider step.
4. **Merge** provider results into `backendData` with **backend winning** on key
   collisions (the fill only adds keys the backend left empty), then recompute
   `currentErc4626Prices` from the merged `currentErc20Prices` (it's derived).
5. Post the merged `PostMessageDataResponseExchange` as today.

Backend-**disabled** path is unchanged: `syncExchangeFromProviders(params)`.

Implementation notes:

- Factor the merge into a tested pure helper (e.g. in
  [`exchange.utils.ts`](../../../src/frontend/src/lib/utils/exchange.utils.ts) or
  a sibling) that takes `backendData` + the per-category provider results and
  returns the merged response — keep `exchange.worker.ts` thin and the merge
  unit-testable without a worker harness.
- Reuse `findMissingLedgerCanisterIds` for ICRC; add the analogous tiny helpers
  for ERC-20 / SPL / natives rather than duplicating set logic inline.
- The refresh **interval** stays driven by `backendExchangeEnabled`
  ([`exchange.constants.ts`](../../../src/frontend/src/lib/constants/exchange.constants.ts));
  this PR does not change timer cadence. (Note for review: the fill adds public
  provider calls on the faster backend cadence only for the _missing_ subset —
  acceptable because that subset is small by construction; flag if it isn't.)

Update [`docs/ai/PRODUCT.md`](../../../docs/ai/PRODUCT.md) in **this** PR to
describe the exchange-rate sourcing model (backend primary + frontend fallback
for unpriced tokens; per-provider flags in both layers).

Tests: unit tests for the merge helper (backend wins; only missing filled; empty
missing → no provider call; each category) and the missing-detection helpers.

### Quality gates (every PR)

```bash
# Frontend (PR-2, PR-3)
npm run format && npm run lint -- --max-warnings 0 && npm run check && npm run test
# Backend (PR-1)
./scripts/format.sh && ./scripts/lint.rust.sh && ./scripts/lint.did.sh && ./scripts/test.backend.sh
```

---

## Delivery plan (atomic PRs / waves)

| Wave | PR                                              | Layer    | Depends on                            | Parallel-safe with     |
| ---- | ----------------------------------------------- | -------- | ------------------------------------- | ---------------------- |
| 1    | **PR-1** — backend per-provider flags           | backend  | —                                     | PR-2 (no file overlap) |
| 1    | **PR-2** — frontend CoinGecko flag              | frontend | —                                     | PR-1                   |
| 2    | **PR-3** — frontend backend-then-fallback merge | frontend | PR-2 (reuses the gated provider path) | —                      |

- **Wave 1** runs PR-1 and PR-2 fully in parallel (backend vs frontend, zero
  shared files).
- **Wave 2** is PR-3, opened after PR-2 so the fill step inherits the
  CoinGecko flag and there's no conflict in `exchange.services.ts`.
- This spec doc lands first (or alongside PR-1) as the shared reference.

---

## Out of Scope

- A **KongSwap backend provider** (Kong stays frontend-only and disabled).
- Any change to the **runtime** `exchange_rate_enabled` / `exchange_rate_replicated`
  config, `ApiKeys`, candid, or `backend.did`.
- Changing refresh **intervals** / timer cadence.
- Reworking the backend supplemental ordering or the ICPSwap TVL filter.
- New providers, or changing CoinGecko platform mappings.

---

## Acceptance Criteria

- [ ] Backend exposes two hardcoded `const` provider flags
      (`COINGECKO_PROVIDER_ENABLED`, `ICPSWAP_PROVIDER_ENABLED`); no `ApiKeys`
      field, no candid endpoint, `backend.did` unchanged.
- [ ] With backend ICPSwap flag off, the supplemental list is empty and no
      ICPSwap outcall is issued; with backend CoinGecko flag off, the primary is
      skipped and supplementals run over all requested tokens; with both off, all
      tokens resolve to `None` without panic.
- [ ] The global `exchange_rate_enabled` gate still short-circuits both providers
      when refresh is disabled, and CoinGecko-on still requires its API key
      exactly as before.
- [ ] Frontend has `COINGECKO_PROVIDER_ENABLED` in `coingecko.env.ts` matching
      the ICPSwap/Kong flag style; with it off, the CoinGecko helpers issue no
      request and the ICRC cascade still returns ICPSwap results; with it on,
      behaviour is unchanged.
- [ ] When the backend is enabled, the worker uses backend prices as primary and
      fills **only** the tokens the backend returned without a price, via the
      flag-gated frontend providers, merging with **backend winning** on
      collisions; ERC-4626 prices are recomputed from the merged ERC-20 prices.
- [ ] When the backend is disabled, the frontend path is unchanged (full
      provider fetch).
- [ ] When nothing is missing, no fallback provider request is made.
- [ ] The merge and missing-detection logic live in tested pure helpers.
- [ ] `docs/ai/PRODUCT.md` describes the new exchange-rate sourcing model (landed
      in PR-3).
- [ ] All quality gates pass for each PR (frontend gates for PR-2/PR-3; backend
      gates for PR-1).

---

## Post-Merge (per workflow Step 6)

- `PRODUCT.md` is updated in PR-3 (the behaviour change), not post-merge.
- This spec has no asset folder to remove.
