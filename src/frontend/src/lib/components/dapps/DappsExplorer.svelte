<script lang="ts">
	import { onMount } from 'svelte';
	import DappsExplorerSignedIn from '$lib/components/dapps/DappsExplorerSignedIn.svelte';
	import DappsExplorerSignedOut from '$lib/components/dapps/DappsExplorerSignedOut.svelte';
	import { authSignedIn } from '$lib/derived/auth.derived';
	import {
		PLAUSIBLE_EVENT_CONTEXTS,
		PLAUSIBLE_EVENT_VALUES,
		PLAUSIBLE_EVENTS
	} from '$lib/enums/plausible';
	import { trackEvent } from '$lib/services/analytics.services';

	onMount(() => {
		trackEvent({
			name: PLAUSIBLE_EVENTS.PAGE_OPEN,
			metadata: {
				event_context: PLAUSIBLE_EVENT_CONTEXTS.EXPLORE,
				event_value: PLAUSIBLE_EVENT_VALUES.EXPLORE_PAGE
			}
		});
	});
</script>

{#if $authSignedIn}
	<DappsExplorerSignedIn />
{:else}
	<DappsExplorerSignedOut />
{/if}
