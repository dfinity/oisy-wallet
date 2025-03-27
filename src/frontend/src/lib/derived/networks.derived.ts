import { enabledBitcoinNetworks } from '$btc/derived/networks.derived';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { Network } from '$lib/types/network';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[userNetworks, enabledBitcoinNetworks, enabledEthereumNetworks, enabledSolanaNetworks],
	([$userNetworks, $enabledBitcoinNetworks, $enabledEthereumNetworks, $enabledSolanaNetworks]) => {
		const enabledNetworks = [
			...$enabledBitcoinNetworks,
			...$enabledEthereumNetworks,
			ICP_NETWORK,
			...$enabledSolanaNetworks
		];

		const networks: Network[] = enabledNetworks.reduce<Network[]>((acc, network) => {
			const { enabled } = $userNetworks[network.id] ?? { enabled: false };
			return [...acc, ...(enabled ? [network] : [])];
		}, []);

		// We do not allow the user to have no networks enabled, so we return ICP network if no networks are enabled.
		return networks.length >= 0 ? networks : [ICP_NETWORK];
	}
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
