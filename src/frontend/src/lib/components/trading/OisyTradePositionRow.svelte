<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { goto } from '$app/navigation';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import { AppPath } from '$lib/constants/routes.constants';
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
		// 'provider': static row on the Trade page (default).
		// 'holdings': Assets → Trading tab row; clicks through to the Trade page.
		variant?: 'provider' | 'holdings';
	}

	let { asset, variant = 'provider' }: Props = $props();

	const goToProvider = () => {
		void goto(AppPath.ProvidersOisyTrade);
	};

	let { token, total, reserved, totalUsd } = $derived(asset);

	let data = $derived<CardData>(token);

	let symbol = $derived(getTokenDisplaySymbol(token));

	let hasReserved = $derived(oisyTradeAssetHasReserved(asset));

	const formatAmount = (value: bigint): string =>
		`${formatToken({ value, unitName: token.decimals, displayDecimals: token.decimals })} ${symbol}`;

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

{#snippet body()}
	<TokenLogo badge={{ type: 'network' }} color="white" {data} logoSize="lg" />

	<span class="flex min-w-0 flex-1 flex-col text-left">
		<span class="font-bold">{symbol}</span>
		<TokenNameAndNetwork {data} />
	</span>

	{#if hasReserved}
		<span class="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-tertiary">
			{#if $isPrivacyMode}
				<span class="inline-flex items-center gap-1">
					<IconDots variant="xs" />
					{$i18n.trading.page.in_orders_label}
				</span>
			{:else}
				{replacePlaceholders($i18n.trading.page.in_orders, { $amount: formatAmount(reserved) })}
			{/if}
		</span>
	{/if}

	<span class="flex shrink-0 flex-col text-right text-nowrap">
		<span class="font-bold">
			{#if $isPrivacyMode}
				<IconDots variant="md" />
			{:else}
				{formatAmount(total)}
			{/if}
		</span>
		<span class="text-sm text-tertiary">
			{#if $isPrivacyMode}
				<IconDots variant="xs" />
			{:else if nonNullish(formattedTotalUsd)}
				{formattedTotalUsd}
			{/if}
		</span>
	</span>
{/snippet}

{#if variant === 'holdings'}
	<button
		class="flex w-full items-center gap-4 rounded-lg px-2 py-3 text-left transition-colors hover:bg-brand-subtle-10"
		onclick={goToProvider}
		type="button"
	>
		{@render body()}
	</button>
{:else}
	<div class="flex w-full items-center gap-4 py-3">
		{@render body()}
	</div>
{/if}
