<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import TradingProviderTag from '$lib/components/trading/TradingProviderTag.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeAsset } from '$lib/types/oisy-trade';
	import type { CardData } from '$lib/types/token-card';
	import { formatCurrency, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { oisyTradeAssetHasReserved } from '$lib/utils/oisy-trade.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		asset: OisyTradeAsset;
	}

	let { asset }: Props = $props();

	const goToProvider = () => {
		void goto(AppPath.ProvidersOisyTrade);
	};

	let { token, total, free, totalUsd } = $derived(asset);

	let data = $derived<CardData>(token);

	let symbol = $derived(getTokenDisplaySymbol(token));

	const formatAmount = (value: bigint): string =>
		`${formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })} ${symbol}`;

	let hasReserved = $derived(oisyTradeAssetHasReserved(asset));

	let formattedTotalUsd = $derived(
		nonNullish(totalUsd)
			? formatCurrency({
					value: totalUsd,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined
	);
</script>

<LogoButton onClick={goToProvider}>
	{#snippet logo()}
		<span class="flex">
			<TokenLogo badge={{ type: 'network' }} color="white" {data} logoSize="lg" />
		</span>
	{/snippet}

	{#snippet title()}
		<span class="flex items-center gap-2">
			{symbol}
			<TradingProviderTag />
		</span>
	{/snippet}

	{#snippet description()}
		<TokenNameAndNetwork {data} />
	{/snippet}

	{#snippet titleEnd()}
		<span class="block text-nowrap">
			{#if $isPrivacyMode}
				<IconDots variant="md" />
			{:else}
				{formatAmount(total)}
			{/if}
		</span>
	{/snippet}

	{#snippet descriptionEnd()}
		<span class="flex flex-col items-end text-nowrap">
			{#if hasReserved}
				<span transition:slide={SLIDE_PARAMS}>
					{#if $isPrivacyMode}
						<span class="inline-flex items-center gap-1"
							>{$i18n.trading.assets.available_label} <IconDots variant="xs" /></span
						>
					{:else}
						{replacePlaceholders($i18n.trading.assets.available, {
							$amount: formatAmount(free)
						})}
					{/if}
				</span>
			{/if}
			{#if $isPrivacyMode}
				<IconDots variant="xs" />
			{:else if nonNullish(formattedTotalUsd)}
				<span transition:slide={SLIDE_PARAMS}>{formattedTotalUsd}</span>
			{/if}
		</span>
	{/snippet}
</LogoButton>
