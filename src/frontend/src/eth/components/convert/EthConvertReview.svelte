<script lang="ts">
	import { Html } from '@dfinity/gix-components';
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import ConvertReview from '$lib/components/convert/ConvertReview.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;
	export let receiveAmount: number | undefined;

	const { maxGasFee, feeSymbolStore, feeDecimalsStore }: FeeContext =
		getContext<FeeContext>(FEE_CONTEXT_KEY);

	const { sourceTokenExchangeRate } = getContext<ConvertContext>(CONVERT_CONTEXT_KEY);
</script>

<ConvertReview on:icConvert on:icBack {sendAmount} {receiveAmount}>
	{#if nonNullish($feeSymbolStore) && nonNullish($feeDecimalsStore) && nonNullish($maxGasFee)}
		<FeeDisplay
			slot="fee"
			feeAmount={$maxGasFee.toBigInt()}
			decimals={$feeDecimalsStore}
			symbol={$feeSymbolStore}
			exchangeRate={$sourceTokenExchangeRate}
		>
			<Html slot="label" text={$i18n.fee.text.convert_fee} />
		</FeeDisplay>
	{/if}

	<div slot="info-message" class="mt-4">
		<MessageBox>{$i18n.convert.text.cketh_conversions_may_take}</MessageBox>
	</div>

	<slot name="cancel" slot="cancel" />
</ConvertReview>
