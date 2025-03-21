import { enabledBitcoinNetworks } from '$btc/derived/networks.derived';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
import { enabledEvmNetworks } from '$eth/evm/derived/networks.derived';
import type { Network } from '$lib/types/network';
import { enabledSolanaNetworks } from '$sol/derived/networks.derived';
import { derived, type Readable } from 'svelte/store';

export const networks: Readable<Network[]> = derived(
	[enabledBitcoinNetworks, enabledEthereumNetworks, enabledSolanaNetworks, enabledEvmNetworks],
	([
		$enabledBitcoinNetworks,
		$enabledEthereumNetworks,
		$enabledSolanaNetworks,
		$enabledEvmNetworks
	]) => [
		...$enabledBitcoinNetworks,
		...$enabledEthereumNetworks,
		ICP_NETWORK,
		...$enabledSolanaNetworks,
		...$enabledEvmNetworks
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
