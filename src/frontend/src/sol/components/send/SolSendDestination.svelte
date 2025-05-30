<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationSol } from '$sol/utils/sol-send.utils';

	export let destination = '';
	export let invalidDestination = false;
	export let knownDestinations: KnownDestinations | undefined = undefined;
	export let networkContacts: NetworkContacts | undefined = undefined;

	const dispatch = createEventDispatcher();

	const isInvalidDestination = (): boolean => isInvalidDestinationSol(destination);
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{knownDestinations}
	{networkContacts}
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>

<!-- TODO: PRODSEC: add some sort of warning/info when the destination input is not an ATA address, either here or in the confirmation review step -->
