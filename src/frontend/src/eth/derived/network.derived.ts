import type { EthereumNetwork } from '$eth/types/network';
import { ETHEREUM_NETWORKS } from '$icp-eth/constants/networks.constants';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import type { NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork> = derived(
	[networkId],
	([$networkId]) => ETHEREUM_NETWORKS.find(({ id }) => id === $networkId) ?? DEFAULT_NETWORK
);

export const selectedEthereumNetworkId: Readable<NetworkId> = derived(
	[selectedEthereumNetwork],
	([{ id }]) => id
);

export const selectedChainId: Readable<bigint> = derived(
	[selectedEthereumNetwork],
	([{ chainId }]) => chainId
);
