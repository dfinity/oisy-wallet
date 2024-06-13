import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork> = derived(
	[enabledEthereumNetworks, networkId],
	([$enabledEthereumNetworks, $networkId]) =>
		$enabledEthereumNetworks.find(({ id }) => id === $networkId) ?? SUPPORTED_ETHEREUM_NETWORKS[0]
);

export const selectedChainId: Readable<bigint> = derived(
	[selectedEthereumNetwork],
	([{ chainId }]) => chainId
);

export const explorerUrl: Readable<string> = derived(
	[selectedEthereumNetwork],
	([{ explorerUrl }]) => explorerUrl
);
