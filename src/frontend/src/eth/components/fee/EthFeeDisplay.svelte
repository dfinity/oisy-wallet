<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import { maxGasFee as maxGasFeeUtils } from '$eth/utils/fee.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	interface Props {
		label?: Snippet;
		isApproveNeeded?: boolean;
		gas?: bigint;
	}

	let { label, isApproveNeeded, gas }: Props = $props();

	const {
		feeStore,
		maxGasFee,
		feeSymbolStore,
		feeDecimalsStore,
		feeExchangeRateStore
	}: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	// The gas limit that will be signed is not always the one OISY estimated: a WalletConnect
	// request may carry its own, and the maximum fee has to be priced on the limit that is signed.
	const maxFee = $derived(
		nonNullish(gas) && nonNullish($feeStore) ? maxGasFeeUtils({ ...$feeStore, gas }) : $maxGasFee
	);

	// TODO: improve this fee calculation at the source, depending on the method (or methods) that is going to be used
	const feeAmount = $derived(
		nonNullish(isApproveNeeded) && nonNullish(maxFee) && isApproveNeeded ? maxFee * 2n : maxFee
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
