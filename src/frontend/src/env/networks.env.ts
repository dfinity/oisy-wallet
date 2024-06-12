import { ETHEREUM_EXPLORER_URL, SEPOLIA_EXPLORER_URL } from '$env/explorers.env';
import { ETH_MAINNET_ENABLED } from '$env/networks.eth.env';
import sepolia from '$eth/assets/sepolia.svg';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import eth from '$icp-eth/assets/eth.svg';
import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';
import icpLight from '$icp/assets/icp_light.svg';
import type { Network } from '$lib/types/network';

/**
 * Ethereum
 */
export const ETHEREUM_NETWORK_ID: unique symbol = Symbol('ETH');

export const ETHEREUM_NETWORK: EthereumNetwork = {
	id: ETHEREUM_NETWORK_ID,
	env: 'mainnet',
	name: 'Ethereum Mainnet',
	chainId: 1n,
	icon: eth,
	explorerUrl: ETHEREUM_EXPLORER_URL
};

export const { chainId: ETHEREUM_NETWORK_CHAIN_ID } = ETHEREUM_NETWORK;

export const SEPOLIA_NETWORK_ID: unique symbol = Symbol('SepoliaETH');

export const SEPOLIA_NETWORK: EthereumNetwork = {
	id: SEPOLIA_NETWORK_ID,
	env: 'testnet',
	name: 'Sepolia',
	chainId: 11155111n,
	icon: sepolia,
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

export const SUPPORTED_ETHEREUM_NETWORKS_IDS: symbol[] = SUPPORTED_ETHEREUM_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_ETHEREUM_NETWORKS_CHAIN_IDS: EthereumChainId[] =
	SUPPORTED_ETHEREUM_NETWORKS.map(({ chainId }) => chainId);

/**
 * ICP
 */
export const ICP_NETWORK_SYMBOL = 'ICP';

export const ICP_NETWORK_ID = Symbol(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	env: 'mainnet',
	name: 'Internet Computer',
	icon: icpLight
};

/**
 * BTC
 */
export const BTC_MAINNET_NETWORK_SYMBOL = 'BTC';

export const BTC_MAINNET_NETWORK_ID = Symbol(BTC_MAINNET_NETWORK_SYMBOL);

export const BTC_MAINNET_NETWORK: Network = {
	id: BTC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Bitcoin',
	icon: bitcoin
};

export const BTC_TESTNET_NETWORK_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_NETWORK_ID = Symbol(BTC_TESTNET_NETWORK_SYMBOL);

export const BTC_TESTNET_NETWORK: Network = {
	id: BTC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin',
	icon: bitcoinTestnet
};

export const BITCOIN_NETWORKS: Network[] = [BTC_MAINNET_NETWORK, BTC_TESTNET_NETWORK];

export const BITCOIN_NETWORKS_IDS: symbol[] = BITCOIN_NETWORKS.map(({ id }) => id);

export const CHAIN_FUSION_MAINNET_NETWORK_SYMBOL = 'Chain Fusion (all mainnets)';

export const CHAIN_FUSION_MAINNET_NETWORK_ID = Symbol(CHAIN_FUSION_MAINNET_NETWORK_SYMBOL);

export const CHAIN_FUSION_MAINNET_NETWORK: Network = {
	id: CHAIN_FUSION_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Chain Fusion (all mainnets)'
};

export const CHAIN_FUSION_TESTNET_NETWORK_SYMBOL = 'Chain Fusion (all testnets)';

export const CHAIN_FUSION_TESTNET_NETWORK_ID = Symbol(CHAIN_FUSION_TESTNET_NETWORK_SYMBOL);

export const CHAIN_FUSION_TESTNET_NETWORK: Network = {
	id: CHAIN_FUSION_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Chain Fusion (all testnets)'
};
