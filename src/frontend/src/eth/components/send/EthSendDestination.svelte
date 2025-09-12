<script lang="ts">
	import { isNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { run } from 'svelte/legacy';
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
		network?: Network | undefined;
		destination?: string;
		invalidDestination?: boolean;
		knownDestinations?: KnownDestinations | undefined;
		networkContacts?: NetworkContacts | undefined;
	}

	let {
		token,
		network = undefined,
		destination = $bindable(''),
		invalidDestination = $bindable(false),
		knownDestinations = undefined,
		networkContacts = undefined
	}: Props = $props();

	let networkICP = $state(false);
	run(() => {
		networkICP = isNetworkICP(network);
	});

	let erc20Icp = $state(false);
	run(() => {
		erc20Icp = isErc20Icp(token);
	});

	const dispatch = createEventDispatcher();

	const isInvalidDestination = (): boolean => {
		if (isNullishOrEmpty(destination)) {
			return false;
		}

		// Avoid flickering when user enter an address and the network is about to being selected automatically.
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
	onQRButtonClick={() => dispatch('icQRCodeScan')}
	bind:destination
	bind:invalidDestination
	on:icQRCodeScan
/>
