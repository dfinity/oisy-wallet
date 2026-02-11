<script lang="ts">
	import { isEthAddress } from '$eth/utils/account.utils';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { Network } from '$lib/types/network';
	import type { OptionToken } from '$lib/types/token';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';

	interface Props {
		token: OptionToken;
		network?: Network;
		destination: string;
		invalidDestination: boolean;
		knownDestinations?: KnownDestinations;
		networkContacts?: NetworkContacts;
		onQRCodeScan?: () => void;
	}

	let {
		token,
		network,
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

		return !isEthAddress(destination);
	};

	// TODO: add support for updating fees when input value changes
</script>

<SendInputDestination
	inputPlaceholder={$i18n.send.placeholder.enter_eth_address}
	{knownDestinations}
	{networkContacts}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>
