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
	import { liquidiumHealthLevel } from '$lib/utils/liquidium.utils';

	interface Props {
		widthClass?: string;
		showHealthFactor?: boolean;
		showWithShortenedLabel?: boolean;
	}

	let { widthClass, showHealthFactor = true, showWithShortenedLabel = false }: Props = $props();

	let hasDebt = $derived($liquidiumTotalBorrowedUsd > 0);

	let healthLevel = $derived(
		nonNullish($liquidiumHealthFactorPercent)
			? liquidiumHealthLevel($liquidiumHealthFactorPercent)
			: undefined
	);
</script>

<StakeContentCard {widthClass}>
	{#snippet content()}
		<div class="text-sm font-bold">{$i18n.borrow.text.active_loans}</div>

		<div
			class="my-1 text-lg font-bold sm:text-xl"
			class:text-error-primary={hasDebt}
			class:text-tertiary={!hasDebt}
		>
			{formatCurrency({
				value: $liquidiumTotalBorrowedUsd,
				currency: $currentCurrency,
				exchangeRate: $currencyExchangeStore,
				language: $currentLanguage
			}) ?? ''}
		</div>

		<div class="text-sm text-tertiary sm:text-base">
			{$i18n.borrow.text.apr}
			<EarningYearlyAmount
				showMinusSign
				{showWithShortenedLabel}
				value={$liquidiumBorrowInterestUsd}
			/>
		</div>

		{#if showHealthFactor && hasDebt && nonNullish($liquidiumHealthFactorPercent)}
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
