import { CHAIN_FUSION_NETWORKS, ICP_NETWORK } from '$env/networks.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[enabledEthereumNetworks],
	([$enabledEthereumNetworks]) => [
		...CHAIN_FUSION_NETWORKS,
		...$enabledEthereumNetworks,
		ICP_NETWORK
	]
);

interface NetworksEnvs {
	mainnets: Network[];
	testnets: Network[];
}

const networksEnvs: Readable<NetworksEnvs> = derived([networks], ([$networks]) =>
	$networks.reduce(
		({ mainnets, testnets }, network) => ({
			mainnets: [...mainnets, ...(network.env === 'mainnet' ? [network] : [])],
			testnets: [...testnets, ...(network.env === 'testnet' ? [network] : [])]
		}),
		{ mainnets: [], testnets: [] } as NetworksEnvs
	)
);

export const networksMainnets: Readable<Network[]> = derived(
	[networksEnvs],
	([{ mainnets }]) => mainnets
);

export const networksTestnets: Readable<Network[]> = derived(
	[networksEnvs],
	([{ testnets }]) => testnets
);
