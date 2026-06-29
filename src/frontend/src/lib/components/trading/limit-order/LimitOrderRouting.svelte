<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconChevronRight from '$lib/components/icons/lucide/IconChevronRight.svelte';
	import { OISY_TRADE_PROVIDER_NAME } from '$lib/constants/oisy-trade.constants';
	import { i18n } from '$lib/stores/i18n.store';
	import { replacePlaceholders } from '$lib/utils/i18n.utils';
	import { feeBpsToPercent, type LimitOrderPairView } from '$lib/utils/oisy-trade.utils';

	interface Props {
		pairView?: LimitOrderPairView;
		bid: number | null;
		ask: number | null;
		fillOrKill: boolean;
	}

	let { pairView, bid, ask, fillOrKill }: Props = $props();

	let expanded = $state(false);

	// Relative spread only: (ask − bid) / mid × 100.
	const spreadPercent = $derived.by((): number | null => {
		if (!nonNullish(bid) || !nonNullish(ask)) {
			return null;
		}
		const mid = (ask + bid) / 2;
		return mid > 0 ? ((ask - bid) / mid) * 100 : null;
	});

	const makerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.makerFeeBps) : 0);
	const takerFee = $derived(nonNullish(pairView) ? feeBpsToPercent(pairView.takerFeeBps) : 0);
	const quote = $derived(pairView?.quoteSymbol ?? '');
</script>

<div class="overflow-hidden rounded-lg border border-disabled bg-secondary">
	<button
		class="flex w-full items-center gap-2 px-2.5 py-2 text-left"
		onclick={() => (expanded = !expanded)}
		type="button"
	>
		<span class="bg-success-subtle h-4 w-4 flex-shrink-0 rounded"></span>
		<span class="flex-1 text-xs text-secondary">
			{replacePlaceholders($i18n.trading.limit_order.routing_name, {
				$provider: OISY_TRADE_PROVIDER_NAME
			})}
		</span>
		<span class="rounded-full border border-disabled bg-primary px-2 py-0.5 text-xs text-tertiary">
			{$i18n.trading.limit_order.routing_tag}
		</span>
		<span class="text-tertiary transition-transform" class:rotate-90={expanded}>
			<IconChevronRight size="14" />
		</span>
	</button>

	{#if expanded}
		<div class="border-t border-disabled">
			<div
				class="flex justify-between border-b border-disabled px-2.5 py-1.5 text-xs text-error-primary"
			>
				<span>{$i18n.trading.limit_order.lowest_ask}</span>
				<span>{nonNullish(ask) ? `${ask} ${quote}` : '—'}</span>
			</div>
			<div
				class="flex justify-between border-b border-disabled px-2.5 py-1.5 text-xs text-success-primary"
			>
				<span>{$i18n.trading.limit_order.highest_bid}</span>
				<span>{nonNullish(bid) ? `${bid} ${quote}` : '—'}</span>
			</div>
			<div
				class="flex justify-between border-b border-disabled px-2.5 py-1.5 text-xs text-secondary"
			>
				<span>{$i18n.trading.limit_order.spread}</span>
				<span>
					{nonNullish(spreadPercent)
						? replacePlaceholders($i18n.trading.limit_order.spread_value, {
								$value: spreadPercent.toFixed(1)
							})
						: '—'}
				</span>
			</div>
			{#if !fillOrKill}
				<div
					class="flex justify-between border-b border-disabled px-2.5 py-1.5 text-xs text-secondary"
				>
					<span>{$i18n.trading.limit_order.maker_fee}</span>
					<span>
						{makerFee === 0
							? $i18n.trading.limit_order.no_fee
							: replacePlaceholders($i18n.trading.limit_order.fee_percent, {
									$value: makerFee.toString()
								})}
					</span>
				</div>
			{/if}
			<div class="flex justify-between px-2.5 py-1.5 text-xs text-secondary">
				<span>{$i18n.trading.limit_order.taker_fee}</span>
				<span>
					{takerFee === 0
						? $i18n.trading.limit_order.no_fee
						: replacePlaceholders($i18n.trading.limit_order.fee_percent, {
								$value: takerFee.toString()
							})}
				</span>
			</div>
		</div>
	{/if}
</div>
