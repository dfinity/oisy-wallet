<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isBusy } from '$lib/derived/busy.derived';

	const dispatch = createEventDispatcher();
</script>

<div class="flex justify-end gap-1 mt-4">
	<button class="primary" on:click={() => dispatch('icReject')} disabled={$isBusy}>Reject</button>
	<button class="primary" on:click={() => dispatch('icApprove')} disabled={$isBusy}>
		Approve
	</button>
</div>
