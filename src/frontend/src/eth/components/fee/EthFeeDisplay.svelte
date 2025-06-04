<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	const { maxGasFee, feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: FeeContext =
		getContext<FeeContext>(FEE_CONTEXT_KEY);
</script>

{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore)}
	<FeeDisplay
		feeAmount={$maxGasFee}
		decimals={$feeDecimalsStore}
		symbol={$feeSymbolStore}
		exchangeRate={$feeExchangeRateStore}
	>
		<slot slot="label" name="label" />
	</FeeDisplay>
{/if}
