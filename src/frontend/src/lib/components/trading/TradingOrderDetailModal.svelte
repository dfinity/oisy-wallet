<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import TradingCancelOrderConfirm from '$lib/components/trading/TradingCancelOrderConfirm.svelte';
	import LimitOrderIntentHero from '$lib/components/trading/limit-order/LimitOrderIntentHero.svelte';
	import LimitOrderPriceSummary from '$lib/components/trading/limit-order/LimitOrderPriceSummary.svelte';
	import LimitOrderTermsList from '$lib/components/trading/limit-order/LimitOrderTermsList.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { TRADING_ORDER_DETAIL_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
	} from '$lib/enums/plausible';
	import {
		cancelLimitOrder,
		loadOisyTrade,
		loadOrderBook
	} from '$lib/services/oisy-trade.services';
	import { trackTrading } from '$lib/services/trading-analytics.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';
	import { formatCurrency } from '$lib/utils/format.utils';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		feeBpsToPercent,
		formatTradeAmount,
		isOisyTradeOrderActive,
		oisyTradeOrderDisplayStatus,
		orderStatusView,
		priceLevelToHuman,
		queuePositionDisplay,
		queuePositionFraction,
		toPairView,
		toTradingPair,
		valueDifferencePercent
	} from '$lib/utils/oisy-trade.utils';
	import { calculateTokenUsdAmount, getTokenDisplaySymbol } from '$lib/utils/token.utils';

	interface Props {
		order: OisyTradeOrderView;
	}

	let { order }: Props = $props();

	let { side, base, quote, quantity, price, filledQuantity } = $derived(order);

	const baseSymbol = $derived(getTokenDisplaySymbol(base));
	const quoteSymbol = $derived(getTokenDisplaySymbol(quote));

	// Fixed terms: the base amount and the derived quote bound (base × limit price).
	const quoteAmount = $derived(quantity * price);
	const baseAmountDisplay = $derived(
		formatTradeAmount({ amount: quantity, decimals: base.decimals })
	);
	const quoteAmountDisplay = $derived(
		formatTradeAmount({ amount: quoteAmount, decimals: quote.decimals })
	);
	const priceDisplay = $derived(formatTradeAmount({ amount: price, decimals: quote.decimals }));

	// --- Fiat ($) values, recomputed against the live exchange feed. -----------
	const fiat = ({ amount, token }: { amount: number; token: typeof base }): string | undefined => {
		const value = calculateTokenUsdAmount({
			amount: BigInt(Math.round(amount * 10 ** token.decimals)),
			token,
			$exchanges
		});
		return nonNullish(value)
			? formatCurrency({
					value,
					currency: $currentCurrency,
					exchangeRate: $currencyExchangeStore,
					language: $currentLanguage
				})
			: undefined;
	};
	const baseFiat = $derived(fiat({ amount: quantity, token: base }));
	const quoteFiat = $derived(fiat({ amount: quoteAmount, token: quote }));

	// --- Live valuation from the pair's order book. ----------------------------
	let orderBook = $state<OisyTradeOrderBook | undefined>();

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

	const bid = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.bid) : undefined;
		return nonNullish(level) && nonNullish(pairView) ? toHuman(level).price : null;
	});
	const ask = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.ask) : undefined;
		return nonNullish(level) && nonNullish(pairView) ? toHuman(level).price : null;
	});

	const currentValue = $derived.by((): number => {
		if (nonNullish(bid) && nonNullish(ask)) {
			return (bid + ask) / 2;
		}
		return bid ?? ask ?? 0;
	});

	const crossing = $derived(crossesBook({ side, price, bid, ask }));
	const valueDiff = $derived(valueDifferencePercent({ side, price, currentValue }));
	const currentValueDisplay = $derived(
		currentValue > 0
			? formatTradeAmount({ amount: currentValue, decimals: quote.decimals })
			: undefined
	);

	const depthLevels = $derived.by(() => {
		if (isNullish(orderBook?.depth) || isNullish(pairView)) {
			return { asks: [], bids: [] };
		}
		return {
			asks: orderBook.depth.asks.map(toHuman),
			bids: orderBook.depth.bids.map(toHuman)
		};
	});

	const displayStatus = $derived(oisyTradeOrderDisplayStatus(order));
	const active = $derived(isOisyTradeOrderActive(order));

	// Queue position only for a resting (non-crossing) active order with a pair.
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
		if (display === null) {
			return undefined;
		}
		return display.front
			? $i18n.trading.limit_order.front_of_book
			: replacePlaceholders($i18n.trading.limit_order.are_ahead, {
					$percentage: display.percent.toString()
				});
	});

	const makerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.makerFeeBps) : null);
	const takerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.takerFeeBps) : null);

	// Filled quantity: shown for a partial fill, and for terminal Cancelled/Expired
	// orders that had already partly filled before leaving the book.
	const showFilled = $derived(
		displayStatus === 'Partial' ||
			((order.status === 'Canceled' || order.status === 'Expired') && filledQuantity > 0)
	);
	const filledDisplay = $derived(
		formatTradeAmount({ amount: filledQuantity, decimals: base.decimals })
	);

	const { labelKey, pillVariant } = $derived(orderStatusView(displayStatus));
	const statusLabels = $derived({
		Open: $i18n.trading.orders.status_open,
		Pending: $i18n.trading.orders.status_pending,
		Partial: $i18n.trading.orders.status_partial,
		Filled: $i18n.trading.orders.status_filled,
		Canceled: $i18n.trading.orders.status_canceled,
		Expired: $i18n.trading.orders.status_expired
	});

	const refreshOrderBook = async (): Promise<void> => {
		if (isNullish(pairInfo)) {
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
		void refreshOrderBook();
	});

	const close = () => modalStore.close();

	let showCancelConfirm = $state(false);
	let canceling = $state(false);

	const confirmCancel = async () => {
		canceling = true;
		const orderFields = { base: baseSymbol, quote: quoteSymbol, side };
		trackTrading({
			subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.CANCEL_ORDER,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			...orderFields
		});
		try {
			await cancelLimitOrder({ identity: $authIdentity, orderId: order.id });
			await loadOisyTrade({ identity: $authIdentity });
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.CANCEL_ORDER,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				...orderFields
			});
			close();
		} catch (err: unknown) {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.CANCEL_ORDER,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				...orderFields,
				error: replaceIcErrorFields(err)
			});
			toastsError({ msg: { text: $i18n.trading.order_detail.cancel_error }, err });
		} finally {
			canceling = false;
			showCancelConfirm = false;
		}
	};
</script>

<Modal onClose={close}>
	{#snippet title()}{$i18n.trading.order_detail.title}{/snippet}

	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={refreshOrderBook} />

	<ContentWithToolbar>
		<div class="mb-4 flex items-center justify-between">
			<span class="text-sm text-tertiary">{$i18n.trading.order_detail.status}</span>
			<Badge variant={pillVariant} width="w-fit">{statusLabels[labelKey]}</Badge>
		</div>

		<LimitOrderIntentHero
			baseAmount={baseAmountDisplay}
			{baseFiat}
			{baseSymbol}
			quoteAmount={quoteAmountDisplay}
			{quoteFiat}
			{quoteSymbol}
			{side}
		/>

		<LimitOrderPriceSummary
			{baseSymbol}
			{currentValueDisplay}
			muted
			{priceDisplay}
			{queueText}
			{quoteSymbol}
			valueDifference={valueDiff}
		/>

		<LimitOrderTermsList
			{makerFee}
			orderTypeLabel={$i18n.trading.limit_order.order_type_gtc}
			{takerFee}
		/>
		{#if showFilled}
			<ModalValue>
				{#snippet label()}{$i18n.trading.order_detail.filled}{/snippet}
				{#snippet mainValue()}{filledDisplay} {baseSymbol}{/snippet}
			</ModalValue>
		{/if}

		{#snippet toolbar()}
			<ButtonGroup>
				<Button colorStyle="secondary" onclick={close}>{$i18n.core.text.close}</Button>
				{#if active}
					<Button
						colorStyle="error"
						onclick={() => (showCancelConfirm = true)}
						testId={TRADING_ORDER_DETAIL_CANCEL_BUTTON}
					>
						{$i18n.trading.order_detail.cancel_order}
					</Button>
				{/if}
			</ButtonGroup>
		{/snippet}
	</ContentWithToolbar>
</Modal>

{#if showCancelConfirm}
	<TradingCancelOrderConfirm
		disabled={canceling}
		onCancel={() => (showCancelConfirm = false)}
		onConfirm={confirmCancel}
		{order}
		priceDisplay={`${priceDisplay} ${quoteSymbol} / ${baseSymbol}`}
		returnsToFree={side === 'sell'
			? `${baseAmountDisplay} ${baseSymbol}`
			: `${quoteAmountDisplay} ${quoteSymbol}`}
	/>
{/if}
