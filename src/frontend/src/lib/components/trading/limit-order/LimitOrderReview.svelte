<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import LimitOrderIntentHero from '$lib/components/trading/limit-order/LimitOrderIntentHero.svelte';
	import LimitOrderPriceSummary from '$lib/components/trading/limit-order/LimitOrderPriceSummary.svelte';
	import LimitOrderTermsList from '$lib/components/trading/limit-order/LimitOrderTermsList.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonBack from '$lib/components/ui/ButtonBack.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import Html from '$lib/components/ui/Html.svelte';
	import MessageBox from '$lib/components/ui/MessageBox.svelte';
	import { LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT } from '$lib/constants/oisy-trade.constants';
	import { oisyTradeIcTokenBySymbol } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		deriveQuoteAmount,
		feeBpsToPercent,
		formatTradeAmount,
		type LimitOrderPairView,
		type LimitOrderSide,
		queuePositionDisplay,
		queuePositionFraction,
		restsAgainstValue,
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

	// Display strings, rounded to the pair's decimals so nothing leaks raw float
	// artifacts into the shared hero / price-summary.
	const baseAmountDisplay = $derived(
		formatTradeAmount({ amount: baseAmount, decimals: pairView?.baseDecimals ?? 8 })
	);
	// Undefined rather than a dash below the min notional: the hero's shared
	// `SwapToken` row parses the amount, so a placeholder string would throw.
	const quoteAmountDisplay = $derived(
		quoteAmount > 0
			? formatTradeAmount({ amount: quoteAmount, decimals: pairView?.quoteDecimals ?? 8 })
			: undefined
	);

	// Resolved the same way the form does, so the hero can show each leg's logo
	// exactly as the Swap review does.
	const baseToken = $derived($oisyTradeIcTokenBySymbol[base]);
	const quoteToken = $derived($oisyTradeIcTokenBySymbol[quote]);
	const priceDisplay = $derived(
		formatTradeAmount({ amount: price, decimals: pairView?.quoteDecimals ?? 8 })
	);
	const currentValueDisplay = $derived(
		currentValue > 0
			? formatTradeAmount({ amount: currentValue, decimals: pairView?.quoteDecimals ?? 8 })
			: undefined
	);

	const crossing = $derived(crossesBook({ side, price, bid, ask }));
	const valueDiff = $derived(valueDifferencePercent({ side, price, currentValue }));
	const severe = $derived(crossing && valueDiff < LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT);

	// The resting counterpart of `severe`: the order does not fill now, but it is
	// priced more than 5% against current value, so it is the one the market
	// reaches first and it would fill at that give-up. Same treatment as a severe
	// crossing order — its own copy, and the confirmation is required before
	// placing. The two are mutually exclusive (`restsAgainstValue` excludes
	// crossing prices), so at most one box shows and they share one confirmation.
	const severeResting = $derived(
		restsAgainstValue({
			side,
			price,
			currentValue,
			bid,
			ask,
			threshold: LIMIT_ORDER_VALUE_DIFFERENCE_ERROR_PERCENT
		})
	);

	const confirmationRequired = $derived(severe || severeResting);

	const orderType = $derived(
		fillOrKill ? $i18n.trading.limit_order.order_type_fok : $i18n.trading.limit_order.order_type_gtc
	);

	// Null while the pair is unknown (loading / missing) so the UI shows "-"
	// rather than the misleading "no fee" label a 0 fallback would render.
	const makerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.makerFeeBps) : null);
	const takerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.takerFeeBps) : null);

	// Queue position only for a resting order (a crossing order fills now).
	const queueText = $derived.by((): string | undefined => {
		if (crossing) {
			return undefined;
		}
		const fraction = queuePositionFraction({
			side,
			price,
			tickSize: pairView?.tickSize ?? 0,
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
	const placeDisabled = $derived(confirmationRequired && !giveUpConfirmed);
</script>

<ContentWithToolbar>
	<LimitOrderIntentHero
		baseAmount={baseAmountDisplay}
		{baseToken}
		quoteAmount={quoteAmountDisplay}
		{quoteToken}
		{side}
	/>

	<LimitOrderPriceSummary
		baseSymbol={base}
		{currentValueDisplay}
		{priceDisplay}
		{queueText}
		quoteSymbol={quote}
		valueDifference={valueDiff}
	/>

	<LimitOrderTermsList {makerFee} orderTypeLabel={orderType} {takerFee} takerOnly={fillOrKill} />

	{#if confirmationRequired}
		<div class="mt-4" transition:slide>
			<MessageBox level="error" styleClass="!mb-0">
				{#snippet icon()}
					<Checkbox
						checked={giveUpConfirmed}
						inputId="limit-order-giveup"
						onChange={() => (giveUpConfirmed = !giveUpConfirmed)}
					/>
				{/snippet}

				<label class="block text-sm leading-snug" for="limit-order-giveup">
					<!-- A crossing order's give-up is already spelled out on the form and
						 in the price rows above, so it needs only the acknowledgement. A
						 resting order against current value repeats the form's warning
						 first: nothing else on this screen says the order is likely to
						 fill soon. -->
					{#if severeResting}
						<span class="mb-1 block">
							{side === 'sell'
								? $i18n.trading.limit_order.warning_resting_below_value_sell
								: $i18n.trading.limit_order.warning_resting_above_value_buy}
						</span>
					{/if}

					<Html
						text={severeResting
							? $i18n.trading.limit_order.rests_against_value_confirm
							: $i18n.trading.limit_order.give_up_confirm}
					/>
				</label>
			</MessageBox>
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
