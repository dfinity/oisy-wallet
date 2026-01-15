<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		content: Snippet;
		buttons?: Snippet;
		primaryStyle?: boolean;
	}

	let { content, buttons, primaryStyle = false }: Props = $props();
</script>

<div
	class="flex w-full flex-col items-center justify-between rounded-xl border-solid border-disabled p-4 sm:w-1/2"
	class:bg-brand-subtle-10={primaryStyle}
	class:bg-secondary={!primaryStyle}
	class:border={!primaryStyle}
	class:border-0={primaryStyle}
>
	<div
		class="flex flex-col justify-center text-center"
		class:gap-2={!primaryStyle}
		class:gap-4={primaryStyle}
	>
		{@render content()}
	</div>

	{#if nonNullish(buttons)}
		<div class="mt-8 flex w-full flex-col gap-2">
			{@render buttons()}
		</div>
	{/if}
</div>
