import type { Network } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
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

/**
 * Records the transactions left out of the history of each token, for the warning that names them.
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
};
