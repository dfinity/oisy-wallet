<script lang="ts">
	import { onMount } from 'svelte';
	import SupportHelp from '$lib/components/support/SupportHelp.svelte';
	import SupportIcpSwapWithdrawal from '$lib/components/support/SupportIcpSwapWithdrawal.svelte';
	import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
	import { trackSupport } from '$lib/services/support-analytics.services';

	onMount(() => {
		trackSupport({
			action: 'open',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});
	});
</script>

<SupportHelp />

<SupportIcpSwapWithdrawal />
