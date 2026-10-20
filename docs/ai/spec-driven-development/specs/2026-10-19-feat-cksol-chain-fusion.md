> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Convert between SOL and ckSOL through Chain Fusion

- **Type:** `feat`
- **Area:** Frontend (ckSOL token, Chain Fusion swap provider for Solana, ckSOL minter client, active user transactions, Activity); backend (two new Chain Fusion directions)
- **Status:** Draft for review. PR 6 waits for the ckSOL automatic deposit flow on mainnet (§14, Q1).

---

## 1. Motivation

ckSOL is the chain-key twin of SOL on the Internet Computer: an ICRC token backed 1:1 by SOL that the ckSOL minter holds on Solana. Its minter, ledger and index were installed on mainnet through NNS proposals in October 2026. OISY already converts BTC ↔ ckBTC and ETH / ERC-20 ↔ ckETH / ckERC-20 through the **Chain Fusion** swap provider (PRODUCT.md → Swap → Chain Fusion as a swap provider).

This feature:

1. lists **ckSOL** as a token;
2. adds **SOL → ckSOL** and **ckSOL → SOL** to the Chain Fusion swap provider, tracked across sessions like the other Chain Fusion conversions.

## 2. What exists already

- **Chain Fusion swap provider.** Pairs come from `CHAIN_FUSION_PAIRS` (`src/frontend/src/lib/constants/swap.constants.ts`) and are limited to pairs whose native side is on Ethereum mainnet or Bitcoin mainnet by `ENABLED_TWIN_NETWORK_IDS` (`src/frontend/src/lib/utils/chain-fusion-swap.utils.ts`). Quotes and executors are in `src/frontend/src/lib/services/chain-fusion-swap.services.ts`, registered per source in `src/frontend/src/lib/providers/*-swap.providers.ts`. `solSwapProviders` has NEAR Intents only, `SwapSolWizard.svelte` (`src/frontend/src/sol/components/swap/`) executes NEAR Intents only, and Solana mainnet's swap destinations (`SUPPORTED_CROSS_SWAP_NETWORKS`) do not include ICP.
- **Active user transactions.** The `ChainFusion` variant carries a `ChainFusionDirection` with six directions (`src/shared/src/types/active_user_transaction.rs`). `require_chain_fusion_pair` (`src/backend/src/active_user_transactions/model.rs`) checks token kinds only. The poller `pollChainFusionActiveUserTransactions` (`src/frontend/src/lib/services/chain-fusion-swap-active-tx.services.ts`) dispatches on the direction, and the rows' refs are `CHAIN_FUSION_EXTERNAL_REF_KEYS` (`src/frontend/src/lib/types/chain-fusion-swap.ts`). `TokenId::SolNativeMainnet` exists.
- **ck tokens.** One env file per family (`src/frontend/src/env/tokens/tokens-icrc/tokens.icrc.ck.btc.env.ts`, …) gives ledger, index, minter, `exchangeCoinId`, `twinToken` and `groupData`; `tokens.icrc.ck.env.ts` aggregates them. Prices follow `exchangeCoinId`, and `src/frontend/src/lib/derived/exchange.derived.ts` already maps `solana`. SOL has no token group yet.
- **ck withdrawals** run through `sendIc` (`src/frontend/src/icp/services/ic-send.services.ts`), which picks the minter leg from the target network: an ICRC-2 approve, then the minter call.
- **Sending SOL.** `sendSol` (`src/frontend/src/sol/services/sol-send.services.ts`) sends to any address and returns the transaction signature once `confirmed`. The NEAR Intents SOL swap already uses it to pay a deposit address.
- **Activity.** `mapCkEthereumTransaction` (`src/frontend/src/icp/utils/cketh-transactions.utils.ts`) decodes the minter's CBOR memos: a mint reads "Converted from ETH", a burn is a send to the Ethereum address in its memo.
- **Minter clients.** ckBTC and ckETH come from `@icp-sdk/canisters`. Nothing covers ckSOL: `@icp-sdk/canisters` 4.0.0 has only `ckbtc` and `cketh`, and OISY is pinned to 3.1.0. The CMC was added by hand for minting TCYCLES (#14132): a `dfx.json` entry with the published candid, generated bindings in `src/declarations/`, and a thin wrapper class.

## 3. How ckSOL works

Verified against `dfinity/cksol` (`minter/cksol_minter.did`, `docs/src/development/design.md`) and the live canisters on 2026-10-16 and 2026-10-19. The automatic deposit flow (3.3) is verified against its open pull requests: dfinity/cksol#272 (design) up to dfinity/cksol#274 (top of the stack).

1. **Canisters** (mainnet, Solana mainnet): minter `lh22c-kyaaa-aaaar-qb5nq-cai`, ledger `ls5lp-lqaaa-aaaar-qb5oa-cai`, index `2ezyf-hqaaa-aaaar-qb6ga-cai`. The ledger is a standard ICRC-1/2/3 ledger: symbol ckSOL, 9 decimals (one unit is one lamport), fee 500 lamports. A staging suite on Solana Devnet (ckDevnetSOL) exists, but it is out of scope (§11).
2. **Deposit address.** `get_deposit_address` returns one fixed Solana address per account (principal and subaccount), derived by the minter. It is an update call.
3. **Automatic deposit**, the flow OISY uses. `watch_deposit_address({ subaccount })` is free, needs no cycles, and only ever credits the caller. It registers the caller's deposit address for 24 hours and returns the address, the minimum deposit amount, the automatic deposit fee, the status (`Watching`, with the end of the window and the next scan, or `Detected`, with the deposit id) and the id of the latest deposit of the account. The minter reads the address balance at 0, 1, 2, 4, 6 and 10 minutes, every 5 minutes up to 30 minutes, then hourly up to 23.5 hours. Once the balance reaches the minimum, it queues the whole balance for a sweep. Calling again reports the status and does not extend the window; after the window has ended, a call registers the address again. After a mint, the next deposit needs a new call.
4. **Manual deposit.** `deposit_sol` does the same once and immediately, but needs 1T cycles attached to the call, which a browser cannot do. OISY does not use it (§14, D1).
5. **Mint.** The minter sweeps queued deposits to its main account every minute and mints once the sweep is finalized. `deposit_sol_status(id)` reports `Queued`, `Swept`, `Finalized`, then `Minted` with the minted amount. A sweep that fails or expires reports `Dropped`, and the minter registers the address for a new window on its own when its watchlist (1,000 addresses) has room. `Quarantined` means the minter stopped processing the deposit, and only a minter upgrade resolves it.
6. **Amounts.** The minimum deposit is 0.02 SOL, applied to the balance of the deposit address. The minted amount is the swept amount minus 5,000 lamports (the deposit's share of the sweep's Solana fee) minus the automatic deposit fee (0.002 SOL, the value proposed in the open PRs). The first deposit to an address also leaves 0.00089088 SOL of rent on it for good; later deposits do not pay it again.
7. **One deposit at a time per account.** While a deposit is queued, swept or finalized, the minter queues no other deposit for the account and registers no new watch. SOL that arrives in the meantime waits on the address for the next registration.
8. **SOL is never lost on the address.** Until a sweep is queued, the SOL stays on the deposit address, and a later registration sweeps all of it.
9. **Withdrawal.** An ICRC-2 approve on the ckSOL ledger (spender: the minter), then `withdraw_sol({ address, amount, from_subaccount })`, which burns the ckSOL and returns the burn index. `withdraw_sol_status({ block_index })` reports `Pending`, `TxSent` with the Solana signature, then `TxFinalized` with `Success` or `Failure`. The minimum is 0.002 SOL, and the 0.001 SOL withdrawal fee is deducted from what arrives. A destination that cannot receive SOL fails the whole transaction and the burned ckSOL is not refunded; the user's own Solana address is always a valid destination.
10. **Memos.** The ledger memos are CBOR, like ckETH's: a mint carries the sweep signature and the deposit id, a burn carries the destination address.

## 4. Rollout flag

A new flag `CKSOL_ENABLED`, defined as `LOCAL || STAGING` (the idiom of `CYCLES_MINT_ENABLED`, `src/frontend/src/env/cycles-mint.env.ts`), gates everything in this spec: the ckSOL token, the SOL ↔ ckSOL pairs, and the network filters that let Solana and ICP reach each other in Swap. With the flag off, production behaves exactly as today. It is turned on in production after a real conversion in both directions on staging.

Local builds cannot convert: they carry no mainnet ck tokens, there is no local ckSOL minter, and Chain Fusion only offers pairs whose native side is on mainnet. Conversions are tested on the test environments and staging, which talk to the mainnet canisters, with real SOL (at least 0.02 SOL per deposit).

## 5. The ckSOL token

1. ckSOL is a curated Chain Fusion token like ckBTC and ckETH: the mainnet ledger, index and minter, the SOL price (`exchangeCoinId` `solana`), SOL on Solana mainnet as its twin, and the ledger's own logo (`icrc1:logo`), which OISY shows for ck tokens as it does for ckBTC and ckETH, so no icon file is shipped.
2. It is **not enabled by default** (D4). A conversion to ckSOL enables it, as it does for every Chain Fusion destination, and users can enable it in Manage tokens.
3. SOL and ckSOL appear as one **Solana** token group, as BTC / ckBTC and ETH / ckETH do (D9).
4. The ckSOL page has the actions of any ICRC token. It gets no Convert button (D2).
5. The minter's info (minimum deposit, automatic deposit fee, minimum withdrawal, withdrawal fee) is read when a SOL ↔ ckSOL quote needs it.

## 6. SOL → ckSOL

### 6.1 Offer

- With SOL on Solana mainnet as the pay token, ckSOL is among the receive options, offered by Chain Fusion only.
- The offer needs the minter's info and the user's deposit address with its current balance. Without them there is no offer. The deposit address is asked from the minter once and kept for the user, since it never changes.
- **Receive amount** = amount − automatic deposit fee − 5,000 lamports − the part of the 0.00089088 SOL rent the deposit address does not hold yet (all of it for an empty address, nothing once the address holds it). The fee section lists each part on its own row, and the Solana network fee of the user's transfer, paid on top as for any SOL send.
- **Minimum:** the minter's minimum deposit amount (0.02 SOL), shown on the provider sheet as for the other minters.
- **One at a time** (D3): while a SOL → ckSOL conversion of the user is in flight (§6.3), Chain Fusion makes no SOL → ckSOL offer, and the form says that a conversion is already in progress.

### 6.2 Execution

1. On confirm, OISY first calls `watch_deposit_address`. It goes on only when the answer is `Watching`, for the quoted deposit address, with a minimum the amount still meets and a fee no higher than quoted. `Detected` (a deposit is already in flight), `TemporarilyUnavailable`, `TooManyWatchedAddresses`, `Quarantined` or a failed call stop the conversion before any SOL moves, and the form says why.
2. OISY sends the SOL to the deposit address.
3. Once the transfer has a signature, OISY opens the active user transaction row (§8) and enables ckSOL.

Registering before the transfer is what makes the mint independent of OISY: from that call on, the minter itself watches the address for 24 hours, so the ckSOL arrives even if the tab closes before the row exists. If the transfer fails, nothing moved, and the registration simply expires.

### 6.3 Settlement

The row stays in flight until the minter reports the mint. About once a minute, not on every poll, the poller calls `watch_deposit_address`:

- `Watching` keeps the row in flight. Once the window has ended, the same call registers the address again, so a late transfer is still found.
- `Detected` gives the deposit id. The row keeps it and from then on follows `deposit_sol_status`: `Queued`, `Swept` and `Finalized` keep it in flight; `Minted` closes it as succeeded, showing the minted amount; `Dropped` keeps it in flight, and the next `watch_deposit_address` call registers the address again if the minter could not; `Quarantined` closes it as failed, saying that the minter holds the SOL until an upgrade resolves the deposit.
- The row only accepts a deposit id newer than the latest deposit id the minter reported when the row was opened, so an earlier deposit's mint is never taken for this one.

The minted amount can exceed the conversion when the address held more SOL (§3.8). It is shown as minted.

## 7. ckSOL → SOL

### 7.1 Offer

- With ckSOL as the pay token, SOL on Solana mainnet is among the receive options. The SOL goes to the user's own Solana address.
- **Receive amount** = amount − the minter's withdrawal fee (0.001 SOL). The ledger fee of the approval (500 lamports of ckSOL) is paid on top.
- **Minimum:** the minter's minimum withdrawal amount (0.002 SOL).

### 7.2 Execution

Through `sendIc`, like the other ck withdrawals: the approval, then `withdraw_sol` to the user's own Solana address. The burn index keys the row. An error answer from `withdraw_sol` means nothing was burned, so it is an ordinary error.

### 7.3 Settlement

The poller asks `withdraw_sol_status` with the burn index. `NotFound` right after the burn, `Pending` and `TxSent` keep the row in flight, and `TxSent` records the Solana signature. `TxFinalized` with `Success` closes it as succeeded; with `Failure` it closes as failed.

## 8. Settlement across sessions

Both directions are rows of the existing `ChainFusion` variant, with two new directions: **`SolToCkSol`** and **`CkSolToSol`**. The backend accepts them for SOL (native, mainnet or devnet) on one side and an ICRC token on the other, with tests for both. Adding enum values is a breaking candid change and ships alone as `feat(backend)!:` (precedent #13710).

Each row snapshots the minter and writes the display refs every Chain Fusion row writes, plus:

- SOL → ckSOL: the deposit address, the transfer signature and the latest deposit id at opening; learned later: the deposit id.
- ckSOL → SOL: the burn index; learned later: the withdrawal's Solana signature.

The rows show in the Active transactions list like the other Chain Fusion conversions, and report into the swap analytics funnel with Chain Fusion as provider. There are no new analytics events.

## 9. ckSOL minter client

No SDK wraps the ckSOL minter, so OISY adds it the way it added the CMC (#14132): a `dfx.json` entry pointing at the candid published with a `dfinity/cksol` release, generated bindings in `src/declarations/`, and a thin wrapper class for the calls this spec needs: `get_minter_info`, `get_deposit_address`, `watch_deposit_address`, `deposit_sol_status`, `withdraw_sol` and `withdraw_sol_status`. The current release, `cksol_minter-v0.1.0`, has everything the withdrawal needs; the deposit needs the release that ships `watch_deposit_address`. `dfx.json` is restricted and `src/declarations/` needs approval (CLAUDE.md); both were approved with this spec (D8).

## 10. Activity

- A ckSOL mint reads "Converted from SOL", from the Solana network, with a link to the sweep transaction from its memo.
- A ckSOL burn is a send to the Solana address in its memo, with an explorer link.

## 11. Non-goals

- A Convert flow or Convert buttons for ckSOL (D2).
- ckDevnetSOL, or any Solana Devnet pair (D5).
- Showing the deposit address in ckSOL Receive, for deposits from exchanges (D6). That needs its own spec, including a check for SOL left on the deposit address outside a conversion (§3.8).
- The manual `deposit_sol` flow, or any backend call to the minter (D1).
- Subaccounts, and withdrawing to someone else's Solana address.
- SPL tokens.
- Conversions on local builds (§4).

## 12. Acceptance criteria

- **AC1** With the flag off, there is no ckSOL token and no SOL ↔ ckSOL offer, and production behaves as today.
- **AC2** With the flag on, ckSOL is listed but not enabled by default, priced as SOL, with the ckSOL logo, and Manage tokens can enable it.
- **AC3** SOL on Solana mainnet as pay token gets a Chain Fusion offer for ckSOL, and ckSOL gets one for SOL. No other Solana token or network gets a Chain Fusion offer.
- **AC4** The SOL → ckSOL offer shows the receive amount and fee rows of §6.1, with the fee and minimum the minter reports, and refuses an amount below the minimum.
- **AC5** Confirming calls `watch_deposit_address` before any SOL moves. Unless the answer is `Watching` for the quoted address, minimum and fee, no SOL moves and the form says why.
- **AC6** After the transfer, the conversion shows in Active transactions and ckSOL is enabled. The row closes as succeeded with the minted amount once the minter reports `Minted`, across modal close, refresh, tab close and logout.
- **AC7** A row never takes a deposit whose id is not newer than the latest deposit id at opening.
- **AC8** While a SOL → ckSOL conversion is in flight, no new SOL → ckSOL offer appears, and the form explains why.
- **AC9** `Dropped` keeps the row in flight until a later deposit is minted; `Quarantined` closes it as failed with the explanation of §6.3.
- **AC10** The ckSOL → SOL offer shows amount − 0.001 SOL received, the approval fee on top, and the 0.002 SOL minimum. Executing approves and calls `withdraw_sol` to the user's own Solana address, and the row follows `withdraw_sol_status` to succeeded or failed.
- **AC11** Activity labels ckSOL mints and burns as in §10.
- **AC12** PRODUCT.md documents ckSOL and the Solana Chain Fusion pairs, including the non-goals.

## 13. Implementation plan (atomic PRs)

1. `docs(ai): add spec for converting SOL and ckSOL through Chain Fusion`: this spec.
2. `feat(backend)!: add the SolToCkSol and CkSolToSol Chain Fusion directions`: §8, with a `BREAKING CHANGE:` line.
3. `feat(frontend): add a ckSOL minter client`: §9 from `cksol_minter-v0.1.0`, no UI.
4. `feat(frontend): add the ckSOL token behind a rollout flag`: §4 and §5, PRODUCT.md (Tokens).
5. `feat(frontend): convert ckSOL to SOL through Chain Fusion`: §7, the row and its poller, PRODUCT.md. Works with the minter as it is today. Stacked on 2 to 4.
6. `feat(frontend): convert SOL to ckSOL through Chain Fusion`: §6, the client update to the release with `watch_deposit_address`, the row and its poller, PRODUCT.md. Waits for Q1. Stacked on 2 to 4.
7. `feat(frontend): label ckSOL mints and burns in Activity`: §10.
8. Translations of the new strings, which may trail the PRs that add them.
9. `feat(frontend): enable ckSOL`: turns the flag on everywhere after a real conversion in both directions on staging.

Every new component, store and service ships with tests (coverage gate).

## 14. Open questions and pending decisions

### Open questions (facts to confirm)

- **Q1** When the automatic deposit flow reaches the mainnet minter, and with which automatic deposit fee (0.002 SOL proposed). On 2026-10-19 the ckSOL team said "very soon"; that day its pull requests and the SOL RPC prerequisite (dfinity/sol-rpc-canister#394) were still open. The candid of `watch_deposit_address` is re-checked against the release before PR 6.

### Pending decisions (facts are clear)

None.

### Resolved (2026-10-19)

- **D1 Deposit trigger:** `watch_deposit_address`, called from the frontend. No backend proxy for `deposit_sol`; the backend only gains the two directions (§8).
- **D2 Entry point:** Swap, through the Chain Fusion provider, only.
- **D3 One conversion at a time:** a second SOL → ckSOL waits until the first is minted, because the minter takes one deposit per account at a time (§3.7).
- **D4 Token list:** ckSOL is not enabled by default; the first conversion enables it.
- **D5 ckDevnetSOL:** left out, since Chain Fusion only offers mainnet pairs.
- **D6 Deposits from exchanges:** later, in their own spec.
- **D7 Testing:** on the test environments and staging, with real SOL; local builds cannot convert (§4).
- **D8 Minter client:** the ckSOL minter is added to `dfx.json`, with its bindings in `src/declarations/` and a thin wrapper class, as for the CMC (§9). Approved as CLAUDE.md requires. The alternative, waiting for an SDK that wraps ckSOL, was rejected: none does today.
- **D9 Token group:** SOL and ckSOL are shown as one Solana group, as BTC and ETH are with their ck twins (§5.3).
