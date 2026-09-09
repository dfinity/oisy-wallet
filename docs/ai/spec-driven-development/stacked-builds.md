# Building a multi-PR spec as a local stack

A spec from [`workflow.md`](./workflow.md) normally plans several atomic PRs —
commandments [2 and 3](../../../AGENTS.md#2-the-10-commandments-read-before-every-change)
require it. That creates a tension: each PR has to land on its own and stay small
enough to review, but the feature only works end to end once the last one exists.

This page is how to resolve it locally — one branch per planned PR, stacked
linearly, so the tip of the stack is the whole feature.

## The shape

```
main
└── feat/<slug>-1-<what>              PR 1
    └── feat/<slug>-2-<what>          PR 2
        └── feat/<slug>-3-<what>      PR 3
```

Every branch is created from its **parent**, never from `main`. Three
consequences, and they are the whole point:

- The **tip is the complete feature.** Check it out and the flow runs locally.
  There is no integration branch to build and no merge to redo.
- **Each diff against its parent is exactly that PR's change**, so review stays
  as small as the spec intended.
- **Stack order is dependency order.** If PR 2 needs the declarations PR 1
  generates with `npm run generate`, it simply has them.

### Why linear, and not a tree

Sibling branches off a shared parent look tidier, but then nothing contains the
whole feature: you need a separate integration branch that merges the siblings,
and it has to be rebuilt after every fix. A linear stack gets that integration
for free. The cost is that review serialises.

Prefer linear. Branch sideways only when two PRs are genuinely independent
**and** both need review in parallel.

## Naming

`<type>/<spec-slug>-<position>-<what>`, using the spec's own type prefix and
short slug:

| Spec                                          | Branch                     |
| --------------------------------------------- | -------------------------- |
| `2026-08-05-feat-tips-via-link.md`, PR 1 of 6 | `feat/tips-1-backend`      |
| same spec, PR 4 of 6                          | `feat/tips-4-recipient-ui` |

The position number is what makes `git branch --list 'feat/tips-*'` print the
stack in order — which is the cheapest possible status view.

## The three operations

**Add the next branch** — from the current tip, not from `main`:

```bash
git checkout -b feat/tips-3-sender-ui feat/tips-2-service
```

**Propagate a fix — downward, never sideways.** Fix on the branch that _owns_
the code, then merge that branch into each descendant in order:

```bash
git checkout feat/tips-3-sender-ui && git merge --no-edit feat/tips-2-service
```

Do not fix a bug at the tip just because that is where you noticed it. The fix
would land in the wrong PR and the earlier one would ship broken. This is the
single rule that keeps a stack honest, and the only one worth being strict about.

**Sync with `main`** — merge into the bottom branch, then cascade:

```bash
git checkout feat/tips-1-backend && git merge --no-edit origin/main
```

Merge, never rebase: rewriting a pushed branch is forbidden by
[pr-and-ci.md §7](../pr-and-ci.md#7-updating-an-existing-pr). Only sync when you
actually need something from `main` — being behind is fine, the merge queue
handles it at merge time.

## On the remote

- Open each PR with **its parent branch as base**, not `main`. GitHub then shows
  only that PR's own diff, and retargets the child to `main` by itself when the
  parent merges.
- Stacked PRs are the sanctioned alternative to force-pushing — see
  [pr-and-ci.md §7](../pr-and-ci.md#7-updating-an-existing-pr). Never rebase a
  stack to tidy it.
- **Land bottom-up.** A PR whose parent has not merged is not ready for the
  merge queue.
- Name the parent PR in each body, so a reviewer knows what they are standing on.

## Where the gates run

| Where                             | What must pass                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Every branch, before it is pushed | the full [local gates](../pr-and-ci.md#4-local-quality-gates) — plus the backend scripts if Rust changed                                   |
| The tip                           | the manual end-to-end run of the feature against a local replica ([HACKING.md → Local development](../../../HACKING.md#local-development)) |

A branch that is green on its own but only _works_ with its descendants present
is a sign the split is wrong — either the dependency runs the wrong way, or the
two branches are one PR.

## Folding

If a branch turns out to be a handful of lines, fold it into its parent before
pushing instead of opening a PR nobody benefits from reviewing separately. The
spec's PR list is a plan, not a contract: commandment 3 asks for small PRs, not
for a specific number of them.

## Tracking

Keep the stack table in the spec's **asset folder** — `specs/<spec-name>/build-plan.md`
— with one row per PR: branch, what it contains, status.

It goes there rather than in the spec itself because it is disposable working
state, and the asset folder is already removed at
[Step 7 — Post-merge cleanup](./workflow.md#step-7--post-merge-cleanup-claude-code).
The tracker dies with the thing it tracks, which is the only way it never goes
stale in `main`.

The spec stays the source of truth for **what** to build. The build plan only
records **where** each piece currently lives.
