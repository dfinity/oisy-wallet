<script lang="ts">
	import IconCircleArrowDown from '$lib/components/icons/lucide/IconCircleArrowDown.svelte';
	import SwapToken from '$lib/components/swap/SwapToken.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OptionAmount } from '$lib/types/send';
	import type { Token } from '$lib/types/token';
	import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';

	// Read-only two-leg intent hero shared by the limit-order Review and the
	// order-detail modal: "You SELL/BUY <base>" on top, the derived quote bound
	// below, with a centered direction arrow. Built from the same `SwapToken` rows
	// and card as `TokensReview`, so it reads identically to the Swap review —
	// logo, amount, fiat line — with the limit-order labels. Amounts are display
	// strings so each caller rounds to the pair's decimals; the fiat line is
	// derived from the exchange rate, and is omitted when no rate is known.
	interface Props {
		side: LimitOrderSide;
		baseAmount: OptionAmount;
		quoteAmount: OptionAmount;
		baseToken?: Token;
		quoteToken?: Token;
		baseExchangeRate?: number;
		quoteExchangeRate?: number;
	}

	let {
		side,
		baseAmount,
		quoteAmount,
		baseToken,
		quoteToken,
		baseExchangeRate,
		quoteExchangeRate
	}: Props = $props();
</script>

<div class="mb-6 rounded-lg border border-solid border-tertiary bg-primary p-4 shadow-sm">
	<SwapToken amount={baseAmount} exchangeRate={baseExchangeRate} token={baseToken}>
		{#snippet title()}
			{$i18n.trading.limit_order.hero_prefix}
			<!-- Red sell / green buy, as the order rows colour their side word. -->
			<strong
				class="font-bold"
				class:text-error-primary={side === 'sell'}
				class:text-success-primary={side === 'buy'}
			>
				{side === 'sell' ? $i18n.trading.limit_order.sell : $i18n.trading.limit_order.buy}
			</strong>
		{/snippet}
	</SwapToken>

	<!-- Same divider as `TokensReview`; only the arrow flips, because a buy reads
		 bottom-up (you pay the quote to get the base). -->
	<div class="my-2 flex w-full items-center justify-between text-tertiary-inverted">
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted"></div>
		{#if side === 'sell'}
			<IconCircleArrowDown />
		{:else}
			<span class="flex rotate-180"><IconCircleArrowDown /></span>
		{/if}
		<div class="h-[1px] w-[45%] bg-tertiary text-tertiary-inverted"></div>
	</div>

	<SwapToken amount={quoteAmount} exchangeRate={quoteExchangeRate} token={quoteToken}>
		{#snippet title()}
			{side === 'sell'
				? $i18n.trading.limit_order.you_get_at_least
				: $i18n.trading.limit_order.you_pay_at_most}
		{/snippet}
	</SwapToken>
</div>
