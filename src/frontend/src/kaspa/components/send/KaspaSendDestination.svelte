<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isKaspaAddress } from '$kaspa/utils/kaspa-address.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		destination: string;
		invalidDestination: boolean;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
		onQRCodeScan?: () => void;
	}

	let {
		destination = $bindable(''),
		invalidDestination = $bindable(false),
		knownDestinations,
		networkContacts,
		onQRCodeScan
	}: Props = $props();

	const isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}
		return !isKaspaAddress({ address: destination });
	};
</script>

<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_recipient_address}
	{knownDestinations}
	{networkContacts}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>
