<script lang="ts">
	import type { Snippet } from 'svelte';
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';

	interface Props {
		icon?: Snippet;
		title: Snippet;
		description?: Snippet;
	}

	const { icon, title, description }: Props = $props();
</script>

<div class="flex border-b-1 border-secondary py-3" transition:slide>
	{@render icon?.()}

	<div class="ml-3 w-full text-sm">
		<div class="font-bold">
			{@render title()}
		</div>

		{#if nonNullish(description)}
			<div class="mt-1 text-tertiary">
				{@render description()}
			</div>
		{/if}
	</div>
</div>
