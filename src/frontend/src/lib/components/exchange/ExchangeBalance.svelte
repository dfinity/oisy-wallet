<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { sumTokensUsdBalance } from '$lib/utils/tokens.utils';

	let totalUsd: number;
	$: totalUsd = sumTokensUsdBalance($combinedDerivedSortedNetworkTokensUi);
</script>

<span class="text-off-white block">
	<output
		class={`break-all text-5xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			<span class="animate-pulse">{formatUSD(0)}</span>
		{/if}
	</output>
</span>
