<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Readable } from 'svelte/store';
	import SwapAmountsContext from '$lib/components/swap/SwapAmountsContext.svelte';
	import type { Token } from '$lib/types/token';

	interface Props extends Omit<
		ComponentProps<typeof SwapAmountsContext>,
		'sourceToken' | 'destinationToken'
	> {
		sourceToken: Readable<Token | undefined>;
		destinationToken: Readable<Token | undefined>;
	}

	let { sourceToken, destinationToken, ...props }: Props = $props();
</script>

<SwapAmountsContext {...props} destinationToken={$destinationToken} sourceToken={$sourceToken} />
