<script lang="ts">
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import {
		allEarningPositionsUsd,
		allEarningYearlyAmountUsd,
		highestApyEarningData
	} from '$lib/derived/earning.derived';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { nonNullish } from '@dfinity/utils';
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
		<div class="text-sm">{$i18n.stake.text.earning_potential}</div>

		<div
			class="my-1 text-lg font-bold sm:text-xl"
			class:text-brand-primary-alt={$allEarningYearlyAmountUsd > 0}
			class:text-tertiary={$allEarningYearlyAmountUsd === 0}
		>
			{replacePlaceholders($i18n.stake.text.active_earning_per_year, {
				$amount: `${formatCurrency({
					value: $allEarningYearlyAmountUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})}`
			})}
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
