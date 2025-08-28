import { SUPPORTED_BASE_NETWORKS } from '$env/networks/networks-evm/networks.evm.base.env';
import { SUPPORTED_BSC_NETWORKS } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { SUPPORTED_POLYGON_NETWORKS } from '$env/networks/networks-evm/networks.evm.polygon.env';
import type { EthereumChainId, EthereumNetwork } from '$eth/types/network';
import type { NetworkId } from '$lib/types/network';
import { SUPPORTED_ARBITRUM_NETWORKS } from './networks.evm.arbitrum.env';

export const SUPPORTED_EVM_NETWORKS: EthereumNetwork[] = [
	...SUPPORTED_BASE_NETWORKS,
	...SUPPORTED_BSC_NETWORKS,
	...SUPPORTED_POLYGON_NETWORKS,
	...SUPPORTED_ARBITRUM_NETWORKS
];

export const SUPPORTED_EVM_NETWORK_IDS: NetworkId[] = SUPPORTED_EVM_NETWORKS.map(({ id }) => id);

export const SUPPORTED_EVM_NETWORKS_CHAIN_IDS: EthereumChainId[] = SUPPORTED_EVM_NETWORKS.map(
	({ chainId }) => chainId
);

export const SUPPORTED_EVM_MAINNET_NETWORKS: EthereumNetwork[] = SUPPORTED_EVM_NETWORKS.filter(
	({ env }) => env === 'mainnet'
);

export const SUPPORTED_EVM_TESTNET_NETWORKS: EthereumNetwork[] = SUPPORTED_EVM_NETWORKS.filter(
	({ env }) => env === 'testnet'
);

export const SUPPORTED_EVM_MAINNET_NETWORK_IDS: NetworkId[] = SUPPORTED_EVM_MAINNET_NETWORKS.map(
	({ id }) => id
);

export const SUPPORTED_EVM_TESTNET_NETWORK_IDS: NetworkId[] = SUPPORTED_EVM_TESTNET_NETWORKS.map(
	({ id }) => id
);
