<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import { isBusy } from '$lib/derived/busy.derived';
	import { i18n } from '$lib/stores/i18n.store';

	const dispatch = createEventDispatcher();

	export let approve = true;
</script>

<ButtonGroup>
	<Button colorStyle="error" on:click={() => dispatch('icReject')} disabled={$isBusy}
		>{$i18n.core.text.reject}</Button
	>

	{#if approve}
		<Button colorStyle="success" disabled={$isBusy} on:click={() => dispatch('icApprove')}>
			{$i18n.core.text.approve}
		</Button>
	{/if}
</ButtonGroup>
