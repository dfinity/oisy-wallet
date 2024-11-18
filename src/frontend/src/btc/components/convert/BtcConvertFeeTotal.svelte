<script lang="ts">
	import { getContext } from 'svelte';
	import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import ConvertFeeTotal from '$lib/components/convert/ConvertFeeTotal.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';

	export let totalFee: bigint | undefined = 0n;

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	$: totalFee =
		BTC_CONVERT_FEE +
		($ckBtcMinterInfoStore?.[$destinationToken.id]?.data.kyt_fee ?? 0n) +
		($storeUtxosFeeData?.utxosFee?.feeSatoshis ?? 0n);
</script>

<ConvertFeeTotal
	feeAmount={totalFee}
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
/>
