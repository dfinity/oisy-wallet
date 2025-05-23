<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';

	interface Props {
		logo?: Snippet;
		content: Snippet;
		description?: Snippet;
		actions?: Snippet;
		hasError?: boolean;
	}

	const { logo, content, description, actions, hasError = false }: Props = $props();
</script>

<div
	class="flex items-center rounded-lg border border-disabled bg-secondary px-2 py-3"
	class:border-error-solid={hasError}
>
	{@render logo?.()}

	<div class="flex w-full flex-col truncate pl-2 pr-4 text-sm sm:text-base">
		{@render content()}

		{#if nonNullish(description)}
			<div class="w-full pl-2 pr-4 pt-1.5 text-sm sm:text-base">{@render description()}</div>
		{/if}
	</div>

	{@render actions?.()}
</div>
