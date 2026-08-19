<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
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
		buttons?: Snippet;
	}

	let {
		widthClass,
		showHealthFactor = true,
		showWithShortenedLabel = false,
		buttons
	}: Props = $props();

	let hasDebt = $derived($liquidiumTotalBorrowedUsd > 0);

	let healthLevel = $derived(
		nonNullish($liquidiumHealthFactorPercent)
			? liquidiumHealthLevel($liquidiumHealthFactorPercent)
			: undefined
	);
</script>

<StakeContentCard {buttons} {widthClass}>
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
			{#if hasDebt}
				{$i18n.borrow.text.apr}
				<EarningYearlyAmount
					showMinusSign
					{showWithShortenedLabel}
					value={$liquidiumBorrowInterestUsd}
				/>
			{:else}
				{$i18n.borrow.text.no_active_loans}
			{/if}
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
