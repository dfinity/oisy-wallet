<script lang="ts">
	import type { Snippet } from 'svelte';
	import { nonNullish } from '@dfinity/utils';

	interface Props {
		icon?: Snippet;
		title?: Snippet;
		description?: Snippet;
	}

	const { icon, title, description }: Props = $props();
</script>

<div class="flex w-full flex-col items-center">
	{@render icon?.()}
	{#if nonNullish(title)}
		<span class="my-3 text-lg font-bold">
			{@render title()}
		</span>
	{/if}
	{#if nonNullish(description)}
		<p class="text-tertiary">{@render description()}</p>
	{/if}
</div>
