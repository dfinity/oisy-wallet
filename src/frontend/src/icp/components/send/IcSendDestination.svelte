<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { debounce } from '@dfinity/utils';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher } from 'svelte';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean;

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isInvalidDestinationIc({
				destination,
				tokenStandard: $tokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	$: destination, $tokenStandard, networkId, debounceValidateInit();

	let inputPlaceholder: string;
	$: inputPlaceholder = isNetworkIdEthereum(networkId)
		? $i18n.send.placeholder.enter_eth_address
		: isNetworkIdBitcoin(networkId)
			? $i18n.send.placeholder.enter_recipient_address
			: $i18n.send.placeholder.enter_wallet_address;
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	{inputPlaceholder}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>
