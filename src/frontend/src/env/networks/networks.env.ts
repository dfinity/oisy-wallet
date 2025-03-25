import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { Network } from '$lib/types/network';

const SUPPORTED_NETWORKS: Network[] = [
	...SUPPORTED_BITCOIN_NETWORKS,
	...SUPPORTED_ETHEREUM_NETWORKS,
	ICP_NETWORK,
	...SUPPORTED_SOLANA_NETWORKS
];

const SUPPORTED_MAINNET_NETWORKS: Network[] = SUPPORTED_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

export const SUPPORTED_MAINNET_NETWORKS_IDS = SUPPORTED_MAINNET_NETWORKS.map(({ id }) => id);
