<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
	import { formatToken } from '$lib/utils/format.utils';

	interface Props {
		feeAmount?: bigint;
		symbol: string;
		decimals: number;
		// Defaults to every decimal of the token.
		displayDecimals?: number;
		exchangeRate?: number;
		displayExchangeRate?: boolean;
		zeroAmountLabel?: string;
		label?: Snippet;
	}

	let {
		feeAmount,
		symbol,
		decimals,
		displayDecimals = decimals,
		exchangeRate,
		displayExchangeRate = true,
		zeroAmountLabel,
		label
	}: Props = $props();

	let formattedFeeAmount = $derived(
		nonNullish(feeAmount)
			? formatToken({ value: feeAmount, unitName: decimals, displayDecimals })
			: undefined
	);
</script>

<ConvertAmountDisplay
	amount={formattedFeeAmount}
	{displayExchangeRate}
	{exchangeRate}
	{label}
	{symbol}
	{zeroAmountLabel}
/>
