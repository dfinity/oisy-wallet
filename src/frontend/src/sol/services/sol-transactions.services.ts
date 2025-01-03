import { i18n } from '$lib/stores/i18n.store';
import type { OptionSolAddress } from '$lib/types/address';
import type { OptionToken } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { solanaHttpRpc } from '$sol/providers/sol-rpc.providers';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolRpcTransaction } from '$sol/types/sol-transaction';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { mapSolTransactionUi } from '$sol/utils/sol-transactions.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { address as solAddress } from '@solana/addresses';
import { get } from 'svelte/store';

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
