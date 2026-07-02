<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { slide } from 'svelte/transition';
	import ValueDifference from '$lib/components/ui/ValueDifference.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';

	// Read-only price card shared by the limit-order Review and the order-detail
	// modal: the limit-price headline plus current value, the value-difference
	// (crossing gate: neutral/amber/red, no green) and — for resting orders — the
	// queue position. Values are display strings so both callers format alike.
	interface Props {
		priceDisplay: string;
		baseSymbol: string;
		quoteSymbol: string;
		// Formatted current value; `undefined` renders "-".
		currentValueDisplay?: string;
		valueDifference: number;
		// Neutral (informational) while resting; false surfaces the amber/red gate.
		muted: boolean;
		queueText?: string;
	}

	let {
		priceDisplay,
		baseSymbol,
		quoteSymbol,
		currentValueDisplay,
		valueDifference,
		muted,
		queueText
	}: Props = $props();
</script>

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
				{nonNullish(currentValueDisplay)
					? replacePlaceholders($i18n.trading.limit_order.current_value_feed, {
							$price: currentValueDisplay,
							$quote: quoteSymbol,
							$base: baseSymbol
						})
					: '-'}
			</span>
		</div>
		{#if nonNullish(currentValueDisplay)}
			<div class="flex items-center justify-between text-xs" transition:slide>
				<span class="text-tertiary">{$i18n.trading.limit_order.value_difference_label}</span>
				<ValueDifference
					errorLevel={-5}
					iconPosition="left"
					{muted}
					successNeutral
					value={valueDifference}
					warningLevel={0}
				/>
			</div>
		{/if}
		{#if nonNullish(queueText)}
			<div class="flex items-center justify-between text-xs" transition:slide>
				<span class="text-tertiary">{$i18n.trading.limit_order.queue_position_row}</span>
				<span class="font-medium text-secondary">{queueText}</span>
			</div>
		{/if}
	</div>
</div>
