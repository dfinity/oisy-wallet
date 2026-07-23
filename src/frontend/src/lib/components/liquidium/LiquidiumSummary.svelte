<script lang="ts">
	import ActiveLoansCard from '$lib/components/borrow/ActiveLoansCard.svelte';
	import EarningYearlyAmount from '$lib/components/earning/EarningYearlyAmount.svelte';
	import IconCircleCheck from '$lib/components/icons/lucide/IconCircleCheck.svelte';
	import LiquidiumHealthFactor from '$lib/components/liquidium/LiquidiumHealthFactor.svelte';
	import LiquidiumBorrowModal from '$lib/components/liquidium/borrow/LiquidiumBorrowModal.svelte';
	import LiquidiumSupplyModal from '$lib/components/liquidium/supply/LiquidiumSupplyModal.svelte';
	import StakeContentCard from '$lib/components/stake/StakeContentCard.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { modalLiquidiumBorrow, modalLiquidiumSupply } from '$lib/derived/modal.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { LiquidiumPortfolio } from '$lib/types/liquidium';
	import type { BadgeVariant } from '$lib/types/style';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		liquidiumHealthLevel,
		liquidiumNetInterestUsd,
		liquidiumSupplyInterestUsd
	} from '$lib/utils/liquidium.utils';

	interface Props {
		portfolio: LiquidiumPortfolio | null;
	}

	let { portfolio }: Props = $props();

	const supplyModalId = Symbol();
	const borrowModalId = Symbol();

	let hasDebt = $derived((portfolio?.totalBorrowedUsd ?? 0) > 0);
	let healthFactorPercent = $derived(portfolio?.healthFactorPercent ?? 100);

	let totalSuppliedUsd = $derived(portfolio?.totalSuppliedUsd ?? 0);
	// Borrowing power comes from supplied collateral, so without any supply there is
	// nothing to borrow against — gate the action until the user supplies something.
	let hasSupply = $derived(totalSuppliedUsd > 0);
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

	// Yearly net-interest chip: green when earning, red when paying, neutral at zero.
	let netInterestVariant: BadgeVariant = $derived(
		netInterestUsd > 0 ? 'success' : netInterestUsd < 0 ? 'error' : 'default'
	);
	let netInterestChip = $derived(
		netInterestUsd > 0
			? `+${netInterestYearly}`
			: netInterestUsd < 0
				? `−${netInterestYearly}`
				: netInterestYearly
	);

	let healthLevel = $derived(liquidiumHealthLevel(healthFactorPercent));

	// Label + colour paired per branch so they can't drift out of sync.
	let healthStatus: { label: string; variant: BadgeVariant } = $derived(
		!hasDebt
			? { label: $i18n.liquidium.text.health_no_debt, variant: 'default' }
			: healthLevel === 'healthy'
				? { label: $i18n.liquidium.text.health_healthy, variant: 'success' }
				: healthLevel === 'at-risk'
					? { label: $i18n.liquidium.text.health_at_risk, variant: 'warning' }
					: { label: $i18n.liquidium.text.health_critical, variant: 'error' }
	);
</script>

<div
	class="mt-6 flex w-full flex-col gap-4 rounded-xl border border-solid border-disabled bg-secondary p-4"
>
	<div class="flex items-center justify-between gap-2">
		<div class="flex flex-col gap-1">
			<span class="text-sm font-bold">{$i18n.liquidium.text.net_value}</span>

			<span class="text-2xl font-bold">{formattedNetValue}</span>
		</div>

		<Badge variant={netInterestVariant} width="w-fit">{netInterestChip}</Badge>
	</div>

	<LiquidiumHealthFactor label={$i18n.liquidium.text.health_factor} percent={healthFactorPercent}>
		{#snippet badge()}
			<Badge variant={healthStatus.variant} width="w-fit">
				<span class="flex items-center gap-2">
					{#if hasDebt && healthLevel === 'healthy'}
						<IconCircleCheck size="14" />
					{/if}
					{healthStatus.label}
				</span>
			</Badge>
		{/snippet}
	</LiquidiumHealthFactor>
</div>

<div class="mt-3 flex w-full flex-col gap-3 sm:flex-row">
	<StakeContentCard widthClass="sm:w-1/2">
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

		{#snippet buttons()}
			<Button colorStyle="success" onclick={() => modalStore.openLiquidiumSupply(supplyModalId)}>
				{$i18n.liquidium.text.action_supply}
			</Button>
		{/snippet}
	</StakeContentCard>

	<ActiveLoansCard showHealthFactor={false} showWithShortenedLabel widthClass="sm:w-1/2">
		{#snippet buttons()}
			<Button disabled={!hasSupply} onclick={() => modalStore.openLiquidiumBorrow(borrowModalId)}>
				{$i18n.liquidium.text.action_borrow}
			</Button>
		{/snippet}
	</ActiveLoansCard>
</div>

<!-- Neutral launches: no market prop, so both open on the select-token step. -->
{#if $modalLiquidiumSupply && $modalStore?.id === supplyModalId}
	<LiquidiumSupplyModal />
{/if}

{#if $modalLiquidiumBorrow && $modalStore?.id === borrowModalId}
	<LiquidiumBorrowModal />
{/if}
