# Frontend AI Guide

If you are about to touch anything under `src/frontend/`, this is your
starting point. Read it once per session.

> Higher up the chain: [`AGENTS.md`](../../../AGENTS.md) → [`docs/ai/`](../README.md).

## Pre-flight checklist (every change)

- [ ] I read [`AGENTS.md`](../../../AGENTS.md) and the
      [10 commandments](../../../AGENTS.md#2-the-10-commandments-read-before-every-change).
- [ ] I know which folder my code belongs in — see [`structure.md`](./structure.md).
- [ ] I checked [`reusability.md`](./reusability.md) for an existing
      component / util / store before creating one.
- [ ] My code follows [`stack-and-patterns.md`](./stack-and-patterns.md)
      (Svelte 5 runes for new code, Svelte stores for cross-route state, TS
      with no `any`).
- [ ] No hard-coded user-visible strings; a11y attributes set —
      [`i18n-and-a11y.md`](./i18n-and-a11y.md).
- [ ] I have or extended tests where the [`testing.md`](./testing.md) policy
      requires.
- [ ] No `console.error` / `console.warn` / `0n` / relative imports in
      `src/frontend/src/` — eslint enforces.
- [ ] Local quality gates pass —
      [`../pr-and-ci.md`](../pr-and-ci.md#4-local-quality-gates).
- [ ] PR title + body match conventions — [`../pr-and-ci.md`](../pr-and-ci.md).
- [ ] If I introduced a new pattern, I updated `docs/ai/**` in the same PR
      ([meta-update rule](../governance.md#meta-update-rule)).

## Stack at a glance

- **SvelteKit 2 + Svelte 5**, TypeScript everywhere. The codebase is
  mid-migration: new code uses runes, but Svelte stores
  (`writable` / `readable` / `derived` from `svelte/store`) remain the
  primary cross-route reactive primitive. Both are first-class.
- **Tailwind v4** (`@tailwindcss/postcss`).
- **`@dfinity/gix-components`** for many UI primitives.
- **`@icp-sdk/{auth,canisters,core}`**, **`@dfinity/utils`**,
  **`@dfinity/zod-schemas`**, **`@dfinity/oisy-wallet-signer`** for IC plumbing.
- **EVM:** `ethers`, `viem`. **Solana:** `@solana/kit`,
  `@solana-program/*`. **Bitcoin:** `bitcoinjs-lib`. **WalletConnect:**
  `@reown/walletkit`.
- **i18n:** typed keys generated from `src/frontend/src/lib/i18n/en.json`
  via `npm run i18n`. Other locales auto-translated by the
  `auto-update-i18n` workflow — never hand-edit them.
- **Testing:** Vitest 4 + `@testing-library/svelte` + `jsdom` (sharded 20×
  in CI). Playwright for e2e under `e2e/`.
- **Path aliases** (declared in
  [`svelte.config.js`](../../../svelte.config.js) and
  [`vitest.config.ts`](../../../vitest.config.ts)): `$lib`, `$routes`,
  `$btc`, `$eth`, `$evm`, `$icp`, `$sol`, `$icp-eth`, `$env`,
  `$declarations`, `$tests`.

## Where things go (one-liner)

```
src/frontend/src/
├── routes/         SvelteKit pages — (app) (public) (sign) groups
├── lib/            Cross-cutting components / services / stores / derived /
│                   utils / constants / i18n / schema / validation / workers
├── btc/  eth/  evm/  icp/  sol/  icp-eth/   Per-chain mirrors of lib/
├── env/            Networks, tokens and feature-flag definitions
├── tests/          Mirrors src/ — every *.spec.ts lives here
└── hooks.ts, app.html, app.d.ts
```

Full taxonomy and naming conventions: [`structure.md`](./structure.md).

## What "good" looks like in this repo

A 10x change in this repo is small, focused, and reuses what's there.
Recent merged PRs to learn from (from `git log` on `main`):

- `refactor(frontend): extract AiAssistantChat component` (#12646) —
  pulls a cohesive sub-component out of a larger one. No behaviour change.
- `refactor(frontend): extract AiAssistantResetButton component` (#12647) —
  same shape, same author day; small atomic pieces over a single megapatch.
- `feat(frontend): expose newUserSignupsAllowed backend method` (#12620) —
  thin wrapper added in the right service layer.
- `feat(frontend): improve UTXO selection to smallest-sufficient greedy
algorithm` (#12657) — single-purpose algorithmic change with a
  regression test.
- `fix(frontend): correct error ordering in assertCkEthAmount when amount
is below ledger fee` (#12499) — single bug, dedicated regression test.
- `style(frontend): align typography with new design` — pure visual,
  uses tokens.

If your PR doesn't look like one of those (single verb, single scope,
small diff, contained tests), reconsider scope before continuing.
