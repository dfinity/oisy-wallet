import type { Network, NetworkAppMetadata } from '$lib/types/network';
import type { Networkish } from 'ethers/providers';

export type EthereumChainId = bigint;

export interface NetworkChainId {
	chainId: EthereumChainId;
}

interface NetworkProviders {
	providers: {
		infura: Networkish;
	};
}

export type EthereumNetwork = Network & NetworkChainId & NetworkAppMetadata & NetworkProviders;
