<script lang="ts">
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import {
		allEarningPositionsUsd,
		allEarningYearlyAmountUsd,
		highestApyEarningData
	} from '$lib/derived/earning.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { enabledMainnetFungibleTokensUsdBalance } from '$lib/derived/tokens.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';

	const highestApy = $derived(
		!isNaN(Number($highestApyEarningData?.apy)) ? Number($highestApyEarningData?.apy) : 0
	);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.active_earning}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount value={$allEarningYearlyAmountUsd} formatPositiveAmount>
				{#snippet fallback()}
					<div class="w-16">
						<SkeletonText />
					</div>
				{/snippet}
			</EarningYearlyAmount>
		</div>

		<div class="flex justify-center gap-2 text-sm sm:text-base">
			<span class="font-bold">
				{formatCurrency({
					value: $allEarningPositionsUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})}
			</span>
		</div>
	{/snippet}
</StakeContentCard>
