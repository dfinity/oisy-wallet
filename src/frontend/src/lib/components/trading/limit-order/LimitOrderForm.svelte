<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import IconInfo from '$lib/components/icons/lucide/IconInfo.svelte';
	import LimitOrderPriceSection from '$lib/components/trading/limit-order/LimitOrderPriceSection.svelte';
	import LimitOrderRouting from '$lib/components/trading/limit-order/LimitOrderRouting.svelte';
	import LimitOrderSideControl from '$lib/components/trading/limit-order/LimitOrderSideControl.svelte';
	import LimitOrderTradePairBox from '$lib/components/trading/limit-order/LimitOrderTradePairBox.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonCancel from '$lib/components/ui/ButtonCancel.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { exchanges } from '$lib/derived/exchange.derived';
	import {
		oisyTradeFreeBalanceBySymbol,
		oisyTradeIcTokenBySymbol
	} from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		decimalsOfStep,
		isOrderValid,
		type LimitOrderPairView,
		type LimitOrderSide,
		limitDecimals,
		maxSpendBaseAmount,
		type PricePreset
	} from '$lib/utils/oisy-trade.utils';

	interface Props {
		side: LimitOrderSide;
		baseSymbol?: string;
		quoteSymbol?: string;
		baseAmount: string;
		price: string;
		fillOrKill: boolean;
		activePreset: PricePreset | null;
		pairView?: LimitOrderPairView;
		currentValue: number;
		bid: number | null;
		ask: number | null;
		depthLevels: {
			asks: { price: number; quantity: number }[];
			bids: { price: number; quantity: number }[];
		};
		onSelectBase: () => void;
		onSelectQuote: () => void;
		onClose: () => void;
		onReview: () => void;
	}

	let {
		side = $bindable(),
		baseSymbol = $bindable(),
		quoteSymbol = $bindable(),
		baseAmount = $bindable(),
		price = $bindable(),
		fillOrKill = $bindable(),
		activePreset = $bindable(),
		pairView,
		currentValue,
		bid,
		ask,
		depthLevels,
		onSelectBase,
		onSelectQuote,
		onClose,
		onReview
	}: Props = $props();

	let fokHelpVisible = $state(false);

	const freeBase = $derived(
		nonNullish(baseSymbol) ? ($oisyTradeFreeBalanceBySymbol[baseSymbol] ?? 0) : 0
	);
	const freeQuote = $derived(
		nonNullish(quoteSymbol) ? ($oisyTradeFreeBalanceBySymbol[quoteSymbol] ?? 0) : 0
	);

	const baseToken = $derived(
		nonNullish(baseSymbol) ? $oisyTradeIcTokenBySymbol[baseSymbol] : undefined
	);
	const baseExchangeRate = $derived(
		nonNullish(baseToken) ? $exchanges?.[baseToken.id]?.usd : undefined
	);

	const quoteToken = $derived(
		nonNullish(quoteSymbol) ? $oisyTradeIcTokenBySymbol[quoteSymbol] : undefined
	);
	const quoteExchangeRate = $derived(
		nonNullish(quoteToken) ? $exchanges?.[quoteToken.id]?.usd : undefined
	);

	const baseNum = $derived(parseFloat(baseAmount));
	const priceNum = $derived(parseFloat(price));
	const freeSpend = $derived(side === 'sell' ? freeBase : freeQuote);

	const valid = $derived(
		nonNullish(pairView) &&
			isOrderValid({
				side,
				baseAmount: baseNum,
				price: priceNum,
				freeBalance: freeSpend,
				pair: pairView,
				fillOrKill,
				bid,
				ask
			})
	);

	const onBaseInput = (value: string) => {
		baseAmount = nonNullish(pairView)
			? limitDecimals({ raw: value, maxDecimals: decimalsOfStep(pairView.lotSize) })
			: value;
	};

	const onPriceInput = (value: string) => {
		price = nonNullish(pairView)
			? limitDecimals({ raw: value, maxDecimals: decimalsOfStep(pairView.tickSize) })
			: value;
		// A manual edit clears any preset highlight; LimitOrderPriceSection re-derives it.
		activePreset = null;
	};

	const onMax = () => {
		if (nonNullish(pairView)) {
			const max = maxSpendBaseAmount({
				side,
				freeBase,
				freeQuote,
				price: priceNum,
				pair: pairView
			});
			if (nonNullish(max)) {
				baseAmount = max.toString();
			}
		}
	};

	const toggleFok = () => {
		fillOrKill = !fillOrKill;
	};

	const toggleFokHelp = () => {
		fokHelpVisible = !fokHelpVisible;
	};
</script>

<ContentWithToolbar>
	<div class="flex flex-col gap-3">
		<LimitOrderSideControl bind:side />

		<LimitOrderTradePairBox
			{baseAmount}
			{baseExchangeRate}
			{baseSymbol}
			{baseToken}
			{freeBase}
			{freeQuote}
			{onBaseInput}
			{onMax}
			{onSelectBase}
			{onSelectQuote}
			{pairView}
			{price}
			{quoteExchangeRate}
			{quoteSymbol}
			{quoteToken}
			{side}
		/>

		<LimitOrderPriceSection
			{ask}
			{bid}
			{currentValue}
			{depthLevels}
			{fillOrKill}
			{onPriceInput}
			{pairView}
			{side}
			bind:price
			bind:activePreset
		/>

		<!-- Fill-or-kill: collapsed description, (?) expands it (Active-networks pattern). -->
		<div class="rounded-lg border border-disabled bg-secondary px-3 py-2">
			<!-- `--checkbox-label-order: 1` puts the box before the label (same as the
				 transaction-filter panels), so it reads "[✓] Fill or kill". -->
			<div style="--checkbox-label-order: 1;" class="flex items-center justify-between">
				<Checkbox checked={fillOrKill} inputId="limit-order-fok" onChange={toggleFok} text="inline">
					<span class="text-sm font-semibold text-primary">
						{$i18n.trading.limit_order.fok_title}
					</span>
				</Checkbox>
				<button
					class="flex h-4 w-4 items-center text-tertiary"
					aria-label={$i18n.trading.limit_order.fok_title}
					onclick={toggleFokHelp}
					type="button"
				>
					<IconInfo />
				</button>
			</div>
			{#if fokHelpVisible}
				<p class="mt-2 text-xs text-tertiary" transition:slide
					>{$i18n.trading.limit_order.fok_help}</p
				>
			{/if}
		</div>

		<LimitOrderRouting {ask} {bid} {fillOrKill} {pairView} />
	</div>

	{#snippet toolbar()}
		<ButtonGroup>
			<ButtonCancel onclick={onClose} />
			<Button disabled={!valid} onclick={onReview}>
				{$i18n.trading.limit_order.review_button}
			</Button>
		</ButtonGroup>
	{/snippet}
</ContentWithToolbar>
