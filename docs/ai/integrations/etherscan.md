# Etherscan API

OISY uses [Etherscan](https://etherscan.io/) (and its per-chain equivalents —
BaseScan, Arbiscan, PolygonScan, BscScan) **exclusively for EVM transaction
history**: the indexed activity listings that raw JSON-RPC nodes ([Infura](./infura.md),
[Alchemy](./alchemy.md)) cannot provide, because history lookup is not part of the
JSON-RPC protocol. It is reached via the **ethers.js `EtherscanProvider`**
(`src/frontend/src/eth/providers/etherscan.providers.ts`), whose `.fetch(module, params)`
calls map directly to Etherscan's `module=account&action=…` REST API. One provider
instance is created per EVM network.

This is a distinct role from the RPC providers: Etherscan answers "what has this
address done?", while Infura/Alchemy answer "what is the current state?" and
broadcast transactions.

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

| Item            | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| API key env var | `VITE_ETHERSCAN_API_KEY` (`src/frontend/src/env/rest/etherscan.env.ts`) |
| Rate limit      | `ETHERSCAN_MAX_CALLS_PER_SECOND` — 5 (beta/prod) / 2 (other)            |
| Transport       | ethers.js `EtherscanProvider.fetch('account', { action, … })`           |

Networks are configured per network in
`src/frontend/src/env/networks/networks.eth.env.ts` and
`src/frontend/src/env/networks/networks-evm/*.env.ts` (Arbitrum, Base, Polygon,
BSC); ethers selects the matching per-chain explorer API for each.

## Etherscan vs. the RPC providers

|           | Etherscan                               | Infura / Alchemy                                |
| --------- | --------------------------------------- | ----------------------------------------------- |
| Question  | "What has this address done?" (history) | "What is the current state?" + broadcast / push |
| Transport | ethers.js `EtherscanProvider` (REST)    | ethers.js / viem JSON-RPC + WS                  |
| Scope     | EVM only                                | EVM (Alchemy also Solana)                       |
