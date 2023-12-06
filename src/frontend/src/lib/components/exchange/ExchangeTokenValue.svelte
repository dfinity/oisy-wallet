<script lang="ts">
	import type { TokenId } from '$lib/types/token';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';

	export let tokenId: TokenId;

	let usd: number;
	$: usd = usdValue({
		tokenId,
		balances: $balancesStore,
		exchanges: $exchangeStore
	});

	let hasExchangeValue: boolean;
	$: hasExchangeValue = nonNullish($exchangeStore?.[tokenId]);
</script>

<output class="break-all">
	{#if $exchangeInitialized}
		{#if hasExchangeValue}
			{formatUSD(usd)}
		{:else}
			{formatUSD(0, { minFraction: 0, maxFraction: 0 }).replace('0', '-')}
		{/if}
	{:else}
		&ZeroWidthSpace;
	{/if}
</output>
