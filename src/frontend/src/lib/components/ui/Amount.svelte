<script lang="ts">
	import type { BigNumber } from '@ethersproject/bignumber';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { tokenWithFallback } from '$lib/derived/token.derived';
	import { formatToken } from '$lib/utils/format.utils';
	import { AMOUNT_DATA } from '$lib/constants/test-ids.constants';

	export let amount: BigNumber;

	let detailedValue: string;
	$: detailedValue = formatToken({
		value: amount,
		unitName: $tokenWithFallback.decimals,
		displayDecimals: $tokenWithFallback.decimals
	});

	let displayValue: string;
	$: displayValue = formatToken({
		value: amount,
		unitName: $tokenWithFallback.decimals,
		displayDecimals: EIGHT_DECIMALS
	});
</script>

<data data-tid={AMOUNT_DATA} value={"1.0"}>{"1.0"}</data>
