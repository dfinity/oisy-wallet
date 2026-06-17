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

**Workflow-step references:** When a spec (or any document) references a step in this workflow, include the **full title**, not just the number — e.g. `Step 6 — Review (Cowork)`, not `Step 6`. Step numbers can shift as the workflow evolves; titles stay stable, so a title-anchored pointer survives renumbering and stays readable. (Retro-fitting every older spec when numbers move isn't always practical — the title convention prevents the problem in the first place.)

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

### Step 6 — Review (Cowork)

Before the PR merges, hand the result back to Cowork for an independent review. Cowork holds the original intent and the spec context but did not write the code — that distance is the point. Paste the PR (or its diff) into the spec's Cowork session and ask for a review of three artifacts:

- **The code / diff** — does it deliver what the spec described? Walk the acceptance criteria one by one, confirm the negative guarantees ("does _not_ do X") actually hold, and probe edge cases the spec implied but the diff might miss (theme variants, logged-out states, empty/error paths). This is where reasoning-level bugs surface — e.g. an icon hardcoding a color instead of inheriting `currentColor`, which looks fine in the diff and only diverges in dark mode.
- **`PRODUCT.md`** — accurate against what actually shipped, complete, and does it keep the deliberate "does not do X" statements that let a future reader tell "excluded on purpose" from "forgotten"?
- **The final spec** — after any [Step 5 — Adjust](#step-5--adjust-claude-code--spec) edits, does it still match what shipped and stay at product altitude (intent and behaviour, not Tailwind classes and prop names)?

**What this review is and isn't.** It is a reasoning and divergence check by a second agent — it complements, it does not replace, human visual QA and CI. Cowork reads code and descriptions; it does not run the app. A "correct in the diff" finding still needs a human to confirm in the running UI (in every theme), and the gates (`format` / `lint` / `check` / `test`) remain the structural backstop.

**Why a second agent.** Claude Code already self-checks via the [divergence check before closing PRs](#divergence-check-before-closing-prs), but the implementer reviewing its own output is the weakest form of review. The two checks run in opposite directions and are complementary: Code, reading the spec to build, catches errors in the **spec** (e.g. a spec claiming a test file does not exist when it does); Cowork, reading the output against the intent, catches errors in the **code and the description**. Note the asymmetry — Cowork authored the spec, so it is a poor reviewer of its _own_ spec's blind spots; its value here is on the code and `PRODUCT.md` that Code produced.

Findings go back to you. You decide what to act on; fixes flow through the [Step 5 — Adjust](#step-5--adjust-claude-code--spec) loop (Cowork for product re-thinks, Code for small gaps) before merge.

### Step 7 — Post-merge cleanup (Claude Code)

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

This is Claude Code's self-check; it is distinct from the independent [Step 6 — Review (Cowork)](#step-6--review-cowork), where a second agent that did not write the code reviews the diff, `PRODUCT.md`, and final spec against the original intent.

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
