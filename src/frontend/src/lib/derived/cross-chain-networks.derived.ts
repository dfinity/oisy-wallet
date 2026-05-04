import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import { enabledEvmNetworks } from '$evm/derived/networks.derived';
import type { Network, NetworkId } from '$lib/types/network';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

interface NetworksEnvs {
	mainnets: Network[];
	testnets: Network[];
}

export const crossChainSwapNetworks: Readable<Network[]> = derived(
	[enabledEthereumNetworks, enabledEvmNetworks, enabledSolanaNetworks],
	([$enabledEthereumNetworks, $enabledEvmNetworks, $enabledSolanaNetworks]) => [
		ICP_NETWORK,
		...$enabledEthereumNetworks,
		...$enabledEvmNetworks,
		...(NEAR_INTENTS_SWAP_ENABLED ? $enabledSolanaNetworks : [])
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
