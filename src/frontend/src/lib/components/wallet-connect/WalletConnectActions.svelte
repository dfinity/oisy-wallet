<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isBusy } from '$lib/derived/busy.derived';

	const dispatch = createEventDispatcher();

	export let approve = true;
</script>

<div class="flex justify-end gap-1 mt-8">
	<button class="secondary" on:click={() => dispatch('icReject')} disabled={$isBusy}>Reject</button>

	{#if approve}
		<button class="primary" on:click={() => dispatch('icApprove')} disabled={$isBusy}>
			Approve
		</button>
	{/if}
</div>
