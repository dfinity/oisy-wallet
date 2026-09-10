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

### 3.4 The head short-circuit, per source

Today a worker skips re-deriving when the newest RPC signature equals the newest stored one
(`exitIfFirstSignatureMatches`, #12772). With several sources that becomes "no source has a
signature newer than the newest one already held". See finding F3: today this short-circuit
never engages once the backend cache holds anything.

### 3.5 Scrolling a token page or the Activity list

Paging on the main thread (`loadNextSolTransactions`, `loadNextSolTransactionsByOldest`) stays
per token in this spec. It already shares one detail cache across tokens, because all of it runs
on the main thread. Only the polling moves to the network loader. See pending decision D2.

### 3.6 Backend cache stays per token

Each token's records are still saved under that token's `solBackendTokenId`, and still
restored from it. The network loader saves, per token, the records it handed that token.
Nothing here needs a new field in the backend or a change to `backend.did`. Keeping the
backend per token does not conflict with this design, because 3.2 keeps membership per token.

It does inherit finding F4, which must be fixed first (PR 1 in section 6).

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

| Id  | Where                                                  | Finding                                                                                                                                                                                                                                                                                                               | Status               |
| --- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| F1  | `getSolSignatures`                                     | The result is the wallet page followed by each ATA page, not sorted newest first.                                                                                                                                                                                                                                     | To confirm (T1)      |
| F2  | `getSolSignatures`                                     | Every source gets the same `before` and `limit`, and the whole union comes back. Signatures of a source between its own oldest and an older signature of another source are never fetched, and a caller paging from the result skips them for good. 3.3 is the fix.                                                   | To confirm (T1, T2)  |
| F3  | `loadSolTransactions`, `SolWalletScheduler`            | The backend cannot store `summary`, so `requiresStoredDerivationRefresh` is true for every restored record. With anything stored, `exitIfFirstSignatureMatches` is never set: every head load re-fetches and re-derives the first page and saves it again. Records beyond the first page keep the pre-redesign shape. | To confirm (T3)      |
| F4  | `mapSolTransactionToUserTransaction`, `SolTransaction` | A record's `value` is its primary asset (for a swap, the spent side). The same record is saved under every token's key, so a SOL to USDC swap is stored under USDC with the SOL amount. Restored, it has no summary or net, and the USDC row falls back to `value`, signed by a `send` type, in USDC decimals.        | To confirm (T3)      |
| F5  | `getSolSignatures`                                     | The ATA lookups run one after another, and one failing lookup rejects the whole call.                                                                                                                                                                                                                                 | Confirmed by reading |
| F6  | Worker pool                                            | One pooled worker per token, each with its own copy of the detail cache, so a signature shared by several tokens is fetched once per token.                                                                                                                                                                           | Confirmed by reading |

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

1. **Fix F4.** The value saved under a token's key is that token's net change, and the restored
   type follows its sign. Independent of the rest; ships first.
2. **Make `getSolSignatures` usable.** Lookups run in parallel, the result is newest first, it
   returns which sources each signature came from, and it applies the cut from 3.3. It flips the
   F1 and F2 `it.fails` tests in T1 and T2.
3. **Load once.** A service that turns merged signatures into records, fetching and deriving each
   signature once and returning the records per token id (3.2).
4. **One worker per network.** `SolLoaderWallets`, `SolWalletWorker` and `SolWalletScheduler`
   move to one instance per network. The scheduler posts per-token deltas, so the listener and
   the store keep their shape. Balances as decided in D1. T4 must stay green.
5. **PRODUCT.md.** A "Solana history" entry under Activity describing the behaviour that shipped.

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
- The Activity list shows the same rows as before for the fixture wallet.
- `backend.did` is unchanged.

## 8. Open questions (facts to confirm)

- **Q1.** Does `getSignaturesForAddress(address, { before })` accept a signature that is not in
  that address's own history, and return that address's signatures older than it? The merged
  cursor relies on it. The Agave implementation resolves the slot of any signature, so it should
  work. T2 checks it on the public mainnet RPC, but production uses Alchemy, which serves old
  history from its own store, and that still needs checking.
- **Q2.** Failed transactions: `fetchSignatures` drops signatures whose `err` is set, but the fee
  payer of a failed transaction still paid its fee. Do any of the fixture wallets have failed
  transactions they paid for? If so, the SOL balance reconciliation only passes because it sums
  fees over the same filtered list.

## 9. Pending decisions (facts are clear, a call is needed)

- **D1. Balances in the network worker.** Recommendation: the network worker also loads every
  token's balance each tick, in parallel, and posts them per token as today. The alternative is
  keeping one balance worker per token next to the network history worker, which is two pollers
  for one wallet.
- **D2. Merge Activity paging too.** Today the Activity list pages each token separately
  (`transactions-pagination.services.ts`). Recommendation: keep that for this spec. Main-thread
  paging already shares the detail cache, so the saving is small, and the leveling logic in the
  Activity loader is per token.
- **D3. Restored records after F4.** Once the saved value is per token, a restored record renders
  correctly without a summary. Either keep re-deriving every restored record on the first page
  (F3, today's behaviour: correct summaries, one page of RPC calls per head load), or trust
  restored records and re-derive only when the user opens one. Records saved before the F4 fix
  keep the wrong value either way unless they are re-derived, which argues for keeping the
  re-derivation for at least one release.
