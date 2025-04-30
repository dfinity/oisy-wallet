<script lang="ts">
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: bigint;
	export let decimals: number;
	export let symbol: string;
	export let formatPositiveAmount = false;

	let detailedValue: string;
	$: detailedValue = formatToken({
		value: amount,
		unitName: decimals,
		displayDecimals: decimals
	});

	let displayValue: string;
	$: displayValue = formatToken({
		value: amount,
		unitName: decimals,
		displayDecimals: EIGHT_DECIMALS,
		showPlusSign: formatPositiveAmount
	});
</script>

<span class:text-success-primary={formatPositiveAmount && amount > ZERO}>
	<data value={detailedValue}>
		{displayValue}
	</data>
	{symbol}
</span>
