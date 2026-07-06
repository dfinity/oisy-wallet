<script lang="ts">
	import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import LimitOrderForm from '$lib/components/trading/limit-order/LimitOrderForm.svelte';
	import LimitOrderProgress from '$lib/components/trading/limit-order/LimitOrderProgress.svelte';
	import LimitOrderReview from '$lib/components/trading/limit-order/LimitOrderReview.svelte';
	import LimitOrderTokensList from '$lib/components/trading/limit-order/LimitOrderTokensList.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { exchanges } from '$lib/derived/exchange.derived';
	import { oisyTradeIcTokenBySymbol, oisyTradePairs } from '$lib/derived/oisy-trade.derived';
	import {
		PLAUSIBLE_EVENT_RESULT_STATUSES,
		PLAUSIBLE_EVENT_SUBCONTEXT_TRADING
	} from '$lib/enums/plausible';
	import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
	import { WizardStepsLimitOrder } from '$lib/enums/wizard-steps';
	import { loadOisyTrade, loadOrderBook, placeLimitOrder } from '$lib/services/oisy-trade.services';
	import { trackTrading, type TrackTradingParams } from '$lib/services/trading-analytics.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { toastsError } from '$lib/stores/toasts.store';
	import type { OisyTradeOrderBook } from '$lib/types/oisy-trade';
	import type { WizardModal, WizardStep, WizardSteps } from '$lib/types/wizard';
	import { replaceIcErrorFields } from '$lib/utils/error.utils';
	import {
		type LimitOrderSide,
		presetTargetPrice,
		priceLevelToHuman,
		toCandidSide,
		toPairView,
		toPriceUnits,
		toQuantity,
		toTradingPair
	} from '$lib/utils/oisy-trade.utils';
	import { goToWizardStep } from '$lib/utils/wizard-modal.utils';

	interface Props {
		currentStep?: WizardStep<WizardStepsLimitOrder>;
		steps: WizardSteps<WizardStepsLimitOrder>;
		modal: WizardModal<WizardStepsLimitOrder>;
		progressStep: string;
		onBack: () => void;
		onClose: () => void;
	}

	let {
		currentStep,
		steps,
		modal = $bindable(),
		progressStep = $bindable(),
		onBack,
		onClose
	}: Props = $props();

	// --- shared form state -------------------------------------------------
	let side: LimitOrderSide = $state('sell');
	let baseSymbol: string | undefined = $state();
	let quoteSymbol: string | undefined = $state();
	let baseAmount: string = $state('');
	let price: string = $state('');
	let fillOrKill: boolean = $state(false);
	// Whether the price still equals a preset target (highlight state).
	let activePreset: 'book' | 0 | 1 | 5 | null = $state(null);
	// Whether the >5% give-up confirmation was checked on the Review step.
	let giveUpConfirmed: boolean = $state(false);
	let orderBook: OisyTradeOrderBook | undefined = $state();

	const pairs = $derived($oisyTradePairs);

	const pairInfo: TradingPairInfo | undefined = $derived(
		nonNullish(baseSymbol) && nonNullish(quoteSymbol)
			? pairs.find(
					(p) => p.base.metadata.symbol === baseSymbol && p.quote.metadata.symbol === quoteSymbol
				)
			: undefined
	);

	const pairView = $derived(nonNullish(pairInfo) ? toPairView(pairInfo) : undefined);

	// Best bid/ask in human quote-per-base, derived from the live ticker.
	const bid = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.bid) : undefined;
		return nonNullish(level) && nonNullish(pairView)
			? priceLevelToHuman({
					level,
					baseDecimals: pairView.baseDecimals,
					quoteDecimals: pairView.quoteDecimals
				}).price
			: null;
	});
	const ask = $derived.by((): number | null => {
		const level = nonNullish(orderBook?.ticker) ? fromNullable(orderBook.ticker.ask) : undefined;
		return nonNullish(level) && nonNullish(pairView)
			? priceLevelToHuman({
					level,
					baseDecimals: pairView.baseDecimals,
					quoteDecimals: pairView.quoteDecimals
				}).price
			: null;
	});

	// USD exchange-rate price of each leg, from the app-wide price feed.
	const baseToken = $derived(
		nonNullish(baseSymbol) ? $oisyTradeIcTokenBySymbol[baseSymbol] : undefined
	);
	const quoteToken = $derived(
		nonNullish(quoteSymbol) ? $oisyTradeIcTokenBySymbol[quoteSymbol] : undefined
	);
	const baseUsdPrice = $derived(
		nonNullish(baseToken) ? $exchanges?.[baseToken.id]?.usd : undefined
	);
	const quoteUsdPrice = $derived(
		nonNullish(quoteToken) ? $exchanges?.[quoteToken.id]?.usd : undefined
	);

	// "Current value" reference the percentage presets (Market / ±%) and the
	// value-difference indicator anchor on. Deliberately the *cross* of the two
	// legs' USD exchange-rate prices (base ÷ quote), NOT the DEX order-book mid.
	// Unusual for an order-book UI, but intentional: the book mid can be stale or
	// one-sided on a thin book, whereas the USD feed gives a stable fair-value
	// reference independent of current on-chain liquidity. The book bid/ask/mid
	// still drives the Bid/Ask preset and the crossing / fill-or-kill checks.
	// 0 when either price is missing, so the percentage presets and the
	// value-difference stay inert until the feed loads.
	const currentValue = $derived.by((): number => {
		if (nonNullish(baseUsdPrice) && nonNullish(quoteUsdPrice) && quoteUsdPrice > 0) {
			return baseUsdPrice / quoteUsdPrice;
		}
		return 0;
	});

	// While a preset is latched, keep the price tracking its live target as the
	// reference rate (or book) moves — but only on the Form step. Opening Review
	// freezes the price: this effect stops running there, mirroring how the swap
	// flow freezes its quote at review. A manual price edit clears `activePreset`
	// (see LimitOrderForm), so typing detaches the price from the market.
	$effect(() => {
		if (
			currentStep?.name !== WizardStepsLimitOrder.FORM ||
			isNullish(activePreset) ||
			isNullish(pairView)
		) {
			return;
		}
		const target = presetTargetPrice({
			preset: activePreset,
			side,
			currentValue,
			bid,
			ask,
			tickSize: pairView.tickSize
		});
		if (nonNullish(target)) {
			price = target.toString();
		}
	});

	// Aggregated depth in human units, for the queue-position projection.
	const depthLevels = $derived.by(() => {
		if (isNullish(orderBook?.depth) || isNullish(pairView)) {
			return { asks: [], bids: [] };
		}
		const map = (level: { price: bigint; quantity: bigint }) =>
			priceLevelToHuman({
				level,
				baseDecimals: pairView.baseDecimals,
				quoteDecimals: pairView.quoteDecimals
			});
		return {
			asks: orderBook.depth.asks.map(map),
			bids: orderBook.depth.bids.map(map)
		};
	});

	const refreshOrderBook = async (): Promise<void> => {
		if (isNullish(pairInfo)) {
			orderBook = undefined;
			return;
		}
		const next = await loadOrderBook({
			identity: $authIdentity,
			pair: toTradingPair(pairInfo)
		});
		// Keep the last good snapshot on a transient failure.
		if (nonNullish(next)) {
			orderBook = next;
		}
	};

	// Reset the price anchor whenever either token or the side changes.
	$effect(() => {
		// Touch the dependencies so the effect re-runs on pair/side change.
		baseSymbol;
		quoteSymbol;
		side;
		void refreshOrderBook();
	});

	const goTo = (stepName: WizardStepsLimitOrder) => goToWizardStep({ modal, steps, stepName });

	// Frozen market snapshot captured the moment Review opens, so the confirmation
	// screen stays put while the ticker / price feed keep polling underneath.
	let reviewCurrentValue = $state(0);
	let reviewBid = $state<number | null>(null);
	let reviewAsk = $state<number | null>(null);
	let reviewDepthLevels = $state<{
		asks: { price: number; quantity: number }[];
		bids: { price: number; quantity: number }[];
	}>({ asks: [], bids: [] });

	const openReview = () => {
		reviewCurrentValue = currentValue;
		reviewBid = bid;
		reviewAsk = ask;
		reviewDepthLevels = depthLevels;
		goTo(WizardStepsLimitOrder.REVIEW);
	};

	// Parsed Review inputs, guarded against NaN from empty/partial fields so the
	// Review step never renders NaN (nor feeds NaN% into ValueDifference).
	const reviewBaseAmount = $derived(
		Number.isFinite(parseFloat(baseAmount)) ? parseFloat(baseAmount) : 0
	);
	const reviewPrice = $derived(Number.isFinite(parseFloat(price)) ? parseFloat(price) : 0);

	const place = async () => {
		if (isNullish(pairInfo) || isNullish(pairView)) {
			return;
		}
		const baseNum = parseFloat(baseAmount);
		const priceNum = parseFloat(price);
		if (!(baseNum > 0) || !(priceNum > 0)) {
			return;
		}

		goTo(WizardStepsLimitOrder.PLACING);
		progressStep = ProgressStepsLimitOrder.PLACE;

		const orderFields: Pick<
			TrackTradingParams,
			'base' | 'quote' | 'side' | 'orderType' | 'volume'
		> = {
			base: baseSymbol,
			quote: quoteSymbol,
			side,
			orderType: fillOrKill ? 'FOK' : 'GTC',
			// Order volume is the base-token quantity. Use the raw entered string rather than
			// the parsed number so full precision is preserved (no `1e-7`).
			volume: baseAmount
		};
		trackTrading({
			subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.LIMIT_ORDER,
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.EXECUTING,
			...orderFields
		});

		try {
			await placeLimitOrder({
				identity: $authIdentity,
				request: {
					pair: toTradingPair(pairInfo),
					side: toCandidSide(side),
					quantity: toQuantity({ baseAmount: baseNum, baseDecimals: pairView.baseDecimals }),
					price: toPriceUnits({ price: priceNum, quoteDecimals: pairView.quoteDecimals }),
					time_in_force: fillOrKill ? [{ FillOrKill: null }] : [{ GoodTilCanceled: null }]
				}
			});

			// The place call resolves once the order is accepted (Pending/Open), so
			// reload immediately to surface it in the Active list rather than waiting
			// for the next poll.
			await loadOisyTrade({ identity: $authIdentity });

			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.LIMIT_ORDER,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
				...orderFields
			});
			progressStep = ProgressStepsLimitOrder.DONE;
			onClose();
		} catch (err: unknown) {
			trackTrading({
				subContext: PLAUSIBLE_EVENT_SUBCONTEXT_TRADING.LIMIT_ORDER,
				resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
				...orderFields,
				error: replaceIcErrorFields(err)
			});
			toastsError({ msg: { text: $i18n.trading.limit_order.place_error }, err });
			goTo(WizardStepsLimitOrder.REVIEW);
		}
	};
</script>

{#if currentStep?.name !== WizardStepsLimitOrder.PLACING}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={refreshOrderBook} />
{/if}

{#if currentStep?.name === WizardStepsLimitOrder.BASE_TOKEN}
	<LimitOrderTokensList
		mode="base"
		onCancel={onBack}
		onSelect={(symbol) => {
			if (baseSymbol !== symbol) {
				baseAmount = '';
			}
			baseSymbol = symbol;
			quoteSymbol = undefined;
			price = '';
			activePreset = null;
			goTo(WizardStepsLimitOrder.QUOTE_TOKEN);
		}}
		{side}
	/>
{:else if currentStep?.name === WizardStepsLimitOrder.QUOTE_TOKEN}
	<LimitOrderTokensList
		{baseSymbol}
		mode="quote"
		onCancel={() => goTo(WizardStepsLimitOrder.FORM)}
		onSelect={(symbol) => {
			quoteSymbol = symbol;
			price = '';
			activePreset = null;
			goTo(WizardStepsLimitOrder.FORM);
		}}
		{side}
	/>
{:else if currentStep?.name === WizardStepsLimitOrder.REVIEW}
	<LimitOrderReview
		ask={reviewAsk}
		baseAmount={reviewBaseAmount}
		bid={reviewBid}
		currentValue={reviewCurrentValue}
		depthLevels={reviewDepthLevels}
		{fillOrKill}
		onBack={() => goTo(WizardStepsLimitOrder.FORM)}
		onPlace={place}
		{pairView}
		price={reviewPrice}
		{side}
		bind:giveUpConfirmed
	/>
{:else if currentStep?.name === WizardStepsLimitOrder.PLACING}
	<LimitOrderProgress limitOrderProgressStep={progressStep} />
{:else}
	<LimitOrderForm
		{ask}
		{bid}
		{currentValue}
		{depthLevels}
		{onClose}
		onReview={openReview}
		onSelectBase={() => goTo(WizardStepsLimitOrder.BASE_TOKEN)}
		onSelectQuote={() => goTo(WizardStepsLimitOrder.QUOTE_TOKEN)}
		{pairView}
		bind:side
		bind:baseSymbol
		bind:quoteSymbol
		bind:baseAmount
		bind:price
		bind:fillOrKill
		bind:activePreset
	/>
{/if}
