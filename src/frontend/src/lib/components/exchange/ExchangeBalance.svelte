<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized, exchanges } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { networkTokens } from '$lib/derived/network-tokens.derived';

	let totalUsd: number;
	$: totalUsd = $networkTokens.reduce(
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

<span class="text-off-white mb-6 block">
	<output
		class={`break-all font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} inline-block mt-8`}
		style="font-size: calc(2 * var(--font-size-h1)); line-height: 0.95;"
	>
		{#if $exchangeInitialized}
			{formatUSD(totalUsd)}
		{:else}
			&ZeroWidthSpace;
		{/if}
	</output>
</span>
