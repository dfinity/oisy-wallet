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

<!-- SettingsCard spaces itself with `mt-5 first-of-type:mt-0`, which relies on the cards being
     siblings. Each card here sits inside its own test-id wrapper, so every card is the first (and
     only) div of its type and its own margin never applies - hence the gap on the container. -->
<div class="flex flex-col gap-5">
	<SupportHelp />

	<SupportIcpSwapWithdrawal />
</div>
