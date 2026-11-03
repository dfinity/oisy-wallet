<script lang="ts">
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import HelpNetworkExplorers from '$lib/components/help/HelpNetworkExplorers.svelte';
	import ToolsCanisterTopUp from '$lib/components/tools/ToolsCanisterTopUp.svelte';
	import ToolsExportData from '$lib/components/tools/ToolsExportData.svelte';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
</script>

<!-- The Blockchain explorers card of the Help page, shown here as well. -->
<HelpNetworkExplorers sourceLocation={PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOOLS_PAGE} />

{#if CANISTER_TOP_UP_ENABLED}
	<ToolsCanisterTopUp />
{/if}

<ToolsExportData />
