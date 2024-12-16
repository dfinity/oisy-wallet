import type { BitcoinNetwork } from '$btc/types/network';
import {
	BTC_MAINNET_EXPLORER_URL,
	BTC_REGTEST_EXPLORER_URL,
	BTC_TESTNET_EXPLORER_URL,
	ETHEREUM_EXPLORER_URL,
	SEPOLIA_EXPLORER_URL
} from '$env/explorers.env';
import { ETH_MAINNET_ENABLED } from '$env/networks/networks.eth.env';
import sepolia from '$eth/assets/sepolia.svg';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import eth from '$icp-eth/assets/eth.svg';
import bitcoin from '$icp/assets/bitcoin.svg';
import bitcoinTestnet from '$icp/assets/bitcoin_testnet.svg';
import icpLight from '$icp/assets/icp_light.svg';
import bitcoinMainnetBW from '$lib/assets/networks/bitcoin-mainnet-bw.svg';
import bitcoinTestnetBW from '$lib/assets/networks/bitcoin-testnet-bw.svg';
import ethereumBW from '$lib/assets/networks/ethereum-bw.svg';
import icpBW from '$lib/assets/networks/icp-bw.svg';
import sepoliaBW from '$lib/assets/networks/sepolia-bw.svg';
import { LOCAL } from '$lib/constants/app.constants';
import type { Network, NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';

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
	icon: eth,
	iconBW: ethereumBW,
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
	icon: sepolia,
	iconBW: sepoliaBW,
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

export const ICP_NETWORK_ID: NetworkId = parseNetworkId(ICP_NETWORK_SYMBOL);

export const ICP_NETWORK: Network = {
	id: ICP_NETWORK_ID,
	env: 'mainnet',
	name: 'Internet Computer',
	icon: icpLight,
	iconBW: icpBW,
	buy: { onramperId: 'icp' }
};

/**
 * BTC
 */
export const BTC_MAINNET_NETWORK_SYMBOL = 'BTC';

export const BTC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_MAINNET_NETWORK_SYMBOL);

export const BTC_MAINNET_NETWORK: BitcoinNetwork = {
	id: BTC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Bitcoin',
	icon: bitcoin,
	iconBW: bitcoinMainnetBW,
	explorerUrl: BTC_MAINNET_EXPLORER_URL,
	buy: { onramperId: 'bitcoin' }
};

export const BTC_TESTNET_NETWORK_SYMBOL = 'BTC (Testnet)';

export const BTC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BTC_TESTNET_NETWORK_SYMBOL);

export const BTC_TESTNET_NETWORK: BitcoinNetwork = {
	id: BTC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin',
	explorerUrl: BTC_TESTNET_EXPLORER_URL,
	icon: bitcoinTestnet,
	iconBW: bitcoinTestnetBW
};

export const BTC_REGTEST_NETWORK_SYMBOL = 'BTC (Regtest)';

export const BTC_REGTEST_NETWORK_ID: NetworkId = parseNetworkId(BTC_REGTEST_NETWORK_SYMBOL);

export const BTC_REGTEST_NETWORK: BitcoinNetwork = {
	id: BTC_REGTEST_NETWORK_ID,
	env: 'testnet',
	name: 'Bitcoin (Regtest)',
	explorerUrl: BTC_REGTEST_EXPLORER_URL
};

export const BITCOIN_NETWORKS: BitcoinNetwork[] = [
	BTC_MAINNET_NETWORK,
	BTC_TESTNET_NETWORK,
	...(LOCAL ? [BTC_REGTEST_NETWORK] : [])
];

export const BITCOIN_NETWORKS_IDS: symbol[] = BITCOIN_NETWORKS.map(({ id }) => id);
