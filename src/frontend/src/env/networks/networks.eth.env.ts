import { ETHEREUM_EXPLORER_URL, SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import ethereumIconDark from '$lib/assets/networks/dark/ethereum-mainnet.svg';
import sepoliaIconDark from '$lib/assets/networks/dark/ethereum-sepolia.svg';
import ethereumIconLight from '$lib/assets/networks/light/ethereum-mainnet.svg';
import sepoliaIconLight from '$lib/assets/networks/light/ethereum-sepolia.svg';
import type { NetworkId } from '$lib/types/network';
import { parseBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';
import type { Networkish } from 'ethers/providers';

export const ETH_MAINNET_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_ETHEREUM_MAINNET_DISABLED,
	false
);

export const INFURA_NETWORK_HOMESTEAD: Networkish = 'homestead';
export const INFURA_NETWORK_SEPOLIA: Networkish = 'sepolia';

export const ETHERSCAN_NETWORK_HOMESTEAD: Networkish = 'homestead';
export const ETHERSCAN_NETWORK_SEPOLIA: Networkish = 'sepolia';

export const ETHERSCAN_API_URL_HOMESTEAD = 'https://api.etherscan.io/api';
export const ETHERSCAN_API_URL_SEPOLIA = 'https://api-sepolia.etherscan.io/api';

export const ALCHEMY_JSON_RPC_URL_MAINNET = 'https://eth-mainnet.g.alchemy.com/v2';
export const ALCHEMY_JSON_RPC_URL_SEPOLIA = 'https://eth-sepolia.g.alchemy.com/v2';

export const ALCHEMY_NETWORK_MAINNET: Network = Network.ETH_MAINNET;
export const ALCHEMY_NETWORK_SEPOLIA: Network = Network.ETH_SEPOLIA;

/**
 * Ethereum
 */
export const ETHEREUM_NETWORK_SYMBOL = 'ETH';

export const ETHEREUM_NETWORK_ID: NetworkId = parseNetworkId(ETHEREUM_NETWORK_SYMBOL);

export const ETHEREUM_NETWORK: EthereumNetwork = {
	id: ETHEREUM_NETWORK_ID,
	env: 'mainnet',
	name: 'Ethereum',
	chainId: 1n,
	iconLight: ethereumIconLight,
	iconDark: ethereumIconDark,
	explorerUrl: ETHEREUM_EXPLORER_URL,
	buy: { onramperId: 'ethereum' }
};

export const { chainId: ETHEREUM_NETWORK_CHAIN_ID } = ETHEREUM_NETWORK;

export const SEPOLIA_NETWORK_SYMBOL = 'SepoliaETH';

export const SEPOLIA_NETWORK_ID: NetworkId = parseNetworkId(SEPOLIA_NETWORK_SYMBOL);

export const SEPOLIA_NETWORK: EthereumNetwork = {
	id: SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Sepolia',
	chainId: 11155111n,
	iconLight: sepoliaIconLight,
	iconDark: sepoliaIconDark,
	explorerUrl: SEPOLIA_EXPLORER_URL
};

export const { chainId: SEPOLIA_NETWORK_CHAIN_ID } = SEPOLIA_NETWORK;

/**
 * Some functions, such as when we load the user's custom tokens, require knowing all the networks.
 * However, from a UX perspective, we use a store to enable the list of networks based on the testnets flag.
 * That's why those constants are prefixed with SUPPORTED_.
 */
export const SUPPORTED_ETHEREUM_NETWORKS: [...EthereumNetwork[], EthereumNetwork] = [
	...(ETH_MAINNET_ENABLED ? [ETHEREUM_NETWORK] : []),
	SEPOLIA_NETWORK
];

export const SUPPORTED_ETHEREUM_NETWORKS_IDS: NetworkId[] = SUPPORTED_ETHEREUM_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS: EthereumChainId[] =
	SUPPORTED_ETHEREUM_NETWORKS.map(({ chainId }) => chainId);
