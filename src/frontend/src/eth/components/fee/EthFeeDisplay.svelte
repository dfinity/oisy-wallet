<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { ETH_FEE_CONTEXT_KEY, type EthFeeContext } from '$eth/stores/eth-fee.store';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';

	const { maxGasFee, feeSymbolStore, feeDecimalsStore, feeExchangeRateStore }: EthFeeContext =
		getContext<EthFeeContext>(ETH_FEE_CONTEXT_KEY);
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
