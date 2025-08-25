<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { createEventDispatcher } from 'svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkContacts } from '$lib/types/contacts';
	import type { NetworkId } from '$lib/types/network';
	import type { TokenStandard } from '$lib/types/token';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let tokenStandard: TokenStandard;
	export let invalidDestination = false;
	export let knownDestinations: KnownDestinations | undefined = undefined;
	export let networkContacts: NetworkContacts | undefined = undefined;

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean;

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isNullish(tokenStandard) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	$: (destination, tokenStandard, networkId, debounceValidateInit());

	let inputPlaceholder: string;
	$: inputPlaceholder = isNetworkIdEthereum(networkId)
		? $i18n.send.placeholder.enter_eth_address
		: isNetworkIdBitcoin(networkId)
			? $i18n.send.placeholder.enter_recipient_address
			: $i18n.send.placeholder.enter_wallet_address;
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
