# Architecture Split Proposal

## Problem

The frontend codebase (`src/frontend`) contains ~2,860 source files and ~787 test files in a single package with no workspace structure. The `lib/` directory alone has ~1,195 files mixing generic utilities with wallet-specific logic. This creates high cognitive load, slower CI, and makes it harder to reuse code across projects.

The codebase already has strong implicit boundaries — the `$btc`, `$eth`, `$icp`, `$sol`, `$env`, `$lib` aliases mirror what separate packages would look like. The architecture is ready to be formalized.

## Proposed Packages

### 1. `@oisy/types` — Wallet-domain type system

**Priority:** Highest — this is the foundation all other packages depend on.

**What goes in:**

- `lib/types/` — `Network`, `NetworkId`, `Token`, `TokenId`, `Transaction`, `Balance`, `Address`, `Amount`, `Send`, `Swap`, `Stake`, `NFT`, `WalletConnect`, `Contact`, `Exchange`, etc.
- `lib/schema/` — Zod validation schemas (currency, network, token, transaction, signer, etc.)
- `lib/enums/` — `token-types`, `currency`, `languages`, etc.

**Why extract it:**

- Zero runtime dependencies, zero risk.
- Defines the shared vocabulary any wallet app needs.
- Unlocks all other extractions (every other package imports from this one).

---

### 2. `@oisy/utils` — Pure generic utilities

**Priority:** High — low risk, immediately reusable.

**What goes in (chain-agnostic only):**

| File                 | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `format.utils.ts`    | Token/currency/date formatting                        |
| `parse.utils.ts`     | Token parsing, decimal normalization                  |
| `currency.utils.ts`  | Currency name, symbol, decimal digits                 |
| `bigint.utils.ts`    | BigInt helpers                                        |
| `array.utils.ts`     | `last`, `primitiveArrayEqual`                         |
| `time.utils.ts`      | `randomWait`                                          |
| `timeout.utils.ts`   | `waitForMilliseconds`, `waitReady`                    |
| `clipboard.utils.ts` | Clipboard operations                                  |
| `share.utils.ts`     | Web Share API helpers                                 |
| `storage.utils.ts`   | localStorage helpers                                  |
| `input.utils.ts`     | Input validation                                      |
| `json.utils.ts`      | JSON serialization, hash/principal detection          |
| `error.utils.ts`     | Error formatting                                      |
| `i18n.utils.ts`      | Placeholder replacement, language detection           |
| `markdown.utils.ts`  | Markdown block parsing                                |
| `qr-code.utils.ts`   | QR code generation                                    |
| `ts.utils.ts`        | TypeScript type utilities (`Only`, `Either`, `OneOf`) |

**What stays in the app:**

- `network.utils.ts`, `token.utils.ts`, `transactions.utils.ts`, `swap.utils.ts`, `wallet.utils.ts` — these depend on wallet-domain stores/services and belong closer to the app.

---

### 3. `@oisy/tokens` — Token & network registry

**Priority:** High — large (~280 files), frequently changed, purely declarative.

**What goes in (the entire `env/` directory):**

- `env/tokens/` — All token configurations (SNS, ckERC20, ICRC, ERC20, ERC4626, SPL, IcPunks, etc.)
- `env/networks/` — Network definitions (ICP, ETH, BTC, SOL, EVM chains)
- `env/rest/` — API endpoint configurations (Blockstream, Infura, Alchemy, QuickNode, KongSwap, Harvest)
- `env/schema/` — Environment validation schemas
- `env/types/` — Environment-related type definitions

**Why extract it:**

- ~10% of source files, changes frequently but independently of app logic.
- Token/network additions won't pollute app PRs.
- Other wallets can import the same registry.

---

### 4. `@oisy/api-clients` — REST/RPC clients

**Priority:** Medium — isolates third-party API surface.

**What goes in:**

- `lib/rest/` — Blockstream, KongSwap, CoinGecko, Open Crypto Pay clients
- `lib/api/idb*.ts` — IndexedDB adapters
- `lib/services/rest.services.ts` — Retry logic
- Chain-specific REST providers (`eth/providers/`, `sol/api/`)

**Why extract it:**

- Pure HTTP/RPC wrappers with no UI or store dependencies.
- Makes mocking easier, independently testable.
- Another wallet app would need these verbatim.

---

### 5. `@oisy/services` — Wallet business logic

**Priority:** Lower — do this last, after the others are stable.

**What goes in:**

- `lib/services/` — Auth, address resolution, token loading, swap orchestration, WalletConnect, contacts, worker queue, rewards, analytics
- Chain-specific services (`icp/services/`, `eth/services/`, `btc/services/`, `sol/services/`)

**Why do it last:**

- Services depend on types, utils, API clients, and stores — the most complex dependency graph.
- Needs clean interfaces from extractions 1–4 first.
- Pattern: define a `WalletService` interface in `@oisy/types`, implement chain-specific adapters here.

---

## What NOT to Extract

| Layer                                              | Why it stays in the app                                              |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| **Svelte components** (`lib/components/`)          | Tightly coupled to the app's UX, Svelte version, and design system   |
| **Stores/derived** (`lib/stores/`, `lib/derived/`) | Svelte-specific state management, tied to the app's reactivity model |
| **Workers/schedulers**                             | App-specific orchestration                                           |
| **i18n JSON files**                                | Translation strings are app-specific                                 |
| **Routes**                                         | App-specific                                                         |

## Dependency Graph

```
@oisy/types          ← zero deps, foundation
    ↑
@oisy/utils          ← depends on @oisy/types
    ↑
@oisy/tokens         ← depends on @oisy/types (registry data)
    ↑
@oisy/api-clients    ← depends on @oisy/types (HTTP clients)
    ↑
@oisy/services       ← depends on all above (business logic)
    ↑
src/frontend (app)   ← depends on all above + Svelte components, stores, routes
```

## Recommended Approach: Monorepo with Workspaces

### Why monorepo over separate repos

| Concern                | Monorepo (recommended)                                     | Separate repos                                                 |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------- |
| **Adding a new chain** | One PR touches all affected packages                       | Coordinated PRs across 3–5 repos in sequence                   |
| **Dependency updates** | Automatic via workspace links, no version bumping          | Bump → publish → update downstream, per repo                   |
| **CI test triggering** | Path-based triggers or Turborepo/Nx for affected-only runs | Each repo runs its own tests, misses cross-package regressions |
| **Formatting/linting** | One shared config at the root                              | Separate configs per repo (or extract `@oisy/eslint-config`)   |
| **PR review**          | Single PR for cross-cutting changes                        | Multiple PRs to review and coordinate                          |
| **Release velocity**   | Ship everything together                                   | Blocked by publish → update chains                             |

### Proposed directory structure

```
packages/
  types/           → @oisy/types
  utils/           → @oisy/utils
  tokens/          → @oisy/tokens
  api-clients/     → @oisy/api-clients
  services/        → @oisy/services
src/frontend/      → the app (depends on the above)
src/backend/       → Rust canisters (existing)
src/shared/        → Rust shared crate (existing)
```

### Smart CI with Turborepo or Nx

Tools like Turborepo or Nx understand the dependency graph and only run tests for packages **affected** by a change:

- Edit `@oisy/tokens` (add a new ERC20 token) → runs `@oisy/tokens` tests + `src/frontend` tests, but NOT `@oisy/utils` tests.
- Edit `@oisy/utils` → runs `@oisy/utils` tests + everything that depends on it.

This is better than today, where every PR runs all ~787 tests regardless of what changed.

## Implementation Roadmap

1. **Set up pnpm workspaces** — add `pnpm-workspace.yaml`, create `packages/` directory.
2. **Extract `@oisy/types`** — move `lib/types/`, `lib/schema/`, `lib/enums/`. Update imports. Low risk, proves the pattern.
3. **Extract `@oisy/utils`** — move chain-agnostic utils. ~73 tests move with them.
4. **Extract `@oisy/tokens`** — move `env/` directory. ~280 files, largest single extraction.
5. **Add Turborepo/Nx** — enable affected-only test runs, build caching.
6. **Extract `@oisy/api-clients`** — once the pattern is established.
7. **Extract `@oisy/services`** — last, when interfaces are stable.

Each step is independently shippable. If step 2 reveals unexpected coupling, you can stop and still benefit from the workspace setup.
