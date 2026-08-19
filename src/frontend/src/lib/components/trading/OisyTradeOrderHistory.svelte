<script lang="ts">
	import StakeContentSection from '$lib/components/stake/StakeContentSection.svelte';
	import OisyTradeOrderRow from '$lib/components/trading/OisyTradeOrderRow.svelte';
	import { oisyTradeHistoryOrders } from '$lib/derived/oisy-trade.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { oisyTradeHistoryCountLabel } from '$lib/utils/oisy-trade.utils';

	// Terminal orders (Filled / Canceled / Expired). There is no empty state — the
	// whole section is hidden until the user has past orders, so it stays out of
	// the Empty and Deposited page states.
	const countLabel = $derived(
		oisyTradeHistoryCountLabel({ orders: $oisyTradeHistoryOrders, i18n: $i18n })
	);
</script>

{#if $oisyTradeHistoryOrders.length > 0}
	<StakeContentSection>
		{#snippet title()}
			<h4>{$i18n.trading.page.order_history}</h4>
		{/snippet}

		{#snippet action()}
			<span class="text-sm text-tertiary">{countLabel}</span>
		{/snippet}

		{#snippet content()}
			<ul class="flex list-none flex-col">
				{#each $oisyTradeHistoryOrders as order (order.id)}
					<li>
						<OisyTradeOrderRow {order} />
					</li>
				{/each}
			</ul>
		{/snippet}
	</StakeContentSection>
{/if}
