# Workflow: Split / refactor a component

The repo strongly favours small, composable components. Splitting an
oversized component is one of the most common — and most welcome — kinds
of PR. Recent merged examples (use as templates):

- `refactor(frontend): extract AiAssistantChat component` (#12646)
- `refactor(frontend): extract AiAssistantResetButton component` (#12647)
- `refactor(frontend): Switch interval to timeout in VipQrCodeModal` (#9709)
- `refactor(frontend): rename transaction size symbols to use vbytes units` (#12661)

## When to split

Yes if any apply:

- A `.svelte` file is > ~250 lines, or has > ~5 distinct visual sections.
- The same markup pattern is repeated within the file (loop body
  duplicating layout).
- Conditional branches in the markup that render very different UIs
  (`{#if mode === 'X'} … {:else if mode === 'Y'} …`).
- A logical sub-block is reused (or about to be) elsewhere.
- A pure helper has snuck inside a component — extract to `*.utils.ts`.

No if:

- The component is small and cohesive — splitting adds noise, not signal.
- The "split" is just renaming.
- You'd be introducing a wrapper that only re-exports a child.

## Rules

1. **Atomicity.** A split PR changes structure only — **no behaviour
   change**, no design change, no copy change. If you spot one, split it
   into a follow-up PR.
2. **Stable visible output.** The rendered DOM (or at least the
   user-facing behaviour) must be identical before / after. Existing
   tests should keep passing without modification (other than imports).
3. **Same folder, same feature.** Children of a split live next to the
   parent. Cross-feature promotion happens only when a second caller
   appears in the same PR.
4. **Type contracts at the seam.** Each new child has explicit `$props()`
   types — no implicit `any`.
5. **Snippets over wrapper components for _intra-file_ repetition.** If
   the duplicated chunk only makes sense inside the parent, use
   `{#snippet}` + `{@render}` instead of a new file.
6. **Don't migrate runes / stores in the same PR** unless that _is_ the
   PR. Migration is a different `refactor(frontend): migrate <X> to runes`
   change.

## Steps

1. **Map the parent.** List the visual / logical sections (e.g.
   `Header`, `Filters`, `Search`, `EmptyState`, `Footer`).
2. **Plan the split.** Decide which sections become:
   - Snippets (intra-file).
   - Sibling components in `$lib/components/<feature>/<sub>/` or the
     matching chain folder.
   - Promoted to `$lib/components/common/` (rare in a single PR).
3. **Identify the seam.** For each new component:
   - What props does it need?
   - What events / callbacks does it raise?
   - What state does it own vs. receive?
     Aim for the smallest interface that lets the parent reassemble the
     feature.
4. **Move incrementally.** One sub-component per commit if possible; CI
   should stay green at every step.
5. **Update test IDs** in `$lib/constants/test-ids.constants.ts` if the
   structure of the IDs mirrors the structure of the component tree.
6. **Update tests** that assert on component composition (rare — most
   tests assert on rendered output and won't need changes).
7. **Update the catalog** in [`reusability.md`](../reusability.md) only
   when the new sub-component lands in `$lib/components/{ui,common,core}/`
   or introduces a reusable pattern.
8. **Run quality gates.**
9. **Open the PR** with the title:
   `refactor(frontend): split <ParentComponent> into <description>` or
   `refactor(frontend): extract <ChildComponent> component`.
   In the body, list the new files created and confirm "no behaviour
   change". Include a short manual / screenshot proof if the surface is
   visual.

## Anti-patterns

- Splitting _and_ changing styles in the same PR.
- Splitting _and_ renaming files / props in unrelated places.
- Hoisting a sub-component to `$lib/components/common/` based on
  speculation it might be reused.
- Creating an `index.ts` barrel just to re-export the new files.
- Leaving the original parent file untouched but importing the children
  with no consolidation — the parent should look noticeably leaner.
