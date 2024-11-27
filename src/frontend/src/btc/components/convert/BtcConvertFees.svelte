<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import { BTC_CONVERT_FEE } from '$btc/constants/btc.constants';
	import { UTXOS_FEE_CONTEXT_KEY, type UtxosFeeContext } from '$btc/stores/utxos-fee.store';
	import { ckBtcMinterInfoStore } from '$icp/stores/ckbtc.store';
	import ConvertFee from '$lib/components/convert/ConvertFee.svelte';
	import { CONVERT_CONTEXT_KEY, type ConvertContext } from '$lib/stores/convert.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';

	export let sendAmount: OptionAmount;

	const { sourceToken, sourceTokenExchangeRate, destinationToken } =
		getContext<ConvertContext>(CONVERT_CONTEXT_KEY);

	const { store: storeUtxosFeeData } = getContext<UtxosFeeContext>(UTXOS_FEE_CONTEXT_KEY);

	let kytFee: bigint | undefined;
	$: kytFee = $ckBtcMinterInfoStore?.[$destinationToken.id]?.data.kyt_fee;

	let satoshisFee: bigint | undefined;
	$: satoshisFee =
		isNullish(sendAmount) || Number(sendAmount) === 0
			? 0n
			: $storeUtxosFeeData?.utxosFee?.feeSatoshis;
</script>

<ConvertFee
	feeAmount={BTC_CONVERT_FEE}
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
	symbol={$sourceToken.symbol}
	zeroAmountLabel={$i18n.fee.text.zero_fee}
>
	<svelte:fragment slot="label">{$i18n.fee.text.convert_fee}</svelte:fragment>
</ConvertFee>

<ConvertFee
	feeAmount={kytFee}
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
	symbol={$sourceToken.symbol}
>
	<svelte:fragment slot="label">{$i18n.fee.text.convert_inter_network_fee}</svelte:fragment>
</ConvertFee>

<ConvertFee
	feeAmount={satoshisFee}
	decimals={$sourceToken.decimals}
	exchangeRate={$sourceTokenExchangeRate}
	symbol={$sourceToken.symbol}
>
	<svelte:fragment slot="label">{$i18n.fee.text.convert_btc_network_fee}</svelte:fragment>
</ConvertFee>
