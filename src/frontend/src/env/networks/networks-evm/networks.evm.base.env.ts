import { BASE_EXPLORER_URL, BASE_SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import ethereumIconDark from '$lib/assets/networks/dark/ethereum-mainnet.svg';
import sepoliaIconDark from '$lib/assets/networks/dark/ethereum-sepolia.svg';
import ethereumIconLight from '$lib/assets/networks/light/ethereum-mainnet.svg';
import sepoliaIconLight from '$lib/assets/networks/light/ethereum-sepolia.svg';
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
	// TODO: add the correct icon
	iconLight: ethereumIconLight,
	iconDark: ethereumIconDark,
	explorerUrl: BASE_EXPLORER_URL,
	buy: { onramperId: 'base' }
};

export const BASE_SEPOLIA_NETWORK_SYMBOL = 'SepoliaBASE';

export const BASE_SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(BASE_SEPOLIA_NETWORK_SYMBOL);

export const BASE_SEPOLIA_NETWORK: EthereumNetwork = {
	id: BASE_SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Base Sepolia',
	chainId: 84532n,
	// TODO: add the correct icon
	iconLight: sepoliaIconLight,
	iconDark: sepoliaIconDark,
	explorerUrl: BASE_SEPOLIA_EXPLORER_URL
};

export const SUPPORTED_BASE_NETWORKS: [...EthereumNetwork[], EthereumNetwork] = [
	...(BASE_MAINNET_ENABLED ? [BASE_NETWORK] : []),
	BASE_SEPOLIA_NETWORK
];
