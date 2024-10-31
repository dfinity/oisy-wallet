<script lang="ts">
	import { exchangeInitialized } from '$lib/derived/exchange.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { totalUsdBalance, totalUsdBalanceZero } from '$lib/derived/exchange-balances.derived';
</script>

<span class="flex flex-col gap-2">
	<output
		class={`break-all text-5xl font-bold ${$totalUsdBalanceZero ? 'opacity-50' : 'opacity-100'} mt-8 inline-block`}
	>
		{#if $exchangeInitialized}
			{formatUSD({ value: $totalUsdBalance })}
		{:else}
			<span class="animate-pulse">{formatUSD({ value: 0 })}</span>
		{/if}
	</output>
	<span class="text-xl font-medium text-onahau">
		{$totalUsdBalanceZero ? $i18n.hero.text.top_up : $i18n.hero.text.available_balance}
	</span>
</span>
