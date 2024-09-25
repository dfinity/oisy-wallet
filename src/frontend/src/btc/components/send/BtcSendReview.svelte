<script lang="ts">
	import ButtonGroup from '$lib/components/ui/ButtonGroup.svelte';
	import ContentWithToolbar from '$lib/components/ui/ContentWithToolbar.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { createEventDispatcher } from 'svelte';

	export let destination = '';
	export let amount: number | undefined = undefined;
	export let networkId: NetworkId | undefined = undefined;

	const dispatch = createEventDispatcher();
</script>

<ContentWithToolbar>
	<div>{`Review: ${destination} - ${amount} - ${String(networkId)}`}</div>

	<ButtonGroup slot="toolbar">
		<button class="secondary block flex-1" on:click={() => dispatch('icBack')}
			>{$i18n.core.text.back}</button
		>
		<button class="primary block flex-1" on:click={() => dispatch('icSend')}>
			{$i18n.send.text.send}
		</button>
	</ButtonGroup>
</ContentWithToolbar>
