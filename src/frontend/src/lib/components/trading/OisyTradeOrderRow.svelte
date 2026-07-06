<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IconCheck from '$lib/components/icons/IconCheck.svelte';
	import IconDots from '$lib/components/icons/IconDots.svelte';
	import IconClockAlert from '$lib/components/icons/lucide/IconClockAlert.svelte';
	import IconClose from '$lib/components/icons/lucide/IconClose.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import { isPrivacyMode } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
	import { formatNanosecondsToDate, formatToken } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		isOisyTradeOrderActive,
		oisyTradeOrderDisplayStatus,
		orderStatusView,
		priceLevelToHuman,
		queuePositionDisplay,
		queuePositionFraction,
		toPairView
	} from '$lib/utils/oisy-trade.utils';
	import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		order: OisyTradeOrderView;
		// Live order-book snapshot for this order's pair, polled once per pair by the
		// parent list. Undefined for history rows or before the first load.
		orderBook?: OisyTradeOrderBook;
	}

	let { order, orderBook }: Props = $props();

	// Tapping the row opens the read-only order-detail modal (Review-styled), which
	// also hosts the Cancel action for active orders — there is no inline cancel.
	const openDetail = () => modalStore.openOisyTradeOrderDetail({ id: Symbol(), data: order });

	let { side, base, quote, quantity, price, createdAt } = $derived(order);

	let baseSymbol = $derived(getTokenDisplaySymbol(base));
	let quoteSymbol = $derived(getTokenDisplaySymbol(quote));

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

	// The quote leg of the order (quantity × price), spent on a buy / received on a
	// sell — shown as the muted second amount on the right.
	let formattedQuoteAmount = $derived(
		formatToken({
			value: BigInt(Math.round(quantity * price * 10 ** quote.decimals)),
			unitName: quote.decimals,
			displayDecimals: quote.decimals
		})
	);

	// Signed legs on the right: the base leaves the account on a sell (−) and
	// arrives on a buy (+); the quote is the mirror image. U+2212 is the typographic
	// minus so the two signs align under tabular-nums.
	let baseAmountSigned = $derived(
		`${side === 'sell' ? '−' : '+'}${formattedQuantity} ${baseSymbol}`
	);
	let quoteAmountSigned = $derived(
		`${side === 'sell' ? '+' : '−'}${formattedQuoteAmount} ${quoteSymbol}`
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

	// The tail of the intent line after the coloured side word and bold base symbol
	// — e.g. "for ckUSDC @ 2.75" (sell) / "with ckUSDC @ 2.60" (buy).
	let phrase = $derived(
		replacePlaceholders(
			side === 'sell' ? $i18n.trading.orders.row_phrase_sell : $i18n.trading.orders.row_phrase_buy,
			{
				$quote: quoteSymbol,
				$price: formattedPrice
			}
		)
	);

	// Queue position — the share of same-side volume priced better than this order,
	// shown as plain muted text under the status pill. Only for active (Pending +
	// Open) resting orders, and only when there is volume ahead; a "Front of book"
	// (0%) order or a crossing order that fills immediately shows nothing here. The
	// order book itself is polled once per pair by the parent list and passed in.
	const active = $derived(isOisyTradeOrderActive(order));

	const pairInfo = $derived<TradingPairInfo | undefined>(
		$oisyTradePairs.find(
			(p) => p.base.metadata.symbol === base.symbol && p.quote.metadata.symbol === quote.symbol
		)
	);
	const pairView = $derived(nonNullish(pairInfo) ? toPairView(pairInfo) : undefined);

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
			return;
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
			return;
		}
		return replacePlaceholders($i18n.trading.orders.queue_ahead, {
			$percentage: display.percent.toString()
		});
	});

	// The muted line under the intent: the live queue position while the order is
	// active, or when it was placed once it's terminal (Order-history rows).
	const metaLine = $derived(
		active
			? queueText
			: formatNanosecondsToDate({ nanoseconds: createdAt, language: $currentLanguage })
	);
</script>

<!-- The venue's own page, so no provider tag on the row. -->
<button
	class="-mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-brand-subtle-10"
	onclick={openDetail}
	type="button"
>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-center gap-x-1 text-base leading-snug text-primary">
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
				<span class="font-semibold">{baseSymbol}</span>
				<span class="tabular-nums">{phrase}</span>
			{/if}
		</div>
		{#if nonNullish(metaLine)}
			<div class="mt-0.5 text-xs text-tertiary tabular-nums" transition:slide={SLIDE_PARAMS}>
				{metaLine}
			</div>
		{/if}
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

	<div class="flex shrink-0 flex-col items-end text-right">
		{#if $isPrivacyMode}
			<IconDots variant="md" />
		{:else}
			<span class="text-base font-semibold text-primary tabular-nums">{baseAmountSigned}</span>
			<span class="text-sm text-tertiary tabular-nums">{quoteAmountSigned}</span>
		{/if}
	</div>
</button>
