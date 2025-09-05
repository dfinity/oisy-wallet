import {
	ETH_MAINNET_ENABLED,
	ETHEREUM_NETWORK,
	SEPOLIA_NETWORK
} from '$env/networks/networks.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { NetworkId } from '$lib/types/network';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumNetworks: Readable<EthereumNetwork[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledNetworks({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ETH_MAINNET_ENABLED,
			mainnetNetworks: [ETHEREUM_NETWORK],
			testnetNetworks: [SEPOLIA_NETWORK]
		})
);

export const enabledEthereumNetworksIds: Readable<NetworkId[]> = derived(
	[enabledEthereumNetworks],
	([$ethereumNetworks]) => $ethereumNetworks.map(({ id }) => id)
);
