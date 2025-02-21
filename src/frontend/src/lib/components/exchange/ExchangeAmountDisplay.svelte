<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';

	export let amount: BigNumber;
	export let decimals: number;
	export let symbol: string;
	export let exchangeRate: number | undefined;

	let usdAmount: number;
	$: usdAmount =
		nonNullish(decimals) && nonNullish(amount) && nonNullish(exchangeRate)
			? usdValue({
					decimals,
					balance: amount,
					exchangeRate
				})
			: 0;
</script>

{#if nonNullish(amount) && nonNullish(decimals) && nonNullish(symbol)}
	<div transition:fade class="flex gap-4">
		{formatToken({
			value: amount,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS
		})}
		{symbol}

		<div class="text-tertiary">
			{#if usdAmount < SWAP_TOTAL_FEE_THRESHOLD}
				{`( < ${formatUSD({
					value: SWAP_TOTAL_FEE_THRESHOLD
				})} )`}
			{:else}
				{`( ${formatUSD({ value: usdAmount })} )`}
			{/if}
		</div>
	</div>
{/if}
