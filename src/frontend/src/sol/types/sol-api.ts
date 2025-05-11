import type { SolAddress } from '$lib/types/address';
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

export type LoadNextSolTransactionsParams = GetSolTransactionsParams & {
	signalEnd: () => void;
};
