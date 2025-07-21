<script lang="ts">
	import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
	import { getContext } from 'svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconEyeOff from '$lib/components/icons/lucide/IconEyeOff.svelte';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import { allBalancesZero } from '$lib/derived/balances.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { combinedDerivedSortedFungibleNetworkTokensUi } from '$lib/derived/network-tokens.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { HERO_CONTEXT_KEY, type HeroContext } from '$lib/stores/hero.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { setPrivacyMode } from '$lib/utils/privacy.utils';
	import { sumTokensUiUsdBalance } from '$lib/utils/tokens.utils';

	interface Props {
		hideBalance?: boolean;
	}

	let { hideBalance = false }: Props = $props();

	const { loaded } = getContext<HeroContext>(HERO_CONTEXT_KEY);

	const totalUsd = $derived(sumTokensUiUsdBalance($combinedDerivedSortedFungibleNetworkTokensUi));

	let balance = $derived(
		formatCurrency({
			value: $loaded ? totalUsd : 0,
			currency: $currentCurrency,
			exchangeRate: $currencyExchangeStore,
			language: $currentLanguage
		})
	);
</script>

<span class="flex flex-col items-center gap-1">
	<output class="mt-7 inline-block break-all text-5xl font-bold">
		{#if $loaded && nonNullish(balance)}
			{#if hideBalance}
				<IconDots variant="lg" times={6} styleClass="my-4.25" />
			{:else}
				{balance}
			{/if}
		{:else}
			<span class="animate-pulse">
				{#if hideBalance}
					<IconDots variant="lg" times={6} styleClass="my-4.25" />
				{:else}
					{formatCurrency({
						value: 0,
						currency: $currentCurrency,
						exchangeRate: { currency:$currentCurrency, exchangeRateToUsd: 1 },
						language: $currentLanguage
					})}
				{/if}
			</span>
		{/if}
	</output>
	<span
		class="flex cursor-pointer flex-col items-center gap-4 text-xl font-medium text-brand-secondary-alt"
		role="button"
		tabindex="0"
		ondblclick={() =>
			setPrivacyMode({
				enabled: !$isPrivacyMode,
				withToast: false,
				source: 'Hero - Double click on the ExchangeBalance'
			})}
	>
		{#if hideBalance}
			<DelayedTooltip text={$i18n.hero.text.tooltip_toggle_balance} delay={2000}>
				<span class="flex items-center gap-2 sm:max-w-none">
					<IconEyeOff />{$i18n.hero.text.hidden_balance}
				</span>
			</DelayedTooltip>
		{:else}
			<DelayedTooltip text={$i18n.hero.text.tooltip_toggle_balance} delay={2000}>
				{$allBalancesZero ? $i18n.hero.text.top_up : $i18n.hero.text.available_balance}
			</DelayedTooltip>
		{/if}
	</span>
</span>
