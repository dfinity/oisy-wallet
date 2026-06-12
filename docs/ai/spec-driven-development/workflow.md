# Oisy Wallet — Spec-Driven Development Workflow

## Overview

This workflow uses **Cowork** for specification and **Claude Code** for implementation, with specs stored directly in the repository so they serve as durable, version-controlled context for every build.

---

## Repository Structure

```
dfinity/oisy-wallet/
├── CLAUDE.md                                           # Instructions for Claude Code (references PRODUCT.md and specs/)
└── docs/
    └── ai/
        ├── PRODUCT.md                                  # Living description of all current product behaviors
        └── spec-driven-development/
            ├── workflow.md                             # This document
            └── specs/
                ├── 2026-05-10-feat-add-token-swapping.md
                ├── 2026-05-24-fix-wallet-sync-race.md
                ├── 2026-06-04-feat-limit-orders.md     # the spec
                ├── 2026-06-04-feat-limit-orders/       # optional assets for this spec
                │   ├── wireframes/                     # HTML mocks (e.g. from Cowork)
                │   └── designs/                        # design outputs (e.g. from Claude Design)
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

**Spec header:** Every new spec must begin with the following line so Claude Code knows it is part of this workflow:

> This spec follows the workflow defined in `docs/ai/spec-driven-development/workflow.md`.

**Spec filename convention:** `YYYY-MM-DD-<type>-<short-description>.md`

The date prefix keeps specs sorted chronologically in the directory. The type prefix signals the nature of the work at a glance:

| Prefix  | When to use                       |
| ------- | --------------------------------- |
| `feat`  | New feature                       |
| `impr`  | Improvement to existing behaviour |
| `fix`   | Bug fix                           |
| `chore` | Refactor, tooling, housekeeping   |

Example: `2026-06-02-impr-track-learn-more-clicks.md`

**Cowork session naming:** Name the session to match the spec — same type prefix and short description, without the date. E.g. `impr: Track Learn More clicks in Plausible`. This keeps the sidebar readable and makes it easy to link a session back to its spec.

**Spec asset folder:** A spec may bring along supporting assets — HTML wireframes from Cowork, design outputs from Claude Design, diagrams, screenshots, etc. Place them in a sibling folder that matches the spec filename without the `.md` extension, and group them inside by source type:

```
specs/
├── 2026-06-04-feat-limit-orders.md          # the spec
└── 2026-06-04-feat-limit-orders/            # assets for the spec
    ├── wireframes/                          # HTML mocks (e.g. from Cowork)
    └── designs/                             # design outputs (e.g. from Claude Design)
```

This keeps the `specs/` listing readable (one `.md` per spec) while letting each spec carry its own assets. The folder is optional — many specs will not need one. References from the spec to an asset use a relative path, e.g. `[rounding demo](./2026-06-04-feat-limit-orders/wireframes/rounding-demo.html)`.

### Step 4 — Build (Claude Code)

Open Claude Code in the oisy-wallet repo and say:

> "Implement `docs/ai/spec-driven-development/specs/your-spec.md`"

Claude Code reads the spec, reads `docs/ai/PRODUCT.md` for system context, and begins building. It has the GitHub MCP configured and can open PRs, create branches, and interact with issues directly.

**Update `docs/ai/PRODUCT.md` in the same PR** as the behaviour change, not afterwards. Claude Code is best placed to write the description because by the time the PR is ready, it has the implementation context (what _actually_ shipped, including any [Step 5 — Adjust](#step-5--adjust-claude-code--spec) deviations from the spec). Landing PRODUCT.md alongside the code also keeps `main` from briefly disagreeing with itself between merge and the cleanup PR. Cowork can still review the draft if a product re-think emerges.

### Step 5 — Adjust (Claude Code ↔ Spec)

If the implementation reveals gaps or the spec needs updating, the spec is the source of truth — keep it in sync with reality.

**Fix it in Code directly** if it's a small gap — a missing edge case, an unclear description, a file path that turned out to be wrong. Code can edit the spec file itself as it works.

**Come back to Cowork** if the gap reveals a deeper ambiguity — something that requires rethinking scope, resolving a product question, or deciding between approaches. Cowork is better for that dialogue, and the updated spec should reflect the decision before Code continues.

### Step 6 — Post-merge cleanup (Claude Code)

After the PR merges:

1. **Remove the spec's asset folder** (`specs/<name>/` — wireframes, designs, etc.). The spec `.md` stays; the assets were planning artifacts. Once the feature ships, the shipped app is the source of truth — the code itself, plus `PRODUCT.md` for behaviour and the design-system / component library for visual conventions. Holding on to spec assets after merge just creates silent traps once the implementation evolves. Git history retains them if they're ever genuinely needed again.

This can land as a small follow-up PR. A project can deviate (e.g. if assets are linked from external docs and must remain browseable), but the decision should be explicit in the project's `CLAUDE.md` so the convention isn't skipped silently.

(`PRODUCT.md` is updated in the **same** PR as the behaviour change — see [Step 4](#step-4--build-claude-code) — not here.)

---

## Spec Structure

Specs are free-form Markdown — there is no fixed template. The one convention worth following concerns how a spec records what is still unresolved, because these are read and acted on differently during the Build step.

### Open questions vs. pending decisions

Keep two distinct end-of-spec sections rather than one mixed "open items" list. The distinction is whether the relevant **facts are known**:

- **Open questions (facts to confirm)** — the answer is not yet known and must be found out or verified: e.g. confirm an SDK method's contract, check whether a pool is live, verify a field exists in the registry. These often need research, a docs lookup, or a question to another team, and may still reshape the spec.
- **Pending decisions (facts are clear — we just need to decide)** — all the relevant facts are understood; what remains is a product or architecture call: e.g. choosing between two valid approaches, or whether something ships in v1 vs. a fast-follow. These need an owner to decide, not more information.

Why separate them: the two route to different people and actions. Open questions go to whoever can find the answer; pending decisions go to whoever owns the call. It also keeps the spec honest — it's easy to disguise an undecided choice as an "open question" and stall. When an open question gets answered, it usually becomes a pending decision: move it across rather than leaving it ambiguous.

---

## Improvements Over a Basic Workflow

### Ground specs in real code

Before finalizing a spec, Claude Code (or Cowork via search) scans the codebase to reference actual file paths, component names, and existing patterns. Specs that mention `src/lib/components/TokenList.svelte` are far more actionable than ones that say "the token list component."

### Divergence check before closing PRs

Before closing a PR, Claude Code diffs the final implementation against the spec and flags any gaps. You decide whether to update the spec or revert the code. This prevents silent drift.

### PRODUCT.md stays current

`PRODUCT.md` is updated in the **same PR** as the behaviour change, not as a post-merge afterthought. This keeps `main` from briefly carrying code whose product description does not yet match, and means the description is written by Claude Code with the implementation context fresh.

### CLAUDE.md wires everything together

`CLAUDE.md` instructs Claude Code to:

- Always read `docs/ai/PRODUCT.md` at session start
- Look for specs in `docs/ai/spec-driven-development/specs/`
- Update `PRODUCT.md` in the same PR as the behaviour change (not post-merge)

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
