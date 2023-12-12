<script lang="ts">
	import type {Token, TokenId} from '$lib/types/token';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { formatUSD } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';

	export let token: Token;

	let usd: number;
	$: usd = usdValue({
		token,
		balances: $balancesStore,
		exchanges: $exchangeStore
	});

	let hasExchangeValue: boolean;
	$: hasExchangeValue = nonNullish($exchangeStore?.[token.id]);
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
