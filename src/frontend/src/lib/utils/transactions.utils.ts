import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { Token } from '$lib/types/token';
import type { AllTransactionsUi } from '$lib/types/transaction';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdICP
} from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

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
