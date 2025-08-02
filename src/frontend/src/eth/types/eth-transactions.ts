import type { EthAddress, OptionEthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';

export interface LoadEthereumTransactionsParamsForMapping {
	ckMinterInfoAddresses: EthAddress[];
	ethAddress: OptionEthAddress;
}

export type LoadEthereumTransactionsParams = {
	tokenId: TokenId;
	networkId: NetworkId;
	silent?: boolean;
	updateOnly?: boolean;
} & LoadEthereumTransactionsParamsForMapping;
