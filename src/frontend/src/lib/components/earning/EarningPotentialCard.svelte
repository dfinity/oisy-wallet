<script lang="ts">
	import { slide } from 'svelte/transition';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { highestEarningPotentialUsd } from '$lib/derived/earning.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	let infoExpanded = $state(false);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="flex items-center justify-center gap-0.5">
			<div class="text-sm font-bold">{$i18n.stake.text.earning_potential}</div>

			<button class="text-tertiary" onclick={() => (infoExpanded = !infoExpanded)}>
				<IconHelp size="18" />
			</button>
		</div>

		{#if infoExpanded}
			<div class="w-full text-sm text-tertiary" transition:slide>
				{$i18n.stake.text.earning_potential_hint}
			</div>
		{/if}

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount
				showAsError
				showPlusSign={$highestEarningPotentialUsd > 0}
				value={$highestEarningPotentialUsd}
			/>
		</div>

		<div class="text-sm sm:text-base">
			{$i18n.stake.text.unproductive_assets}:
			{formatCurrency({
				value: $enabledMainnetFungibleTokensUsdBalance,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>
	{/snippet}
</StakeContentCard>
