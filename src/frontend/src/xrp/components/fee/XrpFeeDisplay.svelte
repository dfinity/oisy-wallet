<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { type XrpFeeContext, XRP_FEE_CONTEXT_KEY } from '$xrp/stores/xrp-fee.store';

	const {
		feeStore: fee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol,
		feeExchangeRateStore: exchangeRate
	}: XrpFeeContext = getContext<XrpFeeContext>(XRP_FEE_CONTEXT_KEY);

	const { sendTokenId } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

{#if nonNullish($symbol) && nonNullish($sendTokenId) && nonNullish($decimals) && nonNullish($fee)}
	<FeeDisplay decimals={$decimals} exchangeRate={$exchangeRate} feeAmount={$fee} symbol={$symbol}>
		{#snippet label()}
			<span>{$i18n.fee.text.fee}</span>
		{/snippet}
	</FeeDisplay>
{/if}
