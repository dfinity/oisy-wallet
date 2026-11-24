import type { Network } from '$lib/types/network';
import type { Networkish } from 'ethers/providers';
import type { Chain } from 'viem';

export type EthereumChainId = bigint;

export interface NetworkChainId {
	chainId: EthereumChainId;
}

interface NetworkProviders {
	providers: {
		// Absent when Infura does not host the chain: ethers derives the Infura endpoint from the
		// network name, so a chain either side does not know cannot be reached that way at all. Those
		// networks are read over `alchemyJsonRpcUrl` instead — see `ethersProvider`.
		infura?: Networkish;
		alchemy: Networkish;
		alchemyJsonRpcUrl: string;
		alchemyWsUrl: string;
		viemChain: Chain;
	};
}

export type EthereumNetwork = Network & NetworkChainId & NetworkProviders;

// The slice of a network an ethers provider is built from. Narrower than `EthereumNetwork` on
// purpose: the ERC-4626 exchange data carries it across the worker `postMessage` boundary, where
// only structured-cloneable values survive.
export type EthersProviderNetwork = Pick<EthereumNetwork, 'name' | 'chainId'> & {
	providers: Pick<EthereumNetwork['providers'], 'infura' | 'alchemyJsonRpcUrl'>;
};
