<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import HarvestAutopilotDetail from '$eth/components/stake/harvest-autopilot/HarvestAutopilotDetail.svelte';
	import HarvestAutopilotOverview from '$eth/components/stake/harvest-autopilot/HarvestAutopilotOverview.svelte';
	import { routeAutopilotVault } from '$lib/derived/nav.derived';
</script>

{#if nonNullish($routeAutopilotVault)}
	<HarvestAutopilotDetail />
{:else}
	<HarvestAutopilotOverview />
{/if}
