<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		end?: Snippet;
	}

	let { children, end }: Props = $props();
</script>

<div class="mb-4 flex items-center justify-between">
	<h2 class="text-base">{@render children()}</h2>

	{@render end?.()}
</div>
