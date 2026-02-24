# Frontend Performance Report - Oisy Wallet (Full Source Analysis)

This report outlines performance improvements and "points of attack" across the entire Oisy Wallet frontend (`src/frontend/src`). The analysis covers core libraries, platform-specific modules (BTC, ETH, ICP, SOL), and the overall application routing/loading structure.

## 1. Store Architecture & Dependency Cascades

### Analysis

The project relies heavily on Svelte `derived` stores. While functionally elegant, the dependency chains are exceptionally deep, especially for token management.

- **ICRC Complexity**: In `src/frontend/src/icp/derived/icrc.derived.ts`, the chain spans from raw custom token stores to filtered canister ID lists for background workers. A single update in the `icrcCustomTokensStore` triggers a cascade through nearly 10 derived stores.
- **Cross-Platform Aggregation**: `lib/derived/tokens.derived.ts` aggregates these platform-specific chains into global stores like `tokens` and `enabledTokens`.
- **Impact**: Any state change in a platform-specific store (e.g., a new ICRC token added) ripple-effects through the entire reactive graph, potentially causing broad re-renders even in unrelated components.

### Suggestions

- **Store Flattening**: Simplify reactive chains by avoiding intermediate stores that only perform trivial filtering or mapping.
- **Update Guarding**: Use `untrack` or custom store logic to prevent updates if the _value_ of the store hasn't meaningfully changed (e.g., if the length of a token list is the same and IDs match).

---

## 2. Web Worker & Platform Redundancy

### Analysis

- **Monolithic vs. Multi-Instance**: The architecture uses a single worker entry point (`lib/workers/workers.ts`) but instantiates multiple workers for different tasks (Exchange, Auth, ICP, ICRC, BTC, SOL).
- **Idle Timers**: Each platform often maintains its own "loop" or "timer" within its scheduler, leading to multiple independent background processes competing for resources.
- **Worker Churn**: Components like `ExchangeWorker.svelte` and various `Loader` components (e.g., `LoaderWallets.svelte`) often initialize workers on `onMount`. If these components are repeatedly mounted/unmounted during navigation, it creates significant worker instantiation overhead.

### Suggestions

- **Unified Wallet Worker**: Consider consolidating per-token wallet workers into a single "Chain Sync Worker" that manages multiple subscriptions to reduce the number of active `Worker` objects.
- **Global Worker Registry**: Move worker initialization out of component `onMount` and into a global service that ensures only one instance of a specific worker type is active.

---

## 3. Data Fetching & Scheduler Efficiency

### Analysis

- **Sequential vs. Parallel**: Some schedulers (e.g., `btc-wallet.scheduler.ts`) load data sequentially in their `loadWalletData` method, whereas others (e.g., `sol-wallet.scheduler.ts`) use `Promise.all`. Sequential loading in a tight loop is inefficient.
- **Redundant I/O**: Schedulers frequently call `loadIdentity()` or similar identity-checking logic on every tick. While usually fast, these add cumulative latency to the background sync.
- **Heavy Layout Initializers**: `src/frontend/src/routes/+layout.svelte` and `src/frontend/src/lib/components/loaders/Loaders.svelte` contain a very deep nesting of data loaders. On initial load, this creates a "loading waterfall" where each layer waits for its predecessor.

### Suggestions

- **Standardize Parallelism**: Enforce the use of `Promise.allSettled` or `Promise.all` in all scheduler job executions to parallelize balance and transaction fetches.
- **Identity Caching**: Pass the identity to the worker once or use an event-based system to update it, rather than polling for it on every sync tick.
- **Loader Flattening**: Refactor the nested loader structure in `Loaders.svelte` into a single orchestration service that can parallelize data fetching where possible.

---

## 4. Points of Attack (Updated)

| File                                         | Issue                                                            | Priority |
| :------------------------------------------- | :--------------------------------------------------------------- | :------- |
| `src/icp/derived/icrc.derived.ts`            | Extremely deep and complex derived store logic.                  | High     |
| `src/lib/components/loaders/Loaders.svelte`  | Deeply nested component tree for initial data loading.           | High     |
| `src/btc/schedulers/btc-wallet.scheduler.ts` | Sequential data fetching in background sync.                     | Medium   |
| `src/lib/workers/workers.ts`                 | Monolithic entry point creating multiple heavy worker instances. | High     |
| `src/routes/+layout.svelte`                  | Staggered initialization of core services.                       | Medium   |

## 5. General Recommendations

- **Audit `onMount`**: Review all components for expensive operations in `onMount` that could be moved to a more centralized initialization phase.
- **Web Worker Splitting**: Split specialized workers into separate files to reduce memory usage for narrow tasks (e.g., the Auth worker shouldn't load Bitcoin libraries).
- **Back-pressure**: Enhance the `WorkerQueue` to better handle cases where network latency exceeds the sync interval.

---

**Report updated on:** 2026-02-20 (Full Source Analysis Included)
