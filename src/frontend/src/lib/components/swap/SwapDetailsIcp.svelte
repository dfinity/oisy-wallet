<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatToken } from '$lib/utils/format.utils';

	const { provider } = $props<{
		provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;
	}>();
	const { destinationToken } = getContext<SwapContext>(SWAP_CONTEXT_KEY);

	const formattedMinimum = $derived(
		nonNullish(provider.receiveOutMinimum) && nonNullish($destinationToken)
			? `${formatToken({
					value: provider.receiveOutMinimum,
					unitName: $destinationToken.decimals,
					displayDecimals: $destinationToken.decimals
				})} ${$destinationToken.symbol}`
			: null
	);
</script>

{#if nonNullish(formattedMinimum)}
	<ModalValue>
		<svelte:fragment slot="label">{$i18n.swap.text.expected_minimum}</svelte:fragment>
		<svelte:fragment slot="main-value">{formattedMinimum}</svelte:fragment>
	</ModalValue>
{/if}
