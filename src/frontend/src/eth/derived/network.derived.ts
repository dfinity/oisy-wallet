import { ethereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork> = derived(
	[ethereumNetworks, networkId],
	([$ethereumNetworks, $networkId]) =>
		$ethereumNetworks.find(({ id }) => id === $networkId) ?? DEFAULT_NETWORK
);

export const selectedChainId: Readable<bigint> = derived(
	[selectedEthereumNetwork],
	([{ chainId }]) => chainId
);

export const explorerUrl: Readable<string> = derived(
	[selectedEthereumNetwork],
	([{ explorerUrl }]) => explorerUrl
);
