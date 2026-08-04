# Governance

This page defines what agents may, should, and must not do. It applies to
every agent (Claude Code, Cursor, Copilot, Codex, Aider, opencode, …).

## Truth hierarchy

When two sources disagree, the higher one wins:

1. **The code** (`src/**`) — current state of reality.
2. **CI workflows** (`.github/workflows/**`) — non-negotiable gates that
   must be green to merge.
3. **CODEOWNERS** ([`.github/CODEOWNERS`](../../.github/CODEOWNERS)) —
   defines who must approve each path.
4. **This file + sibling pages under `docs/ai/`** — policy.
5. [`AGENTS.md`](../../AGENTS.md) — universal entry, points at the above.
6. **Tool-specific layers** (`CLAUDE.md`, `.cursor/rules/`,
   `.github/copilot-instructions.md`). These never contradict 1–5.

If an agent finds a contradiction, the agent **stops and asks** instead of
guessing.

## Roles

You can play any of these roles in a single session — most non-trivial PRs
involve all three, in order. Keep them mentally separated.

### Planner

Decompose the task. Surface trade-offs in plain text _before_ editing files.
For anything > ~50 changed lines or touching > 3 files, write a short
bullet plan and confirm scope with the human.

### Implementer

Execute the plan with **targeted edits**. Strictly follow:

- [`frontend/structure.md`](./frontend/structure.md) and
  [`frontend/stack-and-patterns.md`](./frontend/stack-and-patterns.md) for FE.
- [`backend/structure.md`](./backend/structure.md) and
  [`backend/patterns.md`](./backend/patterns.md) for BE.

Run the local quality gates from [`pr-and-ci.md`](./pr-and-ci.md) before
declaring done.

### Reviewer

Before opening / merging, self-review against:

- [10 commandments](../../AGENTS.md#2-the-10-commandments-read-before-every-change)
- [PR conventions](./pr-and-ci.md)
- [Reusability catalog](./frontend/reusability.md) — flag duplication you
  re-introduced.
- [i18n + a11y rules](./frontend/i18n-and-a11y.md).

## Boundaries

These paths are **protected**. Agents may read them, but must not modify
them without an explicit ask in the user prompt.

| Path                                                                                                | Reason                                                                                                                                                                                                                             | Owner           |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `.github/workflows/**`                                                                              | CI integrity — only `ci(...)` PRs touch these.                                                                                                                                                                                     | `@dfinity/oisy` |
| `.github/CODEOWNERS`, `.github/actions/**`, `.github/repo_policies/`                                | Review routing & bot policy.                                                                                                                                                                                                       | `@dfinity/oisy` |
| `package.json` (deps), `package-lock.json`                                                          | New dependencies require explicit approval. Lockfile is also linted by CI.                                                                                                                                                         | `@dfinity/oisy` |
| `Cargo.toml` (root), `Cargo.lock`, `rust-toolchain.toml`                                            | Workspace deps — `lint.cargo-workspace-dependencies.sh` enforces workspace routing.                                                                                                                                                | `@dfinity/oisy` |
| `dfx.json`, `canister_ids.json`, `canister_e2e_ids.json`                                            | Network / canister wiring.                                                                                                                                                                                                         | `@dfinity/oisy` |
| `clippy.toml`, `rustfmt.toml`, `eslint.config.mjs`, `.prettierrc`                                   | Lint / format policy.                                                                                                                                                                                                              | `@dfinity/oisy` |
| `Dockerfile*`, `docker/`, `scripts/build.*`, `scripts/setup*`                                       | Reproducible-build pipeline.                                                                                                                                                                                                       | `@dfinity/oisy` |
| `src/declarations/**`                                                                               | **Generated** by `npm run generate` from `backend.did`.                                                                                                                                                                            | —               |
| `src/frontend/src/lib/types/i18n.d.ts`                                                              | **Generated** by `npm run i18n` from `lib/i18n/en.json`.                                                                                                                                                                           | —               |
| `src/frontend/src/lib/i18n/{ar,cs,de,es,fr,hi,it,ja,ko-KR,pl,pt,ru,vi,zh-CN}.json`                  | **Structurally synced** from `en.json` by the `auto-update-i18n` workflow (no translation — existing values preserved). Don't author translations unprompted; see [`frontend/i18n-and-a11y.md`](./frontend/i18n-and-a11y.md#i18n). | —               |
| `src/frontend/src/env/tokens/tokens.{sns,ckerc20,icrc,ext}.json` and `tokens-ext/`, `tokens-erc20/` | **Generated** by `build:tokens-*` and the `update-tokens` workflow.                                                                                                                                                                | —               |
| `e2e/**/*.png`                                                                                      | E2E snapshots — regenerated by the `update-snapshots` workflow.                                                                                                                                                                    | —               |
| `signer-versions.json`, `coverage/`                                                                 | Tracked artifacts updated by automation.                                                                                                                                                                                           | —               |
| `canbench_results.yml`                                                                              | **Manually regenerated** by `npm run benchmark` and committed — no automation updates it; see [`backend/testing.md`](./backend/testing.md#benchmarks--canbench).                                                                   | —               |
| `node_modules/`, `target/`, `.svelte-kit/`, `build/`, `out/`, `.dfx/`                               | Build output. Never commit.                                                                                                                                                                                                        | —               |

If a change must touch a protected path, call it out explicitly in the PR
description and ping the relevant CODEOWNERS team.

[`.github/repo_policies/BOT_APPROVED_FILES`](../../.github/repo_policies/BOT_APPROVED_FILES)
lists paths bots may touch in automated PRs (snapshots, generated icons,
lockfiles, …). Treat that file as authoritative for bot-context PRs.

## Capabilities — quick reference

### Allowed without prompting

- Edit any file under `src/frontend/src/{btc,eth,evm,icp,sol,icp-eth,lib,routes,env,tests}/**`
  (except generated files).
- Edit any Rust file under `src/backend/src/**` and `src/shared/src/**`,
  except types whose change affects `backend.did` (then follow the
  [breaking-interface workflow](./backend/workflows/breaking-interface.md)).
- Add files inside the existing folder taxonomy
  ([FE structure](./frontend/structure.md),
  [BE structure](./backend/structure.md)).
- Run `npm run format`, `npm run lint`, `npm run check`, `npm run test`,
  `npm run i18n`, `npm run generate`, the `./scripts/lint.*.sh` and
  `./scripts/format.*.sh` scripts, and `./scripts/test.backend.sh`.
- Update these `docs/ai/**` pages when the meta-update rule fires.

### Forbidden without explicit prompt

- Add a new dependency (npm or Cargo) or upgrade one.
- Add a new top-level folder under `src/frontend/src/` or `src/backend/src/`.
- Edit any path in the [Boundaries](#boundaries) table.
- Disable an ESLint rule, suppress a `svelte-check` warning, add a
  `#[allow(...)]` to silence clippy, or use `any` / `as unknown as …` /
  `unwrap()` to bypass a type / error.
- Skip / `.skip()` / `.todo()` / `#[ignore]` an existing test.
- `git push --force`, amend a pushed commit, rebase to "tidy history", or
  rewrite shared history. "Explicit prompt" means the user names the
  operation directly — any unambiguous phrasing works (e.g.
  "force-push", "force push", "push --force", "push -f", "amend",
  "git commit --amend", "rebase", "git rebase", "rewrite history").
  Task-level delegation like "do what you think is best" or "do what's
  most correct" does **NOT** count. See
  [`docs/ai/pr-and-ci.md#7-updating-an-existing-pr`](./pr-and-ci.md#7-updating-an-existing-pr).
- Commit secrets, `.env*` (other than `.env.example` /
  `.env.backend.example`), or large binaries.
- Touch the public Candid interface (`src/backend/backend.did`) without
  following the [breaking-interface workflow](./backend/workflows/breaking-interface.md).

## Meta-update rule

> If a PR introduces a new pattern, new shared component, new shared type,
> new naming convention, new policy, or a new workflow, the PR **MUST**
> also update the relevant page under `docs/ai/**` so the next agent picks
> it up.

How:

1. Identify which page describes the area you changed:
   - Folder taxonomy → `frontend/structure.md` or `backend/structure.md`.
   - New shared component / util / service → `frontend/reusability.md`.
   - New Rust pattern / shared type → `backend/patterns.md`.
   - New test pattern → `frontend/testing.md` or `backend/testing.md`.
   - New PR / CI rule → `pr-and-ci.md`.
   - New policy / boundary → this file.
   - New workflow → add a page under `frontend/workflows/` or
     `backend/workflows/`.
2. Edit that page in the same PR with the smallest possible delta — add a
   bullet, add a row, swap a code sample.
3. Mention the doc update in the PR body under `# Changes`.
4. If the change is structural enough that the existing taxonomy stops
   making sense, open a separate **doc-only** PR first:
   `docs(ai): <reshape>` — and land it before the code PR.

This is what makes the docs _auto-adapting_: every PR is a small
opportunity to keep them honest. Reviewers should reject code PRs that
introduce a new pattern without the matching doc update.

## Agent-rules sync

Some agents (notably Copilot's PR reviewer) load only their tool-specific
entry file — they don't traverse the `docs/ai/**` link graph. That breaks
the truth hierarchy in practice: a rule documented in
`docs/ai/frontend/stack-and-patterns.md` never reaches them, so they
suggest changes that contradict it (e.g. proposing Tailwind v3 `!mb-6`
when v4 uses `mb-6!`).

To bridge the gap without duplicating rules by hand, **bug-catching
highlights** are sourced from tagged blocks inside `docs/ai/**` (and
`AGENTS.md`) and synced into the tool-specific entry files by
[`scripts/build.agent-rules.mjs`](../../scripts/build.agent-rules.mjs).
The sync is gated by
[`.github/workflows/agent-rules-check.yml`](../../.github/workflows/agent-rules-check.yml).

### Marker convention

Wrap a single bullet or paragraph in the source page:

```markdown
<!-- agent-rules:start id="tailwind-v4-important" -->

- Important modifier is a suffix in v4: write `mb-6!`, not `!mb-6`.

<!-- agent-rules:end -->
```

`id` must be unique across the whole source set.

### Adding a highlight

1. Wrap the block in the appropriate `docs/ai/**` page.
2. Add the `id` to the `blockIds` list of the relevant destination in
   `scripts/build.agent-rules.mjs` (`DESTINATIONS`).
3. Run `node scripts/build.agent-rules.mjs` and commit the regenerated
   destination file alongside the source change.

### What belongs in the highlights

Only **version-sensitive syntax** or **forbidden-pattern overrides** that
the tool's training prior gets wrong and that no other gate (lint,
clippy, `svelte-check`) catches. Architectural / structural guidance
stays link-only — the tools that crawl will see it; the ones that don't
weren't going to follow nuanced taxonomy anyway.
