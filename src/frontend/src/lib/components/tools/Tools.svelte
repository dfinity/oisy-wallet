<script lang="ts">
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import { OWN_CYCLES_ENABLED } from '$env/own-cycles.env';
	import HelpNetworkExplorers from '$lib/components/help/HelpNetworkExplorers.svelte';
	import ToolsCanisterTopUp from '$lib/components/tools/ToolsCanisterTopUp.svelte';
	import ToolsExportData from '$lib/components/tools/ToolsExportData.svelte';
	import ToolsUsageCredits from '$lib/components/tools/ToolsUsageCredits.svelte';
	import { PLAUSIBLE_EVENT_SOURCE_LOCATIONS } from '$lib/enums/plausible';
</script>

<!-- A card from the Help components, though only this page shows it now. -->
<HelpNetworkExplorers sourceLocation={PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOOLS_PAGE} />

{#if CANISTER_TOP_UP_ENABLED}
	<ToolsCanisterTopUp />
{/if}

{#if OWN_CYCLES_ENABLED}
	<ToolsUsageCredits />
{/if}

<ToolsExportData />
