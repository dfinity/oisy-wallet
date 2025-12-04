<script lang="ts">
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { highestEarningPotentialUsd } from '$lib/derived/earning.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm font-bold">{$i18n.stake.text.earning_potential}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount
				showPlusSign={$highestEarningPotentialUsd > 0}
				value={$highestEarningPotentialUsd}
			>
				{#snippet fallback()}
					<SkeletonText />
				{/snippet}
			</EarningYearlyAmount>
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
