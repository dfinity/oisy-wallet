<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import { type FeeContext, SOL_FEE_CONTEXT_KEY } from '$sol/stores/sol-fee.store';

	const {
		feeStore: fee,
		ataFeeStore: ataFee,
		feeDecimalsStore: decimals,
		feeSymbolStore: symbol
	}: FeeContext = getContext<FeeContext>(SOL_FEE_CONTEXT_KEY);

	const { sendTokenId, sendTokenExchangeRate } = getContext<SendContext>(SEND_CONTEXT_KEY);
</script>

{#if nonNullish($symbol) && nonNullish($sendTokenId) && nonNullish($decimals)}
	{#if nonNullish($fee)}
		<FeeDisplay
			feeAmount={$fee}
			decimals={$decimals}
			symbol={$symbol}
			exchangeRate={$sendTokenExchangeRate}
		>
			<span slot="label">{$i18n.fee.text.fee}</span>
		</FeeDisplay>
	{/if}

	{#if nonNullish($ataFee)}
		<FeeDisplay
			feeAmount={$ataFee}
			decimals={$decimals}
			symbol={$symbol}
			exchangeRate={$sendTokenExchangeRate}
		>
			<span slot="label">{$i18n.fee.text.ata_fee}</span>
		</FeeDisplay>
	{/if}
{/if}
