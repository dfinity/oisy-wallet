import {
	ETHEREUM_NETWORK,
	ETH_MAINNET_ENABLED,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnets } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { NetworkId } from '$lib/types/network';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumNetworks: Readable<EthereumNetwork[]> = derived(
	[testnets, userNetworks],
	([$testnets, $userNetworks]) =>
		[
			...(ETH_MAINNET_ENABLED ? [ETHEREUM_NETWORK] : []),
			...($testnets ? [SEPOLIA_NETWORK] : [])
		].filter(({ id: networkId }) =>
			isUserNetworkEnabled({ userNetworks: $userNetworks, networkId })
		)
);

export const enabledEthereumNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEthereumNetworks],
	([$ethereumNetworks]) => $ethereumNetworks.map(({ id }) => id)
);
