<script lang="ts">
	import { EIGHT_DECIMALS, ZERO } from '$lib/constants/app.constants';
	import { formatToken } from '$lib/utils/format.utils';
	import { i18n } from '$lib/stores/i18n.store';

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
			displayDecimals: decimals,
			i18n: $i18n
		})
	);

	const displayValue = $derived(
		formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS,
			showPlusSign: formatPositiveAmount,
			i18n: $i18n
		})
	);
</script>

<span class:text-success-primary={formatPositiveAmount && amount > ZERO}>
	<data value={detailedValue}>
		{displayValue}
	</data>
	{symbol}
</span>
