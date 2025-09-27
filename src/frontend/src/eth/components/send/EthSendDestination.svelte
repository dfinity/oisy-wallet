<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { Network } from '$lib/types/network';
	import type { OptionToken } from '$lib/types/token';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { invalidIcpAddress, isEthAddress } from '$lib/utils/account.utils';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isNetworkICP } from '$lib/utils/network.utils';

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

	let networkICP = $derived(isNetworkICP(network));

	let erc20Icp = $derived(isErc20Icp(token));

	const isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}

		// Avoid flickering when users enter an address and the network is about to be selected automatically.
		if (erc20Icp && isNullish(network)) {
			return false;
		}

		if (erc20Icp && networkICP) {
			return invalidIcpAddress(destination);
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
