# Workflow: Add a new Svelte component

Use this when you need a new `.svelte` file. Don't use it when an existing
shared component (see [`../reusability.md`](../reusability.md)) already
covers the use case.

## Steps

1. **Decide the layer.** Use the
   [decision tree](../structure.md#where-to-put-new-files-decision-tree):
   - Generic primitive missing from `$lib/components/ui/`
     → `$lib/components/ui/<Name>.svelte`.
   - Cross-feature presentational → `$lib/components/common/<Name>.svelte`.
   - Cross-chain feature component → `$lib/components/<feature>/<Name>.svelte`.
   - Chain-specific component → `$<chain>/components/<feature>/<Name>.svelte`.
2. **Pick the name.** PascalCase, descriptive, no `Component` / `Widget`
   suffix. Reflects role, not appearance (`SwapDetailsOneSec`, not
   `BluePill`).
3. **Sketch props first.** Always use a named `interface Props` above
   the destructure — see
   [stack-and-patterns.md#props-shape](../stack-and-patterns.md#props-shape).

   ```ts
   interface Props {
   	token: Token;
   	onSubmit?: (id: TokenId) => void;
   }

   let { token, onSubmit = () => {} }: Props = $props();
   ```

   - All props typed via `interface Props`.
   - Required props first, optional / defaulted after.
   - Callbacks default to no-op.
   - Two-way binding via `$bindable()` on the destructure side, never
     legacy `bind:` on the parent.

4. **Compose, don't reinvent.** Build on `$lib/components/{ui,common,core}/`.
   Pull existing icons before adding new
   ones. Use snippets (`{#snippet}`) for repeating intra-component markup.
5. **Style with the project's tokens / utilities.** Look at the closest
   neighbour's classes. Tailwind v4, no raw hex. See
   [stack-and-patterns.md](../stack-and-patterns.md#tailwind-v4--design-tokens).
6. **i18n + a11y.** All strings via `$i18n.*`. Labels on every input.
   Decorative icons `aria-hidden="true"`. See
   [i18n-and-a11y.md](../i18n-and-a11y.md). Add new keys to `en.json` and
   run `npm run i18n` (see
   [`add-i18n-key.md`](./add-i18n-key.md)).
7. **Test ID** if the component is targeted by Playwright or unit tests:
   `data-tid={tid}` where `tid` is added to
   [`$lib/constants/test-ids.constants.ts`](../../../../src/frontend/src/lib/constants/test-ids.constants.ts).
8. **Tests** if the component is shared or has logic. See
   [testing.md](../testing.md#component-testing).
9. **Catalog update** if the component goes into `$lib/components/{ui,common,core}/`
   or introduces a new pattern that future agents should reuse — add a row
   to [`reusability.md`](../reusability.md#catalog-current-keep-this-honest).
   This is the [meta-update rule](../../governance.md#meta-update-rule).
10. **Run quality gates** ([`pr-and-ci.md §4`](../../pr-and-ci.md#4-local-quality-gates)).
11. **Open the PR** with the right title:
    - New feature visible to users → `feat(frontend): …`.
    - Restructure / extract with no behaviour change → `refactor(frontend): …`.
    - Pure visual update → `style(frontend): …`.

## Skeleton

```svelte
<script lang="ts">
	import { i18n } from '$lib/stores/i18n.store';
	import type { Token } from '$lib/types/token';

	interface Props {
		token: Token;
		onSubmit?: (id: Token['id']) => void;
	}

	let { token, onSubmit = () => {} }: Props = $props();

	let isReady = $derived(token.enabled);
</script>

<button
	type="button"
	class="flex items-center gap-2 rounded-md px-3 py-2"
	disabled={!isReady}
	onclick={() => onSubmit(token.id)}
	aria-label={$i18n.tokens.actions.select}
>
	<span class="truncate">{token.name}</span>
</button>
```

## Common mistakes (don't)

- A new `<div class="…card…">` that duplicates `$lib/components/common/List*`
  / `Modal*` blocks.
- Hard-coded colour (`bg-[#0f0]`) instead of the project's token classes.
- A wrapper that only re-exports another component.
- Logic in the markup that should be a `$derived`.
- Reading from a store deep inside the markup instead of a top-level
  `$derived` / store reference.
- Bypassing `$lib/stores/i18n.store` for any user-visible string.
