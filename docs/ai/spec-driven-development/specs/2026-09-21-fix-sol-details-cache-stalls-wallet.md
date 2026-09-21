This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# fix: a stalled Solana details cache must not stop the wallet

## What was observed

On staging and on `test_fe_3`, every Solana token — native SOL included — showed a loading skeleton
instead of a balance, indefinitely. Prices rendered, every other network was fine, the hero total
was correct for the rest of the wallet, and **nothing at all appeared in the browser console**. On
the same origin, signing out hung on a spinner that never resolved.

Deleting the `oisy-sol-transaction-details` IndexedDB database on the affected origin restored both
behaviours immediately, on the same deployed bundle. A second affected origin recovered on its own
without intervention.

## Why it happened

`indexedDB.open('oisy-sol-transaction-details')` answered with **no event of any kind** — neither
`success`, nor `error`, nor `blocked`. Ten other databases on the same origin opened normally.

Sign-out does not only empty these stores, it **deletes the databases**:
`clearIdbStore(deleteIdbAllOisyRelated)` in `$lib/services/auth.services` calls
`indexedDB.deleteDatabase()` for every `oisy-`prefixed database. But every store here is built with
`idb-keyval`'s `createStore`, which opens a connection and **never closes it**, and each is opened
once per realm the app starts — the main thread plus every wallet, auth and exchange worker, since
the worker bundle reaches them. A delete cannot proceed while a connection is open: it fires
`blocked`, `deleteDatabase` turns that into a rejection, and the `Promise.allSettled` inside
`deleteIdbAllOisyRelated` swallows it. Nothing is logged and nothing is deleted.

A pending delete then queues every later `open()` of that database — and `blocked` belongs to the
delete request, not to the open, which is exactly why the open answers with no event of any kind.

**This is deterministic, not a race.** An earlier reading of this defect blamed a dozen realms
racing to create the database, which fitted the intermittence but not the reproduction: signing out
and back in breaks it every time. It also explains why the failure appeared to correlate with an
unrelated deploy variable — it did not. Two deployed bundles, one working and one not, were confirmed
identical in every `VITE_*` value but their own subdomain, which ruled out the build.

A related waste sits upstream of it: `openIdb()` runs at module scope, so the details database is
created on page load, **before anyone signs in**, and its epoch marks a session that does not exist
yet. Nothing reads or writes the cache until the worker has an address, so the pre-login open buys
nothing — and it is what puts the database there to be caught by the blocked delete at the next
sign-out. The neighbouring cache already gets this right: `syncWalletFromIdbCache` returns early
when identity is nullish.

Two consequences follow, and both were silent:

1. **Balances.** `getIdbSolTransactionDetail` is read on the wallet worker's history path
   (`solana.api.ts` → `fetchTransactionDetailForSignature`). `SolWalletScheduler` loads balances and
   history in one `Promise.all` and posts only when both have resolved, so a history read that never
   resolves means balances are never posted and every token of the network stays `undefined`, which
   `TokenBalanceSkeleton` renders as a skeleton. Nothing rejects, so `retryWithDelay` has nothing to
   retry and `syncWalletError` never fires — hence the empty console.
2. **Sign-out.** `clearIdbStoreList` in `$lib/services/auth.services` includes
   `clearIdbSolTransactionDetails`. Each clear is wrapped in `try`/`catch` precisely so that
   "effective logout is more important", but a `catch` cannot see an operation that never settles.

The store was introduced by #14073 (`e430dab83`, 2026-09-16) and is not in any release tag, so no
released build is affected.

## The fix

The shape of the fix follows from the failure mode: the hazard is not an error, it is **silence**.
No `try`/`catch` anywhere can see it, so the guard has to be a deadline.

**1. Give every cache operation a deadline.**

A new `withDeadline` in `$lib/utils/timeout.utils` resolves with a caller-supplied fallback when an
operation has not answered within a given time. Every read, write, trim and clear in
`idb-sol-transaction-details.api.ts` goes through it, so a store that stops answering degrades to
the answer the caller had before the cache existed — a miss — rather than stalling the load.

A rejection still propagates: a deadline is for an operation that says nothing, and one that fails
should stay the caller's business.

**2. Stand the cache down after the first miss.**

A store that missed its deadline once has stopped answering, and everything queued behind it waits
the same way. Paying the deadline per read would leave a network's history — and so its balances —
crawling rather than stalling, which is no better. The first miss therefore disables the cache for
the life of the realm: `openIdb` returns nothing, and every later call answers as it did before the
cache existed, immediately.

**3. Give the sign-out clears a deadline.**

`clearIdbStore` in `$lib/services/auth.services` applies the same deadline, so no cache — not just
this one — can hold sign-out open. An abandoned clear is harmless: the next session starts against a
new epoch.

## A second path, found after the first fix

The deadline above covers the details cache. A cleaner reproduction then showed the same failure
arriving through a **different database**, on the login path rather than the history path:

1. Brand new incognito session.
2. Landing on the app, `oisy-sol-transaction-details` already exists — the module-scope open runs
   before anyone signs in.
3. Sign in: Solana tokens load, and `oisy-sol-transactions` appears.
4. Sign out and back in: Solana tokens no longer load.
5. Deleting `oisy-sol-transactions` and reloading fixes it.

`oisy-sol-transactions` is created the same way — `idbTransactionsStore(...)` at the module scope of
`$lib/api/idb-transactions.api`, once per realm, for four networks at once, through the same
`createStore` that never closes its connection — so it is exposed to the same creation race. What
makes it worse than the details cache is where it is read: `SolWalletWorker.init` awaits
`syncWalletFromCache` for **every enabled token before the worker starts at all**, inside a
`Promise.allSettled` that catches rejections and cannot see a hang. One wedged read there and the
network's worker never starts, so no balance is ever requested — which is also why XRP was
unaffected throughout: `XrpWalletWorker.init` reads no cache.

So the fix needs a fourth item.

**4. Give the shared wallet-cache sync a deadline.**

`syncWalletFromIdbCache` in `$lib/services/listener.services` already documents the intent — "it is
not critical to sync wallet from cache, so we can skip any issue with availability or errors" — and
a hang defeats it exactly as it defeated the others. It now runs under the same deadline, which
covers the Bitcoin, Ethereum/EVM and ICP listeners that share it, not only Solana. A cache that has
not answered in time is left behind and the chain is read as on a first start.

The three deadlines are now one shared `IDB_DEADLINE_MILLIS` in `$lib/constants/app.constants`,
rather than a 5 s literal in three places.

## Acceptance criteria

- A read whose IndexedDB operation never settles resolves as a cache miss within the deadline, and
  the caller fetches from the RPC as it did before the cache existed.
- After such a miss, later reads answer immediately rather than waiting again.
- A write or trim that never settles is abandoned without failing the load that produced it.
- Sign-out completes within the deadline even when a store never answers.
- A rejected operation still rejects, rather than being reported as a miss.
- Cached details still survive a reload, and a cleared cache still stops a pre-clear realm from
  writing: the epoch guarantee is unchanged.
- A wallet worker starts even when the transactions or balances cache never answers, so no network's
  balances depend on a cache being readable. This holds for every listener that shares
  `syncWalletFromIdbCache`, not only Solana.

## Explicitly not in scope

- **Closing the connections before deleting, or not deleting at all.** This is the root cause: a
  delete of a database the app still holds open can only ever be `blocked`. `clear()` already
  empties the stores a line earlier, so the delete may simply be redundant. Either fix is small and
  belongs in its own change, because it touches sign-out for every network at once.
- **Tying the epoch to the session rather than to module load**, which would remove the pre-login
  database and the per-realm eager open together, and make the epoch mean what its own comment
  says. This is the better shape of the item below.
- **Removing the per-realm eager open**, which is the remaining half of the root cause. It looks
  like the obvious fix and it is not safe as a drop-in: the eager open is what gives a realm the
  epoch of the session it _loaded_ in, and `idb-sol-transaction-details.api.spec.ts` pins the
  load-order semantics that follow — a realm loaded before a clear must not keep its writes, while
  one loaded after it must. Opening on first use cannot tell those two cases apart, because in both
  the first use happens after the clear. Fixing it properly means moving the epoch capture to
  something that runs only in the realms that use the cache (for instance the
  `startSolWalletTimer` branch of `sol-wallet.worker.ts`), which changes the module's contract and
  deserves its own spec. Until then, items 1–4 make the race survivable rather than fatal.
- **The same module-scope `createStore` pattern in the other IndexedDB modules.**
  `$lib/api/idb-transactions.api` opens four databases as it loads and `$lib/api/idb-balances.api`
  another, in every realm, exactly as the details cache does. Item 4 stops a wedge there from
  holding up a worker, but the race itself is untouched and the same treatment is worth a pass of
  its own.
- **The balances/history coupling in `SolWalletScheduler`.** The `Promise.all` that commits balances
  and history together is what let a cache problem blank every balance of a network, native SOL
  included. Decoupling them changes the scheduler's "at most one message per tick" contract and is a
  resilience improvement rather than part of this defect.
- **`hideToast: true` on `syncSolWalletError`.** It makes a whole network failing invisible, but it
  did not contribute here — the error path never ran at all.

## Open questions (facts to confirm)

- None. The mechanism was confirmed by probing the affected origin directly: ten databases opened
  normally and this one returned no event, and deleting it restored both the balances and sign-out
  on the unchanged bundle.

## Pending decisions (facts are clear — we just need to decide)

- Whether 5 s is the right deadline for both the cache and sign-out. It is well above any healthy
  IndexedDB round trip and well below the point where the wallet looks broken, but it is a
  judgement call.
- Whether to pick up the two follow-ups above now — the epoch-capture move that would remove the
  race outright, and the scheduler decoupling — or leave them until another regression makes them
  urgent.
