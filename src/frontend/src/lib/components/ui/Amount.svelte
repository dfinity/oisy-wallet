<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: BigNumber;
	export let decimals: number;
	export let symbol: string;
	export let formatPositiveAmount = false;

	let detailedValue: string;
	$: detailedValue = formatToken({
		value: amount.toBigInt(),
		unitName: decimals,
		displayDecimals: decimals
	});

	let displayValue: string;
	$: displayValue = formatToken({
		value: amount.toBigInt(),
		unitName: decimals,
		displayDecimals: EIGHT_DECIMALS,
		showPlusSign: formatPositiveAmount
	});
</script>

<span class:text-success-primary={formatPositiveAmount && amount.gt(0)}>
	<data value={detailedValue}>
		{displayValue}
	</data>
	{symbol}
</span>
