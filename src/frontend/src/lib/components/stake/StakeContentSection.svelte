<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		title: Snippet;
		content: Snippet;
	}

	let { content, title }: Props = $props();
</script>

<div class="rounded-xl bg-surface p-4" in:fade>
	<div class="relative flex w-full items-start justify-between">
		{@render title()}
	</div>

	<div class="mt-2">
		{@render content()}
	</div>
</div>
