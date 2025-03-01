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

	export let totalFee: bigint | undefined = undefined;

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let kytFee: bigint | undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$destinationToken.id]?.data.kyt_fee;

	let satoshisFee: bigint | undefined;
	$: satoshisFee = $storeUtxosFeeData?.utxosFee?.feeSatoshis;

	$: totalFee =
		nonNullish(kytFee) && nonNullish(satoshisFee)
			? BTC_CONVERT_FEE + kytFee + satoshisFee
			: undefined;
</script>

<ModalExpandableValues>
	<ConvertFeeTotal
		slot="list-header"
		feeAmount={totalFee}
		decimals={$sourceToken.decimals}
		exchangeRate={$sourceTokenExchangeRate}
	/>

	<svelte:fragment slot="list-items">
		<FeeDisplay
			feeAmount={BTC_CONVERT_FEE}
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			symbol={$sourceToken.symbol}
			zeroAmountLabel={$i18n.fee.text.zero_fee}
		>
			<svelte:fragment slot="label">{$i18n.fee.text.convert_fee}</svelte:fragment>
		</FeeDisplay>

		<FeeDisplay
			feeAmount={kytFee}
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			symbol={$sourceToken.symbol}
		>
			<svelte:fragment slot="label">{$i18n.fee.text.convert_inter_network_fee}</svelte:fragment>
		</FeeDisplay>

		<FeeDisplay
			feeAmount={satoshisFee}
			decimals={$sourceToken.decimals}
			exchangeRate={$sourceTokenExchangeRate}
			symbol={$sourceToken.symbol}
		>
			<svelte:fragment slot="label">{$i18n.fee.text.convert_btc_network_fee}</svelte:fragment>
		</FeeDisplay>
	</svelte:fragment>
</ModalExpandableValues>
