<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { BigNumber } from '@ethersproject/bignumber';
	import { fade } from 'svelte/transition';
	import { EIGHT_DECIMALS } from '$lib/constants/app.constants';
	import { SWAP_TOTAL_FEE_THRESHOLD } from '$lib/constants/swap.constants';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { formatToken, formatUSD } from '$lib/utils/format.utils';

	export let fee: BigNumber;
	export let decimals: number;
	export let symbol: string;
	export let exchangeRate: number | undefined;

	let usdFee: number;
	$: usdFee =
		nonNullish(decimals) && nonNullish(fee) && nonNullish(exchangeRate)
			? usdValue({
					decimals,
					balance: fee,
					exchangeRate
				})
			: 0;
</script>

{#if nonNullish(fee) && nonNullish(decimals) && nonNullish(symbol)}
	<div transition:fade class="flex gap-4">
		{formatToken({
			value: fee,
			unitName: decimals,
			displayDecimals: EIGHT_DECIMALS
		})}
		{symbol}

		<div class="text-tertiary">
			{#if usdFee < SWAP_TOTAL_FEE_THRESHOLD}
				{`( < ${formatUSD({
					value: SWAP_TOTAL_FEE_THRESHOLD
				})} )`}
			{:else}
				{`( ${formatUSD({ value: usdFee })} )`}
			{/if}
		</div>
	</div>
{/if}
