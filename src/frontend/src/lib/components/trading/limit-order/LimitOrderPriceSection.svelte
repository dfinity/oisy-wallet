<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import LimitOrderValueDifference from '$lib/components/trading/limit-order/LimitOrderValueDifference.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		type LimitOrderPairView,
		type LimitOrderSide,
		isPresetSelected,
		presetTargetPrice,
		type PricePreset,
		queuePositionDisplay,
		queuePositionFraction,
		validatePrice,
		valueDifferencePercent
	} from '$lib/utils/oisy-trade.utils';

	interface Props {
		price: string;
		activePreset: PricePreset | null;
		side: LimitOrderSide;
		pairView?: LimitOrderPairView;
		currentValue: number;
		bid: number | null;
		ask: number | null;
		fillOrKill: boolean;
		depthLevels: {
			asks: { price: number; quantity: number }[];
			bids: { price: number; quantity: number }[];
		};
		onPriceInput: (value: string) => void;
	}

	let {
		price = $bindable(),
		activePreset = $bindable(),
		side,
		pairView,
		currentValue,
		bid,
		ask,
		fillOrKill,
		depthLevels,
		onPriceInput
	}: Props = $props();

	const priceNum = $derived(parseFloat(price));
	const active = $derived(nonNullish(pairView));

	const crossing = $derived(active && crossesBook({ side, price: priceNum, bid, ask }));

	const valueDiff = $derived(valueDifferencePercent({ side, price: priceNum, currentValue }));

	// The book side we'd cross against (bid when selling, ask when buying). Null
	// when that side is empty — without it we can't judge crossing or FOK-blocked,
	// and the warning would otherwise surface a bogus reference price of 0.
	const referencePrice = $derived(side === 'sell' ? bid : ask);

	// FOK that can't cross would be canceled — surfaced as a blocking warning.
	// Requires a known reference price; otherwise crossing is indeterminate.
	const fokBlocked = $derived(
		fillOrKill && priceNum > 0 && active && nonNullish(referencePrice) && !crossing
	);

	const tickValid = $derived(
		nonNullish(pairView) && priceNum > 0 ? validatePrice({ price: priceNum, pair: pairView }) : true
	);

	const label = $derived.by((): string => {
		const t = $i18n.trading.limit_order;
		const base = pairView?.baseSymbol ?? '';
		if (!active) {
			return t.price_label_default;
		}
		if (fokBlocked) {
			return replacePlaceholders(side === 'sell' ? t.price_label_fok_sell : t.price_label_fok_buy, {
				$base: base
			});
		}
		if (crossing) {
			return replacePlaceholders(
				side === 'sell' ? t.price_label_sell_crossing : t.price_label_buy_crossing,
				{ $base: base }
			);
		}
		return replacePlaceholders(
			side === 'sell' ? t.price_label_sell_resting : t.price_label_buy_resting,
			{ $base: base }
		);
	});

	const presetSelected = (preset: PricePreset): boolean =>
		active &&
		isPresetSelected({
			preset,
			price: priceNum,
			side,
			currentValue,
			bid,
			ask,
			tickSize: pairView?.tickSize ?? 0
		});

	const setPreset = (preset: PricePreset) => {
		if (!nonNullish(pairView)) {
			return;
		}
		const target = presetTargetPrice({
			preset,
			side,
			currentValue,
			bid,
			ask,
			tickSize: pairView.tickSize
		});
		if (nonNullish(target)) {
			price = target.toString();
			activePreset = preset;
		}
	};

	const queue = $derived.by(() => {
		if (!active || crossing || !(priceNum > 0)) {
			return null;
		}
		const fraction = queuePositionFraction({
			side,
			price: priceNum,
			tickSize: pairView?.tickSize ?? 0,
			asks: depthLevels.asks,
			bids: depthLevels.bids
		});
		return queuePositionDisplay(fraction);
	});

	const queueText = $derived.by((): string | undefined => {
		if (queue === null) {
			return undefined;
		}
		const t = $i18n.trading.limit_order;
		const position = queue.front
			? t.front_of_book
			: replacePlaceholders(t.are_ahead, { $percentage: queue.percent.toString() });
		return replacePlaceholders(t.queue_position, { $position: position });
	});

	const tickError = $derived(
		nonNullish(pairView) && priceNum > 0 && !tickValid
			? replacePlaceholders($i18n.trading.limit_order.error_tick_multiple, {
					$step: pairView.tickSize.toString()
				})
			: undefined
	);

	const warningText = $derived.by((): { text: string; danger: boolean } | undefined => {
		const t = $i18n.trading.limit_order;
		if (fokBlocked) {
			const refPrice = referencePrice ?? 0;
			return {
				text: replacePlaceholders(
					side === 'sell' ? t.warning_fok_blocked_sell : t.warning_fok_blocked_buy,
					{ $price: refPrice.toString() }
				),
				danger: true
			};
		}
		if (crossing) {
			if (fillOrKill) {
				return {
					text: side === 'sell' ? t.warning_fok_sell : t.warning_fok_buy,
					danger: valueDiff < -5
				};
			}
			return {
				text: side === 'sell' ? t.warning_crossing_sell : t.warning_crossing_buy,
				danger: valueDiff < -5
			};
		}
		return undefined;
	});

	const presetLabel1 = $derived(
		side === 'sell'
			? $i18n.trading.limit_order.preset_sell_1
			: $i18n.trading.limit_order.preset_buy_1
	);
	const presetLabel5 = $derived(
		side === 'sell'
			? $i18n.trading.limit_order.preset_sell_5
			: $i18n.trading.limit_order.preset_buy_5
	);
	const bidAskLabel = $derived(
		side === 'sell' ? $i18n.trading.limit_order.preset_bid : $i18n.trading.limit_order.preset_ask
	);
</script>

<div
	class="rounded-lg border bg-secondary px-3 py-2.5"
	class:border-disabled={!nonNullish(warningText)}
	class:border-error-primary={nonNullish(warningText) && warningText.danger}
	class:border-warning-primary={nonNullish(warningText) && !warningText.danger}
>
	<div class="flex items-center justify-between gap-2">
		<span class="text-xs text-secondary">{label}</span>
		<div class="flex items-center gap-1.5 text-xs">
			<button
				class="underline"
				class:font-semibold={presetSelected('book')}
				class:text-brand-primary={!presetSelected('book')}
				class:text-primary={presetSelected('book')}
				onclick={() => setPreset('book')}
				type="button">{bidAskLabel}</button
			>
			<span class="text-tertiary">·</span>
			<button
				class="underline"
				class:font-semibold={presetSelected(0)}
				class:text-brand-primary={!presetSelected(0)}
				class:text-primary={presetSelected(0)}
				onclick={() => setPreset(0)}
				type="button">{$i18n.trading.limit_order.preset_market}</button
			>
			<span class="text-tertiary">·</span>
			<button
				class="underline"
				class:font-semibold={presetSelected(1)}
				class:text-brand-primary={!presetSelected(1)}
				class:text-primary={presetSelected(1)}
				onclick={() => setPreset(1)}
				type="button">{presetLabel1}</button
			>
			<span class="text-tertiary">·</span>
			<button
				class="underline"
				class:font-semibold={presetSelected(5)}
				class:text-brand-primary={!presetSelected(5)}
				class:text-primary={presetSelected(5)}
				onclick={() => setPreset(5)}
				type="button">{presetLabel5}</button
			>
		</div>
	</div>

	<div class="mt-2 flex items-baseline justify-between gap-2">
		<div class="flex items-baseline gap-1">
			<input
				class="w-32 rounded-md border border-secondary bg-primary px-2 py-1 text-xl text-primary outline-none focus:border-brand-primary"
				class:border-error-primary={nonNullish(tickError)}
				disabled={!active}
				oninput={(e) => onPriceInput(e.currentTarget.value)}
				placeholder={$i18n.trading.limit_order.price_placeholder}
				type="text"
				value={price}
			/>
			<span class="text-xs text-secondary">{pairView?.quoteSymbol ?? ''}</span>
		</div>
		{#if priceNum > 0 && currentValue > 0}
			<LimitOrderValueDifference {crossing} value={valueDiff} />
		{/if}
	</div>

	{#if nonNullish(tickError)}
		<p class="mt-1 text-xs text-error-primary">{tickError}</p>
	{/if}

	{#if nonNullish(queueText)}
		<p class="mt-1.5 text-xs text-tertiary">{queueText}</p>
	{/if}

	{#if nonNullish(warningText)}
		<p
			class="mt-2 rounded-md px-2.5 py-2 text-xs"
			class:bg-error-subtle={warningText.danger}
			class:bg-warning-subtle={!warningText.danger}
			class:text-error-primary={warningText.danger}
			class:text-warning-primary={!warningText.danger}
		>
			{warningText.text}
		</p>
	{/if}
</div>
