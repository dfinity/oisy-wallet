import type { NullishIdentity } from '$lib/types/identity';
import type { SolAddress } from '$sol/types/address';
import type { SolanaNetworkType } from '$sol/types/network';
import type { SolSignature, SolSignatureWithSources } from '$sol/types/sol-transaction';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';

/**
 * Where the merged signature pager of a wallet resumes. It is owned by the pager: pass back the
 * cursor of a page to get the next one, never one rebuilt from what a store holds.
 */
export interface SolSignaturesCursor {
	// For each source that has not reached its end, the oldest signature it has returned so far. Its
	// next lookup continues after it, so a source only ever pages through its own history and never
	// returns the same signature twice.
	before: Partial<Record<SolAddress, Pick<SolSignature, 'signature' | 'slot'>>>;
	// Sources that returned less than a full page. Their history is complete, so they are not asked
	// again.
	exhausted: SolAddress[];
	// Signatures already fetched but not returned yet, because they are not newer than the cut.
	// Their sources are not asked for them again, so the cursor keeps them until a page reaches them.
	pending: SolSignatureWithSources[];
}

export interface GetSolSignaturesParams {
	address: SolAddress;
	network: SolanaNetworkType;
	tokensList?: Pick<SplToken, 'address' | 'owner'>[];
	limit?: number;
	// The cursor of the previous page. Without it, the pager starts from the newest signatures.
	cursor?: SolSignaturesCursor;
}

export interface SolSignaturesPage {
	signatures: SolSignatureWithSources[];
	// Absent once every source has been paged to its end: there is no next page.
	cursor?: SolSignaturesCursor;
}

export interface GetSolTransactionsParams {
	identity: NullishIdentity;
	address: SolAddress;
	network: SolanaNetworkType;
	tokenAddress?: SplTokenAddress;
	tokenOwnerAddress?: SolAddress;
	before?: string;
	limit?: number;
}
