<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';

	export let provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

	console.log($destinationToken);
</script>

{#if nonNullish(provider.receiveOutMinimum) && nonNullish($destinationToken)}
	<ModalValue>
		<svelte:fragment slot="label">Receive Minimum</svelte:fragment>

		<svelte:fragment slot="main-value"
			>{formatTokenBigintToNumber({
				value: provider.receiveOutMinimum,
				unitName: $destinationToken.decimals,
				displayDecimals: $destinationToken.decimals
			})} $destinationToken.symbol</svelte:fragment
		>
	</ModalValue>
{/if}
