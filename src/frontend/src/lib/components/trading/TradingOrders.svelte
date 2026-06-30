<script lang="ts">
	import TradingOrderRow from '$lib/components/trading/TradingOrderRow.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import Tabs from '$lib/components/ui/Tabs.svelte';
	import { oisyTradeActiveOrders, oisyTradeHistoryOrders } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';

	let activeTab = $state<'active' | 'history'>('active');
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
			{:else}
				<ul class="flex flex-col list-none">
					{#each $oisyTradeActiveOrders as order (order.id)}
						<li><TradingOrderRow {order} /></li>
					{/each}
				</ul>
			{/if}
		{:else if activeTab === 'history'}
			{#if $oisyTradeHistoryOrders.length === 0}
				<p class="py-2 text-tertiary">{$i18n.trading.orders.empty_history}</p>
			{:else}
				<ul class="flex flex-col list-none">
					{#each $oisyTradeHistoryOrders as order (order.id)}
						<li><TradingOrderRow {order} /></li>
					{/each}
				</ul>
			{/if}
		{/if}
	</Tabs>
</div>
