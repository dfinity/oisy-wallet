<script lang="ts">
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { allEarningPositionsUsd, allEarningYearlyAmountUsd } from '$lib/derived/earning.derived';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import SkeletonText from '$lib/components/ui/SkeletonText.svelte';
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm">{$i18n.stake.text.active_earning}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount value={$allEarningYearlyAmountUsd} formatPositiveAmount>
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
