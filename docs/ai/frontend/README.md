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
- [ ] User-visible copy, colours, and icons follow brand rules —
      [`brand-and-copy.md`](./brand-and-copy.md).
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

Framework, UI lib, chain SDKs, and dev tooling are discoverable from
[`package.json`](../../../package.json). The non-obvious bits:

- **Svelte 5 mid-migration.** New code uses runes; existing Svelte stores
  stay in place — do not migrate them in unrelated PRs. See
  [`stack-and-patterns.md`](./stack-and-patterns.md).
- **i18n** keys are generated from `src/frontend/src/lib/i18n/en.json` via
  `npm run i18n`. The `auto-update-i18n` workflow only structurally syncs
  non-`en` locales (missing keys → empty string, extra keys dropped,
  existing values preserved) — it does **not** translate. Don't author
  non-`en` translations unless the developer explicitly asks. See
  [`i18n-and-a11y.md`](./i18n-and-a11y.md#i18n).
- **Testing.** Vitest 4 + `@testing-library/svelte` + `jsdom`, sharded 20×
  in CI. Specs live under `src/frontend/src/tests/` mirroring source
  (never co-located). Playwright (`e2e/`) is maintenance-only.
- **Analytics.** Product events go through a single `trackEvent` entry point
  and a small shared metadata vocabulary; it is non-critical, anonymous, and
  never throws into a user flow. Read [`analytics.md`](./analytics.md) before
  wiring any tracking, and keep the code in sync with the Confluence registry.
- **Path aliases** (declared in
  [`svelte.config.js`](../../../svelte.config.js) and
  [`vitest.config.ts`](../../../vitest.config.ts)): `$lib`, `$routes`,
  `$btc`, `$eth`, `$evm`, `$icp`, `$sol`, `$icp-eth`, `$env`,
  `$declarations`, `$tests`. Relative imports under `src/frontend/src/`
  are an ESLint error.

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
