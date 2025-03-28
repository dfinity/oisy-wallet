import {
	ETH_MAINNET_ENABLED,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [
		...(ETH_MAINNET_ENABLED ? [ETHEREUM_NETWORK] : []),
		...($testnetsEnabled ? [SEPOLIA_NETWORK] : [])
	]
);

export const enabledEthereumNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEthereumNetworks],
	([$ethereumNetworks]) => $ethereumNetworks.map(({ id }) => id)
);
