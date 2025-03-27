// These are all supported networks, no matter if a user enabled them or not
// Supported means we can support or not support it via vite env vars
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { Network } from '$lib/types/network';

export const SUPPORTED_NETWORKS: Network[] = [
	ICP_NETWORK,
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_BITCOIN_NETWORKS,
	...SUPPORTED_SOLANA_NETWORKS
];

const SUPPORTED_MAINNET_NETWORKS: Network[] = SUPPORTED_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

const SUPPORTED_TESTNET_NETWORKS: Network[] = SUPPORTED_NETWORKS.filter(
	({ env }) => env === 'testnet'
);

export const SUPPORTED_MAINNET_NETWORKS_IDS = SUPPORTED_MAINNET_NETWORKS.map(({ id }) => id);

export const SUPPORTED_TESTNET_NETWORKS_IDS = SUPPORTED_TESTNET_NETWORKS.map(({ id }) => id);
