<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	export let amount: BigNumber;
	export let decimals: number;

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
		displayDecimals: EIGHT_DECIMALS
	});
</script>

<data value={detailedValue}>{displayValue}</data>
