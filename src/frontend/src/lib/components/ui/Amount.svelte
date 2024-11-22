<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: BigNumber;
	export let decimals: number;
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

<data value={detailedValue} class:text-success={formatPositiveAmount && amount.gt(0)}>
	{displayValue}
</data>
