<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import IconPlus from '$lib/components/icons/lucide/IconPlus.svelte';
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import OisyTradeOrderRow from '$lib/components/trading/OisyTradeOrderRow.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import DelayedTooltip from '$lib/components/ui/DelayedTooltip.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		oisyTradeActiveOrders,
		oisyTradeHasAssets,
		oisyTradePairs
	} from '$lib/derived/oisy-trade.derived';
	import { loadOrderBook } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
	import { toTradingPair } from '$lib/utils/oisy-trade.utils';

	// A row is keyed to its pair's order book by the symbol pair, so multiple orders
	// on the same pair share one book — polled once per distinct pair, not per order.
	const pairKey = ({ base, quote }: OisyTradeOrderView): string => `${base.symbol}/${quote.symbol}`;

	// The distinct pairs backing the active orders, resolved to their candid pair
	// info (needed to query the book), keyed by symbol pair.
	const activePairs = $derived.by((): Record<string, TradingPairInfo> => {
		const pairs: Record<string, TradingPairInfo> = {};
		for (const order of $oisyTradeActiveOrders) {
			const info = $oisyTradePairs.find(
				(p) =>
					p.base.metadata.symbol === order.base.symbol &&
					p.quote.metadata.symbol === order.quote.symbol
			);
			if (nonNullish(info)) {
				pairs[pairKey(order)] = info;
			}
		}
		return pairs;
	});

	// Only re-run the load when the SET of pairs changes, not on every refresh.
	const activePairsKey = $derived(Object.keys(activePairs).sort().join(','));

	let orderBooks = $state<Record<string, OisyTradeOrderBook>>({});

	const refreshOrderBooks = async (): Promise<void> => {
		const pairs = untrack(() => activePairs);
		const keys = Object.keys(pairs);
		if (keys.length === 0) {
			return;
		}
		const entries = await Promise.all(
			keys.map(async (key): Promise<[string, OisyTradeOrderBook | undefined]> => [
				key,
				await loadOrderBook({ identity: $authIdentity, pair: toTradingPair(pairs[key]) })
			])
		);
		// Keep the last good snapshot per pair on a transient failure.
		const next = { ...untrack(() => orderBooks) };
		for (const [key, book] of entries) {
			if (nonNullish(book)) {
				next[key] = book;
			}
		}
		orderBooks = next;
	};

	$effect(() => {
		activePairsKey;
		void refreshOrderBooks();
	});
</script>

<StakeContentSection>
	{#snippet title()}
		<h4>{$i18n.trading.page.active_orders}</h4>
	{/snippet}

	{#snippet action()}
		<LimitOrder>
			{#snippet trigger(open)}
				{#if $oisyTradeHasAssets}
					<Button colorStyle="primary" onclick={open} paddingSmall type="button">
						<IconPlus size="16" />
						{$i18n.trading.page.new_order}
					</Button>
				{:else}
					<!-- Deposit-first: no free balance to place an order against yet. -->
					<DelayedTooltip text={$i18n.trading.page.new_order_disabled}>
						<Button colorStyle="primary" disabled paddingSmall type="button">
							<IconPlus size="16" />
							{$i18n.trading.page.new_order}
						</Button>
					</DelayedTooltip>
				{/if}
			{/snippet}
		</LimitOrder>
	{/snippet}

	{#snippet content()}
		{#if $oisyTradeActiveOrders.length === 0}
			<EmptyState
				description={$oisyTradeHasAssets
					? $i18n.trading.page.active_orders_empty_place
					: $i18n.trading.page.active_orders_empty_deposit}
				title={$i18n.trading.orders.empty_active}
			/>
		{:else}
			<ul class="flex list-none flex-col">
				{#each $oisyTradeActiveOrders as order (order.id)}
					<li transition:slide={SLIDE_PARAMS}>
						<OisyTradeOrderRow {order} orderBook={orderBooks[pairKey(order)]} />
					</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</StakeContentSection>

{#if Object.keys(activePairs).length > 0}
	<IntervalLoader
		interval={OISY_TRADE_POLL_INTERVAL_MILLIS}
		onLoad={refreshOrderBooks}
		skipInitialLoad
	/>
{/if}
