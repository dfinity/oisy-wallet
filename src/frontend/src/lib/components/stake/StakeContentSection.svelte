<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		title: Snippet;
		content: Snippet;
		action?: Snippet;
	}

	let { content, title, action }: Props = $props();
</script>

<div class="flex flex-col rounded-xl bg-surface p-4" in:fade>
	<div class="relative flex w-full items-center justify-between">
		{@render title()}

		<div>
			{@render action?.()}
		</div>
	</div>

	<div class="mt-2 flex w-full flex-col">
		{@render content()}
	</div>
</div>
