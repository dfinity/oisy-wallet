<script lang="ts">
	import type { TokenWithFinancials } from '$lib/types/token';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';

	export let token: TokenWithFinancials;
</script>

<output class="break-all">
	{#if $exchangeInitialized}
		{#if nonNullish(token.usdValue)}
			{formatUSD(token.usdValue, { notation: 'compact' })}
		{:else}
			{formatUSD(0, { minFraction: 0, maxFraction: 0 }).replace('0', '-')}
		{/if}
	{:else}
		&ZeroWidthSpace;
	{/if}
</output>
