# Spec: Tolerate a failing ICRC Index canister on the Activity page

This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

## Goal

Make the Activity page behave sensibly when an ICRC token's Index canister is
temporarily unavailable:

1. A **single** failed check no longer produces a warning — the warning appears
   only after **3 consecutive** failed checks, and disappears again as soon as a
   check succeeds.
2. Already-loaded transactions **stay visible** instead of being wiped.
3. OISY **keeps retrying** the Index canister instead of giving up for the rest
   of the session.
4. The warning text drops the term "Index canister" and says what the user
   actually experiences.

Source: user request.

---

## Background

### How transactions reach the Activity page

For an ICRC token with an Index canister ID, the worker runs
`IcWalletBalanceAndTransactionsScheduler`
(`src/frontend/src/icp/schedulers/ic-wallet-balance-and-transactions.scheduler.ts`)
every `WALLET_TIMER_INTERVAL_MILLIS` = 30s
(`src/frontend/src/lib/constants/app.constants.ts:174`,
`src/frontend/src/icp/schedulers/ic-wallet.scheduler.ts:47`). Each tick fetches
the balance from the **Ledger** canister and the transactions from the **Index**
canister (`src/frontend/src/icp/workers/icrc-wallet.worker.ts:72-104`) and posts
them to the UI thread. `syncWallet`
(`src/frontend/src/icp/services/ic-listener.services.ts:10-41`) writes them into
`icTransactionsStore`.

The Activity banner is derived purely from that store
(`src/frontend/src/lib/components/transactions/AllTransactions.svelte:69-93`):
an entry that is exactly `null` produces a warning — `no_index_canister` when
the token has no Index canister ID, `unavailable_index_canister` otherwise.

Calls use `queryAndUpdate` via `createQueryAndUpdateWithWarmup`
(`src/frontend/src/lib/services/query.services.ts:27`): the first 10s are
query-only and their failures are silently ignored (no `onQueryError` handler is
passed); after that the strategy is `update`, and a failed update call invokes
`onUpdateError`.

### What happens today when the Index canister fails (ICRC)

`getBalanceAndTransactions` wraps both calls in `Promise.all`
(`src/frontend/src/icp/workers/icrc-wallet.worker.ts:104`), so an Index failure
rejects the whole job even though the Ledger balance was fetched successfully.
The same happens deliberately when the Index is judged stale: if the Ledger
balance differs from the balance the Index reports, `isIndexCanisterAwake` runs,
and a negative verdict `throw`s (`:110-132`).

That single rejection then triggers, on the **first** occurrence:

- `onLoadTransactionsError`
  (`src/frontend/src/icp/services/ic-transactions.services.ts:228-241`) —
  `icTransactionsStore.reset(tokenId)`, which sets the entry to `null`
  (`src/frontend/src/lib/stores/certified.store.ts:24-32`). This both raises the
  banner and **erases the transactions already on screen**, including those
  restored from the IndexedDB cache at worker start. It also resets
  `balancesStore`, on the stale premise (see the comment on `:237`) that balance
  and transactions come from the same endpoint — they do not.
- `restartWorkerWithLedgerOnly`
  (`src/frontend/src/icp/services/worker.icrc-wallet.services.ts:91-107`) —
  guarded by a one-way `restartedWithLedgerOnly` latch and restarting the timer
  **without** `indexCanisterId`, so the worker builds an
  `IcWalletBalanceScheduler` (`icrc-wallet.worker.ts:155-163`) from then on.
  That scheduler never sends `newTransactions`, so every subsequent tick
  re-nullifies the entry. The Index canister is never contacted again for the
  rest of the session, and `trigger()` cannot undo it because a scheduler is
  only rebuilt when none exists for that ledger.

So today: one failure ⇒ immediate warning, transactions wiped, balance dropped,
and no recovery short of a page reload or the token being disabled and
re-enabled.

The IndexedDB cache itself survives: `setIdbTransactionsStore` skips nullish
entries (`src/frontend/src/lib/api/idb-transactions.api.ts:58-60`), so the
`null` is never written through. The visible effect is a flip-flop — a reload
restores the transactions via `syncWalletFromCache`, and ~10s later (once the
warmup ends) they are wiped again. Note also that an explicit logout clears that
cache (`src/frontend/src/lib/services/auth.services.ts:217-223`; `lockSession`
does not), so after a fresh login a token with a failing Index has **no**
transactions at all to show.

### ICP already solves this

`src/frontend/src/icp/workers/icp-wallet.worker.ts:53-81` uses
`Promise.allSettled`: a Ledger failure is fatal, an Index failure returns the
balance with an empty transaction delta and lets the history catch up on a later
tick. ICP therefore never wipes transactions or drops the balance because of the
Index canister. This spec brings ICRC to that same shape. (DIP20 still uses
`Promise.all`, but its `getTransactions` is a stub returning an empty list, so
it is out of scope.)

---

## Behaviour

### Target behaviour

- **Balance** keeps updating from the Ledger canister regardless of the state of
  the Index canister.
- **Transactions already loaded** (from a previous successful fetch or from the
  IndexedDB cache) stay visible while the Index canister is failing.
- **Retries** continue on the normal 30s cycle. No extra retry logic: the cycle
  is the retry.
- **Warning** appears once a token has 3 consecutive failed transaction checks
  (~90s), and disappears on the next successful check.
- **One banner** covers all affected tokens, listing their symbols, as today.

### Warning text

`unavailable_index_canister` — non-dismissible box, must read correctly both
when the list below it is empty and when it shows older transactions:

> `$oisy_short can’t load the latest transactions for $token_list right now, and keeps retrying.`

`no_index_canister` — unchanged behaviour (dismissible, per-token dismissal
persisted via `NOTIFICATION_VERSIONS.NoIndexCanister`), text de-jargoned:

> `$oisy_short can’t load transactions for $token_list — the token issuer doesn’t provide transaction tracking.`

### Negative guarantees (what it does _not_ do)

- Does **not** add retry/backoff logic of its own — the existing 30s scheduler
  tick is the retry.
- Does **not** change the 30s interval, nor the 10s query-only warmup.
- Does **not** persist the failure counter; it is in-memory and per session.
- Does **not** change the dismissal behaviour of the `no_index_canister` box,
  nor make the new warning dismissible.
- Does **not** touch ETH/SOL/BTC transaction loading, nor the backend
  user-transactions storage (`save_user_transactions` / `get_user_transactions`),
  which covers ETH and SOL only and plays no part here.
- Does **not** change `balancesStore.reset` on a **Ledger** failure — that
  remains correct.

---

## Implementation

The work lands as three stacked PRs.

### PR 1 — Tolerate an Index-canister failure

**`src/frontend/src/icp/workers/icrc-wallet.worker.ts`**

Rewrite `getBalanceAndTransactions` along the lines of the ICP worker
(`icp-wallet.worker.ts:53-81`):

- `Promise.allSettled([getBalance(params), getTransactions(params)])`.
- Ledger rejected ⇒ rethrow (fatal, as today).
- Index rejected ⇒ return the balance with an empty transaction delta.
- Index resolved but `isIndexCanisterAwake` says no ⇒ same as above, instead of
  the current `throw` — the Ledger balance is good and must not be discarded.
- Keep ignoring the balance reported by the Index canister.

The `transactionsUnavailable` marker described in PR 2 is deliberately **not**
introduced here: it does not fit `GetTransactions`
(`src/frontend/src/icp/types/ic.post-message.ts`) without the schema change that
PR 2 makes. Until then, an Index failure is simply indistinguishable from "no
new transactions" — which is exactly how ICP behaves today.

**`src/frontend/src/icp/services/worker.icrc-wallet.services.ts`**

Remove `restartWorkerWithLedgerOnly`, the `restartedWithLedgerOnly` latch and
its call site in the `syncIcrcWalletError` branch. `IcWalletBalanceScheduler`
stays in use for tokens genuinely configured without an Index canister ID
(`icrc-wallet.worker.ts:155-163`) — only the fallback restart goes away.

**`src/frontend/src/icp/services/ic-transactions.services.ts`**

In `onLoadTransactionsError`, drop `icTransactionsStore.reset(tokenId)` and the
stale comment above `balancesStore.reset(tokenId)`; keep the balance reset and
the analytics tracking. A Ledger failure invalidates the balance, not the
transaction history.

### PR 2 — Failure counter and banner signal

**Signal plumbing.** Add an optional `transactionsUnavailable` boolean to
`PostMessageWalletDataSchema`
(`src/frontend/src/lib/schema/post-message.schema.ts:193-196`) and carry it from
`getBalanceAndTransactions` through
`IcWalletBalanceAndTransactionsScheduler.postMessageWalletBalanceAndTransactions`.

⚠️ `syncTransactions` currently returns **without posting** when there are no new
transactions and no new balance
(`ic-wallet-balance-and-transactions.scheduler.ts:121-135`). The message must
still be posted when `transactionsUnavailable` is true, otherwise a failing
Index canister on a token with an unchanged balance never reaches the UI.

**Counter store.** New `src/frontend/src/icp/stores/ic-transactions-status.store.ts`
holding a per-`TokenId` consecutive-failure count, fed from `syncWallet`
(`ic-listener.services.ts`): increment when `transactionsUnavailable` is true,
reset to zero on any successful transaction sync. Not persisted.

**Threshold.** New constant (3) alongside the other wallet-timer constants
(`IC_TRANSACTIONS_UNAVAILABLE_THRESHOLD`); a derived store
(`$icp/derived/ic-transactions-status.derived.ts`) exposes the **enabled** tokens
at or above it, so a disabled token never raises a banner.

**Banner.** `AllTransactions.svelte:69-93` stops deriving the "unavailable" list
from `icTransactionsStore[tokenId] === null` and uses the new derived store
instead. `null` keeps its remaining meaning — no Index canister configured —
and continues to feed the dismissible `no_index_canister` box via
`hasNoIndexCanister`.

### PR 3 — Copy

Both strings above in `src/frontend/src/lib/i18n/en.json:2315-2318`, plus
translations for the locales listed in the `Languages` enum. No new keys, so no
new placeholders and no bundle-size impact beyond the string lengths.

### Tests

The `test-coverage` CI gate enforces whole-project thresholds, so each PR ships
its own tests:

- PR 1 — worker unit tests for the three outcomes (both fine / Index rejected /
  Index not awake); a regression test that `onLoadTransactionsError` leaves
  `icTransactionsStore` untouched.
- PR 2 — store tests (increment, reset-on-success, threshold), a scheduler test
  that a message is posted when nothing changed but the Index failed, and
  `AllTransactions.spec.ts` updates for the new trigger. The existing cases at
  `src/frontend/src/tests/lib/components/transactions/AllTransactions.spec.ts:73,96,259`
  assert the current `null`-driven behaviour and must be reworked.
- PR 3 — the i18n assertions in `AllTransactions.spec.ts` follow the new strings
  automatically; check no other spec hardcodes the old text.

### PRODUCT.md

`docs/ai/PRODUCT.md` has no Activity section yet. Add one (with PR 2, the PR
that changes user-visible behaviour) covering: transactions come from the
token's Index canister; balances come from the Ledger canister and are
unaffected by Index problems; already-loaded transactions remain visible during
an outage; the warning appears only after 3 consecutive failed checks and clears
on success; tokens whose issuer provides no Index canister show a separate,
dismissible notice.

---

## Open questions (facts to confirm)

None outstanding — the failure paths were traced end to end against
`origin/main` (`e3be1169b`) while writing this spec.

## Pending decisions (facts are clear — we just need to decide)

- **Threshold value.** 3 consecutive failures ≈ 90s of silence before the user
  sees anything. Decided: 3.
- **Warmup interaction.** Failures during the first 10s (query-only) are
  invisible to the counter, so the effective delay after a fresh load is ~100s.
  Accepted as-is.

## Follow-ups (out of scope)

- Decouple the stale-Index check from transaction loading and run it on its own
  (e.g. every 5 minutes), feeding the same signal. Today `isIndexCanisterAwake`
  costs 2–3 extra calls plus a 5s sleep
  (`src/frontend/src/icp/services/index-canister.services.ts:46-58`) on every
  30s tick where the balance mismatches.
- Bring DIP20 to the same `allSettled` shape once its transaction fetching is
  implemented.
