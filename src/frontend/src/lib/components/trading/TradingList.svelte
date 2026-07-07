<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import GoToTradeButton from '$lib/components/trading/GoToTradeButton.svelte';
	import TradingAssets from '$lib/components/trading/TradingAssets.svelte';
	import TradingListSkeleton from '$lib/components/trading/TradingListSkeleton.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { authIdentity, authSignedIn } from '$lib/derived/auth.derived';
	import { oisyTradeHasAssets, oisyTradeLoaded } from '$lib/derived/oisy-trade.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });
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
		<TradingAssets />
	{:else}
		<div class="flex flex-col items-center gap-4 py-10">
			<p class="text-center text-tertiary">{$i18n.trading.text.no_trades}</p>
			<GoToTradeButton />
		</div>
	{/if}
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
