# Spec: Extend the backend transaction cache to ERC20 tokens

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Store ERC20 transfer history in the backend the way native EVM history is already stored, so an ERC20 token view loads from the user's own canister instead of re-fetching its entire history from Etherscan on every load — and can page back through history that Etherscan will no longer return.

The cache must arrive **together with** an ERC20 paging path. Caching alone reproduces, on every ERC20 view, exactly the truncation that PR #13728 fixes for native coins.

---

## Background

### Two loading paths, only one cached

`loadEthereumTransactions` (`src/frontend/src/eth/services/eth-transactions.services.ts:46`) splits on the token:

|             | native (ETH, BNB, POL, Base/Arbitrum ETH)                   | ERC20 / ERC4626 / ERC721 / ERC1155                |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------- |
| entry point | `loadEthTransactions` (:157)                                | `loadErcTransactions` (:267)                      |
| identity    | required                                                    | **never passed**                                  |
| backend     | one page of stored history + cursor                         | **not used at all**                               |
| Etherscan   | `txlist` + `txlistinternal`, only _after_ the stored cursor | `tokentx`, whole history from block 0, every load |

The backend cache was wired into exactly two places — `eth-user-transactions.services.ts` and `sol-user-transactions.services.ts`. There is no ERC equivalent.

### What that costs today

Every load of an ERC20 token view re-fetches the token's complete transfer history:

- One `tokentx` request per token per load, against a budget of `ETHERSCAN_MAX_CALLS_PER_SECOND` = 5 (beta/prod) or 2 elsewhere, batched across the whole token list by `eth-transactions-batch.services.ts`. A user with many ERC20 tokens pays this repeatedly.
- Plus the spam filter's per-hash RPC calls (see below), also repeated every load.
- History is bounded by what `tokentx` returns in one response — no `offset`/`page` is passed, so the request takes whatever Etherscan's undocumented default is (see Open questions). Beyond that ceiling, older transfers are unreachable today and always will be, because nothing stores them.

### What the backend already supports

No `backend.did` change is needed:

- `TokenId` (`src/declarations/backend/backend.did.d.ts:1638`) already has `Erc20: [string, bigint]` (contract address, chain id) and `Erc721: [string, bigint]`, alongside `EvmNative: bigint`.
- `UserTransaction` is chain-agnostic — `id`, `from`, `to`, `block_index`, `value`, `timestamp`, `network_data`.
- `mapTransactionToUserTransaction` / `mapUserTransactionToTransaction` (`src/frontend/src/eth/utils/user-transactions.utils.ts`) round-trip through `network_data.Evm` and already carry `nft_token_id`. They are reusable unchanged.

So this is entirely frontend work.

### The constraint that shapes the whole change

The native path's ten-row cap is not a bug in the cache — it is what a cache without paging looks like. `loadEthTransactions` asks the backend for one page (`WALLET_PAGINATION` = 10, `src/lib/constants/app.constants.ts:175`) and then asks Etherscan only for blocks _newer_ than the newest stored one, so the page it starts on is the page it ends on. That is the defect PR #13728 addresses, by wiring `loadNextEthUserTransactions` to an infinite scroll.

Applying the same cache to `loadErcTransactions` without an ERC paging path would hand ERC20 views the same ten-row window they have never had. **The paging path is not a follow-up; it is part of this change.**

---

## Scope

**In:** ERC20, and ERC4626 (which loads through the same `loadErc20Transactions` helper).

**Out:** ERC721 and ERC1155 — see Decisions. Native paths are untouched; #13728 already covers them.

---

## Changes

### 1. Block bounds on the ERC Etherscan actions

`erc20Transactions` (`src/frontend/src/eth/providers/etherscan.providers.ts:152`) accepts only `{ address, contract }` and hardcodes `startblock: 0`, `sort: 'desc'`. The same hardcoding is in `erc721Transactions` (:218), `erc1155Transactions` (:272) and `erc721TokenInventory` (:327).

Give the ERC actions the `startBlock` / `endBlock` / `sort` parameters `getHistory` already has (`TransactionsParams`, :33). Paging back needs `endBlock`; incremental loading forward needs `startBlock`.

### 2. An ERC branch for older history

`loadOlderFromEtherscan` (`src/frontend/src/eth/services/eth-user-transactions.services.ts:171`) calls `transactions()`, i.e. `txlist` — native only. It needs to dispatch on the token standard so an ERC20 token fetches `tokentx` bounded by `endBlock: oldestLoadedBlockNumber - 1`, and saves what it finds under `{ Erc20: [contract, chainId] }` — lowercased, and chunked to 500 rows per call (see Backend contract).

### 3. `loadErcTransactions` reads the cache

Mirror `loadEthTransactions`: take `identity`, read one stored page, derive the incremental `startBlock` from `newestBlockIndex + 1`, fetch only newer transfers from Etherscan, combine newest-first, and save newly finalized rows in the background. `resolveEthIncrementalStartBlock` (:100) and `isTransactionFinalized` / `ETH_FINALITY_BLOCKS` = 64 apply unchanged.

### 4. Widen the scroll gate

`EthTransactionsScroll.svelte` (added by #13728) is gated on `isTokenEthereumNative` and builds `{ EvmNative: chainId }`. It must also accept ERC20 tokens and build `{ Erc20: [token.address.toLowerCase(), chainId] }`. The per-token cursor store from #13728 is already keyed by the frontend `TokenId`, so it needs no change.

### Interactions to respect

**Spam filtering must not be re-run on cached rows.** `loadErc20Transactions` (:344) passes every candidate through `filterSpamErc20Transfers`, whose `getTransactionSender` resolves the _outer_ transaction sender via one Alchemy `getTransaction(hash)` call per hash — the defence against address-poisoning `Transfer(victim, attacker, 0)` events, where `transaction.from` is the victim. Consequences:

- Save **filtered** rows, so cached history carries no spam and the filter's RPC calls are paid once per transfer rather than on every load. Skipping this work on the cached page is a large part of the win.
- Do **not** re-filter rows loaded from the backend: it would restore the per-hash RPC cost the cache is meant to remove.
- A transfer already saved before a future filter improvement stays saved. Accepted; note it as a known limitation rather than designing a re-scan.

**ERC4626 mint/burn normalisation becomes a cross-cutting concern.** `loadErc4626Transactions` rewrites `from`/`to` from `ZERO_ETH_ADDRESS` to the vault address, as a display convention — and it does so at the one place vault rows currently enter the store.

The cache stores **raw** rows, so the backend holds chain truth rather than presentation shape. That obliges the transform to move: with a cache and a paging path, vault rows reach `ethTransactionsStore` at three places, and only the first applies it today —

| insertion point                         | source                                          |
| --------------------------------------- | ----------------------------------------------- |
| `eth-transactions.services.ts:321`      | `loadErcTransactions` — Etherscan, initial load |
| `eth-user-transactions.services.ts:164` | backend page, while paging back                 |
| `eth-user-transactions.services.ts:247` | Etherscan, older than the oldest row on screen  |

Leaving it where it is would put raw `0x0` counterparties on the paged rows and vault addresses on the first page of the same list. So hoist the mapping into a shared helper and apply it at every insertion point for an ERC4626 token. The transform is pure and idempotent — after normalisation `from` is the vault, so the `isMint` test is false — hence applying it to rows that have already been through it is harmless, and the helper needs no "already normalised" flag.

**Storage.** This multiplies stored transactions by the number of ERC20 tokens a user holds — bounded per token at 10 000 (see Backend contract), so tokens cannot starve one another, but total per-user growth is real. `loadNextEthUserTransactions` already takes `beAtCapacity` to skip persisting when storage is full, and nothing in the codebase produces that flag — it is always the `false` default. Wiring a producer is out of scope here, but the flag is the hook if it becomes necessary.

---

## Acceptance criteria

1. An ERC20 token view loads its first page from the backend when stored history exists, and asks Etherscan only for transfers newer than the newest stored block.
2. Scrolling an ERC20 token view pages back through stored history, then continues into Etherscan via `tokentx` bounded by the oldest row on screen, and persists what it fetches.
3. An ERC20 view with more history than one page shows more than one page — the negative guarantee that this change does not import the native ten-row cap.
4. Cached ERC20 rows are spam-filtered, and displaying them triggers no `getTransaction` RPC call per row.
5. Saving a token whose fetched history exceeds 500 rows succeeds — the batch is chunked, not rejected with `TooManyTransactions`.
6. The backend `TokenId` is built from a lowercased contract address at both save and load, so one token has one key.
7. A fresh user with no stored history sees exactly what they see today.
8. ERC721 and ERC1155 views behave exactly as they do today.
9. Native views behave exactly as #13728 leaves them.
10. `docs/ai/PRODUCT.md` gains a transaction-history description under `## Ethereum` covering both native and ERC20, since neither is described there today.

---

## Non-goals

- No `backend.did` or stable-state change.
- No change to how spam is detected — only to how often the detection runs.
- No re-scan or migration of transfers saved before a future filter change.
- No pagination for ERC721 / ERC1155 in this change.

---

## Backend contract (confirmed)

Read from `src/backend/src/transactions/model.rs` and `src/shared/src/types/user_transaction.rs`.

| limit                               | value  | consequence                                                                |
| ----------------------------------- | ------ | -------------------------------------------------------------------------- |
| `MAX_USER_TRANSACTIONS_PER_TOKEN`   | 10 000 | per `(principal, token_id)`, so many ERC20 tokens cannot starve each other |
| `MAX_SAVE_USER_TRANSACTIONS_BATCH`  | 500    | **a save of more than 500 rows fails with `TooManyTransactions`**          |
| `MAX_GET_USER_TRANSACTIONS_RESULTS` | 100    | caps `maxResults`; `WALLET_PAGINATION` (10) is well under                  |

**Saves must be chunked.** `save_transactions` rejects the whole batch above 500 rows. The native path never noticed because it only ever offers an incremental slice, but an ERC20 token's first save is its _entire_ fetched history, which routinely exceeds 500. Chunk into batches of ≤500, or the first save of an active token fails outright.

**Duplicates are safe to re-offer.** `save_transactions` builds a `HashSet` of known ids and `continue`s past anything already stored. `DuplicateTransaction` is documented in `user_transaction.rs:142` as _"Reserved — duplicates are currently silently skipped during save"_ and is never constructed anywhere in the backend. So the ERC path may re-offer rows it has already saved without special-casing.

**The token key is a raw string.** `TokenId::Erc20(ErcTokenId, ChainId)` where `ErcTokenId(pub String)` (`src/shared/src/types/custom_token.rs:69`) — no validation, no normalisation, compared byte-for-byte as part of the stable-structures key. Our env tokens carry checksummed addresses while Etherscan returns lowercase, so **lowercase the address when building the backend `TokenId`**, at both save and load. Getting this wrong splits one token's history across two keys, silently.

**Trimming discards the oldest.** Over 10 000 rows for a token, `save_transactions` keeps the newest and trims the oldest at a whole-block boundary. So rows fetched while paging deep into a token already at the cap are trimmed away again, and will be re-fetched from Etherscan next time. This applies equally to the native path from #13728; it bounds the cache, it does not break paging.

## Open questions (facts to confirm)

1. **`tokentx`'s response ceiling without `offset`/`page` is undocumented.** Etherscan's current v2 endpoint docs (`api-reference/endpoint/tokentx`) show `page: 1` / `offset: 100` only as examples and state no maximum; the commonly cited 10 000-record figure appears nowhere we can verify. Rather than depend on an undocumented default, **pass `offset`/`page` explicitly** so the window is ours to choose, and treat "how much history one request can return" as a parameter rather than a discovered constant. Settling the real ceiling would need a live call against a high-volume address.

## Decisions

1. **ERC721 / ERC1155 in or out.** The mappers already carry `nft_token_id` and `TokenId` has an `Erc721` variant, so extending is cheap — but NFT views load differently and are out of the reported problem.
   _Resolved: out._ A fast-follow if wanted; this change leaves both untouched.
2. **Whether to raise `WALLET_PAGINATION` (10) for token views.** Ten rows is a small first page for a history view; it is shared across chains, so changing it affects Solana too.
   _Resolved: leave at 10._ Paging is what makes the page size tolerable; changing a cross-chain constant is a separate call.
3. **Whether ERC4626 caches raw or normalised rows.**
   _Resolved: raw, with the normalisation hoisted to a shared helper._ See the ERC4626 interaction above for what this obliges.
