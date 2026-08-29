import type { NullishIdentity } from '$lib/types/identity';
import type { Token } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';

export interface LoadOlderTransactionsParams {
	token: Token;
	identity: NullishIdentity;
	/**
	 * Floor to level down to, in seconds. The loader stops once the token's oldest loaded
	 * transaction is at or below it.
	 *
	 * Omit to fetch one page unconditionally, which is how the floor itself gets pushed deeper.
	 */
	minTimestamp?: number;
	/** Called when the chain has no more history to give for this token. */
	signalEnd: () => void;
}

/**
 * Fetches at most one page of history older than what a token already has loaded.
 *
 * `success` reports whether a page was requested, not whether it contained anything: callers loop
 * on it to level a token down to a floor, and `signalEnd` is what marks a token exhausted.
 */
export type LoadOlderTransactions = (params: LoadOlderTransactionsParams) => Promise<ResultSuccess>;
