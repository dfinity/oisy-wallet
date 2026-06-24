<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LiquidiumPortfolio } from '$lib/types/liquidium';
	import { formatCurrency, formatStakeApyNumber } from '$lib/utils/format.utils';
	import { liquidiumHealthLevel, liquidiumNetApy } from '$lib/utils/liquidium.utils';

	interface Props {
		portfolio: LiquidiumPortfolio | null;
	}

	let { portfolio }: Props = $props();

	// No positions ⇒ no debt ⇒ 100% healthy.
	let healthPercent = $derived(portfolio?.healthFactorPercent ?? 100);
	let healthLevel = $derived(liquidiumHealthLevel(healthPercent));

	// Net APY (supply earnings − borrow cost); null when there's nothing to annualise.
	let netApy = $derived(nonNullish(portfolio) ? liquidiumNetApy(portfolio) : null);

	let netValueUsd = $derived(portfolio?.netValueUsd ?? 0);
	let formattedNetValue = $derived(
		formatCurrency({
			value: netValueUsd,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);

	let netApyLabel = $derived(
		nonNullish(netApy)
			? `${netApy >= 0 ? '+' : '−'}${formatStakeApyNumber(Math.abs(netApy))}%`
			: '0.00%'
	);
</script>

<div class="mt-6 flex w-full flex-col gap-3 sm:flex-row">
	<StakeContentCard widthClass="sm:w-1/3">
		{#snippet content()}
			<div class="text-sm font-bold">{$i18n.liquidium.text.health_factor}</div>

			<div
				class="my-1 text-lg font-bold sm:text-xl"
				class:text-error-primary={healthLevel === 'critical'}
				class:text-success-primary={healthLevel === 'healthy'}
				class:text-warning-primary={healthLevel === 'at-risk'}
			>
				{Math.round(healthPercent)}%
			</div>
		{/snippet}
	</StakeContentCard>

	<StakeContentCard widthClass="sm:w-1/3">
		{#snippet content()}
			<div class="text-sm font-bold">{$i18n.liquidium.text.net_value}</div>

			<div class="my-1 text-lg font-bold sm:text-xl">{formattedNetValue}</div>
		{/snippet}
	</StakeContentCard>

	<StakeContentCard widthClass="sm:w-1/3">
		{#snippet content()}
			<div class="text-sm font-bold">{$i18n.liquidium.text.net_apy}</div>

			<div
				class="my-1 text-lg font-bold sm:text-xl"
				class:text-error-primary={nonNullish(netApy) && netApy < 0}
				class:text-success-primary={nonNullish(netApy) && netApy > 0}
				class:text-tertiary={!nonNullish(netApy)}
			>
				{netApyLabel}
			</div>
		{/snippet}
	</StakeContentCard>
</div>
