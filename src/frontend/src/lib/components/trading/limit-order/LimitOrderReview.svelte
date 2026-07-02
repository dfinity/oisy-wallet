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
	const quoteAmountDisplay = $derived(
		quoteAmount > 0
			? formatTradeAmount({ amount: quoteAmount, decimals: pairView?.quoteDecimals ?? 8 })
			: '-'
	);
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
	const severe = $derived(crossing && valueDiff < -5);

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
	const placeDisabled = $derived(severe && !giveUpConfirmed);
</script>

<ContentWithToolbar>
	<LimitOrderIntentHero
		baseAmount={baseAmountDisplay}
		baseSymbol={base}
		quoteAmount={quoteAmountDisplay}
		quoteSymbol={quote}
		{side}
	/>

	<LimitOrderPriceSummary
		baseSymbol={base}
		{currentValueDisplay}
		muted={!(crossing || fillOrKill)}
		{priceDisplay}
		{queueText}
		quoteSymbol={quote}
		valueDifference={valueDiff}
	/>

	<LimitOrderTermsList {makerFee} orderTypeLabel={orderType} {takerFee} takerOnly={fillOrKill} />

	{#if severe}
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
					<Html text={$i18n.trading.limit_order.give_up_confirm} />
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
