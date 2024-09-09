<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import type { TokenUi } from '$lib/types/token';
	import { formatUSD } from '$lib/utils/format.utils';

	export let token: TokenUi;
</script>

<output class="break-all">
	{#if $exchangeInitialized}
		{#if nonNullish(token.usdBalance)}
			{formatUSD(token.usdBalance)}
		{:else}
			{formatUSD(0, { minFraction: 0, maxFraction: 0 }).replace('0', '-')}
		{/if}
	{:else}
		&ZeroWidthSpace;
	{/if}
</output>
