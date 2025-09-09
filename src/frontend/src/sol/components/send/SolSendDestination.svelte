<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';

	interface Props {
		destination?: string;
		invalidDestination?: boolean;
		knownDestinations?: KnownDestinations | undefined;
		networkContacts?: NetworkContacts | undefined;
	}

	let {
		destination = $bindable(''),
		invalidDestination = $bindable(false),
		knownDestinations = undefined,
		networkContacts = undefined
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const isInvalidDestination = (): boolean => isInvalidDestinationSol(destination);
</script>

<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	{knownDestinations}
	{networkContacts}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={() => dispatch('icQRCodeScan')}
	bind:destination
	bind:invalidDestination
	on:icQRCodeScan
/>

<!-- TODO: PRODSEC: add some sort of warning/info when the destination input is not an ATA address, either here or in the confirmation review step -->
