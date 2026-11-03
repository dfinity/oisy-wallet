# Visual artifacts (mockups, wireframes, prototypes)

Rules for any **visual artifact produced outside the app**: HTML
wireframes from Cowork, Claude Design outputs, artifacts rendered in a
chat, throwaway prototypes, review illustrations, or anything dropped in a
[spec asset folder](./spec-driven-development/workflow.md#step-3--spec-cowork--you).

> Higher up: [`AGENTS.md`](../../AGENTS.md) → [`docs/ai/`](./README.md).
> Related: [`frontend/reusability.md`](./frontend/reusability.md) (the
> component catalog), [`frontend/brand-and-copy.md`](./frontend/brand-and-copy.md)
> (voice, colour, icons).

## The rule

**An artifact must look like the real app, because it is built out of the
real app's parts.** Mirror the components, tokens, and copy that already
exist. Invent new UI only for the part the artifact is actually
specifying, and say so explicitly.

An artifact is not a blank canvas. It is a proposal for a diff. If it
shows a bespoke card, a hand-rolled toggle, or a colour that is not in the
theme, then either the implementer ignores the artifact (and it wasted
everyone's time) or they build it faithfully and the app gains a duplicate
of something it already had. Both outcomes are worse than a plainer
artifact assembled from what ships today.

## Before you draw anything

| Look up                | Where                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| Existing components    | [`frontend/reusability.md`](./frontend/reusability.md), `src/frontend/src/lib/components/`          |
| UI primitives          | `src/frontend/src/lib/components/ui/` (`Button`, `Card`, `Modal`, `Badge`, `Dropdown`, …)           |
| Icons                  | `src/frontend/src/lib/components/icons/`                                                            |
| Colours, spacing, type | `src/frontend/src/lib/styles/theme/`, `src/frontend/src/lib/styles/tailwind/`, `tailwind.config.ts` |
| Existing copy          | `src/frontend/src/lib/i18n/en.json`                                                                 |
| The screen you change  | The real `.svelte` file, and the running app in both themes                                         |

The nearest existing screen is the best starting point. Copy its markup,
then change only the part the artifact is about.

## Do / don't

| Do                                                                                     | Don't                                                              |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Reproduce the real component tree, and name the real components in the artifact        | Draw a lookalike from scratch because it is faster in plain HTML   |
| Use theme tokens / Tailwind classes the app actually uses                              | Eyeball hex codes, shadows, radii, or font sizes                   |
| Reuse strings from `en.json` where the screen already has them                         | Write placeholder lorem or off-brand copy for existing labels      |
| Show both light and dark, if the change is visual                                      | Ship a light-only mock for a themed surface                        |
| Extend an existing component with a prop when it is 80% right                          | Fork it into a near-identical variant                              |
| Flag genuinely new UI in a short "new components" list, with why nothing existing fits | Slip a new pattern in silently and let the implementer discover it |

## Annotate the mapping

Make the hand-off mechanical. In the artifact (a comment, a caption, or a
short table in the spec), map each region to the real thing:

```html
<!-- ModalHero  ($lib/components/common/ModalHero.svelte) -->
<!-- List > ListItem × n  ($lib/components/common/List.svelte, ListItem.svelte) -->
<!-- Button colorStyle="primary"  ($lib/components/ui/Button.svelte) -->
```

An implementer should be able to read the artifact and know which files to
open. If a region has no mapping, that is the signal it is new UI and needs
the callout below.

## When new UI is genuinely needed

Sometimes it is. The taxonomy is closed but not frozen. In that case the
artifact must carry, next to the mock:

- What is new (component name and shape).
- Which existing component was the closest, and why extending it with props
  does not work.
- Whether it is a one-off for this screen, or a shared block that belongs in
  `$lib/components/common/` or `ui/`.

That turns "invented UI" into an explicit decision the human owner approves,
instead of a surprise found during implementation. The
[reuse rule](./frontend/reusability.md#the-reuse-rule) still governs what
lands in code.

## Checklist

- [ ] Every region maps to an existing component, or is flagged as new.
- [ ] Colours, spacing, and typography come from the theme, not from taste.
- [ ] Copy is existing `en.json` strings, or new copy following
      [`brand-and-copy.md`](./frontend/brand-and-copy.md) (no em dashes).
- [ ] Icons come from `$lib/components/icons/`.
- [ ] Dark mode is shown, or explicitly out of scope.
- [ ] Deviations from the shipped UI are the subject of the change, not
      incidental drift.

## Lifecycle

Artifacts are planning material, not a source of truth. Once the feature
ships, the app is: the code, plus [`docs/ai/PRODUCT.md`](./PRODUCT.md) for
behaviour, plus the component catalog for visual conventions. Spec asset
folders are deleted after merge, see the workflow's
[post-merge cleanup step](./spec-driven-development/workflow.md#step-7--post-merge-cleanup-claude-code).
