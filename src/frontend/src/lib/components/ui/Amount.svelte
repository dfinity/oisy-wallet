<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import type { Token } from '$lib/types/token';
	import { formatToken } from '$lib/utils/format.utils';

	export let token: Token;
	export let amount: BigNumber;

	let detailedValue: string;
	$: detailedValue = formatToken({
		value: amount,
		unitName: token.decimals,
		displayDecimals: token.decimals
	});

	let displayValue: string;
	$: displayValue = formatToken({
		value: amount,
		unitName: token.decimals,
		displayDecimals: EIGHT_DECIMALS,
		trailingZeros: false
	});
</script>

<data value={detailedValue}>{displayValue}</data>
