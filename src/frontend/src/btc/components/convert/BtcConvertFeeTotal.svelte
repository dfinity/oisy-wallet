<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import ConvertFeeTotal from '$lib/components/convert/ConvertFeeTotal.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';

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

<ConvertFeeTotal
	feeAmount={totalFee}
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
/>
