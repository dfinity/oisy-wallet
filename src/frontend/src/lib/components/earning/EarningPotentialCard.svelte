<script lang="ts">
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { highestApyEarningData } from '$lib/derived/earning.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens-ui.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';

	const highestApy = $derived(
		!isNaN(Number($highestApyEarningData?.apy)) ? Number($highestApyEarningData?.apy) : 0
	);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.earning_potential}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount
				showPlusSign={$enabledMainnetFungibleTokensUsdBalance > 0 && highestApy > 0}
				value={($enabledMainnetFungibleTokensUsdBalance * highestApy) / 100}
			>
				{#snippet fallback()}
					<SkeletonText />
				{/snippet}
			</EarningYearlyAmount>
		</div>

		<div class="flex justify-center gap-2 text-sm font-bold sm:text-base">
			{formatCurrency({
				value: $enabledMainnetFungibleTokensUsdBalance,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>
	{/snippet}
</StakeContentCard>
