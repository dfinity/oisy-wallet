<script lang="ts">
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { allEarningPositionsUsd, allEarningYearlyAmountUsd } from '$lib/derived/earning.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.active_earning}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount formatPositiveAmount value={$allEarningYearlyAmountUsd}>
				{#snippet fallback()}
					<SkeletonText />
				{/snippet}
			</EarningYearlyAmount>
		</div>

		<div class="flex justify-center gap-2 text-sm font-bold sm:text-base">
			{formatCurrency({
				value: $allEarningPositionsUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			})}
		</div>
	{/snippet}
</StakeContentCard>
