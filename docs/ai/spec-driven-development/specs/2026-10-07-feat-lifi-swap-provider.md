# Spec: LI.FI becomes a swap provider

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Register **LI.FI** — a cross-chain swap and bridge aggregator — as a swap provider, so
its offers appear in the Swap modal next to Velora, NEAR Intents, 1Sec and Chain
Fusion: same token pickers, same quote list, same provider sheet, same review and
progress steps.

v1 covers two **source** categories:

- **EVM** (Ethereum, Arbitrum, BSC, Polygon, Base, Robinhood Chain) → EVM or Solana.
- **Solana** → EVM or Solana.

Every LI.FI swap is tracked by **Active User Transactions** (AUT) from the moment its
source transaction is broadcast, like Velora Market and NEAR Intents: the modal closes
once funds have left the wallet, and the global AUT poller drives the row to
`Succeeded` / `Failed`, surviving a closed tab or a re-login.

Behind a new feature flag, `LIFI_SWAP_ENABLED`, which is `LOCAL || STAGING` (and off in
unit tests) until a separate one-line PR enables it everywhere. That PR is gated on
LI.FI confirming browser use of our API key (see [API key](#api-key)).

**Out of scope:**

- **BTC as a source.** See [Why BTC source is out](#why-btc-source-is-out).
- **BTC, XRP or ICP as a destination.** LI.FI has no ICP; BTC/XRP destinations can come
  later once the source side is proven.
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
- adds **cross-chain EVM ↔ EVM and EVM ↔ Solana** routes for tokens NEAR Intents does not
  list, and competes on price where both list them;
- adds **same-chain Solana** swaps (SPL ↔ SPL), which no provider offers today.

Because the quote fan-out already sorts every provider's result by receive amount, the
user gets the better price without any new UI concept.

## Background — how swap providers work today

Reference only; the integration recipe is the one Velora and NEAR Intents followed
(see `2026-07-27-impr-velora-active-transactions.md`,
`2026-07-24-impr-near-intents-active-transactions.md`,
`2026-08-12-feat-ck-swap-provider.md`).

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
  SOL → EVM/SOL are already present, so **no change is needed** for v1's routes.
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
- **Simulation.** By default LI.FI simulates the route against `fromAddress`; a route
  that would fail (e.g. no ERC-20 allowance yet, insufficient balance) returns no quote.
  `skipSimulation=true` turns that off.
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
Permit2 / EIP-712 signing and Jito bundles, and pull viem plus a second `@solana/kit`
version.

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

Because LI.FI's docs advise against client-side keys, **the flag-flip PR is gated on
LI.FI confirming in writing** that this key is meant for browser use, with origin
allow-listing for OISY's production domains, and confirming whether its 100 req/min
limit is per key or per IP. Until then the flag stays on `LOCAL || STAGING`, where the
traffic is negligible. The quote cadence below is chosen to keep per-user traffic low
either way.

### Quoting

New `fetchLifiSwapQuote` in `lib/services/lifi-swap.services.ts`, registered in both
`evmSwapProviders` and `solSwapProviders` behind `LIFI_SWAP_ENABLED`, with a LI.FI-specific
`getSupportedDestinations` (see [Destination support](#destination-support)). No
`getSupportedTokens`: LI.FI covers effectively every token on its chains, and a route
that does not exist simply returns no quote.

Because of the routing described in [Registries and fan-out](#registries-and-fan-out),
the two entries split the routes like this:

- `evmSwapProviders` entry — EVM → EVM.
- `solSwapProviders` entry — EVM → Solana, Solana → EVM and Solana → Solana. Its
  `getQuote` therefore receives both EVM and Solana sources and maps the chain id and
  token address from the source token's network, not from the registry it sits in.

Until `SwapSolWizard` can execute a LI.FI quote ([Solana execution](#solana-execution)),
the `solSwapProviders` entry returns `undefined` for a **Solana source**, so it only
offers EVM → Solana. Otherwise a LI.FI Solana-source offer could be shown and selected
while `SwapSolWizard` still sends every swap to `fetchNearIntentsSolSwap`. PR 3 lifts
that restriction together with the wizard dispatch (see [Delivery plan](#delivery-plan)).

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
  because an ERC-20 has no allowance yet or the user is mid-typing; the quote fetched at
  execution is simulated (see [EVM execution](#evm-execution),
  [Solana execution](#solana-execution)), so a route that would revert fails before
  anything is signed.
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

  | Entry              | EVM source       | Solana source                            |
  | ------------------ | ---------------- | ---------------------------------------- |
  | `evmSwapProviders` | `{ evm: 'any' }` | `undefined`                              |
  | `solSwapProviders` | `{ sol: 'any' }` | `{ evm: 'any', sol: 'any' }` (from PR 3) |

  Until PR 3, the `solSwapProviders` entry returns `undefined` for a Solana source,
  matching the quote restriction above.

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
never signed.

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
  - The recipient is the user's. For an EVM destination, `bridgeData.receiver` equals
    `toAddress`. For a Solana destination, `bridgeData.receiver` equals LI.FI's
    `NON_EVM_ADDRESS` sentinel (`0x11f111f111f111F111f111f111F111f111f111F1`), and
    `extractNonEVMAddress(data)` equals the user's Solana address as 32 bytes (the
    base58-decoded public key).

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
best-effort for WalletConnect, but fail-closed here. The result must show all of the
following:

- `preview.controlChanges` is empty. No owner, delegate or close-authority change on any
  user account.
- `unreadPrograms` is empty, and every top-level instruction's program is in
  `SOLANA_KNOWN_PROGRAM_ADDRESSES` or in a new pinned `LIFI_SOLANA_PROGRAM_ADDRESSES`. That
  list holds the LI.FI Solana bridge programs taken from LI.FI's `/tools`, plus
  `LIFI_DENY_*` for removals.
- **Spend is bounded.** The source token's delta on the user's accounts is no lower than
  `-fromAmount`. No other user token account decreases. `solDelta` is no lower than
  `-(fromAmount if the source is native SOL) - LIFI_SOL_MAX_FEE_LAMPORTS`. The cap is a
  new constant sized for priority fees plus ATA rent, with a measured value recorded next
  to it.
- **Receipt is bound (Solana → Solana).** The user's destination-token delta is at least
  the displayed quote's `toAmountMin`.

For **Solana → EVM**, the EVM recipient is inside the bridge program's own instruction
data, which nothing in the repo decodes. That leaves the residual risk described above:
funds can only leave through allow-listed programs and within the spend bound, but a
forged bridge recipient is not caught. See [Risks](#risks).

### EVM execution

New `fetchLifiEvmSwap` in `lib/services/swap.services.ts`, mirroring
`fetchVeloraMarketSwap`:

1. If the source is not native:
   `approve({ to: LIFI_DIAMOND_ADDRESSES[sourceNetworkId], amount: fromAmount, shouldSwapWithApproval: true, exactAllowance: true, … })`
   (`approve` names the spender `to`; see `ApproveParams` in `eth/types/send.ts`),
   then the same allowance poll Velora Market uses.

   `approve()` today has "at least" semantics: `checkExistingApproval`
   (`eth/services/approve.services.ts`) skips approval whenever the current allowance is
   already `>= amount`, so a leftover larger allowance would survive a smaller swap. The
   new opt-in `exactAllowance?: boolean` on `ApproveParams` changes only that branch. An
   allowance equal to `amount` is still `existingApprovalIsEnough`. Any other non-zero
   allowance, larger or smaller, goes through the existing `resetExistingApprovalToZero`
   path and is then approved to exactly `amount`. When the flag is absent, the behaviour
   is unchanged, so Velora and ckERC20 are not affected. That poll is not a named function:
   it is an inline `retryWithDelay({ maxRetries: 10, request })` around
   `erc20ContractAllowance` inside `fetchVeloraMarketSwap`
   (`lib/services/swap.services.ts`). Extract it into a small shared helper used by
   both, or repeat the same shape; do not invent a different poll. The spender is the
   **pinned** Diamond (which the displayed quote's `approvalAddress` already matched),
   so approval does not depend on a fresh quote.

2. **Re-quote with simulation on** (same params, `skipSimulation` omitted). The
   allowance now exists, so the simulation reflects the real transaction. Run
   `assertLifiQuote`; if no route comes back, or the new `toAmountMin` is below the
   displayed quote's `toAmountMin`, abort with the existing slippage-exceeded error
   mapping (Velora Delta's precedent). That mapping is a string-prefix check —
   `SwapEthWizard.svelte` turns an error whose message `startsWith('Slippage exceeded.')`
   into `swap.error.slippage_exceeded` — so the thrown error's message must start with
   exactly `Slippage exceeded.` (as `fetchVeloraDeltaSwap`'s does). An allowance of
   `fromAmount` to the pinned Diamond is left behind in that case. The next LI.FI swap's
   `exactAllowance` approval resets it to that swap's exact amount. Velora's
   `approve()` would not, which is why the flag exists. No revoke transaction is sent on
   abort.

   Then run `assertLifiEvmCalldata` on the new quote
   ([Calldata binding](#calldata-binding-evm-execution-time-quote)); a failure aborts
   with a generic swap error, not the slippage one.

3. `swap({ to: tr.to, transaction: { data: tr.data, gas: tr.gasLimit, value: tr.value, chainId: tr.chainId }, maxFeePerGas, maxPriorityFeePerGas, … })`
   — OISY's own EIP-1559 fees; LI.FI's `gasPrice` is ignored.
4. Create the AUT row (best effort), `enableSwapDestinationToken`.

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
/// Solana) and every route; the source tx hash, chain ids, route tool, and the
/// learned destination tx hash ride in `external_refs`.
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

| Key                    | Set           | Purpose                                                  |
| ---------------------- | ------------- | -------------------------------------------------------- |
| `lifi_tx_hash`         | creation      | source tx hash / Solana signature; `/status` key         |
| `lifi_from_chain`      | creation      | LI.FI source chain id                                    |
| `lifi_to_chain`        | creation      | LI.FI destination chain id                               |
| `lifi_tool`            | creation      | `step.tool`, passed as `bridge` to `/status`             |
| `lifi_transaction_id`  | creation      | LI.FI's id, for support / explorer links                 |
| `lifi_nonce`           | creation, EVM | replaced/dropped detection (Velora Market)               |
| `lifi_blockhash`       | creation, SOL | the transaction's recent blockhash; expiry detection     |
| `lifi_expired_seen`    | learned, SOL  | `'1'` once one poll has observed the expiry condition    |
| `lifi_dest_tx_hash`    | learned       | `receiving.txHash`                                       |
| `lifi_received_symbol` | learned       | `receiving.token.symbol` when it differs from the target |
| `lifi_received_amount` | learned       | that token's amount, **formatted** (see below)           |

Plus the shared display keys (`amount`, `source_token_symbol`, `source_network_symbol`,
`destination_token_symbol`, `destination_network_symbol`, `usd_source_value`), so
`ActiveUserTransactionItem` renders the row without new layout. An EVM row uses at most
15 of the 16 keys (`lifi_nonce`, no Solana keys), a Solana row at most 16
(`lifi_blockhash` + `lifi_expired_seen`, no `lifi_nonce`).

`lifi_received_amount` is stored as a **decimal string** — `receiving.amount` formatted
with `receiving.token.decimals` (`formatToken`) at the moment the poller learns it —
rather than in base units. The received token is usually one OISY does not know, so its
decimals would otherwise be lost, and a Solana row has no spare key to store them
separately.

#### Poller (`lib/services/lifi-active-tx.services.ts`)

Each tick, per pending LI.FI row:

1. **Source-chain check first** (until the source tx is confirmed):
   - EVM — reuse Velora Market's receipt + nonce logic: receipt `status: 0` → `Failed`
     (reverted); no receipt while the account nonce has passed `lifi_nonce`, seen on two
     consecutive polls → `Failed` ("replaced or dropped"). That logic is private to
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
        `lifi_expired_seen`. The next poll re-runs step 1, and only if it again finds no
        status is the row set to `Failed` ("expired, never landed"). This is the same
        two-observation guard Velora Market uses for "replaced or dropped", applied here
        because a `Failed` verdict is immutable.
2. **Then `getStatus({ txHash, fromChain, toChain, bridge })`**, mapped through
   `advanceStatus`:

| LI.FI                     | AUT                                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `NOT_FOUND`, `INVALID`    | no update (the source-chain check is authoritative)                   |
| `PENDING` (any substatus) | `Executing`                                                           |
| `DONE` / `COMPLETED`      | `Succeeded`                                                           |
| `DONE` / `PARTIAL`        | `Succeeded`; `lifi_received_symbol` / `lifi_received_amount` recorded |
| `DONE` / `REFUNDED`       | `Failed` with the "refunded" error (`swap.error.lifi_refunded`)       |
| `FAILED`                  | `Failed` with `substatusMessage` (truncated to 512)                   |

`PARTIAL` is a success because the user received full value, only in a different token
(typically a bridge's intermediate asset). The item then shows the token actually
received rather than claiming `dest_token`. `REFUNDED` is a failure because the swap did
not happen; the error copy says the funds were returned, and `lifiExplorerLink` is not
needed for that since the funds are back in the user's wallet.

Learned refs are merged on every poll. Errors are caught per row. Polls are throttled
per row inside the poller to LI.FI's recommended cadence — every 10 s for the first
minute after creation, every 30 s until 10 minutes, then every 60 s — on top of the
loader's 5 s tick.

#### Loader and UI

- `LoaderActiveUserTransactions.svelte`: a `tick` branch calling the LI.FI poller with
  `$ethAddress` / `$solAddressMainnet` (the loader imports only `ethAddress` today; add
  `solAddressMainnet` from `lib/derived/address.derived.ts`), and a terminal-status branch firing
  `TRACK_COUNT_SWAP_SUCCESS` / `_ERROR` with `buildLifiSwapTrackingMetadata`.
- `ActiveUserTransactionItem.svelte`: `isLifi` in the `isSwap` list and the
  `providerName` chain; when `lifi_received_symbol` is present, the received token and
  amount replace the destination token in the row.
- Wizard tracks `TRACK_COUNT_SWAP_SUBMITTED` (it is an active-transaction swap).

### Presentation

- `swapProvidersDetails[SwapProvider.LIFI]` — unconditional, `name: 'LI.FI'`,
  `website: 'https://li.fi'`, logo `static/images/dapps/lifi-logo.svg`. The PR ships a
  **placeholder** SVG at that path (a neutral rounded square with the text "LI.FI"); the
  official logo replaces the file later without any code change.
- `SwapDetailsLifi.svelte` in the provider sheet: estimated duration, LI.FI's 0.25 %
  fee (from `feeCosts`), the route tool name and minimum received.
- i18n keys in `en.json` + the other locales + `i18n.d.ts`: at least
  `swap.text.lifi_route_via`, `swap.error.lifi_refunded`,
  `swap.text.lifi_received_other_token`; optionally
  `help.text.explorers_lifi_description` for a help-page explorer entry.

## Delivery plan

| PR  | Scope                                                                                                                                                                                                                                                                                                                                                                                        | Depends on                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | **Backend AUT variant** — `Lifi(LifiData)`, validation, tests, regenerated `.did` / declarations                                                                                                                                                                                                                                                                                             | —                                   |
| 2   | **Scaffolding + EVM source** — `@lifi/sdk`, env, types, quote service + cache, trust checks + calldata binding, `exactAllowance` on `approve()`, LI.FI destination resolver + per-category wildcard, EVM registry entry, Solana registry entry **restricted to EVM sources** (EVM → Solana), provider sheet, EVM execution, Velora source-tx helper extraction, AUT utils/poller/loader/item | 1                                   |
| 3   | **Solana source** — lift the Solana-source restriction on the Solana registry entry, `fetchLifiSolSwap` with simulation binding, `SwapSolWizard` dispatch, Solana source-chain check in the poller                                                                                                                                                                                           | 2                                   |
| 4   | **Flip the flag** — `LIFI_SWAP_ENABLED = true` (one line) + `PRODUCT.md`                                                                                                                                                                                                                                                                                                                     | 3, LI.FI's written key confirmation |

If PR 2 is too large, split it into 2a (quoting + provider sheet) and 2b (execution,
AUT), with the flag narrowed to `LOCAL` until 2b lands, so no deployed environment ever
shows an offer that cannot be executed.

`docs/ai/PRODUCT.md` is updated in the PR that makes the behaviour reachable on a
deployed environment (PR 2 for staging), not after.

## Risks

- **Key quota exhaustion** — if LI.FI's limit turns out to be per key, heavy use could
  exhaust it; the fan-out degrades gracefully (no LI.FI quote) and the 30 s cadence keeps
  each open Swap form to ≈ 2 quote requests per minute plus input changes.
- **Unsigned quotes** — mitigated by the trust checks and, on the quote that is signed,
  by binding the calldata (EVM) or the simulated effects (Solana) to the request. Two
  residual risks remain:
  - The bridge leg's minimum output cannot be decoded client-side. A forged cross-chain
    route can underpay, but only to the user's own address.
  - On **Solana → EVM**, the bridge program's EVM recipient is not decoded. A forged
    transaction to an allow-listed bridge could send up to `fromAmount` elsewhere.

  Both need a compromised `li.quest` response over TLS. If the second is not acceptable,
  PR 3 ships Solana → Solana only and Solana → EVM waits for a per-bridge decoder.

- **Solana blockhash expiry** — between the execution re-quote and broadcast only one
  threshold Schnorr signature happens (seconds), well inside 60–90 s. A transaction
  that still expires is detected by the poller (no signature status + an invalid
  blockhash, on two consecutive polls) and ends `Failed`, never `Succeeded`.
- **Wrong terminal verdict is permanent** — `NOT_FOUND` / `INVALID` never terminate a
  row; only a source-chain failure or a LI.FI `DONE` / `FAILED` does.
- **Skipped simulation hides failing routes in the form** — accepted: a route that would
  revert is shown, but the simulated execution re-quote catches it before signing.

## Acceptance criteria

1. With `LIFI_SWAP_ENABLED` on, an EVM source token on any of the six EVM mainnets
   shows a LI.FI offer (when LI.FI has a route) for same-chain EVM, cross-chain EVM and
   EVM → Solana destinations, ranked by receive amount with the other providers,
   including Velora.
2. With the flag on, a Solana source shows LI.FI offers for Solana and EVM destinations.
3. BTC, XRP and ICP sources never request a LI.FI quote.
4. Form-time LI.FI quotes are requested with `skipSimulation`, at most once per 30 s for
   unchanged inputs, and immediately on any input change; execution-time quotes are
   simulated.
5. No LI.FI request carries a `fee` parameter.
6. A LI.FI quote whose `to` / `approvalAddress` is not the pinned Diamond for the source
   chain, whose echoed request differs from what was asked, whose Solana `data` is an
   array, or whose Solana transaction needs another signer, is never shown and never
   executed.
7. An ERC-20 swap leaves the pinned Diamond (which equals the quote's
   `approvalAddress`) with an allowance of exactly `fromAmount` before the swap: an
   existing allowance of any other non-zero value, larger or smaller, is first reset to
   zero. It then broadcasts the swap with OISY-computed EIP-1559 fees. A native swap does
   not approve. `approve()` callers that do not pass `exactAllowance` behave as before.
8. An EVM swap is never signed unless the Diamond's `CalldataVerificationFacet` decodes
   its calldata to the requested source token and amount, the user's recipient (EVM, or
   the user's Solana address for a Solana destination), the requested destination chain
   and, same-chain, a minimum output at least the displayed `toAmountMin`. A route with a
   destination call is never signed. A decode that reverts aborts the swap.
9. A Solana swap is never signed unless a simulation of its exact bytes succeeds, shows
   no control change and no unknown program, spends no more than `fromAmount` (plus the
   SOL fee cap) from the user's accounts and, Solana → Solana, credits at least
   `toAmountMin`. A failed or timed-out simulation aborts the swap.
10. The destination picker offers EVM and Solana tokens for an EVM source, and (from PR 3) EVM and Solana tokens for a Solana source, when LI.FI is the only provider
    covering that category.
11. A Solana swap signs LI.FI's transaction bytes unchanged (no recompilation) and
    broadcasts them.
12. After broadcast, the modal closes, an AUT row appears in the Active-transactions
    panel labelled "LI.FI", and it reaches `Succeeded` / `Failed` in the background,
    including after a page reload.
13. `DONE/PARTIAL` ends `Succeeded` and the row shows the token actually received, with
    its amount correctly formatted; `DONE/REFUNDED` ends `Failed` with the refunded copy.
14. A reverted / dropped (EVM) or reverted / expired (Solana) source transaction ends
    `Failed`; a `NOT_FOUND` status alone never terminates a row. A Solana row is marked
    expired only after two consecutive polls each find no signature status (searching
    transaction history) with the stored blockhash no longer valid.
15. `swap_submitted` fires from the wizard; `swap_success` / `swap_error` fire once from
    the loader on the terminal status.
16. With the flag off, nothing LI.FI-related is fetched or shown, but existing LI.FI AUT
    rows still render and poll.
17. No `@lifi/sdk-provider-*` package and no `executeRoute` are in the bundle.
18. Velora Market's replaced/dropped and revert detection behaves exactly as before the
    source-tx helper extraction.

## References

- LI.FI: https://docs.li.fi/sdk/overview, https://docs.li.fi/api-reference/get-a-quote-for-a-token-transfer,
  https://docs.li.fi/api-reference/check-the-status-of-a-cross-chain-transfer,
  https://docs.li.fi/api-reference/rate-limits,
  https://docs.li.fi/introduction/lifi-architecture/bitcoin-overview,
  https://docs.li.fi/introduction/user-flows-and-examples/bitcoin-tx-example,
  https://docs.li.fi/introduction/user-flows-and-examples/solana-tx-execution,
  https://github.com/lifinance/contracts/tree/main/deployments
- Specs: `2026-07-27-impr-velora-active-transactions.md`,
  `2026-07-24-impr-near-intents-active-transactions.md`,
  `2026-08-25-feat-near-intents-btc-swap.md`, `2026-08-12-feat-ck-swap-provider.md`
- Precedent commits: `78d5addbd` (Velora backend AUT variant), `0c53b9421` (Velora
  frontend AUT), `2a8128636` (Chain Fusion as a swap provider)
