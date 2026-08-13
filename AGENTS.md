# AGENTS.md

Canonical entry point for **all** AI coding agents working in this repository
(Claude Code, Cursor, OpenAI Codex / GPT, Aider, GitHub Copilot, Continue,
opencode, …). If your tool reads `AGENTS.md` automatically, this is the right
file. If it doesn't, point it here.

> **Read this first. Always.** It is short on purpose. Everything deeper lives
> under [`docs/ai/`](./docs/ai/) and is linked below.

---

## 1. What this repo is

`dfinity/oisy-wallet` is a multi-chain crypto wallet running entirely on the
Internet Computer. Stack and dependencies are discoverable from `package.json`
and `Cargo.toml`. The non-obvious bits:

- **AI-active areas (ship with little to no human review):** `src/frontend/`,
  `src/backend/`, `src/shared/`. CI gates and CODEOWNERS still apply.
- **Do not hand-edit:** `src/declarations/` (regenerate via `npm run generate`).
- **Restricted (ask before changing):** `scripts/`, `.github/workflows/`,
  `dfx.json`, `Dockerfile*`.
- **E2E (`e2e/`) is maintenance-only** — do not add new Playwright specs by
  default. See [`docs/ai/frontend/testing.md#e2e-status-temporarily-restricted`](./docs/ai/frontend/testing.md#e2e-status-temporarily-restricted).
- **Benchmarks** (`src/backend/src/benchmark.rs`, `canbench.yml`) are
  lightly maintained — update when touching hot paths. See
  [`docs/ai/backend/testing.md#benchmarks--canbench`](./docs/ai/backend/testing.md#benchmarks--canbench).

---

## 2. The 10 commandments (read before every change)

1. **Always idiomatic.** Use the conventions of the surrounding code (this
   repo's style), not the ones from your training data.
2. **Always atomic.** One logical change per PR. No drive-by refactors. No
   "while I'm here" edits.
3. **Always small.** Prefer 5 small PRs over 1 big PR. Recent merged history
   is the model: `feat(frontend): expose newUserSignupsAllowed backend method`,
   `refactor(frontend): extract AiAssistantChat component`.
4. **Always reusable.** Before adding a new component / util / constant /
   service / shared type, search for an existing one. Extend the catalog in
   [`docs/ai/frontend/reusability.md`](./docs/ai/frontend/reusability.md)
   or [`docs/ai/backend/patterns.md`](./docs/ai/backend/patterns.md) instead
   of duplicating.
5. **Always typed.** No `any`, no `as unknown as …`, no ignored `svelte-check`
   warnings. In Rust: no `unwrap()` / `expect()` in non-test code; explicit
   error types.
6. **Always i18n + a11y safe (FE).** No hard-coded English. No bare clickable
   `<div>`s. See [`docs/ai/frontend/i18n-and-a11y.md`](./docs/ai/frontend/i18n-and-a11y.md).
7. **Respect the structure.** New code goes in the chain folder + bucket that
   already owns that concern (`$lib`, `$btc`, `$eth`, `$evm`, `$icp`, `$sol`,
   `$icp-eth`, `$env` for the FE; `src/backend/src/{api,state,types,…}` and
   `src/shared/src/types/` for the BE). See
   [`docs/ai/frontend/structure.md`](./docs/ai/frontend/structure.md) and
   [`docs/ai/backend/structure.md`](./docs/ai/backend/structure.md).
8. **Respect CI.** Run the local gates from
   [`docs/ai/pr-and-ci.md`](./docs/ai/pr-and-ci.md#local-quality-gates)
   before opening a PR.
9. **Respect the PR conventions.** Title is enforced by CI:
   `verb(scope): description`. Body must include `# Motivation`, `# Changes`,
   `# Tests` (template at [`.github/pull_request_template.md`](./.github/pull_request_template.md)).
   No Jira / Atlassian links — CI rejects them.
10. **Don't overengineer.** A 10x engineer ships the smallest correct change.
    No new abstractions unless they remove duplication that already exists.
    No new dependencies without explicit user approval.

---

## 3. Where to look (frontend)

| You're about to…                              | Read first                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Open any PR                                   | [`docs/ai/pr-and-ci.md`](./docs/ai/pr-and-ci.md)                                                             |
| Touch any frontend file                       | [`docs/ai/frontend/README.md`](./docs/ai/frontend/README.md)                                                 |
| Add or move a file                            | [`docs/ai/frontend/structure.md`](./docs/ai/frontend/structure.md)                                           |
| Write Svelte 5 / runes / stores / TS          | [`docs/ai/frontend/stack-and-patterns.md`](./docs/ai/frontend/stack-and-patterns.md)                         |
| Add UI                                        | [`docs/ai/frontend/reusability.md`](./docs/ai/frontend/reusability.md)                                       |
| Add user-visible text or interactive elements | [`docs/ai/frontend/i18n-and-a11y.md`](./docs/ai/frontend/i18n-and-a11y.md)                                   |
| Write copy, pick a colour, or add an icon     | [`docs/ai/frontend/brand-and-copy.md`](./docs/ai/frontend/brand-and-copy.md)                                 |
| Add a Svelte component                        | [`docs/ai/frontend/workflows/new-component.md`](./docs/ai/frontend/workflows/new-component.md)               |
| Add an API call / service / store             | [`docs/ai/frontend/workflows/new-service.md`](./docs/ai/frontend/workflows/new-service.md)                   |
| Split / refactor a component                  | [`docs/ai/frontend/workflows/refactor-split.md`](./docs/ai/frontend/workflows/refactor-split.md)             |
| Add an i18n key                               | [`docs/ai/frontend/workflows/add-i18n-key.md`](./docs/ai/frontend/workflows/add-i18n-key.md)                 |
| Add a token / network                         | [`docs/ai/frontend/workflows/new-token-or-network.md`](./docs/ai/frontend/workflows/new-token-or-network.md) |
| Add or change tests                           | [`docs/ai/frontend/testing.md`](./docs/ai/frontend/testing.md)                                               |
| Add or change an analytics / tracking event   | [`docs/ai/frontend/analytics.md`](./docs/ai/frontend/analytics.md)                                           |

---

## 4. Where to look (backend)

| You're about to…                          | Read first                                                                                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Touch any Rust file                       | [`docs/ai/backend/README.md`](./docs/ai/backend/README.md)                                                 |
| Add a module / file                       | [`docs/ai/backend/structure.md`](./docs/ai/backend/structure.md)                                           |
| Write Rust idioms / state access / errors | [`docs/ai/backend/patterns.md`](./docs/ai/backend/patterns.md)                                             |
| Add a new endpoint                        | [`docs/ai/backend/workflows/new-endpoint.md`](./docs/ai/backend/workflows/new-endpoint.md)                 |
| Change `backend.did` / break the API      | [`docs/ai/backend/workflows/breaking-interface.md`](./docs/ai/backend/workflows/breaking-interface.md)     |
| Touch persisted state / stable structures | [`docs/ai/backend/workflows/state-and-migrations.md`](./docs/ai/backend/workflows/state-and-migrations.md) |
| Add or change tests                       | [`docs/ai/backend/testing.md`](./docs/ai/backend/testing.md)                                               |

---

## 5. Governance & meta

- **Truth hierarchy** (highest wins on conflict):
  1. **Code** (`src/**`) — current state of the world.
  2. **CI** (`.github/workflows/**`) — non-negotiable checks.
  3. **CODEOWNERS** ([`.github/CODEOWNERS`](./.github/CODEOWNERS)) — review routing.
  4. [`docs/ai/governance.md`](./docs/ai/governance.md) — policies & boundaries.
  5. This file (`AGENTS.md`) — universal entry.
  6. Tool-specific layers (`CLAUDE.md`, `.cursor/rules/`,
     `.github/copilot-instructions.md`) — never contradict the above.
- **Auto-adapting docs.** When a PR introduces a new pattern, convention,
  shared component, shared type, workflow, or policy, the agent **MUST**
  update the relevant `docs/ai/**` file in the same PR. See
  [`docs/ai/governance.md#meta-update-rule`](./docs/ai/governance.md#meta-update-rule).

---

## 6. Tool-specific entry points

These are thin layers on top of this file. They never contradict it.

- **Claude Code / Anthropic:** [`CLAUDE.md`](./CLAUDE.md)
- **Cursor:** [`.cursor/rules/`](./.cursor/rules/)
- **GitHub Copilot:** [`.github/copilot-instructions.md`](./.github/copilot-instructions.md)
- **OpenAI Codex / Aider / opencode / Continue / …:** read this file (`AGENTS.md`).

If you add a new agent / tool, add a tiny pointer file (≤ 30 lines) here that
references this `AGENTS.md` — do **not** duplicate the rules.
