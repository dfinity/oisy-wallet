<script lang="ts">
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconClockAlert from '$lib/components/icons/lucide/IconClockAlert.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TradingProviderTag from '$lib/components/trading/TradingProviderTag.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { oisyTradeOrderDisplayStatus, orderStatusView } from '$lib/utils/oisy-trade.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		order: OisyTradeOrderView;
	}

	// Tapping the row opens the read-only order-detail modal (Review-styled), which
	// also hosts the Cancel action for active orders — there is no inline cancel.
	let { order }: Props = $props();

	const openDetail = () => modalStore.openOisyTradeOrderDetail({ id: Symbol(), data: order });

	let { side, base, quote, quantity, price } = $derived(order);

	let baseSymbol = $derived(getTokenDisplaySymbol(base));
	let quoteSymbol = $derived(getTokenDisplaySymbol(quote));

	let baseData = $derived<CardData>(base);

	// The price is quote-per-base in human units; render with the quote's display
	// decimals so it reads like the limit price the user placed.
	let formattedPrice = $derived(
		formatToken({
			value: BigInt(Math.round(price * 10 ** quote.decimals)),
			unitName: quote.decimals,
			displayDecimals: quote.decimals
		})
	);

	let formattedQuantity = $derived(
		formatToken({
			value: BigInt(Math.round(quantity * 10 ** base.decimals)),
			unitName: base.decimals,
			displayDecimals: base.decimals
		})
	);

	// Buy rows lead with the quote amount spent (quantity × price), mirroring the
	// wireframe copy ("Buy ICP with 300 ckUSDC at 2.60").
	let formattedQuoteAmount = $derived(
		formatToken({
			value: BigInt(Math.round(quantity * price * 10 ** quote.decimals)),
			unitName: quote.decimals,
			displayDecimals: quote.decimals
		})
	);

	let { labelKey, pillVariant } = $derived(orderStatusView(oisyTradeOrderDisplayStatus(order)));

	const statusLabels = $derived({
		Open: $i18n.trading.orders.status_open,
		Pending: $i18n.trading.orders.status_pending,
		Partial: $i18n.trading.orders.status_partial,
		Filled: $i18n.trading.orders.status_filled,
		Canceled: $i18n.trading.orders.status_canceled,
		Expired: $i18n.trading.orders.status_expired
	});

	// Terminal states carry a small leading glyph in the badge (per wireframe); the icon
	// inherits the badge text color via currentColor. Active states (Open/Pending/Partial)
	// show none.
	const statusIcons = {
		Open: undefined,
		Pending: undefined,
		Partial: undefined,
		Filled: IconCheck,
		Canceled: IconClose,
		Expired: IconClockAlert
	};
	let StatusIcon = $derived(statusIcons[labelKey]);

	let rowText = $derived(
		side === 'sell'
			? replacePlaceholders($i18n.trading.orders.row_sell, {
					$quantity: formattedQuantity,
					$base: baseSymbol,
					$quote: quoteSymbol,
					$price: formattedPrice
				})
			: replacePlaceholders($i18n.trading.orders.row_buy, {
					$base: baseSymbol,
					$quote_amount: formattedQuoteAmount,
					$quote: quoteSymbol,
					$price: formattedPrice
				})
	);
</script>

<button
	class="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-subtle-10"
	onclick={openDetail}
	type="button"
>
	<span class="flex shrink-0">
		<TokenLogo badge={{ type: 'network' }} color="white" data={baseData} logoSize="xs" />
	</span>

	<div class="min-w-0 flex-1 text-sm leading-snug text-primary">
		{#if $isPrivacyMode}
			<span class="inline-flex items-center gap-1"><IconDots variant="sm" /></span>
		{:else}
			<span
				class="font-semibold"
				class:text-error-primary={side === 'sell'}
				class:text-success-primary={side === 'buy'}
			>
				{side === 'sell' ? $i18n.trading.orders.side_sell : $i18n.trading.orders.side_buy}
			</span>
			{rowText}
		{/if}
		<span class="ml-1 inline-flex align-middle">
			<TradingProviderTag />
		</span>
	</div>

	<span class="shrink-0">
		<Badge variant={pillVariant} width="w-fit">
			<span class="inline-flex items-center gap-1">
				{#if StatusIcon}
					<span class="inline-flex" aria-hidden="true"><StatusIcon size="14" /></span>
				{/if}
				<span>{statusLabels[labelKey]}</span>
			</span>
		</Badge>
	</span>
</button>
