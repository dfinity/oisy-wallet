<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isInvalidDestinationBtc } from '$lib/utils/send.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;
	export let knownDestinations: KnownDestinations | undefined = undefined;

	const dispatch = createEventDispatcher();

	const isInvalidDestination = (): boolean =>
		isInvalidDestinationBtc({
			destination,
			networkId
		});
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{knownDestinations}
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>
