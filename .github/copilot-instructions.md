# GitHub Copilot Instructions

> **Read [`AGENTS.md`](../AGENTS.md) first.** It is the canonical entry point
> for every AI coding agent in this repository (Copilot included). The rest
> of this file is a thin Copilot-specific layer that never contradicts it.

## Pointers for Copilot

- Frontend structure (path aliases, file suffixes, decision tree):
  [`docs/ai/frontend/structure.md`](../docs/ai/frontend/structure.md).
- Backend / Rust canister structure:
  [`docs/ai/backend/structure.md`](../docs/ai/backend/structure.md).
- PR title is enforced by CI: `verb(scope): description`. Body must
  include `# Motivation`, `# Changes`, `# Tests`. Full rules:
  [`docs/ai/pr-and-ci.md`](../docs/ai/pr-and-ci.md).

## Non-negotiables on every suggestion

- **Idiomatic.** Match surrounding code, not your training defaults.
- **Atomic.** One logical change at a time.
- **Reusable.** Search before creating a new component / util / constant /
  shared type.
- **Typed.** No `any`, no `as unknown as …`, no `unwrap()` / `expect()` in
  non-test Rust.
- **i18n + a11y safe.** No hard-coded English; no bare clickable `<div>`.
- **CI green locally.** `npm run format && npm run lint -- --max-warnings 0
&& npm run check && npm run test` before opening a PR (plus
  `./scripts/lint.rust.sh` etc. when Rust files change).
- **Meta-update rule.** When you introduce a new pattern, shared component,
  or workflow, update the corresponding page under `docs/ai/**` in the same
  PR. See
  [`docs/ai/governance.md#meta-update-rule`](../docs/ai/governance.md#meta-update-rule).

## Forbidden in suggestions

- Hard-coded English in user-visible text — use `$i18n.*` from
  `$lib/stores/i18n.store`.
- `console.error` / `console.warn` — use `consoleError` / `consoleWarn` from
  `$lib/utils/console.utils` (eslint enforces).
- Bare `0n` literal — use the shared `ZERO` constant (eslint enforces).
- Relative imports across `src/frontend/src/` — use the path aliases.
- `std::print` / `std::println` / `std::eprint*` in Rust — use `ic_cdk`
  equivalents (clippy enforces).
- Editing generated files: `src/declarations/**`, `src/frontend/src/lib/types/i18n.d.ts`,
  generated tokens JSON.

## Where to find more

Everything else lives under [`docs/ai/`](../docs/ai/). Start at
[`AGENTS.md`](../AGENTS.md) and follow the links from there.
