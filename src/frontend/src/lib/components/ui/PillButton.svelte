<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	interface Props {
		selected?: boolean;
		onClick?: () => void;
		children: Snippet;
	}

	let { selected = false, onClick, children }: Props = $props();
</script>

<button
	class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
	class:bg-brand-primary={selected}
	class:border-brand-primary={selected}
	class:border-secondary={!selected}
	class:text-primary-inverted={selected}
	class:text-secondary={!selected}
	onclick={onClick}
>
	{@render children()}
</button>
