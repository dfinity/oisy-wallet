import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import { i18n } from '$lib/stores/i18n.store';
import type { OptionSolAddress } from '$lib/types/address';
import type { OptionToken } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { getSolTransactions } from '$sol/api/solana.api';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import { SolanaNetworks } from '$sol/types/network';
import type { GetSolTransactionsParams } from '$sol/types/sol-api';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';
import { get } from 'svelte/store';

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

export const loadSolTransactionsOld = async ({
	address,
	token,
	limit = 10
}: {
	address: OptionSolAddress;
	token: OptionToken;
	limit?: number;
}): Promise<void> => {
	if (isNullish(address)) {
		return;
	}

	if (isNullish(token)) {
		return;
	}

	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const solNetwork = mapNetworkIdToNetwork(networkId);

	assertNonNullish(
		solNetwork,
		replacePlaceholders(get(i18n).init.error.no_solana_network, {
			$network: networkId.description ?? ''
		})
	);

	const { getSignaturesForAddress, getTransaction } = solanaHttpRpc(solNetwork);

	const wallet = solAddress(address);

	try {
		const signatures = await getSignaturesForAddress(wallet, { limit }).send();

		const rpcTransactions: (SolRpcTransaction | null)[] = await Promise.all(
			signatures.map(async ({ signature, confirmationStatus }) => {
				const rpcTransaction = await getTransaction(signature, {
					maxSupportedTransactionVersion: 0
				}).send();

				if (isNullish(rpcTransaction)) {
					return null;
				}

				return {
					...rpcTransaction,
					version: rpcTransaction.version,
					confirmationStatus,
					id: signature.toString()
				};
			})
		);

		const transactions: SolCertifiedTransaction[] = rpcTransactions.reduce<
			SolCertifiedTransaction[]
		>(
			(acc, transaction) =>
				isNullish(transaction)
					? acc
					: [
							...acc,
							{
								data: mapSolTransactionUi({ transaction, address }),
								certified: true
							}
						],
			[]
		);

		solTransactionsStore.reset(tokenId);

		solTransactionsStore.append({
			tokenId,
			transactions: transactions.filter(nonNullish)
		});
	} catch (error: unknown) {
		solTransactionsStore.reset(tokenId);

		console.error(`Failed to load transactions for ${tokenId.description}:`, error);
	}
};
