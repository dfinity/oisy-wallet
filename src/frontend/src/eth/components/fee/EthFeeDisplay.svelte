<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext, type Snippet } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import {
		estimatedGasFee as estimatedGasFeeUtils,
		formatGasFeeInGwei,
		maxGasFee as maxGasFeeUtils
	} from '$eth/utils/fee.utils';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';

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

	// An estimate is quoted in gwei, for the reason the priority options are: in the token's own
	// units the tiers separate in the eighth decimal, so the number the user is choosing between
	// is invisible. A ceiling keeps the token, since nothing is being compared against it.
	const gweiAmount = $derived(
		nonNullish(feeAmount)
			? formatGasFeeInGwei({ value: feeAmount, language: $currentLanguage })
			: undefined
	);

	const tokenAmount = $derived(
		nonNullish(feeAmount) && nonNullish($feeDecimalsStore)
			? formatToken({
					value: feeAmount,
					displayDecimals: $feeDecimalsStore,
					unitName: $feeDecimalsStore
				})
			: undefined
	);
</script>

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	{#if estimated}
		<ConvertAmountDisplay
			amount={gweiAmount}
			exchangeAmount={tokenAmount}
			exchangeRate={$feeExchangeRateStore}
			{label}
			symbol={$i18n.fee.text.gwei}
		/>
	{:else}
		<FeeDisplay
			decimals={$feeDecimalsStore}
			exchangeRate={$feeExchangeRateStore}
			{feeAmount}
			{label}
			symbol={$feeSymbolStore}
		/>
	{/if}
{/if}
