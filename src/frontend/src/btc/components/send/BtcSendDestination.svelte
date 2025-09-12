<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { NetworkId } from '$lib/types/network';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	interface Props {
		destination?: string;
		networkId?: NetworkId;
		invalidDestination?: boolean;
		knownDestinations?: KnownDestinations | undefined;
		networkContacts?: NetworkContacts | undefined;
	}

	let {
		destination = $bindable(''),
		networkId = undefined,
		invalidDestination = $bindable(false),
		knownDestinations = undefined,
		networkContacts = undefined
	}: Props = $props();

	const dispatch = createEventDispatcher();

	const isInvalidDestination = (): boolean =>
		isInvalidDestinationBtc({
			destination,
			networkId
		});
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
