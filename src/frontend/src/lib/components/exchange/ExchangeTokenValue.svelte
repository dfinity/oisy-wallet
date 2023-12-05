<script lang="ts">
	import type { TokenId } from '$lib/types/token';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { formatUSD } from '$lib/utils/format.utils';

	export let tokenId: TokenId;

	let usd: number;
	$: usd = usdValue({
		tokenId,
		balances: $balancesStore,
		exchanges: $exchangeStore
	});
</script>

<output class="break-all">
	{#if $exchangeInitialized}
		{formatUSD(usd, { symbol: true })}
	{:else}
		&ZeroWidthSpace;
	{/if}
</output>
