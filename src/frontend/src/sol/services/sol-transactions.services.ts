import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import type { SolAddress } from '$lib/types/address';
import { getSolTransactions } from '$sol/api/solana.api';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';

export const loadNextSolTransactions = async ({
	address,
	network,
	before,
	limit,
	signalEnd
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	before?: string;
	limit?: number;
	signalEnd: () => void;
}): Promise<SolCertifiedTransaction[]> => {
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
}: {
	address: SolAddress;
	network: SolanaNetworkType;
	before?: string;
	limit?: number;
}): Promise<SolCertifiedTransaction[]> => {
	const solTokenIdForNetwork = networkToSolTokenIdMap[network];

	try {
		const transactions = await getSolTransactions({
			address,
			network,
			before,
			limit
		});

		solTransactionsStore.append({
			tokenId: solTokenIdForNetwork,
			transactions: transactions
		});

		return transactions;
	} catch (error: unknown) {
		solTransactionsStore.reset(solTokenIdForNetwork);

		console.error(`Failed to load transactions for ${solTokenIdForNetwork.description}:`, error);
		return [];
	}
};
