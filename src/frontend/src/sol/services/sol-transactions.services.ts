import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import { getSolTransactions } from '$sol/api/solana.api';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';

interface LoadNextSolTransactionsParams extends GetSolTransactionsParams {
	signalEnd: () => void;
}

export const loadNextSolTransactions = async ({
	address,
	network,
	before,
	limit,
	signalEnd
}: LoadNextSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const transactions = await loadSolTransactions({
		address,
		network,
		before,
		limit
	});

	if (transactions.length === 0) {
		signalEnd();
		return [];
	}

	return transactions;
};

const networkToSolTokenIdMap = {
	[SolanaNetworks.mainnet]: SOLANA_TOKEN_ID,
	[SolanaNetworks.testnet]: SOLANA_TESTNET_TOKEN_ID,
	[SolanaNetworks.devnet]: SOLANA_DEVNET_TOKEN_ID,
	[SolanaNetworks.local]: SOLANA_LOCAL_TOKEN_ID
};

const loadSolTransactions = async ({
	address,
	network,
	before,
	limit
}: GetSolTransactionsParams): Promise<SolCertifiedTransaction[]> => {
	const solTokenIdForNetwork = networkToSolTokenIdMap[network];

	try {
		const transactions = await getSolTransactions({
			address,
			network,
			before,
			limit
		});

		const certifiedTransactions = transactions.map((transaction) => ({
			data: mapSolTransactionUi({ transaction, address }),
			certified: false
		}));

		solTransactionsStore.append({
			tokenId: solTokenIdForNetwork,
			transactions: certifiedTransactions
		});

		return certifiedTransactions;
	} catch (error: unknown) {
		solTransactionsStore.reset(solTokenIdForNetwork);

		console.error(`Failed to load transactions for ${solTokenIdForNetwork.description}:`, error);
		return [];
	}
};
