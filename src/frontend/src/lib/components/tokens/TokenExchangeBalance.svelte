<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { TokenFinancialData } from '$lib/types/token';
	import { formatUSD } from '$lib/utils/format.utils';

	export let balance: TokenFinancialData['balance'];
	export let usdBalance: TokenFinancialData['usdBalance'];
</script>

<output class="break-all">
	{#if nonNullish(balance) && nonNullish(usdBalance)}
		{formatUSD({ value: usdBalance })}
	{:else}
		{formatUSD({ value: 0, options: { minFraction: 0, maxFraction: 0 } }).replace('0', '-')}
	{/if}
</output>
