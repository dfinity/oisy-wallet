<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ButtonPrimary from '$lib/components/ui/ButtonPrimary.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	export let approve = true;
</script>

<ButtonGroup>
	<button class="secondary block flex-1" on:click={() => dispatch('icReject')} disabled={$isBusy}
		>{$i18n.wallet_connect.text.reject}</button
	>

	{#if approve}
		<ButtonPrimary disabled={$isBusy} onClick={() => dispatch('icApprove')}>
			{$i18n.wallet_connect.text.approve}
		</ButtonPrimary>
	{/if}
</ButtonGroup>
