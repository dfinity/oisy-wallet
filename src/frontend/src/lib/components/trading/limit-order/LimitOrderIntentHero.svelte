<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import IconArrowDown from '$lib/components/icons/lucide/IconArrowDown.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

	// Read-only two-box intent hero shared by the limit-order Review and the
	// order-detail modal: "You SELL/BUY <base>" on top, the derived quote bound
	// below, with a centered direction arrow. Amounts are display strings so each
	// caller formats them consistently; fiat lines are optional (detail only).
	interface Props {
		side: LimitOrderSide;
		baseAmount: string;
		baseSymbol: string;
		quoteAmount: string;
		quoteSymbol: string;
		baseFiat?: string;
		quoteFiat?: string;
	}

	let { side, baseAmount, baseSymbol, quoteAmount, quoteSymbol, baseFiat, quoteFiat }: Props =
		$props();
</script>

<div class="relative mb-4 rounded-lg border border-disabled">
	<div class="px-3.5 py-3">
		<div class="mb-1 text-xs text-secondary">
			{$i18n.trading.limit_order.hero_prefix}
			<strong class="font-bold text-primary uppercase">
				{side === 'sell' ? $i18n.trading.limit_order.sell : $i18n.trading.limit_order.buy}
			</strong>
		</div>
		<div class="text-xl font-medium text-primary">{baseAmount} {baseSymbol}</div>
		{#if nonNullish(baseFiat)}
			<div class="text-xs text-tertiary">{baseFiat}</div>
		{/if}
	</div>
	<div class="border-t border-disabled px-3.5 py-3">
		<div class="mb-1 text-xs text-secondary">
			{side === 'sell'
				? $i18n.trading.limit_order.you_get_at_least
				: $i18n.trading.limit_order.you_pay_at_most}
		</div>
		<div class="text-xl font-medium text-primary">{quoteAmount} {quoteSymbol}</div>
		{#if nonNullish(quoteFiat)}
			<div class="text-xs text-tertiary">{quoteFiat}</div>
		{/if}
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
