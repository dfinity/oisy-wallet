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
enabled SPL tokens that means `k + 1` `getSignaturesForAddress` calls a minute, and on a cold
start up to `(k + 1) × 10` `getTransaction` calls, many for the same signature.

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

A page of the merged list ends at the **newest of the per-source oldest signatures**, counting
only sources that returned a full page. Anything older than that cut is not returned yet,
because a source that stopped above it may still hold signatures in between. The next page asks
every source for signatures `before` the cut. A source that returned less than a full page has
reached the end of its history and is not asked again.

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

### 3.6 Scrolling: one pager per network for Activity, one per token for its page

A pager is the merged pagination of 3.3 over a set of sources, so one implementation serves both
lists.

- **The Activity list** gets one pager per network, over all its sources.
  `loadOlderTransactionsFor` (`src/frontend/src/lib/services/transactions-pagination.services.ts`)
  returns the same pager for every token of a network, and the calls several of those tokens make
  in the same round share one in-flight page instead of each paging on its own. The pager signals
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
conflict with 3.2. Whether it is still read back is decision D4.

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

- **T1.** Unit tests for `getSolSignatures`, `getSolTransactions`, `fetchSignatures` and the
  detail cache.
- **T2.** Fixture-backed tests (`sol-rpc-fixture.test-utils.ts`) on real chain data for wallet
  `7q6R…` and its four fixture ATAs: merged-pagination coverage (F2), `before` across addresses
  (Q1), and how often one signature appears in several sources.
- **T3.** Round-trip of a record through the backend mappers (F3, F4).
- **T4.** Characterization of the worker, scheduler and listener behaviour this spec must keep
  (per-token routing, stale per-instruction row cleanup, only new records posted).

Implementation, in order:

1. **Never render a backend copy (3.4, D4).** Either stop reading the Solana backend cache, or
   re-derive every restored record before it reaches the store, as D4 decides. A record restored
   from IndexedDB without a summary is not a derived record either, and is dropped from the
   cache on load, so the pager fetches it again when it gets there. The refresh helpers go. This
   PR is independent of the rest and ships first, because backend loading is on in every
   environment (`USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED`), so F4 is live.
2. **The merged pager.** `getSolSignatures` becomes the pager of 3.3: lookups in parallel, newest
   first, each signature tagged with the sources that returned it, the cut applied, and its own
   cursor (3.5). It flips the F1 and F2 `it.fails` tests in T1 and T2.
3. **Resolve once.** Turns signatures into records, fetching and deriving each signature once,
   and returns the records per token id (3.2).
4. **One worker per network.** `SolLoaderWallets`, `SolWalletWorker` and `SolWalletScheduler`
   move to one instance per network, with the head check of 3.5 and the balances of 3.8. The
   scheduler posts per-token deltas, so the listener and the store keep their shape. T4 stays
   green.
5. **The pagers on the main thread.** `loadOlderTransactionsFor` returns the network pager, and
   the token page uses its single-source pager (3.6). `loadNextSolTransactions`,
   `loadNextSolTransactionsByOldest` and the backend pagination cursors are replaced.
6. **PRODUCT.md.** A "Solana history" entry under Activity describing the behaviour that shipped.

## 7. Acceptance criteria

- On the fixture wallet, every token's list of signatures is the same set as today's per-token
  loader returns (checked with the fixture harness, not with mocks).
- A transaction that moves SOL and `n` SPL tokens causes exactly one `getTransaction` call per
  session, whatever `n` is.
- A cold start makes one `getSignaturesForAddress` call per source per page, and no source is
  asked again once it has returned less than a full page.
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
  that address's own history, and return that address's signatures older than it? The merged
  cursor relies on it. **Answered on the public mainnet RPC (T2):** with a token account's
  signature at slot 338170096 that the wallet never saw, the wallet's page is exactly its 10
  signatures strictly older than that slot, newest first. Production uses Alchemy, which serves old
  history from its own store, so it still needs one check there before PR 2 lands.
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

## 10. Pending decisions (facts are clear, a call is needed)

- **D4. Read the Solana backend cache back at all?** By 3.4 a backend record is never rendered,
  so reading it could only supply signatures, and it cannot supply them reliably. A token keeps
  at most `MAX_USER_TRANSACTIONS_PER_TOKEN` (10,000) records, only finalized ones, and only those
  that some session of this user happened to load. Treating it as a source would reopen the holes
  3.3 closes. Recommendation: stop reading it for Solana history (PR 1 deletes the read path, the
  backend pagination cursors and the refresh helpers), and keep writing it per token as today.
  The alternative keeps reading and re-derives every restored record before it reaches the store,
  which costs the same RPC calls as not reading and keeps more code.

## 11. Notes for the implementation

- `SchedulerTimer.start` (`src/frontend/src/lib/schedulers/scheduler.ts`) returns early while its
  timer is running. That is harmless today because `sol-wallet.worker.ts` creates one scheduler per
  token ref, but it must be handled when one scheduler serves a whole network and its token list
  changes.
- `fetchTransactionDetailForSignature` sets `id: signature.toString()` on the `SolSignature`
  object, which gives `"[object Object]"`. The record's own id comes from `signature.signature`,
  so nothing visible depends on it. It should be corrected when the resolver of PR 3 is written.
- `getSolTransactions` fetches transaction details one at a time. The resolver of PR 3 fetches
  them concurrently, with a bound.
