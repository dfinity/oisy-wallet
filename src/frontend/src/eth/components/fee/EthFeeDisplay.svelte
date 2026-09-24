<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import {
		estimatedGasFee as estimatedGasFeeUtils,
		maxGasFee as maxGasFeeUtils
	} from '$eth/utils/fee.utils';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	interface Props {
		label?: Snippet;
		isApproveNeeded?: boolean;
		gas?: bigint;
		// Show what the transaction is expected to cost rather than the ceiling it authorises.
		// Opt-in, so the flows that still quote a maximum are unaffected.
		estimated?: boolean;
	}

	let { label, isApproveNeeded, gas, estimated = false }: Props = $props();

	const {
		feeStore,
		maxGasFee,
		estimatedGasFee,
		feeSymbolStore,
		feeDecimalsStore,
		feeExchangeRateStore
	}: EthFeeContext = getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);

	const feeUtil = $derived(estimated ? estimatedGasFeeUtils : maxGasFeeUtils);

	const contextFee = $derived(estimated ? $estimatedGasFee : $maxGasFee);

	// The gas limit that will be signed is not always the one OISY estimated: a WalletConnect
	// request may carry its own, and the fee has to be priced on the limit that is signed.
	// Whether this is a ceiling or an expected cost depends on `estimated`, hence the neutral name.
	const fee = $derived(
		nonNullish(gas) && nonNullish($feeStore) ? feeUtil({ ...$feeStore, gas }) : contextFee
	);

	// TODO: improve this fee calculation at the source, depending on the method (or methods) that is going to be used
	const feeAmount = $derived(
		nonNullish(isApproveNeeded) && nonNullish(fee) && isApproveNeeded ? fee * 2n : fee
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
