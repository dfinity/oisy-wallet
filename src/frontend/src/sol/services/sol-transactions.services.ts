import type { OptionSolAddress } from '$lib/types/address';
import type { OptionToken } from '$lib/types/token';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { isSolNetwork } from '$sol/validation/sol-network.validation';
import { isNullish, nonNullish } from '@dfinity/utils';
import { createSolanaRpc, address as solAddress } from '@solana/web3.js';

export const loadSolTransactions = async ({
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

	const { id: tokenId, network } = token;

	if (!isSolNetwork(network)) {
		return;
	}

	const {
		rpc: { httpUrl }
	} = network;

	const { getSignaturesForAddress, getTransaction } = createSolanaRpc(httpUrl);

	const wallet = solAddress(address);

	try {
		const signatures = await getSignaturesForAddress(wallet, { limit }).send();

		const rpcTransactions: (SolRpcTransaction | null)[] = await Promise.all(
			signatures.map(async ({ signature, confirmationStatus }) => {
				const rpcTransaction = await getTransaction(signature).send();

				if (isNullish(rpcTransaction)) {
					return null;
				}

				return { ...rpcTransaction, confirmationStatus, id: signature.toString() };
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
								data: mapSolTransactionUi(transaction),
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
