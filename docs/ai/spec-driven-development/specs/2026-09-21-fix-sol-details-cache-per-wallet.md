This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# fix: keep the Solana details cache per wallet, and only once signed in

## What was observed

From a clean incognito session on staging:

1. Land on the app, not signed in — `oisy-sol-transaction-details` **already exists**, holding an
   `epoch` key and nothing else.
2. Sign in — details are written, Solana works.
3. Sign out — **every other `oisy-` database is gone. This one is intact**, with the same epoch and
   every detail still in it.
4. Sign in again — still the same epoch, and **Solana no longer loads**.
5. Sign out again — it hangs. The session cannot be ended.

## Why it happened

Two faults, both from #14073, and only the first is visible.

### The database existed before anyone signed in

`idb-keyval`'s `createStore` opens nothing by itself — it calls `indexedDB.open` on first use:

```js
function createStore(dbName, storeName) {
	let dbp;
	const getDB = () => {
		if (dbp) return dbp;
		const request = indexedDB.open(dbName);
		// …
	};
	return (txMode, callback) => getDB().then(/* … */);
}
```

So no other `oisy-` database exists before something uses it, which for all of them is after
sign-in. This module was the exception: it called `openIdb()` at module scope, and `openIdb` ran
`readEpoch`, a `readwrite` transaction. That is a use, so the database was created and **held open**
on every page load, including the landing page — in every realm, since the worker bundle reaches
this module through `$sol/api/solana.api`.

That is what broke sign-out. `signOut` clears each store, deletes every `oisy-` database, and after
the reload `displayAndCleanLogoutMsg` deletes them again. **A delete cannot proceed against an open
connection**: it fires `blocked`, and `deleteIdbAllOisyRelated` swallows the rejection in its
`Promise.allSettled`. Every other delete succeeded because nothing had opened those databases. This
one was already open on the fresh page, so its delete was blocked and left pending — and a pending
delete stalls every later `open()` of that database. `blocked` belongs to the delete request, not to
the open, which is why the open answers with no event of any kind and nothing is ever logged.

Hence the sequence: the details of an ended session stayed behind (3), the next session could not
read the store its worker startup waits on (4), and the clear that sign-out awaits never returned
(5).

### The entries were not scoped to a user

Every other cache is keyed by principal — `toKey({ principal, tokenId, networkId })` in
`$lib/api/idb-transactions.api`, and `getIdbBalances` the same. A leftover entry from the previous
user sits under their principal and the next user's reads never touch it.

This cache was keyed by `network#slot#signature` alone. A finalized transaction is identical for
everyone, so the entries were shareable — but nothing in the key says who wrote it. That has two
consequences: a stale entry cannot be told apart at sign-out, and the entries reveal which
transactions the previous user's wallet had looked at, on a machine that may have another user next.
`PRODUCT.md` already says these "go with the rest of the session", and cross-user sharing was never
intended.

The epoch was a session marker bolted on to compensate for that missing scope. It only worked by
being captured at module load — which is the first fault.

Not in any release tag, so no released build is affected.

## The fix

**1. Open on first use, never as the module loads.**

`openIdb()` is no longer called at module scope. The database comes into existence on the first read
or write of a detail, exactly as every other `oisy-` store does, so there is nothing open before
sign-in and the delete has nothing to block on.

**2. Key each entry by the wallet it was read for.**

`address#network#slot#signature`, so the store is scoped per user as every other cache is. A
leftover entry is unreadable by the next user even if a delete fails, and the cap applies per wallet
and network rather than across all of them.

The wallet address rather than the principal: it is one-to-one with the principal, gives the same
isolation, and is already held at these call sites — `fetchSolTransactionsForSignature` has it.
Threading a principal instead would mean passing it through four levels of the worker and would
silently disable the cache whenever the worker's `NullishIdentity` is null.

The measured benefit of the cache is untouched: every case it was built for — the worker's newest
page after a reload, a token enabled later deriving records it does not hold — is the same wallet.

**3. Drop the epoch.**

With the scope in the key and the delete working, it has nothing left to do. Sign-out deletes the
database and the page that follows deletes it again, so a write landing between the clear and the
reload does not reach the next session — and could not be read by them in any case.

## Acceptance criteria

- A realm that has only loaded the module has not created the database; `indexedDB.databases()` does
  not list it. It appears on the first read or write.
- After sign-out, `oisy-sol-transaction-details` is gone, exactly like every other `oisy-` database.
- Signing out and back in leaves Solana working, and sign-out completes.
- One wallet is never served an entry another wallet kept, and the cap applies to each wallet
  separately.
- Details still survive a reload within a session, still cap at the newest 200 per wallet and
  network, and still keep the networks apart.

## Explicitly not in scope

- **The worker-startup deadline in #14104**, which keeps a wallet worker from waiting on a cache at
  all. A backstop for any future stall, not the fix for this one.
- **`deleteIdbAllOisyRelated` swallowing its rejections.** A blocked delete is exactly the signal
  that would have named this defect on day one, and it is discarded by an internal
  `Promise.allSettled`. Worth its own change, and it wants a deliberate decision about what sign-out
  should do when a delete fails.
- **The other module-scope `createStore` calls.** They are lazy and safe as they stand; the hazard is
  a _use_ at module scope, not a `createStore` at module scope.

## Open questions (facts to confirm)

- None. The mechanism is confirmed from the `idb-keyval` source, the sign-out path, and the sequence
  above. The end-to-end behaviour still wants a run of that sequence on a test environment, since a
  harness on `fake-indexeddb` cannot prove the real delete now completes.

## Pending decisions (facts are clear — we just need to decide)

- Whether a blocked delete at sign-out should be surfaced rather than swallowed (see above).
