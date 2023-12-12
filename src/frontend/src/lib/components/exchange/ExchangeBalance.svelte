<script lang="ts">
	import { formatUSD } from '$lib/utils/format.utils';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { balancesStore } from '$lib/stores/balances.store';
	import { exchangeStore } from '$lib/stores/exchange.store';
	import { usdValue } from '$lib/utils/exchange.utils';
	import { tokens } from '$lib/derived/tokens.derived';

	let totalUsd: number;
	$: totalUsd = $tokens.reduce(
		(acc, token) =>
			acc +
			usdValue({
				token,
				balances: $balancesStore,
				exchanges: $exchangeStore
			}),
		0
	);
</script>

<span class="text-off-white">
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
