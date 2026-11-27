<script lang="ts">
	import { onMount } from 'svelte';
	import { CANISTER_TOP_UP_ENABLED } from '$env/canister-top-up.env';
	import HelpNetworkExplorers from '$lib/components/help/HelpNetworkExplorers.svelte';
	import ToolsCanisterTopUp from '$lib/components/tools/ToolsCanisterTopUp.svelte';
	import ToolsExportData from '$lib/components/tools/ToolsExportData.svelte';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_SOURCE_LOCATIONS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';

	onMount(() => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.TOOLS,
				event_value: PLAUSIBLE_EVENT_VALUES.TOOLS_PAGE
			}
		});
	});
</script>

<!-- A card from the Help components, though only this page shows it now. -->
<HelpNetworkExplorers sourceLocation={PLAUSIBLE_EVENT_SOURCE_LOCATIONS.TOOLS_PAGE} />

{#if CANISTER_TOP_UP_ENABLED}
	<ToolsCanisterTopUp />
{/if}

<ToolsExportData />
