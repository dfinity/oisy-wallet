import type { SolAddress } from '$lib/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplToken } from '$sol/types/spl';

export interface GetSolTransactionsParams {
	address: SolAddress;
	network: SolanaNetworkType;
	tokensList: Pick<SplToken, 'address' | 'owner'>[];
	before?: string;
	limit?: number;
}
