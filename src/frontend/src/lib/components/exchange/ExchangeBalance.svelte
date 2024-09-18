<script lang="ts">
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { formatUSD } from '$lib/utils/format.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	let totalUsd: number;
	$: totalUsd = sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi);
</script>

<span class="block text-off-white">
	<output
		class={`break-all text-5xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} mt-8 inline-block`}
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			<span class="animate-pulse">{formatUSD(0)}</span>
		{/if}
	</output>
</span>
