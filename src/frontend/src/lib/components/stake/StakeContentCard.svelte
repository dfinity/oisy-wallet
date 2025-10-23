<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		content: Snippet;
		buttons: Snippet;
	}

	let { content, buttons }: Props = $props();
</script>

<!-- TODO: add styling according to the designs -->
<div class="flex w-1/2 flex-col items-center justify-between rounded-xl bg-secondary p-4">
	<div class="mb-8 flex flex-col justify-center gap-2 text-center">
		{@render content()}
	</div>

	<div class="w-full">
		{@render buttons()}
	</div>
</div>
