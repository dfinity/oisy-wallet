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
			decimals={$decimals}
			exchangeRate={$sendTokenExchangeRate}
			feeAmount={$fee}
			symbol={$symbol}
		>
			{#snippet label()}
				<span>{$i18n.fee.text.fee}</span>
			{/snippet}
		</FeeDisplay>
	{/if}

	{#if nonNullish($ataFee)}
		<FeeDisplay
			decimals={$decimals}
			exchangeRate={$sendTokenExchangeRate}
			feeAmount={$ataFee}
			symbol={$symbol}
		>
			{#snippet label()}
				<span>{$i18n.fee.text.ata_fee}</span>
			{/snippet}
		</FeeDisplay>
	{/if}
{/if}
