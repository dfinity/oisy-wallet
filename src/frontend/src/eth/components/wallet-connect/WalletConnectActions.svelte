<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';

	const dispatch = createEventDispatcher();

	export let approve = true;
</script>

<div class="mt-8">
	<ButtonGroup>
		<button class="secondary block flex-1" on:click={() => dispatch('icReject')} disabled={$isBusy}
			>{$i18n.wallet_connect.text.reject}</button
		>

		{#if approve}
			<button
				class="primary block flex-1"
				on:click={() => dispatch('icApprove')}
				disabled={$isBusy}
			>
				{$i18n.wallet_connect.text.approve}
			</button>
		{/if}
	</ButtonGroup>
</div>
