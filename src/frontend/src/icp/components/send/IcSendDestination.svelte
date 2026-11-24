<script lang="ts">
	import { debounce, isNullish } from '@dfinity/utils';
	import { isInvalidDestinationIc } from '$icp/utils/ic-send.utils';
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { i18n } from '$lib/stores/i18n.store';
	import type { NetworkId } from '$lib/types/network';
	import type { TokenStandard } from '$lib/types/token';
	import type { KnownDestinations } from '$lib/types/transactions';
	import { isNetworkIdBitcoin, isNetworkIdEthereum } from '$lib/utils/network.utils';

	interface Props {
		destination: string;
		networkId?: NetworkId;
		tokenStandard: TokenStandard;
		invalidDestination: boolean;
		knownDestinations?: KnownDestinations;
		onQRCodeScan?: () => void;
	}

	let {
		destination = $bindable(''),
		networkId,
		tokenStandard,
		invalidDestination = $bindable(false),
		knownDestinations,
		onQRCodeScan
	}: Props = $props();

	let isInvalidDestination = $state<(() => boolean) | undefined>();

	const init = () =>
		(isInvalidDestination = (): boolean =>
			isNullish(tokenStandard) ||
			isInvalidDestinationIc({
				destination,
				tokenStandard,
				networkId
			}));

	const debounceValidateInit = debounce(init);

	$effect(() => {
		[destination, tokenStandard, networkId];

		debounceValidateInit();
	});

	let inputPlaceholder = $derived(
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
	onInvalidDestination={isInvalidDestination}
	onQRButtonClick={onQRCodeScan}
	bind:destination
	bind:invalidDestination
/>
