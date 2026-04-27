import type { Network } from '$lib/types/network';
import type { Networkish } from 'ethers/providers';
import type { Chain } from 'viem';

export type EthereumChainId = bigint;

export interface NetworkChainId {
	chainId: EthereumChainId;
}

interface NetworkProviders {
	providers: {
		infura: Networkish;
		alchemy: Networkish;
		alchemyJsonRpcUrl: string;
		alchemyWsUrl: string;
		viemChain: Chain;
	};
}

export type EthereumNetwork = Network & NetworkChainId & NetworkProviders;
