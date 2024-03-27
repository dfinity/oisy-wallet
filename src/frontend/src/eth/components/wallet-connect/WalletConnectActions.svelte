<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	export let approve = true;
</script>

<div class="flex justify-end gap-1 mt-8">
	<button class="secondary" on:click={() => dispatch('icReject')} disabled={$isBusy}
		>{$i18n.wallet_connect.text.reject}</button
	>

	{#if approve}
		<button class="primary" on:click={() => dispatch('icApprove')} disabled={$isBusy}>
			{$i18n.wallet_connect.text.approve}
		</button>
	{/if}
</div>
