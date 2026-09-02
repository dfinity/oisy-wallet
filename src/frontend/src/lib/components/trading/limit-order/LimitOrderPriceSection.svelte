<script lang="ts">
	import { isNullish, nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import TokenInputContainer from '$lib/components/tokens/TokenInputContainer.svelte';
	import PillButton from '$lib/components/ui/PillButton.svelte';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
	import { LIMIT_ORDER_RESTING_VALUE_DIFFERENCE_WARNING_PERCENT } from '$lib/constants/oisy-trade.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import {
		crossesBook,
		formatTradeAmount,
		type LimitOrderPairView,
		type LimitOrderSide,
		presetTargetPrice,
		type PricePreset,
		queuePositionDisplay,
		queuePositionFraction,
		restsAgainstValue,
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

	// The visible title names the field for screen readers: the input has no
	// `<label>`, and a placeholder is not an accessible name.
	const uid = $props.id();
	const labelId = `limit-order-price-label-${uid}`;

	// Drives the shared container's brand focus border, the same way
	// `TokenInputContent` tracks it for the amount fields.
	let focused = $state(false);

	const priceNum = $derived(parseFloat(price));
	const active = $derived(nonNullish(pairView));

	const crossing = $derived(active && crossesBook({ side, price: priceNum, bid, ask }));

	// Priced against the user while still resting: no immediate fill, so none of
	// the crossing warnings apply, yet the order is the one the market reaches
	// first and it would fill below (Sell) / above (Buy) current value.
	const restingAgainstValue = $derived(
		active &&
			restsAgainstValue({
				side,
				price: priceNum,
				currentValue,
				bid,
				ask,
				threshold: LIMIT_ORDER_RESTING_VALUE_DIFFERENCE_WARNING_PERCENT
			})
	);

	const valueDiff = $derived(valueDifferencePercent({ side, price: priceNum, currentValue }));

	const showValueDifference = $derived(priceNum > 0 && currentValue > 0);

	// The book side we'd cross against (bid when selling, ask when buying). Null
	// when that side is empty — without it crossing is indeterminate, so we can't
	// judge FOK-blocked and mustn't surface a bogus reference price of 0.
	const referencePrice = $derived(side === 'sell' ? bid : ask);

	// FOK that can't cross would be canceled — surfaced as a blocking warning.
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

	const setPreset = (preset: PricePreset) => {
		if (isNullish(pairView)) {
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
					{
						$price: formatTradeAmount({ amount: refPrice, decimals: pairView?.quoteDecimals ?? 8 })
					}
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
		if (restingAgainstValue) {
			return {
				text:
					side === 'sell' ? t.warning_resting_below_value_sell : t.warning_resting_above_value_buy,
				danger: valueDiff < -5
			};
		}
		return undefined;
	});

	const hasFooter = $derived(
		showValueDifference || nonNullish(queueText) || nonNullish(tickError) || nonNullish(warningText)
	);

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
	const pricePresets = $derived<{ preset: PricePreset; label: string }[]>([
		{ preset: 0, label: $i18n.trading.limit_order.preset_market },
		{ preset: 1, label: presetLabel1 },
		{ preset: 5, label: presetLabel5 }
	]);
</script>

<!-- The filled pill marks the latched preset; it clears on a manual price edit
	 (which nulls `activePreset`) and follows the market while latched. -->
{#snippet presetButton({
	preset,
	label,
	arrow = false
}: {
	preset: PricePreset;
	label: string;
	arrow?: boolean;
})}
	<PillButton onClick={() => setPreset(preset)} selected={activePreset === preset}>
		<span class="flex items-center gap-1">
			{label}

			<!-- Which way the offset moves the price: up for a sell, down for a buy.
				 Rotating `IconArrowDown` is how `LimitOrderSideControl` draws its own
				 up arrow — there is no `IconArrowUp` in the set. -->
			{#if arrow}
				<span class="flex" class:rotate-180={side === 'sell'}>
					<IconArrowDown size="14" />
				</span>
			{/if}
		</span>
	</PillButton>
{/snippet}

<div
	class="rounded-lg border bg-secondary px-3 py-3"
	class:border-disabled={isNullish(warningText)}
	class:border-error-primary={nonNullish(warningText) && warningText.danger}
	class:border-warning-primary={nonNullish(warningText) && !warningText.danger}
>
	<!-- The presets share the title's line: they set the very price the title names,
		 and lifting them out of the space under the field keeps the box short. Title
		 plus pills comes to ~483px against the 488px the dialog leaves at its 560px
		 width, so the row wraps rather than scrolls — the longest labels (fill-or-kill,
		 or a five-character base symbol) and every phone width drop the pills onto a
		 line of their own instead of clipping them. -->
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<span id={labelId} class="text-sm font-bold text-primary">{label}</span>

		<div class="flex flex-wrap items-center gap-2">
			{@render presetButton({ preset: 'book', label: bidAskLabel })}

			<!-- Keeps the book price set apart from the three value-derived presets,
				 as the `|` did when these were links. -->
			<span class="h-4 w-px shrink-0 bg-disabled" aria-hidden="true"></span>

			{#each pricePresets as { preset, label } (preset)}
				{@render presetButton({ preset, label, arrow: preset !== 0 })}
			{/each}
		</div>
	</div>

	<!-- The shared container, so the field carries the same frame, height and
		 focus/hover behaviour as the amount inputs — the quote symbol sits where
		 those put their token selector. The inner input mirrors what
		 `TokenInputCurrency` renders: borderless, full-height, bold, px-3. -->
	<TokenInputContainer error={nonNullish(tickError)} {focused} styleClass="h-14 text-xl">
		<input
			class="h-full w-full min-w-0 border-none bg-transparent px-3 font-bold text-primary outline-none disabled:cursor-not-allowed disabled:text-tertiary"
			aria-labelledby={labelId}
			disabled={!active}
			onblur={() => (focused = false)}
			onfocus={() => (focused = true)}
			oninput={(e) => onPriceInput(e.currentTarget.value)}
			placeholder={$i18n.trading.limit_order.price_placeholder}
			type="text"
			value={price}
		/>

		<div class="h-3/4 w-[1px] bg-disabled"></div>

		<span class="flex h-full shrink-0 items-center px-3 text-sm font-semibold text-primary">
			{pairView?.quoteSymbol ?? ''}
		</span>
	</TokenInputContainer>

	<!-- Everything the entered price implies, on one row under the field: the messages
		 read left, the value difference is pinned right. The row always renders and only
		 its top margin is conditional — gating it behind an `{#if}` would leave the
		 lines inside needing `|global` to animate at all, and a global outro makes the
		 wizard hold this step on screen until it finishes, dragging the price box into
		 the next step on the way to Review. -->
	<div class="flex items-start justify-between gap-2" class:mt-2={hasFooter}>
		<div class="flex min-w-0 flex-1 flex-col gap-1">
			{#if nonNullish(queueText)}
				<p class="mb-0 text-xs text-tertiary" transition:slide={SLIDE_PARAMS}>{queueText}</p>
			{/if}

			{#if nonNullish(tickError)}
				<p class="mb-0 text-xs text-error-primary" transition:slide={SLIDE_PARAMS}>{tickError}</p>
			{/if}

			{#if nonNullish(warningText)}
				<!-- Plain line rather than a tinted chip: its own `px-2.5` indented the
					 copy past the title and field, and the subtle fill barely reads on the
					 box's own background. The section border already carries the alert
					 colour. -->
				<p
					class="mb-0 text-xs"
					class:text-error-primary={warningText.danger}
					class:text-warning-primary={!warningText.danger}
					transition:slide={SLIDE_PARAMS}
				>
					{warningText.text}
				</p>
			{/if}
		</div>

		{#if showValueDifference}
			<!-- `ValueDifference` sets no size of its own; without `text-sm` it
				 inherits the base 16px and ends up the largest text in the box.
				 Coloured whenever a warning is shown below — crossing, fill-or-kill, or
				 a resting price against current value — so the figure and the warning
				 always agree; neutral otherwise. -->
			<span class="shrink-0 text-sm">
				<ValueDifference
					errorLevel={-5}
					iconPosition="left"
					muted={!(crossing || fillOrKill || restingAgainstValue)}
					successNeutral
					value={valueDiff}
					warningLevel={0}
				/>
			</span>
		{/if}
	</div>
</div>
