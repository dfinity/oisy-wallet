<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount = undefined;
	export let receiveAmount: number | undefined = undefined;

	const { sourceToken, sourceTokenExchangeRate, destinationToken, destinationTokenExchangeRate } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

{#if nonNullish(sendAmount)}
	<ConvertAmountDisplay
		amount={sendAmount}
		symbol={$sourceToken.symbol}
		exchangeRate={$sourceTokenExchangeRate}
	>
		<svelte:fragment slot="label">{$i18n.convert.text.amount_to_convert}</svelte:fragment>
	</ConvertAmountDisplay>
{/if}

{#if nonNullish(receiveAmount)}
	<ConvertAmountDisplay
		amount={receiveAmount}
		symbol={$destinationToken.symbol}
		exchangeRate={$destinationTokenExchangeRate}
	>
		<svelte:fragment slot="label">{$i18n.convert.text.amount_to_receive}</svelte:fragment>
	</ConvertAmountDisplay>
{/if}
