# CLAUDE.md

Claude-specific runtime layer. Anything not contradicted here defers to
[`AGENTS.md`](./AGENTS.md), which is the canonical entry for **all** agents.

> **Mandatory first step:** read [`AGENTS.md`](./AGENTS.md). Then read the
> matching area README before touching code:
>
> - Frontend → [`docs/ai/frontend/README.md`](./docs/ai/frontend/README.md)
> - Backend → [`docs/ai/backend/README.md`](./docs/ai/backend/README.md)

---

## Reasoning preferences

- **Plan briefly, then act.** For non-trivial work (>1 file or >50 lines), lay
  out a 3–6 step plan in plain text before editing files. Keep it tight.
- **Targeted edits.** Use `StrReplace` / `EditNotebook`-style precise edits.
  Never rewrite an entire file when 5 lines change.
- **Explore in parallel.** Batch independent reads / greps / globs in a single
  tool turn. Don't serialize what can be parallel.
- **Stop and ask** if a request is ambiguous about scope, atomicity, or
  policy — better one extra question than a sprawling PR. Especially before:
  - Adding a new dependency (npm or Cargo).
  - Adding a new top-level folder.
  - Touching `backend.did`, generated `declarations/`, or stable state.

---

## Workflows

### Spec-driven development

oisy has a spec-driven development workflow for new features,
improvements, and bugfixes — see
[`docs/ai/spec-driven-development/workflow.md`](./docs/ai/spec-driven-development/workflow.md).
A spec is authored in Cowork first, then implemented in Claude Code on
a branch / PR.

**Always ask before using it.** When the user describes a feature,
improvement, or bugfix without naming the workflow, acknowledge that the
workflow exists and ask whether to use it. Only follow the workflow
after the user agrees. If they decline (or the change is clearly too
small to warrant a spec, e.g. a one-line typo), implement directly —
still following the rest of CLAUDE.md and AGENTS.md.

---

## Coding rules (Claude-specific addenda)

These are on top of the [10 commandments](./AGENTS.md#2-the-10-commandments-read-before-every-change):

- **Read before edit.** Always read a file (or its relevant range) at least
  once before modifying it. The `Read` / `Grep` tools are cheap.
- **Run quality gates.** Before declaring done, run from the repo root:

  ```bash
  # Frontend
  npm run format
  npm run lint -- --max-warnings 0
  npm run check
  npm run test

  # Backend (only if Rust files changed)
  ./scripts/format.sh
  ./scripts/lint.rust.sh
  ./scripts/lint.did.sh
  ./scripts/test.backend.sh   # heavy — see docs/ai/backend/testing.md
  ```

  Fix everything you broke. Don't leave broken state for the human.

- **Reuse over rebuild.** Before creating a new `.svelte` / `.utils.ts` /
  `.constants.ts` / Rust module, search for an existing one. See
  [`docs/ai/frontend/reusability.md`](./docs/ai/frontend/reusability.md) and
  [`docs/ai/backend/patterns.md`](./docs/ai/backend/patterns.md).
- **No new dependencies** without explicit user approval (npm or Cargo).
- **No new top-level folders** under `src/frontend/src/` or `src/backend/src/`.
  The taxonomies in
  [`docs/ai/frontend/structure.md`](./docs/ai/frontend/structure.md) and
  [`docs/ai/backend/structure.md`](./docs/ai/backend/structure.md) are closed;
  surface a question instead of inventing a bucket.
- **Comments are for _why_, not _what_.** No narrating comments
  ("// fetch the user"). Only write a comment if it captures intent,
  trade-off, or an invariant the code can't express.
- **Never bypass the eslint / clippy disallowed-rule lists.** They encode
  hard policy (e.g. `console.error` → `consoleError`, `0n` → `ZERO`,
  `std::print*` → `ic_cdk::print*`). See
  [`eslint.config.mjs`](./eslint.config.mjs) and
  [`clippy.toml`](./clippy.toml).
- **Never push force / amend pushed commits / rewrite shared history.** Add
  a new commit instead. Approval of a broader task (e.g. "do what you
  think is best", "make the most correct one", "do it your way") is
  **NOT** approval to force-push — the user must name the operation
  directly using any unambiguous phrasing (e.g. "force-push", "force
  push", "push --force", "push -f", "amend", "git commit --amend",
  "rebase", "git rebase", "rewrite history"), or pick a multi-choice
  option whose label contains one of those phrases. When in doubt, add
  a new commit. See
  [`docs/ai/pr-and-ci.md#7-updating-an-existing-pr`](./docs/ai/pr-and-ci.md#7-updating-an-existing-pr).

---

## Tool-use cheatsheet

| Goal                          | Use                                         |
| ----------------------------- | ------------------------------------------- |
| Find files by name            | `Glob`                                      |
| Find code by exact text/regex | `Grep` (prefer over shell `rg`)             |
| Find code by meaning          | `SemanticSearch`                            |
| Read a file                   | `Read` (NOT `cat` / `head` / `tail`)        |
| Edit a file                   | `StrReplace` (NOT `sed` / `awk` / heredocs) |
| Run a one-shot command        | `Shell`                                     |
| Multi-step exploration        | `Task` with `subagent_type: "explore"`      |

---

## Coordination

- For role-based collaboration with other agents (planner / implementer /
  reviewer), follow [`docs/ai/governance.md`](./docs/ai/governance.md).
- For PR title, scope, body and CI gates, follow
  [`docs/ai/pr-and-ci.md`](./docs/ai/pr-and-ci.md).
- For meta-updates (changing the rules themselves), follow the
  [meta-update rule](./docs/ai/governance.md#meta-update-rule).
