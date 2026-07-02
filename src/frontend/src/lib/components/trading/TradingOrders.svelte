<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import { untrack } from 'svelte';
	import { slide } from 'svelte/transition';
	import type { TradingPairInfo } from '$declarations/oisy_trade/oisy_trade.did';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import TradingOrderDetailModal from '$lib/components/trading/TradingOrderDetailModal.svelte';
	import TradingOrderRow from '$lib/components/trading/TradingOrderRow.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { SLIDE_PARAMS } from '$lib/constants/transition.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import {
		modalOisyTradeOrderDetail,
		modalOisyTradeOrderDetailData
	} from '$lib/derived/modal.derived';
	import {
		oisyTradeActiveOrders,
		oisyTradeHistoryOrders,
		oisyTradePairs
	} from '$lib/derived/oisy-trade.derived';
	import { loadOrderBook } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenListStore } from '$lib/stores/token-list.store';
	import type { OisyTradeOrderBook, OisyTradeOrderView } from '$lib/types/oisy-trade';
	import {
		oisyTradeOrderMatchesFilter,
		toTradingPair,
		type OisyTradeSearchLabels
	} from '$lib/utils/oisy-trade.utils';

	let activeTab = $state<'active' | 'history'>('active');

	// The order rows render side, status and provider through these i18n strings;
	// matching against the same values keeps the search in sync with any language.
	let searchLabels = $derived<OisyTradeSearchLabels>({
		sideSell: $i18n.trading.orders.side_sell,
		sideBuy: $i18n.trading.orders.side_buy,
		status: {
			Open: $i18n.trading.orders.status_open,
			Pending: $i18n.trading.orders.status_pending,
			Partial: $i18n.trading.orders.status_partial,
			Filled: $i18n.trading.orders.status_filled,
			Canceled: $i18n.trading.orders.status_canceled,
			Expired: $i18n.trading.orders.status_expired
		},
		provider: $i18n.trading.text.provider_name
	});

	let filteredActiveOrders = $derived(
		$oisyTradeActiveOrders.filter((order) =>
			oisyTradeOrderMatchesFilter({ order, filter: $tokenListStore.filter, labels: searchLabels })
		)
	);

	let filteredHistoryOrders = $derived(
		$oisyTradeHistoryOrders.filter((order) =>
			oisyTradeOrderMatchesFilter({ order, filter: $tokenListStore.filter, labels: searchLabels })
		)
	);

	// A row is keyed to its pair's order book by the pair's symbol pair. Multiple
	// active orders on the same pair therefore share a single book — the book is
	// polled once per distinct pair, not once per order.
	const pairKey = ({ base, quote }: OisyTradeOrderView): string => `${base.symbol}/${quote.symbol}`;

	// The distinct pairs backing the current active orders, resolved to their
	// candid pair info (needed to query the book), keyed by symbol pair.
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

	// Only re-run the initial/reactive load when the SET of pairs changes, not on
	// every orders-store refresh.
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

<div class="mt-4 flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<h3 class="text-base font-bold text-primary">{$i18n.trading.orders.title}</h3>
		<LimitOrder>
			{#snippet trigger(open)}
				<button class="text-sm font-medium text-brand-primary" onclick={open} type="button">
					{$i18n.trading.orders.add_limit_order}
				</button>
			{/snippet}
		</LimitOrder>
	</div>

	<Tabs
		tabs={[
			{ label: $i18n.trading.orders.tab_active, id: 'active' },
			{ label: $i18n.trading.orders.tab_history, id: 'history' }
		]}
		bind:activeTab
	>
		{#if activeTab === 'active'}
			{#if $oisyTradeActiveOrders.length === 0}
				<p class="py-2 text-tertiary">{$i18n.trading.orders.empty_active}</p>
			{:else if filteredActiveOrders.length === 0}
				<p class="py-2 text-tertiary">{$i18n.core.text.no_results}</p>
			{:else}
				<ul class="flex flex-col list-none">
					{#each filteredActiveOrders as order (order.id)}
						<li transition:slide={SLIDE_PARAMS}>
							<TradingOrderRow {order} orderBook={orderBooks[pairKey(order)]} />
						</li>
					{/each}
				</ul>
			{/if}
		{:else if activeTab === 'history'}
			{#if $oisyTradeHistoryOrders.length === 0}
				<p class="py-2 text-tertiary">{$i18n.trading.orders.empty_history}</p>
			{:else if filteredHistoryOrders.length === 0}
				<p class="py-2 text-tertiary">{$i18n.core.text.no_results}</p>
			{:else}
				<ul class="flex flex-col list-none">
					{#each filteredHistoryOrders as order (order.id)}
						<li transition:slide={SLIDE_PARAMS}>
							<TradingOrderRow {order} />
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</Tabs>
</div>

{#if Object.keys(activePairs).length > 0}
	<IntervalLoader
		interval={OISY_TRADE_POLL_INTERVAL_MILLIS}
		onLoad={refreshOrderBooks}
		skipInitialLoad
	/>
{/if}

{#if $modalOisyTradeOrderDetail && nonNullish($modalOisyTradeOrderDetailData)}
	<TradingOrderDetailModal order={$modalOisyTradeOrderDetailData} />
{/if}
