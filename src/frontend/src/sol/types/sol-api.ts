import type { SolAddress } from '$lib/types/address';
import type { SolanaNetworkType } from '$sol/types/network';

export interface GetSolTransactionsParams {
	address: SolAddress;
	network: SolanaNetworkType;
	before?: string;
	limit?: number;
}
