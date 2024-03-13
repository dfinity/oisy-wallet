import { ETHEREUM_NETWORKS } from '$env/networks.env';
import type { EthereumNetwork } from '$eth/types/network';
import { DEFAULT_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork> = derived(
	[networkId],
	([$networkId]) => ETHEREUM_NETWORKS.find(({ id }) => id === $networkId) ?? DEFAULT_NETWORK
);

export const selectedChainId: Readable<bigint> = derived(
	[selectedEthereumNetwork],
	([{ chainId }]) => chainId
);

export const explorerUrl: Readable<string> = derived(
	[selectedEthereumNetwork],
	([{ explorerUrl }]) => explorerUrl
);
