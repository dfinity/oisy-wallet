import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import { networkId } from '$lib/derived/network.derived';
import { derived, type Readable } from 'svelte/store';

export const selectedEthereumNetwork: Readable<EthereumNetwork> = derived(
	[enabledEthereumNetworks, networkId],
	([$enabledEthereumNetworks, $networkId]) =>
		$enabledEthereumNetworks.find(({ id }) => id === $networkId) ?? DEFAULT_ETHEREUM_NETWORK
);

export const selectedChainId: Readable<bigint> = derived(
	[selectedEthereumNetwork],
	([{ chainId }]) => chainId
);

export const explorerUrl: Readable<string> = derived(
	[selectedEthereumNetwork],
	([{ explorerUrl }]) => explorerUrl
);
