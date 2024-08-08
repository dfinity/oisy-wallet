<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { combinedDerivedEnabledNetworkTokensUi } from '$lib/derived/network-tokens.derived';

	let totalUsd: number;
	$: totalUsd = $combinedDerivedEnabledNetworkTokensUi.reduce(
		(acc, token) => acc + (token.usdBalance ?? 0),
		0
	);
</script>

<span class="text-off-white block">
	<output
		class={`break-all text-5xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			&ZeroWidthSpace;
		{/if}
	</output>
</span>
