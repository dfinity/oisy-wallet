import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';

export const SUPPORTED_NETWORKS = [
	ICP_NETWORK,
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_BITCOIN_NETWORKS,
	...SUPPORTED_SOLANA_NETWORKS
];
