<script lang="ts">
	import type { Snippet } from 'svelte';
	import LoaderMultipleEthTransactions from '$eth/components/loaders/LoaderMultipleEthTransactions.svelte';
	import LoadersHarvestAutopilotBalances from '$eth/components/loaders/LoadersHarvestAutopilotBalances.svelte';
	import { harvestAutopilotTokens } from '$eth/derived/harvest-autopilots.derived';
	import { WALLET_TIMER_INTERVAL_MILLIS } from '$lib/constants/app.constants';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<LoadersHarvestAutopilotBalances />

<LoaderMultipleEthTransactions
	interval={WALLET_TIMER_INTERVAL_MILLIS}
	tokens={$harvestAutopilotTokens}
/>

{@render children()}
