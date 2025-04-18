import { SUPPORTED_BASE_NETWORKS } from '$env/networks/networks-evm/networks.evm.base.env';
import { SUPPORTED_BSC_NETWORKS } from '$env/networks/networks-evm/networks.evm.bsc.env';
import type { EthereumNetwork } from '$eth/types/network';
import type { Network, NetworkId } from '$lib/types/network';
import { parseBoolEnvVar } from '$lib/utils/env.utils';

export const EVM_NETWORKS_ENABLED = parseBoolEnvVar(import.meta.env.VITE_EVM_NETWORKS_ENABLED);

export const SUPPORTED_EVM_NETWORKS: EthereumNetwork[] = EVM_NETWORKS_ENABLED
	? [...SUPPORTED_BASE_NETWORKS, ...SUPPORTED_BSC_NETWORKS]
	: [];

const SUPPORTED_EVM_MAINNET_NETWORKS: Network[] = SUPPORTED_EVM_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

const SUPPORTED_EVM_TESTNET_NETWORKS: Network[] = SUPPORTED_EVM_NETWORKS.filter(
	({ env }) => env === 'testnet'
);

export const SUPPORTED_EVM_MAINNET_NETWORKS_IDS: NetworkId[] = SUPPORTED_EVM_MAINNET_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_EVM_TESTNET_NETWORKS_IDS: NetworkId[] = SUPPORTED_EVM_TESTNET_NETWORKS.map(
	({ id }) => id
);
