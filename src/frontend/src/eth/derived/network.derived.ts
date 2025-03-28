import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

const selectedEthereumNetwork: Readable<EthereumNetwork | undefined> = derived(
	[enabledEthereumNetworks, networkId],
	([$enabledEthereumNetworks, $networkId]) =>
		$enabledEthereumNetworks.find(({ id }) => id === $networkId)
);

export const selectedEthereumNetworkWithFallback: Readable<EthereumNetwork> = derived(
	[selectedEthereumNetwork],
	([$selectedEthereumNetwork]) => $selectedEthereumNetwork ?? DEFAULT_ETHEREUM_NETWORK
);

export const explorerUrl: Readable<string> = derived(
	[selectedEthereumNetworkWithFallback],
	([{ explorerUrl }]) => explorerUrl
);
