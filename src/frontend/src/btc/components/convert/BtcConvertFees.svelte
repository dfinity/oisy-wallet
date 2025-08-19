<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import ConvertFeeTotal from '$lib/components/convert/ConvertFeeTotal.svelte';
	import FeeDisplay from '$lib/components/fee/FeeDisplay.svelte';
	import ModalExpandableValues from '$lib/components/ui/ModalExpandableValues.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		totalFee?: bigint;
	}

	let { totalFee = $bindable() }: Props = $props();

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let kytFee = $derived($ckBtcMinterInfoStore?.[$destinationToken.id]?.data.kyt_fee);

	let satoshisFee = $derived($storeUtxosFeeData?.utxosFee?.feeSatoshis);

	$effect(() => {
		totalFee =
			nonNullish(kytFee) && nonNullish(satoshisFee)
				? BTC_CONVERT_FEE + kytFee + satoshisFee
				: undefined;
	});
</script>

<ModalExpandableValues>
	{#snippet listHeader()}
		<ConvertFeeTotal
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			feeAmount={totalFee}
		/>
	{/snippet}

	{#snippet listItems()}
		<FeeDisplay
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			feeAmount={BTC_CONVERT_FEE}
			symbol={$sourceToken.symbol}
			zeroAmountLabel={$i18n.fee.text.zero_fee}
		>
			{#snippet label()}{$i18n.fee.text.convert_fee}{/snippet}
		</FeeDisplay>

		<FeeDisplay
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			feeAmount={kytFee}
			symbol={$sourceToken.symbol}
		>
			{#snippet label()}{$i18n.fee.text.convert_inter_network_fee}{/snippet}
		</FeeDisplay>

		<FeeDisplay
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			feeAmount={satoshisFee}
			symbol={$sourceToken.symbol}
		>
			{#snippet label()}{$i18n.fee.text.convert_btc_network_fee}{/snippet}
		</FeeDisplay>
	{/snippet}
</ModalExpandableValues>
