<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import TradingAssets from '$lib/components/trading/TradingAssets.svelte';
	import TradingDepositModal from '$lib/components/trading/TradingDepositModal.svelte';
	import TradingListSkeleton from '$lib/components/trading/TradingListSkeleton.svelte';
	import TradingOnboarding from '$lib/components/trading/TradingOnboarding.svelte';
	import LimitOrder from '$lib/components/trading/limit-order/LimitOrder.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ExternalLink from '$lib/components/ui/ExternalLink.svelte';
	import {
		OISY_TRADE_LEARN_MORE_URL,
		OISY_TRADE_POLL_INTERVAL_MILLIS
	} from '$lib/constants/oisy-trade.constants';
	import { authIdentity, authSignedIn } from '$lib/derived/auth.derived';
	import { modalTradingDeposit } from '$lib/derived/modal.derived';
	import { oisyTradeHasAssets, oisyTradeLoaded } from '$lib/derived/oisy-trade.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';
	import { modalStore } from '$lib/stores/modal.store';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });

	const modalId = Symbol();
	const openDeposit = () => modalStore.openTradingDeposit(modalId);
</script>

{#if OISY_TRADE_ENABLED}
	<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

	<!--
		Only skeleton while a signed-in load is actually in flight. Signed out,
		`loadOisyTrade` resets the store (balances stay unresolved) and never
		populates it, so gate on the identity to settle on onboarding instead.
	-->
	{#if $authSignedIn && !$oisyTradeLoaded}
		<TradingListSkeleton />
	{:else if $oisyTradeHasAssets}
		<div class="flex flex-col gap-4">
			<p class="text-sm text-tertiary">
				{$i18n.trading.text.intro}
				<ExternalLink
					ariaLabel={$i18n.trading.text.learn_more}
					color="blue"
					href={OISY_TRADE_LEARN_MORE_URL}
					iconAsLast
				>
					{$i18n.trading.text.learn_more}
				</ExternalLink>
			</p>

			<TradingAssets onDeposit={openDeposit} />

			<!--
				Orders section header. PR4b owns the full Active/History orders list;
				this lightweight placeholder header carries the "+ Limit order" entry
				point so the limit-order modal is reachable and testable in the meantime.
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
		</div>
	{:else}
		<TradingOnboarding onDeposit={openDeposit} />
	{/if}

	{#if $modalTradingDeposit && $modalStore?.id === modalId}
		<TradingDepositModal />
	{/if}
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
