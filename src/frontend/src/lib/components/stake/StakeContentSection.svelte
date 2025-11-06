<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		title: Snippet;
		content: Snippet;
		action?: Snippet;
	}

	let { content, action, title }: Props = $props();
</script>

<!-- TODO: add styling according to the designs -->
<div class="rounded-xl bg-secondary p-4" in:fade>
	<div class="flex w-full justify-between">
		<h4>{@render title()}</h4>

		{@render action?.()}
	</div>

	<div class="mt-2">
		{@render content()}
	</div>
</div>
