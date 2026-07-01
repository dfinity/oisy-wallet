<script lang="ts">
	import { Modal } from '@dfinity/gix-components';
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import TradingCancelOrderConfirm from '$lib/components/trading/TradingCancelOrderConfirm.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
	import {
		OISY_TRADE_POLL_INTERVAL_MILLIS,
		OISY_TRADE_PROVIDER_NAME
	} from '$lib/constants/oisy-trade.constants';
	import { TRADING_ORDER_DETAIL_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { currentCurrency } from '$lib/derived/currency.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { currentLanguage } from '$lib/derived/i18n.derived';
	import { oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import {
		cancelLimitOrder,
		loadOisyTrade,
		loadOrderBook
	} from '$lib/services/oisy-trade.services';
	import { currencyExchangeStore } from '$lib/stores/currency-exchange.store';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
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
	const feePercent = (value: number | null): string =>
		value === null
			? '-'
			: value === 0
				? $i18n.trading.limit_order.no_fee
				: replacePlaceholders($i18n.trading.limit_order.fee_percent, { $value: value.toString() });

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
		try {
			await cancelLimitOrder({ identity: $authIdentity, orderId: order.id });
			await loadOisyTrade({ identity: $authIdentity });
			close();
		} catch (err: unknown) {
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

		<!-- Two-box intent hero -->
		<div class="relative mb-4 rounded-lg border border-disabled">
			<div class="px-3.5 py-3">
				<div class="mb-1 text-xs text-secondary">
					{$i18n.trading.limit_order.hero_prefix}
					<strong class="font-bold text-primary uppercase">
						{side === 'sell' ? $i18n.trading.limit_order.sell : $i18n.trading.limit_order.buy}
					</strong>
				</div>
				<div class="text-xl font-medium text-primary">{baseAmountDisplay} {baseSymbol}</div>
				{#if nonNullish(baseFiat)}
					<div class="text-xs text-tertiary">{baseFiat}</div>
				{/if}
			</div>
			<div class="border-t border-disabled px-3.5 py-3">
				<div class="mb-1 text-xs text-secondary">
					{side === 'sell'
						? $i18n.trading.limit_order.you_get_at_least
						: $i18n.trading.limit_order.you_pay_at_most}
				</div>
				<div class="text-xl font-medium text-primary">{quoteAmountDisplay} {quoteSymbol}</div>
				{#if nonNullish(quoteFiat)}
					<div class="text-xs text-tertiary">{quoteFiat}</div>
				{/if}
			</div>
			<span
				class="absolute top-1/2 left-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-secondary bg-primary text-tertiary"
			>
				{#if side === 'sell'}
					<IconArrowDown size="16" />
				{:else}
					<span class="rotate-180"><IconArrowDown size="16" /></span>
				{/if}
			</span>
		</div>

		<!-- Price section -->
		<div class="mb-3 rounded-lg border border-disabled px-3.5 py-3">
			<div class="flex items-baseline justify-between">
				<span class="text-sm text-secondary">{$i18n.trading.limit_order.limit_price}</span>
				<span class="text-lg font-semibold text-primary">
					{replacePlaceholders($i18n.trading.limit_order.limit_price_value, {
						$price: priceDisplay,
						$quote: quoteSymbol,
						$base: baseSymbol
					})}
				</span>
			</div>
			<div class="mt-2.5 flex flex-col gap-1.5 border-t border-disabled pt-2.5">
				<div class="flex items-center justify-between text-xs">
					<span class="text-tertiary">{$i18n.trading.limit_order.current_value}</span>
					<span class="font-medium text-secondary">
						{currentValue > 0
							? replacePlaceholders($i18n.trading.limit_order.current_value_feed, {
									$price: formatTradeAmount({ amount: currentValue, decimals: quote.decimals }),
									$quote: quoteSymbol,
									$base: baseSymbol
								})
							: '-'}
					</span>
				</div>
				{#if currentValue > 0}
					<div class="flex items-center justify-between text-xs">
						<span class="text-tertiary">{$i18n.trading.limit_order.value_difference_label}</span>
						<ValueDifference
							errorLevel={-5}
							iconPosition="left"
							muted
							successNeutral
							value={valueDiff}
						/>
					</div>
				{/if}
				{#if nonNullish(queueText)}
					<div class="flex items-center justify-between text-xs">
						<span class="text-tertiary">{$i18n.trading.limit_order.queue_position_row}</span>
						<span class="font-medium text-secondary">{queueText}</span>
					</div>
				{/if}
			</div>
		</div>

		<ModalValue>
			{#snippet label()}{$i18n.trading.limit_order.dex}{/snippet}
			{#snippet mainValue()}{OISY_TRADE_PROVIDER_NAME}{/snippet}
		</ModalValue>
		<ModalValue>
			{#snippet label()}{$i18n.trading.limit_order.order_type}{/snippet}
			{#snippet mainValue()}{$i18n.trading.limit_order.order_type_gtc}{/snippet}
		</ModalValue>
		<ModalValue>
			{#snippet label()}{$i18n.trading.limit_order.fee_maker_taker}{/snippet}
			{#snippet mainValue()}
				{replacePlaceholders($i18n.trading.limit_order.fee_maker_taker_value, {
					$maker: feePercent(makerFee),
					$taker: feePercent(takerFee)
				})}
			{/snippet}
		</ModalValue>
		{#if showFilled}
			<ModalValue>
				{#snippet label()}{$i18n.trading.order_detail.filled}{/snippet}
				{#snippet mainValue()}{filledDisplay} {baseSymbol}{/snippet}
			</ModalValue>
		{/if}

		{#snippet toolbar()}
			<ButtonGroup>
				<Button onclick={close}>{$i18n.core.text.close}</Button>
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
