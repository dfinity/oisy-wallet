<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		OISY_TRADE_LEARN_MORE_URL,
		OISY_TRADE_POLL_INTERVAL_MILLIS
	} from '$lib/constants/oisy-trade.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });
</script>

{#if OISY_TRADE_ENABLED}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

	<div class="flex flex-col gap-2">
		<p class="text-sm text-tertiary">{$i18n.trading.text.intro}</p>
		<ExternalLink
			ariaLabel={$i18n.trading.text.learn_more}
			color="blue"
			href={OISY_TRADE_LEARN_MORE_URL}
			iconVisible={false}
			inline
		>
			{$i18n.trading.text.learn_more}
		</ExternalLink>
	</div>

	<!-- My assets (PR2) renders here once built. -->

	<!--
		Orders section header. PR4b owns the full Active/History orders list; this
		lightweight placeholder header carries the "+ Limit order" entry point so
		the limit-order modal is reachable and testable in the meantime.
	-->
	<div class="mt-4 flex items-center justify-between">
		<h3 class="text-base font-bold text-primary">{$i18n.trading.orders.title}</h3>
		<LimitOrder>
			{#snippet trigger(open)}
				<button class="text-sm font-medium text-brand-primary" onclick={open} type="button">
					{$i18n.trading.orders.add_limit_order}
				</button>
			{/snippet}
		</LimitOrder>
	</div>
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
