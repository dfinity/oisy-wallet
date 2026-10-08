# Alchemy API

OISY uses [Alchemy](https://www.alchemy.com/) as a multi-chain data provider. A
single API key, `VITE_ALCHEMY_API_KEY` (`src/frontend/src/env/rest/alchemy.env.ts`),
authenticates every chain. Alchemy is reached three different ways — there is
_no_ `alchemy-sdk` dependency:

- **viem `PublicClient`** for EVM JSON-RPC,
- **direct HTTP `fetch`** for the NFT API v3, and
- **plain RPC URLs** for Solana.

## What we use it for

| Area                    | Chains                                       | Transport                  | Purpose                                                 |
| ----------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------------- |
| NFT API v3              | EVM (Ethereum, Arbitrum, Base, Polygon, BSC) | HTTP `fetch`               | NFT ownership, metadata, contracts, spam classification |
| JSON-RPC                | EVM (Ethereum, Arbitrum, Base, Polygon, BSC) | viem `PublicClient` (HTTP) | Transaction lookup, receipt polling                     |
| WebSocket subscriptions | EVM (Ethereum, Arbitrum, Base, Polygon, BSC) | WebSocket                  | Real-time mined / pending transaction notifications     |
| JSON-RPC                | Solana (mainnet + devnet)                    | HTTP only                  | General-purpose Solana RPC (balances, accounts, txs, …) |

## EVM — NFT API v3

Implemented in `src/frontend/src/eth/providers/alchemy.providers.ts` via a
dedicated NFT HTTP client (`/nft/v3/<key>`):

| Endpoint               | Data returned                                                        | Consumed by                                                                 |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `getNFTsForOwner`      | NFTs owned by an address: metadata, images, attributes, OpenSea data | `src/frontend/src/eth/services/nft.services.ts`                             |
| `getNFTMetadata`       | Metadata for a single token                                          | `alchemy.providers.ts` (cached at runtime)                                  |
| `getContractsForOwner` | NFT contracts owned, ERC-721/ERC-1155 standard, spam flag            | `alchemy.providers.ts`                                                      |
| `getContractMetadata`  | Contract name, symbol, token type, OpenSea collection data           | `src/frontend/src/eth/services/erc721.services.ts`, `…/erc1155.services.ts` |

Metadata and contract responses are cached at runtime, and `getContractMetadata`
deduplicates in-flight requests to avoid a thundering herd.

## EVM — JSON-RPC + WebSocket

RPC calls go through viem's `PublicClient` pointed at the Alchemy HTTP endpoint;
subscriptions use the Alchemy WebSocket endpoint.

- `getTransaction` — transaction details (from/to/value/gas/block/hash). Used to
  track pending ETH sends, identify true senders for ERC-20 spam filtering
  (`eth-transactions.services.ts`), and load pending ckETH/ckERC20 transactions
  (`src/frontend/src/icp-eth/services/eth.services.ts`).
- `waitForTransactionReceipt` — blocking poll until a transaction is mined.
- `alchemy_minedTransactions` (WS) — newly mined transactions, optionally filtered
  by recipient address.
- `alchemy_pendingTransactions` (WS) — mempool notifications filtered by recipient.

## Solana — HTTP RPC only

Alchemy is the Solana HTTP JSON-RPC backend for mainnet and devnet, defined in
`src/frontend/src/env/networks/networks.sol.env.ts` and consumed by
`src/frontend/src/sol/providers/sol-rpc.providers.ts`:

```ts
export const SOLANA_RPC_HTTP_URL_MAINNET = `https://solana-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const SOLANA_RPC_HTTP_URL_DEVNET = `https://solana-devnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
```

All standard Solana RPC traffic (balances, account/token data, transactions,
sending transactions) flows through it.

**HTTP only — WebSockets use a different provider.** Solana WebSocket
subscriptions deliberately go to **QuickNode** (mainnet) and the public Solana
endpoint (devnet), _not_ Alchemy, because Alchemy did not support Solana
WebSockets as of the last check (2025-01-22). See the TODO in
`networks.sol.env.ts`. Local devnet (`http://localhost:8899`) bypasses Alchemy
entirely.

## Configuration

| Item            | Value                                                               |
| --------------- | ------------------------------------------------------------------- |
| API key env var | `VITE_ALCHEMY_API_KEY` (`src/frontend/src/env/rest/alchemy.env.ts`) |
| EVM RPC (HTTP)  | `https://<chain>.g.alchemy.com/v2/<key>`                            |
| EVM RPC (WS)    | `wss://<chain>.g.alchemy.com/v2/<key>`                              |
| EVM NFT API     | `https://<chain>.g.alchemy.com/nft/v3/<key>`                        |
| Solana RPC      | `https://solana-{mainnet,devnet}.g.alchemy.com/v2/<key>`            |

The same `VITE_ALCHEMY_API_KEY` authenticates every chain. EVM network endpoints
are configured per network in `src/frontend/src/env/networks/networks.eth.env.ts`
and `src/frontend/src/env/networks/networks-evm/*.env.ts` (Arbitrum, Base,
Polygon, BSC); Solana endpoints in `networks.sol.env.ts`.
