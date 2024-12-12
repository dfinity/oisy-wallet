import type { OptionSolAddress } from '$lib/types/address';
import type { OptionToken } from '$lib/types/token';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
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
		const signatures = await getSignaturesForAddress(wallet, {
			limit,
			commitment: 'confirmed'
		}).send();

		const rpcTransactions: (SolRpcTransaction | null)[] = await Promise.all(
			signatures.map(async ({ signature }) => await getTransaction(signature).send())
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
								// TODO: map RPC transaction to UI transaction
								data: { ...transaction, id: transaction.blockTime?.toString() ?? '' },
								certified: true
							}
						],
			[]
		);

		solTransactionsStore.append({
			tokenId,
			transactions: transactions.filter(nonNullish)
		});
	} catch (error: unknown) {
		console.error(error);
	}
};
