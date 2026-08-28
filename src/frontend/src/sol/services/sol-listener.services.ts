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
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

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

	// A record re-derived under its signature id supersedes the per-instruction rows the store may
	// still hold for the same signature: same transaction, older shape, different ids.
	const incomingSignatures = new Set(
		transactions.map(({ data: { signature } }) => String(signature))
	);
	const staleIds = (get(solTransactionsStore)?.[tokenId] ?? [])
		.filter(
			({ data }) =>
				incomingSignatures.has(String(data.signature)) &&
				!transactions.some(({ data: incoming }) => incoming.id === data.id)
		)
		.map(({ data: { id } }) => `${id}`);

	if (staleIds.length > 0) {
		solTransactionsStore.cleanUp({ tokenId, transactionIds: staleIds });
	}

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

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbSolTransactions,
		transactionsStore: solTransactionsStore
	});
