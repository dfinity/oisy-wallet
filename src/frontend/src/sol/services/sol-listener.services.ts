import { getIdbSolTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import {
	solTransactionsStore,
	type SolCertifiedTransaction
} from '$sol/stores/sol-transactions.store';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

/**
 * Removes the rows a token holds for the signatures of `transactions` under another id. A record
 * derived under its signature id supersedes the per-instruction rows of the older shape: same
 * transaction, different ids. Call it before writing `transactions` to the token.
 */
export const cleanUpStaleSolTransactions = ({
	tokenId,
	transactions
}: {
	tokenId: TokenId;
	transactions: SolTransactionUi[];
}) => {
	const incomingSignatures = new Set(transactions.map(({ signature }) => String(signature)));
	const incomingIds = new Set(transactions.map(({ id }) => `${id}`));

	const staleIds = (get(solTransactionsStore)?.[tokenId] ?? [])
		.filter(
			({ data }) => incomingSignatures.has(String(data.signature)) && !incomingIds.has(`${data.id}`)
		)
		.map(({ data: { id } }) => `${id}`);

	if (staleIds.length > 0) {
		solTransactionsStore.cleanUp({ tokenId, transactionIds: staleIds });
	}
};

export const syncWallet = ({
	data,
	tokenId
}: {
	data: SolPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;

	if (nonNullish(balance)) {
		balancesStore.batchSet({
			id: tokenId,
			data: {
				data: balance,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}

	const transactions: SolCertifiedTransaction[] = JSON.parse(newTransactions, jsonReviver);

	cleanUpStaleSolTransactions({ tokenId, transactions: transactions.map(({ data }) => data) });

	solTransactionsStore.prepend({
		tokenId,
		transactions
	});
};

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.sol_wallet_error;

	balancesStore.reset(tokenId);
	solTransactionsStore.reset(tokenId);

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

// A record without a summary was not derived from chain data: earlier versions cached the backend
// copy, which cannot carry what a row is shown from. It is left out, and the next load that reaches
// its signature derives it again.
const getIdbDerivedSolTransactions = async (params: GetIdbTransactionsParams) =>
	(await getIdbSolTransactions(params))?.filter(({ summary }) => nonNullish(summary));

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbDerivedSolTransactions,
		transactionsStore: solTransactionsStore
	});
