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

	const highestApy = $derived(
		!isNaN(Number($highestApyEarningData?.apy)) ? Number($highestApyEarningData?.apy) : 0
	);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.active_earning}</div>

		<div
			class="my-1 text-lg font-bold sm:text-xl"
			class:text-success-primary={$allEarningYearlyAmountUsd > 0}
			class:text-tertiary={$allEarningYearlyAmountUsd === 0}
		>
			{nonNullish($allEarningYearlyAmountUsd)
				? replacePlaceholders($i18n.stake.text.active_earning_per_year, {
						$amount: `${
							formatCurrency({
								value: $allEarningYearlyAmountUsd,
								currency: $currentCurrency,
								exchangeRate: $currencyExchangeStore,
								language: $currentLanguage
							}) ?? 0
						}`
					})
				: 0}
		</div>

		<div class="flex justify-center gap-2 text-sm sm:text-base">
			<span class="font-bold">
				{formatCurrency({
					value: $allEarningPositionsUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				}) ?? 0}
			</span>
		</div>
	{/snippet}
</StakeContentCard>
