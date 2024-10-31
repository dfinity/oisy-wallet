<script lang="ts">
	import { anyBalanceNonZero } from '$lib/derived/balances.derived';
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	let totalUsd: number;
	$: totalUsd = sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi);
</script>

<span class="flex flex-col gap-2">
	<output
		class={`break-all text-5xl font-bold ${totalUsd === 0 ? 'opacity-50' : 'opacity-100'} mt-8 inline-block`}
	>
		{#if $exchangeInitialized}
			{formatUSD({ value: totalUsd })}
		{:else}
			<span class="animate-pulse">{formatUSD({ value: 0 })}</span>
		{/if}
	</output>
	<span class="max-w-48 text-xl font-medium text-onahau sm:max-w-none">
		{$anyBalanceNonZero ? $i18n.hero.text.available_balance : $i18n.hero.text.top_up}
	</span>
</span>
