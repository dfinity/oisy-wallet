<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		icon?: Snippet;
		title: Snippet;
		description?: Snippet;
		noBorder?: boolean;
	}

	const { icon, title, description, noBorder = false }: Props = $props();
</script>

<div class="border-secondary flex py-3" class:border-b-1={!noBorder} transition:slide>
	{@render icon?.()}

	<div class="ml-3 w-full text-sm">
		<div class="font-bold">
			{@render title()}
		</div>

		{#if nonNullish(description)}
			<div class="text-tertiary mt-1">
				{@render description()}
			</div>
		{/if}
	</div>
</div>
