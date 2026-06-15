# QuickNode API

OISY uses [QuickNode](https://www.quicknode.com/) for two narrow **Solana**
purposes that the primary Solana provider ([Alchemy](./alchemy.md), HTTP RPC)
doesn't cover:

1. **Solana WebSocket subscriptions** (mainnet only) — for transaction
   confirmation, because Alchemy did not support Solana WebSockets as of the last
   check (2025-01-22). See the TODO in
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

This split is the Solana mirror of how the EVM side mixes providers — see the TODO
in `networks.sol.env.ts` to collapse to a single service once Alchemy supports
Solana WebSockets.

## Future work — consolidate QuickNode into Alchemy

> Status: not started. The integration is intentionally left as-is for now; this
> section is the entry point for a future task to pick it up.

Both reasons we use QuickNode were re-checked on **2026-06-15** against Alchemy's
current docs, and **both no longer hold** — Alchemy has since added Solana support
for each. The opportunity is therefore to drop QuickNode entirely and serve both
use cases from the existing Alchemy key, removing the second Solana provider (and
`VITE_QUICKNODE_API_KEY`).

### Item 1 — move Solana WS subscriptions to Alchemy (low risk)

- Alchemy now offers Solana WebSocket subscriptions as a GA feature, including the
  exact methods this code relies on: `signatureSubscribe` (signature confirmation)
  and `slotSubscribe` (block-height / expiry tracking).
- Change: point `SOLANA_RPC_WS_URL_MAINNET` (`src/frontend/src/env/networks/networks.sol.env.ts`)
  at the Alchemy Solana WSS endpoint (`wss://solana-mainnet.g.alchemy.com/v2/<ALCHEMY_API_KEY>`)
  instead of QuickNode. Devnet/local are unaffected (already non-QuickNode).
- Verify: `sendSol` confirmation flow in `src/frontend/src/sol/services/sol-send.services.ts`
  (`confirmSignedTransaction` → `waitForRecentTransactionConfirmation`) still
  confirms transactions on mainnet.
- Remove the "Last time checked Alchemy: 2025-01-22" TODO in `networks.sol.env.ts`.
- Docs: <https://www.alchemy.com/docs/reference/solana-subscription-api-endpoints>

### Item 2 — move SPL token metadata to Alchemy DAS `getAsset` (needs validation)

- Alchemy now exposes a Solana DAS API with `getAsset` covering fungible tokens —
  the same call shape as QuickNode's. **Caveat: it is in Beta** ("CU values may
  change"), and field parity was not confirmable from the overview docs alone.
- Before switching, validate that Alchemy's `getAsset` returns the fields
  `splMetadata` maps (`src/frontend/src/sol/rest/quicknode.rest.ts`): token
  `name`, `symbol`, and icon (`links.image`) for real mainnet **and** devnet SPL
  mints.
- Change (if validated): repoint `splMetadata` / `getSplMetadata`
  (`src/frontend/src/sol/services/spl.services.ts`) at the Alchemy DAS endpoint and
  drop `src/frontend/src/env/rest/quicknode.env.ts`.
- Docs: <https://www.alchemy.com/docs/reference/alchemy-das-apis-for-solana/solana-das-api-endpoints/get-asset>

### Cleanup once both items land

- Remove `VITE_QUICKNODE_API_KEY` from `.env.example` / `.env.test` and any deploy
  secrets, delete `src/frontend/src/env/rest/quicknode.env.ts` and
  `src/frontend/src/sol/rest/quicknode.rest.ts`, and remove this provider's row
  from the integrations index (`README.md`) — or repurpose this doc as a historical
  note.
