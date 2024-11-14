import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { Token } from '$lib/types/token';
import type { AllTransactionsUi, AnyTransactionUi } from '$lib/types/transaction';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdICP
} from '$lib/utils/network.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Maps the transactions stores to a unified list of transactions with their respective components.
 *
 * @param tokens - The tokens to map the transactions for.
 * @param $btcTransactions - The BTC transactions store.
 */
export const mapAllTransactionsUi = ({
	tokens,
	$btcTransactions
}: {
	tokens: Token[];
	$btcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
}): AllTransactionsUi =>
	tokens.reduce<AllTransactionsUi>((acc, { id: tokenId, network: { id: networkId } }) => {
		if (isNetworkIdBTCMainnet(networkId)) {
			if (isNullish($btcTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($btcTransactions[tokenId] ?? []).map(({ data: transaction }) => ({
					...transaction,
					component: BtcTransaction
				}))
			];
		}

		if (isNetworkIdEthereum(networkId)) {
			// TODO: Implement Ethereum transactions
			return acc;
		}

		if (isNetworkIdICP(networkId)) {
			// TODO: Implement ICP transactions
			return acc;
		}

		return acc;
	}, []);

export const sortTransactions = ({
	transactionA: { timestamp: timestampA },
	transactionB: { timestamp: timestampB }
}: {
	transactionA: AnyTransactionUi;
	transactionB: AnyTransactionUi;
}): number => {
	if (nonNullish(timestampA) && nonNullish(timestampB)) {
		return Number(timestampB) - Number(timestampA);
	}

	return nonNullish(timestampA) ? 1 : -1;
};
