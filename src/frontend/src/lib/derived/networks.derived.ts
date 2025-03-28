import { enabledBitcoinNetworks } from '$btc/derived/networks.derived';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ICP_NETWORK, ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[enabledBitcoinNetworks, enabledEthereumNetworks, enabledSolanaNetworks],
	([$enabledBitcoinNetworks, $enabledEthereumNetworks, $enabledSolanaNetworks]) => [
		...$enabledBitcoinNetworks,
		...$enabledEthereumNetworks,
		ICP_NETWORK,
		...$enabledSolanaNetworks
	]
);

interface NetworksEnvs {
	mainnets: Network[];
	testnets: Network[];
}

const networksEnvs: Readable<NetworksEnvs> = derived([networks], ([$networks]) =>
	$networks.reduce<NetworksEnvs>(
		({ mainnets, testnets }, network) => ({
			mainnets: [...mainnets, ...(network.env === 'mainnet' ? [network] : [])],
			testnets: [...testnets, ...(network.env === 'testnet' ? [network] : [])]
		}),
		{ mainnets: [], testnets: [] }
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

export const networkICPEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === ICP_NETWORK_ID)
);

export const networkICPDisabled: Readable<boolean> = derived(
	[networkICPEnabled],
	([$networkICPEnabled]) => !$networkICPEnabled
);

export const networkEthereumEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === ETHEREUM_NETWORK_ID)
);

export const networkSepoliaEnabled: Readable<boolean> = derived([networks], ([$networks]) =>
	$networks.some(({ id }) => id === SEPOLIA_NETWORK_ID)
);

export const networkEthereumDisabled: Readable<boolean> = derived(
	[networkEthereumEnabled],
	([$networkEthereumEnabled]) => !$networkEthereumEnabled
);

export const networkSepoliaDisabled: Readable<boolean> = derived(
	[networkSepoliaEnabled],
	([$networkSepoliaEnabled]) => !$networkSepoliaEnabled
);
