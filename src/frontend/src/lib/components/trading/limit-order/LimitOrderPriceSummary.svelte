<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import Hr from '$lib/components/ui/Hr.svelte';
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
	import {
		SWAP_VALUE_DIFFERENCE_ERROR_VALUE,
		SWAP_VALUE_DIFFERENCE_WARNING_VALUE
	} from '$lib/constants/swap.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// Read-only price rows shared by the limit-order Review and the order-detail
	// modal: the limit price plus current value, the value difference (neutral while
	// the order is favourable, amber/red as it gives value up — `valueDifference`
	// is signed relative to the caller's side) and — for resting orders — the
	// queue position. Rendered as `ModalValue` rows, the same key/value style the Swap
	// review uses and that `LimitOrderTermsList` already uses right below.
	// Values are display strings so both callers format alike.
	interface Props {
		priceDisplay: string;
		baseSymbol: string;
		quoteSymbol: string;
		// Formatted current value; `undefined` renders "-".
		currentValueDisplay?: string;
		valueDifference: number;
		queueText?: string;
	}

	let {
		priceDisplay,
		baseSymbol,
		quoteSymbol,
		currentValueDisplay,
		valueDifference,
		queueText
	}: Props = $props();
</script>

<div>
	<ModalValue>
		{#snippet label()}
			{$i18n.trading.limit_order.limit_price}
		{/snippet}

		{#snippet mainValue()}
			<!-- The one figure the whole screen is about, so it outranks the rows it
				 sits above — the `ModalValue` row structure is shared, the type scale
				 is not. -->
			<span class="text-lg">
				{replacePlaceholders($i18n.trading.limit_order.limit_price_value, {
					$price: priceDisplay,
					$quote: quoteSymbol,
					$base: baseSymbol
				})}
			</span>
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}
			{$i18n.trading.limit_order.current_value}
		{/snippet}

		{#snippet mainValue()}
			<!-- `ModalValue` bolds every value it renders. These three read as context
				 for the limit price above, not as figures in their own right, so they
				 step back down to regular weight. -->
			<span class="font-normal">
				{nonNullish(currentValueDisplay)
					? replacePlaceholders($i18n.trading.limit_order.current_value_feed, {
							$price: currentValueDisplay,
							$quote: quoteSymbol,
							$base: baseSymbol
						})
					: '-'}
			</span>
		{/snippet}
	</ModalValue>

	{#if nonNullish(currentValueDisplay)}
		<div class="mb-2" transition:slide>
			<ModalValue>
				{#snippet label()}
					{$i18n.trading.limit_order.value_difference_label}
				{/snippet}

				{#snippet mainValue()}
					<!-- `successNeutral`, unlike the Swap review: a swap's difference is
						 realized on the spot, so green means money made. A limit order has
						 not executed yet — a favourable gap is the premium being asked for,
						 not a gain — so the figure stays neutral until it turns amber/red for
						 giving value up. `ValueDifference` bolds itself in those two states,
						 which is why they keep their weight while this row loses it. -->
					<span class="font-normal">
						<ValueDifference
							errorLevel={SWAP_VALUE_DIFFERENCE_ERROR_VALUE}
							iconPosition="left"
							successNeutral
							value={valueDifference}
							warningLevel={SWAP_VALUE_DIFFERENCE_WARNING_VALUE}
						/>
					</span>
				{/snippet}
			</ModalValue>
		</div>
	{/if}

	{#if nonNullish(queueText)}
		<div class="mb-2" transition:slide>
			<ModalValue>
				{#snippet label()}
					{$i18n.trading.limit_order.queue_position_row}
				{/snippet}

				{#snippet mainValue()}
					<span class="font-normal">{queueText}</span>
				{/snippet}
			</ModalValue>
		</div>
	{/if}
</div>

<!-- Splits the order's price terms from its execution terms, the grouping the
	 two cards had before both became `ModalValue` rows. -->
<Hr spacing="md" />
