<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
	import ConvertValue from '$lib/components/convert/ConvertValue.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatToken } from '$lib/utils/format.utils';

	export let feeAmount: bigint | undefined = undefined;
	export let decimals: number;
	export let exchangeRate: number | undefined = undefined;

	let formattedAmount: number | undefined;
	$: formattedAmount = nonNullish(feeAmount)
		? // TODO: create a util for formating and converting a bigint to number
			Number(
				formatToken({
					value: BigNumber.from(feeAmount),
					unitName: decimals,
					displayDecimals: decimals
				})
			)
		: undefined;
</script>

<ConvertValue>
	<svelte:fragment slot="label">{$i18n.fee.text.total_fee}</svelte:fragment>

	<svelte:fragment slot="main-value">
		<ConvertAmountExchange amount={formattedAmount} {exchangeRate} />
	</svelte:fragment>
</ConvertValue>
