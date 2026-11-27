# Spec: Rift becomes a swap provider (BTC ↔ EVM)

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Register **Rift** (https://www.rift.trade) as a swap provider, so its offers appear in the Swap
modal next to NEAR Intents, LI.FI and Chain Fusion: same token pickers, same quote list, same
provider sheet, same review and progress steps.

v1 covers two directions, delivered as separate PRs:

- **BTC → EVM**: native BTC (mainnet) to any enabled token on Ethereum, Arbitrum, Base, Polygon
  or Robinhood Chain that Rift has a route for.
- **EVM → BTC**: any enabled token on those five networks to native BTC.

Rift has **no slippage concept**. Its quotes are estimates. It executes at whatever price it
finds once the deposit arrives, with no minimum receive amount and no revert. v1 integrates Rift
"as usual" with an **interim** treatment of that difference (see [Presentation](#presentation-interim)).
A **separate, later spec** redesigns the Swap form for no-slippage offers. Rift reaches production
only after that redesign ships (see [Flag and env](#flag-and-env)).

Every Rift swap is tracked by **Active User Transactions** (AUT). Its row is created **before**
the deposit is broadcast, so no Rift deposit ever goes out untracked. The modal closes once the
deposit is broadcast, and the global AUT poller drives the row to `Succeeded` / `Failed`, surviving
a closed tab or a re-login.

**Out of scope:**

- **EVM ↔ EVM** (same-chain or cross-chain) routes, and any Solana, BSC, ICP or XRP leg. Rift lists
  no Solana, BSC, ICP or XRP. EVM ↔ EVM can follow once the BTC directions are proven.
- **The no-slippage form redesign** (slippage pill, form receive amount, ranking of offers that
  guarantee nothing): its own spec.
- An OISY integrator fee (decided 2026-11-25: none in v1).
- A Rift Terms acknowledgement gate (decided 2026-11-25: none, LI.FI precedent).
- Exact-output swaps: Rift's current API is exact-input only.

## Motivation

- BTC is where Rift is strongest. Its router aggregates 20+ venues (Unit, Hyperliquid, Chainflip,
  NEAR Intents, Relay, LI.FI, its own OTC venue) and settles BTC through plain deposits. That adds a
  competing quote for every BTC → EVM pair NEAR Intents and LI.FI already serve, and new pairs
  neither serves.
- A Rift deposit is a plain transfer to an address (no calldata, no approval, no `OP_RETURN` memo).
  Both deposit transports already exist in OISY (`sendBtc`, and the EVM `send` NEAR Intents uses),
  so the integration is mostly quoting, order checks and tracking.

## Background — Rift

Verified against Rift's published docs and OpenAPI spec (2026-11-25):
https://www.rift.trade/docs/llms.txt (full docs dump) and https://www.rift.trade/docs/openapi.json.
Live keyless `format: "raw"` quotes and CORS preflights (2026-11-26) pinned the asset ids and
answered the CORS question. No order has been created.

- **Model: deposit address.** `POST /quote` → `POST /order` (returns a unique `deposit_address`) →
  the user sends `amount_in` of the `from` asset there in one plain transfer → `GET /order/{id}`
  until it settles. No wallet connection, approvals or calldata. Rift's engine runs in TEEs (Intel
  TDX via Dstack, hosted by Phala); upgrades are timelocked behind a team multisig. **No
  third-party audit yet.**
- **Base URL:** `https://api.rift.trade`. Endpoints: `POST /quote`, `POST /order` (201),
  `GET /order/{id}`, `GET /order?deposit_tx=`, `GET /health`. Errors are `{ error: string }`.
- **Auth and limits.** API key optional, in `x-api-key`. Keyless: 1 request/second (scope not
  stated). Keys come from Rift's Telegram support bot. CORS is not documented, but every origin is
  allowed: a preflight from `https://oisy.com`, staging or localhost (2026-11-26) answers
  `access-control-allow-origin: *` for `GET` and `POST` with `content-type` and `x-api-key`, and
  `Retry-After` is exposed to the page. There is no SDK for
  the current API (`@riftresearch/sdk@0.19.0` targets an older camelCase API with `slippageBps`; do
  not use it). There is no testnet.
- **Chains** (OISY overlap in bold): **Ethereum, Arbitrum, Base, Polygon, Robinhood, Bitcoin**
  (BTC only), Hyperliquid, Ink, Plasma. No Solana, BSC, ICP or XRP.
- **Asset ids.** Request: `<chain>.<asset>`, where the chain is a name or `evm:<chainId>` and the
  asset is a symbol, a contract address, or `eth` / `btc` for the native coin. With
  `format: "raw"`, amounts are base-unit integers and assets are written canonically,
  `evm:<chainId>.<address>` on EVM chains. Rift's own advice: "Key on assets with `raw`: symbols
  are presentation and may be reassigned." Native coins are not documented. Live quotes
  (2026-11-26) pinned them:
  - `bitcoin.btc` for BTC;
  - `evm:<chainId>.eth` on Ethereum, Arbitrum, Base and Robinhood Chain;
  - `evm:137.pol` on Polygon (`matic` is refused as an unknown asset).

  Rift rewrites any other spelling into the canonical one in its echo: `ethereum.eth` becomes
  `evm:1.eth`, and a checksummed address becomes lowercase.

- **`POST /quote`.** Required `from`, `to`, `amount_in`; extra properties are rejected. Optional:
  `format` (`formatted` | `raw`), `quote_mode` (`fast` ≈ 1.5 s, or `optimal`, which gives each venue
  up to 10 s), `venue_allowlist` / `venue_blocklist`, `integrator_id` (`[A-Za-z0-9._-]{1,64}`),
  `integrator_fee_bps` + `integrator_fee_recipient`.
  - Response: `id` (uuid), `from`, `to`, `amount_in`, `estimated_amount_out` (after every venue cost,
    the execution cost and the integrator fee), `estimated_execution_cost` (in `to`),
    `route[]` (`venue` steps `{ venue, execution, from, to, amount_in, amount_out }`, then one
    `delivery` step `{ amount_in, execution_cost, integrator_fee, amount_out }`),
    `expires_at` (10 minutes after quoting), `integrator_fee_bps`.
  - Errors: 422 no route, 400 malformed, 401 bad key, 429 with `Retry-After`.
- **`POST /order`.** `{ quote_id, to_address, refund_address? }`; extra properties are rejected.
  `to_address` is on the `to` chain; `refund_address` is on the `from` chain. Without a refund
  address a refund goes to the deposit's sender. Repeating the call with the same quote and
  addresses returns the same order; changing the addresses is refused (409). Other errors: 403
  (sanctions screening failed for an address), 410 (quote expired), 503 (screening unavailable).
  - Response: `id`, `quote_id`, `vault_id`, `from`, `to`, `amount_in` ("exactly as quoted"),
    `amount_out`, `deposit_address`, `deposit_tx`, `payout_tx`, `to_address`, `refund_address`,
    `integrator_fee`, `integrator_fee_tx`, `status`, `deposit_deadline` (7 days), `created_at`.
- **No slippage.** "Quotes are indicative, not exact." "Rift doesn't have a max slippage concept.
  We instead force execution at the best available price so your order always completes instead of
  reverting." "Everything is re-quoted on optimal once funds are sent." Rift's Terms: no maximum
  slippage protection; execution may exceed the estimate. A deposit larger or smaller than
  `amount_in` is used in full, at a possibly different rate.
- **Statuses** (`OrderStatus`): `awaiting_deposit` → `funded` → `executing` → `delivered`;
  also `underfunded` ("far below `amount_in`" arrived; "will be refunded"), `refunded`, `expired`
  (no deposit before `deposit_deadline`), `frozen` ("halted by policy, or gave up with no refund
  destination, or the refund failed. An operator needs to step in."). Rift calls `delivered`,
  `refunded`, `expired` and `frozen` settled. Refunds are automatic; there is no refund endpoint.
- **A route that fails partway.** "For a refund to occur, every venue for a leg of the route must
  fail. If this happens, and none come back online during the timeout window, the user will be
  refunded back to their original asset. This refund means going through a venue, so they will
  receive back less than their starting amount." `amount_out` is the amount of `to` delivered
  (`delivered`) or of `from` refunded (`refunded`). The API exposes no per-leg progress. Rift
  reports 98.9 % of orders completed and 1.1 % refunded.
- **BTC deposits.** A regular address, no memo or `OP_RETURN`. Paid "in one transfer". Shown in
  `deposit_tx` before it confirms; follows an RBF replacement. Execution starts once it confirms
  (the confirmation count is not documented). Rift's own BTC → stock-token example: "30 to 60
  minutes".
- **Integrator fee.** Supported (1–1000 bps of the delivery, in `to`), and not used by OISY in v1.
  `integrator_id` alone attributes orders to OISY.

## Background — what OISY reuses

The integration follows NEAR Intents' deposit-address shape and LI.FI's tracking decisions. The
precedents in the repository:

- **Registries.** `btcSwapProviders` (`src/frontend/src/lib/providers/btc-swap.providers.ts`) and
  `evmSwapProviders` (`lib/providers/evm-swap.providers.ts`), each entry
  `{ key, getQuote, isEnabled, getSupportedTokens?, getSupportedDestinations }`. `fetchSwapAmounts`
  (`lib/services/swap.services.ts`) resolves the destination-chain recipient and passes it as
  `recipientAddress` (`BtcQuoteParams` / `EvmQuoteParams` in `lib/types/swap.ts`). A whole provider
  round is bounded by `SWAP_QUOTE_TIMEOUT_MS` (10 s, `lib/constants/swap.constants.ts`).
- **No-slippage offers already exist.** OISY Trade (fill-or-kill) and Chain Fusion carry no
  `receiveOutMinimum`, and the slippage control does not affect them (`SwapMappedResult` in
  `lib/types/swap.ts`).
- **Deposit-address execution.** `executeNearIntentsSwap` and its transports in
  `lib/services/swap.services.ts`: `fetchNearIntentsBtcSwap` (`sendBtc` with `beforeBroadcast` /
  `openSwap`, then `deleteUnbroadcastActiveUserTransaction` on `isDefinitiveBtcBroadcastRefusal`)
  and `fetchNearIntentsEvmSwap` (`send` from `eth/services/send.services.ts`).
  - The EVM `send` has **no** `beforeBroadcast` hook today. Only `swap()` in
    `eth/services/swap.services.ts` has one (it hashes the signed bytes with `keccak256` before
    broadcasting).
- **AUT.** `ActiveUserTransactionData` (`src/shared/src/types/active_user_transaction.rs`, one
  variant per provider; `LifiData { source_token, dest_token, amount }` is the closest shape),
  validated in `validate_data` (`src/backend/src/active_user_transactions/model.rs`). Frontend:
  `lib/services/active-user-transactions.services.ts`, per-provider `*-active-tx.utils.ts` /
  `*-active-tx.services.ts`, `lib/components/loaders/LoaderActiveUserTransactions.svelte`,
  `ActiveUserTransactionItem.svelte`. Terminal states are immutable.
- **Review warnings.** `SwapLifiBtcRelayWarning.svelte` is the pattern for a provider-specific
  `MessageBox` on Review that follows the selected offer.
- **BTC swap gates.** `cross-chain-networks.derived.ts`, `swap.derived.ts` and
  `SUPPORTED_CROSS_SWAP_NETWORKS` admit Bitcoin when `CHAIN_FUSION_SWAP_ENABLED ||
NEAR_INTENTS_BTC_SWAP_ENABLED`.

## Design

### Flag and env

New `src/frontend/src/env/rest/rift.env.ts`:

- `RIFT_SWAP_ENABLED`: `false` until the first PR that can execute a Rift swap (PR 4), then
  `LOCAL || STAGING`. It stays there through v1. The production flip is its own one-line PR,
  gated on **all** of: the no-slippage form redesign shipped, a production API key in place, and
  CORS confirmed from OISY's production origin.
- The flag gates **new** quotes and orders only. Rift rows that already exist are polled, refreshed
  and shown whatever its value, as LI.FI's are: turning it off while a deposit settles must not
  strand the row or skip its balance refresh.
- The BTC → EVM entry is enabled only while `BTC_SEND_VIA_BACKEND_ENABLED` is on too (as
  `LIFI_BTC_PROVIDER_ENABLED` is): only the backend path signs before broadcasting, which the row
  needs (see [Active User Transactions](#active-user-transactions)).
- `RIFT_API_URL = 'https://api.rift.trade'`.
- `RIFT_API_KEY: string | undefined = import.meta.env.VITE_RIFT_API_KEY`: one key per environment,
  shipped in the bundle as LI.FI's is. Request an origin restriction from Rift if it offers one.
  Unset means keyless, so local development works without a key.
- `RIFT_INTEGRATOR_ID = 'oisy'`: sent on every quote for attribution.
- `RIFT_EVM_NATIVE_ASSETS`: Rift's name for the native coin of each EVM network it is asked
  about: `eth` on Ethereum, Arbitrum, Base and Robinhood Chain, and `pol` on Polygon. Its keys are
  the network list: a network without an entry is never asked about. `RIFT_BTC_ASSET_ID` is
  `bitcoin.btc`.
- Gates widened to `|| RIFT_SWAP_ENABLED`: Bitcoin networks in `cross-chain-networks.derived.ts`,
  `swapUniverseBitcoinTokens` in `swap.derived.ts`, and the BTC entries of
  `SUPPORTED_CROSS_SWAP_NETWORKS`. With BTC → EVM (PR 3), the Bitcoin row gains the networks in
  `RIFT_EVM_NATIVE_ASSETS`. With EVM → BTC (PR 6), those networks' rows gain Bitcoin.

### REST client (no SDK, no new dependency)

`src/frontend/src/lib/rest/rift.rest.ts` with typed `postRiftQuote`, `postRiftOrder` and
`getRiftOrder`, plus the types in `src/frontend/src/lib/types/rift.ts`. The shapes are those of the
OpenAPI spec above. REST clients live in `lib/rest/`, as `lifi.rest.ts` and `near-intents.rest.ts`
do; `lib/api/` wraps canister declarations.

- Every request carries `x-api-key` when `RIFT_API_KEY` is set.
- Responses are parsed, not cast, with the zod schemas in `lib/schema/rift.schema.ts`. A response
  missing a required field is an error (`RiftInvalidResponseError`), not an offer. An error status
  is a `RiftApiError` carrying the status.
- Every **quote** request sets `format: "raw"`, so amounts are base-unit integers and assets are
  canonical ids. The order body is exactly `{ quote_id, to_address, refund_address }`: `POST /order`
  rejects extra properties, so `format` is never added there. An order inherits its quote's format
  (`OrderResponse.format`), so every order response, from `POST /order` and `GET /order/{id}`, must
  read `format: "raw"` or it is unparseable.

**Rate limiting.** Every Rift request (quotes, order creation and the poller's status reads) goes
through one limiter in `rift.rest.ts`:

- Request **starts** are at least `RIFT_MIN_REQUEST_INTERVAL_MS` (1 s) apart, with or without a key
  (keyed limits are not documented). Caching alone does not bound the rate: the form debounces input
  changes by only 300 ms (`SwapAmountsContext.svelte`), and every change of inputs is a new request.
- A 429 starts one shared cooldown until its `Retry-After` elapses, or for
  `RIFT_DEFAULT_RETRY_AFTER_MS` (5 s) when the header is missing or unreadable. Nothing is sent to
  Rift before then.
- Order creation, and the order read right before a broadcast (`getRiftOrder({ urgent: true })`),
  are served before any waiting quote or status read. A waiting quote request is replaced by a newer
  one (`RiftRequestSupersededError`, nothing sent), so only the latest inputs are quoted.

### Asset identifiers

`lib/utils/rift.utils.ts` maps an OISY token to a Rift asset id:

- Native BTC (mainnet) → `bitcoin.btc`.
- An EVM native coin on a Rift network → `evm:<chainId>.<name>`, with the name from
  `RIFT_EVM_NATIVE_ASSETS`.
- An ERC-20 on a Rift network → `evm:<chainId>.<contract address>`, lowercased. Any enabled ERC-20
  qualifies (decided 2026-11-25). An ERC-4626 vault share counts as one, under its own contract
  address, as it does for LI.FI. Rift answers 422 when it has no route, which is no offer.
- Anything else → `undefined` (never asked about).

The native-coin ids are pinned from live `format: "raw"` quotes (2026-11-26; see
[Background — Rift](#background--rift)). Comparisons against Rift's echoes are case-insensitive
(`isSameRiftAssetId`).

### Quoting

- **BTC → EVM.** `btcSwapProviders` gains a `SwapProvider.RIFT` entry:
  - `getSupportedTokens` → native BTC mainnet only.
  - `getSupportedDestinations` → `{ evm: 'any' }`; `getQuote` returns no offer for a destination
    outside `RIFT_EVM_NATIVE_ASSETS`.
  - The recipient is `recipientAddress` (the user's ETH address) and the refund address is
    `userBtcAddress`.
- **EVM → BTC.** `evmSwapProviders` gains a `SwapProvider.RIFT` entry:
  - Supported sources: every enabled fungible token on a Rift network.
  - `getSupportedDestinations` → native BTC mainnet.
  - The recipient is the user's BTC address (`recipientAddress`, threaded through for EVM sources
    as for NEAR Intents BTC destinations) and the refund address is the user's ETH address.
- **Request:** `{ from, to, amount_in, format: "raw", quote_mode: "fast", integrator_id }`. No venue
  lists and no fee fields.
  - `fast` because a provider round is bounded by `SWAP_QUOTE_TIMEOUT_MS` (10 s), which `optimal`
    can exhaust on its own. The mode does not affect execution: Rift re-quotes on `optimal` once the
    deposit arrives.
- **Cadence:** on input change, then at most every `RIFT_QUOTE_REFRESH_INTERVAL_MS` (30 s, as LI.FI)
  for unchanged inputs, cached per request. The cache only avoids re-asking for unchanged inputs; the
  [limiter](#rest-client-no-sdk-no-new-dependency) is what keeps a session within 1 request/s.
- **Quote checks, before an offer is shown.** The offer is dropped, silently, unless:
  - `format` is `raw`, and `from`, `to` and `amount_in` equal the request;
  - `estimated_amount_out` is a positive integer;
  - `integrator_fee_bps` is absent or 0, the route has exactly one `delivery` step, and that step's
    `integrator_fee` is `0`;
  - `expires_at` is in the future.
- **Offer shape.** A new `SwapMappedResult` member:

  ```ts
  {
  	provider: SwapProvider.RIFT;
  	receiveAmount: bigint; // estimated_amount_out
  	// No `receiveOutMinimum`: Rift executes at whatever price it finds once the deposit
  	// arrives, so the slippage control must not affect this offer.
  	swapDetails: RiftQuote; // the whole quote, which execution orders from
  	type?: string;
  }
  ```

  The offer ranks by `receiveAmount` like every other offer. How offers that guarantee nothing should
  rank belongs to the redesign spec.

- **No route** (422), a malformed answer or a timeout means no offer. A 422 is not mapped to
  `amount-too-low` until Rift's error text for a too-small amount is known.

### Presentation (interim)

Until the no-slippage redesign:

- `swapProvidersDetails[SwapProvider.RIFT]` (`lib/constants/swap.constants.ts`): unconditional,
  because a tracked row can outlive the flag. `name: 'Rift'`, `website: 'https://rift.trade'`, logo
  `static/images/dapps/rift-logo.svg` (a placeholder, as LI.FI's was; the official logo replaces the
  file later).
- `SwapDetailsRift.svelte` in the provider sheet (`SwapProviderDetails.svelte`):
  - the estimated receive amount, labelled as an estimate (`swap.text.you_receive_estimate`);
  - the route, as the venues of `route[]` in order, under `swap.text.rift_route_via`. Rift's own
    venue ids are shown (`rift_otc`, `velora`, …), since Rift publishes no display names for them;
  - the network cost Rift deducts (`estimated_execution_cost`, in the destination token), under
    `swap.text.included_network_fees`;
  - no minimum-received row;
  - the disclosure below, in a `MessageBox`.
- The form's fee row (`SwapBtcFees.svelte`) shows the Bitcoin network fee of the deposit for a Rift
  offer, as for NEAR Intents. The deposit is a plain transfer, which the UTXO fee loader prices.
- `SwapRiftEstimateWarning.svelte` on Review: a `MessageBox` (pattern: `SwapLifiBtcRelayWarning`)
  shown while the selected offer is Rift's. Its copy says that Rift guarantees no minimum, swaps at
  the best price it finds once the deposit arrives, may deliver more or less than shown, and that the
  max slippage setting does not apply to this offer.
- The modal's slippage pill and Review's "Max slippage" row stay as they are for every provider, as
  they do for OISY Trade and Chain Fusion today. The redesign spec replaces them.

### Pre-send checks

At **Swap** (after Review), before anything is signed:

1. **The reviewed quote must still be valid.** Its `expires_at` must be in the future. Otherwise the
   swap stops with `swap.error.rift_quote_expired`, nothing is sent, and the user goes back to a
   fresh offer.
2. **Create the order** from the reviewed quote's `id`, with `to_address` set to the user's address
   on the destination chain and `refund_address` **always** set to the user's own address on the
   source chain.
   - Rift's docs warn that a refund without a refund address goes to the deposit's sender, which may
     not be the user.
   - 410 is treated as step 1. 403, 409, 503 and any other failure stop with
     `swap.error.rift_order_refused`. Nothing is sent.
3. **Bind the order to the review** (decided 2026-11-25). The swap stops with
   `swap.error.rift_order_unverified` and sends nothing unless all of these hold:
   - `quote_id` equals the reviewed quote's `id`;
   - `from`, `to` and `amount_in` equal the reviewed quote's;
   - `to_address` and `refund_address` equal the user's own addresses (EVM compared
     case-insensitively, BTC exactly);
   - `status` is `awaiting_deposit` and `deposit_tx` is null;
   - `deposit_address` is a valid address on the source chain (BTC mainnet, or an EVM address) and
     is not one of the user's own;
   - `deposit_deadline` is in the future.

The deposit address itself cannot be verified. Rift's orders are unsigned, so it is taken on Rift's
word, which is a documented risk and an open question to Rift. It is not a production gate.

### Execution: BTC → EVM

`fetchRiftBtcSwap` in a new `lib/services/rift-swap.services.ts`; `SwapBtcWizard.svelte` dispatches to
it when the selected provider is Rift (transfer-style, as for NEAR Intents).

1. Run the [Pre-send checks](#pre-send-checks).
2. `sendBtc` to `deposit_address` for exactly `amount_in` (one transfer, at the fee the form
   reviewed).
   - In `beforeBroadcast`, create the AUT row with its refs (txid included). If the row cannot be
     created, nothing is broadcast. That includes a second row for the same order
     ([one row per order](#active-user-transactions)). Once the row exists, the hook re-reads the
     order and broadcasts only if it still awaits its deposit
     ([re-check before broadcast](#active-user-transactions)).
   - On `isDefinitiveBtcBroadcastRefusal`, delete the row (`deleteUnbroadcastActiveUserTransaction`).
   - On an unclear outcome, keep the row and still enable the destination token, as
     `fetchNearIntentsBtcSwap` does.
3. `enableSwapDestinationToken`, so the payout lands in a token the user can see.
4. Track `TRACK_COUNT_SWAP_SUBMITTED`. The modal closes and the AUT poller takes over.

A swap that stops before its deposit (`RiftSwapRefusedError`: an expired quote, a refused, unverified
or in-flight order) says why, and the form comes back with a fresh quote. Every failed Rift swap, in
either direction, reports an allow-listed category in its `TRACK_COUNT_SWAP_ERROR` event
(`toRiftSwapErrorType`: `quote_rejected` for those refusals, `insufficient_funds`, else `unknown`),
never the error's text: Rift's can name the user's addresses, and a node's refusal of an EVM deposit
can carry the signed transaction.

### Execution: EVM → BTC

`fetchRiftEvmSwap`; `SwapEthWizard.svelte` dispatches to it like NEAR Intents (`isTransferNeeded`).

1. Run the [Pre-send checks](#pre-send-checks).
2. `send` (`eth/services/send.services.ts`) of exactly `amount_in` to `deposit_address`, native or
   ERC-20 `transfer`.
   - `send` gains an optional `beforeBroadcast({ hash, nonce })`, as `swap()` has: after signing,
     hash the signed bytes and run the hook before broadcasting; if it rejects, nothing is
     broadcast. It runs for the send only, never for an approval the send needs first, and stays
     out of the request the signer signs. This lands as its own refactor PR with no behaviour
     change.
   - Create the row there, with refs for the deposit hash, nonce and chain id. A second row for the
     same order is refused, and nothing is broadcast
     ([one row per order](#active-user-transactions)). Then re-read the order and broadcast only if
     it still awaits its deposit ([re-check before broadcast](#active-user-transactions)).
   - On `isDefinitiveTransactionRefusal` (`eth/utils/eth-error.utils.ts`), delete the row.
   - Any other broadcast failure may have relayed the deposit. As on LI.FI's EVM path, the swap goes
     on as sent and the row settles it: signing again would read the next nonce and could pay twice.
3. The BTC destination token is native BTC, which is always enabled; no token enabling is needed.
4. Track `TRACK_COUNT_SWAP_SUBMITTED`. The modal closes.

### Active User Transactions

**Backend (PR 1).** A new variant, appended to the enum:

```rust
/// Rift swap. A single variant covers both v1 directions (BTC → EVM, EVM → BTC); the
/// order id, deposit address, deposit tx and settlement refs ride in `external_refs`.
Rift(RiftData),

pub struct RiftData {
    pub source_token: TokenId,
    pub dest_token: TokenId,
    /// Source-token amount in base units: the order's `amount_in`.
    pub amount: Nat,
}
```

`validate_data` requires a valid amount, as for `Lifi`, and the `rift_order_id` ref at creation
(see the refs below). The variant is appended at the end of the enum, as `NearIntents`, `Velora`,
`Lifi` and Chain Fusion's were. `breaking-interface.md` calls that typically non-breaking, but
defers to CI's Candid compatibility check (`backend-tests / breaking-interface`). If that check
flags the change, PR 1 is marked breaking as the doc describes. Regenerate `backend.did` and the
declarations per that doc either way.

**Row timing** (decided 2026-11-25). The row is created after the order is checked and the deposit
is signed, before it is broadcast. No row means nothing is sent. It is deleted only on a definitive
broadcast refusal, as LI.FI's and the XRP sends' rows are.

**One row per order.** `create` refuses a Rift row whose `rift_order_id` is already on one of the
caller's rows, in any state, with `AlreadyInFlight`. This is the same kind of guard as the one
that refuses a second XRP payment or SOL mint in flight. Order ids are compared without case. The
backend requires `rift_order_id` to be a UUID, the shape Rift's API gives it. An update can neither
strip it nor change it, since either would loosen the guard.

- Rift answers a repeated `POST /order` with the same order. Until it sees the first deposit, that
  order still reads `awaiting_deposit` with no `deposit_tx`, so the binding checks pass again.
- A retry after an unclear broadcast, or a second tab on the same quote, would then send a second
  deposit to the same address.
- Only this call sees the check and the write at once, so it is what holds the invariant. A
  frontend check cannot be atomic with the create.

On that refusal, nothing is broadcast. The existing row is kept and **never deleted**, and the swap
stops with `swap.error.rift_order_in_flight`. After any attempt, whether its deposit went
out, failed or is unclear, the reviewed quote is dropped, so a new swap, even one with the same
inputs, starts from a fresh quote and therefore a new order. A row
deleted after a definitive refusal no longer counts, so a retry on that order is allowed: nothing
was sent.

**Re-check before broadcast** (decided 2026-11-26). The guard holds only while the first row
exists. A row also goes when the user dismisses it, or when `make_room` evicts it at the cap, and
both only happen once it is terminal. A tab that stalled between its pre-send checks and its
broadcast (a sleeping laptop, a suspended tab) could outlast that, and then pass the guard. So,
once its row is created and right before broadcasting, the hook re-reads the order
(`GET /order/{id}`, served with order-creation priority by the limiter):

- It broadcasts only if the order still reads `awaiting_deposit` with no `deposit_tx`.
- Otherwise it deletes its own row (nothing was sent), broadcasts nothing, and stops with
  `swap.error.rift_order_in_flight`. If the order cannot be read, it does the same but stops with
  `swap.error.rift_order_refused`. If the order's `deposit_deadline` has passed since its checks
  (signing takes time), it does the same but stops with `swap.error.rift_quote_expired`.

That closes the gap without new backend state. A row is only terminal once Rift or the source chain
has settled the first deposit. If Rift saw it, the order no longer reads `awaiting_deposit` with no
`deposit_tx`. If the source chain failed it (reverted or replaced), nothing reached Rift, so a deposit
from the stalled tab is the order's first. Two tabs racing within seconds are still stopped by the
guard, because the first row is not terminal yet. Backend tombstones for used order ids were
considered and not taken: they would need new stable state, another interface change and a
retention policy.

**External refs** (`RIFT_EXTERNAL_REF_KEYS`, `lib/types/rift.ts`; keys ≤ 32 chars, values ≤ 256):

| Key                     | When                               | Value                                  |
| ----------------------- | ---------------------------------- | -------------------------------------- |
| `rift_order_id`         | creation                           | the order `id` (what the poller reads) |
| `rift_deposit_address`  | creation                           | `deposit_address`                      |
| `rift_deposit_tx`       | creation                           | the BTC txid or the EVM tx hash        |
| `rift_deposit_nonce`    | creation (EVM)                     | the deposit's nonce                    |
| `rift_deposit_chain_id` | creation (EVM)                     | the source chain id                    |
| `rift_source_decimals`  | creation                           | the source token's decimals            |
| `rift_dest_decimals`    | creation                           | the destination token's decimals       |
| `rift_status`           | learned                            | the last Rift status seen              |
| `rift_amount_out`       | learned (`delivered` / `refunded`) | `amount_out`, formatted (below)        |
| `rift_payout_tx`        | learned (`delivered` / `refunded`) | `payout_tx`                            |

`rift_amount_out` is stored **formatted** in the token it was paid in, as `lifi_received_amount` is:
with `rift_dest_decimals` for a delivery and `rift_source_decimals` for a refund. It keeps the token's
full precision, so a refund never reads, rounded, as the whole amount sent. The decimals are
saved at creation because a disabled custom token's metadata may be gone by the time the order
settles. An amount that fails to parse or format is left out. The row then shows the destination
token's symbol with no received amount, as a LI.FI row does without its received pair; the quote's
estimate is not stored on the row.

With the shared display refs below, a row holds at most 16 refs, the backend's limit: a new ref
needs another to go.

The backend requires `rift_order_id` at creation, as it requires LI.FI's poll keys (`LIFI_REF_*`):
a row without it could never be polled.

Every row also carries, from creation, the **display refs every swap provider shares** (`amount`,
`usd_source_value`, `source_token_symbol`, `source_network_symbol`, `destination_token_symbol`,
`destination_network_symbol`), built as `toLifiCreationRefs` builds them, symbols truncated to the
backend's value limit. `ActiveUserTransactionItem.svelte` renders a row's amount, tokens and
networks from these refs, so a row stays readable across sessions and after its tokens are
disabled.

**Poller** (`lib/services/rift-active-tx.services.ts`, utils in `lib/utils/rift-active-tx.utils.ts`).
The poller runs for every non-terminal Rift row, whatever `RIFT_SWAP_ENABLED` says.

- Each row is read with one `GET /order/{rift_order_id}`, through the
  [limiter](#rest-client-no-sdk-no-new-dependency), one after another. An answer about another
  order is ignored. The last status seen is stored as `rift_status`, in the same write as any
  status change, so a terminal row is never written again.
- A tick (every 5 s, `ACTIVE_USER_TRANSACTIONS_POLL_INTERVAL_MILLIS`) reads at most
  `RIFT_MAX_ORDER_READS_PER_TICK` (3) rows, **least recently read first**. The other providers'
  pollers run in the same tick, so one provider's round must stay short.
- A 429 ends the round. The row that got it counts as read, so the next round starts with the rows
  this one did not reach, and no row keeps the others waiting, whether for its deposit or for Rift's
  rate limit.
- While the limiter holds requests back after a 429 (`isRiftRateLimited`), a round reads nothing.
- The loader runs the Rift round beside its tick, behind a guard of its own, rather than awaiting it
  inside the tick: a read that was already waiting for its turn when a 429 came in waits out the
  `Retry-After`, which must not hold back the other providers' pollers.

Status mapping (decided 2026-11-25):

| Rift                                 | AUT                                                                                            |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `awaiting_deposit`                   | no change (`Pending`); EVM: a reverted or replaced deposit → `Failed` (below)                  |
| `funded`, `executing`, `underfunded` | `Executing` (`underfunded` waits for Rift's refund)                                            |
| `delivered`                          | `Succeeded`; `rift_amount_out`, `rift_payout_tx` recorded                                      |
| `refunded`                           | `Failed`, `swap.error.swap_refunded`; refunded amount and `rift_payout_tx` recorded            |
| `expired`                            | `Failed`, `swap.error.rift_deposit_expired`                                                    |
| `frozen`                             | `Failed`, `swap.error.rift_order_frozen` (contact Rift support; the order id stays on the row) |
| network error, 404, unparseable      | no change                                                                                      |

- **An EVM deposit that never reaches Rift.** While the order is `awaiting_deposit`, or once Rift
  calls it `expired`, an EVM row's deposit is also read with `readEvmSourceTxOutcome` (from
  `rift_deposit_tx`, `rift_deposit_nonce` and `rift_deposit_chain_id`), as the NEAR Intents poller
  does, with a `confirmedNonceByChainId` of the Rift round's own, since the round runs beside the
  tick. A read that fails leaves the row to Rift's status. A mined deposit that reverted consumed its nonce but sent Rift nothing, and a
  replaced one never will. Mapped as `nearIntentsDepositOutcomeToUpdate` maps them:
  - `reverted` → `Failed`, `swap.error.failed_unexpectedly`;
  - `replaced` → `Failed`, `swap.error.swap_replaced_or_dropped`;
  - any other verdict leaves the row to Rift's status.

  The source chain's verdict names the cause, so it wins over Rift's `expired`.

- **`frozen` is a final `Failed`.** An operator's later delivery or refund will not show on the row.
  The balance refresh still picks the funds up.
- **A BTC deposit dropped before confirming** ends as Rift's `expired` after 7 days, as NEAR
  Intents' BTC deposits do.

**Loader and UI.**

- `LoaderActiveUserTransactions.svelte` gains a `tick` branch and a terminal-status branch firing
  `TRACK_COUNT_SWAP_SUCCESS` / `_ERROR` with `buildRiftSwapTrackingMetadata`. That metadata carries
  allow-listed categories only, never Rift's error text (invariant 4 in
  `docs/ai/frontend/analytics.md`).
- **Balances refresh at every terminal state, on both chains** (decided 2026-11-25). The BTC wallet
  is triggered (`waitAndTriggerWallet`). On the EVM side, the row's EVM token (resolved with
  `findTokenByBackendTokenId`, as LI.FI does) and that network's native gas token are reloaded
  through `reloadEthereumBalance`. A refund lands on the source chain and a delivery on the
  destination chain, so both sides are refreshed whatever the outcome.
- `ActiveUserTransactionItem.svelte`: Rift joins the `isSwap` list and the `providerName` chain.
  - A `Succeeded` row shows `rift_amount_out` of the destination token.
  - A refunded row shows `rift_amount_out` of the **source** token.
  - Both read the stored, formatted amount and need no token metadata.
  - Until then, or without `rift_amount_out`, the row shows the source amount and the destination
    token's symbol, as every swap row does.
  - Failure reasons are stored on the row, not displayed (precedent).

### i18n

New keys in `en.json`, the other locales and `i18n.d.ts`. The i18n types are generated
(`npm run i18n`), so each key lands in the PR that first uses it, never later:

- **PR 3** (presentation): `swap.text.you_receive_estimate`, `swap.text.rift_estimate_warning`,
  `swap.text.rift_route_via`.
- **PR 4** (execution and tracking): `swap.error.rift_quote_expired`,
  `swap.error.rift_order_refused`, `swap.error.rift_order_unverified`,
  `swap.error.rift_deposit_expired`, `swap.error.rift_order_frozen`,
  `swap.error.rift_order_in_flight`.

PR 6 adds no key. A refund reuses `swap.error.swap_refunded`; a reverted or replaced EVM deposit
reuses `swap.error.failed_unexpectedly` and `swap.error.swap_replaced_or_dropped`. Copy follows
`docs/ai/frontend/brand-and-copy.md`.

## Delivery plan

Each PR is atomic and updates `docs/ai/PRODUCT.md` when it changes behaviour.

1. **Backend:** the `Rift` AUT variant (`RiftData`), validation (amount, `rift_order_id` required),
   the one-row-per-order guard and tests; regenerate `backend.did`
   and the declarations.
2. **Frontend foundation:** `SwapProvider.RIFT`, `rift.env.ts` (`RIFT_SWAP_ENABLED = false`),
   `rift.rest.ts` and `rift.ts` types, `rift.utils.ts` asset ids (native ids pinned from a live call),
   the `swapService` stub, `swapProvidersDetails` entry and placeholder logo. No behaviour change.
3. **BTC → EVM quoting and presentation:** the `btcSwapProviders` entry (which also requires
   `BTC_SEND_VIA_BACKEND_ENABLED`), quote checks, offer mapping, cadence, `SwapDetailsRift`,
   `SwapRiftEstimateWarning`, the BTC fee row, their three [i18n keys](#i18n) and the widened gates.
   The flag is still `false`.
4. **BTC → EVM execution and tracking:** pre-send checks, `fetchRiftBtcSwap`, `SwapBtcWizard`
   dispatch, the poller and utils, loader and item branches, analytics and the error
   [i18n keys](#i18n). The flag becomes `LOCAL || STAGING`.
5. **Refactor:** an optional `beforeBroadcast` on `send` (`eth/services/send.services.ts`), with no
   behaviour change.
6. **EVM → BTC:** the `evmSwapProviders` entry with the BTC destination, `fetchRiftEvmSwap`,
   `SwapEthWizard` dispatch, EVM deposit refs and the nonce reconciliation in the poller.

After v1, in their own specs and PRs: the no-slippage form redesign, then the one-line production
flip, gated as in [Flag and env](#flag-and-env).

## Acceptance criteria

1. With `RIFT_SWAP_ENABLED` off, no Rift quote or order is requested and the Swap modal behaves
   exactly as before. Rift rows that already exist are still polled, refreshed at their terminal
   state and shown.
2. On staging, BTC → (ETH, cbBTC, USDC, … on Ethereum, Arbitrum, Base, Polygon, Robinhood Chain)
   shows a Rift offer when Rift has a route. EVM → BTC likewise. No Rift offer appears for Solana,
   BSC, ICP or XRP, or for any EVM ↔ EVM pair.
3. A Rift offer has no `receiveOutMinimum`, and changing the max slippage does not change it.
4. The provider sheet labels the amount as an estimate and shows no minimum. Review shows the Rift
   estimate warning while Rift is the selected offer, and only then.
5. A quote whose `from` / `to` / `amount_in` differ from the request, or that carries an integrator
   fee, is never shown.
6. At Swap, an expired quote, a refused order, or an order that fails any binding check stops with
   its error, and no transaction is signed.
7. Every order is created with `refund_address` set to the user's own source-chain address.
8. No deposit is broadcast without a Rift AUT row. A definitively refused broadcast leaves no row.
   A second attempt on an order that already has a row (a retry after an unclear broadcast, or a
   second tab) broadcasts nothing and leaves the existing row as it is. An attempt whose order no
   longer reads `awaiting_deposit` with no `deposit_tx` right before broadcast, or cannot be read,
   broadcasts nothing and leaves no row of its own.
9. Status mapping as in the table. A `delivered` row shows `amount_out`; a `refunded` row shows the
   refunded source amount; `frozen` and `expired` rows are `Failed` with their stored reason. An EVM
   deposit that reverted or was replaced turns its row `Failed` without waiting for the deposit
   deadline.
10. A Rift row shows its amount, tokens and networks from its shared display refs, and its delivered
    or refunded amount from `rift_amount_out`, in any session, even after its tokens are disabled.
11. At every terminal state, the BTC wallet, the swap's EVM token and that network's native token
    are refreshed.
12. A session never starts two Rift requests (quotes, orders and status reads together) less than
    one second apart, and a 429 stops every Rift request until `Retry-After` elapses. After a 429,
    the next poll round starts with the rows the cut round did not reach.
13. Analytics events carry no Rift error text, addresses or order ids beyond what the existing swap
    events carry.
14. No new npm dependency.

## Risks

- **No slippage protection.** A Rift swap can deliver much less than estimated. This is especially
  true for long-tail ERC-20s (any enabled ERC-20 is quoted, by decision) and for BTC sources, whose
  execution starts only after confirmations. The interim mitigation is disclosure. Production waits
  for the form redesign.
- **The deposit address is unverifiable.** A forged or wrong `POST /order` response could name any
  address. The binding checks cover every echoed field, but not the address itself.
- **Trust in Rift's TEE deployment**, with no third-party audit. An admin key can trigger refunds
  during an upgrade timelock.
- **Rate limit.** Keyless is 1 request/s, and whether it is per IP or global is not documented. A
  user with several open Rift rows plus quoting shares that budget through one limiter, so status
  updates and offers slow down; a 429 still degrades to "no update" or "no offer" until
  `Retry-After` elapses.
- **No testnet.** Every test is a mainnet swap with small amounts on a staging deploy.
- **`frozen` is final on the row** while Rift may still resolve it later.

## Non-goals

- Exact-output, limit orders and the OTC/RFQ venue as a separate product.
- A Rift help-page explorer entry (Rift publishes no order explorer).
- Showing per-leg progress (the API has none).
- Surfacing failure reasons on rows (a cross-provider change).

## Open questions (facts to confirm)

1. **CORS.** Resolved (2026-11-26): every origin is allowed (see
   [Background — Rift](#background--rift)). The browser check on staging still confirms it before
   the production flip.
2. **Native asset ids.** Resolved (2026-11-26): pinned from live quotes (see
   [Background — Rift](#background--rift)).
3. **Signed orders or TEE attestation.** Can Rift sign the order, or attest the `deposit_address`,
   so OISY can verify it? This is not a production gate.
4. **Rate limit and keys.** Is the keyless limit per IP or global? Can a key be restricted to
   origins?
5. **BTC confirmations and timing.** How many confirmations does Rift wait for, and what is the
   typical duration per direction?
6. **Minimums and `underfunded`.** What is the minimum per route? What does "far below" mean? What
   does the 422 body say for a too-small amount (to map it to `amount-too-low`)?
7. **Refund timeout window** and the typical time to a refund.
8. **`frozen` afterwards.** Does an operator's intervention move the order on to `delivered` /
   `refunded`, and how long are orders retrievable by `GET /order/{id}`?
9. **EVM deposit address.** Is it an EOA or a contract? A contract can need more than 21 000 gas
   for a native transfer, which the form's fee estimate must cover.

## Pending decisions (facts are clear — we just need to decide)

- **Copy** for `swap.text.rift_estimate_warning` and the stored error reasons. Product and legal
  wording; the intent is fixed above.
- **Logo**: the official asset from Rift, replacing the placeholder.

## Decisions (2026-11-25, 2026-11-26)

1. **Scope:** BTC ↔ EVM in v1, one PR per direction; EVM ↔ EVM later.
2. **Midway stop:** design for Rift's documented model (`delivered` in the destination token,
   `refunded` in the source token for less, `frozen`), with balances refreshed on both chains at
   every terminal state.
3. **Interim UX:** estimate only, disclosed. No minimum, max slippage ignored for Rift, an estimate
   label and a disclosure in the provider sheet and Review. The order is created from the reviewed
   quote.
4. **Trust:** bind every echoed order field and take the deposit address on Rift's word. Signed
   orders are an open question, not a production gate.
5. **AUT:** a new `Rift` backend variant; the row is created before the deposit is broadcast.
6. **End states:** `frozen` → `Failed` with a stored "contact Rift support" reason; `underfunded`
   stays `Executing`.
7. **Fee:** no OISY integrator fee; `integrator_id` only.
8. **API key:** a per-environment `VITE_RIFT_API_KEY` in the bundle with a keyless fallback; the
   production flip is gated on the key and CORS.
9. **Terms gate:** none (LI.FI precedent).
10. **Tokens:** any enabled ERC-20 on the five Rift networks, by contract address.
11. **Production timing:** after the no-slippage form redesign (`LOCAL || STAGING` through v1).
12. **Stalled tabs** (2026-11-26): the frontend re-reads the order right before broadcasting,
    rather than the backend keeping tombstones of used order ids.

## References

- Rift docs: https://www.rift.trade/docs (FAQ, Quickstart, Integrator fees, Token list, Get order
  status, Security model)
- Rift OpenAPI: https://www.rift.trade/docs/openapi.json
- Rift Terms: https://www.rift.trade/terms
- `2026-10-07-feat-lifi-swap-provider.md`: AUT ordering, the API key pattern
- `2026-11-02-feat-lifi-btc-source-swaps.md`: BTC through the backend, row before broadcast
- `2026-08-25-feat-near-intents-btc-swap.md`: deposit-address BTC source, BTC destination
- `2026-08-12-feat-ck-swap-provider.md`, `2026-08-25-feat-oisy-trade-swap-provider.md`: offers
  without slippage semantics
