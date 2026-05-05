# Workflow: Add a new service / API call / store

Use when you need to expose a backend operation to the UI, orchestrate a
multi-step flow, or create cross-route shared state.

## Decide which layer

```
Component (.svelte)
  ↳ <chain or feature>/services/*.services.ts          orchestration, toasts, i18n
       ↳ $lib/api/*            wrappers around $declarations/backend
       ↳ $lib/canisters/*      typed canister actor calls
       ↳ $lib/rest/*           CoinGecko / Blockstream / kongswap / icpswap / …
       ↳ $lib/providers/*      long-lived providers (auth client, swap providers)
       ↳ $lib/workers/*        web workers (auth, exchange) — scheduled via $lib/schedulers/
```

| You need…                                                          | Layer                                                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| To call a new backend canister method                              | Update Rust + `backend.did`, run `npm run generate`, then add a wrapper in `$lib/api/backend.api.ts` (or a dedicated `*.api.ts`). |
| To call another canister                                           | Add a typed wrapper under `$lib/canisters/<name>.canister.ts`.                         |
| To call an HTTP service (CoinGecko, kongswap, …)                   | Add or extend a `*.rest.ts` under `$lib/rest/`.                                        |
| To orchestrate calls + toast + i18n + side effects                 | `$lib/services/<thing>.services.ts` (cross-chain) or `$<chain>/services/...services.ts`. |
| To share reactive state across routes                              | A Svelte store in `$lib/stores/` or `$<chain>/stores/`. Or a `*.svelte.ts` rune module. |
| To compute derived state from stores                               | A `derived(...)` Svelte store in `$lib/derived/` or `$<chain>/derived/`.               |

## Steps

1. **Backend ↔ FE contract.** If the canister method doesn't exist yet,
   the backend PR (or both PRs together) lands first. See
   [`backend/workflows/new-endpoint.md`](../../backend/workflows/new-endpoint.md).
   Then run:

   ```bash
   npm run generate    # regenerates src/declarations/**
   ```

   Both `src/backend/backend.did` and `src/declarations/**` are generated
   — never hand-edit them.

2. **`$lib/api` wrapper (canister methods).**
   - File: `$lib/api/backend.api.ts` (existing) or a new `<canister>.api.ts`.
   - Export named async functions returning typed values. Validate the
     response shape with the matching `zod` schema from `$lib/schema/`
     when the boundary needs it.
   - Throw / reject only for unexpected runtime errors. Expected error
     paths should return a typed value.

3. **`$lib/rest` wrapper (HTTP).**
   - File: `$lib/rest/<provider>.rest.ts`.
   - Use the `fetch` API. Validate the response with a `zod` schema.
   - Surface feature flags via `$env/rest/<provider>.env.ts`.

4. **`*.services.ts` orchestration.**
   - File: `$lib/services/<thing>.services.ts` (cross-chain) or
     `$<chain>/services/<thing>.services.ts`.
   - Pull copy from `$lib/stores/i18n.store` (`get(i18n).…` outside
     `.svelte` files).
   - Toast via `$lib/stores/toasts.store` / `notification.services` on
     user-visible errors.
   - Use `consoleError` / `consoleWarn` from `$lib/utils/console.utils` for
     internal logs (NOT `console.error` / `.warn`).
   - Avoid throwing for expected user errors — toast and return a
     meaningful result.

5. **Stores / derived (only if needed).**
   - Add a Svelte store under `$lib/stores/` (or the chain folder) when
     the value must be observable across routes. Use the existing
     `certified.store` pattern when the data is certified IC state.
   - Add a `derived(...)` in `$lib/derived/` for cross-store computations.
   - Use a `*.svelte.ts` rune-state module when consumers are only
     runes-based.
   - Don't cache server data twice — let the service / store own that.

6. **Tests.**
   - `*.services.ts` test → mock the underlying `*.api`, `*.rest`,
     `*.canister`, and `toasts.store`. See
     [testing.md](../testing.md#conventions).
   - `*.utils.ts` test → directly assert pure outputs.
   - `*.derived.ts` test → use the `$tests/utils/derived.test-utils.ts`
     helpers when present.
   - Reuse mocks from `$tests/mocks/**.mock.ts`. If you create a new
     mock, put it there.

7. **Catalog update.** If the new service / store is reusable across
   features, add a row in
   [`reusability.md`](../reusability.md#catalog-current-keep-this-honest).

8. **Quality gates.**

   ```bash
   npm run format
   npm run lint -- --max-warnings 0
   npm run check
   npm run test
   ```

9. **PR.** `feat(frontend): expose <thing>` (or `refactor(frontend): …` if
   you're only restructuring; `fix(frontend): …` for bug fixes).

## Don'ts

- Call `fetch` directly from a component.
- Call `$lib/api/*` or `$lib/canisters/*` directly from a component (skip
  the service layer).
- Use `console.error` / `console.warn` (eslint enforces `consoleError` /
  `consoleWarn`).
- Use the `0n` literal (eslint enforces the shared `ZERO`).
- Hand-edit `src/declarations/**` or `src/backend/backend.did`.
- Cache server data in a store _and_ in the service — pick one (the
  service / store layer).
- Add a new top-level folder under `src/frontend/src/` to host the new
  service.
