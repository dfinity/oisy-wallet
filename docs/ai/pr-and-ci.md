# PR & CI

Everything an agent needs to open a green PR.

## 1. PR title — enforced by CI

The `check-pr-title` job in
[`.github/workflows/pr-checks.yml`](../../.github/workflows/pr-checks.yml)
enforces a [Conventional Commits](https://www.conventionalcommits.org/)
title. The exact regex (do not memorize from training data — read CI):

```
^(feat|fix|chore|build|ci|docs|style|refactor|perf|test)(\([-a-zA-Z0-9,]+\))!?:
```

Examples that pass (taken from recent merged history):

- `feat(frontend): expose newUserSignupsAllowed backend method`
- `feat(frontend): improve UTXO selection to smallest-sufficient greedy algorithm`
- `fix(frontend): correct error ordering in assertCkEthAmount when amount is below ledger fee`
- `refactor(frontend): extract AiAssistantChat component`
- `chore(frontend): Update llm files`
- `feat(backend)!: Add rate limiter to cycle-sensitive methods` ← `!` marks a breaking change
- `feat(backend): Add /status endpoint for signup-rate monitoring`
- `chore(release): v2.0.5`
- `test(frontend): Update Vitest coverage thresholds`
- `chore(e2e): Update Playwright E2E Snapshots`
- `docs(readme): add Ops section and table of contents`
- `chore(npm-deps-dev): bump @tailwindcss/postcss from 4.2.1 to 4.2.2`

### Verbs

| verb       | when                                                         |
| ---------- | ------------------------------------------------------------ |
| `feat`     | new user-visible feature                                     |
| `fix`      | bug fix                                                      |
| `refactor` | internal change with no behaviour change                     |
| `style`    | visual/CSS only — no logic change                            |
| `perf`     | performance improvement                                      |
| `docs`     | docs only (incl. `docs/ai/**`, `README.md`, `HACKING.md`, …) |
| `test`     | tests only                                                   |
| `chore`    | misc maintenance (release bumps, dependency hygiene, …)      |
| `build`    | build system / packaging                                     |
| `ci`       | CI workflows / actions                                       |

### Scope

Single word or comma-separated list of affected areas. Use the existing
vocabulary so it shows up grouped in changelogs.

Common scopes used in this repo (from history):

- `frontend`, `backend`, `e2e`, `ci`, `devops`, `build`, `release`,
  `npm-deps-dev`, `npm-deps`, `readme`, `ai` (for these AI docs).

If you introduce a new scope, keep it short and lowercase, no spaces.

## 2. PR body — template

Honor [`.github/pull_request_template.md`](../../.github/pull_request_template.md):

```markdown
# Motivation

<!-- Describe the motivation that lead to the PR -->

# Changes

<!-- List the changes that have been developed -->

# Tests

<!-- Please provide any information or screenshots about the tests that have been done -->
```

Rules:

- **All three sections are required.** Don't leave them empty. Even tiny PRs
  benefit from one bullet per section.
- **Atomicity statement** if the PR touches more than one logical thing —
  add a one-liner explaining why they belong together. If you can't, split.
- **Mention `docs/ai/` updates** under `# Changes` whenever the
  meta-update rule fired.
- **No Jira / Atlassian links.** The `check-pr-description` job rejects any
  URL matching `*.atlassian.*` or `*.jira.*`. Reference internal trackers
  by ID or text only (e.g. "GIX-1234" without a URL).
- **Screenshots are welcome** for visual changes — link them; don't paste
  giant base64 in the body.
- **Breaking-interface PRs** (anything that changes `src/backend/backend.did`)
  must include a `BREAKING CHANGE:` line in the body and `!` in the title.
  See
  [`backend/workflows/breaking-interface.md`](./backend/workflows/breaking-interface.md).

## 3. Atomicity

One logical change per PR. If you catch yourself writing
"and also" / "while I was here" / "I noticed that" in the body, split.

| Anti-pattern                                | Do this instead                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| "Add feature X and rename old component"    | PR 1: `refactor: rename`. PR 2: `feat: X`.                             |
| "Fix bug Y and update unrelated typography" | Two PRs.                                                               |
| "Refactor 5 components into shared `Foo`"   | PR 1: introduce `Foo` + migrate 1 caller. PR 2..N: migrate the others. |
| "New endpoint + add it to the FE"           | Usually two PRs (BE first, FE second). One if both are very small.     |

## 4. Local quality gates

From the repo root, before opening the PR:

```bash
# Frontend (always)
npm run format
npm run lint -- --max-warnings 0
npm run check        # svelte-check, fail-on-warnings
npm run test         # vitest (single shard locally)

# i18n (only if you edited en.json)
npm run i18n

# Bindings (only if you changed backend.did or Rust public API)
npm run generate     # wraps ./scripts/did.sh + scripts/generate.sh

# Backend (only if you edited Rust)
./scripts/format.sh                                # rustfmt + cargo-sort + shfmt
./scripts/lint.rust.sh                             # clippy (wasm32 + native + tests + benches)
./scripts/lint.did.sh                              # candid lint
./scripts/lint.cargo-workspace-dependencies.sh     # workspace deps only
./scripts/test.backend.sh                          # heavy: pocket-ic integration tests

# Benchmarks (only if you touched a hot path on a user-scaling collection)
npm run benchmark                                  # canbench --persist --show-summary
                                                   # commit the regenerated canbench_results.yml
                                                   # see backend/testing.md#benchmarks--canbench

# Lockfile
npm run lint:lockfile
```

Tip: the `format` job in `frontend-checks.yml` will auto-commit prettier
fixes on non-fork PRs, but you should still run `npm run format` locally to
keep diffs reviewable.

## 5. CI jobs you must keep green

| Workflow                                                     | Job(s)                   | What it runs                                                                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pr-checks.yml`                                              | `check-pr-title`         | Title regex from §1.                                                                                                                                                                                                 |
| `pr-checks.yml`                                              | `check-pr-description`   | No Jira / Atlassian URLs.                                                                                                                                                                                            |
| `pr-checks.yml`                                              | `check-empty-pr`         | At least one changed file.                                                                                                                                                                                           |
| `frontend-checks.yml`                                        | `format`                 | `npm run format` (+ auto-commits on non-fork PRs).                                                                                                                                                                   |
| `frontend-checks.yml`                                        | `lint`                   | `npm run lint -- --max-warnings 0`.                                                                                                                                                                                  |
| `frontend-checks.yml`                                        | `check`                  | `npm run check` + `npm run check:tests`.                                                                                                                                                                             |
| `frontend-checks.yml`                                        | `test` (20 shards)       | `npm run test:coverage --shard=N/20`.                                                                                                                                                                                |
| `frontend-checks.yml`                                        | `test-coverage`          | Merges shard reports.                                                                                                                                                                                                |
| `frontend-checks.yml`                                        | `config`                 | IC-domain validation across networks.                                                                                                                                                                                |
| `frontend-checks.yml`                                        | `lockfile`               | `npm run lint:lockfile`.                                                                                                                                                                                             |
| `backend-checks.yml`                                         | `lint`                   | `./scripts/lint.rust.sh` + `./scripts/lint.did.sh` (only when Rust changed).                                                                                                                                         |
| `backend-checks.yml`                                         | `workspace-dependencies` | All deps go through the workspace.                                                                                                                                                                                   |
| `backend-tests.yml`                                          | `tests`                  | Pocket-IC integration tests (`./scripts/test.backend.sh`).                                                                                                                                                           |
| `backend-tests.yml`                                          | `breaking-interface`     | Refuses `.did` changes without `!:` + `BREAKING CHANGE:` markers.                                                                                                                                                    |
| `formatting-checks.yml`                                      | `format`                 | Rust + shell formatting (auto-commits on non-fork PRs).                                                                                                                                                              |
| `e2e-tests.yml`                                              | various                  | Playwright (full run gated by `run-e2e-snapshots` label / nightly cron). The suite is currently in **maintenance-only** mode — see [`frontend/testing.md`](./frontend/testing.md#e2e-status-temporarily-restricted). |
| `frontend-bundle-check.yml`                                  | bundle size              | Tracks built FE size.                                                                                                                                                                                                |
| `frontend-reproducibility.yaml`                              | reproducible build       | The IC asset canister build is deterministic.                                                                                                                                                                        |
| `frontend-remove-unused-components.yml`                      | unused-svelte            | Periodically opens PRs to remove orphans.                                                                                                                                                                            |
| `auto-update-i18n.yml`                                       | translations             | Regenerates non-`en` locales from `en.json`.                                                                                                                                                                         |
| `update-tokens.yml`                                          | tokens                   | Periodically refreshes `env/tokens/tokens.*.json`.                                                                                                                                                                   |
| `repo-checks.yml`, `devops-checks.yml`, `binding-checks.yml` | auxiliary                | Repo policy + bindings drift.                                                                                                                                                                                        |

If your change is not user-facing (e.g. only `docs/`), the path filters in
`.github/actions/check-{frontend,backend}-changes` will skip the matching
job — that's expected.

## 6. After CI fails

- **`check-pr-title` failed** → rename the PR to match §1.
- **`check-pr-description` failed** → remove the Jira / Atlassian URL.
- **`format` job pushed a formatting commit** → pull, you're fine.
- **`lint` failed** → run `npm run lint -- --max-warnings 0` locally and
  address what's left manually. Never silence with `// eslint-disable`
  unless you can justify it in code review.
- **`check` failed** → fix `svelte-check` errors. No `// @ts-ignore`,
  no `as any`, no `as unknown as …`.
- **`test` failed** → reproduce locally (the failing shard tells you
  which file). Never commit a `.skip` to bypass.
- **`backend-checks / lint`** → run `./scripts/lint.rust.sh` and fix.
- **`backend-tests / breaking-interface`** → mark the PR breaking (`!:` +
  `BREAKING CHANGE:`) or revert the `.did` change. See
  [`backend/workflows/breaking-interface.md`](./backend/workflows/breaking-interface.md).
- **`workspace-dependencies`** → move the dep into the root `Cargo.toml`
  workspace and reference it as `pkg.workspace = true`.
- **`config`** → IC domain validation; usually means a CSP / domain change
  was missed. See
  [`scripts/build.csp.mjs`](../../scripts/build.csp.mjs).

## 7. Updating an existing PR

- **Add commits.** Never `git push --force` to a PR branch. Don't
  `git commit --amend` after pushing. Don't rebase a PR onto `main` to
  "tidy history" — let the merge group handle it.
- The only exception is when the user explicitly asks for a force-push or
  history rewrite (e.g. to remove an accidentally-committed secret — and
  even then, also rotate the secret).
- If you need to drop a commit, push a new revert commit instead.

## 8. CODEOWNERS auto-routing

[`.github/CODEOWNERS`](../../.github/CODEOWNERS) routes reviews. Currently
the entire repo is owned by `@dfinity/oisy`. Agents do not assign
reviewers — the file does it.

## 9. Release flow (informational)

Releases are tagged via the `tag-release.yml` and `bump-version.yml`
workflows; the legacy signer has its own `bump-legacy-signer-version.yml`
and `tag-legacy-signer-release.yml`. Don't bump versions or edit
`signer-versions.json` manually.
