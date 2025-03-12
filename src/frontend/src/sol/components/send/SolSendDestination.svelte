<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';

	export let destination = '';
	export let invalidDestination = false;

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => isInvalidDestinationSol(destination);
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>

<!--TODO: PRODSEC: add some sort of warning/info when the destination input is not an ATA address, either here or in the confirmation review step-->
