<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import type { TokenFinancialData } from '$lib/types/token';
	import { formatUSD } from '$lib/utils/format.utils';

	export let balance: TokenFinancialData['balance'];
	export let usdBalance: TokenFinancialData['usdBalance'];
	export let nullishBalanceMessage = '-';
</script>

<output class="break-all">
	{#if nonNullish(balance) && nonNullish(usdBalance)}
		{formatUSD({ value: usdBalance })}
	{:else if isNullish(balance)}
		<span class:animate-pulse={isNullish(balance)}>{nullishBalanceMessage}</span>
	{:else}
		<span class:animate-pulse={isNullish(balance)}>n/a</span>
	{/if}
</output>
