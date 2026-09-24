import { enabledBitcoinNetworks } from '$btc/derived/networks.derived';
import { CHAIN_FUSION_SWAP_ENABLED } from '$env/chain-fusion-swap.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	NEAR_INTENTS_BTC_SWAP_ENABLED,
	NEAR_INTENTS_SWAP_ENABLED
} from '$env/rest/near-intents.env';
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
	[enabledEthereumNetworks, enabledEvmNetworks, enabledSolanaNetworks, enabledBitcoinNetworks],
	([
		$enabledEthereumNetworks,
		$enabledEvmNetworks,
		$enabledSolanaNetworks,
		$enabledBitcoinNetworks
	]) => [
		ICP_NETWORK,
		...$enabledEthereumNetworks,
		...$enabledEvmNetworks,
		...(NEAR_INTENTS_SWAP_ENABLED ? $enabledSolanaNetworks : []),
		// Bitcoin only joins the swap filter when a provider reaches it: Chain Fusion
		// (ck conversion) or NEAR Intents (bridging). `crossChainSwapNetworksMainnets`
		// drops the testnets below.
		...(CHAIN_FUSION_SWAP_ENABLED || NEAR_INTENTS_BTC_SWAP_ENABLED ? $enabledBitcoinNetworks : [])
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
