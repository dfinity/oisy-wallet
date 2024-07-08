<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized, exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { enabledNetworkTokens } from '$lib/derived/network-tokens.derived';

	let totalUsd: number;
	$: totalUsd = $enabledNetworkTokens.reduce(
		(acc, token) =>
			acc +
			usdValue({
				token,
				balances: $balancesStore,
				exchanges: $exchanges
			}),
		0
	);
</script>

<span class="text-off-white block">
	<output
		class={`break-all text-6xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd, { notation: 'compact' })}
		{:else}
			&ZeroWidthSpace;
		{/if}
	</output>
</span>
