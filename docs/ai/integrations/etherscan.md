# Etherscan API

OISY uses [Etherscan](https://etherscan.io/) **exclusively for EVM transaction
history**: the indexed activity listings that raw JSON-RPC nodes ([Infura](./infura.md),
[Alchemy](./alchemy.md)) cannot provide, because history lookup is not part of the
JSON-RPC protocol. It is reached through OISY's own `EtherscanProvider` wrapper
(`src/frontend/src/eth/providers/etherscan.providers.ts`), whose
`.fetch({ module, params })` calls map directly to Etherscan's
`module=account&action=…` REST API. One wrapper instance is created per EVM network.

Every chain is served by the **same** Etherscan v2 endpoint,
`https://api.etherscan.io/v2/api`, selected by a `chainid` query parameter — the
per-chain hosts (BaseScan, Arbiscan, PolygonScan, BscScan) are v1 and are no longer
used for API calls, though they remain the chains' user-facing explorers
(`src/frontend/src/env/explorers.env.ts`).

This is a distinct role from the RPC providers: Etherscan answers "what has this
address done?", while Infura/Alchemy answer "what is the current state?" and
broadcast transactions.

## Two transports behind one wrapper

The wrapper builds its transport with `etherscanFetcher`, which picks one of two:

- **ethers.js `EtherscanProvider`** (imported as `EtherscanProviderLib`, to keep it
  distinct from OISY's wrapper of the same name) — for every chain ethers lists.
  This is the path all currently supported networks take.
- **`EtherscanV2Provider`** — OISY's own stand-in, for a chain ethers does **not**
  list. It issues the identical v2 request over the same ethers `FetchRequest`, so
  throttling and retry behave the same; it handles only the non-`proxy` response
  shape, which is all this module asks for.

The stand-in exists because ethers' constructor asserts the chain id against a
hardcoded array in `provider-etherscan.js`, and that array trails newly launched
chains. Nothing past the assert is chain-specific — ethers' own `getUrl` targets the
shared v2 endpoint, and its `getBaseUrl` (the old per-chain host switch) is
documented as deprecated and unused — so a chain it rejects is otherwise perfectly
serviceable. `Network.register` does not help: the assert reads the literal array,
not the network registry.

Which transport is used is decided **by attempting construction**, not by copying
ethers' array, so a chain moves back onto the library automatically once an upgrade
lists it. Note the failure mode this guards: the provider registry is built eagerly
at module import, so a constructor that throws takes the app down at load — and the
SSR prerender in `npm run build` with it — rather than degrading. `vitest.setup.ts`
mocks `ethers/providers` for the whole suite, so **only the build catches this**.

## What we use it for

| Area                    | Etherscan action (`module=account`) | Purpose                                              |
| ----------------------- | ----------------------------------- | ---------------------------------------------------- |
| Native ETH transactions | `txlist`                            | Outgoing/incoming native transaction history         |
| Internal transactions   | `txlistinternal`                    | Value transfers triggered by contract calls          |
| ERC-20 transfers        | `tokentx`                           | ERC-20 (and ERC-4626) token transfer history         |
| ERC-721 transfers       | `tokennfttx`                        | NFT transfer history                                 |
| ERC-1155 transfers      | `token1155tx`                       | Multi-token transfer history                         |
| NFT inventory           | `addresstokennftinventory`          | Token IDs owned in a contract — _defined but unused_ |

All of the above are implemented as methods on `EtherscanProvider`
(`transactions`, `getInternalHistory`, `erc20Transactions`, `erc721Transactions`,
`erc1155Transactions`, `erc721TokenInventory`).

## Transaction history

- **Native + internal** — `transactions()` combines `txlist` and `txlistinternal`
  into a single flat list, with incremental loading via `startBlock` / `endBlock`.
  Consumed by `loadNewEthNativeTransactionsAfterStartBlock` in
  `src/frontend/src/eth/services/eth-transactions.services.ts`.
- **ERC-20 / ERC-4626** — `erc20Transactions()` (`tokentx`), consumed by
  `loadErc20Transactions`. ERC-4626 vault tokens are ERC-20-compatible and use the
  same path.
- **ERC-721 / ERC-1155** — `erc721Transactions()` (`tokennfttx`) and
  `erc1155Transactions()` (`token1155tx`), consumed by `loadErc721Transactions` /
  `loadErc1155Transactions`. These carry the `tokenId` (and value, for ERC-1155).
- **NFT inventory** — `erc721TokenInventory()` (`addresstokennftinventory`) is
  implemented and tested but has **no production callers** today.

Each response is mapped to the shared `Transaction` type
(`src/frontend/src/lib/types/transaction.ts`) and stored in the ETH transactions
store for display in the activity feed.

## Rate limiting & batching

The plan allows ~5–10 requests/second, but fetching a token's history takes two
calls, so the effective ceiling is halved: `ETHERSCAN_MAX_CALLS_PER_SECOND` is
**5** on beta/prod and **2** elsewhere (`src/frontend/src/env/rest/etherscan.env.ts`).
`eth-transactions-batch.services.ts` uses this limit to batch per-token history
loads across the user's token list.

## Spam filtering

ERC-20 transfer listings are passed through
`src/frontend/src/eth/utils/eth-transactions-spam.utils.ts`, which queries the
outer transaction sender (via Alchemy RPC) to drop address-poisoning / zero-value
scam transfers before they reach the UI.

## Backend persistence

When `USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED`
(`src/frontend/src/env/user-transactions.env.ts`) is on, finalized Etherscan
transactions are persisted to the ICP backend and returned first on the next load,
so Etherscan is only re-queried for blocks newer than the last stored one
(`eth-user-transactions.services.ts`).

## Configuration

| Item            | Value                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------- |
| API key env var | `VITE_ETHERSCAN_API_KEY` (`src/frontend/src/env/rest/etherscan.env.ts`)                  |
| Rate limit      | `ETHERSCAN_MAX_CALLS_PER_SECOND` — 5 (beta/prod) / 2 (other)                             |
| Endpoint        | `https://api.etherscan.io/v2/api?chainid=<id>` — shared across all chains                |
| Transport       | ethers.js `EtherscanProvider`, or `EtherscanV2Provider` for a chain ethers does not list |

Networks are configured per network in
`src/frontend/src/env/networks/networks.eth.env.ts` and
`src/frontend/src/env/networks/networks-evm/*.env.ts` (Arbitrum, Base, Polygon,
BSC). The chain is selected by the `chainid` parameter derived from each network's
`chainId`; there is no per-chain API host to configure.

## Etherscan vs. the RPC providers

|           | Etherscan                                                                            | Infura / Alchemy                                |
| --------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Question  | "What has this address done?" (history)                                              | "What is the current state?" + broadcast / push |
| Transport | Etherscan v2 REST, via ethers.js `EtherscanProvider` or OISY's `EtherscanV2Provider` | ethers.js / viem JSON-RPC + WS                  |
| Scope     | EVM only                                                                             | EVM (Alchemy also Solana)                       |
