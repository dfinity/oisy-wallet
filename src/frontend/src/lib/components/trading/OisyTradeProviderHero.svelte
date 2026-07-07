<script lang="ts">
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import OisyTradeMark from '$lib/components/trading/OisyTradeMark.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import {
		oisyTradeAssets,
		oisyTradeDepositableUsdValue,
		oisyTradeFreeUsdValue,
		oisyTradeReservedUsdValue,
		oisyTradeUsdValue
	} from '$lib/derived/oisy-trade.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	interface Props {
		onDeposit: () => void;
		onWithdraw: () => void;
	}

	let { onDeposit, onWithdraw }: Props = $props();

	const fiat = (value: number): string =>
		formatCurrency({
			value,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		}) ?? '';

	const depositable = $derived(fiat($oisyTradeDepositableUsdValue));
	const deposited = $derived(fiat($oisyTradeUsdValue));
	const free = $derived(fiat($oisyTradeFreeUsdValue));
	const reserved = $derived(fiat($oisyTradeReservedUsdValue));

	const hasDeposits = $derived($oisyTradeAssets.length > 0);
	const hasReserved = $derived($oisyTradeReservedUsdValue > 0);

	// Scroll down to the "What is OISY TRADE" info box (a sibling section on the
	// same page) — resolved by DOM id rather than a hash link so it works inside
	// the app's scroll container.
	const scrollToInfo = () =>
		document.getElementById('oisy-trade-info')?.scrollIntoView({ behavior: 'smooth' });
</script>

<StakeContentSection>
	{#snippet title()}
		<div class="flex w-full flex-col items-center text-center">
			<OisyTradeMark />

			<h2 class="my-2 text-xl font-bold sm:text-2xl">{$i18n.trading.text.provider_name}</h2>

			<p class="max-w-lg text-sm text-tertiary sm:text-base">
				{$i18n.trading.page.tagline}
				<span class="hidden sm:inline">{$i18n.trading.page.tagline_desktop}</span>
			</p>

			<Button innerStyleClass="items-center" link onclick={scrollToInfo} styleClass="mt-2 text-sm">
				<span>{$i18n.core.text.learn_more}</span>
				<IconArrowDown size="18" />
			</Button>
		</div>
	{/snippet}

	{#snippet content()}
		<!--
			The two metric boxes are centered on desktop but switch to a condensed,
			left-aligned layout on mobile (smaller value type, no fixed height), per
			the design's mobile hero treatment.
		-->
		<div class="flex w-full flex-col gap-3 sm:flex-row">
			<div
				class="flex w-full flex-col gap-1.5 rounded-xl border border-disabled bg-secondary p-4 sm:w-1/2 sm:items-center sm:text-center"
			>
				<span class="text-sm font-semibold">{$i18n.trading.page.trading_potential}</span>
				<span class="text-2xl font-bold sm:text-3xl">
					{#if $isPrivacyMode}
						<IconDots variant="lg" />
					{:else}
						{depositable}
					{/if}
				</span>
				<span class="text-xs text-tertiary">{$i18n.trading.page.trading_potential_hint}</span>

				<Button colorStyle="success" fullWidth onclick={onDeposit} styleClass="mt-4 sm:mt-auto">
					{$i18n.trading.page.deposit}
				</Button>
			</div>

			<div
				class="flex w-full flex-col gap-1.5 rounded-xl border border-disabled bg-secondary p-4 sm:w-1/2 sm:items-center sm:text-center"
			>
				<span class="text-sm font-semibold">{$i18n.trading.page.deposited_assets}</span>
				<span class="text-2xl font-bold sm:text-3xl">
					{#if $isPrivacyMode}
						<IconDots variant="lg" />
					{:else}
						{deposited}
					{/if}
				</span>
				<span class="text-xs text-tertiary">
					{#if $isPrivacyMode}
						<IconDots variant="xs" />
					{:else if hasReserved}
						{replacePlaceholders($i18n.trading.page.free, { $amount: free })} · {replacePlaceholders(
							$i18n.trading.page.in_orders,
							{ $amount: reserved }
						)}
					{:else if hasDeposits}
						{$i18n.trading.page.deposited_all_free}
					{:else}
						{$i18n.trading.page.deposited_empty}
					{/if}
				</span>

				<!-- Enabled once the user has DEX deposits; opens the withdraw form (token picker first). -->
				<Button
					colorStyle="primary"
					disabled={!hasDeposits}
					fullWidth
					onclick={onWithdraw}
					styleClass="mt-4 sm:mt-auto"
				>
					{$i18n.trading.page.withdraw}
				</Button>
			</div>
		</div>
	{/snippet}
</StakeContentSection>
