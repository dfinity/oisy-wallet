# Spec: LI.FI becomes a swap provider

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Register **LI.FI** — a cross-chain swap and bridge aggregator — as a swap provider, so
its offers appear in the Swap modal next to Velora, NEAR Intents, 1Sec and Chain
Fusion: same token pickers, same quote list, same provider sheet, same review and
progress steps.

v1 covers two **source** categories:

- **EVM** (Ethereum, Arbitrum, BSC, Polygon, Base, Robinhood Chain) → EVM or Solana
  (EVM → Solana only through bridges whose Solana receiver can be verified; see
  [Calldata binding](#calldata-binding-evm-execution-time-quote)).
- **Solana** → Solana.

Every LI.FI swap is tracked by **Active User Transactions** (AUT) from the moment its
source transaction is broadcast, like Velora Market and NEAR Intents: the modal closes
once funds have left the wallet, and the global AUT poller drives the row to
`Succeeded` / `Failed`, surviving a closed tab or a re-login.

Behind a new feature flag, `LIFI_SWAP_ENABLED`, which is `LOCAL || STAGING` (and off in
unit tests) until a separate one-line PR enables it everywhere. That PR is gated on the
production key and the rate-limit check described under [API key](#api-key).

**Out of scope:**

- **BTC as a source.** See [Why BTC source is out](#why-btc-source-is-out).
- **BTC, XRP or ICP as a destination.** LI.FI has no ICP; BTC/XRP destinations can come
  later once the source side is proven.
- **Solana → EVM.** The EVM recipient inside a Solana bridge program's instruction
  cannot be verified client-side yet, so a forged `li.quest` response routed through an
  allow-listed bridge could send the funds elsewhere. It follows in a later PR with a
  per-bridge instruction decoder (see [Decisions](#decisions)).
- Multi-step routes (`/advanced/routes`). v1 uses `/quote` only — one signed source
  transaction per swap.
- LI.FI's gasless / Permit2 / EIP-2612 paths and Jito bundles.
- **Any integrator fee.** OISY charges nothing on LI.FI swaps; no `fee` parameter is
  sent and no fee wallet is configured. LI.FI's own fixed 0.25 % still applies and is
  shown in the provider sheet.
- Any change to existing providers' behaviour.

## Motivation

OISY's non-ICP swap liquidity today comes from two providers: Velora (same-chain EVM
only) and NEAR Intents (cross-chain, a curated token list). LI.FI aggregates dozens of
DEXes and bridges (Relay, Across, Stargate, Mayan, NEAR, Jupiter, OKX…), so it:

- adds a competing **same-chain** EVM quote next to Velora;
- adds **cross-chain EVM ↔ EVM and EVM → Solana** routes for tokens NEAR Intents does not
  list, and competes on price where both list them;
- adds **same-chain Solana** swaps (SPL ↔ SPL), which no provider offers today.

Because the quote fan-out already sorts every provider's result by receive amount, the
user gets the better price without any new UI concept.

## Background — how swap providers work today

Reference only; the integration recipe is the one Velora and NEAR Intents followed. Their
specs are not in the repository, so the precedent is the merged code: commits
`5a20eff6a` / `12dd69624` (NEAR Intents backend variant / frontend AUT), `78d5addbd` /
`0c53b9421` (Velora backend variant / frontend AUT) and `2a8128636` (Chain Fusion as a
swap provider), plus the spec `2026-08-25-feat-near-intents-btc-swap.md`.

### Registries and fan-out

- `SwapProvider` enum — `src/frontend/src/lib/types/swap.ts`. `SwapMappedResult` is a
  union discriminated by `provider`.
- One registry per **source** category in `src/frontend/src/lib/providers/`:
  `evm-swap.providers.ts` (Velora always on; others spread in behind their flag),
  `sol-swap.providers.ts` (NEAR Intents only). Each entry is
  `{ key, getQuote, isEnabled, getSupportedTokens?, getSupportedDestinations }`.
- `fetchSwapAmounts` (`lib/services/swap.services.ts`) routes to
  `fetchSwapAmountsEVM` / `fetchSwapAmountsSOL`, which run `Promise.allSettled` over
  enabled providers; `reduceSettledSwapResults` keeps fulfilled non-null results sorted
  by `receiveAmount` descending. Quotes refresh every
  `SWAP_AMOUNTS_PERIODIC_FETCH_INTERVAL_MS` (5 s).
- **Routing is by "either side is Solana", not by source.** `fetchSwapAmounts` sends
  every pair with Solana on either side — including **EVM → Solana** — to
  `fetchSwapAmountsSOL` / `solSwapProviders` (with the user's ETH address as
  `userAddress`); only EVM → EVM goes through `evmSwapProviders`. Execution, however,
  is by source: an EVM → Solana swap runs in `SwapEthWizard`.
- `fetchSwapAmounts` resolves the destination-chain recipient itself (the private
  `resolveSwapRecipientAddress`) and hands it to every provider's `getQuote` as
  `recipientAddress` (`EvmQuoteParams` / `NearIntentsQuoteParams` in `lib/types/swap.ts`).
- `swapService` in `lib/services/swap.services.ts` is `satisfies Record<SwapProvider, …>`
  — a new enum member needs an entry (a throwing stub, as for other non-ICP providers).
- `SUPPORTED_CROSS_SWAP_NETWORKS` (`lib/constants/swap.constants.ts`) is the static
  pre-filter of reachable destination networks per source network. EVM ↔ EVM/SOL and
  SOL → EVM/SOL are already present, so it needs **no change** for v1's routes.
- It is not the only gate, though. `crossChainSwapNetworks`
  (`lib/derived/cross-chain-networks.derived.ts`) and `allCrossChainSwapTokens`
  (`lib/derived/all-tokens.derived.ts`) include Solana networks / tokens only when
  `NEAR_INTENTS_SWAP_ENABLED` is on. That flag is hard-coded `true` today, but with NEAR
  Intents off and LI.FI on, Solana would vanish from both pickers. Both conditions become
  `NEAR_INTENTS_SWAP_ENABLED || LIFI_SWAP_ENABLED` (PR 2a).
- `swapProvidersDetails` (same file) holds `{ website, name, logo }`. Velora, Chain
  Fusion and OISY Trade keep their entry **unconditional**, because a tracked row can
  outlive the flag (`ActiveUserTransactionItem` reads the provider name from it); NEAR
  Intents and 1Sec are still flag-gated there. LI.FI follows the unconditional pattern.

### Execution

- Per-chain wizards with an if/else on `selectedProvider.provider`:
  `eth/components/swap/SwapEthWizard.svelte` (derived `isActiveTransactionSwap`,
  `isApproveNeeded`, `swapEmitsApprovalSteps`, then the dispatch chain) and
  `sol/components/swap/SwapSolWizard.svelte`, which today calls
  `fetchNearIntentsSolSwap` **unconditionally** — a provider dispatch must be added.
- **EVM**: `swap()` in `eth/services/swap.services.ts` takes a raw
  `TransactionParams { data, gas, value, chainId }` + `to`, signs it through the signer
  canister (threshold ECDSA, `signTransaction` in `lib/api/signer.api.ts`), broadcasts
  through `infuraProviders(networkId)`, registers the pending tx, and returns
  `{ hash, nonce }`. Velora Market already drives exactly this after `approve()`
  (`eth/services/approve.services.ts`) and an allowance poll. `infuraProviders` builds
  one provider per network in `SUPPORTED_EVM_NETWORKS`, Robinhood Chain included (its
  RPC is Alchemy-backed), so broadcasting works on all six chains.
- **Solana**: no swap provider signs a provider-built Solana transaction today (NEAR's
  Solana leg is a plain `sendSol` to a deposit address). The building blocks exist in
  the WalletConnect flow: `decodeTransactionMessage`
  (`sol/utils/sol-transactions.utils.ts`), `signTransaction` (`sol/utils/sol-sign.utils.ts`,
  threshold Schnorr over the message bytes), `sendSignedTransaction`
  (`sol/services/sol-send.services.ts`). See [Solana execution](#solana-execution).

### Active User Transactions

- Backend: `ActiveUserTransactionData` in `src/shared/src/types/active_user_transaction.rs`
  — append-only enum, one variant per provider, immutable payload; learned-mid-flow
  values go in `external_refs` (≤ 16 keys, key ≤ 32 chars, value ≤ 256 chars).
  Validation in `validate_data` (`src/backend/src/active_user_transactions/model.rs`).
  Status `Pending → Executing → Succeeded | Failed`, forward-only; **terminal states
  are immutable**, so a wrong verdict is permanent.
- Frontend: `createActiveUserTransaction` / `applyActiveUserTransactionPollUpdate`
  (`lib/services/active-user-transactions.services.ts`); per-provider
  `*-active-tx.utils.ts` (type guard, `to*Data`, ref keys, display refs, status mapper,
  tracking metadata) and `*-active-tx.services.ts` (poller); one `tick` branch and one
  terminal-status branch in `lib/components/loaders/LoaderActiveUserTransactions.svelte`;
  one branch in `ActiveUserTransactionItem.svelte`.
- Row creation is **best effort, after the point of no return** (the broadcast), with
  try/catch + `consoleError`, exactly as Velora Market and NEAR Intents do.

## Background — LI.FI

Verified against docs.li.fi, the `@lifi/sdk` 4.11.0 tarball, LI.FI's
`lifinance/contracts` deployment files and live `li.quest/v1` calls (2026-10-07).

- **Chains.** All six OISY EVM mainnets are supported (1, 42161, 56, 137, 8453, 4663 —
  Robinhood Chain). Solana's LI.FI chain id is `1151111081099710`; Bitcoin's is
  `20000000000001`. ICP is not supported.
- **LI.FI Diamond** (the call target and ERC-20 spender), from
  `lifinance/contracts/deployments/<chain>.json`:
  - Ethereum, Arbitrum, BSC, Polygon, Base: `0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE`
  - Robinhood Chain: `0xB477751B76CF82d00a686A1232f5fCD772414Af3`
- **`GET /v1/quote`** — best single-step route with a ready `transactionRequest`.
  Required: `fromChain`, `toChain`, `fromToken`, `toToken`, `fromAddress`,
  `fromAmount`. Relevant optional: `toAddress` (**must** be set when the destination
  chain's address format differs — it defaults to `fromAddress`), `slippage`
  (decimal: `0.005` = 0.5 %), `integrator`, `order`, `denyBridges`, `denyExchanges`,
  `skipSimulation`.
- **Quote response.** `estimate`: `fromAmount`, `toAmount`, `toAmountMin`,
  `approvalAddress`, `executionDuration` (s), `gasCosts[]`, `feeCosts[]` (LI.FI's fixed
  **0.25 %** fee); `tool` (the bridge/exchange key); `transactionId`.
  - EVM `transactionRequest`: `{ to, data, value, from, chainId, gasLimit, gasPrice }`
    — hex strings except `chainId`, which is a number; legacy `gasPrice`, no EIP-1559
    fields.
  - Solana `transactionRequest`: `{ data }` — a base64 **v0 versioned transaction**,
    fee payer = `fromAddress`, the only required signer (one empty signature slot), and
    a **recent blockhash already set** (≈ 60–90 s lifetime). `data` can also be an
    **array** (a Jito bundle) for partner-enabled integrators; OISY rejects that shape.
- **Simulation.** By default LI.FI simulates the route against `fromAddress`. On live
  calls a route that would fail (e.g. no ERC-20 allowance yet, insufficient balance)
  returned no quote; the docs themselves only promise that an unsimulated quote's
  `gasLimit` is inaccurate. `skipSimulation=true` turns the simulation off. OISY never
  relies on LI.FI's simulation to refuse a reverting route: its own `eth_estimateGas` on
  the execution quote does that (see [EVM execution](#evm-execution)).
- **Approvals.** ERC-20 sources need an allowance to `approvalAddress`. Native needs
  none. Exact-amount approve is what LI.FI's own SDK does on the non-Permit2 path.
- **`GET /v1/status`** — `txHash` (source tx hash, receiving hash or `transactionId`),
  `fromChain`, `toChain`, `bridge` (= `tool`). Statuses: `NOT_FOUND`, `INVALID`,
  `PENDING`, `DONE`, `FAILED`. Substatuses: `PENDING` →
  `WAIT_SOURCE_CONFIRMATIONS`, `WAIT_DESTINATION_TRANSACTION`, `BRIDGE_NOT_AVAILABLE`,
  `CHAIN_NOT_AVAILABLE`, `REFUND_IN_PROGRESS`, `UNKNOWN_ERROR`; `DONE` → `COMPLETED`,
  `PARTIAL` (a different token was received, "full value"), `REFUNDED`. Response
  carries `sending` / `receiving` `{ txHash, amount, token, chainId }`,
  `substatusMessage`, `lifiExplorerLink`. Works for same-chain swaps too.
  `NOT_FOUND` is **not** evidence of failure — reconcile on the source chain.
- **Auth and limits.** `x-lifi-integrator` header is mandatory; `x-lifi-api-key`
  optional. Keyless: 75 quote requests / 2 h per IP. With a key: 100 requests / min.
  LI.FI's docs advise against exposing the key client-side.
- **Errors.** No route / amount below a bridge's minimum → `404` "No available quotes
  for the requested transfer". There is no single documented minimum.

### Why BTC source is out

Verified on a live BTC → ETH quote (tool `near`): LI.FI does not hand back a deposit
address; `transactionRequest.data` is a hex PSBT (`psbt\xff…`) with one input (a UTXO
LI.FI selected from `fromAddress`, RBF on) and outputs
`[deposit 997 500 sats, OP_RETURN "=|lifi…", change, LI.FI fee 2 500 sats]`, with
LI.FI setting the miner fee. LI.FI permits a self-built transaction only if that output
order, the memo, and the fee output(s) are replicated exactly and the change is above
dust. The signer canister's `sendBtc` takes plain
`{destination_address, sent_satoshis}` outputs and cannot emit `OP_RETURN`; the only
PSBT signing code is WalletConnect's, which never finalizes or broadcasts. OISY would
need PSBT signing lifted out of the WalletConnect service, finalization/extraction, a
raw-tx broadcast path and pending-UTXO locking for UTXOs it did not select — or
`OP_RETURN` support in the signer canister. That is its own spec.

## Design

### SDK: core `@lifi/sdk` for data, our own signing for execution

**New dependency: `@lifi/sdk` (core only), approved.** Its only runtime dependency is
`@lifi/types`; the action functions (`getQuote`, `getStatus`) are tree-shakable thin
`fetch` wrappers.

It provides typed `LiFiStep` / `StatusResponse` / substatus unions from `@lifi/types`;
integrator / API-key / SDK-version headers; parameter validation; route-option
defaults set once in `createClient`; `AbortSignal` support; and typed `SDKError` /
`HTTPError`, so the "no available quotes" 404 is recognisable. It mirrors how Velora is
used: the SDK for quoting, OISY's own signer and RPC for execution.

**Not used:** `executeRoute` and the provider packages (`@lifi/sdk-provider-ethereum`,
`-solana`, `-bitcoin`). They assume a viem wallet client / a wallet-standard Solana
wallet, keep route state in memory (it would not survive the modal closing, which AUT
requires), bypass OISY's nonce, fee, pending-tx and progress-step plumbing, default to
Permit2 / EIP-712 signing and Jito bundles, and pull a second `@solana/kit` version
(viem is already a runtime dependency, so it is not part of the cost).

One module-level client in `lib/rest/lifi.rest.ts` (the layer NEAR Intents' REST calls
live in), wrapping `getQuote` / `getStatus`:

```ts
createClient({
	integrator: LIFI_INTEGRATOR,
	apiKey: LIFI_API_KEY,
	disableVersionCheck: true, // createClient reads process.env.NODE_ENV otherwise
	preloadChains: false, // avoid an eager /chains fetch at import time
	routeOptions: {
		bridges: { deny: LIFI_DENY_BRIDGES },
		exchanges: { deny: LIFI_DENY_EXCHANGES }
	}
});
```

### Env

New `src/frontend/src/env/rest/lifi.env.ts`, modelled on `near-intents.env.ts`:

- `LIFI_SWAP_ENABLED = (LOCAL || STAGING) && !TEST` (feature tests switch it on).
- `LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY` — see [API key](#api-key).
- `LIFI_INTEGRATOR = import.meta.env.VITE_LIFI_INTEGRATOR` — the integrator id
  registered with LI.FI. `createClient` throws without one, so the client is created
  lazily on first use, and while the variable is unset the LI.FI provider returns no
  quote instead of failing at import time.
- `LIFI_DIAMOND_ADDRESSES: Record<NetworkId, EthAddress>` — the six Diamonds listed in
  [Background — LI.FI](#background--lifi), pinned from LI.FI's deployment files, never
  from a quote.
- `LIFI_DENY_BRIDGES: string[] = []` and `LIFI_DENY_EXCHANGES: string[] = []` — LI.FI's
  full tool set is allowed; these exist so a misbehaving bridge or exchange can be
  blocked with a one-line change (keys from LI.FI's `/tools`).

### API key

The key and the integrator id ship in the client bundle as `VITE_LIFI_API_KEY` and
`VITE_LIFI_INTEGRATOR`, exactly like `VITE_INFURA_API_KEY`: both are added (empty) to
`.env.example` and `.env.test`, and to the CI secret plumbing in
`.github/workflows/deploy-to-environment.yml` (a restricted path — the implementer asks
before editing it). Their values are set outside the repository.

Shipping the key in the bundle is acceptable because each key is **scoped to an origin
allow-list registered on LI.FI's partner portal**, and staging and production use
**separate keys** (`VITE_LIFI_API_KEY_STAGING` / `_BETA` / production, mirroring the
Infura secrets). A key extracted from the staging bundle is rejected from any other
origin and cannot touch production's quota.

The flag-flip PR is gated on two items that are still open; see
[Open questions](#open-questions).

### Quoting

New `fetchLifiSwapQuote` in `lib/services/lifi-swap.services.ts`, registered in both
`evmSwapProviders` and `solSwapProviders` behind `LIFI_SWAP_ENABLED`, with a LI.FI-specific
`getSupportedDestinations` (see [Destination support](#destination-support)). The EVM
entry has no `getSupportedTokens`, like Velora: LI.FI covers effectively every token on
its chains, and a route that does not exist simply returns no quote. The Solana entry's
source list is a separate concern, covered below.

Because of the routing described in [Registries and fan-out](#registries-and-fan-out),
the two entries split the routes like this:

- `evmSwapProviders` entry — EVM → EVM.
- `solSwapProviders` entry — EVM → Solana and Solana → Solana. Its `getQuote` therefore
  receives both EVM and Solana sources and maps the chain id and token address from the
  source token's network, not from the registry it sits in. A Solana source with an EVM
  destination returns `undefined` (Solana → EVM is out of scope).

Until `SwapSolWizard` can execute a LI.FI quote ([Solana execution](#solana-execution)),
the `solSwapProviders` entry returns `undefined` for a **Solana source**, so it only
offers EVM → Solana. Otherwise a LI.FI Solana-source offer could be shown and selected
while `SwapSolWizard` still sends every swap to `fetchNearIntentsSolSwap`. PR 3 lifts
that restriction (for Solana → Solana only) together with the wizard dispatch (see
[Delivery plan](#delivery-plan)).

The same restriction has to hold on the **source picker**, which is computed separately
from quotes and destinations. `resolveProviderGroup`
(`lib/services/swap-supported-tokens.services.ts`) treats an entry without
`getSupportedTokens` as a source-side wildcard for its registry's category, and
`aggregateCategory` then drops that category's coverage from `all` to `some`, after which
`filterSwapTokens` lets every enabled token through. Today the Solana category is NEAR
Intents alone, with a list, so only NEAR-listed Solana tokens are selectable as sources.
Registering the LI.FI Solana entry without a list would make every enabled SPL token
selectable while LI.FI still refuses Solana sources, and the user would pick a token no
provider quotes. So until PR 3 the Solana entry declares
`getSupportedTokens: () => Promise.resolve(new Set())`: an empty list contributes nothing
to the union and keeps the category's coverage at `all`, so the source picker is exactly
what it is today. PR 3 removes the `getSupportedTokens` entirely (the wildcard is then
intended: LI.FI quotes any SPL token) in the same change that lifts the quote and
destination restrictions. The EVM entry needs no such guard, because Velora is already a
wildcard for the EVM category.

Solana-source quotes pass `allowExchanges` limited to `LIFI_SOLANA_ALLOWED_EXCHANGES`, the
LI.FI tool keys of the aggregators that execution can bind: those with pinned
instructions and a minimum-output decoder (see
[Solana transaction binding](#solana-transaction-binding-execution-time-quote)). v1 is
`['jupiter']` (the key LI.FI's `/tools` lists). Without it, LI.FI could display an OKX or
DFlow route that would always abort at execution. The list and
`LIFI_SOLANA_ALLOWED_INSTRUCTIONS` change together, as `allowBridges` and the curated
bridge facets do on EVM.

- Maps OISY network → LI.FI chain id (EVM: the network's `chainId`; Solana mainnet →
  `1151111081099710`). Non-mainnet networks → `undefined` (no quote).
- Token address: ERC-20 / SPL address; native EVM →
  `0x0000000000000000000000000000000000000000`; native SOL →
  `11111111111111111111111111111111`.
- `fromAddress` = the user's source-chain address (`userAddress`); `toAddress` = the
  `recipientAddress` quote param (already resolved by `fetchSwapAmounts`), falling back
  to `userAddress` when absent, as other providers do — always passed explicitly to
  LI.FI.
- `slippage` = OISY's slippage percentage / 100.
- `order: 'CHEAPEST'`.
- **`skipSimulation: true`** for every form-time quote. Display quotes must not vanish
  because an ERC-20 has no allowance yet or the user is mid-typing. The quote fetched
  right before signing is simulated (see [EVM execution](#evm-execution),
  [Solana execution](#solana-execution)); on EVM, though, what actually refuses a
  reverting route before anything is signed is OISY's own `eth_estimateGas` on the
  checked transaction, not LI.FI's simulation, whose no-quote-on-failure behaviour the
  docs do not promise (see [Background — LI.FI](#background--lifi)).
- Returns `undefined` on any error (Velora's convention), including the 404 "no
  available quotes" (not `SwapAmountTooLowError`, since LI.FI does not tell us the
  minimum). Fires `PLAUSIBLE_EVENTS.SWAP_OFFER` like Velora.
- **Mapped result**: new `SwapMappedResult` arm
  `{ provider: SwapProvider.LIFI, receiveAmount: toAmount, receiveOutMinimum: toAmountMin, swapDetails: LiFiStep, … }`
  with the estimated duration and fees from `estimate`.

#### Destination support

`buildSymmetricSupportedDestinations` (Velora's resolver) cannot be reused. It returns
`undefined` for a source outside its own category, and its `{}` wildcard is credited
only to the registry's `sourceCategory` (`computeReceiveSupportedTokens` in
`lib/utils/swap-tokens-filter.utils.ts`). With it, the two entries would advertise only
EVM → EVM and Solana → Solana, and every cross-category destination would vanish from
the picker.

Two changes fix that:

- **Per-category wildcard.** `SwapCategorizedTokenIds` (`lib/types/swap.ts`) widens to
  `Partial<Record<SwapTokenCategory, Set<string> | 'any'>>`. In
  `computeReceiveSupportedTokens`, an `'any'` entry bumps that category's `total` only,
  exactly as `{}` does for the source category today, so the category falls back to
  the `some` / `none` coverage rules (every enabled token is offered). A `Set` entry is
  unchanged, and so is `{}`. Existing resolvers only ever produce `Set`s.
- **LI.FI resolver** `buildLifiSupportedDestinations(registry: 'evm' | 'sol')` in
  `lib/utils/lifi-swap.utils.ts`. It resolves the source with `resolveSwapTokenLookup`
  and returns `undefined` for anything that is not a mainnet EVM or Solana token.
  Otherwise it returns the destinations that entry actually quotes:

  | Entry              | EVM source       | Solana source                |
  | ------------------ | ---------------- | ---------------------------- |
  | `evmSwapProviders` | `{ evm: 'any' }` | `undefined`                  |
  | `solSwapProviders` | `{ sol: 'any' }` | `{ sol: 'any' }` (from PR 3) |

  Until PR 3, the `solSwapProviders` entry returns `undefined` for a Solana source and
  declares an empty source list, matching the quote restriction above.

#### Cadence: on input change, then every 30 s

LI.FI does not ride the shared 5 s refresh. `fetchLifiSwapQuote` keeps a single
module-level cache entry `{ key, result, fetchedAt }`, where `key` is the serialised
request (chains, tokens, amount, both addresses, slippage):

- a different key (any input change) fetches immediately and replaces the entry;
- the same key returns the cached mapped result while it is younger than
  `LIFI_QUOTE_REFRESH_INTERVAL_MS = 30_000`, and re-fetches after that;
- an in-flight request for the same key is shared, not duplicated.

The other providers keep refreshing every 5 s; the fan-out is unchanged. A cached
quote is only ever **displayed** — execution always re-quotes — so a 30 s-old price is
never signed. The execution re-quote **never goes through the cache**: it calls the REST
wrapper directly (not `fetchLifiSwapQuote`), neither reads nor writes the cache entry,
and does not join an in-flight form request. Relying on the cache key would not be
enough, because the key does not include `skipSimulation`, so an unsimulated display
quote could otherwise come back as the "fresh simulated" one.

No provider caches or throttles its quotes today (every provider is re-quoted on each
5 s tick; `SwapAmountsContext.svelte` only debounces and guards with
`fetchGeneration`). The closest precedents are the module-level token cache in
`lib/services/near-intents.services.ts` (`cachedTokens` + a `clear…Cache` test seam)
and the time-based throttle maps in `lib/services/onesec-swap.services.ts`. Follow that
shape (module-level state + an exported reset for tests) and, per the
[meta-update rule](../../governance.md#meta-update-rule), record the per-provider quote
cache pattern in `docs/ai/frontend/reusability.md` in the same PR.

The SDK's `getQuote` mutates the params object it receives (it fills `integrator`,
`order`, deny lists… in place), so the cache key is serialised from OISY's own request
**before** the call, and the SDK gets a fresh object.

#### Coexistence with Velora

Same-chain EVM swaps get both a Velora and a LI.FI offer. No special-casing: both
compete in the fan-out sorted by receive amount and the better one is pre-selected, as
with every other overlapping provider pair.

### Quote trust checks

Unlike NEAR Intents, LI.FI quotes are not signed. A compromised or MITM'd response
could name an arbitrary spender or call target. Every quote — form-time and
execution-time — passes `assertLifiQuote` before it is shown or acted on:

- **EVM**: `transactionRequest.to` and `estimate.approvalAddress` both equal
  `LIFI_DIAMOND_ADDRESSES[sourceNetworkId]`; `transactionRequest.chainId` (a **number**,
  unlike the hex-string fields) equals the source network's chain id;
  `transactionRequest.from` equals the user's address; `value` (hex, compared as a
  `bigint`) is `0` for an ERC-20 source and `fromAmount` for a native one.
- **Solana**: `transactionRequest.data` is a single base64 string (an array — a Jito
  bundle — is rejected); the decoded transaction's fee payer is the user's address and
  it requires no signer other than the user.
- **Echo**: `action.fromChainId`, `action.toChainId`, `action.fromToken.address`,
  `action.toToken.address`, `action.fromAmount` and `action.toAddress` equal what OISY
  asked for.

EVM addresses (`to`, `approvalAddress`, `from`, EVM token addresses, an EVM
`toAddress`) are compared **case-insensitively**: LI.FI may return checksummed or
lower-case hex regardless of what was sent. Solana addresses are base58 and compared
exactly. Chain ids are compared as numbers and amounts as `bigint`s.

A failed check means "no quote" at quote time and an aborted swap at execution time.

These checks bind the call **target**, not what the call **does**. The echo comes from the
same unsigned response as `transactionRequest.data`, so a forged response can echo the
expected request while its calldata names a different token, amount, recipient or minimum
output, and the Diamond holds the allowance needed to act on it. The quote that is about
to be signed therefore also passes a semantic check of the bytes themselves.

#### Calldata binding (EVM, execution-time quote)

`assertLifiEvmCalldata` decodes `transactionRequest.data` with the Diamond's own
`CalldataVerificationFacet`, which is registered on every pinned Diamond (Ethereum,
Arbitrum, BSC, Polygon and Base at `0x7A5c119ec5dDbF9631cf40f6e5DB28f31d4332a0`, Robinhood
Chain at `0xa5498A7a05A0C71b05e27B8558ccE13120B01387`, per `lifinance/contracts`
deployments). Its extractors are `pure`, so they run as an `eth_call` to the pinned
Diamond through `infuraProviders(networkId)`, with no gas and no signature. Only that facet's
ABI is needed, built with `Interface` from `ethers/abi` (as `approve.services.ts` does).
Any revert, or a selector the facet cannot decode, aborts the swap (fail closed).

**The selector is pinned first.** The facet's extractors decode arguments without
checking which Diamond function the calldata calls: `extractGenericSwapParameters`
decodes every selector other than the three `swapTokensSingleV3*` ones with the V1
generic-swap layout, and `extractData` reads the first argument as `BridgeData` whatever
the function. A forged response could therefore call a function whose real semantics
differ while arranging its bytes to decode as the expected token, amount and recipient.
So before any decode, `data.slice(0, 10)` must be in a pinned selector list for the
route kind, and any other selector aborts:

- `LIFI_GENERIC_SWAP_SELECTORS` — the `GenericSwapFacetV3` single/multi swap functions
  and `GenericSwapFacet.swapTokensGeneric`, the only functions same-chain routes use.
- `LIFI_BRIDGE_SELECTORS` — the `startBridgeTokensVia*` / `swapAndStartBridgeTokensVia*`
  functions of the bridge facets OISY allows, each taking `BridgeData` as its first
  argument. Selectors are computed from the facet ABIs in `lifinance/contracts` and
  pinned in `lifi.env.ts` next to the Diamonds, never taken from a quote. A bridge not in
  the list gets no quote at execution time (the same outcome as a denied tool), so
  `LIFI_DENY_BRIDGES` and this list are kept consistent.
- `LIFI_NON_EVM_RECEIVER_SELECTORS` — the subset of `LIFI_BRIDGE_SELECTORS` that may be
  used for a **Solana destination** (see below).

**Bridges are curated, and each one's effective receiver is decoded.** `bridgeData.receiver`
is not always the address the bridge pays: some facets carry the receiver again in their
bridge-specific data, and that copy is what the bridge consumes (Across V4's
`AcrossV4Data.receiverAddress`, for example). A forged response could keep
`bridgeData.receiver` equal to the user while setting the effective receiver to an
attacker. So `LIFI_BRIDGE_SELECTORS` holds **only** facets for which `lifi-swap.utils.ts`
has a pinned ABI and a decoder for the bridge-specific struct, and every receiver-like
and refund field in it must equal the user (an EVM address left-padded to `bytes32`, or
the user's Solana key). v1 starts with:

| Facet              | Fields bound to the user (bridge-specific data)          |
| ------------------ | -------------------------------------------------------- |
| `AcrossFacetV4`    | `receiverAddress`, `refundAddress`                       |
| `NEARIntentsFacet` | `nonEVMReceiver` (Solana destination), `refundRecipient` |
| `MayanFacet`       | `nonEVMReceiver` (Solana destination), `refundRecipient` |

The field names are taken from `lifinance/contracts` `src/Facets/*.sol` (re-checked
2026-10-09: `AcrossV4Data` starts with `receiverAddress`, `refundAddress`;
`NEARIntentsData` starts with `nonEVMReceiver` and carries `refundRecipient`; `MayanData`
starts with `nonEVMReceiver` and carries `refundRecipient`, and the facet itself reverts
unless the receiver it parses out of `protocolData` equals `nonEVMReceiver` /
`bridgeData.receiver`). The implementer still re-reads each struct before pinning the
decoder, and adds a test per facet built from a real LI.FI calldata fixture. Adding a
bridge later means adding its decoder, fixture and tool key together. Every other bridge
gets no quote: the display quote passes `allowBridges` limited to the curated tool keys,
so the form never offers a route that execution would refuse.

Not every Diamond carries all three facets. Robinhood Chain's deployment file lists
`AcrossFacetV4` but neither `MayanFacet` nor `NEARIntentsFacet` (checked 2026-10-09), so
the curated set — the pinned selectors and the `allowBridges` keys the display quote
sends — is kept **per Diamond** in `lifi.env.ts`, and EVM → Solana from Robinhood Chain is
Across-only until LI.FI deploys the other facets there.

Then the decoded values are compared with the request. For **every** route, the full
`SwapData[]` is bound, not just its first entry: the Diamond's `LibAsset.depositAssets`
pulls `fromAmount` of `sendingAssetId` from the user for **each** entry with
`requiresDeposit = true`, so a forged later entry could pull another asset the user has
already approved to the Diamond. `swapData[0]` (when present) must have
`requiresDeposit = true` with the source token and `fromAmount`; every later entry must
have `requiresDeposit = false`. Cross-chain routes get the array from `extractData`;
same-chain routes decode it locally with the pinned GenericSwap ABI (the selector is
already pinned, so the layout is known), because `extractGenericSwapParameters` returns
only aggregates.

**Every swap call in `SwapData[]` is bound too, not only its deposit flag.** The Diamond
executes each entry's `callTo` with `callData` (after approving `approveTo`), so a forged
quote could append a call with side effects unrelated to the bound deposit. Decoding
every DEX's payload client-side is not practical, so the binding has two layers:

- **LI.FI's on-chain allow-list is the trust anchor, checked before signing.** The
  Diamond refuses any swap call whose `(callTo, selector)` is not whitelisted
  (`LibAllowList.contractSelectorIsAllowed` in `SwapperV2` and `GenericSwapFacetV3`,
  `lifinance/contracts`). OISY checks the same thing first: for each entry,
  `isContractSelectorWhitelisted(callTo, callData[0:4])` (and for `approveTo` when it
  differs from `callTo`, as LI.FI's own check does) through `WhitelistManagerFacet` on
  the pinned Diamond, as an `eth_call`. Any `false` aborts. This turns an on-chain
  revert into a pre-signing refusal and makes the trust explicit: OISY trusts LI.FI's
  whitelist governance, not the unsigned quote.
- **No call can target a token or the Diamond.** Whitelisted calls run with the Diamond
  as `msg.sender`, so the only user funds they could reach are the user's allowances to
  the Diamond. Each entry's `callTo` and `approveTo` must differ from the Diamond and
  from every `sendingAssetId` / `receivingAssetId` in the route, and must not be any
  ERC-20 the user holds on that network (no `transferFrom(user, …)` through the
  Diamond).
- **A leftover allowance cannot be pulled outside a bound call.** `approve()` keeps its
  existing "at least" semantics (see [EVM execution](#evm-execution)), so the Diamond may
  hold an allowance larger than `fromAmount`, or one for a different token left by an
  earlier aborted LI.FI swap (no revoke is sent on abort), exactly as Velora Market
  leaves today. The Diamond only moves user funds inside `LibAsset.depositAssets` of a
  call the user signs, and that call's `SwapData[]` is bound above to deposit exactly
  `fromAmount` of the source token and nothing else. Any other pull would need a
  token-contract call, which the whitelist and the rule above both exclude. Pinning the
  allowance to the exact amount would add nothing the binding does not already give,
  at the cost of an extra reset transaction and a second allowance read.

- **Same-chain** (`fromChainId === toChainId`): `extractGenericSwapParameters(data)`.
  `sendingAssetId` equals the source token, `amount` equals `fromAmount`, `receiver`
  equals `toAddress`, `receivingAssetId` equals the destination token, and
  `receivingAmount` (the on-chain `minAmountOut`) is at least the displayed quote's
  `toAmountMin`.
- **Cross-chain**: `extractData(data)` → `(bridgeData, swapData[])`.
  - `bridgeData.hasDestinationCall` is `false`. v1 has single-step routes only, and a
    destination call can forward funds anywhere.
  - `bridgeData.destinationChainId` equals the LI.FI destination chain id.
  - The input is the user's: with `hasSourceSwaps`, `swapData[0].sendingAssetId` and
    `swapData[0].fromAmount`; without, `bridgeData.sendingAssetId` and
    `bridgeData.minAmount`. Either pair equals the source token and `fromAmount`.
  - The recipient is the user's, both in `bridgeData` and in the facet's own data (see
    the curated table above). For an EVM destination, `bridgeData.receiver` equals
    `toAddress`. For a Solana destination, `bridgeData.receiver` equals LI.FI's
    `NON_EVM_ADDRESS` sentinel (`0x11f111f111f111F111f111f111F111f111f111F1`, declared in
    `src/Helpers/LiFiData.sol`, the base every facet inherits — not in `LibAsset` or
    `ILiFi`, where a reader would look first), and
    `extractNonEVMAddress(data)` equals the user's Solana address as 32 bytes (the
    base58-decoded public key).
  - `extractNonEVMAddress` is only meaningful for facets whose bridge-specific data
    starts with the `bytes32` non-EVM receiver — per the facet's own NatSpec, Mayan,
    NEARIntents and AcrossV4. For others (Chainflip, Eco, DeBridgeDln, Garden, Glacis,
    AllBridge, PolymerCCTP…) the 32 bytes it returns are some other field, which a forged
    response could set to the user's key while the real receiver is elsewhere. So an
    EVM → Solana route is signed only when the selector is in
    `LIFI_NON_EVM_RECEIVER_SELECTORS` (those three facets' functions). Other EVM →
    Solana routes abort at execution and, to avoid offering what cannot be executed,
    the display quote for an EVM → Solana pair passes `allowBridges` limited to those
    facets' tool keys. This narrows EVM → Solana coverage (AllBridge, Chainflip, Glacis
    and Eco also serve Solana) in exchange for a recipient check that actually binds.

Native tokens are `0x0000000000000000000000000000000000000000` on both sides of the
comparison. Addresses are compared case-insensitively and amounts as `bigint`s.

The bridge leg's minimum output lives in bridge-specific data that the facet does not
expose, so it cannot be bound client-side. What remains is a forged route that pays the
user's own address too little through a real bridge. That is bounded by `fromAmount` and
listed under [Risks](#risks). It can no longer redirect funds to someone else.

This runs on the execution-time quote only. A display quote is never signed, and the
execution quote is the one whose bytes are broadcast.

#### Solana transaction binding (execution-time quote)

Fee payer and signer checks alone do not stop a forged transaction from also moving the
user's funds elsewhere, since every instruction is signed by the user. Before signing,
`assertLifiSolTransaction` simulates the exact bytes with `simulateSolTransaction`
(`sol/services/sol-simulation.services.ts`, the WalletConnect review's helper), and
treats its `undefined` (timeout or RPC failure) or an `err` as an abort. It is
best-effort for WalletConnect, but fail-closed here.

**The original blockhash is kept.** `simulateTransactionAccounts`
(`sol/api/solana.api.ts`) always passes `replaceRecentBlockhash: true`, which suits
WalletConnect (it re-signs with a fresh blockhash anyway) but would let a stale LI.FI
transaction pass simulation and then be rejected at broadcast. The API helper and
`simulateSolTransaction` gain a `replaceRecentBlockhash` option, defaulting to `true` so
WalletConnect is unchanged; LI.FI passes `false`, so the RPC simulates the exact bytes
with their own blockhash, and an expired one comes back as an `err`
(`BlockhashNotFound`) and aborts.

The result must show all of the following:

- `preview.controlChanges` is empty. No owner, delegate or close-authority change on any
  user account. An absent `preview` (the run changed nothing the user owns) passes this
  check but fails the receipt check below.
- **Accounts the transaction creates have safe authorities.** `controlChanges` only
  diffs accounts that existed before the run: `controlChanges` in
  `sol/utils/sol-simulation.utils.ts` returns nothing when `pre` is absent, by design
  for the WalletConnect review. A forged transaction could therefore create the user's
  destination token account, credit it enough to pass the receipt check, and leave an
  attacker as its `delegate` or `closeAuthority` (the user signs every instruction, so
  an `Approve` / `SetAuthority` in the same transaction is valid). So every user-owned
  token account with no pre-state must end the run with `owner` = the user, no
  `delegate`, and `closeAuthority` absent or equal to the user. The preview does not
  expose post-state authorities today, so `mapSolSimulationPreview` gains a
  `createdAccounts: { account, owner, delegate?, closeAuthority? }[]` field (post-state
  of user-owned accounts with no pre-state), filled from the same parsed states.
  WalletConnect ignores the field, so its review is unchanged.
- **No pre-existing user account is closed.** The same mapper also returns no
  `controlChanges` when `post` is absent, an empty token account closed by the run
  reports no token delta, and its rent lamports go to whatever destination the
  `CloseAccount` names; only the fee payer's own lamports count toward `solDelta`. A
  forged transaction could therefore close the user's empty token accounts and send their
  rent elsewhere while passing every bound above. So the preview gains a
  `closedAccounts: SolAddress[]` field (user-owned accounts with a pre-state and no
  post-state), and it must be empty. Accounts the transaction both creates and closes (a
  temporary wSOL account) have no pre-state and are not listed. A route that closes one
  of the user's existing accounts (for example, unwrapping into a pre-existing wSOL ATA)
  is refused: fail closed, at the cost of those rare routes.
- **Every top-level instruction is pinned.** A program allow-list alone is not enough:
  `SOLANA_KNOWN_PROGRAM_ADDRESSES` includes stateful DEX programs (Whirlpool, Raydium
  CLMM…), and a forged transaction could append, say, a decrease-liquidity instruction
  with the user as position authority that pays attacker accounts. The drained position
  is program-owned, so the wallet's token and control deltas would not show it. So each
  top-level instruction is decoded and must match a pinned `(program, discriminator)`
  pair in `LIFI_SOLANA_ALLOWED_INSTRUCTIONS`: Compute Budget (`SetComputeUnitLimit`,
  `SetComputeUnitPrice`), Associated Token Account `CreateIdempotent` for the user,
  System `Transfer` from the user to the user's own wSOL account, SPL Token `SyncNative`, and
  `CloseAccount` of accounts the transaction created **whose decoded `destination` is the
  user** (as the WalletConnect review already requires, `sol-instructions.utils.ts`;
  otherwise a forged transaction could create an empty account for the user and close it
  to an attacker, a rent loss that neither `createdAccounts` nor `closedAccounts` sees and
  that fits inside the SOL fee cap), and the swap/route entrypoints
  of the allowed Solana aggregators (Jupiter v6 route variants first; others added with
  their discriminators). Any other top-level instruction aborts. Calls _inside_ an
  allowed route are constrained by the aggregator program itself, plus the program check
  below.
- **The route's own minimum output is bound.** Simulation shows the outcome at current
  chain state only; what protects the user when state moves before the transaction lands
  is the minimum the aggregator enforces on-chain, and that comes from the route
  instruction's arguments, which LI.FI writes. So each allowed route entrypoint has a
  pinned argument decoder, and its effective on-chain minimum must be at least the
  displayed `toAmountMin`. For Jupiter v6 (`route` / `shared_accounts_route` and their
  token-ledger variants; exact-out variants are not allowed), the arguments include
  `quoted_out_amount` and `slippage_bps`, and the check is
  `quoted_out_amount × (10 000 − slippage_bps) / 10 000 ≥ toAmountMin`. The implementer
  takes the argument layout from Jupiter's published v6 IDL and adds a test from a real
  LI.FI transaction fixture. An aggregator is added to `LIFI_SOLANA_ALLOWED_INSTRUCTIONS`
  only together with its minimum-output decoder. Simulation stays as an additional check.
- **Every program is known.** Every top-level instruction's program, and every entry of
  `unreadPrograms`, is in `SOLANA_KNOWN_PROGRAM_ADDRESSES` or in a new pinned
  `LIFI_SOLANA_PROGRAM_ADDRESSES`. `unreadPrograms` only lists programs called from
  _inside_ other programs, and it is computed against `SOLANA_KNOWN_PROGRAM_ADDRESSES`
  alone, so it is filtered by the LI.FI list here rather than required to be empty;
  otherwise a bridge reached by CPI (or a bridge's own internal programs) would reject
  legitimate routes. LI.FI's `/tools` returns only tool keys, names, logos and chain
  pairs — no program ids — so `LIFI_SOLANA_PROGRAM_ADDRESSES` is **pinned by hand** from
  each allowed aggregator's published program ids (and verified on-chain), one commented
  line per program, like `sol-known-programs.constants.ts`. A tool removed via
  `LIFI_DENY_*` has its programs removed from the list in the same change.
- **Spend is bounded.** The source token's delta on the user's accounts is no lower than
  `-fromAmount`. No other user token account decreases. `solDelta` is no lower than
  `-(fromAmount if the source is native SOL) - LIFI_SOL_MAX_FEE_LAMPORTS`. The cap is a
  new constant sized for priority fees plus ATA rent, with a measured value recorded next
  to it.
- **Receipt is bound (Solana → Solana).** The user's destination-token delta is at least
  the displayed quote's `toAmountMin`. A missing `preview`, or no delta for the
  destination token, fails this check.
  - **Native SOL destination.** `solDelta` is the fee payer's **net** lamport change
    (`mapSolSimulationPreview` diffs the user's own account), so a valid SPL → SOL swap
    shows `received − transaction fee − rent` and would sit below LI.FI's gross
    `toAmountMin`. For a native-SOL destination the check is therefore
    `solDelta >= toAmountMin - LIFI_SOL_MAX_FEE_LAMPORTS`, using the same fee cap as the
    spend bound. A forged route can underpay by at most that cap, which is the same
    tolerance the spend bound already grants, and it can still only pay the user.

`simulateSolTransaction` takes, besides the base64 bytes, a **decompiled**
`transactionMessage` (it selects the accounts to snapshot from it) and a
`rentExemptMinimumRequest`. The decompiled message is produced with
`parseSolBase64TransactionMessage` (`sol/utils/sol-transactions.utils.ts`, which fetches
the lookup tables) exactly as the WalletConnect review does. It is used **only** to pick
accounts: what is simulated, signed and broadcast are LI.FI's original bytes, so this
does not reintroduce the recompilation problem described under
[Solana execution](#solana-execution).

**Solana → EVM is out of scope for v1.** Its EVM recipient sits inside the bridge
program's own instruction data, which nothing in the repo decodes, so the checks above
would bound _what_ leaves and _through which programs_ but not _to whom_. It follows in a
later PR with a per-bridge instruction decoder (see [Decisions](#decisions)).

### EVM execution

New `fetchLifiEvmSwap` in `lib/services/swap.services.ts`, mirroring
`fetchVeloraMarketSwap`:

1. **Price check before any gas is spent.** The displayed quote can be up to 30 s old
   (see [Cadence](#cadence-on-input-change-then-every-30-s)), and an ERC-20 source is
   about to pay for an approval, so the price is re-checked first, while aborting is
   still free. Re-quote through the REST wrapper (never the cache) with
   `skipSimulation: true` — no allowance exists yet, so a simulated quote may not come
   back — run `assertLifiQuote`, and if no route comes back or the new `toAmountMin` is
   below the displayed quote's `toAmountMin`, abort with the existing slippage-exceeded
   error mapping (Velora Delta's precedent). That mapping is a string-prefix check —
   `SwapEthWizard.svelte` turns an error whose message `startsWith('Slippage exceeded.')`
   into `swap.error.slippage_exceeded` — so the thrown error's message must start with
   exactly `Slippage exceeded.` (as `fetchVeloraDeltaSwap`'s does). Nothing has been
   broadcast at this point. For a native source this re-quote is skipped: step 3 is the
   first quote and does the same check.

2. If the source is not native:
   `approve({ to: LIFI_DIAMOND_ADDRESSES[sourceNetworkId], amount: fromAmount, shouldSwapWithApproval: true, … })`
   (`approve` names the spender `to`; see `ApproveParams` in `eth/types/send.ts`),
   exactly as `fetchVeloraMarketSwap` calls it, then the same allowance poll Velora
   Market uses. That poll is not a named function: it is an inline
   `retryWithDelay({ maxRetries: 10, request })` around `erc20ContractAllowance` inside
   `fetchVeloraMarketSwap` (`lib/services/swap.services.ts`), with the condition
   `allowance >= fromAmount`. Extract it into a small shared helper used by both, or
   repeat the same shape; do not invent a different poll. A smaller allowance after the
   retries aborts the swap before anything else is sent. The spender is the **pinned**
   Diamond (which the displayed quote's `approvalAddress` already matched), so approval
   does not depend on a fresh quote.

   `approve()` is **not changed**. `checkExistingApproval`
   (`eth/services/approve.services.ts`) skips the approval when the current allowance is
   already `>= amount`, and when it is non-zero but smaller it resets to zero first and
   then approves `amount`: zero, one or two approval transactions before the swap. A
   leftover larger allowance is accepted on purpose: the Diamond can only use it inside
   a call the user signs, and the calldata binding pins what that call deposits (see
   [Calldata binding](#calldata-binding-evm-execution-time-quote)). An earlier revision
   of this spec added an `exactAllowance` mode with a three-transaction path, two extra
   allowance reads and a return-to-review loop on the transaction count; it was dropped
   because it bought no additional guarantee.

   **The form budgets the approval transactions it will actually send.**
   `SwapEthForm.svelte` reserves a flat `maxGasFee * 2` whenever approval is needed,
   which covers one approval but not the reset path, and it uses `EthFeeContext`'s
   plain-transfer estimate rather than the swap leg's own ceiling (below). For LI.FI,
   when an ERC-20 quote is selected, the form reads the current allowance to the pinned
   Diamond once (`erc20ContractAllowance`) and reserves, on top of the swap-leg ceiling:
   no approval fee when the allowance is `>= fromAmount`, one when it is zero, two
   (reset + approve) when it is non-zero and smaller. The read is repeated when the
   quote's inputs (the cache key) change and never otherwise: there is no pre-dispatch
   re-read and no return-to-review on the count. If another pending transaction moves the
   allowance between review and execution, `approve()` decides from its own read, and a
   balance that no longer covers what it sends surfaces as the existing
   insufficient-funds abort before the swap is signed — Velora Market's exposure today,
   now limited to that race rather than to every reset.

3. **Re-quote with simulation on** (same params, `skipSimulation` omitted). The
   allowance now exists, so the simulation reflects the real transaction. Run
   `assertLifiQuote` and the same `toAmountMin` check as step 1: the price can move
   while the approval mines, and this is the quote whose bytes are signed. An abort here
   leaves an allowance of **at least** `fromAmount` to the pinned Diamond behind
   (exactly `fromAmount` when the approval was just sent, more when a larger one was
   already there and skipped), as Velora Market's aborts do; the next LI.FI swap's
   `approve()` reuses it when it is large enough. No revoke transaction is sent on abort.

   Then run `assertLifiEvmCalldata` on the new quote
   ([Calldata binding](#calldata-binding-evm-execution-time-quote)); a failure aborts
   with a generic swap error, not the slippage one.

4. **Gas is estimated by OISY, not taken from LI.FI.** LI.FI's `gasLimit` is unsigned
   and unrelated to the `EthFeeContext` estimate the form validated, so it is ignored
   (as is `gasPrice`). After the calldata check, `eth_estimateGas({ from, to, data,
value })` runs on the exact checked transaction through `infuraProviders(networkId)`
   (the existing `estimateGas` on the Infura provider; the allowance exists by now, so the estimate reflects the real call), plus a new fixed buffer `LIFI_GAS_LIMIT_BUFFER_PERCENT` (20 %; the repo has no shared one). A failing estimate aborts — this is the check that refuses a reverting route. With OISY's EIP-1559
   `maxFeePerGas`, the transaction's fee ceiling is `gas × maxFeePerGas + l1Fee`, the same
   formula as `maxGasFee` (`eth/utils/fee.utils.ts`). `l1Fee` is the OP-stack L1 data fee
   (Base), read with `getL1FeeUpperBound` on the Infura provider for an **upper bound** of
   the unsigned transaction's RLP size: the shared `OP_STACK_UNSIGNED_TX_SIZE` (128 bytes,
   `evm/base/constants/base.constants.ts`) is sized for transfers and would underprice
   LI.FI's calldata. The exact size is not known here, because `swap()` reads the nonce
   only later (`eth/services/swap.services.ts`) and the nonce changes the RLP length. So
   the size is computed by encoding the unsigned EIP-1559 transaction with its real
   `to`, `data`, `value`, `chainId`, gas and fee fields and the **largest possible
   nonce** (`2^64 − 1`, the widest RLP encoding). That bounds every actual nonce, so the
   reviewed `l1Fee` is never below the signed transaction's, and `swap()` keeps choosing
   its nonce unchanged. It is `undefined` (zero) off OP-stack chains. The native balance must
   cover `value + ceiling`, or the swap aborts with the existing insufficient-funds error
   before signing.
5. `swap({ to: tr.to, transaction: { data: tr.data, gas: estimatedGas, value: tr.value, chainId: tr.chainId }, maxFeePerGas, maxPriorityFeePerGas, … })`.

   **Review shows the same ceiling it signs.** In the form and review, the swap leg's
   maximum fee (displayed, and used for balance validation and "Max") is computed with
   the **same formula** as above: the gas units from the quote's `estimate.gasCosts`
   (LI.FI's own estimate for the route, not its `amount`, which is an expected cost at
   LI.FI's gas price) × the same buffer × OISY's `maxFeePerGas` + `l1Fee` for that
   transaction's size, rather than `EthFeeContext`'s plain-transfer estimate. At
   execution, if the ceiling from OISY's own estimate exceeds the reviewed ceiling, the
   swap is **not signed**: it aborts back to the review step with a "network fee changed"
   message (a new `swap.error.lifi_fee_changed`), and the user confirms the new maximum.
   For that to be reviewable, the abort **carries the complete execution-time ceiling
   back** — buffered gas × `maxFeePerGas` **plus that transaction's own `l1Fee`** — into
   the wizard's fee state for the selected quote. The re-quote's calldata can differ from
   the display quote's, so on Base its L1 fee can too; rebuilding the ceiling from the
   carried gas and the display quote's `l1Fee` could understate it and loop again. Review
   then shows `max(quote-derived ceiling, carried ceiling)`, and that exact value becomes
   the newly acknowledged bound the next execution compares against. The carried ceiling
   is cleared whenever the quote's inputs (the cache key) change. This abort, unlike the
   price check in step 1, necessarily comes after the approval: the estimate needs the
   allowance to exist. Velora Market keeps signing its provider's gas, unchanged.

6. Create the AUT row (best effort), `enableSwapDestinationToken`.

Wizard: add `SwapProvider.LIFI` to `isActiveTransactionSwap`, `isApproveNeeded` and
`swapEmitsApprovalSteps` in `SwapEthWizard.svelte`, plus a dispatch branch.

### Solana execution

New `fetchLifiSolSwap`:

1. **Re-quote immediately before signing, with simulation on** (the displayed quote's
   blockhash is likely stale), run `assertLifiQuote`, apply the same `toAmountMin`
   check as EVM, then `assertLifiSolTransaction`
   ([Solana transaction binding](#solana-transaction-binding-execution-time-quote)) on
   the exact bytes that step 2 signs.
2. `decodeTransactionMessage(data)` → sign the **original message bytes** with
   `signTransaction` from **`sol/utils/sol-sign.utils.ts`** (threshold Schnorr over
   `transaction.messageBytes`; it returns a `{ [address]: signature }` dictionary) →
   merge that dictionary into the decoded transaction's `signatures` →
   `sendSignedTransaction`. Do **not** use the same-named `signTransaction` in
   `sol/services/sol-sign.services.ts`: it takes a transaction _message_ and
   recompiles it.

   `sendSignedTransaction`'s parameter type `SolSignedTransaction`
   (`sol/types/sol-transaction.ts`) is the intersection of `Transaction`, `FullySignedTransaction`,
   `TransactionWithinSizeLimit` and `TransactionWithBlockhashLifetime`. Reach it by
   **narrowing, not casting** (AGENTS.md commandment 5):
   - add `lifetimeConstraint` from
     `getTransactionLifetimeConstraintFromCompiledTransactionMessage` (@solana/kit,
     applied to the compiled message decoded with `getCompiledTransactionMessageDecoder`).
     For a blockhash-lifetime message it returns `blockhash = lifetimeToken` and
     `lastValidBlockHeight = u64::MAX`; the send path never reads it (kit's
     `sendTransactionWithoutConfirmingFactory` only re-encodes signatures + the
     unchanged `messageBytes`), and confirmation is the poller's job, not
     `confirmSignedTransaction`'s;
   - then `assertIsFullySignedTransaction`, `assertIsTransactionWithinSizeLimit` and
     `assertIsTransactionWithBlockhashLifetime`, which narrow without a cast. The first
     also fails fast if LI.FI's transaction needs a signer other than the user (on top
     of `assertLifiQuote`).

   Nothing is fetched or recompiled to satisfy the type.

3. Create the AUT row (best effort) with the signature as the tx hash and the
   transaction's **recent blockhash** as a ref, `enableSwapDestinationToken`. The
   blockhash is read from the compiled message (`getCompiledTransactionMessageDecoder`
   → `lifetimeToken`). LI.FI's transaction carries only the blockhash, not its
   `lastValidBlockHeight`, and the expiry check in the
   [poller](#poller-libserviceslifi-active-txservicests) needs nothing more.

**WalletConnect's `getSignatureWithSending` path is not reused.** It decompiles the
message with `decompileTransactionMessageFetchingLookupTables`, replaces the blockhash
and recompiles **without** address-lookup-table compression (nothing in the repo calls
`compressTransactionMessageUsingAddressLookupTables`). LI.FI routes (Jupiter, OKX,
Mayan…) rely on lookup tables, so the recompiled transaction can exceed the 1 232-byte
limit and `sendSignedTransaction`'s `assertIsTransactionWithinSizeLimit` would throw.
Signing the bytes LI.FI built keeps them exactly as simulated; the re-quote in step 1
is what keeps the blockhash fresh.

Wizard: `SwapSolWizard.svelte` gets an if/else on `selectedProvider.provider`
(NEAR Intents vs LI.FI). The NEAR Intents branch keeps its terms gate unchanged. The
same PR removes the "no Solana source" restriction from the `solSwapProviders` LI.FI
entry (see [Quoting](#quoting)).

### Active User Transactions

#### Backend variant

```rust
/// LI.FI swap or bridge. A single variant covers every source chain (EVM,
/// Solana) and every route; the source tx hash, route tool, and the learned
/// destination tx hash ride in `external_refs`. The two chains are those of
/// `source_token` / `dest_token`.
Lifi(LifiData),

pub struct LifiData {
    pub source_token: TokenId,
    pub dest_token: TokenId,
    /// Source-token amount in base units.
    pub amount: Nat,
}
```

`validate_data` arm: `require_valid_amount(&d.amount, "amount")`. Candid round-trip
tests, an integration test in `src/backend/tests/it/active_user_transactions.rs`,
regenerated `backend.did` and `src/declarations/backend/*` (rebuild the wasm before
`npm run generate`, which otherwise no-ops silently). Precedent: commit `78d5addbd`
(Velora's variant).

#### External refs (`LIFI_EXTERNAL_REF_KEYS`, `lib/types/lifi.ts`)

| Key                    | Set           | Purpose                                              |
| ---------------------- | ------------- | ---------------------------------------------------- |
| `lifi_tx_hash`         | creation      | source tx hash / Solana signature; `/status` key     |
| `lifi_tool`            | creation      | `step.tool`, passed as `bridge` to `/status`         |
| `lifi_transaction_id`  | creation      | LI.FI's id, for support / explorer links             |
| `lifi_nonce`           | creation, EVM | replaced/dropped detection (Velora Market)           |
| `lifi_blockhash`       | creation, SOL | the transaction's recent blockhash; expiry detection |
| `lifi_dest_tx_hash`    | learned       | `receiving.txHash`                                   |
| `lifi_received_symbol` | learned       | `receiving.token.symbol` on every `DONE` / `PARTIAL` |
| `lifi_received_amount` | learned       | that token's amount, **formatted** (see below)       |

Plus the shared display keys (`amount`, `source_token_symbol`, `source_network_symbol`,
`destination_token_symbol`, `destination_network_symbol`, `usd_source_value`), so
`ActiveUserTransactionItem` renders the row without new layout. An EVM row uses at most
13 of the 16 keys (`lifi_nonce`, no `lifi_blockhash`), a Solana row likewise 13
(`lifi_blockhash`, no `lifi_nonce`), leaving three spare.

Two things one might expect in the refs are deliberately not there:

- **The LI.FI chain ids.** Velora stores a `chain_id` ref, but the row's `source_token` /
  `dest_token` already carry the chain: the backend `TokenId`
  (`src/shared/src/types/token_id.rs`) is `EvmNative(ChainId)`, `Erc20(_, ChainId)`,
  `SplMainnet(_)`, `SolNativeMainnet` and so on. A small `lifiChainIdOfTokenId` in
  `lib/utils/lifi-active-tx.utils.ts` maps that to the LI.FI chain id (EVM: the chain id;
  Solana mainnet: `1151111081099710`; anything else: `undefined`, and the row is skipped
  with `consoleError`). It serves both the poller's `/status` query and the EVM
  source-chain check's network lookup.
- **The Solana expiry observation.** The two-observation guard keeps its counter in an
  in-memory map, exactly like Velora Market's `replacementObservations`
  (`lib/services/velora-active-tx.services.ts`), not in a ref. A reload resets the
  counter, which only delays the irreversible verdict by one poll. See the
  [poller](#poller-libserviceslifi-active-txservicests).

`lifi_received_amount` is stored as a **decimal string** — `receiving.amount` formatted
with `receiving.token.decimals` (`formatToken`) at the moment the poller learns it —
rather than in base units. The received token is usually one OISY does not know, so its
decimals would otherwise have to be stored as well; one formatted value is simpler to
render and to validate.

That metadata is untrusted and optional, so it can never block the terminal update.
`receiving.amount` must match `/^\d{1,78}$/` (78 digits cover the full unsigned 256-bit
range, and the length is checked **before** any `BigInt` or `formatToken` call, so an
unbounded string never reaches them) and `receiving.token.decimals` must be an integer
from 0 to 36 (a sanity bound well above any real token); `receiving.token.symbol` must be a
non-empty string. If any check fails, or formatting throws, the poller still writes
`Succeeded` and simply omits the two received refs: the row then shows the target token
as before, which is the same display as `COMPLETED`.

#### Poller (`lib/services/lifi-active-tx.services.ts`)

Each tick, per pending LI.FI row:

1. **Source-chain check first** (until the source tx is confirmed):
   - EVM — reuse Velora Market's receipt + nonce logic: receipt `status: 0` → `Failed`
     (reverted); no receipt while the account nonce has passed `lifi_nonce`, seen on two
     consecutive polls → `Failed` ("replaced or dropped"). The network comes from the
     row's `source_token` (`findEvmNetworkByChainId` on its `TokenId` chain id), where
     Velora reads its `chain_id` ref. That logic is private to
     `lib/services/velora-active-tx.services.ts` today (`pollVeloraMarketTransaction`,
     its in-memory `replacementObservations` map, `REPLACEMENT_OBSERVATIONS_REQUIRED`),
     with the outcome mapping in `toVeloraMarketOutcome`
     (`lib/utils/velora-active-tx.utils.ts`). It is **extracted** into a
     provider-agnostic EVM source-tx helper (receipt + nonce → outcome, with the
     two-observation counter keyed per row) that both pollers call. Velora's behaviour
     and existing tests stay unchanged; the refactor lands in the same PR as the LI.FI
     EVM poller.
   - Solana — new, since nothing in the repo reads signature statuses or blockhash
     validity yet:
     1. `getSignatureStatuses([signature], { searchTransactionHistory: true })`. The
        history search matters: without it the RPC only answers from its recent-status
        cache, and an old landed transaction would read as missing.
     2. A status with `err` → `Failed` ("reverted on Solana"). A status at `confirmed` or
        `finalized` without `err` → the source leg is done; go on to `/status`.
     3. No status → `isBlockhashValid(lifi_blockhash, { commitment: 'confirmed' })`. While
        valid, the transaction can still land: no update. Once invalid, it can never
        land — but it may have landed just before the hash expired, between the two
        calls. So the first poll that sees "no status + invalid blockhash" only records
        an observation in an in-memory `expiryObservations` map keyed by row id. The next
        poll re-runs step 1, and only if it again finds no status is the row set to
        `Failed` ("expired, never landed"). This is the same two-observation guard Velora
        Market uses for "replaced or dropped" (`replacementObservations`,
        `REPLACEMENT_OBSERVATIONS_REQUIRED`), applied here because a `Failed` verdict is
        immutable; the extracted source-tx helper can own the map for both.
     4. The two observations must be **consecutive**: any poll that finds a signature
        status, or a still-valid blockhash, **deletes** the row's entry. A page reload
        empties the map, so the count restarts; that can only delay the verdict by one
        poll, never hasten it, which is why the observation is not persisted in a ref.
2. **Then `getStatus({ txHash, fromChain, toChain, bridge })`**, with `fromChain` /
   `toChain` derived from the row's `source_token` / `dest_token` (see
   [External refs](#external-refs-lifi_external_ref_keys-libtypeslifits)) and `bridge` from
   `lifi_tool`. Two answers are not status objects and are normalised first:
   - A **`NOT_FOUND` can arrive as an HTTP 404** (LI.FI error code `1003`) rather than as a
     `200` with `status: 'NOT_FOUND'`; the docs say to handle both. The SDK throws an
     `HTTPError` for the 404, so the poller catches that specific error (status 404, or
     code 1003 in the body) and treats it exactly as `NOT_FOUND`. Letting it fall through
     to the per-row catch would skip the unresolved-status accounting below, and a row
     whose source is confirmed could then stay `Executing` forever.
   - Any other error (network, 5xx, rate limit) is caught per row and the row is left
     untouched until the next poll, as for every other poller.

   The normalised answer is mapped through `advanceStatus`:

| LI.FI                     | AUT                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `NOT_FOUND` (200 or 404)  | no update (see [Unresolved status](#unresolved-status) for the bound) |
| `INVALID`                 | re-query without `bridge`; else as `NOT_FOUND`, same bound            |
| `PENDING` (any substatus) | `Executing`                                                           |
| `DONE` / `COMPLETED`      | `Succeeded`                                                           |
| `DONE` / `PARTIAL`        | `Succeeded`; `lifi_received_symbol` / `lifi_received_amount` recorded |
| `DONE` / `REFUNDED`       | `Failed` with the "refunded" error (`swap.error.lifi_refunded`)       |
| `FAILED`                  | `Failed` with `substatusMessage`, byte-truncated (see below)          |

`PARTIAL` is a success because the user received full value, only in a different token
(typically a bridge's intermediate asset). The item then shows the token actually
received rather than claiming `dest_token`. The received symbol and amount are recorded
on **every** `DONE` / `PARTIAL`, never only when the symbol differs from the target's:
symbols are not unique, and the status itself already establishes that the token
differs. `REFUNDED` is a failure because the swap did
not happen; the error copy says the funds were returned, and `lifiExplorerLink` is not
needed for that since the funds are back in the user's wallet.

##### Unresolved status

Before the source transaction is confirmed, `NOT_FOUND` / `INVALID` are expected and the
source-chain check decides. **After** it is confirmed, the source chain has nothing more
to say, so a `/status` that never resolves would leave the row non-terminal forever.

- `INVALID` means LI.FI cannot tie the hash to the given `bridge` / chains, which does not
  fix itself. On `INVALID` the poller immediately re-queries `/status` with `txHash`,
  `fromChain` and `toChain` only (no `bridge`), in case the stored `lifi_tool` is what
  LI.FI rejects, and maps that answer instead.
- The bound starts only **after the source transaction is confirmed** and is measured
  on the **browser's clock only**. The first time a poll sees the row's source confirmed
  and the latest `/status` answer (after the `INVALID` re-query) still `NOT_FOUND` /
  `INVALID`, the poller starts accumulating **observed unresolved time** for that row in
  `localStorage` (key `lifi-unresolved:<rowId>`, value `{ elapsedMs, lastSeenAt }`,
  through the existing `get` / `set` / `del` in `lib/utils/storage.utils.ts`). Each
  later poll that still sees the source confirmed and an unresolved answer adds
  `clamp(Date.now() − lastSeenAt, 0, LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS)` to
  `elapsedMs` and updates `lastSeenAt`; the step cap is 2 min (twice the slowest
  per-row poll interval). Any other answer, or a terminal status, deletes the entry.
  When `elapsedMs ≥ LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS` (6 h) and the latest answer
  is still unresolved, the row ends `Failed` with `swap.error.lifi_status_unknown`
  ("LI.FI could not report the outcome of this swap. Check your destination wallet."),
  not a claim that the funds were lost.
  - Accumulated, not `now − start`: a manual clock change or forward NTP correction can
    add at most one capped step, and a backward jump adds nothing, so a clock jump
    cannot hasten the irreversible verdict. Time the tab was closed or hidden is not
    counted beyond one step, which only delays it.
  - Browser clock against browser clock: never the row's `created_at_ns`, which is the
    canister's clock, so clock skew does not move the window (the concern behind OISY
    Trade's tick counting, `lib/constants/oisy-trade.constants.ts`).
  - Persisted, so reloads do not restart the window. It is kept client-side rather than
    in the row's refs (a ref would turn every unresolved poll into a backend update, and
    the window is a per-browser observation, not a fact about the swap), so another
    device, a private window or cleared site data starts its own window. That can only
    **delay** the irreversible verdict, never hasten it.
  - Storage is best-effort: reads and writes are wrapped in try/catch, and when storage
    is unavailable the poller falls back to an in-memory timestamp for the session.
  - Not from row creation: a source that confirms late would otherwise be failed after
    only a couple of status calls.
  - 6 h is far past LI.FI's slowest bridge ETAs; the constant sits next to the throttle
    constants so it can be tuned.
- A `PENDING` answer at any time keeps the row `Executing` with no deadline: LI.FI is
  still tracking it.

##### Byte-safe text

The backend measures both limits in UTF-8 bytes and rejects the **whole** update —
status included — when one is exceeded (`ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES` = 512
and `ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES` = 256 in
`lib/constants/app.constants.ts`). A character-based `slice(0, 512)` of non-ASCII text can
exceed them and leave a `Failed` row stuck pending.

Truncation is only for **free text**. An atomic value cut short is corrupt, not safe, so
those are validated and omitted instead:

- `lifi_dest_tx_hash` must be a valid hash for the destination chain (`0x` + 64 hex for
  EVM; base58, 64–88 characters, for Solana), or it is omitted.
- `lifi_received_amount` must fit the ref limit after formatting, or the symbol/amount
  **pair** is omitted (the row then shows the target token, as for malformed metadata).

Free text — `substatusMessage` for the error and `lifi_received_symbol` as a ref value —
is cut with a byte-safe truncation:
`TextEncoder().encodeInto(text, new Uint8Array(limit))` and `text.slice(0, read)`, as
`toCyclesMintRowError` (`lib/utils/cycles-mint-active-tx.utils.ts`) does. That helper is
lifted into a shared util (`truncateUtf8Bytes`) used by both, with the constants above as
limits, and recorded in `docs/ai/frontend/reusability.md`.

The two LI.FI strings written **at creation** are validated rather than truncated, since a
cut value would be wrong rather than shorter, and an oversized one would make the backend
reject the best-effort creation, leaving the broadcast swap untracked:

- `lifi_tool` (`step.tool`, later sent as `bridge` to `/status`) must match
  `/^[A-Za-z0-9_-]{1,64}$/`;
- `lifi_transaction_id` must match `/^0x[0-9a-fA-F]{1,128}$/`.

A value that fails is **omitted** from the refs instead of failing creation. Without
`lifi_tool`, the poller calls `/status` without `bridge` from the start (the same query as
the `INVALID` fallback).

Learned refs are merged on every poll. Errors are caught per row, except the `/status`
404 described above, which is an answer rather than a failure. Polls are throttled
per row inside the poller to LI.FI's recommended cadence — every 10 s for the first
minute after creation, every 30 s until 10 minutes, then every 60 s — on top of the
loader's 5 s tick.

#### Loader and UI

- `LoaderActiveUserTransactions.svelte`: a `tick` branch calling the LI.FI poller with
  `$ethAddress` / `$solAddressMainnet` (the loader imports only `ethAddress` today; add
  `solAddressMainnet` from `lib/derived/address.derived.ts`), and a terminal-status branch firing
  `TRACK_COUNT_SWAP_SUCCESS` / `_ERROR` with `buildLifiSwapTrackingMetadata`.
- That terminal branch refreshes balances for **every** terminal LI.FI row, not only
  `Succeeded`: the modal closed at broadcast, so nothing else refreshes them when the
  route settles, and a failed, reverted or refunded swap still spent gas or returned
  funds. Two parts, because they cover different chains:
  - `shouldRefresh` (→ `waitAndTriggerWallet()`) for the Solana side. It only emits the
    `oisyTriggerWallet` worker event, and **EVM balances have no wallet worker**
    (`LoaderEthBalances.svelte` does not listen for it, as `native-balance.services.ts`
    notes), so it refreshes nothing on EVM.
  - An explicit EVM reload with `reloadEthereumBalance` (`eth/services/eth-balance.services.ts`)
    for each affected EVM token: the source token and its network's native token (gas,
    `nativeTokenOf`) on every terminal status, since a refund can also land there, and the
    destination token when it is on an EVM network. `swap()` only reloads the source
    token once the source transaction is mined, so without this an EVM destination payout
    or a later refund stays stale until the periodic poll. The row stores backend
    `TokenId`s, and only the forward mapping exists (`toBackendTokenId`,
    `lib/utils/token-id.utils.ts`), so the tokens are resolved by finding the enabled
    token whose `toBackendTokenId` equals the row's `source_token` / `dest_token`; an
    unresolved token (disabled since the swap) is skipped.
  - Redundant refreshes (dropped or expired source) only find nothing new.
- `ActiveUserTransactionItem.svelte`: `isLifi` in the `isSwap` list and the
  `providerName` chain; when `lifi_received_symbol` is present, the received token and
  amount replace the destination token in the row.
- **Failure reasons are stored, not displayed**, as for Velora and NEAR Intents: a
  `Failed` row shows the existing warning icon, and `tx.error` (refunded, outcome
  unknown, LI.FI's `substatusMessage`) is kept on the row for support and analytics. No
  toast, no new row layout, no explorer link. Surfacing errors for all swap providers
  is a separate, cross-provider change.
- Wizard tracks `TRACK_COUNT_SWAP_SUBMITTED` (it is an active-transaction swap).

### Presentation

- `swapProvidersDetails[SwapProvider.LIFI]` — unconditional, `name: 'LI.FI'`,
  `website: 'https://li.fi'`, logo `static/images/dapps/lifi-logo.svg`. The PR ships a
  **placeholder** SVG at that path (a neutral rounded square with the text "LI.FI"); the
  official logo replaces the file later without any code change.
- `SwapDetailsLifi.svelte` in the provider sheet: estimated duration, LI.FI's 0.25 %
  fee (from `feeCosts`), the route tool name and minimum received.
- i18n keys in `en.json` + the other locales + `i18n.d.ts`: at least
  `swap.text.lifi_route_via`, `swap.error.lifi_refunded`, `swap.error.lifi_status_unknown`,
  `swap.error.lifi_fee_changed`,
  `swap.text.lifi_received_other_token`; optionally
  `help.text.explorers_lifi_description` for a help-page explorer entry.

## Delivery plan

| PR  | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Depends on                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1   | **Backend AUT variant** — `Lifi(LifiData)`, validation, tests, regenerated `.did` / declarations                                                                                                                                                                                                                                                                                                                                                                                                                                         | —                                              |
| 2a  | **Scaffolding + quoting** — `@lifi/sdk`, env (flag **`false` everywhere**; unit tests switch it on), types, quote service + cache, form-time trust checks, LI.FI destination resolver + per-category wildcard, Solana in `crossChainSwapNetworks` / `allCrossChainSwapTokens` when either flag is on, EVM registry entry, Solana registry entry **restricted to EVM sources** (EVM → Solana, allow-listed bridges, empty source list so the Solana source picker is unchanged), provider sheet                                           | 1                                              |
| 2b  | **EVM execution + tracking** — calldata binding (pinned selectors + `CalldataVerificationFacet`), `fetchLifiEvmSwap` (pre-approval price check, unchanged `approve()`, form budget of 0/1/2 approval fees from one allowance read) + wizard dispatch, Velora source-tx helper extraction, byte-safe truncation util, AUT utils/poller (incl. unresolved-status bound and the `/status` 404 → `NOT_FOUND` mapping)/loader (incl. wallet + EVM balance refresh)/item; flag back to `LOCAL \|\| STAGING`, `PRODUCT.md` for EVM-source swaps | 2a                                             |
| 3   | **Solana → Solana** — lift the Solana-source restriction on the Solana registry entry (quote, destinations and source list; Solana destinations only), `fetchLifiSolSwap` with simulation binding (incl. `createdAccounts` / `closedAccounts` in the simulation preview), `SwapSolWizard` dispatch, Solana source-chain check in the poller (in-memory expiry observations), `PRODUCT.md` update for Solana-source swaps                                                                                                                 | 2b                                             |
| 4   | **Flip the flag** — `LIFI_SWAP_ENABLED = true` (one line) + `PRODUCT.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 3, production key + rate-limit scope confirmed |

PR 2 is split up front so each PR stays reviewable. In 2a the flag is `false` everywhere,
local included: 2a registers quotes but the wizard has no LI.FI dispatch yet, so a
selected offer would hit `SwapEthWizard`'s unknown-provider branch. 2a is exercised by
unit tests that switch the flag on (the `vi.doMock` pattern of `near-intents.env`), and
2b, which adds the dispatch, sets it to `LOCAL || STAGING`. No environment, local
included, ever shows an offer that cannot be executed. This is the same sequencing as
the Solana-source guard above. Solana → EVM
is a later, separate PR (see [Decisions](#decisions)).

`docs/ai/PRODUCT.md` is updated in **every** PR that makes new behaviour reachable on a
deployed environment, not after: PR 2b describes EVM-source swaps (including EVM →
Solana) on staging, PR 3 adds Solana-source swaps, PR 4 records that LI.FI is live
everywhere.

## Risks

- **Key quota exhaustion** — if LI.FI's limit turns out to be per key, heavy use could
  exhaust it; the fan-out degrades gracefully (no LI.FI quote) and the 30 s cadence keeps
  each open Swap form to ≈ 2 quote requests per minute plus input changes.
- **Trust in LI.FI's on-chain whitelist** — the individual DEX calls inside a route are
  not decoded client-side; OISY relies on the Diamond's `(contract, selector)`
  whitelist (checked before signing, enforced on-chain) plus the no-token-target rule.
  A compromised LI.FI whitelist governance is outside what OISY can bind.
- **Unsigned quotes** — mitigated by the trust checks and, on the quote that is signed,
  by binding the calldata (EVM) or the simulated effects (Solana) to the request. One
  residual risk remains: the bridge leg's minimum output cannot be decoded client-side,
  so a forged cross-chain route (which needs a compromised `li.quest` response over TLS)
  can underpay, but only to the user's own address. Solana → EVM, whose recipient cannot
  be verified yet, is out of scope for v1 for exactly this reason.

- **Solana blockhash expiry** — between the execution re-quote and broadcast only one
  threshold Schnorr signature happens (seconds), well inside 60–90 s. A transaction
  that still expires is detected by the poller (no signature status + an invalid
  blockhash, on two consecutive polls) and ends `Failed`, never `Succeeded`.
- **Wrong terminal verdict is permanent** — `NOT_FOUND` / `INVALID` never terminate a
  row on their own; a source-chain failure, a LI.FI `DONE` / `FAILED`, or the 6 h
  [unresolved-status](#unresolved-status) bound does. The bound's verdict is worded as
  "outcome unknown", not as lost funds.
- **Failure reasons are not shown to the user** — as for Velora and NEAR Intents, a
  failed row shows only the warning icon; the reason is stored on the row. Accepted for
  v1 for consistency across providers.
- **Narrower EVM → Solana coverage** — only bridges whose calldata carries a decodable
  Solana receiver (Mayan, NEARIntents, AcrossV4) are offered for EVM → Solana; routes
  via AllBridge, Chainflip, Glacis, Eco… are not. From Robinhood Chain only Across is
  available, since its Diamond has neither the Mayan nor the NEAR Intents facet.
- **Skipped simulation hides failing routes in the form** — accepted: a route that would
  revert is shown, but OISY's own `eth_estimateGas` on the execution quote (and, on
  Solana, the fail-closed simulation of the exact bytes) refuses it before signing.
- **An abort after approval still costs the approval** — the price check in step 1 of
  [EVM execution](#evm-execution) makes a price move free to abort, but the gas-ceiling
  check needs the allowance to exist and so runs after it; a user bounced to review by a
  higher ceiling has paid up to two approval transactions (reset + approve). Velora
  Market has the same exposure.
- **The approval budget is read once** — the form reserves zero, one or two approval
  fees from a single allowance read at quote selection. An allowance moved by another
  pending transaction between review and execution is not re-budgeted; it ends in the
  insufficient-funds abort before the swap is signed, after at most the approval
  transactions `approve()` already sent. Accepted over a pre-dispatch re-read and a
  return-to-review loop on the count.

## Acceptance criteria

1. With `LIFI_SWAP_ENABLED` on, an EVM source token on any of the six EVM mainnets
   shows a LI.FI offer (when LI.FI has a route) for same-chain EVM, cross-chain EVM and
   EVM → Solana destinations, ranked by receive amount with the other providers,
   including Velora.
2. With the flag on, a Solana source shows LI.FI offers for Solana destinations, and
   never requests a LI.FI quote for an EVM destination.
3. BTC, XRP and ICP sources never request a LI.FI quote.
4. Form-time LI.FI quotes are requested with `skipSimulation`, at most once per 30 s for
   unchanged inputs, and immediately on any input change; execution-time quotes are
   simulated.
5. No LI.FI request carries a `fee` parameter.
6. A LI.FI quote whose `to` / `approvalAddress` is not the pinned Diamond for the source
   chain, whose echoed request differs from what was asked, whose Solana `data` is an
   array, or whose Solana transaction needs another signer, is never shown and never
   executed.
7. An ERC-20 swap first re-checks the price without touching the chain and aborts with
   the slippage copy if `toAmountMin` dropped, then goes through the unchanged
   `approve()` with the pinned Diamond (which equals the quote's `approvalAddress`) as
   spender — skipped when the allowance already covers `fromAmount`, reset-then-approve
   when it is non-zero and smaller — waits for an allowance `>= fromAmount`, and only then
   broadcasts the swap with OISY-computed EIP-1559 fees. The form's balance validation
   reserves the swap-leg ceiling plus zero, one or two approval fees according to one
   allowance read at quote selection, so the reset path is budgeted. A native swap does
   not approve. `approve()` and its existing callers are unchanged.
8. An EVM swap is never signed unless its calldata selector is in the pinned list for
   its route kind and the Diamond's `CalldataVerificationFacet` decodes it to the
   requested source token and amount, the user's recipient (EVM, or the user's Solana
   address for a Solana destination — only via a selector in
   `LIFI_NON_EVM_RECEIVER_SELECTORS`), with every receiver and refund field in the curated
   facet's own data equal to the user, the requested destination chain and, same-chain, a
   minimum output at least the displayed `toAmountMin`. A route with a destination call
   is never signed. A decode that reverts aborts the swap.
9. A Solana swap is never signed unless a simulation of its exact bytes succeeds, shows
   no control change, leaves every token account it creates for the user with the user
   as owner and no foreign delegate or close authority, closes none of the user's
   pre-existing accounts, contains only top-level instructions from
   `LIFI_SOLANA_ALLOWED_INSTRUCTIONS` (any `CloseAccount` paying the user, and the route's
   decoded on-chain minimum output at least `toAmountMin`), calls (top-level or nested)
   only programs in `SOLANA_KNOWN_PROGRAM_ADDRESSES` or the pinned
   `LIFI_SOLANA_PROGRAM_ADDRESSES`, spends no more than `fromAmount` (plus the SOL fee
   cap) from the user's accounts and, Solana → Solana, credits at least `toAmountMin`
   (for a native-SOL destination, net of at most the SOL fee cap). A failed or
   timed-out simulation aborts the swap.
10. The destination picker offers EVM and Solana tokens for an EVM source, and (from
    PR 3) Solana tokens for a Solana source, even when no other provider covers that
    category, and Solana networks and tokens stay in the swap pickers when NEAR Intents
    is off but LI.FI is on. Until PR 3 the Solana **source** picker is exactly what it
    is without LI.FI (NEAR Intents' list); from PR 3 every enabled Solana token is
    selectable as a source.
11. A Solana swap signs LI.FI's transaction bytes unchanged (no recompilation) and
    broadcasts them.
12. After broadcast, the modal closes, an AUT row appears in the Active-transactions
    panel labelled "LI.FI", and it reaches `Succeeded` / `Failed` in the background,
    including after a page reload. Every terminal LI.FI row triggers one wallet
    refresh and an explicit reload of its EVM source, gas and (EVM) destination
    balances.
13. `DONE/PARTIAL` ends `Succeeded` and the row shows the token actually received, with
    its amount correctly formatted; `DONE/REFUNDED` ends `Failed` with the refunded copy.
14. A reverted / dropped (EVM) or reverted / expired (Solana) source transaction ends
    `Failed`; a `NOT_FOUND` / `INVALID` status alone never terminates a row before the
    source is confirmed and the 6 h unresolved-status bound has passed, after which the
    row ends `Failed` with the "outcome unknown" copy. That bound starts after source
    confirmation, accumulates observed time in capped per-poll steps (persisted in
    `localStorage`, so a clock jump cannot hasten it), and never compares against
    `created_at_ns`. A `/status` HTTP 404 (code 1003) counts as `NOT_FOUND`, never as a
    swallowed error. A Solana row is marked expired
    only after two consecutive polls each find no signature status (searching
    transaction history) with the stored blockhash no longer valid.
15. `swap_submitted` fires from the wizard; `swap_success` / `swap_error` fire once from
    the loader on the terminal status.
16. With the flag off, nothing LI.FI-related is fetched or shown, but existing LI.FI AUT
    rows still render and poll.
17. No `@lifi/sdk-provider-*` package and no `executeRoute` are in the bundle.
18. Velora Market's replaced/dropped and revert detection behaves exactly as before the
    source-tx helper extraction.
19. Every LI.FI-supplied string written to a row (error or ref value) fits the backend's
    UTF-8 byte limits, including non-ASCII text.

## Open questions

Facts still to confirm. Both gate PR 4 (the flag flip), not PRs 1–3.

- **Production API key.** A separate key, scoped to OISY's production origins, must be
  registered on LI.FI's partner portal and set as a deployment secret. Owner: whoever
  holds the LI.FI partner account.
- **Rate-limit scope.** Is LI.FI's 100 requests / min limit per key or per IP? If per
  key, the 30 s [cadence](#cadence-on-input-change-then-every-30-s) must be checked
  against expected production traffic before the flip. Owner: ask LI.FI.

## Decisions

Recorded so a future reader can tell "excluded on purpose" from "forgotten".

- **Solana → EVM is not in v1.** The simulation binding bounds _what_ leaves the wallet
  and _through which programs_, but not the EVM recipient inside a Solana bridge
  program's instruction. PR 3 ships Solana → Solana only; Solana → EVM follows in a
  later PR with a per-bridge instruction decoder for the allowed bridges.
- **EVM → Solana is allow-listed to Mayan, NEARIntents and AcrossV4**, the facets whose
  Solana receiver `extractNonEVMAddress` can verify. Other bridges are not offered.
- **All cross-chain EVM routes use curated bridge facets** whose bridge-specific receiver
  and refund fields OISY decodes and binds (Across V4, NEAR Intents, Mayan to start).
  Other bridges are not offered until a decoder is added.
- **Solana top-level instructions are pinned** by `(program, discriminator)`, not just by
  program, so a known DEX program cannot be used for anything but the allowed route.
- **Failure reasons stay off-screen**, matching Velora and NEAR Intents (icon only).
- **The unresolved-status bound starts after source confirmation and accumulates
  observed time in capped per-poll steps, persisted in `localStorage`**, so reloads do
  not restart it and clock jumps cannot hasten it; another device starts its own window.
- **Native-SOL receipts are checked net of the SOL fee cap**, not by reconstructing gross
  incoming lamports.
- **`approve()` is reused unchanged; there is no exact-allowance mode.** The allowance
  the Diamond is left with is **at least** `fromAmount`, not exactly that: a larger
  pre-existing one is kept. It is only usable inside a user-signed call whose calldata
  OISY binds, so pinning it to the exact amount would add a reset transaction, a
  pre-dispatch allowance read and a return-to-review loop for no extra guarantee. The
  price is re-checked **before** the approval instead, so a stale display quote aborts
  for free, and the form budgets zero, one or two approval fees from a single allowance
  read at quote selection rather than a flat two.
- **The row's chain ids are not refs.** They are derived from `source_token` /
  `dest_token`, and the Solana expiry observation lives in memory like Velora's
  replacement counter, so both row kinds stay at 13 of the 16 refs.
- **`@lifi/sdk` (core only) is approved** as a new dependency.
- **PR 2 is split into 2a / 2b** up front.
- **The LI.FI integrator id and the staging API key are registered.** Their values are
  set in the environment outside the repository; the implementer asks before editing
  `deploy-to-environment.yml`. The **production** key is not registered yet; it is a
  prerequisite for PR 4 (see [Open questions](#open-questions)).

## References

- LI.FI: https://docs.li.fi/sdk/overview, https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer,
  https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer,
  https://docs.li.fi/api-reference/rate-limits,
  https://docs.li.fi/introduction/lifi-architecture/bitcoin-overview,
  https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example,
  https://docs.li.fi/introduction/user-flows-and-examples/solana-tx-execution,
  https://github.com/lifinance/contracts/tree/main/deployments
- Spec: `2026-08-25-feat-near-intents-btc-swap.md`
- Precedent commits: `5a20eff6a` (NEAR Intents backend AUT variant), `12dd69624` (NEAR
  Intents frontend AUT), `78d5addbd` (Velora backend AUT variant), `0c53b9421` (Velora
  frontend AUT), `2a8128636` (Chain Fusion as a swap provider)
