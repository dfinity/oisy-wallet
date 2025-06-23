<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import { formatToken } from '$lib/utils/format.utils';
	import { i18n } from '$lib/stores/i18n.store';

	export let feeAmount: bigint | undefined = undefined;
	export let symbol: string;
	export let decimals: number;
	export let exchangeRate: number | undefined = undefined;
	export let displayExchangeRate = true;
	export let zeroAmountLabel: string | undefined = undefined;

	let formattedFeeAmount: string | undefined;
	$: formattedFeeAmount = nonNullish(feeAmount)
		? formatToken({ value: feeAmount, unitName: decimals, displayDecimals: decimals, i18n: $i18n })
		: undefined;
</script>

<ConvertAmountDisplay
	amount={formattedFeeAmount}
	{exchangeRate}
	{symbol}
	{zeroAmountLabel}
	{displayExchangeRate}
>
	<slot slot="label" name="label" />
</ConvertAmountDisplay>
