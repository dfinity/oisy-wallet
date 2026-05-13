import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';

export interface GetSolTransactionsParams {
	identity: NullishIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
	before?: string;
	limit?: number;
	/**
	 * When set, compares this to the newest RPC signature after `fetchSignatures`.
	 * If they match, skips parsing transaction details (no new activity at the head of history).
	 */
	exitIfFirstSignatureMatches?: string;
}

export type LoadSolTransactionsParams = GetSolTransactionsParams & {
	token: Token;
};

export interface LoadNextSolTransactionsParams {
	identity: NullishIdentity;
	token: Token;
	before?: string;
	limit?: number;
	signalEnd: () => void;
}
