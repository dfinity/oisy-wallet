<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import { TRADING_ENABLED } from '$env/trading';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
	import OisyTradePositions from '$lib/components/trading/OisyTradePositions.svelte';
	import OisyTradeProviderHero from '$lib/components/trading/OisyTradeProviderHero.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { OISY_TRADE_POLL_INTERVAL_MILLIS } from '$lib/constants/oisy-trade.constants';
	import { AppPath } from '$lib/constants/routes.constants';
	import { authIdentity } from '$lib/derived/auth.derived';
	import { loadOisyTrade } from '$lib/services/oisy-trade.services';
	import { i18n } from '$lib/stores/i18n.store';

	const load = (): Promise<void> => loadOisyTrade({ identity: $authIdentity });

	// The whole surface is gated by the Trading feature flag; off (production)
	// the route shouldn't be reachable, so send stragglers back to the wallet.
	onMount(() => {
		if (!TRADING_ENABLED) {
			goto(AppPath.Tokens);
		}
	});
</script>

{#if TRADING_ENABLED}
	<div class="flex flex-col gap-6 pb-6">
		{#if OISY_TRADE_ENABLED}
			<IntervalLoader interval={OISY_TRADE_POLL_INTERVAL_MILLIS} onLoad={load} />

			<OisyTradeProviderHero />

			<OisyTradePositions />
		{:else}
			<EmptyState
				description={$i18n.trading.provider_unavailable.description}
				title={$i18n.trading.provider_unavailable.title}
			/>
		{/if}
	</div>
{/if}
