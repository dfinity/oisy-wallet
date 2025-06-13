<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		end?: Snippet;
	}

	let { children, end }: Props = $props();
</script>

<div class="mb-6 flex items-center justify-between pb-1">
	<h2 class="text-base">{@render children()}</h2>

	{@render end?.()}
</div>
