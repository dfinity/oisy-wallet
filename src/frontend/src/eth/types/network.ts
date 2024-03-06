import type { Network } from '$lib/types/network';

export type EthereumChainId = bigint;

export interface NetworkChainId {
	chainId: EthereumChainId;
}

export type EthereumNetwork = Network & NetworkChainId;
