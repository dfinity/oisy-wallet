// These are all supported networks, no matter if a user enabled them or not
// Supported means we can support or not support it via vite env vars
import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_BITCOIN_NETWORKS } from '$env/networks/networks.btc.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SUPPORTED_SOLANA_NETWORKS } from '$env/networks/networks.sol.env';
import type { Network, NetworkId } from '$lib/types/network';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

// TODO: to be removed when the feature is fully implemented
export const USER_NETWORKS_FEATURE_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_USER_NETWORKS_FEATURE_ENABLED
);

export const SUPPORTED_NETWORKS: Network[] = [
	ICP_NETWORK,
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_BITCOIN_NETWORKS,
	...SUPPORTED_SOLANA_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
];

export const SUPPORTED_MAINNET_NETWORKS: Network[] = SUPPORTED_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

export const SUPPORTED_TESTNET_NETWORKS: Network[] = SUPPORTED_NETWORKS.filter(
	({ env }) => env === 'testnet'
);

export const SUPPORTED_NETWORKS_IDS: NetworkId[] = SUPPORTED_NETWORKS.map(({ id }) => id);

export const SUPPORTED_MAINNET_NETWORKS_IDS: NetworkId[] = SUPPORTED_MAINNET_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_TESTNET_NETWORKS_IDS: NetworkId[] = SUPPORTED_TESTNET_NETWORKS.map(
	({ id }) => id
);
