<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import TokenLogo from '$lib/components/tokens/TokenLogo.svelte';
	import TradingProviderTag from '$lib/components/trading/TradingProviderTag.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { loadOrderBook } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
	import type { CardData } from '$lib/types/token-card';
	import { formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		isOisyTradeOrderActive,
		oisyTradeOrderDisplayStatus,
		orderStatusView,
		priceLevelToHuman,
		queuePositionDisplay,
		queuePositionFraction,
		toPairView,
		toTradingPair
	} from '$lib/utils/oisy-trade.utils';
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

	// Queue position — the share of same-side volume priced better than this order,
	// shown as plain muted text under the status pill. Only for active (Pending +
	// Open) resting orders, and only when there is volume ahead; a "Front of book"
	// (0%) order or a crossing order that fills immediately shows nothing here.
	const active = $derived(isOisyTradeOrderActive(order));

	const pairInfo = $derived<TradingPairInfo | undefined>(
		$oisyTradePairs.find(
			(p) => p.base.metadata.symbol === base.symbol && p.quote.metadata.symbol === quote.symbol
		)
	);
	const pairView = $derived(nonNullish(pairInfo) ? toPairView(pairInfo) : undefined);

	let orderBook = $state<OisyTradeOrderBook | undefined>();

	const refreshOrderBook = async (): Promise<void> => {
		if (!active || isNullish(pairInfo)) {
			orderBook = undefined;
			return;
		}
		const next = await loadOrderBook({ identity: $authIdentity, pair: toTradingPair(pairInfo) });
		// Keep the last good snapshot on a transient failure.
		if (nonNullish(next)) {
			orderBook = next;
		}
	};

	$effect(() => {
		pairInfo;
		active;
		void refreshOrderBook();
	});

	const toHuman = (level: { price: bigint; quantity: bigint }) =>
		priceLevelToHuman({
			level,
			baseDecimals: pairView?.baseDecimals ?? base.decimals,
			quoteDecimals: pairView?.quoteDecimals ?? quote.decimals
		});

	const depthLevels = $derived.by(() => {
		if (isNullish(orderBook?.depth) || isNullish(pairView)) {
			return { asks: [], bids: [] };
		}
		return {
			asks: orderBook.depth.asks.map(toHuman),
			bids: orderBook.depth.bids.map(toHuman)
		};
	});

	const bid = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.bid) : undefined;
		return nonNullish(level) && nonNullish(pairView) ? toHuman(level).price : null;
	});
	const ask = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.ask) : undefined;
		return nonNullish(level) && nonNullish(pairView) ? toHuman(level).price : null;
	});

	const crossing = $derived(crossesBook({ side, price, bid, ask }));

	const queueText = $derived.by((): string | undefined => {
		if (!active || crossing || isNullish(pairView)) {
			return undefined;
		}
		const display = queuePositionDisplay(
			queuePositionFraction({
				side,
				price,
				tickSize: pairView.tickSize,
				asks: depthLevels.asks,
				bids: depthLevels.bids
			})
		);
		// Only surface a figure when there is volume ahead; a "Front of book" (0%)
		// order shows nothing on the compact row.
		if (display === null || display.front) {
			return undefined;
		}
		return replacePlaceholders($i18n.trading.limit_order.are_ahead, {
			$percentage: display.percent.toString()
		});
	});
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

	<span class="flex shrink-0 flex-col items-end gap-1">
		<Badge variant={pillVariant} width="w-fit">{statusLabels[labelKey]}</Badge>
		{#if nonNullish(queueText)}
			<span class="text-xs text-tertiary">{queueText}</span>
		{/if}
	</span>
</button>

{#if active}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={refreshOrderBook} />
{/if}
