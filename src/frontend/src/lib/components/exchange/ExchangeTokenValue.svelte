<script lang="ts">
	import type { TokenUi } from '$lib/types/token';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';

	export let token: TokenUi;

	const noBalance = formatUSD(0, { minFraction: 0, maxFraction: 0 }).replace('0', '-');
</script>

<output class="break-all">
	{#if $exchangeInitialized}
		{#if nonNullish(token.usdBalance)}
			{formatUSD(token.usdBalance)}
		{:else}
			{noBalance}
		{/if}
	{:else}
		<span class="animate-pulse">{noBalance}</span>
	{/if}
</output>
