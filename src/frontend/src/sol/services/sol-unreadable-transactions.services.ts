import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { trackSolUnreadableTransaction } from '$sol/services/sol-transactions-analytics.services';
import { solUnreadableTransactionsStore } from '$sol/stores/sol-unreadable-transactions.store';
import type { SolUnreadableTransaction } from '$sol/types/sol-transaction';

export interface SolUnreadableTransactionReport extends Pick<
	SolUnreadableTransaction,
	'signature' | 'errorCode'
> {
	network: Network;
	// The tokens whose history is missing it.
	tokenIds: TokenId[];
}

// The worker meets a transaction once, but the pagers meet it again on every pass over its page,
// and it can belong to several tokens: it is tracked once per page load all the same.
const trackedSignatures = new Set<SolUnreadableTransaction['signature']>();

/**
 * Records the transactions left out of the history of each token, for the warning that names them,
 * and tracks each of them once.
 */
export const reportUnreadableSolTransactions = ({
	transactions
}: {
	transactions: SolUnreadableTransactionReport[];
}) => {
	const signaturesByToken = transactions.reduce<
		Map<TokenId, SolUnreadableTransaction['signature'][]>
	>((acc, { signature, tokenIds }) => {
		tokenIds.forEach((tokenId) => acc.set(tokenId, [...(acc.get(tokenId) ?? []), signature]));

		return acc;
	}, new Map());

	signaturesByToken.forEach((signatures, tokenId) =>
		solUnreadableTransactionsStore.add({ tokenId, signatures })
	);

	transactions.forEach(({ signature, network, errorCode }) => {
		if (trackedSignatures.has(signature)) {
			return;
		}

		trackedSignatures.add(signature);

		trackSolUnreadableTransaction({ network, errorCode });
	});
};
