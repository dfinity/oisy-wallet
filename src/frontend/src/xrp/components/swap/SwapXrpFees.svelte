<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { type XrpFeeContext, XRP_FEE_CONTEXT_KEY } from '$xrp/stores/xrp-fee.store';

	// Not `XrpFeeDisplay`, which reads the send context that only the send wizard sets.
	const {
		feeStore: fee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol,
		feeExchangeRateStore: exchangeRate
	}: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);
</script>

<!-- A NEAR Intents quote prices the provider's fees into the receive amount, so the only cost
     paid on top is the network fee of the deposit — the row the SOL, EVM and BTC wizards show for
     this provider. -->
{#if nonNullish($symbol) && nonNullish($decimals) && nonNullish($fee)}
	<FeeDisplay decimals={$decimals} exchangeRate={$exchangeRate} feeAmount={$fee} symbol={$symbol}>
		{#snippet label()}
			<span>{$i18n.fee.text.network_fee}</span>
		{/snippet}
	</FeeDisplay>
{/if}
