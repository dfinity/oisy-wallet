<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { run } from 'svelte/legacy';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { NetworkId } from '$lib/types/network';
	import type { TokenStandard } from '$lib/types/token';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	interface Props {
		destination?: string;
		networkId?: NetworkId;
		tokenStandard: TokenStandard;
		invalidDestination?: boolean;
		knownDestinations?: KnownDestinations | undefined;
		networkContacts?: NetworkContacts | undefined;
	}

	let {
		destination = $bindable(''),
		networkId = undefined,
		tokenStandard,
		invalidDestination = $bindable(false),
		knownDestinations = undefined,
		networkContacts = undefined
	}: Props = $props();

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean = $state();

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isNullish(tokenStandard) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	run(() => {
		(destination, tokenStandard, networkId, debounceValidateInit());
	});

	let inputPlaceholder: string = $derived(
		isNetworkIdEthereum(networkId)
			? $i18n.send.placeholder.enter_eth_address
			: isNetworkIdBitcoin(networkId)
				? $i18n.send.placeholder.enter_recipient_address
				: $i18n.send.placeholder.enter_wallet_address
	);
</script>

<SendInputDestination
	{inputPlaceholder}
	{knownDestinations}
	{networkContacts}
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={() => dispatch('icQRCodeScan')}
	bind:destination
	bind:invalidDestination
	on:icQRCodeScan
/>
