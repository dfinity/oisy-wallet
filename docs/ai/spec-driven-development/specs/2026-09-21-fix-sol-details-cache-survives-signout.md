This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# fix: the Solana details cache must not survive sign-out

## What was observed

A single sequence, reproducible from a clean incognito session on staging:

1. Land on the app, not signed in — `oisy-sol-transaction-details` **already exists**, holding an
   `epoch` key and nothing else.
2. Sign in — details are written, Solana works.
3. Sign out — **every other `oisy-` database is gone. This one is intact**, with the same epoch and
   every detail still in it.
4. Sign in again — still the same epoch, and **Solana no longer loads**.
5. Sign out again — it hangs. The session cannot be ended.

## Why it happened

`idb-keyval`'s `createStore` does not open anything. It builds a closure and calls
`indexedDB.open` on first use:

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

So every `oisy-` store built at module scope is lazy, and none of them exists before something uses
it — which, for all of them, is after sign-in.

`idb-sol-transaction-details.api.ts` was the exception. It called `openIdb()` at module scope, and
`openIdb` ran `readEpoch`, a `readwrite` transaction. That is a _use_, so the database was created
and held open on every page load, including the landing page, where there is no session and nothing
to cache. The module is reached from `$sol/api/solana.api`, which the worker bundle pulls in, so
this happened in every realm the app starts.

That is what broke sign-out. `signOut` deletes every `oisy-` database, and after the reload
`displayAndCleanLogoutMsg` deletes them again. **A delete cannot proceed against an open
connection**: it fires `blocked`, and `deleteIdbAllOisyRelated` swallows the rejection in its
`Promise.allSettled`. Every other delete succeeded because nothing had opened those databases yet.
This one was already open on the fresh page, so its delete was blocked and left pending — and a
pending delete stalls every later `open()` of that database. `blocked` belongs to the delete
request, not to the open, which is why the open answers with no event of any kind and no error is
ever logged.

Hence the whole sequence: the details of an ended session stayed behind (step 3), the next session
could not read the store its worker startup waits on (step 4), and the clear that sign-out awaits
never returned (step 5).

Introduced by #14073 (`e430dab83`, 2026-09-16), which added both the database and the module-scope
open. Not in any release tag.

## The fix

**1. Open on first use, never as the module loads.**

`openIdb()` is no longer called at module scope. The database comes into existence when something
actually reads or writes a detail, as every other `oisy-` store already did — so there is nothing
open before sign-in, and nothing for the delete to block on.

**2. Drop the epoch.**

The epoch existed to stop a realm of an ended session writing after the clear, and it only worked
by being captured at module load — the very thing that caused this. It is no longer needed: sign-out
deletes the database, and `displayAndCleanLogoutMsg` deletes it again on the page that follows, so a
write landing in the window between the clear and the reload does not reach the next session. Its
constant, its `readwrite` on open, its per-write check and its tests all go, and
`setIdbSolTransactionDetail` becomes a plain `set` plus the existing trim.

## Acceptance criteria

- A realm that has only loaded the module has not created the database; `indexedDB.databases()` does
  not list it.
- The database appears on the first read or write of a detail.
- After sign-out, `oisy-sol-transaction-details` is gone, exactly like every other `oisy-` database.
- Signing out and back in leaves Solana working, and sign-out completes.
- Details still survive a reload within a session, still cap at the newest 200 per network, and
  still keep the networks apart.

## Explicitly not in scope

- **The deadlines in #14104**, which keep a wallet worker from waiting on a cache at all. They are a
  backstop for any future stall, not the fix for this one, and are being kept separately at a
  reduced scope.
- **`deleteIdbAllOisyRelated` swallowing its rejections.** A blocked delete is exactly the signal
  that would have named this defect on day one, and it is discarded by an internal
  `Promise.allSettled`. Worth a change of its own, and it would want a deliberate decision about
  what sign-out should do when a delete fails.
- **The other module-scope `createStore` calls.** They are lazy and therefore safe as they stand;
  the hazard is a _use_ at module scope, not a `createStore` at module scope.

## Open questions (facts to confirm)

- None. The mechanism is confirmed from the `idb-keyval` source, the sign-out path, and the observed
  sequence above.

## Pending decisions (facts are clear — we just need to decide)

- Whether a blocked delete at sign-out should be surfaced rather than swallowed (see above).
