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
	 * Head loads only (`before` unset): when set, compares to the first signature returned by
	 * `fetchSignatures` (the newest page item). If they match, skips per-signature detail fetches.
	 * Ignored when `before` is set — paginated pages are not global chain head.
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
