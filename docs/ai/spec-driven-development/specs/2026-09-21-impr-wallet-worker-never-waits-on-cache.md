This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

# impr: a wallet worker must not wait on its IndexedDB cache

## Why

`SolWalletWorker.init` awaits `syncWalletFromCache` for **every enabled token before the worker
starts**, inside a `Promise.allSettled`:

```ts
await Promise.allSettled(
	[token, ...splTokens]
		.filter(/* … */)
		.map(({ id: tokenId }) => syncWalletFromCache({ tokenId, networkId }))
);
```

`Promise.allSettled` protects against a rejection. It does nothing against an operation that never
settles — and IndexedDB can fail exactly that way: an `open` that fires neither `success`, `error`
nor `blocked` leaves everything queued behind it waiting for the life of the page. One such read and
the network's worker never starts, so no balance is ever requested and every token of that network
stays on a loading skeleton, with nothing thrown and nothing logged.

`syncWalletFromIdbCache` already states the intent — "it is not critical to sync wallet from cache,
so we can skip any issue with availability or errors". A hang defeats it, because there is no error
to skip.

This is a resilience property, not a defect report. One way of provoking it was fixed at its cause
in #14106; this makes the class of failure survivable regardless of what causes the next one, for
every listener rather than only Solana. Notably, XRP was never affected by that defect for exactly
this reason: `XrpWalletWorker.init` reads no cache at all.

## The change

**A deadline for work that can fail by saying nothing.**

`withDeadline` in `$lib/utils/timeout.utils` races an operation against a deadline and resolves with
a caller-supplied fallback once it passes. A rejection still propagates: a deadline is for silence,
and a failure stays the caller's business.

`syncWalletFromIdbCache` in `$lib/services/listener.services` runs under it, with a shared
`IDB_DEADLINE_MILLIS` in `$lib/constants/app.constants`. A cache that has not answered in time is
left behind and the chain is read as on a first start. Bitcoin, Ethereum/EVM and ICP share that
function, so all of them are covered.

## Acceptance criteria

- A wallet worker starts even when the transactions or balances cache never answers, so no
  network's balances depend on a cache being readable.
- The cache is still applied normally when it answers in time.
- An operation that rejects still rejects; it is not reported as a timeout.
- Nothing else in the sign-out or details-cache paths changes — those belong to #14106.

## Explicitly not in scope

- **Deadlines on the details cache itself, and on the sign-out clears.** An earlier revision of this
  branch had both. They were dropped: once the cause is fixed in #14106 they guard a case that
  should not arise, and a deadline there would silently hide the next wedge — which is precisely
  what made the original defect take so long to find. A blocked delete at sign-out should be
  surfaced, not swallowed on a timer.
- **Deciding what sign-out does when a cache cannot be cleared.** Recorded as a follow-up in #14106.

## Open questions (facts to confirm)

- None.

## Pending decisions (facts are clear — we just need to decide)

- Whether 5 s is the right deadline. It is well above a healthy IndexedDB round trip and well below
  the point where the wallet looks broken, but it is a judgement call.
