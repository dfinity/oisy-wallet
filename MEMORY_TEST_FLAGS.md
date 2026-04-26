# Memory consumption — analysis and A/B test flags

This document accompanies the test branch
`chore-frontend/memory-consumption-test-flags` (PR
[#12578](https://github.com/dfinity/oisy-wallet/pull/12578)). The branch
is **not intended for `main`** — it exists only so we can A/B four
candidate memory fixes against the current behavior.

---

## Reported symptom

For users with many tokens (~50) and many transactions (~500), oisy's
in-browser memory consumption climbs to roughly 1 GB, and **roughly
doubles right after a hard reload** (peaking near 2 GB) before settling
back down.

The doubling pattern is consistent with two generations of state being
live at once during init — the previous page's allocations are still
reachable while the new page is rebuilding its world.

---

## Initial code-level analysis

Findings from a read-only audit of `src/frontend/src/`.

### 1. `transactions.store.ts` — per-token spread-merge on every update

[src/frontend/src/lib/stores/transactions.store.ts](src/frontend/src/lib/stores/transactions.store.ts)

Every method (`set`, `add`, `prepend`, `append`, `update`, `cleanUp`,
`nullify`) does:

```ts
update((state) => ({
    ...(nonNullish(state) && state),
    [tokenId]: [...(state?.[tokenId] ?? []), ...transactions]
}));
```

For 50 tokens × ~500 transactions, every wallet event allocates a fresh
N-item array. On reload, all per-token workers fire near-simultaneously,
so this fires across ~50 tokens at once.

**Severity:** likely-major.

### 2. `ic-transactions.derived.ts` — derived store with 9 inputs and full re-flatten

[src/frontend/src/icp/derived/ic-transactions.derived.ts](src/frontend/src/icp/derived/ic-transactions.derived.ts)

`icTransactions` depends on 9 stores. Any change to any of them rebuilds
the flattened array via `getAllIcTransactions(...)`, which spreads
pending ckBTC + pending ckETH + extended transactions into a fresh
array. Each rebuild also runs `getIcExtendedTransactions(...)` which maps
and creates new objects.

**Severity:** likely-major.

### 3. `exchange.store.ts` — `reduce`-with-spread to merge prices

[src/frontend/src/lib/stores/exchange.store.ts](src/frontend/src/lib/stores/exchange.store.ts)

```ts
...tokensPrice.reduce(
    (acc, price) => ({ ...acc, ...price }),
    {}
)
```

This is O(n) intermediate object allocations per refresh. With ~50
tokens and a 30–60 s refresh cadence, it's sustained pressure.

**Severity:** likely-major (cheap to fix, easy attribution).

### 4. `worker.icrc-wallet.services.ts` — one Web Worker per token on non-iOS

[src/frontend/src/icp/services/worker.icrc-wallet.services.ts:88](src/frontend/src/icp/services/worker.icrc-wallet.services.ts#L88)

```ts
const worker = await AppWorker.getInstance({ asSingleton: isIOS() });
```

iOS already runs a single shared worker. On every other platform each
ICRC token spawns its own `AppWorker` — for 50 tokens that's ~50 worker
contexts, each with its own agent, identity, queue and scheduler. The
existing `if (ref !== this.ledgerCanisterId) return;` guard inside the
onMessage handler already makes a singleton worker safe.

**Severity:** likely-major. Possibly the biggest single lever.

### Why the post-reload spike

Two effects compound during init:
- **All workers boot simultaneously** → 50 derived recomputes hit at
  once, each allocating 500-tx arrays in 2–3 forms (raw, parsed,
  display).
- **agent-js's `AgentManager` singleton** keeps cached agents reachable
  across the boundary, so the previous page's memory hasn't been GCed
  yet when the new page initializes its own.

---

## Items considered but not addressed in this PR

For scope reasons we agreed to skip:

- **Transaction list virtualization** — would require swapping the
  rendering tree (`{#if flag}` around two `{#each}` blocks). Memory cost
  is comparatively small (~1–2 MB for 500 DOM nodes).
- **agent-js / reload cleanup** — a `beforeunload` reset of cached
  agents could help the spike, but the effect is speculative until
  measured. Treated as a follow-up.

---

## Approach we agreed on

Four fixes, each behind its own runtime feature flag.

- **Default: all flags off** → behavior on this branch matches `main`.
- **Toggle at runtime** via URL param, persisted to `localStorage` —
  no rebuild required between measurement runs.
- **One commit per fix** for clean isolation; the prep commit adds the
  flag mechanism.
- **Code style is intentionally pragmatic** (`if (FLAG) { new path }
  else { original }`). This branch does not need to be production-ready
  because it does not aim to land.

| # | Flag constant | File | What changes when enabled |
|---|---|---|---|
| 1 | `MEMORY_FIX_TRANSACTIONS_STORE` | [transactions.store.ts](src/frontend/src/lib/stores/transactions.store.ts) | Mutate the per-token array in place (push / unshift / in-place filter) and shallow-copy only the outer object for Svelte reactivity. |
| 2 | `MEMORY_FIX_IC_TRANSACTIONS_DERIVED` | [ic-transactions.derived.ts](src/frontend/src/icp/derived/ic-transactions.derived.ts) | Memoize on the 9 input references; if all inputs are reference-equal to the previous call, return the cached result. |
| 3 | `MEMORY_FIX_EXCHANGE_STORE` | [exchange.store.ts](src/frontend/src/lib/stores/exchange.store.ts) | Replace the `reduce`-with-spread merge with a single-pass `Object.assign` into one accumulator. |
| 4 | `MEMORY_FIX_WORKER_SINGLETON` | [worker.icrc-wallet.services.ts](src/frontend/src/icp/services/worker.icrc-wallet.services.ts) | Pass `asSingleton: true` on non-iOS too — all ICRC tokens share one `AppWorker`. The per-message `ledgerCanisterId` guard already handles routing. |

---

## How to set the flags

The flag mechanism lives at
[src/frontend/src/lib/utils/memory-flags.utils.ts](src/frontend/src/lib/utils/memory-flags.utils.ts).
It reads once at app startup, in this order:

1. If the URL contains `?memFlags=...`, that value is used **and**
   written to `localStorage` under `oisy.memFlags`.
2. Otherwise the value already in `localStorage` is used.
3. Otherwise no flags are enabled.

So you only have to set the URL once per profile — reloads keep the
configuration, which is what we need to measure the post-reload spike.

### URL param syntax

| URL | Result |
|---|---|
| (no `memFlags` param) | leaves whatever is currently in `localStorage` |
| `?memFlags=` (empty value) | clears all flags |
| `?memFlags=4` | enables only flag 4 |
| `?memFlags=1,3` | enables flags 1 and 3 |
| `?memFlags=1,2,3,4` | enables all four |
| `?memFlags=all` | enables all four (alias) |

When at least one flag is on, the console logs `[memFlags] enabled: ...`
at startup so you can confirm the setup before profiling.

### Clearing flags

Either visit any page with `?memFlags=` (empty), or run in DevTools:

```js
localStorage.removeItem('oisy.memFlags');
```

Then hard-reload.

---

## Suggested measurement protocol

The goal is to attribute baseline savings to specific fixes and to see
which of them blunts the post-reload spike. Heap snapshots before and
**immediately after a hard reload** are the most informative — that's
where the doubling shows up.

1. **Baseline.** Open the app with `?memFlags=` (cleared). Reproduce the
   50-token / 500-transaction scenario. Snapshot before reload, hard
   reload, snapshot again at the spike, snapshot once it settles.
2. **Each flag alone.** Repeat step 1 with `?memFlags=N` for each of
   `1`, `2`, `3`, `4`. This isolates each fix.
3. **Combined.** Repeat step 1 with `?memFlags=all`.

Notes:
- Flag 4 (singleton worker) is most likely the largest single drop in
  baseline; it's also the cheapest to enable.
- Flag 2 alone is expected to show little impact, because upstream
  stores still emit new top-level references on every update. The
  most interesting pairing is **1 + 2**, where #1 stops emitting new
  inner-array references and #2's memoization can actually hit.
- Flag 3's impact will scale with how often exchange rates refresh.

---

## Caveats / things to watch for

- **Flag 1** mutates the inner per-token array. Anything that captures
  that inner array reference and reads it later asynchronously (e.g.
  inside a `setTimeout`) could see mutations. The audit didn't find
  such a consumer, but it's worth keeping in mind during measurement.
- **Flag 2** uses reference-equality memoization only. With current
  upstream stores it rarely hits its cache. The flag's value is mainly
  in confirming whether the derived's recompute itself is on the hot
  path.
- **Flag 4** changes the threading layout. The
  `if (ref !== this.ledgerCanisterId) return;` guard inside
  `IcrcWalletWorker.setOnMessage` is what makes the singleton path
  correct — review that handler if anything looks off in the data.
