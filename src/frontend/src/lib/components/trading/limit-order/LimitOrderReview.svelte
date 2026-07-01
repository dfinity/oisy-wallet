<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import LimitOrderValueDifference from '$lib/components/trading/limit-order/LimitOrderValueDifference.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		deriveQuoteAmount,
		feeBpsToPercent,
		type LimitOrderPairView,
		type LimitOrderSide,
		queuePositionDisplay,
		queuePositionFraction,
		valueDifferencePercent
	} from '$lib/utils/oisy-trade.utils';

	interface Props {
		side: LimitOrderSide;
		pairView?: LimitOrderPairView;
		baseAmount: number;
		price: number;
		currentValue: number;
		bid: number | null;
		ask: number | null;
		fillOrKill: boolean;
		depthLevels: {
			asks: { price: number; quantity: number }[];
			bids: { price: number; quantity: number }[];
		};
		giveUpConfirmed: boolean;
		onBack: () => void;
		onPlace: () => void;
	}

	let {
		side,
		pairView,
		baseAmount,
		price,
		currentValue,
		bid,
		ask,
		fillOrKill,
		depthLevels,
		giveUpConfirmed = $bindable(),
		onBack,
		onPlace
	}: Props = $props();

	const quoteAmount = $derived(deriveQuoteAmount({ baseAmount, price }));
	const base = $derived(pairView?.baseSymbol ?? '');
	const quote = $derived(pairView?.quoteSymbol ?? '');

	const crossing = $derived(crossesBook({ side, price, bid, ask }));
	const valueDiff = $derived(valueDifferencePercent({ side, price, currentValue }));
	const severe = $derived(crossing && valueDiff < -5);

	const quoteLabel = $derived(
		side === 'sell'
			? $i18n.trading.limit_order.you_get_at_least
			: $i18n.trading.limit_order.you_pay_at_most
	);

	const orderType = $derived(
		fillOrKill ? $i18n.trading.limit_order.order_type_fok : $i18n.trading.limit_order.order_type_gtc
	);

	// Null while the pair is unknown (loading / missing) so the UI shows "—"
	// rather than the misleading "no fee" label a 0 fallback would render.
	const makerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.makerFeeBps) : null);
	const takerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.takerFeeBps) : null);
	const feePercent = (value: number | null): string =>
		value === null
			? '—'
			: value === 0
				? $i18n.trading.limit_order.no_fee
				: replacePlaceholders($i18n.trading.limit_order.fee_percent, { $value: value.toString() });

	// Queue position only for a resting order (a crossing order fills now) with a
	// known pair — without one the tick size (and thus the position) is unknown.
	const queueText = $derived.by((): string | undefined => {
		if (crossing || !nonNullish(pairView)) {
			return undefined;
		}
		const fraction = queuePositionFraction({
			side,
			price,
			tickSize: pairView.tickSize,
			asks: depthLevels.asks,
			bids: depthLevels.bids
		});
		const display = queuePositionDisplay(fraction);
		if (display === null) {
			return undefined;
		}
		return display.front
			? $i18n.trading.limit_order.front_of_book
			: replacePlaceholders($i18n.trading.limit_order.are_ahead, {
					$percentage: display.percent.toString()
				});
	});

	// >5% give-up requires the confirmation; FOK shows the taker fee only.
	const placeDisabled = $derived(severe && !giveUpConfirmed);
</script>

<ContentWithToolbar>
	<!-- Two-box hero: base always on top, side-aware labels. -->
	<div class="relative mb-4 rounded-lg border border-disabled">
		<div class="px-3.5 py-3">
			<div class="mb-1 text-xs text-secondary">
				{$i18n.trading.limit_order.hero_prefix}
				<strong class="font-bold text-primary uppercase">
					{side === 'sell' ? $i18n.trading.limit_order.sell : $i18n.trading.limit_order.buy}
				</strong>
			</div>
			<div class="text-xl font-medium text-primary">{baseAmount} {base}</div>
		</div>
		<div class="border-t border-disabled px-3.5 py-3">
			<div class="mb-1 text-xs text-secondary">{quoteLabel}</div>
			<div class="text-xl font-medium text-primary">
				{quoteAmount > 0 ? quoteAmount : '—'}
				{quote}
			</div>
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

	<!-- Price section card -->
	<div class="mb-3 rounded-lg border border-disabled px-3.5 py-3">
		<div class="flex items-baseline justify-between">
			<span class="text-sm text-secondary">{$i18n.trading.limit_order.limit_price}</span>
			<span class="text-lg font-semibold text-primary">
				{replacePlaceholders($i18n.trading.limit_order.limit_price_value, {
					$price: price.toString(),
					$quote: quote,
					$base: base
				})}
			</span>
		</div>
		<div class="mt-2.5 flex flex-col gap-1.5 border-t border-disabled pt-2.5">
			<div class="flex items-center justify-between text-xs">
				<span class="text-tertiary">{$i18n.trading.limit_order.current_value}</span>
				<span class="font-medium text-secondary">
					{currentValue > 0
						? replacePlaceholders($i18n.trading.limit_order.current_value_feed, {
								$price: currentValue.toString(),
								$quote: quote,
								$base: base
							})
						: '—'}
				</span>
			</div>
			<div class="flex items-center justify-between text-xs">
				<span class="text-tertiary">{$i18n.trading.limit_order.value_difference_label}</span>
				<LimitOrderValueDifference crossing={crossing || fillOrKill} value={valueDiff} />
			</div>
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
		{#snippet mainValue()}{orderType}{/snippet}
	</ModalValue>
	<ModalValue>
		{#snippet label()}
			{fillOrKill ? $i18n.trading.limit_order.fee_taker : $i18n.trading.limit_order.fee_maker_taker}
		{/snippet}
		{#snippet mainValue()}
			{#if fillOrKill}
				{feePercent(takerFee)}
			{:else}
				{replacePlaceholders($i18n.trading.limit_order.fee_maker_taker_value, {
					$maker: feePercent(makerFee),
					$taker: feePercent(takerFee)
				})}
			{/if}
		{/snippet}
	</ModalValue>

	{#if severe}
		<div class="bg-error-subtle mt-3 rounded-lg px-3 py-2.5 text-xs text-error-primary">
			<Checkbox
				checked={giveUpConfirmed}
				inputId="limit-order-giveup"
				onChange={() => (giveUpConfirmed = !giveUpConfirmed)}
				text="inline"
			>
				<span class="text-xs">{$i18n.trading.limit_order.give_up_confirm}</span>
			</Checkbox>
		</div>
	{/if}

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonBack onclick={onBack} />
			<Button disabled={placeDisabled} onclick={onPlace}>
				{$i18n.trading.limit_order.place_order_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
