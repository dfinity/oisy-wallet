<script lang="ts">
	import { getContext } from 'svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	const { loaded } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	let totalUsd: number;
	$: totalUsd = sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi);
</script>

<span class="gap-2 flex flex-col items-center">
	<output class={`mt-8 text-5xl font-bold inline-block break-all`}>
		{#if $loaded}
			{formatUSD({ value: totalUsd })}
		{:else}
			<span class="animate-pulse">{formatUSD({ value: 0 })}</span>
		{/if}
	</output>
	<span class="max-w-48 text-xl font-medium text-brand-secondary-alt sm:max-w-none">
		{$allBalancesZero ? $i18n.hero.text.top_up : $i18n.hero.text.available_balance}
	</span>
</span>
