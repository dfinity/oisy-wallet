<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { type Snippet, getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	interface Props {
		label?: Snippet;
		isApproveNeeded?: boolean;
	}

	let { label, isApproveNeeded }: Props = $props();

	const { maxGasFee, feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// TODO: improve this fee calculation at the source, depending on the method (or methods) that is going to be used
	const feeAmount = $derived(
		nonNullish(isApproveNeeded) && nonNullish($maxGasFee) ? $maxGasFee * 2n : $maxGasFee
	);
</script>

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<FeeDisplay
		decimals={$feeDecimalsStore}
		exchangeRate={$feeExchangeRateStore}
		{feeAmount}
		{label}
		symbol={$feeSymbolStore}
	/>
{/if}
