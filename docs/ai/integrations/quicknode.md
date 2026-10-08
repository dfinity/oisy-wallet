# QuickNode API

OISY uses [QuickNode](https://www.quicknode.com/) for two narrow **Solana**
purposes that we deliberately do not route through the primary Solana provider,
([Alchemy](./alchemy.md), HTTP RPC), because it was not supported at implementation time:

1. **Solana WebSocket subscriptions** (mainnet only) — for transaction
   confirmation. This was originally because Alchemy did not support Solana WebSockets as
   of the last check (2025-01-22). See the TODO in
   `src/frontend/src/env/networks/networks.sol.env.ts`.
2. **SPL token metadata** (mainnet + devnet) — via QuickNode's `getAsset` REST
   add-on.

QuickNode is **not** used for any EVM chain, nor for general Solana HTTP RPC
(that is Alchemy). The same `VITE_QUICKNODE_API_KEY` authenticates both uses.

## What we use it for

| Area                    | Network                 | Transport           | Purpose                                     |
| ----------------------- | ----------------------- | ------------------- | ------------------------------------------- |
| WebSocket subscriptions | Solana mainnet          | WSS (`@solana/kit`) | Transaction-confirmation monitoring on send |
| SPL token metadata      | Solana mainnet + devnet | HTTP POST JSON-RPC  | `getAsset` — token name, symbol, icon       |

## WebSocket subscriptions (transaction confirmation)

The Solana WebSocket subscription client is built by `solanaWebSocketRpc` in
`src/frontend/src/sol/providers/sol-rpc.providers.ts` via
`createSolanaRpcSubscriptions` (`@solana/kit`). **Only mainnet uses QuickNode**
(`SOLANA_RPC_WS_URL_MAINNET`); devnet uses the public Solana endpoint and local
uses `localhost` (`networks.sol.env.ts`).

It is consumed solely in `src/frontend/src/sol/services/sol-send.services.ts`:
`sendSol` builds the subscription client and calls `confirmSignedTransaction`,
which waits for confirmation via:

- `createRecentSignatureConfirmationPromiseFactory` — resolves when the
  transaction signature reaches the target commitment (`confirmed`+).
- `createBlockHeightExceedencePromiseFactory` — detects transaction expiry by
  tracking block height.

Both feed `waitForRecentTransactionConfirmation` during the send flow's `CONFIRM`
step.

## SPL token metadata (`getAsset`)

`splMetadata` in `src/frontend/src/sol/rest/quicknode.rest.ts` issues a JSON-RPC
`getAsset` POST (see <https://www.quicknode.com/docs/solana/getAsset>) and returns
the token's **name, symbol, and icon** (from `metadata` / `links.image`). It
selects the mainnet or devnet endpoint by network.

Consumed by `getSplMetadata` in `src/frontend/src/sol/services/spl.services.ts`,
which enriches custom SPL tokens (not in the default list) with metadata during
token loading.

## Configuration

| Item             | Value                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| API key env var  | `VITE_QUICKNODE_API_KEY` (`src/frontend/src/env/rest/quicknode.env.ts`)                |
| Mainnet endpoint | `https://burned-little-dinghy.solana-mainnet.quiknode.pro/<key>`                       |
| Devnet endpoint  | `https://burned-little-dinghy.solana-devnet.quiknode.pro/<key>`                        |
| WSS (mainnet)    | `wss://burned-little-dinghy.solana-mainnet.quiknode.pro/<key>` (`networks.sol.env.ts`) |

The endpoint hostnames are hardcoded; only the key comes from the environment.

## QuickNode vs. Alchemy (Solana)

|           | QuickNode                                                   | Alchemy                            |
| --------- | ----------------------------------------------------------- | ---------------------------------- |
| Role      | Solana WS subscriptions (mainnet) + SPL `getAsset` metadata | Solana HTTP RPC (mainnet + devnet) |
| Why split | Alchemy lacked Solana WS support (checked 2025-01-22)       | Primary Solana HTTP RPC backend    |

This split is the Solana mirror of how the EVM side mixes providers — see the
TODO in `src/frontend/src/env/networks/networks.sol.env.ts` to collapse to a
single service once Alchemy supports Solana WebSockets.

> As of 2026-06-15 that gap has closed — Alchemy now supports both of QuickNode's
> Solana roles — which turns this split into a deliberate choice rather than a
> constraint. That cross-provider decision (consolidate vs. keep both for
> resilience) is tracked in the index's [Future work](./README.md#future-work),
> not here.
