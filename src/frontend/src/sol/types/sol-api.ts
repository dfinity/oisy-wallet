import type { SolAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';

export interface GetSolTransactionsParams {
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
	before?: string;
	limit?: number;
}

export type LoadSolTransactionsParams = GetSolTransactionsParams & {
	token: Token;
};

export interface LoadNextSolTransactionsParams {
	token: Token;
	before?: string;
	limit?: number;
	signalEnd: () => void;
}
