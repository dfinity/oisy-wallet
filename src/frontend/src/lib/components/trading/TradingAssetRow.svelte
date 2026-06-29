<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TokenNameAndNetwork from '$lib/components/tokens/TokenNameAndNetwork.svelte';
	import TradingProviderTag from '$lib/components/trading/TradingProviderTag.svelte';
	import LogoButton from '$lib/components/ui/LogoButton.svelte';
	import { TRADING_ASSET_WITHDRAW_BUTTON } from '$lib/constants/test-ids.constants';
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
		// Wired to the Withdraw modal in PR3; the button only renders once a handler is provided.
		onWithdraw?: (asset: OisyTradeAsset) => void;
	}

	let { asset, onWithdraw }: Props = $props();

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

<div class="flex w-full items-center">
	<div class="min-w-0 flex-1">
		<LogoButton dividers={false} hover={false} rounded={false}>
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
						<span>
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
						<span>{formattedTotalUsd}</span>
					{/if}
				</span>
			{/snippet}
		</LogoButton>
	</div>

	{#if nonNullish(onWithdraw)}
		<button
			class="ml-2 shrink-0 font-semibold text-brand-primary"
			data-tid={TRADING_ASSET_WITHDRAW_BUTTON}
			onclick={() => onWithdraw(asset)}
			type="button"
		>
			{$i18n.trading.assets.withdraw}
		</button>
	{/if}
</div>
