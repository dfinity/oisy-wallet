<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		liquidiumBorrowInterestUsd,
		liquidiumHealthFactorPercent,
		liquidiumTotalBorrowedUsd
	} from '$lib/derived/liquidium.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { liquidiumHealthLevel } from '$lib/utils/liquidium.utils';

	let hasDebt = $derived($liquidiumTotalBorrowedUsd > 0);

	let healthLevel = $derived(
		nonNullish($liquidiumHealthFactorPercent)
			? liquidiumHealthLevel($liquidiumHealthFactorPercent)
			: undefined
	);
</script>

<StakeContentCard>
	{#snippet content()}
		<div class="text-sm font-bold">{$i18n.borrow.text.active_loans}</div>

		<div class="my-1 text-lg font-bold sm:text-xl">
			<EarningYearlyAmount showAsError value={$liquidiumBorrowInterestUsd} />
		</div>

		<div class="text-sm font-bold text-tertiary sm:text-base">
			{#if hasDebt}
				{replacePlaceholders($i18n.borrow.text.amount_borrowed, {
					$amount:
						formatCurrency({
							value: $liquidiumTotalBorrowedUsd,
							currency: $currentCurrency,
							exchangeRate: $currencyExchangeStore,
							language: $currentLanguage
						}) ?? ''
				})}
			{:else}
				{$i18n.borrow.text.no_active_loans}
			{/if}
		</div>

		{#if hasDebt && nonNullish($liquidiumHealthFactorPercent)}
			<div
				class="mt-2 text-sm font-bold"
				class:text-error-primary={healthLevel === 'critical'}
				class:text-success-primary={healthLevel === 'healthy'}
				class:text-warning-primary={healthLevel === 'at-risk'}
			>
				{$i18n.liquidium.text.health_factor}
				{Math.round($liquidiumHealthFactorPercent)}%
			</div>
		{/if}
	{/snippet}
</StakeContentCard>
