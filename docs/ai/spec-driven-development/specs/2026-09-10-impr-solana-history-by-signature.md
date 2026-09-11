> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# Spec: Load Solana history by signature, not per token

- **Type:** `impr`
- **Area:** Frontend, Solana transaction history (worker sync, pagination, backend cache)
- **Status:** Draft for implementation in Claude Code

---

## 1. Motivation

A Solana transaction is not about one token. A swap moves SOL and USDC in one signature, a
send that opens an account moves a token and the rent, and an aggregator route can touch five
mints at once. OISY still loads history **per token**:

- `SolLoaderWallets.svelte` starts one `SolWalletWorker`
  (`src/frontend/src/sol/services/worker.sol-wallet.services.ts`) per enabled Solana token,
  pooled under `${tokenAddress ?? 'SOL'}-${network}`.
- Each worker's `SolWalletScheduler` (`src/frontend/src/sol/schedulers/sol-wallet.scheduler.ts`)
  calls `getSolTransactions` (`src/frontend/src/sol/services/sol-signatures.services.ts`) on
  **one** address every minute: the wallet for SOL, the token's associated token account (ATA)
  for an SPL token.
- For every signature returned, `fetchSolTransactionsForSignature`
  (`src/frontend/src/sol/services/sol-transactions.services.ts`) fetches the full transaction
  and derives the record.

Since #13836 the record is already per signature: one record, with `netChanges` for every
mint the transaction moved. So a swap between SOL and USDC is fetched and derived **twice**,
once in each token's worker, and gives two identical records. Each worker runs in its own
realm, so the per-network detail cache in `fetchTransactionDetailForSignature`
(`src/frontend/src/sol/api/solana.api.ts`) is not shared between them. For a wallet with `k`
enabled SPL tokens that means `k + 1` `getSignaturesForAddress` calls a minute, and at startup
as many as `(k + 1) × 10` `getTransaction` calls, many for the same signature.

The fix is to turn it around: collect the user's signatures once, across the wallet and every
ATA, fetch and derive each signature once, then hand the record to every token it belongs to.

## 2. What already exists

- **`getSolSignatures`** (`sol-signatures.services.ts`, added in #5150 for exactly this) fetches
  the signatures of the wallet and of the ATA of each token in `tokensList`, then removes
  duplicates. Nothing in the app calls it; only its spec does. Section 5 lists the defects
  that stop it being used as is.
- **Per-signature derivation** (`fetchSolTransactionsForSignature`) is already what we need, and
  does not change.
- **The Activity list already treats records as per signature.** `dropDuplicateSolTransactions`
  (`src/frontend/src/lib/utils/transactions.utils.ts`) groups the per-token copies of a record
  by signature and keeps one row per token the transaction is about (both sides of a swap,
  the single side of everything else). This spec keeps the per-token store, so that logic is
  unaffected.

## 3. Target behaviour

### 3.1 One history loader per Solana network

One worker per Solana network (mainnet, devnet, local), not one per token. It is given the
wallet address and the enabled Solana tokens of that network. Every tick it:

1. Fetches the newest signatures of every **source**: the wallet address, plus the ATA of every
   enabled SPL token (derived with the token's program as `tokenProgram`, so Token-2022 works
   as it does today).
2. Merges them into one list of unique signatures, newest first, remembering which sources
   returned each one.
3. Fetches and derives each signature it does not already hold, **once**.
4. Hands each record to every token whose source returned the signature.

### 3.2 A record belongs to the tokens whose source returned it

This is exactly today's membership rule, now evaluated once per signature instead of once per
token. It keeps the per-token lists identical to today's, including the cases the net would get
wrong (an approval or an authority change moves no balance, but the ATA's history still
returns it). The derivation's own "nothing of the user's moved or was touched" filter still
drops the false positives an ATA lookup produces.

`solTransactionsStore` stays keyed by token id. The token page, the Activity list,
`dropDuplicateSolTransactions`, the IndexedDB cache (`TransactionsIdbSetter.svelte`) and the
export all read it as they do today.

### 3.3 Merged pagination with no holes

Each source pages through its own history: every call for a source continues `before` that
source's own oldest fetched signature, so a signature is never used as a cursor for an address
whose history it is not in.

A page of the merged list ends at the **cut**: the newest of the oldest signatures of the
sources that returned a full page. It returns only what lies **strictly above the cut's slot**.
Anything older is held back, because a source that stopped above it may still hold signatures in
between. The cut's slot itself is held back too, until every source has passed it: a source that
reaches one of its signatures later must still add its tag (3.2).

What was fetched but not returned travels in the cursor, with each source's own `before` and the
sources that returned less than a full page. Those have reached the end of their history and are
not asked again. A source already below the cut is not asked again until the cut reaches it. A
page can be empty while a cursor is still returned, when a source is still walking through a
crowded slot: only a missing cursor means the end. A cursor is only valid for the sources it was
made for, so when the token list changes, paging starts over.

### 3.4 A record on screen is always derived from chain data

A record reaches the UI only after `fetchSolTransactionsForSignature` has derived it. Nothing
else is ever rendered: not a backend record, not a projection of one.

The backend keeps a lossy copy (no summary, no net changes, a single `value`), and its
`save_transactions` (`src/backend/src/transactions/model.rs`) skips ids it already holds, so a
wrong copy can never be corrected by saving it again. The only rule that stays correct over time
is one that never renders that copy. It removes the `requiresStoredDerivationRefresh` and
`requiresStoredSplOwnerRefresh` machinery, and with it findings F3 and F4, at the root instead
of patching them one by one.

### 3.5 Each pager owns its cursor

The head check and every pager keep their own cursor. A cursor is never inferred from what the
store happens to hold. The store is filled from several places (the worker, the pagers, the
IndexedDB cache), and "the oldest record held" as a cursor has already stopped history loading
once (#13989). A signature the loader already holds costs one entry in a
`getSignaturesForAddress` page and no `getTransaction`.

The worker's head check asks each source for its newest page every tick, and resolves only the
signatures newer than the newest one the loader holds. When no source has anything newer, a
tick costs one `getSignaturesForAddress` call per source and nothing else. This replaces
`exitIfFirstSignatureMatches` (#12772).

When more than a page of new signatures arrives between two ticks, the head check keeps paging
with the merged pager's cursor until the pager's cut passes the newest slot it holds, so nothing
between that page and what it holds is left out. The cut, not what a page returns, decides it: a
page can be empty while a source walks through a crowded slot, and the cut slot itself is held back
in the cursor until a later page. The pages per tick are bounded; a walk that runs out of them
keeps its cursor as a catch-up cursor in the worker, and the next ticks resume it, after the fresh
head page, until it passes what was held when it began. The first tick, holding nothing, still
loads only the first page: older history is the pagers'. A tick's catch-up cursors are kept only
once it succeeds, and dropped when the address, network or token list changes. The signatures the
head check remembers are only those of the newest slot it holds and of the slot each catch-up walk
ends on, the only ones a later page can return again.

### 3.6 Scrolling: one pager per network for Activity, one per token for its page

A pager is the merged pagination of 3.3 over a set of sources, so one implementation serves both
lists.

- **The Activity list** gets one pager per network, over all its sources.
  `loadOlderTransactionsFor` (`src/frontend/src/lib/services/transactions-pagination.services.ts`)
  returns the same pager for every token of a network, and when several of those tokens page in
  the same round, they share one in-flight page instead of each paging on its own. The pager signals
  the end to every token of the network once all its sources are exhausted, and the floor that
  `AllTransactionsLoader.svelte` levels to is checked against the pager's cut. Because a merged
  page hands a record to every token it belongs to at once, the Activity list never holds one
  side of a swap without the other.
- **A token's own page** (`SolTransactionsScroll.svelte`) gets a pager over that token's source
  only, so scrolling USDC does not page through SOL history the page would not show. A record
  found this way reaches that token only, by 3.2. The network pager hands it to the other tokens
  when it gets there.

### 3.7 Backend cache stays per token, written only

The loader still saves each token's finalized records under that token's `solBackendTokenId`,
as today. Nothing changes in the backend or in `backend.did`, and keeping it per token does not
conflict with 3.2. It is not read back for Solana history (D4).

### 3.8 Balances in the same worker

The network worker also loads every balance of its network each tick, with one
`getMultipleAccounts` call (`jsonParsed`, in chunks of 100 accounts, the RPC limit). The wallet
account's lamports give the SOL balance, each ATA's parsed `tokenAmount.amount` gives its
token's balance (Token and Token-2022 accounts parse the same way), and an ATA that does not
exist means zero. Today that takes one `getBalance` plus up to three calls per SPL token
(`isAtaAddress`, `checkIfAccountExists` and `getTokenAccountBalance`, in `loadSplTokenBalance`).
Balances are still posted per token.

## 4. Does not do

- No change to how a transaction is derived (`fetchSolTransactionsForSignature`, the summary,
  the net changes) or to how a row is rendered.
- No change to the backend, its candid interface or its storage keys.
- No discovery of token accounts OISY does not already track: only the ATAs of enabled tokens
  are sources, as today. A transfer into a non-associated token account of the user stays
  invisible, as it is today.
- No change to failed transactions: `fetchSignatures` drops signatures whose `err` is set, as
  today. See open question Q2.

## 5. Findings from reviewing the existing services

Each finding is being pinned by a test in the PRs listed in section 6. A confirmed defect is
pinned as `it.fails` with the correct expectation, so its fix flips it.

| Id  | Where                                                  | Finding                                                                                                                                                                                                                                                                                                                                                                | Status               |
| --- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| F1  | `getSolSignatures`                                     | The result is the wallet page followed by each ATA page, not sorted newest first. Wallet slots `[100, 90]` and ATA `[95, 85]` come back as `[100, 90, 95, 85]`.                                                                                                                                                                                                        | Confirmed (T1)       |
| F2  | `getSolSignatures`                                     | Every source gets the same `before` and `limit`, and the whole union comes back. Signatures of a source between its own oldest and an older signature of another source are never fetched, and a caller paging from the result skips them for good. On the fixture wallet, paging it to the end collects 50 of 169 unique signatures: 119 are missing. 3.3 is the fix. | Confirmed (T1, T2)   |
| F3  | `loadSolTransactions`, `SolWalletScheduler`            | The backend cannot store `summary`, so `requiresStoredDerivationRefresh` is true for every restored record. With anything stored, `exitIfFirstSignatureMatches` is never set: every head load re-fetches and re-derives the first page and saves it again. Records beyond the first page keep the pre-redesign shape.                                                  | Confirmed (T3)       |
| F4  | `mapSolTransactionToUserTransaction`, `SolTransaction` | A record's `value` is its primary asset (for a swap, the spent side), and the same record is saved under every token's key. A SOL to USDC swap restored on the USDC row renders "-500 USDC" instead of "+75 USDC". In the Activity list a restored swap keeps a single row, so one side of it disappears.                                                              | Confirmed (T3)       |
| F5  | `getSolSignatures`                                     | One failing ATA lookup rejects the whole call, wallet signatures included. (The lookups themselves already run concurrently.)                                                                                                                                                                                                                                          | Confirmed (T1)       |
| F6  | Worker pool                                            | One pooled worker per token, each with its own copy of the detail cache, so a signature shared by several tokens is fetched once per token.                                                                                                                                                                                                                            | Confirmed by reading |

## 6. PR plan

Test PRs, independent, already open as drafts:

- **T1 (#14016).** Unit tests for `getSolSignatures`, `getSolTransactions`, `fetchSignatures`
  and the detail cache.
- **T2 (#14013).** Fixture-backed tests (`sol-rpc-fixture.test-utils.ts`) on real chain data for
  wallet `7q6R…` and its four fixture ATAs: merged-pagination coverage (F2), `before` across
  addresses (Q1), and how often one signature appears in several sources.
- **T3 (#14015).** Round-trip of a record through the backend mappers (F3, F4), down to the
  rendered row and the Activity rows.
- **T4 (#14014).** Characterization of the worker, scheduler and listener behaviour this spec
  must keep (per-token routing, stale per-instruction row cleanup, only new records posted).

Implementation, in order:

1. **Never render a backend copy (3.4, D4), #14017.** The Solana backend cache is no longer read;
   finalized records are still saved per token. A record restored from IndexedDB without a
   summary is not a derived record either, and is dropped from the cache on load, so the next
   load that reaches its signature derives it again. The restore mapper, the refresh helpers, the
   backend pagination cursors and `exitIfFirstSignatureMatches` go. This PR is independent of the
   rest and ships first, because backend loading is on in every environment
   (`USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED`), so F4 is live.
2. **The merged pager, #14025.** `getSolSignatures` becomes the pager of 3.3: lookups in
   parallel, newest first, each signature tagged with the sources that returned it, the cut
   applied, and its own cursor (3.5) carrying each source's `before`, the exhausted sources and
   the signatures held back. It replaces the F1 and F2 `it.fails` tests in T1 and T2.
3. **Resolve once.** `resolveSolSignatures` turns a page of the pager into records, fetching and
   deriving each signature once with bounded concurrency, every ATA of the network seeded as the
   user's. Each record keeps the sources the pager tagged it with, and `mapSolSourcesToTokens`
   maps a source to its token (the wallet to SOL, an ATA to its mint), so the caller hands the
   record to the token of each of its sources (3.2). One failed fetch rejects the page.
4. **One worker per network.** `SolLoaderWallets`, `SolWalletWorker` and `SolWalletScheduler`
   move to one instance per network, with the head check of 3.5 and the balances of 3.8. Token
   ids are symbols and cannot cross the worker boundary, so the scheduler posts one message per
   tick, with the balances keyed by mint and the new records tagged with their sources, and the
   main thread routes them to the per-token stores, which keep their shape. A worker is started
   for one address and token list, and the network's worker is replaced when either changes. The
   behaviour T4 pins stays, expressed per network.
5. **The pagers on the main thread.** `loadOlderTransactionsFor` returns the network pager, and
   the token page uses its single-source pager (3.6). `loadNextSolTransactions`,
   `loadNextSolTransactionsByOldest` and the backend pagination cursors are replaced.
6. **PRODUCT.md.** PR 1 adds the "Solana history" entry under Activity; each later PR updates it
   with the behaviour it ships (one loader per network, merged paging, balances).

## 7. Acceptance criteria

- On the fixture wallet, every token's list of signatures is the same set as today's per-token
  loader returns (checked with the fixture harness, not with mocks).
- A transaction that moves SOL and `n` SPL tokens causes exactly one `getTransaction` call per
  session, whatever `n` is.
- A cold start makes at most one `fetchSignatures` call per source per page (which may itself call
  `getSignaturesForAddress` again to fill the page past failed signatures): no source is asked
  again once it has returned less than a full page, nor while it is already below the cut.
- Paging the merged list to the end yields the union of every source's full history: no holes.
- The integration reconciliation tests (the SOL and SPL balance checks in
  `sol-signatures.services.integration.spec.ts`) keep passing.
- The Activity list shows the same rows as before for the fixture wallet, and both sides of a swap
  arrive in the same page.
- Every record in `solTransactionsStore` carries a summary: nothing rendered comes from a backend
  copy (3.4).
- All the balances of a network cost one `getMultipleAccounts` call per tick (per 100 accounts).
- `backend.did` is unchanged.

## 8. Open questions (facts to confirm)

- **Q1.** Does `getSignaturesForAddress(address, { before })` accept a signature that is not in
  that address's own history, and return that address's signatures older than it? **No longer
  needed:** the pager of 3.3 continues each source from its own oldest signature, so it never
  passes one address's signature as another's cursor. For the record, on the public mainnet RPC
  (T2) the answer is yes: with a token account's signature at slot 338170096 that the wallet never
  saw, the wallet's page is exactly its 10 signatures strictly older than that slot. Alchemy was
  not checked, and only a design that crosses addresses would need it.
- **Q2.** Failed transactions: `fetchSignatures` drops signatures whose `err` is set, but the fee
  payer of a failed transaction still paid its fee. Do any of the fixture wallets have failed
  transactions they paid for? If so, the SOL balance reconciliation only passes because it sums
  fees over the same filtered list.

## 9. Decisions

- **D1. Balances in the network worker: yes, for every token.** One `getMultipleAccounts` call
  covers the wallet and every ATA of the network (3.8).
- **D2. Activity paging per network: yes.** Paging each token on its own would keep handing a
  record to one token at a time, which is how one side of a swap goes missing from the Activity
  list. One pager per network hands it to all its tokens at once (3.6).
- **D3. Restored records are re-derived.** This was generalised into one rule rather than a
  refresh check per record: nothing rendered comes from a backend copy (3.4), and no cursor is
  inferred from the store (3.5).
- **D4. The Solana backend cache is no longer read; it is still written per token (#14017).** By
  3.4 a backend record is never rendered, so reading it could only supply signatures, and it cannot
  supply them reliably. A token keeps at most `MAX_USER_TRANSACTIONS_PER_TOKEN` (10,000) records,
  only finalized ones, and only those that some session of this user happened to load. Treating it
  as a source would reopen the holes 3.3 closes. Re-deriving every restored record instead would
  cost the same RPC calls as not reading and keep more code.

## 10. Notes for the implementation

- `SchedulerTimer.start` (`src/frontend/src/lib/schedulers/scheduler.ts`) returns early while its
  timer is running. PR 4 handles it at both ends: `sol-wallet.worker.ts` replaces its scheduler on
  every start, and `SolWalletScheduler.start` stops its own timer when it is started for another
  address or token list, so the running timer never keeps syncing the old one.
- `fetchTransactionDetailForSignature` sets `id: signature.toString()` on the `SolSignature`
  object, which gives `"[object Object]"`. The record's own id comes from `signature.signature`,
  so nothing visible depends on it. It should be corrected when the resolver of PR 3 is written.
- `getSolTransactions` fetches transaction details one at a time. The resolver of PR 3 fetches
  them concurrently, with a bound.
