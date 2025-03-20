<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import { formatTokenAmount } from '$lib/utils/format.utils';

	export let feeAmount: bigint | undefined = undefined;
	export let symbol: string;
	export let decimals: number;
	export let exchangeRate: number | undefined = undefined;
	export let displayExchangeRate = true;
	export let zeroAmountLabel: string | undefined = undefined;

	let formattedFeeAmount: string | undefined;
	$: formattedFeeAmount = nonNullish(feeAmount)
		? formatTokenAmount({ value: feeAmount, unitName: decimals, displayDecimals: decimals })
		: undefined;
</script>

<ConvertAmountDisplay
	amount={formattedFeeAmount}
	{exchangeRate}
	{symbol}
	{zeroAmountLabel}
	{displayExchangeRate}
	><slot slot="label" name="label" />
</ConvertAmountDisplay>
