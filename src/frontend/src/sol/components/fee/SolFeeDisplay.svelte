<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { slide } from 'svelte/transition';
	import ExchangeAmountDisplay from '$lib/components/exchange/ExchangeAmountDisplay.svelte';
	import Value from '$lib/components/ui/Value.svelte';
	import { SLIDE_DURATION } from '$lib/constants/transition.constants';
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
		<Value ref="fee">
			<svelte:fragment slot="label">{$i18n.fee.text.fee}</svelte:fragment>

			<ExchangeAmountDisplay
				amount={$fee}
				decimals={$decimals}
				symbol={$symbol}
				exchangeRate={$sendTokenExchangeRate}
			/>
		</Value>
	{/if}
	{#if nonNullish($ataFee)}
		<div transition:slide={SLIDE_DURATION}>
			<Value ref="ataFee">
				<svelte:fragment slot="label">{$i18n.fee.text.ata_fee}</svelte:fragment>

				<ExchangeAmountDisplay
					amount={$ataFee}
					decimals={$decimals}
					symbol={$symbol}
					exchangeRate={$sendTokenExchangeRate}
				/>
			</Value>
		</div>
	{/if}
{/if}
