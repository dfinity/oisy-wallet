import { BASE_EXPLORER_URL, BASE_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import sepolia from '$eth/assets/sepolia.svg';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import eth from '$icp-eth/assets/eth.svg';
import ethereumBW from '$lib/assets/networks/ethereum-bw.svg';
import sepoliaBW from '$lib/assets/networks/sepolia-bw.svg';
import type { NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

export const BASE_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_BASE_MAINNET_DISABLED ?? false) === false;

export const BASE_NETWORK_SYMBOL = 'BASE';

export const BASE_NETWORK_ID: NetworkId = parseNetworkId(BASE_NETWORK_SYMBOL);

export const BASE_NETWORK: EthereumNetwork = {
	id: BASE_NETWORK_ID,
	env: 'mainnet',
	name: 'Base',
	chainId: 8453n,
	icon: eth,
	iconBW: ethereumBW,
	explorerUrl: BASE_EXPLORER_URL,
	buy: { onramperId: 'base' }
};

export const { chainId: BASE_NETWORK_CHAIN_ID } = BASE_NETWORK;

export const BASE_SEPOLIA_NETWORK_SYMBOL = 'SepoliaBASE';

export const BASE_SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(BASE_SEPOLIA_NETWORK_SYMBOL);

export const BASE_SEPOLIA_NETWORK: EthereumNetwork = {
	id: BASE_SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Base Sepolia',
	chainId: 84532n,
	icon: sepolia,
	iconBW: sepoliaBW,
	explorerUrl: BASE_SEPOLIA_EXPLORER_URL
};

export const { chainId: BASE_SEPOLIA_NETWORK_CHAIN_ID } = BASE_SEPOLIA_NETWORK;

export const SUPPORTED_BASE_NETWORKS: [...EthereumNetwork[], EthereumNetwork] = [
	...(BASE_MAINNET_ENABLED ? [BASE_NETWORK] : []),
	BASE_SEPOLIA_NETWORK
];

export const SUPPORTED_BASE_NETWORKS_IDS: NetworkId[] = SUPPORTED_BASE_NETWORKS.map(({ id }) => id);

export const SUPPORTED_BASE_NETWORKS_CHAIN_IDS: EthereumChainId[] = SUPPORTED_BASE_NETWORKS.map(
	({ chainId }) => chainId
);
