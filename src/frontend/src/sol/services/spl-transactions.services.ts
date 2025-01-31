import { parseTokenId } from '$lib/validation/token.validation';
import { getSplTransactions } from '$sol/api/solana.api';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { GetSplTransactionsParams } from '$sol/types/sol-api';
import { mapSplTransactionUi } from '$sol/utils/spl-transactions.utils';

interface LoadNextSolTransactionsParams extends GetSplTransactionsParams {
	signalEnd: () => void;
}

//TODO add unit tests
export const loadNextSplTransactions = async ({
	address,
	network,
	before,
	limit,
	signalEnd,
	tokenAddress
}: LoadNextSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const transactions = await loadSplTransactions({
		address,
		network,
		before,
		limit,
		tokenAddress
	});

	if (transactions.length === 0) {
		signalEnd();
		return [];
	}

	return transactions;
};

const loadSplTransactions = async ({
	address,
	network,
	before,
	limit,
	tokenAddress
}: GetSplTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const tokenId = parseTokenId(tokenAddress);
	try {
		const transactions = await getSplTransactions({
			address,
			network,
			before,
			limit,
			tokenAddress
		});

		const certifiedTransactions = transactions.map((transaction) => ({
			data: mapSplTransactionUi({ transaction, address, tokenAddress }),
			certified: false
		}));

		solTransactionsStore.append({
			tokenId: tokenId,
			transactions: certifiedTransactions
		});

		return certifiedTransactions;
	} catch (error: unknown) {
		solTransactionsStore.reset(tokenId);

		console.error(`Failed to load transactions for ${tokenId.description}:`, error);
		return [];
	}
};
