<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		content: Snippet;
		buttons: Snippet;
	}

	let { content, buttons }: Props = $props();
</script>

<!-- TODO: add styling according to the designs -->
<div class="flex w-1/2 flex-col items-center rounded-xl bg-secondary p-4">
	<div class="mb-8 flex justify-center gap-2">
		{@render content()}
	</div>

	{@render buttons()}
</div>
