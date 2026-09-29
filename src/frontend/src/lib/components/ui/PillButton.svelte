<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		selected?: boolean;
		accent?: boolean;
		onClick?: () => void;
		children: Snippet;
	}

	let { selected = false, accent = false, onClick, children }: Props = $props();
</script>

<!-- The neutral border on the unselected state keeps the pill readable on any
	 surface: `bg-primary` alone is invisible on a `bg-primary` container (e.g. a
	 modal). Both states carry a 1px border so toggling selection never shifts the
	 layout. Hover darkens the selected fill and washes the unselected one.
	 `accent` tints an unselected pill so it stands out from its neighbours, with a
	 hover darker than its rest state; selected, it matches every other pill, so
	 which one is on always reads the same. The tint is carried by the fill and the
	 border only: brand-blue text on it falls below AA contrast at this size, in the
	 light theme and further in the dark one. -->
<button
	class={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
		selected
			? 'border-brand-primary bg-brand-primary text-primary-inverted hover:border-brand-secondary hover:bg-brand-secondary'
			: accent
				? 'border-brand-subtle-20 bg-brand-subtle-20 text-secondary hover:border-brand-subtle-30 hover:bg-brand-subtle-30'
				: 'border-primary bg-primary text-secondary hover:bg-brand-subtle-10'
	}`}
	aria-pressed={selected}
	onclick={onClick}
	type="button"
>
	{@render children()}
</button>
