# Infura API

OISY uses [Infura](https://www.infura.io/) as its **primary general-purpose EVM
JSON-RPC backend** — the workhorse for everyday reads, contract calls, and
broadcasting signed transactions on every EVM chain. It is reached via the
**ethers.js `InfuraProvider`** (`src/frontend/src/eth/providers/infura.providers.ts`),
with a separate **Gas REST API** for fee suggestions
(`src/frontend/src/eth/rest/infura.rest.ts`). One provider instance is created per
EVM network from each network's `providers.infura` config.

This is a distinct role from [Alchemy](./alchemy.md): Infura does the standard RPC
and transaction-broadcast work, while Alchemy fills the gaps Infura cannot (indexed
NFT ownership/metadata, real-time WebSocket subscriptions, Solana). Both `infura`
and `alchemy` endpoints are configured on each EVM network — see the comparison at
the end.

## What we use it for

| Area         | Chains                                       | Transport                  | Purpose                                                       |
| ------------ | -------------------------------------------- | -------------------------- | ------------------------------------------------------------- |
| JSON-RPC     | EVM (Ethereum, Arbitrum, Base, Polygon, BSC) | ethers.js `InfuraProvider` | Balances, nonces, blocks, contract reads, fee data, broadcast |
| Gas REST API | EVM (per chain ID)                           | HTTP `fetch`               | Suggested gas-fee tiers (low / medium / high)                 |
| Event logs   | Ethereum mainnet only                        | ethers.js `InfuraProvider` | ckETH deposit / withdrawal detection                          |

## Account & token state

- **Native balance** — `getBalance`, exposed as `balance` on the base provider
  (`infura.providers.ts`), consumed by `src/frontend/src/eth/services/eth-balance.services.ts`.
- **ERC-20 metadata / balance / allowance / permit** — `name`/`symbol`/`decimals`,
  `balanceOf`, `allowance(owner, spender)`, and ERC-2612 permit detection
  (`isErc20SupportsPermit`) in `infura-erc20.providers.ts`.
- **ERC-1155 balance** — `balanceOf(walletAddress, tokenId)` in
  `infura-erc1155.providers.ts`.

## Fees & gas

- **Fee data** — `getFeeData` (base / max / priority fee) via the base provider.
- **Gas estimation** — `estimateGas` for transfers, approvals, burns and deposits
  (the various `infura-*.providers.ts`).
- **Suggested gas fees (REST, not RPC)** — `InfuraGasRest.getSuggestedFeeData`
  calls `/<key>/networks/<chainId>/suggestedGasFees` and returns low/medium/high
  fee tiers (`infura.rest.ts`). The fee service combines this with the RPC
  `getFeeData` and a floor, taking the **maximum** of all three via `maxBigInt`
  (`src/frontend/src/eth/services/fee.services.ts`).

## Transaction lifecycle

- **Nonce** — `getTransactionCount` with `latest` / `pending` tags, exposed as
  `getTransactionCountLatest` / `getTransactionCountPending`.
- **Block number** — `getBlockNumber`, used for transaction finality tracking
  (`src/frontend/src/eth/services/eth-transactions.services.ts`).
- **Broadcast signed transactions** — `sendTransaction` wraps ethers'
  `broadcastTransaction`; used by the send, swap, approve and NFT-transfer services.
- **Populate unsigned transactions** — `populateTransaction` / `populateApprove`
  build the payloads for ERC-20, ckETH (`infura-cketh.providers.ts`), ckERC20
  (`infura-ckerc20.providers.ts`) and ICP-burn (`infura-erc20-icp.providers.ts`)
  flows.

## NFT & contract reads (on-chain)

Infura reads NFT data directly from contracts (unlike Alchemy's indexed NFT API):

- **ERC-721 / ERC-1155 metadata + token URI** — `name`/`symbol`, then
  `tokenURI(tokenId)` (`infura-erc721.providers.ts`) / `uri(tokenId)`
  (`infura-erc1155.providers.ts`), followed by an off-chain metadata fetch. Results
  are cached per network / contract / token.
- **Interface detection** — ERC-165 `supportsInterface` (`infura-erc165.providers.ts`),
  ERC-721 / ERC-1155 interface checks, and ERC-4626 vault detection
  (`isInterfaceErc4626`, `getAssetAddress`, `convertToAssets` in
  `infura-erc4626.providers.ts`).

## ckETH / Chain Fusion

- **Event logs** — `getLogs({ fromBlock, toBlock, address, topics })` to detect
  ckETH deposit / withdrawal events, **Ethereum mainnet only**
  (`infura-cketh.providers.ts`). These calls are instrumented with the
  `TRACK_INFURA_GET_LOGS_CALL` analytics event because of observed spikes in
  `getLogs` volume.

## Configuration

| Item            | Value                                                                    |
| --------------- | ------------------------------------------------------------------------ |
| API key env var | `VITE_INFURA_API_KEY` (`src/frontend/src/env/rest/infura.env.ts`)        |
| RPC             | ethers.js `InfuraProvider` (network name + key)                          |
| Gas REST API    | `https://gas.api.infura.io/v3/<key>/networks/<chainId>/suggestedGasFees` |

EVM network endpoints are configured per network in
`src/frontend/src/env/networks/networks.eth.env.ts` and
`src/frontend/src/env/networks/networks-evm/*.env.ts` (Arbitrum, Base, Polygon,
BSC), each carrying both an `infura` and an `alchemy` provider entry.

## Infura vs. Alchemy

|           | Infura                                                                                                      | Alchemy                                                                                      |
| --------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Transport | ethers.js `InfuraProvider` + Gas REST                                                                       | viem `PublicClient` + NFT API v3 + WebSocket                                                 |
| Role      | Primary EVM JSON-RPC: balances, fees, nonces, blocks, contract reads, **transaction broadcast**, ckETH logs | NFT indexing (ownership/metadata), real-time mined/pending WS subscriptions, Solana HTTP RPC |
| NFTs      | On-chain reads via contract calls (`tokenURI` / `uri`)                                                      | Indexed ownership + enriched metadata                                                        |
| Chains    | All EVM (Ethereum, Arbitrum, Base, Polygon, BSC + testnets)                                                 | Same EVM set + Solana                                                                        |

They are complementary, not redundant.
