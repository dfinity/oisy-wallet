<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { SWAP_CONTEXT_KEY, type SwapContext } from '$lib/stores/swap.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';
	import { formatTokenBigintToNumber, formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { symbol } from 'zod';

	export let provider: Extract<SwapMappedResult, { provider: SwapProvider.ICP_SWAP }>;

	const { destinationToken, destinationTokenExchangeRate } =
		getContext<SwapContext>(SWAP_CONTEXT_KEY);

    console.log($destinationToken);

	const getUsdBalance = (amount: bigint, token: any): number =>
		nonNullish(amount) && nonNullish($destinationTokenExchangeRate)
			? formatTokenBigintToNumber({
					value: amount,
					unitName: token.decimals,
					displayDecimals: token.decimals
				})
			: 0;
</script>

{#if nonNullish(provider.receiveOutMinimum)}
	<ModalValue>
		<svelte:fragment slot="label">Receive Minimum</svelte:fragment>

		<svelte:fragment slot="main-value">{getUsdBalance(provider.receiveOutMinimum, destinationToken)}</svelte:fragment>
	</ModalValue>
{/if}
