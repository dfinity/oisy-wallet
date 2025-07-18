<script lang="ts">
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		amount: bigint;
		decimals: number;
		symbol: string;
		formatPositiveAmount?: boolean;
	}

	let { amount, decimals, symbol, formatPositiveAmount = false }: Props = $props();

	const detailedValue = $derived(
		formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: decimals
		})
	);

	const displayValue = $derived(
		formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS,
			showPlusSign: formatPositiveAmount
		})
	);
</script>

<span class:text-success-primary={formatPositiveAmount && amount > ZERO}>
	<data value={detailedValue}>
		{displayValue}
	</data>
	{symbol}
</span>
