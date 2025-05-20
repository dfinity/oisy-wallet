<script lang="ts">
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
	import { combinedDerivedSortedNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatUSD } from '$lib/utils/format.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		hideBalance?: boolean;
	}

	let { hideBalance }: Props = $props();

	const { loaded } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	const totalUsd = $derived(sumTokensUiUsdBalance($combinedDerivedSortedNetworkTokensUi));
</script>

<span class="flex flex-col items-center gap-2">
	<output class="mt-8 inline-block break-all text-5xl font-bold">
		{#if $loaded}
			{#if hideBalance}
				<IconDots variant="lg" times={6} styleClass="h-12" />
			{:else}
				{formatUSD({ value: totalUsd })}
			{/if}
		{:else}
			<span class="animate-pulse">
				{#if hideBalance}
					<IconDots variant="lg" times={6} styleClass="h-12" />
				{:else}
					{formatUSD({ value: 0 })}
				{/if}
			</span>
		{/if}
	</output>
	<span class="max-w-48 text-xl font-medium text-brand-secondary-alt sm:max-w-none">
		{$allBalancesZero ? $i18n.hero.text.top_up : $i18n.hero.text.available_balance}
	</span>
</span>
