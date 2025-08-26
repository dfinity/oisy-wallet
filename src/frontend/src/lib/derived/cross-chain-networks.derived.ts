import { ICP_NETWORK } from '$env/networks/networks.icp.env';

import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import { enabledEvmNetworks } from '$evm/derived/networks.derived';
import type { Network, NetworkId } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

interface NetworksEnvs {
	mainnets: Network[];
	testnets: Network[];
}

export const crossChainSwapNetworks: Readable<Network[]> = derived(
	[enabledEthereumNetworks, enabledEvmNetworks],
	([$enabledEthereumNetworks, $enabledEvmNetworks]) => [
		ICP_NETWORK,
		...$enabledEthereumNetworks,
		...$enabledEvmNetworks
	]
);

export const crossChainSwapNetwoksEnvs: Readable<NetworksEnvs> = derived(
	[crossChainSwapNetworks],
	([$crossChainSwapNetworks]) =>
		$crossChainSwapNetworks.reduce<NetworksEnvs>(
			({ mainnets, testnets }, network) => ({
				mainnets: [...mainnets, ...(network.env === 'mainnet' ? [network] : [])],
				testnets: [...testnets, ...(network.env === 'testnet' ? [network] : [])]
			}),
			{ mainnets: [], testnets: [] }
		)
);

export const crossChainSwapNetworksMainnets: Readable<Network[]> = derived(
	[crossChainSwapNetwoksEnvs],
	([{ mainnets }]) => mainnets
);

export const crossChainSwapNetworksMainnetsIds: Readable<NetworkId[]> = derived(
	[crossChainSwapNetwoksEnvs],
	([{ mainnets }]) => mainnets.map(({ id }) => id)
);
