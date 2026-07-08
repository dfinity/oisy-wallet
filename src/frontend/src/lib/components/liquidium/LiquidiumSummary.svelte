<script lang="ts">
	import ActiveLoansCard from '$lib/components/borrow/ActiveLoansCard.svelte';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumPortfolio } from '$lib/types/liquidium';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { liquidiumNetInterestUsd, liquidiumSupplyInterestUsd } from '$lib/utils/liquidium.utils';

	interface Props {
		portfolio: LiquidiumPortfolio | null;
	}

	let { portfolio }: Props = $props();

	let hasDebt = $derived((portfolio?.totalBorrowedUsd ?? 0) > 0);
	let healthFactorPercent = $derived(portfolio?.healthFactorPercent ?? 100);

	let totalSuppliedUsd = $derived(portfolio?.totalSuppliedUsd ?? 0);
	let formattedTotalSupplied = $derived(
		formatCurrency({
			value: totalSuppliedUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	// Yearly supply earnings in USD, shown as a neutral "APY $x/year" line.
	let supplyInterestUsd = $derived(liquidiumSupplyInterestUsd(portfolio));

	let netValueUsd = $derived(portfolio?.netValueUsd ?? 0);
	let formattedNetValue = $derived(
		formatCurrency({
			value: netValueUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	// Net yearly interest in USD = supply earnings/year − borrow cost/year. Green when
	// positive, red when negative, tertiary when zero.
	let netInterestUsd = $derived(liquidiumNetInterestUsd(portfolio));
	// Format the magnitude; the sign prefix below is driven by netInterestUsd so it never
	// disagrees with the amount (and avoids a doubled "-" from a signed format).
	let netInterestYearly = $derived(
		replacePlaceholders($i18n.stake.text.active_earning_per_year_short, {
			$amount:
				formatCurrency({
					value: Math.abs(netInterestUsd),
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				}) ?? ''
		})
	);
</script>

<div class="mt-6 flex w-full flex-col gap-3 sm:flex-row">
	<StakeContentCard widthClass="sm:w-1/3">
		{#snippet content()}
			<div class="text-sm font-bold">
				{$i18n.liquidium.text.total_supplied}
			</div>

			<div
				class="my-1 text-lg font-bold sm:text-xl"
				class:text-primary={totalSuppliedUsd > 0}
				class:text-tertiary={totalSuppliedUsd <= 0}
			>
				{formattedTotalSupplied}
			</div>

			<div class="text-sm text-tertiary sm:text-base">
				{#if totalSuppliedUsd > 0}
					{$i18n.liquidium.text.apy_suffix}
					<EarningYearlyAmount showPlusSign showWithShortenedLabel value={supplyInterestUsd} />
				{:else}
					{$i18n.liquidium.text.no_assets_supplied}
				{/if}
			</div>
		{/snippet}
	</StakeContentCard>

	<ActiveLoansCard showHealthFactor={false} showWithShortenedLabel widthClass="sm:w-1/3" />

	<StakeContentCard widthClass="sm:w-1/3">
		{#snippet content()}
			<div class="text-sm font-bold">{$i18n.liquidium.text.net_value}</div>

			<div class="my-1 text-lg font-bold sm:text-xl">{formattedNetValue}</div>

			<div
				class="text-sm font-bold sm:text-base"
				class:text-error-primary={netInterestUsd < 0}
				class:text-success-primary={netInterestUsd > 0}
				class:text-tertiary={netInterestUsd === 0}
			>
				{$i18n.liquidium.text.apy_suffix}
				{netInterestUsd > 0
					? `+${netInterestYearly}`
					: netInterestUsd < 0
						? `−${netInterestYearly}`
						: netInterestYearly}
			</div>
		{/snippet}
	</StakeContentCard>
</div>

{#if hasDebt}
	<div class="mt-5 w-full">
		<LiquidiumHealthFactor
			label={$i18n.liquidium.text.health_factor}
			percent={healthFactorPercent}
		/>
	</div>
{/if}
