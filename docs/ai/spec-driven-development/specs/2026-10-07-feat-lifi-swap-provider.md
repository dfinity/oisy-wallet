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
unit tests) once a LI.FI offer can be executed (PR 2b; `false` everywhere before that),
until a separate one-line PR enables it everywhere. That PR is gated on the
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
- Velora Market and NEAR Intents create their row **best effort, after the point of no
  return** (the broadcast), with try/catch + `consoleError`. LI.FI does not (decided
  2026-10-19): its row is created **after signing and before the broadcast**, as XRP
  sends record theirs, and a swap whose row cannot be created is not broadcast. A row
  whose transaction the node definitively refuses is deleted, as a cycles mint deletes a
  row whose ICP never moved (`deleteRow` in `icp/services/cycles-mint.services.ts`); any
  other broadcast failure keeps it (see [EVM execution](#evm-execution), step 6). So no
  LI.FI swap is ever broadcast untracked.

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
live in), wrapping `getQuote` (PR 2a-1) and `getStatus` (PR 2b):

```ts
createClient({
	integrator: LIFI_INTEGRATOR,
	apiKey: LIFI_API_KEY,
	disableVersionCheck: true, // createClient reads process.env.NODE_ENV otherwise
	preloadChains: false // avoid an eager /chains fetch at import time
});
```

The deny lists are not set as client `routeOptions`: the SDK would then serialise an
empty list as an empty `denyBridges=` parameter on every request. Every quote already
sends `allowBridges`, and LI.FI's docs do not say how an allow and a deny list combine (a
probe on 2026-10-14 accepted both, with the deny list winning), so a denied bridge is
removed from the allow-list before the request and `denyBridges` is never sent. Once
every bridge of a Diamond is denied, its cross-chain pairs get no quote; same-chain
pairs need no bridge and are still quoted. `denyExchanges` is sent only when it names a
tool.

### Env

New `src/frontend/src/env/rest/lifi.env.ts`, modelled on `near-intents.env.ts`:

- `LIFI_SWAP_ENABLED` — `false` everywhere, local included, in PRs 2a-1 and 2a-2 (no
  wizard can execute a LI.FI offer yet); `(LOCAL || STAGING) && !TEST` from PR 2b (feature
  tests switch it on); `true` from PR 4. See [Delivery plan](#delivery-plan).
- `LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY` — see [API key](#api-key).
- `LIFI_INTEGRATOR = import.meta.env.VITE_LIFI_INTEGRATOR` — the integrator id
  registered with LI.FI. `createClient` throws without one, so the client is created
  lazily on first use, and while the variable is unset the LI.FI provider returns no
  quote instead of failing at import time.
- `LIFI_DIAMOND_ADDRESSES: Partial<Record<NetworkId, EthAddress>>` — the six Diamonds
  listed in [Background — LI.FI](#background--lifi), pinned from LI.FI's deployment
  files, never from a quote. An EVM network without an entry is never quoted, on either
  side. Solana mainnet has no entry and is quoted as a destination only (and as a source
  from PR 3, where the Solana checks replace the Diamond).
- `LIFI_ALLOWED_BRIDGES: Partial<Record<NetworkId, string[]>>` — the curated bridge tool
  keys per source Diamond (see [Calldata binding](#calldata-binding-evm-execution-time-quote)):
  `['across', 'near']` on the five Diamonds that carry both facets, `['across']` on
  Robinhood Chain. LI.FI serves Mayan under four tool keys (`mayan`, `mayanWH`,
  `mayanMCTP`, `mayanFastMCTP`, checked on `/v1/tools` 2026-10-14); none is listed until
  it is confirmed that its calldata goes through `MayanFacet`.
- `LIFI_DENY_BRIDGES: string[] = []` and `LIFI_DENY_EXCHANGES: string[] = []` — LI.FI's
  full exchange set is allowed; these exist so a misbehaving bridge or exchange can be
  blocked with a one-line change (keys from LI.FI's `/tools`). A denied bridge is dropped
  from `LIFI_ALLOWED_BRIDGES`; a denied exchange is sent as `denyExchanges`.
- Solana's LI.FI chain id is the SDK's own `ChainId.SOL`, not a local constant.

### API key

The key and the integrator id ship in the client bundle as `VITE_LIFI_API_KEY` and
`VITE_LIFI_INTEGRATOR`, exactly like `VITE_INFURA_API_KEY`: both are added (empty) to
`.env.example` and `.env.test`, and to the CI secret plumbing in
`.github/workflows/deploy-to-environment.yml` and its release callers. The workflow builds
staging, `test_fe_*`, audit and beta from the repository secrets `VITE_LIFI_API_KEY_STAGING`
/ `VITE_LIFI_INTEGRATOR_STAGING` (overridable per `test_*` / audit deploy, like the other
keys) and `VITE_LIFI_API_KEY_BETA` / `VITE_LIFI_INTEGRATOR_BETA`, all optional: a deploy
without them builds with no LI.FI quote. Local and production builds read
`.env.development` and `.env.production`. Their values are set outside the repository.

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
what it is today. PR 3 replaces the empty list with a **mainnet-only list**, not with a
wildcard: the `sol` category is a chain family, not an environment, so a wildcard would
also admit the devnet and local SOL tokens that `enabledSolanaTokens`
(`sol/derived/tokens.derived.ts`) includes when testnets are on, and `isPageTokenSwappable`
would show the Swap action on them while the chain-id mapping below returns no quote.
From PR 3 the Solana entry's `getSupportedTokens` returns the identifiers of every
Solana **mainnet** token known at load time — native SOL on `SOLANA_MAINNET_NETWORK_ID`
and every token of `splTokens` whose network is Solana mainnet, read with `get()` and
keyed through `resolveSwapTokenLookup` so the identifiers stay in the filter's key
space. `loadSwapSupportedTokens` runs on every Swap modal open (`SwapLoader.svelte`), so
a custom SPL token the user added since the last load is covered the next time the
modal opens. The category keeps coverage `all` (NEAR Intents and LI.FI both list), and
the union is NEAR's list plus every known mainnet SPL token. The EVM entry needs no such
guard, because Velora is already a wildcard for the EVM category; that Velora's wildcard
admits Sepolia tokens the same way is pre-existing and out of scope here.

Solana-source quotes pass `allowExchanges` limited to `LIFI_SOLANA_ALLOWED_EXCHANGES`, the
LI.FI tool keys of the aggregators that execution can bind: those with pinned
instructions and a minimum-output decoder (see
[Solana transaction binding](#solana-transaction-binding-execution-time-quote)). v1 is
`['jupiter']` (the key LI.FI's `/tools` lists). Without it, LI.FI displays a route that
would always abort at execution: its best Solana → Solana route is DFlow's (SOL → USDC and
USDC → SOL, 2026-10-22), and `/tools` lists Fly, OKX, Titan and others besides. Pinned to
`jupiter`, the same requests come back as Jupiter routes. The list and the route
entrypoints `assertLifiSolInstructions` pins change together, as `allowBridges` and the
curated bridge facets do on EVM; DFlow joins only with its own pinned instructions and
minimum-output decoder (see [Decisions](#decisions)).

A Solana route from or to SOL is offered only if it would not unwrap wSOL the user holds.
LI.FI's routes use the wallet's own wSOL account when it has one, and close it at the end
(see [Solana transaction binding](#solana-transaction-binding-execution-time-quote)); if
that account holds wSOL, the close would unwrap all of it into SOL, which the binding
refuses. Refused only at execution, the swap would fail after the user confirmed it. So
whenever the display quote's transaction closes the user's wSOL account, that account is
read once (`loadLifiSolQuoteCeiling`, uncached), even when the transaction creates it
first: `CreateIdempotent` leaves an existing account as it is, so a creation does not show
the account to be new. Holding wSOL, or not reading as a token account, the route gets no
LI.FI offer; an account that does not exist holds none. In
v1 a user who holds wSOL has no LI.FI offer for swaps from or to SOL; NEAR Intents still
serves them. Whether LI.FI can be asked for a temporary account instead is not known.

- Maps OISY network → LI.FI chain id (EVM: the network's `chainId`; Solana mainnet →
  `1151111081099710`). Non-mainnet networks → `undefined` (no quote).
- Token address: ERC-20 / SPL address; native EVM →
  `0x0000000000000000000000000000000000000000`; native SOL →
  `11111111111111111111111111111111`.
- `fromAddress` = the user's source-chain address (`userAddress`); `toAddress` = the
  `recipientAddress` quote param (already resolved by `fetchSwapAmounts`), falling back
  to `userAddress` when absent only for an EVM destination — a Solana destination
  without a Solana recipient gets no quote — and always passed explicitly to LI.FI.
- `slippage` = OISY's slippage percentage / 100; a value outside (0, 1) gets no quote.
- `order: 'CHEAPEST'`.
- `allowBridges` = the source Diamond's `LIFI_ALLOWED_BRIDGES`, on every quote.
- `allowDestinationCall: false` — the SDK's default is `true`, and execution refuses any
  route whose bridge data has a destination call.
- **`skipSimulation: true`** for every form-time quote. Display quotes must not vanish
  because an ERC-20 has no allowance yet or the user is mid-typing. The quote fetched
  right before signing is simulated (see [EVM execution](#evm-execution),
  [Solana execution](#solana-execution)); on EVM, though, what actually refuses a
  reverting route before anything is signed is OISY's own `eth_estimateGas` on the
  checked transaction, not LI.FI's simulation, whose no-quote-on-failure behaviour the
  docs do not promise (see [Background — LI.FI](#background--lifi)).
- Returns `undefined` on any error (Velora's convention), including the 404 "no
  available quotes" and the 422 "none of the available routes could successfully
  generate a tx" (not `SwapAmountTooLowError`, since LI.FI does not tell us the
  minimum). Fires `PLAUSIBLE_EVENTS.SWAP_OFFER` like Velora, but on failure without the
  error text: LI.FI's errors can carry the request URL and with it the user's address
  (analytics invariant 4). A failure reports an allow-listed `result_error_type` —
  `no_route` (404, 422), `rate_limited` (429), `quote_rejected` (a failed trust check),
  `timeout` (aborted after `LIFI_QUOTE_TIMEOUT_MS`) or `request_failed` — plus the HTTP
  status as `result_error_code`. `quote_rejected` carries `event_severity: error`;
  `rate_limited`, `timeout` and `request_failed` carry `warn`, so a LI.FI outage shows on
  severity-filtered monitoring; `no_route` is a normal answer and carries none.
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
  `lib/utils/lifi-swap.utils.ts`. It applies the same chain and token tests as the quote
  request (`toLifiChainId`, `toLifiTokenAddress`), so it returns `undefined` for any
  source LI.FI is never asked about — a chain without a pinned Diamond, a testnet, a
  devnet, ICP. Otherwise it returns the destinations that entry actually quotes:

  | Entry              | EVM source       | Solana source                |
  | ------------------ | ---------------- | ---------------------------- |
  | `evmSwapProviders` | `{ evm: 'any' }` | `undefined`                  |
  | `solSwapProviders` | `{ sol: 'any' }` | `{ sol: 'any' }` (from PR 3) |

  Until PR 3, the `solSwapProviders` entry returns `undefined` for a Solana source and
  declares an empty source list, matching the quote restriction above.

  A wildcard admits every **enabled** token of its category, testnets included. For EVM
  destinations nothing changes, since Velora's `{}` already does that. For Solana
  destinations of an EVM source it does: with testnets on, devnet SOL tokens now pass the
  picker next to NEAR Intents' mainnet list, and selecting one yields no LI.FI offer (the
  quote refuses a devnet). This is the destination-side twin of the source-side case PR 3
  avoids with a mainnet-only list; it is accepted for v1 because it affects testnet users
  only and offers nothing that could be executed.

#### Cadence: on input change, then every 30 s

LI.FI does not ride the shared 5 s refresh. `fetchLifiSwapQuote` keeps a single
module-level cache entry `{ key, result, settledAt }`, where `key` is the serialised
request (chains, tokens, amount, both addresses, slippage) and `settledAt` is set when
`result` settles:

- a different key (any input change) fetches immediately and replaces the entry;
- the same key returns the cached mapped result until `LIFI_QUOTE_REFRESH_INTERVAL_MS`
  (30 000 ms) has passed since `settledAt`, and re-fetches after that;
- an in-flight request for the same key is shared, not duplicated, however long it takes;
- every quote request times out after `LIFI_QUOTE_TIMEOUT_MS = 10_000` (the SDK sets no
  timeout), so a stalled request settles as a failure instead of pinning the cache, and
  cannot hold back the other providers' offers, which the swap form shows only once every
  provider has answered.

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
  bundle — is rejected); the decoded transaction is a **version 0** message, its fee
  payer is the user's address and it requires no signer other than the user; every
  `swap` step of the route uses an exchange of `LIFI_SOLANA_ALLOWED_EXCHANGES` (the
  request pins them, and the check keeps that pin working if LI.FI ignores it). Version
  0 is what LI.FI sends (every captured transaction, DFlow's and Jupiter's, with address
  lookup tables, 2026-10-22), and what the fee is priced for: a version 1 message states
  its priority fee and compute unit limit in its config, and the network runs its Compute
  Budget instructions as no-ops (`mapSolTransactionMessage` already prices WalletConnect's
  that way), so a fee read from its instructions would not be the fee it pays. A legacy
  or version 1 message is refused at display and at execution alike. Lands in PR 3 with
  the first Solana-source quote; until then no Solana-source quote is requested.
- **Echo**: `action.fromChainId`, `action.toChainId`, `action.fromToken.address`,
  `action.toToken.address`, `action.fromAmount` and `action.toAddress` equal what OISY
  asked for.
- **Route tools**: every `cross` step in `includedSteps` uses a bridge the request's
  `allowBridges` names, and no `swap` step uses an exchange in its `denyExchanges`. The
  lists are only request parameters, so this keeps the deny lists working if LI.FI ignores
  or misreads them (step tool keys match the request's keys, checked 2026-10-19).
- **Route shape** (from PR 2b-5): a trusted quote is offered only if the calldata binding
  could accept its route, judged from its steps (`isLifiRouteExecutable`, next to the
  binding's bridge table in `lifi-calldata.utils.ts` and read from it): a bridge the table
  has, no `swap` step before a bridge that cannot bound a swap's output (`dexSwaps: false`,
  Across; see [No DEX swap before Across](#calldata-binding-evm-execution-time-quote)),
  and no step after the `cross` step, whose bridge would then pay out another token than
  the one requested. Read from the table, a bridge added to it, or to the allowed keys
  without it, cannot be offered where the binding would refuse it. This is not a trust check: such a quote is a route OISY cannot execute, not
  a forged one, and is tracked as no route. A Solana-source quote's route shape is its
  transaction itself (from 3d-1): `loadLifiSolQuoteCeiling` reads it as the binding does
  before signing — lookup tables resolved, the pinned instructions, the LI.FI ceiling
  bounded — short of the simulation, and a quote it refuses gets no offer. Unlike EVM's
  route shape, that refusal is tracked as a rejected quote (`quote_rejected`, error
  severity, the binding's refusal as the cause): the Solana trust checks do not read the
  instructions, so the pin is the only check of what the transaction does, and a forged
  one or a change in LI.FI's transactions that the pin does not know yet must show. A route
  that would unwrap the wSOL the user holds is a route OISY cannot take, tracked as no
  route; a read that fails, the Token-2022 mint's included, as a failed request. Those RPC
  reads share the quote's `LIFI_QUOTE_TIMEOUT_MS` deadline
  (`untilAborted`): they cannot be handed its signal, and the form waits for every
  provider's answer, so a read that stalls ends the offer as a timeout rather than holding
  the whole quote, and the quote cache with it.

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

`assertLifiEvmCalldata` (`lib/services/lifi-calldata.services.ts`) decodes
`transactionRequest.data` **locally**, with the pinned ABI of the function its selector
names (`Interface` from `ethers/abi`, as `approve.services.ts` does), and checks the
decoded values in `assertLifiCalldata` (`lib/utils/lifi-calldata.utils.ts`). Any
selector outside the pinned ABIs, or calldata that does not decode as its function,
aborts the swap (fail closed).

This was first designed around the Diamond's own `CalldataVerificationFacet`, called as
an `eth_call`. It cannot be: on the Ethereum, Arbitrum, BSC, Polygon and Base Diamonds
the deployed facet is v1.1.1, which lacks `extractNonEVMAddress`, the Solana-receiver
extractor, and only Robinhood Chain's carries v2.0.0 (`DiamondLoupe.facetAddress`,
checked 2026-10-19). Decoding locally needs the bridge facets' own ABIs anyway, to bind
their receiver and refund fields, so the facet would only have added an RPC call and a
second decoder to keep in step (decided 2026-10-19).

**The selector picks the function, and only then is the calldata decoded.** A decoder
that reads any calldata with one layout would let a forged response call a function
whose real semantics differ while arranging its bytes to decode as the expected token,
amount and recipient. Decoding as a function looked up by selector in a pinned ABI
(`eth/constants/lifi.constants.ts`) rules that out:

- `LIFI_GENERIC_SWAP_ABI` — `GenericSwapFacetV3`'s six `swapTokensSingleV3*` /
  `swapTokensMultipleV3*` functions, the only ones same-chain routes call.
  `GenericSwapFacet.swapTokensGeneric` (V1) is registered on none of the pinned Diamonds,
  and is not pinned.
- One ABI per curated bridge facet, keyed by LI.FI tool key in
  `lifi-calldata.utils.ts`: its `startBridgeTokensVia*` and
  `swapAndStartBridgeTokensVia*`, each taking `BridgeData` first. A cross-chain route
  may only call a function of a bridge its request allowed (`allowBridges`, the keys the
  display quote was limited to, less `LIFI_DENY_BRIDGES`), so the two can never
  disagree. A bridge allowed but without a pinned ABI and decoder gets no execution.

The structs are taken from the facet sources in `lifinance/contracts`, at the versions
deployed on the pinned Diamonds (`AcrossFacetV4` 1.0.0, `NEARIntentsFacet` 3.0.0, and
`GenericSwapFacetV3`, whose six selectors are all registered), and each pinned
function's selector was resolved to its facet by every pinned Diamond's
`DiamondLoupe.facetAddress` (2026-10-19). A spec pins the ABIs to those selectors, so a
mistyped struct fails a test rather than decoding real calldata wrongly; specs on real
LI.FI calldata (same-chain, Across EVM → EVM, NEAR Intents EVM → EVM and EVM → Solana,
captured 2026-10-19) cover the decode end to end.

**Bridges are curated, and each one's effective receiver is decoded.** `bridgeData.receiver`
is not always the address the bridge pays: some facets carry the receiver again in their
bridge-specific data, and that copy is what the bridge consumes (Across V4's
`AcrossV4Data.receiverAddress`, for example). A forged response could keep
`bridgeData.receiver` equal to the user while setting the effective receiver to an
attacker. So only facets with a pinned ABI and a decoder for the bridge-specific struct
are offered, and every receiver-like and refund field in it must equal the user (an EVM
address left-padded to `bytes32`, or the user's Solana key). v1:

| Facet              | Fields bound to the user (bridge-specific data)          |
| ------------------ | -------------------------------------------------------- |
| `AcrossFacetV4`    | `receiverAddress` (EVM or Solana), `refundAddress`       |
| `NEARIntentsFacet` | `nonEVMReceiver` (Solana destination), `refundRecipient` |
| `MayanFacet`       | not offered yet (its four tool keys are not confirmed)   |

`NEARIntentsData.nonEVMReceiver` is bound for a Solana destination only: for an EVM one
the facet signs over `bridgeData.receiver`, which is bound, and does not read it. NEAR
Intents also carries a `depositAddress` and a LI.FI backend signature over the payload,
which the facet verifies on chain, so a forged response cannot invent them; binding the
receiver and refund fields still matters, because a valid signed payload made out to
someone else could be spliced into the user's response.

Adding a bridge later means adding its ABI, decoder, calldata fixture and tool key
together, and, if it charges a native fee on top of the amount (`feeCosts` with
`included: false`; Across's fees are all included, checked 2026-10-19), widening the
`value` trust check to admit exactly that fee and showing it in a row of its own, since
"Swap Fees" counts only the fees taken out of the receive amount. Every other bridge gets
no quote: the display quote passes `allowBridges` limited to the curated tool keys, so
the form never offers a route that execution would refuse.

Not every Diamond carries every facet. Robinhood Chain's has `AcrossFacetV4` but not
`NEARIntentsFacet` (checked 2026-10-19), so the curated `allowBridges` keys are kept
**per Diamond** in `lifi.env.ts` (`LIFI_ALLOWED_BRIDGES`), and EVM → Solana from
Robinhood Chain is Across-only until LI.FI deploys the other facets there.

Then the decoded values are compared with the request. For **every** route, the full
`SwapData[]` is bound, not just its first entry: the Diamond pulls `fromAmount` of
`sendingAssetId` from the user for **each** entry with `requiresDeposit = true`, so a
forged later entry could pull another asset the user has already approved to the
Diamond. `swapData[0]` must have `requiresDeposit = true` with the source token and
`fromAmount` (on real routes it is LI.FI's own fee collection, calling its
`FeeForwarder`); every later entry must have `requiresDeposit = false`.

**Every swap call in `SwapData[]` is bound too, not only its deposit flag.** The Diamond
executes each entry's `callTo` with `callData` (after approving `approveTo`), so a forged
quote could append a call with side effects unrelated to the bound deposit. Decoding
every DEX's payload client-side is not practical, so the binding has two layers:

- **LI.FI's on-chain allow-list is the trust anchor, checked before signing.** The
  Diamond refuses any swap call whose `(callTo, selector)` is not whitelisted, and an
  `approveTo` other than `callTo` unless it is whitelisted under
  `APPROVE_TO_ONLY_SELECTOR` (`0xffffffff`) (`LibAllowList.contractSelectorIsAllowed` in
  `SwapperV2` and `GenericSwapFacetV3`, `lifinance/contracts`). OISY checks the same
  first: for each entry, `isContractSelectorWhitelisted(callTo, callData[0:4])`, and for
  an `approveTo` other than `callTo`, `isContractSelectorWhitelisted(approveTo,
0xffffffff)` — except for a native sending asset, which is not approved — through
  `WhitelistManagerFacet` on the pinned Diamond, as an `eth_call`
  (`InfuraLifiProvider`). Any `false`, or a failed read, aborts. This turns an on-chain
  revert into a pre-signing refusal and makes the trust explicit: OISY trusts LI.FI's
  whitelist governance, not the unsigned quote.
- **No call can target a token or the Diamond.** Whitelisted calls run with the Diamond
  as `msg.sender`, so the only user funds they could reach are the user's allowances to
  the Diamond. Each entry's `callTo` and `approveTo` must differ from the Diamond and
  from every asset of the route (the source and destination tokens, and every
  `sendingAssetId` / `receivingAssetId`), and must not be any ERC-20 of the user's on
  that network with an allowance to the Diamond (no `transferFrom(user, …)` through the
  Diamond). Those allowances are read before signing, of the ERC-20s and ERC-4626s OISY
  knows on that network, enabled or not, since hiding a token does not revoke its
  allowance (`lifiUserTokenAddresses`), for the ones a swap step calls or approves
  (`lifiCalldataSwapTargets`), the only ones the check could refuse: reading every one
  cost up to 75 reads per execution, on Robinhood Chain. A read that fails counts the token
  as approved. A token without an allowance cannot be
  spent through the Diamond, and some are DEX pools a route may call (a Uniswap V2 pair,
  a Curve or Balancer pool token), so it is not refused. An allowance the user granted the
  Diamond through another dapp, for a token OISY does not know, cannot be listed: there,
  LI.FI's whitelist, which lists no token's transfer functions, remains the guard.
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
- **LI.FI's fee forwarding is the one swap call whose arguments are decoded.** The
  whitelist admits `FeeForwarder` (2.0.0) by contract and selector only, while its
  arguments decide who is paid and how much of the deposit leaves: a forged first entry
  could forward most of it elsewhere and bridge the rest. Every entry calling
  `forwardERC20Fees` / `forwardNativeFees` (`LIFI_FEE_FORWARDER_ABI`) must forward the
  source token and pass it through (`sendingAssetId`, `receivingAssetId` and `_token` all
  the source token), and together they may forward at most `LIFI_FEE_BPS` (25) of
  `fromAmount`, rounded down as LI.FI rounds it. That is what every captured route
  forwards, to a single recipient (2026-10-19); OISY charges no fee of its own. If LI.FI
  raises its fee, its routes are refused until the constant follows.

- **Same-chain** (`fromChainId === toChainId`): the `GenericSwapFacetV3` arguments.
  `_receiver` equals `toAddress`, `_minAmountOut` (the on-chain minimum) is at least the
  displayed quote's `toAmountMin`, the last entry's `receivingAssetId` is the destination
  token, and `SwapData[]` is bound as above. The function itself must match the request
  too: its name's input (`…V3ERC20To…` / `…V3NativeTo…`) is native exactly when the source
  token is, and its output (`…ToERC20` / `…ToNative`) exactly when the destination token
  is. The six functions share one layout, so a response can swap the selector and keep
  every argument above intact, while each function moves funds by its own mode: a
  `…ToNative` one pays out the Diamond's whole native balance and checks the minimum
  against it, whatever the swaps produced. Called for an ERC-20 destination, it would leave
  the user's swapped tokens in the Diamond and pay them its native dust, which reaches a
  minimum counted in the token's units as soon as it holds that many wei.
- **Cross-chain**: `(bridgeData, swapData[], facetData)`, or `(bridgeData, facetData)`
  for a `startBridgeTokensVia*` function.
  - `bridgeData.hasDestinationCall` is `false`. v1 has single-step routes only, and a
    destination call can forward funds anywhere.
  - `bridgeData.hasSourceSwaps` matches the function called (`swapAndStart*` or
    `start*`).
  - `bridgeData.destinationChainId` equals the LI.FI destination chain id.
  - The input is the user's: with source swaps, `swapData[0]` as above; without,
    `bridgeData.sendingAssetId` and `bridgeData.minAmount` equal the source token and
    `fromAmount`.
  - The recipient is the user's, both in `bridgeData` and in the facet's own data (see
    the curated table above). For an EVM destination, `bridgeData.receiver` equals
    `toAddress`. For a Solana destination, `bridgeData.receiver` equals LI.FI's
    `NON_EVM_ADDRESS` sentinel (`0x11f111f111f111F111f111f111F111f111f111F1`, declared in
    `src/Helpers/LiFiData.sol`, the base every facet inherits — not in `LibAsset` or
    `ILiFi`, where a reader would look first), and the facet's own receiver field
    equals the user's Solana address as 32 bytes (the base58-decoded public key). Read
    from the facet's own struct by its decoder, that field means the same for every
    curated facet; a bridge whose data carries no non-EVM receiver cannot serve Solana.
  - The bridge sends what the swaps produce: with source swaps, the last entry's
    `receivingAssetId` equals `bridgeData.sendingAssetId`. `SwapperV2` floors the last
    swap's output at `minAmount` while the facet sends `bridgeData.sendingAssetId`; were
    they to differ, the bridge would send the Diamond's own balance of another token and
    leave the user's behind. Across's own `sendingAssetId`, the SpokePool's input token
    for an ERC-20, equals it too (a native token is sent as the facet's wrapped native,
    whatever that field says).
  - The payout is the requested one, read from the facet's own data (see below): its
    destination asset is the requested token, as that bridge names it, and its minimum
    output is at least the displayed quote's `toAmountMin`.
  - Before Across, the only swap is LI.FI's fee forwarding (see below).

Native tokens are `0x0000000000000000000000000000000000000000` on both sides of the
comparison, except in a bridge's own data. Addresses are compared case-insensitively and
amounts as `bigint`s.

**Each curated bridge's payout is decoded too.** `bridgeData` names neither the asset a
bridge pays out nor how much, so a forged response could keep every field above and pay
another token, or too little of it. v1:

| Facet              | Destination asset (bridge-specific data)                                                                                                                                                                                  | Minimum output                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `AcrossFacetV4`    | `receivingAssetId`: the token left-padded, or its mint; a native coin as its SpokePool's wrapped native (`LIFI_ACROSS_WRAPPED_NATIVE`), which the SpokePool unwraps; never that wrapped native as a token, nor native SOL | after source swaps, `minAmount × outputAmountMultiplier / 1e18` (the facet replaces `outputAmount` with it); without, `outputAmount` |
| `NEARIntentsFacet` | `destinationAsset`: the token left-padded, or its mint; any native coin, EVM or SOL, as `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` left-padded                                                                          | `minAmountOut`                                                                                                                       |

`LIFI_ACROSS_WRAPPED_NATIVE` holds the wrapped native of Across's SpokePool on each of the
six EVM chains, as each SpokePool's `wrappedNativeToken()` answered on 2026-10-20 (the
SpokePools of LI.FI's `config/across.json`; the same tokens as its `config/networks.json`):
WETH on Ethereum, Arbitrum, Base and Robinhood Chain, WPOL on Polygon, WBNB on BSC. When
that token is the output, the SpokePool unwraps it for a wallet recipient
(`_unwrapwrappedNativeTokenTo`, which keeps it wrapped only for a contract), whatever was
asked for. So it pays out a native coin, and it can never pay out that token as itself: a
request for WETH as an ERC-20 is refused through Across, since calldata naming WETH is
exactly a native ETH payout. A chain without an entry gets no payout through Across.
LI.FI's own Across routes to WETH bridge another token and swap after the bridge
(`smartDeposits`, 2026-10-20), which the binding refuses as paying out another token.

**No DEX swap before Across.** Across's minimum output is unsigned: after source swaps,
the facet pays `minAmount × outputAmountMultiplier`, both from the response, and
`SwapperV2` only makes the swaps produce `minAmount`. A DEX call's recipient is in
calldata OISY does not decode, so a forged route could send a DEX swap's output
elsewhere, lower `minAmount` to what is left and raise the multiplier to keep the
product above `toAmountMin`. Every check would pass, no relayer would fill the deposit,
and only what is left would be refunded. With LI.FI's fee forwarding alone before it, the
bridge sends `fromAmount` less the bound fee, and a wrong multiplier can at worst leave
the deposit unfilled until its fill deadline and refunded to the user (see below for how
long that can be). NEAR Intents is not
exposed: LI.FI's backend signs `minAmountOut` together with `minAmount`, so a payload
paying at least `toAmountMin` carries the `minAmount` LI.FI priced for it, and the swaps
before the bridge must produce it. So an Across route whose `SwapData[]` holds anything
but the fee forwarding is refused (decided 2026-10-19).

LI.FI often quotes Across behind a DEX swap (ETH → USDC, DAI → USDC, USDC → USDT0 before
the bridge, 2026-10-19), and quotes WETH destinations through Across followed by a
destination swap (2026-10-20), so the form must not offer such routes either. When LI.FI's
best route goes through a bridge in a shape the binding refuses (Across behind a DEX swap,
any bridge followed by another step), `fetchLifiSwapQuote` asks it once more without that
bridge, so that another allowed one can serve the pair, and offers nothing if that route
cannot be executed either (decided 2026-10-20, any bridge since 2026-10-22). A route
through a bridge the request did not allow is not re-quoted: asking without it would ask
the same. Both requests share one `LIFI_QUOTE_TIMEOUT_MS` deadline: the form shows its
offers once every provider has answered, and two in turn could hold it for 20 s. The offer
carries the request it answers (`SwapMappedResult.request`), so execution re-quotes
without that bridge too.

**Across's fill is open, and its refund comes soon.** `AcrossV4Data` also sets who may fill
the deposit and until when. A forged response could name an exclusive relayer it controls,
which never fills, and the latest fill deadline the SpokePool accepts: the user's funds
would wait that long for their refund. So exclusivity must be off (no `exclusiveRelayer`,
or an `exclusivityParameter` of zero, either of which leaves the fill to any relayer), and
the `fillDeadline` at most `LIFI_ACROSS_MAX_FILL_DEADLINE_SECONDS` (3 h) after the time of
signing. Every live LI.FI Across quote sets no exclusivity and a deadline 2.5 h ahead,
while the SpokePools accept up to 6 h (`fillDeadlineBuffer`, read on Arbitrum, Base and
Robinhood Chain, 2026-10-20); the margin covers the quote's age and a client clock off by
minutes. `quoteTimestamp` needs no check: the SpokePool refuses one more than an hour old.

What remains for a forged route is an Across deposit that no relayer fills and that is
refunded to the user within 3 h; see [Risks](#risks). It can no longer redirect funds to
someone else, or pay the user less than displayed.

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

**Pre- and post-state are read at the same slot.** The deltas below are only evidence of
what the transaction does if both sides of the diff describe the same chain state.
`simulate` in `sol-simulation.services.ts` fires `getMultipleAccountsInfo` and
`simulateTransactionAccounts` concurrently, and `getMultipleAccountsInfo`
(`sol/api/solana.api.ts`) discards the response's `context.slot`, so the two can observe
different slots and any unrelated activity on the user's accounts in between (an incoming
transfer, another pending transaction of the user's) is folded into the deltas. For the
WalletConnect review that is noise; here it would let a credit the transaction did not
cause satisfy the receipt bound, or hide part of the spend. So `simulateSolTransaction`
gains a `consistentSnapshot` option, `false` by default (WalletConnect unchanged), and
LI.FI passes `true`, which changes the run in three ways:

- `getMultipleAccountsInfo` keeps its current signature and return type: it is consumed
  as a plain account array by `sol-balances.services.ts` (`results.flat()`) and by the
  account-info cache in `solana.api.ts` itself, which indexes the result. A new sibling,
  `getMultipleAccountsInfoWithContext`, returns `{ slot, value }` from the same RPC
  response, and the existing helper becomes a thin wrapper over it that drops the slot,
  so no caller or test changes. `simulateTransactionAccounts` gains an optional
  `minContextSlot` and returns the response's `context.slot` next to its existing fields
  (an added field; WalletConnect ignores it). Both calls already go to the same
  `solanaHttpRpc(network)` at the same commitment.
- The two reads become **sequential**: the pre-state is read first, at slot `S`, then the
  simulation runs with `minContextSlot: S` and its `context.slot` must equal `S`. Two
  nodes at the same confirmed slot hold the same state for it, so equality is the
  consistency guarantee, whichever node answered.
- A simulation at a later slot, or a `minContextSlot`-not-reached error from a lagging
  node, repeats the pair, up to `SOLANA_SIMULATION_SNAPSHOT_ATTEMPTS` (10) times inside
  the existing `SOLANA_SIMULATION_TIMEOUT_MILLISECONDS`, a shared Solana constant since
  3a. Of 100 mainnet runs, 75 landed on one slot at the first attempt, 23 at the second,
  1 at the third and 1 at none of three, at about 100 ms a pair (2026-10-23, in
  review): ten make a miss about one in a million. If no attempt lands on one slot, the
  result is `undefined` and the swap aborts (fail closed), like any other simulation
  failure.

The sequential read costs one extra round trip on the LI.FI path only. Binding the
route's source and destination account metas statically instead would need a per-route
instruction decoder for every allowed aggregator; the minimum-output decoder below is
the part of that work v1 does take on, and the slot-consistent deltas are what makes
the spend and receipt bounds meaningful on top of it.

The result must show all of the following:

- `preview.controlChanges` is empty. No owner, delegate or close-authority change on any
  user account. An absent `preview` (the run changed nothing the user owns) passes this
  check but fails the receipt check below. An account the run closes is the exception:
  the run reports it as a System account holding no lamports (mainnet, for the user's
  wSOL account a LI.FI route closed, 2026-10-23), which the mapper diffs as a change of
  its program and owner although nothing is left to control. Its control changes are
  ignored; the close rules below hold it instead.
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
  `closedAccounts: { account, lamports }[]` field (user-owned accounts with a pre-state
  and no post-state, with the lamports each held before the run), and it must be empty.
  Accounts the transaction both creates and closes (a temporary wSOL account) have no
  pre-state and are not listed. The one exception is the
  user's own wSOL account, their associated token account for the native mint (derived,
  not read from the transaction): a wallet that has one gets no temporary account, and
  every LI.FI route from or to SOL wraps into that account and closes it to the user at
  the end (all 5 such routes for a wallet with one, in review, and SOL → USDC and
  USDC → SOL again, 2026-10-23). It may be closed, to the user only, when it held no wSOL
  before the run; its rent then comes back to the user. That rent was the user's before
  the run, so its lamports before the run are taken out of `solDelta` for the spend and
  receipt bounds below: counted, they would let a forged route underpay a native-SOL
  destination by the ceiling plus that rent (1,488,440 lamports at today's rent for 165 bytes,
  2,039,280 for an older account, in review), where a temporary account nets out, its rent
  funded in the same transaction. That it held no wSOL shows as the account having no
  token delta: its balance going to zero is the only one a closed account has. A wSOL
  account that held wSOL is
  closed by LI.FI's routes all the same (a wallet holding 1,328 wSOL, 2026-10-23), which
  would unwrap the user's whole wSOL balance into SOL: that stays refused, and is caught
  at quote time (see [Quoting](#quoting)) so that the user never confirms it. Closing any
  other existing account of the user's is refused.
- **Every top-level instruction is pinned.** A program allow-list alone is not enough:
  `SOLANA_KNOWN_PROGRAM_ADDRESSES` includes stateful DEX programs (Whirlpool, Raydium
  CLMM…), and a forged transaction could append, say, a decrease-liquidity instruction
  with the user as position authority that pays attacker accounts. The drained position
  is program-owned, so the wallet's token and control deltas would not show it. So each
  top-level instruction is decoded and must match a pinned `(program, discriminator)`
  pair, with its exact data length and number of accounts, so that no trailing data and
  no extra (multisig signer) account rides along (`assertLifiSolInstructions`,
  `lib/utils/lifi-sol-transaction.utils.ts`): Compute Budget (`SetComputeUnitLimit`,
  `SetComputeUnitPrice`), Associated Token Account `CreateIdempotent` for the user,
  System `Transfer` from the user to the user's own wSOL account, SPL Token `SyncNative`, and
  `CloseAccount` of accounts the transaction created, or of the user's own wSOL account
  when it held no wSOL (see above), **whose decoded `destination` is the
  user** (as the WalletConnect review already requires, `sol-instructions.utils.ts`;
  otherwise a forged transaction could create an empty account for the user and close it
  to an attacker, a rent loss that neither `createdAccounts` nor `closedAccounts` sees and
  that fits inside the ceiling), LI.FI's fee instructions (next bullet), and the
  route entrypoints of the allowed Solana aggregators: for Jupiter v6, `route_v2`
  (discriminator `bb64facc31c4af14`, the one LI.FI's transactions call, 2026-10-22) and
  `shared_accounts_route_v2` (`d19853937cfed8e9`, the same arguments behind an `id: u8`);
  others are added with their discriminators. **Exactly one** `SetComputeUnitLimit`: without
  it the network charges its default limit (200,000 units per non-builtin instruction,
  3,000 per builtin, up to 1,400,000; 809,000 for LI.FI's SOL → USDC shape against
  125,551 with it, in review), which no fee read from the message would price. At most one
  `SetComputeUnitPrice`, without which there is no priority fee. Their values set the fee
  bounded below. Any other top-level instruction aborts. Calls _inside_ an allowed route are constrained by the aggregator
  program itself, plus the program check below.
- **LI.FI's fee is bound.** LI.FI takes its 25 bps on Solana with two top-level
  instructions of its own, in every captured route (DFlow and Jupiter, SOL and USDC
  sources, 2026-10-22), not with a swap step:
  - an instruction of LI.FI's program `3i5JeuZuUxeKtVysUnwQNGerJP2bSMX9fTFfS4Nxe3Br`
    (an upgradeable program): discriminator `0x00`, 9 bytes of data, and as its only
    accounts the Clock sysvar and one more, read-only and not a signer, which holds no
    account. LI.FI rotates that second address — `BHwZCcfDTgSAz8eBFrKqPfNFVFsdBnUtH8zkXs7LM3dG`
    until 2026-10-23, `CnmFYAJAEzj7gUnigN55qTZQ5zHT7EUwTj3SD63HPHuL` from 2026-10-27, in
    review — so it is bound by its role, not its address: exactly two accounts, the Clock
    sysvar first, then one that is neither writable nor a signer. With nothing writable
    and no signer, the instruction cannot change any account whatever the program does,
    and the user's own account cannot be the second: the user pays the fee, so every
    reference to it is a writable signer.
  - the fee itself, paid to LI.FI's fee wallet `34FKjAdVcTax2DHqV2XnbXa9J3zmyKcFuFKWbcmgxjgm`
    (a system account): a System `Transfer` from the user to that wallet for a native-SOL
    source (250,000 lamports of 0.1 SOL), an SPL `TransferChecked` of the source mint,
    signed by the user, to that wallet's associated token account for the source mint
    under the token program the transfer calls (SPL Token or Token-2022)
    otherwise (`8jjWmLhYdqrtFMcEkiMDdqkEN85cvEFnNS4LFgNf5NRv` for USDC, 50,000 of 20
    USDC; both verified on chain).

  Both are pinned as `LIFI_SOLANA_FEE_PROGRAM` and `LIFI_SOLANA_FEE_WALLET`, and the program
  is also listed in `LIFI_SOLANA_PROGRAM_ADDRESSES`, with its own commented line, so the
  program check below accepts it; it calls no other program (a simulated live route shows
  no inner instructions for it, in review). At most one fee
  transfer is allowed, to that wallet (its associated token account derived, not read from
  the transaction), of at most `fromAmount × LIFI_FEE_BPS / 10 000`; a System `Transfer`
  to anyone but the user's own wSOL account or the fee wallet aborts. As on EVM, a fee
  LI.FI raises, or a fee wallet it moves, stops its Solana swaps until the constants
  follow.

- **The route's own minimum output is bound.** Simulation shows the outcome at current
  chain state only; what protects the user when state moves before the transaction lands
  is the minimum the aggregator enforces on-chain, and that comes from the route
  instruction's arguments, which LI.FI writes. So each allowed route entrypoint has a
  pinned argument decoder, and its effective on-chain minimum must be at least the
  displayed `toAmountMin`. For Jupiter v6's `route_v2`, the arguments are, from the
  program's on-chain IDL (read 2026-10-22): `in_amount: u64`, `quoted_out_amount: u64`,
  `slippage_bps: u16`, `platform_fee_bps: u16`, `positive_slippage_bps: u16`,
  `route_plan: Vec<RoutePlanStepV2>`. LI.FI's `toAmountMin` is
  `quoted_out_amount × (10 000 − slippage_bps) / 10 000` rounded to the nearest unit (6 of
  6 live Jupiter quotes, 2026-10-23, and 20 of 20 in review), so a check rounded down
  fails whenever LI.FI rounded up, about half the time: 0.1 SOL → USDC came to
  10,368,898.98 against a `toAmountMin` of 10,368,899. The check reproduces that rounding:
  `(quoted_out_amount × (10 000 − slippage_bps) + 5 000) / 10 000 ≥ toAmountMin`. The
  route's exact minimum can then be up to half a unit below `toAmountMin`, and whichever
  way Jupiter rounds it on chain (its IDL does not say), the minimum it enforces is at
  most one base unit below the one displayed: LI.FI's own rounding, accepted. The
  simulation's receipt bound still holds the delta to `toAmountMin` at simulation time,
  and the fixtures include a route LI.FI rounded up. Besides,
  `platform_fee_bps` and `positive_slippage_bps` must be `0` — no platform takes a share
  of the user's output, LI.FI's fee being the separate transfer above — and `in_amount`
  plus that fee must not exceed `fromAmount` (99,750,000 + 250,000 on the same route).
  The route's accounts are bound from the same IDL: its `user_transfer_authority` is the
  user, its source and destination mints are the requested ones (wSOL for native SOL),
  its source token account is the user's associated token account for the source mint
  under the route's source token program, and its destination token account the user's
  associated token account for the destination mint under the route's destination token
  program (the user's wSOL account for native SOL, on either side). `route_v2`'s optional
  `destination_token_account`, which takes the output in the user's account's place when
  set, must be unset, that is, the program's own id (every captured route). The
  positions: `route_v2` 0, 1, 2 (destination), 3, 4, 5, 6 (destination program), 7
  (optional destination); `shared_accounts_route_v2` 1, 2, 5 (destination), 6, 7, 8, 9
  (destination program), read from the IDL on 2026-10-23 and, for the destination, on
  2026-10-28. The simulation alone does not bind the source: lamports sent to the user's
  wSOL account and never synced are not part of its token amount, so an SPL-source route
  that syncs and spends them leaves that amount as it was, and the run shows no decrease
  (in review, 2026-10-23). Bound to the source account, `in_amount` is also in the source
  token's units, which the `fromAmount` bound assumes. Nor does it bind the destination:
  the receipt bound counts every token account the user owns, and anyone can open one
  for the user without their signature (`InitializeAccount3` takes the owner as an
  argument). Paid into such an account, the output would still be the user's, but OISY
  reads and spends only the associated one, so it would be lost to the wallet (in review,
  2026-10-28).
  The v1 variants (`route`, `shared_accounts_route`, their token-ledger variants) and every
  exact-out variant are not allowed: none came from LI.FI, and each would need its own
  decoder. A test from a real LI.FI transaction fixture covers `route_v2`; LI.FI sent no
  `shared_accounts_route_v2` (5 of 5 fixtures, 2026-10-23), which a test covers by moving
  a fixture's arguments behind an `id`. An aggregator's entrypoints are pinned only
  together with its minimum-output decoder. Simulation stays as an additional check.
- **Every program is known.** Every top-level instruction's program, and every entry of
  `unreadPrograms`, is in `SOLANA_KNOWN_PROGRAM_ADDRESSES` or in a new pinned
  `LIFI_SOLANA_PROGRAM_ADDRESSES`. `unreadPrograms` only lists programs called from
  _inside_ other programs, and it is computed against `SOLANA_KNOWN_PROGRAM_ADDRESSES`
  alone, so it is filtered by the LI.FI list here rather than required to be empty;
  otherwise a bridge reached by CPI (or a bridge's own internal programs) would reject
  legitimate routes. LI.FI's `/tools` returns only tool keys, names, logos and chain
  pairs — no program ids — so `LIFI_SOLANA_PROGRAM_ADDRESSES` is **pinned by hand** from
  each allowed aggregator's published program ids and LI.FI's fee program (each verified
  on-chain), one commented
  line per program, like `sol-known-programs.constants.ts`. A tool removed via
  `LIFI_DENY_*` has its programs removed from the list in the same change. Jupiter reaches
  the DEXes of its route plan by CPI, so `unreadPrograms` lists every one outside
  `SOLANA_KNOWN_PROGRAM_ADDRESSES`. Of 33 live LI.FI routes simulated (2026-10-23), 21
  reached known programs only; the other 12 reached 7 programs outside the list: Obsidian
  (6 routes), JupLend AMM and one of its internal programs (5 each), Deriverse (3), JupLend
  AMM's other internal program (2), Saber and Archer (1 each). So the list pins every venue
  Jupiter publishes (`/swap/v1/program-id-to-label`, 107 programs on 2026-10-23) that
  `SOLANA_KNOWN_PROGRAM_ADDRESSES` leaves out, 79 of them, and the two internal programs of
  JupLend AMM's, which Jupiter does not publish: 81 programs, each an executable account
  on chain, which cover all 33 routes. Only the pinned route entrypoint reaches them, and
  what it does with them is bound by its minimum output and by the spend and receipt
  bounds below. A venue Jupiter adds later is refused until the list follows; so that such
  a route is refused before the user confirms it rather than after, 3d also simulates the
  display quote's transaction at the review step (see [Decisions](#decisions)).
- **Spend is bounded.** The source token's delta on the user's accounts is no lower than
  `-fromAmount`. No other user token account decreases. `solDelta`, less the lamports
  before the run of the user's own wSOL account if the run closes it (see above), is no
  lower than `-(fromAmount if the source is native SOL) - ceiling`, where `ceiling` is the
  [LI.FI ceiling](#solana-execution) of the transaction itself: its network fee plus the
  rent of every account it creates, Token-2022 ones at their larger size, which the next
  bullet holds to the one the user reviewed. A fixed cap would have to be sized for the
  highest priority fee and the most accounts any route might create, and would let every
  route spend that much; the transaction's own ceiling is what it can cost.
- **The network fee is bounded by the review.** The fee a version 0 Solana transaction
  pays — the only version the trust checks let through — is set by its own Compute
  Budget instructions: the unit limit times the unit price, in
  micro-lamports, as priority fee, plus 5,000 lamports per signature (LI.FI's `SEND` gas
  cost is exactly that sum: 435,534 units at 299,999 micro-lamports, 135,660 lamports, on
  the DFlow route of 2026-10-22). LI.FI chooses the price, so the
  [LI.FI ceiling](#solana-execution) of the transaction about to be signed — that fee plus
  the rent of the accounts it creates, each sized from its mint — may not exceed the one the
  user reviewed. Above it,
  nothing is signed and the review returns with the higher ceiling and the
  `lifi_fee_changed` note, as on EVM (`LifiSolFeeChangedError`, carrying the ceiling).
- **Receipt is bound (Solana → Solana).** The user's destination-token delta is at least
  the displayed quote's `toAmountMin`. A missing `preview`, or no delta for the
  destination token, fails this check.
  - **Native SOL destination.** `solDelta` is the fee payer's **net** lamport change
    (`mapSolSimulationPreview` diffs the user's own account), so a valid SPL → SOL swap
    shows `received − transaction fee − rent` and would sit below LI.FI's gross
    `toAmountMin`. For a native-SOL destination the check is therefore
    `solDelta >= toAmountMin - ceiling`, using the same ceiling as the spend bound, with
    `solDelta` less the lamports of the user's own wSOL account the run closes, as for the
    spend bound. A forged route can underpay by at most that ceiling, which is the same
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

New `fetchLifiEvmSwap` in `lib/services/lifi-evm-swap.services.ts` (its own module rather
than the 1,900-line `swap.services.ts`, next to the form's `lifiQuoteFeeCeiling` and
`lifiApprovalTransactions`), mirroring `fetchVeloraMarketSwap`. Every re-quote below uses
the offer's own request (`SwapMappedResult.request`, the one its quote answers), with its
bridges narrowed to the one the reviewed route took and its exchanges to the ones its swap
steps used (`allowExchanges`; none when the route has no swap), so execution can only
re-quote the same kind of route; its `fromAmount` must equal the amount being swapped.
Left free, LI.FI re-routes from one quote to the next through exchanges whose gas differs
up to twofold (258k for Nordstern, 577k for OKX, USDC → ETH on Base, 2026-10-21), and a
heavier route than the one reviewed refused the swap as a fee change. The exchange pin is
for the fee, not the price: when the pinned re-quote has no route, a minimum below the one
displayed, or LI.FI refuses the pin (a swap step's tool outside its `allowExchanges` keys
is a 400), it is asked once more through any exchange (the bridge still pinned), and only
that answer can abort as a slippage error; the calldata binding then checks the quote
against the request it answers. Pinned alone, it aborted every retry once
the reviewed exchange's price slipped, the review the abort returns to never refreshing
its quote (fe4, 2026-10-21). Narrowing the
bridges does not fix the route's shape, so every re-quote is also refused, with
`LifiRouteUnsupportedError` (the generic swap error; `quote_rejected` in analytics), when
`isLifiRouteExecutable` refuses it: a refreshed Across route can put a DEX swap before the
bridge that the calldata binding refuses, and refused at step 1 it costs no approval.
Execution does not fall back to another bridge, which would change the route reviewed.

1. **Price check before any gas is spent.** The displayed quote can be up to 30 s old
   (see [Cadence](#cadence-on-input-change-then-every-30-s)), and an ERC-20 source is
   about to pay for an approval, so the price is re-checked first, while aborting is
   still free. Re-quote through the REST wrapper (never the cache) with
   `skipSimulation: true` — no allowance exists yet, so a simulated quote may not come
   back — run `assertLifiQuote`, and if no route comes back (404 / 422) or the new `toAmountMin` is
   below the displayed quote's `toAmountMin`, abort with the existing slippage-exceeded
   error mapping (Velora Delta's precedent). That mapping is a string-prefix check —
   `SwapEthWizard.svelte` turns an error whose message `startsWith('Slippage exceeded.')`
   into `swap.error.slippage_exceeded` — so the thrown error's message must start with
   exactly `Slippage exceeded.` (as `fetchVeloraDeltaSwap`'s does). Then
   `assertLifiEvmCalldata` binds that quote's calldata to the request it answers: nothing
   the binding reads waits on the allowance, so a route it refuses costs no approval (it
   runs again in step 3, on the quote that is signed). Nothing has been
   broadcast at this point. For a native source this re-quote is skipped: step 3 is the
   first quote and does the same checks.

2. If the source is not native:
   `approve({ to: LIFI_DIAMOND_ADDRESSES[sourceNetworkId], amount: fromAmount, shouldSwapWithApproval: true, … })`
   (`approve` names the spender `to`; see `ApproveParams` in `eth/types/send.ts`),
   exactly as `fetchVeloraMarketSwap` calls it, then the same allowance poll Velora
   Market uses: its inline `retryWithDelay({ maxRetries: 10, request })` around
   `erc20ContractAllowance` is extracted, unchanged, into `waitForSwapAllowance`
   (`lib/services/swap.services.ts`), which both call with the condition
   `allowance >= fromAmount`. A smaller allowance after the
   retries aborts the swap before anything else is sent. `approve()` returns once the
   approval is broadcast, and the poll gives up within 10–20 s, under two Ethereum blocks:
   a slow approval sent the swap back to the review still pending, where a retry signed a
   second one. So LI.FI first waits for the approval's receipt (`waitForApproval`, every
   3 s for up to 3 minutes); a reverted approval aborts at once, and one still unmined is
   left to the poll. The spender is the **pinned**
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
   (reset + approve) when it is non-zero and smaller (`lifiApprovalTransactions`); a read
   that fails budgets two. Each approval is priced at the fee context's `maxGasFee`, the
   gas `approve()` signs it with, and the form, its validation, "Max" and the review all
   show the total — the swap leg's ceiling plus the approvals — instead of the fee
   context's own estimate. The read is repeated when the
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

   Then run `assertLifiEvmCalldata` again, on the new quote
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
   its nonce unchanged. It is `undefined` (zero) off OP-stack chains (`getL1DataFee` in
   `eth/services/fee.services.ts`, which now takes the size). The native balance must
   cover `value + ceiling`, or the swap aborts before signing with an ethers
   `INSUFFICIENT_FUNDS` error, which the wizard maps to the existing insufficient-funds
   copy (`mapEthereumErrorMsg`). That check comes after an ERC-20's approval is paid, so
   an ERC-20 source first checks, before the price re-check of step 1, that the native
   balance covers the total the review showed (`reviewedFee`, the approvals included):
   the swap is never signed above it, so a balance that covers it never leaves an
   approval paid for a swap the balance cannot finish.
5. `swap({ to: tr.to, transaction: { data: tr.data, gas: estimatedGas, value: tr.value, chainId: tr.chainId }, maxFeePerGas, maxPriorityFeePerGas, … })`,
   with the row created between signing and broadcasting (step 6): `swap()` signed and
   broadcast in one call, so it gains an optional `beforeBroadcast({ hash, nonce })` hook
   between the two. The hash is the hash of the signed bytes, the transaction's own; a
   rejecting hook broadcasts nothing. Velora passes no hook and is unchanged.

   `swap()` sends the **same signed bytes again**, up to 3 attempts a second apart, while
   the node has neither refused them outright nor answered that they, or their nonce, are
   in (`isBroadcastRetriable`): a transport failure, a server error or `transaction
underpriced` would otherwise leave a swap that counts as sent (step 6) unsent. With one
   hash and one nonce they cannot swap twice, so Velora Market's broadcast is retried too.
   `processTransactionSent`, which `swap()` does not await, has its failure logged rather
   than left unhandled, and a transaction viem cannot find yet (`TransactionNotFoundError`,
   where the provider's own contract says `null`) is skipped as that `null` was meant to be.

   `swap()` also takes the **amount swapped**, which the pending activity shows.
   `processTransactionSent` read an ERC-20 source's amount by decoding the calldata as a
   transfer, and a swap contract's calldata is none: on the captured Diamond calldata it
   reads an offset (544) or throws, leaving no pending row. The given amount replaces the
   decode; Velora Market, whose calldata is no transfer either, passes its own.

   **Review shows a ceiling execution fits under.** In the form and review, the swap leg's
   maximum fee (displayed, and used for balance validation and "Max") is computed with
   the **same formula** as above (`lifiQuoteFeeCeiling`, sharing the computation with
   execution): the gas units of the quote's `estimate.gasCosts` of type `SEND`, the swap
   transaction's own — every live quote carries exactly one (2026-10-20); an `APPROVE`
   cost is left out, the approvals being budgeted on their own — (LI.FI's own estimate
   for the route, not its `amount`, which is an expected cost at
   LI.FI's gas price) × a larger buffer (`LIFI_REVIEW_GAS_BUFFER_PERCENT`, 30 %) × OISY's
   `maxFeePerGas` + `l1Fee` for that transaction's size, rather than `EthFeeContext`'s
   plain-transfer estimate. Larger than execution's 20 % because the node estimates the very
   same transaction a few percent above LI.FI: 3–5 % for USDC → ETH on Base, on every
   exchange (2026-10-21), so a review buffered alike refused every first attempt from an
   ERC-20 as a fee change. A quote
   without one shows no fee, and the form waits. At
   execution, if the ceiling from OISY's own estimate exceeds the reviewed ceiling, the
   swap is **not signed**: it aborts back to the review step with a "network fee changed"
   message (a new `swap.error.lifi_fee_changed`), and the user confirms the new maximum.
   For that to be reviewable, the abort **carries what the execution-time ceiling was made
   of back** — the buffered gas **and that transaction's own `l1Fee`** — into
   the swap context (`lifiCarriedFee`, next to `failedSwapError`) for the selected
   quote's inputs. Not the wizard's own state: every step change rebuilds the wizard, so
   the review the abort returns to is another instance. The re-quote's calldata can differ from
   the display quote's, so on Base its L1 fee can too; rebuilding the ceiling from the
   carried gas and the display quote's `l1Fee` could understate it and loop again. The
   review prices the carried gas at its own `maxFeePerGas`, with 10 % headroom on the gas
   and the L1 fee alike (`lifiCarriedFeeCeiling`): kept as a fixed amount priced at the
   refused attempt's gas price, the ceiling refused the retry again whenever the gas price
   ticked up or the re-estimate came out a little higher. Review then shows
   `max(quote-derived ceiling, carried ceiling)`, and that exact value becomes the newly
   acknowledged bound the next execution compares against. The carried ceiling
   is kept for the inputs (the cache key) it was found for until the modal closes, and
   ignored for others: back at the same inputs, the route needs what the refused attempt
   measured, and dropping it would only have execution refuse again and carry it back.
   This abort, unlike the
   price check in step 1, necessarily comes after the approval: the estimate needs the
   allowance to exist. Velora Market keeps signing its provider's gas, unchanged.

   **The review confirms only once the fee is known.** Being rebuilt, each review reads
   the quote-derived ceiling and the approval count again, and confirming before both are
   back would pay an ERC-20's approval before execution could compare the fee with any,
   or sign approvals the total did not show. So the review's confirm is disabled until
   the total is known, and the reviewed ceiling is a required parameter of execution.
   The refreshed total, a ceiling carried back by a fee change included, is also checked
   against the native balance as the form checks its own (`isLifiFeeAffordable`): when
   it does not fit, confirm stays disabled and the review says why
   (`InsufficientFundsForFee`). `SwapReview` takes the provider's reason to hold the
   swap as `swapDisabled`.

6. Create the AUT row once the transaction is signed, with its hash and nonce, and only
   then broadcast it. A row that cannot be created aborts the swap before the broadcast:
   no funds have moved. It is deleted all the same, in case the backend committed it and
   only its answer was lost, as a cycles mint does. The row is deleted only when the node's error proves it did not
   accept the transaction, so that the swap never started: an allow-list of
   definitive refusals matched on the error (ethers' `INSUFFICIENT_FUNDS`, a fee cap below
   the base fee, intrinsic gas too low, a gas limit above the block's, oversized data, an
   invalid signature or sender, an unsupported transaction type). A contract revert never
   counts, whatever its reason says (`execution reverted: invalid signature` is a contract's
   check, and another node can still mine the transaction). The delete is retried as
   `deleteRow` in `icp/services/cycles-mint.services.ts` does. Any other failure keeps the
   row, and the poller settles it by its hash and nonce (mined, or replaced or dropped
   once its nonce is used): a JSON-RPC error does not prove the transaction absent
   (`already known` means it is in the mempool, `nonce too low` that its nonce is used,
   possibly by this very transaction, `replacement transaction underpriced` that another
   one holds it), and a transport failure may have relayed it. Such a failure does not
   abort the swap either: returned to the review, the user could sign again, with the next
   nonce, and a relayed transaction would then swap twice. So the swap goes on as sent —
   the error is logged, the modal closes as after a broadcast — and its row settles it. A
   refusal missing from the list leaves its row pending until the nonce is used, then
   `Failed` as replaced or dropped; it never drops the tracking of a swap that happened,
   nor offers it for signing twice. A delete that keeps failing leaves the row to the
   poller in the same way. The failure meant here is the last attempt's of step 5. Then
   `enableSwapDestinationToken`.

Wizard: add `SwapProvider.LIFI` to `isActiveTransactionSwap` and
`swapEmitsApprovalSteps` in `SwapEthWizard.svelte`, plus a dispatch branch that passes
the offer, the reviewed ceiling and every ERC-20 and ERC-4626 OISY knows on the source
network, enabled or not (`lifiUserTokenAddresses`), whose allowances the calldata binding
reads where a swap step targets one.
`isApproveNeeded` stays Velora Market's: it only doubles the fee context's estimate, which
LI.FI replaces with its own total. The wizard holds LI.FI's fee state — the quote-derived
ceiling (re-priced when the offer or OISY's fees change), the approval count (read once
per set of inputs) and reads the carried ceiling from the swap context (kept for the
inputs it was found for) — and hands the total to the form and the review.

"Max" from a native source leaves room for that total, but does not follow it both ways:
LI.FI's fee comes with each quote and each quote with the amount, so a "Max" re-applied on
every fee change sets an amount, gets another fee for it and sets another amount, never
settling (fe4, 2026-10-21: twelve amounts and fourteen quotes in 34 s as LI.FI's route and
gas estimate changed). While "Max" holds a LI.FI amount, `SwapEthForm` gives it the highest
fee seen since it was pressed for the same destination, so the amount only steps down;
typing releases it, and pressing "Max" again starts it over from the fee of the moment. A
new destination is a new route, whose fee the old one says nothing about: its first LI.FI
fee starts the reservation over (`raiseLifiMaxFee`), the old one held while its offers
reload. The fee shown, the form's validation and the review keep the current one.

From a native source, "Max" leaves 10 % more than that fee (`LIFI_MAX_FEE_HEADROOM_PERCENT`):
the review is rebuilt and prices the fee again at a fee per gas read anew, and on Ethereum
that read came out higher than the form's 4–10 s earlier in 39–64 % of samples, by up to
5.5 % (2026-10-22; on Base in 2 of 67, by 0.6 %), so an amount with no room above the form's
fee could not be confirmed. A review that still cannot fit its total — a larger rise, or a
ceiling carried back by a fee change, which always exceeds the fee the form knew — raises
the fee "Max" leaves room for to that total, so that back on the form "Max" steps down to
an amount that fits instead of landing on the same one again.

Whether "Max" holds lives in the swap context (`amountSetToMax`), not in the form: picking a
provider or a token is a wizard step, and every step change rebuilds the form, which used to
release "Max" and leave the amount at the previous provider's max. That was invisible while
every EVM provider shared the fee context's estimate; LI.FI's own, higher fee turned the
amount red. A new source token, switching the tokens and closing the modal release it,
whether by its own close or by a navigation, which destroys it without that close (the
swap context lives in the app layout, so `SwapModal` resets it on destroy too). The
highest LI.FI fee seen lives there too (`lifiMaxFee`), for the same reason: a rebuilt form
that forgot it would raise the amount when the fee had fallen meanwhile. Only another
provider's offer ends it: none is selected while the offers reload, as after a token picker
cleared them, and the plain estimate the form falls back to then stays below the kept
reservation, so "Max" holds. The Max button keeps
a single pending re-application, restarted by each change and cancelled with the button, so a
destroyed form's cannot write the amount while the rebuilt one does not know its fee yet.

The row's token symbols are cut to the backend's 256-byte ref limit (`truncateUtf8Bytes`): a
custom ERC-20's symbol has no bound, and a ref over the limit refused the row, and with it the
swap, after its approval was paid.

### Solana execution

New `fetchLifiSolSwap` (`lib/services/lifi-sol-swap.services.ts`, from 3d-2). The re-quote,
its slippage wording, and the row's creation and deletion are shared with
`fetchLifiEvmSwap` in `lib/services/lifi-swap-execution.services.ts`:

1. **Re-quote immediately before signing, with simulation on** (the displayed quote's
   blockhash is likely stale), with the offer's own request (its exchanges pinned), run
   `assertLifiQuote`, apply the same `toAmountMin` check as EVM, then
   `assertLifiSolTransaction`
   ([Solana transaction binding](#solana-transaction-binding-execution-time-quote)) on
   the exact bytes that step 2 signs, including its fee bound against the reviewed
   ceiling.
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

3. Create the AUT row once the transaction is signed and before `sendSignedTransaction`
   in step 2, with the signature as the tx hash, the transaction's **recent
   blockhash** as a ref, and the slot of the binding's simulation of those bytes
   (`lifi_simulation_slot`, returned by `assertLifiSolTransaction`), where the blockhash
   was valid. As on EVM, a row that cannot be created aborts the swap before
   it is sent, and only a definitive refusal deletes it (`isSolSendRefusal`): the node's
   answers before it forwards anything (Agave's `send_transaction`) — a failed preflight
   simulation, except one reporting the transaction as already processed, which is its
   landing; the health check before it, a node too far behind the cluster (`-32005`); and
   a transaction it cannot read (`-32602`, invalid params). Any other failure first
   **sends the same signed bytes again**, up to `SWAP_BROADCAST_ATTEMPTS` (3) attempts a
   second apart, as EVM's `swap()` does: one signature can land once only, and a
   transport failure would otherwise leave unsent a swap that counts as sent. So does a
   node too far behind, which forwarded nothing and whose refusal another node may not
   share; it stands once the attempts run out. It stops at any other definitive refusal
   or once the transaction is processed.

   **A refusal deletes the row only when no earlier attempt may have relayed the
   bytes.** A preflight
   refusal proves only that its own attempt was not forwarded: the first can time out
   after it was, and a retry then fail its preflight against state that moved meanwhile
   (a price past the slippage, a balance the first is about to spend) while the first is
   still in flight. Deleting the row then would drop the tracking of a swap that can
   still land and let the user sign another. So once one attempt's outcome is unknown, a
   later refusal ends the retries and the swap counts as sent. Any end but such a
   refusal (processed, a transport failure that may have relayed it, or a refusal after
   one) leaves the row to the poller, which settles it as landed or, once the
   blockhash expires, never landed. EVM's `swap()` takes the same rule in 3d. There it is
   hardening rather than a fix: each definitive refusal on EVM answers either the bytes
   alone, which the first attempt shared, or a state change (a balance spent, a base fee
   more than doubled) that cannot happen within the retry window. On both chains, a
   broadcast that ends after an attempt with an unknown outcome rejects with
   `SwapBroadcastOutcomeUnknownError`, its last answer as the cause, which neither
   `isDefinitiveTransactionRefusal` nor `isSolSendRefusal` counts as a refusal, so
   the row stays. Then
   `enableSwapDestinationToken`. The blockhash is read from the compiled
   message (`getCompiledTransactionMessageDecoder` → `lifetimeToken`). LI.FI's
   transaction carries only the blockhash, not its `lastValidBlockHeight`; the expiry
   check in the [poller](#poller-libserviceslifi-active-txservicests) needs only the
   blockhash and the simulation's slot.

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

**The form budgets LI.FI's own transaction.** `SwapSolForm` validates the amount and fills
"Max" against `SolFeeContext`'s estimate (`feeStore`, plus `ataFeeStore` for an SPL
source), which prices NEAR Intents' deposit transfer, not a LI.FI route. The route sets
its own compute budget — 135,660 lamports with the base fee on the DFlow probe, many times
a plain transfer's — and creates accounts: the user's destination token account when it is
missing, and for a native-SOL source, when the wallet has no wSOL account, a temporary
one, funded with the rent-exempt minimum while the transaction runs and refunded when it
closes. With the transfer
estimate, "Max" from SOL leaves too little, and the simulation refuses the swap at
execution. So a LI.FI offer is priced at **LI.FI's ceiling**, read off the display
quote's own transaction when the quote is fetched (`loadLifiSolQuoteCeiling`, carried on
the offer as `solFeeCeiling`), a version 0 message decoded as the trust checks already
decode it:
the Compute Budget fee, 5,000 lamports per signature, and for each `CreateIdempotent` the
rent-exempt minimum
(`rentExemptMinimumFor`) of the account it creates, a temporary account included because
it must be funded until it is closed, and an existing one included because nothing in the
message says it exists (an upper bound, like EVM's largest nonce). Not LI.FI's `gasCosts` /
`feeCosts`, which are unsigned and list the rent as not included.

**A created account's size comes from its mint.** `CreateIdempotent` does not encode the
size of the account it creates: the token program decides it. The instruction names the
mint and the token program (lookup tables resolved, as the trust checks resolve them). An
SPL Token mint's account is `ATA_SIZE`, 165 bytes. A Token-2022 account carries
extensions: the mint is read on chain and decoded with its extensions, and the account's
size is what `getTokenSize` (`@solana-program/token-2022`, already a dependency) gives for
`ImmutableOwner`, which every associated token account gets, plus the account extensions
the token program requires for the mint's own (`TransferFeeAmount` for
`TransferFeeConfig`, `NonTransferableAccount` for `NonTransferable`, `TransferHookAccount`
for `TransferHook`, `PausableAccount` for `Pausable`): 170 bytes with none of them, 182
for a transfer-fee mint (2026-10-22). Pricing it at 165 bytes would understate the rent,
leave "Max" from SOL short and the reviewed ceiling below what execution needs. Those four
pairs are the token program's whole mapping (`required_init_account_extensions`): every
other mint extension it defines (`MetadataPointer`, `TokenMetadata`, `PermanentDelegate`,
`DefaultAccountState`, `ScaledUiAmount`, `ConfidentialTransferMint`…) adds nothing to the
account. Every Token-2022 mint in OISY's list carries some of those (all 50, in review),
and an AAPLx account is 179 bytes on chain, what `getTokenSize` gives for
`ImmutableOwner`, `TransferHookAccount` and `PausableAccount`; a PYUSD one is 187, with
`TransferFeeAmount` and `TransferHookAccount` (2026-10-23). A mint that cannot be read, or
that carries an extension type the decoder does not recognise, gets no LI.FI offer: its
rent cannot be bounded. So does one carrying a type the decoder knows but neither list
places (`PermissionedBurn`, newer than the mapping above, whose account extension, if any,
is not established). The review and execution's ceiling, which the spend and receipt
bounds also use, size the accounts the same way (`lifiSolTransactionCeiling`,
`lib/services/lifi-sol-transaction.services.ts`).

As on EVM, the form, its validation, "Max" and the review use that total
(`SwapLifiFeeDisplay`) instead of the fee context's estimate; the review confirms only
once it is known, and shows `InsufficientFundsForFee` when the balance cannot cover it.
"Max" from SOL leaves room for it with the same swap-context reservation as on EVM
(`amountSetToMax`, `lifiMaxFee` per destination, raised by a review that cannot fit its
total), the ceiling coming with each quote and each quote with the amount. Whether it
also needs headroom, as `LIFI_MAX_FEE_HEADROOM_PERCENT` gives EVM, depends on how much
LI.FI's compute price moves between the display quote and the execution re-quote; 3d
measures it, as 2b measured the EVM gas estimate, and the review buffers the ceiling if
the re-quote's comes out higher.

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

`validate_data` arm: `require_valid_amount(&d.amount, "amount")` and a new
`require_lifi_pair(d)`, in the style of `require_chain_fusion_pair` /
`require_oisy_trade_pair`. A row is the poller's only input, and the poller derives both
chains from the two `TokenId`s (see [External refs](#external-refs-lifi_external_ref_keys-libtypeslifits));
a row it cannot map would never terminate and would sit in the user's 100-row quota
(`MAX_ACTIVE_USER_TRANSACTIONS_PER_USER`) for good. So the backend refuses any pair
outside the v1 matrix instead of storing it:

- `source_token` is an EVM mainnet token — `EvmNative(c)`, `Erc20(_, c)` or
  `Erc4626(_, c)` (vault tokens are ERC-20s to LI.FI and `toBackendTokenId` maps them
  to that variant) with `c` in `LIFI_EVM_CHAIN_IDS` — or a Solana mainnet token
  (`SplMainnet(_)`, `SolNativeMainnet`).
- `dest_token` is one of the same kinds. A Solana source requires a Solana destination
  (Solana → EVM is out of v1).
- `source_token` and `dest_token` are different tokens, rejected with
  `InvalidData("dest_token must differ from source_token")`. ERC addresses are compared
  case-insensitively: `TokenId` derives `Eq` over the raw address string, so a
  checksummed and a lower-case spelling of one contract would otherwise pass as two
  tokens. SPL mints are base58 and compared exactly.

`LIFI_EVM_CHAIN_IDS` is a `const` in `model.rs` holding the six mainnet chain ids
(1, 42161, 56, 137, 8453, 4663), with a comment that it mirrors the keys of the
frontend's `LIFI_DIAMOND_ADDRESSES`: a chain without a pinned Diamond cannot be swapped
through, so adding one is a backend PR as well as a frontend one. The check is an
allow-list: every other `TokenId` kind — NFT variants (`Erc721`, `Erc1155` and the IC
NFT kinds), devnet Solana variants, `IcpNative` / `Icrc`, BTC (mainnet and testnet) and
XRP — is rejected with `InvalidData("token pair is outside the LI.FI v1 matrix")`. Unit
tests cover one accepted pair per direction (EVM → EVM, EVM → Solana, Solana → Solana)
and one rejection per rule (unpinned chain id, devnet Solana, Solana → EVM, unsupported
kind, same token).

The poll keys are required too, for the same reason: a row the poller cannot drive to a
terminal status must not be stored. The row is opened after the source transaction is
signed and before it is broadcast, when all of them are known: the hash is the signed
transaction's, the nonce the one it was signed with. `create` (via `require_lifi_refs`, after the pair
check) requires `lifi_tx_hash` plus `lifi_nonce` for an EVM source or `lifi_blockhash`
for a Solana source, and `update` enforces the same keys whenever it replaces
`external_refs` (it replaces the list wholesale), as `require_xrp_refs` does for XRP
rows. The key names are shared constants (`LIFI_REF_TX_HASH`, `LIFI_REF_NONCE`,
`LIFI_REF_BLOCKHASH` in `active_user_transaction.rs`), so the frontend's
`LIFI_EXTERNAL_REF_KEYS` must use exactly these strings. Values are shape-checked:
`0x` + 64 hex for an EVM tx hash, a decimal `u64` for the nonce, base58 of 64 bytes for a
Solana signature and of 32 bytes for a blockhash. `lifi_tool`, `lifi_transaction_id`
and the learned keys stay optional.

The frontend poller keeps its `undefined`-chain skip as defence in depth, but no row
OISY creates can reach it. Candid round-trip tests, an integration test in
`src/backend/tests/it/active_user_transactions.rs`, regenerated `backend.did` and
`src/declarations/backend/*` (rebuild the wasm before `npm run generate`, which
otherwise no-ops silently). Precedent: commit `78d5addbd` (Velora's variant).

#### External refs (`LIFI_EXTERNAL_REF_KEYS`, `lib/types/lifi.ts`)

| Key                    | Set                     | Purpose                                                |
| ---------------------- | ----------------------- | ------------------------------------------------------ |
| `lifi_tx_hash`         | creation, required      | source tx hash / Solana signature; `/status` key       |
| `lifi_tool`            | creation                | `step.tool`, passed as `bridge` to `/status`           |
| `lifi_transaction_id`  | creation                | LI.FI's id, for support / explorer links               |
| `lifi_nonce`           | creation, EVM, required | replaced/dropped detection (Velora Market)             |
| `lifi_blockhash`       | creation, SOL, required | the transaction's recent blockhash; expiry detection   |
| `lifi_simulation_slot` | creation, SOL           | slot of OISY's own simulation; anchors the expiry read |
| `lifi_dest_tx_hash`    | learned                 | `receiving.txHash`                                     |
| `lifi_substatus`       | learned                 | how a `DONE` ended: `COMPLETED`, `PARTIAL`, `REFUNDED` |
| `lifi_received_symbol` | learned                 | `receiving.token.symbol` on every `DONE` / `PARTIAL`   |
| `lifi_received_amount` | learned                 | that token's amount, **formatted** (see below)         |

Plus the shared display keys (`amount`, `source_token_symbol`, `source_network_symbol`,
`destination_token_symbol`, `destination_network_symbol`, `usd_source_value`), so
`ActiveUserTransactionItem` renders the row without new layout. An EVM row uses at most
14 of the 16 keys (`lifi_nonce`, no `lifi_blockhash`), leaving two spare; a Solana row 15
(`lifi_blockhash` and `lifi_simulation_slot`, no `lifi_nonce`), leaving one.

`lifi_simulation_slot` is the slot at which OISY's own simulation of the signed bytes ran
before signing ([Solana execution](#solana-execution)). That simulation keeps the
transaction's blockhash (`replaceRecentBlockhash: false`) and fails on one the node does
not know, so the blockhash was valid there. 3d writes it as a decimal `u64`; the backend
neither requires nor checks it, and the poller reads it only if it is one (see the
[poller](#poller-libserviceslifi-active-txservicests)).

`lifi_substatus` is written on every `DONE`, only when it is in the SDK's closed set
(`isSubstatusDone`). It is what tells a partial payout apart for the balance reload (see
[Loader and UI](#loader-and-ui)), independently of the received token's metadata, which is
omitted when it fails its checks, and it records for support how a settled swap ended.

Two things one might expect in the refs are deliberately not there:

- **The LI.FI chain ids.** Velora stores a `chain_id` ref, but the row's `source_token` /
  `dest_token` already carry the chain: the backend `TokenId`
  (`src/shared/src/types/token_id.rs`) is `EvmNative(ChainId)`, `Erc20(_, ChainId)`,
  `SplMainnet(_)`, `SolNativeMainnet` and so on. A small `lifiChainIdOfTokenId` in
  `lib/utils/lifi-active-tx.utils.ts` maps that to the LI.FI chain id (EVM: the chain id;
  Solana mainnet: `1151111081099710`; anything else: `undefined`, and the row is skipped
  with `consoleError` — unreachable for rows OISY creates, since the backend refuses
  the pair first, see [Backend variant](#backend-variant)). It serves both the poller's `/status` query and the EVM
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
     and existing tests stay unchanged; the refactor landed on its own, ahead of the
     LI.FI EVM poller (2b-1, see [Delivery plan](#delivery-plan)).
   - Solana — new, since nothing in the repo read signature statuses or blockhash
     validity before. `readSolSourceTxOutcome` (`sol/services/sol-source-tx.services.ts`,
     with the mapping in `toSolSourceTxOutcome`, `sol/utils/sol-source-tx.utils.ts`) is the
     Solana counterpart of the EVM helper, on Solana mainnet, reading through
     `getSignatureStatus` and `isBlockhashValid` in `sol/api/solana.api.ts`. It needs no
     address: the signature and the blockhash identify the transaction.
     1. `getSignatureStatuses([signature], { searchTransactionHistory: true })`. The
        history search matters: without it the RPC only answers from its recent-status
        cache, and an old landed transaction would read as missing.
     2. A status at `confirmed` or `finalized` with `err` → `Failed` ("reverted on
        Solana", `swap.error.failed_unexpectedly` as for an EVM revert); without `err` →
        the source leg is done; go on to `/status`. A status only `processed`, with or
        without `err`, is no verdict: its block may still be dropped with its fork, so the
        row stays in flight (`Executing`) until the cluster confirms it.
     3. No status → `isBlockhashValid(lifi_blockhash, { commitment: 'confirmed',
minContextSlot: lifi_simulation_slot })`. While valid, the transaction can still
        land: the row stays in flight. A node answers `false` alike for a blockhash that
        has aged out and for one it has not seen yet (checked on mainnet, 2026-10-26), so
        a node running behind would call a live blockhash invalid. `minContextSlot` makes
        such a node refuse to answer instead (`-32016`, "Minimum context slot has not been
        reached"), which the poller's per-row catch leaves for the next poll; a node at or
        past the slot only answers `false` once the hash has aged out, which is final. A
        row without a usable `lifi_simulation_slot`, which OISY does not open, is read
        unanchored.
     4. Invalid → the status is read again. The transaction may have landed just before
        the hash expired, after step 1, or step 1's answer may have come from a node
        further behind. A missing status counts only if this read's slot (the node's
        processed slot) is at or past the slot the blockhash read answered at (its
        confirmed slot): a transaction that landed did so before then, so a node that far
        knows it. Otherwise the transaction stays in flight. The EVM helper re-reads the
        receipt before counting a replacement for the same reason.
     5. Even then, the first poll that sees "no status + invalid blockhash" only records
        an observation in an in-memory `expiryObservations` map keyed by row id. The next
        poll re-runs step 1, and only if it again finds no status is the row set to
        `Failed` with `swap.error.swap_expired` ("expired before the network processed
        it"). This is the same two-observation guard the EVM helper uses for "replaced or
        dropped" (`replacementObservations`, `REPLACEMENT_OBSERVATIONS_REQUIRED`), kept
        here because a `Failed` verdict is immutable and nodes behind one endpoint can
        each be at a different slot or fork; the Solana helper owns its map, as the EVM
        helper owns its own.
     6. The two observations must be **consecutive**: any poll that finds a signature
        status, or a still-valid blockhash, **deletes** the row's entry. A page reload
        empties the map, so the count restarts; that can only delay the verdict by one
        poll, never hasten it, which is why the observation is not persisted in a ref.
   - **Same-chain** (`fromChain === toChain`): a confirmed source ends the row
     `Succeeded`, as Velora Market's does, and `/status` is never asked. The swap runs
     inside the source transaction, which `GenericSwapFacetV3` reverts unless the user
     receives at least the on-chain minimum, so the receipt is the outcome. Waiting for
     `/status` instead would leave a settled swap "in progress" whenever LI.FI does not
     resolve its hash, and after the [unresolved-status](#unresolved-status) bound fail it,
     with a `swap_error`, although the user holds the tokens. Same-chain rows therefore
     record no destination hash or substatus; the source transaction is the swap's only
     one.
2. **Then, cross-chain, `getStatus({ txHash, fromChain, toChain, bridge })`**, with `fromChain` /
   `toChain` derived from the row's `source_token` / `dest_token` (see
   [External refs](#external-refs-lifi_external_ref_keys-libtypeslifits)) and `bridge` from
   `lifi_tool`. LI.FI is asked only once the source is confirmed: before that the source
   chain decides, and `/status` could only answer `NOT_FOUND`. The poller remembers a
   confirmed source in memory, so after a reload the receipt is read once more. Each request
   times out after `LIFI_STATUS_TIMEOUT_MS` (10 s): the loader awaits each provider's poller
   in turn, so a stalled `/status` would stall every other provider's rows. Two answers are
   not status objects and are normalised first:
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
| `DONE` / `REFUNDED`       | `Failed` with the "refunded" error (`swap.error.swap_refunded`)       |
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
  LI.FI rejects, and maps that answer instead. It remembers the refusal per row, in
  memory, and asks without `bridge` from then on, so that a row left unresolved costs one
  request per poll rather than two against the rate limit.
- The bound starts only **after the source transaction is confirmed** and is measured
  on the **page's monotonic clock** (`performance.now()`), which a change of the system
  clock does not move. The first time a poll sees the row's source confirmed and the
  latest `/status` answer (after the `INVALID` re-query) still `NOT_FOUND` / `INVALID`,
  the poller starts accumulating **observed unresolved time** for that row: in memory as
  `{ elapsedMs, lastSeenAt }`, and in `localStorage` as `{ elapsedMs }` (key
  `lifi-unresolved:<rowId>`, through the existing `get` / `set` / `del` in
  `lib/utils/storage.utils.ts`). Each later poll of the session that still sees the
  source confirmed and an unresolved answer adds
  `clamp(performance.now() − lastSeenAt, 0, LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS)` to
  `elapsedMs` and updates `lastSeenAt`; the step cap is 2 min (twice the slowest
  per-row poll interval). The first poll after a reload resumes the stored `elapsedMs`
  and adds nothing: a monotonic reading means nothing in another session. Any other
  answer, or a terminal status, deletes the entry.
  When `elapsedMs ≥ LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS` (6 h) and the latest answer
  is still unresolved, the row ends `Failed` with `swap.error.lifi_status_unknown`
  ("LI.FI could not report the outcome of this swap. Check your destination wallet."),
  not a claim that the funds were lost.
  - Monotonic and accumulated, not `Date.now() − start`: a manual clock change or an
    NTP correction, forward or back, adds nothing, so a clock jump cannot hasten the
    irreversible verdict, not even by one step. Time the tab was hidden is not counted
    beyond one step, and time it was closed not at all, which only delays it.
  - The browser's own clock only: never the row's `created_at_ns`, which is the
    canister's clock, so clock skew does not move the window (the concern behind OISY
    Trade's tick counting, `lib/constants/oisy-trade.constants.ts`).
  - Persisted, so reloads do not restart the window. It is kept client-side rather than
    in the row's refs (a ref would turn every unresolved poll into a backend update, and
    the window is a per-browser observation, not a fact about the swap), so another
    device, a private window or cleared site data starts its own window. That can only
    **delay** the irreversible verdict, never hasten it.
  - Storage is best-effort: reads and writes are wrapped in try/catch. The window is kept
    in memory for the session and read from there first; `localStorage` only resumes it
    after a reload. Read storage-first, a write that fails (a full storage) would restart
    every poll from the same stale window, and the bound would never be reached.
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
reject the creation, and with it the swap, which is not broadcast without its row:

- `lifi_tool` (`step.tool`, later sent as `bridge` to `/status`) must match
  `/^[A-Za-z0-9_-]{1,64}$/`;
- `lifi_transaction_id` must match `/^0x[0-9a-fA-F]{1,128}$/`.

A value that fails is **omitted** from the refs instead of failing creation. Without
`lifi_tool`, the poller calls `/status` without `bridge` from the start (the same query as
the `INVALID` fallback).

Learned refs are merged on every poll. A write that carries new refs without advancing the
status sends the status the poll read, unchanged: the backend checks a transition only when
a status is supplied, and replaces `external_refs` wholesale, so a refs-only write based on
a stale read could strip the received token another tab recorded as it settled the row.
With the status, that write is an illegal transition and the backend refuses it whole.
Errors are caught per row, except the `/status`
404 described above, which is an answer rather than a failure. Polls are throttled
per row inside the poller to LI.FI's recommended cadence — every 10 s for the first
minute after creation, every 30 s until 10 minutes, then every 60 s — on top of the
loader's 5 s tick. A clock set back puts the last poll in the future, so the row is polled
at once rather than once the clock catches up. The last-poll times, the confirmed-source
flags and the refused tools are kept in memory. A row the poller settles is forgotten once
its terminal write has landed, its stored window included: if it was the last pending
LI.FI row, the loader stops calling the poller, and nothing would prune it. A terminal
write that fails keeps the row's state, so the next poll repeats the verdict rather than
reopening a 6 h window (`applyActiveUserTransactionPollUpdate` reports whether it wrote).
Each poll also drops that state for every row no longer in the pending set the loader
passes, for rows that settled in another tab or on another device. Only the stored windows
of rows this tab keeps are removed with it: every window the poller reads it also writes,
so those are all it has touched, while rows another tab opened since this one loaded, or
another principal's on the same browser, are missing from this tab's pending set without
being settled. A window whose row settled while no tab of the browser polled it is left
behind, and never read again. That state is LI.FI's alone, unlike the replacement
observations of the shared EVM source-tx helper, which a provider must not prune to its own
rows.

#### Loader and UI

- `LoaderActiveUserTransactions.svelte`: a `tick` branch calling the LI.FI poller with
  `$ethAddress`, which only EVM-source rows need and wait for (a Solana-source row is read
  by its signature and blockhash, so the poller polls it without any address, from 3c),
  and a terminal-status branch firing `TRACK_COUNT_SWAP_SUCCESS` / `_ERROR` with
  `buildLifiSwapTrackingMetadata`. That metadata carries no `error`, unlike the other
  providers': for a `FAILED` transfer the row's error is LI.FI's own text, which never goes
  to analytics (invariant 4 in `docs/ai/frontend/analytics.md`).
- The tick creates one `confirmedNonceByChainId` and passes it to both the Velora and the
  LI.FI pollers, so EVM rows on one chain cost one nonce read whatever their provider. They
  run one after another, so LI.FI may reuse a nonce read before its own receipt read; an
  earlier read can only be lower, which reads as still pending, never as replaced.
- That terminal branch refreshes balances for **every** terminal LI.FI row, not only
  `Succeeded`: the modal closed at broadcast, so nothing else refreshes them when the
  route settles, and a failed, reverted or refunded swap still spent gas or returned
  funds. Two parts, because they cover different chains:
  - `shouldRefresh` (→ `waitAndTriggerWallet()`) for the Solana side. It only emits the
    `oisyTriggerWallet` worker event, and **EVM balances have no wallet worker**
    (`LoaderEthBalances.svelte` does not listen for it, as `native-balance.services.ts`
    notes), so it refreshes nothing on EVM.
  - An explicit EVM reload with `reloadEthereumBalance` (`eth/services/eth-balance.services.ts`)
    for each affected EVM token: the source token and its chain's native token (gas) on
    every terminal status, since a refund can also land there, and the
    destination token when it is on an EVM network. After a partial payout (the row's
    `lifi_substatus` is `PARTIAL`), the token received is not one the row identifies, so
    every enabled fungible token of the destination chain is reloaded too. The loader
    passes `enabledFungibleTokens`, and only what `reloadEthereumBalance` can load (native
    EVM coins, ERC-20s, ERC-4626 vaults) is reloaded: it hands anything else to its ERC-20
    loader, where an NFT collection fails and resets its balance. `swap()` only reloads the source
    token once the source transaction is mined, so without this an EVM destination payout
    or a later refund stays stale until the periodic poll. The row stores backend
    `TokenId`s, and only the forward mapping exists (`toBackendTokenId`,
    `lib/utils/token-id.utils.ts`), so the tokens are resolved by finding the enabled
    token whose `toBackendTokenId` equals the row's `source_token` / `dest_token`
    (`findTokenByBackendTokenId`, compared through `tokenIdKey`, which keys ERC-4626
    vaults too, since LI.FI quotes them as ERC-20s); an unresolved token (disabled since
    the swap) is skipped. The gas token is the enabled `EvmNative` of the row's source
    chain, found on its own, so it is still reloaded when the source token was disabled.
  - Redundant refreshes (dropped or expired source) only find nothing new.
- `ActiveUserTransactionItem.svelte`: `isLifi` in the `isSwap` list and the
  `providerName` chain; when `lifi_received_symbol` is present, the received token and
  amount replace the destination token in the row.
- **Failure reasons are stored, not displayed**, as for Velora and NEAR Intents: a
  `Failed` row shows the existing warning icon, and `tx.error` (refunded, outcome
  unknown, LI.FI's `substatusMessage`) is kept on the row for support. No
  toast, no new row layout, no explorer link. Surfacing errors for all swap providers
  is a separate, cross-provider change.
- Wizard tracks `TRACK_COUNT_SWAP_SUBMITTED` (it is an active-transaction swap). Its
  `TRACK_COUNT_SWAP_ERROR` for a LI.FI swap carries an allow-listed category as
  `result_error_type` (`toLifiSwapErrorType`, `PLAUSIBLE_EVENT_SWAP_ERROR_TYPES`:
  `fee_changed`, `slippage_exceeded`, `quote_rejected`, `insufficient_funds`, `unknown`)
  in place of the error text under `error`, which can come from LI.FI's
  SDK (the request URL, with the user's addresses) or from the node and ethers (the signed
  transaction); invariant 4 in `docs/ai/frontend/analytics.md`.

### Presentation

- `swapProvidersDetails[SwapProvider.LIFI]` — unconditional, `name: 'LI.FI'`,
  `website: 'https://li.fi'`, logo `static/images/dapps/lifi-logo.svg`. The PR ships a
  **placeholder** SVG at that path (a neutral rounded square with the text "LI.FI"); the
  official logo replaces the file later without any code change.
- `SwapDetailsLifi.svelte` in the provider sheet: estimated duration, the route tool name,
  minimum received, and "Swap Fees": LI.FI's 0.25 % and the route's other fees, summed
  from `feeCosts` as the fees already taken out of the receive amount. The row is hidden
  when any fee lacks a readable USD amount, or is charged on top of the amount sent
  (`included: false`): added in, the total would match neither what is deducted nor what
  is extra.
- i18n keys in `en.json` + the other locales + `i18n.d.ts`: at least
  `swap.text.lifi_route_via`, `swap.error.lifi_status_unknown`,
  `swap.error.lifi_fee_changed`; optionally
  `help.text.explorers_lifi_description` for a help-page explorer entry. A refund reuses
  `swap.error.swap_refunded`, the copy Velora and NEAR Intents already write, and a route
  that paid out in another token needs no copy of its own: the row shows the received
  amount and symbol in place of the destination token.

## Delivery plan

| PR   | Scope                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Depends on                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1    | **Backend AUT variant** — `Lifi(LifiData)`, validation of the v1 token matrix (`require_lifi_pair`, pinned EVM chain ids) and of the required poll keys (`require_lifi_refs`), tests, regenerated `.did` / declarations                                                                                                                                                                                                                                                                                                                                                                                                                                              | —                                               |
| 2a-1 | **Quote client** (not registered anywhere) — `@lifi/sdk`, env (flag **`false` everywhere**), `SwapProvider.LIFI` + mapped-result arm + `swapService` stub, REST client, EVM form-time trust checks, `fetchLifiSwapQuote` with the 30 s cache, `reusability.md` entry                                                                                                                                                                                                                                                                                                                                                                                                 | 1                                               |
| 2a-2 | **Registration** — LI.FI destination resolver + per-category wildcard, Solana in `crossChainSwapNetworks` / `allCrossChainSwapTokens` when either flag is on, EVM registry entry, Solana registry entry **restricted to EVM sources** (EVM → Solana, allow-listed bridges, empty source list so the Solana source picker is unchanged), provider sheet                                                                                                                                                                                                                                                                                                               | 2a-1                                            |
| 2b   | **EVM execution + tracking** — calldata binding (pinned facet ABIs decoded locally, incl. each bridge's payout and LI.FI's fee forwarding, + the Diamond's whitelist), route-tools refusal of Across behind a DEX swap, `fetchLifiEvmSwap` (pre-approval price check, unchanged `approve()`, form budget of 0/1/2 approval fees from one allowance read) + wizard dispatch, Velora source-tx helper extraction, byte-safe truncation util, AUT utils/poller (incl. unresolved-status bound and the `/status` 404 → `NOT_FOUND` mapping)/loader (incl. wallet + EVM balance refresh)/item; flag to `(LOCAL \|\| STAGING) && !TEST`, `PRODUCT.md` for EVM-source swaps | 2a-2                                            |
| 3a   | **Solana simulation plumbing** (a refactor on `main`) — `replaceRecentBlockhash` and `consistentSnapshot` options on `simulateSolTransaction` / `simulateTransactionAccounts` (`minContextSlot`, the response's slot), `getMultipleAccountsInfoWithContext` behind an unchanged `getMultipleAccountsInfo`, `createdAccounts` / `closedAccounts` in the simulation preview; every default as today, so the WalletConnect review and Solana balances are unchanged                                                                                                                                                                                                     | 2b                                              |
| 3b   | **Solana transaction binding** (not wired in) — `assertLifiSolTransaction`: pinned top-level instructions incl. LI.FI's fee instructions, Jupiter `route_v2` / `shared_accounts_route_v2` minimum-output decoder, the program, spend, receipt and network-fee bounds, on real LI.FI fixtures; Jupiter's published venues pinned for the programs its routes reach by CPI                                                                                                                                                                                                                                                                                             | 3a                                              |
| 3c   | **Solana tracking** — the poller's Solana source-chain check (in-memory expiry observations, the blockhash read at or past the row's `lifi_simulation_slot`), Solana rows polled without an EVM address; nothing opens a Solana row until 3d                                                                                                                                                                                                                                                                                                                                                                                                                         | 2b                                              |
| 3d-1 | **Solana quote checks** (not reachable) — Solana → Solana requests pinned to `LIFI_SOLANA_ALLOWED_EXCHANGES`, the Solana trust checks (`decodeLifiSolTransaction`, shared with the binding), the display quote's transaction read as the binding reads it short of the simulation (`loadLifiSolQuoteCeiling`: a route the binding would refuse, or one unwrapping wSOL the user holds, gets no offer) and its LI.FI ceiling carried on the offer (`solFeeCeiling`); the registry entry still refuses a Solana source                                                                                                                                                 | 3b, 3c                                          |
| 3d-2 | **Solana execution** (not wired) — `assertLifiSolTransaction` returning its simulation's slot, `fetchLifiSolSwap` (re-quote, binding, signing the original message bytes, the row with `lifi_simulation_slot`, re-sent broadcast, a later refusal keeping the row, on EVM's `swap()` too)                                                                                                                                                                                                                                                                                                                                                                            | 3d-1                                            |
| 3d-3 | **Solana → Solana wiring** — lift the Solana-source restriction on the Solana registry entry (destinations, and a mainnet-only source list in place of the empty one; Solana destinations only), LI.FI's ceiling in the form, "Max" and the review, the review's simulation of the display quote's transaction (an unpinned venue refused before confirming), `SwapSolWizard` dispatch, `PRODUCT.md` update for Solana-source swaps                                                                                                                                                                                                                                  | 3d-2                                            |
| 4    | **Flip the flag** — `LIFI_SWAP_ENABLED = true` (one line) + `PRODUCT.md`; merged ahead of 3d (#14404, see [Decisions](#decisions))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 3d, production key + rate-limit scope confirmed |

PR 2 is split up front so each PR stays reviewable, and 2a again into the quote client
(2a-1) and its registration in the swap fan-out (2a-2). 2b is split five ways: the EVM
source-tx helper extraction (2b-1) and the byte-safe truncation util (2b-2), both
refactors on `main`; the tracking — LI.FI's AUT utils, poller, loader branches and row
item (2b-3); the calldata binding (2b-4); and execution, the wizard dispatch, the flag to
`(LOCAL || STAGING) && !TEST` and `PRODUCT.md` (2b-5). Tracking lands before execution:
with the flag off nothing opens a LI.FI row, so the poller has nothing to do until 2b-5,
and rows are tracked from the first swap. In 2a the flag is `false` everywhere,
local included: 2a registers quotes but the wizard has no LI.FI dispatch yet, so a
selected offer would hit `SwapEthWizard`'s unknown-provider branch. 2a is exercised by
unit tests that switch the flag on (the `vi.doMock` pattern of `near-intents.env`), and
2b, which adds the dispatch, sets it to `(LOCAL || STAGING) && !TEST`. No environment, local
included, ever shows an offer that cannot be executed. This is the same sequencing as
the Solana-source guard above. Solana → EVM
is a later, separate PR (see [Decisions](#decisions)).

PR 3 is split the same way, up front (2026-10-22): the shared Solana simulation changes
first, as a refactor that leaves every existing caller as it is (3a), then the
transaction binding on its own (3b) and the tracking (3c), and execution last (3d), which
alone makes anything reachable. "PR 3" elsewhere in this spec means them all together. 3d
is split three ways in turn (2026-10-28), as 2b was: the quote side (3d-1) and execution
(3d-2), neither reachable, then the wiring (3d-3), which makes Solana-source swaps
reachable, in every environment, since PR 4 merged first (see [Decisions](#decisions)).

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
  residual risk remains: Across's output multiplier is unsigned and depends on a price,
  so a forged Across route (which needs a compromised `li.quest` response over TLS) can
  set one no relayer fills. The deposit then waits out its fill deadline, at most 3 h
  ahead, and is refunded to the user, less LI.FI's fee. Solana → EVM is out of scope for v1 because its
  recipient cannot be verified yet.
- **Fewer Across routes** — Across behind a DEX swap, or paying out a wrapped native
  token such as WETH, is refused (see
  [Calldata binding](#calldata-binding-evm-execution-time-quote)), and LI.FI quotes the
  first often; such pairs go through NEAR Intents or get no LI.FI offer.
- **A refusal the allow-list misses keeps its row** — only errors proving the node did
  not accept a transaction delete its row; any other leaves it pending until its nonce is
  used (EVM) or its blockhash expires (Solana), then `Failed`. Accepted over deleting
  the tracking of a swap that may have been broadcast.
- **LI.FI's fee is pinned** — a route forwarding more than 25 bps is refused, so a fee
  increase by LI.FI stops its swaps until `LIFI_FEE_BPS` is updated.

- **Solana routes through Jupiter only** — LI.FI's best Solana → Solana route was
  DFlow's in both directions probed (2026-10-22), which v1 does not offer; a Jupiter route
  may pay a little less. Accepted until DFlow's instructions are pinned and decoded.
- **Jupiter's venues are pinned by hand** — a route through a venue Jupiter adds later is
  refused (at the review, from 3d) until `LIFI_SOLANA_PROGRAM_ADDRESSES` follows, and the
  pair then has no LI.FI offer through it. Jupiter's published list is the one to compare
  against.
- **No LI.FI offer for SOL to a user who holds wSOL** — LI.FI's routes from or to SOL close
  the wallet's wSOL account, which would unwrap the wSOL in it; such routes are not offered.
  Accepted for v1; NEAR Intents still serves those swaps.
- **LI.FI's Solana fee wallet is pinned** — a wallet LI.FI moves stops its Solana swaps at
  the binding until `LIFI_SOLANA_FEE_WALLET` follows, as a fee increase does on both
  chains.
- **Solana blockhash expiry** — between the execution re-quote and broadcast only one
  threshold Schnorr signature happens (seconds), well inside 60–90 s. A transaction
  that still expires is detected by the poller (no signature status + an invalid
  blockhash, on two consecutive polls) and ends `Failed`, never `Succeeded`. A node
  running behind cannot fake the expiry: the blockhash is read at or past the slot OISY
  simulated the transaction at, and a missing status counts only from a node at or past
  the blockhash read.
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
   array, whose Solana transaction is not a version 0 message, whose Solana transaction
   needs another signer, or whose Solana transaction closes the user's existing wSOL
   account while it holds wSOL, is never shown and never executed.
7. An ERC-20 swap first re-checks the price without touching the chain and aborts with
   the slippage copy if `toAmountMin` dropped, then goes through the unchanged
   `approve()` with the pinned Diamond (which equals the quote's `approvalAddress`) as
   spender — skipped when the allowance already covers `fromAmount`, reset-then-approve
   when it is non-zero and smaller — waits for an allowance `>= fromAmount`, and only then
   broadcasts the swap with OISY-computed EIP-1559 fees. The form's balance validation
   reserves the swap-leg ceiling plus zero, one or two approval fees according to one
   allowance read at quote selection, so the reset path is budgeted. A native swap does
   not approve. `approve()` and its existing callers are unchanged.
8. An EVM swap is never signed unless its calldata decodes, as a function of the pinned
   ABIs for its route kind (a bridge the request allowed, cross-chain; same-chain, the
   one whose native input and output match the source and destination tokens), to the requested
   source token and amount, the user's recipient (EVM, or the user's Solana address for
   a Solana destination), with every receiver and refund field in the curated facet's
   own data equal to the user, the requested destination chain, the requested
   destination token (cross-chain, as the facet's own data names it) and a minimum
   output at least the displayed `toAmountMin` (cross-chain, as the facet computes it);
   and unless every swap call it makes through the Diamond is on the Diamond's whitelist
   and targets neither the Diamond, an asset of the route nor a token the user approved
   to the Diamond, its fee forwarding forwards the source token and at most LI.FI's
   25 bps, and the only swap before an Across bridge is that fee forwarding, its fill open
   to any relayer and its deadline at most 3 h ahead. A route with a destination call
   is never signed. Calldata that does not decode, or a whitelist that cannot be read,
   aborts the swap.
9. A Solana swap is never signed unless a simulation of its exact bytes, with the
   pre-state read at the very slot the simulation ran at, succeeds, shows no control
   change, leaves every token account it creates for the user with the user
   as owner and no foreign delegate or close authority, closes none of the user's
   pre-existing accounts but their own wSOL account when it held no wSOL, and that one
   only to the user, sets exactly one compute unit limit, contains only the pinned
   top-level instructions, each with its exact data and accounts (any `CloseAccount`
   paying the user, LI.FI's fee paid only to its pinned wallet and at most 25 bps, and the route's decoded on-chain minimum
   output at least `toAmountMin`, with no platform fee), sets a network fee within the
   reviewed ceiling, calls (top-level or nested)
   only programs in `SOLANA_KNOWN_PROGRAM_ADDRESSES` or the pinned
   `LIFI_SOLANA_PROGRAM_ADDRESSES`, spends no more than `fromAmount` (plus the
   transaction's own LI.FI ceiling) from the user's accounts and, Solana → Solana,
   credits at least `toAmountMin` (for a native-SOL destination, net of at most that
   ceiling). A failed or
   timed-out simulation aborts the swap.
10. The destination picker offers EVM and Solana tokens for an EVM source, and (from
    PR 3) Solana tokens for a Solana source, even when no other provider covers that
    category, and Solana networks and tokens stay in the swap pickers when NEAR Intents
    is off but LI.FI is on. Until PR 3 the Solana **source** picker is exactly what it
    is without LI.FI (NEAR Intents' list); from PR 3 every known Solana **mainnet**
    token is selectable as a source, and devnet or local SOL tokens never are.
11. A Solana swap signs LI.FI's transaction bytes unchanged (no recompilation) and
    broadcasts them, sending the same bytes again while the outcome is unknown; once an
    attempt's outcome is unknown, a later refusal keeps the row and the swap counts as
    sent. With a LI.FI offer from a Solana source, the form, its validation, "Max" and the
    review use LI.FI's ceiling (the transaction's compute budget, base fee and the rent of
    every account it creates, a Token-2022 one sized from its mint's extensions), not the
    fee context's transfer estimate; a route whose rent cannot be bounded gets no offer.
12. The AUT row is created after signing and before the broadcast: a swap whose row
    cannot be created is not broadcast, and a row is deleted only when the node's error
    proves the transaction was not accepted; an ambiguous error (`already known`,
    `nonce too low`) or a transport failure keeps it for the poller, and the swap goes on
    as sent, never offered for signing again.
    After broadcast, the modal closes, the row appears in the Active-transactions
    panel labelled "LI.FI", and it reaches `Succeeded` / `Failed` in the background,
    including after a page reload. Every terminal LI.FI row triggers one wallet
    refresh and an explicit reload of its EVM source, gas and (EVM) destination
    balances; after a partial payout, of every enabled fungible token of the destination
    chain.
13. `DONE/PARTIAL` ends `Succeeded` and the row shows the token actually received, with
    its amount correctly formatted; `DONE/REFUNDED` ends `Failed` with the refunded copy.
14. A reverted / dropped (EVM) or reverted / expired (Solana) source transaction ends
    `Failed`, and a confirmed one ends a same-chain row `Succeeded` without asking
    `/status`; a `NOT_FOUND` / `INVALID` status alone never terminates a row before the
    source is confirmed and the 6 h unresolved-status bound has passed, after which the
    row ends `Failed` with the "outcome unknown" copy. That bound starts after source
    confirmation, accumulates observed time on the page's monotonic clock in capped
    per-poll steps (persisted in `localStorage` across reloads; a clock jump cannot
    hasten it), and never compares against
    `created_at_ns`. A `/status` HTTP 404 (code 1003) counts as `NOT_FOUND`, never as a
    swallowed error. A terminal write that fails leaves the row's window in place, and
    the next poll repeats the verdict. A Solana row is marked expired
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
20. The backend rejects a `Lifi` row whose token pair is outside the v1 matrix (an EVM
    chain id without a pinned Diamond, a devnet Solana token, a Solana → EVM pair, an
    NFT, ICP, BTC or XRP token, or the same token on both sides), so no stored row can
    be one the poller cannot drive to a terminal status.
21. `getMultipleAccountsInfo` keeps its array return type and every existing caller and
    test is unchanged; only the LI.FI path uses the context-bearing sibling.

## Open questions

Facts still to confirm. The first two gate PR 4 (the flag flip), not PRs 1–3; the
third is answered for NEAR Intents.

- **Production API key.** A separate key, scoped to OISY's production origins, must be
  registered on LI.FI's partner portal and set as a deployment secret. Owner: whoever
  holds the LI.FI partner account.
- **Rate-limit scope.** Is LI.FI's 100 requests / min limit per key or per IP? If per
  key, the 30 s [cadence](#cadence-on-input-change-then-every-30-s) must be checked
  against expected production traffic before the flip. Owner: ask LI.FI.
- **EVM → Solana coverage with the curated bridges.** Keyless `/v1/quote` probes on
  2026-10-14 (Arbitrum USDC → Solana USDC and → SOL, 50 USDC, an unregistered
  integrator id) returned no route through the curated set: Across answered 404 "No
  available quotes", NEAR Intents and Mayan answered 422 "None of the available routes
  could successfully generate a tx". Without the allow-list LI.FI routed through Relay.
  Re-run keyless on 2026-10-19: NEAR Intents now quotes EVM → Solana (Arbitrum USDC →
  Solana USDC, Arbitrum ETH → SOL) as well as EVM → EVM, and those quotes' calldata
  backs the binding's specs; Across still has no EVM → Solana route. EVM → Solana
  therefore ships through NEAR Intents. Still to re-run with the registered integrator
  id and key: whether Across serves EVM → Solana then. Owner: implementer, with the
  staging key.

## Decisions

Recorded so a future reader can tell "excluded on purpose" from "forgotten".

- **Solana-source swaps get no staging-only period** (2026-10-28). PR 4 (#14404) set
  `LIFI_SWAP_ENABLED` to `true` before 3d, so the restriction 3d-3 lifts is the only gate
  left, and Solana → Solana LI.FI swaps reach every environment as 3d-3 merges. A
  separate staging-only flag was considered and not added.
- **Solana → EVM is not in v1.** The simulation binding bounds _what_ leaves the wallet
  and _through which programs_, but not the EVM recipient inside a Solana bridge
  program's instruction. PR 3 ships Solana → Solana only; Solana → EVM follows in a
  later PR with a per-bridge instruction decoder for the allowed bridges.
- **EVM → Solana is allow-listed to the curated facets whose own data carries the Solana
  receiver**, which OISY decodes and binds: Across V4 and NEAR Intents (Mayan once its
  tool keys are confirmed). Other bridges are not offered.
- **All cross-chain EVM routes use curated bridge facets** whose bridge-specific receiver
  and refund fields OISY decodes and binds (Across V4 and NEAR Intents to start). Other
  bridges are not offered until a decoder is added.
- **LI.FI calldata is decoded locally, with pinned ABIs**, not through the Diamond's
  `CalldataVerificationFacet`: the deployed v1.1.1 on five of the six pinned Diamonds has
  no `extractNonEVMAddress`, and the bridge facets' own ABIs are needed anyway. Only the
  whitelist check is an on-chain read (2026-10-19).
- **Across is offered behind LI.FI's fee forwarding only, never behind a DEX swap.** Its
  minimum output is unsigned, so behind a DEX swap whose recipient OISY cannot decode it
  could not be bound; NEAR Intents' minimum is signed by LI.FI and may follow DEX swaps
  (2026-10-19).
- **LI.FI's fee is bound to 25 bps** (`LIFI_FEE_BPS`), the fee every captured route
  forwards, rather than read from the unsigned quote's `feeCosts`.
- **A route through Across that the binding would refuse is re-quoted once without
  Across** at quote time, so that NEAR Intents can serve the pair, rather than leaving the
  pair without a LI.FI offer. It costs one more quote request, only for such routes
  (2026-10-20).
- **Solana routes go through Jupiter only in v1** (`LIFI_SOLANA_ALLOWED_EXCHANGES`):
  through `route_v2`, the variant LI.FI's transactions call (2026-10-22), or its
  shared-accounts form `shared_accounts_route_v2`. DFlow, LI.FI's best Solana route in
  both directions probed, follows only with its own pinned instructions and
  minimum-output decoder.
- **LI.FI's Solana fee is bound like its EVM one**: at most 25 bps, paid only to its pinned
  fee wallet, by a pinned transfer next to a pinned instruction of LI.FI's program that
  receives no account of the user's (2026-10-22).
- **The user's own wSOL account may be closed when it held no wSOL** (2026-10-23): LI.FI's
  routes from or to SOL use it whenever the wallet has one. One that holds wSOL would be
  unwrapped, so such a route is not offered.
- **Jupiter's venues are pinned** (2026-10-23): `LIFI_SOLANA_PROGRAM_ADDRESSES` lists
  every venue Jupiter publishes that `SOLANA_KNOWN_PROGRAM_ADDRESSES` leaves out, and JupLend
  AMM's two internal programs, rather than leaving the calls inside a pinned `route_v2` to
  Jupiter: the rule that every program a swap reaches is known holds for LI.FI as for the
  WalletConnect review. The cost is a route through a venue Jupiter adds later, refused
  until the list follows; 3d simulates the display quote's transaction at the review step
  so that the refusal comes before the user confirms, not after.
- **The Solana spend and receipt bounds use the transaction's own LI.FI ceiling**
  (2026-10-23), not a fixed `LIFI_SOL_MAX_FEE_LAMPORTS`: the ceiling is computed for the
  network-fee bound anyway, is held to the one the user reviewed, and is what the
  transaction can cost, where a fixed cap sized for any route would let every route spend
  as much.
- **The route's minimum is checked as LI.FI rounds it**, to the nearest unit: the minimum
  Jupiter enforces may then be one base unit below the displayed one (2026-10-23).
- **LI.FI's Solana transactions must be version 0 messages** (2026-10-22): the fee is
  bounded from their Compute Budget instructions, which a version 1 message replaces with
  its config. Accepting version 1 would need version-aware pricing in the form's ceiling
  and in execution's fee bound alike.
- **A Solana broadcast is sent again with the same bytes** while its outcome is unknown,
  as EVM's is since 2b-5: one signature lands once at most. A refusal deletes the row only
  when it answers the first attempt; EVM's `swap()` takes the same rule in 3d, as hardening
  (2026-10-22).
- **Solana top-level instructions are pinned** by `(program, discriminator)`, not just by
  program, so a known DEX program cannot be used for anything but the allowed route.
- **Failure reasons stay off-screen**, matching Velora and NEAR Intents (icon only).
- **The unresolved-status bound starts after source confirmation and accumulates
  observed time in capped per-poll steps, persisted in `localStorage`**, so reloads do
  not restart it and clock jumps cannot hasten it; another device starts its own window.
- **Native-SOL receipts are checked net of the transaction's LI.FI ceiling**, not by
  reconstructing gross
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
  replacement counter, so both row kinds stay at 14 of the 16 refs.
- **`@lifi/sdk` (core only) is approved** as a new dependency.
- **PR 2 is split into 2a / 2b** up front, and 2a into 2a-1 (quote client) / 2a-2
  (registration).
- **The LI.FI integrator id and the staging API key are registered.** Their values are
  set in the environment outside the repository, as the repository secrets the deploy
  workflow reads ([API key](#api-key)). The **production** key is not registered yet; it
  is a prerequisite for PR 4 (see [Open questions](#open-questions)).

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
