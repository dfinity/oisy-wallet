<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	interface Props {
		label?: Snippet;
	}

	let { label }: Props = $props();

	const { maxGasFee, feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);
</script>

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<FeeDisplay
		decimals={$feeDecimalsStore}
		exchangeRate={$feeExchangeRateStore}
		feeAmount={$maxGasFee}
		{label}
		symbol={$feeSymbolStore}
	/>
{/if}
