<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<span class="shrink-0 items-center justify-end text-right font-bold">{@render children?.()}</span>
