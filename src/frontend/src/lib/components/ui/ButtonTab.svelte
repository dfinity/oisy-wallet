<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onClick: () => void;
		children: Snippet;
		selected?: boolean;
	}

	let { onClick, children, selected = false }: Props = $props();
</script>

<button
	class="h-6 rounded-none font-semibold hover:text-inherit"
	class:selected
	class:text-tertiary={!selected}
	onclick={onClick}
>
	{@render children?.()}
</button>

<style lang="postcss">
	.selected {
		border-bottom: 2px solid var(--color-background-brand-primary);
	}
</style>
