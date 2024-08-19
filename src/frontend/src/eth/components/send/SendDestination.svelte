<script lang="ts">
	import SendInputDestination from '$lib/components/send/SendInputDestination.svelte';
	import { isNullishOrEmpty } from '$lib/utils/input.utils';
	import { isEthAddress } from '$lib/utils/account.utils';
	import { i18n } from '$lib/stores/i18n.store';
	import { createEventDispatcher, getContext } from 'svelte';
	import { FEE_CONTEXT_KEY, type FeeContext } from '$eth/stores/fee.store';
	import type { OptionToken } from '$lib/types/token';
	import { isErc20Icp } from '$eth/utils/token.utils';
	import { invalidIcpAddress } from '$icp/utils/icp-account.utils';
	import type { Network } from '$lib/types/network';
	import { isNetworkICP } from '$lib/utils/network.utils';
	import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
	import { isNullish } from '@dfinity/utils';

	export let token: OptionToken;
	export let network: Network | undefined = undefined;
	export let destination = '';
	export let invalidDestination = false;

	let networkICP = false;
	$: networkICP = isNetworkICP(network ?? DEFAULT_ETHEREUM_NETWORK);

	let erc20Icp = false;
	$: erc20Icp = isErc20Icp(token);

	const dispatch = createEventDispatcher();

	let isInvalidDestination: () => boolean;
	$: isInvalidDestination = (): boolean => {
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

	const { evaluateFee } = getContext<FeeContext>(FEE_CONTEXT_KEY);
	const onInput = () => evaluateFee?.();
</script>

<SendInputDestination
	bind:destination
	bind:invalidDestination
	{isInvalidDestination}
	inputPlaceholder={$i18n.send.placeholder.enter_eth_address}
	on:nnsInput={onInput}
	on:icQRCodeScan
	onQRButtonClick={() => dispatch('icQRCodeScan')}
/>
