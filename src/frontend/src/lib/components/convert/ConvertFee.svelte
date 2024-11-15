<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { BigNumber } from '@ethersproject/bignumber';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import { formatToken } from '$lib/utils/format.utils';

	export let feeAmount: bigint | undefined = undefined;
	export let symbol: string;
	export let decimals: number;
	export let exchangeRate: number | undefined = undefined;
	export let zeroAmountLabel: string | undefined = undefined;

	let formattedFeeAmount: number | undefined;
	$: formattedFeeAmount = nonNullish(feeAmount)
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

<ConvertAmountDisplay amount={formattedFeeAmount} {exchangeRate} {symbol} {zeroAmountLabel}
	><slot slot="label" name="label" />
</ConvertAmountDisplay>
