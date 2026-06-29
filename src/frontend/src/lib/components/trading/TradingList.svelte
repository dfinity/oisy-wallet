<script lang="ts">
	import { OISY_TRADE_ENABLED } from '$env/oisy-trade';
	import IntervalLoader from '$lib/components/core/IntervalLoader.svelte';
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

	<!-- My assets (PR2) and Orders (PR4b) sections render here once built. -->
{:else}
	<EmptyState
		description={$i18n.trading.provider_unavailable.description}
		title={$i18n.trading.provider_unavailable.title}
	/>
{/if}
