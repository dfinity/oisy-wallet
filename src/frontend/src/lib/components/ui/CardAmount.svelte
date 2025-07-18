<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
	}

	let { children }: Props = $props();
</script>

<span class="inline-flex flex-1 items-center justify-end text-right font-bold"
	>{@render children?.()}</span
>
