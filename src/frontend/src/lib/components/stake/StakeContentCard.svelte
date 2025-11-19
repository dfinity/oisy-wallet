<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		content: Snippet;
		buttons?: Snippet;
	}

	let { content, buttons }: Props = $props();
</script>

<div
	class="flex w-full flex-col items-center justify-between rounded-xl border border-solid border-disabled bg-secondary p-4 sm:w-1/2"
>
	<div class="mb-8 flex flex-col justify-center gap-2 text-center">
		{@render content()}
	</div>

	<div class="w-full">
		{@render buttons?.()}
	</div>
</div>
