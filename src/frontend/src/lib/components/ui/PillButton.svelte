<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		selected?: boolean;
		onClick?: () => void;
		children: Snippet;
	}

	let { selected = false, onClick, children }: Props = $props();
</script>

<!-- The neutral border on the unselected state keeps the pill readable on any
	 surface: `bg-primary` alone is invisible on a `bg-primary` container (e.g. a
	 modal). Both states carry a 1px border so toggling selection never shifts the
	 layout. Hover darkens the selected fill and washes the unselected one. -->
<button
	class={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
		selected
			? 'border-brand-primary bg-brand-primary text-primary-inverted hover:border-brand-secondary hover:bg-brand-secondary'
			: 'border-primary bg-primary text-secondary hover:bg-brand-subtle-10'
	}`}
	onclick={onClick}
>
	{@render children()}
</button>
