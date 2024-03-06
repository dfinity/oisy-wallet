<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import type { NetworkId } from '$lib/types/network';
	import { tokenStandard } from '$lib/derived/token.derived';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import { debounce } from '@dfinity/utils';
	import { BTC_NETWORK_ID } from '$icp/constants/ckbtc.constants';
	import { isNetworkIdEthereum } from '$lib/utils/network.utils';

	export let destination = '';
	export let networkId: NetworkId | undefined = undefined;
	export let invalidDestination = false;

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
		? 'Enter public address (0x)'
		: networkId === BTC_NETWORK_ID
			? 'Enter recipient address'
			: 'Enter wallet address';
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	{inputPlaceholder}
/>
