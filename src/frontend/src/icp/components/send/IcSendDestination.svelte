<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { createEventDispatcher, getContext } from 'svelte';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { SEND_CONTEXT_KEY, type SendContext } from '$lib/stores/send.store';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

	const dispatch = createEventDispatcher();

	const { sendTokenStandard } = getContext<SendContext>(SEND_CONTEXT_KEY);

	let isInvalidDestination: () => boolean;

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isNullish($sendTokenStandard) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard: $sendTokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	$: destination, $sendTokenStandard, networkId, debounceValidateInit();

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
