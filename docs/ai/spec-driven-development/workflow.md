# Oisy Wallet — Spec-Driven Development Workflow

## Overview

This workflow uses **Cowork** for specification and **Claude Code** for implementation, with specs stored directly in the repository so they serve as durable, version-controlled context for every build.

---

## Repository Structure

```
dfinity/oisy-wallet/
├── .claude/
│   └── CLAUDE.md              # Instructions for Claude Code (references PRODUCT.md and specs/)
└── docs/
    └── ai/
        ├── PRODUCT.md         # Living description of all current product behaviors
        └── spec-driven-development/
            ├── workflow.md    # This document
            └── specs/
                ├── add-token-swapping.md
                ├── fix-wallet-sync-race.md
                └── ...
```

---

## The Workflow

### Step 1 — Describe (Cowork)

Open a new Cowork session and say:

> "I want to spec a new feature for dfinity/oisy-wallet using the spec-driven development workflow in `docs/ai/spec-driven-development/workflow.md`."

Cowork will read the workflow from the repo and guide you through the process. You describe the feature, improvement, or bugfix — no need to be precise, rough intent is enough to start.

### Step 2 — Clarify (Cowork)

We work through open questions together: scope, edge cases, constraints, acceptance criteria. Cowork has access to the web and can search existing GitHub issues or docs for context.

### Step 3 — Spec (Cowork → You)

Cowork produces a spec file. You copy it into `docs/ai/spec-driven-development/specs/` in your local repo. The spec is intentionally written for Claude Code — it references real file paths, component names, and existing patterns where possible.

### Step 4 — Build (Claude Code)

Open Claude Code in the oisy-wallet repo and say:

> "Implement `docs/ai/spec-driven-development/specs/your-spec.md`"

Claude Code reads the spec, reads `docs/ai/PRODUCT.md` for system context, and begins building. It has the GitHub MCP configured and can open PRs, create branches, and interact with issues directly.

### Step 5 — Adjust (Claude Code ↔ Spec)

If the implementation reveals gaps or the spec needs updating, the spec is the source of truth — keep it in sync with reality.

**Fix it in Code directly** if it's a small gap — a missing edge case, an unclear description, a file path that turned out to be wrong. Code can edit the spec file itself as it works.

**Come back to Cowork** if the gap reveals a deeper ambiguity — something that requires rethinking scope, resolving a product question, or deciding between approaches. Cowork is better for that dialogue, and the updated spec should reflect the decision before Code continues.

### Step 6 — Merge & Update (Claude Code)

After the PR merges, update `docs/ai/PRODUCT.md` to reflect the new behavior. This keeps the product spec accurate for all future builds.

---

## Improvements Over a Basic Workflow

### Ground specs in real code

Before finalizing a spec, Claude Code (or Cowork via search) scans the codebase to reference actual file paths, component names, and existing patterns. Specs that mention `src/lib/components/TokenList.svelte` are far more actionable than ones that say "the token list component."

### Divergence check before closing PRs

Before closing a PR, Claude Code diffs the final implementation against the spec and flags any gaps. You decide whether to update the spec or revert the code. This prevents silent drift.

### PRODUCT.md stays current

`PRODUCT.md` is updated as part of every merge, not as an afterthought. Claude Code should be instructed in `CLAUDE.md` to patch `PRODUCT.md` as part of its standard post-implementation step.

### CLAUDE.md wires everything together

`CLAUDE.md` instructs Claude Code to:

- Always read `docs/ai/PRODUCT.md` at session start
- Look for specs in `docs/ai/spec-driven-development/specs/`
- Update `PRODUCT.md` after merging

---

## Tooling

| Tool                                         | Role                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------- |
| **Cowork**                                   | Spec drafting, clarification, research                               |
| **Claude Code**                              | Implementation, testing, PR management                               |
| **GitHub MCP**                               | Configured in Claude Code — enables branch, PR, and issue operations |
| **`docs/ai/spec-driven-development/specs/`** | Handoff point between Cowork and Claude Code                         |
| **`docs/ai/PRODUCT.md`**                     | Living product spec; read by Claude Code at every session            |

---

## Future Improvement (when available)

Once a custom GitHub MCP connector can be added to Cowork, the manual copy step (Step 3) can be automated — Cowork would commit the spec file directly to a branch in the repo.
